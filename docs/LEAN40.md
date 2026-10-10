# Lean 4.0 and 5.0 — the principles Faultline follows, the stage gate held to them, and the industrial-engineering toolkit

Rowland, 10 October, four things in one day:

> "We have already started line balance and line standard, but now we need
> to create Lean 4.0 tools, such as value stream mapping ... the tools will
> be again part of the app and can be assigned to any project. Don't build
> tools — educate yourself."

> "The entire app itself should move into a Lean 4.0 system ... and Lean
> 5.0."

> "What you've taken there is the methodology principles, which I
> understand. I'm thinking more of the technology aspects of things. If we
> were to build a value stream map in the past, that would be using
> Microsoft Visio — very blocky and outdated and not user-friendly. Now we
> have the opportunity to build something that's rather dynamic and very
> visually easy to understand and read. For example, from a value stream
> map, I envision where you have the steps on the left, just plainly put,
> a full table on the right-hand side — minutes and cycle time and lead
> time. You're able to colour code easily, value, non-value added, and it's
> a very engaging process. That's my point with Lean 4.0 and 5.0."

> "We need to look at then the stage gate ... making it as technologically
> aligned with the principles of Lean 4.0 and 5.0. If I was to stand in a
> client and say this is the principles that it follows, it should increase
> everything that we've already been doing, which is streamlining, ensure
> the simplicity, ensure it's very visual, very easy, and technologically
> advanced ... We'll do the lever tree and we'll do the 6M at a later point,
> but just mark that down as something that still needs doing ... We need
> to agree on the lean tools that we want to build. So we don't want an
> OEE, for example. OEE, we need Internet of Things connection. We will not
> have Internet of anything. This is about manual inputs. This is about
> industrial engineering. All the time in motion studies, the value stream
> mapping, the line balancing, etc. Understanding capacity constraints,
> optimisation, calculations of understanding losses. These sorts of things
> are where this really becomes powerful ... broaden your scope, broaden
> your knowledge."

So this document is about **what lean and industrial engineering become
when they are built as modern technology**: measured by people, live,
visual, calculated, explained in plain words. It has four parts, each for
agreement:
- **the principles**: one page Rowland can put in front of a client;
- **the stage gate held to them**: what already holds, where it falls
  short, and what to build, in slices;
- **the industrial-engineering toolkit**: every tool, its manual inputs,
  its calculation and its picture, and the order to build them in;
- **what is still to do whatever is built here**: the lever tree and the
  6M.

The method behind it all, the arithmetic and the literature, is the
appendix. **Nothing here is built.**

## Decided, 10 October: measured by people, no sensors, no OEE

Rowland: "We will not have Internet of anything. This is about manual
inputs. This is about industrial engineering."

- **Every number in Faultline is put there by a person**: counted, timed on
  the phone's stopwatch, tapped, photographed, filmed or typed. Nothing is
  read from a machine, a PLC or a sensor.
- **No OEE.** An honest OEE needs every stop and every slow minute from the
  machine itself. Typed by hand, its availability is a guess dressed as a
  measure. It is not built. (The arithmetic stays in the appendix, marked,
  so the reason is kept.)
- **The power is in the industrial engineering**: work measurement, method
  study, line balancing, capacity and constraints, optimisation, and the
  accounting of losses. The toolkit below is that discipline, made live.
- **This is a strength to say to a client, not a limit.** It works on any
  line, old or new, any make, from the first day, with nothing for IT to
  connect.

## The principles Faultline follows

*One page, for the room. Each is a sentence to say to a client, then what it
means on the floor.*

1. **Measured by people, not by sensors.**
   Everything the app knows was counted, timed, photographed or filmed by
   someone at the line with a phone. It works on any line, old or new, any
   make, from the first day.
2. **Recorded once, where the work happens.**
   A fact is entered at the machine — a tap, a spoken sentence, a photo, a
   file — and never typed again. Every screen and every document reads that
   one record.
3. **Live, never compiled.**
   Nobody assembles a status report. The plan, today's update, the client
   report and the handover pack are the record as it stands this minute:
   on the phone at the machine, on the screen in the meeting, and on one
   page of paper for the file.
4. **The picture draws itself.**
   Put the facts in; the plan, the board, the counts and the verdict draw
   themselves and recalculate as you type. Nobody draws a bar or adds up a
   column. Table in, picture out.
5. **The abnormal finds you.**
   Normal recedes; what is late, failed or waiting stands out, in one colour
   language with the state always in words. What needs you comes to you.
   Three seconds from across the room.
6. **Proved, not asserted.**
   Every stage closes on its answer: a file, a signature, a measured run.
   The numbers are worked out, not typed: the net rate, the rejects, the
   verdict.
7. **It explains itself; people decide.**
   Every screen says in a sentence what it means for the project. When the
   app calculates or suggests (a verdict, a forecast, the constraint) it
   says so and shows its working, and a person has the last word.
8. **Built for people and for the bad day.**
   No signal, no loss. A slip is said as "not yet", with whose and by when,
   not as blame. Who did what, when, and what was still open is always kept,
   as one part of the factory hands to another.

**How they map to the words a client may know:**
- Principles 2 to 6 are **Lean 4.0**: data captured at the source, seen
  live, made visual, acted on in a loop.
- Principles 7 and 8 are **Lean 5.0** (Industry 5.0's human-centric and
  resilient pillars): technology that helps people decide, and keeps
  working when the day goes wrong.
- Principle 1 is the decision above.
- Industry 5.0's third pillar, **sustainable**, is not yet in the app; see
  the stage gate audit.

These eight are for the whole app, said once. The stage gate is held to
them first, then the tools, then (later) the lever tree and the 6M.

## The stage gate held to the principles

Read against the code on 10 October (not driven in a browser this time),
building on the browser audit of 9 October (`docs/STAGEGATE.md`), the flow
audit (`docs/FLOW.md`) and the panels audit (`docs/PANELS.md`). Checked
again on 10 October at Rowland's ask ("we need to be sure"): two findings
were wrong and are corrected below; the rest were read back from the code
and the arithmetic reworked (the checks are listed under "Checked").

| Principle | What already holds | Where it falls short |
|---|---|---|
| 1. Measured by people | Entirely. Nothing in the stage gate reads a machine. | The performance run, the test the line is accepted on, is typed at the end. That is what Rowland asked for on 7 October ("all I do is put in the numbers at the end"), but nothing helps on the day: no clock for the run, no tally for rejects, no stopwatch for the minutes stood. |
| 2. Recorded once, where the work is | The drawer at the machine: voice, photos, files, "Not yet", "Done today". One card per machine on the phone. A stage's answer is chosen once on the stage list. | **A measured test keeps no measurements.** "Weight accuracy — 400 g" keeps its "passes if" in words and a pass or a fail. The thirty weights live on paper or a checkweigher printout, outside the record. **A frame of the filmed walk does not carry its machine.** A snag names its machine in words, one snag at a time (`targetAsset`), and a snag moved to the job becomes a fix on that machine; but the frame itself knows nothing, so the walk's own lane on the plan cannot be drawn under the machine, and the name is typed again on every snag. |
| 3. Live, never compiled | One `standing()` and one `stageGateOnTarget()` feed the front page, the day, the client report, the handover report and the control room. The reports are the record. | Holds. The one typed fact left in the verdict is the date "now expected" (see 7). The commentary is typed too, and rightly: it is a person's words, not a fact the app holds. |
| 4. The picture draws itself | The plan draws from the stages' days, the board from their states, the counts and the verdict from both. | **The picture cannot be worked on.** A stage's day is changed in its drawer, never by moving its bar on the plan. |
| 5. The abnormal finds you | Needs you, the red/amber/indigo/green/grey language, critical problems first, the rail's counts. | **It finds you only when you open the app.** The one thing pushed to a phone is a note's reminder. A stage going late, a test failing or a problem raised on your machine is not. |
| 6. Proved, not asserted | Every stage has an answer (panel slice 2). The run's verdict is worked out from its numbers, and the programs' results are kept. | Measured tests are judged by eye (see 2). The app cannot say "30 packs, mean 401.2 g, all within tolerance — passed", because it never holds the thirty. |
| 7. It explains itself | The verdict in a sentence ("Behind target — …"), the day in the order it is used, "not yet" with whose and by when. | **The forecast is a typed date.** The app knows how many stages the plan said would be done by today and how many are, but never says what that pace implies for Hand over. A product's runs on successive days are never drawn as the climb to rate they are. |
| 8. For people and the bad day | Offline sync, "Not yet", hours lost added into days, who signed, the owner/team/client levels. Who owes what is seen per job (page 3 of the client report) and across the jobs (the control room: "Ilapak owes 4 on 2B and 2 on 2A"). | Holds. (The first draft said the cross-job view was missing. It is not: `lib/portfolio`.) |
| (Sustainable) | — | Nothing counted. It could start as a typed meter reading on a performance run (energy, air or water per thousand packs). It is a question for later, not a proposal. |

