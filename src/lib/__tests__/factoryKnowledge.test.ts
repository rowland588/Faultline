/* FACTORY KNOWLEDGE (lib/factoryKnowledge, docs/FACTORY-KNOWLEDGE.md F1–F2) — the factory the app already holds, read as one
 * map client › site › area › line › machines with how each thing is known; a kind only ever guessed from a name as inferred;
 * words resolved to one, several or none, and never across clients. */
import { describe, it, expect } from 'vitest';
import type { Workspace } from '../../types';
import type { Asset } from '../testing';
import { factoryMap, howSaid, howWord, identityFacts, kindOf, kindWord, lineKeyOf, mapLines, resolveWords } from '../factoryKnowledge';

const ws = (id: string, name: string, o: Partial<Workspace> = {}): Workspace => ({
  id, name, color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1, ...o,
});
const asset = (id: string, workspaceId: string, name: string, o: Partial<Asset> = {}): Asset => ({ id, projectId: '', workspaceId, name, state: 'running', sort: 0, updatedAt: 1, ...o });
const DAY8 = new Date(2026, 10, 8, 12).getTime();

/* Acme Foods: Site 1 › Packaging (Line 2, Line 2A, Line 2B) and Site 1 › Mixing (Line 1); Brook Dairy: one line with a mixer */
const LINES = [
  ws('w2', 'Line 2', { clientName: 'Acme Foods', siteName: 'Site 1', areaName: 'Packaging', floorOrder: 1, assets: ['Scale 1', 'Scale 2', 'Checkweigher', 'Flow wrapper'] }),
  ws('w1', 'Line 1', { clientName: 'Acme Foods', siteName: 'Site 1', areaName: 'Mixing', floorOrder: 0, assets: ['Mixer', 'Pick and Place'] }),
  ws('w2a', 'Line 2A', { clientName: 'Acme Foods', siteName: 'Site 1', areaName: 'Packaging', floorOrder: 2, assets: ['Bagger'] }),
  ws('w2b', 'Line 2B', { clientName: 'Acme Foods', siteName: 'Site 1', areaName: 'Packaging', floorOrder: 3, assets: ['Bagging machine'] }),
  ws('wb', 'Dairy 1', { clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Filling', assets: ['Big mixer', 'Robot'] }),
  ws('wold', 'Line 9', { clientName: 'Acme Foods', archived: true, assets: ['Scale 9'] }),
];
const ASSETS = [
  asset('s1', 'w2', 'Scale 1', { model: 'Avery 200', known: { model: { how: 'document', at: DAY8, source: { kind: 'document', label: 'Equipment register.xlsx', quote: 'Scale 1 — Avery 200' } } } }),
  asset('cw', 'w2', 'Checkweigher', { kind: 'checkweigher', serial: 'CW-778', known: { kind: { how: 'confirmed', at: DAY8, by: 'Rowland' }, serial: { how: 'reported', at: DAY8, source: { kind: 'conversation' } } } }),
  asset('mx', 'w1', 'Mixer', { oem: 'Hobart' }),
  /* the old filler, replaced by the flow wrapper's record — kept, never a machine of the line */
  asset('fw', 'w2', 'Flow wrapper'),
  asset('old', 'w2', 'Old wrapper', { replacedBy: 'fw', known: { replacedBy: { how: 'reported', at: DAY8 } } }),
  asset('gone', 'w2', 'Scale 7', { deletedAt: 5 }),
  asset('bm', 'wb', 'Big mixer', { kind: 'mixer' }),
];

describe('kindOf — a kind guessed from a name, only ever inferred', () => {
  it('reads the kind a name holds, the longest words first', () => {
    expect(kindOf('Scale 3')).toEqual({ kind: 'scale', how: 'inferred' });
    expect(kindOf('Scales')?.kind).toBe('scale');
    expect(kindOf('Multihead weigher')?.kind).toBe('scale');
    expect(kindOf('Ishida checkweigher')?.kind).toBe('checkweigher');
    expect(kindOf('Check weigher 2')?.kind).toBe('checkweigher');
    expect(kindOf('Metal detector')?.kind).toBe('metal detector');
    expect(kindOf('Bagging machine')?.kind).toBe('bagger');
    expect(kindOf('Case packer')?.kind).toBe('case packer');
    expect(kindOf('Palletizer')?.kind).toBe('palletiser');
    expect(kindOf('Labeler 1')?.kind).toBe('labeller');
    expect(kindOf('Flow wrapper')?.kind).toBe('wrapper');
    expect(kindOf('Scale1')?.kind).toBe('scale');
  });
  it('says nothing when the name says nothing of what it is', () => {
    expect(kindOf('Pick and Place')).toBeUndefined();
    expect(kindOf('M7')).toBeUndefined();
    expect(kindOf('Robot')).toBeUndefined();
  });
  it('keeps a typed kind as one of the known kinds when it is one of its words, else as typed', () => {
    expect(kindWord('Palletizer')).toBe('palletiser');
    expect(kindWord('check weigher')).toBe('checkweigher');
    expect(kindWord('Robot arm')).toBe('Robot arm');
    expect(kindWord('  ')).toBe('');
  });
});

describe('howSaid — how a thing is known, in words', () => {
  it('says each way of knowing', () => {
    expect(howSaid({ kind: { how: 'confirmed', at: DAY8, by: 'Rowland' } }, 'kind', 'scale')).toBe('Confirmed by Rowland, 8 Nov');
    expect(howSaid({ kind: { how: 'reported', at: DAY8, source: { kind: 'conversation' } } }, 'kind', 'scale')).toBe('Reported in a conversation, 8 Nov');
    expect(howSaid({ model: { how: 'document', at: DAY8, source: { kind: 'document', label: 'Equipment register.xlsx', quote: 'Scale 3 — Avery' } } }, 'model', 'x'))
      .toBe('From Equipment register.xlsx: “Scale 3 — Avery”');
    expect(howSaid({ kind: { how: 'inferred', at: DAY8 } }, 'kind', 'scale')).toBe('Inferred — not confirmed');
    expect(howSaid(undefined, 'kind', 'scale')).toBe('Recorded in LUNAR');
    expect(howSaid(undefined, 'kind')).toBe('Not known');
    expect(howWord(undefined, 'kind')).toBe('unknown');
    expect(howWord({ kind: { how: 'document', at: 1 } }, 'kind')).toBe('from a document');
  });
});

describe('factoryMap', () => {
  const map = factoryMap(LINES, ASSETS);
  it('is client › site › area › line › machines, the archived line and the deleted record aside', () => {
    expect(map.clients.map(c => c.name)).toEqual(['Acme Foods', 'Brook Dairy']);
    const acme = map.clients[0];
    expect(acme.sites.map(s => s.name)).toEqual(['Site 1']);
    expect(acme.sites[0].areas.map(a => [a.name, a.lines.map(l => l.name)])).toEqual([['Mixing', ['Line 1']], ['Packaging', ['Line 2', 'Line 2A', 'Line 2B']]]);
    expect(mapLines(map).some(l => l.name === 'Line 9')).toBe(false);
    const l2 = mapLines(map).find(l => l.id === 'w2');
    expect(l2?.machines.map(m => m.name)).toEqual(['Scale 1', 'Scale 2', 'Checkweigher', 'Flow wrapper']);
  });
  it('says what each machine is and how each thing is known — a kind guessed from its name inferred', () => {
    const l2 = mapLines(map).find(l => l.id === 'w2');
    const cw = l2?.machines.find(m => m.name === 'Checkweigher');
    expect(cw?.kind).toEqual({ value: 'checkweigher', how: 'confirmed', said: 'Confirmed by Rowland, 8 Nov' });
    expect(cw?.serial?.how).toBe('reported');
    const s1 = l2?.machines.find(m => m.name === 'Scale 1');
    expect(s1?.kind).toEqual({ value: 'scale', how: 'inferred', said: 'Guessed from its name — not confirmed' });
    expect(s1?.model?.how).toBe('from a document');
    expect(s1?.model?.said).toContain('Equipment register.xlsx');
    const mixer = mapLines(map).find(l => l.id === 'w1')?.machines.find(m => m.name === 'Mixer');
    expect(mixer?.maker).toEqual({ value: 'Hobart', how: 'recorded', said: 'Recorded in LUNAR' });
    expect(mapLines(map).find(l => l.id === 'w1')?.machines.find(m => m.name === 'Pick and Place')?.kind).toBeUndefined();
  });
  it('keeps a replaced machine as history under the one that replaced it', () => {
    const fw = mapLines(map).find(l => l.id === 'w2')?.machines.find(m => m.name === 'Flow wrapper');
    expect(fw?.replaced).toEqual([{ id: 'old', name: 'Old wrapper', on: '8 Nov' }]);
    expect(mapLines(map).flatMap(l => l.machines).some(m => m.name === 'Old wrapper')).toBe(false);
  });
  it('with a client, holds that client’s lines and none other’s — a line naming no client never joins a named one', () => {
    const brook = factoryMap(LINES, ASSETS, { client: 'brook dairy' });
    expect(mapLines(brook).map(l => l.name)).toEqual(['Dairy 1']);
    const none = factoryMap([...LINES, ws('wx', 'Spare line')], ASSETS, { client: '' });
    expect(mapLines(none).map(l => l.name)).toEqual(['Spare line']);
  });
  it('prints kind, model and serial as facts, never a guessed kind', () => {
    expect(identityFacts({ kind: 'checkweigher', model: 'CW-5000', serial: '12345' })).toEqual(['Kind: checkweigher', 'Model CW-5000', 'Serial 12345']);
    expect(identityFacts({})).toEqual([]);
  });
});

describe('resolveWords — words into the things they name', () => {
  it('finds "Line A" inside a longer name ("Exam Line A") — the real model was told there was no such line', () => {
    const o = { clientName: 'Exam practice', siteName: 'Exam site', areaName: 'Packing' };
    const m = factoryMap([ws('xa', 'Exam Line A', { ...o, assets: ['Filler', 'Bagger', 'Checkweigher'] }), ws('xb', 'Exam Line B', { ...o, assets: ['Bagger', 'Labeller'] })], []);
    const r = resolveWords(m, 'the checkweigher on Line A');
    expect(r.match).toBe('one');
    expect(r.candidates[0].label).toContain('Exam Line A');
    expect(resolveWords(m, 'line B').candidates.map(c => c.id)).toEqual(['xb']);
  });
  const acme = factoryMap(LINES, ASSETS, { client: 'Acme Foods' });
  it('“the scales” on a line with Scale 1 and Scale 2 — several, each named', () => {
    const r = resolveWords(acme, 'the scales');
    expect(r.match).toBe('several');
    expect(r.candidates.map(c => c.label)).toEqual(['Scale 1 — probably a scale, on Line 2', 'Scale 2 — probably a scale, on Line 2']);
    expect(r.candidates.every(c => c.kind === 'machine' && c.how === 'inferred')).toBe(true);
    expect(r.says).toMatch(/could be 2 things/);
  });
  it('a checkweigher is never one of the scales', () => {
    expect(resolveWords(acme, 'the scales').candidates.some(c => c.label.startsWith('Checkweigher'))).toBe(false);
    const cw = resolveWords(acme, 'the checkweigher');
    expect(cw.match).toBe('one');
    expect(cw.candidates[0]).toMatchObject({ id: 'cw', how: 'recorded', why: 'named so' });
  });
  it('“the mixer” — one; Brook Dairy’s big mixer never offered to Acme', () => {
    const r = resolveWords(acme, 'the mixer');
    expect(r.match).toBe('one');
    expect(r.candidates[0]).toMatchObject({ kind: 'machine', id: 'mx', lineId: 'w1' });
    expect(resolveWords(acme, 'big mixer').candidates.map(c => c.id)).toEqual(['mx']);
  });
  it('“line two” is Line 2; “2a” Line 2A; “Line 2” exactly Line 2', () => {
    expect(lineKeyOf('Line 2A')).toBe('2a');
    expect(lineKeyOf('line two')).toBe('2');
    const two = resolveWords(acme, 'line two');
    expect(two.match).toBe('one');
    expect(two.candidates[0]).toMatchObject({ kind: 'line', id: 'w2' });
    expect(resolveWords(acme, '2a').candidates[0]).toMatchObject({ kind: 'line', id: 'w2a' });
    expect(resolveWords(acme, 'Line 2').candidates.map(c => c.id)).toEqual(['w2']);
  });
  it('an area by its words; a machine on a line named after it; the conversation’s line first', () => {
    const p = resolveWords(acme, 'packaging');
    expect(p.match).toBe('one');
    expect(p.candidates[0].kind).toBe('area');
    expect(p.candidates[0].label).toContain('Line 2, Line 2A, Line 2B');
    expect(resolveWords(acme, 'the bagger').candidates.map(c => c.label)).toEqual(['Bagger — probably a bagger, on Line 2A', 'Bagging machine — probably a bagger, on Line 2B']);
    expect(resolveWords(acme, 'Scale 1').candidates.map(c => c.id)).toEqual(['s1']);
    expect(resolveWords(acme, 'the bagger on line 2b').candidates.map(c => c.lineId)).toEqual(['w2b']);
    expect(resolveWords(acme, 'the bagger', { lineIds: ['w2a'] }).candidates.map(c => c.lineId)).toEqual(['w2a']);
    expect(resolveWords(acme, 'the mixer on line 9').match).toBe('none');
  });
  it('“the robot” — none, said plainly', () => {
    const r = resolveWords(acme, 'the robot');
    expect(r.match).toBe('none');
    expect(r.candidates).toEqual([]);
    expect(r.says).toBe('Nothing called “the robot” is known in LUNAR for Acme Foods — it may need adding.');
  });
});
