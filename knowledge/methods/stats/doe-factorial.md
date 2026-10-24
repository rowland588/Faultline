---
id: stats.doe-factorial
name: Designed experiments — two-level factorials (2ᵏ and fractions)
aka: [DOE, factorial experiment, 2^k design, screening design, fractional factorial, main effects and interactions, Lenth's method]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the 2ᵏ design, effects, the normal plot of effects and Lenth's PSE as Box, Hunter & Hunter (2005) and Montgomery's *Design and Analysis of Experiments* ch. 6–8 give them (from knowledge; editions to confirm); the worked 2³ computed independently in `scripts/knowledge/cases-stats.py`
needs: [msa.gauge-rr]
next: [stats.response-surface, quality.control-plan]
alternatives: [stats.correlation-regression]
related: [stats.anova, rca.fishbone-5whys]
---
# Designed experiments — two-level factorials (2ᵏ and fractions)

## Purpose and principle
To find which settings matter, change several at once in a planned pattern
rather than one at a time: every factor is set low and high, every
combination (or a chosen fraction) is run, and each factor's effect is
read from all the runs together — so a 2³ of eight runs measures three
main effects and their interactions with the precision of eight runs each,
and shows what one-at-a-time never can: that temperature only matters when
dwell is long. It is the only way to prove cause on a line, because the
settings are moved on purpose.

## Questions it answers
- Which of these settings change the result, and by how much?
- Do they interact (does the effect of one depend on another)?
- What settings give the result wanted — and which can be left where they
  are cheapest?

## Inputs and minimum conditions
- k factors each at two levels (low −, high +) chosen wide enough to show
  an effect and safe enough to run; a measured response (seal strength,
  give-away, moisture); the gauge fit (`msa.gauge-rr`).
- Runs in random order, with everything else held; a replicate (every run
  twice) if the noise is unknown, else a centre point or Lenth's method
  for the error.
- 2ᵏ runs for a full factorial (8 at k = 3, 16 at k = 4); a 2ᵏ⁻ᵖ fraction
  for screening five or more factors (a 2⁵⁻¹ of 16 runs, resolution V).

## Procedure and calculation
- Design matrix: columns of −1/+1 for each factor in standard order;
  interaction columns are the products.
- Effect of a factor (or interaction) = mean of the response at + minus the
  mean at − = 2 × its regression coefficient; the fitted model
  ŷ = b₀ + Σbᵢxᵢ + Σbᵢⱼxᵢxⱼ + … with x in coded units (−1 to +1).
- Which effects are real: with replicates, ANOVA (each effect's mean square
  against the error); without, the normal (half-normal) plot of effects —
  the real ones fall off the line — and Lenth's method: s₀ = 1.5 ×
  median|effect|, PSE = 1.5 × median of the |effects| under 2.5s₀, margin
  of error = t₀.₉₇₅,d·PSE with d = m/3 (m effects); an effect beyond the
  margin is real.
- Then the model with the real effects only, its residuals checked, and the
  prediction at any corner or inside the box (in coded units).
- Fractions: the generators (e.g. E = ABCD for a 2⁵⁻¹) and the resolution
  say which effects are aliased; resolution III confounds main effects with
  two-factor interactions (screening only), IV main effects clear of
  two-factor, V two-factor clear of each other.
- Blocking (day, batch of film) as a factor whose effect is removed, not
  read.

**Worked case** (`cases-stats.py`): a 2³ on a bagger — seal temperature T
(−/+), dwell D, pressure P; response seal strength (N), one replicate,
standard order: 10.2, 13.1, 11.0, 15.8, 10.6, 13.4, 11.5, 16.4. Effects:
T 3.85, D 1.85, P 0.45, TD 1.00, TP 0.00, DP 0.10, TDP 0.05. Lenth: PSE
0.15, margin of error 0.565 — T, D and TD are real; pressure is not. The
interaction: temperature adds 2.85 N at short dwell and 4.85 N at long —
the two reinforce. Prediction at T+, D+, P−: 15.8 N; so pressure can sit at
its cheaper low setting with no loss.

## Assumptions, limits and misuse
- Levels too close give no effect; too far give a result that is not linear
  between them (a centre point tests curvature).
- Not randomising the run order lets a drift (a warming machine) masquerade
  as the factor run last.
- One replicate with no Lenth or normal plot has no error estimate; every
  effect "looks" real.
- Aliasing in a fraction is a design choice to be written down; a
  "significant" main effect in a resolution III design may be an
  interaction.
- Factors that cannot be held (ambient humidity) are blocked or recorded
  as covariates, never ignored.
- The response must be measured well enough: a gauge R&R over 30% of the
  effect size buries it.

## Reading the result
"Seal temperature and dwell matter; pressure does not. Temperature adds
3.9 N on average and more at long dwell (interaction 1.0 N). Run at high
temperature and long dwell, pressure low: 15.8 N expected against a
minimum of 12." The money is the rejects avoided (seal failures × their
cost — `knowledge/MONEY.md` Q) and the cost of the settings chosen
(energy at the higher temperature, E; the line speed the dwell costs, T) —
the design says what the result is worth and what it costs to get.

## When not to use it — and instead
A relationship in running data, nothing varied on purpose → `stats.correlation-regression`.
One factor, several levels → `stats.anova`. The best point inside the box
once the factors are known → `stats.response-surface`. Many factors to
screen cheaply → a fraction (above) or a Plackett–Burman design.

## In food and FMCG manufacturing
Seal strength vs temperature, dwell, pressure and film reel; give-away vs
filler speed, product temperature and head setting; moisture vs oven
temperature and belt speed; frying colour vs oil temperature and time;
checkweigher false rejects vs belt speed and pack spacing.

## References
- [textbook] Box, G.E.P., Hunter, J.S. and Hunter, W.G., *Statistics for Experimenters*, 2nd ed., Wiley, 2005, ch. 5–6 — factorial designs, the normal plot of effects (from knowledge).
- [textbook] Montgomery, D.C., *Design and Analysis of Experiments*, 10th ed., Wiley, 2019, ch. 6–8 — 2ᵏ designs, fractions, blocking (from knowledge; edition to confirm).
- [paper] Lenth, R.V. (1989), "Quick and easy analysis of unreplicated factorials", *Technometrics* 31(4), 469–473 — the PSE (from knowledge).

## In Faultline
Not built (FC-111). When built it is a tool of its own: the factors and
levels typed, the run sheet in random order printed for the floor, the
responses typed as the runs are made, the effects plotted and said in
words, Lenth's margin drawn, and the chosen settings handed to the line's
standard (`quality.control-plan`) with their money.
