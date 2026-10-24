---
id: stats.correlation-regression
name: Does one thing move with another? — correlation and least-squares regression
aka: [Pearson r, scatter plot, linear regression, least squares, R², trend line, what drives it, multiple regression]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — r, the least-squares line, its standard errors and R² as Montgomery & Runger ch. 11 and Montgomery, Peck & Vining give them (from knowledge; editions to confirm); the worked case computed independently in `scripts/knowledge/cases-stats.py`; Faultline once had regression in the method engine, deleted 20 October (`docs/DIRECTION.md`)
needs: [stats.descriptive]
next: [stats.doe-factorial]
alternatives: [stats.doe-factorial]
related: [stats.anova, stats.time-series-trend, stats.autocorrelation]
---
# Does one thing move with another? — correlation and least-squares regression

## Purpose and principle
Seal strength against jaw temperature; give-away against filler speed;
rejects against humidity. The scatter plot shows whether the two move
together; r says how tightly; the least-squares line says by how much
(the slope, with its uncertainty) and predicts one from the other. It is
the tool for a relationship seen in running data; a designed experiment
(`stats.doe-factorial`) is the tool for proving one.

## Questions it answers
- Do the two move together, and how strongly (r, R²)?
- How much does y change per unit of x (the slope, with its interval)?
- What y is expected at a given x — and how far off might it be?
- Is a straight line enough (the residuals)?

## Inputs and minimum conditions
- Pairs (xᵢ, yᵢ) from the same moment or the same pack; at least 10–12
  pairs for a slope worth quoting, 20+ for a usable prediction.
- x spread over a range (a line through a cluster says nothing); the
  pairs independent (not twenty readings in one minute).
- Both measured well (`msa.gauge-rr`); error in x biases the slope toward
  zero.

## Procedure and calculation
- Pearson r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √(Σ(xᵢ − x̄)² Σ(yᵢ − ȳ)²), −1 to +1;
  Spearman's ρ (the same on ranks) for a monotonic but curved link or
  outliers.
- Least squares: b = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)², a = ȳ − b·x̄;
  ŷ = a + bx.
- Residuals eᵢ = yᵢ − ŷᵢ; residual standard deviation s_e = √(Σeᵢ²/(n − 2)).
- R² = r² — the share of y's variation the line explains.
- Slope's standard error SE_b = s_e / √Σ(xᵢ − x̄)²; its 95% interval
  b ± t₀.₉₇₅,ₙ₋₂·SE_b; the slope is "real" when the interval excludes 0
  (equivalently r's test, t = r√(n − 2)/√(1 − r²)).
- Prediction interval for one new y at x₀: ŷ₀ ± t·s_e·√(1 + 1/n +
  (x₀ − x̄)²/Σ(xᵢ − x̄)²) — wider than the line's own interval.
- Residual checks: plotted against x and in time order — a curve means the
  straight line is wrong (add x², or a transform); a fan means the spread
  grows with x; lag-1 correlation of the residuals in time means the pairs
  were not independent.
- Several x at once: multiple regression, the same least squares with the
  matrix (XᵀX)⁻¹Xᵀy; each coefficient read "per unit of this, with the
  others held"; collinear x's make the coefficients unstable — a designed
  experiment separates them.

**Worked case** (`cases-stats.py`): seal strength (N) at twelve jaw
temperatures 150–205 °C: 9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1,
15.9, 16.2, 16.8, 17.0. r = 0.987 (p 3×10⁻⁹); slope 0.145 N per °C
(95%: 0.128–0.162), intercept −12.0, R² 0.974, s_e 0.45 N; predicted 12.95
N at 172 °C. The residuals run − − − + + + + + + − − −, lag-1 r 0.46: the
line is too straight — strength is levelling off above 190 °C, so a
quadratic (or a plateau) is the honest model, and extrapolating the line
to 220 °C would promise strength the seal will not give.

## Assumptions, limits and misuse
- Correlation is not cause: give-away and ambient temperature may both
  follow the shift. Only varying x on purpose shows cause (`stats.doe-factorial`).
- Extrapolation beyond the x range is a guess; say the range the line holds.
- One far-out pair can make or break r; the scatter plot is looked at
  before anything is quoted.
- A curved relationship with a good R² still misleads at the ends — the
  residuals decide.
- Running data at one setting (x barely varies) cannot find the slope.

## Reading the result
"Seal strength rises 0.145 N for every degree of jaw temperature between
150 and 190 °C (R² 0.97), levelling above that; at 172 °C expect 13.0 ±
1.0 N." Then the setting that meets the agreed minimum with margin, and
its money — the rejects avoided × their cost, or the energy of running
hotter than needed (`knowledge/MONEY.md`, Q and E).

## When not to use it — and instead
Several settings changed on purpose → `stats.doe-factorial`. Groups, not a
scale → `stats.anova`. A trend over time → `stats.time-series-trend`.
Counts by category → `stats.chi-square-association`.

## In food and FMCG manufacturing
Seal strength vs jaw temperature, dwell or pressure; give-away vs filler
speed or product temperature; moisture loss vs oven time; reject rate vs
line speed; cycle time vs pack weight; Brix vs refractometer temperature.

## References
- [textbook] Montgomery, D.C. and Runger, G.C., *Applied Statistics and Probability for Engineers*, 7th ed., 2018, ch. 11–12 — simple and multiple linear regression (from knowledge; edition to confirm).
- [textbook] Montgomery, D.C., Peck, E.A. and Vining, G.G., *Introduction to Linear Regression Analysis*, 6th ed., Wiley, 2021 — residual analysis, prediction intervals (from knowledge).
- [textbook] Draper, N.R. and Smith, H., *Applied Regression Analysis*, 3rd ed., Wiley, 1998 (from knowledge).

## In Faultline
Not built (FC-109 simple, FC-110 multiple). *What drives it* was a
worked-out figure in the method engine deleted on 20 October
(`docs/DIRECTION.md`). When rebuilt it reads two measures the app already
holds on the same records (a study's readings against a setting typed with
them), draws the scatter with the line and its band, says the slope in the
floor's units with its interval, warns on the residuals, and never
extrapolates on screen beyond the x range.
