# The audit — the bar every screen meets

Rowland, 13 October: *"we need to run, I think, multiple audits to explore
elements that are missing, not functional properly, gaps basically ... the
amount of gaps that I'm finding are quite simple but important things ...
on the line standard, when I click on the PDF, I can't get out of it. There's
no X mark ... I'm always asking for reports, or cards ... there are still
quantification issues we've yet to even look at ... basic functionalities,
basic user interfaces, basic user experiences, flow, fluency, simplicity ...
run the audits, find the gaps and implement the improvements at pace."*

Placed (BLUEPRINT §8): every layer, every record, every place — it is the
floor under §3 and §4, not a new feature. Each gap found is written below,
fixed in a slice that ships live on its own, and held by a check so it
never comes back.

## The bar — what every screen does

1. **A way out of everything that opens.** Every sheet, drawer, viewer and
   preview shows an × (or Close / Done) on the screen at all times — not
   only a dimmed strip around it — and Escape and the back button close it.
2. **Every record edited and deleted where it sits.** Wherever a record is
   listed or opened, the person allowed to (lib/access) can change its words
   and delete it, with Undo; a delete says what goes with it.
3. **Paper wherever there is a list.** A page that lists records offers its
   report; a record that has a card offers the cards for all that are shown,
   as well as one at a time. The preview of either closes (1).
4. **Every number right, and said how it is known.** Each figure is the
   practice's figure, worked by hand in a test; its name is the practice's
   name; it says how many it came from and whether that is enough.
5. **The phone.** At 390 px nothing is off the side, no words are cut off,
   nothing to press is smaller than a fingertip.
6. **No dead ends.** Every page says where it is and has a way back; an empty
   page says what to do first.
7. **Simple with detail.** Where we are, why we are not where we should be,
   what we are doing about it — the rest one tap away (docs/SIMPLE.md).

## How it is checked

- `scripts/audit.mjs` drives every screen smoke opens, at a desk and on a
  phone: it presses each button that opens something and checks a way out is
  in view and Escape closes it (1); measures the phone (5); lists the pages
  with records and no paper (3) and the edit and delete words on each page
  for reading by hand (2). It deletes nothing and answers every confirm no.
- (4) is checked module by module, against the practice, with hand-worked
  tests.
- (2), (6) and (7) are read by hand from the audit's tables, page by page.

## Findings, 13 October

