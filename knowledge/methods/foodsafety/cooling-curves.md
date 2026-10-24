---
id: foodsafety.cooling-curves
name: Cooling curves — the time from cooked to chilled, and the margin against the limit
aka: [cooling time, chill curve, cooling CCP, 60 to 10, blast chill, cooling validation]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — cooling as a CCP with time-to-temperature limits (the site's own validated limits; common guidance values vary by product and authority — e.g. cooling through 60–10 °C within a stated window — from knowledge); the interpolation and the one-sided capability on batch times computed in `scripts/knowledge/cases-planning-foodsafety.py`
needs: [msa.calibration]
next: [spc.capability-measured]
alternatives: []
related: [foodsafety.ccp-monitoring, foodsafety.haccp, msa.bias-linearity-stability]
---
# Cooling curves — the time from cooked to chilled, and the margin against the limit

## Purpose and principle
Cooked product passes through the temperatures where spores germinate
and bacteria grow fastest on its way to chilled; the HACCP plan sets how
long that passage may take (a time from an upper to a lower
temperature) and the cooling is a CCP. The cooling curve is the
product's core temperature against time, read by probe at intervals;
from it the time to each limit is interpolated, and over many batches
the times form a measured set whose one-sided capability against the
limit says how much margin the chiller has — or that the limit is being
met by luck.

## Questions it answers
- Did this batch cool through the critical range within the plan's
  time?
- Over the batches, what is the typical time and its spread — and the
  margin against the limit?
- Is the chiller slowing (load, a door, frost) — the trend?
- Where in the curve is the slow part (the shape)?

## Inputs and minimum conditions
- The plan's cooling limits: the temperatures and the maximum time
  between them (validated for the product).
- Core temperature readings at intervals (every 15 min, or a logger
  read by a person) from the end of cook, with the probe's calibration
  and its bias (`msa.calibration`, `msa.bias-linearity-stability`); the
  probe in the slowest-cooling point (the centre of the largest piece).
- Per batch: the batch, the load, the chiller, the start time.

## Procedure and calculation
- Time to a limit: linear interpolation between the readings either
  side — t = tᵢ₋₁ + (Tᵢ₋₁ − limit)/(Tᵢ₋₁ − Tᵢ) × (tᵢ − tᵢ₋₁); the time
  through the critical range = t(lower) − t(upper).
- Pass when the time is within the plan's limit; a fail is a CCP
  deviation (`foodsafety.ccp-monitoring`'s rule — the batch held, the
  plan's corrective action).
- Over batches: the times' mean, spread and one-sided Ppu =
  (limit − mean)/3s (`spc.capability-measured`); below about 1 the limit
  is being met with little room; the times on a run chart for the trend
  (`stats.time-series-trend`).
- The curve's shape: the slow tail near the lower limit is normal
  (Newton's cooling); a plateau early is a load problem (product
  stacked, air blocked).
- Validation of the chiller: the worst case (fullest load, largest
  piece, warmest start) cooled and timed; the plan's limit shown to be
  met with margin before the chiller is used in production.

**Worked case** (`cases-planning-foodsafety.py`): a product cooled from
62 °C, readings every 15 min: 62, 51, 42, 35, 29, 24, 19, 15, 11, 8, 6,
5, 4. By interpolation 62 → 10 °C in 125 min; 10 → 5 °C another 40 min.
Ten batches' 60→10 times: mean 132 min, s 8.8; against a 240-minute
limit the one-sided Ppu is 4.1 (ample); against a tighter 150-minute
limit 0.68 — three in a hundred batches would miss it: a site with the
tighter limit needs a faster chiller or a smaller load.

## Assumptions, limits and misuse
- The limits are the site's validated ones from its hazard analysis;
  guidance figures differ between products and authorities and are not
  the plan.
- A probe not at the slowest point reads a faster curve than the
  product's; the position is part of the method.
- Interpolating between readings an hour apart can hide a plateau;
  the interval must resolve the curve (15 min is usual).
- The capability on times assumes the batches are alike (load, size);
  stratify by chiller and load.
- Chilled display temperatures (the shelf) are a different control;
  this is the cook-to-chill passage.

## Reading the result
"Batch 24287 cooled from 62 to 10 °C in 125 minutes against a 240-minute
limit — passed. Over ten batches the chiller takes 132 ± 9 minutes: wide
margin against 240, almost none against 150." Money: a failed batch's
hold or destruction (`knowledge/MONEY.md`, H, Q); the chiller's energy
for a faster cycle (E) against the margin it buys.

## When not to use it — and instead
The CCP's definition → `foodsafety.haccp`. The monitoring record in
general → `foodsafety.ccp-monitoring`. The capability arithmetic →
`spc.capability-measured`. The probe's truth → `msa.calibration`,
`msa.bias-linearity-stability`.

## In food and FMCG manufacturing
Cooked meats, ready meals, sauces and soups, rice (a classic), pasta,
cooked vegetables — every cook-chill operation's blast chiller and its
batch sheet.

## References
- [standard] Codex Alimentarius, CXC 1-1969 rev. 2020 — cooling as a control measure in the HACCP system (from knowledge).
- [guide] UK Food Standards Agency, *Safer Food, Better Business* and the FSA's cook-chill guidance; Chilled Food Association guidance — time-to-temperature expectations (from knowledge; values vary, the site's plan decides).
- [textbook] Singh, R.P. and Heldman, D.R., *Introduction to Food Engineering*, 5th ed., 2014 — transient heat transfer (the shape of the curve) (from knowledge).

## In Faultline
Not built (FC-176): a capability study against an "at most" limit can
hold the batch times (`src/tools/capability`). FC-176 adds the readings
by time per batch, the interpolated time to each limit, pass/fail
against the plan, and the batches' capability and trend on the line's
page — the CCP record's cooling half.