**Checked, 10 October**, each against the code:
- the forecast is typed: `expectedAt` is written by hand (ProjectSetup,
  Tests) and nothing works out a pace;
- a test holds no readings: `Test` has `passesIf`, `result` and `runs`,
  nothing numeric per reading;
- the run on the day: `RunPanel` has no clock, tally or stopwatch;
- the plan cannot be dragged: no pointer handlers in `Gantt` or
  `Timeline`;
- the only push is a note's reminder (`functions/remind`,
  `lib/reminders`);
- the balance measures capacity, per product on the line standard
  (`Standard.capacity`, `lib/capacity`);
- the arithmetic in the appendix reworked by hand, every worked example;
- CI on the commit: green. The full gate was not run for a change to
  documents only.

## The stage gate's evolution — now, next, later

Rowland, 10 October:

> "What's not clear is how you're going to take the stage gate into the
> further technological world for 4.0 lean, or even 5.0 ... Nothing that's
> going to create disturbance and get it messy. What can be done right now
> to give it the evolution that I could actually say this is Lean 4.0?"

So the stage gate moves in three steps. The first is **now**: four
additions that only read what the job already keeps. No new table, no new
column, no new noun. No screen removed, no record moved, no rule changed
under anyone's feet. Each one is a sentence, a marker or a sheet beside what
is there. Each was checked against the code on 10 October:
- the stages keep their planned and actual days (`plannedFor`, `plannedTo`,
  `ranOn`, `ranTo`);
- a run keeps its product and its day (`ProductRun.product`, `ranOn`);
- a machine already has its own page, which a link opens (`recordHref`,
  flow slice 2);
- every record keeps when it last changed (`updatedAt`).

### Step 1 — Now: four additions that read what is already kept

**1. The pace says when.** *To a client: "It forecasts from its own record.
Nobody types the forecast."*
- **What it does.** It counts, from the stages' own days, how far the job
  has got against its plan, and what that pace means for Hand over (earned
  schedule; the arithmetic is in the appendix).
- **Screen.**
  - The front page, under the verdict: "At the pace so far, Hand over lands
    about 31 Oct — 9 days after the date now expected (22 Oct). [Use 31
    Oct]".
  - The plan: a third marker, dashed, in words: "at this pace".
  - Today's update: the same line.
  - Under five finished stages: "too early to tell".
- **Paper.** The client report and the one-page status, under "Are we on
  target?". The same sentence.
- **Does not touch.** The agreed date (never moves), the date now expected
  (people still set it; "Use 31 Oct" is the owner's, `can.agree`), and the
  verdict's rules (`stageGateOnTarget`, unchanged). The forecast sits
  beside them; it never quietly changes what "behind target" means.

**2. The climb to rate.** *To a client: "Every run is plotted the moment
it's recorded, and the app says when the line will reach rate at this
climb."*
- **What it does.** A product run on a machine on successive days
  (`ProductRun`, already kept) is drawn as dots climbing to the agreed-rate
  line. From three runs it says where the climb meets the line.
- **Screen.**
  - The run's card and the machine's page: "Finest Red 2 kg: 96 → 108 →
    114 a minute over 3 runs; at this climb, the agreed 120 about 22 Oct."
  - Under three runs: "too early — 2 runs".
- **Paper.** The run's card and the client report's account of the run.
- **Does not touch.** The run, its numbers or its verdict (`lib/run`,
  unchanged). It only reads the runs.

**3. Scan the machine.** *To a client: "Each machine carries a code. Scan
it at the line, and you're on everything about that machine: record it
there and then."*
- **What it does.** Reports gains **Machine labels**: one PDF sheet, a label
  per machine, each with the machine's name, the job and a QR code. Stuck on
  the machine, the code opens that machine's page in the job with the
  phone's camera. That page already exists (flow slice 2): its stages, its
  tests, its problems and what it waits on, with Done today, Hit a problem
  and photos one tap away.
- **On paper as well.** The client report and the handover pack carry one
  small code by their date: "This is the job as it stood at 16:40, 10 Oct.
  Scan for it now." A paper that points to the live record is the bridge
  from a report to the record.
- **Does not touch.** Any route (the link is the one the drawer already
  writes) or any record. One small QR library is added (no other
  dependencies, a few KB); the labels go through the report engine and
  `report-stress`.
- **Honest limit.** On an iPhone a scanned link opens in Safari, not the
  installed app, so Safari needs signing in once. On Android it usually
  opens the app. A person without access to the job sees the sign-in, and
  nothing of the job.

**4. Since you last looked.** *To a client: "It tells you what changed
since you were last in. You don't go looking."*
- **What it does.** One line at the top of the job's front page, and on Home
  for each job: "Since Tue 16:40: 3 stages done · 1 went late (Air and
  power, coder) · 1 problem raised on the case packer · 1 test failed". Each
  part opens what it names.
- **When it shows.** Nothing when nothing changed. It is gone once read.
- **Where it comes from.** It is read from the records' states and days
  against this device's last visit, which is kept on the device: a laptop
  and a phone each have their own.
- **Paper.** None. It is a screen's welcome back, not a fact of the job.
- **Does not touch.** Any record. Nothing is written to the database.

### What Rowland can say after step 1 — every principle, with its proof on the stage gate

| Principle | On the stage gate |
|---|---|
| 1. Measured by people | Every number comes from the floor: stages, runs, problems, hours lost. No sensor anywhere. |
| 2. Recorded once, where the work happens | Scan the machine; record against it there; voice, photos, files in the drawer. |
| 3. Live, never compiled | The reports are the record, and the paper carries a code back to it. |
| 4. The picture draws itself | The plan, the board, and now the climb to rate. |
| 5. The abnormal finds you | Since you last looked; Needs you; red, amber and green, said in words. |
| 6. Proved, not asserted | Every stage closes on its answer; the run's verdict is worked out. (Step 2 adds capability.) |
| 7. It explains itself; people decide | The pace says when, with its working, beside the date people set. |
| 8. Built for people and for the bad day | Offline, "Not yet", hours lost, who signed. |

### Step 2 — Next: proof at the line, with the ecosystem

**Measured tests.** A Commission test takes its readings on the phone. Each
lands as a dot between the agreed limits, and the app works out the mean,
how many are outside, and the capability: "30 packs, mean 401.2 g, all
within — Passed. Cpk 1.45 from 30: capable."

This is the biggest single Lean 4.0 claim the stage gate can make: proved
by data captured at the line, with the statistics done by the app. It
needs the one new record (the study, `docs/TOOLKIT.md` Part 0). It is
slice 0 + A there, and waits on decision 0.

### Step 3 — Later, each its own decision

- **The run kept as it happens**: a clock, a reject tally, a stopwatch for
  each stand, beside typing at the end.
- **Drag a stage on the plan** (laptop).
- **What turned red reaches your phone**: one morning note, which needs a
  server change.
- **The frame knows the machine**, so the walk's snags land on it.
- **A meter reading per run**: energy, air or water per thousand packs,
  for Lean 5.0's sustainable pillar.

These are the earlier slices 3 to 6, kept, and moved behind the four that
cost nothing to the job's stability.

### The six slices as first written (folded into the three steps above)

Six slices, each shippable alone, each connected where its parent already
shows. Nothing is built. Recommended order: **1 and 2 first**. They change
the two sentences a client cares most about: when will it be done, and
how do we know it works.

**Slice 1 — The pace says when (principle 7).**
- **What it does.** It works out a forecast from the job's own record. The
  forecast is shown beside the date people set, never written over it.
