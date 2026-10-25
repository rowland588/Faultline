---
id: msa.bias-linearity-stability
name: Does the gauge read true across its range and over time? — bias, linearity, stability
aka: [bias study, linearity study, stability study, gauge drift, accuracy across the range, probe offset]
discipline: msa
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — bias, linearity and stability as the AIAG MSA manual (4th ed. 2010) ch. III defines and tests them (from knowledge; text not read); the worked case (a probe at five references, the line of bias, the XmR on a daily check) computed independently in `scripts/knowledge/cases-msa.py`
needs: []
next: [msa.calibration]
alternatives: [msa.type1-gauge]
related: [msa.gauge-rr, foodsafety.ccp-monitoring, spc.control-charts-variables]
---
# Does the gauge read true across its range and over time? — bias, linearity, stability

## Purpose and principle
A gauge can repeat well and still be wrong: reading 0.15 °C low at every
point (bias), low at the bottom and high at the top (linearity), or
drifting over the weeks between calibrations (stability). Each is a
systematic error that repeatability studies cannot see, and each matters
most where a limit sits — a probe that reads 0.13 °C high at 75 °C passes
product that is at 74.9.

## Questions it answers
- Does the gauge read high or low against a reference — and by how much?
- Does the error change across the range (so one offset will not fix it)?
- Is it drifting between calibrations (so the interval is wrong)?
- At the limit that matters, what is the true value when the gauge reads
  the limit?

## Inputs and minimum conditions
- Bias: one reference near the working value, 10+ readings by the usual
  operator in the usual way.
- Linearity: 5 references spanning the range, 10 readings each.
- Stability: the same reference measured at intervals (daily, each shift)
  over weeks, 20–25 points, charted.
- The references traceable (a calibrated weight, a certified bath, a
  reference strip) with their own uncertainty far smaller than the
  gauge's.

## Procedure and calculation
- **Bias** at a reference: b = x̄ − x_ref; real when |b| / (s/√n) exceeds
  t₀.₉₇₅,ₙ₋₁ (or the interval x̄ ± t·s/√n excludes x_ref); said with its
  sign and in the unit.
- **Linearity**: the biases at the five references regressed on the
  reference value, b = a₀ + a₁·x_ref; linearity is shown when the slope's
  interval excludes zero (p < 0.05); the fitted bias at the limit that
  matters is read from the line; a non-zero intercept with a zero slope is
  a constant bias (one offset fixes it); a non-zero slope needs a two-point
  calibration or a gauge that holds across the range.
- **Stability**: the reference's readings in time on an XmR chart
  (`spc.control-charts-variables`) with limits from the first 20 steady
  points; a point beyond, or a run, is drift — the gauge is taken off,
  and the product measured since the last in-control point reviewed
  (`msa.calibration`).
- The true value at a gauge reading g: g − b(g), using the fitted bias at
  that point; a guard band on a limit L is L + b(L) when the bias is
  positive (`msa.measurement-uncertainty`).

**Worked case** (`cases-msa.py`): a probe thermometer at references 0, 20,
40, 60, 80 °C, 10 readings each. Biases −0.16, −0.04, −0.05, +0.10,
+0.16 °C; the first and the last two are real (t beyond 2.26). Linearity:
bias = −0.151 + 0.0038 × reference (slope p 0.007, 95%: 0.0019–0.0057) —
the probe reads low cold and high hot; one offset will not fix it. At a
75 °C CCP limit the line gives +0.135 °C: a reading of 75.0 means product
at 74.87, under the limit. Stability: the 60 °C reference checked daily,
XmR limits 59.91–60.27 from the first 18 days; days 19–25 all above
(+0.3 °C) — the probe drifted in week 4; product since day 18 reviewed.

## Assumptions, limits and misuse
- A reference with its own error larger than a tenth of the gauge's bias
  makes the bias meaningless; traceability first.
- Ten readings find a bias of about s; a smaller one needs more.
- Linearity from references bunched at one end misses the other; span the
  working range, and include the limit.
- Stability from a few points: wait for 20 before drawing limits; a drift
  seen only at calibration (every 6 months) has already cost 6 months of
  readings.
- The usual operator and the usual way: a bias study by the calibration
  technician measures the technician.
- Bias at a CCP limit is a food-safety matter: the guard band is applied,
  not argued (`foodsafety.ccp-monitoring`).

## Reading the result
"The probe reads 0.14 °C high at 75 °C (and low below 20): set the CCP
check at 75.2 on this probe until it is recalibrated; it also drifted
+0.3 in week 4 — the interval comes down to a fortnight." Money: the
product reviewed after a drift (held packs — `knowledge/MONEY.md`, H) and
the over-processing a high-reading probe causes (energy and yield, E, Y).

## When not to use it — and instead
Repeatability on one reference only → `msa.type1-gauge`. Operators and
pieces → `msa.gauge-rr`. The calibration programme itself →
`msa.calibration`. The uncertainty statement → `msa.measurement-uncertainty`.

## In food and FMCG manufacturing
CCP probe thermometers (bias at the cook or chill limit); bench scales
across pack sizes (linearity 100 g to 2 kg); refractometers at 10 and 60
Brix; pH meters across the buffers; oxygen analysers at 0 and 2%; the
daily check weight on a checkweigher (stability).

## References
- [manual] AIAG, *Measurement Systems Analysis Reference Manual*, 4th ed., 2010, ch. III — bias, linearity and stability studies, their tests and charts (from knowledge; text not read).
- [standard] ISO 10012:2003, *Measurement management systems* — the requirements the programme meets (from knowledge).
- [guide] Campden BRI and the UK Food Standards Agency — probe-thermometer checks at 0 °C (ice point) and 100 °C (boiling point) as common food practice (from knowledge; no single text).

## In Faultline
Built 25 October 2026 (FC-120, builder F3) with the Type 1 study as the other two ways of the Analysis tool's *Is the
gauge fit*: references across the range (bias at each reference with its t test, the line of bias on the reference fitted
to each reference's mean as this record does, the bias and the true value at the limit that matters) and one reference
checked day after day (an individuals chart with limits from the first N checks, the Western Electric signals, the first
check that signals, Kendall's τ and Sen's slope). `knowledge/specs/FC-119-gauge.md`; the probe and the daily check weight
above are unit tests (`gauge.test.ts`) and steps of `analysis-gauge.mjs`. **Not built:** a guard band offered to the CCP
check and the capability study (the page says the true value a reading means; the team applies any guard band), and the
register that would hold a gauge's references and due dates (the calibration register).
