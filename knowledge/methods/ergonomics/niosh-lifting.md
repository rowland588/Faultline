---
id: ergonomics.niosh-lifting
name: The NIOSH lifting equation — recommended weight limit and lifting index
aka: [NIOSH lifting equation, RWL, lifting index, manual handling, revised NIOSH equation]
discipline: ergonomics
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-22 — Waters et al. (1993) and the NIOSH Applications Manual (1994); Faultline's arithmetic in src/lib/ie/ergo.ts proved by the CCOHS worked example in src/lib/ie/__tests__/ergo.test.ts
needs: []
next: [ergonomics.hse-mac-art]
alternatives: [ergonomics.hse-mac-art]
related: [ergonomics.rula-reba]
---
# The NIOSH lifting equation

## Purpose and principle
For one two-handed lifting task, the recommended weight limit RWL = LC × HM ×
VM × DM × AM × FM × CM (LC 23 kg), each multiplier from the lift's geometry,
frequency and grip; the lifting index LI = load ÷ RWL — above 1, increased
risk; above 3, high.

## Questions it answers
Is lifting these cases onto the pallet a risk, and which factor makes it so?

## Inputs and minimum conditions
Load; horizontal distance; vertical height at origin; travel distance;
asymmetry angle; frequency and duration; coupling.

## Procedure and calculation
HM = 25/H; VM = 1 − 0.003|V − 75|; DM = 0.82 + 4.5/D; AM = 1 − 0.0032A; FM and
CM from the manual's tables (cm, degrees); LI = load/RWL.

## Assumptions, limits and misuse
Two-handed, smooth lifts only; a screening tool for a trained assessor, never a full risk assessment.

## Reading the result
"RWL 11.4 kg, load 13 kg: LI 1.14 — increased risk; the horizontal reach is the biggest factor."

## When not to use it — and instead
UK assessments commonly use HSE's MAC → `ergonomics.hse-mac-art`.

## In food and FMCG manufacturing
End-of-line palletising by hand; loading ingredient sacks.

## References
- [paper] Waters, T.R., Putz-Anderson, V., Garg, A. and Fine, L.J. (1993), "Revised NIOSH equation for the design and evaluation of manual lifting tasks", *Ergonomics* 36(7), 749–776.
- [practice] NIOSH (1994), *Applications Manual for the Revised NIOSH Lifting Equation*, DHHS (NIOSH) Publication 94-110.

## In Faultline
Arithmetic only (`src/lib/ie/ergo.ts`, FC-207 — no screen).
