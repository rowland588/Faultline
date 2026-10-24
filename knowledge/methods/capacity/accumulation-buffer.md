---
id: capacity.accumulation-buffer
name: Accumulation between machines — how long a buffer holds, how fast it refills, what a stop costs through it
aka: [accumulation, accumulator, buffer conveyor, buffer sizing, line decoupling, starve and block, buffer time]
discipline: capacity
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — packaging-line practice as `docs/CAPACITY.md` §4 records it (the V-curve sources it cites) and as EN 415-11's efficiency model treats accumulation (scope confirmed online 22 Oct 2026; text not read); the worked case computed in `scripts/knowledge/cases-capacity.py`
needs: [capacity.v-curve]
next: [capacity.simulation]
alternatives: []
related: [capacity.kingman-vut, capacity.line-capacity, equipment.short-stops-speed]
---
# Accumulation between machines — how long a buffer holds, how fast it refills, what a stop costs through it

## Purpose and principle
On an accumulation line the machines either side of the critical one
run faster than it (the V-curve), and the conveyors between them hold
product so that a short stop upstream does not starve the critical
machine and a short stop downstream does not block it. A buffer adds no
speed; it buys time. Its arithmetic is three numbers — how long it
covers a stop, how long it takes to come back, and what a stop longer
than its cover costs at the bottleneck — and they say whether a buffer
is the right size for the stops the line actually has.

## Questions it answers
- How long can the filler stop before the bagger starves (the cover)?
- After the bagger ran the buffer down, how long until it is full again
  (the recovery)?
- Which stops cost the line output and which are absorbed?
- How big should the buffer be for the stops this machine has?

## Inputs and minimum conditions
- The critical machine's rate r_c and each neighbour's rate r_n
  (`capacity.v-curve`, Line capacity), in the same unit.
- Each buffer's capacity A in units (packs, trays) — measured, from the
  conveyor's length and the pack's pitch, or counted full.
- The stops of the neighbours: their lengths (the loss count's timed
  stops, `equipment.downtime-log`), to size against.

## Procedure and calculation
- **Cover** (an upstream stop; the buffer full before it): the critical
  machine runs on for A ÷ r_c minutes; a stop shorter than that costs
  nothing at the bottleneck. (A downstream stop with the buffer empty
  before it: the upstream machine runs on for A ÷ r_n before it blocks.)
- **Recovery** after the buffer was run down: it refills at the speed
  difference, A ÷ (r_n − r_c) minutes — the V-curve's margin is what
  buys recovery; a 10% margin refills a 600-pack buffer in an hour, a
  25% margin in 27 minutes.
- **What a longer stop costs**: a stop of t minutes with cover c starves
  the critical machine for (t − c) minutes → (t − c) × r_c packs not
  made, × margin a pack (`knowledge/MONEY.md`, T) — the only place a
  neighbour's stop reaches the money.
- **Sizing**: the buffer that covers the neighbour's usual long stop —
  the 90th percentile of its stop lengths (from the log) × r_c, or its
  MTTR plus a margin; then check the recovery is shorter than the usual
  gap between stops (MTBF), or the buffer never refills before the next
  stop.
- Two stops close together: the second meets a part-empty buffer; the
  cover is A_remaining ÷ r_c — why the recovery time matters as much as
  the cover.
- Along a line: each buffer worked out both ways (starve and block); the
  smallest cover against its neighbour's stops is the weak point.

**Worked case** (`cases-capacity.py`): a filler at 100/min feeding a
bagger (critical) at 90/min through a 600-pack accumulator. Cover: a
filler stop under 600 ÷ 90 = 6.7 min costs nothing. Recovery: at the
10/min difference the 600 packs come back in 60 min — the 11% margin is
thin. The bagger stops 5 min: the accumulator fills in 6 min, so the
filler is not blocked. The filler stops 12 min: the bagger starves 5.3 min
— 480 packs not made at the bottleneck, × margin a pack. To cover the
filler's usual 10-minute stop the buffer would need 900 packs — or the
filler's stops need shortening (`equipment.short-stops-speed`).

## Assumptions, limits and misuse
- A buffer sized for the average stop is too small for the long ones
  that cost the output; the distribution's upper tail is the input.
- Recovery longer than the gap between stops means the buffer is
  effectively never full; the margin, not the buffer, is the fix.
- Rates are the running rates (plate speed at the neighbours, the
  standard at the critical machine), not nameplate.
- Product that cannot wait (a hot bake, a chilled product's dwell) has a
  maximum buffer time regardless of the arithmetic.
- Accumulation hides upstream stops from the output figures; the loss
  count still records them.
- A buffer's capacity in packs changes with pack size; per product.

## Reading the result
"The accumulator covers a filler stop of 6.7 minutes; it takes an hour
to refill. The filler stopped 12 minutes on Tuesday: the bagger starved
for 5 — 480 packs, £X. To cover its usual 10-minute stop the buffer
would need 900 packs, or the filler's stops need to come down." Money:
the starved minutes at the bottleneck × packs × margin (`knowledge/MONEY.md`, T).

## When not to use it — and instead
The rates and the margin themselves → `capacity.v-curve`, `capacity.line-capacity`.
Random stops and queues in general → `capacity.kingman-vut`. Many buffers
and random stops together → `capacity.simulation`. The stops' lengths →
`equipment.downtime-log`, `equipment.short-stops-speed`.

## In food and FMCG manufacturing
Filler → accumulator → bagger; oven → cooling conveyor → slicer; bagger
→ accumulation table → case packer; the accumulation tables and spiral
conveyors on every high-speed line, usually sized by the OEM for a stop
pattern nobody measured.

## References
- [standard] EN 415-11:2021 — efficiency and availability of packaging lines: accumulation's place in the line model (scope confirmed online 22 Oct 2026; text not read).
- [practice] V-curve and accumulation practice as `docs/CAPACITY.md` §4 cites it (Foodmach, LineView, Packaging magazine articles — from knowledge, read online 10–13 October).
- [textbook] Hopp, W.J. and Spearman, M.L., *Factory Physics*, 3rd ed., Waveland, 2011, ch. 8–9 — buffers, blocking and starving (from knowledge).

## In Faultline
Noted in Line capacity (`src/tools/linework` holds the capacity model;
the accumulation note in its sheet) but not driven by an acceptance check
(FC-046, partly). The piece to build: a buffer's capacity typed on the
line between two stations, the cover and recovery said from the V-curve's
rates, and each timed stop of a neighbour read through it to say whether
it cost the bottleneck — in packs and money, on the loss count.
