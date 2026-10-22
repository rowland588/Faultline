# What each page must show — the app's memory of itself

Rowland, 15 October 2026, after the V-curve went missing from Line capacity
for several lines and no check noticed:

> "How do we stop ourselves from making such errors, removing graphics, etc.,
> that were once there without being told?"

and, told that the builder keeps no memory between sessions — only what is
written in the repo survives:

> "Yes, of course, I want the memory written in. So then we would always look
> to see what is built and then how."

## The rule

**What a page shows is written down, and checked in every gate.** The list is
`scripts/inventory/pages.mjs`: each page, where it is on the seeds, and the
things a person sees on it — the verdict, the V-curve, the board, the sheet —
each as a selector that must be on the screen with a size, at desk and at
phone width (`desk:` / `phone:` where the two differ by design: the V on its
side on a phone, Commission a card a machine). `node scripts/inventory.mjs`
opens every one and fails when one is missing.

So:

1. **A removal is a decision someone wrote down.** Taking a thing off a page
   means taking it off the list in the same commit, with the reason in the
   commit (CLAUDE.md, rule 1 — *nothing is removed until we can say why it was
   there*). A thing that disappears by accident fails the gate.
2. **A new page, or a new shape of the data, adds its lines.** Two lines into
   one wrapper and a map with long notes were added the day they were built;
   the seeds carry them (`src/dev/capacitySeeds.ts`, huge) so every gate
   draws them.
3. **A check tests what the eye sees** — the drawn V (`svg.vc-svg`), not the
   section it sits in. The V went missing behind a check that counted its
   sections.
4. **Before shipping, look at what changed.** `node scripts/inventory.mjs
   --shots DIR` takes a picture of every page on the seeds, the clock held
   still; taken on what is live (a server on `origin/main`) and on the change,
   `--compare OLD NEW` lists every page that moved and by how much, side by
   side in `NEW/compare.html`. Every page on that list is looked at, and the
   commit says what changed on it and why.

## The pages (scripts/inventory/pages.mjs is the source)

