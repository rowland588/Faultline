---
id: capacity.v-curve
name: The V-curve and accumulation — protecting the critical machine
aka: [V-curve, V graph, line design curve, accumulation, buffer, overspeed]
discipline: capacity
kind: established
evidence: practice
depth: full
checked: 2026-10-22 — packaging-line design practice (the critical machine slowest, machines upstream and downstream faster with buffers) as docs/CAPACITY.md §4 records it; the agreed V margin and guide proved by scripts/acceptance/line-capacity.mjs
needs: [capacity.line-capacity]
next: [capacity.accumulation-buffer]
alternatives: []
related: [capacity.theory-of-constraints, equipment.time-model-losses]
---
# The V-curve and accumulation — protecting the critical machine

## Purpose and principle
A packaging line is designed around its critical machine (usually the filler
or the most expensive): it runs slowest, and the machines upstream and
downstream run progressively faster, with accumulation between, so a short stop
anywhere else is absorbed before the critical machine starves or blocks.
Plotted, the speeds make a V with its point at the critical machine.

## Questions it answers
Is the line designed so the critical machine is protected? Which machine is
too close to the bottleneck's speed to recover after a stop?

## Inputs and minimum conditions
Rated speeds in the line's unit, in flow order; the agreed margins (often
+10–30% per step away from the critical machine — a design convention, agreed per line).

## Procedure and calculation
Each station's speed ÷ the critical machine's; flag stations under the agreed
margin. Recovery after a stop of t minutes with accumulation A packs at a speed
difference Δ: the buffer empties in A ÷ rate and refills at Δ.

## Assumptions, limits and misuse
The margins are a design practice, not a law; recovery needs the buffer and
the overspeed together.

## Reading the result
"The capper is at 103% of the filler — under the agreed 115%: it cannot catch up after a stop."

## When not to use it — and instead
A line with no clear critical machine → `capacity.theory-of-constraints` on running data.

## In food and FMCG manufacturing
Bottling and canning lines; flow-wrap lines with case packers and palletisers.

## References
- [standard] EN 415-11:2021 — efficiency and availability of packaging lines; scope checked online 22 Oct 2026, content not read.
- [practice] docs/CAPACITY.md §4 — Faultline's record of the practice.

## In Faultline
Line capacity's V (`src/lib/capacity.ts` shareColours, the margin and the
guide); accumulation is noted but not driven by an acceptance check (FC-046).
