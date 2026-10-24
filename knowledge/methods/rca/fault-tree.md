---
id: rca.fault-tree
name: Fault tree analysis
aka: [FTA, fault tree, AND OR gates, top event, minimal cut sets, basic events]
discipline: rca
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — IEC 61025:2006 *Fault tree analysis (FTA)* for the symbols, the gate arithmetic and cut sets (from knowledge; the standard not read); the independent-event gate formulas are textbook probability; the worked tree (a metal contaminant reaching a pack) computed in `scripts/knowledge/cases-rca.py` with illustrative probabilities
needs: []
next: [quality.fmea]
alternatives: [rca.fishbone-5whys]
related: [quality.fmea, foodsafety.metal-detection-verification, foodsafety.haccp, lean.poka-yoke]
---
# Fault tree analysis

## Purpose and principle
Start from the one event that must not happen — the **top event**: a
metal contaminant reaches a pack, an under-cooked product leaves the
line, a line stops for more than an hour — and work downward through
logic gates to the basic events that could combine to cause it. An
**OR** gate: any one input causes the output. An **AND** gate: all its
inputs must occur together. The tree is a picture of how the protections
are arranged — a defence that must fail *and* a hazard that must be
present — and its **minimal cut sets** are the smallest combinations of
basic events that cause the top event: the list of the ways it can
happen, ranked by their probability where the basic events have one.
Where the fishbone gathers every possible cause of a chronic problem,
the fault tree works out how a specific bad outcome is reached and which
barrier is doing the most work.

## Questions it answers
- What combinations of failures let the top event happen — the cut
  sets?
- Which cut set carries most of the probability, and which barrier,
  strengthened, cuts it most?
- How often is the top event expected (per pack, per year) if the basic
  events' rates are known?
- Is a single basic event enough on its own (a cut set of one — the
  weakest point)?

## Inputs and minimum conditions
- The top event stated exactly (what, where, how much).
- The system's logic: the hazard's sources and every barrier between it
  and the top event (the detector, the reject, the reject confirmation,
  the check, the person).
- For a quantified tree: each basic event's probability per
  opportunity or rate per unit time, from records (`maintenance.mtbf-failure-rate`,
  the verification checks' failure share) or estimated and marked so.
- Independence between basic events, or the common cause named.

## Procedure and calculation
- Build downward: top event → immediate causes through a gate → their
  causes → basic events (circles). Stop at events whose rate can be
  known or acted on.
- OR gate (independent inputs): P = 1 − Π(1 − pᵢ); for small pᵢ ≈ Σpᵢ.
  AND gate: P = Π pᵢ.
- Minimal cut sets by Boolean reduction (for small trees, by hand: each
  path from a basic event up through AND gates collects partners); the
  top's probability ≈ Σ cut sets for rare events (the exact value by
  inclusion–exclusion).
- Importance: each cut set's share of the top; a barrier's worth is the
  fall in the top when its failure probability is set to zero.
- Expected frequency = P(top per opportunity) × opportunities per period
  (packs a day, batches a week).
- Common-cause failures (one power loss stops the detector and the
  reject together) added as a basic event feeding both branches, else
  the AND gates overstate the protection.

**Worked case** (`cases-rca.py`, illustrative probabilities): top event
— a metal contaminant reaches a pack. AND of: contaminant present in
the product (0.002 per pack, from history) and the detector fails to
remove it. The detector fails to remove by OR of: a **miss** (OR of
sensitivity drift 0.01 and a product-effect setting 0.005 → 0.015) and
**detected but not removed** (AND of detected 0.985, reject arm fails
0.02, no reject confirmation 0.5 → 0.0099) → 0.0247. Top =
0.002 × 0.0247 = 4.9 × 10⁻⁵ per pack — at 48,000 packs a day, 2.4
contaminated packs a day expected. Cut sets: contaminant & drift 41% of
the top; contaminant & detected & reject fails & no confirmation 40%;
contaminant & product effect 20%. A reject-confirmation sensor always
working takes the second cut set to zero and the top down 39% — the
cheapest barrier is doing a third of the work when it is on.

## Assumptions, limits and misuse
- Probabilities invented to make the tree look quantified are worse
  than a qualitative tree; mark every estimate and keep the cut sets
  (which need no numbers) as the first result.
- Independence is assumed by the gate formulas; common causes (power,
  a shared operator, a shared sensor) must be drawn in.
- A tree for every problem is overkill; it is for the rare, serious
  outcome with several barriers — the HACCP CCPs, a safety event, a
  long stop.
- A fault tree shows how the top event happens, not why the basic
  events happen; the fishbone and five whys take a basic event onward.
- A top event stated loosely ("quality problem") has no tree.

## Reading the result
"Three ways a contaminant reaches a pack; drift in the detector and a
failed reject with no confirmation carry 80% of it between them — the
reject-confirmation sensor, kept working, cuts the risk by 39%." Money:
the consequence the tree protects against (`knowledge/MONEY.md`, C — a
recall, a customer's finding) against each barrier's cost; the expected
events a year × the consequence is the risk in pounds, said as the
estimate it is.

## When not to use it — and instead
Everyday chronic problems with many possible causes →
`rca.fishbone-5whys`. Ranking failure modes of a design or process
across the board → `quality.fmea` (the tree takes one of its highest
effects deeper). The detector's own checks →
`foodsafety.metal-detection-verification`. The CCP's place →
`foodsafety.haccp`.

## In food and FMCG manufacturing
Metal and X-ray detection systems with their rejects and confirmations;
a pasteurisation or cook failure reaching despatch; an allergen
cross-contact reaching a pack; a line stop of over an hour on a
short-life product.

## References
- [standard] IEC 61025:2006, *Fault tree analysis (FTA)* (from knowledge; not read).
- [textbook] Vesely, W.E. et al. (1981), *Fault Tree Handbook*, NUREG-0492, US Nuclear Regulatory Commission — the classic public text (from knowledge).
- [textbook] Rausand, M. and Høyland, A. (2004), *System Reliability Theory*, 2nd ed., Wiley — cut sets and importance (from knowledge).

## In Faultline
Not built (FC-152). The register's problems and the HACCP's CCPs are
the top events it would start from; the reliability tool's counts
(`src/tools/reliability`) and the verification checks are the basic
events' rates. FC-152 would draw the tree, list the cut sets with their
shares and say which barrier is worth most — on a line or a project.
