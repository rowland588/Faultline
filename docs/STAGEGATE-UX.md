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
4. **The drawer.** *Built 16 October* (below). **Decided, with the
   reason:** the actions at a drawer's foot (plan a fix, attach a PDF,
   something to raise at the meeting, its card, delete) stay where they
   are — quiet links under the record, each used daily; the buttons that
   change its state stay the two or three under its facts.
5. **Today, calmer.** *Machine rows built 16 October*: each machine on the
   job's front page is one row, one door — to its own page — with its gates
   as its stepper (they were four buttons opening four pages).
   **Decided, with the reason:** each gate tab keeps its own Needs you. It
   is not a second list but the gate's share of the one on Today, with the
   buttons that act on it there (Commission's "Plan the re-test", "Run it
   again", "Test it"); taking it off would move the work away from the
   board it is about. **The day stays a place** in the rail: it is the
   day's checklist, carried over items, its story, its dates and its PDF —
   a page of its own, one line, opened from Today's "The day ›".
   *Needs you made quiet, 16 October* (below).
6. **Phone.** Each slice at 390 px; the bar becomes Today · Plan · Machines ·
   Programs · Problems. *Rows fitted to the phone and the desk, 16 October*
   (below); the bar stays Control room · This job · Plan · Problems · More,
   as slice 2 built it.

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

## Slices 5 and 6 as built (second part) — quiet rows, rows that fit

Measured on the seeded job before and after, at 390 px and 1360 px
(the pictures taken with each run).

| | Before | After |
|---|---|---|
| Commission, phone, page height | 2,218 px | 2,056 px |
| Today, phone, page height | 1,830 px | 1,780 px |
| Commission's board at a 1360 px desk | 151 px past its box | fits |
| Commission's board at 1100 px | 411 px sideways scroll | 98 px |
| Nothing off the side on any stage-gate page | at 390 and 1360 | at 390 and 1360 |

- **Needs you on every gate is quiet rows** (`.nd-row`): a mark down the
  left in the state's colour, the state in words in that colour, the
  title, where and why; the row's one button on the same line. They were
  boxes with a two-pixel red border and a filled red pill each — a wall of
  red on Commission — and on a phone each button sat on a line of its own.
  On a phone the where-and-why is two lines at most; the whole of it is the
  record's, one tap away. Rule 5 ("only late and failed carry colour, as a
  mark beside the words").
- **Today's critical and high-risk rows** keep the solid tag (a problem is
  solid red, CLAUDE.md) and lose the box around them: the stripe and the
  tint, what it means on one line, how it stands on two. The whole of both
  is the problem's own page.
- **Commission's test rows on a phone** (`.igm-st`) keep the name whole;
  the state sits beside it when it fits and under it, to the right, when it
  does not ("Performance run at the agreed rate" wrapped a word a line
  beside a long state).
- **A program's button stays beside it on a phone** (`.pgr`): Test it and
  Say how it went sat on a line of their own under every row; a row with
  its journey or form open still runs full width.
- **Commission's board fits its box** (`.ig-grid.cg-grid`): it kept every
  column at its widest words, so each machine's own tests — a red "didn't
  run" among them — sat off the right edge at a 1360 px desk. The squares
  keep their fingertip width and it scrolls only when even those do not fit.
- **Kept, with the reason:** the drawer's order (its files sit under its
  facts, docs/PANELS.md item 3: "yes, here they are" is part of the
  answer); the Rename beside the job's title (already the quiet button);
  the machines' gate steppers on Today (one row, one door, as slice 5 built).
- Paper: none moves — every change is how a row is drawn on screen.

## The walk — the stage gate used end to end (16 October)

Rowland, 16 October: "every single new user interface we actually designed
always seems to have a complexity. And you couldn't really navigate simply
through things like a problem ... the way things were actually synced
together or working cohesively." Each slice had been checked page by page;
the confusion lived between pages. So the five journeys a site lead makes
were walked as a first-timer — pressing what the words on the screen say,
every tap counted, a step with no control named for it a dead end, and
every place the change must reach read back. The walk is now a gate script
(`scripts/acceptance/stagegate-walk.mjs`): on the code before these fixes
it fails 12 checks; after, none.

| Journey | Before | After |
|---|---|---|
| Start a job, two machines, every gate's list (phone) | 16 taps — "give them all" on four pages | 9 taps — every gate's list in one tap |
| A stage done from the day's plan (phone) | ticked the line only; the stage stayed late on Today, its gate, the machine and the reports | the line is the stage: done everywhere, one Undo |
| A stage done in its drawer | its line on the day's plan still "to do" | reads done |
| A failed test → problem → fix → re-test (desk) | dead end after saving the problem (the drawer closed, nothing said what came next); "Fixed" threw away the drawer; "re-test — re-test" | 9 taps in one drawer with Back: the problem opens, Make it a fix, Fixed returns to it, Plan the re-test, Passed |
| A program tested (phone) | 5 taps, in step | 5 taps, in step |
| A hand-over item done (desk) | 4 taps, in step | 4 taps, in step |

What changed, where:

- **A plan line that is a stage** (its words the stage's own name, as the
  day's chip writes it) reads done once the stage is done, by any route —
  the day, the front page's "plan for today", Notes and Today's update all
  read it through `lib/huddle planFor`. Ticking it does the stage
  (`doneTodayPatch`), one Undo for both; a sign-off, a paperwork stage, a
  test and a fix open instead, to ask who signed or how it went. A line only
  ABOUT a record ("Load the Express programs" on a Programs loaded stage
  passed last week) keeps its own tick. The chips say what a tap does: "Due
  or under way today — tap to add it to the plan".
- **A problem just saved opens next** in the same drawer, Back to the record
  it was found on, where "Make it a fix" is (`RecordDrawer openSaid`,
  `WhyMoved recordProblem` returns it).
- **A state changed on a record reached from another goes back to that
  one** instead of closing the drawer (`RecordDrawer andClose`): Fixed on a
  fix returns to its problem, then its test, where Plan the re-test is. A
  record opened on its own still closes.
- **A re-test of a re-test is "— re-test" once** (`lib/testing nextFrom`).
- **Every gate's usual list in one tap** (`lib/giveGates`): on Install, for
  machines with none at two gates or more, "every gate's list at once —
  Install 6 · Set up 5 · Commission 6 · Hand over 5", each line with who it
  is usually with and, on a test, what it must show — as each gate's own
  button gives. One Undo.
- **A gate's card PDF** is offered once there is a step to print.
- **Kept, with the reason:** Programs under More on a phone (the bar is
  Control room · This job · Plan · Problems · More, as slice 2 built it);
  the front page's "The plan ›" on Needs you and on its own card — every
  panel's door is the house pattern, and on a phone the card is three
  panels further down.
- Paper: Today's update and the status report read the plan through the
  same rule, so a stage done reads done there too; nothing else moves.
