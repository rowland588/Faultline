# FC-024 — Standard data: timed steps reused across products, pooled and worked out by a time formula: the specification

**Catalogue:** FC-024 Standard data — timed elements reused across products (a part of FC-032, the Line balance; built
in part on 25 October under `knowledge/specs/FC-032-line-balance.md` §3 chosen 9 and §6.7, finished here) ·
**Knowledge:** `knowledge/methods/ie/standard-data.md` (the library, time formulas, the new job, the consistency check,
validation, maintenance), `ie/time-study.md` (basic time), `stats/correlation-regression.md` (the least-squares line),
`knowledge/MONEY.md` §4 (FC-024) · **Asked for:** Rowland, 20 November: *"Finish all of the partly made tools."* The
entry's question: *"What will this new format's work take, from what we have already timed?"* · **Status:** built 20
November on branch `agent4`; `scripts/acceptance/time-study.mjs` step 8 (8a–8f) proves it.

## 1. Purpose
A new pack format on a hand-packing line should not have to be timed from scratch. Its steps were mostly timed already
on the line's other products — often at another pack count. Standard data offers those timings, pools the same step
timed on several products into one time with its spread, and, where a step's time grows with what it handles ("place
the packs" with 6, 12 or 24 in the tray), fits the line's own time formula, *basic = a + b × count*, by least squares
and works the new format's time out at its count — with how sure that is, and a guess said as a guess. The sentence it
lets the IE say to the ops lead: *"The 15-pack tray's placing is 11.8 s basic from the line's own formula (four
products, ±4.4% at 95%) — we can crew it before the trial; we will time it in its first week and say how far apart it
is."*

**Scope.** In the Line balance's **Times** lens (`#/w/:ws/standards/:id?at=balance&view=work&lens=times`), its first
tab's step tools and its paper (`src/lib/report/timeTable.ts` through `lib/studiesPdf`):
1. *The library* (built 25 October): every step timed on the newest balance of each other product of the same line,
   with its basic time, its cycles, its product and — new — its date and the count it handles; *Use it* borrows one.
2. *The count a step handles* (new): an optional number on a step, with its word (packs, trays, metres), set in the
   step's Edit tools and shown with its name wherever the step is listed.
3. *Pooled* (new): the same step timed on two or more products at one count (or none) offered as **the mean of their
   timings**, with its spread, how many studies and ±% at 95%.
4. *A time formula* (new): the same step timed at two or more different counts offered as **basic = a + b × count**
   (ordinary least squares), with R², the counts it rests on, and — at the count asked — the time, ±% at 95% for that
   mean time, and whether that count is inside the counts timed; *Use it* at a typed count. A step borrowed from a
   formula follows its count: change the count and its time is worked out again.
5. *Validation* (new): a borrowed step later timed here keeps where its borrowed time came from, and says how far
   apart the two are; more than 10% apart is said in amber (the record's rule of thumb).
6. *The paper*: every count, every borrowed time's source (one product, the mean of several, or the formula with the
   timings it rests on), and every validation line, as the page says them.

