---
id: foodsafety.hygienic-design
name: Hygienic design review — findings by severity on new or changed equipment, closed before handover
aka: [hygienic design, EHEDG, EN 1672-2, cleanability review, design for cleaning, hygiene risk assessment of equipment]
discipline: foodsafety
kind: adaptation
evidence: practice
depth: full
checked: 2026-10-25 — scope, editions, price and access of EHEDG Guideline 8 (now the fourth edition, December 2025, a free download; third edition March 2018), EHEDG Guideline 58 (hygienic design risk management; sold), BS EN 1672-2:2020 (contents list and scope; text paid) and EN ISO 14159:2008 (scope; text paid) confirmed from search-result excerpts of ehedg.org, BSI, ANSI, SIS and DIN listings and from a published review; the container cannot fetch ehedg.org or the stores, so Guideline 8 was not read and no clause number is quoted; the checklist's principles below are those every secondary excerpt repeats, from knowledge, to be written from Guideline 8 in Faultline's own words; the critical, major and minor grading and the gate rule are Faultline's own, not EHEDG's or the standard's; the worked FAT review in scripts/knowledge/cases-planning-foodsafety.py is illustrative
needs: []
next: [commissioning.acceptance-tests]
alternatives: []
related: [commissioning.operational-readiness, foodsafety.environmental-monitoring, foodsafety.cleaning-verification-atp, maintenance.autonomous-maintenance]
---
# Hygienic design review — findings by severity on new or changed equipment, closed before handover

## Purpose and principle
A machine that cannot be cleaned will not be clean: hollow rollers, dead legs,
horizontal ledges, exposed threads in the product zone, gaps that trap
product, materials that corrode — each a harbourage that the environmental
monitoring programme will find a year later as a *Listeria* positive. The
hygienic design review walks a new or changed machine against the published
principles zone by zone — product contact, splash, non-product — before it is
accepted, grades each finding, and has the worst closed before shipment, the
next before site acceptance, the rest before handover. It is a stage-gate
check that saves the hygiene team years.

What is public and what is Faultline's: the **principles** are EHEDG's
(Guideline 8, *Hygienic design principles*) and the standards'. The **grading**
(critical, major, minor), the **gates** each must close by, and the
**findings register** are Faultline's own way of using them in a stage gate;
neither EHEDG nor EN 1672-2 prescribes them. The tool says which is which.

## Questions it answers
- Which features of this machine cannot be cleaned, and how badly?
- Which findings must close before FAT, SAT and handover — and have they?
- Where will the environmental programme find its positives if nothing is
  done?
- Does a modification on site (a new guard, a bracket) re-open the review?

## Inputs and minimum conditions
- The machine's drawings and, at FAT, the machine itself; the zoning agreed.
  Both EN 1672-2 (its contents list shows separate requirements for the *food
  area*, the *splash area* and the *non-food area*, clause 5.2.2 to 5.2.4 for
  materials and 5.3.2 to 5.3.4 for design) and EHEDG divide a machine into
  areas by contact with food and with splash; the definitions' wording is the
  standard's and is paid.
- The checklist from the principles (in our words, from Guideline 8): materials
  (corrosion resistance, compatibility with product and cleaning agents,
  food-grade where touching food), surface finish and joints (smooth, no
  crevices, continuous welds where product touches), drainability (self-draining,
  no pooling), dead areas and dead legs, accessibility (for cleaning and
  inspection; tools needed to open), fasteners (no exposed threads in the
  product zone), hollow bodies (sealed or avoided), seals and gaskets
  (hygienic, replaceable), lubricants (food-grade), drives and bearings
  (outside the product zone or sealed), horizontal ledges and legs and feet.
  Every secondary excerpt repeats these; where a numeric limit is quoted in
  vendor pages (a surface roughness figure, an internal radius) it was **not**
  found in a source of record and the tool does not use it.
- A reviewer who knows cleaning (the hygiene manager) and one who knows the
  machine (the engineer).

## Procedure and calculation
- Each finding: the feature, the zone, the principle broken, a photo, the
  severity, the owner (the OEM or the site) and the gate by which it closes.
  The principle is named from the checklist; no clause is quoted until
  Guideline 8 is read.
- Faultline's grading (a decision, said as one): **critical** — a product-
  contact harbourage or something that cannot be cleaned; **major** — splash
  zone or difficult to clean; **minor** — non-product zone or cosmetic. The
  rule: criticals closed before shipment (or the design changed), majors
  before SAT, minors before handover; each closure with a photo. Guideline 58
  (sold) gives a general risk-management process (scope, hazard
  identification, analysis and evaluation, reduction, verification) built on
  ISO 31010; whether it grades findings was not seen, and Faultline's three
  grades are not its.
