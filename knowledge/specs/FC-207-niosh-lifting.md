# FC-207 — NIOSH lifting equation (calculator)

**Catalogue:** FC-207 · **Knowledge:** `ergonomics.niosh-lifting` · **Programme:** W7 · **Status:** built October 2026.

## 1. Purpose
Screen a single two-handed lift with the revised NIOSH equation: *"Lift: 13 kg against a limit of 11.5 kg — index 1.14, increased risk; vertical height at the start is the biggest limit."* — always with the screening caveat, never a full risk assessment.

**Scope.** One calculator (`key: niosh-lifting`): load, horizontal reach, vertical height at start, vertical travel, twist, lifts per minute, duration (≤1 h, ≤2 h, ≤8 h), coupling (good · fair · poor). **Not** here: carrying, pushing, team lifts, HSE MAC (FC-208), ART (FC-209).

## 2. Users and scenarios
Engineer or supervisor at a desk before changing a palletising task or arguing for a lift aid.

## 3. Method selection
NIOSH revised lifting equation (Waters et al. 1993; Applications Manual 1994) — the UK floor often uses MAC instead; said in caveats.

**Established · assumed · chosen.**
*Established:* RWL = 23 × HM × VM × DM × AM × FM × CM; LI = load ÷ RWL; bands LI ≤ 1 nominal, ≤ 3 increased, > 3 high; FM and CM tables as `src/lib/ie/ergo.ts`; CCOHS worked example in `ergo.test.ts`.
*Assumed:* smooth two-handed lifts within the manual's geometry limits.
*Chosen:* duration as three choices (≤1 h, ≤2 h, ≤8 h with recovery as the manual); frequency between table rows takes the row above; the limiting factor is the smallest multiplier; wording of sentences and tiles.

## 4. Inputs
Load (kg > 0); horizontal reach (cm); height at start (cm); vertical travel (cm); twist (degrees); lifts a minute; duration (choice); coupling (choice); optional task name (text).

## 5. Data suitability
Measurements from the task as performed, not the ideal posture; frequency and duration for the whole shift pattern.

## 6. Calculations
`assessLift` in `src/lib/ie/ergo.ts`; unit tests vs CCOHS and table edge cases.

## 7. Outputs
Verdict from the band; the sentence from the module; tiles RWL, lifting index, band; working with each multiplier; the screening caveat; closing line naming the index and limiter.

**The report.** FC-235 generic calculation paper.

## 8. Manufacturing usability
Nine boxes to an answer; help text names how to measure on the floor.

## 9. Failure handling
Blank required fields block; load ≤ 0 refused.

## 10. Integration
`ToolStudy` tool `calc`, key `niosh-lifting`; `/calc/niosh-lifting`; line Calculators row and report; `see` MAC when built.

## 11. Verification
`ergo.test.ts`; `calc.test.ts`; `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. CCOHS whole lift — RWL ≈ 11.5, LI 1.14, increased — `ergo.test.ts`, calc examples.
2. Task outside range says so — examples.
3. Paper, phone, rename, delete — `calc-shape.mjs`.

## 12. Maintainability
Definition `src/tools/calc/defs/niosh-lifting.ts`; arithmetic stays in `ergo.ts`. Left: MAC, ART, push/pull.
