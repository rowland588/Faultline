# Tool worlds — each family of tools its own ecosystem (PLAN, 30 October 2026 — not built until Rowland says go)

Rowland, 30 October: *"we have a large statistical tools, we can make our own version of Minitab, a simplified lean
version, this system model can cover the entire statistical system, then we have lean tools, etc … we have the ability
to make our own tool worlds, not just tools but their own ecosystem. Let's think big, simple UI, and powerful, and of
course always visual."*

This sits on top of `docs/TOOLS-SHOWCASE.md` (the gallery and a tool's own page — built) and `docs/TOOLS-UX.md`; it
changes none of them, it gives the gallery a **level above the tool**. It adds no AI (`docs/DIRECTION.md`: the only AI
is the voice and the camera), no sensor data (people count, time, tap, photograph, film), and every figure stays a
formula's. Where it needs a new kind of record it says so and **waits for the word** (CLAUDE.md: "a fifth concept is
almost always the wrong answer").

## 1. The idea in one picture

Today a person meets 15 tools in one flat gallery. A statistician and a line leader do not want the same fifteen. A
**world** is a doorway for one way of working: its own home page, the tools of that discipline gathered, the question
you would ask in that world, the one **workspace** they share, and the one report that tells the world's story.

```
Tools ─┬─ Statistics world   (Faultline Stats — the lean Minitab)
       ├─ Lean world         (flow, waste, work, capacity, changeover)
       ├─ Equipment world    (reliability, losses, TPM)
       ├─ Quality & food-safety world (checks, CCPs, defects, weighing)
       └─ Projects world     (6M, DMAIC, commissioning — the methods that use the tools)
```

A world is **not a new app and not a new record**: it is a *view over the catalogue's disciplines* (`src/catalogue`:
23 disciplines, 236 entries, 124 available) plus a home page. A tool belongs to a world by its discipline, never by a
second hand-kept list (the B2 lesson: four hand-kept lists drifted).

## 2. The worlds, from what is already built (counts from the catalogue, 30 Oct)

| World | Disciplines it gathers | Entries | Available | What it already is |
|---|---|---|---|---|
| **Statistics** | SPC and capability (17) · Statistical analysis (15) · Measurement systems (6) · Packaging, filling and weighing (7) | 45 | 41 | Capability — normal, non-normal, pass-or-fail, rejects, faults, held-at-a-rate; control charts — individuals, subgroup, short-run, CUSUM, pre-control, p and u; hypothesis tests — t, Welch, Mann–Whitney, paired, ANOVA with Tukey, χ², Fisher, correlation, regression; sample size; distribution fit; gauge Type 1, R&R, attribute agreement, bias/linearity/stability |
| **Lean** | Lean manufacturing (19) · Industrial engineering and work measurement (14) · Capacity and bottlenecks (17) · Changeovers (5) · Visual and daily management (15) | 70 | 33 | Value stream map, Line capacity and the V-curve, Line balance, Line standard, SMED, time study, work sampling |
| **Equipment** | Maintenance, reliability and TPM (11) · Equipment performance and losses (10) | 21 | 17 | Reliability (MTBF, Weibull, growth), loss count, calls for help, planned maintenance, criticality |
| **Quality & food safety** | Quality engineering and defects (14) · Food safety, hygiene and traceability (11) · Yield and give-away (6) | 31 | 11 | Check logs (metal detection, CILT, 5S, checkweigher, allergen changeover, ATP), CCP monitoring, give-away |
| **Projects** | Six Sigma and DMAIC (8) · Root cause (10) · Projects and improvement (10) · Commissioning (13) · Cost (6) | 47 | 20 | 6M, fishbone, programs, calculators, the money model |

Four small disciplines (22 entries, 2 available) are in no world yet — Production planning and scheduling (8),
Ergonomics, layout and automation (6), Skills and training (4), Energy, water and environment (4); they join Lean
(planning, ergonomics) and Projects (skills, energy) when they are built, by discipline, never by hand.

Not claimed: parity with Minitab. What the catalogue does **not** yet hold, said plainly — designed experiments
(FC-111, not built), time-series and forecasting, multivariate methods, and a broader set of graphs (boxplot, Pareto of
anything, interval plot) as a worksheet-driven gallery. Statistics world's honest promise is *the 20% of Minitab that
a food factory uses 80% of the time, in plain words, with the answer in money* — not the whole of Minitab.

## 3. What makes a world an ecosystem and not a folder

1. **A world home** (`#/tools/world/:id`): a hero picture; *Start from your question* (the world's own problem routes —
   "is my process capable?", "did my fix work?", "where do I lose time?"); the world's tools as the gallery card
   (`ui/ToolCard`, one component); what you have **in progress** in this world on your lines; and the world's one
   report.
2. **One workspace per world — the shared data.** *This is the one new-noun question.* In Statistics, a person
   pastes a column of readings once and wants Capability, a Control chart and an Analysis on **the same readings**
   (Minitab's worksheet). Today each tool holds its own readings. Options, for the word:
   - **A. Reuse, not a new record:** a study can be *started from another study's readings* ("Chart these readings",
     "Test these readings") — copies by reference, one tap, no new noun. **Recommended first** — it gives 80% of the
     worksheet's value and adds nothing to the data model.
   - **B. A worksheet record** (named columns, a grid like a sheet) that tools read — the real Minitab/Smartsheet
     feel, but a new noun, a migration, sync and access to design. Only if A proves too thin.
