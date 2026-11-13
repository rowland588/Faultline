# FC-225 — Standard operating procedure with photos — the specification

**Catalogue:** FC-225 · a document of FC-240 · **Knowledge:** `knowledge/methods/people/twi-job-instruction.md` (TWI Job Instruction: Dinero 2005, Graupp & Wrona 2006 — from knowledge, texts not re-read; the breakdown is five to twelve steps) · **Asked for:** Rowland, 1 November — all tools the methods use; steps with a photo each, kept where the work is · **Status:** built on `t8-2` from `m6-doc`. **Written before the code.**

## 1. Purpose
SOPs are long documents nobody reads at the machine. *"Changeover to the 500 g pack: 8 steps, 6 with a photo, 4 steps to take care over (safety, quality and allergen), about 5 min 50 s."*

**Scope.** The procedure as a document at `#/doc/sop`: what the job is, what it is for (set-up, clean, changeover, check), the machine and line, who keeps it, a version and the day it is read again; the steps (one action each, the key point, the care it needs, the seconds); a photo for each step; agreement by the line manager; the page and the paper. Not here: teaching the job and signing people off (FC-223); a one-page lesson (FC-224); a link that makes the procedure the line standard's own page (the standard stays the chart — `lean.standard-work`); changing the machine's settings.

## 2. Users and scenarios
A line manager or setter writing down how a changeover is done. (1) Eight changeover steps, timed, three to take care over, no photos yet. (2) A weekly clean written as thirteen steps, one a paragraph. (3) A blank procedure.

