import { describe, expect, it } from 'vitest';
import { openOnMachine, machineTests, type MachineRecord } from '../machineRecord';
import { lineMachinePaper, projectMachinePaper } from '../machinePaper';
import type { ProgramLine } from '../programsReport';
import type { LineMachineView } from '../lineMachine';

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

describe('the machine report says what its page says (27 October — "still no report abilities")', () => {
  const progs = [
    { machine: 'Wrapper', assetId: 'm1', what: 'PR-04', runs: 'Finest 2kg', word: 'proved 7 Oct', tone: 'g', bucket: 'done', earlier: [] },
    { machine: 'Wrapper', assetId: 'm1', what: 'PR-07', word: 'to do', tone: 'n', bucket: 'open', earlier: [] },
    { machine: 'Coder', assetId: 'm2', what: 'PR-09', word: 'to do', tone: 'n', bucket: 'open', earlier: [] },
  ] as unknown as ProgramLine[];
  const p = projectMachinePaper({ project: 'Line 2 commissioning', m: { ...m, oem: 'Ilapak' } as MachineRecord, status: 'On site', programs: progs, line: 'Line 2a' });
  it('its status, its facts and the project it is going through, up to its gate', () => {
    expect(p).toMatchObject({ eyebrow: 'MACHINE · Line 2 commissioning', name: 'Wrapper', status: { word: 'On site', tone: 'w' } });
    expect(p.facts).toEqual(['Made by Ilapak', 'On site since 2 Oct', 'On Line 2a']);
    expect(p.inProject).toBe('Going through Line 2 commissioning — a stage-gate project — up to Set up.');
    expect(p.gates?.map(g => [g.label, g.says, g.tone])).toEqual([['Install', '2 of 2 done', 'g'], ['Set up', '1 of 3 done · 1 late', 'r'], ['Commission', '1 of 2 done', 'w'], ['Hand over', 'not started', 'n']]);
  });
  it('what is open, its tests and its own programs only — each in its colour', () => {
    expect(p.sections.map(s => [s.title, s.count])).toEqual([['What is open on it', '4'], ['Its tests', '1 of 2 passed'], ['Its programs', '2']]);
    expect(p.sections[0].rows[0]).toEqual({ what: 'Guards', says: 'Set up', word: 'late — was 26 Oct', tone: 'r' });
    expect(p.sections[0].rows[1]).toMatchObject({ what: 'Film tracks off', says: 'Problem — critical', tone: 'a' });
    expect(p.sections[2].rows.map(r => [r.what, r.word, r.tone])).toEqual([['PR-04', 'PASSED — proved 7 Oct', 'g'], ['PR-07', 'TO DO', 'n']]);
  });
  it('handed over says so', () => {
    expect(projectMachinePaper({ project: 'P', m: { ...m, at: 'Handed over 3 Oct' } as MachineRecord, status: 'Handed over', programs: [] }).inProject).toBe('Going through P — a stage-gate project — handed over 3 oct.');
  });
  it('on its line: every project, its programs, its problems, its studies and its stops', () => {
    const v = { name: 'Wrapper', whose: 'With P', says: 'With P · 2 programs', oem: 'Ilapak',
      projects: [{ id: 'P', name: 'P', tests: 3, open: 1, failed: 1, last: 'Seal failed 4 Oct', href: '' }],
      programs: progs.slice(0, 1), problems: [{ id: 's', what: 'Film tracks', priority: 'critical', open: true, href: '' }, { id: 't', what: 'Old', priority: 'low', open: false, href: '' }],
      studies: [{ id: 'x', name: 'Seal 2kg', tool: 'Capability study', href: '' }], stops: { n: 3, minutes: 41 } } as unknown as LineMachineView;
    const l = lineMachinePaper('Line 2a', v);
    expect(l.facts).toEqual(['With P · 2 programs', 'Made by Ilapak']);
    expect(l.sections.map(s => [s.title, s.count])).toEqual([['The projects on it', '1'], ['Its programs', '1'], ['Its problems', '1 open of 2'], ['Studies of it', '1'], ['Its stops', '3 in 28 days']]);
    expect(l.sections[0].rows[0]).toEqual({ what: 'P', says: '3 tests · last: Seal failed 4 Oct', word: '1 open · 1 didn’t pass', tone: 'r' });
    expect(l.sections[2].rows.map(r => [r.word, r.tone])).toEqual([['Critical', 'r'], ['closed', 'g']]);
    expect(l.sections[4].rows[0]).toMatchObject({ what: '3 stops timed in the last 28 days', word: '41 minutes' });
  });
});