3. **Tools that hand over to each other**, by the answer: a capability study that says "not steady" offers *Chart
   it*; a chart that signals offers *Why — Pareto / 6M*; a stop Pareto offers *Reliability*; a long wait on the map
   offers *SMED / time study*. These are the catalogue's `depends` and problem routes made into one-tap *Next*
   buttons on the answer — fixed rules, never AI, each saying why in words.
4. **One world report** (the line report's engine, `lib/lineBundle`): everything done in this world on a line or a
   project as one paper, ticked tool by tool — the combined-report idea (23 October) one level up.
5. **One visual language per world** — the tool pictures are already the product's strength (the V-curve, the
   control chart with limits, the SMED grid, the map's lanes). Each world gets a *signature visual* on its home
   (Statistics: the capability histogram with the spec limits and the control chart; Lean: the value stream map;
   Equipment: the stops Pareto and the Weibull; Quality: the round with its failed check held open) taken from the
   real tools, as the gallery pictures are.

## 4. "Simple UI, powerful, always visual" — the rules every world follows

(These are the answer to the 30 October audits of the Value stream map and Analysis; they bind every tool.)

- **Answer first, working folded.** A sentence and a picture lead; *How we know* (the test's detail, the formula,
  the assumptions) sits one tap behind it. Experts lose nothing; the floor sees a verdict.
- **Questions in plain words with an example.** "Did my fix work? — compare before and after", with the test chosen
  for you by the data (as Minitab's Assistant does) and *why* said in one line. The statistical name is the small
  second line, not the label.
- **Data goes in like a sheet** — paste a column, type in a grid, or tap the pad; one mechanism across the tools.
- **One primary action per screen**; the rest behind More ▾. A control that is the state's own chip (the VA·NE·NV
  letters on a step) is never also a second row of buttons.
- **The picture is the interface.** Click the bar, the point, the step, to act on it — the map, the V, the control
  chart's signal opening *why*. The visual tools that already do this (value stream map, Line capacity, Line
  standard) are kept as they are; only their button clutter goes.
- **Simple outside, deep inside.** The default is the lean setting (95%, the usual test, the common limit); *Change
  what was agreed* is one tap for the person who needs it. Nothing the tool can do is removed.

## 5. What it would cost, in slices (each live on its own, fast gate, Rowland sees each)

| # | Slice | Done when | Needs a go on |
|---|---|---|---|
| **W0** | The levels: a *Worlds* row above the gallery (five cards with a hero picture each), `#/tools/world/:id` home pages from the catalogue's disciplines; the gallery filters by world | a world opens, shows its tools, its routes, its in-progress records; `tools-directory`, `tool-page`, `inventory` green | the five names |
| **W1** | Statistics world as the first fully-built one: the question picker in plain words (the Analysis wall, grouped), *Start from these readings* between Capability · Control chart · Analysis, paste everywhere, no pre-filled unit | the same 30 readings run through three tools in four taps; each answer first with *How we know* folded | **option A or B** for the shared readings |
| **W2** | Hand-overs: *Next* buttons on answers (not steady → Chart it; signal → Why; …), each with its reason in words | the catalogue's `depends` are the buttons; a script walks each hand-over | — |
| **W3** | World reports: one paper per world on a line/project, ticked by tool | downloaded and read back; paper-parity | — |
| **W4** | Lean world's home as the second (the map, the V, the board as its hero) and Equipment's third | each world's signature visual taken from the real tool | — |
| **W5** | The honest Statistics gaps, one wave at a time under the `faultline-tool` standard: designed experiments (FC-111) first, then the worksheet graphs | each with its spec, independent cases, acceptance, paper | which gap first |

Slices W0–W2 are what answers *"our own lean Minitab"*; the fixes now running (readings paste, units, plain
questions, dead ends) are their foundation and ship first.

## 6. Decisions — given 30–31 October

1. **The five worlds** — Statistics · Lean · Equipment · Quality and food safety · Projects, "you do what's best, we can change later": held in **one mapping file** (`src/catalogue/worlds.ts`) so a world can be split, merged or renamed in one place. A tool is in the world where most of it lives (its entry and what is built inside it — Check logs, a Lean entry with its food-safety logs, opens in Quality and food safety).
2. **Shared readings: option A** — start one tool from another's readings, copied with a link back, no new record. "Shared readings yes."
3. **Statistics is the first world built fully** — "yes to Statistics first".
4. **Hand-overs** — "this tool says X, now link to this tool": fixed rules from the answer, each with its reason in words, no AI.
5. **Order** — "World home page can be built once we understand what the system actually is": the system is understood from the three Statistics tools' own readings, so W0 (the doorway) and W1 (shared readings) are built together, Statistics first.
6. Dash cards and the world report come after the system stands (W3). Notes were dropped on 31 October (the Check logs tool covers it).

## 7. Built so far

| Slice | What | Where |
|---|---|---|
| **W0** | five worlds read from the catalogue; The worlds row on Tools; a world's home (`#/tools/world/:id`): its tools, its questions, what it holds, what is not built yet | `src/catalogue/worlds.ts`, `screens/ToolWorldScreen`, `scripts/acceptance/tool-world.mjs` |

Not done on purpose: the gallery is not filtered by world (the worlds' homes are the filter — one thing, one place).
