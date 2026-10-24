# FC-154 — money on the problems register: what a problem costs the line while it is open

**Catalogue:** FC-154 Problems register — priority, journey, where it sits
(the money part; the register, its editor, its cards and reports are built
and unchanged). **Knowledge:** `knowledge/methods/visual/action-tracking.md`
(the register), `knowledge/methods/cost/line-cost-model.md` (the one cost
model), `knowledge/methods/equipment/time-model-losses.md` (lost time in two
parts), `knowledge/MONEY.md` §4 (FC-154: causations **L** and **T**; **M**
and **H** left for a later part). **Asked for:** Rowland, 17 October —
*"everything must derive a cost in the entire app"*; `docs/BLUEPRINT.md` §6
— "the problems register (a problem's open cost)"; 24 October — the rule for
every tool. **Status:** specified and built 24 October under the 24 October
rule; the one new question (the minutes a day) is asked, never assumed.
Part 2 (the rejects it causes, M; the product it holds, H) specified and
built the same day, below.

## 1. Purpose
The register says what is open, how urgent, whose and by when; it has never
said what a problem is costing while it waits. Most floor problems cost the
line time — a stop every hour, a slow running, a workaround that takes a
person — and the line's own cost model already prices time: labour for the
minutes, and packs and contribution where the line stops. So a problem
takes one more fact, *how many minutes a day it costs the line*, and the
register says, on the row, in the editor, on the card, on the report and in
its closing line: *"20 min a day at the Bagger, the bottleneck: £25 labour ·
2,000 packs lost · £80 contribution a day"* — and, over the register, *"the
3 open problems that say their minutes cost the line £38 labour and £80
contribution a day"*. The sentence it lets one side say to the other: this
problem is worth fixing before that one, in pounds.

**Scope.** What a problem costs, on the register's own problems (a `Snag`
on a line): three typed numbers, each optional — the minutes a day it costs
the line (part 1, said in money by the line's cost model in the loss count's
two parts), the rejects a day it causes (part 2, M — at the line's materials
a pack), and the packs it holds (part 2, H — the money tied up in them at
their materials, said as tied up, never as a daily loss); summed over the
open ones that say any of them in the closing line; on the row, the editor,
the card and the report. Left out, each its own part or entry: a project's
own problems (`TestItem`, a different record on the job's board); a
problem's cost over its age (minutes × days open — a figure that invites a
guess at the start day); money in the priority (RAG stays Rowland's words,
the cost sits beside it); a carrying cost on the held product (the carrying
rate is the business's own — asked on the value stream map, FC-001 — and a
problem is not the place to ask it again); rework (a reject reworked costs
one rework, typed on the capability study where the fates are counted,
FC-094 — the register counts rejects thrown away).

## 2. Users and scenarios
The team leader writing a problem on the phone and adding "about 20 minutes
a shift"; the morning meeting reading the register's closing line; Rowland
choosing which of fourteen open problems to put an engineer on. Food first:
a guard switch that drops the bagger out twice a shift; a former that needs
hand-feeding when film wanders; a checkweigher that rejects good packs
until somebody re-zeroes it.

## 3. Method selection
The loss count's time model (`docs/CAPACITY.md` §5–6; `lib/lineLoss`): lost
time costs the crew's labour wherever it is, and lost output only where it
stops the line — its bottleneck, the whole line, or no machine named — the
bottleneck being Line capacity's (`neckOf`). Throughput accounting's rule
(Goldratt) keeps contribution, not allocated cost, as the value of a pack.
No new causation: the minutes typed on the problem go through exactly the
arithmetic a stop's minutes go through on the loss count.

**Established · assumed · chosen.**
- *Established:* labour £ a day = minutes ÷ 60 × crew × wage × on-costs
  (`lib/cost` labourPerHour); packs lost a day = minutes × the line's rated
  packs a minute, only where it stops the line (`lib/lineLoss` stopsTheLine);
  contribution lost = packs × contribution a pack (price − materials, else
  the margin — `tools/losses` contributionOf). The two parts are never
  blended (Rowland, 14 October).
- *Established:* the bottleneck is the station Line capacity names for a
  product on the line; with none counted it is not known, every problem is
  counted as stopping the line, and the sentence says so (as the loss
  count's `packsHow` does).
- *Assumption:* the minutes typed are a day's average while the problem is
  open; said as "a day", never multiplied by the days open.
- *Chosen (24 October rule):* the minutes are optional — a problem with none
  says nothing about money and loses nothing else; the wage, speed and
  margin are the line's, each named when missing and the rest still said.
- *Chosen:* the cost is said beside the priority and never changes it or
  the register's order (Rowland's RAG, 12 October).
