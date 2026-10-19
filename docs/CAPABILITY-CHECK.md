# Faultline — capability check against the code (19 October)

Rowland, 19 October: *"I want to understand whether we're building the right
kind of product, not just whether individual features work ... Our ambition is
for Faultline to be an AI-driven manufacturing platform that can design and
create new tools, methodologies and project systems from plain-English
requests, then execute them as working software."*

Every item below was checked against the code, its unit tests and the
browser scripts that drive the real app (`scripts/acceptance/`). The ratings:

- **WORKING** — implemented, and shown by a test or a script that drives it.
- **PARTIAL** — some of it works; the whole capability does not, said what is missing.
- **MISSING** — not built.
- **NOT APPLICABLE** — not needed, with the reason.

**One caveat runs through every item that involves Claude.** Every
browser demonstration of the AI path uses *recorded* answers — written in the
exact format the AI gateway returns — because a live call needs a signed-in
person. The gateway itself is deployed (version 3), its key and its daily
allowance are set, and an anonymous call is refused as it should be; but **a
live proposal from a signed-in person has never been seen.** Those items are
rated on what is proven, and the live call is gap 1 below.

## What Faultline is, in plain terms

There are three kinds of software that are easy to confuse:

1. **A conventional application with AI features** — screens a programmer
   built for each job, with a chat box added. The AI can talk, but it cannot
   change what the application does.
2. **A configurable workflow engine** — the application reads a *description*
   of a process (stages, steps, forms, approvals, calculations) and runs it.
   New processes need no programmer, only a new description — but the
   description can only use the parts the engine already understands.
3. **An AI application builder** — the AI writes actual program code, which is
   then run. Anything is possible in principle; nothing is checked except by
   running it, and every request produces new, untested software.

**Faultline is the first two, with Claude as the designer of the second — and
deliberately not the third.**

- The stage gate, 6M, the lever tree and the specialist tools (Line capacity,
  SMED, the line balance, video studies and the rest) are hand-built screens:
  type 1.
- Beside them is a **methodology engine** (`src/lib/flow/`). A method is a
  *definition* — think of it as a recipe written in a strict format: its
  stages, steps, who does each, what is recorded (typed boxes, choices, timed
  and counted boxes, photos, files, logs of many entries), what each gate
  needs before it opens, what is measured before and after, and which of **25
  tested calculation blocks** work the figures out. The engine reads the recipe
  and runs it: the project's screens, its gates, its calculations and its
  report are all produced from it. That is type 2.
- **Claude writes recipes, never code.** It returns a structured document
  (`src/lib/flow/proposal.ts`), the app's validator checks it line by line
  (`src/lib/flow/validate.ts`), a person reviews and approves it, and only
  then does it run. When a request needs arithmetic none of the 25 blocks does,
  Claude says so as a *need for development* — it never fakes one — and a
  developer adds the block with its tests. The block is then available to
  every designer, every proposal and every report at once.

Why not type 3? Because a factory has to trust the numbers. A calculation
that decides whether a batch is legal, or what a change saved, must be the same
tested arithmetic every time — not code the AI wrote that afternoon. The
recipe approach gives most of type 3's reach (new methods, forms, gates,
measures and analyses from plain words) with type 2's safety: everything that
runs has been checked and tested.

```
 words ──► Claude (through the gateway: signed in, a daily allowance, key on the server)
              │  returns a recipe — structured data, never code
              ▼
           the validator ──► refuses in words what cannot run
              │
              ▼
           a person reviews, shapes it in conversation, approves it (version 1)
              │
              ▼
           the engine runs it ──► screens, data, evidence, gates, calculations, report
                                   │
 new arithmetic a recipe needs ────┘ said as a NEED ──► a developer writes ONE block
                                                          with its tests ──► available everywhere
```

## A. What have we actually built?

