# The stage gate, rebuilt round its real things

Rowland, 26 October, after a full day running a stage-gate project live:

> "Stage gate offers program, pass, fail, run a fix on it, which then opens up
> another window, which then opens up another door … I can't run a test and then
> say I'm retesting because of the same thing, we've done this change … when it
> came back to me being able to understand the current state, report back to the
> business of this is where we are, I couldn't easily do that … it's all about the
> program … we have another user interface for another user interface."

> "What I don't see is how it fits in with the rest of the app — the day, the
> journey … As we implement something, we need to understand the connections to
> everything else … You're trying to shoehorn this in … Don't be scared about
> ripping everything out and putting the right thing in place … create the right
> app, not tweak the one that we have. If it means streamlining, then that's what
> we do. If it means one home for things, then that's what we have."

**So this is a clean sheet for the stage gate**, not a page added to it. It
supersedes `docs/TEST-CENTRE.md` Part 4 for stage gate (Parts 1–3 stay as the
wider thinking). It is a design for Rowland to decide; **nothing is built until he
says go** (`docs/DIRECTION.md`), and when it is, it is built in slices that are each
live on their own, with every old address landing somewhere true
(`docs/STRUCTURE.md` §18).

---

## 1. What a stage-gate project is for — the one sentence

**Take new equipment from arrival to handover, machine by machine, and prove that
every machine and every program does what was agreed — and be able to say, at any
moment, where we are and why.**

Everything on the screen either moves that forward or reports it. Anything else goes.

## 2. What is wrong today — the structure, not the screens

Counted from the code and `docs/PAGES.md`, 26 October:

