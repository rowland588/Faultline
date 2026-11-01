# FC-149 — Is / is not: specifying the problem — the specification

**Catalogue:** FC-149 · a document of FC-240 (`knowledge/specs/FC-240-documents.md`) · **Knowledge:** `knowledge/methods/rca/is-is-not.md` (Kepner & Tregoe, *The Rational Manager* 1965 and *The New Rational Manager* 1981 — from knowledge, texts not re-read) · **Asked for:** Rowland, 1 November — all the tools the methods use; the 8D's D2 and the 6M's Analyse name it · **Status:** built on `t8-1`. **Written before the code.**

## 1. Purpose
A sudden problem has many suspects and no facts about where and when. The specification describes it exactly before anyone proposes a cause: what, where, when and how much it IS, and what it could be but IS NOT; what is true only of the IS side; what changed; and each suspected cause tested against every line. *"Leaking seals on 400 g trays, lane 3 of the tray sealer, since Tuesday 13 Oct, 3.2% against 0.3% where it is not (10.7 times). Most probable: the new jaw's heater reads low — it explains every line with no assumption."*

**Scope.** The method as a document at `#/doc/is-is-not`: the problem in one statement and the day it began; the specification as lines (about · IS · IS NOT · how it is known); the same "how much" as two percentages with the packs a shift and a pack's materials; the distinctions; the changes with their days; the possible causes, each tested against the four dimensions; the first check on the floor and what it showed. The sentence, four tiles, three tables, the working, the money. Not here: a significance test of the two percentages (the Analysis tool's, on the readings); the machines' change histories read in (they are not kept as records); a Pareto or stratification to find which stratum first (FC-125, FC-153); the formal customer paper around it (the 8D, FC-150, whose D2 describes the problem the same way).

## 2. Users and scenarios
The quality lead or the line's team leader, with the team at the line, the morning a spike is noticed. (1) Leakers on lane 3 since a new jaw on Monday — the record's worked case. (2) A weight shift on one head. (3) A complaint with only IS lines and opinion — the page says what is wrong with it.

## 3. Method selection
The record's procedure: the specification as a table (what · where · when · extent, IS and IS NOT); distinctions; changes, the one that lines up with the "when" being the lead; every candidate cause tested against the whole specification, a true cause explaining every IS and IS NOT; the most probable verified on the floor before acting. Alternatives (the record): many causes to explore → the fishbone and five whys (FC-146); which stratum first → stratification (FC-153); the customer's formal report → the 8D (FC-150). Unsuitable: a chronic problem with no "since" and many small causes — said in the caveats.

**Established · assumed · chosen.**
- *Established (the record):* four dimensions each asked two ways; distinctions and changes; a cause that needs an extra assumption to explain one line is marked and the one that explains all with none is the most probable; the IS NOT column is where the method lives; a change found is a lead, not a verdict; the method finds the cause of a deviation from a previous good state.
- *Assumed:* the facts typed are facts (each line says how it is known; that is not checkable); the person testing a cause tests it honestly.
- *Chosen:* (1) **needed:** the problem, at least four lines (the dimension, the IS and the IS NOT each given — the record's "a specification with only IS lines is a complaint"), at least one possible cause, the first check; the day it began, the numbers, the distinctions, the changes and the sources are optional and each missing one is named, never blocking. (2) A cause is tested on the **four dimensions** (what, where, when, how much) with three answers: *explains it*, *needs an assumption* (and says which), *cannot*; **one "cannot" rules it out**, the rest are ranked by the **fewest assumptions**, and ties are said as ties — a Faultline reading of the record's rule, not a score. (3) A change is dated against the day the problem began: **lead days = began − changed**; a change after it began (negative) is listed and cannot be the start. (4) The extent is a **ratio of two percentages**, not a test; a difference of zero or less is flagged ("has not found a difference"). (5) The money is **materials only** (see below).
- *Money (MONEY.md §4, FC-149):* the extra bad packs a shift = packs a shift on the IS side × (IS rate − IS NOT rate); materials = those packs × a pack's materials cost (the line's own offered). Contribution lost is the loss count's to say and only where the line cannot make it up — it is not added here. Every input is optional; a missing one is named with where to give it, and the sentence and tables stand without it.

## 4. Inputs
Needed: *The problem, in one statement*, *What it is, and what it is not* (≥ 4 lines: *About*, *It IS*, *It could be, but IS NOT*), *Possible causes* (≥ 1: *Possible cause*), *The first check, and what it will show*. Optional: *The day it began*, *How it is known* on each line, *How often on the IS side* and *on the IS NOT side* (% of packs, 0–100), *Packs made on the IS side a shift*, *What a pack's materials cost* (offered from the line), *Distinctions*, *Changes* (what, where, the day), each cause's four tests and *What must be assumed*, *What the check showed*. Offered: the project's open problem for the statement.

