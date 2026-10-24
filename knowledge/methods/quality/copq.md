---
id: quality.copq
name: The cost of poor quality — prevention, appraisal, internal and external failure
aka: [COPQ, cost of quality, PAF model, quality costs, hidden factory, failure cost]
discipline: quality
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the PAF model as Feigenbaum (1956) and Juran's *Quality Control Handbook* give it (from knowledge; editions to confirm); BS 6143-2:1990 (the PAF guide) named from knowledge; the week's worked case computed in `scripts/knowledge/cases-quality.py`; the buckets' mapping to the money model's causations as `knowledge/MONEY.md`
needs: []
next: [quality.pareto]
alternatives: [equipment.cost-deployment]
related: [cost.line-cost-model, quality.fpy-rty, quality.nonconformance-hold]
---
# The cost of poor quality — prevention, appraisal, internal and external failure

## Purpose and principle
Quality has a cost on both sides: what is spent to get it right
(prevention, appraisal) and what is paid when it goes wrong (internal
failure before despatch, external failure after). Adding them up by
bucket and by line turns scattered losses — scrap, rework, give-away,
holds, complaints, re-inspection — into one figure a manager can set
against sales, and shows the usual shape: failure costs several times
prevention. The Pareto of the failure buckets is where the improvement
money is.

## Questions it answers
- What does poor quality cost this line a week, in pounds and as a share
  of sales?
- Which bucket, which line, which product, which kind of failure?
- Is spending on prevention moving the failure costs?

## Inputs and minimum conditions
- The failure events the app already counts with their money: rejects by
  fate (waste, rework, recovered — `yield.giveaway`'s rule), give-away,
  holds and their outcome, downtime caused by quality, complaints and
  charge-backs, recalls.
- Appraisal: the checks' labour (the control plan's rows), the lab, the
  gauges' calibration.
- Prevention: training, FMEA and control-plan work, maintenance done for
  quality, supplier development.
- Sales (or standard cost of output) for the period, to say the share.

## Procedure and calculation
- Four buckets, each a list of items with a source and a formula —
  **Prevention**: planning, training, process design, supplier
  assurance (hours × rate).
  **Appraisal**: inspection and test labour, lab, calibration, audit
  (hours × rate; materials destroyed by testing).
  **Internal failure**: scrap (packs × materials + labour to that
  point), rework (labour + materials again), give-away (`yield.giveaway`),
  downgrade (price lost), holds (tied up and lost shelf life —
  `quality.nonconformance-hold`), downtime from quality causes (lost
  contribution — `knowledge/MONEY.md` T), re-inspection, sorting.
  **External failure**: complaints handling, returns, charge-backs,
  credits, withdrawals and recalls, lost sales where known.
- Totals by bucket and by line/product/period; as a share of sales
  (typical sites measure 5–25% — Juran's rough range) and as £ a pack.
- The failure Pareto (`quality.pareto`) by kind and by line; the trend
  by month; prevention and appraisal plotted beside failure to show
  whether the shape is moving.
- Only counted costs, from records; never an estimated "hidden" multiplier
  on screen — the hidden factory is sized by `quality.fpy-rty`, and said
  as packs, not invented pounds.

**Worked case** (`cases-quality.py`): one line, one week — prevention
£1,800 (11%), appraisal £3,200 (19%), internal failure £9,400 (55%),
external failure £2,600 (15%); total £17,000 = 5.5% of the week's
£310,000 sales; failure is 71% of the quality cost. The internal
failure's Pareto (give-away £4,100; rework £2,800; scrap £1,700; holds
£800) says where the first project goes.

## Assumptions, limits and misuse
- A bucket filled by estimate becomes the number people argue about;
  count what is counted and leave the rest named as missing.
- Double counting: a reject's materials appear once; its lost
  contribution only if the line was the bottleneck and the time is not
  recovered (`knowledge/MONEY.md`'s two-parts rule).
- Prevention spend cut to reduce "quality cost" is the classic misread;
  the figure to move is failure.
- Allocating overhead inflates every bucket; direct costs only, and said.
- A low figure can mean good quality or poor counting; the trend and the
  Pareto, not the total, carry the meaning.

## Reading the result
"Poor quality cost Line 2 £12,000 last week (3.9% of sales) — give-away
£4,100 of it, rework £2,800; we spent £1,800 preventing and £3,200
checking." Money is the whole of it; each item carries its causation from
`knowledge/MONEY.md` so the sum is traceable to the tools that counted it.

## When not to use it — and instead
Losses by equipment and loss type (TPM's view) → `equipment.cost-deployment`.
One line's full cost model (labour, margin, speed) → `cost.line-cost-model`.
The share of packs right first time → `quality.fpy-rty`.

## In food and FMCG manufacturing
Give-away and rework dominate internal failure on most packing lines;
holds and shelf-life loss on chilled; charge-backs and complaint costs on
retailer accounts; the lab and the checks as appraisal; allergen and
foreign-body prevention as the prevention line that is never resented
after the first recall.

## References
- [textbook] Juran, J.M. and De Feo, J.A. (eds.), *Juran's Quality Handbook*, 6th ed., McGraw-Hill, 2010 — quality costs and their categories (from knowledge).
- [paper] Feigenbaum, A.V. (1956), "Total quality control", *Harvard Business Review* 34(6), 93–101 — the PAF categories (from knowledge).
- [standard] BS 6143-2:1990, *Guide to the economics of quality — Part 2: Prevention, appraisal and failure model* (from knowledge; withdrawn status to confirm).
- [textbook] Campanella, J. (ed.), *Principles of Quality Costs*, 3rd ed., ASQ Quality Press, 1999 (from knowledge).

## In Faultline
Not built (FC-128). Most of the internal-failure items are already counted
in money by the tools (`src/tools/capability` give-away and rejects,
`src/lib/problemCost.ts` rejects and held product, `src/tools/losses`
quality stops); FC-128 adds the four buckets as a page on the line and the
factory, each item traced to its record, the share of sales, and the
failure Pareto.
