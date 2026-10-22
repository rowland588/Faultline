---
id: maintenance.weibull
name: Weibull analysis of times to failure
aka: [Weibull, life data analysis, beta, shape parameter, infant mortality, wear out, B life]
discipline: maintenance
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — IEC 61649:2008 (Weibull analysis) from knowledge; Abernethy (2006)
needs: [maintenance.mtbf-failure-rate]
next: [maintenance.planned-maintenance]
alternatives: [maintenance.mtbf-failure-rate]
related: [stats.distribution-fitting]
---
# Weibull analysis of times to failure

## Purpose and principle
Fit the Weibull distribution to the times between failures of a part: its
shape β says infant mortality (β < 1), random (β ≈ 1), or wear-out (β > 1) —
which decides whether replacing it on a schedule helps.

## Questions it answers
Is this belt wearing out? When should it be changed?

## Inputs and minimum conditions
Times (or counts, cycles) to failure for one failure mode; suspensions (parts removed working) kept.

## Procedure and calculation
Median ranks (Bernard: (i − 0.3)/(n + 0.4)); regression of ln(−ln(1 − F)) on ln t; β the slope, η the scale; B10 = η(−ln 0.9)^(1/β).

## Assumptions, limits and misuse
Mixing failure modes; ignoring suspensions; very few points.

## Reading the result
"β 2.8 — wear-out; B10 at 410 hours: change the jaws at 400."

## When not to use it — and instead
Stops at a steady rate → `maintenance.mtbf-failure-rate`.

## In food and FMCG manufacturing
Sealing jaw Teflon tapes, cutting knives, conveyor belts.

## References
- [standard] IEC 61649:2008, *Weibull analysis* — from knowledge.
- [textbook] Abernethy, R.B. (2006), *The New Weibull Handbook*, 5th ed.

## In Faultline
Not built (FC-060).
