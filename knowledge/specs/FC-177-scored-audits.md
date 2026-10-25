# FC-177 — Scored audits (GMP, hygiene, layered process) with FC-013, the 5S audit — the specification

**Catalogue:** FC-177 and FC-013 (its first checklist) · **Knowledge:** `foodsafety.audits` (full, practice),
`lean.five-s` (full, textbook) · built on the check-log shape, `knowledge/specs/FC-236-check-logs.md` ·
**Asked for:** the catalogue's own (*"Audits find the same things every month"*), taken up by Rowland's 25
October brief · **Status:** built on `build-checks`, 25 October — the builder's judgement calls are under
*chosen*; the owner asked not to be asked.

## 1. Purpose
An audit is a fixed list of questions walked at a frequency by people at different levels. Its value is not
the number but **the trend, the weakest heading and the findings that come back**. This log scores the walk on
the phone, shows the score by heading and over time, makes every finding below the line a problem on the
register with an owner and a day, and marks the one that has come back. It lets the team leader say to the
manager: *"Line 3 scored 65%, down from 72% a week ago; Shine is the weakest at 44%; nine findings, four of them
came back from last week."*

**Scope.** What this build covers: two logs on the shared scored-checklist variant — **the 5S audit** (FC-013:
five S × four questions, 0–4) and **the scored audit** (FC-177: a GMP walk by the team leader daily and an audit by
a manager weekly, five sections × four questions, 0–2) — each: the audit done on a phone with a running score, the
score overall and by heading, the trend (falls in a row, the weakest heading), the findings, repeats, and each
finding offered as a problem; the paper. What it does not cover: the **grading of a certification audit**
(BRCGS majors and minors and their bands — **TO CONFIRM**, not built); two auditors' agreement on one area
(**FC-121**); photographs of what right looks like beside a question; a finding's root cause (`rca.eight-d`,
FC-150); the external audit's own findings register; checklists of a customer or a standard (each is a
definition a site adds).

## 2. Users and scenarios
The team leader on a phone walking the area; the manager weekly; the quality manager reading the trend. (1) *A
Friday 5S walk:* 20 questions, a level each, the running score visible, Finish; nine findings listed with their
level and "came back" marks, each ticked to raise as a problem (low; high when it came back). (2) *The daily GMP
walk:* the team leader's check is due every day (red when missed); the manager's is weekly. (3) *The meeting:*
the lean page — latest score and since, the weakest S, the falls, the plan.

## 3. Method selection
The record's method: score per question; heading score = Σ ÷ (questions × max); area score = Σ all ÷ (all
questions × max); the trend by audit, a fall two audits running the signal; each finding an action with an owner
and a day; repeats the system failures. A scored checklist is the right variant for a fixed list answered on one
scale; a free-text audit report would lose the trend.

**Established · assumed · chosen.**
- *Established:* the arithmetic and the worked case (`lean.five-s`, Hirano 1995 / Osada 1991 from knowledge, texts
  not re-read): five S × four questions, 52 of 80 = **65%**; Sort 88%, Set in order 69%, Shine 44%, Standardise
  69%, Sustain 56%; a fall two audits running is the signal; compare an area with itself over time; the GMP worked
  case (cases-checks.py): 36 of 40 = 90%, 3 findings, cleaning weakest at 62.5%. Audit practice
  (`foodsafety.audits`, from knowledge): findings closed with evidence, counted when they repeat.
