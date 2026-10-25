---
id: capacity.line-balancing
name: Line balancing — work shared between people against takt (Yamazumi)
aka: [line balancing, Yamazumi, operator balance chart, balance loss, balance efficiency, ranked positional weight, precedence diagram]
discipline: capacity
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-22 — balance efficiency and the heuristics as Salveson (1955), Helgeson & Birnie (1961), Scholl (1999); Faultline's version in src/tools/linework/balance.ts proved by balance.test.ts, balanceLink.test.ts and scripts/acceptance/work-balance.mjs
needs: [ie.time-study, lean.takt-time]
next: [lean.standard-work, ie.ecrs]
alternatives: []
related: [capacity.line-capacity, ie.person-machine]
---
# Line balancing — work shared between people against takt (Yamazumi)

## Purpose and principle
Each person's elements stacked as a bar against the takt line (the Yamazumi),
so overloaded and idle people show; the work is then shared so every bar is
just under takt with as few people as the work content needs.

## Questions it answers
Who is over takt? How many people does the work need? How much is lost to imbalance?

## Inputs and minimum conditions
Elements with standard times and who does each; the order they must be done
in (precedence); takt.

## Procedure and calculation
- Each person's cycle = Σ their elements' standard times.
- Theoretical minimum people = ⌈Σ work content ÷ takt⌉.
- Balance efficiency = Σ work content ÷ (people × longest cycle); balance loss = 1 − efficiency.
- Ranked positional weight: each element's weight = its time + all that must
  follow it; assign in weight order to the current person while it fits takt
  and its predecessors are placed.

## Assumptions, limits and misuse
Element times vary; balancing to the mean leaves the line short half the time
— balance to takt with a margin. Precedence ignored produces impossible balances.

## Reading the result
"4 people for 98 s of work at takt 28 s (minimum 4); efficiency 88%; Op 2 at 31 s — over."

## When not to use it — and instead
Machine-limited lines → `capacity.line-capacity`.

## In food and FMCG manufacturing
Sandwich and ready-meal assembly lines; hand-packing of mixed boxes.

## References
- [paper] Salveson, M.E. (1955), "The assembly line balancing problem", *Journal of Industrial Engineering* 6(3), 18–25.
- [paper] Helgeson, W.B. and Birnie, D.P. (1961), "Assembly line balancing using the ranked positional weight technique", *Journal of Industrial Engineering* 12(6), 394–398.
- [textbook] Scholl, A. (1999), *Balancing and Sequencing of Assembly Lines*, 2nd ed., Physica.

## In Faultline
The Line balance (`src/tools/linework/`, FC-032 with the modes of `knowledge/specs/FC-032-line-balance.md`): the
Yamazumi against takt, linked to Line capacity; since 25 October the **Order of work** lens — what each step must follow,
its positional weight, loops refused, and ranked positional weight proposing the balance that keeps the order with the
fewest-people floor ⌈work ÷ takt⌉ beside it (FC-033). A heuristic, said so.
