---
id: spc.run-rules
name: Run rules — patterns on a control chart (Western Electric, Nelson)
aka: [Western Electric rules, Nelson rules, zone tests, WECO rules, sensitising rules]
discipline: spc
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the eight tests as Nelson (1984) numbers them and the four Western Electric zone rules (from knowledge; Montgomery ch. 5 lists both); every rule's false-alarm probability on one in-control normal point computed independently in `scripts/knowledge/cases-spc.py`
needs: [spc.control-charts-variables]
next: [rca.fishbone-5whys]
alternatives: [spc.cusum-ewma]
related: [spc.control-charts-attribute, stats.autocorrelation]
---
# Run rules — patterns on a control chart (Western Electric, Nelson)

## Purpose and principle
A point beyond three sigma is not the only sign of a special cause. A run
on one side of the centre, a steady climb, a cluster near a limit are each
unlikely on a stable process and each means something different on the
floor — a shift, a trend, a mixture of streams. The rules make those
patterns explicit tests with known false-alarm rates, so the chart is read
the same way by everyone.

## Questions it answers
- Has the process shifted, even though no point is outside the limits?
- Is it trending (wear, warming, depletion)?
- Are two streams mixed (two heads, two reels), or has the variation
  collapsed (a stuck gauge, rounded readings)?

## Inputs and minimum conditions
A control chart with its centre and limits from a steady period, and the
zones drawn: A (2σ to 3σ), B (1σ to 2σ), C (within 1σ), each side. The
readings must be about independent — see the autocorrelation limit.

## Procedure and calculation
**Nelson's eight tests** (1984), the common names and each one's chance of
firing on one in-control normal point (computed, `cases-spc.py`):
1. One point beyond 3σ — 0.0027 (ARL 370).
2. Nine in a row on one side of the centre — 0.0039 (Western Electric used eight: 0.0078).
3. Six in a row steadily rising or falling — about 0.0028 (two directions, 1/360 each, counting only strict runs).
4. Fourteen in a row alternating up and down — about 0.004.
5. Two of three in zone A or beyond, same side — 0.0031.
6. Four of five in zone B or beyond, same side — 0.0055.
7. Fifteen in a row in zone C (either side) — 0.0033 — too little variation: a stuck gauge, rounded readings, or limits set from a wider period.
8. Eight in a row outside zone C, both sides — about 0.0001 — a mixture of two streams.

**Western Electric's four** are tests 1, 5, 6 and the run of eight.
Nelson's tests 2 and 5–6 are the ones that catch a shift; 3 a trend; 4, 7
and 8 problems with the data or the stream.

**The cost of adding rules.** Taking rules 1, 2 (eight), 5 and 6 together
as if independent, the chance of some signal on any one in-control point is
about 0.019 — an in-control ARL near 53 instead of 370. Each rule added
makes the chart cry wolf sooner; that is the price of catching smaller
shifts, and it must be chosen, not drifted into.

**What each pattern usually means** (the reading the floor needs): a run on
one side — a step change (a new reel, a new operator, a set-point moved); a
trend — wear, warming, a hopper running down; alternation — over-adjustment
or two heads sampled in turn; fifteen inside zone C — check the gauge and
the limits before celebrating.

## Assumptions, limits and misuse
- Each added rule raises the false-alarm rate (above). Pick a few — on a
  food line usually 1, 2, 3 and 5 — and keep them; a chart with all eight is
  an alarm that never stops.
- Autocorrelated readings (consecutive packs, temperatures a second apart)
  trip tests 2, 3 and 4 constantly: the runs are real but the cause is the
  sampling. Sample further apart or chart the residuals (`stats.autocorrelation`).
- The rules assume the centre and limits are right; after a deliberate
  change the limits are reset from a new steady period, not kept.
- On attribute charts (p, u) with varying n, the zones move with n; the
  run-of-points tests still hold, the zone tests need the per-point limits.
- A rule fired is a reason to look, not proof of a cause.

## Reading the result
"Steady: no rule fired in 25 points." · "Test 2: nine in a row above
400.4 g from 10:40 — a step up, about the time the second reel went on." ·
"Test 3: six readings rising from 14:00 — jaw temperature climbing."
Then the cause (`rca.fishbone-5whys`), and the money the shift was costing
while it ran (the give-away or the rejects over the run, `knowledge/MONEY.md`).

## When not to use it — and instead
A small persistent shift sooner than a run of nine → `spc.cusum-ewma`. A
single big change → the limits alone (test 1). Readings that are not
independent → `stats.autocorrelation` first.

## In food and FMCG manufacturing
Fill weights after a reel or hopper change (a run on one side); oven and
fryer temperatures through a shift (a trend); checkweigher readings from
two lanes sampled alternately (test 4 or 8); a hand-read gauge that always
gives the same three values (test 7).

## References
- [paper] Nelson, L.S. (1984), "The Shewhart control chart — tests for special causes", *Journal of Quality Technology* 16(4), 237–239 — the eight tests (from knowledge).
- [manual] Western Electric Company (1956), *Statistical Quality Control Handbook* — the zone rules (from knowledge).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 5 — the sensitising rules and their effect on the ARL (from knowledge; edition to confirm).
- [textbook] Wheeler, D.J. and Chambers, D.S. (2010), *Understanding Statistical Process Control*, 3rd ed., SPC Press — the four detection rules and the case for using few.

## In Faultline
Built (W2, 24 October; FC-090). The chart reads Western Electric's four rules by
default and Nelson's other four as options (`src/lib/ie/charts.ts` `nelson`),
a firing merged per episode so a long run is one signal that goes on, each said
in words with what it usually means — a signal is a reason to look, not a
cause. The capability study's steadiness check keeps its own two rules.
Proved by `control-chart.mjs`.
