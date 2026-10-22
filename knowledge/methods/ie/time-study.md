---
id: ie.time-study
name: Stopwatch time study — observed, rated, allowed, standard time
aka: [time study, stopwatch study, work measurement, standard time, basic time, performance rating, cycles needed]
discipline: ie
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — the ILO's Introduction to Work Study (Kanawaty 1992) and BS 3138 (glossary, the 0–100 rating scale) from knowledge; the cycles-needed formula as Freivalds & Niebel give it; Faultline's arithmetic in src/lib/ie/balance.ts proved by src/lib/ie/__tests__/balance.test.ts
needs: []
next: [capacity.line-balancing, lean.standard-work, ie.standard-data]
alternatives: [ie.pmts, ie.work-sampling, ie.video-time-study]
related: [ie.allowances, stats.sample-size-power, ie.learning-curve]
---
# Stopwatch time study — observed, rated, allowed, standard time

## Purpose and principle
The time a qualified worker takes to do a job at a defined pace, by
observation: the job broken into elements with clear break points, each timed
over several cycles, rated against a standard pace, and given allowances for
rest and contingencies. The result — the standard time — is what balancing,
staffing and costing stand on.

## Questions it answers
How long should this job take? How many people does the work need at takt?
Which elements take the time?

## Inputs and minimum conditions
- The job split into elements with defined start and end points.
- Each element timed over enough cycles (below); the operator trained and working normally.
- A rating of pace per element (on the BS 3138 scale 100 = standard pace;
  the observer must be trained to rate).
- The allowances agreed (`ie.allowances`).

## Procedure and calculation
- Observed time = mean of the element's timed cycles (outliers from foreign
  elements struck, with the reason).
- Basic time = observed × rating ÷ 100.
- Standard time = basic × (1 + allowance), allowance as a fraction (0.14 = 14%).
- Cycles needed for the mean within ±k (e.g. 5%) at 95%: n′ = (z·s/(k·x̄))²,
  z = 1.96 — or, with few readings, Student's t in place of z.
- A job's standard time = Σ elements' standard times; work content against takt gives people needed.

## Assumptions, limits and misuse
- Rating is a judgement; untrained rating makes the standard arbitrary.
- Timing an untrained or a showcase operator; too few cycles; elements with
  vague break points.
- Machine-paced elements are not rated.

## Reading the result
"Seal and place: observed 4.2 s, rated 95, basic 4.0 s, standard 4.6 s
(14%); 12 cycles timed, ±4% at 95%."

## When not to use it — and instead
Jobs too long or irregular to time → `ie.work-sampling`. Designing a job not
yet done → `ie.pmts`. Footage instead of a stopwatch → `ie.video-time-study`.

## In food and FMCG manufacturing
Hand-packing elements, tray loading, case erecting, sandwich assembly stations.

## References
- [textbook] Kanawaty, G. (ed.) (1992), *Introduction to Work Study*, 4th ed., International Labour Office.
- [standard] BS 3138:1992, *Glossary of terms used in management services* — the rating scale, from knowledge; edition to confirm.
- [textbook] Freivalds, A. and Niebel, B.W., *Niebel's Methods, Standards, and Work Design*, McGraw-Hill (13th ed., 2014).

## In Faultline
The Line balance times elements on the phone (`src/lib/ie/balance.ts`:
basic = observed × rating ÷ 100, standard = basic × (1 + allowance)); the
rating exists in the arithmetic but is never asked on screen (all 100), and
the cycles needed are not said (FC-019, FC-020).
