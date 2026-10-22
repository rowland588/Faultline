---
id: planning.scheduling-rules
name: Production scheduling against capacity — and the classic rules
aka: [production schedule, scheduling, EDD, SPT, Johnson's rule, sequencing, Gantt schedule]
discipline: planning
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — Johnson (1954) and dispatching rules as Pinedo (2016) gives them, from knowledge
needs: [capacity.line-capacity]
next: [planning.schedule-adherence]
alternatives: [capacity.dbr-buffer]
related: [changeover.sequencing, capacity.load-vs-demand]
---
# Production scheduling against capacity — and the classic rules

## Purpose and principle
Orders placed on lines in time at each line's plannable rate, with
changeovers; dispatching rules order the queue — earliest due date, shortest
first; Johnson's rule minimises makespan for two machines in series.

## Questions it answers
What runs where and when this week? Will every order make its date?

## Inputs and minimum conditions
Orders with quantities and dates; plannable rates; changeover times; the running pattern.

## Procedure and calculation
Hours per order = quantity ÷ rate (+ changeover); the line's timeline; lateness by order.
Johnson: jobs with t₁ < t₂ first in increasing t₁, the rest last in decreasing t₂.

## Assumptions, limits and misuse
Plate speeds instead of plannable rates; no time for stops.

## Reading the result
"All orders fit except the Friday promo — 5 hours over on line 2."

## When not to use it — and instead
Will the week fit at all → `capacity.load-vs-demand`.

## In food and FMCG manufacturing
Daily retailer orders; promotions; short-life products.

## References
- [paper] Johnson, S.M. (1954), "Optimal two- and three-stage production schedules with setup times included", *Naval Research Logistics Quarterly* 1(1), 61–68.
- [textbook] Pinedo, M.L. (2016), *Scheduling: Theory, Algorithms, and Systems*, 5th ed., Springer.

## In Faultline
Not built (FC-179, FC-180).
