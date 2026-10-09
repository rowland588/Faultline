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
    const chain = r.problems[0].chains.find(c => c.state === 'root');
    expect(chain?.therefore).toEqual([
      'There is no splice standard, therefore the splice leaves a step in the film edge',
      'The splice leaves a step in the film edge, therefore film tracks off the former after every splice',
      'Film tracks off the former after every splice, therefore bagger minor stops',
    ]);
    expect(r.problems[0].counter[0]).toMatchObject({ tone: 'late', when: 'Late · was due 1 Oct', expect: 'Tracking stops under 5 a week', cause: 'Film tracks off the former after every splice' });
    const { flat, said } = await paper(r);
    expect(said).toContain('ROOT');
    expect(said).toContain('PEOPLE');
    expect(said).toContain('ENVIRONMENT');
    expect(said).toContain('Nothing found yet');
    expect(said).not.toContain('looked — nothing found');
    expect(said.some(s => s.startsWith('EVERY CAUSE ON THE FISHBONE'))).toBe(false);
    for (const t of chain?.therefore ?? []) expect(has(flat, t)).toBe(true);
    expect(has(flat, 'Should change: Tracking stops under 5 a week')).toBe(true);
  });

  it('prints every cause of a crowded fishbone — the leading ones drawn, every chain whole under Why', async () => {
    const bones: SixM[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];
    const many = Array.from({ length: 30 }, (_, i) => cause(`c${i}`, bones[i % 6], `Cause number ${i + 1} on the ${bones[i % 6]} bone, said at some length so it wraps`, { status: i % 3 ? 'suspected' : 'confirmed' }));
    const r = build([kase('p1', 'Weigher breakdowns', many)], []);
    const { flat, said } = await paper(r);
    expect(r.problems[0].whySays).toBe('30 chains · no root found yet · 30 still being found');
    expect(said).toContain('30 chains · no root found yet · 30 still being found');
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

  it('prints a countermeasure\'s day in words on its problem, as the board does — waiting or not', async () => {
    const root = cause('c1', 'machine', 'Jaw heater runs cool', { status: 'confirmed', root: true });
    const r = build([kase('p1', 'Seal failures', [root])], [
      todo('a', 'Fit a new heater cartridge', { pillar: 'machine', causeRef: 'p1:c1', when: 'after the shutdown' }),
      todo('b', 'Ask the OEM for the jaw profile', { pillar: 'machine', causeRef: 'p1:c1', state: 'waiting', when: 'when they reply' }),
      todo('c', 'Dated one', { pillar: 'machine', causeRef: 'p1:c1', due: '2026-10-09', when: 'ignored — it has a date' }),
    ]);
    const counter = r.problems[0].counter;
    expect(counter.find(c => c.what === 'Fit a new heater cartridge')).toMatchObject({ when: 'No day yet', words: 'after the shutdown' });
    expect(counter.find(c => c.what === 'Ask the OEM for the jaw profile')).toMatchObject({ tone: 'waiting', when: 'Waiting on someone', words: 'when they reply' });
    expect(counter.find(c => c.what === 'Dated one')?.words).toBeUndefined();
    expect(r.board.find(b => b.m === 'machine')?.rows.find(x => x.what === 'Ask the OEM for the jaw profile')?.words).toBe('when they reply');
    const { flat } = await paper(r);
    expect(has(flat, 'When: after the shutdown')).toBe(true);
    expect(has(flat, 'When: when they reply')).toBe(true);
    expect(has(flat, 'ignored — it has a date')).toBe(false);
  });

  it('prints the whys written before the fishbone under their problem until they are on a bone', async () => {
    const old = kase('p1', 'Labels peel.', [], { whys: ['The glue is cold', '', 'The heater is off at start-up.'] });
    const r = build([old], []);
    expect(r.problems[0].written).toBe('The heater is off at start-up, therefore the glue is cold, therefore labels peel.');
    const { flat } = await paper(r);
    expect(has(flat, 'Written before the fishbone: The heater is off at start-up, therefore the glue is cold, therefore labels peel.')).toBe(true);
    expect(has(flat, 'Opened, and the causes are next.')).toBe(false);
    // Moved onto a bone — a cause and its why — it is said once, on the fish.
    const moved = kase('p1', 'Labels peel.', [cause('c1', 'machine', 'The glue is cold', { whys: [{ id: 'w', text: 'The heater is off at start-up' }] })], { whys: ['The glue is cold', 'The heater is off at start-up'] });
    expect(build([moved], []).problems[0].written).toBeUndefined();
  });

  it('keeps a countermeasure whose problem was removed on the board by bone, with no cause line and no id', async () => {
    // The removed problem is not among the views (lib/useProblems reads live Cases only).
    const live = kase('p1', 'Seal failures', [cause('c1', 'machine', 'Jaw heater runs cool', { status: 'confirmed', root: true })]);
    const r = build([live], [todo('a', 'Re-teach the robot', { pillar: 'people', caseId: 'gone-case-7f3a', causeRef: 'gone-case-7f3a:c9', expect: 'No mispicks' })]);
    expect(r.problems[0].counter).toHaveLength(0);
    const row = r.board.find(b => b.m === 'people')?.rows[0];
    expect(row).toMatchObject({ what: 'Re-teach the robot' });
    expect(row?.cause).toBeUndefined();
    const { flat } = await paper(r);
    expect(has(flat, 'Re-teach the robot')).toBe(true);
    expect(flat.includes('gone-case')).toBe(false);
    expect(flat.includes('c9')).toBe(false);
  });

  it('keeps the line and the day on a long job\'s footer — the name gives way', async () => {
    const data: FishboneData = fishboneData({ lines: [line], measures, periods, targets, readings, actions: [] });
    const long = 'Site improvement — Lines 2A, 2B and the infeed: rate to 60 ppm and waste under 2% before the Christmas peak';
    const r = sixmReport({ project: { name: long }, data, problems: [], todos: [], lineId: 'L1', now: NOW });
    const { said } = await paper(r);
    const foot = said.find(x => x.includes('client report'));
    expect(foot).toMatch(/… — Line 2A {2}· {2}client report {2}· {2}4 Oct 2026$/);
  });

  it('names every line when nothing is measured, and says "the lines" in the band', async () => {
    const line2: PaceLineRow = { ...line, id: 'L2', key: '2B', name: 'Line 2B', workspaceId: 'W2', sort: 1 };
    const data: FishboneData = fishboneData({ lines: [line, line2], measures: [], periods: [], targets: [], readings: [], actions: [] });
    const r = sixmReport({ project: { name: 'Two lines' }, data, problems: [], todos: [], now: NOW });
    expect(r.manyLines).toBe(true);
    expect(r.gapNone).toBe('No measure is set on Line 2A and Line 2B yet — the gap is drawn once a line has a measure and a target.');
    const { flat, said } = await paper(r);
    expect(said).toContain('WHERE THE LINES ARE');
    expect(has(flat, r.gapNone as string)).toBe(true);
  });

  it('does not say "the causes are next" under a closed problem with nothing on the fish', async () => {
    const r = build([kase('p1', 'Labels peel', [], { status: 'closed', closedAt: NOW - DAY })], []);
    const { flat } = await paper(r);
    expect(has(flat, 'Nothing on the fishbone yet.')).toBe(true);
    expect(has(flat, 'Opened, and the causes are next.')).toBe(false);
  });

  it('says the band in Home\'s words — problems by phase, the board by bone, what is late', async () => {
    const root = cause('c1', 'machine', 'Jaw heater runs cool', { status: 'confirmed', root: true });
    const r = build([kase('p1', 'Seal failures', [root])], [
      todo('a', 'Fit a heater', { pillar: 'machine', causeRef: 'p1:c1', due: '2026-10-01' }),
      todo('b', 'Ask the OEM', { pillar: 'people', state: 'waiting', due: '2026-10-09' }),
      todo('c', 'Done one', { pillar: 'method', state: 'done', doneOn: '2026-10-02' }),
    ]);
    expect(r.slip).toBe('1 problem — acting on it · 2 open: People 1 · Machine 1, 1 late, 1 waiting on somebody.');
    expect(r.slipSaid.filter(x => x.tone).map(x => [x.text, x.tone])).toEqual([['1 late', 'late'], ['1 waiting on somebody', 'waiting']]);
    const { flat } = await paper(r);
    expect(has(flat, r.slip)).toBe(true);
  });

  it('says a closed problem has no check set whatever phase the engine reads it in', async () => {
    const r = build([kase('p1', 'Labels peel', [cause('c', 'method', 'No standard', { status: 'confirmed', root: true })], { status: 'closed', closedAt: NOW - DAY })], []);
    expect(r.problems[0].holdless).toBe('Closed with no check set to keep the gain.');
  });

  it('says a gap problem\'s before and now are four-week averages, beside the latest reading in the gap', () => {
    const r = build([kase('p1', 'Line 2A below its rate', [], { source: { kind: 'gap', measureId: 'm' }, openedAt: NOW - 3 * DAY })], []);
    expect(r.problems[0].measure).toMatch(/^Packs per minute on Line 2A, on the four-week average: before /);
  });

  /* THE WORKING METHOD ON PAPER (docs/SIXM.md): each problem in the four
     parts it is worked in, beside its fish. */
  it('prints each problem as Problem · Why · Fix · Did it work, in that order, after its fish', async () => {
    const root = cause('c1', 'machine', 'Film tracks off the former after every splice', {
      grade: 'measured', status: 'confirmed', root: true,
      whys: [{ id: 'w1', text: 'The splice leaves a step', grade: 'observed' }, { id: 'w2', text: 'Nobody owns the splice method', grade: 'reported' }],
    });
    const open = cause('c2', 'people', 'Night shift one short at start-up', { grade: 'counted' });
    const out = cause('c3', 'environment', 'Hall humidity', { status: 'ruled_out', grade: 'reported' });
    const p = kase('p1', 'Bagger minor stops', [root, open, out], { source: { kind: 'pareto', category: 'Quality', subcategory: 'Foil in the seal', asset: 'Bagger', why: 'food safety — a foreign body risk.' } });
    const r = build([p], [
      todo('a', 'Make a splice jig', { pillar: 'machine', causeRef: 'p1:c1', due: '2026-10-09', expect: 'Tracking stops under 5 a week' }),
      todo('b', 'Write the splice standard', { pillar: 'method', causeRef: 'p1:c1', state: 'done', doneOn: '2026-09-28', expect: 'Every splicer signed off', outcome: 'All twelve signed off in a week' }),
      todo('c', 'Book agency cover', { pillar: 'people', causeRef: 'p1:c2', state: 'done', doneOn: '2026-09-27', expect: 'Three on the infeed from 22:00', outcome: 'Only two most nights — the agency could not cover' }),
    ]);
    const pr = r.problems[0];
    expect(pr.from).toBe('From the Pareto: Quality · Foil in the seal · Bagger — opened for food safety — a foreign body risk');
    // Every chain, each answer with how it is known; the root marked; the rest still being found or ruled out.
    expect(pr.chains.map(c => c.head)).toEqual(['Machine · confirmed · root found', 'People · suspected · still being found', 'Environment · ruled out']);
    expect(pr.chains[0].answers).toEqual([
      { text: 'Film tracks off the former after every splice', known: 'data' },
      { text: 'The splice leaves a step', known: 'seen' },
      { text: 'Nobody owns the splice method', known: 'told' },
    ]);
    expect(pr.chains[1].therefore).toEqual([]);
    expect(pr.worked.says).toBe('Not yet — 1 of 3 fixes still to do.');
    expect(pr.worked.fixes).toEqual([
      { what: 'Write the splice standard', expect: 'Every splicer signed off', happened: 'All twelve signed off in a week' },
      { what: 'Book agency cover', expect: 'Three on the infeed from 22:00', happened: 'Only two most nights — the agency could not cover' },
    ]);
    const { said, flat } = await paper(r);
    const at = (s: string) => said.findIndex(x => x === s);
    const order = ['PROBLEM 1', 'Problem', 'Why', 'Fix', 'Did it work'].map(at);
    expect(order, said.slice(0, 80).join(' / ')).not.toContain(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(has(flat, 'Where it came from: From the Pareto: Quality · Foil in the seal · Bagger — opened for food safety — a foreign body risk')).toBe(true);
    expect(has(flat, 'Nobody owns the splice method (told) — the root')).toBe(true);
    expect(has(flat, 'Night shift one short at start-up (counted)')).toBe(true);
    expect(has(flat, 'People · suspected · still being found')).toBe(true);
    expect(has(flat, 'Expected: Three on the infeed from 22:00')).toBe(true);
    expect(has(flat, 'What happened: Only two most nights — the agency could not cover')).toBe(true);
    // Is / Is not only when the stops say something (factsOf is empty here).
    expect(said.some(x => /^Is( not)?:/.test(x))).toBe(false);
  });

  it('says Checking it worked, never Holding, for a closed problem whose number is not measured since', () => {
    const r = build([kase('p1', 'Changeover takes 48 minutes', [cause('c', 'method', 'Done three ways', { status: 'confirmed', root: true })], {
      status: 'closed', closedAt: NOW - 2 * DAY, hold: { what: 'Time one changeover a week', everyDays: 7, since: '2026-10-02' },
    })], [todo('a', 'One standard', { pillar: 'method', causeRef: 'p1:c', state: 'done', doneOn: '2026-10-02' })]);
    expect(r.problems[0].phaseWord).toBe('Checking it worked');
    expect(r.problems[0].worked.says).toBe('Checking it worked — closed, and the number not measured since the fixes were done.');
    expect(r.problems[0].hold?.word).toBe('Check set');
  });

  it('carries a long problem on to the next page under its own "(continued)" heading — nothing cut', async () => {
    const whys = Array.from({ length: 6 }, (_, k) => ({ id: `w${k}`, text: `Answer ${k + 1}: ${'the reason goes on at some length '.repeat(6)}end${k + 1}`, grade: 'observed' as const }));
    const causes = Array.from({ length: 8 }, (_, i) => cause(`c${i}`, (['people', 'machine', 'method', 'material', 'measurement', 'environment'] as SixM[])[i % 6], `Cause ${i + 1} said plainly`, { status: 'confirmed', root: true, whys }));
    const r = build([kase('p1', 'Weigher breakdowns', causes)], []);
    const { doc, said, flat } = await paper(r);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(said.filter(x => x === 'Problem 1 — Weigher breakdowns (continued)').length).toBe(doc.getNumberOfPages() - 1);
    for (let k = 1; k <= 6; k++) expect(has(flat, `end${k} (seen)`)).toBe(true);
    expect(said.some(x => x.includes('…') && !x.includes('client report'))).toBe(false);
  });
});
