# The structure of the app — assessment and proposal

**Status: proposed 22 October, validated against the whole product the same
day (§12–§19), approved 23 October — Rowland: *"I agree do them all"*, every
decision of §19 as recommended (D10: Home without "what you owe").** Stage A
of Rowland's brief of 22 October (*Whole-application structural design and UX
elevation*); the validation answers the second brief (*validate the proposed
architecture against the full product*). Stage B is built in the slices of
§10, each gated and live on its own; §20 says what each has done.
`docs/DIRECTION.md` still comes first, and this changes no record
(`docs/BLUEPRINT.md` §2): it is the frame, the places and the parts every
page is built from (§3 of the blueprint).

Rowland, 22 October:

> "I want to elevate Faultline from an application that contains a growing
> collection of functional features into a cohesive, premium-quality
> manufacturing business system ... This is not a request for a cosmetic
> redesign, a new colour scheme, a sidebar adjustment or a collection of
> individually polished screens ... Do not begin by deciding how to rearrange
> the current interface. Begin by determining how the entire product should
> be organised and experienced."

## 1. What was examined

Read from the app as it runs, not from memory (22 October, `main` 166e769):

- **Every route** (`state/useRoute`, `router.tsx`): 60 route names, 72
  screens. 66 of them opened on the seeds at desk (1360 × 900) and phone
  (390 × 844), photographed, and measured in the browser: the rail and the
  phone bar on each, the top bar's label, the page's title and its size, the
  buttons and their sizes, the number of type sizes and colours in use, the
  report buttons. No console error on any of them.
- **The frame**: `ui/Frame` (the top bar, the rail, the phone bar), `ui/rail`
  (what each rail holds), `ui/JumpTo` (⌘K), `ui/ReportsSheet`.
- **The design system**: `src/styles.css` (14,069 lines), the shared parts in
  `src/ui` (107 files), inline styles across `src`.
- **The design documents**: DIRECTION, PROJECTS, BLUEPRINT §1–§4 and §8,
  SIMPLE, LEAN-PAGE, PAGES, the flow audit's rail decisions.
- **Reference products**, for the quality of organisation expected — not to
  copy: Microsoft Teams (app bar → team → channel → tabs; a tab is a canvas;
  navigation kept to fewer than three levels), Microsoft Planner (one plan,
  many views — Grid, Board, Schedule, Charts; *My tasks* across every plan),
  Procore (company level and project level, a header naming both with a
  switcher and an arrow up, a toolbox grouped by discipline showing only the
  tools you may use, favourites starred), Atlassian's 2025 navigation (global
  places kept apart from a space's own; *For you*), and SafetyCulture (sites
  and assets, inspections, issues raised, actions to fix them).

## 2. The assessment

**Faultline is functionally mature and experientially young.** Its engine is
unusually sound for its age: one home per record, the factory shared and
projects pointing at it, sync with conflict handling, access enforced by the
database, a report engine whose paper is the screen, the lean page, a visual
management language with meaning in every colour, and a gate of forty-six
steps that drive the real pages. What has not kept pace is the frame those pages sit
in: it was extended request by request rather than designed, so the structure
of the app is drawn all at once, everywhere, and every page invents its own
header, controls and density.

| | Now (1–5) | Evidence |
|---|---|---|
| Records and data integrity | 4 | BLUEPRINT §2, one home each; schema test; sync's rev check |
| Depth of the tools | 4 | 11 tools on the rail, 47 catalogue entries available, each worked by formula |
| Reporting | 4 | one engine (`lib/report`), the lean page on screen and paper — but 19 different labels to reach it |
| Visual identity and state colours | 4 | the five colours, one meaning each, words beside them |
| Information architecture | 2 | §3 F1, F4, F5, F9 |
| Navigation and context | 2 | §3 F1–F3 |
| Consistency of pages and parts | 2 | §3 F6–F8, F10 |
| Visual hierarchy, calm | 2 | §3 F11 |
| Phone | 3 | floor capture strong (timers, taps); navigation unstable (F3) |
| Words | 3 | §3 F12 |
| Grows without clutter | 1 | the rail grows by one line per line, project and tool (F1) |

## 3. The problems, and why each happened

Each says what kind of problem it is: **structure** (how the app is
organised), **navigation**, **interaction**, **visual**, **words**, or
**duplication**.

**F1 — The rail draws the whole app at once.** *Structure, navigation.* Off a
project the rail has 25 lines; inside one, 27; inside a filmed walk, 31. The
eleven tools are on every rail — 41% of a project's. A project's rail starts
with *Control room* and *Control room problems*, the factory's. Every line,
every project and every tool adds a line to every rail, and the catalogue
already holds 47 available entries and 234 in all. *Why:* "the rail IS the
structure" (5 October) drew every level of the app in one list, and each
request since added its line where the last one ended.

**F2 — Where you are is said three ways, and they disagree.** *Navigation.*
The top bar's label says one of eight kinds of thing — *Home*, *Control room*,
*Projects*, *Your factory*, *Tools*, or a project's name — on 66 pages; *Every
tool* says *Control room*; a tool's page says *Tools* even when the record
is a line's. It is a native select labelled *Which project* that also lists
the control room. A production line, the hub since Stage 3, has no context of
its own: its page wears the factory-wide rail. Some pages carry an eyebrow
trail (*PRODUCTION LINE · Your factory ›*), most do not. *Why:* the frame (5
October) predates lines as places (12–13 October) and projects as workspaces
(21 October); each was fitted into it rather than the frame made for them.

**F3 — The phone's bar changes under the thumb.** *Interaction.* Seventeen
different bars across the 66 pages. Inside a project the third button is
whatever page you are on — Plan, Programs, Actions, Materials, The day,
Fishbone, Board, Lines, Numbers, Wins, Evidence, Tree, Capture, Analyse — so
no position can be learned. *Problems* is the factory's register off a
project and the project's own in it, with nothing to say which. *Why:*
`phoneBar` builds the bar from the page you are on.

