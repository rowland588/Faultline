---
id: maintenance.mttr-availability
name: Repair times — MTTR, and availability
aka: [MTTR, mean time to repair, mean time to restore, availability, maintainability, response time]
discipline: maintenance
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — definitions as IEC 60050-192:2015 (from knowledge); inherent availability MTBF/(MTBF + MTTR); repair times often lognormal (maintainability practice, from knowledge)
needs: [maintenance.mtbf-failure-rate]
next: [rca.fishbone-5whys, maintenance.spares-poisson]
alternatives: [lean.andon]
related: [equipment.downtime-log]
---
# Repair times — MTTR, and availability

## Purpose and principle
How long it takes from a stop to running again, split where possible into
waiting for help, finding the fault, the repair and the restart. With MTBF,
availability = MTBF/(MTBF + MTTR).

## Questions it answers
How long are stops? Is the time in waiting for someone, finding, or fixing?
What would halving the repair time buy?

## Inputs and minimum conditions
Each event's start and end (and, if wanted, when help arrived and when fixed).

## Procedure and calculation
MTTR = Σ repair times ÷ n; the median and 90th percentile beside it (repair
times are skewed); availability = MTBF/(MTBF + MTTR).

## Assumptions, limits and misuse
The mean of skewed times misleads alone; waiting time is a different cause from repair time.

## Reading the result
"Median repair 3.5 minutes, mean 6.1, 1 in 10 over 14; availability 86%."

## When not to use it — and instead
Calls for help that are not repairs → `lean.andon`.

## In food and FMCG manufacturing
Engineer response to a jammed weigher; film change times.

## References
- [standard] IEC 60050-192:2015 — from knowledge.
- [textbook] Ebeling, C.E. (2010), *An Introduction to Reliability and Maintainability Engineering*, 2nd ed., Waveland — from knowledge.

## In Faultline
Not built (FC-059): the reliability study taps events but not their ends.
