/* The one-page status report (docs/SIMPLE.md): where we are, why we are not
   where we should be, what we are doing about it — read off the client
   report's own reading, so the two cannot disagree. */
import { describe, it, expect } from 'vitest';
import { clientReport } from '../clientReport';
import { STATUS_STEPS, statusReport } from '../statusReport';
import type { Project } from '../../types';
import type { Asset, Test } from '../testing';

const T = '2026-10-01';
const project = { id: 'p', name: 'Line 2 B', color: '#2b87d4', lead: 'Rowland', commissioning: true, expectedAt: '2026-10-20', plannedAt: '2026-10-10', createdAt: 1, updatedAt: 1 } as Project;
const asset = (id: string, name: string, sort: number): Asset => ({ id, projectId: 'p', name, state: 'onSite', sort, updatedAt: 1 } as Asset);
const test = (o: Partial<Test> & { id: string; title: string }): Test => ({ projectId: 'p', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });
const assets = [asset('bu', 'BU', 1), asset('ds', 'De-staker', 2)];
const fixes = Array.from({ length: 9 }, (_, i) => test({ id: `f${i}`, kind: 'fix', title: `Fix ${i}`, assetId: 'bu', plannedFor: i < 2 ? '2026-09-25' : '2026-10-05', withWhom: 'Brillopak' }));
const tests: Test[] = [
  test({ id: 't1', kind: 'test', title: 'Seal integrity', assetId: 'bu', ranOn: '2026-09-22', outcome: 'failed', result: '3 leaked in 20' }),
  test({ id: 'r1', kind: 'test', title: 'Performance run at the agreed rate', assetId: 'bu', ranOn: '2026-09-28', outcome: 'passed',
    runAgreed: { rate: 60, minutes: 60, rejectsMax: 1 }, run: { minutes: 60, packs: 3720, rejects: 14, speed: 64 } }),
  test({ id: 'r2', kind: 'test', title: 'Rate trial', assetId: 'ds' }),   // a run by name, with nothing on it
  test({ id: 's2', kind: 'install', title: 'Guarding fitted', assetId: 'ds', plannedFor: '2026-09-25' }),
  ...fixes,
];
const r = clientReport({ project, projects: [project], assets, tests, items: [], materials: [], programs: [], standards: [], today: T });

describe('the status report', () => {
  const s = statusReport(r);
  it('says where we are in one line: the verdict and the handover, not the list again', () => {
    expect(s.verdict.word).toBe(r.onTarget.word);
    expect(s.verdict.reason).not.toContain(' · ');
    expect(s.gates.map(g => g.label)).toEqual(r.gates.map(g => g.label));
  });
  it('names only what is wrong — late and didn’t pass — each once', () => {
    expect(s.why.map(w => w.kind)).toEqual(['late', 'failed']);
    expect(s.why[1].what).toContain('Seal integrity');
  });
  it('every line under "why" carries the record it is about, so the screen opens it (docs/FLOW.md item 1)', () => {
    expect(s.why.map(w => w.id)).toEqual(['s2', 't1']);
    const install = r.sections.find(g => g.gate === 'install');
    expect(install?.lateIds).toEqual(['s2']);
    expect(install?.late).toHaveLength(1);
  });
  it('the open fixes, late first, whose and by when — and says how many more', () => {
    expect(s.next).toHaveLength(6);
    expect(s.next[0].late && s.next[1].late).toBe(true);
    expect(s.next[0].what).toContain('Brillopak');
    expect(s.nextMore).toBe(3);
  });
  it('the performance runs with numbers, never a row of dashes', () => {
    expect(s.runs.map(x => x.title)).toEqual(['Performance run at the agreed rate']);
    expect(s.runs[0].net).toBe('61.8 ppm');
  });
  it('steps its lists down, the rest counted', () => {
    const tight = statusReport(r, STATUS_STEPS[STATUS_STEPS.length - 1]);
    /* The tightest step keeps two fixes (9 October: the runs and "waiting
       on" give way first, the programs' story last). */
    expect(tight.next).toHaveLength(2);
    expect(tight.nextMore).toBe(7);
  });
});

/* Rowland, 9 October: "we have numbers but not the story ... why 10? I see no
   reason ... I need a way to add commentary." */
describe('the story behind the numbers', () => {
  it('names which tests are still to run, machine by machine, the late first', () => {
    const t = r.waiting.find(w => w.key === 'tests');
    expect(t?.what).toBe('Commission tests still to run');
    expect(t?.names).toContain('De-staker — Rate trial');
  });
  it('names each fix still to do, late ones said late', () => {
    const f = r.waiting.find(w => w.key === 'fixes');
    expect(f?.names?.[0]).toBe('BU — Fix 0 (late)');
    expect(f?.names).toHaveLength(9);
  });
  it('carries the lead’s commentary, whole on both — cut on the one page only when long, saying so', () => {
    const said = clientReport({ project: { ...project, reportNote: '  Behind on the BU, caught up by Friday.  ', reportNoteAt: Date.parse('2026-10-01T10:00:00') },
      projects: [project], assets, tests, items: [], materials: [], programs: [], standards: [], today: T });
    expect(said.commentary).toMatchObject({ text: 'Behind on the BU, caught up by Friday.', by: 'Rowland' });
    expect(statusReport(said).commentary?.text).toBe('Behind on the BU, caught up by Friday.');
    const long = clientReport({ project: { ...project, reportNote: 'word '.repeat(200) }, projects: [project], assets, tests, items: [], materials: [], programs: [], standards: [], today: T });
    expect(long.commentary?.text.length).toBeGreaterThan(900);
    expect(statusReport(long).commentary?.text).toMatch(/… \(the rest in the full report\)$/);
    expect(statusReport(long).commentary?.text.length).toBeLessThan(560);
    expect(r.commentary).toBeUndefined();
  });
  it('gives every problem, risk and fix its id, so the Reports screen can open it', () => {
    expect(statusReport(r).next.every(n => !!n.id)).toBe(true);
  });
});
