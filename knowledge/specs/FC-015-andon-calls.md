# FC-015 — Andon calls on the Reliability study: how many, for what, how fast help came and the line ran again

**Catalogue:** FC-015 andon calls — response and resolution times (a *mode* of
FC-058, built on the timing of FC-059). **Knowledge:** `lean.andon`,
`maintenance.mttr-availability`, `cost.line-cost-model`. **Asked for:** the
catalogue ("People call for help and wait; nobody knows how long or why");
Rowland, 25 October: go for every entry that can honestly be built. **Written
25 October 2026, before any code, by the builder (the owner asked not to be
asked).** Needs `FC-059-repair-times.md`: the same two stamps, the same running
time, the same cost model.

## 1. Purpose
At the abnormality the operator stops and calls (jidoka); help comes; the line
runs again. Nobody knows how many calls, for what, how long until someone
arrived, and how long until the line ran — and the *waiting* is often more of the
stop than the repair. A count set up as **a call for help** records each call at
the moment, the reason (from a short list the team keeps), when help arrived and
when the line ran again; the study then says the calls by reason with the
waiting each reason cost, the median and slow end of the response and of the
clearing, how many calls were answered within the response the team agreed, by
shift, and what the waiting cost. The sentence: *"14 calls; help in 2.3 minutes
typically but 8 at the slow end; 45 minutes waited — the QA check, two calls, is
16 of them."*

**Scope.** This build covers: a count set up as *A call for help* with its
reasons (the team's short list, up to eight) and the response the team wants
("help within N minutes"); the call's three moments (called = the tap, help
arrived, running again) and its reason; the figures (calls, answered, response
median / slow end, clearing median / slow end, the share within the response
wanted); the **reasons ranked by the minutes waited** (not by how many); the
calls by the line's shifts when the line has them; the waiting and the
clearing in money by the study's cost model; the tiles, sentences, closing
line and paper. It does **not** cover: who called or who answered — **calls
are counted by reason and by shift, never by person** (the tap's `by` is kept
as for every tap and is not shown, grouped or ranked anywhere on the page or
paper; a decision for the owner if people are ever to be compared, which this
is not); the escalation chain (operator → team leader → engineer → QA) as
separate legs (one response); a call that does not stop the line (a call takes
the machine out of running, as a stop does); whether calling is being
discouraged (a falling count with no countermeasure behind it is said in the
spec to be questioned — the page says the count per day and leaves the
judgement); the stop's own length as a shift loss (the loss count's).

## 2. Users and scenarios
A packer at a case packer taps *Call* when the glue fails and picks *jam*; a
fitter arrives and the operator taps *Help arrived*; the packer taps *Running
again*. The shift lead reads the day's calls on a phone; the engineering manager
reads the week at a desk and sees that the QA check is the biggest waiting.
Food first: packers calling an engineer to a jam; QA called for a weight or
label check before a restart; a material short.

## 3. Method selection
Andon and jidoka (Ohno 1988; Liker 2004): the system works only if calls are
answered fast and never punished — so the count of calls is information, the
response time is the performance. Response = arrived − called; resolution =
running − called; summarised by the **median and the slow end (90th
percentile)**, never the mean alone; reasons ranked by the **total waiting**,
not by frequency. The record's worked shift is the case.
*Alternatives:* the stop's own duration belongs to the loss count (the andon
log measures the help chain and the reason).

**Established · assumed · chosen.**
- *Established:* the measures and their order (response, resolution, by reason,
  the Pareto by waiting, the response standard and its share, by shift)
  — `lean.andon` (Ohno 1988, Liker 2004, from knowledge, texts not re-read); the
  percentile (linear interpolation) and the cost model are FC-059's and FC-058's.
- *Assumed:* each call stops the line from the call to running again; the
  call's reason is picked from the list at the moment or soon after.
- *Chosen (the builder, 25 October — the owner asked not to be asked):* up to
  **eight** reasons, with the record's "five to eight" advice printed beside
  them; the slow end (90th percentile) said from **10** calls, under that the
  slowest; the share within the response wanted counts only calls with *help
  arrived* stamped, and says how many that is; by shift only where the line has
  two or more shifts set, a call assigned to the shift whose clock times contain
  its time of day; the cost of a call is its whole time to running (the record's
  "response + resolution minutes"), with the part spent waiting named — the
  waiting is also labour and, at the bottleneck, packs. Calls and their money
  never name a person.

## 4. Inputs
At set-up, per count: *A call for help*; **Reasons** (comma-separated words, up
to eight); **Help should arrive within** (minutes, optional). At the machine: tap
the count's button (the call), pick the reason chip, *Help arrived*, *Running
again* (or a time said), as in FC-059. Money from the line as ever.

