import { describe, expect, it } from 'vitest';
import { jumpTo, matchScore, TOOL_PLACES } from '../jumpTo';

describe('jump to', () => {
  const places = [...TOOL_PLACES, { kind: 'line' as const, label: 'Line 2A — capacity', href: '#/lines/a' }, { kind: 'job' as const, label: 'Line 2 commissioning', href: '#/project/b' }, { kind: 'product' as const, label: 'Łukasz’s tray 8', href: '#/x' }];
  it('the start of the name first, then the start of a word: "cap" → Capability, then Line capacity and the line named capacity', () => {
    const hits = jumpTo('cap', places).map(p => p.label);
    expect(hits[0]).toBe('Capability');
    expect(hits.slice(1, 3).sort()).toEqual(['Line 2A — capacity', 'Line capacity']);
  });
  it('two words, each the start of one: "li st" → Line standard', () => {
    expect(jumpTo('li st', places)[0].label).toBe('Line standard');
  });
  it('accents and punctuation do not matter', () => {
    expect(matchScore('lukasz', 'Łukasz’s tray 8')).toBeGreaterThan(0);
  });
  it('nothing matches: nothing', () => { expect(jumpTo('zzzz', places)).toEqual([]); });
  it('empty: everything, lines first', () => { expect(jumpTo('', places)[0].kind).toBe('line'); });
});
