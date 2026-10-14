/* PROGRAMS PICKED IN COMMISSION (lib/commissionPrograms; Rowland, 14 October:
 * "you can't pick a program from commissioning, which you should be able
 * to"). A job on Line 7 with two machines; two programs of its own and three
 * of the line's own — one on a machine the job has (by name), one on a
 * machine it has not, one on the line itself. */
import { describe, expect, it } from 'vitest';
import { commissionPrograms, programsToPick, provingPlans } from '../commissionPrograms';
import { provingTitle, type Program } from '../programs';
import type { Asset, Test } from '../testing';
import type { JobLinePrograms } from '../lineRecords';

const t0 = 1_700_000_000_000;
const asset = (id: string, name: string): Asset => ({ id, projectId: 'j', name, state: 'installed', sort: 1, createdAt: t0, updatedAt: t0 } as Asset);
const prog = (id: string, what: string, o: Partial<Program> = {}): Program => ({ id, projectId: 'j', what, state: 'onMachine', sort: 1, createdAt: t0, updatedAt: t0, ...o });
const test = (id: string, programId: string, o: Partial<Test> = {}): Test => ({ id, projectId: 'j', title: `Prove program ${programId}`, kind: 'test', outcome: 'planned', programId, sort: 1, createdAt: t0, updatedAt: t0, ...o } as Test);

const assets = [asset('a1', 'Bagger'), asset('a2', 'Checkweigher')];
const job = [prog('j1', 'PR-04 Finest Red', { assetId: 'a1', runs: 'Finest Red 2kg' }), prog('j2', 'PR-07 Baking', { assetId: 'a2', state: 'proved', provedOn: '2026-10-10' })];
/* the line's machines: its own records, one named as the job's Bagger */
const lineBagger = { ...asset('m1', 'bagger '), projectId: '' } as Asset;
const lineCoder = { ...asset('m2', 'Coder'), projectId: '' } as Asset;
const lines: JobLinePrograms[] = [{ id: 'w7', name: 'Line 7', machines: [{ name: 'Bagger', record: lineBagger }, { name: 'Coder', record: lineCoder }],
  programs: [prog('l1', 'LP-1 Tesco', { projectId: '', assetId: 'm1', runs: 'Tesco 2kg', testOn: '2026-10-16', from: 'Ishida' }), prog('l2', 'LP-2 Code', { projectId: '', assetId: 'm2' }), prog('l3', 'LP-3 Clean', { projectId: '' })] }];

describe('programs to pick in Commission', () => {
  it('the job’s own, then the line’s own, each on this job’s machine by name', () => {
    const g = programsToPick(job, lines, assets, []);
    expect(g.map(x => x.title)).toEqual(['This job’s programs', 'Line 7’s own programs']);
    expect(g[0].rows.map(r => [r.program.id, r.machine, r.assetId, r.proved])).toEqual([['j1', 'Bagger', 'a1', false], ['j2', 'Checkweigher', 'a2', true]]);
    /* LP-1 on the line's Bagger is the job's Bagger; LP-2's Coder is not on this job; LP-3 is the line's */
    expect(g[1].rows.map(r => [r.program.id, r.machine ?? null, r.assetId ?? null])).toEqual([['l1', 'Bagger', 'a1'], ['l2', 'Coder', null], ['l3', null, null]]);
  });
  it('a program with a test on this job carries it', () => {
    const g = programsToPick(job, lines, assets, [test('t1', 'l1')]);
    expect(g[1].rows[0].test?.id).toBe('t1');
    expect(g[1].rows[1].test).toBeUndefined();
  });
  it('a pick plans a proving test each, on its machine, with what the program says', () => {
    const g = programsToPick(job, lines, assets, []);
    expect(provingPlans([g[1].rows[0], g[1].rows[2]], provingTitle)).toEqual([
      { title: 'Prove program LP-1 Tesco', assetId: 'a1', extra: { programId: 'l1', planned: 'Tesco 2kg', plannedFor: '2026-10-16', withWhom: 'Ishida' } },
      { title: 'Prove program LP-3 Clean', extra: { programId: 'l3' } },
    ]);
  });
});

describe('what the board counts', () => {
  it('the job’s own always; a line’s only once this job has a test for it — on the job’s machine', () => {
    expect(commissionPrograms(job, lines, assets, []).map(p => p.id)).toEqual(['j1', 'j2']);
    const withTest = commissionPrograms(job, lines, assets, [test('t1', 'l1'), test('t2', 'l2')]);
    expect(withTest.map(p => [p.id, p.assetId ?? null])).toEqual([['j1', 'a1'], ['j2', 'a2'], ['l1', 'a1'], ['l2', null]]);
  });
  it('a deleted test does not bring a line’s program on', () => {
    expect(commissionPrograms(job, lines, assets, [test('t1', 'l1', { deletedAt: t0 })]).map(p => p.id)).toEqual(['j1', 'j2']);
  });
});