- *Chosen:* one module, `lib/problemCost`, read by the row, the editor, the
  card, the report and the closing line through the register's reading
  (`lib/snagsReport` SnagRow.cost, SnagsReading.cost).
- *Established (part 2):* a pack thrown away costs its materials
  (`knowledge/methods/cost/line-cost-model.md`; the capability study's
  reject fates price waste at the pack's materials, FC-094 — the same
  figure, the same word); product on hold is money tied up — pieces × what
  each has cost so far, at least its materials
  (`knowledge/methods/cost/inventory-carrying-cost.md`: "tied up is working
  capital, not a daily loss; only the carrying cost is") — so the register
  says *tied up*, and that it is not lost unless the product goes out of
  life, and prices no carrying (the rate is asked on the map, not here).
- *Chosen (part 2):* the materials a pack is the line's typical figure,
  typed once in *Set up the line* beside the margin a pack
  (`Workspace.materialsPerPack`) — the one cost model gains one input,
  `knowledge/MONEY.md` §3; a product's own figure stays on its capability
  study, and when a product record carries it (FC-156) the line's is the
  fallback. Missing, it is named like the wage: "give the line a pack's
  materials (Set up the line)".
- *Chosen (part 2):* the rejects are a day's count, like the minutes; the
  held packs a count now (not a day — a hold is a stock, not a flow).

## 4. Inputs
One new, on the problem (`Snag.minutesPerDay`, 0–1440, optional —
`supabase/PROBLEM_COST.sql`, applied 24 October and read back): **How many
minutes a day it costs the line** — a stop, slow running, a workaround —
typed in its editor. Part 2 adds two more on the problem, each optional
(`Snag.rejectsPerDay` ≥ 0, `Snag.heldPacks` ≥ 0 — `supabase/PROBLEM_REJECTS.sql`,
applied 24 October and read back): **Rejects a day because of it** (packs
thrown away) and **Packs on hold because of it**; and one on the line
(`Workspace.materialsPerPack` ≥ 0, the same file): **£ a pack's materials**,
typed in *Set up the line* beside the margin a pack. Read: the problem's machine (the walk's frame, else the
one named); the line's crew, wage, on-costs, rated speed, margin (`Workspace`,
*Set up the line*); the line's standards for its bottleneck. Access and
sync unchanged: the field is one nullable column on `snags`, in the mapper
both ways and in the schema test through the migration file.

