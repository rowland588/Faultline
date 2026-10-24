---
id: foodsafety.ccp-monitoring
name: CCP monitoring — the checks done, the readings against the limit, the deviations handled
aka: [CCP checks, critical limit monitoring, cook temperature check, chill check, CCP record, deviation, corrective action]
discipline: foodsafety
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — Codex HACCP principles 4 and 5 (monitoring, corrective action) as CXC 1-1969 rev. 2020 sets them (from knowledge); the readings' margin and the zero-failure bound as `spc.capability-measured` and `spc.zero-failure-demonstration`; the probe's guard band from `msa.bias-linearity-stability`; the worked day in `scripts/knowledge/cases-planning-foodsafety.py`
needs: [foodsafety.haccp, msa.calibration]
next: [spc.capability-measured]
alternatives: []
related: [foodsafety.cooling-curves, quality.control-plan, msa.bias-linearity-stability, quality.nonconformance-hold]
---
# CCP monitoring — the checks done, the readings against the limit, the deviations handled

## Purpose and principle
A critical control point is only a control if its checks are done when
the plan says, read against the critical limit with a gauge known to
read true, and acted on when a reading fails — the product since the
last good check held, the cause found, the record kept. Monitoring is
the record of that. Read as numbers rather than ticks, the readings
also say how much margin the process has above its limit (a one-sided
capability) and whether the margin is shrinking — the warning before the
first deviation.

## Questions it answers
- Were today's CCP checks done — all of them, on time, by whom?
- How far above the limit do the readings sit, and is the margin
  shrinking?
- Did any reading fail, and was the deviation handled: product held,
  cause found, record signed?
- Is the probe reading true at the limit (the guard band)?

## Inputs and minimum conditions
- The CCP's critical limit, monitoring frequency and corrective action
  from the HACCP plan (`foodsafety.haccp`).
- Each check as a reading (the temperature, the time, the result of the
  test piece) with its time and who; never only pass/fail.
- The gauge's calibration and its bias at the limit
  (`msa.calibration`, `msa.bias-linearity-stability`).
- The line rate, for the product at risk on a deviation.

## Procedure and calculation
- Compliance = checks done ÷ checks due in the period; the missed ones
  named (a missed CCP check is itself a deviation in most plans).
- Readings against the limit: the margin at the lowest (or highest)
  reading; the one-sided Ppk = (mean − limit)/3s for an "at least"
  limit (`spc.capability-measured`); the readings in order on a chart
  (a drift toward the limit is the warning).
- The probe's bias at the limit (from its linearity study) applied as a
  guard band: a probe reading +0.14 °C high at 75 °C means the check
  reads 75.2 to be sure of 75 (`msa.measurement-uncertainty`).
- A deviation: the reading below the limit; the product since the last
  good check held (minutes × rate, `msa.calibration`'s rule); the
  corrective action as the plan says (re-cook, destroy, re-test); the
  cause (`rca.fishbone-5whys`); the record signed by the authority.
- Zero deviations in n checks shows at most 3/n of checks could fail
  at 95% (`spc.zero-failure-demonstration`) — what a month's clean
  record proves, and does not.
- Verification: the records reviewed weekly (the frequency, the margin,
  the deviations); the gauge's checks; the annual re-validation.

**Worked case** (`cases-planning-foodsafety.py`): a cook CCP, core
temperature at least 75 °C, 40 checks a day. Readings mean 78.0 °C,
s 1.28, lowest 75.7; one-sided Ppl 0.78 — a thin margin: the lowest
reading is 0.7 °C above the limit, and with the probe's +0.14 °C bias
the true margin is 0.56. 38 of 40 checks done (95%) — two missed, each a
deviation to record. No reading under 75 in 38: at most 7.6% of checks
could be under, at 95% — a month's clean record (≈ 1,200 checks) would
say under 0.25%. The margin, not the compliance, is the number to act
on: the cook's set-point or the dwell.

## Assumptions, limits and misuse
- Ticks instead of readings throw away the margin — the one thing that
  warns before a deviation.
- A clean record of 40 checks is not proof of safety; the zero-failure
  bound says what it proves.
- The probe's bias at the limit matters more than anywhere else; a
  probe checked at 0 °C and used at 75 °C is not checked at 75.
- Monitoring frequency is the plan's and is a validated choice; a line
  that speeds up without re-validating the frequency has more product
  between checks.
- A deviation handled by re-checking until it passes is the misuse the
  corrective-action rule exists to stop; the first reading stands.

## Reading the result
"Cook CCP today: 38 of 40 checks done (two missed at 11:00 and 15:00 —
recorded as deviations); readings 75.7–81.2 °C, the lowest only 0.7 °C
above the limit (0.56 after the probe's bias): the margin is thin —
raise the set-point or lengthen the dwell before the first failure."
Money: a deviation's product at risk held (`knowledge/MONEY.md`, H), the
re-cook or destruction (Q), and the consequence avoided (C).

## When not to use it — and instead
Deciding the CCPs and limits → `foodsafety.haccp`. The quality checks
that are not CCPs → `quality.control-plan`. The cooling CCP's time to
temperature → `foodsafety.cooling-curves`. The detector's test pieces →
`foodsafety.metal-detection-verification`. The hold →
`quality.nonconformance-hold`.

## In food and FMCG manufacturing
Cook core temperatures, chill times and temperatures, pasteurisation,
pH and aw where they are CCPs, metal detection and X-ray test pieces,
the fryer's oil quality — every line's CCP sheet, as readings.

## References
- [standard] Codex Alimentarius, CXC 1-1969 rev. 2020, HACCP annex — principles 4 (monitoring) and 5 (corrective actions) (from knowledge).
- [standard] ISO 22000:2018, clauses 8.5.4 (hazard control plan), 8.9 (control of nonconformities) (from knowledge).
- [guide] Campden BRI, *HACCP: A Practical Guide*, 5th ed., 2015 (from knowledge).

## In Faultline
Not built (FC-169): a capability study against an "at least" limit
already holds readings and says the margin (`src/tools/capability`).
FC-169 adds the CCP's schedule (due, done, missed), each reading with
its time and who, the probe's guard band from its record, a deviation
opening the product-at-risk hold and the corrective action, and the
margin's chart on the line's page.
