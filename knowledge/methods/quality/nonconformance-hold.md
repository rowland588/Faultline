---
id: quality.nonconformance-hold
name: Product on hold — the nonconformance record, its disposition and what it costs
aka: [NCR, nonconformance, hold, quarantine, disposition, concession, rework, scrap, positive release]
discipline: quality
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the control of nonconforming output as ISO 9001:2015 clause 8.7 requires it and as food-safety standards expect (BRCGS Food Issue 9 clause 3.8, from knowledge — clause not confirmed against the text); the hold's money by `knowledge/MONEY.md` causation H and Q; the worked case computed in `scripts/knowledge/cases-quality.py`
needs: []
next: [rca.eight-d]
alternatives: []
related: [quality.copq, msa.calibration, foodsafety.ccp-monitoring, foodsafety.shelf-life]
---
# Product on hold — the nonconformance record, its disposition and what it costs

## Purpose and principle
Product that may not be right is held — labelled, segregated, locked in
the system — until someone with the authority decides what becomes of it:
released as it is (with the evidence), released under concession (the
customer agreeing), reworked, regraded, or destroyed. The record says what
was held, why, how much, where it is, who decided and on what grounds —
the traceable chain an auditor and a customer ask for. And the hold has a
cost on every day it sits: money tied up, shelf life running out, space
taken, and the chance of the wrong decision.

## Questions it answers
- What is on hold now, how much, since when, and why?
- Who decides, by when, and what are the options?
- What has each hold cost — tied up, lost life, reworked, destroyed?
- Are holds repeating for the same cause (the Pareto that feeds the 8D)?

## Inputs and minimum conditions
- Per hold: the product and lot codes, the quantity (packs, cases, kg),
  the location, the reason (the check that failed, the complaint, the
  deviation), the date raised and by whom, the evidence attached.
- The product's cost to this point (materials + labour), its margin, its
  remaining shelf life; the customer's rules on concession.
- The authority: who may release (quality, not production), written.

## Procedure and calculation
- Raise: identify (a hold label with a unique number), segregate
  (physically or by system lock), record, notify the decider.
- Decide: investigate against the specification and the risk —
  **release** (shown to conform: re-test, the failed check in error);
  **concession** (does not conform but the customer accepts, in writing);
  **rework** (brought to conform, re-inspected, re-released); **regrade**
  (sold as a lower grade); **destroy** (or divert to animal feed where
  lawful). Each with who, when, grounds.
- Days held = decision date − raised date; open holds sorted oldest first.
- Money (`knowledge/MONEY.md`): **tied up** while held = packs × (materials
  + labour to this point) — not lost unless it is; **lost shelf life** =
  days held ÷ life, and the sales window it costs; by disposition —
  released: the review's hours; concession: the price lost; rework:
  labour again (+ materials where added) and the line time if it takes
  the line; regrade: price lost; destroy: materials + labour + the margin
  not earned, + disposal.
- The holds by cause over the period (`quality.pareto`): a repeating
  cause opens an 8D (`rca.eight-d`); a hold raised by a failed gauge
  check goes back to `msa.calibration`'s product-at-risk review.
- Close: the record with the disposition, the quantities by fate, the
  cost, the corrective action's reference.

**Worked case** (`cases-quality.py`): 4,800 packs held 6 days on a failed
seal check. Tied up: £2,544 (£0.42 materials + £0.11 labour a pack). If
destroyed: £2,544 + £1,680 margin not earned = £4,224. If released after a
re-test: the review's hours only. If reworked (re-sealed): labour again.
The carrying charge on the money (12% a year) is £5 — trivial; the real
cost is 6 of 21 days of life gone (29%), which may itself force a
regrade.

## Assumptions, limits and misuse
- Product "on hold" that is not physically segregated is released by
  accident; the label and the lock, not the record alone.
- Release by production under pressure is the failure mode the authority
  rule exists for.
- A hold with no decision date is a slow destroy (the shelf life goes).
- The tied-up money is not a loss and must not be added to the losses;
  only the disposition says what was lost (the two-parts rule).
- Rework must be re-inspected to the same standard; "reworked" without a
  record is a release.
- Allergen and safety holds are HACCP matters with their own rules
  (`foodsafety.ccp-monitoring`).

## Reading the result
"3 holds open (12,400 packs, £6,900 tied up), the oldest 4 days; this
month 9 holds, 6 for seal checks on Line 2 — an 8D is open." The money is
said per hold by its disposition and summed by cause for the cost of poor
quality (`quality.copq`).

## When not to use it — and instead
The failure's cause → `rca.fishbone-5whys`, `rca.eight-d`. The gauge whose
failed check raised the hold → `msa.calibration`. The totals by bucket →
`quality.copq`. Shelf-life decisions → `foodsafety.shelf-life`.

## In food and FMCG manufacturing
Seal, weight and code failures; metal-detector and X-ray fails (CCP
holds); allergen label errors; positive-release lots awaiting micro;
customer complaints with product still in the warehouse; a supplier
material found off-spec.

## References
- [standard] ISO 9001:2015, clause 8.7 — control of nonconforming outputs: identification, segregation, correction, concession, documented information (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 3.8 — control of non-conforming product (from knowledge; clause not confirmed against the text).
- [standard] ISO 22000:2018, clause 8.9 — control of product and process nonconformities (from knowledge).

## In Faultline
Not built (FC-135). The register already holds a problem's held packs
and their money (`src/lib/problemCost.ts`, FC-154 part 2); FC-135 makes
the hold a record of its own on the line — raised from a failed check or
a problem, segregated by label number, its days and its tied-up money on
the line's page and the control room, its disposition chosen with the
authority's name, its cost by fate, and the repeat causes to the 8D.
