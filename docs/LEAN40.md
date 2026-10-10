# Lean 4.0 and 5.0 — lean tools rebuilt as live, visual, engaging technology

Rowland, 10 October, three things in one afternoon:

> "We have already started line balance and line standard, but now we need
> to create Lean 4.0 tools, such as value stream mapping ... the tools will
> be again part of the app and can be assigned to any project. Don't build
> tools — educate yourself."

> "The entire app itself should move into a Lean 4.0 system ... and Lean
> 5.0."

> "What you've taken there is the methodology principles, which I
> understand. I'm thinking more of the technology aspects of things. If we
> were to build a value stream map in the past, that would be using
> Microsoft Visio — very blocky and outdated and not user-friendly. Now we
> have the opportunity to build something that's rather dynamic and very
> visually easy to understand and read. For example, from a value stream
> map, I envision where you have the steps on the left, just plainly put,
> a full table on the right-hand side — minutes and cycle time and lead
> time. You're able to colour code easily, value, non-value added, and it's
> a very engaging process. That's my point with Lean 4.0 and 5.0."

So this document is about **what lean tools become when they are built as
modern technology**: live, visual, calculated, captured at the line,
explained in plain words. The method behind them, the arithmetic and the
literature, is the appendix. **Nothing here is built.**

## The shift: from drawing to data

**How lean tools were done** — Visio, a whiteboard, a spreadsheet beside it:
- **Drawn by hand.** Boxes and arrows placed one at a time; the numbers are
  text typed inside shapes.
- **Nothing adds up.** The lead time on the ladder is summed by hand; change
  one cycle time and nothing else moves.
- **One person draws, everyone else reads a PDF.** It is out of date the day
  after the workshop.
- **The future state is redrawn from scratch,** and the gap between the two
  is worked out on a calculator.
- **It never leaves the office.** The numbers are walked in on a clipboard
  and typed again.

**What the research found about today's tools.** They split in two:
- **drawing tools** (Visio, Lucidchart, Miro, Creately) — templates and
  shapes, real-time co-editing, but "you'll need to handle calculations
  manually"; Miro has "no built-in VSM simulation or lead-time calculation";
- **analytics tools** (eVSM in Excel and Visio, iGrafx, process-mining
  suites) — they compute, but are heavy, desktop and expert.

**No tool found is table-driven, live and simple**, which is exactly what
Rowland describes. That is the gap, and the opportunity.

## What a Lean 4.0 / 5.0 tool is, as technology

Ten principles, drawn from the research and from what this app already
does well. Each is something a person feels, not a feature list:

1. **Table in, picture out.** You fill a table: typed, timed or filmed. The
   classic picture draws itself (the map, the ladder, the bars) and
   recalculates as you type. Nobody drags boxes.
2. **One tap to say what it is.** Each step is value-added, necessary, or
   waste, with one tap, and its colour and the totals change at once.
3. **Captured at the line.** A phone stopwatch where each tap starts the
   next step, the step named by voice. Or the line filmed, and the film cut
   into the steps. The table fills itself while you walk.
4. **One set of data, several views.** The same steps as a table, a timeline,
   a flow map, a Pareto of the waste, and a before-and-after. Switch, never
   re-enter.
5. **Before and after side by side.** "Copy to future state", change it,
   and every number shows its change: lead time 6.2 → 2.1 days.
6. **Live, together.** Two people on two phones fill the same table at the
   line; the laptop in the office watches it fill. The app already syncs
   this way.
7. **It explains itself** (Lean 5.0: people decide, the machine helps).
   - A plain-words reading under the picture: "Lead time 6.2 days. 14
     minutes of it adds value: 0.2%. The biggest wait: 2 days before
     packing."
   - Suggestions of which waste a step is, or where to start, said as
     suggestions. The team decides.
8. **Direct and immediate.**
   - Drag a row to reorder; drag a bar's end to change its time; tap a
     number to edit it in place.
   - Everything answers in the same moment, with a gentle movement so the
     eye follows what changed.
   - This is what makes it engaging rather than a form.
9. **Phone first, laptop for thinking.** On a phone the table becomes
   cards and the capture buttons are thumb-sized. On a laptop it is the
   full table beside the picture, for the workshop and the screen in the
   meeting room.
10. **One page of paper that reads like the screen.** For the wall, the
    client and the file.

The app's own rules still hold:
- **Colour carries meaning, never decoration, and is never the only
  carrier.** A mark and a word sit beside every colour, so it survives a
  black-and-white print.