## 5. Data suitability
Said from the first minute typed. A number over a day (1,440) is refused by
the box and the database alike. No minutes → no money and no ask on the row
(the editor's box is the ask).

## 6. Calculations
Symbols: m minutes a day; c crew, w wage, b on-costs (1 when unset);
v rated packs a minute; k contribution a pack; S = 1 where the problem
stops the line (its machine the bottleneck, the whole line, none named, or
the bottleneck unknown), else 0.
- Labour a day L = m ÷ 60 × c × w × b.
- Packs lost a day P = S × m × v; contribution lost C = P × k.
- The register: over open problems with m typed, ΣL, ΣC, ΣP; the count that
  say it and the count open.
- Missing: no c·w → L absent, the wage asked; S = 1 and no v → P absent, the
  speed asked; P known and no k → C absent, the margin asked.
- Formatting: `fmtGBP` (whole pounds), `fmtPacks`; minutes to one decimal
  under 10.
- Part 2 — r rejects a day, h packs held, u materials a pack: materials a
  day M = r × u; tied up H = h × u. The register: ΣM over open problems
  saying rejects, ΣH over open problems saying held packs. Missing u → M and
  H absent, the materials asked (once, however many of the two are typed).
  A problem saying none of m, r, h says nothing about money; one saying any
  of them says that part, and the sentence's parts are joined "; " in the
  order minutes · rejects · held, each only when typed.

**Independent cases** (`scripts/knowledge/independent-cases.py`, "what a
problem costs the line"; `src/lib/__tests__/problemCost.test.ts`), on a line
with crew 4, £14.50 × 1.3, 100 packs a minute, 4p a pack, bottleneck the
Bagger:
1. 20 min a day at the Bagger → £25.13 labour, 2,000 packs, £80
   contribution; "20 min a day at Bagger, the bottleneck: £25 labour · 2,000
   packs lost · £80 contribution a day."
2. 20 min at the Former (not the bottleneck) → £25.13 labour, no packs;
   "— not the bottleneck, so the line runs round it".
3. The bottleneck not known → counted as stopping the line, said so.
4. 7.5 min on no machine → £9.43, 750 packs, £30.
5. No wage → the wage asked, nothing in money. 6. A wage but no speed → the
   labour said, the speed asked; a speed but no margin → the packs said,
   the margin asked. 7. No minutes → nothing. 8. The register: 20 at the
   Bagger + 10 at the Former, open; one open with no minutes; one closed →
   £37.70 labour, £80 contribution, 2,000 packs, "2 say … 1 more say no
   minutes yet".
Part 2, the line's materials 12p a pack:
9. 300 rejects a day → £36 materials a day; "300 rejects a day: £36
   materials" — with no minutes typed, the whole sentence is that and the
   short form "£36 materials a day".
10. 1,200 packs on hold → £144 tied up; "1,200 packs on hold: £144 tied up
   (not lost unless they go out of life)".
11. 20 min at the Bagger + 300 rejects + 1,200 held → case 1's sentence,
   then "; 300 rejects a day: £36 materials; 1,200 packs on hold: £144 tied
   up (not lost unless they go out of life)."
12. No materials on the line → "300 rejects a day and 1,200 packs on hold —
   give the line a pack’s materials (Set up the line) to say them in
   money"; the minutes' part unchanged beside it.
13. The register: case 11 open + 300 rejects only open + one closed with
   rejects → labour and contribution as case 8's first row, £72 materials
   a day, £144 held; the closing line says all three.

## 7. Outputs
On the register: the cost's short form on the row's second line ("£25
labour · 2,000 packs lost · £80 contribution a day"); in the editor a box
*MINUTES A DAY IT COSTS THE LINE* with the whole sentence beneath it
(`.pe-cost`); the closing line carries the register's sum after the worst
problem. On paper: the Problems report prints the sentence under each
problem's plan; the problem's card prints it under what we will do.

**The report.** `lib/snagsReportPdf` (the Problems report and every group's)
gains one line a problem, the sentence, after *Plan:*; `lib/snagCardPdf`
gains one line under the plan; the register's closing line on paper carries
the sum as the page does. Nothing else on paper changes; the papers of
problems with no minutes are as before. Part 2 changes no paper code: the
sentence a problem prints is the module's whole sentence, so a problem's
rejects and held product reach the report, the card and the closing line
through the same lines; a problem typing none of the three prints as before.

## 8. Manufacturing usability
One number typed on the phone, in the editor where the problem is worked;
the words beneath it say at once what it means and what the line still
needs to say it fully; nothing else on the row changes.

## 9. Failure handling
A line record not found reads as a line with no wage (the ask); a machine
named that no standard knows is a machine not the bottleneck; a problem on
"Not on a line" says the wage ask.

## 10. Integration
Reads: `Snag`, `Workspace`, the line's `Standard`s (for the bottleneck).
Writes: `Snag.minutesPerDay`. Shows: the register (row, editor, closing
line), the Problems report, the problem cards, the group reports. Replaces
nothing. The project's Actions and a line's page read the register's rows
and may carry the short form later (not in this slice).

## 11. Verification
Unit tests on the eight cases; the acceptance script drives the register in
Chromium on the seeded line and reads the report and the card back.

**Acceptance criteria.** In `scripts/acceptance/snags.mjs`, story 19:
1. A problem opened, 20 typed in *Minutes a day it costs the line*: the box
   kept on the record; the sentence under it equals the module's for the
   record, its line and its bottleneck; with no wage on the line it names
   the wage.
2. The line given crew 4, £14.50 × 1.3, 100 a minute and 4p a pack: the
   sentence says the labour, the packs and the contribution; the row's
   second line carries the short form; the closing line carries the sum —
   without a reload.
3. The Problems report's text carries the sentence; the problem's card too.
4. On a phone the box and the sentence are visible in the editor.
5. No console errors. The line is put back as it was.
Part 2, story 20 of the same script:
6. 300 typed in *Rejects a day because of it* and 1,200 in *Packs on hold
   because of it* on a problem with its minutes, the line without materials:
   both kept on the record; the sentence under the boxes equals the module's
   and names the pack's materials once, the minutes' part unchanged.
7. The line given 12p a pack's materials (the record, as story 19 gives the
   wage — the box in *Set up the line* writes the same field): the sentence
   says the materials a day and the money tied up, the row's short form
   carries them, the closing line carries the register's materials a day
   and the product held — without a reload.
8. The Problems report's text and the problem's card carry the sentence.
9. On a phone the two boxes are visible in the editor.
10. No console errors. The line is put back as it was.
Proved by: `node scripts/acceptance/snags.mjs` (in the gate), `npx vitest run
src/lib/__tests__/problemCost.test.ts`, the sync schema test.

## 12. Maintainability
One module, `src/lib/problemCost.ts` (`problemCost`, `registerCost`), read
through `lib/snagsReport`; the arithmetic is `lib/cost`, `lib/lineLoss` and
`tools/losses` contributionOf, so a change to the cost model changes the
register with the loss count. `knowledge/MONEY.md` §4 FC-154 says built for
L, T, M and H (M and H at the line's materials a pack, H as tied up); the
catalogue entry names the spec, the module and the tests.
