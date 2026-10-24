---
id: yield.mass-balance-yield
name: Mass balance — yield stage by stage, and the kilograms nobody can account for
aka: [mass balance, yield by stage, material balance, process yield, overall yield, unexplained loss, shrink]
discipline: yield
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the mass balance as food-process practice and process-engineering texts give it (from knowledge: Singh & Heldman's *Introduction to Food Engineering* for the balance; BRCGS's mass-balance exercise as audit practice, clause not confirmed); the bakery worked case in `scripts/knowledge/cases-operations.py`
needs: []
next: [yield.food-waste, quality.pareto]
alternatives: [quality.fpy-rty]
related: [yield.material-variance, foodsafety.traceability-exercise, yield.giveaway]
---
# Mass balance — yield stage by stage, and the kilograms nobody can account for

## Purpose and principle
What goes into a stage comes out of it as product, as a known loss
(moisture baked off, trim, rejects, samples) or as something nobody
recorded. Weighing in and out at each stage gives the yield of each and
of the whole, separates the losses that are the process (bake loss) from
the ones that are controllable (trim, rejects, spillage), and leaves an
*unexplained* remainder that is either an unrecorded loss or a wrong
weight — and is where the money and the traceability problems hide. It
is the food plant's oldest measure and the one the auditor asks to see
reconciled.

## Questions it answers
- What is the yield of each stage and of the line, kg out per kg in?
- Which stage loses most, and is that loss the process or a problem?
- How many kilograms are unaccounted for — and where?
- Did a change (a new blade, a new recipe) move a stage's yield?

## Inputs and minimum conditions
- Weights in and out per stage, for the same batch or period: ingredients
  issued, dough made, product proved, baked, cooled, sliced, bagged — and
  the recorded losses at each (trim, rejects, samples, floor).
- Scales fit for the quantities (`msa.type1-gauge`); tares known;
  water added and moisture lost known or measured for the stages that
  change moisture.
- A batch or lot code to tie the weights together (`foodsafety.traceability-exercise`).

## Procedure and calculation
- Stage yield yᵢ = outᵢ ÷ inᵢ; the loss inᵢ − outᵢ in kg, split into
  recorded losses (each named) and the unexplained remainder =
  in − out − Σ recorded losses.
- Overall yield = Π yᵢ = final out ÷ first in (the same thing, two ways —
  a check on the arithmetic).
- Expected process losses (bake loss ≈ 10–13% moisture for bread; cook
  loss for meats; evaporation) compared with the measured: a stage's
  yield well under its expected is a problem, not the process.
- Controllable losses (trim, rejects, start-up/shut-down, spillage) in
  kg and in money at material cost (`knowledge/MONEY.md`, Y and Q), and
  their Pareto (`quality.pareto`).
- Unexplained kg: beyond the scales' uncertainty (`msa.measurement-uncertainty`)
  it is an unrecorded loss or a wrong record; its money is counted as
  loss until found.
- Over time: yield by stage on a run chart (`stats.time-series-trend`);
  before → after a change by `stats.two-sample-tests`.
- The standard yield (the recipe's expected) against the actual gives
  the material variance (`yield.material-variance`).

**Worked case** (`cases-operations.py`): a bakery line, one batch —
mix 1,000 → 992 kg (0.992); divide/prove 992 → 975 (0.983); bake
975 → 858 (0.880 — 12.0% bake loss, the expected moisture); cool
858 → 850 (0.991); slice/bag 850 → 822 (0.967 — 28 kg of crust ends and
rejects, the controllable one). Overall 0.822 both ways. Unexplained at
divide: 992 − 975 − 12 kg recorded scrap = 5 kg not accounted for — find
it (a tare? dough on the divider?).

## Assumptions, limits and misuse
- Weights at different moisture states compared without the moisture
  change read as loss what is physics; the bake loss is expected and
  said as such.
- Scales out of calibration make a balance that never closes; the
  gauges first.
- A period balance (a week's issues against a week's output) mixes
  batches in progress; the WIP at start and end is counted or the window
  widened.
- "Yield" quoted without the stage is ambiguous; the stage is always
  named.
- Unexplained kg written off as "shrink" every week is a loss accepted
  (`equipment.chronic-sporadic`); the remainder is investigated when it
  exceeds the scales' uncertainty.

## Reading the result
"Overall yield 82.2%: the bake loss is the expected 12%; slicing and
bagging lose 3.3% — 28 kg a batch of crust and rejects, £52 at material
cost; 5 kg a batch is unaccounted for at the divider." Money: the
controllable kg × material cost a kg (`knowledge/MONEY.md`, Y), per
batch and per week; the unexplained counted as loss until found.

## When not to use it — and instead
Counts of units through steps (rework, first-time pass) →
`quality.fpy-rty`. The money against the standard recipe →
`yield.material-variance`. The waste's destinations and the hierarchy →
`yield.food-waste`. Give-away on a pack → `yield.giveaway`.

## In food and FMCG manufacturing
Bakeries (dough to bagged loaf), meat (raw to cooked to sliced to
packed), ready meals (components to assembled), snacks (raw potato to
fried to packed — the oil take-up adds mass), dairy, drinks (syrup to
filled); the BRCGS mass-balance traceability exercise is this balance
for one lot.

## References
- [textbook] Singh, R.P. and Heldman, D.R., *Introduction to Food Engineering*, 5th ed., Academic Press, 2014, ch. 1 — material balances (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 3.9 — traceability including a mass balance (from knowledge; clause not confirmed against the text).
- [practice] WRAP, *Food Waste Reduction Roadmap* — measuring food waste by stage (from knowledge).

## In Faultline
Not built (FC-159). The line's machines in flow order are its stages
(`src/line`); FC-159 adds the weights in and out and the recorded losses
per stage, says each yield against its expected, the controllable kg in
money and the unexplained remainder, batch by batch and on the trend.
