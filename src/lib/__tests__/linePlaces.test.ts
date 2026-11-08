/* CLIENT, SITE AND AREA on the lines (docs/CONSULTANT.md K1). */
import { describe, expect, it } from 'vitest';
import { clientsOf, linesByPlace, placeOf, placeWordsOffered } from '../lines';
import type { Workspace } from '../../types';

const w = (name: string, o: Partial<Workspace> = {}) => ({ id: name, name, ...o }) as Workspace;

describe('client, site and area on the lines', () => {
  const ls = [w('2A', { clientName: 'Northfield', siteName: 'Hull', areaName: 'Packing hall' }), w('Despatch', { clientName: 'Northfield', siteName: 'Hull', areaName: 'Despatch' }),
    w('2B', { clientName: 'Northfield', siteName: 'Hull', areaName: 'Packing hall' }), w('Old line'), w('L1', { clientName: 'Acme', siteName: 'Leeds' })];
  it('offers the words already used', () => {
    expect(clientsOf(ls)).toEqual(['Acme', 'Northfield']);
    expect(placeWordsOffered(ls, 'areaName')).toEqual(['Despatch', 'Packing hall']);
  });
  it('says where a line is, site and area', () => {
    expect(placeOf(ls[0])).toBe('Hull › Packing hall');
    expect(placeOf(ls[4])).toBe('Leeds');
    expect(placeOf(ls[3])).toBe('');
  });
  it('groups the lines by place, keeping their order, the unplaced last', () => {
    expect(linesByPlace(ls).map(g => [g.place, g.lines.map(x => x.name)])).toEqual([
      ['Hull › Despatch', ['Despatch']], ['Hull › Packing hall', ['2A', '2B']], ['Leeds', ['L1']], ['', ['Old line']]]);
    expect(linesByPlace([w('a'), w('b')])).toEqual([{ place: '', lines: [w('a'), w('b')] }]);
  });
});
