# FC-119 — Is the gauge fit? The Type 1 study, bias and linearity, stability (W3c, builder F3)

**Catalogue:** FC-119 Type 1 gauge study (the kind) · FC-120 bias, linearity and stability of a gauge
(a mode of it). **Knowledge:** `msa.type1-gauge`, `msa.bias-linearity-stability`. **Programme:**
`docs/TOOLS-BUILD.md` W4 (the gauge) — FC-119 and FC-120 are plain readings studies and go first; the
designed-run studies (gauge R&R FC-118, attribute agreement FC-121) are a later wave. The same tool,
record and page as W3a/W3b (`knowledge/specs/FC-105-analysis.md`, `FC-107-groups-tables-relations.md`):
`tool: 'analysis'`, `agreed.analysis`, readings in `facts.readings`. **Asked for:** Rowland, 25 October
(`docs/TOOLS-BUILD-BRIEF.md`): *"go through everything … return to me when everything's completed and
functional inside the app"*; his judgement calls are the builder's, written down here. **Written 25 October
2026, builder F3, before the page was built** (the arithmetic, `lib/ie/gauge`, was proved first).

## 1. Purpose
"Nobody knows if the checkweigher is fit for the tolerance it judges." Before a capability study, a control
chart or an acceptance test is believed, the instrument that took the readings is measured. Three questions,
one for each way an instrument lets a floor down: does it **repeat** (the same reference read again and
again — the Type 1 study); does it **read true across its range** (a bias that changes with the size, so one
offset will not fix it); does it **hold over time** (the daily check weight that has crept). The sentence it
lets one side say to the other: *"The bench scale repeats to 0.07 g and reads 0.11 g high against the 500.0 g
test weight: Cg 4.5, Cgk 4.0 against 1.33 — fit for a 10 g tolerance, using 4% of it."* Or: *"The probe reads
0.16 °C low at 0 and 0.16 °C high at 80: at the 75 °C limit a reading of 75.0 means product at 74.87."*

**Scope.** This build adds one question to the Analysis tool's picker, **Is the gauge fit**, with three ways
of checking: **one reference, read again and again** (Type 1: the mean, the spread, the bias with its
interval and its t test, Cg and Cgk, the share of the tolerance the gauge's 6s uses, the least count against
the tolerance) (FC-119); **references across the range** (the bias at each reference with its t test; the
line of bias on the reference with its slope's interval; the bias at the limit that matters and the true value
a reading of it means) and **one reference, checked day after day** (an individuals chart of the checks with
limits from the first N, the four Western Electric signals, the first check that signals, the trend by
Mann–Kendall and Sen's slope) (FC-120). Confidence 90 · 95 · 99% as W3a. **Not in this build:** the
repeatability and reproducibility of several operators on several parts, blind and randomised (gauge R&R,
FC-118 — the designed run, a later wave); inspectors judging pass or fail (FC-121); the uncertainty statement
for a certificate (FC-123); the calibration register and its due dates (FC-122); the checkweigher's own
verification rules (FC-164 — the test packs and the reject confirmed); any claim that a reference is itself
traceable (it is said, not checked); carrying a gauge's record to every study that names it ("measured with a
gauge that uses 4% of the tolerance" — the record's *In Faultline* idea; there is no gauge noun, and
BLUEPRINT §2 would change first); a bias applied to the readings of another study (a guard band offered to
the CCP check or the capability study — said in words on the page, never done to a figure).

## 2. Users and scenarios
The quality technician at a bench or a line with a phone; the ops lead at a desk deciding whether a number
can be trusted. (1) A bench scale used for give-away checks, a 500.0 g test weight read 50 times; tolerance
10 g (495–505). (2) The same scale after a year, worn: 30 readings on the same weight spread over 6 g. (3) A
CCP probe thermometer at 0, 20, 40, 60 and 80 °C, ten readings each, and a cook limit at 75 °C. (4) The daily
check weight on a checkweigher, 25 days, the last seven all high.

