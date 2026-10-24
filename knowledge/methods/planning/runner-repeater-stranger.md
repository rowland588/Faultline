---
id: planning.runner-repeater-stranger
name: Runners, repeaters and strangers — products classed by volume and regularity
aka: [RRS, runner repeater stranger, product classification, ABC-XYZ, demand classification, volume and variability]
discipline: planning
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the runner/repeater/stranger classification as lean planning practice (Lucas Industries' origin; Bicheno's *Lean Toolbox*) and the ABC-XYZ equivalent (from knowledge); the worked year in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [lean.heijunka-epei]
alternatives: [lean.product-family-pq]
related: [planning.forecast-accuracy, planning.lot-sizing, planning.safety-stock]
---
# Runners, repeaters and strangers — products classed by volume and regularity

## Purpose and principle
Not every product deserves the same planning. A runner sells steadily
in volume and can be levelled into a fixed slot every day or week; a
repeater sells regularly but less and takes a slot every few weeks; a
stranger sells rarely or wildly and is made to order or from a small
stock. Classing the products by their volume share and the variability
of their demand (the coefficient of variation) tells the planner which
to level, which to batch and which to leave outside the level plan —
and the forecast which products it can hope to get right.

## Questions it answers
- Which products are the runners the plan should be built around?
- Which are strangers that should not be in the level schedule at all?
- How does the classification change over the year (seasonal strangers)?
- What safety stock and forecasting effort does each class deserve?

## Inputs and minimum conditions
- Demand per product per period (weekly, 48–52 periods) — orders or
  despatches, in a common unit.
- The thresholds the site agrees (below), written down.

## Procedure and calculation
- Volume share per product = its total ÷ all; sorted (the ABC Pareto:
  A the top ~80% of volume).
- Variability per product: CV = standard deviation of the weekly
  demand ÷ its mean (XYZ: X under ~0.5, Y 0.5–1.0, Z over 1.0 — the
  bands the site agrees); the share of weeks with any demand
  (intermittency).
- Class: **runner** — high share (say over 10–15%) and low CV (under
  0.5), demand every week; **stranger** — CV over 1.0 or demand in
  under half the weeks, whatever the volume; **repeater** — the rest.
- Each class's treatment: runners levelled into fixed slots
  (`lean.heijunka-epei`), forecast tightly, small safety stock;
  repeaters in the level plan's flexible slots, batched by the EPQ
  (`planning.lot-sizing`); strangers made to order or from a stock sized
  by their variability (`planning.safety-stock`), never allowed to
  disturb the runners' slots.
- Re-classed each quarter; a stranger that becomes a repeater (a new
  listing taking off) moves into the plan.
- The P–Q analysis (`lean.product-family-pq`) is the same Pareto with
  routings, for the cell or line design question.

**Worked case** (`cases-planning-foodsafety.py`): six products over 48
weeks. Maris 2 kg 35% share, CV 0.10; Tesco 1.25 kg 26%, CV 0.17; King
Edward 2.5 kg 18%, CV 0.31 — runners. Baby 1 kg 15%, CV 0.28 — a
repeater on share (just under the runner threshold); Hotel 5 kg 3%,
CV 0.79, demand in 79% of weeks — a repeater; Xmas 3 kg 3%, CV 1.04,
demand in 67% of weeks — a stranger. The three runners are 79% of the
volume: they take the fixed slots; the Xmas pack stays out of the level
plan and is made to the order.

## Assumptions, limits and misuse
- Thresholds are the site's and are written; a product on the line
  between classes is a judgement, said as such.
- CV on a seasonal product mixes the season's variability with the
  trend; class within the season, or by a de-seasonalised series.
- A stranger that is a key customer's product is still a stranger for
  planning; the service it needs is met by stock, not by breaking the
  runners' rhythm.
- Classing by sales value instead of volume changes the answer; the
  line plans in packs, finance in pounds — say which.
- The classes are inputs to the plan, not a judgement of the products.

## Reading the result
"Three runners (79% of volume) take the fixed slots every day; Baby and
Hotel are repeaters in the flexible slots; the Christmas pack is a
stranger — made to order, kept out of the level plan." Money: the
runners' levelled stock against batching (`knowledge/MONEY.md`, I); the
strangers' safety stock or expedite cost (I, T).

## When not to use it — and instead
The level plan itself → `lean.heijunka-epei`. Run lengths →
`planning.lot-sizing`. Stock for the variable products →
`planning.safety-stock`. Product families for line design →
`lean.product-family-pq`.

## In food and FMCG manufacturing
The core range against the tail: own-label volume lines, promotional
packs, seasonal products, food-service sizes — every multi-product
packing line's plan starts by sorting them.

## References
- [textbook] Bicheno, J. and Holweg, M., *The Lean Toolbox*, 5th ed., PICSIE Books, 2016 — runners, repeaters and strangers (from knowledge).
- [practice] Lucas Industries' manufacturing systems engineering (1980s) — the origin of the terms (from knowledge).
- [textbook] Silver, Pyke & Thomas, 2017 — ABC and XYZ classification (from knowledge).

## In Faultline
Not built (FC-181). The week's orders exist in the load against demand
(`src/lib/intelligence/demand.ts`); FC-181 adds the weekly history per
product, the share and CV, the class by the site's thresholds, and the
treatment each class gets in the level plan.
