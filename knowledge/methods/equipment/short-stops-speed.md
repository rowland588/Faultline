---
id: equipment.short-stops-speed
name: Short stops and speed loss — counted and timed at the machine
aka: [micro stops, minor stops, idling, speed loss, slow running, reduced speed]
discipline: equipment
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — Nakajima's minor stoppages and reduced speed losses; Faultline tells them apart by a timed running speed (docs/CAPACITY.md §5)
needs: [equipment.time-model-losses]
next: [maintenance.mtbf-failure-rate, rca.fishbone-5whys]
alternatives: []
related: [maintenance.mtbf-failure-rate]
---
# Short stops and speed loss — counted and timed at the machine

## Purpose and principle
Stops too short to log one by one, and running below the ideal speed, hide in
the gap between what run time should have made and what it made. Counting the
short stops at the machine (a tap each) and timing the running speed splits the gap.

## Questions it answers
How much of the lost time is short stops, how much slow running?

## Inputs and minimum conditions
Taps for each short stop over a watched period (and their durations if wanted); a timed running speed.

## Procedure and calculation
Slow running = run time × (1 − running speed ÷ ideal speed); short stops = the rest of the speed loss; frequency = stops ÷ watched hours.

## Assumptions, limits and misuse
A person at the machine changes how it is run; watch long enough.

## Reading the result
"Running at 68 against 72 — 6% slow; 31 short stops an hour, about 40 minutes a shift."

## When not to use it — and instead
Long stops → the stopwatch log.

## In food and FMCG manufacturing
Labeller jams, film tracking stops, weigher hoppers not discharging.

## References
- [textbook] Nakajima, S. (1988), *Introduction to TPM*, Productivity Press.

## In Faultline
Partly: the reliability study counts short stops (MTBF, no durations); the loss count splits speed loss once a running speed is timed (FC-055, FC-056).
