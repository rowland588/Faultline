# The structure of the app — assessment and proposal

**Status: proposed 22 October, for Rowland to approve. Nothing in it is
built.** Stage A of his brief of the same day (*Whole-application structural
design and UX elevation*). Stage B — building it — starts only on his
approval, in the slices of §10, each gated and live on its own.
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
│     Overview · Problems · Machines & programs · Products · Studies ·
│     Stops timed · Projects · Reports · Set up
│
└── A PROJECT   the change as a workspace — everything done in it lands in it
      Overview · <its method's pages> · Actions · Problems · Studies ·
      Notes · Reports · Details
        stage gate: Plan (Install · Set up · Commission · Hand over · Timeline),
                    Machines ▸ each, Programs, Materials, The day
        6M:         Fishbone, Board, Evidence, Results (Lines · Numbers · Wins), Pareto
        lever tree: Tree, Board, Results

TOOLS (the library)   every tool, found by the problem; each tool's studies
                      everywhere; started into the scope you are in
```

A study (one use of a tool) belongs to a line, a project or nobody, as now; it
is listed in the scope it belongs to, under **Studies**, and in the tool's own
list in the library. Nothing moves in the database.

### 5.2 Navigation, at a desk

- **The context bar** (the top bar): the mark (to Home); the scope as a trail
  — **Factory ▸ Line 2 commissioning ▾** — whose ▾ switches to any line or
  project, recent first, typed to filter (⌘K's list); search (⌘K, widened to
  records); **Problem** — one place, as now; **＋ New** — the rest of what is
  captured or started (time a stop, count a shift, start a study, Line Talk),
  landing in the scope you are in, as the phone's ＋ does; you.
- **The rail is the scope's own pages only** — 8 to 12 lines, never the
  factory's inside a project, never the list of every line and project, never
  the eleven tools. **↑ Factory** at its head, as Procore's arrow up. The
  counts and squares stay (`useStanding`, `useMethodCounts`).
- **A stage gate's machines** stay a group under *Machines*, folded past six.
- **Tools** are one line, **Studies**: the scope's uses of every tool,
  grouped by tool, each saying what it found (the line page's cards), with
  **New study ▾** — the tools you use first (starred, as Procore's favourites),
  then *Find a tool by the problem* (the catalogue's routes).

### 5.3 Navigation, on a phone

- **One bar, the same in every scope:** *Overview · Actions · ＋ · Problems ·
  More*. Positions never move.
- **＋** opens the capture sheet: **Problem** first, then *Time a stop*,
  *Count a shift*, *Start a study*, *Line Talk*, *Photo* — landing in the scope
  you are in. It replaces the floating *Problem* button that covers the page.
- The scope's name at the top with ▾ to switch and ↑ to go up.
- *More* is the scope's rail — short now, so it fits a screen.

### 5.4 Every page, one anatomy

```
Factory ▸ Line 7 ▸ Studies                                [More ▾] [Report ▾] [Primary]
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

### 5.5 The tool shell

Every tool, built and to come, gets the same four things, so the catalogue
can grow without inventing pages:

1. **Its list** — in a scope, under Studies; in the library, every one, by
   line and project, with the finding of each.
2. **Its header** — tool name as the eyebrow, the study's name, its state,
   *Report ▾*, *More ▾* (rename, move, delete with Undo).
3. **Belongs to** — one control: *On Line 7 · in Line 2 commissioning ·
   Change*, the same on every tool.
4. **Its canvas** — the method's own, free.

### 5.6 Home, the control room and Projects

- **Home** is yours: carry on where you were, what you owe, what is under
  way, start a project or a study. It stops repeating the control room.
- **Control room** is the factory's overview — "am I in control?" — as now.
- **Projects** lists the projects: live first, by method, line and state, the
  archive behind a filter. The page that told you to look elsewhere goes.

### 5.7 One word for each thing

