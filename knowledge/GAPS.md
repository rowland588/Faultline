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
what is from knowledge. By the strongest evidence behind them: standard 27,
law 3, textbook 73, peer-reviewed 9, practice 62, Faultline decision 5
(two sampling records moved from standard to textbook on 25 October: what is
built rests on the binomial and the noncentral t, not on the standards' tables).

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
| ISO 2859-1 and ISO 3951-1:2022 — acceptance sampling | FC-129, FC-130 | **Researched 25 October** (below): the tables are copyright and are **not needed** — a plan is designed from the AQL, LQ and risks by public mathematics; their text is still unread, so no tool may say a designed plan is "per ISO 2859-1 / 3951-1". Third edition of ISO 2859-1 reported at final draft December 2025 (trade-press excerpt; publication unconfirmed) |
| ISO 4120 (triangle test), ISO 22514-3 (machine capability), IEC 60605-4, IEC 61649, IEC 61025, EN 15341, OIML R 51, OIML R 87 | their entries | edition and the formula or limit each record quotes |
| EN 1672-2:2020 (edition and scope confirmed 25 October; the text is paid and was not read); EN ISO 14159:2008 (scope confirmed; text paid) | FC-178 | nothing is quoted from either; the review is against EHEDG Guideline 8 (free), not these |

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
  - VDA's 8D volume edition — `rca.eight-d`. (EHEDG Document 8's and EN
    1672-2's editions were closed on 25 October: Guideline 8 is now the fourth
    edition, December 2025; EN 1672-2:2020 — see *Research 1* below.)
  - Emission factors — closed in part on 25 October: the 0.207 / 0.183 this
    list carried were the 2024 DESNZ set; the 2025 and 2026 sets are in
    `sustainability.carbon` from secondary sources and still to be read from
    the workbook (*Research 1* below).
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
- **Shelf life** (FC-175), **hygienic design** (FC-178), **carbon** (FC-229),
  **the inspector's reference test** (FC-232): researched on 25 October —
  see *Research 1* below; each is buildable in a narrow, honest form, none
  needs a licence, and each needs one reading of a document this container
  could not open.
- **Simulation** (FC-047): researched 25 October — can be built, as a small simulator of two to six machines in series, once repair times are measured (FC-059); see "Research 2" below.
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

## Research 1 — 25 October 2026: four entries marked "research"

