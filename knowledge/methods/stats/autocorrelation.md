---
id: stats.autocorrelation
name: Readings that depend on the last one — autocorrelation and what it does to a chart
aka: [serial correlation, lag-1 correlation, ACF, Durbin–Watson, autocorrelated process data]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the autocorrelation function and its 2/√n rule as Box, Jenkins & Reinsel give them, and the effect on Shewhart limits as Montgomery ch. 10 discusses (from knowledge; editions to confirm); the worked case (an AR(1) series, r₁, the MR-based σ against s, Durbin–Watson, thinning) computed independently in `scripts/knowledge/cases-stats.py`
needs: []
next: [spc.control-charts-variables]
alternatives: []
related: [spc.capability-measured, spc.cusum-ewma, stats.time-series-trend]
---
# Readings that depend on the last one — autocorrelation and what it does to a chart

## Purpose and principle
Consecutive packs off one head, temperatures a second apart, counts in
adjoining minutes: each reading is close to the one before because the
process has inertia. Every control chart and capability index assumes the
readings are independent; when they are not, the moving range is too
small, the limits too tight, and the chart signals constantly on a process
that is doing nothing unusual. The autocorrelation function measures the
dependence and says how far apart to sample.

## Questions it answers
- Are these readings independent enough for a chart or a capability figure?
- How far apart (in packs, in minutes) must samples be to be independent?
- Is a "pattern" on the chart a real cause or the sampling?

## Inputs and minimum conditions
Readings in time order, equally spaced, at least 30–50 for r₁ to mean
anything; the process in one state (no deliberate changes inside the set).

## Procedure and calculation
- Lag-k autocorrelation: r_k = Σ(xₜ − x̄)(xₜ₊ₖ − x̄) / Σ(xₜ − x̄)².
- Rule of thumb: |r_k| > 2/√n is dependence worth acting on (the 95%
  band for a white series).
- Durbin–Watson on the residuals from the mean: d = Σ(eₜ − eₜ₋₁)²/Σeₜ²,
  about 2(1 − r₁); d near 2 means none, well under 2 positive correlation.
- What it does: with positive r₁ the moving range is shrunk, so the XmR
  chart's σ (MR̄/1.128) is smaller than s by about √(1 − r₁) and the limits
  are too tight by that; the capability from s overstates the long-term
  spread's sureness because n effective is n(1 − r₁)/(1 + r₁).
- Remedies, in order of preference: sample further apart (thin by m until
  r₁ of the thinned series is inside the band); chart subgroup means from
  spaced samples; fit a time-series model and chart the residuals (EWMA as
  a predictor, Montgomery); or widen the limits with σ from s and say so.

**Worked case** (`cases-stats.py`): 40 consecutive 400 g packs off one
head (an AR(1) process with φ = 0.6): r₁ = 0.47, r₂ = 0.14, r₃ = −0.08
against a band of ±0.32 — the lag-1 dependence is real, by lag 2 it is
gone. σ from MR̄ is 0.56 g against s 0.79 g (ratio 0.71 ≈ √(1 − 0.47) =
0.73): the XmR limits drawn from the moving range would be 30% too tight.
Durbin–Watson 1.03. Every third pack: r₁ = −0.24 on 14 points — inside the
band; sample every third pack (or every 10 seconds) and the chart is honest.

## Assumptions, limits and misuse
- r₁ from fewer than 30 points is noise; from 50+ it is a figure.
- A trend or a step inside the set shows as autocorrelation; the fix is
  the chart, not thinning (`spc.run-rules`, `stats.time-series-trend`).
- Thinning throws readings away; where the process is genuinely fast
  (a 300-a-minute filler) a chart of 5-pack means every 10 minutes keeps
  the information and the independence.
- Negative r₁ (alternation) usually means over-adjustment or two streams
  sampled in turn, not a sampling problem.

## Reading the result
"Consecutive packs are correlated (r₁ 0.47): the chart's limits were a
third too tight and its 'signals' were the sampling. Sampled every third
pack it is steady." The money is what was spent chasing false alarms
(adjustments, stops — `knowledge/MONEY.md`, T) and, the other way, what a
tight-limit chart hid.

## When not to use it — and instead
Readings not in time order → nothing to measure. A deliberate change
inside the set → `stats.two-sample-tests` before and after. A slow drift →
`spc.cusum-ewma` on properly spaced readings.

## In food and FMCG manufacturing
Checkweigher readings on every pack; fryer and oven temperatures logged by
hand every 30 seconds; one-minute counts on a line with accumulation;
Brix readings from a continuous mixer. The first check before any of
these is charted.

## References
- [textbook] Box, G.E.P., Jenkins, G.M., Reinsel, G.C. and Ljung, G.M., *Time Series Analysis: Forecasting and Control*, 5th ed., Wiley, 2015 — the ACF and its standard error (from knowledge).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 10 — SPC with autocorrelated process data (from knowledge; edition to confirm).
- [paper] Durbin, J. and Watson, G.S. (1950, 1951), "Testing for serial correlation in least squares regression", *Biometrika* 37 and 38 (from knowledge).

## In Faultline
Built in part (W3a, 24 October; FC-115). `autocorrelation` in `src/lib/ie/stats.ts` works out r₁, r₂,
r₃ against 2 ÷ √n from 30 readings in the order taken, Durbin–Watson, √(1 − r₁), the effective
count and the spacing to sample at (the smallest m whose thinned series has its own r₁ inside its
band). It is said on the Analysis page and in the capability study's notes. It is *not* on the control
chart: a step or a drift, which a chart is there to find, reads as dependence, so the check would say
something false there. Proved by `scripts/acceptance/analysis.mjs`.
