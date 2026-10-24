---
id: ie.allowances
name: Allowances — relaxation and contingency
aka: [rest allowance, relaxation allowance, PFD allowance, contingency allowance, personal fatigue and delay]
discipline: ie
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — the ILO's relaxation allowance tables (Kanawaty 1992) from knowledge; Faultline's 9% for a person in Line capacity (docs/CAPACITY.md §1)
needs: []
next: [ie.time-study]
alternatives: []
related: [capacity.line-capacity, ergonomics.hse-mac-art]
---
# Allowances — relaxation and contingency

## Purpose and principle
Time added to basic time for recovery from effort and conditions (relaxation:
a fixed personal-needs part plus variable parts for posture, force, heat,
noise, monotony) and for small unpredictable work (contingency).

## Questions it answers
How much to add to the timed work so the standard is sustainable all shift?

## Inputs and minimum conditions
The job's conditions against the tables' factors.

## Procedure and calculation
Allowance = Σ applicable factors (as % of basic time); standard = basic × (1 + allowance).

## Assumptions, limits and misuse
Allowances used to pad standards; counted twice (once in the time, once added).

## Reading the result
"Relaxation 13% + contingency 2% = 15%."

## When not to use it — and instead
Machine-paced time is not allowed for.

## In food and FMCG manufacturing
Cold rooms (low temperature factors), standing work, repetitive packing.

## References
- [textbook] Kanawaty, G. (ed.) (1992), *Introduction to Work Study*, 4th ed., ILO — relaxation allowances.

## In Faultline
One allowance agreed per line balance (`src/tools/linework/balance.ts`); Line capacity adds the ILO's 9% rest to a person's time; the factor tables are not offered (FC-025, partly).
