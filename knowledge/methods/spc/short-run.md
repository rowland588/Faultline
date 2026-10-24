---
id: spc.short-run
name: Short-run charts — deviation from nominal (DNOM) and standardised (Z-MR)
aka: [DNOM chart, nominal chart, Z-MR chart, standardised chart, short production run SPC, target chart]
discipline: spc
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — DNOM and Z-MR as Montgomery ch. 10 and Wheeler's *Short Run SPC* (1991) give them (from knowledge); the pooled XmR, Levene's test on the spreads and the Z-MR figures of the worked case computed independently in `scripts/knowledge/cases-spc.py`
needs: [spc.control-charts-variables]
next: [spc.capability-measured]
alternatives: [spc.control-charts-variables]
related: [planning.runner-repeater-stranger, changeover.first-off-release]
---
# Short-run charts — deviation from nominal (DNOM) and standardised (Z-MR)

## Purpose and principle
A line that runs ten products a day never gets 25 readings of one product
to set limits. Short-run charts put every product on one chart by taking
each reading as its distance from its own nominal (DNOM) or as its
distance in its own standard deviations (Z-MR), so the process — the
machine, the people, the method — is watched continuously across the
changeovers that would otherwise break the chart.

## Questions it answers
- Is the filler steady across the day's products, not only within one?
- Did the changeover move it (the first points of the new product)?
- Is one product's spread different from the others' (a hint about the
  product, not the machine)?

## Inputs and minimum conditions
- Each reading with the product it belongs to and that product's nominal
  (DNOM), and — for Z-MR — that product's σ from past runs.
- DNOM needs the products' spreads to be about alike; check before pooling.
- At least 20 pooled points before the limits are trusted.

## Procedure and calculation
**DNOM** (deviation from nominal): yᵢ = xᵢ − Tₚ, Tₚ the nominal of the
product of reading i. Chart y as individuals: centre ȳ, MR̄ from
|yᵢ − yᵢ₋₁| across all products, limits ȳ ± 2.66·MR̄, MR chart's UCL
3.267·MR̄. A centre away from zero is a bias common to every product.
**Check before pooling**: the products' spreads alike — Levene's test on
the deviations by product (robust, median-centred), or the rule of thumb
that the largest s is under twice the smallest. Unalike → Z-MR.
**Z-MR** (standardised): zᵢ = (xᵢ − Tₚ)/σₚ, limits −3 to +3 on z, centre 0;
the moving range of z with UCL 3.267. σₚ from the product's own history
(at least 20 readings, else the DNOM pooled σ with a note).
**Changeover points**: the first readings after a change are plotted but
the moving range across the boundary is not used (it mixes two products'
settings); a run of points on one side right after a change is the
set-up's bias, worth its own rule.

**Worked case** (`cases-spc.py`): one filler, two products in a morning —
A (nominal 250 g, 12 packs) and B (nominal 500 g, 10 packs). Deviations A:
0.0, 1.5, 1.3, −0.6, −0.3, −0.6, 0.6, −0.1, 0.8, −2.0, 1.7, −0.1; B: 0.9,
−0.2, −0.5, 0.6, 1.1, −0.3, −0.2, 0.9, −1.1, −2.0. Levene W = 0.045,
p = 0.83 — the spreads are alike (s_A 1.06, s_B 0.99), so DNOM may pool.
Pooled: centre 0.06 g, MR̄ 1.18 g, limits −3.08 to +3.21 g; all 22 inside,
no run of eight. Z-MR on B's last reading: z = −2.03 — inside, nearest the
line.

## Assumptions, limits and misuse
- DNOM assumes the spreads are alike; a 1 kg product pooled with a 100 g
  one usually fails that, and its wide moving ranges hide the small
  product's shifts. Test it (Levene) and say the result.
- Z-MR needs each product's σ; a σ guessed from three readings makes z
  meaningless. Fall back to DNOM's pooled σ and say so.
- The nominal must be the *target the line aims at*, which for a legal
  minimum-weight product is the target fill, not the label weight.
- Short runs tempt recalculating limits every day; hold them until 20 new
  points say otherwise.
- Attribute data (reject counts per product) have their own short-run
  forms (standardised p or u); not covered here.

## Reading the result
"Across A and B this morning the filler held 0.06 g above nominal, limits
±3.1 g; nothing out, no run." · "The first four of B sat 1.5–2 g high — the
changeover set it high; the set-up sheet's target, not the machine." Money:
a common bias across every product is give-away on all of them —
Σ products (bias × packs × £/kg) (`knowledge/MONEY.md`, Q).

## When not to use it — and instead
One product for long runs → `spc.control-charts-variables`. A small drift
across the day → `spc.cusum-ewma` on the deviations. Capability per product
→ `spc.capability-measured` on that product's readings alone (never on
pooled deviations: capability is against each product's own limits).

## In food and FMCG manufacturing
A filler or depositor running several pack sizes a shift; a slicer running
several thicknesses; a sauce line running recipes with different Brix
targets; one checkweigher lane across products. The chart follows the
machine through the changeovers and is the first thing to read when a
"this product always runs heavy" is claimed.

## References
- [textbook] Montgomery, D.C., *Introduction to Statistical Quality Control*, 8th ed., 2019, ch. 10 — SPC for short production runs: DNOM and standardised charts (from knowledge; edition to confirm).
- [textbook] Wheeler, D.J. (1991), *Short Run SPC*, SPC Press — difference charts, zed charts and when each applies (from knowledge).
- [textbook] Levene, H. (1960), "Robust tests for equality of variances", in *Contributions to Probability and Statistics*, Stanford — the spread test used (from knowledge); the median-centred form is Brown–Forsythe (1974).

## In Faultline
Not built (FC-093). When built it is a mode of the individuals chart
(FC-086) that reads each reading's product and nominal from the line's
programs (`src/line`, *Products it runs*), runs Levene before pooling and
says the result, and plots a changeover as a marked boundary.
