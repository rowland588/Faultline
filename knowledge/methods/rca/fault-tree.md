---
id: rca.fault-tree
name: Fault tree analysis
aka: [FTA, fault tree, AND OR gates, top event]
discipline: rca
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — IEC 61025:2006, from knowledge
needs: []
next: []
alternatives: [rca.fishbone-5whys]
related: [quality.fmea]
---
# Fault tree analysis

## Purpose and principle
A top event decomposed through AND/OR gates into the combinations of basic
events that cause it; probabilities combine through the gates.

## Questions it answers
What combinations of failures let a metal contaminant reach a pack?

## Inputs and minimum conditions
The system's logic; basic event probabilities if quantified.

## Procedure and calculation
OR: 1 − Π(1 − pᵢ); AND: Π pᵢ (independent events); minimal cut sets.

## Assumptions, limits and misuse
Common-cause failures treated as independent.

## Reading the result
"Two minimal cut sets; the detector reject failing with no reject-confirm is the largest."

## When not to use it — and instead
Everyday problems → the fishbone.

## In food and FMCG manufacturing
Metal detection systems; pasteurisation failure.

## References
- [standard] IEC 61025:2006, *Fault tree analysis (FTA)* — from knowledge.

## In Faultline
Not built (FC-152).