- *Noticed:* `lean.five-s` says "five falls in a row" for 81, 78, 75, 72, 65; those are **four** falls (the
  record's own script says four) — corrected in the record.
- *Assumed:* the same questions are asked each time; "not applicable" leaves both sides of the score.
- *Chosen* (the builder): the **questions** of both starter checklists are a starting point written for Faultline
  — not Hirano's or Osada's, not BRCGS's, not a customer's; the **scales** — 0–4 with words (Not done … At the
  standard) for 5S, 0–2 (Not met, Partly met, Met) for GMP; a **finding** is an answer below 3 (5S) or below Met
  (GMP), changeable on the check; **no pass score is set** (the owner agrees one; with none the score is shown,
  not judged); a finding that **came back** is raised **High**, the rest at the check's priority (Low); the
  layered levels are two checks named for who walks them. **The BRCGS grading bands and clause are not quoted.**
- *Money:* the audit's hours (appraisal, L) are not timed here; the findings' worth is the actions' (I) —
  missing inputs are named, nothing is blocked.

## 4. Inputs
Per check: name, where (the area), who (the level), how often, the questions under headings, the score to reach
(optional), the finding line, the problem's priority. Per audit: a level for each question or not applicable, a
note. Findings: ticked to raise (default all). Read from the line: nothing needed.

## 5. Data suitability
A score from the first audit; the trend from the second; the falling signal from three. An audit with an
unanswered question cannot be finished (not applicable is an answer).

## 6. Calculations
As FC-236 §6 (Score). Worked: the 5S case (52/80 = 65%; groups 87.5, 68.8, 43.8, 68.8, 56.3; findings 9; with the
audit before at 58/80 = 72.5% the repeats are 4 and the falls 1; with two questions not applicable 46 of 72 =
63.9%); the GMP case (36/40 = 90%, 3 findings, weakest *Cleaning and hygiene* 62.5%). Independent:
`scripts/knowledge/cases-checks.py` (the record's own worked case from `cases-lean.py`).

## 7. Outputs
Tiles: *Done on time*, *Missed*, *Failed* (a check scoring under its agreed score, if one is agreed), *Latest
score* of the plan since the audit before. The insights: the weakest heading, the falls in a row, repeats, the
first-audit note. The failure-and-hold tile is absent (an audit holds no product).

**The report.** The shape's log paper headed *5S audits* / *Scored audits*: the checks as agreed with their
questions and the scale; compliance by check (was each audit done when due); **each check's audits in order** with
the score, the score by heading and the findings, the repeats marked; the problems raised and where they stand;
the standard note and what is TO CONFIRM; the limits.

## 8. Manufacturing usability
*Start the audit* opens a full-screen sheet on a phone: a heading at a time, each question with its level
buttons (the words of the levels under the number), *Not applicable*, a running score and "12 of 20 answered";
Finish lists the findings with a tick each, then saves. 22 taps for an audit of 20 questions.

## 9. Failure handling
A blank question blocks Finish and says which; a client reads only; an audit struck is gone from the trend and
brought back by Undo; editing the questions later never re-scores an old audit (the answers are kept as asked).

## 10. Integration
FC-236 §10. The findings raise problems on the register (the line, the area as the machine, the question and its
level); the audit's due and missed show on the line's page, report and Needs you. `defs/five-s.ts` and
`defs/scored-audit.ts`.

## 11. Verification
Unit: `figures.test.ts` (the 5S case, the N/A case, the falls, the repeats, the GMP case); acceptance:
`scripts/acceptance/log-shape.mjs` (the scored rows: an audit done on the phone, the sheet's running score equals
the module's, the finding problems on the register, the trend after a second audit, the paper).

**Acceptance criteria.**
1. 65% / 87.5, 68.8, 43.8, 68.8, 56.3 / 9 findings / 4 repeats / 1 fall for the 5S case; 90% / 3 findings / the
   weakest section for the GMP case — `figures.test.ts`; the page for each example — `log-shape.mjs` S4.
2. The audit sheet's running score after each answer equals `shareOfMax`; Finish is held until every question is
   answered or not applicable — `log-shape.mjs` S3.
3. Finishing with findings ticked raises one problem per ticked finding (line, area, question, level; High if it
   came back) and links them to the audit — `log-shape.mjs` S3 (reads the register).
4. A second audit shows the trend (the fall, the weakest heading) and the repeats against the first —
   `log-shape.mjs` S3, S4.
5. The questions are a starting point and no pass score is set; the standard note quotes no clause and lists the
   BRCGS bands and texts as TO CONFIRM — `defs.test.ts`; the page — `log-shape.mjs` S1.
6. The paper carries the audits in order with the score by heading, findings and repeats — `log-shape.mjs` S3.
7. Phone, edit (reword a question, re-add one), delete with Undo, client read-only — `log-shape.mjs` S3.
*Not proved:* two auditors on one area; a customer's checklist.

## 12. Maintainability
Two definition files. A site's own checklist (a customer's, a standard's) is a definition: copy `scored-audit.ts`,
change the sections and the words. FC-121 will measure auditors' agreement on the same answers.
