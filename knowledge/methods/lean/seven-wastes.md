---
id: lean.seven-wastes
name: The eight wastes — seen, classed and costed
aka: [muda, TIMWOODS, seven wastes, eight wastes, waste walk, DOWNTIME, non-value-added]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Ohno's seven wastes (1988) and the eighth, unused talent, as Liker (2004) adds it; the costing is Faultline's own rule by `knowledge/MONEY.md`; from knowledge, texts not re-read; the worked walk in `scripts/knowledge/cases-lean.py`
needs: []
next: [rca.fishbone-5whys, lean.kaizen-event]
alternatives: [lean.value-stream-mapping]
related: [visual.gemba-walk, lean.spaghetti, ie.work-sampling, lean.process-flow-chart]
---
# The eight wastes — seen, classed and costed

## Purpose and principle
Ohno's seven wastes — **transport**, **inventory**, **motion**,
**waiting**, **over-production**, **over-processing**, **defects** — and
Liker's eighth, **unused talent** (TIMWOODS), are a vocabulary for a
walk: each thing seen that adds cost without changing the product is
named, classed, located and, in Faultline's rule, given a cost from the
one money model, so that the list is ranked by what it costs rather than
by how often it was noticed. The class matters because each waste has
its usual cause and its usual tool: transport and motion → layout and
supply (`lean.spaghetti`); waiting → the help chain and the bottleneck
(`lean.andon`, `capacity.theory-of-constraints`); inventory →
pull sizing (`lean.kanban-supermarket`); over-production → levelling
(`lean.heijunka-epei`); over-processing → the standard
(`lean.standard-work`); defects → quality's tools; unused talent → the
improvement system (`lean.toyota-kata`).

## Questions it answers
- What waste is on this line, of which kind, where?
- What does each cost — a shift, a week?
- Which one first, and which tool does it point to?
- Is the waste falling walk after walk?

## Inputs and minimum conditions
- A walk (or the filmed walk's footage) with each waste noted: the
  class, the place, what was seen, a photo where it helps, and an
  estimate of its size in its own unit (minutes, metres, packs, pounds
  of stock).
- The line's rates for the costing: the crew and its rate, the line's
  contribution a pack, a pack's materials (`knowledge/MONEY.md`).
- The walks on a cadence (the gemba walk's — `visual.gemba-walk`) so
  the count can be trended.

## Procedure and calculation
- Tally by class and by place; each item sized: time wastes in minutes
  a shift (waiting, transport, motion, over-processing), inventory in
  units and pounds tied up, over-production in packs made beyond demand
  (and dumped where the life runs out), defects in packs reworked or
  scrapped.
- Costed by the model's row: time × the crew's rate a minute (L), and
  at the bottleneck × the contribution a pack × the rate (T); inventory
  × unit cost (H); defects × materials and labour (Q); over-production
  of short-life product × a pack's full cost (Q).
- Ranked by cost a week; the top three carried to causes
  (`rca.fishbone-5whys`) and to the tool their class names.
- Trended: wastes counted and costed walk after walk; the ones removed
  struck with their date.
- Where the estimate is a guess, say so and measure it with the tool —
  a work sampling for the shares of the crew's day (`ie.work-sampling`),
  a spaghetti for the metres.

**Worked case** (`cases-lean.py`): a walk on a packing line found
seven wastes — waiting for QA release of a pallet (360 min a day),
transport of film from the store (48 min a shift), motion reaching over
a guard (20 min), over-processing by a double label check (30 min),
defects reworked (300 packs a shift), inventory of film at six weeks
(£18,000 tied up), over-production of short-life product (400 packs a
week dumped). Costed, the QA wait leads: 360 minutes of a four-person
crew at £25 an hour is £600 a day of labour, and at the bottleneck 360 ×
110 = 39,600 packs not made — the release process, not the packers, is
the first problem.

## Assumptions, limits and misuse
- A list of wastes with no cost and no owner changes nothing; the cost
  ranks it and the owner moves it.
- Estimates from a walk are indicative; the tool measures.
- Classing is for pointing at the tool, not for debate; a waste that
  could be two classes goes in the one whose tool fits.
- Waste is in the process, not the person; a walk that names people
  ends the walks.
- Storage and inspection required by law or the HACCP plan are not
  waste to remove, though they may be waste to shorten.

## Reading the result
"Seven wastes seen; the biggest is waiting for QA release — 6 hours a
pallet-day, £600 of labour and 39,600 packs a day at the bottleneck. Fix
the release, then the film." Money: by `knowledge/MONEY.md`'s rows — T,
L, H, Q — one per waste, plainly labelled, never summed into one figure
that hides which is which.

## When not to use it — and instead
The whole stream's flow and stock → `lean.value-stream-mapping`. The
cause of one waste → `rca.fishbone-5whys`. A week to remove one →
`lean.kaizen-event`. The walk's routine → `visual.gemba-walk`. The crew's
day in shares → `ie.work-sampling`.

## In food and FMCG manufacturing
Over-production of short-life product; product waiting warm for a
release; over-wrapping and double checks; film and cases walked from a
store; rework of light packs; a skilled operator used as a labourer
because the standard was never written.

## References
- [textbook] Ohno, T. (1988), *Toyota Production System: Beyond Large-Scale Production*, Productivity Press — the seven wastes (from knowledge).
- [textbook] Liker, J.K. (2004), *The Toyota Way*, McGraw-Hill — the eighth, unused employee creativity (from knowledge).
- [textbook] Womack, J.P. and Jones, D.T. (1996), *Lean Thinking*, Simon & Schuster — muda (from knowledge).

## In Faultline
Partly: the filmed walk records problems with photos and film
(`src/screens/CaptureScreen.tsx`) and the register costs a problem's
minutes, rejects and held product (`src/snag`, `src/lib/problemCost.ts`)
without a waste class (FC-005). FC-005 adds the class on a walk's
finding, the sizing in its unit, the cost by the model's row, the walk's
ranked list and its trend — and the class's pointer to the tool.
