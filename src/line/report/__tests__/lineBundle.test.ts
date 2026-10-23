/* THE LINE REPORT — EVERYTHING ON THE LINE (lib/lineBundle, 23 October):
 * a line's parts, where on the line a finding points, what goes in by
 * default, who owes what; a dual line as its lines then both together. */
import { describe, expect, it } from 'vitest';
import { actionsOn, bundleSays, defaultPicks, itemsOn, lineBundle, whereOnLine } from '../lineBundle';
import type { Workspace } from '../../../types';
import type { Snag } from '../../../snag/types';
import type { Program } from '../../../lib/programs';
import type { ToolStudy } from '../../../lib/study';
import type { Standard } from '../../../lib/standard';
import type { Asset } from '../../../lib/testing';

const TODAY = '2026-10-23';
const line = (id: string, name: string, assets: string[], madeOf?: string[]): Workspace =>
  ({ id, name, color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets, shifts: [], schemaVersion: 1, ...(madeOf ? { madeOf } : {}) });
const A = line('a', 'Line 2a', ['Whole line', 'Pick and Place', 'Destaker']);
const B = line('b', 'line 2b', ['Whole line', 'Bagger']);
const D = line('d', '2a 2b', ['Whole line'], ['a', 'b']);
const machine = (id: string, name: string, ws: string): Asset => ({ id, projectId: '', workspaceId: ws, name, sort: 1, createdAt: 1, updatedAt: 1 } as unknown as Asset);
const program = (id: string, what: string, ws: string, o: Partial<Program> = {}): Program => ({ id, projectId: '', workspaceId: ws, what, state: 'onMachine', sort: 1, createdAt: 1, updatedAt: 1, ...o });
const snag = (id: string, ws: string, problem: string, o: Partial<Snag> = {}): Snag => ({ id, workspaceId: ws, problem, status: 'open', priority: 'low', raisedAt: Date.parse('2026-10-20T10:00:00Z'), updatedAt: 1, media: [], ...o } as Snag);
const study = (id: string, tool: ToolStudy['tool'], ws: string, name: string, at: number, machine?: string): ToolStudy =>
  ({ id, tool, name, workspaceId: ws, ...(machine ? { machine } : {}), facts: {}, uses: [], startedAt: at, createdAt: at, updatedAt: at } as ToolStudy);
const standard = (id: string, ws: string, product: string, o: Partial<Standard> = {}): Standard => ({ id, workspaceId: ws, product, marks: [], createdAt: 1, updatedAt: 5, ...o } as Standard);

const records = {
  lines: [A, B, D],
  machines: [machine('m1', 'Pick and Place', 'a'), machine('m2', 'Destaker', 'a'), machine('m3', 'Bagger', 'b')],
  programs: [program('p10', 'Program 10', 'a', { assetId: 'm1', testOn: '2026-10-20', from: 'Ilapak' }), program('p9', 'Program 9', 'a', { assetId: 'm2', state: 'proved', provedOn: '2026-10-01' }), program('pb', 'PB-1', 'b')],
  jobLines: [],
  snags: [snag('s1', 'a', 'Miss picks at the pick and place', { targetAsset: 'Pick and Place', priority: 'critical', owner: 'Dave' }), snag('s2', 'a', 'Floor wet by the line'), snag('s3', 'd', 'Shared conveyor jams', { targetAsset: 'Conveyor' })],
  standards: [standard('st1', 'a', 'All Rounder 2kg', { capacity: { target: 60, stations: [{ id: 'x', name: 'Pick and Place', kind: 'machine', unit: 'packs', perMin: 50 }] } } as unknown as Partial<Standard>), standard('st2', 'd', 'Baskets', { marks: [{ id: 'k', x: 1, y: 1, kind: 'person', label: 'Op 1' }] } as Partial<Standard>)],
  studies: [study('c1', 'capability', 'a', 'Pick and place reliability', 10, 'Pick and Place'), study('c2', 'capability', 'a', 'Older weights', 5), study('r1', 'reliability', 'a', 'Miss picks', 7, 'Pick and Place'), study('r2', 'reliability', 'd', 'Both lines stops', 8)],
  today: TODAY,
  ref: Date.parse('2026-10-23T12:00:00Z'),
};

