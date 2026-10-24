---
id: yield.material-variance
name: Material usage variance — actual against the standard recipe, in kilograms and pounds
aka: [material variance, usage variance, yield variance, recipe variance, standard costing, over-usage]
discipline: yield
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the usage variance as standard-costing practice gives it (Drury's *Management and Cost Accounting*, from knowledge); the split into measured causes as Faultline reads it; the worked week in `scripts/knowledge/cases-operations.py`
needs: []
next: [quality.pareto]
alternatives: []
related: [yield.mass-balance-yield, yield.giveaway, quality.copq]
---
# Material usage variance — actual against the standard recipe, in kilograms and pounds

## Purpose and principle
The recipe says a pack takes 412 g of product; the week made 48,000
packs and used 20,350 kg — 574 kg more than the standard allows. The
variance is that gap, in kilograms and at the material's price, and the
work is to explain it from measured causes — give-away, rejects, trim,
spillage, over-issue — until the unexplained part is small. It is the
accountant's figure met with the floor's measurements, and the place
where give-away, which looks small per pack, turns into a weekly sum.

## Questions it answers
- How much more (or less) material did we use than the standard, and
  what did it cost?
- How much of the variance is give-away, how much rejects, how much
  waste — and how much is unexplained?
- Is the standard itself right (a persistent variance one way says it is
  not)?

## Inputs and minimum conditions
- The standard usage per pack (the recipe, per ingredient or in total)
  and the material's price per kg (`knowledge/MONEY.md` §3,
  materialsPerPack).
- The period's output (good packs) and the material actually used
  (issued less returned, or consumed by the balance).
- The measured causes: give-away per pack (the capability study), reject
  share and their fate, trim and waste kg (`yield.mass-balance-yield`,
  `yield.food-waste`).

## Procedure and calculation
- Standard usage = standard per pack × good packs.
- Usage variance (kg) = actual used − standard usage; as a share of
  standard; in money × price per kg (adverse when positive).
- Explained parts: give-away = mean over-fill per pack × packs; rejects
  = reject share × standard usage (the product in the rejected packs);
  trim and recorded waste in kg; samples; start-up product. Unexplained =
  variance − Σ explained.
- The price variance (actual price − standard price) × actual kg is the
  buyer's, kept apart from the usage variance (the floor's).
- A standard that is persistently beaten (a favourable variance every
  week) is loose; one never met is tight or the process has changed —
  the trend says which (`stats.time-series-trend`).
- By product and ingredient: the Pareto of adverse variances in money
  (`quality.pareto`).

**Worked case** (`cases-operations.py`): standard 0.412 kg a pack,
48,000 packs → 19,776 kg; used 20,350 kg; variance +574 kg (+2.9%),
£1,062 adverse at £1.85/kg. Explained: give-away measured at 6 g a pack
= 288 kg; rejects 1.2% = 237 kg; the remaining 49 kg unexplained
(spillage, over-issue, a wrong standard). Give-away is half the variance
— the filler's target and spread (`yield.giveaway`), not the recipe.

## Assumptions, limits and misuse
- A variance explained by "yield" is not explained; the causes are
  measured ones with their own records.
- Issues not matched to the period's output (material issued Friday for
  Monday's run) make a variance that reverses next week; the balance's
  window is the week the product was made.
- Rejects reworked return their material; the split by fate matters
  (`yield.giveaway`'s rule — waste, reworked, recovered).
- A price variance mixed into the usage variance blames the floor for
  the market.
- Standards set from the best week are tight and demoralising; from the
  average they hide the gain; the standard is the recipe's engineering
  figure, and the gap to it is read, not argued.

## Reading the result
"574 kg over standard this week (2.9%, £1,062): give-away 288 kg, rejects
237 kg, 49 kg unexplained. The give-away is the filler's — 6 g a pack on
a 412 g standard." Money: the variance at material price
(`knowledge/MONEY.md`, Q and Y), split by cause so each cause's tool is
named.

## When not to use it — and instead
The kilograms stage by stage → `yield.mass-balance-yield`. Give-away on
the pack itself → `yield.giveaway`. The waste's destinations →
`yield.food-waste`. The whole cost of poor quality → `quality.copq`.

## In food and FMCG manufacturing
The weekly materials report on every line; the give-away argument
between finance and production settled by the capability study's mean;
the recipe standard revisited after a new supplier's product changes
density.

## References
- [textbook] Drury, C., *Management and Cost Accounting*, 11th ed., Cengage, 2021 — standard costing and variance analysis (from knowledge; edition to confirm).
- [textbook] Horngren, C.T., Datar, S.M. and Rajan, M.V., *Cost Accounting: A Managerial Emphasis*, 16th ed., Pearson, 2018 (from knowledge).

## In Faultline
Not built (FC-160). The capability study measures give-away per pack
and the rejects by fate (`src/tools/capability`); the line holds
materials a pack (`knowledge/MONEY.md` §3); FC-160 adds the period's
issued kilograms and output, says the variance in kg and pounds, explains
it from the measured causes and names the unexplained remainder.
