# FC-032 — the Line balance, with its time study, combination table, person–machine chart, method questions, order of the work and standard data: the specification

**Catalogue:** FC-032 Line balance (the tool; built before the standard, now
specified), and the modes of it built here: FC-019 the stopwatch time study
(rating, how sure, allowance), FC-025 allowances (the named parts; the table
is *not* offered — see Limits), FC-007 the standard work combination table,
FC-026 the person–machine chart and machine interference, FC-028 ECRS on the
elements, FC-033 a balance proposed with the order the work must follow, FC-024
standard data (timed elements reused across products). **Knowledge:**
`knowledge/methods/ie/time-study.md`, `ie/allowances.md`, `ie/person-machine.md`,
`ie/ecrs.md`, `ie/standard-data.md`, `lean/standard-work.md`,
`capacity/line-balancing.md`, `knowledge/MONEY.md` §4 (FC-019, 024, 025, 026,
028, 033, 007). **Asked for:** Rowland, 10 October (*"thought it would be more
Lean 4.0"* — the work as people do it, timed), 17 October (*"line balance is
about a more manual people process flow analysis visual of what is happening
where and what people are doing … I input people, what they do, and should be
able to time them"*), 25 October (`docs/TOOLS-BUILD-BRIEF.md`: *"go through
everything"*, the judgement calls the builder's, written down). **Status:**
built 25 October on branch `build-time`; the tool's page, paper and acceptance
`scripts/acceptance/time-study.mjs` are in the gate.

## 1. Purpose
The Line balance times what each person does on a product and stacks it against
takt, so the person who holds the line is a name and a number. It could not yet
say *how sure* a time is, ask for the pace seen where the timing ends, show a
person who loads a machine and waits for it, ask the five questions of each
step, keep the order the work must follow, or reuse a step timed on another
product — which are the rest of work measurement. Built here, so the team can
say to the sponsor: *"Op 2 waits 14 s a cycle for the sealer — that is £5.25 an
hour of pay; one person can tend 4.8 of these, and the fifth costs 20% more
output for 7 s of wait."* — and to the line: *"stage the trays and weigh on the
fill scale: 49 s becomes 30 s, 75% of takt, expected until it is timed again."*

**Scope.** The tool is the page `#/w/:ws/standards/:id?at=balance&view=work`
(Line balance — one product), its list and its paper. Five *lenses* on the one
record, as ViewTabs (`?lens=`): **Against takt** (as before; its element tools
gain a fourth kind of time, *Machine*, and the pace is asked after timing), **Times** (FC-019, FC-025, FC-024), **Person and machine**
(FC-007, FC-026), **Order of work** (FC-033), **Improve** (FC-028). One record
(`tool: 'balance'`), no new noun, no migration: the new fields live in the
study's own `facts` and `agreed` JSON. Left out, each with its entry:
predetermined motion times (FC-023, licensed); random servicing and simulation
of machine stops (FC-047); a regression element ("place *n* packs" = a + b·n)
in standard data; a precedence diagram *drawn* as boxes and arrows (the order is
a list of what must follow what); an exact (optimal) line balance — the ranked
positional weight is a heuristic and is said so; the ILO's relaxation-factor
table (not checked against the book — see FC-025 below); two-handed micro-motion
charts (FC-233); the process flow chart (FC-003).

## 2. Users and scenarios
The industrial engineer or team leader timing a hand-packing, tray-loading or
case-erecting station on a phone with one hand; the ops lead at a desk deciding
crewing; the person who tends a depositor or a tray sealer and waits for it. Food
first: a bag-and-seal station where the packer loads the sealer, checks a pack and
walks to the case erector; two flow-wrappers tended by one packer; a sandwich
assembly line whose base must go on before the filling; a new pack format whose
elements were timed already on the 1 kg bag.

## 3. Method selection
Each mode is the method the knowledge record names, chosen by the question:

- *How long should the work take, and how sure are we?* The ILO stopwatch study:
  observed × rating ÷ 100 = basic; basic × (1 + allowance) = standard; cycles
  needed n = (t·s ÷ k·x̄)² (Student's t at n − 1, k = 0.05). Built since
  22 October; now the rating is asked where the timing ends, the margin the laps
  actually give is said, and the allowance is built from named parts.
- *Where in the cycle is the person waiting for the machine, or the machine for
  the person?* Toyota's combination table (a timeline: manual, walking and
  automatic time against takt) and the ILO's multiple activity chart.
- *How many machines can one person tend?* Synchronous servicing,
  N′ = (l + m) ÷ (l + w), and the cycle, output and idle at the integers either
  side (Niebel; the ILO); random servicing is a queueing problem and is *not*
  claimed.
- *Which steps can go, merge, move or be made easier?* The ILO's critical
  examination, as ECRS, in its order (eliminate first, then combine, rearrange,
  simplify), with the five primary questions (purpose, place, sequence, person,
  means) offered as the prompt for each step.
- *What is the fewest people the order allows?* Ranked positional weight
  (Helgeson & Birnie 1961): weight = a step's time plus every step that must
  follow it; assign in weight order, to the current person while the step's
  predecessors are placed and it fits takt. A heuristic; the theoretical
  minimum ⌈Σ work ÷ takt⌉ is shown beside it.
- *Have we timed this before?* Standard data: a step timed on another product of
  the same line is offered with its basic time and cycles; used here it keeps its
  provenance and takes this balance's allowance.

Not used, and why: predetermined motion times (licensed tables, a certified
analyst); work sampling for a task too irregular to time (it has its own tool,
FC-022); video (its own tool, FC-021).

**Established · assumed · chosen.**

*Established* (with source): basic = observed × rating ÷ 100 on the BS 3138
scale, standard = basic × (1 + allowance) (ILO, *Introduction to Work Study*, 4th
ed., ch. 12–13, 23; BS 3138:1992 — as `ie.time-study`, `ie.allowances`);
cycles n = (t·s ÷ 0.05·x̄)² with Student's t (Freivalds & Niebel, *Methods,
Standards and Work Design*, ch. 9); the margin the n laps give is
t·s ÷ (√n·x̄) at 95% (the same relation solved for k); machine-paced elements are
not rated and carry no allowance (`ie.time-study` limits; `ie.allowances` *when not
to use it*); synchronous servicing N′ = (l + m) ÷ (l + w), the cycle
max(l + m, n(l + w)), idle and the cost a machine-cycle (Freivalds & Niebel
ch. 2, as `ie.person-machine`, worked case computed in
`scripts/knowledge/cases-time.py` §4); ranked positional weight (Helgeson &
Birnie 1961; Scholl 1999) and balance efficiency Σ work ÷ (people × longest stack);
ECRS and the primary questions (Kanawaty, *Introduction to Work Study*, ch. 7); the
labour cost of a second saved a pack = seconds × rate ÷ 3,600 (L, `MONEY.md` §2).

