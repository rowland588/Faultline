# FC-094 — the capability study, made to cover what is measured, counted and passed

**Catalogue:** FC-094 (two limits), FC-095 (one limit), FC-097 (before
capability), FC-100 (pass or fail), FC-103 (the histogram) — part 1;
FC-098 (reject rate), FC-088 (its chart), FC-083 (held at a rate), FC-102
(per million and Z) — part 2; FC-099 (faults per item), FC-089 (its chart),
FC-124 and FC-125 (the defect tally and Pareto) — part 3.
**Knowledge:** `knowledge/methods/spc/capability-measured.md`,
`knowledge/methods/spc/normality-checks.md`,
`knowledge/methods/spc/zero-failure-demonstration.md`,
`knowledge/methods/spc/capability-attribute-proportion.md`,
`knowledge/methods/spc/capability-attribute-defects.md`,
`knowledge/methods/spc/held-at-rate.md`,
`knowledge/methods/spc/control-charts-attribute.md`,
`knowledge/methods/stats/confidence-intervals.md`,
`knowledge/methods/sixsigma/dpmo-sigma.md`.
**Asked for:** Rowland, 22 October — *"The process capability study is not
flexible enough whatsoever ... surely we can do a process capability on
rejection rate ... I've got no idea what the tick is ... It needs to be quite
vast"*; on 75 a minute: *"It could be a ceiling of top speed, and then also I
may want it as just time, that it has to run consistently for 75 packs per
minute for an X amount of time."* Go given the same day.
**Status:** part 1 agreed (go, 22 October) and built with this
specification — one change on validating it, in §3 (the shape test); parts
2 and 3 agreed in outline on 22 October; **parts 2–4 specified 24 October**
(W1 of `docs/TOOLS-BUILD.md`, Rowland's go of 24 October to build every
planned tool) — built with this specification, each criterion run as named.
**Part 1b — pass or fail judged by a confidence level or an allowed loss.**
Rowland, 23 October, on a live test of 4,500: *"in statistics we ask the word
confidence level. So how confident do you want to be ... or in some cases a
business has a percentage that it allows for a loss, say 98% ... that needs
to be optional for me when I pick that. Am I doing a confidence level, or am
I doing the other level? But either way, we also want to be adding confidence
as part of our language within it. At the moment, it's a little bit too
basic."* Go given the same message (*"Need you to do that now"*). Built with
this addition (§1, §3, §4, §6, §7, §11 say what part 1b adds).

## 1. Purpose
Say whether a characteristic meets what was agreed and whether it would keep
meeting it — for whatever the floor actually has: a measurement against two
limits or one, packs sold by weight, items that pass or fail, rejects out of
what was made, a rate held for a time, faults on an item. The sentence it lets
the site say to the OEM or the client: *"It holds at least 75 a minute — Ppk
1.4 from 30 minutes, the readings steady and bell-shaped"*, or *"20 of 20
passed, which proves fewer than 14 in 100 would fail — not yet 1 in 100"*.

**Scope.** Part 1, built and live 22 October (`467c313`): a measurement
between two limits (FC-094), at least or at most (FC-095); sold by weight,
the packers' three rules (as before); pass or fail, one at a time, with how
many may fail and what the count proves (FC-100); the three checks before
capability (FC-097); how sure a Ppk is; the histogram (FC-103, partly — no
median or quartiles). Not in part 1, each still planned or not built: reject
rates out of what was made (FC-098) and their p-chart (FC-088); a rate held
for a time (FC-083); faults per item (FC-099, FC-089) with their tally and
Pareto (FC-124, FC-125); per million and Z (FC-102); a fitted model for
readings that are not bell-shaped (FC-096); independence tested (FC-115);
machine capability (FC-084); money — give-away (FC-156). The screen offers
only the kinds it can do; it does not yet name the ones to come, and the
catalogue (FC-094's limits) says so.

**Scope — part 1b (23 October).** Pass or fail asks *how is it judged?* —
three ways, the first the old one: **how many may fail** (a number, as
before); **a loss allowed** — the business's rule, *at least 98% good*, so
of 4,500 checked up to 90 may fail; **a confidence level** — *95% confident
at least 98% are good*, so of 4,500 up to 74 may fail, and a count too small
to show it refused while agreeing with how many it would take. In every way
the confidence is chosen (90%, 95% or 99%) and what the count proves is said
with it — *"95% confident at least 97.6% would be good"* — on the page, its
tiles, the closing line and the paper. Not in 1b: a confidence typed freely;
an acceptance sampling plan for lots (AQL — `quality.acceptance-sampling-
attributes`, FC-not built); the same confidence words on a measurement's Ppk
(it still says *95% sure*, a wording to bring in line next).

**Scope — parts 2–4 (24 October, W1).** The same study, three more
answers to *What are you measuring?* and the pieces that hang off them:
- **Rejects out of what was made** (`kind: 'rejects'`, FC-098): each run a
  count made and a count rejected; the reject rate with its exact bounds
  against an agreed maximum; the p-chart on the runs, Laney's p′ when the runs
  are large (FC-088); per million and the equivalent Z (FC-102); money by
  FC-156's rule (rejects × a pack's materials, by fate where typed).
- **Faults found on each item** (`kind: 'faults'`, FC-099): each inspection a
  count inspected and a count of faults, each fault's kind from a short list
  the study keeps (FC-124 the tally); DPU with its exact bounds against an
  agreed maximum; the share of items with at least one fault; the u-chart, c
  when the inspections are equal, Laney's u′ (FC-089); DPMO when the
  opportunities a unit are typed (FC-102); the Pareto of kinds by count and
  by money (FC-125).
- **Held at a rate for a time** (`kind: 'rate'`, FC-083): the packs counted
  in each interval against a floor (at least) or a ceiling (at most) for an
  agreed number of intervals; met, held with gaps or not held; the longest
  stretch; made against expected; the one-sided Ppk on the interval rates.
- **Machine capability for acceptance** (FC-084): a measurement's study
  marked *consecutive parts, one machine, nothing else varying* says Cm and
  Cmk beside Pp/Ppk against the acceptance figure agreed with the OEM.
