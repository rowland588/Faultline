---
id: sustainability.compressed-air-leaks
name: Compressed air leak survey
aka: [air leaks, compressed air, leak tagging, ultrasonic leak detection, leak survey, air cost]
discipline: sustainability
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — energy-efficiency guidance (the Carbon Trust's compressed-air guides; BCAS) for the survey-tag-fix routine and the order of magnitude of leak losses (a fifth to a third of a system's air, from knowledge); the leak flow by hole size (about 1.2 l/s free air through a 1 mm hole at 7 bar, scaling with area) and the specific energy (about 0.1–0.12 kWh per m³ at 7 bar) are quoted from knowledge of published leak charts and compressor data and are illustrative — the site's own compressor and tariff govern; the worked survey in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [visual.action-tracking]
alternatives: []
related: [sustainability.utilities-intensity, maintenance.autonomous-maintenance, lean.five-s]
---
# Compressed air leak survey

## Purpose and principle
Compressed air is the most expensive utility a factory makes — about
a tenth of the energy put into the compressor comes out as useful work
— and a typical system leaks a fifth to a third of what it makes
through fittings, hoses, couplings, valves and cylinder seals that
nobody hears over the line. A leak survey walks the system when the
line is quiet (a shutdown, a break) with an ultrasonic detector read
by a person (or by ear and soapy water), tags each leak with its place,
an estimate of its size and a number, costs it from the flow a hole of
that size passes and the price of a cubic metre of air, and turns the
tags into fixes with owners. The measure is the tags found, the money
they leak, and the share fixed — and the next survey's count, because
leaks come back.

## Questions it answers
- What do our air leaks cost a year, and where are the biggest?
- How many tags are fixed, and how fast?
- Is the system's leakage falling survey by survey?
- What is a cubic metre of air costing us (the specific energy and the
  tariff)?

## Inputs and minimum conditions
- The survey: each leak's place (line, machine, component), its size
  estimate (by the detector's reading or the hole's apparent diameter),
  a tag number, a photo, the date.
- The system's cost of air: the compressor's specific energy (kWh per
  m³ delivered — from its data sheet or a metered test) and the
  electricity tariff; the hours a year the system is pressurised.
- A leak-down test where it can be done: the compressor's load/unload
  time with no production — the share of its capacity that is leakage.

## Procedure and calculation
- Flow per leak from its size: published charts give free-air flow by
  hole diameter at the line pressure (about 1.2 l/s at 1 mm and 7 bar,
  scaling with the hole's area); the detector's reading maps to a size
  by the maker's table.
- Annual air lost per leak = flow × 3,600 × pressurised hours; cost =
  m³ × specific energy (kWh/m³) × tariff (£/kWh); Σ over the tags.
- Leak-down test: with no air used, the compressor's on-load time ÷
  cycle time × its capacity = the leakage flow — the whole system's,
  which the tags should roughly add up to.
- Tags → actions (owner, day — `visual.action-tracking`); fixed ÷ found;
  the money fixed and the money still leaking.
- Repeat quarterly; the trend of tags found and leakage share; the
  operators' own round (`maintenance.autonomous-maintenance`) catching
  the hoses and couplings between surveys.
- Beyond leaks: the pressure set higher than needed, open blow-offs,
  air used where a blower would do — the survey lists them too.

**Worked case** (`cases-projects-people-ergo-sust.py`, illustrative):
48 tags — 30 about 0.5 mm, 12 about 1 mm, 6 about 2 mm; 6,000
pressurised hours a year; 0.11 kWh/m³; £0.25/kWh. The 0.5 mm leaks
about £5,300 a year together; the 1 mm £8,600; the six 2 mm £17,100 —
£31,000 a year in all, and the six biggest are 55% of it. 30 tags fixed
after the survey, the biggest six among them; the leak-down test
before and after is the proof.

## Assumptions, limits and misuse
- Leaks found and never fixed: the survey is the cheap part; the tags
  are actions.
- Leak flows from a chart are estimates (±50% on a size by eye); the
  leak-down test is the check on the total.
- A survey during production hears nothing; quiet time.
- The specific energy assumed from a brochure for an old compressor
  understates it; measure or take the service data.
- Fixing leaks and leaving the pressure set-point high leaves the
  easier saving on the table.

## Reading the result
"48 leaks, about £31k a year; the six biggest are over half; 30 fixed —
about £24k a year — and the leak-down test went from 28% to 12%."
Money: the air's kWh at the tariff (`knowledge/MONEY.md`, E), per tag and
in total, fixed and still leaking.

## When not to use it — and instead
Energy per tonne across all utilities → `sustainability.utilities-intensity`.
The operators' routine checks → `maintenance.autonomous-maintenance`.
Tags as actions → `visual.action-tracking`.

## In food and FMCG manufacturing
Packaging machines' pneumatics (the biggest users and leakers);
pneumatic cylinders on flow-wrappers and case packers; air knives;
blow-off nozzles left open; the hose couplings at every station.

## References
- [guidance] Carbon Trust, *Compressed air: opportunities for businesses* (CTV050) and *Compressed air technology guide* (from knowledge; not read from here).
- [guidance] British Compressed Air Society (BCAS), guidance on leak detection and system efficiency (from knowledge).
- [standard] ISO 11011:2013, *Compressed air — Energy efficiency — Assessment* (from knowledge).

## In Faultline
Not built (FC-227). The register takes a tagged leak as a problem on a
machine with its photo (`src/snag`); FC-227 would add the leak's size and
its yearly cost from the site's air cost, the survey's total, fixed
against found, and the leak-down test's before → after — a log on the
factory with its tags as actions.
