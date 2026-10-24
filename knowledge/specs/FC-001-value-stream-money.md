# FC-001 — money on the value stream map: waste work in labour, waiting product tied up and carried

**Catalogue:** FC-001 Value stream map (the money part; the map itself is
available since B1–B4). **Knowledge:** `knowledge/methods/cost/inventory-
carrying-cost.md` (new, 24 October), `knowledge/methods/cost/line-cost-
model.md`, `knowledge/methods/lean/value-stream-mapping.md`, `knowledge/
methods/lean/seven-wastes.md`. **Asked for:** Rowland, 17 October —
*"everything must derive a cost in the entire app"*; `docs/BLUEPRINT.md` §6
(the value stream map: what the waits and waste cost); 24 October — *"only
assign money to already industry standard tools ... research and apply them
but ensure they are flexible, not all costs are available to me in a
factory"*. **Status:** agreed 24 October by that instruction (the methods
the record's, every cost optional), built with this slice.

## 1. Purpose
The map shows the stream's waste as time — lead time against the minutes
that add value. The business pays for that time in two different ways, and
the map now says both: the **labour spent on non-value-adding work** each
day, and the **product waiting** between steps — the money tied up in it and
what carrying it costs a day. So the team can say: *"the re-pack, the jam
clearing and the walk for cases cost £68 a day in labour; £2,900 of product
sits in the QA hold, which costs about £2 a day to carry — start with the
hold."*

