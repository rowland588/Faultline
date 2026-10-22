---
id: stats.anova
name: Comparing several groups — one-way ANOVA and Kruskal–Wallis
aka: [ANOVA, analysis of variance, Kruskal-Wallis, Levene, compare shifts, compare heads]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery, Design and Analysis of Experiments); Faultline once had it in the method engine, deleted 20 October (docs/DIRECTION.md)
needs: [stats.descriptive]
next: [stats.doe-factorial]
alternatives: [stats.two-sample-tests]
related: [rca.stratification]
---
# Comparing several groups — one-way ANOVA and Kruskal–Wallis

## Purpose and principle
Whether several groups (weigher heads, shifts, lines, operators) differ in
their mean more than the variation within them explains.

## Questions it answers
Does one head fill heavier? Does nights reject more?

## Inputs and minimum conditions
Readings tagged by group, several per group.

## Procedure and calculation
F = (between-group mean square)/(within-group mean square); follow-up comparisons (Tukey); Kruskal–Wallis on ranks when not normal; Levene for equal spreads.

## Assumptions, limits and misuse
Normal residuals, equal spreads (or Welch's ANOVA), independence.

## Reading the result
"Head 7 fills 1.8 g heavier than the rest (p < 0.001)."

## When not to use it — and instead
Counts by group → `stats.chi-square-association`.

## In food and FMCG manufacturing
Multihead weigher heads; filler nozzles; oven zones.

## References
- [textbook] Montgomery, D.C. (2017), *Design and Analysis of Experiments*, 9th ed., Wiley.

## In Faultline
Not built (FC-107).
