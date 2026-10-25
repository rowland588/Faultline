---
id: foodsafety.shelf-life
name: Shelf-life study — the criteria, the design, and the margin behind the date
aka: [shelf life, durability study, use-by, best-before, storage trial, accelerated shelf life, challenge test]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-25 — public guidance seen only as search-result excerpts (the container cannot fetch gov.uk, Food Standards Scotland, FSAI, Campden BRI, the Chilled Food Association or EUR-Lex): Food Standards Scotland Shelf-life guidance 2025 (v1.2, March 2025), FSAI Guidance Note 18 Rev 5 (4 Nov 2022), the Chilled Food Association's L. monocytogenes shelf-life guidance (v1.1.1, 23 March 2010) and its 2026 guidance, the EURL Lm technical guidance, Campden BRI's guideline and white paper, Regulation (EC) 2073/2005 and (EU) 2024/2895; no document was read whole and no table or criterion was copied; the 20-30% safety margin and the 8 °C abuse temperature this record carried before 25 October were not found in any source and are now said to be the technologist's choices; the growth fit and margin arithmetic in scripts/knowledge/cases-planning-foodsafety.py are illustrative
needs: []
next: []
alternatives: []
related: [quality.sensory-difference, packaging.map-residual-oxygen, foodsafety.haccp, stats.correlation-regression]
---
# Shelf-life study — the criteria, the design, and the margin behind the date

## Purpose and principle
The date on the pack is a claim that the product is safe (use-by) or of
acceptable quality (best-before) until then, under the storage stated. The
food business operator has to show that the period is right (Food Standards
Scotland's guidance: there is no single standard method, since many factors
bear on safety and quality). The study behind it stores the product as the
consumer will, pulls samples at intervals, tests them against criteria —
microbiological limits (indicators, spoilage organisms, pathogens where
relevant), chemical (pH, aw, oxidation), physical (texture, drip, colour) and
sensory (`quality.sensory-difference`) — and finds the day the first criterion
fails. The life is set short of that day. The study is the technical team's
and its laboratory's; Faultline's part is to **keep the study's results and its
assumptions against the line** — the oxygen in the pack, the seal, the cook —
so a process change that threatens the margin is seen.

Two kinds of work are told apart in the guidance and must not be mixed:
a **durability study** stores the product as made and watches naturally
present organisms (Campden BRI: factory-scale trials on batches made under
routine conditions, which "do not determine the potential for growth of
foodborne pathogens"); a **challenge test** inoculates a pathogen on purpose
to find whether and how fast it grows. For *Listeria monocytogenes* the EU
Commission's guidance (and the EURL's technical guidance) says durability
studies alone should not validate the life of a ready-to-eat food; they verify
it. That work is a laboratory's.

## Questions it answers
- On what day does the first criterion fail, and which one?
- What life do the results support — as observed, not guessed?
- Which process variables the line controls (oxygen, cook, pH, seal) does the
  life depend on — and is the line holding them?
- Does a process change need the study re-run?

## Inputs and minimum conditions
- The protocol, written by the technologist: the criteria per test with their
  limits (from the hazard analysis and the specification); the pathogens of
  concern and whether a challenge test is needed; the storage temperature(s)
  and the pull days. The guidance asks for **reasonably foreseeable**
  conditions of distribution, storage and use (Regulation 2073/2005's phrase;
  Food Standards Scotland adds transport home at ambient); FSAI Guidance Note
  18 says studies should use temperatures that reflect normal practice even
  where these differ from the recommended ones. No source seen fixes one abuse
  temperature for all products; the earlier 8 °C in this record was not found
  and is the protocol's choice.
- **Batches.** The DG SANTE guidance recommends a challenge test on three
  batches from different production days; EFSA's 2020 date-marking opinion says
  confidence rises with the number of batches verified at the end of life.
  Three is therefore a floor to say, not a rule to cite for durability work.
- Pull points through and beyond the intended life; replicates per pull; an
  accredited laboratory for the microbiology.
- The product's process variables at manufacture (oxygen, cook, pH, aw, seal)
  with each batch.

## Procedure and calculation
- Results by pull day per criterion per batch; the **first day any criterion
  fails**, and the **last pull at which every batch met every criterion** —
  both observed, neither fitted.
