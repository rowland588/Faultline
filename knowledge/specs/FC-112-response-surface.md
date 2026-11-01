# FC-112 — Optimising settings: the response surface (a run sheet and a fitted surface on the scored shape)

**Catalogue:** FC-112 Optimising settings (reads FC-111 Designed experiments for the factors worth optimising; its answer is the setting a control plan, FC-133, then holds). **Knowledge:** `stats.response-surface` (`knowledge/methods/stats/response-surface.md` — researched 25 October 2026; `knowledge/GAPS.md` "Can be built for two or three factors, one response, one block, CCD or Box–Behnken"). **Programme:** `docs/METHODS.md` §11 (DMAIC Improve). **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the projects."* **Status:** built 1 November 2026 (branch `t8-3`).

## 1. Purpose
A factorial says which settings matter; it does not say their best values, because a straight line has no top. A response surface runs a designed set of points around the middle, fits a curved (quadratic) surface and finds where it is best — and, as importantly, refuses to name a best setting that lies beyond what was run, where the curve is only a formula. The sentence it lets one side say to the other: *"Run at 56 a minute and 21.5 °C: the give-away should be 1.08 g (±0.06), the lowest inside what we tried, and one confirmation run will show whether the surface holds."*

**Scope.** A page on the scored shape (`/scored/rsm`, one per line or project) with the **setup** — two or three factors each with the settings that are −1 and +1, the **design** (central composite face-centred, central composite rotatable, Box–Behnken for three factors), the centre runs, what is wanted (smallest or largest), the response and its unit, and (optional) the packs a run uses and the materials a pack — a **run sheet** made from it in an order shuffled from a stored seed, the response typed on each run, and a **confirmation run**. From the responses it fits ŷ = b₀ + Σbᵢxᵢ + Σbᵢᵢxᵢ² + Σbᵢⱼxᵢxⱼ in coded units and says R², adjusted and predicted R², the whole-model F, the lack of fit against the centre runs' pure error, the stationary point and whether it is a minimum, a maximum or a saddle, the intervals, and the best setting — the stationary point only if it is the kind wanted and inside what was run, otherwise the best inside the region on its edge with *move the box and run again*. Not in scope: several responses and desirability, the contour window the operator may run in, blocks, more than three factors, the path of steepest ascent (the factorial's).

## 2. Users and scenarios
The process engineer with the filler, sealer or cooker, after a factorial has named the two or three settings that matter. (1) Filler speed and product temperature for give-away: 13 runs, the best at 56 a minute and 21.5 °C. (2) Seal temperature and dwell for seal strength, the largest wanted. (3) A best setting that lies outside the box: the tool says so and the engineer moves the box.

## 3. Method selection
`stats.response-surface`: the designs, least squares for the quadratic, the F test for the whole model and for lack of fit, PRESS for predicted R², canonical analysis (the stationary point −½B⁻¹b and the eigenvalues of B), the region of validity, intervals for a mean and a run, a confirmation run.
*Alternatives and when not:* a straight-line question → the factorial (FC-111); one factor → a curve in the Analysis relationships; several responses → desirability (not built).

**Established · assumed · chosen.**
*Established:* the central composite design (2ᵏ corners, 2k axial points at ±α, centre runs; α = 1 face-centred, α = (2ᵏ)^¼ rotatable) and the Box–Behnken design (the middle of each edge, 4·C(k,2) runs, and the centre) — their run counts and the rotatability proved in `knowledge/methods/stats/response-surface.md` and again in `rsm.test.ts` (the prediction variance round a circle varies by 1×10⁻¹⁵ for α = √2 and by more than 0.1 for α = 1); the quadratic fitted by normal equations; the t and F tails from `lib/ie` (validated against SciPy in earlier tools); PRESS predicted R²; the lack-of-fit test against pure error; canonical analysis. The record's frozen 13-run case is recomputed by plain Gauss–Jordan least squares in `scripts/knowledge/cases-t8-3.py` and equals the record's printed figures: b 1.1074, 0.1081, −0.0707, 0.2284, 0.1324, 0.0415; se 0.0253, 0.0200, 0.0200, 0.0214, 0.0214, 0.0283; s 0.0565 on 7 df; R² 0.9628, adjusted 0.9362, predicted 0.8746; F 36.19; lack of fit F 0.642; stationary (−0.2647, 0.3084) = 56.03 a minute and 21.54 °C; ŷ* 1.0822; eigenvalues 0.1281 and 0.2327; the half-widths 0.0585 and 0.1459 at t(0.975, 7) = 2.3646.
*Assumed:* the runs were made in the order given with everything else held; the centre runs are true repeats; the response is measured the same way on every run; the two or three factors are continuous.
*Chosen by Faultline:* the region is the ball out to the furthest run (so a point is inside if its distance from the centre is no more than that of the furthest run); the best inside the region is found by a grid (0.02 coded for two factors, 0.05 for three) with the edge sampled; a ridge is flagged when the smallest eigenvalue is under a tenth of the largest; the tone is red for a significant lack of fit (p < 0.05) or a failed confirmation, green only when the confirmation run is inside the prediction interval, otherwise amber; at most eight centre runs, two or three factors. None put to Rowland.
*Money (`knowledge/MONEY.md` FC-112 "as FC-111"):* the experiment's cost — the runs × packs a run × materials a pack, when given; a missing input is named. The saving from a better setting is in the response's unit and is priced with the capability study's give-away costs, not here; nothing waits on it.