## 3. Method selection
The breakdown rule of TWI Job Instruction: a job is important steps (usually 5–12), each with its key point; a long SOP is not a teaching document (the record's *misuse* list). The procedure is the steps with their pictures at the machine.

**Established · assumed · chosen.**
- *Established:* five to twelve important steps is the breakdown's size; a key point is what makes or breaks a step; a fourteen-page procedure is not read (the record).
- *Assumed:* the seconds typed are what the setter says the step takes; a photo's caption starts with its step number.
- *Chosen:* (1) **twelve steps is the ceiling said**, more is listed as a check, not refused. (2) A photo belongs to a step by **the number its caption starts with** — the app's one mechanism for a photo is a caption, and no new storage is made for it; a photo with no number or a number beyond the steps is listed. (3) The total time is **only given when every step has its seconds**; a partial sum is labelled partial. (4) A step over 120 characters is called a paragraph. (5) Needed: the procedure's name, what it is for, who keeps it, and at least one step. (6) Money: **none of its own** — knowledge/MONEY.md says "—" for FC-225; the stops, rejects and injuries a followed procedure prevents are priced on the problem it fixes.

## 4. Inputs
Needed: *Procedure*; *What it is for*; *Kept by*; *Steps* (≥ 1, each with *Do*). Optional: machine and line (the document's line is offered), version, review day; per step *How, and the key point*, *Take care of* (safety, quality, food safety, allergen), *Seconds*; photos.

## 5. Data suitability
More than twelve steps; a step that is a paragraph; steps without a photo, and care steps without one; photos with no step number or one beyond the steps; a review day that has passed — each listed. A seconds box that is not a whole number or is negative is said beside the box.

## 6. Calculations
Total time = Σ seconds, only when all steps are timed. Photo match = leading integer of the caption (`1 —`, `Step 3:`, `5.`; `2.5 mm` is not a step). Overdue = whole days from the review day to today. **Independent cases** (`scripts/knowledge/cases-teach.py` P1; `teach.test.ts`): 30+45+60+20+90+40+35+30 = 350 s = 5 min 50 s; captions `1 — isolate`, `Step 3: tube seated`, `5. guide`, `2.5 mm gap`, `the panel`, `9 — extra` against eight steps → photos for 1, 3, 5; two unnumbered; one beyond; review 20 October against 1 November is 12 days.

## 7. Outputs
The sentence; tiles *Steps*, *With a photo*, *To take care over*, *Time*, *Review*; the table *The steps* (number, do, key point, care, time, photo yes/no); the working; the money sentence (none, and why); four caveats.

**The report.** Two papers. **At the machine — one sheet** (13 November; `src/tools/doc/floorSheet.ts`, `src/lib/report/floorPaper.ts` — Rowland: *"do we follow the original lean manufacturing principles and visual management? We don't want clutter. We want clarity. That's the design"*): the sheet read where the work is done, laid out as a lean standard work sheet on A4 landscape (the first plain list was refused the same day: *"its just a list … a lean manufacturing sop would not use this"*) — a **title block** (the kind, the job, DRAFT said; boxes for machine and line, version, kept by, read again by, agreed, printed — a box the document does not fill prints empty, to be written in), **what to take care of before starting** (the document's notes that are warnings, in an amber-edged box with the safety cross), the **key** to the care symbols used, the **step table** (No. in a ring · What to do · Key point — how · Why on a work instruction · Picture: the step's photo, or a dashed frame saying *Photo of step n* so a missing picture is seen), the header drawn again on each sheet, and **sign-off boxes** (written by, checked at the machine by, agreed by). Where the steps come from is said once at the foot. No tiles, no checks, no money, no caveats. **Established:** standard work is read at the point of use, one job a sheet, the picture beside the step (TWI; Toyota's standard work sheet). **Chosen:** a warning is a note whose words say warning, caution, danger or attention; where every step comes from one page the foot says it once. And **the record**: the procedure on paper through the shared document paper: status and who agreed it, each section, the steps as a table, the photos with their captions, the reading and *What this does not say* (a procedure on paper is not a procedure followed; photos matched by caption number; seconds are not a timed standard; twelve steps is the ceiling) — the screen's module.

## 8. Manufacturing usability
A step is a card of four boxes; photos are taken or chosen from the phone; it is read at the machine.

## 9. Failure handling
As FC-240 §9; a step with only its key point typed is kept and not counted until it has a "Do".

## 10. Integration
A document of FC-240; found under Documents and a line's Tools; offered at the Act step of PDCA, D7 of 8D, the stage gate's Set up and Kaizen's Standardise (`src/lib/methods.ts`); its line report row.

## 11. Verification
`doc.test.ts` (every example), `teach.test.ts`, `doc-shape.mjs`, `teach.mjs` (the page, the photos, the paper, the phone).

**Acceptance criteria.**
1. The eight-step changeover typed through the boxes says the sentence above, with 4 care steps and 5 min 50 s — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. Photos are matched to steps by caption number exactly as the independent case says — `teach.test.ts`.
3. More than twelve steps, a paragraph step, steps without a photo and an overdue review are listed — `doc.test.ts`.
4. It says it has no money and why — `doc.test.ts`.
8. **At the machine (13 November).** The sheet's model — the job, a draft said, warnings first, steps with key point, care and photo, the source once, only for a procedure and a work instruction — `floorSheet.test.ts`; downloaded from Report ▾ and read back as ONE page with the warning before step 1 and none of the record's tiles, checks or money — `scripts/acceptance/machine-manual.mjs` step 5c.
7. **A step says where it comes from (13 November).** A step has an optional *From* (the document and its page); the steps table prints a *From* column only when a step has one, so a procedure typed by hand prints as before. Luna's `make_procedure` (`src/capabilities/manuals.ts`) makes a procedure from a manual's numbered steps (`lib/manual` `proceduresOf`) — each step the manual's own words, the first sentence the *Do* and the rest the *How*, its *From* the manual and page, the section's warnings kept as notes, who keeps it left for the person — `manual.test.ts`, `manuals.test.ts`; in a browser, with the paper read back — `scripts/acceptance/machine-manual.mjs` step 5c. **Chosen:** what it is for is read from the title's own words (changing → changeover, clean, start/set-up, check) else *Something else*; the care a step needs is never guessed from the manual. **Not established:** that a maker's numbered steps are the right steps for this site — the document is a draft to be read against the machine.
5. The shape's criteria 2–12 hold for it (photos added, captioned, struck and brought back, kept after a reload; the paper; the phone) — `doc-shape.mjs`.
6. What is its own is driven in a browser: the photos matched by caption on the page and the paper, the phone — `teach.mjs`.
7. It opens from the methods that ask for it — `methodTools.test.ts`.

## 12. Maintainability
Definition `src/tools/doc/defs/sop.ts`; arithmetic `src/tools/doc/figures/sop.ts`.
