# Faultline as a configurable, AI-driven platform — decision document

**18 October 2026.** Your brief: *"determine the best route to finishing
Faultline as a configurable, AI-driven platform — preserving the work that
deserves to survive, replacing what genuinely holds it back, and avoiding
unnecessary development."*

**Status: for decision.** No application code, schema, dependency or data
was changed to write this. Every claim about the code names the file it
comes from. Where this document and `docs/AI-VISION.md` differ, this one
supersedes it: that review assumed a fixed set of methods; this one does not.

---

## The answer in one page

**Can the current codebase support the vision without a major rebuild? Yes —
with one genuinely new layer, built beside what exists.**

The technology is not what holds the vision back. The offline PWA, the
IndexedDB store, the sync engine, Supabase with row-level security, the
report layout engine and the deterministic manufacturing arithmetic are all
platform-grade, and most of them are already generic.

What holds it back is that **every methodology is written in code**:

- the method is two booleans on the project (`src/lib/planModel.ts`), read in
  19 files;
- the stage gate's gates are a fixed TypeScript union *and* a database check
  constraint (`tests_gate_check`, `supabase/GATES.sql`), named in 45 files;
- the tools are a fixed list in TypeScript *and* a check constraint
  (`STUDY_TOOLS`, `src/lib/study.ts`; `supabase/STUDIES.sql`);
- there is no form, field, rule or gate condition that exists as data.

A configurable platform needs **methodology as data, and a runtime that
executes it**. That is new code under any option, including a rebuild. In the
recommended option it is added beside the current app, not in place of it.

**Recommendation: option C, done inside this repository and stack.** Add a
*platform core* — definitions, a workflow runtime, typed operations, one AI
gateway, an activity log and, before a second customer, organisations. Keep
the three native methods running unchanged. Expose the existing tools as
components that user-defined workflows can use. Move a native method onto
the runtime only when its own acceptance scripts prove the two match.

**Proof of concept: a commissioning methodology designed through conversation
with Claude.** It is approved, run as a real project on a phone with no
signal, its gates enforced, its questions answered from the project's actual
state, and a change proposed, validated and applied as a new version, with
every change logged. Commissioning is chosen because it is the one method
whose definition already exists partly as data. Each job keeps its own stage
lists, who each stage is with, how it is answered and what it must show
(`Project.gateStages`, `src/lib/install.ts`). It has the richest step record,
and there is a working native version to measure against.

**Three things I would challenge:**

1. *"Any methodology from a prompt"* places Faultline against general
   work-management and no-code platforms that already have AI. The version
   you can defend is **configurable operational change with manufacturing
   rigour built in**: gates with evidence, measured before and after, and real
   instruments rather than checklists. The architecture can stay general
   underneath.
2. **Generated workflows will be plainer than the hand-built ones.** The stage
   gate's sentences, plan and papers set the quality bar. Generic screens risk
   the "gimmick" you warned about on 24 September. The runtime must reuse the
   hand-built parts as components, not replace them with forms.
3. **Some existing decisions conflict with the vision** and need your answer:
   - gates that report but never block ("an internal tool, not a wall");
   - "no Internet of anything" against "connect to our line data";
   - single-owner tenancy, with one administrator email hard-coded in SQL.

---

## 1. The product vision, as I understand it

A person describes an outcome. Faultline asks only what it needs, designs a
structure from approved building blocks, and shows what it intends to
create. On approval, the design becomes a working part of the application:
executed, tracked, validated, changeable, reported on and connected to data.
Manufacturing is where it proves its value first. The architecture is not
bound to a fixed collection of Lean tools.

Claude is the conversational intelligence. **The application owns the data,
permissions, validation, calculations, workflow execution and the final
applying of every change.**

What that requires, technically:

1. **Methodology is data** — a versioned definition, not code.
2. **A runtime executes any valid definition** — where each stage stands,
   which gates are open and why, what is outstanding, with no signal.
3. **A closed vocabulary of building blocks** — stages, steps, field types,
   evidence, roles, conditions, approvals, calculations, report sections, tool
   components. Claude composes from it; a validator checks the result.
4. **The existing tools become components** with typed inputs and outputs.
5. **The model changes nothing directly.** It proposes definitions and
   operations. The app validates and previews them, and applies them with the
   person's own permissions. Everything is logged.
6. **Integrations are engineered connectors** with scopes, switched on by an
   administrator — never produced by a prompt.

What it does **not** mean: new screens, new code or new integrations
appearing from a sentence.

---

## 2. The existing architecture, verified against the repository

