# Building the next stage — separated, proved, working at the end

Rowland, 10 October:

> "One thing must be clear. Before we get into this next stage of our
> development, everything we've just discussed must be fully functional. We
> don't want anything that is not correctly built. So you need to separate
> the way you're going to build this accurately and ensure that everything
> is going to work at the end."

What is to be built is designed in `docs/LEAN40.md` (the stage gate's
evolution, step 1) and `docs/TOOLKIT.md` (the ecosystem and the tools). This
document says **how it is built and proved**: the order, the separation,
the checks every piece must pass, and what stays behind so nothing proved
today can quietly break tomorrow. **Nothing in it is built yet.**

## The rule

1. **A piece is finished when every check below passes.** Then it is on
   `main`, the production deploy has succeeded, and the report says what was
   checked and what could not be.
2. **Nothing half-built reaches the app.** A piece that does not pass every
   check stays on the branch, and the report says so in the same breath:
   *this is on a branch and is not in the app*.
3. **Each piece is proven alone before the next is built on it.** The order:
   - the database before the sync;
   - the sync before the screens;
   - the arithmetic before the pictures;
   - a tool on its own before its links;
   - the links before the paper.
4. **Every piece leaves a permanent check behind**, so what was proved
   stays proved:
   - its unit tests;
   - its screens in `smoke`;
   - its pages in `report-stress`;
   - its sync scenario;
   - and, for each finished story, an **acceptance script** in
     `scripts/acceptance/` that drives the story in Chromium. Every later
     gate runs it.

## Where we stand — the baseline, 11 October

- **The code on `main` (`957b8d8`) carries releases 1, 2 and 3, tool B (the
  value stream map) and the sync engine's conditional push** (a push never
  lands over somebody else's write — the cloud's `rev`).
