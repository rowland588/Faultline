# The lever tree, the control room, and getting around

The map of Home (the control room over every job), starting a change, the
lever tree method and every page of a lever-tree job, the tree's pages in the
client report, the account and sync panel, the front door, and the route
table that joins them. Read from the code, then confirmed by driving every
control in Chromium at 390×844 (touch, `isMobile`) and 1366×900 with the
seeded data (`src/dev/seed.ts`, `treeProjectId` = "Line 2B to 60 ppm"),
3 October 2026.

Conventions: `T` is a lever-tree project id, `G` a stage-gate one, `P` a 3P
one, `W` a workspace (a line study). "Record" names the TypeScript type and
the `src/db` module that owns the store. "Control room" means Home
(`ui/JobsBoard.tsx`) and the project page (`screens/ProjectDashboardScreen.tsx`).
**Finding** marks a place where a screen or control cannot answer "which
change does it belong to, which record does it read or write, where does it
show up in the control room and the report".

---

## 0 · The route table — `state/useRoute.ts` (parse) + `router.tsx` (render)

Hash routing, no library. `parseRoute` turns the hash into a `Route`
(`name`, `wsId`, `id`, `lineId`, `query`); `router.tsx` picks the screen.
Signed out, every route shows `Landing` (no bypass); a build without the two
Supabase variables shows `ServiceUnavailable`.

| Hash | Route name | Screen | Guard |
|---|---|---|---|
| `#/`, anything unknown (`#/nonsense`) | `home` | `WorkspaceHome` (URL left as typed) | — |
| `#/guide`, `#/portfolio` | `guide` / `portfolio` | `GoHome` → `navReplace('/')` (before the session check) | — |
| `#/projects` (`?new=1` opens the form; `?view=…` ignored, archive is open anyway) | `projects` | `ProjectsScreen` | — |
| `#/pace-report?project=X[&line=L]` | `paceReport` | `PaceExecReport`; no `project` → Home | — |
| `#/project/X` (`?view=lines\|data\|wins\|snags\|next`; unknown view → overview) | `projectDashboard` | `ProjectDashboardScreen` | stale id: "That project isn’t here any more · All projects" |
| `#/project/X/setup` | `projectSetup` | `ProjectSetupScreen` | — |
| `#/project/X/line/L` | `projectLine` | `ProjectLineScreen` | gone line says so |
| `#/project/X/tree` | `leverTree` | `LeverTree` | `RequireModel('tree')` → else `/project/X` |
| `#/project/X/board` | `board` | `BoardScreen` | `RequireModel(['board','tree'])` |
| `#/project/X/pareto` | `pareto` | `ParetoScreen` | `RequireModel(['board','tree'])` |
| `#/project/X/materials` | `materials` | `MaterialsScreen` | every method |
| `#/project/X/programs` | `programs` | `ProgramsDoor` → set-up (stage gate) or materials (paced) | every method |
| `#/project/X/notes` | `notes` | `NotesScreen` | every method |
| `#/project/X/standard[/S]` | `standard` | `StandardScreen` | every method |
| `#/project/X/install`, `/set-up`, `/handover`, `/day`, `/fixes`, `/report`, `/testing`, `/testing/:id`, `/testing/:id/card`, `/commissioning/*` | `install` … `trialCard` | stage-gate screens (other agents) | **`RequireModel('commissioning')`** — added in this hunt; before it a tree or 3P job drew stage-gate screens |
| `#/w/W` | `resume` | `ResumeRedirect` → saved route or `/w/W/capture` | inside `WorkspaceProvider` |
| `#/w/W/capture\|analyse\|meeting\|snags\|snaglist\|walk\|line\|report` | same | `AppShell` | — |
| `#/w/W/segment/:id`, `/asset/:id`, `/history/:id`, `/case/:id` | same | `AppShell`; **no id → `capture`** (`NEEDS_ID`) | — |
| `#/w/W/log` → capture · `/present` → meeting · `/trend` → `analyse?trend=1` · `/settings`, `/people` → `capture?setup=1` (StudySetupSheet: `WorkspaceSettings` + `PeoplePanel`) | redirects in `AppShell` | | |
| `#/w/W/<unknown>` | `resume` | replays the saved route | |

