/* A card's actions and a line's own cards (docs/AREAS.md A3), by hand: the problems a record holds said as its actions; nothing when it
 * holds none; late the only red; a line's open problems and its tests that did not pass as cards, none when there is nothing. */
import { describe, expect, it } from 'vitest';
import { cardActions, failedCard, failedPrograms, problemsCard } from '../cardActions';
import type { Program } from '../programs';
import type { Test } from '../testing';
import type { Snag } from '../../snag/types';
import type { ProgramsReading } from '../programsReport';

const DAY = 86_400_000;
const NOW = new Date('2026-11-15T12:00:00').getTime();
const snag = (id: string, o: Partial<Snag>): Snag => ({ id, problem: id, status: 'open', priority: 'low', raisedAt: NOW - 10 * DAY, updatedAt: NOW, media: [], ...o } as Snag);

describe('cardActions — the problems a record holds, as its actions', () => {
  it('says nothing for a record that holds none', () => {
    expect(cardActions([snag('a', {})], 'S1', NOW)).toBeUndefined();
  });
  it('counts open, late and done among the problems held by the record, raised or linked', () => {
    const snags = [
      snag('a', { tools: [{ studyId: 'S1', raised: true }], dueAt: NOW - 3 * DAY }),       // open, 3 days late
      snag('b', { tools: [{ studyId: 'S1', part: 'w02' }] }),                               // open, no day
      snag('c', { tools: [{ studyId: 'S1' }], status: 'closed' }),                          // done
      snag('d', { tools: [{ studyId: 'S2' }] }),                                            // another record's
      snag('e', { tools: [{ studyId: 'S1' }], deletedAt: NOW }),                            // deleted — not counted
    ];
    expect(cardActions(snags, 'S1', NOW)).toEqual({ text: '2 actions open · 1 late · 1 done', tone: 'r', open: 2, late: 1, done: 1 });
  });
  it('says the done quietly when every action is done', () => {
    expect(cardActions([snag('c', { tools: [{ studyId: 'S1' }], status: 'closed' })], 'S1', NOW)).toEqual({ text: '1 action, done', tone: 'g', open: 0, late: 0, done: 1 });
  });
  it('is not red when nothing is late', () => {
    expect(cardActions([snag('a', { tools: [{ studyId: 'S1' }], dueAt: NOW + 2 * DAY })], 'S1', NOW)?.tone).toBe('n');
  });
});

describe('a line’s own cards', () => {
  it('its problems — none when nothing is open; red only when one is late or critical', () => {
    expect(problemsCard({ open: 0, late: 0, critical: 0 })).toBeUndefined();
    expect(problemsCard({ open: 3, late: 0, critical: 0, worst: 'Film breaks' })).toEqual({ key: 'problems', tool: 'Problems', name: '3 problems open', says: 'Film breaks', tone: 'a' });
    expect(problemsCard({ open: 2, late: 1, critical: 1, worst: 'Seal leaks' })).toEqual({ key: 'problems', tool: 'Problems', name: '2 problems open · 1 critical · 1 late', says: 'Seal leaks', tone: 'r' });
  });
  it('its tests that did not pass — a program not proved whose latest test failed, the first by name', () => {
    const prog = (id: string, what: string, o: Partial<Program> = {}) => ({ id, projectId: '', what, state: 'onMachine', ...o }) as Program;
    const test = (id: string, programId: string, outcome: Test['outcome'], o: Partial<Test> = {}) => ({ id, projectId: '', title: id, programId, outcome, sort: 1, createdAt: 1, updatedAt: 1, ...o }) as Test;
    const programs = [prog('p1', 'PR-04'), prog('p2', 'PR-07'), prog('p3', 'PR-09', { provedOn: '2026-11-10' }), prog('p4', 'PR-12')];
    const tests = [
      test('t1', 'p1', 'failed'),                                // failed
      test('t2', 'p2', 'failed'), test('t3', 'p2', 'passed', { fromTestId: 't2' }), // failed, then a re-test passed — not failed
      test('t4', 'p3', 'failed'),                                // proved since — not counted
      test('t5', 'p4', 'planned'),                               // not run yet
    ];
    const reading = { lines: [{ programId: 'p1', machine: 'Bagger', bucket: 'open' }] } as unknown as ProgramsReading;
    expect(failedPrograms(programs, tests, reading)).toEqual([{ what: 'PR-04', machine: 'Bagger' }]);
    expect(failedCard([])).toBeUndefined();
    expect(failedCard([{ what: 'PR-04', machine: 'Bagger' }, { what: 'PR-07' }])).toEqual({ key: 'failed', tool: 'Tests that didn’t pass', name: '2 programs', says: 'PR-04 on the Bagger and 1 more', tone: 'r' });
  });
});