- **That code passed the full local gate, in one run, in this order:**
  - type check;
  - lint within its ceiling of 66;
  - 1,791 unit tests;
  - the build;
  - all 114 screens clean in `smoke`;
  - 31 reports at three sizes in `report-stress`;
  - the five acceptance scripts (release 1, release 2, step 3, 2h, B);
  - 380 fuzzed reports reconciled;
  - `sync-two-devices` 11 of 11 — and 11 of 11 in five consecutive runs on
    its own before that. The lost reading of scenario 10 was the push's
    last-writer-wins upsert (the risk table's last row); it is gone.

  CI is green on `main`'s head.
- **Not checked from here: the live database against the mapper.**
  - `check-live-schema.mjs` needs `.env`. This container has none, and
    secrets are not read.
  - The database connector did not connect this session.
  - This check is the first thing done when the connector is back, and
    before release 2 touches the database.
- **Not provable from here:**
  - real row-level security, beyond reading the policies back;
  - iOS Safari;
  - real signal;
  - push notifications.

  Each goes on "your five-minute check" for the release that touches it.

## What "correctly built" means — the checklist for every piece

| # | Check | How |
|---|---|---|
| 1 | **Agreed before code** | Which change it belongs to, which record it reads or writes, and where it shows on screen and on paper, written in the design doc. |
| 2 | **The arithmetic is right** | A pure module, unit-tested with the worked examples (numbers checked by hand), and the edge cases: empty, one, too few, a zero, a missing limit, a date in the past. |
| 3 | **Access is right** | Every write checks `can.edit`, `can.agree` or `can.remove`. The screens are driven as owner, team and client (`faultline.access.force`). |
| 4 | **The database is right** (when touched) | SQL in the house shape, applied, and `pg_policies` and `pg_indexes` read back. The live schema check and `sync-schema.test.ts` both pass. |
| 5 | **Two devices agree** (when a list is added) | A scenario in `sync-two-devices.mjs`. |
| 6 | **Every screen loads** | `smoke` covers every new screen with seeded data (`src/dev/seed.ts`), with no console errors. |
| 7 | **The paper is right** | Every new page or line is in `src/dev/reportSeeds.ts` at tiny, ordinary and huge. `report-stress` reads it back, and the fuzz reconciles its figures against the records. |
| 8 | **A person can use it** | Chromium at 1360 and 390 wide: create, edit, delete, undo, back and Escape; "12" typed stays 12; no write on every keystroke; the empty state; the client's view. |
| 9 | **The whole gate is green** | On the final commit, every script in `CLAUDE.md`'s gate, plus every acceptance script already written. |
| 10 | **It is live** | Merged to `main`, the Vercel production deploy successful, and reported with what was verified and what was not. |

## The order — separate pieces, each on `main` only when whole

### Release 1 — the stage gate's step 1

Four pieces, built lowest risk first. No database change.

**1a. The pace says when.** Built 10 October.
- **Arithmetic:** `lib/pace.ts`, a burn-down of what was actually done
  (earned schedule was dropped: the plan's days are rewritten when a stage
  moves). 19 unit tests:
  - the worked example: 7 done in the last 14 days, 7 to go, lands
    Sat 24 Oct;
  - rounding up; one date or two; no date;
  - too early, and a job just started;
  - a short window; nothing done in two weeks;
  - fixes and deleted rows left out;
  - a machine with nothing on its list;
  - one with no arrival date;
  - one still to arrive holding the forecast back;
  - one past its day.
- **The verdict:** two tests prove the answer's word and reason are
  unchanged, and a slow job with nothing late is still on target.
- **Screens:** the line under the answer on the front page, Today's update
  and the client report; the plan's dotted marker and key, with four plan
  tests.
- **Paper:** `report-stress` demands the pace's sentence and working on the
  client report, the one-page status and the day report. The plan's PDF
  carries it in its header and as its marker.
- **Browser:** driven at 1360 and 390, as owner and as client. On the
  seeded job it names the coder that has nothing on its list. Given its
  list, it forecasts after the coder arrives, the same on every surface,
  with the verdict unchanged and no console errors. "Use this date" was not
  built, because step 1 writes nothing.

**1b. The climb to rate.** Built 10 October.
- **Arithmetic:** `lib/rampUp.ts`, a learning-curve fit (log of the time per
  pack against log of the run). 12 unit tests:
  - the worked example: 96, 108, 114 against 120 gives a 90% curve, run 5,
    13 Oct;
  - two runs, "too early";
  - not climbing;
  - at the rate already;
  - the last five listed;
  - never forecasting a run already done;
  - across tests and re-runs, one product under two spellings, two
    machines, the latest agreed rate;
  - one run, or nothing agreed, gives no climb.
- **Screens:** the run's page and its drawer (with the picture), and the
  machine's page. `smoke` loads them on a seed that now holds a three-run
  climb (an earlier attempt at the wrapper's run).
- **Paper:** the client report under its runs and the run's card;
  `report-stress` demands both.
- **Browser:** driven at 1360 and 390, as owner and client:
  - the same sentence on the page, the drawer and the machine;
  - three dots, the fitted climb, and the run where it meets the rate;
  - a fourth run at 60.3 turns it to "at the agreed 60";
  - it is on the printed card;
  - no console errors.

**1c. Since you last looked.** Built 10 October.
- **Arithmetic:** `lib/since.ts`, pure. 8 unit tests:
  - a first visit, and nothing changed;
  - each kind of change, in the order said;
  - a note on an old stage is not news;
  - done on the visit's own day, before and after it;
  - a "not yet" reason is not a problem;
  - many changes name two and how many more;
  - deleted rows are not news;
  - the visit written in words.
- **Device:** the last visit is kept on the device, every read and write
  guarded.
- **Browser:** driven at 1360 and 390:
  - a first visit shows no line;
  - three days away, exactly what the arithmetic says;
  - back at once, the line is gone;
  - a problem raised since shows on the control room's row and on the front
    page, and tapping it opens the problem;
  - with storage refused, the page draws with no line and no error.
- **Changed from the plan:** the check used one browser with the visit set
  back, not two browsers. The two devices do not share a store without the
  sync running, and the last visit is per device by design.

**1d. Scan the machine.** Built 10 October.
- **Library:** `qrcode-generator` 2.0.4, pinned exactly, MIT, no
  dependencies of its own.
- **Paper:** the labels PDF through the report engine. `report-stress`
  downloads it from the Reports door and demands every machine's name,
  nothing off the page. The code is also on the client report, the one-page
  status and the handover pack; `report-stress` demands "Scan for it now" on
  each, and the status still one page.
- **Arithmetic:** 7 unit tests: the code's shape and its three finder
  squares; the same link gives the same code; a machine's link and a job's
  link; one label per machine in the job's order, deleted ones left out; the
  header with no address is exactly the three lines it was.
- **Browser:** driven in Chromium, and the printed codes decoded back from
  the rendered PDFs:
  - the sheet's three codes each scan to their own machine;
  - a machine's own label scans to it, and the link opens that machine's
    page;
  - a phone with no sign-in gets the sign-in, and nothing of the job;
  - the status, the full client report and the handover pack each carry a
    code that scans to the job.
- **Changed from the plan:** the code is on the one-page status too, not
  only the client report and the handover pack, because the status is the
  paper most often left on a desk. The programs report has none: it is a
  list for the OEM's engineer, not the job.
- **Your five-minute check:** scan a printed label with an iPhone (opens in
  Safari, sign in once) and an Android phone.

**Release 1's acceptance:** `scripts/acceptance/stagegate-step1.mjs` drives
all four on the seeded job, and joins the gate from then on. Built 10
October and in the gate. Each sentence on the screen is checked against the
module that makes it, run on the same records:
- **the pace** on the seed (the coder with nothing on its list), then with
  the coder given its list and a due day (forecast after it arrives), and
  its day on the plan;
- **the climb:** the run's sentence and the number of runs drawn;
- **since you last looked:** three days away, then back at once;
- **the labels:** one for every machine, and the status still one page with
  its code.

It reads the paper for its words. The codes were decoded back to their links
when 1d was built; no QR reader is added to the app's dependencies for a
test.

### Release 2 — the ecosystem, proven by the capability study

Seven layers. Each is on `main` only when whole. The early layers change
nothing on screen.

**2a. The record.** Built 10 October. Decision 0, the Cpk lines and the
packers' rules agreed with "go, start release 2".
- `supabase/STUDIES.sql`: the table, its indexes and its policies (maker;
  line members; job members; the client's restrictive policy).
- Applied as `STUDIES` (the first attempt came back "cancelled" with nothing
  landed; the file was made to drop nothing and applied again). Read back:
  - 22 columns, the tool check, the five indexes;
  - five policies: three permissive (the maker, the line's members, the
    job's members) and two restrictive (on a job, writing needs the owner,
    the administrator or the team, so a client reads only);
  - the cursor trigger, the guard trigger and its function, realtime, row
    level security on, and the entry in the migration history.
- **The guard** (`faultline_keep_study_agreement`, its own function so the
  shared one is never replaced from a file): on a job, anyone but the
  owner keeps what was agreed once written, which job it is on, a closed
  study's receipt, and `deleted_at`.
- **The app:** `lib/study.ts` (the record), `db/studies.ts`, the device's
  store (version 20), the mapper (the maker kept; a tool or a fact list
  this build does not know kept as it came), and `studies` synced last.
- **When a job is deleted for good:** a study only on the job goes with
  it; one also on a line stays with the line, unlinked.
- **Proved by:** `sync-schema.test.ts` and `sync-wiring.test.ts` (every
  column the mapper sends exists in the migrations, and both directions
  agree), the live table's columns read against the mapper by hand (the
  live schema check needs `.env`), and 7 unit tests in `studies.test.ts`.
- Nothing on screen.

**2b. The list merge.** Built 10 October.
- `uses` was already merged entry by entry (a list of entries with ids).
  `facts` is an object of lists, so it went whole to the newer copy. Now a
  mapper names the object columns merged one level down (`nested`), each
  key as a column is and each list entry by entry; a study's `facts` is the
  only one. Every other object column is unchanged.
- Sync scenario 10 (not 11: there were nine): the phone makes a study, the
  laptop goes offline and adds two readings, the phone adds one and strikes
  one; all five readings and the strike end on the cloud, the phone and the
  laptop. Run with the merge switched off, the laptop's two readings were
  lost, so the scenario tests the merge.
- 4 unit tests in `sync-pass.test.ts`.
- Nothing on screen.

**2c. The arithmetic.** Built 10 October: `lib/ie/sample.ts`, 17 unit
tests, the worked example's thirty packs reproduced to the decimal. A test
found a 3 g pack given the 50–100 g row's error; fixed.
- `lib/ie/sample.ts` and `compare`, tested with:
  - the thirty packs (mean 401.2, all within, Cpk 0.67, "about 2 in 100");
  - twelve readings (no Cpk);
  - two light (didn't pass, both named);
  - the packers' rules on 400 g (TNE 12 g);
  - one-sided limits;
  - a ticks test;
  - before → after on two studies.

**2d. The capability study on its own.** Built 10 October.
- **Where:** Tools on the rail → **Capability** (`/capability`): every
  study, Not filed first. A new one asks only what it is of, and the
  machine. One study at `/capability/:id`.
- **The page, in the order of the three questions:** the strip (verdict,
  count, mean, range, outside, Cpk from n); the two sentences; the dots
  between the limits beside the number pad (the pad first on a phone); every
  reading, struck ones kept; what was agreed; close as a receipt, reopen
  with why, overrule with why.
- **Agreed before measured:** until the limits and the count are agreed,
  that form is the only thing on the page.
- **Proved:** two smoke screens (the list, the seeded thirty packs), and
  driven in Chromium at 1360 and 390: the seeded study's sentences equal the
  module's; a new one start to finish on the pad (one outside → Didn't
  pass, struck → back to "2 of 5 in", five in → Passed, closed, reopened);
  a keyboard types into the pad; no sideways scroll.
- **Found by driving it:** every reading went in twice. It was saved inside
  a state updater, which React may run twice; fixed, and the comment says
  why.

**2e. Where it sits.** Built 10 October (`ui/StudyPlace.tsx`).
- One line under the study's name: "On Line 7 · attached to Line 2
  commissioning", or "a quick session, yours alone". **Put on a line**,
  **Attach to a job** (only jobs this person may change, the ones on its line
  first), **Take it off the line**, and **Take it off the job** (the owner's;
  the cloud keeps it for anyone else).
- On a job, the job's rule: the team takes readings and links it; agreeing
  the limits, overruling and taking it off the job are the owner's; a client
  reads. Driven as owner (laptop), team (phone) and client.

**2f. Used for.** Built 10 October (`lib/studyLinks.ts`, 8 tests;
`ui/StudyLinks.tsx`).
- **From the study:** **Use it for…** (a test it proves; a fix it shows is
  needed, or proves), **Make it better** (raises a fix on the test it proves,
  its words the study's figures, the study its evidence; offered when it
  failed or would drift), and each link listed with **Unlink**.
- **From a test's drawer:** **Proved by** (its study's sentences) and **Take
  the readings** (a study named for the test, on its machine and job, proving
  it). **Use its verdict** sets the test's outcome from the study's — a person
  presses it.
- **From a fix's drawer:** **How we know**, **Proved by**, **Prove it** (the
  same study on the same scope, limits already agreed), and **Before →
  after** ("Cpk 0.67 → 1.00 — just capable now. The number moved; what moved
  it is the fix's to say").
- **Today's update (2j, 11 October):** a day readings were taken or laps
  timed is a day with a story — under "What we found", one line per study:
  "Capability study — Weight accuracy 400 g: 30 readings taken by K. Ahmed —
  Passed. Not capable: Cpk 0.67 from 30 …", opening the study; on the screen
  and the day's PDF alike (one reading, `lib/day`). A failing study's line is
  red. `report-stress` demands every one on the paper.
- **The Commission board (2k, 11 October):** a test proved by a study
  carries it on its square and its phone card, a branch in two or three
  words — "Cpk 1.00" once there are enough readings for it, else "12 of 30
  readings"; not capable is amber, a failure red, anything else neutral.
- **Needs you (11 October):** a study has no day or person of its own, so
  it is never a row of its own; the test it proves has both. A test proved
  by a study still short of its readings says so under its own row — "12 of
  20 readings still to take" — on the job's Needs you and the control room's
  lists alike (`lib/portfolio` jobItems, `JobItem.branch`), and in the copied
  list; struck readings do not count. Rowland chose this over a new tool:
  "tighten what's built".
  (The 6M side — a cause's evidence and the board's countermeasure — is 2h,
  below.)

**2g. The paper.** Built 10 October.
- **The client report:** each open fix with a study prints its line on its
  card — before → after when it has both, else how we know or what proved
  it — and an **Evidence** appendix lists every study on the job: what it is
  of, what it is used for, what it says, "measured by people at the line".
  The report screen lists the same Evidence, each opening its study.
- `report-stress`: the huge job carries three studies (a fix's evidence and
  proof, a test's proof still short), and every line above is demanded on the
  paper.
- **The test's own paper (2i, 11 October):** the test card (and fix card)
  prints a strip "How we know — a study at the line" under the plan and the
  day: a test's proof ("Proved by: Capability study — Weight accuracy 400 g ·
  Checkweigher — …"), a fix's before → after; the test page shows the same
  line as **How we know**. The handover pack prints it under each test,
  after what was seen. `report-stress` demands it on both.

**2h. On a running line.** Built 11 October. On a 6M (or lever tree) job
the records a study serves are a cause on the fishbone and a countermeasure
on the board — not a test and a fix, which such a job has no page for.
(Before this, Make it better on a 6M job raised a stage-gate fix nobody
could see.)
- **Use it for…** offers the job's causes ("How we know") and its
  countermeasures ("How we know it was needed" while open, "Proves it
  worked" any time), under two headings; a closed problem's cause or a
  ruled-out one is no longer offered, but its link still shows.
- **Make it better — a countermeasure** puts one on the board: the study's
  figures its words, what it should change said ("Every reading within the
  limits, Cpk 1.33 or more, on the same readings again"; "Op 1 within the
  12.0 s takt, timed again"), on the cause the study is evidence for while
  its problem is open (its bone, its line), and opens it.
- **The countermeasure's sheet** carries How we know, Proved by, Before →
  after and **Prove it**, as a fix's drawer does (`FixStudies`); **the
  cause's panel** on the fishbone carries How we know (`CauseStudies`).
- **The 6M report** prints each countermeasure's line under it — before →
  after, what proved it, or how we know it was needed (`provedLine`, the
  same line the client report gives a fix).
- `report-stress`: the huge 6M job's calibration countermeasure has a
  capability study before (also its cause's evidence) and after; every
  countermeasure's line is demanded on the paper.
- **Its acceptance:** `scripts/acceptance/sixm-evidence.mjs`, in the gate.

**Release 2's acceptance:** `scripts/acceptance/ecosystem-capability.mjs`,
built 10 October and in the gate, drives the whole story in Chromium, each
sentence checked against the module that makes it, and a client changing
nothing:
1. a quick session;
2. put on a line;
3. attached to a job;
4. evidence for a problem;
5. a fix raised;
6. Prove it;
7. before → after;
8. the client report's PDF, read back.

### Release 3 — step 3, the work balance (tools C and D together)

Rowland, 10 October, opening the line balance: "you open 1 of them and see
both of them ... thought it would be more lean 4.0". Release 2 separated the
line standard from the line balance; this step makes the balance the work as
people do it, timed on the phone, instead of speeds typed in.

**One study, `tool: 'balance'`, per product's line standard** (no new record
and no migration — `studies.tool` already allows it): `agreed.balance` is the
takt and the allowance, agreed by the owner before the timing; `facts.steps`
are the elements — the floor's words, whose they are, the laps, the pace seen
(75 · 90 · 100 · 110 · 125), or a typed time until it is timed. Two phones
timing one study both keep their laps (merged by id, one level down, as the
readings are).

**3a. The arithmetic** (`lib/ie/balance.ts`, proved in `balance.test.ts` by
the toolkit's worked examples): basic = observed × rating ÷ 100, standard =
basic × (1 + allowance); cycles needed for ±5% at 95% (never under five); a
far lap flagged, never struck; each person's stack, the fewest people
⌈work ÷ takt⌉, balance %, the constraint, the crewing check against the map,
and a suggested balance (the elements in order, filled to takt) that is a
ghost until somebody presses **Use it**.

**3b. On the screen.** Line balance → **People — the work, timed**, beside
**Machines — capacity** (nothing in capacity changed). Start it from the
map's people (their tasks become the first elements), agree the takt
(seconds, or needed a shift over the minutes), then **Time Op N**: one big
**Lap**, the element's name on it, **Foreign — leave this out** for an
interruption. The stacks against the dashed takt line: over takt red,
typed paler and said "typed", the constraint named. **Set as the standard**
freezes a receipt; the owner can reopen it.

**3c. Where it shows — off its parent, the line standard:**
- the map's balance branch has a second line, **The work**, with its sentence
  and **Time the work ›** / **Open the work ›**;
- **Who does what** on the map shows each person's "x s of y s takt", red when
  over;
- the line standard **card on paper** (and its image) prints each person's
  seconds of takt beside them, and a **Work:** line under LINE BALANCE;
- the client report's standards pages print the same card.

**3d. On a job — evidence like any study.** Built 11 October.
- **It goes where its standard goes:** attaching the line standard to a job
  (or taking it off) carries its work balance with it (`followStandard`), so
  it is the job's evidence exactly while the standard is the job's.
- **The words and the door know the tool** (`lib/studyLinks`): "Work balance
  — Maris Piper 2kg" in the fix's drawer and the Evidence appendix, its line
  led by whoever is over takt, and it opens on its line standard's People
  view — never a capability page, never "agree the limits".
- **Make it better** on the People view, when someone is over takt and the
  standard is on a job: a fix "Op 1 carries 12.9 s against a 12.0 s takt —
  take 0.9 s of work off Op 1, or change how it is done", the balance its
  evidence. **Used for** lists what it is evidence for, as on any study.
- **Prove it** from the fix: the same elements on the same standard, whose
  they are as they stand, no laps and no pace yet — timed again. The map and
  the card read the newest; the earlier opens as itself, read only ("An
  earlier timing … Open the current one ›").
- **Before → after** (`compareBalances`): "The longest stack 12.9 s → 9.5 s
  (Op 2) against a 12.0 s takt · 70% → 79% balanced — within takt now. The
  number moved; what moved it is the fix's to say." Fair only when every
  element has a time on both sides; short of cycles is said. On the fix's
  drawer, its card in the client report, and the Evidence appendix.
- **An element with no time is not zero seconds.** Until every element has
  one, the balance claims no headcount, no balance % and no constraint: "2 of
  5 elements have a time — 7.0 s of work so far at a 12.0 s takt. Time the
  rest to read the balance." A person whose work is not all timed shows "x s
  so far — not all timed" on the map and "x s so far" on the card; who is
  already over takt is still said, in red — that much is true.
- `report-stress`: the huge job carries a line standard with a work balance
  before and after a fix; every line is demanded on the paper.
- **Drag between people (3f, 11 October):** on a laptop, an element's grip
  (⠿) drags it onto another person's section and the stacks re-read at
  once; "Whose it is" stays the way on a phone and from the keyboard.

**3e. The 6M job reads it — the fishbone and the front page.** Built 11 October. The fishbone already
filled itself from the line standard's crew and the 6M line's capacity; now
also from the standard's work, timed (`lib/fishbone`, suggestion 4b):
- **Method** — whoever carries more than takt: "Op 1 carries 12.9 s against a
  12.0 s takt — over by 0.9 s", one suggestion per person;
- **People** — when the work needs more people than the standard has: "The
  work needs 3 people at a 12.0 s takt — the standard has 2";
- **how known:** measured when every element under it was timed, reported
  when any was typed; nothing at all while an element has no time;
- the newest timing is the one read, so a fix proved by timing again stops
  the suggestion on its own;
- an accepted cause says where it came from ("The work balance: Finest Red
  2kg") and opens it — from the cause sheet, and now from the cause's panel
  too (**Open it ›** beside "From …", for every kind of source).
- **The 6M front page:** each line's card carries **The work** under its
  Line balance — "Finest Red 2kg: 28.7 s of work at a 12.0 s takt: Op 1 the
  constraint at 12.9 s, over by 0.9 s." (red only when someone is over),
  opening the balance. Only a standard that is the line's own (its
  product's program on the line, or drawn on its workspace) — never the
  job's first standard on every card. Absent until somebody has timed it.
- `report-stress`: the huge 6M job's standard carries a timed balance and a
  Method cause accepted from it.

**Step 3's acceptance:** `scripts/acceptance/work-balance.mjs`, in the gate:
the People view as the module says; an element added and timed (Start, Lap,
Lap, Foreign); rated; the map's work line and each person's seconds; the
standard attached to a job and the balance with it; Make it better; Prove
it, timed again, the earlier opening as itself; before → after on the fix;
the client report's PDF; and a client changing nothing.

### Tool B — the value stream map, a line's

(Begun as a business tool, door to door; Rowland removed business-wide
mapping the same day — B1c below. What follows is the history in order.)

Rowland, 11 October, on the decisions for B: **go**; value shown **by fill**,
never a state colour; and "VSM is not just a line tool, it's a business
tool" — so a map ran door to door, from the order (or the supplier) to the
customer, through every department it passes. Then: "see the VSM like a
grid — a swimlane grid. We can see a journey of what, who and the value",
with a picture of one (the steps in sequence across, the areas down the
side, a square per step in its area's lane, VA · NE · NV, the cycle time,
wait and lead time adding up underneath, played through). And: "there is
no drawing ... not a Visio sort of diagram ... we can see the values just
from the colours, and then I click the colour and it opens up all the
information" — with the colours his picture uses: VA green, NE amber, NV red
(the one exception to the state colours, recorded in CLAUDE.md).

**B1. The map on its own.** Built 11 October.
- **The record:** a study of tool `map` (no new record, no migration):
  `facts.flow` — the steps today, each with what happens, **who does it**
  (its lane), its kind (operation · move · check · wait · store), its value
  (adds value — only an operation can · necessary · non-value adding — a wait
  or a store always is), its time each time, the pieces it covers each time,
  what it waits after (typed, or worked out from the pieces waiting and the
  demand), people, how its next job reaches it, ✷ something must change;
  `facts.future` — the same, copied and changed; `agreed.map` — the two ends,
  the demand a day and the hours worked: takt. Two phones adding steps both
  keep theirs (merged entry by entry, as every study's lists are).
- **The arithmetic** (`lib/ie/steps.ts`, tested): lead time = every cycle +
  every wait; adds value, necessary, non-value adding; % value added; takt;
  the biggest wait; the longest time **a piece** against takt (a step done
  once for an order or a week's plan is never "over takt" by its whole
  time); today → the future, figure by figure; untimed and unmarked steps
  said, the lead time "at least" until every step has a time.
- **The page** (`/value-stream`, a line under Tools; `/value-stream/:id`):
  the totals as cards (adds value, necessary, non-value adding, % value
  added, cycle time, lead time, takt); the sentence; **the swimlane grid**
  (`ui/ValueStream`), nothing drawn — classification VA · NE · NV, the
  sequence, the areas in the order the journey reaches them, a square per
  step in its lane coloured by its value, and under it the cycle time, the
  wait and the lead time so far with a total column; **Play the journey**
  (pause, carry on, restart, speed) lights the steps in turn and adds up the
  lead time; **Show only the waste**; **tap any square of a step** and
  everything about it opens (what happens, who, its value, its kind, the
  work, the wait, the lead time by here, people, how its job arrives, how it
  is known), with **Change this step** for its sheet; **Copy to the future**
  and Today / The future, before → after said. On a phone the grid scrolls
  in its box, the areas pinned.
- **Where it sits:** on its own, on a line, on a job (as any study); Used for
  on its job.

**B1b. A line's map — what is done, and who does it.** Built 11 October.
Rowland: "who does it" as departments is a cross-functional business map,
"that won't work for a single mapping of a line — it's what is done and who
does it, different people doing different activities on the same line". So
a map is one of two kinds, chosen when it is started (`agreed.map.scope`):
- **the business, door to door** — a lane per area the order passes through
  (the office, planning, stores, a line, despatch); the lanes' heading is
  **Area**;
- **one line** — the map sits on the line (and its product's line standard,
  when the product has one), a lane per person or role on it: the standard's
  people (Op 1, Op 2 …) offered first, then the machine, the team leader,
  the fitter, quality, stores; the steps are what is done; the heading is
  **Who does it**.
Seeded: Line 7's Maris Piper 2kg, film loaded to pallet away — Op 1, the
machine, Op 2, Op 3, the team leader.

**B1c. Multi-dimensional — who and where; always a line's.** Built 11
October. Rowland: "we need it to be multi dimensional". Every step now
carries what is done, **who** does it — one or more people or roles — and
**where** — the area, station or machine. The grid's lanes are either, one
tap: **Lanes by · Who does it · Where**; a step done by two people sits in
both their lanes, in its column, so shared work shows. The step's sheet
takes several people (the line standard's people, the usual roles and the
departments as chips, "someone else" added) and a place (the line balance's
stations offered); the facts show both; Walk it asks both.

Then, the same day, after "are we drifting from Faultline if we go fully
expansive of VSM?": **"remove business-wide mapping ... but keep the line
large, different departments can affect the line."** So the door-to-door
kind B1b offered is gone: a new map always picks its line (and its
product's line standard when it has one), and its lanes are everyone whose
work touches the line — Op 1, the machine, the team leader, and planning,
stores, quality, maintenance, despatch. Why the business kind went: a map
of the whole business is not a change to a line, and a tool that grows
past the change it serves is how Faultline drifts into a mapping product
(eVSM, iGrafx); the line map keeps what the business kind was for — the
other departments' waits and work, where they land on the line. A map
saved door to door before this still opens, its lanes by where (the one
lane its steps had), and can be put on its line with Where it sits; every
step still writes that one lane for an older build.

**B1d — dropped**, 11 October: a business map with each line's own map
linked under it (the master map and its sub-level maps every VSM product
sells). It made the map a better map and no change any better.

**B2. Walk it.** Built 11 October. On the phone: say what the step is and
who does it, **Start** as it begins, **Next step** as it ends — its time the
time between taps — and the next one is already running; **Last step —
finish** or **Stop — keep what is walked**. Each step lands in the grid as it
is walked, timed (`source: 'timed'`); its value is marked and the waits (an
order sits for days) are typed back at a desk, and the page says what is
still unmarked.

**B3. The map inside a change.** Built 11 October, after Rowland's "are we
drifting from Faultline?" — the map stops growing as a map and becomes
what the capability study and the work balance already are: how we know a
change is needed, and how we know it worked.
- **Make it better from a step.** Tap a step whose work is waste or that
  has a wait after it, on a map attached to a job: **Make it better —
  raise a fix** (stage gate) or **— a countermeasure** (6M). Its words are
  the step's own figures — "Pallet waits for QA release (Palletiser) —
  6.0 h wait", "Walk to fetch flat cases (Stores) — 1 min of waste each
  time (for 120)"; a countermeasure sits on the bone of whose work it is
  (maintenance or the machine: Machine; stores or the forklift: Material;
  quality: Measurement; anyone else: Method), says where, and what it
  should change ("shorter or gone, walked again on the same map"). The map
  is its evidence, the link naming the step (`StudyUse.step`). The whole
  map is never "made better" at once — a stream is changed a step at a time.
- **The branch off the step.** The step's squares wear a small ink ring;
  its facts say **Being made better** and open the record — no state colour.
- **Prove it — walk the line again.** On the fix (or the action), Prove it
  starts a second map on the same line with the same steps, each
  **carried** from before (`source: 'carried'`) and said to be: "16 steps
  are carried from the map before — not walked or typed again yet". **Walk
  it again** times the carried steps in their order (each Next times the
  one up next; nothing is appended); a step opened and saved is typed.
- **Before → after**, worked out, on the fix's drawer, the action's sheet,
  the client report, the fix card, the handover, the 6M report (under its
  problem and on the board): the step first, then the stream — "Pallet
  waits for QA release: wait 6.0 h → 1.5 h. Lead time 1.5 d → 1.3 d
  (−4.5 h). 15 of 16 steps carried from before, not walked again yet." —
  and nothing claimed while that step is still carried. Only what moved is
  said to have moved ("Lead time 1.3 d, no change").
- Seeded: Line 7's map on the Line 2 job, a fix from its QA wait, the line
  walked again; on the report jobs, a map-proved fix and a map-proved
  countermeasure, demanded on paper by the stress test.
**B3b. The map on the fishbone and the line's card.** Built 11 October.
- **The fishbone offers it.** On a 6M problem about the whole line, the
  line's newest map on the job offers its biggest wait and its work that is
  waste (three at most), each on the bone of whose work it is — "Release the
  run to the line (Office) — 20.0 h wait" on Method, "Reset the sealing jaw
  (Bagger) — 10 min of waste each time (for 4800)" on Machine; about one
  machine, only that machine's steps. Measured when timed on the walk,
  reported when typed; a step carried from before is not offered — it has
  not been seen again. Accepted, the cause says **The value stream map:
  <its name>** (`CauseSource.tool`) and **Open it ›** opens the map.
- **The line's card** (the job's Lines) gains **The flow** under the work:
  "Lead time 1.1 d · 0.001% adds value", what is still carried said, one tap
  to the map. Neutral — a lead time is not judged here.
- Seeded: Line 7's map on the Line 7 pace job; smoke opens its card and the
  old case's fishbone.
**B4. The map on paper.** Built 11 October. A map is in each report's
**Evidence** appendix with its title, what it is used for and its sentence,
and under them **the stream as a table**: a row per step in order — what is
done, who, where, its value as the grid shows it (the VA green · NE amber ·
NV red square, its letters on it), its work (a piece's batch said: "10 min
for 9600"), the wait after it, the lead time by the end of it — and the
totals. A step a fix or a countermeasure was raised from says **Being made
better: <its title>** under its name; steps carried from the map before are
said in one line over the table and their figures are grey (the old ones).
The words are worked out once (`lib/ie/steps` streamRows) and drawn by one
block (`lib/report/streamTable`) on both papers:
- **the client report** — Evidence is now the last thing in it, after the
  line standard's own pages: it is the appendix, and a table running over
  must not strand its last rows on a page of their own before them;
- **the 6M report** gains the same Evidence appendix — every study on the
  job (on the line, for a line's deck), what it is evidence for (a cause,
  an action) and what it says.
The stress test demands every step, who and where, the branch, the total
lead time, and each 6M study's title and sentence.
- **Its acceptance:** `scripts/acceptance/value-stream.mjs`, in the gate —
  a new map picks its line; the line's map reads as the module says (the
  sentence, lanes by who and by where, a shared step in two lanes); Walk it;
  Make it better from a waste step; Prove it and Walk it again; before →
  after on the fix; the client report's PDF read back (the before → after,
  the stream as a table, the branch); the 6M fishbone offering the map's
  wait and waste, accepted onto its bone; and a client changing nothing.


### Tool F — the changeover and its interval

Built 12 October, the five pieces in BUILD's order (arithmetic, the study
alone, its links, its paper, its acceptance). No new table, no migration, no
new noun: a study of tool `changeover` (already in `studies_tool_check`).

- **The record.** `facts.sequence` — the steps in order, each `internal`
  (the line stopped) or `external` (could be done while it runs), its
  seconds, `timed` · `typed` · `carried`; `fromProduct`, `toProduct`;
  `perWeek`; the interval's inputs typed once — `products` (each with its
  demand a day and the line's rate on it, or its minutes a day) and
  `availableMinPerDay`. Both lists merge by id between two phones. The agreed
  sequence lives on the to-product's line standard inside its existing
  `capacity` jsonb: `capacity.changeovers[]`, one per product it is changed
  from (the mapper passes `capacity` whole).
- **The arithmetic** (`lib/ie/changeover.ts`, proved in `changeover.test.ts`
  by the toolkit's numbers: 450 − 300 = 150 free; 5 × 42 = 210 → 1.4 days;
  5 × 27 = 135 → 0.9 days; 15 × 6 = 90 min a week): the minutes now, internal,
  external, with the external work out, the week bought back, the interval
  and the changeover a daily interval needs; the verdict (over the agreed
  standard red, external work inside the stop amber, within green); before →
  after, nothing claimed while a step is carried.
- **The study alone** (`/changeover`, `/changeover/:id`): Lap on the phone,
  typed steps, the split bar (internal solid, external hatched; the bar with
  the external work out under it), the interval sheet (the line's products
  offered with the balance's rate, the day from its planned hours), Set as
  the standard (`can.agree`) — a receipt, reopenable.
- **Its links.** Make it better from a step (a fix, or a countermeasure on
  Method for external work, Machine for an internal step), Prove it (the same
  steps carried, Lap times the one up next), before → after on the fix and
  the board. Shows under the product's standard (with its agreed sequences),
  on the line tools page, on the 6M line's card, on the fishbone (Method and
  Machine, `CauseSource.tool: 'changeover'`), in Today's update.
- **Its paper** (`lib/report/changeoverTable`): the steps as a table in the
  client report's and the 6M report's Evidence, seeded tiny, ordinary and
  huge; `report-stress` demands every row and the figures in words.
- **Its acceptance:** `scripts/acceptance/changeover.mjs`, in the gate.

Not built: a filmed changeover cut into steps (the walk's film is not yet a
source for a study's steps); the interval's picture (one cycle of every
product on a timeline — the sentence carries it for now).

**The tools**, from `docs/TOOLKIT.md`, Part 5:
- B, the map;
- C, the time study;
- D, the balance and the cycle;
- E, a shift's losses;
- F, the changeover;
- H, the rest.

**Each tool goes in the same order:**
1. its arithmetic;
2. the study on its own;
3. its links, which come with release 2;
4. its paper;
5. its acceptance script.

**The stage gate's step 3** items come one at a time, each its own
decision, in the same way.

### Tools E and F — a shift's losses, and the changeover

Designed 11 October from `docs/TOOLKIT.md` Part 4 §7 and §6, built in
parallel by two helpers in their own worktrees and integrated through one
gate; the shape below was written before either was built. Neither adds a
table, a column or a noun: both are studies (`tool: 'losses'`,
`tool: 'changeover'`), and the changeover's agreed sequence lives inside the
product's standard's existing `capacity` jsonb.

**E. A shift's losses, by hand — and what they cost.**
- **The question:** of what the line should have made this shift, where did
  the rest go — and how much do we not yet know?
- **The record:** `facts` — the shift (from `lib/shifts`, or a typed window),
  planned minutes, packs made, rejects, the rate per minute (the product's
  standard when there is one, else typed — and which), the product. The stops
  are not copied: they are the line's `Observation` records in the window,
  read when the figures are made, as the Pareto reads them. Pounds from
  `lib/cost`; no cost model, no pounds said.
- **The arithmetic** (`lib/ie/losses.ts`, tested on the worked example:
  450 × 100 = 45,000; made 36,500 → 85 min lost; 52 stops + 18 changeover +
  6 rejects explained; 9 of **slow running and short stops**): expected at
  the bottleneck's ideal speed (a machine's plate speed, a person's standard
  time), the planned minutes the shift less its
  breaks, lost minutes, the minutes by cause, the changeovers as their own
  bar, the rejects in minutes, the rest — slow running and short stops,
  split by the running speed timed (never below zero — stops exceeding the
  loss are said, not hidden), the pounds in two parts per bar: idle labour
  and lost contribution (`docs/CAPACITY.md` §5–6). No percentage score, no
  OEE.
- **The page:** end of shift, two numbers and the rejects; the waterfall to
  scale (planned → stops by cause → changeovers → rejects → slow running and
  short stops → made), the causes as a table with their stop counts and the
  two parts of their pounds; the reading sentence; "how known" on every
  number. Only the abnormal carries colour: the slow running and short stops
  amber over a tenth of the loss.
- **The doors:** Make it better on any bar raises the fix or the countermeasure
  with the figure in its words; Prove it counts the next shift as proof;
  before → after is lost minutes and the unexplained part.
- **Where it shows:** the line's board beside the Pareto (the latest shift in
  one line); the fishbone's suggested causes from the biggest explained
  causes, on the bone Capture's category maps to; the line's row in the
  control room as a branch; the pace report's page and the 6M report's
  Evidence appendix as a table; the fix's drawer.
- **Accepted by** `scripts/acceptance/shift-losses.mjs`: a count on the
  phone, the sentence, Make it better → the countermeasure with the figure,
  Prove it → a second count, before → after, the table on paper.

**F. The changeover and its interval.**
- **The question:** how long does the changeover take, how much of it could
  be done while the line still runs, and how often can each product run?
- **The record:** `facts` — from and to product, the **steps** (a list: name,
  seconds, side internal · external, how known timed · typed · carried), the
  changeovers a week. **Set as the standard** writes the agreed sequence and
  its minutes into the product's standard (`capacity.changeover`). The
  interval reads each product's standard on the line.
- **The arithmetic** (`lib/ie/changeover.ts`, tested on the worked example:
  450 − 300 = 150 min free; 5 × 42 = 210 → every 1.4 days; 5 × 27 = 135 →
  every 0.9 — daily; 15 × 6 = 90 min a week back): minutes now, minutes with
  the external work outside, bought back a week, the free time for
  changeovers, the interval, the changeover a daily interval needs. Enough:
  the interval needs every product's standard, and says how many have one.
- **The page:** Lap on the phone as the changeover happens, each step tapped
  Internal or External, or typed; the split bar now (internal solid, external
  light — fill, never a hue) and under it the bar with every external step
  moved out, the minutes saved beside it; the interval line in words.
- **The doors:** Make it better on an external step raises the fix with the
  figure ("Pre-stage the film reels — external, 11 min"); Set as the
  standard (the owner's); Prove it times it again, carried then timed;
  before → after is the minutes and the week's minutes back.
- **Where it shows:** under the product's standard, with a branch to the
  study; the line's tools beside the balance and the map; the fishbone on
  Machine and Method (the longest internal steps, the external work still
  done with the line stopped); the card's studies branch; the client report
  and the 6M report as a table (step · side · minutes · how known) with the
  two bars in words and the interval line.
- **Accepted by** `scripts/acceptance/changeover.mjs`: Lap two steps with
  Internal/External, type the rest, the split bar's minutes, the interval
  sentence, Make it better → the fix, Set as the standard → the standard
  shows it, Prove it → carried then timed, before → after, the table on paper.

**For Rowland to decide, E and F:** whether slow running is a bar of its own
(it is not measured by hand, so the design leaves it inside "not yet
explained" and says so); whether a changeover is a stop category in Capture
today or needs naming; the cost per hour the pounds should use.

### Tools H1 and H2 — work sampling; capacity's three numbers and the mix

Designed 11 October from `docs/TOOLKIT.md` Part 4 §9 and §10; the arithmetic
built first, on its own, from the worked examples (`lib/ie/sampling.ts`,
`lib/ie/mix.ts`, tested), the screens after E and F have landed so the shared
files are touched once. No new table or column: a sampling study is a study;
the three numbers' planned losses and the mix's margin and demand live inside
the standard's existing `capacity` jsonb (`plannedLossMinPerShift`,
`throughput`), never in a new column.

**H1. Work sampling.**
- **The question:** across a shift, what share of their time are people
  working, walking, waiting, searching or away — and how sure are we?
- **The record:** a study of tool `sampling`: `facts.activities` (the five,
  editable), `facts.who` (people or roles from the line standard), the
  margin wanted in points, the shift window, the prompt instants drawn once
  at random inside it (so every device asks at the same moments), and
  `facts.taps` — one fact per person per prompt (a list merged by id: two
  phones watching one line both keep theirs).
- **The arithmetic** (tested: p 0.30 within ±5 points → 323 taps; 61% from
  190 taps → ±7): each share with its margin at 95%; taps needed for the
  margin wanted; how many more; under 30 taps "too early", never a figure.
- **The page:** the prompts come while the app is open, as reminders do (no
  push for it yet — decision 6 of the TOOLKIT); one tap per person says what
  they were doing; the shares as the Pareto's ranked bars with the margin on
  the biggest; the reading sentence per person; the meter of taps against
  taps needed; missed prompts said.
- **The doors:** Make it better on a share (waiting, searching) raises the
  fix or the countermeasure with the figure in its words; Prove it samples
  the shift again after the change; before → after on the share.
- **Where it shows:** the Pareto; the 6M's People and Method as suggested
  causes; the line's tools; the pace report's page and the Evidence appendix.
- **Accepted by** `scripts/acceptance/work-sampling.mjs` (when the screens
  are built): a study started with two people, a prompt answered on the
  phone, the shares and their margins, too early → enough, Make it better.

**H2. Capacity's three numbers, and the product mix.**
- **The question:** of what the line was built to make, what can it really
  make, and what did it make — and when it cannot make everything asked,
  which product first?
- **The record:** nothing new of its own. Design is the plate rate × the
  shift's planned minutes (the balance's station); effective takes out the
  standard's planned losses a shift; actual is a shift's count — the losses
  study's packs made (tool E), so the two tools read one number. The mix
  reads each product's margin a pack and demand a week from its standard and
  the constraint's speed on it from the balance.
- **The arithmetic** (tested: 148,000 ÷ 201,600 = 73% utilisation, ÷ 175,000
  = 85% efficiency, demand 161,000 → loading 92%; £0.40 × 80 = £32 a
  constraint minute beats £0.60 × 40 = £24 — A first; the week filled in that
  order, what is left said unmade by name).
- **The page:** three marks on the balance's bars for the station (design,
  effective, actual) and the sentence; the mix as ranked bars and the week
  filling like a tank, the unmade in words. Only the abnormal carries colour:
  loading over 100% and anything unmade.
- **The doors:** Make it better on the gap between effective and actual
  raises the fix with the figure; the mix's order is a decision, so it is
  Set as the plan on the standard (the owner's), with who and when.
- **Where it shows:** the balance (Capacity view); the product's standard;
  the control room's line row (loading over 100% as the abnormal word); the
  client report's capacity page.

**For Rowland to decide, H1 and H2:** whether a prompt while the app is open
is enough for the first cut of sampling (no push yet); the activities' names
on his floor; whether the mix's margin a pack is a number he will type.

### Tool H3 — ergonomics: can people do it all shift?

Designed 11 October from `docs/TOOLKIT.md` Part 4 §11; the NIOSH lifting
equation built first as arithmetic (`lib/ie/ergo.ts`, tested on the CCOHS
example: 23 × 0.83 × 0.78 × 0.85 × 1 × 1 × 0.90 = 11.4 kg; 13 ÷ 11.4 = 1.14,
increased risk), its screen with H1 and H2. The HSE sheets (MAC, ART, REBA)
are **not** written from memory: each is transcribed from its published sheet
with the source open and attributed (Crown copyright, Open Government
Licence), as a slice of its own, and until then the app offers the one method
it can prove.
- **The record:** a study of tool `ergonomics`: `facts.method` (`niosh`
  first), `facts.answers` (the measurements as the sheet asks them — the
  hands' distance out and height, the travel, the twist, lifts a minute, how
  long, the grip), `facts.who` — the person on the line standard's map it
  assesses, who then wears its band.
- **The page:** on the standard's map, tap a person: Assess; one box per
  measurement with the sheet's own words and a picture of what is measured;
  the limit and the index; the band in words, never only a colour; always
  the caveat — a screening tool, for a trained assessor, not a full risk
  assessment. A task the equation does not cover says so instead of a number.
- **The doors:** Make it better raises the countermeasure on People with the
  figure ("13 kg lifted from the floor against a limit of 11.4 — index 1.14");
  Prove it assesses again after the change; before → after on the index.
- **Where it shows:** the person on the standard's map (the band as a mark
  with its words); Hand over's standard; the 6M's People; the standard's page
  on paper (the measurements, the limit, the index, the caveat).

### Line capacity — the line balance seen for what it is

Rowland, 12 October: "In principle, the line balancing is actually a
capacity model ... following actually how the VSM map is designed ... this
is about the capacity of the line ... understanding the V-curve ... my
bottleneck could be people, it could be an asset ... I must be able to
convert the next process to fully understand the actual bottleneck. And
sometimes bottlenecks change depending on what a human puts in a basket."
And on the name, asked: **Line capacity**.

**The review (what was already there).** `lib/capacity.ts` is a capacity
model: stations in flow order, machines and people alike (a person typed as
"this many every this many seconds"); each in its own unit with the
conversion from the one before ("1 basket = 12 bags"), the chain put into
the line's unit at its start; speed while running and once its own stops
count, rejects put back; the bottleneck on both, said when they differ;
what arrives against what each does; what-ifs that move the bottleneck
(10 in a basket instead of 12); Make it so; the cross-check against the
logged stops (the true bottleneck is never starved or blocked). What was
missing: the V-curve, a grid read at a glance, and a name that says it — on
the product's line standard it was "Line balance", whose lean meaning is
the people's work against takt, only its second tab.

**The shape.**
- **The name.** "Line capacity" on the rail, the page and the paper. The
  people's work against takt (the Yamazumi, tools C and D) stays inside it as
  its People view — that is the line *balance*. The record is unchanged
  (`standards.capacity`, the stations, the what-ifs); the URL `/balances`
  keeps working. The line standard stays where people are put in places.
- **Not the map's grid** (Rowland, the same day: "Scrap that, don't do that
  ... do some research on the correct sort of user interface"). The research:
  Toyota's standard work is three forms — the **production capacity sheet**
  (each process's machine time, manual time and tool change → capacity a
  shift: 27,600 s ÷ (24 s + 60 s every 300) ≈ 1,140 a shift), the
  **combination table** (the People view) and the **standardized work chart**
  (the line standard). Line capacity is the first form: a row per station in
  flow order — its unit and conversion, its speed (a rate, or a person's
  "one every so many seconds" × crew), its own stops, its changeovers a
  shift (from SMED when one is timed), its capacity a shift in its own unit
  and in the line's, its share of the bottleneck's, and what demand needs of
  it (over 100% red). Tap a row for its sheet.
- **The V-curve**, above the sheet (packaging-line practice: machines across
  in flow order, speed as a share of the critical machine's, the critical
  machine at the bottom; LineView's rule of thumb, +10% a machine away, is a
  vendor's, not a standard — so the margin is the owner's). Every station's capacity in the line's unit, the
  bottleneck at the bottom, the stations upstream and downstream rising
  away from it: the line designed so the bottleneck is never starved or
  blocked. Drawn as two curves — while running, and once stops count — with
  the bottleneck named in words (not a state colour) and the guide V: each
  station away from the bottleneck agreed faster by a margin the owner sets
  (offered, never assumed). A station under its guide is said in words —
  "the case packer is only 4% faster than the bagger: a short stop there
  starves the bagger".
- **What-ifs** as now, each redrawing the grid and the V, the moved
  bottleneck said in one sentence; Make it so raises the action.
- **Where it shows** as now (the 6M line card and fishbone — a machine
  bottleneck on Machine, a crew on People — the client report's capacity
  page), with the V's sentence added; on paper the grid becomes the
  stations table and the V-curve its figures in words.
- **Accepted by** a script that drives: the grid's speeds and conversions as
  the module says, the bottleneck named, a person's basket changed in a
  what-if and the bottleneck moving, the V's guide margin set and a station
  under it said, the paper.

## What is needed from Rowland, release by release

| Release | Before it starts | At the end |
|---|---|---|
| 1 | "Go", and any change to the words of the four sentences (`docs/LEAN40.md`, step 1) | the five-minute phone check of a printed label |
| 2 | Decision 0 (the one new record), the Cpk lines (1.33, 1.00, from 25), the packers' rules applied plainly | a capability study on your own phone, start to finish |
| 3+ | "Go" per tool, and that tool's decisions in `docs/TOOLKIT.md` | the tool on your phone |

## What could go wrong, and what stops it

| Risk | What stops it |
|---|---|
| Schema drift, which has happened four times: a row silently never leaves the device | `sync-schema.test.ts` on every commit, and the live schema check before any app change that depends on the database |
| A policy change that silently drops access | `pg_policies` read back for every table touched; a select policy has no `with_check` |
| A number that looks right and is not | Every figure has a hand-checked worked example as a unit test, and the fuzz reconciles the paper against the records |
| A screen that passes the tests and fails a person | The browser walk of the first-thirty-seconds defects, every time |
| A half-built piece reaching the app | Only whole pieces merge to `main`; anything else stays on the branch, and is said so |
| A new piece breaking an old one | Every earlier acceptance script runs in every later gate |
| Two phones overwriting each other's list | The list merge by `id`, proven in 2b before any screen uses it |
| Two phones writing one row in the same moment — the second write replacing the first, the first device never sending again | The push is conditional on the cloud's `rev` (11 October): a row the cloud moved under a device is pulled, merged and sent again in the same pass; `sync-pass.test.ts` makes the race on purpose, and scenario 10 of the two-device harness runs it live |
