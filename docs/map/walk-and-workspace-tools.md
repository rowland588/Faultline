# The walk and the tools inside a workspace

The map of everything under `#/w/<W>/…`: the stopwatch (Capture), the Pareto
of timed losses (Analyse), the filmed walk (the Line, the walks, a clip, a
frame, the frame through time, the walkthrough), the evidence list, the case,
the workspace meeting and its one-page report, and the set-up sheet. Read from
the code, then confirmed by pressing every control in Chromium at 390×844
(touch) and 1366×900 with the seeded data (`src/dev/seed.ts`), 3 October 2026.

**These are tools used inside a change, never methods** (`CLAUDE.md`). Each is
reached from a change — a project and, usually, one of its lines — and writes
into the *workspace* that line owns (`pace_lines.workspace_id`), or that the
project owns for its own walk (`getPaceWorkspaceId`, `db/pace.ts`). A workspace
that hangs off nothing is listed on Home under *Not on a project*.

Conventions: `W` a workspace id, `P` a project, `L` a line. "Record" names the
TypeScript type and the `src/db` module that owns the store. "Control room" is
Home (`screens/WorkspaceHome.tsx`, `ui/JobsBoard.tsx`) and the project page
(`screens/ProjectDashboardScreen.tsx`) with its line pack
(`screens/ProjectLineScreen.tsx`).

## The records

| record | type / module | written by | read in the control room by | reaches paper in |
|---|---|---|---|---|
| a timed loss | `Observation` / `db/observations.ts` (via `state/WorkspaceProvider`) | Capture | the 3P **Pareto** (`lib/paretoFromLog`, `screens/ParetoScreen`), the line's **Line balance** stops (`lib/useLineStops`), Home's *Not on a project* counts | 3P/tree client report Pareto page (`PaceExecReport` / `lib/paceReportPdf`); the one-page report; the case A3 |
| the study's set-up | `Workspace` / `db/workspaces.ts` | the set-up sheet; Capture adds chips; marking a frame adds a machine | Home (name, colour) | the £ on every Pareto and report |
| a clip of the walk | `Segment` / `db/walk.ts` | the walks list, a clip's ＋ Video, filming | Install's *The line, filmed*, the line's Evidence lens (`screens/PaceSnags`) | — (the walk is played, not printed) |
| a marked frame | `SnagAsset` / `db/walk.ts` | a clip's ＋ Mark asset | the plan's walk lane (`lib/walkSnags`), `ui/OnTheLine` on a test | evidence cards, the evidence print view; the stage-gate client report's walk lane |
| evidence (a snag, or an action raised off a Pareto on a job with no board) | `Snag` / `db/walk.ts` | a frame; the evidence list; the meeting; the case; `ActionComposer` | the plan's walk lane and `ui/WalkPanel`; the line's *open evidence* KPI; Home counts | evidence cards (`lib/snagCardPdf`), print view, one-page report, case A3, 3P client report (`PaceExecReport` reads `snagsForWorkspace`) |
| a case | `Case` / `db/cases.ts` | Analyse (*Open a Case on this*) | Home (*cases* in the workspace counts); the Line's Proof lens | the case A3 (browser print) |
| a fix pinned on a frame | `Test` (`kind: 'fix'`, `pin.frameId`) / `db/testing.ts` | a frame on a stage-gate job (*Raise a fix here*, *Make it a fix*) | Fixes, the gates, the plan | client report, fix card (other area) |
| a board action from a Pareto | `PaceTodoRow` / `db/pace.ts` | `ActionComposer` on a 3P / tree job | the board, the line's actions, Home | 3P / tree client report |

