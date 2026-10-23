/* ONE READER PER PROJECT, ONE ANSWER PER KIND (docs/STEADY.md, S2). */
import { describe, expect, it } from 'vitest';
import { KINDS, kindFacts, kindOf } from '../projectKind';
import { journeyInputOf, owedAndDone, projectRead, registerRow } from '../projectRead';
import type { JobInput, PacedInput } from '../../lib/portfolio';
import type { Project } from '../../types';
import type { PaceTodoRow } from '../../db/rows';

const TODAY = '2026-10-21';
const at = (iso: string) => new Date(`${iso}T10:00:00`).getTime();
const project = (o: Partial<Project> = {}): Project => ({ id: 'p1', name: 'Line 2 commissioning', color: '#000', createdAt: at('2026-10-01'), updatedAt: 1, ...o } as Project);
const step = (o: Partial<PaceTodoRow> & { what: string }): PaceTodoRow =>
  ({ id: `s${o.what}`, projectId: 'p1', where: '', why: '', who: '', when: '', state: 'todo', createdAt: 1, updatedAt: 1, ...o });

describe('one answer per kind', () => {
  it('a project is a stage gate, a 6M project or a lever tree — by the one ask', () => {
    expect(kindOf({ commissioning: true } as never)).toBe('stagegate');
    expect(kindOf({ leverTree: { nodes: [] } } as never)).toBe('tree');
    expect(kindOf({} as never)).toBe('sixm');
  });
  it('each kind says its word, its own work, its report page and its papers — the journey on every one', () => {
    expect(Object.keys(KINDS)).toEqual(['stagegate', 'sixm', 'tree']);
    expect(KINDS.stagegate.papers.map(p => p.label)).toEqual(['Status report — 1 page', 'Client report — every detail', 'Journey report — this week and next']);
    expect(KINDS.sixm.papers.map(p => p.label)).toEqual(['Status report — 1 page', 'Client report — every detail', 'Journey report — this week and next']);
    expect(KINDS.tree.papers.map(p => p.label)).toEqual(['Client report — A3', 'Journey report — this week and next']);
    expect(KINDS.stagegate.reportTo('p1')).toBe('/project/p1/report');
    expect(KINDS.sixm.papers[1].to('p1')).toBe('/pace-report?project=p1&doc=full');
    expect(kindFacts({ commissioning: true } as never).label).toBe('Stage gate');
  });
});

describe('one reader: everything owed and done', () => {
  const gate: JobInput = { project: project({ commissioning: true } as never), tests: [
    { id: 't1', projectId: 'p1', title: 'Seal integrity', outcome: 'passed', ranOn: '2026-10-19', sort: 1, createdAt: 1, updatedAt: 1 } as never,
    { id: 't2', projectId: 'p1', title: 'Weight accuracy', outcome: 'planned', plannedFor: '2026-10-18', sort: 2, createdAt: 1, updatedAt: 1 } as never,
  ], items: [], assets: [], materials: [], programs: [] };
  const steps = [step({ what: 'Time the changeover', tool: 'changeover', due: '2026-10-20' }), step({ what: 'Count a shift', tool: 'losses', state: 'done', doneOn: '2026-10-16' })];
  const register = [registerRow({ id: 'sn1', workspaceId: 'w', problem: 'Coder misprints', status: 'closed', raisedAt: at('2026-10-10'), closedAt: at('2026-10-20'), projectId: 'p1', updatedAt: 1 } as never, () => 'Line 2')];

  it('a stage gate owes its plan and its own actions; done is the tests run, the actions done and the problems closed', () => {
    const { owed, done } = owedAndDone(gate, undefined, steps, register, TODAY);
    expect(owed.map(x => [x.kind, x.what, x.late])).toEqual([['test', 'Weight accuracy', true], ['action', 'SMED: Time the changeover', true]]);
    expect(done.map(d => [d.what, d.on])).toEqual([['Coder misprints', '2026-10-20'], ['Seal integrity', '2026-10-19'], ['Count a shift', '2026-10-16']]);
  });
  it('a 6M project owes its board, what it waits on and its checks', () => {
    const paced: PacedInput = { project: project(), steps, lines: [], atTarget: 0, judged: 0, materials: [{ id: 'm1', projectId: 'p1', what: 'Film', due: '2026-10-15', sort: 1, createdAt: 1, updatedAt: 1 } as never], programs: [] };
    const { owed, done } = owedAndDone(undefined, paced, steps, [], TODAY);
    expect(owed.map(x => [x.kind, x.what, x.late])).toEqual([['action', 'SMED: Time the changeover', true], ['material', 'Film', true]]);
    expect(done.map(d => d.what)).toEqual(['Count a shift']);
  });
  it('the journey reads a stage gate through its gate and a 6M project’s materials, programs and studies by the day', () => {
    const own = { steps, register, notes: [], studies: [], lines: [] };
    expect(Object.keys(journeyInputOf(gate, undefined, own))).toEqual(['gate', 'steps', 'register', 'notes', 'studies']);
    const paced: PacedInput = { project: project(), steps, lines: [], atTarget: 0, judged: 0, materials: [], programs: [] };
    expect(Object.keys(journeyInputOf(undefined, paced, own))).toEqual(['materials', 'programs', 'steps', 'register', 'notes', 'studies']);
  });
  it('the whole read: kind, owed, done, the journey and the week line, from one call', () => {
    const r = projectRead(gate.project, { gate: [gate], paced: [] }, { steps, register, notes: [], studies: [], lines: [] }, TODAY);
    expect(r.kind).toBe('stagegate');
    expect(r.started).toBe('2026-10-01');
    expect(r.owed.length).toBe(2);
    expect(r.week.text).toBe('This week and next: 2 done · 2 still to do (2 late) · 0 planned.');
  });
});
