# FC-114 — Which shape fits? Fitting a distribution, and the capability of readings that are not bell-shaped (FC-096) (W3c, builder F3)

**Catalogue:** FC-114 fitting a distribution — the probability plot (a part several tools share) · FC-096
capability of readings that are not bell-shaped (a mode of the capability study, FC-094). **Knowledge:**
`stats.distribution-fitting`, `spc.capability-nonnormal`. **Programme:** `docs/TOOLS-BUILD.md` W3, slice c (the
shape of the data; stack-up FC-116 and the factorials FC-111 follow). The same tool, record and page as W3a/W3b
(`knowledge/specs/FC-105-analysis.md`): `tool: 'analysis'`, `agreed.analysis`, readings in `facts.readings`; and the
capability study (`knowledge/specs/FC-094-capability.md`) for FC-096. **Asked for:** Rowland, 25 October
(`docs/TOOLS-BUILD-BRIEF.md`): *"go through everything"*; the judgement calls are the builder's, written here.
**Written 25 October 2026, builder F3** (the arithmetic, `lib/ie/fit`, was proved against SciPy first).

## 1. Purpose
Residual oxygen, minutes between short stops, seal strength on a hard floor: not everything is a bell. A
capability index, a share outside or a prediction built on the wrong shape is wrong in the tail — exactly where
the limit sits. The capability study already says "not bell-shaped" and reads the share outside from the readings
as counted; this build adds the other half: which named shape the readings follow (or that none does), and the
tail read from it, beside the count as measured. The sentence it lets one side say to the other: *"The minutes
between stops follow a Weibull, not a bell: under it 12 in 100 stops would be shorter than 10 minutes, where the
bell said 14. As counted, 3 of 40."* Or, honestly: *"None of the four shapes fits these oxygen readings — read the
tail from the count: 0 of 30 over 2%, and we can be 95% confident the true share is under 9.5%."*

**Scope.** This build adds one question to the Analysis tool's picker, **Which shape fits** (FC-114): for a set of
readings in order, four shapes are fitted — **normal**, **lognormal**, two-parameter **Weibull** and **exponential**
— each judged by the Anderson–Darling test and compared by AIC, the probability plot drawn for the one that leads,
and from it the median, the 0.135% and 99.865% points (the ±3σ of a bell), the share beyond any limit that was
named, the percentile index (ISO 22514-2; Clements 1989) and the count as measured with its exact bound beside; and
(FC-096) in the capability study, when its own check finds the readings not bell-shaped, a note under its sentences
that fits the same four shapes to the study's readings and limits and says the fitted share and the percentile Ppk
beside the share as counted. **Not in this build:** a three-parameter shape (a lower end that is not zero), gamma,
Johnson and Box–Cox transforms, mixtures and a kernel estimate — the page says the four it tries; a fitted shape's
parameters with confidence intervals (a tail from 30 readings is a model's reach, and the page says so instead of
printing a false precision); fitting the counted modes (those are binomial and Poisson already); changing any figure
the capability study already shows — its Ppk, its share, its sentence and its tones stay exactly as they were; a
money line of the fitted share (no input asks what a pack outside costs on a measured study, so the money stays the
study's give-away; `knowledge/MONEY.md` FC-114: none of its own); the Weibull of failure times for a machine (FC-060,
which reads the reliability study's intervals).

## 2. Users and scenarios
The quality technician at a desk with the capability study open; the ops lead choosing between "capable" and "watch
it". (1) Thirty residual-oxygen readings against a 2% limit: leaning high, bounded at zero, two heavy tails — none of
the four fits; the lognormal is nearest. (2) Forty gaps between short stops on a wrapper, in minutes, against a
10-minute floor: the Weibull fits and the bell does not. (3) Forty fills of a steady filler: the normal fits and is
kept, the lognormal fits about as well.

## 3. Method selection
The records: **fitting** — maximum likelihood for the Weibull and the exponential, the sample mean and spread of x
(normal) or of ln x (lognormal), Anderson–Darling for goodness (it weighs the tails, which is where capability reads),
AIC to compare; **percentile capability** — Ppk = min((USL − X₅₀)/(X₉₉.₈₆₅ − X₅₀), (X₅₀ − LSL)/(X₅₀ − X₀.₁₃₅)).
Alternatives (the records' *When not to use it*): a quick normal-or-not → the bell-shape check (D'Agostino–Pearson,
already in the capability study); times to failure of a machine → Weibull analysis (FC-060); counts → binomial and
Poisson capability. The Box–Cox transform is not offered: choosing the λ that gives the best number is the misuse the
record names, and the four shapes are chosen by the physics (bounded at zero and leaning right: lognormal, Weibull; a
time between events: Weibull, exponential).

**Established · assumed · chosen.**
*Established* (with the independent cases of §6): the maximum-likelihood equations of the Weibull (the root of
Σxᵝ ln x ÷ Σxᵝ − 1/β − mean ln x, solved to 10⁻¹³; **SciPy's own `.fit` stops about 10⁻⁵ short of it**, so the cases use the
root) and the exponential (NIST e-Handbook §1.3.6; Johnson, Kotz and Balakrishnan); Anderson–Darling's A² (Anderson and
Darling 1952) and its p for a normal with both parameters estimated (D'Agostino and Stephens 1986, table 4.9, as
`lib/ie/dist` andersonDarling) and, for the lognormal, the same on ln x; for the Weibull the extreme-value form on ln x
(Stephens 1977) and for the exponential (Stephens 1974), both by interpolation in the published points as SciPy's
`anderson(..., method='interpolate')` does it — a p held at the table's ends is **said** ("at least 0.25", "at most 0.01");
AIC = 2k − 2 ln L (Akaike 1974); the percentile index (ISO 22514-2:2017 — **scope read, text not**; Clements 1989 from
knowledge); the exact binomial bound on a counted share (Clopper–Pearson, `lib/ie/dist`).
*Assumed* — the readings come from one process state (checked: the individuals chart's limits and a run of eight on one
side, as the capability study's steady check), are independent (r₁ from 30) and are read finely enough (checked: the step
against the spread — a goodness test is thrown by rounding, as `lib/ie/dist` explains for the bell check); the lower end
is zero for the three shapes that cannot go below it (every reading must be above zero, or they are not tried and the page
says why).
*Chosen by Faultline* (the builder, 25 October — the owner asked not to be asked; each said where the result is read):
the **spread of the normal and the lognormal is the sample's (n − 1)**, the capability study's own, so the two tools never
disagree about the bell (the likelihood for AIC is taken at its 1/n maximum, as AIC requires); a shape is **rejected at
p < 0.05**, the house's level (the bell check's, `BELL_P`); the shape that **leads is the one with the lowest AIC among
those not rejected, and the normal is kept when it is within 2 AIC points of that** (Burnham and Anderson 2002: under 2
is essentially equal support — and a bell that fits is the simpler thing to say); another shape within 2 of the leader and
not rejected is **said to fit about as well**, with its own percentile beside (30 readings tell a normal from a lognormal;
they rarely tell a lognormal from a Weibull — the record); a shape is fitted from **20** readings, called rough under
**30** and firm from **50**; when **no shape is kept** the page says so and sends the reader to the count as measured, and
names the nearest by AIC so the reader sees how far off the best is; the capability fold fits only on a measured study of
kind `limits` (including its questions) with at least one limit — not on a sold-by-weight study, whose rules are counts —
and never changes an existing sentence, tile or tone. *Money:* none of its own (`knowledge/MONEY.md`, FC-114); FC-096's
money is FC-094's, unchanged — the study's give-away at the nominal does not depend on the shape.

