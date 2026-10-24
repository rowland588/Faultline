---
id: stats.two-sample-tests
name: Before and after — did it move, for a reason
aka: [t test, Welch test, two sample test, two proportions test, Fisher exact test, Mann-Whitney, before and after, significance]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Welch's t-test (1947), the two-proportion z-test and Fisher's exact test, Mann–Whitney (1947); Faultline's one-sided Welch in src/lib/proof.ts and src/lib/measureProof.ts proved by their tests
needs: [stats.confidence-intervals]
next: [rca.pdca]
alternatives: [stats.anova]
related: [stats.sample-size-power, stats.time-series-trend]
---
# Before and after — did it move, for a reason

## Purpose and principle
Two samples — before a change and after it — compared so "it went up" and
"it went up more than chance makes" are told apart. The test's p-value is the
chance of a difference this big if nothing had changed.

## Questions it answers
Did the fix move the reject rate or the mean? Is the difference more than noise?

## Inputs and minimum conditions
Both samples measured the same way; independent readings; enough of them (`stats.sample-size-power`).

## Procedure and calculation
- Means: Welch t = (x̄₂ − x̄₁)/√(s₁²/n₁ + s₂²/n₂), degrees of freedom by Welch–Satterthwaite.
- Proportions: z = (p̂₂ − p̂₁)/√(p̂(1 − p̂)(1/n₁ + 1/n₂)) with pooled p̂; Fisher's exact test for small counts.
- Not normal, small samples: Mann–Whitney U.
- One-sided when the direction was stated before looking.

## Assumptions, limits and misuse
Testing many measures and reporting the one that moved; a significant difference
too small to matter; "the fix did it" — the test says the number moved, not why.

## Reading the result
"1.17% → 0.40%: 95% sure it fell (p = 0.006). What moved it is the fix's to say."

## When not to use it — and instead
More than two groups → `stats.anova`. Same items measured twice → paired test (FC-106).

## In food and FMCG manufacturing
Give-away before and after a weigher's re-calibration; rejects before and after new film.

## References
- [paper] Welch, B.L. (1947), "The generalization of 'Student's' problem when several different population variances are involved", *Biometrika* 34(1–2), 28–35.
- [paper] Mann, H.B. and Whitney, D.R. (1947), *Annals of Mathematical Statistics* 18(1), 50–60.
- [textbook] Montgomery, D.C. and Runger, G.C. (2018), *Applied Statistics and Probability for Engineers*, 7th ed.

## In Faultline
Built (W3a, 24 October; FC-105, and FC-106 for pairs). The Analysis tool's Did it change: Welch's t
with the difference and its interval, Mann–Whitney beside it (exact up to 20 a side with no ties, the
normal with tie and continuity corrections otherwise) and leading when a group is not bell-shaped;
counted before and after by the pooled z and Fisher's exact (Fisher leads under an expected count of
5; a straddle of 0.05 is said borderline); two ways of measuring the same items by the paired t and
Wilcoxon's signed-rank. Two-sided always — which way is better is for the words only. The test says
the number moved, never why. The studies' own before → after line still says only that the number
moved. Proved by `scripts/acceptance/analysis.mjs`.
