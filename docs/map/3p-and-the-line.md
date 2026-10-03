# 3P and the line — the map

The map of a 3P job (the project type stored as `board`: one line's — or
several lines' — improvement run week by week on the board, actions sorted
People · Plant · Process, kept entirely in the app). Read from the code, then
confirmed by pressing every control in Chromium at 390×844 (touch, isMobile)
and 1366×900 with the seeded job "Line 7 pace" (`src/dev/seed.ts`: lines 2A
and 7, two measures, six actions, seven materials, seven programs, Line 2A's
stations with one what-if), 3 October 2026.

Conventions: `P` is the project id, `L` a line id. "Record" names the
TypeScript type and the `src/db` module that owns the store (all re-exported
through `src/db.ts`). "Control room" is Home (`ui/JobsBoard.tsx`, fed by
`lib/portfolio.ts`) and the project page (`screens/ProjectDashboardScreen.tsx`).
"The report" is the 3P client report — the page `screens/PaceExecReport.tsx`
(`#/pace-report?project=P`) and the PDF `lib/paceReportPdf.ts`, which are drawn
from one `PaceReportData` block so they carry the same sections with the same
numbers; `&line=L` makes it one line's deck.

## The records a 3P job runs on

| record | type · store | what it is on a 3P job |
|---|---|---|
| Action | `PaceTodoRow` · `db/pace.ts` (`pace_todos`) | the board's cards: what, why, where, who, `due`, `when` (words), `state` todo/waiting/done, `pillar` people/plant/process, `lineId` (none = "All lines"), `doneOn` (stamped by the store), `outcome`, `notes`, `media`, `caseId`. `lib/actions.ts` turns each into the `PaceAction` shape every board-drawing screen reads. |
| Line | `PaceLineRow` · `db/pace.ts` (`pace_lines`) | key, name, owner/sponsor (+ account emails), `workspaceId` (its walk and stops log, made on first use), `capacity` (the line balance document: stations, target, planned hours, what-ifs) |
| Project | `Project` · `db/projects.ts` | name, lead, colour, method flags, `pareto` opt-in, `measures[]` and `periods[]` |
| Target, Reading | `Target`, `Reading` · `db/measures.ts` | one number per line × measure × period; one dated number per line × measure |
| Win | `PaceWinRow` · `db/pace.ts` (`pace_wins`) | title, story, who, where, typed impact, or a frozen `proof` (`lib/measureProof`) |
| Material, Program | `Material` · `db/materials.ts`; `Program` · `db/programs.ts` | what the job waits on; what the machine can run (held under Materials on a 3P job) |
| Note | `TestItem` kind `note` · `db/testing.ts` | meeting notes, optional reminder `due` |
| Stop | `Observation` · `db/observations.ts` | the stops timed on a line's workspace — what the Pareto and the line balance's running % read |
| Walk | `Segment`, `SnagAsset`, `Snag` · `db/walk.ts` | the filmed walk, marked frames, pinned (or frameless) snags = "evidence" |
| Line standard | `Standard` · `db/standards.ts` | who stands where on each product (other agent's screen; card on the Lines lens) |

**Control room, Home:** a 3P job's row says `pacedSays` ("2 of 2 lines at
target, with 5 actions open — 1 past its day"), its People/Plant/Process counts
(`pacedPillars`), "N of M at target", and its dated materials/programs/actions
on the shared calendar. **Not on Home: the line balance** — see findings.

---

## 1 · The project page — `#/project/P` (`ProjectDashboardScreen.tsx`, 3P branch)

**Sentence:** *the lead to the client — "this is where every line stands on the
number we agreed, what is open on the board and who is late, and whether what we
closed worked."*

Reads: `useActions` (actions + lines), `useMeasures`, `usePaceLines`,
`useImpacts`, `useMethodCounts` (peers), `useAllLinePacks`, `useMaterials`/
`usePrograms` (late alarms), `useTesting` (reminders), `analyse()` on each
line's `capacity`. Writes: nothing (doors only).
Report: the Verdict sentence is the report's front stats; The board → report
"3P Board"; Line balance → "Where the line is limited"; Did it work? → "Who is
doing what · Done — what came of it"; numbers → page 1 charts.

| control | does |
|---|---|
| Spine `‹ Projects` (phone) / crumbs `Projects › Line 7 pace` | up to the projects list |
| Account `S` | account sheet (shell, other agent) |
| `⚙` Details (36 px) | `/setup` — Lines & people |
| `Meeting notes` (+ open count badge) | `/notes` |
| `Pareto` (only when `project.pareto`) | `/pareto` |
| `Reports` | the Reports sheet (§1a) |
| Peers `Board · Lines · Numbers · Wins · Evidence · Materials` (+ open / late counts) | `/board`, `?view=lines`, `?view=data`, `?view=wins`, `?view=snags`, `/materials` (`ui/Peers methodPeers`); the one you are on is a label |
| Verdict card "Where the lines are" | the sentence; not tappable (by design) |
| Reminders card (when a note's reminder is due this week) | tick / `Meeting notes ›` (`ui/Reminders`) |
| Late alarm `N materials are late …›` / `N programs are past their test date …›` | whole card → `/materials` (programs live there) |
| Fold `The board` (says "5 open · 1 late · 1 done") | open/shut; remembered per device; shut on a phone first time |
| — a card in a column (first 3 per column) | opens **that action's sheet** on the board (`/board?a=<id>`) |
| — `+N more` | `/board` |
| — `Open the board` | `/board` |
| Fold `Line balance — where each line is limited` | each row is one 44 px button → `/line/L?view=capacity` |
| Fold `Did it work?` (says "1 proven") | each row is one 44 px button → that action's sheet (`/board?a=<id>`) |
| Fold `<headline measure>` (says "2 of 2 at target") | one chart per line (`charts/MeasureChart`), `Its pack ›` (44 px on a phone) → `/line/L`; empty states `Add the first line` / `Set the measures up` → `/setup` |
| footer | the project's lines and lead, words only |

Old link `?view=meeting` → replaced by `/board`. A lens a 3P job has not got
falls back to the overview.

### 1a · Reports sheet (`ui/ReportsSheet.tsx`)
`Client report` → `#/pace-report?project=P` · `Client report — <line>` (one per
line) → `&line=L` · `Evidence cards — <line>` (lines with a walk) →
`#/w/<ws>/snaglist` · `One-page report — <line>` → `#/w/<ws>/report` ·
`Spreadsheet` → downloads `Faultline-export-<date>.xlsx`. All verified.

### 1b · Lenses (each a page under the project: crumbs `Projects › job › <lens>`, the peers row, a small heading)

**`?view=lines` — Lines.** *The lead to each owner: "this line is yours — here
is its number, its open work, its evidence, its balance."* Reads lines, packs
(`useLinePack`), series, capacity. Per line card (`LineCard`): the whole card
→ `/line/L`; `Line balance … ›` → `/line/L?view=capacity`; `Its deck` →
`#/pace-report?project=P&line=L`. `Add or change lines` → `/setup`. Then the
Line standard card (`ui/StandardsCard`): `Make the first map ›` / `Open ›` →
`/standard`. Report: the "actions & the lines" roll-up table.

**`?view=next` — Actions, as a list.** The board's actions as rows with where,
photos and write-up (§4 `PaceNextSteps`, whole project). `Back to the board` →
`/board`.

**`?view=wins` — Wins.** §5 `PaceSuccess`, whole project.

**`?view=snags` — Evidence.** §6 `PaceSnags` on the project's own walk, plus
every line's walk ("On the lines' own walks") and frameless snags.

**`?view=data` — Numbers.** §7 `ProjectNumbers`.

---

## 2 · Lines & people — `#/project/P/setup` (`ProjectSetupScreen.tsx`, `MeasuresSetup.tsx`, `LineTidyPanel.tsx`)

**Sentence:** *the lead to the business — "these are the lines, who owns each,
what we judge them on and the target in each period."*

Reads/writes `Project` (`useProjects.rename`, `updateProject` via
`useMeasures`), `PaceLineRow` (`usePaceLines` add/edit/move/remove),
`Target` (`useMeasures.setTarget`), project members (`cloud/members`). Every
field saves on blur / a beat after typing (`ui/Draft`); no Save button.
Report: project name/lead/colour on the cover; lines, owners, sponsors on every
line card and chart; measures/periods/targets drive every number.

| control | does |
|---|---|
| Fold `The project` | Project / Lead / What it is (text, saved on Enter or blur); colour swatches (radio, saved on tap); `How this project runs` — Stage gate · 3P · Lever tree (**one tap switches the method**, no confirm — see findings); `Extra tools · Pareto` checkbox |
| Fold `Lines` | table (scrolls sideways on a phone): `↑`/`↓` reorder (20 px with a 10 px coarse-pointer hit area), key, name (blank → falls back to the key), Owner/Sponsor person pickers (`pick`/`rename` swap between picking a project member and typing a name), `Open pack` → `/line/L`, `Workspace` / `Workspace +` (makes the line's workspace) → `#/w/<ws>/capture`, `×` remove (confirm; no undo) |
| — `Add a line`: Line · Name · Owner · Sponsor · `Add line` | adds; a duplicate key says "This project already has a line 2a." |
| — "N items not on a line yet" `Review them` / `Cancel`, per row "Goes to" select, `Move N onto their lines` | `LineTidyPanel`: wins with no line (and on a stage-gate job, next steps) proposed a line by `lib/guessLine`; nothing moves until pressed |
| Fold `What this project measures` | Measures table (name, unit, which way is good, `×` stop measuring — readings kept), add row; Periods table (name, from, to, `×`), add row, or `Give me four quarters` from a start date when there are none; one Targets grid per measure (line × period number boxes, blank = no target) |
| Fold `People` | invite by email + role (Sponsor / Line owner / Member), chips with `×`; without the cloud says so |
| `Archive this project` (confirm) / `Open the archive` | → `#/projects?view=archive` |

---

## 3 · The 3P board — `#/project/P/board` (`BoardScreen.tsx`, `ui/ActionSheet.tsx`)

**Sentence:** *the team to the lead, in the meeting — "this is every action, in
its line and its column, who has it, when it is due, and what is late."*

Reads `useActions`, `useImpacts`, `useMethodCounts`. Writes `PaceTodoRow`
(`putPaceTodo`, `deletePaceTodo`). Control room: the project page's board fold
and Verdict counts; Home's pillar counts. Report: "3P Board — People · Plant ·
Process" (one card per area, same order), "Overdue & at risk", "Who is doing
what".

| control | does |
|---|---|
| crumbs, peers | as §1 |
| `As a list, with photos` | `?view=next` |
| `Print` | `window.print()` (board-only print CSS) |
| filters `Every line` · each area (+count) · `Showing done`/`Hiding done` | narrow the areas; hide done cards |
| a card (state chip, owner, "from a Case", Did-it-work chip, due) | opens the action sheet |
| `＋ Add` (every column of every area, 44 px on a phone) | a new action sheet with that line and column preset |
| "Not on the board yet": the title (a 44 px row on a phone) / `People`·`Plant`·`Process` | open its sheet / give it a column in one tap |
| `?a=<id>` | opens that action's sheet on arrival; the address is put back to `/board`; a stale id just shows the board |

**Action sheet:** What / Why (textareas), `Open the Case it was raised for ›`
(when `caseId` and the line has a workspace), 3P chips, Line select (lines +
"All lines"), Who, Due (date), State `To do · Waiting on someone · Done`, How it
ended (when Done), the Did-it-work verdict (closed actions), `Delete` (confirm,
no undo), `Cancel` (writes nothing), `Add it`/`Save` (disabled while What is
empty). Escape and the scrim close it.

---

## 4 · A line's pack — `#/project/P/line/L` (`ProjectLineScreen.tsx`)

**Sentence:** *the owner to the lead — "this is my line: its number against
target, my actions, what worked, what we filmed, and where it is limited."*

Crumbs `Projects › job › line` (the job crumb returns to `?view=lines`).
Header: `Client report` → the line's deck. Lens row (44+ px): `Overview ·
Actions · Success · Evidence · Numbers · Line balance` (`?view=` next / wins /
snags / data / capacity; old `?view=meeting` → Actions grouped by owner). A gone
line says "That line isn't on this project any more" with `Back to the project`.

**Overview.** KPIs (headline measure latest vs target, actions live, overdue,
open evidence, wins logged); the line-balance door (`why-door cap-door`) →
`?view=capacity`; the headline chart; the "find out why" door — makes the
line's workspace on the way in if it has none, then `#/w/<ws>/analyse` (the
Pareto drill, other agent's screen; verified on Line 7 with no workspace: the
workspace is made, attached to the line, and Back returns to the line).
Report: the deck's front page.

**Actions** (`?view=next`): `List` / `By owner` switch.
- List = `PaceNextSteps` with the line's actions **and the ones written for
  every line** (as its KPIs and board do). Bar "N to do · N waiting · N done",
  `+ Add an action` (a row on this line, no column yet → "Not on the board
  yet"). Desktop: a table per state — What, Where, Why, Who (drafted text),
  When = the board's **Due** date + words, Photos (`+` pick, thumbnail opens
  full screen, `×` remove), Outcome (when done), state `To do · Waiting ·
  Done`, `Delete`; full-width "What happened" (drafted, written as you pause).
  Phone: each row shut to one 44 px button (what · who · due · state), tap
  opens its boxes.
- By owner = `PaceMeeting`: Show `Open · Overdue · Done · All`, Line filter,
  a roster tab per owner (Everyone first), `‹ Previous` / `Next person ›`;
  cards are read-only.

**Success** (`?view=wins`, `PaceSuccess` + `WinProofSheet`): `+ Log a win` /
`+ Log the first win`; per card What worked, Impact (until proved), What we
did, Who to credit, Where, `Delete` (confirm when filled), `Prove it from the
readings →` / `Recall it` → the proof sheet: line × measure chips (only pairs
with ≥4 readings), "when the change landed" date chips, the live verdict
(proven / not yet proven / no change / worse), `Call it` / `Record it anyway`
(freezes the numbers), `Cancel`; "Not enough readings yet" with `Close` when no
pair qualifies. Report: "What we tried".

**Evidence** (`?view=snags`, `PaceSnags`): the line's own walk. Empty: `Film a
walk` → makes the workspace → `#/w/<ws>/snags`. With footage: `▶ Show the
walk`, `Film / edit`, `All evidence`, walk cards (open → segment, `Delete` with
Undo toast), marked frames (`Delete`, confirm), pinned snags (open → asset,
`PDF` evidence card download, `Delete`). In either state: **Written without a
frame** (snags on the walk's list with no frame — open → `snaglist`, `PDF`,
`Delete`). Report: "Line walk" and the "Open evidence" stat.

**Numbers** (`?view=data`, `LineNumbers`): per measure — the chart, `Record a
reading` fold (On date, value, note, `Add reading`; a decimal comma is
accepted), the readings newest first with `×` (confirm) and `All N`.
Report: page-1 charts.

**Line balance** (`?view=capacity`, `CapacityPanel` + `lib/capacity.ts`):
*the owner to engineering — "this station holds the line back, by this much,
and this is what changing it would buy."* Reads `line.capacity`, the line's
stops (`useLineStops`, last 4 weeks), the line's actions (live, for a what-if's
status). Writes `line.capacity` (`editLine`), a `PaceTodoRow` (Raise / Make it
so).
| control | does |
|---|---|
| tabs `As run` · one per what-if (⚑ when its action is on the board) · `+ What if` (44 px on a phone) | switch view; `+ What if` copies **the view on screen** |
| swipe on the panel, \|dx\|≥80 and \|dy\|≤60 | left → next what-if (past the last makes one), right → previous; not from inside a box being typed in |
| what-if name box, `Delete this what-if` (Undo) | rename (blank keeps the old name) / remove |
| "What is different" list | per station, against the line as run |
| the verdict, the ladder (bars on one scale for every view), notes / "Check this." | read-only |
| `Raise an action on <limit>` (as run) / `Make it so — put <what-if> on the board…` (a what-if; disabled until both the line as run and the what-if can be counted) → form: what, People/Plant/Process, owner, due, `Raise`, `Cancel` | writes the action (why = the sentence, or the prediction); then "⚑ On the board — to do · owner · due 20 Oct" + `See it on the board ›`; an action since deleted from the board says so and can be made so again |
| target (line units a minute), planned running hours a week (as run only) | drafted number boxes (12 stays 12; one write per pause) |
| station card (`.cap-sts > .cap-st`, by position): name, `Machine`/`People`, `↑` `↓`, `✕` remove (Undo), `Edit`/`Done` | one card open at a time; an unnamed card stays open |
| — open: It counts in · Each <unit> holds (from station 2) · How fast `A rate` (speed + per second/minute/hour) / `A cycle` (how many, seconds) · How many · Running % (+ "Your last 4 weeks of stops say N% — use it") · Good % · source `On the plate · I timed it · A guess` · where it came from · "Stops logged as" (+ picks from the stops log) | each written on blur |
| `+ Add a machine` / `+ Add a person or crew`; empty: `Start from the machines in your stops log (N)` | add stations |
| Fold `The working` | the arithmetic table |
Control room: the project page's Line balance fold and the line card. Report:
"Where the line is limited", every station with what arrives and what it does,
each what-if as its own ladder on the as-run scale.

---

## 5 · Pareto — `#/project/P/pareto` (`ParetoScreen.tsx`, `lib/paretoFromLog.ts`, `lib/paretoView.ts`)

**Sentence:** *the lead to the team — "this is where the time went in the last
four weeks, ranked, and whether the category we went after got smaller."*
Reads every line's stops (`useProjectPareto`). Writes a workspace only via the
empty state's `Time a stop on <line>` (→ `#/w/<ws>/capture`) / `Add a line`.
`Print`. Rows are read-only. Report: "Where the time is going" (only when
`project.pareto`). The movement column appears only when the four weeks before
had stops; otherwise it says nothing was timed then.

## 6 · Materials (and Programs) — `#/project/P/materials`, `/programs` (`MaterialsScreen.tsx`, `ProgramsScreen.tsx embedded`)

**Sentence:** *the site to the supplier — "this is what we need, when it was
due, and what is still not here."* Reads/writes `Material` (`useMaterials`:
add, save, `markIn`/`markOut`, remove with Undo) and `Program` (`usePrograms`).
Rows: name (drafted), due date (asks why when it slips — `ui/DateWhy`), `Mark
it in` → date + `It's in` / `Cancel`, `Not in after all`, `×` (Undo); the week
strip. `+ Add what you need` (What it is, How much, Due, For line / whole
project, From, `Add it`). Programs: state select, test date, `Mark it proved` /
`Not proved after all`, `×` (Undo), `+ Add a program`, and "N programs do not
say which machine — Name the machine — `Put all N on it`" (see findings).
`/programs` renders the same page. Control room: late alarms on the project
page, Materials peer count. Report: "What we are waiting on" and "What the
machine can run" (one sheet when both fit).

## 7 · Meeting notes — `#/project/P/notes` (`NotesScreen.tsx`)

**Sentence:** *the lead to themself, before the meeting — "these are the things
I must raise."* Private: no report carries them. Writes `TestItem` kind note
(add, edit, tick raised, reminder, delete with Undo). On a 3P job a note is
about the whole project (the gate options are a stage-gate job's; the About box
is drawn only when there is something else to choose). `+ Remind me about it on
a date` (44 px on a phone), `Notify me on this device`, `Copy as a list`.
Control room: the Meeting notes badge, the Reminders card.

## 8 · The client report — `#/pace-report?project=P` (`PaceExecReport.tsx` ↔ `lib/paceReportPdf.ts`)

**Sentence:** *the lead to the client — "here is where the lines stand against
what we agreed, where the job is, where the time goes, where each line is
limited, what we are waiting on, the board, and who is late."*

`PDF` saves `<Project>-client-report-<date>.pdf` (a phone that will not save
opens it in a tab and says so). Section by section, page and PDF now match
(checked with `pdftotext` and `pdftoppm` against the page text, 3 October):
1 the numbers (front stats + a chart per line) · 2 Where the job is (sentence,
plan timeline, what we are waiting on and whose) · Where the time is going
(Pareto, when on) · Where the line is limited (+ what-ifs) · What we are waiting
on · What the machine can run · The plan (lever tree only) · 3P Board · the
actions & the lines, overdue & at risk, who is doing what (with "did it work"
proof), line walk, what we tried. Page numbers on the page come from the
drawn file. `&line=L` — the line's deck: its numbers, its line balance, its
board (with All lines), its detail; no materials/programs/plan. A gone line
says so and offers the project's report. An empty 3P job prints a 3P front
page, not the stage-gate one.

---

## Modules behind the area (one line each)

- `lib/actions.ts` — steps → `PaceAction`, `useActions`, `isLate`, `WHOLE_PROJECT` ("All lines").
- `lib/pillars.ts` — People/Plant/Process, the board's areas, meeting order, the report's board sheets.
- `lib/tracker.ts` — the shapes (`PaceAction` etc.), types only.
- `lib/treeBind.ts` `statusOfAction` — the one colour rule for an action (red late, amber waiting, indigo going, green done, grey not started).
- `lib/measures.ts` / `lib/useMeasures.ts` — measures, periods, targets, readings, `lineSeries`, `vsTarget`.
- `lib/period.ts` — the rolling window lens for Paretos (walk screens).
- `lib/weeks.ts` — the week columns, `niceDay`, `todayISO`.
- `lib/standing.ts` — where a job is: sentence, outstanding rows, plan marks (the report's page 2).
- `lib/portfolio.ts` — Home's view of every job; `pacedSays` (the 3P verdict sentence).
- `lib/useMethodCounts.ts` — the 3P peers row's counts.
- `lib/usePaceLines.ts`, `lib/useLinePack.ts`, `lib/usePaceWorkspace.ts` — lines, per-line pack counts, walk workspaces made on first use.
- `lib/capacity.ts` — the line balance arithmetic, sentences, what-ifs, compare, make-it-so words, report block.
- `lib/useLineStops.ts` — a line's last four weeks of stops for the line balance.
- `lib/paretoFromLog.ts` / `lib/paretoView.ts` — the Pareto from timed stops; ranking and movement.
- `lib/lossContext.ts` — the loss that raised an action, as its why.
- `lib/impact.ts` / `lib/useImpacts.ts` — Did it work? for each closed action.
- `lib/measureProof.ts` — the proof a win carries.
- `lib/walkSnags.ts` / `lib/useWalkSnags.ts` — walk snags as a plan lane.
- `lib/materials.ts`, `lib/programs.ts`, `lib/useMaterials.ts`, `lib/usePrograms.ts` — waiting-on lists.
- `lib/guessLine.ts` — proposes a line for unlined work (the tidy panel).
- `lib/paceReportPdf.ts`, `lib/reportKit.ts`, `lib/savePdf.ts`, `lib/fileName.ts` — the PDF, its primitives, delivery, its name.
- `charts/MeasureChart.tsx`, `charts/ParetoChart.tsx` — a line's measure; the drillable Pareto (walk screens).
- `ui/Verdict`, `ui/Fold`, `ui/Peers`, `ui/Crumbs`, `ui/ActionSheet`, `ui/ReportsSheet`, `ui/StandardsCard`, `ui/Reminders`, `ui/AddFold`, `ui/Draft`, `ui/Undo`, `ui/Timeline` — the shared parts these screens are built from.
- `screens/ActionComposer.tsx`, `LineBoard.tsx`, `SuggestSheet.tsx`, `TrackerPicker.tsx` — reached from the walk's Analyse screens (`#/w/…`, other agent); ActionComposer writes a board action with the loss as its why. Its owner/due/Raise row now wraps on a phone (shared `.action-form` CSS with the line balance).

## Findings — places that cannot yet answer "which change, which record, where in the control room and the report"

1. **What-ifs are frozen copies.** A what-if copies every station; edit the line
   as run afterwards (rename a station, add one, correct a running %) and the
   what-if silently keeps the old values — its "what is different" list then
   shows changes nobody made in it, its compare sentence is against stale
   stations, and Make it so writes them into the action's "where". Recommend:
   store a what-if as overrides on station ids (and added/removed stations), so
   the line as run flows through. Needs a decision on the `capacity` document's
   shape (it syncs as JSON on the line, so no column change).
2. **Line balance is not on Home.** The project page and the report carry it;
   the control room's row for a 3P job does not say which line is limited.
   Recommend one clause in `pacedSays` or the row ("Line 2A held by Basketer").
3. **Programs ask for a machine on a 3P job.** "N programs do not say which
   machine — Name the machine — Put all N on it" creates a stage-gate `Asset` on
   a 3P project. Recommend: on a 3P job a program belongs to a line (it already
   has `lineId`), and the machine prompt is a stage-gate one.
4. **The method switch is one tap.** `How this project runs` changes Stage
   gate / 3P / Lever tree with no confirmation, which reshapes every screen and
   the report. Nothing is lost (flags only), but a stray tap on a phone is easy.
   Recommend a confirm saying what changes.
5. **A meeting note on a 3P job can only be about the whole project.** The
   gates were wrong (fixed); what it should be able to point at instead — a
   line, an action — is a new scope kind in `lib/noteScope`. Recommend lines
   and actions.
6. **By owner cards are read-only.** In the line's Actions › By owner view a
   card cannot be opened; the List and the board can. Recommend the card opens
   the action sheet, as the board's does.
7. **The Pareto rows are not doors.** The project's Pareto ranks categories
   but offers no way from a row to raise an action or open the drill on that
   line; the walk's Analyse screen does. Recommend each row opening the line's
   drill filtered to that category.
8. **The project's own Evidence workspace.** The project lens films into a
   project-level workspace (`usePaceWorkspace`) beside each line's; a 3P job's
   walk is a line's walk. Recommend dropping the project walk in favour of
   choosing a line when filming from the project page.