**Too many places, each a partial view of the same few records.** A stage-gate
project has, on its rail: *Overview · Plan* (with five tabs: *Timeline · Install ·
Set up · Commission · Hand over*) *· each machine · Programs · Materials · The day ·
Journey · Actions · Problems · Tools · Notes · Reports · Details* — **16 places (13
working ones and 3 at the foot) and a page per machine**. Four of them answer *what is happening, when* (the Day, the
Journey, the Timeline, the plan's dates); four answer *what is each machine at*
(the four gate pages, which are one board with a different column set); three
answer *what is owed* (Needs you on the front page, on each gate, and Actions).

**One fact, four records.** *"Program 5 passed"* is written to the test's outcome,
the programs-stage *part's* status, the program's state and a study's verdict, kept
level by "the newer wins" rules (`docs/TEST-CENTRE.md` §15). The programs stage's
*parts* are a second list of the programs, with their own statuses — *Baseline · Not
tested · No program* — that a program does not have.

**Twelve doors that ask "did it pass?"** (`docs/TEST-CENTRE.md` §14), two forms for
one test's numbers, and a loop — *test → problem → fix → retest* — that crosses
**eight screens** and never records that the retest is *because of* the fix
(§20 there).

**The business's question has no page.** *"Where are we?"* is spread across the
Overview's verdict, Commission's tiles, the Programs list, the Problems page and the
Day — and none of them says, for a program, *failed → fixed → retest booked*.

## 3. The real things — one home each

A stage-gate project holds these, and only these:

| Thing | Is | Its one home | Held in (today's records) |
|---|---|---|---|
| **Machine** | a piece of equipment coming in, on a line | **its page** — the place it lives | `commission_assets` (+ the line's name list) |
| **Stage** | a step a machine passes on its way (arrived, installed, guarded, powered …), grouped into gates | **its machine's page**, in its gate | `tests` of kind *install* |
| **Program** | what a machine runs, for its products — the thing proved by running it | **its page, under its machine** | `programs` — **the only place a program's status lives** |
| **Run** | one attempt at a test — of a program at rate, or of a machine (an acceptance test: e-stops, guarding, a FAT/SAT item) | **its program's (or machine's) ladder** | `tests` of kind *test*, `fromTestId`; **+ the fix it follows** |
| **Measurement** | a tool used on a run — capability, pass or fail, reliability, a chart | **under its run** | `studies`, `uses` role *proof* kind *test* |
| **Problem** | something found — on a run, a stage, a walk | **the project's Problems**, and shown where it was found | `test_items` *found*, `snags` taken for the project |
| **Fix** | the change made for a problem — what, who, by when | **under its problem** | `tests` of kind *fix* |
| **Material** | something waited on | **Materials** | `materials` |
| **Note / document / photo** | what was said, sent, seen | where it was taken | as now |

**What leaves the records' meaning (not deleted — read once, then no longer written):**
the programs-stage **parts as a second list of programs**. A *Programs loaded* stage
becomes what it is — a stage on the machine, done when its programs are loaded — and
each program's status is read from the **program and its runs**. The floor's three
words map onto things a program already has: *No program* = the program's state
*not written*; *Not tested* = a run that *didn't run*, or none yet; *Baseline
achieved* = a run that **passed at baseline settings** (a run's own word, decided in
§11). Existing parts' statuses are carried into runs once, by a migration that keeps
every part readable as history (rule 1: nothing removed until its replacement is
proved).

## 4. The places — from 16 to 11

The rail for a stage-gate project, **from 16 places to 11** (13 working places to 8):

```
↑ Factory
LINE 2 COMMISSIONING
  Where we are          the front: the answer for the business
  Machines              the board — every machine × its stages, gates as columns
     Ilapak wrapper ›   a machine's page (its stages, its programs, its problems)
     Case packer ›
  Programs              every program, by machine, in its loop state
  Problems              found → fix → proved, every one
  Actions               who owes what by when — everything owed, one list
  Timeline              today · a range · the Gantt — everything dated, one place
  Materials
  Tools
  ─────────────
  Notes · Reports · Details
```

What each one **replaces**, and why the replacement is better:

| New place | Replaces | Why better (the sentence rule 1 asks for) |
|---|---|---|
| **Where we are** | Overview (front page) | It answers *the business's* question — each machine's gate, each program's loop state, the open problems with their fixes, this week and next — on one screen and one page of paper. |
| **Machines** (the board) | Plan's *Install · Set up · Commission · Hand over* tabs (four pages of the same grid) | One grid, the gates as column groups; the gate you care about is a chip, not a different page. Commission's tests sit on the board as the machine's acceptance runs. |
| **A machine's page** | the machine page (kept, and becomes the place) | Its stages, its programs and its problems — **everything about one machine**, every action inline. |
| **Programs** | Programs page + Commission's program cells + the programs-stage parts | **One list, one record**: each program in its loop state (§6), opening its ladder. |
| **Problems** | Problems (kept) | Each problem shows its fix and **its proof** (the retest that follows the fix). |
| **Actions** | Actions + every **Needs you** strip (front page, each gate, Commission) | One list of what is owed; *Needs you* is its top, embedded on *Where we are* — not a fourth copy. |
| **Timeline** | The Day + Journey + Plan's Timeline tab | Three lenses over the same dated records become **one page with three views** — *Today* (the day and its update to send) · *Range* (the journey, any two dates, the commentary) · *Gantt* (the plan) — so a date is never seen in one and missing from another. |
| Materials, Tools, Notes, Reports, Details | (kept) | — |

**Gone as places** (their addresses kept, each landing on its new home): the four
gate tabs (→ Machines, gate chip set), The day and Journey (→ Timeline, view set),
Commission (→ Machines, Commission chip; its programs → Programs), the test's own
page (→ its program's or machine's ladder, the run open), the separate Needs you
strips.

## 5. One way in, one form, one write

- **Every action expands where you are** — the ladder on a program, a machine's
  stage, a problem's fix. **No second window for a run, a problem or a fix.** The
  record drawer stays for *opening* a record from a list (Actions, Timeline,
  Problems) and shows the same inline actions.
- **One result form — *How it went*** (`docs/TEST-CENTRE.md` §16.1): *Passed ·
  Didn't pass · Didn't run* (+ *Passed at baseline* on a program), the day, what was
  set, what it did, what was seen, the measurements, and — if it follows a fix — that
  fix named. Every door opens this form; there is no other.
- **One write** (`recordRun`): the run's outcome and numbers, the program's state, the
  measurements' link — in one place. The "newer wins" reconciliation goes, because
  there is one record of each fact.

## 6. The program's loop — what "where we are" means for a program

Derived from the program, its runs, its problems and their fixes (nothing stored):

| State | Means |
|---|---|
| **Not written** | the program does not exist yet |
| **To test** | written; no run, or one booked |
| **Ran — no verdict** | a run happened; nobody has said how it went |
| **Passed** | its newest run passed (the day, the rate) |
| **Failed — no fix yet** | its newest run didn't pass; no fix raised |
| **Fix under way** | a fix for that failure is open (who, by when) |
| **Fixed — retest to book** | the fix is done; no run after it |
| **Retest booked** | a run is booked **after the fix** |

A program's line, everywhere it is said: *"Program 5 — failed 25 Oct (seal jaws cold)
→ fix: raise jaw temperature, Dave, done 26 Oct → retest booked 29 Oct."*

The same loop applies to a **machine's acceptance test** (e-stops, guarding): run →
problem → fix → run again.

## 7. The program's page (inside its machine)

```
Machines › Ilapak flow wrapper › PROGRAM 5 — Express 1.25 kg                    ┃ RETEST BOOKED ┃
Runs Tesco Express 1.25 kg · aim 60 ppm for 60 min · with Ilapak UK

 RUN 1   25 Oct   DIDN'T PASS    set 60 ppm · ran 30 min · 1,700 packs · 20 rejects · netted 56.3 ppm
         seen: seal jaws cold
         measured:  capability "60 ppm"  ✗ Cpk 0.90    pass or fail  ✗ 3 of 20            [ + a tool ▾ ]
         ┗ PROBLEM  seal jaws not reaching temperature · High
             ┗ FIX  raise jaw temperature 160 → 170 °C · Dave · agreed 26 Oct · DONE 26 Oct
 RUN 2   29 Oct   AFTER THE FIX ABOVE    BOOKED · Ilapak UK
         [ How it went ]   [ Take the readings ▾ ]

 [ Hit a problem ]   [ Book a run ]   [ Sign off by hand ]                               Report ▾
```

Everything inline; the ladder is the story; the pill is the loop state.

## 8. The connections — every thing, everywhere it is seen

This is the table Rowland asked for: a record and **every place it shows**, screen and
paper, so nothing is entered in one place and missing from another (CLAUDE.md rule 5).

| Thing | Where we are | Machines (board) | Machine page | Programs | Problems | Actions | Timeline | Reports | Outside the project |
|---|---|---|---|---|---|---|---|---|---|
| **Machine** | a row: its gate, its programs' states, open problems, next date | a row | the page | the group heading | where found | — | its stages' dates | every paper, a section each | the line's page (its machines), the factory's *Lines* |
| **Stage** | counted in its machine's gate | a cell | in its gate, inline *Done today · Hit a problem* | — | where found | if owed (who, by when) | its day (Today, Range, Gantt) | commissioning, handover, status | the control room's late count |
| **Program** | the count by loop state + the sentence | a count in the machine's *Programs* cell | a row a program → its page | a row, its loop line | where found | a retest booked, a fix owed | its runs on their days | Programs report (the loop line), status 1 page, client, commissioning, handover's open list | the line's *Programs* (a line's programs include its projects'), the factory's *Programs* |
| **Run** | in its program's state | the machine's acceptance runs | under its program or stage | the ladder | its problems | booked → who, when; ran without a verdict → owed | Today: *ran · how it went*; Range; Gantt bar | commissioning (each attempt), test cards, the day's update | — |
| **Measurement** | in the run's line | — | under its run | under its run | as evidence | readings owed | the day it was taken | under its run on every paper; the study's own paper | the line's *Tools*, the tool's own list |
| **Problem** | open count, critical first | a red mark on the cell | under where found | under its run | the row | its fix owed | its fix's day | Problems report and cards, status, client | the factory's *Problems*, the control room's critical list |
| **Fix** | in *fix under way* | — | under its problem | under its problem in the ladder | under the problem with its proof | owed: who, by when | its day | Problems report, status, client | the factory's *Actions* |
| **Material** | waited-on count | the machine it is for | its row | — | — | owed | its day | Materials report, status | — |

And **the papers** read the same readers as the screens: *Status — 1 page* (= *Where we
are*), the **client report** (machines, programs' loop lines, problems with fixes and
proof, this week and next), the **programs report**, the **commissioning report** (runs
and their measurements), the **handover report** (what is still open), the **Timeline**
papers (*the day's update*, *the journey* for a range, *the plan*), the **Problems**
report and cards, **Materials**. No paper keeps a reading of its own.

## 9. The data — what changes, said plainly

| Change | Kind | Migration |
|---|---|---|
| A run names **the fix it follows** | one optional column on `tests` | add-only; `supabase/` file, applied, read back |
| A run's result word **Passed at baseline** | a value the outcome or the run says (decided §11) | add-only |
| **A program's status from its runs only** — the programs-stage parts no longer carry statuses | a change of meaning | the parts' last statuses carried into runs once (a run on that day, with what was seen); the parts kept as history; no row deleted |
| **One write path** (`recordRun`) | code | — |
| **Readers** — `programLoop` (§6), `whereWeAre`, the Timeline's one dated list, Actions' owed list (Needs you is its top) | code, pure, tested | — |
| The four gate pages, the Day, the Journey and Commission as pages | code — routes redirect | addresses kept |

Access follows today's rules: *edit* to record a run or a problem, *agree* to change what
a run is judged against or to sign off by hand, *remove* to delete — the database's
policies already hold them.

## 10. The build — five slices, each live alone

| | What | Lands | Proved by |
|---|---|---|---|
| **S1 — the truth** | `recordRun` (one write); runs name their fix; the parts' statuses carried into runs; `programLoop`; Programs page and every paper read the loop | nothing new to look at but **every paper says the same thing and the loop line appears** | unit on the loop's eight states; a script that records through every old door and reads all papers back; paper parity *changes named as meant* |
| **S2 — the program is a place** | a program's page under its machine (§7); the one *How it went* form; *Hit a problem → fix → book a run after it* inline | Rowland's loop on one page | `program-loop.mjs`: fail → problem → fix → done → retest after it → pass, nothing opened elsewhere; phone |
| **S3 — Where we are** | the new front (§4, §8): machines, programs' loop, problems with fixes, this week and next; its one page of paper | the business's answer | its paper read back; journeys none longer |
| **S4 — fewer places** | *Machines* (one board, gate chips) replaces the four gate pages; *Timeline* (Today · Range · Gantt) replaces the Day, the Journey and the Timeline tab; Actions absorbs Needs you | **16 places → 11** | every old address lands on its new home; inventory; journeys; paper parity |
| **S5 — the doors retire** | the old forms (the Programs row's own form, the test page, the separate verdict strips) come out once S2–S4 are used | one form, one window | `stagegate-walk.mjs` rewritten on the new places; the walk's tap ceilings lowered |

## 11. Decisions for Rowland

1. **The eleven places** in §4 — right, or is one missing / one too many?
2. **Timeline as one page** with *Today · Range · Gantt* — instead of the Day, the
   Journey and the plan's timeline as three?
3. **One Machines board** with the gates as chips — instead of four gate pages?
4. **A program's status from its runs only** — the programs-stage parts stop
   carrying statuses (carried into runs once, kept as history)?
5. **"Baseline achieved"** — a run's result (*passed at baseline*), or a note on a
   passed run?
6. **The loop's eight words** (§6) — the words the business wants?
7. **A run after a failure must name its fix** — or may it be a plain repeat, said so?
8. **Where we are** is the front page — and its one page of paper *is* the status
   report?
9. **Go** on S1 (the truth) — it changes no page you work on, and makes every paper
   agree.

---

## 12. The interface — what you see and touch (26 October, later)

Rowland, the same day: *"You're missing a vital part … user interface. I don't see any design
plan for user interface and user experience … How it's going to be more simplified and
streamlined?"* The screens are drawn on the design canvas **"Stage gate — the new interface"**
(claude.ai/artifact/NfqFt599eX2Rd5aVZXewQE): the plan and its rules, the fail → fix → retest
loop today against the new design, *Where we are* and a program's page at a desk, the Machines
board, the Timeline, and three phone screens (*Where we are*, a program, *How it went*). The
data on them is illustrative, from the seeded project. What they fix:

**Seven rules every stage-gate screen follows**
1. **One place per thing** — a machine, a program, a problem each have one page; lists only point to it.
2. **Act where you are** — every action expands in place; never a window that opens another; at most one sheet deep.
3. **One form for a result** — *How it went*, identical on the program, the board, Actions and the Timeline.
4. **The state first** — every row leads with the pill: one word, one of the five state colours.
5. **The story under the state** — the loop line: *failed 25 Oct → fix … done 26 Oct → retest booked 29 Oct*.
6. **Few taps** — design targets: any program's state in 2 taps from the front; a result recorded in 4 on a phone (＋ · the program · Passed · Save); a retest after a fix in 3. Measured by `scripts/journeys.mjs` against today's baseline; none may be longer.
7. **The same on paper** — every page has its paper from the same reading; *Where we are* is the status report.

**Navigation.** The rail goes from 16 places to 11 (§4). The phone has one bar for the whole
project — **Where we are · Machines · ＋ · Actions · More** — and ＋ records what happens on the
floor where you are: *How it went*, a problem, a photo.

**The parts kit** (built once, used on every screen and drawn the same on paper): the **state
pill**; the **loop line**; the **ladder** (a run, its measurements, its problem, the fix under it,
the run after the fix); the **inline action row** (teal is what you press, one primary a place);
the **How it went** sheet (on a phone a bottom sheet, 48 px answers, numeric keypads, Save says
what it will record — *"Save — Program 5 passed"*); the **board cell** (done is a quiet green
wash, late a heavy red border, a problem solid red, under way violet, ahead grey — each with its
word); the **gate chips** (the four gate pages as filters, each saying its count).

**Taken out of the interface**: the four gate tabs, The day page, the Journey page, the plan's
Timeline tab, three Needs you strips, the test's own page, the programs-stage list of programs,
the Programs row's own form, the trip to a fix's drawer, and *Use its verdict* in another window —
each replaced as §4 says, and none removed until its replacement has been used and proved.