**One rule this area keeps: the video is not the evidence.** `deleteSegment`
lets the frames go (they lose `segmentId`) and keeps every snag on them;
`deleteSnag` takes its close-up but never the frame or the clip;
`deleteSnagAsset` (only reachable from the project's Evidence lens) takes the
frame and its snags but not the clip. Verified both ways in the browser. Since
3 October *Make it a fix* gives the fix its own copy of the close-up, so
deleting the closed pin no longer deletes the fix's picture.

## How a workspace is reached from a change (the doors)

| door | where | lands | Back / crumbs |
|---|---|---|---|
| **Where is this line's time going?** / *…is N off its target — find out why* (`.why-door`) | 3P line pack, Overview (`ProjectLineScreen`, `useLineWorkspace.ensure` makes the workspace on first use) | `#/w/W/analyse` | `Projects › project › line › Analyse`; up lands on the line page (since 3 Oct — it used to land on the filmed lens) |
| **Time a stop on <line>** | 3P Pareto empty state (`ParetoScreen.timeOn`) | `#/w/W/capture` (makes the workspace if missing) | same, up → line |
| line row → capture | project Setup (`ProjectSetupScreen`) | `#/w/W/capture` | same |
| **Film a walk** | the line's Evidence lens (`PaceSnags` with `line`) | `#/w/W/snags` | `… › line › Walks`; up → `line?view=snags` |
| **Film a walk** | a 3P project's Evidence lens (`PaceSnags`, `usePaceWorkspace`) | `#/w/W/snags` (the project's own walk) | `Projects › project › Walks`; up → `project?view=snags` |
| **Film a walk** / a frame tile | stage-gate Install, *The line, filmed* (`InstallScreen`) | `#/w/W/snags`, `#/w/W/asset/A` | `Projects › job › Install › Walks …`; up → Install |
| ▶ Show the walk · Film / edit · All evidence · a segment / frame / evidence row | `PaceSnags` | `/walk`, `/snags?manage`, `/snaglist`, `/segment/S`, `/asset/A` | as above |
| a walk marker on the plan → **Open it on the walk ›** / the frame | `ui/WalkPanel` (project page plan, desktop) | `#/w/W/asset/A` | `… › Walks › clip › frame` |
| **Open on the walk ›** / the pinned frame | `ui/OnTheLine` on a test | `#/w/W/asset/A` | same |
| **Evidence cards — line** / **One-page report — line** | `ui/ReportsSheet` (project) | `/snaglist`, `/report` | report's ‹ Back goes back |
| **Open the Case it was raised for ›** | `ui/ActionSheet` (an action with a `caseId`) | `#/w/W/case/C` | `… › line › The case` |
| a *Not on a project* row | Home | `#/w/W` → the saved route, or Capture (`ResumeRedirect`) | `Home › name › screen` (the crumb said "Workspaces", a page that does not exist; fixed 3 Oct) |

## The frame — `screens/AppShell.tsx`

Every workspace screen except three draws the spine (`ui/Crumbs`, trail from
`lib/useTrail.wsTrail`, chain read from the data by `chainForWorkspace`, never
from history) and the study's four tabs (`ui/Peers.studyPeers`): **Capture ·
Analyse · Evidence · Meeting**, the one you are under shown, not linked.
`case`/`trend` sit under Analyse; `snags`, `line`, `segment`, `asset`,
`history`, `walk` under Evidence; `report` under Meeting. The meeting, the
walkthrough and the one-page report are full-bleed with no tabs.

Routes (`state/useRoute.ts` `SCREENS`, `NEEDS_ID`):

| route | renders | note |
|---|---|---|
| `#/w/W` | `ResumeRedirect` | the saved route for this workspace, else Capture |
| `/capture` | `CaptureScreen` | `?setup=1` opens the set-up sheet over any screen |
| `/analyse` (+ `?measure&dims&path&p`, `?trend=1`) | `AnalyseScreen` | the URL is the whole view |
| `/snaglist` | `SnagListScreen` | the Evidence tab |
| `/snags` | `SnagsScreen` | forwards to `/line` once a machine is marked, unless `?manage` |
| `/line` | `LineScreen` | |
| `/segment/S`, `/asset/A`, `/history/A` | `SegmentScreen`, `AssetScreen`, `AssetHistoryScreen` | a gone id says so (3 Oct); no id → Capture |
| `/case/C` | `CaseScreen` | a gone id says so |
| `/meeting` | `MeetingScreen` | full-bleed |
| `/walk` | `WalkthroughScreen` | full-bleed, its own spine (the shared trail since 3 Oct) |
| `/report` | `ReportScreen` | full-bleed |
| `/log` → `/capture`; `/present` → `/meeting`; `/trend` → `/analyse?trend=1`; `/settings`, `/people` → `/capture?setup=1` | `Go` (replace) | old links only. **Not part of the control room** — they render nothing of their own; kept so bookmarks land |
| `#/w/<gone>` | Home | a workspace that is not on the device goes to Home without a word (finding below) |

