---
id: sustainability.waste-streams
name: Waste by stream — weights, destinations and cost
aka: [waste streams, recycling, landfill diversion, waste cost, waste hierarchy, segregation, anaerobic digestion, EfW]
discipline: sustainability
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the waste hierarchy (prevent, reuse, recycle, recover, dispose) as the EU Waste Framework Directive 2008/98/EC and UK regulations set it; the food waste hierarchy (feed people, feed animals, AD, composting, disposal) as WRAP frames it; from knowledge, texts not read from here; the worked month in `scripts/knowledge/cases-projects-people-ergo-sust.py`
needs: []
next: [yield.food-waste, quality.pareto]
alternatives: []
related: [yield.food-waste, yield.mass-balance-yield, sustainability.carbon]
---
# Waste by stream — weights, destinations and cost

## Purpose and principle
Everything that leaves the site other than as product is a waste
stream — film offcuts, cardboard, food waste, general waste, effluent,
hazardous — each weighed (from the collector's tickets or the site's
weighbridge), each with a destination up or down the **waste hierarchy**
(prevented, reused, recycled, recovered as energy or anaerobic
digestion, disposed to landfill) and each with a cost or, for some
recyclates, a rebate. Seen by stream, the costliest and the most
avoidable stand out, and the diversion from landfill — the figure
retailers ask for — is a sum. Food waste is the stream that is also
yield: a tonne of product in the AD skip was a tonne of ingredients
bought, processed and not sold, and its real cost is the yield tool's
(`yield.food-waste`), many times the disposal charge.

## Questions it answers
- What leaves as waste, by stream, where to, at what cost?
- What share is diverted from landfill — and from disposal altogether?
- Which stream is the costliest, and which the most avoidable (highest
  on the hierarchy)?
- Is the food waste falling, in tonnes and in its full cost?

## Inputs and minimum conditions
- Weights by stream per collection (the collector's tickets, the
  weighbridge, or bins counted × a measured average weight) with dates.
- Each stream's destination and its gate fee or rebate per tonne; the
  haulage.
- Output over the period (for waste a tonne of product); the yield
  tool's food-waste figures for the full cost.

## Procedure and calculation
- kg and £ by stream per month; £ = Σ (tonnes × gate fee) + haulage −
  rebates; the Pareto of cost by stream (`quality.pareto`).
- Diversion from landfill = tonnes to any destination but landfill ÷
  total; from disposal (landfill and energy-from-waste) = tonnes
  prevented, reused, recycled or to AD ÷ total — say which is quoted.
- Waste a tonne of product by stream, trended; a stream's rise with no
  rise in output is a process question.
- Food waste's full cost = tonnes × (ingredients + processing labour +
  energy) from the yield tool, beside its disposal cost — the figure
  that justifies prevention.
- Segregation quality: contamination rejections from the collector
  (a recyclate load downgraded to general) counted and costed.
- Each stream's hierarchy position; the plan to move it up (film
  offcuts from general to recycled; food waste from AD to animal feed
  where the rules allow).

**Worked case** (`cases-projects-people-ergo-sust.py`): a month — film
offcuts 2,100 kg (recycled, £640), cardboard 5,400 kg (recycled, a
£120 rebate), food waste 8,200 kg (anaerobic digestion, £1,230), general
1,900 kg (landfill or energy-from-waste, £760): 17,600 kg, £2,510 in
disposal, 89% diverted from landfill. The food waste's disposal charge
is £1,230; at the yield tool's full cost of about £0.40 a kilogram it
is £3,300 of ingredients and work — the stream to prevent, not to
dispose of more cheaply.

## Assumptions, limits and misuse
- Diversion quoted without saying from what (landfill, or disposal) —
  energy-from-waste counts as diverted from landfill and not from
  disposal.
- Weights from bin counts without a measured average are guesses;
  weigh a sample of bins.
- Food waste costed at the gate fee alone hides nine tenths of its
  cost.
- A stream moved up the hierarchy by re-labelling (general waste
  called "recovered") is a report, not a change.
- Effluent (volume and strength charges) is a waste stream and often
  the most expensive; it is in the list.

## Reading the result
"17.6 tonnes of waste this month, £2,510, 89% diverted from landfill;
the food waste's 8.2 tonnes cost £1,230 to dispose of and about £3,300 to
make — prevention is the work." Money: disposal costs and rebates by
stream, and the food waste's full cost from the yield tool
(`knowledge/MONEY.md`, Q and E), never only the gate fee.

## When not to use it — and instead
Food waste by cause and stage, in detail → `yield.food-waste`,
`yield.mass-balance-yield`. The carbon of what is disposed →
`sustainability.carbon` (scope 3, named as out of scope). Ranking the
streams → `quality.pareto`.

## In food and FMCG manufacturing
Packaging waste (film, cardboard, trays), food waste to AD or animal
feed, effluent from CIP and washing, hazardous (oils, chemicals); the
retailer's waste and diversion questionnaire.

## References
- [law] Directive 2008/98/EC on waste (the Waste Framework Directive), Article 4 — the waste hierarchy; retained in UK law through the Waste (England and Wales) Regulations 2011 (from knowledge).
- [guidance] WRAP, *Food waste hierarchy* and the *Food Waste Reduction Roadmap* (from knowledge; not read from here).
- [guidance] UK Government, *Waste duty of care code of practice* (2018) — the transfer notes that give the weights (from knowledge).

## In Faultline
Not built (FC-228). The yield tools hold the food waste by cause
(`yield.food-waste`); FC-228 would take each collection's weight
and destination as a log on the factory, say kg and £ by stream, the
diversion with its basis, and set the food waste's disposal charge beside
its full cost from the yield tool.
