# The upgrade plan — power without complexity

**Asked 15 October 2026** (Rowland's brief: take every tool to the highest
level the code allows — a hero answer, the deep analysis under it,
intelligence, provenance and confidence on every figure, designed states,
fast capture on a tablet; capacity first as the reference). Kept up to date as
the build goes: each slice says **built**, **in the gate** or **live** beside it.

This plan sits under `docs/BLUEPRINT.md` (the one map) and keeps every rule in
`CLAUDE.md`. Where the brief and a standing rule pull apart, the rule wins and
the decision is written in §5 — those are the calls Rowland may want to
reverse.

---

## 1. What is here (the audit, read from the code)

The brief describes "a loss-logging and performance tool". The app is more
than that and already further along than the brief assumes — so the job is to
**raise and connect what exists**, not to rebuild it.

| Module the brief names | What exists today | Where |
|---|---|---|
| **Loss logging** | A line's stops, timed on the phone (stopwatch, typed or a tap), with category, reason, machine, shift, photos and video, the six-M family; offline-first in IndexedDB, synced per line with RLS | `#/w/:line/capture` · `Observation` (`src/types.ts`) · `src/screens/CaptureScreen.tsx` |
| **Pareto** | A line's Pareto with drill-down (what → where → shift), by count or time, the frequent-vs-costly disagreement, the suggested next cut; a 6M job's Pareto sheet before → after | `#/w/:line/analyse` · `src/engine/` (`pareto`, `drill`, `intelligence`, `compare`) · `#/project/:id/pareto` |
| **A shift's losses** (the waterfall) | Counted by hand per shift on the bottleneck's ideal speed: planned time, stops by reason, changeovers, rejects, slow running and short stops told apart by the running speed; pounds in two parts | `#/losses/:id` · `src/lib/ie/losses.ts` · docs/CAPACITY.md §5–6 |
| **Capacity** | Line capacity per product: stations in flow order, units converted, the bottleneck once stops count, the V-curve, the sheet, what-ifs, a shift's make, labour a pack, the checks, several lines into one, the way to the target | `?at=balance` · `src/lib/capacity.ts` (+ `capacityPlan`, `capacityLines`, `capacityPaper`) |
| **Snag list** | Problems — the register, on every line and job, priority RAG, owner, due, journey, photos marked, cards and reports | `#/snags` · `snags` |
| **Line map** | Line standard (who stands where, on a photo or a drawn board), the value stream map, the filmed walk | `#/standards` · `#/value-stream` |
| Also | SMED, work sampling, capability, the time study, the 6M method, stage gate, lever tree, the control room, Your factory, Programs | docs/BLUEPRINT.md §3 |

**What does not connect yet** (the gaps the brief is right about):

1. **No line-level, over-time answer to "what can this line make".** Capacity
   is worked per product from speeds; the shifts counted (loss counts) prove
   what the line *did*, but nothing puts the two side by side: theoretical vs
   demonstrated vs plannable.
2. **The constraint is known in Line capacity, not in the Pareto.** A stop on
   a machine that is not the bottleneck is ranked as if it cost throughput.
   The brief's signature insight — the mirage — is said once, inside a loss
   count's pounds, and nowhere a loss is ranked.
3. **No "what changed this week"** across a line's stops.
4. **No confidence on a figure.** A number from three stops reads the same as
   one from three hundred.
5. **No "why this number"** — the figure's sum, period and source records,
   one tap away — outside a few places.
6. **No demand.** Nothing says whether next week's orders fit.
7. **No way to jump** between lines and tools without the rail.

---

## 2. Patterns kept, and rejected

From Vorne/OEE.com's six big losses and constraint focus; TEEPTRAK's reason
library and Pareto workbook; Redzone's huddle and won/lost scoreboard;
Goldratt's rules (an hour lost at the bottleneck is lost to the system; an
hour saved elsewhere is a mirage); Evocon/Guidewheel-style shift reports.

**Kept**
- *Constraint first, everywhere* — every ranked loss says whether it sits on
  the constraint; off it, "fixing this will not make more" and where the prize
  is (Goldratt). The signature.
- *Pareto with the 80% line*, by time, count and £; chronic (recurring week
  after week) told from one-off.
- *Demonstrated, not nameplate* — plan on what the line proved, at a cautious
  percentile, not the average.
- *The huddle's answer first* — one sentence: won or lost, by how much, why.
- *Change detection* — this week against the weeks before, only where the
  data can carry it.
- *Drill to the event* — every number opens what it is made of.

**Rejected, and why**
- **OEE as a score** — CLAUDE.md, "measured by people, not by sensors": typed
  by hand its availability is a guess; minutes and pounds instead.
- **Machine connectivity / IoT** — the same rule.
- **Live dashboards that poll** — cost and battery; data is pulled on open.
- **AI that computes** — numbers come only from tested functions (§4).
- **A configuration screen for the intelligence** — defaults; nothing to set.
- **A new "change" or "loss" noun** — a fifth concept is almost always wrong.

---

## 3. The build, in order

Each slice ships live on its own (gate → main → Vercel READY), then the next.

