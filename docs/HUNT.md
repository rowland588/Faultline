# The hunt — 3 October 2026

Rowland: "map every function, screen and purpose, then bug hunt — having
nodes that don't open is unacceptable, we can't have errors."

Five areas were driven control by control, on a phone (390×844, touch) and a
desktop, with seeded data; every fault found was fixed, tested where it could
be, merged and shipped live the same day. The maps are in `docs/map/` and the
index is `docs/MAP.md`. The smoke gate now opens all 82 screens.

What follows is what the hunt found and did NOT change, because each one is a
design call — removing something, a new concept, or changing how a method
works. Each has a recommendation. Nothing here is broken in the sense of a
control that does nothing; these are the calls to make next.

## Stage gate — the gates and the plan
1. ~~**Machines and stage lists are not on Details** on a stage-gate job.~~ **Done 3 Oct:** Details carries a door that says where they are and opens Install.
2. ~~**`?view=snags` is a second route to Install's filmed line.**~~ **Done 3 Oct:** it opens Install with "The line, filmed" open; the address is replaced, so Back does not loop.
3. ~~**Removing a line on Details has no Undo.**~~ **Done 3 Oct:** Undo is offered and brings the line back on every device.
4. ~~**A grid cell's "Who is doing it" Save leaves the sheet open.**~~ **Done 3 Oct:** all three of the grid's "Who is doing it" boxes close their sheet on Save.
5. ~~**The empty job says "on this line" and plans a test first**, though Install is the first gate.~~ **Done 4 Oct:** the empty job says "Nothing planned on this job yet. It starts at Install, with the machines it is putting in." and its button is "Add the first machine", which opens Install.

## Stage gate — tests, fixes, the record and the report
6. ~~**`lib/testReport.ts`'s A3 testing sheet has no caller** since the card and client report replaced it.~~ **Done 3 Oct:** the A3 drawer is removed; the photo helpers it shared stay in `lib/testReport.ts`, which now says why.
7. ~~**An old "not a problem" observation** prints on the card but shows nothing on the test page.~~ **Done 4 Oct:** the test page's row says "not a problem" too, read from the same `standingOfItem` the card prints.
8. ~~**The spreadsheet export does not carry the line standard**, though its door says "everything".~~ **Done 4 Oct:** both: the workbook has a "Line standard" sheet (one row per person on each product — name, task, picture, note), and the door now says what the file carries: "The start-up record of every project — machines, tests, fixes, materials, programs, line standard and walks". The 3P board, the lines' numbers and the tree are not in it, so "everything" went.

## 3P and the line
9. ~~**What-ifs are frozen copies of the line.** Edit the line as run and a what-if keeps the old stations, reports changes nobody made in it, and Make it so writes those into the action.~~ **Done 3 Oct:** a what-if stores only what it changes against the line as run (`WhatIfDiff`) and follows the line in everything else; old what-ifs convert without inventing changes. Make it so and the report read the same derived stations. Tested and driven.
10. **Line balance is not on Home.** Recommend one clause in the 3P verdict naming the limited station.
11. **Programs on a 3P job ask for a machine**, which creates a stage-gate machine record. Recommend programs belong to a line on 3P.
12. ~~**The method switch in Details is one tap with no confirm**, and it reshapes every screen and the report (the tree is kept but hidden).~~ **Done 3 Oct:** switching method asks first, says what the job becomes, and that nothing is deleted.
13. **A 3P meeting note can only be about the whole project.** Recommend letting it point at a line or an action.
14. ~~**By-owner cards are read-only.** Recommend they open the action sheet, as the board's do.~~ **Done 4 Oct:** the whole card is a button (127 px on a phone) that opens the board's own action sheet for that action — editable for the team, read-only for a client, with "did it work?" as the board shows it; an on-time open card is indigo now, not done's green.
15. **The project's Pareto rows are not doors.** Recommend each opens the line's drill for that category.
16. **The project-level walk sits beside each line's.** Recommend filming from the project page asks which line.

