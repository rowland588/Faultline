/* YOUR FACTORY's arithmetic (lib/lines) — the floor order, the types offered,
 * the factory in words and the next line's name. */
import { describe, it, expect } from 'vitest';
import type { Workspace } from '../../types';
import { byFloor, factorySays, lineTypesOffered, nextLineName, numbered, placeOnFloor, productionLines, DEMO_NAME } from '../lines';

const ws = (name: string, o: Partial<Workspace> = {}): Workspace => ({
  id: name, name, color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1, ...o,
});

describe('the floor order', () => {
  it('lists placed lines by their place, then the never-placed by name, numbers read as numbers', () => {
    const lines = [ws('Line 10'), ws('Line 2'), ws('Line 9', { floorOrder: 1 }), ws('Line 4', { floorOrder: 0 })];
    expect([...lines].sort(byFloor).map(w => w.name)).toEqual(['Line 4', 'Line 9', 'Line 2', 'Line 10']);
  });
  it('leaves the demo and the archived out of the factory', () => {
    expect(productionLines([ws(DEMO_NAME), ws('Line 1', { archived: true }), ws('Line 2')]).map(w => w.name)).toEqual(['Line 2']);
  });
  it('moves a line and numbers every line again — only the changed ones to write', () => {
    const lines = [ws('A', { floorOrder: 0 }), ws('B', { floorOrder: 1 }), ws('C', { floorOrder: 2 })];
    const out = placeOnFloor(lines, 'C', 1);
    expect(out.map(w => [w.name, w.floorOrder])).toEqual([['C', 1], ['B', 2]]);
    expect(placeOnFloor(lines, 'A', 0)).toEqual([]);
    expect(placeOnFloor(lines, 'nope', 0)).toEqual([]);
  });
  it('numbers lines made before the factory in the order they were shown', () => {
    const shown = productionLines([ws('Line 2'), ws('Line 1')]);
    expect(numbered(shown).map(w => [w.name, w.floorOrder])).toEqual([['Line 1', 0], ['Line 2', 1]]);
  });
});

describe('the types and the words', () => {
  it('offers the factory’s own types first, then the usual ones it has not used', () => {
    const t = lineTypesOffered([ws('A', { lineType: 'Bakery' }), ws('B', { lineType: 'packing' }), ws('C')]);
    expect(t.slice(0, 2)).toEqual(['Bakery', 'packing']);
    expect(t).not.toContain('Packing');
    expect(t).toContain('Processing');
  });
  it('says the factory: lines, then each type by how many, the untyped said only beside types', () => {
    expect(factorySays([])).toBe('No lines yet');
    expect(factorySays([ws('A')])).toBe('1 line');
    expect(factorySays([ws('A', { lineType: 'Packing' }), ws('B', { lineType: 'Packing' }), ws('C', { lineType: 'Filling' }), ws('D')]))
      .toBe('4 lines · 2 Packing · 1 Filling · 1 not typed yet');
  });
  it('guesses the next line’s name from the last on the floor', () => {
    expect(nextLineName([])).toBe('Line 1');
    expect(nextLineName([ws('Line 6', { floorOrder: 0 })])).toBe('Line 7');
    expect(nextLineName([ws('Line 2A')])).toBe('Line 2B');
    expect(nextLineName([ws('Line 2Z')])).toBe('Line 3');
    expect(nextLineName([ws('Bagger')])).toBe('Line 1');
  });
});
