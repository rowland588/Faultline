---
id: spc.pre-control
name: Pre-control — green, amber and red zones for set-up approval
aka: [precontrol, traffic light control, stoplight control, set-up approval]
discipline: spc
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — from knowledge; its statistical weaknesses as Montgomery and Ledolter & Swersey (1997) discuss
needs: [spc.capability-measured]
next: [spc.control-charts-variables]
alternatives: [spc.control-charts-variables]
related: [changeover.first-off-release]
---
# Pre-control — green, amber and red zones for set-up approval

## Purpose and principle
A floor rule built on the specification: the middle half of the tolerance is
green, the outer quarters amber, outside red. Five greens in a row approve a
set-up; during the run, two readings sampled at intervals decide carry on,
adjust or stop.

## Questions it answers
Is the set-up good enough to start? Carry on, adjust or stop?

## Inputs and minimum conditions
Two-sided limits; a process already known to be capable (Cpk well above 1).

## Procedure and calculation
Zones: green within ±¼ tolerance of nominal; amber the rest inside the limits;
red outside. Set-up: 5 consecutive greens (one amber restarts the count, a red
means adjust). Run: sample 2; both green or one green one amber — carry on;
two amber on the same side — adjust; amber on opposite sides — stop and find
why; any red — stop.

## Assumptions, limits and misuse
Uses the specification, not the process's variation, so it neither proves nor
tracks stability; safe only for a capable process.

## Reading the result
"Five greens — set-up approved at 06:12."

## When not to use it — and instead
To know whether the process is steady or capable → control chart and capability.

## In food and FMCG manufacturing
First-off weight approval after a changeover on a filler; label position at start-up.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — discussion of pre-control.
- [paper] Ledolter, J. and Swersey, A. (1997), "An evaluation of pre-control", *Journal of Quality Technology* 29(2), 163–171.

## In Faultline
Not built (FC-092).
