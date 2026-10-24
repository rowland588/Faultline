---
id: capacity.flow-benchmarks
name: What flow can be — best case, worst case and the practical worst case; critical WIP
aka: [Factory Physics benchmarks, best case performance, worst case performance, practical worst case, critical WIP, W0, bottleneck rate, raw process time, internal benchmarking]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the three cases and critical WIP as Hopp & Spearman (Factory Physics, 3rd ed. 2008, ch. 7 "Basic Factory Dynamics") give them, from knowledge; the formulas confirmed on 24 October against lecture material taken from the first edition (Texas A&M INEN 220 handout) and copies of the text found online; the laws' wording as commonly quoted — see knowledge/SOURCES.md. Pound, Bell & Spearman (2014) restate them for managers; its chapter list confirmed online, its text not read
needs: [capacity.littles-law, capacity.line-capacity]
next: [capacity.kingman-vut, capacity.accumulation-buffer]
alternatives: [capacity.simulation]
related: [capacity.theory-of-constraints, capacity.three-capacities]
---
# What flow can be — best case, worst case and the practical worst case

## Purpose and principle
A line is a set of stations product flows through. Two numbers describe it
whatever the stations are: the **bottleneck rate** r_b (the rate of the
station with the highest utilisation — packs a minute the line can never
beat) and the **raw process time** T_0 (the sum of the stations' mean
process times — the shortest time one pack could take with nothing waiting).
Their product is the **critical WIP**, W_0 = r_b × T_0: the least work in
progress at which a line with no variability runs at full rate with no
queue. Against these, Factory Physics (Hopp & Spearman) sets three
benchmarks for how throughput and cycle time move with the WIP w held in
the line — the best a line can do, the worst, and the "practical worst case"
that a real, moderately variable line sits near. They are *internal*
benchmarks: a line is measured against what its own stations could do, not
against another factory.

## Questions it answers
How far is this line from the best its machines allow? Is its WIP above or
below the critical WIP — is it starved, or is it queueing? If the WIP were
capped, what throughput and lead time would follow? Is the line behaving
like a well-run line (near the practical worst case or better) or worse than
that (batching, long stops)?

## Inputs and minimum conditions
Each station's mean effective process time a pack (its cycle time or
1 ÷ its rate, in one unit); the WIP in the line (counted on a walk, or from
Little's law); throughput over the same period. A line with one bottleneck;
process times in the same unit down the line (`capacity.line-capacity` does
the conversion).

## Procedure and calculation
With w the WIP held in the line (packs, trays — one unit):
- r_b = the highest station utilisation's rate; T_0 = Σ mean process times;
  W_0 = r_b × T_0.
- **Best case** (no variability): CT = T_0 and TH = w ÷ T_0 while w ≤ W_0;
  beyond it CT = w ÷ r_b and TH = r_b. The corner is W_0.
- **Worst case** (everything moves in one batch): CT = w × T_0 and
  TH = 1 ÷ T_0, whatever w.
- **Practical worst case** (single-machine stations, a balanced line,
  moderately high — exponential — variability): CT = T_0 + (w − 1) ÷ r_b and
  TH = w ÷ (W_0 + w − 1) × r_b.
- Little's law ties the two: TH = w ÷ CT at every w.
- Read the line against them: a measured (TH, CT) point better than the
  practical worst case is a well-behaved line; worse than it says
  variability or batching worth hunting (Hopp & Spearman: "if a line is
  performing worse than the PWC, it has significant room to improve").

The laws these rest on, as the book states them (wording from knowledge,
checked against secondary quotations): *Little's law* — WIP = TH × CT;
*Capacity* — in steady state a plant releases work at an average rate
strictly less than its average capacity; *Conservation of material* — over
the long run the rate out equals the rate in, less yield loss, plus any
parts made within; *Variability* — increasing variability always degrades
performance; *Utilisation* — raise a station's utilisation with nothing else
changed and WIP and lead time rise in a highly non-linear way; *Variability
buffering* — variability is buffered by some combination of inventory,
capacity and time (`capacity.kingman-vut`).

## Assumptions, limits and misuse
- The practical worst case assumes exponential process times and a balanced
  line; a line with long infrequent stops can be worse than it, a line with
  steady machines better. It is a yardstick, not a forecast.
- r_b and T_0 must be in one unit; a station with several parallel machines
  has the rate of all of them together.
- Capping WIP below W_0 trades throughput for lead time knowingly; the
  benchmark says how much. Capping at W_0 exactly only works with no
  variability.
- The cases say nothing about *where* the WIP should sit — that is
  `capacity.accumulation-buffer` and `capacity.dbr-buffer`.

## Reading the result
"The line's bottleneck is the flow wrapper at 120 a minute; raw process time
4.5 minutes, so the critical WIP is 540 packs. We counted 1,900 packs
between the depositor and the case packer — three and a half times W_0 —
and the line still makes 104 a minute. On the practical worst case 1,900
packs should give 117 a minute, so this line is doing worse than a
moderately variable line should: the stops on the wrapper, not the WIP, are
what hold it."

## When not to use it — and instead
Why a queue forms at one station → `capacity.kingman-vut`. Which station is
the constraint and what a lost minute there costs → `capacity.line-capacity`,
`capacity.theory-of-constraints`. Several interacting stations with real
stop patterns → `capacity.simulation`.

## In food and FMCG manufacturing
Chilled lines run with little WIP by design (shelf life), so they sit near
the critical WIP and starve easily; a conveyor-linked packing line's WIP is
its accumulation, and W_0 says how much is enough. Cook–chill lines with
trolleys between cook and pack hold WIP far above W_0, and the benchmark
shows how much lead time (and life) that buys nothing.

## References
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., Waveland Press (McGraw-Hill 2000 2nd ed.) — ch. 7 Basic Factory Dynamics: r_b, T_0, W_0, the three cases; ch. 8–9 the variability laws. From knowledge; formulas confirmed against online lecture material taken from the text, 24 October 2026.
- [textbook] Pound, E.S., Bell, J.H. and Spearman, M.L. (2014), *Factory Physics for Managers*, McGraw-Hill Education — the same science for leaders (Little's law, the VUT equation, buffers); chapter list confirmed online, text not read.
- [paper] Spearman, M.L. (2014), "Of physics and Factory Physics", *Production and Operations Management* 23(11).
- [paper] Little, J.D.C. (1961), "A proof for the queuing formula L = λW", *Operations Research* 9(3), 383–387.

## In Faultline
Not built. Line capacity already holds every station's rate in one unit and
names the bottleneck, so r_b and T_0 are a sum away; the WIP would be counted
on the bottleneck walk. Added 24 October from the books Rowland gave
(`knowledge/SOURCES.md`).
