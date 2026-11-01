# FC-222 — Skills matrix and cover: the specification

**Catalogue:** FC-222 (neighbours: FC-184 crewing a shift and FC-223 TWI job instruction, both not built) · **Knowledge:** `people.skills-matrix` (full, practice) · **Asked for:** the catalogue's problem, "one absence stops a line because only one person can run the machine"; the stage gate's *Set up* section lists it (`docs/METHODS.md` §7, §11 — Rowland, 1 November: "I want all tools made that get used in the projects") · **Status:** built on `m6-stagegate` as a scored register's matrix; **written before the code.**

## 1. Purpose
Say who can run what, at what level, and where one absence is a stopped line — the sentence the shift manager can say to the plant manager that they could not say before: *"Wrapper set-up and labeller set-up on nights each rest on Eli — a single point of cover; the line stops when he is off."* It is the people half of operational readiness (FC-082: "training done without a sign-off on the station is attendance, not readiness").

**Scope.** People down the side, up to the tasks that matter across (a machine's set-up, a CCP check, a clean), each cell a level — **0 not trained · I learning · L can do it with help · U can do it alone to the standard · O can teach it** — and the shift each person works. It gives, by task and shift, the **cover** (people at U or O), the gap against the cover wanted, the **single points** (exactly one person where more are wanted) and the tasks with **nobody**, the tasks with cover but **no teacher**, each person's **versatility**, the share of task × shift cells at their cover wanted, the **training to do first** (ranked), a sentence, a picture-as-table and a paper. **Not here, and said on the page:** the date a level was reached and who signed it (the record's inputs) — not kept; ageing a level that has not been re-checked; leave, absence and the crew needed per shift (FC-184); the TWI breakdown that trains to the standard (FC-223); the training plan as actions on the project; any link to the line standard's "who stands where".

## 2. Users and scenarios
A team leader or the project's site lead at a desk or in a meeting, typing the few tasks that matter and the people on the shifts once, then reading the gaps. (1) *The record's worked case:* three tasks, days and nights, target 3 — wrapper set-up days 3 / nights 1, labeller set-up days 2 / nights 1, CCP cook check days 4 / nights 2: two single points, both on nights, both the first rows of the training plan. (2) *No shifts typed:* cover across everyone, with the warning that this hides a night gap. (3) *A CCP check nobody can run alone:* red, first. (4) *A task wanted by one person:* never called a single point.

## 3. Method selection
The skills (training/flexibility) matrix of Training Within Industry and lean practice: the level per person per task, read by column for cover and by row for versatility (`knowledge/methods/people/skills-matrix.md`). Alternatives from the record: the TWI job instruction (teaching to the standard — FC-223), the one-point lesson, the crew plan (FC-184), the standard work (FC-007). It refuses to rank people: a matrix that embarrasses people empties itself, so it is read for the gaps.

**Established · assumed · chosen.**
- *Established:* the I-L-U-O quarter-circle levels and cover as the people at the standard on a shift (Liker & Meier 2007, *Toyota Talent*; Training Within Industry — from knowledge, texts not re-read); cover = people at U or O; gap = cover wanted − cover where positive; a single point where cover is 1; a task with cover and no teacher cannot grow its cover; cover is counted per shift because a count across shifts hides the night gap (the record). Independent case: `scripts/knowledge/cases-projects-people-ergo-sust.py` "Skills matrix" (a second implementation, `python3 -I`): target 3 — wrapper days 3, nights 1; labeller days 2, nights 1; CCP days 4, nights 2.
- *Assumed:* a level is the team's judgement signed by whoever taught it; the shift is as typed (case and spacing do not make a second shift); a person with no shift typed, once others have one, is in a group of their own ("No shift given").
- *Chosen (the builder, 1 November — recorded for the owner to overrule):* **the cover wanted starts at 3** (the record's "often 3 — one running, one cover, one on leave or training"), a starting point said on the box, changed per matrix and per task; **a single point needs more than one wanted** (a task wanted by one is that person's choice, not a risk); **the verdict** is red when a task and shift has nobody, amber for single points and cells below the cover wanted, green only when every cell is at its cover wanted; **the training is ranked** by how much the task matters (1–5, the task's own number, blank is 1), then how far below, then the order typed; **the level words** on screen are "Not trained, Learning, Can do it with help, Can do it alone to the standard, Can teach it" with the letters I L U O; **up to the tasks that matter** — no limit is imposed, the page says a matrix of every job drowns them.
- *Money (`knowledge/MONEY.md`, row FC-222 — "cover hours where a skill is single-held × rate (P)"; T for the stopped line):* each single point or nobody is a shift the line cannot run when that person is off; a shift of the line not making costs what the person types or the line's own (its day's margin shared by its shifts — a choice, offered by one tap, `lib/lineLoss lineDay`); the absence rate is **not held**, so no yearly figure is made. Missing: *"Give what a shift of the line not making costs …"* — named, never blocking.

## 4. Inputs
*Cover wanted* (people, 1–20, starts at 3, the matrix's own); *What a shift of the line not making costs, £* (optional, typed or the line's); per task: **name**, **people wanted** (1–20, blank takes the matrix's), **how much it matters** (1–5, blank 1); per person: **name**, **shift** (text; suggestions from the shifts already typed), a **level** per task (— not marked, 0, I, L, U, O). Nothing is read from the line standard.

## 5. Data suitability
A task, a person, a level out of 0–4, a cover wanted or a task's need outside 1–20, a weight outside 1–5 are refused in words and nothing is worked out on them. An unnamed row or column is not counted. No shift typed is said (cover across everyone). Someone with nothing marked is named. A matrix with one task and one person is a matrix.

## 6. Calculations
Per task and shift: cover = people there at level ≥ 3; gap = max(0, wanted − cover); single = cover is 1 and wanted > 1; nobody = cover 0. Teachers = people at level 4 (all shifts); no teacher = cover somewhere and no one at 4. Versatility = tasks at ≥ 3. At the cover wanted = cells with gap 0. Ranking: weight desc, gap desc, then the order typed. Independent case P1 = the python case above (six cells; singles: wrapper nights, labeller nights; at target: wrapper days and CCP days = 2 of 6; teachers 1 each); each is a unit test in `skills/__tests__/skills.test.ts`.

## 7. Outputs
Verdict: *"2 single points of cover"* (or *"1 task with nobody"*, *"3 cells below the target"*, *"Cover at target"*); the sentence (*"Wrapper set-up on Nights (Eli) and Labeller set-up on Nights (Eli) rest on one person — a single point of cover: the line stops when that person is off. 2 other cells are below the cover wanted: …"*); tiles *Single points · Nobody · At the cover wanted · Can teach it*; **Training to do first** (a numbered list), **Who can do how much**, **Nothing marked yet**; the money line; what it does not say; the closing line (*"Train first: … Read it for the gaps, not for the people."*).

**The report.** The study paper (`lib/studiesPdf`, the scored paper): the band with the verdict and the tiles; the sentence; **The skills matrix — who can do what**, a table with the level letter in every cell, each person's *can do alone*, and under it the cover on each shift, the cover wanted and the teachers; the money; the training to do first; who can do how much; what it does not say (the page's own caveats and limits); the closing line. It reads the same module as the screen; nothing missing is made up.

## 8. Manufacturing usability
Desk or meeting more than a phone: a table with a level selector in each cell, scrolling sideways inside its own frame on a phone (nothing off the side of the page, 44 px controls); the shift is typed once per person with suggestions; a removal is undone in one tap; a client reads and changes nothing.

## 9. Failure handling
Every refusal above in words under the figures, the result absent until the matrix works ("Add at least one task …"); a missing cost named, the answer standing; a record from another build opens as it was.

## 10. Integration
Record: a study of tool `scored`, key `skills` (`agreed.scored`: `rows` the people with `shift` and `scores` by task, `criteria` the tasks with `need` and `weight`, `target`, `dayCost`) — no new noun (BLUEPRINT §2 unchanged), no migration (`studies.agreed` is jsonb). Shown wherever a scored register shows: the Scored registers hub, a line's Tools and a project's Tools, the stage gate's *Set up* section (`src/project/method/methodTools`), the list on paper. On the project's method page it opens at `/scored/skills`. Not changed: the line standard, the crew plan, any stage-gate paper.

## 11. Verification
`skills/__tests__/skills.test.ts` (the python case; the sentence, tiles, lists, money and table; no shift; shifts grouped; a task's own need; nobody red and ranked by weight; no teacher; untrained; every refusal); `scripts/acceptance/skills-matrix.mjs` (a matrix made through the sheet and typed through the real boxes — the record's seven people and three tasks — the page's sentence, tiles, cover rows and training list equal the module's and the python literals; a level moving a single point; kept after a reload; the money typed and the line's offered; a removal undone; the paper downloaded and read back; the phone; a client changing nothing; the stage gate's Set up section opening it); `scored-shape.mjs` (the shape unchanged for the other registers).

**Acceptance criteria.**
1. Cover per task and shift, the single points, the gaps and their order, the teachers and each person's versatility equal the independent case — `skills.test.ts` ("cover, by task and shift"); `skills-matrix.mjs` step *b* (typed through the real boxes).
2. The verdict, sentence, tiles, lists, closing line and money are the module's, on the page and on the paper — `skills.test.ts` ("what it says"); `skills-matrix.mjs` steps *b*, *e*.
3. No shift given is said and counted across everyone; shifts are grouped without case or spacing — `skills.test.ts` ("the boundaries"); step *c*.
4. A level changed moves a single point to covered (and back) and the sentence follows; a task's own people-wanted changes the gap — step *c*.
5. Refusals in words (a level out of range, a need or target out of range, nothing to work on) — `skills.test.ts`; step *d*.
6. The money: named when missing; typed, and the line's offered by one tap; no yearly figure — `skills.test.ts`; step *f*.
7. Kept after a reload; a removal undone; a client changes nothing — steps *g*, *h*.
8. The paper downloaded and read back equals the screen; the phone has nothing off the side — steps *i*, *j*.
9. The stage gate's *Set up* section lists it as built and opens it in the project — `methodTools.test.ts`; step *k*. The other registers are unchanged — `scored-shape.mjs`.
Not proved / not built: dates and signers of a level; ageing; leave and crewing (FC-184); the training as actions.

## 12. Maintainability
Arithmetic and words `src/tools/skills/skills.ts` (pure); editor `SkillsEditor.tsx`; definition `scored/defs/skills-matrix.ts` (found by `import.meta.glob`); the shape's own code is `src/tools/scored/`. Left for later: a level's date and signer; FC-184's crew; FC-223's breakdown signing a person into a cell; the training plan as actions on the project.
