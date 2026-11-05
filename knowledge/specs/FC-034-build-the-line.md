# FC-034 part 6 — Line capacity: building the line, redesigned (slice A: the station card)

**Catalogue:** FC-034 (Line capacity). **Knowledge:** `docs/CAPACITY.md`; Goldratt (a station receives what the one before gives it and has its own work to do); work study (extra handling time added to the cycle, rest as an allowance on top — Kanawaty, ILO). **Asked for:** Rowland, 5 November — *"the user interface is garbage … how many in time, how long does it take, running what %, good % passed, where it came from, the date, stops logged — what's that got to do with anything … the basket receives from them 8.6 seconds, then it asks me how long one takes — well, you've just told me; anything extra I add in the extra time bit … I'm not a designer, you are: my designer, my architect, my engineer."* **Status:** slice A specified and built 5 November; slices B–C below are designed, not built.

## 1. Purpose
Setting up a line took a 5,000 px page and a station card of fourteen controls, several of them two ways of asking one thing. The sentence it must let the engineer say: **"The palletiser gets a basket every 5.1 s, does it in 5.6 s plus 10 s extra, so it holds the line back — make it 4 people."** The design is *four questions a station is ever asked*, said in the words of the floor:
1. **What is it?** — a name, a machine or a person.
2. **What does it count, and how many of the one before make one?** — "baskets · 1 basket = 6 units".
3. **How fast?** — a machine: *80 units a minute*; a person: *takes 5.6 seconds for 1 basket*. With **"Same pace as it arrives — 5.1 s"** one tap away, because what reaches a station is worked out already.
4. **Extra time?** — *10 seconds for every 1 basket* (handling, taking it away), always on the card, never behind an Add.
And one more for a person or a crew: **how many**. Everything else — running %, good %, rest allowance, how the speed is known, where it came from, the machine name its stops are logged under, what can collect after it — is **More detail**, closed.

**Scope (slice A).** The open station card: four questions + how many, a verdict first (keeps up / holds the line back, with *Make it N people*), the arrival second and labelled as worked out; **More detail** closed; the closed card one line (*5.6 s a basket · 1 person*, a % only where it is not 100); the speed said one way at a time (*Say it as a rate / as a time* a small link, not two big chips); *Timed per* only where it is already set. Also: the products of a line keep **the same on every line** (a product view no longer unlinks the lines — Rowland's "replica slower" was a twin edited alone); a shared feed is **opt-in under More** and an empty one is dropped, never left nameless. **Slice B (designed):** the line's set-up as one row (*Lines · join after · target*), the reading blocks (V, sheet, cost, shift, walk) as tabs. **Slice C (designed):** the map as the editor — tap a box to edit, ＋ between boxes to add.

## 2. Users and scenarios
The engineer building a line from the floor on a phone. (1) Bagger 80, P160 70, a palletiser who gets a basket every 5.1 s: the card says so, offers *Same pace as it arrives*, they add 10 s extra. (2) A second line the same: edited once, both change. (3) Another product: its palletiser edited once, both lines follow.

## 3. Method selection
**Established · assumed · chosen.** *Established:* the speed of a station is the reciprocal of its cycle; extra handling time adds to the cycle before the rest allowance; what arrives is the slowest upstream capacity put into the station's unit (existing `analyseChain`). *Assumed:* none new. *Chosen:* "same pace as it arrives" sets the station's own time to the arrival interval — an opt-in tap, never silent; the extra time is per unit of the station's own unit unless "every N" is changed; hidden fields keep their values and their effect.

## 4. Inputs
No new field: the same station fields (`rate`, `cycleSec`, `moveSec`, `moveEvery`, `crew`, `runningPct`, `goodPct`, `allowancePct`, `source`, `note`, `asset`, `bufferAfter`, `speedIn`).

## 5. Data suitability
A station with no speed says "no speed yet" on its closed card and in its verdict. "Same pace as it arrives" is offered only when something arrives (a station before it that is counted).

## 6. Calculations
Unchanged (`perMinute`, `planPerMinute`, `analyse`). **Independent case:** a palletiser counting baskets of 6 units, 5.6 s a basket + 10 s extra a basket → 15.6 s → 3.846 baskets a minute → 23.08 units a minute; the same with "same pace as it arrives" (5.1 s) and 10 s extra → 15.1 s → 3.974 → 23.84 units a minute.

## 7. Outputs
The card as above, on desk and phone. **The report.** Nothing on the paper changes in slice A (the same figures, said the same way); the card's one-line summary is not printed.

## 8. Manufacturing usability
Phone first: the open card is about two screens, not five; boxes 44 px; nothing off the side.

## 9. Failure handling
Unchanged; a station whose chain breaks says why in its verdict.

## 10. Integration
`StationCard` in `CapacityPanel` reads the arrival from the result (`arrivals`) for the one-tap pace. No record change.

## 11. Verification
Unit: `src/tools/linebalance/__tests__/stationCard.test.ts` (the §6 case; the arrival interval offered). Acceptance: `scripts/acceptance/build-the-line.mjs`, and the existing capacity scripts updated to the new controls.

**Acceptance criteria.**
1. §6's figures equal the module's — *proved by* `stationCard.test.ts`.
2. An open station shows the four questions and *how many*, and none of running %, good %, rest allowance, source, note or stops-log until **More detail** is opened — `build-the-line.mjs`.
3. *Same pace as it arrives* sets the station's time to the arrival interval and the verdict follows — `build-the-line.mjs`.
4. The extra time is a visible pair of boxes, kept and read by the sums — `build-the-line.mjs`.
5. Two lines the same: one edit changes both, as run and inside a product — `build-the-line.mjs`.
6. No empty feed is left behind; the feed is offered under More — `build-the-line.mjs`.
7. The phone: nothing off the side, controls 44 px — `build-the-line.mjs`.
Not yet proved: the full gate and paper parity.

## 12. Maintainability
One card; the secondary fields in one closed fold; the verdict words stay `paceSays`'.
