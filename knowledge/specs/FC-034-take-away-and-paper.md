# FC-034 part 2 — Line capacity: time to take it away, and the line drawn on the report

**Catalogue:** FC-034 (Line capacity — built; this adds a station's time to take its work away, and puts the page's
drawing on the paper). **Knowledge:** `docs/CAPACITY.md` §1 (a person's speed, plate speed), `knowledge/methods/`
work-study (ILO, Kanawaty — the work content of a cycle includes the handling and the moving of what is made; rest is an
allowance on top of the whole). **Asked for:** Rowland, 4 November — *"the line drawn is brilliant but isn't shown on
the report ... everything in that section, the bars and the line drawn, is almost what the report should look like"*;
*"I have no way to add a transportation time to the flows ... wrapper I need to add the time it takes to take pallets
away, not just do the job, and that could happen at any point when we have a human involved."* **Status:** specified
and built 4 November.

## 1. Purpose
Two gaps on one tool. (1) The page draws the line (each station a box down the page, the bottleneck tagged, what the
line makes against its target) and, beside it, a bar for what each station can do; the paper prints neither, so the
report lacks the picture the person works from. (2) A station is timed on *doing the job*, but a person at the wrapper
also walks the pallet away; that time takes the same hands and holds the line back the same way, and there was nowhere
to put it. The sentence it lets one side say to the other: **"The wrapper does a pallet in 40 s, and 30 s more to take it
away — 70 s in all, 0.86 a minute, not 1.5."**

**Scope.** (1) *Take-away time* on any station — typed in seconds, with how many of the station's own unit it takes
(every pallet, or every 2 pallets) — added to the time of each unit before the rest allowance, so the station's speed,
the bottleneck, the V, the bars, the sheet, the what-ifs, the labour cost and the shift capacity all read it with no
second path; said in words wherever the station's speed is said. Offered on every station (a machine fed or emptied by a
hand; a person), because a human is in it wherever it is typed. (2) The report carries the drawn line and the bars
exactly as the page draws them, from the same model (`capacityFlow`), on the product's page and in the line package.
**Not in this build:** transport between stations as a station of its own (it is a station with a cycle if it needs to be
one); walking distances (the spaghetti diagram, FC-004, measures those); a conveyor's travel time (no hand, no loss of
rate — a delay, not a cost to the rate).

## 2. Users and scenarios
**Who:** the engineer typing a line from the floor. **Scenarios, food first.** (1) *Wrapper and pallets.* A film wrapper
runs a pallet in 40 s; the operator then takes the pallet to the stack, 30 s. Typed once; the line's limit moves. (2) *A
packer who fills a tray and walks it to the pallet every 4th tray.* 8 s a tray, 20 s every 4 trays. (3) *The report.*
The same line, the drawing and the bars, in the paper handed to the client.

## 3. Method selection
Time per unit = work time per unit + take-away time per unit; speed = 60 ÷ that, in the station's own unit; a person's
rest allowance is then taken on the whole (Kanawaty: allowances are a percentage of the work content, handling
included). **Established · assumed · chosen.**
- *Established:* a cycle's work content is the sum of its elements, handling included; speed is the reciprocal of the
  cycle; rest is a percentage on the work content.
