/* WHAT EVERY CALCULATOR SHARES, named once for the entries that are built on it (knowledge/specs/FC-235-calculators.md).
 * An individual calculator's entry adds its own definition file (src/tools/calc/defs/<key>.ts), its arithmetic if it has some of its
 * own, its spec, and `where: ['/calc/<key>']`; it has NO app face — the hub (FC-235) is the one app tool that lists them all. */
export const CALC_CODE = [
  'src/tools/calc/types.ts', 'src/tools/calc/calc.ts', 'src/tools/calc/registry.ts', 'src/tools/calc/format.ts',
  'src/tools/calc/CalcScreen.tsx', 'src/tools/calc/CalcForm.tsx', 'src/tools/calc/CalcView.tsx', 'src/tools/calc/CalcPicture.tsx', 'src/lib/report/calcPaper.ts',
];
export const CALC_TESTS = ['src/tools/calc/__tests__/calc.test.ts'];
