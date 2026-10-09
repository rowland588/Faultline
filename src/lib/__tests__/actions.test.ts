/* The 6M board's actions are next steps: the board reads them in the tracker's
 * shape, on the six bones, with the old 3P words read across. */
import { describe, it, expect } from 'vitest';
import { stepAction, isLate, isDueSoon, parseCauseRef, WHOLE_PROJECT } from '../actions';
import { statusOfAction } from '../treeBind';
import { board, boardName, lanes, meetingOrder, openByBone, pillarOf, PILLARS } from '../pillars';
import { toSixM } from '../sixm';
import { actionsForBind, trackerLines } from '../treeBind';
import { buildRoster } from '../../screens/PaceMeeting';
import type { PaceLineRow, PaceTodoRow } from '../../db';

const T = '2026-10-01';
const lines = [{ id: 'l2', key: '2A', name: 'Line 2A' } as PaceLineRow];
const step = (o: Partial<PaceTodoRow>): PaceTodoRow => ({
  id: 's', projectId: 'p', what: 'Train the night shift', where: '', why: '', who: 'Rob', when: '',
  state: 'todo', createdAt: 1, updatedAt: 1, ...o,
});

describe('an action on the 6M board', () => {
  it('is late only when not done and its day has gone', () => {
    expect(isLate(step({ due: '2026-09-29' }), T)).toBe(true);
    expect(isLate(step({ due: '2026-09-29', state: 'done' }), T)).toBe(false);
    expect(isLate(step({ due: '2026-10-05' }), T)).toBe(false);
    expect(isLate(step({}), T)).toBe(false);
  });
  it('reads red when late, not grey', () => {
    expect(statusOfAction(stepAction(step({ due: '2026-09-29' }), lines, T))).toBe('r');
    // A day booked is still ahead (indigo); no day at all is not started (grey).
    expect(statusOfAction(stepAction(step({ due: '2026-10-09' }), lines, T))).toBe('w');
    expect(statusOfAction(stepAction(step({}), lines, T))).toBe('n');
    expect(statusOfAction(stepAction(step({ state: 'waiting' }), lines, T))).toBe('a');
    expect(statusOfAction(stepAction(step({ state: 'done' }), lines, T))).toBe('g');
  });
  it('carries its bone, its line by id, its id as the way back to the row, its cause and its prediction', () => {
    const a = stepAction(step({ pillar: 'measurement', lineId: 'l2', causeRef: 'case1:c9', expect: ' rejects 3% → 1% ' }), lines, T);
    expect(pillarOf(a)).toBe('measurement');
    expect(a.pillar).toBe('Measurement');
    expect(a.category).toBe('Measurement');
    expect(a.line).toBe('Line 2A');
    expect(a.lineId).toBe('l2');
    expect(a.uid).toBe('s');
    expect(a.causeRef).toBe('case1:c9');
    expect(a.expect).toBe('rejects 3% → 1%');
    expect(stepAction(step({ state: 'done', doneOn: '2026-09-20' }), lines, T).doneOn).toBe('2026-09-20');
    expect(stepAction(step({}), lines, T).line).toBe(WHOLE_PROJECT);
  });
});

describe('the old 3P words, read across to the six', () => {
  it('Plant is Machine, Process is Method, People stays People', () => {
    expect(toSixM('plant')).toBe('machine');
    expect(toSixM('Process')).toBe('method');
    expect(toSixM('people')).toBe('people');
    expect(toSixM('environment')).toBe('environment');
  });
  it('a stored old word lands in the new lane — never dropped, never guessed', () => {
    expect(pillarOf(stepAction(step({ pillar: 'plant' }), lines, T))).toBe('machine');
    expect(pillarOf(stepAction(step({ pillar: 'process' }), lines, T))).toBe('method');
    expect(pillarOf(stepAction(step({}), lines, T))).toBeNull();
    expect(pillarOf({ pillar: 'banana' })).toBeNull();
  });
});

describe('due soon', () => {
  it('is within three days, not done, not late', () => {
    expect(isDueSoon(step({ due: '2026-10-01' }), T)).toBe(true);    // today
    expect(isDueSoon(step({ due: '2026-10-04' }), T)).toBe(true);    // three days on
    expect(isDueSoon(step({ due: '2026-10-05' }), T)).toBe(false);
    expect(isDueSoon(step({ due: '2026-09-30' }), T)).toBe(false);   // that is late
    expect(isDueSoon(step({ due: '2026-10-02', state: 'done' }), T)).toBe(false);
  });
  it('is flagged on the action, so the meeting can count it', () => {
    expect(stepAction(step({ due: '2026-10-03' }), lines, T).flag).toBe('Due soon');
    expect(stepAction(step({ due: '2026-09-20' }), lines, T).flag).toBe('Late');
    expect(stepAction(step({ due: '2026-10-20' }), lines, T).flag).toBe('');
    const roster = buildRoster([stepAction(step({ id: 'a', due: '2026-10-02' }), lines, T), stepAction(step({ id: 'b', due: '2026-10-30' }), lines, T)]);
    expect(roster.find(p => p.name === 'Rob')?.dueSoon).toBe(1);
  });
  it('does not turn the card amber or red by itself — it is still ahead', () => {
    expect(statusOfAction(stepAction(step({ due: '2026-10-02' }), lines, T))).toBe('w');  // still ahead is indigo (a day booked), never amber or red by itself
  });
});