---

## 1 · Capture — `#/w/W/capture` (`screens/CaptureScreen.tsx`)

**Lets the floor say to the lead:** *"This is what stopped, where, for how
long and what it cost — timed, not remembered."*

Used by: a 3P line (its losses feed the Pareto and Line balance), a lever-tree
condition bound to a Pareto, a stage-gate line during commissioning; doors in
the table above. Reads `Workspace`, `Observation`, `Case` (running studies),
`useTeam` names. Writes `Observation` (add, soft delete, restore),
`Workspace.activeTimer / lastCategory / lastAsset / assets / categories /
subcategories`, media blobs (`db/blobs`). Control room: the 3P Pareto, Line
balance, Home counts. Paper: 3P/tree client report Pareto page, one-page
report, case A3.

| control | does |
|---|---|
| 🔬 *case* · n/N (only while a study runs) | opens that case |
| **Which asset?** chips · ＋ (type, Add / Enter, Esc) | pick; add a machine to the line list and pick it |
| **What did you see?** chips · ＋ | pick a category (clears the kind); add one |
| **Which kind?** chips · ＋ | optional sub-category scoped to the category |
| **Which shift?** chips (only when shifts exist) | override the clock's shift; tap again for auto |
| ▶ **Start timing** | starts the stopwatch; locks the pickers; survives reload/close (`activeTimer`) |
| ■ **Stop & log** / **Discard** | log the timed loss (toast with £ and **Undo**) / drop it |
| **Log now** | a zero-length "noted" entry |
| **Type a time** → min · sec · **Log** | a typed duration; Log is greyed until there is a time (3 Oct — it did nothing with empty boxes); secs clamp to 59 |
| 📷 Photo · 🎥 Video · ⬆ Upload | file picker with camera / in-app recorder (`ui/VideoRecorder`; headless: "Couldn't open the camera — check the camera permission…", no throw) / gallery, converted on the way in (`lib/media`, `lib/transcode`) |
| a pending thumbnail | `ui/Evidence` viewer |
| **Set up ›** | the set-up sheet (§10) |
| a feed row × | soft delete, toast **Undo** |
| **See all N ›** | the whole log in place (the old Log page) |

Phone: pickers wrap; Set up, × and See all are 44px since 3 Oct.

## 2 · Analyse — `#/w/W/analyse` (`screens/AnalyseScreen.tsx`, `screens/LineBoard.tsx`, `screens/TrendScreen.tsx TrendPanel`)

**Lets the lead say to the sponsor:** *"This is where the line loses its time,
worst first, and what halving it is worth — so this is the problem we spend the
week on."*

Used by: a 3P line (the why-door), a lever-tree condition, any workspace. Reads
`Observation`, `Case`, `Segment` (walk freshness, `lib/gemba`), `Workspace`
cost (`lib/cost`). Writes `Case` (new), `Snag` or `PaceTodoRow` (via
`ActionComposer`). Control room: the 3P Pareto is the same log
(`lib/paretoFromLog`), actions land on the board. Paper: via the case A3 and
the 3P client report's Pareto.

**The board (no `measure` in the URL)**

| control | does |
|---|---|
| 👁 today — go and see | words only: last observation and last walk (`lib/gemba`) |
| 🏆 £/yr proven · n wins ›/▾ | folds open the wins shelf; each win opens its case |
| 📌 *case* ▼n% | opens the case |
| **4 wks · 12 wks · Year · All** | the period lens (`lib/period`), in the URL as `?p=` |
| Loss by asset chart (≥2 assets): **Lost time · Frequency · Both**, a bar | what the bars show; drill into that asset |
| an asset card's head · its bars | drill into the asset / asset › category |
| 💷 Put a £ on this lost time › | the set-up sheet |
| **Is it getting better?** fold | `TrendPanel`: lost last week vs 4-wk avg, run chart with closed-snag flags, which losses are moving; empty → **Time a stop** |
| ▶ Watch the demo (demo workspace only) | the tutorial film overlay, × closes |

**Drilled (`?measure&dims&path`)**

