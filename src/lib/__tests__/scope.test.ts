/* WHICH SCOPE A PAGE IS IN (docs/STRUCTURE.md §5, B2). */
import { describe, expect, it } from 'vitest';
import { parseRoute } from '../../state/useRoute';
import { matchScore, scopeOf } from '../scope';

const at = (hash: string, hints = {}) => scopeOf(parseRoute(hash), hints);

describe('every page is in one scope', () => {
  it('the one home is the factory (23 October)', () => {
    expect(at('#/')).toEqual({ kind: 'factory' });
    expect(at('#/start')).toEqual({ kind: 'factory' });
  });

  it('the factory\'s own pages are the factory\'s', () => {
    for (const h of ['#/room', '#/actions', '#/snags', '#/projects', '#/factory', '#/programs', '#/tools', '#/capability', '#/smed', '#/standards', '#/talk', '#/video'])
      expect(at(h), h).toEqual({ kind: 'factory' });
  });

  it('a line\'s page, and a list narrowed to the line, are the line\'s', () => {
    for (const h of ['#/lines/w1', '#/lines/w1?view=tools', '#/snags?line=w1', '#/programs?line=w1', '#/capability?line=w1', '#/standards?line=w1', '#/talk?line=w1', '#/w/w1/capture', '#/w/w1/analyse', '#/w/w1/standards/s1'])
      expect(at(h), h).toEqual({ kind: 'line', wsId: 'w1' });
  });

  it('a project\'s pages are the project\'s — and so is anything the frame says is in one', () => {
    expect(at('#/project/p1/plan', { projectId: 'p1' })).toEqual({ kind: 'project', projectId: 'p1' });
    expect(at('#/capability?project=p1', { projectId: 'p1' })).toEqual({ kind: 'project', projectId: 'p1' });
    expect(at('#/w/w1/capture', { projectId: 'p1' })).toEqual({ kind: 'line', wsId: 'w1' });
  });

  it('a record on no project is its line\'s when it is on one, else the factory\'s', () => {
    expect(at('#/capability/s1', { lineId: 'w1' })).toEqual({ kind: 'line', wsId: 'w1' });
    expect(at('#/capability/s1')).toEqual({ kind: 'factory' });
  });

  it('a page the factory always owns stays the factory\'s whatever is on its address', () => {
    expect(at('#/room?line=w1')).toEqual({ kind: 'factory' });
    expect(at('#/actions?line=w1')).toEqual({ kind: 'factory' });
  });
});

describe('the switcher finds the name meant (matchScore)', () => {
  it('a name that starts with it, then a word that does, then anywhere, then none', () => {
    expect(matchScore('Line 7 pace', 'line')).toBe(0);
    expect(matchScore('Line 7 pace', 'pac')).toBe(1);
    expect(matchScore('Line 2A — capacity', 'pac')).toBe(2);
    expect(matchScore('Line 2A — capacity', 'cap')).toBe(1);
    expect(matchScore('Line 2 commissioning', 'xyz')).toBe(3);
    expect(matchScore('Anything', '')).toBe(0);
  });
  it('so "pac" is Line 7 pace before Line 2A — capacity', () => {
    const names = ['Line 2A — capacity', 'Line 7 pace'];
    expect([...names].sort((a, b) => matchScore(a, 'pac') - matchScore(b, 'pac'))[0]).toBe('Line 7 pace');
  });
});