| Area | What the code shows | Where |
|---|---|---|
| Stack | React 18, TypeScript, Vite PWA; hash router; 11 runtime dependencies | `package.json`, `src/router.tsx` |
| Size | 461 source files, 107,189 lines (excluding tests): 62 screens, 107 UI parts, 213 logic modules. 711 commits between 2 and 18 October | `src/` |
| Tests | 176 test files (24,822 lines), about 2,300 test cases by count of `it`/`test` calls; 25 browser acceptance scripts; the smoke, report-stress, inventory and two-device sync harnesses | `src/**/__tests__`, `scripts/` |
| Local store | IndexedDB version 20, **27 object stores** | `src/db/core.ts` (`AppDB`) |
| Sync | **20 synced kinds**. The engine is generic over a mapper table: a server-assigned `rev` cursor, writes checked against the copy last seen, field-level merge for named object columns (`nested`), tombstones, media retry queues, refused and overwritten rows reported | `src/cloud/sync.ts` (1,292 lines), `src/cloud/mappers.ts`, `src/db/rows.ts` |
| Adding a record kind | A type, a store, an IndexedDB version, a mapper, an SQL table, row-level-security policies, the `rev` trigger, the schema test | the studies record was added this way |
| Methods | `PlanModel = 'board' \| 'tree' \| 'commissioning'`, derived from two booleans on `Project`; read in 19 files. `MODELS` describes each method in words only and drives no behaviour | `src/lib/planModel.ts` |
| Stage gate's step | One generic record, `Test`, with three faces (test · fix · install step): planned window, who, outcome, the day, findings, next steps, media, documents, what it follows on from. `gate` is `'setup' \| 'handover'`, and absent means Install | `src/lib/testing.ts` |
| Gates in the database | `tests_kind_check` (test · fix · install) and `tests_gate_check` (setup · handover) | `supabase/INSTALL.sql`, `supabase/GATES.sql` |
| **A method partly held as data already** | Each job keeps its own lists per gate (`installStages`, `gateStages.setup/handover/commission`), who each stage is usually with (`usualWith`), how it is answered (`usualAnswer`: done · paperwork · sign-off · programs · run) and what a test must show (`usualAgreed`). A job with none takes the list of the job edited most recently | `src/types.ts` (`Project`), `src/lib/install.ts` (`usualStages`, `answerOf`) |
| Gates block nothing | "Handed over" is computed when every machine reaches it, "whatever is still open; what is open is said". By design: an internal tool, not a wall | `src/lib/standing.ts` (handed over), `src/lib/install.ts` (`stillOpenOn`) |
| Tools | 10 tools in one `studies` table. Each tool's facts are JSON with a TypeScript shape of its own, and the tool list is also a check constraint. The arithmetic lives in tested pure modules. One tool's footprint: work sampling touches 31 files, SMED 65 | `src/lib/study.ts`, `src/lib/ie/*`, `src/lib/capacity*.ts` |
| 6M | Causes graded measured · counted · observed · reported; suspected · confirmed · ruled out | `src/lib/sixm.ts` |
| Problems | Four records **by decision**: register (`snags`), found on a job (`test_items`), the 6M problem (`cases`), timed stops (`observations`). BLUEPRINT §2: "Keep the four" | `docs/BLUEPRINT.md` §2 |
| Access | Owner · team · client per project, enforced by policies and a trigger. Membership functions match the signed-in email per line and per project. **No organisation or tenant**; one administrator email hard-coded in a SQL function; project ids are text, line ids are uuid | `src/lib/access.ts`; `supabase/SECURITY_RLS.sql`, `LINE_STUDY_ACCESS.sql`, `FRESH_START.sql` (`faultline_superadmin_email`) |
| History | Rows carry owner, created and updated times, and `rev`; overwritten edits are listed on the device. **No activity log** | `src/cloud/sync.ts`; no such table in `supabase/` |
| Reports | A real layout engine: blocks that measure themselves, poured into pages. One page model drawn on screen and paper. About 35 report modules, each written for its own page | `src/lib/report/flow.ts`, `blocks.ts`; `src/lib/lean.ts` (`LeanPage`) |
| Figures | Every computed figure can carry its sum in words, its period, its sources and its confidence | `src/lib/intelligence/figure.ts` |
| Ask | Supabase edge function, model `claude-haiku-5-5`. Sends only figures made by tested functions; signed-in users only. Its cache and its "20 an hour" limit are held **in the memory of one function instance** (a `Map`): they reset on a cold start and are not shared, so they are not a budget | `supabase/functions/ask/index.ts` |
| Voice | Vercel route, Gemini Flash. When the free tier's 429 comes back it moves to the next free model. A JSON schema per form; proposal only; signed-in only | `api/voice.ts` (`FORMS`, `generate`) |
| Wording | Vercel route, Claude through `@anthropic-ai/sdk`, **default model `claude-opus-5-5`**, else free Gemini | `api/wording.ts` |

