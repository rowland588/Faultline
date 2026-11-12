# The architecture — what is built, where it is going, and the order of getting there

*12 November 2026. Rowland: "Understand the whole product. Own the architecture. Protect what works. Lead the evolution … I want you to
understand what we have actually built, not what documentation suggests we have built … Add a way in. Never take a way away."* This is
the one page over the others: the system as the code has it (traced, with its figures), judged against the ambition — an operational
system, an intelligence, and Luna as the way to both — and the decisions and order that follow. Where a document under `docs/` disagrees
with what the code does, this page says what the code does. Decisions here are engineering's; the four that are the business's are in §8.

---

## 1. What is actually built (measured, 12 November)

| | |
|---|---|
| The application | One web app (React, TypeScript, Vite), installed as a PWA, served as static files (Vercel builds `main`). About 223,000 lines outside tests. |
| Where the work happens | **On the device.** Every calculation, verdict, chart and PDF is made by code in the browser (`src/lib` 61k lines, `src/tools` 59k). There is no application server. |
| The records | 36 stores in the browser's own database (IndexedDB), each mirrored by a table in Postgres (Supabase). The device works with no signal; a sync engine (`src/cloud/sync.ts`) sends and takes rows by a server-stamped revision, merging field by field, never a blind overwrite. |
| Who sees what | Decided by the database (row-level security): a line's members, a project's owner · team · client, a business's roles and areas. The screens only mirror it. One customer's rows are never visible to another's people. |
| Server-side code | Five small functions: `assist` (the AI gateway), `ingest` (production data pushed by a business's own systems), `remind`, `share`, `keycheck`. And scheduled jobs in the database (pg_cron). |
| The tools | 19 tools a person opens, holding well over a hundred methods (capability modes, check logs, calculators, documents, analyses), eight project methods, the problem register, actions and Gantt, the Story, visits, the library of papers. |
| Luna | 111 capabilities (50 read, 35 write, 26 conversation-only), each validated, permission-checked, audited; writes confirmed on a card. The model (Claude, through the gateway only) chooses capabilities; **the capabilities run on the person's device, on their records, with their access.** The gateway holds the key, the rules (40,000 characters) and the schemas (about 100,000 characters), refuses any call not in them, and keeps the audit. |
| The intelligence | The brain's homework (code, no AI) over a line's timed stops; the knowledge ledger (append-only: findings with identities and versions, outcomes of fixes, what people said, kept apart by how each is known); five kinds of table Luna can question (stops, program trials, readings, problems, production data); a workbook engine that reads Excel files of any size on the device. |
| Proof | 423 unit-test files; 192 acceptance scripts driving the real pages in a browser; a gate of 10, 20 or 65 minutes; a daily full run. For Luna's judgement: two real-model exams and, since today, the demonstration run — small beside the scripted proof. |

### How a question to Luna really travels

1. The person speaks or types. The device assembles the turn: the whole conversation, its threads, what is on screen, the client in hand,
   the notebook of that client's words, the files and results so far.
2. The gateway adds the rules and all 111 capability definitions and asks the model.
3. The model answers with words and capability calls. The gateway refuses any call that is not a defined capability and writes the audit.
4. **The device runs each call** — against its own copy of the records, through the same functions the pages use — and sends the results
   back. Reads run at once; a write waits on a card for the person's yes.
5. The model writes its reply; the device checks every figure in it against what the capabilities worked out and marks any it cannot find.

This shape is the product's best property and its main limit, both at once (§3).

---

## 2. What is right, and stays

These are the decisions the product's value rests on. Nothing below changes them.

1. **One home per thing.** A problem is a problem wherever it was raised; a machine has one record; a paper is made by one builder for
   screen and print. New things attach to existing records (rule 3 of *How a change gets made here*).
2. **Every figure is worked out by code.** The model never adds, ranks or compares. This is what makes Luna trustworthy in front of a
   finance director, and it is enforced twice: capabilities return the figures; the device checks the reply against them.
3. **Capabilities are the only door.** Luna cannot do anything a person could not do by hand through the same function, with the same
   permission, and a write needs a yes. Manual Mode is complete without her.
4. **How each thing is known is kept.** Measured, counted, observed, reported, imported, system, calculated — never blended. Evidence
   outranks opinion; nothing is marked verified by the AI.
5. **Knowledge is appended, never rewritten.** A finding that was wrong stays on the record as wrong.
6. **The database is the guarantee of separation**, not the screen.
7. **Local-first.** A factory floor has poor signal; the app works without it.
8. **Proved by evidence.** The gate, the acceptance scripts, the papers read back.

---

## 3. Where the design limits the ambition — honestly

Each is stated with its evidence in the code and the decision taken.

### 3.1 The intelligence only exists while a device is open

The homework runs when somebody opens a line or asks Luna (`lib/brain/homework`), on the rows that device happens to hold. Nobody's
question is answered before they ask it; nothing is found overnight; a director's "how did we do yesterday across the site?" is worked on
their phone from whatever has synced. The brief asks for a system that has *already understood* yesterday when the day starts.

**Decision — a night shift on the server, running the same code.** Not a new service and not a second brain: the engine is pure
TypeScript with no browser in it, and the project already copies shared code into its server functions (`scripts/sync-assist.mjs` — the
gateway and `ingest` run files that the app also runs). A scheduled function runs the same homework per business under the database's
own rules and writes the same deterministic ledger entries — the ledger's ids were designed so that a device and a server doing the same
work write the same row. The device keeps doing it too (offline, and for a viewer's in-memory view). *Order: after §3.2, because a night
shift over stops alone is not worth its security review.*

### 3.2 The system does not yet understand its own data

Luna can question five kinds of table. The brain reads one (stops). But the factory's knowledge is in nineteen tools: a capability
study's verdict, a loss count's waterfall, a control chart's signals, a check log's failures, a SMED's minutes, Line capacity's
bottleneck. Each tool already says its finding in its own sentence (the line page shows them; `connectors` can read each record). What is
missing is one common form for those findings, so that code — not the model — can put them side by side: *the Bagger's stops rose in the
week its capability fell and its check log started failing.*

**Decision — signals: every tool's finding in one small, typed form, read through the connector it already has.** A signal is: what it is
about (line, machine, product, reason — the subject keys the ledger already uses), what was measured, the value and unit, the period,
how it is known, how sure, the record it came from, and the tool's own sentence. No new record: a signal is *read* from a tool's record
by that tool's own code, exactly as its page reads it. The brain then reasons over signals from every tool rather than over one table,
and Luna gets one capability that answers "what do we know about the Bagger?" from everything. A new tool joins by implementing one
function. *This is the keystone; it is next.*

### 3.3 The factory's vocabulary is partly free text

Machines have records and identities. Reasons for a stop, products and shifts mostly do not: a reason is whatever was typed, a product is
a word on a program or a standard, a shift is not on a stop. The ledger's subject for a recurring stop is the machine's and the reason's
*names*. Two spellings are two subjects; a question by product or by shift usually "cannot be said".

**Decision — settle the vocabulary without new screens first.** One resolver for subjects (machine by its record; reason by its
normalised form with the aliases the client's notebook already holds; product from programs and standards; shift from the line's own
shift pattern, worked out from a stop's time). Recorded where it is cheap (a shift is a calculation, not a field to fill). Only when the
resolver shows real ambiguity does anything get asked of a person. *With §3.2.*

### 3.4 Luna is not told who she is talking to

The rules say to pitch an answer to the person's role. The turn sent to the gateway (`focusText`) carried the client, the visit, the
screen — and nothing about the person. Found in this review.

**Done in this change (A1):** who the person is and in what capacity goes with every turn (§9.3) — for depth and manner only; access
stays the capabilities' and the database's.

### 3.5 Everything is sent every turn

Each ask carries 40,000 characters of rules and all 111 definitions; each new feature has added a paragraph to one prompt. It costs time
(the pause before she speaks) and money, and one long prompt is fragile — a rule added for workbooks can change how she greets someone.
Tool loading by need is built and switchable (`ASSIST_COLLEAGUE_TOOLS`), as is a trimmed rule set (`ASSIST_COLLEAGUE_SYSTEM=lean`);
neither is on, because neither has been measured on enough real conversations.

**Decision — a short constitution, and rules that live with their capability.** Who she is, how she talks, honesty, safety and evidence
stay in a short core that changes rarely. How to use a capability lives in that capability's description, loaded when the kind of work
calls for it. The switch is thrown only when the real-model suites show equal or better marks and a shorter pause — so §3.7 comes first.

### 3.6 Memory is per conversation, plus a ledger

Within a conversation she keeps everything. Across conversations: the person's *How I work*, the client's notebook of meanings, a search
of earlier conversations (`recall`), and now the ledger. What is missing is the middle: yesterday's conclusion is found only if she
searches for it.

**Decision — no vector database; memory by subject.** The records are structured and the ledger is keyed by line, machine and reason, so
"what do we know and what was said about this" is a lookup, more exact than a similarity search. Conclusions a conversation reaches about
a subject are offered to the ledger as an account (the capability exists: `note_knowledge`). Similarity search is reconsidered only for
free documents (§3.8) — the one place where it earns its keep.

### 3.7 Luna's judgement is thinly proved

192 scripts prove the machinery with the model's part played by the script. What she actually does with the real model is measured by
two exams and the demonstration run. Every change to her rules is, today, mostly unmeasured.

**Decision — the real-model suites become the gate for Luna.** A change to her rules, schemas or context is not done until the suites
have run against the deployed gateway and their marks are written down (`docs/LUNA-EVAL.md`). The suites grow with each capability
family: conversation, variance, investigation, history and outcomes, a refusal, each role's depth.

### 3.8 Documents and workbooks live on one device

A workbook is read where it is attached and held in that browser. It is private and fast; it also means a colleague cannot ask about the
same file, the night shift cannot read it, and procedures, manuals and past reports are not something Luna can consult.

**Held — a business decision (§8).** The engine does not change either way; only where the file's cells are kept.

### 3.9 The engineering itself

- **The gate is slow** (65 minutes full). It is the price of the proof and is kept; the fast gate (10 minutes) is the working cycle.
- **`studies` is a catch-all** — tool records, conversations, sources, the brain's study, templates, the Story, all in one table with a
  JSON body. It has been a strength (a new tool needs no migration) and is why signals (§3.2) are read by each tool's own code rather
  than queried in SQL. It is kept; the ledger and the production records show the pattern for data that must be queried in bulk — a
  table of their own.
- **Large files** (`AiModeScreen` 1,660 lines; `capacity.ts` 2,008) are split at their seams when next worked on, as STEADY did — never
  as a project of their own.
- **The older methods' code** (stage gate, lever tree) stays until Rowland decides its end (CLAUDE.md).
- **The name inside** (`faultline.*` keys, table names) stays: nobody sees it, and renaming risks every device's stored data.
- **104 documents.** They are the memory, and they are too many to hold in mind. This page is the map; `docs/STATE.md` says what is live.

---

## 4. The architecture, as one picture

```
 PEOPLE ── by hand ───────────────────────────────┐          ── by conversation (text · voice) ──┐
                                                  ▼                                              ▼
 5  LUNA            the conversation: who she is talking to, where they are, the thread, what is known   [gateway: rules, audit]
                    │  only through ▼
 4  CAPABILITIES    read · write (on a yes) · the same functions the pages use · the person's own access
                    │
 3  KNOWLEDGE       the ledger: findings · outcomes · what people said · reviews — versioned, never rewritten
                    ▲  written by the brain (code) on a device, and by the night shift on the server (the same code)
 2  MEANING         subjects (site · area · line · machine · product · reason · shift)  +  SIGNALS from every tool  +  tables to question
                    ▲  read by each tool's own code — nothing copied
 1  RECORDS         problems · actions · studies · stops · programs · check logs · documents · production data · papers
                    (the device's database ⇄ Postgres, row-level security)                 ◄── the pages read and write here, as today
```

The pages (Manual Mode) use layers 1–3 directly and always will. Luna uses the same layers through layer 4. A new capability of the
product is added at the lowest layer it belongs to and becomes visible to both ways of working at once — that is how there is never a
second version of the truth.

**The rule for adding anything:** a new *record* needs a home in layer 1 and a reason no existing record will do; a new *tool* gives its
signal (layer 2) and its connector (layer 4) and is then known to the brain and to Luna with no prompt edit; a new *kind of analysis* is
code in layer 2 or 3 with its independent cases, surfaced by a capability; nothing is built in layer 5 that is not reachable by hand.

---

## 5. Decisions taken, and what was decided against

| Decision | Instead of | Why |
|---|---|---|
| The same engine on device and server (copied code, scheduled function) | a separate analytics service or data warehouse | one implementation of every calculation; no new provider; the ledger was designed for it |
| Signals read through each tool's own code | restructuring tool records into SQL tables | no migration of customer data, no second copy, each tool stays the authority on its own finding |
| Memory by subject key in the ledger | embeddings and a vector store | the data is structured; exact beats similar; one less system. Reconsidered only for free documents |
| The model chooses and explains; code computes | letting the model analyse data directly | the product's trust rests on it |
| Capabilities keep running on the device | moving Luna's loop to the server | the device already holds the person's permitted records and works offline; a server loop would need a second permission system. The night shift is the one server-side reader, read-only over records, writing only ledger entries |
| The browser's own speech for now | a speech provider | no cost, no new provider, private; judged on the demonstration laptop before anything is bought (§8) |
| One prompt split into a constitution and capability-carried rules, switched only on measured results | rewriting the rules now | a prompt rewrite without measurement is a regression waiting |
| No rewrite of any working tool, page or paper | — | *Add a way in. Never take a way away.* |

---

## 6. The order

Each step ships on its own, changes nothing a person relies on, and is proved before the next.

| Step | What | State |
|---|---|---|
| **A0** | The knowledge loop (ledger, outcomes, history, across lines) and the conversational colleague (everyday conversation, plan against actual, the demonstration) — landed, live, and run with the real model | built; gate and deploy in hand |
| **A1** | Luna knows who she is talking to — the person, their capacity (independent, or a member of one business in its role) and the business in hand or none (§9) | **built in this change** |
| **A2** | **Signals** — every tool's finding in one form through its connector; the subject resolver (machine, reason, product, shift); `what_we_know` for Luna; the brain reading signals from all tools; the line and machine pages showing the joined picture | next |
| **A3** | **The real-model gate** — suites for conversation, variance, history and outcomes, each role's depth, a refusal; marks kept per deploy | alongside A2 |
| **A4** | **The night shift** — the homework on the server for every line each night; the morning briefing ("how did we do yesterday, what changed, what needs you") on Today and from Luna | after A2; needs its security review and §8.3 |
| **A5** | **Context assembly** — the constitution, rules carried by capabilities, tools loaded by the kind of work, long conversations carried as their threads — switched on by A3's marks | after A3 has a baseline |
| **A6** | **Findings into work, and back** — a finding opens the right method with its evidence; the outcome returns to the finding; a fix that held is offered where the same pattern recurs (the bridge to *Spread what works*) | after A2 |
| **A7** | **Documents** — procedures, manuals, reports and workbooks as a library Luna can consult, with their sources cited | waits on §8.1 |

---

## 7. What is working, partial, planned and unproved

| | |
|---|---|
| **Working and proved** | The tools, methods, papers, problems and actions; sync and separation; the capabilities and their cards; workbooks read on the device; figures checked; the ledger's rules in the database; findings, outcomes and history by code |
| **Working, thinly proved with the real model** | Luna's investigations (two exams), the knowledge capabilities, the demonstration conversation and the variance investigation (first run follows the deploy) |
| **Partial** | The brain (stops only); the factory's vocabulary (machines yes; reasons, products, shifts not); roles (permissions built; depth only from today); production-system connections (built, switched off) |
| **Planned** | Signals, the night shift, the morning briefing, context assembly, the document library |
| **Not proved** | Voice on a real laptop or in a real factory's noise; behaviour at the scale of a large site's years of data on one device; the cost per conversation at a business's daily use |

---

## 8. The four decisions that are the business's

1. **May a business's workbooks and documents be kept on the server** (encrypted, under the same separation), so that colleagues share
   them and the night shift can read them? Today they never leave the device.
2. **Is the browser's own voice good enough to sell**, or is a premium voice worth a provider and a cost per minute? To be judged on the
   demonstration laptop, not in theory.
3. **When are production-system connections switched on**, and for whom first?
4. **What a business is allowed to spend on Luna a day** — the allowance per person and per business, once the cost per conversation is
   measured (A3 measures it).

Nothing in A1–A3 waits on any of them.

---

## 9. The independent professional is a first-class user — the person, the business and the work, kept apart

*Rowland, 12 November: "I want to make absolutely certain that … we do not accidentally design it exclusively around employees working
within one company. A major use case is me personally … Luna is my intelligent colleague. The product is my operational working
environment, whether I am working independently or helping a manufacturing business improve."*

### 9.1 What the code does today (traced)

| Question | What is built | Verdict |
|---|---|---|
| Can one person work across several businesses? | Yes. A **customer** is a name on its lines and on its Story (the engagement record, one per customer); the top bar's client switch filters every list, paper, search and Luna's reads to the customer in hand; visits, a consultant's home, a library by customer, templates that belong to the person and carry nothing of any customer (`lib/customers`, `activeClient`, `visits`, `library`, `templates` — C1–C6, 11 November). | **Works**, and is proved by seven acceptance scripts. |
| Does Luna move between businesses? | `switch_client` (no card), `start_visit` · `end_visit`, the client and visit sent with every turn, a notebook of each client's words, one client's records never offered for another. | **Works.** She could not step *out* of every business into the person's own work — **added in this change** (`switch_client` "none"). |
| Does the system know the person apart from the business? | Partly. *Your brand* holds the person's name and their own practice (Rowland Glew · Streamline Synergy) and prints it on every paper. But the **business** record (`organisations`) is made one per person, with the person's own id, and is **named after the client their lines name most** — so a consultant's own business is called "Branston", and the consultant is its "Administrator (the business's owner, IT)". | **Wrong for a consultant.** The model was written for an employee's company (docs/ORGANISATION.md). |
| What was Luna told about the person? | Until today, nothing. The first fix of this review sent the role — which for Rowland would have said *Administrator, the business's owner or IT*. | **Corrected in this change** (9.3). |
| Are two customers of one consultant separated in the database? | The consultant's customers all sit in the consultant's one business. Between them the separation is the customer's name on each line — a filter in the app, right for the consultant's own eyes. **But a person invited into that business (the People page) is scoped by site and area only, not by customer**: a client's manager invited with no scope would be let into every customer's lines by the database. | **A real gap — latent, not yet exploited**: the live database has one business, one member (Rowland) and one customer. It must be closed before anyone from a client is invited that way. Until then a client's person is invited to a **project** or a **line** (both are separated correctly today). |
| Can a client business that subscribes itself have its consultant in? | The database allows a person to be a member of several businesses, each with a role and a scope. The app picks **one** business per person (`pickBusiness`) and remembers one role. | **Foundation present, app not ready.** |
| Independent work with no client? | Records can live on no line (a quick study, a calculation, a conversation, a document); templates are the person's. There is no place that *is* the person's own work — it shows under "All clients", mixed with everybody's. | **Partial.** |

### 9.2 The model — five things, each with one home

| Thing | What it is | Where it lives |
|---|---|---|
| **The person** | Who is signed in: their name, how they work, their words | the profile, *Your brand*, *How I work* — as today |
| **Their practice** | The person's own professional home: for a consultant, their consultancy; for an employee, nothing separate. Their own work, templates, library and brand belong here | the business record the person owns — **named for them, never for a client** |
| **A business they work with** | A manufacturing business: its sites, areas, lines, machines, records and knowledge | today a customer inside the consultant's practice; **able to become a business of its own** (its own members, its own administrator) when the client subscribes — its lines move, nothing is copied, the consultant stays in as an outside member |
| **The relationship** | In what capacity the person is in that business: employee, or an outside professional (consultant, contractor, auditor) — and a job title in their own words | on the membership, beside the role |
| **The engagement** | The work being done for that business: what was asked, visits, findings, what was done and proved | the Story, its visits and projects — as built |

And two things that are never confused: **access** is the role and scope on the membership, enforced by the database; **manner** is how
Luna speaks to this person in this capacity. A consultant with full access to a client's lines is still spoken to as a fellow
professional; a director with a viewer's access is still given a director's two sentences.

**Decided against:** a separate consultant application or a consultant "mode" (the same pages, tools and Luna serve both); a second
permission system for outsiders (the same roles and scope, plus the relationship as a fact); copying a client's data between a
consultant's space and the client's (one home — the lines move, or the consultant is let in).

### 9.3 Built in this change

- **Luna is told who she is talking to, properly** (`colleague/person`): the person and their practice; their capacity — *an independent
  professional who works with manufacturing businesses and is not an employee of them* when the business on the device is their own and
  serves customers that are not it, else a member of one business in the role its administrator gave; the businesses they work with; the
  business in hand, or **none — their own, independent work, into which no business's records are brought unless named**. For manner
  only; said so in the line itself.
- **Stepping out of every business**: "let's leave that business for now" → `switch_client` with the other customer; "this is just for
  me" → `switch_client` "none".

### 9.4 One product, three ways of using it — and the one mechanism that serves all three

*Rowland, 12 November: "These aren't three separate products. They are different ways of using the same underlying product. My
consultancy is the first real-world use case and proving ground. The commercial manufacturing product is the wider destination … I don't
want us to build an elaborate consultant platform … The immediate priority is making me exceptionally effective when I enter a business.
The architecture should simultaneously allow that business, and eventually others, to adopt the product themselves."*

| The way it is used | What must be true |
|---|---|
| **1. The consultant alone** — walks in, investigates, analyses, reports | everything works with one person and no set-up: a business named, a line found, Luna working. *This is the priority, and it is what the demonstration proves.* |
| **2. The consultant with the business's people** — their managers and engineers brought in to see, add and own actions | bringing one of their people in is one step, shows them their own business and nothing of any other, and costs the consultant no re-entry of anything |
| **3. The business on its own** — it subscribes and runs it without the consultant | everything already established — factory, records, knowledge, history — is theirs as it stands; the consultant stays in as an outsider, or leaves, and nothing is copied or rebuilt |

**The decision: every customer is a business from the first day.** Not a label inside the consultant's own business that is later
"graduated" (as 9.2 first had it), but a business record of its own — made in one step when the consultant names a new customer (starting
a visit already does this for the engagement), with the consultant as its first administrator. The consultant's practice is simply
their own business, holding their own work. That one mechanism serves all three uses with nothing extra:

- **Alone:** nothing changes in what the consultant does — the client switch in the top bar is already how they move; it now chooses a
  business rather than a label.
- **With their people:** the People page of *that* business invites them. The database already separates by business, so the gap found in
  9.1 closes by construction — no extra scope to remember, no way to invite someone into every customer by mistake.
- **On its own:** the business is already whole. Adoption is a change of who administers it and who pays, never a migration.
- **Sold direct:** a business made by its own administrator, with no consultant — the path that exists today.

**What it costs, honestly:** the app assumes one business per person in four places (which business is "mine", my remembered role, the
business a new line joins, the People page). Those are widened to "the business in hand". The live database holds one business, one
customer and seven lines today, so the change is made now, while it is small. The handing over of administration and the commercial
terms (who pays, what a consultant's seat in a client's business costs) are business decisions for later — nothing built now assumes an
answer.

**What is deliberately not built:** a consultant portal, a partner tier, cross-customer dashboards beyond the consultant's own home,
any sharing between businesses. A consultant is a person who is in more than one business. That is the whole model.

### 9.5 The order (beside §6)

| Step | What | Why this order |
|---|---|---|
| **P1** | **A customer is a business** — naming a customer makes its business (the consultant its administrator); its lines belong to it; the client switch chooses the business in hand; the app's four one-business assumptions widened; the practice named for the person from *Your brand*, never for a client. The existing customer is moved by a migration with its read-back; a policy test proves a person invited to one business sees nothing of another | closes the separation gap by construction and makes ways 2 and 3 possible; smallest while the data is small |
| **P2** | **The relationship on a membership** — employee or outside professional, and a job title; Luna's line reads them | manner, not access |
| **P3** | **My own work as a place** — what belongs to no customer (preparation, analyses, drafts, templates) listed apart on the consultant's home; a record made with no business in hand stays in the practice until placed | independent work |
| **P4** | **Handing over** — a business's administration passed to its own person; the consultant kept as an outside member or removed | when the first business adopts it |

P1 is done before any person from a client business is invited. It sits beside A2 (signals), not behind it: A2 is what makes the
consultant effective on the day; P1 is what lets the business join in.

---

## 10. Who you are, what you may do, what was bought, and the product owner — four things, never one system

*Rowland, 12 November: "I don't want commercial tiers, user roles and administrative permissions becoming one complicated system. I also
don't want to build a subscription and billing system prematurely … My own account should have the ability to access everything for
legitimate product development, testing and administration, but this must not undermine business separation, customer confidentiality or
security." No pricing, limits or packages are decided here, and none is built.*

### 10.1 The four, each answering one question, each with one home

| | The question it answers | Where it lives | What it must never decide |
|---|---|---|---|
| **1. Identity and professional role** | *Who is this, and how should Luna speak to them?* | the person's profile, *Your brand*, *How I work*; their capacity in a business (employee · outside professional) on the membership (§9) | access, or what was paid for |
| **2. Permission in a business** | *What may this person see and change here?* | the membership: a role and a scope, per business — enforced by the database (row-level security) | what the product can do |
| **3. The plan** | *What did this account buy?* | **on the business** — one small record of what is included (the `entitlement` field already on `organisations`, never yet read) | who may see whose data |
| **4. The product owner** | *Who runs the product itself?* | a flag on Rowland's profile, for running the product: accounts, plans, usage, evaluation, demo data | reading a customer's data |

They meet at exactly one sentence: **a person may use a capability on a record when the plan of the business includes the capability
AND their permission in that business reaches the record.** Two independent yes-or-no answers, asked in two places. Neither knows the
other exists.

### 10.2 The plan — the simplest thing that keeps the commercial future cheap

- **A plan belongs to a business, not a person.** A consultant's subscription is the plan on their own practice (which is a business, §9);
  a manufacturer's is the plan on theirs. So "consultant tier" and "business tier" are not two systems — they are two values of one field.
- **Whose plan governs the work: the business whose records they are.** While a customer's business is still administered by the
  consultant who made it and has no plan of its own, it runs under the consultant's practice plan; the day it subscribes, its own plan
  takes over. That one rule covers the consultant alone, the consultant with their client's people, and the business on its own.
- **One question, asked in one module** (`lib/entitlement`, to be written when the first package is defined): *is this feature included?*
  and *what is this limit?* — asked at the two places everything already passes through: the registry of tools and pages, and the
  registry of Luna's capabilities; and on the server where money is spent (the AI gateway's daily allowance, which today is one setting
  for everybody). Never an `if (plan === …)` in a screen.
- **Features are named for what the customer gets, not for how it is built** — a dozen or so areas (the methods, the analysis tools, Luna,
  voice, workbooks, production-system connections, the knowledge and night shift, working in more than one business, seats, the daily AI
  allowance). Which areas, and which plans hold them, is Rowland's decision when he has one; adding or moving one is a line of data.
- **No plan recorded means everything is included.** That is today's behaviour, so nothing changes until a plan exists — and it is why
  nothing needs building now. No billing, no payment provider, no trial logic, no feature flags scattered in advance.

**Decided against:** tiers expressed as roles ("a Pro user"); a plan on the person (a consultant in five businesses would carry five
meanings); feature checks written into pages; a billing integration before there is a price.

### 10.3 The product owner — and a finding

**Finding (traced).** The product-owner flag (`profiles.is_super`) does two different jobs today. It opens the administration of the
product (invites, the admin panel, demo data) — right. And it is written into the database's own visibility rules (`is_super()` appears in
the rule for who is on a line, who owns a project, and nineteen other files): **the product owner can read and change every record of
every business.** While the only business is Rowland's own, that is harmless and convenient. The day another business's people put their
records in, it would mean the product owner can silently read a customer's factory — the opposite of the confidentiality the product
promises.