## 3. Method selection
The records: **Type 1** — the bench study of one reference, one operator, one day: Cg = (0.2·T) ÷ (6s) and
Cgk = (0.1·T − |x̄ − x_ref|) ÷ (3s), wanted at 1.33 or more, with the t test of the bias and the least count
against the tolerance; **bias and linearity** — the biases at several references regressed on the reference,
the slope's p (AIAG MSA, ch. III); **stability** — the reference's readings in time on an XmR chart, limits
from the first steady points. Alternatives (the record's *When not to use it*): several operators or parts →
gauge R&R; pass or fail by eye → attribute agreement; a certificate's uncertainty → the GUM budget. The page
refuses to call a Type 1 study a gauge R&R: it says one reference, one operator, one day.

**Established · assumed · chosen.**
*Established* (textbook / practice, with the independent cases of §6): the sample mean, s (n − 1) and the
Student t interval and test of a bias; Cg and Cgk as the automotive practice defines them (VDA volume 5; Bosch
booklet 10; Minitab's Type 1 study — **the texts were not read**, `knowledge/GAPS.md`); least squares of bias on
reference with the slope's t interval; the individuals chart's limits x̄ ± 2.66 MR̄ and the Western Electric
rules (`lib/ie/charts`, W2); Kendall's τ and Sen's slope for the trend.
*Assumed* — one operator, same place and conditions; the reference's own error far smaller than the gauge's
(said on the page, not checked); the readings independent (checked from 30 by r₁, as W3a); the bias constant
within a reference; stability judged on a reference that does not itself change.
*Chosen by Faultline* (the builder, 25 October — the owner asked not to be asked; each is changeable on the
agreement and said where the result is read): **the 20% slice, the 1.33 threshold and the 5% least count**
are the record's automotive conventions taken as defaults, not laws — a food line may agree 30% and 1.0 for a
non-critical check, written down with the reason; a Type 1 is read from **10** readings and called firm from
**25** (the record: 25 to 50); a reference is read from **5** readings and called firm at **10**; a line of bias
needs **4** references (the record says five; the line and its p are shown from four and said weak under five);
the **line is fitted to each reference's mean bias, as the record does**, not to every reading (the AIAG form
regresses all 50 individual biases and gives p = 8.3 × 10⁻⁸ on the record's probe against 0.0074 for the means
— it treats the repeats as independent points; the means are the cautious choice); a stability chart's limits
come from the **first 20 readings** unless agreed otherwise, never from fewer than 8, and a signal inside that
baseline is said (its limits come from a period that was not steady); a one-sided tolerance is **twice the
distance from the target to the limit** (the record's wording) and asks for the target; the **money** (below).
*Money* (`knowledge/MONEY.md`, FC-119/120: "a bias on a checkweigher → give-away or illegal packs", causation
M): only for a gauge in grams or kilos, only where the bias is real. A gauge that reads **low** by b gives
packs set by it b more than they read — give-away of b × packs a shift × £ a kilo; a gauge that reads **high**
makes packs b lighter than they read — **short weight, which is not a saving**: said, never priced. The inputs
(packs a shift, shifts a week, £ a kilo) are optional boxes on the agreement; where one is missing the page says
which ("give the packs a shift to say it in money") and nothing waits; a probe or any non-weight gauge has no
money of its own and says nothing about it.

## 4. Inputs
*Agreed before measuring* (the agreement card, by the project's owner): the gauge's name ("Bench scale") and
unit; **how it is checked** — one reference read again and again · references across its range · one reference
checked day after day; for the first and the third the **reference's true value**; the **tolerance of what it
judges** — a lower and an upper limit (or one limit and the target it is measured from) — required for the Type 1
study, optional for the others (it gives the bias a size against the tolerance); for the range, the **limit that
matters** (optional: where the bias is read off the line); the slice (default 20%), the Cg wanted (default 1.33),
the least count (optional: otherwise the smallest step the readings show); for stability, how many first checks
the limits come from (default 20); packs a shift, shifts a week and £ a kilo (optional); the confidence. *Measured:*
a reading (the pad, or a pasted column); for the range each reading is typed against its **reference** (a chip a
reference, a new one by its value). A struck reading is kept and left out. Nothing is read from a machine.

## 5. Data suitability
A Type 1 from 10 readings (figures), firm from 25; the least count from the readings' own steps unless typed;
independence checked from 30 by r₁; any reading beyond the fences flagged and kept. A reference counts from 5
readings; a line of bias from 4 references; a stability chart from 8 readings, firm from 20, limits from the
baseline agreed. **Refused, in words:** no tolerance for a Type 1 (the index is meaningless without it); a one-sided
limit without its target; a tolerance of zero or backwards; every reading the same (no spread, so no index —
and a bias is then simply the difference, said as exact only if the gauge could show finer); a reference that is
not a number; a stability baseline longer than the readings. **Said, not refused:** a Type 1 study from fewer
than 25 readings is rough; a reading step over 5% of the tolerance is too coarse; a baseline that was not steady.

## 6. Calculations
Every figure below was printed by NumPy/SciPy, never by Faultline (`scripts/knowledge/cases-w3c.py`, run with
`python3 -I`), and each is a unit test (`src/lib/ie/__tests__/gauge.test.ts`).
- *Type 1, the record's bench scale* (50 readings of a 500.0 g reference, T = 10 g): mean 500.1124, s 0.073417,
  bias +0.1124 (95%: 0.09154 to 0.13326), t 10.8257, p 1.35 × 10⁻¹⁴, Cg 4.5403, Cgk 4.0300, 6s = 4.405% of T,
  the readings step by 0.01 g (0.1% of T).
- *A worn scale* (30 readings, same reference and T): mean 500.8833, s 0.99346, bias +0.8833 (p 3.6 × 10⁻⁵), Cg
  0.3355, Cgk 0.0391, 6s = 59.6% of T — not fit.
- *Bias and linearity, the record's probe* (references 0, 20, 40, 60, 80 °C, ten readings each): biases −0.159,
  −0.037, −0.047, +0.095, +0.156 (the first, fourth and fifth real: t = −3.054, 3.410, 4.519 against 2.262); the
  line of bias on reference −0.1508 + 0.00381 × reference, R² 0.9334, slope p 0.007445, 95% 0.001940 to 0.005680;
  at 75 °C the line gives +0.13495, so a reading of 75.0 means 74.86505.
- *Stability, 25 daily checks of the 60 °C reference, limits from the first 18*: centre 60.0861, MR̄ 0.068235,
  limits 59.9046 to 60.2676; checks 19 to 25 are beyond; Kendall's τ 0.3838 (p 0.0081 asymptotic, 0.0087 with the
  continuity correction), Sen's slope 0.012426 a check.
Rounding: indices to two places, biases to the readings' places plus one, p as W3a (`pSay`).

## 7. Outputs
The page is W3a's lean page: the band (the question and its verdict), tiles, the sentence with what follows,
the picture, the entry, the checks, the readings, Agreed, the action plan, the closing line.
*Type 1:* tiles **Readings** (of 25) · **Bias** (± its interval) · **Cg** · **Cgk** (each against its need) ·
**Uses of tolerance** (6s ÷ T) · **In money**. The sentence: fit — "Bench scale: Cg 4.54 and Cgk 4.03 against 1.33 —
fit for a 10 g tolerance: its spread (6s = 0.44 g) uses 4.4% of it. It reads 0.112 g high (we can be 95% confident
between 0.092 and 0.133 g) — a real bias, small against the tolerance; correct it at the next calibration." Biased
— "repeats well (Cg 4.5) but reads 1.01 g high: the bias leaves Cgk at 0.0 — correct it before it judges anything".
Not fit — "not fit for a 10 g tolerance: its spread (6s = 6.0 g) uses 60% of it, more than the 20% it may; Cg 0.34
and Cgk 0.04 against 1.33 — repair or replace it before any study that depends on it". Tones: fit **green**, biased
**amber**, not fit **red** (a failure), too few neutral. The picture: each reading's distance from the reference on
a zero line, the mean bias with its interval, the gauge's 6s beside the slice of the tolerance it may use.
*Range:* the references table (reference, readings, mean, bias, t, p, real or not), the scatter of every reading's
bias against its reference with the line and the band of its own interval; "The probe reads 0.16 °C low at 0 and
0.16 °C high at 80 — the bias changes with the reference (slope 0.0038 per °C, 95% 0.0019 to 0.0057; p 0.0074): one
offset will not fix it. At 75 °C, the limit that matters, the line gives +0.135 °C: a reading of 75.0 means product
at 74.87." Verdicts: *Reads true* (green; no bias real at any reference), *One offset fixes it* (amber; real, no
slope), *The bias changes with size* (amber), *Too few references for a line* (neutral, the biases shown).
*Stability:* "Checked 25 times against 60.0: the first 18 put the limits at 59.90 to 60.27 (centre 60.086, 0.086
above the reference). From check 19 it is above the upper limit — 7 checks in a row: it has drifted up. Product
measured since check 18 is worth reviewing." Verdicts *Steady* (green) and *Drifted from check N* (red), with the
chart (the readings, the centre, the limits as a band) and the trend. Money as §3.
**Never claimed:** that a Type 1 passing means the gauge is fit for all use (one operator, one reference, one day —
gauge R&R, operators and parts, is a separate study); that the reference is right; that a bias on a probe at a CCP
is "within tolerance" so the check may stand — a bias at a CCP limit is a food-safety matter whose guard band the
team applies (the page says the true value, it does not move the limit); a drift's cause.

