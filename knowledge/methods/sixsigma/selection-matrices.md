---
id: sixsigma.selection-matrices
name: Choosing between solutions — the Pugh matrix and impact–effort
aka: [Pugh matrix, decision matrix, weighted criteria, impact effort matrix, PICK chart, prioritisation matrix, solution selection]
discipline: sixsigma
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Pugh (1991) *Total Design* for the controlled-convergence matrix; the impact–effort grid and the PICK chart (Lockheed Martin's, by repute) as Six Sigma practice; from knowledge, texts not re-read; the worked choice in `scripts/knowledge/cases-sixsigma-visual.py`
needs: []
next: [rca.pdca]
alternatives: [cost.investment-appraisal]
related: [cost.investment-appraisal, rca.fishbone-5whys, visual.action-tracking]
---
# Choosing between solutions — the Pugh matrix and impact–effort

## Purpose and principle
When a cause has several possible countermeasures, or a design several
concepts, the choice is made explicit rather than by the loudest voice.
**Pugh's matrix**: options as columns, criteria as rows, one option (or
the present state) as the datum scored 0; each other option scored +
(better), 0 (same), − (worse) against the datum on each criterion; the
counts of + and − and, where the criteria are weighted, the weighted
sum, rank them — then the strong features of weaker options are
combined into the leaders and the matrix run again (controlled
convergence). **Impact–effort**: each option placed by its effect on
the number and the effort to do it, in four quadrants — quick wins
(high impact, low effort) first, major projects planned, fill-ins when
there is time, the rest dropped. Neither replaces money: where the
choice is capital, the appraisal decides; the matrices order the work.

## Questions it answers
- Which countermeasure first — and which not at all?
- On which criteria does each option win and lose?
- Which quick wins can be done this week, and which are projects?
- Did the choice follow the criteria the team agreed before scoring?

## Inputs and minimum conditions
- The options, described alike (what, roughly what it costs, how long).
- Criteria agreed before scoring, with weights where they are not
  equal: effect on the number, cost, time to do, safety, hygiene,
  risk — and the datum.
- Scores from the team with the floor present; evidence where it
  exists (a trial's result) over opinion.

## Procedure and calculation
- Pugh: sᵢⱼ ∈ {+1, 0, −1}; count of + and − per option; weighted score
  Σⱼ wⱼ sᵢⱼ; the leader(s); features of others that beat the leader on
  a criterion folded in; re-run.
- Impact–effort: impact 1–5 (the share of the gap it closes, from the
  cause's size), effort 1–5 (days and pounds); quadrant by the two
  midpoints; quick wins → actions this week (`visual.action-tracking`),
  major projects → planned with the sponsor, fill-ins → when there is
  slack, avoid → recorded as declined.
- Sensitivity: change a weight by one step; if the leader changes, the
  choice is on a knife-edge and says so.
- Where an option costs capital, its payback by
  `cost.investment-appraisal` sits beside the matrix.
- The chosen option's expected effect written as the PDCA's prediction
  (`rca.pdca`).

**Worked case** (`cases-sixsigma-visual.py`): four countermeasures for
film breaks. Criteria and weights: cuts breaks 5, cost 3, time to do 3,
safety 4, hygiene 4; the datum the present state. Pugh: film guide
+3 −0, weighted +11; reel trolley +2 −0, +9; new unwind unit +1 −2, −1
(cuts breaks but costs and takes time); second operator +1 −1, 0.
Impact–effort: film guide (3, 1) and reel trolley (3, 2) quick wins;
new unwind unit (4, 5) a major project; second operator (2, 2) a
fill-in. The week's actions: the guide and the trolley; the unwind unit
goes to appraisal.

## Assumptions, limits and misuse
- Weights chosen to pick a favourite — set the criteria and weights
  before the options are scored, and keep them.
- Scores from the office without the operators score the wrong
  criteria.
- A matrix that produces one clear winner on every criterion did not
  need a matrix; its value is in the close calls and the combinations.
- Impact guessed rather than taken from the cause's size (the Pareto's
  bar) ranks by enthusiasm.
- The matrix orders the work; it does not prove the chosen option works
  — the PDCA does.

## Reading the result
"Quick wins: a film guide and a reel trolley this week; the new unwind
unit is a project for appraisal; the second operator is a fill-in."
Money: each option's expected effect × the model's rate
(`knowledge/MONEY.md`, the Pareto bar's T or Q) against its cost — the
impact axis in pounds where the data allow.

## When not to use it — and instead
Money decides a capital choice → `cost.investment-appraisal`. Finding
the causes to choose countermeasures for → `rca.fishbone-5whys`. Proving
the chosen one → `rca.pdca`. Tracking the quick wins →
`visual.action-tracking`.

## In food and FMCG manufacturing
Choosing between countermeasures from a 6M; ranking a kaizen week's
ideas; choosing a pack format or a supplier on several criteria.

## References
- [textbook] Pugh, S. (1991), *Total Design: Integrated Methods for Successful Product Engineering*, Addison-Wesley — the controlled-convergence matrix (from knowledge).
- [textbook] George, M.L. et al. (2005), *The Lean Six Sigma Pocket Toolbook*, McGraw-Hill — the Pugh matrix and impact–effort (from knowledge).
- [practice] The PICK chart (Possible, Implement, Challenge, Kill) — Six Sigma practice (from knowledge).

## In Faultline
Not built (FC-144). A 6M's countermeasures are raised with their
expected effect (`src/lib/sixm.ts`); FC-144 would score several
countermeasures for one cause on agreed criteria, place them on
impact–effort with the impact taken from the cause's size in money, and
turn the quick wins into actions.
