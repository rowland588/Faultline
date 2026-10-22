---
id: msa.type1-gauge
name: Type 1 gauge study — one reference measured again and again (Cg, Cgk)
aka: [type 1 study, Cg, Cgk, gauge capability, repeatability with a reference]
discipline: msa
kind: established
evidence: practice
depth: summary
checked: 2026-10-22 — automotive practice (VDA Volume 5; Bosch booklet 10) from knowledge; the usual constants (20% of tolerance, 6s; Cg, Cgk ≥ 1.33) to confirm against VDA 5
needs: []
next: [msa.gauge-rr]
alternatives: [msa.bias-linearity-stability]
related: [packaging.checkweigher-verification]
---
# Type 1 gauge study — one reference measured again and again

## Purpose and principle
One reference of known value (a certified test weight) measured many times
(25–50) by one person: its bias and repeatability against the tolerance.

## Questions it answers
Is this checkweigher or scale fit to judge this tolerance?

## Inputs and minimum conditions
A reference with a known value; the tolerance; 25–50 repeats.

## Procedure and calculation
Cg = (0.2·T)/(6s); Cgk = (0.1·T − |x̄ − x_ref|)/(3s); both ≥ 1.33 commonly required.

## Assumptions, limits and misuse
Static weighing differs from dynamic checkweighing at speed.

## Reading the result
"Cg 2.1, Cgk 1.8 — fit for ±4.5 g."

## When not to use it — and instead
Several appraisers and parts → `msa.gauge-rr`.

## In food and FMCG manufacturing
Checkweighers with test weights; QA bench scales.

## References
- [manual] VDA, *Volume 5: Capability of Measurement Processes* — from knowledge; edition to confirm.

## In Faultline
Not built (FC-119).
