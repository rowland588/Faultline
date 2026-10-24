---
id: quality.supplier-quality
name: Supplier quality — parts per million, its bounds, the trend and the scorecard
aka: [supplier PPM, incoming quality, supplier scorecard, supplier rating, vendor quality, incoming inspection]
discipline: quality
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — PPM and the scorecard as industry practice (automotive and food supplier-quality programmes, from knowledge; no single standard); the Clopper–Pearson bounds and Fisher's exact test as `stats.confidence-intervals` and `stats.chi-square-association`; the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: []
next: [quality.acceptance-sampling-attributes]
alternatives: []
related: [quality.complaints, quality.nonconformance-hold, foodsafety.audits]
---
# Supplier quality — parts per million, its bounds, the trend and the scorecard

## Purpose and principle
What arrives sets what can be made: film that will not seal, trays out
of size, ingredients off-spec. Supplier quality counts the defective
units found against the units received, per supplier and per material, as
parts per million — and because the counts are small, says how sure each
figure is before suppliers are ranked on it. Over time the trend, the
holds raised and the responses to them make the scorecard that decides
who is audited, developed or replaced.

## Questions it answers
- What is each supplier's defect rate, and how sure is it?
- Is supplier B really worse than A, or is that three bad deliveries?
- Is a supplier improving after the 8D they returned?
- Which materials cause the holds and the line stops?

## Inputs and minimum conditions
- Per delivery: supplier, material, quantity received (units, or kg
  converted to units), quantity rejected and why (at receipt, and found
  later in use — both, said apart), the hold or NCR reference.
- The acceptance plan in use at receipt (`quality.acceptance-sampling-attributes`),
  so a "zero rejects" is read with the plan's power.
- The supplier's response record: 8D returned, on time, effective.

## Procedure and calculation
- PPM = defective units ÷ units received × 10⁶, per supplier and material,
  per period.
- How sure: the Clopper–Pearson interval on the proportion (lower
  Beta⁻¹(0.025; d, n − d + 1), upper Beta⁻¹(0.975; d + 1, n − d)), scaled
  to a million; with d = 0 the upper bound is about 3/n × 10⁶.
- Two suppliers compared: Fisher's exact test on the 2×2 (defective /
  good × A / B), or the two-proportion test when counts are large.
- Trend: PPM by month on a p-chart (`spc.control-charts-attribute`) with
  limits from the supplier's own history; a point beyond or a run says
  change.
- Defects found in use (a reel that sealed badly on the line) weighted
  by their consequence — the line's lost minutes and rework, from the
  problem's record (`knowledge/MONEY.md`, T and Q) — so a supplier's cost
  is not only the units.
- Scorecard: PPM (with its bound), on-time 8D responses, holds raised,
  the cost caused — each said, never blended into one score without the
  weights written.
- Incoming inspection reduced or skipped (dock-to-stock) only when the
  supplier's bound has been under the agreed level for a run of
  deliveries; tightened on any hold.

**Worked case** (`cases-quality.py`): A — 14 defective of 180,000 → 78 ppm
(95%: 43–130); B — 3 of 22,000 → 136 ppm (28–398); C — 0 of 60,000 → 0 ppm
(0–61). B *looks* worse than A, but Fisher's exact test gives p = 0.42:
not shown different — B has had a fifth of the volume. C's zero is
"under 61 ppm", not zero. Ranking them A, C, B on the point figures would
be wrong twice.

## Assumptions, limits and misuse
- Small counts: three bad units from a new supplier make a huge PPM with a
  huge bound; the bound is said with the figure.
- Rejects found at receipt depend on how hard the plan looks; a supplier
  inspected harder looks worse.
- PPM counts units; a single reel that stops the line for an hour is one
  unit — the cost caused must be counted beside it.
- Units of different size (a reel, a pallet of trays) make PPM across
  materials meaningless; per material, or in a common unit.
- A scorecard with hidden weights is an argument, not a measure.

## Reading the result
"Supplier B: 136 ppm this quarter (28–398 at 95%) — not shown different
from A's 78; one reel cost Line 2 an hour (£X). Watch, don't act." Money:
the holds and line stops each supplier's material caused, from the
problems' own records (`knowledge/MONEY.md` T, Q, H), beside the PPM.

## When not to use it — and instead
Deciding one lot → `quality.acceptance-sampling-attributes` or
`quality.acceptance-sampling-variables`. The hold itself →
`quality.nonconformance-hold`. Food-safety approval of a supplier
(audits, certificates) → `foodsafety.audits`.

## In food and FMCG manufacturing
Packaging suppliers (film, trays, lids, labels, cases — the defects that
stop packing lines), ingredient suppliers (off-spec, foreign matter,
weight short), co-packers; the retailer's own supplier scorecard turned
round on the site's suppliers.

## References
- [practice] Automotive supplier-quality practice (PPM, 8D, scorecards — IATF 16949 clause 8.4 and customer-specific manuals) — from knowledge; no single public text.
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 3.5 — supplier and raw material approval and performance monitoring (from knowledge; clause not confirmed against the text).
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — p-charts and the comparison of proportions (from knowledge).

## In Faultline
Not built (FC-136). The register's problems already carry the machine,
material and cost (`src/snag`, `src/lib/problemCost.ts`); FC-136 adds the
supplier and the delivery's quantity to a material's record, counts PPM
with its bound per supplier, draws the trend, and sums the cost each
supplier's material caused from the problems that name it.
