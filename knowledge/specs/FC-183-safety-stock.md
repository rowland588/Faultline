# FC-183 — Safety stock and the reorder point

**Catalogue:** FC-183 (sibling calculator of FC-009; FC-186 forecast accuracy shares its stock-out costing and is not built) · **Knowledge:** `planning.safety-stock` (full, textbook) · **Asked for:** the catalogue's problem, "the line stops for film or trays"; the second view of kanban sizing in `docs/TOOLS-BUILD-BRIEF.md` · **Status:** built on `build-calc`. **Written before the code.**

## 1. Purpose
Say how much of a material to hold so an order arrives before the stock runs out often enough, and at what stock to order: *"Reorder when stock falls to 21 reels: 12 are used while the order comes, and 8.5 more are held so that about 98 orders in 100 arrive before it runs out."* — with what holding that costs a year beside what running short would.

**Scope.** One item ordered when its stock falls to a reorder point (continuous review), demand over the lead time taken as bell-shaped: the reorder point, the safety stock, the demand over the lead time, the service level as a said choice, how much of the spread is the supplier's delivery time, and — from optional figures — the holding cost a year and the stock-outs a year with their cost. **Not** here: the order quantity (lot sizing), the fill-rate frontier (Factory Physics' efficient frontier; the page says it is not drawn), periodic review, slow or lumpy items (Poisson / empirical — FC-066 spares), a spreadsheet of many materials.

## 2. Users and scenarios
The buyer or ops lead at a desk. (1) *Film reels:* 2.4 a day (σ 0.9), delivered in 5 days (σ 1.5), 98% → reorder at 21, safety 8.5; 76% of the spread is the delivery time — halve it and the safety stock is 5.5. (2) *A reliable supplier:* 100 a day (σ 20), 4 days (no spread), 95%, £2.50 a unit, 20% a year, 500 a time over 250 days, £800 a stock-out → reorder 466; holding the safety stock £32.90 a year, 2.5 of 50 orders short = £2,000 a year. (3) No variation at all: nothing to hold.

## 3. Method selection
The reorder-point model with safety stock z × √(L σd² + d̄² σL²) is the standard for continuous review (Silver, Pyke & Thomas 2017) and Factory Physics' *variance of replenishment-time demand*; the kanban sizing (FC-009) is the line-side alternative and the alternative for lumpy demand is a Poisson or empirical model (said under *What this does not say*; FC-066). The service level is **cycle service** (the chance an order cycle ends without a stock-out), the one the formula's z gives exactly.

**Established · assumed · chosen.**
- *Established:* SS = z × √(L·σd² + d̄²·σL²), ROP = d̄·L + SS, z the normal quantile of the service level (`knowledge/methods/planning/safety-stock.md`; `lib/ie/dist` `normalQuantile` against SciPy `norm.ppf`); the film-reel worked case is the record's own and `scripts/knowledge/cases-calc.py` S1; orders a year = usage a year ÷ order quantity, stock-outs a year = (1 − service) × orders (the definition of cycle service); holding a year = stock × unit cost × rate.
- *Assumed:* demand over the lead time is bell-shaped and demand and lead time are independent (both said on the page). Checked: when what is used while the order comes is under twice the swing, the model puts more than 2 lead times in 100 below nothing used and the page warns (Φ(−2) = 2.3%).
- *Chosen (the builder, 25 October — the owner asked not to be asked):* the service level is a choice among 90, 95, 97.5, 98, 99 and 99.5%, starting at **95%**, said as a choice and whose; the "under twice" warning rule; the reorder point is rounded **up** to whole units while the safety stock is said to a tenth; the wording of the sentences; the "halve the bigger source of the spread" line (pure arithmetic of the same formula, never a promise); no carrying rate, unit cost or stock-out cost is assumed — each is optional and its absence named.

## 4. Inputs
What it is (text, optional) · Used a day on average (> 0) · How much a day's use swings (σ, ≥ 0 — a count of daily use over a few weeks) · Days from order to delivery on average (> 0, measured from orders placed) · How much delivery swings (σ, ≥ 0 — 0 only if it always arrives on the day) · Chance an order arrives before you run out (choice, start 95%) · *In money, optional:* units in an order, days a year the line runs (asked, never assumed), what one unit costs, the cost of holding stock for a year, what running out costs each time.

