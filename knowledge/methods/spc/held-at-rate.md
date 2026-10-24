---
id: spc.held-at-rate
name: Held at rate — was the agreed rate kept, interval by interval?
aka: [rate held, sustained rate, rate capability, run at rate, rate adherence, speed held]
discipline: spc
kind: adaptation
evidence: practice
depth: full
checked: 2026-10-24 — a Faultline adaptation of established parts: an individuals chart of a count per interval against a floor (or ceiling), the share of intervals met, the longest unbroken stretch, and a one-sided capability on the interval rates as `spc.capability-measured`; the worked case computed independently in `scripts/knowledge/cases-spc.py`; the lag-1 autocorrelation caveat from `stats.autocorrelation`
needs: [spc.capability-measured]
next: [commissioning.acceptance-tests]
alternatives: []
related: [spc.control-charts-variables, commissioning.ramp-up, capacity.line-capacity]
---
# Held at rate — was the agreed rate kept, interval by interval?

## Purpose and principle
An acceptance or performance test says "60 a minute for 30 minutes". The
question is not the average — a line can average 60 while stopping twice
— but whether the rate was *held*: how many of the intervals met it, the
longest unbroken stretch, and how far the shortfall went. The record is a
count per interval by a person with a clicker or a counter read on the
minute, charted as individuals against the floor.

## Questions it answers
- Did the line hold the agreed rate — every interval, most, or on average
  only?
- What was the longest stretch it held it (the number an OEM signs)?
- How many packs did it make against what the rate would have made?
- Is holding the rate capable — would a shift at this rate meet it most of
  the time?

## Inputs and minimum conditions
- The agreed rate as a floor (packs a minute; or a ceiling for a time per
  unit) and the test's length.
- The interval (1 min for a short test, 5–15 for a shift) — chosen to suit
  counting by hand; the count per interval, in order.
- At least 25 intervals for a capability figure; fewer gives the share and
  the stretch only.

## Procedure and calculation
- Rate of interval i: rᵢ = packsᵢ ÷ minutesᵢ.
- Met: rᵢ ≥ floor (or ≤ ceiling). Share met = intervals met ÷ intervals.
- Longest stretch: the longest run of consecutive met intervals × interval
  minutes.
- Made vs expected: Σpacks against floor × total minutes, as a ratio.
- Steadiness: the XmR chart on rᵢ — a point beyond its limits is a stop or
  a surge worth naming; a run of eight below centre is the line slowing.
- Capability of the rate (one-sided, the floor as the lower limit):
  Ppk = (r̄ − floor) / 3s on the interval rates, with its lower bound as
  `spc.capability-measured` gives it; ≥ 1 means the floor is about three
  standard deviations below the mean rate.
- Verdict words: *held* (every interval met), *held with gaps* (share met
  and the stretch said), *not held* (share under what was agreed, or the
  mean below the floor).

**Worked case** (`cases-spc.py`): 25 one-minute counts against a floor of
60 a minute — 60, 58, 61, 63, 65, 62, 60, 55, 54, 67, 63, 58, 59, 67, 63,
57, 62, 59, 60, 61, 60, 64, 62, 60, 63. Met 18 of 25 (72%); longest stretch
7 min; made 1,523 against 1,500 expected (1.015). The average says the
rate was met; the share says it was held 72% of the time, with a two-minute
dip to 54–55 at minutes 8–9. One-sided Ppk on the rates 0.10 — holding 60
is not capable: the mean (60.9) sits a third of a standard deviation above
the floor. Lag-1 autocorrelation 0.07 — the minutes are near enough
independent for the figures to stand.

## Assumptions, limits and misuse
- Counting by hand at one-minute intervals over a long run is a burden;
  choose the interval to suit, and say it — a 15-minute interval hides
  one-minute stops inside a met interval.
- Rates over short intervals are autocorrelated (a slow minute follows a
  slow minute); the capability is a guide, and a lag-1 correlation above
  about 0.3 means the Ppk overstates how sure it is (`stats.autocorrelation`).
- A stop inside an interval makes that interval fail; the test says whether
  the rate was *held*, not whether the machine *can* run at it — a machine
  that does 70 between stops and 50 average has a stops problem, not a speed
  problem (`equipment.short-stops-speed`).
- Counts of good packs only, if rejects are not to count — say which.
- Not for a rate that is itself the thing varied (a ramp) → `commissioning.ramp-up`.

## Reading the result
"Held with gaps: 18 of 25 minutes at 60 or more, the longest stretch 7
minutes; 1,523 made against 1,500 — a two-minute dip to 54 at minutes 8–9."
Against the agreed test ("30 minutes at 60"): not met as written; what was
met said plainly. Money: packs short of the floor over the intervals missed
× contribution a pack (`knowledge/MONEY.md`, causation T), and at scale the
shift's shortfall if the line ran like this all day.

## When not to use it — and instead
The climb to rate after start-up → `commissioning.ramp-up`. Why the rate
drops (stops, slow running) → `equipment.short-stops-speed`, `capacity.line-capacity`.
A measured characteristic's capability → `spc.capability-measured`.

## In food and FMCG manufacturing
A performance test on a new bagger ("60 a minute for 30 minutes at the
agreed reject rate"); a line's hourly counts against the planned rate on a
shift report; a case packer's rate after a changeover.

## References
- [practice] Faultline's own adaptation (22 October 2026), from the parts named in `checked`.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — individuals charts and one-sided capability (from knowledge).
- [standard] EN 415-11:2021 — efficiency and availability of packaging lines: the acceptance run's time states (scope confirmed online 22 Oct 2026; text not read).

## In Faultline
Specified as part 2 of the capability study (`knowledge/specs/FC-094-capability.md`);
not built. The performance run (`src/project`) already records a
run's rate and its shortfall in packs and money (`src/lib/runMoney.ts`); held
at rate adds the interval counts and the three figures above to that record.
