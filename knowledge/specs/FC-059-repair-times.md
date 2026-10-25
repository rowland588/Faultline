# FC-059 — Repair times on the Reliability study: how long each stop takes to clear, and the machine's availability

**Catalogue:** FC-059 repair times — MTTR and availability · FC-055 short stops
counted at the machine — how often and how long (its missing half). Both are
*modes* of FC-058 (the Reliability study). FC-015 andon calls use the same
timing and have their own specification (`FC-015-andon-calls.md`).
**Knowledge:** `maintenance.mttr-availability`, `maintenance.mtbf-failure-rate`,
`equipment.short-stops-speed`, `cost.line-cost-model`. **Asked for:** the
catalogue's first backlog item ("Repair times on the reliability study — the
other half of a machine's reliability"); Rowland, 25 October: go for every entry
that can honestly be built, no list of questions. **Written 25 October 2026,
before any code, by the builder (the owner asked not to be asked).**

## 1. Purpose
The study counts stops (how often) and cannot say how long each takes: "a
labeller jam is twenty seconds; the film change is nine minutes" is the
difference between a nuisance and a loss, and the half of reliability that is
often the bigger lever. A person at the machine already taps each stop. This
adds the two moments after the tap — *help arrived* and *running again* — so
each stop has a length, split into waiting and fixing, and the study says the
typical and the worst, the share spent waiting, the machine's availability and
what halving the repair time would give back. The sentence it lets the
engineer say to the line lead: *"Stops come every 24 minutes and take 3.8
minutes to clear — 82% available; a third of that is waiting for a fitter."*

**Scope.** This build covers, for any count set up as **timed** (a stop): the
two stamps (help arrived · running again) on each tap, or the time said ("took
40 s"); the repair-time figures (n timed, median with its exact 90% interval,
mean, 90th percentile, longest, waiting and fixing apart, their shares);
**availability** = MTBF ÷ (MTBF + MTTR) with the MTBF's 90% range and what
halving the repair time gives; the minutes lost an hour of running (FC-055's
"how long are they, in total"); the running time taken as watched time less the
stops' own minutes; the repairs in money (the line's crew and the packs at the
bottleneck, as the study already prices a failure, and a fitter's time at a
rate typed); a bar for each stop (waiting then fixing); the tiles, sentences,
closing line and paper. It does **not** cover: finding the fault apart from
fixing it (two stamps only; "fixing" includes finding); spares used (FC-066
critical spares); planned maintenance (FC-063); a distribution fitted to the
repair times (FC-114); a stop that does not stop the machine (a timed count
takes the machine out of running — a thing that does not should not be timed);
who tapped, ranked or compared by person (never); a stop opened on one phone
and closed on another at the same moment — the later edit of that one stop
wins whole (the sync merges lists by id, a stop is one entry).

## 2. Users and scenarios
A fitter or a shift lead stood at a flow wrapper with a phone. (1) A film break
on the wrapper: tap *Stop*, tap *Help arrived* when the engineer comes, tap
*Running again* — three taps in thirty seconds. (2) Short stops, twenty
seconds each, forty an hour: no time to stamp twice — tap *Stop*, then a chip
"30 s" ("took about"), or *Running again* on the next quiet moment. (3) The
engineering manager reading the same study at a desk: which is the lever,
waiting or fixing, and what is availability. (4) A study from before: no stamps;
nothing changes — it still reads as it did.

## 3. Method selection
MTTR with the median and the 90th percentile beside it, availability from the
MTBF the study already measures (`maintenance.mttr-availability`). Repair times
are skewed (a few long ones), so the **median is the headline** and the mean is
said beside it, never alone. The median's interval is the exact
distribution-free one from the order statistics (no assumption about the
shape), the 90th percentile is the linear-interpolation percentile (NumPy's
default). Availability is the *inherent* one the record gives; it is not OEE and
says nothing of speed or quality. Alternatives not taken: a lognormal fit (needs
FC-114 and an assumption the data may not meet); Monte-Carlo bootstrap intervals
(not deterministic on screen and paper).

**Established · assumed · chosen.**
- *Established:* MTTR = Σ repair times ÷ n; availability = MTBF ÷ (MTBF + MTTR)
  (IEC 60050-192:2015 definitions, from knowledge — text not read; Ebeling 2010);
  the median's interval is [x₍ₗ₎, x₍ₙ₊₁₋ₗ₎] with the largest l such that
  P(Binomial(n, ½) ≤ l − 1) ≤ 0.05, coverage ≥ 90% (order-statistic result, no
  source needed — checked in `scripts/knowledge/cases-w5.py`); the 90th
  percentile by linear interpolation of the sorted times, position 1 + 0.9 (n − 1).
