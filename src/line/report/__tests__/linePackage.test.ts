/* THE LINE'S FULL PACKAGE (src/line/report/linePackage, 3 November): which papers go in, in what order — a paper with nothing to
 * print is left out, a dual line says whose each paper is, a record unticked is not in. */
import { describe, expect, it } from 'vitest';
import { lineBundle } from '../lineBundle';
import { ALL_IN, packageSections, packageSays } from '../linePackage';
import type { Workspace } from '../../../types';
import type { Snag } from '../../../snag/types';
import type { Program } from '../../../lib/programs';
import type { ToolStudy } from '../../../lib/study';
import type { Standard } from '../../../tools/linestandard/standard';
import type { Asset } from '../../../lib/testing';

const TODAY = '2026-11-03';
const line = (id: string, name: string, madeOf?: string[]): Workspace =>
  ({ id, name, color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: ['Whole line', 'Bagger'], shifts: [], schemaVersion: 1, ...(madeOf ? { madeOf } : {}) });
const A = line('a', 'Line 2a'), B = { ...line('b', 'Line 2b'), assets: ['Whole line'] }, D = line('d', '2a 2b', ['a', 'b']);
const machine = (id: string, name: string, ws: string): Asset => ({ id, projectId: '', workspaceId: ws, name, sort: 1, createdAt: 1, updatedAt: 1 } as unknown as Asset);
const program = (id: string, ws: string): Program => ({ id, projectId: '', workspaceId: ws, what: 'Program 10', state: 'onMachine', sort: 1, createdAt: 1, updatedAt: 1 } as unknown as Program);
const snag = (id: string, ws: string): Snag => ({ id, workspaceId: ws, problem: 'Miss picks', status: 'open', priority: 'low', raisedAt: Date.parse('2026-11-01'), createdAt: 1, updatedAt: 1 } as unknown as Snag);
const study = (id: string, ws: string, name: string, at: number): ToolStudy => ({ id, tool: 'capability', name, workspaceId: ws, facts: {}, uses: [], startedAt: at, createdAt: at, updatedAt: at } as ToolStudy);
const standard = (id: string, ws: string, product: string, o: Partial<Standard> = {}): Standard => ({ id, workspaceId: ws, product, marks: [{ id: 'k', kind: 'person', x: 1, y: 1, label: 'Op 1' }], createdAt: 1, updatedAt: 5, ...o } as unknown as Standard);

const records = {
  lines: [A, B, D], machines: [machine('m1', 'Bagger', 'a')], programs: [program('p1', 'a')], jobLines: [], snags: [snag('s1', 'a')],
  standards: [standard('st1', 'a', 'All Rounder 2kg', { capacity: { targetPerMin: 60, stations: [{ id: 'x', name: 'Bagger', kind: 'machine', unit: 'packs', contains: 1, rate: 50, ratePer: 'min' }] } as Standard['capacity'] })],
  studies: [study('c1', 'a', 'Weights', 10), study('c2', 'a', 'Older weights', 5)], today: TODAY,
};
const all = (b: ReturnType<typeof lineBundle>) => new Set(b.parts.flatMap(p => p.items.map(i => i.key)));

describe('the full package', () => {
  const b = lineBundle(A, records);
  it('is the line at a glance, then every paper the line has, in a fixed order', () => {
    const ids = packageSections(b, all(b), ALL_IN, { problemsOn: () => ({ open: 1, closed: 2 }), testsOn: () => 3 }).map(s => s.kind);
    expect(ids.slice(0, 6)).toEqual(['glance', 'problems', 'problemcards', 'programs', 'testcards', 'machines']);
    expect(ids).toContain('standards'); expect(ids).toContain('capacity');
    expect(ids.filter(k => k === 'study')).toHaveLength(2);
    expect(ids.indexOf('standards')).toBeLessThan(ids.indexOf('study'));
  });
  it('says what is in each, as the line has it — the closed problems and the test cards among them (Rowland, 3 November)', () => {
    const s = packageSections(b, all(b), ALL_IN, { problemsOn: () => ({ open: 1, closed: 2 }), testsOn: () => 3 });
    expect(s.find(x => x.kind === 'problems')?.what).toBe('1 problem open, 2 closed, each with its plan and journey');
    expect(s.find(x => x.kind === 'problemcards')?.what).toContain('3 cards');
    expect(s.find(x => x.kind === 'testcards')?.what).toContain('3 test cards');
    expect(s.find(x => x.kind === 'programs')?.what).toContain('1 program,');
    expect(s.find(x => x.kind === 'machines')?.what).toContain('1 machine in full');
    expect(s.find(x => x.kind === 'standards')?.what).toContain('All Rounder 2kg');
  });
  it('leaves out what is unticked and what the line does not have', () => {
    const none = packageSections(b, new Set(), { ...ALL_IN, problems: false, problemCards: false, testCards: false, machines: false }, { problemsOn: () => ({ open: 1, closed: 2 }), testsOn: () => 3 });
    expect(none.map(s => s.kind)).toEqual(['glance', 'programs']);
    const bare = lineBundle(B, records);
    expect(packageSections(bare, all(bare), ALL_IN, { problemsOn: () => ({ open: 0, closed: 0 }), testsOn: () => 0 }).map(s => s.kind)).toEqual(['glance']);
    /* only closed problems still make a report and cards — what was put right is part of what happened */
    expect(packageSections(bare, all(bare), ALL_IN, { problemsOn: () => ({ open: 0, closed: 2 }), testsOn: () => 0 }).map(s => s.kind)).toEqual(['glance', 'problems', 'problemcards']);
  });
  it('a dual line says whose each paper is', () => {
    const d = lineBundle(D, records);
    const titles = packageSections(d, all(d)).map(s => s.title);
    expect(titles).toContain('Line 2a — Problems');
    expect(packageSays(packageSections(d, all(d)))).toMatch(/papers after the cover/);
  });
});
