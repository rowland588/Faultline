# Stage gate, part 1 — the gates and the plan

The map of a stage-gate job's front page and the gates around it (the project
type stored as `commissioning`, never shown under that name): the project page
and its plan, the Details page, the three step gates (Install, Set up, Hand
over), the day, Materials, Programs and the meeting notes. Read from the code,
then confirmed by driving every control in Chromium at 390×844 (touch,
`isMobile`) and 1366×900 with the seeded job (`src/dev/seed.ts`), 3 October
2026. The tests, the fixes, the trial card, the line standard and the client
report are mapped in `stage-gate-tests-and-report.md`; here only their doors.

Conventions: `P` is the project id. "Record" names the TypeScript type and the
`src/db` module that owns the store. "Control room" is Home
(`ui/JobsBoard.tsx`) and the project page. "Report" is the client report
(`lib/clientReport.ts` → `lib/clientReportPdf.ts`) unless another PDF is named.

## The records this area reads and writes

| record | type / module | what it is here |
|---|---|---|
| project | `Project` (`types.ts`), `db/projects.ts` | name, lead, colour, description, `plannedAt` (handover agreed), `expectedAt` (now expected), the gate stage lists (`installStages`/… via `lib/install keepStages`), the method (`commissioning`) |
| machine | `Asset` (`lib/testing`), `db/testing.ts` | name, supplier (`oem`), `dueOn` / `onSiteOn` / `installedOn` / `runningOn` |
| step | `Test` with `kind: 'install'` and `gate: install·setup·handover` (`lib/testing`), `db/testing.ts` | one cell of a gate grid: dates, who, outcome |
| test / fix | `Test` (`kind` absent / `'fix'`) | Commission and Fixes (part 2); drawn on the plan here |
| item | `TestItem` (`lib/testing`), `db/testing.ts` | `found` (a problem, or a move when it has `movedFrom/movedTo`), `note` (a meeting note; `due` + `onPlan` = its reminder) |
| material | `Material` (`lib/materials`), `db` materials store | what, how much, due, from, line, in / not in |
| program | `Program` (`lib/programs`), `db` programs store | what, machine, runs, test date, not written / on the machine / proved on |
| line | `PaceLineRow` (`db`) | the job's lines (a material can be for one) |
| members | `cloud/members.ts` | who is invited |

No screen in this area stores anything new: the verdict, the waiting-on table,
the journey, the plan, the day and the reminders are all read off the records
above (`lib/standing.ts`, `lib/install.ts`, `lib/story.ts`, `lib/day.ts`,
`lib/reminders.ts`).

---

## 1 · The project page — `#/project/P` (`screens/ProjectDashboardScreen.tsx`, `TestingOverview`)

**The sentence it lets the lead say to the sponsor:** *"This is where the job
is against the handover date, what is outstanding and whose it is, where each
machine has got to, and the plan — and here is why it moved."*

Reads: `useStanding` (the verdict, the waiting-on rows, the plan marks, the
peer counts), `useTesting` (tests, items, machines), `usePrograms`,
`useMaterials`, `useWalkSnags` (the filmed walk), `useProject`, the notes
(`listTestItems`). Writes (through the panels below): step dates, problems,
moves, fixes, reasons, a note's reminder tick.

Control room: this IS the control room for one job. Home's job row reads the
same `standing` sentence. Report: the verdict sentence and the waiting-on
table print on the client report's front sheet; the plan prints as the Gantt
page (`lib/ganttPdf.drawGantt`).

Controls, top to bottom:

