---
id: msa.gauge-rr
name: Gauge R&R — repeatability and reproducibility (crossed, ANOVA method)
aka: [gauge R&R, GRR, measurement system analysis, repeatability, reproducibility, ndc]
discipline: msa
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — AIAG MSA Reference Manual, 4th ed. (2010), from knowledge; ISO 5725-2:2019 for repeatability and reproducibility of methods
needs: [msa.type1-gauge]
next: [spc.capability-measured]
alternatives: [msa.attribute-agreement]
related: [msa.bias-linearity-stability]
---
# Gauge R&R — repeatability and reproducibility

## Purpose and principle
How much of the variation seen is the measurement itself: the same appraiser
measuring the same part (repeatability) and different appraisers (reproducibility),
against the parts' own variation and the tolerance.

## Questions it answers
Can this scale or gauge tell good from bad? Is the measurement adding to the spread we see?

## Inputs and minimum conditions
Typically 10 parts spanning the range × 3 appraisers × 2–3 repeats, randomised, blind.

## Procedure and calculation
Two-way ANOVA (parts × appraisers with interaction); variance components; %GRR
of total variation and of tolerance (6σ_GRR ÷ tolerance); ndc = 1.41·σ_parts/σ_GRR.
AIAG guide: under 10% acceptable, 10–30% may be acceptable, over 30% not; ndc ≥ 5.

## Assumptions, limits and misuse
Parts that do not span the process; appraisers knowing which part.

## Reading the result
"%GRR 18% of tolerance, ndc 6 — acceptable for this use."

## When not to use it — and instead
Pass/fail judgements → `msa.attribute-agreement`.

## In food and FMCG manufacturing
Seal strength testers; thickness gauges; temperature probes between QA staff.

## References
- [manual] AIAG, *Measurement Systems Analysis (MSA) Reference Manual*, 4th ed., 2010.
- [standard] ISO 5725-2:2019, *Accuracy (trueness and precision) of measurement methods and results — Part 2* — from knowledge.

## In Faultline
Not built (FC-118).
