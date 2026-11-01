# FC-140 — Customer needs to CTQs — the specification

**Catalogue:** FC-140 · a document of FC-240 · **Knowledge:** `knowledge/methods/sixsigma/voc-ctq.md` (the CTQ tree as Six Sigma practice, Pyzdek & Keller 2014, George et al. 2005; Kano et al. 1984 for the class — from knowledge, texts not re-read) · **Asked for:** Rowland, 1 November — all tools the methods use (DMAIC's Define) · **Status:** built on `m6-doc`. **Written before the code.**

## 1. Purpose
What the customer says — "easy to open", "doesn't leak" — is not measurable; what the line controls must be. The table takes each need in the customer's words to what drives it and to a **critical-to-quality** characteristic with a unit, a limit and where the limit comes from: *"4 of 4 needs are written as a measure with a limit."* A need with no measure or limit is listed as a gap, and each CTQ says where it goes next.

**Scope.** The CTQ table as a document at `#/doc/voc-ctq`: the customer and where the words came from; a row a need (their words, the driver, the measure, its unit, the kind of limit — between, at least, at most, yes or no — the limits, where the limit comes from, the Kano class); the sentence, five tiles, the CTQ tree, *Where each goes next*. Not here: starting the capability study with the limit carried (it is started from its own page); the control plan (FC-133, not built); QFD (FC-145); money.

## 2. Users and scenarios
The CI lead with a retailer's specification and last year's complaints. (1) A lidded tray: easy to open → peel force 8–15 N; doesn't leak → seal ≥ 1.5 N/15 mm; looks fresh → oxygen ≤ 2%; reseal → zipper present. (2) A depot's needs with two still unmeasurable. (3) A blank table.

## 3. Method selection
The record's procedure: need → drivers → CTQs, each with measure, unit, limit (two-sided, at-least or at-most) and its source; a CTQ without a limit is not a CTQ; needs without a CTQ are gaps; each CTQ to its control (capability study, control plan row). Unsuitable: relating many needs to many characteristics for a new design → QFD.

**Established · assumed · chosen.**
- *Established:* the structure above; the three classes (must-be, performance, attractive) and what each means for the limit (must-be never traded; performance a target to optimise; attractive a decision) — the record, after Kano et al. 1984.
- *Assumed:* the customer's words are kept as said; the limit's source is true.
- *Chosen:* (1) needed: *The customer* and at least one need (its words); everything else optional so a table can start with words only and still lists its gaps. (2) A row **is a CTQ** only when it has a measure and the limit its kind needs (between: both, lower below upper; at least: the lower; at most: the upper; yes or no: none) — said, not defaulted. (3) *Where each goes next* by class and kind — must-be: a capability study (pass-or-fail for yes/no) and a control plan row; performance: a target inside the limit and a capability study; attractive: a design decision; no class: a study, and say the class. (4) Money: **none of its own** (MONEY.md FC-140 "—"); the sentence names the tools whose money follows.

## 4. Inputs
Needed: *The customer*, *Needs and their CTQs* (≥ 1 row, each *What the customer says*). Optional: *Where the words came from*; per need *What drives it*, *What is measured*, *Unit*, *The kind of limit*, *Lower limit*, *Upper limit*, *Where the limit comes from*, *Kano class*.

## 5. Data suitability
A measure with no kind, a kind missing its limit, lower ≥ upper, and a limit with no source are listed.

## 6. Calculations
Counts: needs, CTQs with a limit, gaps, per class; the limit said in its unit. **Independent case** (`cases-doc.py` V1 — the record's lidded tray): four needs, four CTQs with limits, two must-be, one performance, one attractive; limits "8 to 15 N", "at least 1.5 N/15 mm", "at most 2%", "yes" (`limitSaid` is unit-tested against those literals).

## 7. Outputs
The sentence; tiles *Needs*, *CTQs with a limit*, *Must-be*, *Performance*, *Attractive*; tables *The CTQ tree*, *Where each goes next*; the working; the money sentence; four caveats.

**The report.** The CTQ tree and its next steps on paper, with the customer and sources, the agreement, the checks and *What this does not say* (a CTQ without a limit controls nothing; the customer's words kept; must-be never traded; capability is the study's answer) — the screen's module.

## 8. Manufacturing usability
A row a need as a card of nine boxes on a phone; choices as buttons.

## 9. Failure handling
As FC-240 §9.

## 10. Integration
A document of FC-240; opens from DMAIC's Define; the Kano survey's classes are typed here by the person (no automatic copy: a Kano class is a judgement from a survey that may not exist); a CTQ's next step names the capability study and the control plan.

## 11. Verification
`doc.test.ts` (three examples), `figures.test.ts` (limits and next steps), `doc-shape.mjs`.

**Acceptance criteria.**
1. The lidded tray typed through the boxes says *"4 of 4 needs are written as a measure with a limit."*, the tree's limits as the literals above and the next steps by class — `doc.test.ts`; `figures.test.ts`; `doc-shape.mjs` step *b*.
2. A need with no measure is a gap named in the sentence; a limit the wrong way round and a limit with no source are listed — `doc.test.ts`.
3. It says it has no money and why — `doc.test.ts`.
4. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
5. It opens from DMAIC's Define — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/voc-ctq.ts` (it exports `limitSaid` and `nextFor`).