| Thing | The word | Instead of |
|---|---|---|
| The view of everything | **Control room** | *Home* used for it |
| Something wrong, raised | **Problem** | *Control room problems* (the scope says whose), *snag* |
| Something owed | **Action** | *Every action* (the factory's *Actions*); *Needs you* stays as the abnormal top of a page, saying it is from Actions |
| One use of a tool | **Study** | — |
| The kinds | **Tools** | *Every tool* as a separate place |
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

| Grows | Today | Proposed |
|---|---|---|
| Tools (11 → the catalogue's 47 and more) | a rail line each, on every rail | none: Studies and the library; the catalogue's disciplines and problem routes in *New study* |
| Lines (3 → 30) | a rail line each | none: the switcher and Factory › Lines |
| Projects (3 → 50) | a rail line each | none: the switcher and Factory › Projects |
| A fourth method | its pages hand-placed in the rail | one entry in `lib/planModel`, declaring its pages |
| A new page | its own header and controls | the page anatomy |

## 9. Decisions for Rowland

Several of these change placements he agreed earlier. Rule 1 of how a change
is made: each says why the old one was there and why its replacement is
better.

- **D1 — Three scopes; the rail shows only the scope's pages.** The rail was
  the whole app drawn at once (5 October) so "back" was a glance left and
  nothing was hidden. That worked with one project and no lines; at three
  lines, three projects and eleven tools it is 27 lines, and it grows with
  every one. The trail and ↑ keep "back" one glance away; the switcher keeps
  everything one tap away.
- **D2 — The tools leave the rail; Studies and the library take them.** They
  went to the foot of every rail (10 October) so a tool was one tap from
  anywhere. *Studies* is one tap in every scope, *New study* two, and starred
  tools stay first — and the rail stops growing with the catalogue.
- **D3 — Control room problems no longer on every rail.** It was there because
  a problem is taken anywhere and sent on (flow audit #20). *Problem* stays in
  the context bar on every page and first in ＋; each scope's *Problems* is its
  own, the factory's *Problems* the whole register.
- **D4 — Home is yours; the control room is the factory's; Projects lists
  projects.**
- **D5 — One word each** (§5.7).
- **D6 — The phone bar the same in every scope**, with ＋ in the middle. It was
  built from the page you are on so the page you are on was always a tap away;
  the header already shows it, and a bar that moves cannot be learned.
- **D7 — Compact at a desk, comfortable on a phone.**
- **D8 — The line study folded into the line** as *Stops timed*, its four
  screens as that page's views.

## 10. The plan — Stage B, after approval

Each slice is gated and live on its own (CLAUDE.md, *Finished means live*);
each takes the pictures on live and on the change (`--shots`, `--compare`)
and looks at every page that moved; no slice changes a record, a policy or a
URL.

| | Slice | Depends on | Risk | Reuses |
|---|---|---|---|---|
| B0 | Agree D1–D8; record a baseline: taps and time for eight journeys, desk and phone, by script | — | none | the walk's tap ceilings (`stagegate-walk.mjs`) |
| B1 | Foundations: the tokens, the ratchet, the parts of §7, a page showing them | B0 | low — nothing a person sees moves | `btn`, `Lean`, `Sheet`, `Chip`, `EmptyState`, the tokens |
| B2 | The scope frame: `lib/scope` (route → scope and its pages, pure and tested) in place of `projectOf`/`placeOf`/`hereOf`; ContextBar and switcher; a rail per scope; the line a scope; Studies and the library; the phone bar and ＋ | B1 | **medium** — ten acceptance scripts reach the rail or the bar by class (most go by URL); each is moved to the new places with every assertion kept | `ui/rail`'s counts, ⌘K's list, P2's `?project=` |
| B3 | Every page on the page header and Report ▾ (PAGES.md and the inventory with them) | B1, B2 | medium — many pages, mechanical | `ReportsSheet`, the papers as they are |
| B4 | The tool shell for the eleven tools; STANDARD.md requires it of every tool after | B3 | medium | `StudyPlace`, the standards' `BelongsTo`, each tool's list |
| B5 | Home, the control room and Projects; the words (§5.7) and the smoke test | B2 | low | `lib/portfolio`, `lib/projectActions` |
| B6 | The line study folded into the line as *Stops timed* | B2 | medium — the oldest screens (`AppShell`) | the four screens as views |
| B7 | Calm and density: sizes, shadows, tiles, titles, breakpoints; the ratchet brought down page by page | B3 | low — looked at with Rowland on the pictures | the tokens |
| B8 | The floor journeys walked again on a phone; the baseline measured again | all | — | B0's script |

**Proved by**, in every slice: the full gate; the pictures compared; and a new
acceptance script, `structure.mjs`, run on every page in PAGES.md at desk and
phone — the context bar names the right scope; the rail has only that scope's
pages and the way up; the switcher reaches every line and project; one header
with one title; a Report menu wherever the page has paper; the phone bar the
same across a scope; every control at least 44 px on a phone; nothing wider
than the screen. And the eight journeys of B0 measured again: fewer taps, or
the reason why not.

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
  the line study's nested rail.
- **When approved**: BLUEPRINT §1 and §3 are rewritten to the scopes in the
  same commit as B2, and CLAUDE.md points here.
