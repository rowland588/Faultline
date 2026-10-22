---
id: spc.control-charts-variables
name: Control charts for measured data — individuals (XmR), X̄-R and X̄-S
aka: [SPC chart, Shewhart chart, I-MR chart, XmR, X-bar R, X-bar S, process behaviour chart]
discipline: spc
kind: established
evidence: standard
depth: full
checked: 2026-10-22 — ISO 7870-2:2023 (Shewhart control charts, second edition, replaces 2013) scope confirmed online; constants as AIAG SPC (2005) and Montgomery's appendix
needs: [msa.type1-gauge]
next: [spc.capability-measured, spc.run-rules, rca.fishbone-5whys]
alternatives: [spc.cusum-ewma, spc.pre-control, spc.short-run]
related: [spc.normality-checks, spc.control-charts-attribute, stats.autocorrelation]
---
# Control charts for measured data — individuals (XmR), X̄-R and X̄-S

## Purpose and principle
Shewhart's distinction between routine variation (common causes, the system)
and exceptional variation (special causes, something happened). Limits are
worked out from the process's own short-term variation; a point outside, or
a pattern, signals a special cause worth finding. A process with no signals
is predictable — only then does capability mean anything.

## Questions it answers
Is the fill, temperature or seal strength steady? When did it change? Is a
reading unusual enough to act on, or is reacting to it tampering?

## Inputs and minimum conditions
Readings in time order. Individuals: one reading at a time (most food lines:
one pack weighed, one temperature). Subgroups: m readings taken close
together (5 packs every 15 minutes) — rational subgroups, so variation
within is common cause only. 20–25 points (or subgroups) to set the limits
(Phase I); then hold them and plot new points against them (Phase II).

## Procedure and calculation
- **XmR**: centre x̄; MR̄ the mean of |xᵢ − xᵢ₋₁|; limits x̄ ± 2.66·MR̄
  (2.66 = 3/1.128); moving-range chart upper limit 3.267·MR̄.
- **X̄-R** (m ≤ 10): centre X̿, limits X̿ ± A₂R̄; range chart D₃R̄ to D₄R̄.
- **X̄-S** (m > 10): X̿ ± A₃s̄; s chart B₃s̄ to B₄s̄.
- Constants (m: A₂, D₃, D₄, d₂): 2: 1.880, 0, 3.267, 1.128 · 3: 1.023, 0,
  2.574, 1.693 · 4: 0.729, 0, 2.282, 2.059 · 5: 0.577, 0, 2.114, 2.326 · 6:
  0.483, 0, 2.004, 2.534 · 7: 0.419, 0.076, 1.924, 2.704 · 8: 0.373, 0.136,
  1.864, 2.847 · 9: 0.337, 0.184, 1.816, 2.970 · 10: 0.308, 0.223, 1.777, 3.078.
- Signals: a point beyond a limit; then run rules (`spc.run-rules`).

## Assumptions, limits and misuse
- **Specification limits are not control limits.** Never draw one for the other.
- Limits from the overall spread (s) instead of the moving range hide shifts.
- Autocorrelated readings (consecutive packs from one head, temperatures a
  second apart) give limits that are too tight — sample further apart.
- Recalculating limits after every point chases the noise.
- Readings mixing products or heads: one chart a stream, or a short-run chart.

## Reading the result
"Steady: 25 of 25 inside 398.9–403.5 g." · "Out of control at 10:40 —
403.9 g; the hopper had been topped up." Then find the cause, do not adjust
for every point.

## When not to use it — and instead
Small persistent drifts → `spc.cusum-ewma`. Many products, few readings each
→ `spc.short-run`. Good/bad counts → `spc.control-charts-attribute`.

## In food and FMCG manufacturing
Fill weight (XmR from a checkweigher's sample, or X̄-R from 5 packs every 15
minutes), oven or fryer temperature, seal jaw temperature, brine
concentration, slice thickness.

## References
- [standard] ISO 7870-2:2023, *Control charts — Part 2: Shewhart control charts* — scope checked online 22 Oct 2026.
- [manual] AIAG, *Statistical Process Control (SPC) Reference Manual*, 2nd ed., 2005.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019 — control charts for variables; constants appendix.
- [textbook] Wheeler, D.J. and Chambers, D.S. (2010), *Understanding Statistical Process Control*, 3rd ed., SPC Press.
- [textbook] Shewhart, W.A. (1931), *Economic Control of Quality of Manufactured Product*, Van Nostrand.

## In Faultline
Not built as a chart. The capability page draws the readings in order
(`src/screens/StudyScreen.tsx` Dots) with the specification limits; the
pilot adds the individuals chart's limits as the steadiness check
(`knowledge/specs/FC-094-capability.md`). A chart of its own is FC-086.