- *Assumed:* the hands that take it away are the hands (or the machine's wait) that do the job — the two do not overlap;
  if they overlap, the person types only the part that does not.
- *Chosen:* take-away is per this station's own unit (or per several); it is added before the rest allowance, which stays a
  person's only (a machine has none); it is a *time per trip*, not a distance.

## 4. Inputs
Per station, both optional: seconds to take it away (> 0, ≤ 3,600) and how many of the station's own unit each trip takes
(default 1; > 0). The existing speed and cycle inputs are unchanged.

## 5. Data suitability
A take-away time with no speed typed cannot be added to anything — said ("give the job its speed first"), not
invented. A trip time above an hour is refused. A trip of a fraction of a unit is refused (use seconds per unit).

## 6. Calculations
`secPerUnit = 60 / own + moveSec / moveEvery`; `speed = 60 / secPerUnit` (own = the station's speed in its own unit a
minute, after any "timed per the unit before" conversion); the allowance is then `speed / (1 + allowance)`.
**Independent worked cases** (by hand, before the code): (A) a wrapper 40 s a pallet (1.5 a minute) + 30 s to take it away
→ 70 s → **0.857 143 pallets a minute**; with the 9% ILO rest → 0.786 3. (B) 8 s a tray, 20 s every 4 trays → 8 + 5 = 13 s
→ **4.615 4 trays a minute**. (C) take-away 0, absent or `moveEvery` 0 → the speed unchanged. (D) a palletiser
timed 6 s a basket at 36 baskets a pallet (216 s a pallet, 0.277 8 pallets a minute) with 30 s a pallet taken away →
246 s → **0.243 9 pallets a minute**.

## 7. Outputs
The station's speed (so every sum), its speed words — "a pallet every 40 s + 30 s to take it away" — on the page, the
sheet and the paper, and the sentence for a person: "They take 40 s a pallet, 30 s more to take it away — 70 s with
rest 76 s." **The report.** The product's page gains, under the headline and before the V, *The line drawn*: a box a
station down the page (or a column a line when several feed one place), arrows between, the bottleneck tagged, what the
line makes against its target; and *What each station can do*: a bar a station in the line's unit a minute against what
the line makes and the target — the same model as the screen (`flowModel`, `barGroups`), so the two never part.

## 8. Manufacturing usability
Phone first: the take-away line is folded under the speed — *＋ Add time to take it away* — two boxes, seconds and
"every … pallet(s)", 44 px; nothing off the side. The paper's drawing is laid out by the report engine and is never cut
across a page.

## 9. Failure handling
Seconds ≤ 0 or > 3,600, or a trip of less than one unit: held with the reason, the speed unchanged. A station with no
speed: the box says so. Many lines and a merge: the drawing follows the model (column per line). An empty line: nothing
drawn.

## 10. Integration
The two fields live on the station inside Line capacity's record (`Capacity.stations[]`, in the study's JSON) — no new
record, no column, no sync change. Read by `perMinute`, so `analyse`, `vCurve`, the what-ifs, `labourCost`, the shift and
the line balance link read it unchanged. Shown on the page (the station's speed line, the sentence), the paper (the sheet's
SPEED · HOW KNOWN column, the drawing and bars), the line package's Line capacity section. Access: `can.edit`.

## 11. Verification
Unit: `src/tools/linebalance/__tests__/takeAway.test.ts` (cases A–D, the allowance order, refusals, old records
unchanged) and the existing `capacity` tests. Acceptance: `scripts/acceptance/line-capacity.mjs` (the wrapper typed
through the real boxes) and `scripts/acceptance/capacity-paper-line.mjs` (the paper read back).

**Acceptance criteria.**
1. Cases A–D equal the hand-worked figures — *proved by* `takeAway.test.ts`.
2. A station with no take-away time works exactly as before (every existing capacity test unchanged) — `capacity`
   tests.
3. Typing 30 s on the wrapper moves the limit, the V, the bars and the sentence on the page, and says the time in words
   — `capacity-paper-line.mjs`.
4. The paper carries *The line drawn* and *What each station can do*, in the page's order, and the wrapper's words —
   `capacity-paper-line.mjs` (read back from the PDF).
5. The phone: the folded line opens, 44 px, nothing off the side — `capacity-paper-line.mjs`.
6. The page's drawing and the paper's are one model (`flowModel`) — `takeAway.test.ts`.
Not yet proved: the full gate and the paper-parity comparison.

## 12. Maintainability
One model (`capacityFlow`) for the page and the paper; one place the time is added (`perMinute`); the words in
`capacityWords`.
