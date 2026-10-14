/* THE STAGE-GATE PAPERS KEEP UP WITH THE APP (docs/REPORTS.md, "Relevance";
 * docs/AUDIT.md bar 8). Rowland, 14 October: "Check the stage gate report
 * must make sure they maintain relevance when things change in the app ..
 * new functions the app does but also all changes in status. Check full
 * report, 1 page status, programs, handover."
 *
 * One job, and every change of status the screens show, each read on all
 * four papers — the full client report (lib/clientReport), the one-page
 * status (lib/statusReport), the programs report (the Set up reading
 * lib/programsReportPdf prints, and the line's own) and the handover
 * (lib/handoverReport). A row of this matrix that goes missing is a paper
 * that has stopped saying what the app says. */
import { describe, expect, it } from 'vitest';
import { clientReport, type ClientReportInput } from '../clientReport';
import { statusReport } from '../statusReport';
import { handoverReport } from '../handoverReport';
import type { Asset, Test, TestItem } from '../testing';
import type { Program } from '../programs';
import type { ToolStudy } from '../study';
import type { Snag } from '../../snag/types';
import type { Project } from '../../types';

const T = '2026-10-08';
const at = Date.parse(`${T}T10:00:00`);
const day = (iso: string) => Date.parse(`${iso}T00:00:00`);
const project = { id: 'p', name: 'Line 7 rebuild', color: '#2b87d4', lead: 'Rowland', commissioning: true, plannedAt: '2026-10-20', expectedAt: '2026-10-20', createdAt: 1, updatedAt: 1 } as Project;
const asset = (id: string, name: string, sort: number, extra: Partial<Asset> = {}) => ({ id, projectId: 'p', name, state: 'onSite', sort, createdAt: 1, updatedAt: 1, ...extra }) as unknown as Asset;
const test = (o: Partial<Test> & { id: string; title: string }): Test => ({ projectId: 'p', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });
const part = (id: string, testId: string, what: string, extra: Partial<TestItem> = {}) =>
  ({ id, projectId: 'p', testId, kind: 'next', what, sort: 1, createdAt: 1, updatedAt: 1, ...extra }) as TestItem;
const prog = (id: string, what: string, extra: Partial<Program> = {}) =>
  ({ id, projectId: 'p', what, state: 'onMachine', sort: 10, createdAt: 1, updatedAt: 1, ...extra }) as Program;
const snag = (id: string, problem: string, extra: Partial<Snag> = {}): Snag =>
  ({ id, workspaceId: 'ws7', problem, status: 'open', raisedAt: at - 5_000, updatedAt: 1, media: [], projectId: 'p', ...extra }) as Snag;
const study = (id: string, name: string, extra: Partial<ToolStudy>): ToolStudy =>
  ({ id, tool: 'capability', name, projectId: 'p', facts: { readings: [] }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...extra }) as ToolStudy;

const assets = [
  asset('w', 'Ilapak flow wrapper', 1),
  /* due on site 3 Oct, not here — late on site */
  asset('k', 'Checkweigher', 2, { state: 'awaited', dueOn: '2026-10-03' } as Partial<Asset>),
];
const tests: Test[] = [
  test({ id: 'i1', kind: 'install', title: 'Positioned and levelled', assetId: 'w', outcome: 'passed', ranOn: '2026-10-01' }),
  test({ id: 's1', kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: 'w' }),
  test({ id: 't1', kind: 'test', title: 'Weight accuracy', assetId: 'w', outcome: 'passed', ranOn: T }),
];
const items: TestItem[] = [
  /* a program the floor said failed, and one said not tested */
  part('a', 's1', 'PR-04 Finest Red 2 kg', { results: [{ is: 'failed', on: T, note: 'Bag 8 mm short', at }] }),
  part('b', 's1', 'PR-09 Express 1.25 kg', { results: [{ is: 'notTested', on: T, note: 'Film not in yet', at }] }),
  /* a problem with no fix, on the wrapper */
  { id: 'n1', projectId: 'p', testId: 'i1', kind: 'found', what: 'Guard switch loose', sort: 1, createdAt: at, updatedAt: at } as TestItem,
];
const programs = [
  /* proved, signed off with nothing said — but a study on its line names it */
  prog('p7', 'PR-07 Baking 2 kg', { assetId: 'w', state: 'proved', provedOn: '2026-10-06' }),
  /* the job's own, on the line itself — not written yet */
  prog('pl', 'Line recipe master', { state: 'needed', from: 'Ishida' }),
];
const studies = [
  study('st1', 'Weight 2 kg', { programId: 'p7' }),
  /* the test's proof, at the line */
  study('st2', 'Checkweigh accuracy', { uses: [{ kind: 'test', ref: 't1', role: 'proof' }] } as Partial<ToolStudy>),
];
const assigned = [
  snag('sn1', 'Film tracks off the former', { priority: 'critical', targetAsset: 'Ilapak flow wrapper', owner: 'Priya', dueAt: day('2026-10-07') }),
  snag('sn2', 'Paint chipped on the guard', { priority: 'low' }),
  /* already sent to the job as a problem — on the job, not "not on it yet" */
  snag('sn3', 'Already on the job', { sent: [{ projectId: 'p', itemId: 'x', at: 1 }] }),
  /* another job's, and one put away */
  snag('sn4', 'Another job’s', { projectId: 'q' }),
  snag('sn5', 'Put away', { archivedAt: 5 }),
];
const linePrograms = [{
  name: 'Line 7', id: 'ws7', machines: [{ name: 'Checkweigher' }],
  /* the line's own, planned with no job: its test day gone by */
  programs: [prog('lp1', 'CW recipe 2 kg', { projectId: '', testOn: '2026-10-05' } as Partial<Program>)],
}];
const input: ClientReportInput = {
  project, projects: [project], assets, tests, items, materials: [], programs, standards: [], today: T,
  studies, proofStudies: studies, linePrograms, assigned, lineName: () => 'Line 7',
};
const full = clientReport(input);
const status = statusReport(full);
const handover = handoverReport({ ...input, project });
const setup = full.sections.find(s => s.gate === 'setup');
const install = full.sections.find(s => s.gate === 'install');
const commission = full.sections.find(s => s.gate === 'commission');
const wrapper = handover.machines.find(m => m.name === 'Ilapak flow wrapper');