- **The arithmetic (earned schedule).** For example:
  - The job started on 1 September. By today the plan said 31 stages would
    be done; 24 are.
  - The plan had reached 24 on 29 September. So the job is 11 days behind
    its own plan, moving at about 0.7 of the planned pace (28 days of plan
    done in 39).
  - The plan has 15 days of work left. At 0.7 that is 21, so Hand over
    lands about 31 October.
  - Counted in stages, weighted by their planned days where they have spans.
  - Below a handful of finished stages it says "too early to tell".
- **On screen.**
  - The job's front page, under the verdict: "At the pace so far, Hand over
    lands about 31 Oct — 9 days after the date now expected (22 Oct). [Use
    31 Oct]".
  - The plan: a third marker, dashed and in words ("at this pace"), beside
    "expected" and "agreed".
  - Today's update: the same line.
  - The control room: the job's row says the gap when there is one.
- **On paper.** The client report and the one-page status, under "Are we on
  target?". Same sentence, same date.
- **Who.** Everyone reads it. "Use this date" is the owner's (`can.agree`),
  because the handover dates are what was agreed. The agreed date never
  moves.

**Slice 2 — Measured tests: readings in, verdict out (principles 2 and 6).**
MANUFACTURING IS MANY. A commissioning test is often thirty weighings, ten
test packs through the metal detector, or five seal-strength pulls.
- **Agreed before the day (owner).** The target and its limits, and how many
  readings. For example: 400 g, no lighter than 400 and no heavier than
  404, thirty packs. Where packs are sold by weight, the limits can instead
  be the packers' rules of the average-quantity system (the ℮ mark): the
  average at or above the nominal, fewer than 1 pack in 40 short by more
  than the tolerable negative error, and none short by more than twice it.
- **On the day.** The readings go in one after another on a number pad that
  stays open (401.2 ↵ 399.8 ↵ …), or by voice. A go/no-go test is a row of
  ticks: Fe 2.0 mm rejected ✓ ✓ ✓.
- **Worked out.**
  - How many readings, the mean, the lightest and heaviest, the spread, and
    how many are outside.
  - From 25 readings, the capability (Cpk), said in words and always with
    its count beside it, because a small sample flatters it.
  - The verdict, as a run's is now. The person can overrule it, and should
    never have to.
- **The picture.** The readings as dots between two limit lines. One
  outside is red, because it is a failure.
- **Where it shows.**
  - The drawer.
  - The square on the Commission board: "30 · all in".
  - Needs you, while fewer readings are in than were agreed.
  - The day.
  - The client report's account of the test, the handover pack and the test
    report: "30 packs, mean 401.2 g, all within 400–404 g — passed".
- **No new noun.** A test holds a list of readings, as a performance run
  holds a list of products.

**Slice 3 — The run on the day, and the climb to rate (principles 1 and
7).**
- **On the day (optional).** Typing the numbers at the end stays exactly as
  it is. For a person who wants help on the day, the run can be kept as it
  happens:
  - Start and Stop, and a clock for how long it ran;
  - the Capture screen's stopwatch for each stand, tapped "stood";
  - a reject tally, one button;
  - the pack count at the start and the end.
  These fill the same boxes that are typed today.
- **The climb to rate.** A product run on successive days is drawn as dots
  climbing towards the agreed-rate line. From three runs, the trend says
  where it meets the line: "at this climb, 120 a minute about 22 Oct".
- **Where it shows.** That date feeds slice 1's forecast for Commission. On
  paper: the run's card and the client report.

**Slice 4 — Work on the picture (principle 4).**
- **On a laptop.** Drag a stage's bar on the plan to move its day, or its
  end to change its length. It is kept as any move is (`movedFrom` /
  `movedTo`), and the same "why" is asked.
  - The team can move planned days (`can.edit`).
  - Agreed dates stay with the owner (`can.agree`).
- **On a phone.** Unchanged. A drag fights the scroll, and the drawer
  already does the job.

**Slice 5 — What turned red reaches your phone (principle 5).**
- **What it sends.** One note a morning per person, not one per event: "Line
  9: 2 stages went late yesterday, 1 test failed, 1 problem raised on the
  case packer". It goes only to devices that said yes.
- **How.** Through the one server function the app already has (`remind`),
  with a database change shipped the house way (`supabase/<NAME>.sql`,
  applied, read back).

**Slice 6 — The frame knows the machine (principle 2).**
- **Today.** A snag can name its machine in words, and one moved to the job
  becomes a fix on that machine (8 October). The frame it is pinned on does
  not carry the machine, so the name is typed on every snag, and the walk's
  lane on the plan stays a lane of its own.
- **What it does.** On a frame of the filmed walk, one tap says which
  machine it shows. Every snag pinned on it inherits the machine, and a
  moved snag no longer asks.
- **Where its snags then appear.** On that machine's page and under its row
  on the plan, as a branch, as well as in the walk's own lane; and on its
  Install card as a count.
- **Why.** Recorded once: the machine is said once per frame, not once per
  snag.

## The industrial-engineering toolkit — to agree

