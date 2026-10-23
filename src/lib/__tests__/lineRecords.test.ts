import { describe, expect, it } from 'vitest';
import {
  isWholeLine, lineMachineId, lineOfMachine, lineOfProgram, lineProgramsReading, machineKey, machinesOf, machinesOnLine, onlyLineOf, productsOnLine, programsOnLine,
  type JobLine,
} from '../lineRecords';
import { proofOf, type ProgramLine } from '../programsReport';
import { lineTiles, type LineReading } from '../lineLean';
import type { Asset, Test } from '../testing';
import type { Program } from '../programs';
import type { ToolStudy } from '../study';

const jobLines: JobLine[] = [
  { id: 'jl-a', projectId: 'job-one', workspaceId: 'ws-7' },
  { id: 'jl-b', projectId: 'job-two', workspaceId: 'ws-7' },
  { id: 'jl-c', projectId: 'job-two', workspaceId: 'ws-8' },
  { id: 'jl-d', projectId: 'job-gone', workspaceId: 'ws-9', deletedAt: 5 },
];
const asset = (x: Partial<Asset> & Pick<Asset, 'id' | 'name'>): Asset => ({ projectId: '', state: 'running', sort: 0, updatedAt: 1, ...x });
const prog = (x: Partial<Program> & Pick<Program, 'id' | 'what'>): Program => ({ projectId: '', state: 'needed', sort: 10, createdAt: 1, updatedAt: 1, ...x });

describe('which line a record is on', () => {
  it('a job on one factory line is on that line; on two, on neither', () => {
    expect(onlyLineOf('job-one', jobLines)).toBe('ws-7');
    expect(onlyLineOf('job-two', jobLines)).toBeUndefined();
    expect(onlyLineOf('job-gone', jobLines)).toBeUndefined();
    expect(onlyLineOf('', jobLines)).toBeUndefined();
  });
  it('a program: its own line, else the job line it names, else the job\'s only line', () => {
    expect(lineOfProgram({ projectId: '', workspaceId: 'ws-3' }, jobLines)).toBe('ws-3');
    expect(lineOfProgram({ projectId: 'job-two', lineId: 'jl-c' }, jobLines)).toBe('ws-8');
    expect(lineOfProgram({ projectId: 'job-one' }, jobLines)).toBe('ws-7');
    expect(lineOfProgram({ projectId: 'job-two' }, jobLines)).toBeUndefined();
  });
  it('a machine: its own line, else its job\'s only line', () => {
    expect(lineOfMachine({ projectId: 'job-one' }, jobLines)).toBe('ws-7');
    expect(lineOfMachine({ projectId: 'job-two', workspaceId: 'ws-8' }, jobLines)).toBe('ws-8');
    expect(lineOfMachine({ projectId: 'job-two' }, jobLines)).toBeUndefined();
  });
});

describe('the line\'s machines in flow order', () => {
  const ws = { id: 'ws-7', assets: ['Bagger', 'Whole line', 'Checkweigher', 'bagger', 'Case packer'] };
  const assets = [
    asset({ id: 'a1', name: 'checkweigher', workspaceId: 'ws-7', oem: 'Ishida' }),
    asset({ id: 'a2', name: 'Robot palletiser', projectId: 'job-one', sort: 2 }),
    asset({ id: 'a3', name: 'Bagger', projectId: 'job-one', sort: 1 }),
    asset({ id: 'a4', name: 'Old wrapper', workspaceId: 'ws-7' }),
    asset({ id: 'a5', name: 'Bagger', workspaceId: 'ws-8' }),
    asset({ id: 'a6', name: 'Case packer', workspaceId: 'ws-7', deletedAt: 9 }),
  ];
  const m = machinesOnLine(ws, assets, jobLines);
  it('the list\'s names in its order, "Whole line" and a repeat left out', () => {
    expect(m.map(x => x.name)).toEqual(['Bagger', 'Checkweigher', 'Case packer', 'Robot palletiser']);
  });
  it('each joined to its record on the line by name, whatever its case', () => {
    expect(m[1].record?.oem).toBe('Ishida');
    expect(m[0].record?.id).toBe('a3');
    expect(m[0].jobId).toBe('job-one');
    expect(m[2].record).toBeUndefined();
  });
  it('a machine a job brought in that the list does not name comes after; the line\'s own that left the list has left the line', () => {
    expect(m[3]).toMatchObject({ name: 'Robot palletiser', jobId: 'job-one' });
    expect(m.some(x => x.name === 'Old wrapper')).toBe(false);
  });
  it('the line\'s own record wins over a job\'s of the same name', () => {
    const both = machinesOnLine({ id: 'ws-7', assets: ['Bagger'] }, [...assets, asset({ id: 'a7', name: 'BAGGER', workspaceId: 'ws-7' })], jobLines);
    expect(both[0].record?.id).toBe('a7');
    expect(both[0].jobId).toBeUndefined();
  });
});

