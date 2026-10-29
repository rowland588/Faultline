# 6M project system — review (29 October 2026)

**Purpose:** A read-only review of the running-line method (`board` model) for
Rowland while stage-gate path work continues. No build scope — research and
recommendations only.

**Read for this review:** `docs/DIRECTION.md`, `docs/SIXM.md`, `docs/OPEX.md`
(skim), `docs/PROJECTS.md` (Actions), `docs/STRUCTURE.md` §5–6 and §13,
`docs/STAGEGATE-PATH.md` (contrast), `docs/map/sixm-journey.md`,
`docs/map/sixm-report.md`, `src/lib/sixm.ts`, `src/lib/fishbone.ts`,
`src/lib/planModel.ts`, `src/lib/portfolio.ts`, `src/lib/projectActions.ts`,
`src/ui/rail.ts` `projectGroups`, `scripts/acceptance/sixm-evidence.mjs`.

**Authority:** Where this review disagrees with `docs/DIRECTION.md` or
`docs/SIXM.md`, those documents win. Stage-gate shape is governed by
`docs/STAGEGATE-PATH.md`; this review does not propose changing that path.

---

## 1. What 6M is for today

### 1.1 Intent (one sentence)

**Make a running line perform better:** gap → problem (fish head) → causes on
six bones → five whys → countermeasures → proof on the same number → holding
(`docs/SIXM.md`, `src/lib/sixm.ts`, `src/lib/planModel.ts` `board` entry).

Rhythm: weekly in the meeting. Done when: **at target, and holding**. Stored
as `planModel === 'board'`; never shown as "3P" on screen.

### 1.2 User journeys (how a site lead actually moves)

| Journey | Route / entry | Records touched | What they take away |
|---|---|---|---|
| **Start a 6M project** | Factory or line → New project → 6M; lines from factory | `projects`, `pace_lines` | A workspace scoped to one or more running lines |
| **See where the project is** | `#/project/:id` (Overview) | cases, pace_todos, readings, measures | Band tiles (gap, problems, roots, countermeasures, holding), compact fishbone lead, Needs you, This week / next → Journey |
| **Work the method (primary)** | `#/project/:id/fishbone` (+ `?line=` `?problem=`) | `cases` (causes, hold), `pace_todos` | Full-screen journey: Pareto drawer, head card, fish, tap-in cause/problem panels, Problem · Why · Fix · Did it work |
| **Run the meeting board** | `#/project/:id/board` | `pace_todos` (`pillar` = bone, `causeRef`, `expect`) | Six lanes; same actions as list view (`?view=next` → board) |
| **Per-line pack** | `#/project/:id/line/:lineId` — Fishbone lens default on 6M | same + line tools | Line in *this project*: gap, fish held to line, doors to capacity, Pareto, capture |
| **Priority from loss** | `#/project/:id/pareto` (when Pareto enabled) | observations → new `cases` | "Find the root cause ›" on a bar; vital few vs just-do-it |
| **Evidence and tools** | `#/project/:id/tools` (Evidence since B5/D9; `?view=snags` redirects here) | `studies`, walk snags, Line Talk | Every tool use in the project; filmed line; studies link to causes/actions (`sixm-evidence.mjs`) |
| **Numbers and proof** | `#/project/:id?view=data` / `?view=wins` (**Results**) | targets, readings, wins | Charts vs target; "did it work?" |
| **Team action tracker** | `#/project/:id/actions` (P3) | owed rows from portfolio + register snags | Same late count as band and Factory; by who / when / where |
| **Register problems** | `#/snags?project=` (Problems tab) | `snags` | Parallel track: snags with journey; can feed fish via "Find the root cause" / observed source |
| **Control room** | `#/` Factory board (`ui/JobsBoard`, `lib/portfolio`) | all projects | 6M rows: sentence, **problems by phase**, open countermeasures by bone, gaps/losses, problem list with slipped highlighted |
| **Client story** | Report ▾ → Status 1-page, full client report `#/pace-report?project=` | read-only aggregate | Gap, Pareto, each problem (fish + four parts), board by bone, walk evidence (`lib/sixmReport`, `lib/sixmStatus`) |

