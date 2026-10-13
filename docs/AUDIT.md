# The audit — the bar every screen meets

Rowland, 13 October: *"we need to run, I think, multiple audits to explore
elements that are missing, not functional properly, gaps basically ... the
amount of gaps that I'm finding are quite simple but important things ...
on the line standard, when I click on the PDF, I can't get out of it. There's
no X mark ... I'm always asking for reports, or cards ... there are still
quantification issues we've yet to even look at ... basic functionalities,
basic user interfaces, basic user experiences, flow, fluency, simplicity ...
run the audits, find the gaps and implement the improvements at pace."*

Placed (BLUEPRINT §8): every layer, every record, every place — it is the
floor under §3 and §4, not a new feature. Each gap found is written below,
fixed in a slice that ships live on its own, and held by a check so it
never comes back.

## The bar — what every screen does

1. **A way out of everything that opens.** Every sheet, drawer, viewer and
   preview shows an × (or Close / Done) on the screen at all times — not
   only a dimmed strip around it — and Escape and the back button close it.
2. **Every record edited and deleted where it sits.** Wherever a record is
   listed or opened, the person allowed to (lib/access) can change its words
   and delete it, with Undo; a delete says what goes with it.
3. **Paper wherever there is a list.** A page that lists records offers its
   report; a record that has a card offers the cards for all that are shown,
   as well as one at a time. The preview of either closes (1).
4. **Every number right, and said how it is known.** Each figure is the
   practice's figure, worked by hand in a test; its name is the practice's
   name; it says how many it came from and whether that is enough.
5. **The phone.** At 390 px nothing is off the side, no words are cut off,
   nothing to press is smaller than a fingertip.
6. **No dead ends.** Every page says where it is and has a way back; an empty
   page says what to do first.
7. **Simple with detail.** Where we are, why we are not where we should be,
   what we are doing about it — the rest one tap away (docs/SIMPLE.md).

## How it is checked

- `scripts/audit.mjs` drives every screen smoke opens, at a desk and on a
  phone: it presses each button that opens something and checks a way out is
  in view and Escape closes it (1); measures the phone (5); lists the pages
  with records and no paper (3) and the edit and delete words on each page
  for reading by hand (2). It deletes nothing and answers every confirm no.
- (4) is checked module by module, against the practice, with hand-worked
  tests.
- (2), (6) and (7) are read by hand from the audit's tables, page by page.