describe('a machine late on site', () => {
  it('full: Install’s late list and its count', () => {
    expect(install?.late[0]).toBe('Checkweigher — not on site, was due 3 Oct');
    expect(install?.lateIds?.[0]).toBe('k');
    expect(install?.says).toMatch(/· 1 machine late on site/);
  });
  it('status: a LATE line that opens the machine', () => {
    expect(status.why.find(w => w.id === 'k')).toMatchObject({ kind: 'late', tag: 'LATE', what: 'Checkweigher — not on site, was due 3 Oct' });
  });
  it('handover: where it is', () => {
    expect(handover.machines.find(m => m.name === 'Checkweigher')?.at).toMatch(/due on site/i);
  });
});

describe('a program that failed, and one not tested', () => {
  it('full and programs report: in the Set up reading, failed apart from done', () => {
    expect(setup?.programs?.failed).toBe(1);
    expect(setup?.programs?.notTested).toBe(1);
    expect(setup?.failed?.some(l => l.includes('PR-04 Finest Red 2 kg'))).toBe(true);
  });
  it('status: a DIDN’T PASS line', () => {
    expect(status.why.some(w => w.kind === 'failed' && w.what.includes('PR-04'))).toBe(true);
  });
  it('handover: each still open on its machine, in the Programs page’s word', () => {
    expect(wrapper?.open).toContain('Program, didn’t pass: PR-04 Finest Red 2 kg — Bag 8 mm short');
    expect(wrapper?.open).toContain('Program, not tested: PR-09 Express 1.25 kg — Film not in yet');
    expect(wrapper?.programs).toBe('3 programs · 1 done — 1 passed · 1 failed · 1 to do');
  });
});

describe('a program proved by a study on its line', () => {
  const line = setup?.programs?.lines.find(l => l.what === 'PR-07 Baking 2 kg');
  it('full and programs report: says the study, never “signed off by hand”', () => {
    expect(line?.proof?.word).toMatch(/^Proved by the capability study “Weight 2 kg”/);
  });
  it('without the line’s studies it would have said nothing shows it — the gap this closes', () => {
    const bare = clientReport({ ...input, studies: [], proofStudies: [] });
    expect(bare.sections.find(s => s.gate === 'setup')?.programs?.lines.find(l => l.what === 'PR-07 Baking 2 kg')?.proof?.word)
      .toBe('Signed off by hand — nothing said shows it');
  });
});

describe('a program on the line itself, not written yet', () => {
  it('handover: still open on the line — no machine’s list reads it', () => {
    expect(handover.line).toContain('Program, not done yet: Line recipe master · Ishida');
  });
});

describe('a test proved by a study', () => {
  it('full: under the test, as the handover says it', () => {
    const t = commission?.tests?.find(x => x.title === 'Weight accuracy');
    expect(t?.proved).toMatch(/^Proved by: /);
    expect(wrapper?.tests.find(x => x.title === 'Weight accuracy')?.proved).toBe(t?.proved);
  });
});

