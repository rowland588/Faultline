/* THE STAGE GATE'S PAGES AS LEAN PAGES (lib/stageGatePages) — each page's
 * tiles and closing line, from the counts its header said, with the job's
 * money last (lib/stageGateLean moneyTile). */
import { describe, expect, it } from 'vitest';
import { commissionClosing, commissionTiles, gateClosing, gateTiles, handoverClosing, handoverTiles, machineClosing, machineTiles, materialClosing, planClosing, planCounts, planTiles, materialTiles, problemClosing, problemTiles, programClosing, programTiles } from '../stageGatePages';
import type { LeanTile } from '../lean';

const slip: LeanTile = { k: 'The slip costs', v: '£25.2k', of: '8 days × £3.2k — a day of Line 7 not making, in margin', tone: 'r' };
const aDay: LeanTile = { k: 'A day late', v: '£3.2k', of: 'would cost a day of Line 7 not making, in margin' };

describe('a gate of steps', () => {
  it('Install: 4 of 6 done, 1 late, a stage stopped by a problem, 2 not added and a machine with none — the slip last', () => {
    const x = { gate: 'install' as const, done: 4, total: 6, late: 1, problems: 1, notAdded: 2, bare: 1 };
    expect(gateTiles(x, slip).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Done', '4', 'of 6 steps', undefined],
      ['Late', '1', 'past their day', 'r'],
      ['Problems', '1', 'stopping a stage', 'r'],
      ['Not added yet', '3', '2 stages not on a machine\'s list · 1 machine with none yet', 'a'],
      ['The slip costs', '£25.2k', slip.of, 'r'],
    ]);
    expect(gateClosing(x, slip)).toEqual({ text: 'Install: 4 of 6 steps done — 1 late, 1 stopped by a problem and 3 not added yet. The slip costs £25.2k.', tone: 'r' });
  });
  it('Hand over all done in green, and a day late is not said where it closes', () => {
    const x = { gate: 'handover' as const, done: 3, total: 3, late: 0, problems: 0, notAdded: 0, bare: 0 };
    expect(gateTiles(x, aDay)[0]).toEqual({ k: 'Done', v: '3', of: 'of 3 items', tone: 'g' });
    expect(gateClosing(x, aDay)).toEqual({ text: 'Hand over: 3 of 3 items done — the gate is through.', tone: 'g' });
    expect(gateClosing({ ...x, done: 0, total: 0 }, aDay).text).toBe('Hand over: nothing planned yet — give each machine its hand-over items.');
  });
});

describe('Commission', () => {
  it('3 of 8 passed, 1 didn’t pass, 1 didn’t run, 3 still to run', () => {
    const x = { passed: 3, total: 8, failed: 1, notRun: 1 };
    expect(commissionTiles(x, slip).map(t => [t.k, t.v, t.of])).toEqual([
      ['Passed', '3', 'of 8 tests'], ['Didn’t pass', '1', 'ran and fell short'], ['Didn’t run', '1', 'booked, did not happen'], ['Still to run', '3', 'tests planned'], ['The slip costs', '£25.2k', slip.of],
    ]);
    expect(commissionClosing(x, slip)).toEqual({ text: 'Commission: 3 of 8 tests passed — 1 didn’t pass and 1 didn’t run. The slip costs £25.2k.', tone: 'r' });
  });
});

describe('Programs', () => {
  it('2 of 5 done, 1 failed, 2 to do with 1 late, 1 with no program', () => {
    const x = { total: 5, doneAll: 2, failed: 1, late: 1, open: 2, notTested: 0, noProgram: 1 };
    expect(programTiles(x, aDay).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Done', '2', 'of 5 programs — passed or at baseline', undefined], ['Failed', '1', 'tested and did not pass', 'r'],
      ['To do', '2', '1 past its test day', 'r'], ['Not ready', '1', '1 with no program', 'a'], ['A day late', '£3.2k', aDay.of, undefined],
    ]);
    expect(programClosing(x, aDay)).toEqual({ text: 'Programs: 2 of 5 done — 1 failed, 1 past its test day and 1 with no program.', tone: 'r' });
  });
});

describe('the job’s Problems', () => {
  it('7 open: 5 fixes to do, 2 with no fix, 1 late, a critical and a high risk', () => {
    const x = { open: 7, fixes: 5, noFix: 2, late: 1, done: 3, critical: 1, risks: 1 };
    expect(problemTiles(x, slip).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Open', '7', '5 fixes still to do · 2 with no fix yet', undefined], ['Critical', '1', '1 high risk as well', 'r'],
      ['Late', '1', 'fixes past their day', 'r'], ['No fix yet', '2', 'problems nobody is putting right yet', 'a'], ['The slip costs', '£25.2k', slip.of, 'r'],
    ]);
    expect(problemClosing(x, slip).text).toBe('Problems: 7 open — 1 critical, 1 fix late and 2 with no fix yet. The slip costs £25.2k.');
    expect(problemClosing({ ...x, open: 0, fixes: 0, noFix: 0, late: 0, critical: 0, risks: 0 }, slip)).toEqual({ text: 'Problems: nothing outstanding — 3 put right.', tone: 'g' });
  });
});