- **Simple with detail.** Where are we, why not, what are we doing about
  it.
- **It ends in someone acting on something by a date,** or it is a gimmick.

## The value stream map, as Rowland sees it

A first design in words, to react to. Nothing is built.

```
  Line 2 — Tesco Express 1.25 kg — current state          [Copy to future ▸]
  ─────────────────────────────────────────────────────────────────────────────────
  Lead time 6.2 days    Value-added 14 min (0.2%)    Waste 5.9 days    Takt 3.0 s
  ─────────────────────────────────────────────────────────────────────────────────
  STEP (plain words)            TYPE  │ CYCLE  WAIT    LEAD (running)  │  TIMELINE
  1 Film delivered to store     ▢ wait│  —     1.5 d   1.5 d           │ ░░░░░░
  2 Film to the wrapper         ➝ move│ 4 min  —       1.5 d           │ ·
  3 Wrap and seal               ● VA  │ 2.0 s  —       1.5 d           │ █
  4 Wait for the checkweigher   ▢ wait│  —     40 min  1.5 d           │ ░
  5 Weigh and reject            ◆ chk │ 1.0 s  —       1.5 d           │ ▒
  6 Case pack                   ● VA  │ 6.0 s  —       1.5 d           │ █
  7 Pallet waits for despatch   ▢ wait│  —     2.0 d   3.5 d           │ ░░░░░░░░
  ...
  ─────────────────────────────────────────────────────────────────────────────────
  The biggest wait: pallet for despatch, 2 days.  The longest cycle: case pack,
  6.0 s, over takt (3.0 s) — the constraint.            [Show only the waste]
```

**The left side: the steps, plainly put.**
- One row per step, in order, in the floor's own words.
- Each with its type, as a small mark and a word, the classic five of a
  process activity map:
  - **operation** (the only kind that can add value);
  - **move**;
  - **check**;
  - **wait**;
  - **store**.
- Typed, spoken ("then it waits about two days for despatch") or captured
  by the walk.

**The right side: the full table, live.**

| Column | What it is |
|---|---|
| Value | **Value-added**, **necessary** (not value, but required: compliance, safety) or **waste**, one tap |
| Cycle | The time the work takes (C/T), per piece or per batch |
| Wait | The time it sits before the next step (queue, inventory turned into time) |
| Lead (running) | Lead time so far, added up as you go |
| Who / how many | Operators, where it matters |
| Distance | For moves, if walked |
| Changeover, uptime | Optional, for machine steps (the classic data box) |

Summed at the top, live:
- **lead time**;
- **value-added time**;
- **process cycle efficiency** (value-added ÷ lead time);
- **waste time**;
- **takt** (from demand and available time).

**The timeline: the time value map, drawn from the table.**
- A bar per step, its length its time.
- Value-added, necessary and waste told apart by fill and mark.
- Waiting drawn as the gaps it really is.

This is the "time value map" practitioners already use, with value-added
above the line, non-value-added below and gaps as delay. Here it draws
itself and moves as the numbers change. On a long process, minutes against
days, the bars switch to a scale that keeps a 2-second step visible beside a
2-day wait. (Showing that contrast is the point of the map.)

**The colours — one decision for Rowland.** The app keeps five colours for
*state*: red late or failed, amber waiting, indigo ahead, green done, grey
not started. Nothing else may wear them (CLAUDE.md, visual management rule
1). Value-added green and waste red would break that rule, and a waste step
would read as "late". So value, necessary and waste get **their own marks**:
- **value-added**: a solid fill in one colour of its own, kept for value;
- **necessary**: the same colour, light;
- **waste**: hatched, in a neutral grey.

Each also carries its word, so a black-and-white print still reads. It is
just as easy to read at a glance, and it keeps "red" meaning late
everywhere.

**Engaging, concretely:**
- **"Walk it" on the phone.** One big button, "Next step". Each tap laps the
  stopwatch and starts the next step. Say the step's name, tap its type, keep
  walking. At the end the table is full, timed and in order. It is the
  Capture screen's one-thumb stopwatch, aimed at a process instead of a stop.
- **From the film.** On the filmed walk, its segments, already in flow
  order, become the rows, their lengths the times.
- **Show only the waste.** One tap greys out everything that adds value or
  is necessary. What is left is the list of what to remove.
