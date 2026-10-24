---
id: rca.stratification
name: Stratification — splitting the data to find where the problem lives
aka: [stratification, split by shift, split by machine, slice and dice, segmentation, by lane, by head]
discipline: rca
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — one of Ishikawa's seven QC tools (*Guide to Quality Control*, 1976); the tests on the splits are `stats.chi-square-association`, the two-proportion z and `stats.anova`; the multiple-comparisons caution by Bonferroni; from knowledge; the worked splits computed in `scripts/knowledge/cases-rca.py`; Faultline splits stops by shift, product and money (the Pareto) and by machine and day (the heat map)
needs: []
next: [stats.anova, stats.chi-square-association]
alternatives: [rca.is-is-not]
related: [quality.pareto, quality.defect-concentration, stats.two-sample-tests, rca.is-is-not]
---
# Stratification — splitting the data to find where the problem lives

## Purpose and principle
A total hides where a problem lives. The same rejects, stops or
weights split by shift, machine, head, lane, product, supplier lot or
operator — one factor at a time, then two together — show whether the
problem is everywhere (a system cause) or in one stratum (a local
cause), which is the first and cheapest step of any root-cause work.
The split is a count or a mean per group with the group's size, drawn
as bars or a table; whether a difference is beyond chance is tested —
proportions by chi-square or the two-proportion z, means by ANOVA or a
t-test — and the number of splits tried is remembered, because
twelve splits at 5% will find a "significant" one by luck nearly half
the time.

## Questions it answers
- Is it everywhere, or one shift, one lane, one product, one lot?
- Is the difference between the strata real, or the noise of small
  counts?
- Which combination (night × product A) carries the problem?
- Having found the stratum, what is different about it
  (`rca.is-is-not`)?

## Inputs and minimum conditions
- Data tagged with the factors to split by — every stop with its shift
  and machine, every reject with its lane and product, every weight
  with its head. A record without the tags cannot be stratified
  afterwards.
- The denominator for each stratum (packs made, hours run) so rates,
  not counts, are compared.
- Enough in each stratum to test (counts of 5 or more expected in each
  cell for chi-square; 10 or more readings for a mean).

## Procedure and calculation
- Rate per stratum = count ÷ its denominator (rejects per 1,000 packs,
  stops per 100 hours); means per stratum with n and s.
- Proportions: a 2 × k or r × k table tested by chi-square
  (`stats.chi-square-association`); a single pair by the two-proportion
  z-test, z = (p₁ − p₂) ÷ √(p̄(1 − p̄)(1/n₁ + 1/n₂)).
- Means: one-way ANOVA (`stats.anova`) then which groups differ (Tukey);
  two groups by Welch's t (`stats.two-sample-tests`).
- Two factors at once (shift × product) as a table of rates; an
  interaction (the problem only on night × A) is the usual find.
- Multiple comparisons: with k splits tried, the chance of at least one
  false find at 5% is 1 − 0.95ᵏ; either divide the level by k
  (Bonferroni) or treat a find as a hypothesis to confirm on fresh data.
- The stratum found → its distinctions and changes (`rca.is-is-not`) →
  the cause.

**Worked case** (`cases-rca.py`): rejects by shift and product. Day:
product A 120 of 24,000 (5.0 per 1,000), product B 80 of 16,000 (5.0);
night: A 230 of 24,000 (9.6), B 90 of 16,000 (5.6). Chi-square on the
counts 7.4, p = 0.007 — shift and product are not independent. Night A
against day A: 9.6 vs 5.0 per 1,000, z 5.9, p < 0.001; night B against
day B: 5.6 vs 5.0, z 0.8, p 0.44 — no difference. The problem is night
shift on product A only, not nights in general. Weights by weigher head:
means 201.4, 202.2, 204.0, 201.7 g; F 24, p < 0.001 — head 3 is 2 g
heavy. And the caution: twelve splits at 5% give a 46% chance of one
false find; Bonferroni's level per split is 0.4%.

## Assumptions, limits and misuse
- Splitting until something looks different, then reporting only that
  split, is the classic error; count the splits.
- Counts compared without denominators compare the strata's sizes, not
  their rates.
- Small cells give wide uncertainty; a stratum of 3 rejects says little
  (`stats.confidence-intervals`).
- A difference found is a place to look, not a cause; the cause is the
  distinction behind it.
- Data not tagged at the time cannot be stratified honestly later; the
  tags are designed into the check sheet (`quality.check-sheet`).

## Reading the result
"Nights reject twice what days do — on product A only, and head 3 of
the weigher is 2 g heavy: two local causes, not a system one." Money:
the stratum's excess rejects × the pack's materials and labour
(`knowledge/MONEY.md`, Q), or its excess stops at the bottleneck (T) —
the money that says which stratum first.

## When not to use it — and instead
Specifying one sharp problem's is/is-not → `rca.is-is-not`. Ranking
causes by size → `quality.pareto`. Where on the product the defects sit
→ `quality.defect-concentration`. The tests themselves → `stats.anova`,
`stats.chi-square-association`, `stats.two-sample-tests`.

## In food and FMCG manufacturing
Weigher heads; sealer lanes; shifts and crews; raw-material lots and
suppliers; ovens and their zones; the two sides of a twin-lane line;
film reels by batch.

## References
- [textbook] Ishikawa, K. (1976), *Guide to Quality Control*, Asian Productivity Organization — stratification among the seven tools (from knowledge).
- [textbook] Montgomery, D.C. (2013), *Introduction to Statistical Quality Control*, 7th ed., Wiley — the seven tools and the tests (from knowledge).
- [textbook] Juran, J.M. and De Feo, J.A. (2010), *Juran's Quality Handbook*, 6th ed., McGraw-Hill — stratification in diagnosis (from knowledge).

## In Faultline
Partly (FC-153): the Pareto splits the stops by shift, product and
money (`src/lib/paretoView.ts`) and the heat map by machine
and day (`src/lib/intelligence/heat.ts`). FC-153 adds the general split
of any tagged count or reading by any of its tags, two at once, with
the rate per stratum, the test and the multiple-comparisons caution in
words, and a found stratum handed to is/is-not.