describe('everything on the line', () => {
  it('lists each tool\'s records on the line, newest first within a tool, the capacity and standard among them', () => {
    const items = itemsOn(A, records);
    expect(items.map(i => i.key)).toEqual(['study:c1', 'study:c2', 'study:r1', 'capacity:st1']);
    expect(items[0].tool).toBe('Capability');
    expect(items[2].tool).toBe('Reliability');
    expect(items[3]).toMatchObject({ tool: 'Line capacity', name: 'All Rounder 2kg' });
    /* nothing of another line's */
    expect(itemsOn(D, records).map(i => i.key)).toEqual(['study:r2', 'standard:st2']);
  });
  it('the newest of each tool goes in by default; the person can tick others', () => {
    expect([...defaultPicks(itemsOn(A, records))].sort()).toEqual(['capacity:st1', 'study:c1', 'study:r1']);
  });
  it('where on the line: only the machines a finding points at, in flow order, each record\'s own words', () => {
    const b = lineBundle(A, records);
    const w = b.parts[0].where;
    expect(w.map(r => r.machine)).toEqual(['Pick and Place']);   /* Destaker's program is proved; Whole line and the floor stay at the top */
    expect(w[0].findings.map(f => f.from)).toEqual(['Problem', 'Program', 'Capability', 'Reliability']);
    expect(w[0].findings[0]).toMatchObject({ says: expect.stringContaining('Miss picks at the pick and place'), tone: 'r' });
    expect(w[0].findings[1]).toMatchObject({ says: 'Program 10 not proved — test was 20 Oct', tone: 'r' });
  });
  it('who owes what by when — every open problem and every program to prove, the late first', () => {
    const b = lineBundle(A, records);
    const a = b.parts[0].actions;
    expect(a.map(x => x.what)).toEqual(['Miss picks at the pick and place', 'Prove program Program 10', 'Floor wet by the line']);
    expect(a[0]).toMatchObject({ who: 'Dave', state: 'Open', tone: 'r', from: 'Problem' });
    expect(a[1]).toMatchObject({ who: 'Ilapak', due: '20 Oct', state: 'Late', tone: 'r', from: 'Programs' });
    expect(actionsOn(b.parts[0].kit, [], TODAY)).toHaveLength(1);
  });
  it('a single line is one part; a dual line is each of its lines, then both together — and says so', () => {
    const one = lineBundle(A, records);
    expect(one.dual).toBe(false);
    expect(one.parts.map(p => p.title)).toEqual(['Line 2a']);
    const dual = lineBundle(D, records);
    expect(dual.dual).toBe(true);
    expect(dual.parts.map(p => p.title)).toEqual(['Line 2a', 'line 2b', 'Both lines together']);
    expect(dual.parts[2].items.map(i => i.key)).toEqual(['study:r2', 'standard:st2']);
    expect(dual.parts[2].problems.open).toBe(1);
    expect(dual.parts[2].where).toEqual([{ machine: 'Conveyor', findings: [{ from: 'Problem', says: 'Shared conveyor jams — Open · 3 days', tone: 'n' }] }]);
    expect(bundleSays(one, defaultPicks(one.parts[0].items))).toBe('3 tools · 2 problems open · 1 program to prove');
    expect(bundleSays(dual, new Set([...dual.parts.flatMap(p => [...defaultPicks(p.items)])]))).toBe('4 tools · 3 problems open · 2 programs to prove · 2 lines and both together');
  });
  it('an archived line drops out of a dual line\'s parts', () => {
    const b = lineBundle(D, { ...records, lines: [A, { ...B, archived: true }, D] });
    expect(b.parts.map(p => p.title)).toEqual(['Line 2a', 'Both lines together']);
    /* with no problem and no study named, the machine's unproved program still points at it */
    expect(whereOnLine(b.parts[0].kit, [], [], TODAY).map(r => r.machine)).toEqual(['Pick and Place']);
  });
});
