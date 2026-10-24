---
id: foodsafety.environmental-monitoring
name: Environmental monitoring — Listeria and indicator swabs by zone, positives and recurrence
aka: [EMP, environmental monitoring programme, zoning, Listeria swabbing, indicator organisms, seek and destroy]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — zone 1–4 environmental monitoring practice for ready-to-eat foods as industry guidance frames it (FDA's Listeria guidance, Campden BRI, the Chilled Food Association — from knowledge; texts not read); the positives' bounds by Clopper–Pearson and the worked programme in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [rca.fishbone-5whys]
alternatives: []
related: [foodsafety.cleaning-verification-atp, foodsafety.hygienic-design, rca.stratification]
---
# Environmental monitoring — Listeria and indicator swabs by zone, positives and recurrence

## Purpose and principle
Pathogens such as *Listeria monocytogenes* live in a factory's
environment — drains, wet floors, hollow rollers, cracked surfaces —
and reach the product from there. The environmental monitoring
programme swabs the environment by zone (1 product-contact surfaces,
2 non-contact surfaces close to product, 3 the processing area's
floors, drains and walls, 4 outside the processing area) on a
schedule, tests for the pathogen or an indicator (*Listeria* spp.), and
treats a positive as a find to be chased to its source — more swabs
around it, cleaning, a check of the design — until repeated negatives
show it gone. Its measure is positives by zone with how sure the rate
is, and recurrence at the same site, which names a harbourage.

## Questions it answers
- Where are the positives — which zone, which site — and at what rate?
- Is a positive a one-off or a recurrence (the same site again)?
- Did the response work — negatives since, how many in a row?
- Is the programme itself adequate (enough swabs where the risk is)?

## Inputs and minimum conditions
- The zone map of the area with the swab sites chosen by risk, and the
  schedule per zone (zones 2–3 swabbed most; zone 1 by the site's risk
  assessment, often post-clean for indicators).
- Each swab: site, zone, date, result (positive/negative, the organism)
  from an accredited laboratory (`msa.calibration` for the lab's
  accreditation).
- The response plan per zone (the "seek and destroy": vector swabs,
  intensified cleaning, dismantling, design review).

## Procedure and calculation
- Positives ÷ swabs per zone per period, with the Clopper–Pearson
  upper bound (`stats.confidence-intervals`) — small counts give wide
  bounds, and "0 of 24" is "under 12%", not zero.
- Recurrence: the same site positive again within the window (a month,
  two) — a harbourage until shown otherwise; its root cause
  (`rca.fishbone-5whys`: a hollow part, a drain, condensation) and the
  design fix (`foodsafety.hygienic-design`).
- The response: vector swabbing around the positive (more sites, the
  next day), intensified cleaning, re-swab until three consecutive
  negatives (the common release rule); the time to negative as the
  measure of the response.
- Trends by zone and by area (`stats.time-series-trend`); a rise in zone
  3 precedes a find in zone 2.
- The programme's adequacy: swabs per period against the plan; sites
  rotated so the hard places are reached; a review after any positive in
  zone 1 or any product positive.

**Worked case** (`cases-planning-foodsafety.py`): a quarter's swabs —
zone 1: 0 of 24 positive (95% upper bound 11.7%); zone 2: 2 of 48 (4.2%,
upper 12.5%); zone 3: 5 of 60 (8.3%, upper 16.7%); zone 4: 3 of 24
(12.5%, upper 29%). A zone-2 positive on the same drain two months
running is a recurrence: a harbourage — the drain's design and the
cleaning method are the root-cause questions, and the site is swabbed
intensively until three consecutive negatives.

## Assumptions, limits and misuse
- A programme that never finds a positive is not swabbing where the
  organism lives; some positives in zones 3–4 are the sign of a
  programme that looks.
- Zero positives in two dozen swabs proves little (the bound says it);
  the trend over hundreds does.
- Positives treated as a cleaning failure only, without the design
  question, recur.
- ATP swabs are not this (`foodsafety.cleaning-verification-atp`);
  residue is not the pathogen.
- A positive in zone 1 or on product is a food-safety incident with its
  own procedure (hold, test, notify); the programme's measure is the
  environment.

## Reading the result
"This quarter: zone 1 clear (0 of 24 — under 12% at best); zone 2 two
positives, both the east drain — a recurrence: the drain's design is the
root cause; intensified swabbing until three clear." Money: the
response's labour and the dismantling (`knowledge/MONEY.md`, L, M); the
consequence the programme exists to avoid — a product positive's recall
(C).

## When not to use it — and instead
Residue after cleaning → `foodsafety.cleaning-verification-atp`. The
machine's cleanability → `foodsafety.hygienic-design`. The root cause of
a recurrence → `rca.fishbone-5whys`, `rca.stratification`.

## In food and FMCG manufacturing
Ready-to-eat lines above all — sliced cooked meats, sandwiches,
salads, dairy, chilled desserts; the drains, the slicers' hollow parts,
the floor–wall junctions; the technical manager's zone map on the wall.

## References
- [guide] US FDA, *Control of Listeria monocytogenes in Ready-To-Eat Foods: Guidance for Industry* (2017 draft) — zoning and the response to positives (from knowledge).
- [guide] Campden BRI and the Chilled Food Association — environmental monitoring guidance for chilled foods (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 4.11.8 — environmental monitoring programme (from knowledge; clause not confirmed).

## In Faultline
Not built (FC-173). The register holds problems by line and machine
(`src/snag`); FC-173 adds the zone map's sites, each swab's result,
positives by zone with their bounds, recurrence at a site named, the
response's swabs and the run of negatives, and the trend — connecting a
recurrence to the hygienic-design finding on the machine.
