---
id: packaging.checkweigher-verification
name: Checkweigher verification — test weights at the limits, the reject proved, the zone of indecision
aka: [checkweigher check, dynamic weigher verification, test weight check, reject verification, catchweigher, OIML R 51]
discipline: packaging
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — food-industry verification practice (from knowledge); OIML R 51 (automatic catchweighing instruments) and the UK's Weights and Measures (Packaged Goods) guidance named from knowledge — the in-service error limits are the instrument's class and the site's agreed tolerance, not reproduced from the recommendation (text not read); the worked case in `scripts/knowledge/cases-operations.py`
needs: []
next: [msa.type1-gauge]
alternatives: [msa.type1-gauge]
related: [packaging.average-quantity-system, msa.calibration, msa.bias-linearity-stability]
---
# Checkweigher verification — test weights at the limits, the reject proved, the zone of indecision

## Purpose and principle
The checkweigher is the gauge that decides, on every pack at line speed,
whether it ships. Verifying it is two checks done at the start of a run
and at intervals: that it *reads* true (certified test weights at the
low limit, the nominal and the high limit, each inside the allowed
error), and that it *acts* (a pack under the set point is rejected,
every pass, and a good one is not). Around the set point lies a zone the
instrument cannot decide — its own repeatability — and the set point sits
above the legal limit by that zone, so nothing under the limit is passed
by chance.

## Questions it answers
- Does the checkweigher read true at the limits today, and did it on
  every run this month?
- Does the reject work — proven, not assumed?
- How wide is its zone of indecision, and is the set point far enough
  above the legal limit?
- What product is at risk when a check fails (since the last good one)?

## Inputs and minimum conditions
- Certified test weights at or near the low limit, the nominal and the
  high limit for each product (a 5 g test-weight set does not verify a
  2 kg pack).
- The allowed error for the check (the instrument's class from OIML R 51
  or the site's agreed tolerance, written on the record).
- The set point and the legal minimum per product
  (`packaging.average-quantity-system`); the line speed (the check is
  dynamic — the weight passes at speed, not placed static).
- The schedule: start of run, after a product change, hourly or per
  reel, end of run; and the daily static check if the site does one.

## Procedure and calculation
- Reading check: each test weight passed at line speed 3 times (or as
  the procedure says); error = reading − certified; pass when |error| ≤
  allowed on every pass; the readings recorded as numbers, trended
  (`msa.bias-linearity-stability`'s stability chart).
- Reject check: a pack (or test pack) below the set point passed 3
  times — rejected each time; a pack above passed — accepted each time;
  a borderline pack just under the set point — rejected each time (the
  one that proves the set point, not only the mechanism).
- Zone of indecision ≈ 2–3 × the checkweigher's own standard deviation
  on repeated passes of one pack (a Type 1 study on the instrument,
  `msa.type1-gauge`); the set point is placed at least that far above
  the legal minimum (or the T1 limit) so the under-weight pack is never a
  coin toss.
- A failed check: the instrument tagged out, product since the last good
  check held and re-checked (`msa.calibration`'s product-at-risk
  arithmetic — packs = minutes since × line rate), the cause found
  (load cell, belt, vibration, a tare change), re-verified.
- Verification compliance = checks done ÷ due; failures by cause.

**Worked case** (`cases-operations.py`): test weights 395, 400, 405 g
read 395.2, 400.6, 404.8 — errors +0.2, +0.6, −0.2 g against a 1.0 g
in-service tolerance: pass, with the +0.6 at the nominal watched (the
stability chart will say whether it is drifting). Reject check: a 398 g
pack rejected 3 of 3; a 399.4 g pack (just under the 399.5 g set point)
rejected 3 of 3; a 400.6 g pack passed 3 of 3. The zone of indecision
from a 0.25 g repeatability is about 0.6 g; the set point at 399.5
against a 397 g T1 limit is well clear.

## Assumptions, limits and misuse
- A static check (the weight placed on the stopped belt) does not
  verify dynamic weighing; the weight goes through at speed.
- Test weights not certified, or stored with the product (contaminated,
  damp) drift themselves.
- "Reject tested" by pressing the test button proves the arm moves, not
  that a light pack is caught; a real under-weight pack proves it.
- A set point hugging the legal limit passes under-weight packs in the
  zone of indecision; the zone is measured, not guessed.
- Checks recorded as ticks lose the drift; the readings are numbers.
- The checkweigher's data on every pack is machine data; Faultline's
  verification is the person's check of the gauge, logged by hand.

## Reading the result
"Verified at 06:30 and 10:30: readings within 0.6 g of the test weights,
rejects proven on a 398 g and a 399.4 g pack; the +0.6 g at nominal has
been climbing a week — book a service." Money: a failed check's product
at risk (packs since the last good check × materials and labour, held —
`knowledge/MONEY.md`, H) and the give-away a set point far above the limit
costs (Q).

## When not to use it — and instead
The instrument's repeatability study → `msa.type1-gauge`. The legal
rules for the target → `packaging.average-quantity-system`. The programme
of checks and the product-at-risk review → `msa.calibration`. Drift over
weeks → `msa.bias-linearity-stability`.

## In food and FMCG manufacturing
Every packing line's end-of-line checkweigher, by product and by shift;
the trading-standards visit's first request; the retailer audit's
question about rejects proven.

## References
- [standard] OIML R 51-1:2006, *Automatic catchweighing instruments — Part 1: Metrological and technical requirements — Tests* — named from knowledge; text not read.
- [guide] UK Office for Product Safety and Standards, *Weights and Measures (Packaged Goods) Regulations 2006 — guidance* — the checkweigher as the packer's control (from knowledge).
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 6.3 — quantity control (from knowledge; clause not confirmed).

## In Faultline
Built (`FC-164`, `knowledge/specs/FC-164-checkweigher.md`) as a check log on
the shared shape (`src/tools/checks`, `defs/checkweigher.ts`): test
weights at the limits and the reject at speed on the starter schedule,
pass/fail each check, compliance and what a failure holds; the programs page
still records a program's test (`src/line`); the register carries the problem
a failure raises (`src/snag`). Typed weight readings and drift — the Type 1
gauge study on the instrument — are not on this page.
