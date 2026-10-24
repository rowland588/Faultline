---
id: commissioning.acceptance-tests
name: Acceptance tests — what was agreed, the attempts, and the figures each must meet
aka: [FAT, SAT, performance test, acceptance criteria, site acceptance, commissioning tests, run at rate, the journey of attempts]
discipline: commissioning
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — acceptance practice for packaging lines (from knowledge); EN 415-11:2021's methodology for system acceptance (scope confirmed online 22 Oct 2026; text not read — FC-085 research); Faultline's tests and programs (`src/lib/testing.ts`, `src/lib/programRun.ts`, `src/lib/run.ts`) and the run's money (`src/lib/runMoney.ts`); the worked test in `scripts/knowledge/cases-operations.py`
needs: [commissioning.stage-gate]
next: [commissioning.ramp-up, spc.machine-capability]
alternatives: []
related: [spc.held-at-rate, spc.zero-failure-demonstration, maintenance.reliability-growth, commissioning.operational-readiness]
---
# Acceptance tests — what was agreed, the attempts, and the figures each must meet

## Purpose and principle
A machine is accepted against what was agreed in writing before it
arrived: the products it runs, the rate it holds for how long, the
reject rate it may not exceed, the capability it shows, the programs it
proves. Each criterion is a test with a pass or fail; each test may take
several attempts, and the journey of attempts — 50, then 55, then 58
against 60 — is the record that tells the site and the OEM where they
are and settles the warranty argument. The test's figures are the
simplest in the library; their value is that they are written down
before, measured during, and kept after.

## Questions it answers
- What exactly was agreed, per product — and is each criterion met,
  not met, or not yet tested?
- What did the last attempt measure (net rate, rejects, minutes), and
  what is the trend of attempts?
- What is the shortfall worth, per hour and per shift, while it stands?
- What is left to hand over (`commissioning.operational-readiness`)?

## Inputs and minimum conditions
- The agreed criteria, written at order (or at the latest before the
  FAT): per product the rate (packs a minute, net of rejects or gross —
  said), the duration it must be held, the maximum reject share, any
  capability (Cmk on weight or seal — `spc.machine-capability`), the
  programs to prove, the conditions (the site's own product and film,
  the site's operators).
- Each attempt: date, product, minutes run, good packs, rejects, who
  witnessed, what was seen; the stops inside it (`spc.held-at-rate` for
  the interval view).
- The line's margin a pack for the shortfall's money (`knowledge/MONEY.md` §3).

## Procedure and calculation
- Net rate = good packs ÷ minutes; gross = (good + rejects) ÷ minutes;
  the criterion says which.
- Reject share = rejects ÷ (good + rejects), against the agreed maximum,
  with its upper bound for a short test (`spc.capability-attribute-proportion`).
- Pass when every figure meets its criterion over the agreed duration;
  the duration held interval by interval (`spc.held-at-rate`: the share
  of minutes met and the longest stretch) where "held" is the word in
  the contract.
- The journey: attempts in order with their figures; the climb
  (`commissioning.ramp-up`) extrapolated with its caveat; a failed
  attempt's problem raised and fixed before the next.
- Capability criteria by `spc.machine-capability` (50 pieces, Cmk
  against the agreed figure); zero-defect criteria ("no leakers in 299")
  by `spc.zero-failure-demonstration`.
- The shortfall's worth while it stands: (agreed − net) × minutes a
  shift × margin a pack (`knowledge/MONEY.md`, T) — the figure Faultline
  already says on a run (`src/lib/runMoney.ts`).
- Acceptance signed per criterion with the attempt that met it; what
  remains open goes to the handover list with an owner and a day.

**Worked case** (`cases-operations.py`): a 60-minute performance test,
agreed 60 a minute net at no more than 1.0% rejects. Made 3,552; 3,480
good, 72 rejects: net 58.0 a minute — not passed (2 short); rejects
2.03% — over. The shortfall is 120 packs over the hour, × margin a pack;
over a 15-hour day 1,800 packs. The journey: 50 → 55 → 58 net over three
attempts — the climb says 60 is two attempts away if it keeps climbing
(`commissioning.ramp-up`), and the reject rate is the other problem.

## Assumptions, limits and misuse
- Criteria written after the machine arrives are negotiated down to
  what it does; they are written at order.
- "Rate" without net/gross, duration and product is an argument waiting
  to happen; the criterion names all four.
- A one-hour test proves an hour; the reliability over weeks is the
  growth curve's question (`maintenance.reliability-growth`).
- An attempt on the OEM's product with the OEM's operator is a
  demonstration, not an acceptance; the site's conditions are the test's.
- A pass with a known problem "to be fixed later" is a concession and is
  written as one, with the money it leaves on the table.

## Reading the result
"Performance test, attempt 3: 58 a minute net against 60, rejects 2.0%
against 1.0% — not passed; 120 packs short an hour, £X a shift while it
stands. The climb 50 → 55 → 58 says two more attempts." Money: the
shortfall × margin a pack per shift (`knowledge/MONEY.md`, T), the
rejects × materials (Q) — the sentence the commissioning report carries.

## When not to use it — and instead
The climb of attempts to the rate → `commissioning.ramp-up`. The rate held
interval by interval → `spc.held-at-rate`. A machine's capability on a
measurement → `spc.machine-capability`. Whether the failure rate is
falling → `maintenance.reliability-growth`. What else must be ready →
`commissioning.operational-readiness`.

## In food and FMCG manufacturing
FAT at the OEM, SAT on site, the performance test on each product, the
program proving on each recipe, the reliability run before handover —
the stage gate's Commission gate, machine by machine.

## References
- [standard] EN 415-11:2021, *Safety of packaging machines — Part 11: Efficiency and availability of packaging machines and lines* — the acceptance methodology and time states (scope confirmed online 22 Oct 2026; text not read; FC-085).
- [practice] Capital-project and OEM contract practice — FAT/SAT criteria, performance guarantees, liquidated damages (from knowledge).
- [design] `docs/STAGEGATE.md`, `docs/LEAN40.md` — Faultline's stage gate and its tests.

## In Faultline
Built: commissioning tests and programs with their attempts, pass/fail,
what was seen and the journey (`src/lib/testing.ts`, `src/lib/programRun.ts`,
`src/lib/run.ts`, FC-074 to FC-076); since 24 October a run says what its
shortfall is worth (`src/lib/runMoney.ts`, FC-076/077). Not yet: the
interval-by-interval "held" reading (the capability study, part 2) and the EN 415-11
time model for acceptance (FC-085, research).
