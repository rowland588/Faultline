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
| S2 | each project kind as one module (`project/stagegate`, `project/sixm`, `project/tree`): what it is made of, its reader, its owed and done rows, its papers; `useJobInputs` reads them; the 37 branches replaced by one ask | S1, every acceptance script, paper parity |
| S3 | tools into their folders (one at a time, newest first), then the scopes; the catalogue entry names the folder | paper parity, the page inventory, `journeys.mjs` against its baseline, the full gate once at the end |
| S4 | the four biggest files split along the seams they already have (a paper's sections; a page's panels; capacity's sums apart from its words) | the same |

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