## 5. Data suitability
Calls without a reason are counted under "not said". Fewer than 10 calls: the
slow end is the slowest. A reason with one call is shown, never ranked as a
pattern. A shift with fewer than 3 answered calls shows its count only.

## 6. Calculations
Called cᵢ, arrived aᵢ, running zᵢ (minutes from the tap): response aᵢ, resolution
zᵢ. Medians and 90th percentile (linear). Share within L = #(aᵢ ≤ L) ÷ #(answered).
Per reason: calls, Σ aᵢ (waiting), Σ zᵢ (cleared), ranked by Σ aᵢ then calls then
name. Per shift: calls, median response. Money: minutes stood an hour of running
= Σ zᵢ ÷ running hours; of which waiting Σ aᵢ ÷ running hours; priced as FC-058
(labour; packs and contribution only where the machine stops the line).

**Independent cases** (`scripts/knowledge/cases-w5.py`, to
`src/tools/reliability/__tests__/repair.test.ts`): fourteen calls — film change
(response, resolution) 1/6, 2/7, 1.5/8, 3/9.5, 1/5; jam 0.5/2, 1/3, 4/6, 0.5/1.5;
QA check 5/9, 11/14; label 2.5/6.5, 3.5/8; material short 9/19:
1. Response median 2.25, mean 3.25, 90th 7.8, slowest 11; resolution median
   6.75, 90th 12.65.
2. Within 3 min: 9 of 14 (0.6429).
3. Waiting in total 45.5 min, clearing 104.5.
4. Reasons by waiting: QA check 16.0 (2 calls) · material short 9.0 (1) · film
   change 8.5 (5) · jam 6.0 (4) · label 6.0 (2) — film change is the most
   frequent and is third by waiting.
5. Over 8 running hours: 13.0625 min stood an hour of running; labour £13.06 an
   hour at £60/h crew cost.

## 7. Outputs
Tiles for a call count: the study's MTBF (time between calls), rate an hour,
watched, calls, what it costs — and **Help in** (median response; within the
response wanted: x of y) and **Cleared in** (median; the slow end; longest). The
sentence, what it means (the biggest waiting reason and how it differs from the
most frequent; the response against the wanted; the day's count), the reasons as
bars (calls · waiting minutes), the calls by shift (a small table), and what it
costs. No colour on the response unless a response was agreed; then amber when
fewer than half were within it and red never (a team's standard is not a failure
of the machine).

**The report.** The count's section on the Reliability paper gains: the
sentence and what it means, the reasons ranked by waiting (a table with the bar),
the by-shift table where there is one, and the money; the tiles and closing line
are the module's. A study with no call count prints as before.

## 8. Manufacturing usability
The call button is the count's button (one tap); the reason chips and the two
stamps are on the open row of FC-059. A reason can be added to the list on the
spot (a new word goes on the list, which stays at eight).

## 9. Failure handling
No reasons listed: calls are counted under "not said" and the page says to list
the reasons. A call open for more than 4 hours is asked about. A client sees the
figures and no buttons. Never by person: the page and paper contain no name from
a tap.

## 10. Integration
Record: `RelCount.timed = 'call'`, `reasons`, `respondMin`; `RelEvent.reason` —
in the study's own JSON, no migration. Shows on the Reliability page, paper and
line report. The cost model is FC-058's. The reasons are the 6M fishbone's raw
material (a recurring reason is a cause to take on — the page says so; the
existing *Make it better* on the study raises it).

## 11. Verification
Unit tests in `repair.test.ts` on the cases above (and ties in the ranking, no
reason, one call, 9 and 10 calls, shifts crossing midnight, and no person's name
anywhere in the sentences). Acceptance `scripts/acceptance/reliability.mjs`
story 13.

**Acceptance criteria.**
1. The call figures, the reasons' ranking and the shares equal the independent
   cases — `repair.test.ts`.
2. A call count set up with reasons and a response wanted; calls tapped, reasons
   picked, both stamps — the figures, tiles, sentences and bars on the page
   equal the module's — `reliability.mjs` story 13.
3. The ranking is by waiting, not by frequency — `repair.test.ts` case 4 and
   story 13.
4. By shift for a line with shifts; none for a line without — story 13.
5. No person's name appears in the call figures, on the page or the paper —
   `repair.test.ts` and story 13 (the paper text is searched for the tapper's name).
6. The paper read back from the downloaded PDF carries the sentence, the ranked
   reasons and the money — story 13.
7. The phone: nothing off the side — story 13.
8. No console error.

## 12. Maintainability
`repair.ts` holds the call figures beside the repair ones (same timing). A call's
escalation legs, calling being discouraged and a person-level view are not built
and the owner is asked before any. FC-198 (the tiered meeting) and FC-203 (the
shift handover) may read the day's calls.
