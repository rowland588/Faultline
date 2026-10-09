# Stage Gate — the backbone

Rowland, 9 October: audit Stage Gate for user experience and structural
consistency before changing anything. A stage-gate job takes a line coming
into a factory through its gates (Install · Set up · Programs · Commission ·
Hand over) with stages the user names, so every screen has to work whatever
the stages are called and still be simple.

Audited 9 October on the seeded job: every screen at laptop (1360) and phone
(390) width, driven in Chromium. The drawers, sheets and back button were
clicked, and the DOM was read. The findings come first, then what was decided.

## Findings, against the eight questions

**1. State, next action and blockers on one screen.** Mostly yes. The job's
front page answers all three in its first screenful: the verdict, three
counts, Needs you, and where each machine is. Each gate shows Needs you and
its board before any scroll. Where it fails:
- the plan is 2.7 laptop screens, because every machine opens unfolded;
- the day is 3.1 laptop screens and 4.6 phone screens;
- Commission's board scrolls sideways at 1360 wide, with its last column cut
  off and nothing saying it scrolls;
- Install's empty "The line, filmed" panel is open and takes half the page.

**2. Information not needed for the decision.**
- the empty filmed-walk panel, open by default;
- the plan unfolded on a desk: mostly done history;
- the day restates the verdict box in a sentence under it;
- explainer paragraphs on Programs and Materials;
- ▲▼ arrows on every program row;
- a second list of programs folded at the foot of the Programs page
  (flagged below).

**3. Moving between stages: one flow or a fresh page?** It feels like a
fresh page.
- Every move between gates flashes "Loading…" for 100–200 ms, because each
  screen reads the job again from scratch.
- The gates are not the same shape:
  - Commission has a "Machine by machine" heading with "Edit the usual
    tests" on its right; Install, Set up and Hand over hide "edit stages"
    in the board's corner cell.
  - Commission's Needs you rows carry their action; the others carry none.
  - The link after each state line differs: "Read the day" on three gates,
    "Dates" on Commission.
- Three kinds of overlay: the record drawer (a panel from the right), the
  machine and stage panels (a centred box), and bottom sheets.

**4. Can you always get back without losing context or progress?**
- The record drawer can: it is carried on the URL, so ×, Escape, the dimmed
  page and the back button all close it, leaving you where you were.
- The machine and stage panels cannot: back with one open leaves the gate
  for whatever page came before.
- What is typed is lost without a word on ×, Escape, back or leaving the
  page. This applies to a record's Edit, the problem form and Plan a fix.

**5. Colour and visual language.** One language mostly holds: red late or
failed, amber waiting, due soon or a problem with no time lost, indigo
ahead, green done, grey not started, a navy fill for the chosen segment.
Breaks:
- the rail says Programs "1 late" where the page says 0 late, 1 failed (the
  rail counted a failure as late);
- the plan writes "done · 1 day late" in red for a stage finished days ago;
  done is history and should recede;
- Commission's Programs column prints "none" in large grey type, so it
  reads like content.

**6. Edit, delete, and ways out.** The full list is below. No screen traps
you: every panel has ×, and Escape closes it.

**7. The plan (Gantt) at a glance.**
- Folded, as it already opens on a phone, it is a good glance: each machine
  says where it is, what is wrong, and shows a strip of its days.
- It does not say each machine's next step in words.
- Unfolded on a desk, it is 2.7 screens of mostly done stages.
- A done-late stage's second line spills out of its row.
- A bar that starts before the window leaves its date clipped to "ct".
- The legend is eleven keys.

**8. Reports.**
- Reports opens "On paper", the index of every document. The client report
  opens on the one-page status, then the full report, then programs.
- The plan's own PDF is not in the index.
- The index does not say who each document is for.
- Every PDF opens titled with a raw ID, because no document title is set.
- The commentary box is drawn in a typewriter font.

## Every missing or broken edit, delete or way out

| Where | What is wrong | Now |
|---|---|---|
| A stage's, test's or fix's **Edit** | What you typed is gone on ×, Escape, back or leaving | Kept. Reopen it and Edit opens with what you typed; only Cancel throws it away |
| The **problem form** (writing or editing) | The same | Kept, the same way |
| **Plan a fix** (Fixes) | Leaving the page loses the half-written fix | Kept, open, when you come back |
| The **machine panel** | Back leaves Install instead of closing the panel | Back closes it |
| The **stages panel** ("edit stages") | Back leaves the page; it opens a read-only list and a second "Edit", two doors to one editor | Back closes it; it opens on the editor |
| The machine panel's **×** beside the name | It *removes the machine*, while the panel's own × *closes* — two × with opposite meanings | "Remove this machine" in words at the panel's foot, where every record keeps its delete |
| A **material** | After adding, how much, which line it is for and who is bringing it cannot be changed; the name can, but looks like plain text | One Edit on the row, the same boxes as Add |
| Commission's **usual tests** | A read-only list first, then Edit | Opens on the editor |
| Every **bottom sheet** (Reports, More on a phone, …) | Back leaves the page instead of closing the sheet | Back closes it |

