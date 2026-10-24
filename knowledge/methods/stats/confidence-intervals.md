---
id: stats.confidence-intervals
name: Confidence intervals — for a mean, a proportion, a rate and a spread
aka: [confidence interval, margin of error, Clopper-Pearson, Wilson interval, Poisson interval, chi-square interval, how sure]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — formulas as Montgomery & Runger and the NIST e-Handbook; exact binomial (Clopper & Pearson 1934), Wilson (1927), Poisson by χ²; numbers in Faultline's tests generated independently with SciPy (scripts/knowledge/independent-cases.py)
needs: []
next: [stats.two-sample-tests, stats.sample-size-power]
alternatives: []
related: [spc.capability-attribute-proportion, spc.capability-attribute-defects, maintenance.mtbf-failure-rate, ie.work-sampling]
---
# Confidence intervals — for a mean, a proportion, a rate and a spread

## Purpose and principle
A figure from a sample is an estimate; its interval is the range the true
value is likely to be in, at a stated confidence. The width says whether the
sample was big enough to decide anything.

## Questions it answers
How sure is this reject rate, this mean, this MTBF? Is the sample big enough?

## Inputs and minimum conditions
The sample's figures (n, mean, s, count, exposure) and the confidence wanted.

## Procedure and calculation
- Mean: x̄ ± t(1 − α/2; n − 1)·s/√n.
- Proportion, exact (Clopper–Pearson): [B(α/2; x, n − x + 1), B(1 − α/2; x + 1, n − x)];
  Wilson: (p̂ + z²/2n ± z√(p̂(1 − p̂)/n + z²/4n²))/(1 + z²/n).
- Rate (Poisson count C in exposure N): [χ²(α/2; 2C)/2N, χ²(1 − α/2; 2C + 2)/2N].
- Spread: s·√((n − 1)/χ²(1 − α/2; n − 1)) to s·√((n − 1)/χ²(α/2; n − 1)).

## Assumptions, limits and misuse
The normal-approximation interval for a proportion (p̂ ± z√(p̂(1 − p̂)/n)) is poor
for small counts — use exact or Wilson; a 95% interval is not a 95% chance for one figure.

## Reading the result
"1.17% rejected, 95% sure 0.64–1.95%."

## When not to use it — and instead
Deciding between two groups → `stats.two-sample-tests`.

## In food and FMCG manufacturing
Reject rates, give-away means, complaint rates per million.

## References
- [textbook] Montgomery, D.C. and Runger, G.C. (2018), *Applied Statistics and Probability for Engineers*, 7th ed.
- [paper] Clopper, C.J. and Pearson, E.S. (1934), *Biometrika* 26(4), 404–413.
- [paper] Wilson, E.B. (1927), "Probable inference, the law of succession, and statistical inference", *Journal of the American Statistical Association* 22(158), 209–212.

## In Faultline
Bounds already in reliability (`src/tools/reliability/reliability.ts`) and work sampling's margins (`src/tools/sampling/sampling.ts`); the pilot adds exact binomial bounds in `src/lib/ie/dist.ts` (FC-104).
