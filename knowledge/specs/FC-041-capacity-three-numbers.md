# FC-041 — Capacity's three numbers: design, effective, actual

**Catalogue:** FC-041 (a part several tools share — it lives on Line capacity's "A shift"; the load against the
week's orders is FC-040's, built; the shift's losses are FC-049's loss count; the factory across lines is FC-048,
not built). **Knowledge:** `knowledge/methods/capacity/three-capacities.md` (full, textbook),
`docs/CAPACITY.md` §2 and §5, `knowledge/MONEY.md` §4 (FC-041: causation **T**, the gap in contribution).
**Asked for:** the catalogue's problem — *"capacity is quoted at the plate and demand is planned against it"*;
`docs/METHODS.md` §11, Theory of Constraints, *Identify the constraint* (FC-041 part-built); Rowland, 31 October —
build the part-built tools of each method. **Status:** specified and built 31 October (branch `m5-toc`), under the
24 October money rule; no decision of Rowland's outstanding (every input is the line's or Line capacity's and is
typed where it already is).

## 1. Purpose
"The line can do 100 a minute" is three different numbers depending on who says it. Line capacity already says
what a shift makes (capacity a shift: the shift less its breaks and the changeovers SMED timed into the product,
at the bottleneck's pace once its own stops count). This puts that number beside the other two — what the shift
was **built** to make (the plate, every minute) and what a counted shift **made** — with the two ratios told
apart, so the planner, the accountant and the shift stop arguing about one word. The sentence it lets one side say
to the other: *"Days is built to make 48,000 and can really make 42,750 — 89% of that; last Monday made 40,000:
83% of the asset used, 94% of what the planned time could do — 2,750 short, £1,100 of contribution if it cannot
be made up."* The planner's number (effective), the asset's (utilisation) and the shift's (efficiency) in one
table.

**Scope.** On a product's Line capacity page, under **A shift**, and on that product's Line capacity paper:
**design** (plate speed of the station that sets the pace × the shift's whole minutes), **effective** (the
shift's capacity as `shiftCapacity` already works it — not recomputed), **actual** (the line's newest counted
shift, its loss count's good packs), **utilisation** (actual ÷ design), **efficiency** (actual ÷ effective),
**loading** (what the target asks of the shift's planned minutes ÷ effective), and **where design went** — the
breaks, the changeovers and the line's own stops and rejects, in packs, adding exactly to design − effective. The
shortfall (effective − actual) in contribution, from the one cost model. **Not here:** a week or a 24 × 7
design (a shift is the unit the line sets; the week is FC-040's), the orders' loading (FC-040), why the counted
shift fell short (the loss count's waterfall, linked), the headroom of an extra shift priced against its labour
(a decision about shifts, not a loss — FC-048), several lines feeding one place (their lanes hold them, not one
pace — nothing is said), OEE (never).

## 2. Users and scenarios
The ops lead reviewing a line before peak season; the planner asking what a shift can be planned on; the shift
manager asking why 40,000 of "100 a minute" is not 48,000. Desk and phone. Food first: a bagging line with fixed
cleaning time, two shifts a day with 30 minutes of breaks the line stops for, three changeovers a shift of 42
minutes between pack sizes; a night shift under relief, running through its breaks.

## 3. Method selection
Design, effective and actual capacity, utilisation and efficiency as Stevenson's *Operations Management* defines
them (`capacity.three-capacities`). Alternatives, from the record: the loss count and its waterfall for where the
planned hours went (kept, linked — this is not a second waterfall); FC-040 for next week's orders; OEE multiplies
three ratios into one that hides which moved (left out on purpose, `equipment.oee`). The method refuses to
decide with a typed speed that is not a plate and says so; it is not worked out for several lines feeding one
place.

**Established · assumed · chosen.**
- *Established* (Stevenson, *Operations Management*, ch. 5; `docs/CAPACITY.md` §2, §5): design capacity is the
  rated speed over the time; effective capacity is what can be planned once planned losses are out; utilisation =
  actual ÷ design, efficiency = actual ÷ effective, loading = demand ÷ effective; the planned losses of a shift
  are the breaks the line stops for and the changeovers; the rest is the line's own stops and rejects.
  Throughput accounting prices a unit short at the constraint at price less truly variable cost (Goldratt and
  Cox; Corbett) — `knowledge/MONEY.md` causation **T**: *"design − actual in packs → T a shift"*, here
  narrowed to **effective − actual** (see the choices).
- *Assumed*, and said on the page: the count's good packs are comparable with the sheet's good packs (the count
  says good; rejects are the sheet's `goodOut`); the shift counted is run on this product's line standard (a count
  made on another standard is passed over; a count with none is the line's).
- *Chosen* (Faultline's, to be agreed by Rowland on walking it): **a shift, not a week**, because the line's
  shifts and breaks are set per shift (Set up the line) and the loss count counts a shift; **design speed is the
  slowest station's own speed in the line's unit** (`ownSpeed` of `limitAtRunning`: a machine's plate, a person's
  standard time — the same speed the loss count judges a shift against, `lineSpeed`) and a speed that is typed,
  timed off the plate or a guess is used and **said not to be a plate**; **the "target" stands for demand** here
  (what the target asks of the shift's planned minutes — target a minute × planned minutes) because orders are
  a week's (FC-040); **only effective − actual is priced** — design − effective is a plan (breaks, the sheet's
  changeovers, the sheet's stops), not a loss, and an extra shift's worth is a decision against its labour, so it
  is said and not priced; **a count above the sheet is said "the sheet may be too careful"**, never praised. The
  money row of `knowledge/MONEY.md` FC-041 is narrowed accordingly (effective − actual).
- *Money line (MONEY.md §4):* causation **T** (contribution at the constraint), input **contribution a pack** —
  the line's price less materials, else its margin a pack (`contributionOf`, the one model). When missing:
  *"Give the line a margin a pack (Set up the line) to say that in money"* — the packs still said, nothing waits.

## 4. Inputs
Read from the line, asked nowhere new: the stations and their speeds and sources (Line capacity); the line's
shifts and breaks (Set up the line → `shiftsIn`); the changeover into the product (SMED → `changeoverIn`); the
target (Line capacity's `targetPerMin`); the newest loss count of the line (window, breaks, planned minutes,
good packs made); the line's margin a pack and materials. Nothing is typed on this block.

## 5. Data suitability
No sample, so no minimum. Needs: a counted sheet (a pace-setting station with a speed), the shifts with their
breaks (a shift whose breaks are not said has its design only and is named), and — for actual — one counted shift
(none yet is said, with where to count one). A count whose planned minutes exceed its window is refused and said.
A line of several lines feeding one place gets nothing.

## 6. Calculations
Per shift, with `plate` = the design speed (not below the sheet's good pace), `rate` = the sheet's good packs a
minute (`goodOut`), `m` the shift's minutes, `b` its breaks, `c` the changeover minutes off it, `k = m − b − c` the
minutes making:
- design = plate × m
- effective = rate × k (= `shiftCapacity`'s made)
- breaks = plate × b; changeovers = plate × c; stops and rejects = (plate − rate) × k —
  **breaks + changeovers + stops and rejects = design − effective** exactly.
- counted: the count's window `w` and planned `p` go through the same sheet (breaks `w − p`), giving
  design = plate × w, effective = rate × k′; utilisation = made ÷ design; efficiency = made ÷ effective;
  short = effective − made; worth = short × contribution when short > 0.
- loading = target × planned ÷ effective.

Independent cases (`scripts/knowledge/cases-capacity-three-mix.py`, plain arithmetic, each a unit test in
`src/tools/linebalance/__tests__/capacityThree.test.ts` and `src/lib/ie/__tests__/mix.test.ts`): a bagger on its
plate at 100 a minute running 95%, an 8-hour shift less 30 minutes, 3 changeovers of 42 min: design 48,000; breaks
3,000 + changeovers 12,600 + stops 1,620 = 17,220; effective 30,780 (64%); counted 28,000 → utilisation 58%,
efficiency 91%, 2,780 short, £1,112 at £0.40, loading 146% at a target of 100; with no changeover timed effective
42,750 (breaks 3,000 + stops 2,250); a 360-min count of 20,000 is 56% of 36,000 and 103% of 19,380 (above the
sheet, not priced); Stevenson's week (120 a minute × 24 × 7 = 1,209,600; 100 × 16 h × 5 d = 480,000; 148,000 made)
is 12% and 31% — the two ratios told apart.

## 7. Outputs
On screen (under A shift): a table — Shift · Built to make · Breaks · Changeovers · Stops & rejects · Can really
make (with its % of design); the sentence; the counted shift's sentence, its three ratios (utilisation,
efficiency, loading) each named for what it divides, the shortfall in packs and money, the notes (what is not
said or not given, and where), and a button to the loss count. Neutral throughout — design − effective is a plan;
only a shortfall to the sheet is red.

**The report.** Line capacity's one-product paper, in both of its forms (the product's own page and the lean
page), gains **Three numbers —** one line under "What the line makes a shift", from the same module as the screen
(`capacityThree`, its `paper` paragraph — the counted shift against design and effective when one is counted, else
what a shift is built to make and can really make), so the facts cannot part from the screen's longer sentences and
notes. A product's paper is **one page** (`list-paper.mjs` 1): where the line would cost that page the paper leaves
it to the screen, which always says it — said here, and in the spec's *not yet proved*. Purpose and context: the
product, the line, the day printed. Data and assumptions: the plate speed's source and the count's day and shift
are in the screen's sentence; the paper's line gives the figures. Formats: the PDF Line capacity already offers
(Report ▾); it lands on the combined line report through the same paper blocks and on the list papers (every product
shown), where a product's page is not held to one. Nothing is made up: no shifts set → no line.

## 8. Manufacturing usability
Nothing to type: the block reads the line. Phone: the table scrolls inside its box, the sentences wrap, nothing
off the page. Taps to the answer: open the product's Line capacity — it is under A shift. Neutral colour.

## 9. Failure handling
No shifts set (nothing worked out; A shift says so); breaks not said (design only, the shift named); no changeover
timed or its number a shift not said (none comes off, said); no target (loading not claimed, said); no count (said,
with where to count one); a count whose planned minutes exceed its window (refused, said); nothing made (0%, said,
not hidden); a typed speed (said not a plate); several lines feeding one place (nothing); no margin (the packs
short are still said; the money names what to give); a client reads and changes nothing (the block writes
nothing).

## 10. Integration
Reads: the Line capacity (`Standard.capacity`), the workspace's shifts, margin and materials, the SMED's
changeover, the line's loss counts (studies, tool `losses`). Writes nothing and adds no record, column or
policy — no migration. Shows where its parent shows: the product's Line capacity page (A shift), its paper (the
product's own and the list's), the combined line report (through the same paper blocks); the loss count is linked
from it. Access: read-only. PAGES.md: the Line capacity page's "A shift" lines gain the three numbers.

## 11. Verification
Unit tests on the independent cases (`capacityThree.test.ts`, `mix.test.ts`); the acceptance script
`scripts/acceptance/line-capacity.mjs` (section 17), run against a dev server.

**Acceptance criteria.**
1. design, effective and the three losses between them equal the independent case (48,000 → 42,750, breaks 3,000 +
   stops 2,250) and add exactly — `capacityThree.test.ts`; `line-capacity.mjs` 17b reads the table and sentence on
   the page against those literals and against the module.
2. With a counted shift, utilisation and efficiency are the two different ratios and are said apart; the loading
   is the target's — `capacityThree.test.ts` (28,000 → 58% / 91%; 20,000 above the sheet); `line-capacity.mjs` 17c.
3. The shortfall is priced only from the line's contribution and "if it cannot be made up"; with none given the
   packs are still said and the missing input named — `capacityThree.test.ts`; `line-capacity.mjs` 17c (before and
   after the margin is given).
4. No shifts, breaks not said, no count, no changeover, planned minutes beyond the window, several lines feeding
   one place: each said or nothing, never a figure invented — `capacityThree.test.ts`; `line-capacity.mjs` 17a.
5. The count's loss count opens from the block — `line-capacity.mjs` 17c.
6. The paper carries the line, downloaded and read back against the counted case's literal and the module's `paper` —
   `line-capacity.mjs` 17d; and a product page already at one page stays at one page — `list-paper.mjs` 1.
7. On a phone nothing is off the side — `line-capacity.mjs` 17e.
8. Existing behaviour unchanged: A shift's table and sentences are untouched (section 7 of the same script still
   passes) and no record changed (no migration).
Not yet proved: a week's design (24 × 7) and an extra shift's worth against its labour (FC-048); the paper's line on a
product page that is already full to its one page (it is left to the screen there, by design).

## 12. Maintainability
`src/tools/linebalance/capacityThree.ts` (pure) beside `capacity.ts`'s `shiftCapacity`; the page block in
`ShiftCapacity.tsx`; the paper's in `capacityPaper.ts` / `capacityPaperPdf.ts`; the count read by
`countedShiftOf`. The week and the factory across lines (FC-048) build on the same rows. `src/lib/ie/mix.ts`'s
`threeNumbers` stays as the week-level arithmetic (tested), not a second source for the shift.
