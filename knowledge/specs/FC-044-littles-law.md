# FC-044 — WIP and lead time: Little's law

**Catalogue:** FC-044 (FC-045 utilisation and variability — why a queue is long — is **not built**; FC-001 the value stream map keeps its own money for a wait) · **Knowledge:** `capacity.littles-law` (full, peer-reviewed) · **Asked for:** the catalogue's problem, "product sits in chillers and racks and nobody knows how long" · **Status:** built on `build-calc`. **Written before the code.**

## 1. Purpose
Say how long product waits from what is counted in progress and what flows out — with no stopwatch on every item — or the work in progress a flow needs, or the flow a count fits: *"1,800 trays in progress at 600 an hour is 3 hours of lead time — each one spends that long, on average, between going in and coming out. That is 6.3% of its shelf life spent waiting."* — and what that stock is worth.

**Scope.** Little's law L = λW solved for the one not known, over **one boundary** (a chiller, a rack, a line): the lead time in the floor's words, halving what it would do, the share of a shelf life spent waiting (when the life is given), and the stock in progress and holding cost (when a unit cost and a rate are given). It asks whether the pile grew or shrank over the period and says the answer is rough when it did. **Not here:** why the queue is long (FC-045), the value stream's lead time end to end (FC-001's own), the WIP cap that keeps a bottleneck fed (critical WIP — `capacity.flow-benchmarks`), several buffers summed in one page (each is counted on its own).

## 2. Users and scenarios
The ops lead or technical manager at the chiller or in a meeting. (1) *Cooked trays in a chiller:* 1,800 counted, 600 an hour going out, a 48-hour life → 3 hours, 6.3% of the life. (2) *A rack's WIP:* 250 cases an hour kept 4 hours means about 1,000 in progress. (3) *A flow that fits:* 480 in progress, each 2.4 hours → 200 an hour. (4) A wait longer than the product keeps: 3,600 at 60 an hour is 2.5 days against 48 hours — red, "longer than it keeps".

## 3. Method selection
Little's law is the exact long-run relation between the average number in a system, the average rate through it and the average time in it (Little 1961), needing no distribution assumptions — only that the system is steady and the three are the same boundary. Alternatives: a stopwatch on a sample of items (the time study, FC-019, for a single item's path), and Kingman's VUT (FC-045) for *why* the wait is what it is. The page makes the steadiness an input rather than an assumption.

**Established · assumed · chosen.**
- *Established:* L = λW (Little, "A proof for the queuing formula L = λW", *Operations Research* 9(3), 1961; `knowledge/methods/capacity/littles-law.md`); stock in progress = L × unit cost; holding a year = stock × rate. Independent cases: `scripts/knowledge/cases-calc.py` L1–L6.
- *Assumed:* a steady system over the window; the flow is what came **out** in the same unit and window as the count (said in the help and caveats); the pile "stayed about the same" until the person says it grew or shrank.
- *Chosen (the builder, 25 October — the owner asked not to be asked):* the pile's steadiness is a choice starting at *stayed about the same*, said as assumed; a pile that grew or shrank makes the verdict **amber** and the answer "rough" (Little's law is for averages — the record's own limit), never a refusal; a lead time **at or over the shelf life is red** — it is arithmetic (a product cannot keep longer than it keeps), not a house threshold; no share of a life below that is judged; lead times are said in minutes under an hour, hours to a day, days beyond (1.0 decimal); the unit cost is offered from the line's materials for a pack, said to be "a floor under what a pack in progress has cost", never filled in unasked; the carrying rate is never assumed (15–35% a year is said as a range in help only).

