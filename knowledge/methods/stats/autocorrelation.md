---
id: stats.autocorrelation
name: Readings taken too close together — autocorrelation
aka: [autocorrelation, serial correlation, independence, lag 1 correlation]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery, autocorrelated process data; Box & Jenkins)
needs: []
next: [spc.control-charts-variables]
alternatives: []
related: [spc.capability-measured]
---
# Readings taken too close together — autocorrelation

## Purpose and principle
Readings taken so close in time that each is like the last are not independent;
charts and Cpk worked as if they were are misleading.

## Questions it answers
Are these readings independent enough for a chart or a capability?

## Inputs and minimum conditions
Readings in order, at least about 25.

## Procedure and calculation
r₁ = Σ(xₜ − x̄)(xₜ₊₁ − x̄)/Σ(xₜ − x̄)²; |r₁| > 2/√n suggests dependence.

## Assumptions, limits and misuse
Ignoring it inflates Cpk (the moving range shrinks).

## Reading the result
"Consecutive packs are correlated (r₁ 0.6) — sample every tenth pack."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Consecutive packs from a filler; temperatures logged each second.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — SPC with autocorrelated data.

## In Faultline
Not built (FC-115).
