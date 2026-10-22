---
id: rca.stratification
name: Stratification — splitting the data to find where the problem lives
aka: [stratification, split by shift, split by machine, slice and dice, segmentation]
discipline: rca
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — one of the seven QC tools (Ishikawa), from knowledge; Faultline splits stops by shift, product and money (the Pareto) and by machine and day (the heat map)
needs: []
next: [stats.anova, stats.chi-square-association]
alternatives: [rca.is-is-not]
related: [quality.pareto]
---
# Stratification

## Purpose and principle
The same data split by shift, machine, head, lane, product, supplier or
operator, so a problem hidden in the total shows where it lives.

## Questions it answers
Is it everywhere, or one lane, one shift, one product?

## Inputs and minimum conditions
Data tagged by the factors to split by.

## Procedure and calculation
Counts or means by group; tested by `stats.anova` or `stats.chi-square-association`.

## Assumptions, limits and misuse
Splitting until something looks different by chance.

## Reading the result
"Nights reject twice what days do — on one product."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Weigher heads; lanes; shifts; raw-material lots.

## References
- [textbook] Ishikawa, K. (1982), *Guide to Quality Control*, APO.

## In Faultline
Partly (FC-153): the Pareto by shift, product and money; the heat map by machine and day.
