---
id: quality.complaints
name: Complaints per million and their Pareto
aka: [customer complaints, CPMU, complaints per million units, complaint trend]
discipline: quality
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — food-industry practice (CPMU), from knowledge
needs: []
next: [quality.pareto, rca.eight-d]
alternatives: []
related: [spc.capability-attribute-defects]
---
# Complaints per million and their Pareto

## Purpose and principle
Complaints normalised by units sold (per million), trended and ranked by type,
so a rising rate is seen and the biggest type chased.

## Questions it answers
Are complaints rising, which type, from which line?

## Inputs and minimum conditions
Complaints with type, product, line, date code; units sold in the period.

## Procedure and calculation
CPMU = complaints ÷ units × 10⁶; Poisson bounds; Pareto by type.

## Assumptions, limits and misuse
Comparing raw counts across volumes.

## Reading the result
"4.2 per million this quarter, up from 2.9; foreign body the most."

## When not to use it — and instead
One serious complaint → `rca.eight-d`.

## In food and FMCG manufacturing
Retailer complaint reporting; foreign body, taste, packaging.

## References
- [practice] BRCGS, *Global Standard for Food Safety*, Issue 9 (2022) — complaint handling; clause numbers to verify.

## In Faultline
Not built (FC-134).
