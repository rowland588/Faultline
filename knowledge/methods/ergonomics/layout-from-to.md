---
id: ergonomics.layout-from-to
name: Layout and material flow — the from–to chart
aka: [from to chart, layout, material flow, distance times frequency, load-distance, systematic layout planning, SLP, relationship chart]
discipline: ergonomics
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Muther (1973) *Systematic Layout Planning* for the from–to chart, the relationship chart and the load-distance comparison; Tompkins et al. (2010) *Facilities Planning*; from knowledge, texts not re-read; the worked comparison in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [lean.spaghetti]
alternatives: [lean.spaghetti]
related: [lean.value-stream-mapping, lean.product-family-pq, foodsafety.hygienic-design]
---
# Layout and material flow — the from–to chart

## Purpose and principle
Where should the film store be, the case store, the scale, the
despatch lane? Count the moves between every pair of areas in a period
(the from–to chart — areas down and across, the moves in each cell) and
multiply each by the distance between the areas in the layout; the sum
is the layout's **load-distance**, and the layout that makes it
smallest — with the heaviest flows adjacent — is the better one, by a
number that can be argued. Muther's Systematic Layout Planning adds the
relationship chart (why two areas must be close or apart — flow,
hygiene, noise, supervision) so that a food factory's first rule —
high-risk and low-risk areas never mixed — is applied before the flows
are counted. Where the spaghetti diagram follows one person, the from–to
chart sums every product and material between every place.

## Questions it answers
- Which areas should sit next to each other, and which must be apart?
- What does the present layout cost in metres moved a shift, and what
  would a change save?
- Which flows are heaviest, and are they the shortest?
- Does a proposed layout keep the hygiene zoning?

## Inputs and minimum conditions
- The areas (stores, lines, stations, despatch) and the moves between
  each pair in a period (trips a shift, from the standard, the
  schedule or a count), in a common unit (trips, or pallets).
- The distances between areas in the present layout and in each
  proposed one (centre to centre along the actual route, not a straight
  line).
- The relationship constraints: hygiene zones (high-risk, low-risk,
  ambient), allergen segregation, safety (forklift routes apart from
  people), utilities.

## Procedure and calculation
- From–to chart: Mᵢⱼ = moves from area i to area j per period; the
  heaviest cells named.
- Load-distance for a layout L: LD(L) = Σᵢⱼ Mᵢⱼ × dᵢⱼ(L); compare
  layouts by LD; the saving = LD(A) − LD(B) in metre-moves a period,
  converted to walking or forklift time by the pace, and to money by
  the rate (`knowledge/MONEY.md`, L).
- The relationship chart: each pair rated A (absolutely necessary to be
  close), E, I, O, U (unimportant), X (must be apart) with the reason;
  an X (high-risk next to low-risk) vetoes a layout whatever its LD.
- A proposed layout drawn to scale with the areas' sizes; the heaviest
  flows checked for straightness and no crossing of the people's routes.
- Re-count after the change; the before → after LD is the evidence.

**Worked case** (`cases-projects-people-ergo-sust.py`): three flows into
and out of Line 3 a shift — film store → line 36 trips, case store →
line 24, line → despatch 40. Layout A distances 42, 28 and 60 m:
load-distance 4,584 metre-moves a shift. Layout B puts the film store
beside the line (8 m): 3,360 — 1,224 m saved a shift, 1.2 km, about
15 minutes of walking a shift at 1.3 m/s. Both layouts keep the film
store in the low-risk zone; a layout that put it through the high-risk
door would be vetoed by its X.

## Assumptions, limits and misuse
- Ignoring hygiene zoning: in food it comes first; the relationship
  chart's X rows are applied before any distance is summed.
- Distances in a straight line under-count the route; measure along the
  path people and trucks take.
- Moves from the standard, not counted, may be the plan's and not the
  floor's; count a few shifts.
- A layout optimised for today's products is wrong for next year's mix
  (`lean.product-family-pq`); use the forecast.
- The chart compares layouts; it does not design one — the designer
  does, and the chart scores the designs.

## Reading the result
"Moving the film store beside Line 3 cuts 1.2 km a shift — about 15
minutes of a packer's walking, £6 a shift, £1,500 a year on one line —
and keeps the zoning." Money: the metre-moves × pace × the rate (L), and
where the moves are a forklift's, its hours (L, E).

## When not to use it — and instead
One person's walk drawn and measured → `lean.spaghetti`. The whole
stream with its times → `lean.value-stream-mapping`. The equipment's
cleanability in the layout → `foodsafety.hygienic-design`. Which
products belong together on a line → `lean.product-family-pq`.

## In food and FMCG manufacturing
Packaging stores, intake and despatch placed against the lines; a new
line's position in the hall; the weigh-up room against the mixers —
inside the hygiene zones, always.

## References
- [textbook] Muther, R. (1973), *Systematic Layout Planning*, 2nd ed., Cahners (from knowledge).
- [textbook] Tompkins, J.A., White, J.A., Bozer, Y.A. and Tanchoco, J.M.A. (2010), *Facilities Planning*, 4th ed., Wiley — flow analysis and the from–to chart (from knowledge).
- [guidance] Campden BRI and EHEDG guidance on factory zoning for hygiene (from knowledge).

## In Faultline
Not built (FC-212). The line standard's board draws the line's places
to scale (`src/tools/linestandard`) and the factory holds the lines in
floor order (`src/line`); FC-212 would count the moves between places,
sum the load-distance for the present and a proposed layout, say the
saving in metres, minutes and money, and keep the zoning as a veto.
