# The test centre — one place to see, run and follow everything tested

Rowland, 26 October: *"We need to start planning for a test centre … all tests
run from a central location, and it presents itself as a full dashboard … a
project-connected system … it also allows a more advanced system connecting
tests, continuing using them."* And, going deeper: *"the page itself is the page
we want … when you're looking at a line, an asset, a program, we're able to
see everything, all the analysis that has been done under that branch."*

**Status: a design, for Rowland to decide. Nothing here is built until he says
go** (`docs/DIRECTION.md`). It is placed on the app as `docs/BLUEPRINT.md` §8
asks: which layer, which record, where it shows, what it replaces.

## 1. The verdict, and the sentence it lets someone say

**Worth building — as a lens over what the app already holds, not as a new
system.** The sentence it lets a person say that they cannot say today: *"Here
is everything we know about the Packer's program 5 — every test, study and
check, what each found, what is still owed, and what it proves — in one place,
and I can start the next one from it."* Today that is six pages: Programs,
Commission, the project's Tools, Check logs, Problems and the line standard.

It is **not** a seventh hub. It absorbs four (§7), or it should not be built.

## 2. What it is — and is not

- **A lens, never a record.** Like the Journey's range (`docs/JOURNEY.md`) and a
  project's Actions (`lib/projectActions`): *no new record, and no second
  count.* Every row is read from a record that already exists, by the rule
  that record already has, so the centre can never disagree with a page.
- **Not a test engine.** Tests are still run in their own tool's screen (the
  stopwatch, the pad, the watch). The centre **launches, queues and follows
  through** — it does not re-implement a tool.
- **Not a mock-up.** A count with no sentence under it is a gimmick (CLAUDE.md,
  24 September). The page starts with what it means, and shows the abnormal
  with its cause and its money.

## 3. The branch — what "everything under it" means

The page is opened **on a node**. The nodes, and the key each is joined by
today (read from the code, 26 October):

| Node | Record | Key |
|---|---|---|
| Factory | — | — |
| Line | `workspaces` | `workspaceId` |
| Machine | the line's list of **names** (`Workspace.assets`) + an `Asset` record joined **by name** | `workspaceId` + `machineKey(name)`; a job's machine by `assetId` |
| Program | `programs` | `programId` (carries `workspaceId`, `assetId`, products as text) |
| Product | **no record** — text on a program, a standard, a study | a normalised text |
| Project | `projects` | `projectId` |

It is **two axes, not one tree**: *place* (line → machine → program) and
*purpose* (project). A product is a cross-cut. So a node is opened with an
optional second lens — *Line 7 › Packer › Program 5 · in project "Line 2
install"* or *· everywhere*. A record **rolls up**: a program's test shows under
its machine, its line and the factory, counted once at each level.

### 3.1 The join is the risk — three findings

1. **A machine is joined by name, and a rename does not carry studies.**
   `renameLineMachine` (`db/lineRecords.ts`) carries stops, machine records,
   problems' `targetAsset`, Line capacity's stations and the line's list — but
   **not `ToolStudy.machine`**. Rename "Packer" and every capability study,
   reliability watch and check log filed against it falls off its branch.
   *This is a defect today (the line report and Line Talk read the same name),
   and it must be fixed before the centre exists.*
2. **A product is text.** "Express 1.25 kg" and "Express 1.25kg" are two
   products to a join. The centre normalises (`productKey`), and anything it
   cannot place goes to a visible **Not placed** bucket — a count that does not
   reconcile is worse than none (the rule for every count in this app).
3. **A study may be on nothing** (a quick session, "Not filed"). It is the
   maker's alone and appears only in their own *Not filed*.

Resolution order for a record's machine: `programId` → `assetId` → name.

## 4. One row, one state, one finding

Every record is adapted to the same row (`lib/testRows`, pure, one adapter per
kind of record, found through the catalogue's registry so **a new tool appears
without a change here**):

`what` · `tool` · `place` (line, machine, program, products) · `project` ·
`when` (booked / ran / closed) · `who` · `state` · `finding` · `tone` · `money` ·
`links` · `open`.

- **The finding** already exists for every study: `studyLine(s)` gives its
  sentence and tone, `owedOf(s)` the readings still owed. A test's is
  `programJourney`'s attempt text; a log's is its own due/failed line.
- **One state vocabulary on top of the records' own** — never replacing them:
  **Owed** (booked, set up, due, none taken) · **Under way** (readings coming,
  a watch running) · **Said** (a verdict exists; tone says good / watch /
  bad) · **Overdue** as a modifier. Colours are the five already agreed
  (CLAUDE.md, Visual management): red late or failed, amber waiting or due
  soon, violet under way, green done, grey not started.
- **Money** is one plain line from the one cost model (`lib/cost`), or the
  missing input named. Never summed across tools.
- **A test and the studies that prove it are one row with children** (a study
  lined up for a test by `uses` role *proof*). They are not two counts.

## 5. The page

The lean page (`docs/LEAN-PAGE.md`), in this order, on a node:

1. **Band** — *Test centre · Line 7 › Packer › Program 5 · Line 2 install ▾*;
   the lens chips (project · everywhere; a date range as the Journey has).
