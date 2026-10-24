---
id: cost.line-cost-model
name: The line's cost model — labour, contribution, what a loss and a pack cost
aka: [cost per pack, labour cost, contribution, margin, bottleneck cost, lost time cost, cost of a stop]
discipline: cost
kind: faultline
evidence: decision
depth: full
checked: 2026-10-22 — Faultline's one cost model (CLAUDE.md "Everything derives a cost"; docs/CAPACITY.md §6): src/lib/cost.ts, src/lib/lineLoss.ts, src/tools/linebalance/capacity.ts (labourCost, bottleneckCost), src/tools/linework/balanceLink.ts (balanceCost), src/tools/losses/losses.ts (contributionOf); proved by their tests
needs: []
next: [cost.investment-appraisal]
alternatives: []
related: [capacity.theory-of-constraints, equipment.time-model-losses]
---
# The line's cost model — labour, contribution, what a loss and a pack cost

## Purpose and principle
Every finding said in money from one model, never a second: the people
(Line capacity's labour, else the line standard's head count, else the line's
crew), one person's rate (Line capacity's, else the line's wage × on-costs),
and the line's contribution a pack (price less materials, else its margin a
pack). Lost time costs labour wherever it happens, and lost contribution only
where it stops the line (the constraint).

## Questions it answers
What does a pack cost in labour? What does a stop, a minute at the bottleneck,
a changeover, a reject cost?

## Inputs and minimum conditions
Crew, wage, on-costs; price and materials or margin a pack; the line's rate and constraint. Since 24 October the line also carries a pack's materials as its typical figure (`Workspace.materialsPerPack`, *Set up the line*) — what a reject throws away and what product held is worth at least — the fallback where no product's own figure is named (`knowledge/MONEY.md` §3).

## Procedure and calculation
- Labour £ an hour = crew × wage × on-costs.
- Labour a pack = labour an hour ÷ packs an hour.
- A lost minute = labour a minute + (at the constraint) packs a minute × contribution a pack.
- Where an input is missing, the tool says which and where to give it — never a blank, never an invented figure.

## Assumptions, limits and misuse
Blending labour and contribution into one figure for stops off the constraint
(fixed 14 October); charging overheads per pack.

## Reading the result
"Labour 4.2p a pack; a minute at the wrapper £31 (labour £6 + 72 packs × £0.35)."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Every line.

## References
- [decision] Rowland, 17 October: "Everything must derive a cost in the entire app ... It's all about money" — CLAUDE.md.
- [textbook] Goldratt, E.M. (1990), *The Haystack Syndrome* — throughput, not allocated cost.

## In Faultline
FC-187 to FC-190.
