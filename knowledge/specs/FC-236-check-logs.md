# FC-236 — Check logs: a check on a schedule, its results, and what a failure holds — the specification

**Catalogue:** FC-236 (the hub, kind *log*) and the shape every check log is built on — FC-170
(metal detection), FC-177 and FC-013 (scored audits, 5S), FC-062 and FC-234 (CILT, condition checks)
are the first four to ride it; twenty more are catalogued as check logs (`knowledge/BUILD-SHAPES.md`,
*Check log*) · **Knowledge:** `foodsafety.metal-detection-verification`, `foodsafety.audits`,
`lean.five-s`, `maintenance.autonomous-maintenance`, `quality.nonconformance-hold` (to be built as
FC-135) · **Asked for:** Rowland, 25 October 2026, to the question "start with the check log and the
calculators": *"Yes, start with check log and calculators, helpers, maximum that you can do … Just go
through the batches, go through everything, and return to me when everything's completed and
functional inside the app"* (`docs/TOOLS-BUILD-BRIEF.md`) · **Status:** built on `build-checks`, 25
October — the builder made every judgement call listed under *chosen* because the owner asked not to be
asked; none of them is a fourth kind of change, a licensed table, who sees a person's data, or a
food-safety decision.

## 1. Purpose
Twenty tools in the catalogue are the same thing in different words: **a check, done on a schedule,
with a result** — a test piece through a detector every hour, a cleaning swab after a changeover, a CILT
round every shift, a 5S audit every week, a hand-counted hour on the board. What the floor needs from
any of them is the same: *what is due now, was it done, did it pass, and if it did not, what is in
doubt*. This shape answers that once. It lets the lead say to the manager, and the quality manager to the
auditor, what they could not say before: **"Every check due in the last week was done on time except
two; one failed, 6,600 packs since the last good check were held, and the problem is on the register
with an owner."**

