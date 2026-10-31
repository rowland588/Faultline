# FC-014 — Mistake-proofing devices: the register and the daily device checks (poka-yoke) — the specification

**Catalogue:** FC-014 · **Knowledge:** `lean.poka-yoke` (full, textbook) · built on the check-log shape,
`knowledge/specs/FC-236-check-logs.md` (models: FC-170 metal detection, FC-166 code and label, FC-062 CILT) ·
**Asked for:** `docs/METHODS.md` §11 (the Kaizen event's Improve and Standardise; 8D's D7; DMAIC's Improve),
Rowland, 31 October: *"I want it done as fast as possible"* · **Status:** built on `m5-kaizen`, 31 October — the
builder's choices are under *chosen*; the register's structured fields are **not** built (see the Scope).

## 1. Purpose
A mistake-proofing device — the label-presence sensor, the date-code reader, the reject-confirm on the metal
detector, the case-count sensor, the guard interlock — is protection only while it works, and nobody sees a
sensor fail. So each device is on a list with what error it prevents, how it works, and a **deliberate fail test**
(a known-bad part presented) done on a schedule; and a failed test means everything made since the last good test
was unprotected. This log lets the operator tap each device's test as it is done, shows what is due and what was
missed, and — when a device does not act on the known-bad part — says at once how long and how many packs since the
last good test were unprotected, raises ONE problem on the register and keeps the check red until it passes. It lets
the line say to quality: *"Eight devices tested this shift; the label sensor did not stop the line on the known-bad
pack; the last good test was 7 hours before; 46,200 packs are held for inspection, and the problem is on the
register."*

**Scope.** What this build covers: a **mistake-proofing device log** on a line, started from a starter list of nine
checks (six devices tested every shift, a guard interlock daily, colour-coded tools and a recipe release weekly, a
walk for bypassed devices every shift, and a re-test after any device is repaired or moved); each check pass or
fail where *pass means the device acted on the known-bad part*; the states, compliance, the failures with the window
and the packs held and the problem raised; the paper. **The register is the list of checks** (knowledge/BUILD-SHAPES.md
row FC-014): the device is the check's name, **what error it prevents** is said in the name, **the type
(contact · fixed-value · motion-step, Shingo) and function (control · warning)** and **the fail test** are in the
check's "passes if" words, **where on the line** is the check's where, **how often** is its frequency. What it does
**not** cover, said on the page and the paper: the register's fields **as data** (type, function and the error are
words inside the check, so the list cannot yet be filtered by type or function — see §12 for exactly what that
needs); the errors **not yet proofed** (the FMEA's ranking, **FC-132**, not built); the device's **effectiveness**
(defects of its kind reaching the next step before and after, **FC-134**/**FC-150**); the device's cost against the
failures it stops (no device cost is held); deciding whether held product is released, re-run or scrapped (the
site's call); the product-on-hold record (**FC-135**); the device maker's own verification of a detector or a label
reader (**FC-170**, **FC-166**, which are separate logs).

## 2. Users and scenarios
The operator at start of shift on a phone, the engineer who owns the devices, the quality person reading the week
and the auditor. (1) *Start of shift:* six cards, each "present the known-bad part" and ✓ Pass / ✗ Fail. (2) *A
miss:* the label-presence sensor lets the known-bad pack through — Fail, a note ("sensor lens dirty"); the sheet says
the packs since the last good test are held; a Critical problem is on the register against the labeller; the line
stops; the sensor is cleaned, re-tested, passes. (3) *A bypass:* the walk finds a jumper across the guard switch — a
failure of the system, not of the device (the knowledge record's rule) — recorded as a fail of the bypass check. (4)
*A forgotten weekly test:* the colour-coded tools' check is amber then red *Overdue*, on the line's page and Needs
you. (5) *A Kaizen event or an 8D's D7* fits a new device and adds its check to the list the same day.

## 3. Method selection
Shingo's poka-yoke (`lean.poka-yoke`): the device at the source, control or warning, **verified** at start-up with a
known-bad part — the verification practice of the automotive control plan — and the checks done, missed and failed as
the measure. Alternatives from the record: ranking which errors to proof first is the FMEA (**FC-132**); the checks
as part of the line's control plan is **FC-133**; the detector's and label reader's own verification are **FC-170**
and **FC-166**; a device's repeated failure goes to the 5 whys.

**Established · assumed · chosen.**
- *Established:* Shingo's three device types — contact, fixed-value, motion-step — and two functions — control,
  warning — and that a device is only protection while it works (`lean.poka-yoke`, Shingo 1986 and Nikkan Kogyo
  Shimbun 1988, **from knowledge, the texts not re-read**); a failed test means everything since the last good test was
  unprotected; a bypass is a failure of the system; the worked case of the record: a label-presence sensor fails its
  test, the last good was 7 h earlier on a line making 110 a minute → 7 × 60 × 110 = **46,200 packs** to inspect;
  weekly device tests due and not done are devices of unknown state; n clean tests prove only that at most
  1 − 0.05^(1/n) (≈ 3/n) of tests could fail at 95% (the exact bound for zero failures — 62 clean tests: **at most
  4.7%**; the record's "4.8%" is the 3/n approximation) — `scripts/knowledge/cases-lean.py`, `cases-checks.py`.
- *Assumed:* the line is stopped between a failed test and its re-test (so a re-test that fails again holds nothing
  more); the line's rated speed (or Line capacity's rate) is a fair estimate of what was made — it is said to be an
  estimate and the packs can be typed on the failure.
- *Chosen* (the builder): the starter list — six devices tested **every shift**, the guard interlock **daily**, the
  colour-coded tools and the recipe release **weekly**, a bypass walk every shift, a re-test **when a device is
  repaired, moved or reset** — a starting point to edit, **never the standard and never a site's actual devices**;
  nothing about what a device must detect (sizes, sensitivities, tolerances) is given — those are the site's; the
  problem raised is **Critical** for a device guarding a food-safety or label error, **High** for the others, and
  changeable per check; a failure of a product device **holds** product, a guard interlock holds none (it protects a
  person, not the pack); **no standard's clause number is quoted** (the automotive control-plan reference is listed to
  confirm).
- *Money* (`knowledge/MONEY.md` §4, FC-014): a device's prevention cost against the failures it stops, in cost of
  quality (Q). **Built:** the packs held by a failed test at the line's materials a pack (the shape's one model,
  `lib/problemCost`, H and M); the missing input is named ("Give the line its materials a pack …"). **Not built:** the
  device's own cost against the failures it stops — no device cost is held, so *"Give the device's cost to say what it
  pays back"* is said as a limit, never as a figure. Nothing waits on either.

## 4. Inputs
Per check (a device): name (the device and the error it prevents), where, who, how often, what passes (the
device acts on the known-bad part, in words with its type and function), the reaction, the problem's priority,
whether it holds product. Per result: pass or fail, a note, the packs made if counted. Read from the line: rated
speed, materials a pack, Line capacity's rate. Agreed before done: the list (the project's owner edits it).

## 5. Data suitability
Compliance from the first due test; the clean record's bound from 20 pass-or-fail results (the shape's). Event
checks (the re-test after a repair) are counted when done, not scheduled — a missed one is not known. A log is started
at a time: the first test of each device is due then.

## 6. Calculations
As FC-236 §6 — due moments, grace (a quarter of the interval, 5 min to 12 h), compliance, the failure window and the
hold (rate × window), the clean bound `1 − (1 − conf)^(1/n)`. Worked here, by hand and in `cases-lean.py`:
- **Case 1** — the record's case. The label-presence sensor tested every 7 hours (a 7-hour run; the example agrees
  the interval) and the date-code reader tested every shift (8 h), the sensor passing at 0 and 420 min and failing at
  840 min, the reader passing at 0, 480 and 960; looked at 965 min; 110 packs a minute. Due decided: sensor 0, 420,
  840 = 3, reader 0, 480, 960 = 3 → **6 due, 6 on time, 0 missed, 100%**; one failure, window 840 − 420 = 420 min,
  420 × 110 = **46,200 packs**.
- **Case 2** — the weekly checks. The colour-coded tools done at day 0 and day 7, the recipe release only at day 0,
  looked at day 8: tools 2 due 2 on time; recipe release 1 on time, the day-7 one missed once its 12 h grace passed →
  **4 due, 3 on time, 1 missed, 75%**, the recipe release overdue (the record's "14 due, 12 done, 2 not checked",
  in miniature).

## 7. Outputs
The shape's (FC-236 §7), in this log's words: tiles (done on time, missed, failed, product held), the sentence, what
it means (the clean record's bound, where a device failed), the failure line *"Held: 7 h since the last good check —
46,200 packs (at the line's rated speed), £… tied up in materials"* (or the missing input), the standard note with its
things to confirm, and the limits (the register's fields are words in the check; the unproofed errors, effectiveness
and the device's cost are not here; it never decides a release; a warning device depends on a person's reaction).

**The report.** The shape's log paper (FC-236 §7) headed *Mistake-proofing device checks — <line>*: the devices as
agreed — each with the error it prevents, its type and function and its fail test — and how often; compliance by
check; the failures with the window, the packs and money (or the missing input) and the problem raised; the
clean-record sentence when 20 checks have none failed; the standard note and its TO CONFIRM lines; the limits. Read back
with `pdftotext` in `log-shape.mjs` (S3, table-driven).

## 8. Manufacturing usability
Phone first: the shift's six devices on top as cards, each with its "Passes if: …" words and ✓ Pass / ✗ Fail; *Pass all
due* only when the operator presents the known-bad part to each — the shape names how many and which before it
records anything; the re-test after a repair under *When it happens*; a fail asks for a note and shows the hold
before it is recorded.

## 9. Failure handling
A fail with no rate: *"Give the line a rated speed (or a product's Line capacity), or type the packs made …"*; no
materials: *"Give the line its materials a pack …"*; no good test yet: the window is from the start of the log, said.
A bypass found is a fail with a note. A client reads only. A struck pass makes the check due again. A device taken off
the list is struck through, never erased.

## 10. Integration
FC-236 §10. This log is `defs/mistake-proofing.ts`; the hub (`#/logs`), a line's Logs, the project's Tools, the line
report, Needs you, the register (one problem per failure, a second failure in a row adds a step), the paper, the
catalogue directory (`/log/mistake-proofing`) and the method pages of the Kaizen event, 8D and DMAIC (the catalogue's
status) all read the definition; `holdFor` is the seam for FC-135. No new record noun (`docs/BLUEPRINT.md` §2): a
log is a `ToolStudy`. No database change.

## 11. Verification
Unit: `figures.test.ts` (this definition's two examples, table-driven: 6/6/0 100%, one failure, 46,200 packs;
4/3/1 75% overdue) and `defs.test.ts` (the starter list valid and allowed, the standard honest, no limit given, in the
catalogue); `checks.test.ts` (the clean bound against SciPy, the shape's). Acceptance: `scripts/acceptance/log-shape.mjs`
(the `mistake-proofing` rows of its table, driven against this definition's worked examples).

**Acceptance criteria.**
1. Case 1 and case 2 are reproduced by the module — `figures.test.ts` (table-driven over this definition's examples);
   on the page — `log-shape.mjs` S4.
2. A failed device test holds 46,200 packs (420 min × 110) and says how it knows; the same without a rate names the
   missing input — `figures.test.ts` (the shape's hold tests); `log-shape.mjs` S3.
3. The failure raises ONE problem on the register, with the packs held and the note; a second failure in a row adds a
   journey step, not a problem — `log-shape.mjs` S3.
4. The starter list is nine checks, each of an allowed kind with a frequency; it gives no device's tolerance or
   sensitivity, quotes no clause number, and lists the things still to confirm — `defs.test.ts`; the page and the
   paper — `log-shape.mjs` S2, S3.
5. The paper carries the devices as agreed, compliance, the failures and their hold and the limits (including that the
   register's fields are words in the check) — `log-shape.mjs` S3.
6. The wording states the team's rules and never decides a release — the limit is on the page and the paper —
   `log-shape.mjs` S3.
7. Phone, edit, delete with Undo, client read-only — `log-shape.mjs` S3 (the table).
8. It appears on the Kaizen event, 8D and DMAIC method pages once the catalogue says it is built — the catalogue
   test (`src/catalogue/__tests__/catalogue.test.ts`) and the method page (`src/project/method/methodTools.ts`).
*Not proved:* a real device's behaviour; two phones on one list; the register's structured fields (not built).

## 12. Maintainability
`src/tools/checks/defs/mistake-proofing.ts` is the whole of it. **What the register part needs** (not built, because
it changes the shared shape other logs use): optional fields on `LogCheck` (`src/lib/study.ts`) — `error?: string`
(the error prevented), `deviceType?: 'contact' | 'fixed-value' | 'motion-step'`, `deviceFunction?: 'control' |
'warning'` — an input for each in the check editor (`ChecksEditor.tsx`), and a register table on the log's paper
and the History view grouped by type and function. They live inside the study's `agreed` JSON (a `jsonb` column), so
**no migration is needed** — to be confirmed by the lead before that slice. The candidates list (errors not yet
proofed) waits for **FC-132**; effectiveness for **FC-134**; the control plan's use of these checks for **FC-133**.
