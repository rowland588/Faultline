---
id: spc.cusum-ewma
name: CUSUM and EWMA charts — small, persistent shifts
aka: [cumulative sum, exponentially weighted moving average, drift detection, tabular CUSUM, V-mask]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the tabular CUSUM and EWMA as Montgomery ch. 9 gives them (from knowledge; 8th ed. to confirm); the ARL figures by Siegmund's (1985) approximation and the Shewhart ARL by the normal tail, both computed independently in `scripts/knowledge/cases-spc.py`; ISO 7870-4:2021 (CUSUM) and ISO 7870-6:2016 (EWMA) named from knowledge — scope and edition to confirm, texts not read
needs: [spc.control-charts-variables]
next: [rca.fishbone-5whys]
alternatives: [spc.run-rules]
related: [stats.time-series-trend, spc.capability-measured]
---
# CUSUM and EWMA charts — small, persistent shifts

## Purpose and principle
A Shewhart chart judges each point on its own, so a shift of half to one
standard deviation can sit unseen for dozens of points: at a one-sigma shift
the individuals chart takes about 44 points on average to signal. CUSUM
accumulates every point's deviation from the target and signals when the
running sum crosses a decision line; EWMA weights the newest point by λ and
the smoothed past by 1 − λ. Both carry memory, so a small sustained shift
adds up where a single point would not. Both lose a little against Shewhart
on a large sudden jump — the two are run together when both matter.

## Questions it answers
- Has the mean drifted a little, persistently — the give-away creeping up, a
  brine slowly weakening, seal strength easing as the jaws wear?
