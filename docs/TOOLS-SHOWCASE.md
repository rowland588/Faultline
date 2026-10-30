# The tools are the heart — a plan to show them (30 October 2026 — GO GIVEN, TG0–TG2 being built)

Rowland, 30 October: *"look at the tool page, it needs a massive upgrade. I want
the ability to scroll through the tools, pick one, view it on a full page that
tells me what the tool can be used for, and on the scroll view we have thumbnail
pictures of the tools. The tools are a wow factor … at the moment they portray
nothing, a simple section. They are the heart of the app, because our
competition doesn't have these tools — they simply run off IoT, OEE, MRP and
CMMS. We need a plan to massively increase the tools' engagement and
visibility — not the app."*

**Go given by Rowland, 30 October** ("go ahead with the tool plan"); the recommended answer to each decision in §5 is taken (photographs; fifteen cards with the modes inside; suggestions by fixed rule; the tool book last; TG0–TG2 first). Built so far: TG1 the gallery (`ui/ToolCard`, `lib/useToolUse`, `screens/ToolsScreen`) and TG2 the tool's own page (`screens/ToolPageScreen`, `#/tools/:key`), proved by `scripts/acceptance/tool-page.mjs`; TG0 the pictures in progress. Known gap: §B.4 "what it is worth" is not on the page — the money sentence lives in `knowledge/MONEY.md`, not on the catalogue entry; it needs a `money` field on the entry first (next). This
sits beside `docs/TOOLS-UX.md` (how a tool's chrome looks, how to find one by
its problem — built) and `docs/TOOLS-BUILD.md` (which tools get built, by
wave). Where they disagree about how tools are *shown*, this wins once agreed.
It adds no record and no AI: every word on a tool's page is the catalogue's
and every figure a formula's.

## 1. What is wrong today (measured, not felt)