## 4. Inputs
*Agreed before measuring* (the agreement card): the name of what is measured and its unit; **the limits that matter** — a
lower, an upper or both (optional; without one the page gives the shape and its points but no share beyond); the
confidence (for the count's bound, default 95%). *Measured:* a reading, in the order taken (the pad, or a pasted column); a
struck reading is kept and left out. In the capability study nothing new is asked: its readings and its limits are the
inputs. Nothing is read from a machine.

## 5. Data suitability
Fitted from 20 readings (said rough under 30, firm from 50); the Anderson–Darling test from 8 (it never runs below, and the
fit starts at 20). **Said, not refused:** a set that is not steady or that leans on the one before (a shape fitted to a
drifting set is a fiction); readings so coarse that the step is a quarter of the spread or more (the test is harsher than
it should be); a shape that is fitted but strained (its p between 0.05 and 0.10). **Refused, in words:** a reading of zero
or less for the lognormal, the Weibull and the exponential (they are not tried; the normal is, and the page says why);
every reading the same (no shape); fewer than 20 readings (the count and what is needed, no verdict). A Weibull that cannot
be fitted (the root is not found: readings too alike) is listed as not tried, with the reason.

## 6. Calculations
Every figure below was printed by SciPy, never by Faultline (`scripts/knowledge/cases-w3c.py`, `python3 -I`), and each is a
unit test (`src/lib/ie/__tests__/fit.test.ts`).
- *Residual oxygen, 30 readings* (the capability study's own set): normal μ 0.364, σ 0.26410 (AIC 8.234); lognormal μ(ln)
  −1.15976, σ(ln) 0.49338 (AIC −23.854); Weibull β 1.62060, η 0.411801 (AIC −8.052); exponential mean 0.364 (AIC 1.364).
  Anderson–Darling A²: normal 3.9174, lognormal 1.5004 (p 0.00057), Weibull 2.7557 (p ≤ 0.01), exponential 4.6086 (p ≤ 0.01);
  every shape is rejected and the lognormal is nearest. The 99.865th percentile: normal 1.1563, lognormal 1.3776, Weibull
  1.3204, exponential 2.4052; the share over 2%: lognormal 8.65 × 10⁻⁵, Weibull 2.4 × 10⁻⁶, exponential 0.0041; percentile
  Ppk: normal 2.065, lognormal 1.585, Weibull 1.685.
- *Minutes between short stops, 40 readings* (a Weibull of shape 1.6, scale 40, drawn with a fixed seed): Weibull β 1.48513,
  η 39.9730 (AIC 363.18); normal AIC 371.45 (p 0.0038), lognormal 373.14 (p 0.0245), exponential 369.19 (p 0.0230); the
  Weibull A² 0.5684, A* 0.5864, p 0.1462; share under 10 min: Weibull 0.1199, normal 0.1394, lognormal 0.1457; percentile
  Ppk against a 10-minute floor: Weibull 0.690, normal 0.361; 3 of 40 counted.
- *Forty fills of a steady filler*: normal μ 249.61, σ 1.0061 (A² 0.3127, p 0.535) — kept; the lognormal fits about as well
  (p 0.548); the Weibull (β 236) and the exponential are rejected; share outside 247–253: 0.0051.
- The probability plot positions (i − 0.5) ÷ n, i = 1…n (Hazen), the quantile of each shape at each.
Rounding: shares to "about N in 1,000"; indices to two places; p as W3a (`pSay`), edges as "at least 0.25" / "at most 0.01".

## 7. Outputs
The page is W3a's lean page: the band (the question and its verdict), tiles, the sentence with what follows, the picture,
the entry, the checks, the readings, Agreed, the action plan, the closing line.
*Which shape fits:* tiles **Readings** (of 30) · **Leads** (the shape, or "None") · **Fit** (its Anderson–Darling p) · **99.865th
point** · **Beyond the limit** (the shape's share and, beneath, the count). Sentence — a shape kept: "Minutes between stops: a
Weibull fits (Anderson–Darling p 0.15, the lowest AIC); the normal (p 0.004), the lognormal (p 0.02) and the exponential
(p 0.02) do not. Under the Weibull, 12 in 100 would be under 10 min — 3 of 40 as counted (we can be 95% confident the true share
is below 20%)." The bell kept: "A normal fits (p 0.53): the readings are bell-shaped enough for the usual Ppk." None kept: "None
of the four shapes fits (the lognormal is nearest, p 0.0006): read the tail from the count, not from a model — 0 of 30 over 2%;
we can be 95% confident the true share is below 9.5%." Tones: a shape kept neutral; the bell kept green; none kept or an unsteady
set amber; **red never** — a shape is not a failure. More: each kept shape's parameters in the floor's words, the median and the
0.135% / 99.865% points; the shapes that fit about as well with their own points ("30 readings cannot tell them apart: the
Weibull puts the 99.865th point at 1.32, the lognormal at 1.38"); the percentile Ppk beside the usual Ppk when a limit is named. A
table of every shape tried (fits or not, p, AIC, median, 99.865th point, share beyond) and the probability plot of the leader (or
the nearest): the readings against the shape's quantiles with a line of equal values.
*In the capability study (FC-096):* under its sentences, a note: "Not bell-shaped, so the tail is fitted: a lognormal fits
(Anderson–Darling p 0.31) — about 3 in 1,000 would be over 2%, Ppk 1.58 by the percentile method; as counted, 0 of 30 are over."
or "No shape tried fits (the lognormal is nearest, p 0.0006): the share outside is the count as measured only." Tone amber when the
percentile Ppk is under 1.33 or no shape fits, neutral otherwise — **never green**, the study's own rule for readings that are not
bell-shaped. On the paper the same note, from the same module.
**Never claimed:** that a shape is the process's true law (it is the nearest of four on these readings); that a fit from 30
readings measures a 0.135% tail (it is a model's reach, said); that a rejected-by-nothing shape is right (the test has little
power at 30 readings); that capability is "fine" because the fitted share is small when the count disagrees.

**The report.** The paper (`src/lib/studiesPdf.ts` analysisBlocks on the report engine, as W3a): the band, the tiles, the sentence
and what follows, the probability plot drawn, the table of every shape, the checks, the agreement in words (the limits), every
reading. The capability paper carries the same note in its notes (`modeNotes`). Both read the same module as the screen.

## 8. Manufacturing usability
Desk work: the pad or a pasted column of fifty readings, the answer at once. In the capability study nothing is asked — the note
appears when the study's own check says the readings are not bell-shaped. Taps from the front door to an answer: pick the
question, name it, paste, read.

## 9. Failure handling
Under 20 readings, no spread, a reading of zero or less (three shapes not tried, said), a Weibull that cannot be fitted, a
set that is not steady, readings leaning on the last, coarse rounding, no limit named: each said, with what is needed. A struck
reading kept and left out. A client reads, may not type (`can.edit`). A study from before has no shape agreement: not offered. The
capability note never appears where it has nothing to add (bell-shaped readings, no limit, fewer than 20 readings, a counted mode).

## 10. Integration
The record: a `ToolStudy` (`tool: 'analysis'`), `agreed.analysis.kind: 'shape'` with `shape: { lower?, upper? }`; readings in
`facts.readings`. **No new noun; no new table; no migration** (the agreement and readings are the existing jsonb). The capability
study's `SampleFigures` gains an optional `fitted`; `modeNotes` a `fitted` note — drawn by the study's page and paper where they
already draw notes. Where it shows: wherever the Analysis shows (Tools of every scope, the line page's tool cards, the studies'
list and its paper, the directory); the capability note wherever the capability study shows (its page, its paper, the list's
paper). Access: `can.edit` to type, `can.agree` to change the agreement, `can.remove` to delete. `docs/PAGES.md`,
`scripts/inventory/pages.mjs`, `scripts/smoke.mjs`, the paper-parity script, the seed.

## 11. Verification
The unit tests on the independent cases (`src/lib/ie/__tests__/fit.test.ts`; `src/tools/analysis/__tests__/analysisShape.test.ts`
for the sentences, tones and refusals; `src/tools/capability/__tests__/sampleFitted.test.ts` for the note); the acceptance scripts
`scripts/acceptance/analysis-shape.mjs` (the Analysis question) and `scripts/acceptance/capability-kinds.mjs` (the capability
note, step 16, with every earlier step unchanged); the inventory and the compare; the gate lines.

**Acceptance criteria.**
1. Every figure of §6 is reproduced by `lib/ie/fit` — the four fits and their log-likelihoods and AIC, A² and its p for each shape
   (the normal's and lognormal's by the D'Agostino–Stephens formula, the Weibull's and the exponential's by SciPy's tables), the
   percentiles, the shares beyond a limit, the percentile index, the probability-plot positions — `fit.test.ts`.
2. The choice of the leader (lowest AIC among those not rejected; the normal kept within 2), the "fits about as well" list, the
   case where nothing is kept, and the refusals (a reading of zero or less; no spread; too few) — `fit.test.ts`, `analysisShape.test.ts`.
3. The page (`analysis-shape.mjs`): *Which shape fits* — the stops pasted: the Weibull leads, the other three rejected, the sentence,
   the table of shapes, the probability plot, the percentile Ppk; the oxygen readings: none fits, the nearest named, the count and its
   bound; the fills: the normal kept and the lognormal said to fit about as well; a limit changed and the shares moving; a reading
   of zero and three shapes not tried.
4. The capability study (`capability-kinds.mjs` step 16): the oxygen readings against 2% carry the note, on screen as the module
   says it, with the study's other sentences, tiles and tones exactly as before; bell-shaped readings carry no note; a study with
   no limit carries none.
5. Persistence and where it shows: reload keeps it; the question is on the picker (nine questions); the list row says what was
   typed (`analysis-shape.mjs`).
6. The paper for the Analysis question and the capability paper with the note, downloaded and read back — the sentence, the table,
   the plot, the note — and the list paper (`analysis-shape.mjs`, `capability-kinds.mjs`, `report-stress.mjs`).
7. The phone: nothing off the side, the table inside its wrapper, the plot inside (`analysis-shape.mjs`).
8. The directory and the catalogue: FC-114 and FC-096 *available* — `catalogue.test.ts`.
9. `docs/PAGES.md` has the new question on the Analysis page and the note on the capability page; the inventory is green; `--compare`
   against live shows nothing moved elsewhere.
10. Existing behaviour unchanged: `analysis.mjs`, `analysis-relations.mjs` and every earlier step of `capability-kinds.mjs` pass.
11. The gate.

*Not yet proved:* use on a real set of oxygen or stop readings from a line; the defaults chosen in §3 have not been put to
Rowland one by one; ISO 22514-2's text against the percentile index; the Weibull's p against a Monte Carlo of the fitted case (SciPy's
`anderson` tables are the reference).

## 12. Maintainability
`src/lib/ie/fit.ts` holds the arithmetic, shared by the Analysis tool and the capability study; the tool's `analysis.ts` gains one
kind and the screen its entry; `tools/capability/sample.ts` gains the `fitted` figures and `modeNotes` one note. Left for later,
each with its number: a three-parameter shape, gamma and Johnson (when a reading set needs them — said by the page); the Weibull
analysis of a machine's failure times with its own confidence bands (FC-060, which can call `fit.ts`); a fitted-share money line
once a measured study can say what a pack outside costs; the tolerance stack-up of several deposits (FC-116).
