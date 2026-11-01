# FC-005 — Waste walk: the eight wastes seen, classed and costed: the specification

**Catalogue:** FC-005 (a mode of FC-081, the filmed walk and its problems; it rests on FC-154, the problems register and its cost) ·
**Knowledge:** `lean.seven-wastes` (full, textbook), with `visual.gemba-walk` beside it · **Asked for:** Rowland, 1 November 2026 —
*"I want all tools made that get used in the projects"*; the Kaizen event's *Observe* section lists it, and `docs/METHODS.md` §11 marks it
"part-built — finish" · **Status:** draft, built on `m6-other` (1 November)

## 1. Purpose
A walk finds things that are wrong; this names what kind of wrong each is, puts it where it is, and says what it costs — so a list of
"things seen" becomes a ranked list of wastes, each with its money, each pointing at the tool that measures it. Before this the filmed walk
and the register recorded the problem, its photo, its machine and (since FC-154) its minutes, rejects and packs held, but never *which waste* it
was: a team could not say "most of what we lost this week was waiting". The sentence it lets one side say to the other — the lead to the
manager, the Kaizen team to its sponsor: **"7 open problems classed as waste. The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k
contribution a day, most of it at the Packer."**

**Scope.** What this build covers: (1) a **class on a problem** — one of Ohno's seven wastes and Liker's eighth (transport, inventory, motion,
waiting, over-production, over-processing, defects, unused talent), or *Not a waste*, picked in the problem's own editor, kept on the problem
(`Snag.waste`, kept on the device and carried to the cloud inside the row's existing `linked_obs_ids` list as one `waste:<kind>` entry — no column, no migration); (2) the **walk** over any set of problems the Problems page already shows (a line, a
project, a person): the open ones classed as waste, by kind and by place, **ranked by what is lost a day** and, after it, by money tied up;
each kind's money in its **own parts** (labour, packs lost, contribution, materials, product tied up) read from the problem's cost
(`lib/problemCost`, FC-154) — never blended into one figure; the machines each kind is on and the places ranked; the last four weeks (raised,
put right, still open); where the biggest points (the catalogue's tools, with which are not built said); (3) where it shows: Problems ›
**By waste** (the panel and the problems grouped by kind), the problem's row and editor, the **Problems report** (a block, *The eight wastes
seen*) and the problem's report card. What it deliberately does not cover: **sizing a waste in its own unit** beyond the three sizes a problem
already has (minutes a day, rejects a day, packs on hold) — a *metres walked* or *kilos of film* is the Spaghetti diagram's (FC-004) or a
calculator's; **the walk as a dated event** with a purpose and a route (nothing stores one — the gemba walk's, FC-200 stays not built); **a
class chosen at the moment of capture** on the Problem button's sheet (the class is picked when the problem is looked at); a **trend by walk**
(the last four weeks stand for it); **photographs of a waste classed in bulk** (Tick several › class — not built); any AI naming the waste from
a picture (docs/DIRECTION.md: the camera's AI names work in the video study only). Money for *unused talent* is none of its own: if minutes are
typed, they are labour like any other; the industry has no cost causation for it (`knowledge/MONEY.md` §4, FC-005, lists the other seven).

## 2. Users and scenarios
**Who:** the Kaizen team lead in *Observe*; the line lead at the Monday meeting; the ops manager asking where the loss is. At a desk and on a
phone beside the line.

**Scenarios, food first.** (1) *A packing hall walk.* The team walks Line 3 and records, as problems on their machines, pallets waiting for QA
release (360 min a day at the Packer), film walked from the store (48 min at the Labeller), a double label check (30 min), light packs reworked (300 a day), packs held warm
(36,000) and short-life product dumped (80 a day). Each is classed. *By waste* ranks Waiting first, £600 labour and £7.9k contribution a day —
"the release process, not the packers, is the first problem" — and says it points to the Stops Pareto and Andon calls. (2) *The week after.*
Three are put right; the panel says "Last 4 weeks: 7 wastes raised, 3 put right, 4 still open". (3) *A line with no wage typed.* The rows say
the minutes and ask for the wage — nothing blocks.

## 3. Method selection
Ohno's seven wastes (1988) and Liker's eighth (2004), used as eyes on a walk: name the waste, place it, size it, cost it, rank it by cost,
carry the top ones to causes and to the tool its class names (`lean.seven-wastes`). **Alternatives considered** (the record's *When not to
use it*): the whole stream's flow and stock → the value stream map (FC-001); the cause of one waste → the 6M fishbone; the crew's day in shares →
work sampling (FC-022). **Unsuitable when:** the list has no cost and no owner (the record: "changes nothing") — so every class is on a problem
that already has an owner, a day and, when typed, a size; a waste that names a person ends the walks — the page says *waste is in the process,
not the person*; storage and inspection that the law or the HACCP plan requires are not waste to remove (said).

**Established · assumed · chosen.**
- *Established:* the eight classes and their usual cause and tool (Ohno 1988; Liker 2004 — from knowledge, texts not re-read, as the record
  says); costed by the one cost model: time wastes by the crew's labour, lost output only where the waste stops the line (Goldratt's throughput
  accounting, `knowledge/MONEY.md` rule 3), rejects at the pack's materials, product held as money tied up and not a daily loss
  (`cost.inventory-carrying-cost`); never one blended figure.