- *Established:* a stop's minutes cost the crew's labour wherever it is, and the
  packs only where the machine stops the line — `lib/cost`, `lib/lineLoss`
  stopsTheLine, `tools/losses` contributionOf (`knowledge/MONEY.md` D; FC-058).
- *Assumed:* every timed stop stops the machine (the count says so when set up);
  untimed stops take as long as the timed ones on average (said whenever fewer
  are timed than counted); an *open* stop (no *running again* yet) is down until
  now, inside the watched time only.
- *Chosen (the builder, 25 October — the owner asked not to be asked):* the
  median is the headline; "rough" under **5** timed (as the MTBF is under 5
  events); the 90th percentile said from **10** timed (under that it is the
  longest); the median's interval from **5** timed (under that no 90% interval
  exists); the measured mean replaces the typed "minutes the line stands" in the
  money from **3** timed; waiting is called *most of the time* at half or more
  and *mostly fixing* at a fifth or less; a mean a quarter or more above the
  median is called pulled up by a few long ones; a stop open longer than **4
  hours** is asked about. A fitter's rate is typed per count (what a fitter
  costs the business an hour); where no *help arrived* is stamped the whole
  time is taken as the fitter's and the money says so.
  Each of these is printed on the page where its result is read.

## 4. Inputs
- At set-up, per count (*Change what was agreed*, owner): **Timing** — *Count
  only* (as before) · *Time each one — a stop* · *A call for help* (FC-015); for a
  stop, an optional **fitter's rate an hour** (£) to price the repairs. The
  existing *MTBF wanted* and *minutes the line stands each time* stay; typed
  minutes are replaced by the measured ones from 3 timed.
- At the machine, per tap of a timed count: **Help arrived** (stamp now),
  **Running again** (stamp now), or **It took** — a chip (10 s, 30 s, 1 min,
  2 min, 5 min) or typed ("90 s", "1.5 min", "1:30", a bare number is minutes);
  a typed time is kept as *said* and counted as such. Stamps are `arrivedAt`
  and `fixedAt` on the tap (`RelEvent`); `est` marks one said not clocked.
  Validation: running again cannot be before the tap; help arrived must sit
  between the tap and running again; durations from 1 s to 24 h.
- Read, not asked: the watch, the line (crew, wage, on-costs, speed, margin,
  shifts), the study's machine and the line's bottleneck.

## 5. Data suitability
Said when there is a timed stop. One timed stop: its length, "rough". Under 5:
rough, no interval. 3 or more with *help arrived* stamps: waiting and fixing
apart. A stop tapped while the watch is stopped is not counted (as ever) and its
times are not read. Open stops are counted as down until now and named. Times
typed rather than clocked are counted and their number said.

## 6. Calculations
Symbols: rᵢ repair time of stop i (min) = running again − tap; wᵢ waiting =
help arrived − tap; fᵢ fixing = running again − help arrived; n timed.
- MTTR = mean r; median; p90 = linear percentile; max.
- Median interval: sort r; l = largest k ≤ n/2 with P(B ≤ k − 1) ≤ 0.05
  (B ~ Binomial(n, ½)); [r₍ₗ₎, r₍ₙ₊₁₋ₗ₎]; none if no such l (n < 5).
- Waiting share = Σ w ÷ Σ r over the stops that have a help stamp; medians of w and f.
- A = MTBF ÷ (MTBF + MTTR); range = the same with the MTBF's 90% bounds; halved
  A′ = MTBF ÷ (MTBF + MTTR ÷ 2).
- Minutes lost an hour of running M = failure rate × MTTR (= Σ r ÷ running hours
  when all are timed); halving gives back M ÷ 2.
- Running time = watched time less the union of the stops' down intervals
  [tap, running again] (an open one to now), inside the watched stretches; a
  stop tapped during another's repair still counts (it was tapped while
  watching) and sits at the clock where that repair began.
- Money (existing model): labour an hour = M ÷ 60 × crew × wage × on-costs;
  packs = M × rated speed, contribution = packs × contribution a pack, only where
  the machine stops the line. Fitter: F = rate × mean f (or mean r with no help
  stamps) ÷ 60 per repair; × failure rate an hour of running.

**Independent cases** (`scripts/knowledge/cases-w5.py`, NumPy/SciPy, to
`src/tools/reliability/__tests__/repair.test.ts`): twelve stops, repair
2, 3.5, 1.5, 5, 4, 2.5, 21, 4, 2, 9, 3, 7.5 min, help after 0.5, 1, 0.5, 2, 1.5,
0.5, 6, 1, 0.5, 3, 1, 2.5:
1. n 12, mean 5.4167, median 3.75, p90 8.85, longest 21.
2. Median 90% interval 2.0 to 7.5 (order statistics 3 and 10); n = 5 → l = 1,
   n = 4 → none; n = 20 → l = 6.
