# Steady — organisation and stability, so it simply works

Rowland, 23 October: *"I just want organisation and stability in the app. I
want easy flow, easy operations, that's all. I just want it to work correctly
... make a design that ensures it all works, as functional as possible."*
And, the same day, his model of the app: *"build your factory, areas, lines,
then projects — pick your project type — and there we have the full
ecosystem. Each project is independent from the other; everything inside it
is connected and in sync as we use tools, reports, the project."*

This is the design that makes that true, and the order it is done in. It
changes nothing a person sees: no record, no policy, no address, no paper.
It is done after J3 (`docs/JOURNEY.md`) and before anything new is built.

## 1. What is true today (23 October, reviewed)

- **The flow is as Rowland says.** Three scopes (`docs/STRUCTURE.md`): the
  factory and its lines; a line; a project. A project picks its kind, points
  at its lines, and everything done inside it carries its project id and is
  gathered by one reader (`lib/useJobInputs`) for the front page, Needs you,
  Actions, the Journey, the papers and the control room.
- **The one deliberate exception: lines are shared, not inside projects**
  (Rowland, 21 October: the factory stays shared). A problem, a program, a
  machine, a study or a standard belongs to its line first and to a project
  when it is pulled in; two projects on one line see the same register and
  programs. A project is a lens on its lines plus its own records.
- **Three project kinds are three data shapes.** A stage gate: tests, items,
  machines. A 6M project: lines, actions, targets, readings, cases. A lever
  tree: tree nodes. The shared tools — materials, programs, studies, problems,
  notes, actions, the journey — work across all three. 22 files branch on the
  kind (`planModel(`), 37 branches in the screens alone.
- **Two rule sets for access**: a project's records by the project's level
  (`useAccess(projectId)`), a line's own by the line's policies. Correct,
  and two systems to keep in step.
- **The separation lives in the tests, not the folders.** The gate (49
  scripts, the schema test, the page inventory, paper parity) is what keeps
  it working. On disk: `src/lib` is flat, 191 files and 43,000 lines;
  `src/screens` 74 files and 30,000; `src/ui` 108 and 19,000. The four
  biggest files are 1,200–3,200 lines (`lib/paceReportPdf`,
  `screens/PaceExecReport`, `lib/capacity`, `lib/sixmReportPdf`). A tool's
  parts sit in six places — its model, its arithmetic (`lib/ie`), its paper
  (`lib/*Pdf`), its page, its catalogue entry, its acceptance script — and
  only the catalogue (`src/catalogue`) ties them together.

## 2. The four rules

1. **One reader per scope.** A project has one reader that says what it is
   made of, and every page and paper reads from it — the front page, Needs
   you, Actions, the Journey, the status report, the client report, the
   control room's row. No page fetches a project's records on its own. A
   line (`lib/lineBundle`, `lib/lineRecords`) and the factory get the same.
2. **One number, everywhere.** A check in the gate seeds a project and reads
   late · open · done · critical from every place that shows them; any two
   that differ fail the gate. Stability is not "nothing breaks" — it is
   "nothing can disagree".
3. **One place per thing in the code.** A folder per scope — `factory/`,
   `line/`, `project/` (split `stagegate/`, `sixm/`, `tree/`, `shared/`) —
   and a folder per tool holding its model, its arithmetic, its page and its
   paper, named by its catalogue key. The report engine (`lib/report/`), the
   cloud (`cloud/`), the store (`db/`) and the frame (`ui/`) stay where they
   are. Moves only: no paper, page, route or record changes.
4. **One answer per project kind.** Each kind says once what it is made of
   and how it is read (its records, its owed rows, its done things, its
   papers). The places that ask "which kind is this?" ask that module.

## 3. The slices — each a gate of its own, live before the next

