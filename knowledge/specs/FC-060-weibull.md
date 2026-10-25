# FC-060 — Weibull on the Reliability study: is a part wearing out, failing at random or failing young — and when to change it

**Catalogue:** FC-060 Weibull analysis of times to failure — built as a *mode*
of FC-058 (the catalogue called it a tool of its own; the build-shapes plan,
`knowledge/BUILD-SHAPES.md`, places it as a new question in the Reliability
study, reading its intervals — this build follows the plan and changes the
catalogue entry to say so). **Knowledge:** `maintenance.weibull`,
`maintenance.mtbf-failure-rate`, `stats.distribution-fitting`. **Asked for:**
the catalogue ("A part fails and nobody knows whether to change it on a
schedule"); Rowland, 25 October: go for every entry that can honestly be built.
**Written 25 October 2026, before any code, by the builder (the owner asked not
to be asked).**

## 1. Purpose
An MTBF assumes failures come at a constant rate; that is true of random events
and false of wear. For a part the engineers "just replace when it goes" — a
sealing-jaw heater, a knife, a belt — the question is whether the older it gets
the likelier it fails (then a planned change before it fails is cheaper), or
whether age makes no difference (then changing it on a schedule buys nothing), or
whether it fails young (then replacing *causes* failures: look at fitting). The
Weibull shape β answers that; the B10 life and the chance a part at a given age
fails in the next stretch put it in the floor's terms; and, given what a failure
and a planned change cost, the age to change it at. The sentence: *"The jaw
heaters wear out (β 2.7, 90% sure 1.8–3.9): a tenth have failed by about 450
hours. A heater that has run 500 hours has about a 1-in-5 chance of failing in
the next 200. Changing at about 470 hours halves what heaters cost us."*

**Scope.** This build covers, for a count where *A part that wears* is ticked at
set-up (the thing counted is a part replaced when it fails — a belt break, a
knife, a heater): the **ages** of the parts — typed (a part's hours, cycles or
packs, failed or still running), and optionally the study's own gaps (the part
replaced at each event; the running stretch since the last event is a part still
running); the fit by **maximum likelihood** with the still-running parts counted
(never dropped), β and η with the 90% likelihood-ratio interval on β, the B10
with its 90% likelihood-ratio interval, the median and mean life; the rank
regression's line on a Weibull plot with its straightness (r²); the reading in
words (wears out · random · fails young, "beyond doubt" only when the interval is
clear of 1); the chance a part at a given age fails in the next stretch; the
**age-replacement interval** and what it saves, from the two costs typed (a
planned change; a failure); the picture; the tiles, sentences, closing line and
paper. It does **not** cover: separating failure *modes* (one count is one mode —
a heater that burns out and one broken by a jam are two counts; the page says
so); a three-parameter fit; confidence bounds on η or on the replacement
interval (a first guess, said); a distribution fitted to repair times (FC-114);
IEC 61649's text (not read — the page does not claim to follow it); the planned-
maintenance schedule the record says the interval hands to (FC-063, not built —
the interval is shown, not scheduled).

## 2. Users and scenarios
An engineer with a maintenance log (the hours each sealing heater ran before it
failed, and the ones still on the machine) types the ages in; or a fitter
watching a labeller's film-cutting knife replaced at each failure lets the
study's own gaps be the lives. (1) Twelve heaters: wears out, B10 about 450 h,
change at about 470 h. (2) Eight lives that look random: "age does not matter —
changing on a schedule buys nothing". (3) A part that fails young. (4) Five lives:
not fitted — six failures are needed.