describe('Materials', () => {
  it('2 of 7 here, 2 late, 2 waiting next due 20 Oct, 1 with no date', () => {
    const x = { here: 2, total: 7, late: 2, waiting: 2, undated: 1, nextDue: '2026-10-20' };
    expect(materialTiles(x, aDay, () => '20 Oct').map(t => [t.k, t.v, t.of])).toEqual([
      ['Here', '2', 'of 7 needed'], ['Late', '2', 'past the day they were due'], ['Waiting', '2', 'next due 20 Oct'], ['No date', '1', 'nobody has said when'], ['A day late', '£3.2k', aDay.of],
    ]);
    expect(materialClosing(x, aDay)).toEqual({ text: 'Materials: 2 of 7 here — 2 late and 1 with no date.', tone: 'r' });
  });
});

describe('the handover report', () => {
  it('2 of 3 machines handed over, 4 still open — the slip last and in the closing line', () => {
    const x = { machines: 3, handed: 2, open: 4, handedOver: false };
    expect(handoverTiles(x, slip).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Handed over', '2', 'of 3 machines', undefined], ['Still open', '4', 'to close before hand-over — said below', 'a'], ['The slip costs', '£25.2k', slip.of, 'r'],
    ]);
    expect(handoverClosing(x, slip)).toEqual({ text: 'Hand over: 2 of 3 machines handed over — 4 still open. The slip costs £25.2k.', tone: 'a' });
    expect(handoverClosing({ machines: 3, handed: 3, open: 0, handedOver: true })).toEqual({ text: 'Hand over: 3 of 3 machines handed over — nothing left open.', tone: 'g' });
  });
});

describe('a machine’s own page', () => {
  it('1 of 4 gates through, 2 late, 3 fixes with 1 late, a critical problem with no fix — the slip last and where it closes', () => {
    const x = { name: 'Ilapak flow wrapper', at: 'at Set up', gatesDone: 1, gates: 4, late: 2, fixes: 3, fixesLate: 1, fixesDone: 2, noFix: 1, critical: 1 };
    expect(machineTiles(x, slip).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Gates through', '1', 'of 4 — at Set up', undefined],
      ['Late', '2', 'stages and tests past their day or not passed', 'r'],
      ['Fixes open', '3', '1 late · 2 done', 'r'],
      ['No fix yet', '1', '1 critical — problems nobody is putting right yet', 'r'],
      ['The slip costs', '£25.2k', slip.of, 'r'],
    ]);
    expect(machineClosing(x, slip)).toEqual({ text: 'Ilapak flow wrapper: at Set up — 2 late, 1 fix late and 1 problem with no fix yet. The slip costs £25.2k.', tone: 'r' });
  });
  it('handed over with nothing open, in green; a day late not said where it closes', () => {
    const x = { name: 'Domino coder', at: 'Handed over', gatesDone: 4, gates: 4, late: 0, fixes: 0, fixesLate: 0, fixesDone: 1, noFix: 0, critical: 0 };
    expect(machineTiles(x, aDay)[0]).toEqual({ k: 'Gates through', v: '4', of: 'of 4 — Handed over', tone: 'g' });
    expect(machineTiles(x, aDay)[2].of).toBe('none open · 1 done');
    expect(machineClosing(x, aDay)).toEqual({ text: 'Domino coder: Handed over — every gate through.', tone: 'g' });
  });
});

describe('the plan’s timeline', () => {
  it('29 dates: 11 done, 4 late, 9 ahead, 1 waiting on a verdict — counted as the plan’s sentence counts them', () => {
    const marks = [...Array(11)].map(() => ({ tone: 'done', at: '2026-10-01' })).concat([...Array(4)].map(() => ({ tone: 'late', at: '2026-10-10' })),
      [{ tone: 'ran', at: '2026-10-14' }], [...Array(9)].map(() => ({ tone: 'ahead', at: '2026-10-20' })), [...Array(4)].map(() => ({ tone: 'ahead', at: '2026-10-15' })));
    const x = planCounts(marks, '2026-10-15');
    expect(x).toEqual({ dates: 29, done: 11, late: 4, ahead: 9, ran: 1 });
    expect(planTiles(x, slip).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Done', '11', 'of 29 dates on the plan', undefined], ['Late', '4', 'past their day', 'r'], ['Still ahead', '9', 'booked on the calendar', undefined],
      ['Waiting on a verdict', '1', 'ran — not called yet', 'a'], ['The slip costs', '£25.2k', slip.of, 'r'],
    ]);
    expect(planClosing(x, slip, '1 test with nothing agreed to show')).toEqual({ text: 'The plan: 11 of 29 dates done — 4 late and 1 waiting on a verdict; not on it yet: 1 test with nothing agreed to show. The slip costs £25.2k.', tone: 'r' });
  });
  it('nothing dated says where to begin', () => {
    expect(planClosing(planCounts([], '2026-10-15'), aDay).text).toMatch(/^The plan: nothing dated yet/);
  });
});
