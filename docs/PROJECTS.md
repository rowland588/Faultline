# The project is the workspace — 21 October

Agreed with Rowland, 21 October. Where an older document says *job*, or puts
the tools beside the projects rather than inside them, this one wins
(docs/DIRECTION.md still comes first; this is how its "drive through to the
actions" is built).

## What he said

On the action tracker, first: *"there is actually no page for just like the
classic kind of action tracker ... we basically don't have a proper way for a
team to visualise everything together and manage the actions ... when you're
going through StageGate ... you find problems, snags, evidence, but there is
nowhere for a home to then follow through. Everybody wants to say great, who's
doing what and when, why ... can we see who the owner is."*

Then the thought that organises it: *"when you make a project, which I don't
think a job should exist, by the way. I think a project is the project and
everything is inside the project ... all of them tools that you use are within
that project automatically. If I create another project, then the same tools
are available, but only for that project ... It's almost like workspaces ... I
don't have to think about, I'm going to use this tool, I'm going to assign it
to this project. No, everything is wrapped up in a project ... Everything will
then automatically always go to the action tracker within that project ...
It's not about ripping the app up ... This is actually about streamlining and
condensing it and making sure everything actually fits together correctly."*

And the day before (docs/DIRECTION.md): *"you just want to be able to put
whatever you find into some sort of project and just drive through to the
actions."*

## The decisions (21 October, his answers)

1. **One word: project.** A job and a project were one record (`projects`)
   under two names — the rail said *Projects* and then listed them under
   *Jobs*; the list's page was headed *Jobs* with *New job*. *Job* goes from
   every screen and every paper.
2. **The factory stays shared.** Lines, machines, programs, the line
   standard and Line capacity are true for years and used by many projects —
   a new bagger's stage gate this month, a 6M on the same line next quarter.
   A project points at its lines; it never holds a copy (the tangle undone on
   13 October, docs/BLUEPRINT.md §1, rule 2). *Asked and chosen: "Shared —
   projects point at their lines."*
3. **Work done outside any project stays on its line**, as now — a snag on
   the floor, a quick study — and is moved into a project with one tap.
   Inside a project, everything goes to the project by itself. *Asked and
   chosen: "On its line, move it in later."*
4. **The control room stays above the projects** — the one place that sees
   every project and every line at once ("am I in control?").
5. **Go — plan, then build in slices**, each gated and live on its own.

## The shape

```
CONTROL ROOM   every project, every line — and every action across them (P4)
   │
YOUR FACTORY   lines → machines → programs → standards. Shared; projects point at them.
   │
ON THE LINE    work with no project: a snag, a quick study — moved into a project with a tap
   │
PROJECTS       the workspace. Open one and the app IS that project: its front page, its
               method (stages · fishbone · lever tree), its tools, its problems, its
               ACTIONS, its reports, Line Talk. Everything done inside lands in it.
```

No new record. Every record a project's work makes already carries the
project (`projectId`): problems (`snags`), a stage gate's findings, next
steps and notes (`test_items`), its stages, tests and fixes (`tests`), the
6M board's actions (`pace_todos`), every use of a tool (`studies`, Line Talk
among them), line standards and Line capacity (`standards`). What was
missing is the experience: the project was not a place you worked *inside*.

## The slices

### P1 — One word: project — built 21 October

Every screen and paper says *project* where it said *job*: the rail, the list
(*Projects*, *New project*), the front pages, the tools' *Use it for*, the
reports, the control room and Line Talk's context. Code names (`jobLine`,
`useJobInputs`) stay — they are not seen. The smoke test fails if *job* comes
back on a screen, as it does for the other old words (BLUEPRINT §5.9).

### P2 — Open a project and the app is that project — built 21 October

- The project is carried while you work in it: a tool opened from inside it
  keeps the project's rail, not the control room's.
- The project's rail: its front page; its method (the four gates, the
  fishbone and board, or the tree); **Tools** — the same ten, each opening
  *this project's* uses of it; Problems and Actions (P3); Reports; Line Talk.
  The control room and Your factory stay one tap away at the top.
- **Lands in it by itself:** a tool started inside the project is the
  project's (no *Use it for* asked); a problem taken with the Problem button
  inside it is the project's; a Line Talk started inside it is on the
  project and knows it.
- Its lists show the project's own: the project's Line capacity, its SMED
  sessions, its talks — the line's other work one tap away.
- Outside a project, nothing changes: a tool used on a line is the line's,
  and *Move into a project* takes it in.

