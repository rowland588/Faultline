---
id: commissioning.ramp-up
name: Ramp-up — the burn-down pace and the climb to rate
aka: [ramp-up, burn-down, pace to handover, climb to rate, vertical start-up, time to rate, run-up curve]
discipline: commissioning
kind: faultline
evidence: practice
depth: full
checked: 2026-10-24 — a burn-down of what is left at the pace achieved (project practice) and a climb fitted to the runs' net rates (Faultline's own, `docs/LEAN40.md` step 1b); `src/lib/pace.ts`, `src/lib/rampUp.ts`, and since 24 October the climb's money (`src/lib/runMoney.ts` climbWorth, `knowledge/specs/FC-076-run-money.md`); the worked case in `scripts/knowledge/cases-operations.py`
needs: [commissioning.stage-gate]
next: []
alternatives: [maintenance.reliability-growth]
related: [ie.learning-curve, commissioning.acceptance-tests, spc.held-at-rate]
---
# Ramp-up — the burn-down pace and the climb to rate

## Purpose and principle
Two questions every commissioning asks every morning: at the pace we
are going, when will the list be done — and at the rate the runs are
climbing, when will the line reach the rate agreed? The first is a
burn-down: work left ÷ the pace achieved so far. The second is the
climb: the runs' net rates over the days, fitted and extrapolated to
the agreed rate, with the caveat that a line levelling off never gets
there by extrapolation. Both are said in days, and the climb in money
too — what the runs below the agreed rate have cost so far.

## Questions it answers
- When will the plan's items be done at this pace (and is the pace
  slowing)?
- When will the line reach the agreed rate at this climb — if it keeps
  climbing?
- What has running below rate cost so far, and what does each day more
  cost?
- Is the climb a line learning (people), a machine bedding in (stops),
  or a settings problem (the same rate every attempt)?

## Inputs and minimum conditions
- The plan's items with their done dates (the stage gate's lists);
  the days elapsed.
- The performance runs with their day and net rate
  (`commissioning.acceptance-tests`); the agreed rate; the line's margin
  a pack and its shifts for the money.
- At least three runs for a climb worth drawing; the pace from a week.

## Procedure and calculation
- **Pace** = items done ÷ days elapsed (the window said — the whole
  project or the last fortnight; both shown when they differ); days
  left = items left ÷ pace; against the plan's remaining days; the pace
  trend (a slowing pace is the warning).
- **Climb**: the runs' net rates against their day; a straight line
  fitted (`stats.correlation-regression`); the day it reaches the agreed
  rate = (agreed − intercept) ÷ slope — said as "if it keeps climbing";
  a levelling (the last runs flat below the rate) said instead of a date.
- The climb's shape names the cause: a steady climb with the same
  stops — people learning (`ie.learning-curve`); a climb as stops fall —
  bedding in (`maintenance.reliability-growth`); flat attempts at the
  same figure — a setting or a machine limit (`spc.held-at-rate` says
  whether it is held or averaged).
- **Money** (`src/lib/runMoney.ts` climbWorth): each run's shortfall =
  (agreed − net) × its minutes × margin a pack; the climb so far = the
  sum; a day more at the current rate = (agreed − current) × the day's
  minutes × margin (`knowledge/MONEY.md`, T).
- On the project's front page and the commissioning report: the pace
  and the climb in one sentence each, with the day and the caveat.

**Worked case** (`cases-operations.py`): 21 of 40 items done in 6 days —
pace 3.5 a day → 5.4 days left; the plan said 5. The climb: net rates by
day 42, 48, 52, 55, 57 (days 1, 3, 6, 8, 11); slope 1.46 a minute per
day; reaches 60 on day 12.1 if it keeps climbing — but the last two
steps were +3 and +2: it is levelling, and the honest sentence is "about
57–58 and flattening; the next attempt says which".

## Assumptions, limits and misuse
- Extrapolating a climb that is levelling promises a date the line will
  not meet; the caveat is part of the sentence, and a flattening is
  said.
- A pace over the whole project hides the last week's slowdown; the
  recent window is shown beside it.
- Items are not equal (a 40-hour test and a 10-minute tick); where the
  list has hours, the burn-down is in hours.
- Attempts under different conditions (a different product, the OEM's
  operator) are not one climb.
- The money so far is a sunk cost said for the record; the decision
  figure is each day more at the current shortfall.

## Reading the result
"At 3.5 items a day the list finishes in 5.4 days against the plan's 5.
The runs have climbed 42 → 57 in eleven days and are flattening below
60; running short has cost £X so far and £Y a day at 57." Money: the
climb's shortfall in contribution (`knowledge/MONEY.md`, T), so far and
per day — the sentence the client report carries.

## When not to use it — and instead
The test's own pass/fail → `commissioning.acceptance-tests`. Whether the
rate was *held* within a run → `spc.held-at-rate`. The failure rate's
fall → `maintenance.reliability-growth`. The people's learning →
`ie.learning-curve`.

## In food and FMCG manufacturing
Every new line's first weeks; the OEM meeting where "nearly there" is
replaced by a slope and a day; the client report's one sentence on
whether the handover date holds.

## References
- [design] `docs/LEAN40.md` step 1b (the climb to rate), `docs/STAGEGATE.md` — Faultline's own method.
- [practice] Burn-down charts as agile and project practice (from knowledge); vertical start-up as lean project practice (from knowledge).
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018 — the fitted line and its extrapolation's limits (from knowledge).

## In Faultline
Built: the pace (`src/lib/pace.ts`, FC-077) and the climb (`src/lib/rampUp.ts`,
FC-078) on the stage gate's front page; since 24 October the climb says
what its runs below the agreed rate have cost in contribution
(`src/lib/runMoney.ts` climbWorth) on the front page, the test's card and
the client report (`knowledge/specs/FC-076-run-money.md`). Not yet: the
levelling said in words when the last steps shrink, and the pace's recent
window beside the whole.
