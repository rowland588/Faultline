# FC-142 — Project charter: problem, goal, scope, team, worth — the specification

**Catalogue:** FC-142 · a document of FC-240 (`knowledge/specs/FC-240-documents.md`) · **Knowledge:** `knowledge/methods/sixsigma/charter.md` (ISO 13053-2:2011; Pyzdek & Keller 2014; George et al. 2005 — from knowledge, texts not read) · **Asked for:** Rowland, 1 November — all the tools the methods use; DMAIC's Define and the Kaizen event's Prepare name it · **Status:** built on `m6-doc`. **Written before the code.**

## 1. Purpose
Projects start without a number to hit. The charter is the one page agreed between the sponsor and the team before work starts: the problem as a number, the goal as the same number with a date, the scope in and out, the team and their time, what closing the gap is worth, the milestones. *"Reduce give-away on Line 3 from 4.1 g a pack to 2 g by 31 March 2027, worth £89,107 a year."* Its test (the record): can the goal be met by accident? With a number and a date it cannot.

**Scope.** The charter as a document at `#/doc/charter`: eleven needed boxes (what is measured, its unit, where it is now, how that was measured, the problem in words, where it must get to, by when, in and out of scope, sponsor, lead), optional constraints, the baseline's readings and spread, the team and their hours, one person's £ an hour, the worth, the milestones; the sentence, five tiles, the team and milestone tables, the money, the agreement. Not here: the charter is not shown on the project's front page; no revision log; the worth is not read from a register problem's money line (typed, with its source named); the SIPOC (FC-139) and CTQs (FC-140) are documents of their own.

## 2. Users and scenarios
The CI lead and the sponsor, at a desk or in a meeting. (1) Give-away on Line 3 — the record's worked case. (2) A yield rise at the slicer with the worth from the loss count's £ a week. (3) A charter drafted with only the problem, saved as a draft that names what is missing.