| control | does |
|---|---|
| ‹ **Question** | back to the board, same period (3 Oct — it dropped the period) |
| Rank by **Lost time · Frequency** | re-rank; URL |
| breadcrumb **All ▸ asset ▸ …** | jump to that depth (All = the board) |
| period chips | same view, new window |
| a bar; **Lost time · Frequency · Both** | drill; what the bars show |
| ⚑ disagreement banner | words only |
| evidence strip thumbnails | the viewer |
| ⚑ **Raise an action on …** → text, People/Plant/Process (board jobs), owner, due, **Raise** / Cancel | a board action on a 3P/tree job, else a snag; then **See it on the board ›** / **See it ›** (evidence list) / **Raise another** |
| 💰 prize line | words only |
| 📌 **Open a Case on this ›** / **Open its Case — … ›** | creates a case (baseline = last 4 full weeks, target = half) / opens it |
| **Show this in the meeting ›** | the meeting (it does not carry the drill) |
| a stale path (`path=asset:Nope`) | "Nothing here — step back up with the breadcrumb" |

## 3 · The evidence list — `#/w/W/snaglist` (`snag/SnagListScreen.tsx`)

**Lets the site say to Engineering (or the OEM):** *"These are the problems
we found on the line, whose each one is, when it is due, and which are late."*

Used by every method that films its line. Reads `Snag`, `SnagAsset`, `Segment`
(walk order), session email (*Mine*). Writes `Snag.status / owner / dueAt /
latestUpdate` (inline, bulk). Control room: the plan's walk lane, the line's
open-evidence KPI, Home counts. Paper: **PDF** = evidence cards
(`lib/buildSnagCards` → `lib/snagCardPdf`, one page per snag with its frame
and pin; checked with `pdftotext`/`pdftoppm`), **Print** = the evidence report
print view, **CSV**.

| control | does |
|---|---|
| 🎥 **Walks** | the walks list (`?manage`, since 3 Oct — it landed on the Line) |
| **CSV** | `evidence-<line>.csv`, formula-safe |
| **Print** → ‹ Back · Save as PDF / Print | the print view (stills with numbered pins) / browser print |
| **PDF** | evidence cards for what the filters show |
| **n open · n in progress · n closed · n overdue · n open > 30d** | the counts ARE the filters; tap again for all; remembered per workspace (`useSticky`) |
| Show all | clears the count filter |
| **By owner** · Sort (Walk order, Most overdue, Oldest, Newest, By asset, By owner, By status) · **Mine** | group / order (remembered) / only mine |
| All assets · All owners · Search | filter (search is not remembered, on purpose) |
| row ☐ → bar **Mark open / in progress / closed · Send n as PDF · Clear** | bulk |
| row: frame name | opens the frame |
| row: Latest update (blur) · status · owner (blur) · due (date) | inline edits (one write per change) |
| empty list → 🎥 **Film the line** | the walks list |

Phone: the table becomes cards; counts and the frame link are 44px.

## 4 · The Line — `#/w/W/line` (`snag/LineScreen.tsx`)

**Lets the lead say to the team:** *"Here is every machine on the line in floor
order, what is wrong on each, what it costs and who is on it."*

Reads `Workspace.assets` (line order), `SnagAsset`, `Snag`, `Case`,
`Observation` (weekly loss, `lib/stats`), `lib/proof`. Read-only. Control room
/ paper: none of its own — it is a view of records that reach the evidence
cards and reports.

| control | does |
|---|---|
| 🎥 **Film a walk** | the walks list |
| **📍 Faults · £/⏱ heat · ⚑ Actions · ✓ Proof** | the lens drawn on the still |
| the machine's picture | its frame (zoom, pin) |
| Proof badges (✓/⚠ £/wk proven, 📌 being worked) | open the case |
| swipe; the rail's dots | step machine to machine |
| ⚑ **Evidence ›** · **Manage walks ›** | the list / the walks list |
| no machines → **Set up the machines ›** | the set-up sheet (3 Oct — the sentence named a Settings page that no longer exists) |

Phone: lens chips and links 44px; the rail dots stay 11–14px (swiping is the
way along; see findings).

## 5 · The walks — `#/w/W/snags?manage` (`snag/SnagsScreen.tsx`)

**Lets whoever filmed it say:** *"This is the line, filmed infeed to outfeed,
in walk order, and it is safely backed up."*

Reads `Segment`, `SnagAsset`, `Snag`; backup state (`cloud/sync backedUp`).
Writes `Segment` (add from file or camera, rename, reorder, delete — the frames
stay). `ConvertBanner` / `AutoConvert` repair phone footage a laptop cannot
play.

