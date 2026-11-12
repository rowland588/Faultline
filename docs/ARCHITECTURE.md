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

**Done in this change (A1):** the person's role in the business, as its administrator set it, and their name go with every turn — for
depth only; access stays the capabilities' and the database's.

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
| **A1** | Luna knows who she is talking to — role and name with every turn | **built in this change** |
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
