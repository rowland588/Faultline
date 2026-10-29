---
id: maintenance.spares-poisson
name: How many spares to hold — Poisson demand over the lead time
aka: [spares stocking, critical spares, Poisson spares model, service level for spares, insurance spares, stock-out risk]
discipline: maintenance
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the Poisson demand model for spares and the service-level stocking rule as reliability and inventory texts give them (O'Connor & Kleyner; Silver, Pyke & Thomas — from knowledge); the worked case computed independently in `scripts/knowledge/cases-maintenance.py`
needs: [maintenance.mtbf-failure-rate]
next: []
alternatives: [planning.safety-stock]
related: [maintenance.criticality, maintenance.weibull, cost.inventory-carrying-cost]
---
# How many spares to hold — Poisson demand over the lead time

## Purpose and principle
A spare that is not on the shelf costs the line its lead time; a spare
that is costs its price and its shelf. For parts that fail at random the
number needed over a lead time follows a Poisson distribution with mean
(failure rate × parts installed × lead time), and the stock that keeps
the chance of running out below a chosen level is read straight off it.
The level is chosen by what a stock-out costs — for a part that stops
the line, almost any stock is cheaper than one lead time without it.

## Questions it answers
- How many of this part should be on the shelf?
- What is the chance of running out before the next delivery at the
  stock held now?
- Is the holding cost of one more spare less than the stock-out it
  prevents?

## Inputs and minimum conditions
- The part's failure rate λ (from its MTBF — `maintenance.mtbf-failure-rate`
  — or the supplier's figure), the number installed n, and the lead time
  L to get another (in the same time unit).
- The service level wanted (the chance of *not* running out over a lead
  time), chosen by criticality (`maintenance.criticality`).
- The part's price and the holding rate; what a stock-out costs (the
  line's lost contribution over the lead time, `knowledge/MONEY.md` T).

## Procedure and calculation
- Expected demand over the lead time μ = λ·n·L.
- Stock s = the smallest integer with P(Poisson(μ) ≤ s) ≥ service level;
  the chance of a stock-out at s is 1 − P(X ≤ s).
- With zero held: P(no demand in L) = e^(−μ) — the risk of running with
  none.
- Holding cost a year ≈ s × price × holding rate (20–25% a year is a
  common all-in rate — capital, space, obsolescence; the site's own
  figure where it has one); stock-out cost ≈ P(stock-out per lead time)
  × (lead-time cycles a year) × (lost contribution over L + the
  emergency premium).
- One more spare is worth holding while its added holding cost is less
  than the stock-out cost it removes (the marginal rule).
- Wear-out parts (β > 1, `maintenance.weibull`) are not Poisson: their
  demand is predictable by age — replace on schedule and hold the
  schedule's parts, plus a small Poisson stock for the random mode.
- Repairable parts: the pipeline (parts out for repair) adds to the
  demand over the repair turnaround time.
- Fleet pooling: n parts across lines share one stock; μ sums, and the
  stock needed grows more slowly than the lines.

**Worked case** (`cases-maintenance.py`): a seal-jaw heater, 4 installed
on the line, MTBF 1,100 h (λ = 1/1,100 per hour), lead time 3 weeks
(504 h). μ = 1.83 heaters per lead time. Stock 4 gives a 96% service
level (so 90% and 95% both land on 4); 99% needs 6. Holding none: a 16%
chance of no demand in the lead time — an 84% chance of needing one.
Holding 4 at £180 each at 20% a year costs £144 a year; one stock-out
costs 3 weeks of a heater down — at a line that loses £X a minute when a
jaw is out, the comparison is not close. A part that does *not* stop the
line (a spare pump with a bypass) takes a 90% level and a stock of 1 or
2.

## Assumptions, limits and misuse
- The Poisson needs a random failure mode; a wear-out part's demand is
  not Poisson and is better met by scheduled replacement.
- λ from a handful of failures is uncertain; the stock is set with the
  upper bound of the MTBF's interval in mind, or revisited after each
  failure.
- The lead time is the real one (order, ship, customs, fit), not the
  catalogue's.
- Service level per lead time is not per year; over 17 lead times a year
  a 95% level is a stock-out almost every year.
- Holding cost rates are a policy, not a fact; say the rate used.
- Obsolescence: a part the OEM is dropping needs a lifetime buy, a
  different sum.

## Reading the result
"Hold 4 jaw heaters: with 4 on the line and a 3-week lead time we expect
about 2 failures per lead time, and 4 on the shelf covers 96% of lead
times. Holding them costs about £144 a year; one stock-out costs the
line 3 weeks of a jaw." Money: the holding cost against the stock-out's
lost contribution (`knowledge/MONEY.md`, T and the carrying rule in
`cost.inventory-carrying-cost`), per part, so the shelf is a decision
and not a habit.

## When not to use it — and instead
Production materials and their safety stock → `planning.safety-stock`.
A wear-out part's replacement age → `maintenance.weibull`. Which parts
to look at first → `maintenance.criticality`.

## In food and FMCG manufacturing
Jaw heaters and thermocouples, sensors and photo-eyes, belts, seals and
gaskets, printheads, load cells, PLC cards, drive units — the long-lead
parts whose absence turns a 20-minute repair into a 3-week stop.

## References
- [textbook] O'Connor, P.D.T. and Kleyner, A., *Practical Reliability Engineering*, 5th ed., Wiley, 2012 — spares provisioning by the Poisson distribution (from knowledge).
- [textbook] Silver, E.A., Pyke, D.F. and Thomas, D.J., *Inventory and Production Management in Supply Chains*, 4th ed., CRC, 2017 — slow-moving and insurance spares (from knowledge).
- [textbook] Sherbrooke, C.C., *Optimal Inventory Modeling of Systems: Multi-Echelon Techniques*, 2nd ed., Kluwer, 2004 — the pipeline for repairables (from knowledge).

## In Faultline
Built (FC-066): calculator `critical-spares` at `#/calc/critical-spares`
(`src/tools/calc/defs/critical-spares.ts`, `src/lib/ie/spares.ts`). The
reliability study gives a machine's MTBF and its bound (`src/tools/reliability`);
FC-066 takes a part's MTBF, the number
installed and the lead time, says the stock for the level chosen with
the stock-out risk at the stock held now, and sets the holding cost
against the line's lost contribution over a lead time in money.
