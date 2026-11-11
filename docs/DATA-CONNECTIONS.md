# Production data connections — a core platform capability (11 November)

Rowland, 11 November: *"Production data connectivity is a core platform capability, not an optional reporting feature … not limited to
businesses sending daily Excel exports. Luna should connect directly to the customer's production systems wherever possible, through
APIs or other appropriate authorised access methods: MES, ERP, production monitoring systems, databases, automated file transfers and
other integration methods. The architecture must support different connection methods because every manufacturer has different systems
… so she can answer why we missed target yesterday, where production losses occurred, which lines are underperforming and what is
affecting capacity. Retain data provenance, apply calculations through the app's own deterministic logic and distinguish actual system
data from reported or estimated information."*

This page is the design (§1–§6), what is built (§7), and what waits (§8). It sits in the DATA layer of `docs/LUNA-PLATFORM.md` and closes
its point 4 ("Outside systems") for production figures. It does not change the rule that nothing reads a machine (*measured by people,
not by sensors*, CLAUDE.md): a connection reads what the business's **own systems already record** — an MES's shift totals, an ERP's
production orders — never a PLC, and Luna never claims a figure the system did not send.

## 1. One contract, many kinds

Every connection, whatever its kind, is one record and one path:

```
the business's system ──(kind: how the rows arrive)──▶ the INGEST CORE ──▶ production records ──▶ the app, Luna, the papers
                                                         map · check · refuse · id
```

| Part of the contract | What it is | Where |
|---|---|---|
| **kind** | how the rows arrive: `push` · `pull` · `database` · `files` · `historian` | `data_connections.kind` (a word, never checked against a list in the cloud — a new kind needs no migration, the lesson of `studies_tool_check`) |
| **authentication** | push: a token the system presents, **stored only as its SHA-256**; pull/database/files: the credential the business gives, **held in Supabase Vault**, readable by the service role only | `data_connection_secrets` (no API role can read it), `vault.secrets` |
| **receive or fetch** | push: the system posts to Luna; pull/database/files/historian: Luna fetches on a schedule | the `ingest` edge function; pg_cron for the schedule |
| **mapping** | which field of the system's row is which field of a production record — a JSON path for JSON, a column header for CSV; the system's line names to Luna's lines | `data_connections.mapping`, `line_map` |
| **schedule** | how often a fetching kind runs (minutes, at least 15) | `data_connections.schedule_minutes`; one pg_cron job every 15 minutes asks the function which are due |
| **health** | when it last ran, last succeeded, how many rows came and were refused, the last error **in words** | `data_connections.last_*`, written by the function, said on the page and to Luna |
| **provenance** | every row arrives as **`system`** — read from the business's own system, with the system's id, the connection and when it came | `production_records.how_known`, `source_id`, `connection_id`, `imported_at`; `system` in the one vocabulary (`src/capabilities/types.ts` HowKnown) |