Left out, each said on the page or in the entry's limits: a time that depends on **two or more** variables at once
(distance *and* weight — multiple regression is FC-107's, not offered here); **frequencies** as a field (a step done
twice a cycle is listed twice, as before); the **consistency check across lines** (the library is one line's — another
line's products are not offered, FC-032 chosen 9); **pooling by person** (the record's "three studies, two people":
studies are counted, people are not — a balance's "Op 1" on two products need not be one person); a licensed
predetermined system (FC-023); a library kept apart from the balances (there is no fifth noun: the library *is* the
line's timed balances, read).

## 2. Users and scenarios
The industrial engineer or team leader at a desk planning a new format before its trial, or on the phone at the line
listing a new product's work. Food first: a tray-loading line running 6-, 12-, 18- and 24-pack trays of potatoes,
where "place the packs" was timed on four of them and a 15-pack tray is coming; the same "erect the case" timed on three
products, which should be one time; a step borrowed for a new format, timed in its first week and found 13% slower.

## 3. Method selection
The record's procedure, as written in `ie.standard-data`: a library of element times from rated studies; a time formula
where an element's time depends on a variable, "fitted by regression of the element's basic time on its variable(s) …
'place n packs' = a + b·n"; a new job's basic time as the sum of its elements; validation of the synthetic standard
against a short study once the job runs, a gap over 10% sending the element back for review; the library dated. One
variable a step — the count it handles — is the case the record works ("the standard for an 18-pack case follows
without a new study"). Not used, and why: multiple regression (two variables) — the record allows it, but the line's
products rarely vary two things independently enough to separate them, and FC-107 already does it on readings the
person pastes; predetermined motion times (FC-023, licensed); a fresh time study (`ie.time-study`) — that is what the
borrowed time stands in for until the job runs, and timing it replaces the borrowed time.

**Established · assumed · chosen.**

*Established* (with source): the library, the time formula, the new job as the sum of its elements, the validation
against a study and the dates (`ie.standard-data`: Kanawaty, *Introduction to Work Study*, 4th ed., ILO 1992, ch. 26;
Freivalds & Niebel, *Niebel's Methods, Standards, and Work Design*, 13th ed., ch. 12 — the record's, from knowledge);
basic = observed × rating ÷ 100 and standard = basic × (1 + allowance) (as FC-019, FC-032 §3); ordinary least squares
for one variable — b = Sxy ÷ Sxx, a = ȳ − b·x̄, s = √(RSS ÷ (k − 2)), R² = 1 − RSS ÷ Syy — and the confidence interval of
the mean response at x₀, ŷ ± t(k − 2)·s·√(1/k + (x₀ − x̄)² ÷ Sxx) (`stats.correlation-regression`; Montgomery & Runger,
*Applied Statistics and Probability for Engineers*, ch. 11); the mean of k studies and its interval x̄ ± t(k − 1)·s ÷ √k
(as the time study's own margin, FC-019); a prediction outside the range of the counts timed is an extrapolation (any
regression text). Money: as FC-019 for the elements reused — the labour of the step at the line's rate
(`knowledge/MONEY.md` §4, FC-024: L, wage), carried by the balance's existing cost lines; standard data adds no money
line of its own.

*Assumed*, and said on the page: a step on two products with the same name (numbers and "the" aside) and the same kind
of time is the same element, with the same start and end points (the record: "element boundaries that drift between
studies make the library inconsistent") — the person reads the products and the date beside each and judges the match;
the count is what drives the time (the R² and the timings it rests on are shown so a poor fit is seen); the timings on
the other products were rated by a trained observer (FC-019).

*Chosen* (the builder, 20 November — each said where the figure is read; Rowland's to change):
1. **What is pooled or fitted**: only steps *timed* (laps, rated) on the newest balance of each other product of the
   line. A typed time, a borrowed time and a time worked out from a formula never feed a formula or a mean — a copy
   would count twice and a formula would feed itself.
2. **The same step**: the same kind of time and the same words in its name, numbers and "the" aside (so "Place 12
   packs" and "Place the packs" are one step); a step whose counts are given in two different words (packs on one
   product, trays on another) is not put on one line, and says so.
3. **Two counts make a formula, three make it sure**: two different counts give a line through two timings, offered
   and said to have no measure of how sure it is; with three or more timings the ±% at 95% is given. Points without a
   count in a group that has a formula are left out of it and counted ("1 timing without a count is left out").
4. **Enough** for a borrowed time worked from several products: at least three timings (the record's "three studies
   is a minimum"), the count inside those timed, and ±5% or better at 95% — the same target the time study holds a
   step to (FC-019's k = 0.05). Otherwise it is offered, used and marked *short of enough* in amber, never refused.
5. **Beyond the counts timed** the time is worked out and said to be a guess ("30 packs is beyond the 6 to 24 timed —
   a guess; time it"), never withheld; a formula that gives no time above nought at the count asked is not used.
6. **Validation's 10%**: the record's own figure ("a gap over 10% sends the element back to the library for review"),
   said as the record's rule of thumb, not a standard; the gap is the time timed here against the time borrowed, as a
   share of the borrowed.
7. **The library's date** is the newest timing's day (the balance's start), said "timed 18 Nov".

## 4. Inputs
| Field | Unit / type | Required | Validation | Where |
|---|---|---|---|---|
| How many it handles each cycle | a count > 0 | no | a number above nought, else cleared | a step's Edit tools (first tab) |
| Of what | a word (packs, trays, metres) | no | trimmed | beside the count |
| The count to work a formula out at | a count > 0 | to Use a formula | above nought; *Use it* held until given | Times › Standard data, a formula's row |
| Whose step it becomes | a person on the balance | — (the last person) | one of the balance's people | Times › Standard data (as before) |

Read, never asked again: the other products' timed steps (their laps, pace, product and date), this balance's allowance
(it goes on every borrowed time), the line's rate for money (FC-032's cost lines).

## 5. Data suitability
- A formula needs two different counts; with two timings it is a line through two points and says so; ±% needs three.
- A mean of several products needs two timings; under three it is *short of enough*.
- A count outside the counts timed: worked out, said as a guess, not enough.
- A step's count given in different words on different products: not fitted, said.
- A timing on one product is one row, as before ("from 6 cycles, enough") — the record's minimum of three studies
  applies to the pooled and fitted times, which are what "the library's time for a step" means.

## 6. Calculations
(symbols: k the timings used, xᵢ their counts, yᵢ their basic times, t Student's t at 95% two-sided.)
1. Pooled (one count or none, k ≥ 2): basic = ȳ; s = the sample sd of yᵢ; half = t(k − 1)·s ÷ √k; margin = half ÷ ȳ.
2. Formula (two or more different counts): x̄, ȳ, Sxx = Σ(xᵢ − x̄)², Sxy = Σ(xᵢ − x̄)(yᵢ − ȳ); b = Sxy ÷ Sxx; a = ȳ − b·x̄;
   with k ≥ 3: RSS = Σ(yᵢ − a − b·xᵢ)², s = √(RSS ÷ (k − 2)), R² = 1 − RSS ÷ Syy (1 when Syy is nought); at x₀:
   ŷ = a + b·x₀, half = t(k − 2)·s·√(1/k + (x₀ − x̄)² ÷ Sxx), margin = half ÷ ŷ, inside = min xᵢ ≤ x₀ ≤ max xᵢ.
3. Used here: standard = ŷ (or ȳ) × (1 + this balance's allowance), as every borrowed time (FC-032 §6.7).
4. Validation: gap = (basic timed here − basic borrowed) ÷ basic borrowed; flagged when |gap| > 0.10.

Independent cases (`scripts/knowledge/cases-time.py` §7b, NumPy and SciPy's `linregress` and `t.ppf`, each a unit test
in `src/tools/linework/__tests__/standardData.test.ts`):
- F1 the record's formula: (6, 5.4), (12, 9.6), (24, 18.0) → a 1.2, b 0.7, at 12 packs 9.6 s and at 18 13.8 s, s 0.
- F2 noisy, three timings: (6, 5.5), (12, 9.4), (24, 18.1) → a 1.150000, b 0.703571, R² 0.999305, s 0.240535, t(1)
  12.7062; at 18: 13.814286 ± 2.000810 (14.48%, inside, short); at 30: 22.257143 ± 4.165019 (18.71%, beyond).
- F3 two timings (6, 5.5), (12, 9.4) → a 1.6, b 0.65, at 18 13.3; no s.
- F4 four timings (6, 5.5), (12, 9.4), (18, 14.1), (24, 18.1) → a 1.150000, b 0.708333, R² 0.998728, s 0.239792, t(2)
  4.3027; at 18: 13.900000 ± 0.565107 (4.07%, enough); at 15: 11.775000 ± 0.515870 (4.38%, enough); at 9:
  7.525000 ± 0.692112 (9.20%, short); at 30: 22.400000 ± 1.263618 (5.64%, beyond).
- P1 pooled 4.1, 4.2, 4.15 → 4.15 s, sd 0.05, t(2) 4.3027, ±2.99% (enough). P2 pooled 4.0, 4.6 → 4.3, ±88.65% (short).
- V validation: borrowed 4.15, timed here 4.7 → 13.25% more, flagged.

## 7. Outputs
Screen — **Times › Standard data**, in this order: the lede (what it offers, that a count on a step lets the line's
formula work a time out, that the person judges whether two steps are the same); the share reused (as before);
**Timed on several products** — a row each: *"Place the packs — timed on 4 products at 6 to 24 packs: basic = 1.15 +
0.71 × packs, R² 99.9%."* with a count box (*at … packs*), what it gives there (*"at 15 packs: 11.8 s basic, ±4.4% at
95%"*, or the guess, or short of enough in amber) and *Use it*; *"Erect the case — the mean of 3 products’ timings:
4.15 s basic, spread 0.05 s, ±3.0% at 95%."* and *Use it*; then **each product's timings** as before, each with its
date and count. The Times table: a step's name carries its count (*Place the packs · 15 packs*); a borrowed step's ±
column says where it came from in words (`reuseSays`); a step timed here that was borrowed carries its check line. The
first tab: a step's sentence says the same (`elementSays`); its Edit tools ask *How many it handles each cycle* and
*of what*.

Sentences (exact, from `standardData.ts` and `balance.ts`):
- borrowed from a formula: *"worked out from the line’s time formula over 4 products’ timings — 1.15 + 0.71 × 15
  packs = 11.8 s basic, ±4.4% at 95%; not timed here"*; beyond: *"… = 22.4 s basic — 30 packs is beyond the 6 to 24
  timed, a guess; not timed here"*; two timings: *"… — a line through two timings, how sure it is not known; not timed
  here"*.
- borrowed as a mean: *"the mean of 3 products’ timings — 4.15 s basic, ±3.0% at 95%; not timed here"* (with
  *", short of enough"* when it is).
- validation: *"Timed here at 4.7 s basic; borrowed, it was 4.15 s (the mean of 3 products’ timings) — 13% more. More
  than 10% apart: the borrowed time wants looking at (the knowledge record’s rule of thumb, not a standard)."*
Tones: amber for short of enough, a guess, and a check over 10%; nothing red (nothing here is a failure).

**The report.** The Line balance's paper (*every product shown*, the line bundle — `lib/studiesPdf` studyBlocks →
`timeTable.timesBlocks`) prints, under *Times*: the step's count in its name column; for each borrowed step one line
*"<step>: <reuseSays>."* and, for a pooled or formula time, the timings it rests on (*"Rests on: Tray 6 at 6 packs 5.5
s (18 Nov), …"*); for each step timed here that was borrowed, the validation line. Nothing is printed when a balance
borrows nothing, so an old balance's paper is unchanged. It reads the same module as the page.

The workspace: the Times lens is the tool's existing workspace (FC-032 §7, `docs/TOOLS-DESIGN.md`) — the table, then
the allowance, then Standard data; no new tab.

## 8. Manufacturing usability
A count is one box in a step's Edit tools; a formula is used in two taps (type the count, *Use it*). On a phone (390 px)
the Standard data rows wrap, the count box is a thumb's height, nothing goes off the side.

## 9. Failure handling
- No other product timed: "No other product on this line has a timed step yet" (as before).
- A formula row with no count typed: *Use it* held, the row says "type the count to work it out at".
- A count that gives nought or less: "the formula gives no time at that count", *Use it* held.
- Counts in two words: the group says "counted in packs on one product and trays on another — not put on one line".
- A source product's balance deleted later: the borrowed step keeps the timings it rests on (copied when used) and
  its time — as a single borrowed step keeps its basic time and product (FC-032 §9).
- A client reads it all and changes nothing (no box, no *Use it*); a team member (`can.edit`) uses and counts.
- Offline: all of it is local; the new fields are the step's, merged by id.

## 10. Integration
The one `balance` study: `facts.steps[].count`, `.countOf`, and `.reuse.from` (the timings a pooled or formula time
rests on — `{ of?, at?, points[] }`), all in the study's JSON — no migration, no new noun, the schema test unaffected.
Shows wherever a step shows: the first tab's element (its sentence), Times, the paper; the borrowed time flows into
every reader of `balance()` unchanged (the person's cycle, Against takt, Line capacity's people station, All together,
the line standard's card, Improve). `docs/PAGES.md` needs no new line (the Times lens is listed).

## 11. Verification
Unit tests: `src/tools/linework/__tests__/standardData.test.ts` (the §6 cases, the grouping rules, the edge cases —
two timings, one count, counts in two words, a typed or borrowed time never feeding a formula, a count beyond, a formula
giving nought, validation) and `method.test.ts` unchanged. Acceptance: `scripts/acceptance/time-study.mjs` step 8.

**Acceptance criteria.** (script = `scripts/acceptance/time-study.mjs`)
1. The pooled time and the time formula match the independent cases F1–F4, P1–P2 and V — unit tests *pooled*,
   *a time formula*, *validation* in `standardData.test.ts`.
2. A step's count and its word are set in the step's Edit tools, kept after a reload and shown with the step's name on
   the first tab and in Times — script step 8b.
3. Four products timed at 6, 12, 18 and 24 packs are offered as one formula with the module's sentence (a 1.15, b
   0.71, R² 99.9%); at 15 packs the row says the module's time and ±; *Use it* adds the step at 15 packs with that basic
   time, this balance's allowance on it, and the reuse sentence the module's — script step 8c.
4. The step's count changed to 30: its time is worked out again and said to be a guess, amber — script step 8c.
5. The same step timed on three products at no count is offered as their mean with its spread and ±; used, it says so
   — script step 8d.
6. A borrowed step timed here says how far apart the two are; over 10% in amber as the module says it — script 8e.
7. The paper, downloaded and read back, carries the count, the formula's and the mean's sentences, the timings they
   rest on and the validation line — script step 9.
8. A client offered no count box and no *Use it* — script step 10; the phone at 390 px: Times with the formula rows
   has nothing off the side and the count box is 44 px — script step 11.
9. Nothing that worked is broken: the single-product borrow (step 8a, as before), `method.test.ts`, `balance.test.ts`,
   `work-balance.mjs` — run, reported.

*Not yet proved*: that a step named alike on two products is the same element (the person judges it); two variables
at once; frequencies as a field; the consistency check across lines.

## 12. Maintainability
`src/tools/linework/timeFormula.ts` (pure: the pooled mean, the least-squares line, a time at a count — no imports but
`lib/ie/stats`'s t), `standardData.ts` (the library, the groups, the sentences), `balance.ts` (`element()` reads a
borrowed step's time at its count; `reuseSays`, `checkSays`), `WorkLenses.tsx` (Times › Standard data),
`WorkBalance.tsx` (the step's count), `src/lib/report/timeTable.ts` (paper). Next, without a rewrite: a second variable
(the points carry their conditions; `fitPoints` would take a matrix, as `lib/ie/relate` `regress`), frequencies (a
`times` on the step multiplying its standard), the consistency check across lines (`libraryFrom` taking every line).
