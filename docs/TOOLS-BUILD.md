# Building every planned tool — the programme, 24 October

Rowland, 24 October, after the knowledge library reached full depth: *"I would
like to build every tool that we have planned for. When I say planned, as in
it's there in our system and we make it. Once we've made the tools … put
together toolkits for specific reasons, for example commissioning or issues on
the line or yield or reliability or quality … instead of filtering through
every single tool, it allows me to look at the reasons I would want to use the
tool for … there's my toolkit, and I can run these analysis using the
toolkits."* Go given for the whole catalogue.

This is the plan — the whole shape before any of it is built (CLAUDE.md,
"How a change gets made here", 4). It is a programme of weeks, not a day: 167
entries are not yet *available* (127 to build, 8 specified, 32 partly built),
and every one is held to `knowledge/STANDARD.md` through the `faultline-tool`
skill — a specification before code, formulas validated by independent cases,
the report built with the tool, an acceptance script in the gate, the
catalogue kept truthful. What is not built properly is not built.

## 1. How it goes faster without going worse

Rowland, 23 October: *"work out a way to complete the plan faster."* The
catalogue's 167 entries are not 167 separate builds. Most are **modes of a
mechanism the app already has** — a readings study with a question (the
capability study), a control chart on readings in order, a check with a
schedule and a result on a line, a register with its rows and journey — and
the standard is met once per mechanism and once per mode:

- **One specification per wave**, in `knowledge/specs/`, covering the
  mechanism and every tool it carries, each tool with its own scope, facts
  said apart from choices, report and numbered acceptance criteria. A tool's
  criteria are its own; the mechanism's are shared.
- **The independent cases already exist**: `scripts/knowledge/cases-*.py`
  computed every record's worked case on 24 October; each tool's unit tests
  take their numbers from there, and a case missing is added there first.
- **One acceptance script per wave**, driving each tool's stories on the
  seeded data, checking every sentence against its module, the phone, and
  the paper read back — a wave's tools never ship with one of them unproved.
- **One gate per wave**, the batch shipped live together (as B0–B7 were);
  each tool its own commit, so one can be reverted alone; the next wave built
  in its own worktree while the gate checks the last.
- **Memory with each wave**: the catalogue's statuses, `knowledge/SUMMARY.md`,
  `docs/PAGES.md`, this document's §4 table, the records' *In Faultline*.

## 2. The waves

Ordered by what each wave reuses and what Rowland's team uses most; within a
wave, by the catalogue's priority. An entry's number is in
`src/catalogue/entries/`; its record in `knowledge/methods/`.

