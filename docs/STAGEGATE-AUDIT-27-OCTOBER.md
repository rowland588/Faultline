# Stage gate — navigation and screen audit, 27 October

Rowland, 27 October: *"i want a full navigation audit done on the stagegate ...
everything ... goal, clean, obvious simple navigations, nothing messy .. same
with the Ui run at the same time a full UI audit same principles"*.

**Findings only — nothing changed.** Published for his decision:
https://claude.ai/artifact/RvyLCvyBrtQjoxvyDPP8my (the same findings, with
screenshots). Walked on main 9638dcc against the seeded commissioning project
at 1360×900 and 390×844: 25 pages, about 760 controls pressed (nothing that
deletes or signs), no console error, no page wider than a phone.

The yardstick: you always know where you are; a page has one name; one obvious
way to each place; opening something never takes you out of the project without
meaning to; nothing said twice; plain words.

## Done since (27 October, the navigation batch — Rowland: "All of it")

- **N2 done:** the project's tabs are Now · Plan · Machines · Problems · Reports · More; Plan holds Install, Set up,
  Commission, Hand over, the timeline and Programs, their row only on Plan's pages; Now has no second row and lights
  only on the front page and the doors from it (Today, Journey, Actions).
- **N1 in part:** one row of tabs on Now; Plan's own row stays on its pages.
- **N3 done:** a machine opened from a project is the one machine page in the project's frame, *‹ Machines* back to
  the project's, *on Line 7 ›* to the line's.
- **Every page below a tab says ‹ Back to it:** a machine (‹ Machines), a test (‹ Commission), a fix (‹ Problems),
  the Journey and Actions (‹ Now).
- **A program opens where you press it:** a line's Programs shows a stage-gate project's programs in place under
  their machine (*Being proved in …*), tested there; the line's link to every line's programs is gone.
- **The context bar names the factory's old lists for what they are** (Factory › Problems, never "Overview").
- Still open: N4–N10 and the screens' findings below.

## Navigation

| # | | Finding | Fix |
|---|---|---|---|
| N1 | high | Four layers of navigation on every project page (desk: left menu, breadcrumb, the project's tabs, a second row of tabs; phone: breadcrumb, two rows, bottom bar — the page starts ~185px down) | two layers: where you are, and the project's tabs |
| N2 | high | *Now* means two things — the top tab stays lit on Install, Set up, Commission, Hand over, Timeline, Programs, Journey and Actions, while the second row has its own *Now*; "Now" three times on the front page | a **Plan** tab holding Install · Set up · Commission · Hand over · Timeline · Programs; Now lights only on the front page (D1) |
| N3 | high | A machine opened from a project (Now, Machines, the Commission grid, Programs) lands in the line's frame — *Factory › Line 7 › Machines* — and the project's tabs are gone; back works | the one machine page drawn in the project's frame when reached from the project; *On Line 7 ›* opens the line (D2) |
| N4 | med | One page, several names: the gates' and the timeline's breadcrumb says *The gates* (a name nowhere else); the timeline is Timeline · The plan · The gates; *Line 2 commissioning — problems*; *Project details*; Today says Journey | one name a page, the tab's |
| N5 | med | On a phone the bottom bar inside a project is the app's (Factory · Projects · ＋ · Tools · More) with Projects lit, the project's tabs a row at the top | inside a project the bottom bar is the project's tabs (D3) |
| N6 | med | *Machines 9 · 4 late* with 3 machines — the 9 is open gate steps | *Machines 3*; the steps on Plan |
| N7 | med | Reports is a sheet from its tab but lit as a page on the client report; Report ▾ on every page; the left menu's Reports means the factory's | Reports a page of every paper; *Factory reports* in the left menu |
| N8 | med | Now has three links to the same Journey (*Today — plan for today ›*, *see the day ›*, *Any dates ›*); Journey and Actions light Now | one link a section |
| N9 | low | Problems' *the factory's Problems ›* opens #/snags, which the Factory no longer offers (27 October, MAP.md) | *This line's problems ›* |
| N10 | low | STAGEGATE-PATH.md §2 still names Factory › Machines and Factory › Programs | rewrite §1–§2 with the shape chosen |

## Screens

| # | | Finding | Fix |
|---|---|---|---|
| U1 | high | The fifth tile on eight pages is an instruction — *A DAY LATE — give Line 7 … its speed, its shifts and its margin a pack on the Factory's Lines page* | off while unknown; said once on Now and Details |
| U2 | high | Now says *Behind target* three times (the line under the title, the box, the closing line); the handover tile's 23 Nov beside the agreed 15 Nov with neither named | the box only; *expected 23 Nov · agreed 15 Nov* |
| U3 | high | Actions 7,173px and 137 controls; Journey 3,676px; the machine page 2,955px; Now 2,529px; the Factory 4,011px on a phone | the first answer and the abnormal; lists past eight fold |
| U4 | med | The machine page: *Remove this machine* and the closing line mid-page with five sections below; *Its climb to rate* then *THE CLIMB TO RATE* | its order fixed; Remove in More ▾; one heading a section |
| U5 | med | A gate's name on a state colour (*Set up* on red on Now's machine rows); *Set up 3 of 3 done* violet, not green | the gate in plain text, only its state coloured |
| U6 | med | A test's drawer holds about 30 controls | the four results, Hit a problem, then More ▾ |
| U7 | med | Grids of blanks — unlabelled *+* and *no day yet* ×18 on Commission | an empty cell a quiet dash |
| U8 | med | *— PDF* on two buttons, *Back to the control room*, *Not synced yet on this device* in the timeline's toolbar, colours read out as hex codes on Details | the paper's name; Factory; sync in its one place; colour names |
| U9 | med | Actions dressed as links — *Give it every gate's list at once* creates about 20 steps from blue text in a sentence | a button that says how many: *Add the usual 20 steps* |
| U10 | low | Three list styles on Now | one row style |
| U11 | low | The timeline's toolbar of seven controls; its key under the chart, covered by the download notice | two choices; the key above |
| U12 | low | On a phone the project's name is cut (*Line 2 …*); Report ▾ takes its own row | the name in full; Report ▾ beside the heading |

## Decisions for Rowland

- **D1** — a Plan tab for the gates, timeline and programs (recommended).
- **D2** — a machine opened from a project stays in the project's frame (recommended).
- **D3** — on a phone, inside a project, the bottom bar is the project's tabs (recommended).
- **D4** — the rest as listed, in two slices: words and tiles first, then page order and folds.

Nothing is built until he says which.
