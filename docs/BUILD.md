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

## Where we stand — the baseline, 10 October

- **The code on `main` (`c3dfb1c`) is identical to `630d5b9`** (panel slice
  2). Everything since is documents: `CLAUDE.md`, `docs/LEAN40.md`,
  `docs/TOOLKIT.md`.
- **That code passed the full local gate:**
  - type check;
  - lint within its ceiling of 66;
  - 1,637 unit tests;
  - the build;
  - all 106 screens clean in `smoke`;
  - 28 reports at three sizes in `report-stress`;
  - 348 fuzzed reports reconciled;
  - `sync-two-devices` 10 of 10.

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
- **Not yet:** the problem's drawer ("How we know → add a study"), the 6M
  countermeasure, the Commission square's count, Needs you ("18 readings
  still owed") and Today's update. The test and fix branches carry the story
  today; these follow with the next tool.

**2g. The paper.** Built 10 October.
- **The client report:** each open fix with a study prints its line on its
  card — before → after when it has both, else how we know or what proved
  it — and an **Evidence** appendix lists every study on the job: what it is
  of, what it is used for, what it says, "measured by people at the line".
  The report screen lists the same Evidence, each opening its study.
- `report-stress`: the huge job carries three studies (a fix's evidence and
  proof, a test's proof still short), and every line above is demanded on the
  paper.
- **Not yet:** the handover pack and the test report.

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

### Release 3 onwards — one tool at a time

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
