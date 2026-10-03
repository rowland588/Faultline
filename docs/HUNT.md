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
1. **Machines and stage lists are not on Details** on a stage-gate job; they live on Install. Recommend a one-line pointer on Details that opens Install, rather than moving them.
2. **`?view=snags` is a second route to Install's filmed line**, with the project header on top. Recommend it opens Install with that fold open.
3. **Removing a line on Details has no Undo**, unlike every other delete in the area. Recommend Undo.
4. **A grid cell's "Who is doing it" Save leaves the sheet open**, while Done today and the dates close it. Recommend closing on Save.
5. **The empty job says "on this line" and plans a test first**, though Install is the first gate. Recommend "on this job" and "Add the first machine". This changes how the method starts.

## Stage gate — tests, fixes, the record and the report
6. **`lib/testReport.ts`'s A3 testing sheet has no caller** since the card and client report replaced it. Recommend deleting the drawer and keeping the photo helpers.
7. **An old "not a problem" observation** prints on the card but shows nothing on the test page. Recommend showing it on the page too.
8. **The spreadsheet export does not carry the line standard**, though its door says "everything". Recommend adding it, or changing the door's words.

## 3P and the line
9. **What-ifs are frozen copies of the line.** Edit the line as run and a what-if keeps the old stations, reports changes nobody made in it, and Make it so writes those into the action. Recommend storing a what-if as changes against station ids.
10. **Line balance is not on Home.** Recommend one clause in the 3P verdict naming the limited station.
11. **Programs on a 3P job ask for a machine**, which creates a stage-gate machine record. Recommend programs belong to a line on 3P.
12. **The method switch in Details is one tap with no confirm**, and it reshapes every screen and the report (the tree is kept but hidden). Recommend a confirm saying what the job will look like after, and that nothing is deleted. Raised by two areas.
13. **A 3P meeting note can only be about the whole project.** Recommend letting it point at a line or an action.
14. **By-owner cards are read-only.** Recommend they open the action sheet, as the board's do.
15. **The project's Pareto rows are not doors.** Recommend each opens the line's drill for that category.
16. **The project-level walk sits beside each line's.** Recommend filming from the project page asks which line.

## The walk and the tools inside a workspace
17. **Dead code:** `engine/questions.ts` and `engine/tools.ts` are imported by nothing; LineBoard's `present` prop is never passed. Recommend deleting.
18. **Duplicate back buttons** on the case and on Through time do what the breadcrumb does. Recommend removing them (a removal, so your call).
19. **The one-page report mixes periods**: "lost last week" is the last full week, the bars are the last 7 days. Recommend one period.
20. **A gone workspace link** goes Home with no sentence. Recommend a note.
21. **The Line's rail dots are 11–14 px.** Recommend a 44 px invisible hit area.
22. **Evidence counts:** "1 open" is red and "2 closed" green, against the rule that an outstanding count stays neutral — but a comment on the screen chose this on purpose. Your call.
23. **"Show this in the meeting ›"** opens the meeting's overview, not the drill you were on.
24. **The case's action sheet** offers "Open the Case it was raised for" while you are on that case.
25. **Date boxes save on every change, app-wide**: typing a year digit by digit writes several times.

## The lever tree, the control room, and getting around
26. **The tree is invisible from the control room.** Neither a tree job's front page nor its Home row says how the outcome stands or which condition is red. Recommend a "The tree" fold on the front page ("1 of 3 conditions at risk · outcome behind") and the same count on Home's chip.
27. **Every trail starts at "Projects"**, which is no longer the list of jobs. Recommend starting at Home.
28. **"Start from the lines" writes "holds its ppm rate"** whatever the project measures. Recommend the first measure's name, or neutral words.
29. **"Workspace +" on a line row** is the old name for the line's study and walk. Recommend naming it for what it opens.
30. **A linked condition's edge is brand blue**, which the house rules keep for what you press. Recommend a neutral mark.
31. **Binding, unbinding and switching method have no Undo.** The tree's delete has Undo now. Recommend Undo for these too.

Fixed after the hunt reported them: the tree's four sheets now close on Escape and on a tap outside, like every other sheet; "Notify me on this device" says when the browser's question was closed without a yes. Not driven: the update banner, because the harness blocks service workers.
