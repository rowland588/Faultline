# The journey — any range of dates: what we did, what we are doing next

Rowland, 23 October: *"when you start a project we need a system to plan what
we are going to do. We should be able to tick the tools we are going to use,
to highlight what we are going to use them for. Product testing, if already
booked, it needs to show. And of course commentary from myself. We always
want a look at this week and next week we plan to do X — this is how
manufacturing projects work: we all report to someone and they need to see
what we have done and what we are doing next."* And, on the week: *"I should
be able to pick a range of reporting period ... from this date to that date.
It should then collate all the information between them two dates and allow
me to send that whole report ... the entire history ... it's the journey.
It's all of it ... I need to be able to pick a range, say that's my report
range, make a PDF and send it within that range, and change my ranges."*

This is the plan for it, placed on the app as it is (`docs/BLUEPRINT.md` §8:
which layer, which record, where it shows, what it replaces). Nothing here is
built until Rowland says go. The slices at the end (J1–J3) are build steps,
not calendar weeks.

## 1. What it is

**The journey is the project's report to whoever it reports to, between two
dates Rowland picks.** One page in the project and one paper, both saying the
same things for the range — **day by day, in order**:

1. **What we did** on each day of the range up to today — read from the
   records, never typed: the studies made, the tests run and what they
   showed, the programs proved, the actions done, the problems closed, the
   stages reached. Each line opens its record.
2. **What we are doing and what is planned** on each day of the range from
   today on — the actions due (the tool plans among them), the tests and
   program tests booked; the late in red.
3. **Commentary** — Rowland's own words, dated, on the day they were
   written, those inside the range.
4. **The range is a lens, never a record.** Nothing is stored for it: pick
   *this week*, *this week and next*, *last week*, *since the project
   started* (the whole history) or two dates, and the page and the paper
   follow; change it and they change. The default is this week and next.

