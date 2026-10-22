---
id: quality.acceptance-sampling-variables
name: Acceptance sampling by variables
aka: [ISO 3951, variables sampling, k method]
discipline: quality
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — ISO 3951-1:2022 current (replaces 2013), scope checked online: single sampling by AQL, one normally distributed characteristic
needs: [spc.normality-checks]
next: []
alternatives: [quality.acceptance-sampling-attributes]
related: [spc.capability-measured]
---
# Acceptance sampling by variables

## Purpose and principle
Accept a lot from the mean and spread of a measured sample (x̄ against the limit
by k standard deviations), needing smaller samples than attributes for the same protection.

## Questions it answers
Can we accept this lot of film on thickness from 10 measurements?

## Inputs and minimum conditions
A measured characteristic, approximately normal; the AQL; the plan's n and k.

## Procedure and calculation
Accept if (USL − x̄)/s ≥ k (and/or (x̄ − LSL)/s ≥ k).

## Assumptions, limits and misuse
Normality is essential; the constants come from the standard's tables.

## Reading the result
"(USL − x̄)/s = 2.31 ≥ k 1.91 — accept."

## When not to use it — and instead
Good/bad only → `quality.acceptance-sampling-attributes`.

## In food and FMCG manufacturing
Incoming film thickness, carton board strength.

## References
- [standard] ISO 3951-1:2022, *Sampling procedures for inspection by variables — Part 1* — scope checked online 22 Oct 2026.

## In Faultline
Research first (FC-130).
