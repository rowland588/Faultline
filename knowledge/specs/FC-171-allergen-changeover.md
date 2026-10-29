# FC-171 — Allergen changeover validation: the clean verified before release — the specification

**Catalogue:** FC-171 · **Knowledge:** `foodsafety.allergen-changeover` (full, practice) · built on the check-log
shape, `knowledge/specs/FC-236-check-logs.md` · **Status:** built, W6b (29 October 2026).

## 1. Purpose
An allergen-to-non-allergen changeover is only safe when the validated clean is done and verified each time.
This log records visual inspection and verification swabs on every allergen changeover, shows what is due, and
when a check fails raises the problem and keeps the check red until it passes again.

**Scope.** An **allergen changeover verification log** on a line: starter list (visual inspection, three hard-to-clean
site swabs, release sign-off — each at changeover); pass/fail; compliance on events counted when done; failures with
problem; paper. Not: the allergen matrix (FC-070), validation study records (typed elsewhere), ATP as allergen proof
unless the site validated it as a proxy (FC-172), SMED timing (FC-072), deciding release.

## 2. Users and scenarios
The hygiene team on a phone at the line after the clean; the technical manager and auditor at a desk. A fail before
release stops the next product starting until re-clean and re-swab pass.

## 3. Method selection
`foodsafety.allergen-changeover` — validation once by allergen-specific testing; verification each changeover by visual
and swabs at the hardest sites.

**Established · assumed · chosen.**
- *Established:* verification is visual plus swabs at hard sites; a fail means re-clean and re-swab; release is signed
  when all pass (`foodsafety.allergen-changeover`).
- *Assumed:* the line is not running the next product until verification passes; a failure holds are about starting
  on a failed clean, not packs at speed unless the site typed otherwise on the failure.
- *Chosen:* starter list at **changeover** only (event checks, not overdue); **Critical** priority; **holds** true so
  a failure can price product if the line ran; swab method (allergen lateral-flow vs ATP proxy) is named in the
  criterion words, never decided here.
- *Money (`knowledge/MONEY.md`, FC-171):* the clean’s time and swabs are said with SMED’s clean (FC-068) — wage and
  swab cost when typed; not priced on this page’s verdict.

## 4. Inputs
Per check: name, where (site), who, changeover trigger, criterion, reaction, priority, holds. Per result: pass or fail,
note. Line: rated speed and materials only if a failure prices packs.

## 5. Data suitability
Event checks are counted when done, not scheduled overdue. Compliance counts due moments for interval checks only —
this log’s checks are all changeover events.

## 6. Calculations
As FC-236 §6. **Case 1** — one changeover, three swabs pass, visual passes. **Case 2** — one swab fails, check stays
failed until a pass.

## 7. Outputs
As FC-236 §7 with this log’s words; limits on page and paper.

**The report.** The shape’s log paper headed *Allergen changeover verification — &lt;line&gt;*: checks as agreed,
compliance where intervals exist, failures, standard and TO CONFIRM lines, limits. Read back with `pdftotext` in
`log-shape.mjs`.

## 8. Manufacturing usability
Phone-first: changeover checks as pass/fail cards under *When it happens*; fail asks a note before record.

## 9. Failure handling
Missing rate named when packs are priced; client read-only.

## 10. Integration
FC-236 §10; FC-072 SMED; FC-070 matrix; FC-172 ATP; FC-071 first-off; `holdFor` for FC-135.

## 11. Verification
Unit: `figures.test.ts` (both examples). Acceptance: `log-shape.mjs`.

**Acceptance criteria.**
1. Both worked examples reproduced — `figures.test.ts`; on the page — `log-shape.mjs` S4.
2. A failed swab raises one Critical problem; re-check fail adds a journey step — `log-shape.mjs` S3.
3. Starter list sets no allergen or swab kit; TO CONFIRM lines on the standard — `defs.test.ts`; `log-shape.mjs` S1, S3.
4. Paper carries checks, failures, limits — `log-shape.mjs` S3.
5. Phone, edit, delete, client read-only — `log-shape.mjs` S3.

## 12. Maintainability
`src/tools/checks/defs/allergen-changeover.ts` is the whole of it.