Already sound:
- stages, tests, fixes and problems (Edit, delete, Undo);
- the parts of the plan and their statuses;
- the Programs list;
- notes;
- the day's plan;
- the project (Details, archive, delete);
- the commentary;
- line standards;
- performance runs.

## Words and behaviour that did not make sense

- The rail says "Programs 3 · 1 late"; it is one failed.
- Install's phone card says "4 done · 2 late". It means 2 of the 4 were
  done late.
- The same act is named three ways: "edit stages" (Install, Set up,
  Hand over), "Edit the usual tests" (Commission), "Give the 2 new machines
  the 5 stages".
- Adding stages is named four ways: "Add the 6 stages", "Add the 5 stages",
  "Add the 5 missing", "Add the 6".
- The stages and usual-tests lists print "1. Positioned and levelled2.
  Mechanically complete": each number runs into the item before.
- Set up's "PROGRAMS" heading sits on the board's bottom edge, and "Open
  Programs" is a big primary button for what is a link.
- One page has three names: "Today ›" on the front page, "The day" in the
  rail, and "Today" in the index.
- The plan's "done · 1 day late" spills out of its row, and a clipped "ct"
  shows beside bars that start before the window.
- The PDF preview is titled with a raw ID, and the commentary box is in a
  typewriter font.

## Flagged, not changed

Each of these is a simplification that could lose something, or is a
decision that is yours.

- **Two lists of programs** on the Programs page: the machine's own (its
  statuses and problems), and the Programs list at the foot (written · on
  the machine · proved, its test day). Merging them is the obvious move,
  but they hold different things, and the plan draws both. Kept.
- **"failed — done 9 Oct"** reads as a contradiction. It is your rule (8
  October: "it still got done on the date it got done"). Kept.
- **Duplicate routes** to things the rail already reaches: "Read the day"
  on three gates, "Dates" on Commission, "The plan ›" twice on the front
  page. Kept until you say.
- **Needs you on Install, Set up and Hand over** has no action button where
  Commission's has one. Adding "Done today" there would be a new control.
  Not added.
- **Line standard cards on Hand over** show "Delete" all the time, and the
  day shows Edit and Delete on every plan row. That is tools on every box
  rather than where the work is. Kept.
- **The day's bars** cover Install, Set up and Hand over, not Programs or
  Commission. Kept.
- **The plan's red diamond** ("something happened") stacks on today's line
  in a failure's colour. Kept.
- **The Programs tiles** colour "at baseline" and "passed" green (visual
  rule 3 says only the abnormal number carries colour). Kept.

## The backbone — what every Stage Gate screen now follows

