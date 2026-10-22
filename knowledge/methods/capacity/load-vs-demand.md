---
id: capacity.load-vs-demand
name: Load against demand — will next week's orders fit
aka: [load vs capacity, capacity check, headroom, overflow, rough-cut capacity]
discipline: capacity
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — rough-cut capacity planning (APICS practice) in Faultline's form, src/lib/intelligence/demand.ts, proved by its tests and scripts/acceptance/upgrade.mjs
needs: [capacity.line-capacity]
next: [planning.scheduling-rules]
alternatives: []
related: [capacity.three-capacities, planning.crew-planning]
---
# Load against demand — will next week's orders fit

## Purpose and principle
The week's demand per product at the rate the line can be planned on, against
the hours the running pattern gives, with the constraint highlighted: headroom
or overflow in hours, units and money.

## Questions it answers
Will next week fit? By how much over? What does the overflow risk in money?

## Inputs and minimum conditions
Demand per product; each product's plannable rate; the running pattern.

## Procedure and calculation
Hours needed = Σ demand ÷ plannable rate (+ changeovers); headroom = hours available − hours needed.

## Assumptions, limits and misuse
The plannable rate must come from counted shifts, not the plate.

## Reading the result
"Next week needs 118 hours of 112 — 6 hours over, 25,900 packs, £8,200 at risk."

## When not to use it — and instead
Months ahead across lines → the same arithmetic aggregated (FC-048).

## In food and FMCG manufacturing
Retail promotions loading a line beyond its week.

## References
- [practice] APICS (ASCM) Dictionary — rough-cut capacity planning; from knowledge.

## In Faultline
`src/lib/intelligence/demand.ts` (FC-040).
