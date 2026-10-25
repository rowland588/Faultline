---
id: stats.distribution-fitting
name: Which shape fits? — probability plots and fitting a distribution
aka: [probability plot, Q-Q plot, distribution identification, maximum likelihood fit, lognormal, Weibull, Anderson–Darling, AIC]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — probability plotting, maximum likelihood and the Anderson–Darling comparison as the NIST e-Handbook §1.3.3.22 and D'Agostino & Stephens (1986) give them (from knowledge; not fetchable from here); the worked case (normal, lognormal, Weibull on the oxygen readings, by MLE, AIC, KS and AD) computed independently in `scripts/knowledge/cases-stats.py`
needs: [stats.descriptive]
next: [spc.capability-nonnormal]
alternatives: [spc.normality-checks]
related: [maintenance.weibull, spc.capability-measured]
---
# Which shape fits? — probability plots and fitting a distribution

## Purpose and principle
Residual oxygen, time between failures, particle size, fill weight on a
bounded filler: not everything is a bell. A capability index, a percentile
or a prediction built on the wrong shape is wrong in the tail — exactly
where the limit sits. Fitting picks the shape the readings follow (or says
none does), by the plot first and the numbers second, so the tail is read
from a model that fits it.

## Questions it answers
- Is this set normal, or leaning, or bounded — and which named shape fits?
- What is the 99.865th (or 0.135th) percentile — the figure capability
  needs when the shape is not normal (`spc.capability-nonnormal`)?
- What share would fall beyond a limit under the fitted shape?

## Inputs and minimum conditions
At least 30 readings for a shape (50–100 to tell a lognormal from a
Weibull); one process state; the readings' physical bounds known (zero for
a concentration, a minimum for a time). The order kept for the steadiness
check — a set that was drifting fits nothing honestly.

## Procedure and calculation
- Probability plot: sort the readings; plot x₍ᵢ₎ against the model's
  quantile at pᵢ = (i − 0.5)/n (Hazen; Blom's (i − 0.375)/(n + 0.25) for
  normal); a straight line is a fit, a curve says which way the shape
  leans. One plot per candidate (normal, lognormal, Weibull, exponential,
  gamma).
- Candidates by the physics: bounded at zero and leaning right → lognormal
  or Weibull or gamma; a time to failure → Weibull (`maintenance.weibull`);
  a sum of many small effects → normal; a count → Poisson or binomial, not
  a continuous shape.
- Parameters by maximum likelihood (MLE): normal (x̄, s); lognormal (mean
  and s of ln x); Weibull (shape β, scale η by the likelihood equations —
  software); the fit's location fixed at the physical bound when there is
  one (oxygen cannot be negative: fix the lower bound at 0).
- Goodness of fit per candidate: Anderson–Darling A² (weights the tails —
  the right test for capability), the Kolmogorov–Smirnov p (rough), and the
  log-likelihood / AIC = 2k − 2·ln L to compare models with different
  parameter counts; the lowest AIC among plausible shapes wins, the plot
  arbitrates.
- Then the percentiles from the fitted shape — x₀.₉₉₈₆₅, x₀.₅, x₀.₀₀₁₃₅ —
  and the share beyond each limit.

**Worked case** (`cases-stats.py`): the 30 residual-oxygen readings
(0.18–1.41%, bounded at zero, leaning right). Normal: A² 3.92 against a 5%
critical 0.72, KS p 0.011 — rejected. Lognormal (σ_ln 0.485, scale 0.314):
AIC −23.9, KS p 0.27, A² on ln x 1.50 (still a strained fit — two readings
near 1% are heavy even for it). Weibull (β 1.62, η 0.41): AIC −8.1, KS
p 0.07. The lognormal fits best. The 99.865th percentile: 1.16% by the
normal, 1.34% by the lognormal — the normal understates the high tail by
0.2 points, which on a 2% limit is the difference between "capable" and
"watch it" (`spc.capability-nonnormal`).

## Assumptions, limits and misuse
- Thirty readings tell a normal from a lognormal; they rarely tell a
  lognormal from a Weibull or a gamma — say "a right-leaning shape, read by
  the lognormal" and the alternative's percentile beside it.
- A shape fitted to a drifting or mixed set is a fiction; steadiness first.
- Fixing the location at the bound is right when the physics says so and
  wrong when it does not (a minimum that is not zero).
- Transforming (ln x) and reading normal statistics on the transform is the
  same thing as the lognormal; never quote the transformed mean as the
  product's mean.
- Fitting is not for finding "the" distribution of the universe; it is for
  reading the tail honestly on this set.

## Reading the result
"Oxygen leans high and is bounded at zero; it follows a lognormal (median
0.31%, σ_ln 0.49). Its upper 99.865th percentile is 1.34% against the 2%
limit — about 0.3% of packs would exceed 1.5%." The money is the share
beyond the limit × packs × what a reject costs, or the shelf-life claim at
risk (`knowledge/MONEY.md`, Q; `foodsafety.shelf-life`).

## When not to use it — and instead
A quick normal-or-not → `spc.normality-checks`. Times to failure →
`maintenance.weibull` directly. Counts → the binomial or Poisson
capability records (`spc.capability-attribute-proportion`,
`spc.capability-attribute-defects`).

## In food and FMCG manufacturing
Residual oxygen and CO₂ in MAP packs; seal strength (a lower bound and a
right tail); particle size; moisture; time between short stops; fill on
a filler with a hard floor. Any characteristic with a legal or customer
limit on one side needs its tail read from the shape it has.

## References
- [handbook] NIST/SEMATECH, *e-Handbook of Statistical Methods*, §1.3.3.22 (probability plots) and §1.3.5.14 (Anderson–Darling) — public; from knowledge, not fetchable from here.
- [textbook] D'Agostino, R.B. and Stephens, M.A. (eds.), *Goodness-of-Fit Techniques*, Marcel Dekker, 1986 — A² and its critical values per distribution (from knowledge).
- [paper] Akaike, H. (1974), "A new look at the statistical model identification", *IEEE Trans. Automatic Control* 19(6), 716–723 (from knowledge).
- [standard] ISO 22514-2:2017 — the eight distribution models and the percentile index (scope checked online 22 Oct 2026; text not read).

## In Faultline
Built 25 October 2026 (FC-114, builder F3): the Analysis tool's *Which shape fits* and the same fit inside the capability
study (`src/lib/ie/fit.ts`; `knowledge/specs/FC-114-fitting.md`; proved against SciPy by `scripts/knowledge/cases-w3c.py` →
`fit.test.ts`; driven by `analysis-shape.mjs` and `capability-kinds.mjs` step 16). Four shapes — normal, lognormal,
two-parameter Weibull, exponential — fitted from 20 readings, each judged by Anderson–Darling and compared by AIC, the
probability plot of the leader, the 0.135%, median and 99.865% points, the share beyond a limit beside the count as measured.
**Found in building:** SciPy's `weibull_min.fit(floc=0)` stops about 1e-5 short of the likelihood equation's root (oxygen: β
1.620614 against the root 1.620601, the lower log-likelihood) — the independent cases use the root. The worked case above
holds: every shape is rejected on the oxygen set (the lognormal nearest, A² 1.50, p 0.0006) — the page says so and sends the
reader to the count. Not built: a three-parameter shape, gamma, Johnson, Box–Cox, a fitted parameter's confidence interval.
