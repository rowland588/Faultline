# Areas — the four answers, the cards' actions, and an area that holds its own work

Agreed with Rowland on 14 November, after the Factory became a card an area (`docs/STATE.md`, 14 November): *"It's a card, it's a
location, a point to say these things live in this area. Click on if you want to then follow through."* Three things were agreed and
left unbuilt; on 15 November he said **"go ahead make it all"**. They are built in three slices, each live on its own.

| Slice | What | State |
|---|---|---|
| **A2** | The Factory's four answers for an area and for a line | built 15 November |
| **A3** | Each tool card says how its actions stand; problems and failed tests as cards | built 15 November |
| **A4** | The area a real thing: picked from a list, every line in one, able to hold its own problems, tools and actions — so Dispatch, an area with no lines, works | built 15 November |

## A2 — the four answers for an area and for a line

**One reading, given fewer lines.** The Factory's four cards (what's going wrong · what needs doing · who's responsible · did it work)
rest on one reader, `lib/useFactoryRead`, over the register's open problems priced by each line's cost model, every project's actions and
every line's own problems, and the fixes proved. `lib/useScopeQuestions` gives that same reader only the lines in view: the area's
lines, or one line, the projects on them (`lib/useJobFloor projectsOnLines`, the rule every line page reads them by), and the register's
problems on those lines. So an area's figures are the sum of its lines' and the factory's of its areas' — never a second count
(`docs/STEADY.md`). `loadScopeQuestions` reads the same once, for a check or a paper.

- **The area's page:** the four cards under its sentence, each a door to its answer on the page; the answers — the problems by what
  they cost, every action open with who and by when (three each, *Show all n* in place; the Factory's first three send you to Problems
  and Actions, an area has no page of its own for them); *Did it work* drawn once a fix is proved; the owed checks under What needs doing
  in a fold. The five tiles left the screen — their counts (lines, programs, projects, tools used) are the sentence's; the Area report
  keeps them. *Programs to prove* moved into a fold. Measured calmer than before (`scripts/calm.mjs`): desk 2,123 → 1,611 px, phone
  3,396 → 2,305.
- **A line's page:** the four cards under *See it on the line*'s doors; What's going wrong opens Problems below it; What needs doing and
  Who's responsible open the fold **What needs doing** (shut, its line saying how many and how many late), every action owed on the line
  with who and by when. The four tiles moved into *More about this line* as **The line in figures**; the line report prints them as before.

## A3 — each card says how its actions stand

Under each line on the area's page is a card a tool in use (14 November). A tool record's actions are **the problems held by it** —
raised from inside the tool or linked to it afterwards (`snag/toolLink problemsOn`, `docs/TOOL-PROBLEMS.md`): one rule for every tool,
no new record. So each card says, under its sentence, how they stand — *2 actions open · 1 late*, *1 action, done* — and says nothing
when it holds none. Late is red with its word; open is plain; done is quiet.

And two more cards under each line, before the tools, drawn only when there is something to say:

- **Problems** — how many are open on the line, the late and critical among them, the worst in words; the door to the line's Problems.
- **Tests that didn't pass** — the line's programs whose latest test failed, how many and the first by name; the door to the line's
  Programs.

What a Line Talk's document says should be done stays in the document until it is raised as a problem (the audit of 14 November) — the
card counts what has been raised, never words in a document; that is said here so nobody reads the card as more than it is.

## A4 — the area a real thing

**What exists.** An area is the words *client · site · area* on each line (`docs/CONSULTANT.md` K1), and since 10 November a
**department record** of the same words can stand with no line (`lib/departments`, `docs/FACTORY-WALK.md`) — Dispatch has a page, but
nothing can be raised, started or owed there.

**The area's own place.** Every tool, problem and action in the app hangs off a line (a workspace). Rather than teach forty tools a second
kind of home, an area gets **one workspace of its own, marked as the area's place by its type** (`The area itself`, as a customer's
holding place is marked `Not yet placed` — `lib/areaPlace`; no column, no migration), carrying the area's words and named *Dispatch — the
area itself*. It is never a production line: `lib/lines productionLines` leaves it out, so it is on no board, picker, count or line report
(the problem sheet offers it only when the problem is raised in it). It is made the first time something is done there — *Raise a problem here*, *Start a tool here* —
never before (*"Do not force the creation of child records"*, 10 November). Then everything works as it does on a line, unchanged: a
problem raised there is on its own action tracker, a tool started there (`?line=` the place) lists and reports as it always has, and the
area's four answers count it with the area's lines.

- **The area's page** gains a section **In <area> itself** — open for an area with no lines, a fold for one with lines — holding the
  place's cards as a line's are drawn (its problems, a card a tool with its actions) and **Raise a problem here** and **Start a tool here ▾**
  (Raise a problem here also in More ▾). A problem raised there counts in the area's four answers and the Factory's, and on Problems and
  Actions like a line's own (`lib/useProjectActions`); the Area report prints the place as a part of its own after the lines. A link that
  lands on the place as a line (`#/lines/<place>`) goes to the area's page.
- **Picked from a list.** Set up the lines' *Area* box offers every area the factory has — the lines' words and the departments — so one
  area is one name; a new one is still typed (a list, never a wall).
- **Every line in one.** The Factory's *No area yet* card already lists the lines with no area and opens Set up the lines (14 November);
  nothing is forced.

**What it does not do.** It does not move a line between areas by itself, merge two areas whose words differ, or give an area people,
roles or permissions (`docs/ORGANISATION.md` does that, by area words, already).
