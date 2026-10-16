# Audit of the industrial-engineering arithmetic — 16 October 2026

Scope: `src/lib/ie/*` (sample, balance, sampling, steps, losses, changeover, mix, ergo, walk), `src/lib/{rampUp,pace,stats,proof,measureProof,hoursLost,cost,run}.ts`, against `docs/LEAN40.md` (the arithmetic appendix), `docs/TOOLKIT.md` Part 1 and Part 4 §1,3,4,6–10, `docs/CAPACITY.md` §5–6.
Method: every formula derived and worked by hand first (`scratchpad/derivations-before-reading.md`), then re-implemented independently (`src/lib/__tests__/audit-ie-ref.ts`: normal tail by Simpson integration, Student's t by integration of its density from an independent log-gamma, Welch's t, Wilson interval, seeded RNG) and driven against the app's real exports on the docs' worked examples and on seeded random data. 388 assertions pass; every defect below is pinned by a passing `FINDING` test. Nothing in the app was changed.

## (a) Formula by formula

### `src/lib/ie/sample.ts` — the measured test
| Formula | Derivation | Worked (by hand) | App | |
|---|---|---|---|---|
| sd | √Σ(x−x̄)²/(n−1) | random sets vs reference | equal to 1e-9; ≠ population sd | agree |
| Ppk | min(U−x̄, x̄−L)/3s | 401.2, 0.6, 400–404 → 1.2/1.8 = 0.667 | 0.667 | agree |
| Pp | (U−L)/6s | 4/3.6 = 1.111 | 1.111; absent with one limit | agree |
| σ_within | mean |xᵢ−xᵢ₋₁| ÷ 1.128 | 10,12,11,13,12 → 1.5/1.128 = 1.330 | 1.330 | agree |
| Cpk, Cp | as Ppk/Pp on σ_within | 3.6/(3·1.330) = 0.902 | 0.902 | agree |
| share outside | Φ(−(x̄−L)/s) + Φ(−(U−x̄)/s) | z 2.0 → 0.02275 (+1.5e-6) → "about 2 in 100" | 0.02275 via NR erfc (±1.2e-7); normal tail, not a lookup | agree |
| words | ≥1.33 capable · ≥1.00 just · else not; from 25 | — | same; "from n" always carried | agree |
| far reading | >3 sd of the OTHERS from their mean, from 5 | random vs reference | equal | agree |
| packers rule 2 | short·40 < n ("fewer than 1 in 40") | 1 of 40 fails, 1 of 41 passes | same | agree |
| TNE table | Sch. 2: 9% · 4.5 g · 4.5% · 9 g · 3% · 15 g · 1.5% | 400 g → 12; every boundary | same; kg/l ×1000 | agree |
| Ppk ≤ Pp, Cpk ≤ Cp | off-centre never beats spread | — | holds on 40 random sets | agree |
| two-tailed share wording | the near side's share | 401/403 alternating: 2.5% low, 2.5% high | "about 5 in 100 would be light" | **disagree (I3)** |
| s = 0 | say so | 30 × 401 g | no Ppk, no capability sentence | **disagree (I5)** |

### `src/lib/ie/balance.ts` — time study and Yamazumi
| Formula | Derivation | Worked | App | |
|---|---|---|---|---|
| basic | obs × rating/100 | 0.42 × 1.10 = 0.462 | 0.462 | agree |
| standard | basic × (1 + allowances), additive | 0.462 × 1.14 = 0.527 (not ×1.12×1.02) | 0.527 | agree |
| t (95%, 2-tail) | integrated t quantile | df 4 → 2.776 · 14 → 2.145 · 29 → 2.045 | table equal to 3 dp; between rows the larger t | agree ≤120 df; **>120 returns 1.96 vs 1.980 (I10)** |
| cycles | ⌈(t·s/(0.05·x̄))²⌉, t at n−1 | (2·0.04/0.021)² = 14.5 → 15; t 2.145 → 16.7 → 17; t 2.045 → 15.2 → 16; 10,11,9,10,10 → s 0.7071 → 15.4 → 16 (t=2: 8.0 → 8) | 15, 17, 16, 16, 8 | agree |
| floor | never under 5 | — | MIN_CYCLES 5 | agree |
| takt, fewest | avail/demand; ⌈Σ/takt⌉ | 54/12 → 5 | 5 | agree |
| efficiency | Σ/(people × longest) | 54/60 = 0.90 | 0.90 | agree |
| delay, smoothness | 1−eff; √Σ(max−each)² | 0.10; √10 = 3.16 | **not computed (I21)** | disagree (doc) |
| suggestion | RPW on `Step.after` | Helgeson–Birnie set | in-order first-fit; no `after` field; equals RPW only on a chain | **disagree (I9)** |
| over takt | only an element > takt alone | 300 random | holds | agree |

