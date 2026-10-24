---
id: visual.kpi-tree
name: The KPI tree — one outcome worked down to what has to be true (the lever tree)
aka: [KPI tree, driver tree, lever tree, value driver tree, issue tree, hypothesis tree, cost tree]
discipline: visual
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — driver-tree practice (DuPont's return tree the ancestor; consultancies' value driver trees; Minto's issue tree) from knowledge, no single text; the arithmetic rule (branches add or multiply to their parent) is the method's own; the worked tree in `scripts/knowledge/cases-sixsigma-visual.py`; Faultline's lever tree, a kind of change (`src/lib/planModel.ts`)
needs: []
next: [visual.action-tracking]
alternatives: [projects.hoshin]
related: [stats.time-series-trend, cost.line-cost-model, sixsigma.charter, visual.performance-measures]
---
# The KPI tree — one outcome worked down to what has to be true (the lever tree)

## Purpose and principle
One number to hit — cost a pack, yield, output a week — broken into
the drivers that make it, each driver into its own, down to **levers** a
team can pull and measure: so the effort goes where the number moves,
and the meeting can say which lever is off track rather than that the
outcome is. The tree's discipline is arithmetic: each node's children
add up or multiply to it (cost a pack = labour + give-away + waste +
energy + film; labour a pack = crew × rate ÷ packs an hour), so the gap
at the top is allocated to the branches exactly and no driver is a
wish. Each lever carries its target, its actual and its trend, and the
actions that move it. It is one of Faultline's three kinds of change —
the lever tree — for the case where the outcome is a number and the
work is finding what has to be true for it.

## Questions it answers
- What has to be true for us to hit the number — in which branches, by
  how much?
- Which lever is off track, and what share of the remaining gap is it?
- Do the branches add up to the outcome (is the tree honest)?
- Which actions move which lever, and are they moving it?

## Inputs and minimum conditions
- The outcome, its baseline and target with a date.
- The drivers' arithmetic (how the children make the parent), with each
  lever measurable from a tool or a record.
- Each lever's baseline, target and current value, with its trend.
- The actions by lever (`visual.action-tracking`).

## Procedure and calculation
- Build: outcome → drivers → levers, each with its formula to the
  parent; check Σ children = parent (additive) or Π = parent
  (multiplicative) on the baseline; a residual means a missing branch.
- Gap allocation: outcome gap = Σ branch gaps (additive); each branch's
  share of the remaining gap = its gap ÷ the total remaining.
- Each lever: target, actual, on track (within a tolerance said) or off;
  the trend (`stats.time-series-trend`) toward its target by its date.
- Sensitivity on a multiplicative branch: a 1% change in a child is a
  1% change in the parent; on an additive one, its share — so the tree
  says which lever moves the outcome most per unit of effort.
- The levers' money is the one cost model's (`cost.line-cost-model`,
  `knowledge/MONEY.md`); a lever that cannot be measured from the tools
  is marked as such, not estimated.

**Worked case** (`cases-sixsigma-visual.py`): cost a pack 31.0p = labour
9.0 + give-away 4.0 + waste 3.0 + energy 2.5 + film 12.5; target 27.5p.
Lever targets: labour 8.0, give-away 2.0, waste 2.5, energy and film
unchanged. Today: labour 8.1 (on track), give-away 3.6 (off track —
1.6p over), waste 2.4 (on track), energy and film on. The remaining gap
is give-away's: the whole of it. The tree says the next effort is the
weigher, not the crew.

## Assumptions, limits and misuse
- Drivers that do not add or multiply to the outcome make a picture,
  not a tree; the arithmetic is checked on the baseline.
- Levers nobody can measure are hopes; each lever names its tool.
- A tree with twenty levers spreads effort over twenty; the three with
  the biggest shares of the gap are the work.
- Targets set at the levers that sum to more than the outcome's target
  (padding) hide the slack; the sums are shown.
- The tree is for a number; a project whose outcome is a state (a line
  commissioned) is a stage gate, and one whose problem has unknown
  causes is a 6M.

## Reading the result
"Cost a pack 31p → 28p: labour 9p → 8.1p (on track), give-away 4p → 3.6p
against 2p (off track — the whole remaining gap)." Money: the tree is
money by construction when the outcome is cost; otherwise each lever's
gap × the model's rate (`knowledge/MONEY.md`) says what the lever is
worth.

## When not to use it — and instead
A site's few breakthrough objectives cascaded through the organisation
→ `projects.hoshin`. The project's one-page purpose →
`sixsigma.charter`. The trend's arithmetic → `stats.time-series-trend`.
The measures' design (lean, not financial-first) →
`visual.performance-measures`.

## In food and FMCG manufacturing
Cost-per-tonne and cost-per-pack targets; yield programmes (yield =
Π stage yields); output a week = hours × rate × (1 − losses); labour a
pack from the crew and the rate.

## References
- [practice] Minto, B. (2009), *The Pyramid Principle*, 3rd ed., Pearson — the issue tree's logic (from knowledge).
- [practice] Koller, T., Goedhart, M. and Wessels, D. (2020), *Valuation*, 7th ed., Wiley — value driver trees (from knowledge).
- [textbook] Maskell, B.H. (1991), *Performance Measurement for World Class Manufacturing*, Productivity Press — measures that connect to the strategy (via `visual.performance-measures`).

## In Faultline
Built as the lever tree, one of the three kinds of change
(`src/lib/planModel.ts`, FC-213): the outcome and its levers with
targets and actuals, actions on each. The arithmetic check (children to
parent), the gap's allocation by branch and each lever's money from the
one cost model are the pieces to add when it is next worked on.
