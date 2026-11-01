# FC-003 — Process flow chart: operation, transport, inspection, delay, storage: the specification

**Catalogue:** FC-003 (it depends on FC-001, the value stream map, and FC-028, ECRS, which the questioning after it uses) · **Knowledge:** `lean.process-flow-chart` (full, textbook), with
`lean.value-stream-mapping` and `lean.seven-wastes` beside it · **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the projects"*; the Kaizen
event's *Observe* section lists it and `docs/METHODS.md` §11 marks it "not built — a drawn chart" · **Status:** draft, built on `m6-other` (1 November)

## 1. Purpose
The value stream map says where a stream's lead time goes; it does not say, step by step, which steps change the product and which only move it, check it or hold it.
The flow process chart is the finer instrument for **one** path — a tray from the oven to the despatch pallet, an ingredient from intake to weigh-up — every step in the order it
happens on the floor, classed by the five ASME symbols, with its time and, for a move, its distance. The totals by class say how much of the path changes the product and how much is
waiting. The sentence it lets one side say to the other — the Kaizen team to the line lead, the lead to the manager: **"14 steps: 4 change the product, 5 move it, 2 check it, 2 delay it
and 1 stores it. It takes 279.5 min; 3.9% of that is operations and 93% is waiting — it travels 140 m."**

**Scope.** What this build covers: (1) a **chart of one path** — up to 24 steps typed in order, each *what happens* (words), its class (operation · transport · inspection · delay ·
storage), its minutes and, for a transport, its metres; (2) the **figures** — the count, the minutes and the metres by class, the share of the time in operations, the share waiting
(delay + storage), the share in operations *with storage by design aside*, the longest transport and the longest delay; (3) the **picture** — the chart itself, the symbols down the page
joined by a line, each step's words and its two figures, drawn once for the screen and the paper; (4) the **money, every input optional** — the people's minutes on the moves and checks
(labour) and what holding the product through its delays and storage costs (inventory carrying), a day; (5) the **saved before** that makes a before → after of the questioned chart
(steps fewer, minutes less, metres less); (6) the paper. It is a **calculator** of the shared shape (`knowledge/specs/FC-235-calculators.md`): the record, the list, the page, the rename,
delete and Undo, the line report, access and sync are the shape's, so nothing is added to the rail, the tabs or the menu. What it deliberately does not cover: **two things working together**
(a person and a machine — the person and machine chart, FC-025), **the whole stream and its information flows** (FC-001), **a man-type chart** (what a person does, as against what happens to the
product) — the subject is the product; **reading the steps from the value stream map** (the map's steps carry who, where and VA·NE·NV, not an ASME class — they stay the map's); **a path of more than 24 steps** (split
it in two); **a rated time** (the chart records the time; rating belongs to the stopwatch study, FC-019); **drawing the path on the layout** (that is the spaghetti diagram, FC-004); any AI.

## 2. Users and scenarios
**Who:** the Kaizen team following a product on the floor in *Observe*; an engineer walking one path before a layout change; the line lead at a desk afterwards. On a phone beside the product or at a desk.

**Scenarios, food first.** (1) *A baked product.* The team follows a tray from the oven to the despatch pallet and types 14 steps: 4 operations, 5 transports (140 m), 2 inspections, 2 delays (a forklift,
QA release) and the four-hour chill. The chart says 3.9% of the time is operations, 93% is waiting — and, the chill being by design, 27.8% of the rest — and names the two delays and the
45 m transport as the first questions. (2) *The questioned path.* One delay and its check are taken out and two transports cut to 10 m: saved as the before, the new figures say 12 steps, 266.5
minutes, 90 m, with what each tile moved. (3) *An ingredient.* Intake to weigh-up, nine steps, no distances yet: the steps are counted, the minutes said, and the missing distances named — nothing is filled in.

