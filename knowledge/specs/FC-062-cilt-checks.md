# FC-062 — Autonomous maintenance: CILT checks and abnormality tags, with FC-234, condition checks on a route — the specification

**Catalogue:** FC-062 and its mode FC-234 · **Knowledge:**
`maintenance.autonomous-maintenance` (full, textbook) · built on the check-log shape,
`knowledge/specs/FC-236-check-logs.md` · **Asked for:** the catalogue's own (*"Basic condition slips because
nobody owns the daily checks"*), taken up by Rowland's 25 October brief · **Status:** built on `build-checks`, 25
October — the builder's judgement calls are under *chosen*; the owner asked not to be asked.

## 1. Purpose
The people who run a machine all day see its abnormalities first, if they are looking and have a way to say so.
This log gives them the short written check — clean, inspect, lubricate, tighten — as a round on the phone, a tag
for every abnormality (a problem on the register against the machine), and the machine's warning signs (a
temperature, a belt's wear) read by a person and trended against their limits. It lets the engineer say to the
manager: *"Line 2's operator checks were 90% done this week; 17 tags are open, 6 older than a fortnight; the
wrapper's guard has been tagged four times — fix the source, not another wipe."*

**Scope.** What this build covers: **the operator round** (FC-062) — six starter checks per machine (guards,
leaks, belts, build-up, fasteners, lubrication) by shift, daily and weekly; **abnormality tags** raised from any
check as a problem on the register (red: the fitter's; white: the operator fixes), counted open by age and
repeated within 28 days; **condition checks on a route** (FC-234) — values read by a person (temperature, wear,
noise) against a limit, trended by point, those nearing a limit flagged; the paper. What it does not cover:
the seven steps and their step audits; the CIL minutes against the short stops they prevent (**FC-056**, the
loss count); planned maintenance by the fitters (**FC-063**); machine criticality (**FC-064**); one-point
lessons for each check (a Line Talk document); anything read from a sensor.

## 2. Users and scenarios
The operator at start of shift on a phone; the fitter reading red tags; the engineer reading the week. (1) *The
round:* six cards, six taps; a loose guard — Tag it red with two words; a problem is on the wrapper. (2) *The
fitter's list:* open tags by age on the machine. (3) *Condition route:* each morning the motor and bearing
temperatures are typed; the bearing is at 70 on a 40–75 band and has risen for a week — amber, "nearing the
upper limit, rising".

## 3. Method selection
Autonomous maintenance's own method (`maintenance.autonomous-maintenance`): checks done ÷ due per period and
shift; tags raised, closed, open by age (flag over 7 and over 14 days), by machine; repeat abnormalities — the
same place tagged again within the period. Condition monitoring by a person is its value variant.

**Established · assumed · chosen.**
- *Established:* the pillar and its measures (`maintenance.autonomous-maintenance`, Nakajima 1988, Suzuki 1994 —
  from knowledge, texts not re-read); a tag open over 7 and over 14 days flagged; a repeat is the same place
  tagged again in the period; the Mann–Kendall trend and Sen's slope (validated against SciPy in W2); the worked
  trend case in `cases-checks.py` (61 … 70 on a 40–75 band: S 27, τ 0.98, Sen 1.31, headroom 14.3%).
- *Assumed:* an operator's check is a pass-or-fail by a person; a tag's colour is the operator's judgement.
- *Chosen* (the builder): the **starter list** (a starting point to edit, **never the maker's instructions**);
  frequencies **by shift, daily and weekly**; the problem priority — a failed check is **Low**, a **red tag High**,
  a white tag Low; **the period for a repeat is 28 days**; a reading is **nearing** within **15%** of the band; a
  trend from **eight** readings; **the starter route sets no limit** — each limit comes from the maker's data, and a
  reading with none is recorded, trended and *said not to be judged*; a CILT check holds no product.
- *Money:* the checks' minutes against the short stops they prevent (knowledge/MONEY.md L, Q) are not built —
  the minutes a check takes are not recorded; said. Nothing is blocked.

## 4. Inputs
Per check: name, the machine (where), who, how often, what passes (pass or fail) or the limits and the unit
(value), the reaction. Per result: pass/fail or a number, a note. Per tag: the check, red or white, what was seen.

## 5. Data suitability
The round's compliance from the first shift; tag ages from the register's status; a trend from eight readings; a
limit blank means not judged.

## 6. Calculations
As FC-236 §6. Worked: **CILT** — a shift check (8 h, grace 2 h) done at 06:00 and 14:00, looked at 01:00 the next
day: 3 due, 2 on time, 1 missed, 66.7%, overdue; two tags on it (red, white) within 28 days = one repeat
abnormality. **Condition** — the trend case above: nearing the upper limit, rising, 8 of 8 daily readings on time.

## 7. Outputs
Tiles as the shape's; the insights: tags raised, open, older than a week and a fortnight, closed; the checks
tagged more than once in 28 days; for a value, the latest, its headroom, which way it is going, and the
"no limit set" note. A red tag is High on the register.

**The report.** The shape's log paper headed *Operator care checks — <machine>* / *Condition checks*: the checks
as agreed; compliance by check; the failures; the **tags** (raised, open by age, closed, repeats); for each value
check its readings against the limits as a picture and a table; the plan; the standard note with TO CONFIRM; the
limits.

## 8. Manufacturing usability
The round is the list of cards with ✓ Pass / ✗ Fail and **Tag it** (red / white and two words) on each; a value
check is a number box with its unit and limits. A tag is two taps and some words.

## 9. Failure handling
A tag with no words is refused ("Say what you saw"); a value with no limit set says it is not judged; a client
reads only; a tag whose problem is deleted on the register leaves the tag (its age is then unknown, said).

## 10. Integration
FC-236 §10; `defs/cilt.ts` and `defs/condition-route.ts`. A tag is a `Snag` on the line with the machine as its
target asset; `facts.tags` links it to the check. The line's page, report and Needs you carry overdue checks.

## 11. Verification
Unit: `figures.test.ts` (the CILT example, the tag figures — open, aged, repeated — and the condition example:
headroom, nearing, going up); `checks.test.ts` (the value verdict and trend against the independent case).
Acceptance: `scripts/acceptance/log-shape.mjs` (the cilt and condition-route rows: a tag raised from a check
becomes a problem on the machine, the tag figures, a value's trend on the page and in the paper).

**Acceptance criteria.**
1. The CILT example: 3 due, 2 on time, 1 missed, 66.7%, overdue, one repeat abnormality — `figures.test.ts`; the
   page — `log-shape.mjs` S4.
2. The condition example: headroom 14.3%, nearing the upper limit, rising from 8 readings, equal to the
   independent S, τ and Sen's slope — `checks.test.ts`, `figures.test.ts`; the page says it — `log-shape.mjs` S4.
3. A tag raised from a check is one problem on the register against the line and the machine, red High and white
   Low, linked to the check; the tag counts open until the problem is closed — `log-shape.mjs` S3.
4. A reading with no limit set is recorded and said not to be judged; the starter sets no limit — `defs.test.ts`;
   `log-shape.mjs` S3, S9.
5. The paper carries the checks, compliance, the tags and the value pictures — `log-shape.mjs` S3.
6. Phone, edit, delete with Undo, client read-only — `log-shape.mjs` S3.
*Not proved:* the minutes the checks take against the stops they prevent; real machine limits.

## 12. Maintainability
Two definition files. FC-063 (planned maintenance) will be a third on the same shape, with the plan interval from
the criticality class (FC-064); FC-014 (mistake-proofing devices) another list of daily checks.
