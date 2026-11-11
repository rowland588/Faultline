# The consultant's workspace — what is there, what is missing, and the shape (11 November; investigation, nothing built)

Rowland, 11 November: *"Faultline needs to work for a consultant who visits multiple businesses, not just somebody permanently working
inside one factory … I receive a phone call: 'Can you come to our factory tomorrow …' … I don't want to have to configure an entire new
factory … I need to be able to start working immediately … Client information must remain properly separated."* He asked for an honest
account of the application as it is, the journeys shown rather than described, then the experience and the next step. This page is that
account. It extends `docs/CONSULTANT.md` (8 November: K1 client · site · area on the lines, built; K2 the engagement, not built) and
changes nothing yet.

## 1. How it was checked

On the dev server with the smoke seed, in Chromium (11 November): every line given the client *Branston* (site Lincoln, area Packing),
then a second business added the way *Set up the lines* adds one (*Business B*, Leeds, Packing, Line 1), reading what each page says
before and after. And the code: `lib/lines` (clientsOf), `screens/WorkspaceHome`, `lib/storyPick`, `lib/clientStory`, `lib/keptPdfs`,
`ui/ControlRoomReports`, `snag/QuickSnag`, `colleague/turnRules`, `capabilities/memory`, `capabilities/notebook`, `capabilities/factory*`.

## 2. What is there today — the ten questions answered