## 4. Inputs
What do you want to know (choice: the lead time · the WIP · the flow) · What is counted (text) · Counted in progress (units, > 0 — unless it is the answer) · Flowing out (units an hour, > 0 — unless it is the answer) · Time each spends in progress (hours, > 0 — only when it is not the answer) · Over the period, the pile (choice: stayed about the same · grew · shrank) · Shelf life (hours, optional) · *In money, optional:* What one unit has cost by now (£; offered from the line's materials for a pack); Cost of holding stock for a year (% a year).

## 5. Data suitability
Throughput must be the rate out, not the rated speed, over the same window; a growing or shrinking pile has to be averaged over a longer window (asked, and said); a single boundary at a time. A count taken once is a snapshot — "if you counted several times, type the average" (help).

## 6. Calculations
W = L ÷ λ, L = λ × W, λ = L ÷ W (`lib/ie/pull` `littlesLaw`; undefined without the two it needs or with a zero divisor); the share of life = W ÷ life; stock held = L × unit cost; a year = stock × rate ÷ 100. **Independent cases** (`cases-calc.py` L1–L6, `pull.test.ts`): L1 1,800 ÷ 600 = 3 h; L2 250 × 4 = 1,000; L3 480 ÷ 2.4 = 200 an hour; L4 3 ÷ 48 = 6.25% (said 6.3%); L5 1,800 × £0.85 = £1,530, £382.50 a year at 25%; L6 halve the WIP, the lead time 1.5 h; L7 0.4 h = 24 minutes, 30 h = 1.25 days.

## 7. Outputs
Verdict "3 hours lead time" / "1,000 in progress" / "200 an hour" (red at or over the shelf life, amber for a pile that moved); the sentence; the "halve it" line (and "read it as rough" when the pile moved); tiles *Lead time*, *In progress*, *Flow*, *Shelf life used*, *Stock held*; the working (the law, then the one sum, then the share of life); the money — *"The 1,800 trays in progress stand at £1,530 (at £0.85 each) — money tied up because each spends 3 hours in progress. Holding it costs about £382.50 a year at 25%."* — or what to give; four caveats; the closing line. No picture: the law is a straight line and a drawing would be decoration.

**The report.** The generic calculation paper (FC-235): band, tiles, sentence, the figures put in with sources (the pile "Assumed steady until you say otherwise" while unchanged), the working, the money, the caveats, Before → after when saved, the closing line.

## 8. Manufacturing usability
Two numbers to an answer at the chiller on a phone; the question is a choice of three buttons; the what-if halves the WIP before anything is moved.

## 9. Failure handling
Blank or zero counts refused in words and named under *Waiting for the figures*; the answer asked is never typed; the pile that grew warns and turns amber; a client reads it.

## 10. Integration
`ToolStudy` tool `calc`, key `littles-law`; `built.where: ['/calc/littles-law']`; the catalogue's entry changes from a mode of FC-001 to a tool of its own (its own page; FC-001's map still reads waits its own way and is not yet fed from here — said in the limits); in the line's Calculators row, the line report and a project's Tools. No migration.

## 11. Verification
`pull.test.ts` (L1–L3, L6, missing inputs); `calc.test.ts` (examples, refusals); `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. W, L and λ equal the independent cases L1–L3 and L6 — `pull.test.ts`; `calc.test.ts` examples 1–3.
2. The share of shelf life (6.25% said 6.3%) and the money (£1,530, £382.50 a year) equal L4–L5 — `calc.test.ts` example 1; `calc-shape.mjs` step *b*.
3. A pile that grew turns the verdict amber and says rough; a wait of 125% of the life is red and says it is longer than it keeps — `calc.test.ts` examples 3–4.
4. Zero counts, a missing flow, a missing time and a pile state not offered are refused in words — `calc.test.ts` ("refuses"); `calc-shape.mjs` step *c*.
5. The money's missing sentences are named and the answer stands — `calc.test.ts`; `calc-shape.mjs` step *b* (example 2).
6. Paper, phone, rename, delete, Undo, reload, before → after, what-if — `calc-shape.mjs` steps *d*–*g*.
Not built: FC-045; feeding the value stream map's waits from a count.

## 12. Maintainability
Definition `src/tools/calc/defs/littles-law.ts`; arithmetic `src/lib/ie/pull.ts` `littlesLaw`. Left: FC-045 Kingman's VUT (its picture — wait against utilisation — would earn its place, its inputs need timed cycles' variation the floor rarely has), critical WIP, a hand-off to the value stream map's waits (FC-001).
