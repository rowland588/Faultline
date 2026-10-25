# FC-170 — Metal detection and X-ray verification: test pieces at the agreed times, and what a miss holds — the specification

**Catalogue:** FC-170 · **Knowledge:** `foodsafety.metal-detection-verification` (full, practice) · built on
the check-log shape, `knowledge/specs/FC-236-check-logs.md` · **Asked for:** the catalogue's own
(*"A missed detector check means holding everything since the last good one"*), taken up by Rowland's 25
October brief · **Status:** built on `build-checks`, 25 October — the builder's judgement calls are under
*chosen*; the owner asked not to be asked.

## 1. Purpose
The metal detector or X-ray is usually a critical control point, and its control is only as good as the
proof that it detects, and the reject removes, the test pieces the plan validated. This log lets the
operator tap each check as it is done, shows what is due, and — when a piece is not found or not rejected —
says at once **how long and how many packs since the last good check are in doubt**, raises the problem on
the register and keeps the check red until it passes again. It lets the line say to quality, and quality to
the auditor: *"Eleven of eleven checks were done on time today; at 11:00 the stainless piece was not
rejected; 6,600 packs since the 10:00 check are held, the problem is Critical on the detector."*

**Scope.** What this build covers: a **metal detection log** on a line, started from a starter list (a
ferrous, a non-ferrous and a stainless steel piece every hour; all three at start-up, after a changeover
and at the end of the run), each check pass or fail where *pass means detected and rejected*; the states,
compliance, the failures with the window and packs held and the problem raised; the paper. What it does
not cover: **deciding** whether product is held, re-run, released or scrapped (the site's call, never this
tool's); the product-on-hold record (**FC-135**, with its disposition and release); the signal strength on
each piece (a drift toward the threshold); the validation of the sensitivities; X-ray-specific contaminants;
a missed event check (start-up, changeover, end of run are counted, not scheduled).

## 2. Users and scenarios
The operator at the detector on a phone; the line lead and the quality person at a desk; the auditor reading
the paper. (1) *A day's checks:* three hourly pieces, all passed; a start-up and a changeover check tapped
when done. (2) *A miss:* the SS piece passes through undetected at 11:00 — Fail, a note ("reject arm air
line"), the sheet says what is held, a Critical problem is raised on the "Metal detector"; the line stops;
the operator re-checks, the piece is rejected, the check is green. (3) *A forgotten hour:* nobody did the 13:00
check; at 13:15 it is amber, at 13:16 it is red *Overdue* and on the line's page and Needs you. (4) *The
auditor asks for the record:* the paper shows the checks as agreed, 100% compliance but one failure, what it held.

## 3. Method selection
The practice in the knowledge record: a check at start-up, at intervals, after any stop or changeover and at
the end; each piece detected **and** rejected; the product since the last good check suspect and held and
re-run through a working detector; the clean record's bound. The schedule, the hold and the money are the
shape's; this definition brings the list and the words.

**Established · assumed · chosen.**
- *Established:* the verification practice (`foodsafety.metal-detection-verification`, from knowledge); the
  worked case — checks due in a 7-hour run with 2 stops over 10 minutes is 1 + 7 + 2 + 1 = 11 × 3 pieces; a
  failure at 11:00 with the last good at 10:00 on a 110 a minute line is 60 × 110 = **6,600 packs**; 200 checks
  with none failed show at most **1.5%** could fail (95%) — the unit tests take these.
- *Assumed:* the line is stopped between a failed check and its re-check (so the re-check failing again holds
  nothing more); the rated speed (or Line capacity's rate) is a fair estimate of what was made — it is said to be
  an estimate, and the packs can be typed on the failure.
- *Chosen* (the builder): the starter list — three pieces **hourly**, plus start-up, changeover and end-of-run
  checks of all three — a starting point to edit, **never the standard**; the problem raised is **Critical**
  (priority is the check's and changeable); a failure **holds** product (changeable per check); **no
  test-piece size is given** — the sizes, positions and frequency are the site's validated plan. The
  **BRCGS clause number is not quoted** (TO CONFIRM against the text); nor is the retailer's code.
- *Money:* the packs held at the line's materials a pack (`lib/problemCost`, knowledge/MONEY.md H, M); the
  checks' own minutes (appraisal, Q) are not priced — they are not timed here. Missing inputs are named.

## 4. Inputs
Per check: name, where (default "Metal detector"), who, how often, what passes ("Detected, and the reject
removes the pack"), the reaction, the problem's priority, whether it holds. Per result: pass or fail, a
note, the packs made if counted. Read from the line: rated speed, materials a pack, Line capacity's rate.

## 5. Data suitability
Compliance from the first due check; the clean record's bound from 20 pass-or-fail results. Event checks are
not scheduled. A log is started at a time: the first hourly check is due then.

## 6. Calculations
As FC-236 §6. Worked here: **case 1** — pieces hourly from 08:00 done at 0, 60, 120, 180 minutes, the third
failing at 180: 12 due, 12 on time, 0 missed, 100%; 1 failure, window 60 min, 6,600 packs at 110 a minute;
**case 2** — the ferrous piece done at 0 and 60 then not again, looked at 200: 4 due, 2 on time, 2 missed, 50%,
overdue.

## 7. Outputs
As FC-236 §7, with this log's words: the failure line *"Held: 1 h since the last good check — 6,600 packs (at
the line’s rated speed), £1.3k tied up in materials."*; the standard note and the three TO CONFIRM lines on the
page and the paper; the limits (never decides a release; sizes are the site's; a pass is detected and rejected;
signal strength not recorded; event checks not scheduled; FC-135 not built).

**The report.** The shape's log paper (FC-236 §7) headed *Metal detection checks — <line>*: the six checks as
agreed with their frequency; compliance by check; the failures with the window, the packs and money (or the
missing input) and the problem raised; the clean-record sentence when 20 checks have none failed; the standard
and the TO CONFIRM lines; the limits. Read back with `pdftotext` in `log-shape.mjs`.

## 8. Manufacturing usability
Phone-first: the hour's three pieces on top as cards with ✓ Pass / ✗ Fail; start-up and changeover under *When
it happens*; a fail asks for a note and shows the hold before it is recorded.

## 9. Failure handling
A fail with no rate: *"Give the line a rated speed (or a product’s Line capacity), or type the packs made …"*;
no materials: *"Give the line its materials a pack …"*; no good check yet: the window is from the start of the
log, said. A client reads only. A struck pass makes the check due again.

## 10. Integration
FC-236 §10. This log is `defs/metal-detection.ts`; the line's page, line report and Needs you carry its overdue
and failed checks; the register carries the problem; `holdFor` is the seam for FC-135.

## 11. Verification
Unit: `figures.test.ts` (this definition's two examples: 12/12/0 100%, 1 failure, 6,600; 4/2/2 50% overdue; the
hold in packs and pounds; the seam) and `checks.test.ts` (the clean bound against scipy). Acceptance:
`scripts/acceptance/log-shape.mjs` (the metal-detection rows of its table).

**Acceptance criteria.**
1. Case 1 and case 2 are reproduced by the module — `figures.test.ts`; on the page — `log-shape.mjs` S4.
2. A failed check holds 6,600 packs (60 min × 110) and says how it knows; the same without a rate names the
   missing input — `figures.test.ts`; `log-shape.mjs` S3 (the sheet).
3. The failure raises one Critical problem on "Metal detector" with the packs held and the note; a second failure
   in a row adds a journey step — `log-shape.mjs` S3.
4. The starter list is six checks and sets no test-piece size; the standard note lists three things TO CONFIRM
   and quotes no clause number — `defs.test.ts`; the page and paper — `log-shape.mjs` S1, S3.
5. The paper carries the checks as agreed, compliance, the failure and its hold, the limits — `log-shape.mjs` S3.
6. The wording states the team's rules and never decides a release (the limit is on the page and the paper) —
   `log-shape.mjs` S3.
7. Phone, edit, delete with Undo, client read-only — `log-shape.mjs` S3 (the table).
*Not proved:* a real detector's signal; the retailer's frequency; two phones on one detector.

## 12. Maintainability
`src/tools/checks/defs/metal-detection.ts` is the whole of it. FC-135 will read `holdFor`; FC-164 (checkweigher)
and FC-166 (code and label) are the same shape with their own lists.
