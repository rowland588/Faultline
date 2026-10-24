---
id: capacity.line-capacity
name: Line capacity — each station's rate in its own unit, the bottleneck, people needed
aka: [process capacity sheet, capacity model, line capacity, bottleneck, plate speed, rated speed, people needed]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Toyota's process capacity sheet (Lean Lexicon) and the constraint (Goldratt); plate speed and a person's standard time as docs/CAPACITY.md §1–3 sets them; proved by src/tools/linebalance/__tests__/capacity.test.ts and scripts/acceptance/line-capacity.mjs
needs: [ie.time-study]
next: [capacity.theory-of-constraints, capacity.v-curve, cost.line-cost-model]
alternatives: [capacity.simulation]
related: [lean.standard-work, capacity.line-balancing, capacity.three-capacities, planning.crew-planning]
---
# Line capacity — each station's rate in its own unit, the bottleneck, people needed

## Purpose and principle
What each station in a line can make, each in the unit it works in (packs, trays,
cases, pallets) converted to the line's unit, so the slowest — the bottleneck —
shows, and with it what the whole line can make. A machine is taken at its plate
(rated) speed unless a person paces it; a person at their standard time with rest
allowed. The number of people a station needs is its work against the pace it must keep.

## Questions it answers
What can the line make an hour and a shift? Which station limits it, by how much?
How many people does each manual station need? What does adding a person do?

## Inputs and minimum conditions
Stations in flow order, each with its speed (plate or timed) and its unit, the
conversions between units (8 packs a tray, 36 trays a pallet), people and their
times, the line's target; for money, the people's rate and the line's margin.

## Procedure and calculation
- Each station's rate in the line's unit = its rate × units per its unit.
- A person's rate = 60 ÷ standard time (s) × units per cycle, standard time
  including the rest allowance.
- Line rate = min(station rates); the bottleneck is that station.
- Each station's share of the bottleneck's rate (the V-curve, `capacity.v-curve`).
- People needed at a station = its work content a unit × the line's rate ÷ 60 (rounded up, said as both).
- Cost a pack in labour = people × rate an hour ÷ packs an hour (`cost.line-cost-model`).

## Assumptions, limits and misuse
- Plate speed is not running speed; stops and slow running are the loss count's.
- Stations in parallel and merging lines need their rates added before the merge.
- A station fed from several lines needs the merged rate, not one line's.

## Reading the result
"The line makes 4,320 an hour, held by the wrapper (72 a minute); the
palletiser has 31% to spare; the packer needs 2 people."

## When not to use it — and instead
Stops and buffers interacting → `capacity.simulation`. People's work split
between them → `capacity.line-balancing`.

## In food and FMCG manufacturing
A packing line from weigher to palletiser; a bakery's oven as the constraint;
hand-pack stations feeding a case packer.

## References
- [practice] Lean Enterprise Institute (2014), *Lean Lexicon*, 5th ed. — process capacity sheet.
- [textbook] Goldratt, E.M. and Cox, J. (1984), *The Goal*, North River Press.
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., McGraw-Hill.

## In Faultline
Line capacity (`src/tools/linebalance/capacity.ts`, `src/tools/linebalance/CapacityPanel.tsx`),
proved by the capacity tests and `scripts/acceptance/line-capacity.mjs`; the
knowledge behind it `docs/CAPACITY.md`.
