---
id: lean.value-stream-mapping
name: Value stream mapping — current state, future state, the plan between
aka: [VSM, value stream map, current state map, future state map, material and information flow mapping]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-22 — Rother & Shook (1999) as the method's source; Faultline's version (a line's stream as a swimlane grid of who and where) in docs/LEAN40.md and docs/TOOLKIT.md tool 2; arithmetic proved in src/tools/valuestream/__tests__/steps.test.ts
needs: [lean.takt-time]
next: [lean.kanban-supermarket, lean.heijunka-epei, lean.kaizen-event, capacity.littles-law]
alternatives: [lean.process-flow-chart, sixsigma.sipoc]
related: [lean.seven-wastes, lean.product-family-pq, capacity.theory-of-constraints]
---
# Value stream mapping — current state, future state, the plan between

## Purpose and principle
Drawing every step a product family goes through from supplier to customer —
with the material flow, the information flow, the waits and the inventory
between — so the whole stream is seen at once and waste shows as time: lead
time against the few minutes that add value. The future state is the stream
redesigned to flow to takt, with pull where it cannot flow; the plan is the
improvement loops that get there.

## Questions it answers
Where does the time go between order and despatch? Which steps add value?
Where is the inventory and how many days is it? Which loop to improve first?

## Inputs and minimum conditions
One product family (`lean.product-family-pq`); customer demand a day and
available time (takt); for each step: who and where, cycle time, changeover
time, uptime, people, the wait or inventory before it (with a count where
there is one); walked on the floor, not drawn at a desk.

## Procedure and calculation
- Takt = available time ÷ demand (`lean.takt-time`).
- Lead time = Σ waits + Σ cycle times; inventory converted to time =
  quantity ÷ daily demand (days).
- Value-added time = Σ cycle times of steps that change the product as the
  customer wants; process cycle efficiency = value-added time ÷ lead time.
- Each step: VA, NE (necessary, not value-adding), NV (waste).
- Any step's cycle over takt is a bottleneck for the stream.

## Assumptions, limits and misuse
- A map of one day's walk is a snapshot; inventories move. Walk it more than once.
- Mapping everything at once (every product) makes an unreadable map.
- A beautiful map with no future state and no plan is a gimmick (CLAUDE.md).

## Reading the result
"Lead time 2.1 days, value-adding 14 minutes (0.5%); the pallet waits 6 hours
for QA release — the largest wait."

## When not to use it — and instead
One machine's or one person's work in detail → `lean.process-flow-chart`,
`ie.time-study`. A high-level scope for a project → `sixsigma.sipoc`.

## In food and FMCG manufacturing
Intake to despatch for a chilled product (where shelf life is spent in
waits); positive release and QA holds; a bakery's mix–prove–bake–cool–pack.

## References
- [textbook] Rother, M. and Shook, J. (1999), *Learning to See*, Lean Enterprise Institute.
- [textbook] Womack, J.P. and Jones, D.T. (1996), *Lean Thinking*, Simon & Schuster.
- [textbook] Rother, M. and Harris, R. (2001), *Creating Continuous Flow*, Lean Enterprise Institute.

## In Faultline
`src/tools/valuestream/MapScreen.tsx` with `src/tools/valuestream/steps.ts`: a line's stream as
a swimlane grid by who and where, walked on the phone, its future state copied
and changed, before → after, on paper; acceptance `scripts/acceptance/value-stream.mjs`.
Since 30 October each step is classified VA · NE · NV in one tap — beside the stopwatch, in the step's panel (V · E · N), with a step nobody has classified said as *not classified* and counted on the page and every paper (knowledge/specs/FC-001-value-stream-money.md, part 2); the page is one primary, a row on the grid and More ▾.
Not built: inventory counts converted to days, supermarkets, kanban, pitch.