## 5. Data suitability
Listed under *To put right* and never refused: a dimension with no line; an IS with no IS NOT; a line with no source; the IS rate no higher than the IS NOT rate; a change dated after the problem began; changes dated with no day the problem began; a cause tested on no line; a cause needing an assumption that is not said.

## 6. Calculations
ratio = IS% ÷ IS NOT%; bad packs = packs × %/100; excess = packs × (IS% − IS NOT%)/100; materials = excess × £ a pack; lead days = began − changed; verdict = ruled out if any "cannot", else *fits every line* if no assumption, else *fits with n assumptions*. **Independent cases** (`scripts/knowledge/cases-doc.py` I1; each a unit test in `figures.test.ts`): 3.2 ÷ 0.3 = 10.6667; 6,000 × 3.2% = 192 against 18, 174 more; 174 × £0.42 = £73.08 a shift; changes 13 Oct +0, 2 Oct +11, 15 Oct −2 against a start of 13 Oct; causes EEEE fits every line, EXEA ruled out, AAAA fits with four assumptions.

## 7. Outputs
The sentence (only what is filled in, in the order what, where, when, how much, then the ratio and the most probable cause); tiles *Lines* (of 4 questions asked), *IS against IS NOT*, *Changes before it began*, *Causes left* (of those tested); tables *The specification*, *What changed, nearest the start first*, *Causes tested against the lines*; the working (ratio, bad packs, materials); the money sentence with its because, or what to add.

**The report.** The specification on paper as the team leader's page: the band with the status, the tiles, *What it says*, who agreed it and when, the problem, the specification table, the changes table, the causes table with each verdict, the check on the floor, the money or what to add, and *What this does not say* (facts not opinion; an IS-only table is a complaint; a change is a lead not a verdict; no "since", no method; the money is materials only) — from the one module the screen reads, through the shape's paper.

## 8. Manufacturing usability
Six sections in the order the method is worked; a line is a card of four boxes on a phone; Add line; a cause is a card with four one-tap tests; the open register problem and the line's materials cost offered in one tap; Remove with Undo.

## 9. Failure handling
As FC-240 §9: a half-typed line is kept and read for what it has; a blank document says what it needs.

## 10. Integration
A document of tool `doc` on a project or a line: opens from the 6M's and DMAIC's Analyse, the 8D's D2 and the A3's analysis rows (`New` starts it in the project); the line report lists it; the 8D report's D2 shows the project's specification when there is one (`ctx`, read, never copied); it reads the register's open problem and the line's materials cost. Folded into no other record: the 6M's problem statement is still the fishbone's, and this document is its evidence, not a second statement.

## 11. Verification
`doc.test.ts` (three examples through the definition), `figures.test.ts` (the arithmetic against `cases-doc.py` I1), `scripts/acceptance/doc-shape.mjs` (table-driven: the hub, each example typed through the real boxes — including the cause tests by their buttons — the paper read back, the phone, Undo, the line, the project, a client).

**Acceptance criteria.**
1. The lane-3 example typed through the boxes says the sentence above, with *Lines* 4, *IS against IS NOT* 10.7×, *Changes before it began* 2, *Causes left* 2, and the money *"The difference makes 174 more bad packs a shift than the IS NOT rate would — £73.08 a shift in materials at £0.42 a pack."* — `doc.test.ts`, `doc-shape.mjs` step *b*.
2. The ratio, the excess packs, the materials and the lead days equal the independent cases — `figures.test.ts`.
3. A cause with one "cannot" is ruled out; the one that fits with no assumption is named the most probable; a tie is said as a tie — `doc.test.ts`, `figures.test.ts`.
4. The checks name a missing dimension, an IS with no IS NOT, a line with no source, a rate no higher than the comparison, a change after the problem began, and a cause tested on no line — `doc.test.ts` (example 2).
5. A missing money input is named and nothing is blocked — `doc.test.ts`.
6. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
7. It is offered at the 8D's D2 and the 6M's and DMAIC's Analyse, and New starts it in the project — `methodTools.test.ts`, `methods.mjs`.

## 12. Maintainability
Definition `src/tools/doc/defs/is-is-not.ts`; arithmetic `src/tools/doc/figures/isnot.ts`. When the machines keep a change history as records, the *Changes* list gains an offer from it and the *limits* shrink.
