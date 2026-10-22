---
id: spc.normality-checks
name: Before capability — is it bell-shaped, is it steady, is it fine enough
aka: [normality test, D'Agostino-Pearson, K squared, Anderson-Darling, Shapiro-Wilk, probability plot, stability check, data suitability]
discipline: spc
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — D'Agostino–Pearson K² (D'Agostino, Belanger & D'Agostino 1990) checked against SciPy's skewtest, kurtosistest and normaltest; Anderson–Darling with Stephens' adjustment against scipy.stats.anderson; both run by scripts/knowledge/independent-cases.py, with the simulation of each under rounding that chose K²; the resolution rule after AIAG MSA (ndc ≥ 5) and Wheeler
needs: []
next: [spc.capability-measured, spc.capability-nonnormal]
alternatives: [stats.distribution-fitting]
related: [spc.control-charts-variables, stats.autocorrelation, stats.descriptive, msa.gauge-rr]
---
# Before capability — is it bell-shaped, is it steady, is it fine enough

## Purpose and principle
A capability index is only as good as three things it takes for granted:
the readings come from one steady process, they spread roughly like a bell,
and they were taken finely enough to show the spread. Each can be checked
from the readings themselves, and a tool that gives a Ppk without checking
them can be confidently wrong. The checks do not make the number; they say
how far to trust it.

## Questions it answers
- Is the normal curve a fair model for the tails (where the rejects are)?
- Did the process stay steady over the study, or does a trend or a jump
  mean the index describes a mixture?
- Were the readings taken finely enough, or are there so few distinct
  values that the spread is hidden?

## Inputs and minimum conditions
The readings in the order taken. The shape tests need about 20 or more to
say anything; below that, say "too few to judge the shape".

## Procedure and calculation
**Shape — D'Agostino–Pearson K² (the check Faultline says).** From the
central moments m₂, m₃, m₄ (divided by n): b₁ = m₃/m₂^1.5, b₂ = m₄/m₂².
Skewness (D'Agostino, 1970): Y = b₁·√((n+1)(n+3)/(6(n−2))),
β₂ = 3(n²+27n−70)(n+1)(n+3)/((n−2)(n+5)(n+7)(n+9)), W² = −1 + √(2(β₂−1)),
δ = 1/√(½ ln W²), α = √(2/(W²−1)), Zs = δ·asinh(Y/α).
Kurtosis (Anscombe & Glynn, 1983): E = 3(n−1)/(n+1),
Var = 24n(n−2)(n−3)/((n+1)²(n+3)(n+5)), x = (b₂ − E)/√Var,
√β₁ = 6(n²−5n+2)/((n+7)(n+9))·√(6(n+3)(n+5)/(n(n−2)(n−3))),
A = 6 + (8/√β₁)(2/√β₁ + √(1 + 4/β₁)),
Zk = [(1 − 2/(9A)) − ∛((1 − 2/A)/(1 + x√(2/(A−4))))]/√(2/(9A)).
K² = Zs² + Zk², χ² with two degrees of freedom: p = e^(−K²/2). From 20
readings (the kurtosis part's limit). p < 0.05: not like a normal sample;
the larger of |Zs| and |Zk| says whether it leans or its tails differ.

Why K² and not Anderson–Darling, 22 October: readings on the floor are often
whole numbers (packs a minute, counts, grams on a coarse scale). An EDF test
is thrown by the ties rounding makes. On truly normal readings rounded to
whole numbers, 3,000 samples a case: with a spread of 1 step AD rejected
90–100% at 5%, of 1.5 steps 42–100%, of 2 steps 21–100% (n 20 to 100); K²
kept 5–8% throughout, down to 0.8 steps. Against a lean like residual oxygen
(lognormal σ 0.5) their power was close (n 30: AD 0.65, K² 0.59); against a
heavy tail (t, 4 df) K² was stronger (0.36 against 0.28). The figures are
printed by `scripts/knowledge/independent-cases.py`.

**Shape — Anderson–Darling (kept, not said).** Sort the readings, standardise with the mean
and the overall spread (zᵢ = (x₍ᵢ₎ − x̄)/s), Fᵢ = Φ(zᵢ):
A² = −n − (1/n)·Σᵢ (2i − 1)·[ln Fᵢ + ln(1 − Fₙ₊₁₋ᵢ)].
Adjusted for estimated mean and spread: A*² = A²·(1 + 0.75/n + 2.25/n²).
p-value (D'Agostino & Stephens, 1986):
- A*² ≥ 0.6: p = exp(1.2937 − 5.709·A* + 0.0186·A*²)
- 0.34 ≤ A*² < 0.6: p = exp(0.9177 − 4.279·A* − 1.38·A*²)
- 0.2 ≤ A*² < 0.34: p = 1 − exp(−8.318 + 42.796·A* − 59.938·A*²)
- A*² < 0.2: p = 1 − exp(−13.436 + 101.14·A* − 223.73·A*²)
(A* here is A*²). p < 0.05: the readings are not like a normal sample.
Also say the skew (third standardised moment) — which way the tail leans.

**Steady — the readings in order.** An individuals chart's limits, x̄ ±
2.66·MR̄ (`spc.control-charts-variables`): any reading outside, or a run of
eight on one side of the mean, says the process moved during the study.
The gap between Cpk and Ppk says the same in one number.

**Fine enough — resolution.** Count the distinct values. Fewer than about
five distinct values across the readings' spread (or a step between values
larger than about a tenth of the tolerance) hides the spread — say so
instead of "not normal". An EDF test (Anderson–Darling) fails on ties well
before that — with six to eight distinct values — which is why the shape is
said by K².

## Assumptions, limits and misuse
- A normality test with many readings rejects trivial departures; with few
  it accepts almost anything. Read it with the picture (histogram, plot).
- "Not normal" is not a verdict on the process; it is a reason to use the
  readings' own tail (`spc.capability-nonnormal`) or find the mixture.
- Ties from coarse rounding are a measurement problem, not a shape problem.

## Reading the result
"The readings lean high (skew 1.1) — the bell's tail would undercount the
heavy ones; 2 of 60 are over the limit as measured." · "Steady across the
run." · "Only 3 different values were read — the scale is too coarse to
show the spread."

## When not to use it — and instead
Counted data (rejects, faults) — the binomial or Poisson model is the
model; there is no bell to check (`spc.capability-attribute-proportion`).

## In food and FMCG manufacturing
Multihead weigher fills (often skewed: the combination is chosen at or
above target); residual oxygen (bounded at zero, long upper tail); seal
strength by mixed jaws (two humps); temperatures read to whole degrees on a
narrow tolerance (too coarse).

## References
- [textbook] D'Agostino, R.B. and Stephens, M.A. (eds) (1986), *Goodness-of-Fit Techniques*, Marcel Dekker — Anderson–Darling with estimated parameters.
- [paper] D'Agostino, R.B., Belanger, A. and D'Agostino, R.B. Jr (1990), "A suggestion for using powerful and informative tests of normality", *The American Statistician* 44(4), 316–321.
- [paper] D'Agostino, R.B. (1970), "Transformation to normality of the null distribution of g1", *Biometrika* 57(3), 679–681.
- [paper] Anscombe, F.J. and Glynn, W.J. (1983), "Distribution of the kurtosis statistic b2 for normal samples", *Biometrika* 70(1), 227–234.
- [paper] Anderson, T.W. and Darling, D.A. (1954), "A test of goodness of fit", *Journal of the American Statistical Association* 49(268), 765–769.
- [paper] Shapiro, S.S. and Wilk, M.B. (1965), "An analysis of variance test for normality", *Biometrika* 52(3–4), 591–611.
- [practice] NIST/SEMATECH *e-Handbook of Statistical Methods*, §1.3.5.14 (Anderson–Darling test).
- [manual] AIAG, *Measurement Systems Analysis (MSA) Reference Manual*, 4th ed., 2010 — number of distinct categories.
- [textbook] Wheeler, D.J. and Chambers, D.S. (2010), *Understanding Statistical Process Control*, 3rd ed., SPC Press.

## In Faultline
Built 22 October as *Before capability* (FC-097,
`knowledge/specs/FC-094-capability.md`): `dagostinoPearson`,
`individualsLimits` and `runOnOneSide` in `src/lib/ie/dist.ts`, read by
`src/lib/ie/sample.ts` (`checksSay`) from 20 readings, said under the
capability sentence on the study's page and its paper. A capable index on
readings that are not steady, or not bell-shaped, is never green; when they
are not bell-shaped the share outside is the count as measured. A run that
parts Cpk from Ppk is said to drift only when the steady check finds a run
— readings beyond the limits alone are named, not called drift.
