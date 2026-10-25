---
id: commissioning.acceptance-tests
name: Acceptance tests — what was agreed, the attempts, and the figures each must meet
aka: [FAT, SAT, performance test, acceptance criteria, site acceptance, commissioning tests, run at rate, the journey of attempts]
discipline: commissioning
kind: established
evidence: practice
depth: full
checked: 2026-10-25 — acceptance practice for packaging lines (from knowledge); EN 415-11:2021 researched for FC-085 through web-search excerpts only (this container cannot fetch pages; the standard is paid and was NOT read): confirmed in excerpts of national-body listings and previews - its structure, the technical key figures counting only losses attributable to the machine system, an acceptance period agreed in advance of 2 to 8 hours, Annex C's minimum points to agree, the 2014 DIN 8743 it replaced; not confirmed - any time state's name or definition, any formula; Faultline's tests and programs (`src/lib/testing.ts`, `src/lib/programRun.ts`, `src/lib/run.ts`) and the run's money (`src/lib/runMoney.ts`); the worked test in `scripts/knowledge/cases-operations.py`
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
- **EN 415-11:2021 — what is public about it (25 October 2026, from
  search excerpts of national listings and previews; the text is paid and
  was not read).** *Established by those excerpts:* the standard is Part 11
  of the safety-of-packaging-machines series, approved by CEN on 23 August
  2021, replacing DIN 8743:2014; it applies to machines within the scope of
  EN 415-1, called *machine systems*, and by analogy to related processing
  machines; it holds a time model, an output model derived from it, general
  and technical key figures, and a methodology for system acceptance, with
  an informative annex on the basic causes behind the key figures; the
  *technical* key figures count only the time and output lost to the machine
  or line under test, never to upstream, downstream or organisational
  causes; system boundaries and the organisational and technical conditions
  change every figure, so the interfaces (upstream and downstream systems,
  packaging supply, energy, scrap) are agreed before the run; the
  acceptance period is agreed in advance and should be between 2 and 8
  hours, changeable during the test only by agreement of both parties;
  Annex C lists the minimum points the parties agree before the test. The
  acceptance figures are *technical efficiency* (E_S) and *technical
  availability* (R_S); one extract reports technical efficiency as good
  output over scheduled output adjusted for losses not caused by the
  machine system at the nominal performance, never above 1, and a separate
  *technical delivery efficiency* against the agreed output that can exceed
  1. **A naming trap, reported once, unverified:** the extract says the
  2021 technical efficiency corresponds to the earlier edition's "technical
  availability", and VDMA's note on the 2014 edition says "machine
  availability" had been used for what it then called machine efficiency and
  was redefined. If so, an OEM and a site quoting DIN 8743 (2004 or 2014)
  and EN 415-11 can mean different things by the same word, which is the
  disagreement the entry exists for; only the text settles it.
  *Not public, so not here:* the names and definitions of the time states,
  the formulas of E_S, R_S and the delivery efficiency, the output model's
  terms, the clause wording, Annex C's list. They are not reconstructed.