| # | Question | Rating | The answer, and the evidence |
|---|---|---|---|
| 1 | Conventional app with AI, workflow engine, AI app builder, or a combination? | **WORKING — a combination** | A conventional manufacturing application (native stage gate, 6M, lever tree, the tools) **plus** a configurable methodology engine (`src/lib/flow/`: `definition.ts`, `runtime.ts`, `validate.ts`) **with** Claude as its designer (`supabase/functions/assist`). Not an app builder: no generated code is ever run. |
| 2 | Create new tools and methodologies from plain English, or only configure predefined ones? | **WORKING** (live model unproven) | New ones, composed from the vocabulary — not templates filled in. Shown by `designed-tool.mjs` (short stops on a bagger, 30+ steps of a method nobody wrote), `methods-design.mjs` and today's `pack-weights.mjs`. Predefined library methods can also be used, copied or adapted. |
| 3 | A methodology that has never existed in the library? | **WORKING** (live model unproven) | `designed-tool.mjs` 1–2 and `pack-weights.mjs` 1–2: the proposal is a method no library entry holds, validated (*It can run*), approved and run. |
| 4 | New forms, fields, stages, dependencies, validation rules, approval gates, measurements and reports, dynamically? | **WORKING** (report layout fixed) | Stages, steps per line or per machine, ten field types with limits and *required* (`definition.ts` FIELD_TYPES), dependencies (`after`, cycles refused), steps needed only when a figure says so (`onlyIf`, `decision.test.ts`), sign-offs, eight gate conditions each *block* or *warn* with an owner's override and its reason, measures before → after against a target. The report is produced from any definition (`lib/flow/reportPdf.ts`, `view.test.ts`) — its **content** is dynamic; its **layout** is the house's lean page and is not designable per method. |
| 5 | New analytical functionality, or does that need conventional development? | **PARTIAL — by design** | Within the 25 blocks (count … Pareto, control chart, Cpk, Weibull reliability, Welch's before-and-after, one-way ANOVA, multiple regression, forecast, past-due register, free arithmetic in £, and today the three pack-weight blocks), any combination is configuration. **Genuinely new mathematics needs a developer**: one block with its tests (`analysis.ts` BLOCKS). That is deliberate — see the reasoning above. |
| 6 | Structured definitions, or generated code? | **WORKING — structured definitions only** | The gateway asks Claude for output held to the proposal's JSON schema (`proposal.ts` PROPOSAL_SCHEMA; the API's structured outputs), reads it with the app's validator on the server (`supabase/functions/assist/flow/` — the app's own files, kept word for word by `assist.test.ts`), and the device validates it again. Nothing the model writes is executed. |
| 7 | When a user requests something Faultline cannot do? | **WORKING** | The proposal carries it as a *need for development* — what, why, inputs, method, how it would be checked (`FlowDefinition.needs`) — shown on the proposal, on paper, and gathered on Methods under *What Faultline cannot do yet* with a brief to build it (`lib/flow/needs.ts`, `needs.test.ts`, `designed-tool.mjs` 1a, 8p–8r; `pack-weights.mjs` 1a, 5c, 6b). |

## B. How does the creation process work?

| # | Question | Rating | The answer, and the evidence |
|---|---|---|---|
| 8 | Describe → Claude asks questions → proposal → review → approve, before implementation? | **WORKING** (live model unproven) | The front door takes the words; the gateway's `clarify` task asks at most four questions, each with why it matters, tapped or answered in one's own words or left (`clarifyCore.ts`, `clarify.test.ts`); the design request carries only the answers given; the proposal is shown whole in the studio with the validator's verdict; nothing runs until *Approve*. `designed-tool.mjs` 0–2, `pack-weights.mjs` 0–2. With the assistant off, the same journey works by hand and the library closest to the words is offered (`front-door.mjs`, `pack-weights.mjs` 6d). |
| 9 | Is the approved design converted into a real, executable system? | **WORKING** | Approving makes version 1 of a `Method`; starting a project runs it through `runtime.ts` (stages, steps per machine, gates, verdict). No translation step — the definition *is* the system. `methods.mjs`, `designed-tool.mjs`, `pack-weights.mjs` 2–5. |
| 10 | Generated dynamically from definitions, or hard-coded screens? | **WORKING** (method projects); native methods hand-built | A method project's page, step sheets, log forms, entry tables, results, charts, gate sheets and report are drawn from its definition by one set of components (`src/ui/flow/RunParts.tsx`, `LogParts.tsx`). The established stage gate, 6M and lever tree keep their own hand-built screens — they predate the engine, are proven, and are left alone by rule (CLAUDE.md, rule 1). |
| 11 | Modify the design through conversation after creation, validated before applied? | **WORKING** (live model unproven) | *Change it with the assistant* sends the current definition and the request (`change` task); the change comes back as a new draft version with every change said (`lib/flow/change.ts`, `change.test.ts`), validated, kept as a draft and approved by a person. `methods-design.mjs` 5–5h. |
| 12 | Capture real data, execute rules, calculate, manage evidence, report? | **WORKING** | Typed, chosen, timed and counted boxes; logs with many entries, corrected and struck (never erased) with Undo; photos and files required before *Done*; readings outside their limits kept as *did not pass*; gates that block; every figure worked out by the blocks; the method report with every entry. `methods.mjs`, `designed-tool.mjs`, `pack-weights.mjs` 3–5. |
| 13 | Save, duplicate, adapt, version, reuse? | **WORKING** | Methods are versioned records (`Method`, `lib/flow/records.ts`); *Make a copy*, *Adapt it into a new method*, *Use it as it is*, find by a word; a library of twelve of Faultline's own. `methods-design.mjs` 9–10a, `library.test.ts`, `pack-weights.mjs` 6c. |
| 14 | An active project keeps its version when the template changes? | **WORKING** | A project points at one version; a new version is approved beside it, the project is told, and moves only when a person moves it — the effect said first, completed work kept, Undo offered. `methods.mjs` 10 ("the project still on version 1"), `methods-design.mjs` 5e–5h, `lib/flow/move.ts`. |

