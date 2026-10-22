---
id: spc.run-rules
name: Signals on a control chart — Western Electric and Nelson rules
aka: [run rules, Nelson rules, Western Electric rules, trends, out of control patterns]
discipline: spc
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — rules as Nelson (1984) and the Western Electric handbook (1956) give them; from knowledge
needs: [spc.control-charts-variables]
next: [rca.fishbone-5whys]
alternatives: [spc.cusum-ewma]
related: [spc.control-charts-attribute]
---
# Signals on a control chart — Western Electric and Nelson rules

## Purpose and principle
Patterns that are unlikely under routine variation even when no point is
outside the limits — a run on one side, a trend, points hugging a limit —
so smaller shifts are seen sooner.

## Questions it answers
Has the process moved even though every point is inside the limits?

## Inputs and minimum conditions
A control chart with its centre and limits from a steady period.

## Procedure and calculation
Commonly used (zones at 1σ, 2σ, 3σ): one point beyond 3σ; 2 of 3 beyond 2σ
on one side; 4 of 5 beyond 1σ on one side; 8 in a row on one side of the
centre (Nelson uses 9); 6 in a row rising or falling; 14 alternating up and
down; 15 in a row within 1σ (too little variation — check the data).

## Assumptions, limits and misuse
Each added rule raises the false-alarm rate; pick a few and keep them.
Autocorrelated data trip the run rules constantly.

## Reading the result
"Eight in a row above the centre from 09:10 — the fill has moved up."

## When not to use it — and instead
For a slow persistent drift a CUSUM or EWMA (`spc.cusum-ewma`) is more sensitive.

## In food and FMCG manufacturing
A filler creeping heavy as the hopper empties; a seal temperature cycling with the heater.

## References
- [paper] Nelson, L.S. (1984), "The Shewhart control chart — tests for special causes", *Journal of Quality Technology* 16(4), 237–239.
- [manual] Western Electric (1956), *Statistical Quality Control Handbook*.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019.

## In Faultline
Not built (FC-090). The capability page's steadiness check in the pilot uses
the limits and the run of eight only.
