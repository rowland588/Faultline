import { describe, expect, it } from 'vitest';
import { customerRows, dayOf, holdingOf, isHolding, owedAcross, placesFor, visitInHand, visitRecords, visitSays, visitWindow, visitsOf, HOLDING_TYPE } from '../visits';
import { mergeRows } from '../../cloud/sync';
import type { ToolStudy } from '../study';
import type { Workspace, Observation } from '../../types';
import type { Snag } from '../../snag/types';

const T0 = new Date(2026, 10, 11, 9, 0).getTime();
const H = 3_600_000;
const line = (id: string, client: string, extra: Partial<Workspace> = {}): Workspace => ({ id, name: id, clientName: client, color: '#000', createdAt: 0, updatedAt: 0, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1, ...extra });
const story = (id: string, client: string, visits: ToolStudy['facts']['visits'] = [], extra: Partial<ToolStudy> = {}): ToolStudy => ({ id, tool: 'story', name: client, agreed: { story: { client, brief: '', startedAt: 0 } }, facts: { chapters: [], visits }, uses: [], startedAt: 0, createdAt: 0, updatedAt: 0, ...extra } as ToolStudy);
const snag = (id: string, ws: string, at: number, extra: Partial<Snag> = {}): Snag => ({ id, workspaceId: ws, problem: id, status: 'open', raisedAt: at, updatedAt: at, ...extra });
const study = (id: string, tool: string, ws: string, at: number, facts: Record<string, unknown> = {}): ToolStudy => ({ id, tool, name: id, workspaceId: ws, agreed: {}, facts, uses: [], startedAt: at, createdAt: at, updatedAt: at } as unknown as ToolStudy);
const stop = (id: string, ws: string, at: number): Observation => ({ id, workspaceId: ws, category: 'Jam', asset: 'Filler', startedAt: at, durationMs: 120_000, timing: 'stopwatch', count: 1, media: [], createdAt: at, updatedAt: at });

describe('visits — kept on the Story', () => {
  it('reads every visit, newest first, narrowed to one customer in any case', () => {
    const studies = [story('s1', 'Branston', [{ id: 'a', day: '2026-11-10', startedAt: T0 - 24 * H }]), story('s2', 'Business B', [{ id: 'b', day: '2026-11-11', startedAt: T0 }])];
    expect(visitsOf(studies).map(v => v.id)).toEqual(['b', 'a']);
    expect(visitsOf(studies, 'business b').map(v => [v.id, v.client, v.storyId])).toEqual([['b', 'Business B', 's2']]);
  });
  it('a deleted story holds no visit', () => {
    expect(visitsOf([story('s', 'X', [{ id: 'a', day: '', startedAt: 1 }], { deletedAt: 5 })])).toEqual([]);
  });
  it('the day is the device calendar day; the window runs to the end of the day while in hand, to its end once ended', () => {
    expect(dayOf(T0)).toBe('2026-11-11');
    const open = visitWindow({ startedAt: T0 });
    expect(open.from).toBe(T0);
    expect(new Date(open.to).getHours()).toBe(23);
    expect(visitWindow({ startedAt: T0, endedAt: T0 + 2 * H })).toEqual({ from: T0, to: T0 + 2 * H });
  });
  it('the visit in hand is the one this device holds and still not ended', () => {
    const vs = visitsOf([story('s', 'B', [{ id: 'a', day: '', startedAt: T0 }, { id: 'e', day: '', startedAt: T0, endedAt: T0 + H }])]);
    expect(visitInHand(vs, { storyId: 's', id: 'a' })?.id).toBe('a');
    expect(visitInHand(vs, { storyId: 's', id: 'e' })).toBeUndefined();
    expect(visitInHand(vs, null)).toBeUndefined();
  });
  it('two devices adding a visit each to the same story both keep theirs (the facts merged by id one level down)', () => {
    const base = { facts: { chapters: [], visits: [{ id: 'a', day: 'd', startedAt: 1 }] } };
    const mine = { facts: { chapters: [], visits: [{ id: 'a', day: 'd', startedAt: 1, endedAt: 9 }] } };
    const theirs = { facts: { chapters: [], visits: [{ id: 'a', day: 'd', startedAt: 1 }, { id: 'b', day: 'd', startedAt: 5 }] } };
    const { row } = mergeRows(base, mine, theirs, true, ['facts']);
    const v = (row.facts as { visits: { id: string; endedAt?: number }[] }).visits;
    expect(v.map(x => x.id).sort()).toEqual(['a', 'b']);
    expect(v.find(x => x.id === 'a')?.endedAt).toBe(9);
  });
});

