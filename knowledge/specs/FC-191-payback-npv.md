# FC-191 — What an improvement is worth: payback and NPV (a calculator)

**Catalogue:** FC-191 (FC-192, the case for the change on a project, stays left out — Rowland, 20 October) · **Knowledge:** `cost.investment-appraisal` (full, textbook) · `knowledge/MONEY.md` §2 I, §4 FC-191 · **Asked for:** Rowland, 31 October — the eight methods, each with its tools (`docs/METHODS.md` §11: FC-191 serves DMAIC's Improve/Control and Theory of Constraints' Elevate) · **Status:** built on `m5-dmaic` (31 October), not yet merged. **Written before the page.**

## 1. Purpose
Say whether a spend pays, on a saving a tool measured: *"A £4,800 splice table saving £310 a week pays back in 15.5 weeks of running; over 3 years at 10% it is worth £32,204 more than the money would have earned (NPV), and returns 310% a year."* The sentence it lets the line say to the business: *this small fix is a yes — here is the arithmetic and where the saving came from.* A small spend is refused because nobody worked out what it saves (the catalogue's problem).

**Scope.** One calculator (`key: payback-npv`): a one-off cost against a saving a week, over a life in years at the business's discount rate — **payback** in running weeks (cost ÷ saving a week), **NPV** (the saving a year discounted, less the cost), **IRR** (the rate at which NPV is zero), the **return a year** (saving a year ÷ cost, the simple ROI), and two checks the record asks for: the saving halved and the cost up a quarter. The saving is known one of three ways — typed; a loss a week and the share the fix recovers (the way SMED or the loss count says it); or hours saved a week at the line's wage. **Not here:** a business case on a project or its measurement after handover (FC-192, left out); uneven savings or cost over time (the constant saving is the shop-floor case; a varying cash flow needs a table, not built); tax, depreciation, inflation, financing; choosing between projects on more than money (FC-143/144); booking the saving — it stays "expected" until the tool that measured the loss measures it again after the spend (said on the page).

## 2. Users and scenarios
The ops lead asking for £4,800 for a splice table, or £28,000 for a SMED kit, at a desk, in a meeting with finance. (1) *The record's SMED kit:* 60% of a £1,900 changeover loss = £1,140 a week; £28,000; 48 running weeks; 5 years at 10% → payback 24.6 weeks, NPV £179,432, IRR 195%; halved the saving still pays in 49.1 weeks with NPV £75,716. (2) *The splice table:* £4,800, £310 a week → 15.5 weeks, NPV £32,204 over 3 years. (3) *A saving in hours:* 6 hours a week at £14.70 = £88.20 a week, no cost given yet — the saving stands and the cost is asked for. (4) *A spend that does not pay:* £30,000 for £200 a week over 3 years → payback 150 weeks against 144 running weeks of life, NPV −£6,126 — red, in words.

## 3. Method selection
Payback, NPV and IRR are the standard trio of capital appraisal (Brealey, Myers & Allen; Drury — `cost.investment-appraisal`). Payback is the floor's first figure but ignores the time value of money and everything after; NPV is the decision figure where lives differ; IRR is NPV's rate form, compared with the hurdle. The alternative, choosing among projects on more than money (`sixsigma.selection-matrices`), is a different question.

**Established · assumed · chosen.**
- *Established:* payback = cost ÷ saving a period; NPV = S × [1 − (1 + r)⁻ⁿ] ÷ r − cost for a constant saving S a year over n years, cash flows at the year ends, cost at time zero; IRR = r such that NPV = 0 (`cost.investment-appraisal`; Brealey, Myers & Allen, *Principles of Corporate Finance*, edition to confirm). Independent cases: `scripts/knowledge/cases-calc.py` I1–I5 (SciPy `brentq` and the roots of the cash-flow polynomial agree on the IRR; the record's £179,400 and £75,700 reproduced).
- *Assumed:* the saving is constant and real; the cost is all up front; the life is whole years; the weeks a year the line runs are asked (never assumed — Rowland, 12 October, on SMED: "don't assume 5 days, could be 7"); a saving not measured by a tool is an assumption and the page says where its figure comes from; savings in lost time at a non-bottleneck are labour, not contribution (the two-parts rule, `MONEY.md` rule 3).
- *Chosen (the builder, 31 October — the owner asked for speed, not to be asked):* payback is said in **running weeks** (the catalogue's output, "Payback weeks") and, once the weeks a year are given, as a share of the life; the **discount rate and the life are the business's own figures, typed — Faultline never fills them in** (a policy of 3–5 years is said as a range in the help only); the **verdict is red only by arithmetic** — an NPV below zero at the rate typed, or a payback longer than the life — never by a house threshold, and never green (a good case is quiet); the "simple ROI" is the **return a year = saving a year ÷ cost** (accounting rate of return on the first cost), named so; the sensitivity cases are the record's (saving halved; cost up a quarter); the IRR is said as "over 1,000%" beyond ten times and not at all when it cannot be found; no figure is worked out for a missing input and the missing one is named.

## 4. Inputs
How the saving is known (choice: typed · a loss and the share recovered · hours saved) · *Typed:* Saving a week (£, > 0) · *Share:* Loss a week now (£, > 0), Share the fix recovers (%, 0–100, > 0) · *Hours:* Hours saved a week (> 0), One person’s cost an hour (£, offered from the line’s wage with on-costs) · Weeks a year the line runs (1–52, optional; needed for the year's figures) · Life (whole years, optional; needed for NPV and IRR) · *In money, optional:* The investment — what it costs once (£) · The business’s discount rate (% a year). Required: the saving (or its parts). Everything else is optional and, when missing, named.

## 5. Data suitability
A constant saving over the life; the cost known to ±25% (the cost-up check shows the case that survives). An investment of 0 is refused (no payback is meaningful). A life of one year is allowed. A rate of 0% is allowed (NPV is saving × years less cost). A rate above 100% is warned as probably typed as a fraction.

## 6. Calculations
saving a week W (typed; or loss × share ÷ 100; or hours × rate); annual A = W × weeks; payback = C ÷ W (running weeks); annuity a(r, n) = n at r = 0, else (1 − (1 + r)⁻ⁿ) ÷ r; NPV = A × a(r, n) − C; IRR by bisection on A × a(r, n) = C over (−99%, 1,000,000%); return a year = A ÷ C; halved: W/2; cost up a quarter: 1.25 C. **Independent cases** (`scripts/knowledge/cases-calc.py` I1–I5, `python3 -I`): I1 the record's SMED kit — W £1,140, A £54,720, payback 24.56 weeks (0.51 years of running), NPV £179,432, IRR 194.5%, return a year 195.4%; halved: 49.12 weeks, NPV £75,716; cost up a quarter: 30.70 weeks, NPV £172,432. I2 splice table — 15.48 weeks, NPV £32,204, IRR 305.3%, return 310%. I3 — payback 150 weeks > 144 running weeks, NPV −£6,126, IRR −2.0%. I4 — 6 × £14.70 = £88.20. I5 — a zero rate, NPV = S × n − C.

## 7. Outputs
Verdict "24.6 weeks to pay back" (or "£1,140 a week saved" when no cost is given); tone grey, red by arithmetic only. The sentence: *"£28,000 saving £1,140 a week pays back in 24.6 weeks of running (0.51 of a year); over 5 years at 10% it is worth £179,432 more than the money would earn (NPV) — a return of 195% a year."* Further lines: the IRR; the saving halved and the cost up a quarter, each with payback and NPV; "expected until the tool that measured the loss measures it again after the spend". Six tiles: *Payback*, *Saving a week*, *NPV*, *Return a year*, *IRR*, *Spend*. The working: each sum with its numbers. The money (it IS money): the saving and what it is made of; every missing input as its own sentence — **"Give the investment’s cost to say its payback."**, the weeks a year, the life, the business’s rate. Caveats: payback ignores the time value of money and everything after it; NPV and IRR are only as good as the saving; the saving is expected until re-measured; the rate and the life are the business’s policy. Closing line. No picture (a cumulative-cash curve would earn one; not built — said in the limits).

**The report.** The generic calculation paper (FC-235): band, tiles, sentence, figures put in with sources, the working, the money with its missing sentences, caveats, Before → after (the saved before is the case before the quote changed), closing.

## 8. Manufacturing usability
Two numbers to a payback on a phone (the saving a week and the cost); the rate and life when the case goes to finance; a what-if on the saving ("if it only saves half").

## 9. Failure handling
No saving: waits, naming it. No cost: the saving stands, payback and NPV are named as missing. No weeks a year / life / rate: the figures that need them are named, the rest stand. A rate over 100%: warned. A client reads and changes nothing.

## 10. Integration
`ToolStudy` tool `calc`, key `payback-npv`; `built.where: ['/calc/payback-npv']`; the Calculators hub; a line's Calculators row and the line report; a project's Tools; DMAIC's and Theory of Constraints’ method pages list it as **Built**. The saving is typed from the finding's tool (`see` links: Cost deployment's project payback uses a different, simpler sum — 4.33 weeks a month — and is not changed). No migration, no new record noun.

## 11. Verification
`src/tools/investment/__tests__/investment.test.ts` (I1–I5, edges); `calc.test.ts` (every definition); `scripts/acceptance/calc-shape.mjs` (table-driven).

**Acceptance criteria.**
1. Payback, NPV, IRR and the return a year equal the independent cases I1 and I2 — `investment.test.ts`; `calc.test.ts` examples 1–2.
2. The sensitivity cases (halved; cost up a quarter) equal I1b and I1c — `investment.test.ts`.
3. A negative NPV and a payback longer than the life are red, in words; a good case is grey — `investment.test.ts` (I3); `calc.test.ts` example 4.
4. The saving from hours × the wage equals I4, with the cost missing named and the saving standing — `calc.test.ts` example 3; `calc-shape.mjs` step *b*.
5. A saving not given, an investment of zero and a rate that is not a number are refused in words — `calc.test.ts` ("refuses"); `calc-shape.mjs` step *c*.
6. Blank money boxes never block and always name what is missing — `calc.test.ts` ("stops … never for a money box").
7. Every example typed through the real boxes: sentence, tiles, band tone, money; paper read back; phone; rename, delete, Undo; reload; before → after; what-if — `calc-shape.mjs` for `payback-npv`.
8. The catalogue entry is available only with these — `catalogue.test.ts`.
Not proved here: a varying cash flow (not built).

## 12. Maintainability
Code: `src/tools/investment/investment.ts`, `src/tools/calc/defs/payback-npv.ts`. Left for later: a cumulative-cash picture; an uneven cash-flow table; reading the saving from a tool's record (SMED, the loss count, capability) so it arrives with its source; FC-192 stays left out.
