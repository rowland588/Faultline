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

## The plan, in slices — each live on its own

**C1 — Excel first: Luna's sources in one place (next).** One panel beside Luna — *What Luna can read* — listing every workbook
attached, every connection and every document, each with when it was last read, whether a newer copy is known, and Forget. Built on the
sources register that exists; no new record. Proved by an acceptance script that attaches two workbooks and a connection and reads the
panel against the register.

**C2 — A file from the person's own SharePoint or OneDrive (needs go and an app registration).** *Choose from SharePoint* beside
*A file or spreadsheet* in Luna's ＋: the person signs in with their own Microsoft account (delegated permission, Microsoft Graph,
`Files.Read` / `Sites.Read.All` as their tenant allows), picks a workbook or a document in Microsoft's own file picker, and the file is
downloaded **to the device** and read by the same reader as an upload — so every rule above holds unchanged. The source keeps where it
came from (the site, the path, the drive item's id and `eTag`); *Check for a newer version* re-reads it only when the `eTag` has changed,
and the first look says what changed since the last read (`docs/WORKBOOKS.md`, the month-on-month comparison). Nothing is written back.
- **What it needs from Rowland:** go; and an app registered in Microsoft Entra (a multi-tenant *single-page application*, its redirect
  the live domain, no client secret — the browser signs in with PKCE). A client's tenant may require its administrator to consent to the
  permissions before their people can use it: that is the first conversation with a client, and the page says so in words when consent is
  missing.
- **What cannot be proved here:** a real tenant's sign-in and consent (the acceptance script plays Graph's responses, as the other
  connector scripts play the gateway).

**The steps, as the app says them (Connect to Microsoft).**
1. *Register Faultline with Microsoft — whoever runs Faultline, once, about ten minutes.* Sign in to the Microsoft Entra admin center
   (entra.microsoft.com) with an account allowed to register applications · App registrations › New registration · name it *Faultline*,
   Supported account types *Accounts in any organizational directory (multitenant)* · Redirect URI *Single-page application (SPA)*,
   `https://faultline.opexelevate.co.uk/` · Register, and copy the *Application (client) ID* · API permissions › Add a permission ›
   Microsoft Graph › Delegated: `User.Read`, `Files.Read.All`, `Sites.Read.All` (read-only); Grant admin consent where you administer the
   tenant · no client secret (the browser signs in with PKCE).
2. *Send the Application (client) ID* (not a secret) — it is set in Faultline's build (an environment variable on Vercel) and the
   sign-in is built against it.
3. *At a client's business — their IT administrator, once:* admin consent at
   `https://login.microsoftonline.com/<their domain>/adminconsent?client_id=<Application ID>`; taken back from their own Entra admin
   center (Enterprise applications › Faultline).

**C3 — A folder kept up to date (server, scheduled).** The design in `docs/DATA-CONNECTIONS.md` §2.4: an app registration with
`Sites.Selected` (one site, granted by the client's administrator), the folder listed on the schedule, each workbook or CSV newer than the
last read taken through the ingest core, each file's `eTag` kept so it is read once. For the figures a business exports every day.

**C4 — Every business file Luna is pointed at.** The same Graph route for Word, PDF and PowerPoint (read in code as documents are today),
and Teams channel files (they live in SharePoint). Each kept as a source with its provenance; nothing summarised by the model is ever
stored as a figure.

## What waits

Writing back to a business's files; e-mail and calendars; any machine or sensor (CLAUDE.md, *measured by people, not by sensors* — a
connection reads what the business's own systems already record). Each would be its own decision of Rowland's.
