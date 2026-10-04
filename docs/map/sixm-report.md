# The 6M client report

The map of the running line's client report: the preview screen, the paper
it pours, the doors that open it, and the lever-tree A3 that shares its
route. Read from the code, then driven in Chromium at 390×844 (touch,
`isMobile`) and 1366×900 with the seeded data (`src/dev/seed.ts`:
`pacedProjectId` = "Line 7 pace", `pacedLineId` = Line 2A; and
`src/dev/reportSeeds.ts` `seedSixMJob('tiny' | 'huge')`,
`seedRandomSixMJob(n)`), 4 October 2026. Every PDF was saved and read back
with `pdftotext -layout` and `pdftoppm -png`.

Conventions: `X` is a 6M (board-model) project id, `L` one of its lines.
**Finding** marks a place where something cannot answer "which change does
it belong to, which record does it read or write, where does it show up in
the control room and the report", or a fault left for a decision.

---

## 1 · The route

| Hash | Screen | Notes |
|---|---|---|
| `#/pace-report?project=X` | `PaceExecReport` → `SixMReportScreen` when `planModel(project) === 'board'` | the project's client report: every line |
| `#/pace-report?project=X&line=L` | the same, scoped to one line | its problems, the actions for that line **and** for every line, its walk, its Pareto, its constraint |
| `#/pace-report?project=<tree job>` | `PaceExecReportA3` (lever tree) | the A3, unchanged in shape; its board is on the six bones since 4 Oct |
| `#/pace-report` (no project) | router sends Home | — |
| a project that has gone | A3 branch: "That project isn’t here any more, so there is nothing to report on." + **← Control room** | the 6M branch only mounts once the project is read |
| a line that has gone (`&line=nope`) | "That line isn’t on <job> any more, so it has no report of its own." + **The project’s client report** → `#/pace-report?project=X` | — |

While the project is still being read, `PaceExecReport` renders the A3's
"Preparing the report…" for a moment, then swaps to the 6M screen.

## 2 · The change it belongs to, and the sentence it lets one side say

It belongs to **the 6M change on a running line** — the `board` model,
one project with its lines. The sentence, lead to client: *"Here is where the
line is against its target, where the loss is, what we found causes it and
how we know, what we are doing about each root, whether it worked, and
whether it is holding — and who owes what by when."*

## 3 · Records it reads (it writes none)

| Record | Type | Module | Used for |
|---|---|---|---|
| the project | `Project` (measures, periods, name, lead) | `src/db/projects.ts` | title, lead, the measures behind the gap |
| lines | `PaceLineRow` (+ `capacity`) | `src/db/pace.ts` `loadPaceLines` | each line's gap, the constraint (line balance) |
| targets, readings | `Target`, `Reading` | `src/db/measures` (`listTargets`, `listReadings`) | the gap and its chart |
| timed stops | `Observation` | `src/db` `listObservations` | the Pareto (last four weeks, `lib/paretoFromLog` → `lib/paretoView`) |
| problems | `Case` (+ `causes`, `source`, `hold`, old `whys`) | `src/db/cases.ts` `listProjectCases` (deleted ones left out) | each problem, its fishbone, roots, hold; the old whys until moved |
| actions | `PaceTodoRow` (pillar = bone, `causeRef`, `caseId`, `expect`, `outcome`, `due`, `when`) | `src/db/pace.ts` `listPaceTodos` | countermeasures per problem, the board by bone |
| snags | walk snags (`Snag` via `loadWalkSnags`) | `src/snag` / `src/db` | what was seen on the line |
| standards, materials, programs | | `src/db` | feed the fishbone's suggestions (counted, never printed one by one) |

All of it arrives through `lib/useProblems` `loadProblems(projectId)` (one
read) and `viewsOf(...)`, plus `listPaceTodos` — the same read the fishbone
screens use, so the screen and the paper cannot disagree. It re-reads on
every write (`onDataChange`, 300 ms debounce).

## 4 · Where it shows up

