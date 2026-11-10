# Faultline's design philosophy — permanent (10 November 2026)

Rowland, 10 November: *"Faultline is a sophisticated operational improvement system, but it should feel remarkably simple to use. The
complexity should exist underneath the interface, not be pushed onto the user … I would rather have a beautifully simple interface
supported by sophisticated engineering than a screen displaying every capability the application possesses. The quality of Faultline
should be measured not by how much information we can put on a screen, but by how easily someone can understand and act on that
information. This is now a permanent design principle for Faultline."*

This page is the standard every screen is held to — a new one when it is built, an old one whenever it is touched. Where an older
design document (LOOK, ENTERPRISE-UX, TOOLS-DESIGN, LEAN-PAGE, SIMPLE) asks for more on a page than this allows, this wins; their
colours, type, state words and paper rules stand.

## The five things a page answers at a glance

A factory manager, operations director or improvement professional opens a page and knows, without studying it:

1. **Where they are** — the context bar and the page's one title.
2. **What they are looking at** — one sentence under the title.
3. **What matters** — the one thing the page is for, first and largest.
4. **What needs their attention** — only the abnormal, in its state colour with its word.
5. **What they can do next** — one primary button; a row is a door.

## The seven principles

1. **Simplicity over information density.** Information that exists does not have to be shown at once. The page shows what matters;
   the rest is one tap away.
2. **A strong visual hierarchy.** One starting point per page — the title and its sentence, then the one thing that matters. Type,
   whitespace and alignment carry importance; nothing else competes. Not every heading, figure or section shouts.
3. **Progressive disclosure.** Essential first. The rest in a fold (`ui/Fold` — the one fold of the app: its title and one line
   saying what is inside, closed by default where it is secondary, remembered per device), a detail page, or the record itself. A
   section is never permanently open just because it is useful to somebody, somewhere.
4. **Fewer cards and containers.** A card is used only where it groups a thing that is acted on as one (a record in a list, a tile
   of a figure). Sections are a heading, whitespace and a hairline — not a box. Never a card inside a card.
5. **Consistency.** One type scale, one spacing rhythm, one page header, one fold, one table, one status pill, one primary per page —
   the parts below. A new page looks like it belongs.
6. **For the actual audience.** Professional operational software: confident, quiet, refined. No decoration, no extra colours, no wall
   of statistics, no dashboard collage.
7. **AI Mode is the simplest place in the app.** The conversation is the page. Controls, context and records appear when they are
   needed and step back after.

## The system — use these, never a new one

| What | The one way | Where |
|---|---|---|
| Type | `--t-label` 12 · `--t-detail` 13.5 · `--t-body` 14 · `--t-h` 18 · `--t-page` 24 · `--t-num` 32. No raw size (`ratchet.test.ts`). At most four sizes on one screen besides a figure. | `src/styles.css` tokens |
| Spacing | `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 · `--space-6` 32 — `--space-5` between sections, `--space-3` inside one, `--space-2` between a label and its value | tokens |
| Corners, colours | `--radius`, `--radius-sm`, `--radius-pill`; the five state colours with their words; the brand only for what is pressed | tokens, CLAUDE.md "Visual management" |
| Page header | `ui/parts PageHeader` — one title, one sentence, one primary, More ▾, Report ▾ | `ui/parts` |
| A section | `ui/parts Section` — its title, a count, one action; its content on the canvas, not a box around it | `ui/parts` |
| Showing more | `ui/Fold` — never a second collapsible | `ui/Fold` |
| A list of records | rows with a hairline between, each a door (the whole row opens it), its state on the right in a pill with its word | `.lt-rows`, `StateTag` |
| A figure that matters | a tile only in a row of at most four, each *of* what it should be | `ui/Lean` tiles, `.fq-cards` |
| Status | `StateTag` — colour and word, never colour alone; only the abnormal carries colour | `ui/parts` |
| Tables | plain rows, hairlines, right-aligned figures, no zebra, no boxed cells | — |
| Buttons | one primary (filled) per page; the rest quiet; destructive in More ▾ | — |
| Phone | one column; presses ≥ 44 px; what is secondary shut; nothing off the side | — |

## The test before a screen is finished

> **Could this page communicate the same information and functionality more clearly, with less visual clutter and less effort from the
> user? If yes, simplify it.**

Measured, not claimed: `node scripts/calm.mjs` walks every page the inventory knows at desk and phone as it opens — its height, its
card-like boxes, its headings, its controls, its type sizes, and how many boxes and headings compete on the first screen — busiest
first. `docs/design/calm-baseline.json` is the agreed baseline; `--check` fails a page that got busier, and a page that got calmer
lowers it. Simplifying never deletes: what leaves the first view moves into a fold, a detail page or the record, and PAGES.md says
where (CLAUDE.md, rule 1).

## Where Faultline stands — the audit (10 November)

The measurements before any of this work are in `docs/design/calm-before.json`; the busiest pages, and what is being done about each,
are in the table below, kept current as each is simplified.

| Page | Before (desk · phone height; boxes; first-screen items) | What is wrong | What is being done |
|---|---|---|---|
| A method project — its sections | 11,209 · 15,573 px; 65 boxes; 14 | every section open, every question box and tool card shown at once | the section you are in open; the others a line each in a fold; tool cards as rows |
| Tools — the library | 8,020 · 9,401 px; 252 boxes and 313 controls on a phone | every tool, world, mode and holding drawn as cards on one page | **done, 10 November** — the tools one calm list first (a row each); the problem routes, the kinds, the worlds, the AI toolbox and "what we have and need" each in a fold, shut. Now 1,739 · 3,693 px; 1 box; 69 controls; 2 first-screen items. A tool’s own page: 3,440 · 6,225 → 986 · 1,569 px, its purpose and Start one first, the rest in five folds (`tools-calm.mjs`) |
| Factory › Lines | 4,932 · 7,722 px; 11 type sizes | the control-room tail below the lines | (agent) the tail in one fold, the answers capped at three rows |
| A line — its own page | 2,460 · 3,950 px; 15 on the first screen | ten sections all open | (agent) tiles, Carry on, problems, machines; the rest in "More about this line" |
| A tool's list (Line capacity) | 3,568 px at a desk | the line-wide analysis above the records you work in | (agent) Carry on first, "The line as a whole" in a fold |
| A document — an 8D report | 9,815 · 13,230 px | every discipline and box open | next: the discipline in hand open, the rest a line each |
| A video study · an area's report · the 6M Results · a machine's page · Materials | 5,078 · 5,457 · 1,893 (19 first-screen items) · 2,464 (16) · 3,093 | many equal-weight boxes on arrival | next, one at a time, measured |
| AI Mode — Luna | 900 · 844 px; 1 box | — the calmest page in the app | kept so |
