---
id: commissioning.ramp-up
name: The climb to rate and the pace to handover — forecasts from what is done
aka: [ramp up, climb to rate, burn down, pace, handover forecast]
discipline: commissioning
kind: faultline
evidence: practice
depth: summary
checked: 2026-10-22 — a burn-down of what is left at the pace achieved, and a climb fitted to the runs; Faultline's design in docs/LEAN40.md step 1, src/lib/pace.ts and src/lib/rampUp.ts, proved by scripts/acceptance/stagegate-step1.mjs
needs: [commissioning.stage-gate]
next: []
alternatives: [maintenance.reliability-growth]
related: [ie.learning-curve]
---
# The climb to rate and the pace to handover

## Purpose and principle
The project forecasts itself: what is left at the pace it is being done gives
the handover day; each product's runs plotted give when it reaches its agreed rate.

## Questions it answers
When will we hand over at this pace? When will the line run at rate?

## Inputs and minimum conditions
Stages done by date; performance runs with their rates and days.

## Procedure and calculation
Pace = work done ÷ days; days left = work left ÷ pace. The climb: the runs' net rates over days, extrapolated to the agreed rate.

## Assumptions, limits and misuse
Early pace may not hold; say how many days it is from.

## Reading the result
"At this pace, hand over 14 November — 9 days late."

## When not to use it — and instead
Failures falling as fixes go in → `maintenance.reliability-growth`.

## In food and FMCG manufacturing
New line commissioning to a retailer's launch date.

## References
- [practice] docs/LEAN40.md — Faultline's design.

## In Faultline
`src/lib/pace.ts`, `src/lib/rampUp.ts` (FC-077, FC-078).
