---
id: quality.fpy-rty
name: First pass yield and rolled throughput yield
aka: [first pass yield, FPY, right first time, rolled throughput yield, RTY]
discipline: quality
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Six Sigma literature: Breyfogle; Pyzdek & Keller)
needs: []
next: [quality.copq]
alternatives: [yield.mass-balance-yield]
related: [spc.capability-attribute-defects]
---
# First pass yield and rolled throughput yield

## Purpose and principle
FPY: the share of units that pass a step right first time (no rework, no
reject). RTY: the product of every step's FPY — the chance a unit passes all
steps first time, exposing the hidden factory of rework.

## Questions it answers
How much is right first time, step by step and end to end?

## Inputs and minimum conditions
Each step's input, units passed first time, reworked, rejected.

## Procedure and calculation
FPY = passed first time ÷ input; RTY = Π FPYᵢ; from DPU: FPY ≈ e^(−DPU).

## Assumptions, limits and misuse
Counting reworked units as first-pass good.

## Reading the result
"Steps at 98%, 96%, 99%: RTY 93% — 7 in 100 touched twice or thrown."

## When not to use it — and instead
Material yield by weight → `yield.mass-balance-yield`.

## In food and FMCG manufacturing
Bake–cool–slice–pack with rework of mis-sliced loaves.

## References
- [textbook] Pyzdek, T. and Keller, P. (2018), *The Six Sigma Handbook*, 5th ed., McGraw-Hill.

## In Faultline
Not built (FC-127).
