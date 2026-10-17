/* THE LEAN PAGE, SLICE 5b (docs/LEAN-PAGE.md) — Your factory's tiles and
 * closing line (lib/factoryLean), read from the factory's own reading, the
 * money a day of each line in margin (lib/lineLoss lineDay). */
import { describe, expect, it } from 'vitest';
import { factoryClosing, factoryTiles } from '../factoryLean';
import type { FactoryReading, FactoryRow } from '../factoryReport';

const row = (n: number, name: string, o: Partial<FactoryRow> = {}): FactoryRow => ({ n, name, open: 0, late: 0, critical: 0, jobs: [], missing: ['its speed', 'its shifts', 'its margin a pack'], ...o });
const reading = (rows: FactoryRow[]): FactoryReading => ({
  says: '', problems: '', printed: '', rows,
  open: rows.reduce((s, r) => s + r.open, 0), late: rows.reduce((s, r) => s + r.late, 0),
});

describe('Your factory’s tiles', () => {
  it('lines (with a job), problems open (on how many), late, critical, and a day of the priced lines in margin', () => {
    const r = reading([
      row(1, 'Line 2', { jobs: ['Line 2 commissioning'], open: 3, late: 1, critical: 1, margin: 3200, missing: undefined }),
      row(2, 'Line 7', { open: 2, margin: 1800, missing: undefined }),
      row(3, 'Line 9'),
    ]);
    expect(factoryTiles(r).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Lines', '3', '1 with a job on it', undefined],
      ['Problems open', '5', 'on 2 of the 3 lines', undefined],
      ['Late', '1', 'problems past their day', 'r'],
      ['Critical', '1', 'open — stopping a line', 'r'],
      ['A day of the factory', '£5.0k', 'of margin — every line’s speed × its shifts × its margin a pack · Line 9 not priced yet', undefined],
    ]);
    expect(factoryClosing(r)).toEqual({ text: '3 lines, 5 problems open — 1 late and 1 critical, the most on Line 2; a day of 2 of its 3 lines is worth £5.0k of margin.', tone: 'r' });
  });
  it('nothing priced: what to give, two named then how many more; nothing open: in green', () => {
    const r = reading([row(1, 'Line 1'), row(2, 'Line 2'), row(3, 'Line 3', { missing: ['its speed'] })]);
    expect(factoryTiles(r).slice(-1)[0]).toEqual({ k: 'A day of the factory', v: '—', of: 'give Line 1: its speed, its shifts and its margin a pack, Line 2: its speed, its shifts and its margin a pack and 1 more in Your factory' });
    expect(factoryTiles(r).map(t => t.k)).not.toContain('Critical');
    expect(factoryClosing(r)).toEqual({ text: '3 lines, no problem open.', tone: 'g' });
    expect(factoryClosing(reading([]))).toEqual({ text: 'No lines yet — add your production lines, each with its name and its type.', tone: 'n' });
  });
});
