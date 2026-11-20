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
| Next month's file with its sheet renamed, read the way this one was | **X3 — next** (today a renamed sheet is asked about again) |
| A newer version of a SharePoint file noticed and read again | **X2** (the version is kept on the record; the check and its button are next) |
| Every source Luna can read, in one place | **X2** |
| Proved with the real model | **X4** (the workbook exam; needs the check key — `docs/LUNA-EVAL.md`) |

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

**X2 — What Luna can read, and a newer version.** One panel beside Luna listing every workbook, connection and document she can read —
where each came from (uploaded, SharePoint with its path), when it was read, and for a SharePoint file **Check for a newer version**
(`graph newerThan` — its `eTag` against the one kept; a newer one downloaded and read, the first look saying what changed since).

**X3 — Next month's file.** A report whose sheet is renamed each month ("March", "April") carries the customer's reading by its headings
when the sheet's name differs; several months' files chosen together read in order and compared like with like.

**X4 — Proved with the real model.** A workbook exam beside the bagger exam (`docs/LUNA-EVAL.md`): a site's workbook attached, ten questions
a manager asks, marked by code against the generator's own figures. Run when the check key is to hand.

**X5 — A folder kept up to date (server, scheduled).** `docs/DATA-CONNECTIONS.md` §2.4: `Sites.Selected` for one site, the folder listed
on a schedule, each new workbook or CSV taken through the ingest core.

**The steps, as the app says them (Connect to Microsoft).**
1. *Register Faultline with Microsoft — whoever runs Faultline, once, about ten minutes.* Sign in to the Microsoft Entra admin center
   (entra.microsoft.com) with an account allowed to register applications · App registrations › New registration · name it *Faultline*,
   Supported account types *Accounts in any organizational directory (multitenant)* · Redirect URI *Single-page application (SPA)*,
   `https://faultline.opexelevate.co.uk/ms-auth.html` · Register, and copy the *Application (client) ID* · API permissions › Add a permission ›
   Microsoft Graph › Delegated: `User.Read`, `Files.Read.All`, `Sites.Read.All` (read-only); Grant admin consent where you administer the
   tenant · no client secret (the browser signs in with PKCE).
2. *Send the Application (client) ID* (not a secret) — it is set in Faultline's build (an environment variable on Vercel) and the
   sign-in is built against it.
3. *At a client's business — their IT administrator, once:* admin consent at
   `https://login.microsoftonline.com/<their domain>/adminconsent?client_id=<Application ID>`; taken back from their own Entra admin
   center (Enterprise applications › Faultline).

## What waits

Writing back to a business's files; e-mail and calendars; any machine or sensor (CLAUDE.md, *measured by people, not by sensors* — a
connection reads what the business's own systems already record). Each would be its own decision of Rowland's.