**The full design is `docs/TOOLKIT.md`** (Rowland, later the same day:
"more emphasis on the tools and the tool design, such as Cpk ... the whole
intelligence model ... exactly how the tools will be used, how they're built,
what they'll look like, full design system"): the five-layer model every
tool follows, the records each fact lives on, the sixteen shared parts, and
each tool's use, module, sentences, screen and paper. This section stays as
the catalogue.

Industrial engineering asks five questions of a line, and Lean 5.0 adds a
sixth:
1. How long should the work take?
2. Is this the best way to do it?
3. How many people, and where?
4. How much can it make, and what limits it?
5. Where do the time and the money go?
6. Can people do it safely all shift?

Every tool below answers one of them **from manual inputs only**: a phone
stopwatch, a count, a tap, a photo or a film. Each turns those into the
classic calculation and its picture, live (the principles above, and "What
a tool is, as technology" below).

### One table underneath — the design decision

Six of these tools are the same table seen at different sizes:
- **The table.** One row per piece of work, holding:
  - what it is, in the floor's words;
  - its **type**: operation · move · check · wait · store;
  - its **value**: value-added · necessary · waste;
  - its **time**: as observed, as rated, and as the standard;
  - **who** does it: a person or a machine;
  - **how far**, if it is walked.
- **The same table, seen at different sizes:**
  - **a plant, door to door**: the value stream map;
  - **one product along one line**: the process chart;
  - **one person's work, element by element**: the time study;
  - **those elements stacked by person against takt**: the work balance
    (Yamazumi);
  - **one person and their machine against takt**: the operator's cycle;
  - **a changeover**: SMED.

Captured once, many pictures. This is what stops six tools becoming six
apps, and it is the one-set-of-data principle a client would recognise.

**Where it lives.** On a line, for a product: the same record as today's
line standard and line balance (`lib/standard`, one per product per line),
attachable to any job as those are. A changeover is between two products
on a line.

### The tools

**How long should the work take — work measurement**

1. **Time study.**
   - **Answers:** how long should this take, done properly?
   - **You put in:**
     - each element timed over several cycles on the phone stopwatch, one
       tap per element;
     - a pace rating on the British Standard scale, where 100 is the pace
       a qualified, motivated worker keeps all shift without over-exertion;
     - the allowances agreed: relaxation and contingency.
   - **It works out:**
     - basic time = observed × rating ÷ 100;
     - standard time = basic × (1 + allowances);
     - how many cycles ±5% at 95% needs, and whether you have them yet;
     - any lap far from the rest, flagged for the person to keep or strike
       (a dropped part).
   - **The picture:** each element's laps as dots around their mean, and a
     meter filling to "enough cycles".
   - **Builds on:** the Capture stopwatch. A balance station's "timed by
     somebody" becomes a real standard time.
2. **Work sampling.**
   - **Answers:** what share of the day goes on what? It is for long or
     irregular work: a team leader, a forklift driver, maintenance, a
     line's crew.
   - **You put in:** at random moments across the shift (the phone prompts,
     at times the person cannot predict), one tap for what they are doing:
     working, walking, waiting, searching, away.
   - **It works out:**
     - the share of each, with its margin;
     - how many more observations the accuracy you want needs.
   - **The picture:** a bar per activity, its margin narrowing as the taps
     come in. You watch the certainty grow.
   - **Builds on:** the Capture screen's one-tap style.

**Is this the best way — method study**

3. **Value stream and process map** (designed below: steps on the left, the
   full table on the right).
   - **Answers:** where does the time go between the start and the
     customer?
   - **You put in:**
     - the steps, walked ("Walk it"), typed or cut from the film;
     - each one's type and value, one tap each.
   - **It works out:** lead time, value-added time, process cycle
     efficiency, waste time, takt, and the biggest wait.
   - **The picture:** the table and the time value map beside it, current
     and future side by side.
   - **Builds on:** the filmed walk, voice, the plan's rows-and-bars layout.
4. **The operator's cycle** (the standard work combination table and the
   person–machine chart, as one view).
   - **Answers:** within takt, what does the person do while the machine
     runs, and how many machines can one person tend?
   - **You put in:** per element, its manual, walk and machine time; and the
     takt.
   - **It works out:**
     - the cycle against takt;
     - idle on each side: the person waiting on the machine, or the machine
       waiting on the person;
     - machines per person, n′ = (l + m) ÷ (l + w), with the cost per pack
       at the whole numbers either side.
   - **The picture:** person and machine as two lanes against a takt line.
     It is Toyota's paper form, drawn live.
   - **Builds on:** time study, and the line standard (who stands where).
5. **Changeover (SMED).**
   - **Answers:** how short can the changeover be?
   - **You put in:**
     - the changeover filmed or timed, step by step;
     - each step tagged internal (the line stopped) or external (it can be
       done while the line runs).
   - **It works out:**
     - the minutes now;
     - the minutes if the external steps are done outside;
     - the capacity that buys back (tools 9 and 11).
   - **The picture:** one bar split internal and external. Drag a step to
     external and watch the bar shorten.
   - **Builds on:** the filmed walk.
6. **Layout and walking** (spaghetti, from–to).
   - **Answers:** how far do people and materials travel?
   - **You put in:**
     - paths drawn on the line's photo;
     - or a from–to table of trips per shift between areas.
   - **It works out:**
     - distance per cycle and per shift;
     - trips × distance for every route;
     - two layouts compared.
   - **The picture:** the paths on the photo, their thickness the traffic.
   - **Builds on:** the line standard's photo and icons.

**How many people, and where — balancing and staffing**

7. **Work balance (Yamazumi).**
   - **Answers:** is the work shared evenly against takt?
   - **You put in:**
     - the elements, with their standard times (from 1);
     - which must come before which;
     - the people.
   - **It works out:**
     - takt;
     - the fewest people the work needs;
     - balance efficiency, balance delay and smoothness;
     - the person who is the constraint;
     - a suggested balance (ranked positional weight), offered and never
       applied.
   - **The picture:** stacked bars per person against the takt line. Drag
     an element between people and both bars move.
   - **Builds on:** it lives inside the existing balance's people stations:
     tap a person station and see its elements.
8. **Crewing and labour.**
   - **Answers:** how many people does each product need, and how well did
     the shift do?
   - **You put in:**
     - per product, the work content (from 7) and the rate;
     - per shift, the packs made and the hours worked.
   - **It works out:**
     - headcount per product;
     - earned hours = standard minutes × packs ÷ 60;
     - labour efficiency = earned ÷ worked.
   - **The picture:** each product's crew number against the people on its
     map. They must agree, and it says so when they don't.
   - **Builds on:** the line standard, whose headcount is counted off the
     map.

**How much can it make, and what limits it — capacity and constraints**

9. **Capacity, with its three numbers.**
   - **Exists today:** the balance, saying where the line is limited, with
     its what-ifs (`lib/capacity`).
   - **Added:**
     - design capacity (the plate);
     - effective capacity (after the planned losses: changeovers, cleans,
       breaks);
     - actual (what it made);
     - utilisation = actual ÷ design, and efficiency = actual ÷ effective;
     - loading against demand: "demand needs 92% of what the line can
       really make".
   - **The picture:** today's bars, each with three marks (design ·
     effective · actual).
10. **Product mix on the constraint** (Theory of Constraints, throughput
    accounting).
    - **Answers:** with the bottleneck full, which products earn the most?
    - **You put in:** per product, price less materials, demand, and the
      constraint's speed on it.
    - **It works out:**
      - throughput per constraint minute;
      - the products ranked;
      - the constraint's week filled in that order up to demand, and what
        is left unmade.
    - **The picture:** ranked bars, and the week filling like a tank.
    - **Builds on:** 9, and the cost rates already kept (`lib/cost`).
11. **Changeover interval (EPEI).**
    - **Answers:** how often can each product run?
    - **You put in:** the changeover minutes (from 5), each product's run
      time per day, and the time available.
    - **It works out:**
      - the time free for changeovers;
      - every product every how many days;
      - how short each changeover must be for a daily interval.
    - **The picture:** one cycle of every product on a timeline, with its
      changeovers.
12. **Ramp-up to rate** (the learning curve).
    - **Answers:** when will the new line reach rate? (the stage gate's
      Commission)
    - **You put in:** nothing new: a product's runs on successive days.
    - **It works out:** the trend, its learning rate, and the date it meets
      the agreed rate. Under three runs it says "too early".
    - **The picture:** dots climbing to the rate line.
    - **Builds on:** the performance run. This is stage gate slice 3.

**Where the time and the money go — losses**

13. **A shift's losses, by hand.**
    - **Answers:** of what the line should have made, where did the rest
      go?
    - **You put in:** two numbers at the end of the shift (the planned hours
      and the packs made), plus the stops already logged in Capture.
    - **It works out:**
      - the packs the planned time should have made at rate;
      - the gap, in packs and in minutes;
      - how much of the gap the log explains: stops by cause, changeovers,
        rejects, running slow;
      - how much is **not yet explained**.
    - **The picture:** a waterfall in minutes and pounds, from the planned
      time down to good packs. The unexplained part is shown plainly. No
      percentage score.
    - **Builds on:** the stops log, the Pareto, `lib/cost`.
14. **Cost deployment** (World Class Manufacturing, its lighter form).
    - **Answers:** which losses cost most, and which are worth fixing?
    - **You put in:** the rates already set (crew, wage, margin), and a
      fix's cost and what it should save.
    - **It works out:** each loss in pounds a year, ranked; and each fix's
      saving and payback.
    - **The picture:** a pounds Pareto, each loss pointed at its cause.
    - **Builds on:** `lib/cost`, the Pareto, the 6M countermeasures.

**Can people do it safely all shift — Lean 5.0**

15. **Ergonomics.**
    - **Answers:** is this task safe to do all shift?
    - **You put in**, by the method that fits the task:
      - lifting and carrying: the weight, where the hands are and how
        often, by HSE's Manual Handling Assessment Charts (MAC), the UK's
        own tool;
      - repetitive arm and hand work (packing, sorting): HSE's ART;
      - the whole body: REBA's positions, tapped on a photo.
    - **It works out:** the score in the method's own bands, in words; and
      for a lift, the NIOSH recommended weight limit and lifting index.
    - **The picture:** a figure with the scored body parts marked. The
      methods' own colour bands are said in words and marks, because the
      app's five colours are kept for state.
    - **Builds on:** the line standard's people (who stands where, so which
      tasks), and the photo.
16. **Skills (later).**
    - **Answers:** who can stand where?
    - **You put in:** each person's level on each position: learning, can do
      it, can train it.
    - **It works out:** cover per position, and the gaps by shift.
    - **The picture:** a matrix.
    - **Builds on:** the line standard's positions.

### Recommended order

1. **The step table, "Walk it", and the value stream and process map** (3).
   It is the flagship, and every later tool reuses its table.
2. **Time study** (1). Standard times on the steps: the measurement every
   other number rests on.
3. **Work balance and the operator's cycle** (7 and 4). Inside the existing
   balance, on those standard times.
4. **A shift's losses and cost deployment** (13 and 14), if Rowland agrees
   it is inside "manual inputs" (decision 4).
5. **Changeover and its interval** (5 and 11).

Then, in an order to agree:
- capacity's three numbers and the product mix (9, 10);
- work sampling (2);
- ergonomics (15);
- layout (6);
- crewing (8);
- skills (16).

Measured tests and the ramp-up are the stage gate's own, in its slices
above.

**Other lean tools, kept for later.** 5S (before-and-after photos and a
score kept over time), the A3 (assembled from a 6M job, one page) and
kanban sizing (a calculator showing the loop as demand and lead time
change). They are kept from the earlier draft. They are not industrial
engineering, so they wait.

