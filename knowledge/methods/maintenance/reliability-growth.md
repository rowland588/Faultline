---
id: maintenance.reliability-growth
name: Reliability growth — is the machine getting better as fixes go in (Crow–AMSAA)
aka: [reliability growth, Crow-AMSAA, Duane model, NHPP, power law process]
discipline: maintenance
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — MIL-HDBK-189C (2011) and IEC 61164 from knowledge
needs: [maintenance.mtbf-failure-rate]
next: [commissioning.acceptance-tests]
alternatives: []
related: [commissioning.ramp-up]
---
# Reliability growth — is the machine getting better as fixes go in

## Purpose and principle
During commissioning, failures should come less often as fixes go in. The
Crow–AMSAA model treats cumulative failures N(t) = λt^β: β < 1 is growth
(improving), β = 1 steady, β > 1 worsening.

## Questions it answers
Is the new line improving fast enough to reach its MTBF by handover?

## Inputs and minimum conditions
Each failure's cumulative running time since the start of the test.

## Procedure and calculation
β̂ = n / Σ ln(T/tᵢ) (time-truncated); λ̂ = n/T^β̂; instantaneous MTBF = 1/(λ̂β̂T^(β̂−1)).

## Assumptions, limits and misuse
Needs consistent recording across the whole period; big changes reset the model.

## Reading the result
"β 0.62 — improving; instantaneous MTBF 48 min now, 70 projected by handover."

## When not to use it — and instead
A settled machine → `maintenance.mtbf-failure-rate`.

## In food and FMCG manufacturing
A new packing line's stops falling over its first weeks.

## References
- [standard] MIL-HDBK-189C (2011), *Reliability Growth Management* — from knowledge.
- [standard] IEC 61164, *Reliability growth — Statistical test and estimation methods* — from knowledge.

## In Faultline
Not built (FC-061). The reliability study's Laplace trend says whether the rate is changing.
