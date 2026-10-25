---
id: maintenance.rcm
name: Reliability-centred maintenance — the right task for each failure mode
aka: [RCM, RCM II, failure-mode maintenance, P-F interval, condition-based maintenance decision, SAE JA1011, run to failure decision]
discipline: maintenance
kind: established
evidence: standard
depth: full
checked: 2026-10-25 — researched again (FC-065). Read through web-search excerpts and result summaries only, because this container cannot fetch pages (DNS and the proxy refuse sae.org, nasa.gov and dtic.mil); no standard, guide or book was opened. Confirmed in those excerpts - JA1011's seven questions in order, its four consequence classes, its rule that a process missing any criterion is not RCM, its 1999, 2009 and November 2024 editions, that effects are described as if no task were done, that redesign is required where a safety or environmental failure has no feasible task; the NASA Reliability-Centered Maintenance Guide for Facilities and Collateral Equipment (September 2008) with its Logic Tree and three task kinds; Nowlan and Heap 1978 (DTIC ADA066579). Not read - any of those texts, the NASA tree's branches, JA1011's clause wording. The decision logic below is Nowlan and Heap's and Moubray's as taught (from knowledge, as on 24 October); no numeric worked case beyond the sibling records' sums (`maintenance.weibull`, `maintenance.mtbf-failure-rate`)
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
   (In JA1011's order, confirmed in excerpts on 25 October, a failure-finding
   task belongs to the seventh question, the *default actions*, with
   redesign and run to failure: it is chosen when no proactive task, on-
   condition or scheduled, is found. Moubray and Nowlan and Heap teach the
   same order. The list here is in the order the analyst asks.)
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
- **What a tool built on this must not claim.** That it *is* RCM or "per SAE
  JA1011": the standard sets minimum criteria for a *process* (a team that
  knows the asset, safety and environment treated first, no failure mode
  left without a decision, the analysis reviewed), a form cannot meet them,
  and a process that misses one is not RCM by the standard's own rule. Nor
  that the app *chooses* the task: it puts the questions and keeps the
  answers; the team decides. Nor a failure probability or a P–F interval the
  floor has not given: both are typed or come from a reliability study.
  Nor that a task makes a safety or environmental failure acceptable: the
  standard asks for a task that brings the risk to a level the owner
  tolerates, else redesign, and a tolerable level is the owner's.
- "Inspect at no more than half the P–F" is Moubray's teaching. The NASA
  guide is reported, in an excerpt only, as setting the interval
  conservatively at first, with at least three checks between the first
  sign and the detectable one. Both are conservative readings of one idea;
  the tool says which it used and lets the team type a stricter one.
  Neither was checked against its text.

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
- [standard] SAE JA1011, *Evaluation Criteria for Reliability-Centered Maintenance (RCM) Processes* — editions 1999, 2009 and November 2024 (JA1011_202411), listed at https://webstore.ansi.org/standards/sae/saeja10112024 and https://saemobilus.sae.org/standards/ja1011_200908-evaluation-criteria-reliability-centered-maintenance-rcm-processes ; paid, about 115 EUR with VAT at https://www.dinmedia.de/en/standard/sae-ja-1011/386132170 (12 pages). The seven questions and four consequence classes confirmed in search excerpts, 25 Oct 2026; text not read. This record's wording follows the 2009 edition; what the 2024 revision changed is unknown.
- [standard] SAE JA1012:2011, *A Guide to the Reliability-Centered Maintenance (RCM) Standard* (from knowledge; paid; not read). Free copies of both SAE texts sit on third-party sites; they are not cited or used here, because a copy of a paid standard is not a licence to build on it.
- [practice] NASA (September 2008), *Reliability-Centered Maintenance Guide for Facilities and Collateral Equipment*, https://www.nasa.gov/wp-content/uploads/2023/06/nasa-rcmguide.pdf (also https://www.wbdg.org/nasa/guides-handbooks/rcm-guide) — a U.S. federal agency's own free guide, 472 pages. Its Logic Tree (Figure 3-2; Figure 7-1 of NASA procedural requirement NPR 8831.2, https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_8831_002F_&page_name=Chapter7) ends in reactive, preventive or predictive maintenance; its task kinds are time-directed, condition-directed and failure-finding. Existence, date, length and those two facts confirmed in search excerpts, 25 Oct 2026; the tree's branches NOT read, so read them from the PDF before building. That a U.S. agency work is public domain is the usual rule but was not stated in anything read; confirm on the page before copying any wording (write the tool in Faultline's own words in any case).
- [report] Nowlan, F.S. and Heap, H.F. (1978), *Reliability-Centered Maintenance*, United Airlines for the U.S. Department of Defense, report AD-A066579 (DTIC handle http://handle.dtic.mil/100.2/ADA066579 ; catalogue entry https://www.dau.edu/artifact/reliability-centered-maintenance-fs-nowlan-and-howard-f-heap-dtd-dec-1978 ) — the original decision diagram, four task types, safety · operational · non-operational · hidden consequences and the default strategy, confirmed in search excerpts; a Department of Defense report, free from DTIC; not read. The six failure patterns are its Exhibit 2.13 as a secondary source cites it (unverified).
- [practice] U.S. Navy, NAVAIR 00-25-403 (2005), *Guidelines for the Naval Aviation Reliability-Centered Maintenance Process* — listed at https://everyspec.com/USN/NAVAIR/NAVAIR_00-25-403_2005_15733/ ; its decision logic not seen.
- [textbook] Moubray, J., *Reliability-centred Maintenance (RCM II)*, 2nd ed., Butterworth-Heinemann, 1997 — the decision diagram, the P–F interval, failure-finding intervals (from knowledge; a copyright book: its diagram and wording are not reproduced, the tool uses the questions as ideas in Faultline's words).

## In Faultline
**Researched 25 October 2026 (FC-065). Verdict: CANNOT YET; an honest build
exists and is described here.** Not now, for three reasons of Faultline's own
and one of the method's: what it depends on is not built (the criticality ranking,
the process FMEA, and a planned-maintenance log for its tasks to land
in); the NASA guide's tree has not been read branch by branch (this
container cannot open it); it is heavy (XL) and `docs/DIRECTION.md` says
deep, not wide; and RCM is a team's process before it is a tool.