### Left out on purpose

- **OEE.** Decided above.
  - The closest honest thing is tool 13: the same gap, in minutes and
    pounds, from two counts and the stops log, with no score.
  - Whether even that is too near is decision 4.
- **Predetermined motion times (MTM, MOST).** These are licensed systems
  that need certified analysts. A standard time made with one can be typed
  in with its source named ("MTM-UAS"), and is then used like a timed one.
- **Simulation.** It needs distributions and an expert to set up. The
  capacity screen's steady-state answer, which says "at most", is the
  honest one for a screen.
- **SPC on machine signals, energy metering.** Both need sensors. A typed
  meter reading per run is possible later (see Sustainable, above).
- **Automatic video timing.** Software that times a film by itself exists.
  Here the person cuts the film and the app does the arithmetic: Lean 5.0,
  the person decides.

## The shift: from drawing to data

**How lean tools were done** — Visio, a whiteboard, a spreadsheet beside it:
- **Drawn by hand.** Boxes and arrows placed one at a time; the numbers are
  text typed inside shapes.
- **Nothing adds up.** The lead time on the ladder is summed by hand; change
  one cycle time and nothing else moves.
- **One person draws, everyone else reads a PDF.** It is out of date the day
  after the workshop.
- **The future state is redrawn from scratch,** and the gap between the two
  is worked out on a calculator.
- **It never leaves the office.** The numbers are walked in on a clipboard
  and typed again.

**What the research found about today's tools.** They split in two:
- **drawing tools** (Visio, Lucidchart, Miro, Creately) — templates and
  shapes, real-time co-editing, but "you'll need to handle calculations
  manually"; Miro has "no built-in VSM simulation or lead-time calculation";
- **analytics tools** (eVSM in Excel and Visio, iGrafx, process-mining
  suites) — they compute, but are heavy, desktop and expert.

**No tool found is table-driven, live and simple**, which is exactly what
Rowland describes. That is the gap, and the opportunity.

## What a tool is, as technology

The eight principles above, as they apply to a single tool: ten things a
person feels using it, drawn from the research and from what this app
already does well. They are not a feature list:

1. **Table in, picture out.** You fill a table: typed, timed or filmed. The
   classic picture draws itself (the map, the ladder, the bars) and
   recalculates as you type. Nobody drags boxes.
2. **One tap to say what it is.** Each step is value-added, necessary, or
   waste, with one tap, and its colour and the totals change at once.
3. **Captured at the line.** A phone stopwatch where each tap starts the
   next step, the step named by voice. Or the line filmed, and the film cut
   into the steps. The table fills itself while you walk.
4. **One set of data, several views.** The same steps as a table, a timeline,
   a flow map, a Pareto of the waste, and a before-and-after. Switch, never
   re-enter.
5. **Before and after side by side.** "Copy to future state", change it,
   and every number shows its change: lead time 6.2 → 2.1 days.
6. **Live, together.** Two people on two phones fill the same table at the
   line; the laptop in the office watches it fill. The app already syncs
   this way.
7. **It explains itself** (Lean 5.0: people decide, the machine helps).
   - A plain-words reading under the picture: "Lead time 6.2 days. 14
     minutes of it adds value: 0.2%. The biggest wait: 2 days before
     packing."
   - Suggestions of which waste a step is, or where to start, said as
     suggestions. The team decides.
8. **Direct and immediate.**
   - Drag a row to reorder; drag a bar's end to change its time; tap a
     number to edit it in place.
   - Everything answers in the same moment, with a gentle movement so the
     eye follows what changed.
   - This is what makes it engaging rather than a form.
9. **Phone first, laptop for thinking.** On a phone the table becomes
   cards and the capture buttons are thumb-sized. On a laptop it is the
   full table beside the picture, for the workshop and the screen in the
   meeting room.
10. **One page of paper that reads like the screen.** For the wall, the
    client and the file.

The app's own rules still hold:
- **Colour carries meaning, never decoration, and is never the only
  carrier.** A mark and a word sit beside every colour, so it survives a
  black-and-white print.
- **Simple with detail.** Where are we, why not, what are we doing about
  it.
- **It ends in someone acting on something by a date,** or it is a gimmick.

## The value stream map, as Rowland sees it

A first design in words, to react to. Nothing is built.

```
  Line 2 — Tesco Express 1.25 kg — current state          [Copy to future ▸]
  ─────────────────────────────────────────────────────────────────────────────────
  Lead time 6.2 days    Value-added 14 min (0.2%)    Waste 5.9 days    Takt 3.0 s
  ─────────────────────────────────────────────────────────────────────────────────
  STEP (plain words)            TYPE  │ CYCLE  WAIT    LEAD (running)  │  TIMELINE
  1 Film delivered to store     ▢ wait│  —     1.5 d   1.5 d           │ ░░░░░░
  2 Film to the wrapper         ➝ move│ 4 min  —       1.5 d           │ ·
  3 Wrap and seal               ● VA  │ 2.0 s  —       1.5 d           │ █
  4 Wait for the checkweigher   ▢ wait│  —     40 min  1.5 d           │ ░
  5 Weigh and reject            ◆ chk │ 1.0 s  —       1.5 d           │ ▒
  6 Case pack                   ● VA  │ 6.0 s  —       1.5 d           │ █
  7 Pallet waits for despatch   ▢ wait│  —     2.0 d   3.5 d           │ ░░░░░░░░
  ...
  ─────────────────────────────────────────────────────────────────────────────────
  The biggest wait: pallet for despatch, 2 days.  The longest cycle: case pack,
  6.0 s, over takt (3.0 s) — the constraint.            [Show only the waste]
```

**The left side: the steps, plainly put.**
- One row per step, in order, in the floor's own words.
- Each with its type, as a small mark and a word, the classic five of a
  process activity map:
  - **operation** (the only kind that can add value);
  - **move**;
  - **check**;
  - **wait**;
  - **store**.
- Typed, spoken ("then it waits about two days for despatch") or captured
  by the walk.

**The right side: the full table, live.**

| Column | What it is |
|---|---|
| Value | **Value-added**, **necessary** (not value, but required: compliance, safety) or **waste**, one tap |
| Cycle | The time the work takes (C/T), per piece or per batch |
| Wait | The time it sits before the next step (queue, inventory turned into time) |
| Lead (running) | Lead time so far, added up as you go |
| Who / how many | Operators, where it matters |
| Distance | For moves, if walked |
| Changeover, uptime | Optional, for machine steps (the classic data box) |

Summed at the top, live:
- **lead time**;
- **value-added time**;
- **process cycle efficiency** (value-added ÷ lead time);
- **waste time**;
- **takt** (from demand and available time).

**The timeline: the time value map, drawn from the table.**
- A bar per step, its length its time.
- Value-added, necessary and waste told apart by fill and mark.
- Waiting drawn as the gaps it really is.

This is the "time value map" practitioners already use, with value-added
above the line, non-value-added below and gaps as delay. Here it draws
itself and moves as the numbers change. On a long process, minutes against
days, the bars switch to a scale that keeps a 2-second step visible beside a
2-day wait. (Showing that contrast is the point of the map.)

**The colours — one decision for Rowland.** The app keeps five colours for
*state*: red late or failed, amber waiting, indigo ahead, green done, grey
not started. Nothing else may wear them (CLAUDE.md, visual management rule
1). Value-added green and waste red would break that rule, and a waste step
would read as "late". So value, necessary and waste get **their own marks**:
- **value-added**: a solid fill in one colour of its own, kept for value;
- **necessary**: the same colour, light;
- **waste**: hatched, in a neutral grey.

Each also carries its word, so a black-and-white print still reads. It is
just as easy to read at a glance, and it keeps "red" meaning late
everywhere.

**Engaging, concretely:**
- **"Walk it" on the phone.** One big button, "Next step". Each tap laps the
  stopwatch and starts the next step. Say the step's name, tap its type, keep
  walking. At the end the table is full, timed and in order. It is the
  Capture screen's one-thumb stopwatch, aimed at a process instead of a stop.
- **From the film.** On the filmed walk, its segments, already in flow
  order, become the rows, their lengths the times.
- **Show only the waste.** One tap greys out everything that adds value or
  is necessary. What is left is the list of what to remove.