**Scope.** What this build covers: the **shape** — the record (a log's checks and its results), the
five states the house uses derived from the schedule, compliance for a period by the floor's rule, what a
failure holds (the window since the last good check, the packs from a typed number or the line's rate, the
money by the register's own model), a problem raised on the register for a failure, the **Logs** pages of
the three scopes (the factory's hub, a line's, a project's), the round on a phone, the history and trend,
the paper, the lean page, the wiring into the line's page, the line report and Needs you, and the way a
new log is added (one definition file). Its first four logs: FC-170, FC-177 with FC-013, FC-062 with
FC-234. What it deliberately does not cover: the product-on-hold register (**FC-135** — the shape leaves
the seam `holdFor`), the control plan that creates checks from process FMEA rows (**FC-133**), the
timed traceability exercise (**FC-174**) and the other seventeen logs, each its own definition later; a
photograph on a result (the cloud's storage rule names only a study's footage and a talk's media, so a
photo goes on the problem a failure raises, where the register already holds, marks and syncs it); any
reading of a machine (everything is tapped, typed or counted by a person); any AI.

## 2. Users and scenarios
**Who:** the operator or team leader doing the round on a phone at the machine (gloves, noise, one hand,
no signal); the line lead or quality person reading what is due and what failed at a desk; the manager
reading the week; the auditor reading the paper. A client reads and takes the report, and writes nothing.

**Scenarios, food first.** (1) *Metal detector, 07:55.* The operator opens the line's Logs, the detector's
round is on top: three pieces due, big ✓ Pass / ✗ Fail under each. Eleven checks later the stainless piece
is not rejected at 11:00 — ✗ Fail, a note, the sheet says *"Held: 1 h since the last good check — 6,600
packs at the line's rated speed"*, a problem *Critical* is on the register on the detector, and the check
stays red until it passes again. (2) *A 5S walk on a Friday.* The leader opens the 5S audit, answers 20
questions 0–4 on the phone, finishes: 65%, Shine the weakest, nine findings of which four came back from
last week; each is offered as a problem, ticked. (3) *CILT, start of shift.* Six checks done by tap; a loose
guard is tagged red — a problem on the machine — and the same guard tagged again two weeks later is said
to be a repeat. (4) *The week on a screen in the meeting*: compliance 91% (up 6 points), two misses, one
failure, what it held, in one page.

## 3. Method selection
**The method is the floor's own:** a check is done at an interval or when something happens; it passes or it
fails; a failure puts in doubt what was made since the last good check (`foodsafety.metal-detection-
verification`); an audit is a fixed scored checklist repeated, read as a trend and as findings that come back
(`lean.five-s`, `foodsafety.audits`); an operator's check is a short written round with a tag for every
abnormality (`maintenance.autonomous-maintenance`). **Alternatives considered and why not:** a form per log
(twenty screens that drift apart — the reason the shape exists); a general task scheduler (a check is not a
task: it has a result and a verdict); reading the schedule as fixed clock slots (a check done at 08:55 would
make the 09:00 slot missed — the floor's rule is *no gap longer than the interval*, see below). **When it is
unsuitable and what it refuses:** it does not decide a hazard, a limit or a release; a limit the site has not
agreed is left blank and the reading is recorded and not judged, never defaulted; a log with nothing on its
list says so and offers the starter list.

**Established · assumed · chosen.**
- *Established:* the metal-detection verification practice (test pieces at start-up, at intervals, after a
  stop or changeover, at the end; product since the last good check suspect — `foodsafety.metal-detection-
  verification`, from knowledge, the BRCGS clause **TO CONFIRM**, not quoted); a clean record's bound — *n*
  checks with none failed show at most 1 − (1 − conf)^(1/n) could fail, ≈ 3/n at 95% (exact; checked against
  scipy's beta quantile in `cases-checks.py`); 5S's arithmetic — score = Σ ÷ (questions × max) by S and overall
  (Hirano 1995, Osada 1991 via `lean.five-s`; the worked case 52 of 80 = 65%); Mann–Kendall and Sen's slope
  (`lib/ie/charts`, already validated against SciPy in W2) for a value's trend; the register's own money for
  product held (`lib/problemCost`, `knowledge/MONEY.md` H and M).
- *Assumed:* a failed check means the line is stopped until it is checked again, so a re-test that fails
  again holds nothing more (said on the sheet; if the line kept running, type the packs made on the
  failure); a pass-or-fail check judges the result a person taps; the rate × the window is an estimate of
  the packs made, said as one.
- *Chosen* (the builder, 25 October — the owner asked not to be asked), each said on the screen where it
  matters: **the schedule rule** — an interval check is due an interval after the last one was done (the first
  when the log began), is on time if done by the due moment plus a *grace*, missed once the grace has passed;
  **the grace** — a quarter of the interval, at least 5 minutes, at most 12 hours; **the five states** —
  *done* more than a grace before the next due moment, *soon* within a grace before it, *due* inside the
  grace, *overdue* after it, *failed* until a later result passes, *event* (never overdue) for start-up,
  changeover and trigger checks; **the period** — the last 7 days against the 7 before; **a repeat
  abnormality / a repeat finding** — the same check tagged twice in 28 days; the same question below the line in
  the audit before; **nearing a limit** — within 15% of the band between the limits; **a trend** from eight
  readings, p < 0.05; **a result's limit of life** — a log is warned at 1,500 results to start the next one;
  **where a photo goes** — on the problem. **Not chosen here and not built:** the grading bands of a
  certification audit (BRCGS, **TO CONFIRM**), a release decision, any limit a definition does not state.

## 4. Inputs
**A log** (`ToolStudy`, `tool: 'log'`, on a line; on a project when started inside one): its name; the
definition (`agreed.log.key`); **the checks** (`agreed.log.checks`) — *agreed before it is done, by the owner
on a project (`can.agree`)*: name · where (a line, a machine or a place, typed) · who · **how often** (every N
minutes/hours/shifts/days/weeks, or at start-up / after a changeover / when a trigger happens, with its words)
· **kind**: pass or fail (with what passes, in words) · a value (low and high limit, either may be blank, and
the unit) · a scored checklist (its questions under headings, the score to reach in %, the level below which an
answer is a finding) · a count in a slot (the target) · what to do if it fails · the priority of the problem
· whether a failure holds product; `since` (when the schedule began) and the hours in a shift (default 8).
**A result** (`facts.results`, merged by id): the check, when, who, the outcome (pass / fail / a number / the
answers / a count), a note, and for a failure the packs made since the last good check if known; the problem it
raised. **A tag** (`facts.tags`, CILT): check, colour, what, the problem. **Read from the line, never asked
again:** its rated speed (packs a minute), its materials a pack, its crew and wage (`Workspace`), and a
product's Line capacity rate — the missing one is named on the failure ("Give the line a rated speed …").
Validation: a check needs a name and a frequency above zero; limits the right way round; a scored check needs
questions; a number box takes a number (a comma is read both ways — `readNumber`).

## 5. Data suitability
There is no minimum to start: a log with no result says *"none done yet"* and shows what is due. Compliance
is said once something has come due; a trend from eight readings; a clean record's bound from 20 pass-or-fail
results; a score's trend from two audits ("the first audit; the trend needs another"). A value with no limit is
recorded and trended and *said not to be judged*. A log of more than 1,500 results is warned to start a fresh
one (the list is one record). A client's rows are never pushed (`cloud/sync`). Assumptions of the schedule rule
are said on the page: it counts due moments, so a log started at 14:00 is due at 14:00.

## 6. Calculations
Written in `checks.ts`, `hold.ts`, `scoring.ts`, `figures.ts`; **independent cases** in
`scripts/knowledge/cases-checks.py` (which writes `src/tools/checks/__tests__/cases.json`).
- Interval *I*; grace *G* = min(max(*I*/4, 5 min), 12 h). Next due *d* = last result + *I*, or `since` before the
  first. State at *now*: failed if the last result is bad; else late = now − *d*: overdue if late > *G*, due if
  late ≥ 0, soon if −late ≤ *G*, done otherwise; event checks are *event*.
- **Compliance in [from, to]:** walk the results in order with *d* = `since`; a result meets the due moment *d*
  (early or late) if it comes by *d* + *G*, counted when it is done; each *d* with *d* + *G* < the next result (or
  < *to*) is *missed* at *d* + *G*, then *d* += *I*; a result sets *d* = result + *I*. expected = on time +
  missed; pct = on time ÷ expected. **Case:** hourly from 0, done at 5, 63, 121, 250, looked at 300 → expected 5,
  on time 4, missed 1, 80%, longest gap 129 min (`cases-checks.py` walks it minute by minute, and 40 random
  cases; the module matches all 41).
- **Failure:** the window = the failure's time − the last good result of the check (else the log's start); a
  failure with no good check between it and the failure before it continues that one and holds nothing more.
  Packs = typed, else window × rate (Line capacity's, else the line's rated speed), else *missing, named*. **Case
  (the knowledge record):** good 10:00, failed 11:00, 110 a minute → 60 min × 110 = 6,600 packs. Money = packs ×
  the line's materials a pack through `problemCost` (the register's model), else the materials named as missing.
- **Value:** good inside [lo, hi] inclusive; headroom = min(hi − v, v − lo) ÷ (hi − lo); nearing when ≤ 15%; trend =
  Mann–Kendall S/τ and Sen's slope (from 8 readings). **Case:** 61, 62, 62, 64, 65, 67, 68, 70 on 40–75 → S 27, τ 0.98,
  Sen 1.31 a reading, headroom 14.3%, nearing the upper limit, rising.
- **Score** (`scoring.ts`): points = Σ answered levels; max = Σ (answered × top level); pct = points ÷ max;
  groups the same by heading; a question answered not applicable leaves both sides; findings = answers below the
  line; falls in a row counted back from the newest; repeats = below the line now and in the audit before.
  **Case:** the record's Line 3 — 52 of 80 = 65%; Sort 87.5, Set in order 68.8, Shine 43.8, Standardise 68.8,
  Sustain 56.3%; nine findings below 3; the audit before (58 of 80) shared four, so four repeats.
- **Clean record:** 1 − 0.05^(1/*n*): 200 checks → 1.49%.

## 7. Outputs
**On the screen** (the lean page, `docs/LEAN-PAGE.md`), top to bottom: the band (the log, its line, the verdict —
*"2 overdue"*, *"Up to date"*, *"1 check failed"*); the **tiles**, each *of* the plan and *since* the 7 days before —
*Done on time* "9 of 11 · 82%", *Missed*, *Failed*, *Product held* (packs and money, or the missing input), and
*Latest score* for a scored log; the sentence; **the round** (what wants doing now, the most overdue first, then
what is done and when it is next, then what is done when something happens); the history and trend; the
failures with what each held; the checks as agreed; the action plan (the problems raised, with owner and day);
the closing line. **The sentences** are `says.ts`' — screen, paper and the acceptance script read the same.
**Only the abnormal carries colour** (red overdue/failed/missed, amber due, green done, grey event/off), always
with its words. **Money** is one output, never the verdict: the packs held in money by the register's model, or
*"Give the line its materials a pack to say the product held in money."* **What it does not claim:** a pass is a
tap by a person; compliance says the check was done, not that it was done well; a clean record is "at most 1.5%
could fail, 95% sure", not a guarantee; the hold is facts for the site's decision, never the decision.

**The report.** A log's paper (`checksPaper.ts` through the report engine `lib/report`, in *Report ▾*; also its
section of the line report): the band (log, line, project, printed); the tiles; what it says; **the checks as
agreed** (name · where · who · how often · what passes / the limits / the score to reach · the reaction — and,
under it, the standard the log rests on and what of it is TO CONFIRM, as the definition says); **compliance by
check** for the period (due, on time, missed, %, longest gap); **the failures and what each held** (when, the
check, the note, the window, the packs and money or the missing input, the problem raised and where it stands);
for a value check its readings against the limits as a picture and a table; for a scored check the audits in
order, the score by heading, the findings and the repeats; for a CILT log the tags (raised, open by age, repeats);
the action plan; the closing line; the limits the definition states. It reads the same `figures.ts` as the
screen; nothing missing is made up.

## 8. Manufacturing usability
**The round is the page**: on a phone the checks that want doing are on top, each a card with the check, where,
who, when it is due and **one big tap**: ✓ Pass (green) and ✗ Fail (red) for pass or fail; a number box with the
unit and the limits beside it for a value (outside the limits it is said in red *before* it is saved, and still
saved — a failed reading is a result); *Start the audit* for a scored checklist (a full-screen sheet of
questions with the level words, a running score, Finish held until every question is answered or marked not
applicable); a number for a count. A pass is one tap and a toast with Undo; a fail asks one thing (a note and,
if known, the packs) and shows what it holds before saving. The page is tabs on a phone (Round · History · The
checks); the Logs hubs list a log with its state in words and colour. Taps: a pass 1; a fail 3; an audit 22.

## 9. Failure handling
No checks on the list: *"Nothing is on the list to check yet"* with *Start from the starter list*. No
result: *"none done yet"*. A number that is not a number: *"Numbers only"*, not saved. A scored check with an
unanswered question: Finish held, saying which. A limit blank: *recorded, not judged*. A client: the round's
buttons are not drawn and the page says it is theirs to read. Offline: the tap is kept and syncs (results merge
by id; a strike holds). A result struck: gone from every figure, kept, with Undo. A check taken off the list:
no longer due, its results kept. No line on the log: it cannot raise a problem and says *"Put the log on a line
to raise problems"* (a log is started on a line). The line has no rated speed: the hold is the window and the
named missing input. Two phones tapping the same check within a minute: both results kept (two results, one due
moment — the second is early for the next).

## 10. Integration
**Record:** `ToolStudy` (`tool: 'log'`) — the key already allowed by `studies_tool_check` (`supabase/SHAPE_TOOLS.sql`,
applied); `agreed.log` and `facts.results`/`facts.tags` are JSON inside the existing `agreed` and `facts`
columns, so **no mapper or migration changes** (`sync-schema.test.ts` agrees as it stands); `facts.results` merges by
id like readings (`sync-pass.test.ts`, the new case). **Where it shows (rule 5):** the Logs pages — the factory's
hub `#/logs` (every definition grouped, with this scope's logs, due, overdue and failed counted), a line's
`#/lines/:ws?view=logs` (Stops timed, the line's first log, and every check log on it) and a project's
`#/logs?project=` — and the registry entry FC-236 lists *Check logs* where Logs go (Tools, Jump to, the project's
Tools page); `#/log/:key` (one kind's logs and *New from the starter list*) and `#/log/:key/:id` (the record); the
**line's page** (its Logs section, and what is owed in its tour), the **line report** (the log as a section of the
paper, and its overdue and failed checks in *who owes what by when*), **Needs you** and the project's Actions (an
overdue or failed check as a `check` row opening the log), the **register** (a failure raises a problem: the
check's name, where and when, the priority from the check, the line, the machine, the packs held; a re-test
that fails again adds a step to its journey; an audit's findings are offered as problems; a CILT tag is a problem).
**Access:** `can.edit` records results and tags, `can.agree` changes the checks, `can.remove` deletes the log; a
quick log (no project) is its people's. **Sync:** the engine as it is. **PAGES.md and the inventory** say what the
hub, the list and the record must show; `smoke.mjs` loads the three routes; the paper is in `report-stress` /
`paper-parity` as a study paper is.

## 11. Verification
**Unit tests** (`src/tools/checks/__tests__/`): `checks.test.ts` (the interval, grace, five states against the
cases script, compliance against the minute walk and 40 random cases, failures and windows, the clean bound against
scipy, a value's verdict and trend, the check as agreed), `figures.test.ts` (every definition's worked examples
through the shared module, the scored checklist against the record's case, the hold in packs and pounds, the seam
`holdFor`, tags), `defs.test.ts` (every definition's shape: its starter list valid, its catalogue entry and route,
its standard honest — a clause is never quoted without being listed TO CONFIRM). A merge test in
`src/cloud/__tests__/sync-pass.test.ts` (results from two phones are all kept, a strike holds).
**Acceptance script `scripts/acceptance/log-shape.mjs`** (in the gate): table-driven over **every** registered
definition — it starts a log from the starter list, runs a round on a phone, checks every state and sentence
against the module, fails a check and finds the problem on the register with what it held, reads the paper back,
edits and deletes with Undo, reads it as a client, checks the line's page and report and Needs you, and the phone —
then drives each definition's worked examples and compares the page with the numbers they were hand-worked to.
**Screenshots** of the hub, a line's Logs, a round on a phone, an audit sheet and a log's paper compared with live.

**Acceptance criteria.** Each is proved by the unit test or the step named; "S*n*" is a section of `log-shape.mjs`.
1. The five states and their tones follow the schedule rule for every case in the cases script — `checks.test.ts`
   (*the state of a check now*); on the page, each state is shown in words and colour — S3.
2. Compliance equals the minute-by-minute walk on 41 cases and the hand-worked case (5 due, 4 on time, 1 missed,
   80%) — `checks.test.ts` (*compliance*); the tiles on the page equal `logTiles` — S3, S4.
3. A failure's window, a re-test continuing it, the packs (typed, Line capacity's, rated, missing named) and the
   money by `problemCost` equal the independent cases — `figures.test.ts` (*what a failure holds*); the sheet and
   the failures list show them — S3.
4. A failed check raises exactly one problem on the register with the check's name, where, priority and the packs;
   a re-test failing again adds a journey step and no second problem — S3 (reads the register).
5. The scored checklist reproduces the 5S record's case (65%, Shine 44%, 9 findings, 4 repeats) and the GMP case
   (90%, 3 findings) — `figures.test.ts`; the audit sheet's running score and the finished score equal it — S4.
6. A value is judged inside its limits inclusive, nearing a limit within 15%, trended from 8 readings equal to the
   independent S, τ, Sen's slope — `checks.test.ts` (*a value*); the page says it — S4.
7. Results from two phones merge by id and a strike holds — `sync-pass.test.ts`.
8. Every definition registered has a valid starter list, a catalogue entry whose route is `/log/<key>`, an honest
   standard and examples that pass — `defs.test.ts`, `figures.test.ts`.
9. The three Logs pages count what the module counts — the factory's hub, a line's, a project's — S1, S2.
10. The round on a phone (390 px): a pass is one tap, a fail three, a value and an audit work; nothing off the side;
    the buttons are at least 44 px — S3.
11. The paper, downloaded and read back with `pdftotext`, carries the checks as agreed, compliance by check, the
    failures with what each held, the standard and what is TO CONFIRM, the limits — S3.
12. Rename, edit a check, take one off, delete with Undo; a client sees the page and no control that writes —
    S3.
13. The line's page lists the log with its state; the line report carries its section and its owed checks;
    Needs you / the project's Actions carry an overdue or failed check as a row that opens the log — S7.
14. Empty, too-few and invalid states say what to do and block nothing that is valid — S9.
15. Nothing that worked broke: the gate's other scripts (front-door, tools-directory, structure, journeys,
    project-workspace, line-hub, smoke, inventory) as run on this branch.
*Not yet proved:* the two-device sync of a live log (`sync-two-devices.mjs` is not run here — the merge is proved
at unit level); iOS Safari; a log of thousands of results.

## 12. Maintainability
**Where the code lives:** `src/tools/checks/` — `def.ts` (the type a definition fills), `defs/*.ts` (one file a
log, found by `registry.ts`), `checks.ts` (the schedule, states, compliance, failures, value trend), `scoring.ts`,
`hold.ts` (the hold, the money and the seam for FC-135), `figures.ts` (all of a log worked out), `says.ts`
(sentences, tiles, closing, plan), `start.ts` (a log from its starter list), `store.ts` (a result written, its problem raised on the register), `owed.ts`
(what is owed), the screens and `checksPaper.ts`. **How to add a log** (the next twenty): a file in `defs/` exporting
`def: LogDef`; a spec from the template naming the standard and what is TO CONFIRM; its examples hand-worked with a
named source; a catalogue entry with `built.where: ['/log/<key>']` and `kind: 'log'` and **no** app face (the
hub FC-236 has the face); nothing else — `defs.test.ts` and `log-shape.mjs` pick it up. **Left for later,
with numbers:** the product-on-hold register (FC-135) reads `holdFor`; the control plan (FC-133) writes checks;
the traceability exercise (FC-174, a timed exercise); the hour-by-hour board's plan for the day (FC-196, the
*count* kind is built and proved at unit level only); a result's photo (needs a storage rule for log photos);
auditors' agreement (FC-121); the register of CCPs (FC-168). A fourth kind of change is not involved.
