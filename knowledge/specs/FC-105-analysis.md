# FC-105 — Analysis: how sure, did it change, do two ways agree, how many readings (W3a)

**Catalogue:** FC-105 before and after (the tool's centre) · FC-103 describing
readings (a part) · FC-104 how sure — intervals (a part) · FC-106 paired
comparison (a kind) · FC-113 how many readings (a kind) · FC-020 how many cycles
to time (a mode of the same kind) · FC-115 readings that depend on the last (a
check). **Knowledge:** `stats.descriptive`, `stats.confidence-intervals`,
`stats.two-sample-tests`, `stats.sample-size-power`, `stats.autocorrelation`,
`ie.time-study`. **Programme:** `docs/TOOLS-BUILD.md` W3, slice a (W3b: groups,
counts, relations — FC-107/108/109/110; W3c: shape, stack-up, experiments —
FC-114/116/111). **Asked for:** Rowland, 23–24 October — build every planned
tool; every finding in money where it has one, never a figure invented.
**Written 24 October 2026, before any code.**

## 1. Purpose
Four questions every study and every fix raises and the floor answers with a
single number: *how sure are we of this figure?* (a mean from thirty packs, a
reject rate from one run, a stop rate from one week), *did it really change?*
(before and after a fix, a re-calibration, new film), *do two ways of measuring
the same thing agree?* (two checkweighers, a scale and the lab) and *how many
readings do we need to find out?* (asked before the study, not after). Each
is answered in words with its figure and its margin. The sentence it lets one
side say to the other: *"1.17% fell to 0.40% — we can be 95% confident it fell
(p = 0.006). What moved it is the fix's to say."*

**Scope.** This build covers: a new tool, **Analysis** (`tool: 'analysis'`,
kind *study*, listed under the scope's *Tools*), its record one `ToolStudy`
holding the readings or the counts; the question asked first — **How sure**
(a mean from measured readings with its spread, a share counted, a rate counted
per hour) (FC-104), **Did it change** (measured before and after: Welch's t and
Mann–Whitney; counted before and after: two proportions by z and Fisher's
exact) (FC-105), **Do two ways agree** (pairs: the paired t and Wilcoxon's
signed-rank) (FC-106), **How many readings** (a mean within ±e, two means
differing by δ at a power, a share within ±e, two shares, the zero-failure
count, and the cycles to time) (FC-113, FC-020); describing the readings — the
mean, median, spread, quartiles, lean, the histogram, anything beyond the
fences flagged for a look (FC-103) on the Analysis page and as a line under the
capability study's histogram; the check that readings in order are not too close
to the last — lag-1 autocorrelation against 2 ÷ √n with the interval to sample
at, on the Analysis page and in the capability study's notes (FC-115) — *not* on
the control chart: a step or a drift, which is what a chart is there to find,
shows as dependence on the one before, so there the check would say something
false (the record's own caution; a chart that reads steady for 30 or more is the
case to add it to, and is left for a follow-up); the paper for each kind. **Confidence** is said in the language
throughout (FC-100's choice): 90 · 95 · 99%, default 95%.
Not in W3a: several groups, counts in a table, relations and regression (W3b,
FC-107/108/109/110); fitting a distribution, stack-up and factorials (W3c,
FC-114/116/111); power after the fact from an observed difference (circular —
refused, see §5); a test applied inside every study's "before → after" line
(FC-105 stays *available* for the tool, and the studies' own line is left as it
is, said under *Limits*); anything read from a machine (never).

## 2. Users and scenarios
The ops lead at a desk or in the meeting; the shift lead on a phone beside the
line. (1) A week's reject count: 7 rejected in 600 packs — *how sure is 1.2%?*
(0.47–2.39%, 95%). (2) A re-calibrated weigher: twelve fill weights before, twelve
after — *did it move?* (−0.50 g, 95% sure −0.76 to −0.24, p = 0.0006). (3) Two
checkweighers on the same twelve packs — *do they agree?* (the second reads
0.39 g high, 0.26–0.53, every time). (4) Before a shift study — *how many packs
to see a 0.5 g difference between shifts?* (52 from each, 80% power). All four
are one-hand entries: a pad, or a pasted column.

## 3. Method selection
The record for each: **Mean** — Student's t interval; **spread** — the χ²
interval; **share** — Clopper–Pearson exact (the interval shown) with Wilson's
beside it when the count is large; **rate** — Poisson by χ². **Change, measured**
— Welch's t (unequal spreads, no assumption of equal), the difference with its
interval, the Mann–Whitney U beside it always and *leading* when the readings
are not bell-shaped (D'Agostino–Pearson from 20 readings in a group, else the
Mann–Whitney is shown as a check and the t leads); **change, counted** — the two
shares each with an interval, the pooled z, and Fisher's exact test, which leads
when any expected count is under 5 (and the z is shown with a note). **Paired**
— the paired t on the differences, Wilcoxon's signed-rank beside it, leading
when the differences are not bell-shaped. **How many** — the record's formulas:
n = (t·s ÷ e)² solved for the t of the n it gives (Student's t, not the normal's
z — the record's worked 35 is the normal's, 38 with t; both are shown, the t one
leads), power from the noncentral t, the record's proportion formulas, the
zero-failure count `ln(1 − C) ÷ ln(1 − p₀)`, and for cycles n′ = (t·s ÷ (k·x̄))²
by the same solve. **Autocorrelation** — r₁ = Σ(xₜ − x̄)(xₜ₊₁ − x̄) ÷ Σ(xₜ − x̄)²,
dependence when |r₁| > 2 ÷ √n, from 30 readings in order; the interval to
sample at is the smallest m (2, 3, …) at which the series thinned by m has its
own r₁ inside the band, with at least 10 readings left.

**Established · assumed · chosen.**
*Established* (textbook, with the independent cases of §6): the t, χ², exact
binomial, Wilson, Poisson, Welch–Satterthwaite, Mann–Whitney, Wilcoxon, pooled-z,
Fisher, noncentral-t and sample-size formulas (Montgomery & Runger; Clopper &
Pearson 1934; Wilson 1927; Welch 1947; Mann & Whitney 1947; Fisher 1935), the
lag-k autocorrelation (Box, Jenkins & Reinsel) and the 2/√n band.
*Assumed* — readings independent (checked by r₁ where they are in order),
measured the same way before and after, drawn from the same process state; a
paired set is the same items. Normality is *checked, not assumed*: the leading
test follows it. *Chosen* by Faultline (not the textbooks'): two-sided tests
always — the direction that is *better* (lower, higher, no view) is asked and
used for the words (*the right way* / *the wrong way*) and the tone, never to
halve a p-value; the Mann–Whitney is exact up to 20 readings a group with no
ties and the normal approximation with the tie and continuity corrections
otherwise (SciPy's asymptotic form); Wilcoxon exact up to 25 pairs with no zero
differences or ties, else normal with the corrections, zero differences dropped
(Wilcoxon's own treatment); the quartiles by linear interpolation (type 7);
outliers flagged beyond 1.5·IQR and never removed; the minimum of 8 readings
for any interval on a mean (fewer: the count is said, the interval refused);
power 80% default, 90% offered; confidence 95% default. Not yet put to Rowland
one by one: the 80% power default and the 20-reading floor for choosing the
Mann–Whitney.

## 4. Inputs
*Agreed before measuring* (the agreement card): the question (`kind`), a name
and unit, the confidence (90 · 95 · 99%), for **change** which way is better and
whether it is measured or counted, for **paired** the names of the two ways, for
**how sure** whether it is a mean, a share or a rate. *Measured*: a reading (a
pad, or a pasted column — numbers separated by lines, spaces or commas); for
**change** the arm it belongs to (Before · After, two pads); for **paired** the
pair (first, second) typed as two boxes, Enter moving on; for counted a run
(made, rejected, with the arm) or a rate's count and hours; a struck reading is
kept and left out. For **how many** nothing is measured: the guess of the
spread (or readings to take it from — a pilot of at least 8), the precision or
the difference, the power, the share expected, the population when finite.
Read from the line, never asked again: the product's unit.

## 5. Data suitability
A mean's interval from 8 readings (the spread's from 8); a Welch test from 3 a
side but *said weak* under 8 a side; Mann–Whitney from 3 a side; a paired test
from 6 pairs; Wilcoxon exact from 6. Under those: the count is said and no
verdict is made. Normality is checked from 20 readings; below, the t's
assumption is said and the rank test shown beside it. A set in order of 30 or
more has r₁ checked; fewer: said not enough to judge. **Refused**: a test with
a zero spread in both groups (nothing to test — said); *observed power* (the
power the test had at the difference it found: circular, never offered); a
share with n = 0; a rate with no hours. A counted set where the table has an
expected count under 5 says so and Fisher leads.

## 6. Calculations
Every figure below was printed by SciPy, never by Faultline
(`scripts/knowledge/cases-w3a.py`, run `python3 -I`), and each is a unit test.
- *Describing* the thirty packs (400.1 … 402.6): n 30, mean 401.1967, median
  401.20, s 0.5986, range 400.1–402.6, Q1 400.80, Q3 401.60, IQR 0.80, G1 0.1418,
  G2 −0.3823, CV 0.149%, no reading beyond the fences 399.60 and 402.80.
- *The mean's interval*: 95% 400.9732–401.4202 (t 2.0452); 90% 401.0110–401.3823;
  99% 400.8954–401.4979. *The spread's*: 95% 0.4767–0.8046; 90% 0.4941–0.7660; 99%
  0.4456–0.8898.
- *A share*: 7 of 600 — 1.17%, exact 0.470–2.389%, Wilson 0.566–2.388%, 99% exact
  0.341–2.832%; 0 of 50 — 0–7.112% (Wilson 0–7.135%); 3 of 20 — 3.207–37.893%
  (Wilson 5.237–36.042%); 20 of 20 — 83.157–100%.
- *A rate*: 12 in 40 h — 0.300 an hour, 0.155–0.524; 0 in 40 h — 0–0.0922; 1 in 8
  h — 0.125, 0.00316–0.69646.
- *Did it change, measured*: before twelve fill weights (mean 12.8083 s 0.3476),
  after twelve (12.3083 s 0.2429): Welch t −4.0842, df 19.6754, p 0.000594,
  difference −0.5000, 95% −0.7556 to −0.2444; Mann–Whitney on the same twelves —
  seven values are tied, so the normal with the tie and continuity corrections —
  U 17.5, p 0.001769; exact where nothing is tied: eight a side, after
  13.91 14.02 13.87 14.18 13.95 14.27 13.80 14.09 against before 14.12 14.35 13.98
  14.60 14.22 14.48 14.05 14.31, U 10, p 0.020668 (Welch p 0.019030). With ties
  (ten vs eleven, asymptotic with continuity): U 38, p 0.240643. Thirty a side (normal, seeded): U 192, p 0.000140,
  Welch p 0.000148.
- *Did it change, counted*: 14 of 400 → 5 of 380: 3.50% → 1.32%, z −1.9779,
  p 0.047945, Fisher p 0.062015 (smallest expected 9.26: z leads, Fisher beside,
  they straddle 0.05 and the sentence says *borderline*); 3 of 40 → 0 of 45: z p
  0.061425, Fisher p 0.100030 (smallest expected 1.41: Fisher leads); 60 of 1000 →
  40 of 1000: z p 0.040174, Fisher p 0.050760.
- *Paired*: twelve pairs — mean difference 0.3917, s 0.2151, t 6.3063, df 11,
  p 0.000058, 95% 0.2550–0.5284; their differences tie, so Wilcoxon is the normal
  with continuity: W 1.5, p 0.003558. Ten pairs with no ties: Wilcoxon exact W 4,
  p 0.013672 (paired t p 0.006188). Fourteen with two zero differences and ties: W
  1.5, normal with continuity p 0.003368 (the zeros dropped); paired t 4.8374,
  p 0.000324. Differences are rounded to nine decimals before ranking — typed
  decimals subtract to float noise and would hide ties.
- *How many*: a mean ±0.3 at s 0.9, 95%: 35 by the normal, **38** with Student's t;
  two means 0.5 apart at s 0.9, 80% power: **52** a group (power at 52: 0.8012; at
  51: 0.7934; at 20: 0.4024), 90% power: 70; a share near 10% within ±2 points: 865;
  p unknown: 2,401; near 15% within ±3: 545; two shares 10% → 5% at 80%: 435 a
  group, 3.5% → 1.3%: 759; finite population 500: 317 for the 865; zero failures to
  show 99% good at 95%: 299; the margin of 30 readings at s 0.599: ±0.2237; the
  difference 20 a group could see at 80%: 0.7973.
- *Cycles*: five timed cycles 12.1 12.8 11.6 13.0 12.4 s (mean 12.380, s 0.5586):
  to ±5% at 95%: 3.13 by the normal, **6** with t; the margin now ±0.6936 s =
  5.60%; to ±10%: 4; to ±2%: 23.
- *Autocorrelation*: forty readings from an AR(1) process (φ 0.6, rounded to
  0.01 — in the test): r₁ 0.5474, r₂ 0.1937, r₃ 0.1456 against a band of ±0.3162;
  σ from the moving range is 0.6726 of s, about √(1 − r₁) = 0.6728; Durbin–Watson
  0.8728; effective readings 11.70 of 40; thinned by 2: r₁ 0.2230 inside ±0.4472 —
  *sample every 2nd* (by 3: 0.1983; by 4: 0.0016). An independent forty: r₁ 0.0861.
  The first twenty alone: r₁ 0.4952 — fewer than 30, *not judged*.
- *Exact Mann–Whitney, small*: 5.1 6.3 7.2 before, 8.4 9.1 10.2 9.7 after — U 12,
  p 0.057143 (all four after higher, and still not under 0.05 with so few).

## 7. Outputs
The page is the lean page: the band (*Analysis · How sure / Did it change / …*,
the verdict), the tiles (a few counted figures, each with its *of*), the
sentence, the picture (the readings as bars or dots with the mean or share and its
interval; the two groups beside each other with the change and its interval on a
zero line; the pairs' differences — none for how-many, whose answer is a count
said with what fewer readings could see), what it does not claim, the action plan, the
closing line. The sentences, in the floor's words:
*How sure:* "30 packs, mean 401.20 g — we can be 95% confident the true mean is
between 400.97 and 401.42 g." / "7 of 600 rejected, 1.2% — we can be 95%
confident the true rate is between 0.5% and 2.4%." *Change:* "Before 12.81 g,
after 12.31 g: it fell by 0.50 g — we can be 95% confident it fell by between
0.24 and 0.76 g (p = 0.0006). That is the right way for this measure. What moved
it is the fix's to say." Not significant: "… it moved by −0.20 g but 95%
confidence reaches from −0.9 to +0.5 g — these readings cannot tell a change
from chance; it would take about N a group to see a change this size." Wrong
way: tone red. *Paired:* "the second reads 0.39 g higher than the first,
95% confident between 0.26 and 0.53 g, in 12 of 12 pairs." *How many:* "To see
a 0.5 g difference between the shifts weigh about 52 packs from each — at 80%
power; 20 each would see only a 0.80 g difference." Tones: green only for a
significant move the right way; red for a significant move the wrong way and for a
paired set that disagrees beyond the agreed difference (if one is typed); neutral
otherwise. **Never claimed:** that the fix caused the move; that a figure outside
an interval is impossible; that a non-significant test shows no change. **Money:**
how-many carries the study's cost where the line has a labour rate (readings ×
seconds a reading × the line's rate — `knowledge/MONEY.md` L) only when the
seconds a reading are typed; otherwise nothing is invented. A change in a
measure with a cost (give-away, rejects) says the worth of the difference at
the line's cost model *only through the studies that already price it* — this
tool prices nothing of its own.

**The report.** The paper (`src/lib/studiesPdf.ts` analysisBlocks on the report
engine): the band, the cells (the tiles), the agreement in words (the
question, the unit, the confidence, which way is better, the tests used and why
the leading one leads), the picture drawn, the table of every figure with its
interval, the sentence, what it does not claim, the readings (or the counts, or
the pairs) ten a row with struck ones marked, the checks (normality,
independence) and what they said, the action plan, the closing line — one or two
pages. A list paper for the tool's list (every one shown). It reads the same
module as the screen.

## 8. Manufacturing usability
The pad as the capability study's (big keys, one hand); a pasted column in one
go; Before and After as two stacked pads on the phone, side by side on the desk;
a pair as two boxes with Enter moving on; the answer after the first usable
readings, updating as they are typed; counted runs as *made* and *rejected*.
Taps from the front door to an answer: pick the question, give the unit,
type or paste, read.

## 9. Failure handling
Too few readings: the count and what is needed, no verdict. A zero spread:
said. Non-numbers in a pasted column: the lines skipped are listed, nothing
silently dropped. A struck reading: kept, left out, restorable. A client:
reads, may not type (`can.edit`). Offline: kept on the device and synced like
every study. A study from before has no `analysis` agreement: not offered here
(the tool's own list only). Misuse refused in words: an observed-power ask; a
before/after with one group empty; paired sets of unequal length (the longer's
extras are listed, not used).

## 10. Integration
The record: a `ToolStudy` (`tool: 'analysis'`), `agreed.analysis`, readings in
`facts.readings` — the two new optional fields on a reading are `arm` (the group
a reading belongs to — *before*, *after*) and `with` (a pair's second value);
counts reuse `made` and `rejected` (a rate: `rejected` the count, `made` the
hours). **No new noun; no new table.** Where it shows: *Tools* of every scope
(factory, line, project) from the catalogue's registry; the line page's tool
cards; the study's *Belongs to* and *Used for* (Make it better only on a project
study, as every tool); the studies' list and its paper; the directory *Every
tool*; the control room's count; the fishbone is not fed (nothing here is a
cause). Access: `can.edit` to type, `can.agree` to change the agreement, `can.remove` to delete. Sync: the studies table
carries `tool` in a check constraint — `supabase/ANALYSIS.sql` adds `'analysis'`
(applied and read back before the app change reaches `main`). The mapper is
unchanged (the agreement is in the existing jsonb). `docs/PAGES.md`, the
inventory (the page's must-show list), `scripts/smoke.mjs`, the journeys'
tool count, the registry/rail tests.

## 11. Verification
Unit tests on the independent cases (`src/lib/ie/__tests__/stats.test.ts`,
`src/tools/analysis/__tests__/analysis.test.ts`); the acceptance script
`scripts/acceptance/analysis.mjs` driving each kind on the page against the
module and reading the paper back; the inventory and the compare against live;
the gate line in `CLAUDE.md`.

**Acceptance criteria.**
1. Every figure of §6 is reproduced by `lib/ie/stats` and `lib/ie/describe` —
   `stats.test.ts` (describing, the t, χ² and exact intervals, Wilson, Poisson,
   Welch, Mann–Whitney exact and with ties, the pooled z, Fisher, the paired t,
   Wilcoxon exact and with zeros, the noncentral-t power, the sample sizes, the
   cycles, r₁ and the thinning).
2. The kinds' sentences, tones and refusals (§5, §7, §9) are the module's
   `analysisFigures` / `analysisSays` — `analysis.test.ts`: too few readings, a
   zero spread, borderline counted, not significant with the size it would take,
   the wrong way red, ties, a paired set with zeros.
3. The page, kind by kind (`analysis.mjs`): *How sure* — thirty packs typed by
   pasting, the mean's interval and the spread's as the module says, the
   histogram, the share 7 of 600, the rate 12 in 40 h; *Did it change* — twelve
   and twelve typed into two pads, Welch and Mann–Whitney said, the sentence and
   tone, then the counted 14 of 400 → 5 of 380 saying z and Fisher and
   *borderline*; *Do two ways agree* — twelve pairs, the paired t and Wilcoxon;
   *How many* — the mean, the difference (52 a group), the shares, zero failures,
   the cycles (6); confidence 90 · 95 · 99% changing every interval; a reading
   struck and restored; refusals said.
4. Autocorrelation: the AR(1) forty on the Analysis page and in a capability study's
   notes — r₁, the band, *sample every 2nd*; an independent set says nothing; the
   twenty alone say they are too few to judge.
5. The capability study's histogram carries *median · middle half · lean* as the
   module says — `capability-kinds.mjs` still green, `analysis.mjs` checks the line.
6. Persistence and where it shows: reload keeps what was typed; the tool is in the
   rail's Tools, the line page's cards, the list and the directory; a study on a
   project says *Belongs to* and *Used for* (`analysis.mjs`, `tools-directory.mjs`).
   Access follows `can.edit` / `can.agree` / `can.remove` as every tool's does — the
   client's read-only view of this tool is *not yet proved* by a script.
7. The paper for each kind downloaded and read back — the figures, the sentence,
   the readings, the checks, nothing overprinted — and the list paper
   (`report-stress.mjs` at three sizes, with the analysis seeds).
8. The phone: nothing off the side, the pad's keys big enough, the pictures
   inside.
9. The directory and the catalogue: FC-103, FC-104, FC-105, FC-106, FC-113,
   FC-020, FC-115 *available* — `catalogue.test.ts` — and every rail tool has an
   entry.
10. `docs/PAGES.md` has the Analysis page and the capability histogram's line;
    the inventory is green; `--compare` against live shows nothing moved
    elsewhere but the tool's own cards and the capability histogram's caption.
11. The gate.

*Not yet proved:* use on a phone on the floor; the defaults chosen in §3 have not
been put to Rowland one by one; a test inside every study's own before → after line.

## 12. Maintainability
`src/lib/ie/stats.ts` (the distribution functions and tests — the t, χ², Poisson
and binomial intervals, Welch, Mann–Whitney, Wilcoxon, Fisher, power, sample sizes,
autocorrelation) and `src/lib/ie/describe.ts` are shared and pure; they add to
`lib/ie/dist.ts` and never replace it. `src/tools/analysis/` holds the figures
and sentences (`analysis.ts`), the page (`AnalysisScreen.tsx`) and its tests.
W3b adds three kinds (groups, counts in a table, relations) to the same agreement
and page — `kind` is a union, the picker a list; W3c adds the shape, the stack-up
and the factorial. Left for later, each with its number: FC-107, FC-108, FC-109,
FC-110, FC-114, FC-116, FC-111 (W3b, W3c); FC-096 distribution-fitted capability
(W3c); a test in every study's before → after line (follow-up under FC-105's
*Limits*).