- **Tap a waste step, "Make it better".** It becomes an action on the job,
  with what it should change ("wait 2 d → 4 h"). On a 6M job it is a
  countermeasure on the board; on a stage-gate job, a part of the plan.
- **Copy to future state.** Strike out steps, merge them, shorten waits.
  Every changed number shows its change, and the header says the gain:
  "lead time −4.1 days".
- **Present.** In the meeting, the map steps through itself: current, the
  waste highlighted, then the future state and the gain. It is the app's
  present mode, already used for the meeting.

**Where it lives** (the app's rules for a tool):
- On a line, for a product, several per line, attachable to any project,
  like the line standard and line balance.
- It reads what is already kept rather than asking twice: cycle times from
  the line balance, operators from the line standard, stops from the Pareto.
- It shows where its line and its job show, as a branch: "lead time 6.2 d →
  2.1 d target" on the job's front page, a page in the client report.

## What the app already has to build on

This is why it can be done here, and done well:
- **The plan's layout**: rows on the left, bars on the right, by machine or
  by stage, days or weeks, folding, tapping a row to open it. The time
  value map is a cousin of it.
- **The Capture screen's stopwatch**: one thumb, survives the app closing,
  tap what and where.
- **The filmed walk**: segments in flow order, frames marked.
- **Voice into boxes** and "better words": speak a step, it lands in the
  right box.
- **Live sync, offline first**: two phones on one table, no signal no loss.
- **The line balance and line standard**: the first two tools, on a line,
  attachable to a job.
- **The capacity arithmetic** (`lib/capacity`): stations in one unit, three
  speeds, rejects, waiting kept apart, people as stations, what-ifs that
  raise an action. Tools 9 to 11 extend it rather than start again.
- **The stops log and the cost rates** (`lib/cost`, the Pareto): the losses
  and their pounds are already kept by hand. Tools 13 and 14 read them.
- **The performance run** (`lib/run`): a list of products, agreed against
  measured, the verdict worked out. Measured tests and the climb to rate
  copy its shape.
- **Present mode** for the meeting, and **the report engine** for one page
  of paper.
- **The rules**: visual management, simple with detail, connect the dots.
  These are what stop a dynamic tool becoming a gimmick.

## Still to do, whatever is built here

Rowland, 10 October: "We'll do the lever tree and we'll do the 6M at a
later point, but just mark that down as something that still needs doing."

- **The lever tree, held to the eight principles.** Later. It gets the same
  treatment the stage gate has had here: what holds, where it falls short,
  and slices.
- **The 6M, held to the eight principles.** Later. The toolkit is designed
  to feed its bones, and the audit should start there:
  - time study and work balance on **Method**;
  - ergonomics and skills on **People**;
  - changeover on **Machine** and **Method**;
  - measured tests on **Measurement**;
  - a shift's losses as **the gap** and the head of the fish;
  - cost deployment as **which problem first**.

## Decisions for Rowland

1. **The eight principles.** Are they the words you would say to a client?
   Change any of them. Once agreed, every change from here says which
   principle it serves. (This replaces the earlier draft's question about
   the whole app.)
2. **The stage gate's evolution.** Step 1 now — the pace, the climb to
   rate, scan the machine, since you last looked — four additions that read
   only what is already kept; step 2 measured tests, with the ecosystem;
   step 3 the rest, one decision each.
3. **The toolkit.** The sixteen tools and the first five. Is there anything
   to add or strike?
4. **A shift's losses by hand (tool 13).** Is it inside "manual inputs", or
   too near OEE? It uses two counts at the end of a shift and the stops
   already logged, and shows minutes and pounds, never a percentage.
5. **The name of today's "Line balance".**
   - It answers where the line is limited: machines and people as a chain.
     That is capacity.
   - The Yamazumi balances the work between people.
   - Recommended: one page, still called "Line balance", with two views.
     **Capacity** is today's, unchanged. **Work** is the people's elements
     against takt.
   - Nothing is removed.
6. **Carried from the earlier draft:**
   - the value stream map's first shape, and whether to try a clickable
     mock-up first;
   - the marks for value, necessary and waste (solid, light, hatched
     grey);
   - how a map is first filled: walked, typed or from the film;
   - its span: one line, or the plant door to door.

   The earlier "which tool after the map" is answered by the recommended
   order.

---

## Appendix — the lean knowledge behind it

Kept so the tools are built on the real method. The technology changes how
it feels; it does not change the arithmetic.

### The value stream map, as the method defines it

Rother & Shook, *Learning to See*; the symbols are not fully standardised.
- **Customer** (demand per day) and **supplier**.
- **Process boxes** with a **data box**:
  - cycle time;
  - changeover;
  - uptime;
  - operators;
  - shifts and available time;
  - batch;
  - scrap;
  - EPEI.
- **Inventory** between boxes turned into **days of demand** (quantity ÷
  daily demand, Little's Law).
- **Push, FIFO and pull** (supermarkets).
- **Information flow**, manual or electronic.
- **The timeline ladder**: waiting high, process time low, totalled to
  **lead time** against **process time**.
- **Kaizen bursts** where something must change.

**The arithmetic:**
- **takt** = available time ÷ demand;
- **inventory days** = quantity ÷ daily demand;
- **lead time** = Σ waits + Σ process times;
- **PCE** = value-added ÷ lead time, often under 1%;
- **EPEI**: every variant's run time plus its changeovers must fit in the
  interval, so a shorter changeover buys a shorter interval. For example, a
  70-minute changeover would need to be 30 minutes for a daily interval
  instead of a weekly one.

**The future state's eight questions** (Rother & Shook):
1. Takt.
2. A finished-goods supermarket, or straight to shipping?
3. Where can continuous flow be used?
4. Where are supermarkets needed?
5. Which one point is scheduled, the pacemaker?
6. How is the mix levelled?
7. What release increment (pitch = takt × pack-out quantity)?
8. Which improvements?

**VSM 4.0** (Meudt, Metternich, Abele, CIRP Annals 2017) adds
**information logistics** per box: how its data is collected, where it is
kept, and whether it is used. It names **information waste**: data typed
twice, media breaks, searching, data never used, waiting for information.
A 2023 follow-up found the original "non-intuitive ... time-consuming" and
simplified it. **Lesson: keep it light.**

**The time value map and the process activity map**, the two simplest
forms, and the ones Rowland's picture is closest to:
- each step classified **operation, move, check, wait or store**, and
  **value-added, necessary non-value-added or waste**;
- value-added above the line and non-value-added below, gaps as delay;
- totals and the value-added ratio beneath.

### Lean 4.0 and 5.0 as the literature uses the words

- **Lean 4.0**: lean fed by Industry 4.0 data, captured at source, seen
  live, acted on in a loop. Lean first, or the technology "automates the
  waste" (BCG). The literature's tools are VSM 4.0, kanban, visual
  management, andon, jidoka, poka-yoke, TPM, kaizen, SMED, digital standard
  work and digital shop-floor management. There is no standard list and no
  standard maturity model.
- **Industry 5.0** (European Commission, 2021) has three pillars:
  - **human-centric**: the worker's wellbeing at the centre;
  - **resilient**: absorbs disruption;
  - **sustainable**: within planetary limits.
- **Lean 5.0** is lean meeting those pillars. Lean was always human-centric
  ("respect for people"), so it is the natural way in. Digital tools help
  people decide; they do not decide for them. Sustainable VSM adds energy,
  water and material per box (the EPA's "Lean and Clean").

### The other tools in one paragraph each

- **Takt and line balance**: stations' work stacked against takt; the
  constraint first (Theory of Constraints).
- **Standard work**: Toyota's three forms: the process capacity sheet, the
  combination table, the standard work chart. Built on takt, the work
  sequence and standard WIP.
- **OEE** = availability × performance × quality; Nakajima's six big losses:
  breakdowns, set-ups, minor stops, reduced speed, defects, start-up. Say
  whether planned changeovers count.
  **Not built: decided 10 October.** It needs machine data to be honest;
  see the decision at the top.
- **SMED**: internal (machine stopped) against external work; move it
  outside; video is the baseline.
- **Kanban**: cards = demand × replenishment lead time × (1 + safety) ÷
  container quantity.
- **Heijunka**: level the volume, then the mix, released at the pitch.
- **Andon and jidoka**: stop or call at the abnormal; 4.0 adds what, where,
  how long, and escalation to a phone.
- **Poka-yoke**: device-side checks; the app records that one was proven.
- **Shop-floor management**: SQDCP boards, tiered meetings, leader standard
  work.
- **5S, waste walk, spaghetti diagram**: counted and observed evidence.

### The industrial-engineering arithmetic

Each formula with numbers worked through, so a tool can be checked against
it when it is built.

**Time study** (BS 3138 rating, where 100 is standard performance).
- Basic time = observed time × rating ÷ 100.
- Standard time = basic time × (1 + relaxation + contingency).
- *Worked:* observed 0.42 min at a rating of 110 gives 0.462 basic minutes.
  With 12% relaxation and 2% contingency, the standard is 0.527 minutes.
- Allowances vary by plant and by task. They are agreed, never assumed.

**How many cycles to time.**
- n = (t × s ÷ (0.05 × mean))² for ±5% at 95%, where s is the spread of the
  laps and t is about 2.
- *Worked:* mean 0.42 min, spread 0.04 gives (0.08 ÷ 0.021)² = 14.5, so 15
  cycles.
- The app starts from a few cycles and says how many more are needed.

**Work sampling.**
- N = Z² × p(1 − p) ÷ E², with Z = 1.96 at 95%, p the share expected, and E
  the margin wanted.
- *Worked:* a share near 30% to ±5 points needs 3.84 × 0.21 ÷ 0.0025 = 323
  observations.
- The moments must be random, and spread across people and shifts.

**Work balance.**
- Takt = available time ÷ demand.
- The fewest people = work content ÷ takt, rounded up.
- Balance efficiency = work content ÷ (people × the longest person's time).
- Balance delay = 1 − efficiency.
- Smoothness = √Σ(longest − each)².
- *Worked:* 54 s of work at a 12 s takt needs at least 5 people. At 5, with
  the longest at 12 s, efficiency is 54 ÷ 60 = 90% and the delay 10%.
- **Ranked positional weight** (Helgeson and Birnie, 1961): an element's
  weight is its own time plus every element that must follow it. Elements
  are placed heaviest first, keeping their order and the takt. The largest
  candidate rule is the simpler alternative.

**Machines per person** (synchronous servicing).
- n′ = (l + m) ÷ (l + w), where:
  - l is loading and unloading, which takes the person and the machine
    together;
  - m is the machine running alone;
  - w is the person's walking and other work per machine.
- **The cycle:** at or below n′ it is l + m, and the person waits. Above n′
  it is n(l + w), and the machines wait.
- **Cost per piece** = (person's rate + n × machine's rate) × cycle ÷ n, at
  the whole numbers either side.
- *Worked:* l = 1, m = 4, w = 0.5 min gives n′ = 3.33. At £15 an hour for
  the person and £30 for a machine:
  - 3 machines cost £2.92 a piece;
  - 4 machines cost £3.38 a piece;
  - so 3, and the person has a little time to spare.

**Capacity.**
- Utilisation = actual ÷ design.
- Efficiency = actual ÷ effective.
- *Worked:* design 201,600, effective 175,000 and actual 148,000 give
  73.4% and 84.6%.
- The bottleneck caps the whole line. A minute lost there is lost to the
  line; a minute saved elsewhere is not gained.

**Product mix on the constraint** (throughput accounting).
- Throughput per constraint minute = (price − materials) × the packs the
  constraint makes in a minute.
- *Worked:*
  - A earns £0.40 a pack, at 80 a minute: £32 a constraint minute.
  - B earns £0.60 a pack, but at 40 a minute: £24.
  - So A goes first, though B earns more a pack.
- Fill the constraint in that order, each product up to its demand.

**Changeover interval (EPEI).**
- Time free for changeovers = available time − run time.
- The interval = changeover time for one cycle of every product ÷ the time
  free each day.
- *Worked:* 450 minutes available and 300 run leave 150 free a day. Five
  products at 45 minutes a changeover need 225 minutes, so every product
  runs every 1.5 days. A daily interval needs changeovers of 30 minutes or
  less.

**Ramp-up** (the learning curve).
- Tₙ = T₁ × nᵇ, with b = log(rate) ÷ log 2. An 80% curve has b = −0.322:
  each doubling of output takes 80% of the time.
- Books differ on whether n is the n-th unit or the average of the first n.
  For a ramp-up, the app uses each run's own net rate.
- It says "too early" under three runs.

**A shift's losses, by hand.**
- Expected packs = planned minutes × rate.
- Lost minutes = (expected − made) ÷ rate.
- Explained = the logged stops + changeovers + rejects ÷ rate.
- Not yet explained = lost − explained.
- *Worked:*
  - 450 planned minutes at 100 a minute should make 45,000.
  - 36,500 were made: 8,500 short, or 85 minutes.
  - The log explains 76: 52 of stops, 18 of changeover and 6 of rejects
    (600 packs).
  - That leaves **9 minutes not yet explained**.

**Cost deployment** (World Class Manufacturing). The full method has seven
steps:
1. total the cost;
2. find and measure the losses;
3. separate the causing losses from the resulting ones;
4. turn them into money;
5. find the ways to recover them;
6. estimate the saving and put them in order;
7. follow up.

The light form here is steps 2, 4 and 6, on the rates the app already
keeps.

**A measured test.**
- Count, mean, lightest, heaviest, spread, and how many are outside.
- Cpk = the smaller of (upper − mean) and (mean − lower), ÷ (3 × spread).
  1.33 is the usual mark of capable. Small samples flatter it, so it is
  shown from 25 readings, always with the count.
- *Worked:* thirty packs, all between 400 and 404 g, mean 401.2, spread
  0.6. The count says passed. But Cpk is 0.67, because the mean sits only 2
  spreads above the lower limit: about 2 packs in 100 would be light over a
  shift. **Both are said.** The person decides, perhaps to set it 1 g
  higher.
- **The packers' rules** (Weights and Measures (Packaged Goods)
  Regulations 2006, the ℮ mark):
  - the average is at least the nominal;
  - fewer than 1 pack in 40 is short by more than the tolerable negative
    error;
  - none is short by more than twice it.
  - For 300–500 g the tolerable negative error is 3%: 12 g on a 400 g pack.

**Earned schedule** (Lipke, 2003), for the stage gate's forecast.
- ES = the day by which the plan had as many stages done as are done
  today.
- Pace = ES ÷ the days actually elapsed.
- Forecast = days elapsed + (planned length − ES) ÷ pace.
- *Worked*, slice 1's numbers: elapsed 39 days, ES 28, planned length 43.
  39 + 15 ÷ 0.72 = 60 days from 1 September: 31 October.

**Ergonomics.**
- **NIOSH recommended weight limit** = 23 kg × HM × VM × DM × AM × FM × CM,
  in centimetres and degrees:
  - HM = 25 ÷ H;
  - VM = 1 − 0.003 × |V − 75|;
  - DM = 0.82 + 4.5 ÷ D;
  - AM = 1 − 0.0032 × A;
  - FM and CM come from NIOSH's tables.
- **Lifting index** = load ÷ that limit. Above 1 is an increased risk; above
  3, most people are at substantial risk.
- **REBA** bands: 1 negligible; 2–3 low; 4–7 medium; 8–10 high; 11 and over
  very high.
- **HSE's MAC and ART** score in green, amber, red and purple bands. In the
  app those are said in words and marks, because the five state colours
  are kept for state.
- **These are screening tools.** HSE says the MAC alone may not be a
  "suitable and sufficient" risk assessment, and both are for trained
  assessors.

**Layout** (Muther's Systematic Layout Planning).
- The from–to chart counts the trips between each pair of areas.
- The closeness chart rates each pair A, E, I, O, U or X: absolutely
  necessary to undesirable.
- A good layout puts the heaviest routes shortest, so the measure to
  compare two layouts is Σ trips × distance.

### The earlier draft's audit of the whole app, kept short

Against Lean 4.0 (captured once at source, live, the loop) and Lean 5.0
(people first, resilient, sustainable), most of the app already fits:
- the drawer at the machine with voice, photos and files;
- the live control room;
- Needs you;
- offline sync;
- Not yet instead of blame.

The gaps found:
- the line's numbers typed by hand (and, Rowland, 1 October: "no Excel that
  needs to be uploaded");
- no value stream view;
- OEE not worked out (no longer a gap: decided 10 October, no OEE);
- the phone told only about reminders, not about what goes red;
- no trend of control;
- nothing sustainable counted;
- people counted as suppliers;
- good work thanked only on 6M;
- skills not kept.

## Sources

- [Lean Tools in the Context of Industry 4.0: Literature Review, Implementation and Trends (Sustainability, 2022)](https://doi.org/10.3390/su141912295)
- [Lean 4.0: Synergies between Lean Management tools and Industry 4.0 technologies (IFAC, ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2405896322020201)
- [Lean Meets Industry 4.0 and Operational Excellence (BCG)](https://www.bcg.com/publications/2017/lean-meets-industry-4.0)
- [Industry 5.0: towards a sustainable, human-centric and resilient European industry (European Commission, 2021)](https://research-and-innovation.ec.europa.eu/knowledge-publications-tools-and-data/publications/all-publications/industry-50_en)
- [Lean and Industry 4.0 principles toward Industry 5.0 (JMTM, 2024)](https://www.emerald.com/jmtm/article/35/9/122/1228960/Lean-and-industry-4-0-principles-toward-industry-5)
- [Toward lean industry 5.0: a human-centered model (arXiv, 2025)](https://arxiv.org/pdf/2509.11658)
- [Value stream mapping 4.0 (Meudt, Metternich, Abele — CIRP Annals 2017)](https://www.sciencedirect.com/science/article/abs/pii/S0007850617300057)
- [Extension of value stream mapping 4.0 (Production Engineering, 2023)](https://link.springer.com/article/10.1007/s11740-023-01207-5)
- [Value Stream Mapping — Lean Enterprise Institute lexicon](https://www.lean.org/lexicon-terms/value-stream-mapping/)
- [Time Value Map (AHRQ workflow toolkit)](https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/time-value-map)
- [Time value map (iSixSigma)](https://www.isixsigma.com/dictionary/time-value-map/)
- [Time value map in Excel (QI Macros)](https://www.qimacros.com/quality-tools/time-value-map/)
- [Value added vs non-value added (Fabrico — vendor)](https://www.fabrico.io/fr/blog/value-added-vs-non-value-added/)
- [Value-stream-mapping software (Wikipedia)](https://en.wikipedia.org/wiki/Value-stream-mapping_software)
- [Best value stream mapping software for manufacturing (Lean Datapoint — vendor comparison)](https://leandatapoint.com/blog/best-value-stream-mapping-software-for-manufacturing)
- [Value stream mapping online (Miro)](https://miro.com/value-stream-mapping/)
- [eVSM (Lean Enterprise Academy listing)](https://www.leanuk.org/product/evsm/10076})
- [Value stream mapping in iGrafx — timeline setup](https://doc.igrafx.com/docs/user-guide/modeling-in-the-igrafx-platform/diagram-details-web-authored/value-stream-mapping/)
- [AI value stream mapping generator (Visual Paradigm — vendor)](https://guides.visual-paradigm.com/ai-value-stream-mapping-generator/)
- [Lean Work Sampling app (App Store)](https://apps.apple.com/us/app/lean-work-sampling-lean-tool/id1256690217?uo=4)
- [Timestu — category stopwatch for Lean and Kaizen (App Store)](https://apps.apple.com/app/timestu/id6755205923)
- [AI video analysis for time study (MTM — vendor)](https://mtm.org/en/software/ai-video-analysis)
- [Yamazumi chart (Fabrico — vendor)](https://www.fabrico.io/blog/yamazumi-chart/)
- [OEE waterfall analysis (SCW.AI — vendor)](https://scw.ai/?p=27666)
- [Taking a Bite Out of Lead Time (IndustryWeek) — Little's Law](https://www.industryweek.com/operations/continuous-improvement/article/21964950/taking-a-bite-out-of-lead-time)
- [Every Product Every Interval — LEI lexicon](https://www.lean.org/lexicon-terms/every-product-every-interval/)
- [Quick changeover and production scheduling (EMS Strategies)](https://www.emsstrategies.com/dd030106article.html)
- [Standardized work — LEI lexicon](https://www.lean.org/lexicon-terms/standardized-work/)
- [Lean and the Environment: value stream mapping (US EPA)](https://19january2021snapshot.epa.gov/sites/static/files/2015-02/documents/vsm.pdf)

**Industrial engineering, added 10 October:**

- [Work measurement — the BS 3138 rating scale, basic and standard time (Wikipedia)](https://en.wikipedia.org/wiki/Work_measurement)
- [Work study and industrial engineering terms and definitions (Online Clothing Study)](https://www.onlineclothingstudy.com/2012/10/work-study-and-industrial-engineering.html)
- [How many work cycles to time — Murphy (Scion Research)](https://www.scionresearch.com/__data/assets/pdf_file/0006/59118/04_Murphy.pdf)
- [Work sampling (Wikipedia)](https://en.wikipedia.org/wiki/Work_sampling)
- [Work sampling — lecture notes, Eastern Mediterranean University](https://staff.emu.edu.tr/orhankorhan/Documents/courses/ieng301-mane301/Lecture-Notes/spring2019-2020/CH30.pdf)
- [Worker–machine charts and synchronous servicing (study guide)](https://open-exam-prep.com/study-guides/pe-industrial/methods-engineering-work-measurement/worker-machine-charts)
- [Learning curves: unit and cumulative-average models (study guide)](https://open-exam-prep.com/study-guides/pe-industrial/methods-engineering-work-measurement/learning-curves)
- Helgeson, W. B. and Birnie, D. P. (1961), "Assembly line balancing using the ranked positional weight technique", *Journal of Industrial Engineering* 12(6)
- [Capacity: design, effective, utilisation and efficiency (Operations Management, eCampusOntario)](https://ecampusontario.pressbooks.pub/opsmgmt/?p=105)
- [Throughput accounting and constraints (ACCA technical article)](https://www.accaglobal.com/uk/en/student/exam-support-resources/fundamentals-exams-study-resources/f5/technical-articles/throughput-constraints2.html)
- [Available time for changeovers, the basis of EPEI (Quality Digest)](https://www.qualitydigest.com/inside/six-sigma-article/available-time-changeovers-040714.html)
- [Cost deployment: 7 steps (IndustryWeek)](https://www.industryweek.com/operations/continuous-improvement/article/22008161/cost-deployment-7-steps-to-better-process-understanding-and-world-class-manufacturing)
- Lipke, W. (2003), "Schedule is different", *The Measurable News* — earned schedule
- [The Weights and Measures (Packaged Goods) Regulations 2006 (legislation.gov.uk)](https://www.legislation.gov.uk/uksi/2006/659/contents)
- [Manual Handling Assessment Charts — the MAC tool (HSE)](https://www.hse.gov.uk/msd/mac/)
- [Assessment of Repetitive Tasks — the ART tool (HSE)](https://www.hse.gov.uk/msd/uld/art/index.htm)
- [RR707: development of the ART tool (HSE research report)](https://www.hse.gov.uk/Research/rrhtm/rr707.htm)
- [NIOSH lifting equation — horizontal multiplier, with a worked example (CCOHS)](https://www.ccohs.gc.ca/oshanswers/ergonomics/niosh/horizontal.html)
- [Revised NIOSH lifting equation (CDC Stacks)](https://stacks.cdc.gov/view/cdc/214262/cdc_214262_DS1.pdf)
- [REBA — Rapid Entire Body Assessment (Cornell University Ergonomics)](https://ergo.human.cornell.edu/ahREBA.html)
- [SLP: four ways to analyse the flow of materials (Richard Muther & Associates)](https://richardmuther.com/wp-content/uploads/2021/06/SLP-On-line-Training-8-Four-Ways-to-Analyze-Flow-of-Materials.pdf)
- [Layout methodology (Georgia Tech)](https://www2.isye.gatech.edu/~mgoetsch/cali/Logistics%20Systems%20Design/Full%20Text%20PDF/Layout%20Methodology.pdf)

Many practitioner sources are vendors; their figures are claims, not
evidence. The method comes from Rother & Shook, the Lean Enterprise
Institute, Nakajima's TPM and Shingo's SMED; the industrial engineering
from the standard texts (Niebel and Freivalds, Groover), the ILO's
*Introduction to Work Study*, HSE and NIOSH. Study guides and lecture notes
above are pointers to that arithmetic, not authorities on it.
