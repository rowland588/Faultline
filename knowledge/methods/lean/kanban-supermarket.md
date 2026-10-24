---
id: lean.kanban-supermarket
name: Kanban, supermarkets and FIFO lanes — sizing pull
aka: [kanban sizing, number of kanbans, supermarket sizing, FIFO lane, pull system, two-bin]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the Toyota kanban formula as Monden gives it (N = D·L·(1+α)/C) and the supermarket and FIFO lane as Smalley (2004); the WIP identity by Little's law (`capacity.littles-law`); from knowledge, texts not re-read; the worked loop in `scripts/knowledge/cases-lean.py`
needs: [lean.value-stream-mapping]
next: [lean.heijunka-epei]
alternatives: [planning.safety-stock]
related: [capacity.littles-law, capacity.accumulation-buffer, planning.lot-sizing]
---
# Kanban, supermarkets and FIFO lanes — sizing pull

## Purpose and principle
Where two processes cannot flow one piece at a time — different rates,
a changeover between them, a distance — the downstream one pulls from a
fixed stock (the supermarket) and the upstream one makes only what was
taken, told by a card (the kanban) that travels with the container.
Where the processes must keep the order of work but run at different
paces, a FIFO lane with a maximum holds the work between them, and the
upstream process stops when the lane is full. Both are sized by
arithmetic, not habit: the number of kanbans in a loop covers the demand
over the replenishment lead time plus a safety margin, in containers;
the lane's maximum covers the longest wait allowed. The sizing is
Little's law with a margin.

## Questions it answers
- How many containers (kanbans) belong in this loop, and how big is the
  supermarket?
- How long is the FIFO lane between these two processes?
- How much stock does the loop carry, and what cuts it (lead time,
  container size)?
- Is the loop running to its size — cards missing, the supermarket over
  its maximum, the lane full?

## Inputs and minimum conditions
- Demand D in units per unit of time (levelled — `lean.heijunka-epei`).
- Replenishment lead time L: from a card being freed to the container
  back on the shelf — the waiting to be collected, the queue upstream,
  the changeover, the run, the transport.
- Container quantity C and a safety factor α (10–20% is usual, chosen
  for the variability seen, or from `planning.safety-stock`'s method
  where the data exist).
- For a FIFO lane: the downstream rate and the longest wait allowed
  (by shelf life or by the agreed buffer).

## Procedure and calculation
- Kanbans N = D × L × (1 + α) ÷ C, rounded up; supermarket maximum =
  N × C units.
- WIP in the loop before safety = D × L (Little's law —
  `capacity.littles-law`); the safety margin is the only stock above the
  law's.
- To cut the stock: cut L (the queue upstream, the changeover —
  `changeover.smed`), cut C, or level D; α last.
- FIFO lane maximum = downstream rate × the longest allowed wait (or
  the upstream batch size, whichever governs); the lane's fill is the
  visual signal to stop or to help.
- Running: cards against the count (a lost card is a shortage waiting);
  the supermarket's fill plotted; stock-outs and over-maximum events
  counted.
- Two-bin for consumables (film, labels): the bin size is the same
  arithmetic with C = one bin and N = 2 → bin = D × L × (1 + α).

**Worked case** (`cases-lean.py`): trays feeding a packing line at 1,500
a shift — 200 an hour. Replenishment from the tray-forming cell takes
2.0 h (wait, run, transport); α 0.15; a crate holds 60. N = 200 × 2.0 ×
1.15 ÷ 60 = 460 ÷ 60 = 7.7 → 8 kanbans; the supermarket holds at most
480 trays. Little's law says 400 trays are in the loop before safety —
cut the lead time to 1 h and the loop halves. The FIFO lane between the
oven and packing, where product may wait at most 30 minutes: 200 × 0.5 =
100 trays maximum.

## Assumptions, limits and misuse
- The formula assumes levelled, stable demand; with big swings the loop
  starves or overflows — level first, or size α from the measured
  variability.
- L must include the waiting to be collected and the queue at the
  supplier; a lead time taken as the run time alone under-sizes the
  loop.
- Short-life product cannot sit in a supermarket beyond its life; the
  FIFO lane's maximum is set by the life.
- Adding kanbans whenever there is a shortage hides the cause; the
  shortage's cause (a long changeover, a lost card) is the work.
- A supermarket is not a warehouse: a fixed maximum, a visible fill, a
  card per container.

## Reading the result
"8 crates in the tray loop — a supermarket of at most 480; the loop
carries 400 trays because replenishment takes 2 hours. Halve that and
the loop carries 200." Money: the stock in the loop (`knowledge/MONEY.md`,
H — the carrying cost `cost.inventory-carrying-cost` prices) and the
stock-outs the loop prevents (T at the bottleneck).

## When not to use it — and instead
Purchased materials with long, variable lead times →
`planning.safety-stock`. The cost trade of batch size →
`planning.lot-sizing`. The buffer between machines on one line (minutes
of accumulation) → `capacity.accumulation-buffer`. The levelled demand
the loop needs → `lean.heijunka-epei`.

## In food and FMCG manufacturing
Packaging film and cases at the line (two-bin); ingredient pre-weighs
feeding mixers; trays and crates between forming and packing; the FIFO
lane between an oven and a cooler, sized by the product's safe wait.

## References
- [textbook] Monden, Y. (2012), *Toyota Production System*, 4th ed., CRC Press — the kanban formula (from knowledge).
- [textbook] Smalley, A. (2004), *Creating Level Pull*, LEI — supermarkets, FIFO lanes and sizing (from knowledge).
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed. — CONWIP and the WIP–throughput relation (from knowledge).

## In Faultline
Not built (FC-009 the sizing as a line's standard, FC-010 the loop
running on the value stream). The value stream map carries the stock
between steps (`src/tools/valuestream`); FC-009 would size each loop
from the map's demand and lead time and say the supermarket's maximum,
FC-010 count the cards and the fill against it.
