# The control room, with 6M in it

The map of Home — the one view above every change on every line — after 6M
replaced 3P (4 October 2026). Read from the code, then every control driven
in Chromium at 390×844 (touch, `isMobile`) and 1366×900, as owner, team and
client (`localStorage["faultline.access.force"]`), with the seeded stage-gate
job ("Line 2"), lever-tree job ("Line 2B to 60 ppm") and 6M job ("Line 7
pace": Line 2A and Line 7, two problems — "Basketer minor stops", acting on
it; "Line 2A below its rate target", holding), plus bare jobs of each method,
a meeting-note reminder, an undated fix and a supplier typed two ways.

Conventions: `X` is a project id, `G`/`T`/`S` a stage-gate / lever-tree / 6M
job. "Record" names the TypeScript type and the `src/db` module that owns it.
**Finding** marks a place that cannot answer "which change does it belong
to, which record does it read or write, where does it show up in the control
room and the report".

The question it answers (CLAUDE.md, "What this is"): **"am I in control?"
across every line and job, in three seconds.**

---

## 0 · Routes that land here

| Hash | Lands on | Notes |
|---|---|---|
| `#/` | Home (`screens/WorkspaceHome.tsx`) | the app opens here |
| `#/nonsense` (anything unknown) | Home, URL left as typed | |
| `#/portfolio`, `#/guide` | `GoHome` → `navReplace('/')` | the old portfolio/ledger route; there is no separate portfolio screen |
| `#/pace-report` with no `project` | `GoHome` | |
| `#/project/<gone>` and its sub-pages | "That project isn’t here any more · All projects" | owned by the project page; "All projects" opens `#/projects` (see findings) |

**There is no printed control room.** No portfolio PDF, no client report of
all jobs, no print stylesheet for Home. Each job's own client report carries
that job (stage gate: `lib/reportPdf`/`ClientReportScreen`; lever tree:
`lib/paceReportPdf`; 6M: `lib/sixmReportPdf`). Nothing was invented here.

---

## 1 · Home — `#/` (`screens/WorkspaceHome.tsx` + `ui/JobsBoard.tsx`)

**The sentence it lets the lead say to the sponsor:** *"Here is every change
on every line — what is late, who owes what, where each 6M problem has got to,
and when each job lands — and I can open any of it from here."*

**Reads:** `Project` (`db/projects` via `lib/useProjects`); per job, through
`ui/JobsBoard.useJobs`:
- stage gate — `Test`, `TestItem`, `Asset` (`db/testing`), `Material`
  (`db/materials`), `Program` (`db/programs`);
- 6M and lever tree — `PaceTodoRow` (`db/pace listPaceTodos`), `PaceLineRow`
  (`loadPaceLines`), `Target`/`Reading` (`db/measures`), notes (`TestItem`
  kind `note`);
- lever tree — `TreeNodeRow` (`db/tree listTreeNodes`) through
  `lib/treeBind.treeStanding`;
- **6M — the problems (`Case`, `db/cases`) and everything their fishbones read,
  through `lib/useProblems.loadProblems` + `viewsOf` (phase from
  `lib/fishbone.phaseOf`)**, and each line's gap through
  `lib/measures.gapOf(lineSeries(...))`.
- Workspaces (`db/workspaces`) for the "Not on a project" shelf.

**Writes:** supplier spellings (`db renameSupplier`, with Undo) on jobs this
person may edit; workspace archive / restore / delete on the shelf.

**In the report:** none directly — Home is the index of jobs, and every
sentence on it is the same call the job's own page and report make
(`lib/portfolio`, `pacedSays`, `gapOf`, `standing`).

### 1.1 The band (`.jb-hero`)

| Control | Does |
|---|---|
| eyebrow "Control room · every job · Sun, 4 Oct" | — |
| `h1` the sentence (`portfolio().says`) | "3 jobs running · Line 2 hands over first, in 27 days. 7 things past the day." A 6M/tree job's date is "its date", never "hands over". |
| **N jobs running** | scrolls to the Gantt |
| **N past the day** (red when > 0) | opens / closes the focus list "N past the day, across every job" (`aria-pressed`) |
| **N this week** | scrolls to "This week" |
| **Who owes what** chips — one per party (supplier · "No one named" · "The site") | "owes N · M late" (late red), and on a laptop the per-job split; opens / closes "What X owes — N across K jobs". Phone: split hidden; 44 px. |
| **"X and Y look like one company" → Call it X / Call it Y** (only on jobs this person may edit; hidden for a client) | renames that supplier on every record of every editable job; toast "2 records now say “X”" with **Undo** (driven: undo brings the prompt back). |

### 1.2 The focus list (`FocusList`)

Each row (whole row a button) → where the thing lives (`whereTo`):
action → **`/project/X/board?a=<id>` (opens that action's sheet; fixed in
this hunt, it opened the whole board)**, note → `/notes`, test / step / fix →
`/testing/:id`, material → `/materials`, program → `/programs`, machine →
`/testing`. **Copy as a list** → clipboard text, label "Copied". **×** closes
(44 px on a phone). All 20 rows across the five seeded parties pressed: each
landed on its record.

