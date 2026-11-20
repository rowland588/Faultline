# FC-072 — Cleandown changeovers by SMED: wet and dry cleans — the specification

**Catalogue:** FC-072 (a mode of FC-068 SMED) · **Knowledge:** `changeover.smed` (full, textbook),
`foodsafety.allergen-changeover` (full, practice) · **Asked for:** Rowland, 20 November 2026 — *"Finish all of the partly
made tools."*; the entry's problem since 22 October: *"Allergen and hygiene cleandowns take hours and are never studied
like changeovers"* · **Status:** built (branch `agent2`, 20 November 2026); proved by `changeover.mjs` section 9 (all
checks passing on the branch), awaiting the full gate and `main`.

## 1. Purpose
A cleandown is a changeover — often the longest one a food line has — but its clock does not stop at the end of the
clean: the line waits for the verification (the swabs and their result) and is released by quality before the first
good pack. Timed as an ordinary SMED, that wait hides inside "the changeover" and SMED's moves can be aimed at the one
part that must not be cut. This mode says **how long to release, where the wait for the result sits, what SMED can
take off around the clean, and which plans would change the validated clean itself.** The sentence: *"The nut clean
is 90 minutes to release — 60 cleaning, 15 waiting on the swabs, 5 for the release; staging the kit and cleaning the
spare parts off the line brings release to 65, the clean and its verification as validated."*

