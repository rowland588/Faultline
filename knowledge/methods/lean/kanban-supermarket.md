---
id: lean.kanban-supermarket
name: Kanban, supermarkets and FIFO lanes — sizing pull
aka: [kanban sizing, number of kanbans, supermarket sizing, FIFO lane, pull system]
discipline: lean
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — the Toyota kanban formula as Monden gives it, from knowledge; supermarket and FIFO as Smalley (2004)
needs: [lean.value-stream-mapping]
next: [lean.heijunka-epei]
alternatives: [planning.safety-stock]
related: [capacity.littles-law]
---
# Kanban, supermarkets and FIFO lanes — sizing pull

## Purpose and principle
Where flow is impossible, pull: a supermarket of a fixed amount, replenished
only when used, signalled by kanban cards; between processes that must stay in
order, a FIFO lane with a maximum.

## Questions it answers
How many containers in the loop? How big should the supermarket be?

## Inputs and minimum conditions
Daily demand, replenishment lead time, container quantity, a safety factor.

## Procedure and calculation
Kanbans N = D × L × (1 + α) ÷ C — D demand a unit of time, L lead time
(including the waiting to be collected), α the safety factor, C the container size.

## Assumptions, limits and misuse
Assumes levelled, stable demand; with big swings the loop starves or overflows.

## Reading the result
"6 crates of trays in the loop; the supermarket holds at most 6."

## When not to use it — and instead
Purchased materials with long, variable lead times → `planning.safety-stock`.

## In food and FMCG manufacturing
Packaging film and cases at the line; ingredient pre-weighs feeding mixers.

## References
- [textbook] Monden, Y. (2012), *Toyota Production System*, 4th ed., CRC Press.
- [textbook] Smalley, A. (2004), *Creating Level Pull*, Lean Enterprise Institute.

## In Faultline
Not built (FC-009, FC-010).
