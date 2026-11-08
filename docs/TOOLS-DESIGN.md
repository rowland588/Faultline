# Tools design standard — every tool's workspace (7 November)

**Read this before building or changing how any tool looks or is used** — a study, a register, a log, a calculator, a document, a
standard. It governs presentation, interaction and usability only. Rowland, 7 November: *"Do not define, invent, remove or change the
tool functionality as part of this exercise … Your responsibility is the presentation, interaction design, usability and visual quality
of every existing tool and every tool developed in the future … every tool should look and feel like something a specialist
manufacturing consultancy would confidently charge customers to use."* The benchmark is the manufacturing analytics page he supplied
(figure cards with their breakdown, a chart a question, a data table with its own columns). The calculation, the record, the workflow
and the business logic of a tool are never changed to make it look better; `docs/ENTERPRISE-UX.md` (the shell, the page rules) and
`knowledge/STANDARD.md` (what a tool must do) stand beside this.

## 1. The audit — 7 November, the 29 tools at 1440 and 390 (seeded data)

| Family | Tools | What the page is today | What is wrong |
|---|---|---|---|
| **Measurement studies** | Capability, Control chart, Analysis (its 12 questions) | band · figures · a block of sentences · the chart beside a number pad · readings · notes · plan | the sentences come before the chart, and on the control chart they are a dozen red lines; the chart — the instrument — starts at the fold; the number pad takes the best place on a desk where the chart should be |
| **Timed studies** | SMED, Work sampling, Loss count, Reliability, Stops timed, Video study | band · figures · sentences · the tool's own grid or chart · the rest | the grid or the clock is good, but the page around it is a column of boxes; the live control (the watch, the moment) is not always where the eye starts |
| **Maps and boards** | Value stream, Line standard, Line balance, Line capacity, Spaghetti board | band · figures · the map | good canvases; the figures and the sentences sit above the map in a different order on each |
| **Calculators** (≈ 40 by one shape) | Kanban, OC curve, Little's law … | figures as a long form on the left, the answer on the right | a form, not a workspace: every box at the same weight, the answer's picture far down |
| **Registers** | FMEA, Fault tree, Criticality, Pugh, Impact–effort, Control plan, Skills, Readiness, Holds, RSM | a list page, then a record as rows | the list page is bare until something exists; a record is a long sheet with no view of the whole |
| **Logs** | Check logs (CILT, first-off, metal detection, 5S …) | the round as cards, the history | sound on a phone; at a desk the history is a long list with no calendar |
| **Documents** | Charter, SIPOC, 8D … , Line Talk | the boxes left, the reading right | the closest to a document editor; the reading is a column of tiles |

Common to all: every block is the same white box; the figures' tiles vary in height and density from tool to tool; interpretation is a
paragraph, not a list you can scan and drill into; entry and reading compete for the same place.

## 2. The anatomy — the parts every tool's workspace is made of

A tool's page is built from these, in this order of importance. A tool may leave one out or place it differently when its purpose
demands; it may not invent a second kind of any of them.

1. **The band** (`ui/StudyActs` StudyBand) — the tool's name as the eyebrow, the record's name as the title, the verdict as a badge, More ▾
   and Report ▾. One per page.
2. **The figures strip** (`ui/Lean` LeanTiles, `.ie-strip`) — at most six figures, each the label small, the number large, *of* what,
   and its change since the record before; one row at a desk, two columns on a phone. Only an abnormal figure carries colour.
3. **The canvas** — the tool's own picture (the chart, the grid, the map, the board, the clock): the largest thing on the page and the
   first thing below the figures. It is the instrument; never below a block of words.
4. **What it says** — the interpretation as a panel beside the canvas at a desk (under it on a phone): the one sentence first, then the
   findings as a list, each a severity dot and its words, its meaning muted under it, a finding that points at a place in the picture
   or a row of the table linking to it. Never a paragraph of red.
5. **Entry** — where figures are put in (a pad, a form, the live buttons): a panel of its own, beside the canvas under *What it says*,
   or the canvas itself where the tool is tapped (a board, a watch). Never the hero unless the tool is a live timer.
6. **The data table** (`.dt`) — the readings, the rows, the records: a pale header row, hairlines, numbers right-aligned and tabular,
   a row a door to its detail, struck rows shown struck; filters and sort above it in one row.
