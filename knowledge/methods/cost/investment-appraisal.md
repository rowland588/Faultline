---
id: cost.investment-appraisal
name: Investment appraisal — payback, NPV and IRR on a measured saving
aka: [payback, NPV, IRR, discounted cash flow, business case, capital appraisal, return on investment]
discipline: cost
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — payback, NPV and IRR as Brealey, Myers & Allen's *Principles of Corporate Finance* give them (from knowledge); the worked SMED-kit case computed in `scripts/knowledge/cases-operations.py`; the business case was built and taken off at Rowland's word, 17 October (`docs/BLUEPRINT.md` §6) — this record is the arithmetic, kept for when a saving measured by a tool needs a figure against a spend
needs: [cost.line-cost-model]
next: []
alternatives: [sixsigma.selection-matrices]
related: [equipment.cost-deployment, quality.copq, changeover.smed]
---
# Investment appraisal — payback, NPV and IRR on a measured saving

## Purpose and principle
A tool measures a loss and a fix's expected return; the spend to get it
has a price; three figures say whether it pays: payback (how long until
the saving has repaid the cost), net present value (the saving over the
years, discounted at the company's rate, less the cost — positive means
worth doing) and the internal rate of return (the discount rate at which
NPV is zero — compared with the hurdle rate). The arithmetic is small;
what matters is that the saving is one a Faultline tool *measured* (a
loss count's minutes, a capability study's give-away, SMED's stop time)
and not a figure invented for the form — and that the saving is booked
only when re-measured after the spend.

## Questions it answers
- How long until this spend pays for itself, from the saving measured?
- Is it worth doing at the company's discount rate over its life (NPV),
  and what return is that (IRR)?
- How sensitive is the answer to the saving being half what the tool
  said?

## Inputs and minimum conditions
- The saving per period, from the tool's measurement and the money
  model (`knowledge/MONEY.md`): the loss now, the share the fix is
  expected to recover, the periods a year.
- The cost: the spend, installation, any lost production to install it,
  training; and running costs if any.
- The company's discount (hurdle) rate and the life over which the
  saving is counted (the asset's, or a policy of 3–5 years).

## Procedure and calculation
- Payback = cost ÷ saving a year (in years; × 12 for months); simple,
  ignores time value and anything after payback — the floor's first
  figure.
- NPV = Σₜ savingₜ ÷ (1 + r)ᵗ − cost, over t = 1 … life; positive →
  worth doing at r; with a constant saving S: NPV = S × [1 − (1 + r)⁻ⁿ]/r
  − cost.
- IRR: the r at which NPV = 0 (the root of the cash-flow polynomial;
  software); compared with the hurdle; a very high IRR on a small spend
  is normal for shop-floor fixes.
- Sensitivity: the three figures with the saving halved and the cost up
  a quarter — the case that survives that is robust.
- Booking: the saving is "expected" until the tool re-measures the loss
  after the spend (`equipment.cost-deployment`'s follow-up rule); the
  appraisal is kept with the measured outcome beside it.

**Worked case** (`cases-operations.py`): a £28,000 SMED kit (quick-
release jaws, pre-staging trolleys); SMED measured the changeover loss
at £1,900 a week and the plan returns 60% of it: £1,140 a week, £54,720
a year. Payback 0.51 years (6.1 months); NPV at 10% over 5 years
£179,400; IRR 195%. With the saving halved: payback 1.0 year, NPV
£75,700 — still clearly worth doing. The decision is not close; the
record's job is the measured £1,900 and the re-measurement after.

## Assumptions, limits and misuse
- A saving not measured by a tool is an assumption; the appraisal says
  where its figure comes from.
- Savings in lost-time at a non-bottleneck are not contribution (the
  two-parts rule); counting them so inflates every case.
- Discount rates and lives are company policy; say them.
- Payback alone favours quick small fixes over the better long one; NPV
  is the decision figure where lives differ.
- "The case for new equipment" as a feature was taken off at Rowland's
  word (17 October); this arithmetic serves a tool's measured saving,
  not a sales document.

## Reading the result
"The SMED kit costs £28,000 and returns £1,140 a week from the measured
changeover loss — payback six months, NPV £179,000 over five years at
10%; even at half the saving it pays in a year. Booked when SMED
re-measures the changeover." Money is the method; every input cites the
tool that measured it (`knowledge/MONEY.md`).

## When not to use it — and instead
Choosing between projects on more than money → `sixsigma.selection-matrices`.
The losses ranked to find the projects → `equipment.cost-deployment`.
The line's cost model the savings come from → `cost.line-cost-model`.

## In food and FMCG manufacturing
SMED kits, accumulation conveyors, a second case packer, a new
checkweigher, a weigher with more heads — each with a loss a tool
measured and a saving to re-measure.

## References
- [textbook] Brealey, R.A., Myers, S.C. and Allen, F., *Principles of Corporate Finance*, 13th ed., McGraw-Hill, 2020 — NPV, IRR, payback and their pitfalls (from knowledge; edition to confirm).
- [textbook] Drury, C., *Management and Cost Accounting*, 11th ed., 2021 — capital investment appraisal (from knowledge).

## In Faultline
Built as a calculator (FC-191, 31 October; `knowledge/specs/FC-191-payback-npv.md`, `src/tools/investment/investment.ts`,
`src/tools/calc/defs/payback-npv.ts`, `/calc/payback-npv`, proved by `calc-shape.mjs`): payback in running weeks, NPV at
the business's own rate over whole years, IRR, the return a year, and the two checks above (the saving halved; the cost
up a quarter), the saving typed or built from a loss and a share or from hours at the wage. The worked SMED kit above is
its first example (`scripts/knowledge/cases-calc.py` I1). The case for new equipment (FC-192) stays left out
(`docs/BLUEPRINT.md` §6). **Not yet:** an uneven cash flow; the saving read from the tool that measured it; a picture
of the cumulative cash.
