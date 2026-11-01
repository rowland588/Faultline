# FC-155 — Horizontal deployment: a proved fix offered to every line with the same machine: the specification

**Catalogue:** FC-155 · **Knowledge:** `rca.horizontal-deployment` (full, practice), with `rca.pdca`, `lean.standard-work` and
`visual.action-tracking` beside it · **Asked for:** Rowland, 1 November 2026 — *"I want all tools made that get used in the
projects"*; used in PDCA's Act and 8D's D7 (`src/lib/methods.ts`) · **Status:** built 1 November on `t8-5`, **partial** (money not
said — see the limits).

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
combined line report, and the project's method page row (PDCA Act, 8D D7). What it deliberately does not cover: **the money** (the
fix's worth a week × the lines — `knowledge/MONEY.md` row FC-155 — needs the 6M problem's hours and the line's cost typed on the board,
and a rate on each receiving line; no figure is invented, the page says it is not said); **a failure mode on a different machine**
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
- *Money:* `knowledge/MONEY.md` §4 row FC-155 — the proved fix's £ a week × the lines it is offered to, the tool's (L and T through the
  6M problem). **Not said here:** the page and the paper say *"No money is said: what the fix is worth a week is on its 6M board once the
  problem’s hours and the line’s cost are typed, and each line’s own rate comes from the problems written on this machine. Nothing is
  estimated here."* Nothing is blocked by it.

## 4. Inputs
Read, nothing asked: `pace_todos` (state, `where`, `what`, `lineId`, `projectId`), `pace_ppm` (the project's line → factory line),
`ToolStudy` (`uses` of kind action, the evidence and the proof), the factory's `Workspace` (`assets`, `archived`, `madeOf`) and `Snag`
(`workspaceId`, `targetAsset`, `raisedAt`). Asked only when a line answers: the words — *what moved* or *why not* (required, one line).

## 5. Data suitability
A fix with no study before → after, or one that did not move the right way, is not offered. A fix whose countermeasure names no
machine or "Whole line" is not offered. A fix on a line with no other line holding the machine shows nothing. Nothing is estimated.

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

## 7. Outputs
**On screen** (`tools/yokoten/Spread`): on the line's page, under Eyes on the line, a section *Spread what works* — *Proved here* (the
sentence, the tally, a row a line with its rate and its state in words, *Offer it to the 3 lines ›*) and *Offered to this line* (the
fix, the proof, *Take it · It worked here… · Not for this line…*); nothing when there is neither. Only the abnormal carries colour: a
state is in words, proved the quiet green, taken and offered the under-way violet; no tile is added. On the project’s method page the
FC-155 row says the first fix not yet answered everywhere and opens the line.
**The report.** The line’s **one-page report** and the **combined line report** carry the same sentences under the tiles (a fix proved
here with where it stands; a fix offered to this line); not a paper of its own. The money is not said, in words, on the page.

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
is **not a look** (Eyes on the line does not count it). `docs/PAGES.md` gains the line’s section.

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
Not yet proved: the money (FC-155's £ a week × the lines — not built); the full gate and paper parity (the lead runs them).

## 12. Maintainability
`src/tools/yokoten/yokoten.ts` (pure), `useYokoten.ts` (the hooks and writes), `Spread.tsx` + `spread.css`. Left for later: money;
a failure mode across machines; stage-gate fixes; days from proof to proof; linking a receiving line’s proof to its own study.