## 4. Inputs
*Agreed before measuring:* the factors (name, unit, low, high), the design, the centre runs, what is wanted, the response (name and unit), the seed (kept). *Measured:* the response of each run, typed as it is made; the confirmation run. Making the run sheet again replaces the runs and their responses (said, with Undo). A client reads and changes nothing (`can.edit`).

## 5. Data suitability
A fit needs more runs with a response than terms (six for two factors, ten for three — one more); every response the same is refused; a design whose runs cannot separate every term is refused in words; lack of fit needs two or more centre runs and is otherwise said not to be testable.

## 6. Calculations
`src/tools/rsm/rsm.ts`: `designPoints`, `runPlan`, `fitSurface` (coefficients, standard errors, R², adjusted, PRESS, F, lack of fit), `stationary` (the point, y*, eigenvalues, nature), `bestInside`, `halfWidths`, `rsmAnalyse`. **Independent cases** (`scripts/knowledge/cases-t8-3.py`, `src/tools/rsm/__tests__/rsm.test.ts`): the record's 13-run case above; the outside-the-region surface (b₀ 1, b₁ −1.18, b₂ −0.213, b₁₁ 0.2, b₂₂ 0.15, noise-free) — minimum at (2.95, 0.71), radius 3.034 against 1.414 run, the best inside on the edge at (1.386, 0.283), never 2.95; run counts 13, 19, 15.

## 7. Outputs
The lean page: the band (*Best 1.08 g* / *Beyond the runs* / *Confirmed* / *Not confirmed* / *Does not fit*), five tiles (Runs · R² · Lack of fit · Best setting or Best inside · Distance), the sentence, the money line, *The runs, in the order to make them*, the design and the run sheet with its boxes, *What this does not say* and the limits, the closing line.

**The report.** The paper (`src/lib/report/scoredPaper.ts`, the report engine): the band and tiles, the sentence, the coefficient table (term in coded units, coefficient, standard error, t, p), the runs in natural units with their responses, the money line, what it does not say and the limits. It reads the same module as the screen.

## 8. Manufacturing usability
A run sheet typed at the machine on a phone: a card a run with its settings in the floor's units and one box for the result; the setup folded once the sheet is made; controls a thumb's size.

## 9. Failure handling
No factors or an unfit setup, no sheet, too few responses, a design that cannot separate the terms, a flat response: each said in words. A minimum outside what was run: not quoted. A saddle: said, with the best on the edge. A significant lack of fit: red, "do not trust". A confirmation outside the prediction interval: red, "do not adopt".

## 10. Integration
Record: `ToolStudy` of tool `scored`, `agreed.scored` `{ key: 'rsm', rows, rsm: RsmSetup }` with a `run` per `ScoredRow` (`{ x, y }`) — inside the existing JSON, **no migration**. Shows: the Scored registers hub, a line's and a project's Tools (app tool *Optimising settings*, `/scored/rsm`), the method pages (DMAIC Improve), the directory. Not yet started from a factorial's result, nor on the line's page or Needs you (limits said).

## 11. Verification
Unit tests `src/tools/rsm/__tests__/rsm.test.ts`; acceptance `scripts/acceptance/rsm.mjs`; `scored-shape.mjs`, `fmea.mjs`, `control-plan.mjs`, `hold.mjs`, `fault-tree.mjs` (unchanged); `catalogue.test.ts`, `registry.test.ts`, `rail.test.ts`, `guides.test.ts`, `methodTools.test.ts`.

**Acceptance criteria.**
1. The record's 13-run case fitted as the record and the second implementation print it (coefficients, standard errors, s, R², adjusted, predicted, F, lack of fit, stationary point, eigenvalues, intervals) — `rsm.test.ts` and `rsm.mjs` step 2.
2. The designs: run counts, the rotatable α, rotatability proved, the plan shuffled from the seed — `rsm.test.ts`.
3. An optimisation made through New optimisation with the real boxes: the factors, the design, the run sheet (13 runs, five at the centre, natural units), too few responses said in words, the surface following — `rsm.mjs` step 3.
4. What is wanted turned the other way: the wrong-kind stationary point is not quoted — `rsm.test.ts` and `rsm.mjs` step 4.
5. A minimum outside the runs is not quoted; the best on the edge; "move the box and run again" — `rsm.test.ts` and `rsm.mjs` step 5.
6. A confirmation inside the prediction interval confirms; outside it does not — `rsm.test.ts` and `rsm.mjs` step 6.
7. The run sheet made again replaces the runs (said), Undo restores them — `rsm.mjs` step 7.
8. The paper, read back (coefficients, runs, money, what it does not say); kept after a reload; the list row; a client changes nothing; the phone — `rsm.mjs` step 8.
*Not yet proved:* the region rule, the ridge cut and the tones have not been put to Rowland; the tool has not been used on a real line's runs; the 3-factor path (ten terms, Box–Behnken) is proved by its run counts and the same fit code, not by a worked case with a published answer; the hat-matrix PRESS is checked against the second implementation on the two-factor case only.

## 12. Maintainability
Code: `src/tools/rsm/rsm.ts` (the design, the fit, the words), `RsmEditor.tsx` (the setup and the run sheet), `src/tools/scored/defs/rsm.ts` (definition and the record's worked example), `RegisterEditor.tsx`, the `register` branch of `scored.ts`, `ScoredScreen.tsx`, `scoredPaper.ts`. Left: the operator's window (the contour), several responses by desirability, blocks, the factorial's result opening this page with its factors, a contour picture.