describe('the board on six bones', () => {
  const acts = [
    step({ id: 'm1', pillar: 'plant', lineId: 'l2', due: '2026-10-20' }),
    step({ id: 'm2', pillar: 'machine', lineId: 'l2', due: '2026-10-10' }),
    step({ id: 'p1', pillar: 'people', lineId: 'l2' }),
    step({ id: 'e1', pillar: 'environment' }),
    step({ id: 'x', pillar: undefined, lineId: 'l2' }),
  ].map(s => stepAction(s, lines, T));
  const b = board(acts);

  it('gives every line all six lanes, in the fishbone’s order', () => {
    expect(PILLARS.map(p => p.label)).toEqual(['People', 'Machine', 'Method', 'Material', 'Measurement', 'Environment']);
    for (const a of b.areas) expect(a.columns.map(c => c.key)).toEqual(['people', 'machine', 'method', 'material', 'measurement', 'environment']);
  });
  it('puts each action in its lane — the old Plant beside the new Machine — and keeps the unsorted out, not lost', () => {
    const l2 = b.areas.find(a => a.name === 'Line 2A')!;
    expect(l2.columns.find(c => c.key === 'machine')?.rows.map(r => r.uid)).toEqual(['m2', 'm1']);   // soonest due first
    expect(l2.columns.find(c => c.key === 'people')?.rows.map(r => r.uid)).toEqual(['p1']);
    expect(b.areas.find(a => a.name === WHOLE_PROJECT)?.columns.find(c => c.key === 'environment')?.rows).toHaveLength(1);
    expect(b.unplaced.map(r => r.uid)).toEqual(['x']);
    expect(b.total).toBe(4);
  });
  it('sorts a lane overdue first, then by the day it is due — not by a priority every action shares', () => {
    const late = stepAction(step({ id: 'late', pillar: 'method', due: '2026-09-01' }), lines, T);
    const soon = stepAction(step({ id: 'soon', pillar: 'method', due: '2026-10-02' }), lines, T);
    const later = stepAction(step({ id: 'later', pillar: 'method', due: '2026-11-02' }), lines, T);
    expect([later, soon, late].sort(meetingOrder).map(a => a.uid)).toEqual(['late', 'soon', 'later']);
    expect(lanes([later, soon]).find(c => c.key === 'method')?.rows.map(a => a.uid)).toEqual(['soon', 'later']);
  });
  it('counts what is open on each bone, only the bones that have any', () => {
    expect(openByBone([
      { pillar: 'plant', open: true, late: true }, { pillar: 'machine', open: true },
      { pillar: 'process', open: false }, { pillar: 'people', open: true },
    ])).toEqual([
      { key: 'people', label: 'People', open: 1, late: 0 },
      { key: 'machine', label: 'Machine', open: 2, late: 1 },
    ]);
  });
  it('is the 6M Board — or just the Board on a lever tree', () => {
    expect(boardName('6M')).toBe('6M Board');
    expect(boardName('Lever tree')).toBe('Board');
  });
});

describe('a cause link', () => {
  it('reads "<caseId>:<causeId>" and nothing else', () => {
    expect(parseCauseRef('c1:k2')).toEqual({ caseId: 'c1', causeId: 'k2' });
    expect(parseCauseRef('c1:k2:x')).toEqual({ caseId: 'c1', causeId: 'k2:x' });
    expect(parseCauseRef('c1')).toBeNull();
    expect(parseCauseRef(':k2')).toBeNull();
    expect(parseCauseRef('c1:')).toBeNull();
    expect(parseCauseRef(undefined)).toBeNull();
  });
});

describe('on the lever tree, every line is its own branch', () => {
  const two = [{ id: 'a', key: '2A', name: 'Line 2A' }, { id: 'b', key: '2B', name: 'Line 2B' }] as PaceLineRow[];
  const onA = stepAction(step({ id: 'x', lineId: 'a', pillar: 'plant' }), two, T);
  const onB = stepAction(step({ id: 'y', lineId: 'b', pillar: 'plant' }), two, T);
  const every = stepAction(step({ id: 'z', pillar: 'process' }), two, T);
  it('2A and 2B are two lines, not one "Line 2"', () => {
    expect(trackerLines(two).map(l => l.label)).toEqual(['Line 2A', 'Line 2B']);
  });
  it('a box linked to 2A collects 2A’s actions only', () => {
    expect(actionsForBind([onA, onB, every], { line: '2A' }).map(a => a.uid)).toEqual(['x']);
    expect(actionsForBind([onA, onB, every], { allLines: true }).map(a => a.uid)).toEqual(['z']);
  });
  it('a box bound to "Plant" before the six still collects its actions, now on Machine', () => {
    const newer = stepAction(step({ id: 'w', lineId: 'a', pillar: 'machine' }), two, T);
    expect(actionsForBind([onA, onB, every, newer], { line: '2A', categories: ['Plant'] }).map(a => a.uid)).toEqual(['x', 'w']);
    expect(actionsForBind([onA, onB, every], { allLines: true, categories: ['Process'] }).map(a => a.uid)).toEqual(['z']);
    expect(actionsForBind([onA, onB, every], { line: '2A', categories: ['Method'] })).toEqual([]);
  });
});
