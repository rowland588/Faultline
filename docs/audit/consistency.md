# Faultline — whole-system consistency audit (16 Oct 2026, worktree 3fbd1d1)

Read from code only; no browser. Paths are repo-relative. "✓" = one module, same inputs. "✗" = a second implementation or different inputs.

## (a) Number trace — 1(a)–(h)

| # | Number | Module(s) that compute it | Where rendered (file:line) | Agree? |
|---|---|---|---|---|
| a | Stage-gate job's **late** | `standing()` src/lib/standing.ts:176-432 (`late` = steps·parts·tests·fixes·materials·programs·machines late) | rail: src/lib/useStanding.ts:49-53 → src/ui/Frame.tsx:238; verdict: src/lib/onTarget.ts:157,205 (takes `st`); Needs you: `jobItems` src/lib/portfolio.ts:351-403 + `needsYou` :618-647 (same rules per record: `stageLate`=lateOrProblem, isOverdue, isHere, daysOverdue, awaited); control room row: src/lib/portfolio.ts:659-663,754; client report: src/lib/clientReport.ts:381-384,634; one-page status: src/lib/statusReport.ts:177 (reads clientReport.onTarget); Today's update: src/screens/DayScreen.tsx:82 (recomputes standing inside stageGateOnTarget, same records); handover: src/lib/handoverReport.ts:159-160 | ✓ |
| a′ | 6M / tree job's **late** | control room row: `pacedOwed` = actions + materials + programs + **missed hold checks** src/lib/portfolio.ts:479-485,716; job front page Needs you: `pacedOwed` src/screens/ProjectDashboardScreen.tsx:~944 | rail job square: `counts.board.late + counts.materials.late` (materials+programs) src/ui/Frame.tsx:277, src/lib/useMethodCounts.ts:17-26 — **no checks**; sentence `pacedSays` counts actions' late only src/lib/portfolio.ts:726,497-504 | ✗ (X2) |
| b | Job **problems open** | `problemsTally` src/lib/noted.ts:60-68 (fixes !isSettled + noted problems w/o fix) | rail: src/lib/useStanding.ts:86; Fixes header: src/screens/FixesScreen.tsx:181,232-237; register `jobGroup.problemsOpen+fixesToDo` src/lib/snagsReport.ts:256-286,316 (same notedProblems + !isSettled) | ✓ |
| b′ | Line **problems open · critical · late** | `lineProblems`/`isOpenOnLine` src/lib/lineWork.ts:48-62 | control room card: src/screens/WorkspaceHome.tsx:190-194; line page: src/screens/ProductionLineScreen.tsx:99,189; control room numbers: `lineItems` src/lib/lineWork.ts:85-112 (only problems with owner or day) → src/lib/portfolio.ts:688-693,840-841 | ✓ (card = all open; band = chased only — by rule, stated in lineWork.ts:19-22) |
| b″ | Line problems on **paper** | factory report: own filter `!deletedAt && !archivedAt && status!=='closed'` src/lib/factoryReport.ts:45; problems PDF: src/lib/problemsPdf.ts:36,56 | vs `isOpenOnLine` (adds `!(sent??[]).length`) src/lib/lineWork.ts:49 | ✓ in practice (a sent snag is closed, src/snag/quick.ts:50) — but three filters for one rule (X14) |
| c | Programs **done / failed / late** on a job | `programsReading` src/lib/programsReport.ts:211-291 (job's own programs + stage parts; bucket `late` = test late OR `testOn` gone, :187,193-196) | Programs chips: src/screens/ProgramsPage.tsx:94-95,121; rail: src/lib/useStanding.ts:95-96; client/handover/status: src/lib/clientReport.ts:392, src/lib/handoverReport.ts:164, src/lib/statusReport.ts:183 | ✓ |
| c′ | Programs in **Commission's cell / Needs you / commissioning report** | `boardPrograms` = job's own + **lines' programs this job has a test for** + stage parts src/lib/commissionPrograms.ts:90-104,127-131 → `programsCell` src/lib/commission.ts:103-114 (`wrong` = proving-test tone r only; no test → `noTest`) | src/screens/TestsScreen.tsx:64,190-191; src/ui/CommissionGrid.tsx:77,283-288; src/lib/commissioningReport.ts:161-172; src/screens/ClientReportScreen.tsx:215 | ✗ (X3): different input set from rail/Programs page, and a program late by its own `testOn` with no test is "late" on Programs/rail but "with no test", not "gone wrong", on Commission |
| c″ | A **line's** programs proved / late | `lineProgramsReading` src/lib/lineRecords.ts:165-201 (programsReading with `tests: []`); `lineKit.late` = `standingOf==='overdue'` :241-252; `lineWork` own programs `daysOverdue!=null` :107-110 | line Programs page: src/screens/LineProgramsScreen.tsx:46-52,77; factory row & paper: lineKit; control room card: src/screens/WorkspaceHome.tsx:297-298 (lineKit over `programsOnLine` = **all** programs on the line, jobs' included, src/lib/lineRecords.ts:132-134); control room band/This week: `ownProgramsOf` (no job) src/lib/lineWork.ts:76-77 | ✗ (X7): card counts jobs' programs on the line, the band under it counts only the line's own (the jobs' under the job) — same screen, two bases; lineKit never says "failed" (X11) |
| d | **Bottleneck / what the line can make** | (1) `lineConstraint` src/lib/intelligence/constraint.ts:26-41 (analyse().limit, station holding most products) ← line page/hero/heat/levers src/lib/lineRead.ts:44,79-88, src/ui/LineCapacityHero.tsx:84; (2) `neckOf` src/lib/lineLoss.ts:32-41 (set of every product's limit) ← stopwatch/Analyse/Report/Case/line-map heat via src/lib/useLineNeck.ts; (3) `lineCapacityOf` src/lib/fishbone.ts:452-460 (**job's own `pace_ppm.capacity` first**, else one standard) ← fishbone "The constraint" src/screens/FishboneScreen.tsx:197-207, 6M front page `canMakeWords` src/screens/ProjectDashboardScreen.tsx:362; 6M client report `capacityReport(ppm.lines)` src/screens/PaceExecReport.tsx:1365 (**job's copy only**); (4) `lineSpeed` src/lib/capacity.ts:502-511 (`limitAtRunning`, plate/person only) ← loss count rate src/lib/ie/losses.ts:112-152, SMED src/lib/ie/changeover.ts:392-397 | demonstrated/plannable: `lineRates` src/lib/intelligence/lineRates.ts:34-59 ← hero :77-81, control room card src/screens/WorkspaceHome.tsx:251, line page via readLine | ✗ (X1): a 6M job reads its own copy; the line, the loss count and SMED read the standards. (4)≠(1) by design (plate speed vs effective) — but two station names both called the pace-setter/bottleneck on one line (X13) |
| e | **Pounds / packs lost** | labour: `labourPerHour` src/lib/cost.ts:27-29 — one source ✓ (lineLoss.ts:61, ie/losses.ts:383, ie/changeover.ts:420, stats.ts:44). Packs: stopwatch/Pareto/Report/Case/Trend/heat use `ratedPerMin(w)` = `workspace.packsPerMin` typed in line settings src/lib/cost.ts:40-41, src/lib/lineLoss.ts:61,70, src/lib/stats.ts:45; loss count uses `count.ratePerMin` from `lineSpeed` (plate speed) src/lib/ie/losses.ts:142-152,381; SMED `lineRateOf` = lineSpeed → `cap.targetPerMin` → `line.packsPerMin` src/lib/ie/changeover.ts:392-397. Contribution £: loss count & SMED `contributionOf` (margin or price−materials) src/lib/ie/losses.ts:234, ie/changeover.ts:420; stopwatch/Analyse/Case say **packs**, no £ (src/lib/lineLoss.ts:1-16) | ticker src/ui/Stopwatch.tsx:32 (labour only); Analyse src/screens/AnalyseScreen.tsx:70,134; Report :123; Case :127,338; heat src/snag/LineScreen.tsx:170; Ask: src/lib/intelligence/ask.ts:63 **adds labour+contribution into one £** | ✗ (X4, X5, X6) |
| f | Control room **four numbers / This week** | `portfolio().totals` src/lib/portfolio.ts:839-859 (jobs' standing late + lines' chased late; week = late or due ≤7 d :308,771) | src/ui/JobsBoard.tsx:272,353-373; control room report src/ui/ControlRoomReports.tsx:36 (same call, with lineWork) | ✓ vs job pages (same standing / pacedOwed) and line page (lineProblems: a late problem has a day, so it is chased). Window differs from a job's "soon" (DUE_SOON_DAYS=3, src/lib/actions.ts:31) — different word, acceptable |
| g | **Machine's state** | `journeyOf`/`machineAt`/`assetStateOf` src/lib/install.ts:665-749, src/lib/testing.ts:74-80 | front page Journey src/ui/Journey.tsx:38,45; machine page & rail squares via `machineRecord` src/lib/machineRecord.ts:113-125, src/ui/Frame.tsx:255-270; Install grid src/ui/InstallGrid.tsx:188,369; client report src/lib/clientReport.ts:399-406; handover src/lib/handoverReport.ts:176-177; standing handedOver src/lib/standing.ts:415-416 | ✓ — except `MachineCard` reads `a.state` raw src/screens/TestsScreen.tsx:248,261-262 (used in the machine drawer src/ui/MachinePanel.tsx:136) ✗ (X9) |
| h | **Today's plan** counts | `planFor`/`planCount` src/lib/huddle.ts:27-28,46-52 | front page src/screens/ProjectDashboardScreen.tsx:586, src/ui/DayPlan.tsx:34; The day src/lib/day.ts:437,450-455 | ✓ |

## (b) Five layers — tool × layer (P present · ~ partial · ✗ missing)

| Tool | Facts (how-known · when · who) | Figures (pure) | Reading (sentence) | Verdict (word+tone; says no / not enough) | Act (record raised) |
|---|---|---|---|---|---|
| Stopwatch/Capture + Pareto | P `Observation.timing` stopwatch·typed·instant, `startedAt`, `ownerId`, `causeM` src/types.ts:82-112 | P `computePareto` src/engine/pareto.ts:27, `weeklyLoss` src/lib/stats.ts:43, `lostParts` src/lib/lineLoss.ts:60 | ~ "last four weeks · N min over M stops" src/ui/ParetoPane.tsx:150; `moveSentence` src/lib/paretoView.ts:163 — no how-known mark, no "enough" | ✗ no tone/verdict; `engine/intelligence` insight is a reading src/engine/intelligence.ts:69 | P → 6M cause/problem (fishbone offers src/lib/fishbone.ts:488; FishboneScreen door :186-190); ✗ on a stage-gate job: no fix raised from a stop |
| Capability study | P `StudyReading {at, who, struck}` src/lib/study.ts:49-58 (no typed/measured mark — all typed) | P `sample()` src/lib/ie/sample.ts:145 | P `sampleSays` :232 "12 of 30 in" | P Passed/Didn't pass/"12 of 30 in"/"Too few for capability — from 12" :232-300, overrule kept src/screens/StudyScreen.tsx:449-452 | P agree limits (`can.agree`) :86; Make it better → fix/countermeasure (studyLinks `betterWords`) |
| Time study / work balance | P `Lap {sec, at, who, foreign, struck}` :74; typed time said "typed" :88-89 | P `balance()`, `cyclesNeeded` src/lib/ie/balance.ts:69,141 | P `balanceSays` :200 | P `balanceLine` verdict Over takt / Not timed / Short of cycles / Within takt :255-270 | P `suggest()` ghost :172; standard time → capacity `source:'standard'` (src/lib/ie/losses.ts:109) |
| Value stream | ~ `FlowStep` has `who[]/where/kind/value` but **no timed/typed mark** (only `carried`) src/lib/study.ts:103-135, src/lib/ie/steps.ts:222 | P `flowFigures` src/lib/ie/steps.ts:103 | P `flowSays` :156 ("at least", "N steps have no time") | ✗ `FlowSays {text, lines}` — no tone, no verdict word :152 | P Make it better — fix/countermeasure src/screens/MapScreen.tsx:192; future state copy |
| SMED | P `ChangeoverStep.source timed·typed·carried, at, who` :198-209; `rateFrom/rateStation` :399-401 | P `changeoverFigures`, `extrapolate` src/lib/ie/changeover.ts:264,434 | P `changeoverSays` :588 "at least" | P Over the standard / Not timed / Within :588-611 | P convert/streamline → fix; set as the standard; target |
| Work sampling | P `Tap {at, who, activity, by, struck}` :370 | P `shares`, `marginOf`, `tapsNeeded` src/lib/ie/sampling.ts:48-59 | P `samplingReading` :126 with ±margin and "N more for ±5" | ~ tone always 'n'; "Too early — n taps" / "From n taps" :149-163 — never a judgement (by design) | P Make it better from `samplingWorst` :166; fishbone offers :193 |
| Loss count | ~ `LossCount` has window, `rateFrom/rateMachine/ratePerson` (how-known), `plannedWhy`; **no who** src/lib/study.ts:313-360 (RunTiming has `by` :45) | P `lossFigures` src/lib/ie/losses.ts:376 | P `lossSays` :535 + "How known: …" line :546-553 | P Not yet counted / Nothing lost / "N min slow running"; "not yet told apart" :580-585 | P fix/countermeasure from a bar `barWords` :592; src/screens/LossesScreen.tsx:339 |
| Line capacity | ~ `Station.source plate·timed·standard·estimate`, crew src/lib/capacity.ts:46-93; **no when/who** on a station | P `analyse`, `lineSpeed`, `ownSpeed` :502-530 | P sentence, "at most" :12,682; `shortSays` :972; `canMakeWords` :984 | P per-station `verdict`/`short` :879-966; screen checks ("To check before the sums are trusted"); "not counted yet" | P Make it so (what-ifs, +1 person :1222), target agreed, bottleneck walked |
| Line standard | ~ marks (people, shapes, notes), `bottleneck` flag — no how-known/when/who (a drawing) src/lib/standard.ts:203-286 | ~ `headcount`, `bottlenecksOf` :300,341 only | ~ Who does what / card line; no sentence module | ✗ none of its own (the balance's "map has N, work needs M" src/lib/ie/balance.ts:206-208 judges it) | P it *is* the act (the standard set); person marked bottleneck |
| Performance run | ~ `RunDay` typed numbers; when = `Test.ranOn`, who = `withWhom`; no typed/counted mark | P `readRun/readRuns` src/lib/run.ts:116,307 | P `runsSay` :372 | P met/short/toRun/unjudged, "no rate agreed to judge" :298-305 | P re-run `runAgain` :357; Hit a problem → fix |
| Ramp-up (Climb) | P runs' rates by day (from tests) | P `climbOf` src/lib/rampUp.ts:91 | P text | P meets/climbing/flat/early, `CLIMB_MIN_RUNS=3` :39,99-100 | ~ no record raised from the climb (a forecast) |
| Pace | P dated stages | P `paceOf` src/lib/pace.ts:106, `PACE_MIN_DONE=5` :51 | P `paceSays` :179 "at this pace" | P risk/on/none; "Too early to say when" :137-139 | ~ nothing offered (move the expected date?) |

**Honesty rules — where a confident figure rests on too little:**
- Pareto ranks and the fishbone's "top Pareto bar" door from any number of stops — no enough rule, no count in the door's words (src/ui/ParetoPane.tsx:150 carries the count; src/screens/FishboneScreen.tsx:186-190 does not).
- 6M "N of M lines at target" judges each line on its **latest reading alone** (src/lib/measures.ts:158-161) — the verdict (src/lib/onTarget.ts:249-268) carries no "from 1 reading".
- SMED's week/year cost (`extrapolate`, `extrapolationSays` src/lib/ie/changeover.ts:434-493) multiplies one timed changeover; the sentence says "if the plan holds" but never "from one changeover timed".
- Line-map £ heat "average weekly loss over its last full weeks" (src/snag/LineScreen.tsx:170) has no confidence; `lineRates`/`figure`/`changes` do (src/lib/intelligence/confidence.ts:24-29).
- Value stream figures inherit no source: a typed cycle time and a timed one print alike (no mark to inherit — see X10).
- Sound: loss count refuses an estimate as the rate (`idealOf`, src/lib/ie/losses.ts:112-134); capacity says a guess is a guess (`SOURCE_WORD` src/lib/capacity.ts:1489); capability "from 12 — too few"; sampling margins; balance cycles; `lineRates` MIN_SHIFTS=5.

## (c) Findings — ranked by impact (5 high) then effort

### X1 — One line, two capacities: a 6M job reads its own copy, the line reads the standards
Impact 4 · Effort L · Kind: design (BLUEPRINT §2 says Stage 4; it bites today)
Where: fishbone "The constraint", 6M front page "can make", 6M client report capacity sheet vs line page, loss count, SMED.
Evidence: `lineCapacityOf` prefers `line.capacity` (pace_ppm) src/lib/fishbone.ts:452-460 → src/screens/FishboneScreen.tsx:197-205, src/screens/ProjectDashboardScreen.tsx:362; `capacityReport(ppm.lines)` src/screens/PaceExecReport.tsx:1365; written at src/screens/ProjectLineScreen.tsx:474 (`ppm.editLine(…{capacity})`) — vs `lineConstraint`/`neckOf`/`lineSpeed` over `standards` only: src/lib/lineRead.ts:44, src/lib/lineLoss.ts:32-41, src/lib/ie/losses.ts:142 (standard's capacity), src/lib/ie/changeover.ts:392; written at src/screens/StandardScreen.tsx:637.
Fix: stop writing `pace_ppm.capacity` (ProjectLineScreen capacity lens saves to the product's standard on the factory line), read only standards everywhere; keep the old field read-only until migrated.

### X2 — A 6M job's "late": control room and front page count a missed hold check, the rail does not
Impact 3 · Effort S · Kind: bug
Where: rail job square / 6M Materials line vs control room row and job's Needs you.
Evidence: `pacedOwed` = actions + materials + programs + `checksOwed` (missed) src/lib/portfolio.ts:459-485, used by the row :716 and the front page src/screens/ProjectDashboardScreen.tsx:~944; rail: `(counts.board?.late ?? 0) + (counts.materials?.late ?? 0)` src/ui/Frame.tsx:277 from src/lib/useMethodCounts.ts:17-26 — no checks. Also the row's sentence counts actions' late only (`pacedSays`, :726) beside `late` that counts everything.
Fix: `useMethodCounts` reads `pacedOwed(...)` (or its late) instead of summing board+materials; say "N late" once per row.

### X3 — Programs: Commission's cell and the rail count different programs by different rules
Impact 3 · Effort M · Kind: bug
Where: Commission board/Needs you/commissioning report vs Programs page, rail, client report.
Evidence: Commission counts `boardPrograms` (adds lines' programs with a proving test) src/lib/commissionPrograms.ts:90-104,127-131 → src/screens/TestsScreen.tsx:64,190-191, src/screens/ClientReportScreen.tsx:215; `programsCell.wrong` only when the proving test is red; a program with no test is `noTest` src/lib/commission.ts:103-114 — vs `programsReading` bucket `late` when `testOn` has gone with no test src/lib/programsReport.ts:193-196 (rail src/lib/useStanding.ts:95, Programs chips src/screens/ProgramsPage.tsx:121). So "1 late" on Programs/rail reads "1 with no test" on Commission; and Commission's "N programs" on a machine can exceed the rail's.
Fix: make `programsCell` a projection of `programsReading` lines (bucket → proved/testing/noTest/wrong), and feed the rail/standing the same `boardPrograms` set, or state on Commission that the line's programs are counted there and not on the job.

### X4 — Two speeds for "packs lost" on one line
Impact 3 · Effort M · Kind: design
Where: stopwatch/Pareto/Analyse/Report/Case/line-map heat vs loss count and SMED.
Evidence: `ratedPerMin(w)` = `workspace.packsPerMin` (typed in line settings) src/lib/cost.ts:40-41 used by src/lib/lineLoss.ts:61,70,100 and src/lib/stats.ts:45; loss count rate = `lineSpeed` (bottleneck plate speed) src/lib/ie/losses.ts:120-152; SMED `lineRateOf` falls to `line.packsPerMin` only third src/lib/ie/changeover.ts:392-397. CAPACITY.md says one plate speed; BLUEPRINT §2 says the line's facts live on the line.
Fix: derive the stopwatch's rate from `lineSpeed` of the line's products (fall back to `packsPerMin`, said as "not a plate speed") in one `lib/lineRate` both read.

### X5 — Lost output is "packs" on the stopwatch side and "£ contribution" on the count/SMED side
Impact 2 · Effort M · Kind: design
Evidence: "CAPACITY (the packs the line did not make): said in packs, not pounds" src/lib/cost.ts:12-15, src/lib/lineLoss.ts:1-16 — vs `contributionOf` → "£ lost contribution" src/lib/ie/losses.ts:234,484-492, src/lib/ie/changeover.ts:414-426; both cite docs/CAPACITY.md §6.
Fix: one rule — packs always, £ contribution beside them only when the line has a margin — in `lineLoss.lostWords` and `ie/losses.moneyWords` alike.

### X6 — Ask adds idle labour and lost contribution into one £
Impact 2 · Effort S · Kind: bug
Evidence: src/lib/intelligence/ask.ts:63 `£${fmt((b.labour ?? 0) + (b.contribution ?? 0), 0)}` — vs "never added into one figure" src/lib/ie/changeover.ts:414-418; src/lib/cost.ts:2-3,17-19.
Fix: say the two parts (`moneyWords(b.labour, b.contribution)`).

### X7 — The control room's line card counts the jobs' programs; the band under it counts only the line's own
Impact 2 · Effort S · Kind: design
Evidence: card: `lineKit` over `programsOnLine` (every program on the line, jobs' included) src/screens/WorkspaceHome.tsx:297-298, src/lib/lineRecords.ts:132-134,241-252; band/This week/report: `ownProgramsOf` (no projectId) src/lib/lineWork.ts:76-77,107-110 ("A job's problems and programs are counted on the job, never here as well" :12-13). The line's own page says the lineKit number too (src/screens/ProductionLineScreen.tsx:312).
Fix: the card says "N to prove · k late" with "(j on jobs)" or counts only the line's own, as the band does; one sentence from `lineWork`.

### X8 — A machine renamed carries its stops and record, not its problems or its capacity station
Impact 3 · Effort M · Kind: bug
Evidence: `renameLineMachine` renames observations and asset records only src/db/lineRecords.ts:67-74; the register's `Snag.targetAsset` is joined by name (`namesMachine` src/lib/clientReport.ts:363-364; `snagRow.machine` src/lib/snagsReport.ts:183) and capacity `Station.name/asset` is joined by name (`stopsTheLine` src/lib/lineLoss.ts:45-49, `onConstraint` src/lib/intelligence/constraint.ts:54-62, fishbone source `asset` src/lib/fishbone.ts:208). After a rename on the line's page (src/screens/ProductionLineScreen.tsx:396-405) the bottleneck no longer matches its stops and the machine's problems fall off its row.
Fix: `renameLineMachine` also renames `snags.targetAsset`, capacity stations and standard marks on that line (by `machineKey`).

### X9 — A job's machine renamed on Install does not rename the line's list or its stops
Impact 3 · Effort S · Kind: bug
Evidence: `saveAsset` writes the asset only src/lib/useTesting.ts:175-192 (from `MachineCard` DraftField src/screens/TestsScreen.tsx:~255); `machinesOnLine` appends job assets whose name is not on the line's list src/lib/lineRecords.ts:122-127 → the line shows the old name and the new one as two machines; stops stay on the old name.
Fix: `saveAsset` on a name change calls `renameLineMachine(lineOfMachine(a), from, to)` and updates `workspace.assets`.

### X10 — Value stream has no verdict and no how-known on its steps
Impact 2 · Effort M · Kind: design (TOOLKIT Part 1: every tool a verdict; every fact how-known)
Evidence: `FlowSays {text; lines}` no tone/verdict src/lib/ie/steps.ts:152-178 (every other tool: `verdict` + `Tone` — sample.ts:221, balance.ts:255, changeover.ts:576, sampling.ts:149, losses.ts:531); `FlowStep` carries only `source:'carried'` src/lib/ie/steps.ts:222, src/lib/study.ts:103-135 — timed by tap (src/ui/ValueStream.tsx:234-240) and typed read alike.
Fix: `flowSays` returns `{tone, verdict}` (Over takt / Waits exceed work / Not timed / Within takt); add `source: 'timed'|'typed'|'carried'` to `FlowStep` and print "typed" on grid and paper.

### X11 — One program, three answers to "failed": the job says failed, the line and the factory never do
Impact 2 · Effort S · Kind: bug (flow audit #3 not finished)
Evidence: job: `programWords` bucket `failed` from a failed proving test or floor failure src/lib/programsReport.ts:181-187; line's Programs: `lineProgramsReading` passes `tests: []` src/lib/lineRecords.ts:189 so a failed test is invisible (only a `proving` aside from the floor map :192-198); factory row/control room card: `lineKit` knows proved/overdue only :244-245.
Fix: pass `rec.provingTests` into `programsReading` in `lineProgramsReading` and `lineKit` (or derive lineKit from it) so "failed" travels.

### X12 — Machine drawer reads the stored word, every other place reads the dates
Impact 2 · Effort S · Kind: bug
Evidence: `MachineCard`: `ASSET_STATE_WORD[a.state]`, `late = a.state === 'awaited' && dueOn < today` (no `!onSiteOn`) src/screens/TestsScreen.tsx:248,261-262, drawn in src/ui/MachinePanel.tsx:136; everywhere else `assetStateOf(a)` (dates win) src/lib/testing.ts:74-80 — src/ui/InstallGrid.tsx:188,369, src/lib/standing.ts:251-252, src/lib/install.ts:746.
Fix: use `assetStateOf(a)` and `assetStateOn(a)` in `MachineCard`.

### X13 — "The bottleneck" and "the station that sets the rate" are two stations, both named on the same line
Impact 2 · Effort S · Kind: question
Evidence: line page/hero "Held at the X" from `analyse().limit` (effective, stops counted) src/lib/intelligence/constraint.ts:30-31; loss count "plate speed of the Y" from `limitAtRunning` src/lib/capacity.ts:502-511, src/lib/ie/losses.ts:117-128; `neckOf` for the stopwatch's packs uses `.limit` again src/lib/lineLoss.ts:37. Documented (capacity.ts:486-501) but the three names are not said together anywhere.
Fix: when they differ, say so once on the count ("rate from the Y's plate; the line is held at the X once stops count") — one sentence in `lib/capacity`.

### X14 — Three filters for "a problem open on a line"
Impact 1 · Effort S · Kind: design
Evidence: `isOpenOnLine` src/lib/lineWork.ts:48-49; factory report own filter src/lib/factoryReport.ts:45; problems PDF src/lib/problemsPdf.ts:36,56; line page prefilter src/screens/ProductionLineScreen.tsx:90. Agree today only because sending closes the snag (src/snag/quick.ts:50).
Fix: all read `isOpenOnLine`.

### X15 — The control room names a 6M job's lines by the job's copy, the rail by the factory's
Impact 2 · Effort S · Kind: bug (FLOW-AUDIT #7 half done)
Evidence: rail: `factoryName` src/ui/Frame.tsx:221-222, src/ui/rail.ts:327-332; control room row drawer/gaps/losses/verdict: `l.name` (PaceLineRow) src/lib/portfolio.ts:728, src/lib/useJobInputs.ts:74,81,89.
Fix: resolve `name` through the factory line (`workspaceId`) in `useJobInputs`.

### X16 — Words: two names for one thing across screens
Impact 2 · Effort S · Kind: bug (CLAUDE.md "No word that is not true"; smoke blocks only some)
Evidence:
- "snag"/"asset" still on screen: src/snag/SnagListScreen.tsx:388-389 (`N snags`, `N assets`); URL noun `?view=snags` for Evidence src/screens/ProjectDashboardScreen.tsx:574-580, src/ui/rail.ts:279; "spot an issue" src/snag/QuickSnag.tsx:185.
- issue vs problem: "Critical issues" src/screens/ClientReportScreen.tsx:336,448, src/lib/clientReportPdf.ts:270, src/lib/commissioningPdf.ts:185 — vs "critical problem" src/lib/portfolio.ts:419, src/lib/noted.ts, register "Critical".
- countermeasure vs action: Board/case/6M paper say countermeasure src/screens/BoardScreen.tsx:227,230, src/screens/CaseScreen.tsx:78,465, src/lib/sixmStatus.ts:81; control room and register say action src/lib/portfolio.ts:501,584, src/lib/snagsReport.ts:292.
- step vs stage (one record, `kind:'install'`): "Install steps to do" src/lib/standing.ts:265-267, `KIND_WORD` 'Install step' src/lib/portfolio.ts:583, "Steps, in the order they happen" src/screens/PaceExecReport.tsx:458 — vs "stage" src/ui/InstallGrid.tsx:296,446,512, src/screens/InstallScreen.tsx:227, src/screens/ProjectSetupScreen.tsx:504-505, CLAUDE.md "install stages".
- "tracker" in a sentence a person can meet: src/lib/treeBind.ts:551-552 ('no line on the tracker row').
Fix: pick one per pair (problem · countermeasure on 6M/action on tree · stage) and sweep; add "issue", "step" (install) and `?view=snags` to the smoke's word check.

### X17 — BLUEPRINT §4 has no row for most records screens show
Impact 2 · Effort S · Kind: design (§4: "A screen that shows a record outside this table must add a row here")
Evidence: docs/BLUEPRINT.md:148-158 rows: Problem, Program, Machine, Product, Study, Job, Line. Shown but unlisted: stage/test (Plan, Commission, machine page), fix/action (Problems, Board, Needs you), material (Materials, rail), note/reminder (Notes, control room reminders src/lib/portfolio.ts:846-852), measure/target/reading (Numbers lens), 6M problem/case (register `case` rows src/lib/snagsReport.ts:302-310), win (Wins lens), walk/segment/frame (Evidence), tree node.
Fix: add the rows (line page · control room · job · paper) so the table is the check it claims to be.

### X18 — Doors reached once or only by URL; fields nobody fills
Impact 1 · Effort S · Kind: question
Evidence: `/w/:ws/history/:asset` (AssetHistoryScreen) one door src/snag/AssetScreen.tsx:113; `/project/:id/standard/:id` only when a product has no line src/screens/LineToolsScreen.tsx:57; `Observation.shift/valueNum/costPer` reserved, written by nothing, shown nowhere src/types.ts:91,99-100 (CLAUDE.md: a field nobody is asked to fill is a gimmick); `project_targets`/`project_actuals` still synced, read by nothing (BLUEPRINT §5.2).
Fix: fold "Through time" into the machine's drawer or delete it; drop the reserved fields and the dead pair (migration).

### X19 — Verdicts from one data point say nothing of the count
Impact 2 · Effort S · Kind: design (TOOLKIT honesty rule 1)
Evidence: `linesOnTarget` judges on `series.latest` alone src/lib/measures.ts:158-161, src/lib/onTarget.ts:249-268; Pareto/fishbone door no enough rule src/screens/FishboneScreen.tsx:186-190; SMED year from one timed changeover src/lib/ie/changeover.ts:462-493 ("if the plan holds", not "from one changeover").
Fix: carry the count into the sentence ("from 1 reading", "from 1 changeover timed", "from N stops") as `sampleSays` does.

## (d) What is sound

- **Stage-gate late is one number.** `standing()` is the only counter; rail, verdict, Needs you (`jobItems` mirrors its rules record by record), control room, client report, status page, Today's update and handover all read it with the same five lists (table row a). `lateThings` names what `late` counts (standing.ts:300-312).
- **Job problems are one count** (`problemsTally`) on rail, Fixes header and register; **line problems are one rule** (`lineProblems`) on card, page and band, with the chased-only rule written where it lives (lineWork.ts:19-22).
- **Programs on a job are one reading** (`programsReading`) across Programs, rail, client, handover and status.
- **Machine state is one journey** (`journeyOf`/`machineAt`/`assetStateOf`) across Journey, machine page, rail squares, Install grid, reports and `handedOver` — one stray reader (X12).
- **Labour £ is one rate** (`labourPerHour`) everywhere it appears; nothing stores a derived figure.
- **Today's plan** is one module (`huddle`), read by the front page and The day.
- **Control room numbers** come from one `portfolio()` call, with the lines' own work, on screen and on its report.
- **Honesty is real where built:** loss count refuses an estimate as its rate and prints "How known"; capability says "from 12 — too few"; balance says "short of cycles"; sampling prints margins; `lineRates` wants 5 shifts; capacity says "a guess" and "at most"; a proof says "the number moved" (`lib/impact`).
- **Facts carry who/when/how-known** on readings, laps, taps and SMED elements; stops carry `timing` and `ownerId`.
- **The join by machine name is deliberate and documented** (BLUEPRINT §2/§5.7) and `renameLineMachine` exists — it is its reach (X8, X9) that is short, not the design.