| Slice | What | Proof it changed nothing |
|---|---|---|
| S1 — **built 23 October** (§5) | the *one number* check (`scripts/acceptance/one-number.mjs`): on the seeded stage-gate and 6M projects, late · open · done · critical read from the front page's band, Needs you, Actions' tiles, the Journey's tiles, the status report, the client report and the control room's row — all equal | it passes on today's code, or it finds a real disagreement, which is fixed first |
| S2 — **built 23 October** (§6) | each project kind as one module (`project/stagegate`, `project/sixm`, `project/tree`): what it is made of, its reader, its owed and done rows, its papers; `useJobInputs` reads them; the 37 branches replaced by one ask | S1, every acceptance script, paper parity |
| S3 — **begun 23 October** (§7) | tools into their folders (one at a time, newest first), then the scopes; the catalogue entry names the folder | paper parity, the page inventory, `journeys.mjs` against its baseline, the full gate once at the end |
| S4 — **built 23 October** (§8) | the four biggest files split along the seams they already have (a paper's sections; a page's panels; capacity's sums apart from its words) | the same |

Nothing new is built during S1–S4. Each slice is small enough to revert on
its own. The catalogue's `built.files` is updated as files move, so
`scripts/catalogue.mjs check` keeps the index truthful.

## 4. Not in this

Not a rewrite. Not a change to any record or policy (`docs/BLUEPRINT.md` §2
stands). Not a change to any address (`docs/STRUCTURE.md` §20 — no slice
changes a record, a policy or an address). Not a new noun.

## 5. S1 — what the check found, 23 October

`scripts/acceptance/one-number.mjs` read late and open from the band, Needs
you, Actions, the Journey, the status report on paper and the control room,
on the seeded stage-gate and 6M projects. It found four disagreements, all
real, all fixed before it was allowed to pass:

- **The Journey counted a failure today as late.** A part of the plan that
  failed today was in the day's "did not go to plan" and in the Journey's
  late. Now a line is late only when the day says so (its *late* list, an
  action or a register problem past its day): the stage gate said 5 late on
  the Journey and 4 everywhere else; it says 4.
- **A 6M project's late was two numbers.** Its band's Countermeasures tile
  and its status report said 2 (countermeasures past their day); the control
  room, Needs you and Actions said 5 (the materials and the program past
  their day too). The report now carries everything owed (`sixmReport`
  `owed`, from `lib/portfolio pacedOwed` — the same rows the control room
  counts); the closing line and the status's LATE line say it whole ("5 late
  — 2 countermeasures, 2 materials, 1 program"); the Countermeasures tile
  keeps its own count under its own name.
- **A 6M project's Journey could not see its materials and programs.** It
  read the board and the register only; a stage gate's read them through the
  day. A project with no gate now reads its materials, programs and studies
  by the day's own rules (`lib/day`), so its Journey and its week line say
  the same late as the rest.
- **Actions' Open was a number nobody could reconcile.** The band says "of
  18 still to do" (the plan's own rows, `lib/standing`); Actions said 21 (the
  critical problems, the register's problems taken for the project and its
  own actions besides). Its tile now says of what — "18 on the plan · 1 high
  risk · 1 of its own · 1 from the register" — so the parts add up to its
  number and the plan's part is the band's.

The rules the check holds from here: **late** is one number in every place
(everything the project owes that is past its day); **still to do** on the
band, the status report and the control room is the plan's own rows (a 6M
project's countermeasures), and Actions' open is everything owed, said of
what; the control room's row owes what Actions owes; *This week and next*
says the same late. S2 folds the extra owed rows into the one reader, so the
band can count them too.

## 6. S2 — one reader, one answer per kind, 23 October

- **`lib/projectRead`** is the one reader. `projectRead(project, inputs,
  own)` takes the method's records as the control room reads them
  (`lib/useJobInputs`) and what every kind has — its own actions, the
  register's problems taken for it, its notes, its studies, its lines — and
  returns the kind, everything owed and done (`owedAndDone`, one rule for a
  stage gate and for a 6M or tree project), the journey's input
  (`journeyInputOf`) and the week line. `useProjectRead(project)` is the one
  hook. `useJourney` and `useProjectActions` read from it; the control
  room's Actions reads every project by the same rule. The pure parts are
  tested (`projectRead.test.ts`).
