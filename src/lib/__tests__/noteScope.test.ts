/* WHAT A MEETING NOTE IS ABOUT. The picker offered only the records that
 * existed — a jumble of install steps — so on a job with nothing past Install it
 * offered nothing past Install, and there was no way to say a note was about Set
 * up, or a machine. It now speaks the tabs' own words, and a gate is always there
 * to pick, planned or not. */
import { describe, it, expect } from 'vitest';
import {
  NOTE_GATES, decodeScope, encodeScope, gateOfRecord, parentScope, recordsUnder, scopeLabel, scopeRank,
} from '../noteScope';
import type { Asset, Test } from '../testing';

let n = 0;
const asset = (id: string, name: string, sort: number): Asset => ({ id, projectId: 'p', name, state: 'onSite', sort, updatedAt: 1 } as Asset);
const t = (o: Partial<Test> & { id: string; title: string }): Test =>
  ({ projectId: 'p', outcome: 'planned', sort: ++n, createdAt: 1, updatedAt: 1, ...o });

const assets = [asset('w', 'Wrapper', 1), asset('c', 'Checkweigher', 2)];
const tests: Test[] = [
  t({ id: 'i1', kind: 'install', title: 'Dry run', assetId: 'c' }),
  t({ id: 'i2', kind: 'install', title: 'Positioned and levelled', assetId: 'w' }),
  t({ id: 'i3', kind: 'install', title: 'Dry run', assetId: 'w' }),
  t({ id: 's1', kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: 'w' }),
  t({ id: 'k1', kind: 'test', title: 'Seal integrity', assetId: 'w' }),
  t({ id: 'f1', kind: 'fix', title: 'Re-track the film', assetId: 'w' }),
  t({ id: 'h1', kind: 'install', gate: 'handover', title: 'Client signed off', assetId: 'w' }),
];

describe('the gates a note can be about', () => {
  it('are the tabs’ own words, in the tabs’ own order — whether or not anything is planned there', () => {
    expect(NOTE_GATES.map(g => g.label)).toEqual(['Install', 'Set up', 'Commission', 'Hand over', 'Fixes', 'Materials']);
  });
  it('sort each record under the tab it lives on', () => {
    expect(tests.map(gateOfRecord)).toEqual(['install', 'install', 'install', 'setup', 'commission', 'fixes', 'handover']);
  });
});

describe('what a stored note points at', () => {
  it('round-trips a gate, a machine and a record', () => {
    for (const sc of [{ kind: 'gate', gate: 'setup' }, { kind: 'machine', assetId: 'w' }, { kind: 'record', testId: 'k1' }] as const) {
      expect(decodeScope(encodeScope(sc), tests, assets)).toEqual(sc);
    }
    expect(encodeScope({ kind: 'job' })).toBe('');
  });
  it('reads an old note — a record’s id, or nothing — exactly as it always did', () => {
    expect(decodeScope('', tests, assets)).toEqual({ kind: 'job' });
    expect(decodeScope('i2', tests, assets)).toEqual({ kind: 'record', testId: 'i2' });
  });
  it('a record, machine or gate that has gone reads as the whole project — a note is never lost', () => {
    expect(decodeScope('deleted-id', tests, assets)).toEqual({ kind: 'job' });
    expect(decodeScope('asset:ghost', tests, assets)).toEqual({ kind: 'job' });
    expect(decodeScope('gate:nonsense', tests, assets)).toEqual({ kind: 'job' });
    expect(decodeScope('i2', tests.map(x => (x.id === 'i2' ? { ...x, deletedAt: 5 } : x)), assets)).toEqual({ kind: 'job' });
  });
});

describe('the words for it', () => {
  it('says each in the job’s own words', () => {
    expect(scopeLabel({ kind: 'job' }, tests, assets)).toBe('The whole project');
    expect(scopeLabel({ kind: 'gate', gate: 'setup' }, tests, assets)).toBe('Set up');
    expect(scopeLabel({ kind: 'machine', assetId: 'c' }, tests, assets)).toBe('Checkweigher');
    expect(scopeLabel({ kind: 'record', testId: 'i1' }, tests, assets)).toBe('Install · Dry run — Checkweigher');
    expect(scopeLabel({ kind: 'record', testId: 'k1' }, tests, assets)).toBe('Commission · Seal integrity — Wrapper');
  });
});

describe('what a gate or machine can be narrowed to', () => {
  it('a gate’s records, machine by machine in machine order, then in the order planned', () => {
    const ids = recordsUnder({ kind: 'gate', gate: 'install' }, tests, assets).map(x => x.id);
    expect(ids).toEqual(['i2', 'i3', 'i1']);               // Wrapper's two, then the Checkweigher's
  });
  it('a machine’s records, in the order the job runs: install, set up, commission, hand over, fixes', () => {
    const ids = recordsUnder({ kind: 'machine', assetId: 'w' }, tests, assets).map(x => x.id);
    expect(ids).toEqual(['i2', 'i3', 's1', 'k1', 'h1', 'f1']);
  });
  it('Materials, and the whole project, have nothing finer', () => {
    expect(recordsUnder({ kind: 'gate', gate: 'materials' }, tests, assets)).toEqual([]);
    expect(recordsUnder({ kind: 'job' }, tests, assets)).toEqual([]);
  });
});

describe('the order notes are listed in', () => {
  it('the whole project, then each gate in order, then machines, then single steps', () => {
    const ranked = [
      { kind: 'record', testId: 'k1' }, { kind: 'machine', assetId: 'c' }, { kind: 'gate', gate: 'handover' },
      { kind: 'job' }, { kind: 'gate', gate: 'install' }, { kind: 'machine', assetId: 'w' },
    ] as const;
    const sorted = [...ranked].sort((a, b) => scopeRank(a, tests, assets) - scopeRank(b, tests, assets));
    expect(sorted.map(x => (x.kind === 'gate' ? x.gate : x.kind === 'machine' ? x.assetId : x.kind))).toEqual(['job', 'install', 'handover', 'w', 'c', 'record']);
  });
  it('the first box shows a record’s own gate', () => {
    expect(parentScope({ kind: 'record', testId: 's1' }, tests)).toEqual({ kind: 'gate', gate: 'setup' });
    expect(parentScope({ kind: 'machine', assetId: 'w' }, tests)).toEqual({ kind: 'machine', assetId: 'w' });
  });
});
