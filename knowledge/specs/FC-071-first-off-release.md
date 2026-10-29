# FC-071 — First-off release at changeover: line clearance and the first good pack — the specification

**Catalogue:** FC-071 · **Knowledge:** `changeover.first-off-release` (full, practice) · built on the check-log
shape, `knowledge/specs/FC-236-check-logs.md` · **Status:** built, W6c (29 October 2026).

## 1. Purpose
After a changeover the line must not run until line clearance and the first-off checks pass and release is signed.
This log records that list each changeover, shows what is still to do, and when a check fails raises the problem and
keeps the check red until it passes.

**Scope.** A **first-off release log** on a line: starter list (clearance, allergen verification where needed,
packaging verified, date and lot, first-pack weight and seal, detector and checkweigher proofs, release sign-off —
each at changeover); pass/fail; event checks counted when done; failures with problem; paper. Not: SMED timing
(FC-068), in-run label checks (FC-166), deciding recall, FC-135.

## 2. Users and scenarios
Line leader on a phone at the line after changeover; quality and retailer auditor at a desk. Eight checks; release at
06:52 after 06:30 start — 22 minutes to first good pack; this month’s failures: label 3, code 2, weight 1.

## 3. Method selection
`changeover.first-off-release` — the gate between SMED’s run-up and production; each check tapped before release.

**Established · assumed · chosen.**
- *Established:* eight checks in order through clearance, packaging, first packs and detector proofs; first-off time
  belongs in SMED’s record (`cases-operations.py`).
- *Assumed:* nothing ships until release is signed; a failure stops release, not mid-run packs.
- *Chosen:* all checks at **changeover** (event); **Critical** priority; **holds** false (release not yet given);
  list is a starter — the site trims or extends by change type.
- *Money (`knowledge/MONEY.md`, FC-071):* release wait as contribution (C) when wage and rate are given; a failure
  caught here priced as mislabel (M) when materials a pack are typed — not on the verdict.

## 4. Inputs
Per check: name, where (line), changeover trigger, criterion, reaction, priority. Per result: pass or fail, note.

## 5. Data suitability
Event checks counted when done, not scheduled overdue.

## 6. Calculations
As FC-236. **Case 1** — one changeover, label check fails before release: one failed, release check still waiting.
**Case 2** — two changeovers, all pass both times: events done, none failed.

## 7. Outputs
As FC-236 §7 with this log’s words.

**The report.** *First-off release — &lt;line&gt;* on the shape’s log paper. Read back in `log-shape.mjs`.

## 8. Manufacturing usability
Phone-first pass/fail cards at changeover; fail asks a note before record.

## 9. Failure handling
Client read-only.

## 10. Integration
FC-236 §10; FC-068 SMED; FC-166 in-run labels; FC-171 allergen verification; FC-164/FC-170 proofs.

## 11. Verification
Unit: `figures.test.ts`. Acceptance: `log-shape.mjs`.

**Acceptance criteria.**
1. Both worked examples — `figures.test.ts`; `log-shape.mjs` S4.
2. Failure raises one Critical problem; re-check journey — `log-shape.mjs` S3.
3. Starter list and TO CONFIRM — `defs.test.ts`; `log-shape.mjs` S1, S3.
4. Paper — `log-shape.mjs` S3.
5. Phone, edit, delete, client — `log-shape.mjs` S3.

## 12. Maintainability
`src/tools/checks/defs/first-off.ts` is the whole of it.
