import { describe, expect, it } from 'vitest';
import type { ToolStudy } from '../../../lib/study';
import { countsFor, groupOf, lineRows, lineWords, reasonList, setupProblem, startingReasons, started, stopped } from '../lineWatch';
import { DEFAULT_STOP_REASONS, isStoppage } from '../repair';

const study = (id: string, machine: string, over: Partial<ToolStudy> = {}): ToolStudy => ({
  id, tool: 'reliability', name: 'Line 2a stops', machine, facts: {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1,
  agreed: { reliability: { group: 'g1', counts: [{ id: 'c1', name: 'stop' }] } }, ...over,
});

describe('a line watch — the studies watched on one clock', () => {
  it('finds the studies sharing a group, itself among them, in the order made, never a deleted one', () => {
    const a = study('a', 'Filler', { createdAt: 1 }), b = study('b', 'Packer', { createdAt: 2 });
    const gone = study('c', 'Old', { createdAt: 3, deletedAt: 9 }), other = study('d', 'Wrapper', { agreed: { reliability: { group: 'g2' } } });
    expect(groupOf([b, other, gone, a], a).map(s => s.id)).toEqual(['a', 'b']);
    expect(groupOf([a, b], study('z', 'x', { agreed: { reliability: {} } }))).toEqual([]);
  });

  it('starts a stretch once and stops the running one at the moment given', () => {
    const w = started([], 1000, 'r1', 'Sam');
    expect(w).toEqual([{ id: 'r1', from: 1000, by: 'Sam' }]);
    expect(started(w, 2000, 'r2')).toEqual(w);
    expect(stopped(w, 5000)).toEqual([{ id: 'r1', from: 1000, to: 5000, by: 'Sam' }]);
    expect(stopped(stopped(w, 5000), 9000)).toEqual([{ id: 'r1', from: 1000, to: 5000, by: 'Sam' }]);
    expect(stopped(w, 500)[0].to).toBe(1000);
  });

  it('puts the same stretch on every machine so they share the line’s watched time', () => {
    const at = 3_600_000;
    const sibs = [study('a', 'Filler'), study('b', 'Packer')].map((s, i) => ({ ...s, facts: { watch: stopped(started([], 0, 'r' + i), at), events: [{ id: 'e' + i, at: 1000 * (i + 1), count: 'c1' }] } }));
    const rows = lineRows(sibs, at + 1);
    expect(rows.map(r => r.machine)).toEqual(['Filler', 'Packer']);
    expect(rows.every(r => r.taps === 1 && !r.running)).toBe(true);
    expect(lineWords(rows)).toBe('2 machines on one clock — the watch is stopped');
  });

  it('says how many are watching, and a machine with nothing tapped has none yet', () => {
    const run = study('a', 'Filler', { facts: { watch: [{ id: 'r', from: 0 }] } }), idle = study('b', 'Packer');
    const rows = lineRows([run, idle], 60_000);
    expect(rows[0].running).toBe(true);
    expect(rows[1].taps).toBe(0);
    expect(lineWords(rows)).toBe('2 machines on one clock — 1 watching');
    expect(lineWords(lineRows([run, { ...idle, facts: { watch: [{ id: 'q', from: 0 }] } }], 60_000))).toBe('2 machines on one clock — all watching');
  });

  it('makes a machine’s counts from the words typed — one name once, a stop when empty, the target on the first', () => {
    let n = 0;
    const id = () => 'k' + ++n;
    expect(countsFor('', undefined, id)).toEqual([{ id: 'k1', name: 'stop' }]);
    expect(countsFor('Jam, jam, Short stop', 30, id).map(c => [c.name, c.targetMin])).toEqual([['jam', 30], ['short stop', undefined]]);
  });

  it('refuses a set-up with no machine ticked or an MTBF wanted that is not minutes', () => {
    expect(setupProblem([{ machine: 'A', counting: 'stop', on: false }])).toMatch(/at least one machine/);
    expect(setupProblem([{ machine: 'A', counting: 'stop', on: true, targetMin: -5 }])).toMatch(/A: an MTBF wanted is minutes/);
    expect(setupProblem([{ machine: 'A', counting: 'stop', on: true, targetMin: 30 }, { machine: 'B', counting: 'jam', on: false }])).toBeUndefined();
  });

  it('times a stoppage with its reasons — the usual eight to start, the typed ones when typed, never a count that is not a stoppage', () => {
    let n = 0;
    const id = () => 'k' + ++n;
    const cs = countsFor('stop, pick', undefined, id, { reasons: startingReasons('') });
    expect(cs[0]).toMatchObject({ name: 'stop', timed: 'stop', reasons: DEFAULT_STOP_REASONS });
    expect(cs[1]).toEqual({ id: 'k2', name: 'pick' });
    expect(startingReasons(' jam, Film break ,jam')).toEqual(['jam', 'Film break']);
    expect(DEFAULT_STOP_REASONS.length).toBeLessThanOrEqual(8);
    expect(['stop', 'Jams', 'short stop', 'failure'].every(isStoppage) && !isStoppage('pick')).toBe(true);
    expect(reasonList('a,\nb, A')).toEqual(['a', 'b']);
  });

  it('refuses more reasons than a short list holds', () => {
    expect(setupProblem([{ machine: 'A', counting: 'stop', on: true, timed: true, reasons: 'a,b,c,d,e,f,g,h,i' }])).toMatch(/A: a short list of reasons — 8 at most/);
  });
});
