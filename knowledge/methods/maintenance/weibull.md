---
id: maintenance.weibull
name: Weibull analysis — how a part's failures spread with age, and when to replace it
aka: [Weibull, Weibull plot, B10 life, bathtub curve, shape parameter beta, characteristic life eta, age replacement]
discipline: maintenance
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — median-rank regression (Bernard's approximation), maximum likelihood with suspensions, B-lives and the age-replacement cost model as IEC 61649:2008 and Abernethy's *New Weibull Handbook* (5th ed. 2006) give them (from knowledge; IEC 61649's edition to confirm, text not read); the worked case — twelve heater failures, then eight with four suspensions, and the replacement interval — computed independently in `scripts/knowledge/cases-maintenance.py`
needs: [maintenance.mtbf-failure-rate]
next: [maintenance.planned-maintenance]
alternatives: [maintenance.mtbf-failure-rate]
related: [stats.distribution-fitting, maintenance.spares-poisson, maintenance.rcm]
---
# Weibull analysis — how a part's failures spread with age, and when to replace it

## Purpose and principle
An MTBF assumes failures come at a constant rate, which is true of random
events and false of wear. The Weibull distribution fits the ages at which
a part failed and says *how* it fails: a shape β under 1 means early-life
failures (poor fitting, infant mortality), β near 1 random (no age
effect — replacing on a schedule buys nothing), β above 1 wear-out (the
older, the likelier — a replacement age exists). From the fit come the
B10 life (the age by which a tenth have failed), the chance a part at a
given age fails in the next shift, and the replacement interval that
costs least.

## Questions it answers
- Does this part wear out, fail at random, or fail young?
- By what age have 10% (B10) or 50% failed? What is its mean life?
- A part that has run 500 h — what is its chance of failing in the next
  200?
- Should it be replaced on a schedule, and at what age, given what a
  failure costs against a planned swap?

## Inputs and minimum conditions
- The age at failure of each part (hours run, cycles, packs — the age
  measure that drives the wear), for parts of one kind in one duty; at
  least 6–8 failures for a usable β, 20+ for confidence.
- The ages of the parts still running or removed unfailed (suspensions)
  — they carry information and must not be dropped.
- Failures of one *mode*: a heater that burns out and one broken by a
  jam are two populations; separate them.

## Procedure and calculation
- Order the failures by age t₍ᵢ₎; median rank Fᵢ ≈ (i − 0.3)/(n + 0.4)
  (Bernard); with suspensions, Johnson's adjusted ranks (each suspension
  raises the increment of the failures after it).
- **Rank regression** (the Weibull plot): y = ln(−ln(1 − F)) against
  x = ln t; a straight line is a two-parameter Weibull; slope β,
  intercept −β·ln η so η = exp(−intercept/β); r² says how straight (a
  dog-leg means two modes or a location parameter).
- **Maximum likelihood**: maximise Σ ln f(tᵢ; β, η) over failures + Σ ln
  R(tⱼ; β, η) over suspensions — the right method with many suspensions;
  MLE's β is biased high on small samples (the handbook's correction
  factors); rank regression is the usual first plot.
- Reliability R(t) = exp(−(t/η)^β); the B-life B_p = η(−ln(1 − p))^(1/β)
  (B10: p = 0.1); mean life = η·Γ(1 + 1/β); η itself is B63.2.
- Conditional: a part at age a surviving to a + d: exp(−((a + d)/η)^β +
  (a/η)^β).
- **Age replacement** (β > 1 only): with a planned replacement costing
  C_p and a failure C_f (parts + labour + the line's lost contribution),
  the cost rate at interval T is [C_p·R(T) + C_f·(1 − R(T))] / ∫₀ᵀ R(t) dt;
  the T that minimises it is the interval; run-to-failure costs
  C_f / mean life per hour for comparison.
- Confidence bounds on β and η (Fisher matrix or likelihood ratio) when
  the decision is close; with few failures they are wide.

**Worked case** (`cases-maintenance.py`): twelve seal-jaw heater failures
at 310 … 1,620 h. Rank regression β = 2.39, η = 1,044 h (r 0.998 — a
straight line, one mode); MLE β = 2.74, η = 1,033 h. Wear-out. B10 408 h
(RR) / 454 h (MLE); B50 about 900 h; mean life about 920 h; R(600 h)
0.77–0.80. A heater at 500 h has an 18.7% chance of failing by 700 h; a
new one 1.1% in its first 200. With a failure costing six times a planned
swap, the best age-replacement interval is 470 h at 0.0034 cost units an
hour against 0.0065 running to failure — replacing at 470 h halves the
heater's cost. Censoring matters: eight failures with four heaters still
running at 1,500 h give β 1.73, η 1,309 h; the same eight with the
suspensions dropped give β 3.71 — a wrong, steeper wear-out and a far too
early replacement.

## Assumptions, limits and misuse
- Dropping suspensions is the commonest error and biases β high (the
  case above shows it).
- Mixed failure modes give a curved plot and a β that means nothing;
  split by mode, each its own Weibull.
- The age measure must be the one that wears the part (cycles for a
  jaw, hours for a motor, packs for a blade); calendar time usually is
  not.
- Six failures give a β with a wide bound; a replacement interval from
  it is a first guess, revised as failures accrue.
- β ≈ 1: no replacement interval helps; β < 1: replacing *causes*
  failures — look at fitting, commissioning, burn-in.
- A three-parameter fit (a failure-free period t₀) is tempting with few
  data and usually unjustified; use it only with physical reason.

## Reading the result
"The jaw heaters wear out (β 2.4): a tenth have failed by about 410 h,
half by 900. A heater that has run 500 h has a 1-in-5 chance of failing
in the next 200. Replace at 470 h on the planned stop: it halves what
heaters cost us." Money: the cost rate × hours a year, planned against
run-to-failure — C_f built from the part, the labour and the line's lost
contribution per failure (`knowledge/MONEY.md`, T and M); the saving is
the difference.

## When not to use it — and instead
A rate on events with no ages (stops a shift) → `maintenance.mtbf-failure-rate`.
Which parts to analyse first → `maintenance.criticality`. Whether a new
machine's failure rate is falling as it beds in →
`maintenance.reliability-growth`. The shape of any measured set →
`stats.distribution-fitting`.

## In food and FMCG manufacturing
Seal-jaw heaters and thermocouples, cutting blades, conveyor belts and
bearings, filler nozzles and seals, vacuum pump vanes, coder printheads,
checkweigher load cells — every part the engineers "just replace when it
goes" and could replace on an age.

## References
- [standard] IEC 61649:2008, *Weibull analysis* — named from knowledge; edition to confirm, text not read.
- [textbook] Abernethy, R.B., *The New Weibull Handbook*, 5th ed., 2006 — median ranks, rank regression, MLE and suspensions, B-lives, the plot's diagnostics (from knowledge).
- [textbook] O'Connor, P.D.T. and Kleyner, A., *Practical Reliability Engineering*, 5th ed., Wiley, 2012 — Weibull and age-replacement models (from knowledge).
- [paper] Barlow, R.E. and Hunter, L.C. (1960), "Optimum preventive maintenance policies", *Operations Research* 8(1), 90–100 — the age-replacement cost rate (from knowledge).

## In Faultline
Not built (FC-060). The reliability study already records each event
with its time and kind (`src/tools/reliability`); FC-060 adds the age of
the part at each failure and the ages still running, draws the plot,
says β in words (wears out · random · fails young), the B10 and the
conditional chance, and the replacement age with its saving — and hands
the interval to the planned-maintenance schedule.