2. **The sentence** — what it means: *"Program 5 holds 60 ppm (Cpk 1.42, 25
   readings) but stops every 42 minutes (MTBF 42 min against 120 wanted):
   £185 a shift. 2 tests owed, 1 overdue."*
3. **Tiles** (counted *of*, and *since the last time*): Said good · Said bad ·
   Under way · Owed · Overdue.
4. **Run next** — the queue, ordered overdue → critical → planned day. Each row
   has one button (*Take the readings* · *Resume* · *Start*) that opens the
   tool already set to the node (line, machine, program, product, project). **This
   is "run tests from one central place".**
5. **What it found** — grouped by **the question asked**, not the tool: *Does it
   hold its speed? · Does it stop? · How many reject? · Is the standard met?*
   Each group lists its rows (latest first, earlier ones folded as the
   series). The questions are the catalogue's problem routes / the toolkit's
   steps (`src/catalogue/problems.ts`), so a toolkit is the frame and the
   centre is its reading.
6. **Planned against done** — the tools ticked on the Journey for this node
   (`pace_todos.tool`: *the tools we will use, and what for*) against the
   records made. *3 of 5 planned tools run.* The plan is not a new record: it is
   the Journey's tick.
7. **Connected** — for the row opened: *because of → this problem · proves → that
   fix · follows → this earlier test · next → the one offered*. Drawn as a small
   chain, never a force graph. Sources: `uses` (problem · case · cause · fix ·
   action · test; evidence · proof), `fromTestId`, `programId`, `standardId`,
   and the before → after pairing (`beforeAfter`).
8. **Series** — a tool used again at the same node on the same agreed question
   is one series: the latest, the trend (Cpk 1.1 → 1.4 → 1.42), and the pair
   before → after a fix. *This is "continuing using them".*
9. **Closing line** and **Report ▾** — the centre's one-page paper for the
   node (the same blocks the screen draws, `lib/report`).

Views of the same rows are **ViewTabs**, never a row of links
(`docs/STRUCTURE.md`): **List · Branch · Map**. *Branch* is the tree with counts
per node (red failed / amber owed) — a left column at a desk, a picker sheet on
a phone. *Map* pins each row's machine on the line's map; **built only when the
layout tool exists** (the line standard's board holds marks with positions — to
be checked whether machines are among them — and layout marking is a later
wave).

## 6. Where it sits — connect the dots

One component, `TestCentre node lens`, drawn wherever the node is:

| Where | What shows |
|---|---|
| The scope's own page (project, line, factory) | the whole page |
| A machine's page | the page on that machine |
| A program's row and drawer | its tests, studies and what they found (what Programs now shows, extended) |
| A line's page | its Tools view, upgraded |
| Needs you · Actions · Journey | read the same rows (their counts must reconcile) |
| Line Talk's knowledge of the line | later, read-only |
| The client report | the node's reading as an appendix; a client reads, never starts |

Access follows `useAccess`: *start* only for `can.edit`; a client reads. Rows
are what the device holds, so a client's rows are never there to leak.

## 7. What it replaces — and the rule for removing it

CLAUDE.md rule 1: nothing is removed until a replacement is proved and one
sentence says why it is better. The centre **absorbs**, in this order, each
only after a reconciliation test shows its counts equal the old page's:

1. The **Check logs hub** (`#/logs`) → the centre filtered to logs.
2. The project's **Tools list** → the centre's *by tool* grouping.
3. The **toolkits page** (W11, not yet built) → the centre's *by question*
   frame — built once, as the centre, not twice.
4. The Programs row's study list → the centre's program node.

