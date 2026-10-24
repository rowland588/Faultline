---
id: capacity.littles-law
name: WIP and lead time — Little's law
aka: [Little's law, WIP, work in progress, lead time, L equals lambda W, flow time]
discipline: capacity
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-24 — Little (1961); the law and its uses as Hopp & Spearman (2008) and Pound, Bell & Spearman (2014) give them (from knowledge; the 2014 book's framing confirmed in its publisher's description and secondary summaries, text not read — knowledge/SOURCES.md)
needs: []
next: [lean.value-stream-mapping, capacity.flow-benchmarks]
alternatives: []
related: [capacity.kingman-vut, lean.kanban-supermarket, cost.inventory-carrying-cost]
---
# WIP and lead time — Little's law

## Purpose and principle
In a steady system, average work in progress = throughput × average time in
the system. Count the WIP and know the throughput, and the lead time follows —
no stopwatch on every item.

## Questions it answers
How long does product sit in the hall? What would halving WIP do to lead time?

## Inputs and minimum conditions
WIP counts (a snapshot or several); throughput over the same period; a steady state.

## Procedure and calculation
- WIP = throughput × cycle time (L = λW): any one of the three from the other
  two, in consistent units — packs, packs a minute, minutes.
- Lead time = WIP ÷ throughput; the WIP a lead time needs = throughput × lead time.
- Over a whole line it holds for the line; over one station it holds for
  that station's queue and work (`capacity.kingman-vut` gives the queue).
- It holds for averages over a period in which what went in came out; a
  pile that grew or shrank over the period must be taken at its average, and
  the law read over a longer window.
- Factory Physics uses it three ways: to find a lead time from a WIP count
  (no stopwatch on every item); to set a WIP cap for a lead time
  (`capacity.flow-benchmarks` — the critical WIP is the least that keeps the
  bottleneck fed); and to turn a wait on a value stream map into pieces
  waiting (`cost.inventory-carrying-cost`).

## Assumptions, limits and misuse
Long-run averages in a stable system; a growing pile breaks it. Throughput
must be the rate *out* over the same window, in the same unit as the WIP.
The law says how long product waits, not why (`capacity.kingman-vut`) nor
whether the WIP is too much or too little (`capacity.flow-benchmarks`).

## Reading the result
"1,800 trays in the chiller at 600 an hour: 3 hours of lead time."

## When not to use it — and instead
Why the queue is long → `capacity.kingman-vut`.

## In food and FMCG manufacturing
Product waiting in chillers between cooking and packing — shelf life spent waiting.

## References
- [paper] Little, J.D.C. (1961), "A proof for the queuing formula L = λW", *Operations Research* 9(3), 383–387.
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., Waveland Press — Little's law and its uses (ch. 7). From knowledge.
- [textbook] Pound, E.S., Bell, J.H. and Spearman, M.L. (2014), *Factory Physics for Managers*, McGraw-Hill Education — Little's law as the first of its three key equations. Confirmed in the publisher's description, 24 October 2026; text not read.

## In Faultline
Not built as a tool of its own (FC-044). Used since 24 October inside the
value stream map's money: a wait on the map with no counted queue is turned
into pieces waiting by demand a day × the wait's share of the day
(`knowledge/specs/FC-001-value-stream-money.md`).