Shapes the parser accepts that no screen of their own renders:
`#/project/X/<anything else>` and `#/project/X/line` (no line id) fall to the
project's front page; `#/w/W/history` with no id renders Capture but keeps
`/history` in the URL, and `usePersistRoute` saves it as the workspace's
resume point (harmless — it degrades to Capture again). `#/w/<unknown ws>`
lands inside the last workspace that was open; `#/w/<unknown>/capture` lands
on Home. Every `RouteName` the type lists is produced by the parser; no screen
is unreachable by route. `PeopleScreen`'s `PeoplePanel` is reached only through
the line study's set-up sheet, and `WorkspaceSettings` only through the same
sheet.

`nav` pushes a history entry; `navReplace` replaces (redirects use it);
`goBack(fallback)` uses history when there is any; `withQuery` sets one query
key. `RequireModel` replaces (not pushes) so a wrong-model screen never sits in
the back history.

---

## 1 · Home, the control room — `#/` (`screens/WorkspaceHome.tsx`)

**The sentence it lets the lead say to the sponsor:** *"Here is every change
on every line — what is late, who owes what, and when each job lands — and I
can open any of it from here."*

Reads: `Project` (`db/projects`, via `lib/useProjects`), per job its records
through `ui/JobsBoard.useJobs` — stage gate: `Test`/`TestItem`/`Asset`
(`db/testing`), `Material` (`db/materials`), `Program` (`db/programs`); 3P and
tree: `PaceTodoRow` (`db/pace` `listPaceTodos`), `PaceLineRow`
(`loadPaceLines`), `Target`/`Reading` (`db/measures`), notes (`TestItem`
kind `note`). Workspaces (`db/workspaces`) for the "Not on a project" shelf.
Writes: supplier spellings (`renameSupplier`, with Undo), workspace
archive/restore/delete. Report: none directly — it is the index of jobs; each
job's own client report carries its detail.

Controls, top to bottom:

- **The band** (`jb-hero`): eyebrow "Every job · date"; the sentence
  (`portfolio().says`).
  - **N jobs running** → scrolls to the Gantt.
  - **N past the day** (red when >0) → opens the focus list *N past the day,
    across every job*; tap again to close.
  - **N this week** → scrolls to "This week".
  - **Who owes what** chips, one per party (supplier / The site / No one
    named), each "owes N · M late" and on a laptop the per-job split → opens
    *What X owes — N across K jobs*. Phone: the split is hidden; chips 44px
    under `(pointer: coarse)` (headless emulation measures 32px — it does not
    match `coarse`).
  - **"X and Y look like one company" → Call it X / Call it Y** → renames
    every record's supplier across all jobs, Undo offered.
- **Focus list** (`FocusList`): each row → where the thing lives (`whereTo`:
  action → `/board`, note → `/notes`, test/step/fix → `/testing/:id`,
  material → `/materials`, program → `/programs`, machine → `/testing`);
  **Copy as a list** (clipboard text for an email; label becomes "Copied");
  **×** closes.
- **Reminders** strip (dated meeting notes, every job) and **No date agreed**
  strip (fixes with no date) — the same cards as below.
- **This week, across every job** — a sideways strip of cards, late first;
  each card (whole card is the button, 119px) → `whereTo`; **‹ / ›** arrows
  appear when there is more to the side. All 16 seeded cards pressed: each
  opened its record.
- **The Gantt** (one row per job, one calendar): the row's name block
  (`jb-lab`: name, chips "N days to handover" / method / "1 of 1 at target" /
  "N late", the four gates or People · Plant · Process, "Next: …") toggles
  the drawer; the track's empty part toggles too; **dots** (`jb-mk`, 12px with
  an invisible 30px ring) show their words on tap (closed by a tap anywhere
  else); **⌄** (`jb-chev-b`, 44px) toggles. A job with nothing dated says so
  with **Add them ›** / **Open the board ›**. Open rows are remembered on the
  device (`localStorage faultline.jobs.open`).
  - **Drawer**: the job's sentence, "Led by", **Open the job ›** →
    `/project/X`; stage gate **Commission** → `/testing`, **Fixes** →
    `/fixes`; 3P/tree **Board** → `/board`, **Lines** → `?view=lines`; the
    job's own Timeline (`ui/Timeline`).
- **Projects** section: **New project / Start a project** →
  `#/projects?new=1` (opens the form — verified on desktop and phone; the
  earlier "did not open" report did not reproduce). One `ProjectCard` per
  live project (below). **Archived · N — restore or delete ›** →
  `#/projects?view=archive`.
