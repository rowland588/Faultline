import { describe, expect, it } from 'vitest';
import { openOnMachine, machineTests, type MachineRecord } from '../machineRecord';
import { machineDetailPaper } from '../machineDetail';
import type { JobInput } from '../portfolio';
import type { Test, TestItem, Asset } from '../testing';
import type { Program } from '../programs';
import type { LineMachineView } from '../lineMachine';
import type { Snag } from '../../snag/types';

const m = {
  id: 'm1', name: 'Wrapper', at: 'at Set up', arrival: 'On site since 2 Oct', arrivalLate: false,
  gates: [
    { gate: 'install', label: 'Install', tone: 'done', says: '2 of 2 done', lines: [{ id: 'i1', title: 'Placed', word: 'done 2 Oct', tone: 'done' }] },
    { gate: 'setup', label: 'Set up', tone: 'late', says: '1 of 3 done · 1 late', lines: [
      { id: 's1', title: 'Programs loaded', word: 'done 3 Oct', tone: 'done' },
      { id: 's2', title: 'Change parts', word: '30 Oct', tone: 'ahead' },
      { id: 's3', title: 'Guards', word: 'late — was 26 Oct', tone: 'late' }] },
    { gate: 'commission', label: 'Commission', tone: 'going', says: '1 of 2 done', lines: [
      { id: 't1', title: 'Seal', word: 'passed 4 Oct', tone: 'done' }, { id: 't2', title: 'Speed', word: '1 Nov', tone: 'ahead' }] },
    { gate: 'handover', label: 'Hand over', tone: 'ahead', says: 'not started', lines: [] },
  ],
  fixes: [{ id: 'f1', title: 'Jaw heater', word: 'due 29 Oct', tone: 'ahead' }],
  fixesDone: 0,
  problems: [{ id: 'p1', title: 'Film tracks off', word: 'no fix booked', tone: 'problem', critical: true }],
  open: [],
} as unknown as MachineRecord;

describe('a machine\'s page, machine first', () => {
  it('what is still open on it — stages not done, fixes, problems — the most pressing first, each said where it sits; no test among them', () => {
    expect(openOnMachine(m).map(l => [l.title, l.where])).toEqual([['Guards', 'Set up'], ['Film tracks off', 'Problem — critical'], ['Change parts', 'Set up'], ['Jaw heater', 'Fix']]);
  });
  it('its tests, every one as it stands', () => {
    expect(machineTests(m).map(l => l.title)).toEqual(['Seal', 'Speed']);
  });
});


/* THE MACHINE REPORT IN FULL (27 October — Rowland: "all you've done is headlines ... The tests that have been done,
   you can't see the results. You can't see the efforts that have been put in place") */