| control | does |
|---|---|
| ▶ **Walkthrough** · ⚑ **Evidence** | the walkthrough / the list |
| **Walk the line — machine by machine ›** | the Line |
| a row: ▲ ▼ · poster · name · ✎ · × | reorder · open the clip · rename (sheet) · delete footage (confirm says the frames stay) |
| **Convert** (banner) | re-encode in place |
| 🎥 **Film the walk / Film another** · ⬆ **Upload video(s)** | in-app recorder (headless says it cannot open the camera) / file picker (one file opens the clip) |

## 6 · One clip — `#/w/W/segment/S` (`snag/SegmentScreen.tsx`)

**Lets the filmer say:** *"This is the exact frame where that machine is —
mark it, and it becomes the picture we pin problems on."*

Reads `Segment`, its `SnagAsset`s and their open counts; writes `SnagAsset`
(+ still blob via `snag/frame`), `Segment.name`, new segments, and a new
machine into `Workspace.assets`.

| control | does |
|---|---|
| ‹ n / N › and the numbered strip | the previous / next clip |
| **＋ Video** → Film a new section / Upload a video | recorder / picker |
| the title · ✎ **Name this video** | rename sheet |
| ◄ 1s · 1s ► · the video's own controls | scrub |
| **＋ Mark asset** → machine chips or a new name, code → **Save & add snags →** / **Save & mark another** / Cancel | freeze the frame as a still; open it / keep marking |
| timeline markers | seek to that frame |
| an asset row | its frame |
| undecodable clip → **Download the clip** | names the codec and the fix (Convert on the filming phone) |
| gone id | "That video isn't here any more … The frames marked in it stay on the evidence list." · **All the walks** (3 Oct — it bounced silently and trapped Back) |

## 7 · One frame — `#/w/W/asset/A` (`snag/AssetScreen.tsx`, `snag/PinImage.tsx`)

**Lets the site say to the fixer:** *"This is the problem, exactly here on the
machine, with a photo — and this is who has it and by when."*

Two faces. On a **stage-gate job** the frame is where fixes are raised (the
problem *is* a fix, `kind: 'fix'`, pinned by `pin.frameId`); everywhere else it
holds evidence (snags). Reads `SnagAsset`, its `Snag`s, the clip, the job's
tests and found items. Writes `Snag`, `SnagAsset` (rename), `Test` (fix).

| control | does |
|---|---|
| ⏱ **Through time** · ✎ **Rename** · **Show closed (n)** | the history / name + code sheet / older closed items |
| **＋ Raise a fix here** (job) / **＋ Add evidence** | drops a pin in the middle |
| tap the picture · tap a pin · − ＋ · Reset · pinch · double-tap | place a pin / open it (a fix pin opens its test) / zoom |
| ▶ **Watch the video — see it live** (only while the clip exists) | the clip, seeked to the frame |
| *Found here* / *Fixes pinned here* rows | open that test |
| an evidence row | the editor |
| editor: Put the pin somewhere else · Problem · Proposed solution · Owner (team suggestions) · Due · Latest update · Status chips · Close note · After photo · Detail photo · Related losses (search, ×) · **Save / Add it** · **Add & place another** · **Make it a fix ›** (job) · **Delete** · Cancel | the whole snag; *Make it a fix* closes the pin with a note and opens the fix, carrying a copy of the photo |
| Raise a fix sheet: What's wrong · The fix · **Raise the fix** | a fix pinned here, then opens it |
| gone id | "That frame isn't here any more" · **All the evidence** |

## 8 · Through time — `#/w/W/history/A` (`snag/AssetHistoryScreen.tsx`, `snag/history.ts`)

**Lets the lead say to the sponsor:** *"This is the same machine on the last
walk and on this one — what got fixed and what is still open."*