- **Not bell-shaped — read from a fitted model** (FC-096): *moved to W3
  (24 October)* — the fitted share needs `stats.distribution-fitting`
  (FC-109), which W3 builds once for every readings set; until then a leaning
  set is said so and its share outside read as measured, never from a bell
  (part 1, kept). Building the fit twice, here and in W3, is the duplication
  the standard forbids.
- **The lowest legal fill** (FC-157): a sold-by-weight study's spread turned
  into the lowest target that keeps the three rules, and what the present
  mean gives away above it, in grams and in money; FC-162 (the three rules)
  and FC-163 (volume packs checked by weight, the density typed) complete.
- **The packaging and food-safety questions that are a measurement with a
  limit** — FC-158 multihead weigher (the heads' spread and the combination's,
  stratified by head), FC-165 seal integrity (strength at least, leaks pass
  or fail), FC-167 residual oxygen (at most, leaning readings), FC-169 CCP
  monitoring (at least or at most, the margin and the probe's guard band) —
  each a mode on the same study with its own words, its agreed limit's
  source named, and its record's rules (the oxygen leaning high read as
  measured; a CCP's deviation holding product by `msa.calibration`'s rule).
Not in W1: the measured chart on its own (FC-086, W2); gauge studies (W4);
acceptance sampling plans (FC-129, FC-130, research); the inspector's ℮
reference test (FC-232, research).

## 2. Users and scenarios
A site lead, a team leader or QA at the machine on a phone (gloves off, one
hand, noise), and the same person at a desk closing it or printing it.
Scenarios: fill weight between two limits (existing); seal strength at least
12 N; a machine's speed counted each minute against a floor or its top speed;
residual oxygen at most 2% (skewed); a seal re-test of 20 packs after a fix;
rejects counted per shift on a checkweigher (part 2); a wrapper held at 75 a
minute for 30 minutes (part 2); print faults per reel (part 3).

## 3. Method selection
- Measured data with limits → Pp/Ppk (the verdict, what was seen) and Cp/Cpk
  (within, MR̄ ÷ 1.128), as now; one limit → the one-sided index.
- Before trusting an index → the three checks of `spc.normality-checks`:
  bell-shaped (the D'Agostino–Pearson K² test), steady (individuals limits
  x̄ ± 2.66 MR̄ and a run of eight), fine enough (distinct values).
  **Changed on validation, 22 October:** this specification first chose
  Anderson–Darling (it weights the tails). Validating it found that the
  floor's whole-number readings throw it: on normal readings rounded to
  whole numbers with a spread of one to two steps it rejected 32–100% at 5%
  (n 20–100, 3,000 samples a case); K² kept 5–8%, with power close to AD's
  against a lean and stronger against heavy tails
  (`scripts/knowledge/independent-cases.py`). Speeds a minute would
  otherwise have been called not bell-shaped nearly every time. AD stays in
  `src/lib/ie/dist.ts`, proved, unused by the check. Shapiro–Wilk was
  considered and not chosen: ties throw it too, and its coefficients need
  Royston's approximation.
- Not bell-shaped → not a transform yet (FC-096): the normal tail's share is
  not said; the count outside as measured, with its bound, is said instead.
- Pass or fail → the success-run bound (`spc.zero-failure-demonstration`),
  never a Cpk; the agreed verdict (how many may fail) stays the verdict.
  **Part 1b:** judged three ways, each verdict agreed before checking — a
  number that may fail (as before); a loss allowed, *at least g good*, so
  ⌊(1 − g)·n⌋ may fail — the business's rule, said beside what it proves,
  because passing it is not proof of g (4,500 checked, 90 failed passes
  *98% good* yet proves only 97.6% good at 95% confidence); a confidence
  level C, *C confident at least g good* — the demonstration test the record
  describes (`spc.zero-failure-demonstration`, "optionally the failure share
  to be shown (p₀) at a confidence"), passed when the Clopper–Pearson upper
  bound on the share failing is at most 1 − g, so the most that may fail is
  the largest k with that bound at most 1 − g.
- Rejects out of what was made (part 2) → binomial capability with
  Clopper–Pearson bounds and the p-chart, never Cpk on a percentage.
- Held at a rate (part 2) → per-interval rates against the side agreed.
- Faults per item (part 3) → Poisson DPU with exact bounds and the u-chart;
  defective units and defects never mixed.

- **Parts 2–4 (W1).** Rejects → the binomial: p̄ = ΣD/ΣN with Clopper–Pearson
  bounds (two-sided 95% and the one-sided 95% upper), the verdict against the
  agreed maximum p₀ by the upper bound (met when upper ≤ p₀; not shown yet when
  p̄ ≤ p₀ < upper; not met when p̄ > p₀), the p-chart's limits per run
  p̄ ± 3√(p̄(1 − p̄)/nᵢ), Laney's σz from the z-scores' moving range when the
  runs are large (said and applied when σz is outside 0.8–1.25), the
  equivalent Z = Φ⁻¹(1 − p̄) said as a comparison only
  (`spc.capability-attribute-proportion`, `spc.control-charts-attribute`,
  `sixsigma.dpmo-sigma`). Faults → the Poisson: DPU = ΣC/ΣN with the exact
  χ² bounds, the share with at least one fault 1 − e^(−DPU), the u-chart
  ū ± 3√(ū/nᵢ) (c when equal), DPMO = 10⁶·C/(N·opportunities) only with the
  opportunities typed and fixed (`spc.capability-attribute-defects`,
  `quality.check-sheet`, `quality.pareto`). Held at a rate → per-interval
  rates against the side agreed, the share met, the longest stretch, made
  against expected, the one-sided Ppk on the rates with Bissell's bound, the
  individuals limits for a stop or a surge (`spc.held-at-rate`). Machine
  capability → Cm = T/6s, Cmk from the nearer limit on consecutive parts
  (`spc.machine-capability`). Not bell-shaped → the fitted model's tail share
  from `stats.distribution-fitting`'s rule (the best of three by the
  probability plot's fit), said beside the measured share
  (`spc.capability-nonnormal`). The lowest legal fill → the largest of the
  three rules' required means at the study's spread (`yield.giveaway`,
  `packaging.average-quantity-system`).

**Established · assumed · chosen.**
- *Established:* Pp/Ppk from the overall spread and Cp/Cpk from MR̄ ÷ d₂
  (d₂ = 1.128) — AIAG *SPC* manual (2nd ed.), Montgomery; the normal tails;
  the individuals chart's limits x̄ ± 2.66·MR̄ and a run of eight on one side
  — the Western Electric / Nelson rules as AIAG gives them; the success-run
  relation and the exact (Clopper–Pearson, 1934) bound on a share failing;
  the D'Agostino–Pearson K² test (D'Agostino, Belanger & D'Agostino, 1990);
  Bissell's (1990) lower bound on Ppk; the tolerable negative error — the
  Weights and Measures (Packaged Goods) Regulations 2006, Schedule 2. Each
  is in `knowledge/methods/` with its source and what is still to confirm.
- *Assumed:* readings independent and in the order taken (not tested —
  FC-115); items in a pass-or-fail run alike and independent, so a run
  proves the conditions it was run under; one-sided 95%.
- *Chosen — agreed with Rowland:* capable from Ppk 1.33, just capable from
  1.00, indices from 25 readings (release 2's "go", `docs/BUILD.md`); none
  may fail unless agreed (the old rule kept).
- *Chosen — Rowland's, 23 October (part 1b):* the three ways to judge pass
  or fail, the confidence chosen with it, and confidence said in the words.
- *Chosen — this specification's for part 1b, not yet put to Rowland one by
  one:* the confidences offered, 90%, 95% (the default, as before) and 99% —
  the usual demonstration levels; the good share said rounded down to 0.1%
  (never flattering); a confidence target the count cannot reach refused while
  agreeing, with the count it would take; a loss allowed passing with what it
  proves beside it, never called proof of the share.
- *Chosen — this specification's, under the go of 22 October, not yet put
  to Rowland one by one:* the checks from 20 readings; bell-shaped at
  p ≥ 0.05; fine enough from 5 distinct values; K² rather than
  Anderson–Darling (the simulation above); a capable index on readings not
  steady or not bell-shaped never green; drift said only when the steady
  check finds a run; every "proves" share rounded up, never flattering.

- *Established (W1):* the exact binomial (Clopper–Pearson 1934) and
  Poisson (Garwood 1936) intervals; the p, np, c and u charts' limits (AIAG
  *SPC*, 2nd ed.; Montgomery); Laney's p′ and u′ (Laney 2002, via secondary
  summaries — `knowledge/GAPS.md`); the equivalent Z and the 1.5-shift
  convention (Harry & Schroeder; said as a convention); Cm/Cmk on consecutive
  parts (ISO 22514-3, scope confirmed, text unread); the three packers' rules
  and the TNE table (Weights and Measures (Packaged Goods) Regulations 2006).
