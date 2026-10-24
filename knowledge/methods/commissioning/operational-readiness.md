---
id: commissioning.operational-readiness
name: Operational readiness — everything the line needs before it is handed to production
aka: [operational readiness review, ORR, readiness checklist, handover readiness, ready-to-operate, start-up readiness]
discipline: commissioning
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — capital-project practice (operational readiness reviews as process-industry and FMCG project methods run them; from knowledge, no single standard); the readiness arithmetic worked in `scripts/knowledge/cases-operations.py`
needs: [commissioning.stage-gate]
next: []
alternatives: []
related: [people.skills-matrix, foodsafety.haccp, maintenance.planned-maintenance, maintenance.spares-poisson, quality.control-plan]
---
# Operational readiness — everything the line needs before it is handed to production

## Purpose and principle
A machine that passed its tests is not a line that production can run:
the people must be trained and signed off, the standards and SOPs
issued, the HACCP plan amended and validated, the spares on the shelf,
the PM schedule loaded, the cleaning validated, the control plan's
checks in place, the labels and codes set up, the planning system
updated. Operational readiness is the list of everything that is not
the machine, each item with an owner and a day, and the gate is every
item done — not the average. It is the half of commissioning most often
left to the week after handover, when the line is already expected to
run.

## Questions it answers
- What is not ready, by area, by owner, by day — and what is past its
  day?
- Is the line ready to hand over, item by item (never "78% ready")?
- Which open items would stop production or breach a food-safety
  requirement on day one?

## Inputs and minimum conditions
- The readiness list for the kind of change (a new line's is long; a
  rebuilt machine's shorter), by area: people · documents and standards ·
  food safety and quality · maintenance and spares · planning and
  systems · hygiene · health and safety · supply.
- Each item with its owner, its due day, its evidence when done (the
  signed training record, the issued SOP's number, the validated plan).
- The handover date it is working to.

## Procedure and calculation
- Items ready ÷ items, per area and overall — shown as a count, not a
  percentage alone, because the gate is every item.
- Open items by owner and due day; past due in red; the ones that would
  stop day one marked as such (a food-safety item is never "nice to
  have").
- Each area's own method behind its items: people by the skills matrix
  (`people.skills-matrix` — who is signed off on which station);
  food safety by the HACCP amendment and validation (`foodsafety.haccp`);
  maintenance by the PM schedule and criticality-based spares
  (`maintenance.planned-maintenance`, `maintenance.spares-poisson`);
  quality by the control plan (`quality.control-plan`).
- The review: the list walked with the owners before the handover
  meeting; what remains open at handover goes on the handover list with
  the same owners and days — the list does not vanish at the gate.
- Money: an open item that stops day one costs the line's contribution
  for the time it stops it (`knowledge/MONEY.md`, T); readiness is the
  cheapest insurance the project buys.

**Worked case** (`cases-operations.py`): 72 items in six areas — people
trained and signed off 14/18, SOPs issued 9/11, HACCP amended and
validated 3/4, spares on the shelf 22/30, PM schedule loaded 6/6,
cleaning validated 2/3; overall 56/72 (78%). The gate is not 78%: it is
16 open items, 3 past their day — and the HACCP validation and the
cleaning validation are the two that stop day one.

## Assumptions, limits and misuse
- A percentage hides the one item that stops production; the count and
  the names are the figure.
- Items without owners and days are wishes; the list is actions.
- Readiness started in the last fortnight is the classic failure;
  the list is built at the project's start and tracked through the gates.
- Training "done" without a sign-off on the station is attendance, not
  readiness (`people.skills-matrix`).
- The food-safety items (HACCP, cleaning validation, allergen controls)
  are legal requirements with their own validation evidence, not ticks.

## Reading the result
"Readiness: 56 of 72 items done; 16 open, 3 late — the HACCP validation
and the cleaning validation stop day one; handover is Friday." Money:
the open items that would stop the line × its contribution per shift
(`knowledge/MONEY.md`, T) — what the week's delay would cost against the
days to finish them.

## When not to use it — and instead
The machine's own tests → `commissioning.acceptance-tests`. The people's
competence by station → `people.skills-matrix`. The food-safety plan →
`foodsafety.haccp`. The spares and the PM schedule →
`maintenance.spares-poisson`, `maintenance.planned-maintenance`.

## In food and FMCG manufacturing
A new packing line's handover; a rebuilt oven or fryer; a new product
on an existing line (the readiness list is shorter but the HACCP and
label items are the same); a site's first line in a new allergen.

## References
- [practice] Operational readiness review practice in capital projects (process industries, FMCG; often called ORR or "ready for start-up") — from knowledge; no single public text.
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 4.6 (equipment) and section 2 (HACCP) — the food-safety side of a new line (from knowledge; clauses not confirmed).
- [design] `docs/STAGEGATE.md` — Faultline's handover gate.

## In Faultline
Partly: the stage gate's handover list holds items with owners and days
(`src/project`); no readiness list is offered by area (FC-082). FC-082
adds the list by area for the kind of change, each item's evidence, the
day-one stoppers marked, and the count (never only a percentage) on the
project's front page and the commissioning report.