The **ingest core** (`src/lib/production/ingestCore.ts`) is the one place a system's rows become records. It is pure and has no imports,
so the edge function runs the same file (copied by `scripts/sync-assist.mjs`, held equal by a test) and the app runs it for its own
import path (a file or a pasted sample on the connection's page). Whatever the kind, rows pass through it: same mapping, same checks,
same refusals, same id — so two kinds can never disagree about what a row means.

### The rules every row passes (the core)

- **An id from the system.** Each row must carry the system's own id for it (an order number, a shift-report id). The record's id is
  `connection id : system id`, so the same row sent twice — or fetched again on the next schedule — **replaces itself** (idempotent upsert
  on `(connection_id, source_id)`); nothing is ever counted twice.
- **A line.** The row's line, by the system's name for it through `line_map`, else the connection's own line. A line it cannot place is
  **refused, with why** ("line 'PK-9' is not mapped to a line").
- **A day.** ISO date, or a date-time (its day), or dd/mm/yyyy. No day — refused.
- **Numbers that are numbers.** Planned and run minutes, output, target, good, rejects, downtime minutes: a blank is **not recorded**
  (null), never zero; text where a number should be is refused with the field named; a negative is refused; rejects above output refused.
- **Nothing worked out is stored.** Gap to target, net rate, the money — all worked out when asked, by the app's code (§4).
- **Limits.** 5,000 rows and 5 MB a call; more is refused whole with the limit said. A push is limited to one call every 10 seconds a
  connection (said, `retry-after`).
- **The answer.** `{ received, stored, refused: [{ row, why }] }` — the system knows exactly what was kept.

## 2. The kinds

### 2.1 PUSH API — built

The business's system (an MES's end-of-shift job, an ERP's integration hub, Power Automate, a small script) posts to
`https://<project>.supabase.co/functions/v1/ingest` with `Authorization: Bearer luna_…` and a body of JSON
(`{ "rows": [ … ] }` or a bare array) or CSV (`Content-Type: text/csv`, a header row).

- **The token** is made on the device when the connection is made (32 random bytes, `luna_` + base64url), **shown once**, and only its
  SHA-256 leaves the device — by a function (`set_data_connection_token`) that checks the person may change the connection and writes the
  hash where no API role can read it. Make a new token and the old stops working. The page keeps only the last four characters to
  recognise it by.
- The function hashes what is presented, finds the connection by the hash, refuses a paused or deleted one, maps, upserts with the
  service role (owner = the connection's owner, so the line's members see it through the existing policies), and writes the health.
- `verify_jwt` is **off** for this function: the token is the authentication (as the share link's token is the share's).

### 2.2 PULL from the business's REST/JSON API — built

Luna fetches `pull_url` (GET) on the schedule with the credential put in the header the API asks for (`pull_auth_header`, e.g.
`Authorization` with prefix `Bearer`, or `X-Api-Key`). The rows are found at `mapping.rows` (a JSON path such as `data.items`) and
mapped field by field by path (`qty`, `result.good`, `lines[0].name`). A `{since}` in the address is replaced by the day of the last
success, so a well-behaved API sends only what is new; the upsert makes a full resend harmless.

- **The credential** is typed once on the connection's page and sent straight to `set_data_connection_secret`, which stores it in
  **Supabase Vault** (`vault.create_secret` / `vault.update_secret`); the private table keeps only the Vault id. It is never kept on the
  device, never synced, never logged, never in a health message (a failure is said by status code and words, never with the request),
  and never sent to Luna — the AI service's prompt is built from records, and no record holds it.
- **Scheduled** by one pg_cron job every 15 minutes calling the function with a key only the database holds (`ingest_keys.cron_key`,
  made by the function on its first call — the pattern of `PUSH_REMINDERS.sql` and `remind`). The function runs each active pull
  connection whose `last_run_at + schedule_minutes` has passed.
- Only `https` addresses are fetched; private and loopback addresses are refused; a response over 5 MB is refused; 20 s timeout.

### 2.3 A direct read-only database connection (SQL Server, Postgres views) — designed

- **What it needs:** the host, database, a **read-only login** the business makes for Luna, and a **view** they own that shapes their
  tables into the production record's fields (`line, day, shift, product, planned_minutes, …, source_id`). Luna reads the view, nothing
  else; the business decides what is in it.
- **Where it runs:** most production databases are not on the internet. So it runs either (a) from the edge function over TLS to a
  database the business has exposed to Supabase's egress addresses (Postgres: `npm:postgres`; SQL Server: `npm:mssql` over TDS with
  encryption on), or (b) — the usual case — from a **small relay inside the business's network** (a container or Windows service the
  business runs) that reads the view and **pushes** to 2.1 with its token. (b) needs no inbound firewall rule and no credential leaves the
  site; it is the recommended route, and is the push contract unchanged.
- **Security:** the login is read-only and limited to the view; the credential in Vault (as 2.2); TLS required; the query is fixed
  (`select … from <view> where day >= $since`), never built from words.
- **Not built:** (a) needs a driver in the edge runtime proved against SQL Server, and a business that wants it; (b) is buildable today
  by the business against the push contract.

### 2.4 Automated file transfer (SFTP; a SharePoint or OneDrive folder of CSVs) — designed

- **SharePoint / OneDrive:** an app registration in the business's Microsoft Entra tenant with `Sites.Selected` (one site, granted by
  their admin) or `Files.Read.All`; client credentials (tenant, client id, secret) in Vault. On the schedule the function lists the
  folder through Microsoft Graph (`/drives/{drive}/root:/{path}:/children`), reads each CSV newer than the last success, runs it through
  the core as CSV, and remembers each file's `eTag` so a file is read once (and re-read only when it changes — the upsert keeps it right).
- **SFTP:** host, user and key in Vault; listed and read the same way. Deno has no SFTP client in the standard library, so SFTP runs in
  the relay of 2.3(b) rather than in the edge function.
- **Security:** least privilege (one site, one folder); nothing written back; the file's name and eTag kept as provenance on each row.
- **Not built:** the Graph route is clean within the contract and is the next to build when a business asks; it needs their admin's
  consent, which cannot be tested here.

### 2.5 Historians and OPC UA — designed, deliberately not built

- A historian (PI, Ignition, Wonderware) or an OPC UA server holds machine signals. Luna does **not** read machine signals
  (*measured by people, not by sensors*); what she can take is what the historian has **already rolled up** — shift output, downtime
  events with their reasons — exposed by the historian's own REST API (2.2) or by its SQL views (2.3), or pushed by the relay.
