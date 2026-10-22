---
id: spc.machine-capability
name: Machine capability — Cm and Cmk over a short run (acceptance)
aka: [machine capability study, Cm, Cmk, MCS, machine performance study, ISO 22514-3]
discipline: spc
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — ISO 22514-3 (machine performance studies for measured data on discrete parts) named from knowledge, edition to confirm; common practice 50 consecutive parts and Cmk ≥ 1.67 (automotive suppliers' rules) from knowledge
needs: [msa.type1-gauge]
next: [spc.capability-measured]
alternatives: [spc.capability-measured]
related: [commissioning.acceptance-tests]
---
# Machine capability — Cm and Cmk over a short run (acceptance)

## Purpose and principle
The machine alone, over a short run with one operator, one batch of material
and settled conditions, so its own repeatability is seen before the process's
other sources of variation join in. Used to accept a new machine.

## Questions it answers
Can this new filler or sealer hold the tolerance on its own, before handover?

## Inputs and minimum conditions
About 50 consecutive items (practice varies: 25–100), one material lot, one
setting, a gauge fit for the tolerance.

## Procedure and calculation
Cm = (USL − LSL)/6s; Cmk = min(USL − x̄, x̄ − LSL)/3s, with s from the run.
Acceptance threshold agreed with the supplier — 1.67 is common, 2.0 for some
customers.

## Assumptions, limits and misuse
Says nothing about the process over shifts and lots; a pass here is not a
capable process.

## Reading the result
"Cmk 1.92 from 50 — the machine is accepted on this characteristic."

## When not to use it — and instead
The running process → `spc.capability-measured`.

## In food and FMCG manufacturing
FAT/SAT on a new weigher, a new tray sealer's seal strength, a labeller's placement.

## References
- [standard] ISO 22514-3, *Statistical methods in process management — Capability and performance — Part 3: Machine performance studies for measured data on discrete parts* — from knowledge; edition to confirm.
- [manual] AIAG, *Statistical Process Control (SPC) Reference Manual*, 2nd ed., 2005.

## In Faultline
Not built (FC-084). The commissioning tests record a pass or fail against
what was agreed; a Cmk would be the capability study run in acceptance.