### `src/lib/ie/sampling.ts` — work sampling
| Formula | Derivation | Worked | App | |
|---|---|---|---|---|
| N | Z²p(1−p)/E² | 3.8416×0.21/0.0025 = 322.7 → 323; p .5 → 385 | 323, 385 | agree |
| margin | z√(p(1−p)/n) | p .3, n 100 → ±9; ×4 n → half | same; 1/√n exact | agree |
| which share drives "more" | widest margin = biggest share (proved: others ≤ 1−p) | — | biggest share | agree |
| p = 0 or 1 | Wilson lo 0.886 at 30/30 | — | margin ±0 ("working 100% (±0)") | **disagree (I7)** |
| enough | Part 1 table: N for the margin wanted | — | fixed 30 taps, margin said beside | question (I20) |
| §9 example | p .61, n 190 → ±7; N 366 → 176 more | — | 176 (doc says 175) | doc nit (I20) |

### `src/lib/ie/steps.ts` — the value stream
| Formula | Derivation | App | |
|---|---|---|---|
| lead | Σ(cycle + wait) | equal on 100 random streams | agree |
| adds+needed+waste+waits | = lead when all marked | equal; ≤ lead otherwise | agree |
| PCE | adds/lead | equal, ≤ 1 | agree |
| takt | available/demand | equal | agree |
| Little's law | queue/demand × 86 400 | equal | agree |
| longest cycle | cycle ÷ batch, operations/checks | equal | agree |
| dur ↔ parseDur | round trip to display precision | holds | agree |

### `src/lib/ie/losses.ts` — a shift's losses
| Formula | Derivation | Worked | App | |
|---|---|---|---|---|
| planned | shift − breaks (0 under relief) | 480−30 = 450 | 450 | agree |
| expected, lost | planned×rate; (exp−made)/rate | 45 000; 85 | 45 000; 85 | agree |
| explained | stops + c/o + rejects/rate | 52+18+6 = 76 | 76 | agree |
| rest | lost − explained ≥ 0 | 9 | 9; excess said instead of a negative | agree |
| run time | planned − stops − c/o | 380 | 380 | agree |
| net (Nakajima) | packs run ÷ running | 37 100/98 = 378.571 | 378.571 | agree |
| slow | net − packs/ideal, ≤ rest | 7.571 | 7.571 (not 380×2/100 = 7.6) | agree |
| short | run − net (= rest − slow) | 1.429 | 1.429; slow+short = rest on 120 random shifts | agree |
| Op 3 | 10/6.25 s = 96; 35 136/93.2 − 366 | 11.0 slow (People), 3.0 short | 11.0, 3.0, bones people/machine | agree |
| idle labour | crew×wage×on-cost×min/60 | 4×14.50×1.3 = 75.40 × 85/60 = 106.82 → £107 | 106.82; every bar same rate | agree |
| lost contribution | packs × (price−materials or margin) | 8 500×0.04 = 340; ×0.08 = 680 | 340; 680; none without cost | agree |
| identity | stops+c/o+rej+rest−excess = lost | — | exact on 120 random shifts | agree |
| window | stops that started inside | — | a 60-min stop begun 1 min before: 0; begun 1 min before the end: 60 | **design (I8)** |

