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
| Control room | at #/room since 18 October (home became the front door) · its heading · Your factory · this week · the jobs' timeline (desk) · what each number in the band is of · what the slips cost · the closing line (17 October, the lean page slice 5: the band's numbers stay its filters and say what they are of; the money is every running job's days past its agreed handover × a day of its lines not making, from Your factory) |
| Your factory | the tiles — lines, problems open, late, critical when there is one, a day of the factory in margin · the lines in floor order (each priced line's day in margin on its row) · the closing line (17 October, the lean page slice 5b: a day of every line's speed × its shifts × its margin a pack, from the factory's own facts; a line with something unsaid named in the tile) |
| A line — its own page | the line, machine by machine: the sentence, a card a machine (its problems by priority, whose, its stops a week in minutes and £, the constraint) · Time a stop, first in the header · Stops timed first among its tools — the stopwatch and its Pareto (16 October, docs/UPGRADE-AUDIT.md F1: the floor's own tool had no door from the line) · the five tiles — problems open, programs proved, products ready, stops timed, a day of the line in £ · its products, a row a product with its four answers (program proved, line standard, capacity, changeover timed) · Line report · the closing line (17 October, BLUEPRINT Stage 3: the line is the hub — the page in §3's order, its facts last) |
| Programs | machine by machine · a row a program |
| Programs — a stage-gate job | the programs in a sentence · the states worth showing, each a filter · a row a program, machine by machine · how its test went, on its row · a program added to a machine (16 October, docs/STAGEGATE-UX.md: the eight tiles became the chips worth showing, the machine chips a select, the Programs list folded at the foot went — every field is on the row) · the closing line (17 October: its counted figures are its chips, each a filter, so no second row of tiles) |
| Problems | the register · the closing line — the worst open problem and where it is (17 October, the lean page: its chips are its tiles, each a filter; its paper prints them as tiles) |
| A stage-gate job | the verdict · the band's five tiles (desk; on a phone the band keeps the answer and the status report, the phone pass of 5 October) — handover, late of what is still to do, critical, fixes open, what the slip costs (17 October: the same five the one-page status and the full report count, docs/LEAN-PAGE.md; Outstanding is Late's "of" now, not a tile of its own) (the case for the change was under the band 17 October and taken off the same evening: Rowland, "a tool for a one man consultant — if we do all 6 it becomes a full business tool, so don't do any of them") · Needs you · where each machine is · its machines in the rail, each a page (desk) |
| A machine — its own page | its four gates in a row · its stages and tests, gate by gate · its programs (16 October, docs/STAGEGATE-UX.md slice 3: a machine's name opens this page, not a drawer over the page it was named on) · the five tiles — gates through, late, fixes open, no fix yet, what the slip costs · the closing line (17 October, the lean page: the stage gate's pages, a machine's own among them) |
| Commission | the plan's tabs, Commission on · the five tiles — passed of the tests, didn't pass, didn't run, still to run, what the slip costs (17 October, the lean page: the header's counts moved into them, one place) · Needs you · the board (desk) / a card a machine (phone) · the closing line |
| Install (and Set up, Hand over) | the plan's tabs · the five tiles — done of the steps, late, problems, not added yet, what the slip costs (17 October: the header's counts moved into them) · Needs you · the closing line |
| Problems — a stage-gate job | the five tiles — open, critical, late, no fix yet, what the slip costs (17 October: the header's count moved into them; the rail's tally is the Open tile) · the closing line |
| Materials | the five tiles — here of what is needed, late, waiting, no date, what the slip costs (17 October: the header's count moved into them) · what we are waiting on, a row a material · the closing line |
| The day | the update to send, at the top · the tiles — done, late, went wrong, found, what the slip costs · the closing line (17 October, the lean page slice 5c: the day's story counted, as its fold line and its paper count it) |
| The plan | the Gantt · the plan's tabs, Timeline on (16 October: the four gates and the timeline are one Plan in the rail, its tabs on each) · the tiles — done of the dates, late, still ahead, waiting on a verdict when any, what the slip costs · the closing line (17 October, the lean page: the header's count line, "29 dates · 11 done · …", moved into the tiles — one place, as on the gates' tabs; what is not on the plan yet stays said under the title) |
| A 6M job | the verdict · the band's five tiles (desk) — the gap, problems, roots found, countermeasures, holding (17 October, the lean page: the 6M report's own, lib/sixmLean; the band's two — outstanding and late — were the board's actions, and the countermeasures tile carries them) · the fishbone drawn |
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
| Loss count | the waterfall drawn · what it says · the band, the five tiles, the top causes, the action plan, the closing line (17 October: the lean page, docs/LEAN-PAGE.md — the tiles took the strip's place, every figure it held among them) |
| Work sampling | the band · the five tiles, in the strip's place — taps, people, the biggest share not the work, what it costs a shift (that share × the shift × one person's rate from Your factory), the next moment · the round · the action plan · the closing line (17 October, slice 6) |
| Capability study | the band with the verdict · the tiles, in the strip's place — readings of those agreed, the mean and range, outside, Ppk with Cpk · the readings drawn · the action plan · the closing line (17 October, slice 6) |
| The front door | home, #/ since 18 October (the control room at #/room) · What do you need to get done? — the question first, the box to say it in (the new product's starting point — Rowland, 18 October: "a conversational starting point where users describe the manufacturing outcome or system they need") · what is under way, every project in a line · the library to start from — Faultline's eleven and its established three (the lever tree among them, 18 October) · the tools to use on their own · the new product's places, Home first · at its foot, as the control room's foot did while it was home: installing, signing in, and backup trouble in words (a row the cloud refused, a file too big for it) — each said only when there is something to say (18 October; sync-two-devices 6 and 8 read it) |
| Methods | a card a method (18 October, the platform's slice 3: methods of one's own, written, approved and run — docs/PLATFORM-STATUS.md) · Describe what you need — the studio (18 October, the vision slice) · Faultline's library, eleven methods (Bring a line to its rate, on Line capacity, added 18 October; Rejects, logged and halved — a tool made from blocks, a log with its Pareto, trend and figure a day — added 18 October; A process held in control — statistical process control made of blocks, the control chart with its signals, the spread, the shape and the relationship with line speed — added 18 October; Breakdowns, read for when the next one comes — reliability, a Weibull fit of the hours between failures, written from its brief — added 18 October; Short stops, timed as they are cleared — a log whose time is taken with a tap, Start and Stop, Lap for the next — added 19 October; Seal failures, traced to what drives them — several conditions read together, each with the others held still, a trial proved better against the first log — added 19 October), each to adapt or use as it is · Faultline's established methods — the stage gate, 6M and the lever tree, each on its own screens, started as a job (18 October, one way to start) · find a method by a word · What Faultline cannot do yet — when a method has said a need: each need once, the methods that asked it, and the brief to build it, copied whole (18 October, lib/flow/needs; designed-tool 8p–8r — the seed has no need, so the inventory does not look for it) |
| New job | what you need, in your words, first — taken to the studio with the line (18 October, one way to start: "the conversational home should be the natural starting point") · Faultline's established three, each on its own screens · the library — your approved methods, then Faultline's eleven |
| Design a method | what you need, in your words · the library to start from, closest to the words (the vision slice — Rowland, 18 October: "The user describes what they want. Faultline helps design it") |
| Design a method — from Faultline's SMED method | the conversation · the method as it stands, its four stages · what it measures, before and after · Approve it and start a project |
| Video studies | a row a study — its standing, its kind, its footage and line · New video study (18 October, docs/VIDEO.md) · Can this phone film a long study? (19 October, docs/VIDEO-FEASIBILITY.md) |
| Can this phone film a long study? | its question · what this phone offers — what it films, the screen, room, the battery · how long, two minutes to an hour · Start the test; then, as it runs, the camera's picture in thirds, the time, the reading's rate, the clips, the camera's word, the screen; and after, the answer and a line an ability (reading as it films, clips, the camera, the screen and the app, room, the battery, saving as it goes), Copy results, the last clip, a row a minute (19 October; acceptance/video-check.mjs drives the run — the inventory sees the page before it) |
| A video study | where it stands, never "verified" while one is to review · the footage and its facts, and where the footage is (on this device only, waiting to go up, in the cloud, or over what the cloud takes) · the stations in view · every event on its station's lane · every event listed with how it is known and what was decided · each station's work, cycles and waiting · each station's workload drawn, work and waiting · the people's work stacked against takt · what it says, each line saying measured, worked out, proposed or not known · asked in words · the report (18 October, docs/VIDEO.md) |
| A method made of logs | a step that is a log — its columns and what it works out (18 October: a tool made from blocks, lib/flow/analysis) · what it measures, fed by the two logs |
| A method from Faultline's library | a step done with one of the app's tools · what it measures |
| A project on SMED's method | the measure, the first tile · what it measures — before → now, its readings |
| A method | its stages, a step a line in words · what each gate needs · the projects on it · Change it with the assistant — the next version proposed, every change said in a line (slice 5) |
| A method — a draft | can it run? — the validator's words, what to put right before Approve |
| A project on a method | the band · the five tiles — steps done, gates passed, late, did not pass, problems open · its stages in a strip, each in its colour and word · the stage's steps, machine by machine · its gate in a line · the action plan · the closing line · its stages in the rail (desk) · Ask about it — the four questions the app answers itself, the rest by the assistant from the project's facts, each sentence saying how it is known (slice 5) · what has happened — its activity log |

The paper is held the same way by `scripts/report-stress.mjs` (every fact on
every report, at three sizes and forty random jobs) and the acceptance scripts.
