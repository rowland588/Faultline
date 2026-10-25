# FC-009 — Kanban sizing: how many containers a pull loop needs

**Catalogue:** FC-009 (FC-010 supermarkets and FIFO lanes is its running half — not built; FC-183 safety stock is its sibling calculator) · **Knowledge:** `lean.kanban-supermarket` (full, textbook), `capacity.littles-law` · **Asked for:** the catalogue's own problem, "line-side materials run out or pile up"; built as the calculator shape's first tool (`docs/TOOLS-BUILD-BRIEF.md`, 25 October) · **Status:** built on `build-calc`. **Written before the code.**

## 1. Purpose
Size a pull loop between two processes — film reels to a packer, trays from forming to packing, pre-weighs to a mixer — by arithmetic instead of habit: how many containers (kanbans), how many units the shelf holds at most, how much of that is the loop's own stock because a refill takes time, and what the stock is worth. The sentence: *"8 kanbans of 60 trays — a supermarket of at most 480 trays. The loop carries 400 trays before safety because a refill takes 2 hours; halve that and it carries 200."*

**Scope.** Sizes **one loop** from the units used over some hours, the time to refill a container, the units in a container and a safety factor (Monden's N = D × L × (1 + α) ÷ C, rounded up), and says the units on a full shelf, the loop's stock before safety (Little's law, D × L), the hours of cover, and — when a unit cost and a holding rate are given — the stock held and what holding it costs a year. It does **not** run the loop (cards against the count, the shelf's fill, stock-outs counted: FC-010), size a FIFO lane's maximum (FC-010), level the demand (FC-011), or work the safety margin from the spread (FC-183 does: linked from this page).

## 2. Users and scenarios
The shift or ops lead at the line, on a phone or in a meeting. (1) *Trays to the packer:* 1,500 used in a 7.5-hour shift, 2 hours to refill, a crate of 60, 15% safety → 8 kanbans, 480 trays. (2) *Two-bin labels:* 3,000 in an hour, 45 minutes to refill, 500 to a roll, 20% → 6 rolls (5.4 rounded up). (3) After a changeover is cut, the refill time halves: saved first as the before, the new one says 4 kanbans and what it takes off the shelf.

## 3. Method selection
The Toyota kanban formula with a safety factor (Monden) is the standard sizing of a card-driven loop; the alternative for purchased materials with long, variable lead times is the reorder point (FC-183), and for the cost trade of a batch size, lot sizing — each named on the page. It refuses nothing but impossible figures; it *warns* where the safety factor is above the usual and where a refill time looks like a run time (said under *What this does not say*: the refill time is the whole wait, not the run).

**Established · assumed · chosen.**
- *Established:* N = D × L × (1 + α) ÷ C, rounded up, supermarket maximum N × C (Monden, *Toyota Production System*; `knowledge/methods/lean/kanban-supermarket.md`, worked case in `scripts/knowledge/cases-lean.py`); the loop's stock before safety is D × L (Little 1961); 10–20% is the safety factor usually used (the record's own words — from knowledge, text not re-read).
- *Assumed:* demand is levelled and steady (said on the page); the refill time is the whole wait from card to shelf.
- *Chosen (the builder, 25 October — the owner asked not to be asked):* the starting safety factor is **15%**, inside the 10–20% range, shown with *"A choice, not a measurement"* and the reason; a factor above 20% draws a warning, not a refusal; the wording of the sentence, the five tiles, and "send the card back as each container empties" (the kanban rule) as the call for more; **no carrying rate or unit cost is ever assumed** (`knowledge/MONEY.md` rule 5): the industry's 15–35% a year is said as a range in the help text only. The figure 1e-9 below which a quotient is "a whole number plus floating-point dust" is the code's, proved by case K3.

