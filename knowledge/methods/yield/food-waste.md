---
id: yield.food-waste
name: Food waste — measured by stage and cause, valued, and sent down the hierarchy
aka: [food waste, waste by stage, WRAP, Target Measure Act, food waste hierarchy, surplus, waste mapping]
discipline: yield
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — WRAP and IGD's *Food Waste Reduction Roadmap* ("Target, Measure, Act") and the food and drink material hierarchy as WRAP publishes them (from knowledge; current edition and guidance to confirm — WRAP's site not fetchable from here); the Food Loss and Waste Protocol's accounting standard (FLW Standard, 2016) named from knowledge; the worked week in `scripts/knowledge/cases-operations.py`
needs: []
next: [quality.pareto]
alternatives: [yield.mass-balance-yield]
related: [sustainability.waste-streams, yield.mass-balance-yield, quality.nonconformance-hold]
---
# Food waste — measured by stage and cause, valued, and sent down the hierarchy

## Purpose and principle
Food that was made and not sold as intended: trim, start-up and
changeover product, rejects, spillage, end-of-life stock. WRAP's roadmap
asks a site to *target* a reduction, *measure* the waste by where and
why it arises, and *act* on the largest causes — and to send what
remains down the hierarchy (prevent · redistribute to people · animal
feed · anaerobic digestion or composting · energy recovery · disposal)
rather than straight to the skip. The measure is kilograms by stage and
cause, as a share of input, valued at material cost — the same cells the
mass balance and the cost deployment hold, read for the waste question.

## Questions it answers
- How much food waste a week, where in the process and why?
- What share of the input is it, and what does it cost?
- Where does each stream go (the hierarchy), and could it go higher?
- Is the roadmap target being met (the trend)?

## Inputs and minimum conditions
- The waste weighed by stage and cause, per shift or batch — bins
  labelled and weighed, not estimated; the input kg for the share.
- Each stream's destination (redistribution, feed, AD, disposal) and its
  cost or income per tonne.
- The material cost per kg (`knowledge/MONEY.md` §3) for the value lost.

## Procedure and calculation
- Waste by stage and cause (kg); total; share of input = total ÷ input
  kg (WRAP's metric is usually % of production or tonnes per tonne).
- Value lost = kg × material cost per kg (ingredients and the processing
  to that stage where it is counted; at least the materials) —
  `knowledge/MONEY.md`, Y; plus the disposal cost per tonne, less any
  income (feed, AD gate fee avoided).
- The Pareto of causes (`quality.pareto`); the top cause's method —
  trim: the slicer's set-up and the product's shape; changeover product:
  SMED and the first-off (`changeover.first-off-release`); rejects: the
  capability study; end-of-life: the hold and the plan
  (`quality.nonconformance-hold`, `planning.schedule-adherence`).
- The hierarchy applied per stream: could the trim be a product (crumb,
  croutons)? redistributed? feed? — each step up is money and the
  roadmap's measure.
- Trend against the target (`stats.time-series-trend`); the FLW
  Standard's scope (which streams, which destinations) stated so figures
  compare year to year.

**Worked case** (`cases-operations.py`): a line's week — trim at slicing
310 kg (1.5% of 20,350 kg input), start-up and changeover product 140,
rejects 95, end-of-life stock 60, floor and spillage 40; total 645 kg =
3.2% of input, £1,193 a week at material cost (£57,000 a year). Trim is
48% of it — the slicing programme (the blade, the loaf shape, the end-
slice policy) is the first project; the changeover product (22%) is
SMED's and the first-off's.

## Assumptions, limits and misuse
- Estimated bin weights ("about half full") are the usual data and are
  wrong by half; weigh the bins.
- Waste that is reworked is not waste; waste that is redistributed still
  counts as surplus in the roadmap's measure (destination matters).
- The share of input is sensitive to what counts as input (ingredients
  issued vs dough made); the FLW scope is written down once.
- Valuing waste at the finished product's price overstates it; material
  cost (and processing to that stage, if counted) is honest.
- A target without a measurement by cause is a wish; the Pareto makes
  it a plan.

## Reading the result
"645 kg of food waste this week — 3.2% of input, £1,200: trim is half
of it, changeover product a fifth. The trim goes to feed; two tonnes a
year could be crumb." Money: kg × material cost (`knowledge/MONEY.md`,
Y) and the disposal cost, per week and per year; each step up the
hierarchy priced.

## When not to use it — and instead
The kilograms through every stage, including process losses →
`yield.mass-balance-yield`. The money against the recipe standard →
`yield.material-variance`. Packaging, water and energy waste →
`sustainability.waste-streams`.

## In food and FMCG manufacturing
Every site reporting to the roadmap or to a retailer's waste target:
bakeries' trim and end slices, meat trim and cook loss, ready-meal
component surplus, sandwich assembly offcuts, start-up product on
depositors and fillers, date-expired stock.

## References
- [practice] WRAP and IGD, *Food Waste Reduction Roadmap* (2018, updated) — Target, Measure, Act; the reporting template (from knowledge; current edition to confirm, not fetchable from here).
- [standard] Food Loss and Waste Protocol, *Food Loss and Waste Accounting and Reporting Standard* (FLW Standard), 2016 — scope and destinations (from knowledge).
- [practice] WRAP, the food and drink material hierarchy (from knowledge).

## In Faultline
Not built (FC-161). The loss count and the register hold rejects and
waste events on the line (`src/tools/losses`, `src/snag`); FC-161 adds
the weighed waste by stage, cause and destination, the share of input,
the money, the Pareto and the trend against the site's target.
