---
id: stats.response-surface
name: Response surface — finding the best settings
aka: [response surface methodology, RSM, central composite design, optimisation]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Myers, Montgomery & Anderson-Cook)
needs: [stats.doe-factorial]
next: []
alternatives: []
related: []
---
# Response surface — finding the best settings

## Purpose and principle
After the important factors are known, fit a curved (quadratic) model to runs
at more levels and find the settings that give the best response.

## Questions it answers
What temperature and dwell give the strongest seal with the least film damage?

## Inputs and minimum conditions
Two or three important factors; a central composite or Box–Behnken design.

## Procedure and calculation
Quadratic least-squares model; the stationary point or the desirability optimum.

## Assumptions, limits and misuse
Extrapolating outside the design region.

## Reading the result
"Best at 172 °C, 1.4 s."

## When not to use it — and instead
Screening many factors → `stats.doe-factorial`.

## In food and FMCG manufacturing
Cooking time–temperature for yield and texture.

## References
- [textbook] Myers, R.H., Montgomery, D.C. and Anderson-Cook, C.M. (2016), *Response Surface Methodology*, 4th ed., Wiley.

## In Faultline
Research first (FC-112).
