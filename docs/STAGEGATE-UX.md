# The stage gate, redesigned so nobody gets lost

Rowland, 16 October: "we need to do a large UI design changes to the stage gat
systems it still looks, feels, very complx, nothing is clear, or clean, when i
show peole the app, i get losst in it, find dorrs that open othe rthings...
you are a Ui UX designer,, lets get tis designed corrcetly as fast". And, the
same day, on programs: "its very complex, cant edit simpley the ui very long
,, i feel we have to many views and doors to what should eb simple".

The design he was shown: https://claude.ai/artifact/15fYq6RCNvqb5rMFKLiNzx.
This file is the memory of it — the next session builds the next slice from
here (`docs/BLUEPRINT.md` §3 "Jobs" points at it).

## What got people lost (measured on the seeded job, 16 October)

| | |
|---|---|
| 13 places in one job's rail | Job, Install, Set up, Programs, Commission, Hand over, Problems, Materials, The plan, The day, Reports, Notes, Details. Four are the same page: Needs you and a machine × stage grid. |
| 5 copies of Needs you | The front page and each gate, the same items cut five ways. |
| 5 pages to follow one machine | Its four gates and Programs; its four buttons on the front page each open a different page. |
| 2,825 px: one stage's drawer | "Programs loaded": the stage, the day's plan, a button to Programs, a link to the programs report, the programs listed again. |
| 4 dates on one program row | The part's "by", the record's test day, the booked test's day, each attempt's day. |
| 46 controls on Programs, nothing opened | 8 tiles, 5 machine chips, 3 kinds of row with 2–3 pills each, a second editor folded at the foot. |

## The rules every stage-gate page follows

1. **One question a page, and its name says it.** Today: where are we and
   what needs me. Plan: every machine through every gate. A machine:
   everything about it.
2. **One home for each thing.** Everywhere else it is a line that opens it,
   never a second editor.
3. **A drawer never sends you somewhere else.** One record; a link inside it
   opens in the same drawer, with Back.
4. **One date a row, the one that matters now.** Done: the day done. Booked:
   the day booked, red once gone. Old attempts keep their days in the history.
5. **Normal is quiet.** Only late and failed carry colour, as a mark beside
   the words.
6. **Tools come out on the row being worked on.**

## The shape of a job — from 13 places to 6

Today (the job) · Plan · Machines (each machine) · Programs · Problems ·
Materials; then Reports · Notes · Details at the foot. Install, Set up,
Commission and Hand over become the Plan's four tabs (their routes land on
the tab); The day becomes Today's plan on the front page.

## The slices, each live on its own

1. **Programs — one row, one form, one date.** *Built 16 October* (below).
2. **Plan.** *Built 16 October* (below). The four gates and the timeline
   are one Plan: one line in the rail, their tabs on each page.
3. **A machine is a page.** *Built 16 October* (below).
4. **The drawer.** *First part built 16 October* (below). Still to do:
   the buttons under the facts to three at most on every kind of record.
5. **Today, calmer.** Needs you as quiet rows with a mark and one date, and
   only there — each gate tab says its count in one line instead of its own
   Needs you (moved here from slice 2: Commission's Needs you carries the
   buttons that plan a re-test, and Today must carry them first); the
   machines as steppers; today's plan folded in from The day.
6. **Phone.** Each slice at 390 px; the bar becomes Today · Plan · Machines ·
   Programs · Problems.

## Slice 1 as built — Programs

- **One row a program** (`src/ui/ProgramRow.tsx`), whatever holds it: the
  line on its machine's programs stage, a program only on the list, a line's
  own (tagged "Line 7's own"). The name, ONE status pill (the reading's,
  `lib/programsReport`), what it runs and whose (never a date), what was
  seen. The other record's word shows only when it is worse (red while the
  floor's is not), in words under the row — not a second pill.
- **One form** (`src/ui/ProgramTest.tsx`, `floor`): Passed · Baseline
  achieved · Didn't pass · Didn't run · Not tested · No program, what was
  seen, the day; the run's numbers only for a test. Passed and didn't pass
  write the proving test AND the floor's status; didn't run tells the floor
  "not tested"; the other three are the floor's alone; what was seen with
  nothing picked is kept as the line's commentary. One Undo takes back both.
