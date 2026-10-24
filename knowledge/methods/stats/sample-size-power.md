---
id: stats.sample-size-power
name: How many readings? — sample size and power
aka: [sample size, power analysis, margin of error, how many to measure, minimum detectable difference, n for a proportion]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the mean, two-mean and proportion formulas as Montgomery & Runger and Cochran (1977) give them (from knowledge); the exact two-sample power by the noncentral t and every worked figure computed independently in `scripts/knowledge/cases-stats.py`
needs: []
next: [stats.two-sample-tests]
alternatives: []
related: [ie.time-study, ie.work-sampling, spc.zero-failure-demonstration, stats.confidence-intervals]
---
# How many readings? — sample size and power

## Purpose and principle
Every figure has a margin, and the margin shrinks with the square root of
the count: four times the readings halve it. Deciding the count before
measuring — for the precision wanted, or for the difference that must be
seen — is what keeps a study from proving nothing (too few) or wasting a
shift (too many). Power is the chance of seeing a real difference of the
size that matters; 80% is the usual floor.

## Questions it answers
- How many packs to weigh to know the mean to ±0.3 g?
- How many per shift to tell a 0.5 g difference between two shifts?
- How many packs to put a reject rate within ±2 points?
- How many moments for a work-sampling share within ±3 points?
- A study already done: what difference could it have seen (its power)?

## Inputs and minimum conditions
- The precision wanted (±e) or the difference that matters (δ) — the
  floor's decision, in the unit (grams, points), never the statistician's.
- A guess of the spread s (from past readings, a pilot of 10–20, or the
  tolerance ÷ 6 as a rough one); for a proportion, a guess of p (0.5 is the
  worst case).
- Confidence (95% usual: z = 1.96) and power (80%: z_β = 0.84; 90%: 1.28).

## Procedure and calculation
- A mean within ±e: n = (z·s/e)².
- Two means differing by δ (two-sided, equal groups): n per group ≈
  2(z₁₋α/₂ + z₁₋β)²·s²/δ²; exact power at a given n from the noncentral t
  with df 2n − 2 and noncentrality δ/(s√(2/n)).
- A proportion within ±e (absolute): n = z²·p(1 − p)/e²; with p unknown
  use 0.5.
- A difference between two proportions p₁, p₂: n per group ≈
  (z₁₋α/₂√(2p̄q̄) + z₁₋β√(p₁q₁ + p₂q₂))² / (p₁ − p₂)².
- Zero failures to show at least (1 − p₀) good at confidence C:
  n = ln(1 − C)/ln(1 − p₀) (`spc.zero-failure-demonstration`).
- Work sampling: the proportion formula with the share expected
  (`ie.work-sampling`); a time study's cycles: the mean formula on the
  cycle time's spread (`ie.time-study`).
- Finite population (all the packs of one batch): n' = n/(1 + n/N).
- After the fact: the margin a study achieved is z·s/√n; the difference
  it could have seen at 80% power is (z₁₋α/₂ + z₁₋β)·s·√(2/n).

**Worked case** (`cases-stats.py`): s = 0.9 g on pack weight. The mean to
±0.3 g at 95%: n = 35. Two shifts differing by 0.5 g at 80% power: about
51 a group (exact power at 52 a group: 0.80). A reject rate near 10%
within ±2 points: n = 865; with p unknown (0.5): 2,401. A work-sampling
share near 15% within ±3 points absolute: 545 moments. Each is a count the
floor can weigh against the time it takes — and the margin it buys.

## Assumptions, limits and misuse
- The spread guessed wrong by a factor changes n by its square; a pilot
  of 20 is worth it.
- Independence: 50 consecutive packs off one head are not 50 readings of
  the shift (`stats.autocorrelation`).
- Power after the fact from the observed difference ("observed power") is
  circular; use the difference that *matters*.
- A study with n chosen for the mean's precision is usually too small for
  the tails (capability needs 50–100 for the 99.865th percentile).
- n for a proportion is large: 2,401 packs to pin a rate to ±2 points with
  nothing known; say so before promising a precise reject rate from a
  morning's count.

## Reading the result
"To see a 0.5 g difference between the shifts, weigh about 51 packs from
each, spread across the run — a morning's work; 20 a shift would see only
a 0.8 g difference." The money is the study's labour (hours × rate,
`knowledge/MONEY.md` L) against the decision's worth — a 0.5 g give-away
difference across a week's packs.

## When not to use it — and instead
The count is fixed by the batch or the test → say the margin it gives
(`stats.confidence-intervals`). A count with none failing →
`spc.zero-failure-demonstration` directly.

## In food and FMCG manufacturing
Packs to weigh for a give-away figure; moments for a work-sampling study;
cycles to time for a standard; packs to inspect for a reject rate before
a changeover is signed off; lots to test to show a supplier's rate.

## References
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018, ch. 8–10 — sample size for intervals and tests (from knowledge; edition to confirm).
- [textbook] Cochran, W.G., *Sampling Techniques*, 3rd ed., Wiley, 1977 — proportions, finite population correction (from knowledge).
- [textbook] Cohen, J., *Statistical Power Analysis for the Behavioral Sciences*, 2nd ed., Erlbaum, 1988 — the power conventions (from knowledge).

## In Faultline
Not built as a tool (FC-113). Work sampling already says its margins and
the moments more it needs (`src/tools/sampling`); the capability study says
what a count proves (`src/tools/capability`, the pass-or-fail design).
FC-113 is the same question asked before any study starts: "how many?",
answered in the floor's unit with the time it takes.
