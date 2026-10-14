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
8. **The papers keep up.** Every record and every status a screen shows is on
   each paper it belongs on, in the screen's words — the stage-gate job's
   full report, one-page status, programs report and handover — and when it
   changes, every one of them changes with it (docs/REPORTS.md, Relevance).

## How it is checked

- `scripts/audit.mjs` drives every screen smoke opens, at a desk and on a
  phone: it presses each button that opens something and checks a way out is
  in view and Escape closes it (1); measures the phone (5); lists the pages
  with records and no paper (3) and the edit and delete words on each page
  for reading by hand (2). It deletes nothing and answers every confirm no.
- The phone is measured as a phone: a touch screen at 390 px, so its own
  rules (`pointer: coarse`) are in force; a control is measured as a finger
  reaches it — its box, its halo (the empty `::after` that takes its taps),
  a tick through its label — on the page and in every sheet it opens. The
  floor is 24 px; the aim is 32 px high (44 where there is room). Each one
  short is named where it sits, its words and its size, so a finding points
  at its source. Words for a screen reader only (`.sr`, `.sr-only`) are
  hidden on purpose and are not "cut". `node scripts/audit.mjs out.json
  --fit` measures the pages without pressing anything.
- (4) is checked module by module, against the practice, with hand-worked
  tests.
- (2), (6) and (7) are read by hand from the audit's tables, page by page.
- (8): `src/lib/__tests__/reportRelevance.test.ts` holds one job with every
  status the screens show and reads each on all four papers;
  `scripts/acceptance/report-relevance.mjs` makes the changes on the seeded
  job, downloads the four PDFs from their buttons and reads them back, then
  moves the statuses and reads them again.