### The earlier review, checked

| Earlier claim (`docs/AI-VISION.md`) | Verified |
|---|---|
| 461 files, ~107k lines | **Correct** |
| 63 screens, 105 UI parts, 178 logic modules | **Close, not exact:** 62, 107, 213 |
| "54 object stores incl. indexes" | **Wrong: 27 stores** |
| 20 synced kinds | **Correct** |
| ~1,830 unit tests | **Undercounted:** about 2,300 test cases by static count. Not run in this review: a full run did not finish within 10 minutes here (the gate runs it) |
| Ask: Claude Haiku class, facts only, 20 an hour | **Correct, with a caveat:** the limit and cache live in one instance's memory |
| Wording: Claude, else Gemini | **Correct, with a cost problem:** it defaults to the largest current Opus to rewrite one sentence |
| "Claude SDK in the app" | **Inaccurate:** a dependency used only by the `api/wording.ts` server route, not the client |
| Voice sends audio to Gemini, proposal only | **Correct** |
| No audit trail | **Correct** |
| `offerUndo` exists; `Figure` with sources and confidence; cause grades | **Correct** (`offerUndo` in 50 files) |
| "One thing, several records" as debt | **Partly:** a job's line in `pace_ppm` beside the factory line is debt (BLUEPRINT Stage 4); the four problem records are a recorded decision, though one that matters to a generic runtime |

---

## 3. Reusable capabilities and hard-coded limits

| Capability you listed | What exists today | Verdict |
|---|---|---|
| Projects, workspaces, assets, contexts | Lines with type, floor order, shifts, crew, rates and margin; machines in flow order with makers and programs; projects on lines | **Reuse.** Add organisation and site above lines |
| User-defined methodologies | Per-job gate lists and per-stage settings, handed from job to job; methods described in words | **New definition layer.** `gateStages` is its first import |
| Stages, tasks, dependencies, gates, completion | `Test` is a strong generic step (window, who, outcome, follows-on, overlap allowed, evidence, findings, actions). Completion is computed per method; gates never block | **Reuse the step's design; new gate conditions held as data, and an evaluator** |
| Dynamic forms and data capture | None. Every form is a written screen; voice holds one schema per form | **New:** a field palette and one renderer |
| Evidence, observations, measurements, documents, photos | Media and documents on records, marked photos, the filmed walk, readings struck never erased, graded causes, sourced figures | **Reuse;** generalise into "evidence required" |
| Decisions, risks, causes, tests, actions, approvals | Causes, tests, fixes, actions, sign-off (who signed and what was still open), problem priority and risk. No decision record | **Reuse;** add decisions |
| Roles, responsibilities, permissions, sign-off | Three access levels per project; each stage with the supplier or the site | **Reuse levels;** add named responsibilities inside a definition and organisation roles |
| Calculations, measures, validation, business logic | Tested pure modules: capacity, losses, line balance, SMED, sampling, capability, cost | **Reuse as registered functions;** add a small, safe arithmetic evaluator for simple derived fields |
| Reports, exports, dashboards | Layout engine, `LeanPage`, XLSX export | **Reuse;** add a report built from a definition |
| Connections to external systems | XLSX import and export, share links. No connectors | **New, later** |
| Conversational interaction, typed and spoken | Ask, voice into a form, wording | **Consolidate behind one gateway** |
| Persistent context and change history | `rev`, timestamps, the sync trace. No activity log, no versions | **New** |
| Offline and sync | A generic, proven engine | **Reuse;** definitions become one more synced kind |

**The hard-coded limits that matter:**

1. The method is two booleans, and behaviour switches on it in 19 files.
2. Gate names are fixed in TypeScript and in a database constraint (45 files).
3. The tool list is fixed in TypeScript and a constraint. Each tool has its
   own screen, module, report and acceptance script.
4. Every form is hand-written; no field exists as metadata.
5. Gates never block, and "done" is computed separately for each method.
6. Roles are three access levels; a definition cannot name responsibilities.
7. There is no organisation, and one global administrator is written in SQL.
8. Each AI route chose its own provider; there is no shared budget, usage log
   or evaluation set.

---

## 4. The four options compared

