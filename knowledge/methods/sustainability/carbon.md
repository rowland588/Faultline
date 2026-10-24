---
id: sustainability.carbon
name: Carbon a pack — scope 1 and 2 emissions
aka: [carbon footprint, CO2e, scope 1, scope 2, emissions per pack, GHG Protocol, conversion factors, carbon intensity]
discipline: sustainability
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the GHG Protocol Corporate Standard (WRI/WBCSD, 2004, rev. 2015) for scopes 1, 2 and 3 and the location- and market-based methods; the UK Government's annual greenhouse gas conversion factors (DESNZ) as the source of factors — the factors in the worked case are illustrative (about 0.207 kg CO₂e/kWh electricity, 0.183 kg CO₂e/kWh natural gas gross, from knowledge of recent years) and the year's published set governs; from knowledge, texts not fetched from here; the worked month in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: [sustainability.utilities-intensity]
next: []
alternatives: []
related: [sustainability.utilities-intensity, sustainability.waste-streams, yield.food-waste]
---
# Carbon a pack — scope 1 and 2 emissions

## Purpose and principle
A site's operational carbon is its energy, converted: **scope 1** is
the fuel it burns itself (natural gas in ovens and boilers, diesel in
forklifts, refrigerant losses); **scope 2** is the electricity it buys
(the grid's emissions on its behalf); **scope 3** is everything else up
and down the chain (ingredients, packaging, transport, the consumer) and
is usually the largest and the hardest, and is out of a line tool's
reach except by its yield and waste. Each energy quantity × the year's
published emission factor for that fuel = kg CO₂e; the sum divided by
the output is the carbon intensity — kg CO₂e a tonne, g a pack — the
figure the retailer asks for and the trend the site watches. Because
the factors change yearly (the grid gets cleaner), a year-on-year
comparison says which year's factors it uses, or uses one set for both.

## Questions it answers
- What is our carbon a pack (a tonne), scope 1 and 2, and is it
  falling?
- Which energy source carries most of it — gas or electricity?
- How much of the fall is our doing (less energy a tonne) and how much
  the grid's (a lower factor)?
- What does a saving in kWh mean in CO₂e and in pounds?

## Inputs and minimum conditions
- Energy use by source over the period, from meter readings taken by a
  person (`sustainability.utilities-intensity`) or the bills: kWh
  electricity, kWh (or m³) gas, litres of diesel, kg of refrigerant
  topped up.
- The year's published conversion factors for each, with their basis
  (gross or net calorific value; location- or market-based electricity).
- The output over the same period (tonnes, packs).

## Procedure and calculation
- Scope 1 = Σ fuel quantity × its factor (gas kWh × kg CO₂e/kWh; diesel
  litres × kg/litre; refrigerant kg × its GWP).
- Scope 2 = electricity kWh × the grid factor (location-based), or × the
  supplier's contractual factor (market-based — a green tariff), saying
  which.
- Intensity = (scope 1 + scope 2) ÷ output; by month, trended.
- Decomposition of a change: Δ from energy intensity (kWh a tonne, at
  fixed factors) and Δ from the factors (at fixed kWh) — so the site's
  own improvement is told from the grid's.
- A kWh saving's worth: × its factor in CO₂e, × its tariff in pounds
  (`knowledge/MONEY.md`, E).
- Scope 3 named as out of scope with what would be needed (the
  ingredients' factors, the packaging's, the transport's).

**Worked case** (`cases-projects-people-ergo-sust.py`, illustrative
factors): a month — electricity 180,000 kWh × 0.207 = 37.3 t CO₂e
(scope 2); gas 420,000 kWh × 0.183 = 76.9 t (scope 1); total 114 t; on
1,040,000 packs, 110 g CO₂e a pack. Gas is two thirds of it: the ovens
and the boiler, not the lighting, are where the carbon is. The year's
published factors replace these before any figure is reported.

## Assumptions, limits and misuse
- Old factors, or a mix of years, make the trend a fiction; one
  published set, named.
- Scope 3 ignored silently: say it is out and what it would take.
- A market-based (green tariff) electricity figure reported beside a
  location-based one compares nothing; say which.
- Carbon a pack falls when output rises because of the base load
  (`sustainability.utilities-intensity`); the decomposition says so.
- The tool reports; it does not reduce — the reductions are the
  utilities, the yield and the waste tools' work.

## Reading the result
"110 g CO₂e a pack this month, 114 tonnes; gas is two thirds — the
ovens' 6% fall in kWh a tonne is worth 4.6 t a month and £3,800."
Money: the kWh behind the carbon at their tariffs (`knowledge/MONEY.md`,
E) — the carbon has a price only where the site pays one (a levy, a
retailer's requirement), and that is said.

## When not to use it — and instead
The energy and water per tonne themselves →
`sustainability.utilities-intensity`. Waste by stream →
`sustainability.waste-streams`; food waste in detail → `yield.food-waste`
(the biggest scope 3 lever a line has).

## In food and FMCG manufacturing
Retailer carbon reporting and reduction targets; the site's annual
report; the oven and boiler gas against the chillers' electricity; the
case for heat recovery.

## References
- [standard] World Resources Institute and WBCSD (2004, rev. 2015), *The Greenhouse Gas Protocol: A Corporate Accounting and Reporting Standard*; and the *Scope 2 Guidance* (2015) (from knowledge).
- [guidance] UK Department for Energy Security and Net Zero, *Greenhouse gas reporting: conversion factors* (annual) — the factors (from knowledge; the current year's set to be taken from the publication).
- [standard] ISO 14064-1:2018, *Greenhouse gases — Part 1* (from knowledge).

## In Faultline
Not built (FC-229). It would read the meter readings of
`sustainability.utilities-intensity` (not built) and the line's
output, hold the year's factors as data with their source and year, and
say the intensity and its decomposition on the factory's page. Nothing
is built until the utilities tool is.