**Scope.** Two findings in money on the map's page, paper and tiles: labour
on waste steps a day (the line's rate, the map's demand); product waiting —
pieces at each wait (counted, or by Little's law from the wait time), tied up
at the cost a piece typed on the map, carried at the annual rate typed on the
map. Left out: shelf life spent in waits as money (said as a share in the
record, not priced — no standard prices it); the cost of necessary work
(it is needed; the method does not cost it); a before → after in money
(`compareFlows` stays in time; money follows when the future state is
walked — FC-001's next slice); supermarket and kanban sizing (FC-010).

## 2. Users and scenarios
The line lead walking the stream on a phone; the team in the room with the
map on paper; Rowland with the sponsor putting a figure on a QA hold.
Scenarios: a chilled line's pallets waiting six hours for positive release;
a packing line whose Op 2 walks to stores for flat cases every twenty cases;
a business map with two days of pallets waiting for the lorry.

## 3. Method selection
Lean accounting's value stream costing (Baggaley and Maskell, 2003) treats
every cost of the stream as direct — labour included — so non-value-adding
work is costed as its hours at the stream's labour rate, which is Faultline's
one cost model (`cost.line-cost-model`: the line's wage × on-costs). Waiting
product is inventory; its cost is the carrying cost of operations management
(Silver, Pyke and Peterson; Chopra and Meindl; Hopp and Spearman): the value
held × an annual carrying rate made of capital, storage, service and risk.
Where a queue was not counted, Little's law gives the pieces from the wait
time and the demand (Little, 1961; Hopp and Spearman). Alternatives not
taken: pricing lead time itself (double-counts the waits); charging overhead
a piece (standard costing, which lean accounting rejects); a borrowed
carrying rate (no standard fixes one).

**Established · assumed · chosen.**
- *Established:* labour on a step a day = (cycle ÷ batch) × people × pieces a
  day × rate a second (`lean.seven-wastes`, "time × the line's rate").
- *Established:* carrying cost a day = value held × annual rate ÷ 365
  (`cost.inventory-carrying-cost`); Little's law WIP = throughput × flow time.
- *Assumption:* one cost a piece along the whole stream (said: "at £0.80 a
  piece as typed"); the rate's components are the business's to judge.
- *Chosen (Rowland, 24 October — flexible, every cost optional):* the labour
  rate is read from the line (the one cost model), never typed on the map;
  the cost a piece and the carrying rate a year are typed on the map's
  agreement, each optional; the carrying rate has no default — the form says
  the practitioner range (about 15–35% a year) and what it is made of, and
  waits are said in pounds tied up even before a rate is given. *Chosen:*
  365 days for the daily rate, said on the paper.

## 4. Inputs
On `AgreedMap` (`can.agree`), both optional: **What a piece has cost by the
time it waits (£)** (`pieceCost`, > 0 — "materials at least; more if the work
done so far is counted"); **Carrying rate, a year (%)** (`carryingRatePerYear`,
0–100, "capital, storage, insurance, risk — many businesses sit between 15%
and 35%"). Read, not asked: the line's `labourRatePerHour` and
`labourBurden` (missing: "give the line's wage on its page"); the map's
`demandPerDay` and `availableSecPerDay` (missing: "agree the demand a day");
each step's `cycleSec`, `batch`, `people` (absent: one), `value`, `queue`,
`waitSec`.

## 5. Data suitability
Labour is said once a waste step has a time and the map a demand; a waste
step with no time is counted as untimed (the sentence says "at least").
Waiting product is said for a wait with a counted queue, or with a wait time
and the demand and available time agreed; a wait with neither is named as
unpriced. Nothing is said for a map with no steps.

## 6. Calculations
Symbols: for a waste step, c its cycle seconds, b its batch (1 if absent), p
its people (1 if absent); D the demand a day; A the available seconds a day;
R the labour £ an hour (wage × on-costs); K the cost a piece; r the carrying
rate a year.
- Labour on waste a day: £_w = Σ_waste (c ÷ b) × p × D × R ÷ 3600.
- Pieces waiting at a wait: q if counted; else D × w ÷ A (w its wait seconds).
- Tied up: £_t = Σ pieces × K. Carrying a day: £_c = £_t × r ÷ 365.
- Rounding: £ as `gbpWord` (whole pounds; £1.2k from 1,000); pieces whole.

**Independent cases** (`scripts/knowledge/independent-cases.py`, "money on
the value stream"; unit tests in `src/tools/valuestream/__tests__/steps.test.ts`,
"money"):
1. The seeded line map: waste steps Issue the film (900 s for 9,600, 2
   people), Clear a jam (90 s for 500, 2), Reset the jaw (600 s for 4,800, 2),
   Walk for cases (60 s for 120, 1); D 9,600; R £15 × 1.3 = £19.50 → person-
   seconds a piece 0.1875 + 0.36 + 0.25 + 0.5 = 1.2975; a day 12,456 s =
   3.46 h → £67.47.
2. The QA hold: 6 h wait, D 9,600, A 16 h → 3,600 pieces; K £0.80 → £2,880
   tied up; r 25% → £1.97 a day.
3. A counted queue of 19,200 pallets' pieces at K £0.80 → £15,360 tied up;
   no rate → carrying unsaid, "give the carrying rate".
4. No wage on the line → labour unsaid, "give the line's wage"; waits still
   priced.
5. No demand → labour and Little's-law waits unsaid; a counted queue still
   priced.

## 7. Outputs
- Two cards among the map's cards (the same place its figures live): **Waste
  work** `£67 a day` *labour on 4 non-value-adding steps*; **Waiting
  product** `£2,880` *tied up · £2 a day to carry at 25%* — grey with the
  missing input named when it cannot be said.
- One sentence under what the map says: *"Waste work costs £67 a day in
  labour (4 steps, 3.5 h a day at £19.50). £2,880 of product is waiting
  between steps — £2,880 of it at Pallet waits for QA release — which costs
  about £2 a day to carry at 25% a year."*
- What it does not claim: tied up is working capital, not a loss; the share
  of shelf life spent waiting is not priced.

**The report.** The map's paper (`lib/studiesPdf`, the stream's tiles and
sentence) and the line report carry the two cards as tiles and the sentence,
from the same module; the paper says the inputs: *"In money from: £19.50 an
hour (the line), £0.80 a piece, 25% a year, 365 days."*

## 8. Manufacturing usability
Two optional boxes on the agreement the lead already fills (demand, hours);
the money appears among the cards the moment a waste step has a time. One
hand, no new screen.

## 9. Failure handling
Each missing input named in the card and the sentence, nothing invented; a
client reads the money and cannot agree it; a step's people absent read as
one; a negative or zero cost refused on the form.

## 10. Integration
Record: `studies.agreed.map` gains `pieceCost`, `carryingRatePerYear` (JSON,
no migration). Shows where the map's cards show: its page, its paper, the
line report's stream section, the 6M fishbone's offer unchanged. Access
`can.agree`. PAGES.md: the value stream page gains *the money cards*; the
inventory checks them on the seeded line map (seed: cost a piece £0.80, rate
25%; Line 7 has a wage). Smoke unchanged.

## 11. Verification
Unit tests on the five cases; `scripts/acceptance/value-stream.mjs` gains a
money story; gate line in CLAUDE.md: *"in money (24 October): the waste
steps' labour a day from the line's rate, the product waiting tied up and
carried at the typed cost a piece and rate, a missing input named"*.

**Acceptance criteria.**
1. The five cases — `steps.test.ts` "money" (unit).
2. Agreeing the cost a piece and the rate on the seeded line map shows the
   two cards and the sentence as `flowMoneySays` words them — value-stream.mjs
   money story (a).
3. With no rate the Waiting product card says tied up and names the rate as
   missing; with no wage on the line the Waste work card names the wage — (b).
4. The map's PDF carries both as tiles, the sentence and the inputs — (c).
5. Every existing check of value-stream.mjs, the inventory, paper parity
   elsewhere unchanged.

## 12. Maintainability
`src/tools/valuestream/steps.ts` gains `flowMoney` and `flowMoneySays`;
`flowLean.ts` the two tiles; `MapScreen.tsx` the boxes and the cards;
`lib/studiesPdf.ts` the sentence and inputs. The next slice: before → after
in money when the future state is walked (`compareFlows`), and shelf life
spent as a share (not money) for chilled lines.
