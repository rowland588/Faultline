# Luna, a connected system — the direction and the plan (20 November)

Rowland, 20 November: *"you need to know that the future of the App is not to use tools but for Luna to be a connected AI system — our
first step is Excel … uploads and connected to SharePoints and files in businesses."*

So the front of Faultline is Luna reading the business's own information where it already lives — the workbooks people keep, the files on
their SharePoint and OneDrive, and the figures their production systems record — and answering from it. The tools stay: they are what
Luna works with and what a person opens to see the working (`docs/AI-MODE.md`, `docs/AI-OPERATING.md`). What changes is the order of
the work: connecting Luna to the business's information comes before adding tools.

The rules that do not change: every figure is worked out by the app's code, never by the model; a file's cells are never sent to the
AI service, only the answers the code works out (`docs/WORKBOOKS.md`); every figure says where it came from (the file, the sheet, the
version, the day it was read); nothing is written back to a business's system; one client's information is never visible to another
(`docs/CONSULTANT-WORKSPACE.md`); a person confirms anything Luna would change.

## What is built today

| Part | Where | Since |
|---|---|---|
| A workbook attached to Luna, read on the device — any size, its headings, totals, months, weeks and the business's own checks read in code, the first look and the pack made with no AI request | `src/lib/workbook/`, `docs/WORKBOOKS.md`, `ai-first-look.mjs`, `workbook-*.mjs` | 10–16 November |
| The workbook kept for the person's other devices (the very bytes, carried by the sync) | `src/lib/workbook/carry`, `workbook-devices.mjs` | 16 November |
| Files registered as Luna's sources, by name, never guessed between | `list_sources`, `resolve_source`, `docs/CONVERSATIONAL-DATA.md` | 10 November |
| The business's production systems — push by token, pull on a schedule, a CSV through the same core; Luna's *why did we miss target* worked out in code | `docs/DATA-CONNECTIONS.md`, Set up › Data connections (`#/factory/data`), `production-data.mjs` | 11 November |
| A factory's documents (PDF, Word) read in code — a machine's manual, the PM list from it | `docs/ASSET-DOCUMENTS.md`, `machine-manual.mjs` | 13 November |

**Where to find it (20 November).** Data connections had become a shut fold at the foot of Factory › Set up. It is now: Luna's ＋ ›
**Connect to Microsoft** (which opens Data connections with the steps below); a place of its own in Everything; and Set up's *Data
connections* section, open on arrival at a desk. On the page, the **Microsoft 365 — SharePoint and OneDrive** card says *Not connected
yet* and its **Connect to Microsoft** opens the same steps (`src/screens/MicrosoftConnect.tsx`, proved by `production-data.mjs` 0b).

## The Excel system — what Luna can do with a business's spreadsheets (20 November)