- **The panel** (tap the row): name, machine, what it runs, whose, test day,
  ▲ Up / ▼ Down, Delete (the line and the record together, one Undo), its
  problems and Hit a problem, what was said of it with Take off, how it was
  proved, its run in Commission.
- **One test day**: typed on the row it sets the stage line's day, the
  record's and the booked test's together; a machine changed moves the line
  (and its problems) to that machine's programs stage, the record and its
  booked test with it.
- **Gone, and why**: the eight tiles (zero ones said nothing; the chips worth
  showing remain and the sentence says every count); the machine chip row (a
  select); "Track it here" (saying anything of a program makes its line);
  "No programs stage on this machine yet — Add Programs loaded to it" (the
  add box under every machine makes the stage); the Programs list folded at
  the foot (`ProgramsScreen embedded`, a second editor of the same programs —
  every field is on the row; its week grid duplicated the plan; it stays on
  a non-stage-gate job's Materials, where it is the only list).

## Slice 2 as built — the Plan

- **The rail** (`src/ui/rail.ts` `gatesGroup`): a stage-gate job reads its
  name, then **Plan · Programs · Problems · Materials · The day** in one
  group (it was Gates: Install · Set up · Programs · Commission · Hand over,
  then Work: Problems · Materials · The plan · The day). Plan counts every
  gate's open work with its late part, opens on the gate the job is at (the
  first with work open, else the timeline) and is lit on any gate, a step's
  or a test's own page, and the timeline.
- **The tabs** (`src/ui/PlanTabs.tsx`) on Install, Set up, Commission, Hand
  over and the timeline: each gate with its count as the rail said it (the
  number neutral, "late" red), Timeline last; the routes are unchanged, so
  every link into a gate lands on its tab. On a phone they scroll sideways,
  the one you are on in view.
- **The phone's bar**: Control room · This job · Plan (or the place of the
  job's work you are on) · Problems · More.
- **Gone, and why**: the four gate lines and "The plan" in the rail — five
  doors to one kind of page; every one is a tab now, one tap from the others.

## Slice 3 as built — a machine is a page

- **The page** (`src/screens/MachineScreen.tsx`, `#/project/:id/machine/:asset`):
  its name, where it is (red when anything on it is late), its maker and when
  it came on site; its four gates in a row, each in its colour and its words;
  then, beside each other, its stages and tests gate by gate with its
  problems, label and details (`ui/MachinePanel` in its `page` form — the
  same reading as the drawer's) and its programs (`ProgramsPage only=` — the
  same rows and form as the Programs page, under "Its programs").
- **The rail** (`rail.ts` `machinesGroup`, `Frame` `useRailMachines`): a
  stage-gate job's machines under Machines, each with its square (red late or
  failed, amber a problem with no time lost, green handed over, violet under
  way, grey nothing started) and its open stages and tests, the late part red.
- **Every machine name opens it** (`MachinePanel` `openMachine`): Programs'
  machine heads, Commission's rows, the front page's machines (Journey), and
  Install's "Everything on …". The drawer form stays for a scanned label and
  old links (`?open=`) until slice 4.

## Slice 4 as built (first part) — the drawer, short

Measured on the seeded job: the "Programs loaded" stage's drawer went from
2,825 px to about 1,300 px.

- **A programs stage says its programs; it does not edit them a second
  time** (`ui/ProgramLink`): its programs a line each with their state, and
  one button to where they are worked on — the machine's page (Programs for
  the line itself). Gone: the whole list with its editors, "Open Programs ›"
  and "Programs report ›" (the report is on Programs and the Reports sheet).
  How many and how many done is said once, beside the stage's state.
- **Plan its run in Commission** moved with them: `ui/StageParts` `PartRun`
  is the program's run at speed — said, and planned — on its row on
  Programs (and on any stage's own list that is not the programs stage).
- **A stage's story folds** to one line — its problems, the open and the
  critical in red, the hours lost — opened with a tap. A test's and a fix's
  stay open (their findings are what the record is).
- **A run's products**: one that passed, or was run again below, is one
  line in the drawer — net rate, packs, day — its figures a tap away.
- **Two layout faults** found on the way: "On today's plan" stood 260 px
  tall for one line (a flex basis meant for width); a critical problem's
  "Ways round it" wrapped a word a line. Both fixed.
- The drawer's own Back (‹ back to …) already walked the records opened
  inside it; links out of a drawer are now only to a record's home.
