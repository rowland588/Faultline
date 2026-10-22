---
id: quality.fmea
name: Process FMEA — failure modes, their effects and the action priority
aka: [FMEA, PFMEA, failure mode and effects analysis, RPN, action priority, AIAG-VDA]
discipline: quality
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — AIAG & VDA FMEA Handbook (2019) and IEC 60812:2018, from knowledge
needs: []
next: [quality.control-plan, lean.poka-yoke]
alternatives: [maintenance.criticality]
related: [foodsafety.haccp]
---
# Process FMEA

## Purpose and principle
For each process step: how it can fail, the effect, the cause, the controls;
rated for severity, occurrence and detection, and prioritised for action —
the AIAG-VDA handbook replaced the RPN product with an action-priority table.

## Questions it answers
Which failure modes need action first, and what controls do we have?

## Inputs and minimum conditions
The process steps; a cross-functional team; the rating scales.

## Procedure and calculation
S, O, D on 1–10; action priority (high, medium, low) from the handbook's table (or RPN = S × O × D in older practice).

## Assumptions, limits and misuse
RPN arithmetic treating ordinal scales as numbers; FMEAs written once and filed.

## Reading the result
"Wrong label at changeover: S 9, O 4, D 6 — high priority; add a scanner."

## When not to use it — and instead
Food-safety hazards → `foodsafety.haccp`.

## In food and FMCG manufacturing
Labelling, allergen control, sealing, metal detection.

## References
- [manual] AIAG and VDA (2019), *FMEA Handbook*, 1st ed.
- [standard] IEC 60812:2018, *Failure modes and effects analysis (FMEA and FMECA)* — from knowledge.

## In Faultline
Not built (FC-132).
