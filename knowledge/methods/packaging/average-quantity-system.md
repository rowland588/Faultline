---
id: packaging.average-quantity-system
name: The average quantity system (℮) — the packers' three rules
aka: [average system, e mark, packers rules, TNE, tolerable negative error, T1, T2, weights and measures, short weight]
discipline: packaging
kind: established
evidence: law
depth: full
checked: 2026-10-22 — the Weights and Measures (Packaged Goods) Regulations 2006 (SI 2006/659) Schedule 2, as implemented in src/tools/capability/sample.ts (tneFor) and proved by src/tools/capability/__tests__/sample.test.ts; Directive 76/211/EEC; OIML R 87:2016 from knowledge; the inspector's reference test sampling plans not implemented (knowledge/GAPS.md)
needs: []
next: [yield.giveaway, spc.capability-measured]
alternatives: []
related: [packaging.checkweigher-verification]
---
# The average quantity system (℮) — the packers' three rules

## Purpose and principle
Packs sold by weight or volume under the average system must meet three rules:
(1) the actual contents on average are not less than the nominal; (2) no more
than a small proportion (1 in 40, 2.5%) are short by more than the tolerable
negative error (TNE) — below T1; (3) none is short by more than twice the TNE —
below T2. The TNE depends on the nominal.

## Questions it answers
Is this batch legal? How close to the rules is the filler running?

## Inputs and minimum conditions
Pack weights (net) of a sample; the nominal and unit.

## Procedure and calculation
TNE (g or ml): 5–50: 9%; 50–100: 4.5; 100–200: 4.5%; 200–300: 9; 300–500: 3%;
500–1,000: 15; 1,000–10,000: 1.5%. T1 = nominal − TNE; T2 = nominal − 2·TNE.
Rule 1: mean ≥ nominal. Rule 2: fewer than 1 in 40 below T1. Rule 3: none below T2.

## Assumptions, limits and misuse
- Net weight: tare must be right.
- A sample's pass is not the inspector's reference test on a batch (its
  sampling plans are in the Regulations' schedules — not implemented).
- Volume packs checked by weight need the density at temperature.

## Reading the result
"Average 401.2 g, above 400 ✓ · none more than 12 g short ✓ · none more than 24 g short ✓ — Passed."

## When not to use it — and instead
Give-away in money → `yield.giveaway`. The filler's spread → `spc.capability-measured`.

## In food and FMCG manufacturing
Every pre-packed product marked ℮ (or sold by quantity in the UK).

## References
- [law] The Weights and Measures (Packaged Goods) Regulations 2006 (SI 2006/659).
- [law] Council Directive 76/211/EEC on the making-up by weight or by volume of certain prepackaged products.
- [standard] OIML R 87:2016, *Quantity of product in prepackages* — from knowledge.

## In Faultline
The capability study's *Sold by weight* (`src/tools/capability/sample.ts`, FC-162).
