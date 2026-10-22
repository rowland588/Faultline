---
id: spc.capability-attribute-proportion
name: Capability of a reject rate — proportion defective (binomial capability)
aka: [reject rate, pass rate, yield, proportion defective, binomial capability, percent defective, PPM defective, process Z]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — ISO 22514-5:2019 (capability for attributive characteristics) exists and is current, scope read online, its formulas not read (paywalled — knowledge/GAPS.md); method as the AIAG SPC manual's attribute chapter and Montgomery; exact bounds Clopper & Pearson (1934); Laney p′ confirmed in secondary sources 22 Oct 2026
needs: [spc.control-charts-attribute]
next: [quality.pareto, quality.check-sheet, rca.fishbone-5whys]
alternatives: [spc.capability-attribute-defects, spc.zero-failure-demonstration, spc.capability-measured]
related: [stats.confidence-intervals, sixsigma.dpmo-sigma, quality.fpy-rty, cost.line-cost-model]
---
# Capability of a reject rate — proportion defective (binomial capability)

## Purpose and principle
Whether a process that judges each unit good or not good — a reject, a
leaker, a mislabel, an out-of-weight pack — rejects no more than an agreed
share, and whether that share is steady. Each unit is a trial with the same
chance p of being defective; counted in runs (an hour, a shift, a batch),
the defectives follow the binomial distribution. Capability for counted data
*is the proportion itself* once the process is stable — not a Cpk worked from
percentages.

## Questions it answers
- What share of production is rejected, and how sure is that figure?
- Is the reject rate steady, or did some runs reject far more than chance makes?
- Does it meet the agreed maximum (or the pass rate the agreed minimum)?
- Is the rate changing over time — after a fix, a new film, a new shift?
- How does it compare with a measured characteristic's Ppk (the equivalent Z)?

## Inputs and minimum conditions
- Per run (subgroup): the number made or inspected **nᵢ** and the number
  defective **dᵢ** — the denominator is what was actually judged (every pack
  through a checkweigher; the packs sampled in a dunk test).
- What counts as defective, written down: a pack with three faults is *one*
  defective (faults are `spc.capability-attribute-defects`). Re-fed packs,
  false rejects and test packs said how they are counted.
- The agreed maximum share defective (or minimum share good) — agreed first.
- About 20–25 runs for a stable estimate (AIAG); the chart needs nᵢ·p̄ of at
  least about 1 to 5 to show anything.

## Procedure and calculation
- p̄ = Σdᵢ / Σnᵢ; pass rate = 1 − p̄; per million = 10⁶·p̄.
- Each run's pᵢ = dᵢ / nᵢ.
- **How sure — exact (Clopper–Pearson) interval** on D = Σdᵢ of N = Σnᵢ:
  lower = B(α/2; D, N − D + 1), upper = B(1 − α/2; D + 1, N − D), B the
  beta quantile; the one-sided 95% upper bound is B(0.95; D + 1, N − D).
  With D = 0 the lower bound is 0 and the upper 1 − 0.05^(1/N).
- **Steady? — the p-chart.** Limits for each run p̄ ± 3·√(p̄(1 − p̄)/nᵢ)
  (the lower cut at 0). A run outside is more than chance makes — a special
  cause. With very large runs (thousands) real run-to-run variation makes the
  limits too tight; Laney's p′: zᵢ = (pᵢ − p̄)/σpᵢ, σz = MR̄(z)/1.128,
  limits p̄ ± 3·σpᵢ·σz.
- **The equivalent Z** (process Z, Z bench): Z = Φ⁻¹(1 − p̄); a "Ppk
  equivalent" Z/3 for comparison with measured characteristics — 1% → Z 2.33
  → 0.78; Ppk 1.33 ↔ about 32 per million. Said as a comparison only: it
  assumes a normal process underneath.
- **The verdict against the agreed maximum p₀** (Faultline's reading): met
  when the 95% upper bound ≤ p₀ and no run is outside the chart's limits;
  not shown yet when p̄ ≤ p₀ but the bound is above it; not met when p̄ > p₀
  (clearly so when the 95% lower bound is above p₀).
- **Before → after**: two proportions compared (`stats.two-sample-tests`).

## Assumptions, limits and misuse
- Constant p within a run and independent units. Rejects that come in
  bursts (a jam throws ten in a row) break independence — the chart shows it.
- **Defective units, not defects**: count the pack once. Mixing the two
  inflates the rate.
- The right denominator: rejects ÷ packs judged, never ÷ good packs.
- A checkweigher's or metal detector's own false rejects are rejects of the
  process as it runs, but a different cause — keep the reason.
- Cpk on a percentage is a misuse: the percentage is bounded at 0 and its
  spread depends on its level.
- A low rate needs a large N: 0 rejects in 300 packs proves only "under 1%".

## Reading the result
"14 rejected of 1,200 — 1.17% (98.83% good), at most 1% agreed — not met.
95% sure it is 0.64–1.95%. Run 4 at 3.1% is more than chance makes." Then
which defect types (`quality.pareto`) and where the rejects are made against
the bottleneck (a reject made after the constraint cost constraint time).

## When not to use it — and instead
- Faults counted on a unit that can have several → `spc.capability-attribute-defects`.
- A handful of items, all passing, to prove a fix → `spc.zero-failure-demonstration`.
- The characteristic behind the reject can be measured (weight, seal
  strength) → measure it: `spc.capability-measured` tells far more from far
  fewer units.

## In food and FMCG manufacturing
Checkweigher rejects a shift; metal detector rejects (true and false
separated); vision rejects for label and date code; leakers found in a dunk
or vacuum test; bag-maker splice rejects; trays rejected at the lidder.
What a reject costs: its materials and packaging, and — when it is made
after the line's constraint — the constraint time it used, which is lost
output (`cost.line-cost-model`).

## References
- [standard] ISO 22514-5:2019, *Statistical methods in process management — Capability and performance — Part 5: Process capability estimates and performance for attributive characteristics* — scope checked online 22 Oct 2026; formulas not read.
- [manual] AIAG, *Statistical Process Control (SPC) Reference Manual*, 2nd ed., 2005 — control charts for attributes; capability of attribute processes.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — control charts for attributes.
- [paper] Clopper, C.J. and Pearson, E.S. (1934), "The use of confidence or fiducial limits illustrated in the case of the binomial", *Biometrika* 26(4), 404–413.
- [paper] Laney, D.B. (2002), "Improved control charts for attributes", *Quality Engineering* 14(4), 531–537 — via secondary sources, 22 Oct 2026.

## In Faultline
Specified as part 2 of the capability study (`knowledge/specs/FC-094-capability.md`),
not built yet. The loss count already counts rejects in a shift
(`src/lib/ie/losses.ts`) as time lost, not as a capability.