describe('visitRecords — what was captured, read and never another customer’s', () => {
  const lines = [line('B1', 'Business B'), line('BH', 'Business B', { lineType: HOLDING_TYPE }), line('BR', 'Branston')];
  const v = { id: 'v1', client: 'Business B', startedAt: T0, endedAt: T0 + 4 * H };
  const photo = (key: string) => ({ id: key, kind: 'photo' as const, blobKey: key, mime: 'image/jpeg', capturedAt: T0 + H });
  const snags = [
    snag('in-B', 'BH', T0 + H, { media: [photo('p1')] }),
    snag('in-B-line', 'B1', T0 + 2 * H),
    snag('before', 'B1', T0 - H),
    snag('after', 'B1', T0 + 5 * H),
    snag('branston', 'BR', T0 + H, { media: [photo('p-branston')] }),
    snag('deleted', 'B1', T0 + H, { deletedAt: T0 + 2 * H }),
  ];
  const colleague = (id: string, turns: unknown[]) => ({ ...study(id, 'talk', '', T0, { colleague: true, turns }), workspaceId: undefined } as unknown as ToolStudy);
  const studies = [
    study('cap', 'capability', 'B1', T0 + H),
    study('cap-branston', 'capability', 'BR', T0 + H),
    study('talk-b', 'talk', 'B1', T0 + 3 * H),
    study('cap-old', 'capability', 'B1', T0 - 2 * H),
    story('s', 'Business B'),
    colleague('c1', [
      { id: 't1', at: T0 + H, kind: 'photo', media: { blobKey: 'walk-visit', mime: 'image/jpeg', capturedAt: T0 + H }, visitId: 'v1' },
      { id: 't2', at: T0 + H, kind: 'photo', media: { blobKey: 'walk-line', mime: 'image/jpeg', capturedAt: T0 + H }, where: { lineId: 'B1', line: 'B1', at: T0, how: 'said' } },
      { id: 't3', at: T0 + H, kind: 'photo', media: { blobKey: 'walk-branston', mime: 'image/jpeg', capturedAt: T0 + H }, where: { lineId: 'BR', line: 'BR', at: T0, how: 'said' } },
      { id: 't4', at: T0 + H, kind: 'photo', media: { blobKey: 'walk-nowhere', mime: 'image/jpeg', capturedAt: T0 + H } },
      { id: 't5', at: T0 + H, kind: 'photo', media: { blobKey: 'walk-struck', mime: 'image/jpeg', capturedAt: T0 + H }, visitId: 'v1', struck: true },
    ]),
  ];
  const stops = [stop('o1', 'B1', T0 + H), stop('o2', 'BR', T0 + H), stop('o3', 'B1', T0 - H)];
  const f = visitRecords(v, { lines, snags, studies, stops });

  it('problems on the customer’s lines (the holding place among them) in the hours, none of another customer’s', () => {
    expect(f.problems.map(s => s.id)).toEqual(['in-B', 'in-B-line']);
  });
  it('studies and Line Talks of the customer in the hours — never the story, an older study or another customer’s', () => {
    expect(f.studies.map(s => s.id)).toEqual(['cap']);
    expect(f.talks.map(s => s.id)).toEqual(['talk-b']);
  });
  it('stops timed on the customer’s lines in the hours', () => {
    expect(f.stops.map(o => o.id)).toEqual(['o1']);
  });
  it('photos: a problem’s, a walk photo taken with the visit in hand or at the customer’s line — never one at another customer’s, one with no place, or one struck', () => {
    expect(f.photos.map(p => p.key).sort()).toEqual(['p1', 'walk-line', 'walk-visit']);
  });
  it('a visit at Branston reads nothing of Business B', () => {
    const b = visitRecords({ id: 'v2', client: 'Branston', startedAt: T0, endedAt: T0 + 4 * H }, { lines, snags, studies, stops });
    expect(b.problems.map(s => s.id)).toEqual(['branston']);
    expect(b.photos.map(p => p.key).sort()).toEqual(['p-branston', 'walk-branston']);
    expect(b.studies.map(s => s.id)).toEqual(['cap-branston']);
  });
  it('says what it found in a line', () => {
    expect(visitSays(f)).toBe('2 problems · 3 photos · 1 study · 1 stop timed · 1 Line Talk');
    expect(visitSays(visitRecords(v, { lines, snags: [], studies: [] }))).toBe('Nothing captured yet');
  });
});