## C. Does the platform genuinely extend beyond existing tools?

| # | Question | Rating | The answer, and the evidence |
|---|---|---|---|
| 15 | A capability that exists nowhere in Faultline? | **WORKING** | Said as a need, never imitated; gathered on Methods with its brief (item 7). Today the route was walked again: pack weights against the law needed arithmetic no block did, and it was built as blocks (section E). |
| 16 | Identify the missing capability, tell it from what exists, and determine the code required? | **PARTIAL** | Claude is given the whole catalogue of blocks and tools (`assistCore.ts`, generated from the registries, so it is never out of date) and told to compose from them, and to say a need only for what none does. Each need becomes a brief naming the block's contract, where it goes and how it is proved (`needs.ts`). What is **not** automatic: the code itself — a developer writes it. Deliberately so. |
| 17 | A defined route to develop, test, validate and integrate new specialist capabilities? | **WORKING** | One registry entry plus its tests, and it reaches the editor, the validator, the assistant's brief, the screen and the paper with nothing else rebuilt — the platform's test of itself (`analysis.ts` header; PLATFORM-STATUS rows 11, 14, 17). Walked again today with the three pack-weight blocks (`packs.test.ts`, 16 tests). Then the full gate, then live. Larger specialist tools (video, Line capacity) plug in as *tools* a step can use (`lib/flow/components.ts`). |
| 18 | Combine existing specialist capabilities into new workflows without hard-coding each combination? | **WORKING** | A step names a registered tool (SMED, the loss count, capability, line balance, work sampling, value stream, Line capacity, video); the tool's own module reads its figures into the step, where gates and measures use them (`toolRead.ts`, `capabilities.test.ts`, `methods-design.mjs` 9e–11f). |
| 19 | Calculations, permissions, evidence and approvals validated by the app, not trusted from Claude? | **PARTIAL** | **Calculations:** only the blocks compute — Claude never supplies a number. **Permissions:** checked on the device (`operations.ts`, every write) and enforced by the database's row-level policies whatever the device does (`supabase/METHODS.sql`, ACCESS_LEVELS). **Evidence:** *Done* refused without its photo or file. **Approvals:** a gate passes by the runtime's reading of the records, and the database lets only an owner write a gate pass. **Missing:** the server does not yet re-run the runtime when a gate is passed, so a tampered device could record a pass the rules would refuse — the database would still only accept it from an owner. |
| 20 | Measured facts, calculated results, AI interpretations and unknowns told apart? | **WORKING** | A project's facts carry *known · worked out · not recorded* (`ground.ts`) and an assistant's answer that cites a figure it was not given is refused (`askCore.ts` checkAnswer, `ground.test.ts`); a video study says *measured · worked out · interpreted · not known* and *proposed — not measured* (`lib/video/study.ts`, `docs/VIDEO-DESIGN.md` D2); a need is never imitated. |

## D. Is the architecture appropriate?

