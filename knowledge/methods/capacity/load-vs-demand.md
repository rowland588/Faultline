---
id: capacity.load-vs-demand
name: Will the orders fit? — load against the line's hours (rough-cut capacity)
aka: [rough-cut capacity planning, RCCP, load vs capacity, hours needed vs hours available, headroom, capacity check]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — rough-cut capacity planning as APICS/ASCM practice and Vollmann et al. give it (from knowledge), in Faultline's form (`src/lib/intelligence/demand.ts`, proved by its tests and `scripts/acceptance/upgrade.mjs`); the worked week computed in `scripts/knowledge/cases-capacity.py`
needs: [capacity.line-capacity]
next: [planning.scheduling-rules]
alternatives: []
related: [capacity.three-capacities, planning.crew-planning, changeover.smed, capacity.throughput-accounting]
---
# Will the orders fit? — load against the line's hours (rough-cut capacity)

## Purpose and principle
Before the week starts: the orders, each at the rate the line can
*plan* for its product, become hours; the changeovers between them add
theirs; the sum against the hours the line is staffed says whether the
week fits, by how much, and what to do if it does not — a shift, a
faster changeover, a product moved, an order declined. It is the
coarsest and most used capacity sum, and the one most often done at the
plate speed and therefore wrong.

## Questions it answers
- Do this week's orders fit in the planned hours — with how much room?
- Which product's hours, and which changeovers, take the week?
- What would a shorter changeover (SMED) or a faster standard buy in
  hours?
- When they do not fit: which order to move, by throughput per
  constraint minute (`capacity.throughput-accounting`)?

## Inputs and minimum conditions
- The orders for the period: product and quantity.
- Each product's plannable rate on the line (the standard's rate —
  Line capacity's shift view; never the plate speed) and the line's
  changeover time between products (SMED's current figure).
- The hours available: shifts staffed × hours less breaks and planned
  maintenance.

## Procedure and calculation
- Run hours per product = quantity ÷ plannable rate (per minute) ÷ 60.
- Changeover hours = number of changeovers × changeover time (from the
  sequence; the sequence itself can cut them — `changeover.sequencing`).
- Load = Σ run hours + changeover hours.
- Headroom = available hours − load (and as a share); negative is an
  overload to resolve.
- Sensitivity: the load at the plate speed (to show the planner the
  hours that are not there), at SMED's separated changeover, with a
  shift added.
- Overload: move or decline the order with the lowest throughput per
  constraint minute (`capacity.throughput-accounting`), or add the hours
  (a shift's labour against its contribution, `knowledge/MONEY.md` L, T).
- Over several weeks: the load profile; a week over and the next under
  is a smoothing question (`lean.heijunka-epei`).

**Worked case** (`cases-capacity.py`): four orders — 60,000 at 100/min,
45,000 at 110, 30,000 at 90, 24,000 at 120 — run hours 25.7; three
changeovers at 42 min = 2.1 h; load 27.8 h against 75 h of two shifts
over five days: headroom 47.2 h (63%) — the week fits with room for
another product or a shift dropped. Planned at plate speed (×1.2) the
run hours read 21.4 — 4.3 h booked that the line will not deliver. With
SMED's 27-minute changeover the headroom is 47.9 h — 45 minutes a week
back, about a third of an hour per changeover.

## Assumptions, limits and misuse
- Plate speed in the sum is the classic error; the standard's rate is
  the input, and the two are shown side by side so the planner sees the
  difference.
- Changeovers left out or taken as the best ever seen; SMED's *current*
  figure, with its spread.
- The rate for a product the line has not run is a guess; say so, and
  use the nearest product's.
- A fit on paper with 2% headroom is not a fit: the week's stops take
  more than that (the time model's efficiency).
- Rough-cut is per line; shared people or a shared packer between lines
  need the crew plan (`planning.crew-planning`).

## Reading the result
"This week's four orders need 27.8 hours of Line 2 including three
changeovers; we have 75 — 47 hours of room. At plate speed it would have
looked like 23.5 hours; the difference is the 4.3 hours the plan would
have lost." Money: an overload's cost is the order moved (its throughput)
or the shift added (its labour against its contribution); SMED's minutes
back × the line's contribution a minute (`knowledge/MONEY.md`, T, L).

## When not to use it — and instead
The rate the line can hold → `capacity.line-capacity`. The three
capacities and the two ratios → `capacity.three-capacities`. Which order
to run first on a full constraint → `capacity.throughput-accounting`.
The sequence to cut changeovers → `changeover.sequencing`. The people →
`planning.crew-planning`.

## In food and FMCG manufacturing
The weekly plan on every packing line; a retailer's promotion landing on
a full week; a new product's first run; the Christmas build; the
argument between planning and production about "capacity" settled by
the two rates side by side.

## References
- [textbook] Vollmann, T.E., Berry, W.L., Whybark, D.C. and Jacobs, F.R., *Manufacturing Planning and Control for Supply Chain Management*, 6th ed., McGraw-Hill, 2011 — rough-cut capacity planning (from knowledge).
- [practice] APICS/ASCM Dictionary — RCCP definition (from knowledge).

## In Faultline
Built as arithmetic with its tests (`src/lib/intelligence/demand.ts`, FC-040):
what a line can make and whether a demand fits, at the plannable rate,
with the week to send; proved by `scripts/acceptance/upgrade.mjs`. The
changeover hours from SMED and the plate-speed comparison are the next
pieces; the overload's resolution reads `capacity.throughput-accounting`.