**Acceptance proof:** `scripts/acceptance/sixm-evidence.mjs` (cause ↔ study ↔
countermeasure ↔ report); flow-audit items in `docs/SIXM.md` (gap counted,
holding chased, suggestions scoped, status page); `scripts/report-stress.mjs`
on 6M seeds; P3 in `scripts/acceptance/actions.mjs`; structure journeys J5/J8.

### 1.3 Records (no separate "6M table")

| Concept | Store | Notes |
|---|---|---|
| Problem (fish head) | `cases` | `project_id`, `line_id`, `source`, `causes[]`, `hold`, phases derived |
| Cause | inside `cases.causes` | merged by id across devices |
| Countermeasure / board action | `pace_todos` | `pillar` = SixM bone; `causeRef`; `expect`; optional `caseId` |
| Timed stop bone hint | `observations.cause_m` | optional tap at capture |
| Register problem | `snags` | shared with stage gate; optional link into a Case |
| Fed-in (read-only) | stops, snags, standards, capacity, materials, programs, readings, studies | `lib/fishbone.ts` suggestions |

### 1.4 Screens and navigation (current structure)

From `src/ui/rail.ts` `projectGroups` for `model === 'board'`:

**Tabs / rail under the project:** Overview · **Fishbone** · **Board** ·
**Lines** (each line sub-tab) · **Results** (Numbers · Wins) · Pareto (if
enabled) · Materials · Journey · Actions · Problems · Tools · Notes · Reports ·
Details.

Contrast **stage gate** (`docs/STAGEGATE-PATH.md`): Now-centric, machine unit,
gates and programs — no fishbone, no `cases`, problems are test/findings/fixes
plus register (`docs/STRUCTURE.md` comparison table).

### 1.5 Papers

- **Status report — 1 page** (`lib/sixmStatus`) — abnormal only, for weekly client.
- **Full 6M client report** — gap, where loss is, each problem (drawn fish +
  Problem · Why · Fix · Did it work), board by bone, walk evidence.
- **Per-line client report** — `?line=` on pace-report.
- **Actions** — meeting list and per-person (`lib/projectActionsPdf`).
- **Journey report** — range of days (J3).
- Tool papers from inside the project (capability, losses, etc.) unchanged.

---

## 2. Strengths and gaps vs control-room intent

`docs/DIRECTION.md`: tools find things → **three kinds of change** →
**control room** (problems, actions, who owes what, reports). The thread:
**evidence → cause → action → proof** on the line's numbers, in money.

### 2.1 Strengths (aligned with intent)

1. **Method spine is clear and stored once.** Gap → problem → verified causes →
   countermeasures → proof → hold is implemented in code and on paper, not a
   template bolt-on (`lib/fishbone.ts`, `lib/problems.ts`, `docs/SIXM.md`
   working method Problem · Why · Fix · Did it work).

2. **Fishbone as journey** matches Rowland's Gantt analogy — immersive full
   screen, Pareto drawer, tap-in panels (`FishboneScreen`, `docs/SIXM.md` §
   fishbone page).

3. **Tools feed the fishbone, not the other way around.** Pareto, walk,
   standard, balance, capacity, materials, programs, studies produce
   *suggestions*; acceptance grades (measured · counted · observed · reported)
   prevent invented shares of the gap.

4. **One number discipline on proof.** Countermeasures carry `expect`; studies
   can prove before → after; report and board sheets stay tied
   (`sixm-evidence.mjs`).

5. **Control room now speaks 6M.** `lib/portfolio.ts` attaches `sixm` to board
   jobs: phases, bones, gaps, losses, problem rows — Factory board is not
   stage-gate-only anymore (`docs/DIRECTION.md` "deep not wide" thread).

6. **Project workspace (P2–P4) applies.** Tools, Problems, Actions, Line Talk
   inside `?project=`; Actions reads the same `pacedOwed` as Needs you — one
   late count (`docs/PROJECTS.md`).

7. **Money on the method (FC-146).** Problem hours/week and countermeasure
   worth on card and report when line economics exist.