**As built (21 October).** A tool's page is still one page for every line
and project; inside a project its address carries it — `?project=<id>`,
put on every tool in the project's rail (`lib/inProject` inProject, `ui/rail`
toolsGroup) — so the frame keeps the project's rail (`ui/Frame` projectOf)
and the page reads it (`lib/useInProject`). Its list opens on **the
project's own**, with *Everything on its lines* (the line's own work and
other projects' on the same lines) and *Every line* one tap away
(`ui/ProjectScope`; `lib/inProject` inScope). **New** there makes it on the
project — the sheet says *For <the project>*, never asks *For a project?* —
on the project's line when it has one, its lines offered first when it has
several (`startLine`): the five studies (capability, value stream, SMED,
work sampling, loss count), the line standard, the line balance, Line
capacity, the video study and Line Talk, which then knows the project it is
on. A record opened — a study, a talk, a video study, a product's line
standard — wears **its own** project's rail however it is reached, and a
record on no project the control room's. The Problem button on any of them
takes a problem for the project (it already did on the project's own pages).
New is offered inside a project only to those who may change it
(`useAccess` can.edit) — a client of the project reads, as before.

*Not yet:* the links into a tool from inside the project's own pages (the
6M Evidence lens, a stage's line standard, the fishbone's *Count a shift*)
open the record or the line's list as before, not the project's list; and
*Move into a project* is the record's own *Attach to a project* (StudyPlace,
the line standard's BelongsTo), as it was.

### P3 — The project's actions — built 21 October

One page in every project — **Actions** — the classic action tracker: every
action in the project, from wherever it was raised, with **what · why (the
problem it answers, and its priority — Critical, High, Low) · where (line,
machine, stage) · who · when (late in red, due soon amber) · where it
stands**.

- **What it reads** — no new record; each row is its own record, changed
  where it sits and read everywhere it already shows:
  - a stage gate's **next steps** (`test_items` kind `next`) and the
    **findings** they came from (kind `found` — critical or high risk);
  - a stage gate's **fixes** (`tests` kind `fix`);
  - the 6M board's **actions** (`pace_todos`) and the cause each answers;
  - the project's **problems** (`snags` with the project) — owner, due,
    priority, their journey.
- **Every finding can be followed through:** *Make it an action* on any
  finding, problem or stage that has none — who, by when — and it is on the
  Actions page at once.
- **Views:** by person (who is doing what), by date (late first), by where
  (line · machine · stage); filters for priority, state and person.
- **Act in place:** who, due, done, an update — with Undo; written back to
  its own record.
- **Tiles** (the lean page): open · late · due this week · no owner · no
  date · done since last week. **Paper:** the action list for the meeting,
  and each person's own.
- *Who* stays typed (the people list was left out, 17 October); the names
  already used are offered as you type, and one person's actions are read
  together however their name was cased.
- The page is called **Actions**: *tracker* stays off the screens (it named
  the Excel import retired on 13 October, and the smoke test keeps it out).

**As built (21 October).** *Actions* is on every project's rail, beside
Problems (`#/project/:id/actions`, screens/ActionsScreen). Its rows are
every thing the project owes, read the way its Needs you reads them — a
stage, a test, a fix, a part of the plan, the board's actions, a check that
keeps a gain, the materials, programs and machines waited on, the open
critical problems and high risks (lib/portfolio, through the control room's
own inputs) — and the register's problems taken for the project and not on
it yet (lib/projectActions, lib/useProjectActions). So *late* here is the
late of the band, the rail and the control room. Each row: what, its kind
and priority in words, where, why, who, by when (late red, soon amber).
Seen by **who**, **when** or **where**; only the **late**, the **critical
and high**, or **nobody yet**. The lean page's six tiles and the closing
line. A row opens its own record — the drawer over the page for a stage,
test or fix, its list for the rest, the register for a problem. **Paper:**
the list for the meeting, and each person's own (*Their list*;
lib/projectActionsPdf). acceptance/actions.mjs drives it.

*Not yet:* changing who, when and done on the Actions row itself (with Undo)
— today the row opens the record, where each is changed; *Make it an action*
on a finding that has none; names offered as you type.

### P4 — Every project's actions, in the control room — built 21 October

The same page across every project and every line's own problems — the
team's view of everything: by person across projects, late first, filters
by project and line; its tiles in the control room; its paper.

**As built (21 October).** *Every action* under the control room on its rail
(`#/actions`, screens/ActionsScreen EveryActionScreen): every project's
Actions, each read as its own page reads it and marked with its project
(lib/projectActions everyAction), then every open problem on a factory line
with no project. The same tiles, closing line and paper; seen by who, when,
where or **project** — one person's actions across every project in one
group. *Not yet:* its tiles on the control room's own page; a filter by line.

## After P4 — tightening, once the project is the workspace

- **The week** — the project's report to whoever it reports to: what we
  did this week, what we are doing this week and next, the tools we will use
  ticked with what for, Rowland's commentary (`docs/WEEK.md`, 23 October;
  planned).

- Line Talk inside a project knows the project, its stages and its actions;
  what it finds is offered as an action a person adds with a tap (Line Talk
  slice 3, docs/LINE-TALK.md).
- The front door opens the project you were last in.
- Every report is taken from inside the project, the project's tools' papers
  among them.
- One *New* inside a project: a problem, an action, a tool, a talk — all
  landing in it.

## Not changed

The three methods (stage gate, 6M, lever tree) and their pages; the factory
and the line's page; the control room's other pages; access levels (owner ·
team · client — every new control checks them); nothing in the database for
P1 and P2.
