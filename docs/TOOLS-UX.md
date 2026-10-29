# Tools — how they show, how you find the right one, how we build them

Rowland, 29 October 2026: *"Tools is your next mission … all the tools that we
have made enhancing graphically … plan how the tools should show themselves in
the app … how they are organised … how the user know that this tool is the right
one for their test … then build the remaining tools based on the standards you
will create."*

This document is the memory for that mission. It sits beside
`knowledge/STANDARD.md` (engineering truth) and `docs/STRUCTURE.md` (where tools
live in the app). Where they disagree on **presentation**, this wins for tools;
where they disagree on **behaviour or records**, STRUCTURE and DIRECTION win.

Cross-links: [`knowledge/README.md`](../knowledge/README.md) (catalogue and
directory), [`docs/TOOLS-BUILD.md`](TOOLS-BUILD.md) (waves and programme),
[`docs/DIRECTION.md`](DIRECTION.md) (deep not wide; AI is Line Talk and voice
note only).

---

## 1. How a tool shows itself

Every manufacturing tool shares the same **shell** (docs/STRUCTURE.md §5.5, B4)
so the suite reads as one product, while each tool keeps the lean page order
from `docs/TOOLKIT.md` Part 0 (facts → figures → reading → verdict → act).

### 1.1 The tool shell (one record open)

| Part | Where | Job |
|---|---|---|
| **Page header** | `ui/parts` `PageHeader` | Eyebrow (scope: line · project · factory), title, one primary, Report ▾, More ▾ |
| **Lean band** | `ui/StudyActs` `StudyBand` / `LeanBand` | What it is of, where it sits (`StudyPlace`), when, **one verdict sentence** in its state colour with the word beside the colour |
| **Verdict tiles** | `ui/Lean` | Up to five counted figures — each tile names what it counts; chips on list pages are the same numbers |
| **The work** | Tool module screen | Method-specific: grid, pad, board, chart — never a generic “template” |
| **Closing line** | Lean footer | One line the module owns; money when the line's facts allow, else the missing input named |
| **Paper** | Report ▾ | Named for what it is (never *PDF*); `?save=1` on report routes; same module as the screen |

Rename and Delete live in **More ▾** on the record; the list row may inline rename
where the audit requires it (`ui/StudyActs`).

### 1.2 List row anatomy (tool hub → records)

Used on scope **Tools** pages, study lists, and the directory’s **Use one now**
rows (`lt-row` / `RecordRow`):

```
┌─ spruce bar ─────────────────────────────────────────────┐
│ WHAT (bold)     SAYS (state colour + word)               │
│ WHERE / latest · one line from the catalogue             │
└──────────────────────────────────────────────────────────┘
```

- **What** — the tool or record name (Line capacity, Capability study “60 ppm”).
- **Says** — the module’s verdict or status (`ie-tone is-g|w|a|r|n`), always with
  words, never colour alone.
- **Where** — line, project, machine, or the catalogue’s one-line *says* when empty.

Line **Tools** tab uses **cards** (`pl-tool`): name, latest finding in tone,
count or “None yet — …”, chevron; tick mode for merged line report unchanged.

### 1.3 Directory row anatomy (`#/tools`)

Catalogue entry (`ToolsScreen` `.et-row`):

- Collapsed: **FC-id · name · status pill** (available = green wash, partial =
  violet, not built = quiet grey).
- Expanded: **problem first** (bold), then dl — what it answers, how, needs,
  gives, food example, form/discipline, depends-on chips, limits, Open it or
  honest not-built line.

Problem **routes** (`.et-route`): warm panel, spruce left bar, questions in
order, FC chips that scroll the list.

### 1.4 Status sentence and tiles

- The **sentence** is always from the tool’s module (`lib/ie/*`, `tools/*`), never
  composed in the screen.
- **Tiles** match the sentence’s parts; if the band omits money (placeholder),
  the tile omits it too (stage-gate aesthetic B4).
- **State colours** are the five globals in `src/styles.css` — unchanged from the
  29 October spruce pass; tools do not introduce new hues.

### 1.5 Paper entry

Report ▾ lists each paper by purpose. Primary download on dedicated report
pages. Tools inherit `lib/report/` blocks; tool-specific sections use the same
band/tile vocabulary as the screen (`docs/REPORTS.md`).

---

## 2. Organisation — where tools live

