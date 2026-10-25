---
id: capacity.simulation
name: Simulating a line — stops, buffers and output over many runs
aka: [discrete-event simulation, Monte Carlo line model, line simulation, what-if simulation, DES, serial line with finite buffers, continuous material model]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-25 — RESEARCHED for FC-047. Read this session (web SEARCH excerpts only — the container refuses itl.nist.gov, Wikipedia, publishers, journals and library catalogues; no page body was fetched): the MIT 2.852 Manufacturing Systems Analysis course outline (lectures 6–9: transfer lines, two-machine lines, deterministic, exponential and continuous lines) and a course-note excerpt giving Buzacott's no-buffer line P = 1/(1 + Σ pᵢ/rᵢ); a survey excerpt naming Buzacott, Gershwin & Berman, Wijngaard and others as having solved two-stage lines with an interstage buffer; abstracts of Hu & Meerkov (2006, lean buffering, Bernoulli machines, closed form and recursion), Jia et al. (2016), Kouikoglou's event-driven models and Heshmat et al. (2017, fitting uptime and downtime distributions to a year of breakdowns); the bibliographic record of Conway, Maxwell, McClain & Thomas (1988). NOT read: any of those papers' bodies, Gershwin's Manufacturing Systems Engineering, Law, Banks et al., Hopp & Spearman. The method, its model choices and every number below are Faultline's own and are computed independently in `knowledge/research/cases-research-2-simulation.py` — closed forms, an exact Markov-chain solution of the same line, a Gillespie check of that chain, and a simulator of the shape the app would hold (35 checks, all passing). The earlier forty-run worked case did not survive this check and is replaced
needs: [capacity.line-capacity, maintenance.mtbf-failure-rate, maintenance.mttr-availability]
next: []
alternatives: [capacity.kingman-vut]
related: [capacity.accumulation-buffer, capacity.v-curve, stats.sample-size-power, stats.distribution-fitting, equipment.time-model-losses]
---
# Simulating a line — stops, buffers and output over many runs

## Purpose and principle
When several machines stop at random, with buffers between them, no
simple formula gives the line's output exactly: a stop here is absorbed,
the next is not, the buffer is half full when the third comes. Simulation
builds the line in software — each machine's rate, its stops drawn from
its MTBF and MTTR, each buffer's capacity — runs a shift many times and
reads the output's mean and spread. It answers "what if the buffer were
twice the size" or "what if the filler's stops halved" before the money
is spent. It is the last resort, after the V-curve, Kingman and the
buffer arithmetic have said what they can, because it needs inputs the
floor rarely has measured — the repair times especially.

**What the research found (25 October 2026).**
- *Serial lines with finite buffers are a studied problem with a public
  literature.* Two-machine, one-buffer lines have been solved exactly under
  several assumptions (the survey and course excerpts name Buzacott, Gershwin
  and Berman, Wijngaard; discrete-time and continuous-flow models);
  longer lines have no exact solution and are approximated (decomposition) or
  simulated. A line with no buffer has a closed form (Buzacott's, in the
  course excerpt, for failures that occur only while operating).
- *So the simulator is checkable.* Its two-machine answers can be compared with
  an exact solution and with closed-form limits, and its three-machine answers
  with an exact solution of a related model — done here (below).
- *A simulator is justified by three things the formulas do not give:* lines
  of three or more machines; a **shift** with its start-up (the steady-state
  answer overstates a shift that begins with empty buffers); and repair times
  that are not exponential.
- *The inputs, not the runs, decide how good the answer is.* With 30 stops
  measured on each machine, not knowing MTBF and MTTR moves the shift's average
  by about 2,300 packs (90% range) — sixteen times the simulator's own
  ±75 — so more runs cannot buy it back.

## Questions it answers
- What output a shift does this line give with these stops and buffers,
  and how much does it vary?
- Which change buys most output: a bigger buffer, a faster neighbour,
  fewer stops at one machine, shorter repairs?
- Where does the line lose most to blocking and starving?
- How much of that is the stops, and how much is that the stops were only
  measured 30 times?

## Inputs and minimum conditions
- Per machine: its running rate (plate speed; Line capacity's); its stops as a
  distribution — MTBF and MTTR (`maintenance.mtbf-failure-rate`,
  `maintenance.mttr-availability`) from the reliability study and the loss
  count's timed stops, **at least 30 stops a machine** (more for a tail).
  Exponential gaps are the usual first assumption; repair times lean long and
  the stop log's own shape (resampled) is better than a textbook default.
- **A definition, said on screen:** whether MTBF is counted on the clock
  (a machine can stop while it waits starved or blocked) or only while it is
  running. The reliability tool's watch is stopped and started by a person;
  the simulator must be told which it is, and this research chose the clock
  (time-dependent failures) because it matches a stop timed on a wall clock —
  a Faultline decision, open in `knowledge/GAPS.md`.
- Per buffer: its capacity in packs (`capacity.accumulation-buffer`). A line
  with *no* buffer is a direct hand-over (the machines move together), not a
  buffer of zero packs.
- The shift's length (planned production time), the start condition (cold:
  all machines up, buffers empty; or warm), the number of runs.