**Decision — two different powers, separated before the first business that is not Rowland's own comes in:**

- **Running the product** (stays on the flag): accounts and invitations, each business's plan, usage and AI cost, the evaluation runs,
  demo data, and every capability of the product on Rowland's own account — his own practice's plan is simply "everything".
- **Seeing a customer's records** (leaves the flag): the same way as anybody else — by being a member of that business. Rowland the
  consultant is a member of every business he works with, so his own work is untouched. For support of a business he is *not* in, access
  is **given by that business's administrator**, for a stated time, and recorded — never taken.

So "unrestricted" means unrestricted *capability*, on the records he is entitled to see — not unrestricted *sight*. It is the same
two-question rule as everybody else's, with a plan that includes everything.

### 10.4 The order

| Step | What | When |
|---|---|---|
| **C0** | Nothing built. The model above is the rule new work is held to: no plan logic in screens, no role used as a tier | now |
| **C1** | The product-owner flag taken out of the data-visibility rules (a migration with its read-back and a policy test: the owner outside a business sees nothing of it); support access as a grant by the business's administrator | **with P1** (§9.5) — before any business that is not Rowland's own is let in |
| **C2** | `lib/entitlement` and the two checkpoints (tools and pages; Luna's capabilities), the gateway's allowance read from the business's plan; a plan set by the product owner in the admin panel | when the first package is decided |
| **C3** | Billing | when there is a price and a customer to charge — a provider's job, attached to the plan record, never woven into the app |