- **Team & invites** (super-admin only) → `cloud/AdminPanel` sheet.
- **Not on a project** shelf (only when a workspace hangs off no line): each
  workspace row **Open/Resume ›** → `/w/W`, **Archive** (confirm);
  **Archived lines** fold → **Restore**, **Delete for ever** (confirm counts
  what goes).
- **Build / rebuild the demo line ›** (super-admin) → seeds the demo
  workspace, lands on its Analyse.
- `ui/InstallPanel` (Add to Home Screen) and `cloud/CloudPanel` (§9).
- **Build `<timestamp>` · check for update** → unregisters service workers,
  clears caches, reloads. The one-glance answer to "is the fix live".

Empty state (fresh account): the pitch, "Projects · Start a project", the
account row, the build line. Reworded in this hunt — it described the old
line-study tool and a project as "a set of lines".

### `ui/ProjectCard.tsx` (the cards under Projects)

The whole top block (method, name, lead) → `/project/X`. 3P/tree: one chip
per line (key + owner's first name) → `/project/X/line/L`; no lines →
**＋ Add a line** → `/setup`. Footer: stage gate "Handover 30 Oct · agreed
22 Oct", others "N lines · M owned"; **Details** (stage gate) / **Lines &
people** → `/setup`; **Open** → `/project/X`. Phone: Open/Details 44px (were
36px).

---

## 2 · Starting a change — `#/projects` (`screens/ProjectsScreen.tsx`)

**The sentence:** *"This is the kind of change we are making, so this is how
it will be run and what it will print."*

Reads/writes `Project` (`db/projects` `createProject`, `restoreProject`,
`purgeProject`, `projectContents`). Shows up on Home once created.

- Crumbs **Home › Projects**; header **New project / Cancel** toggles the form.
- **What are you trying to do?** — three situation cards from
  `lib/planModel.MODELS` (Bring new equipment into use → Stage gate; Make a
  running line perform better → 3P; Hit a number by a date → Lever tree),
  each with Built from / Rhythm / Done when / Prints. Nothing pre-selected.
- After a pick: **Name** (autofocused, placeholder per method), **Lead**;
  Enter in either creates.
- **Create and add the machines** (stage gate) → `/project/X/install`;
  **Create and add lines** (3P, tree) → `/project/X/setup`. All three driven
  from scratch on both viewports; each landed and opened.
- "N projects running — **on Home ›**".
- **Archived** fold (open here): **Restore**; **Delete for ever** (confirm
  lists every store it will purge; walks are kept).
- Empty: "No projects yet · Start a project", or "Everything is archived ·
  Open the archive · Start a project".

---

## 3 · The lever tree — `#/project/T/tree` (`screens/LeverTree.tsx`)

**The sentence it lets the lead say to the sponsor:** *"This is the outcome,
what has to be true for it, where each part has got to — from the number
where there is one — and the work under each, off the board."*

Records: `TreeNodeRow` (`db/tree`: `listTreeNodes`, `putTreeNode(s)`,
`deleteTreeBranch` → now returns a `Restore`), `TrackerBind` on a node
(`lib/treeBind`). Reads the board's actions (`PaceTodoRow` via
`lib/actions.useActions` → `PaceAction`), Next steps (`listPaceTodos`), lines
(`lib/usePaceLines`), numbers (`lib/useMeasures`: `Measure`, `Period`,
`Target`, `Reading`). Control room: the "Tree" tab is first in the peers row
of a tree job; Home's row shows the job's lines at target and People · Plant
· Process — **finding: neither Home nor the tree job's front page says
anything about the tree itself** (see §12). Report: the client report's
"The plan" sheet (`PaceExecReport` `TreePage` + `TreeStatic`) and its PDF
(`lib/paceReportPdf` tree sheet), and the tree printed from this screen.

Drawn rows = stored rows + rows a bound box pulls off the board
(`withTrackerRows`; ids `tracker:<parent>:<action>`). Everything that edits
works on the stored rows.

Header: crumbs **Projects › project › Lever tree** (phone: **‹ project**
pill); peers **Tree · Board · Lines · Numbers · Wins · Evidence ·
Materials**; **Hide actions / Show actions** (folds every box that has
actions under it); zoom **− / NN% / ＋** (the percentage fits the whole tree
to the width; pinch zooms; remembered per project); **Print** (window.print —
see "On paper" below).