## Procedure and calculation
**The model (a Faultline choice, built from the literature's continuous-
material family).** Machines 1…m in series, buffer j (capacity Kⱼ) between
machine j and j + 1. A machine that is up runs at its rate μᵢ unless it is
**starved** (the buffer behind it is empty and it would draw faster than that
buffer is filled) or **blocked** (the buffer ahead is full and it would deliver
faster than it is drawn); then it runs at the neighbour's rate. Up times and
down times are drawn from the machine's distributions (exponential by
default). The rates are constant between events, so the simulator advances from
event to event — a stop starting, a repair ending, a buffer reaching empty or
full — and never steps a minute at a time. The shift's output is the last
machine's rate integrated over the shift.

**Output analysis.** Many runs with different random numbers; the mean with a
95% interval (t·s/√R), the spread of a single shift (its standard deviation
and 10th–90th percentile), the unlimited-buffer ceiling min(μᵢeᵢ) and the
no-stop ceiling for comparison, and blocked and starved minutes per machine.
**What-ifs** are compared with **common random numbers** (one random stream per
machine, the same seeds in both runs): the standard deviation of a difference
fell from 2,393 to 286 packs, so a gain of about 500 a shift is read to ±14
instead of ±120.
**Input uncertainty** is a second, separate band: draw each machine's MTBF
and MTTR from what the number of stops measured allows (for an exponential mean
from n stops, true/estimate = χ²₂ₙ/2n reversed) and report the spread of the
average. **Validation** before any what-if: the model, run with the stops of
the same weeks, against the real shifts' counts from the loss count.

### Researched, 25 October 2026 — what was checked against what

Case: filler 100/min (stops every 60 min, 4 min to clear), bagger 90/min (every
90 min, 6 min); each machine up 93.75% of the time; a 480-minute shift.

| Check | Independent answer | Simulator / result |
|---|---|---|
| No buffer (direct hand-over), steady | min(μ)·e₁·e₂ = 79.10/min = 37,969 a shift | 79.17 ± 0.11 /min |
| Unlimited buffer, steady | min(μᵢeᵢ) = 84.375/min = 40,500 | 84.42 ± 0.18 /min (huge buffer); 84.45 ± 0.13 at 5,000 packs |
| One pack at a time, exact (Markov chain solved as linear algebra), steady, buffer 50–1,200 | 79.52, 80.14, 81.69, 82.89, 83.86 /min | 79.82, 80.23, 81.84, 82.89, 83.81 (±0.12–0.15) — gaps +0.30 to −0.04 |
| Expected **shift** from a cold start, exact (the chain's transient, integrated) | buffer 100: 38,485; 300: 39,202; 600: 39,723; 1,200: 40,098; 2,400: 40,223 | 38,620; 39,303; 39,789; 40,059; 40,238 (±72–81) — within 0.4% every time; buffer 0: 38,010 ± 83 |
| The chain itself against a plain Gillespie simulation of it | 2 machines 1.4963/min; 3 machines 1.3112/min | 1.5008; 1.3129 (12 runs of 5,000 min) |
| Fluid model against the pack-level chain as the line is scaled (rates and buffer × 1, 4, 16) | 81.69, 81.78, 81.80 /min per unit | 81.84, 81.91, 81.81 — the gap closes |
| Three machines, two buffers, scaled × 1, 3, 6 | chain 7.062, 7.348, 7.425 per unit | simulator 7.504, 7.511, 7.511 — gap 6.3%, 2.2%, 1.2% |
| A line read backwards | the same output | 81.693664 both ways (chain) |
| Everything × 2 | output × 2 (to pack granularity) | within 0.5% |

**What a cold-started 480-minute shift gives** (the replacement worked case; 2,000
shifts each, shifts vary by about ±1,700, 4.4% of the output):

| Buffer (packs) | Mean shift | Exact (chain) |
|---|---|---|
| 0 (direct) | 38,010 ± 83 | steady 37,969 |
| 100 | 38,620 ± 81 | 38,485 |
| 300 | 39,303 ± 77 | 39,202 |
| 600 | 39,789 ± 75 | 39,723 |
| 1,200 | 40,059 ± 72 | 40,098 |
| 2,400 | 40,238 ± 73 | 40,223 |
| unlimited, steady × 480 | 40,500 | |
| no stops | 43,200 | |

Doubling 300 → 600 adds about 500 packs a shift (509 ± 14 paired; the exact
chain says 521); doubling 1,200 → 2,400 adds only 125 (chain) to 180 (simulated). **The old table (39,700,
40,900, 40,800 for 300, 600, 1,200 and "nothing moves" with no buffer) is
withdrawn:** its 600 and 1,200 values exceed the 40,500 that even an unlimited
buffer cannot beat on average, so that crude time-stepped model could not be
right.

**Repair-time shape.** The same mean repair with a long tail (lognormal,
coefficient of variation 2) against exponential, buffer 600, steady: 82.50 ±
0.25 against 83.02 ± 0.16 /min — 0.6% less, about 250 packs a shift. Small
here because the 4–6-minute repairs are short against a six-minute buffer; it
grows when repairs are long against the buffer. The mean alone is not the
input.

**Input uncertainty.** With 30 stops measured on each machine, buffer 600: the
steady output × 480 is 38,400 (5%) · 39,700 (median) · 40,700 (95%), against a
point estimate of 39,800. The simulation's own interval is ±75.

## Assumptions, limits and misuse
- **Garbage in:** exponential repair times when the real ones are
  lognormal with a long tail understate the starving; the stop log's
  shape is the input, not a textbook default.
- One run is an anecdote; the mean over many runs with its interval is
  the result.
- **An unvalidated model is a drawing;** validate against real shifts first.
- Over-detail (every sensor, every operator) costs weeks and adds
  nothing to a buffer decision; the model is as simple as the question.
- The what-if's gain is read against its interval **and** the input band; a
  300-pack gain with a ±900 interval is noise.
- The fluid model ignores individual packs: with buffers of a couple of
  minutes' production the pack-level variability matters (6% off on 20-pack
  buffers at 10 packs a minute, 1% at 120 packs); at plate speeds of
  tens of packs a minute and buffers of hundreds the difference is below
  the inputs' uncertainty.