| # | Question | Rating | The answer |
|---|---|---|---|
| 21 | React/TypeScript the right foundation, or Next.js? | **NOT APPLICABLE — keep it** | Faultline is an offline-first app for the floor: it keeps its data on the device (IndexedDB), syncs with Supabase field by field (`src/cloud/sync.ts`, proved by `sync-two-devices.mjs`), installs as an app, and does its arithmetic on the device so it works with no signal. Next.js's strengths — pages built on a server, server routes — are the opposite of that, and would add a server to run for no gain. The one piece of server code the AI needs is a Supabase edge function, which is where it already is. Moving would put at risk 30 browser acceptance scripts' worth of proven behaviour for nothing a person would see. |
| 22 | One extensible app, an app with specialist modules, or separate generated apps? | **WORKING — one app, registered modules** | One application whose engine reads definitions, with two registries that specialist work plugs into — calculation blocks (`analysis.ts` BLOCKS) and tools (`components.ts` COMPONENTS). Separate generated apps would split the control room ("one view above all changes") that is the product's reason to exist. |
| 23 | The boundaries between Claude, the engine, specialist code, the database and the UI? | **WORKING** | **Claude** proposes recipes and answers questions, through one gateway, and touches nothing else. **The engine** (`lib/flow`) validates and runs recipes; it is pure and shared word for word with the gateway. **Specialist code** (blocks, tools, video) computes, each with its tests, never inside a recipe. **The database** stores records and enforces who may write what. **The UI** draws what the engine says and writes through permission-checked operations. |
| 24 | How are definitions validated, versioned, executed, secured and tested? | **WORKING** (server re-check of gates missing, item 19) | Validated by one validator for every source — form, cloud and assistant — which rebuilds a definition field by field and drops anything unknown. Versioned as `Method` records (draft → approved → retired), projects pinned. Executed by one pure runtime (`runtime.ts`), held to the stage gate's own rules by 300 random jobs (`parity.test.ts`, 2,400 comparisons). Secured by the database's policies and the gateway's sign-in and allowance. Tested by 3,100+ unit tests and the acceptance scripts in every gate. |
| 25 | Complex specialist capabilities (video) without compromising existing functionality? | **WORKING** | Video studies were built as a tool beside the engine: their own record shape inside the existing studies table, their own module (`lib/video`), offered to a method's line-balance step through the tool registry. Every gate since has run all the other acceptance scripts unchanged and green. |

## E. The demonstration — a new requirement, end to end

**The requirement:** a food line packs 2 kg bags of potatoes. *How much product
do we give away over the weight on the bag, what does that cost a shift, do we
keep the legal weight rules, how low can the filler be set and still keep them
— and prove it.* This is everyday work on a packing line, and nothing in
Faultline did it: no tool, no library method, no calculation knew the law's
rules for packers.

**What it needed that did not exist.** UK packers selling by the ℮ mark keep
three rules (the Weights and Measures (Packaged Goods) Regulations 2006): the
average at least the nominal; no more than 2.5% of packs below the nominal
less its *tolerable negative error* (T1); none below twice that (T2). The
tolerable error comes from the Regulations' table. None of the 22 blocks did
this — so, by the route in item 17, it was built:

- **Three new blocks** in `src/lib/flow/analysis.ts`: *Pack weights — the three
  rules* (`emark`), *Giveaway* (`giveaway`) and *Lowest legal fill* (`fill` —
  the lowest average a filler can run at this spread and keep all three rules:
  the nominal, T1 + 1.96 spreads, or T2 + 3.72 spreads, whichever is highest),
  over the Regulations' table (`tneOf`, rounded up as the table says) and the
  normal distribution (`normalBelow`).
- **One general improvement the requirement exposed:** a figure the method
  cannot know — here the nominal on the pack — may be *typed on the floor*, in a
  box of the step, instead of being fixed in the recipe (`targetFrom` /
  `target_box`): in the engine, the validator, the proposal, the assistant's
  brief and the editor at once. Faultline never invents a number it cannot know.
- **Tested by hand-worked figures** (`src/lib/flow/__tests__/packs.test.ts`, 16
  tests): the table at every band and boundary; Φ at the points the rules use;
  each rule broken on its own; the lowest legal fill set by each rule; the box
  and its refusals in words; the round trip through the assistant's format; the
  library method's money a shift worked by hand.
- **Faultline's library** gains *Pack weights — legal, and no more given away
  than needed* — twelve methods now.

**The process, driven in a real browser** (`scripts/acceptance/pack-weights.mjs`,
in the gate from today):