| # | Bar | Where | What | State |
|---|-----|-------|------|-------|
| 1 | 1 | every sheet (`ui/Sheet`) | No × at all — only the dimmed strip, Escape and back. A tall sheet (the line standard PDF's preview, a long editor) grew to 16 px from the top, leaving nothing to tap: no way out on a phone. | Fixed: the sheet's head (title and ×) stays at its top as it scrolls. |
| 2 | 4 | capability study (`lib/ie/sample`) | What the app calls **Cpk** is worked from the overall spread of the readings (sample standard deviation) — the practice calls that **Ppk** (AIAG SPC; ISO 22514), or Cmk for a machine's run. Cpk is from the spread within — run to run, the moving range ÷ 1.128 for single readings. On a run that drifts the two part, and the drift is what a commissioning test must see. | Fixed: Ppk (overall) carries the verdict — the same number as before, its right name; Cpk from the moving range beside it; "it drifts across the run" when they part. Hand-worked tests. |
| 3 | 3 | line standard card | Square and tall boards squeezed into a wide frame; marks half as big again as the screen's; names crossing; the note over the people; 3 of 10 named. | Fixed (677c03e). |
| 4 | 2 | Line capacity, Line standard | No delete of a Line capacity anywhere; no rename or delete on either list; a map's delete took its capacity. | Fixed (6435d91). |
| 5 | 3 | Control room problems | Cards for one, a few, a group — never for all shown. | Fixed (7215d1f). |
| 6 | 1 | the photo viewer (`ui/Evidence`) | Had its × but Escape did nothing. | Fixed: Escape closes it. |
| 7 | 3 | every study (capability, value stream, SMED, sampling, loss count) | Reached paper only inside a job's client or 6M report — a study on a line, a quick session, or a tool's list had none. | Fixed: PDF on every study's page (its sentence, its table, a capability study's figures and every reading) and PDF (all shown) on every study list (`lib/studiesPdf`, the same blocks as the client report's Evidence). |
| 8 | 1, 5 | the audit run (`scripts/audit.mjs`, 270 screens, 160 overlays opened) | After 1: nothing trapped; nothing off the side. Words cut off on 17 screens ("Actions", "Order", "Over", "Sort by"); controls under 24 px on 70 phone screens; 17 lists with no paper. | Phone fit and the remaining paper being worked (audit agents). |
| 2.1 | 2 | every study — the five tools' lists and each study's own page (capability, value stream, SMED, work sampling, loss count) | No study could be deleted anywhere (`db/studies deleteStudy` had no caller); a value stream map and a work sampling study could not be renamed even on their own page; no list row could rename or delete. | Fixed (661a70d): Rename and Delete beside the name on every study's page (`ui/StudyActs`, the three copies of Name merged) and on every list row; the ask says what goes and what stays (`lib/studyLinks studyRemovingSays`); Undo; deleted from its page, back to its tool's list on its line. `edit-delete.mjs` A. |
| 2.2 | 2 | a 6M problem — the fishbone's problem card and panel | Its words (the head of the fish) could not be changed once opened — only removed and opened again, losing its causes. | Fixed (11f46e4): Change the words on its card (`lib/useProblems retitleProblem`), can.edit. `edit-delete.mjs` B1. |
| 2.3 | 2 | a Case on a line with no job — the A3 (`/w/:line/case/:id`) | Deleted hard: no Undo, and the other devices' screens not told. | Fixed (11f46e4): the same soft removal as a 6M problem, the ask saying what stays, Undo. `edit-delete.mjs` B2. |
| 2.4 | 2 | a stop timed on a line — Capture's log | Deleted with Undo, never changed: a mis-tapped machine, the wrong reason, a stopwatch left running. | Fixed (a9aabd3): tapped, Change this stop (`ui/StopSheet`) — where, what, its kind, minutes, cause family, note; minutes typed over say typed and move its end (`lib/stopEdit`); Undo. `edit-delete.mjs` C. |
| 2.5 | 2 | a problem — the register (one or several ticked), its frame on the walk, a job's walk evidence | Asked, then gone on every device — no Undo; `db/walk deleteSnag` (and the frame's delete) never signalled the write, so the other devices heard at the next write. | Fixed (983f4fd): Undo puts back the problem and its photo; the write signalled. `edit-delete.mjs` F; `snags.mjs` still passes. |
| 2.6 | 2 | a win — a job's Wins, a job line's Wins | Asked, then gone. | Fixed (983f4fd): Undo, its proof said to go with it. `edit-delete.mjs` D1. |
| 2.7 | 2 | a reading — a job's numbers, a line's numbers | Asked, then gone. | Fixed (983f4fd): Undo. `edit-delete.mjs` D2. |
| 2.8 | 2 | a machine — the line's own page | Renamed or taken off only in Set up the line (Order and names ›). | Fixed (3f31d4c): Rename and Remove on each row (the line's own list; a job's machine is changed on its job), the ask saying what stays, Undo back to its place in the flow. `edit-delete.mjs` E1–E3. |
| 2.9 | 2 | a line — its own page | Archived only from Your factory. | Fixed (3f31d4c): Archive this line in Edit the line, with Undo. `edit-delete.mjs` E4. |
| 2.10 | 2 | a marked frame on the walk — a job's walk evidence | "This cannot be undone" — the still and every problem pinned on it. | Fixed (ecfa88b): Undo puts the frame, its problems and their pictures back. `edit-delete.mjs` G. |
| 2.11 | 2 | checked and already meeting the bar | Lines in Your factory (rename, type, order, archive, restore, delete for ever counted, merge); a job (rename on its front page with Undo, archive in Details, delete for ever counted); a job's lines (remove, Undo); a job's machines, tests, fixes, things found, install steps and notes (the record's drawer or page: Edit, Delete with Undo and what goes); materials and programs, a job's and a line's (in the row, Undo); Line capacity and Line standard (2 above, #4); actions and countermeasures (the sheet and the board's list, Undo); lever tree boxes (on the box, Undo and what goes); measures and periods; a problem's words in the register; a walk's video and a frame renamed. | — |
| 2.12 | 2 | left | The control room's jobs board and the Projects list open a job — rename and archive are one tap away (its front page, Details), not on the card. The old walk screen (`snag/SnagsScreen`) deletes a video asking first, with no Undo — the clip exists nowhere else, and holding it in memory for Undo is a decision. A work balance (a study on the line standard's People view) and a study listed in a job's Evidence (`ui/Evidence`) were not changed here — other work is in those files; the study they open now has Rename and Delete. | Open. |
