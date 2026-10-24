# FC-006 — money on the line standard: what the people placed cost

**Catalogue:** FC-006 Line standard — who stands where, product by product
(the money part; its board, Who does what and card are built and unchanged).
**Knowledge:** `knowledge/methods/lean/standard-work.md` (full, textbook),
`knowledge/methods/cost/line-cost-model.md` (the one cost model),
`knowledge/MONEY.md` §4 (FC-006: causation **L**, labour at the line's rate;
**T** where the bottleneck person is known is Line capacity's and not
repeated here). **Asked for:** Rowland, 17 October — *"this is the cost per
pack because of X, including with the people"*; `docs/BLUEPRINT.md` §6 *Money
in every tool* — "the line standard map (what the people placed cost a
pack)"; 24 October — the rule for every tool ("the cost is merely one of the
outputs ... don't block anything"). **Status:** specified and built 24
October, under the 24 October rule; no decision of Rowland's outstanding (the
inputs are the line's, already asked on *Set up the line*).

## 1. Purpose
The line standard says who stands where on a product. Headcount is counted
off the people on the map, never typed (its own rule since it was built);
what those people cost is the one figure the map has never said, though the
line already knows a person's rate and its speed. This says it, in one
sentence on the map's page and one line on its card: *"12 people placed:
£226 an hour at the line's rate — 3.8p a pack at 100 packs a minute (the
line's rated speed)."* So the team can say to the sponsor what this way of
crewing the product costs, and compare two products' standards, or a
standard before and after a person is taken off, in pounds as well as heads.

**Scope.** One causation — **L**, labour at the line's rate — on the map's
page, on its card (and so on every paper the card is drawn into: the
standards' PDF, Line capacity's "all shown", All together), read from one
module. The people are the map's headcount (or, where the product's Line
capacity has typed its own people, those — said so, as Line capacity says
them); the rate is Line capacity's typed rate, else the line's wage × its
on-costs; the speed is Line capacity's good output in its unit where the
product has one, else the line's rated packs a minute. Left out, each its
own entry or already built elsewhere: what the bottleneck person costs a
pack and a minute (FC-188, on Line capacity, where the stations are); walking
(FC-004); a shift and a week (the card says the shift's output already; the
labour a shift follows when the line's shift hours are read in one place —
SMED asks them today). No new input is asked on the standard: every input
is the line's or Line capacity's and is typed where it already is.

## 2. Users and scenarios
The team leader setting the product's crew on the board; the shift manager
comparing the 12-person and the 10-person standard for the same product;
Rowland showing a sponsor what a product costs to crew. Food first: a
packing line crewed differently for a 1 kg bag and a 2 kg bag; a line with
no Line capacity yet, whose rated speed is on *Set up the line*.

## 3. Method selection
Direct labour at a rate is standard costing's oldest line and lean
accounting's first: the people on the stream × what one costs an hour is the
stream's labour, and a pack's labour is that over the packs an hour
(`cost.line-cost-model`; `knowledge/MONEY.md` §2 L — Maskell & Baggaley 2004;
value stream costing). No allocation, no overhead, no blending with lost
output: the labour figure stands alone, and where the line is held back by
a station that is Line capacity's finding (T), already said on its own page
and card (`bottleneckCost`).

**Established · assumed · chosen.**
- *Established:* labour £ an hour = people × one person's rate (wage ×
  on-costs — `lib/cost` burdenOf); labour a pack = £ an hour ÷ packs an hour
  (`capacity.ts` labourCost, the same arithmetic Line capacity shows).
- *Established:* a person's rate is the line's wage × its on-costs ratio
  (employer's NI, pension, holiday cover — the ratio typed on the line, 1
  when not given).
