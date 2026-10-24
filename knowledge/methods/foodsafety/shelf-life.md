---
id: foodsafety.shelf-life
name: Shelf-life study — the criteria, the design, and the margin behind the date
aka: [shelf life, durability study, use-by, best-before, storage trial, accelerated shelf life, challenge test]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — shelf-life study design as Campden BRI's guidance (Guideline 46, *Evaluation of product shelf-life for chilled foods*) and the Chilled Food Association's guidance frame it (from knowledge; texts not read); the microbiological growth fit and the margin worked in `scripts/knowledge/cases-planning-foodsafety.py` — illustrative, the real criteria are the product's
needs: []
next: []
alternatives: []
related: [quality.sensory-difference, packaging.map-residual-oxygen, foodsafety.haccp, stats.correlation-regression]
---
# Shelf-life study — the criteria, the design, and the margin behind the date

## Purpose and principle
The date on the pack is a claim that the product is safe (use-by) or of
acceptable quality (best-before) until then, under the storage stated.
The study behind it stores the product as the consumer will (and at a
realistic abuse temperature), pulls samples at intervals, tests them
against criteria — microbiological limits (indicators, spoilage
organisms, pathogens where relevant), chemical (pH, aw, oxidation),
physical (texture, drip, colour) and sensory (`quality.sensory-difference`)
— and finds the day the first criterion fails. The life is set short of
that day by a safety margin. The study is the technical team's;
Faultline's part is to connect it to the line — the oxygen in the pack,
the seal, the cook — so a process change that threatens the margin is
seen.

## Questions it answers
- On what day does the first criterion fail, and which one?
- What life does that support with the safety margin?
- Which process variables the line controls (oxygen, cook, pH, seal)
  does the life depend on — and is the line holding them?
- Does a process change need the study re-run?

## Inputs and minimum conditions
- The criteria per test with their limits (from the hazard analysis
  and the specification); the pathogens of concern and whether a
  challenge test is needed (the Chilled Food Association's and FSA's
  guidance on *Listeria* and *C. botulinum* for chilled foods).
- The design: at least three production batches; storage at the
  labelled temperature and at a realistic abuse (e.g. 8 °C for chilled
  product labelled 5 °C — the guidance's choice); pull points through
  and beyond the intended life; replicates per pull; an accredited
  laboratory.
- The product's process variables at the time of manufacture (oxygen,
  cook, pH, aw, seal) recorded with the batches.

## Procedure and calculation
- Results by pull day per criterion; the first day any criterion fails
  (or the trend's crossing of the limit, fitted — microbial counts in
  log₁₀ grow about linearly in the growth phase, so a line fitted on
  the log counts gives the crossing day, `stats.correlation-regression`).
- Life = the crossing day × a safety margin (commonly 20–30% shorter,
  or minus a fixed number of days — the site's policy, said), and never
  longer than the pathogen criteria allow (e.g. the *Listeria* rule for
  ready-to-eat foods: the life over which the product stays under
  100 cfu/g, or a challenge test to show it).
- Accelerated studies (higher temperatures, Q₁₀ scaling) for ambient
  products — a model with assumptions, validated against real-time
  data before it sets a date.
- Confirmation: the life re-checked on production batches periodically
  and after any change to recipe, process, packaging or supplier.
- The link to the line: the process variables the study assumed
  (oxygen under x%, cook ≥ y °C, pH ≤ z) are the capability studies'
  limits (`packaging.map-residual-oxygen`, `foodsafety.ccp-monitoring`);
  a line drifting toward them is eating the margin.

**Worked case** (`cases-planning-foodsafety.py`, illustrative): total
viable count (log₁₀ cfu/g) by day 0, 3, 6, 8, 10, 12, 14: 2.1, 2.6,
3.4, 4.2, 5.1, 6.0, 6.9 — growing 0.35 log a day; the 7.0 log spoilage
criterion is crossed at day 15.2; with a 20% margin the life is 12 days.
Sensory and pathogen criteria run alongside and may bind first. The
design: three batches × seven pull points × duplicate = 42 samples at
minimum, at the abuse temperature the guidance asks.

## Assumptions, limits and misuse
- One batch stored in the laboratory fridge is not a study; three
  production batches at a realistic abuse temperature are.
- Extrapolating a growth line far past the data, or an accelerated
  model to an ambient product without validation, sets a date on a
  guess.
- The study's assumptions about the process (oxygen, cook) are
  conditions on the line, not footnotes; a line that does not hold them
  invalidates the life.
- Sensory end-points need a panel and a method (`quality.sensory-difference`),
  not the technologist's opinion.
- Extending a life for commercial reasons without a new study is the
  misuse; the study is the evidence.

## Reading the result
"The 400 g ready meal's life is 12 days: spoilage count crosses its
criterion at day 15 at 8 °C storage, less a 20% margin; the life assumes
oxygen under 2% and a core cook of 75 °C — both held on the line this
month." Money: a day of life is a day of sales window (C for the
waste at end of life — `yield.food-waste`); a process drift that
shortens it is the money the capability studies protect.

## When not to use it — and instead
The sensory difference test → `quality.sensory-difference`. The pack's
oxygen → `packaging.map-residual-oxygen`. The cook or chill CCP →
`foodsafety.ccp-monitoring`, `foodsafety.cooling-curves`. The HACCP plan
the criteria come from → `foodsafety.haccp`.

## In food and FMCG manufacturing
Chilled ready meals, sliced meats, sandwiches, dairy, fresh juice,
bakery with MAP, ambient snacks (rancidity) — every product's date, and
every recipe, process or packaging change that re-opens it.

## References
- [guide] Campden BRI, Guideline 46, *Evaluation of product shelf-life for chilled foods* (from knowledge; text not read).
- [guide] Chilled Food Association, *Shelf life of ready to eat food in relation to L. monocytogenes — guidance for food business operators* (with the FSA; from knowledge).
- [law] Regulation (EC) No 2073/2005 on microbiological criteria for foodstuffs (retained in UK law) — the *Listeria* criteria for ready-to-eat foods (from knowledge).
- [textbook] Kilcast, D. and Subramaniam, P. (eds.), *The Stability and Shelf-life of Food*, Woodhead, 2000 (from knowledge).

## In Faultline
Research first (FC-175): the study is the technical team's and its
laboratory's. Faultline's piece is the link — the study's process
assumptions held as limits on the line's capability studies and CCP
checks, and a change on the line (a new speed, a new film) flagged as
"re-opens the shelf-life study" on the project.
