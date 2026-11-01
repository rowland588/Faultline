# FC-043 — Drum–buffer–rope and buffer management

**Catalogue:** FC-043 (a mode of FC-034 Line capacity, under *The week's schedule* — *Protect the constraint*; it takes the week's schedule of FC-179 as its drum) · **Knowledge:** `knowledge/methods/capacity/dbr-buffer.md` (Goldratt & Fox, *The Race*, 1986; Schragenheim & Dettmer, *Manufacturing at Warp Speed*, 2000), `knowledge/MONEY.md` §4 (T for a hole in the drum, H for the stock the buffer holds) · **Asked for:** the catalogue's problem — *"the constraint starves and work is expedited by whoever shouts"*; `docs/METHODS.md` §10–11, Theory of Constraints, *Subordinate the rest*; Rowland, 1 November — *"I want all tools made that get used in the projects"* · **Status:** specified and built 1 November (branch `m6-toc`); no decision of Rowland's outstanding.

## 1. Purpose
The week's schedule says what the constraint runs when. Drum–buffer–rope says **what must reach it, and when to release it, so it never waits**, and tells the planner which order to chase *now* instead of whoever shouts. The sentence: *"King Edward is 76% into its buffer and not yet arrived — expedite it; if it does not come, the drum cannot make its 150,000 packs: £52,500 of contribution."*