| | **A. Evolve as is** | **B. Same engine, new experience** | **C. Platform core, in place** | **D. Rebuild** |
|---|---|---|---|---|
| What is preserved | Everything | Records, arithmetic, sync, reports | Stack, sync, auth, report engine, arithmetic, native methods and their acceptance scripts | Ideas and documents only |
| Main change | More configurable lists on the three methods; an assistant on top | A new conversational and generic interface over the same fixed records | Definition layer, runtime, operations, AI gateway, activity log; organisations before customer two | Everything |
| Data migration risk | None | Low | Low at first (additive tables); moderate later, and opt-in, when a native method converges | High: every live record re-homed |
| Offline and sync | Unchanged | Unchanged | Definitions sync like any record; the runtime is pure and runs on the device | Rebuilt, and every bug in "Things that will bite" paid again |
| Auth, permissions, tenancy | Unchanged, still single-owner | Unchanged | The existing policy pattern extended; organisations added | Redesigned from nothing |
| Reports and manufacturing tools | Unchanged | Kept, but screens rewritten | Unchanged, plus reports from definitions; tools become components | Re-implemented |
| Tests and regression | Existing net holds | Most acceptance scripts break (they read sentences on screens) | Existing net untouched; the new runtime needs its own heavy testing | Lost |
| Maintenance | Methods keep multiplying in code | Two interfaces for a while | Two kinds of method (native and defined) for a while | One codebase, eventually |
| Time to a useful release | Shortest | Long | Medium | Longest |
| **Reaches the vision?** | **No** — a new method is still new code | **No** — a new interface cannot make a new methodology exist | **Yes** | Yes, much later, at the highest risk |

**A** is the right way to keep the native methods healthy. It is not a route
to the platform: user-defined methodologies stay impossible, and the AI can
only fill forms that already exist.

**B** spends the largest interface cost of any option (62 screens) and still
misses the core requirement. The records stay fixed, so the generic interface
ends up hard-coding the same three methods a different way. Its good part, a
conversational front door, belongs inside C.

**C** adds the one missing layer and leaves the working product alone while
it is proved. A variant, a separate platform service with Faultline as its
client, is rejected: it duplicates sync, auth and reports, and gives one
developer two codebases where the existing engine is already the right shape.

**D** would be justified only if the stack blocked the vision. It does not.
The problem is methods written in code, not the technology. A rebuild throws
away:

- 107,000 lines that encode what the floor taught you, with your reasons in
  the comments;
- 25 acceptance scripts;
- a sync engine proved across ten two-device scenarios;
- the report engine.

It would then meet every failure those already paid for. It reaches a useful
platform later than C, not sooner.

---

## 5. Recommendation

**Option C, inside this repository and stack.** The reasons, from the code:

1. **The stack is not the bottleneck.** The sync engine is generic over its
   mapper table. The policy pattern, the report engine, `LeanPage` and
   `Figure` are already general.
2. **The bottleneck is specific and bounded:** methodology as data, and a
   runtime. That is new work in every option; in C it is additive.
3. **The best seed already exists.** `gateStages` is a methodology template
   in miniature, handed from job to job. `Test` is a generic step. Sign-off
   already records who signed and what was still open.
4. **It protects the working product.** The stage gate is in daily use on
   your job. Built alongside, the proof of concept carries no risk to it.
5. **It keeps the moat.** Existing tools as components give a generated
   methodology real instruments (a performance run judged against what was
   agreed, a capability study, Line capacity, the loss count) where
   competitors give a checklist.

While Phases 0–4 run, I recommend freezing new native features. Keep fixes,
the programs audit you put on hold if you want it shipped, and BLUEPRINT
Stage 4 only if the runtime needs lines and machines read from the factory.

---

## 6. The target architecture

```
+------------------------- DEVICE (PWA, works with no signal) -------------------------+
|  Surfaces: conversation, definition review, run view, step drawer, tools, paper      |
|        | reads                                   | the person confirms               |
|        v                                         v                                   |
|  RUNTIME (pure) <-- DEFINITION (versioned)   OPERATIONS (typed, validated,           |
|  stages, gates,          ^                   permission-checked, previewed,          |
|  outstanding, why        |                   undo, logged)                           |
|        ^                 |                           | writes                        |
|        |      COMPONENT REGISTRY                     v                               |
|        |      (existing tools: capacity,     IndexedDB: records + definitions        |
|        |       losses, SMED, run, 6M ...)            |                               |
|        +----------------- records <------------------+                               |
+--------------------------------------------+-----------------------------------------+
     sync (rev-checked, policies) ^ v        | compact context + request, signed in
+------------------------------- CLOUD ------+-----------------------------------------+
|  Postgres + row-level security: records, method_definitions, activity_log, orgs      |
|  AI GATEWAY (one edge function): session, data policy, budget, usage, prompts        |
|        +--> Claude API (schema-constrained output; proposals only)                   |
|  CONNECTORS (later, engineered): scoped imports, credentials server-side, dry run    |
+--------------------------------------------------------------------------------------+
```

### 6.1 Definition

A versioned JSON document, typed in TypeScript, with a JSON Schema generated
from the same source. The validator uses that schema, and so does Claude's
structured output. It holds:

- **identity:** name, purpose, version, the definition it was adapted from,
  schema version;
