---
id: planning.safety-stock
name: Safety stock and the reorder point
aka: [safety stock, reorder point, service level, stock cover, fill rate, replenishment time demand, VRTD, efficient frontier, inventory buffer]
discipline: planning
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the reorder-point model and the variance of demand over a variable lead time from knowledge (Silver, Pyke & Thomas 2017); Factory Physics' framing — the variance of replenishment-time demand as the driver, safety stock = z × its standard deviation, the efficient frontier of inventory against fill rate — confirmed on 24 October in a Factory Physics Inc. webinar deck (Pound, 2013) and the publisher's description of Pound, Bell & Spearman (2014); that book's text not read (knowledge/SOURCES.md)
needs: []
next: []
alternatives: [lean.kanban-supermarket, maintenance.spares-poisson]
related: [capacity.kingman-vut, cost.inventory-carrying-cost]
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
- Demand over the replenishment (lead) time L has mean d̄·L and, with demand
  and lead time independent, variance L·σ_d² + d̄²·σ_L² — Factory Physics'
  *variance of replenishment-time demand* (VRTD), the one number that drives
  how much stock a service level needs.
- Safety stock SS = z × √(L·σ_d² + d̄²·σ_L²), z from the normal table for the
  service level wanted (a 98% chance of no stock-out in a cycle: z ≈ 2.05).
- Reorder point ROP = d̄·L + SS; the average stock held ≈ half the order
  quantity + SS.
- Fill rate (the share of demand met from stock) is the service measure the
  2014 book works with; for a given demand and lead time there is a least
  inventory for each fill rate — the **efficient frontier**. A stock position
  above the curve is holding more than its fill rate needs; one below it is
  short of its fill rate. Being *on* the frontier first, then moving along
  it, is the order of work.
- What the stock costs to hold: its value × the carrying rate a year
  (`cost.inventory-carrying-cost`).

## Assumptions, limits and misuse
Normal demand over the lead time (poor for slow, lumpy items — a Poisson or
empirical model then); demand and lead time independent; a supplier whose
lead time is read from the contract rather than measured; the same z for
every item regardless of its cost or its consequence. Cutting the VRTD
(shorter, steadier lead times; steadier demand) cuts the stock a service
level needs — the variability buffering law with inventory as the buffer
(`capacity.kingman-vut`).

## Reading the result
"Film reels: 2.4 a day used (σ 0.9), delivered in 5 days (σ 1.5). Demand over
the lead time 12 reels, its standard deviation √(5×0.81 + 5.76×2.25) = 4.1; at
98% service the safety stock is 8.5 reels, the reorder point 21. The 30 we
hold on average is above the frontier for 98% — six reels, £1,400, that buy
no service; a day off the supplier's spread would do more than any of it."

## When not to use it — and instead
Line-side replenishment → `lean.kanban-supermarket`.

## In food and FMCG manufacturing
Packaging materials, ingredients with long lead times.

## References
- [textbook] Silver, E.A., Pyke, D.F. and Thomas, D.J. (2017), *Inventory and Production Management in Supply Chains*, 4th ed., CRC Press — the (s, Q) model, the variance of lead-time demand. From knowledge.
- [textbook] Pound, E.S., Bell, J.H. and Spearman, M.L. (2014), *Factory Physics for Managers*, McGraw-Hill Education — the variance of replenishment-time demand as the third key equation; fill rate against inventory; the efficient frontier. Publisher's description confirmed 24 October 2026; text not read.
- [practitioner] Pound, E.S. (2013), *Standard Work for Optimal Inventory Management*, Factory Physics Inc. webinar for IISE — "Safety stock = z × SD(replenishment time demand)"; higher VRTD raises average inventory and lowers fill rate. Read online 24 October 2026.
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., ch. 2 (inventory control) and ch. 17 — the (Q, r) model and the inventory–service frontier. From knowledge.

## In Faultline
**Built 25 October 2026 (FC-183):** the reorder point and the safety stock are a calculator — Safety stock and reorder point at
`#/calc/safety-stock` (`src/tools/calc/defs/safety-stock.ts`, `src/lib/ie/pull.ts` `reorderPoint`): z from the service level (a said
choice), the spread over the lead time, the share of it that is the supplier's, the holding cost a year and the stock-outs a year with
what they cost. Worked cases `scripts/knowledge/cases-calc.py` S1–S6. Not built: the fill-rate frontier, periodic review, lumpy demand.