| Place | Address / tab | What it lists | Starts a record |
|---|---|---|---|
| **Factory Tools** | Menu → Tools → `#/tools` | Full catalogue, routes, **Use one now** (APP_TOOLS) | Opens tool list; new record on line/project from there |
| **Line Tools** | `#/lines/:ws?view=tools` | Rail tools on that line + stopwatch first | New ▾ on line; `?line=` on tool routes |
| **Project Tools** | `#/project/:id/tools` | APP_TOOLS uses in project | New on row; `inProject` on routes |
| **Tool’s own list** | e.g. `#/capability`, `#/smed` | Every record of that tool | New / `?add=1` |
| **Kinds on the rail** | Registry `src/catalogue/registry` | Studies under *Tools*; standards under line *Products*; logs under *Logs*; calcs under *Calculators* | Catalogue `form` + `KIND_PLACE` |

**Not duplicated:** the menu does not list eleven tools (B2); the factory
Tools page and line/project Tools tabs do. **Toolkits by reason** (W11 in
`docs/TOOLS-BUILD.md`) will extend problem routes — not a second catalogue.

**Line is home** (`docs/MAP.md`): a tool used on a line keeps line context;
project tools wear the project rail and `?project=`.

---

## 3. The right tool for the job — without AI

Rowland, 20 October: no AI driver, no method builder. Picking a tool is
**question-first, catalogue-backed, human choice**.

### 3.1 On the directory (`#/tools`)

1. **What’s the problem?** — search box; problem routes and entries match
   (`searchProblems`, `searchEntries`).
2. **Where to start** — top three routes when searching; all routes as pills
   when not; each step lists FC chips in build order.
3. **Status filters** — chips are counts; tap to see only available / partial /
   not built / etc.
4. **Discipline** — narrow when you already know the family (SPC, IE, …).
5. **Open it** — only when `built.where` exists; otherwise limits and honest status.

### 3.2 Starting a tool (scope Tools / New ▾)

- **Line / project Tools** rows say what the tool is *for* (registry `says`).
- Tools that need a machine, product, or question first keep their existing
  first screen (capability question, SMED days, reliability set-up) — that
  screen *is* the “is this the right tool?” check.
- **Line Talk** may answer in words when asked; it does not recommend tools,
  score matches, or auto-start records (`docs/LINE-TALK.md`).

### 3.3 Catalogue metadata (truth for copy)

Each entry’s `problem`, `questions`, `method`, `inputs`, `outputs`, `food`,
`depends`, `scenarios`, and `searchWords` feed the directory UI — no duplicate
copy in React. Problem routes in `src/catalogue/problems.ts` define *start here ·
then · to prove* order.

### 3.4 Toolkits (future W11)

Same metadata, ordered steps, combined reading on paper — still no recommender;
the person chose the reason.

---

## 4. Graphic language — spruce suite for tools

Extends the 29 October pass (`41b963fe`, `docs/STAGEGATE-AESTHETIC-REVIEW.md`):
**spruce brand on warm paper**, state as small marks, strong red only for late/failed.

### 4.1 Shared CSS tokens (`:root` in `src/styles.css`)

| Token | Role |
|---|---|
| `--bg`, `--surface`, `--shell*` | Warm paper and bands (unchanged) |
| `--brand`, `--accent`, `--accent-soft` | Spruce actions and links |
| `--tool-panel` | Soft spruce wash for tool panels (directory Use one now, routes) |
| `--tool-edge` | Left bar on tool rows and cards |
| `--shadow`, `--shadow-lift` | Card lift on hover/focus — ink-tinted, shallow |

### 4.2 Patterns applied to all available tools

- **Use one now / RecordRow / project Tools lists** — inset spruce bar, warm
  hover, lifted surface on focus.
- **Line tool cards** — spruce top edge on hover; latest finding keeps `ie-tone`.
- **Directory** — route panel and open row use `--tool-panel`; status pills unchanged.
- **Lean band** on tools — already `--shell` + inset state bar; no graphite bands
  on study pages.

### 4.3 Ratchet

- Prefer tokens and `color-mix` over new hex in tool screens.
- Do not add hues beyond the five states + brand.
- Lint ceiling on hex in `styles.css` stays down only when a pass removes literals;
  tool work uses existing tokens first.

---

## 5. Build standard — UX checklist + engineering