- **context:** what it runs on (a line, its machines, a product);
- **roles:** named responsibilities ("OEM fitter", "Site engineer",
  "Production manager"), mapped to people when a project starts;
- **stages:** in order, each with its key, name and purpose;
- **step templates:** title, once or per machine, responsible role, due
  offset, answer shape (done · paperwork · sign-off · run · measurement ·
  form), and fields from a fixed palette (text, number with unit, date,
  choice, yes/no, person, photo, file, reading against limits);
- **evidence required:** type, how many, the lowest grade accepted;
- **gate conditions, from a closed set:**
  - every step done;
  - evidence present;
  - signed off by a role;
  - a figure meets a threshold;
  - no open problem of a given priority;
  - a component's verdict passed;
  - a date reached;
  - a manual check with a reason.

  Each condition is set to **block** or **warn**. An owner override needs a
  reason and is logged;
- **calculations:** by reference to registered, tested functions, or a small
  safe arithmetic expression over the definition's own fields (no code, no
  network);
- **report:** sections by reference to existing report blocks;
- **components:** slots that place a registered tool in a stage, with its
  inputs bound and its outputs usable in conditions.

It is stored in a `method_definitions` table: organisation, name, version,
status (draft · active · retired), definition, parent, created by, approved
by, `rev`. It becomes one more synced kind. **An active version never
changes; any change is a new version.** A project pins
`{definition, version}` in one new nullable column, and the native methods
keep their booleans.

### 6.2 Runtime

A pure module (`lib/flow`). From a definition, the records and today, it
returns:

- each stage's state and progress;
- each gate: open or not, and every condition with whether it is met, why,
  and whether it blocks;
- what is outstanding (what, whose, by when, why);
- what is next;
- a verdict sentence.

The same function serves the screen, the paper, the assistant's context and
the server's re-check of an approval: an edge function can import the same
TypeScript. The step-tone rules of `lib/install.ts` (late as a separate fact
from a problem) become its step reading. Property tests check invariants
over random definitions and records. For example, no gate opens while a
blocking condition is unmet, and removing evidence never opens a gate.

### 6.3 Execution records

For the proof of concept, a new `flow_steps` table, shaped like `Test`:

- planned window, responsible person, outcome, the day;
- values checked against the step's fields;
- media and documents;
- stage, step, machine, definition version.

Problems raised from a step go to the existing problems register, which
already shows in the control room. Sign-off stays an answer on the step, as
it is on the stage gate.

Reusing `tests` with a fourth face was considered and rejected *for now*.
Readers across projects (the control room, Needs you, the portfolio) would
pick the new steps up and misread them. Isolate first; converge once parity
is proved.

### 6.4 Component registry

Each existing tool registers:

- what it produces, as typed outputs (`run.metAgreed`,
  `capability.cpk`, `capacity.bottleneckRate` as a `Figure`,
  `losses.lostPacks`);
- what it needs (a line, a product, a machine);
- how to open it on a context;
- its report block.

That is a thin adapter per tool, about one file each. No tool is rewritten.

### 6.5 Operations

One registry, used by the screens and by Claude alike. The model has no
other way in. It starts with:

- `createDefinitionDraft`, `editDefinitionDraft` (patches),
  `approveDefinition`;
- `startProject` (definition, context, people), `completeStep`,
  `recordValue`, `attachEvidence`, `signOff`, `raiseProblem`;
- `proposeDefinitionChange`, `migrateProjectToVersion`, `recordDecision`;
- read-only: `getProjectState`, `listOutstanding`, `getRecord`.

Each operation has:

- a JSON schema;
- validation against the current state;
- a permission check (the levels of `lib/access.ts`, plus the definition's
  roles);
- a preview shown as a diff;
- an apply that writes through the existing `db` functions with the person's
  own session;
- an undo where the change is reversible (the existing `offerUndo`);
- an entry in the activity log.

### 6.6 AI gateway

One Supabase edge function (`assist`), on Ask's pattern. It:

- checks the session;
- builds context only from what the caller may read: it queries with the
  caller's token, so the policies apply, and never with the service role;
- applies the data policy;
- calls Claude with schema-constrained output;
- checks that output's schema again;
- returns proposals, never writes;
- records the tokens, cost, person and organisation in a usage table;
- enforces a budget held in the database, not in memory.

Prompts and tool schemas are versioned in the repository, and the model for
each task is configuration. Ask and wording move behind the gateway.

Models, at current list prices per million tokens in and out:

- **designing a methodology:** Claude Opus 5.5 ($4 / $20) — rare, and worth
  the quality;
- **questions and change proposals in a project:** Claude Sonnet 5.5 ($2 /
  $10) or Claude Haiku 5.5 ($0.10 / $0.50), chosen by measured quality;
- **rewording and structuring:** Haiku 5.5.

