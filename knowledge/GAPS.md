# What the knowledge does not cover yet, and what needs checking

Rowland, 22 October: *"Do not claim exhaustive coverage when coverage is
incomplete. Maintain a visible list of research gaps and areas requiring
expert verification."* This is that list. It is kept by hand; when an item
is closed, say how and when, and move what was learned into the record.

## Where the library stands — 22 October

176 method records across 23 disciplines; **33 at full depth** (the methods
behind every tool Faultline has built, and the capability family the pilot
uses), **143 summaries** (the method, its core formula, its limits and its
food use, enough to specify from — not enough to build from without reading
the sources). By the strongest evidence behind them: standard 29, law 3,
textbook 68, peer-reviewed 9, practice 62, Faultline decision 5. **128
records were written from knowledge and say so** in their `checked` line;
13 had their main standard confirmed online on 22 October (scope and
edition only — the texts are paywalled). 69 reference lines say *"from
knowledge"* or *"edition to confirm"*.

A summary record is a starting point: before its tool is specified, the
skill's step 2 reads its sources and brings it to full depth.

## Standards whose text has not been read (scope and edition confirmed only)

| Standard | What depends on it | What to check |
|---|---|---|
| ISO 22514-5:2019 — capability for attributive characteristics | FC-098, FC-099 (capability of counted data) | its indices and their definitions, before calling Faultline's attribute verdict "per ISO 22514-5" — until then it is said as the AIAG/Montgomery method |
| ISO 22514-2:2017 — time-dependent process models (under revision) | FC-094, FC-096 | the eight distribution models and the percentile index's exact form |
| EN 415-11:2021 — efficiency and availability of packaging lines | FC-085, the loss count's time model (`docs/CAPACITY.md`) | the time states, the output model and the acceptance minimum points |
| ISO 7870-2:2023 — Shewhart control charts | FC-086 to FC-090 | any change from the 2013 edition's constants or rules |
| ISO 22400-2:2014 — manufacturing KPIs | FC-050 (left out) | only if OEE is ever reconsidered |
| ISO 2859-1 and ISO 3951-1:2022 — acceptance sampling | FC-129, FC-130 | their tables are copyright: how plans can be offered honestly (computed OC curves, or a licence) |
| ISO 4120 (triangle test), ISO 22514-3 (machine capability), IEC 60605-4, IEC 61649, IEC 61025, EN 15341, EN 1672-2, OIML R 51, OIML R 87 | their entries | edition and the formula or limit each record quotes |

## Facts quoted from secondary sources

- BRCGS Food Safety Issue 9 (2022) clause numbers for metal-detection checks,
  traceability, line clearance and labelling — not confirmed against the
  standard (`foodsafety.metal-detection-verification`,
  `foodsafety.traceability-exercise`, `changeover.first-off-release`). The
  "4 hours" for a traceability exercise is a common certification-body
  expectation; sources disagree whether BRCGS states it.
- Laney's p′ and u′ — read via secondary summaries, not the 2002 paper.
- The automotive gauge-study constants (Cg, Cgk: 20% of tolerance, 6s,
  ≥ 1.33) — VDA Volume 5 to confirm.
- HSE's MAC, ART and RAPP scoring tables — to be copied from the HSE
  documents when those tools are built, not from memory.

## Licensed or specialist methods

- **MTM and MOST** (FC-023): their motion tables are licensed by their
  associations; analysts are certified. Not buildable without a licence.
- **Shelf life** (FC-175), **hygienic design** (FC-178), **carbon** (FC-229):
  microbiology, EHEDG guidance and emission factors need specialist sources.
- **Simulation** (FC-047): needs measured repair times first (FC-059).
- **Lean maturity** (FC-018): no single standard model.

## Disciplines not yet researched at all

Process engineering of food (thermal process validation — F₀ values, retorts,
pasteurisation units; baking and frying process control); microbiology beyond
environmental monitoring; packaging machinery design; robotics and automation
readiness; machine safety (PUWER risk assessment, guarding, lock-out) — the
app's ergonomics stops at manual handling; quality-system clause mapping (ISO
9001, BRCGS, FSSC 22000); supply chain beyond safety stock (supplier lead-time
variability, S&OP); Bayesian methods, nonparametric tolerance intervals and
multivariate SPC; human factors beyond ergonomics (shift work and fatigue).
Each is a candidate for records when a real problem on the line needs it.

## Faultline decisions recorded as knowledge

These are decisions, not established facts, and are marked `kind:
faultline` or `evidence: decision`: the cost model (`cost.line-cost-model`),
Line Talk, Ask, the reports' lean page, the project as the workspace, the
ramp-up and pace forecasts. The verdict rule for an attribute capability
(met when the 95% upper bound is within the agreed maximum) is Faultline's
reading of the method, said in `spc.capability-attribute-proportion`.
The capability study's shape test is D'Agostino–Pearson K², chosen over
Anderson–Darling by simulation on rounded readings (22 October,
`spc.normality-checks`) — no standard prescribes either; ISO 22514-2's text
should be read for what it recommends before this is called standard
practice.
Pass or fail's confidences (23 October, part 1b of FC-094's spec) — 90%,
95% and 99% offered, the share good said rounded down to 0.1% — are this
specification's choices under Rowland's go, not yet put to him one by one;
a measurement's Ppk still says *95% sure* where pass or fail now says *95%
confident* — the wording to bring in line next. A loss allowed is the
business's rule (passed on the count), never called proof of its share.

## Verification status of the catalogue

The catalogue's statuses are checked against the code by
`src/catalogue/__tests__/catalogue.test.ts`. Statuses before 22 October were
assessed from the acceptance scripts' coverage (`knowledge/TOOLSET-AUDIT.md`):
an entry with no acceptance script of its own is *Partly*, whatever its
quality.
