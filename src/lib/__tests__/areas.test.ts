import { describe, expect, it } from 'vitest';
import type { Workspace } from '../../types';
import { areaFromQuery, areaHref, areaOf, areasOf, areaSays, areaTiles, areaTitle, inArea, linesInArea, type AreaLineFacts } from '../areas';

const line = (id: string, o: Partial<Workspace> = {}): Workspace => ({ id, name: id, createdAt: 0, updatedAt: 0, ...o } as Workspace);

describe('an area — words on the lines, never a record', () => {
  const a = line('A', { siteName: 'Hull', areaName: 'Packing hall', clientName: 'Northfield' });
  const b = line('B', { siteName: 'hull', areaName: 'packing HALL ', clientName: 'Acme' });
  const c = line('C', { siteName: 'Hull', areaName: 'Despatch' });
  const d = line('D', { siteName: 'Hull' });

  it('a line with no area is in none', () => {
    expect(areaOf(d)).toBeUndefined();
    expect(areaOf(a)).toEqual({ client: 'Northfield', site: 'Hull', area: 'Packing hall' });
  });

  it('the same words in any case are one area; a client narrows only when named', () => {
    expect(inArea(b, { site: 'Hull', area: 'Packing hall' })).toBe(true);
    expect(inArea(b, { client: 'Northfield', site: 'Hull', area: 'Packing hall' })).toBe(false);
    expect(linesInArea([a, b, c, d], { site: 'Hull', area: 'Packing hall' }).map(w => w.id)).toEqual(['A', 'B']);
  });

  it('groups by site and area, the lines with none apart; by client too when asked', () => {
    const g = areasOf([a, b, c, d]);
    expect(g.areas.map(x => [x.title, x.lines.map(w => w.id)])).toEqual([['Hull › Despatch', ['C']], ['Hull › Packing hall', ['A', 'B']]]);
    expect(g.noArea.map(w => w.id)).toEqual(['D']);
    expect(areasOf([a, b, c, d], true).areas).toHaveLength(3);
  });

  it('the address round-trips', () => {
    const id = { client: 'Northfield', site: 'Hull', area: 'Packing hall' };
    const q = new URLSearchParams(areaHref(id).split('?')[1]);
    expect(areaHref(id).startsWith('/area?')).toBe(true);
    expect(areaHref(id, true).startsWith('/area/report?')).toBe(true);
    expect(areaFromQuery(q)).toEqual(id);
    expect(areaFromQuery(new URLSearchParams('site=Hull'))).toBeUndefined();
    expect(areaTitle({ area: 'Despatch' })).toBe('Despatch');
  });
});

describe('the area in a sentence and its tiles — the sum of its lines', () => {
  const f = (o: Partial<AreaLineFacts>): AreaLineFacts => ({ name: 'L', open: 0, late: 0, critical: 0, programs: 0, proved: 0, programsLate: 0, projects: [], toolsLately: 0, ...o });
  it('says the worst, the late in red', () => {
    const s = areaSays([
      f({ name: 'Line 7', open: 2, late: 1, worst: { what: 'Film breaks', red: true }, programs: 3, proved: 1, projects: ['P1'], toolsLately: 2 }),
      f({ name: 'Line 8', open: 1, programs: 1, proved: 1, projects: ['P1', 'P2'], toolsLately: 3 }),
    ]);
    expect(s.text).toBe('2 lines · 3 problems open, 1 late — the worst: Film breaks on Line 7 · 2 programs to prove · 2 projects running · 5 tool records in the last four weeks');
    expect(s.tone).toBe('r');
  });
  it('a quiet area is green and says so', () => {
    const s = areaSays([f({ name: 'Line 9' })]);
    expect(s).toEqual({ text: '1 line · no problem open · no project on its lines · no tool used in the last four weeks', tone: 'g' });
    expect(areaSays([]).text).toBe('No line in this area');
  });
  it('the tiles count the same', () => {
    const t = areaTiles([f({ name: 'A', open: 2, critical: 1, programs: 2, proved: 1, projects: ['P'] }), f({ name: 'B', open: 1, toolsLately: 4 })]);
    expect(t.map(x => [x.k, x.v])).toEqual([['Lines', '2'], ['Problems open', '3'], ['Programs proved', '1'], ['Projects', '1'], ['Tools used', '4']]);
    expect(t[1].tone).toBe('r');
  });
});
