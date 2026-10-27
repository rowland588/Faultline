import { describe, expect, it } from 'vitest';
import { openOnMachine, machineTests, type MachineRecord } from '../machineRecord';

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