**The report.** The paper (`src/lib/studiesPdf.ts` analysisBlocks on the report engine, as W3a): the band, the
tiles, the sentence and what follows, the picture drawn (the lanes; the scatter with its line and band; the chart
with its limits), the table of references, the checks, the agreement in words (the tolerance, the reference, the
slice and the need), every reading (a reading with its reference on a range study). It reads the same module as
the screen; a missing input is named, not invented.

## 8. Manufacturing usability
On a phone beside the bench: pick the question, name the gauge, say the reference and the tolerance, then the pad —
a reading, Enter, the next. A pasted column for fifty readings. The range study's chips are the references, a new
one by its value. Taps from the front door to an answer: pick the question, agree four boxes, type or paste, read.
The lean page's order; the sentence first, the picture beside the entry.

## 9. Failure handling
Too few readings, no tolerance, a one-sided limit with no target, a zero or backwards tolerance, every reading the
same, a reference with too few readings, under four references, a baseline longer than the readings, pasted text
that is not numbers (listed, not dropped): each said with what is needed, no verdict. A struck reading kept and
left out. A client reads, may not type (`can.edit`). A study from before has no gauge agreement: it is not offered.
Misuse refused in words: a percentage tolerance in a different unit from the readings; a gauge R&R sentence.

## 10. Integration
The record: a `ToolStudy` (`tool: 'analysis'`), `agreed.analysis.kind: 'gauge'` with a `gauge` object
(`mode`, `reference`, `lower`, `upper`, `target`, `limit`, `slice`, `need`, `resolution`, `baseline`, `packsPerShift`,
`shiftsPerWeek`, `costPerKg`); readings in `facts.readings` — a reading's `value`, and on a range study `with`, the
reference it was read against. **No new noun; no new table; no migration** — the agreement and the readings are the
existing jsonb and `'analysis'` is already allowed by `supabase/ANALYSIS.sql`. Where it shows: wherever the Analysis
shows (Tools of every scope, the line page's tool cards, the studies' list and its paper, the directory, Line Talk's
knowledge of the line). Access: `can.edit` to type, `can.agree` to change the agreement, `can.remove` to delete.
`docs/PAGES.md`, `scripts/inventory/pages.mjs`, `scripts/smoke.mjs`, the paper-parity script, the seed
(`src/dev/seed.ts`).

