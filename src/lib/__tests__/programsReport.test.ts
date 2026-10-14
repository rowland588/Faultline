/* THE PROGRAMS, AS THE REPORTS SAY THEM (lib/programsReport). Rowland, 8
 * October: "on programs they are missing from the reports — need its own
 * report, and added to the main report." */
import { describe, expect, it } from 'vitest';
import { programsReading } from '../programsReport';
import { statusReport } from '../statusReport';
import { clientReport } from '../clientReport';
import type { Asset, Test, TestItem } from '../testing';
import type { Program } from '../programs';
import type { Project } from '../../types';

const T = '2026-10-08';
const at = Date.parse(`${T}T10:00:00`);
const asset = (id: string, name: string, sort: number) => ({ id, projectId: 'p', name, sort, createdAt: 1, updatedAt: 1 }) as unknown as Asset;
const stage = (id: string, assetId: string, title = 'Programs loaded') =>
  ({ id, projectId: 'p', kind: 'install', gate: 'setup', title, assetId, outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 }) as Test;
const part = (id: string, testId: string, what: string, extra: Partial<TestItem> = {}) =>
  ({ id, projectId: 'p', testId, kind: 'next', what, sort: 1, createdAt: 1, updatedAt: 1, ...extra }) as TestItem;
const prog = (id: string, what: string, extra: Partial<Program> = {}) =>
  ({ id, projectId: 'p', what, state: 'onMachine', sort: 10, createdAt: 1, updatedAt: 1, ...extra }) as Program;

const assets = [asset('w', 'Ilapak flow wrapper', 1), asset('c', 'Case packer', 2)];
const tests = [stage('s1', 'w'), stage('s2', 'c'), stage('s3', 'w', 'Recipes and settings set')];
const items = [
  part('a', 's1', 'PR-12 Express 1.25 kg', { owner: 'Ilapak UK', results: [
    { is: 'failed', on: '2026-10-07', note: 'Seal jaws cold', at: at - 86_400_000 },
    { is: 'baseline', on: T, note: 'Running 32 ppm at baseline', at },
  ] }),
  part('b', 's1', 'PR-04 Finest Red 2 kg', { results: [{ is: 'failed', on: T, note: 'Bag 8 mm short', at }] }),
  part('c', 's2', 'Case recipe 6-up', { doneAt: at, results: [{ is: 'passed', on: T, note: '12 cases a minute', at }] }),
  /* A part on a stage that is not about programs is not a program. */
  part('d', 's3', 'Set the film tension'),
];
const programs = [
  /* The same program as part a, by name — one program, not two. */
  prog('p12', 'pr-12 express 1.25 KG', { assetId: 'w', runs: 'Tesco Express 1.25 kg' }),
  /* On the Programs page only — proved in Commission. */
  prog('p07', 'PR-07 Baking Potatoes 2 kg', { assetId: 'w', state: 'proved', provedOn: '2026-10-06' }),
  prog('p99', 'PR-99 Not written yet', { assetId: 'c', state: 'needed' }),
];

describe('the programs, machine by machine', () => {
  const r = programsReading({ tests, items, assets, programs, today: T });
  it('reads each machine in order, a part and a program of one name as one program', () => {
    expect(r?.machines.map(m => [m.name, m.lines.map(l => l.what)])).toEqual([
      ['Ilapak flow wrapper', ['PR-12 Express 1.25 kg', 'PR-04 Finest Red 2 kg', 'PR-07 Baking Potatoes 2 kg']],
      ['Case packer', ['Case recipe 6-up', 'PR-99 Not written yet']],
    ]);
  });
  it('says each one in words and its colour, with what was seen and what was said before', () => {
    const l = r?.lines ?? [];
    expect(l[0]).toMatchObject({ word: 'baseline achieved — done 8 Oct', tone: 'g', bucket: 'baseline', note: 'Running 32 ppm at baseline',
      runs: 'Tesco Express 1.25 kg', who: 'Ilapak UK', earlier: ['failed 7 Oct — Seal jaws cold'] });
    expect(l[1]).toMatchObject({ word: 'Failed · closed 8 Oct', tone: 'r', bucket: 'failed', note: 'Bag 8 mm short' });
    expect(l[2]).toMatchObject({ word: 'proved 6 Oct', tone: 'g', bucket: 'done' });
    expect(l[3]).toMatchObject({ word: 'passed — done 8 Oct', tone: 'g', bucket: 'done' });
    expect(l[4]).toMatchObject({ word: 'not written · no test yet', tone: 'n', bucket: 'open' });
    /* a failed program is not done (flow audit #3): counted and said apart */
    expect(r?.says).toBe('5 programs · 3 done — 2 passed, 1 at baseline · 1 failed · 1 to do');
    expect([r?.doneAll, r?.failed]).toEqual([3, 1]);
  });
  it('is nothing when there are no programs at all', () => {
    expect(programsReading({ tests: [], items: [], assets, programs: [], today: T })).toBeUndefined();
  });
  it('reaches the client report once — under Programs, not again under how the stage went — and the status page', () => {
    const project = { id: 'p', name: 'Line 2', model: 'commissioning', createdAt: 1, updatedAt: 1 } as unknown as Project;
    const x = clientReport({ project, projects: [project], assets, tests, items, materials: [], programs, standards: [], today: T });
    const setup = x.sections.find(s => s.gate === 'setup');
    expect(setup?.programs?.total).toBe(5);
    expect(setup?.says).toMatch(/3 of 5 programs done/);
    expect(JSON.stringify(setup?.accounts ?? [])).not.toContain('PR-12');
    expect(setup?.failed).toEqual(['Ilapak flow wrapper — Programs loaded — PR-04 Finest Red 2 kg: Bag 8 mm short']);
    expect(statusReport(x).programs).toBe('5 programs · 3 done — 2 passed, 1 at baseline · 1 failed · 1 to do');
  });
});