/* Flow audit #14, 13 October: "One line has three lists of machines. The
 * problem sheet offers another line's machines. The stopwatch offers 1 of 4." */
describe('every "which machine" on a line', () => {
  const lines: JobLine[] = [
    { id: 'jl-1', projectId: 'job-one', workspaceId: 'ws-7' },
    { id: 'jl-2', projectId: 'job-many', workspaceId: 'ws-7' },
    { id: 'jl-3', projectId: 'job-many', workspaceId: 'ws-8' },
    { id: 'jl-4', projectId: 'job-other', workspaceId: 'ws-8' },
  ];
  const assets = [
    asset({ id: 'w', name: 'Ilapak flow wrapper', projectId: 'job-one', sort: 10 }),
    asset({ id: 'c', name: 'Checkweigher', workspaceId: 'ws-7', sort: 0 }),
    asset({ id: 'x', name: 'Another line wrapper', projectId: 'job-other', sort: 10 }),
    asset({ id: 'm', name: 'Robot', projectId: 'job-many', sort: 20 }),
    asset({ id: 'n', name: 'Robot two', projectId: 'job-many', workspaceId: 'ws-8', sort: 30 }),
  ];
  const ws = { id: 'ws-7', assets: ['Whole line', 'Bagger', 'checkweigher'] };
  it('the line\'s list in flow order, then what its jobs brought onto it — never another line\'s, never "Whole line"', () => {
    expect(machinesOf(ws, assets, lines)).toEqual(['Bagger', 'checkweigher', 'Ilapak flow wrapper']);
  });
  it('a job on several lines adds its machines not yet on any one line — only on a line it is on', () => {
    expect(machinesOf(ws, assets, lines, 'job-many')).toEqual(['Bagger', 'checkweigher', 'Ilapak flow wrapper', 'Robot']);
    expect(machinesOf(ws, assets, lines, 'job-other')).toEqual(['Bagger', 'checkweigher', 'Ilapak flow wrapper']);
    expect(isWholeLine(' whole  LINE ')).toBe(true);
  });
});

describe('the line\'s programs and products', () => {
  const programs = [
    prog({ id: 'p1', what: 'P-104', workspaceId: 'ws-7', sort: 30, runs: 'Finest Red 2kg' }),
    prog({ id: 'p2', what: 'P-105', projectId: 'job-one', sort: 10, runs: 'finest red 2kg' }),
    prog({ id: 'p3', what: 'P-106', projectId: 'job-two', sort: 20 }),
    prog({ id: 'p4', what: 'P-107', workspaceId: 'ws-7', sort: 5, deletedAt: 3 }),
  ];
  it('every program on the line in the order set, a job\'s found on its line', () => {
    expect(programsOnLine('ws-7', programs, jobLines).map(p => p.id)).toEqual(['p2', 'p1']);
  });
  it('the products: what the programs run and what the standards map, once each', () => {
    expect(productsOnLine(programs, [{ product: 'Express 1.25 kg' }, { product: 'FINEST RED 2KG' }, { product: 'Gone', deletedAt: 2 }]))
      .toEqual(['Finest Red 2kg', 'Express 1.25 kg']);
  });
});

/* Flow audit #21, 13 October: "A line's program is Proved by a dropdown,
 * with no test and no evidence." Proved says what showed it — its test, a
 * study on the line, or the words of who signed it off; amber when nothing. */
describe('how a line\'s program was proved', () => {
  const T = '2026-10-13';
  const study = { id: 's1', tool: 'capability', name: 'Weight 2 kg', workspaceId: 'ws-7', programId: 'p-cw', facts: { readings: [] }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 } as unknown as ToolStudy;
  const test = { id: 't1', projectId: 'job-one', kind: 'test', title: 'Prove program P-104', programId: 'p-104', outcome: 'passed', ranOn: '2026-10-12', sort: 1, createdAt: 1, updatedAt: 1 } as Test;
  const programs = [
    prog({ id: 'p-104', what: 'P-104', workspaceId: 'ws-7', state: 'proved', provedOn: '2026-10-12', testId: 't1' }),
    prog({ id: 'p-cw', what: 'CW-3', workspaceId: 'ws-7', state: 'proved', provedOn: '2026-10-11' }),
    prog({ id: 'p-hand', what: 'CW-1', workspaceId: 'ws-7', state: 'proved', provedOn: '2026-10-03', note: '500 packs, no rejects' }),
    prog({ id: 'p-bare', what: 'LB-2', workspaceId: 'ws-7', state: 'proved', provedOn: '2026-10-02' }),
    prog({ id: 'p-open', what: 'LB-3', workspaceId: 'ws-7', state: 'onMachine' }),
  ];
  it('says its test, the study that showed it, the hand that signed it off — amber when nothing shows it', () => {
    expect(proofOf(programs[0], [test])).toMatchObject({ word: 'Proved by its test — Prove program P-104, passed 12 Oct', tone: 'g', testId: 't1' });
    expect(proofOf(programs[1], [], [study])?.word).toMatch(/^Proved by the capability study “Weight 2 kg” — /);
    expect(proofOf(programs[2], [])).toEqual({ word: 'Signed off by hand', tone: 'n' });
    expect(proofOf(programs[3], [])).toEqual({ word: 'Signed off by hand — nothing said shows it', tone: 'a' });
    expect(proofOf(programs[4], [])).toBeUndefined();
    /* a paper that cannot see the job's tests still says a test proved it */
    expect(proofOf(programs[0], undefined)?.word).toBe('Proved by its test in Commission');
  });
  it('the line\'s programs report carries it under each proved one', () => {
    const r = lineProgramsReading([{ id: 'ws-7', name: 'Line 7', machines: [], programs }], T, { tests: [test], studies: [study] });
    const by = (id: string) => r?.lines.find(l => l.programId === id)?.proof?.word;
    expect([by('p-104'), by('p-hand'), by('p-bare'), by('p-open')]).toEqual(['Proved by its test — Prove program P-104, passed 12 Oct', 'Signed off by hand', 'Signed off by hand — nothing said shows it', undefined]);
    expect(by('p-cw')).toMatch(/capability study “Weight 2 kg”/);
  });
});