### `src/lib/ie/changeover.ts` — SMED and EPEI
| Formula | Derivation | Worked | App | |
|---|---|---|---|---|
| elapsed | Σ each column's longest | ex. 2: 42 → 33 → 27 → 9 | same | agree |
| labour | Σ sec × people on it | 17 streamlined (two at once, F by two); 46 now | 17; 46 | agree |
| invariants | longest ≤ elapsed ≤ Σ ≤ labour | 150 random × 4 rungs | hold | agree |
| target | < 10 min | 9:59 on, 10:00 not | same | agree |
| running | Σ(shift − breaks) × days | 2×450×7 = 6 300 | 6 300 | agree |
| per shift→day→week | ×shifts, ×days; week typed back ÷ | 3 → 6 → 42; 42/week → 3/shift | same | agree |
| cost | min×n; packs = min×rate; £ = h×rate; packs×margin | 29.4 h, 28%, 176 400, £5 880 + £8 820; ×48 = 1 411.2 h | same | agree |
| EPEI | free = avail − Σrun; n×c/o ÷ free | 150; 5×42/150 = 1.4; 27 → 0.9; daily ≤ 30 | 1.4, 0.9, 30; monotone in c/o | agree |
| targetSec > sec | should not lengthen | — | ladder climbs (16 → 19 → 29) | **disagree (I6)** |

### `src/lib/ie/mix.ts`
| Formula | Worked | App | |
|---|---|---|---|
| utilisation, efficiency | 148 000/201 600 = 73.4%; /175 000 = 84.6% | same; effective 0 → no efficiency, no Infinity | agree |
| £/constraint min | 0.40×80 = 32; 0.60×40 = 24 → A first | same | agree |
| made | demand when the week has room | floor(d/r·r) → 2 of 3; sentence "everything is made" | **disagree (I2)** |

### `src/lib/ie/ergo.ts` — NIOSH
| Formula | Worked | App | |
|---|---|---|---|
| HM VM DM AM | 25/H; 1−0.003|V−75|; 0.82+4.5/D; 1−0.0032A, with the cut-offs | equal over 200 random | agree |
| FM Table 5 | 17 rows × 3 × 2, transcribed independently | identical; between rows the row above; <0.2 → 0.2; >15 → 0 | agree |
| CM Table 7 | good 1; fair .95/1; poor .90 | identical | agree |
| RWL, LI | 23×.83×.78×.85×1×1×.90 = 11.39; 13/11.39 = 1.14 | 11.39, 1.14, increased | agree |

### `src/lib/rampUp.ts`, `pace.ts`, `run.ts`, `cost.ts`, `hoursLost.ts`, `proof.ts`, `measureProof.ts`
| Formula | Worked | App | |
|---|---|---|---|
| Crawford b | ln 0.8/ln 2 = −0.3219; learning = 2^b | exact on 60 synthetic curves; n* = exp((ln(1/agreed)−a)/b) | agree |
| too early / meets / flat | <3 runs; last ≥ agreed; b ≥ 0 | same | agree |
| a barely-rising climb | a date, or "not within reach" | run 3.5e44, "about NaN-NaN-NaN" | **disagree (I1)** |
| pace | done in last 14 d ÷ days; ⌈to-go ÷ rate⌉ | 7/(7/14) = 14; 8 → 12.25 → 13; 40 random | agree |
| net rate | (packs − rejects)/min; rej% = rej/packs | 100 random; exactly on the agreed = met | agree |
| verdict display | — | 59.96 vs 60 → "Netted 60 … 60 agreed — 0 ppm short" red | **disagree (I4)** |
| £/h | crew × wage × on-cost (multiplier; default 1) | 75.40; £/ms×3.6e6 = £/h; £/h↔£/min exact | agree |
| fmtGBP | TOOLKIT 3.4 "£18,400" | "£18.4k" | design (I19) |
| hours → days | ⌊(banked+adding)/day⌋; banked = hours − pushed×day | same; push calendar days both sides | agree (I22 question) |
| Welch one-sided p | t = Δ/√(s₁²/n₁+s₂²/n₂), Welch–Satterthwaite df, t upper tail | 60 random: |Δp| < 1e-6 vs integrated t; p(a,b)+p(b,a) = 1 | agree |
| direction | up: p(after,before), Δ = a−b; down: reverse | same; flat < 1.5%; untestable → "better" never "proven" | agree |

## (b) Findings, ranked by impact (1–5) then effort

