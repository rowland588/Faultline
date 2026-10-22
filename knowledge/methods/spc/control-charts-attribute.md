---
id: spc.control-charts-attribute
name: Control charts for counted data — p, np, c, u and Laney's p′ and u′
aka: [p chart, np chart, c chart, u chart, attribute chart, Laney chart, reject chart]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — ISO 7870-2:2023 covers attribute charts (scope confirmed online); limits as AIAG SPC and Montgomery; Laney (2002) via secondary sources
needs: []
next: [spc.capability-attribute-proportion, spc.capability-attribute-defects, quality.pareto]
alternatives: [spc.control-charts-variables]
related: [quality.check-sheet, stats.confidence-intervals]
---
# Control charts for counted data — p, np, c, u and Laney's p′ and u′

## Purpose and principle
Shewhart's chart for counts: whether the share defective (p, np) or the
faults per unit (c, u) of each run is within what chance alone makes, given
the run's size. The limits come from the binomial (defectives) or Poisson
(defects) spread around the average.

## Questions it answers
Did any run reject more than chance would? Is the reject rate steady enough
to state a capability? Did the rate change after the fix?

## Inputs and minimum conditions
Per run: nᵢ judged and dᵢ defective (p, np) or cᵢ faults (c, u). 20–25 runs.
nᵢ·p̄ around 1–5 or more, or the lower limit is 0 and only rises show.

## Procedure and calculation
- p: p̄ ± 3·√(p̄(1 − p̄)/nᵢ); np (equal n): np̄ ± 3·√(np̄(1 − p̄)).
- u: ū ± 3·√(ū/nᵢ); c (equal size): c̄ ± 3·√c̄. Lower limits cut at 0.
- Laney p′ (and u′ alike): zᵢ = (pᵢ − p̄)/σpᵢ, σpᵢ = √(p̄(1 − p̄)/nᵢ);
  σz = MR̄(z)/1.128; limits p̄ ± 3·σpᵢ·σz. σz ≈ 1 means the plain chart is right.

## Assumptions, limits and misuse
- Binomial/Poisson spread assumed; very large runs show overdispersion —
  limits too tight, false alarms — hence Laney's.
- Mixing defectives and defects; dividing by good units instead of all judged.

## Reading the result
"Run 4: 3.1% against an upper limit of 3.0% — more than chance makes."

## When not to use it — and instead
Measured characteristic → `spc.control-charts-variables`.

## In food and FMCG manufacturing
Checkweigher rejects a shift; leakers per dunk test; label faults per reel;
metal detector rejects per hour.

## References
- [standard] ISO 7870-2:2023 — scope checked online 22 Oct 2026.
- [manual] AIAG, *Statistical Process Control (SPC) Reference Manual*, 2nd ed., 2005.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019.
- [paper] Laney, D.B. (2002), *Quality Engineering* 14(4), 531–537.

## In Faultline
Specified as the run chart of parts 2 and 3 of the capability study
(`knowledge/specs/FC-094-capability.md`); not built.
