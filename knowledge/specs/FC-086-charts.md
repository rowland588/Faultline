# FC-086 — Charts on readings in order: the control chart and its modes (W2)

**Catalogue:** FC-086 individuals and moving range (the tool) · FC-087 X̄-R and
X̄-S on subgroups (mode) · FC-090 signals — Western Electric and Nelson
(component) · FC-091 CUSUM and EWMA (mode) · FC-093 short-run DNOM and Z-MR
(mode) · FC-092 pre-control for set-up approval (a kind of the same record)
· FC-101 capability across products and over time (a report on the line) ·
FC-117 and FC-201 the team's weekly number, its trend added (stay partial: no paper).
**Knowledge:** `spc.control-charts-variables`, `spc.run-rules`,
`spc.cusum-ewma`, `spc.short-run`, `spc.pre-control`, `spc.capability-measured`,
`stats.time-series-trend`, `stats.two-sample-tests`. **Programme:**
`docs/TOOLS-BUILD.md` W2. **Written 24 October 2026, before any code.**

## 1. Purpose
A line runs all shift; the capability study is a dated snapshot. The chart is
the running record: readings in order against limits set from a steady
period, a signal said in words the moment the process moves, and — for a
drift too small for the limits — the CUSUM saying since when. Rowland, 10
October: "This is about manual inputs" — every reading is typed or tapped by a
person on the line, nothing reads a machine.

**Scope.** This build covers: a new tool, **Control chart** (`tool: 'chart'`,
kind *study*, listed under the scope's *Tools* — no scope lists a log-kind tool
yet, so it moves to *Logs* with a one-line change when the log tools are built),
its record one `ToolStudy` whose
readings are in time order; the individuals and moving range chart with
limits set from a steady period and frozen (FC-086); subgroups of 2–10 as
X̄-R, over 10 as X̄-S, with the standard constants (FC-087); the signals —
Western Electric's four by default, Nelson's other four as options, each
said in words with what it usually means (FC-090); the CUSUM against a target
with the shift worth catching typed, saying the change point and the new
level, and the EWMA as the running level (FC-091); short-run charts when each
reading carries its product — deviation from nominal, Levene's check before
pooling, Z-MR when the spreads differ, a changeover drawn as a boundary
(FC-093); pre-control as a kind of the same record — the zones from the
product's tolerance, five greens to qualify, the pairs read in words, and the
page saying it is not a control chart and not capability (FC-092); the
chart's paper; **Capability over time** — a line's capability studies side by
side by product and month with Ppk or the rate, on the line's capability list
and on paper (FC-101); and the team's weekly number finished — the runs
about the median, Sen's slope with Mann–Kendall's p, said on the Numbers
panel and the project's paper, with an acceptance script (FC-117, FC-201).
Not in W2: the attribute charts (built in W1 inside the rejects and faults
modes); autocorrelation (FC-115, W3); a chart reading a machine (never).

## 2. Users and scenarios
A team leader at the filler with a phone, typing a weight every twenty
minutes; a QA tech taking four packs an hour as a subgroup; the set-up
operator qualifying a changeover with five greens; the ops lead at a desk
asking "since when has it drifted" and printing the chart for the meeting; a
project's owner reading the weekly reject rate's trend.

## 3. Method selection
- One reading at a time → XmR (Wheeler's default for any process stream).
- Readings taken together at intervals → X̄-R (m ≤ 10) or X̄-S (m > 10).
- A small, persistent drift worth catching → CUSUM (K = half the shift,
  H = 5σ), the EWMA beside it as the current level.
- Many products, few readings each → DNOM when Levene says the spreads are
  alike, Z-MR when not.
- Approving a set-up against a tolerance → pre-control, said as such.
- A weekly number → run chart, runs about the median, Mann–Kendall and Sen's
  slope (robust to one bad week); before → after by Welch as already built.

**Established · assumed · chosen.**
*Established:* XmR limits x̄ ± 2.66·MR̄ and the MR chart's 3.267·MR̄
(2.66 = 3/d₂(2), 3.267 = D₄(2) — `cases-w2.py` derives both); the X̄-R and
X̄-S constants for m = 2…10 (`spc.control-charts-variables`, checked against
d₂ and c₄ in `cases-w2.py`); Nelson's eight tests and their false-alarm
rates (`spc.run-rules`, `cases-spc.py`); the tabular CUSUM and the EWMA
recursion with their limits (`spc.cusum-ewma`, the forty-reading case in
`cases-spc.py`); DNOM and Z-MR, Levene median-centred (`spc.short-run`);
pre-control's zones and rules (`spc.pre-control`); the runs-about-the-median
critical counts by the exact runs distribution, Kendall's τ and Sen's slope
(`cases-w2.py`). *Assumed:* readings independent and the steady period
representative; a subgroup's readings taken close together; the product's
nominal is the target for DNOM. *Chosen (for Rowland):* limits are **set
from a steady period and frozen** — the first 20 readings by default, or
the span the person marks — and re-set only by a tap that says so (a chart
whose limits move with every reading never signals); the default rules are
Western Electric's four (beyond 3σ, eight on one side, 2 of 3 beyond 2σ,
4 of 5 beyond 1σ) and Nelson's 3, 4, 7, 8 are offered off; CUSUM's K is
half the shift typed and H is 5σ (ARL₀ ≈ 469 two-sided), the head start
offered after an adjustment; EWMA λ 0.2, L 2.962; short-run pools by DNOM
when Levene's p ≥ 0.05 and the largest s is under twice the smallest; a
weekly trend is called a trend when Mann–Kendall's p < 0.05 or the runs
fall under the table's count.