1. **One shape for a gate**, in this order:
   - the title and one line of state, in words;
   - Needs you;
   - **Machine by machine**, with its one "Edit the stages" (or "Edit the
     usual tests") on the right of that heading, on every gate;
   - what else the gate keeps, folded until it has something.
2. **One panel.** Whatever you open — a stage, test, fix or problem, a
   machine, the stage list — opens in the same panel: from the right on a
   laptop, from the bottom on a phone. Its × is top right and its delete is
   in words at its foot.
3. **One way back.** ×, Escape, the dimmed page and the back button all
   close the top panel and leave you where you were. Back never leaves the
   page while a panel is open, and never needs pressing twice.
4. **Nothing typed is lost.** Cancel throws a change away and Save keeps
   it. Anything else — ×, back, another page — keeps it as typed, and it is
   there when you come back.
5. **One count, one word.** The rail, the page and the paper say the same
   number with the same word.
6. **The plan is a glance first.** It opens folded, every machine saying
   where it is, what is wrong and what is next. A machine unfolds with a
   tap, and the device remembers.
7. **Moving between gates is one flow.** The next gate draws at once from
   what the job already read, and refreshes underneath.

## Slices, each live on its own

1. **Ways out and edits.** One way back (sheets and panels answer the back
   button), nothing typed is lost (Edit, the problem form, Plan a fix), the
   machine and stage panels in the one panel, "Remove this machine" in
   words, the stage list and usual tests opening on the editor, and a
   material's Edit.
2. **Words and marks.** The rail's programs count, the phone card's "done
   late", the stage-list numbering, the Programs fold on Set up, "none",
   the plan's spilt and clipped labels, the commentary font, PDF titles,
   and one name for the day.
3. **One shape and one flow.** "Machine by machine" with its edit link on
   every gate, the empty filmed walk folded, gates drawing at once, the
   plan opening folded with each machine's next step, and the index
   listing the plan and saying who each document is for.

Each slice says, for anything it moves, what it was for and where it now
lives (CLAUDE.md: "Nothing is removed until we can say why it was there").

## What moved, and where it lives now (9 October, all three slices)

- **The machine panel and the stage list** were a box in the middle of the
  page (`ui/InstallGrid` Sheet). They now open in the one panel
  (`ui/DrawerShell`, moved out of `ui/RecordDrawer` so both can use it).
  Back closes them.
- **"Machine · edit stages"** in the board's corner (laptop) and **"Edit
  the stages"** under the cards (phone) became one **"Edit the stages"**
  beside the "Machine by machine" heading on Install, Set up and Hand over,
  where Commission already had "Edit the usual tests". The stage list
  opens on its editor. The columns not on the list ("Also on the grid")
  show under the editor too, so nothing is hidden by opening on it.
- **Commission's usual tests** opened as a block above the board, with a
  second "Edit" inside it. They now open in the one panel, on the editor.
- **The × beside a machine's name** (remove) became **"Remove this
  machine"** at the panel's foot. Its question now says the stages and
  tests stay, which is what removing does, and Undo still brings it back.
- **"Give the N new machines the M stages"** says it the way Commission
  does: "N machines have none of the stages yet — give them all the M".
- **Set up's "Programs" heading and its big "Open Programs" button**
  became one row, the door to the Programs page.
- **A material's name** was the only box that could be edited after
  adding, and it looked like plain text. One **Edit** on the row now opens
  every box Add asked for. The day it is due keeps its own box, which asks
  why when it moves later.
- **The plan** opened every machine on a desk. It now opens folded
  everywhere, each machine's header adding **"Next: …"**, with **"Open
  every machine"** beside "Go to today". A machine opened by hand stays
  open on that device, as before.
- **The empty filmed walk** on Install is folded until something is
  filmed. Its line says "nothing filmed yet".
- **Kept as typed** (`lib/kept`): a record's Edit, the problem form
  (writing and editing) and Plan a fix. Opening the record again opens the
  form with a quiet "Not saved yet — what you typed is back".
- **Back closes the top panel** (`ui/backCloses`): every bottom sheet, the
  machine panel, the stage list and the usual tests. Navigation waits for
  a closing panel's own back, so it never lands under it.
- **Gates draw at once.** The job's tests, materials, programs and the
  projects list keep their last reading (`useTesting`, `useMaterials`,
  `usePrograms`, `useProjects`). The next screen draws from it and reads
  again underneath, as before — but only while nothing has been written
  since that reading (`lib/heldReading`, `db/core dataVersion`). Found the
  same day: without that condition, a job made a moment before could read
  as missing, and its Programs page sent you to Materials.
- **Words.** The rail says "failed" for a failed program. The phone card
  says "4 done · 2 of them late". Commission says "no programs" and "Add
  the N missing tests". The day is "The day" wherever it is a door.
- **Marks.** The stage list's numbers sit with their own names. The plan's
  "done · 1 day late" stays on one line, and a bar before the window says
  its date at the edge ("‹ 1 Oct"). The commentary box uses the app's
  font. Every PDF carries its own title.
- **The Reports index** says who each document is for, and lists the
  plan's PDF.

## Decisions on the flagged items (Rowland, 9 October)

The live state before these decisions is kept on the branch
`rollback/before-flagged-decisions` (8d80618).

1. **Two lists of programs** — kept as they are. Not merged.
2. **"failed — done 9 Oct"** now reads **"Failed · closed 9 Oct"**, on the
   Programs page, the stage's parts, the plan and every report (one rule:
   `lib/noted partStatus`). Wording only. A failure still counts as done
   on its day, red, in the failed bucket — the 8 October rule is unchanged.
3. **Duplicate links** — left in place for now.
4. **Commission's Needs you button on Install, Set up and Hand over** —
   checked row by row, and **not added**, because no Commission button
   fits a stage's row without changing what it does:
   - **A late stage.** Commission's own late rows ("was due 4 Oct") carry
     no button, so Install, Set up and Hand over already match it.
   - **A stage that hit a problem.** The nearest Commission button is
     "Plan the re-test". It makes a second record named "… — re-test".
     The board finds a stage by its name, so that record would land as a
     stray column ("Also on the grid") beside every stage. A stage has no
     re-test: it is finished on its own record ("Done today"), and a
     problem on it gets a fix. Unsafe — not added.
   - **A program that failed, on Set up.** "Plan the re-test" works on a
     test, not on a part. A part is re-done by saying its next status on
     the same line. "Plan its test" plans a proving test for a program
     that has none — Commission already offers it for exactly those, and a
     failed part may already have one. Different behaviour — not added.
   - **A stage worked on but not marked done.** This matches Commission's
     "ran — passed?" row, but that row's "Didn't pass" is not a state a
     stage has, and these stages are not in a gate's Needs you today.
     Not added.

   The nearest safe actions — "Done today" on a late stage, "Plan a fix"
   on a stage that hit a problem — are already the stage's own buttons in
   its panel. Putting them on the Needs you row would be a new control,
   so that is yours to decide.

   **Decided and built, 9 October** (with the handover, docs/HANDOVER.md):
   those two, the stage's own buttons, now sit on the Needs you row on
   Install, Set up and Hand over, in Commission's place and look, for
   owner and team. A part that failed still opens its stage.
