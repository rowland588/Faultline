---
id: foodsafety.allergen-changeover
name: Allergen changeover — the clean validated once, verified every time, and timed as a changeover
aka: [allergen clean, allergen changeover, validated clean, allergen swab, allergen matrix, cross-contact control]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — allergen management practice as FSA, FDF and BRCGS guidance frames it (validation of the clean by allergen-specific testing; verification each changeover; the allergen matrix; from knowledge — BRCGS Food Issue 9 clause 5.3 named, not confirmed against the text); the worked changeover in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [changeover.smed, changeover.sequencing]
alternatives: []
related: [foodsafety.cleaning-verification-atp, changeover.first-off-release, packaging.code-label-verification, foodsafety.haccp]
---
# Allergen changeover — the clean validated once, verified every time, and timed as a changeover

## Purpose and principle
Running a product with an allergen (nut, milk, gluten, egg …) and then
one without it on the same line is the highest food-safety risk a
changeover carries: undeclared allergen in the next product. The
control is a clean shown — once, by testing for the allergen itself
after the clean — to remove it to below the method's detection limit
(validation), then checked each time by a shorter verification (visual
plus swabs, or ATP where the validation showed it tracks the allergen),
with the line released only on a pass. The allergen matrix says which
product-to-product changes need the full clean and which do not, and
the sequence (`changeover.sequencing`) avoids the expensive direction
where it can. The clean's time is a changeover and SMED's method applies
to it — what can be staged before the line stops, what must wait.

## Questions it answers
- Does this product change need the validated allergen clean, by the
  matrix?
- Was the clean done and verified — swabs passed, release signed — and
  how long did it take?
- Is the clean still validated (has the product, the equipment or the
  chemical changed)?
- How much of the clean's time could be moved off the line (SMED)?

## Inputs and minimum conditions
- The allergen matrix: each product's allergens; which changes need
  the full clean, which a lesser one, which none.
- The validated cleaning procedure for each allergen on this line: the
  method, chemicals, time, the validation evidence (allergen-specific
  swabs or product tests after the clean, below the kit's limit of
  detection, on at least three cleans at the worst case).
- The verification per changeover: visual inspection, the swab sites,
  the test (allergen-specific lateral-flow swabs; ATP only where
  validated as a proxy), the pass criterion, who releases.
- The first-off release that follows (`changeover.first-off-release`)
  and the label check (`packaging.code-label-verification`).

## Procedure and calculation
- Validation (once per allergen, line and method; re-done after a
  change): three cleans at the worst case (the stickiest product, the
  fullest line), allergen-specific swabs at the hard-to-clean sites
  (10 or so) and a test of the first product after — all below the
  limit of detection → the clean is validated; the record kept.
- Verification (every allergen changeover): the clean done to the
  procedure; visual check; the swabs (3–5 sites, the hardest) read
  against the pass criterion; a fail → re-clean and re-swab; release
  signed with the time.
- Time: end of allergen run → clean start → clean end → swabs read →
  release; the internal and external split as SMED sees it
  (`changeover.smed`): chemicals, tools and the clean-down of removable
  parts staged before the run ends; the line's own clean is internal.
- Pass rate by site over the quarter (`quality.pareto` of fails); a site
  that fails is a method or design problem (`foodsafety.hygienic-design`).
- Sequencing: allergen-free before allergen-containing wherever the
  plan allows, so the full clean is needed as rarely as possible
  (`changeover.sequencing`).

**Worked case** (`cases-planning-foodsafety.py`): validation — three
cleans after a nut product, swabs at 10 sites each (30), all below the
kit's limit of detection → the clean is validated for nut on this line.
Verification each changeover: visual plus 3 swabs (ATP only where
validated as a proxy) → release. Time: the nut run ends 14:00; clean
14:00–15:10; swabs read 15:25; release 15:30 — 90 minutes stopped. SMED
separates what could be prepared before 14:00 (the kit, the chemicals,
the spare removable parts cleaned off-line) from the clean itself.

## Assumptions, limits and misuse
- A clean that was never validated by allergen testing is a hope;
  ATP alone validates nothing about allergens.
- Validation at the easy case (a light run, a clean machine) does not
  cover the worst; the worst case is the validation.
- Verification swabs at the easy sites pass every time; the hardest
  sites are the ones.
- The matrix is only as good as the recipes' allergen data; a changed
  ingredient changes the matrix.
- "Precautionary labelling" (may contain) is not a substitute for the
  clean where the clean is practicable; the FSA's guidance is clear.
- The clean's time saved by SMED must not be saved from the clean's
  validated method; only from what is around it.

## Reading the result
"Nut → plain changeover: validated clean done, three swabs passed,
released 15:30 — 90 minutes stopped. Staging the kit and the spare
parts off-line (SMED) would save about 25 of them; the clean itself
stays as validated." Money: the clean's minutes at the line's
contribution (`knowledge/MONEY.md`, T) and the hygiene labour (L); the
consequence avoided — an undeclared-allergen recall (C).

## When not to use it — and instead
Shortening the non-clean parts → `changeover.smed`. Avoiding the
expensive direction → `changeover.sequencing`. Residue verification in
general → `foodsafety.cleaning-verification-atp`. The release checks
after the clean → `changeover.first-off-release`,
`packaging.code-label-verification`. The CCP/OPRP status →
`foodsafety.haccp`.

## In food and FMCG manufacturing
Bakeries (nut, sesame, milk), confectionery, ready meals (celery,
mustard, crustacean), sandwiches, snacks — every multi-allergen line's
changeover plan; the undeclared-allergen recall that every technical
manager has read about.

## References
- [guide] UK Food Standards Agency, *Technical guidance: food allergen labelling and information requirements* (2020, updated) — cross-contact and precautionary labelling (from knowledge).
- [guide] FDF, *Guidance on allergen management and consumer information* (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 5.3 — management of allergens: validation and verification of cleaning (from knowledge; clause not confirmed).
- [guide] Campden BRI, *Validation of cleaning to remove food allergens* (Guideline 59) (from knowledge).

## In Faultline
Not built (FC-171); SMED times the clean as a changeover
(`src/tools/changeover`). FC-171 adds the matrix per line (which changes
need the clean), the validation record, each changeover's verification
swabs and release time, the clean's internal/external split into SMED,
and the fails by site.
