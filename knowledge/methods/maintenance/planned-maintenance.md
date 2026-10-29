---
id: maintenance.planned-maintenance
name: Planned maintenance — the schedule, its compliance, the backlog and the planned share
aka: [PM, preventive maintenance, PM compliance, schedule compliance, maintenance backlog, planned vs reactive, PM optimisation]
discipline: maintenance
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the planned-maintenance pillar as TPM texts give it (Nakajima 1988; Suzuki 1994 — from knowledge) and the maintenance KPIs as EN 15341:2019 lists them (named from knowledge; edition and the indicators' exact definitions to confirm, text not read); the compliance and backlog arithmetic worked in `scripts/knowledge/cases-maintenance.py`
needs: []
next: [maintenance.weibull]
alternatives: [maintenance.autonomous-maintenance]
related: [maintenance.criticality, maintenance.rcm, maintenance.mttr-availability]
---
# Planned maintenance — the schedule, its compliance, the backlog and the planned share

## Purpose and principle
Maintenance done to a plan — inspections, lubrication, replacements at an
age, overhauls — costs a fraction of the same work done after a failure,
because it is done when the line is stopped anyway, with the part on the
shelf and the fitter ready. The programme is a schedule of tasks per
machine with an interval and a window; its health is measured by whether
the tasks are done on time (compliance), how much is owed (backlog), and
what share of all maintenance hours are planned rather than reactive.
Each task's interval has a reason — a Weibull age, a manufacturer's
figure, a legal check — and the reason is written beside it.

## Questions it answers
- Which tasks are due, done, late or missed, by machine?
- How big is the backlog, in jobs and crew-hours, and is it growing?
- What share of maintenance is planned — are we fixing or firefighting?
- Is each task's interval justified, and is it moving the failures?

## Inputs and minimum conditions
- A task list per machine: the task, its interval (hours run, cycles or
  calendar), its window (e.g. ±10% of the interval, or the week), its
  standard hours, its parts, its reason.
- Each completion with its date, who, hours taken, what was found.
- Reactive work orders with their hours (for the planned share) and the
  failures per machine (to judge the tasks).

## Procedure and calculation
- Due date = last done + interval; the window around it; **compliance**
  = tasks done inside their window ÷ tasks due in the period; "done at
  all" ÷ due as the looser figure; both said.
- **Backlog** = tasks past their window and not done, in jobs and in
  standard hours; in crew-days = hours ÷ (crew × hours a day); the trend
  week by week (growing is the warning).
- **Planned share** = planned hours ÷ (planned + reactive hours); a
  common benchmark is 80% planned and above as world-class, 50% and
  below reactive (from knowledge; the site's own history is the better
  comparison).
- The task's worth: failures on the machine before and after the task
  was introduced or its interval changed (`stats.two-sample-tests` on
  the rates; the Laplace trend in `maintenance.mtbf-failure-rate`); a
  task that finds nothing for a year is lengthened, one whose machine
  still fails is shortened or redesigned (`maintenance.rcm`).
- Interval by the evidence: a wear-out part's age (`maintenance.weibull`'s
  replacement interval); an inspection task's interval from the time
  between a detectable warning and the failure (the P–F interval, RCM);
  a manufacturer's figure as the start, not the end.
- Money: a planned task's hours × rate + parts, against the failure it
  prevents (parts + labour + the line's lost contribution, from the
  problems and the loss count — `knowledge/MONEY.md`, T and M); the
  backlog's exposure = the failure cost of the tasks owed, weighted by
  the machine's criticality.

**Worked case** (`cases-maintenance.py`): a month — 48 tasks due; 39 done
in their window, 5 late, 4 not done: compliance 81% (92% done at all);
backlog 4 jobs = 10 h at 2.5 h each, 0.4 days of a 3-fitter crew — small,
but it was 1 job last month. Planned hours 210 against reactive 190: a
52% planned share — half the crew's time is firefighting. The two owed
tasks on the wrapper (an A-critical machine) are the ones to do first.

## Assumptions, limits and misuse
- Compliance measured on "done at all" hides late work; the window is
  the measure.
- A 100% compliant schedule of the wrong tasks is tidy failure; the
  failures per machine judge the schedule, not the ticks.
- Intervals copied from the manual for a machine running three shifts in
  flour dust are wrong; hours run and condition set them.
- Backlog in jobs hides a 40-hour overhaul behind four 10-minute checks;
  hours are the measure.
- The planned share rises when reactive work is relabelled; the failure
  count keeps it honest.
- Hygiene and food-safety checks (metal detector, probes) are the
  control plan's and HACCP's, scheduled alongside, not instead.

## Reading the result
"PM compliance 81% this month; backlog 10 crew-hours and growing; half
our maintenance is reactive. The two owed tasks are on the wrapper, our
most critical machine — do them on Friday's stop." Money: the backlog's
exposure in failure cost, and the planned share's trend as the measure
of moving from firefighting (`knowledge/MONEY.md` T, M, L).

## When not to use it — and instead
The operator's daily checks and tags → `maintenance.autonomous-maintenance`.
Deciding what maintenance each failure mode deserves → `maintenance.rcm`.
The replacement age of a wearing part → `maintenance.weibull`. Repair time
and availability → `maintenance.mttr-availability`.

## In food and FMCG manufacturing
The weekly, monthly and annual tasks on fillers, wrappers, ovens,
fryers, conveyors and refrigeration; the hygiene-compatible lubrication
schedule; the legal and insurance inspections (pressure systems, lifting
gear); the shutdown's work list and its backlog.

## References
- [textbook] Nakajima, S., *Introduction to TPM*, Productivity Press, 1988; Suzuki, T. (ed.), *TPM in Process Industries*, Productivity Press, 1994 — the planned-maintenance pillar (from knowledge).
- [standard] EN 15341:2019, *Maintenance — Maintenance key performance indicators* — compliance, backlog and planned-share indicators (named from knowledge; definitions to confirm, text not read).
- [textbook] Wireman, T., *Developing Performance Indicators for Managing Maintenance*, 2nd ed., Industrial Press, 2005 (from knowledge).

## In Faultline
Built (FC-063): check log `planned-maintenance` at `#/log/planned-maintenance` — tasks due, compliance and backlog in crew-hours. FC-067 the indicators board not built yet. The line's
machines and the stage gate's maintenance stages exist (`src/line`,
`src/project`); FC-063 adds the task list per machine with its reasons,
the due/done/late board on the line and the control room, the backlog in
hours and days, the planned share, and each task's worth against the
failures it prevents, in money.
