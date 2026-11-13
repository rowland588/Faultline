/* Faultline'S KNOWLEDGE — the model (docs/LUNAR-KNOWLEDGE.md §2–3): identities, versions that never rewrite the one before, lapses, and a
 * claim's standing with evidence outranking opinion. */
import { describe, it, expect } from 'vitest';
import { homework } from '../../brain/engine';
import { findingVersions, claimOf } from '../findings';
import { currentOf, entryId, standingOf, storyOf, versionsOf, type Entry } from '../model';
import type { Observation } from '../../../types';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 12, 12);
let n = 0;
const stop = (now: number, daysAgo: number, min: number, asset: string, category: string): Observation => ({
  id: `o${++n}`, workspaceId: 'L1', category, asset, startedAt: now - daysAgo * DAY, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: 0, updatedAt: 0,
});
const LINE = { id: 'L1', name: 'Line 1' };
const recurring = (now: number) => [stop(now, 1, 4, 'Bagger', 'Jam'), stop(now, 5, 4, 'Bagger', 'Jam'), stop(now, 13, 4, 'Bagger', 'Jam'), stop(now, 2, 9, 'Wrapper', 'Film')];
const run = (obs: Observation[], ledger: Entry[], now: number) => findingVersions({ id: 'L1', client: 'Branston' }, homework(LINE, obs, now).findings, ledger, now);

describe('identities', () => {
  it('the same parts give the same id; any part different gives another', () => {
    expect(entryId('L1', 'recurs:stops:bagger|jam', 'present')).toBe(entryId('L1', 'recurs:stops:bagger|jam', 'present'));
    expect(entryId('L1', 'recurs:stops:bagger|jam', 'present')).not.toBe(entryId('L1', 'recurs:stops:bagger|jam', 'present', 'k-x'));
    expect(entryId('a')).toMatch(/^k-[0-9a-f]{16}$/);
  });
  it('a finding names its claim by kind and subject, in lower case', () => {
    const f = homework(LINE, recurring(NOW), NOW).findings.find(x => x.kind === 'recurs')!;
    expect(claimOf(f)).toEqual({ claim: 'recurs:stops:bagger|jam', subject: 'stops:bagger|jam', signature: 'present' });
  });
});

describe('versions — written when the claim changes, never rewriting the one before', () => {
  it('the first homework adds a version a claim; the same homework again adds nothing; two devices name them the same', () => {
    const first = run(recurring(NOW), [], NOW);
    expect(first.map(e => e.claim).sort()).toEqual(['changed:line', 'recurs:stops:bagger|jam', 'where:line']);
    expect(first.every(e => e.kind === 'finding' && e.known === 'counted' && !e.supersedes && e.client === 'Branston')).toBe(true);
    expect(run(recurring(NOW), first, NOW + 3_600_000)).toEqual([]);
    expect(run(recurring(NOW), [], NOW).map(e => e.id)).toEqual(first.map(e => e.id));
  });
  it('a pattern that stops recurring lapses — a new version naming the one before, which stays', () => {
    const first = run(recurring(NOW), [], NOW);
    const later = NOW + 20 * DAY;
    const quiet = [stop(later, 2, 9, 'Wrapper', 'Film')];
    const second = run(quiet, first, later);
    const lapse = second.find(e => e.claim === 'recurs:stops:bagger|jam')!;
    expect(lapse.says).toBe('No longer the case: it has not come back three times in the last 14 days.');
    expect(lapse.supersedes).toBe(first.find(e => e.claim === 'recurs:stops:bagger|jam')!.id);
    const all = [...first, ...second];
    expect(versionsOf(all, 'recurs:stops:bagger|jam')).toHaveLength(2);
    expect(currentOf(all, 'recurs:stops:bagger|jam')!.id).toBe(lapse.id);
    // and it comes back: a third version, superseding the lapse; all three kept
    const again = later + 30 * DAY;
    const third = run(recurring(again), all, again).find(e => e.claim === 'recurs:stops:bagger|jam')!;
    expect(third.supersedes).toBe(lapse.id);
    expect(storyOf([...all, third], 'recurs:stops:bagger|jam', ms => new Date(ms).toISOString().slice(0, 10))).toEqual([
      `2026-11-12: ${first.find(e => e.claim === 'recurs:stops:bagger|jam')!.says} (later superseded)`,
      '2026-12-02: No longer the case: it has not come back three times in the last 14 days. (later superseded)',
      `2027-01-01: ${third.says}`,
    ]);
  });
  it('a change that turns round is a new version; the old one is kept and said superseded', () => {
    const more = [...Array.from({ length: 7 }, (_, i) => stop(NOW, i % 6 + 0.5, 2, 'Bagger', 'Jam')), stop(NOW, 10, 2, 'Bagger', 'Jam'), stop(NOW, 15, 2, 'Bagger', 'Jam'), stop(NOW, 25, 2, 'Bagger', 'Jam')];
    const first = run(more, [], NOW);
    const v1 = first.find(e => e.claim === 'changed:line')!;
    expect((v1.body as { signature: string }).signature).toBe('more');
    const later = NOW + 28 * DAY;
    const fewer = [...Array.from({ length: 12 }, (_, i) => stop(later, 8 + i * 1.5, 2, 'Bagger', 'Jam'))];
    const v2 = run(fewer, first, later).find(e => e.claim === 'changed:line')!;
    expect(v2.supersedes).toBe(v1.id);
    expect(standingOf(v1, [...first, v2]).state).toBe('superseded');
    expect(v1.says).toMatch(/more stops/);   // what it said then is still what it says
  });
});

describe('standing — evidence outranks opinion', () => {
  const f: Entry = { id: 'f1', workspaceId: 'L1', kind: 'finding', known: 'counted', subject: 'stops:bagger|jam', claim: 'recurs:stops:bagger|jam', says: 'Jam recurs', body: { signature: 'present' }, source: 'brain-b2', at: 1, updatedAt: 1 };
  const r = (id: string, known: string, stance: 'supports' | 'contradicts', by = 'Dave'): Entry => ({ id, workspaceId: 'L1', kind: 'review', known, subject: f.subject, about: 'f1', stance, says: '', body: {}, by, source: 'person', at: 2, updatedAt: 2 });
  it('nobody has said more: found', () => expect(standingOf(f, [f]).word).toBe('Found — nobody has said more yet'));
  it('a manager disputing it is a person disputing — not proven', () => expect(standingOf(f, [f, r('a', 'reported', 'contradicts')]).state).toBe('disputed'));
  it('a person agreeing and another disputing: people differ', () => expect(standingOf(f, [f, r('a', 'reported', 'contradicts'), r('b', 'observed', 'supports', 'Ann')]).state).toBe('mixed'));
  it('a measured result against it outranks a person agreeing', () => expect(standingOf(f, [f, r('a', 'measured', 'contradicts'), r('b', 'observed', 'supports')]).state).toBe('contradicted'));
  it('counted evidence both ways is said as both, never averaged', () => expect(standingOf(f, [f, r('a', 'counted', 'contradicts'), r('b', 'measured', 'supports')]).state).toBe('both'));
});
