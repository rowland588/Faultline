/* VOICE, AS DATA. What a voice note heard becomes changes a person sees
 * before any is made — asserted here, and the server's own tidying with it. */
import { describe, it, expect } from 'vitest';
import { pickModel, schemaFor, tidy, promptFor } from '../../../api/voice';
import { changesFor, contextFor, machineNamed, wav } from '../voice';
import type { Asset, Test } from '../testing';

const TODAY = '2026-09-30';
const denester: Asset = { id: 'a1', projectId: 'p', name: 'Denester', oem: 'Brillopak', state: 'onSite', sort: 1, updatedAt: 1 };
const packer: Asset = { id: 'a2', projectId: 'p', name: 'Pick and place', oem: 'Brillopak', state: 'onSite', sort: 2, updatedAt: 1 };
const rec = (o: Partial<Test>): Test => ({ id: 't1', projectId: 'p', title: 'x', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });

describe('which model', () => {
  it('keeps 2.5 Flash when the key has it', () => {
    expect(pickModel(['models/gemini-2.5-pro', 'models/gemini-2.5-flash', 'models/gemini-3-flash'])).toBe('gemini-2.5-flash');
  });
  it('takes the newest Flash when it does not, never Lite or a picture model', () => {
    expect(pickModel(['models/gemini-3-flash', 'models/gemini-3.5-flash-lite', 'models/gemini-3.5-flash-image', 'models/gemini-2.0-flash', 'models/gemini-3-pro']))
      .toBe('gemini-3-flash');
  });
  it('says nothing rather than guess when there is no Flash at all', () => {
    expect(pickModel(['models/gemini-3-pro'])).toBeUndefined();
  });
});

describe('what comes back from the model', () => {
  it('keeps only the form’s own fields, trimmed, with bad dates and blanks dropped', () => {
    const r = tidy('fix', { transcript: ' a fix ', fields: { title: ' Replace sensor 2 ', plannedFor: 'Friday', withWhom: '', colour: 'red', outcome: 'maybe' }, leftover: ' ' });
    expect(r).toEqual({ transcript: 'a fix', fields: { title: 'Replace sensor 2' } });
  });
  it('splits what was found into notes, and never drops what does not fit', () => {
    const r = tidy('found', { transcript: 't', fields: { notes: [{ what: 'Film tracking left', owner: '' }, { what: ' ' }] }, leftover: 'ring Dave' });
    expect(r).toEqual({ transcript: 't', fields: { notes: [{ what: 'Film tracking left', owner: '' }] }, leftover: 'ring Dave' });
  });
  it('asks for every form with a schema and the job’s own names', () => {
    for (const f of ['fix', 'found', 'test', 'install'] as const) expect(schemaFor(f).required).toEqual(['transcript', 'fields']);
    expect(promptFor('fix', { today: TODAY, machines: ['Denester'], suppliers: ['Brillopak'] })).toContain('Machines on this job: Denester.');
  });
});

describe('what a voice note would change', () => {
  it('fills a fix from one sentence, machine by name', () => {
    const fix = rec({ kind: 'fix', title: 'New fix' });
    const c = changesFor(fix, { title: 'Replace sensor 2', machine: 'denester', problem: 'Sensor 2 keeps dropping out', withWhom: 'Brillopak', plannedFor: '2026-10-02' }, [denester, packer], TODAY);
    expect(c.map(x => [x.label, x.after])).toEqual([
      ['What we are fixing', 'Replace sensor 2'], ['Machine', 'Denester'], ['The problem', 'Sensor 2 keeps dropping out'],
      ['Who is doing it', 'Brillopak'], ['Planned for', expect.stringMatching(/2 Oct/)],
    ]);
    expect(Object.assign({}, ...c.map(x => x.patch))).toMatchObject({ assetId: 'a1', passesIf: 'Sensor 2 keeps dropping out', plannedFor: '2026-10-02' });
  });
  it('says how a step went — and that it happened today, when no day was said', () => {
    const step = rec({ kind: 'install', title: 'Air and power connected' });
    const c = changesFor(step, { outcome: 'failed', result: 'Regulator missing' }, [packer], TODAY);
    expect(c.map(x => [x.key, x.after])).toEqual([['result', 'Regulator missing'], ['ranOn', expect.stringMatching(/30 Sept?/)], ['outcome', 'Hit a problem']]);
  });
  it('adds to what was written, never over it', () => {
    const t = rec({ result: '61 ppm' });
    expect(changesFor(t, { result: '3 leaks in 20' }, [], TODAY)[0]).toMatchObject({ before: '61 ppm', after: '61 ppm\n3 leaks in 20' });
  });
  it('offers nothing for what is already so', () => {
    expect(changesFor(rec({ withWhom: 'Brillopak', outcome: 'passed', ranOn: TODAY }), { withWhom: 'Brillopak', outcome: 'passed' }, [], TODAY)).toEqual([]);
  });
  it('ignores a machine that is not on the job', () => {
    expect(machineNamed('Wrapper', [denester])).toBeUndefined();
    expect(changesFor(rec({}), { machine: 'Wrapper' }, [denester], TODAY)).toEqual([]);
  });
  it('gives the model the job’s machines and everybody named on it', () => {
    const ctx = contextFor([denester, packer], [rec({ withWhom: 'Dave' })], TODAY);
    expect(ctx).toMatchObject({ machines: ['Denester', 'Pick and place'], suppliers: ['Brillopak', 'Dave'] });
  });
});

describe('the recording', () => {
  it('is a WAV any model reads — the header says 16 kHz mono 16-bit', () => {
    const w = wav(new Float32Array([0, 0.5, -0.5, 1]), 16000);
    const d = new DataView(w.buffer);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect([d.getUint16(22, true), d.getUint32(24, true), d.getUint16(34, true)]).toEqual([1, 16000, 16]);
    expect(w.length).toBe(44 + 8);
  });
});