- *Assumption:* the packs an hour are the line's good output as Line capacity
  works it out (good out, else the line's rate) when the product has a Line
  capacity; else the line's rated speed — said which, so a rated speed is
  never mistaken for a measured one.
- *Chosen (one model):* the people and rate are `labourInputs` — typed on
  Line capacity, else the map's headcount and the line's rate — exactly as
  Line capacity and the card's labour line read them, so the three never
  disagree; where Line capacity typed its own people the sentence says "as
  Line capacity has them".
- *Chosen (24 October rule):* every input optional; the missing one named in
  the sentence ("give the line a wage", "give the line a speed, or map its
  Line capacity"); the heads and the £ an hour still said when only the
  speed is missing; nothing on the page or card waits on any of it.
- *Chosen:* the card's labour line (built 17 October in `shiftShortsFor`) is
  replaced by this module's sentence, so page and card read one source; the
  shift's output stays on its own line.

## 4. Inputs
None new. Read: the map's people (`headcount`), the product's Line capacity
(`Standard.capacity` — its typed `labour.people`, `labour.ratePerHour`, its
stations), the line's `crew`, `labourRatePerHour`, `labourBurden`,
`packsPerMin` (`Workspace`, typed on *Set up the line*). Access, sync and the
database are unchanged.

## 5. Data suitability
Said from the first person placed. A standard with no people says what to
do ("Place the people on the board to say what they cost"). The speed's
source is said; a rated speed is the line's claim, not a measurement.

## 6. Calculations
Symbols: n the people (the map's headcount, or Line capacity's typed
people), w the wage £/h, b the on-costs ratio (1 when unset), r = w × b the
rate (or Line capacity's typed rate), v the packs a minute (Line capacity's
good output in its unit, else the line's rated packs a minute).
- £ an hour H = n × r.
- £ a pack = H ÷ (v × 60).
- Missing: n = 0 → nothing but the ask; r absent → H and a pack absent, the
  wage asked; v absent → H said, a pack absent, the speed asked.
- Formatting: `fmtMoney` (pence under £1: "3.8p"; pounds above); the people
  as a count; the speed as `fmtN` with its unit.

**Independent cases** (`scripts/knowledge/independent-cases.py`, "money on
the line standard"; the unit tests in `src/tools/linestandard/__tests__/
standardMoney.test.ts`):
1. 1 person, wage £14.50, on-costs 1.3, rated 100 packs a minute, no Line
   capacity → £18.85 an hour; 0.31p a pack, "the line's rated speed".
2. 12 people, the same line → £226.20 an hour; 3.77p a pack.
3. 4 people, Line capacity with one machine at 120 cases a minute (no typed
   people or rate), the same line's wage → £75.40 an hour; 1.05p a case at
   120 cases a minute "(Line capacity)".
4. Line capacity with typed people 6 and rate £20, the map with 4 people →
   £120 an hour, "6 people as Line capacity has them".
5. No wage on the line and none typed → the sentence names the wage; no
   £ figure.
6. A wage but no speed and no Line capacity → £ an hour said, the speed
   asked.
7. No people → "Place the people on the board to say what they cost."

## 7. Outputs
On the map's page: one sentence under the headcount in *Who does what*
(`.ls-money`, the `ie-say ie-money` style every tool's money sentence
wears). On the card: the same sentence as one of the foot's lines, after the
capacity's and the shift's — so every paper that draws the card carries it.
No tile, no colour: the cost is one output, the count stays the headline.

**The report.** The card (`standardCard.ts` renderCard, a canvas drawn once
and placed in every PDF — the standard's own, the standards' list, Line
capacity's all-shown, All together) gains the sentence in its foot; the foot
grows a line when there are more than two facts, as it does today, never
cutting one short. Nothing else on paper changes.

## 8. Manufacturing usability
Read in one glance beside the headcount; on a phone the sentence wraps
under the count; nothing to type on the standard — the way to give a wage
or a speed is named (*Set up the line*).

## 9. Failure handling
A missing input is a named ask, never a blank or a figure; a line record
that fails to load reads as no line (the asks say so); a standard on no line
with no Line capacity says both asks in one sentence.

## 10. Integration
Reads: `Standard` (marks, capacity), `Workspace`. Writes nothing. Shows: the
map's page; the card and every paper it is in. Feeds: nothing new (the
figure is Line capacity's labour where both exist). Replaces: the card's
inline labour line from `shiftShortsFor` (17 October) — same figure, one
module. The line's wage given on *Set up the line* while the map is open
reaches the sentence (`onDataChange`), as the value stream's does.

## 11. Verification
Unit tests on the seven cases; the acceptance script drives the page in
Chromium on the seeded line and reads the card's lines.

**Acceptance criteria.** In `scripts/acceptance/line-standard.mjs`, story 15:
1. A plain board with one person on the seeded line (wage £14.50 × 1.3,
   rated 100 a minute, no Line capacity): the page's sentence equals the
   module's for that record and line, says "1 person placed", "£18.85 an
   hour" and "(the line's rated speed)".
2. The line's wage taken off: the sentence names the wage and gives no £;
   the wage put back: the sentence as before — without a reload.
3. The seeded product with a Line capacity: the sentence says "(Line
   capacity)" and equals the module's; the card's lines for that standard
   (`shiftShortsFor`) carry the same sentence.
4. On a phone (390 px) the sentence is visible under the count.
5. No console errors.
Proved by: `node scripts/acceptance/line-standard.mjs` (in the gate) and
`npx vitest run src/tools/linestandard`.

## 12. Maintainability
One module (`standardMoney.ts`: `standardMoney`, `standardMoneySays`), read
by the page, the card's loader (`shiftShortsFor`) and the acceptance
script; the arithmetic is Line capacity's `labourInputs` and `labourCost`,
so a change to the cost model changes both at once. The catalogue entry
names the spec, the module and the tests; `knowledge/MONEY.md` §4 FC-006
says built; `docs/BLUEPRINT.md` §6 moves the line standard to *says money*.