## 3. Method selection
The flow process chart is the method-study instrument that precedes and still refines the value stream map for one path (ASME Standard 101, 1947; Kanawaty (ed.), *Introduction to Work
Study*, ILO, 4th ed., 1992, ch. 8; Freivalds and Niebel, *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014): record **what happens, not what the procedure says**, class each step by
the five symbols, total by class, then question every step that is not an operation — why, where, when, who, how — and ask whether it can be eliminated, combined, rearranged or simplified
(FC-028). **Alternatives considered** (the record's *When not to use it*): the whole stream with its flows and stock → the value stream map (FC-001); a person and a machine together →
the person and machine chart (FC-025); walking distance alone → the spaghetti diagram (FC-004); the improvement step itself → ECRS (FC-028). **Unsuitable when:** parallel work (the chart follows
one thing); a chart drawn from the written procedure (the screen says to follow the product); storage required by law or the HACCP plan counted as waste to remove (the page says it is counted, not called waste).

**Established · assumed · chosen.**
- *Established:* the five symbols and their meanings (ASME 101; ILO ch. 8); the totals by class and the share of time in operations = Σ operation time ÷ Σ all time; storage by design is counted but
  not called waste, a delay is (`lean.process-flow-chart`, *Procedure and calculation*); the questioning after the chart is eliminate, combine, rearrange, simplify (`ie.ecrs`). All from knowledge, texts not re-read,
  as the record says; the figures checked against the independent case of §6.
- *Assumed:* the steps are the path as followed on the floor; a step's minutes are a time taken from the floor or the standard (one observation is indicative); a person does each transport and inspection (said in the money).
- *Chosen (Faultline's own):* **a calculator, not a new page** (`knowledge/BUILD-SHAPES.md` named the flow chart a "readings study folded into the map"; the map's steps carry a value class, not an ASME class, and
  changing the map's step shell for a tool Rowland rated *low* would risk the map — so the chart is its own record of the shared shape, and the map is untouched); **24 steps** (a food path of one thing is rarely longer; the cap
  keeps the form and the paper a page); a step **exists when its class is chosen** (minutes and metres are optional: a step with none is counted and said, never given a time); the **verdict is words, never a colour** (no
  threshold is invented for "too much waiting" — the method has none); the chart's rank of questions is the order of the chart, with the longest delay and transport named; **"operations, storage aside"** is the second share
  the record gives (27.8%), shown beside the first. Rowland has not named these.
- *Money (`knowledge/MONEY.md` §4, FC-003 — the same model as the map, FC-001):* the transports' and inspections' minutes are **labour (L)** at the line's wage with on-costs (the one cost model — offered from the line, or typed);
  the delays and storage hold product — **inventory carrying (H)**: the load's worth × the annual carrying rate × the time held ÷ the minutes in a year (`cost.inventory-carrying-cost`; the rate is typed, never filled in — the industry
  quotes 15–35% a year). Inputs, all optional: how many times a day the path is followed, the hourly cost, what a load is worth, the carrying rate. A missing one is named; nothing waits on it.

## 4. Inputs
Per step (the shape's boxes, a step appearing once the one above is classed): *what happens* (text, optional), its class (five choices, each with its meaning), *takes* (minutes, optional, ≥ 0), *moves it* (metres, optional, ≥ 0,
shown only for a transport). Then, in a fold, *In money — all optional*: how many times a day the path is followed, the cost of an hour of the person moving and checking (offered from the line), what one load is worth, the
carrying rate a year. Step 1's class is the one needed box.

## 5. Data suitability
One step is a chart; the page asks for nothing more. A step with no minutes is counted and said (*Step 3 has no time — counted, left out of the minutes*); a transport with no metres likewise; with no step timed at all no share is said.
A minute or a metre below zero is refused in words. A path of one class (all operations) is allowed and says so in its counts.

