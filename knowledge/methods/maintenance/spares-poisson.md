---
id: maintenance.spares-poisson
name: Critical spares — how many to hold
aka: [spare parts, spares stocking, Poisson spares, stock-out risk]
discipline: maintenance
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — Poisson demand for spares, from knowledge
needs: [maintenance.mtbf-failure-rate]
next: []
alternatives: [planning.safety-stock]
related: [maintenance.criticality]
---
# Critical spares — how many to hold

## Purpose and principle
With failures at rate λ and a re-supply time L, the number used while waiting
is Poisson with mean λL; hold enough that running out is rare enough.

## Questions it answers
How many spare jaws or belts to keep so we are 95% sure not to run out?

## Inputs and minimum conditions
Failure rate (per installed part), installed quantity, lead time.

## Procedure and calculation
Smallest s with P(Poisson(λ·n·L) ≤ s) ≥ the service level.

## Assumptions, limits and misuse
Constant failure rate; lead time variability ignored.

## Reading the result
"Hold 3 jaw sets: 96% sure none run out in the 6-week lead time."

## When not to use it — and instead
Consumables with steady use → `planning.safety-stock`.

## In food and FMCG manufacturing
Seal jaws, cutting knives, weigher load cells.

## References
- [textbook] Silver, E.A., Pyke, D.F. and Thomas, D.J. (2017), *Inventory and Production Management in Supply Chains*, 4th ed., CRC Press.

## In Faultline
Not built (FC-066).
