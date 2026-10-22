---
id: planning.lot-sizing
name: Batch size and campaign length — EOQ and EPQ
aka: [EOQ, EPQ, economic batch quantity, campaign length, lot size]
discipline: planning
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — Harris (1913) and the EPQ form, from knowledge (Silver, Pyke & Thomas 2017)
needs: [changeover.smed]
next: [lean.heijunka-epei]
alternatives: [lean.heijunka-epei]
related: []
---
# Batch size and campaign length — EOQ and EPQ

## Purpose and principle
The batch that balances the cost of changing over against the cost of holding
stock: EOQ = √(2DS/H); with production at rate P against demand D, EPQ = √(2DS/(H(1 − D/P))).

## Questions it answers
How long a campaign should we run? What does halving the changeover do to the batch?

## Inputs and minimum conditions
Demand D, changeover cost S, holding cost H a unit a period, production rate P.

## Procedure and calculation
As above; batch time = EPQ ÷ P.

## Assumptions, limits and misuse
Steady demand; shelf life caps the batch in food.

## Reading the result
"EPQ 18,000 packs (5 hours); halve the changeover and it is 12,700."

## When not to use it — and instead
Levelled mixed production → `lean.heijunka-epei`.

## In food and FMCG manufacturing
Frozen products; ambient sauces; anything with long changeovers.

## References
- [paper] Harris, F.W. (1913), "How many parts to make at once", *Factory, The Magazine of Management* 10(2), 135–136.
- [textbook] Silver, E.A., Pyke, D.F. and Thomas, D.J. (2017), *Inventory and Production Management in Supply Chains*, 4th ed.

## In Faultline
Not built (FC-182).
