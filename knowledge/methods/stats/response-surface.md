---
id: stats.response-surface
name: Finding the best setting — response surfaces and the one-factor curve
aka: [RSM, response surface methodology, central composite design, quadratic model, optimisation, desirability, steepest ascent]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the second-order model, the central composite design, the stationary point and desirability as Myers, Montgomery & Anderson-Cook give them (from knowledge; 4th ed. 2016 to confirm); the one-factor quadratic worked case computed independently in `scripts/knowledge/cases-stats.py`
needs: [stats.doe-factorial]
next: [quality.control-plan]
alternatives: [stats.doe-factorial]
related: [stats.correlation-regression, yield.giveaway]
---
# Finding the best setting — response surfaces and the one-factor curve

## Purpose and principle
Once the factorial has said which two or three factors matter, the question
is *where* in their range the result is best — and a straight-line model
cannot say, because a best point is a curve. The response surface fits a
quadratic (curvature and interactions) from a design with points inside
the box and beyond its corners, and reads the stationary point: the
minimum give-away, the maximum seal strength, the settings that keep
several responses within their limits at once.

## Questions it answers
- Where is the best setting of two or three factors — and how flat is the
  top (how much slack the operator has)?
- Is the best point inside the range tried, or at an edge (so the range
  must move)?
- What settings keep strength above its minimum *and* give-away below its
  target *and* speed at its rate (several responses)?

## Inputs and minimum conditions
- The factors that matter (two to four), from `stats.doe-factorial`, with
  the direction of improvement known.
- A design with at least three levels per factor: the central composite
  (the 2ᵏ corners, 2k axial points at ±α, 3–6 centre points; α = 2^(k/4)
  for rotatability, 1 for a face-centred design when the axial points are
  not runnable) or the Box–Behnken (edge midpoints, no corners — safer
  when corners are extreme); at least 13 runs for k = 2, 20 for k = 3.
- Runs randomised; the gauge fit; the responses measured on every run.

## Procedure and calculation
- The model: ŷ = b₀ + Σbᵢxᵢ + Σbᵢᵢxᵢ² + Σbᵢⱼxᵢxⱼ, fitted by least squares
  in coded units; lack-of-fit tested against the centre points' pure error
  (a significant lack of fit means a cubic term or a transform).
- The stationary point: solve ∂ŷ/∂x = 0 — for one factor x* = −b₁/(2b₁₁);
  in general x* = −½B⁻¹b with B the matrix of quadratic and half-interaction
  coefficients. The eigenvalues of B say its nature: all negative a
  maximum, all positive a minimum, mixed a saddle (ridge) — then the
  ridge is walked, not the point quoted.
- Before the surface, when far from the best: the path of steepest ascent
  from the factorial's first-order model (move along the gradient in steps,
  run until the response stops improving, then design the surface there).
- Several responses: each with its own surface; the overlay of their
  acceptable regions, or a desirability function (each response scaled 0–1
  by its target or limits, the geometric mean maximised) to pick one
  setting.
- Say the slack: the region within which the predicted response stays
  inside its limit — the operator's window.

**Worked case** (`cases-stats.py`, one factor): give-away (g) at filler
speeds 40, 50, 60, 70, 80, 90 a minute — 1.9, 1.3, 1.0, 1.1, 1.6, 2.4.
Quadratic fit ŷ = 0.00182x² − 0.2268x + 8.064; stationary point x* =
62.3 a minute with give-away 1.00 g there. The curve says the filler is
best around 60–65, give-away 0.1 g worse at 50 or 75 and 0.9 g worse at 40
or 85 — a shift's give-away at 85 against 62 is 1.4 g × packs × £/kg.

## Assumptions, limits and misuse
- A quadratic is a local model; outside the design's region it is a
  parabola with no physics behind it — never extrapolate to a setting not
  run.
- A saddle reported as "the optimum" is the classic misuse; the eigenvalues
  are read.
- A best point at an edge of the design means the design was in the wrong
  place; move and rerun.
- Noise: without centre points there is no pure error and no lack-of-fit
  test; the surface may be fitting noise.
- Several responses optimised one at a time give several different
  answers; the overlay or desirability is the honest one.

## Reading the result
"Give-away is lowest at 62 a minute (1.0 g a pack); between 55 and 70 it
stays within 0.15 g; at 85 it costs 1.4 g more a pack — £X a shift."
Then the setting into the line's standard with its window
(`quality.control-plan`) and the money (`knowledge/MONEY.md`, Q for
give-away; T if the best setting is slower than the rate wanted — the two
said side by side, never netted).

## When not to use it — and instead
Which factors matter is not yet known → `stats.doe-factorial`. One factor
in running data → `stats.correlation-regression` with a quadratic term,
and the caveat that nothing was varied on purpose.

## In food and FMCG manufacturing
Filler speed and product temperature for give-away; seal temperature and
dwell for strength with speed as a constraint; oven temperature and belt
speed for colour and moisture together; mixer speed and time for texture.
The classic trade: the fastest speed at which quality still holds.

## References
- [textbook] Myers, R.H., Montgomery, D.C. and Anderson-Cook, C.M., *Response Surface Methodology*, 4th ed., Wiley, 2016 — the second-order model, CCD, stationary points, desirability (from knowledge; edition to confirm).
- [textbook] Box, G.E.P. and Draper, N.R., *Response Surfaces, Mixtures, and Ridge Analyses*, 2nd ed., Wiley, 2007 (from knowledge).
- [paper] Derringer, G. and Suich, R. (1980), "Simultaneous optimization of several response variables", *Journal of Quality Technology* 12(4), 214–219 — desirability (from knowledge).

## In Faultline
Research first (FC-112): the factorial (FC-111) comes first, and the one-
factor curve (a quadratic on a setting already typed against readings) is
the part that could be built early as a mode of `stats.correlation-regression`,
with the stationary point said and extrapolation refused on screen.
