# Luna, a connected system — the direction and the plan (20 November)

Rowland, 20 November: *"you need to know that the future of the App is not to use tools but for Luna to be a connected AI system — our
first step is Excel … uploads and connected to SharePoints and files in businesses."*

**She keeps up by herself since 21 November** (`docs/LUNA-AGENT.md` G2a): *Check for a newer version* is no longer only a button in Files — when her page comes into view she asks again for each linked file of the customer in hand not looked at in four hours, and says the ones that have changed (`colleague/keepUp`, `colleague/KeepUpNews`). The button stays, for a file too big to fetch unasked and for a person who wants to know now.

**Sharpened, 21 November** — *"The path for the app is not tools or projects — Luna linked to data. No more analysis — Luna knows
everything. Ask her a question. She is the future: a live, humanistic person, like Iron Man's Jarvis."* So connection is not an import a
person performs: Luna is LINKED, keeps up with what she is linked to, and already knows when she is asked (CLAUDE.md, first section;
the order of work in `docs/LUNA-EVAL.md` §6).

So the front of Faultline is Luna reading the business's own information where it already lives — the workbooks people keep, the files on
their SharePoint and OneDrive, and the figures their production systems record — and answering from it. The tools stay: they are what
Luna works with and what a person opens to see the working (`docs/AI-MODE.md`, `docs/AI-OPERATING.md`). What changes is the order of
the work: connecting Luna to the business's information comes before adding tools.

**Luna (this plan) is the data-connection product; Faultline is Manual Mode** — two products in one install (`docs/DIRECTION.md`, 23 November).

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
| Send this email to John — confirm card, Graph Mail.Send from the signed-in mailbox | `docs/LUNA-MAIL.md`, `send_email`, Connect Outlook on Data connections | 24 November |

**Where to find it (20 November).** Data connections had become a shut fold at the foot of Factory › Set up. It is now: Luna's ＋ ›
**Connect** › Microsoft 365 (a full-height column on Luna, `data-env-column`); a place of its own in Everything; and Set up's *Data
connections* section, open on arrival at a desk. On the page, the **SharePoint and OneDrive** card says *Not set up* and **Set up**
opens **Connect to Microsoft as its own factory page** (`#/factory/data?ms=1`, `src/screens/MicrosoftConnect.tsx`, proved by
`production-data.mjs` 0b) — never a sheet over the list.

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

