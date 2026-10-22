---
id: spc.cusum-ewma
name: CUSUM and EWMA charts — small, persistent shifts
aka: [cumulative sum, exponentially weighted moving average, drift detection]
discipline: spc
kind: established
evidence: standard
depth: summary
checked: 2026-10-22 — from knowledge: Page (1954), Roberts (1959), Montgomery; ISO 7870-4 (CUSUM) and ISO 7870-6 (EWMA) named from knowledge, editions to confirm
needs: [spc.control-charts-variables]
next: [rca.fishbone-5whys]
alternatives: [spc.run-rules]
related: [stats.time-series-trend]
---
# CUSUM and EWMA charts — small, persistent shifts

## Purpose and principle
Shewhart charts react to big changes; a shift of half to one standard
deviation can go unseen for dozens of points. CUSUM accumulates deviations
from target; EWMA smooths with weight λ on the newest point. Both catch
small sustained shifts fast.

## Questions it answers
Has the mean drifted a little, persistently — the give-away slowly creeping?

## Inputs and minimum conditions
Readings in order, a target, and σ from a steady period.

## Procedure and calculation
- Tabular CUSUM: C⁺ᵢ = max(0, xᵢ − (μ₀ + K) + C⁺ᵢ₋₁), C⁻ᵢ = max(0, (μ₀ − K) − xᵢ + C⁻ᵢ₋₁);
  signal when either exceeds H. Common choice K = 0.5σ, H = 4σ or 5σ.
- EWMA: zᵢ = λxᵢ + (1 − λ)zᵢ₋₁, z₀ = μ₀; limits μ₀ ± Lσ√(λ/(2 − λ)·[1 − (1 − λ)^(2i)]);
  common λ = 0.05–0.25, L ≈ 2.7–3.

## Assumptions, limits and misuse
Needs a target and a good σ; slow to show a large jump compared with Shewhart; parameters chosen by the average run length wanted.

## Reading the result
"The CUSUM crossed its limit at 11:20 — the mean has been about 0.6 g high since 10:40."

## When not to use it — and instead
Big sudden changes → `spc.control-charts-variables`.

## In food and FMCG manufacturing
Give-away creeping on a filler; a slow loss of seal strength as jaws wear; brine concentration drifting.

## References
- [paper] Page, E.S. (1954), "Continuous inspection schemes", *Biometrika* 41(1–2), 100–115.
- [paper] Roberts, S.W. (1959), "Control chart tests based on geometric moving averages", *Technometrics* 1(3), 239–250.
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019.

## In Faultline
Not built (FC-091).
