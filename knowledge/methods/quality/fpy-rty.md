---
id: quality.fpy-rty
name: Right first time — first pass yield and rolled throughput yield
aka: [FPY, RTY, first pass yield, rolled throughput yield, right first time, the hidden factory, normalised yield]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — FPY, RTY, the e^(−DPU) relation and the hidden factory as the Six Sigma texts give them (Breyfogle 2003; Pyzdek & Keller 2018 — from knowledge); the worked case computed independently in `scripts/knowledge/cases-quality.py`
needs: []
next: [quality.copq]
alternatives: [yield.mass-balance-yield]
related: [spc.capability-attribute-defects, quality.check-sheet, lean.seven-wastes]
---
# Right first time — first pass yield and rolled throughput yield

## Purpose and principle
A line's final yield can be 99.5% while a quarter of its packs were
reworked, re-run or re-checked on the way — the hidden factory. First
pass yield counts, at each step, the share that went through right first
time with no rework; rolled throughput yield multiplies the steps, and is
the share of what came in that went straight through everything. It is
the measure the rework culture hides, and the one that says where the
re-doing is.

## Questions it answers
- What share of packs goes through each step right first time?
- What share goes through the whole line untouched (RTY)?
- Which step costs most of the re-doing?
- How does a step's fault rate (DPU) translate into yield?

## Inputs and minimum conditions
- Per step: units in, units passed first time (no rework, no re-run, no
  re-inspection), units reworked, units scrapped — counted at the step,
  for the same period.
- The steps in order; rework returned to a step counted at that step, not
  as new input.
- Rejects by kind for the step's Pareto (`quality.check-sheet`).

## Procedure and calculation
- FPYᵢ = passed first time at step i ÷ input to step i.
- RTY = Π FPYᵢ over the steps (the chance a unit goes straight through).
- Normalised yield per step = RTY^(1/k) — the "typical step" yield, for
  comparing lines of different length.
- From faults: with DPU faults per unit at a step, FPY ≈ e^(−DPU)
  (Poisson, the chance of zero faults) — the link to `spc.capability-attribute-defects`.
- Final yield (out ÷ in, after rework) against RTY: the gap is the hidden
  factory's share; its packs × the rework cost is its money.
- The step with the lowest FPY, or the largest (1 − FPY) × its rework cost,
  is the first project.
- Over time: each step's FPY on a p-chart; RTY weekly on the trend
  (`stats.time-series-trend`).

**Worked case** (`cases-quality.py`): a four-step line — slice 0.985,
weigh 0.960, seal 0.975, label 0.990. RTY = 0.913; normalised 0.977 a
step. The seal step's DPU 0.025 gives FPY e^(−0.025) = 0.975 — the same
figure from faults. Of 10,000 packs in, 9,127 go straight through; 873 are
reworked or lost — while the final yield after rework might read 99.5%.
The weigh step (4% re-fed) is the hidden factory's biggest room.

## Assumptions, limits and misuse
- Counting rework as new input flatters FPY; it is counted where it
  returns.
- Steps counted on different periods or different units (packs at one,
  cases at another) cannot be multiplied; convert to one unit.
- RTY of a long line is small even with good steps (20 steps at 99% is
  82%) — read the normalised yield beside it.
- The e^(−DPU) relation assumes faults are Poisson and any fault fails
  the unit; a unit with one cosmetic fault still passing breaks it.
- FPY is not capability: a step can be 99% today by luck; the chart says
  whether it holds.

## Reading the result
"91% of packs go through right first time; the weigh step re-feeds 4%,
the seal 2.5% — 873 of 10,000 reworked or lost, though 99.5% ship."
Money: the hidden factory's packs × the step's rework cost (labour again,
materials where scrapped — `knowledge/MONEY.md` Q, L), the first line of
the cost of poor quality (`quality.copq`).

## When not to use it — and instead
Mass in and out (ingredients to product, with trim and waste) →
`yield.mass-balance-yield`. The cost totals by bucket → `quality.copq`.
A step's faults per unit → `spc.capability-attribute-defects`.

## In food and FMCG manufacturing
Slicing → weighing → sealing → coding → casing: re-fed under-weights, re-
sealed packs, re-coded packs, re-packed cases; a ready-meal line's
deposit steps; a bakery's proof → bake → cool → slice → bag. The rework
nobody counts because the final yield looks fine.

## References
- [textbook] Breyfogle, F.W., *Implementing Six Sigma*, 2nd ed., Wiley, 2003 — RTY, the hidden factory, yield from DPU (from knowledge; edition to confirm).
- [textbook] Pyzdek, T. and Keller, P., *The Six Sigma Handbook*, 5th ed., McGraw-Hill, 2018 (from knowledge).
- [textbook] Harry, M. and Schroeder, R., *Six Sigma*, Doubleday, 2000 — the hidden factory (from knowledge).

## In Faultline
Not built (FC-127). The value stream map already holds the steps in order
with their rejects (`src/tools/valuestream`); FC-127 adds per-step counts
in, first-time out and reworked, says FPY, RTY and the hidden factory in
packs and money, and marks the step to start on.