3. Waiting median 1.0, fixing median 2.5; waiting share 0.3077.
4. With 14 stops in 5.6 h (MTBF 24 min): A = 0.8159, halved 0.8986;
   M = 13.5417 min an hour of running, halved 6.7708.
5. Money (crew 4 at £12 × 1.25, 60 packs a minute, 10p): labour £13.54 an hour of
   running, 812.5 packs, £81.25 contribution; fitter £30 an hour on a mean fixing
   time 3.75 min: £1.875 a repair, £4.6875 an hour of running.
6. Running time less repairs: a 2 h watch with two 6 min stops inside is 1.8 h.

## 7. Outputs
On the count's own section (and its tiles): **Repair time** tile (median; mean,
1 in 10 over, timed of counted) and **Available** tile (A; MTBF ÷ (MTBF +
MTTR); minutes lost an hour; the range); the sentence; what it means (waiting
or fixing, the tail, the open ones, the said not clocked); a bar for each stop
(waiting then fixing); what it costs, with the fitter's. Tones: neutral — there
is no target for repair time or availability unless one is agreed; an open stop
past 4 hours and times missing are amber.
The closing line gains "; a stop takes a median 3.8 min to clear (82% available)".

**The report.** The Reliability paper's section for a timed count gains, in the
count's own section after its tiles: the repair sentence and what it means, the
bar-for-each-stop picture (waiting and fixing in two tones with the legend in
words), and the money sentence; the tiles, band and closing line are the
module's. Nothing else on the paper changes, and a count not timed prints
exactly as it did.

## 8. Manufacturing usability
Three taps for a repair, one for a short stop with a chip. The *open* panel sits
under the buttons, one row per stop not yet cleared, with large buttons (the
phone's thumb); a stop left open is not lost — it stays until cleared, struck or
timed. The watch need not be stopped for a repair: the stop's own minutes come off
the running time.

## 9. Failure handling
No stamps yet: the sentence says to stamp. A stamp before the tap or a time out
of range: refused with a sentence. Help stamped after running again: refused.
A closed (receipt) study takes no stamps. A client (read-only) sees the figures,
no buttons. A stop struck keeps its place and counts for nothing, its times with
it. Offline: the stamps are local edits, merged by id when back.

## 10. Integration
Record: `RelCount.timed / fitterRate`, `RelEvent.arrivedAt / fixedAt / est` in
the study's own `agreed` and `facts` — **no migration** (both are JSON; the
schema test is unaffected). Shows: the Reliability page and paper, the list row
(unchanged), the line report's Reliability section (it prints the same blocks),
the before → after (its MTBF is now of running time less repairs — said). Access
`can.edit` for stamps, `can.agree` for the set-up. PAGES.md and the inventory
gain the lines. The cost model is the study's (FC-058); a fitter's rate is the
count's.

## 11. Verification
Unit tests `src/tools/reliability/__tests__/repair.test.ts` on the cases in §6,
the boundaries (n = 1, 4, 5, 9, 10; equal times; a stamp before the tap; typed
durations parsed — "90 s", "1.5 min", "1:30", "2") and old records unchanged.
Acceptance `scripts/acceptance/reliability.mjs`, stories 12–13 (new, the rest
untouched).

**Acceptance criteria.**
1. The repair figures equal the independent cases (§6, 1–5) — `repair.test.ts`.
2. The running time is the watch less the stops' minutes, and a study with no
   timed count reads exactly as before — `repair.test.ts`, `reliability.test.ts`
   (unchanged) and story 12 (the seeded study's row and tiles as before).
3. A timed count set up on the page; a tap, *Help arrived* and *Running again*
   stamped with the page's clock; a chip and a typed time; the open row, its
   stale warning — `reliability.mjs` story 12.
4. Every tile, sentence, what-it-means line and money sentence on the page
   equals the module's for the stored record — story 12.
5. The paper read back from the downloaded PDF carries the repair sentence, the
   picture's legend and the money; a count not timed prints as before — story 12.
6. A fitter's rate gives the repairs in money; missing it says "Give a fitter's
   rate to say the repairs in money" — `repair.test.ts`, story 12.
7. The phone (390 px): nothing off the side; the open row's buttons at least 44 px
   — story 12.
8. A client sees figures and no stamp buttons — story 12 (access with `can.edit`
   false is checked in the module test of the visible controls).
9. No console error — every story.

## 12. Maintainability
`src/tools/reliability/repair.ts` (pure), `RepairPanel.tsx`, the paper blocks in
`src/lib/report/reliabilityRepair.ts`. FC-066 (spares) and FC-063 (planned
maintenance) read the same repair figures when built; FC-067 (maintenance
measures) is a board over them. Left for later, each with its number: finding
apart from fixing (a third stamp), spares used (FC-066), a distribution fitted
(FC-114), a stop that leaves the machine running.