| control | does |
|---|---|
| Spine `‹ Projects` (phone) / crumbs `Projects › job` (desk) | to the project list |
| `S` account button | account menu (app-wide) |
| `⚙` (Details) | `/setup` |
| `Meeting notes` (+ count of notes still to raise) | `/notes` |
| `Pareto` / `Lever tree` | only when the project opted in (`project.pareto` / `leverTree`) |
| `Reports` | opens **On paper** (`ui/ReportsSheet`, §1.6) |
| Peers row `Install · Set up · Commission · Hand over · Fixes · Materials` with open counts (red when any is late) | each gate's screen (`ui/Peers projectPeers`). Shown on an empty job too (this pass) |
| **Verdict** card (`ui/Verdict`) — eyebrow, sentence, slip line, tiles `days to handover · outstanding · late` | not pressable; on a phone the tiles hide (the sentence says them) |
| **Reminders** card (`ui/Reminders ProjectReminders`), only while a note's reminder is due this week | `Meeting notes ›` → `/notes`; the round tick on each = "Talked about — done" (writes `doneAt`, toast with Undo) |
| **Needs you** (left column; `lib/portfolio needsYou` over `jobItems`) — says `4 past the day · late first`; up to 7 rows: past its day (red stripe, `was 29 Sept`), due within 3 days (amber, `due tomorrow`), the next booked (indigo, `7 Oct`); each row `what` · `kind · who`; foot `5 more booked · 2 with no date agreed` | each row its record (`lib/plan planHref`): a test, fix or step → `/testing/<id>`; a material → `/materials`; a program → `/programs`; a machine → `/install`. `The plan ›` → `/plan` |
| **Where each machine is** (right column) — says `1 at Set up · 2 at Install` | the journey (§1.1), unchanged |
| **Day** link `TODAY … Read the day ›` / `LAST LOGGED · <day> …` (under the machines) | `/day` or `/day?d=<last day with a story>` |
| **The plan** line `23 dates · 10 done · 7 still ahead · 4 past the day` · `Open the plan ›` | `/plan` — the Gantt on a page of its own (§1.3). `?view=plan` lands there too |
| Empty job: `Nothing planned on this job yet.` + `Add the first machine` | `/install` |

