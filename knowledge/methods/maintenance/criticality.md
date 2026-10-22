---
id: maintenance.criticality
name: Equipment criticality ranking
aka: [criticality analysis, ABC criticality, asset criticality, risk ranking]
discipline: maintenance
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — from knowledge (asset-management practice; ISO 55000 family for context)
needs: []
next: [maintenance.rcm, maintenance.spares-poisson]
alternatives: [quality.fmea]
related: []
---
# Equipment criticality ranking

## Purpose and principle
Each machine scored for the consequence of its failure (safety, food safety,
output, quality, cost) and its likelihood, so maintenance effort and spares go
where failure matters most.

## Questions it answers
Which machines must never fail, and which can run to failure?

## Inputs and minimum conditions
Each machine with consequence and likelihood scores on agreed scales.

## Procedure and calculation
Score = consequence × likelihood (or a matrix); A/B/C classes.

## Assumptions, limits and misuse
Scores agreed once and never revisited.

## Reading the result
"A: filler, metal detector, case sealer."

## When not to use it — and instead
Failure modes of one machine → `quality.fmea`.

## In food and FMCG manufacturing
CCP equipment (metal detectors, pasteurisers) always class A.

## References
- [practice] Moubray, J. (1997), *Reliability-Centred Maintenance*, 2nd ed., Butterworth-Heinemann — from knowledge.

## In Faultline
Not built (FC-064).