### I1 — A barely-rising climb prints "about NaN-NaN-NaN (run 3.5e+44)"
Impact 3 · Effort S · Kind: bug
Where: `src/lib/rampUp.ts:108-116`
Evidence: nets 100 → 100.1 → 100.2 (daily), agreed 120: b = −0.00178, n* = 3.52e44; `addDays` overflows → `at = "NaN-NaN-NaN"`; text `P: 100 → 100.1 → 100.2 a minute over 3 runs — at this climb, the agreed 120 about NaN-NaN-NaN (run 3.521831763955601e+44).` (reaches the run's card, Commission, the front page and the client report). A sane slow climb (100, 101, 102) still forecasts run >1000, years out, said "about".
Fix: treat n* beyond a horizon (say run n+365 or a date past a year) as `flat`-like — "at this climb it does not reach 120 within reach" — and never format an invalid date.

### I2 — `mix` floors a float product: a product the week has room for is "1 unmade", and the sentence contradicts the row
Impact 3 · Effort S · Kind: bug
Where: `src/lib/ie/mix.ts:120` (`Math.floor(minutesGiven × perConstraintMin)`), `:134-136`
Evidence: demand 3 at 47/min: 3/47 × 47 = 2.9999999999999996 → made 2, unmade 1, while `fill` = 0.00003 and the sentence says "The week fills at 0%; everything is made." Scanning demands 100–20 000 at speeds to a tenth finds hits (first at the test's seed); with `weekMinutes` = 1e9 the row says 1 unmade and the sentence "everything is made".
Fix: `made = minutesGiven ≥ minutesNeeded − 1e-9 ? demand : Math.floor(minutesGiven × per + 1e-9)`; build the sentence from `rows.some(r => r.unmade)`.

### I3 — The capability sentence gives the whole two-tailed share to one side
Impact 2 · Effort S · Kind: bug
Where: `src/lib/ie/sample.ts:295-297` (`shareOut` is both tails; `side` is the nearer limit)
Evidence: readings 401/403 alternating, limits 400–404: s 1.017, 2.46% below and 2.46% above (4.9%) → `Not capable: Ppk 0.66 from 30 — about 5 in 100 would be light.` — 2.5 in 100 would be light.
Fix: say the near side's own tail ("about 2 in 100 would be light, as many heavy"), or "about 5 in 100 would be outside".

### I4 — Rounded figures hide the gap: "Netted 60 ppm against 60 agreed — 0 ppm short", in red
Impact 2 · Effort S · Kind: bug (display)
Where: `src/lib/run.ts:106-112, 122-131`
Evidence: 2 998 packs in 50 min = 59.96 → `num` "60", gap `num(0.04)` "0"; `runLine` = `Netted 60 ppm against 60 agreed — 0 ppm short · 0 rejects (0%) · 50 min`, `meets` false. Rejects 101 of 10 000 (1.01%) against 1%: got "1%", agreed "1% at most", "0.01% over", red.
Fix: when the rounded got equals the rounded agreed, show one more decimal (59.96) or say "just short (59.96 ppm)".

### I5 — Thirty identical readings give no capability sentence at all
Impact 2 · Effort S · Kind: bug (silence)
Where: `src/lib/ie/sample.ts:176, 288`
Evidence: 30 × 401 g, limits 400–404: `sd` 0, `ppk` undefined, `capabilityWords` undefined, `sampleSays().capability` undefined — the strip shows nothing where "Cpk" should be.
Fix: when s = 0 and n ≥ 25 say "spread 0 from 30 — every reading the same; capability cannot be worked out (instrument too coarse?)" in grey.

### I6 — A plan's target longer than the element makes the ladder climb
Impact 2 · Effort S · Kind: bug (no validation)
Where: `src/lib/ie/changeover.ts:121-126`
Evidence: A 10 min streamline `targetSec` 20 min; B 6 min convert `targetSec` 9 min: separated 16 → converted 19 → streamlined 29. Random sequences reproduce it whenever `targetSec > sec`.
Fix: `sec = Math.min(sec, targetSec)` at the converted/streamlined rungs, or refuse the target in the sheet with a word.

### I7 — Wald margin degenerates at p = 0 or 1: "working 100% (±0)" from 30 taps
Impact 2 · Effort S · Kind: design
Where: `src/lib/ie/sampling.ts:48` (`marginOf`)
Evidence: 30 of 30 taps "working" → share 1, margin 0, reading `Op 1: working 100% (±0) — from 30 taps; within ±5 points`. Wilson 95%: 0.886–1. A zero share's Wilson upper bound is 11.4%.
Fix: use the Wilson score interval for the margin (the ILO/Barnes formula is Wald; Wilson is the same at mid p and honest at the ends).

### I8 — A stop is in or out of the shift by its start alone
Impact 2 · Effort M · Kind: design
Where: `src/lib/ie/losses.ts:76-78` (`inWindow`)
Evidence: a 60-min breakdown begun 1 min before the shift counts 0 min; one begun 1 min before the end counts 60 whole — the second shift can then read "stops exceed the loss".
Fix: clip each stop to the window (minutes of overlap), as the stops' minutes, counts whole.

### I9 — The suggestion is in-order first-fit; RPW on a precedence set is not possible
Impact 2 · Effort M · Kind: question (doc–code)
Where: `src/lib/ie/balance.ts:172-189`; `src/lib/study.ts:78-90` (`BalanceStep` has no `after`)
Evidence: TOOLKIT §4 says "ranked positional weight (using `Step.after` where given)" and "Proved by … the RPW order on a six-element precedence set from Helgeson and Birnie's paper"; there is no `after` field and no weight. On a chain the fill equals RPW (300 random cases); the same six elements typed F E D C B A fill F+E+D | C+B | A, A's precedence ignored.
Fix: add `after?: string[]` and implement RPW (weight = own + all successors, heaviest first, precedence kept), or amend the docs to "the elements in order".

### I10 — Student's t past 120 df is 1.96, under the true value
Impact 1 · Effort S · Kind: bug (trivial)
Where: `src/lib/ie/balance.ts:59-64`
Evidence: t95(121) = 1.96; true 1.9796 (1.962 at 1 000 df). Optimistic by <1%; nobody times 122 laps.
Fix: 1.98 to 200 df, 1.97 to 500, then 1.96.

### I11 — An agreed count of 0 reads "12 of 0 in"
Impact 1 · Effort S · Kind: bug (wording)
Where: `src/lib/ie/sample.ts:146, 235`
Evidence: limits agreed, count 0, 12 readings → verdict `12 of 0 in`.
Fix: with count ≤ 0 say "12 readings — how many it needs is not agreed".

### I12 — `samplingLine` throws on an empty activities list
Impact 1 · Effort S · Kind: bug (edge)
Where: `src/lib/ie/sampling.ts:143` (`reduce` with no initial value)
Evidence: `samplingLine({ taps: [one for A], who: ['A','B'], activities: [] })` → TypeError (reduce of empty array).
Fix: `reduce(…, undefined)` and guard, or default the activities.

### I13 — `cyclesNeeded` returns −0 when the spread is 0
Impact 1 · Effort S · Kind: bug (cosmetic)
Where: `src/lib/ie/balance.ts:72` (`Math.ceil(0 − 1e-9)`)
Evidence: `Object.is(cyclesNeeded(10, 0, 5), -0)`; `String(-0)` is "0", so nothing shows.
Fix: `Math.max(0, …)`.

### I14 — Parts rounded separately may not add to the total
Impact 1 · Effort S · Kind: design
Where: `src/lib/ie/losses.ts:479` (`minWords` per part), `splitWords`, `lossSays`
Evidence: slow 7.5 + short 1.5 = rest 9 → "8 min of slow running · 2 min of short stops" (10). The worked 7.57/1.43 → 8 + 1 = 9 only by luck.
Fix: round the parts to sum (largest-remainder) or print one decimal in the split line.

### I15 — "about 1 in 100" for shares down to 0.5%
Impact 1 · Effort S · Kind: design
Where: `src/lib/ie/sample.ts:204-211`
Evidence: inWords(0.005) → "about 1 in 100" (it is 1 in 200); 0.0049 → "about 5 in 1,000".
Fix: choose the scale where the rounded count is ≥ 2 (or say "about 1 in 200").

### I16 — The rejects bar's pounds are called "idle labour"
Impact 1 · Effort S · Kind: question (wording)
Where: `src/lib/ie/losses.ts:453, 487-490`
Evidence: rejects 1 000 at 100/min → bar labour (10/60) × £75.40 said "idle labour"; the crew were working.
Fix: "labour" or "labour on rejects".

### I17 — `compareSamples` carries no count
Impact 1 · Effort S · Kind: question
Where: `src/lib/ie/sample.ts:302-314`
Evidence: `mean 401.2 → 402.2 g · Ppk 0.67 → 1.05 — just capable now…` — TOOLKIT 3.4: Cpk "always with from n".
Fix: append "from 30 → 30".

### I18 — Derived figures rounded before they are stored and re-used
Impact 1 · Effort S · Kind: design
Where: `losses.ts:124` (rate 2 dp), `losses.ts:207` (counted rate 0.1), `changeover.ts:717-718` (minutes 0.1), `changeover.ts:800-803` (perShift 0.01, min 0.1 → Line capacity's shift)
Evidence: `standardFrom` 10.04 min → 10; `countedRate` 36 512/450 = 81.138 → 81.1 becomes a reading.
Fix: accept as the record's own precision, or keep full precision and round in words only.

### I19 — `fmtGBP` says "£18.4k" where TOOLKIT 3.4 wants "£18,400"
Impact 1 · Effort S · Kind: design
Where: `src/lib/cost.ts:47-50` (used by `mix.ts`)
Evidence: fmtGBP(18 400) = "£18.4k"; losses/changeover use their own whole-pound `gbp`.
Fix: one money formatter (whole pounds, thousands separated).

### I20 — Sampling's "enough" is 30 taps, not the margin wanted; the §9 example is off by one
Impact 1 · Effort S · Kind: question (doc)
Where: `src/lib/ie/sampling.ts:36, 118`; `docs/TOOLKIT.md` Part 1 table and §9
Evidence: Part 1: "Enough when N ≥ Z²p(1−p)/E²"; module: `TOO_FEW_TAPS = 30`, verdict "From n taps" past 30 with the margin beside. §9's "175 more for ±5" is 366 − 190 = 176.
Fix: either rule is defensible — say which in both places.

### I21 — Balance delay and smoothness are documented, not computed
Impact 1 · Effort S · Kind: question (doc–code)
Where: `src/lib/ie/balance.ts:124-138`; `docs/LEAN40.md` Work balance; `docs/TOOLKIT.md` §4 Figures
Evidence: 54 s at 12 s: delay 0.10, smoothness √10 = 3.16; `BalanceFigures` has neither.
Fix: add both (two lines) or drop them from the docs.

### I22 — Hours pushed are calendar days under a "working day" unit
Impact 1 · Effort M · Kind: question
Where: `src/lib/hoursLost.ts:71-73`; `src/ui/WhyMoved.tsx:333` (`addDays(end, daysMade)`)
Evidence: a push on a Friday lands Saturday (consistent both sides, so no mismatch); a date moved by hand Fri → Mon counts 3 pushed days and empties the bank (10 h → banked 0, not 2).
Fix: push and count in working days, or document the calendar rule.

### I23 — Modules and scores the docs list do not exist
Impact 1 · Effort M · Kind: question (doc–code)
Where: `docs/TOOLKIT.md` Part 1 "The shared arithmetic" table (`timeStudy.ts`, `cycle.ts`, `ergo.ts` "MAC, ART and REBA"); `docs/LEAN40.md` Machines per person
Evidence: `src/lib/ie/` has no `timeStudy.ts` or `cycle.ts` (the time study lives in `balance.ts`; machines per person n′ = (l+m)/(l+w) = 3.33 and £2.92/£3.38 a piece have no code); `ergo.ts` is NIOSH only.
Fix: amend the table, or build `cycle.ts` from the worked example (n′, cycle = l+m or n(l+w), cost = (rates) × cycle ÷ n).

## (c) What is sound
- **Measured test**: sd is n−1; Ppk/Pp from the overall spread and Cpk/Cp from MR/1.128 exactly; the share outside is the normal tail (NR erfc, ±1.2e-7, checked against integration over z −3…6); Ppk ≤ Pp always; the share falls monotonically as the mean centres; the TNE table matches Schedule 2 at every boundary; "fewer than 1 in 40" is strict; far readings use the others' spread; struck readings keep their place; "from n" is always on the capability words; 25 is the gate.
- **Time study**: t table exact to 3 dp at every listed df, conservative between rows to 120; cycles = ⌈(t·s/0.05x̄)²⌉ at n−1 df (15 · 17 · 16 · 16/8 as the docs say); allowances additive; floor of five; weakest source propagates up the stack.
- **Yamazumi**: fewest, efficiency, constraint, over/spare exact on random balances; the suggestion never piles a stack past takt unless one element alone exceeds it, and equals RPW on a chain.
- **Work sampling**: 323 and 385; margin ∝ 1/√n exactly; the biggest share always carries the widest margin (so "more needed" is the right one); shares sum to 1; struck taps count for nothing; paper says "too early", never a figure, under the threshold.
- **Value stream**: lead, buckets, PCE, takt, Little's law, longest cycle a piece all reconcile on 100 random streams; durations round-trip.
- **Shift losses**: both worked examples to the figure; the full identity (stops + c/o + rejects + rest − excess = lost) exact on 120 random shifts; the rest never negative; Nakajima's split (net = packs run ÷ running; slow = net − packs/ideal capped at the rest; short = run − net) exact, slow + short = rest; above the plate it says so; the pounds in two parts at one labour rate and one margin on every bar and the total; no cost → no pounds; words never NaN.
- **SMED**: elapsed = Σ columns' longest, labour = Σ sec × people, longest ≤ elapsed ≤ Σ ≤ labour at all four rungs on 150 random sequences; 42/33/27/9 and 17; the running pattern, 3 → 6 → 42 and back; 29.4 h, 28%, 176 400, £5 880 + £8 820, 1 411.2 h; EPEI 1.4/0.9/30 and monotone; "fewer than ten".
- **Capacity three numbers** and **mix ranking** exact; **NIOSH** multipliers, Tables 5 and 7, RWL, LI and bands exact against an independent transcription; outside-range says so.
- **Ramp-up**: Crawford's unit fit recovers the learning rate exactly on 60 synthetic curves; n*, runNo, cadence and date as documented (for sane climbs).
- **Pace**: burn-down exact on 40 random jobs; the early/stalled rules as documented.
- **Run**: net, reject %, three rules exact; on-the-number is met.
- **Cost**: £/h = crew × wage × multiplier (1.3, default 1), £/ms and £/min round-trip without drift.
- **Proof**: Welch one-sided p within 1e-6 of an integrated Student t on 60 random pairs; p(a,b) + p(b,a) = 1; measureProof's direction flips both the delta and the tail correctly; two a side is "better", never "proven".
- **Honesty rules**: "from n" on capability, cycles, taps, runs; weakest source on the balance stack and the SMED sequence; untimed → "at least"; nothing shows a figure without its count except `compareSamples` (I17). Rounding is at display everywhere except the stored records in I18.

## (d) Tests written (uncommitted, in the worktree)
All under `/home/user/Faultline/.claude/worktrees/agent-ae4704c97039ae4c3/src/lib/__tests__/` — run with `npx vitest run src/lib/__tests__/audit-ie-` (9 files, 388 passed, 0 failed; ~7 s, the t-quantile integration dominating):
- `audit-ie-ref.ts` — the independent reference (not a test file)
- `audit-ie-sample.test.ts` — 53 passed, 0 failed
- `audit-ie-balance.test.ts` — 11 passed, 0 failed
- `audit-ie-sampling.test.ts` — 7 passed, 0 failed
- `audit-ie-steps.test.ts` — 5 passed, 0 failed
- `audit-ie-losses.test.ts` — 130 passed, 0 failed
- `audit-ie-changeover.test.ts` — 159 passed, 0 failed
- `audit-ie-mix-ergo.test.ts` — 10 passed, 0 failed
- `audit-ie-forecasts.test.ts` — 9 passed, 0 failed
- `audit-ie-proof.test.ts` — 4 passed, 0 failed

Tests named `FINDING` assert the defect as it stands today; when a finding is fixed its test must be inverted in the same commit. Hand derivations made before reading the code: `/tmp/claude-0/-home-user-Faultline/54314abf-819b-5a53-9077-728e7c7afed3/scratchpad/derivations-before-reading.md`.