describe('a line machine\'s id', () => {
  it('is the same for the same name, on any device', () => {
    expect(lineMachineId('ws-7', ' Case  Packer ')).toBe(lineMachineId('ws-7', 'case packer'));
    expect(lineMachineId('ws-7', 'Case packer')).toBe('mc-ws-7-case-packer');
    expect(lineMachineId('ws-7', '***')).toBe('mc-ws-7-machine');
    expect(machineKey('  Pick   and Place ')).toBe('pick and place');
  });
});

/* PROGRAMS ONLY ON A PROJECT'S STAGE (23 October: "programs on the line in my factory, it's like you don't have any
   programs") — a line on a machine's Programs loaded, no program record: counted on the line, under its machine. */
describe('a project\'s stage-only programs on its line', () => {
  const T = '2026-10-23';
  const wrapper: Asset = { id: 'mc-ws-7-wrapper', projectId: '', workspaceId: 'ws-7', name: 'Wrapper', state: 'running', sort: 0, updatedAt: 0 };
  const machines = [{ name: 'Wrapper', record: wrapper }];
  const own = [{ id: 'p1', projectId: '', workspaceId: 'ws-7', what: 'P-1 Finest Red', state: 'proved', provedOn: '2026-10-20', sort: 0, updatedAt: 0, assetId: 'mc-ws-7-wrapper' } as Program];
  const stage = (what: string, machine: string, bucket: 'done' | 'open', word: string): ProgramLine =>
    ({ machine, partId: `part-${what}`, what, word, tone: bucket === 'done' ? 'g' : 'n', bucket, earlier: [], proving: 'On Line 7 upgrade’s Commission — a line on Wrapper’s Programs loaded, not on a Programs list yet' });
  it('put under the line\'s machine of that name, else the line itself, and counted with the line\'s own', () => {
    const r = lineProgramsReading([{ id: 'ws-7', name: 'Line 7', machines, programs: own }], T,
      { stageOnly: new Map([['ws-7', [stage('Back up the programs', 'Wrapper', 'done', 'done 20 Oct'), stage('Load the new recipes', 'Labeller', 'open', 'to do')]]]) });
    expect(r?.machines.map(m => [m.name, m.lines.map(l => l.what)])).toEqual([['Wrapper', ['P-1 Finest Red', 'Back up the programs']], ['The line', ['Load the new recipes']]]);
    expect([r?.total, r?.doneAll, r?.open]).toEqual([3, 2, 1]);
    expect(r?.lines.find(l => l.what === 'Back up the programs')?.proving).toMatch(/not on a Programs list yet$/);
  });
  it('a line with nothing but them still has a reading — never "no programs"', () => {
    const r = lineProgramsReading([{ id: 'ws-7', name: 'Line 7', machines, programs: [] }], T, { stageOnly: new Map([['ws-7', [stage('Load the new recipes', 'Wrapper', 'open', 'to do')]]]) });
    expect([r?.total, r?.says]).toEqual([1, '1 program · 0 done · 1 to do']);
  });
  it('the line\'s Overview tile says them beside its own, and when it has none', () => {
    const base = { name: 'Line 7', problems: { open: 0, late: 0, critical: 0 }, stops: { n: 0, minutes: 0 }, day: { margin: null, missing: ['a speed'] } as unknown as LineReading['day'], jobs: 1 };
    const tile = (programs: LineReading['programs']) => lineTiles({ ...base, programs })[1];
    expect(tile({ n: 0, proved: 0, late: 0, onStage: 4 })).toMatchObject({ v: '—', of: '4 on a project’s Commission, on no Programs list yet' });
    expect(tile({ n: 3, proved: 1, late: 0, onStage: 2 }).of).toBe('of 3 · 2 more on a project’s Commission');
    expect(tile({ n: 0, proved: 0, late: 0 }).of).toBe('no program planned on the line');
  });
});
