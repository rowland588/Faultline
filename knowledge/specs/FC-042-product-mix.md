# FC-042 — Product mix at the constraint: throughput per constraint minute

**Catalogue:** FC-042 (reads FC-038 the constraint and the mirage — built — and FC-190 contribution a pack —
built; the week's sequence and its changeovers are FC-070 and FC-180, not built). **Knowledge:**
`knowledge/methods/capacity/throughput-accounting.md` (full, textbook), `docs/CAPACITY.md` §7,
`knowledge/MONEY.md` §4 (FC-042: causation **T**, throughput a constraint minute). **Asked for:** the catalogue's
problem — *"the constraint cannot make everything asked and the mix is chosen by habit"*; `docs/METHODS.md` §11,
Theory of Constraints, *Exploit it* (FC-042 part-built); `docs/BLUEPRINT.md` §6 says the mix "says money now" —
untrue until this (docs/OPEN.md). **Status:** specified and built 31 October (branch `m5-toc`); the one new
input — a price and materials a pack on each product — is typed where the product's orders already are, kept in
the product's Line capacity document (no column).

## 1. Purpose
When the line is full, which product first? Not the one with the biggest margin a pack — the one that earns most
per **minute of the constraint** (throughput a pack × packs a constraint minute). It ranks the line's products
that way, fills the week's constraint minutes in that order, and says what is left unmade by name and in
money, and what a constraint minute is worth — the figure every stop, changeover and speed loss on that line is
then priced with. The sentence it lets the planner say to the sales side that they could not say before: *"Snack
250 g earns £36 a constraint minute, Standard £30, Family 1.5 kg £24 — Snack first. The week is full at 150%;
60,000 Family unmade, worth £36,000. Run by margin a pack instead and the week earns £81,000 not £96,000."*

**Scope.** On the line's capacity panel (the Line capacity list, filtered to a line — the same panel as *Will next
week's orders fit?*): the products that have a Line capacity ranked by throughput per constraint minute; the
week's constraint minutes filled in that order up to each product's orders; unmade by name and in money; the
week's throughput; the same week by margin a pack (the habit) and what the ranking earns beyond it; the value of a
minute lost and gained at the constraint; two boxes a product — **price a pack** and **materials a pack** — typed
where the orders are. On the panel's "The week, to send" and the line's papers (the brief), once a product has
its own price. **Not here:** the changeovers between products taken off the week (the sequence's job: FC-070,
FC-180); shelf-life or customer-commitment constraints; a product bought in or made elsewhere (a decision, said
by the ranking only); several constraints; a mix across lines (FC-048); the week's orders themselves (FC-040's,
already typed there).

## 2. Users and scenarios
The ops lead and planner on a full week; the commercial lead being asked to squeeze in an order. Desk and phone.
Food first: pack sizes competing for one filler in peak season; a promotion's volume against the regular range.

## 3. Method selection
Throughput accounting's product-mix rule (Goldratt and Cox, *The Goal*; Goldratt, *The Haystack Syndrome*;
Corbett, *Throughput Accounting*; Noreen, Smith and Mackey): rank by T per constraint minute, fill the
constraint, the rest does not change with the mix in the week. Alternative: ranking by margin a pack (the habit,
shown beside it so the difference is seen). It refuses to rank what has no speed, orders or contribution (said
which), and refuses to invent a margin.

**Established · assumed · chosen.**
- *Established* (the sources above; Martin's worked problem in `docs/CAPACITY.md` §7: $235 at 15 min = $15.67 a
  minute beats $300 at 30 min = $10.00): throughput a unit = price less truly variable cost (materials and
  packaging; never labour or overhead); T per constraint minute = T × units a constraint minute; fill in rank order
  up to each demand; a minute lost at the constraint costs what the marginal product earns a minute; away from
  the constraint a minute costs only labour. Greedy by T per minute is optimal for a fractional fill (checked by
  brute force over every order in `cases-capacity-three-mix.py`).
- *Assumed*, and said: the "constraint minute" is a minute of the line's running week, at the product's own good
  pace (a product the line holds at another station is still run at its pace — the minute is the line's); orders
  are the panel's "next week's orders"; the week's minutes are the line's SMED running pattern, else the planned
  hours on a product's capacity — not known, and said, otherwise.
- *Chosen:* **products are the line's Line capacity products** (no new record); **price and materials are typed
  on the product's Line capacity document** (`pricePerPack`, `materialsPerPack`, optional, in its jsonb), the
  line's materials a pack standing in for a product's own, the line's margin a pack for both when nothing is
  typed — **said**, with the ranking then by speed alone (every product carries the same margin) and the note
  saying so; **a minute lost is priced only while the week is full** (something is unmade) — otherwise "not
  output lost yet", the mirage rule; **changeovers between products are not taken off the week**, said as not
  done; the habit comparison is by margin a pack, the commonest habit. To be agreed by Rowland on walking it.
- *Money line (MONEY.md §4):* causation **T**; inputs price and materials a product (or the line's margin a
  pack); when missing: *"Give the line a margin a pack (Set up the line), or each product its price and
  materials, to rank on what a minute earns"* — never a figure invented, nothing blocked.

## 4. Inputs
Per product on the panel: **price a pack** (£, optional), **materials a pack** (£, optional) — typed beside its
orders, saved on its Line capacity with Undo, the owner or the job's people may change them. Read, not asked: the
product's speed (its Line capacity's good packs a minute), its orders (`demandPerWeek`), the line's margin and
materials a pack, the line's week (SMED running pattern, else planned hours). Validation: numbers ≥ 0; a price
not above its materials is not a contribution and the line's margin stands in.

