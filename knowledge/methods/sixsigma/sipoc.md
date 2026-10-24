---
id: sixsigma.sipoc
name: SIPOC — suppliers, inputs, process, outputs, customers
aka: [SIPOC, high level process map, scope map, COPIS, process boundary]
discipline: sixsigma
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — Six Sigma practice as the handbooks give it (a five-column table, four to seven process steps, built in the Define phase); from knowledge, texts not re-read; the worked table in `scripts/knowledge/cases-sixsigma-visual.py`
needs: []
next: [lean.value-stream-mapping, sixsigma.voc-ctq]
alternatives: [lean.value-stream-mapping]
related: [sixsigma.charter, sixsigma.voc-ctq, lean.process-flow-chart]
---
# SIPOC — suppliers, inputs, process, outputs, customers

## Purpose and principle
One page that bounds the project before anything is mapped in detail:
the **process** in four to seven steps from its start to its end (the
scope's edges), the **outputs** each step produces and the **customers**
who receive them (and so whose requirements count — `sixsigma.voc-ctq`),
the **inputs** the process needs and the **suppliers** of each (and so
where an input's variation comes from). It is built by the team in an
hour, agreed with the sponsor, and settles the arguments that otherwise
surface in the measure phase: where the process starts, what is in and
out, who the customer is. It is a scope, not a map; the value stream
map or the process flow chart comes after.

## Questions it answers
- Where does the process start and end — what is in and out of scope?
- Who are its customers, and what do they receive?
- What inputs does it need, from whom — the sources of variation?
- Do the team and the sponsor agree the boundary?

## Inputs and minimum conditions
- The team's knowledge of the process, with someone from each step.
- The charter's problem (the SIPOC bounds the process the problem lives
  in).
- The customers named as people or places (the retailer's depot, the
  next line), not "the business".

## Procedure and calculation
- Process first: the start step and the end step, then four to seven
  steps between, each a verb phrase.
- Outputs per step (the product, the record, the pallet) → customers
  per output (internal and external); the customers' requirements go
  to the CTQ tree.
- Inputs per step (materials, information, settings, people) →
  suppliers per input; the inputs whose variation could cause the
  problem marked for the measure phase.
- The boundary agreed and written on the charter; anything outside it
  parked with a reason.
- Where the process has several paths (two lines, two products), one
  SIPOC per path or the paths named.

**Worked case** (`cases-sixsigma-visual.py`): a yield project on sliced
product. Process: intake → wash → slice → pack → despatch. Outputs:
washed product, sliced product, sealed packs, pallets; customers: the
slicer (from wash), packing (from slice), despatch, the retailer's
depot. Inputs: raw product (the grower), water and chemicals (the
supplier), blades and settings (engineering), film and trays
(packaging suppliers), the schedule (planning). The boundary: from
intake to the despatch dock; the grower's field is out, the depot's
handling is out. The inputs marked for measure: raw product size
variation, blade sharpness, slicer setting — the three the team suspects
drive yield.

## Assumptions, limits and misuse
- Too detailed — twenty steps — and it is a bad map, not a scope; four
  to seven.
- Customers left as "the business" or "quality" name nobody whose
  requirement can be measured.
- A SIPOC built by one person settles nothing; the team and the sponsor
  agree it.
- It is not where the data come from; the measure phase is.
- A scope that excludes the step where the problem is caused (the
  supplier's process) is a scope that cannot solve the problem; say so
  and widen it or change the goal.

## Reading the result
"Intake → wash → slice → pack → despatch; customer: the retailer's
depot; the inputs to measure: raw size, blade sharpness, slicer
setting." Money: none of its own; it bounds the process whose yield the
project values (`yield.mass-balance-yield`'s pounds by stage).

## When not to use it — and instead
The detailed stream with times and stock → `lean.value-stream-mapping`.
One path's every step → `lean.process-flow-chart`. The customers'
requirements as measures → `sixsigma.voc-ctq`. The project's purpose →
`sixsigma.charter`.

## In food and FMCG manufacturing
Scoping a yield project from intake to packing; a complaint project
from the line to the depot; a changeover project from the last good
pack to the first.

## References
- [textbook] Pyzdek, T. and Keller, P. (2014), *The Six Sigma Handbook*, 4th ed., McGraw-Hill — SIPOC in Define (from knowledge).
- [textbook] George, M.L. et al. (2005), *The Lean Six Sigma Pocket Toolbook*, McGraw-Hill (from knowledge).

## In Faultline
Not built (FC-161). A project names its lines and a line its machines
in flow order (`src/project`, `src/line`); the SIPOC's process column is
that order, and its customers and suppliers are two columns the app
does not hold. A small addition to a project's front page if Rowland
wants the scope said; not a tool.