The building-block catalogue is large and never changes, which makes it the
ideal prompt-cache prefix. Work that is not urgent can use the Batch API at
half the price.

**Voice:** the Claude API reference documents text, image and PDF input; I
found no audio input. So voice keeps a transcription step (in the browser on
the device, or a paid speech-to-text service on no-training terms), and
Claude structures the text.

### 6.7 Activity log

An append-only table:

- organisation, project, who, when;
- the operation, what it touched, and the change;
- the source (a person, or a proposal accepted by a person), with the
  proposal and model.

Members may add to it and read it; nobody may change or delete it. It is
written through operations. With no signal, entries queue like any row, and
because nothing is ever updated there are no conflicts.

### 6.8 Organisations

Organisation → site (factory) → lines, with organisation roles (admin,
member). Project levels stay as they are. Definitions belong to an
organisation and can be published to its library. The administrator moves
from the SQL constant into an organisation role. The data that exists today
becomes one organisation.

### 6.9 Connectors (later)

Engineered connector types, registered in code:

- spreadsheet import (it exists);
- pull from an approved API, with its credentials kept on the server;
- reports sent out by email.

An administrator switches each one on, with a scope (which measures it may
write), a basis on everything it writes (*imported from X at time T*), and a
dry run before the first write. Claude can *ask* for a connection, as an
operation an administrator approves. It cannot make one.

### How the parts work together

"Build me a commissioning methodology":

1. The conversation goes to the gateway.
2. Claude returns either questions or a definition draft, in the schema.
3. The server checks the schema; the device checks the meaning with the
   validator, which runs with no signal, and draws the review.
4. You edit the draft and approve it. Only an owner can; the approval is
   logged.
5. `startProject` creates the project, and the runtime draws the run view.
6. Steps are done on the floor, with or without signal.
7. Sync carries them up, the runtime re-reads the state, and the server
   re-checks every approval. An approval made offline against a state that
   changed meanwhile is flagged, never silently lost.

---

## 7. The proof of concept

**Why commissioning**, against the alternatives:

- **Commissioning** has the richest step semantics in the app, part of its
  definition is already data, there is a native version to compare against,
  and you are a real user on a live job. It proves the central claim: a
  definition becomes an executable workflow with enforced gates.
- **A 6M investigation** is less structured (causes and hypotheses), so
  configurability is harder to show. It is a good second.
- **New product introduction** would show reach beyond manufacturing tools,
  but there is nothing to reuse.
- **A capacity tool built from a prompt** is the hardest claim of all (new
  arithmetic and new interface). It is the wrong first proof.

**The journey:**

1. *"Create a commissioning methodology for a new production line — a tray
   sealer and a case packer from two OEMs, handover in six weeks."*
2. Claude asks three to five questions: which acceptance tests are in the
   contract; who signs each gate; whether a performance run is needed, at
   what rate and for how long; whether there are site safety sign-offs
   (PUWER).
3. It proposes a readable plan:
   - stages (for example Delivery and positioning, Mechanical and services,
     Controls and I/O, Set up and programs, Performance acceptance,
     Handover);
   - steps per machine, with responsible roles and required evidence;
   - gate conditions, each marked block or warn;
   - the existing tools it uses (the performance run, the capability study).
4. You edit and approve it, and version 1 becomes active.
5. A project starts from it on Line 7, with the machines from Your factory
   and people mapped to roles.
6. On a phone with no signal, steps are done, photos attached, readings
   taken and sign-offs given. Gate 3 refuses to open without "I/O sheet
   signed by Site engineer" and says why. An owner override asks for a
   reason.
7. *"What's outstanding before performance acceptance?"* is answered with
   exactly the runtime's outstanding items, each one linked. *"Add a 72-hour
   reliability run to performance acceptance and make handover depend on
   it"* becomes a proposed change, validated and shown as a diff, then
   applied as version 2. The running project is offered the move: completed
   steps kept, the new step added, the new condition in force.
8. The activity log shows every change: who made it, when, and whether it
   began as a proposal. A report is produced from the definition and the
   state.

**What is reused:**

- the sync engine and mapper pattern;
- the policy functions and access levels;
- media capture, photo marking, and sign-off as it works today (who signed,
  what was open);
- the report engine and `LeanPage`;
- the step-tone rules of `lib/install.ts`;
- Your factory's lines and machines;
- the problems register;
- `Figure` and `offerUndo`;
- voice's per-form schema pattern;
- Ask's edge-function pattern.

**The minimum that is new:**

- the definition schema and validator;
- the `method_definitions`, `flow_steps` and `activity_log` records;
- the runtime;
- about ten operations;
- the `assist` gateway with three prompts (design, questions, change);
- five surfaces (conversation, definition review and editor, run view, step
  drawer, gate panel) and one report;
