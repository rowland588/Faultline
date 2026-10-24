---
id: yield.giveaway
name: Give-away — product given over the declared quantity, in money, and the lowest legal fill
aka: [giveaway, give-away, overfill, overweight, target fill, fill setting, lowest legal average]
discipline: yield
kind: established
evidence: law
depth: full
checked: 2026-10-22 — the average system's rules (Weights and Measures (Packaged Goods) Regulations 2006, Schedule 2 — TNE table as implemented in src/tools/capability/sample.ts tneFor, from the Regulations); give-away arithmetic and the target fill from the normal model (from knowledge); the deleted method engine had give-away and fill blocks (docs/CAPABILITY-CHECK.md, E)
needs: [packaging.average-quantity-system, spc.capability-measured]
next: [yield.multihead-weigher, stats.doe-factorial]
alternatives: []
related: [cost.line-cost-model, stats.tolerance-stackup]
---
# Give-away — product given over the declared quantity, and the lowest legal fill

## Purpose and principle
Every gram over the declared quantity is product given free. Give-away is the
mean fill less the nominal, times the packs made, times the product's cost. The
law sets how low the fill may go (the average system's three rules); the
spread of the filler sets how close to that floor the target can sit. Cutting
the spread lets the target come down — that is where the money is.

## Questions it answers
How much product do we give away a shift, a week, a year, in money? What is the
lowest target this filler can run at and stay legal? What would halving the
spread be worth?

## Inputs and minimum conditions
Pack weights (a sample from the line, at least 30, taken across the run); the
nominal; packs a shift; the product's cost a kilo (materials, or price less
packaging — say which).

## Procedure and calculation
- Give-away a pack = x̄ − nominal (when positive); per period = that × packs.
- In money = give-away kg × £ a kg of product.
- Lowest target the rules allow, at spread s (normal model): the largest of
  (a) the nominal (rule 1: the mean at least the nominal), (b) T1 + z₀.₉₇₅·s
  so that no more than 2.5% fall below T1 = nominal − TNE (rule 2), and
  (c) T2 + z·s with z chosen so that a pack below T2 = nominal − 2·TNE is
  practically impossible (rule 3 — none allowed; a site policy such as 1 in
  10,000 sets z ≈ 3.72). Rule 2 or rule 3 usually binds.
- Saving from a lower spread = (target now − target at the new spread) × packs × £ a kg.

## Assumptions, limits and misuse
- The normal model may not hold (combination weighers), so check the shape
  and the count below T1 as measured.
- Give-away measured on a sample taken at the start of the run only.
- Product cost confused with sale price.

## Reading the result
"Mean 404.1 g on 400 g: 4.1 g a pack, 41 kg a shift, £3,690 a week. At this
spread the lowest legal target is 402.3 g; halve the spread and it is 401.2 g."

## When not to use it — and instead
Legal compliance itself → `packaging.average-quantity-system`.

## In food and FMCG manufacturing
Bagged produce on combination weighers; meat and cheese portions; filled
sauces and drinks by volume (`packaging.average-quantity-system`, density).

## References
- [law] The Weights and Measures (Packaged Goods) Regulations 2006 (SI 2006/659), Schedule 2 — the tolerable negative errors and the rules.
- [practice] Office for Product Safety and Standards (formerly NWML), *Weights and Measures (Packaged Goods) Regulations — guidance for businesses* (the Packers' Code) — from knowledge; current edition to confirm.
- [standard] OIML R 87:2016, *Quantity of product in prepackages* — from knowledge.

## In Faultline
Built 24 October as part of the capability study (FC-156, a mode of the study itself;
`knowledge/specs/FC-156-capability-money.md`): a measured study with a nominal
in g or kg says give-away a pack, and — from the packs a shift, the shifts a
week and the product's cost a kilo typed on the study (Rowland, 24 October) —
a shift and a week in kg and £, with its because; a missing input is named on
the tile. The lowest legal fill (FC-157, W1, the same day — `src/tools/capability/modes.ts`
fillFigures/fillSays, `src/lib/ie/dist.ts` fillTargets): from 25 readings on a sold-by-weight study the
lowest target that keeps the three rules at this spread, which rule binds, and what the present mean
gives away above it in grams and £ a 100 packs. Proved by `capability-kinds.mjs` step 14.
