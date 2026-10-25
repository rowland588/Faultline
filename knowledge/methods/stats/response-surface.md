---
id: stats.response-surface
name: Finding the best setting — response surfaces and the one-factor curve
aka: [RSM, response surface methodology, central composite design, Box-Behnken, quadratic model, optimisation, desirability, steepest ascent, canonical analysis]
discipline: stats
kind: established
evidence: textbook
depth: full
checked: 2026-10-25 — RESEARCHED for FC-112. Read this session (web SEARCH excerpts only — itl.nist.gov, Wikipedia, publishers and journals are refused by the container, so no page body was fetched): the NIST/SEMATECH e-Handbook's pages on central composite designs (types CCC, CCI, CCF; which are rotatable; three levels for the face-centred), Box-Behnken designs (edge midpoints and centre, three levels, no embedded factorial, rotatable or nearly so) and its appendix on canonical analysis of quadratic responses (the B matrix decides maximum, minimum or saddle; A-form when the stationary point is outside the region, B-form inside; follow a rising ridge) — as excerpts returned by the search tool; calculator, R-package and software pages for run counts and the rotatable α. NOT read: the e-Handbook pages in full, Myers–Montgomery–Anderson-Cook (4th ed. 2016), Box & Draper, Box & Behnken (1960), Derringer & Suich (1980) — all from knowledge, editions to confirm. The designs' run counts and rotatability, the fit, its statistics, the stationary point, the operator's window, the refusal of a point outside the region, the coverage of the intervals and the lack-of-fit test, desirability's hand cases and the earlier one-factor case are all computed independently in `knowledge/research/cases-research-2-rsm.py` (NumPy and SciPy; 23 checks, all passing)
needs: [stats.doe-factorial]
next: [quality.control-plan]
alternatives: [stats.doe-factorial]
related: [stats.correlation-regression, yield.giveaway, stats.sample-size-power, stats.confidence-intervals]
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

**What can be built honestly (researched 25 October 2026).** Everything the
method needs is public mathematics and can be checked independently: the
design tables are *constructions* (corners, axial points at ±α, centre runs;
edge midpoints), not copyrighted tables; the fit is ordinary least squares
on a six- or ten-term model; the stationary point is one linear solve; the
nature of the point is the sign of the eigenvalues. What cannot be
honestly promised is the *use*: a person must run 13 to 20 real settings in
random order, resetting between them, and type a response for each; the tool
can design, fit, test and say where the fit is not to be trusted, but it
cannot make a drifting line behave.

## Questions it answers
- Where is the best setting of two or three factors — and how flat is the
  top (how much slack the operator has)?
- Is the best point inside the range tried, or at an edge (so the range
  must move)?
- What settings keep strength above its minimum *and* give-away below its
  target *and* speed at its rate (several responses)?

## Inputs and minimum conditions
- The factors that matter (two or three; four at most), from
  `stats.doe-factorial`, with the direction of improvement known and each
  factor settable to five levels without hurting the line.
- A design with at least three levels per factor:
  - **central composite (CCD):** the 2ᵏ corners, 2k axial points at ±α, and
    3–6 centre runs. α = (2ᵏ)^(1/4) for **rotatability** (1.414, 1.682, 2.000
    for k = 2, 3, 4); α = 1 is the **face-centred** form (three levels, easy to
    run, *not* rotatable); the **inscribed** form (corners scaled to ±1/α)
    when the axial points are the limit of what can be run.
  - **Box-Behnken (BBD):** for every pair of factors a 2² square at ±1 with
    the others at 0, plus centre runs — 12 + centre for k = 3, 24 for k = 4,
    40 for k = 5; **no corners**, so safer when the corner (all high, all low)
    is a dangerous or wasteful setting; three levels; "rotatable or nearly" by
    NIST (computed here: *not* exactly rotatable for k = 3).
- Runs: terms = (k + 1)(k + 2)/2 (6, 10, 15), so residual df = runs − terms;
  **at least 13 runs for k = 2, 17–20 for k = 3** (CCD with 3–6 centre runs) and
  15 for a three-factor BBD with 3 centre runs. At least 3, better 5, **true
  replicates** at the centre (the machine reset between them), or there is no
  pure error and no lack-of-fit test.
- Runs in a random order, all inside one batch of material and one shift (or a
  block — not offered); the gauge fit; the response measured the same way on
  every run.

## Procedure and calculation
- The model, in coded units (each factor scaled so its low and high are −1 and
  +1; natural = centre + half-range × coded):
  ŷ = b₀ + Σbᵢxᵢ + Σbᵢᵢxᵢ² + Σbᵢⱼxᵢxⱼ, by least squares; the standard
  errors from s²(X′X)⁻¹; R², adjusted R², and **predicted R²** from PRESS
  (residual ÷ (1 − hat), squared, summed — a model that fits itself and
  predicts nothing shows here).
