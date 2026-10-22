---
id: spc.held-at-rate
name: Held at a rate for a time — run at rate, minute by minute
aka: [run at rate, sustained speed test, endurance run, held for time, speed held]
discipline: spc
kind: adaptation
evidence: practice
depth: summary
checked: 2026-10-22 — a Faultline adaptation of established parts: an individuals run chart of a count per interval against a floor or ceiling, the share of intervals met, the longest unbroken stretch, and one-sided Ppk on the per-interval rate; Rowland, 22 October ("it has to run consistently for 75 packs per minute for an X amount of time")
needs: [spc.capability-measured]
next: [commissioning.acceptance-tests]
alternatives: []
related: [spc.control-charts-variables]
---
# Held at a rate for a time — run at rate, minute by minute

## Purpose and principle
Whether a machine *holds* a speed (or any number) for an agreed time, not
just averages it. The count in each interval (a minute, five minutes) is
turned into a rate a minute, judged against a floor, a ceiling or a band, and
the run judged by how many intervals met it, the longest stretch that held,
and what was made against what the time at that rate should make.

## Questions it answers
Did it run at 75 a minute for the whole 30 minutes? Where did it dip, and for
how long? Would it keep holding (one-sided capability on the rate)?

## Inputs and minimum conditions
The rate and its side (at least · at most · between), how long, how often it
is counted; at each interval the packs counted by a person (and rejects, if
wanted). A stop inside an interval is part of it — counted as made.

## Procedure and calculation
Rate of interval i = packs ÷ interval minutes. Met = rate on the right side.
Share met = intervals met ÷ intervals. Longest stretch = longest run of met
intervals × interval minutes. Made vs expected = Σpacks vs rate × minutes.
Ppk on the rates (one-sided) from 25 intervals, as `spc.capability-measured`.

## Assumptions, limits and misuse
Counting by hand at each interval is a burden at one-minute intervals over
long runs — choose the interval to suit. The rates are autocorrelated over
short intervals; the capability is a guide.

## Reading the result
"Held 28 of 30 minutes at 75 or more; longest 19 minutes; 2,286 made against
2,250 — Didn't pass (2 minutes under)."

## When not to use it — and instead
An agreed performance run with products, rate and rejects → `commissioning.acceptance-tests`.

## In food and FMCG manufacturing
Acceptance of a flow wrapper at 75 a minute; an oven held between two
temperatures for an hour; a line's sustained rate after a changeover.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — individuals charts (the parts it is built from).
- [standard] EN 415-11:2021, *Safety of packaging machines — Part 11: Determination of efficiency and availability* — acceptance methodology; scope checked online 22 Oct 2026, content not read.

## In Faultline
Specified, part 2 of the capability study (`knowledge/specs/FC-094-capability.md`); not built.