| Step | What happened | Shown by |
|---|---|---|
| 1 Interpret and ask | The request typed at the front door; Claude's reading said back — *every bag weighed against the legal weight rules …* — and three questions, each with why it matters (the weight on the bag; bags a shift; who weighs). One tapped (2 kg), one written (4,800 on a 12-hour shift), one left. The design asked for with exactly the two answers given. | 0, 0a |
| 2 Design | A method: weigh 30 bags (a log with the three rules, the giveaway, the lowest legal fill, the money a shift and what could be saved); set the filler and Quality signs; weigh again, proved better. Gates on the rules, a measure before → after, and a need it could not meet — *the inspector's reference test on a whole batch* — said, not faked. | 1, 1a |
| 3 Review and approve | Shown whole with the validator's verdict (*It can run*); approved and started as a project. | 1b, 2 |
| 4 The working system | The project's page, steps, log form, boxes, gates and report all produced from the approved recipe. | 2–5 |
| 5 Sample data | 30 bags weighed; the nominal, the bags a shift and the cost a kg typed by the person — and until they were, the figures said *type it in "Nominal on the pack"*, never a guess. The filler set to 2,026 g, Quality's sign-off, 30 bags weighed again. | 3, 4 |
| 6 Validated calculations | Every figure on screen checked against the module's own answer on the same bags: legal on all three rules; **50.17 g given away a bag — £192.64 a shift** (50.17 × 4,800 × £0.80 ÷ 1,000, worked by hand); the lowest legal fill **2,023.5 g, set by rule 3** at a spread of 22.45 g — so **£102.47 a shift could be saved**. One bag corrected to 1,935 g: *breaks rule 3* and the gate **refused** — the arithmetic decides; a done log is locked until taken back. Corrected back: **29.1 g a bag, £111.74 a shift**, legal, and at least 95% sure less is given away (Welch's test against the first weighing). | 3a–4e |
| 7 Report | The method report read back: the rules, the proof, the money, the lowest legal fill, the need for development and every bag. | 5–5c |
| 8 Save, reopen | Reloaded: the project, its measure (50.17 → 29.1 g a bag, target met) and its figures the same; the method kept and the need gathered on Methods; copied for the next product; with the assistant off, the words alone offer Faultline's pack-weights method; fits a phone. | 6–6e |

**Outstanding, honestly:** (1) Claude's two answers in the script are recorded,
not live (gap 1); (2) the deployed gateway does not yet know the three new
blocks — it needs redeploying from the repository, which waits on the Supabase
connector (it did not connect in this session); (3) the inspector's reference
test is a stated need, not built; (4) the 1-in-10,000 margin under T2 is the
practical reading packers' guidance uses — Rowland to confirm it against his
Trading Standards guidance; (5) the method holds one product's nominal at a
time — another product is a copy with its own box.

## The recommendation

**The architecture is the right foundation.** It already does what the
ambition describes, in the way a factory can trust: plain words become a
method; the method is checked, approved, versioned and run; its numbers come
only from tested arithmetic; what it cannot do is said and becomes a piece of
work with a shape. Do not migrate frameworks and do not move to AI-generated
code — both would trade proven reliability for nothing a person on the floor
would gain.

**The most important gaps, in order:**

1. **The live AI path has never been seen working.** Everything is proven with
   recorded answers. One signed-in proposal, its `assist_usage` row read back,
   is the single most important proof outstanding — it needs Rowland signed in
   on the live app (five minutes), and the gateway redeployed with today's
   blocks first.
2. **Gate passes are not re-checked on the server.** The runtime is pure and
   already shared with the gateway; a small edge function (or a database
   trigger calling it) can refuse a pass the rules would refuse.
3. **The time from "need" to "block" is a developer's.** That is right, but it
   should be quick and visible: the brief exists; a tracked queue from need to
   live block, and Rowland's sign-off on the domain rules each block encodes
   (as today's T2 margin), would make it routine.
4. **Report layouts are not designable per method** — content yes, layout no.
   Leave this until a real request needs it.
5. **One library per person** — an organisation-wide library waits on
   tenancy.

**What I recommend doing next:** (a) ship today's work; (b) redeploy the
gateway and have Rowland run one live proposal — then the AI items above stop
being "recorded only"; (c) build the server re-check of gate passes; (d) keep
adding blocks only as real requests need them, by the route in item 17.