- *Assumed:* that a person classing a problem knows the kind, and that the size typed is an estimate — said (*estimates from a walk are
  indicative; measure the big ones with the tool the waste points to*). A problem is counted once, in the one class it was given.
- *Chosen (Faultline's own):* **the class lives on the problem** (no new record — `docs/BLUEPRINT.md` §2 unchanged; BUILD-SHAPES: "add a waste
  class … to a problem row … No new record"); **Not a waste** is an answer of its own, told apart from *not classed yet* (so a hazard raised on
  the walk is not nagged as unclassed); **the rank** is what is lost a day (labour + contribution + materials, used only to order, never said as
  one figure), then product tied up, then minutes, then count, then the eight's own order; **the window** for "the last weeks" is 28 days (the line
  page's own, `tools/gemba` FOUND_DAYS); **the pointers** are the tools named in the record's *Purpose and principle*, each checked against the
  catalogue — transport → process flow chart, spaghetti diagram; inventory → kanban sizing, Little's law; motion → spaghetti, work sampling; waiting →
  stops Pareto, Andon calls; over-production → heijunka box (FC-011, not built, said so); over-processing → line standard, standard work
  combination table; defects → defect Pareto, capability; unused talent → Improvement Kata (FC-017, not built). Rowland has not named these.
- *Money (`knowledge/MONEY.md` §4, FC-005):* waiting, motion, transport, over-processing — labour (L) for the minutes, and packs and
  contribution (T) where the problem is at the bottleneck or stops the line; defects and over-production — the rejects at the pack's materials
  (M); inventory — the packs held at their materials, tied up (H). Inputs: the line's wage, speed, margin and a pack's materials (Set up the
  line) — all optional, each missing one named in the row's sentence, nothing withheld.

## 4. Inputs
Nothing new is typed except the class. A problem's machine, minutes a day, rejects a day, packs on hold and status are the problem's. The class:
eight chips and *Not a waste*, optional, no default. The walk reads the rows the Problems page shows after its line, project, person and word
filters (status chips do not narrow the walk: put-right ones are counted as such).

## 5. Data suitability
No minimum — one classed problem is a walk. A kind seen with no size says *not sized yet — say the minutes, the rejects or the packs on hold
on each* and is ranked last of the costed; a mixed kind says how many are unsized. A problem put right leaves the money and is counted as put
right. Nothing classed says so and tells the person how to class. A class on a problem that is not a Snag (a project's own problem, a 6M
problem) is not offered: they are other records.

