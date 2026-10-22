---
id: capacity.littles-law
name: WIP and lead time — Little's law
aka: [Little's law, WIP, work in progress, lead time, L equals lambda W, flow time]
discipline: capacity
kind: established
evidence: peer-reviewed
depth: summary
checked: 2026-10-22 — Little (1961); Hopp & Spearman (2008)
needs: []
next: [lean.value-stream-mapping]
alternatives: []
related: [capacity.kingman-vut, lean.kanban-supermarket]
---
# WIP and lead time — Little's law

## Purpose and principle
In a steady system, average work in progress = throughput × average time in
the system. Count the WIP and know the throughput, and the lead time follows —
no stopwatch on every item.

## Questions it answers
How long does product sit in the hall? What would halving WIP do to lead time?

## Inputs and minimum conditions
WIP counts (a snapshot or several); throughput over the same period; a steady state.

## Procedure and calculation
W = L ÷ λ (lead time = WIP ÷ throughput), in consistent units.

## Assumptions, limits and misuse
Long-run averages in a stable system; a growing pile breaks it.

## Reading the result
"1,800 trays in the chiller at 600 an hour: 3 hours of lead time."

## When not to use it — and instead
Why the queue is long → `capacity.kingman-vut`.

## In food and FMCG manufacturing
Product waiting in chillers between cooking and packing — shelf life spent waiting.

## References
- [paper] Little, J.D.C. (1961), "A proof for the queuing formula L = λW", *Operations Research* 9(3), 383–387.
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., McGraw-Hill.

## In Faultline
Not built (FC-044).
