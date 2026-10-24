---
id: yield.multihead-weigher
name: The multihead weigher — why its packs are not normal, and where its give-away comes from
aka: [combination weigher, multihead, CCW, head performance, weigher give-away, combination search]
discipline: yield
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — the combination weigher's principle and its consequences for the pack-weight distribution (from knowledge: manufacturers' literature — Ishida, Yamato — and packaging-engineering practice; no standard text); an idealised combination search simulated in `scripts/knowledge/cases-operations.py` to show the shape, not to predict a real machine's give-away
needs: [spc.normality-checks]
next: [yield.giveaway]
alternatives: []
related: [stats.anova, stats.tolerance-stackup, packaging.average-quantity-system]
---
# The multihead weigher — why its packs are not normal, and where its give-away comes from

## Purpose and principle
A multihead weigher fills a dozen or more hoppers with portions of
product, weighs each, and drops the combination of hoppers whose sum is
closest to the target *at or above it*. Because it always rounds up and
never down, the pack weights are bounded at the target and lean to the
right — a shape that is not normal, on which a Cpk means nothing. Its
give-away comes from how finely the combinations can land (the portion
size against the target, the number of heads, how evenly the heads are
fed) and from the set-up (the target above the legal minimum). Reading
it needs the right shape and a head-by-head look.

## Questions it answers
- What is the weigher's give-away, and what is it made of?
- Is one head feeding heavy or light (the ANOVA across heads)?
- Would a different portion size, more heads in the combination or a
  tighter target cut it?
- Is the pack-weight distribution being read with the right shape
  (`spc.capability-nonnormal`)?

## Inputs and minimum conditions
- Pack weights off the checkweigher (hundreds, by product and run) and,
  where the machine gives them, the head weights per combination (the
  weigher's own log) or a sample per head.
- The target, the nominal and the legal minimum (`packaging.average-quantity-system`).
- The portion setting (target per head) and the number of heads in the
  combination.

## Procedure and calculation
- The shape: the pack weights' histogram is bounded at the target with a
  right tail; the normality check fails by design (skew > 0); the
  give-away is read as the mean − target and the tail as the measured
  share beyond a limit, never from a normal Ppk
  (`spc.capability-nonnormal`, `stats.distribution-fitting`).
- Give-away = mean pack weight − target (and − nominal, the legal view);
  × packs × £/kg (`yield.giveaway`, `knowledge/MONEY.md` Q).
- Resolution: with k heads of portion p and n in the combination, the
  achievable sums near the target are spaced by about the portion's
  spread ÷ √(combinations); finer portions (more heads per pack) or more
  heads give more combinations and a smaller over-shoot — at the cost of
  speed (more hoppers to refill).
- Head performance: the weights per head over a run; ANOVA across heads
  (`stats.anova`) finds a head feeding heavy or light — its feeder's
  amplitude, not the target, is the fix; a dead head (never chosen)
  shows as a hopper that is always full.
- Unders: a combination that cannot reach the target (all hoppers light)
  gives an under-weight pack or a recycle; their count is the weigher's
  short-feed rate.
- Target against the legal minimum: with a bounded-below shape the
  target can sit closer to the minimum than a normal process could; the
  rules' tolerable negative error and the 2.5% rule still apply
  (`packaging.average-quantity-system`).

**Worked case** (`cases-operations.py`, an idealised search): 14 heads
feeding portions of 37.5 ± 4 g, 4 to a 150 g pack, the best of 1,001
combinations at or above 150: mean 150.02 g, give-away 0.02 g, a right
tail (skew far from zero) and a few unders where no combination reached
150. Real weighers give 0.3–1% give-away because portions are coarser
and heads uneven — the idealised figure shows what the search can do,
not what a machine does. One head running 6 g heavy (43.5 against 37.5
on the others) is found at once by the head means; the fix is that
head's feeder.

## Assumptions, limits and misuse
- A normal Cpk on weigher packs is wrong twice: the shape and the bound.
  Faultline's capability study already refuses the normal verdict on a
  leaning set.
- The idealised simulation above is not a model of any machine; the
  machine's own give-away is read from its packs.
- Head weights are the machine's data; without them the ANOVA is on
  packs, which averages the heads away.
- Raising the target to "stop the unders" buys give-away on every pack;
  the unders' cause (a light head, a bridging product) is the fix.
- Product that bridges or sticks changes portion spread shift by shift;
  the give-away is tracked by run, not assumed.

## Reading the result
"The weigher's packs average 151.1 g on a 150 g target — 1.1 g (0.7%)
give-away, 2.4 kg an hour at 60 packs a minute: £X a shift. Head 4 feeds
6 g heavy; the shape is bounded at 150 with a right tail — read as
measured, not as a normal." Money: give-away × packs × £/kg
(`knowledge/MONEY.md`, Q), per shift and per week.

## When not to use it — and instead
A single-head filler's give-away → `yield.giveaway` directly. The legal
rules → `packaging.average-quantity-system`. The shape and its fitted
percentiles → `stats.distribution-fitting`. Several deposits summed →
`stats.tolerance-stackup`.

## In food and FMCG manufacturing
Snacks, frozen vegetables, confectionery, salad leaves, nuts, pasta,
sweets — every product weighed by combination; the give-away argument
settled by the head means and the shape.

## References
- [practice] Ishida Co. and Yamato Scale — manufacturers' technical literature on combination weighing and head performance (from knowledge; no single public text).
- [guide] UK Weights and Measures (Packaged Goods) Regulations 2006 — the three rules the target meets (`packaging.average-quantity-system`; from knowledge).
- [textbook] Beckett, S.T. (ed.), *Industrial Chocolate Manufacture and Use* and general packaging-engineering texts — combination weighers (from knowledge).

## In Faultline
Not built (FC-158). The capability study already reads a leaning set
honestly and says give-away in money (`src/tools/capability`, FC-156);
FC-158 adds the head weights by head, the ANOVA across heads with the
heavy or light head named, the unders' count, and the resolution
argument for the portion setting.
