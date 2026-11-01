# FC-133 — Control plan: what is checked, how, how often, and what if not (a register of cards on the scored shape)

**Catalogue:** FC-133 Control plan (reads FC-132 Process FMEA, FC-236 check logs; HACCP FC-168 is pointed at, not built). **Knowledge:** `quality.control-plan` (`knowledge/methods/quality/control-plan.md`). **Programme:** `docs/METHODS.md` §11 (DMAIC Control, 8D D7). **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the projects"*; and 24 October — *"Improvements fade because nobody owns the checks."* **Status:** built 1 November 2026 (branch `t8-3`).

## 1. Purpose
The risk analysis says what could go wrong; the control plan is the written link between that and the floor's checks — for every characteristic, what is checked, against what, with which gauge, how big a sample, how often, by whom, recorded where and **what is done when it is out**. A check nobody wrote down is done when someone remembers; a check with no reaction is data collection. The sentence it lets one side say to the other: *"Every High risk on the wrapper has a check, three of the four checks are complete, the weight check still has no reaction, and the seal pull is 30 minutes in the plan and 60 in the log."*

**Scope.** A control plan is a register on the scored shape (`/scored/control-plan`, one per line or project): a card per characteristic with step, characteristic, product or process, specification, method and gauge, sample, minutes between checks (or the event that triggers it), minutes one check takes, who, record, **reaction plan**, an optional pointer to the **FMEA failure mode it controls**, an optional pointer to the **check of a check log that does it**, and a tick for a critical control point (which belongs in the HACCP plan). The page says which of six parts each row has not said, which High and Medium risks (and any rated severity 8 or more) of the FMEAs on the same line or project have no row, which linked checks are overdue, failed or due, and where the plan's interval and the log's differ; the money is the checks' labour a shift and the most product a failed check can find. Not in scope: validating limits or gauges (FC-118 gauge R&R is its own tool), the HACCP plan, drawing each characteristic's chart, opening the reaction when a log check fails.

## 2. Users and scenarios
The quality lead at a desk with the FMEA open; the shift lead on a phone checking what the plan says is due. (1) A new wrapper: seal, weight, metal detector, date code — four rows with their reactions. (2) After an FMEA review: *From the FMEA* adds a row for each risk with no check. (3) Audit week: the plan on paper, every row with its reaction and what it controls.