Every new or materially changed tool must satisfy **`knowledge/STANDARD.md`**
and this UX checklist before `available`:

### UX checklist (add to spec review)

1. Uses **PageHeader** + tool shell (band, tiles, closing line) or documented
   exception (hub-only calculator card).
2. List rows use **lt-row / RecordRow** or **pl-tool** pattern; verdict from module.
3. Empty state says what to do next in one line (New, which line, which question).
4. Phone: no horizontal scroll; primary action reachable; acceptance script at 375px.
5. Directory entry: `problem` and `questions` filled; status honest; `built.where` set.
6. Paper in Report ▾; acceptance reads PDF back; PAGES.md line if person-visible
   shape changes.
7. No AI in figures or tool picker; voice note only where already allowed.

### Engineering (unchanged)

Specification before code (`knowledge/specs/TEMPLATE.md`), independent cases,
unit tests, acceptance in gate, catalogue update, `faultline-tool` skill workflow.

---

## 6. Roadmap — available vs waves

Summed from `node scripts/catalogue.mjs summary` (29 Oct 2026): **236 entries** —
**109 available**, 25 partial, 83 to-build, 12 research, 7 left-out.

| Wave | Focus | Catalogue slice (see TOOLS-BUILD §2) | UX note |
|---|---|---|---|
| **Done** | W0–W3b, W8a calculators | Capability modes, charts, analysis, four calcs | Shell + directory already apply |
| **Next — W3c** | Gauge + shape | FC-119–122, FC-114 fitting, FC-096 on capability | Chart/gauge panels reuse W2 chart chrome |
| **W4** | Measurement systems | Type 1, R&R, MSA register | Instrument-first question row |
| **W5** | Reliability remainder | MTTR, Weibull, growth, CILT | Extend reliability study shell |
| **W6** | Check logs | FC-236 mechanism, metal detection, 5S, … | Logs hub grouping already in app |
| **W7–W9** | People, flow, quality system | Time study pieces, planning, DMAIC registers | Many `partial` → `available` |
| **W10** | Research | Simulation, acceptance sampling, … | Spec or gap only |
| **W11** | Toolkits | `#/toolkits` from routes | Cards by reason; no new colours |

**Deep not wide for this mission:** ship UX standards + graphic pass on everything
**available**; build the next wave one mechanism at a time per TOOLS-BUILD §1.

### Next three backlog entries (catalogue order)

Run `node scripts/catalogue.mjs next 3` before each build session. As of
29 Oct 2026:

1. **FC-155** — Horizontal deployment  
2. **FC-071** — First-off release at changeover  
3. **FC-070** — Changeover sequence  

These are W6/W9 family; the programme may still prioritise **W3c** (gauge partials)
when Rowland’s line needs measurement tools first — waves are ordered by mechanism
reuse, backlog by `backlog.ts`.

---

## 9. Wow checklist — screen and paper

Rowland, 29 October: *detail, visuals, wow on screen and in print.* Use this
when reviewing or shipping a tool slice; shared CSS and report blocks carry
most of it — touch a tool screen only when its signature view fails a row.

### Screen

| Check | Where | Pass when |
|---|---|---|
| **Hero band** | `LeanBand` / `ln-band` | Eyebrow, title hierarchy, verdict with words + state mark; teal edge and trace print as on screen |
| **Tiles** | `LeanTiles` / `ln-tile` | Up to five figures, tabular nums, top accent on abnormal/met; lift on hover where tappable |
| **Work panel** | `LeanPanel` / `ln-panel`, `ie-pic` | Section heading with brand rule; chart/table on warm work background, spruce left bar, soft shadow |
| **Typography** | `--t-*` only | One page title, one section heading, body/detail — nothing louder than the verdict |
| **Lists** | `lt-row`, `pl-tool`, `et-row` | Spruce inset bar, hover lift, status always in words |
| **Empty** | `EmptyState`, `lt-empty` | Dashed panel, one line what to do, primary action reachable on phone |
| **Closing** | `ln-close` | Navy band, mark in tone, money or missing input named |

### Paper (Report ▾)