describe('proved, and what the floor said since', () => {
  it('leads with the newer fact — a program proved, then failed on the floor, reads failed', () => {
    const r = programsReading({
      tests: [stage('s1', 'w')], assets,
      items: [part('a', 's1', 'PR-04 Finest Red 2 kg', { results: [{ is: 'failed', on: T, note: 'Bag 8 mm short', at }] })],
      programs: [prog('p04', 'PR-04 Finest Red 2 kg', { assetId: 'w', state: 'proved', provedOn: '2026-10-07' })], today: T,
    });
    /* the record's own state beside it — and it was proved by hand, not "in Commission" */
    expect(r?.lines[0]).toMatchObject({ word: 'Failed · closed 8 Oct', bucket: 'failed', record: { word: 'proved 7 Oct', tone: 'g' }, proving: 'On the line: proved 7 Oct' });
  });
  it('and with proved when Commission proved it after the floor last spoke', () => {
    const r = programsReading({
      tests: [stage('s1', 'w')], assets,
      items: [part('a', 's1', 'PR-04 Finest Red 2 kg', { results: [{ is: 'baseline', on: '2026-10-06', note: '30 ppm', at }] })],
      programs: [prog('p04', 'PR-04 Finest Red 2 kg', { assetId: 'w', state: 'proved', provedOn: '2026-10-07' })], today: T,
    });
    expect(r?.lines[0]).toMatchObject({ word: 'proved 7 Oct', bucket: 'done', note: '30 ppm', proving: 'on the floor: baseline achieved — done 6 Oct' });
  });
});

/* Rowland, 12 October: "In programs we need option not tested, and no
 * program, and allow commentary." Said like the rest, with what was seen —
 * and neither is the program done: not tested is still to do (grey), no
 * program waits on whoever writes it (amber), and either goes red once its
 * day has gone. Commentary with no status picked is kept on the part. */
