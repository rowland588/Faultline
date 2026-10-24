---
id: people.skills-matrix
name: The skills matrix — who can run what, and the cover gaps
aka: [skills matrix, training matrix, flexibility matrix, cover, ILUO, cross-training chart, versatility]
discipline: people
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — TWI and lean practice (the I-L-U-O quarter-circle levels; Liker & Meier 2007 *Toyota Talent* on multi-skilling); from knowledge, texts not re-read; the cover arithmetic in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [people.twi-job-instruction]
alternatives: []
related: [planning.crew-planning, people.one-point-lesson, lean.standard-work, foodsafety.ccp-monitoring]
---
# The skills matrix — who can run what, and the cover gaps

## Purpose and principle
People down the side, the tasks and machines across — and in each cell
how far that person can do that task: **learning** (I, a quarter), **can
do with help** (L, half), **can do alone to the standard** (U, three
quarters), **can teach it** (O, full) — with the date they reached it
and who signed it off. Read by column it says cover: how many people on
each shift can run the wrapper alone; a column with one is a line that
stops when that person is off, and the matrix shows it before the
absence does. Read by row it says a person's versatility and their next
skill. It is the planning input for the crew (`planning.crew-planning`)
and the training plan's source: the gaps, ranked by how often the task
is needed and how hard it is to cover, are the training to do next.

## Questions it answers
- Who can run the wrapper on nights, alone?
- Where is one absence a stopped line (a single point of cover)?
- Which tasks are below the cover target on which shift?
- Who is next to train on what, and who can teach them?

## Inputs and minimum conditions
- The tasks that matter (the machines' set-ups and running, the CCP
  checks, the hygiene cleans, the QA checks) — not every job.
- Each person's level per task with the date and the signer; the shift
  they work.
- The cover target per task per shift (often 3 — one running, one
  cover, one on leave or training) and the task's criticality.

## Procedure and calculation
- Cover per task per shift = people at U or O on that shift; gap = target
  − cover where positive; a single point where cover = 1; none where 0.
- Teachers per task = people at O; a task with cover but no teacher
  cannot grow its cover.
- Versatility per person = tasks at U or above; the crew's flexibility =
  the share of task × shift cells at target.
- Training plan: gaps ranked by criticality (a CCP check, the
  bottleneck's set-up) and by how far below target; each gap an action
  — who trains whom, by when (`people.twi-job-instruction`).
- Refresh: a level not used or re-checked in a year drops a step (the
  rule said); the matrix's dates make it auditable (`foodsafety.audits`
  asks for training records).

**Worked case** (`cases-projects-people-ergo-sust.py`): target cover 3.
Wrapper set-up — days cover 3, nights cover 1 (a single point); labeller
set-up — days 2, nights 1 (a single point); the CCP cook check — days 4,
nights 2. Nights are short on every task; the two single points are the
training plan's first two rows, and the wrapper's one night setter is
the line's biggest people risk.

## Assumptions, limits and misuse
- Levels never refreshed: a U from three years ago is a guess.
- "Can do" signed by the person themselves; the sign-off is the
  teacher's, after a try-out.
- Every job in the matrix drowns the few that matter; the tasks are the
  critical ones.
- A matrix on the wall that embarrasses people empties itself; it is
  read for the gaps, not the people.
- Cover counted across shifts hides the night gap; it is per shift.

## Reading the result
"Only one person on nights can set up the labeller — a single point of
cover; wrapper set-up on nights the same. Two training actions this
month." Money: a single point's cost is the stopped line when they are
off (`knowledge/MONEY.md`, T — the shift's hours × the line's
contribution a minute, by the absence rate); the training's cost is the
hours (L).

## When not to use it — and instead
Teaching to the standard → `people.twi-job-instruction`. A one-page
lesson for one fix → `people.one-point-lesson`. The crew needed per
shift → `planning.crew-planning`. The standard the task is done to →
`lean.standard-work`.

## In food and FMCG manufacturing
Machine operators and setters by shift; hygiene cleans by area; QA and
CCP checks (the auditor asks who is trained); the bakery's one night
mixer.

## References
- [textbook] Liker, J.K. and Meier, D.P. (2007), *Toyota Talent*, McGraw-Hill — multi-skilling and the training plan (from knowledge).
- [practice] Training Within Industry — the job instruction training timetable (the matrix's ancestor) (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 7.1 — training and competence records (from knowledge; clause to confirm).

## In Faultline
Not built (FC-222). The line standard holds who stands where
(`src/tools/linestandard`) and the crew plan the people needed; FC-222
would add the levels per person per task with their dates, the cover
per shift against the target, the single points in red on the line's
page, and the training plan as actions.
