---
id: lean.product-family-pq
name: Product families and P–Q analysis
aka: [product family matrix, PQ analysis, product quantity analysis, volume Pareto, routing matrix, family grouping]
discipline: lean
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the product family matrix as Rother & Shook (1999) and Muther's P–Q analysis in *Systematic Layout Planning* (1973); the similarity measure (Jaccard on shared steps) is a choice of this record, said so; from knowledge, texts not re-read; the worked matrix in `scripts/knowledge/cases-lean.py`
needs: []
next: [lean.value-stream-mapping, planning.runner-repeater-stranger]
alternatives: []
related: [quality.pareto, ergonomics.layout-from-to, planning.lot-sizing]
---
# Product families and P–Q analysis

## Purpose and principle
Before a value stream is mapped or a line laid out, two questions:
which products belong together because they go through the same steps
(a **family**), and which few products make most of the volume (the
**P–Q** curve — products against quantity, a Pareto). The family matrix
lists products down and process steps across, a mark where a product
uses a step; products with most marks in common are one family and are
mapped and laid out together. The P–Q curve ranks products by volume
and draws the cumulative share: the steep head is made on a dedicated
line or flow, the long tail on a flexible one or in a job shop. Both
are the first page of a map and the first decision of a layout.

## Questions it answers
- Which products share the process and so belong on one map and one
  line?
- Which products make 80% of the volume, and how many are they?
- Where does the curve bend — the boundary between dedicated flow and
  flexible capacity?
- Does a new product fit an existing family or need its own?

## Inputs and minimum conditions
- The product list with each product's routing: the process steps (and
  machines) it uses, in order.
- Each product's volume in the period (a representative year or
  quarter), in a common unit (packs, kg, cases).
- Where it matters, the allergen and hygiene constraints that split a
  process family into two.

## Procedure and calculation
- Family matrix: products × steps, a mark where used; products grouped
  by shared steps — by eye for a dozen products, or by a similarity
  measure for many: Jaccard similarity = shared steps ÷ steps used by
  either; products at or above a threshold (0.6 is a reasonable start,
  said as the choice) grouped, and the threshold adjusted so the groups
  make sense on the floor.
- P–Q: products ranked by volume; cumulative share; the number making
  80% (`quality.pareto`); the curve's shape — steep (few products
  dominate → dedicated line), shallow (many similar → flexible line,
  families and changeovers matter), or two-humped (two kinds of
  operation).
- The families carried into the map (`lean.value-stream-mapping` — one
  map per family) and into scheduling (`planning.runner-repeater-stranger`
  — the frequency view of the same products).
- Review when the range changes; a new product placed in its family
  by its routing before it is launched.

**Worked case** (`cases-lean.py`): 20 products, 16,880 a week. The top
6 make 82% of the volume, the top 8 89% — a steep head for a dedicated
flow and a long tail of 12 products making 11%. Routings: P1 (mix, fill,
seal, label) and P2 the same — Jaccard 1.0; P4 adds a sleeve — 0.8;
P3 and P5 (mix, depose, bake, pack) — 1.0 with each other, 0.14 with
P1; P6 (weigh, bag, seal) — 0.17 with P1. Families at ≥ 0.6: {P1, P2,
P4}, {P3, P5}, {P6} — three maps, and the nut-containing variant of P2
a sub-family by the allergen sequence.

## Assumptions, limits and misuse
- A family by sales category or by customer is not a family by process;
  the routing decides.
- Volume in different units (packs of 200 g and of 1 kg) misranks the
  curve; use the unit the bottleneck sees (kg, or minutes of line time).
- Last year's volumes rank last year's products; use the forecast where
  the range is changing.
- The Jaccard threshold is a knob; the groups are checked against the
  floor, not accepted from the arithmetic.
- Allergen and hygiene constraints can split a process family; the
  matrix shows the process, the plan shows the constraint.

## Reading the result
"Six products are 82% of the volume; three process families; family A
(P1, P2, P4) is the dedicated line's map." Money: the head's products at
the line's contribution a pack are where capacity is worth most
(`knowledge/MONEY.md`, T); the tail's changeovers are where the time
goes (`changeover.smed`).

## When not to use it — and instead
Scheduling by frequency of demand → `planning.runner-repeater-stranger`.
The map itself → `lean.value-stream-mapping`. Layout by movement between
places → `ergonomics.layout-from-to`. Batch size by cost →
`planning.lot-sizing`.

## In food and FMCG manufacturing
Pack sizes and recipes grouped by line and by allergen; a bakery's
ranges by oven and depositor; a ready-meal plant's families by tray
format; the long tail of promotional packs.

## References
- [textbook] Rother, M. and Shook, J. (1999), *Learning to See*, Lean Enterprise Institute — the product family matrix (from knowledge).
- [textbook] Muther, R. (1973), *Systematic Layout Planning*, 2nd ed., Cahners — P–Q analysis (from knowledge).
- [textbook] Tompkins, J.A. et al. (2010), *Facilities Planning*, 4th ed., Wiley — product and volume analysis for layout (from knowledge).

## In Faultline
Not built (FC-002). The line holds its products (`src/line`) and the
map is a line's (`src/tools/valuestream`); FC-002 would read the
factory's products with their lines' routings and volumes, draw the P–Q
curve and the family matrix, and hand each family to its map.
