# The look — 6 November

Rowland, 6 November: *"i want a fesh modern look design it"*; shown paint-only variants, *"no you have applied
differnt colurs … i want something more"*; then a reference dashboard (a navy sidebar, icon cards with a week-on-week
arrow, charts in cards, status pills, progress bars, a greeting hero with a photo, a *Factory online* chip):
*"no like this"*. Look **E** on the design canvas is that language on Faultline's own pages, and he chose it:
*"yes alot better."* Then the two rules that shape it:

> *"Faultline is an operational improvement system, not just a reporting dashboard. The design needs to make it easy
> for a factory manager or improvement lead to understand what's going wrong, what needs doing, who's responsible and
> whether the improvement has actually worked."*

> *"this is not jsut factory page its evey page understand ?"*

So the look is two things at once: **the dress** (E's sidebar, cards, pills, type and colour) and **the order of
every page** (the four questions). Neither is done without the other. The canvas: `claude.ai/artifact/CQuPcoUXMVyqbCf98seUnM`,
page *E · Dashboard* (E-Factory, E-Phone, E-Problem, E-Projects).

## 0. The journey is the product — Rowland, 6 November

> *"Don't let the designer turn Faultline into a beautiful reporting application. Its real value is helping people
> move from identifying a factory problem to delivering and proving an improvement. The interface should make that
> journey feel effortless."*
>
> *"The journey is the product. Faultline takes a person from seeing a problem on a production line, through
> identifying and delivering the right countermeasure, to proving that the improvement has worked. Every screen,
> card, row, action and tool exists to move that journey forward. No dead ends. No meaningless metrics. No
> improvements claimed without evidence."*
>
> *"It should aim for the usability of great modern SaaS, the analytical depth of specialist Lean Six Sigma
> software, and the presentation quality of a premium business intelligence platform. The journey: simple, intuitive
> and action-oriented. The tools: technically capable, visually rich and professionally designed. The reports:
> exceptional presentation quality, suitable for management reviews and boardroom discussions."*

So the four questions below are not four reports side by side; they are one path, and every slice of the look is
held to it:

- **Every row is a door to the next step**, never a line item. A problem's row opens the problem with its cost and
  offers the countermeasure; an action's row opens where it is done; a proved fix shows the number that proved it.
  Nothing stops at "here is a figure".
- **The middle question carries the weight.** *What needs doing* — the countermeasure, who, by when — is where the
  work happens, and gets the most room and the clearest who-and-when on every scope.
- **"Did it work" closes the loop visibly.** A countermeasure with no proof yet says so and offers the proof (count
  the next shift, time it again); an improvement is never claimed without its before → after on the same number.
- **Nothing to admire.** No decorative chart, no figure without a next step; a chart earns its place only where it
  tells somebody what to do next. A metric that moves no step is taken off.
- **A line and a project keep the same path**, so the journey feels the same wherever it starts; a tool opens from
  the step that needs it, not only from the library.
- **Three bars, one each**: the journey as simple as the best SaaS; the tools as deep as specialist Lean Six Sigma
  software (`knowledge/STANDARD.md` already holds them to it); the papers fit for a management review or a board.

## 1. The four questions — the order of every page

Every page a person lands on answers, in this order, before anything else:

| | The question | What answers it | Its colour |
|---|---|---|---|
| 1 | **What's going wrong** | the problems, the stops, the gap to target — in money | red |
| 2 | **What needs doing** | the actions and the late ones, what to check, what to prove | amber |
| 3 | **Who's responsible** | the owner and the day on every row; the people with the most owed | violet (under way) |
| 4 | **Did it work** | before → after on the fix, the number held, the program proved | green |

On the Factory they are four cards across the top, each a door; on a line, a project, a machine or a problem the same
four as the page's bands, in that order, the detail under each. A tool's record keeps the lean page (band · tiles ·
picture · what it means · who owes what · closing line) — that *is* the four questions for a tool. A page that cannot
answer one says so in words (*nothing late*, *no fix proved yet*), never leaves a hole. Colour is the question's,
always with the word beside it; the five state colours keep their meaning inside the answers.

## 2. The dress — what E takes from the reference

- **The frame is navy.** The sidebar on a laptop and the bar on a phone are `--nav` (`#0b1a33`): the mark, the name
  and the tagline *The Operational Improvement System* at its head, the menu with an icon a line, the page you are on
  in the press colour, and at its foot the *Factory online* chip (the sync's state in words: *Synced 16:24* or
  *Offline — last synced …*). This is the one dark fill with light words; the rule *no white words on a dark fill*
  stands for everything inside the page and on paper.
- **What you press is blue.** `--brand` is `#2563eb` (white on it 5.2:1), pressed `#1d4ed8`. The under-way violet
  stays violet and is always said with its word; if the two are ever confused on a screen the violet moves, never
  the blue (decided 6 November, to revisit only if Rowland says it reads wrong).
- **The mark** stays Faultline's own trace on its pale tile (the reference's amber stroke is not ours).
- **The canvas is cool** `#f4f6f9`, the cards white with a hairline `#e6eaf0`, a 14 px corner and the faintest
  shadow; a row inside a card is parted by `#f1f5f9`. The ink is `#0f172a`, the muted words `#64748b`.
