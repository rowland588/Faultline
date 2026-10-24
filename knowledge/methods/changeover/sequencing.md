---
id: changeover.sequencing
name: Sequencing the week's products — the order that costs least in changeovers, under the allergen rule
aka: [changeover sequencing, product sequencing, sequence-dependent set-up, allergen sequencing, run order, campaign sequencing]
discipline: changeover
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — sequence-dependent set-up scheduling as Pinedo's *Scheduling* frames it (from knowledge) and food practice (allergen-free first, then by allergen; light to dark; plain to flavoured — from knowledge); the worked four-product case solved by enumeration in `scripts/knowledge/cases-operations.py`
needs: [changeover.smed]
next: [planning.scheduling-rules]
alternatives: []
related: [foodsafety.allergen-changeover, lean.heijunka-epei, capacity.load-vs-demand]
---
# Sequencing the week's products — the order that costs least in changeovers, under the allergen rule

## Purpose and principle
The time a changeover takes depends on what came before: plain to
flavoured is a wipe, flavoured to plain is a wash; allergen-free to
allergen is a change of reel, allergen to allergen-free is a full clean
and a verification. So the week's products have an order that costs
least in changeover time — and in a food plant the order is first a rule
(allergen-free before allergen, and never the other way without the
full clean; light before dark; mild before strong) and then an
optimisation inside the rule. With SMED's times per pair, the best order
of a handful of products is found exactly; with many, by the rule and a
heuristic.

## Questions it answers
- In what order should this week's products run to lose least time to
  changeovers?
- What does the order save against the order the orders arrived in?
- Which changeovers are the expensive pairs — the ones SMED should work
  on next, or the ones to avoid by sequencing?

## Inputs and minimum conditions
- The products to run in the period and their quantities
  (`capacity.load-vs-demand`).
- The changeover time for each ordered pair (from → to), from SMED's
  records (`changeover.smed`) — or a matrix built from the rule's
  classes (like-for-like, reel change, wash, allergen clean) with a time
  per class.
- The rules that bind: the allergen matrix (`foodsafety.allergen-changeover`),
  colour/flavour order, any product that must run on a day (shelf life,
  a delivery slot).

## Procedure and calculation
- The matrix C[i][j] = changeover minutes from product i to product j
  (asymmetric); forbidden pairs (allergen to allergen-free without the
  clean) get the clean's full time or are barred.
- The cost of an order = Σ C[pᵢ][pᵢ₊₁] over the sequence (plus the
  first set-up); the best order is the one minimising it — a travelling-
  salesman-shaped problem.
- Few products (up to 8–9): enumerate every order (8! = 40,320 is
  instant) and take the minimum under the rules.
- Many: the rule first (sort by allergen class, then by colour/flavour
  class), then a nearest-neighbour or 2-opt improvement inside each
  class; the result compared with the rule-only order to show the gain.
- The saving = the cost of the arrived order − the cost of the best; in
  minutes and at the line's lost contribution per minute
  (`knowledge/MONEY.md`, T) — and the hours given back to the week's
  load (`capacity.load-vs-demand`).
- The expensive pairs named: a pair that costs 60 minutes whichever way
  is SMED's next target (`changeover.smed`); a pair that is cheap one way
  and dear the other is sequencing's.
- Levelling (`lean.heijunka-epei`) pulls the other way — smaller, more
  frequent runs cost more changeovers; the sequence is set inside the
  level plan, and SMED's shorter changeovers are what make levelling
  affordable.

**Worked case** (`cases-operations.py`): four products — Plain,
Cheese, Nut, Onion — with the pair matrix from SMED (Plain→Cheese 20,
Cheese→Plain 45, anything→Nut 20–25, Nut→anything 60 with the allergen
clean, Plain↔Onion 15 …). The best order is Plain → Onion → Cheese →
Nut: 60 minutes; the worst 125. The rule "allergen-free first, nut last"
gives the best order directly here — 65 minutes a week saved against the
worst, 65 × the line's contribution a minute.

## Assumptions, limits and misuse
- The matrix must be real times from SMED, or honest class estimates
  said as such; a guessed matrix optimises nothing.
- The allergen rule is not a cost to trade off; it is a constraint. An
  "optimal" order that runs nut before plain without the clean is a
  recall.
- Shelf life and delivery slots fix some products to days; the
  sequence is optimised inside those, not across them.
- A long campaign to save changeovers builds stock (`cost.inventory-carrying-cost`)
  and lengthens lead times; the saving is weighed against the levelling
  the customer needs.
- Ten products have 3.6 million orders; enumeration stops being
  instant at about nine and the heuristic takes over, said so.

## Reading the result
"This week's four products in the order Plain, Onion, Cheese, Nut cost
60 minutes of changeover; the order the orders came in would have cost
110 — 50 minutes back, £X at the bagger. The Nut-to-anything clean is the
pair SMED should look at." Money: the minutes saved × the line's
contribution a minute (`knowledge/MONEY.md`, T); the stock a long
campaign builds (I) against it.

## When not to use it — and instead
Shortening the changeovers themselves → `changeover.smed`. The allergen
clean's rules → `foodsafety.allergen-changeover`. The size and frequency
of runs → `lean.heijunka-epei`. The whole schedule's rules →
`planning.scheduling-rules`.

## In food and FMCG manufacturing
Multi-product lines with allergen variants (nut, dairy, gluten), colour
and flavour families (plain → flavoured, white → dark chocolate, mild →
spicy), sizes that share tooling; the weekly plan on every such line.

## References
- [textbook] Pinedo, M.L., *Scheduling: Theory, Algorithms, and Systems*, 5th ed., Springer, 2016 — sequence-dependent set-up times (from knowledge).
- [practice] Food allergen management practice (FDF, BRCGS, retailer codes) — scheduling allergen-free before allergen-containing products (from knowledge).
- [textbook] Shingo, S., *A Revolution in Manufacturing: The SMED System*, 1985 (from knowledge).

## In Faultline
Not built (FC-070). SMED holds the changeover times per product pair on
a line (`src/tools/changeover`) and the week's products are in the
line's programs (`src/line`); FC-070 builds the pair matrix from SMED's
records, applies the allergen rule, finds the best order (exact up to
nine, heuristic beyond, said), and says the minutes and money saved
against the arrived order.
