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

**The report.** FC-236 log paper with backlog said in crew-hours when present.

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

## 12. Maintainability
Code: `src/tools/checks/defs/planned-maintenance.ts`, shared log shape. Later: FC-067 planned share, link to FC-064 for priority — not in this build.