- **Control room / project page** — the **Reports** button on a 6M project
  page opens `ui/ReportsSheet` ("On paper"): door **Client report** ("The gap,
  where the loss is, each problem’s fishbone and what is being done about it,
  the board by bone, the walk.") and one **Client report — <line>** door per
  line ("The same report, for one line.").
- **Lines view** (`#/project/X?view=lines`) — each line card's footer button
  **Client report** → that line's report.
- **The line page** (`#/project/X/line/L`) — head button **Client report** →
  that line's report.
- **The paper** — `src/lib/sixmReportPdf.ts` (`drawSixMReport`), A4 portrait,
  file name `<job>[ <line>] client report <date>.pdf` (`lib/fileName`).

## 5 · The screen — `SixMReportScreen` (`src/screens/PaceExecReport.tsx`)

Crumbs: **Control room** → `#/` · **<job>** → `#/project/X` · **<line>** (line
deck only) → `#/project/X/line/L` · *Client report*. On a phone the crumbs
fold to one **‹ <parent>** back button (44 px tall).

Head: eyebrow `<job> · <line>`, title **Client report**, lede "The gap, where
the loss is, each problem’s fishbone and what is being done about it — drawn
from what is kept here, nothing typed for it."

| Control | Does |
|---|---|
| **PDF** (73×52) | draws the report (`sixmPdf` → `drawSixMReport`) and hands it over (`deliverPdf`): share sheet on a phone, a download on a laptop, a new tab if the browser refuses; says **Sent.** / **Downloaded.** / the new-tab sentence in a status line. While drawing it reads **Making it…** and is disabled. |
| **Reload the app** | only when the PDF part could not load because the tab runs an older build |
| crumbs | as above |

Body:

- **The contents** (`ol.cr-toc`, numbered, not tappable) — in the paper's
  order and words: *Where the line(s) is/are* (the band's sentence and
  slip) · *The gap* (each line's sentence) · *Where the loss is* (the
  Pareto's sentence and its biggest category; each constraint's sentence) ·
  *Problems* (none: the "No problem has been opened yet" sentence) · each
  **Problem n — title**: phase and its sentence; causes per bone, roots,
  countermeasures count, the hold word; **Written before the fishbone: …**
  when the problem carries old whys not yet on a bone; then **each
  countermeasure** — what · bone · owner · its state and day · **When: <the
  day in words>** when it has no date · *The board by bone* (totals, each
  bone's count) · *What was seen on the line* (snag counts).
- **The page** (laptop, ≥ 900 px wide) — the PDF itself in an iframe,
  stamped with the brand mark, redrawn whenever the data changes.
- Phone (under 900 px): only the contents; the paper is reached with **PDF**.

Access: the screen writes nothing; a client (`faultline.access.force =
client`) sees it whole and can download the PDF — driven, works.

Empty states: "Preparing the report…" until the read lands; a job with no
problem says so in one line; a job with no measure says the gap is drawn
once a line has a measure and a target.

## 6 · The paper — `drawSixMReport`, poured by `src/lib/report/`

In order; a section with nothing to say is not printed (docs/REPORTS.md):

1. **Front** — eyebrow "CLIENT REPORT · 6M — THE GAP, ITS CAUSES, AND WHAT
   IS BEING DONE", the job (and line), "Led by … · Printed …", the dark band:
   WHERE THE LINE(S) IS/ARE + the sentence + Home's 6M row in the same
   words (`lib/portfolio` `problemsSaid` · `bonesSaid`): "2 problems — 1
   finding the cause, 1 acting on it · 1 holding · 7 open: People 2 · Machine
   2 · …, 2 past their day, 2 waiting on somebody." (the late and waiting
   parts red and amber in the preview, as on Home)
2. **The gap** — each line's sentence, the "short of target" words in red,
   owner, and its measure drawn against the target (≥ 2 readings).
3. **Where the loss is** — the Pareto table (last four weeks, vital few
   bold), then each line's constraint: sentence and stations, LIMIT boxed.
4. **Problem n — title** for each problem (slipped, finding, acting,
   proving, holding, closed; oldest first): phase pill + where it came
   from + opened/closed; before · now · target; **the fishbone drawn**
   (head = problem, number and phase; People · Machine · Method above,
   Material · Measurement · Environment below, told apart by place and
   name; confirmed solid, suspected outline, ruled out struck through, ROOT
   tag; an empty bone says "Nothing found yet", the screen's words); "The
   data suggests n causes not yet looked at — on …"; when the drawing
   cannot carry every cause, **Every cause on the fishbone — n, bone by
   bone** as rows; **Why it happens** — each root: bone · cause, how known ·
   status · where from · by whom, the whys numbered with their grade, "the
   root", and "Read back from the root" (the therefore chain); or "No root
   found yet — …"; **Written before the fishbone: <root>, therefore …,
   therefore <problem>.** while old whys are not on a bone;
   **Countermeasures — n open · n late · n done**: what, For: the cause,
   Expected: …, When: <day in words>, What happened: …, bone · owner, state
   pill; **Keeping the gain**: the check, who, how often, since, last
   checked, and Holding / Holding · check overdue / Slipped back; or
   "Closed with no check set to keep the gain."
5. **The board by bone** — per bone (and "Not on a bone yet"): what, Why:,
   When:, For: <cause> (problem n) / For problem n: <title>, who · line,
   state pill; late first, done last and quiet. "Nothing on the board for
   <bones>."
6. **What was seen on the line** — open snags: what, found, where, who,
   state (Open solid red, In progress indigo, Past due red outline); "Closed
   since: …".

Footer on every page: `<job> — <line> · client report · <date>` and `n of
N`. Only the footer may shorten, and only the job's name gives way ("…") —
the line and the date always stay; the full name is on page 1.

With no measure on the job, the gap section is one sentence naming every
line in scope ("No measure is set on Line 1, Line 2 and Line 3 yet — …"),
and the band still says "WHERE THE LINES ARE" when there is more than one.

Colours (`TONE`): failed solid red, late red outline + tint, waiting amber,
going indigo, ahead grey outline, done quiet green. Nothing else wears them.

## 7 · The lever-tree A3 on the same route — regressions only

`PaceExecReportA3` and `src/lib/paceReportPdf.ts`. Driven on phone and
laptop with `treeProjectId` (project and line deck), PDFs downloaded with no
console error. The board page now reads **Board — People · Machine · Method
· Material · Measurement · Environment**, one block per line, six lanes,
every card whole; no "3P", "Plant", "Process" or "GM" on the paper.

## 8 · The modules behind it

- `src/lib/sixmReportPdf.ts` — `sixmReport()` turns the records into the report's sentences and rows (the screen lists them); `drawSixMReport()` pours them as blocks; the fishbone drawn and measured (`layoutFish`, `fishbone`, `drawFish`).
- `src/lib/report/flow.ts` — `pour` / `chooseDensity`: places blocks, breaks pages, keeps headings with what follows, re-pours compact to save a near-empty last page.
- `src/lib/report/blocks.ts` — the measured blocks (`text`, `heading`, `label`, `rows`, `box`), type sizes and gaps.
- `src/lib/useProblems.ts` — `loadProblems` (one read of everything the fishbones read) and `viewsOf` (the problems as views, per line).
- `src/lib/fishbone.ts` — `buildView` (bones, suggestions, roots, countermeasures, measure, phase, the head's sentence), `therefore`.
- `src/lib/problems.ts` — `Phase`, `PHASE_WORD`.
- `src/lib/portfolio.ts` — `PHASE_ORDER`, `problemsSaid`, `bonesSaid`: the band's words, shared with Home's 6M row.
- `src/lib/sixm.ts` — the six bones, grades, `toSixM` (Plant → Machine, Process → Method).
- `src/lib/measures.ts` — `lineSeries`, `say`; the gap sentence.
- `src/lib/paretoFromLog.ts`, `src/lib/paretoView.ts` — the Pareto from timed stops.
- `src/lib/capacity.ts` — `analyse`: the constraint sentence and stations.
- `src/lib/reportKit.ts` — `san` (only characters the fonts can draw), `stampBrand`.
- `src/lib/savePdf.ts` — `loadPdfLib`, `deliverPdf`; `src/lib/fileName.ts` — `pdfFileName`.
- `src/ui/ReportsSheet.tsx` — the "On paper" doors.
- `src/dev/reportSeeds.ts` — `seedSixMJob('tiny' | 'huge')`, `seedRandomSixMJob(n)`; `scripts/report-stress.mjs` — downloads the project report and the first line's deck for each and reads every page back (off the page, overprinted, near-empty, every fact, no internal id).

## 9 · Findings

- **Two different "now"s on one page** — fixed with the lead's change: the
  head sentence says "on the four-week average", and the paper's measure
  line now says "<measure>, on the four-week average: before … · now …".
- **"0 h a week" beside "2 min a week".** A Pareto problem's measure is
  rounded to tenths of an hour (`measureOf` `round1`), so a small loss reads
  "now 0 h a week" under a head sentence saying "2 min a week". Recommend the
  measure carry minutes under an hour (engine, screen and paper).
- **The data's suggestions reach the client as a count.** docs/SIXM.md: a
  client reads "the causes on the fish, never the data's suggestions". The
  paper still prints "The data suggests n causes not yet looked at — on …",
  including on holding and closed problems. Recommend: print it only while
  the problem is finding its cause, or not at all — a design decision.
- **The A3's target line is amber and the measure line brand blue** — amber
  is "waiting", blue is "what you press" (CLAUDE.md, visual management).
  Older than today; not a regression. Recommend ink for the measure and a
  dark dashed target, as the 6M paper draws them.
- **A booked action reads "Not started" (grey) on the A3's board** but "Due
  10 Oct" (indigo) on the 6M paper — `lib/treeBind` `statusOfAction` maps
  "To do" to not started whatever its day. The rule set 4 October ("a step
  with a day booked is still ahead") says indigo. Recommend the tree follow
  it (screen and paper together).
- **The 6M contents list wears brand-blue numbered dots** (`.cr-toc li::before`)
  on items that are not tappable. Recommend a neutral number.
