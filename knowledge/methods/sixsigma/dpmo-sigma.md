---
id: sixsigma.dpmo-sigma
name: Defects per million and the sigma level — conversions and their caveat
aka: [DPMO, PPM, sigma level, process sigma, Z bench, 1.5 sigma shift]
discipline: sixsigma
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Z = Φ⁻¹(1 − p) (long-term); the 1.5σ shift convention (short-term σ = Z + 1.5) as the Six Sigma literature states it, and its criticism (Wheeler) — from knowledge; conversions checked with SciPy (scripts/knowledge/independent-cases.py)
needs: []
next: []
alternatives: []
related: [spc.capability-attribute-proportion, spc.capability-attribute-defects, spc.capability-measured]
---
# Defects per million and the sigma level

## Purpose and principle
A defect rate restated as a Z — how many standard deviations of a normal curve
would leave that tail: Z = Φ⁻¹(1 − p). Six Sigma's "sigma level" adds 1.5 to Z by
convention (an assumed long-term shift), so 3.4 per million is called 6σ.

## Questions it answers
How does a reject rate compare with a measured characteristic's capability?

## Inputs and minimum conditions
A defect rate p (or DPMO with opportunities defined).

## Procedure and calculation
- Z (long-term) = Φ⁻¹(1 − p): 1% → 2.33; 0.1% → 3.09; 63 PPM → 3.83; 3.4 PPM → 4.50.
- Equivalent Ppk = Z/3.
- Sigma level with the shift = Z + 1.5 (3.4 PPM → 6.0).

## Assumptions, limits and misuse
The 1.5 shift is a convention, not a measured property; say whether it is
included. DPMO with inflated opportunities flatters.

## Reading the result
"1.17% rejected: Z 2.27, as a Ppk 0.76 (no shift added)."

## When not to use it — and instead
The rate itself with its bound is the plainer statement; use Z only to compare.

## In food and FMCG manufacturing
Comparing a reject rate with a weight capability in one report.

## References
- [textbook] Breyfogle, F.W. (2003), *Implementing Six Sigma*, 2nd ed., Wiley.
- [textbook] Wheeler, D.J. (2004), *The Six Sigma Practitioner's Guide to Data Analysis*, SPC Press.

## In Faultline
Specified as part of the capability study's counted kinds (FC-102).