One screen (5 October — Rowland: "too much on a screen… this is more about
opening doors rather than keeping it linear and simple"). What the old folds
and alarms held: the two late alarms are rows on Needs you with their day;
"What we're waiting on" (§1.2) left the front page — its counts are the peers
row's, its table still prints on the client report; the plan is `/plan`.
Phone: one column — the verdict, Needs you, the machines, the day, the plan.

### 1.1 Where each machine is (`ui/Journey.tsx`)

Reads `lib/install journeyOf` per machine: four tiles Install · Set up ·
Commission · Hand over, each `done` (green wash), `under way` (indigo),
`late` (red border — a stage late by `lateOrProblem`: its day gone, or hours
lost), `a problem` (amber — a stage that hit a problem and lost no time),
`didn't pass` (solid red — a test), `still ahead` / `not started` (grey).
Under a machine with red or amber, `reasonsOf` names why, each in its colour
("Sensors checked — late, 2 h lost · Dry run — a problem, no time lost").

| control | does |
|---|---|
| each tile (aria-label `Machine — Gate: state`) | that gate's screen (`JOURNEY[i].path`) |

Report: the same reading prints beside each machine on the client report.
Phone: tiles 44px tall, the reason under the name (this pass).

### 1.2 What we're waiting on — on the report only since 5 October

The screen's table (`ui/Outstanding.tsx`) went with the front page's fold: it
was six rows each arrowing to a tab already in the peers row, with the same
counts. The rows still come from `standing.rows`: Install steps / Set-up steps
/ Tests still to run / Fixes still to do / Hand-over items / Materials /
Programs / Machines not here yet / Observations — Open, Late, Mostly whose.

Report: the client report prints this table from `standing.rows`, unchanged.

### 1.3 The plan — `/plan`, `screens/PlanScreen.tsx` (`ui/Gantt.tsx`, `lib/gantt.ts`, `lib/ganttPdf.ts`)

Rows are `standing.plan` grouped: Machines arriving · Materials · Programs ·
Install · Set up · Commission · Hand over · Fixes · Reminders; plus one lane
**Found on the walk** (`lib/walkSnags`). Each stage row carries its story
(`lib/story`): the overrun hatched red (`+9d`), a red diamond on each day
something happened, the fixes under it, an amber edge when it overlaps the
step ahead. The handover lines (agreed, dashed grey; expected, dashed green)
and today (blue) run down the chart.

| control | does |
|---|---|
| `Fit · Days · Weeks` | the scale. Phone opens on Fit (the whole job on the screen, each name above its bar) |
| freshness stamp (`lib/asOf`) — "Up to date as of 09:12", amber when stale | not pressable; only when signed in and synced |
| `Go to today` | scrolls the calendar to today (Days / Weeks only — hidden on Fit, where it did nothing; this pass) |
| `PDF` | landscape A4 of the same chart + "why the plan moved" (`drawGanttDoc`), file `<job>-plan-<date>.pdf` |
| `Handover moved +8 days · now 7 Nov · <why> ›` (only after a later handover with a reason) | the handover's story (ThingPanel, §1.4) → `Change the date ›` = `/setup` |
| group header `▾ INSTALL 6` (and its folded summary bar) | folds/unfolds that gate. Phone: every gate starts folded to one bar |
| a stage row's name, bar, overrun or diamond (Install / Set up / Commission / Hand over rows, or any row with a story) | the stage's panel (§1.4) |
| a row with no story (machine, material, program) | its record: machine → `/install`, material → `/materials`, program → `/set-up` (`ganttHref`) |
| `↳ Fix: …` row or its bar | `/testing/<fixId>` |
| a reminder row (purple) | `/notes` |
| `Found on the walk` lane name | the walk panel with every snag (`ui/WalkPanel`) |
| a walk marker (number still open; solid = past due; small green dot = all closed) | the walk panel for that day / week |
| key | not pressable; ends "Tap a row to open it." |

Phone: the whole row — the name and the strip of calendar under it — is the
tap target (this pass); walk markers keep their own taps.

Labels: a row reads "step, machine under it" only when the label is
`Machine — title` (the machine is carried as `PlanMark.on`). A title with a
dash of its own ("Weight accuracy — 400g") stays whole on screen and paper
(this pass — it drew as a step called "400g" on a machine called "Weight
accuracy").

### 1.4 The stage panel (`ui/StagePanel.tsx`) and the date's story (`ThingPanel`)

**Stage panel** — opened from a stage row. Header `Planned 26 Sep – 5 Oct ·
+9 days past the finish first planned`. Then, in date order: **Moved** (from →
to, +days, the reason, pictures), **Found** (what was written up), **Fix**
(title · done / date agreed / no date agreed yet · who).

| control | does |
|---|---|
| `Edit` on a Moved/Found line | textarea + `Save` / `Cancel`; writes `TestItem.what`, toast with Undo |
| `Remove` | deletes the item (toast with Undo); a removed move stops drawing as an overrun, dates stay |
| a picture | `EvidenceViewer` |
| `Open the fix ›` | `/testing/<fixId>` |
| `Change the dates` | Starts / Finishes (`DatesForm`); later than it was → **Why has it moved?** (§1.5); `Save` writes `plannedFor/plannedTo` |
| `Hit a problem` | **What's the problem?** (`ProblemForm`, §1.5) |
| `Open the step ›` | `/testing/<stepId>` |
| `✕` / scrim | closes |

**ThingPanel** — the handover, a machine, a material or a program with moves:
`+N days since first planned`, each move with `Edit` / `Remove`, and
`Change the date ›` to where its date is kept.

### 1.5 Why has it moved? / What's the problem? (`ui/WhyMoved.tsx`, `ui/DateWhy.tsx`)

Asked whenever a finish (or the handover, a machine's due day, a material's
due day, a program's test day — `DateWhy`) is pushed later.

| control | does |
|---|---|
| quick reasons `Problem found on the machine · Waiting on parts · Supplier not on site · Our side not ready · Rework needed` | fill What happened |
| `What happened` | the reason (required to save the move) |
| Evidence `📷 Camera · 🎥 Video · 🖼 On the phone` (`ui/EvidenceDoors`) | file chooser / in-app recorder; headless says "Couldn't open the camera — check the camera permission…" |
| `Book it in as a fix` + `Date agreed` (stage moves only) | makes a fix from this step (`planNextFrom`) |
| `Move what follows on this machine by N days too` | shifts the later steps on the machine; ticked by itself only when the new finish runs into the next step (this pass for the problem form) |
| `Save the move` / `Save the problem` | dates + a `found` item with `movedFrom/movedTo` (+ fix); one Undo takes all of it back |
| `Just change the date — no reason` | writes the date, draws no overrun |
| `Cancel — keep the dates` / `Cancel` | nothing written |

Report: the plan PDF and the client report print each move with its reason
("why the plan moved").

### 1.6 On paper (`ui/ReportsSheet.tsx`)

| door | goes to |
|---|---|
| `Client report` | `/report` (part 2) |
| `Today` | `/day` |
| `Line standard` | `/standard` (part 2) |
| `Evidence cards` (the job's own walk) / `Evidence cards — <line>` | `/w/<ws>/snaglist` |
| `One-page report — <line>` | `/w/<ws>/report` |
| `Spreadsheet` | builds and saves `Faultline-export-<date>.xlsx` (every project), says `Saved …` |

### 1.7 Old lenses and links

`?view=snags` is the Evidence lens: crumbs `Projects › job › Install › The
line, filmed`, the peers row with Install marked, and `PaceSnags` (`Film a
walk` → `/w/<ws>/snags`) — the same thing Install's fold holds.
`?view=lines` (and `data`, `next`, `wins`) are not a stage-gate job's lenses
and fall back to the overview. `?view=meeting` → `/board`. `/commissioning`
and `/commissioning/anything` open Commission (`/testing`).

---

## 2 · Details — `#/project/P/setup` (`screens/ProjectSetupScreen.tsx`)

**The sentence:** *"This is what the job is, who is accountable for it, the
two dates it is judged on, and who can see it."*

Reads/writes `Project` (`useProjects().rename`), lines (`usePaceLines`),
members (`useProjectMembers`). Control room: the name, lead and colour head
Home's job row and every page; the two dates drive the verdict's days to
handover and slip line. Report: the client report's cover (name, lead, dates,
who is on the project).

| control | does |
|---|---|
| peers row (none marked — Details is not a gate) | each gate |
| Fold **The project** — `Project`, `Lead — one person, accountable`, `What it is` (`ui/Draft`: write on blur, no write per keystroke) | `rename` |
| colour swatches (radio) | `project.color` — Home board and the reports |
| `Handover agreed` (date) | `plannedAt`, written on change |
| `Now expected` (`DateWhy`) | `expectedAt`; later asks why (the handover's story) |
| `How this project runs` — Stage gate / 3P / Lever tree | switches the method (`setPlanModel`) |
| Fold **People** — chips (× removes), `Invite by email…` + role + `Invite` | `project_members`; the invite box takes the row on a phone (this pass) |
| `Archive this project` (confirm) | archives, → `/projects?view=archive` |
| `Open the archive` | `/projects?view=archive` |
| Fold **Lines** — ↑ ↓, key, name (Draft), Owner / Sponsor pickers (`pick` / `rename`), `Open pack`, `Workspace`/`Workspace +`, `×` (confirm) | `PaceLineRow` writes; `Open pack` → `/project/P/line/<id>`; Workspace makes/opens the line's workspace |
| Add a line — `Line`, `Name`, `Owner`, `Sponsor`, `Add line` (Enter works; duplicate key says so) | `addPaceLine` |

**Finding — no answer to "where is this in the report":** machines, who
supplied them, and the stage lists are *not* on Details on a stage-gate job:
machines live on Install (the row sheet), the stage lists in each gate's
`edit stages`. Details only says so implicitly.

---

## 3 · The gates — `#/project/P/install`, `/set-up`, `/handover` (`screens/InstallScreen.tsx`)

**The sentence it lets the site say to the OEM:** *"These are your machines,
each one's stages at this gate, which are done, which is late and whose it
is, and what stopped it."*

One screen, three faces (`FACE`). Reads `useTesting`, `useStanding`,
`useProjects` (the stage lists, `lib/install usualStages`), the walk frames.
Writes steps (`planSteps`, `patchTest`, `deleteTest`), machines
(`addAsset`, `saveAsset`, `removeAsset`), the project's stage list
(`updateProject`). Control room: the gate's peer count, the journey tile,
the waiting-on row (`Install steps to do` …), the plan's gate group, the
day's gate bar. Report: each machine's gate sentence (`installOf().says`)
and the plan.

| control | does |
|---|---|
| crumbs / spine `‹ job` | the project page |
| peers row (this gate marked) | sideways |
| header `4 of 6 steps done · 1 machine installing · 1 late · N not planned yet` | not pressable |
| `Read the day` | `/day` |
| `Give the N new machines the M stages` (only when 2+ machines have none) | one tap gives them all the gate's stages, Undo |
| `Machine · edit stages` | **The stages** sheet (§3.3) |
| a stage name (column header) | the column sheet (§3.2) |
| a machine (row header, name + supplier) | the row sheet (§3.2) |
| a cell (`25 Sep` done · `Late` · `Problem` · `Done?` · a date · `—` · `+` not added) | the cell sheet (§3.1) |
| `+ Add the 6 stages` (a machine with none) | gives it the stages, Undo |
| row sentence + `Mark it installed today` (Install, once every step is done) | `installedOn = today`, Undo |
| `+ Add a machine` → `Machine`, `Who supplied it`, `Add` / `Cancel` (Install only) | `addAsset` |
| Fold **The line, filmed** (Install only) — `Film a walk`, frames, pins | `PaceSnags` → `/w/<ws>/…` |
| **Programs** (Set up only) | `ProgramsScreen embedded` (§6) |
| **Line standard** card (Hand over only) — `Open ›`, a product, `Make the first map ›` | `/standard`, `/standard/<id>` (part 2) |

### 3.1 The cell sheet (`ui/InstallGrid.tsx`)

Title `Machine — Stage`; sub `Not done yet · who · planned 1 Oct`.

| control | does |
|---|---|
| `Done today` | `outcome passed, ranOn today`, closes, Undo |
| `Hit a problem — write it up` / `Another problem — write it up` | the problem form (§1.5) |
| `Not done after all — put it back` / `Not a problem after all — put it back` / `Put it back to planned` | back to planned, Undo |
| `Say how it went` (`ui/Voice`) | records, then shows what it heard as changes to apply; with no microphone it says "The microphone is blocked…" |
| `Starts` / `Finishes (blank = one day)` + `Save` | held until Save; later asks why |
| `Who is doing it` (+ names already on the job) + `Save` | `withWhom`, Undo |
| `Open the step — pictures, what was found, fixes ›` | `/testing/<id>` |
| a `+` cell: `Add "Stage" here` | adds that step, Undo |
| `✕` / scrim | closes |

### 3.2 Column and row sheets

Column (a job stage): `Add to every machine / the N without it`, `Done today
on the one left / all N left` (asks when more than one), `Plan it for every
machine not done` (Starts/Finishes/Save; a push later asks why), `Who is
doing it, on every machine not done`. Column that is not a stage: `Move them
into` (select), `Remove from the N never started`, and a note on the ones
with work.

Row (a machine): `Add the N missing stages`, `Mark it installed today`
(Install), the **machine card** (`MachineCard`, from TestsScreen): name
(Draft), `×` remove (confirm, Undo), `Edit` → `Who supplied it`, `Expected on
site` (DateWhy), `On site`, `Installed`, `Running`; `A step of its own` +
`Add`; `Plan every step left on it`; `Who is doing every step left on it`.

### 3.3 The stages sheet (`ui/UsualStages.tsx`)

The job's own list for this gate (or "taken from <other job>", or "the app's
— make them yours"). `Edit` → each stage an input with `↑ ↓ ✕`, `+ Add a
stage`, `Save N stages`, `Cancel`, `Back to the app's N`. A rename asks
`Rename the steps already on machines?` (`Rename them too` / `Keep their old
names`); a stage taken out removes its never-started steps in the same tap
(one Undo brings both back); steps with work stay and the sheet says so.
`Also on the grid — not one of these stages`: `Move into…`, `Remove N never
started`, `Make it a stage`.

---

## 4 · The day — `#/project/P/day`, `?d=<day>` (`screens/DayScreen.tsx`, `lib/day.ts`, `lib/dayReportPdf.ts`)

**The sentence it lets the site say to the client at the end of a shift:**
*"This is what got done today, what did not go to plan, what we found and
what is booked next — with the pictures."*

Reads tests, items, machines, materials, programs. Writes nothing. Control
room: the project page's Day link. Report: its own one-page PDF (Day report);
"Today" on On paper.

| control | does |
|---|---|
| peers row (none marked) | sideways |
| `‹ <previous day with a story>` / `‹ Earlier` (disabled) | steps back over blank days |
| date box (max today) | `?d=<day>` |
| `<next day> ›` / `Today ›` / `Later ›` (disabled) | steps forward |
| gate bars `Install 4 of 6 steps done (by the end of the day)` | that gate |
| each line under What got done / What did not go to plan / What we found / Booked for the day / Next — <day> | its record (`/testing/<id>`) or list |
| `Go to <day>` (empty day) | the previous day |
| a picture | viewer |
| `PDF` → `Downloaded.` / `Sent.` / `Opened in a new tab.`; `Reload` when the tab is an old build | `<job>-day-<date>.pdf` |

A `?d=` in the future reads as today, and a day in another year says its
year (this pass). Read back: the PDF carries the headline, the gate bars and
every line of the screen.

---

## 5 · Materials — `#/project/P/materials` (`screens/MaterialsScreen.tsx`, `lib/materials.ts`, `lib/useMaterials.ts`)

**The sentence it lets the site say to the OEM:** *"This is what we are waiting
on from you, when it was due, and what is late."*

Reads/writes `Material` (`useMaterials`: add, save, markIn, markOut, remove →
Undo). Control room: the Materials peer count, the late alarm, the
waiting-on row, the plan's Materials group. Report: the client report's
materials grid and owes page (`lib/owes`).

| control | does |
|---|---|
| header `1 of 2 here · 1 late · 1 waiting, next due … · N with no date` | not pressable |
| empty: the explanation + the add form open | |
| each row: what (Draft), facts, `in 5 days` / `2 days late`, due date (`DateWhy` — later asks why), week strip | |
| `Mark it in` → `In on` + `It's in` / `Cancel`; `Not in after all` | `here`, `inOn` |
| `×` | remove, Undo |
| `+ Add what you need` → What it is, How much, Due, For (line), From, `Add it` (Enter works) | `add`; the form stays open, keeping the line, across the first add (this pass) |

---

## 6 · Programs — inside Set up (`screens/ProgramsScreen.tsx`, `lib/programs.ts`, `lib/usePrograms.ts`)

`/programs` redirects to `/set-up` on a stage-gate job (`ProgramsDoor`).

**The sentence:** *"This is what the machines have to run, whether it is on
the machine, and the day it was proved."*

Reads/writes `Program`; machines (`useAssets`, `addAsset`). Control room: the
Set up peer counts programs with its steps; the programs alarm; the plan's
Programs group; the journey's Set up tile. Report: the client report's
programs section and the Set up gate sentence ("· N of M programs proved").

| control | does |
|---|---|
| `N programs do not say which machine` strip: `A machine you have`, `Or a new one`, `Put all N on it` | `putAllOn` |
| each row: name (Draft), facts, `Machine` select, `Where it's got to` select (Not written / On the machine / Proved → asks the day), test date (`DateWhy`), week strip | `save` |
| `Mark it proved` → `Proved on` + `It's proved` / `Cancel`; `Not proved after all` | `markProved` / `markUnproved` |
| `×` | remove, Undo |
| `+ Add a program` → Name or number (+ `Same one as` chips), Machine, What it runs, Testing on, For, From, `Add it` | `add` (machine and line stay for the next) |

Empty: "Nothing on the list yet. Add the programs this line needs, below." with
the form open.

---

## 7 · Meeting notes — `#/project/P/notes` (`screens/NotesScreen.tsx`, `lib/noteScope.ts`, `lib/reminders.ts`, `ui/Reminders.tsx`)

**The sentence it lets the lead say to himself before the meeting, and then to
the room:** *"These are the things I must raise, about which gate, machine or
step — and the ones with a date will remind me."*

Reads/writes `TestItem kind 'note'`: `testId` = `''` (whole project),
`gate:<id>`, `asset:<id>` or a record id; `due` / `onPlan` = reminder;
`doneAt` = raised. Control room: the header button's count, the Reminders
card on the project page and Home, a reminder row on the plan (purple) when
"on the plan". Report: none on purpose — private preparation; the plan PDF
draws an on-the-plan reminder.

| control | does |
|---|---|
| `Copy as a list` → `Copied` | the open notes, grouped, to the clipboard |
| `+ Add a note` (open when there are none) → textarea (Enter adds), `About` (whole project / a gate / a machine), `Which one` (a step, test or fix under it), `+ Remind me about it on a date` → date, `Just remind me` / `Remind me and put it on the plan`, `No reminder`; `Add note`; `Close` | `addItem` |
| `N reminders today or gone` + `Notify me on this device` (or what this device can do) | browser permission + push registration (`cloud/push`) |
| group heading `Set up ›` / `Commission · Step — Machine ›` / `<machine> ›` | that gate / that record / Install (machine headings this pass) |
| the round tick | raised (`doneAt`); again = not raised |
| the note's words | edit: textarea, `About`, `Save` / `Cancel` (Esc) |
| `+ Remind me` / `Reminder · In 3 days · Tue, 6 Oct` | the reminder form: date, how, `Save`, `Remove reminder`, `Cancel`; Undo on each |
| `×` | delete, Undo |
| `Raised · N ▾` | shows the raised notes (each with its scope) |

---

## The modules behind this area

| module | one line |
|---|---|
| `screens/ProjectDashboardScreen.tsx` | the project page: header doors, peers, then on a stage-gate job `TestingOverview` (verdict, reminders, day link, late alarms, three folds); other methods' lenses |
| `screens/ProjectSetupScreen.tsx` | Details: identity, the two handover dates, method, people, archive, lines |
| `screens/InstallScreen.tsx` | the three step gates: header, grid, add a machine, the filmed line / programs / line standard |
| `screens/DayScreen.tsx` | one day's story and its PDF |
| `screens/MaterialsScreen.tsx` | what the job is waiting on |
| `screens/ProgramsScreen.tsx` | what the machines must run (embedded in Set up); `ProgramsDoor` redirects `/programs` |
| `screens/NotesScreen.tsx` | the meeting notes and their reminders |
| `ui/Verdict.tsx` | the dark card: the standing sentence and three tiles |
| `ui/Journey.tsx` | four gate tiles per machine, why it is red |
| `ui/Outstanding.tsx` | the waiting-on table; each row is the door to its list |
| `ui/Peers.tsx` | the sideways row (`projectPeers` on a stage-gate job) |
| `ui/Fold.tsx` | a card that folds, saying its answer when shut; shut on a phone |
| `ui/Gantt.tsx` | the plan on screen: scales, PDF, rows, story panels, walk lane |
| `ui/StagePanel.tsx` | a stage's story with Change the dates / Hit a problem; `ThingPanel` for the other dates |
| `ui/WhyMoved.tsx` | Why has it moved? / What's the problem?, `recordMove`, `recordThingMove`, `recordProblem` |
| `ui/DateWhy.tsx` | a date box that asks why when moved later |
| `ui/Reminders.tsx` | the notifier, the permission line, the project's reminders card |
| `ui/ReportsSheet.tsx` | On paper: every printable thing, one line each |
| `ui/InstallGrid.tsx` | the gate grid and its cell / column / row sheets, `DatesForm`, `PlanWindow`, `Who`, `SayStep` |
| `ui/UsualStages.tsx` | the gate's stage list, edited in place, renames and removals carried to the machines |
| `ui/InstallPanel.tsx` | **not this area** — "Add to phone", the PWA install row |
| `lib/standing.ts` | the one reading of a job: sentence, rows, peer counts, plan marks (now with `on`, the machine) |
| `lib/install.ts` | a machine's gate: its sentence, grid, journey, stage lists |
| `lib/story.ts` | moves, finds and fixes of a stage or a date; story keys; what follows on a machine |
| `lib/gantt.ts` | lays the plan out on a calendar: groups, rows, slips, fixes, walk lane |
| `lib/ganttPdf.ts` | draws that layout on landscape A4 (alone, and inside the client report) |
| `lib/plan.ts` | the plan's words (`planSays`, `windowWords`, `whenWords`) and the timeline layout Home and the report draw |
| `lib/asOf.ts` | "Up to date as of …", amber after a day without a sync |
| `lib/reminders.ts` | a note's reminder: what is due, in words |
| `lib/day.ts` | one date's story, read off the dates records carry |
| `lib/dayReportPdf.ts` | the day on one A4 portrait page |
| `lib/materials.ts` / `lib/useMaterials.ts` | a material's state, order, weeks; the live list |
| `lib/programs.ts` / `lib/usePrograms.ts` | a program's three states and weeks; the live list |
| `lib/noteScope.ts` | what a note is about, in the job's own words |
| `lib/owes.ts` | who owes what by when — the client report's owes page (not drawn on these screens) |

## Findings that need a decision (not changed)

1. **Two headings for one card, on a phone.** Folded cards hide the inner
   heading (`.fold-b .jr-head`), so this is fine now — noted only because
   `Journey` and `Outstanding` still carry headings of their own for the
   places that mount them bare.
2. **Details does not hold machines or stage lists on a stage-gate job**
   although the brief describes it that way; they live on Install's row sheet
   and each gate's `edit stages`. Recommendation: one line on Details —
   "Machines and their stages are kept on Install" with a door — rather than
   moving them (rule 1).
3. **`?view=snags` is a second route to Install's "The line, filmed"**, with
   the project header (Meeting notes / Reports / ⚙) on top of a page whose
   crumbs say it is under Install. Recommendation: redirect `?view=snags` on
   a stage-gate job to `/install` with the fold open (one thing, one place).
4. **Removing a line on Details** asks first but offers no Undo, unlike every
   other delete in the area (materials, programs, notes, machines, steps).
   Recommendation: return a Restore from `removeLine` and `offerUndo` it.
5. **The Who form on a cell sheet saves and stays open**, while Done today,
   the dates and Add close the sheet. Harmless (the toast confirms), but the
   same sheet behaves two ways. Recommendation: close on Save like the dates.
6. **The seed gives Line 7 and Line 8 the same workspace**, so On paper lists
   "Evidence cards — Line 7" and "— Line 8" going to one place. Seed only.
7. **"Nothing planned on this line yet"** on an empty stage-gate job says
   *line* for a *job*, and its one button plans a test although Install is
   the first gate. Recommendation: "Nothing planned on this job yet" and the
   button "Add the first machine" → `/install` (a method-shape choice, so
   left).
