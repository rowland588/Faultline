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
2 and 3 agreed in outline, not built.

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
- Rejects out of what was made (part 2) → binomial capability with
  Clopper–Pearson bounds and the p-chart, never Cpk on a percentage.
- Held at a rate (part 2) → per-interval rates against the side agreed.
- Faults per item (part 3) → Poisson DPU with exact bounds and the u-chart;
  defective units and defects never mixed.

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
- *Chosen — this specification's, under the go of 22 October, not yet put
  to Rowland one by one:* the checks from 20 readings; bell-shaped at
  p ≥ 0.05; fine enough from 5 distinct values; K² rather than
  Anderson–Darling (the simulation above); a capable index on readings not
  steady or not bell-shaped never green; drift said only when the steady
  check finds a run; every "proves" share rounded up, never flattering.

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

## 6. Calculations
Measured (unchanged, `src/lib/ie/sample.ts`): s (n − 1), MR̄/1.128,
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
  `src/lib/ie/__tests__/sample.test.ts` extended (one-sided, the checks on
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
Left for later: non-normal models (FC-096), autocorrelation (FC-115),
machine capability (FC-084), give-away in money (FC-156).
