---
id: msa.measurement-uncertainty
name: Measurement uncertainty — the GUM budget
aka: [measurement uncertainty, GUM, uncertainty budget, expanded uncertainty]
discipline: msa
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — JCGM 100:2008 (the GUM), from knowledge
needs: []
next: []
alternatives: [msa.gauge-rr]
related: [msa.calibration]
---
# Measurement uncertainty — the GUM budget

## Purpose and principle
Each source of uncertainty in a measurement (instrument, reference, resolution,
environment, method) estimated and combined into a standard uncertainty and an expanded one.

## Questions it answers
How sure is a single reading, and is it close enough to a limit to matter?

## Inputs and minimum conditions
The sources and their sizes (from calibration certificates, studies, specifications).

## Procedure and calculation
u_c = √Σ(cᵢuᵢ)²; expanded U = k·u_c (k = 2 for about 95%).

## Assumptions, limits and misuse
Sources missed; correlated sources treated as independent.

## Reading the result
"72.0 °C ± 0.6 °C (k = 2)."

## When not to use it — and instead
Routine floor gauges → `msa.gauge-rr`.

## In food and FMCG manufacturing
CCP temperature measurements near their limit.

## References
- [standard] JCGM 100:2008, *Evaluation of measurement data — Guide to the expression of uncertainty in measurement* — from knowledge.

## In Faultline
Not built (FC-123).
