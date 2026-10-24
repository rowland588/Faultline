---
id: ie.labour-productivity
name: Labour productivity — earned hours, efficiency and utilisation
aka: [earned hours, labour efficiency, labour utilisation, packs per labour hour, standard hours produced, performance against standard]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — earned hours, efficiency and utilisation as the ILO's work study text and Stevenson's *Operations Management* define them (from knowledge); the shift's worked case in `scripts/knowledge/cases-ie.py`; the labour cost a pack as `knowledge/MONEY.md` §3 (the one rate)
needs: [ie.time-study]
next: [cost.line-cost-model]
alternatives: []
related: [planning.crew-planning, capacity.three-capacities, ie.allowances]
---
# Labour productivity — earned hours, efficiency and utilisation

## Purpose and principle
"Packs per person per hour" mixes three things: how fast the people
worked when they were working (efficiency against the standard), how
much of their paid time they were on standard work (utilisation), and
what the standard itself asks (the method). Earned hours — output ×
standard time — is the common currency: the hours the output *should*
have taken. Efficiency compares earned hours with hours worked on the
job; utilisation compares hours worked on the job with hours paid; their
product is overall labour performance. Keeping them apart says whether
the shortfall is pace, lost time or a wrong standard.

## Questions it answers
- How productive was the shift against the standard — and was the gap
  pace or lost time?
- What does labour cost a pack at this performance, and at standard?
- Is the standard itself right (efficiency far above 100% says it is
  loose; far below, tight or the conditions changed)?
- How many people does the plan need (`planning.crew-planning`)?

## Inputs and minimum conditions
- A standard time per pack (or per case) for the crew's work
  (`ie.time-study` with `ie.allowances`), stated per person or per crew.
- The shift's output (good packs), hours paid per person, and hours on
  standard work (paid hours less time off the job: training, meetings,
  waiting with no standard, cleaning not in the standard).
- The labour rate and on-costs (`knowledge/MONEY.md` §3 — the one rate).

## Procedure and calculation
- Earned hours = output × standard time (per pack, in hours) — with a
  crew standard, the crew's standard per pack is the sum of the
  stations' standards (or the cycle × crew size when the line is
  balanced to the cycle).
- Efficiency = earned hours ÷ hours worked on standard work (× 100%).
- Utilisation = hours on standard work ÷ hours paid.
- Overall performance = earned ÷ paid = efficiency × utilisation.
- Productivity (the plain figure) = output ÷ hours paid.
- Labour cost a pack = (crew × hours paid × rate × on-costs) ÷ output;
  at standard = standard time × rate × on-costs.
- Reading the three: efficiency low with utilisation high → pace or
  the method (the standard's conditions changed?); efficiency high with
  utilisation low → the people were fast and often off the job (stops,
  waiting — the loss count); efficiency far above 100% → the standard
  is loose (re-time it).
- Where the line is machine-paced, the people's efficiency is capped
  by the machine; the figure then measures lost time, not pace.

**Worked case** (`cases-ie.py`): a 4-person crew, 8 h paid each (32 h),
7 h each on standard work (28 h), 21,600 packs; the crew's standard
12.1 s a pack (each station's 48.3 s shared by four). Earned hours 72.4
against 28 worked: efficiency 259% — the standard is plainly wrong for
this crew (a machine-paced line where the people's standard was set on a
slower product, or the standard is per person and was applied per
crew); utilisation 88%; overall 226%. The figures' first job here is to
expose the standard, not to praise the crew. Labour cost a pack at £14/h
× 1.25 on-costs: £0.104.

## Assumptions, limits and misuse
- A wrong standard makes every efficiency figure meaningless; the first
  use of the measure is to find such standards (above).
- Counting hours off the job as "worked" buries lost time in efficiency;
  the split is kept.
- Crew standards and person standards mixed (as in the case) multiply
  the error by the crew size.
- Efficiency on a machine-paced line is the machine's; the people's
  measure there is lost time and the balance (`capacity.line-balancing`).
- Productivity per paid hour across products with different standards
  cannot be compared; earned hours can.
- The measure says how the people did against a standard, never whether
  the standard was humane (`ie.allowances`, `ergonomics.hse-mac-art`).

## Reading the result
"The crew earned 72 standard hours in 28 worked — 259%: the standard is
wrong, not the crew; at the station standard of 48 s a pack per person
the crew's standard is 12 s, and today's 21,600 packs took 4.7 s a pack of
crew time." Money: labour a pack today against at standard
(`knowledge/MONEY.md`, L); the lost time (12% unutilised) × crew × rate.

## When not to use it — and instead
The standard time → `ie.time-study`, `ie.allowances`. The whole line's
cost a pack with machines and margin → `cost.line-cost-model`. The
crew needed for a plan → `planning.crew-planning`. The line's output
against its plan → `capacity.three-capacities`.

## In food and FMCG manufacturing
Hand-packing and assembly lines (sandwiches, ready meals, selection
packs), picking and case packing, where the people are the capacity and
the standard decides the crew — and the weekly labour report everyone
argues about.

## References
- [textbook] Kanawaty, G. (ed.), *Introduction to Work Study*, 4th ed., ILO, 1992 — standard time and its uses in performance measurement (from knowledge).
- [textbook] Stevenson, W.J., *Operations Management*, 14th ed., 2021 — productivity measures (from knowledge).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014 — performance against standard (from knowledge).

## In Faultline
Not built (FC-029 earned hours, FC-030 labour cost per pack as a page).
The line balance holds each station's timed standard and the crew
(`src/tools/linework`); Line capacity says labour a pack at the planned
rate (`labourCost`); the shift's output exists in the loss count. The
page would read the three together: earned, worked and paid hours, the
three ratios in words, the standard flagged when efficiency says it is
wrong, and labour a pack today against standard.