## 4. Inputs
`AgreedChart` on the study: `kind: 'xmr' | 'xbar' | 'precontrol'`; `name`
(what is measured), `unit`; `target?`, `lower?`, `upper?` (the spec limits —
drawn, never the chart's limits; both required for pre-control); `subgroup?`
(m, 2–25; xbar only); `rules` (the tests on, default the four);
`frozen?: { from, to, centre, spread, n }` the steady period and the figures
set from it; `cusum?: { shift }` the shift worth catching in the unit;
`ewma?: boolean`; `products?: boolean` (short-run: each reading carries its
product and nominal). Each reading: `value`, `at`, `product?`, `nominal?`,
`group?` (the subgroup's index), `note?` (what was done — an adjustment, a
new reel). The capability list on a line needs nothing new (FC-101 reads the
studies that exist). The weekly number needs nothing new (FC-117/201 read
`lib/measures`).

## 5. Data suitability
Limits from 20 readings (or 20 subgroups); before that the chart is drawn
with provisional limits and says "limits provisional — set from 20". A
subgroup short of m is plotted and said. Short-run's Z-MR takes σₚ from the
product's own history from 20 readings, else the pooled σ with a note. The
CUSUM needs a target and σ from the frozen period. Pre-control needs both
spec limits. A weekly trend needs 8 points for the runs test and 10 for
Mann–Kendall to be said.

## 6. Calculations
In `src/lib/ie/dist.ts` (shared): the control constants table; `nelson(xs,
centre, sigma, rules)` → each signal with its test, the points, and its
usual meaning; `cusum(xs, target, k, h, headStart?)` → C⁺, C⁻ each point,
the first signal, the change point and the level; `ewma(xs, target, λ, L,
σ)`; `levene(groups)` median-centred W and p (via `fCdf`); `runsAboutMedian(xs)`
→ runs, the critical count, signal; `mannKendall(xs)` → S, τ, p (normal
approximation with ties); `senSlope(xs)`. In `src/tools/chart/chart.ts`:
`chartFigures(agreed, readings)` → the kind's centre, limits, each point's
state, the signals, the CUSUM/EWMA, the short-run figures, the pre-control
verdict; `chartSays` the sentences. Validated against `cases-spc.py` and
`cases-w2.py`: the forty-reading CUSUM signals at 38 (C⁺ 4.8), the EWMA at
38 (z 400.89 > 400.79); XmR frozen on the first 20 — centre 399.750, MR̄
0.6632, limits 397.986–401.514, points 35 and 38 beyond, eight above the
centre from 28; X̄-R on six subgroups of four — X̿ 400.2375, R̄ 0.7333, limits
399.703–400.772, subgroup 4 outside; DNOM centre 0.06, limits −3.08–3.21,
Levene W 0.045 p 0.83; the runs table (n 12 → fewer than 4; n 20 → fewer
than 7); the twelve weekly rates — Sen 0.100 a week, τ 0.788, p 0.00011,
4 runs; pre-control at Cp 1.33 — green 95.4%, five greens 79%.

## 7. Outputs
On screen: the chart (points in order, the centre, the limits, the spec
limits faint, a signalled point marked and named; the MR or R chart below;
the CUSUM's two sums with H when asked; the EWMA line when asked; a
changeover boundary and the product's name on a short-run chart; pre-control's
three zones as bands with each reading's zone word), the band's sentence
(*"Fill weight — 38 readings against limits set from the first 20: 2 beyond,
a run of 8 above the centre from reading 28 — the process has moved up since
about reading 28 (CUSUM); the level now 400.9 g."*), the tiles (Readings ·
Centre · Limits · Signals · Since · Level — the verdict is the band's, as in every tool), the signals each in words with
what it usually means, the action plan (a problem raised from a signal with
the signal's words), the closing line. Pre-control: *"Set-up: 5 greens in a
row — qualified. Running: pair 7 both amber on the high side — adjust toward
nominal and re-qualify."* Money: the chart carries none of its own; a reading
with a target says give-away by the capability study's rule where the unit is
a weight (FC-156), else nothing invented.

**The report.** The chart's paper (`src/lib/studiesPdf.ts` chartBlocks on the
report engine): the band, the cells (readings, centre, limits, signals,
since, level), the chart and its MR/R chart drawn, the signals in words, the
CUSUM when on, the readings in order ten a row with signalled ones red and
their note, the short-run table by product (n, mean, s, Levene said) — one or
two pages. Capability over time (FC-101): on a line's capability list, a
table product × month with Ppk (or the rate for a counted kind) and the
latest verdict, the trend by product; its paper the same table and a line a
product. The weekly number: the Numbers panel's sentence under each measure's
chart, on the screen only — its paper is not carried yet (FC-117 and FC-201
stay *partial* for that reason).

## 8. Manufacturing usability
The pad as the capability study's (one hand, big keys); a subgroup typed as
m readings then ↵; the product picked from the line's products on a
short-run chart; a note on a reading in one tap (Adjusted · New reel · Other);
the signal said in the words a team leader uses ("eight above the centre —
a step up: a new reel, a set-point moved?"). Phone: the chart on its side as
the V is, the pad below.

## 9. Failure handling
Fewer than 20: provisional limits, said. A subgroup short of m: said, not
judged. No target: the CUSUM and pre-control not offered, told why. A
product with no nominal on a short-run chart: refused with what to type.
Limits re-set: the old ones kept on the record with the day and who, said on
the paper. Nothing invented.

## 10. Integration
A chart is a study under *Tools* on a line or a project (kind *study*; see Scope); the
line's page reads its latest signal; a signal raises a problem on the line
(the register, with the signal's words); a chart on a project is the
project's. The capability study's "steady" check already uses the XmR
limits — the chart is the same arithmetic over time. FC-101 reads the line's
capability studies and nothing else. The weekly number reads `lib/measures`.

## 11. Verification
Unit tests on the cases above (`src/lib/ie/__tests__/dist.test.ts`,
`src/tools/chart/__tests__/chart.test.ts`, `src/lib/__tests__/measures.test.ts`);
the acceptance script `scripts/acceptance/control-chart.mjs`; the weekly
number's `scripts/acceptance/weekly-number.mjs`; the inventory and the compare.

**Acceptance criteria.**
1. Constants, limits, Nelson's tests, CUSUM, EWMA, Levene, the runs table,
   Mann–Kendall, Sen's slope agree with `cases-spc.py` and `cases-w2.py` —
   `dist.test.ts` ("W2").
2. XmR on the forty readings frozen at 20: the figures above, the two beyond
   and the run from 28 said, the CUSUM's signal at 38 and change point said,
   the EWMA's level — `chart.test.ts`.
3. X̄-R on six subgroups of four: subgroup 4 outside, the R chart inside —
   `chart.test.ts`; X̄-S from m = 11.
4. Short-run: Levene alike → DNOM pooled with the record's figures; spreads
   unalike → Z-MR said — `chart.test.ts`.
5. Pre-control: five greens qualify, an amber restarts, pairs read by the
   rules, the page's disclaimer — `chart.test.ts`.
6. On the page (`control-chart.mjs`): a chart started on a line under Tools,
   named for what it measures; twenty readings typed with provisional limits
   said, then the limits set and frozen; twenty more — the signals in words
   as the module says, the tiles, the closing line; the CUSUM turned on with
   a 1 g shift — since reading 28 said; a note on a reading; a problem raised
   from a signal carrying its words; the chart on paper read back; re-set
   limits kept with the day; a subgroup chart of four; a short-run chart with
   two products and a changeover boundary; pre-control's five greens and a
   pair; the line's page saying the latest signal; the phone.
7. Capability over time (`control-chart.mjs`, `overTime.test.ts`): capability
   studies in two months — the table's months, rows, cells, latest verdict and
   sentence as the module says them, on the list and on its paper.
8. The weekly number (`weekly-number.mjs`): twelve weekly rates typed, the
   trend sentence as `lib/measureProof` `numberTrend` says it (runs, Sen's
   slope, τ, p), on the line page's Numbers; a flat series said flat. Its paper
   is not claimed.
9. The directory and the catalogue: FC-086, FC-087, FC-090, FC-091, FC-092,
   FC-093 and FC-101 available (`control-chart.mjs`), FC-117 and FC-201 partial
   with their limits said — `catalogue.test.ts`; every rail tool has an entry.
10. `docs/PAGES.md` has the chart's page, the capability list's table and the
    Numbers trend line; the
    inventory green; `--compare` against live, nothing moved elsewhere.
11. The gate.

*Not yet proved:* use on a phone on the floor; the thresholds chosen in §3
have not been put to Rowland one by one.

## 12. Maintainability
The chart's arithmetic in `lib/ie/dist.ts` is what the capability study's
steadiness check and W3's statistics share; `src/tools/chart/` holds only the
chart's own figures, words and page. One record, three kinds, modes as
fields — never a second tool for a second chart.
