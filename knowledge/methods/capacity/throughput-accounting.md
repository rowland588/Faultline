---
id: capacity.throughput-accounting
name: Throughput accounting — the product mix by throughput per constraint minute
aka: [throughput accounting, T per constraint minute, product mix, contribution per bottleneck minute]
discipline: capacity
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — Goldratt's throughput (price less truly variable cost) per constraint minute; Faultline's arithmetic in src/lib/ie/mix.ts proved by its test
needs: [capacity.theory-of-constraints]
next: [planning.scheduling-rules]
alternatives: []
related: [cost.line-cost-model]
---
# Throughput accounting — the product mix by throughput per constraint minute

## Purpose and principle
When the constraint cannot make everything asked, make first what earns most
per constraint minute: throughput a unit (price less truly variable cost) ×
units a constraint minute.

## Questions it answers
Which products to make when the line is full? What is unmade worth?

## Inputs and minimum conditions
Each product's price and materials (or margin), its rate on the constraint, its demand.

## Procedure and calculation
T a minute = T a unit × constraint rate; rank; fill the constraint's time in that order to each demand.

## Assumptions, limits and misuse
"Truly variable" cost only; overheads allocated to products distort it.

## Reading the result
"A first at £32 a constraint minute, B at £24; 2,400 of C unmade."

## When not to use it — and instead
Spare capacity everywhere → make the demand.

## In food and FMCG manufacturing
Pack sizes competing for one filler in peak season.

## References
- [textbook] Goldratt, E.M. (1990), *The Haystack Syndrome*, North River Press.
- [textbook] Corbett, T. (1998), *Throughput Accounting*, North River Press.

## In Faultline
Arithmetic only (`src/lib/ie/mix.ts`, FC-042, partly — no screen).
