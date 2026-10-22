---
id: planning.forecast-accuracy
name: Forecast accuracy — error and bias
aka: [forecast accuracy, MAPE, bias, forecast error, WMAPE]
discipline: planning
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Hyndman & Athanasopoulos)
needs: []
next: []
alternatives: []
related: [capacity.load-vs-demand]
---
# Forecast accuracy — error and bias

## Purpose and principle
How far the demand forecast was from what was ordered, and whether it leans one way.

## Questions it answers
Can we plan on this forecast? Is it always high or low?

## Inputs and minimum conditions
Forecast and actual demand by product and period.

## Procedure and calculation
WMAPE = Σ|A − F| ÷ ΣA; bias = Σ(F − A) ÷ ΣA.

## Assumptions, limits and misuse
MAPE on small volumes explodes.

## Reading the result
"WMAPE 18%, bias +6% — forecasts run high."

## When not to use it — and instead
—

## In food and FMCG manufacturing
Promotional uplift forecasts.

## References
- [textbook] Hyndman, R.J. and Athanasopoulos, G. (2021), *Forecasting: Principles and Practice*, 3rd ed., OTexts.

## In Faultline
Not built (FC-186).
