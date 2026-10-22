---
id: spc.zero-failure-demonstration
name: Pass or fail, one at a time — what a run of good items proves (success-run testing)
aka: [success run, zero failure test, rule of three, pass fail test, demonstration test, attribute test, ticks]
discipline: spc
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-22 — the success-run relation follows from the binomial; the rule of three is Hanley & Lippman-Hand (1983); with failures allowed, the Clopper–Pearson upper bound; numbers in the test file worked independently (scripts/knowledge/independent-cases.py)
needs: []
next: [spc.capability-attribute-proportion, spc.capability-measured]
alternatives: [spc.capability-attribute-proportion, quality.acceptance-sampling-attributes]
related: [stats.confidence-intervals, packaging.seal-integrity, foodsafety.metal-detection-verification]
---
# Pass or fail, one at a time — what a run of good items proves

## Purpose and principle
A test where each item either passes or fails — a seal re-test after a
fix, a leak test, a function check — and the question is what the result
*proves* about the process, not just whether these items passed. If n items
are tested and none fails, the chance of failure p can still be anything
small enough that n passes in a row were likely. The largest such p, at a
chosen confidence C, is the honest claim.

## Questions it answers
- 20 of 20 passed: how sure are we that fewer than 1 in 100 would fail? (Not very.)
- How many have to pass in a row to show fewer than 1 in 100 fail, 95% sure?
- With one failure allowed, how many must be tested?
- Did the batch pass the test that was agreed (all good, or at most k failures)?

## Inputs and minimum conditions
- Each item's result, good or fail, in order, with who tested it.
- What was agreed before testing: how many items, and how many may fail
  (none — any fail fails it — or at most k), and optionally the failure
  share to be shown (p₀) at a confidence (95%).
- Items drawn from the process as it runs, not chosen.

## Procedure and calculation
- With n tested and **no failures**: the upper bound on p at confidence C is
  p_U = 1 − (1 − C)^(1/n). At 95%: n = 20 → 13.9%; n = 59 → 4.95%; n = 299 → 0.996%.
- Approximation (rule of three): p_U ≈ 3/n at 95%.
- Items needed to show p ≤ p₀ with none failing: n = ⌈ln(1 − C) / ln(1 − p₀)⌉
  — 1% at 95%: 299; 5%: 59; 10%: 29.
- With f failures in n: p_U is the Clopper–Pearson upper bound,
  B(C; f + 1, n − f).
- The verdict on the test itself is what was agreed (all good → passed);
  what it proves is said beside it, so a passed test never claims more than
  its count allows.

## Assumptions, limits and misuse
- Independent items, one process: a re-test of 20 packs from one reel
  proves nothing about the next reel.
- It proves an upper bound only — never "zero defects".
- Testing until it passes (retesting the failures away) voids it.
- A destructive test sample must be representative of the run, not the start.
- Where the characteristic can be *measured* (seal strength in N), measuring
  proves more from fewer items (`spc.capability-measured`).

## Reading the result
"20 of 20 good — Passed. That proves fewer than 14 in 100 would fail (95%
sure); to show fewer than 1 in 100 takes 299 good in a row."

## When not to use it — and instead
- Rejects counted out of large runs → `spc.capability-attribute-proportion`.
- A lot accepted or rejected by a sampling plan → `quality.acceptance-sampling-attributes`.
- A measurable characteristic → `spc.capability-measured`.

## In food and FMCG manufacturing
A seal integrity re-test after a jaw change; a dye-penetration check on a
new tray; a label-verification check at start-up; a metal detector's test
pieces (verification that it works, not a measure of how often it misses);
allergen swab kits after a cleandown.

## References
- [paper] Hanley, J.A. and Lippman-Hand, A. (1983), "If nothing goes wrong, is everything all right? Interpreting zero numerators", *JAMA* 249(13), 1743–1745.
- [paper] Clopper, C.J. and Pearson, E.S. (1934), *Biometrika* 26(4), 404–413.
- [practice] NIST/SEMATECH *e-Handbook of Statistical Methods*, chapter 8 (reliability) — demonstration testing; section to confirm.

## In Faultline
Built 22 October (`knowledge/specs/FC-094-capability.md`, part 1, FC-100):
the capability study's *Pass or fail* (`src/lib/ie/sample.ts`, stored kind
`ticks` so older studies read as before) takes how many may fail
(`allowFail`, none unless agreed); the agreed verdict stays the verdict, and
under it what the count proves — the exact one-sided bound (`binomUpper` in
`src/lib/ie/dist.ts`) rounded up, and what fewer than 1 in 100 would take
(`itemsToShow`) — on the page, its tiles and its paper. While agreeing, the
page says what the count would prove (`passFailPlan`).
