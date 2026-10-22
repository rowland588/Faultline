---
id: sixsigma.dmaic
name: DMAIC — define, measure, analyse, improve, control
aka: [DMAIC, Six Sigma project, Lean Six Sigma, tollgate review]
discipline: sixsigma
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — ISO 13053-1:2011 (DMAIC methodology), current, confirmed 2022 (checked online); Faultline's running-line method is the 6M (docs/SIXM.md), which runs the same loop without DMAIC's gates
needs: []
next: [sixsigma.charter, sixsigma.sipoc]
alternatives: [rca.fishbone-5whys, rca.a3]
related: [commissioning.stage-gate]
---
# DMAIC — define, measure, analyse, improve, control

## Purpose and principle
A project in five phases with a review at each: define the problem and the
customer's requirement; measure the baseline (and the measurement system);
analyse for the root causes with data; improve and prove it; control so it holds.

## Questions it answers
Is the project ready to move to the next phase, on evidence?

## Inputs and minimum conditions
A charter, a baseline measure, data for analysis.

## Procedure and calculation
Phase deliverables and tollgates; the statistics within each (capability, tests, DOE, control charts).

## Assumptions, limits and misuse
Heavy for small problems; tollgates as paperwork.

## Reading the result
"Measure complete: baseline give-away 4.1 g, gauge %GRR 12%."

## When not to use it — and instead
A running line's problem found and fixed on the floor → the 6M (`rca.fishbone-5whys`).

## In food and FMCG manufacturing
Give-away, yield and waste projects.

## References
- [standard] ISO 13053-1:2011, *Quantitative methods in process improvement — Six Sigma — Part 1: DMAIC methodology* — checked online 22 Oct 2026.
- [textbook] Pyzdek, T. and Keller, P. (2018), *The Six Sigma Handbook*, 5th ed.

## In Faultline
Partly: the 6M runs the loop (problem → causes → countermeasures → proof → holding) without DMAIC's gates (FC-138).
