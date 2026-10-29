# FC-123 — Measurement uncertainty budget (a calculator)

**Catalogue:** FC-123 · **Knowledge:** `msa.measurement-uncertainty` · **Programme:** W4 · **Status:** built October 2026.

## 1. Purpose
State how sure a reading is from the gauge's resolution, repeatability and calibration certificate — *"The bench scale reads to ±0.17 g (k = 2) on a single reading — mostly repeatability; a pack must read 400.17 g to be sure it is over 400 g legal minimum."*

**Scope.** One calculator (`key: uncertainty-budget`): resolution (rectangular), repeatability s with n readings (Type A), certificate expanded U at k (Type B), combined u_c, expanded U at k=2, variance share table, optional lower limit for one-sided guard band, optional test uncertainty ratio when tolerance given, optional give-away at cost a kilo (Q, `knowledge/MONEY.md` — named when missing). Not in this build: Welch–Satterthwaite for few df, correlated sources, multi-source custom rows, automatic feed from FC-119/FC-122.

## 2. Users and scenarios
Quality engineer at a desk; trading-standards prep for e-mark; CCP probe near cook limit.

## 3. Method selection
GUM (JCGM 100:2008 from knowledge): u_rect = δ/(2√3); u_rep = s/√n; u_cert = U/k; u_c = √(Σu²); U = k·u_c. Guard band: reading ≥ L + U for lower limit (JCGM 106). Alternatives: system fit → FC-118; gauge fit → FC-119.

**Established · assumed · chosen.**
*Established:* worked case in `scripts/knowledge/cases-msa.py` (u_res 0.00289, u_rep 0.08, u_cal 0.025, u_c 0.084, U 0.17; ten readings U 0.071).
*Assumed:* independent uncorrelated sources; normal adequate when several contribute.
*Chosen:* k = 2 for expanded uncertainty (~95%); single reading n default 1; TUR = tolerance ÷ (2U) when tolerance given; money — give-away on guard band only when cost a kilo and lower limit in g (Q), else — per FC-123 row in MONEY.md.

## 4. Inputs
Gauge name (text); unit (default g); resolution δ; repeatability s; number of readings n (≥1); certificate U; certificate k (default 2); optional lower limit L; optional tolerance T; optional cost a kilo £.

## 5. Data suitability
δ, s, U > 0; n integer ≥ 1.

## 6. Calculations
`src/lib/ie/uncertainty.ts` — functions above; unit tests vs `cases-msa.py`.

## 7. Outputs
Sentence with U and dominant source; tiles U, u_c, dominant %, guard at L, TUR; working table of sources; caveats; money or missing; closing line.

**The report.** FC-235 generic calculation paper.

## 8. Manufacturing usability
Hub → Measurement uncertainty → figures; live answer; phone 390px.

## 9. Failure handling
Blank required fields block with names; client read-only.

## 10. Integration
`ToolStudy` tool `calc`, key `uncertainty-budget`; `/calc/uncertainty-budget`; line Calculators row and report.

## 11. Verification
`uncertainty.test.ts`; `calc.test.ts`; `scripts/acceptance/calc-shape.mjs`.

**Acceptance criteria.**
1. Worked case matches independent literals — `uncertainty.test.ts`, `calc.test.ts` examples.
2. Ten readings case U ≈ 0.07 g — `uncertainty.test.ts`.
3. Guard 400.17 g — examples in calc def.
4. Paper and phone — `calc-shape.mjs`.

## 12. Maintainability
Code: `src/lib/ie/uncertainty.ts`, `src/tools/calc/defs/uncertainty-budget.ts`. Left: link sources from FC-119; CCP guard offered to FC-169.