- Related definitions are not a substitute. ISO 22400-2:2014 (paid; Amd 1
  2017; scope and a third-party list of KPI names seen) defines its own
  KPIs (availability, allocation ratio, OEE among them) for manufacturing
  operations in general; PackML (ISA-TR88.00.02, OMAC) is a machine-state
  model fed by the machine's controller. Neither is the packaging
  standard's time model, and PackML presupposes sensors, which Faultline
  does not have.

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
- [standard] EN 415-11:2021, *Safety of packaging machines — Part 11: Determination of efficiency and availability* — paid (about 410 USD for the BS adoption at https://www.en-standard.eu/bs-en-415-11-2021-safety-of-packaging-machines-determination-of-efficiency-and-availability/ ; adoptions from DIN, NEN, SIS, NSAI and others, e.g. https://www.sis.se/en/produkter/packaging-and-distribution-of-goods/packaging-machinery/ss-en-415-112021/ and https://www.intertekinform.com/preview/882678105875.pdf?sku=1278190_saig_nsai_nsai_3071402 for a preview). Structure, scope, the 2 to 8 hour acceptance period, Annex C and the technical key figures' rule seen in search excerpts only, 25 Oct 2026; time states and formulas not seen (FC-085).
- [standard] DIN 8743:2014-01, *Packaging machines and packaging lines — key figures to characterise operation behaviour and requirements for data collection in an acceptance test* — withdrawn, replaced by DIN EN 415-11:2021-12; VDMA's note on its changes, http://www.oe-a.org/en/viewer/-/v2article/render/27106441 (machine quality output, machine efficiency and machine availability as the acceptance figures; "machine availability" redefined); excerpt only.
- [standard] ISO 22400-2:2014, *Automation systems and integration — KPIs for manufacturing operations management — Part 2: Definitions and descriptions*, https://www.iso.org/obp/ui/#iso:std:iso:22400:-2:en — paid; scope only; not the packaging time model.
- [practice] Capital-project and OEM contract practice — FAT/SAT criteria, performance guarantees, liquidated damages (from knowledge).
- [design] `docs/STAGEGATE.md`, `docs/LEAN40.md` — Faultline's stage gate and its tests.

## In Faultline
Built: commissioning tests and programs with their attempts, pass/fail,
what was seen and the journey (`src/lib/testing.ts`, `src/lib/programRun.ts`,
`src/lib/run.ts`, FC-074 to FC-076); since 24 October a run says what its
shortfall is worth (`src/lib/runMoney.ts`, FC-076/077). Not yet: the
interval-by-interval "held" reading (the capability study, part 2) and the EN 415-11
time model for acceptance (FC-085).

**Researched 25 October 2026 (FC-085). Verdict: CANNOT YET as "the EN 415-11
tool"; a smaller honest piece can be built now and is described here.**
What the standard names — its time states and the formulas of E_S, R_S and
the delivery efficiency — is paid and cannot be rebuilt honestly from
summaries; a tool that said "per EN 415-11" with Faultline's own states
would give an OEM and a site a *third* definition, the opposite of the
entry's purpose. The Loss count already does what no text is
needed for: a shift's time in the model `docs/CAPACITY.md` §5 sets down
(Nakajima's six big losses, planned time less breaks), by hand. Nothing in
it should be renamed to the standard's states.

*What can be built without the text (an "acceptance agreement" on the
performance run, FC-076, in Faultline's words, saying on screen and paper
that it is not computed per EN 415-11):*
- *Inputs, typed before the run and fixed (agreed before measured):* the
  machine system's boundary in words (what is in, which upstream and
  downstream interfaces are assumed ready); the acceptance period (a number
  of hours; the tool notes the standard's reported 2 to 8 hours as a figure
  to confirm, not a rule); the product and the agreed rate and whether net
  or gross; and, for every stop in the run, *whose it is* — the machine
  system, upstream, downstream, material, operator or the site — chosen by
  the parties at the time.
- *Outputs:* the run's good output against the agreed output over the
  period; the stop minutes by owner, in a table both parties sign; the share
  of stop time attributable to the machine system; the same as a figure
  *named by the agreement* ("agreed efficiency: good packs ÷ agreed packs
  for the period, stops not the machine's excluded as agreed") with the
  formula printed beside it, so any OEM can compare it with its own reading
  of the standard.
- *Verdict:* met or not against the typed agreed figure, money from the
  shortfall as FC-076 does. *Must not claim:* "EN 415-11 efficiency",
  "technical availability" or the standard's key-figure names; a figure
  that would be accepted under the standard's own definitions.
- *To make it the standard's:* the owner buys and reads EN 415-11:2021 (one
  national adoption; about 410 USD for the BS copy), above all clause 3's
  terms, the time model's table and figure, the key-figure formulas and Annex
  C. With that, the formulas are written into a specification with their
  source and checked on the standard's own worked example (a user-posted
  copy of the standard's example exists online; it is not used here). Then
  the entry can be built as asked, with the national edition named on
  the paper. If a client or OEM already writes the key figures into the
  contract, ask for those pages: the contract's definitions govern.
