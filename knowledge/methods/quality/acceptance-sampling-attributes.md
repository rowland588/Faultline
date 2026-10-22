---
id: quality.acceptance-sampling-attributes
name: Acceptance sampling by attributes — AQL plans and their OC curve
aka: [AQL, acceptance sampling, ISO 2859-1, sampling plan, OC curve, operating characteristic]
discipline: quality
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — ISO 2859-1:1999 from knowledge (its tables are copyright — knowledge/GAPS.md); the OC curve from the binomial
needs: []
next: [quality.supplier-quality]
alternatives: [spc.zero-failure-demonstration, quality.acceptance-sampling-variables]
related: [stats.confidence-intervals]
---
# Acceptance sampling by attributes — AQL plans and their OC curve

## Purpose and principle
Accept or reject a lot by inspecting a sample n and allowing at most c
defectives. The OC curve says, for each true defect rate, the chance the lot is accepted.

## Questions it answers
What does our incoming check actually protect against? Is this plan enough?

## Inputs and minimum conditions
Lot size, the plan (n, c) or the AQL and inspection level.

## Procedure and calculation
P(accept | p) = Σ_{d ≤ c} C(n, d) pᵈ(1 − p)^(n − d); AQL and LTPD read off the curve.

## Assumptions, limits and misuse
AQL is not a promise about each lot; the plan protects the producer at the AQL, the consumer only at the LTPD.

## Reading the result
"n 50, c 1: a lot with 2% defective passes 74% of the time."

## When not to use it — and instead
Proving a process → capability, not lot sampling.

## In food and FMCG manufacturing
Incoming packaging; finished-goods audits.

## References
- [standard] ISO 2859-1:1999, *Sampling procedures for inspection by attributes — Part 1* — from knowledge; tables copyright.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — acceptance sampling.

## In Faultline
Research first (FC-129); the OC curve alone could be built from the binomial (FC-131).
