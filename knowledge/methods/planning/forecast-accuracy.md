---
id: planning.forecast-accuracy
name: Forecast accuracy — WMAPE, bias and the tracking signal
aka: [forecast error, MAPE, WMAPE, forecast bias, tracking signal, demand forecast accuracy]
discipline: planning
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the error measures as Hyndman & Athanasopoulos's *Forecasting: Principles and Practice* (3rd ed., online) give them and the tracking signal as the operations texts do (from knowledge); the worked month in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [planning.safety-stock]
alternatives: []
related: [capacity.load-vs-demand, planning.schedule-adherence, stats.time-series-trend]
---
# Forecast accuracy — WMAPE, bias and the tracking signal

## Purpose and principle
The plan is built on a forecast; the line's week, its crew and its
materials follow it. How wrong the forecast usually is sets the safety
stock, the firefighting and the trust between planning and the floor.
Two numbers say it: the size of the error (WMAPE — the absolute errors
summed over the actuals, so big products count for more) and its
direction (bias — is the forecast always high, so the line is planned
for volume that never comes?). The tracking signal watches the bias
over time and says when a forecast has stopped being wrong at random.

## Questions it answers
- How far off is the forecast, product by product and overall?
- Is it biased — consistently over or under — and for which products?
- Has a forecast drifted (the tracking signal beyond its limits)?
- What safety stock does this error justify (`planning.safety-stock`)?

## Inputs and minimum conditions
- Forecast F and actual A per product per period (the week), for the
  same horizon (the forecast made at the lead time ahead, not revised
  the day before); at least 8–12 periods for a bias worth stating.
- The level the forecast is used at (SKU, family, line) — accuracy is
  measured where it is used.

## Procedure and calculation
- Error eₜ = Fₜ − Aₜ (sign kept for bias).
- MAPE per product = mean(|e|/A) — breaks down at small actuals (a
  2 against a 20 forecast is 900%); WMAPE = Σ|e| ÷ ΣA across products or
  periods — the honest aggregate, weighted by volume.
- Bias = Σe ÷ ΣA (as %), positive when the forecast runs high; MAD =
  mean|e| for the tracking signal.
- Tracking signal = cumulative error ÷ MAD; beyond about ±4 (Trigg's
  limits are ±4 to ±6) the forecast is biased, not noisy — re-fit it.
- Accuracy by horizon (one week out, four weeks out) and by product
  class (runners forecast well, strangers do not —
  `planning.runner-repeater-stranger`).
- Money: over-forecast → stock and its carrying (`cost.inventory-carrying-cost`,
  I) and crew planned for volume that did not come (L); under-forecast →
  overtime, expedited changeovers, missed service (T, C). The error's
  cost is the case for improving the forecast or for safety stock.

**Worked case** (`cases-planning-foodsafety.py`): four products over a
month, forecast flat at 62, 50, 30, 20 (thousand packs a week) against
actuals that varied. WMAPE 8.3% overall; bias 0.0% overall — which hides
the parts: Tesco +8.7% over-forecast (MAPE 11.6%), Baby −17.5% under
(MAPE 17.2%, tracking signal −4.0 — biased). The overall figures were
fine; two of the four forecasts were systematically wrong in opposite
directions, and the line planned Tesco runs that were cut and Baby runs
that were short.

## Assumptions, limits and misuse
- An aggregate WMAPE of 8% with two products biased ±15% is the usual
  way a forecast "looks fine"; by product, always.
- MAPE on small numbers explodes; WMAPE or MAD are the measures for
  low-volume products.
- Measuring against the forecast revised yesterday measures nothing;
  the forecast at the planning lead time is the one judged.
- A forecast is not a target: bias toward the sales plan is the common
  cause, and the signal shows it.
- Accuracy without its cost is a planner's statistic; with it, a
  decision about safety stock or crew.

## Reading the result
"Forecast accuracy this month: 8% off overall, but Baby 1 kg has been
under-forecast 17% for four weeks running (tracking signal −4) — the
plan is short on it every week, and Tesco over by 9%." Money: the
under-forecast's overtime and expedites (`knowledge/MONEY.md`, L, T);
the over-forecast's stock (I).

## When not to use it — and instead
Whether the week fits the line → `capacity.load-vs-demand`. Whether the
plan was *made* → `planning.schedule-adherence`. The stock the error
needs → `planning.safety-stock`. The forecast method itself → outside
this library (Hyndman's text).

## In food and FMCG manufacturing
Retailer forecasts against actual orders; promotional uplifts (always
over or under); weather-driven products (salads, ice cream, soup); the
weekly S&OP meeting's first slide.

## References
- [textbook] Hyndman, R.J. and Athanasopoulos, G., *Forecasting: Principles and Practice*, 3rd ed., OTexts, 2021 (online) — error measures (from knowledge; the text is online but not fetchable from here).
- [paper] Trigg, D.W. (1964), "Monitoring a forecasting system", *Operational Research Quarterly* 15(3), 271–274 — the tracking signal (from knowledge).
- [textbook] Stevenson, W.J., *Operations Management*, 14th ed., 2021 — forecast accuracy and control (from knowledge).

## In Faultline
Not built (FC-186). The load against demand holds the week's orders
(`src/lib/intelligence/demand.ts`); FC-186 adds the forecast beside the
actual per product per week, WMAPE and bias by product, the tracking
signal, and the cost of the error in stock and overtime.