Rowland, 20 November: *"The most important aspect for Luna right now is upload Excel and that entire system and connect to pull Excel
files … connection and upload is just a small part — it's what Luna's abilities are."* So the work is judged by what she can do with a
business's spreadsheets, end to end: **get them** (upload; SharePoint and OneDrive), **understand them** (any shape, the business's own
words, weeks, checks — `docs/WORKBOOKS.md`), **answer from them** (any question by any column, month or week, in code), **explain** (what
changed, against what, why — month on month), **show** (charts, a pack, slides), **act** (a problem raised, an action owed, from a
finding), **keep up to date** (next month's file read the way this one was; a newer version noticed), and **be proved** with the real
model, not only scripts.

| Ability | Today |
|---|---|
| Get a workbook — upload, any size, read on the device | built (10–16 November) |
| Get a workbook — from SharePoint or OneDrive | **built 20 November (X1)**, switched on once the Application ID is set |
| Understand any shape; the business's words kept per customer | built (12–15 November) |
| Answer, compare months, explain a change, join results | built (`query_workbook`, `explain_change`, `explain_variance`, `join_results`) |
| Charts, the pack and slides | built (`make_chart`, `workbook_pack`, `build_report`) |
| A finding raised as a problem or an action | built (`raise_problem`, the action flow) |
| Next month's file with its sheet renamed, read the way this one was | **built 20 November (X3)** |
| A newer version of a SharePoint file noticed and read again | **built 20 November (X2)** |
| Every file Luna can read, in one place | **built 20 November (X2)** |
| Proved with the real model | **X4 built 20 November** — the workbook exam: 9 of 10 turns, 33 of 34 marks on its third real run (`docs/LUNA-EVAL.md` §4) |

## The slices — each live on its own

**X1 — A file from SharePoint or OneDrive (built 20 November).** Luna's ＋ › **Connect to Microsoft**: not registered — said, with
the way to the steps; registered — **Sign in with Microsoft** in Microsoft's own window (OAuth 2.0 with PKCE, `src/lib/microsoft/auth`;
the token kept on this device only, renewed by its refresh token, forgotten on Sign out); then **Recent · My files · SharePoint** (a site
found by name, its library, folders opened in place), only the files Faultline can read offered (`src/lib/microsoft/graph`,
`src/colleague/MicrosoftPicker`). A file chosen is **downloaded to the device and read by the same reader as an upload** — the first look,
the customer's reading, the comparison with last month, the pack — and kept in the register with **where it came from** (the drive, the
item, its version `eTag`, its address and path). Read-only scopes (`User.Read`, `Files.Read.All`, `Sites.Read.All`); nothing written to
Microsoft 365. Proved by `src/lib/microsoft/__tests__/microsoft.test.ts` (10, the PKCE challenge against RFC 7636's own example) and
`scripts/acceptance/microsoft-files.mjs` (20 checks, Microsoft played: registered, signed in, a real workbook from OneDrive read with no
request to the gateway, its origin kept, SharePoint found, a 403 said, signed out, the phone). **Not provable here:** a real tenant's
sign-in and admin consent.

**X2 — What Luna can read, and a newer version (built 20 November).** *Files Luna can read*, a fold beside her
(`colleague/LunaFiles`): every workbook, table and document in the register for the customer in hand (and those said to be no one's),
newest first — where each came from (*Uploaded*, or *SharePoint or OneDrive · its path*), when it was read, how the read went; a
SharePoint or OneDrive file offers **Check for a newer version** (its `eTag` against the one kept — *the same version* said, or *a newer
version — changed …* with **Read it**, which downloads it and reads it as an upload, the first look comparing it with the last).
Proved by `microsoft-files.mjs` step 9. Next: production connections listed here too.

**X3 — Next month's file (built 20 November).** A report whose sheet is renamed each month ("Shift log", then "April shifts") carries
the customer's reading to the ONE sheet whose headings are four in five the same both ways — the heading row it was told taken on it — and
says so (*its sheet “Shift log” is “April shifts” in this file*); two sheets that would fit are never guessed between, and a sheet holding
only some of the headings is not the report (`lib/workbook/reading` sheetFor, `capabilities/look` carriedReading; proved in
`capabilities/__tests__/reading.test.ts` on `make-reading-workbooks.mjs`'s renamed, renamed-with-a-strip and twin months). **Several months at once (built 20 November):** Luna's ＋ takes several files in one go; the workbooks are each read on the device, then
their first looks are said in the order of their OWN dates (the earliest date on each one's largest sheet; by name when undated), so each
says what changed since the one before, like with like, and a closing line says the order; a file that cannot be read is said and the
rest go on (`colleague/attachWorkbook` attachWorkbooks; `scripts/acceptance/workbook-months.mjs`). In Connect to Microsoft each
workbook has a tick, kept while folders are opened, and *Read n workbooks* downloads them and reads them together the same way, each
with its own origin (`colleague/MicrosoftPicker`; `microsoft-files.mjs` step 10).

**X4 — Proved with the real model (built 20 November).** The workbook exam beside the bagger exam (`src/colleague/exam/workbook.ts`, on
Luna's exam page and `scripts/eval/luna-real.mjs --suite workbook`): a made-up production log (`workbookBook.ts`, its truth worked row by
row and proved equal to the app's reader) attached through `colleague/attachWorkbook` — the one function AI Mode's ＋, Connect to
Microsoft and the exam read a workbook by — then ten questions a manager asks, each figure marked against the file's own. Its dry run
found the reader wrong on the file's Product, Downtime (min) and Packs columns before any AI was asked (fixed); its real runs found five
places the app's own figure check and runner were unfair to her (fixed) and one slip of hers (arithmetic done in her head). Run 3: 9 of 10
turns, 33 of 34 marks (`docs/LUNA-EVAL.md` §4). Run it again after any change to Luna's words, schemas or the workbook reader.

**X5 — A folder kept up to date (server, scheduled).** `docs/DATA-CONNECTIONS.md` §2.4: `Sites.Selected` for one site, the folder listed
on a schedule, each new workbook or CSV taken through the ingest core.

**The steps, as the app says them (Connect to Microsoft — redesigned 20 November: "is the connections UI slick, professional … it needs
to be ready to connect").** The card on Data connections says its stage in a word — *Not set up* · *Ready* · *Connected* — and the sheet
says the same at the top with the one thing to do next, then four numbered steps that tick themselves off:
1. *Register Faultline with Microsoft — AUTOMATICALLY (21 November — Rowland: "what I need is an automated system ready to go").*
   **Open Azure Cloud Shell ↗** (already signed in as the person) and paste the one line the sheet gives, with Copy:
   `curl -fsSL https://faultline.opexelevate.co.uk/microsoft-setup.sh | bash`. The script (`public/microsoft-setup.sh`) finds or
   makes the registration *Faultline* — multitenant, no secret, the SPA sign-in address, the read-only permissions by the ids
   Microsoft Graph's own entry in that directory gives (never typed in the script) — makes its directory entry, approves the
   permissions for the organisation when the account may (an `AllPrincipals` grant through Graph), and prints ONE link,
   `…/#/factory/data?ms=1&id=<Application ID>`, which opens this sheet with step 1 ticked and the ID in the box: **one press**
   (*Save for everyone*) finishes it. Safe to run again: it finds what it made and brings it up to date (another address kept beside
   the first). Proved in `src/lib/microsoft/__tests__/setupScript.test.ts` — the script run by bash against a stand-in `az` that
   keeps every call — and its commands checked against the Azure CLI's own source (2.93.0). Needs an Azure subscription for Cloud
   Shell; without one, *Or register by hand* (a fold) holds the same settings. By hand: *Open Microsoft Entra ↗*; App registrations ›
   New registration · name *Faultline* · *Accounts in any organizational directory (multitenant)* · Redirect URI, platform *Single-page
   application (SPA)*: `https://faultline.opexelevate.co.uk/ms-auth.html` (and the address Faultline is open at, when that is another
   https address) · Register, copy the *Application (client) ID* · API permissions › Microsoft Graph › Delegated: `User.Read`,
   `Files.Read.All`, `Sites.Read.All` (read-only); Grant admin consent where you administer the tenant · no client secret (PKCE). Every
   value has its **Copy**.
2. *Give Faultline its Application ID* (not a secret). The administrator presses **Save for everyone**: it is kept in Faultline's own
   settings (`app_settings`, `supabase/APP_SETTINGS.sql` — anyone may read it, only the administrator writes it, only a GUID is taken),
   every device reads it on start (`cloud/appSettings`) and keeps it, so **every device of every person is ready at once — no rebuild,
   nothing typed on each device**. The build's `VITE_MS_CLIENT_ID` still wins when set; *Use it on this device* stays for trying it out.
3. *Test the connection.* Signs in, in Microsoft's own window, and asks what can be read: *Connection tested … — signed in as …;
   Microsoft listed n recent files Faultline can read.* Microsoft's setting-up mistakes come back as the step that puts them right —
   a redirect not registered (AADSTS50011, the address to add), registered as Web not SPA (9002326), an ID Microsoft does not know
   (700016), an organisation needing its administrator's approval (65001, 90094, 90008), an account not assigned (50105), permissions
   not accepted (65004) (`lib/microsoft/auth explain`).
4. *At a client's business — their IT administrator, once:* their domain typed, the approval link made with it and the ID, with Copy:
   `https://login.microsoftonline.com/<their domain>/adminconsent?client_id=<Application ID>`; taken back from their own Entra admin
   center (Enterprise applications › Faultline).

After that, a person presses *Connect* (or Luna's ＋ › Connect to Microsoft) and signs in once on each device; signing in again names the
account last used there, so Microsoft can skip its account picker (*Continue as …*, with *Use another account*). Microsoft keeps a
browser's sign-in for about a day; after that it is one press, usually with nothing to type.

## What waits

Writing back to a business's files; e-mail and calendars; any machine or sensor (CLAUDE.md, *measured by people, not by sensors* — a
connection reads what the business's own systems already record). Each would be its own decision of Rowland's.
