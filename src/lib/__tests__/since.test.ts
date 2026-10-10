/* SINCE YOU LAST LOOKED (lib/since) — what changed between a visit and now. */
import { describe, it, expect } from 'vitest';
import { sinceOf, sinceWords } from '../since';
import type { Asset, Test, TestItem } from '../testing';

/* The visit: Tue 6 Oct 2026, 16:40 local. Now: Sat 10 Oct, 09:00. */
const SEEN = new Date(2026, 9, 6, 16, 40).getTime();
const NOW = new Date(2026, 9, 10, 9, 0).getTime();
const AFTER = SEEN + 3_600_000, BEFORE = SEEN - 3_600_000;
const coder: Asset = { id: 'c', projectId: 'p', name: 'Domino coder', state: 'onSite', sort: 1, updatedAt: 1 } as Asset;
const packer: Asset = { id: 'k', projectId: 'p', name: 'Case packer', state: 'onSite', sort: 2, updatedAt: 1 } as Asset;
let n = 0;
const st = (o: Partial<Test>): Test => ({ id: `t${n++}`, projectId: 'p', kind: 'install', title: `Stage ${n}`, assetId: 'c', outcome: 'planned', sort: n, createdAt: 1, updatedAt: BEFORE, ...o });
const found = (o: Partial<TestItem>): TestItem => ({ id: `i${n++}`, projectId: 'p', testId: '', kind: 'found', what: 'Regulator leaking', sort: n, createdAt: AFTER, updatedAt: AFTER, ...o });
const run = (tests: Test[], items: TestItem[] = [], seenAt: number | undefined = SEEN) => sinceOf({ tests, items, assets: [coder, packer], seenAt, now: NOW });

describe('since you last looked', () => {
  it('nothing to say on a first visit, or when nothing changed', () => {
    expect(run([st({ plannedFor: '2026-10-20' })], [], undefined)).toBeUndefined();
    expect(run([st({ plannedFor: '2026-10-20' }), st({ outcome: 'passed', ranOn: '2026-10-05', updatedAt: BEFORE })])).toBeUndefined();
  });

  it('each kind of change, the abnormal first', () => {
    const air = st({ title: 'Air and power connected', plannedFor: '2026-10-08' });             // its day went while away
    const old = st({ title: 'Guards fitted', plannedFor: '2026-10-02' });                        // already late at the visit
    const seal = st({ kind: 'test', title: 'Seal integrity', outcome: 'failed', ranOn: '2026-10-09', updatedAt: AFTER });
    const done1 = st({ outcome: 'passed', ranOn: '2026-10-07', updatedAt: AFTER });
    const done2 = st({ outcome: 'passed', ranOn: '2026-10-09', updatedAt: AFTER });
    const fix = st({ kind: 'fix', title: 'Send the regulator', outcome: 'passed', ranOn: '2026-10-08', updatedAt: AFTER });
    const p = run([air, old, seal, done1, done2, fix], [found({ testId: air.id })])!;
    expect(p.from).toMatch(/^Since Tue,? 16:40$/);
    expect(p.parts.map(x => x.kind)).toEqual(['late', 'failed', 'problem', 'done']);
    expect(p.parts.map(x => x.text)).toEqual([
      '1 went late (Air and power connected)',
      '1 test didn’t pass (Seal integrity)',
      '1 problem raised on Domino coder',
      '2 stages, 1 fix done',
    ]);
    expect(p.parts[0].ids).toEqual([air.id]);
  });

  it('a note on an old stage is not news; a stage done before the visit, edited after, is not "done since"', () => {
    const touched = st({ outcome: 'passed', ranOn: '2026-10-01', updatedAt: AFTER });
    expect(run([touched])).toBeUndefined();
  });

  it('a stage done on the visit’s own day, after the visit, is news; before it is not', () => {
    expect(run([st({ outcome: 'passed', ranOn: '2026-10-06', updatedAt: AFTER })])!.parts[0].text).toBe('1 stage done');
    expect(run([st({ outcome: 'passed', ranOn: '2026-10-06', updatedAt: BEFORE })])).toBeUndefined();
  });

  it('a "not yet" reason is a part owed, not a problem raised', () => {
    const t = st({ plannedFor: '2026-10-20' });
    const owed: TestItem = { id: 'o', projectId: 'p', testId: t.id, kind: 'next', what: 'Waiting on the air main', sort: 1, createdAt: AFTER, updatedAt: AFTER };
    expect(run([t], [owed, found({ testId: t.id, becameItemId: 'o' })])).toBeUndefined();
  });

  it('many: names two and how many more; problems counted', () => {
    const lates = ['A', 'B', 'C'].map(x => st({ title: x, plannedFor: '2026-10-08' }));
    const p = run(lates, [found({}), found({})])!;
    expect(p.parts[0].text).toBe('3 went late (A; B and 1 more)');
    expect(p.parts[1].text).toBe('2 problems raised');
  });

  it('deleted records are not news', () => {
    expect(run([st({ title: 'X', plannedFor: '2026-10-08', deletedAt: 5 })])).toBeUndefined();
  });

  it('the visit in words: today, this week, before', () => {
    const at = new Date(2026, 9, 10, 7, 15).getTime();
    expect(sinceWords(at, NOW)).toBe('Since 07:15');
    expect(sinceWords(SEEN, NOW)).toMatch(/^Since Tue,? 16:40$/);
    expect(sinceWords(new Date(2026, 8, 20, 8, 0).getTime(), NOW)).toMatch(/^Since (Sun,? )?20 Sept?$/);
  });
});