- component adapters for the performance run and the capability study only.

**Not in the proof of concept:** organisations, connectors, tool creation,
6M or the lever tree on the runtime, converting the native stage gate,
learning from outcomes.

**How success is tested:**

- **An acceptance script for the whole journey**, with Claude's answers
  recorded so it runs the same way every time in the gate, plus a live-model
  run outside it.
- **A parity test:** today's stage gate (four gates, its lists, five answer
  shapes), written as a definition, validates, and the runtime says where
  each machine is on the seeded job exactly as `lib/install` does. This is
  the best single evidence that the vocabulary is big enough.
- **An evaluation set** of 20–30 methodology requests (variants, adaptations
  for another site, deliberately vague asks), scored on: validates, asks no
  more than five questions, includes the gates and evidence it should,
  invents no tool. Run on every change of model or prompt.
- **Grounding:** for 30 questions about a project, every item the assistant
  names exists in the runtime's state, checked automatically; when something
  is not recorded, it says so.
- **Gates:** a blocking condition cannot be passed on the device, and an
  offline approval synced against a changed state is flagged.
- **Permissions:** team cannot approve a definition or a change, and client
  cannot write — enforced by the database, not just the screen.
- **AI off:** a definition built by hand in the editor runs the whole
  journey.
- **No regression:** every existing gate script passes unchanged.

---

## 8. Roadmap, ordered by value and risk

| Phase | What it delivers | Exit test |
|---|---|---|
| **0 · Decisions and ground** | The decisions in §10; a written data policy; the gateway skeleton with a usage table and a budget held in the database; wording moved to Haiku 5.5; the activity log table | Ask and wording behave as today behind the gateway; usage is visible |
| **1 · Definition and runtime, no screens** | Schema, validator, runtime, property tests, the parity test | **The parity test passes.** The biggest technical risk is retired first, and cheaply: if the vocabulary cannot express the stage gate, stop here |
| **2 · Run a definition by hand** | The records, their policies and their sync; the editor, run view, step drawer, gates (block · warn · override); the report; a two-device sync scenario | A commissioning definition built with forms runs end to end on a phone. Useful on its own: a site can write its own method |
| **3 · Design by conversation** | The design prompt with the cached catalogue, questions, schema-constrained output, review and approve | Journey steps 1–5 |
| **4 · The assistant inside a project** | Answers grounded in the runtime; changes proposed as operations; versions and moving a project to a new one; the activity log on screen | The full journey, 1–8: **proof of concept complete** |
| **5 · Components** | One adapter at a time: Line capacity, the loss count, SMED, problems, the 6M fishbone; conditions over their outputs | Each adapter's own acceptance check |
| **6 · Organisations and library** | Tenancy, sites, admin roles; a definition library; "adapt this for another factory" as a child definition with its differences shown | Two organisations cannot see each other's data, proved by the database |
| **7 · Connectors** | Spreadsheet imports with their basis and a dry run; then approved APIs | A dry run shows what would be written before anything is |
| **8 · Learning** | Outcomes tagged; definitions ranked by results; suggestions from the library | Counts can be reproduced by hand |
| *Later, optional* | Native methods moved onto the runtime only when parity and their acceptance scripts allow | Their scripts green on the runtime |

**Time:** Phases 0–4 look like roughly six to ten working weeks at the pace
in the repository's history (711 commits in 17 days, a 30-minute gate). The
runtime is a new kind of code for this app, though, so treat that as a
range, not a commitment. Phase 1 is where the estimate gets tested.

---

## 9. Security, data integrity, cost, reliability, maintenance

**Security**

- **Keys** stay on the server, as now.
- **Context:** the gateway reads with the caller's token, so the policies
  bound what the model can see. It never uses the service role for context
  or writes.
- **Prompt injection.** Record text (a problem, an OEM document) may contain
  instructions. The model can only return proposals in a schema; operations
  are checked against the state and the person's permissions; consequential
  ones need approval; record text is sent as quoted data. No path writes
  without a person.
- **A definition behaves like code.** A careless one could quietly drop a
  safety sign-off. So:
  - an organisation can mark controls as **protected** (PUWER sign-off, for
    example), which an adapted definition cannot remove without an
    administrator;
  - a removed control shows in red on the diff.
- **The formula evaluator** does arithmetic only: no code, no network.
- **Connectors** get the least scope they need, credentials on the server,
  administrator approval and a log.
- **The hard-coded administrator email** becomes an organisation role.

**Data integrity**

- An active definition never changes. A project pins a version, and moving it
  to a new one is explicit, with a statement of what changes.
- One runtime reads the state for the screen, the paper, the assistant and
  the server.
