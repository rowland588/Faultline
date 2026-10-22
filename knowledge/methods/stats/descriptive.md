---
id: stats.descriptive
name: Describing readings — centre, spread, shape, the histogram
aka: [descriptive statistics, mean, median, standard deviation, range, percentiles, histogram, box plot]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery & Runger; NIST e-Handbook chapter 1)
needs: []
next: [spc.normality-checks, stats.confidence-intervals]
alternatives: []
related: [spc.capability-measured]
---
# Describing readings — centre, spread, shape, the histogram

## Purpose and principle
The few numbers and one picture that say what a set of readings is like:
where it centres (mean, median), how widely it spreads (standard deviation,
range, interquartile range), its shape (histogram, skew), and its odd points.

## Questions it answers
What are the readings like, before any test or index?

## Inputs and minimum conditions
The readings, with their unit and resolution.

## Procedure and calculation
Mean; median; s = √(Σ(x − x̄)²/(n − 1)); range; quartiles; histogram bins (about √n, at least 5, edges on round values); skew = (1/n)Σz³ (or its adjusted form).

## Assumptions, limits and misuse
More decimals than the measurement; bins chosen to tell a story.

## Reading the result
"60 packs: mean 401.2 g, median 401.1, s 0.62, 399.9–402.8; leaning slightly heavy."

## When not to use it — and instead
Judging against limits → `spc.capability-measured`.

## In food and FMCG manufacturing
Any sample of weights, temperatures, times.

## References
- [textbook] Montgomery, D.C. and Runger, G.C. (2018), *Applied Statistics and Probability for Engineers*, 7th ed., Wiley.
- [practice] NIST/SEMATECH *e-Handbook of Statistical Methods*, chapter 1 (exploratory data analysis).

## In Faultline
Partly: the capability page gives mean and range; the pilot adds the histogram (FC-103).