**X1 — A file from SharePoint or OneDrive (built 20 November).** Luna's ＋ › **Connect to Microsoft** (since 21 November: ＋ › **Connect** › *Microsoft 365* — one Connect row, X1b): not registered — said, with
the way to the steps; registered — **Sign in with Microsoft** in Microsoft's own window (OAuth 2.0 with PKCE, `src/lib/microsoft/auth`;
the token kept on this device only, renewed by its refresh token, forgotten on Sign out); then **Recent · My files · SharePoint** (a site
found by name, its library, folders opened in place), only the files Faultline can read offered (`src/lib/microsoft/graph`,
`src/colleague/MicrosoftPicker`). A file chosen is **downloaded to the device and read by the same reader as an upload** — the first look,
the customer's reading, the comparison with last month, the pack — and kept in the register with **where it came from** (the drive, the
item, its version `eTag`, its address and path). Read-only file scopes (`User.Read`, `Files.Read.All`, `Sites.Read.All`); nothing written
to files. **Send this email (24 November):** `Mail.Send` is asked only on **Connect Outlook** (`docs/LUNA-MAIL.md`) — a confirm card, never
a silent send. Proved by `src/lib/microsoft/__tests__/microsoft.test.ts` (10, the PKCE challenge against RFC 7636's own example) and
`scripts/acceptance/microsoft-files.mjs` (20 checks, Microsoft played: registered, signed in, a real workbook from OneDrive read with no
request to the gateway, its origin kept, SharePoint found, a 403 said, signed out, the phone). **Not provable here:** a real tenant's
sign-in and admin consent.

**X1b — A file by its link (built 21 November).** Rowland, the same night X1 was ready to try: *"I'm not a business, so I can't do the
SharePoint thing … I need to get to the point where I can connect to a URL and extract."* So a workbook kept anywhere a link can be given
out — a personal OneDrive, Google Drive or Sheets, Dropbox, a SharePoint file shared as *Anyone with the link*, or any https address
that gives a file — is read by pasting its link. **One button** (Rowland, shown the first sheet, which explained itself at length:
*"Don't make this complex … I should just have one click, one button. Connect. And then what am I connecting to? And I connect … I want
simplicity, not complexity"*): Luna's ＋ has ONE row for everything not on the device, **Connect**; its sheet
(`colleague/ConnectSheet` — on Luna a full-height column, `data-env-column`) asks one thing, *What are you connecting to?* — **A link**, or **Microsoft 365** (X1's picker, the same column
behind it); A link is one box and one button, **Connect**; what cannot be connected is said when it happens, never before; how to get a
link and who can read it are one fold, *Help*, shut. (Set up › Data connections › *A link*, **Ready** — its Connect opens the same box on this page (`#/factory/data?link=1`), never a sheet over Luna.
A link pasted into Luna's own box and sent is read the same way.) **Connect** sends the link to Luna's cloud — the `link` function (`supabase/functions/link`), because a browser may not read another site's download —
which fetches the file and passes the bytes straight back; it is **read on the device exactly as an upload is** (the first look worked in
code, no request to the AI service) and kept in the register with where it came from: the link, the service and the **fingerprint of its
bytes** (SHA-256). *Files Luna can read* lists it *From a link · …*, and **Check for a newer version** fetches the link again and compares
fingerprints — a shared link's download gives no version number to trust, so the bytes decide; a changed file is read and the look says
what changed since. **Try a sample** reads a made-up month of a factory's plan and actual kept on Faultline's own site
(`public/sample/Plan-and-actual-October.xlsx`, written by `scripts/workbook/make-demo-workbook.mjs`) — the whole path with no account
anywhere. **What the cloud may fetch** is `src/lib/fileLink/linkCore` (copied word for word into the function by
`scripts/sync-assist.mjs`, so the app's tests prove the code the cloud runs) with the ingest core's address rules: https only; never a
private, loopback or link-local address, at the start or after any redirect, every resolved address checked; at most eight redirects;
cookies kept for the one fetch and sent back only to the host that set them (SharePoint and OneDrive hand an anonymous link's pass that
way); the answer told from its first bytes — a workbook, a PDF, an Office file or rows of text, **never a web page** — and no more than
60 MB; a signed-in person only (or the database's check key). Each service's shared link is asked for in its own direct-download form
(`directForm`: `download=1`, `export?format=xlsx`, `dl=1` …). A link that opens a page, asks for a sign-in or has gone is said so with
what to do. Proved by `src/lib/fileLink/__tests__/linkCore.test.ts` (40, a played web) and `scripts/acceptance/file-link.mjs` (27, the
cloud played, real generated workbooks, no request to the gateway). **Proved on the real internet, 21 November** (Rowland: *"create an environment
where you can test that approach, that it actually works … And oh no, she didn't get access"*): `scripts/eval/link-real.mjs` calls the
DEPLOYED function with real links and fails on any that answers otherwise than expected — a Google Sheet shared with anyone who has the
link came back as a real workbook and was read by Luna in the real app (no request to the AI service); a workbook Microsoft gives out by
a link, and a CSV on the open web, came back whole; **real SharePoint** refused an address that needs its organisation's sign-in (*"The
link asks for a sign-in, so it is not open to anyone who has it…"*) and a sharing link that does not exist (*"no longer points at a
file"*); real OneDrive refused a link that points at nothing; a web page, a private address, plain http, nobody signed in and a wrong key
were each refused. **Real OneDrive, shared with anyone who has the link, proved the same day** (Rowland could
not make a link: *"I need you to create an environment for testing"*): real share links other people have published were found on the
web and sent through the deployed function — a short link in the older form (`1drv.ms/x/s!…`) and one in the newer (`1drv.ms/x/c/…/E…`)
each came back as a whole workbook, and the first was read by Luna in the real app. The function, asked with the check key and
`trace: true`, tells the way a link went (each address, status, where it sent us, the names of cookies set — never to a signed-in
person), and what real OneDrive does is now known and kept as unit tests against a played service: the short link redirects to
OneDrive's sharing address (`onedrive.live.com/:x:/g/personal/…`, the file since moved onto its newer, SharePoint-based storage);
`download=1` on that address answers with a **FedAuth pass** and the file's own address; the pass handed back there gives the file.
That trace also **found a fault and fixed it**: a newer link's `redir` was being turned into `/download`, which asks for a sign-in — it is
now followed as it is. Known and said: an *embed* link (File › Embed, `…/IQ…`) lands on OneDrive's viewer and is said to be a web page;
OneDrive's own shares API refuses without a token, so it is not used. **Still not proved:** a business tenant's SharePoint *Anyone with
the link* file arriving — the mechanism is the one real OneDrive just showed (the same sharing address, `download=1`, the pass by cookie)
and real SharePoint's refusals are proved, but no published business link could be found to test, so a person's first paste is its
test; Dropbox and a file kept in Google Drive likewise.
**Said to the person, in Help:** anyone who has the link can read the file. Not built: a folder by its link,
and checking a link on a schedule (X5).

**X1c — A file belongs to a customer; an archived customer's files are not Luna's to use (built 21 November).** Rowland: *"links and
data for Luna also need to be included in the current customer … Branston currently live. But if I archive it then Luna will not pull
information from that, because the customer is archived … if the customer is restarted then it pulls all information."* Before, a file
took a customer only when its conversation was on a line — connected with no place chosen it was no one's and showed under every
customer — and Luna's own readers looked at every file in the register. Now (`capabilities/data` `customerOfSource`, `standingOf`,
`sourcesInHand`): **whose** a file is — the customer it was connected under (its line's, else the customer in hand, else the only
customer in use — kept on it), and a file that names none is the only customer's when there is only one. **A file always has a
customer** (Rowland, the same hour: *"Simple way is connect files to customer; if customer is archived then so is the data, Luna can't
pull the data any more — think of it as tenant addresses"*): where it cannot be known — several customers in use, all of them shown,
the conversation on no line — it is asked before the file is read, *Which customer is this for?*, a row a customer
(`colleague/WhoseSheet`, `ownerFor`); shut without an answer, nothing is connected; a consultant with one customer is never asked; **in hand** — with a customer
chosen, that customer's files and those truly no one's; with all clients shown, every customer's in use, each named; **never an
archived customer's**. Every reader goes through it: what Luna is told each turn (`conversationFocus`), `list_sources`,
`resolve_source`, a file asked for by its id (`source_fields`, `query_data` — refused in words: *"… belongs to Branston, which is
archived — nothing is read from an archived customer … continue Branston to use it again"*, or *"… not the customer in hand — switch
to …"*), the workbook capabilities, `name_source`, and the list beside her (`colleague/LunaFiles`). Archiving deletes and rewrites
nothing — the record is exactly as it was, put away with the customer and back when it is continued; a file already in the register
keeps its customer however it is read again; the same link connected under another customer is that customer's own file. Proved by
`src/capabilities/__tests__/sourceStanding.test.ts` (9, the rule alone) and `scripts/acceptance/customer-files.mjs` (32: Branston live,
archived, continued; a second customer; all clients, where the customer is asked; the same link under both). Not covered: an older conversation's own words stay in
that conversation.

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
