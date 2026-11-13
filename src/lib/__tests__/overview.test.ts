/* The factory overview, on a hand-worked factory (docs/OVERVIEW.md): two lines in one area and one with no area; three open problems
 * (one priced £120 + £80 = £200 a day, one priced £50, one unpriced and critical); one line with its bottleneck worked out; a baseline
 * of 5 open, 2 critical, £400 a day, 0 proved. */
import { describe, expect, it } from 'vitest';
import { overviewOf, type OverviewInputs } from '../overview';
import type { Workspace } from '../../types';
import type { Snag } from '../../snag/types';
import type { StorySnapshot, ToolStudy } from '../study';

const line = (id: string, name: string, area?: string, assets: string[] = []) => ({ id, name, clientName: 'Acme', siteName: 'Hull', ...(area ? { areaName: area } : {}), assets }) as unknown as Workspace;
const L1 = line('l1', 'Line 1', 'Packing', ['Bagger', 'Sealer', 'Whole line']), L2 = line('l2', 'Line 2', 'Packing', ['Filler']), L3 = line('l3', 'Line 3');
const study = (id: string, ws: string, tool: string, machine?: string) => ({ id, tool, name: id, workspaceId: ws, ...(machine ? { machine } : {}), createdAt: 1000, updatedAt: 2000 }) as unknown as ToolStudy;
const snag = (id: string, ws: string, asset?: string) => ({ id, workspaceId: ws, ...(asset ? { targetAsset: asset } : {}), raisedAt: 500, updatedAt: 3000 }) as unknown as Snag;
const base: OverviewInputs = {
  client: 'Acme', now: 10_000, today: '2026-11-13', lines: [L1, L2, L3],
  wrong: [
    { id: 'p1', what: 'Bags jam', line: 'Line 1', priority: 'high', late: true, owner: 'Dave', cost: { labour: 120, contribution: 80, machine: 'Bagger' } as never },
    { id: 'p2', what: 'Film breaks', line: 'Line 1', priority: 'low', late: false, cost: { labour: 50 } as never },
    { id: 'p3', what: 'Guard loose', line: 'Line 2', priority: 'critical', late: false },
  ],
  actions: [{ id: 'a1', what: 'x', who: '', late: true } as never, { id: 'a2', what: 'y', who: 'Dave', late: false } as never],
  proved: [{ id: 'f1', what: 'New guide', machine: 'Bagger', lineId: 'l1', lineName: 'Line 1', proof: '14 → 3 jams a shift' }, { id: 'fx', what: 'other', machine: '', lineId: 'zz', lineName: 'Elsewhere', proof: '' }],
  studies: [study('s1', 'l1', 'capability', 'Bagger'), study('s2', 'l1', 'story'), study('s3', 'zz', 'capability')],
  snags: [snag('p1', 'l1', 'bagger'), snag('p3', 'l2')],
  necks: new Map([['l1', ['Sealer']]]),
  findings: [], outcomes: [], visits: [{ startedAt: 1 }, { startedAt: 2 }],
};

describe('the factory overview', () => {
  const o = overviewOf(base);
  it('prices only what a line can price and never adds the unpriced', () => {
    expect([o.tiles[0].v, o.tiles[1].v, o.tiles[3].v]).toEqual(['2', '3', '1']);
    expect(o.tiles[2].v).toMatch(/250/);                       // 200 + 50
    expect(o.tiles[2].of).toBe('a day · 2 of 3 priced');
    expect(o.unpriced).toBe(1);
    expect(o.losses.map(l => l.id)).toEqual(['p1', 'p2', 'p3']); // the priced by their cost, then the unpriced
    expect(o.losses[0]).toMatchObject({ poundsDay: 200, machine: 'Bagger', owner: 'Dave', late: true });
  });
  it('says what holds each line, or that it is not worked out', () => {
    expect(o.constraints).toEqual([{ lineId: 'l1', line: 'Line 1', neck: ['Sealer'], open: 2 }, { lineId: 'l2', line: 'Line 2', open: 1 }, { lineId: 'l3', line: 'Line 3', open: 0 }]);
  });
  it('counts where we have looked from the records — the story is not a tool, the whole line not a machine', () => {
    expect(o.coverage).toMatchObject({ lines: 3, looked: 2, machines: 3, machinesLooked: 1, visits: 2 });
    expect(o.coverage.says).toBe('2 of 3 lines looked at, 1 of 3 machines, over 2 visits. Not looked at yet: Line 3.');
    expect(o.coverage.areas.map(a => [a.title, a.lines.map(l => l.line)])).toEqual([['Hull › Packing', ['Line 1', 'Line 2']], ['No area yet', ['Line 3']]]);
    expect(o.coverage.areas[0].lines[0]).toMatchObject({ studies: 1, problems: 1, machines: 2, machinesLooked: 1, last: 3000 });
  });
  it('names what needs attention, the red first', () => {
    expect(o.risks.map(r => r.says)).toEqual([
      '1 critical problem open.', '1 open problem past its day.', '1 action late.', "1 action with nobody's name on it.",
      'The bottleneck is not worked out on Line 2 — a loss there cannot be priced in packs.',
      "1 open problem with no cost a day yet — the minutes it takes, or the line's rate, is not said.", '1 line not looked at yet.']);
  });
  it('keeps to this customer’s fixes and says there is no baseline', () => {
    expect(o.improved.proved.map(p => p.id)).toEqual(['f1']);
    expect(o.progress.rows).toEqual([]);
    expect(o.progress.says).toMatch(/^No baseline yet/);
  });
  it('sets today against the baseline', () => {
    const baseline = { at: Date.UTC(2026, 9, 1), lines: 2, found: { open: 5, critical: 2, costDay: 400 }, proved: 0, findings: [{ id: 'p1' }, { id: 'gone1' }, { id: 'gone2' }] } as unknown as StorySnapshot;
    const b = overviewOf({ ...base, baseline });
    expect(b.progress.rows).toEqual([
      { k: 'Open problems', before: '5', now: '3', better: true },
      { k: 'Critical', before: '2', now: '1', better: true },
      { k: 'What the open problems cost', before: '£400 a day', now: '£250 a day', better: true },
      { k: 'Fixes proved', before: '0', now: '1', better: true },
      { k: 'Lines', before: '2', now: '3' },
    ]);
    expect(b.progress.says).toBe('Against the baseline of 1 October 2026: 5 open then, 3 now — 2 of the 3 problems listed then are closed; 1 more fix proved.');
    expect(b.tiles[3].of).toBe('0 at the baseline');
  });
  it('a customer with no line says so', () => {
    const e = overviewOf({ ...base, lines: [], wrong: [], actions: [], proved: [], studies: [], snags: [], necks: new Map(), visits: [] });
    expect(e.says).toBe('Acme has no line set up yet — add one, and what is found on it is read here.');
    expect(e.risks).toEqual([]);
  });
});