## Findings, 13 October

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 1 | 1 | every sheet (`ui/Sheet`) | No × at all — only the dimmed strip, Escape and back. A tall sheet (the line standard PDF's preview, a long editor) grew to 16 px from the top, leaving nothing to tap: no way out on a phone. | Fixed: the sheet's head (title and ×) stays at its top as it scrolls. |
| 2 | 4 | capability study (`lib/ie/sample`) | What the app calls **Cpk** is worked from the overall spread of the readings (sample standard deviation) — the practice calls that **Ppk** (AIAG SPC; ISO 22514), or Cmk for a machine's run. Cpk is from the spread within — run to run, the moving range ÷ 1.128 for single readings. On a run that drifts the two part, and the drift is what a commissioning test must see. | Fixed: Ppk (overall) carries the verdict — the same number as before, its right name; Cpk from the moving range beside it; "it drifts across the run" when they part. Hand-worked tests. |
| 3 | 3 | line standard card | Square and tall boards squeezed into a wide frame; marks half as big again as the screen's; names crossing; the note over the people; 3 of 10 named. | Fixed (677c03e). |
| 4 | 2 | Line capacity, Line standard | No delete of a Line capacity anywhere; no rename or delete on either list; a map's delete took its capacity. | Fixed (6435d91). |
| 5 | 3 | Control room problems | Cards for one, a few, a group — never for all shown. | Fixed (7215d1f). |
| 6 | 1 | the photo viewer (`ui/Evidence`) | Had its × but Escape did nothing. | Fixed: Escape closes it. |
| 7 | 3 | every study (capability, value stream, SMED, sampling, loss count) | Reached paper only inside a job's client or 6M report — a study on a line, a quick session, or a tool's list had none. | Fixed: PDF on every study's page (its sentence, its table, a capability study's figures and every reading) and PDF (all shown) on every study list (`lib/studiesPdf`, the same blocks as the client report's Evidence). |
| 8 | 1, 5 | the audit run (`scripts/audit.mjs`, 270 screens, 160 overlays opened) | After 1: nothing trapped; nothing off the side. Words cut off on 17 screens ("Actions", "Order", "Over", "Sort by"); controls under 24 px on 70 phone screens; 17 lists with no paper. | Phone fit: row 9. The paper: bar 3 below. |
| 9 | 5 | every phone screen and its sheets (8, read element by element) | The 70 screens and 17 cut were partly the measure: a 390 px window with a mouse, so the phone's own rules (`pointer: coarse`) were off and the halos that take a link's taps were not counted; and every "cut" word was a screen reader's label, hidden on purpose (Actions, Order, Over, Sort by). Measured as a phone, 33 screens still had 68 controls under 24 px (136 under 32 high): a machine's name in a row (16–21 px), the plan's next stage (13), "Set the V's margin", "Your factory ›" and a line's name over its programs (14–23), the programs' up and down (30 × 24), Evidence's tick, update and due date (20, 20, 31), the walk's trail (28), the playback speed (16), a test's next steps (20), the client report's rows (26), the line standard's role and bottleneck (24, 30), the case title (30), the lever tree's status (a pixel short of its pill); in sheets, a stage's and a test's chips (25) and a step's tick row (26); and the × of the document just made (31, on every screen once a PDF is made). | Fixed, each at its own rule and on a touch screen only, so a desk is unchanged: the links take the house's 10 px halo; where a halo would be clipped (a name that ends in …) its padding reaches instead and the line stays put; boxes 36–44 px; Evidence's tick pressed through its label; the PDF bar's × as tall as Open and Send. Now nothing under 24 px on any page or sheet; under 32 high only the line standard's marks on an empty board (30 px — the board's drawing; a halo would take the taps that place a person beside them) and the lever tree's status while the tree is zoomed out (32 at full size). |
| 2.1 | 2 | every study — the five tools' lists and each study's own page (capability, value stream, SMED, work sampling, loss count) | No study could be deleted anywhere (`db/studies deleteStudy` had no caller); a value stream map and a work sampling study could not be renamed even on their own page; no list row could rename or delete. | Fixed (661a70d): Rename and Delete beside the name on every study's page (`ui/StudyActs`, the three copies of Name merged) and on every list row; the ask says what goes and what stays (`lib/studyLinks studyRemovingSays`); Undo; deleted from its page, back to its tool's list on its line. `edit-delete.mjs` A. |
| 2.2 | 2 | a 6M problem — the fishbone's problem card and panel | Its words (the head of the fish) could not be changed once opened — only removed and opened again, losing its causes. | Fixed (11f46e4): Change the words on its card (`lib/useProblems retitleProblem`), can.edit. `edit-delete.mjs` B1. |
| 2.3 | 2 | a Case on a line with no job — the A3 (`/w/:line/case/:id`) | Deleted hard: no Undo, and the other devices' screens not told. | Fixed (11f46e4): the same soft removal as a 6M problem, the ask saying what stays, Undo. `edit-delete.mjs` B2. |
| 2.4 | 2 | a stop timed on a line — Capture's log | Deleted with Undo, never changed: a mis-tapped machine, the wrong reason, a stopwatch left running. | Fixed (a9aabd3): tapped, Change this stop (`ui/StopSheet`) — where, what, its kind, minutes, cause family, note; minutes typed over say typed and move its end (`lib/stopEdit`); Undo. `edit-delete.mjs` C. |
| 2.5 | 2 | a problem — the register (one or several ticked), its frame on the walk, a job's walk evidence | Asked, then gone on every device — no Undo; `db/walk deleteSnag` (and the frame's delete) never signalled the write, so the other devices heard at the next write. | Fixed (983f4fd): Undo puts back the problem and its photo; the write signalled. `edit-delete.mjs` F; `snags.mjs` still passes. |
| 2.6 | 2 | a win — a job's Wins, a job line's Wins | Asked, then gone. | Fixed (983f4fd): Undo, its proof said to go with it. `edit-delete.mjs` D1. |
| 2.7 | 2 | a reading — a job's numbers, a line's numbers | Asked, then gone. | Fixed (983f4fd): Undo. `edit-delete.mjs` D2. |
| 2.8 | 2 | a machine — the line's own page | Renamed or taken off only in Set up the line (Order and names ›). | Fixed (3f31d4c): Rename and Remove on each row (the line's own list; a job's machine is changed on its job), the ask saying what stays, Undo back to its place in the flow. `edit-delete.mjs` E1–E3. |
| 2.9 | 2 | a line — its own page | Archived only from Your factory. | Fixed (3f31d4c): Archive this line in Edit the line, with Undo. `edit-delete.mjs` E4. |
| 2.10 | 2 | a marked frame on the walk — a job's walk evidence | "This cannot be undone" — the still and every problem pinned on it. | Fixed (ecfa88b): Undo puts the frame, its problems and their pictures back. `edit-delete.mjs` G. |
| 2.11 | 2 | checked and already meeting the bar | Lines in Your factory (rename, type, order, archive, restore, delete for ever counted, merge); a job (rename on its front page with Undo, archive in Details, delete for ever counted); a job's lines (remove, Undo); a job's machines, tests, fixes, things found, install steps and notes (the record's drawer or page: Edit, Delete with Undo and what goes); materials and programs, a job's and a line's (in the row, Undo); Line capacity and Line standard (2 above, #4); actions and countermeasures (the sheet and the board's list, Undo); lever tree boxes (on the box, Undo and what goes); measures and periods; a problem's words in the register; a walk's video and a frame renamed. | — |
| 2.12 | 2 | left | The control room's jobs board and the Projects list open a job — rename and archive are one tap away (its front page, Details), not on the card. The old walk screen (`snag/SnagsScreen`) deletes a video asking first, with no Undo — the clip exists nowhere else, and holding it in memory for Undo is a decision. A work balance (a study on the line standard's People view) and a study listed in a job's Evidence (`ui/Evidence`) were not changed here — other work is in those files; the study they open now has Rename and Delete. | Open. |

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
| 4.21 | `lib/cost` → `lib/lineLoss` (the Pareto, the stopwatch's ticker and toast, the board's machines, the Report, Trend, the meeting, a Case's proof, the line map's heat, the line's facts and settings) | £ an hour while the line is down | **Was one blended figure**: idle labour + lost output added into one £, the lost output charged on every machine's stops. | Fixed 14 October (Rowland: "capacity loss units and labour"): two parts everywhere — the labour in £ for every stop, and the capacity lost in packs for the stops that stopped the line (its bottleneck from its Line capacity, or the whole line); with no Line capacity every stop is counted and the screen says so. Hand-worked tests (`lineLoss.test.ts`). | `docs/CAPACITY.md` §6; cost of downtime at and away from the bottleneck |

### Bar 3 — paper wherever there is a list

- (3), once a list has its paper: `scripts/acceptance/list-paper.mjs`
  presses each button, saves the PDF and reads it back against the module
  that makes the screen's words; `scripts/report-stress.mjs` checks the new
  reports at every size (off the page, overprinted, near-empty, lost).

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 3.1 | 3 | Line capacity — a product's page, and the list (`#/balances`) | A product's capacity — the sheet, the bottleneck, the V, a shift's make, what a pack costs — was on no paper of its own, and the list printed nothing. | Fixed: **PDF** on its page — one page: what limits the line and the module's sentence (where we are); the V, the bottleneck walked, the capacity sheet, only what is wrong to check (why); a shift, a pack's labour, the what-ifs tried, the people's work against takt (what we do) — `lib/capacityPaper`. **PDF (all shown)** on the list: a front saying every product shown in a row each, then each product's own. `report-stress` (tiny, ordinary, huge); `list-paper.mjs` 1–2. |
| 3.2 | 3 | Line standard — the list (`#/standards`) | Cards came one line's or one job's at a time — never for everything the list shows. | Fixed: **PDF (all shown)** — the line standard card for every product shown, each under its line's or its job's name (`lib/standardPdf`, `ui/ToolPapers`). `list-paper.mjs` 3; `report-stress` counts the cards. |
| 3.3 | 3 | Materials — a job's What we are waiting on | A list with no paper of its own; the client report carried only what is not in. | Fixed: **Materials report** — one page: how many are here; the late, how late, from whom and why their dates moved; what is still coming by the day; what has no date agreed; what is in, named once (`lib/materialsReport`, `lib/materialsPdf`). The list's "3 days late" words now come from the same module. `list-paper.mjs` 4. |
| 3.4 | 3 | Commission, Install, Set up, Hand over | Every test and every step has a card; the boards offered none for all of them. | Fixed: **Test cards** on Commission (every test on the board — its latest attempts, as the board counts them) and **Step / Item cards** on each gate — machine by machine, the card each record prints; each card numbers its own pages (`lib/trialCardPdf` numbers from the card's first page — a lone card unchanged). `list-paper.mjs` 5. |
| 3.5 | 3 | 6M board, lever tree, wins, next steps | Lists inside a job with no button of their own. | Has paper: the rail's **Reports** door — the client report prints the board by bone, the tree, the wins and what is next. Nothing added: a second door to the same report would be one thing in two places. |
| 3.6 | 3 | Programs — a job's and a line's | — | Has paper: the Programs report on both. A program has no card of its own, so none for all. |
| 3.7 | 3 | A line's page — its machines and the line itself | The line on one page (its facts, machines, programs, problems, tools); labels for a line's machines. | Open, planned: BLUEPRINT §6.5 — the line report comes with the line as the hub (Stage 3). Its problems already print (report and cards); a machine label needs the machine's own page to point to, which a line's machine does not have yet. |
| 3.8 | 3 | Notes | — | Not paper, by design: private preparation, left out of every document (`screens/NotesScreen`). |
| 3.9 | 3 | The studies' lists (Capability, Value stream, SMED, Work sampling, Loss count) | — | Fixed: row 7 above — PDF on every study's page and PDF (all shown) on every study list. |
| 3.11 | 3 | The control room | A job's papers were all on its Reports sheet; the control room had one paper (its one page) and no index — Rowland, 14 October: "report is there but only in projects not in the control room … we need the same in control room". | Fixed: **Reports** in the control room's rail (and More on a phone, on every page off a job) and **All reports ›** in the band — the control room's papers (its one page, made there; Your factory, Control room problems, Programs, Line capacity, Line standard, the studies), each line's (its problems, its week on one page, its evidence cards) and every job's own list under its name — the very doors its Reports sheet shows (`ui/ControlRoomReports`, `ui/ReportsSheet JobPapers`). `control-room.mjs` 12. |
| 3.10 | 4 | Line capacity — the V-curve | A station thousands of times faster than the bottleneck (a unit or a rate typed wrong) drew the V's grid in steps of 40 to millions of lines: the tab ran out of memory. Found by the random capacity seeds that prove the new paper. | Fixed: past 400% the grid's step grows with the span — a handful of lines whatever is typed; a share past what a number holds draws no grid rather than looping for ever (`ui/VCurve`). `report-stress --seeds`. |

### Bar 8 — the stage-gate papers keep up with the app, 14 October

Rowland, 14 October: "Check the stage gate report must make sure they
maintain relevance when things change in the app .. new functions the app
does but also all changes in status. Check full report, 1 page status,
programs, handover." Each paper was read against what the screens now say.

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 8.1 | 8 | all four | **The line's own programs** (Stage 2, planned on the line with no job, shown on the job's Programs page and proved by its tests) were on none of them. | Fixed: the full report's Set up and the programs report print each line's reading after the job's — "On Line 7, with no job — 2 programs · 1 done · 1 late" and every program; the status page a line under the programs; the handover the reading and the ones not done (`lib/lineRecords jobLinePrograms`, `jobLineReadings` — the job's Programs page reads the same). The Programs page's own PDF carries them too. |
| 8.2 | 8 | all four | **Problems taken on the register for the job, not on it yet** (the Fixes page's "Problems for this job — not on it yet") were on no paper — the status page could say "everything is on plan" over a Critical one. | Fixed: the full report's own section, each with its priority tag in its word and RAG colour, where, whose, and its day (red only when gone); the status page's NOT ON IT YET — a Critical one read with the critical issues, High and Low after the problems — opening the problem where it is kept; the handover lists each on the machine it names, else on the line. |
| 8.3 | 8 | full, programs, the job's Programs page | **A program proved by a study on its line** read "Signed off by hand — nothing said shows it" (amber): only the job's own studies were read. | Fixed: the studies of the job's lines are read, as the line's Programs page reads them; a line's program proved on another job's test says its test. |
| 8.4 | 8 | full, status | **A machine late on site** — the control room's and Install's Needs you's first line — was on neither. | Fixed: first in Install's late list ("Domino coder — not on site, was due 11 Oct"), counted in its line, a LATE line on the status page that opens the machine. |
| 8.5 | 8 | handover, full | **Still open on a machine** left out a program that failed, was not tested, had no program or was not proved (only one not written yet was named), and every problem with no fix; "handed over with" counted neither. | Fixed: each named in the Programs page's word ("Program, didn't pass: PR-04 — Bag 8 mm short"), the problems with no fix (critical and high risk said), the machine's programs in a line; "handed over with" counts them, the same words on the full report (`lib/clientReport wentWithAlso`). |
| 8.6 | 8 | full, status | **What a gate's Needs you says is missing** (flow audit #16 — a machine with none of the gate's stages) was not on paper; the gate's line counted only the squares. | Fixed: "Not added yet" under the gate, in Needs you's words, and "· 2 machines with none yet" in its line; one grey NOT ADDED line a gate on the status page, last. |
| 8.7 | 8 | full | **A test proved by a study at the line** said so on the handover and not under the test on the full report. | Fixed: "Proved by: …" under the test. |

