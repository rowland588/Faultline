# FC-107 — Analysis, part two: several groups, counts in a table, what moves with what (W3b)

**Catalogue:** FC-107 comparing several groups (the kind) · FC-108 counts by two
categories (a kind) · FC-109 correlation and the scatter (a kind) · FC-110 what
drives it — regression, simple and multiple (a mode of the same kind).
**Knowledge:** `stats.anova`, `stats.chi-square-association`,
`stats.correlation-regression`. **Programme:** `docs/TOOLS-BUILD.md` W3, slice b —
the same tool, record and page as W3a (`knowledge/specs/FC-105-analysis.md`):
`tool: 'analysis'`, `agreed.analysis`, readings in `facts.readings`; W3c follows
(shape, stack-up, experiments — FC-114/116/111). **Asked for:** Rowland, 23–24
October — build every planned tool; confidence in the language throughout.
**Written 24 October 2026, before any code.**

## 1. Purpose
Three more questions the floor asks and answers with a hunch: *do these heads, shifts
or suppliers really differ — and which of them?* ("it is always worse on nights"),
*is this fault tied to that lane?* ("we get a lot of leakers and they seem to come
from one side"), and *does one thing move with another — and by how much per unit?*
(seal strength against jaw temperature; give-away against speed and product
temperature). Each is answered in words with its figure, its margin and what it
does not claim. The sentence it lets one side say to the other: *"Give-away differs
by shift — B runs 0.59 g heavier a pack than A, and we can be 95% confident that is
between 0.34 and 0.84 g; A and C are not shown to differ."*

**Scope.** This build adds three kinds to the Analysis tool's question picker:
**Do groups differ** — measured readings by group (heads, shifts, lines, suppliers):
one-way ANOVA with its F, p and η², Levene's check of the spreads, Kruskal–Wallis
beside it (leading when a group is not bell-shaped or the spreads differ), and
Tukey's HSD for which pairs differ with each difference's interval (the
Tukey–Kramer form for unequal sizes) (FC-107); **Are two things linked** — counts
in a table, rows by columns: the χ² test of association with its expected counts,
the cells that drive it (standardised residuals), Cramér's V, Yates' correction and
Fisher's exact test for a 2×2, and the rule that says when the χ² cannot be trusted
(FC-108); **What moves with what** — pairs, or rows of several drivers and a result:
the scatter, Pearson's r with its interval, Spearman's ρ, the least-squares line
with the slope's interval, R², the residual checks and a prediction with its
interval, and, with two or more drivers, multiple regression — each coefficient with
its interval and p, R² and adjusted R², the F test, and the variance inflation
factor that warns when drivers move together (FC-109, FC-110). Confidence 90 · 95 ·
99% as in W3a.
Not in W3b: an r × c exact test (Freeman–Halton) — a table that fails the
expected-count rule is said so, with what to do (merge categories or count more);
Welch's ANOVA (Kruskal–Wallis is the alternative the record names that this build
takes); a two-way model or interactions (the factorial, FC-111, W3c); regression with
a curved term or a transform (said when the residuals call for it, not offered);
stepwise selection of drivers (never — a person names the drivers); the
money of a difference (the capability study's give-away line prices a mean's
difference; this tool prices nothing of its own).

