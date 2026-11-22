/* THE ANALYSIS EXAM'S ANSWER KEY (22 November 2026, docs/LUNA-ANALYSIS.md §3). The exam marks the REAL Luna against figures worked
 * by plain loops over the rows the workbook was written from. Two things have to be true of that key before a mark means anything:
 *   1  the app's own question engine, asked as Luna would ask it — a share, a rate, a weekday, the top two of each line, the days
 *      over a limit, the change on the month before, each in ONE question — gives the same figures (so a wrong mark is hers);
 *   2  each turn's marks pass a careful answer and fail a sloppy one for the right reason. */
import { describe, expect, it, beforeAll } from 'vitest';
import { ANALYSIS_TURNS, DAY_LIMIT, analysisTruth } from '../analysis';
import { BOOK_SHEET, LINES, examWorkbook } from '../workbookBook';
import type { TurnSeen } from '../investigation';
import type { Used } from '../../conversation';
import { readWorkbook, type WorkbookProfile } from '../../../lib/workbook/read';
import { runQuery } from '../../../lib/workbook/query';
import { MemoryStore } from '../../../lib/workbook/store';

const T = analysisTruth();
const step = (name: string): Used => ({ callId: name, name, title: name, kind: 'read', status: 'done', says: '', refs: [], at: 0 } as Used);
const seen = (reply: string, steps: Used[] = [step('query_workbook')], unsure: string[] = []): TurnSeen => ({ reply, steps, unsure, ok: true, lineA: '', lineB: '', ids: {} });
const turn = (id: string) => { const t = ANALYSIS_TURNS.find(x => x.id === id); if (!t) throw new Error(id); return t; };
const failing = (id: string, s: TurnSeen) => turn(id).marks(s).filter(x => !x.pass).map(x => x.what);
const pc = (f: number) => `${(f * 100).toFixed(1)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-GB');

describe('the key is a fair one', () => {
  it('the shares add to the whole; some days are over the limit and some are not; the two months are whole', () => {
    expect(LINES.reduce((s, l) => s + T.downShareByLine[l], 0)).toBeCloseTo(1, 10);
    expect(T.daysOver).toBeGreaterThan(0);
    expect(T.daysOver).toBeLessThan(T.days);
    expect(T.august).toBeGreaterThan(0);
    expect(T.september).toBeGreaterThan(0);
    for (const l of LINES) expect(T.reasonsByLine[l].length).toBeGreaterThanOrEqual(3);
  });
});

describe('the app’s engine, asked each in ONE question, gives the key’s figures', () => {
  let p: WorkbookProfile; const store = new MemoryStore();
  beforeAll(async () => {
    const b = examWorkbook();
    p = await readWorkbook({ size: b.bytes.length, read: async (s, e) => b.bytes.subarray(s, e) }, store, { id: 'exam', name: b.name });
  });
  const by = (r: { groups: { key: string[]; values: (number | string | null)[] }[] }, at: number) => Object.fromEntries(r.groups.map(g => [g.key.join(' · '), g.values[at] as number]));

  it('each line’s share of the downtime — derive share', async () => {
    const r = await runQuery(store, p, { sheet: BOOK_SHEET, groupBy: ['Line'], measures: [{ op: 'sum', column: 'Downtime (min)' }], derive: [{ as: 'share', op: 'share', a: 0 }] });
    for (const l of LINES) expect(by(r, 1)[l]).toBeCloseTo(T.downShareByLine[l], 5);
    expect(r.totals[0]).toBe(T.down);
  });
  it('packs against target by line — derive ratio, from the two totals', async () => {
    const r = await runQuery(store, p, { sheet: BOOK_SHEET, groupBy: ['Line'], measures: [{ op: 'sum', column: 'Packs' }, { op: 'sum', column: 'Target' }], derive: [{ as: 'against target', op: 'ratio', a: 0, b: 1 }] });
    for (const l of LINES) expect(by(r, 2)[l]).toBeCloseTo(T.attainByLine[l], 5);
  });
  it('downtime by the day of the week — a part of the date', async () => {
    const r = await runQuery(store, p, { sheet: BOOK_SHEET, parts: [{ as: 'weekday', column: 'Date', part: 'weekday' }], groupBy: ['weekday'], measures: [{ op: 'sum', column: 'Downtime (min)' }] });
    expect(by(r, 0)).toEqual(T.downByWeekday);
    expect(r.groups[0].key[0]).toBe(T.worstWeekday.day);
    expect(r.groups[0].values[0]).toBe(T.worstWeekday.minutes);
  });
  it('the top two reasons written on each line — top within a group', async () => {
    const r = await runQuery(store, p, { sheet: BOOK_SHEET, filters: [{ column: 'Downtime reason', op: 'notblank' }], groupBy: ['Line', 'Downtime reason'], measures: [{ op: 'sum', column: 'Downtime (min)' }], top: { n: 2 } });
    for (const l of LINES) {
      const mine = r.groups.filter(g => g.key[0] === l);
      expect(mine.slice(0, 2).map(g => [g.key[1], g.values[0]])).toEqual(T.reasonsByLine[l].slice(0, 2));
      /* …and the line still adds back to its whole: its two and its others are every minute with a reason written */
      expect(mine.reduce((s, g) => s + (g.values[0] as number), 0)).toBe(T.reasonsByLine[l].reduce((s, x) => s + x[1], 0));
    }
  });
  it('the days over the limit — a condition on each day’s total', async () => {
    const r = await runQuery(store, p, { sheet: BOOK_SHEET, time: { column: 'Date', by: 'day' }, measures: [{ op: 'sum', column: 'Downtime (min)' }], having: [{ of: 0, op: 'gt', value: DAY_LIMIT }], limit: 5 });
    expect(r.groupsTotal).toBe(T.days);
    expect(r.notes.join(' ')).toContain(`are shown: ${T.daysOver} of ${T.days}.`);
  });
  it('September on August — derive change and pct_change along the months', async () => {
    const r = await runQuery(store, p, { sheet: BOOK_SHEET, time: { column: 'Date', by: 'month' }, measures: [{ op: 'sum', column: 'Packs' }], derive: [{ as: 'change', op: 'change', a: 0 }, { as: 'pct', op: 'pct_change', a: 0 }] });
    const sep = r.groups.find(g => g.key[0] === '2026-09');
    expect(sep?.values[0]).toBe(T.september);
    expect(sep?.values[1]).toBe(T.change);
    expect(sep?.values[2] as number).toBeCloseTo(T.pctChange, 5);
  });
});

describe('each turn passes a careful answer and fails a sloppy one', () => {
  it('a share for each line — and a sum a line is marked', () => {
    const good = LINES.map(l => `${l} ${pc(T.downShareByLine[l])}`).join(', ');
    expect(failing('share', seen(`Of the ${n0(T.down)} minutes: ${good}.`))).toEqual([]);
    expect(failing('share', seen(`${good}.`, [step('query_workbook'), step('work_out'), step('work_out'), step('work_out')]))).toEqual(['Asked in the question itself — no sum a group']);
    expect(failing('share', seen('Line 1 about a quarter, Line 2 about 40%, Line 3 the rest.'))).toContain('Line 1’s share of the downtime');
  });
  it('a rate from the two totals', () => {
    expect(failing('rate', seen(LINES.map(l => `${l} made ${pc(T.attainByLine[l])} of its target`).join('; ')))).toEqual([]);
    expect(failing('rate', seen('All three were at 100% of target.'))).toHaveLength(3);
  });
  it('the day of the week', () => {
    expect(failing('weekday', seen(`${T.worstWeekday.day}s cost the most: ${n0(T.worstWeekday.minutes)} minutes.`))).toEqual([]);
    const other = Object.keys(T.downByWeekday).find(d => d !== T.worstWeekday.day) ?? '';
    expect(failing('weekday', seen(`${other} is the worst day, at ${n0(T.downByWeekday[other])} minutes.`))).toEqual(['Named the day', 'Its minutes']);
  });
  it('the top two of each line — every line there', () => {
    const good = LINES.map(l => `${l}: ${T.reasonsByLine[l].slice(0, 2).map(([r, v]) => `${r} ${n0(v)} min`).join(', ')}`).join('. ');
    expect(failing('top-each', seen(good))).toEqual([]);
    /* the fifty biggest pairs overall, with a line missing */
    const cut = LINES.slice(0, 2).map(l => `${l}: ${T.reasonsByLine[l].slice(0, 2).map(([r, v]) => `${r} ${n0(v)} min`).join(', ')}`).join('. ');
    expect(failing('top-each', seen(cut))).toContain('Every line is there');
  });
  it('how many days met the condition', () => {
    expect(failing('condition', seen(`${T.daysOver} of the ${T.days} days lost more than ${DAY_LIMIT} minutes.`))).toEqual([]);
    expect(failing('condition', seen(`About ${T.daysOver + 3} days.`))).toEqual(['The number of days']);
  });
  it('a change on the month before, with its direction — and a figure with nothing behind it is marked', () => {
    const way = T.change >= 0 ? 'up' : 'down';
    const good = `September was ${way} ${n0(Math.abs(T.change))} packs on August — ${pc(Math.abs(T.pctChange))}.`;
    expect(failing('change', seen(good))).toEqual([]);
    expect(failing('change', seen(good, [step('query_workbook')], ['12.5%']))).toEqual(['No figure without something behind it']);
  });
});
