# The map — how you get around Faultline

Rowland, 27 October: *"My line is my home page ... if I go to a line, line 2A, I
should be able to then navigate everything from this page ... We've been
overcomplicating things and it's been there in our face all the time."* Shown
the drawing (artifact *The Line Is Home*), he said: *"do it"*.

**This page is how you get around.** Where an older document says otherwise
(BLUEPRINT §3–4 on pages, STRUCTURE's menus, PROJECTS, STAGEGATE-PATH §2, the
other STAGEGATE documents, FLOW, SIMPLE and PANELS), this page wins. A change to
a door changes this page first, in the same commit. The map it replaces is
`docs/history/MAP-before-27-October.md`.

## The rule

- **A machine, a program, a problem, a study or a stop lives on its line.** Its
  page is the line's. Nothing physical has a page anywhere else.
- **A project is work on a line.** Its own pages are its work (Now, Plan — the
  gates, the timeline and its programs — Actions, the problems found on it,
  Reports). Its line opens the line; its machines open the machine's one page.
- **You stay where you pressed** (27 October — Rowland: *"I can't actually go
  back ... I have to click factory"*; *"None of that should be there ... I
  can't go back out"*). A machine opened from a project is the same one page,
  drawn in the project's frame with the project's Machines lit; its eyebrow
  (*on Line 2a ›*) opens the line's own frame of it. A program pressed on a
  line's Programs opens there, on the line, never in a project's pages. A
  page below a tab says *‹ Back to* the tab's page above its title. There is
  one row of tabs: the project's (Now · Plan · Machines · Problems · Reports ·
  More); the gates, the timeline and Programs are Plan's own row, shown only
  on Plan's pages.
- **The Factory is the board of lines.** It counts the lines and opens them,
  lists the projects, sets up the lines, and holds the tools library and the
  factory's reports. It does not list any line's machines, programs or
  problems itself.
- A new page is never added at the Factory or in a project for something that
  lives on a line.

## The places

| Place | Address | What is on it |
|---|---|---|
| **Factory** | `#/room` | the board: a card for each line, showing where it stands in a word and its colour, its worst problem, who has it and when it's due, and its projects; then the projects |
| Factory › **Set up** | `#/factory` | the lines themselves: add, name, type, order, archive, merge |
| Factory › Projects | `#/projects` | every project |
| Factory › Tools | `#/tools` | the library of tools |
| **A line** (home) | `#/lines/:ws` | Overview · Machines · Problems · Programs · Tools · Set up (also Logs and Projects); Report ▾: the line report, every machine in full, the problems |
| **A machine** (one page) | `#/lines/:ws/machine/:name` | while a stage-gate project works on it, the project's part first (where it's up to, its gates, what's open, its tests, its programs); then every project on it, the line's own programs, its problems, studies and stops; Report ▾: the machine in full |
| **A project** | `#/project/:id` | its work; its line opens the line; its machines open the one machine page in the project's frame (`#/project/:id/machine/:asset`, ‹ Machines back to the project's machines, *on <line> ›* to the line's frame); *Today* is the Journey on today (`#/project/:id/journey?from=d&to=d`) |
| A project › **Plan** | `#/project/:id/install` (and `/set-up`, `/testing`, `/handover`, `/plan`, `/programs`) | the gates, the timeline and the project's programs, one tab with its own row of views; a test or a fix opened on its own page says ‹ Commission or ‹ Problems |
| A line › **Programs** | `#/lines/:ws?view=programs` | machine by machine; a machine a stage-gate project is proving shows that project's programs **in place** (*Being proved in <project>*), each opening and tested there — no door into the project's pages |

## Old addresses, kept

| Address | Opens |
|---|---|
| `#/project/:id/line/:lid` (stage gate) | the line's own page (a section asked for by name still opens the project's) |
| `#/machines`, `#/programs`, `#/snags`, `#/actions` | still open; no Factory door leads there, but the Every report sheet does |
| `#/project/:id/day` (`?d=` a day) | the project's Journey on that day — The day folded into the Journey, 27 October (Rowland: "fold it"): *Today* is its first range |

## Left for later (agreed 27 October)

- The old line-study pages under `#/w/:ws/…` (stopwatch, Pareto, filmed walk,
  meeting). They are reached from the line's Stops timed and More, and are to
  be brought under the line's Tools and Logs in a round of their own.
- A 6M or lever-tree project's copy of a line, which holds that project's
  target, owner and numbers for the line. To be decided with the 6M work.
- What each line costs, on the Factory board. There is no per-line cost of
  open problems yet, so it is left off rather than invented.

## Proved by

- `scripts/acceptance/line-is-home.mjs` walks the route: Factory › line ›
  machine in two taps, a project's machine opening the one page in the
  project's frame with ‹ Machines back, its line opening the line's page, and
  the strip counting only machines.
- `now.mjs` checks the one row of tabs and Plan's own; `machines-programs.mjs` a line's
  programs opening in place, tested there.
- `structure.mjs` and `front-door.mjs` check the menus.
- `journeys.mjs` checks the journeys. J7b and J7c are longer by Rowland's word, and the script says so; J4 now
  goes Now › Plan › Commission in the same ten taps.