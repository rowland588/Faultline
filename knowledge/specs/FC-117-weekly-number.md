# FC-117 and FC-201 — The team's own weekly number: trended, and proved at a change: the specification

**Catalogue:** FC-117 (trended) and FC-201 (proved) — one number, two questions, built on one record and one module; each keeps its own entry ·
**Knowledge:** `stats.time-series-trend` (full, textbook), `stats.two-sample-tests` (full, textbook) · **Asked for:** Rowland, 1 November 2026 — *"I want all
tools made that get used in the projects"*; `docs/METHODS.md` §11 lists FC-201 as used by five methods (the A3's Target, DMAIC's Measure and Control, the
Improvement Kata's challenge and target condition, the Kaizen event's 30-day check, Theory of Constraints) and FC-117 by the A3 — both "part-built — finish" ·
**Status:** draft, built on `m6-other` (the trend and the proof existed from 24 October; the paper, the method page and the specification are 1 November)

## 1. Purpose
Most factories already keep one number a week per line — whatever they count: yield, give-away, labour per tonne, packs a minute. The team never sees
whether it is *going somewhere* (FC-117) or whether it *moved after the change, for more than luck* (FC-201), and a report that quotes the latest figure
cannot say either. This tool reads that number — recorded on the project against a line, a measure with its direction and a target — and says, in words
and on paper: **"Rate: rising about 1.6 ppm a week (Sen), Mann–Kendall p 0.04 — the right way for this measure"** and, at a change the team calls: **"41.8 → 49
ppm · +17.2% · 5 before · 3 after — could come up by chance about 2 times in 100."** The sentence it lets one side say to the other — the team to its sponsor,
the coach to the learner in a Kata cycle — is that the number is going the right way, or that it moved when the change landed, and how sure that is: the same
words on the line's page, on the sponsor's paper and on the method's row.

