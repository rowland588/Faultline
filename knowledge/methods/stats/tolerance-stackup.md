---
id: stats.tolerance-stackup
name: Several deposits in one pack — tolerance stack-up
aka: [tolerance stack up, root sum square, statistical tolerancing, multi component fill]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (variance of a sum of independent parts)
needs: [stats.descriptive]
next: [yield.giveaway]
alternatives: []
related: [packaging.average-quantity-system]
---
# Several deposits in one pack — tolerance stack-up

## Purpose and principle
A pack made of several deposits has a total whose spread is the root of the
sum of the deposits' variances (when independent) — far less than the sum of their ranges.

## Questions it answers
What spread will the finished pack have, and where must each deposit's target be?

## Inputs and minimum conditions
Each deposit's mean and spread.

## Procedure and calculation
Mean = Σ means; s_total = √Σ sᵢ² (independent deposits).

## Assumptions, limits and misuse
Dependent deposits (one depositor feeding two) add more.

## Reading the result
"Three deposits of s 4 g, 3 g, 2 g: the pack's s is 5.4 g."

## When not to use it — and instead
One filler → `spc.capability-measured`.

## In food and FMCG manufacturing
Ready meals (meat, sauce, rice), sandwiches, pizza toppings.

## References
- [textbook] Montgomery, D.C. and Runger, G.C. (2018), *Applied Statistics and Probability for Engineers*, 7th ed. — linear combinations of random variables.

## In Faultline
Not built (FC-116).
