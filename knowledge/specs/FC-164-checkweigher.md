# FC-164 — Checkweigher verification: test weights at the limits and the reject proved — the specification

**Catalogue:** FC-164 · **Knowledge:** `packaging.checkweigher-verification` (full, practice) · built on the check-log
shape, `knowledge/specs/FC-236-check-logs.md` · **Status:** built, W6 (29 October 2026).

## 1. Purpose
The checkweigher decides on every pack at speed whether it ships. This log records the verification checks the plan
requires — test weights at the limits and the reject proved with real packs — shows what is due, and when a check
fails says how many packs since the last good check are in doubt, raises the problem and keeps the check red until it
passes again.

**Scope.** A **checkweigher verification log** on a line: starter list (low, nominal and high test weights hourly,
reject check hourly, start-up and after product change); pass/fail each check; compliance, failures with hold and
problem; paper. Not: typed weight readings and drift charts (FC-119/120); deciding release; FC-135 hold register.

## 2. Users and scenarios
The operator at the checkweigher on a phone; the line lead and quality at a desk; the trading-standards auditor.
Failure at 11:00 with last good 10:00 on 110/min → 6,600 packs held.

## 3. Method selection
`packaging.checkweigher-verification` — dynamic checks at speed; reject with under-weight pack, not test button only.

**Established · assumed · chosen.**
- *Established:* errors +0.2, +0.6, −0.2 g on 395/400/405 g against 1.0 g tolerance pass; reject on 398 g and 399.4 g;
  failure window 60 min × 110/min = **6,600 packs** (`cases-operations.py`).
- *Assumed:* line stopped between fail and re-check; rated speed estimates packs unless typed on failure.
- *Chosen:* starter list hourly plus start-up and product change; Critical priority; holds product; no OIML clause quoted.
- *Money:* — of its own; failed check’s packs as materials (`knowledge/MONEY.md` M), as FC-088.

## 4. Inputs
Per check: name, where, who, how often, criterion, reaction, priority, holds. Per result: pass or fail, note, optional
packs typed. Line: rated speed, materials a pack.

## 5. Data suitability
Compliance from the first due check; event checks not scheduled overdue.

## 6. Calculations
As FC-236 §6. **Case 1** — four hourly checks, reject fails at 180 min: 16 due, 16 on time, 1 failure, 6,600 packs.
**Case 2** — one check missed twice: 50% compliance, overdue.

## 7. Outputs
As FC-236 §7 with this log’s words; limits on page and paper.

**The report.** The shape’s log paper (FC-236 §7) headed *Checkweigher verification — &lt;line&gt;*: checks as agreed,
compliance by check, failures with window and packs (or missing input), standard and TO CONFIRM lines, limits. Read back
with `pdftotext` in `log-shape.mjs`.

## 8. Manufacturing usability
Phone-first: hourly checks as pass/fail cards; start-up and product change under *When it happens*; fail asks note and
shows hold before record.

## 9. Failure handling
Missing rate or materials named; client read-only.

## 10. Integration
FC-236 §10; FC-119 gauge study; average-quantity modes; `holdFor` for FC-135.

## 11. Verification
Unit: `figures.test.ts` (both examples). Acceptance: `log-shape.mjs`.

**Acceptance criteria.**
1. Case 1 and case 2 reproduced — `figures.test.ts`; on the page — `log-shape.mjs` S4.
2. Failed reject check holds 6,600 packs at 110/min — `figures.test.ts`; `log-shape.mjs` S3.
3. One Critical problem raised; re-check fail adds journey step — `log-shape.mjs` S3.
4. Starter list sets no test-weight mass; three TO CONFIRM lines — `defs.test.ts`; `log-shape.mjs` S1, S3.
5. Paper carries checks, compliance, failure, limits — `log-shape.mjs` S3.
6. Limits on page and paper — `log-shape.mjs` S3.
7. Phone, edit, delete, client read-only — `log-shape.mjs` S3.

## 12. Maintainability
`src/tools/checks/defs/checkweigher.ts` is the whole of it.
