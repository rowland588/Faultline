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
2. **Plan.** The four gate pages become one Plan: Board | Timeline, and
   Install · Set up · Commission · Hand over as the board's tabs; old links
   land on the right tab; the rail drops to six places; Needs you only on
   Today (each tab says its count in one line).
3. **A machine is a page.** Its gates as a stepper, what needs something
   first, its programs and problems (the same rows as Programs); in the rail
   under Machines; every machine name opens it.
4. **The drawer.** One shape: state and name, three facts, at most three
   buttons, history folded; links open in the drawer with Back. The
   "Programs loaded" stage's drawer stops listing the programs a second time
   (its "Plan its run in Commission" moves to the program's row first).
5. **Today, calmer.** Needs you as quiet rows with a mark and one date; the
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