- *Assumed (W1):* runs and inspections independent and alike enough to pool;
  a reject counted once (a pack is good or bad); a fault's kind from the list
  the study keeps, "other" revised when it reaches a tenth; intervals of
  equal length; the rate's floor the one agreed with the OEM or the client.
- *Chosen — this specification's for W1, under the go of 24 October, not yet
  put to Rowland one by one:* the verdict on rejects and faults by the
  one-sided 95% upper bound (the record's reading); Laney applied when σz is
  outside 0.8–1.25 and said either way; the equivalent Z and "sigma level"
  said only as a comparison with the convention named; a rate "held" when
  every interval met, "held with gaps" when the share met is at least the
  agreed share (default 90%) and the mean meets the floor, else "not held";
  the lowest legal fill's rule 3 ("none below T2") read as at most 1 in
  10,000 at the measured spread, said as the reading it is; the fault kinds
  list seeded with the study's first five words typed and kept on the study.

## 4. Inputs
Agreed before the readings (`can.agree`), on the existing `AgreedReadings`:
- **What are you measuring?** — *A measurement* (`kind: 'limits'`), *Sold by
  weight (℮)* (`'packers'`), *Pass or fail, one at a time* (`'ticks'`, the
  stored word kept so every existing study reads as before). Part 2 adds
  *Rejects out of what was made* (`'rejects'`) and *Held at a rate for a time*
  (`'rate'`); part 3 *Faults found on each item* (`'faults'`).
- A measurement: **Between two limits · At least · At most** (from which of
  `lower`/`upper` is set — no new field); the unit (free, up to 16 characters:
  g, mm, °C, N, %, a minute); the limit(s), numbers; a target, if there is one
  (`nominal`, optional); how many readings (≥ 1, default 30). The lower below
  the upper.
- Pass or fail: how many to check (default 20); **how many may fail**
  (`allowFail`, whole number ≥ 0, default 0 — "any fail fails it"); while
  agreeing, the screen says what the count would prove with that many
  allowed, and how many it takes to prove fewer than 1 in 100.
- Each reading (`StudyReading`): a number (`value`), or good/failed (`ok`);
  who and when; struck, never erased — as now.
- Part 2: per run `made`, `rejected` (and a reason per reject in part 3); for
  a rate, the interval in minutes, the side and the time it must hold, and per
  interval the packs counted.

- **Parts 2–4.** *Rejects out of what was made*: the agreed maximum reject
  rate (`maxShare`, % — "at most 1% rejected"), how many runs to record
  (`count`, default 10); each run a reading with `made` and `rejected` (whole
  numbers, rejected ≤ made), who and when; a pack's materials and the fates
  as FC-156 has them. *Faults found on each item*: the agreed maximum faults
  per item (`maxShare`, as DPU in % — "at most 2 faults per 100 items"), how
  many inspections (`count`, default 10), the opportunities a unit if DPMO is
  wanted (`opportunities`, optional); each inspection a reading with
  `inspected`, `faults` and the tally by kind (`kinds`, a record of kind →
  count summing to `faults`; the kinds list on the agreement, `faultKinds`,
  up to twelve words). *Held at a rate*: the side and the limit as a
  measurement (`lower` the floor or `upper` the ceiling, in the line's unit a
  minute), the interval in minutes (`intervalMin`, default 1), how many
  intervals (`count` — the time it must hold is count × interval), the share
  of intervals that must be met for *held with gaps* (`heldShare`, default
  90); each interval a reading with `value` = the packs counted in it. *Machine
  capability*: a tick on a measurement's agreement (`machine: true`) and the
  acceptance figure agreed (`cmkAgreed`, default 1.67, said as the OEM's).
  *Lowest legal fill*: nothing new — read from a packers study. *Oxygen,
  seal, CCP, weigher*: the measurement's inputs with the study's `question`
  word (`'oxygen' | 'seal' | 'ccp' | 'weigher'`) choosing the sentences and,
  for the weigher, a head per reading (`head`, a small whole number).

## 5. Data suitability
- Indices from 25 readings (unchanged, `CPK_FROM`), with the 95% lower bound
  on Ppk (Bissell) so few readings read as rough.
- The three checks from 20 readings (`CHECK_FROM`); before that, "said from
  20 readings".
- Bell-shaped: p ≥ 0.05 on K²; the larger of its two parts says whether
  the readings lean (and which way, by the skew) or their tails differ from
  a bell's. Large samples reject trivial departures — the histogram is
  drawn beside the sentence so a person can judge.
- Steady: no reading outside x̄ ± 2.66·MR̄ and no run of eight on one side of
  the mean.
- Fine enough: at least 5 different values among the readings; fewer → the
  shape and the index are said to be rough because of the scale.
- Pass or fail: any number; the bound says what it proves.
- Independence is assumed and not tested in part 1 (FC-115 later).

- **Parts 2–4.** Rejects and faults: from 3 runs or inspections the pooled
  rate and its bounds are said; the chart from 5; a verdict never green while
  the chart has a run or an inspection outside its limits (the pooled rate is
  not one process). Held at a rate: the share met from the first interval; the
  Ppk on the rates from 25 intervals as for a measurement; a stretch is
  consecutive met intervals. Machine capability: 50 consecutive parts (the
  usual), said as rough below 30. The lowest legal fill needs the packers
  study's spread from 25 readings. Independence of runs is assumed and said.

## 6. Calculations
Measured (unchanged, `src/tools/capability/sample.ts`): s (n − 1), MR̄/1.128,
Pp, Ppk, Cp, Cpk, normal tails (`upperTail`). New in `src/lib/ie/dist.ts`:
- Φ⁻¹ (Acklam's rational approximation with one Newton step, ≈1e-9).
- D'Agostino–Pearson K² = Zs² + Zk² (the skewness test, D'Agostino 1970;
  the kurtosis test, Anscombe & Glynn 1983), p = e^(−K²/2), from 20
  readings (`knowledge/methods/spc/normality-checks.md` gives the formulas).
  Anderson–Darling (A², A*², the D'Agostino–Stephens p) is kept in `dist.ts`, proved, and not said.
- Skew = (n/((n − 1)(n − 2))) Σ((x − x̄)/s)³ (the adjusted sample skewness).
- Bissell's 95% lower bound on Ppk: P̂pk − 1.645·√(1/(9n) + P̂pk²/(2(n − 1))).
- Binomial: P(X ≤ f) by summing terms in logs (log-gamma by Lanczos);
  Clopper–Pearson one-sided upper bound by bisection on p; zero failures in
  closed form 1 − (1 − C)^(1/n); items needed for p₀ with none failing
  ⌈ln(1 − C)/ln(1 − p₀)⌉.
- Histogram: k = clamp(round(√n), 5, 12) bars on a round width.
- Part 1b: the most that may fail for *C confident at least g good* —
  k* = max{k : B_C(k + 1, n − k) ≤ 1 − g}, B_C the Beta quantile (the
  Clopper–Pearson one-sided upper bound, `binomUpper`, monotone in k), found
  by bisection on k; −1 when even none failing cannot show it (then the items
  it takes, `itemsToShow(1 − g, C, 0)`). A loss allowed: ⌊(1 − g)·n⌋, worked in
  hundredths so 98% of 4,500 is 90, never 89.
Rounding: indices 2 dp; shares said in words ("about 2 in 1,000", "fewer than
14 in 100"); the bound rounded up to a whole number in 100 (never flattering).
**Independent cases** (unit tests in `src/lib/ie/__tests__/dist.test.ts`):
Φ⁻¹ and the binomial bounds against SciPy (`scripts/knowledge/independent-cases.py`,
run once, numbers pasted); K²'s two parts, K² and p against SciPy's
skewtest, kurtosistest and normaltest on six sets (one difference: for skew
exactly 0 SciPy swaps y = 0 for 1 — the formula gives Zs 0); the AD p-value
against the published 10%, 5% and 1%
critical values of A*² (0.631, 0.752, 1.035 → p ≈ 0.10, 0.05, 0.01); A² for
fixed readings against `scipy.stats.anderson`; zero-failure n against the
closed form (20 → 13.9%, 59 → 4.95%, 299 → 0.996%); Bissell's bound checked
for coverage by simulation in the same script (≈ 95% of simulated samples'
bound below the true Ppk, for n = 30, 50, 100).
**Independent cases, part 1b** (`scripts/knowledge/independent-cases.py`,
run 23 October, numbers pasted into `dist.test.ts` and `sample.test.ts`): the
most that may fail — 4,500 at 98% good: 74 at 95%, 77 at 90%, 68 at 99%;
300 at 98%, 95%: 1; 149: 0; 148 and 20: none can show it; 1,000 at 99%,
95%: 4; 50 at 90%, 90%: 1; 500 at 95%, 99%: 13. Zero failures at 90% and
99%: n 20 → 0.108749, 0.205672; 59 → 0.038275, 0.075085; 300 → 0.007646,
0.015233. Items to show 2% none failing: 114 (90%), 149 (95%), 228 (99%).
What a loss allowed proves: 90 failed of 4,500 → 0.022948 (90%), 0.023785
(95%), 0.025408 (99%); 70 of 4,500 → 0.018946 (95%); 2 of 50 → 0.102959
(90%), 0.157704 (99%).

**Calculations — parts 2–4** (`src/lib/ie/dist.ts` and
`src/tools/capability/sample.ts`; independent cases in
`scripts/knowledge/cases-w1.py`, run 24 October, numbers in
`dist.test.ts` and `sample.test.ts`):
- Rejects: p̄ = ΣD/ΣN; two-sided 95% bounds B(0.025; D, N − D + 1) and
  B(0.975; D + 1, N − D) (0 and 1 − 0.05^(1/N) when D = 0); the one-sided
  upper B(0.95; D + 1, N − D) (`binomUpper`); per million 10⁶·p̄; Z =
  Φ⁻¹(1 − p̄), Ppk-equivalent Z/3, sigma level Z + 1.5; per run limits
  p̄ ± 3√(p̄(1 − p̄)/nᵢ), the lower cut at 0; Laney: zᵢ = (pᵢ − p̄)/σpᵢ, σz =
  MR̄(z)/1.128, limits p̄ ± 3·σpᵢ·σz when σz is outside 0.8–1.25. Case: six
  runs 4,800/24, 5,100/31, 4,650/19, 5,000/28, 4,900/41, 5,200/22 → N 29,650,
  D 165, p̄ 0.00556 (5,565 per million), 95% 0.00475–0.00648, upper 0.00633;
  no run outside the plain limits (run 5 at 0.00837 against 0.00875); z
  −0.53, 0.49, −1.36, 0.03, 2.64, −1.29, MR̄(z) 2.158, σz 1.913 — Laney's
  limits apply; Z 2.54, Ppk-equivalent 0.85, sigma 4.04; against 1% met
  (upper ≤ p₀); against 0.5% not met (p̄ above p₀); zero in 2,000 → upper
  0.00150.
- Faults: DPU = ΣC/ΣN; bounds χ²(0.025; 2C)/(2N) and χ²(0.975; 2C + 2)/(2N);
  one-sided upper χ²(0.95; 2C + 2)/(2N) (`poissonUpper`, by the gamma
  quantile — the Poisson CDF summed in logs and bisected); share with a
  fault 1 − e^(−DPU); u-chart ū ± 3√(ū/nᵢ); c-chart c̄ ± 3√c̄ when every n is
  equal; DPMO = 10⁶·C/(N·k). Case: inspections 200/9, 200/14, 250/11, 200/6,
  300/17 → N 1,150, C 57, DPU 0.0496, 95% 0.0375–0.0642, upper 0.0618, share
  with a fault 0.0484; u limits for n 200 0.0023–0.0968; DPMO with 6
  opportunities 8,261, Z 2.40, sigma 3.90; zero in 300 → upper 0.00999;
  c-chart on the three equal inspections c̄ 9.67, 0.34–18.99. Tally: light
  pack 31, open seal 23, mis-label 9, crushed 4, wrong date 2 — shares
  44.9, 33.3, 13.0, 5.8, 2.9%, the top two 78%; by money at 42p a pack for
  a lost pack and 5p for a relabel: light pack £13.02, open seal £9.66,
  crushed £1.68, mis-label £0.45, wrong date £0.10 — the money order differs
  from the count order from the third kind.
- Held at a rate: rᵢ = valueᵢ ÷ intervalMin; met by the side; share met;
  longest stretch × interval; made Σvalue against floor × minutes; Ppk =
  (r̄ − floor)/3s (or (ceiling − r̄)/3s) with Bissell's bound; the
  individuals limits on rᵢ. Case (`cases-spc.py`): 25 one-minute counts
  against 60 → met 18 of 25 (72%), longest stretch 7 min, made 1,523 against
  1,500 (1.015), one-sided Ppk 0.10, lag-1 autocorrelation 0.07.
- Machine capability: Cm = (U − L)/6s, Cmk = min(U − x̄, x̄ − L)/3s on the
  consecutive readings' own s. Case: 50 parts, mean 400.29, s 0.773, limits
  398–403 → Cm 1.08, Cmk 0.99 against 1.67 agreed — not accepted.
- Lowest legal fill: the required means — rule 1 the nominal; rule 2
  nominal − TNE + Φ⁻¹(0.975)·s; rule 3 nominal − 2·TNE + Φ⁻¹(0.9999)·s — the
  largest is the lowest target; give-away a pack = present mean − lowest
  target, in money by FC-156's £/kg. Case: nominal 400 g, s 2.1, TNE 12 →
  rule 1 binds (400.00), rule 2 needs 392.12, rule 3 383.81; a mean of 402.5
  gives 2.50 g a pack away. With s 6 g rule 2 needs 399.76 — still the
  nominal binds; at 7 g rule 3 (none below T2) binds first, at 402.03 — a
  wide spread raises the lowest legal target above the nominal, and that
  rise is the spread's cost (the spec's arithmetic, in the test).
- Not bell-shaped (FC-096): the fitted share outside from the best of normal,
  lognormal and Weibull by `stats.distribution-fitting`'s rule, with the
  measured share beside it; never a Ppk.

## 7. Outputs
Screen and paper together:
- The verdict and the first sentence as now. For pass or fail: *"20 of 20
  good — Passed."* / *"18 of 20 good — 2 failed (no. 7, no. 12), at most 1
  allowed — Didn't pass."* / *"8 of 20 checked — all good so far."*
- Under it, **what it proves**: *"That proves fewer than 14 in 100 would
  fail (95% sure); to show fewer than 1 in 100 takes 299 good in a row."*
  (with failures: *"… 2 failed in 50 proves fewer than 13 in 100 …"*).
- The capability sentence as now, with **how sure**: *"Capable: Ppk 1.45 from
  30 — 95% sure at least 1.05."* When the readings are not steady, a capable
  or just-capable sentence ends *"— but the readings were not steady, so it
  may not hold"* and is never green. When they are not bell-shaped, the
  normal tail's share is replaced by *"as measured, 2 of 30 are outside"*,
  and a capable sentence ends *"— but the readings are not bell-shaped, so
  read the index as rough"*, never green (added on building: the index
  itself assumes the bell). The run's drift (Cpk well above Ppk) is said
  only when the steady check finds a run, or cannot look; readings beyond
  the limits alone are named by the check, not called drift (found on the
  oxygen readings: one spike, not a drift).
- **Before capability** — three sentences, each with its tone:
  *"Bell-shaped enough (D’Agostino–Pearson p 0.41)."* · *"Not bell-shaped —
  they lean high (skew 1.3, p 0.002): the share outside is read from the
  readings, not the bell."* · *"Not bell-shaped — the tails are heavier than a
  bell’s (p 0.03): …"* · *"Steady across the run."* · *"Not steady — reading 23 is
  outside 398.9–403.5 and 8 in a row sat above the mean from no. 14."* ·
  *"Only 3 different values were read — the scale is too coarse to show the
  spread; the shape and the index are rough."* Before 20 readings: *"Said from
  20 readings — 12 so far."*
- **The histogram** beside the readings in order, the limits and target drawn,
  bars outside the limits red.
- Tiles: pass or fail — Checked (of agreed), Failed (of allowed), Proves
  (fewer than x in 100), Verdict; measured — as now, Ppk's line adding "95%
  sure at least …".
- Paper (`src/lib/studiesPdf.ts`): pass or fail gets its cells, its results
  row (good / failed by number) and what it proves; measured gets the
  histogram and the three sentences.
- Money: none in part 1 (said in the catalogue: give-away FC-156 and rejects
  FC-098 carry it).
- Agreed words: *"at least 12 N, 30 readings"*, *"pass or fail each, 20 —
  none may fail"* / *"at most 1 may fail"*.
- **Part 1b.** While agreeing pass or fail: *How is it judged?* — three chips
  (*How many may fail* · *A loss allowed* · *A confidence level*), each with
  its example; the box its way needs (how many may fail, or at least what %
  good); *Confidence* — 90% · 95% · 99%; and the plan in a sentence from the
  module: *"At least 98% good: up to 90 of 4,500 may fail. If 90 fail it
  passes, and that proves, 95% confident, at least 97.6% would be good."* /
  *"95% confident at least 98% good: of 4,500 checked, up to 74 may fail."* /
  refused: *"With 20 checked, even none failing shows only 86.0% good, 95%
  confident — check at least 149."* The verdict sentence names the rule:
  *"4,430 of 4,500 good — 70 failed, at most 74 for 98% good, 95% confident
  — Passed."* What it proves, in every way: *"We can be 95% confident at
  least 98.1% would be good"* (with fewer than 1 in 100 not yet shown: *"…;
  to show fewer than 1 in 100 fail takes …"*, as before, for a count). The
  tiles: Checked · Failed (of how many may, and the rule) · **Confident**
  (*≥ 98.1% good*, *95% confident*) · Verdict. Agreed words: *"pass or fail
  each, 4,500 — at least 98% good (up to 90 may fail)"*, *"… — 95% confident
  at least 98% good (up to 74 may fail)"*, a count's *"at most 1 may fail"*
  with *"· 99% confident"* when not 95%. An older study reads as before but
  in the confidence words (*"95% confident"* where it said *"95% sure"*).

**Parts 2–4 on screen.** *What are you measuring?* gains three cards —
*Rejects out of what was made* (eg: a shift's rejects against the packs made),
*Faults found on each item* (eg: a pack inspected for seal, label, print),
*Held at a rate for a time* (eg: at least 75 a minute for 30 minutes) — and
the measurement card a *Which question?* row (a measurement · oxygen in a
pack · a seal · a CCP · a weigher's heads · one machine's parts) that only
changes the words and the extra box each needs. Capture: rejects — two boxes
(made, rejected) and Add; faults — inspected, faults, and a tap per kind
(the study's kinds as chips with a count each, Other typed); a rate — the
interval's packs on the pad, each Add one interval. Sentences, each from the
module: rejects — *"165 rejected of 29,650 made — 0.56% (5,565 per million),
95% confident between 0.48% and 0.65%; at most 1% agreed — Met."* /
*"… at most 0.5% agreed — Not met: 0.56% is above it."* / *"… 0.4% so far,
but the bound is 0.63% — not shown yet; about 8,000 more at this rate."*
/ the chart's reading *"Run 5 (41 of 4,900) is above the chart's limit —
one process it is not; find what that run did."* / *"Runs this large vary
more than the count alone says (σz 1.9): Laney's limits are drawn."* /
*"Compared with a measurement: Z 2.54, about Ppk 0.85 (a comparison only)."*
Faults — *"57 faults on 1,150 items — 0.050 a item (5.0 per 100), 95%
confident 0.038–0.064; about 4.8% of items carry a fault; at most 2 per 100
agreed — Not met."* / the tally's Pareto line *"Light packs and open seals
are 78% of the faults — and 87% of the money."* / DPMO when typed *"8,261
per million opportunities (6 an item) — Z 2.4, a 3.9-sigma process by the
1.5-shift convention."* Held at a rate — *"At least 60 a minute for 25
minutes: met 18 of 25 (72%), the longest stretch 7 minutes, 1,523 made
against 1,500 — Held with gaps; a dip to 54–55 at minutes 8–9."* / *"Not
held — the line averaged 58.2 a minute."* / *"Held — every minute at or
above 60."* Machine capability — *"Cm 1.08, Cmk 0.99 on 50 consecutive
parts against 1.67 agreed — Not accepted; the spread alone would need to
halve."* Lowest legal fill (on a packers study) — *"At this spread the
lowest target that keeps the three rules is 400.0 g (rule 1 binds); the
mean of 402.5 gives 2.5 g a pack away — £0.85 a 100 packs at £3.40 a kg."*
Tiles per mode: rejects — Made · Rejected · Rate (of at most p₀) · Confident
(95%, between a and b) · Verdict; faults — Items · Faults · Per item · Top
kind · Verdict; rate — Intervals met (of count) · Longest stretch · Made (of
expected) · Verdict. Pictures: rejects and faults the p/u chart (a bar a run
with the limits, a run outside red) and the faults' Pareto (bars by kind,
the cumulative line, money beside count on a toggle); a rate the intervals
as bars against the floor line with the met ones teal and the missed amber.
Money by FC-156's rows: rejects × materials (by fate where typed), faults'
Pareto by money, the fill's give-away by £/kg, a rate's shortfall × the
line's contribution a pack where the line has one — each said with its
source or the missing input named.

**The report.** The study's own paper (*This study on paper (PDF)*, built by
`src/lib/studiesPdf.ts` on the report engine) and every list's paper carry,
from the same module as the screen: the band with the verdict and where it
sits; the tiles; *What it says* — the verdict sentence and the second
sentence (how sure the Ppk is, or what a pass proves); for a measurement the
figures row (readings, mean, range, outside, Ppk, 95% sure, Cpk), *Before
capability* (the three checks, the abnormal in amber), *How the readings
spread* (the histogram with the limits drawn) and every reading in order,
outside in red, struck said; for pass or fail the cells (checked, failed,
may fail, what it proves) and every item good or failed by its number; the
action plan and the closing line; the receipt once closed. PDF only — the
format the study already had. Not printed yet: each reading's time, and
money (none in part 1).
**The report, part 1b.** Pass or fail's cells on paper: Checked · Failed ·
May fail (with the rule — *at least 98% good*, *98% good, 95% confident*) ·
**Confident** (*95% confident at least 98.1% good*); the sentences as the
page says them; the agreed words with the rule and the confidence.

**The report — parts 2–4.** The study's paper and every list's paper carry,
from the same module: rejects — the cells (Made · Rejected · Rate · 95%
between · Agreed at most · Verdict), the runs' table (run, made, rejected,
rate, the chart's limits, outside marked), the chart, the sentences
including the chart's and the comparison's; faults — the cells (Items ·
Faults · Per item · 95% between · Agreed · Verdict), the inspections' table,
the u-chart, the tally with shares and money and its Pareto, DPMO when
typed; a rate — the cells (Intervals met · Longest stretch · Made of expected
· Ppk on the rates · Verdict), the intervals as bars, the misses listed;
machine capability — Cm and Cmk beside Pp/Ppk with the agreed figure; the
lowest legal fill — its sentence and the three rules' means under the
packers' figures. PDF, the format the study has.

## 8. Manufacturing usability
Set up in one screen: the question as three chips with an example under each;
a measurement's side as three chips with examples ("speed at least 75 a
minute", "oxygen at most 2%"); only the boxes the choice needs. Taking
readings unchanged (the number pad, ↵). Pass or fail: two big buttons, **✓
Good** and **✗ Failed**, the count climbing. Everything else on the lean
page's order: band, tiles, says (with the checks), picture (readings in order
and the histogram), every reading, act, action plan, closing line.

## 9. Failure handling
- No limit typed for a measurement → "Type the limit — at least …" refused.
- Lower not below upper → refused, as now. Non-numbers → refused.
- How many may fail not a whole number ≥ 0, or ≥ how many to check → refused
  ("At most 19 of 20 may fail").
- Every reading the same → the existing "spread 0" sentence; the checks say
  the scale is too coarse.
- Fewer than 20 readings → the checks wait, said so; fewer than 25 → no index.
- A struck reading → counts for nothing in every figure, as now.
- Old studies: `allowFail` absent → 0 (the old rule, any fail fails); a
  one-sided study made by leaving a box blank reads as *At least* / *At most*.
- A client (read-only) sees everything and can change nothing (`can.agree`,
  `can.edit` as now).

## 10. Integration
- Record: `studies` (`agreed.readings`, `facts.readings`) — JSON; `allowFail`
  is one optional number in `agreed`; no migration (the cloud checks the tool
  name, not the JSON). Parts 2–3 add optional `made`, `rejected`, `minutes`,
  `faults` on a reading — JSON too.
- Shows where a capability study shows: its page, its paper, the list row
  (`studyLine`), a test it proves (Commission's square `squareWord`, the
  drawer's "Proved by"), Needs you ("readings still to take"), before → after
  (`compareSamples`), Make it better, the line's tile, the 6M fishbone.
  Pass or fail's words change everywhere through `sampleSays`.
- Access unchanged. Sync unchanged. PAGES.md: the capability page adds *before
  capability* and *the histogram*; the inventory checks them on the seeded study.
- The front door's line for the tool changes to say one or two limits and
  pass or fail.

## 11. Verification
- Unit: `src/lib/ie/__tests__/dist.test.ts` (the independent cases above);
  `src/tools/capability/__tests__/sample.test.ts` extended (one-sided, the checks on
  skewed, drifting and coarse readings, pass or fail with failures allowed,
  old studies unchanged).
- Acceptance: `scripts/acceptance/capability-kinds.mjs` — a speed study at
  least 75 a minute, 30 readings, its sentences as the module says; skewed
  oxygen readings at most 2%, the shape said and the share as measured; a
  drifting run said not steady and never green; a pass-or-fail re-test with
  one allowed, failing then passing, what it proves; the paper read back for
  each; the phone. Added to the gate in CLAUDE.md; `ecosystem-capability.mjs`
  still passes unchanged (the old journey).
- Screens compared before and after (`--shots`).

**Acceptance criteria.** Each proved as named, all run in gate 28 (44 of 45 steps green; the page inventory, red under load, rerun green under load after its fix).
1. Φ⁻¹, the binomial and its exact bounds, items to show a share, K² and
   its two parts, A², skew, Bissell's bound, the individuals limits, the run
   of eight, the histogram and the rounded-up share agree with SciPy or
   published values — `src/lib/ie/__tests__/dist.test.ts`.
2. One limit: Ppk from that side alone, the words "at least" / "at most" —
   `sample.test.ts` ("one limit, and ticks").
3. Pass or fail: the verdict with how many may fail, a second failure
   failing it at once, a struck failure counting for nothing, what the count
   proves and what 1 in 100 would take, said while agreeing, too many
   allowed refused — `sample.test.ts` ("pass or fail — …").
4. The checks: bell-shaped, leaning or heavy-tailed, not steady (beyond the
   limits, a run), too coarse; said from 20; never green when the readings
   cannot support the index; the share as measured when not bell-shaped; a
   lone spike not called drift — `sample.test.ts` ("before capability —
   …"), `src/lib/__tests__/audit-ie-sample.test.ts`.
5. Every study made before 22 October reads as before —
   `sample.test.ts`; `scripts/acceptance/capability-kinds.mjs` step 6.
6. The question first, only the boxes a side needs, refused with no limit;
   a speed at least 75 a minute end to end — every sentence, check, tile and
   the closing line as the module says; the histogram's bars and limit —
   `capability-kinds.mjs` step 1.
7. Oxygen at most 2%, then 0.6%: leaning high, not steady, capable never
   green, then the share as measured with its bars red — step 2.
8. A creeping run said not steady, never green — step 3.
9. Pass or fail end to end on ✓ Good / ✗ Failed, struck, passed with one
   failed, the tiles — step 4.
10. Each study's PDF downloaded and read back — step 5; the old journey's
    paper — `scripts/acceptance/audit.mjs` 3, `ecosystem-capability.mjs`.
11. The phone: the question's cards inside the screen, the two buttons big
    enough for a gloved thumb — step 7.
12. The page shows the checks and the histogram — `scripts/inventory.mjs`
    (docs/PAGES.md).
13. Nothing else broke — the full gate 28.

**Acceptance criteria — part 1b** (23 October; each run as named before it
ships):
14. The most that may fail for a confidence target, the zero-failure bounds
    at 90% and 99%, and what a loss allowed proves, against SciPy —
    `dist.test.ts` ("most may fail — …").
15. A loss allowed: 98% of 4,500 lets 90 fail, 91 fails it at once, what it
    proves said beside it — `sample.test.ts` ("pass or fail by a loss
    allowed").
16. A confidence level: 95% confident of 98% good of 4,500 lets 74 fail, 75
    fails it; 20 refused while agreeing with the 149 it takes; 90% and 99%
    move the count — `sample.test.ts` ("pass or fail by a confidence level").
17. Every way says what the count proves with its confidence, in the
    confidence words; a study made before reads as before in those words —
    `sample.test.ts`; `capability-kinds.mjs` step 6.
18. On the page: the three ways and the confidence chosen, the plan said
    while agreeing, a target the count cannot reach refused, ✓ / ✗ to a pass
    and to a fail at once, the tiles and the closing line as the module says
    — `capability-kinds.mjs` step 8.
19. On paper: the rule and the confidence in the cells and the agreed words,
    read back — `capability-kinds.mjs` step 8.
20. The phone: the three ways and the confidence inside the screen —
    `capability-kinds.mjs` step 8.
21. Nothing else broke — the full gate.
**Acceptance criteria — parts 2–4** (W1, 24 October; each run as named
before it ships, in `scripts/acceptance/capability-kinds.mjs` steps 9–14 and
the unit tests):
22. The binomial two-sided bounds, the Poisson exact bounds (`poissonUpper`,
    `poissonLower`), the p and u limits, Laney's σz, Z and the sigma level,
    Cm/Cmk and the three rules' required means agree with SciPy
    (`cases-w1.py`) — `dist.test.ts` ("parts 2–4 — …").
23. Rejects: the six runs' p̄, bounds, verdicts against 1% and 0.5%, "not
    shown yet", Laney applied at σz 1.9, Z 2.54, zero in 2,000 —
    `sample.test.ts` ("rejects out of what was made").
24. Faults: DPU, bounds, the share with a fault, the u and c limits, DPMO
    with 6 opportunities and none without, the tally's shares and money
    order — `sample.test.ts` ("faults found on each item").
25. Held at a rate: the 25 minutes' share met, stretch, made against
    expected, Ppk 0.10, held / held with gaps / not held by the rule, a
    ceiling the same way — `sample.test.ts` ("held at a rate").
26. Machine capability and the lowest legal fill as the cases say
    (`sample.test.ts`, "machine capability … lowest legal fill"); the
    questions — oxygen's highest pack and how many over, read as measured; a
    seal's weakest against its minimum with leaks a study of their own; a
    CCP's margin, the probe's bias as a guard band (a reading inside it not
    shown safe, red), a deviation holding product — `sample.test.ts`
    ("oxygen, a seal and a CCP"); a weigher's heads — the head means, the
    far head, the one-way ANOVA against SciPy's f_oneway (`dist.test.ts`
    "part 4", `cases-w1.py`); a volume pack's nominal and TNE in grams from
    the millilitres and the density, the volume table's band not the
    weight's — `sample.test.ts` ("a weigher's heads … volume pack").
27. Every study made before reads as before — `sample.test.ts`;
    `capability-kinds.mjs` step 6.
28. On the page: rejects end to end — the card, the maximum agreed, six runs
    typed, every sentence, the p-chart with its limits and none outside,
    Laney said, the tiles, the money with materials typed, the verdict moving
    to *not met* at 0.5% — `capability-kinds.mjs` step 10.
29. Faults end to end — the kinds as chips, inspections tapped, the tally,
    the Pareto by count and by money, DPMO after the opportunities are typed,
    the verdict — step 11.
30. Held at a rate end to end — at least 60 a minute for 25, the intervals
    on the pad, met and missed bars, the stretch, *not held* at 90% and *held
    with gaps* at 70% — step 12.
31. A measurement's question row — oxygen, seal, CCP, weigher, one machine —
    each changing the words and its box: Cm/Cmk said on the machine's parts
    against the Cmk agreed (step 13); a CCP asking where its limit comes from
    and the probe's bias, its note with the guard band and the deviation,
    red (step 13b); the weigher's Head box on the pad, the heads compared and
    the heavy one found by the ANOVA, the last reading saying its head
    (step 13c).
32. The lowest legal fill on a sold-by-weight study, in grams and money —
    step 14; a volume pack checked by weight — the millilitres typed, the
    nominal in grams not asked, the density asked, the nominal kept in grams
    and the rules said in grams — step 14b.
33. Each on paper, read back: the cells, the tables, the charts, the Pareto,
    the CCP's guard band, the heads' table and each reading's head — step 15;
    the phone — the six cards and the two-box capture fit — step 15.
34. The directory and the catalogue: FC-098, FC-099, FC-102, FC-083, FC-084,
    FC-088, FC-089, FC-124, FC-125, FC-157, FC-158, FC-162, FC-163, FC-165,
    FC-167, FC-169 available, FC-094 available, FC-096 to-build with its
    reason (W3) — `catalogue.test.ts`; `scripts/acceptance/tools-directory.mjs`
    unchanged and green.
35. `docs/PAGES.md` says the capability page shows the new pictures;
    `scripts/inventory.mjs` green; the page compared with live (`--shots`,
    `--compare`) — nothing moved on the measurement study.
36. Nothing else broke — the gate.

*Not yet proved:* use on the floor on a real phone with gloves; the
screens were not compared with live (`--shots`, `--compare`) before part 1
shipped — to do at the next change; the thresholds chosen above have not
been put to Rowland one by one.

## 12. Maintainability
Arithmetic stays in `src/lib/ie/` (`sample.ts` the study, `dist.ts` the
distributions — shared later with reliability and sampling, which keep their
own until changed for a reason). Parts 2 and 3 add kinds to `AgreedReadings`
and branches to `sample`/`sampleSays`, not a second tool: one capability
study, many kinds, as the catalogue's modes (FC-098, FC-083, FC-099) say.
Part 4 adds the questions' notes (`modeNotes`: question, weigher, density)
beside the machine's and the fill's, from `./modes`, drawn by the same loop
on screen and on paper. Left for later: the non-normal model (FC-096, W3),
autocorrelation (FC-115), a CCP's compliance and held product, a kind's own
cost on the Pareto.
