# Faultline — the map

Every screen, what it is for, what it reads and writes, where it shows up in
the control room and which report carries it. Kept so that anyone — Rowland,
a reviewer, the next session — can say what a screen is for before touching
it, and so a control that opens nothing has nowhere to hide.

The rule for keeping it true: **a new screen, lens, door or PDF adds a row
here and a route in `scripts/smoke.mjs` in the same commit.** A row that
cannot answer "which change does it belong to, which record does it read or
write, where does it show up in the control-room view and the report" is a
feature, not part of the control room (`CLAUDE.md`), and the map says so.

## The shape

```
Home — the control room                      #/            WorkspaceHome
 └─ a change to a line = a PROJECT, on one of three methods
     ├─ Stage gate   (stored `commissioning`)  #/project/P   new equipment through its gates
     ├─ 3P           (stored `board`)          #/project/P   a running line, week by week on the board
     └─ Lever tree   (stored `tree`)           #/project/P   one outcome worked down to what must be true
         └─ its lines                          #/project/P/line/L
             └─ tools used inside the change    #/w/W/…       the filmed walk, the stopwatch, evidence, the case
```

- **The record is the project** (`src/db/projects.ts`, `src/types.ts`). Lines
  hang off it (`src/db/pace.ts`), people off lines, actions off the project
  with a line (`src/lib/actions.ts`), and every tool writes into a workspace
  the line owns (`projects.walk_workspace_id`, `pace_lines.workspace_id`).
- **The method is decided once** in `src/lib/planModel.ts` (`MODELS`): the
  situation that starts it, the question it answers, how it is organised, its
  rhythm, what done means, what it prints. A fourth method is one more entry.
- **The reports** are the method's document, built from the same records the
  screens read, never typed: stage gate → `src/lib/clientReportPdf.ts` (+ the
  trial card, test and fix cards, the day report, the standard); 3P and lever
  tree → `src/lib/paceReportPdf.ts` with its screen twin `PaceExecReport.tsx`
  (the page and the file draw from one block each, so they cannot disagree).
- **Data** lives on the device (IndexedDB, `src/db/*`) and syncs to Supabase
  (`src/cloud/sync.ts`, `src/cloud/mappers.ts`); the three refresh rules and
  the write path are in `docs/DATAFLOW.md`.

## The three methods, as stored and as shown

| Shown as | Stored as | Starts from | The question | Organised as | Rhythm | Done | Prints |
|---|---|---|---|---|---|---|---|
| Stage gate | `commissioning` | Bring new equipment into use | Is the equipment proved to what was agreed, so it can be accepted? | Machines through Install · Set up · Commission · Hand over; tests with agreed pass marks; fixes; materials; programs | Daily, at the line | Handed over | Client report · test and fix cards |
| 3P | `board` | Make a running line perform better | What is holding this line back, and who is on it this week? | Lines with owners and sponsors; actions sorted People · Plant · Process on the board | Weekly, in the meeting | At target, and holding | The 3P board · client report |
| Lever tree | `tree` | Hit a number by a date | What has to be true to reach this outcome, and is it being done? | Outcome → levers → conditions → the work under each | Monthly, with the sponsor | The outcome proved | The tree on one page · client report |

## The route table

Hash routes, parsed in `src/state/useRoute.ts`, rendered in `src/router.tsx`
(project-level) and `src/screens/AppShell.tsx` (inside a workspace). P = a
project id, L = a line id, W = a workspace id.

