# Build shapes — every unbuilt catalogue entry on the shape it would be built on

Written 25 October, to plan the building of the tools still to come
(`docs/TOOLS-BUILD.md` waves W4 to W10). The question it answers: of the 144
entries not yet *available*, which can share a mechanism — one record, one
page, one paper, one set of wiring — so the mechanism is built and proved
once and each tool then brings only what is its own?

It is a classification, not a specification. It changes no code and no
catalogue status; every tool is still built through the `faultline-tool`
skill, to `knowledge/STANDARD.md`, with its own specification written before
any code. A shape is the *frame*; `STANDARD.md` point 1 still holds — "a
capability study, a time study, an FMEA, a control chart, SMED and a mass
balance do not share one interface or one calculation shape" — so a shape
shares plumbing and never a formula.

**How it was done, and what it is not.** All 144 entries were read from the
catalogue (`src/catalogue/entries/*.ts`: problem, method, inputs, outputs,
limits, dependencies, complexity, value, status, form, kind, partOf) — the 105
`to-build`, 27 `partial` and 12 `research`; none is `specified` today. The
179 method records in `knowledge/methods/` were *not* all re-read: where a
record could change an entry's shape, the note says so. The classification is
a judgement from the entry's fields and should be corrected by the
specification of the first tool built on each shape. The catalogue's
`depends` field is loose ("uses or is used by": FC-009 and FC-183 each name
the other), so the column *depends on unbuilt* shows relations, not a build
order.

## (a) The summary

**Three shapes already exist and carry 37 entries; eight are candidates for
new ones and carry 104; three entries fit nothing yet.**