## The walk and the tools inside a workspace
17. ~~**Dead code:** `engine/questions.ts` and `engine/tools.ts` are imported by nothing; LineBoard's `present` prop is never passed.~~ **Done 3 Oct:** `engine/questions.ts`, `engine/tools.ts` and LineBoard's `present` prop are removed.
18. **Duplicate back buttons** on the case and on Through time do what the breadcrumb does. Recommend removing them (a removal, so your call).
19. ~~**The one-page report mixes periods**: "lost last week" is the last full week, the bars are the last 7 days.~~ **Done 4 Oct:** one period — last week, Monday to Sunday, the week the headline and its 4-week comparison already used. The bars, the total and "closed last week" follow it, and the page names it: "Last week, Mon 21 Sept – Sun 27 Sept."
20. ~~**A gone workspace link** goes Home with no sentence.~~ **Done 4 Oct:** it stays on the link and says "That line study isn’t here any more — it was deleted, or it has not synced to this device yet", in the gone video's words, with Back to the control room. It re-reads after each sync, so a study still on its way arrives by itself.
21. ~~**The Line's rail dots are 11–14 px.**~~ **Done 4 Oct:** each dot is a 28 × 44 button with the same 11px dot drawn inside it.
22. **Evidence counts:** "1 open" is red and "2 closed" green, against the rule that an outstanding count stays neutral — but a comment on the screen chose this on purpose. Your call.
23. ~~**"Show this in the meeting ›"** opens the meeting's overview, not the drill you were on.~~ **Done 4 Oct:** the link carries the drill (`?act=2&path=…`, the encoding Analyse already uses) and the meeting opens on Where it hurt at that drill.
24. ~~**The case's action sheet** offers "Open the Case it was raised for" while you are on that case.~~ **Done 4 Oct:** the door is left off when the sheet is open on that case.
25. ~~**Date boxes save on every change, app-wide**: typing a year digit by digit writes several times.~~ **Done 4 Oct:** one date box (`ui/DateInput`) writes a whole date — a picked day, or a typed year from 1900 on — and anything else when the box is left. It was worse than extra writes: typing a year into the expected handover saved it as the year 202 and asked why it had moved +666,568 days. Driven both ways: the old code saved 0002, 0020, 0202, 2027; the new saves 2027. Every date box that wrote on change uses it (10 screens); boxes that only fill a form keep their own.

## The lever tree, the control room, and getting around
26. ~~**The tree is invisible from the control room.** Neither a tree job's front page nor its Home row says how the outcome stands or which condition is red.~~ **Done 3 Oct:** a tree job's front page has a "The tree" card (the outcome, then each condition off track, each opening the tree), and its row on Home leads with the outcome and the conditions off track instead of People · Plant · Process.
27. ~~**Every trail starts at "Projects"**, which is no longer the list of jobs.~~ **Done 4 Oct:** every trail starts at "Control room" and goes to Home; the card says "Control room · every job"; the account menu's Home is Control room.
28. ~~**"Start from the lines" writes "holds its ppm rate"** whatever the project measures.~~ **Done 4 Oct:** it uses the project's first measure — "Line 9 hits its waste target", "… meets its waste target" — and plain "target" before the project names one.
29. ~~**"Workspace +" on a line row** is the old name for the line's study and walk.~~ **Done 4 Oct:** the button says "Time & film", what it opens: the line's stopwatch and filmed walk.
30. ~~**A linked condition's edge is brand blue**, which the house rules keep for what you press.~~ **Done 4 Oct:** the edge was indigo (`--blue`, "under way"), not brand blue — still a state hue on a mark that is not a state. It is an ink edge now.
31. **Binding, unbinding and switching method have no Undo.** The tree's delete has Undo now. Recommend Undo for these too.

Fixed after the hunt reported them: the tree's four sheets now close on Escape and on a tap outside, like every other sheet; "Notify me on this device" says when the browser's question was closed without a yes. Not driven: the update banner, because the harness blocks service workers.
32. ~~**A lever tree job's outcome chip on Home was cut to "Outcome n…"** in a quarter of the row.~~ **Done 4 Oct** (found 3 Oct, not in the first hunt): it takes two quarters and reads in full.