## 3. Method selection
Two-parameter Weibull, R(t) = exp(−(t ÷ η)^β), by **maximum likelihood** with
right-censored (still-running) parts, because the record is emphatic that
dropping them is "the commonest error and biases β high" — its worked case shows
β 1.73 with four still running against 3.71 with them dropped. The Weibull **plot**
(median-rank regression with Johnson's adjusted ranks for the still-running ones,
Bernard's approximation) is the diagnostic drawn beside it: a straight line means
one mode; the r² says how straight, and the rank-regression β is printed with the
maximum-likelihood one. Small samples make the maximum-likelihood β lean steep;
the page says so under 20 failures and shows both. *Alternatives:* a plain MTBF
(the study's other figures, right for random events); the Crow–AMSAA growth fit
(a repairable machine, FC-061); a fitted distribution on any readings (FC-114).

**Established · assumed · chosen.**
- *Established (the record, Abernethy 2006, O'Connor and Kleyner 2012, from
  knowledge; the worked case is `scripts/knowledge/cases-w5.py`):* reliability
  R(t) = exp(−(t ÷ η)^β); B10 = η(−ln 0.9)^(1÷β); B50 = η(ln 2)^(1÷β); mean life
  = η Γ(1 + 1÷β); the conditional chance a part of age a fails by a + d is
  1 − exp(−((a + d)÷η)^β + (a÷η)^β); the age-replacement cost rate at interval T
  is [C_p R(T) + C_f (1 − R(T))] ÷ ∫₀ᵀ R(t) dt, minimised over T (Barlow and
  Hunter 1960), valid for β > 1 and C_f > C_p; running to failure costs C_f ÷ mean
  life.
- *Established:* the profile log-likelihood in β (η eliminated: η̂ᵝ = Σ tᵢᵝ ÷ r
  over all parts, r failures) is l(β) = r ln β − r ln(Σ tᵢᵝ ÷ r) + (β − 1) Σ ln t_f
  − r; the 90% likelihood-ratio interval is the β where l falls ½ χ²₁(0.90) =
  1.3528 below its peak (Meeker and Escobar 1998, from knowledge); for B10 the
  same on the likelihood with η = B10 ÷ (−ln 0.9)^(1÷β) maximised over β.
- *Established:* Johnson's adjusted rank for a failure with reverse rank k among N
  units is prev + (N + 1 − prev) ÷ (1 + k); median rank (adj − 0.3) ÷ (N + 0.4).
- *Assumed:* parts of one kind, in one duty, with one failure mode; the age
  measure is the one that wears the part; a part replaced at each event of the
  study (when its gaps are used) was new when the watching began only if the
  person says so (*the part was new when watching began*), else the first gap is
  not a life and is left out; the failure and planned-change costs are typed
  figures.
- *Chosen (the builder, 25 October — the owner asked not to be asked):* fitted from
  **6** failures (the record: "at least 6–8 for a usable β, 20+ for confidence"),
  called a first guess under **20**; the reading *wears out · fails young* only
  when the 90% interval is clear of 1, else "leans … not yet sure" or "age makes no
  difference that can be told"; the replacement interval is given only when the
  shape is wear-out beyond doubt (the 90% interval above 1) and C_f > C_p, found over
  0.02 η to 5 η (nothing inside that range means none is worth it) — a shape that
  only leans wear-out gets no interval, the page says why; a gap-derived life is in hours of watched running; the age is
  a unit the person names (hours, cycles, packs) and said wherever it is read; the
  two fits are said to differ when their β differ by a fifth or more; costs are
  per count and agreed (`can.agree`). Each is printed where its result is read.

## 4. Inputs
At set-up, per count: **A part that wears** (tick); the unit its age is in
(default *hours*); **a planned change costs** (£), **a failure costs** (£, the part,
the labour and the line's lost time — the page offers the line's lost time for
one failure from the cost model where the minutes stood are known); *use this
study's gaps* and *the part was new when watching began* (ticks). On the page:
add a life — age (> 0), *failed* or *still running*, a note; strike and restore
each; the age now and the stretch ahead for the conditional chance (defaults: the
oldest still-running part's age; 20% more).

## 5. Data suitability
Fewer than 6 failures: "N failures so far — a Weibull is fitted from 6", with the
lives listed. All failure ages equal, or one distinct failure age: not fitted. A
plot that is not straight (r² under 0.9, the page's own plain mark) is said to
suggest two modes or a gap before the first failure. No still-running parts when
the list is a maintenance log's usual survivors: said ("every part listed has
failed — a part that was changed before it failed belongs in the list as still
running"). Mixed modes: one count is one mode.

## 6. Calculations
As §3; the root of the profile score by bracketing in (0.05, 50); η from β; the
interval ends by bracketed root-finding of the profile; B10 bounds by the nested
profile; the replacement interval by a log-spaced search with a golden-section
refinement.

**Independent cases** (`scripts/knowledge/cases-w5.py`, SciPy, to
`src/tools/reliability/__tests__/weibull.test.ts`): twelve heater failures at 310,
480, 560, 720, 790, 850, 940, 1010, 1100, 1250, 1380, 1620 h:
1. Maximum likelihood β 2.73793, η 1,033.276 h (also by Nelder–Mead 2.73793,
   1,033.276); β 90% interval 1.81257 to 3.86595.
2. B10 454.21 h (90%: 268.6 to 632.0), B50 903.8 h, mean life 919.3 h,
   R(600 h) 0.79790.
3. A heater at 500 h fails by 700 h: 0.18720; a new one within 200 h: 0.01109.
4. Rank regression β 2.39227, η 1,043.95 h, r² 0.99654.
5. A failure costing six times a planned change: best interval 471.7 h, cost rate
   0.0033914 per hour against 0.0065265 running to failure — a 48.0% saving.
6. Eight failures with four still running at 1,500 h: β 1.72685, η 1,309.35 h
   (interval 0.9849 to 2.7125 — includes 1); the four dropped: β 3.70722. Johnson's
   adjusted ranks 1…8 (no suspension is before the last failure) with median
   ranks 0.0565, 0.1371, 0.2177, 0.2984, 0.3790, 0.4597, 0.5403, 0.6210; rank
   regression β 2.35178, η 1,056.54 h.
7. Eight gap lives (212, 305, 168, 410, 260, 350, 190, 280 h, one part still
   running at 120 h): β 3.88971, η 301.507 h, B10 169.06 h, interval 2.3766 to
   5.8152.
8. Random-looking ages 20…610 (8): β 1.1656, interval 0.6919 to 1.7815 → age
   makes no difference that can be told. Failing young ages 3…1500 (8): β 0.5350,
   interval 0.3223 to 0.8078 → fails young.

## 7. Outputs
A **How it wears** panel on the count: tiles **Shape β** (with its range and the
word), **B10 life** (the age by which a tenth have failed; its range; the unit),
**Change at** (the interval, when there is one; what it saves a day of the line
and per 1,000 of the unit, or what is missing) and the counts (failures, still
running); the sentence above; the Weibull plot (ages on a log scale, % failed on
the Weibull scale, the lives as points, the two fitted lines, the legend in
words); the lives (struck/restored); the conditional chance. **Money:** a failure
costs C_f and a planned change C_p (typed, agreed); the saving is the difference of
the two cost rates per hour of the age unit and, where the unit is hours of
running and the line's shifts are known, a day of the line's shifts; missing
inputs are named ("give what a failure costs and what a planned change costs to
say the interval in money"); the line's lost time for a failure is offered from
the model, not added silently. Tone: wears out with an interval offered — neutral
(a finding, not a fault); the page never colours β.

**The report.** The count's section on the Reliability paper gains the panel: the
sentence, the table (β and its range, η, B10 and its range, mean life, the two
fits, r²), the Weibull plot (the same points and lines as the screen), the
interval and its saving with the costs it rests on, and the plain caveats (one
mode, first guess under 20). A count without *A part that wears* prints as
before.

## 8. Manufacturing usability
A maintenance log is typed in a minute: age, tap *Failed* or *Still running*,
repeat. The gaps option needs nothing typed. Phone and desk.

## 9. Failure handling
Too few, equal ages, no root: a sentence saying which and what to add. An age ≤ 0
or beyond 10⁷ is refused. The costs untyped: the interval is named as needing
them and the rest still said. A failure cost not above a planned change: "no
interval beats running it to failure". A closed study keeps its figures. A client
sees it, no entry boxes.

## 10. Integration
Record: `RelCount.wear` (unit, gaps, new-at-start, the two costs) in `agreed`;
`facts.lives` (a list of `{ id, count, age, failed, note?, struck?, by? }` merged
by id like readings) — in the study's JSON, **no migration**. Reads the count's
gaps and running stretch from `reliability()`. Shows on the page, the paper and
the line report. The interval is shown, not scheduled (FC-063).

## 11. Verification
Unit tests `src/tools/reliability/__tests__/weibull.test.ts` on §6; acceptance
`scripts/acceptance/reliability.mjs` story 15 (lives typed on the page, the
figures against the independent numbers, the paper read back).

**Acceptance criteria.**
1. β, η, the interval on β, B10 and its interval, B50, mean life, R(t), the
   conditional chance, the rank-regression β and r², Johnson's ranks and the
   replacement interval equal the independent cases — `weibull.test.ts`.
2. The still-running parts are counted, not dropped (case 6) and the
   gap-derived lives (case 7) — `weibull.test.ts`.
3. The reading (wears out · random · young) with "beyond doubt" and without
   (cases 1, 6, 8) and the 6-failure boundary — `weibull.test.ts`.
4. Lives typed on the page, struck and restored; the panel's tiles, sentence and
   table equal the module's and the independent β ≈ 2.74, B10 ≈ 454 h and interval
   ≈ 472 h for the record's twelve — `reliability.mjs` story 15.
5. The Weibull plot is drawn (points and lines) and fits the phone — story 15.
6. The paper read back carries the sentence, the table, the interval with its
   costs and the caveats — story 15.
7. Costs missing: the interval and its money say what is missing — `weibull.test.ts`
   and story 15.
8. No console error.

## 12. Maintainability
`weibull.ts` (pure), `WearPanel.tsx`, paper block `reliabilityWear.ts`. Left, each
with its number: the schedule the interval hands to (FC-063), a part's modes split
(one count each), confidence on the interval, FC-114's fit of other readings,
IEC 61649's text (GAPS).