describe('not tested, no program — and commentary with no status', () => {
  it('neither is done; each says why, in its colour; the counts say how many', async () => {
    const { saidResult, partStatus, partDone } = await import('../noted');
    const nt = saidResult(part('n', 's1', 'PR-20 Jacket 2.5 kg'), 'notTested', 'Film not on site yet', at);
    const np = saidResult(part('m', 's2', 'Case recipe 4-up'), 'noProgram', 'Brillopak to write it', at);
    expect([partDone(nt), nt.doneAt, partDone(np)]).toEqual([false, undefined, false]);
    expect(partStatus(nt, T)).toMatchObject({ word: 'not tested · 8 Oct', tone: 'n', bucket: 'open', done: false });
    expect(partStatus(np, T)).toMatchObject({ word: 'no program · 8 Oct', tone: 'a', bucket: 'open', done: false });
    /* its day gone: red, still saying why */
    expect(partStatus({ ...np, due: '2026-10-06' }, T)).toMatchObject({ word: 'no program — late · was 6 Oct', tone: 'r', bucket: 'late' });
    /* passed after it: done on that day, the not tested kept in its story */
    const later = saidResult(nt, 'passed', 'Ran 40 ppm', at + 86_400_000);
    expect([partDone(later), partStatus(later, '2026-10-09').word, later.results?.length]).toEqual([true, 'passed — done 9 Oct', 2]);
    const r = programsReading({ tests, items: [...items, nt, np], assets, programs, today: T });
    expect(r?.lines.find(l => l.what === 'PR-20 Jacket 2.5 kg')).toMatchObject({ word: 'not tested · 8 Oct', note: 'Film not on site yet', said: 'notTested' });
    expect([r?.notTested, r?.noProgram]).toEqual([1, 1]);
    expect(r?.says).toBe('7 programs · 3 done — 2 passed, 1 at baseline · 1 failed · 3 to do · 1 not tested, 1 with no program');
    /* late as well: still counted as no program, and said so */
    const late = programsReading({ tests, items: [...items, nt, { ...np, due: '2026-10-06' }], assets, programs, today: T });
    expect([late?.noProgram, late?.late, late?.says]).toEqual([1, 1, '7 programs · 3 done — 2 passed, 1 at baseline · 1 failed · 1 late · 2 to do · 1 not tested, 1 with no program']);
  });
  it('a done status after "passed" turns it back to to-do when it is said not tested; taking that off hands it back', async () => {
    const { saidResult, editedResult, withoutResult, partDone } = await import('../noted');
    const ok = saidResult(part('k', 's1', 'PR-30'), 'passed', '', at - 2 * 86_400_000);
    const nt = editedResult(ok, 'notTested', 'New film, test again', at);
    expect([partDone(nt), nt.results?.map(x => x.is)]).toEqual([false, ['passed', 'notTested']]);
    const back = withoutResult(nt, at);
    expect([partDone(back), back.doneAt]).toEqual([true, at - 2 * 86_400_000]);
  });
  it('commentary with no status is on the part, and on the paper', () => {
    const c = part('q', 's2', 'Case recipe 8-up', { note: 'Waiting on the 8-up change parts' });
    const r = programsReading({ tests, items: [...items, c], assets, programs, today: T });
    expect(r?.lines.find(l => l.what === 'Case recipe 8-up')).toMatchObject({ word: 'to do', note: 'Waiting on the 8-up change parts' });
  });
});

/* Flow audit #3, 13 October: one program, two records, two answers — PR-04
 * "Proved 12 Oct" on the line's Programs and "Failed · closed 13 Oct" on the
 * job's; PR-12 "on the machine, testing 16 Oct" on the line and "baseline
 * achieved, done 13 Oct" on the job, each place blind to the other. */
describe('one program, one answer', () => {
  it('finds the floor\'s newest failure on the part of its name on its machine\'s programs stage', async () => {
    const { floorFailedOn, partsOfProgram } = await import('../programsReport');
    const p = prog('p04', 'PR-04 finest red 2 KG', { assetId: 'w' });
    expect(partsOfProgram(p, tests, items).map(i => i.id)).toEqual(['b']);
    expect(floorFailedOn(p, tests, items)).toBe(T);
    expect(floorFailedOn(prog('p12', 'PR-12 Express 1.25 kg', { assetId: 'w' }), tests, items)).toBe('2026-10-07');
    /* another machine's part of the same name is not this program */
    expect(floorFailedOn(prog('x', 'PR-04 Finest Red 2 kg', { assetId: 'c' }), tests, items)).toBeUndefined();
  });
  it('says the record\'s own state beside the floor\'s — and, failed since its test passed, back on the machine to prove again', () => {
    const passed = { id: 't4', projectId: 'p', kind: 'test', title: 'Prove program PR-04', assetId: 'w', programId: 'p04', outcome: 'passed', ranOn: '2026-10-07', sort: 2, createdAt: 1, updatedAt: 1 } as Test;
    const booked = { id: 't12', projectId: 'p', kind: 'test', title: 'Prove program PR-12', assetId: 'w', programId: 'p12', outcome: 'planned', plannedFor: '2026-10-16', sort: 3, createdAt: 1, updatedAt: 1 } as Test;
    const r = programsReading({ tests: [stage('s1', 'w'), passed, booked], assets, today: T,
      items: [items[0], items[1]],
      programs: [prog('p12', 'PR-12 Express 1.25 kg', { assetId: 'w', testId: 't12', testOn: '2026-10-16' }), prog('p04', 'PR-04 Finest Red 2 kg', { assetId: 'w', testId: 't4' })] });
    const [l12, l04] = r?.lines ?? [];
    expect(l12).toMatchObject({ word: 'baseline achieved — done 8 Oct', record: { word: 'on the machine · test booked 16 Oct', tone: 'w' }, proving: 'On the line: on the machine · test booked 16 Oct' });
    expect(l04).toMatchObject({ word: 'Failed · closed 8 Oct', bucket: 'failed', record: { word: 'on the machine · failed 8 Oct — to prove again', tone: 'r' } });
    /* a part with no program record of its name has nothing beside it */
    const alone = programsReading({ tests, items, assets, programs: [], today: T });
    expect(alone?.lines.every(l => !l.record)).toBe(true);
  });
});
