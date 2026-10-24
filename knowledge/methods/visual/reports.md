---
id: visual.reports
name: Reports and the lean page — the story told on one page, screen and paper alike
aka: [reports, client report, status report, lean page, A3, cards, spreadsheet export, paper, PDF, Report menu]
discipline: visual
kind: faultline
evidence: decision
depth: full
checked: 2026-10-24 — `docs/LEAN-PAGE.md` (the eight elements, one model `lib/lean`, drawn by `ui/Lean` and `lib/report/lean`) and `docs/REPORTS.md` (the engine: blocks that measure themselves poured into pages, relevance, parity); proved by `scripts/report-stress.mjs` (every paper at three sizes, read back) and the acceptance scripts' paper checks, and kept by `scripts/paper-parity.mjs`; no arithmetic of its own — the record says the rules
needs: []
next: []
alternatives: []
related: [visual.visual-management, rca.a3, visual.performance-measures, visual.action-tracking]
---
# Reports and the lean page — the story told on one page, screen and paper alike

## Purpose and principle
A report that lists records is a gimmick; a report tells the story of
the project or the line so the reader can act. Every tool's page and
every paper in Faultline is the **lean page**: the **band** (what, where,
when — a pale fill with the teal edge, never a dark band, so what prints
is what is seen); the **tiles** (a few counted figures, each *of* what it
should be and *since the record before*, never OEE); the **trend**; the
tool's own **picture**; the **top causes**; **what it means** (the
reading, in a sentence); the **action plan** (action · owner · due);
and the **closing line**. One model (`lib/lean`), one builder per tool,
drawn on screen by one component and on paper by one layout, so the two
never part. Paper is laid out by the engine — blocks that measure
themselves, poured into pages — never by a hand-kept y; every report is
read back at three sizes in every gate, and paper parity fails the gate
when a paper stops saying what it said. The word is **client**, never
GM; a paper is named for what it is, never *PDF* or *Print*.

## Questions it answers
- Where are we, why not where we should be, what are we doing about it
  — on one page?
- Does the paper say what the screen says, at every size of data?
- Did a change on a page move its paper with it (relevance), and did a
  paper lose a sentence (parity)?
- Which paper does this reader need — the one-page status first, the
  full report, the cards for the meeting?

## Inputs and minimum conditions
- The tool's records, read by its builder into the lean model.
- The report engine (`src/lib/report/`): blocks, flow, tables, the
  code header.
- The three seeds (just started, ordinary, a long way in) and the fuzz
  (forty random projects) for the stress; the live checkout for parity.

## Procedure and calculation
None of its own; the rules it keeps:
- The eight elements in order; a tile is a counted figure with its
  "of" and its "since"; a figure with no "of" is a number, not a tile.
- Only the abnormal carries colour; the state in words beside every
  mark; one colour one meaning (`visual.visual-management`).
- Every paper from its real button, named for what it is, under Report
  ▾ on its page header; a paper drawn on its report page reached with
  `?save=1` and made on arrival.
- Stress: nothing off the page, nothing printed over anything else, no
  near-empty page mid-document, every machine name and the end of every
  long field on the paper, at tiny, ordinary and huge.
- Relevance: a change in the app (a machine late, a problem taken, a
  program proved) appears on every paper that should carry it, as
  `docs/REPORTS.md` places it.
- Parity: every paper on the change says what it said on live — a line
  lost or changed fails the gate, unless the change is meant and said.

**Worked case**: none computed. The gate's report-stress, the fuzz and
paper-parity runs are its worked cases; gate 55's parity (24 October)
read 69 papers the same.

## Assumptions, limits and misuse
- Reports that list records instead of telling the story — the gimmick
  Rowland named on 24 September.
- A dark band with white words does not print; paper is light
  everywhere (17 October).
- A hand-kept y in a PDF breaks at the first long field; the engine
  lays out.
- A paper changed without its screen, or a screen without its paper,
  is the drift the two-halves rule forbids (CLAUDE.md, rule 2).
- Paper parity is a check on what is said, not a ban on change: a
  meant change is recorded in the parity's MEANT list with its reason.

## Reading the result
A lean page reads top to bottom as the three questions: where we are
(the band and tiles), why not where we should be (the trend, the
picture, the causes, what it means), what we are doing (the action
plan), and the one line to take away. Money: a tile per tool in pounds
where the tool has it (`knowledge/MONEY.md`), plainly labelled, never
summed across tools into one figure that hides which is which.

## When not to use it — and instead
One problem's story on one sheet → `rca.a3`. The design of the measures
themselves → `visual.performance-measures`. The action plan's records →
`visual.action-tracking`. The colour and marks → `visual.visual-management`.

## In food and FMCG manufacturing
Reports to the client (the GM, the OEM, production from the project
team); cards for the morning meeting; the one-page status first in
every pack; the spreadsheet export worded for the project.

## References
- [doc] `docs/LEAN-PAGE.md` — the eight elements and the slices built.
- [doc] `docs/REPORTS.md` — the engine, relevance, the papers by page.
- [doc] `docs/STRUCTURE.md` §17 — paper parity.
- [textbook] Tufte, E.R. (2001), *The Visual Display of Quantitative Information*, 2nd ed., Graphics Press — data-ink and the one-page table (from knowledge).

## In Faultline
Built: the lean page (`src/lib/lean.ts`, `src/ui/Lean.tsx`, `src/lib/report/lean.ts`)
on every tool's page and paper; the engine (`src/lib/report/`); Report ▾
on every page header (`src/ui/parts.tsx`); the stress, the fuzz and parity in
the gate (`scripts/report-stress.mjs`, `scripts/paper-parity.mjs`).
FC-141 is this entry; the 6M report and Problems were the last pages to
take the pattern.