**Scope.** On a SMED study:
- the changeover said to be **a dry clean** or **a wet clean**, and whether it is **an allergen clean** (and which
  allergen, in the floor's words) — the words on the band, the page and the paper; wet or dry changes no figure;
- each element marked, where it is one, as part of the **cleaning**, the **verification** (the swabs or test and the
  wait for the result) or the **release** (signed, the line may run) — beside Shingo's four functions, which stay;
- **the time to release** (the stop's elapsed time to the end of the release element) as timed and at the furthest
  rung planned, and what runs after it to the first good pack;
- **where the verification's wait sits** — from how many minutes to how many into the stop — and the step SMED's
  parallel work justifies while it runs;
- the split: minutes cleaning, on the verification, on the release, other work;
- **a plan that would change the clean or its verification** said beside it (amber, in words): an element of the
  clean eliminated or streamlined shorter; the verification eliminated, converted or streamlined shorter; the release
  eliminated or converted. Converting the cleaning of parts off the line (a spare set) is SMED's own move and is not
  flagged; nothing is blocked — it is said;
- the clean's chemicals and water in money: a typed £ a clean × the changeovers the SMED already counts (a week, a year);
- the grid marks each part's square (C · V · R) and the paper's table names it under the element.

Deliberately not: the allergen matrix and which product changes need the full clean (FC-070's sequence, FC-171); the
validation record itself and the verification's pass or fail (FC-171 allergen changeover validation, FC-172 ATP —
check logs); swab results read into SMED; the water and energy tariffs (E — only the £ a clean typed); the first-off
release checks (FC-071).

## 2. Users and scenarios
The hygiene or technical manager and the ops lead, on a phone at the line through the clean, at a desk after.
- **A nut → plain allergen clean on a bakery depositor** (the record's worked case): the nut run ends 14:00; the kit
  fetched (10 min), the removable parts stripped (15), cleaned at the sink (15), the frame and conveyors washed (30),
  three sites swabbed and the result waited for (15), QA release signed (5) — 90 minutes to release, 15:30.
- A **dry clean** of a powder filler between two flavours, no allergen.
- A plan that shortens the wash itself — said to change the validated clean.

## 3. Method selection
SMED (Shingo 1985) applies to cleaning elements as to any other: separate, convert, streamline. The allergen record
adds what SMED alone does not know: the validated clean is the method and is not shortened by SMED — only what is
around it; the line is released on the verification. So the tool keeps SMED's stages and its ladder, and adds the
parts of a clean and the time to release, rather than a separate tool. Alternatives (the record's *When not to use
it*): avoiding the clean by sequence → FC-070; the verification's own records → FC-171, FC-172; the release checks →
FC-071.

**Established · assumed · chosen.**
- *Established:* a changeover runs from the last good piece to the first good piece, run-up included (Shingo 1985,
  `changeover.smed`); an allergen changeover runs end of run → clean → swabs read → release, the line stopped
  throughout; the kit, the chemicals and the clean-down of removable parts are staged before the run ends; the line's
  own clean is internal (`foodsafety.allergen-changeover`). The record's case: clean 14:00–15:10, swabs read 15:25,
  release 15:30 — 90 min; staging the kit and the spare parts saves about 25 (`cases-planning-foodsafety.py`,
  `cases-smed-epei-cleandown.py` C1: 90 → 80 separated → 65 converted).
- *Established:* "The clean's time saved by SMED must not be saved from the clean's validated method; only from what is
  around it" and validation is re-done after a change to the method (`foodsafety.allergen-changeover`, Campden BRI
  Guideline 59; BRCGS Issue 9 clause 5.3 named, not confirmed against the text).
- *Established (money, `knowledge/MONEY.md` FC-072 — as FC-068, with the clean's materials, E):* the clean's minutes in
  SMED's two parts (idle labour; contribution if the packs cannot be made up) from the line's cost settings; the
  chemicals and water as typed £ a clean × the cleans.
- *Assumed:* the elements are marked by the person who knows the clean; time to release is read at the end of the
  release element's column (elements in parallel finish with their column); a hygiene (non-allergen) clean is held to
  its cleaning procedure the same way — the words say "the cleaning method" and, for an allergen clean, "validated for
  the allergen".
- *Chosen (Faultline's, conservative, for Rowland to confirm):* a plan that would change the clean is **said, never
  refused** (amber, words beside it); converting cleaning to external is not flagged (the record's own move); a
  release streamlined shorter is not flagged (QA on hand sooner is not a change to the method); wet and dry are words
  only; the cleaning materials are one typed £ a clean, not the water and chemical tariffs; the parts are offered only
  when the SMED is said to be a clean.

## 4. Inputs
On the study (the sheet *The clean*): **what kind of changeover** — a product change (no clean) · a dry clean · a wet
clean; **an allergen clean** (tick) and **which allergen** (words, optional); **chemicals and water, £ a clean**
(optional). On each element: **part of the clean** — Cleaning · Verification · Release (a chip, tap again to clear),
on its row in Record and in its sheet. Read, never asked again: the elements, their times, sides and plans; how the
line runs and how many changeovers (the SMED's own); the line's cost settings.

## 5. Data suitability
The time to release needs a release element with a time; the wait needs a verification element; an allergen clean with
no verification marked is said ("an allergen clean is released on its verification — mark the element"). Untimed
elements make the minutes "at least", as SMED says.

## 6. Calculations
On SMED's own arrangement (`arrange` — columns in order, elapsed the longest in each): **time to release(rung)** =
elapsed at the end of the last column holding a release element; **after release** = the rung's elapsed − time to
release; **a wait** = a verification element's column start and end on the elapsed; **the split** = the timed
elements' own minutes by part, the rest "other work". Rungs: as timed, separated, converted, streamlined (the ladder's
own). **Flags**: part clean with plan eliminate, or streamline with a target below its time; part verify with plan
eliminate, convert, or streamline below its time; part release with plan eliminate or convert. **Materials** = £ a
clean × the changeovers a week (a year when its weeks are said).

**Independent case** (`scripts/knowledge/cases-smed-epei-cleandown.py` C1): 90 min to release as timed; the wait from 70
to 85 min; 60 cleaning, 15 verification, 5 release, 10 other; separated 80; converted 65 — 25 sooner; £45 a clean × 2
a week = £90 a week.

## 7. Outputs
On screen (*What it says*, after the ladder) and on paper (the sheet's lines), from the cleandown section of
`src/tools/changeover/changeover.ts` (`cleandownOf`, `cleandownSays`, `cleanFlagOf`, `cleanMaterialsSays`):
- *"A wet clean, allergen (nut): 90 min to release — 60 min cleaning, 15 min on the verification, 5 min on the
  release and 10 min of other work."* (… *then 4 min to the first good pack* when there is a run-up);
- *"The verification — Swab three sites and wait for the result — holds the line 15 min, from 70 to 85 min into the
  stop; work that does not need its result can be done alongside it."*;
- *"As planned, release at 65 min — 25 min sooner, the clean and its verification as they are."*;
- a flag (amber): *"Wet clean the frame and conveyors is part of the clean — a plan that shortens it changes the
  cleaning method validated for the allergen, which is validated again before it is used. SMED shortens what is around
  the clean, not the clean itself."*;
- *"Chemicals and water: £45 a clean — £90 a week at 2 cleans a week."* or *"Give what one clean uses in chemicals and water
  to say it in money."*;
- a tile **To release** (the sixth of SMED's tiles: *90 min — 15 min on the verification · 65 min as planned*) and the
  band's fact **The clean** (*A wet clean, allergen (nut)*), its one door *Is it a cleandown?* / *Change the clean* beside
  *Change the products*; the grid's C · V · R marks; each element's part on its row in words.
What it does not claim: that the clean is validated (FC-171 keeps that); that a planned release time is proved before
it is timed again.

**The report.** *SMED — on paper* and every paper carrying the SMED (the client report, the 6M report) carry the band's
*The clean* fact, the *To release* tile, each element's part under its name in the table, and the cleandown's sentences
and flags among the figures in words — the same module; read back with pdftotext in `changeover.mjs` section 9.

*The workspace:* SMED's own (`docs/TOOLS-DESIGN.md` T3 first pass) — the grid and ladder the canvas, the cleandown's
lines in *What it says*, the part chips on the element's row as Shingo's functions are.

## 8. Manufacturing usability
One tap marks an element's part on its row while recording (Record stage) — as the functions are. The clean's kind is
one sheet with three chips and a tick. Phone first, 44 px chips.

## 9. Failure handling
No release marked: the time to release is not said and the sentence says to mark it. No verification on an allergen
clean: said. A plan that changes the clean: amber, its words; nothing refused. A product change (not a clean) shows
none of it. A client (read-only) sees it and changes nothing. An older SMED reads exactly as before.

## 10. Integration
The record: the SMED `ToolStudy` — `facts.cleandown` (`{ kind: 'dry' | 'wet'; allergen?: boolean; allergenName?:
string; materials?: number }`) and `ChangeoverStep.part` (`'clean' | 'verify' | 'release'`), both optional JSON inside
`facts`, no column, no migration. The agreed sequence on the line standard keeps each step's part (`standardFrom`).
Where it shows: the SMED's page, grid, tiles and paper; `lib/studyLinks` (the study's reading on its line) adds the time
to release; the client and 6M reports through `changeoverSheet` and the shared tiles. Access: the sheet and the chips
only with `can.edit` on an open study.

## 11. Verification
Unit tests `src/tools/changeover/__tests__/epei-cleandown.test.ts` (C1, the flags, the missing states, an old record;
17 tests with FC-069's, all passing);
acceptance `scripts/acceptance/changeover.mjs` section 9 (`scripts/lib/smedEpeiCleandown.mjs`), desk 1440 and phone 390.

**Acceptance criteria.**
1. C1 by hand: 90 min to release, the wait 70–85 min, the split 60 · 15 · 5 · 10, separated 80, converted 65 (25
   sooner) — `epei-cleandown.test.ts`; `changeover.mjs` 9a–9b.
2. The clean said through the real sheet (a wet clean, allergen, nut, £45) and kept after a reload; the parts marked by
   their chips on the rows — `changeover.mjs` 9a.
3. The page's sentences, the *To release* tile and the band's fact equal the module's — `changeover.mjs` 9b.
4. A wash streamlined shorter is flagged in amber with its words; taken back, the flag goes; the parts cleaned off-line
   (converted) are not flagged — `epei-cleandown.test.ts`; `changeover.mjs` 9c.
5. Chemicals and water: £90 a week at 2 cleans a week; none typed — named — `epei-cleandown.test.ts`; `changeover.mjs` 9b.
6. The grid marks C · V · R on the parts' squares — `changeover.mjs` 9b.
7. The paper downloaded and read back: the clean, *To release*, each element's part, the sentences and the flag —
   `changeover.mjs` 9d.
8. Phone (390) and desk (1440): nothing off the side, chips 44 px — `changeover.mjs` 9d.
9. A client changes nothing — `changeover.mjs` 9e.
10. A product changeover and an old record read exactly as before — `changeover.test.ts` (unchanged); `changeover.mjs`
    1–7.
Not yet proved: the verification's pass or fail read from FC-171's log; a re-clean after a failed swab as its own
elements (it can be typed as elements today, but nothing reads it as a fail).

## 12. Maintainability
The cleandown section of `src/tools/changeover/changeover.ts` (pure — beside the arrangement it reads, so no import
cycle), wired into `changeoverSheet`, `changeoverLean.ts` (the
tile, the fact), `ChangeoverScreen.tsx` (the sheet, the chips, the lines), `SmedGrid.tsx` (the marks) and
`src/lib/report/changeoverTable.ts` (the part under the name). Left for later, with their numbers: reading the swab
results from FC-171/FC-172 into the verification; the allergen matrix and the order (FC-070); water and energy by
tariff (E, FC-226 energy and water per tonne).