`#/tools` (`screens/ToolsScreen`) opens with a text lede of counts ("236 tools
in 23 disciplines — 124 available …"), then *Use one now* — fifteen plain rows,
a bold name and a sentence — then a search box, six status chips, a discipline
select and a list. It answers *"is there a tool for X?"* and says nothing about
*what a tool looks like or what it does for you*. Specifically:

- **No picture of any tool.** The fifteen tools are the product's difference,
  and the page that lists them shows no capability study, no V-curve, no
  SMED grid, no control chart. `public/guide/` has seven screenshots of the
  *methods* and none of the tools.
- **A tool has no page of its own.** Tapping a row opens its record list (an
  empty list on a new device). Nothing says what it is for, when *not* to use
  it, what you give it, what you get, what it is worth in money.
- **Scrolling is a list of text, not a choice.** You cannot browse, compare or
  be tempted.
- **The tools are invisible once you are working.** A line's page lists them
  as plain rows; the Factory board, Home and the reports mention a tool only
  when a record exists. A person who has never opened Reliability never learns
  it is there, or that it would turn *"that machine keeps stopping"* into
  an MTBF in pounds.
- **The catalogue knows far more than the page shows.** Each entry already
  carries `problem`, `questions`, `method`, `inputs`, `outputs`, `food`,
  `depends`, `scenarios` and `limits` (`src/catalogue/types`), and 124 entries
  are available — most are **modes inside the 15 app tools** (the capability
  study alone carries pass-or-fail, rejects, faults, held-at-a-rate, a
  measurement's question row, …). None of that depth is visible from the top.

## 2. The shape (one idea, five parts)

**The gallery is the front of the tools; each tool is a full page; the tools
then show up wherever the work is.** Two scopes of change, kept apart:

| | What | Where | Builds on |
|---|---|---|---|
| **A** | The **gallery** — scroll the tools, a picture each | `#/tools` top | `registry` APP_TOOLS |
| **B** | A **tool's full page** — what it is for, shown | `#/tools/:key` | catalogue entry + modes |
| **C** | **Pictures** that are true | `public/tools/<key>.png` + paper picture | the real page on a seeded record |
| **D** | **Visibility in the work** — the tools surface on the line, factory, home, papers | existing pages, no new page | records already kept |
| **E** | **The tool book** — the tools on paper, to show a client | Report ▾ on Tools | `lib/report` |

The directory (search by problem, status chips, discipline, routes) **stays,
below the gallery** — rule 1 of "How a change gets made here": nothing is
removed until there is a replacement and a sentence saying why. It is *finding*;
the gallery is *showing*. The gallery is the page's top, the directory its
second half, joined by "Not sure? Start from the problem ›".

### A · The gallery (`#/tools`, top)

- **A scroll of cards**, one per app tool (15 today, growing by the catalogue,
  never by hand): picture (16∶10), name, **one line on what it is for**
  (`app.says`), and a state mark in words — *Used on 3 lines* / *Not used yet*
  (read from the records; colour only for the five states, no new hue).
- **Scroll-snap sideways on a phone, a wrapping grid on a desk** with the first
  row visible without scrolling; arrow keys and swipe move between cards;
  filter chips by **kind** (study · standard · log · register) and by the
  **question** it answers (see · measure · prove · flow · quality) — reading
  the catalogue's `discipline`, not a second list.
- **Picked, a card opens the tool's full page (B)**; "Start" on the card is a
  second tap away, not the first (a tool is understood before it is started).
- Empty/new device: every card says *Not used yet*, and the gallery is still
  the page — it is the shop window, not a list of your records.

### B · A tool's full page (`#/tools/:key`)

One layout for every tool, every word from the catalogue, so a new tool gets
its page by being catalogued (no per-tool screen):

1. **Hero** — large picture, name, the one-line *what it is for*, **Start one**
   (picks the line/project from where you came: a line's tool starts on the
   line) and **See mine ›** (its list). Report ▾ — *This tool on paper* (E).
2. **What you can use it for** — the `problem` in the floor's words, then the
   `questions` it answers, then the problem routes it sits on (links into
   `lib PROBLEMS`). "We're rejecting too many" → this.
3. **What you give it · what you get** — `inputs` and `outputs` as two short
   lists; "measured by a person, not a sensor" said once.
4. **What it is worth** — the money line from `knowledge/MONEY.md` for this tool
   (the cost-causation sentence and the inputs it asks for, every one
   optional); no figure invented, a missing input named.
5. **A worked example** — the catalogue's `food` example, set out as a small
   real table or picture (a food-manufacturing case: pack weights, a tray
   sealer, a changeover on a filler) — so a reader sees *the shape of the
   answer*, not a promise.
6. **Inside it** — the modes and shared parts that sit under it
   (`partOf` / `depends`): for the capability study its eight modes, each a
   chip with its status in words (available · partly) and a link to its own
   entry; this is where the 124 available entries become visible.
7. **Used here** — on which lines and projects, the newest finding (the line
   tool-card's sentence, `ie-tone`) and how many records; empty says so.
8. **Honest limits** — the entry's `limits` and `GAPS.md` note, so the page
   never over-promises (`knowledge/STANDARD.md`).
9. **Next / previous tool** at the foot and with the arrow keys — the
   *scroll through the tools, pick one, view it full* loop closes.

A tool with no app face yet (catalogued, not built) gets the same page, its
status honest ("Planned — not built yet"), **no Start**, and the route that
leads to the nearest built tool — so the directory entries stop being a dead
row.

### C · The pictures (the part that makes it a wow)

A thumbnail that is a drawn icon says nothing; the product's strength is its
pictures (the V-curve, the SMED grid, the control chart with its limits, the
Yamazumi, the VSM lanes, the filmed frames). So **pictures are the real tools,
photographed from the real app**:

- `scripts/tool-pictures.mjs` seeds one realistic record per tool (the
  acceptance scripts already do — they are the source of the worked cases),
  opens the tool's real page in Chromium at a desk and a phone, and writes
  `public/tools/<key>.png` (gallery, 16∶10, cropped to the tool's *signature
  view*: the chart, the grid, the curve — never the chrome) and
  `<key>-paper.png` (the first page of its PDF read back).
- **They cannot lie or go stale silently:** the catalogue test fails if an app
  tool has no picture; the picture carries the build it was taken from;
  `--compare` (the gate's existing method for papers) refuses a changed
  signature view until the picture is retaken and looked at (CLAUDE.md:
  "take the pictures … look at every page that moved").
- Optional second layer, later and only if asked: the card shows **the
  person's own latest result** as its picture once a record exists (a living
  thumbnail from the tool's own Lean picture component, `ui/Lean`), and the
  worked-example picture before.

Decision for Rowland: **photographs of the real tool (recommended)** versus
drawn illustrations. Photographs are true, cost less to keep right and are
what a buyer expects from *"our tools"*; drawings would need a second
language that can disagree with the tool.

### D · Visibility in the work (the engagement, not the gallery)

A gallery alone is a brochure. Engagement is the right tool appearing at the
moment of need — **by rule, never by AI** (DIRECTION.md: AI is only the voice
and the camera):

1. **A problem offers its tools.** On a problem (Problems, a line's worst
   problem on the Factory board) the register already knows its category and
   words; the catalogue's problem routes map those to tools. The problem card
   gains **"Tools for this ›"** — the route's first two available tools, each
   one tap to start *on the problem's line and machine* (the P2 contract:
   what is made inside lands there). One suggestion with its reason in words,
   never a score.
2. **A line shows its tools as a shelf, with pictures.** The line's *Tools* tab
   (already rows/cards, `pl-tool`) takes the gallery's card: picture, latest
   finding in tone, "None yet — start" — the same card everywhere.
3. **The Factory board counts tools, not only problems.** Each line's card
   gains *"4 tools used · last: Reliability, 2 days ago"* and the board a tile
   *Tools in use* (of the tools that fit that line's open problems) — read from
   the records, no tracking.
4. **Home: "One to try".** Beside *Carry on where you were*, one tool the
   person has not used, chosen by a fixed rule from their open problems
   (worst first) — with its picture, its one line, and Start.
5. **Reports name their tools.** Every paper's foot already lists nothing about
   the tools; add *"Made with: Capability study · Reliability · Line balance"*
   with each tool's mark — so a client reading a report learns the toolkit
   exists. (Screen and paper together: rule 2.)
6. **The empty state sells the tool.** A tool's empty list shows its hero
   picture and "what you'll see here", not "none yet".
7. **Toolkits by reason (W11, `docs/TOOLS-BUILD.md`)** become the second row
   of the gallery — *Commissioning · Yield · Reliability · Quality · a
   line's problems* — each a card with a stack of its tool pictures; the
   gallery then answers both "which tool?" and "which reason?".

Measured, not guessed: **tools used per line per month** and **share of open
problems with a tool started from them**, worked out from the records the app
already keeps (a Factory tile, not telemetry) — the numbers that say whether
this worked.

### E · The tool book

*Report ▾ → The tool book* (Tools page) and *This tool on paper* (a tool's
page): the tools as a document you can hand someone — a page per tool built
from the same catalogue words and the same picture, with its worked example
and its sample report. It is the answer to *"what does your software actually
do?"* in a sales meeting or a client review, and it is made by the report
engine (`lib/report/`), never hand-laid, with the same words as the screen.

## 3. The rules this plan keeps

- **A new page is never added for something that lives on a line**
  (`docs/MAP.md`): `#/tools/:key` is a *library* page (what a tool is); using
  one still happens on a line or project, which is where **Start** goes.
- **Connect the dots** (CLAUDE.md rule 5): the gallery card is *one* component
  (`ui/ToolCard`) used by the Tools page, a line's Tools, a project's Tools
  and Home's *One to try* — never four lookalikes.
- **Screen and paper together** (rule 2): the card, the full page and the
  tool book share one source; `scripts/inventory.mjs` (docs/PAGES.md) gets a
  line for each new page, and the tool book is in the paper-parity run.
- **Nothing removed**: the directory, routes, status chips, *Use one now*'s
  destinations and every address stay; *Use one now* is replaced by the
  gallery (same fifteen tools, now with a picture and a page), and the
  sentence for that is *"the same list, with a picture and a page of its own"*.
- **No new hue**, no AI, no invented figure; a tool's page says what is not
  yet known (`knowledge/GAPS.md`).

## 4. Slices (each live on its own; fast gate each; Rowland sees each)

| # | Slice | Done when | Touches |
|---|---|---|---|
| **TG0** | The pictures — `tool-pictures.mjs`, `public/tools/*`, the catalogue test | every app tool has a gallery picture and a paper picture, taken from the real page; looked at | scripts, public, catalogue test |
| **TG1** | The gallery — `ui/ToolCard`, the scroll, kind/question chips, directory kept below | scroll on phone/grid on desk, card → full page; `tools-directory` + `front-door` + `structure` green; `docs/PAGES.md` | `ToolsScreen`, `router`, styles |
| **TG2** | A tool's full page `#/tools/:key` (§B 1–9), planned entries included | every app tool + a to-build one rendered from the catalogue alone; a new acceptance `tool-page.mjs` reads each section against the entry | new screen, route, inventory |
| **TG3** | Visibility I — the shelf on a line/project Tools, the empty states, the Factory board's tools count | the same card on three pages; counts equal the records (a gate check) | line/project Tools, board, empty states |
| **TG4** | Visibility II — *Tools for this ›* on a problem; Home's *One to try*; *Made with* on the papers | the suggestion is the catalogue route's, with its reason in words; papers read back | Problems, Home, `lib/report` |
| **TG5** | The tool book + toolkits row (when W11 is built) | the book downloaded and read back against the catalogue; paper-parity | `lib/report`, Tools page |

TG0–TG2 are the answer to the brief as said (*scroll, pick, a full page,
thumbnails*); TG3–TG5 are *"massively increase engagement and visibility"*.
Each is one to two days' work; the gate for each is the fast cycle with the
pages it touches (`tools-directory`, `front-door`, `structure`, `line-is-home`,
`inventory`, plus the new scripts), `GATE_PAPERS=1` where a paper moves.

## 5. Decisions needed from Rowland before "go"

1. **Photographs of the real tools** (recommended) or drawn illustrations?
2. **Gallery scope:** the fifteen app tools as cards, with the 124 available
   entries as *Inside it* on each tool's page — or every available entry as
   its own card? (Recommended: fifteen cards; the rest inside.)
3. **"One to try" on Home and *Tools for this ›* on a problem:** do you want
   the app to *suggest* a tool by the fixed rule above, or keep it
   find-it-yourself?
4. **The tool book** for clients: in this plan, or later?
5. **Order:** TG0–TG2 first (the brief as said), then TG3–TG5 — or the
   visibility slices (D) first?

*Asked in the order they change what is built.* Until a go, the existing Tools
page stands.