**F4 — Two homes, and a list page that does not list.** *Duplication, IA.*
Home (`#/`) and the control room (`#/room`) both show what is under way and
both start a project. *Projects* (the rail's second line, "3") opens a page
that says "The live ones are on the control room" and shows none of them.
*Why:* the front door was added beside the control room on 18 October; the
Projects page was de-duplicated against the wrong one.

**F5 — Owed work and problems under many names.** *Words, duplication.*
*Needs you*, *Actions*, *Every action*, *Who owes what*, *This week*, the
*Board*, *Problems* (`/fixes`), *Control room problems*, *Evidence*. P3 and P4
made one reading of what is owed (`lib/projectActions`); the names and doors
did not follow.

**F6 — No page header.** *Visual, interaction.* At least six patterns: a plain
title with buttons right (lists); an eyebrow and title (Your factory, Every
action); a title with *Rename* beside it (a project); a band with a teal edge,
the eyebrow, title, *Rename* and *Delete* as links and a state pill (studies);
tabs above the title (the Plan); and no title at all (fishbone, Line standard,
Line capacity, Line balance). Titles at 24, 28, 30 and 36 px. On a line's own
page at desk the title is squeezed into a column 50 px wide by seven buttons —
*Line / 7* breaks over two lines and *No problems open* one word a line. *Why:*
no shared header; each page drew its own.

**F7 — Paper reached twenty ways.** *Interaction, words.* Nineteen labels on
30 pages: *PDF*, *PDF (all shown)*, *Print*, *Report*, *Cards*, *Line report*,
*Problems report*, *Report cards*, *Problems cards*, *Status report — 1 page ›*,
*Control room report — 1 page*, *All reports ›*, *Factory report*, *Programs
report*, *Commissioning report*, *Test cards*, *Line-walk report*,
*Engineering report*, *Open — edit and print* — and the rail's *Reports*
sheet. The engine behind them is one; the doors are not.

**F8 — Every tool builds its own shell.** *Structure, interaction.* Lists
group differently (*Not filed / Project: …*; line chips; a dashboard per line
with an *Ask* box). Where a record belongs is said three ways (*Put on a line ·
Attach to a project*; *On a project: [select]*; *Move to another line · Take it
off the project*). Delete is a link, a red button in the header, or inside a
sheet. Each new tool from the catalogue would invent it again.

**F9 — A fourth level left from the first Faultline.** *Structure.* The line
study (*Capture · Analyse · Evidence · Meeting*, `/w/:ws/…`) nests under a line
in the rail, and inside a project's rail when the walk was filmed for it — a
navigation inside the navigation. It is what *Time a stop* and *Film the line*
open.

**F10 — Tokens without components.** *Design system.* One stylesheet of 14,069
lines, 7,929 selectors and 254 class prefixes (about one per screen); 78
font sizes (some 470 declarations in raw px beside six type tokens); 109 hex
colours and 131 rgba values beside 71 tokens; 32 radii; 28 breakpoints; 515
inline style objects in 88 files. Two type tokens are used that were never
defined (`--t-small`, nine times; `--t-h3`): each use falls back to a
size written by hand beside it, and one (`.tk-meta`) to none at all. The button is shared (`btn`, 725 uses); the header,
toolbar, filters, tabs, list row, table, tile and field are not.

**F11 — Everything is loud, so the abnormal is not.** *Visual.* Desk buttons
48–57 px tall with drop shadows; filter pills 48 px; most blocks a bordered
card; uppercase micro-labels everywhere; tiles that hold a paragraph (*"— give
Line 7 — smoke test: its speed, its shifts and its margin a pack in Your
factory"* on five pages); the control room's sentence (26 px bold) bigger than
its title (24 px). Visual management's rule 2 — normal recedes — is applied to
the data and not to the chrome around it.

**F12 — Words that drift.** *Words.* *Every line* and *All lines* side by side
on the 6M board, meaning different things; *Your factory* a rail group, a page
and a top-bar place; *Control room problems* inside a project; *Programs* the
factory's and a project's under one word; *Tools* the place and *Every tool*
the directory.

## 4. What stays — the decisions that are sound

- **The four layers and one home per record** (BLUEPRINT §1–§2). They are the
  right model; the proposal makes them the frame.
- **The project as the workspace** (`docs/PROJECTS.md`) and a record wearing
  its own project — the `?project=` mechanism generalises to every scope.
- **The record's drawer** (one drawer per record, over the page).
- **The lean page** and **paper is the screen**.
- **The visual management rules and the palette** — settled with Rowland (11
  and 17 October). This proposal does not reopen the colours.
- **Each method's own canvas** — the fishbone, the Gantt, the V-curve, the SMED
  and value-stream grids, the line standard's board, the timers. Consistency
  goes in the frame; the canvas stays the method's.
- **The line's page as a hub** — its *Tools on this line* cards, each saying
  what its latest found, are the pattern the proposal spreads.
- **⌘K Jump to** — it becomes the engine of the switcher.
- **Every URL.** Nothing a person has bookmarked or been sent stops working.

## 5. The proposal — three scopes and a library

### 5.1 The shape

The four layers become three **scopes** you work *in* — **the factory**,
**a line**, **a project** — and one **library** of tools you take *into* a
scope. A scope is a place with its own short set of pages; you are always in
exactly one, and the frame says which.

```
HOME            yours: what is under way, what you were last in, start something
│
FACTORY         every line and project at once — "am I in control?"
│  Control room · Actions · Problems · Projects · Lines · Programs · Tools · Reports
│
├── A LINE      the line as a place — no project needed
│     Overview · Problems · Machines & programs · Products · Tools · Logs ·
│     Projects · Reports · Set up
│
└── A PROJECT   the change as a workspace — everything done in it lands in it
      Overview · <its method's pages, from lib/planModel> · Actions · Problems ·
      Tools · Notes · Reports · Details
        stage gate: Plan (Install · Set up · Commission · Hand over · Timeline),
                    Machines ▸ each, Programs, Materials, The day
        6M:         Fishbone, Board, Lines ▸ each line's pack, Results (Numbers ·
                    Wins), Evidence (its Tools page, with the filmed line),
                    Pareto when chosen, Materials
        lever tree: Tree, Board, Lines ▸ each, Results, Evidence, Pareto when
                    chosen, Materials

TOOLS (the library)   every tool, found by the problem; each tool's uses
                      everywhere; started into the scope you are in
```

*Validated.* A use of a tool belongs to a line, a project or nobody, as now,
and is listed where its **kind** says (§14): a measurement made once — a
capability study, a SMED, a value stream map — under the scope's **Tools**; a
product's standard — its line standard, line balance and Line capacity — under
the line's **Products**; a running log — stops timed, and the checks and audits
the catalogue holds — under the line's **Logs**; a register under **Problems**
and **Actions**. Every one is also in its tool's own list in the library.
Nothing moves in the database. The page is called **Tools**, never
*Studies*: `lib/study` keeps "a study" off the screen on its own ("Line study"
once named a line), and every record keeps its tool's name — *Capability study
— Weight accuracy 400 g*, *SMED — Maris Piper 2kg → Express 1.25 kg*.

### 5.2 Navigation, at a desk

- **The context bar** (the top bar): the mark (to Home); the scope as a trail
  — **Factory ▸ Line 2 commissioning ▾** — whose ▾ switches to any line or
  project, recent first, typed to filter (⌘K's list); search (⌘K, widened to
  records); **Problem** — one place, as now, offered only to whoever may
  write where they are (§17); **＋ New** — the rest of what is captured or
  started (time a stop, count a shift, a tool, Line Talk), landing in the scope
  you are in, as the phone's ＋ does; you.
- **The rail is the scope's own pages only** — 8 to 12 lines, never the
  factory's inside a project, never the list of every line and project, never
  the eleven tools. **↑ Factory** at its head, as Procore's arrow up. The
  counts and squares stay (`useStanding`, `useMethodCounts`).
- **A stage gate's machines** stay a group under *Machines*, folded past six.
- **Tools** are one line, **Tools**: the scope's uses of every tool, grouped
  by tool, each saying what it found (the line page's cards), with **New ▾** —
  the tools you use first (starred, as Procore's favourites), then *Find a tool
  by the problem* (the catalogue's routes). A tool started from New lands where
  its kind lives (§14): a SMED on Tools, a line standard on its product.

### 5.3 Navigation, on a phone

- *Validated.* **A bar that never moves within a scope**, its first, middle
  and last places the same everywhere:

  | Scope | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | The factory | Control room | Actions | ＋ | Problems | More |
  | A line | Overview | Tools | ＋ | Problems | More |
  | A project | Overview | its main page — *Plan* · *Fishbone* · *Tree* | ＋ | Actions | More |

  The first proposal had one bar for every scope; walking the stage gate
  (journey J4) showed the site lead's Plan would then sit behind More, where
  today it is one tap — so the second place is the project's own main page,
  as `lib/planModel` names it.
- **＋** opens the capture sheet **already on a new Problem** — the photo and
  the words box, the line and project set by where you are — so taking a
  problem stays one tap, as the floating button is today; a row above it
  switches to *Time a stop*, *Count a shift*, *A tool*, *Line Talk*. It
  replaces the floating button that covers the page.
- The scope's name at the top with ▾ to switch and ↑ to go up.
- *More* is the scope's rail — short now, so it fits a screen.

### 5.4 Every page, one anatomy

```
Factory ▸ Line 7 ▸ Tools                                  [More ▾] [Report ▾] [Primary]
Title                                   [state pill]
One sentence: where it is, in the house's words
[ view · view · view ]                   [filters: chips · select · search]
───────────────────────────────────────────────────────────────────────────
the canvas — the lean page's order, or the method's own picture
```

One **page header** (the trail, one title at one size, the state, one primary
action, the rest in *More*), one **Report ▾** holding every paper the page
has (named for what it is: *Status — 1 page*, *Full report*, *Cards*), one
**view switcher** (Planner's views: the Plan's gates, Actions' *Who · When ·
Where*), one **filter bar**. On a phone the header is the title, the state and
one action; the rest is in ⋯.

### 5.5 The tool shell — *validated: one shell, six kinds*

Every tool, built and to come, gets the same four things, so the catalogue
can grow without inventing pages:

1. **Its list** — where its kind lives in the scope (§14), and in the library
   every one, by line and project, with the finding of each.
2. **Its header** — tool name as the eyebrow, the record's name, its state,
   *Report ▾*, *More ▾* (rename, move, delete with Undo).
3. **Belongs to** — one control: *On Line 7 · in Line 2 commissioning ·
   Change*, the same on every tool.
4. **Its canvas** — the method's own, free.

What differs is decided by the tool's **kind**, held once on its catalogue
entry (§14): the order of its list (latest finding · current version per
product · trend and what is due · open by priority), its lifecycle words
(*measured, said* · *set as the standard, superseded* · *due, done, missed* ·
*open, closed*) and where *New* puts it. One registry, one shell, six
patterns — never a second shell, never a measurement's workflow forced onto a
standard or a log.

### 5.6 Home, the control room and Projects

- **Home** is yours: carry on where you were (this device's recent places),
  what is under way, start a project or use a tool. It stops repeating the
  control room. *Validated:* "what you owe" is left off — a person is a typed
  name, never an account (the people list was left out on 17 October), so the
  app cannot know which actions are yours; D10 asks whether to add "your name
  on this device", matched as Actions already matches names.
- **Control room** is the factory's overview — "am I in control?" — as now.
- **Projects** lists the projects: live first, by method, line and state, the
  archive behind a filter. The page that told you to look elsewhere goes.

### 5.7 One word for each thing

| Thing | The word | Instead of |
|---|---|---|
| The view of everything | **Control room** | *Home* used for it |
| Something wrong, raised | **Problem** | *Control room problems* (the scope says whose), *snag* |
| Something owed | **Action** | *Every action* (the factory's *Actions*); *Needs you* stays as the abnormal top of a page, saying it is from Actions |
| One use of a tool | **its tool's name** — *Capability study — …*, *SMED — …* | *a study* on its own (`lib/study`'s rule) |
| A scope's uses of the tools | **Tools** — *Line 7 ▸ Tools*, and the library *Factory ▸ Tools* | *Studies*; *Every tool* as a separate place |
| A product's standards | **Products** | the product grid's place on the line's page only |
| Running entries — stops timed, checks, audits | **Logs** | *Stops timed* as a place of its own (it stays the log's name) |
| Paper | **Report ▾**, each named | *PDF*, *PDF (all shown)*, *Print*, *Paper* |
| The filter for everything | **All lines** | *Every line* beside *All lines* |

The smoke test already fails on old words (BLUEPRINT §5.9); these join it.

## 6. The principles

1. **Scope first.** Every page belongs to one scope, named in the context bar;
   the rail shows that scope's pages and the way up — nothing else.
2. **One way in, many views.** A thing has one page; other ways of seeing it
   are views or filters of that page, never a second page.
3. **Same frame, the method's own canvas.** The header, the views, the
   filters, the report menu and the record drawer are the same everywhere; the
   picture in the middle is the method's.
4. **The lean page order** for what a page says (`docs/LEAN-PAGE.md`).
5. **Calm by default, loud for the abnormal** — visual management rule 2,
   applied to the chrome: one primary button a page, no shadow on the rest,
   small filters, cards only where a thing is a thing.
6. **Density by device.** Gloved thumbs on the floor get 44 px and more; a desk
   gets 32–40 px controls and more on the screen.
7. **A tool is an instance in a library**: the tool shell (§5.5) for all.
8. **Capture from anywhere, into where you are**: Problem and ＋.
9. **One word per thing** (§5.7), held by the smoke test.
10. **Paper is the screen** — unchanged.

## 7. The design system

**Foundations** — the colours stay as they are. Added and enforced: a spacing
scale (4, 8, 12, 16, 24, 32, 48), three radii, two elevations (a panel; an
overlay — no shadow on a button), the six type tokens used for every size
(the page title one size everywhere), three breakpoints (phone under 720,
tablet to 1100, desk above), and a desk density and a phone density.

**Components** — built once in `src/ui`, each tested, each replacing the
per-screen versions:

| Part | Replaces |
|---|---|
| ContextBar (trail + switcher) | the top bar's select and label |
| ScopeRail, PhoneBar, CaptureSheet | the three rails and 17 bars; the floating button |
| PageHeader + ActionBar (primary, More) | six header patterns |
| ReportMenu | 19 labels |
| ViewTabs, FilterBar | pills, selects and tabs drawn per page |
| Section (title, aside, body) | per-page section heads |
| Tile (the lean tile, one variant) | three tile styles |
| RecordRow, DataTable (cards on a phone) | per-list rows and tables |
| StateTag (state, priority) | per-page pills |
| BelongsTo | three ways of saying where a record belongs |
| Field, NumberField, Select, DateInput | forms per screen |

**Held by the gate**, the house way: a ratchet in the unit tests counting raw
font sizes, hex and rgba colours, breakpoints and inline styles in
`src/styles.css` and `src/**/*.tsx` that may only come down (as the lint
ceiling does); the inventory checking that every page has one header with one
title; and a page in the dev build showing every part, photographed by
`--shots` so a change to a part is seen everywhere it is used.

## 8. How it holds as Faultline grows

*Validated* against the rail as `ui/rail` builds it: off a project it holds
19 + one line a production line + one a project (25 today: 3 lines, 3
projects); inside a stage-gate project 23 + one a machine + one a line (27
today).

| Grows | Today | Proposed |
|---|---|---|
| Tools — 11 on the rail; the catalogue holds 71 tool-shaped entries | a rail line each, on every rail | none: each scope's Tools, Products and Logs, the library, *New ▾* from the catalogue's disciplines and problem routes |
| Lines — 3 → 30 | a rail line each: 25 → 52 off a project | none: the switcher and Factory ▸ Lines — the factory's rail stays 8 |
| Projects — 3 → 50 | a rail line each: 52 → 99 | none: the switcher and Factory ▸ Projects |
| Machines on a stage-gate project — 3 → 12 | a rail line each: 27 → 36 | under *Machines*, folded past six: at most 18 |
| A fourth kind of project — the catalogue already holds a kaizen event, improvement kata, DMAIC and horizontal deployment | its pages placed by hand in `ui/rail` | one entry in `lib/planModel`, declaring its main page and its pages |
| A new tool | a line in four hand-kept lists (§12) | one catalogue entry with its kind |
| A new page | its own header and controls | the page anatomy |

## 9. Decisions for Rowland

Several of these change placements Rowland agreed earlier. Rule 1 of how a change
is made: each says why the old one was there and why its replacement is
better. *Validated:* D2, D5 and D6 are refined, D9–D12 are new; §19 says each
in one line, for the answer.

- **D1 — Three scopes; the rail shows only the scope's pages.** The rail was
  the whole app drawn at once (5 October) so "back" was a glance left and
  nothing was hidden. That worked with one project and no lines; at three
  lines, three projects and eleven tools it is 27 lines, and it grows with
  every one (§8). The trail and ↑ keep "back" one glance away; the switcher
  keeps everything one tap away.
- **D2 — The tools leave the rail; each scope's Tools, Products and Logs take
  them, with the library.** They went to the foot of every rail (10 October)
  so a tool was one tap from anywhere. Tools is one tap in every scope, *New ▾*
  two, starred tools first — and the rail stops growing with the catalogue.
- **D3 — Control room problems no longer on every rail.** It was there because
  a problem is taken anywhere and sent on (flow audit #20). *Problem* stays in
  the context bar on every page and is what ＋ opens on; each scope's
  *Problems* is its own, the factory's *Problems* the whole register.
- **D4 — Home is yours; the control room is the factory's; Projects lists
  projects.**
- **D5 — One word each** (§5.7), with two new words to agree: **Tools** for a
  scope's uses of the tools, and **Logs** for running entries (stops timed now;
  checks and audits to come).
- **D6 — The phone bar fixed within a scope** (§5.3): Control room · Actions ·
  ＋ · Problems · More in the factory; Overview · Tools · ＋ · Problems · More
  on a line; Overview · the project's main page · ＋ · Actions · More in a
  project. It was built from the page you are on so that page was always a tap
  away; the header already says it, and a bar that moves cannot be learned.
- **D7 — Compact at a desk, comfortable on a phone.**
- **D8 — The line study folded into the line** as its first log, *Stops
  timed*, its four screens as that page's views.
- **D9 — A 6M and a lever-tree project's Evidence is its Tools page**, with the
  filmed line on it, and *Numbers* and *Wins* become one page, **Results**, with
  the two as its views. Today Evidence is the filmed line and the tools used in
  the project live elsewhere; in a 6M project a tool's use *is* evidence for a
  cause, so one page says both.
- **D10 — Home without "what you owe"**, or with it once a person types their
  name on the device (kept on the device, matched to the typed *who* names as
  Actions already matches them). Recommended: without, until asked.
- **D11 — The two defects the validation found** (§17) fixed first, on their
  own, before any of the rest: rows on *Actions* and *Every action* that open
  nothing, and the Problem button offered to a client.
- **D12 — The acceptance standard of §18**, including Rowland's own walk of
  each slice's journeys before it is called accepted.

## 10. The plan — Stage B, after approval

*Validated* (§12–§19): the order holds, with the registry and the kinds moved
into the foundations, the defects first, and the baseline already measured.
Each slice is gated and live on its own (CLAUDE.md, *Finished means live*);
none changes a record, a policy, the database or a URL; each meets §18.

| | Slice | Depends on | Risk (§17) | Reuses |
|---|---|---|---|---|
| B0 | The two defects (D11), each its own commit; `scripts/journeys.mjs` (the eight journeys, §15, from `docs/structure/journeys-stage-a.mjs`) in the gate against the committed baseline; the route list (every address today, §17) and the paper parity check added to the gate | approval | low | the walk's tap counting (`stagegate-walk.mjs`), `report-stress.mjs`' read-back |
| B1 | Foundations: the tokens, the ratchet, the parts of §7 and a page showing them; **the registry** — `kind` and where it starts on every catalogue entry, read by unit tests only for now | B0 | low — nothing a person sees moves | `btn`, `Lean`, `Sheet`, `Chip`, `EmptyState`, the catalogue |
| B2 | The scope frame: `lib/scope` (route → scope, pure and tested) in place of `projectOf`, `placeOf` and `hereOf`; the context bar and switcher; a rail per scope, its pages from `lib/planModel` and the registry; the line a scope with Products, Tools and Logs assembled from the parts on its page today; the phone bar per scope and ＋; New ▾, ⌘K and the front door read the registry | B1 | **high** — R1, R2 | `ui/rail`'s counts, ⌘K's list, P2's `?project=`, `QuickSnag` |
| B3 | Every page on the page header and Report ▾ (PAGES.md and the inventory with them) | B1, B2 | medium — R3 | `ReportsSheet`, every paper as it is |
| B4 | The tool shell by kind for the eleven tools, the stops log and the two registers; STANDARD.md requires it of every tool after | B1, B3 | medium — R4 | `StudyPlace`, the standards' `BelongsTo`, each tool's list |
| B5 | Home, the control room and Projects; the words (§5.7) and the smoke test; 6M and tree Results and Evidence (D9) | B2 | low — R5 | `lib/portfolio`, `lib/projectActions` |
| B6 | The line study folded into Line ▸ Logs as *Stops timed* | B2 | medium — R6 | the four screens as views |
| B7 | Calm and density; the ratchet brought down page by page | B3 | low — R7 | the tokens |
| B8 | The floor journeys walked again on a phone by Rowland's team; the baseline measured again | all | — | B0's script |

**Proved by** §18 — in every slice, not only at the end.

**What it does not touch**: the records, the database, the policies, sync,
access (`can.edit`, `can.agree`, `can.remove`), the arithmetic, the reports'
content, Line Talk's gateway, and every URL.

## 11. On the blueprint (§8)

- **Layer**: all four — it is the frame they sit in.
- **Record**: none new, none moved (§2 unchanged).
- **Where it shows**: every page; the paper is untouched.
- **What it replaces**: the rail's whole-app list (`ui/rail` toolsGroup,
  snagsPlace, the control room's lists of lines and projects), the top bar's
  select, the 17 phone bars and the floating Problem button, the per-page
  headers and report buttons, the Projects page's pointer to the control room,
  the line study's nested rail, and the four hand-kept lists of the tools
  (`ui/rail` toolPlaces, `lib/jumpTo` TOOL_PLACES, the line page's list, the
  catalogue's own) — the catalogue becomes the one.
- **When approved**: BLUEPRINT §1 and §3 are rewritten to the scopes in the
  same commit as B2, and CLAUDE.md points here.

## 12. The validation — what was tested, what held, what changed

Rowland, 22 October, before approving Stage B: *"validate the proposed
architecture against the full product rather than moving directly from
diagnosis to implementation."* Six questions, each answered from the running
app and its code on `main` (c00f7b4), not from the proposal's own words:

| Asked | How it was tested | What held | What changed |
|---|---|---|---|
| 1 · all three project types | each type's rail, front page, method pages, lines and reports read in the app and in `lib/planModel`, `ProjectDashboardScreen`, `ui/rail` | one project scope fits all three | the second place on a phone is the type's own main page; 6M and tree have a page per line in the project; a project's line not yet in the factory stays in the project (§13) |
| 2 · the full catalogue | the 71 tool-shaped catalogue entries sorted by how their records behave | one shell, one registry | "Study" fits 28 of 71; six kinds, each listed and started where it belongs; the page is *Tools*, never *Studies* (§14) |
| 3 · real journeys | eight journeys walked by script on today's app, desk and phone, every tap counted (§15) | the project journeys are already short | the gains are across scopes, in orientation and in hunting; targets set from the measured baseline, no journey allowed to get worse |
| 4 · architecture or presentation | each change placed in its layer, with the problems it solves (§16) | — | the registry and the kinds join the information architecture |
| 5 · migration | every address, record, link, permission, paper, sync and offline path traced (§17) | nothing in the database moves | two existing defects found (D11); seven risks, each with its rollback |
| 6 · the acceptance standard | written for every slice (§18) | — | a slice is done when it is no worse, easier, coherent and still small as it grows — measured, and walked by Rowland |

**Found on the way, and not part of the proposal:** the tools are listed in
four hand-kept places (`ui/rail` toolPlaces, which the front door also reads;
`lib/jumpTo` TOOL_PLACES; the line page's own list; the catalogue) — a new
tool must be added to each, and the proposal makes the catalogue the one.

## 13. The three project types in the scopes

All three are a **project** scope — the same frame, the same Actions,
Problems, Tools, Notes, Reports and Details — and each declares its own
method pages and main page in `lib/planModel`, where a method is already
defined once.

| | Stage gate (`commissioning`) | 6M (`board`) | Lever tree (`tree`) |
|---|---|---|---|
| The unit of work | a machine through its gates | a line's problem, traced on the six bones | an outcome and the conditions under it |
| Rhythm and device | daily at the line — a site lead on a phone | weekly in the meeting — at a desk | monthly with the sponsor — at a desk |
| Main page (phone bar, second place) | **Plan** — Install · Set up · Commission · Hand over · Timeline | **Fishbone** | **Tree** |
| Method pages | Plan, Machines ▸ each (folded past six), Programs, Materials, The day | Fishbone, Board, Lines ▸ each, Results (Numbers · Wins), Evidence, Pareto when chosen, Materials | Tree, Board, Lines ▸ each, Results, Evidence, Pareto when chosen, Materials |
| Its problems | a test that did not pass, its finding and its fix (`tests`, `test_items`), and the register's problems for it | the head of each fishbone (`cases`), and the register's problems for it | the register's problems; a condition off track is a state on the tree, not a problem |
| Proof | the tests passed, machine by machine, to handover | before → after on the line's own number, then holding | the outcome's number by its date |
| Its lines | where the machines go — a new line may not be in the factory yet | the subject: each line with its owner, target and readings in this project | usually one line's number |
| Its paper | status — 1 page, full report, commissioning report and test cards, programs, handover, the plan | client report with its status page first, each line's papers, the spreadsheet | the tree on one page, client report |
| Actions holds | stages, tests, fixes, programs, materials and machines waited on | the board's countermeasures, the checks that keep a gain, materials | the board's actions under each condition, materials |

**The differences that matter to the structure:**

- **A project's line is two places, said apart.** In a 6M or lever-tree
  project, *Lines ▸ Line 7* is the line *in this project* — its owner, target
  and readings, its problem, its actions (`#/project/:id/line/:lid` today).
  The line's own page, *Factory ▸ Line 7*, is the line for everyone. Today
  both are called "Line 7" and the rail opens the factory's; proposed, the
  project's page is titled *Line 7 in Line 7 pace* with *Open Line 7 ›* to the
  line, and the trail says which.
- **A stage gate may bring a line the factory does not have yet** (the seed's
  *Line 2B* and *Line 8*). It stays inside the project as now, with *Add it to
  your factory*; once added it is a line scope like any other.
- **The second place on the phone differs by type** and stays fixed within the
  project (§5.3); everything else is the same in all three.
- **What 6M calls Evidence** — the tools used as evidence for a cause, and the
  filmed line — is the same thing the other scopes call Tools (D9).
- **A fourth kind of project** — the catalogue holds a kaizen event,
  improvement kata, DMAIC and horizontal deployment, none built — is one entry
  in `lib/planModel` declaring its main page and its method pages; the frame,
  Actions, Problems, Tools and Reports come with it.

## 14. The tool catalogue against the shell

Sorted by how each one's records behave (the catalogue's 71 tool-shaped
entries, left-out ones excluded; the built ones named):

| Kind | Its records | Listed in a scope | Lifecycle words | Built | Catalogue |
|---|---|---|---|---|---|
| **Study** | a dated measurement of one situation, with a verdict; repeated to prove a change | **Tools**, by tool, latest finding first; before → after pairs | set up · measured · said | capability, work sampling, SMED, value stream map, loss count, reliability, video time study, the filmed walk, NIOSH | 28 |
| **Standard** | the agreed current way for a line × product (or a line), versioned | the line's **Products**, a row a product, current version and since when | set · superseded | line standard, line balance, Line capacity — one record a product, three faces (`standards`) | 14 |
| **Log** | entries over time against a line, machine or schedule; a trend and what is due | the line's **Logs**, latest and trend, due and missed | due · done · missed | stops timed | 17 |
| **Register** | items with an owner, a state and a day | **Problems** and **Actions** | open · closed | the problems register, Actions | 9 |
| **Document** | composed for others to read | **Tools**, by date | drafted · issued | Line Talk and the documents it writes | 3 |
| **Board** | owns nothing; reads the others | where its data lives — a line's Overview or Logs, the control room, a method page | — | the Pareto, where and when it stops, All together, the control room | the catalogue's *reports* |

**Where the study idea does not fit, and what is done instead:**

- **Standards** are not dated uses: a product has one current line standard,
  and three tools are faces of one record. Forcing them into a list of
  "studies" would show one product three times and lose "current". They live
  under the line's *Products* — the product grid already on the line's page.
- **Logs** never finish. A 5S audit round, a metal-detector check, a stop timed
  is an entry in a running series, judged by trend and by whether it was done
  when due. Under *Logs* they keep their own capture (a tap, a tick, a timer)
  and their own "due" — and only stops timed exists today.
- **Registers** are the work itself, not evidence for it; they feed Actions
  and must never be hidden under Tools.
- **Boards** own no record, so they have no list and no *New*; they sit on the
  page whose data they read.
- **Method canvases** — the plan's gates, the fishbone, the tree — are a
  project type's own pages, never tools (CLAUDE.md: a tool never becomes a
  method).

**How it is held together without duplicating anything:** the kind is one
field on the catalogue entry (with where the tool is started), and everything
that lists, starts or finds a tool reads it — the scope's pages, *New ▾*, ＋,
⌘K, the front door and the directory — so the four hand-kept lists go (§12).
The shell (header, Belongs to, Report ▾, More ▾) is one part; the list is one
part with six orderings; the canvas stays the tool's. A new tool is one
catalogue entry and its canvas.

## 15. The eight journeys, and how improvement is measured

Defined on the seeded factory (three lines, a stage gate, a 6M and a lever
tree project), each walked by script on today's app pressing what the screen
says, along the shortest way there is — `docs/structure/journeys-stage-a.mjs`,
its numbers in `docs/structure/journeys-baseline.json` (it becomes
`scripts/journeys.mjs` in B0). Counted:
**taps** (a press of a control), **entries** (a box filled — the work itself,
which the structure does not change), **screens** (the address changing),
**hunts** (a press whose target was not on the screen when it arrived — the
person had to scroll for it) and **orientation** (on each screen, does the
top bar name the place the person is in?).

| | Journey | Device | Taps | Entries | Screens | Hunts | Orientation |
|---|---|---|---|---|---|---|---|
| J1 | **Across factory, line and project.** From the control room, Line 7; the 6M project on it (Line 7 pace); its fishbone; Line 7's Line capacity for Maris Piper 2kg; back to the control room | desk | 7 | 0 | 7 | 3 | 4 of 8 |
| | | phone | 9 | 0 | 7 | 3 | 4 of 8 |
| J2 | **A tool on its own, on the floor.** From Home, a capability study on no line or project — what it is of, the machine, the limits, three readings, the sentence read | phone | 4 | 8 | 2 | 2 | 1 of 3 |
| J3 | **A tool in context.** Inside Line 7 pace, a SMED for 2kg → 1.25 kg on Line 7; found again from the project, and from Line 7 | desk | 6 | 3 | 5 | 3 | 4 of 6 |
| | | phone | 9 | 3 | 5 | 3 | 4 of 6 |
| J4 | **A stage gate's day.** On Line 2 commissioning, the seal re-test fails; its problem; its fix; the fix found on Actions | phone | 11 | 1 | 8 | 1 | 4 of 4 |
| J5 | **A 6M week.** On Line 7 pace, the biggest loss to its problem on the fishbone; a cause confirmed; a countermeasure with who and when; found on Actions | desk | 9 | 3 | 4 | 0 | 3 of 3 |
| J6 | **A lever-tree month.** On Line 2B to 60 ppm, the condition behind target, its late action and who owes it read on the tree; the number's next reading recorded | desk | 5 | 2 | 3 | 1 | 4 of 4 |
| J7 | **Problems and actions.** (a) A problem taken on Line 7 with no project, on the phone, found on the register; (b) every late action by person, one opened; (c) a line's problem moved into Line 7 pace | phone / desk / desk | 5 / 3 / 3 | 1 / 0 / 1 | 3 / 2 / 1 | 1 / 0 / 1 | 3 of 4 / 3 of 3 / 2 of 2 |
| J8 | **The Monday pack.** The stage gate's one-page status, the 6M client report, Line 7's line report and the control room report, each downloaded — from each one's own page | desk | 13 | 0 | 8 | 0 | 4 of 5 |
| | — the same four from the control room's *All reports* sheet | desk | 13 | 0 | 5 | 3 | 3 of 3 |
| | **All thirteen walks** | | **97** | 22 | 60 | **21** | **43 of 59** |

**What the baseline says.** The project journeys (J4, J5, J6) are already
short — the stage gate walk and the 6M loop were tuned before; the structure
must not make them longer. The cost is elsewhere: **21 hunts** (the tools at
the foot of a project's rail, the tool cards far down a line's page, the
Projects on a line below its fold, a project's papers below the fold of *All
reports*), **16 of 59 screens that do not name the place** (every line page
says *Your factory*, every tool page *Tools*), the phone's *More* used twice
in J1 and three times in J3, and one journey (J7b) that does not complete:
the late action's row opens nothing. *All reports* saves nothing on J8: a
project's client report leaves the control room for the project's report
page, wants its *PDF* there and the way back, and the line's one-page report
is a print page with *Print / save PDF* — three ways of taking paper (a file
at once, a report page with *PDF*, a print page), which Report ▾ makes one.

**The targets**, after B2 and again after B8:

| | Taps (desk / phone) | Hunts | Orientation |
|---|---|---|---|
| J1 | ≤ 7 / ≤ 7 | 0 | every screen |
| J2 | ≤ 4 | 0 | every screen |
| J3 | ≤ 6 / ≤ 8 | 0 | every screen |
| J4 | ≤ 10 (Actions on the bar) | ≤ 1 | every screen |
| J5, J6 | no more than today (9, 5) | 0 | every screen |
| J7 | ≤ 5 / 3 / 3, and (b) opens its record | 0 | every screen |
| J8 | ≤ 8 from *All reports*, without leaving the control room between papers | 0 | every screen |

**How it is measured.** The script runs in the gate from B0, so every slice
reports its journeys against the baseline; a journey that gets longer fails
the slice unless the slice says why in writing and Rowland agrees. Then by
people, at B2, B4 and B8: Rowland and one of the team do J1, J3, J4 and J7 on
their own phones and laptops, unprompted, with the time, the wrong turns and
one question at the end of each — *where are you now?* — written in the
slice's notes. And as it grows: the same journeys on a factory of 30 lines and
50 projects (§18).

## 16. Architecture, standard and interaction — how the changes fit together

| Layer | The changes | Solves | Depends on |
|---|---|---|---|
| **Information architecture** — what the places are | three scopes; the line a scope; a page per kind of tool record (Products, Tools, Logs); the registry and the kinds; Home, the control room and Projects each one job; the project × line page; the words | F1, F4, F5, F9, F12; growth (§8) | — |
| **Navigation** — how a person moves | the context bar and switcher; a rail per scope; the phone bar per scope type; ↑ to the factory; ⌘K over records | F1, F2, F3 | the IA |
| **The design system** — how every page is built | tokens completed; the parts (page header, report menu, views, filters, list, tile, belongs-to); density by device; the ratchet | F6, F10, F11 | the IA's page list, so each part is built once for every page |
| **Interactions** — single moments | ＋ opening on a new Problem; Report ▾ with papers named; New ▾ by kind; Belongs to; the two defects | F7, F8, J7b | the parts |

**How they make one system.** Each layer reads the one below and adds nothing
of its own. The places come from two sources only — `lib/scope` (which scope a
route is in) and `lib/planModel` with the catalogue's registry (what pages a
scope has, what tools exist and of what kind). The rail, the phone bar, the
switcher, ⌘K, *New ▾*, ＋, the front door and the directory are drawn from
them, so they cannot disagree, and a fourth project type or a seventieth tool
reaches every one of them by being declared once. Every page is the same
parts in the same order, so a person learns the app once; the canvas in the
middle is the method's, so a fishbone still looks like a fishbone. Fixing the
presentation alone (B3, B7) would leave the rail growing and the line
unnamed; fixing the structure alone (B2) would leave six headers and nineteen
report labels. They go in that order: places, then the way between them, then
how each page is drawn.

## 17. Migration and regression protection

**What is protected, and how it is checked in every slice:**

| | How it is protected | Checked by |
|---|---|---|
| **Addresses** | every route in `state/useRoute` stays as it is, its old aliases with it (`/changeover`, `/start`, `/methods`, `/commissioning`, `?view=` lenses); new pages get new addresses beside them | a route list in the gate (B0): every address today opens its page on the seeds, with no error and a title |
| **Records** | no slice writes a new field, table or store; `src/db`, `src/cloud` and `supabase/` untouched by the frame slices | the diff of each slice; `sync-schema.test.ts`; the journeys read their records back |
| **Associations** — line, project, *uses* | moved only by the writers that move them today (`StudyPlace`, the standards' `BelongsTo`, the register's Project box) behind the one Belongs to control | the existing acceptance scripts for each (project-workspace, snags, line-capacity…) |
| **Permissions** | every control that writes checks `useAccess` — *New ▾*, ＋ and Problem included | a client and a team pass of `structure.mjs` (`faultline.access.force`) on every scope: nothing offered that the database would refuse |
| **Reports** | the papers' generators untouched; Report ▾ calls them as the buttons do now | the gate's report-stress and fuzz; a parity check (B0): the text of every paper read back before and after the slice, equal but for the date |
| **Sync** | the frame reads local records only; no slice touches `src/cloud` | `sync-two-devices.mjs` in every gate |
| **Offline** | the scope comes from the address, the switcher from this device's records; recents and starred tools kept on the device (with a fallback when storage is refused) | `structure.mjs` run once with the network off: the frame, the switcher and ＋ work |

**Two defects found by the validation**, both today's, both D11:

1. **A row on *Actions* or *Every action* opens nothing.** Tapping a stage,
   test or fix sets `?open=` but the record drawer is not mounted on those two
   pages (`ui/RecordDrawer` RECORD_ROUTES lacks them). `actions.mjs` passes
   because it checks the address, not the drawer — a check of the box, not the
   drawn thing.
2. **A client is offered the Problem button inside a project**, preset to it,
   and can save; sync never sends a client's rows (`src/cloud/sync.ts`, "the
   screens offer a client nothing to change"), so the problem stays on that
   device alone. Shown with `faultline.access.force = client` on 22 October.

**The high-risk changes and their recovery.** Because no slice changes a
record or the database, every slice can be undone by putting the previous
build back — Vercel's previous production deployment promoted at once, then
the merge reverted on `main` and the gate run. Nothing has to be migrated
back; what this device remembers (recent places, starred tools) is ignored by
the older build.

| | Risk | Where | Guard | Recovery |
|---|---|---|---|---|
| R1 | A page becomes unreachable, or a journey longer, when the rail changes | B2 | the route list; the journeys against their targets; ten acceptance scripts moved to the new places with their assertions kept | the previous deployment, then revert |
| R2 | Taking a problem gets slower or fails offline on the floor | B2 | ＋ opens on the Problem form — one tap; J7a; the problem acceptance and sync scenarios offline | the previous deployment; ＋ is one commit of its own |
| R3 | A page loses a control or a paper when it moves to the page header | B3 | PAGES.md and the inventory — anything taken off is listed with its reason; paper parity | revert the page's commit — one page a commit |
| R4 | A tool loses a feature in the shell | B4 | one tool a commit; its acceptance script; the inventory | revert that tool's commit |
| R5 | Words change under the team's feet | B5 | the smoke test's word list; Line Talk names no screens (checked: `lib/talkAssist`) | revert |
| R6 | Stops timed — the most used floor capture — breaks in the fold | B6 | the stops acceptance (upgrade, shift-losses), sync with stops, J1 and a stop timed on a phone | revert; the old routes stay throughout |
| R7 | A touch target shrinks on a phone in the density work | B7 | `structure.mjs` asserts 44 px and more on a phone | revert |

## 18. The acceptance standard

**A slice is done** when all of these are true and shown, in this order —
and only then is it merged, live and reported (CLAUDE.md, *Finished means
live*):

1. **Nothing broken.** The full gate green; the route list, paper parity, the
   client and team passes and the offline pass green; every page that moved
   photographed on live and on the change and looked at; anything a page no
   longer shows taken off PAGES.md in the same commit, with the reason.
2. **Easier, measured.** The eight journeys run against the baseline: none
   longer on its main device, the slice's own journeys at their targets (§15),
   no hunt for a place to go, and every screen naming the place — from B2,
   on every page.
3. **Coherent across workspaces.** On the factory, a line, and a project of
   each type: the context bar names the scope; the rail holds that scope's
   pages and the way up and nothing else; the phone bar stays fixed through
   the scope; every page has the one header with one title and, where it has
   paper, Report ▾; *New ▾* offers the tools by kind and puts each where its
   kind lives. Checked by `structure.mjs` on every page in PAGES.md, at desk
   and phone.
4. **Still small as it grows.** The same checks on a factory of 30 lines, 50
   projects, a stage gate of 12 machines and every catalogue tool marked
   available in a test registry: the factory's rail 8 lines, a line's 9, a
   project's no more than 18 with its machines folded; any line or project
   found by the switcher in three keystrokes; no page slower to draw than
   today's by more than a fifth.
5. **Accepted by the people who use it.** Rowland, and at B2, B4 and B8 one of
   the team, walk the slice's journeys on their own phone and laptop; what they
   say is written in the slice's notes. A slice they find worse is fixed or
   put back — never argued with.

**Each slice's own criteria:**

| | Done when, besides the five above |
|---|---|
| B0 | both defects fixed and their checks test the drawn thing (the drawer open; no Problem offered to a client); `journeys.mjs`, the route list and the paper parity in the gate, the baseline committed as measured |
| B1 | every part of §7 on the parts page, each used by at least one page; the ratchet in the unit tests at today's counts; every tool-shaped catalogue entry has its kind, and the catalogue test refuses one without |
| B2 | the frame as §5.2–§5.3 on every page; orientation on every screen; J1, J3, J4, J7 at their targets; the rail never above its fixed size on the scale seed; the four hand-kept tool lists gone, the registry the one |
| B3 | every page in PAGES.md with the page header and one title; every paper reachable from Report ▾ named for what it is; the nineteen labels gone; paper parity holds |
| B4 | the eleven tools, the stops log and the registers on the shell; each kind's list in its place; one Belongs to; each tool's acceptance script unchanged and green |
| B5 | Home without the control room's lists; Projects listing projects; the words of §5.7 on every screen and paper and in the smoke test; Results and Evidence (D9) |
| B6 | stops timed under Line ▸ Logs with Capture · Analyse · Evidence · Meeting as its views; the old addresses opening it; no nested rail left |
| B7 | the ratchet lower than B1's on every count; desk controls 32–40 px, phone 44 px and more; one tile, one title size, three breakpoints |
| B8 | every journey at its target on the floor, by the team; the baseline measured again and the difference written in this document |

## 19. For approval

**The architecture.** Home (yours) above three scopes — the **factory**
(Control room, Actions, Problems, Projects, Lines, Programs, Tools, Reports),
a **line** (Overview, Problems, Machines & programs, Products, Tools, Logs,
Projects, Reports, Set up) and a **project** (Overview, its type's own pages
from `lib/planModel`, Actions, Problems, Tools, Notes, Reports, Details) — and
the **library** of tools, each of a kind that decides where its records are
listed. One context bar and switcher, one rail per scope, one phone bar per
scope type, ＋ that opens on a new Problem, one page header with Report ▾, one
tool shell. No record moves; every address stays.

**The sequence.** B0 the defects, the baseline and the guards → B1 the
foundations and the registry → B2 the scope frame → B3 the page header and
reports → B4 the tool shell by kind → B5 homes and words → B6 the line's logs →
B7 calm and density → B8 the floor walk. Each live on its own, each meeting
§18.

**The decisions, one line each:**

| | Decision | Recommended |
|---|---|---|
| D1 | Three scopes; the rail shows only the scope's own pages | yes |
| D2 | The tools leave the rail; each scope's Tools, Products and Logs and the library take them | yes |
| D3 | Control room problems no longer on every rail; Problem on every page | yes |
| D4 | Home yours; the control room the factory's; Projects lists projects | yes |
| D5 | One word each, including *Tools* for a scope's uses and *Logs* for running entries | yes — or name *Logs* otherwise |
| D6 | The phone bar fixed within a scope: the project's second place its main page, ＋ in the middle | yes |
| D7 | Compact at a desk, comfortable on a phone | yes |
| D8 | The line study folded into Line ▸ Logs as *Stops timed* | yes |
| D9 | 6M and tree: Evidence is the project's Tools page with the filmed line; Numbers and Wins one page, Results | yes |
| D10 | Home's "what you owe" — left off, or by your name typed on the device | left off |
| D11 | The two defects fixed first, on their own | yes |
| D12 | The acceptance standard of §18, Rowland's walk included | yes |

## 20. Built — slice by slice

Rowland, 23 October, while B0 was in its gate: *"Work out a way to complete
the plan faster."* So the full gate still runs before every merge to `main`,
but the slices reach `main` in four batches — B0, then B1 with B2, B3 with B4,
and B5 to B7 — each slice its own commit, so one can be reverted alone; and
the next batch is built in its own worktree while the gate checks the last.
B8's re-measuring is done here; the walk by Rowland and the team is theirs.

| | Live | What it did |
|---|---|---|
| B0 | (this commit) | The two defects: a row on *Actions* and *Every action* opens its record in the drawer (`ui/RecordDrawer` RECORD_ROUTES), and `actions.mjs` checks the drawer, not the address; a client is offered no Problem inside a project, and the sheet says so and holds Save for a project they may only read (`snag/QuickSnag` useCanTakeProblem). The guards: every address kept (`src/state/__tests__/routes-kept.test.ts`, 89 addresses); the journeys against their baseline (`scripts/journeys.mjs`); paper parity (`scripts/paper-parity.mjs`, report-stress `--repeatable` on live and on the change); `scripts/acceptance/structure.mjs`, the structure's own acceptance, from the client and team passes. |
| B1 | (with B2) | The registry: every tool-shaped catalogue entry says its kind (study 28, standard 14, log 17, register 9, document 3) and where one starts, and the eleven a person can open say how they show (`src/catalogue/types` Kind, AppFace; `src/catalogue/registry` APP_TOOLS) — the rail, the front door and a line's page read them, their lists unchanged (`registry.test.ts`). The tokens completed (three used and never defined; spacing; the desk's tap size; the three breakpoints said). The ratchet (`src/ui/__tests__/ratchet.test.ts`) at today's counts. The parts (`src/ui/parts.tsx`: PageHeader, ReportMenu, MoreMenu, ViewTabs, FilterBar, Section, RecordRow, StateTag, BelongsTo, Tiles) on the parts page (`#/parts`, development), in the inventory; a menu opens across a phone above its bar. No page a person uses moved; `--t-small` now defined makes a few small labels 13.5px as they were meant (the capability chips, the directory's meta). |