## 3. Method selection
The record's procedure: problem statement = the number, where, when, how much; goal = the same number's target and date; gap = baseline − target; worth a year = gap × units a year × unit value (the model's row for the measure); the team's time costed against the worth. Alternatives (the record): a few days' event → the Kaizen charter (the same parts, shorter); capital → investment appraisal (FC-191). Unsuitable: a goal with no number — the charter refuses to say its sentence without one.

**Established · assumed · chosen.**
- *Established:* gap = |baseline − target|; worth a year = gap × units × unit value (the record's worked case: (4.1 − 2.0) g × 12,480,000 packs × £3.40/kg = about £89,000); the baseline's interval = x̄ ± t(0.975, n−1)·s/√n (Student); payback = the team's time ÷ the worth a week.
- *Assumed:* the baseline was measured, not remembered (said on the page; not checkable); the typed £ a week came from the tool named beside it.
- *Chosen:* (1) **needed boxes** are the eleven above — the record's parts that a goal cannot do without; the team members, the worth and the milestones are optional (nothing waits on money, `knowledge/MONEY.md`). (2) **52 weeks a year** for £ a week → £ a year (the record's own "× 52"). (3) When both the tool's £ a week and the gap × units × value are given, **the tool's leads** (MONEY.md FC-142: "the problem's £ a week from the tool that measured it, never typed free") and the other is set beside it with a 10% agreement band — a Faultline choice, said on the page. (4) The sponsor and the lead being one person is flagged (a charter is agreed *between* them). (5) The worth line's missing-input sentence is MONEY.md's: *"Measure the problem with its tool to say the worth"*, with what to give.
- *Money (MONEY.md §4, FC-142):* the worth a year, the team's time at one person's rate (the line's wage with on-costs, offered; else typed) and its payback — each optional, a missing one named.

## 4. Inputs
Needed: *What is measured*, *In what unit*, *Where it is now*, *How the baseline was measured*, *The problem, in words*, *Where it must get to*, *By when* (date), *In scope*, *Out of scope*, *Sponsor*, *Lead* (offered: the project's lead). Optional: *Readings behind the baseline* (whole, ≥ 2) and *Their spread* (≥ 0; both or neither), *Constraints*, *Team members* (name, role, hours), *One person's £ an hour* (offered from the line), *What the problem costs a week* + *Which tool or record said so*, *Units a year the gap applies to*, *What one unit of the measure is worth*, *Milestones* (phase, date).

## 5. Data suitability
A goal equal to the baseline says so and its sentence says there is nothing to close; a goal date that has passed is red on its tile and listed; a spread without its readings (or the reverse) is listed; milestones out of order or after the goal date are listed; a £ a week without its source is listed.

## 6. Calculations
gap = |b − t|; share = gap ÷ |b|; interval = b ± t₍.₉₇₅,ₙ₋₁₎·s/√n; worth year = 52·w₍week₎ or gap·V·u; team = Σ hours × rate; payback = team ÷ (worth ÷ 52). **Independent cases** (`scripts/knowledge/cases-doc.py` C1, C2; each a unit test in `figures.test.ts`): give-away 4.10 → 2.00 g: gap 2.10 (51.2%), interval 3.971 to 4.229 (t = 2.262157), worth £89,107.20 a year (£1,713.60 a week), team 60 h × £14.70 = £882.00, paid back in 0.5147 weeks, 150 days from 1 Nov to 31 Mar; yield 91.5 → 94 (gap 2.5), £750 × 52 = £39,000.

## 7. Outputs
The sentence; tiles *The gap*, *Time to go*, *Worth a year*, *The team's time*, *Paid back in* (each *of* what it should be); tables *The team*, *The milestones*; the working (gap, baseline interval, worth, team, payback); the money sentence with its because; four caveats; the closing line.

**The report.** The charter on paper: the band with the status, tiles, *What it says*, who agreed it and when, each section with its boxes, the team and milestone tables, how the worth was worked, the money or what to add, *What this does not say* (a charter says what the project is for, not the cause; a baseline from memory; the worth is only as good as its source; an unagreed charter binds nobody) — from the one module the screen reads.

## 8. Manufacturing usability
Seven sections, eleven needed boxes, each with one line of help and an example; the lead and the line's wage offered in one tap; the phone one column.

## 9. Failure handling
Blank boxes are named; invalid numbers are said beside the box and ignored in the reading; a definition error shows the page's *could not be read* line.

## 10. Integration
A document of tool `doc` on a project or line (FC-240 §10); a DMAIC Define and Kaizen Prepare section row opens it and **New** starts it in the project (`methods.mjs` 4a); the line report lists it; the project's lead and the line's wage are read, never copied.

## 11. Verification
`src/tools/doc/__tests__/doc.test.ts` (the three examples, the agreement, a blank charter), `figures.test.ts` (the arithmetic against `cases-doc.py` C1, C2); `scripts/acceptance/doc-shape.mjs` (the table, typed through the boxes, on paper, the phone, the agreement, Undo, the line, the project, a client).

**Acceptance criteria.**
1. The give-away example typed through the boxes says *"Reduce give-away on Line 3 from 4.1 g a pack to 2 g a pack by 31 Mar 2027, worth £89,107 a year."* with *The gap* 2.1 g a pack, *Time to go* 150 days, *Worth a year* £89,107, *Paid back in* 0.5 weeks — `doc.test.ts`, `figures.test.ts`, `doc-shape.mjs` step *b*.
2. The gap, interval, worth, team cost and payback equal the independent cases — `figures.test.ts`.
3. The money says what to add when the worth or the wage is missing, and never blocks — `doc.test.ts` (draft and example 2); `doc-shape.mjs` step *b*.
4. The checks name a goal equal to the baseline, a past date, a spread without readings, a £ a week without a source, one person as sponsor and lead, milestones out of order — `doc.test.ts`.
5. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
6. It opens from DMAIC's Define and the Kaizen event's Prepare, and New starts it in the project — `methodTools.test.ts`; `methods.mjs` 4a.

## 12. Maintainability
Definition `src/tools/doc/defs/charter.ts`; arithmetic `src/tools/doc/figures/charter.ts`; examples in the definition. The business case taken off on 17 October stays off: the charter's worth is the model's, never a second cost model.
