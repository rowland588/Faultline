---
id: sustainability.carbon
name: Carbon a pack — scope 1 and 2 emissions
aka: [carbon footprint, CO2e, scope 1, scope 2, emissions per pack, GHG Protocol, conversion factors, carbon intensity, SECR]
discipline: sustainability
kind: established
evidence: standard
depth: full
checked: 2026-10-25 — the GHG Protocol's scope 1, 2 and 3 split, the Scope 2 Guidance's two methods and the Corporate Standard's revision under way confirmed from search-result excerpts of ghgprotocol.org documents and secondary guides; the UK Government's greenhouse gas conversion factors (DESNZ; the 2024, 2025 and 2026 sets, the 2025 and 2026 methodology and major-changes reports on assets.publishing.service.gov.uk) and the UK Environmental Reporting Guidelines (SECR) seen only as excerpts and secondary summaries because gov.uk, ghgprotocol.org and the factor workbooks cannot be fetched from this container; every factor value below is from a secondary source quoting the workbook (the 2025 grid factor differs between two of them) and the builder reads the workbook before a figure reaches a screen; the decomposition and the worked months were computed independently on 25 October (plain arithmetic in Python, checked to the kilogram); the illustrative factors this record carried before 25 October were the 2024 set
needs: [sustainability.utilities-intensity]
next: []
alternatives: []
related: [sustainability.utilities-intensity, sustainability.waste-streams, yield.food-waste]
---
# Carbon a pack — scope 1 and 2 emissions

## Purpose and principle
A site's operational carbon is its energy, converted: **scope 1** is the fuel
it burns itself (natural gas in ovens and boilers, diesel in forklifts,
refrigerant losses); **scope 2** is the electricity it buys (the grid's
emissions on its behalf); **scope 3** is everything else up and down the
chain (ingredients, packaging, transport, the consumer) and is usually the
largest and the hardest, and is out of a line tool's reach except by its yield
and waste. Each energy quantity × the year's published emission factor for that
fuel = kg CO₂e; the sum divided by the output is the carbon intensity — kg
CO₂e a tonne, g a pack — the figure a retailer asks for and the trend the site
watches. Because the factors change yearly (the grid gets cleaner), a
year-on-year comparison says which year's factors it uses, or uses one set for
both.

**Two things that sound alike are not.** A site's scope 1 + 2 per pack (this
record) is the *site's operational intensity*. A **product carbon footprint**
(ISO 14067; the GHG Protocol Product Standard) follows one product from the
raw materials to the factory gate or the shelf and is mostly scope 3. When a
retailer says "carbon per pack" they usually mean the second. This tool gives
the first and says it is the first.

## Questions it answers
- What is our carbon a pack (a tonne), scope 1 and 2, and is it falling?
- Which energy source carries most of it — gas or electricity?
- How much of the fall is our doing (less energy a pack) and how much the
  grid's (a lower factor)?
- What does a saving in kWh mean in CO₂e and in pounds?