8. **Holding is chased.** `holdDue` surfaces missed/due checks on Needs you,
   control room week, fish strip, report — fixing flow-audit #9.

### 2.2 Gaps and frictions (vs control-room and Rowland's "drive to actions")

| Gap | Evidence | Impact |
|---|---|---|
| **Two problem languages on one project** | Register `snags` vs fish `cases`; both on Problems and Actions; link via `source.snag` / "Find root cause" | Site lead must know when to use register vs fish; stage-gate fixes (`tests`/`test_items`) have no fishbone analogue |
| **Actions page: read mostly in place** | `docs/PROJECTS.md` *Not yet:* edit who/when/done on row; *Make it an action* on bare findings | Extra taps to close the loop; 6M countermeasures still edited on board/fishbone sheets |
| **P2 tool links not fully project-scoped** | `docs/PROJECTS.md`: Evidence lens, fishbone "Count a shift" open line list not project list | Context switch when working inside a 6M project |
| **Factory Actions not on home tiles** | P4 *Not yet:* control room page tiles for Every action | "Am I in control?" one level down (`#/actions`) |
| **Phase / holding edge cases** | `docs/map/sixm-journey.md`: Holding when `moved` undefined; gap title duplication; material → Machine mis-suggestion | Trust in status colours and client story |
| **6M path doc unlike stage gate** | `docs/STAGEGATE-PATH.md` exists; 6M spread across `SIXM.md`, maps, STRUCTURE | Harder for builders to say "what is the 6M path" in one page (this review is not that path — Rowland would need to agree a `6M-PATH.md` if desired) |
| **Line-in-project vs line-at-factory** | `docs/STRUCTURE.md` §13: two "Line 7" places | Navigation confusion (line-is-home work helps machines; project line naming still proposed) |
| **Lever tree shares board UI** | Same `pace_todos` / Board screen | Low risk for 6M but blurs method purity in code (`BoardScreen`) |

**Note:** `docs/map/sixm-journey.md` (4 Oct) said Factory does *not* show
problems by phase; **`ui/JobsBoard.tsx` now renders `v.sixm.phases` and
`v.sixm.problems`** when `portfolio` supplies them. Treat the map finding as
**fixed**; keep the doc in mind for stale inventory elsewhere.

---

## 3. Actions on 6M vs stage gate (P3 register)

Both project kinds share **`#/project/:id/actions`** and the same reader
`lib/projectActions.projectActions(owed, register, projectId, today)`.

### 3.1 What populates `owed` (the difference)

| Source | Stage gate (`commissioning`) | 6M (`board`) |
|---|---|---|
| Plan / gates | Install, set-up, hand-over steps; tests | — |
| Test cycle | Tests, fixes, critical/high findings (`test_items`) | — |
| Board | Rare / plan-tool rows | **`pace_todos`** countermeasures (kind `action`) |
| Holding | — | **`checksOwed`** from `cases.hold` (kind `check`) |
| Waits | Materials, programs, machines | Same (`jobItems` in `pacedOwed`) |
| Register | Open `snags` with `projectId` | Same |

Stage gate **Actions** is the meeting view of commissioning work **plus**
register problems. 6M **Actions** is countermeasures and hold checks **plus**
materials/programs **plus** register — it does **not** list gate tests/fixes
(because there are none).

### 3.2 Shared behaviour (P3 delivered)

- One **late** rule shared with project band, rail badge, and Factory counts
  (`pacedOwed` / `jobItems` / `criticalItems`).
- Rows: what · kind · why · where · who · when · open record.
- Views: by person, date, where; filters; tiles; meeting PDF.
- P4: `#/actions` stacks every project's rows and line-only register problems.

### 3.3 What 6M does *better* for Actions today

Countermeasures already carry **why** via `causeRef` / branch text and **what
should change** via `expect` — closer to Rowland's "why" column than a bare
stage-gate next step. Hold checks appear as first-class owed rows (stage gate
has no equivalent).

### 3.4 What stage gate does *better* for Actions today

Findings → **Make it a fix** is wired on tests and register inside the
commissioning drawer (`Make it a fix`, `test_items`). 6M has **Add
countermeasure** on the fishbone but no symmetric one-tap from every register
row to a board action (*Make it an action* still noted as not built in
`docs/PROJECTS.md`).

