---
id: stats.sample-size-power
name: How many readings — sample size and power
aka: [sample size, power, how many samples, margin of error, minimum detectable difference]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery & Runger; Cochran 1977)
needs: []
next: [stats.two-sample-tests]
alternatives: []
related: [ie.time-study, ie.work-sampling, spc.zero-failure-demonstration]
---
# How many readings — sample size and power

## Purpose and principle
Decide the number of readings before collecting them, from the precision
wanted or the smallest difference worth detecting.

## Questions it answers
How many packs to weigh? How many before-and-after readings to see a 0.5 g change?

## Inputs and minimum conditions
The spread (from a pilot), the precision or difference wanted, the confidence and power.

## Procedure and calculation
Mean within ±e: n = (z·s/e)². Two means differing by δ: n per group ≈ 2(z₁₋α/₂ + z₁₋β)²s²/δ². Proportion within ±e: n = z²p(1 − p)/e².

## Assumptions, limits and misuse
The spread guessed too small; ignoring that readings must be independent.

## Reading the result
"To see a 0.5 g change with s = 0.6 g at 95% and 80% power: 23 packs each side."

## When not to use it — and instead
Zero-failure demonstrations → `spc.zero-failure-demonstration`.

## In food and FMCG manufacturing
Planning weight checks, seal tests, trials.

## References
- [textbook] Montgomery, D.C. and Runger, G.C. (2018), *Applied Statistics and Probability for Engineers*, 7th ed.
- [textbook] Cochran, W.G. (1977), *Sampling Techniques*, 3rd ed., Wiley.

## In Faultline
Not built as a tool (FC-113); work sampling says its margins.
