# What the knowledge does not cover yet, and what needs checking

Rowland, 22 October: *"Do not claim exhaustive coverage when coverage is
incomplete. Maintain a visible list of research gaps and areas requiring
expert verification."* This is that list. It is kept by hand; when an item
is closed, say how and when, and move what was learned into the record.

## Where the library stands — 24 October

**179 method records across 23 disciplines, every one at full depth** —
brought there on 24 October at Rowland's word ("research all of the tools
that are within our entire knowledge base right now … so when we build the
tool, everything's already functional"), from 39 that morning. Full depth
means: the formulas and constants written out, a worked case whose every
number was computed independently in `scripts/knowledge/cases-*.py`
(SciPy/NumPy — one script a discipline), the verdict rules, the money hook
by `knowledge/MONEY.md`, and a `checked` line that says what was read and
what is from knowledge. By the strongest evidence behind them: standard 29,
law 3, textbook 71, peer-reviewed 9, practice 62, Faultline decision 5.

**What full depth is not.** The texts were not read: 152 of the 179
records say *from knowledge* in their `checked` line, because this
container cannot fetch publishers, Wikipedia or archive.org (403 from the
proxy) and only the three books' listings and a few standards' scopes were
confirmed online. So a record is a specification of the method as a
competent engineer remembers it, with its arithmetic proved by computation
— not a transcription of its source. Where a record quotes a number that
belongs to a text (a clause, a table, a threshold, a factor), it says so and
the item is in the lists below; the faultline-tool skill's step 2 reads the
source before that number reaches a screen.

Where it stood on 22 October: 176 records, 33 full, 143 summaries, 128 from
knowledge.

## Standards whose text has not been read (scope and edition confirmed only)

| Standard | What depends on it | What to check |
|---|---|---|
| ISO 22514-5:2019 — capability for attributive characteristics | FC-098, FC-099 (capability of counted data) | its indices and their definitions, before calling Faultline's attribute verdict "per ISO 22514-5" — until then it is said as the AIAG/Montgomery method |
| ISO 22514-2:2017 — time-dependent process models (under revision) | FC-094, FC-096 | the eight distribution models and the percentile index's exact form |
| EN 415-11:2021 — efficiency and availability of packaging lines | FC-085, the loss count's time model (`docs/CAPACITY.md`) | **Researched 25 Oct 2026, still unread (paid, about 410 USD for the BS adoption).** Seen in excerpts: structure, the technical key figures' rule, a 2 to 8 hour acceptance period, Annex C. Still to read: the time states and their definitions, the output model, E_S, R_S and the delivery efficiency formulas, Annex C, and whether "availability" changed meaning from DIN 8743 — `commissioning.acceptance-tests` says what can be built meanwhile |
| SAE JA1011 (2009; revised November 2024) and JA1012:2011 — RCM | FC-065 | paid (about 115 EUR for JA1011); only the seven questions and consequence classes seen in excerpts. The free NASA RCM Guide (2008) and Nowlan and Heap (1978) carry the decision logic and are not paid, but their tree was not read: read NASA's Logic Tree (Figure 3-2) and task-selection chapters before specifying — `maintenance.rcm` |
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
- **Added 24 October, with the depth pass** — each said in its record's
  `checked` line and marked *to confirm*:
  - ART's exposure bands (low 0–11, medium 12–21, high 22+) and HSE L23's
    quick guideline forces for pushing and pulling (about 200/150 N to
    start, 100/70 N to keep moving, men/women) —
    `ergonomics.hse-mac-art`, `ergonomics.push-pull`.
  - RULA's and REBA's action levels — `ergonomics.rula-reba`; their scoring
    tables are the papers' and are not reproduced.
  - BRCGS Food Issue 9 grading bands (AA/A/B/C/D by majors and minors) and
    the clause numbers for cleaning verification, environmental monitoring,
    allergen management, training and foreign-body detection —
    `foodsafety.audits`, `foodsafety.cleaning-verification-atp`,
    `foodsafety.environmental-monitoring`, `foodsafety.allergen-changeover`,
    `people.skills-matrix`, `foodsafety.metal-detection-verification`.
  - The FMEA Action Priority table (AIAG–VDA 2019) — reconstructed from
    memory in `quality.fmea`; to confirm against the handbook before any
    verdict uses it.
  - VDA's 8D volume edition; EHEDG Document 8's and EN 1672-2's editions —
    `rca.eight-d`, `foodsafety.hygienic-design`.
  - Emission factors (about 0.207 kg CO₂e/kWh electricity, 0.183 gas) —
    illustrative in `sustainability.carbon`; the year's DESNZ set governs.
  - Leak flow by hole size (about 1.2 l/s at 1 mm and 7 bar) and
    compressors' specific energy (0.1–0.12 kWh/m³) —
    `sustainability.compressed-air-leaks`.
  - Cooling time-to-temperature limits vary by product and authority; the
    site's validated plan decides — `foodsafety.cooling-curves`.
  - The Shingo model's and other maturity models' licensing —
    `lean.maturity-assessment`. **25 Oct 2026:** the Shingo principles are
    described openly but no licence wording was found; MIT's LESAT is free to
    copy with other rights reserved; none is bundled (the build is a frame
    the person fills in). Ask the Institute, LEI or MIT only if a model is
    ever to ship in the app.
  - MTM-1's walking element (W-FT 5.3 TMU a foot ≈ 1.6 m/s) —
    `lean.spaghetti`, from knowledge of the data card.