Done with web search only: **every site the research needed — legislation.gov.uk,
gov.uk and assets.publishing.service.gov.uk, ghgprotocol.org, ehedg.org,
eur-lex.europa.eu, foodstandards.gov.scot, campdenbri.co.uk, chilledfood.org,
the BSI and ISO stores — refused the connection (DNS or the proxy's 403), so no
primary source was opened.** What each record now says came from search-result
excerpts of those pages, and every number is marked as such. The records were
changed; the catalogue statuses are the builder's to change. Verdicts:

| Entry | Verdict | What is public | What is still to read or decide |
|---|---|---|---|
| **FC-232** reference test on a batch (`packaging.average-quantity-system`) | **CAN BE BUILT** | SI 2006/659 Schedule 2 (the reference test) and Schedule 3 (the TNE table) are public law: single non-destructive plan 50/3/4, 80/5/6, 125/7/8 for batches 100–500, 501–3,200, 3,201 and over; destructive 20/1/2; the average check x̄ ≥ Qn − c·s with c = t(0.995; n−1)/√n (0.503, 0.379, 0.295; 0.640 destructive — reproduced by computation); the TNE table to 15 kg and over, rounded up to a tenth | A session that can fetch legislation.gov.uk reads the whole of Schedule 2 and 3: the double plan (one band seen), the rule for batches under 100 (an excerpt says 5%, which sits oddly with 2.5%), what an inadequate pack in a sample does, the measuring error rule (one fifth of the TNE), which version is current. **Finding against built code:** `tneFor` cites Schedule 2 (it is Schedule 3), stops at 10 kg, and does not round up a percentage TNE to a tenth (150 g gives 6.75, not 6.8) |
| **FC-175** shelf-life studies (`foodsafety.shelf-life`) | **CAN BE BUILT, narrowly** — a results ledger with an observed-life verdict; **CANNOT** work out or validate a life | Guidance is free to read, not to copy: Food Standards Scotland Shelf-life guidance 2025, FSAI Guidance Note 18 Rev 5, the CFA's *Listeria* shelf-life guidance (2010; new 2026), the EURL Lm technical guidance, Campden BRI's guideline (paid) | The protocol, pathogen criteria, challenge tests, predictive models and sign-off are a microbiologist's. **Not found in any source: the 20–30% margin and the 8 °C abuse temperature this record used to carry — removed as defaults.** Unresolved: whether EU Regulation 2024/2895 (criterion 1.2b, from 1 July 2026) applies in Great Britain; Campden's guideline number for the 2019 second edition |
| **FC-178** hygienic design review (`foodsafety.hygienic-design`) | **CAN BE BUILT** as a checklist and findings register; **CANNOT** be offered as EN 1672-2, EN ISO 14159 or EHEDG compliance or assessment | EHEDG Guideline 8 fourth edition (December 2025) is a **free download**; EN 1672-2:2020 and EN ISO 14159:2008 are paid (scope and contents list only; the three areas — food, splash, non-food — are named in EN 1672-2's contents) | Someone reads Guideline 8 and writes the checklist in Faultline's words with section numbers; EHEDG's reuse licence is read. The critical / major / minor grades and the gate rule are **Faultline's**, not EHEDG's — say so on the screen. No roughness or radius figure was found in a source of record; none is used. Guideline 58 (risk management) is sold and unread |
| **FC-229** carbon a pack (`sustainability.carbon`) | **CAN BE BUILT** for the site's scope 1 and 2 intensity; **CANNOT** answer a product carbon footprint or scope 3 | GHG Protocol scopes and the two scope 2 methods (free documents); the UK Government's annual conversion factors (gov.uk; reuse normally under the Open Government Licence); SECR's intensity-ratio rule | The builder opens the DESNZ 2025 and 2026 workbooks and replaces every factor (electricity 0.17700 or 0.17889 for 2025? 0.13096 for 2026; gas 0.18296 and 0.18231; diesel and refrigerant not seen); the gas-bill calorific basis; whether the 2026 flat-file reissue (31 July) changed a value used |

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

## Research 2 — 25 October 2026: sampling, line simulation, response surface

Four entries were at *Research first*: FC-129 and FC-130 (acceptance sampling),
FC-047 (line simulation), FC-112 (response surface). Their records
(`knowledge/methods/quality/acceptance-sampling-attributes.md`,
`...-variables.md`, `knowledge/methods/capacity/simulation.md`,
`knowledge/methods/stats/response-surface.md`) were brought up to date; the
independent cases are `knowledge/research/cases-research-2-*.py` (93 checks).
**How it was read:** this container refuses itl.nist.gov, Wikipedia, publishers,
journals, standards stores and library catalogues (WebFetch: name not found;
curl: 403 from the proxy, 25 October); only web *search*, which returns
excerpts, worked. So every source below was read as a search excerpt, never as
a page — each record's `checked` line says so — and the sources are listed in
`knowledge/SOURCES.md`.

| Entry | Verdict | What it needs / what it must not do |
|---|---|---|
| FC-129 attributes | **Can be built — as "design a plan from AQL, LQ and the two risks, and see its curve"** (binomial; hypergeometric for a lot). **Cannot** be "the ISO 2859-1 plan for this lot": the tables are copyright. | Wording of the entry to change when specified (it says ISO 2859-1 plans by inspection level). Independent cases: brute-force search of every (n, c); exact sums; hypergeometric; Monte Carlo. A typed contract plan is read by FC-131. |
| FC-130 variables | **Can be built for one specification limit** (σ known: closed form; σ estimated: exact noncentral t; unbiased fraction beyond the limit). **Cannot yet** for two limits or "the ISO 3951-1 plan". | Normality is the whole basis (skewed lots: consumer's risk at the LQ 27.4% instead of 10%): the shape check and the process history are part of the verdict. Entry's wording to change. |
| FC-047 simulation | **Can be built**, small and validated, **after** the repair times exist (FC-059 not built; the loss count's timed stops and the reliability counts are not yet a per-machine distribution). | Validated against closed-form limits and exact Markov-chain solutions; the first inputs' own uncertainty (30 stops) is 16 times the simulator's noise; never a forecast; not checked against a real shift until it is. |
| FC-112 response surface | **Can be built** for two or three factors, one response, one block, CCD (rotatable or face-centred) or Box-Behnken (3 factors). | Every part has an independent case. Needs real replicates, random order and a confirmation run; refuses a point outside the region run and a saddle; multi-response desirability is a later slice. |

**Corrections made to the earlier records.**
- `quality.acceptance-sampling-variables`: n = 27 for σ unknown used an
  approximation that fails the consumer's point (risk 10.9%); the exact plan is
  n = 28. And its comparison with "n = 125 for the attribute plan" was wrong: the
  attribute plan for AQL 1% / LQ 8% is 65 with c = 2 (125 and 3 has an LQ of
  5.3%). The saving is a little under a half, not four-fifths.
- `capacity.simulation`: the forty-run table (39,700 / 40,900 / 40,800 packs for
  300 / 600 / 1,200) is withdrawn — the 600 and 1,200 values exceed the 40,500
  an unlimited buffer cannot beat — and "no buffer: nothing moves" was a defect
  of that model, not a finding.
- `quality.acceptance-sampling-attributes`: textbook plans that meet the two
  points only approximately (n = 89, c = 2 for AQL 1% / LQ 6%: producer's risk
  6.0%) must not be shown as meeting 5%; the strict plan is 110 and 3.

**Still open after this research.**
1. The text of every standard named here is unread; the NIST e-Handbook pages
   (OC curves, central composite and Box-Behnken designs, canonical analysis)
   were seen only as excerpts. A session that can fetch should read them and
   confirm the rotatable α, the design counts and the A-form / B-form rule
   against the pages (the numbers are already proved by computation).
2. Lieberman & Resnikoff (1955), Owen (1968), Cameron (1952), Box & Behnken
   (1960), Box & Hunter (1957), Derringer & Suich (1980) are cited from knowledge;
   their results used here were reproduced by simulation, not read.
3. Two-limit variables plans (combined control): the standard's p* maxima are
   tabulated; an own design by simulation has not been researched.
4. ISO 2859-1's switching rules (counts quoted from knowledge) and the claim
   that a designed plan can coincide with a table plan (125 and 3) — unchecked.
5. MIL-STD-105E and MIL-STD-414 are US Government documents whose copyright
   status outside the US is not settled here; they were not transcribed and
   should not be without advice.
6. Simulation: whether the reliability watch counts MTBF on the clock or only
   while running; the per-machine repair-time shape; stops that two machines
   share (a utility); validation against real shifts of a real line — not done.
7. Response surface: the number of centre runs to require (3–6 from
   knowledge), how a hard-to-change factor is refused or warned, and what a
   run's single response should rest on (packs weighed per run).

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

## The line balance family — 25 October (build-time)

- **The ILO relaxation-allowance table** (`ie.allowances`, FC-025): its percentages are from knowledge, and a search on 25 October found no authoritative copy to check them against, so none is built in or pre-filled — the person types their site's agreed figure for each named cause. To close it: read Kanawaty (1992) ch. 23 and its appendix table, check every row (and its men and women columns), then add the table as a preset of the parts (`src/tools/linework/allowance.ts` CAUSES).
- **Rating anchors** (BS 3138, `ie.time-study`): the scale is said (100 is standard pace); the descriptive anchors (what 75 or 125 look like) are not built in — the observer rates on the scale they were trained on. Not checked: the edition and the exact wording.
- **Synchronous servicing assumes identical machines and a fixed cycle** (`ie.person-machine`): random servicing (machines that stop at random) is not worked out — a queueing or simulation problem (FC-047, owner's decision).
- **Ranked positional weight is a heuristic** (`capacity.line-balancing`): a good balance the order allows, not a proof that none is better; the page says so. No zoning or station-fit rules.
- **The learning curve** (`ie.learning-curve`, FC-027): the unit-time form only; the run reaching a standard is given with the interval of the slope alone (T1 held). The cumulative-average form, forgetting after a break and a plateau model are not built.