## Inputs and minimum conditions
- Energy use by source over the period, typed by a person from meter readings
  (`sustainability.utilities-intensity`) or the bills: kWh electricity, kWh gas
  (or m³ with the supplier's calorific value, which turns it to kWh), litres of
  diesel, kg of refrigerant lost.
- The year's published conversion factors for each, **with the set (year), the
  basis and where it came from**: the UK set is published in June each year
  (2025: 10 June 2025; 2026: 11 June 2026, flat file reissued 31 July 2026 to
  fix cells that read 0 where no data existed). Electricity is the *generation*
  factor (scope 2); transmission and distribution losses and the well-to-tank
  rows are scope 3 and are not added to scope 2 by this tool. Natural gas in
  kWh on the **gross** calorific value by default, unless the supplier's bill
  says net (the methodology paper's instruction, as excerpted). Electricity
  factors use data two years old (the 2025 factor rests on 2023).
- The output over the same period (tonnes, packs).

**Factor values seen (kg CO₂e per kWh) — secondary sources quoting the
DESNZ workbooks; the builder reads the workbook:**

| Set | Electricity, generation (scope 2) | Natural gas, gross CV (scope 1) | How seen |
|---|---|---|---|
| 2024 | 0.20705 | 0.18290 | secondary guides (one agreeing with the 2025 major-changes text) |
| 2025 | 0.17700 (one guide gave 0.17889) | 0.18296 (one gave 0.18293) | secondary guides; the discrepancy is unresolved |
| 2026 | 0.13096 | 0.18231 | secondary guides and the 2026 major-changes report's headline (a 26% fall) |

Transmission and distribution losses (scope 3): 0.01853 (2025) and 0.01299
(2026). The methodology paper says CH₄ and N₂O are converted with the IPCC
Fifth Assessment Report's values (28 and 265) — one source, to confirm.
Diesel and refrigerant factors were not seen at all and are read from the
workbook. The UK Government publishes the sets for reuse (Open Government
Licence is the norm for gov.uk publications; to confirm on the page).

## Procedure and calculation
- Scope 1 = Σ fuel quantity × its factor (gas kWh × kg CO₂e/kWh; diesel litres
  × kg/litre; refrigerant kg lost × its GWP).
- Scope 2 = electricity kWh × the grid factor (**location-based**). The GHG
  Protocol's 2015 Scope 2 Guidance asks for both methods where a company has
  contractual instruments; the **market-based** figure uses the supplier's
  contractual factor (a green tariff, which can be near zero) and is reported
  beside the location-based one, never instead. A 2026 proposal to amend the
  guidance (hourly matching for market-based claims; final text expected 2027)
  was seen and is not law; the Corporate Standard itself is under revision.
- Intensity = (scope 1 + scope 2) ÷ output; by month, trended. UK quoted and
  large companies must give scope 1 and 2, energy use and at least one
  intensity ratio (the Environmental Reporting Guidelines for SECR; a 2026
  review recommended keeping SECR with amendments) — the company's own
  report is its own; this tool supplies the figures.
- **Decomposition of a change, exact with no residual.** With activity a
  (kWh a pack, by source) and factor f: E = Σ a·f. Activity effect = Σ (a₁ − a₀)
  · f₀; factor effect = Σ a₁ · (f₁ − f₀); they add to E₁ − E₀ exactly. So the
  site's own improvement is told from the grid's.
- A kWh saving's worth: × its factor in CO₂e, × its tariff in pounds
  (`knowledge/MONEY.md`, E).
- Scope 3 named as out of scope with what would be needed (the ingredients'
  factors, the packaging's, the transport's).

**Worked month, the 2026 set** (computed 25 October; factor values from the
table above, so illustrative until read from the workbook): electricity
180,000 kWh × 0.13096 = 23.57 t (scope 2); gas 420,000 kWh × 0.18231 = 76.57 t
(scope 1); total 100.14 t; on 1,040,000 packs, 96.3 g CO₂e a pack. Gas is 76%
of it. The same activity on the 2024 set was 114.09 t (109.7 g a pack, gas 67%)
and on the 2025 set 108.70 t (104.5 g) — the whole difference is the grid.

**Worked decomposition** (computed): a month on the 2025 set, electricity
180,000 kWh and gas 420,000 kWh on 1,040,000 packs: 108.70 t, 104.52 g a pack.
Next month on the 2026 set, 171,000 kWh and 395,000 kWh on 1,000,000 packs:
94.41 t, 94.41 g a pack. Change −14.30 t = activity effect −6.17 t + factor
effect −8.13 t. Per pack: −10.12 g = −1.99 g (less energy a pack) + −8.13 g
(a cleaner grid). The factor change alone, at the same activity, is −8.56 t
(electricity −8.29 t, gas −0.27 t).

## Assumptions, limits and misuse
- Old factors, or a mix of years, make the trend a fiction; one published set,
  named, or the decomposition used to separate them.
- Scope 3 ignored silently: say it is out and what it would take.
- A market-based (green tariff) electricity figure reported beside a
  location-based one compares nothing; say which, and give both where a
  contractual claim is made.
- Carbon a pack falls when output rises because of the base load
  (`sustainability.utilities-intensity`); the decomposition says so.
- The tool reports; it does not reduce, offset, verify or certify. No "carbon
  neutral", no "net zero" claim; assurance (ISO 14064-3, a verifier) is a third
  party's.
- Refrigerant leaks are known from the top-up records, not measured; the tool
  asks for kg topped up and the gas type.
- The factors are national averages: they do not know this site's grid
  connection, a private wire or an on-site generator.

## Reading the result
"96 g CO₂e a pack this month, 100 tonnes (2026 UK factors, location-based);
gas is three quarters — the ovens' 6% fall in kWh a tonne is worth 4.6 t a
month and £3,800. Scope 3 (ingredients, packaging, transport) is not in this
figure; this is not a product carbon footprint." Money: the kWh behind the
carbon at their tariffs (`knowledge/MONEY.md`, E) — the carbon has a price
only where the site pays one (a levy, a retailer's requirement), and that is
said.

## When not to use it — and instead
The energy and water per tonne themselves → `sustainability.utilities-intensity`.
Waste by stream → `sustainability.waste-streams`; food waste in detail →
`yield.food-waste` (the biggest scope 3 lever a line has). A product's whole
footprint → a life-cycle assessment (ISO 14067), not this.

## In food and FMCG manufacturing
Retailer carbon reporting and reduction targets; the site's annual report;
the oven and boiler gas against the chillers' electricity; the case for heat
recovery.

## References
- [standard] World Resources Institute and WBCSD, *The Greenhouse Gas Protocol: A Corporate Accounting and Reporting Standard*, revised edition (2004); and the *Scope 2 Guidance* (2015) — scopes, location- and market-based methods; free to download from ghgprotocol.org; seen via excerpts and secondary guides, not read; revision of the Corporate Standard under way (progress update December 2025).
- [guidance] UK Department for Energy Security and Net Zero, *Greenhouse gas reporting: conversion factors* (annual; 2025 published 10 June 2025, 2026 published 11 June 2026) with the methodology paper and the major-changes report each year, assets.publishing.service.gov.uk — the factors; the workbooks not opened.
- [guidance] UK Government, *Environmental reporting guidelines: including streamlined energy and carbon reporting guidance* (March 2019), and the 2026 post-implementation review of SECR — what must be reported (scope 1 and 2, energy, an intensity ratio, the method); excerpts only.
- [standard] ISO 14064-1:2018, *Greenhouse gases — Part 1*, and ISO 14067:2018, *Carbon footprint of products* — paid; scope only, from knowledge.

## In Faultline
Not built (FC-229).

**FC-229 — CAN BE BUILT** for the site's scope 1 and 2 intensity: the arithmetic is a sum of
products on factors the UK Government publishes yearly, so no licence, no
specialist and no sensor is needed. Two conditions. (1) The builder opens the
DESNZ workbook for each set the tool offers and enters the rows with the set,
the row's name, the unit, the gross or net basis, the URL and the date read —
every value above must be replaced by that reading. (2) The energy comes in as
typed monthly totals (the utilities tool is not built; the carbon
page can take kWh straight from the bills and later read the utilities
tool). A minimal build on the factory's page: *Inputs* — the period; the
factor set (year) chosen; kWh electricity and kWh gas (and diesel litres,
refrigerant kg and gas type when given); the output in packs and tonnes; the
tariff for the money line; optionally a contractual electricity factor with
its evidence. *Outputs* — kg CO₂e by source and scope, the total, g a pack
and kg a tonne, gas against electricity share, the month-on-month change split
into energy-a-pack and factor effects, the money behind the kWh. *Verdict
wording* — "96 g CO₂e a pack (UK 2026 factors, location-based, scope 1 and 2
only); 8.1 g of this month's 10.1 g fall is the grid, 2.0 g is yours"; never
"carbon neutral", "footprint" or "compliant". *Must not* — mix sets without
saying; add transmission losses or well-to-tank to scope 2; present a
market-based figure alone; call it a product carbon footprint or answer a
retailer's scope 3 question; extrapolate factors to a future year; or carry a
value that was not read from the workbook. *Independent cases for the builder*
— the worked month and the decomposition above (the activity and factor effects
sum exactly), by hand and in a second implementation; every factor against the
workbook's cell.
