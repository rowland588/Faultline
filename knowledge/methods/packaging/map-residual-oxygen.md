---
id: packaging.map-residual-oxygen
name: Residual oxygen in modified-atmosphere packs
aka: [MAP, residual oxygen, headspace gas, gas flush, modified atmosphere packaging]
discipline: packaging
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — from knowledge: headspace analysers read by a person; residual O₂ is bounded at zero and skewed
needs: [spc.normality-checks]
next: [spc.capability-nonnormal]
alternatives: []
related: [spc.capability-measured]
---
# Residual oxygen in modified-atmosphere packs

## Purpose and principle
The oxygen left in a gas-flushed pack, read from a headspace analyser, judged
against an upper limit; readings are skewed (bounded at zero), so the
capability must use the readings' own shape.

## Questions it answers
Are packs flushed well enough, consistently?

## Inputs and minimum conditions
Readings per pack (with lane), the upper limit.

## Procedure and calculation
One-sided capability (at most) with the shape checked; count over the limit with its bound.

## Assumptions, limits and misuse
Normal-tail Cpk on skewed readings.

## Reading the result
"Residual O₂ under 0.5% in 58 of 60; the two over from lane 4."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Meat, cheese, salad and bakery MAP packs.

## References
- [practice] from knowledge — MAP practice.

## In Faultline
Not built (FC-167): a capability study can hold the readings with an upper limit.
