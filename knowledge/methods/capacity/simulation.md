---
id: capacity.simulation
name: Simulating a line — stops, buffers and output over many runs
aka: [discrete-event simulation, Monte Carlo line model, line simulation, what-if simulation, DES]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — simulation method and its output analysis as Law's *Simulation Modeling and Analysis* (5th ed. 2015) gives them (from knowledge); the time-stepped two-station model with random stops and its forty-run outputs computed in `scripts/knowledge/cases-capacity.py` — the shape of the method, not a validated model of any line
needs: [capacity.line-capacity, maintenance.mtbf-failure-rate, maintenance.mttr-availability]
next: []
alternatives: [capacity.kingman-vut]
related: [capacity.accumulation-buffer, capacity.v-curve, stats.sample-size-power]
---
# Simulating a line — stops, buffers and output over many runs

## Purpose and principle
When several machines stop at random, with buffers between them, no
formula gives the line's output exactly: a stop here is absorbed, the
next is not, the buffer is half full when the third comes. Simulation
builds the line in software — each machine's rate, its stops drawn from
its MTBF and MTTR, each buffer's capacity — runs a shift many times and
reads the output's mean and spread. It answers "what if the buffer were
twice the size" or "what if the filler's stops halved" before the money
is spent. It is the last resort, after the V-curve, Kingman and the
buffer arithmetic have said what they can, because it needs inputs the
floor rarely has measured — the repair times especially.

## Questions it answers
- What output a shift does this line give with these stops and buffers,
  and how much does it vary?
- Which change buys most output: a bigger buffer, a faster neighbour,
  fewer stops at one machine, shorter repairs?
- Where does the line lose most to blocking and starving?

## Inputs and minimum conditions
- Per machine: its rate; its stops as a distribution — MTBF and MTTR
  (`maintenance.mtbf-failure-rate`, `maintenance.mttr-availability`)
  with their shapes (exponential gaps are the usual first assumption;
  repair times lean long — lognormal fits them better) — from the loss
  count's timed stops, at least 30 stops a machine.
- Per buffer: its capacity (`capacity.accumulation-buffer`).
- The shift's length and the product's rates; the number of runs for
  the precision wanted (`stats.sample-size-power` on the output's
  spread).

## Procedure and calculation
- Time-stepped (a minute, a second) or event-driven (the next stop, the
  next repair end): each step, each machine runs if up and neither
  starved (empty buffer behind) nor blocked (full buffer ahead); stops
  drawn from the machine's gap distribution, their length from its
  repair distribution; buffers filled and drained by the rates; output
  counted at the last machine.
- Many runs (replications) with different random seeds; the output's
  mean, standard deviation and a confidence interval on the mean
  (t·s/√n); the ceiling (no stops) for comparison.
- Warm-up: the first minutes start with empty buffers; either start
  full/half or discard the warm-up.
- Validation before any what-if: the model's output and stop minutes
  against the real shift's (the loss count); a model that does not
  reproduce last week is not to be trusted about next year.
- What-ifs: one change at a time (a buffer's size, a machine's MTBF,
  the V margin), each many runs, the difference read with its interval
  — two what-ifs whose intervals overlap are not told apart.
- Blocking and starving minutes per machine, as outputs — the line's
  own waterfall from the model.

**Worked case** (`cases-capacity.py`, the shape of the method): two
stations — a filler at 100/min (stops every 60 min on average, 4 min to
fix) feeding a bagger at 90/min (every 90 min, 6 min) — through a buffer,
a 480-minute shift, forty runs each. No buffer: nothing moves in this
simple model (the filler cannot pass to a stopped bagger — a degenerate
case that says the model needs a minimum buffer). A 300-pack buffer:
39,700 ± 2,000 a shift; 600: 40,900 ± 900; 1,200: 40,800 ± 1,200 —
against a no-stop ceiling of 43,200. Doubling the buffer from 300 to 600
buys about 1,200 packs a shift and halves the spread; doubling again
buys nothing the forty runs can see. That is the answer a buffer
purchase needs, and the shape of how it is found.

## Assumptions, limits and misuse
- Garbage in: exponential repair times when the real ones are
  lognormal with a long tail understate the starving; the stop log's
  shape is the input, not a textbook default.
- One run is an anecdote; the mean over many runs with its interval is
  the result.
- An unvalidated model is a drawing; validate against a real week first.
- Over-detail (every sensor, every operator) costs weeks and adds
  nothing to a buffer decision; the model is as simple as the question.
- The what-if's gain is read against its interval; a 300-pack gain with
  a ±900 interval is noise.
- Simulation is for the questions the formulas cannot answer; the
  V-curve and Kingman come first and are usually enough.

## Reading the result
"With the stops we have, the line makes about 40,900 a shift (±900)
with the 600-pack buffer; doubling it buys nothing we can measure;
halving the filler's stops buys about 1,100 a shift." Money: the
output difference × margin a pack per shift, scaled to the week
(`knowledge/MONEY.md`, T), against the change's cost — the case for the
buffer, the fix or neither.

## When not to use it — and instead
One buffer's cover and recovery → `capacity.accumulation-buffer`. A
station's queue and the effect of variability → `capacity.kingman-vut`.
The rates and the bottleneck → `capacity.v-curve`, `capacity.line-capacity`.

## In food and FMCG manufacturing
The accumulation decision on a new or re-laid line; whether a second
case packer or a bigger table pays; the effect of a slicer's stops on a
bagger's output; a chilled line where the maximum dwell bounds the
buffer.

## References
- [textbook] Law, A.M., *Simulation Modeling and Analysis*, 5th ed., McGraw-Hill, 2015 — model building, input distributions, output analysis and validation (from knowledge).
- [textbook] Hopp, W.J. and Spearman, M.L., *Factory Physics*, 3rd ed., 2011 — when simulation is needed beyond the formulas (from knowledge).
- [textbook] Banks, J., Carson, J.S., Nelson, B.L. and Nicol, D.M., *Discrete-Event System Simulation*, 5th ed., Pearson, 2010 (from knowledge).

## In Faultline
Research first (FC-047): it needs repair-time distributions the loss
count does not yet keep (the stops' lengths exist; their shape per
machine is the missing read) and a design that stays simple — the two-
station model above with the line's own machines, buffers and stop
distributions, forty runs, the mean with its interval, and one what-if
at a time. Not built until the inputs exist and Rowland says go.
