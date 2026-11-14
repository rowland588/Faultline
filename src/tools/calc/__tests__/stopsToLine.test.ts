/* FC-241 part 8 — the stops timed on a record put on its line's stop log (knowledge/specs/FC-241-workstation-stops.md, criteria 30–32). */
import { describe, expect, it } from 'vitest';
import type { Observation } from '../../../types';
import type { StopDone } from '../stopReasons';
import { FROM, NO_REASON, lineStopsSaid, planSync, stopObsId, stopsWanted } from '../stopsToLine';

const T = 1_700_000_000_000;
const names = ['Filler', 'Wrapper', 'Sealer', 'Packer'];
/* case R of part 7 */
const R: StopDone[] = [
  { i: 0, at: T, min: 2, why: 'Jam' }, { i: 0, at: T + 600_000, min: 1.5, why: 'Jam' }, { i: 0, at: T + 1_200_000, min: 3, why: 'No film' },
  { i: 2, at: T + 60_000, min: 10, why: 'Jam' }, { i: 2, at: T + 1_800_000, min: 4, why: '' }, { i: 3, at: T + 120_000, min: 2.5, why: 'No film' },
];
const want = (stops: StopDone[] = R): Observation[] => stopsWanted({ studyId: 'study-1', name: 'Cellox stops', lineId: 'line-7', stops, nameOf: i => names[i], now: T + 9 });
const held = (list: Observation[]): Map<string, Observation> => new Map(list.map(o => [o.id, o]));

describe('a stop on the line’s log', () => {
  it('has an id that is a uuid, the same every time, and its own for each stop', () => {
    const a = stopObsId('study-1', 0, T);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stopObsId('study-1', 0, T)).toBe(a);
    const all = new Set([a, stopObsId('study-1', 1, T), stopObsId('study-1', 0, T + 1), stopObsId('study-2', 0, T)]);
    expect(all.size).toBe(4);
    expect(new Set(want().map(o => o.id)).size).toBe(6);
  });
  it('is the stop as timed: the reason what the Pareto ranks, the workstation the machine, the minutes its time', () => {
    const w = want();
    expect(w).toHaveLength(6);
    expect(w[3]).toMatchObject({ workspaceId: 'line-7', category: 'Jam', asset: 'Sealer', startedAt: T + 60_000, endedAt: T + 60_000 + 600_000, durationMs: 600_000, timing: 'stopwatch', count: 1, note: `${FROM} — Cellox stops` });
    expect(w[4].category).toBe(NO_REASON);
    /* by reason, in minutes, as case R works it by hand: Jam 13.5, No film 5.5, none 4 */
    const by = (c: string): number => w.filter(o => o.category === c).reduce((t, o) => t + o.durationMs, 0) / 60000;
    expect(by('Jam')).toBeCloseTo(13.5); expect(by('No film')).toBeCloseTo(5.5); expect(by(NO_REASON)).toBeCloseTo(4);
  });
});

describe('keeping the log in step', () => {
  it('sends every stop the first time and nothing the second', () => {
    const w = want();
    const first = planSync(w, new Map(), []);
    expect(first.add).toHaveLength(6); expect(first.update).toHaveLength(0); expect(first.remove).toHaveLength(0); expect(first.ids).toHaveLength(6);
    const again = planSync(want(), held(w), first.ids);
    expect(again.add).toHaveLength(0); expect(again.update).toHaveLength(0); expect(again.remove).toHaveLength(0);
  });
  it('a reason changed is that one stop changed, keeping what the line added to it', () => {
    const w = want();
    const onLine = held(w.map(o => (o.id === w[4].id ? { ...o, causeM: 'machine' as const } : o)));
    const changed = R.map((s, k) => (k === 4 ? { ...s, why: 'Seal bar' } : s));
    const p = planSync(want(changed), onLine, w.map(o => o.id));
    expect(p.add).toHaveLength(0); expect(p.remove).toHaveLength(0);
    expect(p.update).toHaveLength(1);
    expect(p.update[0]).toMatchObject({ id: w[4].id, category: 'Seal bar', causeM: 'machine' });
  });
  it('a stop taken off is taken off the log; one more timed is one more added; a deleted one wanted again comes back', () => {
    const w = want();
    const fewer = planSync(want(R.slice(0, 5)), held(w), w.map(o => o.id));
    expect(fewer.remove).toEqual([w[5].id]); expect(fewer.add).toHaveLength(0);
    const more = planSync(want([...R, { i: 1, at: T + 5_000_000, min: 1, why: 'Jam' }]), held(w), w.map(o => o.id));
    expect(more.add).toHaveLength(1); expect(more.add[0].asset).toBe('Wrapper');
    const back = planSync(w, held(w.map(o => (o.id === w[0].id ? { ...o, deletedAt: T + 50 } : o))), w.map(o => o.id));
    expect(back.update).toHaveLength(1); expect(back.update[0].deletedAt).toBeUndefined();
  });
  it('taking them all off removes each once', () => {
    const w = want();
    expect(planSync([], held(w), w.map(o => o.id)).remove).toHaveLength(6);
    expect(planSync([], held(w.map(o => ({ ...o, deletedAt: T }))), w.map(o => o.id)).remove).toHaveLength(0);
  });
});

describe('what the page says', () => {
  it('says where the stops are, and never claims a line the record is not on', () => {
    expect(lineStopsSaid({ stops: 6, canEdit: true })).toContain('on no line');
    expect(lineStopsSaid({ line: 'Line 7', stops: 6, canEdit: true })).toBe('6 stops are only in this record. Put them on Line 7’s stop log and its Pareto and its 6M read them — each stop as timed here, its reason what the Pareto ranks, its workstation the machine.');
    expect(lineStopsSaid({ line: 'Line 7', stops: 6, sent: 6, canEdit: true })).toBe('On Line 7’s stop log: 6 stops from this record, kept in step as you time more, change a reason or take one off. Its Pareto and its 6M read them.');
    expect(lineStopsSaid({ line: 'Line 7', stops: 1, sent: 1, canEdit: false })).toBe('On Line 7’s stop log: 1 stop from this record. Its Pareto and its 6M read them.');
  });
});
