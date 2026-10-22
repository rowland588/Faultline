---
id: stats.chi-square-association
name: Are two classifications linked — the chi-square test
aka: [chi square, contingency table, association, defects by shift]
discipline: stats
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Montgomery & Runger)
needs: []
next: [rca.fishbone-5whys]
alternatives: [stats.anova]
related: [rca.stratification]
---
# Are two classifications linked — the chi-square test

## Purpose and principle
Counts in a table (defect type × shift, reject × lane) compared with what
independence would give; a big difference says the two are linked.

## Questions it answers
Are leakers concentrated on one lane? Do label faults depend on the shift?

## Inputs and minimum conditions
Counts in a table; expected counts mostly ≥ 5.

## Procedure and calculation
χ² = Σ (O − E)²/E, E = row total × column total ÷ grand total; df = (r − 1)(c − 1).

## Assumptions, limits and misuse
Small expected counts (use Fisher's exact); percentages instead of counts.

## Reading the result
"Leakers are linked to lane (p = 0.002): lane 3 has 61% of them."

## When not to use it — and instead
Measured values by group → `stats.anova`.

## In food and FMCG manufacturing
Seal failures by lane and jaw; complaints by line and shift.

## References
- [textbook] Montgomery, D.C. and Runger, G.C. (2018), *Applied Statistics and Probability for Engineers*, 7th ed.

## In Faultline
Not built (FC-108).
