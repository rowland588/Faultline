---
id: lean.andon
name: Andon and jidoka — calls for help, and how fast they are answered
aka: [andon, jidoka, call for help, response time, stop the line]
discipline: lean
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Ohno 1988; Liker 2004)
needs: []
next: [rca.fishbone-5whys, maintenance.mttr-availability]
alternatives: []
related: [visual.daily-management]
---
# Andon and jidoka

## Purpose and principle
Stop at the first abnormality and call for help, so problems surface and are
fixed at once; the system works only if calls are answered fast.

## Questions it answers
How many calls, for what, and how long until help arrived and the problem was cleared?

## Inputs and minimum conditions
Each call tapped with its reason, the time help arrived, the time cleared.

## Procedure and calculation
Response time = arrived − called; resolution = cleared − called; per reason and shift.

## Assumptions, limits and misuse
Measuring calls as bad discourages calling.

## Reading the result
"23 calls; median response 4 minutes; film changes the most."

## When not to use it — and instead
Repairs of breakdowns → `maintenance.mttr-availability`.

## In food and FMCG manufacturing
A packer calling the engineer to a jam; QA called for a weight or label check.

## References
- [textbook] Ohno, T. (1988), *Toyota Production System*, Productivity Press.
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill.

## In Faultline
Not built (FC-015).