The rail does not grow (factory 8, line 9, project 18 lines): *Test centre*
replaces *Tools* as the scope's page, with *By tool · By question · Queue* as
its ViewTabs. The page word **Tools** was agreed (STRUCTURE D5, "never
Studies"); renaming is Rowland's call (§10).

## 8. Layers and slices

```
lib/place        placeOf(record) → { line, machineKey, programId, products[], project }
                 branchOf(factory) → nodes with counts          (pure, tested)
lib/testRows     rowsOf(records, ctx) → TestRow[] — one adapter per kind
lib/testCentre   readingOf(node, lens) → sentence, tiles, queue, groups, planned-
                 against-done, series, chains, closing line      (pure, tested)
ui/TestCentre    the page — band, tiles, queue, groups, chain, series, ViewTabs
lib/report       the paper from the same reading
```

**No migration for T0–T2.** T3 may need one field (a repeat interval on a study's
agreement — check logs already have intervals); decided then, not now.

| Slice | What | Proved by |
|---|---|---|
| **T−1** | Carry `ToolStudy.machine` (and check-log entries) through `renameLineMachine`; a test that no kind is stranded by a rename | unit + `lines.mjs` rename step. *A defect fix worth doing on its own.* |
| **T0** | `place` + `testRows` for every kind, with the **Not placed** bucket | unit on every kind; **reconciliation tests**: row counts equal Needs you's owed, the Check logs hub's overdue/failed, the Tools counts, the Programs report's tests and studies |
| **T1** | The project's Test centre (the project is what he named): sentence, tiles, Run next, by question, branch, paper | `test-centre.mjs`: start from the queue, take readings, see the row move; the paper read back; phone; PAGES.md and the inventory; journeys none longer; still small at 30 lines / 50 projects |
| **T2** | The same component at machine, program, line, factory; absorb the hubs (§7) one at a time | each absorption's reconciliation + paper parity |
| **T3** | Series and trend, chains, planned against done, repeats | per piece |
| **T4** | Map view | after the layout tool |

## 9. Risks, said plainly

1. **The joins (§3.1).** If they are wrong the page is wrong quietly. Hence
   T−1, the Not placed bucket and the reconciliation tests *before* any screen.
2. **A seventh hub.** Mitigated only by §7. If the absorptions are not done,
   the centre has made the app bigger.
3. **A dashboard of counts** is a gimmick. The sentence, the queue and the
   abnormal-with-cause are the page; the tiles are not.
4. **The word *test*.** In the app a *test* is a commissioning test (plan · day ·
   found · next). If the centre is called *Test centre* and holds every tool use, the
   two meanings collide. Either the centre means commissioning tests only, or
   it is named for what it holds.
5. **Counting twice.** A program test and the study that proves it are one row
   with a child (§4); a roll-up counts once per level.
6. **Scale and phone.** Reading every record on the device is cheap at today's
   sizes; the 30-line / 50-project check (STRUCTURE §18) is part of T1's gate.
7. **Not AI.** Nothing here uses it (`docs/DIRECTION.md`).

## 10. Decisions for Rowland

1. **What is a "test" here** — commissioning tests only, or every tool use and
   log? (This design assumes every one, grouped by the question asked.)
2. **Name** — *Test centre*, or keep *Tools* as the page and *Test centre* its
   main view?
3. **"Continuing using them"** — the series (same tool again, trend, before →
   after), a repeat schedule, reusing a set-up, or chains — which matter first?
4. **"Locating graphics"** — a map of tests on the line? (This design says *Map*,
   T4, after the layout tool.)
5. **Plan source** — is the Journey's tool tick the plan the centre measures
   against?
6. **Absorb the Check logs hub, the project Tools list and the planned toolkits
   page** — yes, in that order?
7. **Fix the rename gap now (T−1)**, whether or not the centre goes ahead?
8. **Clients** — read the centre as an appendix only, or not at all?

---

# Part 2 — The trial: run it, change it, run it again (26 October, later)

Rowland, the same day, after the Programs report: *"when you're in this testing
phase, it's rather complex, especially if you're bringing in multiple tools …
I've done a test, okay, let me now make a change, run the same test again, and
the change is documented. There's none of that. All it stipulates now is some
testing, some numbers and fails … we need a more advanced system to run tests
… one home … and we hold a whole testing system … the technicality involved and
the expectations from businesses to understand what you ran, how it went, you
made a change, you reran it."* **A hypothesis, not a build** (`docs/DIRECTION.md`).

## 11. What the app already has — and the one thing it lacks

Read from the code, 26 October:

| Piece | Where | What it does |
|---|---|---|
| **The loop, in one function** | `lib/testing nextFrom` — *"the only thing in the app that creates work from work"* | A re-test follows a test (`fromTestId`) and carries the **expectation** (`passesIf`), the **aims** (`runAgreed`) and, for many products, the ones that did not pass |
| **Found → next → the next test** | `TestItem` kinds *found · next*, `becameTestId`, `fromItemId` | An observation becomes an action with an owner and a day, which becomes the next test or a fix |
| **A fix** | a `Test` of kind *fix* hanging off the test (`testOfFix`), a 6M countermeasure, a register problem's *journey* (what we did · what came of it) | **This is the "change"** — it has what, who, when |
| **Before → after** | `studyLinks beforeAfter` — a fix's *evidence* study against its *proof* study | Compares two runs of a tool, **only if `sameScope`**: same tool, same name, **the same agreed limits** |
| **A program's ladder** | `lib/programJourney` | Every attempt, its aim, what it did, how it went; the fastest pass |
| **A frozen record** | a closed study's receipt, *Reopen* with a reason | The figures stand as they were |
| **The trial card** | `lib/trialCardPdf` | One day on the line, whole, on a page |

**What is missing is the join.** Three facts, each checked:

1. **A re-test follows the *test*, not the *fix*.** `nextFrom` gives a fix and a
   re-test the same parent (`fromTestId: t.id`) — they are *siblings*. Nothing says
   "this run is the proof of that change". For studies that link exists
   (`uses` role *proof*, kind *fix*); for a program's test it does not.
2. **A re-run does not carry the measurements.** The expectation is cloned; the
   *studies* that measured it (their tool, question and limits) are not. So the
   second run starts by lining the tools up again, and `sameScope` is only as
   good as how carefully they were typed.
3. **Nothing records what was set.** *"Running 32 ppm at baseline settings"* is
   free text. The temperature changed from 160 to 170 is nowhere a number a
   comparison can read.

So today the app can say *"3 of 20 failed"* and *"before → after"*, but not *"Run 1
failed at 160 °C; we raised it to 170 °C (Dave, 27 Oct, because the seal was weak);
Run 2 passed — and nothing else changed."* **That sentence is the product.**

## 12. What a business expects of a test (the technical bar)

The disciplines that do this properly — equipment trials and factory/site
acceptance, validation (IQ/OQ/PQ), PDCA, A/B and one-factor-at-a-time
experiments — ask the same eight things. They are the acceptance criteria for
any "testing system" we call serious (`knowledge/STANDARD.md`'s bar, applied):

1. **A protocol agreed *before* the run** — what is tested, by which tool, on what
   machine, product and program; the pass criterion; how many readings and why.
2. **The conditions actually run** — planned against actual (the Test model already
   keeps these apart on purpose) — including the **settings**.
3. **The result against the criterion**, with how sure it is and what it cannot claim.
4. **A controlled change** — what was changed (setting, before → after), why, by
   whom, when, who agreed it, what it is expected to do. **One change at a time,
   or the package said to be one.**
5. **The re-run on the same protocol** — same tool, same question, same limits —
   with the comparison made by the app: the difference, whether it is more than
   chance, whether it now meets the criterion, and whether anything else moved.
6. **Nothing moved after the fact** — a closed run is frozen; the **criterion
   changing between runs is shown, with who and why** (moving the goalposts is
   the classic failure; the agreed fields are already the owner's alone).
7. **A lineage** — Run 1 → change → Run 2 → change → Run 3 — and its end: the
   setting accepted, and what it was set as (the line standard, the program proved).
8. **The evidence pack** — one paper: what we ran, how it went, what we changed,
   what we re-ran, the result, the money — the thing handed to the client or the OEM.

## 13. The design: the trial is the unit the test centre is built round

Part 1 listed rows. The right unit is the **trial**: a *series* of runs of one
protocol at one place, with the changes between them. The test centre's page then
reads **queue → trial → run → measurements**, not a flat list.

```
TRIAL  "Seal strength — Program 5, Express 125, Packer"        (a lens, never a record)
 ├─ RUN 1   27 Oct  FAILED   Cpk 0.90 · 3 of 20 rejects · £212/shift        [measurements: capability · pass/fail · reliability]
 ├─ CHANGE  Jaw temperature 160 → 170 °C — Dave, 27 Oct, "seal weak"; expected: rejects < 1 in 20
 ├─ RUN 2   27 Oct  PASSED   Cpk 1.42 · 0 of 20 · —                          Δ Cpk +0.52 (more than chance, n = 25 / 25)
 └─ ACCEPTED  set as the program's setting 170 °C  → Program 5 proved
```

### 13.1 Without a fifth noun

| The thing | Is the existing… | Needs |
|---|---|---|
| **Protocol** | the `Test`'s `passesIf` + `runAgreed` + its studies' `agreed` | nothing new |
| **Run** | a `Test` attempt in the `fromTestId` chain, with its studies (`uses` role *proof*) | the run's **settings** (below) |
| **Change** | a `Test` of kind *fix* (what · who · when · why) | **a link from the run that follows it**: one optional field, *the fix this run proves* — the same idea as the study's `uses`, which already exists for studies |
| **Settings** | — | a list on the run (name · value · unit), **carried forward from the run before** so the floor types only what moved; the diff *is* the change in data |
| **Criterion** | `passesIf` | a snapshot per run, so a change of criterion is visible |
| **Comparison** | `beforeAfter`/`sameScope` + the Analysis tool's *did it change* | `sameScope` extended to settings and criteria; says *not comparable, because …* |
| **Lineage, series, accepted** | derived (`rootTestOf`, the chain) | nothing stored |

The single real addition is **settings on a run** (and one link, *fix → run*). Both
live on the test's own record; no new table. Whether `settings` rides an existing
JSON column or needs a migration is settled at build, with `sync-schema.test.ts`.

### 13.2 What "Run again" must do

*Run again* — from any run, on a trial — in one tap:

1. makes the next attempt on the **same protocol** (the expectation and the
   aims, as `nextFrom` already does);
2. **lines up each measurement again with the same tool, question and limits**
   (new study, empty readings, linked to the new run) — so the comparison is
   *by construction* the same, not by care;
3. **carries the settings forward** and asks *"what did you change?"* — the
   fields that differ become the change, with *why* and *who agreed it*;
4. opens the first measurement to take.

Then the trial's page says the comparison in a sentence, per tool, from the
modules that already produce them (`studyLine`, `beforeAfter`, the Analysis
tool's *did it change*), and **never claims more than the sample allows**.

### 13.3 The honesty rules (the intelligence is in what it refuses to say)

- **Not comparable** is a first-class answer: *"Run 2's limits differ from Run 1's
  (criterion changed 27 Oct by Rowland)"* — shown, not hidden.
- **More than one thing changed** → *"2 settings changed between Run 1 and Run 2 —
  the result cannot say which one."* (A package is allowed when it is *said* to be one.)
- **A small sample** is said as such (the existing *enough?* rules), not dressed as proof.
- **Money** is one plain line from the one cost model, per run — never summed.
- **No sensors, no OEE** (`docs/DIRECTION.md`): every setting and reading is typed or
  counted by a person.
- **Not claimed:** design-of-experiments (a later wave, *designed-run tools*), e-signatures
  to a regulator's standard, a laboratory information system.

### 13.4 Where it sits

The **Test centre** (Part 1) is the *home*: its scope pages list trials; a
machine's, a program's and a line's page show the trials under them. The
**Programs report** and the **commissioning report** become trial readings:
each program's row is its trial's *latest run, the change before it, and the
result* — which is what the pill and the ladder were reaching for. The
**trial report** is the paper (§12.8): one page a trial, built from the same
blocks the screen draws.

### 13.5 Slices (each live alone; none built until Rowland says go)

| | What | Proved by |
|---|---|---|
| **T−1** | carry `ToolStudy.machine` through a machine rename (§3.1) | unit + `lines.mjs` |
| **T0** | `place` + `testRows` + **series** (the chain of runs and the fix before each) | unit on every kind; reconciliation tests |
| **R1** | *Run again*: the same protocol, the measurements lined up again, the next run linked to the fix | `trial.mjs` end to end: run → fail → change → run again → comparison on screen and paper |
| **R2** | **Settings** on a run, carried forward, the diff as the change; one-change-at-a-time warning | unit on the diff and the warning; the acceptance step |
| **R3** | the criterion snapshot and *not comparable because …*; the Analysis tool's sentence in the comparison | unit; paper read back |
| **R4** | the trial report, the program row and the commissioning report reading trials | paper parity named as intended |
| **T1–T2** | the test centre's pages (Part 1 §8) | as Part 1 |

### 13.6 Decisions for Rowland (added to §10)

9. **Is the unit a "trial"** — a series of runs of one protocol with the changes
   between them? (The word is yours to choose: trial · test series · experiment.)
10. **Settings**: typed per run and carried forward — or only a note? (The design
    says typed, because a number can be compared and a note cannot.)
11. **One change at a time** — a warning when two settings moved, or a hard rule?
12. **Who agrees a change** — anyone who can edit, or the owner (as the agreed
    fields are today)?
13. **Does a failed run need a documented change before it can be run again**
    — or may a run simply be repeated (noise, a bad sample) and said to be a repeat?

---

# Part 3 — Every way in: the screens that ask "did it pass?", read from the code

Rowland, 26 October: *"I go to programs, I go to testing, then in testing I'm what?
Managing all of this? … there's other sections as well that ask you, when you've done
a test, to go to a different section. If I click on the actual main program, it asks me
was it a pass, was it a fail … You're not thinking about these things technically
enough. You're not wrapping every single user interface up in our current process
streams. And you need to."* He is right: Parts 1–2 designed a destination and a loop
without first listing the doors. This is that list, read from the code, 26 October.

## 14. The doors — every screen that records or asks a result

| # | Door (route · where it is opened from) | What it asks | What it writes |
|---|---|---|---|
| 1 | **Programs page** — a program's row · `#/project/:id/programs`, the rail's *Programs*, Commission's *Test it*, Needs you's *Test it* (`?test=`) · `ui/ProgramTest` | *Test it · Say how it went · Go again*: Passed · Baseline achieved · Didn't pass · Didn't run · Not tested · No program, a day, aim and what it did (speed, minutes, packs, rejects), what was seen | **Two records at once**: the test's `outcome` + `runAgreed`/`run` (made if there is none), **and** the floor's status on the line of the programs stage (`FLOOR_OF`), and then the program's `state` (`followTest`/`followPart`) |
| 2 | **A line's Programs** · `#/lines/:ws?…`, `#/programs` · `LineProgramsScreen` | the same row; a *proved on* date; `ProveProgram` | the program's `state: 'proved'` **with no test**, or a test as in 1 |
| 3 | **The record drawer** — a test, from the Gantt, Commission grid, Install, the Day, the machine page, the journey, Notes… (13 files open it) · `ui/RecordDrawer` | *Passed · Didn't pass · Back to planned*, a *No verdict yet* question, the run panel (`RunPanel`: products, aim, did) | the test's `outcome`, and its `runs` list |
| 4 | **The test's own page** · `#/project/:id/testing/:testId` · `TestScreen` | the same *Verdict* | the test's `outcome` |
| 5 | **A stage drawer's parts** — e.g. *Programs loaded* · `StageParts` | a status per part: Baseline · Passed · Failed · Not tested · No program, with commentary | the **part's** result only — **no test** — and then the program drops back if it failed (`followPart`) |
| 6 | **Commission** — the testing board · `#/project/:id/testing` · `TestsScreen` + `NeedsYou` | *Test it on Programs ›*, *Open the test ›* — **it sends you to door 1** | nothing itself |
| 7 | **The Day** · `#/project/:id/day` · `DayPlan` | tick a stage done; a test that ran with no verdict is asked | `doneTodayPatch` → **`outcome: 'passed'`** |
| 8 | **Install / Set up / Hand over** and Needs you's *Done today* | the same tick | the same `doneTodayPatch` |
| 9 | **Problems** (stage gate) and Quick problems · `FixesScreen`, `QuickSnagsScreen` | *Verdicts* — the question the app owes (for fixes); *Fixed* | a fix's `outcome: 'passed'` |
| 10 | **Moving a date** · `WhyMoved` | why | can write `outcome: 'failed'` |
| 11 | **A tool** — a capability study, a check log, a reliability watch · its own page · `StudyScreen` and the others | its own verdict (Cpk, pass-or-fail, MTBF), *Close* | the **study's** verdict and receipt — **it reaches the test only if you open the drawer and press *Use its verdict — …*** (`StudyLinks`) |
| 12 | **The 6M board** — a countermeasure · `PaceNextSteps` | *Prove it* | links a before and an after **study** to the action (`beforeAfter`) — there is **no test** in a 6M job at all |

The streams they belong to: **the stage gate** (doors 1–10, 12 for the paced ones),
**a running line's own programs** (2), **the 6M** (12), **tools on their own** (11);
the **lever tree** has no test door at all.

## 15. What this does to one fact

*"Program 5 passed"* can be written in **four places that must agree**: the test's
`outcome` (doors 1, 3, 4, 7), the **part's result** on the programs stage (1, 5), the
**program's** `state`/`provedOn` (1, 2, followTest), and a **study's** verdict (11).
The app keeps them level with "the newer wins" rules (`followTest`, `followPart`,
`programAfterFloor`). That is why today's report said *"to do"* over a program that
had a test: the headline came from the stage part and the test sat under it. It was
**fixed as a symptom** (the Programs report now reads the tests when the floor said
nothing); the cause is that there are **twelve doors and four records for one answer**.

Four more places this shows, all in the code:

1. **Two forms for one test's numbers.** The Programs row writes `run`/`runAgreed`;
   the drawer's `RunPanel` writes `runs`. `programJourney.runOf` has to choose which to
   read (a 25 October bug: *"I changed ran for to 60 min … it still says netted 20 ppm"*).
2. **The same question, twice, in different words** — *Passed · Didn't pass* (a test) and
   *Passed · Failed* (a part), plus three floor-only answers that are a *status*, not a
   result (*Baseline · Not tested · No program*).
3. **A study's verdict never reaches its test by itself.** You must leave the tool, open
   the drawer, find *Proved by*, and press the button.
4. **Commission cannot answer a test; it sends you to Programs.** Hence "it asks me to go
   to a different section".

## 16. What "wrapping every door" means for the design

Three rules, in this order:

### 16.1 One way to answer — the result sheet
A single sheet — `RunSheet` — is **the** form that records a run, and **every door
opens it**: the Programs row, the drawer, the test page, Commission's and Needs you's
*Test it*, the Day, a fix. It holds, top to bottom:

1. **How it went** — *Passed · Didn't pass · Didn't run* (the three results of a
   test; *Baseline · Not tested · No program* offered only where the program is a
   part on a programs stage, as the floor's *status*, said apart);
2. **What it ran** — the day, what was set (the **settings**, carried forward), what
   it did (speed, minutes, packs, rejects) — one place, one record;
3. **The measurements** — the tools lined up for this run, each with *Take the readings*
   **inline** (no trip to another section) and each one's verdict offered *as the
   run's* with one tap;
4. **What was seen**, with photos;
5. **If this follows a run: what changed** (the diff of the settings, why, who agreed).

It is the existing drawer's test body, extended — *"one drawer per record"* (redesign
slice 2) already says the drawer is the record's one home. **The Programs row stops
being a second form** and becomes a launcher of the sheet with its context (the
program, the machine, the products) filled in.

### 16.2 One way to write — `recordRun(...)`
One module performs **all** the writes of an answer **in one place**: the test's
`outcome` and `runs`; the floor's status on the programs-stage part when one exists;
the program's `state`/`provedOn`; and links the run's studies. It replaces today's
orchestration spread over `ProgramTest.answer`, `followTest`, `followPart`, the drawer's
`setOutcome` and `doneTodayPatch`. The "newer wins" rules move into it and into **one
reader** (`lib/place`/`testRows`, Part 1 §4). The result: *no door can write one record
and leave another saying something else.*

### 16.3 One way to look — the test centre, reached from every door
Every door gets the same two things back: **a link into the trial it belongs to** (the
series, the change before this run, the comparison after it), and **the node's reading**
on its own page — a machine's page, a program's row, the line, the project (Part 1 §6).
*Commission* stops sending you to Programs: its *Test it* **opens the sheet where you
are**, on the board.

## 17. The loop in each stream — one shape, three implementations today

| Stream | Run | Change | Run again | Today |
|---|---|---|---|---|
| **Stage gate** | a `Test` | a *fix* (`Test` of kind *fix*) | a re-test (`fromTestId`) | the fix and the re-test are **siblings** (§11) |
| **A program** | an attempt (a `Test` with `programId`) | *nothing recorded* | *Go again* | the aim moves; **why** is not said |
| **6M** | a study (evidence) | a countermeasure (`pace_todos`) | a study (proof) → `beforeAfter` | no `Test` anywhere; the link is on the study |
| **A tool alone** | a study | — | another study | nothing joins them |

The trial (Part 2 §13) is **the one shape over all four**: *run → change → run again →
comparison*, whichever record carries it. The sheet and `recordRun` are how each
stream stays in its own records and still reads as one.

## 18. What changes in the slices (replaces Part 2 §13.5's order)

The doors come **first**, because everything else stands on them and they fix defects
that exist today whether or not the centre is ever built.

| | What | Why first |
|---|---|---|
| **D0** | The audit above kept as a **test**: a list of the doors, each proved to write through one path (a unit test over `recordRun`'s outputs, a script that drives each door and reads every record back) | so a new door cannot be added that writes a fifth place |
| **D1** | `recordRun` — one write path; doors 1, 3, 4, 7, 8 call it. No screen changes yet | the four-records problem ends; the Programs report and every paper agree by construction |
| **D2** | `RunSheet` — one form; the Programs row and the drawer and Commission open it; the `run`/`runs` split ends | "it asks me to go elsewhere" ends; one place for the numbers |
| **D3** | A study's verdict offered on the sheet **inline**, and *Take the readings* on the sheet | the tool ↔ test trip ends |
| **T−1, T0** | the rename fix, the readers (Part 1) | the page needs them |
| **R1–R4, T1–T2** | Run again, settings, comparison, the trial report, the centre's pages | as Part 2 |

## 19. Decisions for Rowland (added)

14. **One result sheet for every door** — and the Programs row only opens it?
15. **Programs: Baseline · Not tested · No program** — keep them as the floor's *status*
    on a programs-stage part (said apart from Passed / Didn't pass), or fold them into
    the result?
16. **Commission answers in place** (the sheet opens on the board) — instead of sending
    you to Programs?
17. **A hand proof** (*proved on* a date, no test) — keep it, but as a run said to be
    *signed off by hand* with a reason?
18. **The 6M and the lever tree**: should a 6M countermeasure's before/after be a trial
    in the same centre (it is the same loop), and does the lever tree need a test door?

---

# Part 4 — Stage gate only: the program is the unit

> **Superseded 26 October by `docs/STAGEGATE-REBUILD.md`** — the stage gate rebuilt round its
> real things, with every connection (the Day, the Journey, the plan, the gates, Needs you,
> Actions, the reports). This part is kept as the step that led there.

Rowland, 26 October, after running the app live for a whole day: *"I'm only talking
about stage gate … stage gate offers program, pass, fail, run a fix on it, which then
opens up another window, which then opens up another door. I can run a test, but I
can't then say I'm retesting because of the same thing — we've done this change …
when it came back to being able to understand the current state, report back to the
business of this is where we are, I couldn't easily do that … it's all about the
program … then being able to pick a tool … we have another user interface for
another user interface for another."* Parts 1–3 are the wider context (lines, 6M,
tools). **This part is the design for a stage-gate project's programs, and it is
the one to decide first.** Nothing is built until Rowland says go.

## 20. The path today, counted from the code

A program fails, is fixed, and is tested again — the screens it goes through:

| # | Screen | What you do there |
|---|---|---|
| 1 | **Programs page**, the program's row (`ProgramTest`) | *Test it* → *Didn't pass* → Save (writes the test **and** the stage part's status) |
| 2 | **The stage's drawer**, opened by *Hit a problem* (`openRecordAt` → `RecordDrawer`) | write the problem (a *found* item on the programs stage's part) |
| 3 | **The problem's page** (`ProblemRecord`) | *Make it a fix* — the fix is a `Test` of kind *fix* |
| 4 | **The fix's drawer** | who, the day agreed |
| 5 | **Problems** (`FixesScreen`) or the fix's drawer | *Fixed* → the fix's outcome `passed` |
| 6 | **Back on the Programs row** | *Go again* — a re-test of the **test**, **not linked to the fix** |
| 7 | **The test's drawer → *Proved by*** (`StudyLinks`) → **the tool's own page** → back | pick a tool, take the readings, press *Use its verdict* |
| 8 | **A report** (Programs, commissioning, status) | the state — *FAILED* or *PASSED* — without the story |

**Eight places, three kinds of window (row, drawer, page), and nothing between 5 and 6
says "this retest is because of that change".** That is the day Rowland had.

## 21. What the business needs to be told

Not *FAILED / PASSED* — **where the program is in the loop**. Derived from records that
exist (no new status stored):

| The program is… | Because |
|---|---|
| **To test** | no test, or one booked and not yet run |
| **Ran — no verdict** | a test ran and nobody has said how it went |
| **Passed** | the newest attempt passed (and no newer floor failure) |
| **Failed — no fix yet** | the newest attempt didn't pass; no fix raised for it |
| **Fix under way** | a fix for that failure is open, with its owner and day |
| **Fixed — retest not booked** | the fix is done; no later attempt booked |
| **Retest booked** | a later attempt is booked, after the fix |

The sentence a manager reads: **"7 programs · 3 passed · 1 retest booked after a fix ·
1 fix under way · 1 failed with no fix yet · 1 to test."** And each row: **"Program 5 —
failed 25 Oct (seal jaws cold) → fix: raise jaw temperature, Dave, done 26 Oct →
retest booked 29 Oct."** That one line is *the report back to the business.*

## 22. The page: a program is a place

A program gets its own page, **the way a machine already has one** (`MachineScreen`,
`#/project/:id/machine/:assetId`): `#/project/:id/program/:programId`. Everything about
that program is on it, and **every action is inline** — it expands where you are; nothing
opens a second window.

```
PROGRAM 5 — Express 1.25 kg           Ilapak flow wrapper · led by Ilapak UK        ┃ FIX UNDER WAY ┃
Aim 60 ppm for 60 min · runs Tesco Express 1.25 kg                       Failed 25 Oct → fix done 26 Oct → retest booked 29 Oct

 1   25 Oct   DIDN'T PASS    set 60 ppm · ran 30 min · 1,700 packs · 20 rejects · netted 56.3 ppm
          seen: seal jaws cold, film creasing
          measured with:  capability "60 ppm" ✗ Cpk 0.90 · pass or fail ✗ 3 of 20            [+ a tool ▾]
          ┗ PROBLEM  seal jaws not reaching temperature — High — Dave
              ┗ FIX   raise jaw temperature 160 → 170 °C — Dave · agreed 26 Oct · DONE ✓ 26 Oct
 2   29 Oct   RETEST — after the fix above      BOOKED
          [ Say how it went ]   [ Take the readings ▾ ]

 [ Hit a problem ]   [ Book a retest ]   [ Prove by hand ]                                  Report ▾
```

- **One ladder, top to bottom** — attempt, what was found, the fix under it, the retest
  that follows *the fix*, in order. The `programJourney` ladder already is the attempts;
  the problem and the fix hang off the attempt that found them; the retest hangs off the
  fix. **This is the join Part 2 §11 found missing.**
- **Inline, in this order, no windows:** *Say how it went* (the one result form, Part 3
  §16.1, expanding in place) · *Hit a problem* (one line, then *Make it a fix* as a
  second line **on the same page** — who and by when) · *Book a retest* (the next
  attempt, the aim carried over, the **fix it follows** picked from the program's open or
  done fixes) · *Take the readings* / *a tool ▾* (the tools worth using on a program,
  each lined up with this attempt's name and limits).
- **The state pill is the loop state** (§21), top right, in its colour.
- A **tool** is a measurement *of this attempt* — it lists under the attempt, shows its
  verdict, and one tap offers it as the attempt's result.

## 23. Every existing door, and what it becomes (nothing removed first)

| Today | Becomes |
|---|---|
| Programs page row's *Test it* (`ProgramTest`) | the same form, **opened from the program page** (and still on the row for speed, as a launcher of that form) |
| *Hit a problem* → stage drawer | the inline problem on the program page; the stage drawer keeps working for stages that are not programs |
| *Make it a fix* page | one more inline line under the problem |
| Problems page's *Fixed* | still the fix's own place, **and** *Fixed* on the program page's fix line — the same write |
| *Go again* | *Book a retest*, with *which fix it follows* |
| Drawer's *Proved by* + the tool's page | *a tool ▾* on the attempt; the tool's page still opens for the readings |
| **Commission** (`TestsScreen`) — *Test it on Programs ›* | its program cell **opens the program page**; the board stays the machine × stage view |
| **Needs you** — *Test it*, *Say how it went* | opens the program page at the right line |
| **The machine page** | lists its programs, each with its pill and the loop sentence |
| **The Day** | *Retest Program 5 — after the fix* |
| **Reports** — Programs, commissioning, status, client, handover | read the loop state and the line of story from the same reading |

Per CLAUDE.md rule 1, **no door is removed until the program page has been used and its
replacement is proved**; each is first *pointed at* the page.

## 24. What it needs on the records

- **Read (no change):** `Program`, its `Test` chain (`fromTestId`), the problem (`TestItem`
  *found*, `fromItemId` the part), the fix (`Test` *fix*, `becameTestId`), `ToolStudy`
  (`programId`, `uses` role *proof* kind *test*).
- **One link to add:** the retest **follows a fix** — one optional field on the test (the
  fix it follows). Everything else is derived. (Part 2's *settings on a run* is optional
  and later.)
- **One reader** (`lib/programLoop`): the attempts, each with its problem, its fix, its
  retest and its studies, and the §21 state — pure, tested against the seeded job and
  built with the existing `programJourney`, `rootTestOf`/`testOfFix`, `studyLine`.

## 25. Slices — each live alone, none removing a door

| | What | Proved by |
|---|---|---|
| **P1** | `programLoop` + the **program page**, read-only: the ladder with problems, fixes, retests and tools in order, the loop state, a one-line story; reached from the Programs row, Commission and the machine page | unit on the reader against every case in §21; `program-page.mjs` reads it back; the report sentence |
| **P2** | The **loop state on the Programs page and every report** — the pill (`badgeOf`) says *Fix under way / Retest booked*, the closing sentence counts them | the report's paper read back; reconciliation with the old counts |
| **P3** | **Inline actions** on the page: *Hit a problem* → *Make it a fix* → *Book a retest (after this fix)* → *a tool ▾*, each calling the existing writes; the retest's *follows the fix* link | `program-loop.mjs`: fail → problem → fix → fixed → retest → pass, all on one page; the old doors still reach the same records |
| **P4** | *Say how it went* on the page = the one result form (Part 3 §16.1) and `recordRun`'s single write path | the four-records check |
| **P5** | The doors **point at** the page (Commission, Needs you, the Day, the machine page); the old forms retire once used | the structure's journeys: none longer |

## 26. Decisions for Rowland (stage gate)

19. **A program gets its own page** (as a machine has) — or should it be a bigger drawer
    over the Programs list?
20. **The loop states in §21** — are they the words the business wants (To test · Ran, no
    verdict · Passed · Failed, no fix · Fix under way · Fixed, retest not booked · Retest
    booked)?
21. **A retest must name the fix it follows** — required after a failure, or optional
    (a repeat for noise or a bad sample, said to be one)?
22. **Which tools** belong on a program's *a tool ▾* by default (capability · pass or fail
    · reliability · control chart · analysis)?
23. **Where the business reads it** — the Programs report as it is now with the loop line
    under each program, or a new one-page *Program progress* paper for the client?
