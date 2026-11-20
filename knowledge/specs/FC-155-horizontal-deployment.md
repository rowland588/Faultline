# FC-155 — Horizontal deployment: a proved fix offered to every line with the same machine: the specification

**Catalogue:** FC-155 · **Knowledge:** `rca.horizontal-deployment` (full, practice), with `rca.pdca`, `lean.standard-work` and
`visual.action-tracking` beside it · **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the
projects"*; used in PDCA's Act and 8D's D7 (`src/lib/methods.ts`) · **Status:** built 1 November on `t8-5`, **partial**; the money specified and built 20 November
(Rowland, 20 November: *"Finish all of the partly made tools"*) — §3 *Money*, §6 *In money*, criteria 10–14 — and marked
**available**: every criterion proved by a run of `yokoten.test.ts` and `horizontal-deployment.mjs`; the full gate and paper parity with
the money in are the lead's before it is merged, and a red one returns it to partial.

## 1. Purpose
A countermeasure proved on one line is worth as much again on every line with the same machine, and is never copied unless somebody
lists the lines and asks each. The sentence it lets one side say to the other that it could not before — the line lead to the
factory manager: **"Splice guide proved on Line 3 (film breaks 8.0 → 3.0 a shift) — Lines 7, 1 and 4 have the Wrapper: taken on
Line 1; offered on Lines 7 and 4."**

