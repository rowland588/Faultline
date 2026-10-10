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

**1b. The climb to rate.**
- **Arithmetic:** `lib/rampUp.ts` (a log-log fit). Tested with:
  - three or more runs climbing;
  - under three ("too early");
  - a flat or falling climb: "not climbing — at this rate it does not
    reach 120";
  - a run already at rate.
- **Screens:** the run's card and the machine's page.
- **Paper:** the client report's account of the run.

**1c. Since you last looked.**
- **Arithmetic:** `lib/since.ts`, pure: the records and the last visit in,
  the line out. Tested with:
  - nothing changed (no line);
  - each kind of change;
  - a stage that went late while away, which is worked out from its day,
    not from an edit.
- **Device:** the last visit is kept on the device, wrapped against a
  private window.
- **Browser:** change something in a second browser, come back, see the
  line, and tap each part.

**1d. Scan the machine.**
- **Library:** one small QR library, pinned to an exact version.
- **Paper:** the labels PDF through the report engine; `report-stress`
  checks every machine's name and code on a label, nothing off the page. The
  code is also added to the client report and the handover pack.
- **Browser:** a label's link opens the machine's page in the job; a person
  without access sees the sign-in only.
- **Your five-minute check:** scan a printed label with an iPhone (opens in
  Safari, sign in once) and an Android phone.

**Release 1's acceptance:** `scripts/acceptance/stagegate-step1.mjs` drives
all four on the seeded job, and joins the gate from then on.

### Release 2 — the ecosystem, proven by the capability study

Seven layers. Each is on `main` only when whole. The early layers change
nothing on screen.

**2a. The record.**
- `supabase/STUDIES.sql`: the table, its indexes and its policies (maker;
  line members; job members; the client's restrictive policy).
- Applied, and `pg_policies` read back for `studies`.
- The mapper, `sync-schema.test.ts`, and the live schema check.
- Nothing on screen.

**2b. The list merge.**
- The sync merges `facts` lists and `uses` item by item, by `id`.
- Scenario 11: two phones add readings to one study and both are kept; one
  strikes a reading, and the strike holds.
- Nothing on screen.

**2c. The arithmetic.**
- `lib/ie/sample.ts` and `compare`, tested with:
  - the thirty packs (mean 401.2, all within, Cpk 0.67, "about 2 in 100");
  - twelve readings (no Cpk);
  - two light (didn't pass, both named);
  - the packers' rules on 400 g (TNE 12 g);
  - one-sided limits;
  - a ticks test;
  - before → after on two studies.

**2d. The capability study on its own.**
- The tool's page on the rail, Not filed, the number pad, the dots, the
  verdict, and closing as a receipt.
- `smoke`, and the browser on a phone width.

**2e. Where it sits.**
- Put on a line; attach to a job.
- Driven as owner, team and client.

**2f. Used for.**
- **The doors:** Use it for, How we know, Prove it, Take the readings, Make
  it better.
- **The branches:** the problem, fix and test drawers, the Commission
  square, Needs you, Today's update.
- **Before → after** on a fix.

**2g. The paper.**
- The client report's account lines and its Evidence appendix, the handover
  pack and the test report.
- `report-stress` and the fuzz.

**Release 2's acceptance:** `scripts/acceptance/ecosystem-capability.mjs`
drives the whole story in Chromium:
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
