import { describe, expect, it } from 'vitest';
import { jumpTo, matchScore, TOOL_PLACES, type Place } from '../jumpTo';

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

describe('search across records (7 November)', () => {
  const places: Place[] = [
    { kind: 'line', label: 'Line 7', href: '#/lines/7' },
    { kind: 'machine', label: 'Wrapper', sub: 'Line 7', href: '#/lines/7/machine/Wrapper' },
    { kind: 'problem', label: 'Wrapper film snaps at the jaw', sub: 'Line 7 · Sam', href: '#/snags?open=p1', problemId: 'p1' },
    { kind: 'problem', label: 'Labeller guide worn', sub: 'Line 7 · Jo', href: '#/snags?open=p2', problemId: 'p2' },
  ];
  it('finds a problem by its words, the machine first on an equal match', () => {
    expect(jumpTo('wrapper', places).map(p => p.label)).toEqual(['Wrapper', 'Wrapper film snaps at the jaw']);
    expect(jumpTo('film', places).map(p => p.problemId)).toEqual(['p1']);
    expect(jumpTo('guide', places).map(p => p.problemId)).toEqual(['p2']);
  });
  it('lists no problem until something is typed, and never by letters scattered through it', () => {
    expect(jumpTo('', places).some(p => p.kind === 'problem')).toBe(false);
    expect(jumpTo('wfsj', places).some(p => p.kind === 'problem')).toBe(false);
  });
});
