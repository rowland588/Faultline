/* 3P actions are next steps: the board reads them in the tracker's shape. */
import { describe, it, expect } from 'vitest';
import { stepAction, isLate, WHOLE_PROJECT } from '../actions';
import { statusOfAction } from '../treeBind';
import { pillarOf } from '../pillars';
import { actionsForBind, trackerLines } from '../treeBind';
import type { PaceLineRow, PaceTodoRow } from '../../db';

const T = '2026-10-01';
const lines = [{ id: 'l2', key: '2A', name: 'Line 2A' } as PaceLineRow];
const step = (o: Partial<PaceTodoRow>): PaceTodoRow => ({
  id: 's', projectId: 'p', what: 'Train the night shift', where: '', why: '', who: 'Rob', when: '',
  state: 'todo', createdAt: 1, updatedAt: 1, ...o,
});

describe('a next step on the 3P board', () => {
  it('is late only when not done and its day has gone', () => {
    expect(isLate(step({ due: '2026-09-29' }), T)).toBe(true);
    expect(isLate(step({ due: '2026-09-29', state: 'done' }), T)).toBe(false);
    expect(isLate(step({ due: '2026-10-05' }), T)).toBe(false);
    expect(isLate(step({}), T)).toBe(false);
  });
  it('reads red when late, not grey', () => {
    expect(statusOfAction(stepAction(step({ due: '2026-09-29' }), lines, T))).toBe('r');
    expect(statusOfAction(stepAction(step({ due: '2026-10-09' }), lines, T))).toBe('n');
    expect(statusOfAction(stepAction(step({ state: 'waiting' }), lines, T))).toBe('a');
    expect(statusOfAction(stepAction(step({ state: 'done' }), lines, T))).toBe('g');
  });
  it('carries its column, its line by id, and its id as the way back to the row', () => {
    const a = stepAction(step({ pillar: 'plant', lineId: 'l2' }), lines, T);
    expect(pillarOf(a)).toBe('plant');
    expect(a.line).toBe('Line 2A');
    expect(a.lineId).toBe('l2');
    expect(a.uid).toBe('s');
    expect(stepAction(step({}), lines, T).line).toBe(WHOLE_PROJECT);
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
});