- The activity log is append-only.
- Every statement carries its basis (known, calculated, inferred, unknown).
  Model text becomes a fact only when a person accepts it with its source.
- Drafts belong to their owner. The existing writes checked against the last
  copy seen keep two devices from losing each other's edits.

**API cost** (list prices per million tokens, October 2026; illustrative,
not measured):

- **Designing a methodology** on Opus 5.5: about 30k tokens in (mostly the
  cached catalogue) and 10–20k out, thinking included. Tens of cents a design.
- **A question about a project** on Haiku 5.5: about 3k tokens in and 500 out
  is a twentieth of a penny. On Sonnet 5.5, about a cent.
- **The real risk** is unbounded loops and oversized contexts, not the price
  of one call. Hence a budget held in the database, no autonomous loops, and
  compact contexts.
- **Fix in Phase 0:** wording uses Opus 5.5 to rewrite one sentence. Haiku 5.5
  costs one fortieth as much per input token.
- **Confirm before any customer data is sent:** Anthropic's current terms on
  training and retention for your account, whether zero data retention is
  available for the models chosen, and where inference runs (the API offers a
  data-residency setting).

**Reliability**

- With AI off, everything works through forms, and the gate tests that.
- Model output is checked twice, failures are shown, retries are bounded and
  every call has a timeout. A refusal from the model falls back to the form.
- Models are pinned in configuration. The evaluation set runs on every model
  or prompt change.

**Maintenance**

- The runtime and the schema become the core, so they get the strictest
  tests: property tests, the parity test, the evaluation set.
- Keep the vocabulary **closed and small**. Add a building block when a real
  definition needs it, each with its own test.
- Definitions carry a schema version, with upgrade functions.
- Native and defined methods will coexist for a while. That is a real cost;
  converge on purpose, not by drift.
- For one developer working with AI, the 30-minute gate grows. Split it into
  a fast check on every push and the full gate before `main`.
- BLUEPRINT gains a platform layer. CLAUDE.md's "a fifth concept is almost
  always the wrong answer" needs an explicit exception for the new records.

**Commercial, candidly**

- "Describe any workflow and AI builds it" is a crowded claim. It is made by
  general work-management and no-code platforms, and in manufacturing by
  connected-worker and frontline-app platforms. For a one-person product,
  generic plus AI alone is weak.
- Faultline's strength is narrower and deeper: method knowledge, evidence
  integrity, deterministic arithmetic, capture on the floor with no signal,
  and a control room across every change. So I would position it as *the
  control room for operational change: describe the change, and Faultline
  builds the method with the controls a good engineer would insist on.* The
  general architecture keeps quality, maintenance, new product introduction
  and safety open as next domains.
- A second customer needs tenancy, onboarding, support and data-processing
  terms. Most of that is not code.

---

## 10. Decisions that need your approval before anything is built

1. **Direction:** option C inside this repository and stack. No rebuild; the
   native methods stay as they are until parity is proved.
2. **Positioning:** configurable operational change, manufacturing first
   *(recommended)*, or a general-purpose workflow platform.
3. **Proof of concept:** a user-defined commissioning methodology on a new
   runtime *(recommended)*, or definitions compiled into today's four-gate
   stage gate (faster, but proves much less).
4. **Records:** four new records (`method_definitions`, `flow_steps`,
   `activity_log`, later organisations), as an explicit exception to the
   "fifth concept" rule.
5. **Gate policy:** block or warn per condition; owner override with a
   logged reason; offline approvals allowed and re-checked on sync
   *(recommended)*, or approvals only with signal.
6. **AI provider and budget:** Claude as the only conversational provider,
   with a model per task (Opus 5.5 to design; Sonnet or Haiku 5.5 to assist),
   and a monthly budget figure from you.
7. **Voice:** keep a transcription step (on the device, or a paid
   speech-to-text service on no-training terms) and retire Gemini's free
   tier. Which one?
8. **Data policy:** what may be sent — project text, machine names and
   figures; people's names? photos? — and the retention, zero-retention and
   region terms required.
9. **Integrations:** allow approved business-system imports (ERP, MES,
   spreadsheets) with their source recorded, while keeping "no machine
   sensors"? Or open sensors later?
10. **Tenancy timing:** organisations before the second customer
    *(recommended)*, not before the proof of concept.
11. **The current backlog:** freeze new native features during Phases 0–4.
    Keep fixes; ship the programs audit (on hold) only if you want it; do
    BLUEPRINT Stage 4 only if the runtime needs it.
12. **The bar:** agree the success tests in §7 as the go or no-go for
    Phase 5 onwards.

*Nothing will be built until you approve. Phase 1 is the cheapest place to
learn whether this plan is right: if the definition vocabulary cannot express
today's stage gate, the plan changes before any screen is drawn.*
