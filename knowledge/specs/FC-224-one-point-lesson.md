# FC-224 — One-point lesson — the specification

**Catalogue:** FC-224 · a document of FC-240 · **Knowledge:** `knowledge/methods/people/one-point-lesson.md` (TPM practice: Suzuki 1994, JIPM — from knowledge, texts not re-read) · **Asked for:** Rowland, 1 November — all tools the methods use; one page, mostly pictures, with a grid of who has been taught · **Status:** built on `t8-2` from `m6-doc`. **Written before the code.** Line Talk, which could already write one on request, is unchanged.

## 1. Purpose
A fix needs sharing with every shift today. *"Film guide set proud creases the splice: trouble case, taught to 11 of 12 on 2 shifts (92%), 1 to go; offered to Line 1 and Line 7."*

**Scope.** The lesson as a document at `#/doc/one-point-lesson`: its title, kind (basic knowledge, trouble case, improvement case), the machine, the one point, why, what to check and when, the minutes it takes, who wrote it and when, whether a trouble has come back, the lines it is offered to; the right-way and wrong-way photos; the people who should know with their shift and the day each was taught; coverage overall and by shift; the page and the paper. Not here: Line Talk writing the words from what is said (it stays at `#/talk`); sending the lesson to another line's own record; testing that people remember it.

## 2. Users and scenarios
A setter or team leader who has found a fix. (1) The film-guide trouble case taught to 11 of 12 on two shifts, a week and more after it was written. (2) A trouble that came back after the lesson, with a point that is really a procedure, taught to nobody. (3) A blank lesson.

## 3. Method selection
The one-point lesson of TPM autonomous maintenance: one page — title, the one point, the picture with right and wrong, the reason, the kind, author and date, and a grid where each person taught is marked; coverage = taught ÷ should know, by shift; a lesson below full coverage a week after is the team leader's action (the record).

**Established · assumed · chosen.**
- *Established:* the three kinds; one point (three points is a procedure); five to ten minutes at the machine; coverage is people taught ÷ people who should know, by shift; a trouble case that recurs is a cause not found, not a lesson to re-teach; a sheet never taught is no proof (the record).
- *Assumed:* the day against a person is the day they were taught at the machine.
- *Chosen:* (1) the **week** is seven days after the day written; (2) a point over **240 characters** is called more than one point, and minutes over **10** is called long — listed, never refused; (3) the right and wrong pictures are two photo boxes of the shape (kept with the document, captions free) and **no picture** is listed, not refused; (4) a blank shift is *Everyone*; (5) needed: the title, the kind, the one point, who wrote it, the day, and at least one person; (6) money: **none of its own** — knowledge/MONEY.md says "—" for FC-224; the trouble it prevents is priced on its problem.

## 4. Inputs
Needed: *Lesson*; *What kind*; *The one point*; *Written by*; *Written on*; *The people* (≥ 1, each with a name). Optional: machine or task, why, what to check, minutes, whether the trouble came back (asked of a trouble case), offered to; photos; shift and taught-on day per person.

## 5. Data suitability
A point over 240 characters; minutes over ten; a person taught before the lesson was written or on a day to come; people not taught a week after; a trouble that has come back; no picture, or a trouble case with no wrong-way picture — each listed.

## 6. Calculations
Coverage = taught ÷ total, overall and per shift (a person with a day is taught). **Independent cases** (`scripts/knowledge/cases-teach.py` O1; `teach.test.ts`): six on days and five of six on nights → 11 of 12 = 91.7% (92%), days 100%, nights 83%; written 20 October, 12 days before 1 November, so past the week.

## 7. Outputs
The sentence; tiles *Kind*, *Taught*, *Coverage*, *Pictures*, *Last taught*, *Offered to*; the table *Who has been taught* (by shift); the working; the money sentence (none, and why); four caveats.

**The report.** The lesson on paper through the shared document paper: status, the lesson, the photos with captions, the grid as a table, the reading and *What this does not say* (a sheet never taught teaches nobody; a lesson that contradicts the standard is wrong; a recurring trouble is a cause not found; coverage is not memory) — the screen's module.

## 8. Manufacturing usability
Photos are taken or chosen on the phone at the machine; the people are a list of cards with a date picker.

## 9. Failure handling
As FC-240 §9; a person with no name is kept and counted nowhere.

## 10. Integration
A document of FC-240; offered at PDCA's Standardise, Kaizen's Standardise and Act steps (`src/lib/methods.ts`); linked from the job breakdown and the SOP.

## 11. Verification
`doc.test.ts` (every example), `teach.test.ts`, `doc-shape.mjs`, `teach.mjs`.

**Acceptance criteria.**
1. The trouble-case example typed through the boxes says the sentence above, with the by-shift table (6 of 6, 5 of 6) — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. Coverage overall and by shift equals the independent case — `teach.test.ts`.
3. A recurring trouble, a long point, a long lesson and people not taught after a week are listed; no picture is listed — `doc.test.ts`, `teach.test.ts`.
4. It says it has no money and why — `doc.test.ts`.
5. The shape's criteria 2–12 hold for it (photos added, kept after a reload, on the paper; the phone) — `doc-shape.mjs`.
6. What is its own is driven in a browser: the grid by shift, the pictures counted, the last person taught, the paper, the phone — `teach.mjs`.
7. It opens from the methods that ask for it — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/one-point-lesson.ts`; arithmetic `src/tools/doc/figures/opl.ts`.
