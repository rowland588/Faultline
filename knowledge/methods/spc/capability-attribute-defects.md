---
id: spc.capability-attribute-defects
name: Capability of faults counted on items — defects per unit (Poisson capability)
aka: [defects per unit, DPU, DPMO, faults per pack, Poisson capability, u chart capability]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — method as the AIAG SPC manual and Montgomery (c and u charts); exact Poisson bounds by the χ² relation; DPMO's opportunity counting as the Six Sigma literature warns; ISO 22514-5:2019 scope only (paywalled)
needs: [spc.control-charts-attribute]
next: [quality.pareto, quality.defect-concentration]
alternatives: [spc.capability-attribute-proportion, spc.capability-measured]
related: [sixsigma.dpmo-sigma, quality.fpy-rty, stats.confidence-intervals]
---
# Capability of faults counted on items — defects per unit (Poisson capability)

## Purpose and principle
When one item can carry several faults — a reel with print flaws, a tray of
bakes with marks, a pallet with label and wrap faults — the number of faults
in an inspected amount follows the Poisson distribution, and capability is
the mean number of faults per unit (DPU) once steady. It answers a different
question from a reject rate: not "how many units are bad" but "how much is
wrong".

## Questions it answers
- How many faults per pack, per reel, per 1,000 packs — and how sure?
- Is the fault rate steady from batch to batch?
- What share of units would have at least one fault?
- Which fault types make up most of it (with the defect tally)?

## Inputs and minimum conditions
- Per inspection (subgroup): the amount inspected **nᵢ** in units (packs,
  metres of film, trays) and the faults counted **cᵢ**.
- What counts as a fault, written as a list of types; each found fault counted once.
- About 20–25 inspections; the expected count per inspection not tiny.

## Procedure and calculation
- DPU = Σcᵢ / Σnᵢ = C / N.
- Exact interval on the rate (from the Poisson–χ² relation):
  lower = χ²(α/2; 2C) / (2N), upper = χ²(1 − α/2; 2C + 2) / (2N);
  with C = 0 the 95% upper bound is −ln(0.05)/N ≈ 3/N.
- Share of units with at least one fault (Poisson): 1 − e^(−DPU).
- u-chart: ū ± 3·√(ū/nᵢ) per inspection (c-chart when every nᵢ is equal: c̄ ± 3√c̄); Laney u′ for very large nᵢ.
- DPMO = 10⁶ · C / (N · opportunities per unit) — only with opportunities
  defined once and kept fixed (`sixsigma.dpmo-sigma`).
- Verdict against an agreed maximum DPU, by its upper bound, as for a
  proportion (`spc.capability-attribute-proportion`).

## Assumptions, limits and misuse
- Faults independent and at a constant rate within an inspection; clusters
  (a whole tray marked by one hot spot) are not Poisson — stratify by cause.
- **Inflating opportunities** makes DPMO and sigma look better for the same
  faults; never compare DPMO between products with different opportunity counts.
- Units must be the same size (or nᵢ measured in a common unit — metres, kg).
- Not for good/bad units: a pack rejected is one defective however many faults it had.

## Reading the result
"37 faults on 500 packs — 0.074 a pack (0.059–0.10, 95%), at most 0.05
agreed — not met; about 7 packs in 100 have at least one." Then the Pareto
of fault types and where on the pack (`quality.defect-concentration`).

## When not to use it — and instead
- Only good/bad matters (the pack is rejected or not) → `spc.capability-attribute-proportion`.
- The fault is a measurement out of limits → measure it (`spc.capability-measured`).

## In food and FMCG manufacturing
Print and registration flaws per reel; foreign-matter finds per tonne
(internal); marks, cracks or colour faults per tray of bakes; sandwich
assembly faults per 100; label faults per pallet.

## References
- [manual] AIAG, *Statistical Process Control (SPC) Reference Manual*, 2nd ed., 2005 — c and u charts.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — control charts for nonconformities (defects).
- [standard] ISO 22514-5:2019 — scope checked online 22 Oct 2026; formulas not read.
- [textbook] Breyfogle, F.W., *Implementing Six Sigma*, 2nd ed., Wiley, 2003 — DPU, DPMO and opportunities (from knowledge; edition to confirm).

## In Faultline
Specified as part 3 of the capability study (`knowledge/specs/FC-094-capability.md`); not built.
