# Enterprise UX — the transformation (7 November)

**Read this before touching a page's layout, a shared part, the frame or a report's presentation.** Where `docs/LOOK.md`
(the dress, look E) or `docs/ENTERPRISE-UI.md` (E0–E7) disagree with this on *layout and distribution*, this wins; their
tokens, the five state colours with their words, light paper and the four questions stand.

## The brief — Rowland, 7 November

*"I want Faultline to look and feel like a premium enterprise software product designed by a world-class product design
team … comparable to Microsoft Teams, Microsoft Planner, Microsoft 365 and Linear. These are design benchmarks, not
templates to copy … This is a UI/UX transformation, not a feature development exercise. Do not confuse improving the
appearance of individual screens with designing a coherent software experience."*

It should feel **professional, intuitive, calm, precise, modern, consistent, exceptionally well organised, suitable for
serious manufacturing businesses**. It should avoid **generic AI-generated dashboard aesthetics, excessive cards and
boxes, unnecessary gradients, oversized headings, excessive rounded pills, randomly distributed buttons, inconsistent
spacing, cluttered navigation, screens that look like collections of unrelated components.**

The references he gave: Microsoft 365's shell (*navigation, workspace, typography, spacing and overall design
language*), Planner (*boards, assignments, task details, people, dates, linked records and contextual panels*) and a
manufacturing analytics page (*specialist tools, data presentation, analysis and reporting*). The journey to support:
**Factory → Problem → Investigation → Countermeasure → Assigned action → Verification → Report**, with related records
linked, side panels for quick inspection and editing, full pages only where the work needs a working environment.

The same day, on the line and Factory pages: *"the picture has these in the middle of the page — why? We need buttons at
the top of the page, not long cards taking up large sections of the page; the machine shows all details — we don't need
this — simple header with click here; hate the tools section on the page; factory page — terrible layout when showing the
lines."* And: *"go ahead, start with the factory page."*

**Do not:** remove useful functionality to make a screen look cleaner; simplify the specialist tools into basic forms;
rewrite wholesale; change the data model, business logic, permissions or a working feature.

## The audit — what the app is today (7 November, screenshots at 1440 and 390 of the seeded app)

| Page | Height at 1440 | What is wrong |
|---|---|---|
| Factory `#/` | ~4,650 px | A navy gradient hero; four question cards; two answer panels of unequal height; the Lines board squeezed into a half column with cards of very different heights (the worst problem printed whole, bold red); then the old control-room band repeating the counts in other words, *No date agreed*, *This week* (a third list of what is owed) and a Gantt of every project with stacks of pills a row. Three places say what is late. |
| A line `#/lines/:ws` | ~3,050 px | Twelve full-width boxes one under another; three of them empty states as big as a full one (Spread what works, See it on the line, Eyes on the line); the doors to walk, film and talk are cards in the middle, not buttons at the top; the machine cards print every problem in full; Tools is a grid of 14 equal cards plus a stray button and a 6M door of another shape. |
| Problems `#/snags` | ~2,050 px | A list grouped by line then by project, the same pill shapes for priority and state; opening a problem expands a long form **inside the list** (3,500 px) rather than a detail panel beside it. |
| Actions `#/actions` | ~2,650 px | One long list; no board or timeline view; who owes what said in a line of words. |
| Tools `#/tools` | ~15,500 px | A gallery of every tool and mode with its picture — a brochure, not a working place. |
| A project | ~2,550 px | The method's journey and sections as boxes; good content, the same box for everything. |

What runs through all of it: **every block is the same white rounded box with a shadow**, so nothing has a level; headings
are large and many; pills carry state, priority, kind and counts alike; actions sit wherever the block that owns them
sits; the same fact is drawn in two or three places; a record opens in a different way on every page (inline, a drawer,
a page).

## The design system — the rules every slice applies

Built on the tokens in `src/styles.css :root` (look E). What changes is how they are used:

1. **Levels, not boxes.** A page has one *header region* (title, its one sentence, its actions — no box), then a *working
   area* on the canvas. A **panel** (white, hairline, no shadow) holds one job; inside a panel, rows are parted by
   hairlines, never nested boxes. Shadow only on what floats (a menu, a drawer, a card being dragged).
2. **Type scale.** Page title 22 px/700; panel title 15 px/650; body 14–15 px; detail 13 px muted; label 12 px; numbers
   tabular. No heading larger than the page title anywhere inside a page.
3. **Spacing.** A 4-px base: 4 · 8 · 12 · 16 · 24 · 32. Panels pad 16–20; a page's regions are 16 apart at a desk,
   12 on a phone.
4. **Buttons.** One primary a page (blue); secondary is outline; tertiary is a text link; destructive is text in red
   behind a confirm or Undo. A page's actions live in its header region — never in the middle of the page.
5. **Status.** State is a **small dot and its word** in the state's colour (the five, unchanged); a *pill* (filled) only
   for the one abnormal thing a row is about (Critical, Late). Priority is a word with a dot. Counts are plain numbers.
6. **Tables before cards.** A list of like things (lines, machines, problems, actions, projects) is a table or a list of
   rows with columns that line up; a *card* is for a thing with a picture or a figure that is the point (a machine, a
   KPI).
7. **Detail in a side panel.** Opening a record from a list opens its detail in a drawer on the right (a desk) or a full
   sheet (a phone), with its linked records (line, machine, project, actions, evidence, proof) as links in the panel; a
   full page only for a working environment (a tool, a project).
8. **Navigation.** The navy rail (Factory · Projects · Problems · Actions · Tools, Reports at its foot) is the app bar;
   a scope's tabs are the secondary navigation; the breadcrumb is the context bar. Nothing new is added to the rail.
