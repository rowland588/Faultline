---
id: equipment.chronic-sporadic
name: Chronic or one-off — a loss that keeps coming back
aka: [chronic losses, sporadic losses, recurrence, repeat failures]
discipline: equipment
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — the chronic/sporadic distinction (Juran; TPM practice); Faultline's rule in src/lib/intelligence/recurrence.ts
needs: [equipment.downtime-log]
next: [rca.fishbone-5whys]
alternatives: []
related: []
---
# Chronic or one-off — a loss that keeps coming back

## Purpose and principle
A sporadic loss is a sudden departure (a breakdown, a bad batch); a chronic
loss is small and always there. They need different approaches: restore the
first, redesign for the second.

## Questions it answers
Is this loss a one-off or is it every week?

## Inputs and minimum conditions
Weeks of the same loss recorded the same way.

## Procedure and calculation
Faultline: weeks with the loss in the last six — in most, chronic; once, a one-off; between, recurring.

## Assumptions, limits and misuse
Reason codes must be stable across weeks.

## Reading the result
"Film breaks: chronic — five weeks of six."

## When not to use it — and instead
One event's cause → `rca.fishbone-5whys`.

## In food and FMCG manufacturing
Chronic micro-stops on a labeller vs a one-off gearbox failure.

## References
- [textbook] Juran, J.M. and De Feo, J.A. (2010), *Juran's Quality Handbook*, 6th ed., McGraw-Hill.

## In Faultline
`src/lib/intelligence/recurrence.ts` (FC-054).