## 6. Calculations
For each kind K over its **open** problems: `labour = Σ minutes ÷ 60 × crew × wage × on-costs`; `packs = Σ minutes × rated speed` and
`contribution = packs × margin` only for a problem at the bottleneck or on no machine (or any machine while the bottleneck is not known — said);
`materials = Σ rejects × pack materials`; `tiedUp = Σ held × pack materials` (all `lib/problemCost`, FC-154). `flow = labour + contribution +
materials` (to order only). Rank: `flow` desc, `tiedUp` desc, `minutes` desc, open count desc, the eight's order. Places: the same sums by
machine. The last four weeks: classed problems with `today − raisedAt < 28 days`: raised, of them put right, of them open.

**Independent worked cases** (`scripts/knowledge/cases-kaizen.py`, section W — plain Python, from the record's packing line; the unit test holds the literals):
crew 4 at £25 an hour (£1.6667 a minute), 110 packs a minute, 20p margin, 50p materials a pack, the Packer the bottleneck.

| kind | machine | size a day | labour | packs lost | contribution | materials | tied up |
|---|---|---|---|---|---|---|---|
| waiting | Packer | 360 min | £600 | 39,600 | £7,920 | — | — |
| transport | Labeller | 48 min | £80 | — | — | — | — |
| motion | Labeller | 20 min | £33.33 | — | — | — | — |
| over-processing | Labeller | 30 min | £50 | — | — | — | — |
| defects | Sealer | 300 rejects | — | — | — | £150 | — |
| inventory | Chiller | 36,000 held | — | — | — | — | £18,000 |
| over-production | Wrapper | 80 rejects (400 a week ÷ 5) | — | — | — | £40 | — |

Rank: waiting (£8,520), defects (£150), transport (£80), over-processing (£50), over-production (£40), motion (£33.33), inventory (£0 a day, £18,000
tied up). Places by £ a day: Packer £8,520, Labeller £163.33, Sealer £150, Wrapper £40, Chiller £0. (The record's own figures — "360 minutes … is
£600 a day of labour, and at the bottleneck 360 × 110 = 39,600 packs" — are the first row.)

**Sentences** (the module's `tools/waste/waste`; the page, the paper and the acceptance script read these): the walk — "*7 open problems classed as waste (2 more not yet
classed). The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k contribution a day, most of it at Packer.*"; a kind — "*Waiting — 1
problem open: £600 labour · 39,600 packs lost · £7.9k contribution a day.*" (or "*2 problems open, 1 put right: …; 1 of them not sized yet.*");
places — "*Where: Packer (1 problem, £8.5k a day), Labeller (3 problems, £163 a day), Sealer (1 problem, £150 a day) and 2 more places.*"; the weeks —
"*Last 4 weeks: 7 wastes raised, 0 put right, 7 still open.*"; the pointer — "*Waiting points to Stops Pareto (FC-052) and Andon calls (FC-015).*"

## 7. Outputs
**On screen:** Problems › *By waste* shows the panel (the sentence, a row a kind seen, where, the last four weeks, where it points, and what it does not
claim) above the problems grouped by kind in the same order; the problem's row names its class; its editor has the chips with the kind's meaning, an example, the
box that sizes it and its pointer. Only the abnormal wears colour — nothing in the panel wears a state colour; the words carry it.
**The report.** The **Problems report** carries *The eight wastes seen* after its tiles and sentence, when any problem is classed: the walk's
sentence, a line a kind with its money, where, the last four weeks, the pointer and the two cautions; each problem's row on paper names its class;
the **report card** of a problem says `Waste: <kind>.` before its cost. Light page, the lean page's order (the tiles, where we are, then why —
the walk — then the problems). It reads the same module as the screen; nothing missing is made up — a missing wage, speed, margin or materials
is named in the kind's own sentence.

## 8. Manufacturing usability
One tap to the editor's chips on a problem the team is looking at; one tap to *By waste*. On the phone the chips are 48 px and wrap, the panel is
one column. Nothing is added to the rail, the tabs or the menu.

## 9. Failure handling
A client or a person who cannot edit the project's problems does not change a class (the editor is the register's own access). There is no
column: the class rides in `linked_obs_ids` (1 November — the connector was down and a migration was to be avoided), so a classed problem syncs
like any other; the mapper adds the entry going up and takes it out coming down, so the problem's links never show it. A class from a newer app that this build
does not know is not believed (read as not classed). Nothing classed, nothing sized, no wage: each said in words.

