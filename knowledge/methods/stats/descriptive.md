---
id: stats.descriptive
name: Describing a set of readings — centre, spread, shape and the histogram
aka: [summary statistics, mean and standard deviation, histogram, quartiles, box plot, coefficient of variation]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — formulas as Montgomery & Runger ch. 6 and the NIST/SEMATECH e-Handbook ch. 1 give them (from knowledge; the e-Handbook is public but could not be fetched from this container); the worked case computed independently in `scripts/knowledge/cases-stats.py`; the adjusted skewness and kurtosis as SciPy's bias-corrected G1, G2
needs: []
next: [spc.normality-checks, stats.confidence-intervals]
alternatives: []
related: [spc.capability-measured, stats.distribution-fitting]
---
# Describing a set of readings — centre, spread, shape and the histogram

## Purpose and principle
Before any test or index, the readings are described: where they sit, how
far they spread, what shape they make. Most wrong conclusions on a factory
floor come from skipping this — a mean quoted for a set with two clusters, a
standard deviation for a set with one wild reading, a capability on a set
that is bounded at zero. The description is the picture a person checks
the arithmetic against.

## Questions it answers
- What is typical (mean, median) and how much do readings vary (s, range, IQR)?
- Is the set one hump or two, symmetric or leaning, with outliers?
- How sure is the mean from this many readings?
- How many readings are enough to say these things?

## Inputs and minimum conditions
Readings in one unit, from one process state (one product, one setting);
at least 10 for a spread worth quoting, 20–30 for a shape, 50+ for the
tails. The order they were taken in, kept — it is needed for the
steadiness check (`spc.control-charts-variables`).

## Procedure and calculation
- Mean x̄ = Σxᵢ/n. Median: the middle value (the mean of the two middle
  ones for even n). Mode: the commonest value (only for counted data).
- Sample standard deviation s = √(Σ(xᵢ − x̄)²/(n − 1)); variance s².
  Range = max − min. Quartiles Q1, Q3 by linear interpolation (the
  "type 7" rule most software uses); IQR = Q3 − Q1.
- Coefficient of variation CV = s/x̄ (as %), for comparing spreads of
  different sizes (a 250 g and a 1 kg pack).
- Shape: adjusted skewness G1 = √(n(n − 1))/(n − 2) · m₃/m₂^1.5 and excess
  kurtosis G2 (SciPy's bias-corrected forms), with m_k = Σ(xᵢ − x̄)^k/n.
  |G1| beyond about 2·√(6/n) is a lean worth looking at; a histogram is
  the honest test (`spc.normality-checks` for the formal one).
- Histogram: bins about √n or Sturges' 1 + log₂n (both 6 for n = 30), at
  least 5, edges on round values of the unit; drawn with the specification
  limits and the target marked.
- Outliers: a reading beyond Q3 + 1.5·IQR or below Q1 − 1.5·IQR is flagged
  for a look, never deleted by rule; its cause is found or it stays.
- The mean's 95% confidence interval x̄ ± t₀.₉₇₅,ₙ₋₁·s/√n
  (`stats.confidence-intervals`).

**Worked case** (`cases-stats.py`): the 30 pack weights 400.1 … 402.6 g
(the capability study's own set). Mean 401.197 g, median 401.20, s 0.599 g,
range 400.1–402.6, Q1 400.80, Q3 401.60, IQR 0.80; G1 0.14, G2 −0.38 (near
symmetric, a little flat); CV 0.15%; the mean 400.97–401.42 at 95%; six
bins by either rule.

## Assumptions, limits and misuse
- The mean and s describe one hump; two products or two heads mixed give a
  mean nobody runs at. Stratify first (`rca.stratification`).
- s is pulled hard by one wild reading; the median and IQR are not. Quote
  both when they disagree, and find the reading.
- A bounded quantity (oxygen %, a count of faults, a time that cannot be
  negative) leans; its mean ± 3s runs past the bound and means nothing
  (`stats.distribution-fitting`).
- Rounded readings (a scale reading to the gram on a 1 g spread) make the
  histogram a comb and the s too small — read finer.
- n < 10: say the readings, not the statistics.

## Reading the result
"30 packs: mean 401.2 g (sure to ±0.2), spread 0.6 g, 400.1 to 402.6 — one
hump, symmetric, no outliers." Then what it means against the target: on a
400 g nominal that is 1.2 g of give-away a pack (`yield.giveaway`,
`knowledge/MONEY.md` Q) — the description's money.

## When not to use it — and instead
Readings in time, to see change → `spc.control-charts-variables`. Good/bad
counts → proportions and their intervals (`stats.confidence-intervals`).
Two sets to compare → `stats.two-sample-tests`.

## In food and FMCG manufacturing
Every set of weights, temperatures, seal strengths, Brix, pH, oxygen,
cycle times and counts in the app begins here; the histogram with the
limits is the picture on the capability study's page.

## References
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., Wiley, 2018, ch. 6 — descriptive statistics (from knowledge; edition to confirm).
- [handbook] NIST/SEMATECH, *e-Handbook of Statistical Methods*, ch. 1 (Exploratory data analysis) — public; not fetchable from this container, from knowledge.
- [textbook] Joanes, D.N. and Gill, C.A. (1998), "Comparing measures of sample skewness and kurtosis", *The Statistician* 47(1), 183–189 — G1 and G2 (from knowledge).

## In Faultline
Partly built: the capability study gives mean, s, range, the histogram
with its limits, the skewness check and the mean's interval
(`src/tools/capability`, `knowledge/specs/FC-094-capability.md`). FC-103 is
the same description on any set of readings in the app.