| Wave | Mechanism | Entries | Count |
|---|---|---|---|
| **W0** | Outstanding: the papers that moved with the clock | the seed's stamps anchored (`src/dev/reportSeeds.ts` hoursBack); parity's MEANT | — |
| **W1** | **The capability study's modes** — one readings record, one question first, each mode its verdict and paper (`src/tools/capability`, FC-094 parts 2–4) | FC-098 reject-rate capability · FC-099 faults per item · FC-102 DPMO and sigma · FC-083 held at a rate · FC-084 Cm/Cmk · FC-096 not bell-shaped · FC-088 p/np/Laney p′ chart · FC-089 c/u/u′ chart · FC-124 defect tally · FC-125 defect Pareto · FC-157 lowest legal fill · FC-162 ℮ three rules (→ available) · FC-163 density · FC-158 multihead weigher · FC-165 seal integrity · FC-167 residual oxygen · FC-169 CCP monitoring · FC-094 itself → available | 18 |
| **W2** | **Charts on readings in order** — one chart engine, screen and paper, every study's readings | FC-086 XmR · FC-087 X̄-R/S · FC-090 run rules · FC-091 CUSUM/EWMA · FC-093 short-run · FC-092 pre-control · FC-101 capability across products and time · FC-117 and FC-201 the team's weekly number (→ available) | 8 |
| **W3** | **Statistics on any readings set** — components the studies call, each a sentence in words with its figure | FC-103 describing · FC-104 how sure · FC-105 before and after (→ available) · FC-106 paired · FC-107 several groups · FC-108 counts by group · FC-109 correlation · FC-110 regression · FC-113 how many readings · FC-020 how many cycles · FC-114 fitting a distribution · FC-115 autocorrelation · FC-116 tolerance stack-up · FC-111 two-level factorials | 14 |
| **W4** | **The gauge** — a measuring instrument on a line, its studies and its register | FC-119 type 1 · FC-120 bias, linearity, stability · FC-118 gauge R&R · FC-121 attribute agreement · FC-122 calibration register · FC-123 uncertainty budget | 6 |
| **W5** | **Reliability and maintenance on a machine** — the reliability study's other halves and the maintenance log | FC-059 MTTR and availability · FC-055 short stops (→ available) · FC-056 speed loss · FC-060 Weibull · FC-061 Crow–AMSAA · FC-066 critical spares · FC-064 criticality · FC-062 CILT checks and tags · FC-234 condition checks on a route · FC-063 planned maintenance · FC-067 maintenance measures · FC-057 cost deployment | 12 |
| **W6** | **A check with a schedule and a result** — one check-log mechanism on a line or machine: due, done, missed, failed, what a failure holds | FC-164 checkweigher verification · FC-166 code and label verification · FC-170 metal detection and X-ray · FC-172 cleaning verification (ATP) · FC-173 environmental monitoring · FC-176 cooling curves · FC-171 allergen changeover · FC-071 first-off release · FC-070 changeover sequence · FC-069 EPEI (→ available) · FC-072 cleandown SMED (→ available) · FC-013 5S audit · FC-014 mistake-proofing register · FC-177 scored audits · FC-174 traceability exercise · FC-135 product on hold · FC-168 HACCP plan (the register of CCPs the checks hang off) | 17 |
| **W7** | **People, work and the body** — the time study's remaining pieces, the standard's teaching, the ergonomics screens | FC-019 rating (→ available) · FC-025 allowances (→ available) · FC-024 standard data · FC-026 person–machine · FC-007 combination table (→ available) · FC-028 ECRS · FC-027 learning curve · FC-029 labour productivity · FC-030 earned hours · FC-033 balance proposed (→ available) · FC-021 video time study (→ available) · FC-233 micro-motion · FC-004 spaghetti · FC-003 process flow chart · FC-212 from–to chart · FC-207 NIOSH (→ available) · FC-208 MAC · FC-209 ART · FC-210 RULA/REBA · FC-211 push and pull · FC-222 skills matrix · FC-223 TWI breakdown · FC-225 SOP with photos · FC-224 one-point lesson (→ available) · FC-184 crewing a shift | 25 |
| **W8** | **Flow, planning, yield and utilities** — the line's figures across the week and the factory | FC-002 P–Q · FC-012 pacemaker and pitch · FC-009 kanban sizing · FC-010 supermarkets and FIFO · FC-011 heijunka box · FC-044 Little's law · FC-045 Kingman · FC-043 DBR · FC-046 accumulation (→ available) · FC-041 three capacities (→ available) · FC-042 mix at the constraint (→ available) · FC-048 capacity across the factory · FC-039 recovery levers (→ available) · FC-179 the week's schedule · FC-180 scheduling rules · FC-181 runners, repeaters, strangers · FC-182 batch size · FC-183 safety stock · FC-185 plan attainment · FC-186 forecast accuracy · FC-159 yield by stage · FC-160 material variance · FC-161 food waste by stage · FC-226 energy and water · FC-227 air leaks · FC-228 waste by stream · FC-191 payback and NPV | 27 |
| **W9** | **The quality system and problem solving** — registers, reports and the project's pages | FC-126 defect concentration · FC-127 FPY/RTY · FC-128 COPQ · FC-131 OC curve · FC-132 FMEA · FC-133 control plan · FC-134 complaints · FC-136 supplier quality · FC-137 triangle test · FC-139 SIPOC · FC-140 VOC → CTQ · FC-141 Kano · FC-142 charter (→ available) · FC-143 Pugh · FC-144 impact–effort · FC-145 QFD · FC-149 is/is-not · FC-150 8D · FC-151 A3 (→ available) · FC-152 fault tree · FC-153 stratification (→ available) · FC-155 horizontal deployment · FC-138 DMAIC (→ available) · FC-016 kaizen (→ available) · FC-017 kata · FC-005 waste walk (→ available) · FC-015 andon · FC-196 hour-by-hour board · FC-197 SQDC board · FC-198 tiered meeting (→ available) · FC-199 gemba (→ available) · FC-200 leader standard work · FC-203 shift handover log · FC-213 lever tree (→ available) · FC-215 critical path · FC-219 hoshin · FC-220 improvement programme · FC-221 ideas · FC-082 operational readiness (→ available) | 39 |
| **W10** | **Research first** — each researched, then specified and built where it can be, or said why not (licensing, a specialist source, a decision for Rowland) | FC-018 maturity · FC-023 MTM/MOST · FC-047 simulation · FC-065 RCM · FC-085 EN 415-11 acceptance · FC-112 response surface · FC-129 and FC-130 acceptance sampling · FC-175 shelf life · FC-178 hygienic design · FC-229 carbon · FC-232 the inspector's reference test | 12 |
| **W11** | **Toolkits by reason** — §3 | the toolkits page, its data, every toolkit's run | — |