### Phase 1 — shared foundations
- **F1 · The intelligence layer, deterministic** (`src/lib/intelligence/`):
  `confidence` (days and events → solid / fair / thin, a range when thin);
  `Figure` (a number with its unit, its sum in words, its period and its
  source record ids) — the provenance every tool hands to the drawer;
  `changes` (this week against the four before, per reason and machine, only
  past a minimum, said in words); `constraint` (is this loss on the line's
  bottleneck? the mirage sentence when not). Pure, unit-tested: zero data,
  one event, a constraint that moves mid-period, a loss off the constraint,
  overlapping stops.
- **F2 · Shared parts**: the hero answer (one sentence, the eye's first stop);
  a figure with its confidence badge; the "why this number" drawer listing the
  sum and the records (each opening its stop, its count, its station); thin
  and empty states that say what to log next; skeletons, not spinners.
- **F3 · Jump** — ⌘K / Ctrl-K (and a button on a phone): any line, tool, job
  or product by typing two letters.
- **F4 · Ask** — a box on each tool. It answers a set of question shapes
  *without AI* ("can Line 3 take 40 more pallets on Thursday?", "what's the
  biggest loss this week?", "what changed?") by calling the same functions and
  showing the figures it used. With an Anthropic key set as a Supabase secret,
  an edge function (`ask`) narrates and handles the rest — sent only the
  figures the question needs, never raw records, cached per line and week,
  rate-limited; no key, no call, nothing breaks.

### Phase 2 — the tools
- **C · Capacity, the reference** — on each line: *Theoretical* (the
  bottleneck's ideal speed), *Demonstrated* (what counted shifts proved:
  good packs ÷ planned minutes), *Plannable* (the 20th percentile of the
  counted shifts — four in five did at least this), each with its confidence;
  the period's **waterfall** over every counted shift, each band opening the
  stops behind it; **the constraint over time** — where stop minutes
  concentrate week by week against Line capacity's bottleneck, said when it
  moves; **load vs demand** — the week's orders typed or pasted per product
  (held in the product's capacity, no new table), hours needed at the
  plannable rate against the hours the shifts give, headroom or overflow in
  hours, packs and £; **recovery levers** — the top reasons, a slider each,
  the week's packs and £ recalculated live, and the mirage said for every
  lever off the constraint; a **line × day heatmap** of stop minutes; the
  **weekly brief**; Ask.
- **L · Loss logging and the Pareto** — capture: recent reasons first, the
  last machine kept, one hand; the Pareto ranked by time, count and £ (the
  line's cost a minute at the constraint), by machine, shift and product;
  chronic vs one-off; the constraint marked on every bar, the mirage on the
  rest; what changed this week at the top; each reason opening its stops and
  the problems raised on it.
- **P · Problems and the line map** — the line as a tour: its machines in
  flow order (the factory's), each with its photo or walk frame and the
  problems on it, priority, owner, status, and the £ a week when a problem is
  linked to a stop reason; readable in thirty seconds.
- **O · The other tools** — the hero answer, confidence and "why this number"
  on SMED, work sampling, capability, value stream, the loss count and the
  control room, where the figure already exists.

### Demo
- **D · A demo factory** behind a clearly labelled switch: three lines, mixed
  products, six weeks of stops with a believable Pareto, one clear
  constraint, one expensive loss off it, one thin week, a few problems. Kept
  in its own local database, never synced (§5).

---

## 4. The rules this upgrade keeps

- A number is made only by a tested function. The AI narrates figures it is
  given and quotes them; it never computes one.
- Every figure can be opened to what it is made of.
- Thin data says so, with a range, never false precision.
- The app works fully with the AI layer absent.
- No new table unless unavoidable; any migration in the house shape
  (CLAUDE.md, "Database changes ship from here").
- The look stays Faultline's (kept by Rowland, 11 October): new parts use
  the existing tokens, the five state colours keep their one meaning.
- Every page a slice touches adds its lines to `docs/PAGES.md`.

---

## 5. Decisions made without asking (Rowland may reverse)

1. **No OEE score; the waterfall is the shift time model the app already
   counts.** The brief's "availability · speed · quality loss" bands are the
   same minutes, named as the floor names them (stops, changeovers, slow
   running and short stops, rejects). Reason: the standing rule, and every
   band then traces to logged events.
2. **Ask runs in a Supabase edge function, not a new Vercel route**, and works
   without a key for the common questions. Reason: the app's one server
   pattern (`supabase/functions/remind`), RLS and the session already there;
   the key is Rowland's to add (`ANTHROPIC_API_KEY` as a Supabase secret).
3. **Plannable is the 20th percentile of counted shifts**, needing at least
   five shifts; fewer, it is said as a range and marked thin. Reason: a
   plant manager plans on what the line does four days in five.
4. **The demo is the app's existing demo line, grown to three lines** (revised
   while building: the existing mechanism already keeps demo lines out of the
   factory and every report). They are workspaces in the account, so they
   sync like any line; "Build / rebuild the demo line" replaces them, and
   deleting a demo line removes it.
5. **The look is not redesigned.** New shared parts in the existing tokens.
   Reason: kept by Rowland on 11 October; "do not reopen without him asking"
   — the brief asks for a heightened UI, so the parts are raised, the
   palette and type are not replaced.

---

## 6. Where it stands

- Phase 0 (this document) — written 15 October.
- **F1 + C (the capacity reference) — built 15 October**, on branch `upgrade`:
  `src/lib/intelligence/` (confidence, figure, stops counted once, what
  changed, the constraint and the mirage, theoretical / demonstrated /
  plannable, the period waterfall, recovery levers, load against demand, Ask
  without AI) — 31 tests; `ui/WhyNumber` (why this number, a metric with its
  confidence); `ui/LineCapacityHero` on each line of Line capacity; the `ask`
  edge function (not deployed until the key decision, §5.2); `docs/PAGES.md`
  carries the panel.
- **L (first part) — built 15 October**: the Pareto read under every drill
  (chronic / recurring / one-off; on the constraint or the mirage; how much of
  the lost time in view is on the constraint) and what changed this week on
  the line's Pareto board, each a tap from its drill.
- **D — built 15 October**: the demo factory (`src/lib/demoFactory.ts`), built
  with the demo line from the account menu: the packing hall (flow wrapper
  the constraint; six weeks counted, one thin; orders that do not fit; the
  weigher's load-cell breakdowns an expensive loss off the constraint), a
  punnet line (the filler; orders that fit), a bakery wrap (thin). Every demo
  line named "Demo — …" (`lib/lines isDemo`), left out of the factory and
  every report. Decision 4 revised: the demo extends the app's existing demo
  line rather than a separate local database — that mechanism was already
  here and already kept out of real work.
- **P — built 15 October**: *The line, machine by machine* on each line's
  page (`ui/LineTour`) — one sentence (machines, problems open, critical,
  late, where most sit, how many are on no machine, which machine stops the
  most, where the line is held), then a card a machine in the factory's flow
  order (then Line capacity's stations, then any machine a stop or a problem
  names): its newest problem's photo, its problems by priority with whose and
  when, its stops a week over four weeks in minutes and idle labour £ (and
  output, at the constraint), the constraint tagged; late or critical edged
  red; a tap opens its problems on the register. Found building it: a
  problem pinned on the walk never said its machine on the line's page
  (`lineProblems` had no asset names) — it does now, on the rows and the tour.
- **C (the heatmap) — built 15 October**: *Where and when it stops* on
  each line's capacity panel — a machine × day grid of stop minutes over four
  weeks (`lib/intelligence heatOf`), the line's machines in flow order, in
  neutral ink (never a state colour), its sentence naming the worst day and
  the machine stopped on the most days (chronic when on half or more); every
  cell opens the stops it is made of.
- **C (the brief) — built 15 October**: *The week, to send* at the foot of
  each line's capacity panel — the panel's own sentences as one paragraph
  (what it can make, where it is held, the biggest loss, what changed, where
  and when it stops, whether the orders fit) with *Copy the week*
  (`weeklyBrief`, no AI). Found writing it: the constraint over time called a
  machine "usual" when it was worst in two weeks of six and then argued with
  this week's — "usual" now needs half the weeks or more, and the brief no
  longer says "the losses moved" twice.
- **O (the control room) — built 15 October**: each line's card in Your
  factory says what it can plan on — "Plans on 79 a minute · fair", or "2
  shifts counted — too few to plan on" — from the same `lineRates` as its
  capacity panel (`rateShort`), so the two cannot disagree; the unit stays
  on the line's page, where its products say it.
- **C on paper — built 15 October**: Line capacity's PDF for a line (or
  every product shown) now opens with each line's week in the panel's own
  sentences — what it can make, where it is held, the biggest loss, what
  changed, where and when it stops, whether the orders fit. The panel's sums
  moved into one function (`lib/lineRead readLine`) that the screen and the
  paper both call, so they cannot disagree. Nothing removed from the paper.
- **L (the count) — built 15 October**: a shift's loss count says, on every
  cause in its table and in the cause's sheet, whether its stops sit on the
  line's constraint (its Line capacity, `constraintShare`) — nothing taken
  off the table, the figures unchanged. Worded for one counted shift: off the
  constraint it "cost output only where it starved or blocked" the
  constraint, and making it better makes no more on its own. On paper too:
  the 6M report's and the client report's loss table say "· on the
  constraint" or "· off the constraint" on each cause, by the same rule
  (`lib/lineRead constraintOfBars`).
- **L (capture) — built 15 October**: *Again?* on Capture — the last four
  distinct reasons (machine · what · which kind) still on the line's lists,
  one tap sets all three (`recentReasons`). The Pareto already ranked by time
  and £ and cut by shift; a cut by product needs the product on a stop, which
  is a new column — left in IDEAS.md.
- **Found on the demo and fixed**: a stop of the whole line stops the
  constraint (never the mirage); a band made of several machines' stops says
  its own share on the constraint; slow running and short stops are line time
  at the constraint by definition; "about 0 min a week before" said as
  "hardly logged before".
