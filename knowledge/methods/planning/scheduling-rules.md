---
id: planning.scheduling-rules
name: Scheduling rules — the line's timeline, dispatching rules and Johnson's two-machine rule
aka: [dispatching rules, SPT, EDD, Johnson's rule, line timeline, job sequencing, flow-shop scheduling, Gantt of runs]
discipline: planning
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Johnson's rule (1954) and the dispatching rules (SPT, EDD, FCFS, critical ratio) as Pinedo's *Scheduling* (5th ed. 2016) gives them (from knowledge); the worked cases in `scripts/knowledge/cases-planning-foodsafety.py`
needs: [capacity.line-capacity]
next: [planning.schedule-adherence]
alternatives: [capacity.dbr-buffer]
related: [changeover.sequencing, capacity.load-vs-demand, capacity.throughput-accounting]
---
# Scheduling rules — the line's timeline, dispatching rules and Johnson's two-machine rule

## Purpose and principle
Once the week's orders fit (`capacity.load-vs-demand`) and the
changeover order is known (`changeover.sequencing`), the schedule lays
each run on the line's timeline — start, end, changeover between — and
says which orders will be late. Simple rules decide the order when the
changeovers do not: shortest processing time first (SPT) minimises the
average time an order waits; earliest due date first (EDD) minimises the
worst lateness; the critical ratio balances the two. Where product goes
through two stages in turn (a process line feeding a packing line),
Johnson's rule gives the order that finishes everything soonest. These
are the planner's hand tools; the constraint's drum (`capacity.dbr-buffer`)
is the system around them.

## Questions it answers
- When does each run start and end, and which orders are late?
- Which order of runs makes the fewest late, or the shortest total wait?
- For a two-stage line, which order finishes the week soonest?
- How much does the changeover order (sequencing) and the rate
  (plannable, not plate) move the timeline?

## Inputs and minimum conditions
- The runs: product, quantity, due date or shift; the line's plannable
  rate per product and the changeover time between each pair
  (`changeover.sequencing`'s matrix, from SMED).
- The hours available per shift and the shift pattern.
- For Johnson's rule: each job's time on stage 1 and stage 2.

## Procedure and calculation
- Hours per run = quantity ÷ rate ÷ 60 (plus the changeover from the
  previous run); the timeline: run i starts when run i−1 ends plus
  changeover; the end against the due; lateness = max(0, end − due).
- Dispatching rules for one line: **SPT** (shortest run first) —
  minimises mean flow time (and so WIP); **EDD** (earliest due first) —
  minimises the maximum lateness; **critical ratio** = time to due ÷
  work remaining, lowest first — balances both; **FCFS** — fair, poor
  on both. The rule chosen per the measure that matters (service: EDD
  or critical ratio).
- **Johnson's rule** (two stages, every job through both in order):
  jobs with t₁ < t₂ go first in increasing t₁; the rest go last in
  decreasing t₂; the makespan (the time the last job leaves stage 2) is
  the minimum.
- With sequence-dependent changeovers the order is a joint problem
  (`changeover.sequencing`): the rule gives a start, the matrix adjusts.
- Lateness in money: a late order's expedite or lost sale
  (`knowledge/MONEY.md`, C); a schedule's idle time at the bottleneck
  (T).
- The schedule as a Gantt on the line's page, and adherence measured
  against it afterwards (`planning.schedule-adherence`).

**Worked case** (`cases-planning-foodsafety.py`): five jobs through a
process stage then a packing stage — hours (M1, M2): A (4, 3), B (2, 6),
C (5, 2), D (1, 4), E (3, 5). Johnson's rule: D, B, E first (t₁ < t₂, by
t₁), then A, C (by t₂ descending) → makespan 21 h against 24 h in the
order given. One machine, four orders (hours, due): P (6, 10), Q (2, 4),
R (4, 12), S (3, 6): SPT runs Q, S, R, P — total lateness 5 h, mean flow
7.8 h; EDD runs Q, S, P, R — lateness 4 h, flow 8.2 h. EDD for service,
SPT for flow — the measure chooses the rule.

## Assumptions, limits and misuse
- A schedule at plate speed is late by the plannable gap on every run
  (`capacity.load-vs-demand`).
- The rules are optimal for one measure on one machine; a real line
  with changeovers, shelf life and a shared packer is a heuristic's
  job — say which rule was used and why.
- Johnson's rule needs every job through both stages in the same
  order and no intermediate constraints; a buffer limit or a shelf-life
  cap between the stages breaks it.
- A schedule that is never looked at after Monday is a drawing;
  adherence closes the loop.
- The constraint's schedule is the one that matters; scheduling a
  non-bottleneck tightly adds nothing (`capacity.dbr-buffer`).

## Reading the result
"The week's five runs in the order D, B, E, A, C finish Friday 14:00
(21 hours) against 17:00 in the order the orders came; with EDD the two
Tesco orders are on time and the hotel pack is a day late." Money: the
late order's expedite or lost sale (`knowledge/MONEY.md`, C); the hours
saved at the bottleneck × its contribution a minute (T).

## When not to use it — and instead
Whether the week fits → `capacity.load-vs-demand`. The changeover order →
`changeover.sequencing`. What to drop when the constraint is full →
`capacity.throughput-accounting`. The buffer-managed system →
`capacity.dbr-buffer`. Whether the schedule was made →
`planning.schedule-adherence`.

## In food and FMCG manufacturing
A process line (cook, mix, slice) feeding a packing line — Johnson's
two stages; one packing line with the week's orders and their due days;
the Friday afternoon re-schedule when a delivery slips.

## References
- [paper] Johnson, S.M. (1954), "Optimal two- and three-stage production schedules with setup times included", *Naval Research Logistics Quarterly* 1(1), 61–68 (from knowledge).
- [textbook] Pinedo, M.L., *Scheduling: Theory, Algorithms, and Systems*, 5th ed., Springer, 2016 — dispatching rules and their optimality (from knowledge).
- [textbook] Stevenson, W.J., *Operations Management*, 14th ed., 2021 — sequencing rules and Johnson's rule (from knowledge).

## In Faultline
Not built (FC-179 the timeline, FC-180 the rules). The load against
demand and the line's programs exist (`src/lib/intelligence/demand.ts`,
`src/line`); FC-179 lays the runs on a timeline with changeovers from
SMED and says the late ones; FC-180 offers the rules by the measure
chosen and Johnson's order for a two-stage line.
