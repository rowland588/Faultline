# FC-004 — Spaghetti diagram: walking and transport distance: the specification

**Catalogue:** FC-004 (it depends on FC-006, the line standard's layout, and FC-212, the from–to chart, which is not built) · **Knowledge:** `lean.spaghetti` (full, practice), with
`lean.seven-wastes` and `ie.work-sampling` beside it · **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the projects"*; the Kaizen event's *Observe*
section lists it and `docs/METHODS.md` §11 marks it "not built — a drawn plan with distances (calc inside)" · **Status:** draft, built on `m6-other` (1 November)

## 1. Purpose
People walk all shift fetching film, cases and trays, and nobody sees it while doing it. The spaghetti diagram draws one person's round on the layout, every leg a line, to scale — so the tangle
is visible — and then measures it: the metres of a round, the rounds a shift, the metres and the minutes of walking a shift, and which trips make most of it. The sentence it lets one side say
to the other — the packer's lead to the manager, the Kaizen team to its sponsor: **"One round of the packer's is 158 m; 36 rounds a shift is 5.7 km — 73 minutes of walking, and the film trips are
half of it. Film at the line saves 33 minutes a shift, £14."**

**Scope.** What this build covers: (1) a **round** — the places walked in order, up to 20, each with its metres walked from the place before (typed), optionally its position on the layout (metres east and
north of one corner), and optionally what the trip to it is for; (2) the **figures** — each leg's length (the metres walked, else the straight line between the two positions, said to be that), the metres of a
round, the rounds a shift, the metres and minutes of walking a shift at a **stated pace** (loaded 1.3 m/s, unloaded 1.6 m/s, or one timed on the floor), the share of the shift, the trips ranked by
distance (legs sharing a trip name are one trip) and the longest named; (3) the **picture** — the round on the layout, **to scale** (one metre the same length across and up, on screen and on paper), where
positions are given; (4) the **money** — the walking as the person's time at the line's wage with on-costs (labour), a shift and a week, every input optional; (5) the **saved before** that makes a before → after of a
changed layout (the film staged at the line); (6) the paper. It is a **calculator** of the shared shape (`knowledge/specs/FC-235-calculators.md`): the record, list, page, rename, delete and Undo, the line report,
access and sync are the shape's, so nothing is added to the rail, the tabs or the menu. What it deliberately does not cover: **marks on the line standard's board** (the board draws who stands where with no scale —
`knowledge/BUILD-SHAPES.md` says the spaghetti "needs the layout to have a scale" — so the positions are typed from a plan, and reading them off the board is for later), **many products or materials between many places**
(the from–to chart, FC-212, not built), **several people or several rounds in one record** (one round, one record; the shape's list holds many), **a person's real movement** (nothing reads where anyone went — every place and metre is
typed from what was seen), **an obstacle-aware walking distance** (a straight line is a floor, said so), **walking as a share of the whole crew's day** (work sampling, FC-022), any AI.

## 2. Users and scenarios
**Who:** the Kaizen team following a packer for a few rounds; an engineer measuring a layout change; the line lead at a desk. On the floor with a tape or a wheel and a phone, or at a desk with the plan.

**Scenarios, food first.** (1) *A flow-wrap line.* A packer fetches film from a store 42 m away, cases from one 28 m away and walks 9 m to the scale: 158 m a round, 36 rounds a shift, 5.7 km and 73 minutes —
and 53% of it fetching film. (2) *The change.* Saved as the before, then the film staged at the line (6 m each way): 86 m a round, 3.1 km, 40 minutes — 33 fewer, about £14 a shift at £25 an hour. (3) *A drawn plan.* The
line, the film store and the scale given positions on the plan: the round is drawn to scale and the legs are the straight lines between them, said to be that.

## 3. Method selection
The string (spaghetti) diagram (Kanawaty (ed.), *Introduction to Work Study*, ILO, 4th ed., 1992; Lean Enterprise Institute, *Lean Lexicon*, 5th ed., 2014): record one person's path over a cycle on a scale
drawing of the layout, then measure — distance a cycle, cycles a shift, distance and time a shift, and each trip's share (the Pareto of the trips). **Alternatives considered** (the record's *When not to use it*): many
products or materials between many places → the from–to chart (FC-212); classing every step of one path → the process flow chart (FC-003); how much of the crew's day is walking → work sampling (FC-022); the standard the walk should
follow → standard work. **Unsuitable when:** the round is not typical (one cycle of one person — the page says to follow several and say the range); the diagram is drawn from memory (the page says it is drawn on the floor);
distances are guessed (said: paced is good to ±10%, a scale drawing is better).

**Established · assumed · chosen.**
- *Established:* distance a shift = distance a round × rounds a shift; time = distance ÷ pace; each trip's share of the distance (`lean.spaghetti`, *Procedure and calculation*); a standard walking pace unloaded of
  about 1.6 m/s — MTM-1's walking element, 5.3 TMU a foot (1 TMU = 0.036 s, so 0.1908 s a foot = 1.597 m/s; from knowledge of the MTM-1 data card, as the record says); 1.2–1.3 m/s is nearer when loaded, crowded or on a wet floor.
- *Assumed:* the places and metres are what was seen on the floor; a round is typical enough to scale by the rounds a shift; one person to a round.
- *Chosen (Faultline's own):* **a calculator, not the line standard's board** (the board has no scale; the shape gives the record, the paper and the before → after for nothing); **up to 20 places** (a round is a few
  places and their returns); **loaded 1.3 m/s is the page's starting pace**, said to be a choice and not a measurement, because it is the careful reading — the other standard pace and the pace timed on the floor
  are one tap away, and **the other pace's minutes are said every time** (the pace moves the minutes by about a quarter); a leg's **typed metres win over the straight line** between two positions; **a trip is the
  legs sharing a name** (else each leg is its own); **one metre is one length across and up** — the drawing's window is the places' bounding box, padded, kept between 1 : 2.5 and 2.5 : 1 so a long corridor is never a thread.
  Rowland has not named these.
- *Money (`knowledge/MONEY.md` §4, FC-004 — labour L):* walking minutes a shift × the person's hourly cost = the labour spent walking, at the line's wage with on-costs (the one cost model — offered from the line, or typed); a
  week from the shifts a week typed. Where the walker is the bottleneck's operator the minutes are the line's (T): not read here — said in the caveats. Every input optional; a missing one is named; nothing waits.

## 4. Inputs
Whose round (text, optional). Per place (appearing once the one above is named): its name (the first two needed), its position east and north (m, optional), the metres walked from the place before (m, optional, ≥ 0), what the
trip is for (text, optional). Then: **rounds a shift** (needed, > 0), **walking pace** (loaded · unloaded · timed — a starting point said to be a choice; *timed* asks the pace in m/s), minutes in the shift (optional), and in a fold,
*In money — all optional*: the hourly cost of the person (offered from the line) and the shifts a week.

## 5. Data suitability
Two places make one leg; a leg with neither metres nor two positions has no length, is named, and is left out — never given one. Every leg a straight line is said so. One round of one person is a sample of one: the page says to
follow several. A position needs both east and north to count.

## 6. Calculations
`leg = typed metres, else √(Δeast² + Δnorth²)`; `round = Σ legs`; `shift distance = round × rounds`; `minutes = shift distance ÷ pace ÷ 60`; `share = minutes ÷ shift minutes`; `trip = Σ the legs sharing its name`, `share of a round = trip ÷ round`;
`labour a shift = minutes ÷ 60 × the hourly cost`; `a week = × shifts a week`. The drawing: the bounding box of the placed places padded by max(2 m, 12%), widened about its centre to a shape between 1 : 2.5 and 2.5 : 1, drawn at its own aspect.

**Independent worked cases** (`scripts/knowledge/cases-kaizen.py` sections S and S2 — plain Python, the record's packer; the unit test holds the literals):
| case | result |
|---|---|
| A — the packer | legs 42, 42, 28, 28, 9, 9 = **158 m** a round; × 36 = **5,688 m**; at 1.3 m/s **72.92 min** (15.19% of 480); at 1.6 m/s 59.25 min; film trips 84 m = **53.16%**, cases 56 m (35.44%), scale 18 m (11.39%) |
| B — film staged at the line | 6 m each way: **86 m** a round, 3,096 m, **39.69 min** — 33.23 min saved |
| C — in money (£25 an hour, five shifts a week) | £30.38 a shift, £151.92 a week; the saving £13.85 a shift |
| D — positions on a layout | the line (30, 0), the film store (0, 0), the scale (30, 16): legs 30, 30, 16, 16 = **92 m**; 10 rounds = 920 m; at 1.5 m/s timed 10.2 min; a 3-4-5 leg is 5 m |

**Sentences** (the module's `calc/defs/spaghetti`; the page, the paper and the acceptance script read these): "*One round of the packer's is 158 m over 6 legs; 36 rounds a shift is 5.7 km — 73 min of walking at 1.3 m/s (loaded or in a crowded hall), 15.2% of the
480-minute shift.*"; the trips — "*The trips, by distance: Fetch film 84 m (53%) · Fetch cases 56 m (35%) · Weigh 18 m (11%) of a round.*"; the pace — "*The pace assumed matters: at 1.6 m/s (unloaded, at a standard pace) the same walk is 59 min a shift.*";
the money — "*72.9 min of walking a shift at £25.00 an hour is £30.38 a shift — £151.92 over 5 shifts a week.*"

## 7. Outputs
On screen (the shape's lean page): the band, five tiles (A round · Walked a shift · Walking a shift · Share of the shift · Labour a shift) each with what moved since the saved before, the sentence and what else it says (the trips, the longest
and the question to ask of it, the other pace), the checks (legs with no length, legs that are straight lines), **the round on the layout to scale** where positions are given, the working leg by leg, the money or what to add, and what it does not
say. Only an abnormal number wears colour: none does — the verdict is neutral and in words.
**The report.** The shape's calculation paper from the same result: the band with the verdict, the tiles with what moved, *What it says*, what else it says and the checks, **the round drawn on the page to the same scale** (the plot at the shape of the layout,
legs and places with their names), the figures put in, the working leg by leg with where each length came from, the money or what to add, the before → after and what it does not say. It reads the same module as the screen; nothing missing is made up.

## 8. Manufacturing usability
Walk the round with the phone, naming each place and the metres from the last (or give positions from the plan); type the rounds a shift; the answer redraws as each place goes in. On the phone the form is one column and
the drawing scales inside its box, its names readable. Saving the figures as the before and changing one leg is the before → after in one more tap.

## 9. Failure handling
One place only: *A walk needs at least two places — one leg between them.* No leg with a length: named and refused. A leg with no length among others: named, left out. A minus metre, a pace outside 0.1–4 m/s or no rounds: refused in words.
Every leg a straight line: a warning beside a standing answer. A client reads the round and the paper and changes nothing. A record whose calculator is not in this build keeps its figures.

## 10. Integration
**Record:** a `ToolStudy` of tool `calc` with `agreed.calc = { key: 'spaghetti', inputs, before? }` (the shape's; no migration, no mapper change). **Where it shows (CLAUDE.md rule 5):** the Calculators hub and list, a line's Tools (one *Calculators* row)
and the line report, a project's Tools, and the Kaizen event's *Observe* row for FC-004 (a method row opens `/calc/spaghetti` and starts one there). The waste walk (FC-005) points transport and motion at it. Access `useAccess` as every calculator:
`can.edit` types, `can.remove` deletes, a client reads. The shape's picture gained one optional `aspect` (a drawing to scale); every other calculator draws as before.

## 11. Verification
Unit: `src/tools/spaghetti/__tests__/spaghetti.test.ts` (cases A–D, the window), `src/tools/calc/__tests__/calc.test.ts` (the three worked examples and three refusals, table-driven, including the picture inside its axes). Acceptance:
`scripts/acceptance/spaghetti.mjs` and `scripts/acceptance/calc-shape.mjs` (table-driven over every definition).

**Acceptance criteria.**
1. A round, a shift's metres, the minutes at 1.3 and 1.6 m/s, the share of the shift and the trips' shares of the record's packer equal case A; the staged-film round equals case B — *proved by* `spaghetti.test.ts` (`the packer’s round`).
2. A leg's length is the typed metres, else the straight line between positions (3-4-5, 92 m), a typed length wins, a leg with neither is named and left out — `spaghetti.test.ts` (`a leg’s length`).
3. The money equals case C and every money input is optional, a missing one named — `spaghetti.test.ts` and `spaghetti.mjs` step 3.
4. The packer typed through the real boxes gives the sentence, tiles, trips and money of case A on the page — `spaghetti.mjs` step 1 (and `calc-shape.mjs` step *b* for the examples).
5. The round is drawn to scale: a line for each leg between placed places, a dot and a name for each distinct place, equal length for a metre across and up — `spaghetti.mjs` step 2 and `spaghetti.test.ts` (`the drawing’s window`).
6. The pace's other value is said; legs that are straight lines are said; a leg with no length is named — `spaghetti.mjs` steps 1–3.
7. The paper, downloaded and read back, carries the sentence, the trips, the drawing's names, the leg-by-leg working and the money — `spaghetti.mjs` step 4.
8. Saved as the before then the staged round, each tile says what moved (33 fewer minutes, £13.85 a shift) — `spaghetti.mjs` step 3.
9. Opening FC-004 from a Kaizen event's *Observe* row opens `/calc/spaghetti` and *New* starts one in the project — `spaghetti.mjs` step 6 and `methodTools.test.ts`.
10. The phone (390): nothing off the side, the boxes thumb-sized, the drawing inside its box — `spaghetti.mjs` step 5.
11. Existing behaviour unchanged: the other calculators' pictures and papers (no `aspect`), the shape's tests and acceptance, the catalogue and registry tests.
Not yet proved: the full gate and the paper-parity comparison (the lead runs them after merging).

## 12. Maintainability
`src/tools/calc/defs/spaghetti.ts` (the definition and its sentences), `src/tools/spaghetti/spaghetti.ts` (the legs, the figures, the money and the drawing's window, pure); the shape's `CalcPicture` and its paper block gained one optional `aspect`.
Left for later, each with its number: positions read off the line standard's board once it has a scale (FC-006); the from–to chart for many products and places (FC-212); several rounds or people compared in one record; an obstacle-aware walked distance;
the walking minutes taken as the line's (T) where the walker is the bottleneck's operator.