Read-only: `SnagAsset`s of the same name, `Segment`, `Snag`. Controls: ‹
**Asset** (duplicates the spine's step up — see findings), the two stills
(pins read-only, − ＋), the verdict chips, a filmstrip frame (compare it).
Gone id says so.

## 9 · The walkthrough — `#/w/W/walk` (`snag/WalkthroughScreen.tsx`)

**Lets the room say:** *"Watch the line, and stop at each machine to see what
is wrong on it."*

Read-only. Controls: the spine (the shared trail since 3 Oct), the video, the
overlay pill (*machine · n open* → read-only still and its list), the clip
numbers, the rail of machines (seek). Frames whose clip was deleted are left
out — there is nothing to play; they stay on the evidence list.

## 10 · Set up — `?setup=1` on any workspace screen (`ui/StudySetupSheet.tsx` → `screens/WorkspaceSettings.tsx bare`, `screens/PeopleScreen.tsx PeoplePanel`)

**Lets the lead say:** *"This study is on these machines and shifts, at this
cost per hour, and these people can see it."*

Writes `Workspace` (name, crew, rate, on-costs, packs/min, margin, categories,
sub-categories, machines and their order, shifts and their times, a starter
vocabulary merged in), renames inside `Observation` (`renameInObservations`),
`workspace_members` in Supabase (`cloud/members`). Opened from Capture's
**Set up ›**, Analyse's 💷 hint, the Line's empty state, and old `/settings`
`/people` links. Esc or the scrim closes it and clears `?setup`.

| control | does |
|---|---|
| Name (blur) | renames the study |
| Who can see this line's study: owner chip, member × , Add a person by email · **Add** | live cloud call; offline it says "Couldn't reach the people list — are you online?" (3 Oct — it said "Nobody else yet"); adding offline says the same |
| People on the line · £/hr (blur, validated) · *Refine it* → on-costs · *Add lost output* → packs/min, £ margin | the £ model; the readout = £/hr while down |
| Categories · Sub-categories per category · Machines (‹ › order) | tap a chip to rename everywhere (toast counts entries), × to remove (confirm when used), Add |
| Shifts: name (blur), start, end, × , **Add shift** | stamps captures with a shift |
| Add a starter vocabulary | union-merge, nothing removed |
| **Delete everything captured on this line** | confirm, then Home holds it 8 s with **Undo** (verified) |

## 11 · The case — `#/w/W/case/C` (`screens/CaseScreen.tsx`, `lib/proof.ts`)

**Lets the lead say to the sponsor:** *"This is one problem worked to the end:
what it cost before, why it happens, what we did about it, and the measured
proof that it worked."*

Reads `Case`, `Observation` (scoped by its path), `Snag` and the board's
`PaceTodoRow`s carrying its `caseId`. Writes `Case` (title, note, target, 5
whys, status, study, receipt), `Snag`, board actions (`ActionComposer`,
`ui/ActionSheet`). Control room: Home counts, the Line's Proof lens, Analyse's
case pills and wins. Paper: **Print A3** — the browser prints the page itself
on A3 (since 3 Oct; it printed on the default sheet, with the tabs row).

| control | does |
|---|---|
| ‹ Back · **Print A3** · **Close the case / Reopen** | back / print / status |
| title (blur) · Background (blur) · Target hrs/week (blur) | saved |
| *What's inside it* · **Open in Analyse ›** | the scoped Pareto |
| Why? 1–5 (blur; clear a line to drop it) | the chain; the last is ROOT CAUSE |
| countermeasures: board actions **Edit** (`ActionSheet`); snags: update, status, owner, due | edits in place |
| *pull them in?* **Attach** | adds a matching action to the case |
| Raise an action | as on Analyse, tagged with the case |
| Did it work?: Samples to collect · 🔬 **Start the study** · **Call it** · **Abandon** · **Reopen the study** | the confirmation study (box takes 12 since 3 Oct — it clamped each keystroke) |
| **Delete this case** | confirm; its actions stay; then Analyse |
| gone id | "This case is gone — deleted, or not synced to this device yet." |

## 12 · The meeting — `#/w/W/meeting` (`screens/MeetingScreen.tsx`)

**Lets the team say to the lead in the weekly meeting:** *"This is what last
week cost, where it hurt, who owes what, whether the fixes held, and what we
just decided."*

Reads `Observation`, `Snag`, `SnagAsset`, `Case`, `Segment`; writes `Snag`
(status, owner, due, update, reopen) and new actions. Paper: 📄 **Reports** →
the one-page report, the evidence cards; **Copy the minutes** (text).

| control | does |
|---|---|
| ✕ | back where you came from (fallback Analyse) |
| period select (full weeks, All time) | the meeting's period |
| 📄 **Reports** → One-page report · Evidence cards | `/report`, `/snaglist` |
| ⌂ Overview · the agenda rail **⌂ 1 2 3 4 5** · ← → · Esc · h | move between acts |
| Overview tiles 1–5 | open that act |
| ▶ Walkthrough | the walkthrough |
| Act 1: week bars | pick a week; heading names the chosen week (3 Oct — it always said "last week") |
| Act 2: breadcrumb, bars, evidence strip, Raise an action | drill in the room |
| Act 3: **Full list & print ›**; each action's update, status, owner, due | edits land as data |
| Act 4: a study receipt · **Reopen** on a slipping fix | the case / reopen |
| Act 5: **Copy the minutes** | copies; now says *Copied ✓* or that the browser would not (3 Oct — silent) |

## 13 · The one-page report — `#/w/W/report` (`screens/ReportScreen.tsx`)

**Lets the lead put on a manager's desk or the line-side board:** *"The week on
this line in one page — lost time, where it went, the snags needing a push."*

**Which PDF does it build? None of its own** — it is a page printed by the
browser (`window.print()`), with an injected `@page` for A4 or A3. Reads
`Observation`, `Snag`, `Workspace` cost (`lib/stats headline`). Controls: ‹
**Back** (goes back since 3 Oct; it always went to Analyse), **A4 · A3**, 🖨
**Print / save PDF**. Checked printed: one page on A4 and A3 (it pushed a
blank second page until 3 Oct). Reached from the meeting's Reports and the
project's `ui/ReportsSheet`.

---

## The modules behind the area

| module | one line |
|---|---|
| `screens/AppShell.tsx` | the workspace frame: spine, study tabs, which screen, old-route redirects, the set-up sheet |
| `state/useRoute.ts` | the hash routes; `NEEDS_ID`; `buildAnalyseHash` / `readWorkstreamView` keep the Pareto view in the URL; `withQuery` |
| `state/WorkspaceProvider.tsx` | the workspace and its observations in memory; add/remove/restore/patch |
| `screens/ResumeRedirect.tsx` / `state/useResume.ts` | `#/w/W` replays the saved route |
| `lib/useTrail.ts` | the spine above a workspace (`chainCrumbs` — the walk steps up to the filmed lens, the study to the line), `useDeepCrumbs` |
| `ui/Peers.tsx` `studyPeers` | Capture · Analyse · Evidence · Meeting |
| `ui/Stopwatch.tsx` | the running clock and the £ ticker |
| `ui/VideoRecorder.tsx` | in-app camera, H.264 first; says so when there is no camera |
| `ui/Voice.tsx`, `lib/voice.ts` | the mic — used on tests, fixes and install steps, **not on any workspace screen** |
| `ui/StudySetupSheet.tsx` | the set-up sheet (§10) |
| `ui/OnTheLine.tsx` | a test's pinned frame (`PinnedFrame`) — a door into `/asset/A` from the stage gate |
| `ui/WalkPanel.tsx` | what the walk found, from the plan's walk lane; opens a frame |
| `ui/Timeline.tsx` | the plan on Home (`JobsBoard`) — not a workspace screen |
| `ui/Sweep.tsx` | the entrance animation of the client report, Pareto and tree — not a workspace screen |
| `ui/VideoPlayer.tsx` | a clip from the blob store, says when it is not on the device |
| `lib/shifts.ts` | which shift a moment falls in |
| `lib/gemba.ts` | "eyes on the line": days since an observation / a walk |
| `lib/useLineStops.ts` | the line's timed stops for Line balance (`CapacityPanel`) — reads this area's log |
| `lib/media.ts`, `lib/mime.ts`, `lib/transcode.ts` | pick / capture files, sniff codecs, convert phone video so every device plays it |
| `engine/drill.ts`, `engine/compare.ts`, `engine/pareto.ts`, `engine/intelligence.ts`, `engine/types.ts` | the drill path, time-vs-frequency compare, the Pareto, the disagreement sentence |
| `engine/questions.ts`, `engine/tools.ts` | **imported by nothing** — a reserved seam for five more quality tools (finding) |
| `charts/ParetoChart.tsx` | the bars, cumulative curve and 80% line; every column a tap target |
| `charts/DrillBreadcrumb.tsx`, `DisagreementBanner.tsx`, `EvidenceStrip.tsx`, `loss.ts` | All ▸ …; the "costly vs frequent" sentence; the photos behind a bar; the one loss colour |
| `charts/MeasureChart.tsx` | a 3P measure against target — project screens, not this area |
| `lib/stats.ts` | weekly loss, headline, category trends, closed-snag flags |
| `lib/proof.ts` | the study: before/after means, Welch t, receipt, `studyTarget` |
| `lib/cost.ts` | £ per hour / per ms from crew, rate, on-costs, output |
| `lib/taxonomy.ts` | starter vocabularies |
| `lib/strands.ts` | the client report's strands — not this area |
| `lib/period.ts` | the period lens |
| `snag/types.ts` | the walk's records, due/overdue/stale arithmetic, `SNAG_STATUS_META` (open red, in progress indigo, closed green) |
| `snag/PinImage.tsx` | pinch-zoom still with %-anchored 44px pins |
| `snag/TimeStrip.tsx` | the due strip and its words |
| `snag/AutoConvert.tsx`, `snag/autoConvert.ts`, `snag/ConvertBanner.tsx`, `snag/repair.ts` | find and convert unplayable footage in the background / on Walks |
| `snag/addSegment.ts`, `snag/frame.ts`, `snag/history.ts`, `snag/labels.ts`, `snag/useBlobUrl.ts` | a clip from a file; grab a frame; the machine through time; a section's label; blob URLs |
| `lib/buildSnagCards.ts`, `lib/snagCardPdf.ts` | the evidence cards: fetch and shrink the photos; draw one page per snag (house palette since 3 Oct) |
| `db/walk.ts`, `db/observations.ts`, `db/cases.ts`, `db/workspaces.ts`, `db/blobs.ts` | the stores; the delete chain that keeps evidence apart from video |
| `db/pace.ts` `chainForWorkspace`, `get/setPaceWorkspaceId` | which project/line owns a workspace; the project's own walk |
| `lib/usePaceWorkspace.ts` | `usePaceWorkspace` (project walk), `useLineWorkspace` (line, made on first use), `useOwningProject` |
| `cloud/members.ts`, `cloud/team.ts` | who can see a workspace (live, Supabase); names for row attribution |
| `screens/ActionComposer.tsx` | raise an action off a Pareto: board on 3P/tree, evidence otherwise |

## Where the three questions have no answer

Which change, which record, where in the control room and the report:

- **`/log`, `/present`, `/trend`, `/settings`, `/people`** render nothing of
  their own — redirects for old links. Not part of the control room; kept.
- **`engine/questions.ts`, `engine/tools.ts`** — nothing imports them. A seam
  for tools that were never built. Recommend deleting (a removal: the lead's call).
- **`LineBoard`'s `present` mode** — no caller passes it, and its links would
  build `/present` URLs that the shell redirects to the meeting, dropping the
  drill. Dead path; recommend removing the prop.
- **The one-page report** reaches paper only through the browser's print; it
  is not in any project report and not an app PDF. That is a choice, but its
  headline mixes periods: "lost last week" is the last *full* week while
  "where the time went" is the last *7 days*, so on a Monday it can say "0m
  lost last week" above 49 minutes of bars. Recommend one period (design call).
- **A workspace that is not on this device** (`#/w/<gone>/…`) goes to Home
  without a word. Recommend a sentence on Home, as the gone case/frame have.
- **The Line's rail dots** are 11–14px. Swiping is the way along, but the dots
  look tappable and are a poor target. Recommend a 44px transparent hit area.
- **Evidence counts' colour (rule 3)**: "1 open" is coloured red and "2
  closed" green. Rule 3 says the outstanding count is the work and stays
  neutral; only overdue is red. Left as is — the comment on the screen
  chose it deliberately; the lead should decide.
- **"Show this in the meeting ›"** on a drilled Pareto opens the meeting at the
  overview, not at the drill it was pressed on.
- **Two ‹ Back buttons that duplicate the spine** (the case's ‹ Back, Through
  time's ‹ Asset). Simplicity rule 1 says one route; removing them is a
  removal, so listed rather than done.
- **`ui/ActionSheet` on the case** offers "Open the Case it was raised for ›"
  while you are on that case — a door to itself.
- **Date inputs write on every change** (evidence list, meeting, case), as they
  do across the app; typing a year digit by digit writes several times. App-wide
  pattern, not changed here.