## 10. Integration
**Record:** `Snag.waste` (the eight and `'none'`); the mapper puts it in `linked_obs_ids` as `waste:<kind>` only when set and reads only the nine
words; no migration (`supabase/PROBLEM_WASTE.sql` was withdrawn). **Where it shows (CLAUDE.md rule 5):** the Problems page (every scope it is drawn in: the factory, a line's Problems tab,
a project's), the problem's row and editor, the Problems report and the problem cards, and — because it is a problem of the line — everywhere the
problem already shows. The Kaizen event's *Observe* row for FC-005 opens the Problems register (it is a mode of FC-081). `docs/PAGES.md` has the
page's new lines. Not on the line's one-page report or the combined report (they carry the problems tile and the closing line already; the
walk is the Problems report's).

## 11. Verification
Unit: `src/tools/waste/__tests__/waste.test.ts` on the worked case above (every figure, the rank, the places, the sentences, the pointers against
the catalogue, put-right and window edges, unclassed and not-a-waste, unsized and no-wage). Acceptance: `scripts/acceptance/waste-walk.mjs`.

**Acceptance criteria.**
1. Each kind's labour, packs, contribution, materials and tied-up equal the independent table; the rank is waiting, defects, transport,
   over-processing, over-production, motion, inventory; the places are Packer, Labeller, Sealer, Wrapper, Chiller — *proved by* `waste.test.ts`
   (`prices each waste…`, `ranks by what is lost a day…`, `ranks the places…`) and read back from the page by `waste-walk.mjs` steps 0–1.
2. The sentences are exactly the words in §6 — *proved by* `waste.test.ts` (`says the walk in the module’s words`, `says where…`) and by
   `waste-walk.mjs` step 1 against the independent literals and the module's own.
3. A put-right waste leaves the money and is counted as put right; 27 days is inside the four weeks and 28 is out; an unclassed problem is
   counted apart and a *Not a waste* is neither — *proved by* `waste.test.ts` and `waste-walk.mjs` step 3.
4. Every pointer is a catalogue entry; an unbuilt one is said not built — `waste.test.ts` (`points each kind…`), `waste-walk.mjs` step 1.
5. A missing size or missing wage is named and nothing is withheld — `waste.test.ts` (`a waste with no size…`, `says a mix…`).
6. The eight chips and *Not a waste* in the editor, the kind's meaning/example/size/pointer, kept after a reload, the row naming the class, the
   walk moving without a reload — `waste-walk.mjs` step 3.
7. The problems grouped by kind in the walk's order, the unclassed last — `waste-walk.mjs` step 2.
8. The Problems report, downloaded and read back, carries *The eight wastes seen* with the sentences, each row's class, and the cautions; the
   report card says `Waste: Waiting.` with its cost — `waste-walk.mjs` step 4.
9. The cloud row carries the class only when set and reads only the nine words — `waste-walk.mjs` step 5 and `sync-schema.test.ts`.
10. The phone (390): the walk, the editor and its chips (48 px) with nothing off the side — `waste-walk.mjs` step 6.
11. Existing behaviour unchanged: By line and By who as before; the Problems page's older steps in `snags.mjs`; the catalogue and registry tests.
Not yet proved: the full gate and the paper-parity comparison (the lead runs them after merging); the migration applied to the live database.

## 12. Maintainability
`src/tools/waste/waste.ts` (pure), `WastePanel.tsx` (the panel and the chips), `waste.css`; the wiring is `snag/QuickSnagsScreen.tsx` (group,
panel, chips, row, card), `lib/snagsReport.ts` (row and reading), `lib/snagsReportPdf.ts` (the block), `snag/types.ts` and `cloud/mappers.ts`
(the column). Left for later, each with its number: the class at capture (the Problem sheet) and in bulk (the ticked bar); a waste's own unit
(FC-004 metres walked, FC-003 steps and distance); the walk as a dated event with a purpose and a route (FC-200); the trend walk after walk as
a chart; FC-011 heijunka and FC-017 Improvement Kata, which two classes point to and which are not built.
