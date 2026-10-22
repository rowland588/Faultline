---
id: stats.doe-factorial
name: Designed experiments — two-level factorials
aka: [DOE, design of experiments, factorial experiment, fractional factorial, main effects, interactions]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Box, Hunter & Hunter 2005; Montgomery 2017)
needs: [msa.gauge-rr]
next: [stats.response-surface, quality.control-plan]
alternatives: [stats.correlation-regression]
related: [stats.anova]
---
# Designed experiments — two-level factorials

## Purpose and principle
Change several settings together in a planned pattern (each at two levels),
so each setting's effect and their interactions are found from few runs and
causes are proved, not inferred.

## Questions it answers
Which of temperature, dwell and pressure drive seal strength, and do they interact?

## Inputs and minimum conditions
Factors and their two levels; the response measured reliably; runs randomised; replicates or centre points.

## Procedure and calculation
2^k (or 2^(k−p)) runs; effect = mean at high − mean at low; significance by ANOVA or normal plot of effects.

## Assumptions, limits and misuse
Levels too close to see an effect; not randomising; changing other things meanwhile.

## Reading the result
"Temperature +2.1 N, dwell +0.9 N, interaction negligible: raise temperature, keep dwell."

## When not to use it — and instead
Finding the optimum on curved ground → `stats.response-surface`.

## In food and FMCG manufacturing
Seal settings on a tray sealer; fryer time and temperature on colour and oil.

## References
- [textbook] Box, G.E.P., Hunter, J.S. and Hunter, W.G. (2005), *Statistics for Experimenters*, 2nd ed., Wiley.
- [textbook] Montgomery, D.C. (2017), *Design and Analysis of Experiments*, 9th ed., Wiley.

## In Faultline
Not built (FC-111).