7. **The record's life** — notes, *used for*, the action plan and the closing line, in that order, at the foot.

## 3. The rules

- **Hierarchy.** Figures → canvas → interpretation → table → the record's life. The eye lands on the abnormal figure, then the place in
  the picture it came from.
- **Layout.** At a desk (≥ 1100 px) the canvas and *What it says* share the width, about 2 : 1, the interpretation sticky as the canvas
  scrolls; below 1100 px one column in the order above. 16 px between regions, 24 above a section.
- **Charts.** Axis words in muted 12 px, figures tabular; the limits and target as named guides with their words at the line's end;
  a point that signals is the state colour with its reason on hover or tap; the chart is as wide as its region and keeps its aspect;
  a chart never sits in a box inside a box.
- **Tables.** One table style (`.dt`): header 12 px semibold on a pale fill, rows 40–44 px, hairline between, numbers right, the struck
  row muted and struck; a long table pages or scrolls inside its region with its header pinned.
- **Interaction.** Inline editing where a figure is shown (a click on the value, Enter keeps it, Escape leaves it); filters as a single
  row of chips or selects over what they filter, their counts in them; a drill-down opens in the side panel or scrolls to and lights
  the place it names — never a new page for a detail.
- **Interpretation.** One sentence, then findings, each with a dot in its state's colour and the word for it; what it means muted; what
  it does not say at the foot, quiet.
- **Evidence and reports.** Report ▾ on the band names each paper the tool makes; attachments (photos, video, links) sit with the thing
  they are of; the paper is drawn from the same model as the page (`lib/report/`), so the two never part.
- **Responsive.** Every tool is used on the floor with a phone: the canvas first under the figures, the entry a thumb's reach, controls
  44 px, nothing off the side. A desk is a workspace, not a stretched phone.
- **Individual, not identical.** A family's tools share the anatomy and the system; each tool's canvas is its own — the fishbone, the
  value stream grid, the stops' Pareto, the spaghetti board are drawn for their method, never put into a generic chart.
- **The system.** Tokens only (`src/styles.css :root`): type 12 / 13.5 / 14 / 18 / 24; corners 8 and 6; the five state colours with
  their words; the press colour for what you press; `--elev` for what is lifted. No new colour, no new radius, no gradient in a tool.

## 4. The slices

Each slice changes presentation only — its tool's acceptance scripts pass unchanged except where a script reads a layout it names,
and that is said in the commit — and ends with before and after at 1440 and 390 shown to Rowland.

| Slice | Family | What | Status |
|---|---|---|---|
| **T1** | Measurement studies | the canvas first beside *What it says*, the entry under it, the findings a list with dots, the readings a `.dt` table | in progress |
| **T2** | Calculators | the figures in groups as a side panel, the answer and its picture as the canvas, the what-if beside it | built 7 November |
| **T3** | Timed studies | the live control at the top of the canvas, the grid as the canvas, the interpretation panel | **first pass 8 November** (`.ws-timed`): What it says a panel with its dots; work sampling — the live moment first, its shares the canvas with What it says beside them at a desk; SMED — the grid and ladder first, What it says under them. Reliability (its watch already first) and the loss count (its lean page already in panels) unchanged; the video study next |
| **T4** | Registers | the record as a table workspace with the matrix or tree as its canvas, the list page with a preview of each | **first pass 8 November**: every register record (FMEA, control plan, fault tree, optimising settings) opens with **The register at a glance** — the module's own table, the one its paper prints, as a `.dt` table (drawn here first: pale pinned header, hairlines, numbers right and tabular, scrolling in its own box), a row jumping to its card and lighting it. The list page's preview next |
| **T5** | Maps and boards | one order of figures, canvas, says across the five | **first pass 8 November** (`.ws-map`): the value stream map and the line balance — the figures, the picture, then What it says as a panel (the line balance's What it costs with it, its legend under its chart); the value stream's tiles keep the method's VA · NE · NV colours. Line standard (the board is the page) and Line capacity (its glance card first) already in that order; the spaghetti board is its board |
| **T6** | Logs | the round as now; at a desk the history as a calendar beside it | |
| **T7** | Documents | the reading as a document preview beside the boxes | |

**Future tools** are built to §2 and §3 from the start; the `faultline-tool` skill asks for the anatomy in the specification
(*The workspace* under *The report*) and the acceptance script for a screenshot at 1440 and 390.