| Route | Screen | Area map |
|---|---|---|
| `#/` | `WorkspaceHome` — the control room | [tree-and-control-room](map/tree-and-control-room.md) |
| `#/projects` | `ProjectsScreen` — the list, New project | tree-and-control-room |
| `#/guide`, `#/portfolio` | go Home (inventory out) | tree-and-control-room |
| `#/project/P` (+ `?view=lines|next|wins|snags|data`) | `ProjectDashboardScreen` — the project page, shaped by its method | stage-gate-gates-and-plan · 3p-and-the-line · tree-and-control-room |
| `#/project/P/setup` | `ProjectSetupScreen` | same three |
| `#/project/P/plan` | `PlanScreen` — the job's dated work as a Gantt (was a fold on the front page) | stage-gate-gates-and-plan |
| `#/project/P/line/L` (+ `?view=next|wins|snags|data|capacity`) | `ProjectLineScreen` — one line's pack | [3p-and-the-line](map/3p-and-the-line.md) |
| `#/project/P/board` | `BoardScreen` — 3P board; a tree job writes here too | 3p-and-the-line |
| `#/project/P/tree` | `LeverTree` | tree-and-control-room |
| `#/project/P/pareto` | `ParetoScreen` — the Pareto from timed losses | 3p-and-the-line |
| `#/project/P/materials`, `/programs` | `MaterialsScreen`, `ProgramsScreen` | stage-gate-gates-and-plan (also on 3P and tree jobs) |
| `#/project/P/notes` | `NotesScreen` — meeting notes and reminders | stage-gate-gates-and-plan |
| `#/project/P/install`, `/set-up`, `/handover` | `InstallScreen` — the three gate grids | [stage-gate-gates-and-plan](map/stage-gate-gates-and-plan.md) |
| `#/project/P/day` (+ `?d=`) | `DayScreen` — the day, and a past day | stage-gate-gates-and-plan |
| `#/project/P/testing`, `/testing/T`, `/testing/T/card` | `TestsScreen`, `TestScreen`, `TrialCardScreen` — the Commission gate | [stage-gate-tests-and-report](map/stage-gate-tests-and-report.md) |
| `#/project/P/commissioning/…` | old links → the tests list | stage-gate-tests-and-report |
| `#/project/P/fixes` | `FixesScreen` | stage-gate-tests-and-report |
| `#/project/P/standard`, `/standard/S` | `StandardScreen` — the line standard | stage-gate-tests-and-report |
| `#/project/P/report` | `ClientReportScreen` — the stage-gate client report | stage-gate-tests-and-report |
| `#/pace-report?project=P` (+ `&line=L`) | `PaceExecReport` — the 3P / lever-tree client report, page and PDF | 3p-and-the-line · tree-and-control-room |
| `#/w/W/capture`, `/analyse`, `/walk`, `/line`, `/segment/S`, `/asset/A`, `/history/A`, `/snags`, `/snaglist`, `/case/C`, `/meeting`, `/report`, `/trend`, `/settings`, `/people`, `/log`, `/present` | the tools inside a workspace (`AppShell`) | [walk-and-workspace-tools](map/walk-and-workspace-tools.md) |
| `#/w/W` | resume where you were in that workspace | walk-and-workspace-tools |

A route with no screen of its own: `#/w/W/history` without an asset id, or a
segment/asset/case id that is gone, lands on capture or says the record is
gone — never a blank page (see `useRoute.ts`, `NEEDS_ID`).

## The area maps

- [Stage gate — the gates and the plan](map/stage-gate-gates-and-plan.md): the project page, setup, Install · Set up · Hand over, the plan (Gantt), the day, materials, programs, notes.
- [Stage gate — tests, fixes, the record and the report](map/stage-gate-tests-and-report.md): the Commission gate, one test, the trial card, fixes, the line standard, the client report PDF.
- [3P and the line](map/3p-and-the-line.md): the board, the line's pack and its lenses, the line balance, the Pareto, the 3P client report page and PDF.
- [The lever tree, the control room, and getting around](map/tree-and-control-room.md): the tree, Home, the projects list and New project, setup, people, the breadcrumb spine, the route table's dead ends.
- [The walk and the tools inside a workspace](map/walk-and-workspace-tools.md): capture, analyse, the walk, evidence, the case, the workspace meeting and report, settings and people.

## How it is checked

The gate in `CLAUDE.md`: typecheck, lint at the ceiling, unit tests, build,
`scripts/smoke.mjs` (every route above, seeded, no console error) and the
live-schema check. Anything a person sees is also driven in a real browser,
phone and desktop, before it is called done.
