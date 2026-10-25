# FC-061 — Reliability growth on the Reliability study: is the new machine getting better, and when will it reach its MTBF?

**Catalogue:** FC-061 reliability growth during commissioning (Crow–AMSAA) — a
*mode* of FC-058. **Knowledge:** `maintenance.reliability-growth`,
`maintenance.mtbf-failure-rate`, `commissioning.ramp-up`. **Asked for:** the
catalogue ("A new line stops a lot and we need to know if the fixes are working
fast enough"); Rowland, 25 October: go for every entry that can honestly be
built. **Written 25 October 2026, before any code, by the builder (the owner
asked not to be asked).**

## 1. Purpose
A new line stops often in its first weeks and less as faults are found and
fixed. An MTBF over the whole period hides that: the average since install is
half the machine's MTBF today. Crow–AMSAA fits the failures against the running
time as a power law and says whether the failure rate is **falling, steady or
rising**, what the MTBF is **now** (not averaged since day one), and how much
more running it takes to reach the MTBF agreed — if the fixing keeps pace. It
is the honest way to tell an OEM whether their fixes are taking, with a curve
and not an anecdote. The sentence: *"The wrapper is bedding in: failures are
coming half as fast as at the start (β 0.51, 90% sure 0.31–0.75); its MTBF now
is about 281 h against 143 h averaged since install; at this rate it reaches the
400 h wanted after about 2,100 h more running — if the fixing keeps pace."*

**Scope.** This build covers, for a count where *Track growth* is ticked at
set-up (a machine bedding in): the fit on the count's failures against the
**running time** (the study's watched running time, less timed stops — never the
clock on the wall); β̂ with its exact 90% interval, the unbiased β̄, λ̂; the
cumulative MTBF and the **instantaneous MTBF now**; the growth rate 1 − β̂;
the reading in words (improving · getting worse, only when the 90% interval is
clear of 1; else no sign yet, saying which way it leans); the **projection** of the running time to
reach the MTBF wanted, as an *if*; the picture (failures against running time,
the fitted curve and the steady-rate line); the tiles, sentence, closing line and
paper. It does **not** cover: a goodness-of-fit test (the Cramér–von Mises
statistic needs the handbook's critical values, **not read** — so the page does
not run it and says so; the picture is the check); a bound on the
instantaneous MTBF (needs the handbook's tables); failure-truncated tests (the
watch always ends at a time, not at a failure); several machines pooled (one
study is one machine); the stage-gate project's commissioning paper (the record
names it — left, the study's own paper carries it); anything on dates (the
projection is in running hours, never a date).

