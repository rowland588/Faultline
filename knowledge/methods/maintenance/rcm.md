---
id: maintenance.rcm
name: Reliability-centred maintenance — the right task for each failure mode
aka: [RCM, RCM II, failure-mode maintenance, P-F interval, condition-based maintenance decision, SAE JA1011, run to failure decision]
discipline: maintenance
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the seven questions and the decision logic as SAE JA1011 (2009) sets the criteria and Moubray's *RCM II* (2nd ed. 1997) teaches them (from knowledge; texts not read); the P–F interval rule (inspect at half the P–F) as Moubray gives it; no numeric worked case — the method is a decision logic; its sums are those of `maintenance.weibull` and `maintenance.mtbf-failure-rate`
needs: [maintenance.criticality]
next: [maintenance.planned-maintenance]
alternatives: [quality.fmea]
related: [maintenance.weibull, quality.fmea, maintenance.autonomous-maintenance]
---
# Reliability-centred maintenance — the right task for each failure mode

## Purpose and principle
Not every failure deserves the same answer. RCM takes each failure mode
of a critical asset and asks what the failure does, how it shows itself,
and what task — if any — is worth doing: a condition check if there is
a warning sign with time to act, a scheduled replacement if the part
wears out with age, a scheduled test if the failure is hidden, or
nothing at all (run to failure) if none of those is technically possible
or worth the cost. It replaces "service everything every month" with
tasks that each have a reason, and it is the method behind the plan
`maintenance.planned-maintenance` runs.

## Questions it answers
The seven questions of SAE JA1011: what are the asset's functions and
performance standards; in what ways can it fail to fulfil them (functional
failures); what causes each (failure modes); what happens when each
occurs (effects); in what way does each matter (consequences: hidden,
safety/environmental, operational, non-operational); what should be
done to predict or prevent each (proactive tasks and their intervals);
what if no suitable proactive task can be found (default actions).

## Inputs and minimum conditions
- The asset's functions written with their performance standards
  ("seal 200 packs a minute with no leaker").
- A failure-mode list per function, from the FMEA (`quality.fmea`), the
  failure history (the register, the reliability study) and the
  operators' knowledge; the criticality to choose which assets
  (`maintenance.criticality`).
- For each mode: the failure pattern where known (random or wear-out —
  `maintenance.weibull`), whether a warning sign exists and how long
  before failure it appears (the P–F interval), the consequence and its
  cost.
- A cross-functional group: operator, fitter, engineer, the person who
  will own the schedule.

## Procedure and calculation
The decision logic per failure mode, in order:
1. **Consequence**: hidden (no one would know — a protective device) ·
   safety or environmental · operational (the line stops or runs worse)
   · non-operational (only the repair cost).
2. **On-condition task** (condition-based): is there a potential-failure
   warning (vibration, temperature, wear, leak, a drift on a chart) with
   a P–F interval long enough to act? If so, inspect at an interval no
   longer than half the P–F interval (so at least one check falls inside
   the warning), and the task is worth doing if its cost over the
   interval is less than the failure's consequence it averts.
3. **Scheduled restoration or discard** (age-based): does the mode show
   wear-out (β > 1) with an age at which the conditional failure rate
   rises, and does most of the population survive to it? If so, restore
   or replace at that age (the Weibull age-replacement interval,
   `maintenance.weibull`).
4. **Failure-finding task** (hidden failures only): test the protective
   device at an interval set by the availability wanted — for a device
   with failure rate λ_d tested every T_f, unavailability ≈ λ_d·T_f/2;
   choose T_f so that the protected system's risk (demand rate ×
   unavailability × consequence) is tolerable.
5. **Default**: no task is technically feasible or worth doing →
   run to failure (operational and non-operational consequences only);
   redesign (safety, or where nothing works); or a combination.
- Each decision recorded with its reason, its task, its interval, who
  does it (operator — `maintenance.autonomous-maintenance` — or the
  fitter) and the evidence it rests on; revisited when failures or
  costs change.

**Worked case** (a decision, with the numbers from the sibling records):
the wrapper's seal-jaw heater — functional failure "seal fails";
consequence operational (leakers, a stop). Warning sign: jaw temperature
drops before burn-out, P–F about a shift → an on-condition check of the
temperature display every half shift is feasible and cheap; and the
Weibull says wear-out (β 2.4, best replacement at 470 h) → a scheduled
discard at 470 h on a planned stop. Both tasks, each with its reason.
The checkweigher's reject flap — a hidden failure (a failed flap passes
rejects unnoticed): a failure-finding test with a test pack each shift;
at a flap failure rate of one a year and a shift test, unavailability
≈ (1/8,760 h) × 8 h / 2 ≈ 0.05% — tolerable against the consequence.
The conveyor's gearbox — random failures (β ≈ 1), no cheap warning, a
spare on the shelf and a 20-minute swap: run to failure, with the spare
(`maintenance.spares-poisson`).

## Assumptions, limits and misuse
- RCM on every asset is years of meetings; criticality picks the few.
- A task with no failure mode behind it is a habit; a failure mode with
  no task and no decision is a gap.
- "Inspect monthly" with a P–F of two days finds nothing; the interval
  comes from the P–F, not the calendar.
- Age-based tasks on random-failure modes raise the failure rate (every
  intervention is a chance to get it wrong).
- Hidden failures are the commonest omission in food plants (the reject
  device, the alarm, the interlock); their test is the task that matters
  most.
- The consequence's cost must be counted (the line's lost contribution,
  the complaint) or every task looks too expensive.

## Reading the result
"Jaw heaters: check the temperature twice a shift (warning a shift
ahead) and replace at 470 h on the planned stop (they wear out). Reject
flap: test with a pack every shift (a hidden failure). Gearbox: run to
failure with one on the shelf." Money: each task's cost against the
consequence it averts, per mode (`knowledge/MONEY.md`, T, M, C) — the
schedule is the sum of decisions that each paid.

## When not to use it — and instead
A quality failure's risk ranking → `quality.fmea`. The replacement age →
`maintenance.weibull`. The schedule's running → `maintenance.planned-maintenance`.
Operators' own checks → `maintenance.autonomous-maintenance`.

## In food and FMCG manufacturing
The critical few: the wrapper or flow-wrapper, the filler, the oven or
fryer, the chiller and its compressors, the metal detector and
checkweigher (hidden failures of the reject systems), the CIP set — each
with a dozen failure modes and a schedule that follows from them.

## References
- [standard] SAE JA1011:2009, *Evaluation Criteria for Reliability-Centered Maintenance (RCM) Processes* — the seven questions (from knowledge; text not read).
- [standard] SAE JA1012:2011, *A Guide to the Reliability-Centered Maintenance (RCM) Standard* (from knowledge).
- [textbook] Moubray, J., *Reliability-centred Maintenance (RCM II)*, 2nd ed., Butterworth-Heinemann, 1997 — the decision diagram, the P–F interval, failure-finding intervals (from knowledge).
- [textbook] Nowlan, F.S. and Heap, H.F. (1978), *Reliability-Centered Maintenance*, United Airlines / US DoD — the six failure patterns (from knowledge).

## In Faultline
Research first (FC-065): the decision logic is a guided record per
failure mode on a critical machine (consequence · warning and P–F ·
wear-out · hidden · task · interval · reason), reading the Weibull and
the reliability study, and writing the tasks into the planned schedule
(FC-063). It is specified when FC-063 exists to receive its output.
