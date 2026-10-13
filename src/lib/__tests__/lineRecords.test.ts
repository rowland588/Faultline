import { describe, expect, it } from 'vitest';
import {
  lineMachineId, lineOfMachine, lineOfProgram, lineProgramsReading, machineKey, machinesOnLine, onlyLineOf, productsOnLine, programsOnLine,
  type JobLine,
} from '../lineRecords';
import { proofOf } from '../programsReport';
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