Counts: 18 + 8 + 14 + 6 + 12 + 17 + 25 + 27 + 39 + 12 = 178 entries touched
(167 not yet available, plus the parents some modes complete). The order
inside a wave follows `node scripts/catalogue.mjs next`.

**What stays left out.** The seven `left-out` entries (OEE among them) stay
out; their *decided* lines say why. A research entry that cannot be built
honestly — a licensed table, a method that needs a laboratory — is said so in
the catalogue and in `knowledge/GAPS.md`, never built as a hollow screen.

## 3. Toolkits by reason (W11)

**What it is.** A toolkit is a reason to pick up tools — *we're
commissioning a new line*, *a machine keeps stopping*, *we're losing raw
material*, *we're rejecting too many* — with its tools in the order a
competent engineer would use them, each saying the question it answers and
whether it is built; chosen by the reason, not by the discipline or the
method. Rowland: *"instead of filtering through every single tool … look at
the reasons I would want to use the tool for … there's my toolkit."*

**What exists already.** The directory (`#/tools`, `src/catalogue/`) filters
by discipline, method, status, by twelve scenarios (`SCENARIOS` — a running
line, new equipment, changeovers, packing, people, a machine that stops,
quality, food safety, planning, money, a project, the day) and by 22
**problem routes** (`src/catalogue/problems.ts` — *We're rejecting too many*,
*The line won't make its target*, *A machine keeps stopping*, *We're losing
raw material* …), each route already an ordered list of entries with *where
to start*. A toolkit is a problem route grown up: ordered steps with their
questions, runnable, and read back together.

**The design.**