| # | Question | As it is |
|---|---|---|
| 1 | The consultant, businesses, factories | **One account = one factory.** The consultant is the signed-in person (`profile`) with *Your brand* (name, business, logo — consultant-level, correct). A **business is not a record**: it is a word typed on each line (`Workspace.clientName`, with `siteName`, `areaName`; `CLIENT_SITE_AREA.sql`, K1). *"Good morning · Branston"* is the Factory page titling itself with the only client its lines name (`WorkspaceHome` `oneClient`). Departments (`add_department`, 10 Nov) are records carrying client · site · area. |
| 2 | A genuine multi-business workspace? | **Partly.** When the lines name two clients, the Lines tab shows *Every client · Branston · Business B* and the choice is kept on the device (`faultline.client`); the Story follows it (`storyPick`). **Everything else mixes them**: Today, Problems (15 open — Branston's and Business B's in one list), Actions (*Control room · every project and line*), Projects, the Tools lists, the bell, search. The title drops to *Factory* the moment a second client exists. |
| 3 | Creating a new business and site | Only by typing its name on a **line** (*Set up the lines*, or Luna's factory draft — *add_to_factory_draft* → *Make it*, 9 Nov). A business with no line does not exist anywhere. |
| 4 | A quick assessment with no factory configured | **Blocked at the first capture.** A problem must have a line (`QuickSnag` falls back to *make a new line*); every tool record starts *on a line* (*"A count belongs to a line — add yours here"*). What works with nothing set up: a conversation with Luna, the camera in AI Mode (photos stamped with where and when), a department added by name. So the honest route today is: add one line named for what you are standing in front of, then work — a workaround, not a design. |
| 5 | Visits, assignments, projects, investigations | **Client** = words on lines. **Engagement / assignment** = the nearest thing is **the Story** (`tool: 'story'`, one per client: the brief, its asks, chapters approved one by one, *Close* and *Reopen*) — never named an engagement on screen, and it does not hold projects; it reads the client's lines. **Visit = nothing.** Every record carries its day and its line, and the factory walk stamps photos with where and when, but no record says "Tuesday at Business B". **Project** = a method project on lines (a change to a line). **Investigation / study** = a tool record on a line, optionally in a project. Projects are not forced: a study, a problem, a Line Talk live on the line with no project (1 November). |
| 6 | Reports, documents, saved copies | **Fragmented.** A paper is made on demand from the page it belongs to (Report ▾) — always current, never stored. *Saved copies* keeps each PDF that was made, **on this device only** (`lib/keptPdfs`: "no cloud record yet"), under the page it was made on. *Every report* (Factory › Report ▾) is a list of papers you can **make**, not a library of what was made. Line Talk documents keep their own copies and do sync. There is **no place to browse what you have produced** — across clients or for one — and no mark of internal working paper against client-facing deliverable. |
| 7 | Reusable consulting knowledge vs client data | **Mostly right by accident of design.** The methods (eight), the tools (32), the check-log starter lists, the document kinds (charter, SIPOC, 8D, SOP…), the calculators and the report formats are **in the code** — the consultant's, not Branston's, and available to any new client the moment it exists. *Your brand* is the consultant's. Luna's notebook keeps **your own** meanings apart from **each client's**. What is missing: **your own templates** — a capture sheet, an audit checklist or a document you have shaped once cannot be saved as yours and reused (a custom sheet built with Luna lives on its one record). |
| 8 | Does Luna know consultant vs client? | **She keeps clients apart, but only through lines.** The client of a conversation is the client of its subject's line (`turnRules` notebookFor, `memory` recall, `factory` resolve — *"Brook Dairy's line is never found from Acme's"*, tested by `ai-context.mjs`). With no line — a new business — she has **no client in hand** and treats the talk as your own. *"I'm at a new customer today"* can start a factory draft (`factory-onboarding.mjs`), but not a client, an engagement or a visit. |
| 9 | Moving from one client to another | Pick the client on the Lines tab — the lines and the Story follow; nothing else does. Luna follows whichever line the conversation is about. Nothing says *you are at Business B now*. |
| 10 | What is missing | §4. |

**What is solid and should not move:** the line as home for everything measured; the tools, methods and papers; problems with their money; the
Story as the client-facing narrative; the factory walk and camera; Luna's client separation; the brand. The gap is the layer **above** the line.

## 3. The experience — a day, start to finish

**Morning, opening Faultline.** The home is yours, not a factory's: *Good morning, Rowland.* Your **clients** as rows — *Branston · ongoing
improvement · last visit Mon · 4 actions late*, *Business E · programme · next visit Thu* — then **what is owed** across all of them (late
first), your **recent visits**, your **latest reports**. One primary: **Start a visit**. Nothing of any one client's factory is drawn here.

**A new business.** *Start a visit* → *New business* → its name (and a site, if you know it) → *Start*. That is all that is required. You are
now **in Business B, visit of 11 Nov**: the top bar says it, every page is theirs, and Luna knows it. Background is said to Luna on the
walk (*"they're struggling with packing performance, three lines, nights worst"*) and kept as the visit's brief.

**On the floor.** Photos, notes, problems and measurements are taken **at the business, site or area you are standing in** — no line needed
to start. As the factory reveals itself (*a prep area, mixing, cooking, three packing lines*), you say it or add it, and what was captured
at *Packing* is placed on *Packing line 2* with a tap when you know which. The tools that need a line ask for one at that moment — the
line made in one tap from what you call it. Quick assessment tools (a waste walk, a stops count, a capability check, a Line Talk) work the
same as at Branston.

**Leaving.** *End the visit*: Faultline lays out what was captured on that visit — the problems with their money, the photos, the
measurements — and the **visit report** is made from it (the Story's chapter mechanism: drafted from the records, edited, approved). It is
filed in the business's **library**, marked *client-facing*; your working sheets stay *internal*.

**Back to an existing client.** Pick Branston on the home (or tell Luna *"I'm at Branston today"*): the app is Branston's again —
its lines, its engagement and its story, its visits, its library — and nothing of Business B is in sight.

**The library.** One page, two ways in: from the home, **everything you have produced** across clients (filter by client, by kind —
assessment, visit report, investigation, proposal, study, photos — and by internal / client-facing); inside a client, **that client's**.

## 4. What is missing, in the order it hurts

1. **One active client across the whole app.** Today only the Lines tab and the Story follow the client picked; Today, Problems, Actions,
   Projects, Tools, the bell and search mix every client. This is a data-separation risk on screen and on paper (the Actions paper is
   *every project and line*), and it is the smallest to fix — the lines already say whose they are.
2. **A business that exists before its lines.** A client has to be a thing you can start with a name. The engagement record already exists
   per client (the Story) — starting a client can be starting its engagement, so no new noun is needed for the client itself.
3. **Capture with no line.** Problems, photos and notes held at the business, site or area (a department is already a record there),
   placed on a line later with a tap.
4. **The visit.** A day at a client: its date, who, the brief said at the door, and everything recorded that day at that client — which the
   records already carry (their day and their line's client). A visit can be **read** from them; only the brief and the visit report need
   keeping.
5. **The library** — saved copies in the cloud (a table and its migration, already named as the next step in `lib/keptPdfs`), each copy
   carrying its client, its kind and *internal / client-facing*; one page across clients and one inside each.
6. **Your own templates** — *Save as my template* on a document, a check log's list and a custom capture sheet; offered at any client.
7. **Luna in the consultant's world** — the active client and visit in hand (not inferred from a line), *"I'm at a new customer"* starting
   a business and a visit, *"back at Branston"* switching, and never answering across clients (already true, kept).

## 5. Recommended next step

**Slice C1 — one active client everywhere (no database change).** The top bar names the client you are in (*Branston ▾*) and switches it;
every list and paper — Today, Problems, Actions, Projects, the Tools lists, the bell, search, the Story, Luna's context — shows that
client's records only, by their lines' client; the home greets you by name and lists your clients; *All clients* is offered only where a
consultant means it (the home, the library). Branston's records are untouched: with one client nothing changes but the greeting. Proof: an
acceptance script with two clients showing each page carrying only the active one's records, on screen and on paper.

**C1 — built (11 November).** `src/lib/activeClient.ts` is the one source of truth: the client chosen is kept on the device under
`faultline.client` (the key the Lines tab's chips already used, so a choice made there carries over), every open page is told when it
changes, and `useClientScope()` answers which line, project, study and problem is the active client's — a line by its words, a
project by its factory lines (a project on no line, or only on lines naming no client, names no client and shows under *All clients*
only once two clients are named — nothing says it is the active one's), a study or problem by its line when its line names a client,
else by its project. With 0 or 1 client named nothing is filtered. **The top bar** (`ui/ClientSwitch`, beside the mark) says
*Branston ▾* once the lines name two clients, its menu each client and *All clients*; a choice changes every page live. **What
follows it:** the Lines tab (its chips are now called *All clients* · each, the title the active client), the control room board
and its one-page paper, *Every report*, Today (briefing, lines, projects, Carry on), Problems (register, counts, its report and cards),
Actions (the factory's page, its tiles, its paper — the band names the client, or *All clients*), Projects (list, chips, the lines a
new project is put on), Machines and its paper, the Tools library's *Used · n records*, every tool's list (studies, calculators,
documents, scored registers, the registers, boards, logs, videos, talks, line standards and capacity), the bell, search, Go to ▾,
the Story (its projects and problems as well as its lines) and Luna (with no line in hand, the active client's notebook, and a line
in her context saying which client the person is in — the gateway unchanged). **All clients** names whose each row is (Problems,
Actions and its paper, Projects, Today, search, Go to ▾, Machines, a tool's list headings). **A page of another client** — a line,
a project, a record on a line — opens as normal (a deep link works) and the bar moves to that client; choosing another client while on
it goes to that client's Lines tab. A project's own pages, a line's pages and a record's page are not filtered: they are that client's.
Not filtered yet: Luna's read capabilities across the factory (overdue actions, find, …) and the Actions page's Excel export's
columns (C6 brings Luna's reads; the Excel names no client column). Proof: `scripts/acceptance/active-client.mjs`,
`src/lib/__tests__/activeClient.test.ts`.

**C2a — Customers, built (11 November).** Rowland: *"I should input a customer, everything under that customer is aligned to it. And I
need to archive the customer .. but I need ability to continue it when required. Then add another customer etc."* `src/lib/customers.ts`,
`ui/CustomersPanel` on the Factory's **Set up** tab (the calm place for what is set once) and *＋ A new customer…* in the top bar's
client menu. **Storage, no new noun and no migration:** a customer's anchor is its **Story** (tool `story`, `agreed.story.client` —
the engagement record that already exists one per client and syncs like every study). Weighed: a new study kind would need
`studies_tool_check` widened (a migration); the profile's preferences are one person's, not the factory's. So *Add a customer* (name,
site optional) starts its story with an empty brief (*No brief yet* on the Story) and `agreed.story.site`, and makes it the active
client at once — the Lines tab then shows its empty world and the next step (*Add the first line or area — or start a Line Talk, or ask
Luna*). **Aligned to it:** a line made while a customer is active takes its name and site (`lib/lines addLineToFactory` — Set up the
lines, the problem form's new line, Luna's factory draft when it names no client), and so does a department (＋ A department, Luna's
`add_department`); projects, studies, problems and stories already follow their lines (C1). **Archive** (owner of the factory only —
the same `useCanStartProjects` Set up the lines uses; a confirm saying what it does; Undo for a few seconds) stamps
`agreed.story.archivedAt` on every story of the client (one made, brief empty, for a client named only on its lines). Nothing else is
written: its lines are not archived one by one, so **Continue** (under the *Archived* fold) brings back exactly what was there, made the
active client, and a line archived on its own stays archived. An archived customer leaves the top bar, Set up's lines, the Lines tab,
Today, Problems, Actions, Projects, Machines, the Tools counts and lists, the bell, search and Go to ▾ (lib/activeClient hides it
whichever client is active), and Luna's `resolve`, `factory_map` and `recall` leave it out until it is continued. Proof:
`scripts/acceptance/customers.mjs`, `src/lib/__tests__/activeClient.test.ts`.

**C3 — Visits and the consultant's home, built (11 November).** Rowland said *go*. **The decisions, taken as defaults (each Rowland's to
change):** the engagement is the **Story** — one open per customer, a closed one kept, several over time; a visit **produces a report only
when asked** (*Make the visit report*); the **visit report is client-facing**; **no paper ever mixes two customers** except one made under
*All clients*, which says so on its band (the Actions paper already does). **What a visit is:** a customer + a day (+ a site) + who + the
brief said at the door + when it ended. **Storage, no new noun and no migration:** an entry on the customer's Story record,
`facts.visits: { id, day, site?, by?, brief?, startedAt, endedAt?, recommend? }[]` — in `facts`, not `agreed`, because the sync merges a
study's facts one level down and an id-keyed list by id (as the chapters are), so a visit started on the phone and another ended on the
laptop both stand (`visits.test.ts` proves it through `mergeRows`); `agreed` is one value, newest wins. A visit goes on the customer's
open story, else its newest, else a story is started (brief empty). The visit in hand is also kept on the device (`faultline.visit`).
**What was captured is READ, never copied** (`lib/visits visitRecords`): every problem, tool record, timed stop, Line Talk and photo whose
line is the customer's and whose time falls in the visit's hours — from its start to its end, or to the end of its day while in hand. A
walk photo with Luna is the visit's when taken in the hours with the visit in hand (its turn carries `visitId`) or at one of the
customer's lines or departments — never by the time alone. **Capture with no line — the choice and why:** a problem must sit on a line
(`Snag.workspaceId`), and a department is a study, not a line, so a problem cannot sit on one without changing the problem record and
every reader of it. So a customer with no line yet gets a **holding place** on the first ＋ Problem: a line named *<customer> — not yet
placed*, type *Not yet placed* (`HOLDING_TYPE`), made the way every line is made (`addLineToFactory`), its customer's words on it. The
sheet chooses it by itself at a customer with no line of its floor (and offers only the active client's lines once several are named);
**Place on a line** on the visit's page moves the problem to its line through `patchSnag` (the editor's own path — the editor's line box
does the same). The holding place shows on the Lines tab as a line of its customer. **Where it shows:** *Start a visit* — the home's one
primary, the client menu (*Start a visit…*), the Story's More ▾; the top bar's *Business B · Visit 11 Nov ▾* (its page, *End the visit*;
on a phone the dot and *Visit*); `#/visit/:id` (`screens/VisitScreen`, lit under Story) — what we were asked, what was found with its money
(`problemCost`), photos, measurements, studies and talks, each a door, What we recommend next, and *Make the visit report*
(`lib/report/visitPaper` — band, cover with the brand, asked, saw, found, photos whole, recommend, what the figures rest on), kept under
Saved copies. **The consultant's home:** `#/` when more than one customer is in use (`screens/ConsultantHome`) — *Good morning, <first
name>*, your customers as rows (engagement · last visit · open and late, a tap making it the client you are in and opening its Story at
`#/story`), what is owed across them (open problems with a person or a day, late first, the client named), recent visits, Start a visit.
With one customer `#/` stays the Story. Proof: `scripts/acceptance/visits.mjs`, `src/lib/__tests__/visits.test.ts`.

**C6 — Luna knows the customer and the visit, built (11 November).** Each turn's focus (`colleague/turnRules` conversationFocus →
`conversation` focusText) says *The client the person is working in* whenever one is in hand (no longer only when several are named) and
*The visit in hand: Business B, Leeds, <day>, since 09:12 — asked: "…"* (or that none is) — the context text the app already sends, so
nothing in the gateway's code changed. Four capabilities in `src/capabilities/visits.ts` (schemas in `schemas.ts`, unit tests in
`__tests__/visits.test.ts`): **start_visit** (write, ONE card — the customer by name, added when new, continued when archived; its site; the
brief in the person's words; the same `lib/visits startVisit` the sheet uses), **end_visit** (write, a card saying what was captured),
**visit_state** (read — the visit in hand, else the latest at the client the person is in, and what was captured on it, read through
`visitRecords` from that customer's lines only), **switch_client** (local, no card — *"I'm back at Branston"*, the top bar's own choice;
an unknown or archived customer refused). Her instructions (`tools/colleague/colleagueAssist`, CUSTOMERS AND VISITS) say when to use each and
never to read another customer's records; `recall`, `resolve` and `factory_map` already keep customers apart (C1, C2a). **The gateway copy
is synced (`scripts/sync-assist.mjs` — `supabase/functions/assist/colleague/schemas.ts` and `colleagueAssist.ts`) but NOT deployed: until
the `assist` function is deployed the live gateway refuses the four new calls.** Proof: `scripts/acceptance/luna-visits.mjs`.

Then, each live on its own: **C2** a new business in one tap (client = its engagement, a holding place for capture before lines) ·
**C3** the visit (read from the day's records; its brief and report kept) · **C4** the library (cloud saved copies — a migration) ·
**C5** my templates · **C6** Luna's active client and visit.

**Decisions that are Rowland's before C2:** is the engagement the Story (one per assignment, several per client over time)? Does a visit
always produce a report, or only when asked? Which papers are client-facing by default? Should *All clients* ever mix two businesses on one
paper (today the Actions paper does)?