- **`lib/projectKind`** is the one answer per kind: `kindOf` (stage gate ·
  6M · lever tree), and for each its word, its own work (what "still to do"
  counts), its report page and its papers, the journey report on every one.
  The project's Report ▾ and the Reports list read their papers from it.
- **What did not move yet.** The screens still ask the model directly in
  the places that draw a kind's own pages (the set-up screen, the day, the
  front page's method-specific folds, Quick problems). S3 moves those pages
  into their kind's folder; the ask goes with them. The band's "still to do"
  stays the plan's own rows (S1's rule); the reader carries the whole owed
  list beside it for the day it is wanted on the band.

## 7. S3 — the code in its places, 23 October (begun)

- **`scripts/moves.mjs` moves files and keeps every import true** — static
  and dynamic, in `src/` (relative, resolved against the importing file's
  own directory, old or new) and in `scripts/` (the dev server's `/src/…`
  form) — then `git mv`s them. A move is proved by `tsc`, the unit tests,
  the catalogue's own test (every path an entry or a knowledge record names
  must exist) and the gate; nothing a person sees changes.
- **The places**: `src/project/` holds what is a project's (`projectRead`,
  `projectKind`, and `journey/` — the journey's model, paper, reader and
  page); `src/line/report/` the line report (`lineBundle`, its paper, its
  page); `src/tools/<key>/` a tool by its catalogue key — the first is
  `reliability/` (its arithmetic, its lean reading, its page, its test),
  the catalogue's `built` paths and the knowledge records moved with it.
  A new tool is built in its own folder from the start; an older one is
  moved when it is next worked on, with this tool.
- **Not moved yet**: the other ten tools (`src/lib/ie/*`, their pages in
  `src/screens/`), the stage gate's and the 6M's own pages, the factory's.
  Each moves with the same tool and the same proof, one at a time.

## 8. S4 — the four biggest files split at their seams, 23 October

Nothing moved between modules that was not already a seam in the file; a
name that was imported from the old file is still imported from it (the old
file re-exports what left it), so no importer outside the four had to
change for the paper, and the capacity importers were pointed at the file
that now holds the name. Each split was proved by `tsc`, the lint ceiling,
every unit test, the tool's own acceptance script, `report-stress` and
paper parity against what is live.

- **The stage-gate paper** (`lib/paceReportPdf`, 3,225 lines → 1,395): a
  sheet a file in `lib/paceReport/` — `data` (what the paper is drawn
  from), `plan`, `materials`, `install`, `trials`, `programs`, `board`,
  `tree`, `owes` — each exporting what the sheet is laid out by (its
  `*Plan`, `*Height`, `layBoard`, `packColumns`, `flowOwes`), with
  `drawPaceReport` and `readPages` staying where they were.
- **The A3 and the 6M report's screen** (`screens/PaceExecReport`, 3,200 →
  1,368): the A3's pages in `screens/paceReportPages`, the 6M report's
  screen and its PDF in `screens/SixMReportScreen`.
- **The 6M report** (`lib/sixmReportPdf`, 1,200 → 914): its model in
  `lib/sixmReport` (the types, `sixmReport()`, everything owed, the week
  line), the paper left in `sixmReportPdf`.
- **Line capacity** (`lib/capacity`, 1,944 → 1,752): the sums stay; how a
  figure is written is `lib/capacityWords` (`fmtN`, `fmtBig`, `oneOf`,
  `fmtSec`, `fmtDur`, `everyWords`, `cycleWords` — imports nothing) and
  what the result says is `lib/capacitySays` (`rateAsTime`, `paceSays`,
  `shortSays`, `canMakeWords`), so no file imports a file that imports it.

What is still big and why it is left: `lib/capacity` (the sums of one tool,
one seam each — the lanes, the screening, the shift — and each already
tested on its own), `cloud/sync` (one engine, the cycle in `CLAUDE.md`'s
*Things that will bite* — not to be split without the sync harness run
beside it) and `screens/CapacityPanel` (the one tool's one page; its panels
are the next seam, when the tool is next worked on, and it moves into
`src/tools/` then).