- Not modelled, and said on screen: changeovers; rejects and rework;
  operators and breaks (the shift is *planned production time*); slow
  running (the rate is the running speed timed); start-up ramps; machines in
  parallel and lines that merge (Line capacity's); stops caused by the
  neighbour; correlation between machines' stops.
- Simulation is for the questions the formulas cannot answer; the
  V-curve and Kingman come first and are usually enough. For two machines the
  exact chain gives the same answer in a millisecond; the simulator is for
  longer lines and for shifts.
- Never a forecast: "this line makes" is "with these stops, this line would
  make".

## Reading the result
"With the stops we timed, the line makes about 39,800 a shift from a cold
start (a shift varies ±1,700); a 600-pack buffer instead of 300 adds about 500
a shift; the stops were timed only 30 times, so the average could really be
anywhere from 38,400 to 40,700. If last week's three counted shifts (say 38,900, 40,200
and 39,100) sit inside that band: "inside what the model gives." Money: the output difference ×
margin a pack per shift, scaled to the week (`knowledge/MONEY.md`, T), against
the change's cost — the case for the buffer, the fix or neither. Never
netted with labour.

## When not to use it — and instead
One buffer's cover and recovery → `capacity.accumulation-buffer`. A
station's queue and the effect of variability → `capacity.kingman-vut`.
The rates and the bottleneck → `capacity.v-curve`, `capacity.line-capacity`.
Fewer than about 30 stops a machine → say so and use the buffer arithmetic.

## In food and FMCG manufacturing
The accumulation decision on a new or re-laid line; whether a second
case packer or a bigger table pays; the effect of a slicer's stops on a
bagger's output; a chilled line where the maximum dwell bounds the
buffer.