| Check | Where | Pass when |
|---|---|---|
| **Band** | `leanBand` / `paperBand` | Pale fill, teal edge, verdict wraps; matches screen sentence |
| **Tiles** | `leanTiles` | Top edge + wash parity with screen states |
| **Sections** | `heading`, `leanHead` | Title + muted says; **brand accent** on rule before body |
| **Whitespace** | `flow()` rules | No near-empty pages, no clipped sentences |
| **Closing** | `leanClosing` | Same tone mark and words as screen |

### Ratchet

No new hues, no new `640px` breakpoint, no hex ceiling raised in `styles.css`.

---

## 7. This session’s slice (29 Oct 2026)

- **Phase A:** this document; links from `knowledge/README.md` and
  `docs/TOOLS-BUILD.md`.
- **Phase B:** shared tool UI tokens and CSS on `#/tools`, `lt-row` lists,
  line `pl-tool` cards — all APP_TOOLS inherit without per-tool edits.
- **Phase C:** no new `available` entry unless spec + gate complete; W3c
  documented as next mechanism wave.
- **Phase D:** fast gate — `tools-directory`, `structure`, `front-door`; merge
  to `main`.

---

## 8. References in code

| Concern | Location |
|---|---|
| Directory UI | `src/screens/ToolsScreen.tsx` |
| Scope tool lists | `src/screens/ProjectToolsScreen.tsx`, `ProductionLineScreen.tsx` |
| Registry (eleven + line tools) | `src/catalogue/registry` |
| Problem routes | `src/catalogue/problems.ts` |
| Tool shell | `src/ui/StudyActs.tsx`, `src/ui/Lean.tsx` |
| Styles | `src/styles.css` — `.et-*`, `.lt-row`, `.pl-tool`, `.ln-band`, `--tool-work-*`, `.tool-sig-*` |
| Report wow | `src/lib/report/blocks.ts` `heading`, `src/lib/report/lean.ts` `leanHead`, `leanClosing` |

---

## 10. Wow programme — progress

| Slice | Scope | Status (29 Oct 2026, continued) |
|---|---|---|
| **T0** | Standards + spruce surfaces (`a41f45ad`) | Done on main |
| **T1** | Directory lede, Use one now, list rows, empty states | **Done** — shared `--tool-work-*`, `.empty`, `.lt-empty`, `.et-lede` |
| **T2** | Top 8 studies | **Shared layer** — band/tiles/panels/`ie-pic`/`ie-cap-box` |
| **T3** | Signature inner views (top studies + partials) | **Extended** — `.tool-sig-*` on capability/chart/SMED/VSM/board/losses/reliability/analysis; `tool-sig-vid` on video study stacks and load chart; `tool-sig-walk` on line capture timer and feed (waste walk / FC-005 partial); calculators, checks, pareto, analysis as before |
| **T4** | Report engine section headers + closing band | **Done** on main (`87877112`) |
| **W3c** | FC-119/120 gauge, FC-114 shape | **Done** on main |
| **W4a** | FC-118 gauge R&R (Analysis `grr`) | **Done** — `lib/ie/gaugeRr`, spec, unit + acceptance `gauge-rr.mjs`, catalogue available |
| **W4b** | FC-121 attribute agreement (Analysis `attr`) | **Done** — `lib/ie/attributeAgreement`, spec, unit + acceptance `attribute-agreement.mjs`, catalogue available |
| **W4c** | FC-122 calibration checks (log `calibration`) | **Done** — check-log def, spec, `log-shape.mjs`, catalogue available |
| **W4d** | FC-123 uncertainty budget (calc `uncertainty-budget`) | **Done** — `lib/ie/uncertainty`, spec, unit + `calc-shape.mjs`, catalogue available |
| **W5a** | FC-066 critical spares (calc `critical-spares`) | **Done** — `lib/ie/spares`, spec, unit + `calc-shape.mjs`, catalogue available |
| **W5b** | FC-063 planned maintenance (log `planned-maintenance`) | **Done** — check-log def, backlog hours tile, `log-shape.mjs` |
| **W5b** | FC-064 criticality (scored `criticality`) | **Done** — scored-register shape, `lib/ie/criticality`, `scored-shape.mjs` |

**Coverage (honest):** ~116 available tools — **100%** lean shell + list patterns;
**~32%** tool-specific signature CSS; hub tools (calculators, checks, scored registers, pareto modes) share work-panel chrome.

**Next slice:** W5 — FC-057 cost deployment, FC-067 maintenance measures; reliability study polish; wire guard bands when CCP screens move.
