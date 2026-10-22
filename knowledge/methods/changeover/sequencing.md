---
id: changeover.sequencing
name: Changeover sequence — allergens, colours and flavours in the right order
aka: [changeover sequence, allergen sequencing, sequence dependent setup, light to dark, product wheel order]
discipline: changeover
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — sequence-dependent set-up scheduling (Pinedo) and food practice (allergen-free first, then by allergen) from knowledge
needs: [changeover.smed]
next: [planning.scheduling-rules]
alternatives: []
related: [foodsafety.allergen-changeover, lean.heijunka-epei]
---
# Changeover sequence — allergens, colours and flavours in the right order

## Purpose and principle
When a changeover's length depends on what comes before and after, the order
of products sets the total changeover time. In food the order is also a safety
rule: allergen-free first, then each allergen in an order that needs the
fewest full cleandowns.

## Questions it answers
In what order should this week's products run to spend least time changing over, safely?

## Inputs and minimum conditions
A from–to matrix of changeover times (or clean types) between products; the allergen and colour rules.

## Procedure and calculation
The order minimising Σ changeover times subject to the rules (a travelling-salesman-like problem; heuristics for many products).

## Assumptions, limits and misuse
Optimising time while breaking an allergen rule is never acceptable.

## Reading the result
"Plain → sesame → nuts saves two full cleans a week (3.1 h)."

## When not to use it — and instead
One changeover's length → `changeover.smed`.

## In food and FMCG manufacturing
Allergen campaigns; colour sequencing of sauces; flavour order of crisps.

## References
- [textbook] Pinedo, M.L. (2016), *Scheduling: Theory, Algorithms, and Systems*, 5th ed., Springer.

## In Faultline
Not built (FC-070).
