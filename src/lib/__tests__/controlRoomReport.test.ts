/* THE CONTROL ROOM REPORT, AS DATA (lib/controlRoomReport).
 *
 * The page that goes to the business reads the control room's own reading
 * (lib/portfolio), so the two cannot disagree: every job on it at every step,
 * its verdict and its late; the lists under them stepping down, each saying
 * how many more the control room holds. */
import { describe, it, expect } from 'vitest';
import { CR_STEPS, controlRoomReport } from '../controlRoomReport';
import { portfolio, type JobInput } from '../portfolio';
import type { Project } from '../../types';
import type { Test } from '../testing';

const TODAY = '2026-09-29';
let n = 0;
const project = (o: Partial<Project> & { id: string; name: string }): Project =>
  ({ color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true, ...o }) as Project;
const test = (o: Partial<Test> = {}): Test =>
  ({ id: `t${++n}`, projectId: 'p', title: `Test ${n}`, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const job = (p: Project, o: Partial<JobInput> = {}): JobInput =>
  ({ project: p, tests: [], items: [], materials: [], programs: [], assets: [], ...o });

const late = (who: string, day: string, title: string) => test({ title, withWhom: who, plannedFor: day, outcome: 'notRun' });
const jobs = [
  job(project({ id: 'b', name: 'Line 2B', expectedAt: '2026-10-26', plannedAt: '2026-10-18' }), {
    tests: [late('Ilapak UK', '2026-09-23', 'Changeover'), late('Ilapak UK', '2026-09-24', 'Seal'), late('Ishida Europe', '2026-09-25', 'Weigher'),
      test({ title: 'Speed run', withWhom: 'Ilapak UK', plannedFor: '2026-10-01' })],
  }),
  job(project({ id: 'a', name: 'Line 2A', expectedAt: '2026-11-16' }), {
    tests: [late('Multivac UK', '2026-09-22', 'Seal — tray'), late('Domino UK', '2026-09-26', 'Coder')],
  }),
];
const pf = portfolio(jobs, TODAY);

describe('the control room report', () => {
  it('carries every job, its verdict and its late, at every step', () => {
    for (const step of CR_STEPS) {
      const r = controlRoomReport(pf, TODAY, step);
      expect(r.jobs.map(j => j.name)).toEqual(pf.jobs.map(j => j.name));
      r.jobs.forEach((j, i) => {
        expect(j.word).toBe(pf.jobs[i].onTarget?.word ?? (pf.jobs[i].late ? 'Behind' : 'Under way'));
        expect(j.late).toBe(pf.jobs[i].late);
      });
    }
  });

  it('says what the control room says, word for word', () => {
    const r = controlRoomReport(pf, TODAY);
    expect(r.says).toBe(pf.says);
    expect(r.totals).toEqual(pf.totals);
  });

  it('lists everything late at the longest step, and says how many more when stepped down', () => {
    const all = pf.items.filter(x => x.late).length;
    expect(all).toBe(5);
    const long = controlRoomReport(pf, TODAY, CR_STEPS[0]);
    expect(long.late).toHaveLength(5);
    expect(long.lateMore).toBe(0);
    expect(long.late.every(l => l.late && /^was /.test(l.when))).toBe(true);
    const short = controlRoomReport(pf, TODAY, CR_STEPS[CR_STEPS.length - 1]);
    expect(short.late).toHaveLength(0);
    expect(short.lateMore).toBe(5);
    expect(short.owes).toHaveLength(0);
    expect(short.owesMore).toBe(pf.owes.length);
  });

  it('splits what each party owes by job, while there is room', () => {
    const r = controlRoomReport(pf, TODAY, CR_STEPS[0]);
    const ilapak = r.owes.find(o => o.who === 'Ilapak UK');
    expect(ilapak).toMatchObject({ open: 3, late: 2, jobs: 'Line 2B: 3' });
    expect(controlRoomReport(pf, TODAY, CR_STEPS[CR_STEPS.length - 1]).owes.every(o => !o.jobs)).toBe(true);
  });

  it('keeps the week to what is not already late', () => {
    const r = controlRoomReport(pf, TODAY, CR_STEPS[0]);
    expect(r.week.every(l => !l.late)).toBe(true);
    expect(r.week.map(l => l.what)).toContain('Speed run');
  });

  it('cuts a long name to one line, its whole name in its own report', () => {
    const long = portfolio([job(project({ id: 'l', name: 'Line 9 — the very long name of a line that goes on and on past any sensible length' }))], TODAY);
    const r = controlRoomReport(long, TODAY);
    expect(r.jobs[0].name.length).toBeLessThanOrEqual(61);
    expect(r.jobs[0].name.endsWith('…')).toBe(true);
  });
});
