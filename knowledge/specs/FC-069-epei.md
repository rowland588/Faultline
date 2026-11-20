# FC-069 — Changeover interval: every product every interval (EPEI) — the specification

**Catalogue:** FC-069 (a mode of FC-068 SMED) · **Knowledge:** `lean.heijunka-epei` (full, textbook), `changeover.smed`
(full, textbook) · **Asked for:** Rowland, 20 November 2026 — *"Finish all of the partly made tools."* The interval was
worked out inside SMED since October (`docs/TOOLKIT.md` tool 6, the toolkit's proof 450 − 300 = 150 free) without a
specification, an acceptance check or the stock it implies · **Status:** built (branch `agent2`, 20 November 2026).

## 1. Purpose
How often can this line make every product it runs — and what does the SMED's shorter changeover allow? The interval
turns a changeover's minutes into the planner's question: shorter changeovers bought nothing until the products run
more often and the stock gets smaller. The sentence it lets the ops lead say to the planner: *"Every product every 1.9
days today; with the changeover we have planned, every 1.7 — and £1,116 less stock tied up, if we run them that often."*

**Scope.** On a SMED study, under *How often can each product run?* and on its paper:
- the products the line runs, each with what the customer takes **a day the line runs or a week** (a week divided by
  the line's own days a week, asked — never assumed), the line's rate on it (offered from its line standard) or its
  minutes a day typed;
- **the changeover into each product**: typed, offered from the agreed changeover on its line standard, or — absent —
  this SMED's own minutes, said so;
- the interval **now**, **separated** (the external work done while the line runs) and **as planned** (the SMED's
  furthest planned rung) — the SMED's own rungs answer "what does cutting the changeover allow";
- what a daily interval needs;
- **the stock the interval needs** (each product's run size, its average cycle stock) and, in money, what it ties up
  at each product's typed cost a pack and what carrying it costs at a typed carrying rate a year;
- the changeovers' minutes a day at the interval, and the crew's time in money from the line's own cost settings.

Deliberately not: the levelled day and its pitch slots (FC-011 Heijunka box); the week's schedule (FC-179, which
does not read the interval yet); the economic batch size that trades set-up against holding (FC-182, left out on
purpose); the best order of the products (FC-070); safety stock (FC-183); changeovers by direction (a from–to matrix —
FC-070's). The screen and the paper say the interval is "at most this often".

## 2. Users and scenarios
The ops lead or CI engineer at a desk after a SMED, with the planner; on a phone at the line to list the products.
- **A pack-size wheel on a biscuit line** (the record's week): one shift of 7.5 h, five days, four products taking
  72,000 · 38,400 · 21,600 · 12,000 packs a week at 100 · 80 · 60 · 50 a minute; changeovers into them 35, 35, 50
  (this SMED, Oat biscuits → Ginger snaps) and 50 minutes. Every product every 1.9 days; separated 1.8; planned 1.7.
- **A potato packing line** (the toolkit's case): five products at 42 min, 150 min a day free — every 1.4 days, 0.9
  once the external work is done outside.
- A product added with no demand yet, a week's demand before the line's days are said, a day with no time free.

## 3. Method selection
EPEI (Smalley 2004; Rother & Shook 1999) answers *how often* from the time the demand leaves free and the changeovers
one full cycle needs. The alternatives in the record: the economic trade of set-up against holding → FC-182 (left
out on purpose); the order within the cycle → FC-070; runners, repeaters and strangers → FC-181. The interval is
said for a **common cycle** (every product once an interval), which is EPEI's own definition; a product made more
often than others is the heijunka box's (FC-011). It refuses to say an interval when a product's run time is missing,
when the line's day is not said, or when no time is free.

**Established · assumed · chosen.**
- *Established:* run time a day = demand a day ÷ the rate; free = the line's running minutes a day − Σ run times;
  **EPEI = Σ changeover into each product (one of each) ÷ free**, in running days (`lean.heijunka-epei`; Smalley 2004).
  The record's week: 170 ÷ 450 = 0.38 weeks = 1.89 days; per running day 170 ÷ 90 = 1.89 (`cases-lean.py`,
  `cases-smed-epei-cleandown.py` E1). Cut the changeovers by a share s and the interval falls by the same share.
- *Established:* the stock of a common cycle — each product made once an interval T at its rate P against demand d:
  a run makes d × T, the stock peaks at d × T × (1 − d/P) and averages half the peak (Silver, Pyke & Peterson 1998, the
  common-cycle approach; Hopp & Spearman 2008, the EPQ's cycle stock). d/P is the product's share of the line's
  running day (its run minutes ÷ the line's minutes). The record's "about half an interval's demand" is this without
  the rate term — its upper bound; the record now says both. Safety stock is not in it (FC-183).
- *Established (money, `knowledge/MONEY.md` FC-069 — C against H):* stock tied up = average packs × cost a pack;
  carrying it a year = tied up × the carrying rate (H, `cost.inventory-carrying-cost`); the changeovers' minutes a day at
  the interval × the line's £ an hour (L, `lib/cost` labourPerHour — crew × wage × on-costs). At any interval it allows,
  one cycle's changeovers every T days take exactly the free minutes a day (Σco ÷ T = free) — so the SMED is banked as
  less stock when the products run more often, or as time when they do not (the SMED record: "shortening changeovers
  then not changing more often banks nothing").
- *Assumed:* the free time holds nothing else — unplanned stops eat the same spare, so the interval in practice is
  longer (said: "at most this often"); demand is steady across the line's running days; stock carried over days the
  line does not run is not counted; a product with no changeover of its own changes over in this SMED's minutes (said,
  with how many).
- *Chosen (Faultline's, conservative, for Rowland to confirm):* a week's demand is divided by the **line's own days a
  week** from *How the line runs* and is never divided by a guessed five or seven; the stock is said at the interval
  now and as planned only (no arbitrary halving — the SMED's own plan is the reduction the method justifies); a total
  in pounds is said only when **every** product has a cost a pack — a partial sum is never labelled a total, the
  products without one are named; the carrying rate has no default (MONEY.md rule 5: a range is never used as a
  number); no contribution is priced — the interval is worked in the time left after the demand, so no packs are short.

## 4. Inputs
Per product (the sheet *The products run on the line*): its name; **takes** a number with **a day** (a day the line
runs) or **a week**; the **rate**, a minute (offered from its line standard's target, said so); **or minutes a day**
typed; **changeover into it**, minutes (offered from the agreed changeover on its line standard, said so; blank = this
SMED's); **cost a pack**, £ (optional). On the study: **carrying rate a year**, % (optional). Read, never asked again:
the line's minutes a day and days a week (*How the line runs*: shifts less the breaks the line stops for); this SMED's
minutes as timed, separated and as planned; the line's crew, wage and on-costs. All optional; a box written when the
sheet is saved; a number that is not a positive number is not kept.

## 5. Data suitability
Two products at least (one product has no interval). Every product needs a run time; the line's minutes a day; a week's
demand needs the line's days a week; at least one element of the SMED timed. Each missing piece is named in a sentence.
No time free (the run fills the day) is said in red with the minutes.

## 6. Calculations
For each product i: dᵢ = takes ÷ (1 for a day, the line's days a week for a week); runᵢ = dᵢ ÷ rateᵢ, else typed;
coᵢ(rung) = its own minutes, else this SMED's elapsed at the rung (now · separated · planned). free = avail − Σ runᵢ;
T(rung) = Σ coᵢ(rung) ÷ free; a daily interval needs Σ co ≤ free (with every product on this SMED's minutes: a
changeover of free ÷ n or less). Stock at T: lotᵢ = dᵢ T; peakᵢ = lotᵢ (1 − runᵢ ÷ avail); averageᵢ = peakᵢ ÷ 2;
tied up = Σ averageᵢ × costᵢ; a year carried = tied up × rate. Changeovers a day = free; the crew's time = free ÷ 60 ×
£/h. Days to one decimal, packs whole, pounds whole.

**Independent cases** (`scripts/knowledge/cases-smed-epei-cleandown.py`): **E1** the record's week — free 90, cycle
170 → 1.8889 days; separated (C at 40) 1.7778; converted (C at 30) 1.6667; halved 0.9444. **E2** the stock at 1.8889
days — A 27,200 a run, average 9,248; B 5,706.0; C 3,427.2; D 2,024.9; 20,406 packs, £9,485.55 at 40p · 55p · 30p ·
80p, £1,897.11 a year at 20%; converted: 18,005 packs, £8,369.60, £1,115.95 less; the crew's 90 min a day at Line 7's
£75.40 an hour = £113.10. **E3** the toolkit's case (unchanged): 210 ÷ 150 = 1.4, 135 ÷ 150 = 0.9, 30 min for daily.

## 7. Outputs
On screen and on paper, from `src/tools/changeover/changeover.ts` (`intervalFor`, `intervalSays`, `intervalStockSays`,
`intervalRows`):
- the interval sentence — every product on this SMED's minutes: *"Five products at 42 min run every 1.4 days; at 27
  min, every 0.9 — daily."* (as before, the planned rung added when there is one); some with their own: *"Four
  products — 170 min of changeovers a cycle, 1 at this changeover's 50 min — run every 1.9 days; separated, 160 min a
  cycle, every 1.8; as planned, 150 min a cycle, every 1.7 — a daily interval needs one cycle's changeovers in 90 min
  or less."*;
- the stock sentence — *"At every 1.9 days a run of each product makes its demand until the next: 20,406 packs on
  average — £9,486 tied up, £1,897 a year to carry at 20%; as planned, every 1.7 days, 18,005 packs — £8,370, £1,116
  less, if the products run that often. The changeovers take the 90 min a day the demand leaves free at any of these
  intervals — £113 of the crew's time a day; a shorter changeover is banked as less stock when the products run more
  often, or as time when they do not."* — each missing input named in its place;
- a table a product: product · run a day · changeover into it (and where from) · a run makes · stock on average · tied up.
Tones: grey while something is missing; red only for no time free. Nothing claimed beyond "at most this often".

**The report.** The SMED's paper (*SMED — on paper*, `src/lib/studiesPdf.ts` smedLeanBlocks → `changeoverSheet`) and
every paper that carries a SMED as evidence (the client report, the 6M report) print the interval sentence, the stock
sentence and the products' table (`src/lib/report/changeoverTable.ts`) from the same module; nothing missing is made
up; the "at most this often" limit is in the sentence. Read back with pdftotext in `changeover.mjs` section 8.

*The workspace:* the interval sits in SMED's own fold *How often can each product run?* under the grid, the ladder and
the stages (`docs/TOOLS-DESIGN.md` §2 — entry and table after the canvas); the products' table a `.dt` table scrolling in
its box on a phone.

## 8. Manufacturing usability
One sheet lists the products, prefilled from the line's standards and the SMED's two products, rates offered; a row
says its run time as it is typed. Phone first: boxes a thumb's height, the table scrolls sideways in its box.

## 9. Failure handling
Fewer than two products, a product with no run time, no line day, a week's demand with no days a week, nothing timed,
no time free — each said in words, no figure. A product with no cost — named, no £ total. No carrying rate — the tied-up
figure said, the carry not. No crew or wage — the minutes said, "give the line its crew and wage" for the pounds. A
client (read-only access on a project) sees the interval and has no button to change the products.

## 10. Integration
The record: the SMED `ToolStudy` (tool `changeover`) — `facts.products[]` gains three optional fields
(`demandPer`, `changeoverMin`, `pieceCost`) and `facts` one (`carryingRatePerYear`); JSON inside `facts`, no column,
no migration, synced as the facts are. Where it shows: the SMED page and paper; `lib/studyLinks` (the study's one-line
reading and the line's card, *every product every N days*) reads the same `intervalFor`; the client and 6M reports
through `changeoverSheet`. Access: the sheet's button only with `can.edit` on an open study. No new noun.

## 11. Verification
Unit tests `src/tools/changeover/__tests__/epei-cleandown.test.ts` (E1–E3, every missing state, old records) and the
existing `changeover.test.ts` (unchanged sentences). Acceptance: `scripts/acceptance/changeover.mjs` section 8
(`scripts/lib/smedEpeiCleandown.mjs`), desk 1440 and phone 390.

**Acceptance criteria.**
1. E1: free 90, one cycle 170 min, every 1.9 days; separated 1.8; as planned 1.7; the sentence equal to the module —
   `epei-cleandown.test.ts`; `changeover.mjs` 8a.
2. E2: the stock 20,406 packs, £9,486 tied up, £1,897 a year at 20%; as planned 18,005 packs, £8,370, £1,116 less; the
   crew's 90 min a day £113 at Line 7's cost — `epei-cleandown.test.ts`; `changeover.mjs` 8b.
3. E3 and every older sentence unchanged (a product with no changeover of its own uses this SMED's) —
   `changeover.test.ts`; `epei-cleandown.test.ts`.
4. A week's demand with no days a week names the days; typed through the real sheet with *a week*, the line's 5 days
   divide it — `epei-cleandown.test.ts`; `changeover.mjs` 8a.
5. A product with no cost a pack is named and no £ total said; no carrying rate — tied up said, carry not; no crew —
   the pounds asked for — `epei-cleandown.test.ts`; `changeover.mjs` 8b.
6. The changeover into a product offered from its line standard's agreed changeover — `changeover.mjs` 8a.
7. Kept after a reload; the products' table on screen equals `intervalRows` — `changeover.mjs` 8b.
8. The paper (*SMED — on paper*) downloaded and read back carries the interval sentence, the stock sentence and every
   product's row — `changeover.mjs` 8c.
9. Phone (390) and desk (1440): nothing off the side, the sheet's boxes 44 px — `changeover.mjs` 8d.
10. A client changes nothing — `changeover.mjs` 9e.
Not yet proved: a product made more often than others (FC-011); the interval written into the week's schedule (FC-179).

## 12. Maintainability
`src/tools/changeover/changeover.ts` (pure: `intervalOf`, `intervalFor`, `intervalSays`, `intervalStockSays`,
`intervalRows`, `intervalStock`), the sheet `IntervalSheet` and the fold in `ChangeoverScreen.tsx`, the paper's table in
`src/lib/report/changeoverTable.ts`. Left for later, each with its number: the heijunka box and pitch (FC-011), the
interval into the week's schedule (FC-179), changeovers by direction and the best order (FC-070), safety stock (FC-183),
the economic batch (FC-182, left out on purpose).
