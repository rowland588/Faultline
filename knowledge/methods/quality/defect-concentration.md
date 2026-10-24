---
id: quality.defect-concentration
name: Where on the pack, where on the machine — the defect concentration diagram
aka: [concentration diagram, measles chart, location plot, defect map, where the faults are]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the concentration diagram as Montgomery ch. 5 and Ishikawa give it (from knowledge); the test of uniformity across regions (chi-square goodness of fit) and the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: []
next: [rca.fishbone-5whys]
alternatives: []
related: [quality.check-sheet, quality.pareto, stats.chi-square-association]
---
# Where on the pack, where on the machine — the defect concentration diagram

## Purpose and principle
A fault's *position* is a clue its count is not: seal wrinkles always on
the right-hand jaw, label skew always at the top edge, dents on the
leading corner of the case. A drawing of the pack (or the reel, the tray,
the machine) with a mark where each fault was found concentrates the
evidence; a cluster points at one part of one machine, a scatter at
something general. It is the cheapest root-cause tool there is, and the
one photographs make easy.

## Questions it answers
- Are the faults in one place, or everywhere?
- Which jaw, lane, head, corner, zone?
- Did the fix move or remove the cluster?

## Inputs and minimum conditions
A drawing or photograph of the thing with a fixed orientation (leading
edge, operator side marked); 30+ faults marked at their position, each
as it was found; the kind of fault per mark where more than one kind is
being watched (a symbol or colour per kind).

## Procedure and calculation
- Mark each fault at its position; keep the marks from one period or
  batch together so a change shows.
- Divide the drawing into regions that mean something (the four seal
  edges; left/centre/right lanes; a 3×3 grid; the machine's stations) and
  count per region.
- Uniform or not: a chi-square goodness-of-fit of the region counts
  against equal expectation (or expectation in proportion to each
  region's area or exposure): χ² = Σ(O − E)²/E, df = regions − 1; a small
  p says the faults are concentrated. The region with the largest
  standardised residual is the place.
- Concentration share: the heaviest region's share of all faults — the
  figure to say ("70% on the right third").
- By kind × region (`stats.chi-square-association`) when kinds differ:
  wrinkles on the right, print faults at the top are two causes.
- The same drawing after the fix, the same period length, for the before
  → after.

**Worked case** (`cases-quality.py`): 37 seal faults on a pillow pack
marked on a 3×3 grid — 2, 3, 14 / 1, 2, 9 / 2, 1, 3. Against uniform:
χ² 38.2 (df 8), p = 7×10⁻⁶ — concentrated; the right column holds 70%
(26 of 37). The right-hand side of the pack is the trailing jaw on this
wrapper; the clue is the jaw, not the film.

## Assumptions, limits and misuse
- Orientation must be fixed: a pack marked "top" by whoever held it
  scatters a real cluster.
- Regions chosen after looking at the marks make any cluster
  "significant"; choose them by the thing's parts.
- Few marks (under 20) show patterns that are chance; wait, or say the
  count.
- Where a fault is found is not always where it is caused (a dent at the
  palletiser, caused at the case packer); the drawing says where, the
  walk says why.
- Faults found at one inspection point are the ones that reached it;
  earlier removal biases the map.

## Reading the result
"37 seal faults this week: 70% on the right-hand edge — the trailing jaw."
Then the jaw's inspection and the cause (`rca.fishbone-5whys`); the money
is the cluster's share of the faults' cost — 26 of the 37 × what a seal
fault costs (`knowledge/MONEY.md`, Q) — which one jaw's repair recovers.

## When not to use it — and instead
The kinds and their rates → `quality.check-sheet` and `quality.pareto`.
Position as a measurement (the seal's offset in mm) →
`spc.control-charts-variables` on the offset.

## In food and FMCG manufacturing
Seal faults by edge and jaw; label and print faults by position on the
pack; dents and crush damage on cases by corner; foreign-body finds by
area of the tray; burnt or pale product by position on the oven belt;
checkweigher rejects by lane.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 5 — the defect concentration diagram among the seven tools (from knowledge; edition to confirm).
- [textbook] Ishikawa, K., *Guide to Quality Control*, 2nd rev. ed., APO, 1982 (from knowledge).

## In Faultline
Not built (FC-126). A problem's photo can already be marked
(`src/snag/QuickSnagsScreen.tsx`); FC-126 keeps a drawing or photo per
product or machine on the line, lets each fault be tapped where it was
found with its kind, counts by region, says whether it is concentrated and
where, and feeds the cluster to the 6M fishbone as evidence.
