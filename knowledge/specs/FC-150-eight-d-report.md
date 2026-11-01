# FC-150 — 8D report — the specification

**Catalogue:** FC-150 · a document of FC-240 · **Knowledge:** `knowledge/methods/rca/eight-d.md` (Ford TOPS 1987; the automotive practice, AIAG, VDA 2018; Rambaud 2011 — from knowledge, texts not read; the D0–D8 steps to confirm) · **Asked for:** Rowland, 1 November — all tools the methods use; the 8D method's D8 is "the 8D report is the paper"; *make it read what the project holds; a part that cannot be read from existing records is a typed field, and say so* · **Status:** built on `m6-doc`, **partial**. **Written before the code.**

## 1. Purpose
A customer wants a formal corrective-action report: what was contained, what the root cause and the escape point are, that the fix works, and that it cannot come back — with a date for each discipline. *"D3 held 16,800 units (£7,056 tied up); D4 root cause: the new jaw's heater reads 12 °C low (verified: swapped the jaw to lane 2 and the leaks moved with it); D6: 0 in 6 weeks against about 540 expected; D7: FMEA rating changed, control plan check added and offered to the other lines. Closed day 62."*

**Scope.** The 8D report as a document at `#/doc/eight-d`, nine sections D0 to D8 and *What the problem costs*; nineteen needed boxes; the elapsed days from D0 to each discipline; the containment in money; the way the problem has stayed away; the agreement is **closing** it (by the lead). **What is read, and what is typed — said on the page:**
- *Read from the project* (`src/project/projectRead` `loadOwnRecords`, `listProjectCases`; nothing copied): the register's problems taken for the project (state, owner, raised, closed), the causes on the fishbone of the project's lines (bone, cause, whys, root), the project's own actions (what, who, due, state — read as D5 to D7), the studies in the project (title, verdict, what each says — read as D6's evidence), the project's lead (offered for the team leader), the line's wage and a pack's materials (offered for the money).
- *Typed, because no record holds it:* D0 (the day, the source, the reference, what happened, the first response); D1 the team (project members are not kept on the device); D2 is / is not (FC-149 not built) and its photos; D3 the containment and the hold (FC-135 not built); D4 how the root cause was verified and the escape point; D5 the action chosen and why; D6 how it was validated and the old rate and events since; D7 what was changed in the system (the FMEA and control plan, FC-132/133, are not built); D8 the closing day.
Not here: the is / is-not, hold, FMEA and control-plan tools; a customer-specific template (VDA's form); the report assembled from the project into a *different* shape; photos in the line report's paper; reading anything when the report is not on a project (it is then wholly typed, and says so).

## 2. Users and scenarios
The quality lead or the line's team leader answering a retailer's corrective-action request. (1) Leaking seals from lane 3 (the record's worked case) inside a project that holds the problem, the fishbone cause, three actions and a study. (2) A weak report — "operator error" and "retraining". (3) A report only begun.

## 3. Method selection
The eight disciplines (record): D0 symptom and emergency response; D1 team; D2 the problem described; D3 interim containment; D4 root cause and escape point, verified on and off; D5 permanent corrective action; D6 implemented and validated on the number; D7 prevention in the system; D8 closure. Alternatives: the 6M or an A3 for an internal chronic problem with no customer form (the record's *When not to use it*). Unsuitable: a report written to close a complaint rather than solve the problem — the signature is "human error" and "retraining", which the tool flags.

**Established · assumed · chosen.**
- *Established (the record, from knowledge):* the disciplines above; elapsed days from D0; D3 contains and fixes nothing; D4 needs the escape point and a verification (on/off); D7 is the system (FMEA, control plan, standard, other lines); "0 in six weeks, said with what it proves — against the old rate, the expected count that did not happen"; common expectations (D3 within a day, D4 within two weeks, D8 within 30–60 days) with *the customer's or the standard's timetable governs*.
- *Assumed:* the project's records are the report's facts (a problem on the register, an action on the project is what the 8D says it is); the typed boxes are true.
- *Chosen:* (1) needed boxes = the nineteen above — one or two per discipline, enough to say the discipline was done; the team members, photos, the money and the old-rate boxes are optional. (2) The usual expectations are **printed beside the days, never a check** (they are the record's "common expectations", not rules). (3) **Money is said apart, never summed:** held product is *tied up, not lost* (units × what one cost so far); sorting is labour (hours × one person's rate); the problem's own cost is the measuring tool's figure typed with its source named — MONEY.md FC-150: "the problem's £ (as FC-146) and the containment's cost (holds H, sorting L)". Missing inputs are named; nothing blocks. (4) **Expected without the fix = events a week before × weeks since** — a comparison, *not a significance test*, and the page says so; the zero-failure demonstration (`spc.zero-failure-demonstration`) is not claimed. (5) The checks: "operator/human error" in the root cause (a pattern of the record's own words plus the obvious synonyms), D7 only training, a containment not yet checked, D2 lacking a what/where/when/how-much row, dates running backwards or before D0, weeks since the fix running past the closing day (or today), a cost without its source. (6) **The record's worked timeline is inconsistent** — D6 on day 19 with six weeks without recurrence, yet closed on day 30; the example closes on day 62 so the six weeks fit, and the example's source says so (`cases-doc.py` E1; reported to the owner for the knowledge record).

## 4. Inputs
Needed: *The day it was raised*, *Where it came from*, *What happened*, *The emergency response*, *Team leader*, *The problem, in one statement*, *Is and is not* (≥ 1 row: *About* what/where/when/how much, *It is*, *It is not*), *Containment actions* (≥ 1: action, owner, day, checked), *How it was checked that nothing more escaped*, *The root cause*, *How it was verified*, *The day it was verified*, *The escape point*, *The corrective action chosen, and why it will work*, *The day it was chosen*, *The day it was in place*, *How it was validated*, *What was changed in the system* (≥ 1: kind, what, owner, day), *The day it was closed*. Optional: reference, champion, members, photos, units held, what one held unit has cost so far (offered from the line), hours of sorting, one person's £ an hour (offered), events a week before the fix, weeks since, events since, what the problem cost and which tool said so, how the team was recognised.

## 5. Data suitability
Not on a project: nothing is read, said in a line on the page and in the reading. Dates are compared as days (`daysBetween`); a missing date leaves its row out of the timeline.

## 6. Calculations
elapsedₖ = dateₖ − D0; held = units × unit cost; sorting = hours × rate; expected = old per week × weeks. **Independent cases** (`cases-doc.py` E1; `figures.test.ts`): D0 1 Oct 2026 → D3 1, D4 9, D5 12, D6 19, D7 26, D8 62 days; 14 × 1,200 × £0.42 = £7,056 tied up; 24 h × £14.70 = £352.80; 90 a week × 6 weeks = 540.

## 7. Outputs
The sentence (only the disciplines that have something to say, in order); tiles *Days to close*, *Contained*, *Sorting*, *Since the fix*, *Project actions* (read); tables *How long each discipline took*, *From the register*, *D4 — causes on the project's fishbone*, *D5 to D7 — the project's actions*, *D6 — the project's studies* (each only when the project holds rows); the working; the money sentence (held, sorting, the problem's cost, apart); five caveats.

**The report.** The 8D as the customer's paper: the band with the status (Draft, Ready to close, Closed), the tiles, *What it says*, who closed it and when, then D0 to D8 each with its boxes, the is / is-not table, the containment and prevention tables, the photos whole with captions, the days table and what the project holds, the money, *What this does not say* (a D4 of "human error" and a D7 of "retraining" is a closed complaint, not a solved problem; D3 fixes nothing; a cause not verified is a hypothesis; money apart; the steps are from the practice, to confirm) — read from the one module the screen reads, with the project's records loaded the same way for both.

## 8. Manufacturing usability
Nine sections, each a discipline in the customer's order, one line of help each saying whether it is read or typed; lists as cards; photos from the phone's camera or gallery; the lead and the line's wage offered in one tap.

## 9. Failure handling
A record the project no longer holds is simply not listed; a definition error shows the page's *could not be read* line.

## 10. Integration
A document of FC-240 on a project (its natural home) or a line; opens from the 8D method's D0–D1, D8 and (as the catalogue's mode) wherever FC-150 is placed; reads the register, the fishbone, the actions and the studies of its project; the line report prints it without the project's records and photos (stated in `limits`).

## 11. Verification
`doc.test.ts` (three examples, including the project's records as a context), `figures.test.ts` (days, money, expected, the weak-cause words), `doc-shape.mjs` — **which makes a project with a problem, three actions, a study and a fishbone cause for real** and checks the tables read them, and adds two photos, a caption, removes one and brings it back, and reads the paper's photos back.

**Acceptance criteria.**
1. The lane-3 example typed through the boxes, with the project's records made for real, says the sentence above, with *Days to close* 62, *Contained* 16,800 units (£7,056 tied up), *Sorting* £352.80, *Since the fix* 0 in 6 weeks, *Project actions* 2 of 3 done — `doc.test.ts`; `doc-shape.mjs` step *b*.
2. The days table, the register, fishbone, actions and studies tables read the project — `doc-shape.mjs` step *b*.
3. The money is held, sorting and the problem's cost, apart and never summed; a missing input is named — `doc.test.ts`.
4. The weak report is flagged for human error, training only, an unchecked containment, a missing is/is-not row and weeks that have not passed — `doc.test.ts`.
5. Photos: added, captioned, taken out and back, kept after a reload, named to the cloud and printed whole — `doc-shape.mjs` step *f*.
6. The shape's criteria 2–12 hold for it — `doc-shape.mjs`.
7. It opens from the 8D method's rows — `methodTools.test.ts`.
8. D2 reads the project's Is / is not page (FC-149) as a table when it holds one, and the 8D method's sheet answers (what happened, the emergency response, the root cause, how it was verified, the escape point) are offered, one tap each, saying where from, copied only when tapped — `offers.test.ts`.
Not yet proved / left (so **partial**): reading D1, D3 and D7 from records that do not exist yet (FC-135, FC-132, FC-133); the VDA/AIAG texts for the discipline names and the timetable; the photos in the line report's paper; **the photos reaching the cloud — `supabase/DOC_PHOTOS.sql` is written and NOT applied, so they stay on the device that took them. This is the one fault that holds the entry at partial.**

## 10a. One 8D, two forms (1 November)
The 8D *method* (`docs/METHODS.md` §16: `lib/eightD`, the board `project/method/shapes/eight-d`, the paper `lib/report/eightDPaper`, `scripts/acceptance/method-eight-d.mjs`) is the working form in words — its answers are project notes `method:eight-d:*`. This document is the customer's paper with the elapsed days, the containment in money and the project's records read in. To keep one place for each thing: the document **offers** the method's answers where it asks the same question (read, never copied until tapped) and reads the Is / is not page for D2; it stores only what was typed into it.

## 12. Maintainability
Definition `src/tools/doc/defs/eight-d.ts`; arithmetic `src/tools/doc/figures/eightd.ts`; what the project holds is read by `src/tools/doc/context.ts`. When FC-149, FC-135 or the FMEA arrive, the matching typed boxes become reads and the *limits* shrink.
