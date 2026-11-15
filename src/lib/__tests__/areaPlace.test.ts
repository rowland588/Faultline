/* An area's own place (docs/AREAS.md A4): told by its type, found by the area's words, never a production line. */
import { describe, expect, it } from 'vitest';
import { AREA_PLACE_TYPE, areaOfPlace, areaPlaceName, areaPlaceOf, isAreaPlace } from '../areaPlace';
import { productionLines } from '../lines';
import type { Workspace } from '../../types';

const ws = (id: string, o: Partial<Workspace> = {}): Workspace => ({ id, name: id, color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: [], shifts: [], ...o } as Workspace);

describe('an area’s own place', () => {
  const line = ws('L1', { name: 'Line 7', siteName: 'Hull', areaName: 'Dispatch' });
  const place = ws('P1', { name: areaPlaceName('Dispatch'), lineType: AREA_PLACE_TYPE, siteName: 'Hull', areaName: 'Dispatch' });
  const other = ws('P2', { name: areaPlaceName('Packing hall'), lineType: AREA_PLACE_TYPE, siteName: 'Hull', areaName: 'Packing hall' });
  it('is told by its type, in any case', () => {
    expect(isAreaPlace(place)).toBe(true);
    expect(isAreaPlace({ lineType: ' the area ITSELF ' })).toBe(true);
    expect(isAreaPlace(line)).toBe(false);
    expect(areaPlaceName(' Dispatch ')).toBe('Dispatch — the area itself');
  });
  it('is found by its area’s words, never another area’s, never an archived one', () => {
    expect(areaPlaceOf([line, place, other], { site: 'Hull', area: 'dispatch' })?.id).toBe('P1');
    expect(areaPlaceOf([line, other], { site: 'Hull', area: 'Dispatch' })).toBeUndefined();
    expect(areaPlaceOf([{ ...place, archived: true }], { site: 'Hull', area: 'Dispatch' })).toBeUndefined();
    expect(areaOfPlace(place)).toEqual({ area: 'Dispatch', site: 'Hull' });
  });
  it('is never a line of the floor', () => {
    expect(productionLines([line, place, other]).map(w => w.id)).toEqual(['L1']);
  });
});