- When did the drift start (the CUSUM's change point)?
- How far has it moved (the EWMA's current level, a running estimate)?

## Inputs and minimum conditions
- Readings in time order, one at a time (individuals) or subgroup means.
- A target μ₀ — the nominal, or the centre of a steady period.
- σ from a steady period (Phase I): MR̄/1.128 for individuals, as the XmR
  chart; never from a period that includes the drift being hunted.
- The shift worth catching, δ, in units of σ (a decision the floor makes:
  "0.5 g on a 400 g pack" → δ = 0.5/σ) and the false-alarm rate tolerated.

## Procedure and calculation
**Tabular CUSUM** (Page 1954, the form every text now uses):
- K = (δ/2)·σ — the reference value, half the shift to detect; K = 0.5σ
  for a one-sigma shift.
- C⁺ᵢ = max(0, xᵢ − (μ₀ + K) + C⁺ᵢ₋₁), C⁻ᵢ = max(0, (μ₀ − K) − xᵢ + C⁻ᵢ₋₁),
  C⁺₀ = C⁻₀ = 0.
- Signal when C⁺ᵢ > H or C⁻ᵢ > H. H = 4σ or 5σ (h = 4 or 5 in σ units).
- The change point: count back the points N⁺ (or N⁻) since the sum was
  last zero; the shift began about there. The new level is estimated
  μ₀ + K + C⁺ᵢ/N⁺ (or μ₀ − K − C⁻ᵢ/N⁻).
- Average run length (ARL) — how many points on average before a signal —
  by Siegmund's approximation for a one-sided chart: ARL = (e^(−2Δb) − 1 +
  2Δb) / (2Δ²), Δ = δ* − k (δ* the true shift, k in σ units; for a downward
  chart use −δ* − k), b = h + 1.166; and ARL = b² when Δ = 0. Two-sided:
  1/ARL = 1/ARL⁺ + 1/ARL⁻.
- A head start (FIR, Lucas & Crosier 1982) sets C⁺₀ = C⁻₀ = H/2 after an
  adjustment so a process that was not fixed signals sooner.

**EWMA** (Roberts 1959):
- zᵢ = λxᵢ + (1 − λ)zᵢ₋₁, z₀ = μ₀.
- Limits μ₀ ± Lσ·√(λ/(2 − λ)·[1 − (1 − λ)^(2i)]); the bracket tends to 1,
  so the steady-state half-width is Lσ√(λ/(2 − λ)).
- λ = 0.05–0.25 (0.2 common; smaller catches smaller shifts and reacts
  slower); L = 2.7–3 (Montgomery's tables: λ = 0.2, L = 2.962 gives an
  in-control ARL near 500; λ = 0.1, L = 2.814 the same).
- zᵢ is itself a running estimate of the current mean — what the process
  is at now, after smoothing.

**Worked case** (`scripts/knowledge/cases-spc.py`): forty fill weights,
target 400.0 g, σ 0.8 g from the steady period, a +1.0 g shift (1.25σ) from
reading 21 — 400.0, 400.2, 399.8, 399.3, 399.6, 399.2, 400.0, 401.1, 399.6,
399.5, 400.4, 400.3, 400.1, 399.3, 400.0, 400.6, 398.9, 399.6, 398.5, 399.0 |
399.5, 400.8, 400.0, 401.2, 401.1, 400.9, 399.0, 400.6, 401.0, 401.1, 399.8,
400.6, 400.2, 400.4, 401.8, 400.4, 401.0, 401.7, 400.5, 400.9. CUSUM with
K = 0.4 g, H = 4.0 g signals at reading 38 (C⁺ = 4.8 g); EWMA with λ = 0.2,
L = 2.962 (half-width 0.79 g) signals at reading 38 too (z = 400.89 against
400.79). The Shewhart limits 397.6–402.4 g are never crossed in all forty.
The theory for this shift: Siegmund gives a one-sided CUSUM (k 0.5, h 5)
ARL of about 938 in control (two-sided about 469) and 10.3 at a one-sigma
shift; the individuals chart's ARL is 370 in control and 43.9 at a
one-sigma shift. This sample took 17 — one run, not the average.

## Assumptions, limits and misuse
- Needs a trustworthy target and σ; a σ taken over a period that already
  drifted makes K and H too wide and the chart blind.
- The parameters trade false alarms against speed: a smaller h or λ signals
  sooner and cries wolf sooner. Choose them by the ARL wanted, say it, and
  keep it.
- Slow on a large sudden jump compared with Shewhart; run both when a jump
  matters (the standard pairing).
- Autocorrelated readings (packs seconds apart off one head) inflate the
  sums; sample further apart or model the correlation.
- A CUSUM that signals is reset to zero after the cause is found and fixed
  — not before, and never silently.
- A V-mask CUSUM is the same test drawn differently; the tabular form is
  what to compute.

## Reading the result
"The CUSUM crossed its line at reading 38 — the mean has been about 0.8 g
high since reading 21 (its last zero): 17 readings of give-away before
anything else would have noticed." The EWMA line says the current level
("running at 400.9 g against 400.0"). Then the cause (`rca.fishbone-5whys`);
a target adjustment on a filler is not the fix if the cause is a worn part.
Money: the give-away over the undetected stretch is packs × (level − target)
× £/kg (`knowledge/MONEY.md`, causation Q, the give-away rule) — the
sentence the chart's early signal buys.

## When not to use it — and instead
Big sudden changes → `spc.control-charts-variables` (run beside it). A
pattern rather than a shift → `spc.run-rules`. Deciding whether a
difference is real after the fact, not watching for it → `stats.two-sample-tests`.

## In food and FMCG manufacturing
Give-away creeping on a filler or depositor as the product's density or
temperature drifts through a shift; a slow loss of seal strength as jaws
wear or film changes reel; brine or syrup concentration drifting; oven
zone temperature easing as a burner fouls; residual oxygen creeping on a
gas flush. In each the shift is small against the day's spread and costly
over the hours before anyone sees it.

## References
- [paper] Page, E.S. (1954), "Continuous inspection schemes", *Biometrika* 41(1–2), 100–115 — the CUSUM (from knowledge).
- [paper] Roberts, S.W. (1959), "Control chart tests based on geometric moving averages", *Technometrics* 1(3), 239–250 — the EWMA (from knowledge).
- [paper] Lucas, J.M. and Crosier, R.B. (1982), "Fast initial response for CUSUM quality-control schemes", *Technometrics* 24(3), 199–205 — the head start (from knowledge).
- [paper] Siegmund, D. (1985), *Sequential Analysis*, Springer — the ARL approximation used here (from knowledge; checked only that the formula reproduces the familiar ARL0 ≈ 465 for k 0.5, h 5 — it gives 469 two-sided).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., Wiley, 2019, ch. 9 — tabular CUSUM, EWMA, the λ/L tables (from knowledge; edition to confirm).
- [standard] ISO 7870-4:2021 *Control charts — Part 4: Cumulative sum charts*; ISO 7870-6:2016 *Part 6: EWMA control charts* — named from knowledge; scope and edition to confirm, texts not read.

## In Faultline
Built (W2, 24 October; FC-091). On the Control chart: the tabular CUSUM with
k = 0.5σ and h = 5σ against the target, the shift worth catching typed, saying
the reading it began at (the last time the sum was at zero — an estimate, not
a proof) and the level now; the EWMA with λ = 0.2 and L = 2.962 as the
running level. σ comes from the frozen steady run. Not tunable. Proved by
`control-chart.mjs`.