| Shape | Entries | Of which a new page | Of which fold into a built tool | Exists? |
|---|---|---|---|---|
| Readings study (one record, a question, readings, a verdict in words, a picture, a paper) | 24 | 3 | 21 | exists: capability, chart, analysis, reliability, sampling, losses, SMED, value stream, line balance and the rest |
| Register (rows with owner, due, status, a journey) | 8 | 5 | 3 | exists: Problems, Actions |
| Project / stage gate / workflow (`lib/planModel`) | 5 | 3 | 2 | exists: stage gate, 6M, lever tree |
| **Calculator** (inputs, a formula or a scored table, a verdict sentence) | 30 | 17 | 13 | new |
| **Check log** (a check on a schedule: due, done, missed, failed, what a failure holds) | 20 | 17 | 3 | new |
| **Ledger** (a table of counts and weights by stage, material, product or period) | 16 | 9 | 7 | new |
| **Board over records** (reads what is held; owns nothing; a page and a paper) | 12 | 7 | 5 | new |
| **Structured document** (a fixed structure of typed sections that prints as one page) | 11 | 7 | 4 | new |
| **Scored register** (rows rated on named scales, a score and rank by the method's rule) | 6 | 5 | 1 | new |
| **Designed run** (a run sheet made first, readings entered run by run, then the analysis) | 6 | 5 | 1 | new |
| **Layout marking** (marks, paths and distances on a picture or a plan) | 3 | 2 | 1 | new, but see below |
| No shape yet (a scheduler, simulation, licensed motion tables) | 3 | 3 | 0 | owner's decision |
| **Total** | **144** | 83 | 61 | |

(By status: 105 not built, 27 partly built, 12 research first. Research
entries are classified on the shape they would take if they can be built
honestly; the owner's decisions are listed after the table.)

**What this says in plain words.**

1. **Sixty-one of the 144 are not new screens at all.** They are a further
   question, mode or field inside a tool that is already built — most of them
   in Reliability, the Line balance, the capability study, the Analysis tool,
   Shift losses, SMED, Value stream and Video studies. They need no new shape,
   only each tool's own specification and the existing page, paper and
   acceptance script extended.
2. **The shape that unlocks most is the check log (20 entries, 5 of them
   high value, 17 new pages).** Metal-detector checks, code and label
   verification, first-off release, cleaning verification, CILT, 5S and the
   scored audits, calibration, planned maintenance, the control plan and the
   hour-by-hour board are all "a check with a schedule and a result". Today no
   scope lists a log-kind tool (`FC-086`'s limits say so), so the first piece
   of the shape is the scopes' *Logs* page itself.
3. **The calculator is the biggest shape by count (30) and the lightest to
   build** (18 of the 30 are complexity S). Its risk is the opposite of the
   others: it is the shape most tempting to build as a template. Each
   calculator still has to be designed around its own method.
4. **The ledger (16) is where the yield, waste, labour-hours and plan-versus-
   actual tools live.** They share a table of measured quantities by row and
   by period, and they need *data the app does not hold today* (clocked hours,
   material usage, plan and actual, forecast). That data arrives by typing or
   pasting — nothing is read from a machine.
5. **Three small shapes may not deserve to be shapes.** Layout marking (3
   entries) should be built as modes of the line standard board and the defect
   tally, which already mark things on a picture. Designed run (6) and scored
   register (6) are the next to fold if the plan wants fewer shapes: a designed
   run is a readings study with a run sheet in front of it; a scored register
   is a register with rating columns. They are kept apart here because the
   run sheet (randomised, blind) and the scale definitions printed with the
   scores are real work the others do not do.
6. **Three entries fit no shape** — the week's schedule (FC-179), line
   simulation (FC-047) and predetermined motion times (FC-023) — and a further
   set need the owner's decision before anything is built (below).

**A suggested order of shapes** (the entries' own values and the waves
decide the order within a shape): the check log first (value, and it opens
*Logs*); the calculator beside it (cheap, many, mostly independent); the
ledger; then the structured document and the scored register; the board over
records last, because a board reads the tools it summarises and is only
honest once they exist; the designed run with the gauge studies of W4. The
61 fold-ins need no shape and can go in whenever their parent tool is next
touched.

### How the shapes fall on the planned waves

| Wave | Mostly carried by | Notes |
|---|---|---|
| W4 gauge | designed run (FC-118, FC-121), readings study (FC-119, FC-120), check log (FC-122), calculator (FC-123) | The type 1 study (FC-119) is a plain readings study and goes first; FC-122 is catalogued as a register but is a check log. |
| W5 reliability and maintenance | readings study (FC-055, 056, 059, 060, 061), check log (FC-062, 063, 234), scored register (FC-064), calculator (FC-066), boards (FC-057, 067) | Five of the twelve are modes of the reliability study. |
| W6 checks | check log (FC-071, 164, 166, 170 to 174, 177, 013, 014), calculator (FC-070), register (FC-135), document (FC-168) | FC-069 and FC-072 are folds into SMED, not log work. |
| W7 people, work and the body | readings-study folds (FC-007, 019, 021, 024, 026, 028, 033, 233), calculator (FC-025, 184, 207 to 211), ledger (FC-029, 030), layout (FC-004, 212), documents (FC-223 to 225), scored register (FC-222) | The ergonomics screens are one calculator frame with different tables. |
| W8 flow, planning, yield, utilities | ledger (FC-002, 048, 159 to 161, 181, 185, 186, 226, 228), calculator (FC-009, 010, 012, 044, 045, 182, 183, 191), no shape (FC-179), check (FC-011), register (FC-227) | The schedule is the one large item with no shape. |
| W9 quality system and problem solving | documents (FC-139, 140, 142, 145, 149, 150, 152), scored register (FC-132, 143, 144), register (FC-134, 135, 155, 221), ledger (FC-127, 128, 136), boards (FC-151, 197, 198, 201, 203, 219, 220), project kinds (FC-016, 017, 138, 213, 215) | FC-133 is the plan side of the check log. |
| W10 research first | one each: calculator (FC-018, 129, 130, 229, 232), designed run (FC-112, 175), scored register (FC-065), register (FC-178), readings (FC-085), none (FC-023, 047) | Nothing here should be built until the research the entry names is done. |

## (b) The new shapes

**What every shape gets from the house, so the paragraphs below only say what
is different.** A catalogue entry with its `kind` and `app` face (the
registry, `src/catalogue/registry.ts`, lists the tool in the rail, Tools,
Products or Logs, New ▾ and Jump to from it); a record that sits in one scope
(`WhereItSits`), is edited and deleted where it sits with Undo, and checks
`can.edit` / `can.agree` / `can.remove`; sync by the engine in `src/cloud`
(records that are lists of things added on several devices merge by id, as
readings do — `scripts/sync-two-devices.mjs`, scenario 10); a `studies`-style
row or its own table with the mapper and migration kept together (the schema
test refuses a drift); the page header with *Report ▾*; the lean page and the
report engine (`lib/lean`, `ui/Lean`, `lib/report`) so screen and paper say
one thing; one cost model (`lib/cost`, `knowledge/MONEY.md`) — a finding is
said in money, or says which input is missing; what is wrong feeding the
Problems register and Actions; and an acceptance script that drives the tool
by name through `scripts/lib/pageHeader.mjs`. Each tool also keeps
`STANDARD.md`'s promise: its formulas validated by independent cases
(`scripts/knowledge/cases-*.py`), its specification and report written
before code, and its limits said.

### Calculator — 30 entries (17 new pages, 13 folds)

*What its record holds.* A named, saved set of inputs for one situation — on a
line, a product, a project or nothing — each input with its unit and where it
came from (typed, or offered from Line capacity, the line standard, the cost
model; where one is missing the page says which and where to give it), the
result, and the sentence that says what it means. Inputs are numbers, or —
for the ergonomics screens, the maturity scale and the Kano lookup — levels
chosen from a table, with the table's rule turning them into a score. Saved
twice around a change, the record gives a before → after. *What the shape
shares.* The input form with sources and validation, a what-if (change one
input, see the result and the pounds move), the verdict sentence with its
confidence or caveat, the record list, the lean page and its paper with the
inputs table. *What each tool still brings.* Its formula in `lib/ie` and
proved by independent cases; the thresholds that turn a number into a word
(a lifting index of 1.14, a payback of eleven weeks); the wording of the
verdict; its caveat (NIOSH is "a screening tool, for a trained assessor");
and its picture, where it has one (an OC curve, a queue curve, nothing at all
for a reorder point — no decorative chart). Thirteen entries fold into a tool
that already shows the sum (SMED, Line capacity, Value stream, the capability
study, the time study). **Not a template:** Little's law and an uncertainty
budget share only the frame. *Three most representative:* FC-009 kanban
sizing, FC-131 the OC curve of a plan, FC-207 NIOSH lifting (with FC-208 MAC
and FC-209 ART on the same scored-form page). Five are research first because
their tables are copyright, yearly or not yet read (FC-018, 129, 130, 229,
232); FC-210's scoring tables are the papers' and are not reproduced.

### Check log — 20 entries (17 new pages, 3 folds)

*What its record holds.* A **check** — what is checked, where (a line or a
machine), who does it, how often or on what trigger, the pass criterion or the
limit on a measured value, and the reaction when it fails — and its
**results**: when, by whom, pass or fail or a value, a note, a photo. From
these the shape derives the five states the house already uses (due and not
yet done is amber, done green, missed or failed red, nothing due grey), and
what a failure holds: the time window since the last good check, the product
made in it, a problem raised on the register and, for food safety, a product on
hold (FC-135). Variants inside the one engine: pass or fail, a value against a
limit and trended (checkweigher, cooling, condition checks, meters), a scored
checklist (5S, audits), a count per slot (the hour-by-hour board), and a timed
exercise (traceability). *What the shape shares.* The *Logs* list in each
scope (which does not exist yet — the first build of the shape must deliver
it, and `registry.ts` already knows where it goes), the round on a phone
(tap pass or fail, one tap each), what is due now, the history and trend, the
lean page with compliance for the period, and the paper with failures and what
each held. *What each tool still brings.* Its check list and the standard it
rests on (BRCGS and the like are *to confirm* in `knowledge/GAPS.md`), its
limits, the reaction wording, what a miss costs in the pounds of product held,
and its own score rule. A control plan (FC-133) is the plan side: rows that
create checks. *Most representative:* FC-170 metal detection and X-ray
verification, FC-062 CILT checks and tags, FC-177 scored audits. Note that the
catalogue lists FC-063, FC-122 and FC-133 under other kinds (register,
standard); the shape is a better fit for how they behave, and each tool's
specification should say so and update its `kind`.

### Ledger — 16 entries (9 new pages, 7 folds)

*What its record holds.* A table for a period on a line, product or stage:
rows are stages, materials, products, streams or steps; columns are measured
quantities with units (weight in, out, by-product, rework, waste; hours
clocked; plan and actual; demand and forecast), each typed or pasted
(`lib/pastedRows`), with its source. *What the shape shares.* Entry and paste,
the checks that columns add up (a mass balance names its unexplained loss; a
count that does not reconcile is said), a ratio per row ranked in pounds by
the cost model, a standard to compare against, the trend over periods
(Mann–Kendall and Sen's slope are in `lib/ie/charts`), a before → after, and a
paper with the table. *What each tool still brings.* Its identity: yield and
unexplained loss (FC-159), variance against standard usage (FC-160), first-pass
yield and the rolled product of steps (FC-127), attainment as Σ min(actual,
plan) ÷ Σ plan (FC-185), weighted MAPE and bias (FC-186), earned hours
(FC-030) — each with its own thresholds and wording. It also brings the
**data the app does not yet hold**, so each specification must say how the
numbers arrive (typed, pasted, or taken from another tool's record) — nothing
is read from a machine. *Most representative:* FC-159 yield and mass balance
by stage (value high), FC-185 plan attainment, FC-029 with FC-030 labour
productivity and earned hours. FC-160, FC-161, FC-127 and FC-228 fold into the
yield page as columns or dimensions of the same table. FC-226 (energy and
water) is catalogued as a log but is a table of meter readings against output.

### Board over records — 12 entries (7 new pages, 5 folds)

*What its record holds.* Nothing of its own: the catalogue already has the kind
(*board*, "owns nothing; reads the others, on the page whose data it reads").
A board declares which records it reads and how each tile is worked out; a
few (the shift handover) carry typed notes beside. *What the shape shares.*
The lean page for screen and paper, tiles each *of* a target and *since* the
record before, the closing line, and the action list. *What each tool still
brings.* Which tiles, which thresholds make a figure abnormal, the wording of
the "what it means" line, and — above all — a story rather than a list
("a report that lists records instead of telling the story is a gimmick",
CLAUDE.md). A board is honest only once the tools it reads exist, so these
are built last. Five are folds into a page that exists (recovery levers into
Shift losses, the weekly number into the Numbers panel and the client report,
the A3 into the 6M report, the tiered meeting into the day's update).
*Most representative:* FC-197 SQDC board, FC-067 maintenance measures, FC-220
the improvement programme (savings claimed and proven).

### Structured document — 11 entries (7 new pages, 4 folds)

*What its record holds.* A fixed structure of named sections, each typed text,
rows, a photo or a pick, with an owner, a version and a sign-off, and links to
the project, line, problem or complaint it is about. The page is a form with
prompts and an example; the paper is the structure on one page, from the
report engine. *What the shape shares.* The sectioned editor, photos and
captions, sign-off, version and Undo, the one-page paper, linking to a
record so the document pulls its facts instead of retyping them. *What each
tool still brings.* The structure itself and where it comes from (SIPOC's five
columns, the eight disciplines of an 8D, important steps / key points /
reasons for a TWI breakdown, the CCP rows of a HACCP plan); the fields that
read or write other records (an 8D pulls the problem; a TWI sign-off writes the
skills matrix; a CTQ ends with a limit ready for capability); any arithmetic
(cut sets for a fault tree; the importance scores of QFD). *Most
representative:* FC-139 SIPOC, FC-150 8D report, FC-223 TWI job breakdown.
FC-152 (fault tree) and FC-145 (QFD) are not forms but editors — an honest
yes/no for the owner before they are built, and both are low value. FC-168
(HACCP) is large and is the HACCP team's judgement: the tool would record and
feed checks, never decide hazards.

### Scored register — 6 entries (5 new pages, 1 fold)

*What its record holds.* Rows — machines, failure modes, options,
countermeasures, or a grid of people by tasks — each rated on named scales and
given a score or class by the method's rule, ranked, with an owner and a day
where the rank leads to work (it feeds Actions). The scale definitions are
part of the record and are printed with the scores. *What the shape shares.*
The row editor, the rating widgets, the rule engine that turns ratings into a
class, the ranked view, the paper with the scales and the ranking, and the
hand-off of top rows to the register. *What each tool still brings.* The
scales and the rule (consequence × likelihood to A/B/C; severity, occurrence
and detection to an Action Priority — the AIAG-VDA table must be checked
against the handbook, not recalled; Pugh's baseline; impact in pounds against
effort); its verdict wording. *Most representative:* FC-064 equipment
criticality, FC-132 process FMEA, FC-144 impact and effort (which folds into
Actions and the 6M countermeasures). FC-222 (skills matrix) is the grid
variant and holds names of staff.

### Designed run — 6 entries (5 new pages, 1 fold)

*What its record holds.* A design made before any reading — parts × appraisers
× repeats, or factors and levels, or randomised triplets — a **stored random
run order** (so it is reproducible and can be blind), an entry grid filled run
by run on the phone, and then the analysis. *What the shape shares.* The
design builder with a completeness check (nothing missed, nothing counted
twice), the randomised and blind entry screen, the grid of results, and the
paper with the design and the analysis. *What each tool still brings.* The
analysis (ANOVA for gauge R&R, kappa, factorial effects and interactions, the
binomial at ⅓ for a triangle test), its thresholds (%GRR bands, ndc, kappa
bands) and wording. *Most representative:* FC-118 gauge R&R, FC-121 attribute
agreement, FC-111 two-level factorials. Honest scope: the shape is the run
sheet and blind entry; if the plan prefers, it can be built as an option on the
readings study rather than a shape of its own.

### Layout marking — 3 entries (2 new pages, 1 fold)

*What its record holds.* A picture or a drawn plan with a scale, and marks,
paths or points on it with coordinates and a class; derived: distance, counts
by region. *What the shape shares.* The marking surface the app already has in
two places (the line standard board; the photo marked in Problems). *What each
tool still brings.* Distance × cycles for a spaghetti diagram, load-distance
for a from–to chart, counts by region on a pack picture. *Most
representative:* FC-004 spaghetti diagram, FC-126 where on the pack, FC-212
from–to chart. **Recommendation: do not build a platform for three.** Build the
first as a mode of the line standard (needs a scale on its layout) and the
second as a mode of the defect tally (FC-124, built).

### Anything else found

- **Fits no shape yet:** FC-179 the week's schedule (a timeline planner with
  orders and changeovers — its own engine; FC-180, FC-070, FC-011 and FC-043
  lean on it), FC-047 line simulation, FC-023 predetermined motion times
  (licensed tables, a certified analyst). Whether Faultline schedules or
  simulates at all is a decision about "deep, not wide" (`docs/DIRECTION.md`)
  that belongs to Rowland.
- **A fourth kind of change** (kaizen FC-016, kata FC-017, DMAIC FC-138) goes
  in `lib/planModel` as "one more entry", but CLAUDE.md names three kinds and
  a Lean Six Sigma charter was taken out on 20 October at his word: ask first.
- **Catalogue `kind` and shape differ for at least 14 entries** (kind decides where a
  tool is listed, shape decides how it is built): FC-009, FC-043, FC-070,
  FC-133, FC-168, FC-179 and FC-184 are catalogued as standards; FC-063,
  FC-122 and FC-064 as registers; FC-015 and FC-226 as logs; FC-174 as a
  study; FC-011 as a standard. Each specification should say which kind it
  wants and the catalogue test follows.

## (c) Every entry that is not yet available

Grouped by shape, then by number. *Status*: not built · partial · research.
*cx* is the catalogue's complexity (S, M, L, XL); *value* its value. *Depends
on unbuilt* lists only the entry's related entries that are themselves not
available. A fold names the built tool the work goes into.

| id | name | status | cx | value | shape | folds into an existing tool, or new page | depends on unbuilt | note |
|---|---|---|---|---|---|---|---|---|
| FC-003 | Process flow chart — operation, transport, inspection, delay, storage | not built | S | low | Readings study (exists) | folds into Value stream (FC-001) | FC-028 | The same walked steps with an ASME class (five symbols), time and distance; the class is a tag on a step, not a new record. |
| FC-007 | Standard work combination table — manual, walking and machine time against takt | partial | M | medium | Readings study (exists) | folds into Line balance (FC-032) | FC-026 | Draws walking and machine time on the existing timed elements; the timeline picture is the new part. |
| FC-015 | Andon calls — response and resolution times | not built | M | medium | Readings study (exists) | folds into Reliability (FC-058) as a count with response and resolution times | FC-059 | Tapped events with two intervals (arrived, cleared), as MTTR is; not a check. Recording who called is a people question for the owner. |
| FC-019 | Stopwatch time study — rated, allowed, standard time | partial | M | high | Readings study (exists) | folds into the time study (tools/linework) | FC-025, FC-024 | Asks the rating on screen and states the cycles needed (FC-020, built). |
| FC-021 | Video time study — the work read from footage | partial | XL | high | Readings study (exists) | folds into Video studies (tools/video) | FC-019 | Partial: changeovers not measured from footage; accuracy measured, never promised. |
| FC-024 | Standard data — timed elements reused across products | not built | M | medium | Readings study (exists) | folds into the time study and Line balance | FC-019 | A library of timed elements reused across products; a list inside the time study, not a shape. |
| FC-026 | Person–machine chart and machine interference | not built | M | medium | Readings study (exists) | folds into Line balance (FC-032) | FC-007 | Multiple activity chart on timed elements; N′ = (l+m)/(l+w) is the verdict. |
| FC-027 | Learning curve — new starters and new products | not built | S | low | Readings study (exists) | folds into the Analysis tool (tools/analysis) as a question | FC-019, FC-222 | Fit on times against cumulative units; a readings question, not a calculator. |
| FC-028 | ECRS on the elements — eliminate, combine, rearrange, simplify | not built | S | medium | Readings study (exists) | folds into Line balance (FC-032) | FC-019 | A decision field per element (eliminate, combine, rearrange, simplify) with the expected saving. |
| FC-033 | A balance proposed with the order the work must follow | partial | M | medium | Readings study (exists) | folds into Line balance (FC-032) | — | Adds precedence and ranked positional weight to the existing suggestion. |
| FC-055 | Short stops counted at the machine — how often and how long | partial | S | high | Readings study (exists) | folds into Reliability (FC-058) | — | Partial; durations of short stops are the missing part (FC-059). |
| FC-056 | Speed loss — running against ideal speed | partial | S | medium | Readings study (exists) | folds into Shift losses (tools/losses) | — | Partial; split only once a running speed is timed. |
| FC-059 | Repair times — MTTR and availability | not built | M | high | Readings study (exists) | folds into Reliability (FC-058) | FC-015, FC-066 | Start, arrived, fixed tapped; MTTR median and 90th percentile; availability. |
| FC-060 | Weibull analysis of times to failure | not built | M | medium | Readings study (exists) | new question in Reliability (reads its intervals) | FC-063 | Weibull fit (IEC 61649 text not read); needs failure times per mode. |
| FC-061 | Reliability growth during commissioning (Crow–AMSAA) | not built | M | medium | Readings study (exists) | folds into Reliability (FC-058) | — | Crow-AMSAA on cumulative failure times during commissioning. |
| FC-072 | Cleandown changeovers by SMED — wet and dry cleans | partial | S | medium | Readings study (exists) | folds into SMED (tools/changeover) | FC-171 | Partial; adds the swab wait and release (FC-171). |
| FC-085 | Line acceptance on the EN 415-11 time model | research | M | medium | Readings study (exists) | folds into Shift losses (the loss count’s time model) | — | Research first: the EN 415-11 text has not been read; the verdict rules depend on it. |
| FC-096 | Capability of readings that are not bell-shaped | not built | L | medium | Readings study (exists) | folds into the capability study (tools/capability) | FC-114 | Needs distribution fitting (FC-114) first; the study already says a leaning set is read as measured. |
| FC-114 | Fitting a distribution — the probability plot | not built | M | low | Readings study (exists) | folds into the Analysis tool | FC-096, FC-060 | Probability plots and goodness of fit as a question on any readings set. |
| FC-119 | Type 1 gauge study — one reference measured again and again | not built | S | high | Readings study (exists) | new page | FC-164, FC-118 | Repeats of one reference; Cg/Cgk with the VDA 20% rule (to confirm). The simplest gauge study. |
| FC-120 | Bias, linearity and stability of a gauge | not built | M | low | Readings study (exists) | folds into the type 1 gauge study (FC-119) | FC-122 | Bias by size, linearity by regression, stability from a chart of a reference over time. |
| FC-153 | Stratification — split the data to find where it lives | partial | S | medium | Readings study (exists) | folds into Capability and Analysis (splits by factor) | — | Partial; stops already split, readings and rejects not. |
| FC-176 | Cooling curves — time to temperature | not built | M | medium | Readings study (exists) | new page | — | Core temperature against time per load; time to each limit; capability on the times. |
| FC-233 | Micro-motion study — therbligs and the two-handed chart | not built | M | low | Readings study (exists) | folds into Video studies (FC-021) | FC-021, FC-028 | Therbligs and a two-handed chart on slowed footage. Low value. |
| FC-005 | Waste walk — the eight wastes seen, classed and costed | partial | M | medium | Register (exists) | folds into Problems register and the filmed walk (FC-081) | — | Add a waste class, a place and an estimate to a problem row; cost from lib/cost. No new record. |
| FC-082 | Operational readiness — people, standards, spares, food safety | partial | S | medium | Register (exists) | folds into the stage gate handover list | FC-222, FC-168 | Partial; readiness items with owner and evidence are handover rows with a category. |
| FC-134 | Complaints per million and their Pareto | not built | S | medium | Register (exists) | new page | FC-150, FC-128 | Complaint rows (type, product, line, date code) plus units sold for CPMU with Poisson bounds. |
| FC-135 | Product on hold — non-conformance and release | not built | S | medium | Register (exists) | new page | FC-170, FC-150 | A hold with product, quantity, reason, owner, disposition, cost. |
| FC-155 | Horizontal deployment — a proved fix offered to every line with the same machine | not built | M | high | Register (exists) | new page (a row per line offered) | — | Offered, taken, proved per line; proof is the before and after already built. Crosses lines: factory scope. |
| FC-178 | Hygienic design review of new equipment | research | M | medium | Register (exists) | folds into the stage gate machine page | — | Research first: EHEDG and EN 1672-2 checklists are licensed; findings by severity, closed before SAT. |
| FC-221 | Ideas from the floor | not built | S | medium | Register (exists) | new page | FC-220 | An idea: who, where, what, judged, done, proven. |
| FC-227 | Compressed air leak survey | not built | S | medium | Register (exists) | new page | FC-226 | A leak is a row (place, size, cost, tag, fixed); cost of air is a stated input. |
| FC-016 | Kaizen event — a focused week with its 30-day check | partial | M | medium | Project / workflow (exists) | new kind of change in lib/planModel | — | Adds a kaizen charter and a 30-day check to the 6M’s records. A fourth kind of change: the owner agrees it first (CLAUDE.md names three). |
| FC-017 | Improvement kata — target condition and experiments | not built | M | low | Project / workflow (exists) | new kind of change in lib/planModel | FC-201 | Experiment log (expected, actual) is a small register inside the project. Low value; the owner agrees first. |
| FC-138 | DMAIC as a kind of change | partial | L | medium | Project / workflow (exists) | new kind of change in lib/planModel | FC-142, FC-133 | Partial; phase gates over the 6M’s records. A Lean Six Sigma charter was deleted 20 October: the owner agrees before it returns. |
| FC-213 | Lever tree — a number to hit | partial | L | medium | Project / workflow (exists) | already a kind of change (lever tree) | FC-201 | Partial; only the acceptance script is missing. |
| FC-215 | Critical path and float in a project plan | not built | M | low | Project / workflow (exists) | folds into the stage gate plan (lib/gantt) | — | Forward and backward pass over the plan’s tasks and dependencies; float by task. |
| FC-009 | Kanban sizing | not built | S | medium | Calculator (new) | new page | FC-010, FC-183 | Monden formula; the safety factor is a choice to say on screen. Saved per material and line; money from stock held. |
| FC-010 | Supermarkets and FIFO lanes — sizing pull between processes | not built | M | low | Calculator (new) | folds into the kanban page (FC-009) | FC-009, FC-044 | Lane or supermarket size from usage, replenishment time and variation; the sizing rule (Smalley) must be read before it is written. |
| FC-012 | Pacemaker and pitch | not built | S | low | Calculator (new) | folds into Value stream (FC-001) future state | — | One formula (takt x pack-out quantity); not worth a page of its own. |
| FC-018 | Lean maturity assessment | research | M | low | Calculator (new) | new page | FC-220 | Research first: which maturity model is the team’s, and its licence. Would be a scored form (criteria, evidence, dimension totals). |
| FC-025 | Allowances — relaxation and contingency | partial | S | medium | Calculator (new) | folds into the time study (FC-019) | FC-019 | ILO factor table as a lookup; the tables must be copied from the source, not recalled. |
| FC-041 | Capacity’s three numbers — design, effective, actual | partial | S | medium | Calculator (new) | folds into Line capacity | — | Partial; arithmetic in lib/ie/mix, on no screen. |
| FC-044 | WIP and lead time — Little’s law | not built | S | medium | Calculator (new) | folds into Value stream (FC-001) or the flow sums page | FC-045 | Lead time = WIP / throughput; WIP counted by hand. |
| FC-045 | Utilisation and variability — why queues explode | not built | S | low | Calculator (new) | folds into the flow sums page (FC-044) | FC-044, FC-047 | Illustrative curve; low value on its own. |
| FC-046 | Accumulation between machines — buffer minutes and recovery | partial | S | medium | Calculator (new) | folds into Line capacity | FC-047 | Partial; buffer minutes noted there, not driven by an acceptance script. |
| FC-066 | Critical spares — how many to hold | not built | S | medium | Calculator (new) | new page | FC-064 | Poisson demand over the lead time from a failure rate (FC-058 gives it). |
| FC-069 | Changeover interval — every product every interval (EPEI) | partial | S | medium | Calculator (new) | folds into SMED (tools/changeover) | FC-011, FC-182 | Partial; worked out inside SMED, not tied to a schedule. |
| FC-070 | Changeover sequence — allergens, colours and flavours in the right order | not built | M | high | Calculator (new) | new page | FC-171, FC-179 | Needs a from-to matrix of changeover times; the least-total-time order is a small search, rules (allergen order) are constraints. Allergen rules are food safety: the tool states them, never decides them. |
| FC-116 | Several deposits in one pack — tolerance stack-up | not built | S | medium | Calculator (new) | folds into the capability study (weight mode) | — | Variance of a sum of independent deposits; feeds the give-away at the legal floor. |
| FC-123 | Measurement uncertainty budget | not built | M | low | Calculator (new) | new page | FC-122 | GUM budget: sources to standard and expanded uncertainty. Low value. |
| FC-129 | Acceptance sampling by attributes — AQL plans | research | M | low | Calculator (new) | new page | FC-131, FC-136 | Research first. ISO 2859-1 tables are copyright: computed plans or a licence is the owner’s decision. |
| FC-130 | Acceptance sampling by variables | research | M | low | Calculator (new) | folds into FC-129 | FC-129 | Research first. ISO 3951-1 k values are copyright; as FC-129. |
| FC-131 | What a sampling plan protects — the OC curve | not built | S | medium | Calculator (new) | new page | FC-129 | Buildable now from a plan’s n and c typed in (binomial); needs no ISO table. |
| FC-141 | Kano analysis | not built | S | low | Calculator (new) | new page | FC-140 | Paired answers map to a class by a lookup; low value. |
| FC-180 | Scheduling rules — due date, shortest first, Johnson’s rule | not built | S | low | Calculator (new) | folds into the schedule (FC-179) | FC-179 | EDD, SPT and Johnson’s rule on a small order list; low value alone. |
| FC-182 | Batch size and campaign length (EOQ, EPQ) | not built | S | medium | Calculator (new) | new page | FC-069 | EPQ; shelf life as a cap. |
| FC-183 | Safety stock and the reorder point for materials | not built | S | medium | Calculator (new) | folds into the kanban page (FC-009) | FC-009 | Safety stock and reorder point from usage and lead-time spread. |
| FC-184 | Crewing a shift — heads, absence and cover | not built | S | medium | Calculator (new) | new page | FC-222 | Heads from Line capacity grossed up for absence; the skill gaps need FC-222. |
| FC-191 | What an improvement is worth — payback and NPV | not built | S | medium | Calculator (new) | new page; offered on every countermeasure | FC-144 | Payback and NPV from the cost model; the discount rate is a stated choice. |
| FC-207 | NIOSH lifting equation | partial | M | medium | Calculator (new) | new page | FC-208 | Partial; the NIOSH arithmetic is in lib/ie/ergo, on no screen. Always said as a screening tool. |
| FC-208 | HSE MAC — manual handling assessment charts | not built | M | medium | Calculator (new) | new page; shares the scored-form page with FC-209 | FC-207, FC-209 | HSE INDG383 tables to be copied from the HSE document, not recalled. |
| FC-209 | HSE ART — repetitive upper-limb tasks | not built | M | medium | Calculator (new) | new page; shares the scored-form page with FC-208 | FC-208, FC-210 | HSE INDG438; the exposure bands are to confirm. |
| FC-210 | RULA and REBA — posture scores | not built | M | low | Calculator (new) | new page | FC-209 | RULA/REBA tables are the papers’; they are not reproduced. Needs the owner’s call on how to source them. |
| FC-211 | Pushing and pulling — trolleys and pallet trucks | not built | S | low | Calculator (new) | new page | FC-208 | HSE RAPP or Snook tables; measured forces read by a person. Low value. |
| FC-229 | Carbon a pack | research | M | low | Calculator (new) | new page | FC-226 | Research first: emission factors change yearly and are illustrative in the record. Scope 1 and 2 only. |
| FC-232 | The inspector’s reference test on a batch (℮) | research | M | medium | Calculator (new) | folds into the capability study (sold by weight, FC-162) | — | Research first: needs the Regulations’ schedules read; a rule-based verdict. |
| FC-011 | Heijunka box — the levelled daily mix | not built | M | medium | Check log (new) | new page | FC-069, FC-070 | Fits only half: a levelled pattern (a calculation, FC-070 and FC-182) ticked slot by slot. Whether batch food lines want a heijunka box is the owner’s call. |
| FC-013 | 5S audit with score and trend | not built | M | medium | Check log (new) | folds into the scored audit (FC-177) as the 5S checklist | FC-177 | Same engine as FC-177: a fixed scored checklist per area, repeated; 5S is its first checklist. |
| FC-014 | Mistake-proofing register and the daily device checks | not built | S | medium | Check log (new) | new page | FC-133, FC-132, FC-166 | The register of devices is the list of checks; each device is a check with a frequency and a reaction. |
| FC-062 | Autonomous maintenance — CILT checks and abnormality tags | not built | M | medium | Check log (new) | new page | FC-063, FC-234 | Check list per machine with frequency, and tags raised and closed (tags are Problems rows). |
| FC-063 | Planned maintenance — due, done on time, and backlog | not built | M | medium | Check log (new) | new page | FC-060, FC-064 | Catalogue kind is register; best built on the check engine (due, done on time, backlog hours). Plan interval from the criticality class. |
| FC-071 | First-off release at changeover — line clearance and the first good pack | not built | S | high | Check log (new) | new page | FC-166 | Line clearance and first-off list signed before running; time to release. |
| FC-122 | Calibration register and checks | not built | S | medium | Check log (new) | new page | FC-119 | Catalogue kind is register; instruments with intervals and between-calibration checks, due and overdue; a failed check names the product to review. |
| FC-133 | Control plan — what is checked, how, how often, and what if not | not built | M | medium | Check log (new) | new page (the plan side of the check log) | FC-132 | A control plan row is a check definition with a reaction plan; its checks run on the log. |
| FC-164 | Checkweigher verification — test weights and the reject | not built | S | medium | Check log (new) | new page | FC-119 | Test packs run at start-up and intervals; reading and reject confirmed per pass; links the gauge study (FC-119). |
| FC-166 | Code and label verification | not built | S | high | Check log (new) | new page | FC-071, FC-014 | Scheduled code, allergen label and barcode checks; failure holds product. |
| FC-170 | Metal detection and X-ray verification | not built | S | high | Check log (new) | new page | FC-135 | Test pieces at positions and frequency; a miss holds product since the last good check (FC-135). |
| FC-171 | Allergen changeover validation | not built | M | high | Check log (new) | new page | FC-072, FC-070, FC-172 | A validated clean: steps, inspection, test, release; time to release. |
| FC-172 | Cleaning verification — ATP and swabs | not built | S | medium | Check log (new) | new page | FC-171, FC-173 | ATP or swab results against pass, caution, fail; Pareto of fails. |
| FC-173 | Environmental monitoring — Listeria zones and trends | not built | M | medium | Check log (new) | new page | FC-172 | Sites with zones, lab results, recurrence by site. Sites could sit on a picture later. |
| FC-174 | Traceability exercise, timed | not built | S | medium | Check log (new) | new page | FC-159 | An exercise due every so often whose result is time taken and share accounted for; mass balance from the ledger (FC-159). |
| FC-177 | Scored audits — GMP, hygiene, layered process audits | not built | M | medium | Check log (new) | new page | FC-013 | The scored-checklist engine: fixed checklist, levels, findings scored and actioned, repeats. |
| FC-196 | Hour-by-hour production board | not built | M | high | Check log (new) | new page | FC-185, FC-198 | The hour is the check: plan, actual (by a person), reason for a gap. Slot variant with a count. |
| FC-199 | Gemba walk — and how fresh the looking is | partial | S | medium | Check log (new) | folds into leader standard work (FC-200) | FC-200 | Partial; freshness worked out, not driven by an acceptance script. A walk is a check with a due date. |
| FC-200 | Leader standard work | not built | S | low | Check log (new) | new page | FC-199, FC-198 | A leader’s routine of checks and walks with done or not. |
| FC-234 | Condition checks by a person — temperatures, wear, noise on a route | not built | M | medium | Check log (new) | folds into CILT checks (FC-062) | FC-062 | Route checks that read a value against a limit and are trended by point. |
| FC-064 | Equipment criticality ranking | not built | S | medium | Scored register (new) | new page | FC-065, FC-066 | Consequence x likelihood into classes A/B/C; the scales are the team’s choice, said on screen. |
| FC-065 | Reliability-centred maintenance | research | XL | low | Scored register (new) | new page | FC-064, FC-132 | Research first (SAE JA1011 logic); would sit on the FMEA rows. XL, low value: defer. |
| FC-132 | Process FMEA with action priority | not built | L | medium | Scored register (new) | new page | FC-133, FC-014, FC-168 | L. Severity, occurrence, detection; the AIAG-VDA Action Priority table must be checked against the handbook, not recalled. |
| FC-143 | Pugh matrix — choosing between solutions | not built | S | low | Scored register (new) | new page | FC-144, FC-191 | Options x weighted criteria against a baseline. |
| FC-144 | Impact and effort — which countermeasure first | not built | S | medium | Scored register (new) | folds into Actions and the 6M countermeasures | FC-191 | Impact in pounds from lib/cost, effort chosen; PICK quadrants. |
| FC-222 | Skills matrix and cover | not built | M | high | Scored register (new) | new page | FC-184, FC-223 | People x tasks with levels, cover per shift. Names of staff: who may see the matrix is a decision for the owner. |
| FC-002 | Product families and P–Q analysis | not built | S | medium | Ledger (new) | folds into Value stream (FC-001) as a page | FC-181 | Products x steps matrix and the volume Pareto; volumes typed or pasted. |
| FC-029 | Labour productivity — packs or kilos a labour hour | not built | S | medium | Ledger (new) | new page (one page with FC-030) | FC-030 | Needs clocked hours, which nothing in the app holds: typed or pasted by line, shift and week. |
| FC-030 | Earned hours and labour efficiency against standard | not built | M | medium | Ledger (new) | new page (one page with FC-029) | FC-019, FC-029 | Earned hours = output x standard time; standard times come from the time study. |
| FC-042 | Product mix at the constraint — throughput per constraint minute | partial | M | medium | Ledger (new) | folds into Line capacity | — | Partial; products x price, rate, demand; arithmetic in lib/ie/mix, on no screen. |
| FC-048 | Capacity across the factory’s lines, weeks and months ahead | not built | M | medium | Ledger (new) | new page under the Factory | — | Demand by product and week typed; reads each line’s Line capacity rate. Reads data, adds one table. |
| FC-127 | First pass and rolled throughput yield | not built | S | medium | Ledger (new) | folds into yield by stage (FC-159) | FC-128, FC-159 | Per step: in, passed first time, reworked, rejected; RTY is the product. |
| FC-128 | Cost of poor quality | not built | M | medium | Ledger (new) | new page | FC-134 | PAF buckets from records and typed costs; the money must come from lib/cost, not a second model. |
| FC-136 | Supplier quality — incoming checks and supplier PPM | not built | M | medium | Ledger (new) | new page | FC-129 | Deliveries, checks and line problems traced to lots; PPM by supplier. Lot sampling depends on FC-129 only if sampling plans are wanted. |
| FC-159 | Yield and mass balance by stage | not built | M | high | Ledger (new) | new page | FC-160, FC-161, FC-127 | Weights in, out, by-product, rework, waste per stage in one period; unexplained loss in pounds. The anchor of the ledger shape. |
| FC-160 | Material usage variance — ingredients and packaging | not built | S | medium | Ledger (new) | folds into yield by stage (FC-159) | FC-159 | Variance by material against standard usage. |
| FC-161 | Food waste measured by stage | not built | S | medium | Ledger (new) | folds into the ledger (FC-159) with FC-228 | FC-159, FC-228 | Waste by stage, cause and destination. |
| FC-181 | Runners, repeaters and strangers | not built | S | medium | Ledger (new) | folds into P-Q (FC-002) | FC-002, FC-011 | Demand history by product into classes. |
| FC-185 | Plan attainment — made against planned | not built | S | medium | Ledger (new) | new page | FC-179, FC-196 | Plan and actual by product and day; attainment = sum min(actual, plan) / sum plan. |
| FC-186 | Forecast accuracy — error and bias | not built | S | low | Ledger (new) | new page | — | Forecast and actual by product and period; weighted MAPE and bias. Low value. |
| FC-226 | Energy and water per tonne | not built | M | medium | Ledger (new) | new page | FC-227, FC-229 | Meter readings by a person against output by period; catalogue kind is log. Intensity and base load. |
| FC-228 | Waste by stream and its cost | not built | S | low | Ledger (new) | folds into the ledger (FC-161) | FC-161 | The stream dimension of the same waste table. |
| FC-111 | Designed experiments — two-level factorials | not built | L | medium | Designed run (new) | new page | FC-118, FC-112 | L. Factors, run order randomised, effects and interactions; analysis in lib/ie. |
| FC-112 | Optimising settings — response surface | research | L | low | Designed run (new) | folds into the factorial tool (FC-111) | FC-111 | Research first; needs FC-111 and a fitted quadratic. Low value. |
| FC-118 | Gauge R&R — repeatability and reproducibility | not built | M | medium | Designed run (new) | new page | FC-119 | Crossed parts x appraisers x repeats, blind and randomised; ANOVA %GRR and ndc. AIAG MSA text to confirm. |
| FC-121 | Inspectors agreeing — attribute agreement (kappa) | not built | M | medium | Designed run (new) | new page | FC-137 | Blind judgements against a known standard; kappa per inspector. |
| FC-137 | Sensory difference test — the triangle test | not built | S | low | Designed run (new) | new page | FC-121 | Randomised triplets; binomial at 1/3 (ISO 4120 text to read). Low value. |
| FC-175 | Shelf-life studies | research | L | medium | Designed run (new) | new page | FC-137 | Research first: a protocol, tests at intervals against end-points; a specialist’s method. |
| FC-004 | Spaghetti diagram — walking and transport distance | not built | M | medium | Layout marking (new) | new page on the line standard layout (FC-006) | FC-212 | Path drawn on the line standard board to scale; distance x cycles. Needs the layout to have a scale. |
| FC-126 | Where on the pack — the defect concentration diagram | not built | M | medium | Layout marking (new) | folds into the defect tally (FC-124) | — | Marks on a picture of the pack by position; counts by region. Reuses the photo marking in Problems. |
| FC-212 | Layout and material flow — the from–to chart | not built | M | low | Layout marking (new) | new page | FC-004 | A from-to matrix of moves x distance; distances from the layout once FC-004 exists. Matrix first. |
| FC-139 | SIPOC — the scope on one page | not built | S | low | Structured document (new) | folds into Value stream / project scope | FC-142 | Five columns, 4 to 7 steps, one page. |
| FC-140 | Voice of the customer to CTQs | not built | S | low | Structured document (new) | new page | FC-141 | CTQ tree: need, driver, measurable requirement with a limit, ready for capability. |
| FC-142 | Project charter — problem, goal, scope, team, worth | partial | S | medium | Structured document (new) | folds into the project page | FC-138 | Partial; problem, goal, scope, team on one page. A business case was taken off at the owner’s word, 17 October. |
| FC-145 | QFD — the house of quality | not built | L | low | Structured document (new) | new page | FC-140 | L, low value: a relationship matrix. Defer. |
| FC-149 | Is / is not — specifying the problem | not built | S | medium | Structured document (new) | folds into the 6M problem (FC-146) | FC-153 | Is / is not with distinctions and changes. |
| FC-150 | 8D report | not built | M | medium | Structured document (new) | new paper from a problem or complaint | FC-134 | Paper over a problem’s facts plus containment and verification fields. VDA edition to confirm. |
| FC-152 | Fault tree analysis | not built | L | low | Structured document (new) | new page | FC-132 | L, low value: a tree editor with gates and cut sets. Not a form; defer. |
| FC-168 | HACCP plan | not built | L | low | Structured document (new) | new page | FC-082, FC-132 | L. The plan with CCPs and limits is the HACCP team’s; the tool records it and feeds the checks, never decides hazards. Scope is the owner’s call. |
| FC-223 | TWI job instruction — the breakdown and four-step teaching | not built | M | medium | Structured document (new) | new page | FC-222 | Important steps, key points, reasons; sign-off feeds the skills matrix. |
| FC-224 | One-point lesson | partial | S | medium | Structured document (new) | new page | FC-223 | Partial; Line Talk writes one on request, no sign-off. One page, mostly pictures. |
| FC-225 | Standard operating procedure with photos | not built | M | medium | Structured document (new) | folds into the line standard (kept with the standard) | FC-223 | Steps, photos, key points; screen and paper. |
| FC-039 | Recovery levers — what taking a share off the top losses buys | partial | S | medium | Board over records (new) | folds into Shift losses (tools/losses) | — | Partial; arithmetic present, not driven by an acceptance script. |
| FC-043 | Drum–buffer–rope and buffer management | not built | L | low | Board over records (new) | new page | FC-179 | Needs the week’s schedule (FC-179) first. Low value; the owner decides whether DBR belongs on a food line. |
| FC-057 | Cost deployment — losses to causes to pounds (WCM) | not built | XL | medium | Board over records (new) | new page under the Factory | FC-128, FC-220 | XL; reads losses from many tools and cost rates. Last of the boards; depends on a plant-wide loss record. |
| FC-067 | Maintenance measures — MTBF, MTTR, planned share, backlog | not built | M | low | Board over records (new) | new page | FC-059, FC-063 | Reads reliability, repair times and planned maintenance; nothing to type. |
| FC-117 | The team’s own weekly number, trended | partial | S | medium | Board over records (new) | folds into the Numbers panel and the client report | FC-201 | Partial; trend is on screen from 8 weeks, not yet on paper. |
| FC-151 | A3 — the problem and its solution on one page | partial | S | medium | Board over records (new) | folds into the 6M report | — | Partial; a one-page layout over records already held. |
| FC-197 | SQDC daily board | not built | M | medium | Board over records (new) | new page; with FC-198 | FC-198 | Reads what the tools hold; day status in words. |
| FC-198 | Tiered daily meeting — the day’s update and its paper | partial | M | medium | Board over records (new) | folds into the day’s update | FC-197 | Partial; built for a stage-gate project’s day, no line’s daily meeting or escalation. |
| FC-201 | The team’s own weekly number, proved | partial | S | medium | Board over records (new) | folds into the Numbers panel and the client report | FC-117 | Partial; before and after tested on screen, no paper. |
| FC-203 | Shift handover log | not built | S | medium | Board over records (new) | new page | FC-196 | Reads the shift’s records, plus typed notes by the outgoing leader. |
| FC-219 | Hoshin kanri — policy deployment | not built | L | low | Board over records (new) | new page | FC-213, FC-220 | L, low value: the X-matrix links objectives, projects, measures and owners. Defer. |
| FC-220 | The improvement programme — projects and proven savings over time | not built | M | medium | Board over records (new) | new page under the Factory | FC-221 | Projects with savings claimed and proven (before and after), by month. |
| FC-023 | Predetermined motion times — MTM and MOST | research | L | low | No shape yet | new page | FC-024 | Research first. Licensed tables and a certified analyst: no shape until the owner decides whether Faultline can offer it at all. |
| FC-047 | Line simulation — stops, buffers and output | research | XL | medium | No shape yet | new page | FC-059 | Research first. Simulation is a different engine and needs measured MTBF/MTTR first; a decision for the owner (deep, not wide). |
| FC-179 | The week’s schedule against capacity, with changeovers | not built | L | medium | No shape yet | new page | FC-070, FC-180 | L. A timeline planner with orders and changeovers is its own engine, not a calculator or a log. Whether Faultline schedules at all is the owner’s decision (deep, not wide). |

## Where the classification is least sure, and what is Rowland's to decide

Said plainly, because a shape that is forced onto an entry is a template:

| Entry or group | Why it is unsure | Decision needed |
|---|---|---|
| FC-016 kaizen, FC-017 kata, FC-138 DMAIC | Each is a kind of change; CLAUDE.md names three and a Lean Six Sigma charter was removed on 20 October | Is a fourth kind wanted at all |
| FC-179 schedule, FC-180, FC-043 DBR, FC-011 heijunka, FC-047 simulation | Planning engines, not calculators or logs; "deep, not wide" | Does Faultline schedule or simulate |
| FC-023 MTM/MOST, FC-129 and FC-130 sampling plans, FC-210 RULA/REBA, FC-208 MAC, FC-209 ART, FC-211 push/pull, FC-178 hygienic design | Licensed or copyright tables, or tables that must be copied from the source, not recalled | How the tables are sourced (licence, computed plans, or left out) |
| FC-168 HACCP, FC-070 allergen sequence, FC-171 allergen validation, FC-065 RCM | Safety judgement belongs to the team; the tool records and checks, it does not decide | What the tool may say, and what it must not |
| FC-222 skills matrix, FC-184 crewing, FC-015 andon | Names of staff and what they can do or how fast they respond | Who may see it |
| FC-145 QFD, FC-152 fault tree, FC-219 hoshin | Editors or matrices of a different order from a form; low value | Whether to build |
| FC-085 EN 415-11, FC-096 non-bell capability, FC-112, FC-175, FC-229 | Research first: standards not read, models not chosen, factors that change yearly | Wait for the research |
| FC-063, FC-122, FC-133, FC-174, FC-226, FC-064 and the other entries where kind and shape differ | The catalogue's `kind` (where a tool is listed) may need to change when each is built | Agreed when each is specified |

Every other entry fits its shape, or folds into a built tool, without a
decision that is not already in its own specification.

## What this document does not do

It does not change a status, add a record or schedule work; it does not
replace `docs/TOOLS-BUILD.md`'s waves, only lays the shapes over them. A shape
is built the way a tool is — specification before code, independent cases, an
acceptance script in the gate — and its first tool proves it. If the first
tool shows the frame is wrong, this file is corrected in the same commit.