## 5. Data suitability
Needs at least one product with a speed, orders and a contribution to rank; a single product has nothing to
rank against (the week is still filled). The week's minutes unknown → nothing is filled and the line says how to
give them. A product without orders, speed or contribution is listed as left out with the reason.

## 6. Calculations
For each product p: T_p = price − materials (else the line's margin a pack); r_p = good packs a constraint minute
(the product's capacity `goodOut`); D_p = orders a week; per-minute_p = T_p × r_p; minutes_p = D_p ÷ r_p. Rank by
per-minute; give each, in order, min(left, minutes_p); made_p = D_p when it had all its minutes else
⌊given × r_p⌋; unmade_p = D_p − made_p; throughput = Σ made_p × T_p; unmade worth = Σ unmade_p × T_p. A minute
lost = per-minute of the last product given minutes (only if something is unmade); a minute gained = per-minute
of the first product with packs unmade. The habit = the same week filled in descending T_p; the ranking earns
throughput − habit.

Independent cases (`scripts/knowledge/cases-capacity-three-mix.py`; unit tests `capacityMix.test.ts`,
`mix.test.ts`): three products over 3,000 min — Snack £0.12 × 300 = £36, Standard £0.25 × 120 = £30, Family £0.60 ×
40 = £24 (the reverse of margin a pack), needing 1,000 + 2,000 + 1,500 = 4,500 min (150%): Snack and Standard made
whole, 60,000 Family unmade (£36,000), throughput £96,000 against the habit's £81,000 (£15,000 more), a minute lost
£30 and gained £24; four products in 1,200 min: King Edward and Maris whole, Tesco 29,333 of 45,000, Baby 1 kg none,
£50,793.23; Martin's $15.67 against $10.00; the space of all six orders by brute force.

## 7. Outputs
A ranked list (rank · product · £ a constraint minute · minutes needed · made · unmade with its worth); the sentence;
the money sentences (week's throughput, the habit, unmade worth, a minute lost and gained — or "the week has
room"); what is left out and why; what is missing and where to give it; the two boxes a product.

**The report.** The line's brief — *The week, to send*, and the Line capacity papers' front (`weeksFor`) — gains the
ranking sentence and its money lines once a product has its own price (so a line that has not given it prints what
it printed before); the same module as the screen (`capacityMix`, read by `readLine`). Purpose and context: the
line and the week. Data: the products' speeds, orders, prices and materials as typed or stood in (said). Results:
as the screen. Limits: the notes. Formats: the PDF Line capacity already offers.

## 8. Manufacturing usability
Two boxes a product, beside the orders already typed there; the answer is a ranked list and one sentence.
Phone: the list stacks, nothing off the side. Neutral colour; an unmade row is amber (waiting on a decision),
never red.

## 9. Failure handling
No product with a Line capacity: the block is absent. A product with no speed / orders / contribution: left out and
named. Only the line's margin: ranked by speed alone, said. No week: nothing filled, said how to give it. Week with
room: everything made, a minute lost "not output lost yet". A price below materials: the line's margin stands in.
A client reads and changes nothing.

## 10. Integration
Reads: the line's products (`Standard.capacity`), the workspace's margin and materials, its SMED's running
pattern. Writes: `pricePerPack` and `materialsPerPack` inside the product's `capacity` jsonb — **no column, no
migration** (the mapper passes `capacity` whole, as it does `demandPerWeek`). Shows where its parent shows: the
line's capacity panel, the panel's brief, the Line capacity papers' front. Access: the owner, or the job's people
(`useAccess`), as the orders are. PAGES.md: the panel gains the block.

## 11. Verification
Unit tests on the independent cases; the acceptance script `scripts/acceptance/line-capacity.mjs` (section 18).

**Acceptance criteria.**
1. The ranking is by T per constraint minute and reverses the margin a pack where the case does — `mix.test.ts`,
   `capacityMix.test.ts`; `line-capacity.mjs` 18b reads the rows on the page against the case's literals.
2. The week is filled in that order; the unmade named with its worth; the sentence the module's —
   `capacityMix.test.ts`; `line-capacity.mjs` 18b.
3. The money: throughput, the habit's difference, the unmade worth, a minute lost and gained — and "the week has
   room" without a priced loss — `capacityMix.test.ts`; `line-capacity.mjs` 18b and 18e.
4. Missing inputs named and nothing invented: no margin, no orders, no speed, no week, only the line's margin —
   `capacityMix.test.ts`; `line-capacity.mjs` 18a.
5. The price and materials typed on the page are kept after a reload and move the ranking —
   `line-capacity.mjs` 18b and 18c.
6. The brief and the paper carry the ranking once a product has its price, and say nothing new before —
   `line-capacity.mjs` 18d.
7. On a phone nothing is off the side — `line-capacity.mjs` 18f.
8. Existing behaviour unchanged: "Will next week's orders fit?" and the rest of the panel untouched; `mix.ts`'s
   earlier tests unchanged and passing; no record or column changed.
Not yet proved: the changeovers between products taken off the week (FC-070/FC-180); a mix across lines (FC-048).

## 12. Maintainability
Arithmetic in `src/lib/ie/mix.ts` (extended, tests kept); the line-level reading and the money sentences in
`src/tools/linebalance/capacityMix.ts`; read once by `lib/lineRead` for the screen and the paper; the view in
`ui/LineCapacityHero.tsx`. Sequence-aware weeks (FC-070/FC-180) and a mix across lines (FC-048) build on `mixOfLine`.
