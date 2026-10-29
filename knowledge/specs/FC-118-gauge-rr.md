# FC-118 — Gauge R&R: how much of what we see is the measurement? (a question of the Analysis tool)

**Catalogue:** FC-118 Gauge R&R (a mode of FC-105 Analysis). **Knowledge:** `msa.gauge-rr`. **Programme:** W4 (`docs/TOOLS-BUILD.md`). **Status:** built October 2026.

## 1. Purpose
Two people measure the same seal and get different numbers. The crossed study says how much variation is the gauge versus the parts, as %GRR, ndc, and EV/AV/PV — so capability and reject decisions can be read knowing the measurement’s share.

**Scope.** One question in Analysis (`kind: 'grr'`): parts × appraisers × trials agreed first; readings carry part (`arm`), appraiser (`col`), trial (`group`), value; crossed two-way ANOVA with AIAG pooling at α 0.25; %GRR of total variation (σ ratio), % contribution (σ² ratio, said apart), %GRR of tolerance when limits are given, ndc, verdict bands 10% / 30%; variance table on screen and paper. Not in this build: attribute agreement (FC-121), designed-run randomisation in the app, gauge noun/record (BLUEPRINT §2).

## 2. Users and scenarios
Quality technician with a phone on the line; engineer at a desk after a study. Seal strength tester — ten packs, three operators, two trials, tolerance 6 N.

## 3. Method selection
Crossed ANOVA (AIAG MSA ch. III) when parts and operators are fixed effects; pool part×operator when p > 0.25. Alternatives: Type 1 only (FC-119), attribute study (FC-121).

**Established · assumed · chosen.**
*Established:* variance components and %GRR as `knowledge/methods/msa/gauge-rr.md`; independent case `scripts/knowledge/cases-msa.py`.
*Assumed:* blind random order on the floor; parts span the range; appraisers trained on one method.
*Chosen:* verdict bands 10% acceptable, 10–30% marginal, >30% not; pooling α 0.25; money — (M) give-away share per `knowledge/MONEY.md` FC-118 — not priced in this slice (missing input named if added later).

## 4. Inputs
Gauge name, unit; parts and appraisers as comma lists (≥5 parts, ≥2 appraisers); trials 2 or 3; optional lower/upper tolerance for %GRR of tolerance.

## 5. Data suitability
Complete grid only — every part × appraiser × trial once; incomplete grid refused in words.

## 6. Calculations
`lib/ie/gaugeRr.ts` — MS_part, MS_op, MS_po, MS_error; pool; σ² components; %GRR, ndc. Unit tests: `src/lib/ie/__tests__/gaugeRr.test.ts` (seal case vs cases-msa.py).

## 7. Outputs
Sentence with %GRR, contribution, tolerance % when given, EV/AV/PV, ndc, repeatability vs reproducibility lead; tiles; variance table; closing line with verdict.

**The report.** Analysis paper (`lib/studiesPdf` analysisBlocks): band, tiles, variance table, every reading listed, closing line — same module as the screen.

## 8. Manufacturing usability
Agree parts and appraisers first; pad entry by part/appraiser with trial counted; paste `part appraiser value` lines; phone 375px.

## 9. Failure handling
Too few cells, incomplete grid, bad paste lines — each said; struck readings left out.

## 10. Integration
Record: `ToolStudy` tool `analysis`, `agreed.analysis` kind `grr`. Shows on Analysis list, line/project tools, directory FC-118 Open → `/analysis`. Access unchanged from Analysis. No migration.

## 11. Verification
Unit tests `gaugeRr.test.ts`, `analysisGrr.test.ts`; acceptance `scripts/acceptance/gauge-rr.mjs`; gate fast subset with `analysis-gauge.mjs`, `learning-curve.mjs`.

**Acceptance criteria.**
1. Question asked first; empty name refused — `gauge-rr.mjs` step 1.
2. Seal case complete grid — %GRR 34.8%, ndc 3, not acceptable, AV > EV — `gaugeRr.test.ts`, `analysisGrr.test.ts`, `gauge-rr.mjs` step 2.
3. Paper downloaded and read back — `gauge-rr.mjs` step 3.
4. Phone 375px — `gauge-rr.mjs` step 4.

## 12. Maintainability
Code: `src/lib/ie/gaugeRr.ts`, `src/tools/analysis/grr.ts`, wired in `analysis.ts` and `AnalysisScreen.tsx`. Left: FC-121 attribute agreement; in-app blind run order; money line.