## References
- [textbook] Law, A.M., *Simulation Modeling and Analysis*, 5th ed., McGraw-Hill, 2015 — model building, input distributions, output analysis, validation, common random numbers (from knowledge; edition to confirm).
- [textbook] Banks, J., Carson, J.S., Nelson, B.L. and Nicol, D.M., *Discrete-Event System Simulation*, 5th ed., Pearson, 2010 (from knowledge).
- [textbook] Hopp, W.J. and Spearman, M.L., *Factory Physics*, 3rd ed., 2008/2011 — when simulation is needed beyond the formulas (from knowledge).
- [textbook] Gershwin, S.B., *Manufacturing Systems Engineering*, Prentice Hall, 1994 — transfer lines with unreliable machines and finite buffers; the course text of MIT 2.852 (named in the course calendar excerpt; not read).
- [guidance] MIT OpenCourseWare 2.852 *Manufacturing Systems Analysis* (Spring 2010), lectures 6–9, Transfer lines — course outline confirmed from the OCW calendar (search excerpt); the no-buffer formula P = 1/(1 + Σ pᵢ/rᵢ) read as an excerpt of a course-note PDF; the lecture bodies not read.
- [paper] Hu, J.-Q. and Meerkov, S.M. (2006), "Lean buffering in serial production lines with Bernoulli machines", *Mathematical Problems in Engineering* — abstract only (search excerpt): closed-form expressions and recursions for the smallest buffer reaching a target production rate.
- [paper] Conway, R., Maxwell, W., McClain, J.O. and Thomas, L.J. (1988), "The role of work-in-process inventory in serial production lines", *Operations Research* 36(2), 229–241 — citation and abstract only; findings not read.
- [paper] Buzacott, J.A. (1967), "Automatic transfer lines with buffer stocks", *International Journal of Production Research* 5(3); Wijngaard, J. (1979), *AIIE Transactions* 11(1) — named by survey excerpts as having solved two-stage lines (titles from knowledge; to confirm).
- [paper] Heshmat, M. et al. (2017) — a discrete-event model of an unreliable line with finite buffers, uptime and downtime distributions fitted to a year of breakdown records — abstract only (search excerpt).

## In Faultline
**Verdict, 25 October 2026: CAN BE BUILT — a small simulator of two to six
machines in series, after the repair times exist, and not before.** FC-047's
entry is right that it needs the repair times measured first (the catalogue's Repair
times tool, MTTR and availability, is *not built*; the loss count times stops in its window and the
reliability study counts them, but no tool yet keeps each machine's stop
*lengths* as a distribution). What the research changes is the rest of the
"XL" fear: the model is a page of arithmetic, validated by independent cases,
runs 2,000 shifts in 0.15 seconds even in the Python of the cases script (a
handful of events a shift), and the
dangers are in the inputs and the claims, not the code.

**Minimal honest build.**
- Inputs, per machine in flow order: rate (Line capacity's), MTBF and MTTR
  *with the number of stops they came from* (the reliability study; the repair
  times tool's lengths when built, or the stop log resampled), whether MTBF is on the clock; per gap between machines:
  buffer packs (or "direct"); the shift's planned production minutes; cold or
  warm start; runs (2,000). Refuse below ~30 stops a machine ("typed estimates
  are allowed, drawn dashed, and the result said unvalidated").
- Outputs: the mean shift with its interval; the spread of a shift (10th–90th
  percentile); the two ceilings; blocked and starved minutes per machine; the
  band from the stops' own uncertainty; **one what-if at a time** compared with
  common random numbers (a buffer's size, a machine's MTBF or MTTR, a rate),
  its gain with both bands; a comparison with up to the last five real shifts
  from the loss count.
- Verdict wording ideas: "Between 38,000 and 41,500 packs a shift (typical
  shift 39,800)." / "A 600-pack buffer instead of 300 adds about 500 a shift
  (±15 runs; ±… from the stops measured) — worth about £… a week." / "This
  change is smaller than what the inputs can tell apart." / "The model is
  outside last week's shifts (3 of 3 above its 90% band) — do not use it
  until it is checked."
- Money: T (`knowledge/MONEY.md`): the output difference × contribution a pack,
  a shift, a week, a year; the missing margin named; never labour as well.

**Independent cases the build must carry** (the unit tests, all with the
numbers above): the two closed-form limits (no buffer 37,969; unlimited
40,500); one machine alone (rate × availability); a perfectly reliable
machine passes the other's output; the pack-level chain for a two-machine line
(steady 81.69 at 300 packs) and for a cold-started shift (39,202 at 300); a
three-machine chain scaled; the reversed line; everything doubled; conservation
(what enters leaves); common random numbers shrinking the spread of a
difference. The script `knowledge/research/cases-research-2-simulation.py`
holds all of them and can be ported.

**Validation before release (Faultline's choice, no standard):** run the
model with the stops of three to five recent real shifts of a real line and
require the actual outputs to sit inside its 90% band, the average gap within
the input band. Until that has been done on a real line, every screen and
paper says *not yet checked against a real shift*.

**Must not claim.** A forecast; a precision finer than the input band; that
the change *caused* a better week; that micro-stops, changeovers, rejects,
people or slow running are included when they are not; that a model that has
not been checked against real shifts is right.

**Open (`knowledge/GAPS.md`):** the clock-versus-running definition of MTBF
the reliability watch uses; the repair-time shape per machine; whether
stops are independent across machines (a shared utility stops two at once).