- OPC UA's binary protocol cannot run in the edge function and would make Luna a machine reader. If Rowland decides otherwise, it is a
  relay on site pushing to 2.1 — the contract does not change.

## 3. The records

`production_records` — one row a line × day × shift × product (and a downtime reason, when the system reports downtime on the row):

| Field | Meaning |
|---|---|
| `workspace_id` | the line |
| `day`, `shift`, `product` | when and what |
| `planned_minutes`, `run_minutes` | the time planned to run, the time it ran |
| `output`, `good`, `rejects` | made, good, rejected (units — packs) |
| `target` | the units it should have made, **as the system says** |
| `downtime_minutes`, `downtime_reason` | the stop time on the row and the system's reason for it |
| `source_id` | the system's own id for the row |
| `connection_id`, `imported_at` | which connection brought it, and when |
| `how_known` | `system` |

`data_connections` — the connection (§1). `data_connection_secrets` — the token's hash and the Vault id, readable by no API role.

Both synced tables are **line-attached**: read and written by the owner or `is_ws_member(workspace_id)`, exactly as a line study — so when
`docs/ORGANISATION.md` O3 widens `is_ws_member` to the business, these follow with no policy edited. A connection's secret is never in a
row any role but the service can read.

## 4. What Luna does with it — the app's code works every figure

- **A dataset** (`src/lib/data/datasets.ts` productionDataset, `production:<line>` and `production:all`) so `list_sources`,
  `source_fields` and `query_data` answer from it as from any source: every field, how many rows record it, what is worked out (good =
  output − rejects only when good was not sent; gap to target only where a target was sent) and what it cannot hold.
- **One capability, `production_gap`** — *why did we miss target yesterday*: made against target by line, day and shift; the days and
  shifts short; downtime by the system's reasons; the gap in units and in **money through the one cost model** (`contributionOf` for the
  units not made — the line's margin a pack, or price less materials; the line's crew × wage × on-costs for the downtime's idle labour).
  A missing input is named with where to give it, never estimated. It says the figures are `system` data from the named connection and
  its last import, and keeps them apart from anything reported or estimated in the conversation.
- Luna's instructions: `system` is its own kind of evidence — what the business's system recorded — never "measured" by the app, never
  added into reported or estimated figures.

## 5. Security, in one place

- A token exists in full only once, on the screen of the person who made it. The cloud holds its hash, in a table with RLS on and no policy.
- A pull credential exists only in Vault. The functions that write either check the person may change that connection; the function that
  reads a credential is executable by the service role only.
- Nothing is sent to the AI but records and words; the gateway's prompt has no path to Vault.
- Every imported row carries its connection and the system's id: it can be traced, replaced, or removed by connection.
- RLS is never weakened: the new tables carry the house policies (owner, line members; no `true`).

## 6. Health in words

`Healthy — 412 rows on 11 Nov 06:15, none refused` · `Waiting — no rows have arrived yet` · `Failing since 10 Nov 06:15 — the API
answered 401: the key was refused` · `Paused`. Said on the page and handed to Luna.

## 7. What is built (11 November)

| Piece | Where |
|---|---|
| The tables, the private secrets, the token and secret functions, Vault, pg_cron | `supabase/PRODUCTION_DATA.sql` (written; **not applied** — applied by the session owner with `apply_migration`, read back) |
| The ingest function (push and pull) | `supabase/functions/ingest/index.ts` + `core.ts` (copied from the app; **not deployed** — `verify_jwt` off) |
| The core | `src/lib/production/ingestCore.ts` — mapping by JSON path or CSV header, the checks, the refusals, the id |
| Sync | `data_connections`, `production_records` in `SYNC_KINDS` (IndexedDB v23), `src/cloud/mappers.ts` |
| Set up › Data connections | `#/factory/data` (`src/screens/DataConnectionsScreen.tsx`) — add a push or a pull connection, the token once, the mapping, the schedule, the key to Vault, health in words, the latest rows, Bring in a file or sample (the app's own import path) |
| Luna | `production:` datasets; `production_gap`; `system` in HowKnown |
| Proof | `src/lib/production/__tests__/`, `scripts/acceptance/production-data.mjs` |

## 8. What waits

- Database (2.3a) and Graph (2.4) inside the function; the on-site relay (2.3b) as a packaged service.
- Server-side summaries across a business of thirty lines (`docs/LUNA-PLATFORM.md` point 2): today Luna reads the records the device has
  synced, which for a year of four shifts on thirty lines is about 40,000 rows — fine on a laptop, to be moved into a database function
  with the organisation (O4).
- Products and targets as their own records (a target today is what the system sends on the row).