## 11. Verification
The unit tests on the independent cases (`src/lib/ie/__tests__/gauge.test.ts`; `src/tools/analysis/__tests__/
analysisGauge.test.ts` for the sentences, tones and refusals); the acceptance script
`scripts/acceptance/analysis-gauge.mjs` driving each way of checking on the page against the module and reading the
paper back; the inventory and the compare; the gate line.

**Acceptance criteria.**
1. Every figure of §6 is reproduced by `lib/ie/gauge` — Type 1's mean, s, bias with its interval and t, Cg, Cgk and
   6s ÷ T; the least count; the tolerance from two limits and from one limit with its target; the bias at each
   reference with its t; the line of bias on reference with its slope's interval and p; the bias at the limit; the
   individuals chart's limits, the signals, the first signal after the baseline, the trend — `gauge.test.ts`.
2. The sentences, tones and refusals (§5, §7, §9) are the module's — `analysisGauge.test.ts`: fit, biased, not fit,
   too few, no tolerance, a one-sided limit with no target, every reading the same, a coarse step; the range's four
   verdicts and the limit outside the references; steady, drifted, a baseline that was not steady; the money for a
   low-reading scale with every input, with one missing, for a high-reading scale (short weight, no pounds) and for
   a probe (nothing).
3. The page, way by way (`analysis-gauge.mjs`): *one reference read again and again* — the record's fifty readings
   pasted, the tiles, the sentence (Cg 4.54, Cgk 4.03, uses 4.4%), the lanes, the checks; the worn scale amber/red as
   the module says; the slice and need changed on the agreement and the numbers moving; *references across the range*
   — five references typed by chip and pasted, the table, the scatter with the line, the sentence, the true value at
   75; *one reference checked day after day* — 25 checks, the chart with its limits, "from check 19", the trend.
