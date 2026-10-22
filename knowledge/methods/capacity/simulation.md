---
id: capacity.simulation
name: Line simulation — stops, buffers and output, by Monte Carlo or discrete events
aka: [discrete event simulation, Monte Carlo, line simulation, digital twin]
discipline: capacity
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Law, Simulation Modeling and Analysis)
needs: [capacity.line-capacity, maintenance.mtbf-failure-rate, maintenance.mttr-availability]
next: []
alternatives: [capacity.kingman-vut]
related: [capacity.accumulation-buffer]
---
# Line simulation — stops, buffers and output

## Purpose and principle
When stops, buffers and speeds interact, simulate: draw stops from each
machine's MTBF and MTTR, move product through buffers, and count output over
many runs to see the distribution of what the line makes.

## Questions it answers
What will a bigger buffer or a faster labeller really buy?

## Inputs and minimum conditions
Each machine's rate, MTBF, MTTR (as distributions); buffer sizes; enough runs.

## Procedure and calculation
Discrete-event or time-stepped simulation; output per run; mean and spread over runs.

## Assumptions, limits and misuse
Garbage in, garbage out: MTBF and MTTR must be measured; validate against a real shift.

## Reading the result
"With the table doubled, 4.1% more a shift (3.2–5.0%)."

## When not to use it — and instead
One constraint and little interaction → `capacity.theory-of-constraints`.

## In food and FMCG manufacturing
New line design; adding accumulation to a bottling line.

## References
- [textbook] Law, A.M. (2015), *Simulation Modeling and Analysis*, 5th ed., McGraw-Hill.

## In Faultline
Research first: needs repair times (not measured yet) and a design that stays simple (FC-047).