Banners: **"N actions on the project’s board — none of them on this tree
yet" · Put them on the tree** (until a box is linked) → SuggestSheet for the
first "what needs to be true"; **"N of the board’s M actions are not on this
tree" · Which ones? / Hide them** → names up to 12 with why.

**A box** (`Box`). Tapping anywhere on it now gives it focus (was: only the
one line of words; the rest of the box was dead) and brings out its tools:

- The words (textarea, placeholder = its level's name). Saved on blur or
  Enter; **Escape** puts the words back (it used to save the discarded words).
  No write per keystroke. Typed `12` stays `12`.
- A number-bound box shows **"54 vs 60 ppm"** and **from the number — unbind**.
- **▾ / ▸ N** (fold): hides/shows what is under it; folded it says "8, 3 done".
- **State pill** — a native select over the pill: Not started · In progress ·
  At risk · Overdue · Done. Read-only on a number-bound box (says "Behind
  target"/"On target") and on a row off the board (board's words — "Waiting",
  not "At risk", since this hunt).
- Tools: **⠿** pick it up to move (then **Put it here** on every other box,
  or **Put it at the top** / **Cancel** in the moving bar); **↑ / ↓** reorder
  among siblings (no longer overwrites a number-bound box's own colour);
  **＋** another at this level below it; **＋›** the next level to its right;
  **☰** add work from the board (TrackerPicker); **⛓** fill this from the
  board (BindSheet; not on the outcome or a board row); **#** bind its colour
  to a number (opens "Which number…" select of measures × lines, × cancels);
  **×** delete (confirm; now **Undo** for 8 s).
- "Build the conditions from the board →" / "Add this line’s work from the
  board →" on a "what needs to be true" whose children are not linked →
  SuggestSheet.
- Drag a box onto another to re-parent (desktop); drop text from a
  spreadsheet onto a box → the type sheet with it filled in.
- A row off the board: no textarea, three lines clamped; tapping it opens to
  its whole wording (was hover-only); "FROM THE BOARD".

Phone (≤720px): tools are 40px and come out as a bar under the focused box
over the tree (no layout shift); state pill 32px; unbind and "Which ones?"
32px; fold has an invisible ring. Desktop: tools appear on hover or focus.

Foot: **＋ Another outcome**; one line of help.

Empty: "Start with the outcome" — **Start from Line 2B** (one line) / **Start
from the N lines** (writes the outcome + one box per tracker line) and **＋ Add
the desired outcome**. With no lines only the second. A one-box tree works
(↑/↓ do nothing, move-to-top keeps it). Stale id: "That project isn’t here any
more · All projects". Wrong model → the project's front page.

### Sheets on the tree

- **BindSheet** (`screens/BindSheet.tsx`, "Fill from the board"): **Which
  line** chips (tracker lines; **Across every line N**), **People, Plant or
  Process** chips with counts (none = all), **Narrow it by a word** input, live
  "N actions land under this box · M still open" with the first 7; **Cancel /
  Unlink**, **Link it / Update the link** (disabled at 0). Writes
  `TreeNodeRow.bind` (keeps a number binding).
- **SuggestSheet** (`screens/SuggestSheet.tsx`, "Build the conditions"): line
  chips, one proposed condition per category ticked (each already linked),
  **Cancel**, **Build N**. Writes N `TreeNodeRow`s with binds.
- **TrackerPicker** (`screens/TrackerPicker.tsx`, "Add under …"): line chips,
  **Hiding done / Showing done**, one row per action (tap to pick; "already
  on the tree" marked), **Type it** → the type sheet, **Cancel**, **Add N**.
- **Type sheet** (in LeverTree): textarea, preview "N boxes", **‹ Pick off the
  board**, **Cancel**, **Add N boxes**.
- None of these close on the scrim or Escape (only Cancel); they are
  `lt-paste-back` overlays, not `ui/Sheet`.

### On paper

- **Print on this screen**: since this hunt keeps each box's state in words
  (the print CSS hid `.lt-tools`, which held the state with the buttons), and
  hides the tools, folds, unbind, peers, banners' buttons. Verified with a
  print-media PDF read back with `pdftotext`.
- **`screens/TreeStatic.tsx`**: the same markup, read-only, scaled to fit
  1520×860 for the report's "The plan" sheet; a number-bound box shows the
  figure and its words; board rows the board's words.
- **PDF** (`lib/paceReportPdf` tree sheet, `treeShape/treeMeasure/treeDraw`):
  the same rows (`fullTree` from `withTrackerRows`), the same order, the same
  colours (`reportKit` `BLUE` = `--st-w`), the state in words under each box
  (`state` = number words or board words). Screen sheet and PDF compared box
  by box: same tree, same RAG, same bound numbers.

---

## 4 · The tree job's front page — `#/project/T` (`ProjectDashboardScreen`, model `tree`)

**The sentence:** *"Where the line is against its number, what is late on the
board, where the line is limited, and whether what we closed worked."*

Reads `Project`, `PaceLineRow`, `PaceTodoRow` (actions), measures/readings,
impacts (`lib/useImpacts`), capacity (`PaceLineRow.capacity`). Header:
method eyebrow "LEVER TREE · led by …", name, **⚙ Details** → `/setup`;
**Meeting notes** → `/notes`; **Pareto** (when `project.pareto`) → `/pareto`;
**Reports** → `ui/ReportsSheet` (now lists **The lever tree** for a tree job,
and says its client report leads with the outcome). Peers row (Tree first).
Verdict ("Where the line is"), reminders, late alarms, then folds:
**The board** (each action → `/board`; **Open the board**), **Line balance**
(whole-row → `/line/L?view=capacity`), **Did it work?** (whole-row → `/board`
since this hunt), **<headline measure>** (chart per line; **Its pack ›** →
`/line/L`). Lens pages: `?view=lines` (line cards, "Its deck", "Add or change
lines", "Make the first map ›"), `?view=data` (§6), `?view=wins`,
`?view=snags` (Evidence, "Film a walk"), `?view=next` (actions as a list).
Phone: folds start shut; 44px peers and rows.

**Finding:** the tree is not on its own job's front page — no fold says "the
outcome is behind; 1 of 3 conditions at risk". See §12.

## 5 · The board on a tree job — `#/project/T/board` (`BoardScreen.tsx`)

**The sentence:** *"This is everything we have to do, sorted People, Plant,
Process, with who has it and when — and the tree fills from it."*

Writes `PaceTodoRow` (`db/pace putPaceTodo`) through `ui/ActionSheet`
("A new action": What · Why · 3P column · Line · Who · Due · State · Cancel /
Add it). Heading is **Board** on a tree job (was "3P Board"), "N open · N
late · N done", **As a list, with photos** → `?view=next`, **Print**,
filters (Every line / per line / Showing done) when >1 area, one card per
action (opens the sheet), **＋ Add** per column, "Not on the board yet" with
column chips. Driven: an action added in Plant appeared under the
Plant-linked condition on the tree.

## 6 · Pareto, numbers, materials, notes, set-up on a tree job

- **Pareto** `#/project/T/pareto` (`ParetoScreen`): "Where the time is going,
  ranked — the last four weeks against the four before"; empty: **Time a stop
  on Line 2B** → the line's study capture; **Print**. Reads timed stops
  (`lib/paretoFromLog`). Report: the client report's Pareto sheet when there
  is data.
- **Numbers** `?view=data` (`NumbersPanel.ProjectNumbers`): **+ Record a
  reading** (Line, Measure selects; On date; value; note; **Add reading** —
  now refuses non-numbers and reads "62,5" as 62.5), "Latest in" list with
  **×** (confirm). Writes `Reading` (`db/measures`). A reading moved the bound
  tree box ("62.5 vs 60 ppm · On target") and Home ("1 of 1 at target").
- **Materials** `/materials` (shared screen): add form (What · How much · Due ·
  For · From · Add it). Report: "What we are waiting on" sheet.
- **Meeting notes** `/notes` (`NotesScreen`): add (textarea, **About** —
  gates and machines offered on a stage-gate job only since this hunt; hidden
  when there is nothing to point at), **+ Remind me about it on a date**,
  **Add note**, tick when raised, **Notify me on this device**
  (`ui/Reminders`). Writes `TestItem` kind `note`. Stale id now offers "All
  projects".
- **Lines & people** `/setup` (`ProjectSetupScreen`): folds **The project**
  (name, lead, what it is, colour swatches, **How this project runs** —
  three method buttons, one tap switches, no confirm — finding §12; **Pareto**
  checkbox), **Lines** (↑/↓, name, owner pick, sponsor pick, **Open pack**,
  **Workspace +/Workspace** → creates/opens the line's study, **×** remove with
  confirm; add row Line · Name · Owner · Sponsor · **Add line**; opens on a
  phone when there are no lines, since this hunt), **What this project
  measures** (measures, periods, targets grid), **People** (invite by email
  with role; offline says "Couldn’t add them — are you online?"), **Archive
  this project** (confirm → archive), **Open the archive**. Writes `Project`,
  `PaceLineRow`, `Measure`/`Period`/`Target`, project members
  (`cloud/members` `addProjectMember`).

## 7 · The client report — `#/pace-report?project=T` (`PaceExecReport.tsx` + `lib/paceReportPdf.ts`)

**The sentence it lets the lead say to the client:** *"This is the outcome,
what has to be true for it and where each part is, the numbers, and every
action with who has it."*

One **PDF** button (A3, landscape, 4 pages for the seeded job). Pages: 1 the
front (headline tiles, measure chart), 2 **The plan** (the tree, §3), 3
**Board — People · Plant · Process** (renamed from "3P Board" on a tree job,
screen and PDF together; `lib/pillars.boardName`), 4 actions / overdue / who
is doing what / line walk / what we tried. Saved and read back with
`pdftotext -layout` and `pdftoppm`: same tree, same states, same words as the
screen sheet. The line deck (`&line=L`) leaves the tree out (it is the
project's plan, not the line's).

## 8 · Getting around: crumbs, account, sheets

- **`ui/Crumbs.tsx`** (the spine): every crumb but the last is a button; the
  last is "you are here"; **‹ step above** pill (44px on a phone); never uses
  history, so a deep link has the same trail. Back in the browser goes where
  you came from (driven: tree → project crumb → back → tree). **Finding:**
  every project screen's trail starts at **Projects**, which is now the
  start-a-project / archive page, not the list of jobs (Home is) — one hop
  more than needed.
- **`ui/AccountMenu.tsx`**: the initial in a circle (36px) → sheet "Account":
  email, **Home** (every job) → `/`, **Sign out** (asks first). `signOutAsked`
  is now the one sign-out, used by Home's account row too.
- **`ui/Sheet.tsx`**: bottom sheet in a portal; closes on the scrim (taps in
  the first 450 ms ignored) or Escape; no close button. `SheetRow`.
- **`ui/ActionSheet.tsx`**: the board's action editor (§5).
- **`ui/Toast.tsx`** / **`ui/Undo.tsx`**: one Undo bar for the whole app
  (`offerUndo`, 8 s); the tree's delete now uses it.
- **`ui/UpdateBanner.tsx`**: "A new version of Faultline is ready · Reload ·
  ×" when a new service worker takes over a page it already controlled. Not
  drivable headless (service workers blocked); code read.
- **`ui/EmptyState.tsx`**: icon, title, words, action — used by line-study
  screens, not in this area.
- **`state/useResume.ts`**: `usePersistRoute` saves the route inside a
  workspace (for Home's Resume); boot no longer redirects.
  **`screens/ResumeRedirect.tsx`**: `#/w/W` → saved route or capture.
  **`ui/RequireModel.tsx`**: wrong model → `navReplace('/project/X')`;
  missing project → lets the screen say so.

## 9 · Account and sync — `cloud/CloudPanel.tsx` (on Home)

**The sentence:** *"Everything I did is in the cloud — or exactly what is
not, and why."*

Reads `syncStatus` (`cloud/sync`). Row: ☁ + email + one line — "Everything is
backed up ✓" (never beside a refusal, since this hunt), "Backup paused — it
will retry by itself", "N rows the cloud refused — tree boxes" (red), "An edit
of yours was replaced by a newer one — see Account" (amber), "N files still to
back up · N still to download · N only on the phone that took it", the admin
schema line. **Sign out** (asks first, since this hunt). Tap the row → sheet:
refused rows with the database's message; overwritten edits with **OK,
seen**; pending/missing files with **Stop waiting for it**; **Check for
changes now**; **Repair sync** (now says when it could not reach the cloud
instead of "everything re-sent"); **Sign out**. Driven in DEV with
`window.__faultlineSyncSet({...})` for idle, error, refused, overwritten and
pending.

## 10 · The front door — `screens/Landing.tsx`

Signed out, every route. The name with the pulse, "Stage gate · 3P · Lever
tree", **Email**, **Password** (44px), **Sign in / Create account** (48px,
disabled until both are filled), **Been invited? Create your account /
Already have an account? Sign in** (clears messages). No signal now says
"Faultline could not be reached — check the signal and try again" (was the
browser's "Failed to fetch"). Signs in to `#/`.

## 11 · The lib and ui modules behind this area, one line each

- `lib/planModel.ts` — the three methods defined once (`MODELS`), `planModel(p)` from two booleans, `setPlanModel`.
- `lib/portfolio.ts` — pure: every job's items, who owes what, this week, the shared calendar and the Home sentence (`pacedSays`).
- `lib/useProjects.ts` — live list of projects (+ archived), create/rename/archive/restore/purge; `useProject(id)`.
- `lib/useMethodCounts.ts` — counts and late counts for the peers row of a 3P/tree job.
- `lib/usePaceLines.ts` — a project's lines; now ignores a read for a project it has left.
- `lib/useLinePack.ts` — a line's pack counts; now clears its debounce on unmount.
- `lib/treeBind.ts` — binding a box to the board or to a number; derived rows; `statusOfAction`, `statusOfTodo` (fixed), `boardWords` (new), `boundNumber`, `suggestConditions`, `unplacedActions`.
- `lib/actions.ts` — the board's actions as `PaceAction`s; `isLate`.
- `lib/useMeasures.ts` / `lib/measures.ts` — measures, periods, targets, readings; `lineSeries`, `standingFor`.
- `lib/pillars.ts` — People · Plant · Process; board sheet geometry; `boardName` (new).
- `lib/paceReportPdf.ts` — the client report PDF, tree sheet included.
- `lib/usePaceWorkspace.ts` — the project's/line's walk workspace (Evidence lens).
- `lib/pastedRows.ts` — a pasted block → one row per line.
- `ui/JobsBoard.tsx` — Home's control room (band, focus list, week strip, Gantt).
- `ui/ProjectCard.tsx` — a project card on Home.
- `ui/Verdicts.tsx` — stage-gate tests waiting for a verdict (stage-gate front page; other agent).
- `ui/Outstanding.tsx` — stage-gate "what is outstanding" rows with their doors (other agent).
- `ui/Peers.tsx` — the row of a project's pages (`methodPeers`, `projectPeers`, `studyPeers`).
- `ui/Fold.tsx` — a card that folds; now takes `need` (open until there is something / somebody chooses).
- `ui/ReportsSheet.tsx` — the one door to paper on a project.
- `cloud/members.ts` — workspace and project members (invites).
- `cloud/CloudPanel.tsx`, `cloud/AdminPanel.tsx` — account/sync; super-admin invites.

## 12 · Findings that need a decision (not changed)

1. **The tree is invisible from the control room.** A lever-tree job's front
   page and its Home row speak only of lines at target and the board; nothing
   says how the outcome stands or which "needs to be true" is red. The record
   (`TreeNodeRow`) is there and the report prints it. Recommendation: one fold
   on the tree job's front page, "The tree — 1 of 3 conditions at risk ·
   outcome behind", opening to `/tree`, and the same count as Home's chip for a
   tree job instead of People · Plant · Process.
2. **Switching the method is one tap with no question** (Lines & people → How
   this project runs). It turns a tree job into a stage-gate one instantly;
   the tree is kept but disappears behind `RequireModel`. Recommendation: a
   confirm that says what the job will look like after, and that nothing is
   deleted.
3. **Crumbs start at "Projects"**, which is no longer the list of jobs.
   Recommendation: start every trail at **Home**.
4. **"Start from the lines" writes "holds its ppm rate"** whatever the project
   measures. Recommendation: use the first measure's name ("holds its Packs
   per minute target"), or neutral words.
5. **"Workspace +"** on a line row in Lines & people is the old container's
   name for the line's study/walk. Recommendation: name it for what it opens
   ("Time and film it" / "Its study").
6. **Tree sheets (Bind, Suggest, Picker, Type) do not close on the scrim or
   Escape** like every `ui/Sheet`. Recommendation: same close behaviour.
7. **The linked condition's blue edge** (`.lt-box.is-linked`, `--blue`) uses
   the brand blue as a mark; the house rule keeps brand blue for what you
   press. Recommendation: a neutral mark (dashed or ink edge).
8. **No undo for a model switch, a binding or an unbinding** — the tree's
   delete has Undo now; the others still change at once.
9. **"Notify me on this device"** says nothing when the person dismisses the
   browser's prompt (permission stays "default"). Recommendation: one line
   saying it was not turned on.