4. Money (`analysis-gauge.mjs`): a low-reading scale with packs a shift and £ a kilo said in pounds with its because; a
   missing input named; a high-reading scale says short weight and no pounds.
5. Persistence and where it shows: reload keeps every way; the question is on the picker (nine questions); the list
   row says what was typed (`analysis-gauge.mjs`).
6. The paper for each way downloaded and read back — the sentence, the figures, the references table, the checks, the
   agreement, every reading — and the list paper (`analysis-gauge.mjs`, `report-stress.mjs`).
7. The phone: nothing off the side, the pad's keys big enough, the pictures inside (`analysis-gauge.mjs`).
8. The directory and the catalogue: FC-119 and FC-120 *available* — `catalogue.test.ts`.
9. `docs/PAGES.md` has the new question on the Analysis page; the inventory is green; `--compare` against live shows
   nothing moved elsewhere.
10. Existing behaviour unchanged: `analysis.mjs` and `analysis-relations.mjs` still pass with the picker at nine.
11. The gate.

*Not yet proved:* use at a real bench with a real test weight; the defaults chosen in §3 have not been put to Rowland
one by one; VDA 5's constants against the text; the client's read-only view of this question.

## 12. Maintainability
`src/lib/ie/gauge.ts` holds the arithmetic and is shared with nothing else; the tool's `analysis.ts` gains one kind
and the screen its entry, as `kind` is a union and the picker a list. Left for later, each with its number: gauge R&R
and the designed run (FC-118), attribute agreement (FC-121), the calibration register that would own the gauge's
record and its due dates (FC-122), the checkweigher's own verification (FC-164), the uncertainty budget (FC-123), a
gauge's record carried to every study that names it (needs a gauge noun: `docs/BLUEPRINT.md` §2 first).
