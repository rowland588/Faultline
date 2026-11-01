# FC-139 — SIPOC: the scope on one page — the specification

**Catalogue:** FC-139 · a document of FC-240 · **Knowledge:** `knowledge/methods/sixsigma/sipoc.md` (Pyzdek & Keller 2014; George et al. 2005 — from knowledge, texts not re-read) · **Asked for:** Rowland, 1 November — all tools the methods use (DMAIC's Define) · **Status:** built on `m6-doc`. **Written before the code.**

## 1. Purpose
A project's scope is argued about after it starts. The SIPOC puts the process in four to seven steps from where it starts to where it ends, and for each step what it needs and from whom, what it makes and for whom, with the inputs the team suspects marked for the Measure phase: *"Intake → Wash → Slice → Pack → Despatch; customers: the wash line, the slicer, packing, despatch and the retailer's depot; inputs to measure: raw product size variation, blade sharpness and slicer setting."*

**Scope.** The SIPOC as a document at `#/doc/sipoc`: the process and its two edges, four to seven steps each with suppliers, inputs, outputs, customers and the inputs to measure, and what lies outside and why; the sentence, four tiles, the SIPOC as the classic five-column table, the counts. Not here: a map with times and stock (the value stream map, FC-001); the machines in flow order (the line's, a different level); any money (it has none).

## 2. Users and scenarios
The CI lead with the team round a table in the Define hour; the sponsor agreeing the boundary. (1) A yield project on sliced product (the record's case). (2) A changeover project from the last good pack to the first. (3) A complaint project from the line to the depot.

## 3. Method selection
The record's procedure: process first (start, end, four to seven steps as verb phrases), then outputs → customers, inputs → suppliers, the boundary written down and the rest parked with a reason. Alternatives: the value stream map (detail with times), the process flow chart (one path's every step), the CTQ table (the customers' requirements). Unsuitable: more than seven steps (a map, not a scope) — said.

**Established · assumed · chosen.**
- *Established:* a SIPOC is Suppliers, Inputs, Process, Outputs, Customers; four to seven steps; built by the team, agreed with the sponsor; customers are people or places; the inputs whose variation could cause the problem are marked for the Measure phase (the record).
- *Assumed:* the team knows the process, with someone from each step (said, not checkable).
- *Chosen:* (1) one row a step carries all five parts — the classic table is worked out from it; several inputs or customers in a cell are separated by commas and counted once each, compared without case. (2) Needed: the process, its start and end, **four steps at least** (a list's minimum), what is outside and why; **seven at most** (listed if exceeded). (3) A customer named as nobody (*the business*, *quality*, *management*, *everyone* …) is listed — the record's own examples, extended by the builder with the obvious synonyms. (4) Money: **none of its own** (MONEY.md FC-139 "—"), said in words on screen and paper.

## 4. Inputs
Needed: *The process*, *Where it starts*, *Where it ends*, *Process steps* (≥ 4, ≤ 7; each *Step*, then optional *Suppliers*, *Inputs*, *Outputs*, *Customers*, *Inputs to measure*), *Outside the scope, and why*.

## 5. Data suitability
Fewer than four steps, a step with outputs but no customer, inputs but no supplier, a vague customer, and no input marked to measure are each listed under *To put right*.

## 6. Calculations
Counts of distinct names: steps, customers, suppliers, inputs, outputs, inputs to measure. **Independent case** (`cases-doc.py` S1, the record's worked case): five steps, five customers, five suppliers, eight inputs, five outputs, three inputs to measure.

## 7. Outputs
The sentence; tiles *Steps*, *Customers*, *Suppliers*, *To measure*; the table *The SIPOC* (Suppliers · Inputs · Process step · Outputs · Customers); the working; no money (the sentence saying why).

**The report.** The SIPOC on paper as the five-column table under the band, with the edges, the boundary, the agreement, the checks, and *What this does not say* (a scope, not a map; one person's SIPOC settles nothing; a scope that excludes the cause cannot solve it; vague customers) — the screen's module.

## 8. Manufacturing usability
One row a step on a phone is a card of six boxes; Add step; Remove with Undo.

## 9. Failure handling
As FC-240 §9; a half-typed row is kept and read for what it has.

## 10. Integration
A document of FC-240; opens from DMAIC's Define; links to the charter and the CTQ table; its customers are whose requirements the CTQ table turns into limits.

## 11. Verification
`doc.test.ts` (three examples), `figures.test.ts` (words), `doc-shape.mjs`.

**Acceptance criteria.**
1. The record's worked case typed through the boxes says the sentence above, with 5 steps, 5 customers, 5 suppliers, 3 to measure, and the SIPOC table's rows — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. Two steps, a customer *the business*, an input with no supplier are listed; four steps are needed — `doc.test.ts`.
3. It says it has no money and why — `doc.test.ts`; `doc-shape.mjs` step *b*.
4. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
5. It opens from DMAIC's Define — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/sipoc.ts`; words `figures/words.ts`.
