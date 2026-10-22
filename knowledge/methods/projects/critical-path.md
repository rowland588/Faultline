---
id: projects.critical-path
name: Critical path and float in a project plan
aka: [critical path, CPM, float, slack, network diagram, schedule risk]
discipline: projects
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — Kelley & Walker (1959) CPM, from knowledge
needs: []
next: []
alternatives: [commissioning.ramp-up]
related: [commissioning.stage-gate]
---
# Critical path and float

## Purpose and principle
Tasks with durations and dependencies; the longest path sets the end date; a
task's float is how late it can slip without moving the end.

## Questions it answers
Which tasks move the handover if they slip?

## Inputs and minimum conditions
Tasks, durations, dependencies.

## Procedure and calculation
Forward pass (earliest start/finish), backward pass (latest), float = latest − earliest.

## Assumptions, limits and misuse
Dependencies not recorded; durations fixed.

## Reading the result
"The labeller's SAT is on the critical path; the case packer has 6 days' float."

## When not to use it — and instead
Forecast from pace → `commissioning.ramp-up`.

## In food and FMCG manufacturing
New line projects.

## References
- [paper] Kelley, J.E. and Walker, M.R. (1959), "Critical-path planning and scheduling", *Proceedings of the Eastern Joint Computer Conference*, 160–173.

## In Faultline
Not built (FC-215); the stage gate's plan has no dependencies.
