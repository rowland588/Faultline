---
id: stats.anova
name: Does it differ by group? — one-way ANOVA and its follow-ups
aka: [analysis of variance, F-test, one-way ANOVA, Tukey HSD, Kruskal–Wallis, between-group comparison]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the one-way model, the F-test, Tukey's HSD, Levene and Kruskal–Wallis as Montgomery's *Design and Analysis of Experiments* ch. 3 gives them (from knowledge; edition to confirm); the worked case computed independently in `scripts/knowledge/cases-stats.py`; Faultline once had this in the method engine, deleted 20 October (`docs/DIRECTION.md`)
needs: [stats.descriptive]
next: [stats.doe-factorial]
alternatives: [stats.two-sample-tests]
related: [rca.stratification, stats.sample-size-power]
---
# Does it differ by group? — one-way ANOVA and its follow-ups

## Purpose and principle
Three shifts, four heads, five suppliers: does the measure differ between
them more than it varies within them? ANOVA splits the total variation
into *between groups* and *within groups* and compares the two as a ratio
F. A large F says at least one group differs; the follow-up says which.
It is the formal form of the stratified histogram (`rca.stratification`),
and the first step of a designed experiment.

## Questions it answers
- Is the give-away (or reject rate, cycle time, seal strength) different
  between shifts, heads, lines, suppliers, recipes?
- Which groups differ from which, and by how much?
- How much of the variation is the grouping (η²)?

## Inputs and minimum conditions
- k groups (k ≥ 2; at k = 2 it is the t-test), each with nᵢ readings from
  the same kind of process state; balanced sizes are best but not required.
- Readings independent within and between groups; about normal within
  each group with similar spreads (checked below).
- At least 5 a group, better 8–10; the power calculation says how many
  for the difference that matters (`stats.sample-size-power`).

## Procedure and calculation
- Grand mean x̿; group means x̄ᵢ.
- SS_between = Σ nᵢ(x̄ᵢ − x̿)², df = k − 1; SS_within = Σ Σ (xᵢⱼ − x̄ᵢ)²,
  df = N − k; MS = SS/df; F = MS_between / MS_within.
- p from the F distribution with (k − 1, N − k) df; or F against its
  critical value at 5%.
- Effect size η² = SS_between / SS_total — the share of variation the
  grouping explains.
- Spreads alike: Levene's test (median-centred); p > 0.05 keeps the plain
  F. Unalike → Welch's ANOVA or Kruskal–Wallis.
- Normal enough within groups: residuals' histogram or normality test; not
  → Kruskal–Wallis (on ranks, H ≈ χ² with k − 1 df).
- Which groups differ: Tukey's HSD — every pair compared with the family's
  error rate held at 5%, each with its interval; never a t-test per pair
  (the false-alarm rate climbs with the pairs).

**Worked case** (`cases-stats.py`): give-away (g) on 8 packs from each of
three shifts — A 1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2; B 1.6, 1.9, 1.4,
1.8, 2.1, 1.5, 1.7, 1.6; C 1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1. Means
1.11, 1.70, 1.15 g. SS_between 1.731 (df 2), SS_within 0.829 (df 21); MS
0.865 and 0.039; F = 21.9 against a critical 3.47; p = 0.000007. Levene
p = 0.67 (spreads alike). η² = 0.68 — two-thirds of the variation is the
shift. Tukey: B differs from A (p 0.00002) and from C (0.00005); A and C
do not (0.93). Kruskal–Wallis agrees (H 15.1, p 0.0005).

## Assumptions, limits and misuse
- Independence: packs taken seconds apart off one head are not independent
  readings of "the head" (`stats.autocorrelation`); take them across the run.
- A difference found is not a cause: shift B's give-away may be shift B's
  product mix. Stratify by what else differs before blaming the people.
- With many readings a tiny, meaningless difference is "significant" —
  read the effect in grams and in money, not the p-value.
- Unequal spreads with unequal group sizes bias the F; Welch's form or
  Kruskal–Wallis.
- Two factors at once (shift × product) need the two-way model or the
  factorial (`stats.doe-factorial`); a one-way on each in turn can mislead.

## Reading the result
"Give-away differs by shift: B runs 0.55–0.59 g heavier a pack than A and
C (p < 0.001); A and C are alike." Then the money of the difference —
0.57 g × B's packs a week × £/kg (`knowledge/MONEY.md`, Q) — and the
question why (`rca.fishbone-5whys`), with the shift's practice compared to
the others' before any setting is touched.

## When not to use it — and instead
Two groups → `stats.two-sample-tests`. Counts by category (rejects by lane
by type) → `stats.chi-square-association`. Several factors varied on
purpose → `stats.doe-factorial`. A trend in time, not groups → `stats.time-series-trend`.

## In food and FMCG manufacturing
Give-away or reject rate by shift, by filler head, by line, by raw-material
supplier, by recipe; seal strength by jaw; cycle time by operator; oven
colour by zone. The classic first question when "it is always worse on
nights" is said.

## References
- [textbook] Montgomery, D.C., *Design and Analysis of Experiments*, 10th ed., Wiley, 2019, ch. 3 — the single-factor experiment, model adequacy, Tukey's test, Kruskal–Wallis (from knowledge; edition to confirm).
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018, ch. 13 (from knowledge).
- [paper] Tukey, J.W. (1949), "Comparing individual means in the analysis of variance", *Biometrics* 5(2), 99–114 (from knowledge).
- [paper] Kruskal, W.H. and Wallis, W.A. (1952), "Use of ranks in one-criterion variance analysis", *JASA* 47(260), 583–621 (from knowledge).

## In Faultline
Not built (FC-107). It was a worked-out figure in the method engine deleted
on 20 October (`docs/DIRECTION.md`); when rebuilt it is a view on any set
of readings the app holds that carries a group (shift, head, line, product
— the records already carry them), answering in words with the pairs that
differ and the money of the difference.
