/* EVERY CALCULATOR THERE IS — found, not listed. A definition is one file in ./defs/ exporting a CalcDef as default;
 * this reads them all (import.meta.glob), so adding a calculator is adding that file (and its spec, tests and catalogue
 * entry) and changing nothing here. The unit test (__tests__/calc.test.ts) and the acceptance script
 * (scripts/acceptance/calc-shape.mjs) loop over this list, so a new definition is proved by both with no change to either. */
import type { CalcDef } from './types';

const found = import.meta.glob<{ default: CalcDef }>('./defs/*.ts', { eager: true });

/** The calculators, by group (alphabetical) then by catalogue number. */
export const CALCS: readonly CalcDef[] = Object.values(found).map(m => m.default)
  .sort((a, b) => a.group.localeCompare(b.group) || a.fc.localeCompare(b.fc));

export const calcByKey = (key: string | undefined): CalcDef | undefined => (key ? CALCS.find(c => c.key === key) : undefined);

/** The groups the hub shows, each with its calculators, in order. */
export function calcGroups(): { group: string; calcs: CalcDef[] }[] {
  const out: { group: string; calcs: CalcDef[] }[] = [];
  for (const c of CALCS) {
    const g = out.find(x => x.group === c.group);
    if (g) g.calcs.push(c); else out.push({ group: c.group, calcs: [c] });
  }
  return out;
}
