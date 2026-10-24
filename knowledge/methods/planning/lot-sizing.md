---
id: planning.lot-sizing
name: Lot sizing — the economic production quantity, and why SMED shrinks it
aka: [EPQ, EOQ, economic batch quantity, run length, campaign size, lot size, EBQ]
discipline: planning
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Harris's (1913) EOQ and the EPQ (finite production rate) form as Silver, Pyke & Thomas (2017) give them (from knowledge); the worked case with SMED's two changeover times in `scripts/knowledge/cases-planning-foodsafety.py`
needs: [changeover.smed]
next: [lean.heijunka-epei]
alternatives: [lean.heijunka-epei]
related: [cost.inventory-carrying-cost, changeover.sequencing, capacity.load-vs-demand]
---
# Lot sizing — the economic production quantity, and why SMED shrinks it

## Purpose and principle
A long run spreads the changeover's cost over many packs but builds
stock that sits, ages and ties up money; a short run does the opposite.
The economic production quantity is the run length where the two costs
balance — and its formula says the thing lean has always said another
way: the lot is proportional to the square root of the set-up cost, so
halving the changeover (SMED) cuts the economic lot by about 30% and
makes smaller, more frequent runs the *cheaper* choice, not a sacrifice.
It is the arithmetic behind heijunka's "every product every interval".

## Questions it answers
- How long should a run be, given what a changeover costs and what
  stock costs?
- What does SMED's shorter changeover do to the economic lot and the
  total cost?
- How many runs a year, and how many weeks of demand per run?
- Is the current run length far from the economic one — and in which
  direction?

## Inputs and minimum conditions
- Annual demand D for the product and the line's production rate P
  (both per year, same unit).
- The set-up cost S per changeover: the changeover's minutes × the
  line's contribution a minute at the bottleneck (`knowledge/MONEY.md`,
  T) plus the materials it wastes — SMED's current figure.
- The holding cost h per pack per year: the pack's cost × the carrying
  rate (`cost.inventory-carrying-cost`), plus the shelf-life risk for a
  dated product.
- Any constraint on the run (shelf life, a customer's order pattern).

## Procedure and calculation
- EOQ (instant replenishment): Q* = √(2DS/h).
- EPQ (the line produces at rate P while demand draws at D): Q* =
  √(2DS / (h(1 − D/P))); the maximum stock is Q(1 − D/P), less than Q
  because demand draws down during the run.
- Runs a year = D/Q*; weeks of demand per run = Q*/(D/52); run length in
  time = Q*/P.
- Total annual cost at Q* = √(2DSh(1 − D/P)) (set-up and holding, equal
  at the optimum); the cost curve is flat near Q*, so ±30% on Q costs
  little — the decision is robust, which is why the constraint (shelf
  life, the customer) can move it.
- SMED's effect: S halved → Q* × 1/√2 = 0.71 Q*; the total cost falls
  by the same factor.
- Shelf life: Q must not exceed the demand over the life less the time
  to sell; for a dated product the life, not the EPQ, usually sets the
  run.
- Multiple products on one line: the interval that fits them all is
  heijunka's EPEI (`lean.heijunka-epei`), with the changeovers summed.

**Worked case** (`cases-planning-foodsafety.py`): D = 2.88 M packs a
year, P = 21.6 M a year (the line's capacity), S = £504 a changeover
(42 min × £12 a minute of contribution), h = £0.084 a pack a year (20% of
£0.42). EPQ 199,700 packs = 3.3 weeks of demand, 14.4 runs a year, total
cost £14,500 a year. With SMED's 27-minute changeover (S = £324): EPQ
160,100 = 2.7 weeks, total cost £11,700 — shorter changeovers earn
smaller lots and £2,900 a year on this product alone.

## Assumptions, limits and misuse
- The formula assumes steady demand, a fixed set-up cost and a holding
  rate; real demand is lumpy and promotions break it — the EPQ is a
  guide, the constraint often decides.
- Set-up cost as "the fitter's hour" misses the line's lost
  contribution, which is the larger part at a bottleneck; off the
  bottleneck the set-up cost is only labour and the lot should be small.
- Holding cost at the accountant's rate ignores shelf life; for chilled
  product the life is the constraint and the EPQ is moot.
- A long run "to save changeovers" with stock that is written off at
  end of life is the misuse the formula exposes once h includes the
  write-off risk.
- The economic lot is not a lean principle; heijunka chooses smaller
  lots for flow and service and uses SMED to make them affordable. The
  formula shows how far SMED has to go.

## Reading the result
"At today's 42-minute changeover the economic run is 3.3 weeks of Maris;
with SMED's 27 minutes it is 2.7 weeks and £2,900 a year cheaper on this
product. The 21-day shelf life caps the run at 2 weeks anyway — so SMED's
minutes are what make the life-limited run affordable." Money: set-up
cost per changeover (`knowledge/MONEY.md`, T), holding per pack (I), and
the total's fall with SMED.

## When not to use it — and instead
Shortening the changeover → `changeover.smed`. Every product every
interval → `lean.heijunka-epei`. The holding rate → `cost.inventory-carrying-cost`.
The order of the runs → `changeover.sequencing`.

## In food and FMCG manufacturing
Ambient products with long life where the EPQ matters; chilled and
fresh where life sets the run and SMED sets whether it pays; the
campaign-length argument between planning (long runs) and the warehouse
(no room).

## References
- [paper] Harris, F.W. (1913), "How many parts to make at once", *Factory, The Magazine of Management* 10(2), 135–136 — the EOQ (from knowledge).
- [textbook] Silver, E.A., Pyke, D.F. and Thomas, D.J., *Inventory and Production Management in Supply Chains*, 4th ed., CRC, 2017 — the EPQ and its sensitivity (from knowledge).
- [textbook] Hopp, W.J. and Spearman, M.L., *Factory Physics*, 3rd ed., 2011, ch. 2 — the EOQ's history and its lean critique (from knowledge).

## In Faultline
Not built (FC-182). SMED holds the changeover's minutes and its money
(`src/tools/changeover`); the line's margin and materials a pack are in
the money model; FC-182 adds the product's demand and life, says the
economic run and the total cost now and at SMED's target, and hands the
interval to heijunka.
