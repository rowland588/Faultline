---
id: foodsafety.hygienic-design
name: Hygienic design review — findings by severity on new or changed equipment, closed before handover
aka: [hygienic design, EHEDG, EN 1672-2, cleanability review, design for cleaning, hygiene risk assessment of equipment]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — EHEDG guidelines (Doc. 8, hygienic design principles) and EN 1672-2 (food processing machinery — hygiene requirements) named from knowledge; editions to confirm, texts not read; the worked FAT review in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [commissioning.acceptance-tests]
alternatives: []
related: [commissioning.operational-readiness, foodsafety.environmental-monitoring, foodsafety.cleaning-verification-atp, maintenance.autonomous-maintenance]
---
# Hygienic design review — findings by severity on new or changed equipment, closed before handover

## Purpose and principle
A machine that cannot be cleaned will not be clean: hollow rollers,
dead legs, horizontal ledges, exposed threads in the product zone, gaps
that trap product, materials that corrode — each a harbourage that the
environmental monitoring programme will find a year later as a
*Listeria* positive. The hygienic design review walks a new or changed
machine against the principles (EHEDG's; EN 1672-2's requirements) zone
by zone — product contact, splash, non-product — before it is accepted,
grades each finding by severity, and has the criticals closed before
shipment, the majors before site acceptance, the minors before handover.
It is a stage-gate check that saves the hygiene team years.

## Questions it answers
- Which features of this machine cannot be cleaned, and how badly?
- Which findings must close before FAT, SAT and handover — and have
  they?
- Where will the environmental programme find its positives if nothing
  is done?
- Does a modification on site (a new guard, a bracket) re-open the
  review?

## Inputs and minimum conditions
- The machine's drawings and, at FAT, the machine itself; the zoning
  (product-contact, splash, non-product) agreed.
- The checklist from the principles: materials (surface finish,
  corrosion resistance, food-grade), joints and welds (continuous,
  ground, no crevices), drainability (self-draining surfaces, no dead
  legs), accessibility (removable without tools where cleaned daily),
  fasteners (no exposed threads in the product zone), hollow bodies
  (sealed or avoided), seals and gaskets (hygienic, replaceable),
  lubricants (food-grade), drives and bearings (outside the product
  zone or sealed).
- A reviewer who knows cleaning (the hygiene manager) and one who knows
  the machine (the engineer).

## Procedure and calculation
- Each finding: the feature, the zone, the principle broken, a photo,
  the severity — critical (product-contact harbourage, non-cleanable),
  major (splash zone or difficult to clean), minor (non-product zone,
  cosmetic) — the owner (the OEM or the site) and the gate by which it
  closes.
- The rule: criticals closed before shipment (or the design changed),
  majors before SAT, minors before handover; each closure with a photo.
- Findings by severity and zone; open past their gate in red on the
  project (`commissioning.operational-readiness`'s list carries them).
- After handover: the machine's findings become the environmental
  programme's swab sites (`foodsafety.environmental-monitoring`) and the
  pre-op swab sites (`foodsafety.cleaning-verification-atp`) — the
  review tells the programmes where to look.
- Site modifications (a bracket, a guard, a sensor) go through the same
  checklist before they are fitted.
- Money: a harbourage found at FAT costs the OEM a redesign; found on
  site, a modification (M); found by a positive a year later, a product
  hold and a deep clean (H, L) and perhaps a recall (C).

**Worked case** (`cases-planning-foodsafety.py`): a new slicer at FAT
reviewed against EN 1672-2 and EHEDG — 2 critical (a hollow roller in
the product zone, a dead leg in the CIP line), 5 major (gaps over 0.5 mm
at the frame, exposed threads in the product zone), 9 minor; the
criticals closed before shipment (the roller replaced, the dead leg
re-piped), the majors before SAT, the minors before handover — each with
a photo and an owner on the project's list.

## Assumptions, limits and misuse
- A review from drawings alone misses what the build added; the FAT
  walk is the review.
- Severity argued down to ship on time is the recall's first cause;
  the zone decides the severity.
- A machine "EHEDG-certified" is certified for its tested
  configuration; the site's modifications are not.
- The review is of cleanability; the cleaning method and its
  validation are separate (`foodsafety.allergen-changeover`,
  `foodsafety.cleaning-verification-atp`).
- Findings closed without a photo are open.

## Reading the result
"Slicer FAT: 2 criticals (hollow roller, CIP dead leg) — closed before
shipment; 5 majors to close before SAT on the 14th; 9 minors before
handover. The frame gaps become pre-op swab sites." Money: the OEM's
redesign now against the site's modification later and the hold and
deep clean a positive would cost (`knowledge/MONEY.md`, M, H, L, C).

## When not to use it — and instead
The acceptance tests on the machine → `commissioning.acceptance-tests`.
The readiness list it feeds → `commissioning.operational-readiness`. The
programmes that inherit the sites → `foodsafety.environmental-monitoring`,
`foodsafety.cleaning-verification-atp`.

## In food and FMCG manufacturing
Every new slicer, depositor, conveyor, filler and weigher; every site
modification; the retrofit of a guard that creates a ledge — the
stage gate's Install gate is where the review sits.

## References
- [guide] EHEDG, Document 8, *Hygienic design principles*, 3rd ed., 2018 — the principles (from knowledge; text not read).
- [standard] EN 1672-2:2020, *Food processing machinery — Basic concepts — Part 2: Hygiene and cleanability requirements* (from knowledge; edition to confirm).
- [standard] EN ISO 14159:2008, *Safety of machinery — Hygiene requirements for the design of machinery* (from knowledge).
- [guide] 3-A Sanitary Standards (US) for context (from knowledge).

## In Faultline
Research first (FC-178): the checklist's content is EHEDG's and the
standard's, to be taken from the texts. When built it is a review on a
stage-gate machine at Install — findings with zone, severity, photo,
owner and gate; open past their gate on the project and the readiness
list; and the closed findings handed to the swab programmes as sites.