**Scope.** What this build covers: (1) the **record** — a project's measures (a name, a unit, which way is good), periods and targets, and a reading per line per
day, as built since 4 October (`lib/measures`, `lib/useMeasures`, `screens/NumbersPanel`, Results › Numbers); (2) the **trend** (FC-117) — from eight readings of
one line and one measure: Mann–Kendall's S and p, Sen's slope per week, the runs about the median, said in words with whether it is the right way for this
measure (`lib/measureProof numberTrend`), under the line's chart on screen, and **on the client report's paper** (the 6M client report under its chart, and
the A3 under its chart); (3) the **proof at a change** (FC-201) — the readings before and after a day the change landed, counted, both means, the change,
and Welch's one-sided t, with a verdict that is allowed to say *no* or *worse*, frozen when a win is called (`lib/measureProof numberProof`,
`screens/WinProofSheet`, the Wins and their paper); (4) the **method page**: a project's row for FC-117 and FC-201 (the A3's Target, the Kata's challenge, the Kaizen
event's 30-day check) says what the project holds — the measure, how many readings, the latest, the trend — and opens its Results. What it deliberately does not
cover: **a moving average line** on the chart (the entry names it; the trend is read by Sen and Mann–Kendall, and no average is drawn — **FC-117 stays partial for it**);
**a control chart of the number** (FC-086, its own tool, on the capability and chart tools' readings); **a day found for the change** from the project's closed
actions (an action's `doneOn` is used by `lib/impact`, the sheet takes a chosen day); **a forecast** (the trend says the rate so far, never where it will be);
**any figure from a machine**: every reading is typed by a person; **any AI**. The money of a number is the tool it comes from (`knowledge/MONEY.md` §4: FC-117 and FC-201
carry none of their own).

## 2. Users and scenarios
**Who:** the team lead recording Monday's number; the A3's owner writing its Target; the Kata coach asking *what is the actual condition now?*; the Kaizen team at
its 30-day check; the sponsor reading the client report. At a desk and on a phone.

**Scenarios, food first.** (1) *A packing line's weekly rate.* Eight weeks of 42 41 35 47 44 46 49 52 packs a minute: "rising about 1.6 ppm a week … the right way" under
the chart, on the client report and on the A3. (2) *A changeover fixed in week five.* The team calls the win: 41.8 → 49 ppm, +17.2%, "Proven — could come up by
chance about 2 times in 100"; it is frozen, so a bad week later cannot rewrite last month's claim. (3) *A Kata project at its first coaching session.* The row for
FC-201 on *Understand the direction* says "Rate: 8 readings, latest 52 ppm; rising about 1.6 ppm a week — the right way", and opens the page where it is recorded.

## 3. Method selection
Run chart reading (Montgomery & Runger): the points in time order, with the trend by **Mann–Kendall's S** (no shape assumed; robust to one bad week), its slope by
**Sen** (the median of the pairwise slopes), and the **runs about the median** (a shift or pattern the slope alone would miss) — `stats.time-series-trend`. The
change by **Welch's two-sample t** (unequal variances), asked one-sided in the direction good is (`stats.two-sample-tests`). **Alternatives considered** (the
records' *When not to use it*): a control chart for a number whose limits are wanted → FC-086; a designed before/after with randomisation → FC-105 (the analysis
tool, on its own readings); least-squares for the slope (rejected: one outlier week moves it). **Unsuitable when:** fewer than eight readings (no trend said, and
the page says it needs eight); fewer than three on a side (the change is arithmetic, not a test — said); a series with strong seasonality or autocorrelation (the
page says "a number, not a prediction"); a measure whose direction was set wrong (the direction is the owner's, agreed on Setup).

**Established · assumed · chosen.**
- *Established:* Mann–Kendall S = Σ sign(xⱼ − xᵢ) over i < j, its variance n(n − 1)(2n + 5)/18 less the ties' term, the normal approximation with continuity correction (Mann 1945; Kendall
  1975); Sen's slope as the median of (xⱼ − xᵢ)/(j − i) (Sen 1968); the runs about the median and its critical counts (Swed & Eisenhart 1943); Welch's t and the
  Welch–Satterthwaite degrees of freedom (Welch 1947) — all from knowledge, texts not re-read, as the records say; each checked here against the independent cases of §6.
- *Assumed:* a reading is a day and a number typed by a person; weeks nobody measured are simply absent; two readings on one day — the later is the latest.
- *Chosen (Faultline's own, since 24 October, kept):* the trend reads **from eight readings** (`TREND_FROM`); significance at **p < 0.05**; a change smaller than
  **1.5%** is "no material change", a worse change is shown as loudly as a win; fewer than **two** readings a side is not compared, fewer than **three** is untestable and
  said so; "a week" is said when the readings are 5–9 days apart, else "a reading". **Chosen here:** the trend sentence on paper is the screen's, word for word (one
  module); on the A3 it takes up to four lines of 6.5 pt from the plot's height rather than crossing it; the method row says the lead measure (the first by its order), the
  line with the most readings, and the trend from eight of that line.
- *Money:* none of its own (`knowledge/MONEY.md` §4: FC-117 "the number's £ by the tool it comes from, if it has one"; FC-201 as FC-117).

## 4. Inputs
Typed on the project (owner sets the measures, targets and periods — `can.agree`; the team records readings — `can.edit`; deleting is the owner's — `can.remove`): a
measure (name, unit, which way is good), a period and a target per line, a reading (day, number, an optional note). Counted rather than typed where the app has the
count: a shift's counted rate is offered as a reading (`CountedOffers`, FC-049). The change's day is chosen on the proof sheet from the days that leave at least two
readings a side.

## 5. Data suitability
Eight readings of one line and one measure for a trend; two a side to compare; three a side to test. Every figure carries its count (*8 readings*, *5 before · 3
after*). Under the minimum the page says what is needed, never a figure from too little: *"a trend needs 8 readings of one line"*, *"Fewer than three readings one
side — the difference is real arithmetic, but too few to test."*

## 6. Calculations
Trend: `S = Σ_{i<j} sign(x_j − x_i)`; `Var(S) = n(n − 1)(2n + 5)/18`; `z = (S − sign(S))/√Var(S)`; `p = 2(1 − Φ(|z|))`; `Sen = median_{i<j} (x_j − x_i)/(j − i)`; runs about the
median counted on the values above and below it. Proof: `d = mean_after − mean_before` (sign flipped for a measure that should fall); `change% = d/|mean_before| × 100`;
`t = (x̄_a − x̄_b)/√(s_a²/n_a + s_b²/n_b)`, `df` by Welch–Satterthwaite, `p` = one-sided in the good direction; verdict: *worse* at ≤ −1.5%, *no change* inside ±1.5%,
*proven* when better and p < 0.05, else *not yet proven*.

**Independent worked cases** (`scripts/knowledge/cases-kaizen.py` section P — a second implementation: the t distribution by the incomplete beta function, checked against the
t table at df 10 and 4; Kendall's S, Sen and the runs worked by hand; and SciPy's `kendalltau` in `cases-w2.py` for the twelve-week series), held as literals in
`src/lib/__tests__/weeklyNumber.test.ts` and `numberTrend.test.ts`:

| case | readings | result |
|---|---|---|
| A — five weeks before, five after | 42 41 35 47 44 · 46 49 52 53 50 | means 41.8 → 50, Welch t 3.5157, df 6.660, one-sided p **0.005304**, +19.617%, proven; for a falling measure the same weeks: p 0.994696, worse |
| B — the eight weeks cut after week 4 | 42 41 35 47 · 44 46 49 52 | 41.25 → 47.75, t 2.15178, df 5.415, p **0.03993**, +15.758%, proven |
| C — cut after week 5 | 42 41 35 47 44 · 46 49 52 | 41.8 → 49, t 2.73308, df 5.747, p **0.01779**, +17.225%, proven |
| D — the eight-week trend | 42 41 35 47 44 46 49 52 | S 18, Sen **1.6333** a week, Mann–Kendall p **0.0354** (z 2.1032), median 45, runs **4** |
| E — twelve weekly reject rates | 2.1 2.3 1.9 2.4 2.2 2.6 2.5 2.8 2.7 3.0 2.9 3.2 | Sen 0.1, τ 0.788, p < 0.001, rising |

**Sentences** (the module's `lib/measureProof`, read by the screen, both papers, the method row and the acceptance script): the trend — "*Trend over 8 readings: rising about
1.6 ppm a week (Sen), Mann–Kendall p 0.04 — the right way for this measure. Runs about the median: 4 — too few readings for the runs to say a pattern.*"; the proof — "*41.8
→ 49 ppm · +17.2% · 5 before · 3 after*"; the row — "*Rate: 8 readings, latest 52 ppm; rising about 1.6 ppm a week — the right way.*" (nothing set: "*No measure set yet — the
project's owner sets what the team's number is on its Setup.*"; under eight: "*Rate: 1 reading, latest 42 ppm; a trend needs 8 readings of one line.*").

## 7. Outputs
On screen: the line's chart with the trend sentence in its tone (green the right way, red the wrong way, amber a pattern the slope missed; always in words) on a line's Numbers
and the client report's page; Results › Wins with the proof sheet (the weeks cut where the change landed, the verdict, "by chance about N times in 100", Call it);
the method page's row. Only the abnormal wears colour; a flat number is plain.

**The report.** The **6M client report's paper** (the full report) prints, under each line's chart in *The gap*, the trend sentence — the screen's, word for word — in its tone;
the **A3** (the lever-tree and board client report) prints it under the plot, taking the room it needs from the plot's height; a called win's proof sentence prints with the
win on the A3's wins (before → after, with both counts and its verdict). Under eight readings nothing is printed and nothing moves. Light page, the lean page's order (the
gap, then the trend under it, then the problems); nothing is made up, a missing measure is said.

## 8. Manufacturing usability
Recording a reading is the Numbers panel's *Record a reading* (a date defaulting to today, a number, a note). The trend needs no tap: it is under the chart. Calling a win is
*Log a win › Prove it from the readings › a day › Call it*. On the phone the sentence wraps under the chart and the proof sheet's chips are 48 px.

## 9. Failure handling
No measure: said on the row and the page, with who sets it. No reading: *no reading recorded yet*. Under eight: the trend says what it needs; under two a side: not compared; under three: not tested,
said. A reading struck or deleted is not counted (the owner deletes). A client reads the numbers, the trend and the papers and records nothing. A measure whose direction is wrong
reads every win as a loss — the owner's to set, said on Setup (`lib/measures` "which way is good is part of the measure").

## 10. Integration
Reads and writes nothing new: a project's `measures`, `periods`, `targets`, `readings` and a win's `proof` receipt are the existing records (no migration). Shows wherever the number
shows: a line's Numbers (project line page), the project's Results, the Wins, the 6M client report and the A3, a method project's *Tools* rows (the A3's Target, DMAIC's Measure, the
Kata's challenge, the Kaizen event's Sustain) via `project/method/MethodScreen`. `docs/PAGES.md` already lists the trend on a line's page; the method row is on the method page's section list.

## 11. Verification
Unit: `src/lib/__tests__/weeklyNumber.test.ts` (cases A–D, the minimums, the row's sentence), `numberTrend.test.ts` (case E, flat, step), `paceReportPdf.test.ts` (the A3's trend
sentence from eight readings, none from seven), `sixmReportPdf.test.ts`. Acceptance: `scripts/acceptance/weekly-number.mjs`.

**Acceptance criteria.**
1. Sen 1.6333, p 0.0354 and 4 runs for the eight weeks; eight and under-eight; flat; the step — *proved by* `weeklyNumber.test.ts` (`the weekly number, trended`) and `numberTrend.test.ts`.
2. Welch's t, df, p and the change for cases A, B and C; the direction decides; fewer than two or three a side — *proved by* `weeklyNumber.test.ts` (`proved at a change`) and read back from the
   page by `weekly-number.mjs` step 2 against p 0.03993 and 0.01779.
3. The trend sentence is on the line's Numbers as the module says it, right-way tone, only the measure with eight readings — `weekly-number.mjs` step 1.
4. The proof sheet cut after week 4 and after week 5 says the independent sentences and badges, Call it freezes them onto the win — `weekly-number.mjs` step 2.
5. The 6M client report's paper and the A3, downloaded and read back, carry the trend sentence under the chart — `weekly-number.mjs` step 3 (and `paceReportPdf.test.ts`).
6. A Kata project's FC-201 row and an A3 project's FC-117 row say "No measure set yet …" with none, the latest and the trend from eight readings, and a tap opens Results — `weekly-number.mjs` step 4.
7. The phone (390): nothing off the side — `weekly-number.mjs`.
8. Existing behaviour unchanged: the Numbers panel, the Wins, the chart, the papers' other blocks and page counts — `paceReportPdf.test.ts` (the footer arithmetic), `measures.test.ts`.
Not yet proved: the full gate and the paper-parity comparison (the A3's and the 6M report's chart blocks changed on purpose, so a comparison with live will flag them as changed); a moving average
(not built).

## 12. Maintainability
`src/lib/measures.ts` (the record), `measureProof.ts` (the trend, the proof, the row's sentence — one module), `screens/NumbersPanel.tsx`, `screens/WinProofSheet.tsx`, `lib/sixmReport.ts` +
`sixmReportPdf.ts` and `lib/paceReportPdf.ts` (the papers), `project/method/MethodScreen.tsx` (the row). Left for later, each with its number: a moving average on the chart (**FC-117**, entry says so);
a change's day found from the project's closed actions on the proof sheet; the trend on the line's one-page report and the combined report (they carry the line's own tiles); the number's control
chart (**FC-086**); a forecast.