describe('the line’s own programs, planned with no job', () => {
  it('full and programs report: the line’s reading, after the job’s', () => {
    expect(setup?.linePrograms?.map(l => [l.line, l.reading.says])).toEqual([['Line 7', '1 program · 0 done · 1 late']]);
  });
  it('status: a line under the programs', () => {
    expect(status.linePrograms).toEqual(['On Line 7, with no job — 1 program · 0 done · 1 late']);
  });
  it('handover: the line’s reading and the one not done', () => {
    expect(handover.linePrograms).toEqual([{ line: 'Line 7', says: '1 program · 0 done · 1 late', open: ['The line — CW recipe 2 kg: on the machine · test was due 5 Oct'] }]);
  });
});

describe('problems on the register for this job, not on it yet', () => {
  it('full: the Fixes page’s list — critical first, its day gone said', () => {
    expect(full.assigned.map(a => [a.id, a.priority, a.late])).toEqual([['sn1', 'critical', true], ['sn2', 'low', false]]);
    expect(full.assigned[0]).toMatchObject({ what: 'Film tracks off the former', meta: 'Line 7 · Ilapak flow wrapper · Priya', due: 'was due 7 Oct' });
  });
  it('status: NOT ON IT YET, each opening the problem where it is kept', () => {
    const w = status.why.filter(x => x.kind === 'assigned');
    expect(w.map(x => [x.tag, x.what, x.snagId])).toEqual([
      ['NOT ON IT YET', 'Critical priority — Film tracks off the former', 'sn1'],
      ['NOT ON IT YET', 'Low priority — Paint chipped on the guard', 'sn2'],
    ]);
    /* a Critical one is read with the critical issues, before what is late; a Low one after */
    const ix = (f: (w: (typeof status.why)[number]) => boolean) => status.why.findIndex(f);
    expect(ix(w => w.snagId === 'sn1')).toBeLessThan(ix(w => w.kind === 'late'));
    expect(ix(w => w.snagId === 'sn2')).toBeGreaterThan(ix(w => w.kind === 'failed'));
  });
  it('handover: on the machine it names, else on the line', () => {
    expect(wrapper?.open).toContain('Problem for this job, not on it yet (Critical): Film tracks off the former — Line 7 · Ilapak flow wrapper · Priya · was due 7 Oct');
    expect(handover.line).toContain('Problem for this job, not on it yet (Low): Paint chipped on the guard — Line 7 · nobody yet');
  });
});

describe('a problem with no fix', () => {
  it('handover: still open on its machine', () => {
    expect(wrapper?.open).toContain('Problem, no fix: Guard switch loose — Positioned and levelled');
  });
  it('full: in Problems with no fix', () => {
    expect(full.noted.open.some(l => l.startsWith('Guard switch loose'))).toBe(true);
  });
});

describe('a gate’s missing stages', () => {
  it('full: Not added yet under the gate, in Needs you’s words', () => {
    expect(install?.gaps).toEqual(['Checkweigher — none of the stages yet', 'Ilapak flow wrapper — 5 stages not added yet']);
  });
  it('status: one grey NOT ADDED line a gate, after the abnormal', () => {
    const i = status.why.findIndex(w => w.tag === 'NOT ADDED');
    expect(status.why[i]?.what).toMatch(/^Install: /);
    expect(status.why.slice(i).every(w => w.kind === 'unplanned')).toBe(true);
  });
});

describe('a machine handed over — what it went with', () => {
  /* the case packer: every gate done, a program on it failed and a problem
     with no fix — "handed over with" says both, on the full report and the handover */
  const hoAssets = [asset('c', 'Case packer', 1)];
  const hoTests: Test[] = [
    test({ id: 'ci', kind: 'install', title: 'Positioned and levelled', assetId: 'c', outcome: 'passed', ranOn: '2026-10-01' }),
    test({ id: 'cs', kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: 'c', outcome: 'passed', ranOn: '2026-10-02' }),
    test({ id: 'ct', kind: 'test', title: 'Case rate', assetId: 'c', outcome: 'passed', ranOn: '2026-10-03' }),
    test({ id: 'ch', kind: 'install', gate: 'handover', title: 'Manuals handed over', assetId: 'c', outcome: 'passed', ranOn: '2026-10-04' }),
  ];
  const hoItems: TestItem[] = [
    part('cp', 'cs', 'Case recipe 6-up', { results: [{ is: 'failed', on: '2026-10-05', note: 'Flaps open', at }] }),
    { id: 'cn', projectId: 'p', testId: 'ci', kind: 'found', what: 'Guard bent', sort: 1, createdAt: at, updatedAt: at } as TestItem,
  ];
  const x = { ...input, assets: hoAssets, tests: hoTests, items: hoItems, programs: [], linePrograms: [], assigned: [] };
  const r = clientReport(x), h = handoverReport({ ...x, project });
  it('full and handover say the same', () => {
    const m = h.machines[0];
    expect(m.at).toMatch(/^Handed over/);
    expect(m.with).toEqual(expect.arrayContaining(['1 program didn’t pass', '1 problem with no fix']));
    expect(r.machines[0].with).toEqual(m.with);
  });
});
