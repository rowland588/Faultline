# FC-001 — the value stream map: money on it (24 October) · classifying its steps VA · NE · NV in one tap, and a map that is simple to use (30 October)

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

**Part 2 — classifying the steps, and a simpler page (30 October).** Rowland,
30 October, on the Value stream: *"it doesn't allow me to quickly reference the
activity as VNA, VA, etc !! we must have tools that are ready and functional !!"*;
then, at the stopwatch: *"yes quick letters, I had a stop watch but no ability to
classify the activity, need 3 quick buttons next to the stop watch"*; then, of
the page: *"the value stream map is a very complex UI .. too complex, many
different buttons, not understanding any of them .. simplify"*. A step's value
(`FlowValue` `adds` · `needed` · `waste`, said VA · NE · NV) could only be set in
the step's sheet (open it, choose, Save), and the stopwatch (Walk it) timed
steps but asked for the value "when you are back at a desk".

**Scope of part 2.** (1) Three buttons VA · NE · NV beside the stopwatch: a letter
ends the step being timed *with* its value and starts the next — one tap a step;
a quieter *Next step — not classified*; *Undo the last step* takes back its time,
words and value; a running tally (*3 VA · 1 NE · 2 NV so far*). (2) The same three
buttons, big, at the top of a step's panel on the map, with Back, Next and
*Next unclassified* — so the panel **is** the classify walk (a letter on a step
nobody had classified goes on to the next one nobody has; keys V · E · N and
← → on a desk; it ends on the counts, the % value added and the lead time as the
map's cards say them) — and a one-tap Undo toast. (3) The unclassified said, with
a link into the walk, in the totals band (a card), under what the map says, in
the closing line and on every paper that prints the map (*not classified* in the
step's row, the count above the table, a tile). (4) **The page made simpler**
(the *before* and *after* below): one primary action, one row of controls on
the grid, everything else behind More ▾ or on the step that is open. Left out: a
row of three buttons on every step in a list (it is what made the page busier —
see §3), classifying by drag, a rule that auto-classifies by words, and any change
to what a wait or a store is (NV by definition).

**The map page's controls — before and after (the same count taken by
`scripts/inventory` style enumeration of every visible button, link, chip, tab,
slider and menu in the page, on the seeded Line 2 map, desk 1360 and phone 375).**
Before (main, 30 October): **70 controls in the page** on a 16-step map at 1360 and at 375 — 18 distinct
controls and 52 buttons in the grid. The 18: *More*, *Report*, *Line 7 — smoke test*,
*Line 2 commissioning*, *Change* (where it sits), *Change what it is held against*,
*Today*, *Show only the waste*, *Copy to the future*, *+ Add a step*, *Walk it*, *Who
does it*, *Where*, *Play the journey*, *Speed* (a slider), the wait's link under Used
for, *Unlink*, *Use it for…*. The 52: three rows of squares (Classification, Sequence,
the step's lane square), each square a button opening the same step. Seven buttons
sat in a row above the grid with three words nobody could tell apart (*Today*,
*Walk it*, *Copy to the future*). The step's value could be set only in the step's
sheet (four taps with Save).
After: **28 controls in the page** (−60%) at both widths — 12 distinct plus 16 letter chips
(one button a step): the band's *More*, *Report* and **one primary, *Time the steps***;
where it sits (*Line 7 — smoke test*, *Line 2 commissioning*, *Change* — the shell's, unchanged);
the grid's row (*Who does it*, *Where*, *+ Add a step*); the foot (the wait's link, *Unlink*,
*Use it for…*). Gone from view and kept: *Today* (shown once there is a future), *Show only
the waste*, *Copy to the future*, *Play the journey*, *Speed*, *Change what it is held against*
(all in More ▾ or shown only while in use); *Walk it* (the primary, in plain words); 36
squares that were buttons (the same tap, no longer a second button). Nothing is lost —
the table in §10 says where each went; `value-stream.mjs` 10e finds each in its new place.
A first draft with a three-button row on every step (3 × the steps more buttons — 48 on this
map) was dropped on counting it (§3).

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

**Part 2 — method.** The classification is Rother and Shook's: each step is value-adding
(the customer would pay for it — it changes the product), necessary non-value-adding
(*type one muda*: needed with today's way of working), or non-value-adding (waste,
*type two muda*); *NV* is Rowland's name, *NVA* the one the textbooks use, so the help
text says *NV (non-value adding, NVA)* (`knowledge/methods/lean/value-stream-mapping.md`).

**Established · assumed · chosen (part 2).**
- *Established:* only an operation can add value; a move or a check is NE or NV;
  a wait or a store is NV (the existing rule, `steps.valuesFor`, one function for the
  step's sheet, the panel and the stopwatch). The share that adds value is VA time ÷
  lead time (`flowFigures.pce`); a step nobody has classified keeps its time in the lead
  time but in none of VA · NE · NV, so **the % value added counts only the steps
  classified VA** — the nudge says exactly that, it invents nothing.
- *Chosen (Rowland, 30 October):* letters, not words, on the buttons (VA · NE · NV, with
  the method's hues on the lit one only and the letters always); one tap sets, the same
  tap again clears; Undo for every classification. The stopwatch's steps take the kind
  chosen on its chips — **an operation unless a move or a check is picked** — so a walked
  step is an operation by default and can be VA, NE or NV; picking Move or Check greys
  VA; a wait is typed later and stays NV.
- *Chosen — the simplification (Rowland, 30 October: "too complex ... simplify"):* the
  first draft put three buttons on every step in a new list (a row of 3 × steps buttons);
  counted, that added 48 buttons to a page of 70 — busier than the page it replaced. Chosen instead: **the step's own
  panel is the control** (tap a step: its value in three big buttons; a letter goes on to the
  next step nobody has classified), so the classify walk is not a second thing; the grid's
  letter chips stay the one button a step (state and way in), and the rest of the grid is the
  picture. The walk earns its place only as that panel; there is no separate *Classify the
  steps* button — the nudge's link opens the panel at the first unclassified step.
- *Money:* none — classification has no cost of its own (the waste work's labour a day,
  above, simply follows the classification: every NV step classified adds to it).

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

**Part 2 — inputs.** None new: the step's `value` (existing, optional) and `kind`
(existing; the stopwatch's chip, default operation).

## 5. Data suitability
Labour is said once a waste step has a time and the map a demand; a waste
step with no time is counted as untimed (the sentence says "at least").
Waiting product is said for a wait with a counted queue, or with a wait time
and the demand and available time agreed; a wait with neither is named as
unpriced. Nothing is said for a map with no steps.

**Part 2 — data suitability.** A step with no value is *not classified*, never guessed;
a wait or a store is never asked. A map with no steps says how to start (Time the steps, or
type them in). Steps carried from the map before keep their value until walked again; the
stopwatch walking a carried step again overwrites its value only when a letter is tapped.

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

**Part 2 — calculations.** No new formula. `classCounts`: VA = steps with `valueOf = adds`,
NE = `needed`, NV = `waste` (waits and stores included), unclassified = the rest.
`nextUnclassified(steps, i)`: the first unclassified step after i in journey order, wrapping,
never i itself; none → undefined. Independent cases (hand-worked, `steps.test.ts`
"classifying the steps"): five steps — Load (operation, NE, 60 s), Seal (operation, none, 10 s),
Walk (move, none, 30 s), Hold (wait 300 s), Pack (operation, VA, 20 s): lead 420 s; VA 20 s;
the share 20 ÷ 420 = 4.8%; the 40 s of Seal and Walk in none of the three (380 s = NE 60 + NV
300 + VA 20); classified Seal VA and Walk NV → 2 VA · 1 NE · 2 NV, 30 ÷ 420 = 7.1%.

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

**Part 2 — outputs.** *The report.* Wherever the map prints — its own paper, the client report's
and the 6M report's evidence table, the line report's section (all one `streamBlocks`) —
an unclassified step's row says **not classified** in the value column (a dashed box, the
grid's), and above the table: *"N steps not classified yet — the % value added counts only
the steps classified VA; their time is in the lead time but in none of VA · NE · NV. Steps a,
b and c."*; the tiles gain **Not classified · N steps**; the closing line ends with the same
sentence. A fully classified map prints exactly what it printed before. On screen the
same sentence is under what the map says (with *Classify the steps ›*), a card says
**Not classified**, the closing line ends with it, and a step's panel ends on
*"N steps: a VA · b NE · c NV. x% of the … lead time adds value (…)."* once none is left.

## 8. Manufacturing usability
Two optional boxes on the agreement the lead already fills (demand, hours);
the money appears among the cards the moment a waste step has a time. One
hand, no new screen.

**Part 2 — manufacturing usability.** On the floor: the stopwatch's letters are 64 px tall
full-width buttons (the three in one row, each with its words), the quieter *Next step — not
classified* below; twenty activities are twenty taps. At a desk: tap a step, V · E · N, the next
unclassified is already open. The page: one primary (*Time the steps*), More ▾ (Play the
journey, Show only the waste, Plan the future — copy today's steps, Change what it is held
against, Rename, Delete), Report ▾; on the grid one row of controls (Lanes by, + Add a step,
Today · The future only when a future exists). Plain words: no button says *Walk it*.

## 9. Failure handling
Each missing input named in the card and the sentence, nothing invented; a
client reads the money and cannot agree it; a step's people absent read as
one; a negative or zero cost refused on the form.

**Part 2 — failure handling.** A client sees the letters and the nudge's sentence and no
control; a tap is saved at once through `patchStudy` and offered back with Undo; a letter the
kind may not take (VA on a move) is greyed and ignored; a stopwatch letter before Start is
disabled; Undo the last step in the walk removes a new step (or restores a carried one) with
its value; a step opened that has since been taken off closes the panel.

## 10. Integration
Record: `studies.agreed.map` gains `pieceCost`, `carryingRatePerYear` (JSON,
no migration). Shows where the map's cards show: its page, its paper, the
line report's stream section, the 6M fishbone's offer unchanged. Access
`can.agree`. PAGES.md: the value stream page gains *the money cards*; the
inventory checks them on the seeded line map (seed: cost a piece £0.80, rate
25%; Line 7 has a wage). Smoke unchanged.

**Part 2 — integration.** Record: `FlowStep.value` (existing; no migration). Shows where the map
shows: its page, its paper, the client and 6M reports' evidence tables, the line report's section;
the fishbone's offer of the map's waste follows the classification unchanged (it reads
`valueOf`). `StudyBand` gains two optional parts every tool may use — a `primary` action and
`extra` More ▾ items. PAGES.md: the map's line lists the new shape and what moved where
(§3's table). Access: `can.edit` for every control (a client sees none).

| Before (control) | Now |
|---|---|
| Today (chip) | shown only when a future state exists |
| Show only the waste | More ▾ (an *Only the waste ✕* chip while it is on) |
| Copy to the future | More ▾ — *Plan the future — copy today's steps* |
| + Add a step | one button at the grid's row (and in the empty page) |
| Walk it · Walk it again | the page's primary — *Time the steps* · *Time the steps again* |
| Lanes by Who · Where | unchanged, on the grid's row |
| Play the journey · Speed | More ▾ — *Play the journey*; its bar (Pause · Stop playing · Speed) only while playing |
| Change what it is held against | More ▾ once agreed; a link in its sentence while not |
| the grid's Sequence row and lane squares (buttons) | the same tap, no longer buttons — the letter chips are the one button a step |
| a step's sheet (Change this step, Make it better) | the step's panel, with VA · NE · NV, Back · Next · Next unclassified above them |

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

**Part 2 — acceptance criteria.** (`scripts/acceptance/value-stream.mjs`, story 10; unit tests
`steps.test.ts` "marking a step", "classifying the steps", "the unclassified")
6. `valuesFor`, `tapValue`, `withValue` — the rule once, for the sheet, the panel and the stopwatch (unit).
7. The stopwatch: three steps each ended by a letter (VA · NE · NV) land timed with their value;
   a Move greys VA; Next step — not classified leaves one unclassified; the tally says
   `classCounts`; Undo the last step takes back its value; reload-proof; on the phone the
   letters are ≥ 44 px and nothing is off the side (value-stream.mjs 10a).
8. On the map: tap a step, one letter saves it (reload-proof), the same letter clears it, Undo
   restores it; a wait shows NV with no buttons; a client sees no buttons (10b).
9. The walk: the count text, V · E · N and ← →, Next unclassified, the closing numbers equal
   `classifySummary` (10c).
10. The nudge text, its link into the panel, the card, the closing line; paper read back —
    *not classified* in the row, the count, the tile (10d).
11. The page's controls: the count on first view at least halved, every capability found in its
    new place (10e) and the inventory's entry for the map.
12. Every earlier check of value-stream.mjs, edit-delete, sixm-evidence and line-report unchanged.

## 12. Maintainability
`src/tools/valuestream/steps.ts` gains `flowMoney` and `flowMoneySays`;
`flowLean.ts` the two tiles; `MapScreen.tsx` the boxes and the cards;
`lib/studiesPdf.ts` the sentence and inputs. The next slice: before → after
in money when the future state is walked (`compareFlows`), and shelf life
spent as a share (not money) for chilled lines.

**Part 2 — maintainability.** `steps.ts` holds the rule and the words (`valuesFor`, `tapValue`,
`withValue`, `classCounts`, `notClassifiedWords`, `nextUnclassified`, `walkCount`, `classifySummary`);
`ValueStream.tsx` the buttons (`ValueButtons`), the grid and the step panel; `MapScreen.tsx` the
page; `lib/report/streamTable.ts` the paper. A tool that wants the page-header shape uses
`StudyBand`'s `primary` and `extra`. Not yet: before → after in the classification (what moved
from NV to NE when the future state was planned), classifying from the filmed walk (FC-081).