*Assumed*, and said on the page: the pace is the observer's judgement (the screen
says a trained observer rates; it does not claim a scale's anchors); synchronous
servicing assumes identical machines and a fixed cycle (the screen says so and
that random stops are not in it); a person's walk to the next machine is the
walking they timed; an ECRS saving is *expected* until the work is timed again.

*Chosen* (the builder, 25 October — the owner asked not to be asked), each said
on the screen where the figure is read:
1. **The allowance table is not offered.** The ILO's relaxation factors in
   `ie.allowances` are marked "from knowledge; percentages to confirm against the
   text", and could not be confirmed here (no copy of the book; the web gave no
   authoritative table). So no percentage is supplied: the person types the
   figure *their site agreed* for each cause, named, and the tool adds them. The
   page says so. FC-025 stays partial.
2. **Rating anchors are not built in** for the same reason; the page says 100 is
   standard pace (BS 3138) and offers the chips 75 · 90 · 100 · 110 · 125 (the
   existing ones) and a typed figure from 50 to 150. An element timed and never
   rated is *taken at 100 and said so*.
3. **A machine step starts when the step before it ends** and runs alongside the
   person's following steps (Toyota's combination table convention); two machine
   steps in a row run one after the other.
4. **The cycle with a machine is the longer of the person's end and the machine's
   end**; the gap is the person's wait for the machine (or the machine's wait for
   the person) and is shown, not hidden.
5. **N′ uses** l = the person's *work* steps, w = their *walk* steps, m = their
   *machine* steps in one cycle; explicit *wait* steps are left out of N′ and the
   page says so.
