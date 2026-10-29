---
id: msa.calibration
name: The calibration programme — what is due, what failed, what product it touched
aka: [calibration register, calibration due, verification schedule, out-of-tolerance review, product impact assessment]
discipline: msa
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the programme's elements as ISO 9001:2015 clause 7.1.5 and ISO 10012:2003 require them and as food-safety standards (BRCGS Food Issue 9 clause 6.4, from knowledge — not confirmed against the text) expect them; the interval rule and the product-at-risk arithmetic worked in `scripts/knowledge/cases-msa.py`
needs: []
next: [msa.bias-linearity-stability]
alternatives: []
related: [foodsafety.ccp-monitoring, quality.nonconformance-hold, msa.type1-gauge]
---
# The calibration programme — what is due, what failed, what product it touched

## Purpose and principle
Every gauge that decides something — a CCP probe, a checkweigher, a bench
scale, a metal detector's test pieces — is checked against a reference on
a schedule, and the record says when, by whom, against what, and the
result. The programme has two halves: keeping the checks done (due and
overdue, visible), and acting when one fails — because a gauge found out
of tolerance has been wrong since the last good check, and every pack it
judged in between is suspect until shown otherwise.

## Questions it answers
- Which gauges are due, overdue, or failed their last check?
- When a check fails: what product did the gauge judge since the last
  good check, and what is to be done with it?
- Is the interval right — is the gauge drifting faster than the checks?

## Inputs and minimum conditions
- A register: each gauge, its identity, location, what it judges (the
  characteristic and its limit), the reference and method of check, the
  tolerance for the check (the allowed error), the interval, the last
  check's date and result, the next due.
- The check's result as a number (the reading on the reference), never
  only "pass".
- The reference's traceability and its own certificate's date.

## Procedure and calculation
- Due = last check + interval; overdue when today > due; the register
  sorted overdue first, then due within a week.
- A check: the reading on the reference against the allowed error
  (|reading − reference| ≤ allowed); passed → next due set; failed → the
  gauge tagged out, the review below, the gauge adjusted or replaced, a
  re-check.
- **Product at risk** on a failed check: everything the gauge judged
  between the last good check and the failure — the window = failure
  date − last good date; the packs = the line's output over the window
  (from the counts, or rate × hours); the review decides by the size of
  the error against the product's limit: an error inside the product's
  margin → released with the record; outside → held and re-checked or
  reworked, with a customer notification where it is a food-safety limit
  (`quality.nonconformance-hold`).
- **Interval by drift**: from the stability chart (`msa.bias-linearity-stability`)
  the drift rate d per day; the time to reach the allowed error e is e/d;
  the interval is set at a fraction (a half) of that, and lengthened only
  after several in-tolerance checks in a row, shortened on any failure.
- Daily user verification (a check weight on the scale, an ice-point on
  the probe) between calibrations, recorded as a reading; it is the
  stability chart's point.

**Worked case** (`cases-msa.py`): a bench scale checked weekly; the check
on day 7 fails (0.4 g out against 0.3 g allowed). Product at risk: 7 days
— at 50,000 packs a week, 50,000 packs judged with a scale reading 0.4 g
off, reviewed against the product's margin. The stability chart shows the
scale drifting 0.02 g a day: 0.3 g of allowed error is reached in 15 days;
the weekly check is right (half the time to drift out) — and the failure
means the drift has changed; the scale is serviced.

## Assumptions, limits and misuse
- "Pass" without the reading throws away the drift information; record
  the number.
- An interval set by habit (annual) with no stability data is a guess; a
  failed annual check puts a year's product in question.
- References not traceable (an uncertified weight) make the whole chain
  meaningless.
- A gauge used outside its range or at a different point from where it
  is checked (checked at 0 °C, used at 75 °C) is not covered by the check
  (`msa.bias-linearity-stability`).
- The product-at-risk review is the costly part and the point of the
  programme; a programme that only ticks dates has missed it.

## Reading the result
"3 gauges overdue; the Line 2 bench scale failed yesterday (0.4 g out,
0.3 allowed) — 50,000 packs since the last good check on 10 Oct, reviewed:
the error is inside the product's 2 g margin, released with the record."
Money: the review's labour and any held or reworked product
(`knowledge/MONEY.md`, L and H), and — the other way — what a CCP probe
out of tolerance costs if not caught (C).

## When not to use it — and instead
The gauge's fitness before first use → `msa.type1-gauge`. Its errors
across the range and in time → `msa.bias-linearity-stability`. The check's
uncertainty statement → `msa.measurement-uncertainty`.

## In food and FMCG manufacturing
CCP probes (ice point and a reference bath), checkweighers (test weights at
the limits), bench scales, metal detectors (test pieces per run — a
verification, logged the same way), refractometers, pH meters, oxygen
analysers, timers on cook and chill steps, and the thermometers in the
cold stores.

## References
- [standard] ISO 9001:2015, clause 7.1.5 — monitoring and measuring resources: calibration, identification, action when found unfit (from knowledge).
- [standard] ISO 10012:2003, *Measurement management systems — Requirements for measurement processes and measuring equipment* (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 6.4 — calibration and control of measuring devices, including the product-impact review on an out-of-tolerance device (from knowledge; clause number not confirmed against the text).
- [standard] ISO/IEC 17025:2017 — the laboratory's side of the certificates (from knowledge).

## In Faultline
Built as the **Calibration checks** log on a line (FC-122, `/log/calibration`):
each gauge a check with its interval and acceptable band on the reference;
readings typed; due and overdue in the Logs round; a failure holds packs
since the last good check and raises a problem on the register. Product
release is the site's call. Daily verification does not yet feed the bias
and stability study automatically; the product-on-hold register is not
built yet.