- Findings by severity and zone; open past their gate in red on the project
  (`commissioning.operational-readiness`'s list carries them).
- After handover: the machine's findings become the environmental programme's
  swab sites (`foodsafety.environmental-monitoring`) and the pre-op swab sites
  (`foodsafety.cleaning-verification-atp`).
- Site modifications (a bracket, a guard, a sensor) go through the same
  checklist before they are fitted.
- Money: a harbourage found at FAT costs the OEM a redesign; found on site, a
  modification (M); found by a positive a year later, a product hold and a
  deep clean (H, L) and perhaps a recall (C).

**Worked case** (`cases-planning-foodsafety.py`, illustrative): a new slicer at
FAT reviewed against the principles — 2 critical (a hollow roller in the
product zone, a dead leg in the CIP line), 5 major (gaps at the frame,
exposed threads in the product zone), 9 minor; the criticals closed before
shipment (the roller replaced, the dead leg re-piped), the majors before SAT,
the minors before handover — each with a photo and an owner on the project's
list. The case's "gaps over 0.5 mm" is an example, not a limit from a source.

## Assumptions, limits and misuse
- A review from drawings alone misses what the build added; the FAT walk is
  the review.
- Severity argued down to ship on time is the recall's first cause; the zone
  decides the severity.
- A machine "EHEDG-certified" is certified for its tested configuration; the
  site's modifications are not. EHEDG's equipment certification is its own
  process; a Faultline review is **not** a certification, a declaration of
  conformity or a substitute for one.
- The review is of cleanability; the cleaning method and its validation are
  separate (`foodsafety.allergen-changeover`, `foodsafety.cleaning-verification-atp`).
- Findings closed without a photo are open.
- **What a checklist cannot do:** judge a design it was not shown, know that a
  weld is continuous without being looked at, or replace a hygienic design
  specialist on a complex machine. It records what the reviewers saw.
- EN 1672-2 and EN ISO 14159 are paid standards; Faultline neither copies nor
  paraphrases their clauses. Guideline 8 is a free download, still EHEDG's
  copyright: the items are written in our own words and cite its section.

## Reading the result
"Slicer FAT: 2 criticals (hollow roller, CIP dead leg) — closed before
shipment; 5 majors to close before SAT on the 14th; 9 minors before handover.
The frame gaps become pre-op swab sites. Graded by the site's three grades,
against the principles in EHEDG Guideline 8; not a certification." Money: the
OEM's redesign now against the site's modification later and the hold and deep
clean a positive would cost (`knowledge/MONEY.md`, M, H, L, C).

## When not to use it — and instead
The acceptance tests on the machine → `commissioning.acceptance-tests`. The
readiness list it feeds → `commissioning.operational-readiness`. The programmes
that inherit the sites → `foodsafety.environmental-monitoring`,
`foodsafety.cleaning-verification-atp`.

## In food and FMCG manufacturing
Every new slicer, depositor, conveyor, filler and weigher; every site
modification; the retrofit of a guard that creates a ledge — the stage gate's
Install gate is where the review sits.

## References
- [guidance] EHEDG, Guideline 8, *Hygienic design principles* — fourth edition, December 2025 (announced 16 December 2025), a free download from ehedg.org; third edition March 2018 (VDMA Verlag); the principles apply to equipment and to the manufacturing environment and underpin EHEDG certification. Listed and described in excerpts; **not read**.
- [guidance] EHEDG, Guideline 58, *Hygienic design risk management* — stepwise hygiene risk management on ISO 31010, written to support EN 1672-2 and ISO 14159; sold, not read. EHEDG members have free access to all its guidelines.
- [standard] BS EN 1672-2:2020, *Food processing machinery — Basic concepts — Part 2: Hygiene and cleanability requirements* (published 31 January 2021; replaces EN 1672-2:2005+A1:2009). Scope and contents list seen in store listings and a preview excerpt; text paid and not reproduced. Its status was shown differently by two listings; confirm before citing.
- [standard] EN ISO 14159:2008, *Safety of machinery — Hygiene requirements for the design of machinery* (the CEN adoption of ISO 14159:2002; listed as current by BSI, SIS and DIN resellers; ISO catalogue not seen). Scope: hygiene requirements of machinery and information for use, where hygiene risks to the consumer of the product can occur; excludes the uncontrolled release of microbiological agents from the machine. Text paid and not reproduced.
- [paper] Review of assessment and standards in hygienic design of food equipment (MDPI, *Standards*, 6(1), 9) — EHEDG's requirements are qualitative and are readily turned into yes/no audit items; excerpt only.
- [guidance] 3-A Sanitary Standards (US) for context (from knowledge).

## In Faultline
Research first (FC-178).

**FC-178 — CAN BE BUILT as a checklist and a findings register, after one
reading of EHEDG Guideline 8 (fourth edition, free) by someone who then
writes the items in Faultline's words; CANNOT be offered as EN 1672-2 or ISO
14159 compliance, as an EHEDG assessment, or with any limit taken from a
vendor page.** This session could not open ehedg.org, so the items below are
the principles every excerpt repeats, not a reading of the guideline.
A minimal build, a review on a stage-gate machine at Install: *Inputs* — the
machine; the zones (food, splash, non-food, named as the standard's contents
list names them); the checklist's items as yes / no / not applicable with a
note and a photo; findings with zone, principle, grade (Faultline's three),
owner and gate. *Outputs* — findings by grade and zone; the number open past
their gate (red); each gate's "ready to close" or not; the list of closed
findings handed to the swab programmes as sites. *Verdict wording* — "2
critical findings are open and the machine ships on the 3rd: it should not
ship"; "all findings graded critical or major are closed with photos; 9
minors remain for handover"; always with "against the principles in EHEDG
Guideline 8, graded by us; not a certification". *Must not* — say
"EHEDG-compliant", "meets EN 1672-2" or "certified"; quote a roughness or
radius limit; let a grade be argued down without a reason and a name
recorded; pass a finding with no photo. *Validation* — nothing numeric;
the gate rules (a critical open past shipment turns red; a closure without a
photo stays open) are tested on tables of findings, and the checklist's
wording is reviewed by the hygiene manager against Guideline 8 before it
ships. The decision needed from Rowland is that the grades are Faultline's,
and from the builder that Guideline 8 is read first; EHEDG's licence for the
free download should be read for any rule on reuse.
