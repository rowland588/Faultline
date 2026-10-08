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
    expect(l[1]).toMatchObject({ word: 'failed — done 8 Oct', tone: 'r', bucket: 'failed', note: 'Bag 8 mm short' });
    expect(l[2]).toMatchObject({ word: 'proved 6 Oct', tone: 'g', bucket: 'done' });
    expect(l[3]).toMatchObject({ word: 'passed — done 8 Oct', tone: 'g', bucket: 'done' });
    expect(l[4]).toMatchObject({ word: 'not written · no test yet', tone: 'n', bucket: 'open' });
    expect(r?.says).toBe('5 programs · 4 done — 2 passed, 1 at baseline, 1 failed · 1 to do');
  });
  it('is nothing when there are no programs at all', () => {
    expect(programsReading({ tests: [], items: [], assets, programs: [], today: T })).toBeUndefined();
  });
  it('reaches the client report once — under Programs, not again under how the stage went — and the status page', () => {
    const project = { id: 'p', name: 'Line 2', model: 'commissioning', createdAt: 1, updatedAt: 1 } as unknown as Project;
    const x = clientReport({ project, projects: [project], assets, tests, items, materials: [], programs, standards: [], today: T });
    const setup = x.sections.find(s => s.gate === 'setup');
    expect(setup?.programs?.total).toBe(5);
    expect(setup?.says).toMatch(/4 of 5 programs done/);
    expect(JSON.stringify(setup?.accounts ?? [])).not.toContain('PR-12');
    expect(setup?.failed).toEqual(['Ilapak flow wrapper — Programs loaded — PR-04 Finest Red 2 kg: Bag 8 mm short']);
    expect(statusReport(x).programs).toBe('5 programs · 4 done — 2 passed, 1 at baseline, 1 failed · 1 to do');
  });
});

describe('proved, and what the floor said since', () => {
  it('leads with the newer fact — a program proved, then failed on the floor, reads failed', () => {
    const r = programsReading({
      tests: [stage('s1', 'w')], assets,
      items: [part('a', 's1', 'PR-04 Finest Red 2 kg', { results: [{ is: 'failed', on: T, note: 'Bag 8 mm short', at }] })],
      programs: [prog('p04', 'PR-04 Finest Red 2 kg', { assetId: 'w', state: 'proved', provedOn: '2026-10-07' })], today: T,
    });
    expect(r?.lines[0]).toMatchObject({ word: 'failed — done 8 Oct', bucket: 'failed', proving: 'proved 7 Oct in Commission' });
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
