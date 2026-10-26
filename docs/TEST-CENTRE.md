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
