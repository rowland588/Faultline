---
id: quality.complaints
name: Customer complaints — the rate per million, its bounds and what is really changing
aka: [CPMU, complaints per million units, complaint rate, complaint Pareto, consumer complaints]
discipline: quality
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — CPMU as the food industry's measure (retailer scorecards; no single standard — from knowledge); the Poisson exact bounds and u-chart limits as `spc.capability-attribute-defects`; the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: []
next: [quality.pareto, rca.eight-d]
alternatives: []
related: [spc.capability-attribute-defects, quality.supplier-quality, quality.copq]
---
# Customer complaints — the rate per million, its bounds and what is really changing

## Purpose and principle
Complaints are the faults that got through, counted by the customer; a
retailer reads them per million units sold and compares suppliers on it.
The count is small and lumpy — seven one month, twelve the next — so the
first job is to say how sure the rate is before anyone reacts to a bad
month; the second is the Pareto by kind and product, which points at the
process; the third is the formal response (`rca.eight-d`) the customer
expects on each serious one.

## Questions it answers
- What is the complaint rate per million, and is this month really worse?
- Which kinds and products make most of it?
- Is a change (a new film, a fix on the sealer) showing in the complaints
  — allowing for the lag?

## Inputs and minimum conditions
- Every complaint logged with its date received, the product, the
  pack's date or lot code, the kind (foreign body, taste, packaging,
  quantity, labelling …), its seriousness, and what was done.
- Units sold (or despatched) in the same period, by product — the
  denominator.
- The lag between manufacture and complaint (weeks for an ambient
  product) so complaints are matched to the production period, not the
  month received.

## Procedure and calculation
- CPMU = complaints ÷ units × 10⁶, per period and per product.
- How sure: the exact Poisson interval — lower χ²(0.025; 2c)/(2N), upper
  χ²(0.975; 2c + 2)/(2N), scaled to a million; with c = 0 the upper bound
  is about 3/N × 10⁶.
- Is the month unusual: a u-chart on the periods — centre ū = Σc/ΣN,
  limits ū ± 3√(ū/Nᵢ) for the period's units; or an exact test of two
  rates (conditional on the total, c₁ of c₁ + c₂ is binomial with
  p = N₁/(N₁ + N₂)).
- The Pareto by kind and by product, and the cross-table kind × product
  (`stats.chi-square-association`) — "foreign body" concentrated in one
  product is a line's problem, spread across all a site's.
- By production week (through the lot code) to see a change's effect;
  seriousness weighted where the customer weights it (a foreign body is
  not a crease).
- Each serious complaint: containment, cause and correction as the
  customer's format asks (`rca.eight-d`).

**Worked case** (`cases-quality.py`): 7 complaints on 1.2 M units → 5.8
CPMU (95%: 2.4–12.0); 12 on 1.25 M → 9.6 (5.0–16.8); 3 on 400 k → 7.5
(1.6–21.9). The year's mean 7.4; the u-chart's upper limit for a 1.2 M
month is 14.8, so 12 complaints (10.0 CPMU) is inside — not a signal. The
exact comparison of the 12 against the 7: p = 0.41. The twelve are worth
reading one by one; they are not evidence the process changed.

## Assumptions, limits and misuse
- Reacting to a month: with counts under 20 the interval is wide; the
  chart decides, not the feeling.
- Complaints under-report by a factor nobody knows (most people throw the
  pack away); the rate compares like with like over time, never says the
  true defect rate.
- The denominator must be the same product and period as the complaints;
  a launch month's small sales make a huge CPMU from two complaints.
- Matching to the month received instead of the lot made hides the
  effect of a fix for weeks.
- Kinds coded loosely ("quality") are useless; code what the customer
  said.

## Reading the result
"9.6 complaints a million this month (5–17 at 95%) against a year's 7.4 —
inside the usual range; 5 of the 12 are foreign body on the 500 g line,
which is new." Money: each complaint's handling and goodwill cost (the
retailer's charge-back where there is one), and the complaint rate's
weight in the retailer's scorecard (`knowledge/MONEY.md`, C); the fix's
worth is complaints avoided × that.

## When not to use it — and instead
Faults counted inside the factory → `quality.check-sheet`,
`spc.capability-attribute-defects`. One serious complaint's investigation
→ `rca.eight-d`. A supplier's defects → `quality.supplier-quality`.

## In food and FMCG manufacturing
Retailer complaint reports (per million as they score it), consumer
careline logs, foreign-body complaints as the first-tier metric in every
BRCGS audit conversation, packaging complaints after a film change.

## References
- [practice] Retailer technical standards (Tesco, Sainsbury's and others score suppliers on complaints per million units) — from knowledge; no single public text.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — c and u charts for rare events (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 3.10 — complaint handling: recorded, investigated, trended, actions taken (from knowledge; clause number not confirmed against the text).

## In Faultline
Not built (FC-134). When built: complaints logged like problems on the
register (`src/snag`) with product, lot code and kind, the units typed
per period, CPMU with its bounds and its u-chart on the line's page, the
Pareto by kind × product, and a serious one opening an 8D.