## 3. Method selection
`quality.control-plan`: a row per characteristic with the six parts; due and done as next due = last done + interval (the check-log module's own, `tools/checks/checks.ts`); the plan's interval is held against the linked log check's; the risks come from the FMEA's action priority (`tools/fmea/fmea.ts`).
*Alternatives and when not:* food-safety critical limits → the HACCP plan (the row has a tick); one characteristic's chart → the control chart; the risk analysis itself → the FMEA.

**Established · assumed · chosen.**
*Established:* the control plan's columns and its link to the FMEA (AIAG APQP and Control Plan manual, 2nd ed. 2008; the 2024 Control Plan reference manual — from knowledge, texts not read); that a check has no value without a reaction plan; the sampling arithmetic of the record's worked case (checks a shift = shift minutes ÷ interval; labour = checks × minutes ÷ 60 × £ an hour; product at risk between checks = interval × packs a minute), worked by hand and by a second implementation (`scripts/knowledge/cases-t8-3.py`).
*Assumed:* the team wrote the plan for this line; the minutes of a shift, the wage, the speed and the worth of a held pack are typed (or the line's, offered in one tap); the check log's checks are the checks the plan means.
*Chosen by Faultline (not the standards'):* **a row is complete** when it says against what, how, a sample, how often (or an event), who and the reaction — six parts (the record: "‘every hour’ without a sample size and a gauge named is not a check"); the **risks** are the FMEA's High and Medium modes and any rated severity 8 or more (the FMEA's own caveat); a row's interval, owner or reaction may come from the linked log check; the verdict counts gaps (incomplete rows + High risks with no check + failed and overdue checks); **no expected loss** is stated — the chance of a drift is not known, so the page gives both sides (labour; product at risk) and no more. None of these cuts has been put to Rowland.
*Money (`knowledge/MONEY.md` FC-133):* the plan's checks a shift × minutes × £ an hour (appraisal cost, labour) beside the product at risk between two checks (packs, and pounds where a held pack's worth is given). A missing input is named in one sentence and nothing waits on it.

## 4. Inputs
*Agreed before:* the plan's name and line; per row the parts above; the pointers; the four prices (£ an hour, minutes in a shift, packs a minute, £ a held pack — each optional). A client reads and changes nothing (`can.edit`).

## 5. Data suitability
A row is read only when named. The interval is a positive number of minutes; zero or negative is not an interval. A pointer to an FMEA row or a log check that no longer exists is simply not followed (the row says it has no link).

## 6. Calculations
`src/tools/cplan/cplan.ts`: `readPlanRow` (the six parts, the interval, the linked check's state, the mismatch, the checks and labour a shift, the product at risk), `besideOf` (the FMEAs and logs of the same line or project), `cplanAnalyse`, `fromFmea`. **Independent cases** (`scripts/knowledge/cases-t8-3.py`, unit tests `src/tools/cplan/__tests__/cplan.test.ts`): seal strength every 30 min — 16 checks, £33.3333 of labour, 6,000 packs, £2,400 at 40p; every 15 min — 32 checks, £66.6667, 3,000 packs, £1,200; the four-row plan — 32 checks a shift, £56.6667 (£43.3333 without the weight check's minutes), the most at risk 12,000 packs = £4,800.

## 7. Outputs
The lean page: the band (the verdict — *Complete*, or *n gaps*), five tiles (Characteristics · Complete · Risks with a check · Checks owed · Checks a shift), the sentence, its money lines, *Risks without a check* (High first, with the FMEA they come from), the cards, *What this does not say* and the limits, the closing line.

**The report.** The paper (`src/lib/report/scoredPaper.ts`, the report engine): the band and tiles, the sentence, the register as a table — # · step · characteristic · against · how · sample · how often · who · record · reaction · what it controls and its state — the money lines, *Risks without a check*, what it does not say and the limits. It reads the same module as the screen; the FMEAs and logs beside it are the paper's own history of the line's studies.

## 8. Manufacturing usability
Cards that stack to one column on a phone; the long fields folded (*What it controls, and the check that does it*); controls a thumb's size; *+ From the FMEA — n without a check* makes the first draft in one tap; the prices folded and each offered from the line.

## 9. Failure handling
Nothing named: says what to name. A half-said row: listed with what is unsaid. No FMEA beside: said, nothing invented. A prices input missing: named. A pointer broken: not followed. A client's view: read only. A log check failed or overdue: red and counted.

## 10. Integration
Record: `ToolStudy` of tool `scored`, `agreed.scored` `{ key: 'control-plan', rows, rate?, speed?, packCost?, shiftMin? }` with a `plan` per `ScoredRow` (`PlanData`) — inside the existing JSON, **no migration**. Shows: the Scored registers hub, a line's and a project's Tools (app tool *Control plan*, `/scored/control-plan`), the method pages (DMAIC Control, 8D D7), the directory; the list rows and the paper read the FMEAs and logs of the line (`studyLinks`, `studiesPdf`). Not on the project's Actions page and not in Needs you: a gap is on the plan, not yet a task (limit said).

## 11. Verification
Unit tests `src/tools/cplan/__tests__/cplan.test.ts`; acceptance `scripts/acceptance/control-plan.mjs`; `scored-shape.mjs`, `fmea.mjs` (unchanged); `catalogue.test.ts`, `registry.test.ts`, `rail.test.ts`, `guides.test.ts`, `methodTools.test.ts`.

**Acceptance criteria.**
1. The arithmetic: 16 / 32 checks a shift, £33.33 / £66.67 of labour, 6,000 / 3,000 packs at risk, the four-row plan's 32 checks, £56.67 and 12,000 packs = £4,800 — `cplan.test.ts` and `control-plan.mjs` step 2.
2. The six parts: the worked plan's three complete rows and the weight row with no reaction ("1 gap"); an event can stand for the interval; nothing named says what to name — `cplan.test.ts` and `control-plan.mjs` steps 2–3.
3. A plan made through New control plan, a card typed through the real boxes — "6 to say" falling to Complete as each part is said; the sentence equal to the module's — `control-plan.mjs` step 3.
4. The FMEA beside it: five risks without a check listed High first; a failure mode picked ("1 of 5"); *From the FMEA* adding the rest ("5 of 5"); an FMEA of another line not read — `cplan.test.ts` and `control-plan.mjs` step 4.
5. A check log beside it: the linked check's state read, an overdue check red and counted, the interval promised against the log's; the prices typed in the plan's boxes price it and what is missing is named — `cplan.test.ts` and `control-plan.mjs` step 5.
6. A card taken off and brought back with Undo — `control-plan.mjs` step 6.
7. The paper downloaded and read back: the table, the reactions, the money, what it does not say; the list row and the paper say what the page says — `control-plan.mjs` steps 7–8.
8. Kept after a reload; a client changes nothing; the phone has nothing off the side and its controls are a thumb's size — `control-plan.mjs` step 8.
*Not yet proved:* the six parts, the risk threshold and the verdict's count have not been put to Rowland; the tool has not been used on a real line's plan; a result in a check log does not yet draw the characteristic's chart or open the reaction.

## 12. Maintainability
Code: `src/tools/cplan/cplan.ts` (the reading, the words), `PlanEditor.tsx` (the cards), `src/tools/scored/defs/control-plan.ts` (the definition and worked example), `RegisterEditor.tsx`, the `register` branch of `scored.ts`, `ScoredScreen.tsx` (the beside studies, the list), `scoredPaper.ts`. Left: the failed check opening its reaction and the characteristic's chart; the plan's gaps on the Actions page; the HACCP plan (FC-168); the sample size from the power (FC-105).
