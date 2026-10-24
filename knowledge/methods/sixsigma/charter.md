---
id: sixsigma.charter
name: Project charter — problem, goal, scope, team, worth
aka: [charter, project charter, problem statement, goal statement, business case, SMART goal]
discipline: sixsigma
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the charter as Six Sigma practice and ISO 13053-2:2011 (tools and techniques, the charter among them) frame it; from knowledge, texts not read; the worked charter in `scripts/knowledge/cases-sixsigma-visual.py`; Faultline: a project is started from its line and names its lines and kind; the business case was built and taken off 17 October (`docs/BLUEPRINT.md` §6)
needs: []
next: [sixsigma.dmaic, sixsigma.sipoc]
alternatives: []
related: [cost.investment-appraisal, lean.kaizen-event, visual.kpi-tree]
---
# Project charter — problem, goal, scope, team, worth

## Purpose and principle
One page agreed before the work starts, between the sponsor and the
team, so that everyone can say what the project is for and how it will
be known to be done. Its parts: the **problem statement** (what is
wrong, where, since when, how big — in the number, with no cause and no
solution in it); the **goal statement** (the same number, the value
wanted, the date); the **scope** (which line, products, shifts are in
and which are out); the **team** (the sponsor, the lead, the members,
their time); the **worth** (what closing the gap is worth a year, from
the one cost model); and the **milestones** (the phases' dates). It is
revised, not abandoned, when the measure phase shows the baseline was
wrong. Its test: can the goal be met by accident? If the goal has no
number, yes.

## Questions it answers
- What is this project for — the number, its baseline, its target and
  its date?
- What is in and out of scope?
- Who is on it, and what does it cost them in time?
- What is it worth a year, and does that justify the team's time?

## Inputs and minimum conditions
- The baseline measured, not remembered: enough readings to give the
  mean and its spread (ten shifts, a month's rejects) with a confidence
  interval (`stats.confidence-intervals`).
- The sponsor's goal and date; the constraints (no capital, no new
  people).
- The cost model's figures for the worth (`knowledge/MONEY.md`).

## Procedure and calculation
- Problem statement = the number, where, when, how much, against what
  it should be: "give-away on Line 3 averages 4.1 g a pack (CI 4.0–4.2
  over ten shifts) against a 2 g target, since the new weigher in June."
- Goal = the same number's target and date; the gap = baseline − target.
- Worth a year = gap × units a year × unit value (give-away: grams ×
  packs × £/kg; rejects: packs × materials and labour; time: minutes ×
  the line's contribution a minute) — the model's row for the measure.
- Scope by a SIPOC (`sixsigma.sipoc`); the team's time costed (hours ×
  rate) against the worth — the project's own payback
  (`cost.investment-appraisal` where capital is involved).
- Milestones: the phases' dates (`sixsigma.dmaic`'s tollgates or the
  6M's steps).
- Revision: the baseline re-stated after the measure phase, the goal
  kept or changed with the sponsor's agreement, the change recorded.

**Worked case** (`cases-sixsigma-visual.py`): give-away on Line 3 — ten
shifts' means: 4.10 g, s 0.18, 95% CI 3.97–4.23 g. Target 2.0 g by 31
March. 240,000 packs a week at £3.40 a kilogram of product: (4.1 − 2.0) g
× 240,000 × 52 × £3.40/kg = £89,000 a year. The goal statement: "reduce
mean give-away on Line 3 from 4.1 g to 2.0 g by 31 March, worth £89k a
year" — measurable, dated, costed, with no cause and no solution in it.

## Assumptions, limits and misuse
- Goals without a measure, or with a solution built in ("install a new
  weigher"), are not goals.
- A baseline from memory is usually flattering or dramatic; measure it.
- Scope creep: the charter's scope is the test for every "while we're
  at it".
- Worth computed with an invented rate; the model's rate or the missing
  input named.
- A charter nobody signs binds nobody; the sponsor's name is on it.

## Reading the result
"Cut give-away on Line 3 from 4.1 g to 2 g by March; worth £89k a year;
scope Line 3's four products, all shifts; sponsor the ops manager, lead
the line's team leader." Money: the worth a year by `knowledge/MONEY.md`'s
row for the measure, and the team's time against it.

## When not to use it — and instead
A few days' focused event → `lean.kaizen-event`'s charter (the same
parts, shorter). The investment decision when capital is needed →
`cost.investment-appraisal`. The outcome worked down to its drivers →
`visual.kpi-tree`.

## In food and FMCG manufacturing
Any improvement project: give-away, yield, waste, changeover, start-up
losses — each with its number, baseline, target, date and worth.

## References
- [standard] ISO 13053-2:2011, *Quantitative methods in process improvement — Six Sigma — Part 2: Tools and techniques* — the project charter (from knowledge; not read).
- [textbook] Pyzdek, T. and Keller, P. (2014), *The Six Sigma Handbook*, 4th ed., McGraw-Hill (from knowledge).
- [textbook] George, M.L. et al. (2005), *The Lean Six Sigma Pocket Toolbook*, McGraw-Hill (from knowledge).

## In Faultline
Partly: a project is started from its line and names its lines and
kind (`src/project`); the 6M's problem statement carries the number and
the target (`src/lib/sixm.ts`). The charter's worth was the business
case built and taken off on 17 October (`docs/BLUEPRINT.md` §6); when it
returns it is the gap × the model's rate, said on the project's front
page, never a second cost model.
