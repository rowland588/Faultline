import { describe, expect, it } from 'vitest';
import {
  lineMachineId, lineOfMachine, lineOfProgram, machineKey, machinesOnLine, onlyLineOf, productsOnLine, programsOnLine,
  type JobLine,
} from '../lineRecords';
import type { Asset } from '../testing';
import type { Program } from '../programs';

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

describe('a line machine\'s id', () => {
  it('is the same for the same name, on any device', () => {
    expect(lineMachineId('ws-7', ' Case  Packer ')).toBe(lineMachineId('ws-7', 'case packer'));
    expect(lineMachineId('ws-7', 'Case packer')).toBe('mc-ws-7-case-packer');
    expect(lineMachineId('ws-7', '***')).toBe('mc-ws-7-machine');
    expect(machineKey('  Pick   and Place ')).toBe('pick and place');
  });
});
