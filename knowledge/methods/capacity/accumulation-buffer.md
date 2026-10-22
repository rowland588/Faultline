---
id: capacity.accumulation-buffer
name: Accumulation between machines — buffer minutes and recovery
aka: [accumulation, buffer minutes, conveyor accumulation, recovery time, starving, blocking]
discipline: capacity
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — packaging-line practice as docs/CAPACITY.md §4 records it
needs: [capacity.v-curve]
next: [capacity.simulation]
alternatives: []
related: [capacity.kingman-vut]
---
# Accumulation between machines — buffer minutes and recovery

## Purpose and principle
How long the conveyor or table between two machines can keep the critical
machine fed (or clear) when its neighbour stops, and how fast the buffer
refills with the neighbour's overspeed.

## Questions it answers
Does a 2-minute stop on the labeller stop the filler? How long to recover?

## Inputs and minimum conditions
Buffer capacity in units; both machines' rates.

## Procedure and calculation
Buffer minutes = capacity ÷ critical rate; refill time = capacity ÷ (neighbour rate − critical rate).

## Assumptions, limits and misuse
Assumes the buffer is full (or empty) when the stop starts — say which.

## Reading the result
"The table holds 1.8 minutes; stops under 1.8 minutes do not reach the filler."

## When not to use it — and instead
Many stops interacting → `capacity.simulation`.

## In food and FMCG manufacturing
Accumulation tables before case packers; conveyor loops before palletisers.

## References
- [practice] docs/CAPACITY.md §4.

## In Faultline
Noted in Line capacity; not driven by an acceptance check (FC-046, partly).
