---
id: msa.measurement-uncertainty
name: How sure is a reading? — measurement uncertainty (the GUM) and guard bands
aka: [uncertainty budget, GUM, combined standard uncertainty, expanded uncertainty, coverage factor, guard banding, decision rule]
discipline: msa
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the GUM's combination of standard uncertainties, the rectangular distribution for resolution, the coverage factor and the decision-rule guard band as JCGM 100:2008 and JCGM 106:2012 give them (from knowledge; public documents, not fetchable from here); the bench-scale budget computed independently in `scripts/knowledge/cases-msa.py`
needs: []
next: []
alternatives: [msa.gauge-rr]
related: [msa.calibration, msa.type1-gauge, packaging.average-quantity-system]
---
# How sure is a reading? — measurement uncertainty (the GUM) and guard bands

## Purpose and principle
A reading of 400.1 g is not the pack's weight; it is an estimate with an
uncertainty from the scale's resolution, its repeatability, its
calibration and the way it was used. The GUM gives one way to add those
up into a standard uncertainty, expand it to a stated confidence, and
state it with the result — and the decision rule says how far inside a
limit a reading must be before the pack is *sure* to meet it. On a legal
minimum weight or a CCP temperature, that margin is the difference between
compliance and a guess.

## Questions it answers
- What is the uncertainty of a reading from this gauge, used this way?
- Which contributor dominates (so which to improve)?
- How far from a limit must a reading be to be sure (the guard band)?
- Is the uncertainty small enough for the decision (the test uncertainty
  ratio)?

## Inputs and minimum conditions
- The sources: the gauge's resolution; its repeatability (s from a Type 1
  study or the daily checks); its calibration certificate's uncertainty
  (and coverage factor); the reference's drift since calibration; the
  conditions (temperature on a scale, draughts); the operator (from a
  gauge R&R); any correction applied and its own uncertainty.
- Each as a standard uncertainty (one standard deviation) in the unit.

## Procedure and calculation
- Type A (from readings): u = s for a single reading, s/√n for the mean of
  n.
- Type B (from other knowledge): a certificate's expanded U at k = 2 →
  u = U/2; a resolution δ (rectangular) → u = δ/(2√3) = δ/√12; a
  tolerance ±a with no other knowledge → a/√3; a triangular spread → a/√6.
- Combined standard uncertainty for a sum or simple reading: u_c =
  √Σuᵢ²; for a function y = f(x₁…xₙ): u_c² = Σ(∂f/∂xᵢ)²uᵢ² (the
  sensitivity coefficients; for a product or ratio, relative uncertainties
  add as squares).
- Expanded uncertainty U = k·u_c, k = 2 for about 95% (k = 3 for 99.7%; k
  from the t distribution when the effective degrees of freedom are few —
  Welch–Satterthwaite).
- Stated as "400.1 g ± 0.17 g (k = 2)".
- The budget table: each source, its value, distribution, divisor,
  standard uncertainty and its share of u_c² — the Pareto of the
  uncertainty.
- **Decision rule / guard band** (JCGM 106): to be sure a result meets a
  lower limit L at 95%, the reading must be ≥ L + U (a one-sided guard
  band of U at k = 2 gives about 97.7%; k = 1.64 gives 95% one-sided); for
  an upper limit, ≤ U_limit − U. The test uncertainty ratio (tolerance ÷
  2U, or tolerance ÷ U by some) of at least 4 is the usual fitness rule;
  below it, the guard band eats the tolerance.

**Worked case** (`cases-msa.py`): a bench scale — resolution 0.01 g
(rectangular: u 0.0029 g), repeatability s 0.08 g on a single reading
(u 0.080), certificate U 0.05 g at k = 2 (u 0.025). u_c = 0.084 g;
U = 0.17 g at k = 2. Repeatability is 91% of the variance — the lever.
Using the mean of 10 readings: u_rep 0.025, u_c 0.036, U 0.07 g. On a
400 g legal minimum, a single reading must be at least 400.17 g to be
sure the pack is over 400 (400.07 with ten readings). On a 10 g
tolerance the ratio 10/(2 × 0.17) ≈ 29 — fit.

## Assumptions, limits and misuse
- Leaving out a source (the operator, the temperature) understates U; the
  budget is a list made honestly, not a formula.
- Correlated sources do not add as squares; a correction and the
  certificate it came from are the usual pair.
- U is not the tolerance and not the gauge's "accuracy" from the brochure.
- A guard band of U on both sides of a two-sided tolerance can leave no
  tolerance; then the gauge, not the rule, is the problem.
- The GUM's normal assumption for the expanded U is fair when several
  sources contribute; with one dominant rectangular source k = 2 gives
  less than 95% (use the actual distribution).
- Uncertainty is for stating how sure a *result* is; the R&R study is for
  deciding whether a *system* is fit for a tolerance; they overlap and are
  not the same.

## Reading the result
"The bench scale reads to ±0.17 g (k = 2) on a single reading — mostly
its repeatability; a pack must read 400.17 g to be sure it is over 400.
Averaging 10 readings brings that to 400.07." Money: the guard band is
give-away — 0.17 g on every pack checked to the limit (`yield.giveaway`,
`knowledge/MONEY.md` Q) — so the better scale, or ten readings, has a
price it pays back.

## When not to use it — and instead
Is the system fit for the tolerance, with operators and parts →
`msa.gauge-rr`. Is the gauge fit at all → `msa.type1-gauge`. The legal
weight rules and their tolerable negative error → `packaging.average-quantity-system`.

## In food and FMCG manufacturing
The scale behind an e-mark declaration (the trading-standards inspector
asks for the uncertainty); the CCP probe's guard band at the cook limit;
a laboratory result (moisture, salt, aw) on a certificate of analysis; a
metal detector's sensitivity check pieces (their own certificate's U).

## References
- [standard] JCGM 100:2008, *Evaluation of measurement data — Guide to the expression of uncertainty in measurement* (the GUM) — public (BIPM); from knowledge, not fetchable from here.
- [standard] JCGM 106:2012, *The role of measurement uncertainty in conformity assessment* — decision rules and guard bands (from knowledge).
- [guide] UKAS M3003, *The Expression of Uncertainty and Confidence in Measurement*, 5th ed., 2022 — the budget table as laboratories lay it out (from knowledge).
- [standard] ISO/IEC 17025:2017, clause 7.8.6 — reporting a decision rule with a statement of conformity (from knowledge).

## In Faultline
Built as the **Measurement uncertainty budget** calculator (FC-123,
`/calc/uncertainty-budget`): resolution, repeatability and certificate
combined into u_c and expanded U, shares of variance, optional guard
band at a lower limit, test uncertainty ratio, and give-away when cost a
kilo is given. Not yet wired into capability limits or CCP monitoring;
extra sources are typed only through these three boxes today.
