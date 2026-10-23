---
id: maintenance.mtbf-failure-rate
name: MTBF and failure rate from a watched machine, with their bounds
aka: [MTBF, mean time between failures, failure rate, lambda, reliability study, stops per hour, B10]
discipline: maintenance
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — exponential model with χ² bounds (time-truncated: lower 2T/χ²(0.95; 2n + 2), upper 2T/χ²(0.05; 2n)) as IEC 60605-4 and the NIST e-Handbook give them, from knowledge; the Laplace trend test; Faultline's arithmetic proved by src/tools/reliability/__tests__/reliability.test.ts (33) and scripts/acceptance/reliability.mjs
needs: []
next: [maintenance.mttr-availability, maintenance.weibull, rca.fishbone-5whys]
alternatives: [equipment.downtime-log, maintenance.reliability-growth]
related: [stats.confidence-intervals, equipment.short-stops-speed]
---
# MTBF and failure rate from a watched machine, with their bounds

## Purpose and principle
A person watches a machine run, starts and stops a watch, and taps each event
(a stop, a failure, anything counted). With T watched hours and n events,
MTBF = T/n and the failure rate λ = n/T. With few events the figure is
uncertain, so the bounds matter as much as the figure.

## Questions it answers
How often does it stop? Is it often enough to meet the MTBF wanted? Is it
getting better or worse? What does it cost an hour of running?

## Inputs and minimum conditions
The watched stretches (start/stop of the watch); each event's time and what
was counted; the MTBF wanted; the minutes a stop stands the line (for money).

## Procedure and calculation
- MTBF = T/n; λ = n/T.
- 90% two-sided bounds (time-truncated): MTBF_low = 2T/χ²(0.95; 2n + 2),
  MTBF_high = 2T/χ²(0.05; 2n). With n = 0: MTBF ≥ 2T/χ²(0.90; 2).
- Chance of an hour with no event: e^(−1/MTBF). B10 life = MTBF × (−ln 0.9).
- Trend (Laplace): U = (Σtᵢ/n − T/2)/(T·√(1/(12n))); |U| > 1.645 a trend at 90%.
- Pattern of the gaps: coefficient of variation of inter-event times — near 1
  random; well below, regular; well above, in bursts.

## Assumptions, limits and misuse
- A constant rate is assumed; a trend breaks it (the test says so).
- Time watched only — events while the watch is stopped do not count.
- Many short watched periods can bias by time of day.

## Reading the result
"One stop every 38 minutes (90% sure 27–55 min), 1.6 an hour; the MTBF wanted
45 minutes — short, not yet sure; £94 an hour of running."

## When not to use it — and instead
Times to failure of a part, to see wear-out → `maintenance.weibull`.
Improving through commissioning → `maintenance.reliability-growth`.

## In food and FMCG manufacturing
Micro-stops on a labeller, film breaks on a wrapper, weigher blockages.

## References
- [standard] IEC 60605-4, *Equipment reliability testing — Part 4: Statistical procedures for exponential distribution — Point estimates, confidence intervals, prediction intervals and tolerance intervals* — from knowledge; edition to confirm.
- [standard] IEC 60050-192:2015, *International Electrotechnical Vocabulary — Part 192: Dependability* — from knowledge.
- [practice] NIST/SEMATECH *e-Handbook of Statistical Methods*, chapter 8 (reliability).

## In Faultline
The Reliability study (`src/tools/reliability/reliability.ts`, `src/tools/reliability/ReliabilityScreen.tsx`), FC-058.
