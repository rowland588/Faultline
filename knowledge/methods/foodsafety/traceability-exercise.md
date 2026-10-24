---
id: foodsafety.traceability-exercise
name: The traceability exercise — one lot, forward and back, within the time
aka: [trace exercise, mock recall, one-up one-down, lot trace, mass balance trace, traceability test]
discipline: foodsafety
kind: established
evidence: law
depth: full
checked: 2026-10-24 — Regulation (EC) No 178/2002 Article 18 (traceability one step back, one step forward; retained in UK law) from knowledge; certification bodies' expectation of a completed exercise within 4 hours (BRCGS Food Issue 9 clause 3.9, named from knowledge — sources differ on whether the standard states the hours); the worked lot in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: []
alternatives: []
related: [yield.mass-balance-yield, quality.nonconformance-hold, yield.material-variance]
---
# The traceability exercise — one lot, forward and back, within the time

## Purpose and principle
When a recall comes, the site has hours to say which product is
affected and where it went — and which ingredient lots went into it.
The law requires traceability one step back and one step forward; the
standards require it to be tested: pick a lot (of finished product, or
an ingredient), trace it back to every input lot and forward to every
customer and quantity, reconcile the quantities (the mass balance), and
do it within the expected time (commonly four hours). The exercise's
measures are the share of the lot accounted for and the time taken; its
findings are the gaps in the records that a real recall would hit.

## Questions it answers
- From one finished lot: which ingredient and packaging lots, which
  customers, how much to each — and does it add up?
- From one ingredient lot: which finished lots and customers?
- How long did it take, and where did the time go (which record was
  hard to find)?
- What share of the quantity is accounted for, and what is the gap?

## Inputs and minimum conditions
- Lot codes on every receipt, issue, production record, pack and
  despatch; the links between them (which ingredient lots went into
  which batch, which batch into which packs, which packs to which
  order).
- The quantities at each link, for the balance.
- A clock started when the exercise is called.

## Procedure and calculation
- Backward trace from a finished lot: the batch records → the
  ingredient lots and packaging lots used (supplier, their lot, quantity,
  receipt date) — every one identified.
- Forward trace: the finished lot's quantity made → despatched (per
  customer, per order, per quantity) + on hold + samples + destroyed +
  in stock = the quantity made; accounted share = Σ outs ÷ made.
- Mass balance across the lot (`yield.mass-balance-yield`): ingredients
  in × the recipe against product out; the difference explained (yield
  loss, variance — `yield.material-variance`) or named as a gap.
- Time taken from the call to the completed reconciliation, against the
  expectation; the slow steps named (a paper record in a cabinet, a
  spreadsheet nobody could open).
- The findings: a lot code missing at a link, a quantity that does not
  reconcile, a customer not recorded — each an action with an owner.
- Done at least annually per the standard, better quarterly, and after
  any change to the records' systems.

**Worked case** (`cases-planning-foodsafety.py`): lot 24287 — 20,350 kg
of raw in, 48,000 packs made. Forward: 47,610 shipped to 6 customers +
310 on hold + 80 samples and destroyed = 48,000 — 100.0% accounted.
Backward: 3 ingredient lots, 2 film reels, 1 label roll — all identified
with supplier and quantity. Time: 2 h 40 min against the 4-hour
expectation; the slow step was the film reels (a paper log at goods-in).
The mass check: 48,000 × 0.412 kg = 19,776 kg against 20,350 kg in —
97.2% as product; the 574 kg is the week's material variance, explained
there.

## Assumptions, limits and misuse
- An exercise on the easiest lot (one ingredient, one customer) tests
  nothing; the lot is chosen for complexity.
- 100% accounted on paper with the mass balance unexplained is a
  reconciliation that would fail in a recall; the kilograms must close.
- Rework is the classic gap: a batch's rework into another lot links the
  two and must be recorded.
- Time measured from when the records were ready, not from the call,
  flatters the exercise.
- A quarterly exercise that finds nothing for a year is either a
  perfect system or an easy lot; vary the lot and the direction.

## Reading the result
"Trace of lot 24287: back to 3 ingredient and 3 packaging lots, forward
to 6 customers — 100% accounted, 2 h 40 min; the film-reel log at
goods-in cost 40 minutes and goes electronic." Money: the exercise's
hours (`knowledge/MONEY.md`, L) against a recall whose scope the records
decide — a gap that widens a recall from one lot to a week's production
is the cost the exercise prevents (C).

## When not to use it — and instead
The yield by stage → `yield.mass-balance-yield`. The material variance →
`yield.material-variance`. Product held during a trace →
`quality.nonconformance-hold`.

## In food and FMCG manufacturing
Every site, at least yearly; the retailer's unannounced trace request;
the real recall where the exercise's findings decide whether one lot or
a month goes back.

## References
- [law] Regulation (EC) No 178/2002, Article 18 — traceability at all stages (retained in UK law; from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 3.9 — traceability: the test of the system including a mass balance, and the time expectation (from knowledge; clause and the hours not confirmed against the text).
- [standard] ISO 22005:2007, *Traceability in the feed and food chain* (from knowledge).

## In Faultline
Not built (FC-174). The lot codes live in the site's systems; Faultline
holds the line's runs and the register's holds (`src/line`, `src/snag`).
FC-174 would record the exercise itself — the lot, the links found, the
quantities and their reconciliation, the time by step and the findings
as actions — so the gaps become work with owners and the trend of time
and accounted share is kept.