## 4. Inputs
What is in the container (text, optional — it names the sentence; "units" if blank) · How many are used (units) over how many hours (hours) — each > 0 · Time to refill a container (minutes, > 0) · Units in one container (whole number ≥ 1) · Safety factor (%, 0–200, start 15, a said choice) · *In money, optional:* What one unit costs (£) · Cost of holding stock for a year (% a year, 0–100). Nothing is read from the line (no figure the line holds is a unit's cost).

## 5. Data suitability
Use over a whole shift or a day, not a quiet hour (help text); a refill time that is a run time under-sizes the loop (caveat); steady demand (caveat); a short-life product cannot sit past its life (caveat). A loop that always needs more kanbans each time it runs short is said to hide a cause.

## 6. Calculations
D = usage ÷ hours; L = minutes ÷ 60; stock before safety = D × L; raw N = D × L × (1 + α) ÷ C; N = max(1, ⌈raw N − 10⁻⁹⌉); shelf = N × C; above what the refill needs = shelf − D × L; cover = shelf ÷ D hours; stock held = shelf × unit cost; a year = stock held × rate ÷ 100. **Independent cases** (`scripts/knowledge/cases-calc.py` K1–K3, each a unit test in `src/lib/ie/__tests__/pull.test.ts` and an example in the definition): K1 1,500 in 7.5 h, 120 min, 60, 15% → D 200, 400 in the loop, raw 7.667 → **8**, 480 trays, cover 2.4 h; K1b 60 min → 3.83 → **4**, 240; K2 3,000 in 1 h, 45 min, 500, 20% → 5.4 → **6**, 3,000 rolls, 2,250 before safety; K3 100 in 1 h, 180 min, 60, 20% → 360 ÷ 60 = exactly **6** (not 7); money on K1: 480 × £0.85 = £408.00, £102.00 a year at 25%.

## 7. Outputs
Verdict "*n* kanbans" (neutral); the sentence above; one more line (the card's call, the hours of cover); tiles *Kanbans* (of containers of 60 trays), *Most on the shelf*, *Held before safety* (D × L, an hour's use × the refill), *Cover*, *Stock held* (£, or "—" saying what to give); the working (each step with its numbers and its method); the money sentence — *"A full shelf is £408.00 of trays at £0.85 each — tied up because a refill takes 2 hours and the loop carries a 15% margin, £68.00 of it the margin and the rounding up. Holding it costs about £102.00 a year at 25%."* — or the sentence(s) naming what to give; four caveats; the closing line. No picture: a kanban count has nothing a drawing would add.

**The report.** The generic calculation paper (`lib/report/calcPaper`, FC-235): the band with "8 kanbans", the five tiles with what moved since a saved before, the sentence and the card's call, the figures put in with units and where each came from (the safety factor "Faultline's starting point — a choice" while unchanged), the working, the money, the caveats, Before → after when saved, the closing line. Read back by `calc-shape.mjs` step *e*.

## 8. Manufacturing usability
Five boxes to an answer, one more for each money figure; typed on a phone beside the line; a before saved when the refill time is cut and the next figures read as before → after; the what-if shows 4 kanbans at 60 minutes before anything is changed.

## 9. Failure handling
Blank or non-positive figures: *Waiting for the figures* naming them; a container of 0 or 2.5 units refused in words; a safety factor over 20%: a warning beside the answer; a client reads it, changes nothing.

## 10. Integration
A `ToolStudy` of tool `calc`, `agreed.calc.key = 'kanban'`; on a line, a project or none; listed under the hub's Kanban sizing card and the line's *Calculators* row; in the line report as "Kanban sizing — <name>"; the project's Tools. `built.where: ['/calc/kanban']`, no app face. No migration. The value stream map's stock (FC-001) could feed it — left for FC-010.

## 11. Verification
`src/lib/ie/__tests__/pull.test.ts` (K1, K1b, K2, K3, never fewer than one); `src/tools/calc/__tests__/calc.test.ts` (this definition's examples and refusals, its blank-box and money behaviour, the before and the what-if on this definition); `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. N, the shelf, the stock before safety and the cover equal the independent cases K1, K1b, K2 and K3 — `pull.test.ts` and `calc.test.ts` (examples 1–3).
2. 360 ÷ 60 is exactly 6 kanbans, never 7 — `pull.test.ts` (K3); `calc.test.ts` example 3.
3. The sentence, tiles and money equal the stated literals when typed through the real boxes — `calc-shape.mjs` step *b* (kanban).
4. A container of 0, a half container and a missing refill time are refused in words — `calc.test.ts` ("refuses"); `calc-shape.mjs` step *c*.
5. The safety factor says it is a choice and whose; a factor above 20% warns — `calc.test.ts` ("sound definition": a number with a starting point says whose choice); `calc-shape.mjs` step *a* (the choice text is on the page; the money boxes stay optional).
6. A missing unit cost or holding rate is named and the answer still stands — `calc.test.ts` ("stops, and says which"); `calc-shape.mjs` step *b* (example 2).
7. Halving the refill time through the what-if says 4 kanbans, and the saved before reads 16 → 8 with its tile changes — `calc.test.ts` ("a what-if", "the saved before"); `calc-shape.mjs` step *d*.
8. Paper, phone, rename, delete and Undo, reload: as the shape's criteria 7–9 — `calc-shape.mjs` steps *e*, *f*, *g*, *d*.
Not yet proved: running the loop (FC-010) — not built.

## 12. Maintainability
Definition `src/tools/calc/defs/kanban.ts`; arithmetic `src/lib/ie/pull.ts` `kanbanLoop` (shared with the two sibling calculators' file, by topic). Left, with their numbers: FC-010 (the loop running: cards, fill, FIFO lane maximum), FC-011 (levelling), a first-class link from a value stream map's stock.
