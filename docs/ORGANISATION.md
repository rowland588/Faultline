# The organisation — a manufacturing business subscribing to Luna (11 November; design, built in slices)

Rowland, 11 November: *"Manufacturing businesses themselves will subscribe to Luna and use it throughout their organisation … Each should
be able to interact with Luna according to their role, responsibilities and permissions … A team leader must not automatically have access
to everything a managing director can see … Do not build an elaborate commercial billing system … not unnecessary enterprise complexity."*

## 1. What is there (read from the live database and the code, 11 November)

- **Who may sign in:** `allowed_emails` (scope `app` — may start their own work; scope `project` — only what they were invited to);
  `profiles` (one per person: `is_super`, their brand, their preferences). One live user today.
- **Whose a record is:** every row has `owner_id`. Shared **by line** — `workspace_members (workspace_id, email)`, read by
  `is_ws_member()` in every line-attached table's policies — and **by project** — `project_members (project_id, email, access: owner ·
  team · client)`, read by `is_project_member()` / `is_project_editor()`, with restrictive policies and a trigger keeping what was agreed
  and every delete to the owner (`ACCESS_LEVELS.sql`). The screens follow through `useAccess` (`src/lib/access.ts`).
- **The business's shape:** words on each line — `workspaces.client_name · site_name · area_name` (K1, 8 November); departments are records
  (`add_department`); a customer is anchored on its Story (C2a). **There is no organisation record, no business role, no site or
  department visibility, no entitlement.**
- **AI cost:** `assist_usage` per person per task, an allowance a person a day by calls and dollars (`gatewayUsage allowance`).

What is right and stays: the data is shared by the database (RLS), never by the screens; a device only ever holds what it may read, so
Luna — who reads through the device's records and runs through the person's own access — can never see more than the person.

## 2. The design — one layer above the line, through the functions that already guard every table

**Records.**
- `organisations (id, name, created_by, created_at, entitlement jsonb)` — the business that subscribes. `entitlement`: `{ plan, seats,
  aiDailyUsd, until }`, read by the app and the gateway, set by the administrator; no billing system (§4).
- `organisation_members (org_id, email, role, sites text[], areas text[], invited_by, created_at)` — one row a person a business; `sites`
  and `areas` empty = the whole business.
- `workspaces.org_id` — a line belongs to one business. Its `client_name` is that business's name (kept as words for the consultant's
  case: a consultant's own lines at a business not on Luna carry no `org_id`).

**Roles — five, each mapped onto the access ladder that exists** (not a second permission system):

| Role | Who | On the lines in their scope | Projects | Luna |
|---|---|---|---|---|
| `admin` | the business's owner, IT | everything, people and entitlement | owner | everything they may read |
| `leader` | MD, operations director, site manager | read everything; change what was agreed | owner on their own | business-wide questions |
| `manager` | production, engineering, maintenance, quality, technical, CI | do the work, start projects, agree | owner on their own, team on others' | their scope |
| `team` | team leaders, supervisors, technicians | capture, raise and work problems, run tools | team | their scope |
| `viewer` | an auditor, a board member who only reads, a client | read, take the papers | client | reads only |

**How visibility works:** `is_ws_member(ws)` — already called by every line-attached table's policies — is widened once: it is also
true when the person is a member of the line's organisation and the line's site and area are within their `sites`/`areas`. Every table
that follows a line follows the business with no policy edited table by table. Writing follows the role (`team` and up), refused for
`viewer` by the same restrictive pattern as a project's client. A project's own `project_members` stays as it is.

**The consultant:** a member of each business that invites them (usually `manager`), plus their own lines with no `org_id` for a business
not on Luna. *Customers* in the top bar (C1–C2a) are then the businesses they belong to and the client names on their own lines — the
same switcher.

**Luna:** nothing new. She reads what the device holds and runs as the person; the role decides what the device holds. Her context names
the business, the person's role and scope, so a leader's "which lines lost most this month" spans the business and a team leader's
spans their area.

**AI cost:** the gateway's allowance gains a business cap (`entitlement.aiDailyUsd` across its members), checked beside the person's.

## 3. Slices — each live on its own, each a reviewed, additive migration with its read-back

| Slice | What | Database |
|---|---|---|
| **O1** | the business made on first sign-in for an `app` invite with no business; its lines given `org_id`; the business named on Set up; nothing a person sees changes otherwise | `ORGANISATIONS.sql`: two tables, `workspaces.org_id`, policies (a member reads their business; an admin writes it), backfill of the existing lines to their owner's business |
| **O2** | People: invite by email with a role and an optional scope (sites, areas); the list, change a role, remove | `organisation_members` policies; `allowed_emails` row made with the invite (scope `org`) |
| **O3** | visibility: `is_ws_member` widened to the business and its scope; writing refused for `viewer`; the two-device sync and a multi-user RLS test proving a team leader in Packing cannot read Dispatch's lines | `ORG_VISIBILITY.sql`, read back with `pg_get_functiondef` and a test per role |
| **O4** | what each role sees first: Today by role (a team leader's area, a manager's lines, a leader's business), the management papers across lines | none |
| **O5** | entitlement: seats counted, the AI cap per business at the gateway, the administrator's page | `entitlement` used |

## 4. What waits

Payments and invoices (a business is set up by hand until there are enough to need it); single sign-on; per-department custom roles;
a separate *site* record (sites stay words until a business needs a site's own settings); data residency choices.
