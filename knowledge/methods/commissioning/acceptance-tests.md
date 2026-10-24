---
id: commissioning.acceptance-tests
name: Acceptance tests — FAT, SAT and the performance run against what was agreed
aka: [FAT, SAT, factory acceptance test, site acceptance test, performance run, run at rate, passes if, program proving]
discipline: commissioning
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — acceptance practice for packaging lines (EN 415-11:2021 gives a methodology for system acceptance — scope checked online, content not read); Faultline's tests, programs and performance run in src/lib/testing.ts and src/lib/run.ts
needs: [commissioning.stage-gate]
next: [commissioning.ramp-up, spc.machine-capability]
alternatives: []
related: [spc.held-at-rate, spc.zero-failure-demonstration]
---
# Acceptance tests — FAT, SAT and the performance run

## Purpose and principle
Each test states what it passes if, agreed before it is run, and records each
attempt and its result; the performance run proves rate, rejects and running
time on the products agreed.

## Questions it answers
Did the machine do what was agreed? Which tests are failing and why? Did it hold the agreed rate?

## Inputs and minimum conditions
The agreed criteria; each attempt's result, speed, minutes, packs and rejects.

## Procedure and calculation
Pass/fail per criterion; net rate = good packs ÷ minutes; rejects %; the journey of attempts.

## Assumptions, limits and misuse
Criteria changed after the result.

## Reading the result
"Performance run: 71.2 a minute net against 70, rejects 0.6% against 1% — passed."

## When not to use it — and instead
A machine's capability on a measured characteristic → `spc.machine-capability`.

## In food and FMCG manufacturing
OEM FATs at the supplier, SATs on site with the factory's own product and film.

## References
- [standard] EN 415-11:2021 — scope checked online 22 Oct 2026.
- [practice] docs/STAGEGATE.md.

## In Faultline
Commissioning tests and programs (`src/lib/testing.ts`, `src/lib/programRun.ts`, `src/lib/run.ts`), FC-074 to FC-076; the EN 415-11 time model for acceptance is research (FC-085). Since 24 October a product short on its agreed rate says what the shortfall is worth — the packs short over the run and a day of the line's shifts at that rate, in contribution a pack (`src/lib/runMoney.ts`, `knowledge/specs/FC-076-run-money.md`).
