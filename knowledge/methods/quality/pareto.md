---
id: quality.pareto
name: Pareto analysis — the vital few, by count, time and money
aka: [Pareto chart, 80/20, vital few, ranked losses, ABC analysis]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Juran's Pareto principle and the seven QC tools (Ishikawa); Faultline's Pareto from the stops log (src/lib/paretoFromLog.ts, src/lib/paretoView.ts), proved by tests and scripts/acceptance/upgrade.mjs
needs: []
next: [rca.fishbone-5whys, rca.stratification]
alternatives: [equipment.cost-deployment]
related: [quality.check-sheet, equipment.downtime-log]
---
# Pareto analysis — the vital few, by count, time and money

## Purpose and principle
Categories ranked largest first with their cumulative share: a few causes
usually make most of the loss, and they are where to start. Ranked by the
right measure — minutes, packs or money, not just counts — and run again
later as evidence that the bar targeted got smaller.

## Questions it answers
Which reasons or defect types make most of the loss? Did the one we went after shrink?

## Inputs and minimum conditions
Events with a category and a size (minutes, count, £), over a defined window; categories that do not overlap.

## Procedure and calculation
Sum by category; sort descending; cumulative %; compare two windows category by category.

## Assumptions, limits and misuse
"Other" as the biggest bar; ranking by count when one category's events are long;
small samples (few events) presented as settled (say how thin it is).

## Reading the result
"Film breaks and weigher blockages are 58% of the minutes; film breaks fell 40% since last month."

## When not to use it — and instead
The cause of the biggest bar → `rca.fishbone-5whys`; where it lives → `rca.stratification`.

## In food and FMCG manufacturing
Downtime reasons; reject types; complaint categories; give-away by product.

## References
- [textbook] Juran, J.M. and De Feo, J.A. (2010), *Juran's Quality Handbook*, 6th ed.
- [textbook] Ishikawa, K. (1982), *Guide to Quality Control*, Asian Productivity Organization.

## In Faultline
The line's Pareto from the stops log (FC-052); a defect Pareto is specified (FC-125).
