# The week — what we did, what we are doing next

Rowland, 23 October: *"when you start a project we need a system to plan what
we are going to do. We should be able to tick the tools we are going to use,
to highlight what we are going to use them for. Product testing, if already
booked, it needs to show. And of course commentary from myself. We always
want a look at this week and next week we plan to do X — this is how
manufacturing projects work: we all report to someone and they need to see
what we have done and what we are doing next."*

This is the plan for it, placed on the app as it is (`docs/BLUEPRINT.md` §8:
which layer, which record, where it shows, what it replaces). Nothing here is
built until Rowland says go.

## 1. What it is

**The week is the project's report to whoever it reports to.** One page in
the project and one paper, both saying the same four things for one week:

1. **What we did this week** — read from the records, never typed: the
   studies made, the tests run and what they showed, the programs proved,
   the actions done, the problems closed, the stages reached. Each line
   opens its record.
2. **What we are doing — this week, still open** — the actions due this
   week (the tool plans among them), the tests and program tests booked
   this week, the late ones in red.
3. **What we plan to do next week** — the same, for the week after.
4. **Commentary** — Rowland's own words for the week, dated, kept.

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
| Page | **Week** on the project's rail, under Overview: `#/project/:id?view=week` — a view of the project's page, as Results and Lines are (B2: a rail line is a page of its scope) |
| Paper | **Week report — this week and next** in the project's Reports and on the Week page's Report ▾, made on arrival with `?save=1` (B3) |
| Where else it shows (rule 5) | the project's front page: a *This week* line (done · doing · next week) that opens Week; the control room's row for the project: the same counts; the stage gate's one-page status and client report, and the 6M report: a *This week and next* section read from the same module; the project's Actions page: a tool plan wears its tool |
| What it replaces | nothing. *The day* (one date's story, stage gate) stays; the week reads seven days of the same records. *Needs you* stays — it is what is owed; the week is what was done and what is planned |

## 3. The records — no fifth noun

- **A tool plan is an action** (`pace_todos`: what · why · who · due · state).
  Ticking a tool makes one — *what* "Use the capability study", *why* the
  words typed ("the Bagger's seal weights"), *due* a day in the chosen week,
  and a new field **`tool`** (the catalogue key, `src/catalogue/registry`)
  so the Week page can draw the tick list from the actions and the Actions
  page can say which tool an action uses. Unticking deletes the action
  (with Undo). When the tool is actually used — a study made on the project
  with that tool — the plan reads *used: <the study>* and is done. One
  column: `supabase/ACTION_TOOL.sql` adds `tool text` to `pace_todos`; the
  mapper and `sync-schema.test.ts` follow.
- **Tests booked** are read as they are: a test's `plannedFor` and a
  program's `testOn`, on the project and on its lines (`lib/lineRecords`
  lineProgramsReading already says *testing 27 Oct*).
- **Commentary is a note** (`TestItem` kind `note`, `lib/noteScope`) on a
  new scope **`week`** (`week:<Monday>`), so it lives with the project's
  other notes, syncs as they do, and is edited and deleted where it sits.
- **What we did** is read by a new pure module **`lib/week.ts`**, seven days
  of what `lib/day.ts` already reads for one date, plus the studies' and
  problems' dates — tested on seeded projects, each line naming its record.

## 4. The page

Week — the band says the project and the week (*Mon 20 – Sun 26 Oct*), with
*‹ last week · next week ›* and *This week*. Then, in the lean page's order
(`docs/LEAN-PAGE.md`):

- **the tiles** — done this week · still to do this week · late · planned
  next week — each *of* what it should be;
- **The tools we will use** — every tool of the catalogue the project can
  use, a tick each, the words beside a ticked one editable in place, its
  week; a tool used already shows its records;
- **This week — done** — one line a record, each opening it;
- **This week — doing** — actions due, tests booked, program tests booked,
  the late in red with the day;
- **Next week — planned** — the same for the week after; *+ Plan something
  for next week* makes an action due then;
- **Commentary** — the week's note, written and edited in place;
- the closing line — *"Line 7 pace: 4 done, 2 to do this week (1 late);
  3 planned next week."*

On a phone the four lists stack; the tick list folds to the ticked tools
with *Every tool* under it.

## 5. The paper

**Week report — this week and next**, one page by default (the lean page on
paper, `lib/report/lean`): the band, the tiles, *What we did* (each line
with its day and what it showed — a test's result, a study's sentence),
*What we are doing* (who, by when, the late in red), *Next week* (the same),
*Commentary* (the words as written, dated), *The tools we are using* (ticked,
with what for), the closing line. Printed from the same module as the page
(`lib/week`), so the two never part; `report-stress` takes it at the three
sizes and `paper-parity` keeps it.

## 6. Slices — each gated (the quick gate) and live on its own

| Slice | What | Proof |
|---|---|---|
| W1 | the record: `tool` on actions (SQL applied and read back, mapper, schema test); the `week` note scope; `lib/week.ts` and its tests | `vitest`; the live column read back |
| W2 | the Week page: the tick list, the four lists, the commentary, the band's weeks; the rail line; the front page's *This week* line | `scripts/acceptance/week.mjs`: a project started, three tools ticked with their words, one unticked (Undo), a test booked showing under this week, a study made marking its plan used, the commentary kept after a reload, last week · next week, the phone |
| W3 | the paper: Week report in Reports and Report ▾, made on arrival; the status, client and 6M reports' *This week and next*; the control room's counts | the same script reads the paper back against the module; `report-stress` and `paper-parity` |

## 7. What it is not

Not a Gantt (the stage gate's Plan is the gates and machines; this is the
week's work across them). Not a to-do list of its own (an action is the
one list of who owes what). Not written by AI: every line of *what we did*
is a record's own words, and the commentary is Rowland's.
