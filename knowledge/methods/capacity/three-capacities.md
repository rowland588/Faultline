---
id: capacity.three-capacities
name: Capacity's three numbers — design, effective, actual
aka: [design capacity, effective capacity, actual output, utilisation, efficiency, loading]
discipline: capacity
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — as Stevenson's Operations Management defines them; Faultline's arithmetic in src/lib/ie/mix.ts with its test
needs: [capacity.line-capacity]
next: [capacity.load-vs-demand]
alternatives: []
related: [equipment.time-model-losses]
---
# Capacity's three numbers — design, effective, actual

## Purpose and principle
What the line was built to make (design), what it can really make once the
planned losses of a shift are out (effective), and what it made (actual);
utilisation = actual ÷ design, efficiency = actual ÷ effective, loading =
demand ÷ effective.

## Questions it answers
How much of the line's real capacity does demand need?

## Inputs and minimum conditions
Rated speed and time; planned losses; a counted output; demand.

## Procedure and calculation
As above; e.g. 148,000 ÷ 201,600 = 73% utilisation; ÷ 175,000 = 85% efficiency.

## Assumptions, limits and misuse
Effective capacity depends on what is called "planned"; say it.

## Reading the result
"Demand needs 92% of what the line can really make."

## When not to use it — and instead
Week-by-week fit → `capacity.load-vs-demand`.

## In food and FMCG manufacturing
Peak-season planning on a line with fixed cleaning time.

## References
- [textbook] Stevenson, W.J., *Operations Management*, McGraw-Hill (13th ed., 2018) — capacity planning.

## In Faultline
Arithmetic only (`src/lib/ie/mix.ts`); the load against demand uses plannable capacity (FC-041, partly).
