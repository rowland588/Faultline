---
id: stats.distribution-fitting
name: Fitting a distribution — the probability plot
aka: [distribution fitting, probability plot, lognormal, Weibull fit, goodness of fit]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (NIST e-Handbook §1.3.3.22 probability plots; D'Agostino & Stephens 1986)
needs: [stats.descriptive]
next: [spc.capability-nonnormal]
alternatives: [spc.normality-checks]
related: [maintenance.weibull]
---
# Fitting a distribution — the probability plot

## Purpose and principle
Choose a model for the readings (normal, lognormal, Weibull …) by plotting them
against each model's quantiles — a straight line fits — and by goodness-of-fit tests.

## Questions it answers
Which distribution describes these readings, for a tail estimate?

## Inputs and minimum conditions
Readings; candidate models chosen by the physics.

## Procedure and calculation
Plot sorted readings against F⁻¹((i − 0.5)/n); parameters by maximum likelihood; Anderson–Darling per model.

## Assumptions, limits and misuse
Choosing the best-fitting model with too few points.

## Reading the result
"Lognormal fits; the normal does not."

## When not to use it — and instead
Just the shape check → `spc.normality-checks`.

## In food and FMCG manufacturing
Residual oxygen, microbial counts, repair times.

## References
- [practice] NIST/SEMATECH *e-Handbook of Statistical Methods*, §1.3.3.22 (probability plot).

## In Faultline
Not built (FC-114).
