---
id: capacity.throughput-accounting
name: Throughput accounting — what to run when the constraint is full
aka: [throughput accounting, T/CU, throughput per constraint minute, TOC product mix, contribution per bottleneck hour, Goldratt's T I OE]
discipline: capacity
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — throughput (price less truly variable cost) per constraint minute as Goldratt's *The Goal* and *The Haystack Syndrome* and Corbett's *Throughput Accounting* give it (from knowledge); Faultline's arithmetic in `src/lib/ie/mix.ts` (mix) proved by its test; the worked case computed in `scripts/knowledge/cases-capacity.py`
needs: [capacity.theory-of-constraints]
next: [planning.scheduling-rules]
alternatives: []
related: [cost.line-cost-model, capacity.load-vs-demand, capacity.dbr-buffer]
---
# Throughput accounting — what to run when the constraint is full

## Purpose and principle
When the bottleneck has fewer minutes than the orders want, the question
is which product earns most *per minute of the constraint*, not per
unit. Throughput T is price less the truly variable cost (materials,
packaging, anything that varies pack by pack — not labour, not
overhead); a product's worth to a full line is T per unit × the
constraint's rate for it. A low-margin product that runs fast can be
worth more a minute than a high-margin one that runs slow. Ranking by
T per constraint minute and filling the constraint's time in that order
is the product-mix rule; the rest of the costs (operating expense) do not
change with the mix in the week and are left out of the ranking on
purpose.

## Questions it answers
- The constraint is full: which orders to run, which to move or
  decline?
- What is a constraint minute worth — so a stop, a changeover and a
  speed loss can be priced?
- Is a product worth running at all on this line, or better bought in
  or made elsewhere?

## Inputs and minimum conditions
- The constraint (`capacity.theory-of-constraints`, Line capacity's
  bottleneck) and its rate per product (per minute).
- Each product's price and truly variable cost per unit (materials and
  packaging; the line's margin a pack in `knowledge/MONEY.md` is this
  figure); the demand per product.
- The constraint's available minutes in the period (after planned
  changeovers; or with changeovers charged to the sequence).

## Procedure and calculation
- T per unit = price − truly variable cost.
- T per constraint minute = T per unit × constraint rate (units per
  minute); rank products by it, highest first.
- Fill the constraint's minutes in rank order up to each product's
  demand; what does not fit is moved or declined; the plan's throughput
  = Σ units × T per unit.
- The value of a constraint minute = the T per minute of the marginal
  product (the last one in) — the figure that prices a changeover
  minute, a stop and a speed loss on the constraint (`knowledge/MONEY.md`,
  T); off the constraint a minute is worth only its labour.
- Changeovers: charged to the constraint's minutes; a sequence that cuts
  them frees minutes worth the marginal product's T.
- Compare with ranking by margin per unit — where the two differ is
  where the rule earns its keep.
- Operating expense (labour, overhead) is the period's cost and is
  compared with the period's T for the line's profit, not spread over
  units for the ranking.

**Worked case** (`cases-capacity.py`): four products — King Edward 2.5 kg
T £0.55 at 90/min = £49.5 a constraint minute; Maris 2 kg £0.42 at 100 =
£42.0; Tesco 1.25 kg £0.31 at 110 = £34.1; Baby 1 kg £0.20 at 120 =
£24.0. Here the two rankings agree, and the week's demand fits in the
4,374 constraint minutes with 2,832 to spare — so the rule changes
nothing this week (throughput £60,450 either way); it bites when the
constraint is full. Had Baby 1 kg carried £0.45 at 120/min it would rank
first (£54 a minute) despite the lowest margin per unit — the classic
case. A constraint minute this week is worth £24 (the marginal product);
so a 42-minute changeover on a full week costs about £1,000 of throughput,
and SMED's 15 minutes saved are worth £360 a changeover.

## Assumptions, limits and misuse
- Labour in the "variable cost" is the classic error: the crew is paid
  for the shift whatever is run; T uses truly variable costs only.
- The ranking is for a *full* constraint; with headroom, run everything
  the customer wants in the sequence that cuts changeovers.
- The constraint must be the right one: a ranking on a machine that is
  not the bottleneck optimises nothing.
- Demand caps and customer commitments bound the rule; "decline the
  order" is a decision with a relationship attached, said to the
  person who owns it.
- Prices and variable costs change; the ranking is re-run with the
  week's figures.
- Service-level and shelf-life constraints (a fresh product must run
  today) are added as constraints, not ignored.

## Reading the result
"The line is full next week: run King Edward first (£49 a minute), then
Maris, then Tesco; Baby 1 kg's 24,000 do not fit — move them or add a
shift (worth £24 a minute of throughput against the shift's labour)."
Money is the method: T per constraint minute is the figure
`knowledge/MONEY.md` uses for a constraint minute lost (T) and gained.

## When not to use it — and instead
Whether the week fits at all → `capacity.load-vs-demand`. Finding the
constraint → `capacity.theory-of-constraints`, Line capacity. The full
cost model of the line → `cost.line-cost-model`. The sequence →
`planning.scheduling-rules`, `changeover.sequencing`.

## In food and FMCG manufacturing
A full packing line with retailer orders competing; a promotion's volume
against the regular range; a co-pack enquiry priced by the constraint
minutes it takes; the decision to run a slow, high-margin product on the
bottleneck line or move it to a slower line with spare hours.

## References
- [textbook] Goldratt, E.M. and Cox, J., *The Goal*, 3rd ed., North River Press, 2004; Goldratt, E.M., *The Haystack Syndrome*, North River Press, 1990 — T, I, OE and the constraint-minute rule (from knowledge).
- [textbook] Corbett, T., *Throughput Accounting*, North River Press, 1998 (from knowledge).
- [textbook] Noreen, E., Smith, D. and Mackey, J.T., *The Theory of Constraints and its Implications for Management Accounting*, North River Press, 1995 (from knowledge).

## In Faultline
Built (31 October, FC-042, `knowledge/specs/FC-042-product-mix.md`): on the line's capacity panel — *Which first
when the line is full?* — `src/tools/linebalance/capacityMix.ts` over `src/lib/ie/mix.ts`. Each product with a
Line capacity is a row: its speed (the good packs a minute its capacity makes), its orders (the panel's *Will next
week's orders fit?*), and a **price and materials a pack** typed beside them (kept in the product's Line capacity
document; the line's materials and margin a pack stand in, said, and then the ranking is by speed alone). Ranked by
T per constraint minute, the week's minutes (the line's SMED running pattern, else its planned hours) filled in that
order, the unmade by name and worth, the week's throughput against the same week by margin a pack, and a minute
lost at the constraint priced at the marginal product — only while the week is full (otherwise "not output lost
yet"). Changeovers between products are not taken off the week (the sequencing tools’ job); the worked
case above is the unit test's, with a second brute-forced in `scripts/knowledge/cases-capacity-three-mix.py`.