- **Tap a waste step, "Make it better".** It becomes an action on the job,
  with what it should change ("wait 2 d → 4 h"). On a 6M job it is a
  countermeasure on the board; on a stage-gate job, a part of the plan.
- **Copy to future state.** Strike out steps, merge them, shorten waits.
  Every changed number shows its change, and the header says the gain:
  "lead time −4.1 days".
- **Present.** In the meeting, the map steps through itself: current, the
  waste highlighted, then the future state and the gain. It is the app's
  present mode, already used for the meeting.

**Where it lives** (the app's rules for a tool):
- On a line, for a product, several per line, attachable to any project,
  like the line standard and line balance.
- It reads what is already kept rather than asking twice: cycle times from
  the line balance, operators from the line standard, stops from the Pareto.
- It shows where its line and its job show, as a branch: "lead time 6.2 d →
  2.1 d target" on the job's front page, a page in the client report.

## Every lean tool, re-seen this way

The same principle (a table you capture, a picture that draws itself and
explains itself) for the rest. One line each; none is designed yet.

| Tool | The old way | Lean 4.0 / 5.0, as technology | Builds on |
|---|---|---|---|
| **Line balance (Yamazumi)** | Bars drawn in Excel | Stations as stacked bars against a live takt line; drag a task from one station to another and watch both bars move; the constraint named | The line balance on a line |
| **Standard work combination table** | Hand-drawn Gantt on paper | Each element's manual, walk and machine time typed or timed; the chart draws itself against takt; over-takt shown | The line standard |
| **SMED (changeover)** | A stopwatch and a flip chart | Film the changeover; tap through it tagging each step internal or external; the bar splits and shows the gain of moving external work outside | The filmed walk |
| **OEE** | A spreadsheet number | A waterfall from planned time down to good output, each loss a bar (stops, speed, rejects), from what is already kept; tap a loss to see its stops | Runs, the Pareto |
| **Spaghetti diagram** | Pencil on a printed plan | Draw the path on a photo of the floor; the distance is worked out; before and after side by side | The line map |
| **5S** | A paper score sheet | Before and after photos with a slider, and a score kept over time | Snags, photos |
| **A3** | A Word template | Assembled from the job itself: problem, cause, countermeasure, proof. Typed once, printed as one page | The 6M job |
| **Kanban sizing** | A formula on a whiteboard | A calculator that shows the loop and its bins as you change demand and lead time | Materials |

## What the app already has to build on

This is why it can be done here, and done well:
- **The plan's layout**: rows on the left, bars on the right, by machine or
  by stage, days or weeks, folding, tapping a row to open it. The time
  value map is a cousin of it.
- **The Capture screen's stopwatch**: one thumb, survives the app closing,
  tap what and where.
- **The filmed walk**: segments in flow order, frames marked.
- **Voice into boxes** and "better words": speak a step, it lands in the
  right box.
- **Live sync, offline first**: two phones on one table, no signal no loss.
- **The line balance and line standard**: the first two tools, on a line,
  attachable to a job.
- **Present mode** for the meeting, and **the report engine** for one page
  of paper.
- **The rules**: visual management, simple with detail, connect the dots.
  These are what stop a dynamic tool becoming a gimmick.

## Decisions for Rowland

1. **The VSM's first shape.** The table-and-timeline above, steps on the
   left, the table on the right: is that the picture in your head? A
   clickable mock-up would let you try it before anything is built.
2. **The colours.** Value, necessary and waste in their own marks (solid,
   light, hatched), keeping red, amber and green for state. Or a different
   choice?
3. **How a map is first filled.** "Walk it" on the phone, typed in the
   workshop, or from the film? All three in time; which first?
4. **Its span.** One line, a plant door to door, or across sites; and
   current state first, or current and future together.
5. **Which tool after the VSM** from the table: the Yamazumi you can drag,
   SMED on the film, or the OEE waterfall?
6. **The whole app** (the earlier draft's question): shall every change from
   here say how it makes the app more Lean 4.0 (captured once, live, the
   loop) and Lean 5.0 (people first, resilient, sustainable)?

---

## Appendix — the lean knowledge behind it

Kept so the tools are built on the real method. The technology changes how
it feels; it does not change the arithmetic.

### The value stream map, as the method defines it

Rother & Shook, *Learning to See*; the symbols are not fully standardised.
- **Customer** (demand per day) and **supplier**.
- **Process boxes** with a **data box**:
  - cycle time;
  - changeover;
  - uptime;
  - operators;
  - shifts and available time;
  - batch;
  - scrap;
  - EPEI.
- **Inventory** between boxes turned into **days of demand** (quantity ÷
  daily demand, Little's Law).
- **Push, FIFO and pull** (supermarkets).
- **Information flow**, manual or electronic.
- **The timeline ladder**: waiting high, process time low, totalled to
  **lead time** against **process time**.
- **Kaizen bursts** where something must change.

**The arithmetic:**
- **takt** = available time ÷ demand;
- **inventory days** = quantity ÷ daily demand;
- **lead time** = Σ waits + Σ process times;
- **PCE** = value-added ÷ lead time, often under 1%;
- **EPEI**: every variant's run time plus its changeovers must fit in the
  interval, so a shorter changeover buys a shorter interval. For example, a
  70-minute changeover would need to be 30 minutes for a daily interval
  instead of a weekly one.

**The future state's eight questions** (Rother & Shook):
1. Takt.
2. A finished-goods supermarket, or straight to shipping?
3. Where can continuous flow be used?
4. Where are supermarkets needed?
5. Which one point is scheduled, the pacemaker?
6. How is the mix levelled?
7. What release increment (pitch = takt × pack-out quantity)?
8. Which improvements?

**VSM 4.0** (Meudt, Metternich, Abele, CIRP Annals 2017) adds
**information logistics** per box: how its data is collected, where it is
kept, and whether it is used. It names **information waste**: data typed
twice, media breaks, searching, data never used, waiting for information.
A 2023 follow-up found the original "non-intuitive ... time-consuming" and
simplified it. **Lesson: keep it light.**

**The time value map and the process activity map**, the two simplest
forms, and the ones Rowland's picture is closest to:
- each step classified **operation, move, check, wait or store**, and
  **value-added, necessary non-value-added or waste**;
- value-added above the line and non-value-added below, gaps as delay;
- totals and the value-added ratio beneath.

### Lean 4.0 and 5.0 as the literature uses the words

- **Lean 4.0**: lean fed by Industry 4.0 data, captured at source, seen
  live, acted on in a loop. Lean first, or the technology "automates the
  waste" (BCG). The literature's tools are VSM 4.0, kanban, visual
  management, andon, jidoka, poka-yoke, TPM, kaizen, SMED, digital standard
  work and digital shop-floor management. There is no standard list and no
  standard maturity model.
- **Industry 5.0** (European Commission, 2021) has three pillars:
  - **human-centric**: the worker's wellbeing at the centre;
  - **resilient**: absorbs disruption;
  - **sustainable**: within planetary limits.
- **Lean 5.0** is lean meeting those pillars. Lean was always human-centric
  ("respect for people"), so it is the natural way in. Digital tools help
  people decide; they do not decide for them. Sustainable VSM adds energy,
  water and material per box (the EPA's "Lean and Clean").

### The other tools in one paragraph each

- **Takt and line balance**: stations' work stacked against takt; the
  constraint first (Theory of Constraints).
- **Standard work**: Toyota's three forms: the process capacity sheet, the
  combination table, the standard work chart. Built on takt, the work
  sequence and standard WIP.
- **OEE** = availability × performance × quality; Nakajima's six big losses:
  breakdowns, set-ups, minor stops, reduced speed, defects, start-up. Say
  whether planned changeovers count.
- **SMED**: internal (machine stopped) against external work; move it
  outside; video is the baseline.
- **Kanban**: cards = demand × replenishment lead time × (1 + safety) ÷
  container quantity.
- **Heijunka**: level the volume, then the mix, released at the pitch.
- **Andon and jidoka**: stop or call at the abnormal; 4.0 adds what, where,
  how long, and escalation to a phone.
- **Poka-yoke**: device-side checks; the app records that one was proven.
- **Shop-floor management**: SQDCP boards, tiered meetings, leader standard
  work.
- **5S, waste walk, spaghetti diagram**: counted and observed evidence.

### The earlier draft's audit of the whole app, kept short

Against Lean 4.0 (captured once at source, live, the loop) and Lean 5.0
(people first, resilient, sustainable), most of the app already fits:
- the drawer at the machine with voice, photos and files;
- the live control room;
- Needs you;
- offline sync;
- Not yet instead of blame.

The gaps found:
- the line's numbers typed by hand (and, Rowland, 1 October: "no Excel that
  needs to be uploaded");
- no value stream view;
- OEE not worked out;
- the phone told only about reminders, not about what goes red;
- no trend of control;
- nothing sustainable counted;
- people counted as suppliers;
- good work thanked only on 6M;
- skills not kept.

## Sources

- [Lean Tools in the Context of Industry 4.0: Literature Review, Implementation and Trends (Sustainability, 2022)](https://doi.org/10.3390/su141912295)
- [Lean 4.0: Synergies between Lean Management tools and Industry 4.0 technologies (IFAC, ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2405896322020201)
- [Lean Meets Industry 4.0 and Operational Excellence (BCG)](https://www.bcg.com/publications/2017/lean-meets-industry-4.0)
- [Industry 5.0: towards a sustainable, human-centric and resilient European industry (European Commission, 2021)](https://research-and-innovation.ec.europa.eu/knowledge-publications-tools-and-data/publications/all-publications/industry-50_en)
- [Lean and Industry 4.0 principles toward Industry 5.0 (JMTM, 2024)](https://www.emerald.com/jmtm/article/35/9/122/1228960/Lean-and-industry-4-0-principles-toward-industry-5)
- [Toward lean industry 5.0: a human-centered model (arXiv, 2025)](https://arxiv.org/pdf/2509.11658)
- [Value stream mapping 4.0 (Meudt, Metternich, Abele — CIRP Annals 2017)](https://www.sciencedirect.com/science/article/abs/pii/S0007850617300057)
- [Extension of value stream mapping 4.0 (Production Engineering, 2023)](https://link.springer.com/article/10.1007/s11740-023-01207-5)
- [Value Stream Mapping — Lean Enterprise Institute lexicon](https://www.lean.org/lexicon-terms/value-stream-mapping/)
- [Time Value Map (AHRQ workflow toolkit)](https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/time-value-map)
- [Time value map (iSixSigma)](https://www.isixsigma.com/dictionary/time-value-map/)
- [Time value map in Excel (QI Macros)](https://www.qimacros.com/quality-tools/time-value-map/)
- [Value added vs non-value added (Fabrico — vendor)](https://www.fabrico.io/fr/blog/value-added-vs-non-value-added/)
- [Value-stream-mapping software (Wikipedia)](https://en.wikipedia.org/wiki/Value-stream-mapping_software)
- [Best value stream mapping software for manufacturing (Lean Datapoint — vendor comparison)](https://leandatapoint.com/blog/best-value-stream-mapping-software-for-manufacturing)
- [Value stream mapping online (Miro)](https://miro.com/value-stream-mapping/)
- [eVSM (Lean Enterprise Academy listing)](https://www.leanuk.org/product/evsm/10076})
- [Value stream mapping in iGrafx — timeline setup](https://doc.igrafx.com/docs/user-guide/modeling-in-the-igrafx-platform/diagram-details-web-authored/value-stream-mapping/)
- [AI value stream mapping generator (Visual Paradigm — vendor)](https://guides.visual-paradigm.com/ai-value-stream-mapping-generator/)
- [Lean Work Sampling app (App Store)](https://apps.apple.com/us/app/lean-work-sampling-lean-tool/id1256690217?uo=4)
- [Timestu — category stopwatch for Lean and Kaizen (App Store)](https://apps.apple.com/app/timestu/id6755205923)
- [AI video analysis for time study (MTM — vendor)](https://mtm.org/en/software/ai-video-analysis)
- [Yamazumi chart (Fabrico — vendor)](https://www.fabrico.io/blog/yamazumi-chart/)
- [OEE waterfall analysis (SCW.AI — vendor)](https://scw.ai/?p=27666)
- [Taking a Bite Out of Lead Time (IndustryWeek) — Little's Law](https://www.industryweek.com/operations/continuous-improvement/article/21964950/taking-a-bite-out-of-lead-time)
- [Every Product Every Interval — LEI lexicon](https://www.lean.org/lexicon-terms/every-product-every-interval/)
- [Quick changeover and production scheduling (EMS Strategies)](https://www.emsstrategies.com/dd030106article.html)
- [Standardized work — LEI lexicon](https://www.lean.org/lexicon-terms/standardized-work/)
- [Lean and the Environment: value stream mapping (US EPA)](https://19january2021snapshot.epa.gov/sites/static/files/2015-02/documents/vsm.pdf)

Many practitioner sources are vendors; their figures are claims, not
evidence. The method comes from Rother & Shook, the Lean Enterprise
Institute, Nakajima's TPM and Shingo's SMED.
