# FC-122 — Calibration register and checks (a check log on the line)

**Catalogue:** FC-122 · **Knowledge:** `msa.calibration` · **Programme:** W4 (`docs/TOOLS-BUILD.md`) · **Status:** built October 2026.

## 1. Purpose
Probes, scales and checkweighers are checked on a schedule against a reference; when one fails, everything the gauge judged since the last good check is in doubt until reviewed. The log answers: *"Three gauges overdue; the Line 2 bench scale failed yesterday — 0.4 g out, 0.3 g allowed — 50,000 packs since the last good check on 10 Oct; the problem is on the register."*

**Scope.** One check log (`key: calibration`) on the shared check-log shape (FC-236): each instrument a check with its place, interval, unit, acceptable band on the reference (lo/hi), a typed reading each time, due/overdue/failed states, compliance, what a failure holds (packs from rate or typed, money from materials a pack), a problem raised. Starter list: bench scale, cooking probe, checkweigher — limits edited on the line, never presented as the standard. Not in this build: interval from stability drift (FC-120), product release decision (site's call), product-on-hold register (FC-135), traceability of reference certificates, feeding FC-120's stability chart automatically.

## 2. Users and scenarios
Quality technician on a phone at the scale; QA manager reading overdue first; food — ice-point on a cook probe weekly, test weight on a checkweigher each shift.

## 3. Method selection
The calibration programme (`msa.calibration`): due = last good + interval; pass when |reading − reference| ≤ allowed error, implemented as lo/hi on the reference value. Alternatives: is the gauge fit at all → FC-119; drift across range → FC-120; uncertainty statement → FC-123.

**Established · assumed · chosen.**
*Established:* product-at-risk window and packs from rate × window (`knowledge/methods/msa/calibration.md`; `scripts/knowledge/cases-msa.py`).
*Assumed:* the reference value is the centre of lo/hi agreed on the check; readings are typed by a person.
*Chosen:* shape is check log not a separate register screen (`knowledge/BUILD-SHAPES.md`); grace and compliance as FC-236; failure priority high (food-safety gauges may be critical on the check); money — checks' labour as appraisal (L) per `knowledge/MONEY.md` FC-122 — not priced in this slice unless wage given on the line (optional, not blocking).

## 4. Inputs
Per check: name, where (gauge), interval, unit, lo and hi on the reference (required before judged), who. Each result: reading (value), by, note; optional packs made typed on failure.

## 5. Data suitability
A reading with no lo/hi is recorded and not judged (info). At least one check on the list to start.

## 6. Calculations
Pass/fail: `verdictOf` — value inside [lo, hi]. Hold: shared `holdOf` — window since last good, packs from typed `made` or line rate. Independent case: weekly scale, ±0.3 g on 500 g, fail at 500.4 g, 7-day window, 50,000 packs at 50,000/week rate (`cases-msa.py`).

## 7. Outputs
Round sorted overdue first; tiles compliance, failed, overdue, held packs; failure sentence with window and packs; paper same as shape.

**The report.** FC-236 log paper: band, compliance, failures with holds, history, closing line.

## 8. Manufacturing usability
Logs hub → Calibration → New on the line; round: type reading, Pass implied when in band; Fail when outside; phone 390px.

## 9. Failure handling
Blank reading refused; no limits → recorded not judged; no rate → names where to give speed or type packs.

## 10. Integration
`ToolStudy` tool `log`, `agreed.log.key: 'calibration'`. Catalogue `kind: log`, `/log/calibration`. Line Logs row, line report, Needs you.

## 11. Verification
`checks.test.ts`, `figures.test.ts`, `defs.test.ts` (examples); `scripts/acceptance/log-shape.mjs` (table-driven).

**Acceptance criteria.**
1. Definition in `defs/calibration.ts` listed on hub — `log-shape.mjs` S1–S2.
2. Worked example — fail holds 50,000 packs, compliance counts — `defs.test.ts` / `log-shape.mjs` S3–S4.
3. Paper read back — `log-shape.mjs` S3.
4. Phone — `log-shape.mjs` S3.

## 12. Maintainability
Code: `src/tools/checks/defs/calibration.ts`. Left: drift-based interval; link daily check to FC-120 stability; FC-135 hold record; appraisal minutes in money.
