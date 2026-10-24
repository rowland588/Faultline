---
id: quality.control-plan
name: The control plan — every characteristic, its check, its frequency, its reaction
aka: [control plan, process control plan, inspection plan, quality plan, reaction plan, APQP control plan]
discipline: quality
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the control plan's columns and its link to the FMEA as the AIAG APQP and Control Plan manual (2nd ed. 2008; the 2024 Control Plan reference manual replaces that part) give them (from knowledge; texts not read); a food plant's version is the HACCP plan's monitoring table plus quality checks (`foodsafety.haccp`); the sampling-frequency arithmetic worked by hand in this record
needs: [quality.fmea]
next: [spc.control-charts-variables]
alternatives: []
related: [spc.control-charts-variables, foodsafety.ccp-monitoring, msa.calibration]
---
# The control plan — every characteristic, its check, its frequency, its reaction

## Purpose and principle
One table that says, for each step of the process, which characteristics
matter (from the FMEA's high-priority failure modes and the customer's
specification), how each is checked (the gauge, the method, the sample
size and frequency), who checks it, against what limit, and what is done
when it is out — the reaction plan. It is the written link between the
risk analysis and the floor's checks, and the thing an auditor opens
first after the HACCP plan. A check nobody wrote down is done when
someone remembers.

## Questions it answers
- What is checked on this line, where, how often, by whom, with what?
- Which checks are due now, which were missed, which failed?
- When a check fails, what is the agreed reaction — and was it done?
- Does every high-priority risk have a check, and every check a reason?

## Inputs and minimum conditions
- The process steps in order; the characteristics (product and process)
  per step; the FMEA's priorities (`quality.fmea`) and the specification's
  limits.
- Per characteristic: the gauge (fit — `msa.gauge-rr`), the method, the
  sample size and frequency, the owner, the record, the reaction plan.
- The people who do the checks, in the writing of it.

## Procedure and calculation
- A row per characteristic: step · characteristic · product/process ·
  specification or tolerance · gauge and method · sample n and frequency ·
  who · record · reaction plan (contain, correct, who to tell, what to do
  with product since the last good check).
- Frequency from risk and drift: a check catches a change within about
  one interval; the product at risk on a failed check is the interval's
  output (`msa.calibration` has the same arithmetic) — so the interval is
  chosen so that (interval × rate × cost of a bad pack) is a loss the line
  accepts against the check's labour (n × minutes × rate per interval).
  Example: a seal check every 30 min at 200 packs a minute puts 6,000
  packs at risk between checks; every 15 min halves it for twice the
  checks.
- Sample size per check from what it must detect: a shift of δ with
  power (`stats.sample-size-power`); 5 packs for a weight check is the
  X̄-R subgroup, 1 seal for a destructive check is a point on an XmR.
- Due and done: next due = last done + interval; missed when the next due
  passed with no record; the day's grid of checks is the floor's board.
- Each row's history is a chart (`spc.control-charts-variables`) and its
  failures feed the FMEA's detection rating back.
- Reviewed when the FMEA changes, after a complaint, after a change to the
  process.

**Worked case** (by hand): a wrapper at 200 packs a minute; seal strength
checked by a pull test. Every 30 min: 16 checks a shift × 5 min = 80 min
of a technician (£25/h → £33 a shift), 6,000 packs at risk between checks.
Every 15 min: 32 checks, £67 a shift, 3,000 at risk. If a seal failure
costs £0.40 a pack and a drift happens once a month, the expected loss
between checks is 6,000 × 0.40 / 22 shifts ≈ £109 a shift at 30 min
against £55 at 15 min — the shorter interval pays (£54 saved for £34 more
labour). A number, not a habit.

## Assumptions, limits and misuse
- A plan copied from another line checks another line's risks.
- Checks with no reaction plan are data collection; the reaction is the
  point.
- "Every hour" without a sample size and a gauge named is not a check.
- A control plan that lists 60 characteristics is not done; the FMEA's
  priorities say which 12 matter.
- CCPs belong to the HACCP plan with its own validation and verification
  rules (`foodsafety.ccp-monitoring`); the control plan references them,
  it does not re-specify them.

## Reading the result
"Line 2's plan: 14 checks a shift across 9 characteristics; today 12 done,
1 missed (the 10:00 seal pull), 1 failed (weight at 14:00 — reaction done:
filler re-centred, 2,400 packs re-checked)." Money: the checks' labour a
shift (`knowledge/MONEY.md` L) against the product at risk per interval
(Q) — the plan's own cost–benefit row by row.

## When not to use it — and instead
Food-safety critical limits → `foodsafety.haccp` and `foodsafety.ccp-monitoring`
(the control plan points to them). The risk analysis that decides what
to check → `quality.fmea`. The chart of one characteristic →
`spc.control-charts-variables`.

## In food and FMCG manufacturing
Weight checks, seal pulls, code and label checks, metal-detector test
pieces (a CCP check), temperature checks, Brix, oxygen, visual checks by
the hour — the day's check board on every packing line.

## References
- [manual] AIAG, *Advanced Product Quality Planning and Control Plan (APQP)*, 2nd ed., 2008, and AIAG, *Control Plan Reference Manual*, 1st ed., 2024 — the control plan's columns and its linkage (from knowledge; texts not read).
- [standard] IATF 16949:2016, clause 8.5.1.1 — control plan requirements (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), section 2 (the HACCP plan) and 6.1 (control of operations) — the food equivalent (from knowledge).

## In Faultline
Not built (FC-133). When built: the plan on the line (a row a
characteristic, from the FMEA's priorities where one exists), the day's
checks as a board with due, done, missed and failed, each check a reading
that feeds the characteristic's chart, a failure opening its reaction
plan and the product-at-risk count, and the plan's labour against its
product at risk in money.
