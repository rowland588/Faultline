# FC-172 — Cleaning verification by ATP: swabs against the site’s limits — the specification

**Catalogue:** FC-172 · **Knowledge:** `foodsafety.cleaning-verification-atp` (full, practice) · built on the check-log
shape, `knowledge/specs/FC-236-check-logs.md` · **Status:** built, W6b (29 October 2026).

## 1. Purpose
Pre-op cleaning must be evidenced, not ticked. This log records ATP (RLU) readings at each swab site before start-up,
judges them against limits the site sets on each check, shows pass rate and trends, and when a reading fails raises the
problem and records re-clean until pass.

**Scope.** A **cleaning verification (ATP) log** on a line: starter list (product-contact sites, each a value check in
RLU before start-up daily); typed reading each time; due/overdue on the schedule; failures with problem; pass rate and
value trends by site (the Pareto of fails is read from which sites fail most). Not: microbiological environmental
monitoring (FC-173), allergen-specific swabs (FC-171), deciding release, a third “caution” band in the engine (pass and
fail limits are set on each check; cautions that must re-clean use the fail limit the site chooses).

## 2. Users and scenarios
Hygiene operator swabbing on a phone before the line runs; the hygiene lead reading pass rate and which site fails most;
auditor reading the paper.

## 3. Method selection
`foodsafety.cleaning-verification-atp` — RLU against site-set limits; lower is cleaner; fails and usually cautions
re-clean before start.

**Established · assumed · chosen.**
- *Established:* illustrative month — 120 swabs, pass &lt; 150 RLU, caution 150–300, fail ≥ 300 → 83% pass, median 62
  RLU; slicer blade guard fails most (`cases-planning-foodsafety.py`, `foodsafety.cleaning-verification-atp`).
- *Assumed:* pre-op — the line is not in production; **holds** false (no product since last good check); re-clean delay
  is labour and start-up delay (FC-172 money), not packs held.
- *Chosen:* starter sites without limits (set from baseline on the line); **daily** before start-up; **high** priority on
  fail; unit **RLU** on each site check.
- *Money (`knowledge/MONEY.md`, FC-172):* re-clean minutes × crew (L) + line stood (T) + chemicals (E) — wage and chemical
  cost when typed; missing input named, never a figure invented.

## 4. Inputs
Per check: name, where (site), limits lo/hi in RLU (site-set), daily schedule, reaction. Per result: typed RLU. Line:
wage for labour on re-clean when priced.

## 5. Data suitability
Limits must be set before a reading is judged; with none, recorded and trended only (FC-236). Trend from eight readings.

## 6. Calculations
As FC-236 §6 for values. **Case 1** — three sites, limits hi = 300 RLU (fail above), one site reads 320 → one failure.
**Case 2** — one site done twice, third due missed.

## 7. Outputs
As FC-236 §7; value insights name each site’s latest reading and trend; failures by site feed the Pareto in words on the
history panel.

**The report.** The shape’s log paper headed *Cleaning verification (ATP) — &lt;line&gt;*: checks, readings, compliance,
failures, limits. Read back with `pdftotext` in `log-shape.mjs`.

## 8. Manufacturing usability
Phone: one number box per site; fail shows which limit was breached before record.

## 9. Failure handling
Client read-only; missing wage named when money is asked.

## 10. Integration
FC-236 §10; FC-171 allergen proxy only where validated; FC-173 environmental programme.

## 11. Verification
Unit: `figures.test.ts`. Acceptance: `log-shape.mjs`.

**Acceptance criteria.**
1. Worked examples reproduced — `figures.test.ts`; `log-shape.mjs` S4.
2. Reading above hi fails; pass clears failed state on re-swab — `log-shape.mjs` S3.
3. Starter list sets no RLU limits — `defs.test.ts`.
4. Paper and limits — `log-shape.mjs` S3.
5. Phone, edit, delete, client read-only — `log-shape.mjs` S3.

## 12. Maintainability
`src/tools/checks/defs/cleaning-atp.ts` is the whole of it.