## 2. Users and scenarios
The commissioning engineer on a new flow wrapper in its first weeks, watching a
few hours a day and tapping each failure; the project lead at the handover
meeting with the OEM: "is it improving, and at what rate". (1) Fourteen failures
in 2,000 running hours (the record's case): improving, β 0.51. (2) A steady
machine: no sign either way. (3) A machine whose failures bunch late: getting
worse — a design or installation problem, not bedding in. (4) Six failures: not
yet fitted — eight are needed.

## 3. Method selection
The power-law (Crow–AMSAA) model for a repairable system, N(t) = λtᵝ, fitted by
maximum likelihood for a time-truncated test (MIL-HDBK-189C; IEC 61164 — from
knowledge, texts not read). β < 1: the rate is falling; β = 1: a steady rate
(and an MTBF is the right figure); β > 1: rising. *Alternatives:* the Laplace
trend test, which the study already says in words from four events and which
agrees in sign (kept; this adds the size of the change and the projection);
a Weibull on the failure times (a part's life, not a repairable machine —
FC-060). The fit is **unsuitable** when the failure definition changed, the
machine changed or two machines were pooled — said on the page.

**Established · assumed · chosen.**
- *Established:* for failures at running times t₁…tₙ and the test ending at T:
  β̂ = n ÷ Σ ln(T ÷ tᵢ), λ̂ = n ÷ T^β̂, the unbiased β̄ = (n − 1) ÷ n × β̂; the
  intensity at T is λ̂β̂T^(β̂−1), so the **instantaneous MTBF = T ÷ (n β̂)**
  (MIL-HDBK-189C, from knowledge).
- *Established (derived and simulated, `scripts/knowledge/cases-w5.py`):* given n
  failures the (tᵢ ÷ T)^β are order statistics of uniforms, so 2β Σ ln(T ÷ tᵢ)
  is χ² with 2n degrees of freedom, hence the **exact 90% interval on β**: β̂ ×
  [χ²₀.₀₅(2n) ÷ 2n, χ²₀.₉₅(2n) ÷ 2n]. Its coverage was 90.6% in 4,000
  simulated machines (target 90%).
- *Established:* the running time to reach an instantaneous MTBF M, when β̂ < 1:
  T_M = (1 ÷ (M λ̂ β̂))^(1 ÷ (β̂ − 1)) — valid only while the growth continues at
  the same rate.
- *Assumed:* one machine, one definition of a failure kept throughout, the
  fixing continuing as it has.
- *Chosen (the builder, 25 October — the owner asked not to be asked):* fitted
  from **8** failures (the record: "at least 8–10 for a β worth quoting; early,
  β swings wildly — wait"), called rough under **20** (the record: "20+ to see a
  change of slope"); the reading is *beyond doubt* only when the 90% interval is
  clear of 1, else "looks like … but not yet sure"; the MTBF wanted is the count's
  existing *MTBF wanted*, read as the instantaneous MTBF wanted at handover; the
  projection is not given when it is more than **20 times** the running so far
  ("not within sight at this rate"). The page prints each of these where its
  figure is read.

## 4. Inputs
At set-up, per count: **Track growth** (tick). Read: the count's failures'
cumulative running time and the total running time T (already worked out by the
study), the MTBF wanted. Nothing else typed.

## 5. Data suitability
Under 8 failures: "N failures so far — growth is fitted from 8". Failures all at
one instant, or T not past the last failure: not fitted. An idle week adds
nothing (running time only — the watch is the guard). The picture is the fit
check: failures that do not follow the curve (a step, two phases) are for the
person to see; the page says "judge by eye".

## 6. Calculations
As §3. Reading: **improving** only when the 90% interval on β is wholly below 1,
**getting worse** only when it is wholly above 1 (both "beyond doubt"); an
interval that holds 1 is "no sign yet of getting better or worse", saying which
way β̂ leans. Growth rate 1 − β̂ (a share: 0.49 = failures coming half as fast).
Cumulative MTBF T ÷ n. The projection above is given only when the improvement is
beyond doubt; if the instantaneous MTBF is already ≥ M: "already there" (said
whatever the reading).

**Independent cases** (`scripts/knowledge/cases-w5.py`, to
`src/tools/reliability/__tests__/growth.test.ts`): the record's 14 failures at 12,
35, 61, 102, 148, 230, 310, 420, 560, 720, 980, 1,250, 1,600, 1,900 h, T = 2,000:
1. β̂ 0.50777, λ̂ 0.295091, β̄ 0.47150; cumulative MTBF 142.857 h;
   instantaneous 281.341 h; growth rate 0.49223.
2. β 90% interval 0.30698 to 0.74964 → improving, beyond doubt.
3. To reach 400 h: 4,088.0 h of running in all, 2,088 h more; 281 h: already there.
4. A steady-looking machine (10 failures about every 30 h in 310 h): β̂ 1.2159, 90%
   0.6597 to 1.9095 → holds 1: no sign yet, leaning worse.
5. Failures bunching late (10 in 1,050 h): β̂ 2.1637, 90% 1.1739 to 3.3982 → getting
   worse, beyond doubt.
6. Seven failures → not fitted; eight → fitted, rough; twenty → not rough.

## 7. Outputs
A **Growth** panel on the count (shown when *Track growth* is on): the sentence
above; the picture; a small table (β̂ and its range, the MTBF now, averaged since
the start, the growth rate, the projection); the honest line about what was not
run (the fit test) and the condition (the same fixing continuing). A tile **MTBF
now** (instantaneous; against averaged) joins the count's tiles. Tone: improving
beyond doubt green; worse beyond doubt red; the rest neutral. Money (MONEY.md D,
as FC-058): each hour of MTBF short of the target is stops × the line's lost
minutes — the page says the failures an hour *now* against *since the start* and
prices the difference by the count's own cost an hour (the existing FC-058 model),
or names what is missing.

**The report.** The count's section on the Reliability paper gains the Growth
panel: the sentence, the picture (failures against running hours, the fitted
curve dashed, the steady-rate line dotted, the legend in words), the table and
the condition line; the tile and closing line are the module's. A count without
*Track growth* prints as before.

## 8. Manufacturing usability
Nothing new to do at the machine: the taps and the watch already feed it. The
set-up tick says "a new machine bedding in".

## 9. Failure handling
Fewer than 8 failures, no running time, or an unfit set: said in a sentence with
what is needed. A closed study keeps its figures as they were. A client sees it.

## 10. Integration
Record: `RelCount.growth` — in the study's own JSON, no migration. Reads: the
count's points and running time from `reliability()`. Shows on the page, the
paper and the line report; the MTBF wanted is the count's. It is the evidence
the stage gate's commissioning conversation with the OEM wants; carrying it to
the project's commissioning paper is left.

## 11. Verification
Unit tests `src/tools/reliability/__tests__/growth.test.ts` on §6; acceptance
`scripts/acceptance/reliability.mjs` story 14, driving a study of the record's
fourteen failures (seeded into the page's database in the script's own time) and
checking the sentence and figures against the independent numbers as well as the
module.

**Acceptance criteria.**
1. β̂, λ̂, β̄, the interval, the cumulative and instantaneous MTBF, the growth rate
   and the projection equal the independent cases — `growth.test.ts`.
2. The reading and its "beyond doubt" for the improving, steady and worsening
   cases; the 8-failure boundary — `growth.test.ts`.
3. The panel, tile, sentence and table on the page equal the module's for the
   stored record, and equal the independent β ≈ 0.508 and MTBF now ≈ 281 h for the
   record's fourteen — `reliability.mjs` story 14.
4. The picture is drawn (a curve and the steps) and readable on the phone —
   story 14.
5. The paper read back carries the sentence, the table and the condition line;
   a count without growth prints as before — story 14.
6. Not fitted under 8 failures says so — story 14.
7. No console error.

## 12. Maintainability
`growth.ts` (pure), `GrowthPanel.tsx`, paper block in `reliabilityGrowth.ts`.
Left: the fit test (when the handbook's critical values are read — GAPS), a bound
on the instantaneous MTBF, pooling machines, the commissioning paper.
