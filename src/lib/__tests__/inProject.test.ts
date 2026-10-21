import { describe, expect, it } from 'vitest';
import { inProject, inScope, startLine } from '../inProject';

/* INSIDE A PROJECT (docs/PROJECTS.md, P2): a tool's address carries the
   project; its list shows the project's own first; a new one starts on the
   project's line when it has one. */
describe('a tool inside a project', () => {
  it('carries the project on its address, keeping what was there', () => {
    expect(inProject('/smed', 'p1')).toBe('/smed?project=p1');
    expect(inProject('/smed?line=w1', 'p1')).toBe('/smed?line=w1&project=p1');
    expect(inProject('/smed?project=old', 'p1')).toBe('/smed?project=p1');
    expect(inProject('/smed')).toBe('/smed');
  });

  const rows = [
    { id: 'a', projectId: 'p1', workspaceId: 'w1' },
    { id: 'b', workspaceId: 'w1' },
    { id: 'c', projectId: 'p2', workspaceId: 'w1' },
    { id: 'd', projectId: 'p1' },
    { id: 'e', workspaceId: 'w9' },
    { id: 'f' },
  ];
  const ids = (xs: { id: string }[]) => xs.map(x => x.id);

  it('lists the project’s own; everything on its lines; or every one', () => {
    expect(ids(inScope(rows, 'project', 'p1', ['w1']))).toEqual(['a', 'd']);
    /* its lines: its own, the line's own work and another project's on the same line — nothing on another line */
    expect(ids(inScope(rows, 'lines', 'p1', ['w1']))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(inScope(rows, 'all', 'p1', ['w1']))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    /* outside a project the scope does nothing */
    expect(ids(inScope(rows, 'project', undefined, []))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('starts a new one on the line asked for, else the project’s only line, else asks', () => {
    expect(startLine(['w1'])).toBe('w1');
    expect(startLine(['w1', 'w2'])).toBe('');
    expect(startLine([])).toBe('');
    expect(startLine(['w1', 'w2'], 'w2')).toBe('w2');
  });
});
