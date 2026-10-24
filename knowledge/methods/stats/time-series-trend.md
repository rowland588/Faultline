---
id: stats.time-series-trend
name: Is it trending? — run charts, moving averages and the trend test
aka: [run chart, trend line, moving average, Mann–Kendall, runs test, week on week, before and after]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the run chart's runs rule, the least-squares trend and the Mann–Kendall test as standard texts give them (from knowledge: Montgomery & Runger; Mann 1945, Kendall 1975); the worked case computed independently in `scripts/knowledge/cases-stats.py`; Faultline's weekly measures and proof in `src/lib/measures.ts` and `src/lib/measureProof.ts`
needs: []
next: [stats.two-sample-tests]
alternatives: [spc.control-charts-variables]
related: [visual.kpi-tree, stats.autocorrelation, spc.cusum-ewma]
---
# Is it trending? — run charts, moving averages and the trend test

## Purpose and principle
A weekly reject rate, a daily give-away, a monthly complaint count: the
question on the board is whether it is going somewhere or just wandering.
The run chart draws it in order with its median; the runs rule and the
trend test say whether the pattern is more than chance; the moving
average shows the direction under the noise; and a before → after
comparison says whether a change made a difference. It is the
visual-management reading of a measure over time, one step short of a
control chart.

## Questions it answers
- Is the measure rising or falling, or just varying?
- How fast (the slope per week), and since when?
- Did the fix change it (before → after)?

## Inputs and minimum conditions
A measure at equal intervals (shift, day, week), in order, at least 8–10
points for the runs rule, 12+ for a slope worth quoting; the measure
defined the same way throughout (a changed definition is a step, not a
trend).

## Procedure and calculation
- Run chart: the points in order, the median drawn; the runs rule — count
  the runs above and below the median (ignoring points on it); for n
  points the expected runs are about n/2 + 1, and fewer than the table's
  minimum (for n = 12, under 4; n = 20, under 6) means a shift or trend; a
  run of 6+ rising or falling (Nelson's test 3) means a trend.
- Least-squares trend: y = a + b·t; the slope b per interval with its
  interval and p (`stats.correlation-regression`); R² says how much of the
  movement is the trend.
- Mann–Kendall (no shape assumed): S = Σᵢ<ⱼ sign(yⱼ − yᵢ); Kendall's τ =
  S / (n(n − 1)/2); p from τ's distribution; robust to outliers and the
  usual choice for a monotonic trend in a short series. Sen's slope (the
  median of all pairwise slopes) for the rate.
- Moving average over w intervals (4 weeks, 7 days) to show direction;
  it lags by (w − 1)/2 intervals, so it never says "since when" — the
  CUSUM does (`spc.cusum-ewma`).
- Before → after a change: the two periods compared as two samples
  (`stats.two-sample-tests`), with the run chart showing the change point;
  or the trend fitted to each period.
- Seasonality (a weekly pattern in daily data): compare like with like
  (Mondays with Mondays) or difference by the period before testing.

**Worked case** (`cases-stats.py`): twelve weekly reject rates (%) — 2.1,
2.3, 1.9, 2.4, 2.2, 2.6, 2.5, 2.8, 2.7, 3.0, 2.9, 3.2. Median 2.55, runs
about it: 4 (expected ~7) — a pattern. Slope +0.10 points a week (p =
0.00002, R² 0.84); Mann–Kendall τ 0.79, p = 0.0001. The 4-week moving
average climbs 2.18 → 2.95. Verdict: a real rising trend of about a tenth
of a point a week — in 12 weeks the rate has gone from about 2.0 to 3.1%.

## Assumptions, limits and misuse
- Twelve points is a short series; a slope from 6 is a guess. Say the
  count.
- Autocorrelation (`stats.autocorrelation`) makes the slope's p too small;
  Mann–Kendall is less affected but not immune.
- A step (a new product, a new definition) read as a trend; look at the
  chart before the test.
- The moving average lags and smooths steps into slopes; never read a
  change point from it.
- "Up three weeks running" is two points beyond chance on average; the
  rules above are the test, not the feeling.

## Reading the result
"Rejects are rising about 0.1 points a week (p < 0.001): 2.0% in week 1,
3.1% now." Then the money of the trend — the extra rejects a week ×
their cost (`knowledge/MONEY.md`, Q), and where it is heading in four
more weeks if nothing changes — and the cause (`rca.fishbone-5whys`),
with the chart's start of the climb as the clue.

## When not to use it — and instead
A measure to be *held* with limits and signals → `spc.control-charts-variables`.
A small drift to catch early → `spc.cusum-ewma`. Groups rather than time →
`stats.anova`.

## In food and FMCG manufacturing
Weekly reject or complaint rates, daily give-away, shift output, weekly
downtime minutes, monthly energy per tonne, a project's measure through
its weeks (the proof that a change held).

## References
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018 — regression on time; the runs test (from knowledge).
- [paper] Mann, H.B. (1945), "Nonparametric tests against trend", *Econometrica* 13(3), 245–259; Kendall, M.G., *Rank Correlation Methods*, 4th ed., Griffin, 1975 (from knowledge).
- [paper] Sen, P.K. (1968), "Estimates of the regression coefficient based on Kendall's tau", *JASA* 63(324), 1379–1389 (from knowledge).
- [practice] Perla, R.J., Provost, L.P. and Murray, S.K. (2011), "The run chart: a simple analytical tool for learning from variation", *BMJ Quality & Safety* 20(1), 46–51 — the run chart rules as taught in improvement work (from knowledge).

## In Faultline
Built on the screen (W2, 24 October; FC-117, FC-201 stay partial). A project's
measures week by week and its before → after proof (`src/lib/measures.ts`,
`src/lib/measureProof.ts`); from 8 weeks each number says its trend in one
sentence — the Sen slope a week, Mann–Kendall's p, and the runs about the
median (`numberTrend`; validated against SciPy, `cases-w2.py`) — on the line
page's Numbers panel. The client report's paper does not carry it yet. Proved
by `scripts/acceptance/weekly-number.mjs`.
