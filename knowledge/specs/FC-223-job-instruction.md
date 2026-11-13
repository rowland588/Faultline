# FC-223 — TWI job instruction — the breakdown and four-step teaching — the specification

**Catalogue:** FC-223 · a document of FC-240 · **Knowledge:** `knowledge/methods/people/twi-job-instruction.md` (Training Within Industry's Job Instruction as Dinero 2005 and Graupp & Wrona 2006 present it — from knowledge, texts not re-read) · **Asked for:** Rowland, 1 November — all tools the methods use; the breakdown, the four steps and the sign-off by name and day · **Status:** built on `t8-2` from `m6-doc`. **Written before the code.**

## 1. Purpose
People are trained by sitting next to someone and do the work differently. *"Splice the film reel: 6 steps, 9 key points (2 steps with a safety point); 9 trained, 6 signed off (67%), 3 to try again."*

**Scope.** The job breakdown as a document at `#/doc/job-instruction`: the job, the standard it is taught to, the instructor and who helps afterwards; the breakdown sheet (important steps, each with key points and a reason for each); the learners, each with the day they were taught, the try-out (not yet · to try again · signed off), the day signed off and the 30-day re-check; the paid time good teaching saves, when the hours are given; the page and the paper. Not here: writing the entries into the skills matrix (FC-222 keeps its own levels — said on the page); a training timetable from the matrix's gaps; the line standard itself; Line Talk drafting the key points.

## 2. Users and scenarios
A supervisor or setter who teaches a job. (1) The wrapper's film splice: six steps, nine key points, nine people taught, six signed off after the try-out, three to try again, one past its 30-day re-check. (2) A breakdown that is a procedure (thirteen steps, four key points a step, no reasons). (3) A blank breakdown.

## 3. Method selection
TWI Job Instruction: the breakdown sheet of important steps, key points and reasons (five to twelve steps, one to three key points each), and the four steps — prepare, present, try out, follow up — with the try-out as the proof (the record).

**Established · assumed · chosen.**
- *Established:* the sheet is important steps, key points and reasons; usually 5–12 steps and 1–3 key points a step; a learner is signed off after the try-out; a re-check at 30 days; measures are trained, signed off ÷ trained, days to sign-off and re-checks passed (the record). The method is from knowledge; the original manual and the two workbooks were not re-read (`knowledge/GAPS.md`).
- *Assumed:* the instructor is someone who does the job well; the days are the days it happened.
- *Chosen:* (1) several key points or reasons in one box are separated by **semicolons or new lines** (a comma is part of a point), and a step is checked for **a reason for each key point**; (2) signed off needs a day, and a sign-off before the teaching day or with no day is listed; (3) the **30-day re-check** is booked from the sign-off day and is overdue once that day has passed and the re-check is not marked passed; (4) days to sign-off is the mean over learners with both days; (5) the money is the record's one cause — **paid hours saved = learners taught × (hours to standard without − with) × £ an hour** (knowledge/MONEY.md, FC-223 — time to standard with and without, × rate), all typed, the wage offered from the line, a missing input named; nothing is guessed and nothing is withheld for it; (6) needed: the job, the instructor and at least one step.

## 4. Inputs
Needed: *The job*; *Instructor*; *Important steps* (≥ 1, each with *Important step*). Optional: machine and line, the standard, why it needs teaching, who helps afterwards; per step key points, reasons, whether a key point is about safety; learners with taught on, try-out, signed off on, re-check; hours with and without; £ an hour.

## 5. Data suitability
Fewer than five or more than twelve steps; a step with no key point, more than three, or fewer reasons than key points; a learner signed off with no teaching day or no sign-off day, signed off before taught, or taught in the future; hours with that are not fewer than without — each listed (the money is then left out). Never refused.

## 6. Calculations
Rate = signed off ÷ trained; days = mean (signed − taught); re-check due = signed + 30 days; saved = trained × (without − with); money = saved × rate. **Independent cases** (`scripts/knowledge/cases-teach.py` J1; `teach.test.ts`): 9 trained, 6 signed off = 66.7% (67%), 3 to try again; the days 1, 1, 2, 2, 3, 5 give a mean of 14 ÷ 6 = 2.33; signed off on 25 September is due on 25 October, 7 days overdue on 1 November; 9 × (14 − 8) = 54 h × £14.70 = £793.80.

## 7. Outputs
The sentence; tiles *Steps*, *Key points*, *Trained*, *Signed off*, *To sign off*, *Days to sign off*, *Re-checks*; the tables *The breakdown* and *Who has been taught*; the working; the money sentence or the input missing; five caveats.

**The report.** The breakdown sheet on paper through the shared document paper: status and who agreed it, the job, the sheet (step · key points · reasons), who has been taught with their days and re-check, the reading and *What this does not say* (signing off at the presentation signs off nothing; the breakdown is not the standard; hours are as typed, not a trial; the matrix is not written to) — the screen's module.

## 8. Manufacturing usability
A step is a card of four boxes and a learner a card of five; dates are the phone's date pickers.

## 9. Failure handling
As FC-240 §9; a learner row with only a name is kept and counted nowhere until taught.

## 10. Integration
A document of FC-240; offered at the stage gate's Set up, Kaizen's Standardise, PDCA's Act and 8D's D7 (`src/lib/methods.ts`); the line report row; links to the SOP and the one-point lesson.

## 11. Verification
`doc.test.ts` (every example), `teach.test.ts`, `doc-shape.mjs`, `teach.mjs`.

**Acceptance criteria.**
1. The film-splice example typed through the boxes says the sentence above, with 9 key points, 6 of 9 signed off, 2.3 days and 5 re-checks (1 overdue) — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. Rate, days, the 30-day re-check and the saved hours equal the independent case — `teach.test.ts`.
3. Too many steps, a key point without a reason, a sign-off with no day and hours that are not fewer are listed — `doc.test.ts`.
4. The money is the typed hours × the wage, or names the one input missing — `doc.test.ts`.
5. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
6. What is its own is driven in a browser: the sign-off with no day caught, the money and the paper, the phone — `teach.mjs`.
8. **At the machine (13 November).** The task instruction has the same one-sheet paper as the procedure (`floorSheet.ts`, kind *Work instruction*): each important step big and numbered, its key points under it and the reason for each (*Why: …*), a safety key point said in words — `floorSheet.test.ts`.
7. **A step says where it comes from (13 November).** A step has an optional *From* (the document and its page), printed as a column of the breakdown only when a step has one. Luna's `make_procedure` with `as: instruction` makes the breakdown from a manual's numbered steps: the step's first sentence the important step, its further sentences the key points, **no reason supplied** (the manual gives none — the document's own check asks for them), the standard it is taught to the manual and its page — `manuals.test.ts`.
7. It opens from the methods that ask for it — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/job-instruction.ts`; arithmetic `src/tools/doc/figures/ji.ts`.