---

## 4. Rowland's idea: 6M for stage-gate *problem solving*

**Idea (paraphrase):** Use the 6M/fishbone way of working to solve hard
problems that appear during a stage-gate project — without collapsing the two
methods into one app or rebuilding the method engine DIRECTION deleted.

### 4.1 Feasibility — yes, in slices, with clear boundaries

Stage gate already owns **problems → fix → re-test** on `tests` / `test_items`
/ register (`STAGEGATE-PATH` step 5). That loop is **machine and gate
timed**, OEM-facing, and proof is **test pass**, not Pareto hours/week.

6M owns **line performance**, **cases**, and **countermeasures** with
**before → after on the line number** and **hold checks**.

These are different **proof contracts**. Merging models into one project
record would break reports, Actions aggregation, and `planModel` clarity.

**Feasible patterns (share infrastructure, stay method-pure):**

| Share | Keep stage-gate pure | Keep 6M pure |
|---|---|---|
| **Problems register** (`snags`) — one factory list; filter by project | Fixes tied to tests; Commission narrative | Cases only on `board` projects |
| **Actions page** (`projectActions`) — one meeting list per project | kind words: Fix, Test, Stage… | kind Action, Check; fishbone links |
| **Line tools** (capacity, Pareto, studies) | Proof = program/test | Proof = case measure + study links |
| **Optional link:** "Open a 6M problem on this line" from a stage-gate snag | Project stays `commissioning`; no fish tab on rail | New or existing **6M project on same line**, not a second method on one project |
| **Line Talk** | Offers cards; never writes | Same |

**Do not share (without a Rowland go and a path doc change):**

- One project with both `commissioning` and `board` plan models.
- Fishbone heads that are OEM test failures without a line-performance number.
- Replacing **Make it a fix** with fishbone for every stage-gate snag.

**Middle ground (worth a workshop):**

- **Register problem → "Trace on fishbone"** creates/links a `Case` on a
  **sibling 6M project** (same line), same way line-only work moves into a
  project — preserves DIRECTION's "three kinds of change".
- **Stage-gate project pins a "performance thread"** — UI only: link to the 6M
  project id on the line, shown on Now ("Line performance — see Line 7 pace").
- **Shared countermeasure vocabulary** on `pace_todos` already works if a
  countermeasure is raised from a study inside a stage-gate project (tool
  on project) — it lands in Actions but **not** on a fish unless someone opens
  a case.

### 4.2 Risk if done wrong

- Reintroducing the **method engine** pattern (two journeys on one project).
- Client report that mixes gates and fish on one PDF without a clear reader.
- Actions **double count** (same work as fix and countermeasure).

---

## 5. Recommended slices (B0-style — small, gated, no DIRECTION breach)

Numbering follows `docs/STRUCTURE.md` habit: **document first**, one concern
per slice, acceptance or smoke extended only where the slice touches behaviour.

| Slice | Name | What | Touches |
|---|---|---|---|
| **6M-R0** | **Inventory truth** | Refresh `docs/map/sixm-journey.md` Factory/phases finding; add `docs/reviews/6M-REVIEW-29-OCT.md` to README if reviews folder indexed | Docs only |
| **6M-R1** | **Actions loop** | *Make it an action* from register + bare finding; optional inline who/due on Actions row with Undo (`PROJECTS.md` not yet) | `projectActions`, Actions screen, acceptance/actions.mjs |
| **6M-R2** | **Project-scoped tool doors** | Fishbone / Evidence / "Count a shift" open project's tool list (`?project=`) | `inProject`, fishbone links, P2 completion |
| **6M-R3** | **Phase trust** | Holding only when proof says better; closed-not-proved wording (`sixm-journey` rec) | `lib/fishbone.ts` `phaseOf`, report words, sixm-evidence or unit tests |
| **6M-R4** | **One formatter for head numbers** | Single display rule for gap/Pareto headline vs fish head | `lib/fishbone.ts` / problem view |
| **6M-R5** | **Sibling project link (optional go)** | Stage-gate Details: "Line improvement project" link to `board` project on same line — no merged model | `projects` metadata or typed link field, Now/Machines one line |
| **6M-R6** | **6M path page (optional go)** | `docs/6M-PATH.md` mirroring STAGEGATE-PATH structure: steps, places, papers, keep/fold — built from this review + SIXM.md | Doc + gate inventory if screens rename |