## 5. Data suitability
σ must come from real counts of days and deliveries, not a contract; the lumpy-demand warning (above); the same service level for every item ignores the consequence (caveat); an order quantity is not chosen here (caveat).

## 6. Calculations
z = Φ⁻¹(service); σ_LT = √(L σd² + d̄² σL²); SS = z σ_LT; ROP = d̄ L + SS, shown ⌈ROP − 10⁻⁹⌉; supplier share = d̄² σL² ÷ (L σd² + d̄² σL²); orders a year = d̄ × days ÷ Q; short a year = (1 − service) × orders; holding = SS × cost × rate ÷ 100; short cost = short × £ each. **Independent cases** (`cases-calc.py` S1–S4, unit tests in `pull.test.ts`): S1 z 2.05375, σ_LT 4.1243, SS 8.4704, ROP 20.4704 → 21, supplier share 12.96/17.01; halving σL → SS 5.545; S2 σL = 0: σ_LT 40, SS 65.794, ROP 465.794 → 466, halving σd → 32.897; S3 50 orders, 2.5 short, £32.897 holding, £2,000; S4 z at 90, 95, 97.5, 98, 99, 99.5, 99.9% = 1.28155, 1.64485, 1.95996, 2.05375, 2.32635, 2.57583, 3.09023; no spread → SS 0, ROP d̄L.

## 7. Outputs
Verdict "Reorder at *n*" (neutral); the sentence (or, with no spread, *"… all of it used while the order comes; with no variation in use or in delivery there is nothing to hold in safety."*); a line saying which source of the spread dominates and what halving it would do; tiles *Reorder point*, *Safety stock*, *Used while it comes*, *Service* (with z), *Holding it* (£ a year or "—"); the working (seven steps); the money — holding and stock-outs a year, each from its own inputs, each missing one named; four caveats; the closing line. No picture: a reorder point has nothing a drawing would add.

**The report.** The generic calculation paper (FC-235): band, tiles, sentence and the spread line, the figures put in with units and sources (the service level "Faultline's starting point — a choice" while unchanged), the working, the money, the caveats, Before → after when saved, the closing line.

## 8. Manufacturing usability
Five boxes to an answer; the delivery's swing is the figure people do not have — its help says to take it from the last deliveries; the what-if shows what a steadier supplier is worth before anything is asked of the supplier.

## 9. Failure handling
Blank figures: *Waiting for the figures*; a negative swing or a zero lead time refused; a service level not on the list cannot be typed; lumpy demand warned; the money inputs optional and named when missing.

## 10. Integration
`ToolStudy` tool `calc`, key `safety-stock`; `built.where: ['/calc/safety-stock']`; linked both ways with Kanban sizing (`see`); in the line's Calculators row, the line report and the project's Tools; no migration.

## 11. Verification
`pull.test.ts` (S1–S4, no spread); `calc.test.ts` (examples, refusals, blank boxes); `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. z, σ over the lead time, the safety stock and the reorder point equal the independent cases S1, S2, S4 — `pull.test.ts`; `calc.test.ts` examples 1–3.
2. The reorder point is rounded up and the safety stock said to a tenth — `calc.test.ts` example 1 (21 / 8.5) and example 2 (466 / 65.8).
3. The supplier share and the "halve it" line follow the formula — `calc.test.ts` (the examples' `more` is read on screen in `calc-shape.mjs` step *b*); the figures 5.5 and 32.9 are `cases-calc.py` S1, S2.
4. Holding and stock-outs a year equal S3 (£32.90, 2.5 of 50, £2,000) and a missing input is named — `calc.test.ts` example 2; `calc-shape.mjs` step *b*.
5. A swing under twice the demand over the lead time warns; a service level off the list cannot be typed — `calc.test.ts` ("refuses").
6. No variation says there is nothing to hold — `calc.test.ts` example 3.
7. Paper, phone, rename, delete and Undo, reload, before → after and the what-if — `calc-shape.mjs` steps *b*–*g*.
Not yet proved: the fill-rate frontier (not built); a lumpy-demand model (not built).

## 12. Maintainability
Definition `src/tools/calc/defs/safety-stock.ts`; arithmetic `src/lib/ie/pull.ts` (`reorderPoint`, `cyclesShort`). Left: periodic review, the fill-rate frontier, many materials at once (FC-186 shares the stock-out costing), critical spares by Poisson (FC-066).
