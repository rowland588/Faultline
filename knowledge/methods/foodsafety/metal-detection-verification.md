---
id: foodsafety.metal-detection-verification
name: Metal detection verification — test pieces at the agreed sensitivity, every check, and what a failure holds
aka: [metal detector check, test piece check, Fe non-Fe SS, detector verification, X-ray check, CCP metal]
discipline: foodsafety
kind: established
evidence: practice
depth: full
checked: 2026-10-24 — verification practice (ferrous, non-ferrous and stainless test pieces at start, at intervals, after stops and changeovers, at the end; the hold since the last good check) via secondary summaries of BRCGS Food Issue 9 clause 4.10 and retailer codes (from knowledge; clause not confirmed against the text); the worked run in `scripts/knowledge/cases-planning-foodsafety.py`
needs: []
next: [spc.zero-failure-demonstration]
alternatives: []
related: [foodsafety.ccp-monitoring, foodsafety.haccp, quality.nonconformance-hold, msa.calibration]
---
# Metal detection verification — test pieces at the agreed sensitivity, every check, and what a failure holds

## Purpose and principle
The metal detector (or X-ray) is usually a CCP, and its control is only
as good as the proof that it detects and rejects at the sensitivity the
plan validated. The proof is the test pieces — a ferrous, a non-ferrous
and a stainless-steel sphere of the agreed sizes — passed through the
aperture in the product (in the worst position: the centre, the leading
and trailing edge as the procedure says) at the start of the run, at
intervals, after any stop or changeover, and at the end; each must be
detected *and* the reject must remove the test pack. A failed check
means every pack since the last good check is suspect and is held and
re-run through a working detector.

## Questions it answers
- Were the checks done at the frequency the plan says — start,
  interval, after stops, end — with all three pieces?
- Did every piece get detected and rejected, every time?
- When a check failed, how much product was at risk and was it held and
  re-run?
- Is the detector's sensitivity drifting (the signal strength on each
  piece, where the machine shows it)?

## Inputs and minimum conditions
- The validated sensitivities per product (the smallest sphere of each
  metal the detector reliably finds in that product, from the
  validation at installation and after any change) — the critical limit.
- Certified test pieces of those sizes, identified, their certificates
  current.
- The procedure: where in the aperture, with product, how many passes;
  the schedule (start, every n minutes or packs, after a stop over m
  minutes, after a changeover, at the end).
- The line rate for the product at risk.

## Procedure and calculation
- Checks due in a run = 1 (start) + interval checks + after-stop checks
  + 1 (end); × 3 pieces (× passes); compliance = checks done ÷ due; a
  missed check is a deviation.
- Each check: each piece detected (yes/no) and rejected (yes/no) —
  both; the signal strength recorded where the detector displays it, so
  a drift toward the threshold is seen before a miss.
- A failure (a piece not detected or not rejected): the line stopped;
  the detector tagged; product since the last good check = (time of
  failure − last good) × rate, held (`quality.nonconformance-hold`) and
  re-run through a verified detector; the cause (a product-effect
  change, a phase setting, a reject-arm fault, a belt splice with metal);
  re-verified before restart.
- What a clean record proves: n checks with no failure show at most
  3/n of checks could fail at 95% (`spc.zero-failure-demonstration`) —
  200 checks → at most 1.5%; the frequency is a risk decision in packs
  between checks.
- Verification over time: the checks reviewed weekly; the detector's
  own calibration and the test pieces' certificates (`msa.calibration`);
  re-validation after a product or detector change.

**Worked case** (`cases-planning-foodsafety.py`): test pieces Fe 2.0,
non-Fe 2.5, SS 3.5 mm (the site's validated sensitivities for this
product). A 7-hour run with 2 stops over 10 minutes: 1 + 7 + 2 + 1 = 11
checks × 3 pieces. A failed check at 11:00 (the stainless piece not
rejected), last good at 10:00: 60 min × 110/min = 6,600 packs held and
re-run through a working detector. Ten checks a shift with no fail for
20 shifts (200 checks) → at most 1.5% of checks could fail at 95%.

## Assumptions, limits and misuse
- A test piece passed through on its own, outside the product, tests
  the aperture, not the product effect; in the pack, in the worst
  position.
- "Detected" without "rejected" is half a check; the reject is what
  protects the customer.
- Sensitivities copied from the detector's brochure are not validated
  for this product; the validation sets them.
- A failed check "re-run until it passes" without the hold is the
  non-conformance the auditor looks for first.
- The gap between checks is product at risk; an hourly check on a
  200-a-minute line is 12,000 packs — the frequency is chosen knowing
  that.

## Reading the result
"Metal detection on Line 2 today: 11 of 11 checks done, all three pieces
detected and rejected each time except the 11:00 stainless piece —
6,600 packs held and re-run (0 found), the reject arm's air line
fixed." Money: the held packs (`knowledge/MONEY.md`, H), the re-run's
labour and line time (L, T), and the consequence avoided (C).

## When not to use it — and instead
The CCP's place in the plan → `foodsafety.haccp`. The general CCP
monitoring record → `foodsafety.ccp-monitoring`. The hold →
`quality.nonconformance-hold`. The calibration programme →
`msa.calibration`.

## In food and FMCG manufacturing
Every packing line's metal detector or X-ray; the retailer code's
exact frequency and piece sizes; the audit's first record request after
the HACCP plan.

## References
- [standard] BRCGS Global Standard Food Safety, Issue 9 (2022), clause 4.10 — foreign-body detection and removal equipment: test frequency, test pieces, corrective action (from knowledge; clause not confirmed against the text).
- [practice] Retailer codes of practice on metal detection (from knowledge).
- [guide] Campden BRI, Guideline 60, *Guidelines for the use of metal detectors in the food industry* (from knowledge).

## In Faultline
Built 25 October (FC-170, `knowledge/specs/FC-170-metal-detection.md`) as a check log on the shared shape (FC-236,
`src/tools/checks`, `defs/metal-detection.ts`): the three pieces and the start-up, changeover and end-of-run checks
as a starter list the site edits, each check a tap — pass (detected and rejected) or fail; done, missed and failed
worked out from the schedule; a failure raises one problem on the register and says before it is recorded what it
holds — the minutes since the last good check at Line capacity's speed (else the line's rated speed, else the packs
typed), priced at the line's materials a pack; the re-test failing again holds nothing more; the clean record's bound
in words. Clause numbers are not quoted (listed to confirm). The product-on-hold record is not built yet.
Proved by `log-shape.mjs` and `src/tools/checks/__tests__`.
