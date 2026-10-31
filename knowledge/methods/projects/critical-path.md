---
id: projects.critical-path
name: Critical path and float in a project plan
aka: [critical path, CPM, float, slack, network diagram, schedule risk, forward pass, backward pass]
discipline: projects
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Kelley & Walker (1959) for CPM; the forward and backward passes and float as every project-management text gives them (PMBOK's schedule network analysis); from knowledge, texts not re-read; the worked network computed in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [commissioning.ramp-up]
alternatives: [commissioning.ramp-up]
related: [commissioning.stage-gate, commissioning.operational-readiness, visual.action-tracking]
---
# Critical path and float in a project plan

## Purpose and principle
A project's tasks with their durations and the order they must follow
(a task cannot start until its predecessors finish) form a network; the
longest path through it from start to end is the **critical path**, and
its length is the earliest the project can finish. Every task on that
path has zero **float**: a day's slip moves the handover a day. Every
other task has float — the days it can slip before it joins the critical
path — and the plan's attention goes to the tasks with none and to those
whose float is nearly spent. The arithmetic is two passes: forward
(earliest start and finish of each task from its predecessors) and
backward (latest start and finish from the end date); float = latest −
earliest. A stage-gate project's machines each have their chain
(deliver → install → test → trials → handover), and the chain that is
longest is the one the site lead chases.

## Questions it answers
- Which tasks move the handover if they slip, and which have room?
- How much float does each machine's chain have?
- If a task is late by d days, does the end move — by how much?
- Where does adding people or overlapping tasks shorten the project
  (only on the critical path)?

## Inputs and minimum conditions
- The tasks with durations (working days) and their predecessors
  (finish-to-start is the usual relation).
- A start date; a calendar (working days, shutdowns).
- Progress as it happens: actual finish dates, remaining durations.

## Procedure and calculation
- Forward pass: ESᵢ = max(EFₚ) over predecessors p (0 for the first);
  EFᵢ = ESᵢ + dᵢ. The project's end = max EF.
- Backward pass: LFᵢ = min(LSₛ) over successors s (the end for the
  last); LSᵢ = LFᵢ − dᵢ.
- Total float = LSᵢ − ESᵢ (= LFᵢ − EFᵢ); critical where float = 0; the
  critical path is the chain of zero-float tasks.
- A slip of d on a task with float f moves the end by max(0, d − f) and
  may make a new path critical.
- Progress: re-run both passes from today with remaining durations; the
  end date moves with them; a task's float consumed is the early warning.
- Crashing (more people, overtime) shortens the end only on the critical
  path, and only until another path becomes critical.

**Worked case** (`cases-projects-people-ergo-sust.py`): a new line with a
filler and a labeller. Filler: deliver 10 days → install 5 → FAT/SAT 6.
Labeller: deliver 14 → install 4 → SAT 8. Then line trials 5 → handover
2. Forward and backward passes: the end is day 33; the critical path is
the labeller's chain (deliver → install → SAT) → trials → handover, all
with zero float; the filler's chain has 5 days' float at each task. A
labeller delivery slipping three days moves the handover three days; the
filler's slipping three days moves nothing.

## Assumptions, limits and misuse
- Dependencies not recorded make every task look free; the network is
  the method.
- Durations treated as fixed; in practice they are estimates, and the
  float of a near-critical path can vanish — paths within a few days of
  critical are watched too.
- Resource limits (one rigging crew for two machines) are not in the
  pure network; they add dependencies.
- A plan not re-run as tasks finish is a picture of the start.
- The end date from the pace of tests already run
  (`commissioning.ramp-up`) is a different forecast; both can be shown,
  and they should agree.

## Reading the result
"The labeller's SAT is on the critical path — a day late is a day late
to handover; the case packer has 6 days' float." Money: a day's slip on
the critical path × the project's cost of delay (the line's contribution
a day not yet earned, the OEM's standing charge — `knowledge/MONEY.md`,
T and C) is what the critical tasks are worth watching for.

## When not to use it — and instead
The forecast from the pace of tests already done →
`commissioning.ramp-up`. The gates and their contents →
`commissioning.stage-gate`. The readiness list before handover →
`commissioning.operational-readiness`. The tasks as actions →
`visual.action-tracking`.

## In food and FMCG manufacturing
New line projects with several machines from several OEMs; a
refurbishment shutdown with hygiene, electrical and mechanical chains;
the handover date defended in the steering meeting.

## References
- [paper] Kelley, J.E. and Walker, M.R. (1959), "Critical-path planning and scheduling", *Proceedings of the Eastern Joint Computer Conference*, 160–173 (from knowledge).
- [standard] Project Management Institute (2021), *PMBOK Guide*, 7th ed. — schedule network analysis (from knowledge).
- [textbook] Lock, D. (2013), *Project Management*, 10th ed., Gower — network analysis (from knowledge).

## In Faultline
Partly built (FC-215, 31 October 2026): the passes, every critical path and
float are `src/lib/ie/criticalPath.ts`, and the calculator *Critical path
and float* (`/calc/critical-path`, `src/tools/calc/defs/critical-path.ts`)
takes a typed network of up to 16 tasks — days and the letters each waits
for — and gives the earliest end, the critical path(s), each task's float,
what one task being late does to the end, the plan as a bar picture, and
a day's delay in money when the person gives its cost. It is not read
from a stage-gate project: the plan holds each machine's stages with their
days (`src/lib/gantt.ts`, `planModel.ts`) but not what a stage waits for,
so wiring it to the plan — which machine's chain is critical, and by how
many days, on the plan and the client report — needs that relation stored
first (a migration, not made). Specification
`knowledge/specs/FC-215-critical-path.md`.