9. **Empty, loading, error.** One line of muted words with the one action that fills it, inside the panel that would hold
   the content — never a panel of its own for nothing.
10. **Phone.** One column; the header's actions wrap under the title; a desk's right rail follows the main column.

## The slices

Each slice is live on its own — its gate, `main`, Vercel READY — and changes no record, address or permission. Each ends
with screenshots at 1440 and 390 shown to Rowland, and the quality gate below answered in writing.

| Slice | What | Status |
|---|---|---|
| **X0** | This document: the audit and the design system | written 7 Nov |
| **X1** | **The shell and the Factory, as Microsoft 365's home** (7 November — Rowland, after the first attempt kept the navy frame and a right rail: *"the factory page looks nothing like the clean version in the picture … we want the app to look like how Microsoft would look like if it built it"*). **The shell:** a white top bar across the window — the mark and *Faultline* in the press colour, where you are and Go to ▾, the search in the middle (*Search lines, projects and tools*, the Jump to finder), Problem and you on the right; a narrow white rail (76 px) of icons each with its word, the page you are on in the press colour with a bar at its edge, a count as a small badge, the reports and the sync's state at its foot; the phone's bar white. The navy frame of look E is superseded on screen. **The Factory:** a soft wash behind a large greeting, its one sentence, Report ▾ and New project, the quick buttons; the four figures one strip; **Needs you now** — three cards, the dearest problem and the late actions, each opening its record; the **Lines** as the quick-access list (a table with column heads, a row a line); the three answers side by side; the projects' board last (its redesign is X4) | built 7 Nov |
| **X2** | **A line** — its doors (Walk the line · Film the work · Talk it · Time a stop) as buttons in the header region; Eyes on the line and Spread what works as one-line strips when they have nothing to show; machines as simple cards (picture, name, *n open · n critical*, Open); Tools as a table of what is in use and a row of chips for the rest | **built 7 November** — the doors a row of buttons under the header (Time a stop first, Walk the line, Film the work, Talk it, Action tracker; each saying what it does in its title), Spread what works and Eyes on the line side by side, the tools in use a table on the Overview (name · what it found in its state's colour · how many), the rest a row of chips; the cards stay on the Tools tab |
| **X3** | **The record panel** — one drawer for a problem, an action, a machine and a program: its fields editable in place, its linked records, its journey; opened from every list | **a problem built 7 November** (`src/snag/ProblemPanel.tsx`) — opened over the page from the line's tracker, the line's Overview, the Factory's two lists and Actions; Planner's task details: its words as the title, where it stands in a sentence, Status and Priority chips, Whose, Due, the plan, the latest, what it waits for and holds up, its journey, *Open the full record ›*. The stage gate's step, test and fix already open in the same drawer (`ui/RecordDrawer`). A machine and a program next |
| **X4** | **Planning** — Actions as List · Board (by state) · Timeline · People views; due dates, overdue and blocked said the same way everywhere; the project's own Actions the same views | **the Board built 7 November** — on the factory's and every project's Actions, beside Who · When · Where: four columns by when (Late · Due in the next 7 days · Later · No date agreed), each counting its cards, a card an action (what, priority, where, who, when in words, late red down its edge) opening its record; the phone stacks them. The timeline is a line's own (its action tracker's Gantt, with what waits for what) |
| **X5** | **Projects and problems** — the register as a table with the record panel; a project's page as a workspace with its method's sections as a list, not boxes | **the register built 7 November** — each group one bordered list with hairline rows (no card per problem), the pictures 36 px, the words at body size and the details at label size, the group lifted by the frame's shadow; the page 14% shorter at a desk (2,029 → 1,754 px), the phone the same list. The project's page as a workspace is next |
| **X6** | **The tools' working environments** — a tool's page as a workspace (inputs left, the picture and figures right, the table under), the gallery as a catalogue table with a picture on hover | |
| **X7** | **Reports** — the papers' presentation as a consultancy deliverable. **First pass built 7 November** (Rowland: *"the report should look also highly polished as Microsoft would build it, we still follow our lean visual management"*): in the shared parts every paper uses — the band a crisp pale block with the press colour as a thin rule along its top (no rounded slab, no stripe down its side), the eyebrow in the press colour; the figures filled cards with no outline and no bar across the top, only the abnormal one marked by its colour down its left edge and in its number; section headings over a full hairline (the blue stub gone); tables with a pale header row; badges with small corners and soft fills; the closing line a soft block, red said with "!" not a cross (a cross read as a close button). The client and programs reports' own tiles and boxes the same. Paper parity kept (68 the same, nothing lost). Next: each paper's own tables and covers, the full package's contents | first pass 7 Nov |
| **X8** | **Phone and desk review** — every page at 390, 768, 1280 and 1440 | |

## The quality gate — asked of every screen before it is called done

Does it look like premium enterprise software? Is the information hierarchy immediately understandable? Is the screen
balanced and properly spaced? Are related functions logically connected? Can users complete common tasks without
unnecessary navigation? Are interactive elements consistent? Does it work beautifully at different screen sizes? Does
it feel like part of one coherent product? — *"Do not mark work complete just because the code compiles."*

## Words never on words — 7 November

Rowland: *"make sure words don't spill over on anything — diagrams, visuals; noticed the fishbone didn't look good."* The fishbone's ribs
are 44 px at every width (they were 34 at a desk): a cause's words wrap to two lines instead of being cut to one with "…", and its tags
stay inside its box, never across a bone. The plan's *Today* sits under the months when there is no row of days, never on a month's name.
Checked by measuring every text box on 34 pages at 1440 and 390 (`scripts/_overlap.mjs`, a working script) — no words on words but the
plan's pinned column over dates scrolled under it, which is how a timeline scrolls.
