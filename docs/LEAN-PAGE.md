# The lean page — how every report, and every tool's page, is laid out

Rowland, 17 October, with two capacity reports side by side, a standard one
and a lean one:

> "move on to all reports lean methodology applied — attached is a clear
> example of what a lean manufacturing report looks like vs a standard
> report ... and listen to this: the lean report is actually how we would
> want the app's UI."

The picture's own caption says the difference: *a standard report shows what
happened, but doesn't explain why, what it means or what to do next; a lean
report shows performance, finds the real issues, highlights opportunities and
drives action.* That is the house's three questions (`docs/SIMPLE.md`) drawn
the way a board on the floor is drawn. Our reports already said the three in
sentences; the lean page says them in **a few big numbers, one picture, a
ranked table, what it means, and who does what by when**.

## The eight parts, in the order of the three questions

| # | Part | Asks | What it is |
|---|---|---|---|
| 1 | **Band** | what, where, when | The house graphite across the top: what this is, its title, the line and product (or job), and on the right the day, the shift and when it was printed. |
| 2 | **Tiles** | where are we? | Three to five big numbers, each *of* what it should be ("40,900 of 45,000 · 91%") and, when there is one, **since last time** ("▲ 4,400 on 15 Oct"). |
| 3 | **Trend** | where are we going? | The headline number over the records of the same kind on the same line, against what each should have been — only with two or more. |
| 4 | **The picture** | why? | The tool's own picture: the waterfall, the V, the Yamazumi, the SMED grid, the stream, the fishbone, the plan. Never a second chart of the same thing. |
| 5 | **Top causes** | why? | The ranked table: what took the time or the money, biggest first, with its share. |
| 6 | **What it means** | why? | Three to six sentences the module already says, each marked: a cross for what is wrong, a tick for what is right, a dot for how it is known. |
| 7 | **Action plan** | what are we doing? | Action · owner · due, from the records raised off this one (a fix, a countermeasure, a stage). None yet says so, with the door to raise one. |
| 8 | **Closing line** | the verdict | One sentence in the graphite band at the foot — what one side can now say to the other. |

On a screen the same eight, in the same order: the band is the page's
header (its edit controls stay on it); the tiles are a row (two across on a
phone); the trend and the picture sit side by side on a laptop, stacked on a
phone; the table and *What it means* likewise; the action plan full width;
the closing line last. **What you type stays on the page, under the eight** —
the count, the timings, the settings: detail one tap or one scroll away
(`docs/SIMPLE.md`), never removed.

## The honest substitutes — what is not copied from the picture

- **No OEE, and no Availability · Performance · Quality.** MEASURED BY
  PEOPLE, NOT BY SENSORS (CLAUDE.md): typed by hand its availability is a
  guess. The tiles are counted figures — good packs against what the rate
  expects, minutes lost against minutes planned, stops timed, rejects
  counted, and the pounds. The donut of OEE becomes nothing: the tool's own
  picture is the breakdown.
- **"Since last time" is a record, never a guess.** A change is drawn only
  against the previous record of the same kind on the same line (the count
  before, the study before); with none, the tile says what it is *of* and no
  arrow. Better is the house green, worse the house red, the same grey —
  always with the number and the day it is against, so it survives a
  black-and-white print.
- **The house colours, not the picture's green.** The band is the house graphite
  (`--shell`, `SHELL`). A tile wears colour only when its number is abnormal
  (red, or amber where the module says amber) or met (a quiet green wash);
  otherwise it is plain. The brand's teal stays for what you press. The tagline
  ribbon ("Less waste | Higher OEE | …") is not copied: it says nothing about
  this line.
- **Every figure has a cost** (CLAUDE.md, EVERYTHING DERIVES A COST): one
  tile is always the money, from the one cost model; where an input is
  missing the tile says which and where to give it.

## The kit — one model, drawn twice

- `src/lib/lean.ts` — the model (`LeanPage`: band, tiles, trend, insights,
  actions, closing) and its helpers: `since()` for a change against the
  record before, `actionOf()` for an action, a fix or a countermeasure as a
  row of the plan. Pure; tested.
- `src/lib/report/lean.ts` — the paper: `leanBand`, `leanTiles`,
  `leanTrend`, `leanInsights`, `leanActions`, `leanClosing` as report-engine
  blocks (`docs/REPORTS.md`): measured, never cut, poured.
- `src/ui/Lean.tsx` — the screen: `LeanBand`, `LeanTiles`, `LeanTrend`,
  `LeanInsights`, `LeanActions`, `LeanClosing`, and the `.ln-*` styles.
- Each tool has one pure builder that reads its own module's figures and
  sentences into a `LeanPage` — nothing worked out twice. The screen and the
  paper both call it, so they never part.

## Where each report is going — the whole shape

