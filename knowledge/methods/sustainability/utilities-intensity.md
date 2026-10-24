---
id: sustainability.utilities-intensity
name: Energy and water per tonne — from meter readings taken by a person
aka: [energy per tonne, water per tonne, utilities, meter readings, specific energy consumption, SEC, EnPI, base load, regression baseline]
discipline: sustainability
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — ISO 50001:2018 and ISO 50006:2014 (energy performance indicators and baselines — the regression of use on output) named from knowledge; the arithmetic (intensity, the regression's base and slope, the CUSUM of deviations) is standard energy-management practice; from knowledge, texts not read from here; the worked month in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [quality.pareto, sustainability.carbon]
alternatives: []
related: [sustainability.compressed-air-leaks, sustainability.carbon, stats.correlation-regression, spc.cusum-ewma]
---
# Energy and water per tonne — from meter readings taken by a person

## Purpose and principle
A factory's energy and water are bought by the kWh and the cubic metre
and earned by the tonne; the intensity — kWh a tonne, litres a tonne —
is the figure that says whether the site is getting better at making
product with them. Read from meters by a person at intervals (the main
incomer, the gas meter, the water meter, and the sub-meters on the
ovens, the chillers, the CIP set where they exist), divided by the
output of the same period, and trended. But intensity falls when output
rises, because part of the use is a **base load** that runs whether the
line does or not (refrigeration, lighting, compressors idling, the
boiler's standing loss); so the honest baseline is a **regression** of
use on output — use = base + slope × tonnes — and the performance is the
deviation from that line, cumulated (a CUSUM) so that a real saving
shows as a steady drift and a bad week as a step.

## Questions it answers
- Are we using more energy or water per tonne — and is that us or the
  output?
- What is the base load, and what does it cost at night and at
  weekends?
- Which users carry most of it (the ovens, the chillers, the CIP) —
  the Pareto?
- Did the change (a heat-recovery unit, a chiller set-point, a CIP
  programme) save what it should — the CUSUM?

## Inputs and minimum conditions
- Meter readings with their times, by a person, on a cadence (daily at
  the shift start is usual; weekly at least); the sub-meters where they
  exist.
- The output over the same periods (tonnes, packs) and the running
  hours.
- The tariffs (£/kWh electricity by time band, £/kWh gas, £/m³ water
  and effluent).

## Procedure and calculation
- Use per period = reading − previous reading (× the meter's
  multiplier); intensity = use ÷ output; trended by week and month.
- Baseline: least-squares regression of use on output over a reference
  period (`stats.correlation-regression`): use = a + b × tonnes; a is
  the base load per period (÷ hours = kW), b the marginal kWh a tonne;
  r² says how well output explains use (poor r² → another driver, e.g.
  ambient temperature for refrigeration — a second term).
- Expected use for a period = a + b × its tonnes; deviation = actual −
  expected; CUSUM of deviations (`spc.cusum-ewma`) — a change of slope
  is a change in performance, dated.
- Base load's cost: a × periods × tariff — the night and weekend bill
  for making nothing; the first saving to chase.
- By user from sub-meters: the Pareto (`quality.pareto`) of kWh and
  pounds; where there are no sub-meters, a clamp meter read by a person
  over a shift on the big users.
- Water the same way; effluent (trade effluent charges by volume and
  strength) beside it.

**Worked case** (`cases-projects-people-ergo-sust.py`): twelve days of
readings against daily tonnes — use = 4,986 kWh + 78.4 kWh/t × tonnes,
r² 0.98; the base load is about 208 kW, running all night. This month's
intensity 207 kWh/t; but at 30 t a day the same line gives 245 kWh/t and
at 45 t a day 189 — the intensity falls with output because of the base,
which is why the regression, not the ratio, is the baseline. The base
load's night bill (16 hours × 208 kW × £0.25) is about £830 a night —
the chillers' and compressors' idle hours are the first question.

## Assumptions, limits and misuse
- Ignoring the fixed base load: the ratio rewards a busy month and
  punishes a quiet one; the regression separates them.
- Readings taken at different times of day compare unequal periods;
  the time is recorded and the use scaled.
- A regression over a period with a change in it is two lines; the
  baseline is from before the change.
- Sub-meters assumed to add to the main; check — unmetered users are
  the difference.
- Water intensity without effluent misses half the cost.

## Reading the result
"412 kWh a tonne, up 6% — but output was down 12%: against the
baseline the site used 3% less than expected; the base load at night
is 180 kW, £720 a night." Money: kWh and m³ at their tariffs
(`knowledge/MONEY.md`, E), the base load's idle cost, and each saving's
CUSUM in pounds.

## When not to use it — and instead
Carbon from the energy → `sustainability.carbon`. The air leaks' share →
`sustainability.compressed-air-leaks`. The regression's arithmetic →
`stats.correlation-regression`; the CUSUM's → `spc.cusum-ewma`. Ranking
the users → `quality.pareto`.

## In food and FMCG manufacturing
Ovens and fryers (gas), refrigeration and freezers (electricity), CIP
sets (water, heat, chemicals), compressed air, the boiler; the night
base load of a chilled factory.

## References
- [standard] ISO 50001:2018, *Energy management systems — Requirements with guidance for use* (from knowledge).
- [standard] ISO 50006:2014, *Energy management systems — Measuring energy performance using energy baselines (EnB) and energy performance indicators (EnPI)* — the regression baseline (from knowledge).
- [guidance] Carbon Trust, *Monitoring and targeting* (CTG008) — the CUSUM method (from knowledge; not read from here).

## In Faultline
Not built (FC-226). Faultline's rule — every number counted, timed or
read by a person — fits meter readings exactly. FC-226 would take the
readings with their times on the factory's page, the output from the
lines' counts, the regression baseline and the CUSUM, the base load in
kW and pounds, and the Pareto by sub-meter; the carbon tool
reads it.
