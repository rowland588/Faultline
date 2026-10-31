# Enterprise UI — the whole app (29 October)

Rowland: the app still reads as a gimmick; the reference is **Microsoft Teams**
(app bar → team → channel → tabs → canvas) and **Microsoft Planner** (one plan,
many views — grid, board, schedule; status labels; detail on tap). The yardstick
is in `docs/STRUCTURE.md` §1. This document is **for every screen**, not a
Factory-only refresh.

This is not a second design system. It extends the spruce tokens in
`src/styles.css` and the shared parts in `src/ui/parts.tsx` — same five state
colours, words beside colour, same gate and `docs/PAGES.md` rules as
`docs/STAGEGATE-AESTHETIC-REVIEW.md`.

## What “the whole app” means

| Layer | What changes | How |
|-------|----------------|-----|
| **Shell** | Canvas behind every page, white regions for work | CSS on `.nv-main` (E0 — **built**) |
| **Page header** | One title block on a panel, not floating on paper | `.part-head` / `.pace-head` in E0 |
| **Sections** | Line, project, factory blocks as panels | `.pl-sec`, `.home-projects`, `.fd-back`, … in E0 |
| **Board / band** | Control room and lean bands calm, printable | `.jb-hero` without glow in E0 |
| **Lists** | Problems, programs, actions as card-rows | `.lt-row`, `.pl-row`, `.qsl-work` in E0 |
| **Tools** | Studies, timers, film — layout unchanged; chrome matches shell | E6 per tool, only where chrome shows |
| **Papers** | Unchanged engine; screen colours already tokenised | Report pass later |

New pages **must** use `PageHeader`, `LeanTiles`, `.pl-sec` — not bespoke
headers. Optional explicit wrapper: class `ep-panel` (same look as E0 sections).

## Principles

1. **Canvas and panels** — grey `--canvas` behind; content on white with
   `var(--shadow)` and `var(--line)`, not dashed empties or animated heroes.
2. **Three levels max** — menu → Factory / line / project → tab. Detail on tap
   or in the section below, not a fourth row of equal-weight buttons.
3. **Normal is quiet** — strong red only for late and failed; teal for primary
   actions and links, not alarm fills on gate names or tiles.
4. **One vocabulary** — status as `StateTag` / `.status-pill`; rows as
   `.pl-row` / `.lt-row`; boards as `.fac-card` or Planner tables.

## Rollout slices

| Slice | Scope | Status |
|-------|--------|--------|
| **E0** | **Global shell** — `.nv-main` canvas, headers, sections, jb band, list rows | **Built 29 Oct** |
| **E1** | Factory lines board + Set up machines table (first vertical slice) | **Built 29 Oct** |
| **E2** | Line Overview + Machines — cards match Factory board | **Built 30 Oct** — the tour's machine cards wear `.fac-card`'s surface (shadow, lift, the name at the board's size, an "Open machine ›" go line), the Machines tab is a Planner table with Set up's columns (# · Machine · Who made it · Programs · Actions; stacked under 720px), the line's tiles on a panel |
| **E3** | Projects list + project Now — same panel language as control room | **Built 30 Oct** — every bare `.pace-head` page header and the Projects list on panels, the Now page's four sections on panels, and the project front page's dark `.vd` verdict band made calm under `.nv-main` as E0 made `.jb-hero` (surface, ink, light tiles, the on-target strip and pace line remapped; text unchanged, the paper keeps its band) |
| **E4** | Problems, Programs, Actions — shared status pills and row density. *Problems (30 Oct):* a problem's priority tag and its state word on the register (`QuickSnagsScreen`), the line's Problems rows (`ProductionLineScreen`) and the walk's snags (`PaceSnags`) wear `.status-pill` (same words, same colours: Critical red, High amber, Low green; Open red, In progress violet, Closed green); the register's groups are panels and its problems card-rows (`.qsl-reg`). Due words, the status selects and the filter chips are kept as they are (a second pill a row would crowd the row; a select is a control). *Actions (30 Oct):* an action's priority (Critical red · High amber · Low green) and a late or soon date are `.status-pill`s with their words (`ui/ActionPills`, shared by Actions, Every action and Now's rows), and the rows are Planner card-rows (what · why and where · who and when; stacked under 720px). (*Programs, 30 Oct:* every program row and the states under it — its row word, the criteria verdicts, the machine and program report pages — wear `.status-pill` with the same words, the rows are card-rows on the machine's panel, and the filter chips, the "Line 7's own" tag and the record's own aside line stay as they are). | **Built 30 Oct** |
| **E5** | ~~Stage-gate gates / Commission grids — align with E0 panels~~ | **Dropped 31 Oct** — stage gate is no longer a way to start a project (Rowland: *"Stage gate is not part of the app — we moved everything into 6M"*; `CLAUDE.md`, "Stage gate is no longer a way to start a project"). Nothing is built for a stage-gate screen. |
| **E6** | Tool chrome (study shell, drawers) — panel headers only | Next |
| **E7** | Phone — stack panels, keep one thumb bar; no extra rows | With E2–E4 |

Each slice: gate (`inventory`, touched acceptance scripts), `PAGES.md` if a
page’s must-show list moves, journeys baseline only if tap counts change.

## Out of scope

- New records, routes, or AI features (`docs/DIRECTION.md`).
- Replacing the menu/rail shape (`docs/STRUCTURE.md` B2+) — only how the
  **canvas** inside the frame looks.
- Dark theme or a second brand colour.
