# The upgrade audit — 16 October 2026

Rowland, 16 October: *"make the whole app the best it can possibly be, and to
prove that it is."* This is the read-only audit that came first: what was
looked at, how, what was found, ranked by impact against effort, and the order
the fixes go in. Nothing was changed while it was made. The build that follows
cites a finding by its code (F1, M3, S2 …) in each commit, and the closing
state of every row is written back here at the end.

## 1. How it was made

| Angle | How | Where the evidence is |
|---|---|---|
| The floor, as a first-timer | An empty device on a 390 px phone: set up a line, time a stop, name the machine, time it again, log a problem, find where it all landed. Every tap counted, every typed field counted, every place the words on the screen did not say what to press called a dead end. | `scripts/audit/floorwalk.mjs` (from the scratchpad walk), its log in §2 |
| Every page at three widths | 136 screens (smoke's list) at 390 / 768 / 1360, a full-page picture and a line of measurements each: words, buttons, buttons smaller than a fingertip, how far off the side, cut words, console errors. | §5 (D findings) |
| The maths from first principles | Line capacity (unit chain, rejects put back, running %, bottleneck, V, ILO rest, labour a pack, the three numbers, the mix, lanes), the IE tools (capability, balance, SMED, sampling, losses, value stream, forecasts) re-derived from `docs/CAPACITY.md`, `docs/TOOLKIT.md` and `docs/LEAN40.md` *before* reading the code, re-implemented as reference functions, compared on the seeds and on hundreds of random factories. | `src/lib/__tests__/audit-capacity-*.test.ts`, `audit-ie-*.test.ts` (harvested into the repo in Phase 2; each failing assertion resolved as *bug in the app* or *bug in the reference*, written beside it) |
| One number, one module | Eight numbers traced from the module that makes them to every screen and paper that shows them; the five layers (facts → figures → reading → verdict → act) checked tool by tool. | §4 (C findings) |
| Data, access, secrets | 74 migrations parsed for the intended schema and policies and compared with the mapper and the screens; the live `pg_policies`, `pg_trigger`, `pg_get_functiondef` and the realtime publication read back; the bundle, the repo and every branch's history scanned for keys. | §6 (S findings) |
| Sync, offline, time | The push engine's rev-conditional writes re-read; every place a date is made from a clock listed. | §6 (R findings) |
| The gate | The full gate run on the change in flight (slice 4 of the stage-gate redesign): 2,207 unit tests, smoke, 24 acceptance scripts, 699 random reports, the inventory, two devices against a fake cloud. | the gate log |

Two of the five parallel audit agents (capacity maths; sync/time) were cut
off by a spend limit before writing their reports; the capacity agent's
reference tests and derivations survived (`docs/CAPACITY-DERIVATIONS.md`) and
are the evidence used here; the sync/time angle was finished by hand. The
other three reports are kept whole under `docs/audit/`. Where a reference and the
app disagreed, the reference was checked by hand before the row was written —
three of the twelve failing capacity assertions were the reference's mistake
(it read the bottleneck off plate speed instead of effective speed; it rounded
8.75 down; it expected the word *units* where the line's unit is *bags*).

## 2. The floor walk — the baseline

Phone, empty device, first time. **15 taps, 4 typed fields, 2 dead ends** to
set up a line, time two stops and log a problem.

| Step | Taps | What happened |
|---|---|---|
| Open the app | — | "Set up your factory" is the one button. Clear. |
| Set up a line | 3 + 2 typed | Set up your factory → name, type → Add line → Done. Good: the type is kept for the next line. |
| Open the line | 1 | **Soft dead end.** The line's name is not the door on Your factory; the eye has to find "Open ›" at the right of the row. The control room's card *is* the door. |
| Find the stopwatch | — | **Dead end.** The line's own page offers Problem, two reports, Edit the line, Set up the line, machines, programs, seven tools and jobs — and no way to time a stop. The phone bar says Control room · Problems · Lines · More. The stopwatch is reachable only from a job (the Pareto's empty state, a project's setup, the fishbone's "Time a stop"), from the Trend's empty state, or by typing the address. On a line with 12 stops already timed, the page says "the Bagger stops the most — about 12 min a week" and still offers no door to time the next one or to see the ranking. |
| Time a stop as it stands | 2 | Start timing → Stop & log. Whole line · Breakdown pre-selected (the taxonomy's first entries). The toast says what was logged, with Undo. Two taps is the floor's minimum and it holds. |
| Name the machine, then time it | 4 + 1 typed | + → type → Enter, pick what, Start, Stop. After this, "Again?" offers "Bagger · Changeover" as one chip — the next identical stop is three taps. |
| Log a problem | 4 + 1 typed | Problem (the round button) → words → machine chip (the Bagger named on the stopwatch *is* offered — the line's list is one list) → priority → Save. Line pre-picked. |
| Where did it land? | — | **Dead end on a phone.** No Analyse in the bar or on the page; it is under More. The line's page then says it all (1 machine, 1 problem open, the problem by priority); the control room's card says "1 problem open · 2 observations". |

Taps a first-timer cannot avoid: 15. Taps the design makes them spend finding
a door: 1 (Open ›) plus one address typed. The stop itself — the thing the
brief holds the app to — is two taps once you are on the page; the page is the
problem, not the stopwatch.

## 3. The findings, ranked

Impact 1–5 (5 = a person is misled or blocked on the floor, or data is at
risk) · Effort S/M/L · Kind: **bug** (the app disagrees with its own rule or
its doc), **design** (a decision to make, with the reason), **question** (left
alone unless answered). Sorted by impact, then by effort within it.

### 3.1 Floor capture (the brief's rank 1)

| # | Finding | I·E | Kind | Fix |
|---|---|---|---|---|
| **F1** | **The stopwatch has no door from the line.** `ProductionLineScreen` lists seven tools and no Capture/Analyse; `rail.ts studyLines` draws them only once you are already inside `/w/:id`; the phone bar on a line page is Control room · Problems · Lines · More. | 5·S | bug (BLUEPRINT §3: the line layer is "where the work is timed") | On the line's page: **Time a stop** as the first button in the header, and in *Tools on this line* a row for the stopwatch and its Pareto — "Stops timed: N in the last four weeks · the Bagger most" — opening Analyse. The tour's "stops the most" sentence opens the same place. PAGES.md gains both lines; `lines.mjs` drives them. |
| **F2** | **On a phone the study's four screens are two taps away under More.** `rail.ts phoneBar` has no case for a `/w/` route beyond the control room's four. After a stop is logged there is nothing on the page that says "see the ranking". | 4·S | bug | The phone bar inside a line study: Control room · Capture · Analyse · Evidence · More (the line's own page under More, as the job's bar does for its job). |
| **F3** | The line's name is not the door on Your factory — only "Open ›" is. Everywhere else (control room card, rail, jobs) the name opens the thing. | 3·S | design — **kept** | The row's name is a box you type the line's name into ("always full edit control"); a box that is also a door opens the line under every edit. Open › stays the one door. Kept. |
| **F4** | Capture pre-selects *Whole line · Breakdown* from the taxonomy's first entries. Two taps logs a stop against them without a word read. Honest (the toast says it, Undo is there) but the default is the taxonomy's accident, not the floor's. | 2·S | design — **kept** | Kept: fewer taps is the brief's first rank, "Again?" takes over after the first real stop, and the toast + Undo is the check. Said here so it is a decision. |
| **F5** | The Problem button appears twice on a phone's line page: in the header and as the round button. "One thing, one place." | 2·S | design | On a phone the header's Problem hides when the round one shows (CSS, `body:has(.qs-fab)`). |
| **F6** | After a stop on a line with no rate set, the toast says the minutes and nothing else; the line page says "Crew and cost — not said yet". Correct and honest (TOOLKIT rule: never invent a number). | — | sound | — |

### 3.2 The maths (rank 2 — trustworthy numbers)

Every row below is a failing assertion in a reference test, checked by hand.

| # | Finding | I·E | Kind | Fix |
|---|---|---|---|---|
| **M1** | **The mix shows "1 unmade" when the whole demand was made.** `lib/ie/mix.ts:120` floors `minutesGiven × perConstraintMin`; 15 ÷ 11 × 11 = 14.999… → 14 made, 1 unmade. | 4·S | bug | Floor after rounding to 1e-9 (`Math.floor(x + 1e-9)`); test on the exact case. |
| **M2** | **Capability words put a two-tailed share on one side.** `lib/ie/sample.ts:180` adds both tails into `shareOut`; `:296` says "about 5 in 100 would be light" when 2 in 100 would be light and 2 heavy. | 4·S | bug | Say the side only when one tail carries ≥ 90 % of the share; otherwise "about 5 in 100 out — light or heavy" (and on paper). |
| **M3** | **Ask adds idle labour and lost contribution into one £** (`intelligence/ask.ts:63`) against the rule in `cost.ts:2-19` and `ie/changeover.ts:414-418` ("never added into one figure"). | 3·S | bug | Say the two parts with the shared `moneyWords`. |
| **M4** | **Lines that merge: rejects across the merge.** A shared station's rejects are not taken off what leaves the line, and a lane's rejects are put back into what it *sends*, so the shared station is compared with more than reaches it; the same line as one chain names a different bottleneck. (`audit-capacity-lanes` C-b1, C-b2.) | 4·M | bug | In `analyse`'s lane pass: what a lane sends = its effective output after its own rejects; the merge's good-out takes the shared stations' rejects off; the laned and the plain answer must agree on a one-lane line (property test). |
| **M5** | **Capacity a shift on lines held by themselves names one line's pace while the figure is the sum**; the report's V sentence on a laned line reads every station against one line's bottleneck. (C-b3, C-b5.) | 3·S | bug | The shift sentence names the sum ("136.5 units a minute across 3 lines"); the V sentence is said per lane. |
| **M6** | `planToTarget` is not monotone on some random chains with a people bottleneck: a step's `lineAfter` fell from 67.2 to 44.8. | 3·M | bug — **to confirm** | Reproduce with the failing seed; expected cause: the step re-reads the bottleneck after adding a person but the next-slowest is a machine the plan then "adds" to. Fix the step rule or say "stuck" earlier. |
| **M7** | The loss count's random-shift identities differ from the reference by 0.03–5 min on most shifts while both worked examples agree exactly. | 3·S | **to diagnose** | The difference appears only with stops whose `count` > 1 or typed stops — the reference may count `count` and the app not (or the reverse). Diagnose, then either the app or the reference is fixed, and the rule is written in `ie/losses.ts`. |
| **M8** | "A tray reaches them every 6.9 s — 8.8 a minute" vs the doc's 8.75 → 8.7. The app rounds half up; the doc truncates. | 1·S | reference | The doc is corrected to 8.8 (round half up is the house rule in `format.ts`). |
| **M9** | "1 pallet = 36 baskets = 360 bags" — the reference expected *units*. The app says the line's unit. | — | sound | — |
| **M11** | **A barely-rising climb prints "about NaN-NaN-NaN (run 3.5e+44)"** — `rampUp.ts:108-116`: nets 100 → 100.1 → 100.2 against 120 give n* = 3.5e44 and `addDays` overflows; the sentence reaches the run's card, Commission, the front page and the client report. | 3·S | bug | Past a horizon (a year) the climb is "not within reach at this climb"; never format an invalid date. |
| **M12** | **Rounded figures hide the gap:** "Netted 60 ppm against 60 agreed — 0 ppm short", in red (`run.ts:106-131`; 59.96 vs 60; rejects 1.01 % vs 1 % → "1 %/1 % at most/0.01 % over"). | 2·S | bug | When the rounded got equals the rounded agreed, show one more decimal. |
| **M13** | Thirty identical readings → s = 0 → no Ppk and no capability sentence at all (`sample.ts:176,288`). | 2·S | bug | "Every reading the same — spread 0 from 30; capability cannot be worked out (instrument too coarse?)". |
| **M14** | A SMED plan's target longer than the element makes the ladder climb (16 → 19 → 29 min) — `changeover.ts:121-126` has no clamp. | 2·S | bug | `sec = min(sec, targetSec)` at the converted and streamlined rungs. |
| **M15** | Work sampling's margin is Wald: "working 100 % (±0)" from 30 taps; Wilson's 95 % interval is 88.6–100 %. | 2·S | design | Wilson score interval for the margin (the same at mid p, honest at the ends). |
| **M16** | A stop is in or out of a shift's loss count by its start alone: a 60-min breakdown begun 1 min before the shift counts 0; begun 1 min before the end counts 60. | 2·M | design | Clip each stop to the window (minutes of overlap), counts whole. |
| **M17** | Small: `samplingLine` throws on an empty activities list; an agreed count of 0 reads "12 of 0 in"; `cyclesNeeded` returns −0; the rejects bar's pounds are called "idle labour"; Student's t past 120 df is 1.96 not 1.980. | 1·S | bug | Each a line; tests from the IE audit. |
| **M10** | Verdicts from one data point say nothing of the count: "N of M lines at target" from the latest reading alone (`measures.ts:158`), the Pareto/fishbone door from any number of stops, SMED's year from one timed changeover. | 2·S | design (TOOLKIT honesty rule 1) | Carry the count into the sentence ("from 1 reading", "from one changeover timed", "from N stops") as `sampleSays` already does. |

### 3.3 One number, one module (rank 3 — it all adds up; rank 7 — coherence)

| # | Finding | I·E | Kind | Fix |
|---|---|---|---|---|
| **C1** | A 6M job's **late** counts a missed hold check on the control room row and the front page (`pacedOwed`) but not in the rail's square (`useMethodCounts` sums board + materials). | 3·S | bug | `useMethodCounts` reads `pacedOwed`. |
| **C2** | **Programs on Commission vs Programs/rail:** Commission's cell counts `boardPrograms` (adds the line's programs with a proving test) and calls a program wrong only on a red test; the rail and the Programs page count the job's own and call `testOn` gone with no test "late". "1 late" on Programs reads "1 with no test" on Commission. | 3·M | bug | `programsCell` becomes a projection of `programsReading` buckets; the set is said once ("the line's programs are counted here"). |
| **C3** | **A machine renamed on the line** renames its stops and record, not the problems (`snags.targetAsset`) or the capacity station, both joined by name — the bottleneck no longer matches its stops. A job's machine renamed on Install (`saveAsset`) renames neither the line's list nor its stops, so the line shows two machines. | 3·M | bug | `renameLineMachine` also renames `snags.targetAsset`, capacity stations and standard marks on that line; `saveAsset` on a name change calls it. |
| **C4** | **One line, two capacities.** A 6M job's fishbone "The constraint", front page and client report read the job's own `pace_ppm.capacity` first; the line page, the loss count and SMED read the standards. (BLUEPRINT §2 says Stage 4 — it bites today.) | 4·M | design | Read side first: `lineCapacityOf` prefers the factory line's standard when the line has one, else the job's copy (said as "the job's own"). The writer moves in Stage 4. |
| **C5** | **Two speeds for packs lost:** the stopwatch, Pareto, Analyse and Case use `workspace.packsPerMin` typed in settings; the loss count uses the bottleneck's plate speed; SMED falls to `packsPerMin` third. | 3·M | design | One `lineRate(line)` in `lib/lineLoss`: the bottleneck's plate speed when Line capacity has it, else `packsPerMin` said as "a typed rate", read by all three. |
| **C6** | A **failed** program says so on the job and never on the line's Programs or the factory (`lineProgramsReading` passes `tests: []`). | 2·S | bug — **reverted, open** | Passing the tests through re-counted a program proved by its record as proved by its test and moved the line's words and paper (the machines-programs acceptance failed 4 checks). Needs `programsReading` to carry *failed* without re-counting *proved* — one change with C2. |
| **C7** | The machine drawer reads the stored state word (`MachineCard` `a.state`) where every other place reads the dates (`assetStateOf`). | 2·S | bug | Use `assetStateOf`/`assetStateOn`. |
| **C8** | The control room's line card counts the jobs' programs on the line; the band under it counts only the line's own. | 2·S | design | One sentence from `lineWork`: "N to prove (k on jobs) · j late". |
| **C9** | The control room names a 6M job's lines by the job's copy; the rail by the factory's. | 2·S | bug | `useJobInputs` resolves the name through the factory line. |
| **C10** | Three filters for "a problem open on a line" (`lineWork`, `factoryReport`, `problemsPdf`) that agree only because sending closes the snag. | 1·S | design | All read `isOpenOnLine`. |
| **C11** | **Words:** "snags"/"assets" on the Evidence list; "Critical issues" on the client and commissioning papers vs "critical problem"; countermeasure (6M) vs action (control room, register); step vs stage for one record; `?view=snags`; "tracker row" in a sentence a person can meet. | 2·S | bug | Sweep; add *issue*, *step* (install) and `?view=snags` to smoke's old-word check. |
| **C12** | Value stream: no verdict (`FlowSays` has no tone) and no timed/typed mark on a step. The only tool without its fourth layer. | 2·M | design (TOOLKIT Part 1) | `flowSays` returns a verdict (Over takt / Waits exceed work / Not timed / Within takt); `FlowStep.source` timed·typed·carried, printed on grid and paper. |
| **C13** | BLUEPRINT §4 lacks rows for most records the screens show (stage/test, fix/action, material, note, measure, 6M case, win, walk, tree node). | 2·S | docs | Add the rows. |
| **C14** | Doors reached only by URL and fields nobody fills: `/history/:asset`, `/project/:id/standard/:id`; `Observation.valueNum/costPer` reserved and written by nothing. | 1·S | question | Left alone this round; listed. |

### 3.4 Clear at a glance (rank 4) — what the pictures said

| # | Finding | I·E | Kind | Fix |
|---|---|---|---|---|
| **D1** | **A job's line page runs 96 px off the side at 768 px** (every lens: `project line`, `measured line`, `line capacity`, `line numbers`…) — the Actions table; `measured — next steps` 80 px. Nothing is off the side at 390 or 1360. | 3·S | bug — **done** | Not the table: the fingertip halos (`::after`, 10 px outside each button) inside `.ns-scroll`, which scrolled but was not positioned, so the halos escaped the clip and widened the page by their own width. `.ns-scroll { position: relative }` — measured 848 → 768 px at 768. |
| **D2** | **The same page is the wordiest on a phone: 1,900–2,200 words** whichever lens is open (`?view=data` 1,929, `?view=next` 2,141). The lens changes the order, not what is drawn. | 3·M | design (SIMPLE.md: three questions, the rest one tap away) | Each lens draws its own section first and folds the others behind their heading with the count; the job's front page already does this. |
| **D3** | Materials and Programs on a phone: 38 of 65 buttons under 32 px — the ▲▼ reorder buttons and the ✕ on each card. | 2·S | bug (AUDIT.md bar 5) — **done** | The ▲▼ and ✕ already carried the house halo (`.pset-x`, `.cw-link`); the count measured the bare boxes, not the halo. The one bare set, `.ns-sbtn`, gets 36 px on a coarse pointer beside the halo list. |
| **D4** | The value stream grid: 52 of 77 buttons under 32 px — the cells. | 1·— | design — **kept** | A grid cell is a cell; the row's editor is the way in on a phone (B acceptance). Kept. |
| **D5** | Slice 4 of the stage-gate redesign (the drawer short, machine rows one door) is in the gate at the time of writing; slices 5–6 (calmer Today, the phone) are open in `docs/STAGEGATE-UX.md`. | — | in flight | Shipped first. |

### 3.5 Easy to hand to someone else · reliability · security (ranks 6 and 8)

Read from the files, then **read back from the live database** (`pg_policies`,
`pg_trigger`, `pg_get_functiondef`, the realtime publication) on 16 October.

| # | Finding | I·E | Kind | Fix |
|---|---|---|---|---|
| **S1** | **Any member of a line can delete the line from every device.** Live: `workspaces` update policy is `is_ws_member(id)` with no restrictive rule; the triggers on `workspaces` are clamp_clock, keep_owner and rev — nothing keeps `deleted_at`. `is_ws_member` (live) admits every member of any job on the line, a client included. The tombstone is `update {deleted_at}`; `applyRemoteDelete('workspaces')` hard-deletes stops, walks, frames, problems, cases and their media on every other device. `FactoryScreen` "Delete for ever" has no access check and no Undo. | 5·S | bug | `faultline_keep_line` trigger (deleted_at, archived, owner, name, type, floor order stay with the owner or super), applied with `apply_migration` and read back; the screens gate Delete, Archive and Merge on `workspaces.owner_id`; Undo on delete as WorkspaceHome already offers. |
| **S2** | **`standards` has no editors-only rule and keeps the owner arm.** Live: two permissive ALL policies (`line standards` is_ws_member; `project standards` owner *or* is_project_member), no restrictive policy, triggers keep_agreement and rev only. A client writes a job's line standards and capacities; any signed-in user can insert a standards row into any job id they have seen. | 5·S | bug | Rebuild as the other job tables (SECURITY_RLS part C + ACCESS_LEVELS part 2): member select/insert/update + restrictive editors-only, plus keep_owner and clamp_clock. |
| **S3** | **Hard DELETE is re-opened** by `for all` policies on programs, commission_assets, standards, studies, snags, observations, cases (live). The app never issues DELETE on a synced table; a hand-made request would bypass the tombstones and `keep_agreement`. | 4·S | bug | Split each `for all` into select / insert / update with the same predicates; read back `pg_policies` showing no DELETE row. |
| **S4** | **`.gitignore` does not cover `.env`** while CLAUDE.md asks for one (`check-live-schema.mjs — needs .env`). History is clean on every branch; the bundle carries only the anon key and URL; the committed `.mcp.json` carries `project_ref` and `features` only. | 4·S | bug | `.env`, `.env.*`, `!.env.example`. |
| **S5** | A problem "for" a job (`snags.project_id`) has no project-level write rule; cases got one (`SIXM.sql`). Any line member can raise, close or delete a problem that appears on the job's status page. | 3·S | design | The same restrictive insert/update as cases. |
| **S6** | **The client level stops at the job's own tables.** Live `is_ws_member` has no access filter: a client may time stops, raise problems, rename the line, plan programs, place standards with no job. BLUEPRINT §1 says otherwise. | 4·M | design | `is_ws_editor(ws)` for writes (owner, explicit member, or an *editor* of a job on the line); a line-level `useLineAccess(wsId)` so no button lies. Second wave — needs the two-device harness run with a client. |
| **S7** | Delete and merge of a line: no Undo, no guard; a non-owner's merge is refused row by row by RLS → a half-merged factory with the source archived. | 3·M | bug | With S1: owner-gated; Undo keeps the moved ids. |
| **S8** | Cleared on the live read: `faultline_keep_agreement` carries `run_agreed` and keeps `deleted_at` (both "NOT applied yet" migrations are on); `projects` is in the realtime publication. | — | sound | — |
| **S9** | CSP is `Report-Only` though the policy already fits the app. | 2·S | design | Enforce after a week of clean reports (not this round). |
| **R1** | **22 places make a calendar date from `toISOString().slice(0, 10)` — UTC** — beside `todayISO()`, which is local: the register's "today", a program's done day, the Gantt's day, a measure's window, a study's day on the balance and SMED. In British Summer Time, from 23:00 to midnight every day is "yesterday" on those and "today" on the rest. | 3·S | bug | One `isoDay(ms)` in `lib/weeks` (local), used everywhere; a test that pins Europe/London at 23:30 BST. |
| **R2** | Sync: the push is per-row and rev-conditional with a three-way merge; one refused row no longer stalls a kind; the fake-cloud harness runs ten scenarios in every gate. | — | sound | — |
| **R3** | `sync.ts:1097-1100` — a row the cloud says is gone is retried as an edit each pass because its base keeps a `rev` ("it goes fresh next pass" is not what `baseGet` does). Only reachable after a hard delete (S3). | 2·S | bug | Clear the base when the cloud says gone. |

## 4. What is sound (do not touch)

- **Stage-gate late is one number** (`standing()`), read by the rail, the verdict, Needs you, the control room, the client report, the status page, Today's update and the handover with the same five lists.
- **Job problems** (`problemsTally`), **line problems** (`lineProblems`), **programs on a job** (`programsReading`), **machine state** (`journeyOf`/`assetStateOf`), **labour £** (`labourPerHour`), **today's plan** (`huddle`), **control room numbers** (`portfolio()`) — one module each, screen and paper.
- **Honesty where built:** the loss count refuses an estimate as its rate and prints *How known*; capability says "from 12 — too few"; the balance says "short of cycles"; sampling prints margins; `lineRates` wants five shifts; capacity says "a guess" and "at most"; a proof says "the number moved". 159 SMED reference assertions and 69 capacity ones pass unchanged.
- **The stopwatch itself:** two taps, pickers locked while timing, the timer survives an app close, the toast names what was logged with Undo, "Again?" learns the line's repeat stops, the machine named here is the one list every picker reads.
- **Security that holds:** RLS on all 33 tables; restrictive editors-only policies on the job tables; keep_agreement / keep_owner / clamp_clock; confirmed-email membership; a private bucket with row-before-file; scoped, expiring, revocable share links; only the anon key in the bundle; no secret in any commit on any branch.
- **The gate:** every acceptance green on the change in flight; 699 random reports clean; the inventory holds 132 things on 25 pages.

## 5. The build, in waves (each a commit, the gate, live)

Order as the brief sets it: maths first, then floor capture, then the design
system and screens, then the rest. Every wave states its effect on the screen
and on the paper together, adds its test, and writes its line in PAGES.md when
a page changes.

| Wave | Rows | What changes, screen and paper | Locked by |
|---|---|---|---|
| 0 | D5 | Slice 4 of the stage-gate redesign ships (in the gate now). | the gate |
| 1 Maths | M1 M2 M3 M4 M5 M6 M7 M8 | The mix never says 1 unmade of a made demand; capability words say the side only when it is one side; Ask says the two £ parts; lines that merge count rejects once and agree with the plain chain; the shift and V sentences on lanes say the right pace; the plan to target never falls. Paper follows through the same modules. | the harvested reference tests, corrected where the reference was wrong, with the reason beside each |
| 2 Time | R1 | One local `isoDay`; no date made from UTC. | a pinned-zone test |
| 3 Floor | F1 F2 F5 (F3 kept) | Time a stop from the line's page; the stopwatch and its Pareto in the line's tools; the study's screens in the phone bar; the name opens the line on Your factory; one Problem button a screen. | `lines.mjs` extended; PAGES.md; `floorwalk.mjs` in `scripts/audit/` re-run: the two dead ends gone |
| 4 One truth | C1 C3 C7 C9 C10 C11 M10 (C6 reverted) | The rail's late counts the missed check; renames travel to problems and stations; the drawer reads the dates; one name for a line; one filter for open; one word per thing; counts in the one-point verdicts. | unit tests per module; smoke's word list grown |
| 5 Security | S1 S2 S3 S4 S5 R3 | One migration in the house shape (`supabase/LINE_AND_STANDARD_RULES.sql`) — **written, not applied**: the connector's writes timed out and came back "cancelled" on 16 October, so it is pasted into the Supabase SQL editor and read back by hand (CLAUDE.md's fallback); the screens gate a line's delete and merge on its owner, with Undo, meanwhile. | `sync-schema` test; `pg_policies` read back and pasted in the commit; two-device harness |
| 6 Fit | D1 D3 (D2 parked) | The job's line page fits a tablet (the halos clipped); the one bare button set reaches the fingertip size. D2 is parked: folding the other lenses hides what PAGES.md says the page must show and the lens already orders it — a slice of its own, decided with SIMPLE.md. | the three-width pass re-run; `--compare` pictures looked at |
| 7 Coherence, larger | C2 C4 C5 C12 — **decided, not built** (below, §6) | Commission's programs cell a projection of the one reading; one capacity read for a line; one rate for packs lost; the value stream's verdict and how-known. | acceptance scripts extended |
| 8 Roles | S6 (S7 done in wave 5) | `is_ws_editor`; line-level access on the screens — **not this round**: a new access level on the line needs the blueprint's §1 word on who a line's team is before a policy says it. | harness with a client device |
| 9 Docs | C13 | BLUEPRINT §4 rows; IDEAS.md; this file's closing state. | `inventory.mjs` |

## 6. Left alone, and why

- **Capture's defaults (F4)** — fewer taps wins; the toast and Undo are the check.
- **The value stream's cells (D4)** — a grid; the row's editor is the phone's way in.
- **The job's line page folded by lens (D2)** — the lens already orders the page, PAGES.md names what every lens must show, and five acceptance scripts read it; folding is a slice of its own under SIMPLE.md, not a fit fix.
- **Commission's programs cell and the line's failed program (C2, C6)** — one decision, not two patches: which programs a job counts as its own (the line's with a proving test, or the job's) and whether a job's test can move the line's words. The C6 attempt showed a patch moves the line's page and paper; the decision belongs with the Programs slice.
- **One capacity read for a line (C4)** — BLUEPRINT §2 moves the writer in Stage 4; a read-side change before it would make the fishbone say the factory's number and the job's own settings another, on the same screen.
- **One rate for packs lost (C5)** — the three rates are said on their papers today (the loss count names the plate speed, the stopwatch the typed rate); one rate needs one sentence on every paper that prints pounds, which is the Stage 4 line-figures work, not a patch to three modules.
- **The value stream's verdict (C12)** — the only tool without its fourth layer; needs a takt and a "timed or typed" mark on every step before a verdict is honest, so it is built with the mark, not before it.
- **The Pareto with no "enough" rule** — a ranking from three stops is still the ranking; the count is said beside it (M10 adds it to the door's words), and a threshold would be a number nobody agreed.
- **`Observation.valueNum / costPer` and the two URL-only doors (C14)** — removing is a decision for the blueprint's Stage 4 list, not this round.
- **CSP enforcement (S9)** — a week of reports first.
- **The dead tables (`commission_items`, `project_targets` …)** — BLUEPRINT §5.2 already lists them; dropping is a migration Rowland runs with the next schema change, not a side effect of an upgrade.
- **Reference-side mistakes (M8, M9, the bottleneck-by-plate assumption)** — the app was right; the tests are corrected and kept.

## 7. Parked in IDEAS.md (one line each, unbuilt)

- A walk's end: "rank what I saw" — the stops and problems of the last hour on one card, in minutes and £, before the walker leaves the floor.
- The stopwatch on a watch face (one-tap start/stop) — a different device, not this app's problem yet.
- A line's "crew and cost" asked the first time a £ is wanted, on the spot, not under Set up.
- The job's line page folded by lens on a phone (D2) — each lens its own section first, the others behind their heading with a count.