**Scope.** What this build covers: (1) *the proved fix* — a 6M countermeasure (a board action, `PaceTodoRow`) that is done, names a
machine on a factory line and whose own before → after (`lib/studyLinks beforeAfter`, the evidence study against the proof study) moved
the right way; (2) *the candidates* — the other live lines of the factory whose machine list holds the same machine (`machineKey`);
(3) *the offer* — one problem on each receiving line's register, made with one tap; (4) *the three answers* a line gives — take it,
it worked here (its own words), not for this line (a reason); (5) *the order* — the line with the most problems written on that
machine in 90 days first; (6) where it shows: the source line's page, the receiving line's page, the line's one-page report and the
combined line report, and the project's method page row (PDCA Act, 8D D7); (7) **the money** (20 November, `knowledge/MONEY.md`
row FC-155): what the fix is worth a week where it was proved — its 6M board's own figure, the countermeasure's share of its problem
(FC-146 `counterWorth`) — and, for every line it could go to, what it would be worth **if** the same hours a week came back there, priced
by that line's own cost model and bottleneck, with the lines not yet answered added up part by part only where every one of them can be
priced (§3, §6). What it deliberately does not cover: **a measured saving per fix** (the problem's before → now belongs to all its
countermeasures together; Faultline does not split it); **each line's own hours on the machine** (the receiving line's own stop log
as its potential — the record's "own rate × the fix's effect"; the money uses the source's hours, said as an *if*); **a failure mode on a different machine**
(the record's second candidate rule — nothing stores a failure mode apart from words); **days from proof to proof**; **linking a
receiving line's proof to a study** (a register problem cannot yet be the subject of a study's use — the line's proof is its own words);
the stage-gate fixes (`Test` of kind fix) — **FC-155 reads 6M countermeasures only**; the FMEA / control-plan update (FC-132/133).
No new record, no migration.

## 2. Users and scenarios
The line lead who proved the fix; the factory or site manager reading the Factory; the lead on the receiving line, on a phone at the
machine. (1) *A packing hall.* The splice guide is proved on Line 3; its page says Lines 7, 1 and 4 have the same wrapper, none
asked; one tap offers it to all three. (2) *Line 7* opens its page: "Offered to this line", takes it, a week later writes what moved.
(3) *Line 4* runs a different film: "Not for this line — different film" — complete, not open.

## 3. Method selection
Yokoten (Toyota, "across everywhere"; Liker 2004, Liker & Meier 2006). **Alternatives considered:** the proof on the source line →
`rca.pdca`; the cause before the fix → `rca.fishbone-5whys`; the customer-facing prevention step → `rca.eight-d`; the standard the fix
becomes → `lean.standard-work`. **Unsuitable when:** the fix is half-proved (the module offers only a before → after that moved the
right way); the machine is not the same make and model (the module matches the machine's *name*, as the app does everywhere; a
different model of the same name is the receiving line's to decline, with a reason).

**Established · assumed · chosen.**
- *Established:* the practice — offer the proved fix sideways with its evidence, each receiving place checks it works there; a fix
  copied without checking is a rumour; a decline with a reason is complete, an unanswered offer is open (the record).
- *Assumed:* a machine of the same name (`machineKey`: case and spacing never make two) is the same machine; "Whole line" is not a
  machine; an archived line and a dual line (made of other lines) are not candidates (a dual line's machines are its lines').
- *Chosen (Faultline's own):* offered → taken → proved here / declined are the register's open → in progress → closed, with the words
  `Proved — …` or `Declined — …` as the close note; the *order* is the line's problems written on that machine in the last 90 days
  (the record's "its own rate of the problem", read from what is written down); the offer is a problem of category *Spread a fix* with the
  fix's id as its subcategory and a fixed id `yokoten-<fix>-<line>`, so offering twice makes one. Rowland has not named the 90 days; it is
  one constant (`RATE_DAYS`).
- *Money — `knowledge/MONEY.md` §4 row FC-155, copied:* **Horizontal deployment | the proved fix's £ a week × the lines it is offered
  to | the tool's | | |** — the causation is the 6M problem's (FC-146: **L** labour at the line's rate for every hour, **T** packs and
  contribution only where the machine stops the line), no input of its own. Built 20 November as follows.
  - *Established:* a 6M problem's hours a week in money, in two parts never blended — labour = hours × crew × wage × on-costs; packs =
    hours × 60 × rated packs a minute and contribution = packs × (price − materials, else margin) only where the scope stops the line (its
    bottleneck, or the whole line; the bottleneck not known → counted as stopping it, said) — `lib/sixmMoney problemMoney`, `lib/cost`,
    `lib/lineLoss`, `tools/losses contributionOf` (FC-146, FC-154; Goldratt 1990, Corbett 1998; Maskell & Baggaley 2004). A
    countermeasure's worth = its typed share of the problem × the problem's £ when it opened (FC-146 `counterWorth`; the A3's expected
    effect, Shook 2008).
  - *Assumed:* the fix's effect is the share its board gives it (FC-146's own assumption: the share of the hours is the share of the £);
    on another line the same hours a week come back on the same machine — an **if**, never earned.
  - *Chosen (Faultline's own, for Rowland to confirm):* (a) **where it was proved** the figure is the board's — its share × the problem's
    £ when it opened — said as *by the share its 6M board gives it*, never as measured or earned; (b) **on another line** the same hours
    (share × the problem's hours) priced by **that line's** crew, wage, on-costs, speed, margin and bottleneck — the one cost model applied
    to the line, never the source's rate × the number of lines; a machine that is not that line's bottleneck costs labour only (the line
    runs round it); (c) **the sum** covers the lines *not yet answered* (not offered, offered — the tally's *open*), the factory's money
    still on the floor; taken, proved here and declined lines are out of it, and a declined line has no *if*; (d) a part (labour, packs,
    contribution) is **added up only when every line in the sum has it** — otherwise it is not added and the lines lacking it are named
    with the input and where to give it (CLAUDE.md, *Recovery price completeness*, 18 November: no partial subtotal labelled as a total);
    (e) a week, as the 6M problem is measured — no shift or year.
  - *When an input is missing* (one sentence, nothing blocked, nothing invented): the share — *"type How much of the problem it should
    remove on the countermeasure (its 6M board)"*; a line's wage, speed or margin — *"give Yoko 4 a wage (Set up the line) to say the
    labour"*; the countermeasure on no problem, a problem measured in its own unit (ppm, %), a problem with no hours measured — each said
    once, no money.

## 4. Inputs
Read, nothing asked: `pace_todos` (state, `where`, `what`, `lineId`, `projectId`), `pace_ppm` (the project's line → factory line),
`ToolStudy` (`uses` of kind action, the evidence and the proof), the factory's `Workspace` (`assets`, `archived`, `madeOf`) and `Snag`
(`workspaceId`, `targetAsset`, `raisedAt`). Asked only when a line answers: the words — *what moved* or *why not* (required, one line).
For the money, read and never asked here: the countermeasure's problem (`caseId` / `causeRef`) and its share (`expectPct`, typed on the
6M board), the problem's measure and money as the board works them (`lib/useProblems loadProblems` → `lib/fishbone buildView`), and
each line's cost model (`Workspace` crew, wage, on-costs, packs a minute, margin or price and materials) and Line capacity (`Standard`s →
`lib/lineLoss neckOf`). Nothing new is stored.

## 5. Data suitability
A fix with no study before → after, or one that did not move the right way, is not offered. A fix whose countermeasure names no
machine or "Whole line" is not offered. A fix on a line with no other line holding the machine shows nothing. Nothing is estimated.
The money needs the countermeasure on a 6M problem measured in hours a week with a share typed; without one, the fix and its offers are
still made and answered, and the one missing thing is said (§6, case 7). A line's missing wage, speed or margin leaves that part unsaid
on its row and out of the sum, named.

## 6. Calculations
`proved(a) = a.state = done ∧ machine(a) ≠ whole-line ∧ beforeAfter(studies, a.id, 'action').tone = 'g'`.
`candidates(a) = { L ≠ source : ¬archived(L) ∧ ¬dual(L) ∧ machineKey(a.machine) ∈ { machineKey(m) : m ∈ L.machines } }`.
`rate(L, m) = |{ problems on L with machineKey(targetAsset) = machineKey(m), raised within 90 days, not an offer }|`; candidates sorted
by rate descending, then name. `open = notOffered + offered` (a decline with a reason, a taken and a proved offer are not open).

**Independent worked case** (the record's, hand-worked): a splice guide proved on Line 3 — the same wrapper on Lines 1, 4 and 7; lines'
own break rates Line 7 six, Line 1 four, Line 4 two → the offers rank **7, 1, 4**; offered to all three, taken on Line 1, proved on none:
tally 3 lines · 0 proved · 1 taken · 2 offered not answered · 0 declined · 0 not offered; open 2. Unit test `yokoten.test.ts`
(*the record’s worked case*); the same case is driven in the browser by `horizontal-deployment.mjs`.

**Sentences** (the module’s): source — "*Splice guide* proved on *Line 3* (*the board’s before → after*) — *Line 7, Line 1 and Line 4* have the
*Wrapper*: taken on Line 1; offered on Line 7 and Line 4." (states in the order proved here · taken · offered · declined · not offered);
tally — "3 lines with this machine · 1 proved · 0 taken · 1 offered, not answered · 1 declined · 0 not offered"; a row — "*n* problems written
on it in 90 days"; the receiving line — "*Splice guide*: offered." / "*Splice guide*: Proved — *words*" / "*Splice guide*: Declined — *reason*"
with "Proved on *Line 3*."; the method row — "*Splice guide* proved on *Line 3* — 3 lines with the Wrapper, 3 not yet answered." Always: "A fix
copied is a rumour until the line proves it: each line checks it works there, by its own before → after."

**In money** (20 November; `tools/yokoten` `fixMoneyOf`, `lineIfOf`, `spreadIfOf` and their sentences — arithmetic by `lib/sixmMoney`,
never a second model). Symbols: *s* the fix's share (%, typed on its 6M board); *h*ₚ the problem's hours a week when it opened (else
now); per hour on a line *L* = crew × wage × on-costs, *P* = 60 × packs a minute where the machine stops that line (else 0), *C* = *P* ×
contribution a pack.
- Where it was proved: *h* = *s*/100 × *h*ₚ; worth = counterWorth(*s*) = *h* × (*L*, *P*, *C*) of the source line, as its board says it.
- On a line *i* it could go to: if = *h* × (*L*ᵢ, *P*ᵢ, *C*ᵢ), *P*ᵢ and *C*ᵢ = 0 where the machine is not line *i*'s bottleneck; counted
  as stopping where line *i*'s bottleneck is not known (said).
- The sum over the lines not yet answered *O*: Σ*L*ᵢ when every *i* ∈ *O* has a wage, Σ*P*ᵢ when every one has its packs (a speed, or the
  line runs round the machine), Σ*C*ᵢ when every one has its contribution; otherwise that part is not added and the lines are named.

**Independent cases** (`scripts/knowledge/cases-rca.py`, *Horizontal deployment in money*, plain arithmetic; `yokoten.test.ts` *in
money*; the same records driven by `horizontal-deployment.mjs`): the source Line 3 is FC-146's (crew 5, £14.80, × 1.3, 60 a minute,
6p a pack); its 6M problem 3 h a week on the line; the splice guide's share 40%.
1. Where it was proved: 1.2 h a week → £115.44 labour · 4,320 packs · £259.20 contribution a week (FC-146 case 7).
2. Line 7 (crew 4, £12.50, × 1.25, 80 a minute, 5p; no Line capacity): £75.00 · 5,760 packs · £288.00, counted as stopping the line.
3. Line 1 (crew 3, £13.00, × 1.2, 70 a minute, 4p; its Line capacity's bottleneck the Sealer, 50 against the Wrapper's 100): £56.16
   labour only — the line runs round the Wrapper.
4. Line 4 (no wage; 50 a minute, 6p; no Line capacity): 3,600 packs · £216.00; the labour asked for.
5. The three not yet answered: 9,360 packs · £504.00 contribution; the labour not added up (Line 4 has no wage).
6. Line 1 proved it, Line 4 declined: Line 7 alone — £75.00 · 5,760 packs · £288.00.
7. No share typed; the countermeasure on no problem; a problem in ppm; a problem with no hours — no money, each said once.

**Sentences** (the module's, as the acceptance reads them on Yoko lines): where it was proved — "What it is worth on *Line 3*, by the
share its 6M board gives it — 40% of the problem’s 3 h a week, so 1.2 h a week: £115 labour · 4,320 packs · £259 contribution a week."; a
line's row (on the source's page, *there*) and an offer (on the receiving line's own page, *here*) — "If the same 1.2 h a week comes back
there: £75 labour · 5,760 packs · £288 contribution a week — counted as stopping the line: *Line 7*’s bottleneck is not known until its
capacity is counted." / "… there: £56 labour a week — the Wrapper is not *Line 1*’s bottleneck, so the line runs round it." / "… there:
3,600 packs · £216 contribution a week — counted as stopping the line: …; give *Line 4* a wage (Set up the line) to say the labour."; the
sum — "If it brings back the same 1.2 h a week on the 3 lines not yet answered: 9,360 packs · £504 contribution a week — an if, not
earned: each line proves it by its own before → after. The labour is not added up — *Line 4* has no wage (Set up the line). The packs
are counted as stopping the line on *Line 7* and *Line 4*, whose bottleneck is not known."; no share — "No money is said: its 6M board
gives it no share of the problem — type How much of the problem it should remove on the countermeasure (its 6M board) to say what it
is worth, here and on every line." The method row adds the sum to its sentence.

## 7. Outputs
**On screen** (`tools/yokoten/Spread`): on the line's page, under Eyes on the line, a section *Spread what works* — *Proved here* (the
sentence, the tally, a row a line with its rate and its state in words, *Offer it to the 3 lines ›*) and *Offered to this line* (the
fix, the proof, *Take it · It worked here… · Not for this line…*); nothing when there is neither. Only the abnormal carries colour: a
state is in words, proved the quiet green, taken and offered the under-way violet; no tile is added. On the project’s method page the
FC-155 row says the first fix not yet answered everywhere and opens the line.
**The money on screen:** under a proved fix's tally, what it is worth where it was proved (`.yk-money`) and the sum over the lines not
yet answered (`.yk-if`); on each line's row its own *if* (`.yk-worth`, none on a declined line); on an offer, the *if* for this line
(`.yk-money`). Money is words in the detail size, never a colour or a tile; the cost is one output beside the states (MONEY.md rule 4).
**The report.** The line’s **one-page report** and the **combined line report** carry the same sentences under the tiles (a fix proved
here with where it stands, what it is worth there and the sum over the lines not yet answered; a fix offered to this line with its *if*
here); not a paper of its own.

## 8. Manufacturing usability
Zero taps to read it on the line the fix was proved on; one tap to offer it to every line; the answers on a phone at the machine,
44 px, a line of words each. 

## 9. Failure handling
A countermeasure deleted after its offers: the offers stay, read "another line" as the source. An offer deleted from the register is
not offered again by accident (the next *Offer it* makes it afresh). Offline: reads and writes the device and syncs as any problem.

## 10. Integration
Reads existing records; writes only `snags` (a problem on the receiving line’s register, category *Spread a fix*), which sync already.
It shows wherever its parent shows: the line’s page and papers, the register (the offer is a problem of its own — priority, owner, day
set there), the Actions page and the control room (which read the register’s problems), and PDCA Act’s / 8D D7’s method row. An offer
is **not a look** (Eyes on the line does not count it). `docs/PAGES.md` gains the line’s section. The money reads the 6M board's own
reader (`lib/useProblems loadProblems`, `lib/fishbone buildView` — the problem card's figure, FC-146) and each line's cost model and
Line capacity; it writes nothing, and a change to the share, a wage or a Line capacity moves it with no reload.

## 11. Verification
Unit: `src/tools/yokoten/__tests__/yokoten.test.ts` on the worked case, the states, the answers, the rate window and what is proved.
Acceptance: `scripts/acceptance/horizontal-deployment.mjs`.

**Acceptance criteria.**
1. Only a done, machine-named countermeasure with a before → after that moved the right way is a proved fix — *proved by*
   `yokoten.test.ts` (`what is proved`) and `horizontal-deployment.mjs` step 1.
2. The candidates are the other live, non-dual lines holding the same machine by `machineKey`, ordered by their own rate 7 (6), 1 (4),
   4 (2) — `yokoten.test.ts` (`the record’s worked case`); `horizontal-deployment.mjs` step 1.
3. The sentences, tally and rows on the page are the module’s words — `horizontal-deployment.mjs` steps 1 and 3.
4. One tap offers to every line not yet asked; each offer is one open problem with a fixed id on the receiving line’s register; offering
   again makes none — `horizontal-deployment.mjs` step 2.
5. Take it, it worked here (words required) and not for this line (a reason required) move the offer to taken, proved and declined;
   a decline with a reason is complete, an unanswered offer is open; the source line’s sentence and tally move with no reload —
   `yokoten.test.ts` (`states and answers`); `horizontal-deployment.mjs` step 3.
6. An offer is a problem of its own on the register and is not a look — `horizontal-deployment.mjs` step 4.
7. The line’s one-page report and the combined line report, downloaded and read back, carry the sentences; the receiving line’s says
   what was offered — `horizontal-deployment.mjs` step 5.
8. The method page’s FC-155 row says the fix and how many lines are not yet answered, and opens the line — step 1b.
9. The phone: nothing off the side, 44 px targets — step 6.
10. The money where it was proved is the 6M board's own figure for the countermeasure (FC-146 `counterWorth`: 40% of 3 h a week = 1.2 h,
    £115 labour · 4,320 packs · £259 contribution a week), said as the board's share and never as earned — `yokoten.test.ts` (*in money*,
    case 1); `horizontal-deployment.mjs` step 7 (the sentence on Yoko 3's page equal to the module's, and to `counterWorth` read from
    the board's own reader).
11. Each line it could go to says its own *if*, priced by its own cost model and bottleneck — Yoko 7 £75 · 5,760 packs · £288 counted as
    stopping; Yoko 1 £56 labour only, the line runs round the Wrapper; Yoko 4 3,600 packs · £216 with its wage asked for; a declined line
    none — `yokoten.test.ts` (cases 2–4, 6); `horizontal-deployment.mjs` steps 7 and 8.
12. The sum covers the lines not yet answered and adds a part only when every one of them has it, naming the line and the input
    otherwise (9,360 packs · £504, the labour not added up — Yoko 4 has no wage; then Yoko 7 alone once the others answered), and moves
    with the answers and a wage typed with no reload — `yokoten.test.ts` (case 5); `horizontal-deployment.mjs` steps 7, 8 and 9.
13. A fix with no share says no money once and names where to give the share; on no problem, a problem in its own unit and a problem
    with no hours each say so; nothing is estimated — `yokoten.test.ts` (case 7); `horizontal-deployment.mjs` step 10.
14. The papers carry the money: the source's one-page report the worth there and the sum; the receiving line's one-page report its own
    *if*; the combined report's page the same sentences; the method row the sum; the phone with the money fits — `horizontal-deployment.mjs`
    steps 1b, 5 and 6.
Proved 20 November by `npx vitest run src/tools/yokoten` (16 tests) and `node scripts/acceptance/horizontal-deployment.mjs` (all passed, desk
and phone, both papers read back). Not yet proved: the full gate and paper parity with the money in (the lead runs them before merging;
the line papers change by the money's sentences, meant — exempt them in `scripts/paper-parity.mjs` if the parity names them).

## 12. Maintainability
`src/tools/yokoten/yokoten.ts` (pure — the money in `fixMoneyOf`, `lineIfOf`, `spreadIfOf` and their sentences, over `lib/sixmMoney`),
`useYokoten.ts` (the hooks and writes; the money read from the 6M board's own reader), `Spread.tsx` + `spread.css`. Left for later: each
receiving line's own hours on the machine as its potential (the record's own rate × the fix's effect); a measured saving per fix; a failure
mode across machines; stage-gate fixes; days from proof to proof; linking a receiving line’s proof to its own study.
