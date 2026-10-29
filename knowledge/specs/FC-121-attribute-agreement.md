# FC-121 — Inspectors agreeing: attribute agreement (kappa) (a question of the Analysis tool)

**Catalogue:** FC-121 attribute agreement (a mode of FC-105 Analysis). **Knowledge:** `msa.attribute-agreement`. **Programme:** W4b (`docs/TOOLS-BUILD.md`). **Status:** built October 2026.

## 1. Purpose
When good and bad are judged by eye, the study asks whether each inspector repeats themselves, agrees with the reference, and agrees with each other — in agreement % and Cohen’s or Fleiss’s κ — so visual checks can be trusted before reject rates and capability are read.

**Scope.** One question in Analysis (`kind: 'attr'`): item codes and inspectors agreed first; a reference verdict (pass or reject) per item; each inspector’s verdict per item per look (`arm` item, `col` inspector or `reference`, `group` look, `value` 0 pass · 1 reject); within-inspector agreement, agreement with reference on both looks, Cohen’s κ vs reference (look 1), miss and false-alarm rates, Fleiss κ over all looks; κ bands ≥0.75 good · 0.40–0.75 marginal · <0.40 poor; inspector table and items they disagree on; optional money of false alarms on good packs (materials a pack). Not in this build: in-app shuffle/blind order, sensory triangle (FC-137), complaint cost for misses (Q).

## 2. Users and scenarios
QA lead and line supervisor on the floor with a phone; quality engineer at a desk after the study. Seal wrinkle check — fifty coded packs, three inspectors, two blind looks each, reference from an expert.

## 3. Method selection
Attribute MSA (AIAG MSA ch. III section C — from knowledge); κ corrects for chance agreement. Alternatives: measured characteristic → gauge R&R (FC-118); taste/texture → triangle test (FC-137).

**Established · assumed · chosen.**
*Established:* κ formulas as `knowledge/methods/msa/attribute-agreement.md`; independent case `scripts/knowledge/cases-msa.py`.
*Assumed:* borderline mix in the sample (~⅓–½ rejects); blind random order on the floor.
*Chosen:* κ bands 0.75 / 0.40 (Landis–Koch guide, common practice); pass = 0, reject = 1 on readings; money — false alarms on good packs as M (materials a pack per `knowledge/MONEY.md` FC-121), named when materials a pack is missing.

## 4. Inputs
What is judged (name); item codes (≥10, 30–50 usual); 2–3 inspectors; 2 looks each (default 2); reference pass/reject per item; optional materials a pack and packs a shift for false-alarm money.

## 5. Data suitability
Complete grid — every item × inspector × look plus every reference; incomplete refused in words. Too few items (<10) refused before κ is said.

## 6. Calculations
`lib/ie/attributeAgreement.ts` — observed agreement, Cohen’s κ, Fleiss κ, miss rate (rejects passed ÷ rejects), false-alarm rate (good rejected ÷ good). Unit tests vs `cases-msa.py` and hand cases.

## 7. Outputs
Sentence naming each inspector’s κ and errors; tiles (Fleiss κ, worst inspector, items all agree); inspector table; list of items where anyone disagrees with reference; closing line with verdict; money sentence when materials given.

**The report.** Analysis paper: band, tiles, table, disagreements, every verdict listed, closing line — same module as the screen.

## 8. Manufacturing usability
Agree items and inspectors; set reference per item (chips); Pass / Reject per cell; paste `item inspector look pass|reject`; phone 375px.

## 9. Failure handling
Empty name, too few items or inspectors, incomplete grid, bad paste — each said; struck readings left out.

## 10. Integration
Record: `ToolStudy` tool `analysis`, `agreed.analysis` kind `attr`. Directory FC-121 Open → `/analysis`. Access unchanged from Analysis.

## 11. Verification
Unit tests `attributeAgreement.test.ts`, `analysisAttr.test.ts`; acceptance `scripts/acceptance/attribute-agreement.mjs`.

**Acceptance criteria.**
1. Question offered; empty name refused — `attribute-agreement.mjs` step 1.
2. Seeded ten-item case — κ and agreement match module — `attributeAgreement.test.ts`, `attribute-agreement.mjs` step 2.
3. Paper downloaded and read back — `attribute-agreement.mjs` step 3.
4. Phone 375px — `attribute-agreement.mjs` step 4.

## 12. Maintainability
Code: `src/lib/ie/attributeAgreement.ts`, `src/tools/analysis/attr.ts`, wired in `analysis.ts` and `AnalysisScreen.tsx`. Left: blind shuffle in app; miss priced at typed complaint cost.
