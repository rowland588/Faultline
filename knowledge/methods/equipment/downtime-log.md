---
id: equipment.downtime-log
name: Stops timed at the machine — the downtime log and its Pareto
aka: [downtime log, stops log, stopwatch, downtime Pareto, stop reasons, heat map]
discipline: equipment
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — practice (TPM loss recording); Faultline's log in src/screens/CaptureScreen.tsx, counted once by src/lib/intelligence/stops.ts, Pareto src/lib/paretoFromLog.ts, proved by tests and scripts/acceptance/upgrade.mjs
needs: []
next: [quality.pareto, rca.fishbone-5whys, equipment.chronic-sporadic]
alternatives: [maintenance.mtbf-failure-rate]
related: [equipment.time-model-losses]
---
# Stops timed at the machine — the downtime log and its Pareto

## Purpose and principle
Every stop timed by a person with its machine and reason, so losses can be
ranked (Pareto), placed (machine × day) and costed.

## Questions it answers
Which machine and reason lose the most time and money? Where and when?

## Inputs and minimum conditions
A stopwatch or start/end time, the machine, the reason from a short list, the shift.

## Procedure and calculation
Minutes by reason and machine, overlaps on one machine counted once; ranked; × cost rates.

## Assumptions, limits and misuse
Short stops are under-recorded by hand; reason lists that grow without control.

## Reading the result
"Film breaks on the wrapper: 214 minutes in four weeks, 31% of all stops."

## When not to use it — and instead
How often a machine stops while watched → `maintenance.mtbf-failure-rate`.

## In food and FMCG manufacturing
Weigher blockages, film breaks, label jams, waiting for product.

## References
- [textbook] Nakajima, S. (1988), *Introduction to TPM*, Productivity Press.

## In Faultline
FC-051 to FC-053: `src/screens/CaptureScreen.tsx`, `src/lib/intelligence/stops.ts`, `src/lib/intelligence/heat.ts`.
