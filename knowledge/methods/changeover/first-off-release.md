---
id: changeover.first-off-release
name: First-off release — the checks before the first good pack ships
aka: [first-off, start-up check, line clearance, line release, first article, start-up approval, pre-start checks]
discipline: changeover
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — food-industry practice at BRCGS-audited sites (line clearance and start-up checks; BRCGS Food Issue 9 clauses 6.2 and 5.3 named from knowledge, not confirmed against the text); the worked case in `scripts/knowledge/cases-operations.py`
needs: []
next: [packaging.code-label-verification]
alternatives: []
related: [changeover.smed, foodsafety.allergen-changeover, spc.pre-control, quality.control-plan]
---
# First-off release — the checks before the first good pack ships

## Purpose and principle
Between the changeover's last turn of the spanner and the first pack
that counts, a list is run: the old product and its packaging are gone
(line clearance), the allergen clean is verified where one was needed,
the right film, tray and label are loaded and verified by code, the date
and lot code are right, the first packs weigh and seal within limits,
the metal detector and checkweigher pass their test pieces. Nothing
ships until the list is signed. It is the gate between SMED's "run-up and
adjustments" and production, and its time is part of the changeover's
cost; its failures are the changeover's most expensive defects, found
either here or by the customer.

## Questions it answers
- Is the line released — every check passed, by whom, when?
- How long from the last old pack to release (the first-off time, part
  of SMED's changeover)?
- Which checks fail most, and which could be made impossible to fail
  (the poka-yoke)?
- Was a release skipped or late — the audit's question?

## Inputs and minimum conditions
- The check list per line and per kind of change (a like-for-like
  product change needs fewer than an allergen change); each check with
  its method and its pass criterion.
- The plan for the run (product, packaging codes, date format, allergen
  status) to check against.
- Who may release (quality or a trained line leader), written.

## Procedure and calculation
- The list, in order: line clearance (old product, packaging, labels,
  rework removed and signed) · allergen clean verified where the
  matrix says (`foodsafety.allergen-changeover` — visual, and ATP or
  allergen swab where required, `foodsafety.cleaning-verification-atp`)
  · packaging loaded matches the plan by scanned code (film, tray, lid,
  label, case) · date and lot code printed and read back
  (`packaging.code-label-verification`) · first packs: weight within
  limits (five packs, or `spc.pre-control`'s five greens on a capable
  filler), seal visual and pull, oxygen where MAP · metal detector test
  pieces (Fe, non-Fe, stainless) passed and rejected · checkweigher test
  weights and reject proven (`packaging.checkweigher-verification`) ·
  release signed with time.
- First-off time = release time − last old pack time; the run-up and
  adjustments inside it belong to SMED's record (`changeover.smed`), the
  checks' own minutes to this one.
- Pass/fail per check; a failure stops the release; the correction, the
  re-check; the failures by check over the month (`quality.check-sheet`)
  — the Pareto that names the poka-yoke (`lean.poka-yoke`: a scanner at
  loading refuses the wrong reel; a printer that will not start without
  the day's code; a line-clearance photo).
- Compliance: releases signed ÷ runs; late (first pack shipped before
  release) is a non-conformance, not a late tick.

**Worked case** (`cases-operations.py`): eight checks; the line started
at 06:30 and released at 06:52 — 22 minutes to the first good pack, of
which the checks took 9 and the adjustments 13 (SMED's). This month's
failures at release: label 3, code 2, weight 1 — the label is the
poka-yoke candidate; each label failure caught here was a recall not
had.

## Assumptions, limits and misuse
- A release signed before the checks are done is the failure mode the
  record exists to show; the times are kept.
- A list that is the same for every change is either too long (a like
  product change) or too short (an allergen change); the list follows the
  change's kind.
- Checks by the person who did the changeover are a self-check; the
  release is a second pair of eyes or a scan.
- First-off checks are a sample of a few packs; they do not prove the
  run (`spc.zero-failure-demonstration`); the in-run checks continue
  (`quality.control-plan`).
- Rework from the previous product left on the line is the classic
  line-clearance miss; the clearance is a walk, not a tick.

## Reading the result
"Released at 06:52, 22 minutes after the last old pack — 8 checks
passed, signed by Sam. This month three releases failed on the label:
fit the scanner." Money: the first-off minutes as part of the changeover
at the line's lost contribution (`knowledge/MONEY.md`, T); a failure
caught here against the recall it would have been (C).

## When not to use it — and instead
The changeover's own time and its reduction → `changeover.smed`. The
allergen clean's method → `foodsafety.allergen-changeover`. The label
checks through the run → `packaging.code-label-verification`. The error-
proofing design → `lean.poka-yoke`.

## In food and FMCG manufacturing
Every product change on every packing line; the allergen change with its
verified clean; the promotional pack with its one-off label; the
co-packer's audit trail of releases.

## References
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clauses 5.3 (allergen management), 6.2 (labelling and pack control) — line clearance and start-up checks (from knowledge; clauses not confirmed against the text).
- [practice] Retailer codes of practice (Tesco, Sainsbury's, M&S) — start-up and label verification requirements (from knowledge).
- [textbook] Shingo, S., *A Revolution in Manufacturing: The SMED System*, Productivity Press, 1985 — the run-up and first good piece as part of the changeover (from knowledge).

## In Faultline
Not built (FC-071). SMED records the changeover to the first good piece
(`src/tools/changeover`); the programs page records a test and its day
(`src/line`); FC-071 adds the release list per line and kind of change,
each check tapped with its result and time, the release signed, the
first-off minutes into SMED's record, and the failures by check pointing
at the poka-yoke.