- **Data** — `src/catalogue/toolkits.ts`: a toolkit has an id, a name in the
  floor's words (the reason), the scenarios it serves, and its **steps**:
  each an entry, the question it answers in one line, its place (*start
  here · then · to prove it · to hold it*), and whether it is needed or
  optional. Toolkits are derived from and consistent with the problem routes
  (one test says every route is a toolkit and every toolkit's entries exist);
  a step's status is the catalogue's, never typed — a toolkit shows honestly
  which of its tools are built, partly built or not yet.
- **The page** — `#/toolkits`, from Tools and from the front door ("What is
  the reason?"): the toolkits as cards by reason, each with its count of
  steps built; a toolkit's own page as the lean page — the reason, the steps
  in order with their questions, each with **Start** (a new record of that
  tool on the chosen line or project, the toolkit remembered on the record so
  its finding reads back here), **Open** where one exists, and the step's
  finding in one line (the tool's own closing line) and its money.
- **Running it** — a toolkit opened on a line or in a project lists that
  scope's records of each step; the findings read together are the toolkit's
  **reading**: one line per step, the money per step plainly labelled, never
  summed into one figure; a step with no record yet says so and offers Start.
  The toolkit's paper is that reading, one page.
- **Where it shows** — on a line's Tools and a project's Tools as "By
  reason"; on the front door; in Line Talk's knowledge of the line (the
  toolkits in use). The catalogue stays the one list of tools; a toolkit
  names tools, never defines one.
- **Built when** — its data skeleton early (the first wave), because the
  toolkits' order is a check on the build order; the page and the runs after
  W9, when the tools it names exist; then Rowland walks it.

**Decisions for Rowland** (asked when W11 is reached, not guessed): the
toolkits' names in his words; whether a toolkit may be his own (a saved
selection) as well as the standard ones; whether the toolkit's reading should
offer a combined paper or only each tool's.

## 4. Built — wave by wave

Each row says what reached `main`, which gate proved it, and what was left.

| Wave | Live | What it did |
|---|---|---|
| W0 | — | The seed's four hour-based stamps (`createdAt: t − n hours`, stops at `t − rand × 20 hours`) anchored to 23:59 yesterday (`hoursBack`), so the journey paper's "n recorded" and the line's stops no longer move a line as the afternoon passes; the papers that changed once, said as MEANT in `scripts/paper-parity.mjs`. |
| W1 | `5ed0050` (gate 57 quick 49/50 — the one fail the directory's stale expectation that FC-098 was planned, fixed and re-proved on the gate checkout; the compare's 19 changed pages all stage-gate, problems and journey pages moving with the clock and load, the capability page itself unchanged on the measurement study; paper parity 6 s, nothing changed) | The capability study's modes, parts 2–4 of `knowledge/specs/FC-094-capability.md`: rejects out of what was made (FC-098, the p-chart with Laney's limits FC-088, per million and Z FC-102), faults found on each item (FC-099, the u- and c-chart FC-089, the tally FC-124 and its Pareto by count and money FC-125), held at a rate for a time (FC-083), a measurement's question — one machine's Cm/Cmk (FC-084), a CCP's guard band (FC-169), a weigher's heads by one-way ANOVA (FC-158), oxygen (FC-167) and a seal (FC-165) in their words — and on sold by weight the lowest legal fill (FC-157), the three rules proved (FC-162) and a volume pack by density (FC-163). Sixteen entries and FC-094 available with their built blocks and limits; FC-096 (the fitted model for a leaning set) moved to W3 with distribution fitting, said in the spec with its reason. Arithmetic in `lib/ie/dist` (binomial and Poisson bounds, p and u limits, Laney's σz, Z, Cm/Cmk, the three rules' targets, the incomplete beta, the F distribution, one-way ANOVA) against SciPy (`scripts/knowledge/cases-w1.py`); `capability-kinds.mjs` steps 10–15 (121 checks). Left: a kind's own cost on the Pareto, a CCP's compliance and held product, the seal's two tests on one page. |
| W2 | `pending` (gate 58) | The control chart as one tool: `lib/ie/charts` (constants, XmR and subgroup limits, the eight Nelson rules, CUSUM, EWMA, Levene, runs about the median, Mann–Kendall with Sen's slope) validated against SciPy cases (`scripts/knowledge/cases-w2.py`); `tools/chart` (the Agree form, the pad, the chart with its spread and CUSUM panels, the signals in words, the limits frozen and set again, short-run DNOM/Z, pre-control) — FC-086, FC-087, FC-090, FC-091, FC-092, FC-093 available; capability over time on the capability list and its paper (FC-101 available); the weekly number's trend on the Numbers panel (FC-117, FC-201 stay partial: no paper). `supabase/CHART.sql` applied (studies_tool_check admits 'chart') and read back. Registered as a study under Tools, not a log: no scope lists a log-kind tool yet. |
