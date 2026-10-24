/* TAKING ONE TOOL OFF A PRODUCT (lib/standard afterRemoving, removingSays).
 * Rowland, 13 October: "cant delete a line capacity anywhere ... always
 * implement deletes and editing in everything". One record holds a product's
 * map and its capacity; deleting one keeps the other. */
import { describe, expect, it } from 'vitest';
import { afterRemoving, inCapacityTool, inMapTool, removingSays, type Standard } from '../standard';

const base: Standard = { id: 's', projectId: '', workspaceId: 'w', product: 'Rooster 1kg', marks: [], sort: 1, createdAt: 1, updatedAt: 1 };
const mapped: Standard = { ...base, marks: [{ id: 'p', kind: 'person', x: 10, y: 10, label: 'Op 1' }], board: 'tall' };
const cap = { stations: [{ id: 'a', name: 'Bagger', kind: 'machine' as const, unit: 'bags', contains: 1, rate: 70, ratePer: 'min' as const }] };
const co: NonNullable<Standard['capacity']>['changeovers'] = [{ id: 'c1', from: 'Rooster 2kg', steps: [], minutes: 22, agreedAt: 5, fromStudyId: 'st' }];

describe('deleting a Line capacity', () => {
  it('keeps the map: the record stays, its capacity gone, out of Line capacity, still in Line standard', () => {
    const next = afterRemoving({ ...mapped, capacity: cap }, 'balance');
    expect(next?.marks).toHaveLength(1);
    expect(next?.board).toBe('tall');
    expect(next?.capacity).toBeUndefined();
    expect(inCapacityTool(next!)).toBe(false);
    expect(inMapTool(next!)).toBe(true);
  });
  it('keeps SMED\'s agreed changeovers with a product that is kept', () => {
    const next = afterRemoving({ ...mapped, capacity: { ...cap, changeovers: co } }, 'balance');
    expect(next?.capacity).toEqual({ stations: [], changeovers: co });
    expect(inCapacityTool(next!)).toBe(false);
  });
  it('with no map, the record goes', () => {
    expect(afterRemoving({ ...base, capacity: cap }, 'balance')).toBeNull();
  });
});

describe('deleting a map', () => {
  it('keeps the Line capacity: the record stays, its map gone', () => {
    const next = afterRemoving({ ...mapped, photoKey: 'blob-1', capacity: cap }, 'map');
    expect(next?.marks).toEqual([]);
    expect(next?.photoKey).toBeUndefined();
    expect(next?.board).toBeUndefined();
    expect(next?.capacity).toEqual(cap);
    expect(inCapacityTool(next!)).toBe(true);
    expect(inMapTool(next!)).toBe(false);
  });
  it('with no capacity worked out, the record goes', () => {
    expect(afterRemoving(mapped, 'map')).toBeNull();
    expect(afterRemoving({ ...mapped, capacity: { stations: [], changeovers: co } }, 'map')).toBeNull();
  });
});

describe('the words', () => {
  it('say what stays, and what goes with it', () => {
    expect(removingSays({ ...mapped, capacity: cap }, 'balance')).toEqual({
      ask: 'Delete the Line capacity for “Rooster 1kg”? Its line standard map stays.',
      done: 'Line capacity for Rooster 1kg deleted — its line standard map kept',
    });
    expect(removingSays({ ...mapped, capacity: { ...cap, changeovers: co } }, 'balance').ask)
      .toBe('Delete the Line capacity for “Rooster 1kg”? Its line standard map stays, and its agreed SMED changeovers.');
    expect(removingSays({ ...mapped, capacity: { stations: [], changeovers: co } }, 'map'))
      .toEqual({ ask: 'Delete the line standard map for “Rooster 1kg”? Its agreed SMED changeovers go with it.', done: 'Map for Rooster 1kg deleted' });
  });
});
