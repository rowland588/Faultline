# FC-141 — Kano analysis — the specification

**Catalogue:** FC-141 · a document of FC-240 · **Knowledge:** `knowledge/methods/sixsigma/voc-ctq.md` (Kano, Seraku, Takahashi & Tsuji 1984, *Attractive quality and must-be quality*, JSQC 14(2) — from knowledge, not re-read); the evaluation table and the coefficients as published guides print them (below) · **Asked for:** Rowland, 1 November — all tools the methods use; the survey typed or tallied by hand, the table a published one · **Status:** built on `m6-doc`. **Written before the code.**

## 1. Purpose
Requirements are treated as equally important. Kano asks each person each requirement twice — how they would feel if it were there, and if it were not — and classes the pair: *must-be* (expected; absent, angry), *performance* (more is better), *attractive* (a delighter), *indifferent*. *"3 requirements classed from 36 answers: 'Reclosable lid' performance, 'Seal does not leak' must-be, 'Easy-peel tab' attractive."*

**Scope.** The Kano survey as a document at `#/doc/kano`: what the questions are about and who was asked; the answers typed one person's pair at a time **or** tallied by hand (how many fell in each class); per requirement the counts, the class, the better and worse coefficients; the published evaluation table shown. Not here: printing or collecting a questionnaire; weighting by customer segment; the Kano class feeding the CTQ table automatically (typed there).

## 2. Users and scenarios
A product or CI lead with a panel's answers. (1) Twelve shoppers on a resealable lid, twelve more on the seal, a hand tally for the peel tab. (2) A tie and too few people. (3) A blank survey.

## 3. Method selection
Kano's paired functional / dysfunctional questions on five answers, classed by the evaluation table, tallied over respondents; the most frequent class classes the requirement and the split is reported (the record). Unsuitable: one interview (an anecdote — a dozen is the usual floor, said); relating many needs to many characteristics (QFD).

**Established · assumed · chosen.**
- *Established:* the five answers (I like it that way · It must be that way · I am neutral · I can live with it that way · I dislike it that way) and the **5 × 5 evaluation table** — rows the functional answer, columns the dysfunctional: *like*: Q A A A O; *must-be*, *neutral*, *live with*: R I I I M; *dislike*: R R R R Q (A attractive, O one-dimensional/performance, M must-be, I indifferent, R reverse, Q questionable) — **checked on 1 November against several published guides' descriptions (search results; the page fetches were blocked); Kano et al. 1984, Berger et al. 1993 and Sauerwein et al. 1996 themselves were not read** — said in `limits` and `knowledge/GAPS.md`. The coefficients **better = (A + O) ÷ (A + O + M + I)** and **worse = −(O + M) ÷ (A + O + M + I)**, reverse and questionable left out (as the guides give them).
- *Assumed:* each pair is one person's honest answer to both questions; requirements are spelt the same each time (the same words are the same requirement).
- *Chosen:* (1) the class of a requirement is the strictly most frequent of A, O, M, I; **a tie is reported as a tie, not broken** — the order some guides break ties in (M > O > A > I) is secondhand and conflicting across sources, so it is not used. (2) R and Q are counted and shown, never classed; any Q is listed (the question may not have been understood). (3) A dozen answers is the floor (the record's "a dozen respondents is the floor"); fewer is listed, not refused. (4) Typed pairs and a hand tally for the same requirement **add**. (5) Needed: *What the questions are about* and answers or a tally (the shape's `alt`). (6) Money: **none of its own** (MONEY.md FC-141 "—").

## 4. Inputs
Needed: *What the questions are about*; *Answers* (≥ 1 row: *Requirement*, *If it were there…*, *If it were not there…*, optional *Who*) or *Tallies* (*Requirement* and counts *Attractive*, *Performance*, *Must-be*, *Indifferent*, *Reverse*, *Questionable* — whole, ≥ 0). Optional: *Who was asked, and how*.

## 5. Data suitability
Fewer than twelve answers for a requirement, any questionable answer, a tie — each listed. Counts that are negative are read as zero; a fraction is rounded.

## 6. Calculations
Class = table[functional][dysfunctional]; tally; mode among M, O, A, I; coefficients. **Independent cases** (`cases-doc.py` K1; unit tests in `figures.test.ts`): twelve pairs (5 like/dislike, 2 like/neutral, 2 must-be/dislike, 1 neutral/neutral, 1 like/like, 1 dislike/like) give O 5, A 2, M 2, I 1, Q 1, R 1 → performance, better 70.0%, worse −70.0%; twelve must-be → better 0%, worse −100%; A 7, O 3, I 2 → attractive, better 83.3%, worse −25.0%; A 6 and M 6 → tied.

## 7. Outputs
The sentence; tiles *Requirements*, *Answers*, *Must-be*, *Performance*, *Attractive*, *Tied*; the table *The survey by requirement* (counts, class, better, worse) and the reference *How each pair is classed (Kano's evaluation table)*; the working; the money sentence; four caveats.

**The report.** The survey's reading on paper with both tables, who was asked, the agreement and *What this does not say* (an anecdote is not a survey; the class is the commonest in the table's categories, a tie a tie; better and worse are indices, not shares of customers; needs move) — the screen's module.

## 8. Manufacturing usability
A row an answer is a card of four boxes; choices as buttons; the hand tally is six number boxes.

## 9. Failure handling
As FC-240 §9; an answer with a missing half is kept and not counted.

## 10. Integration
A document of FC-240; opens from DMAIC's Define; its classes are what the CTQ table's *Kano class* box records; the must-be requirements become limits there.

## 11. Verification
`doc.test.ts`, `figures.test.ts` (every cell of the table, the corners, the tallies, the coefficients, a tie), `doc-shape.mjs`.

**Acceptance criteria.**
1. The three requirements typed and tallied through the boxes say the sentence above, with 36 answers and the survey table's rows (70% / −70%, 0% / −100%, 83% / −25%) — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. Every cell of the evaluation table equals the published one — `figures.test.ts`.
3. A tie is reported as a tie; too few answers and a questionable answer are listed — `doc.test.ts`.
4. It says it has no money and why — `doc.test.ts`.
5. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
6. It opens from DMAIC's Define — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/kano.ts`; arithmetic `src/tools/doc/figures/kano.ts` (a table cell is changed only to match a source).
