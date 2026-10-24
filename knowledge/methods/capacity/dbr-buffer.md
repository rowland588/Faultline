---
id: capacity.dbr-buffer
name: Drum-buffer-rope — a time buffer in front of the constraint, and buffer management
aka: [DBR, drum buffer rope, constraint buffer, buffer management, red-amber-green buffer, buffer penetration, TOC scheduling]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — DBR and buffer management as Goldratt & Fox (*The Race*, 1986) and Schragenheim & Dettmer (*Manufacturing at Warp Speed*, 2000) give them (from knowledge); the zone arithmetic and the WIP implied worked in `scripts/knowledge/cases-capacity.py`
needs: [capacity.theory-of-constraints]
next: [planning.scheduling-rules]
alternatives: [lean.kanban-supermarket]
related: [capacity.littles-law, capacity.load-vs-demand, capacity.throughput-accounting]
---
# Drum-buffer-rope — a time buffer in front of the constraint, and buffer management

## Purpose and principle
The constraint is the drum: its schedule is the plant's schedule. A
buffer of *time* — work released far enough ahead that it waits in front
of the constraint — protects the drum from upstream disruption so it
never starves. The rope ties the release of work upstream to the drum's
pace: nothing is released earlier than the buffer says, so WIP does not
pile up. Buffer management then watches each job's place in the buffer:
green (plenty of time), amber (watch), red (expedite — it will be late
to the drum) — and the pattern of red penetrations says whether the
buffer is the right length.

## Questions it answers
- Which jobs are at risk of arriving late at the constraint — today's
  expediting list, with a reason?
- Is the buffer too long (everything green, WIP high) or too short
  (frequent reds)?
- What WIP does the buffer imply in front of the constraint?
- When should upstream release each job (the rope)?

## Inputs and minimum conditions
- The constraint identified (`capacity.theory-of-constraints`) and its
  schedule (the drum).
- The buffer length B in time (hours); the usual starting rule below.
- For each job: when it is due at the constraint and where it is now
  (released, at which upstream step).
- The constraint's rate, for the WIP implied.

## Procedure and calculation
- Buffer length to start: about half the current lead time from release
  to the constraint (Goldratt's rule of thumb); then tuned by the
  penetrations.
- Rope: release time = time due at the constraint − B; released earlier
  it only adds WIP, later it risks a hole in the drum.
- Buffer status of a job = time consumed ÷ B, where consumed = B −
  (time left until it is due at the constraint); zones: green under a
  third, amber a third to two-thirds, red above two-thirds (not yet
  arrived). Red → expedite upstream; a job in red that arrives in time
  is a near miss and counted.
- Tuning: red penetrations rare (under about 5–10% of jobs) and the
  buffer mostly green on arrival → shorten B by 10–20%; frequent reds and
  late arrivals → lengthen; the causes of the reds (which upstream step)
  are the improvement list.
- WIP implied in front of the constraint ≈ constraint rate × B (Little's
  law, `capacity.littles-law`) — the stock the buffer costs.
- Shipping buffer and assembly buffer by the same logic for the due date
  and the merge points (beyond this record).

**Worked case** (`cases-capacity.py`): a 6-hour constraint buffer. A job
due at the constraint in 4.5 h: 25% consumed → green. In 2.5 h: 58% →
amber. In 1 h and not yet arrived: 83% → red — expedite, and note which
upstream step held it. The rope releases each job 6 h before its drum
slot. The WIP implied at a 90/min constraint: 90 × 60 × 6 = 32,400 packs
waiting — which on a packing line with no room is the reason DBR's
buffer is usually *material staged*, not product queued.

## Assumptions, limits and misuse
- A buffer in units rather than time hides how long the drum is
  protected for; time is the measure.
- Expediting everything amber destroys the signal; red only.
- Tuning after a week of data is premature; a month of penetrations.
- The buffer protects against upstream *variation*; chronic upstream
  capacity shortage is a second constraint, not a buffer problem
  (`capacity.theory-of-constraints`).
- On a continuous packing line the "jobs" are the planned runs and the
  upstream steps are preparation (materials, changeover kit, product
  from process); DBR there is a materials-and-readiness buffer more than
  a WIP queue.
- Kanban pulls with a stock cap and no explicit constraint; DBR
  schedules the constraint and ropes release to it — different tools,
  not rivals (`lean.kanban-supermarket`).

## Reading the result
"Three runs in red for tomorrow's drum: the 2 kg film reel is not on
site (buffer 83% consumed) — expedite the delivery; the other two wait
on process. Reds were 12% of runs this month: the buffer is too short or
goods-in is the problem." Money: a hole in the drum costs the
constraint's minutes × T per minute (`capacity.throughput-accounting`,
`knowledge/MONEY.md` T); the buffer's WIP costs its carrying
(`cost.inventory-carrying-cost`).

## When not to use it — and instead
Finding the constraint → `capacity.theory-of-constraints`. Pull between
steps with a stock cap → `lean.kanban-supermarket`. The order of jobs on
the drum → `planning.scheduling-rules`, `capacity.throughput-accounting`.
The WIP arithmetic → `capacity.littles-law`.

## In food and FMCG manufacturing
The packing line as the drum with process (cooking, mixing, slicing) and
materials (film, trays, labels) upstream — the buffer is "everything the
run needs, staged B hours ahead"; a bakery's oven as the drum with mixing
and proving roped to it; a slicing line fed from a cold store.

## References
- [textbook] Goldratt, E.M. and Fox, R.E., *The Race*, North River Press, 1986 — drum-buffer-rope (from knowledge).
- [textbook] Schragenheim, E. and Dettmer, H.W., *Manufacturing at Warp Speed*, St. Lucie Press, 2000 — buffer management, the zones, simplified DBR (from knowledge).
- [textbook] Cox, J.F. and Schleier, J.G. (eds.), *Theory of Constraints Handbook*, McGraw-Hill, 2010, ch. 8–9 (from knowledge).

## In Faultline
Not built (FC-043). The stage gate's Materials page already shows what
each run waits on with its day (`src/project`); FC-043 would set a
buffer in hours before each planned run on the constraint line, colour
each run's readiness by its penetration, list the reds with their
cause, and count the penetrations to tune the buffer.
