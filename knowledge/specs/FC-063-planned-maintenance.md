# FC-063 — Planned maintenance: due, done on time, and backlog — the specification

**Catalogue:** FC-063 · **Knowledge:** `maintenance.planned-maintenance` · **Asked for:** W5 reliability wave · **Status:** built (W5b)

## 1. Purpose
Shows whether fitter PM tasks are done in their window and how much crew-time is owed in the backlog — the sentence: *"PM compliance 66% this week; backlog 2.5 crew-hours on one overdue monthly task."*

**Scope.** FC-063 on the check-log shape: pass/fail tasks with intervals, standard hours per task, compliance tiles and a **Backlog** tile in crew-hours. Not FC-067 planned share, not money on parts, not automatic intervals from FC-064.

## 2. Users and scenarios
The fitter on the line phone; the engineer in the weekly meeting. Mark tasks done in the round; read overdue and backlog hours.

## 3. Method selection
TPM planned maintenance KPIs (EN 15341 named from knowledge; text not re-read). Compliance = done in window ÷ due; backlog = overdue tasks summed in standard hours.

**Established · assumed · chosen.**
- *Established:* compliance and backlog arithmetic in `scripts/knowledge/cases-maintenance.py`.
- *Assumed:* each task has standard hours typed for backlog only.
- *Chosen:* starter tasks under Maintenance; stdHours field on planned-maintenance checks only.
- *Money:* not on this page (FC-067).

## 4. Inputs
Task list with interval, window, standard hours; each completion timestamp.

## 5. Data suitability
Pass/fail results with due moments from the log shape.

## 6. Calculations
Shared log compliance (FC-236). Backlog = sum of stdHours for checks in overdue state.

## 7. Outputs
Done on time, Missed, Failed tiles; **Backlog** tile when hours > 0; sentence and closing from the shape.

**The report.** FC-236 log paper with backlog said in crew-hours when present. And, since 13 November, **the Maintenance schedule** (Report ▾ on a planned-maintenance log; `src/tools/checks/pmSchedule.ts`, `pmSchedulePaper.ts` — Rowland: *"make it a report, based on what a PM should look like. I give the report to the business"*): the list as the document a business is handed — the band (machine, line, customer), the count by interval, a section an interval shortest first, each task with the interval in the manual's own words and the manual's page where the task was read from one (`LogCheck.src`), what it rests on. **Established:** a PM schedule lists tasks by frequency with their reference. **Chosen:** a column for who and for time is printed only where somebody typed them — a time or a person is never supplied; a group is headed in the manual's words only where every task under it says the same, else plainly (a year, not 365 days); the schedule carries no results — compliance stays on the log's own paper.

## 8. Manufacturing usability
Standard hours on *The checks* when editing a task on a planned-maintenance log.

## 9. Failure handling
No stdHours: overdue counts in jobs but not in the hours tile.

## 10. Integration
`defs/planned-maintenance.ts`; line Logs hub; `log-shape.mjs`.

## 11. Verification
`figures.test.ts` on the definition example; `log-shape.mjs` table-driven.

**Acceptance criteria.**
1. Weekly task example: expected/onTime/missed/pct and overdue state — `figures.test.ts`.
2. Backlog hours when overdue with stdHours — `figures.test.ts`.
3. Every definition including planned-maintenance — `log-shape.mjs`.
4. The maintenance schedule: tasks under their interval shortest first, numbered through, the manual's words and page, no column for what nobody typed, what it rests on — `pmSchedule.test.ts`; the paper downloaded from Report ▾ and read back against the module — `scripts/acceptance/machine-manual.mjs` step 5b.

## 12. Maintainability
Code: `src/tools/checks/defs/planned-maintenance.ts`, shared log shape. Later: FC-067 planned share, link to FC-064 for priority — not in this build.