describe('a machine in full — every attempt, what was seen, what was found, the program and its tests, the fix, the step', () => {
  const T = (x: Partial<Test> & Pick<Test, 'id' | 'title'>): Test => ({ projectId: 'P', kind: 'test', assetId: 'm1', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...x } as Test);
  const asset = { id: 'm1', projectId: 'P', name: 'Wrapper', oem: 'Ilapak', state: 'onSite', onSiteOn: '2026-10-02', sort: 1, updatedAt: 1 } as Asset;
  const tests: Test[] = [
    T({ id: 't1', title: 'Seal integrity', passesIf: 'no leak in 20 packs', outcome: 'failed', ranOn: '2026-10-10', result: 'two leaks on lane 2', createdAt: 1,
      runAgreed: { rate: 60, minutes: 30 }, run: { speed: 55, minutes: 30, packs: 1600, rejects: 40 } } as Partial<Test> as Test),
    T({ id: 't2', title: 'Seal integrity — re-test', fromTestId: 't1', outcome: 'passed', ranOn: '2026-10-14', result: 'no leaks', createdAt: 2 }),
    T({ id: 'pt1', title: 'Prove PR-04', programId: 'p1', outcome: 'passed', ranOn: '2026-10-12', result: 'ran clean', createdAt: 3,
      run: { speed: 50, minutes: 60, packs: 2900, rejects: 10 } } as Partial<Test> as Test),
    T({ id: 'f1', title: 'Change the jaw heater', kind: 'fix', fromTestId: 't1', outcome: 'passed', ranOn: '2026-10-13', result: 'new heater fitted', withWhom: 'Dave' }),
    T({ id: 'i1', title: 'Positioned', kind: 'install', outcome: 'passed', ranOn: '2026-10-03', result: 'on its marks' }),
  ];
  const items = [{ id: 'x1', projectId: 'P', testId: 't1', kind: 'found', what: 'Jaw heater reads 20° low', owner: 'Dave', createdAt: Date.parse('2026-10-10T10:00:00Z'), updatedAt: 1 }] as TestItem[];
  const programs = [{ id: 'p1', projectId: 'P', assetId: 'm1', what: 'PR-04', runs: 'Finest 2kg', state: 'proved', provedOn: '2026-10-12', sort: 1, createdAt: 1, updatedAt: 1 }] as unknown as Program[];
  const gate = { project: { id: 'P', name: 'Line 2 commissioning', createdAt: 1, updatedAt: 1 }, tests, items, assets: [asset], materials: [], programs, studies: [] } as unknown as JobInput;
  const p = machineDetailPaper({ name: 'Wrapper', today: '2026-10-27', line: 'Line 2a', project: { name: 'Line 2 commissioning', gate, assetId: 'm1' } });
  const sec = (t: RegExp) => p.sections.find(x => t.test(x.title));
  it('its status, the project and the gate it is up to, the tiles and the closing line', () => {
    expect(p).toMatchObject({ eyebrow: 'MACHINE · Line 2 commissioning · Line 2a', name: 'Wrapper', status: { word: 'On site' } });
    expect(p.inProject).toMatch(/^Going through Line 2 commissioning — a stage-gate project — /);
    expect(p.tiles?.map(t => t.label)).toEqual(['Tests passed', 'Programs proved', 'Open on it', 'Late or failed', 'Critical']);
    expect(p.closing).toMatch(/^Wrapper is on site and up to .* in Line 2 commissioning: \d+ of \d+ tests passed, 1 of 1 programs proved/);
  });
  it('a test with every attempt — what it had to show, what each aimed at and did, how it went, what was seen, what was found on it', () => {
    const row = sec(/^Its tests/)?.rows.find(r => r.what.startsWith('Seal integrity'));
    expect(row?.lines?.[0]).toBe('Has to show: no leak in 20 packs');
    expect(row?.lines).toContain('Test 1 · 10 Oct · aiming 60 ppm for 30 min · set at 55 ppm · ran 30 min · 1,600 packs · 40 rejects · netted 52 ppm — didn’t pass: two leaks on lane 2');
    expect(row?.lines?.some(l => /^Test 2 · 14 Oct — passed: no leaks$/.test(l))).toBe(true);
    expect(row?.lines?.some(l => /^Found 10 Oct: Jaw heater reads 20° low · Dave$/.test(l))).toBe(true);
    expect(row?.says).toMatch(/2 tests · 1 passed · 1 didn’t pass/);
  });
  it('the program with every test of it', () => {
    const row = sec(/^Its programs/)?.rows[0];
    expect(row?.what).toBe('PR-04');
    expect(row?.lines?.some(l => /^Test 1 · 12 Oct · set at 50 ppm · ran 60 min · 2,900 packs · 10 rejects · netted 48.2 ppm — passed: ran clean$/.test(l))).toBe(true);
  });
  it('the fix with what was done; the install step with what was said', () => {
    const fix = sec(/problems and fixes/)?.rows.find(r => r.what === 'Fix: Change the jaw heater');
    expect(fix).toMatchObject({ says: 'Dave · for Seal integrity', tone: 'g' });
    expect(fix?.lines).toEqual(['Done: new heater fitted']);
    const step = sec(/^Install — every step/)?.rows.find(r => r.what === 'Positioned');
    expect(step?.lines).toContain('Said: on its marks');
  });
  it('on its line: the register’s problem with its journey, the study with what it found', () => {
    const view = { name: 'Wrapper', whose: '', says: 'x', projects: [{ id: 'P', name: 'Line 2 commissioning', tests: 2, open: 0, failed: 0, href: '' }], programs: [],
      problems: [{ id: 's1', what: 'Film tracks off', priority: 'high', open: true, href: '' }], studies: [], stops: { n: 2, minutes: 14 } } as unknown as LineMachineView;
    const snags = [{ id: 's1', problem: 'Film tracks off', owner: 'Rob', raisedAt: Date.parse('2026-10-11T09:00:00Z'), status: 'open',
      journey: [{ id: 'j1', at: Date.parse('2026-10-12T09:00:00Z'), did: 'reset the guide', result: 'still drifts' }] }] as unknown as Snag[];
    const q = machineDetailPaper({ name: 'Wrapper', today: '2026-10-27', line: 'Line 2a', project: { name: 'Line 2 commissioning', gate, assetId: 'm1' }, view, snags });
    const reg = q.sections.find(x => /register/.test(x.title))?.rows[0];
    expect(reg).toMatchObject({ what: 'Film tracks off', word: 'High', tone: 'a' });
    expect(reg?.says).toMatch(/^with Rob · raised 11 Oct$/);
    expect(reg?.lines).toEqual(['12 Oct — reset the guide — still drifts']);
    /* its own project's work is this page — never listed again as another's */
    expect(q.sections.some(x => /Other projects/.test(x.title))).toBe(false);
    expect(q.sections.find(x => x.title === 'Its stops')?.rows[0]).toMatchObject({ word: '14 minutes' });
  });
});
