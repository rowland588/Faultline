---
id: foodsafety.haccp
name: HACCP — hazards, critical control points and the plan
aka: [HACCP, hazard analysis, CCP, critical limit, Codex HACCP, food safety plan, OPRP, decision tree]
discipline: foodsafety
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the seven principles and twelve steps as the Codex *General Principles of Food Hygiene* CXC 1-1969 (rev. 2020) and ISO 22000:2018 set them (from knowledge; the Codex text is public but not fetchable from here); the CCP decision on two steps worked in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [foodsafety.ccp-monitoring]
alternatives: [quality.fmea]
related: [commissioning.operational-readiness, foodsafety.allergen-changeover, foodsafety.metal-detection-verification, quality.control-plan]
---
# HACCP — hazards, critical control points and the plan

## Purpose and principle
The law's method for food safety: list every hazard (biological,
chemical including allergens, physical) at every step of the process,
decide where a control is essential — a critical control point — set a
critical limit there, monitor it, act when it is breached, verify the
system works, and keep the records. The CCPs are few (cook, chill,
metal detection, allergen labelling) and everything else is a
prerequisite programme (hygiene, pest control, training) or an
operational PRP. The plan is the site's quality system's record of
truth, owned by the HACCP team and the food-safety lead; Faultline's
part is not to hold the plan but to connect its monitoring, its
deviations and its changes to the line's work — a new machine, a new
product, a process change all re-open the hazard analysis.

## Questions it answers
- Which steps are CCPs, with what critical limit, monitored how and
  how often, and what is done on a breach?
- Does a change on the line (a new machine, a new allergen, a new
  speed) touch the plan — and has the plan been amended and validated
  before the change runs?
- Are the CCP checks being done and the deviations handled
  (`foodsafety.ccp-monitoring`)?

## Inputs and minimum conditions
- The product description and intended use; the flow diagram verified
  on the floor; the HACCP team (production, quality, engineering,
  hygiene).
- The hazard analysis per step: the hazard, its likelihood and
  severity, the control measures.
- The prerequisite programmes in place (the foundation Codex requires
  before HACCP).

## Procedure and calculation
Codex's twelve steps: 1 assemble the team · 2 describe the product ·
3 identify the intended use · 4 construct the flow diagram · 5 confirm
it on site · then the seven principles — 6 (P1) hazard analysis · 7
(P2) determine the CCPs (the decision tree: Q1 do control measures
exist? Q2 is the step designed to eliminate or reduce the hazard to an
acceptable level? Q3 could contamination occur at or above acceptable
levels? Q4 will a later step eliminate or reduce it? — a CCP where the
answers say the hazard must be controlled here) · 8 (P3) critical
limits (measurable: a temperature, a time, a detector sensitivity, a
pH) · 9 (P4) monitoring (what, how, how often, who) · 10 (P5)
corrective actions (the product since the last good check, the process,
the record) · 11 (P6) verification (records review, calibration,
testing, re-validation) · 12 (P7) documentation and records.
- ISO 22000's addition: operational PRPs (OPRPs) for controls that
  matter but are not CCPs (allergen labelling checks are often an OPRP
  or a CCP by the site's choice).
- Validation: evidence that the critical limit controls the hazard
  (a cook of 75 °C for 30 s achieves a 6-log reduction of the target
  organism — from the literature or a challenge study); verification:
  evidence the plan is followed.
- A change (a new machine in the stage gate, a new product, a new
  speed): the hazard analysis re-run for the steps affected, the plan
  amended, validated and signed before the change runs — an item in
  `commissioning.operational-readiness`.

**Worked case** (`cases-planning-foodsafety.py`, the decision): "metal
detection" — Q1 yes (the detector), Q2 yes (designed to remove the
hazard) → CCP; critical limit: detect and reject Fe 2.0, non-Fe 2.5,
stainless 3.5 mm; monitoring: test pieces hourly; corrective action:
hold everything since the last good check; verification: records
review, the annual validation of sensitivity. "Cooking" — Q2 yes → CCP,
limit core ≥ 75 °C (or an equivalent time–temperature). "Allergen
labelling" — a CCP or an OPRP by the site's choice; the plan says which,
and the label checks follow (`packaging.code-label-verification`).

## Assumptions, limits and misuse
- Faultline is not the HACCP plan's record of truth; the quality system
  is. Faultline reads the plan's CCPs to connect the checks, the
  deviations and the changes.
- Too many CCPs (every check made critical) dilute attention; the
  decision tree exists to keep them few.
- A critical limit that cannot be measured on the line ("product safe")
  is not a limit; it is a temperature, a time, a size.
- Monitoring without the corrective action's product-at-risk rule is
  a record, not a control (`msa.calibration`'s arithmetic).
- A change made before the plan is amended is the commonest audit
  non-conformance on a new line.

## Reading the result
"Line 2 has three CCPs — cook, metal detection, chill; the new slicer
adds a physical hazard step: the plan is amended and validated before
the slicer runs (readiness item 23, due Thursday)." Money: a CCP breach's
product at risk (held — `knowledge/MONEY.md`, H) and the consequence
avoided (C); the plan's cost is the checks' labour (L).

## When not to use it — and instead
Quality and reliability failure modes → `quality.fmea`. The CCP checks'
record → `foodsafety.ccp-monitoring`. The detector's checks →
`foodsafety.metal-detection-verification`. The allergen clean →
`foodsafety.allergen-changeover`. The quality checks that are not CCPs →
`quality.control-plan`.

## In food and FMCG manufacturing
Every site; the stage gate's new line re-opening the plan; a new
allergen in the range; a speed increase that shortens a cook or a
chill — the plan is where the change meets the law.

## References
- [standard] Codex Alimentarius, *General Principles of Food Hygiene* CXC 1-1969, revised 2020, with its HACCP annex — the twelve steps and seven principles (from knowledge; public, not fetchable from here).
- [standard] ISO 22000:2018, *Food safety management systems — Requirements* — PRPs, OPRPs and CCPs (from knowledge).
- [law] Regulation (EC) No 852/2004 on the hygiene of foodstuffs, Article 5 — HACCP-based procedures required (retained in UK law; from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), section 2 — the HACCP plan (from knowledge).

## In Faultline
Not built as a record (FC-168): sites keep HACCP in their quality
system. Faultline's pieces are the CCP checks on the line
(`foodsafety.ccp-monitoring`), the detector and checkweigher
verifications, and the readiness item "HACCP amended and validated"
on a stage-gate project — each connecting the plan to the line's work
without duplicating the plan.