And above them, set once when the project starts and changed any time:
**the tools we will use, and what for** — a tick a tool, a line of words
beside it ("Capability study — the Bagger's seal weights, before and after
the new jaws"), the week it is planned for. A ticked tool is a planned
action; a tool already used on the project shows its records beside the
tick.

## 2. Where it sits

| | |
|---|---|
| Layer (BLUEPRINT §1) | **a project** — every kind: stage gate, 6M, lever tree |
| Page | **Journey** on the project's rail, under Overview: `#/project/:id?view=journey` — a view of the project's page, as Results and Lines are (B2: a rail line is a page of its scope); the range on the address (`&from=&to=`), so a range can be sent as a link |
| Paper | **Journey report — <the range>** in the project's Reports and on the Journey page's Report ▾, made on arrival with `?save=1` (B3) for the range shown |
| Where else it shows (rule 5) | the project's front page: a *This week* line (done · doing · next week) that opens Journey on this week and next; the control room's row for the project: the same counts; the stage gate's one-page status and client report, and the 6M report: a *This week and next* section read from the same module; the project's Actions page: a tool plan wears its tool |
| What it replaces | nothing. *The day* (one date's story, stage gate) stays; the journey is the same reading over a range of days. *Needs you* stays — it is what is owed; the journey is what was done and what is planned, day by day |

## 3. The records — no fifth noun

- **A tool plan is an action** (`pace_todos`: what · why · who · due · state).
  Ticking a tool makes one — *what* "Use the capability study", *why* the
  words typed ("the Bagger's seal weights"), *due* a day in the chosen week,
  and a new field **`tool`** (the catalogue key, `src/catalogue/registry`)
  so the Journey page can draw the tick list from the actions and the Actions
  page can say which tool an action uses. Unticking deletes the action
  (with Undo). When the tool is actually used — a study made on the project
  with that tool — the plan reads *used: <the study>* and is done. One
  column: `supabase/ACTION_TOOL.sql` adds `tool text` to `pace_todos`; the
  mapper and `sync-schema.test.ts` follow.
- **Tests booked** are read as they are: a test's `plannedFor` and a
  program's `testOn`, on the project and on its lines (`lib/lineRecords`
  lineProgramsReading already says *testing 27 Oct*).
- **Commentary is a note** (`TestItem` kind `note`, `lib/noteScope`) on a
  new scope **`day`** (`day:<YYYY-MM-DD>`), so it lives with the project's
  other notes, syncs as they do, is edited and deleted where it sits, and
  falls inside whichever range holds its day.
- **What we did** is read by a new pure module **`lib/journey.ts`** — every
  day of the range, each read as `lib/day.ts` already reads one date, plus
  the studies' and problems' dates — tested on seeded projects over several
  ranges (a week, two weeks, the whole history, one day), each line naming
  its record; a range of a hundred days stays quick (one pass over the
  records, bucketed by day).

## 4. The page

Journey — the band says the project and the range (*Mon 20 Oct – Sun 2
Nov*), with the choices *This week · This week and next · Last week · Since
the start · Pick dates* (two date boxes), and *‹ earlier · later ›* to slide
the range by its own length. Then, in the lean page's order
(`docs/LEAN-PAGE.md`):

- **the tiles** — done in the range · still to do in it · late · planned
  after today — each *of* what it should be;
- **The tools we will use** — every tool of the catalogue the project can
  use, a tick each, the words beside a ticked one editable in place, its
  planned week; a tool used already shows its records;
- **the days, in order** — a heading a day (*Tue 21 Oct*), under it what
  was done that day (one line a record, each opening it), then, from today
  on, what is due or booked that day, the late in red; a day with nothing
  is skipped, said once ("3 days with nothing recorded"); the commentary
  for a day under its lines, written and edited in place; *+ Plan
  something* on a future day makes an action due then;
- the closing line — *"Line 7 pace, 20 Oct – 2 Nov: 4 done, 2 still to do
  (1 late), 3 planned."*

On a phone the days stack as they do at a desk; the tick list folds to the
ticked tools with *Every tool* under it. The whole history of a long
project is one long page — the days are the index.

## 5. The paper

**Journey report — <the range>**, the lean page on paper
(`lib/report/lean`): the band with the project and the range, the tiles,
then the days in order — each day's lines, what each showed (a test's
result, a study's sentence), who and by when for what is still to do, the
late in red, the day's commentary as written — then *The tools we are
using* (ticked, with what for) and the closing line. This week and next is
a page; the whole history runs to as many pages as it needs, every page
footed with the project and the range. Printed from the same module as the
page (`lib/journey`), so the two never part; `report-stress` takes it at
the three sizes and over three ranges, and `paper-parity` keeps it.

## 6. Slices — build steps, each gated (the quick gate) and live on its own

| Slice | What | Proof |
|---|---|---|
| J1 — **built 23 October** | the record: `tool` on actions (`supabase/ACTION_TOOL.sql`, applied as `action_tool` and read back: `pace_todos.tool text`; the mapper; the schema test); the `day` note scope (`lib/noteScope` `day:<date>`, `dayOfNote`); `lib/journey.ts` — the range and its picks (`rangeOf`, `pickOf`, `slideRange`, `rangeLabel`, `daysOf`, at most two years), the reading (`journeyOf`: a stage-gate day as `lib/day` tells it, the board's actions and tool plans, the register's problems, a study's day), the tiles and the closing line, the tool plans (`toolPlansOf`) | `src/lib/__tests__/journey.test.ts` over this week and next, last week, one day, the whole history, an empty range, a project with no gate, two years of days under a second; `noteScope.test.ts` the day scope |
| J2 | the Journey page: the range and its choices, the tick list, the days in order, the commentary on a day; the rail line; the front page's *This week* line | `scripts/acceptance/journey.mjs`: a project started, three tools ticked with their words, one unticked (Undo), a test booked showing on its day, a study made marking its plan used, the commentary kept after a reload, the range changed three ways (this week and next, two picked dates, since the start) and the page following, a range sent as a link, the phone |
| J3 | the paper: Journey report in Reports and Report ▾, made on arrival for the range shown; the status, client and 6M reports' *This week and next*; the control room's counts | the same script reads the paper back against the module for each range; `report-stress` and `paper-parity` |

## 7. What it is not

Not a Gantt (the stage gate's Plan is the gates and machines; this is the
work across them, day by day). Not a to-do list of its own (an action is the
one list of who owes what). Not a record of its own (a range is a lens; only
the commentary and the tool plans are stored). Not written by AI: every line
of *what we did* is a record's own words, and the commentary is Rowland's.