## Findings, 13 October

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 1 | 1 | every sheet (`ui/Sheet`) | No × at all — only the dimmed strip, Escape and back. A tall sheet (the line standard PDF's preview, a long editor) grew to 16 px from the top, leaving nothing to tap: no way out on a phone. | Fixed: the sheet's head (title and ×) stays at its top as it scrolls. |
| 2 | 4 | capability study (`lib/ie/sample`) | What the app calls **Cpk** is worked from the overall spread of the readings (sample standard deviation) — the practice calls that **Ppk** (AIAG SPC; ISO 22514), or Cmk for a machine's run. Cpk is from the spread within — run to run, the moving range ÷ 1.128 for single readings. On a run that drifts the two part, and the drift is what a commissioning test must see. | Fixed: Ppk (overall) carries the verdict — the same number as before, its right name; Cpk from the moving range beside it; "it drifts across the run" when they part. Hand-worked tests. |
| 3 | 3 | line standard card | Square and tall boards squeezed into a wide frame; marks half as big again as the screen's; names crossing; the note over the people; 3 of 10 named. | Fixed (677c03e). |
| 4 | 2 | Line capacity, Line standard | No delete of a Line capacity anywhere; no rename or delete on either list; a map's delete took its capacity. | Fixed (6435d91). |
| 5 | 3 | Control room problems | Cards for one, a few, a group — never for all shown. | Fixed (7215d1f). |

### Bar 4 — the arithmetic of the line's tools, module by module

Checked 13 October against the practice each figure claims, every figure
worked by hand in the module's tests. *Right* rows are listed so the next
audit knows they were read, not skipped.

| # | Module | Figure | Verdict | What changed | The practice |
|---|--------|--------|---------|--------------|--------------|
| 4.1 | `lib/ie/balance` | cycles needed for ±5% at 95% | **Overclaims** at the few laps a floor times: t taken as 2 — on five laps t is 2.78, so "enough" was ±5% at under 90%. | t is Student's at n − 1 df of the laps timed (a table, the careful row between rows); the floor of five stays. 10, 11, 9, 10, 10 s now asks 16 cycles, not 8. | Freivalds, *Niebel's Methods, Standards and Work Design*, ch. 9; the ILO's and Barnes's t = 2 is the large-sample rule of thumb |
| 4.2 | `lib/ie/balance` | the suggested balance | **Wrong**: to reach ⌈work ÷ takt⌉ it piled everything left on the last person, past takt (four 7 s at 12 s: 7 · 7 · 14). | A stack closes before it passes takt and the next person opens — one more person when the order will not fit, never a stack over takt but an element longer than takt on its own. | Ranked positional weight (Helgeson and Birnie, 1961) on elements that follow one another |
| 4.3 | `lib/ie/balance` | basic time, standard time, takt, fewest people, balance | Right: observed × rating ÷ 100 (BS 3138); × (1 + allowances); ⌈work ÷ takt⌉; work ÷ (people × the longest). | Hand-worked tests added (one lap, nothing timed, a rating of nought). | ILO, *Introduction to Work Study*; BS 3138:1992; the Yamazumi |
| 4.4 | `lib/ie/losses` | slow running and short stops, told apart | **Wrong**: slow running = run time × (ideal − running) ÷ ideal runs the line at the timed speed through its short stops too — slow running over-, short stops under-counted by the short stops × the speed lacked (at 80% of the plate, 40 min where 37.5 is). | Nakajima's net operating time: packs run (good and rejected) ÷ running speed; short stops = run time − it, slow running = it − packs ÷ ideal. A timing with no packs is not a running speed. The sentence shows the sums. | Nakajima, *Introduction to TPM* (1988); JIPM's loss structure (speed loss, minor stoppage loss) |
| 4.5 | `lib/ie/losses` | planned production time, expected, lost minutes, availability, quality, the pounds in two parts | Right: the shift less its planned breaks; × the ideal speed; (expected − good) ÷ rate; stops and changeovers off planned → run time; rejects ÷ rate; idle labour and lost contribution apart. | Tests kept; one added for a wide speed gap and for a timing of no packs. | ISO 22400-2 time model; TPM's six big losses; `docs/CAPACITY.md` §5–6 |
| 4.6 | `lib/ie/losses` | the rejects' pounds | Open — **leaves out** the materials a reject scraps: a reject not made up loses its price (its contribution and its materials), one made up loses its materials and the time. The two parts said are right as named. | Not built: a third part ("materials scrapped") is a decision for Rowland, not a fix. | Cost of poor quality — scrap at material cost |
| 4.7 | `lib/capacity` `lineSpeed` | the line's speed a stop's packs are counted at (SMED, the loss count) | **Wrong** when a station before the bottleneck rejects: it was the bottleneck's speed put back to the start of the line — 2% rejected upstream said the Bagger's 100 was 102, and a shift counted 9 min of slow running that was not there. | The bottleneck's own speed in the line's unit (`ownSpeed`: speed × crew × units in one of its own); it is still FOUND like for like at the start of the line. | Nameplate / ideal rate of the constraint (ISO 22400-2; `docs/CAPACITY.md` §1) |
| 4.8 | `lib/capacity` `shiftCapacity` | capacity a shift | **Overclaimed** with rejects typed: packs rejected before the bottleneck counted as made, after it as good. | Good packs off the end — the bottleneck's own pace, every station's rejects off; the sentence says "(95 good off the end of the line)" when they differ. | Toyota's production capacity sheet; capacity in good output |
| 4.9 | `lib/capacity` `accumulation` | what can collect, in minutes of the bottleneck's work | **Wrong** (small): divided by the bottleneck's figure once its own stops count, so a buffer looked longer the more the bottleneck stopped. | In minutes of the bottleneck running — its own speed, in the items the buffer holds. | "The typical minor stop × the critical machine's rate" (`docs/CAPACITY.md` §4; packmedia, packaging-mag) |
| 4.10 | `lib/capacity` | the chain of units, running and effective, the bottleneck and the next, what reaches a station, people needed (⌈what arrives ÷ one person's pace⌉), labour cost a pack, one more person | Right — rate × crew × factor ÷ the good before it, × running %; the lowest effective; labour = people × rate ÷ (good a minute × 60). | Hand-worked tests added with rejects on the line. | Standard costing (labour cost per unit); Goldratt (the constraint) |
| 4.11 | `lib/capacity` `vCurve` | the V — each station a share of the bottleneck, under the guide | Right as drawn and said, on capacity once each station's own stops count (both lines drawn). The V of LineView and Foodmach is set on rated speed; on stops-counted capacity a neighbour that stops often is held to the margin too — the stricter reading where it matters. Kept; the words say "faster" of a capacity, noted. | None. | V-curve theory (LineView; Foodmach), `docs/CAPACITY.md` §4 |
| 4.12 | `lib/ie/changeover` | SMED's target, single-digit minutes | **Wrong**: "9 min or less" — 9 min 30 s, single-digit minutes, read "30 s still to find". | Under ten minutes (`onTarget`: below 600 s); the screen's mark says "under 10 min". | Shingo, *A Revolution in Manufacturing: the SMED System* (1985) — "fewer than ten minutes" |
| 4.13 | `lib/ie/changeover` | elapsed (each column's longest), labour (every element × everyone on it), the ladder, the cost a shift → year in two parts, the share of running time, the interval | Right — the worked example's 42 → 33 → 27 → 9, 29.4 h a week, £5,880 + £8,820, 28%; EPEI = n × changeover ÷ (available − run). | Tests at the target's edge added. | Shingo's stages; EPEI (LEI lexicon); `docs/CAPACITY.md` §6 |
| 4.14 | `lib/ie/steps` | how long, in words (`dur`) | **Mislabelled** under ten minutes: whole minutes put a 60 s cycle "1 min, within takt (1 min)" against a 72 s takt, and 90 s of lead time at "2 min". | Under ten minutes to a tenth ("1.5 min", "1.2 min"); whole from ten. | — (the figure was right; its words hid it) |
| 4.15 | `lib/ie/steps` | days of demand from a queue, lead time, adds value, process cycle efficiency, takt, the longest cycle a piece | Right — queue ÷ daily demand (Little's law); Σ cycle + Σ wait; adds ÷ lead; available ÷ demand. A day of demand is counted as a calendar day — right for a line that runs every day, short on a five-day week (noted). %C&A is not in the app. | Hand-worked tests added (three steps; no demand; nothing timed). | Rother & Shook, *Learning to See*; George, *Lean Six Sigma* (PCE) |
| 4.16 | `lib/ie/walk` | the walked bottleneck | Right (blocked points after, starved before; where they meet); the sentence **overclaimed** "the stations before it were mostly blocked" of them all, whichever way each pointed. | Says how many point to it ("1 of the 2 stations before it was mostly blocked") when not all do. | Roser, Lorentzen and Deuse (2015), the bottleneck walk |
| 4.17 | `lib/ie/mix` | three numbers, throughput per constraint minute, the week filled | Right; a week of **no minutes** said "fills at 0%; everything is made" while nothing was. | Says the constraint has no minutes yet. Edge tests (losses longer than the shift, nothing made). | Stevenson, *Operations Management*; Goldratt's throughput accounting (ACCA) |
| 4.18 | `lib/ie/ergo` | NIOSH RWL and lifting index | Right — the multipliers' formulae and Tables 5 and 7 as published; the CCOHS example. | None. | Waters et al., NIOSH *Applications Manual for the Revised Lifting Equation* (1994) |
| 4.19 | `lib/run` | net rate, reject % | Right — good ÷ minutes run (stops in); rejects ÷ packs made. | Edge tests added: on the agreed numbers exactly is met; no minutes, no net; more rejects than packs, no good packs. | EN 415-11:2021's output and reject rate |
| 4.20 | `lib/pace`, `lib/rampUp` | the pace; the climb to rate | Right as built, **misnamed in the docs**: TOOLKIT called the pace earned schedule (it is a burn-down — done ÷ days, to go ÷ that); the climb said "Wright, 1936, unit form" (Wright's is the cumulative average; the unit form is Crawford's). | TOOLKIT §8 and the comment say what each is; an exact 80% curve test. | Lipke (earned schedule, not used); Wright (1936); Crawford (1944) |
| 4.21 | `lib/cost` (the Pareto in £, Capture's ticker, Analyse, the meeting, the line's settings) | £ an hour while the line is down | Open — **one blended figure**: idle labour + lost output added into one £, and lost output charged on every machine's stops, at or away from the bottleneck. `docs/CAPACITY.md` §6 says two parts, and lost output only where it cannot be made up. | Not changed — it is on eight screens and the reports; a slice of its own, for Rowland. | `docs/CAPACITY.md` §6; cost of downtime at and away from the bottleneck |