| Page | Must show |
|---|---|
| Control room | at #/room since 18 October (home became the front door) · its heading · Your factory · this week · the projects' timeline (desk) · what each number in the band is of · what the slips cost · the closing line (17 October, the lean page slice 5: the band's numbers stay its filters and say what they are of; the money is every running project's days past its agreed handover × a day of its lines not making, from Your factory) |
| Your factory | the tiles — lines, problems open, late, critical when there is one, a day of the factory in margin · the lines in floor order (each priced line's day in margin on its row) · the closing line (17 October, the lean page slice 5b: a day of every line's speed × its shifts × its margin a pack, from the factory's own facts; a line with something unsaid named in the tile) |
| A line — its own page | the line, machine by machine: the sentence, a card a machine (its problems by priority, whose, its stops a week in minutes and £, the constraint) · Time a stop, first in the header · Film the line — the filmed walk and its marked frames, opened from the line with no project (20 October, docs/DIRECTION.md: where Faultline began, and only a project's pages had a door to it) · Stops timed first among its tools — the stopwatch and its Pareto (16 October, docs/UPGRADE-AUDIT.md F1: the floor's own tool had no door from the line) · the five tiles — problems open, programs proved, products ready, stops timed, a day of the line in £ · its products, a row a product with its four answers (program proved, line standard, capacity, changeover timed) · Line report · the closing line (17 October, BLUEPRINT Stage 3: the line is the hub — the page in §3's order, its facts last) |
| Programs | machine by machine · a row a program |
| Programs — a stage-gate project | the programs in a sentence · the states worth showing, each a filter · a row a program, machine by machine · how its test went, on its row · a program added to a machine (16 October, docs/STAGEGATE-UX.md: the eight tiles became the chips worth showing, the machine chips a select, the Programs list folded at the foot went — every field is on the row) · the closing line (17 October: its counted figures are its chips, each a filter, so no second row of tiles) |
| Problems | the register · the closing line — the worst open problem and where it is (17 October, the lean page: its chips are its tiles, each a filter; its paper prints them as tiles) |
| A stage-gate project | the verdict · the band's five tiles (desk; on a phone the band keeps the answer and the status report, the phone pass of 5 October) — handover, late of what is still to do, critical, fixes open, what the slip costs (17 October: the same five the one-page status and the full report count, docs/LEAN-PAGE.md; Outstanding is Late's "of" now, not a tile of its own) (the case for the change was under the band 17 October and taken off the same evening: Rowland, "a tool for a one man consultant — if we do all 6 it becomes a full business tool, so don't do any of them") · Needs you · where each machine is · its machines in the rail, each a page (desk) |
| A machine — its own page | its four gates in a row · its stages and tests, gate by gate · its programs (16 October, docs/STAGEGATE-UX.md slice 3: a machine's name opens this page, not a drawer over the page it was named on) · the five tiles — gates through, late, fixes open, no fix yet, what the slip costs · the closing line (17 October, the lean page: the stage gate's pages, a machine's own among them) |
| Commission | the plan's tabs, Commission on · the five tiles — passed of the tests, didn't pass, didn't run, still to run, what the slip costs (17 October, the lean page: the header's counts moved into them, one place) · Needs you · the board (desk) / a card a machine (phone) · the closing line |
| Install (and Set up, Hand over) | the plan's tabs · the five tiles — done of the steps, late, problems, not added yet, what the slip costs (17 October: the header's counts moved into them) · Needs you · the closing line |
| Problems — a stage-gate project | the five tiles — open, critical, late, no fix yet, what the slip costs (17 October: the header's count moved into them; the rail's tally is the Open tile) · the closing line |
| Materials | the five tiles — here of what is needed, late, waiting, no date, what the slip costs (17 October: the header's count moved into them) · what we are waiting on, a row a material · the closing line |
| The day | the update to send, at the top · the tiles — done, late, went wrong, found, what the slip costs · the closing line (17 October, the lean page slice 5c: the day's story counted, as its fold line and its paper count it) |
| The plan | the Gantt · the plan's tabs, Timeline on (16 October: the four gates and the timeline are one Plan in the rail, its tabs on each) · the tiles — done of the dates, late, still ahead, waiting on a verdict when any, what the slip costs · the closing line (17 October, the lean page: the header's count line, "29 dates · 11 done · …", moved into the tiles — one place, as on the gates' tabs; what is not on the plan yet stays said under the title) |
| A 6M project | the verdict · the band's five tiles (desk) — the gap, problems, roots found, countermeasures, holding (17 October, the lean page: the 6M report's own, lib/sixmLean; the band's two — outstanding and late — were the board's actions, and the countermeasures tile carries them) · the fishbone drawn |
| The 6M board | the six bones |
| The Pareto | the ranked losses |
| The lever tree | the tree drawn |
| Line capacity — what a line can make | the answer first · theoretical / demonstrated / plannable · ask · where the time went · where and when it stops (machine × day) · the week, to send · will next week's orders fit |
| Line capacity — one line | the band with what limits the line · the five tiles · the closing line (17 October, the lean page) · what the sums say · what the bottleneck costs a pack (17 October) · the stations on the left · beside them, the line drawn and what each station can do (units a minute) · the V (desk) / on its side (phone) · the sheet · labour |
| Line capacity — two lines into one | the sums · how many lines feed in (step 1) · the lines drawn meeting, a column a line (the chip map's replacement, 16 October) · the way to the target · a V and a sheet a line and where they merge |
| Line balance — one product | the band · the five tiles, in the strip's place (17 October, the lean page — every figure the strip held among them) · the closing line · each person's work stacked against takt · each person, where they work on the line and their cycle as a bar against their takt · what the bottleneck costs (or what it needs) · Time — each person (17 October: its own page, it was Line capacity's People tab; the old address opens it) |
| Line balance — every product | each product with its balance said (17 October: its own tool in the rail) |
| All together — one product | the band · the five tiles, each tool's own figure · the closing line (17 October, the lean page) · each tool's sentence (Line capacity, the line balance, the line standard) · the line station by station, who works there · the line standard's card · each person against takt (17 October: Rowland, "the option to do it all together") |
| Line standard | the board · who does what |
| Line standard — long notes | the board · the bottleneck said first · words up a tall shape |
| Value stream | the band with the lead time · its seven cards (its tiles, in the method's colours) · the grid · the action plan · the closing line — the lead time, where to start, a cycle over takt (17 October, the lean page slice 6) |
| SMED | the band · the five tiles, in the strip's place — now, inside the stop, planned to, a week (or year) stopped in packs and £, what the plan buys back · the grid · what it says · the action plan — what was raised from an element, then each element's plan · the closing line (17 October, the lean page slice 6: every figure the strip held among the tiles — the rungs in Planned to, the week stopped with its money — and the verdict on the band) |
| SMED inside a project | the project's rail (21 October, docs/PROJECTS.md P2: a tool opened from inside a project keeps the project's rail) · whose — the project's own, everything on its lines, every line · the project's own SMED |
| Actions — a stage-gate project, a 6M project | the six tiles — open, late, this week, nobody yet, no date, done this week · seen by who, when or where · a group a person, each row what, its kind and priority, where, why, by when · the closing line (21 October, docs/PROJECTS.md P3: the team's action tracker) |
| Every action — the control room | the six tiles · seen by who, when, where or project · every project's actions, each row marked with its project, and every line's own problems under no project · the closing line (21 October, docs/PROJECTS.md P4) |
| Loss count | the waterfall drawn · what it says · the band, the five tiles, the top causes, the action plan, the closing line (17 October: the lean page, docs/LEAN-PAGE.md — the tiles took the strip's place, every figure it held among them) |
| Work sampling | the band · the five tiles, in the strip's place — taps, people, the biggest share not the work, what it costs a shift (that share × the shift × one person's rate from Your factory), the next moment · the round · the action plan · the closing line (17 October, slice 6) |
| Capability study | the band with the verdict · the tiles, in the strip's place — readings of those agreed, the mean and range, outside, Ppk with Cpk · the readings drawn · the action plan · the closing line (17 October, slice 6) |
| Reliability study | the band · the watch — Start and Stop, the watched time ticking — and a button for each thing counted, all on the one watch (21 October: "a person stood at a machine, tapping a button every time an event happened ... a clock watch I can stop and start"; 22 October: "three buttons ... three data sets going on") · counted side by side, a row each with its MTBF, and each a chip away · the one seen: the five tiles — MTBF with its 90% bounds, the failure rate, watched time, its taps, what it costs · what it means · its taps against watched hours, the other counts drawn beside them · the gaps between them · what it costs in money · the days · the commentary · the closing line (docs/TOOLKIT.md, tool 13). Taken off 22 October: *what the events were* (a bar a kind) — the set-up's *What can one be?* went at Rowland's word ("I don't know what that is"); each thing counted is its own button with its own figures now, and a study made before still shows its kinds |
| The front door | home, #/ (the control room at #/room) · What do you need to get done? — the question first · Line Talk — start one, or carry on the latest (20 October: "I open Faultline, talk or type") · what is under way, every project in a line · the three kinds of project — stage gate, 6M, lever tree · the tools to use on their own · Home first in the rail · at its foot: installing, signing in and backup trouble said only when there is something to say (sync-two-devices 6 and 8 read it), (20 October, docs/DIRECTION.md: the box to say a need in words, the library of methods and the switch that showed them are taken off — the method builder was deleted, never used, at Rowland's word: "the only AI is the voice and the camera video system") |
| New project | Faultline's three kinds of project, each from its situation (20 October: the words box and the library of methods taken off with the method builder — docs/DIRECTION.md) |
| Video studies | a row a study — its standing, its kind, its footage and line · New video study (18 October, docs/VIDEO.md) · Can this phone film a long study? (19 October, docs/VIDEO-FEASIBILITY.md) |
| Can this phone film a long study? | its question · what this phone offers — what it films, the screen, room, the battery · how long, two minutes to an hour · Start the test; then, as it runs, the camera's picture in thirds, the time, the reading's rate, the clips, the camera's word, the screen; and after, the answer and a line an ability (reading as it films, clips, the camera, the screen and the app, room, the battery, saving as it goes), Copy results, the last clip, a row a minute (19 October; acceptance/video-check.mjs drives the run — the inventory sees the page before it) |
| New video study | what do you want to find out · the study, read from the words or picked · how to film it, before the footage — where the phone goes and never, how long from the cycle, the phone, the people, what it will tell you (19 October, docs/VIDEO-DESIGN.md D1, D5) · the footage; once picked, where the phone was and whether the footage is fit, looked at as it comes in (acceptance/video-fit.mjs drives it — the inventory sees the sheet before the footage) |
| A video study | where it stands, never "verified" while one is to review · the footage and its facts, and where the footage is (on this device only, waiting to go up, in the cloud, or over what the cloud takes) · is this footage fit for the study — the verdict, what is not fine, the rest folded into one line, what this footage can tell you (measured, worked out, interpreted, not from footage), how to film it (19 October, docs/VIDEO-DESIGN.md D6) · the stations in view · every event on its station's lane · every event listed with how it is known, what was decided and each end's ± · an event the footage flags (the camera shook, moved, the light jumped) · each station's work with its ±, cycles of those needed and no movement between · each station's workload drawn, work and no movement · the people's work stacked against takt · what it says, each line saying measured, worked out, proposed or not known · asked in words · the report (18 October, docs/VIDEO.md) |
| Line Talk | its name · Start a Line Talk on the line (or Which line, from Tools) · every talk on the line, newest first, what was said in a line — pieces and minutes, photos, typed, what waits or failed (20 October, docs/LINE-TALK.md slice 1; the intro says the box since 21 October) |
| A Line Talk | where it is — the line, every Line Talk · what was said in a line, its answers and document counted · what Line Talk knows — the line's records in a line, opened to read them whole · every turn in the order it happened — a piece said with its recording, a photo where it was taken with its label (P1, P2 …), a line typed, Line Talk's answer · a correction over what was heard, "As heard" kept beside it · a piece not written down, why, the recording kept, typed over with Correct · a piece written down with no recording, its words alone · an answer's words as written — growing in its turn as they are written, with a caret, until the finished answer is kept (21 October, *Talking with it*) — a document it wrote as a card to open, edit and print, a figure it was not given said to check · the box, as a chat's: Photo · typing into it · the microphone (the words come up in the box as they are said) · Send · the four shortcuts to the usual documents · how, in a line under the box (20 October, docs/LINE-TALK.md slice 1 and slice 2 — ask it; 21 October, *The box, like a chat*: Talk, Pause, Continue, the clock and the words under them taken off at Rowland's word — "I see my words come up on the interface. I simply press send" — the microphone in the box in their place, and Reply folded into Send; acceptance/line-talk.mjs and line-talk-assistant.mjs drive it) |
| A Line Talk document | where it is, back to the talk · a figure Line Talk was not given, said to check · its sections, each with its words, its points — each saying where it comes from (Observed, Faultline record, Assessment), with an owner and a due date where said — and its photos with their labels and captions, all edited where they stand · Save as PDF · As Line Talk wrote it (20 October, docs/LINE-TALK.md slice 2) |

**Taken off on 20 October** with the method builder (docs/DIRECTION.md —
Rowland: "the only AI is the voice and the camera video system"; asked, he
chose to delete it; the live database held 0 methods and 0 method records):
Methods (#/methods), a method and its draft, Faultline's library methods,
a method made of logs, the design studio (#/design) from nothing and from
SMED's method, a project on a method and on SMED's method, the assistant's
Ask on one, and the "parked builder shown" front door and New job. An old
link to #/methods or #/design lands on the front door (the smoke test opens
both).

**Renamed on 21 October** (docs/PROJECTS.md, P1 — Rowland: "I don't think a
job should exist ... a project is the project"): every page that said *job*
says *project* — New project, a stage-gate project, a 6M project and their
Programs and Problems. Nothing on them was taken off; the smoke test fails
if *job* comes back on a screen.

The paper is held the same way by `scripts/report-stress.mjs` (every fact on
every report, at three sizes and forty random jobs) and the acceptance scripts.
