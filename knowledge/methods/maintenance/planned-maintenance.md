---
id: maintenance.planned-maintenance
name: Planned maintenance — what is due, done on time, and what it found
aka: [planned maintenance, preventive maintenance, PM compliance, maintenance schedule, backlog]
discipline: maintenance
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (TPM planned maintenance pillar; maintenance KPIs as EN 15341 lists, edition to confirm)
needs: []
next: [maintenance.weibull]
alternatives: [maintenance.autonomous-maintenance]
related: [maintenance.criticality]
---
# Planned maintenance — what is due, done on time, and what it found

## Purpose and principle
Maintenance done on a schedule (time, count or condition) so failures are
prevented; measured by compliance (done on time), backlog and what the planned
work found.

## Questions it answers
Is planned work done on time? Which machines are behind?

## Inputs and minimum conditions
The plan (tasks, intervals); each task's due and done dates.

## Procedure and calculation
Compliance = done within window ÷ due; backlog in hours or weeks; planned share of all maintenance hours.

## Assumptions, limits and misuse
Intervals set by guess rather than failure data.

## Reading the result
"PM compliance 82%; the filler's monthly overdue by 9 days."

## When not to use it — and instead
Choosing intervals → `maintenance.weibull`.

## In food and FMCG manufacturing
Planned maintenance on non-production days; hygiene-driven intervals.

## References
- [standard] EN 15341, *Maintenance — Maintenance key performance indicators* — from knowledge; edition to confirm.

## In Faultline
Not built (FC-063, FC-067).
