---
id: packaging.code-label-verification
name: Code and label verification — the right label, the right date, every reel and every hour
aka: [label check, date code check, code verification, label control, print verification, start-up label check]
discipline: packaging
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — food-industry practice as BRCGS-audited sites run it (from knowledge; BRCGS Food Issue 9 clause 6.2 on labelling and pack control named from knowledge, not confirmed); Regulation (EU) No 1169/2011 (retained in UK law) as the legal frame (from knowledge); the worked run in `scripts/knowledge/cases-operations.py`
needs: []
next: [spc.zero-failure-demonstration]
alternatives: []
related: [changeover.first-off-release, lean.poka-yoke, foodsafety.allergen-changeover, msa.calibration]
---
# Code and label verification — the right label, the right date, every reel and every hour

## Purpose and principle
A wrong label is the commonest cause of a food recall: the right product
in the wrong pack, an allergen not declared, a date code that is wrong
or missing. The check is simple and must be relentless — at the start of
every run, after every reel or label-roll change, at intervals, and at
the end: the label on the pack is the one the plan says (by its code,
scanned not read), the date and lot are right and legible, the allergen
statement matches the recipe. When a check fails, everything since the
last good check is suspect. The method's power is in the frequency and
the containment, and the real fix is a poka-yoke that makes the wrong
label impossible to load.

## Questions it answers
- Were the checks done this run — start, every reel, hourly, end?
- Did any fail, and how much product is between the failure and the
  last good check?
- Which failure kinds recur (label, code, legibility) — the poka-yoke
  list?
- Is the line's label control working, as the auditor asks?

## Inputs and minimum conditions
- The plan for the run: product, label code or barcode, date and lot
  code format, the allergen declaration expected.
- A check record per event: time, who, the label's scanned code matched
  (or read), the printed date and lot as seen, legibility, result.
- The line rate, for the product at risk when a check fails.
- The reel and roll changes as events (each is a check).

## Procedure and calculation
- Due checks = 1 (start) + reel/roll changes + hourly (or the agreed
  interval) + 1 (end); compliance = done ÷ due; missed checks named.
- Each check: label identity by barcode scan against the plan (the
  retailer's EAN; a visual read is the fallback and is said as such);
  date and lot code against the day's format; allergen box against the
  recipe (`foodsafety.allergen-changeover`); legibility (a sample pack
  kept).
- A failure: the line stopped; the last good check's time; product at
  risk = (time of failure − last good) × line rate, held and re-checked
  one by one or by lot (`quality.nonconformance-hold`); the cause named
  (wrong reel loaded, printer setting, ribbon out).
- Failures by kind over the month (`quality.check-sheet`); each kind's
  poka-yoke: a scanner at the label-reel loading point that refuses the
  wrong reel (the strongest), a two-person check at changeover, a
  printer that will not start without the day's code confirmed
  (`lean.poka-yoke`).
- How sure "no wrong labels" is from n good checks:
  `spc.zero-failure-demonstration` — n checks with no failure show at
  most 3/n failure rate at 95%; the checks are a sample of the run, not
  a guarantee, which is why the poka-yoke matters.

**Worked case** (`cases-operations.py`): a 7-hour run with 4 reel
changes → 1 + 4 + 7 + 1 = 13 checks due; 12 done (92%) — the missed one
named. A wrong date code found at the 14:00 check, the last good at
13:00: 60 min × 110/min = 6,600 packs between, held and re-checked. This
month's failures: label 3, code 2, weight 1 — the label reel is the
poka-yoke candidate (a scan at loading).

## Assumptions, limits and misuse
- A visual read of a label is not a verification of its identity; two
  labels can look alike and differ in one allergen line. Scan the code.
- Hourly checks on a 200-a-minute line leave 12,000 packs between
  checks; the frequency is a risk decision, said in packs.
- Ticks without the reading (the code as printed) cannot show a drift
  (a date rolling over at midnight on the wrong day).
- The check verifies the pack, not the plan: a plan with the wrong
  label code passes every check. The plan is verified at changeover
  (`changeover.first-off-release`).
- Containment that re-checks "a few" of the packs at risk is a sample
  with a stated confidence, not a clearance; for an allergen error it is
  every pack or none shipped.

## Reading the result
"Run 06:30–13:30: 12 of 13 label checks done; the 14:00 check found the
wrong date — 6,600 packs since 13:00 held and re-checked, 0 wrong found.
Three label failures this month: fit a scanner at reel loading." Money:
the held packs (`knowledge/MONEY.md`, H) and the re-check labour (L); the
poka-yoke's cost against a recall's (C).

## When not to use it — and instead
The whole first-off release at a changeover → `changeover.first-off-release`.
The allergen clean and its verification → `foodsafety.allergen-changeover`.
The error-proofing design → `lean.poka-yoke`. The hold →
`quality.nonconformance-hold`.

## In food and FMCG manufacturing
Every packing line, every run — and especially multi-product lines with
look-alike labels, promotional packs, and products whose allergen
recipes differ by a single ingredient.

## References
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 6.2 — labelling and pack control (from knowledge; clause not confirmed against the text).
- [law] Regulation (EU) No 1169/2011 on the provision of food information to consumers, retained in UK law — mandatory particulars, allergen declaration (from knowledge).
- [guide] Food Standards Agency and FDF guidance on allergen labelling and label control (from knowledge).

## In Faultline
Built (`FC-166`, `knowledge/specs/FC-166-code-label.md`) as a check log on
the shared shape (`src/tools/checks`, `defs/code-label.ts`): label,
date, allergen and legibility on the starter schedule (start, reel change,
hourly, end), pass/fail each check, compliance and what a failure holds; the
line's programs still carry the product and its run (`src/line`); the register
carries the problem (`src/snag`). First-off release and the poka-yoke register
are separate tools when built.
