---
id: equipment.time-model-losses
name: A shift's time model — planned time, the six big losses, by hand
aka: [time model, six big losses, loss tree, loss count, waterfall, availability performance quality losses, slow running, short stops]
discipline: equipment
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — the six big losses (Nakajima 1988); the time model of packaging lines EN 415-11:2021 (scope checked online; content not read) and DIN 8743:2014 (withdrawn); Faultline's model in docs/CAPACITY.md §5–6, src/lib/ie/losses.ts, proved by losses.test.ts and scripts/acceptance/shift-losses.mjs
needs: [capacity.line-capacity]
next: [quality.pareto, rca.fishbone-5whys, cost.line-cost-model]
alternatives: [equipment.oee]
related: [equipment.downtime-log, equipment.short-stops-speed, capacity.theory-of-constraints]
---
# A shift's time model — planned time, the six big losses, by hand

## Purpose and principle
Where a shift's time went, measured at the constraint's ideal speed: planned
production time (the shift less planned breaks), less the stops (breakdowns,
changeovers, waiting), less the time lost running slow or in short stops,
less the time spent making rejects — what is left is the time that made good
packs at the ideal speed. Each loss is a bar of a waterfall, in minutes, packs
and money.

## Questions it answers
Where did today's shift go? Which loss is biggest at the constraint? What did
it cost in labour and in packs not made?

## Inputs and minimum conditions
The shift's window and breaks; the good count and the rejects counted by hand;
the stops timed in the window (the stopwatch log); the constraint's ideal speed
(plate speed, or a person's standard time when a person is slowest).

## Procedure and calculation
- Planned time P = shift − planned breaks.
- Stop time S = Σ stops in the window (overlaps on one machine counted once).
- Run time R = P − S.
- Ideal output in R = R × ideal rate; made = good + rejects.
- Speed loss (slow running and short stops) = R − made ÷ ideal rate; told apart
  when a running speed is timed.
- Quality loss = rejects ÷ ideal rate.
- Valuable time = good ÷ ideal rate; each loss in packs = minutes × ideal rate.
- Money: labour = minutes × crew × wage × on-costs; lost contribution = packs
  not made × contribution a pack — only for losses at the constraint.

## Assumptions, limits and misuse
- The ideal speed must be the constraint's, or every loss is mis-stated.
- Unexplained speed loss is real time lost to unrecorded short stops — record
  them before blaming slow running.
- Comparing shifts with different planned times by percentage alone.

## Reading the result
"Of 660 planned minutes, 412 made good packs; breakdowns 96, changeovers 58,
short stops and slow running 81, rejects 13 — £2,840 in labour and 9,800 packs."

## When not to use it — and instead
A single machine's stop pattern over days → `maintenance.mtbf-failure-rate`.
A typed OEE percentage → left out (`equipment.oee`).

## In food and FMCG manufacturing
Packing shifts at a weigher/bagger; bottling; ready-meal assembly where a
person is the constraint.

## References
- [textbook] Nakajima, S. (1988), *Introduction to TPM*, Productivity Press — the six big losses.
- [standard] EN 415-11:2021, *Safety of packaging machines — Part 11: Determination of efficiency and availability* — scope checked online 22 Oct 2026.
- [standard] DIN 8743:2014, *Packaging machines and packaging lines — time-based terms, key performance indicators* — withdrawn; scope checked online 22 Oct 2026.
- [practice] docs/CAPACITY.md §5–6.

## In Faultline
The Loss count (`src/lib/ie/losses.ts`, `src/screens/LossesScreen.tsx`,
`src/lib/ie/lossLean.ts`), FC-049.