**Public, and enough to build a worksheet on:** the seven questions
(confirmed), the consequence classes, the task kinds, the default actions
and the P–F idea, all in the free NASA guide and the free Nowlan and Heap
report; and the failure-finding unavailability (about λ·T/2), which is
ordinary reliability arithmetic, not the standard's. **Paid, and not
needed:** JA1011 and JA1012, Moubray. **What the app can never supply:**
the team, the failure-mode list, the P–F interval; people type them.

**The minimal honest build, when Rowland says go:** a *failure-mode decision
worksheet* on a machine the criticality ranking picked, one row per failure
mode, never called RCM or "per JA1011" on screen or paper ("maintenance
decisions by failure mode, in the order RCM teaches").
- *Inputs, typed or chosen:* the function with its performance standard; the
  functional failure; the failure mode and its effect with no task done;
  "would the operators know on their own?" (no: hidden); the consequence
  class (safety or environment · operational · non-operational · hidden);
  then in order: a warning sign? (its P–F interval, the check interval, and
  the arithmetic saying whether it is within half the P–F); wear-out? (the
  age, linked from the reliability or Weibull study, never a guess); hidden:
  the test interval (λ from the reliability study's MTBF; the unavailability
  λ·T/2); the default (run to failure · redesign · change the procedure);
  who does the task; and the reason, in words, on every row.
- *Outputs:* per row the task, its interval and its reason; the worksheet as
  a table and on paper; rows with no decision (a gap); rows with a safety or
  environmental consequence decided as run to failure (refused: a task or
  redesign is required); tasks with no failure mode behind them; the tasks
  handed to the planned schedule.
- *Verdicts, arithmetic or completeness only:* a check interval longer than
  half the P–F ("will miss the warning"); an age-based task on a mode typed
  random; a hidden mode with no test; the task's yearly cost (typed) against
  failures a year × the consequence, from the one cost model, said as "the
  task costs £X a year against £Y of consequence" with the choice left to
  the team.
- *Must not claim:* that the worksheet is RCM or meets JA1011; that the app
  chose a task; a probability, a P–F or a tolerable risk it was not given;
  that run to failure is acceptable for a safety or environmental
  consequence.
- *Reads and feeds:* the reliability study, the Weibull record, the problems
  register, the criticality ranking and the process FMEA; feeds the planned-maintenance schedule. A
  mode of the maintenance entries, not a tool beside them (CLAUDE.md, rule 3).

When it is asked for: read the NASA guide's Logic Tree and its
task-selection sections from the PDF, bring this record's *Procedure* to
them, then write the specification from `knowledge/specs/TEMPLATE.md`.
