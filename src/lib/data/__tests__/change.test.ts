/* WHAT CHANGED, AND WHERE (docs/LUNA-NEXT.md L2) — pure, against figures worked by hand: rejects 120 → 200 (+80, +66.7%); by shift Days
 * 60 → 70 (+10), Nights 60 → 130 (+70 = 87.5% of the change); by product A 70 → 110 (+40), B 50 → 90 (+40) — spread evenly (50%), so
 * Shift concentrates it; within Nights, Product B 30 → 90 (+60 = 85.7% of Nights' +70), A 30 → 40 (+10). */
import { describe, it, expect } from 'vitest';
import { changeOf, changeSaid, moversOf } from '../change';

const g = (key: string, v: number) => ({ key: [key], values: [v], rows: 1, refs: [] });

describe('changeOf', () => {
  it('reads the field that concentrates the change first, and the next field within its biggest mover', () => {
    const c = changeOf({ before: 120, after: 200 }, [
      { field: 'product', before: [g('A', 70), g('B', 50)], after: [g('A', 110), g('B', 90)] },
      { field: 'shift', before: [g('Days', 60), g('Nights', 60)], after: [g('Days', 70), g('Nights', 130)] },
    ]);
    expect(c.best?.field).toBe('shift');
    expect(c.best?.score).toBeCloseTo(0.875, 6);
    const inner = changeOf({ before: 60, after: 130 }, [{ field: 'product', before: [g('A', 30), g('B', 30)], after: [g('A', 40), g('B', 90)] }]);
    const said = changeSaid(c, 'Rejects', { before: 'October', after: 'November' }, 'packs', { key: 'Nights', change: inner });
    expect(said).toBe('Rejects: 120 packs in October, 200 packs in November — +80 packs (+66.67%). It sits most in shift: Nights +70 packs (88% of the change); Days +10 packs (13% of the change). By the other fields, the biggest movers: product — A +40 packs (50%). Within Nights, it sits most in product: B +60 packs (86% of the change in Nights); A +10 packs (14% of the change in Nights).');
  });
  it('a value in one period only counts the other as none, and says so', () => {
    const f = moversOf('machine', [g('Filler', 10)], [g('Filler', 10), g('Sealer', 15)], 15);
    expect(f.movers[0]).toMatchObject({ key: 'Sealer', before: 0, after: 15, change: 15, share: 1, onlyIn: 'after' });
  });
  it('no field with two values says where cannot be said', () => {
    const c = changeOf({ before: 5, after: 9 }, [{ field: 'line', before: [g('Line 2', 5)], after: [g('Line 2', 9)] }]);
    expect(changeSaid(c, 'Stops', { before: 'a', after: 'b' })).toMatch(/where it sits cannot be said from these records/);
  });
});