**Order:** R1 and R2 highest leverage for "drive through to actions"; R3–R4
quality/trust; R5–R6 need Rowland **go** (DIRECTION: nothing new until said).

**Explicitly not recommended without a new direction conversation:**

- Fishbone tab on stage-gate rail.
- Excel import/export for causes (contradicts "no Excel" / in-app loop).
- AI-driven cause generation (contradicts DIRECTION — formulas + Line Talk only).

---

## 6. What must NOT change

Per `docs/DIRECTION.md`, `docs/SIXM.md`, and Rowland's prior decisions:

1. **6M stays a first-class project kind** (`board`) — not folded into stage
   gate or a generic "improvement" bucket.
2. **All improvement data stays in the app** — no Excel upload path for the
   fishbone, causes, or countermeasures.
3. **The fishbone is the journey** for running-line work — not demoted to a
   widget on Overview only; full-screen fishbone remains the method canvas.
4. **Six bones and the evidence grades** — the lens stays `src/lib/sixm.ts`;
   no revert to 3P on screens.
5. **Cases + pace_todos split** — problems/causes on `cases`; countermeasures
   on `pace_todos`; merged cause ids for sync.
6. **Suggestions are offers** — fishbone fills from tools; nothing auto-writes
   a confirmed cause without a person.
7. **Client report model** — Problem · Why · Fix · Did it work + board by bone;
   status page first; one report engine (`lib/sixmReport`).
8. **AI scope** — Line Talk and camera only; no method builder, no Ask AI for
   figures.
9. **Factory is shared** — lines, machines, register; projects point at lines.
10. **Stage-gate path independence** — stage-gate slices do not remove 6M
    tabs or merge Actions semantics without a written path change.

---

## 7. Top five recommendations (for Rowland)

1. **Treat register + fish as complementary, not competing** — snags for
   "something wrong" and ownership; cases when the team commits to root cause
   and a line number. Improve bridges (Find root cause; optional sibling 6M
   project link) rather than one merged problem type.

2. **Finish the Actions loop (6M-R1)** — the tracker page exists but the last
   mile (*Make it an action*, edit on row) is what teams feel in the meeting
   when stage-gate and 6M actions sit in one list.

3. **Complete P2 project doors (6M-R2)** — countermeasures and evidence links
   should not drop project context when opening tools from fishbone or line
   pack; low visual change, high "where am I" payoff.

4. **Tighten phase/holding honesty (6M-R3–R4)** — client trust on "Holding"
   and consistent headline numbers; small logic changes, big report credibility.

5. **If cross-method problem solving is wanted, link projects — don't blend
   methods** — a stage-gate job and a 6M job on the same line, linked from
   Now/Details, shares register and Actions visibility without breaking
   `STAGEGATE-PATH` or the 6M report story.

---

## 8. References (code anchors)

- Bones and types: `src/lib/sixm.ts`
- Fishbone engine: `src/lib/fishbone.ts`
- Method metadata: `src/lib/planModel.ts` (`board`)
- Control room 6M view: `src/lib/portfolio.ts` (`pacedOwed`, `problemsSaid`, `sixm` on `JobView`)
- Actions aggregation: `src/lib/projectActions.ts`
- Project nav: `src/ui/rail.ts` `projectGroups`
- Journey UI: `src/screens/FishboneScreen.tsx`
- Overview: `src/screens/ProjectDashboardScreen.tsx`
- Factory board: `src/ui/JobsBoard.tsx`
- Report: `src/lib/sixmReport.ts`, `src/lib/sixmStatus.ts`, `src/screens/SixMReportScreen.tsx`

---

*Review author: Cloud Agent session, 29 October 2026. Branch:
`cursor/review-6m-de14`.*
