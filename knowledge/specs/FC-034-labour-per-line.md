# FC-034 part 3 — Line capacity: people and rate for each line

**Catalogue:** FC-034 (Line capacity). **Knowledge:** `docs/CAPACITY.md`, `knowledge/MONEY.md` (labour cost a unit =
people × hourly cost ÷ good units an hour — lean accounting's labour cost per unit). **Asked for:** Rowland, 5 November —
*"Capacity is confusing when doing more than 1 line … unsure if I put in 2 people or 1 person and it's automated that
every line is the same … 2a this is what labour is required and rates in that machine and people then do line 2b …
then I can say they merge at this point … I'm questioning the math"*; then *"rate shown independently, they could be
different … people, rate same per line, they could be different."* **Status:** specified and built 5 November.

## 1. Purpose
With several lines feeding one place, labour was ONE number for the product (people on the line, one rate), taken from what
was typed, else the line standard's head count, else the line's crew — never from the stations, never per line. The
sentence it lets one side say to the other: **"Line 2a has 3 people at £14 an hour, Line 2b has 2 at £12, the wrapper after
the merge has 1 at £14 — £90 an hour, 4.5p a pack."**

**Scope.** (1) Each line, and the part after the lines merge, has its own *people* and its own *£ an hour*, each shown and
edited on its own; none is copied from another. (2) With nothing typed, a part's people are the people in its stations (the
crews of its stations of people) — the stations are the one source, so it cannot go stale. (3) The total people, the £ an
hour and the cost a pack are the sums of the parts. (4) Each line's cost a pack on what it sends is said beside its
subtotal. (5) Records without per-line labour read exactly as before. **Not in this build:** a rate per person inside a
station; a what-if's labour with different rates per line (it uses the blended rate — said).

## 2. Users and scenarios
The engineer typing two lines that merge at a wrapper. (1) 2a: 3 people at £14; 2b: 2 people at £12; wrapper after the
merge: 1 person at £14. (2) The same lines with nothing typed: people read off the stations. (3) An old record: unchanged.

## 3. Method selection
**Established · assumed · chosen.** *Established:* labour cost a unit = Σ (people × hourly cost) ÷ good units an hour. *Assumed:*
the people paid are the people typed or placed; paid by the hour whatever the line makes (as the existing model).
*Chosen:* per-line mode is explicit (a button, "Count each line separately"), never switched on by a guess; a part's people
typed override the stations; the rate falls back to the product's default rate, then the line's own (wage × on-costs).

## 4. Inputs
Per line and for the shared part, both optional: people (≥ 0) and £ an hour (> 0). One default £ an hour for any part
without its own. Stored on the lane (`Lane.labour`), the shared part (`Capacity.labourShared`), the default
(`Capacity.labour.ratePerHour`) — inside the capacity's one jsonb; no column, no sync change.

## 5. Data suitability
A part with people and no rate (own, default or line) is named, and the cost waits — never an invented rate. A part with
no people at all (nobody typed, no station of people) counts 0 and says so.

## 6. Calculations
`people = Σ pᵢ`; `perHour = Σ pᵢ·rᵢ`; blended rate `= perHour / people` (so every existing sum, which takes people × rate,
reads the same £ an hour); `perPack = perHour / (good output an hour × 60)`; a line's own `perPack = its perHour / (its good
output × 60)`. **Independent worked case:** 2a 3 × £14 = £42; 2b 2 × £12 = £24; shared 1 × £14 = £14 → 6 people, £80 an hour
(blended £13.333); the lines send 40 + 30 = 70 a minute → 4,200 an hour → £0.019 048 a pack (1.9p); 2a alone: £42 ÷ (40 × 60 =
2,400) = 1.75p; 2b: £24 ÷ 1,800 = 1.333p. Same-rate check: all at £14 with 6 people = £84 an hour.

## 7. Outputs
**The report.** The paper's labour line gains, after the total sentence, one sentence per part: "Line A: 3 people × £14 = £42 an hour,
1.75p a pack; Line B: …; after the lines merge: …". Nothing else on the paper moves.

## 8. Manufacturing usability
Phone: one block per line (name, People, £ an hour, subtotal), 44 px boxes, nothing off the side. A part's placeholder
shows what it would read as (the stations' people; the default rate) and where it comes from.

## 9. Failure handling
No rate anywhere: named per part. No people: 0 and said. A single line or a lone chain: unchanged page.

## 10. Integration
`labourInputs` (the one reader) returns the totals, the blended rate and the `parts`; the page, the bottleneck cost, one more
person, the paper, the line standard's money and the Theory of Constraints board all read it unchanged. "Make it N at …" and
"Put in the crews" keep a typed part's people in step with the stations (`labourAfter`). Access: `can.edit`.

## 11. Verification
Unit: `src/tools/linebalance/__tests__/labourPerLine.test.ts` (the case in §6, stations-read people, default rate, missing
rate, legacy record unchanged, `labourAfter`). Acceptance: `scripts/acceptance/labour-per-line.mjs`.

**Acceptance criteria.**
1. The §6 case equals the hand-worked figures — *proved by* `labourPerLine.test.ts`.
2. A record with no per-line labour reads as before — `labourPerLine.test.ts` and the existing capacity tests.
3. Counting each line separately shows a block per line and the shared part, each edited alone; changing 2b's rate moves
   only 2b's subtotal and the total — `labour-per-line.mjs`.
4. The sentence and per-line pack costs on the page equal the module's — `labour-per-line.mjs`.
5. The paper carries the per-part sentence — `labour-per-line.mjs` (read back).
6. The phone: nothing off the side, 44 px — `labour-per-line.mjs`.
Not yet proved: the full gate and paper parity.

## 12. Maintainability
One reader (`labourInputs`), one place a typed part follows the stations (`labourAfter`), the words in `labourPartsSays`.
