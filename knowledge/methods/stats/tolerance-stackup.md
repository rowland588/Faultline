---
id: stats.tolerance-stackup
name: Several deposits into one pack — the stack-up of means and spreads
aka: [tolerance stack-up, root sum of squares, RSS, variance of a sum, multi-component fill, multi-deposit weight]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the variance of a sum of independent variables (any statistics text) and the RSS against worst-case as tolerance-analysis texts give it (from knowledge); the four-deposit worked case computed independently in `scripts/knowledge/cases-stats.py`
needs: [stats.descriptive]
next: [yield.giveaway]
alternatives: []
related: [packaging.average-quantity-system, yield.multihead-weigher, spc.capability-measured]
---
# Several deposits into one pack — the stack-up of means and spreads

## Purpose and principle
A ready meal is four deposits; a selection box is twelve; a multihead
weigher's pack is the sum of the heads it opens. The pack's weight is the
sum of the parts' weights, and so its mean is the sum of the means — but
its spread is *not* the sum of the spreads: independent spreads add as
squares (root sum of squares), so the pack's variation is much less than
the worst case and is dominated by its biggest contributor. That one fact
decides where the target sits and which deposit is worth tightening.

## Questions it answers
- What is the pack's expected weight and spread, from the deposits'?
- Where must the pack's target be set to meet the minimum (and what
  give-away does that cost)?
- Which deposit's spread drives the pack's — and what would halving it buy?

## Inputs and minimum conditions
Each deposit's mean and standard deviation from its own readings (20–30
each, `stats.descriptive`); the deposits about independent (one head's
over-fill not caused by another's); the pack's minimum or tolerance.

## Procedure and calculation
- Mean of the sum: μ_pack = Σμᵢ.
- Spread of the sum (independent deposits): σ_pack = √Σσᵢ²; the worst case
  (every deposit at its 3σ at once) is Σ3σᵢ — a bound that almost never
  happens and should not set the target.
- Each deposit's share of the pack's variance: σᵢ²/σ_pack² — the Pareto of
  where the spread comes from.
- Target to meet a minimum m with a share q under it (1 in 1,000 → z =
  3.09): μ_pack = m + z·σ_pack; the give-away is μ_pack − m.
- Correlated deposits (a common cause — temperature, a shared pump):
  σ_pack² = Σσᵢ² + 2ΣΣρᵢⱼσᵢσⱼ; positive correlation widens the pack beyond
  the RSS, so check the pairs' correlation on the readings when a common
  cause is suspected.
- A product of factors (a count × a unit weight) uses the relative
  variances: (σ/μ)² ≈ Σ(σᵢ/μᵢ)².
- A multihead weigher is the same sum over the chosen heads, with the
  combination search doing the targeting (`yield.multihead-weigher`).

**Worked case** (`cases-stats.py`): a ready meal of four deposits — 120 g
(s 3.0), 80 g (2.5), 60 g (2.0), 40 g (1.5). Pack mean 300 g; σ_pack =
√(9 + 6.25 + 4 + 2.25) = 4.64 g, against a worst-case 3σ sum of 27 g (the
RSS 3σ is 13.9 g). At a 300 g target 1.6% of meals fall under 290 g; for 1
in 1,000 the target must be 304.3 g — 14.3 g give-away a meal. The 120 g
deposit holds 42% of the variance; halving its spread (3.0 → 1.5) brings
σ_pack to 3.84 g and the target to 301.9 g — 2.5 g a meal saved, every
meal.

## Assumptions, limits and misuse
- The RSS assumes independence; deposits that drift together (one product
  temperature) are correlated, and the pack spreads wider than the sum of
  squares says. Check it on pack readings against the deposits'.
- Spreads from too few readings make the stack-up a guess; 20–30 each.
- The pack's own measured spread is the final word; the stack-up says
  where it comes from and what tightening one deposit buys.
- Adding a deposit's full tolerance ("±5 g each, so ±20 g") is worst-case
  thinking that sets targets far too high.

## Reading the result
"Four deposits give a 300 g meal a spread of 4.6 g; to keep 999 in 1,000
over 290 g the target is 304.3 g — 14 g give-away a meal. The 120 g
deposit is 42% of the spread; halving it saves 2.5 g a meal: £X a week
(`yield.giveaway`, `knowledge/MONEY.md` Q)."

## When not to use it — and instead
One deposit → `spc.capability-measured` directly. The legal rules on the
pack's average and its tolerable negative error → `packaging.average-quantity-system`.
The weigher's combination logic → `yield.multihead-weigher`.

## In food and FMCG manufacturing
Ready meals, pizzas (base, sauce, cheese, toppings), selection packs,
sandwich assembly, multihead-weighed snacks and frozen vegetables, a
sauce made from several dosed ingredients (Brix as a stack-up of doses).

## References
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018, ch. 5 — linear functions of random variables (from knowledge).
- [textbook] Creveling, C.M., *Tolerance Design: A Handbook for Developing Optimal Specifications*, Addison-Wesley, 1997 — worst-case against RSS (from knowledge).
- [guide] UK Weights and Measures (Packaged Goods) Regulations 2006 — the three rules the target must meet (`packaging.average-quantity-system`; from knowledge).

## In Faultline
Built 25 October 2026 (FC-116, builder F3) as a note in the capability study (`src/tools/capability/modes.ts` stackFigures, stackSays;
`knowledge/specs/FC-116-stackup.md`; proved against NumPy by `scripts/knowledge/cases-w3c.py` → `stackup.test.ts`; driven by
`capability-kinds.mjs` step 17). The deposits' means and spreads are **typed** (a line each) on a sold-by-weight study or a measurement with a
lower limit — not yet read from each deposit's own study; the note says the pack's mean and root-sum-of-squares spread, the target the packers'
three rules (or a floor kept to 1 in 1,000) need at that spread, the deposit that holds the spread, what halving it buys in grams, kilos and pounds,
and — from 25 pack readings — the pack's own spread beside. **Found in building:** on a sold-by-weight pack the average rule usually binds, so
halving a deposit often buys nothing legal (the record's 14 g give-away is for a customer floor kept to 1 in 1,000, not the packers' rules) —
the note says which it is. Not built: correlated deposits, a product of factors, a deposit read from its own study.
