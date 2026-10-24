---
id: cost.inventory-carrying-cost
name: What waiting product costs — inventory tied up, carrying cost, and labour on non-value-adding work
aka: [carrying cost, holding cost, inventory holding cost, WIP cost, cost of waiting, value stream costing, lean accounting]
discipline: cost
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the carrying-cost identity (value × annual rate; the rate the business's own, made of capital, storage, service and risk) and Little's law (WIP = throughput × flow time) from the operations-management textbooks below; value stream costing from Baggaley and Maskell (2003); the practitioner range of carrying rates (15–35% a year) from vendor and consultancy sources only, so it is said as a range and never defaulted
needs: [lean.value-stream-mapping, cost.line-cost-model]
next: [capacity.littles-law]
alternatives: []
related: [lean.seven-wastes, lean.kanban-supermarket]
---
# What waiting product costs — inventory tied up, carrying cost, and labour on non-value-adding work

## Purpose and principle
A value stream map shows waste as time; the business pays for it in two
different ways, and the two are never blended. **Non-value-adding work** costs
the hours people spend on it, at the stream's labour rate (lean accounting's
value stream costing: every cost of the stream is a direct cost of the
stream, labour included, counted weekly, never allocated by standard-cost
overhead). **Waiting product** — the queues between steps — costs nothing in
labour; it is money tied up (the pieces waiting × what each has cost to make
so far) and, for as long as it sits, a carrying cost: that value × the
business's annual carrying rate, pro rata. The carrying rate is the
business's own figure: the cost of capital, storage and handling, service
(insurance, tax) and risk (shrinkage, obsolescence — for food, product that
goes out of life). Practitioner sources put it between about 15% and 35% a
year; no textbook fixes a figure, so a tool asks for it and never assumes one.

## Questions it answers
What does the waste work on this stream cost a day? How much money is sitting
on the floor between steps, and what does carrying it cost a day? What would
cutting a queue in half release?

## Inputs and minimum conditions
The map's steps with their value class, cycle time, people and queue; demand
a day and the available time (the map's takt); the line's labour rate (the
one cost model); what a piece has cost by the time it waits (materials at
least — typed); the carrying rate a year (typed, with its components in
mind). A queue counted on the walk; where only the wait time is known,
Little's law gives the pieces (demand a day × wait as a share of the day).

## Procedure and calculation
- Labour on non-value-adding work a day = Σ over waste steps of
  (cycle seconds ÷ batch) × people × pieces a day × labour rate a second.
- Pieces waiting at a step = the counted queue; else, by Little's law,
  demand a day × (wait seconds ÷ available seconds a day).
- Tied up = Σ pieces waiting × cost a piece so far.
- Carrying cost a day = tied up × (annual rate ÷ 365).
- Lead time in days of demand = WIP ÷ demand a day (Little's law) — the
  map says this already as waits in days.

## Assumptions, limits and misuse
- The carrying rate is the business's; a borrowed figure is a guess. Said as
  a range, typed as the business's own.
- Cost a piece so far differs along the stream (materials at intake, more
  after each step); one typed figure is a simplification, said so.
- Tied up is working capital, not a daily loss; only the carrying cost is.
- For chilled food the real cost of a wait is often shelf life spent, which
  this does not price (a share of life, not money).

## Reading the result
"Waste work on the stream costs £410 a day in labour (the re-pack and the
re-count). £12,400 of product is waiting between steps — most of it the 6 h
QA hold — which costs about £8 a day to carry at 25% a year."

## When not to use it — and instead
Pricing a stop or a slow machine → `cost.line-cost-model`. Sizing the
inventory that should be there → `lean.kanban-supermarket`.

## In food and FMCG manufacturing
QA holds and positive release, chillers between filling and packing, pallets
waiting for despatch; the perishable risk is the largest part of the rate.

## References
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., Waveland — Little's law (WIP = TH × CT) and the cost of inventory.
- [textbook] Silver, E.A., Pyke, D.F. and Peterson, R. (1998), *Inventory Management and Production Planning and Scheduling*, 3rd ed., Wiley — the carrying charge r as a fraction of unit value a year.
- [textbook] Chopra, S. and Meindl, P. (2016), *Supply Chain Management*, 6th ed., Pearson — holding cost as cost of capital, obsolescence, handling, occupancy and miscellaneous.
- [paper] Baggaley, B. and Maskell, B. (2003), "Value stream management for lean companies, Part II", *Journal of Cost Management*, 17(3) — value stream costing: all costs direct to the stream, weekly.
- [paper] Little, J.D.C. (1961), "A proof for the queuing formula L = λW", *Operations Research* 9(3).
- [practitioner] Carrying-rate ranges of 15–35% a year appear in logistics and warehouse-software sources (checked 24 October 2026); no standard fixes a figure.

## In Faultline
Built 24 October on the value stream map (FC-001; `knowledge/specs/FC-001-value-stream-money.md`):
the labour on waste steps a day from the line's rate and the map's demand;
the product waiting at each wait, tied up at the cost a piece typed on the
map, and its carrying cost a day at the typed annual rate; each input
optional, the missing one named.