- Life = a day no later than the last pull at which every batch passed,
  **less a margin the site chooses and says** (a number of days or a share).
  No guidance seen fixes the margin; "20–30%" appeared in an earlier version
  of this record from knowledge and is not sourced.
- The fixed points in public rules (the technologist still reads the text):
  Regulation (EC) 2073/2005 (assimilated in GB) criterion 1.2 for *Listeria*
  in ready-to-eat foods that can support growth: 100 cfu/g throughout shelf
  life only if the operator can **demonstrate** the product stays under it;
  otherwise "not detected in 25 g" before the food leaves the operator's
  control (as the excerpts put it). Foods whose life is under five days are
  treated as not supporting growth (one excerpt of the Chilled Food
  Association's worked examples; the Regulation's own wording not seen) but
  may still contain ingredients that do. The EU's Regulation 2024/2895 changed
  criterion 1.2 from 1 July 2026 for the EU (and, through the Windsor
  Framework, Northern Ireland is a question to check); **whether it applies in
  Great Britain was not settled in anything seen** — one source says GB-only
  businesses work from the assimilated 2073/2005 and FSA/FSS guidance. The
  chilled vacuum or modified-atmosphere packed rule: life no more than 10 days
  where non-proteolytic *Clostridium botulinum* could grow, unless other
  controls (salt, aw, pH) apply (Chilled Food Association's page on the "10-day
  rule" and the Food Standards Scotland guidance).
- Accelerated studies (Q₁₀ scaling) for ambient products: a model with
  assumptions, validated against real-time data before it sets a date —
  not something a typed ledger can do.
- Re-evaluation after any change to recipe, process, packaging or supplier
  (Campden BRI: a formulation change should trigger re-evaluation).
- The link to the line: the process variables the study assumed are the
  capability studies' limits (`packaging.map-residual-oxygen`,
  `foodsafety.ccp-monitoring`); a line drifting toward them is eating the
  margin.

