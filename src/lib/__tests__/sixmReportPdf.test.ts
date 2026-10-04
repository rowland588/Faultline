/* @vitest-environment jsdom
 *
 * The 6M client report: the story from the records (sixmReport) and the paper
 * it pours (drawSixMReport). A job just started says so in a line; a problem's
 * every cause prints somewhere — on the drawn fish, or in the list that follows
 * when the fish cannot carry them all; the roots are read back; the board says
 * late in words and in red. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import type { Case } from '../../types';
import type { PaceTodoRow } from '../../db/rows';
import type { PaceLineRow } from '../../db/rows';
import type { Cause, SixM } from '../sixm';
import { buildView, fishboneData, type FishboneData } from '../fishbone';
import { stepAction } from '../actions';
import { drawSixMReport, sixmReport, type SixMReport } from '../sixmReportPdf';

const NOW = Date.parse('2026-10-04T12:00:00');
const DAY = 86_400_000;
const line: PaceLineRow = { id: 'L1', key: '2A', name: 'Line 2A', owner: 'Rob Scott', workspaceId: 'W1', updatedAt: NOW };
const measures = [{ id: 'm', name: 'Packs per minute', unit: 'ppm', direction: 'up' as const, sort: 0 }];
const periods = [{ id: 'q', name: 'Q4', from: '2026-10-01', to: '2026-12-31', sort: 0 }];
const targets = [{ id: 't', projectId: 'P', lineId: 'L1', measureId: 'm', periodId: 'q', value: 60, updatedAt: NOW }];
const readings = ['2026-09-20', '2026-09-27', '2026-10-03'].map((at, i) => ({ id: `r${i}`, projectId: 'P', lineId: 'L1', measureId: 'm', at, value: 50 + i, createdAt: NOW, updatedAt: NOW }));

const cause = (id: string, m: SixM, text: string, o: Partial<Cause> = {}): Cause =>
  ({ id, m, text, grade: 'observed', status: 'suspected', whys: [], at: NOW - DAY, ...o });
const kase = (id: string, title: string, causes: Cause[], o: Partial<Case> = {}): Case => ({
  id, workspaceId: 'W1', title, path: [], baselineMsWeek: 0, status: 'open', openedAt: NOW - 10 * DAY, updatedAt: NOW,
  projectId: 'P', lineId: 'L1', source: { kind: 'observed' }, causes, ...o,
});
const todo = (id: string, what: string, o: Partial<PaceTodoRow> = {}): PaceTodoRow =>
  ({ id, projectId: 'P', lineId: 'L1', what, where: '', why: '', who: 'Rob Scott', when: '', state: 'todo', createdAt: NOW, updatedAt: NOW, ...o });

function build(cases: Case[], todos: PaceTodoRow[]): SixMReport {
  // The board as the engine reads it — the store's rows as countermeasures (lib/useProblems).
  const actions = todos.map(t => ({ ...stepAction(t, [line], '2026-10-04'), causeRef: t.causeRef, expect: t.expect, doneOn: t.doneOn }));
  const data: FishboneData = fishboneData({ lines: [line], measures, periods, targets, readings, actions });
  return sixmReport({ project: { name: 'Line 2A to 60', lead: 'Rowland' }, data, problems: cases.map(c => buildView(c, data, NOW)), todos, now: NOW });
}

async function paper(r: SixMReport): Promise<{ doc: jsPDF; flat: string; said: string[] }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const said: string[] = [];
  const orig = doc.text.bind(doc);
  (doc as unknown as { text: (...a: unknown[]) => jsPDF }).text = (t: unknown, ...rest: unknown[]) => {
    said.push(...(Array.isArray(t) ? t.map(String) : [String(t)]));
    return (orig as (...a: unknown[]) => jsPDF)(t, ...rest);
  };
  await drawSixMReport(doc, r);
  return { doc, said, flat: said.join('').replace(/\s+/g, '') };
}
const has = (flat: string, s: string) => flat.includes(s.replace(/\s+/g, ''));

describe('the 6M client report', () => {
  it('says a job just started has no problem yet, in a line, on one page', async () => {
    const r = build([], [todo('a', 'Time the bagger stops for a week', { pillar: 'machine', due: '2026-10-10' })]);
    expect(r.problems).toHaveLength(0);
    expect(r.noProblems).toMatch(/No problem has been opened yet/);
    expect(r.gaps[0].says).toBe('Line 2A is at 52 ppm (3 Oct) against the Q4 target of 60 ppm — 8 ppm short of target.');
    expect(r.gaps[0].short).toBe('8 ppm short of target');
    const { doc, flat, said } = await paper(r);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(has(flat, r.noProblems as string)).toBe(true);
    expect(said.some(s => /^Problem \d/.test(s))).toBe(false);
    expect(has(flat, 'Nothing on the board for People, Method, Material, Measurement and Environment.')).toBe(true);
  });

  it('draws a small fishbone whole, marks its root, and reads the chain back', async () => {
    const root = cause('c1', 'machine', 'Film tracks off the former after every splice', {
      grade: 'measured', status: 'confirmed', root: true,
      whys: [{ id: 'w1', text: 'The splice leaves a step in the film edge' }, { id: 'w2', text: 'There is no splice standard', grade: 'counted' }],
    });
    const out = cause('c2', 'environment', 'Hall humidity over 80%', { status: 'ruled_out', grade: 'reported' });
    const p = kase('p1', 'Bagger minor stops', [root, out]);
    const r = build([p], [todo('a', 'Make a splice jig', { pillar: 'machine', causeRef: 'p1:c1', due: '2026-10-01', expect: 'Tracking stops under 5 a week' })]);
    expect(r.problems[0].phaseWord).toBe('Acting on it');
    expect(r.problems[0].roots[0].therefore).toEqual([
      'There is no splice standard, therefore the splice leaves a step in the film edge',
      'The splice leaves a step in the film edge, therefore film tracks off the former after every splice',
      'Film tracks off the former after every splice, therefore bagger minor stops',
    ]);
    expect(r.problems[0].counter[0]).toMatchObject({ tone: 'late', when: 'Late · was due 1 Oct', expect: 'Tracking stops under 5 a week', cause: 'Film tracks off the former after every splice' });
    const { flat, said } = await paper(r);
    expect(said).toContain('ROOT');
    expect(said).toContain('PEOPLE');
    expect(said).toContain('ENVIRONMENT');
    expect(said).toContain('looked — nothing found');
    expect(said.some(s => s.startsWith('EVERY CAUSE ON THE FISHBONE'))).toBe(false);
    for (const t of r.problems[0].roots[0].therefore) expect(has(flat, t)).toBe(true);
    expect(has(flat, 'Expected: Tracking stops under 5 a week')).toBe(true);
  });

  it('prints every cause of a crowded fishbone — the leading ones drawn, the whole list after', async () => {
    const bones: SixM[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];
    const many = Array.from({ length: 30 }, (_, i) => cause(`c${i}`, bones[i % 6], `Cause number ${i + 1} on the ${bones[i % 6]} bone, said at some length so it wraps`, { status: i % 3 ? 'suspected' : 'confirmed' }));
    const r = build([kase('p1', 'Weigher breakdowns', many)], []);
    const { flat, said } = await paper(r);
    expect(said.some(s => s.startsWith('EVERY CAUSE ON THE FISHBONE — 30'))).toBe(true);
    for (const c of many) expect(has(flat, c.text)).toBe(true);
    expect(said.some(s => /and \d+ more/.test(s))).toBe(false);
  });

  it('says whether the gain is holding, and a closed problem with no check is said', async () => {
    const held = kase('p1', 'Changeover takes 48 minutes', [cause('c', 'method', 'Done three ways', { status: 'confirmed', root: true })], {
      status: 'closed', closedAt: NOW - 5 * DAY, hold: { what: 'Time one changeover a week', who: 'Rob Scott', everyDays: 7, since: '2026-09-29', lastChecked: '2026-10-02' },
    });
    const bare = kase('p2', 'Labels peel', [], { status: 'closed', closedAt: NOW - DAY });
    const r = build([held, bare], []);
    const h = r.problems.find(p => p.id === 'p1');
    expect(h?.hold).toMatchObject({ what: 'Time one changeover a week', every: 'every week', last: '2 Oct' });
    expect(r.problems.find(p => p.id === 'p2')?.holdless).toBe('Closed with no check set to keep the gain.');
    const { flat } = await paper(r);
    expect(has(flat, 'The check: Time one changeover a week')).toBe(true);
  });

  it('puts every action on the board by bone, late first, done last and quiet', async () => {
    const r = build([], [
      todo('a', 'Done thing', { pillar: 'people', state: 'done', doneOn: '2026-10-01' }),
      todo('b', 'Late thing', { pillar: 'people', due: '2026-09-30' }),
      todo('c', 'Waiting thing', { pillar: 'people', state: 'waiting', due: '2026-10-09' }),
      todo('d', 'Old plant word', { pillar: 'plant', when: 'before the peak' }),
      todo('e', 'Not sorted'),
    ]);
    const people = r.board.find(b => b.m === 'people');
    expect(people?.rows.map(x => x.what)).toEqual(['Late thing', 'Waiting thing', 'Done thing']);
    expect(people?.says).toBe('2 open · 1 late · 1 done');
    expect(r.board.find(b => b.m === 'machine')?.rows[0]).toMatchObject({ what: 'Old plant word', when: 'No day yet', words: 'before the peak' });
    expect(r.board.find(b => b.m === null)?.rows[0].what).toBe('Not sorted');
    const { flat } = await paper(r);
    expect(has(flat, 'When: before the peak')).toBe(true);
    expect(has(flat, 'NOT ON A BONE YET')).toBe(true);
  });
});
