# FC-198 — Tiered daily meeting — the day's update and its paper — the specification

**Catalogue:** FC-198 · a document of FC-240 · **Knowledge:** `knowledge/methods/visual/daily-management.md` (tiered meetings on safety, quality, delivery, cost and people; Mann 2015, *Creating a Lean Culture* — from knowledge, text not re-read) · **Asked for:** Rowland, 1 November — all tools the methods use; "what went wrong yesterday, who is fixing it, by when" · **Status:** built on `t8-2` from `m6-doc`; **partial** (below). **Written before the code.** The stage-gate project's day (`src/lib/day.ts`, `src/lib/huddle.ts`, `DayScreen`) is unchanged and stays what it was.

## 1. Purpose
The meeting reports without acting. *"Tier 1 · Line 3 packing · 30 Oct: 5 letters read, 2 off target (Delivery and Cost), 2 actions raised, every red with an action, 1 escalated (1 waiting for an answer)."*

**Scope.** One meeting's record as a document at `#/doc/daily-meeting`: the tier (line, area, site), the day, the line or area, who led it and who was there, how long it ran; yesterday by letter — safety, quality, delivery, cost, people — each on or off target, in words and, where there is a number, the actual against its target (at least / at most); the actions raised (each for a letter, an action or the reason there is none, with a name and a day); what was escalated to the tier above and whether it was answered; the actions closed and still open; the page and the paper, agreed ("closed") by the leader. Not here: reading the letters from the loss count, the register and the actions (the figures are typed); the hour-by-hour board (FC-203) and the SQDCP board (FC-197); meetings held ÷ scheduled across days; the stage-gate project's own day (it has one).

## 2. Users and scenarios
A team leader running the shift-start meeting at the line board, and the area manager above them. (1) The record's shift — 3,535 of 3,840 and a failed sealer jaw: delivery and cost red, each answered, the jaw escalated and still waiting. (2) A green that is really a red, a red with no action, an action with no name, a tier 3 meeting that "escalates". (3) A blank meeting.

## 3. Method selection
Tiered daily management: a ten-minute meeting at the board — the line's (tier 1), the area's (tier 2), the site's (tier 3) — on safety, quality, delivery, cost and people, each with yesterday's state in a colour and a word, the actions raised and the ones closed; what the line cannot fix goes up the same morning and the tier above answers the same day (the record).

**Established · assumed · chosen.**
- *Established:* the three tiers; the five letters; every red gets an action or a reason why not; escalation without a reply teaches the floor not to escalate; about ten minutes; the state in a word beside its colour (the record). From knowledge: Mann 2015 and Liker & Convis 2012 were not re-read (`knowledge/GAPS.md`).
- *Assumed:* the figures typed are yesterday's, from the records.
- *Chosen:* (1) **a letter is red or green as the team says it**; when an actual, a target and *at least / at most* are all given, the rule is checked and a colour that contradicts it is listed (the thresholds — 95% of plan for delivery, zero accidents — are the team's targets, typed, never built in); (2) **a red is answered** when the meeting raised an action for that letter or wrote the reason there is none; (3) **an escalation waits** whole days from raised to answered, or to today; one day or more is listed (the record: the same day); (4) **minutes over 15** are listed (about ten is the record's); (5) tier 3 has nothing above it — an escalation there is listed; (6) one row a letter, a repeat listed; (7) the leader **closes** the meeting (the shape's sign-off, worded *Closed* — locked, with who and when); (8) needed: the tier, the day, who led it and at least one letter; (9) money: the cost letter's actual, in pounds, against its limit — all typed; a missing figure is named and nothing waits on it (knowledge/MONEY.md, FC-198 — the day's £ from the records it reads, here typed).

## 4. Inputs
Needed: *Which tier*; *The day of the meeting*; *Led by*; *The letters* (≥ 1, each with *Letter* and *Yesterday was*). Optional: line or area (the document's line is offered), who was there, how long; per letter what happened, actual, target, at least / at most; actions (letter, action or reason, what, who, by when); actions closed and still open; escalations (what, raised on, answered, answered on, the answer).

## 5. Data suitability
A colour that contradicts the typed figures; a red with no action or reason; an action with no name or no day; a letter twice; an escalation unanswered a day or more, answered with no day, or at tier 3; a meeting over 15 minutes; a meeting day in the future — each listed. Never refused.

## 6. Calculations
Rule = actual ≥ target (at least) or ≤ target (at most). Reds answered = reds with an action or reason ÷ reds. Wait = whole days raised → answered or today. **Independent cases** (`scripts/knowledge/cases-teach.py` M1; `teach.test.ts`): the record's shift made 3,535 of 3,840 (92.1%), a gap of 305 packs of which the jaw hour (180) is 59.0%; 95% of plan is 3,648, which 3,535 misses; 410 against at least 456 is not met; £1,250 against at most £1,000 is £250 over; raised 30 October and unanswered at 1 November has waited 2 days.

## 7. Outputs
The sentence; tiles *Letters read*, *Off target*, *Actions raised*, *Reds answered*, *Escalated*, *Closed since last*; the tables *Yesterday, by letter* (with the rule's result), *The actions raised* and *Escalated*; the working; the money sentence or the figure missing; four caveats.

**The report.** The day's update on paper through the shared document paper: status and who closed it, the meeting, the letters as a table, the actions with their owners and days, what went up and its answer, the reading and *What this does not say* (the figures are typed and may disagree with the records; the test is the actions, not the colours; the colour is the team's call; the hour board and adherence are not here) — the screen's module.

## 8. Manufacturing usability
A letter is a card of six boxes with 44 px choices; read on a phone at the board.

## 9. Failure handling
As FC-240 §9; a letter with no status is kept and counted nowhere.

## 10. Integration
A document of FC-240, a line's or a project's Documents; offered where the methods ask for a daily rhythm (`src/lib/methods.ts`); the line report's row.

## 11. Verification
`doc.test.ts` (every example), `teach.test.ts`, `doc-shape.mjs`, `teach.mjs`.

**Acceptance criteria.**
1. The tier 1 example typed through the boxes says the sentence above, with the letters table (the rule met, met, not met), the money line and the escalation waiting — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. The rule, the 95% of plan miss, the £ over and the wait equal the independent case — `teach.test.ts`.
3. A green that contradicts its figures, a red with no action, an action with no name, a letter twice, an unanswered escalation, tier 3 escalating and a long meeting are listed — `doc.test.ts`, `teach.test.ts`.
4. The cost letter's pounds are said, or the missing figure is named — `doc.test.ts`.
5. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
6. What is its own is driven in a browser: a red answered by raising an action for its letter, an escalation answered with its day, the paper, the phone — `teach.mjs`.
7. It opens from the methods that ask for it — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/daily-meeting.ts`; arithmetic `src/tools/doc/figures/meeting.ts`.
