---
id: stats.chi-square-association
name: Counts by two categories — is one linked to the other? (chi-square test of association)
aka: [chi-square test, contingency table, cross-tabulation, test of independence, Fisher's exact test, Cramér's V]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the test as Montgomery & Runger ch. 9 and Agresti give it (from knowledge; editions to confirm); the worked case (a 3×3 and a 2×2 with Yates and Fisher) computed independently in `scripts/knowledge/cases-stats.py`
needs: []
next: [rca.fishbone-5whys]
alternatives: [stats.anova]
related: [rca.stratification, quality.pareto, quality.defect-concentration]
---
# Counts by two categories — is one linked to the other? (chi-square test of association)

## Purpose and principle
Rejects counted by lane and by fault type; complaints by product and by
month; failures by shift and by machine. The table of counts is the
stratified Pareto; the chi-square test says whether the pattern in it is
more than chance — whether the fault type depends on the lane, or the
rejects on the shift. It is the counted-data twin of ANOVA.

## Questions it answers
- Does the fault type depend on the lane / head / shift / supplier?
- Is the reject rate different between two shifts (a 2×2)?
- How strong is the link (Cramér's V), not just whether it exists?

## Inputs and minimum conditions
- A table of counts: rows one category, columns the other, every event
  counted once in one cell. Counts, never percentages or rates.
- Expected counts (below) at least 5 in most cells (at least 80% of cells,
  none under 1); otherwise merge categories or use Fisher's exact test.
- Events independent (one pack, one count — not one reel's faults counted
  as many events of the same cause).

## Procedure and calculation
- Expected count per cell E = (row total × column total) / grand total —
  what the table would hold if the two categories were unrelated.
- χ² = Σ (O − E)²/E over every cell; df = (rows − 1)(columns − 1); p from
  the χ² distribution, or χ² against the critical value (9.49 at df 4, 3.84
  at df 1, 5%).
- Which cells drive it: the standardised residuals (O − E)/√E; |r| > 2 is a
  cell worth naming.
- Strength: Cramér's V = √(χ² / (N·(min(rows, columns) − 1))), 0 to 1;
  under 0.1 is a link not worth a change.
- 2×2 tables: Yates' continuity correction (|O − E| − 0.5)² is the
  conservative form; Fisher's exact test when any expected count is small
  (the hypergeometric probability of the table and those more extreme).
- Two proportions (rejects day vs night): the same 2×2, or the two-proportion
  z-test, which gives the same p without the correction.

**Worked case** (`cases-stats.py`): rejects on three lanes by three fault
types — lane 1: 18, 7, 5; lane 2: 9, 14, 4; lane 3: 6, 5, 12 (N = 80).
Expected: 12.4, 9.8, 7.9 / 11.1, 8.8, 7.1 / 9.5, 7.5, 6.0 — all above 5.
χ² = 17.2, df 4, p = 0.0017 against a critical 9.49: the fault type depends
on the lane. Cramér's V 0.33 — a moderate link. The cells: lane 1 has far
more of type 1 (18 against 12.4), lane 2 of type 2, lane 3 of type 3 —
three lanes, three different problems. A 2×2: 12 rejects in 100 on days
against 4 in 100 on nights — χ² with Yates 3.33, p 0.068; Fisher p 0.065:
suggestive, not shown at 5%; the count is too small (about 3× more packs
would decide it — `stats.sample-size-power`).

## Assumptions, limits and misuse
- Percentages in the table break it: the test needs the counts and their
  totals. "Lane 1 has 60% type 1" is not an input.
- Small expected counts inflate χ²; merge rare categories or use Fisher.
- A link is not a cause and not a direction: lane 3's type-3 faults may be
  lane 3's product.
- Counting one root event many times (every pack from a bad reel) makes
  the events dependent and the p far too small.
- With a huge N everything is "significant"; read Cramér's V and the
  residuals, and the money of the biggest cell.

## Reading the result
"The fault type depends on the lane (p = 0.002): lane 1's problem is
type 1 (18 of 30), lane 2's is type 2, lane 3's is type 3." Then one
cause per lane (`rca.fishbone-5whys`), with each cell's money — its
rejects × materials a pack (`knowledge/MONEY.md`, Q).

## When not to use it — and instead
A measured outcome by group → `stats.anova`. One category only (the
share of each fault) → `quality.pareto` and a proportion's interval. Where
on the pack or the machine → `quality.defect-concentration`.

## In food and FMCG manufacturing
Rejects by checkweigher lane and fault; seal failures by jaw and by film
reel; complaints by product and by region; foreign-body finds by line and
by material; downtime events by shift and by machine. The table that turns
"we get a lot of X" into "X comes from Y".

## References
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018, ch. 9 — contingency table tests (from knowledge; edition to confirm).
- [textbook] Agresti, A., *An Introduction to Categorical Data Analysis*, 3rd ed., Wiley, 2019 — association, residuals, Fisher's exact test (from knowledge).
- [paper] Cramér, H. (1946), *Mathematical Methods of Statistics*, Princeton — V (from knowledge).

## In Faultline
Built (W3b, 24 October; FC-108). The Analysis tool's *Are two things linked*: a table of counts (rows by
columns, named as the floor names them — lanes by fault types), Pearson's χ² of association with its
expected counts, Cramér's V worded by Cohen's sizes, the standardised residuals with every cell beyond ±2
named and marked; a 2 × 2 gets Yates' correction and Fisher's exact test beside it, Fisher leading when any
expected count is under 5; a larger table that fails the 80%-expect-5 and none-under-1 rule is said not to be
trusted (amber, the p only an approximation) rather than given a verdict. Counts are typed by cell or pasted
as a block and accumulate like runs. The register and the loss count still hold counts of their own
(`src/snag`, `src/tools/losses`); reading them straight into a table is not built. Proved by
`scripts/acceptance/analysis-relations.mjs`.
