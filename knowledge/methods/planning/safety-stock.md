---
id: planning.safety-stock
name: Safety stock and the reorder point
aka: [safety stock, reorder point, service level, stock cover]
discipline: planning
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Silver, Pyke & Thomas 2017)
needs: []
next: []
alternatives: [lean.kanban-supermarket, maintenance.spares-poisson]
related: []
---
# Safety stock and the reorder point

## Purpose and principle
Stock held against variation in demand and lead time so a shortage is rare
enough: reorder when stock reaches demand over lead time plus safety stock.

## Questions it answers
How much film or tray stock must we hold not to run out?

## Inputs and minimum conditions
Demand mean and spread a day; lead time mean and spread; service level.

## Procedure and calculation
SS = z·√(L·σ_d² + d̄²·σ_L²); ROP = d̄·L + SS.

## Assumptions, limits and misuse
Normal demand; ignoring supplier reliability.

## Reading the result
"Reorder at 14 reels; 4 of them safety stock for 98% service."

## When not to use it — and instead
Line-side replenishment → `lean.kanban-supermarket`.

## In food and FMCG manufacturing
Packaging materials, ingredients with long lead times.

## References
- [textbook] Silver, E.A., Pyke, D.F. and Thomas, D.J. (2017), *Inventory and Production Management in Supply Chains*, 4th ed.

## In Faultline
Not built (FC-183).