| Report (module) | Tiles | Trend | Picture | Top causes | Action plan |
|---|---|---|---|---|---|
| **Loss count** (`studiesPdf`, `LossesScreen`) — slice 1 | Good packs of expected · lost of planned · stops timed · rejects · what it cost | Good packs a shift against expected, the line's counts | The waterfall | The losses by cause, with share | Fixes and countermeasures raised from its bars |
| **Line capacity** (`capacityPaperPdf`, `CapacityPanel`) | What the line makes · target · short by · cost a pack · people | — (its what-ifs are the alternatives) | The V | Stations, slowest first, % of the bottleneck | The way to the target (who is added where) |
| **Line balance · All together** (`studiesPdf`, `togetherPdf`) | People · work against takt · the bottleneck person · cost a pack · lost a minute | — | The Yamazumi | People over takt, most over first | Set as standard; Make it better raised |
| **SMED** (`changeoverTable`) | Changeover now · internal · target · cost a year | The changeover timed, session by session | The grid | Longest internal elements | SMED actions |
| **Value stream · work sampling · capability** | Lead time / shares / Cpk | Studies of the line | Their grid / bars / run | Biggest waits / shares / outside | Fixes raised |
| **Client report · one-page status** (`clientReport`, `statusReport`) | Gates done · late · problems · tests passed · handover date | The climb to rate | Where each machine is | Late and problems, worst first | Fixes: who, by when |
| **6M report** (`sixmReportPdf`) | The gap now · causes · countermeasures done/open · held | The measure, reading by reading | The fishbone | Causes by evidence | Countermeasures: who, by when |
| **Problems** (`snagsReportPdf`) | Open · critical · late · closed this week | Open a week | By line | By category | Each problem's owner and due |
| **Control room · factory** | Lines · jobs off plan · late · critical · money at risk | Open problems a week | The lines | Worst jobs and lines | This week's owed actions |
| **Commissioning · programs · handover · materials · day** | Their counts | — | Their grid | What did not pass / is late | Fixes, owners, days |

Cards pinned at the line (test cards, problem cards, the line standard's
card) keep their card form; they take the band only.

## Slices — each ships live with the gate green

1. **The kit and the loss count**, screen and paper. *(Live.)*
2. **Line capacity, the line balance and All together**, screen and paper. *(Live.)*
   Line capacity keeps its inputs-left, picture-right layout (Rowland, 16
   October) between the tiles and the closing line; the line balance's paper
   is its list's and All together's — it has no page PDF of its own.
3. **The client report and the one-page status, and the job's front page.**
   The front page's dark verdict band was already the band and the tiles
   (Redesign, 5 October); it now counts what both papers count, five tiles:
   the handover · late *of* what is still to do (Outstanding was a tile of
   its own; it is the number Late is out of, so it is Late's "of" — the
   abnormal number big, the work beside it) · critical (and high risks) ·
   fixes open (and late) · and **the money: what the slip costs** — the days
   the handover has moved × a day of the job's lines not making, in margin
   (`lib/lineLoss` lineDay: the line's speed × its shifts less their breaks
   × its margin a pack, all from Your factory); on time, what a day late
   would cost; a line with something unsaid names what to give, and where.
   The closing line says the slip in money too.
   **3b. The stage gate's pages and papers** (Rowland, 17 October: "Stage
   gate entire system is the current priority") — `lib/stageGatePages`:
   Commission (passed of the tests, didn't pass, didn't run, still to run),
   Install · Set up · Hand over (done of the steps, late, problems, not
   added yet), the job's Problems (open, critical, late, no fix yet) and
   Materials (here of what is needed, late, waiting, no date) each wear five
   tiles under the header — **the header's count line moved into them**,
   one place, as Materials' own note asked when it first lost its tiles —
   and every one ends on the job's money (`lib/useJobMoney`: what the slip
   costs, or what a day late would) and a closing line. Programs keeps its
   chips as its tiles (each is its filter) and gains the closing line. On
   paper: the commissioning report carries Commission's tiles and closing
   line; the materials report its page's; the handover report machines
   handed over of the job's, what is still open and the money, closing
   before it is signed; the programs report its closing line, the money in
   it when the slip has run one up.
4. **The 6M report and Problems.** The 6M report (`lib/sixmLean`, read
   from its own model): five tiles — the gap, the problems being worked
   (and any slipped back), the roots found on the fishbone, the
   countermeasures (and the late), what is holding (and any check missed) —
   under the band on the full report and the one page, and on the 6M job's
   front-page band (its two tiles, outstanding and late, were the board's
   actions; the countermeasures tile carries them); the closing line at the
   foot of the story, before the evidence. The Problems register
   (`lib/problemsLean`): its chips stay its tiles on the page (each a
   filter) and become the lean tiles on its paper — Critical, High, Low in
   their RAG with the word, late, done — and both close on the worst open
   problem and where it is. No money in either yet: what a countermeasure
   is worth and what a problem costs while it is open are the next piece
   (BLUEPRINT §6), never a figure made up here.
5. **The control room** (5a, `lib/roomLean`), then the factory and the day
   (5b). The control room's band keeps its numbers as its filters (each a
   tap) and each now says what it is *of*: the jobs running (behind target,
   handed over), late (a line's own share), critical (only when there is
   one, as before), this week — and the money, **what the slips cost**:
   every running job's days past its agreed handover × a day of its lines
   not making, in margin, from Your factory — the stage gate's own money
   tile added up across the jobs. No "outstanding": the planned gate steps
   are the work ahead, not what is owed (Rowland: "states loads open but
   they are gates"). The board closes on one line — how many jobs are
   behind, the furthest named with its days, what is late and critical,
   what the slips cost. On paper, the control room report's tiles sit under
   its sentence (the counts line they replace) and the closing line at its
   foot, still one page.
6. SMED, value stream, work sampling, capability.
7. Commissioning, programs, handover, materials.

Each slice says its effect on the screen and the paper together, adds its
lines to `docs/PAGES.md`, and its checks to the acceptance script of the
tool it changes.
