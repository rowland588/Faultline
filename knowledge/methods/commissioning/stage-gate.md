---
id: commissioning.stage-gate
name: The stage gate for new equipment — gates, tests against what was agreed, handover
aka: [stage gate, phase gate, commissioning, installation qualification, FAT SAT handover]
discipline: commissioning
kind: adaptation
evidence: practice
depth: full
checked: 2026-10-22 — stage-gate project control (Cooper's Stage-Gate for product development; capital-project gate practice) adapted to equipment; Faultline's method in docs/STAGEGATE.md and src/lib/planModel.ts; proved by scripts/acceptance/stagegate-walk.mjs and others
needs: []
next: [commissioning.acceptance-tests, commissioning.ramp-up, commissioning.operational-readiness]
alternatives: [sixsigma.dmaic]
related: [visual.action-tracking, projects.critical-path]
---
# The stage gate for new equipment

## Purpose and principle
New equipment taken through gates — install, set up, test against what was
agreed, hand over — each gate passed only on evidence, with what it waits on
said, so the site and the supplier (OEM) agree what is done and what is owed.

## Questions it answers
Where is the project? What is late, what is failing, who owes what by when?
When will it hand over at this pace?

## Inputs and minimum conditions
Machines and their stages; tests with what they pass if; programs; materials; the handover list.

## Procedure and calculation
Gate state from its stages and tests; the pace (burn-down of what is left at
the rate it is being done) forecasts handover; the climb to rate from runs.

## Assumptions, limits and misuse
Gates passed on dates rather than evidence.

## Reading the result
"Set up: 3 of 4 machines; the labeller's test failed twice; handover at this pace 9 days late."

## When not to use it — and instead
A running line made better → `rca.fishbone-5whys` (the 6M).

## In food and FMCG manufacturing
A new packing line, a new oven, a new checkweigher, from delivery to production's acceptance.

## References
- [textbook] Cooper, R.G. (2001), *Winning at New Products*, 3rd ed., Perseus — Stage-Gate (the origin of the term).
- [practice] docs/STAGEGATE.md — Faultline's method.

## In Faultline
The stage gate (FC-073) and its parts — the acceptance tests, programs, the performance run, the climb to rate, the pace, materials, the handover and the filmed walk.
