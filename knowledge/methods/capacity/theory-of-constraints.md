---
id: capacity.theory-of-constraints
name: Theory of Constraints — the five focusing steps and the mirage
aka: [TOC, constraint, bottleneck, five focusing steps, the mirage, exploit subordinate elevate]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Goldratt (1984, 1990); Faultline's "mirage" (a loss off the constraint makes no more) in src/lib/intelligence/constraint.ts and levers.ts, proved by intelligence tests and scripts/acceptance/upgrade.mjs
needs: [capacity.line-capacity]
next: [capacity.dbr-buffer, capacity.throughput-accounting]
alternatives: []
related: [equipment.time-model-losses, cost.line-cost-model, ie.work-sampling]
---
# Theory of Constraints — the five focusing steps and the mirage

## Purpose and principle
A line's output is set by its constraint. An hour lost there is an hour lost to
the line; an hour saved anywhere else is a mirage. The five steps: identify the
constraint, exploit it (never let it stop or wait), subordinate everything else
to it, elevate it (add capacity), and start again when it moves.

## Questions it answers
Which losses actually cost output? Where is the prize? What happens if we fix
a loss off the constraint?

## Inputs and minimum conditions
The constraint (from Line capacity, or the bottleneck walk on the floor); the
losses with where they occur.

## Procedure and calculation
Recovered minutes on the constraint × its rate = extra output; recovered minutes
elsewhere = 0 extra output (but labour time saved).

## Assumptions, limits and misuse
The constraint can move with the mix and with every fix; a "bottleneck" by
plate speed may not be the running constraint.

## Reading the result
"Breakdowns on the capper cost 1,400 packs a shift; on the labeller, no packs — it runs round them."

## When not to use it — and instead
Several near-equal constraints → simulation (`capacity.simulation`).

## In food and FMCG manufacturing
The oven in a bakery; the filler in a bottling hall; a hand-pack station.

## References
- [textbook] Goldratt, E.M. and Cox, J. (1984), *The Goal*, North River Press.
- [textbook] Goldratt, E.M. (1990), *What Is This Thing Called Theory of Constraints?*, North River Press.

## In Faultline
`src/lib/intelligence/constraint.ts` (the constraint and the mirage),
`src/lib/intelligence/levers.ts` (recovery levers), the loss count's
constraint (FC-038, FC-039).
