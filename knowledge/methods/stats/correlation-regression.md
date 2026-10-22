---
id: stats.correlation-regression
name: Correlation, the scatter and regression — what drives it
aka: [scatter plot, correlation, regression, multiple regression, what drives it]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery & Runger; Montgomery, Peck & Vining); Faultline once had regression in the method engine, deleted 20 October
needs: [stats.descriptive]
next: [stats.doe-factorial]
alternatives: [stats.doe-factorial]
related: []
---
# Correlation, the scatter and regression — what drives it

## Purpose and principle
Whether two measures move together (scatter, correlation r) and by how much one
changes with others (regression), from data collected as the process ran.

## Questions it answers
Does seal strength fall as jaw temperature falls? What drives give-away?

## Inputs and minimum conditions
Paired readings over a range of the drivers.

## Procedure and calculation
r = Σ(x − x̄)(y − ȳ)/√(Σ(x − x̄)²Σ(y − ȳ)²); least-squares fit y = a + bx (+ …); R², residuals checked.

## Assumptions, limits and misuse
Correlation is not cause — observational data mislead; extrapolating beyond the data.

## Reading the result
"Seal strength rises 0.4 N per °C over 160–180 °C (R² 0.71)."

## When not to use it — and instead
To prove cause → a designed experiment (`stats.doe-factorial`).

## In food and FMCG manufacturing
Product temperature vs weight loss; dough moisture vs bake time.

## References
- [textbook] Montgomery, D.C., Peck, E.A. and Vining, G.G. (2021), *Introduction to Linear Regression Analysis*, 6th ed., Wiley.

## In Faultline
Not built (FC-109, FC-110).