6. **ECRS "after" is the expected standard time** (the same kind of number the
   page reads), typed by whoever proposes the change; Eliminate is 0; Combine adds
   the typed seconds to the step it joins; Rearrange moves the step to the person
   chosen (or off the line); the balance is re-read from those expected times by the
   same module that reads the timed ones. An *Eliminate* with no written reason is
   counted but marked *reason missing*; a step that sounds like a check carries the
   note to ask quality and food safety first (the record's rule).
7. **Money**: labour of the work in a pack = seconds × rate ÷ 3,600 (L); "at takt"
   uses the line's takt (packs an hour = 3,600 ÷ takt); a one-off cost typed per
   change gives a payback in running hours at takt. Contribution is only said with
   the line's margin and only as "if these machines hold the line". No input is
   defaulted; the missing one is named.
8. **Over takt on a person with machine steps** is read on the cycle (the longer of
   person and machine), not the sum.
9. **Standard data is offered from the same line only**, from timed or typed steps
   of other products' newest balances; a reused step is marked *reused* wherever its
   time is read.

## 4. Inputs
Unchanged: people and what they do (from the line standard's map or typed), each
step's laps (stopwatch) or typed seconds, the pace seen, the takt (Line capacity's
target, or agreed here), the allowance. **New:**

| Field | Unit / type | Required | Validation | Where |
|---|---|---|---|---|
| Kind of time: Work · Walk · Wait · **Machine** | choice | no (Work) | machine steps are not rated, carry no allowance | element tools |
| Must follow (predecessors) | steps of this balance | no | not itself; no loop (refused, said) | Order of work |
| The pace seen | 50–150, 100 standard | no (100, said) | a number | after timing; Times |
| Allowance as parts: name + % | text, 0–99 | no | each ≥ 0, sum < 100 | Agree (owner: `can.agree`) |
| ECRS decision: E / C / R / S, expected seconds, joins, to, why, one-off £ | choice, seconds ≥ 0, £ ≥ 0 | no | Combine and Rearrange name their target; Eliminate wants a reason (flagged, not refused) | Improve |
| Machines tended: the machine's cost an hour (£), packs one machine-cycle makes | £, count | no | > 0 | Person and machine |
| Reused step | from another product's balance | no | one tap; keeps its source | Times |

Read from the line, never asked again: the rate (Line capacity's, else the line's
wage × on-costs), the line's margin a pack, the takt, each person's station and
unit. Agreed-before-measured: the takt and allowance (`can.agree`); the ECRS and
order fields are the work's (`can.edit`).

## 5. Data suitability
- A time is *enough* only at its cycles (≥ 5 and n ≥ (t·s ÷ 0.05x̄)²); with fewer, the
  Times lens says "4 of 7 cycles — ±6.5% at 95% now" and the verdicts stay amber.
- A far lap (3σ from the rest, n ≥ 5) is flagged, never struck by the app (kept).
- A machine step without a time makes the person's cycle unknown: nothing is
  claimed (the existing "not timed yet" rule); N′ needs l > 0 and m > 0.
- Synchronous servicing is *unsuitable* for machines that stop at random or that
  differ; the page says so and offers the chart alone.
- A step longer than takt alone is reported as over takt, never split by the app.
- A loop in *Must follow* is refused with the loop named; the proposal is then
  withheld.
- ECRS on a step with no time estimates nothing; it says "no time yet".

## 6. Calculations
(symbols: x̄ observed mean, s sd, n laps, r rating, a allowance, t = Student's t at
n − 1 df, 95% two-sided; the module keeps its table of t.)

1. basic = x̄·r ÷ 100; standard = basic·(1 + a); margin = t·s ÷ (√n·x̄) (a fraction;
   "±2.5% at 95%"); needed = ⌈(t·s ÷ 0.05x̄)²⌉, never below 5.
2. allowance from parts: a = Σ pᵢ ÷ 100; the allowance share of a standard time =
   a ÷ (1 + a).
3. Timeline (per person, steps in order): clock c = 0, machine free f = 0. A
   non-machine step runs [c, c+d], c += d. A machine step runs [max(c, f), +d],
   f = its end. personEnd = c; machineEnd = f; cycle = max(c, f); waits for the
   machine = cycle − personEnd; the machine waits for the person = personEnd −
   machineEnd (if > 0). With no machine step, cycle = Σ standard times, as before.
4. Machines tended: l, m, w as chosen above; N′ = (l + m) ÷ (l + w); for n machines:
   cycle(n) = max(l + m, n(l + w)); machine-cycles an hour = 3,600·n ÷ cycle(n);
   person idle = max(0, cycle − n(l + w)); each machine waits = max(0, cycle − (l + m));
   cost a machine-cycle = (operator £/h + n·machine £/h) ÷ 3,600 · cycle ÷ n (the
   operator's alone when no machine rate is typed).
5. Ranked positional weight: Wᵢ = tᵢ + Σ{tⱼ : j a successor of i, any depth}; order by
   Wᵢ descending (ties: the order of the work); station k takes the first unplaced
   step in that order whose predecessors are placed and with load + tᵢ ≤ takt; if none,
   close the station. A step alone longer than takt takes a station of its own.
   Efficiency = Σ t ÷ (stations × longest); theoretical minimum ⌈Σ t ÷ takt⌉.
6. ECRS after: build the balance again with each step's expected standard time (E = 0
   and removed; C = removed, its typed seconds added to the step it joins; R = moved
   to the person, with its typed seconds or its own; S = the typed seconds); saving =
   Σ before − Σ after (work content); money = saving·rate ÷ 3,600 a pack; at takt
   × 3,600 ÷ takt an hour; payback = Σ one-off ÷ (£ an hour).
7. Standard data: a reused step's basic = the source's observed·rating ÷ 100 (its
   own allowance removed); here standard = basic·(1 + this balance's a).

Independent cases (`scripts/knowledge/cases-time.py`, plain arithmetic and SciPy,
each becoming a unit test in `src/tools/linework/__tests__/method.test.ts`):
- §1 six laps 6.1 5.9 6.0 6.2 5.8 6.0: mean 6.0, s 0.14142, t(5) 2.571, margin ±2.47%;
  rated 110 → basic 6.600; at 14% → 7.524. Four laps 4.0 4.4 4.2 4.1: margin ±6.51%
  at 95% (t at 3 df exact 3.182), needed 7.
- §2 basic 42.0 s with parts 5+4+2+1+1+2 = 15% → standard 48.300 s, 74.53 an hour,
  the allowance part 6.30 s; at £15/h £0.02625 a pack, £7.875 an hour at a 12 s takt.
- §3 load 10 (work), run 30 (machine), inspect 12 (work), walk 4 (walk): person ends
  26, machine ends 40, cycle 40, the person waits 14 s; machine busy 75%. Second case
  load 10, run 8, pack 20, walk 3: person ends 33, machine 18, cycle 33, the machine
  waits 15 s.
- §4 l 72 s, m 360 s, w 18 s: N′ = 4.8; n = 4: cycle 432, 33.33 an hour, person idle
  72 s, machines never wait; n = 5: cycle 450, 40 an hour (+20%), each machine waits
  18 s; cost a machine-cycle £4.8000 and £4.8750 at £20 + £35 an hour; n = 6: cycle
  540, 40 an hour, each waits 108 s.
- §5 eight steps A 6, B 4 (after A), C 5 (after A), D 3 (B), E 7 (C), F 2 (D, E), G 4 (F),
  H 3 (G): weights A 34, C 21, B 16, E 16, D 12, F 9, G 7, H 3; at a 12 s takt AC | BE |
  DFGH (11, 11, 12 s; 3 people = the theoretical minimum; 94.4%); at 10 s AB | CD | EF |
  GH. Four 5/5/5/3 with no order at 10 s: PQ | RS. A 14 s step at a 12 s takt takes a
  station alone.
- §6 six steps 6, 4, 18, 7, 9, 5 → 0, 2, 18, 0, 9, 1: 49 → 30 s (38.8% less), 122.5% → 75% of
  a 40 s takt; at £15/h £0.07917 a pack, £79.17 per 1,000, £7.125 an hour at takt; a £120
  rack and belt move pays back in 16.8 running hours.
- §7 library 3.2, 2.1, 9.6×2, 4.4, 1.4×2 → basic 31.70 s, at 11% 35.187 s, 102.3 an
  hour; a step observed 5.0 rated 110 has basic 5.50, here at 12% 6.160.

## 7. Outputs
Screen: the existing tiles, sentence and cost (unchanged), then the lens.

- **Against takt** — as before. Element tools: *Kind* gains **Machine** ("the
  machine's own run, from where the step before ends"); a reused step says *reused from Maris Piper 1kg*. After a timing, **Rate the
  pace** lists what was just timed with the chips and *Leave at 100*.
- **Times** — a row a step: name · whose · cycles ("6 of 5") · observed · pace
  ("110", or "not rated — 100") · basic · standard · ±% at 95% (with the amber words
  when short). Under it each person's task total ("Op 2: standard 31.6 s — 114 an hour
  planned") and the allowance: the figure and its parts ("15% = personal needs 5,
  basic fatigue 4 …") with what it is in money ("rest, not waste"). The ILO-table
  sentence (not built in; type the site's). **Standard data**: other products' timed
  steps on this line, each with its basic time, cycles and product, a search box, and
  *Use* (to a chosen person); a count of how much of the work is reused.
- **Person and machine** — per person with a machine step: the chart (two lanes, person
  and machine, on one time scale, the takt a dashed line; work solid, walking hatched,
  waiting hollow, machine dotted outline — words beside every fill) and its sentence:
  *"Op 2: 40.0 s a cycle against 12 s … waits 14.0 s for the sealer; the sealer runs
  30.0 s, 75% of the cycle."* Then **How many machines can they tend**: N′, a row for
  each n from 1 to the integer above N′ + 1 (cycle, machine-cycles an hour, person
  idle, each machine's wait, cost a machine-cycle), the sentence for the integers
  either side, the unsuitability line (identical machines, fixed cycle, random stops
  not in it). With no machine step the lens explains how to add one.
- **Order of work** — each step with what it must follow, its positional weight, the
  proposal (a table: person · steps · load), the people it needs against the
  theoretical minimum, efficiency, and any step placed before what it must follow
  ("Seal is with Op 1, but must follow Fill, which is with Op 2"). *Use it* applies
  (`can.edit`). With no order given, the suggestion is the flow-order fill as before.
- **Improve** — per person a table: step · standard · the four chips (Eliminate ·
  Combine · Rearrange · Simplify, plus keep) · expected · why; the five questions
  offered; the result: "49.0 s → 30.0 s expected (39% less); Op 2 within takt;
  1 fewer person" — with *expected until timed again* — and the money: "£0.079 a
  pack, £7.13 an hour at takt; the changes cost £120 and pay back in 16.8 hours".
- Wording for amber/red/green follows the house (red over takt or a loop; amber
  short of cycles, reason missing, reused-not-timed; green within takt and enough).
  Colour is never the only carrier; machine/walk/wait are told apart by fill *and* word.

**The report.** The Line balance's paper (the list's "every product shown" and the
line bundle, from `lib/studiesPdf` studyBlocks) keeps *Each person against takt* and
*What it costs* and gains, in this order and only when the record has the thing:
**Times** (the table above, with the allowance line and its parts and what is reused),
**Combination table** (a lane pair per person with a machine, the sentence), **Machines
one person can tend** (N′, the rows, the either-side sentence), **Order of the work**
(what must follow what, the proposal, the minimum), **Method questions** (the decisions
with expected times, before → after, the money and the payback, marked *expected*). Each
block reads the same module as the screen (`timeBlocks` over `lib/ie`-style functions in
`src/tools/linework`), says its assumptions in a sentence (pace is a judgement;
synchronous servicing assumes identical machines; an ECRS saving is expected), and the
money line names the missing input. Greek and symbols go through `san`.

## 8. Manufacturing usability
On a phone, one hand: the timer is unchanged (full screen, Lap, Undo, Skip, Foreign); the
pace is asked in one tap after Stop timing; a machine step is one chip; the lenses are
five tabs that wrap on 390 px; tables become cards below 560 px; no horizontal scroll.
At a desk the lenses are read side by side with the Yamazumi. The order of the page is
the lean page's: tiles, sentence, cost, then the lens, then what was agreed.

## 9. Failure handling
- No takt: timing and the Times lens work; takt-dependent lines say what is needed.
- No time on a step: not counted as zero; "Not timed yet"; the proposal and ECRS "after"
  withheld with the reason.
- A loop in the order: refused at the choice ("Seal already must follow Fill — it cannot
  also come before it"); a loop that arrives from another device is named and the proposal
  withheld.
- A machine step with no step before it starts at 0; with no person step after it the person
  waits the whole run (said).
- N′ with l or m zero: not defined — the sentence says what to add.
- A client reads everything and changes nothing (no controls drawn); `can.edit` for the work,
  `can.agree` for the allowance and takt, `can.remove` to take a person or step off.
- Offline: all of it works (local); sync merges steps and laps by id.
- A reused step whose source is later deleted keeps its basic time and source name.

## 10. Integration
Reads/writes the one `balance` study (`facts.steps` with `after`, `ecrs`, `reuse`, kind
`machine`; `facts.tend`; `agreed.balance.parts`); no migration (the study's JSON), the schema
test is unaffected. Shows wherever the balance shows: Line balance — one product and every
product (its sentence), All together (the person bars: a machine's wait is a hollow part), the
line standard's card ("the work" line), Line capacity (a people station takes the person's
cycle, now the longer of person and machine), the video study's balance (read by the same
`balance()`, unchanged), the 6M fishbone and the fix's Prove it (unchanged). `docs/PAGES.md` and
`scripts/inventory/pages.mjs` gain the lenses. Cost via `balanceLink.costInputs` (one model).
Gate: `scripts/acceptance/time-study.mjs`, and `work-balance.mjs` unchanged and green.

## 11. Verification
Unit tests: `src/tools/linework/__tests__/method.test.ts` (the independent cases above, edge
cases: n = 1 lap, all laps equal, a loop, an over-takt single step, a machine with no time, no
precedence = the old fill, old records read as before) and the existing `balance.test.ts`,
`balanceLink.test.ts` unchanged. Acceptance: `scripts/acceptance/time-study.mjs`; screenshots
of the lenses at desk and phone.

**Acceptance criteria.** (script = `scripts/acceptance/time-study.mjs` unless a unit test is named)
1. Margin, basic and standard match the independent cases (§1) — unit test *a timed element*; the
   Times row reads the same module — script step 1.
2. After Stop timing, an unrated timed step is offered its pace, one tap rates it, and the
   standard moves as the module says; *Leave at 100* leaves it "not rated — 100" — script step 2.
3. Allowance built from parts equals Σ%; 42.0 s with the parts of §2 gives 48.300 s and 74.5 an
   hour; the money sentence matches the module; no percentage is pre-filled and the page says the
   table is not offered — unit test *allowance from parts*; script step 3.
4. A machine step is not rated, carries no allowance, and the cycle is the longer of person and
   machine; §3 cases — unit test *timeline*; script step 4 (the Person and machine lens chart and
   sentence read the module).
5. N′ and the rows for n match §4; the either-side sentence; the unsuitability line is shown —
   unit test *machines tended*; script step 5.
6. Ranked positional weight matches §5 (weights, stations, minimum, efficiency); a loop is refused;
   a placed-before-predecessor flag; with no order the old suggestion is unchanged — unit tests
   *ranked positional weight*, *a loop*, *no order*; script step 6 (Order of work; *Use it* moves the
   steps).
7. ECRS: the §6 case (49 → 30 s, 38.8% less, 122.5% → 75% of takt, £0.07917, £7.125/h, 16.8 h); the
   decision survives a reload; an Eliminate with no reason is flagged — unit test *method questions*;
   script step 7.
8. Standard data: the §7 case; a reused step shows its source and takes this balance's allowance;
   timing it here replaces the reuse — unit test *standard data*; script step 8.
9. The paper, downloaded and read back, carries Times, Combination table, Machines, Order and Method
   questions as the screen says them, and an old balance's paper still carries what it did —
   script step 9 (pdftotext).
10. A client sees every lens and changes nothing; an owner (`can.agree`) changes the allowance; a
    team member (`can.edit`) cannot — script step 10.
11. The phone (390 px): every lens fits, no horizontal scroll; the timer still fills the screen —
    script step 11.
12. Nothing that worked is broken: `work-balance.mjs`, `line-capacity.mjs`, `video-study.mjs`,
    `control-room.mjs` pass unchanged; `smoke.mjs` shows no console error — run, reported.

*Not yet proved (said in the entries' limits):* the ILO relaxation factors against the book; the
rating anchors; random servicing; an exact balance.

## 12. Maintainability
Code in `src/tools/linework/` (`balance.ts` extended; `timeline.ts`, `order.ts`, `improve.ts`,
`allowance.ts`, `standardData.ts`; the page's lenses in `WorkLenses.tsx`; paper in
`src/lib/report/timeTable.ts`). The next extensions fit without a rewrite: the ILO table (a
`parts` preset once the figures are checked against the book), a regression element in standard
data (FC-024's rest), a precedence picture (FC-033), the process flow chart (FC-003) as a tag on a
step, two-handed charts (FC-233) as a lens on the video study's footage, random servicing (FC-047).