**Worked case** (`cases-planning-foodsafety.py`, illustrative arithmetic — a
technologist's fit, not what Faultline would do unaided): total viable count
(log₁₀ cfu/g) by day 0, 3, 6, 8, 10, 12, 14: 2.1, 2.6, 3.4, 4.2, 5.1, 6.0, 6.9 —
growing 0.35 log a day; a 7.0 log spoilage criterion is crossed at day 15.2 by
the fitted line; with a 20% margin chosen by the site the life is 12 days. The
observed record says only: every pull to day 14 was under 7.0, so the
results support up to day 14 before any margin. The design: three batches ×
seven pull points × duplicate = 42 samples at minimum.

## Assumptions, limits and misuse
- One batch stored in the laboratory fridge is not a study.
- Extrapolating a growth line past the data, or an accelerated model to an
  ambient product without validation, sets a date on a guess.
- The study's assumptions about the process (oxygen, cook) are conditions on
  the line, not footnotes; a line that does not hold them invalidates the life.
- Sensory end-points need a panel and a method (`quality.sensory-difference`),
  not the technologist's opinion.
- Extending a life for commercial reasons without a new study is the misuse;
  the study is the evidence.
- **What a person typing results cannot supply:** the protocol's design, the
  choice of pathogens and limits, a challenge test, the interpretation of a
  borderline count, and the sign-off — these need a microbiologist or a
  technologist with the laboratory. A ledger can store them; it cannot make
  them right.

## Reading the result
"The 400 g ready meal's study: 3 batches, 7 pulls to day 14 at 5 °C and 8 °C,
12 criteria — every batch met every criterion at every pull. The results
support a life of up to 14 days; the life set is 12 (margin 2 days, chosen by
the site). It assumes oxygen under 2% and a core cook of 75 °C — both held
on the line this month. No pathogen criterion was entered: this page says
nothing about *Listeria*." Money: a day of life is a day of sales window
(C for the waste at end of life — `yield.food-waste`); a process drift that
shortens it is the money the capability studies protect.

## When not to use it — and instead
The sensory difference test → `quality.sensory-difference`. The pack's oxygen →
`packaging.map-residual-oxygen`. The cook or chill CCP →
`foodsafety.ccp-monitoring`, `foodsafety.cooling-curves`. The HACCP plan the
criteria come from → `foodsafety.haccp`.

## In food and FMCG manufacturing
Chilled ready meals, sliced meats, sandwiches, dairy, fresh juice, bakery with
MAP, ambient snacks (rancidity) — every product's date, and every recipe,
process or packaging change that re-opens it.

## References
- [guidance] Food Standards Scotland, *Shelf-life guidance: guidance for food businesses for the setting of shelf life* (January 2025, v1.2 March 2025), foodstandards.gov.scot — validation and verification, the use-by or best-before decision, reasonably foreseeable conditions; its shelf-life advice does not cover *Listeria*. Excerpts only; free to read, copyright not ours.
- [guidance] Food Safety Authority of Ireland, *Guidance Note 18: Validation of product shelf-life* (Revision 5, 4 November 2022) — steps, durability against challenge, predictive microbiology; excerpts only.
- [guidance] Chilled Food Association with the FSA and BRC, *Shelf life of ready to eat food in relation to L. monocytogenes — guidance for food business operators* (v1.1.1, 23 March 2010, with worked examples); the CFA's 2026 industry guidance on criterion 1.2b; the CFA's page on the 10-day rule; excerpts only.
- [guidance] EURL for *Listeria monocytogenes*, technical guidance document on challenge tests and durability studies for assessing shelf-life of ready-to-eat foods (v4, 1 July 2021, amendment 1 February 2026 per a Zenodo listing); European Commission, DG SANTE guidance document on *Listeria monocytogenes* shelf-life studies for RTE foods (three batches; durability studies verify); excerpts only.
- [guidance] Campden BRI, Betts, Brown and Everis (2004), *Evaluation of product shelf-life for chilled foods* (Guideline 46 — number not re-confirmed), and the second edition (2019), *Evaluation of microbiological shelf-life of foods*; Campden BRI's white paper *How to determine product microbiological shelf-life*; excerpts only; paid guideline.
- [law] Regulation (EC) 2073/2005 on microbiological criteria for foodstuffs, as assimilated in Great Britain, criterion 1.2 (*Listeria*) and Commission Regulation (EU) 2024/2895 amending it (EU, from 1 July 2026); texts not read.
- [guidance] EFSA, *Guidance on date marking and related food information: part 1 (date marking)*, EFSA Journal 2020;18:6306 — excerpt only.
- [textbook] Kilcast, D. and Subramaniam, P. (eds.), *The Stability and Shelf-life of Food*, Woodhead, 2000 (from knowledge).

## In Faultline
Research first (FC-175). The study is the technical team's and its
laboratory's.

**FC-175 — CAN BE BUILT, narrowly, as a results ledger with an observed-life
verdict; CANNOT be built as something that works out or validates a shelf
life.** The public guidance is free to read and not to copy; the ledger needs
none of its text, only the shape, so nothing here is licensed. The decision
for Rowland is whether a ledger is worth building (value medium in the
catalogue); the honesty is the same either way. A minimal build:
*Inputs* — the product; the claimed life and whether use-by or best-before;
the storage conditions as typed (temperature and days, any number); the
criteria as typed (name, unit, limit, direction), each marked microbiological,
chemical, physical, sensory or *pathogen*; batches; and results by pull day
per criterion per batch, typed from the laboratory's report with its reference;
the process assumptions as typed limits (oxygen under 2%, cook 75 °C).
*Outputs* — per criterion the first failing day and the last all-batch pass;
the earliest of those across criteria = the **observed life**; the life
claimed against it; flags in plain words: fewer than three batches; no pull
at or beyond the claimed life; one storage condition only; no abuse
condition typed; no pathogen criterion entered (then "this says nothing about
*Listeria*"); a pull missing; a result typed without a laboratory reference;
a vacuum or MAP chilled product claimed over 10 days with no control typed;
a process assumption whose latest line study is outside it (a link, not a
calculation). *Verdict wording* — "Every batch met every criterion at every pull
to day 14. The results support a life up to day 14; you claim 12." / "Batch 2
failed the yeast count at day 10; the claim of 12 days is not supported."
*Must not* — fit or extrapolate counts to a day beyond the last pull; apply
a default margin, a default abuse temperature or a default number of
batches as if sourced; say "validated", "safe" or "compliant"; judge a
challenge test; treat a durability study as proof about a pathogen; settle the
GB or EU *Listeria* rule (it prints the rule as its source states it, with the
date read). *Independent cases for the builder* — the first-failure and last-pass
logic on hand tables (including a failure then a pass, a missing pull, a
tie between batches), and the 42-sample count; nothing statistical to
validate.