- **Lack of fit** against the centre runs' pure error: SS_PE from the centre
  runs (df = centre runs − 1), SS_LOF = SS_residual − SS_PE, F = MS_LOF/MS_PE.
  A significant lack of fit means a cubic term, a transform or a run that went
  wrong — never "good model".
- The stationary point: solve ∂ŷ/∂x = 0 — for one factor x* = −b₁/(2b₁₁);
  in general x* = −½B⁻¹b with B the symmetric matrix of the bᵢᵢ on the diagonal
  and half the bᵢⱼ off it; ŷ* = b₀ + ½b′x*. The eigenvalues of B say its nature:
  all negative a maximum, all positive a minimum, mixed a saddle (ridge) — then
  the ridge is walked, not the point quoted; a very small eigenvalue beside a
  large one is a long flat ridge, the point poorly located.
- **Region of validity:** the distance of x* from the centre against what was
  run (α for the CCD, √2 for the BBD's edge midpoints). Outside it, the
  quadratic is a parabola with no physics behind it: refuse the point, report
  the best inside the region on its edge, and say *move the design and run
  again*.
- **The operator's window:** the region, inside what was run, where the
  prediction stays within a stated amount of the best — drawn as a contour, said
  as ranges.
- **Confidence and prediction:** ŷ* ± t·s√(v′(X′X)⁻¹v) for the mean, and with
  s²+… for a single run; a **confirmation run** at the chosen setting is
  compared with the prediction interval (from knowledge: standard RSM practice).
- Before the surface, when far from the best: the path of steepest ascent from
  the factorial's first-order model — belongs to FC-111.
- Several responses: each with its own surface; the overlay of their acceptable
  regions, or **desirability** (Derringer & Suich 1980 — from knowledge: each
  response scaled 0–1, larger-is-better d = ((y − L)/(T − L))ˢ between L and T,
  smaller-is-better ((U − y)/(U − T))ˢ, the geometric mean D = (Πdᵢ^rᵢ)^(1/Σrᵢ),
  and D = 0 the moment any response is outside its limits).

### Researched, 25 October 2026 — what was checked against what

| Claim | How it was checked |
|---|---|
| NIST: CCD types and rotatability; BBD structure; the B matrix decides the nature of the stationary point | search excerpts of the e-Handbook pages (not the pages) |
| The rotatable α = (2ᵏ)^(1/4) | the formula appears in a calculator page, not NIST's excerpt; **proved here**: with that α the scaled prediction variance N·x′(M′M)⁻¹x round a circle of radius 1 varies by 3×10⁻¹⁵ (k = 2) and 3×10⁻¹⁵ (k = 3); with α = 1 by 2.4 and 5.5; with α 20% too big by 0.42 and 0.41. BBD k = 3 (3 centre runs): 1.24 — not exactly rotatable |
| Run counts: CCD 2ᵏ + 2k + centre; BBD 4·C(k, 2) + centre = 12, 24, 40 | constructed and counted |
| The fit, the statistics, the stationary point | a **noise-free known surface** (b₀ 80, b = (3, 2), b₁₁ −4, b₂₂ −3, b₁₂ 1.5) recovered exactly from a 13-run CCD; x* = (0.4590, 0.4481), a maximum, y* = 81.137 by linear algebra and by scipy.optimize; QR solution = normal equations |
| The standard errors, intervals and lack-of-fit test | **6,000 repeated experiments** on the same design: the 95% interval for a mean covered the truth 0.948 of the time; the 5% lack-of-fit test fired on a true quadratic 0.052 of the time |
| A stationary point outside the region | a case with x* at radius 3.04 (region 1.41): the best inside is on the boundary at radius 1.414 |
| Desirability | hand cases: d = 0.5 and 0.5 give D = 0.5; a response outside its limits gives D = 0 |

### Worked cases

**Two factors, a 13-run rotatable CCD** (synthetic data: a known surface
plus noise, seed 112, then frozen — it demonstrates the arithmetic, it is not a
finding about a filler). Filler speed 45–75 a minute (x₁ = (speed − 60)/15) and
product temperature 15–25 °C (x₂ = (temp − 20)/5); response, give-away in
grams; 8 runs at the corners and axial points and 5 at the centre.

| x₁ | x₂ | give-away g | | x₁ | x₂ | give-away g |
|---|---|---|---|---|---|---|
| −1 | −1 | 1.483 | | 0 | −1.414 | 1.493 |
| −1 | +1 | 1.277 | | 0 | +1.414 | 1.267 |
| +1 | −1 | 1.561 | | 0 | 0 | 1.084, 1.209, 1.115, 1.049, 1.080 |
| +1 | +1 | 1.521 | | −1.414 | 0 | 1.380 |
| | | | | +1.414 | 0 | 1.764 |

Fit: b₀ 1.1074, b₁ +0.1081, b₂ −0.0707, b₁₁ +0.2284, b₂₂ +0.1324, b₁₂ +0.0415
(se 0.0253, 0.0200, 0.0200, 0.0214, 0.0214, 0.0283; the interaction p = 0.19,
the rest p < 0.01). s = 0.0565 g on 7 df; R² 0.963, adjusted 0.936, **predicted
0.875**; whole-model F = 36.2 (p 7×10⁻⁵). Lack of fit: SS 0.0073 on 3 df against
pure error 0.0151 on 4 df: F = 0.64, p = 0.63 — no sign the quadratic is wrong.
Stationary point, coded (−0.265, +0.308), i.e. **56.0 a minute and 21.5 °C**,
predicted give-away **1.082 g** (95% interval for the mean ±0.058; a single
run ±0.146); eigenvalues 0.128 and 0.233, both positive — a minimum; 0.41 from
the centre against 1.41 run — inside the region. Where the prediction stays
within 0.10 g of the best, inside the region run: about 46–66 a minute and
17–26 °C (the contour's shape decides which pairs, not the box).

**Outside the region.** A surface whose minimum sits at coded (2.95, 0.71) —
radius 3.04 against the 1.41 run: the tool must not print 2.95; the best point
it may state is on the edge of what was run (coded (1.38, 0.31)), with "the
best setting is beyond what you tried; move the box and run again".

**One factor** (the earlier case, rechecked): give-away at filler speeds 40,
50, 60, 70, 80, 90 a minute — 1.9, 1.3, 1.0, 1.1, 1.6, 2.4; ŷ = 0.00182x² −
0.2268x + 8.064; x* = 62.3 a minute, 1.00 g there. Six points and three terms:
three df and no pure error — fine as an illustration, not as a design.

## Assumptions, limits and misuse
- A quadratic is a local model; outside the design's region it is a
  parabola with no physics behind it — never extrapolate to a setting not
  run.
- A saddle reported as "the optimum" is the classic misuse; the eigenvalues
  are read.
- A best point at an edge of the design means the design was in the wrong
  place; move and rerun.
- **Replication must be real.** Five readings from one set-up are not five
  centre runs; the pure error then reads small and the lack-of-fit test cries
  wolf. Reset the machine between runs, centre runs included.
- **Randomise, or say not.** If a factor cannot be changed freely (an oven that
  takes an hour to move), the runs cannot be fully randomised; then a drift in
  the raw material or the day is mixed with the factor, and the tool says
  *not randomised* on screen and paper. Split-plot analysis is not offered.
- Noise: without centre points there is no pure error and no lack-of-fit test;
  the surface may be fitting noise.
- Several responses optimised one at a time give several different
  answers; the overlay or desirability is the honest one.
- Mixture factors (proportions that must sum to one) need mixture designs, not
  this one; blocked designs and more than four factors are not offered.
- R² alone is no test: 0.96 here comes with a predicted R² of 0.87; a model
  with R² 0.9 and predicted R² 0.2 is fitting its own noise.
- Residuals are looked at (against the fit and in run order) before the point
  is trusted.

## Reading the result
"Give-away is lowest at about 56 a minute and 21.5 °C (1.08 g a pack, ±0.06 g
for the average pack); anywhere between 46 and 66 a minute stays within 0.1 g.
That is inside the settings you ran. At 75 a minute and 15 °C it is about
1.6 g — 0.5 g a pack worse, £X a shift." Then the setting into the line's
standard with its window (`quality.control-plan`) and the money
(`knowledge/MONEY.md`, M for give-away; T if the best setting is slower than the
rate wanted — the two said side by side, never netted). And the instruction:
**run a confirmation at the chosen setting and compare with the interval.**

## When not to use it — and instead
Which factors matter is not yet known → `stats.doe-factorial`. One factor
in running data → `stats.correlation-regression` with a quadratic term,
and the caveat that nothing was varied on purpose. A line that cannot be reset
between runs, or whose raw material drifts over the day → do not run it; fix
the drift first (`spc.control-charts-variables`).

## In food and FMCG manufacturing
Filler speed and product temperature for give-away; seal temperature and
dwell for strength with speed as a constraint; oven temperature and belt
speed for colour and moisture together; mixer speed and time for texture.
The classic trade: the fastest speed at which quality still holds. Runs cost
product: a 13-run, two-factor design at, say, 200 packs a run is 2,600 packs
weighed — the money of the experiment is said before it starts.

## References
- [textbook] Myers, R.H., Montgomery, D.C. and Anderson-Cook, C.M., *Response Surface Methodology*, 4th ed., Wiley, 2016 — the second-order model, CCD, stationary points, desirability (from knowledge; edition to confirm).
- [textbook] Box, G.E.P. and Draper, N.R., *Response Surfaces, Mixtures, and Ridge Analyses*, 2nd ed., Wiley, 2007 (from knowledge).
- [guidance] NIST/SEMATECH *e-Handbook of Statistical Methods*, the chapter on process improvement — central composite designs (CCC, CCI, CCF), Box-Behnken designs, and the appendix "Canonical analysis of quadratic responses" — confirmed from search-tool excerpts, 25 Oct 2026; the pages themselves not fetched and not read in full (itl.nist.gov is refused by this container).
- [paper] Box, G.E.P. and Wilson, K.B. (1951), "On the experimental attainment of optimum conditions", *Journal of the Royal Statistical Society B* 13, 1–45 (from knowledge; to confirm) — the central composite and steepest ascent.
- [paper] Box, G.E.P. and Hunter, J.S. (1957), "Multi-factor experimental designs for exploring response surfaces", *Annals of Mathematical Statistics* 28, 195–241 (from knowledge; to confirm) — rotatability and α = (number of factorial points)^(1/4).
- [paper] Box, G.E.P. and Behnken, D.W. (1960), "Some new three level designs for the study of quantitative variables", *Technometrics* 2(4), 455–475 (from knowledge; to confirm).
- [paper] Derringer, G. and Suich, R. (1980), "Simultaneous optimization of several response variables", *Journal of Quality Technology* 12(4), 214–219 — desirability (from knowledge; to confirm).

## In Faultline
**Verdict, 25 October 2026: CAN BE BUILT — for two or three factors, one
response at a time, one block, a central composite (rotatable or face-centred)
or, for three, a Box-Behnken.** The arithmetic is public and every part has an
independent case; the catalogue's dependency on the factorial tool is a *workflow* order
(find the factors first) and a shared part (the factorial's run sheet and
regression), not a computational one — the two tools should share one design,
run-sheet and least-squares module. Desirability for several responses can be
a second slice; its hand cases are in the script.

**Minimal honest build.**
- Inputs: 2 or 3 factors, each with a name, unit, low, high (the centre is the
  midpoint); the design (CCD rotatable · CCD face-centred · BBD); centre runs
  (default 5; refuse fewer than 3); the response's name, unit and direction;
  the run sheet *generated, in random order, with natural-unit settings* and a
  space for the response of each run; optional cost of a run.
- Outputs: the model's coefficients with standard errors and p; R², adjusted,
  **predicted** R²; the lack-of-fit test (or "no centre replicates: cannot be
  tested"); the stationary point in natural units with its nature and distance
  from the centre against the region; the interval for the mean and for a single
  run; the contour (k = 2) or slices (k = 3) with the region run drawn on it
  and the operator's window; residuals against the fit and in run order; a
  **confirmation run** box that compares a typed result with the prediction
  interval.
- Verdict wording ideas: "Best predicted: 56 a minute and 21.5 °C, 1.08 g
  (±0.06). Inside what you ran; 46–66 a minute stays within 0.1 g." / "The
  best point is outside what you ran (it is at 2.9 steps from the centre;
  you ran to 1.4). The best you can state is on the edge (for example 75 a minute,
  20 °C). Move the box and run again." / "Saddle: no single best setting; the surface
  rises both ways. Walk the ridge." / "The quadratic does not fit
  (lack-of-fit p = 0.01): do not use the point." / "No pure error: the centre
  runs are one set-up measured five times."
- Not offered: blocking, split-plot, mixture designs, more than four factors,
  custom (D-optimal) designs, extrapolation beyond the region, a verdict
  without the confirmation run, multi-response desirability in the first slice.

**Independent cases** (`knowledge/research/cases-research-2-rsm.py`): the
design counts and rotatability proof; the exact recovery of a known surface and
its stationary point by two methods; the 13-run example's every statistic
(including PRESS, lack of fit and the whole-model F by a nested comparison);
the 6,000-repeat coverage of the interval (0.948) and the lack-of-fit
false-alarm rate (0.052); the outside-region case; desirability's hand cases;
the one-factor case. A built tool's unit tests port these; the example's
numbers are the build's regression values. No statsmodels or pyDOE was
available in this container, so the second implementations are NumPy's QR,
SciPy's optimiser and the simulation, not a package.

**Must not claim.** That the optimum is the true optimum outside the box; that
a factor *causes* the response beyond the region and the day it was run; that
an operator window holds on another batch of material; that the model is right
when predicted R² is poor or lack of fit is significant; that unreplicated
runs have a pure error; that the result holds for a line that drifted during
the experiment.

**Open (`knowledge/GAPS.md`):** the e-Handbook's full pages and Myers et al.
(editions); the number of centre runs to require
(3–6 from knowledge); whether a hard-to-change factor should be refused or
only warned; the sample (packs weighed) a run's single response should rest on.