- **Type is Inter** (bundled, variable weight), headings tight (−0.02 em), numbers tabular. The name keeps Outfit.
- **A card with an icon tile** says one figure: the label small and muted, the number large, the change since the
  record before under it (↓ 22 % in green when it moved the right way, ↑ in red when it did not — the word *since
  last week* beside it). A status is a **pill** with its word. A share is a **progress bar**. A table has its own
  columns and a pill a row.
- **The greeting hero** on the Factory: *Good afternoon, Rowland* and one sentence that is the four questions in a
  line, on a navy gradient, the ＋ Problem and Line Talk doors in it. Only the Factory has it; a line, a project and
  a tool keep their page header.
- **No OEE**, no sensor figure, nothing typed by a machine — every number stays counted, timed or tapped by a
  person (CLAUDE.md, *measured by people*).

## 3. What stays, whatever the dress

The five state colours and their meanings with the word beside them; light paper (every paper and every band inside
a page is a pale fill — the frame is the only dark thing); one word per thing and one place per thing; the lean page
on every tool and every report; the pages, the doors and the addresses (the acceptance scripts press by name, and
nothing on this plan moves a door); money from the one cost model; the phone bar's five.

## 4. The slices

Each slice is live on its own (its gate, `main`, Vercel READY) and changes no record, address or door.

| Slice | What it does | Gate |
|---|---|---|
| **L0 — the shell** (built 6 November; L1–L7 built 6–7 November — what each did is in `docs/STATE.md` §1) | tokens (`src/styles.css` `:root`), the navy rail with the mark, the tagline, icons and the *Factory online* chip (`ui/Frame`, `ui/SyncChip`), the top bar beside it, the navy phone bar with the raised ＋, Inter bundled, the card, button and pill parts on the new tokens | quick: types, lint, tests, build, smoke, inventory, journeys, structure, where-am-i, snags, factory, lines, tool-page |
| **L1 — the Factory** | the greeting hero, the four question cards as doors, the answers under them (problems by cost, actions with who and when, before → after, the lines) | factory, control-room, line-is-home, gemba, inventory |
| **L2 — a line** | the four questions as the line's bands, its machines in flow under *what's going wrong*, Tools *in use* as cards | lines, line-hub, line-report, tools-panes |
| **L3 — a project** | the dashboard on the four questions, the method's journey as a progress bar, the sections as cards | method-dashboard, methods, actions |
| **L4 — a problem and the register** | the register as the table with pills, a problem's page in the four bands, its journey as the timeline | snags, waste-walk, problem-program |
| **L5 — the tools and studies** | the lean page's tiles as icon cards with their change, the band on the new tokens, the shell's More ▾ / Report ▾ | tool-page, tool-world, the tool scripts the change touches |
| **L6 — the papers** | the same tokens in `lib/reportKit` and every paper's band, tiles and pills (light, never dark) | GATE_PAPERS=1 and paper parity |
| **L7 — the phone** | the navy header card on the Factory, the two-up cards, the sheets | the phone steps of every script above |

**Where it stands (7 November):** L0–L7 are live. The Factory, a line, a method project's dashboard and a problem's editor
read in the four questions; the shell, the tools' pages, the papers and the phone wear look E. What remains is the
same rule applied as each page is next touched: a row a door to the next step, nothing drawn to admire, no
improvement claimed without its before → after.