### 1.3 Reminders · No date agreed · This week (`WeekStrip`)

- **Reminders** (`jb-rem`, only when a meeting note has a reminder within a
  week, every job): "2 from your notes — 1 today or gone"; each card →
  `/project/X/notes`.
- **No date agreed** (`jb-undated`, fixes with no date): "1 fix — agree a date
  with whoever has it"; card "NO DATE AGREED" → the fix.
- **This week, across every job**: late first; "18 to chase — late first" or
  "nothing due, nothing late". Each card (whole card the button, ≥ 44 px) →
  `whereTo`. **‹ / ›** arrows (laptop) scroll the strip; the edge fades where
  more waits. All 18 seeded cards pressed.

### 1.4 The Gantt — one row a job, one calendar

Header: "3 jobs · tap one to open it here", months, **Today** pill.

**A row's name block** (`.jb-lab`, the whole block one button, toggles the
drawer; Enter works):

| Method | What the row says |
|---|---|
| stage gate | "27 days to handover" / "N days over handover" (red), "at Install" (the gate's tone) or "Handed over", "4 late" (red), the four gates in their tones, "Next: …" |
| lever tree | "Lever tree", "0 of 1 at target" (**red when a line is short, plain when all at target — was always indigo, fixed**), "1 late", "Outcome not started", "1 overdue" / "N at risk" / "N of M done", "Next: …" |
| **6M** | "6M", "2 of 2 at target" (as above), then **its problems by phase** — "1 problem — acting on it · 1 holding"; "2 problems — 1 finding the cause, 1 acting on it · 1 slipped back" (slipped red); "No problem opened yet" (grey) — and **its open countermeasures by bone** — "7 open: People 2 · Machine 2 · Method 2 · 1 not on a bone yet, 2 past their day, 2 waiting on somebody" (past their day red, waiting amber, the rest plain ink; "Nothing on the board yet" / "Nothing open on the board" grey). The "N late" chip is not drawn on a 6M row: the same number is said in the bones line, with which bones. Then "Next: …". |

**The track** (laptop; hidden on a phone): a stage-gate job's gates as
spans (title says "Install · 26 Sep – 6 Oct · 6 dated"); a 6M / tree job's
bar filled by how much has happened, and its **dots** (`.jb-mk`, 12 px with a
touch ring) — tap shows the words ("Replace the worn sealing jaw / 3 Oct · the
day has gone"; a cluster says "3 things, …"), tap anywhere else closes. **The
dot one day along from an open one could not be tapped (the lifted dot's ring
covered it) — fixed.** The empty part of the track, the bar and the spans
toggle the drawer. A job with nothing dated says so: "No action has a due date
yet — write them on the board. **Open the board ›**" / "Nothing dated yet — add
the machines … **Add them ›**" (the stage-gate button only for someone who may
edit). The handover flag and the slip hatch are marks, not controls.

**⌄** (`.jb-chev-b`, 44 px) toggles. Open rows are remembered on the device
(`localStorage faultline.jobs.open`) and survive a reload.

### 1.5 The drawer

| Method | Left column (phone: first) | Right |
|---|---|---|
| stage gate (unchanged) | the job's sentence + slip, "Led by", doors **Open the job ›** → `/project/G`, **Commission** → `/testing`, **Fixes** → `/fixes`, **Details** → `/setup` | the job's Timeline (`ui/Timeline`) under the same months, or "When the machines have dates, the plan draws itself here." |
| lever tree (unchanged) | the tree's sentence + `pacedSays`, "Led by", line chips (key + owner) → `/project/T/line/L`, or **＋ Add a line** → `/setup` (editors only; "No lines yet" for a client), doors **Open the job ›**, **Board** → `/board`, **Lines** → `?view=lines`, **Details** | Timeline, or "When the board’s actions have due dates, the plan draws itself here." |
| **6M** | *across the top of the drawer, over both columns:* **the gap first** — each line against its target in the 6M client report's own sentence (`lib/measures.gapOf`): "Line 2A is at 52 ppm (27 Sept) against the Q1 target of 44 ppm — 8 ppm better than target." (the "short of target" words red); none set: "No measure is set on this job yet, so there is no gap to show." — **then the problems**, worst first (slipped, finding, acting, proving, holding, closed), each a whole-row door (≥ 44 px) to `/project/S/fishbone?line=L&problem=P`: title, phase in words (slipped red with a red edge), and the problem's own number ("Minor stop on the Basketer — 43 min a week, 62% of the line’s lost time"); none: the phases line. *Then the left column:* **the countermeasures by bone** (the row's sentence, in place of `pacedSays`); "Led by"; line chips (44 px on a phone); doors **Open the job ›**, **Fishbone** → `/project/S/fishbone`, **Board**, **Lines**, **Details** | Timeline of the dated actions, or the empty line |

Every door, chip and problem row pressed on all three jobs, both viewports,
owner and client: each landed on its screen, no console error. A client sees
the same doors (all navigation); the action sheet an action card opens says
"You can read this action. The team keeps it up to date."

### 1.6 Below the control room

- **New project** (top right; anyone the app invited) → `#/projects?new=1`.
- **Account** (the initial) → `ui/AccountMenu` sheet: email, **Control room
  · every job** → `/`, backup, **Sign out**.
- Empty (no job): the pitch, "Projects · **Start a project**" (or, invited to
  a project only, "You’ll see the projects you’ve been invited to here").
- **Not on a project** shelf (workspaces on no line): **Open / Resume ›** →
  `/w/W`; **Archive** (confirm); **Archived lines** fold → **Restore**,
  **Delete for ever** (confirm counts what goes). Its sub-line said "Anything
  on a project is on its project card above" — there are no project cards
  since the rows took them over; now "opens from its line, one tap from its
  row in the control room above".
- `ui/InstallPanel`, `cloud/CloudPanel` (backup line → sheet), **Build
  `<stamp>` · check for update** (unregisters the service worker, clears
  caches, reloads — driven, lands back on Home).

### Phone notes

The calendar is hidden; a row is its name block and ⌄. Everything primary
measured ≥ 44 px: the three stats, the party chips, ×, week cards, the row
name, ⌄, drawer doors, problem rows, line chips (were 34 px — fixed). The
6M row's two lines wrap to three at 390 px.

---

## 2 · The lib and ui modules behind it, one line each

- `lib/portfolio.ts` — pure: every job's items, who owes what, this week, reminders, undated fixes, the shared calendar, the Home sentence; **`problemsSaid` / `bonesSaid` / `saidText` (a 6M job in words, abnormal pieces toned), `PHASE_ORDER`, `JobView.sixm`, `reachShort`**; `pacedSays` (shared with the 6M/tree front page's Verdict).
- `lib/measures.ts` — measures, targets, readings, `lineSeries`; **`gapOf` — the gap sentence, moved here from `lib/sixmReportPdf` so the report and Home say it once.**
- `lib/useProblems.ts` — `loadProblems` (everything a project's fishbones read) and `viewsOf` (problems as views); the hook `useProblems`.
- `lib/fishbone.ts` — `phaseOf`, `measureOf`, `buildView` (the problem's `says`).
- `lib/problems.ts` — `Phase`, `PHASE_WORD`, `ProblemView`.
- `lib/pillars.ts` — `openByBone` (the six bones, old People/Plant/Process read across).
- `lib/sixm.ts` — the six bones and their labels.
- `lib/standing.ts` — a stage-gate job's sentence, outstanding rows and plan marks.
- `lib/install.ts` — `jobJourney`, `journeyNow` (the four gates).
- `lib/plan.ts` — `layoutPlan` (one calendar), `gateSpans`.
- `lib/names.ts` — one company however typed (`companies`, `resolver`).
- `lib/reminders.ts` — meeting-note reminders.
- `lib/actions.ts` — `isLate`, `stepAction`.
- `lib/treeBind.ts` — `treeStanding`, `withTrackerRows`, `bindSources`.
- `lib/access.ts` + `ui/JobsBoard.useAccessByJob` — who may write, per job, read once for the list.
- `ui/JobsBoard.tsx` — the band, focus list, strips, Gantt rows and drawers.
- `ui/Timeline.tsx` — a job's plan in the drawer (read-only).
- `screens/FishboneScreen.tsx` — `fishboneUrl` (the problem rows' and the Fishbone door's address).
- `screens/WorkspaceHome.tsx` — Home's frame: header, empty state, shelf, panels, build stamp.

---

## 3 · Findings that need a decision (not changed)

1. **The 6M client report says the same fact in other words.** Its band reads
   "2 problems: 1 acting on it, 1 holding · 7 actions open, 2 late."
   (`sixmReport().slip`); Home reads "1 problem — acting on it · 1 holding" and
   "7 open: People 2 · …, 2 past their day". Recommendation: the report's band
   uses `problemsSaid` / `bonesSaid` from `lib/portfolio`, so the paper and the
   control room carry one wording (its owner's file; not edited here).
2. **The drawer's plan marks open nothing.** The Timeline in a row's drawer
   draws every dated action / test with its words, but a mark is not a door,
   while the same item is one tap from "This week". Recommendation: make a
   Timeline mark open its record through `whereTo` (shared component — needs
   the project page's agreement).
3. **A lever-tree job with no tree yet** falls back to the bones tiles and says
   "Nothing open". Recommendation: "No tree yet — start from the outcome" with
   the tree as its door.
4. **A bare stage-gate job reads "at Install"** with nothing kept anywhere.
   Recommendation: "not started" (grey), as the gates already say.
5. **"That project isn’t here any more · All projects"** (a stale project link)
   opens `#/projects`, the start-a-project page, not the list of jobs (Home).
   Recommendation: "Control room" → `/`.
6. **The 6M problem's own number and the gap disagree in the seed** — "Line 2A
   is at 52 ppm" (the latest reading, the gap) beside "Packs per minute on
   Line 2A: 47.75 ppm" (the four-week mean, the problem's head). Both are
   right by their own rule, and they sit one above the other in the drawer.
   Recommendation: the problem's sentence says "four-week average".
