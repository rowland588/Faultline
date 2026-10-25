---
id: ie.person-machine
name: One person, several machines — the person–machine chart and how many to tend
aka: [man-machine chart, multiple activity chart, machine interference, synchronous servicing, machines per operator, worker-machine analysis]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the multiple-activity chart and synchronous servicing (N′ = (l + m)/(l + w)) as Freivalds & Niebel ch. 2 and the ILO text give them, and the cost comparison as Niebel sets it (from knowledge); the worked case computed in `scripts/knowledge/cases-ie.py`
needs: [ie.time-study]
next: [capacity.line-balancing]
alternatives: [lean.standard-work]
related: [capacity.line-capacity, ie.labour-productivity, planning.crew-planning]
---
# One person, several machines — the person–machine chart and how many to tend

## Purpose and principle
When a person loads a machine and then waits for it, the waiting is
capacity to spend on another machine; when they tend too many, the
machines wait for them. The person–machine chart draws both on one time
scale — the person's work, the machine's run, each one's idle — and the
synchronous-servicing formula says how many identical machines one
person can tend before the machines start to queue: N′ = (l + m)/(l + w),
with l the loading and unloading time, m the machine's unattended run,
w the walk between machines. Below N′ the person waits; above it the
machines do; the cost of each decides which to accept.

## Questions it answers
- How many of these machines can one person tend?
- Who waits, and for how long a cycle — the person or the machines?
- Which is cheaper: an idle operator or idle machines (the cost per
  machine-cycle)?
- Where in the cycle is the person's free time, and what else could go
  there?

## Inputs and minimum conditions
- Per machine: the person's load/unload time l (timed, `ie.time-study`),
  the machine's unattended run m, the walk w between machines (`ergonomics.layout-from-to`
  for the distances).
- The operator's and the machine's hourly costs (`knowledge/MONEY.md` §3
  for the person; the machine's rate from depreciation and energy, or its
  lost contribution if it is the bottleneck).
- For random servicing (stops at random, not a fixed cycle) the stop
  rate and attention time — a queueing problem (`capacity.kingman-vut`).

## Procedure and calculation
- The chart: a column per actor (the person, each machine), time down
  the page, bars for working / running / idle; the cycle is the longest
  column's repeat.
- Synchronous servicing: N′ = (l + m)/(l + w) machines (ideal; usually
  not an integer, so the choice is between the integers either side).
- With n machines: cycle time = max(l + m, n·(l + w)); if n ≤ N′ the
  cycle is l + m and the person is idle (l + m) − n(l + w) per cycle; if
  n > N′ the cycle is n(l + w) and each machine waits n(l + w) − (l + m).
- Output per hour = n × 60 ÷ cycle (cycles per machine per hour × n).
- Cost per machine-cycle = (operator rate + n × machine rate)/60 ×
  cycle ÷ n; pick the n with the lower cost (Niebel's rule) — or the
  higher output if the machines are the bottleneck.
- Random servicing (machines stopping unpredictably): the expected
  machine waiting from the binomial (Niebel's tables) or a simulation
  (`capacity.simulation`); the chart still shows the shape.
- Different machines: the chart alone (no single formula); the person's
  busy time Σ(lᵢ + wᵢ) against the shortest machine cycle.

**Worked case** (`cases-ie.py`): l = 1.2 min, m = 6.0 min, w = 0.3 min:
N′ = 7.2/1.5 = 4.8. Four machines: cycle 7.2 min, 33.3 machine-cycles an
hour, the operator idle 1.2 min a cycle, the machines never wait. Five:
cycle 7.5 min, 40 cycles an hour (+20%), the operator never idle, each
machine waits 0.3 min a cycle. At £20/h for the operator and £35/h per
machine the cost per machine-cycle is £4.80 with four and £4.88 with
five — four is marginally cheaper per cycle; but if the machines are the
bottleneck the fifth's 20% more output decides it, and the money says so.

## Assumptions, limits and misuse
- The formula assumes a fixed cycle and identical machines; real stops
  are random and the person then has queueing waits the formula misses
  (random servicing, or simulate).
- l must include every attention the machine needs per cycle (checks,
  minor adjustments), not only load/unload, or N′ is too high.
- The walk w is the real walk in the real layout; a re-layout changes
  the answer (`ergonomics.layout-from-to`).
- Idle operator time is not waste if it holds the quality checks and the
  autonomous-maintenance checks (`maintenance.autonomous-maintenance`) —
  put them on the chart.
- Loading one person with N′ + 1 machines "to keep them busy" moves the
  waiting to the machines; if those are the bottleneck it costs output,
  not labour.

## Reading the result
"One operator can tend 4.8 of these depositors: with 4 they wait 1.2 min
a cycle, with 5 the machines wait 0.3 min each and make 20% more. Per
cycle 4 is 8p cheaper; if the depositors are the bottleneck, 5 earns
more than it costs." Money: cost per machine-cycle both ways
(`knowledge/MONEY.md`, L for the person, M for the machine) and, at the
bottleneck, the extra output × margin a pack (T).

## When not to use it — and instead
Balancing people along a flow line → `capacity.line-balancing`. A
person's standard work on one station → `lean.standard-work`. Random
stops and queues → `capacity.kingman-vut`, `capacity.simulation`. The
crew for a plan → `planning.crew-planning`.

## In food and FMCG manufacturing
One operator tending several depositors, fryers, or vacuum packers; a
packer running two flow-wrappers; a technician covering several
checkweighers' checks; a CIP operator across circuits — wherever one
person loads and the machine then runs on its own.

## References
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., McGraw-Hill, 2014, ch. 2 — worker and machine process charts, multiple activity charts, synchronous and random servicing (from knowledge).
- [textbook] Kanawaty, G. (ed.), *Introduction to Work Study*, 4th ed., ILO, 1992 — the multiple activity chart (from knowledge).

## In Faultline
Built (25 October, FC-026 and FC-007, `knowledge/specs/FC-032-line-balance.md`): a step of kind **Machine** on the
Line balance, and the **Person and machine** lens — each person's steps and the machine's run on one time scale against
takt, who waits for whom and what the waiting costs, and for a person with a load, a run and a walk, N′ = (l + m) ÷
(l + w), the rows for each number of machines (cycle, an hour, idle, each machine's wait, the cost a machine-cycle with
the operator's rate and the machine's typed rate) and the sentence for the integers either side. Synchronous servicing
only; random stops are said not to be in it.
