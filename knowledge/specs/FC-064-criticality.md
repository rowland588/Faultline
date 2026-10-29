# FC-064 — Equipment criticality ranking — the specification

**Catalogue:** FC-064 · **Knowledge:** `maintenance.criticality` · **Asked for:** W5 reliability wave · **Status:** built (W5b)

## 1. Purpose
Ranks machines A/B/C from consequence and likelihood so RCM, spares and PM hours go to the critical few first.

**Scope.** Scored-register shape at `#/scored/criticality`: table of machines, dimensions 1–5, CCP and standby overrides, classes and tiles. Not automatic likelihood from reliability; not FC-066 spares levels; not FC-065 RCM tasks.

## 2. Users and scenarios
Engineer and ops lead at a desk; yearly review after layout or product change.

## 3. Method selection
Consequence × likelihood matrix (practice; ISO 55000 context from knowledge). C = max(production, safety, quality, repair); score = C × L; classes A ≥15 or CCP or safety 5; B 8–14; C <8; standby drops one class.

**Established · assumed · chosen.**
- *Established:* worked case in `scripts/knowledge/cases-maintenance.py`; logic in `src/lib/ie/criticality.ts`.
- *Assumed:* scales 1–5 with anchors from the knowledge record.
- *Chosen:* typed likelihood until linked to reliability.
- *Money:* not priced on this page.

## 4. Inputs
Per machine: name, four consequence dimensions, likelihood, CCP tick, standby tick.

## 5. Data suitability
All scored rows need complete 1–5 inputs for a class.

## 6. Calculations
`rankCriticality`, `summarizeCriticality` — two class A in the worked case (wrapper and checkweigher CCP).

## 7. Outputs
Class A/B/C tiles, sentence, verdict band, caveats, closing.

**The report.** Ranking table with score and class per machine; tiles and sentence on paper.

## 8. Manufacturing usability
Editable table; New ranking on the list; tool shell with Report ▾.

## 9. Failure handling
Incomplete rows named; empty ranking refused politely.

## 10. Integration
`src/tools/scored/`; `studyLinks`; `studiesPdf`; hub `#/scored`.

## 11. Verification
`criticality.test.ts`; `scored-shape.mjs`.

**Acceptance criteria.**
1. Worked case class counts — `criticality.test.ts`.
2. Hub and tiles — `scored-shape.mjs`.
3. Catalogue entry available with spec and acceptance script in the gate.

## 12. Maintainability
Code: `src/tools/scored/`, `src/lib/ie/criticality.ts`. Later: read likelihood from reliability (FC-058) and losses — separate slice.
