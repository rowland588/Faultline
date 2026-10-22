---
id: spc.short-run
name: Short-run charts — many products, few readings each
aka: [deviation from nominal chart, DNOM, Z-MR chart, standardized chart]
discipline: spc
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery; Wheeler)
needs: [spc.control-charts-variables]
next: [spc.capability-measured]
alternatives: [spc.control-charts-variables]
related: []
---
# Short-run charts — many products, few readings each

## Purpose and principle
When a line runs many products briefly, no product has enough readings for a
chart of its own. Plot each reading's deviation from its own nominal (DNOM),
or standardise by each product's σ (Z-MR), so one chart follows the process
across products.

## Questions it answers
Is the filler steady across every product it runs today?

## Inputs and minimum conditions
Readings in order with their product; each product's nominal (and σ for Z).

## Procedure and calculation
DNOM: yᵢ = xᵢ − nominal of its product; an XmR chart on y (valid when spreads are similar). Z-MR: zᵢ = (xᵢ − target)/σ of its product; limits ±3 on z.

## Assumptions, limits and misuse
DNOM assumes the products' spreads are alike; check before pooling.

## Reading the result
"Steady across all six products; the 1 kg run sat 3 g high."

## When not to use it — and instead
Long runs of one product → `spc.control-charts-variables`.

## In food and FMCG manufacturing
A packing line running ten pack sizes a day; a multi-SKU ready-meal line.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — short production runs.
- [textbook] Wheeler, D.J. (1991), *Short Run SPC*, SPC Press.

## In Faultline
Not built (FC-093).
