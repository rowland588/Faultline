# FC-166 — Code and label verification: the right label on the schedule — the specification

**Catalogue:** FC-166 · **Knowledge:** `packaging.code-label-verification` (full, practice) · built on the check-log
shape, `knowledge/specs/FC-236-check-logs.md` · **Status:** built, W6 (29 October 2026).

## 1. Purpose
Wrong labels drive recalls. This log records start, reel change, hourly and end checks — label identity, date/lot,
allergen and legibility — shows due and done, and on failure says packs since the last good check to hold, raises the
problem and keeps the check red until it passes.

**Scope.** A **code and label log** on a line: starter list (three hourly checks plus start, reel change, end); pass/fail;
compliance, failures with hold; paper. Not: verifying the run plan (FC-071); deciding recall; FC-135.

## 2. Users and scenarios
Packing line operator; quality and retailer auditor. Wrong date at 14:00, last good 13:00, 110/min → 6,600 packs held.

## 3. Method selection
`packaging.code-label-verification` — relentless frequency and containment; scan not read when possible.

**Established · assumed · chosen.**
- *Established:* 7 h run, 4 reel changes → 13 checks due; failure 60 min × 110/min = **6,600 packs** (`cases-operations.py`).
- *Assumed:* line stopped on failure; rated speed for hold estimate.
- *Chosen:* hourly three checks plus start, changeover, end; Critical; holds product; BRCGS clause not quoted.
- *Money:* mislabel packs as M; withdrawal Q if typed (`knowledge/MONEY.md`).

## 4. Inputs
Per check: name, where, schedule, criterion, reaction. Per result: pass/fail, note. Line rate and materials for hold.

## 5. Data suitability
Compliance from first due; event checks counted when done.

## 6. Calculations
As FC-236. **Case 1:** three hourly checks, date fails at 180 min: 12 due, 12 on time, 1 fail, 6,600 packs. **Case 2:**
50% compliance, overdue.

## 7. Outputs
As FC-236 §7 with this log’s words.

**The report.** *Code and label checks — &lt;line&gt;* on the shape’s log paper: checks as agreed, compliance,
failures with hold, standard, TO CONFIRM, limits. Read back in `log-shape.mjs`.

## 8. Manufacturing usability
Phone-first pass/fail cards; fail shows hold before record.

## 9. Failure handling
Missing rate/materials named; client read-only.

## 10. Integration
FC-236 §10; FC-071 first-off when built; FC-014 poka-yoke register when built; `holdFor` for FC-135.

## 11. Verification
Unit: `figures.test.ts`. Acceptance: `log-shape.mjs`.

**Acceptance criteria.**
1. Both worked cases — `figures.test.ts`; `log-shape.mjs` S4.
2. Failure holds 6,600 packs — `figures.test.ts`; `log-shape.mjs` S3.
3. Problem raised; re-check journey — `log-shape.mjs` S3.
4. Starter list and TO CONFIRM — `defs.test.ts`; `log-shape.mjs` S1, S3.
5. Paper — `log-shape.mjs` S3.
6. Limits — `log-shape.mjs` S3.
7. Phone, edit, delete, client — `log-shape.mjs` S3.

## 12. Maintainability
`src/tools/checks/defs/code-label.ts` is the whole of it.
