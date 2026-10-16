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
| Control room | its heading · Your factory · this week · the jobs' timeline (desk) |
| Your factory | the lines in floor order |
| A line — its own page | the line, machine by machine: the sentence, a card a machine (its problems by priority, whose, its stops a week in minutes and £, the constraint) |
| Programs | machine by machine · a row a program |
| Programs — a stage-gate job | the programs in a sentence · the states worth showing, each a filter · a row a program, machine by machine · how its test went, on its row · a program added to a machine (16 October, docs/STAGEGATE-UX.md: the eight tiles became the chips worth showing, the machine chips a select, the Programs list folded at the foot went — every field is on the row) |
| Problems | the register |
| A stage-gate job | the verdict · Needs you · where each machine is |
| Commission | the plan's tabs, Commission on · Needs you · the board (desk) / a card a machine (phone) |
| The plan | the Gantt · the plan's tabs, Timeline on (16 October: the four gates and the timeline are one Plan in the rail, its tabs on each) |
| A 6M job | the verdict · the fishbone drawn |
| The 6M board | the six bones |
| The Pareto | the ranked losses |
| The lever tree | the tree drawn |
| Line capacity — what a line can make | the answer first · theoretical / demonstrated / plannable · ask · where the time went · where and when it stops (machine × day) · the week, to send · will next week's orders fit |
| Line capacity — one line | what the sums say · the stations on the left · beside them, the line drawn and what each station can do (units a minute) · the V (desk) / on its side (phone) · the sheet · labour |
| Line capacity — two lines into one | the sums · how many lines feed in (step 1) · the lines drawn meeting, a column a line (the chip map's replacement, 16 October) · the way to the target · a V and a sheet a line and where they merge |
| The work against takt | each person's work stacked against takt |
| Line standard | the board · who does what |
| Line standard — long notes | the board · the bottleneck said first · words up a tall shape |
| Value stream · SMED | the grid (and SMED's sentence) |
| Loss count | the waterfall drawn · what it says |
| Work sampling | the round |
| Capability study | the readings drawn |

The paper is held the same way by `scripts/report-stress.mjs` (every fact on
every report, at three sizes and forty random jobs) and the acceptance scripts.