## 2. Users and scenarios
The ops lead at a desk, the shift lead on a phone. (1) Give-away on eight packs from
each of three shifts: B is the one. (2) Rejects on three lanes by three fault types
(counted off the checkweigher's reject bin): three lanes, three different problems.
(3) Twelve jaw temperatures and the seal strengths: strength rises 0.145 N a degree
and then levels off — the line is too straight. (4) Thirty fills with speed and product
temperature: both drive give-away, and the page says how much each does with the
other held.

## 3. Method selection
The records: **groups** — the single-factor model (SS between and within, F, η²);
Levene's test on the medians (already in the app, `lib/ie/charts`) for the spreads;
Kruskal–Wallis (H with the tie correction, χ² on k − 1 df) when a group of 20 or more
is not bell-shaped (D'Agostino–Pearson) or Levene's p is under 0.05; Tukey's HSD from
the studentised range, never a t-test per pair. **Table** — Pearson's χ² =
Σ(O − E)²/E on (r − 1)(c − 1) df; the standardised residuals (O − E)/√E, |r| > 2
named; Cramér's V = √(χ² ÷ (N·(min(r, c) − 1))); for a 2×2 Yates' correction and
Fisher's exact test (already in `lib/ie/stats`), Fisher leading when any expected
count is under 5; for a larger table, when fewer than 80% of cells expect 5 or more,
or any expects under 1, the χ² is *said not to be trusted* and the exact test is not
offered. **Relations** — Pearson r with Fisher's z interval; Spearman's ρ (Pearson on
the ranks, p from t on n − 2 df as SciPy gives it); the line b = Sxy/Sxx; s_e =
√(RSS/(n − 2)); SE_b = s_e/√Sxx; the mean's interval and the prediction interval
ŷ₀ ± t·s_e·√(1 + 1/n + (x₀ − x̄)²/Sxx); the residual checks — the signs of the
residuals in the order of x run in too few stretches (Wald–Wolfowitz) say the
straight line is wrong, and the lag-1 autocorrelation of the residuals in the order
taken says the pairs were not independent; multiple regression by least squares,
b = (XᵀX)⁻¹Xᵀy, SE from s²(XᵀX)⁻¹, t and p per coefficient, R², adjusted R², F; VIF_j =
1/(1 − R²_j), from the regression of driver j on the others.

**Established · assumed · chosen.**
*Established* (textbook, with the independent cases of §6): the F, Tukey (Tukey 1949;
Kramer 1956 for unequal sizes), Kruskal–Wallis (1952), Pearson's χ², Cramér's V, the
residuals, Yates, Fisher, Pearson, Spearman, least squares and its intervals, the
prediction interval, the Wald–Wolfowitz runs, VIF (Montgomery, Peck & Vining).
*Assumed* — readings independent within and between groups, a table of *counts*
(never percentages) with each event counted once, pairs from the same moment or pack
with the driver spread over a range, a straight line adequate (checked by the
residuals, not assumed). *Chosen* by Faultline (not the textbooks'): Kruskal–Wallis
leads when a group of 20+ is non-normal or Levene's p < 0.05 (else the F leads and
Kruskal–Wallis is shown beside it); at least 3 readings a group (said weak under 8) and 2 groups; the χ² trusted only when 80% of cells expect 5 or more and none under 1 (the record's rule); a line fitted from 4 pairs and said weak under 10 (the record's 10–12), a prediction offered inside the range of x and called rough under 20 pairs (the record's 20+); multiple regression from 5·k + 5 rows for k drivers, at most 5 drivers; VIF above 10 called serious (Montgomery, Peck & Vining give 5 to 10 as the range to worry in; the stricter edge is Faultline's to choose); a prediction beyond the range of x is a guess and gets no interval (the record's extrapolation rule); two-sided tests; Cramér's V worded by Cohen's (1988) effect sizes, w = 0.1 · 0.3 · 0.5 (small · medium · large) scaled by √(min(rows, columns) − 1); and a group "not shown to differ" is never called *alike* (§7). Not yet put to Rowland
one by one: the 10 and 20 pair counts, 5·k + 5 rows, the VIF edge and Cohen's words for V.

## 4. Inputs
*Agreed before measuring* (the agreement card): the question, a name and unit, the
confidence; for **groups** which way is better (for the words); for **table** the
names of the rows (the categories down the side — lanes) and of the columns (the
categories across — fault types, or just *Rejected / Not rejected*); for **relations**
the name and unit of the result and the names and units of one to five drivers.
*Measured*: for groups a reading and the group it came from (a chip a group, added by
name, a pad and a pasted column into the chosen group); for a table a count into a
cell (a row chip, a column chip, a number — counts accumulate as runs do — or a
pasted block of rows of counts in the table's order); for relations a row typed as
the drivers then the result, Enter moving on box by box, or pasted rows of numbers.
A struck reading is kept and left out. Never asked again: the product's unit.

## 5. Data suitability
Groups: 2 or more groups of 3 or more; a group with no spread leaves the F undefined
if every group has none (said). Tables: 2 × 2 or larger, every row and column total
above 0; the χ² refused when the rule of §3 fails (said, with which cells). Relations:
a straight-line fit from 4 pairs (said weak under 10), the driver not constant (said),
a perfect fit (|r| = 1) said as such and Spearman's p taken as 0; multiple regression
refused with fewer than 5·k + 5 rows, with a driver constant, or when the drivers are
perfectly collinear (the matrix cannot be inverted — said, naming the pair). Said
every time: *a link is not a cause*.

## 6. Calculations
Every figure below was printed by SciPy and NumPy (`scripts/knowledge/cases-w3b.py`,
run `python3 -I`), never by Faultline, and each is a unit test.
- *Three shifts* (A 1.2 0.9 1.4 1.1 1.0 1.3 0.8 1.2; B 1.6 1.9 1.4 1.8 2.1 1.5 1.7
  1.6; C 1.1 1.3 0.9 1.2 1.4 1.0 1.2 1.1): means 1.1125, 1.7000, 1.1500; F 21.9291,
  p 0.00000721, SS between 1.7308, SS within 0.8287, η² 0.6762; Levene (median) W 0.4081,
  p 0.6701; Kruskal–Wallis H 15.0729, p 0.000533; Tukey: A–B −0.5875 (p 0.000021, 95%
  −0.8379 to −0.3371), A–C −0.0375 (p 0.924719, −0.2879 to 0.2129), B–C 0.5500 (p
  0.000049, 0.2996 to 0.8004); the studentised range's 95% critical value 3.5646 (3
  groups, 21 df), 3.7447 (4, 56), 3.1511 (2, 10); its cdf 0.945105 at q 3.5 (3, 21) and
  0.972432 at 5 (5, 12).
- *Unequal sizes* (6, 9 and 4 readings): F 26.5564, p 0.00000825; Kruskal–Wallis 13.9347,
  p 0.000942; Levene p 0.5353; Tukey–Kramer 1–2 −0.8667 (p 0.000012, −1.1951 to
  −0.5382), 1–3 −0.1667 (p 0.546042, −0.5689 to 0.2356), 2–3 0.7000 (p 0.000520, 0.3255
  to 1.0745). *No difference* (three alike): F 0.0000, p 1.0000.
- *A table* — rejects by lane (rows) and fault type (columns), 18 7 5 / 9 14 4 / 6 5 12:
  χ² 17.2383 on 4 df, p 0.001737; expected 12.38 9.75 7.88 / 11.14 8.78 7.09 / 9.49 7.48
  6.04; Cramér's V 0.3282; standardised residuals 1.60 −0.88 −1.02 / −0.64 1.76 −1.16 /
  −1.13 −0.91 2.43 (lane 3's type 3 is the one beyond 2). *A 2 × 2*: 12 of 100 against 4
  of 100 — χ² 4.3478 (p 0.037056), with Yates 3.3288 (p 0.068076), Fisher p 0.065197,
  smallest expected 8.00; 60 of 1000 against 40 of 1000 — χ² 4.2105 (p 0.040174), Yates
  3.8000 (p 0.051253), Fisher p 0.050760. *A table that cannot be trusted*: 3 1 6 / 8 5 2
  — χ² 6.1869, 2 df, p 0.045346, expected 4.4 2.4 3.2 / 6.6 3.6 4.8: five of six cells
  under 5, smallest 2.40 — said not to be trusted (an exact test, by 200,000
  permutations, gives 0.0612 — the χ²'s "significant" is the small-count artefact the
  rule exists to catch).
- *Relations* — seal strength against jaw temperature, 150 to 205 °C in twelve steps
  (9.1 10.2 11.0 12.4 12.9 13.8 14.6 15.1 15.9 16.2 16.8 17.0): Pearson r 0.98683 (p
  3.05 × 10⁻⁹, 95% 0.9522 to 0.9964); Spearman ρ 1.00000; slope 0.14517 (SE 0.00752, 95%
  0.12841 to 0.16194), intercept −12.0185, R² 0.97384, s_e 0.4499; at 172 °C 12.9515,
  the mean ± 0.3037 and a new reading ± 1.0475 (11.90 to 14.00); residual signs
  `---++++++---`, three runs where seven are expected (z −2.422, p 0.0154) — *the line
  is too straight*; lag-1 of the residuals 0.4564.
- *A noisy straight line* (24 pairs, seeded): r 0.96048, slope 0.51383 (SE 0.03175),
  intercept 1.8439, R² 0.92251, p 1.055 × 10⁻¹³, lag-1 of the residuals −0.0037, Spearman
  0.95478. *An outlier*: Pearson 0.68986 (p 0.02727) against Spearman 0.97265 — said
  to be looked at.
- *Two drivers* (30 fills; speed, product temperature, give-away in the test): intercept
  1.14110 (SE 0.50428, p 0.031897), speed 0.01399 (SE 0.00521, t 2.6838, p 0.012279, 95%
  0.00329 to 0.02468), temperature 0.06851 (SE 0.01987, t 3.4485, p 0.001864, 95% 0.02775
  to 0.10928); R² 0.33492, adjusted 0.28566, s_e 0.25426, F 6.7984 on (2, 27), p 0.004062;
  VIF 1.2372 each. *Drivers that move together*: VIF 459.76 — said serious, the two
  coefficients not to be read apart.

## 7. Outputs
The page is W3a's lean page: the band (the question, the verdict), tiles, the sentence,
the picture, the entry, the checks, the readings, Agreed, the action plan, the closing
line. *Groups:* "Give-away by shift: we can be 95% confident the shifts differ (F 21.9,
p < 0.0001; the share of the variation that is the shift, η², 0.68). B is above A by
0.59 g (between 0.34 and 0.84 g); B is above C by 0.55 g (between 0.30 and 0.80 g). A and C
are not shown to differ." The picture: a lane a group (dots, mean, its interval) on one axis.
*Table:* "Fault type and lane are linked: we can be 95% confident the pattern of fault types
is not the same in every lane (χ² 17.2 on 4 degrees of freedom, p = 0.0017; Cramér's V 0.33, a
medium link). The cells that stand out: Lane 3 has more Misprint than chance would give (12
against 6.0)." shown as the table itself — each cell its count, its expected count small beneath, a cell
beyond ±2 said (*more* in bold, *fewer* muted) — never green or red. *Relations,
one driver:* "Seal strength rises 0.145 N for every °C (we can be 95% confident between
0.128 and 0.162); R² 0.97 — 97% of the variation in strength goes with temperature. The
line is too straight: the residuals run in 3 stretches where about 7 are expected — add
a curve before trusting it at the ends." The picture: the scatter, the line and the
band of the line's own interval, a prediction at a typed x inside the range with its
interval, a note beyond the range. *Several drivers:* each driver "per unit, the others
held" with its interval and p, R², and the VIF warning; the picture actual against
fitted on a y = x line. Tones: neutral throughout except where a person asked which way
is better (groups: the worst group amber when it is the wrong way and the difference
is shown), a table that cannot be trusted, a line that bends, drivers that move together
(amber) — and **red never** is a finding of dependence: a link is not a failure. On paper the
Greek the sentences use (χ, η, ρ, σ, Δ) and r₁'s subscript are spelt (chi, eta, rho, sigma, Delta, r1), never
dropped: `lib/reportKit` `san` did drop them, so a paper read "(² 17.2 …".
**Never claimed:** that a difference or a link is a cause; that a group not shown to
differ is the same; extrapolation; that a high R² means the line is right.

**The report.** The paper (`src/lib/studiesPdf.ts` analysisBlocks on the report
engine, as W3a): the band, the cells, the sentence and what follows, the picture drawn
(a lane a group; the table as a table with its expected counts and flagged cells; the
scatter with the line and its band), the table of figures (each pair's Tukey result;
each coefficient with its interval and p), the checks, the agreement in words, every
reading or count (a pair or a row five to a line). It reads the same module as the
screen.

## 8. Manufacturing usability
The pad as W3a's; a pasted column into the chosen group; a pasted block of counts; a
row of a relation typed box by box with Enter moving on, or pasted. Group chips named as
the floor names them (Head 1, Nights). Taps from the front door to an answer: pick the
question, name it, type or paste, read.

## 9. Failure handling
Too few in a group, too few groups, no spread, an empty row or column, a driver that is
constant, drivers perfectly collinear, too few rows for the drivers: each said, with
what is needed, no verdict. A struck reading kept and left out. Pasted text that is not
numbers listed. A table with a cell typed negative refused. A client reads, may not
type (`can.edit`). A study from before has no analysis agreement: not offered. Misuse
refused in words: percentages in a table; a causal sentence.

## 10. Integration
The record: a `ToolStudy` (`tool: 'analysis'`), `agreed.analysis` with `kind` now one
of `sure | change | paired | plan | groups | table | relate`, the new agreement fields
(`rows`, `cols`, `drivers`; and `firstName` / `secondName`, which W3a made the names of the two ways, are
what the groups are for *groups* and what the rows and the columns are for a *table* — no new noun), readings in `facts.readings` — new optional fields on a
reading are `col` (a table's column) and `xs` (a relation's drivers); a group is `arm`
as W3a's before and after are, a table's cell a reading with `arm` (the row), `col` and
`made` (the count); counts accumulate and are struck like runs. **No new noun; no new
table; no migration** — the agreement and the readings are in the existing jsonb and
`'analysis'` is already allowed by `supabase/ANALYSIS.sql`. Where it shows: wherever
W3a's analysis shows (Tools of every scope, the line page's tool cards, the studies'
list and its paper, the directory). Access: `can.edit` to type, `can.agree` to change
the agreement, `can.remove` to delete. `docs/PAGES.md`, the inventory, `scripts/smoke.mjs`,
the paper-parity script.

## 11. Verification
The unit tests on the independent cases (`src/lib/ie/__tests__/stats.test.ts` extended,
`src/tools/analysis/__tests__/analysis.test.ts` extended); the acceptance script
`scripts/acceptance/analysis-relations.mjs` driving each kind on the page against the
module and reading the paper back; the inventory and the compare; the gate line.

**Acceptance criteria.**
1. Every figure of §6 is reproduced by `lib/ie/stats` — the studentised range's cdf and
   critical values, Tukey and Tukey–Kramer with their intervals, Kruskal–Wallis, the
   χ² of a table with its expected counts, residuals and V, Yates and Fisher on a
   2 × 2, the rule that refuses a small table, Pearson with its interval, Spearman,
   the line with its intervals, the prediction interval, the Wald–Wolfowitz runs on the
   residuals, multiple regression with its coefficients, R², F and the VIF —
   `stats.test.ts`.
2. The kinds' sentences, tones and refusals (§5, §7, §9) are the module's — `analysis.test.ts`:
   a difference found and one not, the spreads unalike (Kruskal–Wallis leads), a table
   that cannot be trusted, a link found with the line too straight, an outlier, drivers
   that move together, too few rows for the drivers, the prediction inside and beyond the
   range.
3. The page, kind by kind (`analysis-relations.mjs`): *Do groups differ* — three shifts
   added by name and pasted, F, η², Levene, Kruskal–Wallis, each pair with its interval,
   the sentence, the lanes; *Are two things linked* — the three-by-three counts typed by
   cell and the same pasted, χ², V, the cell beyond ±2 named, the 2 × 2 with Yates and
   Fisher, the small table refused; *What moves with what* — twelve pairs, r, ρ, the
   slope with its interval, R², the line too straight said, a prediction at 172 with its
   interval and at 230 refused as beyond the range; two drivers, the coefficients and the
   VIF, the collinear pair warned; confidence changing every interval.
4. Persistence and where it shows: reload keeps every kind; the new kinds are on the
   question picker; the list row says what was typed (`analysis-relations.mjs`).
5. The paper for each kind downloaded and read back — figures, sentence, the table or
   the pairs, the checks — and the list paper (`report-stress.mjs`).
6. The phone: nothing off the side, the pad's keys big enough, the pictures inside.
7. The directory and the catalogue: FC-107, FC-108, FC-109, FC-110 *available* —
   `catalogue.test.ts`.
8. `docs/PAGES.md` has the new kinds on the Analysis page; the inventory is green;
   `--compare` against live shows nothing moved elsewhere.
9. The gate.

*Not yet proved:* use on a phone on the floor; the defaults chosen in §3 have not been
put to Rowland one by one; the client's read-only view of this tool.

## 12. Maintainability
`src/lib/ie/stats.ts` gains the studentised range, Tukey, Kruskal–Wallis, the table
test, Pearson, Spearman, least squares and the runs on the residuals; the tool's
`analysis.ts` gains three kinds and the screen their entries, as `kind` is a union and
the picker a list. W3c adds the shape of the data (FC-114, FC-096), the stack-up (FC-116)
and the factorials (FC-111). Left for later, each with its number: FC-111, FC-114, FC-116
(W3c); a curved term or a transform in regression (named in the page's words, built when
asked); an r × c exact test.