- **Rowland's three books, 24 October** (`knowledge/SOURCES.md`): Maskell
  (1991) — structure, six areas and two chapters' measures confirmed in
  listings and reviews; the chapter 2 characteristics' wording and count and
  the other areas' example measures from knowledge. Pound, Bell & Spearman
  (2014) — chapter list and the three key equations confirmed in the
  publisher's description; the formulas confirmed against lecture material
  from Hopp & Spearman, not against the 2014 text. **Clements (1991),
  *Handbook of Statistical Methods in Manufacturing* — only its
  bibliographic facts could be confirmed; no table of contents was found
  online and nothing is attributed to it.** The web cannot be fetched from
  this container (403 from the proxy on publishers, Google Books, Wikipedia,
  archive.org), only searched; a copy to hand, or a session that can fetch,
  closes these.

## Licensed or specialist methods

- **MTM and MOST** (FC-023): their motion tables are licensed by their
  associations; analysts are certified. Not buildable without a licence.
  **Researched 25 Oct 2026:** the TMU (0.036 s) and the sequence shapes are
  public, the tables and the licence terms are not; the MTM Association's and
  H.B. Maynard's terms for software or for typing table values were not
  found — ask them if ever needed. Verdict: leave out; a synthetic-time
  ledger of an analyst's own typed times is the only honest reopening
  (`ie.pmts`).
- **Shelf life** (FC-175), **hygienic design** (FC-178), **carbon** (FC-229):
  microbiology, EHEDG guidance and emission factors need specialist sources.
- **Simulation** (FC-047): needs measured repair times first (FC-059).
- **Lean maturity** (FC-018): no single standard model. Researched 25 Oct
  2026 — a frame the person fills in, no model bundled (`lean.maturity-assessment`).
- **Reliability-centred maintenance** (FC-065): researched 25 Oct 2026 —
  the logic is public through NASA and Nowlan and Heap; the standard is
  paid; not to be built before its dependencies and one read of the NASA
  tree (`maintenance.rcm`).
- **Line acceptance on EN 415-11** (FC-085): researched 25 Oct 2026 — cannot
  be built as the standard's tool without the text (`commissioning.acceptance-tests`).

**The research pass of 25 October (FC-065, 085, 023, 018) was done without
being able to open any page.** This container's fetch tool fails on every
host (DNS) and the proxy refuses publishers, standards bodies, Wikipedia and
NASA; only web search worked, and it returns a summary of the results, not
the pages. So every "confirmed" in those four records means *a search
excerpt or summary said so*, not that the builder read the source. A session
that can open pages should read, in this order: the NASA RCM Guide's Logic
Tree; the Shingo Model booklet and the LESAT guide's copyright page; the
MTM Association's licence page; and, if bought, EN 415-11.

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