describe('the holding place', () => {
  const lines = [line('B1', 'Business B'), line('BH', 'business b', { lineType: 'not yet placed' }), line('BR', 'Branston')];
  it('is told from a line of the floor by its type, and found by its customer in any case', () => {
    expect(isHolding(lines[1])).toBe(true);
    expect(isHolding(lines[0])).toBe(false);
    expect(holdingOf(lines, 'Business B')?.id).toBe('BH');
    expect(holdingOf(lines, 'Branston')).toBeUndefined();
    expect(placesFor(lines, 'Business B').map(w => w.id)).toEqual(['B1']);
  });
});

describe('the consultant’s home rows', () => {
  const lines = [line('B1', 'Business B'), line('BR', 'Branston')];
  const studies = [story('s1', 'Branston', [{ id: 'a', day: '', startedAt: T0 - 24 * H, endedAt: T0 - 20 * H }], { agreed: { story: { client: 'Branston', brief: 'Why?', startedAt: 0 } } } as Partial<ToolStudy>), story('s2', 'Business B')];
  const snags = [snag('late', 'BR', T0 - 48 * H, { owner: 'Ann', dueAt: T0 - 24 * H }), snag('soon', 'BR', T0, { dueAt: T0 + 24 * H }), snag('b', 'B1', T0, { owner: 'Bo' }), snag('quiet', 'B1', T0), snag('shut', 'BR', T0, { status: 'closed', owner: 'X' })];
  it('a row a customer: its engagement, last visit and what is open and late, in words', () => {
    const rows = customerRows([{ name: 'Branston', site: 'Lincoln' }, { name: 'Business B' }], { lines, studies, snags, now: T0 });
    expect(rows.map(r => [r.name, r.engagement, r.open, r.late])).toEqual([['Branston', 'under way', 2, 1], ['Business B', 'not started', 2, 0]]);
    expect(rows[0].says).toBe(`engagement under way · last visit ${new Date(T0 - 24 * H).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · 2 open, 1 late`);
    expect(rows[1].says).toBe('no engagement yet · no visit yet · 2 open');
  });
  it('what is owed across them: a person or a day on it, late first, the client named', () => {
    const owed = owedAcross([{ name: 'Branston' }, { name: 'Business B' }], { lines, snags, now: T0 });
    expect(owed.map(o => [o.id, o.client, o.late])).toEqual([['late', 'Branston', true], ['soon', 'Branston', false], ['b', 'Business B', false]]);
  });
  it('an archived customer (not passed) owes nothing on the home', () => {
    expect(owedAcross([{ name: 'Business B' }], { lines, snags, now: T0 }).map(o => o.id)).toEqual(['b']);
  });
});
