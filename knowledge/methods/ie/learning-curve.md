---
id: ie.learning-curve
name: The learning curve — how a new job's time falls with repetition
aka: [learning curve, experience curve, Wright's curve, 80% curve, learning rate, time to standard]
discipline: ie
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-24 — Wright's (1936) log-linear model and the unit-time form as the IE texts give them (from knowledge); the fit by log–log regression and the worked case computed in `scripts/knowledge/cases-ie.py`
needs: []
next: [people.skills-matrix]
alternatives: []
related: [commissioning.ramp-up, ie.time-study, people.twi-job-instruction]
---
# The learning curve — how a new job's time falls with repetition

## Purpose and principle
A new product, a new person, a new line: the first cycles are slow and
each repetition is a little faster, by a steady proportion each time the
count doubles. Wright's curve puts a number on it — an 80% curve means
the time falls to 80% of itself every time the cumulative count doubles
— so the time to reach the standard, the output of the first weeks and
the training a new starter needs can be planned rather than hoped. It
also says when the standard was set too early: a time study taken on
run 3 is a standard nobody will meet until run 11.

## Questions it answers
- How fast is this job (or person) learning — the learning rate?
- When will the time reach the standard — which run, which week?
- What output should the first runs be planned at (not the standard)?
- Did a training method change the curve (`people.twi-job-instruction`)?

## Inputs and minimum conditions
- The time per unit (or per cycle, per run) against the cumulative
  count of units (runs), for the same person or crew on the same job;
  at least 5–6 points spanning a doubling or two.
- The standard the job is heading for (`ie.time-study`), to project the
  crossing.
- Conditions held: a change of method or equipment mid-series starts a
  new curve.

## Procedure and calculation
- Unit-time form: Tₙ = T₁·n^b, with b = log₂(learning rate); an 80% curve
  has b = −0.322, a 90% curve −0.152, 70% −0.515.
- Fit: regress ln Tₙ on ln n; b is the slope, T₁ = e^intercept; the
  learning rate = 2^b; R² says how steady the learning was.
- Projection: Tₙ at any n; the run n* at which Tₙ reaches the standard S:
  n* = (S/T₁)^(1/b), rounded up.
- Cumulative average form (Wright's original): the average time of the
  first n units falls on the same kind of curve with its own T₁; the
  two forms differ — say which is fitted (the unit form reads straight
  from cycle times).
- Total time for the first N units ≈ Σ T₁·n^b (or the integral
  T₁·N^(b+1)/(b+1) for a quick figure) — the first week's plan.
- A plateau (the curve flattens above the standard) means the method or
  the station limits it, not the person: redesign, not more practice.
- Forgetting: a break in production puts the curve back part way; a
  long gap means re-learning time in the plan.

**Worked case** (`cases-ie.py`): a new product's first eight runs, cycle
time per pack 68, 58, 53, 49, 47, 45, 44, 43 s. Fit: Tₙ = 67.7·n^(−0.224),
learning rate 85.6% (R² 0.998) — each doubling of runs cuts the time to
86%. Projected: run 16 at 36.4 s, run 32 at 31.1 s; the standard of 40 s
is reached at run 11. The cumulative average over the first eight is
50.9 s against 43 s at run 8 — the first week's output must be planned
at the average, not the standard.

## Assumptions, limits and misuse
- The log-linear curve is an empirical regularity, not a law; many jobs
  plateau early (machine-paced work learns little) and some learn in
  steps.
- Fitting on three points gives any rate; five or six spanning a
  doubling is the minimum.
- Pooling two people or two products is two curves averaged into
  nonsense.
- A standard set on early runs is too loose later; one set on a veteran
  is unreachable for a starter — the curve says which, and the standard
  is set at the plateau.
- The curve measures time, not quality: early runs also reject more
  (`quality.fpy-rty` by run).
- Projecting far beyond the data (run 1,000 from eight) is a guess.

## Reading the result
"The new line is learning at 86% a doubling: the 40 s standard arrives
at run 11, about week 3; plan the first fortnight at 50 s a pack, not
40." Money: the first weeks' output below the standard × margin a pack
(`knowledge/MONEY.md`, T) — the cost of learning, which training shortens
(L for the training hours against the packs gained).

## When not to use it — and instead
The output climb of a machine to rate (stops and settings, not people
learning) → `commissioning.ramp-up`. The standard itself → `ie.time-study`.
Who can do what, and training → `people.skills-matrix`,
`people.twi-job-instruction`.

## In food and FMCG manufacturing
A new product's first runs on a hand-assembly line; a new starter on
packing; a seasonal crew's first week; a new line's operators in
commissioning — the weeks when the standard is a target, not a measure.

## References
- [paper] Wright, T.P. (1936), "Factors affecting the cost of airplanes", *Journal of the Aeronautical Sciences* 3(4), 122–128 — the curve (from knowledge).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014 — learning curves in standards (from knowledge).
- [paper] Yelle, L.E. (1979), "The learning curve: historical review and comprehensive survey", *Decision Sciences* 10(2), 302–328 (from knowledge).

## In Faultline
Not built (FC-027). The line balance's timed cycles and the video study's
readings carry a date and a run (`src/tools/linework`, `src/tools/video`);
FC-027 reads a station's cycle time by run, fits the curve, says the rate
and the run the standard arrives, and plans the first weeks' output in
packs and money.