**Scope.** On the same panel, *Protect the constraint*: a **buffer** in hours of the drum's running time (typed once for the line); for each order not yet done, its place in the buffer — **plenty** (under a third consumed), **watch** (a third to two thirds), **expedite** (two thirds or more, not yet arrived) — each in words with the colour beside it; **the rope**: when the drum reaches the point B hours before an order's start, release it (said in the drum's own words: *"when Tesco is 29% done"*); the drum's position now from each order's **percent done** (a person's tap); **Arrived** noted when work reaches the constraint's buffer (with how much of the buffer was gone); the **stock** the buffer holds (the constraint's rate × the buffer — and in money when the line's materials a pack are given); **a hole in the drum** (the expedite orders' runs, in contribution); and **tuning**: from ten recorded arrivals, shorten the buffer 15% when red arrivals are rare and plenty is common, lengthen it 20% when red arrivals are frequent. **Not here:** reading work in progress from any machine (every percent and arrival is a person's tap — Rowland, 10 October: manual inputs); several constraints (FC-048); scheduling the non-constraints; subordinate-the-rest rules for batch size (FC-040 lot sizing is a separate record).

## 2. Users and scenarios
The ops lead or shift supervisor at the start of a shift, at a desk or on the phone. (1) *Tesco 70% through, 6 h buffer:* King Edward is 50.8% into its buffer — watch. (2) *Tesco 90% through:* King Edward is 75.8% — expedite. (3) *No buffer typed:* the page asks for it. (4) *Ten arrivals recorded, none red:* the buffer can shorten. (5) *A week of arrivals:* "premature", said.

## 3. Method selection
DBR's buffer management (Goldratt & Fox 1986; Schragenheim & Dettmer 2000): the time buffer is divided in thirds — green/yellow/red — by the share of it consumed; the constraint buffer's size is a start (about half the current lead time) tuned from the pattern of red arrivals. Alternatives from the record: Kanban/CONWIP pull (a different release rule, FC-044 territory), MRP lead-time offsets (releases on the clock, not the drum). Chosen: the constraint's own running time as the clock of the buffer, because on a packing line the schedule in front of the constraint is told in the drum's hours (overtime and stops move the clock, not the drum).

**Established · assumed · chosen.**
- *Established* (`capacity.dbr-buffer`; `scripts/knowledge/cases-toc.py`, FC-043): consumed = (B − time left until the order is due at the constraint) ÷ B; green under ⅓, yellow ⅓–⅔, red ⅔ and over; the rope releases an order when the drum is B ahead of its start; tuning: ≤5% red with the buffer mostly green on arrival → cut 15%; >10% red → add 20%; from a sample large enough (ten) — a week is premature.
- *Assumed*, and said on the page: the drum's schedule is FC-179's (so the same rate and changeover assumptions); the drum's position is where the orders marked done and part-done leave it (the first order not done, that far through); the buffer is the line's (the longest any of its products says, kept on each product's capacity as `bufferH`); the stock the buffer holds is at the next order's rate, and on a packing line it is mostly material staged (said).
- *Chosen (the builder, 1 November — the owner asked for the tools to be made and not to be asked):* **words and colour** — the state colours beside "Plenty of time / Watch / Expedite" (green, amber, red; never colour alone); **an arrived order** leaves the zones and is noted *Arrived*, with the share consumed when it came, because the arrival is what tunes the buffer; **tuning thresholds** as the record (5% / 10% / 15% / 20%, ten arrivals) — stated as the practice's, not a standard; **the hole** counts the expedite orders' whole quantity at the margin a pack (what the drum cannot make if they never arrive), said "if it cannot be made up".
- *Money line (MONEY.md §4):* **T** for the hole in the drum (the expedite orders' packs × the margin a pack), **H** for the stock the buffer holds (units × the materials a pack). Missing: *"Give the line a margin a pack (Set up the line) to say what a hole in the drum would cost."* and *"Give the line what a pack's materials cost (Set up the line) to say the stock the buffer holds in money."* — the hours and packs still said.

## 4. Inputs
Typed: the **buffer** in hours (once, for the line), each order's **percent done** (0–100), and **Arrived** (a tap). Read: the week's schedule (FC-179), the next order's rate, the line's margin and materials a pack. A client sees all of it and changes nothing.

## 5. Data suitability
Needs a schedule (FC-179) and a buffer above zero; without a buffer the page asks for it and shows no zone. Orders marked done 100% leave the list; an order outside the buffer is *Not due yet* with the point to release it. Fewer than ten arrivals: no tuning (said). A drum with every order done: the end of the week.

## 6. Calculations
`drum` = start of the first order not done + done% × its run; for an order starting at `s`: time left = (`s` − `drum`) ÷ 60 hours; outside the buffer when time left > B; else consumed = (B − time left) ÷ B (capped at 1.5): plenty < ⅓ ≤ watch < ⅔ ≤ expedite; release point = `s` − 60·B minutes of the drum, said as an order's percent through or "during the changeover into …"; stock = rate × 60 × B; stock in money = stock × materials a pack; hole = Σ expedite runs (minutes) and Σ expedite quantity × margin; tuning on *n* ≥ 10 arrivals: red share ≤ 5% and green share ≥ 50% → 0.85·B; red share > 10% → 1.2·B.
**Independent cases** (`scripts/knowledge/cases-toc.py`; each a unit test in `src/tools/plan/__tests__/dbr.test.ts`), on FC-179's schedule (Maris 0 → 540, Tesco 582 → 1,032, King Edward 1,074 → 2,740.7, Baby 2,782.7 → 3,382.7 running minutes) and a 6 h = 360 min buffer: Maris done and Tesco 70% through → drum at 582 + 0.7 × 450 = 897; King Edward due in 177 min = 2.95 h → 50.8% consumed, watch; Baby 31.4 h away, outside. Tesco 90% → drum 987, King Edward 75.8%, expedite; hole 150,000 × 35p = £52,500. The rope: King Edward released when the drum is at 714 (Tesco 29% done); Baby at 2,422.7 (King Edward 81% done). The stock at 100 a minute: 36,000 units, £14,400 at 40p. Tuning: ten arrivals, none red, nine green → 5.1 h; three of ten red → 7.2 h.

## 7. Outputs
On screen: the buffer box; one sentence (orders in the red and the hole, or "no order is in the red" with how far through the week the drum is); a row per order not done — the zone word, the module's sentence, release point, percent done box, Arrived; the stock line; the tuning sentence; what is missing named. **The report.** *The week's plan on paper* gains *Protecting the constraint — drum, buffer, rope*: the sentence, each order's place in the buffer with its release, the stock line and the tuning sentence — from the same module (`planBlocks`), under FC-179's section. Nothing missing is made up: no buffer → the section is not printed and the page asks; no cost → the input named.

## 8. Manufacturing usability
Done in a minute at the start of a shift: update two percentages, read the red list, chase. On a phone one column; the percent boxes and Arrived are 44 px. Lean page order: where we are (the sentence), why (which order, how much of its buffer is gone), what we are doing (expedite it; release the next on the rope).

## 9. Failure handling
No schedule → nothing. No buffer → asked for. Percent done clamped 0–100. A client reads only. Too few arrivals → "premature", no suggested length.

## 10. Integration
Reads FC-179's schedule and the orders (`done`, `arrived` inside each product's `capacity.orders`) and the buffer (`capacity.bufferH`) — optional fields in existing JSON, **no migration**. Shows where its parent shows: the Line capacity page (the panel) and *The week's plan on paper*. Access as FC-179. It opens from Theory of Constraints' *Subordinate the rest*.

## 11. Verification
`dbr.test.ts`; `scripts/acceptance/week-plan.mjs` (section 5–6: no buffer asked for; 6 h with Tesco 70% done — drum 897, King Edward watch at 50.8%, Baby outside with its release point, the stock 39,600 packs at the next order's 110 a minute; at 90% expedite and the £52,500 hole; one arrival and "premature"; the paper).

**Acceptance criteria.**
1. Consumed share, zone, release point, stock and hole equal the independent cases — `dbr.test.ts`; `week-plan.mjs` 5.
2. No buffer: the page asks, no zone is invented — `week-plan.mjs` 5.
3. The red list is said in words beside the colour — `week-plan.mjs` 5.
4. Fewer than ten arrivals: no tuning, said — `dbr.test.ts`; `week-plan.mjs` 6.
5. The paper carries the section as the module says it — `week-plan.mjs` 7.
6. Phone and client — `week-plan.mjs` 8–9.
Not yet proved: tuning from ten or more arrivals in the browser (the unit test covers the arithmetic, not ten taps).

## 12. Maintainability
`src/tools/plan/dbr.ts` (pure) with `planInputs.ts`, drawn by `PlanPanel.tsx`, on paper by `planPaper.ts`. Left, each with its number: several constraints (FC-048); a feed of real work in progress (not wanted — manual taps only); batch size for the rope (FC-040).
