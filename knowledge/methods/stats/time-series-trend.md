---
id: stats.time-series-trend
name: Trend over weeks — the team's own numbers and whether they moved
aka: [trend, weekly measures, moving average, run chart, time series]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — run charts and moving averages (from knowledge); Faultline's weekly measures and proof in src/lib/measures.ts and src/lib/measureProof.ts
needs: []
next: [stats.two-sample-tests]
alternatives: [spc.control-charts-variables]
related: [visual.kpi-tree]
---
# Trend over weeks — the team's own numbers and whether they moved

## Purpose and principle
The number the team already keeps each week, plotted, with its trend and a
before → after split at a change, so progress is shown on the team's own measure.

## Questions it answers
Is our weekly number going the right way? Did it move after the change?

## Inputs and minimum conditions
A weekly value per line; the day of the change.

## Procedure and calculation
Run chart; moving average; before → after by `stats.two-sample-tests`.

## Assumptions, limits and misuse
Reading noise as trend; too few weeks.

## Reading the result
"Six weeks above the old average since the change; Welch p = 0.02."

## When not to use it — and instead
Within-shift readings → `spc.control-charts-variables`.

## In food and FMCG manufacturing
Weekly yield, give-away, labour per tonne.

## References
- [textbook] Wheeler, D.J. (2000), *Understanding Variation*, 2nd ed., SPC Press.

## In Faultline
`src/lib/measures.ts`, `src/lib/measureProof.ts` (FC-117, partly — no acceptance script).