## 6. Calculations
`count[k] = number of steps of class k`; `minutes[k] = Σ timed steps of class k`; `total = Σ minutes`; `metres = Σ transports' metres`; `ops share = minutes[operation] ÷ total`; `waiting share = (minutes[delay] + minutes[storage]) ÷ total`;
`ops, storage aside = minutes[operation] ÷ (total − minutes[storage])`. Money: `people's minutes a day = (minutes[transport] + minutes[inspection]) × loads a day`; `labour a day = that ÷ 60 × the hourly cost`;
`holding a load = worth × rate% ÷ 100 × (minutes[delay] + minutes[storage]) ÷ 525,600`; `a day = × loads a day` (storage and delays shown apart).

**Independent worked cases** (`scripts/knowledge/cases-kaizen.py` sections F and F2 — plain Python, the record's tray; the unit test holds the literals):
| case | result |
|---|---|
| A — the tray, 14 steps | 4 O · 5 T · 2 I · 2 D · 1 S; 11 + 7 + 1.5 + 20 + 240 = **279.5** min; **140** m; operations 3.94%, delay + storage 93.0%, operations less storage **27.85%**; longest transport 45 m (step 6), longest delay 12 min |
| B — the questioned path | 12 steps (the first delay and its check out, two transports cut to 10 m): 266.5 min, **90** m, operations 4.13%, less storage 41.5% — saves 2 steps, 13 min, 50 m |
| C — in money (30 loads a day, £15 an hour, a £120 load, 25% a year) | people's minutes 8.5 a load, **255** a day = 4.25 h = **£63.75**; holding a load through 260 min £0.01484, **£0.4452** a day (storage £0.4110, delays £0.0342) |
| D — no time on a step, no metres on a transport | counted and said; 2 of the 3 minutes timed (40% operations of 5 min) |

**Sentences** (the module's `calc/defs/process-flow`; the page, the paper and the acceptance script read these): the path — "*14 steps: 4 change the product, 5 move it, 2 check it, 2 delay it and 1 stores it. It takes 279.5 min; 3.9% of that is
operations and 93% is waiting (delays and storage) — leaving the 240 minutes of storage by design aside, operations are 27.8% of the rest. It travels 140 m.*"; the questions — "*The longest delay is “Waiting for the oven” — 12 min; the longest
transport is “To the chiller” — 45 m.*" and "*Ask of every transport, inspection and delay: why is it there, where, when, who and how — then eliminate it, combine it, rearrange it or simplify it (FC-028).*"; the money — "*8.5 min of a person’s time
on the moves and checks a load × 30 loads a day = 255 min — £63.75 labour a day at £15.00 an hour. Holding a load worth £120.00 through 260 min of delay and storage costs about £0.01 at 25% a year — £0.45 a day, £0.41 of it the storage by design
and £0.03 the delays.*"

## 7. Outputs
On screen (the shape's lean page): the band, five tiles (Steps · Time in operations · Waiting · Travelled · Labour a day) each with what moved since the saved before, the sentence and what else it says, the checks, **the chart** (the five symbols down the
page, joined, each with its words, minutes and metres), how it is worked out, the money or the sentence saying what to add, and what it does not say. Only an abnormal number wears colour: here none does — the shares are said in words and
the verdict is neutral.
**The report.** The shape's calculation paper, from the same result: the band with the verdict, the tiles with what moved, *What it says*, what else it says and the checks, **the chart drawn on the page** (the symbols, the words, the minutes and the metres of every step, a
row as tall as its words), the figures put in with where each came from, how it is worked out, the money or what to add, the before → after and what does not claim. It reads the same module as the screen; nothing missing is made up.

## 8. Manufacturing usability
Start from the Kaizen event's *Observe* row or the Calculators hub, name the path, then type a step at a time: a class (one tap), a few minutes, a few metres — the answer and the chart redraw as each step goes in. On the phone the form is one column and the chart
scales inside its box with its text readable. A path of fourteen steps is about forty taps and some typing; the saved before makes the questioned chart a before → after in one more tap.

## 9. Failure handling
No step classed: *Choose “Step 1 is a”.* A minus time or distance: refused in words. A step with no time or a transport with no distance: a warning beside a standing answer. A client reads the chart and the paper and changes nothing. A record whose calculator is not in this
build keeps its figures. Nothing is made up: a path with no times says no share can be said.

## 10. Integration
**Record:** a `ToolStudy` of tool `calc` with `agreed.calc = { key: 'process-flow', inputs, before? }` (the shape's; no migration, no mapper change, `sync-schema.test.ts` unchanged). **Where it shows (CLAUDE.md rule 5):** the Calculators hub and its list,
a line's Tools (one *Calculators* row) and the line report, a project's Tools, and the Kaizen event's *Observe* row for FC-003 (a method row opens `/calc/process-flow` and starts one there — `project/method/methodTools`). The waste walk (FC-005) points
transport and waiting at it. `docs/PAGES.md`: the chart is on the calculation's page. Access `useAccess` as every calculator: `can.edit` types, `can.remove` deletes, a client reads.

## 11. Verification
Unit: `src/tools/flow/__tests__/processFlow.test.ts` (cases A–D, the symbols), `src/tools/calc/__tests__/calc.test.ts` (the three worked examples of the definition and its two refusals, table-driven). Acceptance: `scripts/acceptance/process-flow.mjs` and
`scripts/acceptance/calc-shape.mjs` (table-driven over every definition).

**Acceptance criteria.**
1. Counts, minutes, metres and the three shares of the record's tray equal the independent case A; the questioned path equals case B — *proved by* `processFlow.test.ts` (`the tray…`) and the definition's examples in `calc.test.ts`.
2. A step with no time and a transport with no distance are counted, named and never given a figure — `processFlow.test.ts` (`what the chart will not make up`) and `process-flow.mjs` step 3.
3. Labour and holding equal case C; every money input optional, a missing one named — `processFlow.test.ts` (`the money`) and `process-flow.mjs` step 2.
4. The tray typed through the real boxes, step by step, gives the sentence, tiles and money of case A on the page — `process-flow.mjs` step 1 (and `calc-shape.mjs` step *b* for the examples).
5. The chart is drawn: one row for each of the 14 steps with the symbol of its class (O T I D S in the order typed), its words, minutes and metres; nothing off the box on a phone; the symbols distinct by shape — `process-flow.mjs` steps 1 and 5.
6. The paper, downloaded and read back, carries the sentence, the chart's every step with its words and symbol letter, the money and what does not claim — `process-flow.mjs` step 4.
7. Saved as the before then questioned, each tile says what moved (steps fewer, minutes less, metres less) — `process-flow.mjs` step 3.
8. Opening FC-003 from a Kaizen event's *Observe* row opens `/calc/process-flow` and *New* starts one in the project — `process-flow.mjs` step 6 and `methodTools.test.ts`.
9. The phone (390): nothing off the side, the boxes thumb-sized, the chart inside — `process-flow.mjs` step 5.
10. Existing behaviour unchanged: the other calculators, the shape's tests and acceptance, the catalogue and registry tests.
Not yet proved: the full gate and the paper-parity comparison (the lead runs them after merging).

## 12. Maintainability
`src/tools/calc/defs/process-flow.ts` (the definition and its sentences), `src/tools/flow/processFlow.ts` (the figures and the money, pure), `symbols.ts` (the five shapes, one geometry for screen and paper), `src/tools/calc/CalcChart.tsx` +
`calcChart.css` (the chart on screen) and `chartBlock` in `src/lib/report/calcPaper.ts` (on paper) — the shape gained one optional `chart` beside its `picture`, so another path-shaped tool needs no new screen. Left for later, each with its number:
a man-type chart (what a person does — FC-025's neighbour), the steps carried in from the value stream map (FC-001), a present and a proposed chart drawn side by side, and the steps' times fed back into the map's step times.
