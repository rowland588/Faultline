# The flow audit: the app walked as Rowland would

Rowland, 13 October: *"basic functionalities, basic user interfaces, basic
user experiences, flow, fluency, simplicity, our lean methodology is likely
still not appropriate, not there ... we are getting better as we bring things
more centralised into the control page ... it's likely the initial backbone we
started still needs more."*

**Placed (BLUEPRINT §8).** This covers every layer and adds no record. It is
bars 6 (no dead ends) and 7 (simple with detail) of `docs/AUDIT.md`, and the
method (`docs/OPEX.md`'s loop), checked against §1–§4 of the blueprint. **These
are findings only. Nothing here is built.** Each one is ranked, worst first,
and says where it happens, what happens, why it matters, the smallest fix that
closes it, and its effort: **S** is a file or two in a day, **M** is a few
modules and an acceptance step, **L** is a blueprint stage.

**How it was walked.** The code at `677c03e`, on the smoke seed
(`src/dev/seed.ts`), in Chromium at 1280 px (a desk) and 390 px (a phone).
Every control was pressed and every screen read from the DOM, by journey:

- (a) setting up the factory and a line, then adding machines and programs;
- (b) a problem seen on a line, raised, worked, closed and put on paper;
- (c) 6M, from the gap to the 6M report;
- (d) stage gate, from Install to the client report;
- (e) a tool used on its own, then linked to a job;
- (f) the control room.

Three fixes on the `ways-out` branch are not in this tree and are left out:
the × on every sheet, Ppk and Cpk, and every study on paper. One example is
that the 6M's *On paper* sheet still has no × here.

Screenshots of the worst ten are in `docs/flow-audit/`.

---

## The diagnosis in three sentences

1. **The control room and a line page each see half the factory.** The
   control room counts what is late or critical in the jobs. A line page
   counts the problems taken straight on the line. A Critical problem with no
   job behind it is missing from the control room's numbers. A Critical
   problem inside a job is missing from its line's page.
2. **Some real things still have two homes, and the two disagree.** A program
   can read *Proved* on its line and *Failed* on its job. A job's line can
   have a different name, its own capacity, its own walk and its own page.
3. **The lean loop is drawn, but its two ends are loose.** The gap is a number
   typed into the job, not counted from the line. Holding the gain is a tick
   that nobody is ever chased for.

## The lean loop, walked (OPEX.md's six moves)

| Move | Where it shows today | Where it breaks |
|---|---|---|
| 1 Standard | Line capacity (plate speed, bottleneck), Line standard, SMED's standard | Products are free text, so a line's capacity, SMED and programs never join on one product. The line page says *1 on this line*, not what the standard is (#10). |
| 2 Gap | A 6M job's *Are we on target?* and its Numbers | The number is typed. A loss count that says *41 min lost* never reaches it. A new 6M job on a line that already has counts starts at *Not measured yet* (#8). A line with no job has no gap anywhere. |
| 3 Priority | The Pareto beside the fishbone (*vital few*), with no hiding — good | You only reach it inside a 6M job. A line page has no Pareto and no *where the time goes*. |
| 4 Cause | The fishbone, five whys, how each cause is known, the suggestions — strong | A problem raised on the floor cannot become the head of the fish (#13). The suggestions offer late programs and late materials on every problem (#18). |
| 5 Countermeasure and proof | The board's *should change*, *Did it work*, before → after on a loss count or a study | A register problem closes with one tap and no proof (#12). |
| 6 Hold | *Kept by* on a closed 6M problem | Whether a check is overdue is worked out only on the 6M PDF. It never appears on a screen, in Needs you or in the control room. *Standard updated* is a tick, not a link to the standard (#9). |

---

## The findings, ranked

| # | Route | Finding | Smallest fix | Effort |
|---|---|---|---|---|
| 1 | `#/` | The control room is blind to work on a line with no job. A Critical problem on Line 7 that is 3 days late and owed by Priya changes none of *10 late*, *1 critical*, *Who owes what*, *This week* or the control room report. | Feed late or critical line problems and late line programs into the items behind the four tiles, *Who owes what*, *This week* and the report. Make the line card's *late* and *critical* red. | M |
| 2 | `#/lines/:id`, `#/snags?line=` | A line does not see its jobs' problems. Line 7 — smoke test says *1 problem open (Low)* while the job on it holds a Critical, a High risk and 5 more. Filtering the register by line drops every job problem. 6M problems show on no line page and in no register. | When a line is chosen, keep the job groups for the jobs on that line. Add 6M cases as rows. Have the line page read the same register reading. | M |
| 3 | `#/programs` vs `#/project/:id/programs` | One program, two records, two answers. PR-04 is *Proved 12 Oct* on the line and *Failed · closed 13 Oct* on the job. PR-12 is *On the machine, testing 16 Oct* on the line and *baseline achieved, done 13 Oct* on the job. | Have the gate's list read `programs`. Until it does, show the other record's state beside each row and refuse to say *done* for a failed program. | M |
| 4 | `#/snags` (the problem editor) | If you type who owes a problem and then the due date, the name is lost while the screen says *Saved*. | Merge the edit into the latest stored row, not the copy from the last render, by patching by id and field. | S |
| 5 | Problem button inside any job | A problem taken inside Line 2 commissioning is filed on *Line 7*, which is the last line used, not the job's own line. | When a job is open, default the sheet to that job's factory line (`lib/lineRecords`). Ask if the job has several lines. | S |
| 6 | `#/` → tap *1 critical* | The critical list is unreadable. At a desk the problem is a 63 px column; on a phone it runs off the edge. | Move the *going with* sentence into the row's branch line and let the date column wrap. | S |
| 7 | `#/project/:id/line/:lineId`, the job's rail | A job's line is a second line page with other names, an empty capacity and an empty walk. *Line 7 — smoke test* is also called *Line 8* and *Line 2*. | Point the job's line entries at `#/lines/:ws` with the job named, using the factory's name. Link to the factory line's capacity and walk instead of offering new ones. | M (Stage 4 is L) |
| 8 | 6M front page, Numbers, *Open a problem* | The gap is typed, not counted. Line 7 pace is *On target* at 44 a minute. Line 7's own count says 91 a minute against a plate speed of 100, with 41 to 85 min lost a shift. *The constraint* says *not counted yet* although a capacity for that line is on that job. | Offer the loss count's rate as the reading. Show the line's capacity beside the target. Have the job read the line's capacity. Remove *OEE* from the example. | M |
| 9 | Fishbone problem panel, Needs you, `#/` | Holding is never chased. Whether a check is overdue is worked out only in the 6M PDF. *Standard updated* is a tick. The check's date shows as *2026-10-12*. | Move the overdue rule into `lib/sixm`. Show *check due* on the card. Add it to Needs you and *This week*. Link *standard updated* to the record. | S–M |
| 10 | `#/lines/:id` | The line page counts records instead of saying what they found: *Loss count · 2 on this line*. Its jobs show no state. | Give each tile the tool's latest sentence, which every list already has. Give each job its verdict. | S–M |
| 11 | `#/` at 390 | On a phone the answer is below the fold. The first screen shows *New project*, *Your factory* and the line cards. The Problem button covers the headline. The bottom bar shows jobs and not lines. | On a phone, put the hero first. Make the bottom bar *Control room · Problems · Lines · More*. | S–M |
| 12 | `#/snags`, Closed | A problem closes with no proof, even when its last step says *jammed again*. | On *Closed*, ask in one optional line what shows it is fixed. Count *closed this week* on the line page. | S |
| 13 | `#/snags` → 6M; fishbone *+ Open a problem* | A problem seen on the floor cannot become the head of the fish. | Add *Find the root cause ›* on a register problem whose line has a 6M job. Have *Open a problem* list the line's register problems. | M |
| 14 | Every *which machine* | One line has three lists of machines. The problem sheet offers another line's machines. The stopwatch offers 1 of 4. Capacity stations never reach the line's list. Install offers none. A study's machine is typed. | Give every picker one source: the line's machines from `lib/lineRecords`, plus the job's machines on that line only. | M |
| 15 | `#/capability/:id` *Use it for…* | The picker lists 20 tests and fixes with no grouping. *Performance run* appears twice with no machine named. A weight study is offered *Emergency stops*. Attaching it to a job leaves it *On no line*. | Group by machine, with the study's machine first and named. Take the job's line when the job has one. | S |
| 16 | Rail, gates, client report | Counts disagree with the page. The rail says *Problems 5*, but 7 problems have no fix. *3 of 5 programs done* includes one that failed. Hand over's Needs you says *Nothing* while 2 of 3 machines have no stages. Install's Needs you misses a machine 3 days late. | Count the abnormal and say it in words, gate by gate. | S |
| 17 | 6M *Reports* | Eight papers on one sheet. *Spreadsheet* is described as *the start-up record of every project*. | Offer the status page and the full report first, with the per-line papers folded under them. Word the spreadsheet for this job. | S |
| 18 | Fishbone suggestions | Every problem is offered P-150, P-130 and P-160 under Method and the jaw heater under Material. | Only suggest items on the problem's line or machine, or that match its words. | S |
| 19 | Line → *Start a project on this line* | It opens a method picker that does not say *Line 7*. The new job starts from nothing. It says *Open the first problem: Done* because another job's problem counts. | Show the line's open problems and top loss above the three choices. Count only the job's own problems. | M |
| 20 | Many | Old or untrue words: *Which asset?*, *1 asset*, *Maps and balance*, *THE BACKBONE*, *New project* beside *JOBS*, Problems listed under *TOOLS*, *Line 2* for a job, *FROM* for who owes it, a walk mentioned in a footer where none exists, *Control room* in the header of a line. | A sweep, with a smoke word check. | S |
| 21 | `#/programs` | A line's program is *Proved* by a dropdown, with no test and no evidence. | *Proved* asks for the day and what showed it, or links a study or test. | S–M |
| 22 | Line → a problem | Tapping a problem lands at the top of the register, with the editor two screens down and behind the Problem button. The register has no way back to the line. | Scroll the opened problem into view. Add a *‹ Line 7* back link of fingertip size. | S |

---

## 1. The control room is blind to work on a line with no job

**Where:** `#/` (`ui/JobsBoard`, `lib/portfolio`, `lib/controlRoomReport`,
`lib/controlRoomPdf`). Screenshot: `flow-audit/01-control-room-misses-line-work.png`.

**What happens.**

1. On Line 7's page I raised *Bagger jaw jams on 2kg film*, made it Critical,
   gave it to Priya Shah and made it due 10 Oct.
2. I also planned a program, P-200 Express, owed by Ishida Europe, with a test
   day that has passed.
3. The control room's headline still said *3 jobs running … 10 things late*,
   with *10 late* and *1 critical*.
4. *Who owes what* had no Priya, and Ishida Europe still owed *3*.
5. *This week, across every job* did not list either item.
6. Line 7's card said *1 problem open · 1 program to prove · 1 late*, all in
   grey. The *1 late* is bold grey, not red.
7. The control room report says *CONTROL ROOM · EVERY JOB* and draws jobs
   only.

**Why it matters.** The control room exists to answer "am I in control?"
across every line and job. BLUEPRINT §1 rule 4 and §6.6 say "a line can be out
of control with no job on it". The page fails exactly there: the line's
problems and programs are counted on its card but never reach the four
numbers, the names or the list a person chases. That breaks visual rule 3
(only the abnormal number carries colour) and simplicity rule 1 (one number,
one place).

**Smallest fix.** Line problems that are late or critical, and line programs
whose test day has passed, become items in the same list as job work, with
the line's name in the place where a job's name goes. The four tiles, *Who
owes what*, *This week* and the report all read from that list already. The
line card says *late* and *critical* in red. **M.**

## 2. A line does not see the problems of the jobs on it

**Where:** `#/lines/:id`, the factory card, and `#/snags?line=:id`.
Screenshots: `flow-audit/02-line-page-hides-job-critical.png` and
`02b-register-on-line-drops-job-problems.png`.

**What happens.**

- **The line page and its factory card.** Line 7 — smoke test says *1 problem
  open — LOW seeded snag 0*. Line 2 commissioning runs on that line and has 7
  open problems, among them the Critical *Programs cannot be copied over* and
  the High risk *Recipes may need re-validating*.
- **The register filtered to that line** shows the one Low problem.
  `QuickSnagsScreen` builds the job groups as
  `lineF !== 'all' ? [] : …`, so choosing a line empties them. The comment
  above says "a line chosen shows that line's only".
- **The 6M problems.** The 6M job's problems (`cases`) are *Reject bin full by
  10am* on Line 7 and *Basketer minor stops*. They are on no line page and
  nowhere in the register. Line 7's page said *Nothing open on this line*
  while one of them was *Finding the cause* (`flow-audit/10-…`).

**Why it matters.** BLUEPRINT §4: a problem is "listed, late in red" on its
line page and is in the register. Rowland, 12 October: "everything should
still stay in the control problem page, because that's the page that has
everything." The line page is meant to be the hub for one line, and today it
misses the most serious problems on that line.

**Smallest fix.**

- When the register is filtered to a line, keep the groups for jobs on that
  line, narrowed to it.
- Add a 6M job's open cases as rows, each with its phase and a link to its
  fishbone.
- Have the line page's *Problems* read the same register reading.

**M.**

## 3. One program, two records, two answers

**Where:** `#/programs?line=` and the line page, against the job's
`#/project/:id/programs`. Screenshots: `flow-audit/03a-program-proved-on-the-line.png`
and `03b-same-program-failed-on-the-job.png`.

**What happens.**

| Program | On the line (`#/programs`) | On the job's Programs gate |
|---|---|---|
| PR-04 Finest Red 2 kg | Proved 12 Oct | Failed · closed 13 Oct, *Bag length short by 8 mm* |
| PR-12 Express 1.25 kg | On the machine, testing 16 Oct | Baseline achieved, done 13 Oct |

- The job's gate lists the parts of its Set up stage. Those have their own
  five statuses, and the gate and the client report count a failed program as
  *done*: *3 of 5 programs done — 1 passed, 1 at baseline, 1 failed*.
- The line lists the `programs` records, which have three states.
- The gate's own words say the line's programs are "the same records the line
  and the control room show". For these rows they are not the same records.

**Why it matters.** BLUEPRINT §2 says a program has "one home per real thing"
and §3 says "the same records, not copies". A program shown as proved on the
line and failed on the job is the wrong answer in one of two places, and the
person reading cannot tell which.

**Smallest fix.** Until the gate reads `programs` (Stage 4):

- show the line record's state beside each gate row that names it;
- never count *failed* as *done*;
- when a part fails, drop the line program back to *on the machine*, which is
  what `lib/programs` says a failed test does.

**M.**

## 4. If you type who owes a problem and then its due date, the name is lost

**Where:** the problem editor on `#/snags` (`snag/QuickSnagsScreen.tsx`,
`put`, around line 232). Screenshots: `flow-audit/04a-whose-typed.png` and
`04b-whose-lost-after-the-date.png`.

**What happens.**

1. In WHOSE I typed *Sam Lee* and pressed Tab.
2. I typed the date into DUE and pressed Tab.
3. WHOSE went back to *Priya Shah*, the earlier name, and the page said
   *Saved*.

I reproduced it twice. When the two boxes are filled at a slower pace, the
name is kept.

`put` merges into `byId.get(id)`, which is the copy of the row from the last
render. The owner is written when you leave the box. The date is written a
moment later, from a copy that still has the old owner, so the second write
silently undoes the first.

**Why it matters.** "Who owes what by when" is the one thing a problem record
must keep. This is CLAUDE.md's "a push that lands over somebody else's"
happening on one device.

**Smallest fix.** Have `put` merge the edit into the row as it is stored now:
`updateSnag(id, patch)` reads the stored row and writes the fields in one
transaction. Then check the other editors that use the same `{ ...s, ...p }`
pattern. **S.**

## 5. A problem taken inside a job is filed on the wrong line

**Where:** the Problem button on any `#/project/:id/…` page
(`snag/QuickSnag.tsx` line 78:
`useState(snag?.workspaceId ?? wsId ?? recall('line'))`). Screenshot:
`flow-audit/05-problem-from-a-job-filed-on-another-line.png`.

**What happens.** On Line 2 commissioning, whose factory line is Line 7 —
smoke test, the Problem sheet opens with *LINE: Line 7* and *PROJECT: Line 2
commissioning*. Line 7 is the last line used, and it is a different line. The
same happens from the 6M job. Pressing Save files the problem on the wrong
line with no warning.

**Why it matters.** A problem is filed against its line, and the line is what
the register, the line page and the paper are sorted by. A problem seen during
commissioning then turns up on another line's page.

**Smallest fix.** When a job is open, the sheet starts on that job's factory
line (`lib/lineRecords`). If the job is on several lines, it asks which, just
as it already asks for the machine. **S.**

## 6. The critical list is unreadable

**Where:** `#/`, tap the *1 critical* tile (`ui/JobsBoard.tsx` `.jb-fi`;
`styles.css` around 6602 and 8842). Screenshots:
`flow-audit/06a-critical-list-squeezed-desk.png` and
`06b-critical-list-cut-off-phone.png`.

**What happens.**

- **At 1280 px.** *Programs cannot be copied over from the old line* wraps one
  or two words to a line in a column 63 px wide. *open · going with: Put a
  production belt in…* runs across the rest of the row, and the job's coloured
  rule sits over the words.
- **At 390 px.** The row runs off the right edge (*…bypass the rob*, *…eac*).

The *when* column has `nowrap` and holds the whole sentence, so it takes the
row. The *10 late* list next to it is fine, because its *when* is a date.

**Why it matters.** The list of critical items is the three-second answer to
"what could stop us". It is the one list that has to read at a glance.

**Smallest fix.** For a critical item, put the *going with* sentence into the
branch line underneath (grid area `b`). Let *when* wrap, with a max width. **S.**

## 7. A job's line is a second line page with its own name and its own empty tools

**Where:** the job rail and `#/project/:id/line/:lineId`. Screenshots:
`flow-audit/07a-job-rail-other-names-for-the-line.png` and
`07b-job-line-page-capacity-and-walk-again.png`.

**What happens.**

- **The line has several names.** Your factory calls the line *Line 7 — smoke
  test*. Line 2 commissioning's rail lists its lines as *Line 7* and *Line 8*,
  both unlabelled under TOOLS, and *Line 8*'s page carries the walk and
  problems of *Line 7 — smoke test*. The job's footer says *L7 · L8*. In the
  control room the job is *Line 2*, because `lib/portfolio shortName` strips
  *commissioning*.
- **The job's Line 7 page offers tools that already exist.** On the 6M job, it
  shows *Line capacity — not counted yet — Add the stations…* and *The line,
  filmed — No walk filmed yet*. Line 7 in the factory has a Line capacity
  record for Maris Piper, *Bagger limits at 100*, which is attached to that
  same job. It also has stops timed. The fishbone's *Open a problem* says
  *The constraint: the line capacity is not counted yet*.
- **6M tools on a stage gate.** The stage-gate job's line page carries 6M
  *Actions — which bone it sits on* and *Wins*.
- **Old screens at the foot of the page:** *Time and film: Capture · Analyse ·
  Evidence · Meeting*, and *Maps and balance* in the rail.

**Why it matters.**

- BLUEPRINT §1 rule 2: a job owns no line; it points at the line.
- §5.6: no more hidden walk workspaces.
- Bar 6: every page says where it is.

Rowland's "old system entangled with new models" is visible here: a person in
a job is invited to build capacity and film a walk a second time.

**Smallest fix (before Stage 4).**

- The job's line entries open `#/lines/:ws` (the factory line), showing the
  job, and use the factory's name.
- The job's line page drops its own capacity and walk blocks and links to the
  line's.
- Remove the *commissioning* strip from `shortName` now that real line names
  share the screen.

**M** (the full move is Stage 4, **L**).

## 8. The gap is typed, not counted, so 6M can say *On target* while the line's own counts disagree

**Where:** the 6M front page (*Are we on target?*), Numbers, the fishbone's
*Open a problem*, and a new 6M job's *Getting it running*. Screenshots:
`flow-audit/08a-new-6m-on-line-7-starts-from-nothing.png` and
`08b-6m-on-target-while-the-line-loses-41-min-a-shift.png`.

**What happens.** Line 7 has three rates that never meet:

| Source | What it says |
|---|---|
| The 6M measure, typed | 44 packs a minute against a Q1 target of 39: *On target* |
| Its loss count, counted | 40,900 made in 450 planned minutes, about 91 a minute, against a plate speed of 100. 41 min lost on 12 Oct and 85 min on 11 Oct. |
| Its Line capacity | Bagger 100 bags a minute, *target 100 met* |

A new 6M job started on Line 7 opened at *Not measured yet*. It asked for the
measure (*packs per minute, waste, OEE*), a target and a first reading by
hand, and offered none of the counts the line already holds.

**Why it matters.** OPEX.md: "Standard — what good looks like … Gap — the
line's number against its target." The standard here is the plate speed and
the bottleneck. A gap that does not start from the standard lets a line be
*On target* while it loses 41 minutes a shift. *OEE* also contradicts the
decision of 10 October: "No OEE".

**Smallest fix.**

- On a 6M job's Numbers, offer each loss count on its line as a reading in
  one tap: good packs ÷ planned minutes, said as counted.
- Show the line's capacity under the target (*can make 100 a minute*).
- Have *The constraint* read the line's Line capacity.
- Take OEE out of the example.

**M.**

## 9. Holding is never chased

**Where:** the 6M problem panel, *4 Did it work* and *Kept by*
(`ui/ProblemCard.tsx` line 606); the job's Needs you; `#/`. Screenshot:
`flow-audit/09-hold-check-never-chased.png`.

**What happens.** A closed problem shows *Kept by: One changeover timed
against the standard each week · Rob Scott · every week · standard updated ·
last checked 2026-10-12*.

- Whether the check is overdue is worked out in only one place,
  `lib/sixmReportPdf.ts` (around line 418), so it shows only on paper.
- No screen says *check due*, and nothing reaches Needs you or the control
  room's *This week*.
- *Standard updated* is a yes or no. It does not point at the line standard
  or SMED that was changed.
- The date is printed in ISO form, against *12 Oct* everywhere else.

**Why it matters.** OPEX.md: "**Hold** — the new way written into the
standard, and one check that it stays", and Six Sigma's control plan,
"what happens if it slips". A check nobody is asked to make is the "field
nobody is asked to fill in" that CLAUDE.md calls a gimmick, and holding the
gain is where lean improvements usually fail.

**Smallest fix.**

1. Move the overdue rule into `lib/sixm`.
2. Put *check due 19 Oct* (amber) or *check missed* (red) on the card and the
   fishbone head.
3. Add an overdue check to the job's Needs you and to the control room as an
   item owed by the check's *who*.
4. Write the date as *12 Oct*.
5. Later, *standard updated* links to the standard it changed.

**S–M.**

## 10. A line page counts records instead of saying what they found

**Where:** `#/lines/:id`, *Tools on this line* and *Jobs on this line*.
Screenshot: `flow-audit/10-line-page-counts-not-findings.png`.

**What happens.**

- The tiles read *Line capacity · 1 on this line*, *Loss count · 2 on this
  line* and *SMED · 1 on this line*.
- The lists behind them already say *Bagger limits at 100 bags/min · target
  100 met*, *Shift 1 yesterday: 41 min lost* and *42 min, 15 min external
  inside*.
- *Jobs on this line* names each job and its method, with no verdict:
  *Line 2 commissioning — Stage gate ›*, and the job is behind target with a
  Critical problem.
- The page has no number, no target, no trend and no products readiness. The
  last is Stage 3, not yet built.

**Why it matters.** CLAUDE.md: "a screen that shows information without
saying what it means for the project is a gimmick." The line page is the hub
(§3) and should answer "where is it" on its first screen.

**Smallest fix.**

- Each tile carries its tool's latest sentence, the one its list already
  shows.
- Each job carries its verdict word and its late count.

That gives the line page "where it is" before Stage 3 adds the products grid.
**S–M.**

## 11. On a phone, the control room's answer is below the fold

**Where:** `#/` at 390 px.

**What happens.**

- The first screen holds the title, *New project*, *Your factory* (on two
  lines beside two stacked buttons) and the line cards.
- The hero's headline starts at the foot of the screen, at about y = 690,
  and *10 late · 1 critical · Who owes what* are below the fold.
- The Problem button sits over the headline.
- The bottom bar is *Control room* plus each job plus *More*. The lines and
  Problems are behind *More*.

**Why it matters.** SIMPLE.md says the first screen is the answer. On the
floor the ops lead has the phone, and the backbone is now lines.

**Smallest fix.**

- Below 720 px, put the hero (headline, tiles, Who owes what) before the
  factory cards.
- Make the bottom bar *Control room · Problems · Lines · More*, with the jobs
  inside *More* or the job switcher.

**S–M.**

## 12. A register problem closes with no proof

**Where:** `#/snags`, WHERE IT STANDS → *Closed*.

**What happens.** One tap closes it. The problem's last journey step read
*Ran 2 h without a jam, then jammed again*, and it still closed with nothing
asked. It then disappears from the line page; *Done · 1* is counted only in
the register.

**Why it matters.** Proof (OPEX move 5) exists on the 6M (*Did it work*) and
on a job's fixes (before → after), and not on the register, where most floor
problems live.

**Smallest fix.**

- *Closed* opens one optional line: *What shows it is fixed?* (a day, a
  count, a photo). It is kept as the journey's last step.
- The line page says *2 closed this week*.

**S.**

## 13. A problem seen on the floor cannot become the head of the fish

**Where:** the problem editor on `#/snags`, and the fishbone's *+ Open a
problem*.

**What happens.**

- A register problem on Line 7 shows on the 6M job's Line 7 page only under
  *The line, filmed*, as *Written without a frame*, and never as a 6M
  problem. Its editor has a PROJECT box and no *find the root cause*.
- *Open a problem* offers the line's gap, the top Pareto bar, the constraint
  and *Something seen — Open it*, with free text. It does not offer the
  line's open register problems.

**Why it matters.** OPEX: "State the problem … it comes from the gap or a
Pareto bar". Something *seen* is the third door, and today it means typing
the problem again.

**Smallest fix.**

- *Find the root cause ›* on a register problem whose line has a 6M job opens
  a case seeded with its words and photo, links the two, and closes the
  register problem as *taken to 6M*.
- Under *Something seen*, list the line's open register problems.

**M.**

## 14. One line has three lists of machines

**Where:** every *which machine*.

**What happens.**

| Place | What it offers |
|---|---|
| The Problem sheet on Line 7 | Bagger and Checkweigher, plus Ilapak flow wrapper, Ishida checkweigher and Domino coder, which are another line's job machines (`machinesFor = line assets + jobMachines`) |
| The stopwatch on Line 7 — smoke test (*Which asset?*) | 1 of the 4 machines its line page lists. Its stops are logged against *Bagger*, which is on no list of that line. |
| Line 7's Line capacity | *Bagger, Checkweigher, Packer*, while the line page said *No machines listed yet* |
| Install's *Add a machine* | Nothing from the line |
| The capability study | A typed name, *Ishida CCW-RV-214W multihead weigher*, not the line's *Ishida checkweigher* |

**Why it matters.** BLUEPRINT §6.2: "Every 'which machine' offers them." The
machine name is what a stop, a problem and a station are kept against, so
three lists mean evidence that never adds up.

**Smallest fix.**

- One function in `lib/lineRecords`, *machinesOf(line, job?)*: the line's own
  machines, then the job's machines on that line only.
- Every picker reads it.
- A machine typed as new joins the line's list, which the line page already
  does.

**M.**

## 15 to 22, in brief

**15. *Use it for…* on a study** (`#/capability/:id`).

- It lists 20 rows: every test on the job and every fix twice (*How we know it
  was needed*, *Proves it worked*), with no machine named.
- *Performance run at the agreed rate* appears twice.
- A weight study is offered *Emergency stops*.
- Attached to a job, the study still says *On no line*.
- Fix: group by machine, put the study's machine first and name it, and take
  the job's line. **S.**

**16. Counts that disagree with their page.**

- The rail says *Problems 5*, which counts fixes, while 7 problems have no
  fix, including the Critical.
- The Programs gate, the client report and the rail say *3 done … 1 failed*:
  a failed program counts as done.
- Hand over's *Needs you: Nothing* while 2 of 3 machines have no handover
  stages.
- Install's Needs you misses the Domino coder, 3 days late on site, which the
  control room lists as late.
- The client report's performance runs say *Performance run at the agreed
  rate — Ilapak flow wrapper* three times, with three verdicts and no product
  named.
- Fix: count and say the abnormal, gate by gate, and name the product on a
  run. **S.**

**17. The 6M's *Reports* sheet.**

- It offers eight entries: the client report three times, evidence cards
  twice, the one-page report twice, and a spreadsheet described as *the
  start-up record of every project*.
- SIMPLE.md asks for "two, from one button, the short one first".
- Fix: the status page and the full report at the top, the per-line papers
  folded under them, and the spreadsheet worded for this job. **S.**

**18. Fishbone suggestions not about the problem.**

- Every problem is offered *P-150 perforation not proved* under Method, and
  *Upgraded jaw heater is 1 day late* and *Perforated film is 3 days late*
  under Material, whatever its head says.
- Breadth is good, noise is not.
- Fix: suggest only items on the problem's line or machine, or matching its
  words. **S.**

**19. *Start a project on this line ›*.**

- It opens Projects with three method cards and does not say *Line 7*. The
  line is only preselected further down.
- None of the line's situation is offered: its problems, top loss and late
  program.
- The new 6M then reports *Open the first problem: Done* because another
  job's case on the line counts.
- CLAUDE.md: "start a change from the situation (not from a method picker)".
- Fix: a heading *A change on Line 7*, the line's open problems and top loss
  above the three cards, and only the job's own problems counted. **M.**

**20. Old or untrue words** (bar 6, simplicity rule 3).

- *Which asset?* and *1 asset* on the stopwatch and walk.
- *Maps and balance* in the rail.
- *THE BACKBONE* as the factory's eyebrow.
- *New project* beside a rail headed *JOBS*.
- *Control room problems* listed under *TOOLS*.
- *Line 2* for a job (#7).
- *FROM* as the label for who owes a program.
- *· the line walk filmed in the app* in the footer of a job with no walk.
- *Control room* in the header on Your factory, a line and every tool.
- The ISO date in *Kept by*.
- Fix: a sweep, and add *asset* and *balance* to the smoke word check. **S.**

**21. A line's program is proved by a dropdown.**

- *Where it's got to → Proved* with no test, no evidence and no person named.
- `lib/programs` allows it "by hand" for programs proved before the app.
- On a line with no job there is no way to plan the proving test, so the
  hand route is the only route.
- LEAN40 principle 6 is "proved, not asserted".
- Fix: *Proved* asks for the day and what showed it, or links a study. **S–M.**

**22. From a line page, a problem opens far from where you tapped.**

- It lands at the top of *Control room problems*; the opened editor is two
  screens down, behind the Problem button on a phone.
- The register has no link back to the line it came from.
- The line page's own way back is *Your factory ›*, 14 px tall. Programs'
  way back is the same.
- Fix: scroll the opened problem into view, and give a fingertip-sized
  *‹ Line 7* when the page was opened from a line. **S.**

---

## The journeys, step by step: what works and what breaks

**(a) The factory, a line, machines and programs.**

- **Works.** Your factory lists the lines, and names and types are edited in
  place. A line opens to its page. *Add the machine* adds machines in flow
  order with their makers. *Plan a program* opens Programs on that line, keeps
  the form open for the next one, and its *What it runs* offers the line's
  products.
- **Breaks.**
  - The factory page cannot add a machine. You have to open the line, so there
    are two ways in.
  - Machines named on Line capacity, SMED and loss counts never reach the
    line's list (#14).
  - Programs' way back goes to *Your factory*, not the line it was opened from
    (#22).
  - A program is proved by a dropdown (#21).
  - Products are free text, so the line's products never join up across
    tools. This is Stage 3.

**(b) A problem on a line.**

- **Works.** Raised from the line page in two taps: a photo, the words, the
  machine and the priority. Its journey steps and card work. Closed problems
  are kept and counted.
- **Breaks.**
  - The register opens at the top (#22).
  - Who owes it is lost (#4).
  - It closes with no proof (#12).
  - It cannot go to root cause (#13).
  - Taken inside a job, it lands on the wrong line (#5).
  - It does not reach the control room's numbers (#1).
  - The editor carries *Rename this line*, a third way to rename a line after
    Your factory and *Edit the line*.

**(c) 6M.**

- **Works.** The fishbone page is the method at its best: the Pareto with the
  vital few, the head of the fish measured, the six bones, how each cause is
  known, whys and roots, fixes with *should change*, *Did it work*, *Kept by*,
  and a *Read it through*.
- **Breaks.**
  - The gap is typed (#8).
  - The 6M problems are on no line page and in no register (#2).
  - The job's own line page repeats capacity and the walk (#7).
  - Holding is never chased (#9).
  - The suggestions are noisy (#18).
  - The paper sheet has eight entries (#17).
  - The rail is *Fishbone, Board, Lines, Numbers, Wins, Evidence*. The order
    of the loop (standard → gap → priority → cause → fix → hold) is not
    visible: *Numbers*, the gap, comes after the fishbone, and the job's line
    page puts the readings below the whole fishbone.

**(d) Stage gate.**

- **Works.** The front page answers the three questions (*Behind target*, the
  critical item with its cost and its workaround, Needs you). Install and
  Commission are one board each with Needs you.
- **Works.** A capability study attached to the job, used for *Weight
  accuracy — 400g*, shows *passed 9 Oct · Cpk 0.67* on the board.
- **Works.** The client report shows the status page first.
- **Breaks.**
  - Programs have two homes (#3).
  - The rail's counts disagree with the pages (#16).
  - The job's line has other names (#7).
  - *Add a machine* on Install does not offer the line's machines (#14,
    Stage 4).
  - *Use it for…* is a flat list (#15).

**(e) A tool on its own, then linked.**

- **Works.** Loss count, Line capacity, SMED and the study start on a line
  with no job. Each says *On no line · on no job*, then *Put on a line* and
  *Attach to a job*. *Used for* links the record to a test or a fix as proof,
  and the fishbone offers each tool's findings as causes, which is the strong
  part.
- **Breaks.**
  - Opening a tool attached to a job switches the rail to that job, with its
    old *Line 7 › Capture … Maps and balance* entries.
  - Tool lists have no paper (`ways-out` adds it).
  - The line page shows the tools as counts (#10).

**(f) The control room.**

- **Works.** For jobs it is clear: the headline sentence, four tiles that
  filter in place, *Who owes what* by party, *No date agreed*, *This week*
  late first, and the timeline.
- **Breaks.**
  - Lines with no job are invisible in every number (#1).
  - The critical list is unreadable (#6).
  - On a phone the answer is below the fold (#11).
  - A job is called *Line 2* beside real lines (#7 and #20).

---

## What holds, and stays (rule 1)

These work and should stay as they are while the findings above are fixed:

- the fishbone page and its problem panel;
- the stage gate's front page and boards;
- *Used for* (a study proving a test or a fix);
- the loss count's waterfall with *how known*;
- Line capacity's working;
- the register's journey;
- the control room's *Who owes what*.

Most of the fixes connect these pieces to each other. Almost none need a new
screen.
