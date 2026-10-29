# FC-067 — Maintenance measures (a board)

**Catalogue:** FC-067 · **Knowledge:** `maintenance.planned-maintenance`, `maintenance.mttr-availability` · **Programme:** W5 close · **Status:** built October 2026.

## 1. Purpose
One board for PM compliance, backlog, planned share and MTBF from records on the line — *"PM compliance 81%; planned share 53% — from the line's PM log and reliability studies."*

**Scope.** Board (`key: maintenance-measures`): reads planned-maintenance log and reliability studies on the line; typed reactive crew-hours; tiles and paper. **Not** auto reactive from FC-059; parts money; EN 15341 text confirmed against the standard.

## 2. Users and scenarios
Engineering manager monthly; maintenance lead on a line with PM log and reliability studies running.

## 3. Method selection
EN 15341-style KPIs (named from knowledge); planned share = planned ÷ (planned + reactive).

**Established · assumed · chosen.**
*Established:* PM compliance/backlog from check-log figures; planned share 210/(210+190) = 52.5% in `maintenanceMeasures.test.ts`.
*Assumed:* reactive hours typed until repair-time stops feed them.
*Chosen:* 30-day window for PM; board stores reactive hours only.

## 4. Inputs
Sibling PM log on the line; sibling reliability studies; reactive maintenance hours typed on the board record.

## 5. Data suitability
No PM log — compliance tile says start a log; no reactive hours — planned share tile empty.

## 6. Calculations
`src/lib/ie/maintenanceMeasures.ts` — `gatherMaintenance`, `summarizeMaintenance`, `plannedShare`.

## 7. Outputs
Five tiles; sentence; closing; caveats.

**The report.** Board lean paper via `boardPaperBlocks`.

## 8. Manufacturing usability
Tiles first; one number box for reactive hours; refreshes when logs or studies change.

## 9. Failure handling
No line — Where it sits must be set; measures degrade gracefully with missing siblings.

## 10. Integration
`ToolStudy` tool `board`; `/board/maintenance-measures`; line Tools when a board hub lists it.

## 11. Verification
`maintenanceMeasures.test.ts`; `scripts/acceptance/board-shape.mjs`.

**Acceptance criteria.**
1. Planned share 52% from 210 and 190 — `maintenanceMeasures.test.ts`.
2. Hub and list page — `board-shape.mjs`.

## 12. Maintainability
Code: `src/tools/board/`, `src/lib/ie/maintenanceMeasures.ts`, `src/lib/report/boardPaper.ts`. Left: reactive hours from FC-059 repair times.
