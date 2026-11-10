/* THE ENGINE EXAM (docs/LUNA-NEXT.md L6), run in every gate: the exam's questions on seeded records, their answers worked out by the
 * exam's own loops and checked here against figures worked by hand — Line 2, the newest stop 6 November, so the week
 * is 31 October – 6 November and the week before 24–30 October: before Jam 10 (27 Oct), Film 12 (28), Label 3 (29) = 25; the week
 * Jam 10 + 5 + 20 = 35, Film 10, Label 3 = 48 → up 23, Jam the biggest at 35 (72.92%), Jam moved most (+25), 0.8 hours; two open
 * problems. Then each question answered by the capabilities a right answer needs — every one passes the grader — and wrong answers
 * fail it for the right reason. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../../../capabilities/types';
import { checkFigures } from '../../figureCheck';

vi.setConfig({ testTimeout: 60_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const at = (d: number, m = 10) => Date.UTC(2026, m, d, 8);

async function seed() {
  const db = await import('../../../db'); const reg = await import('../../../capabilities/registry'); const lines = await import('../../../lib/lines'); const bank = await import('../bank');
  const w = await lines.addLineToFactory('Line 2');
  const t = Date.now();
  await db.putStudy({ id: 'conv', tool: 'talk', name: 'Exam', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  const add = (when: number, category: string, asset: string, min: number) => db.addObservation({ id: Math.random().toString(36).slice(2), workspaceId: w.id, category, asset, startedAt: when, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: when, updatedAt: when } as never);
  await add(at(27, 9), 'Jam', 'Bagger', 10); await add(at(28, 9), 'Film', 'Wrapper', 12); await add(at(29, 9), 'Label', 'Bagger', 3);
  await add(at(3), 'Jam', 'Bagger', 10); await add(at(4), 'Jam', 'Bagger', 5); await add(at(5), 'Jam', 'Bagger', 20); await add(at(4), 'Film', 'Wrapper', 10); await add(at(6), 'Label', 'Bagger', 3);
  const snag = (id: string, status: string) => ({ id, workspaceId: w.id, problem: `Problem ${id}`, status, priority: 'high', raisedAt: at(1), createdAt: at(1), updatedAt: at(1) });
  for (const s of [snag('p1', 'open'), snag('p2', 'in_progress'), snag('p3', 'closed')]) await db.addSnag(s as never);
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), conversationId: 'conv', me: 'Rowland', ...o });
  return { db, reg, bank, w, ctx };
}

describe('the exam\'s questions and their answers', () => {
  it('are worked out from the records as by hand', async () => {
    const { db, bank, w } = await seed();
    const exam = bank.buildExam(w, await db.listObservations(w.id), await db.listAllSnags());
    expect(exam?.from).toBe('2026-10-31');
    expect(exam?.to).toBe('2026-11-06');
    const by = Object.fromEntries((exam?.questions ?? []).map(q => [q.id, q]));
    expect(by.total.ask).toBe('How many minutes of stops were timed on Line 2 between 31 October and 6 November?');
    expect(by.total.figure).toBe(48);
    expect([by.top.figure, by.top.words]).toEqual([35, ['Jam']]);
    expect(by.share.figure).toBe(72.92);
    expect([by.change.figure, by.change.words]).toEqual([23, ['up']]);
    expect([by.where.figure, by.where.words]).toEqual([25, ['Jam']]);
    expect(by.hours.figure).toBe(0.8);
    expect(by.open.figure).toBe(2);
    expect(by.mechanical.kind).toBe('cannot');
    expect(exam?.questions).toHaveLength(8);
  });
});

describe('the capabilities can answer every question right', () => {
  it('each right answer, made of what the capabilities say, passes the grader', async () => {
    const { db, reg, bank, w, ctx } = await seed();
    const exam = bank.buildExam(w, await db.listObservations(w.id), await db.listAllSnags());
    const src = `stops:${w.id}`;
    const week = [{ column: 'day', op: 'between', from: '2026-10-31', to: '2026-11-06' }];
    const run = async (name: string, input: unknown) => { const r = await reg.runCall(ctx(), call(name, input), { confirmed: false }); expect(r.ok, `${name}: ${r.ok ? '' : r.why}`).toBe(true); return r.ok ? r : { says: '', data: undefined }; };
    const change = await run('explain_change', { source: src, title: 'Timed stop minutes', measure: { op: 'sum', column: 'minutes' }, date: 'day', before: { from: '2026-10-24', to: '2026-10-30' }, after: { from: '2026-10-31', to: '2026-11-06' } });
    const answers: Record<string, { says: string; data?: unknown }[]> = {
      total: [await run('query_data', { source: src, title: 'Timed stop minutes', filters: week, measures: [{ op: 'sum', column: 'minutes' }] })],
      top: [await run('query_data', { source: src, title: 'By category', filters: week, groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] })],
      share: [await run('work_out', { what: 'Jam’s share', expression: '35 / 48 * 100', unit: '%', places: 2 })],
      change: [change], where: [change],
      hours: [await run('work_out', { what: 'In hours', expression: '48 / 60', unit: 'hours', places: 1 })],
      open: [await run('query_data', { source: `problems:${w.id}`, title: 'Open problems', filters: [{ column: 'status', op: 'ne', value: 'closed' }], measures: [{ op: 'count' }] })],
      mechanical: [await run('query_data', { source: src, title: 'Mechanical by shift', groupBy: ['downtime class', 'shift'], measures: [{ op: 'sum', column: 'minutes' }] })],
    };
    /* a right answer: the person's words led by what the capability said — the direction said in words */
    const reply: Record<string, string> = {
      total: answers.total[0].says, top: answers.top[0].says, share: answers.share[0].says, change: `It went up. ${answers.change[0].says}`, where: answers.where[0].says,
      hours: answers.hours[0].says, open: answers.open[0].says, mechanical: answers.mechanical[0].says,
    };
    for (const q of exam?.questions ?? []) {
      const g = bank.grade(q, reply[q.id], checkFigures(reply[q.id], answers[q.id], [q.ask]));
      expect(g, q.id).toMatchObject({ pass: true });
    }
  });
});

describe('the grader', () => {
  it('fails a wrong figure, a missing word, an invented figure and a "cannot" that is not said', async () => {
    const { db, bank, w } = await seed();
    const exam = bank.buildExam(w, await db.listObservations(w.id), await db.listAllSnags());
    const by = Object.fromEntries((exam?.questions ?? []).map(q => [q.id, q]));
    expect(bank.grade(by.total, 'About 50 minutes.', { unsure: ['50'] })).toEqual({ id: 'total', pass: false, why: ['The right figure (48 minutes of timed stops between 31 October and 6 November.) is not in the answer.', 'A figure rests on nothing: 50.'] });
    expect(bank.grade(by.top, 'Film, 35 minutes.', { unsure: [] }).why).toEqual(['It does not say “Jam”.']);
    expect(bank.grade(by.share, 'Jam was 72.9% of it.', { unsure: [] }).pass).toBe(true);
    expect(bank.grade(by.share, 'Jam was 73.2% of it.', { unsure: [] }).pass).toBe(false);
    expect(bank.grade(by.mechanical, 'Mechanical downtime was 30 minutes on nights.', { unsure: ['30'] }).why).toEqual(['It does not say this cannot be answered from these records.', 'A figure rests on nothing: 30.']);
    expect(bank.grade(by.open, 'There are two open problems.', { unsure: [] }).pass).toBe(true);
    expect(bank.scoreSaid([{ id: 'a', pass: true, why: [] }, { id: 'b', pass: false, why: ['x'] }])).toBe('1 of 2 right');
  });
});
