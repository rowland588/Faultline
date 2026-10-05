import { describe, expect, it } from 'vitest';
import { drawerShows, panelOf, PARETO_KEY, readingOf, readPinned, samePanel, withPanel, writePinned } from '../fishboneRoom';

const q = (s: string) => new URLSearchParams(s);

describe('the panel in the address', () => {
  it('reads a cause, the problem panel, or none', () => {
    expect(panelOf(q('problem=p1&cause=rail'))).toEqual({ kind: 'cause', id: 'rail' });
    expect(panelOf(q('problem=p1&panel=problem'))).toEqual({ kind: 'problem' });
    expect(panelOf(q('problem=p1'))).toBeNull();
    expect(panelOf(q('panel=nonsense'))).toBeNull();
    expect(panelOf(q('cause='))).toBeNull();
  });

  it('a cause wins over the problem panel', () => {
    expect(panelOf(q('panel=problem&cause=rail'))).toEqual({ kind: 'cause', id: 'rail' });
  });

  it('writes a panel and keeps every other key', () => {
    const base = q('line=L2&problem=p1&view=read');
    expect(withPanel(base, { kind: 'cause', id: 'rail' }).toString()).toBe('line=L2&problem=p1&view=read&cause=rail');
    expect(withPanel(base, { kind: 'problem' }).toString()).toBe('line=L2&problem=p1&view=read&panel=problem');
    expect(withPanel(q('line=L2&problem=p1&cause=rail&panel=problem'), null).toString()).toBe('line=L2&problem=p1');
    // never changes what it was given
    expect(base.toString()).toBe('line=L2&problem=p1&view=read');
  });

  it('round-trips', () => {
    for (const p of [{ kind: 'cause', id: 'a b/c' } as const, { kind: 'problem' } as const, null]) {
      expect(panelOf(q(withPanel(q('problem=x'), p).toString()))).toEqual(p);
    }
  });

  it('knows two panels apart', () => {
    expect(samePanel({ kind: 'cause', id: 'a' }, { kind: 'cause', id: 'a' })).toBe(true);
    expect(samePanel({ kind: 'cause', id: 'a' }, { kind: 'cause', id: 'b' })).toBe(false);
    expect(samePanel({ kind: 'problem' }, { kind: 'problem' })).toBe(true);
    expect(samePanel({ kind: 'problem' }, null)).toBe(false);
    expect(samePanel(null, null)).toBe(true);
  });

  it('reads "Read it through"', () => {
    expect(readingOf(q('view=read'))).toBe(true);
    expect(readingOf(q('problem=x'))).toBe(false);
  });
});

describe('the Pareto drawer', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };

  it('is pinned unless this device tucked it away', () => {
    const s = mem();
    expect(readPinned(s)).toBe(true);
    writePinned(s, false);
    expect(s.m.get(PARETO_KEY)).toBe('tucked');
    expect(readPinned(s)).toBe(false);
    writePinned(s, true);
    expect(readPinned(s)).toBe(true);
  });

  it('works with no storage, or storage that throws', () => {
    const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(readPinned(null)).toBe(true);
    expect(readPinned(bad)).toBe(true);
    expect(() => writePinned(bad, false)).not.toThrow();
    expect(() => writePinned(undefined, false)).not.toThrow();
  });

  it('steps aside for a panel only when the room cannot hold all three', () => {
    const at = (width: number, panelOpen: boolean, peek = false, pinned = true) => drawerShows({ pinned, peek, panelOpen, width });
    expect(at(1366, false)).toBe(true);
    expect(at(1366, true)).toBe(false);
    expect(at(1440, true)).toBe(false);
    expect(at(1920, true)).toBe(true);
    // the edge tab pressed: it comes back beside the panel
    expect(at(1366, true, true)).toBe(true);
    // tucked away on this device: never on its own
    expect(at(1920, false, false, false)).toBe(false);
    expect(at(1920, false, true, false)).toBe(false);
  });
});
