/* VOICE, AS DATA. What a voice note heard becomes changes a person sees
 * before any is made — asserted here, and the server's own tidying with it. */
import { describe, it, expect } from 'vitest';
import { flashModels, pickModel, schemaFor, tidy, tidyFor, promptFor } from '../../../api/voice';
import { changesFor, contextFor, machineNamed, proposalFrom, wav } from '../voice';
import type { Asset, Test } from '../testing';

const TODAY = '2026-09-30';
const denester: Asset = { id: 'a1', projectId: 'p', name: 'Denester', oem: 'Brillopak', state: 'onSite', sort: 1, updatedAt: 1 };
const packer: Asset = { id: 'a2', projectId: 'p', name: 'Pick and place', oem: 'Brillopak', state: 'onSite', sort: 2, updatedAt: 1 };
const rec = (o: Partial<Test>): Test => ({ id: 't1', projectId: 'p', title: 'x', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });

describe('which model', () => {
  /* The key's real list, the day this went live — 2.5 Flash listed, but
     "no longer available to new users". */
  const real = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-preview-tts', 'gemini-flash-latest', 'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite', 'gemini-2.5-flash-image', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.5-flash',
    'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.8-flash-tts'].map(n => `models/${n}`);
  it('takes the newest Flash on the key’s own list', () => {
    expect(pickModel(real)).toBe('gemini-3.8-flash');
  });
  it('has the older Flash next, then Flash-Lite as the last resort — never TTS, image or preview', () => {
    /* Every Flash "experiencing high demand" at once turned a fix said on the
       live app into no answer; a lighter model that answers is better. */
    expect(flashModels(real)).toEqual(['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash',
      'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite']);
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
  it('reads a result and what was found from one note on a test or an install step', () => {
    const r = tidy('test', { transcript: 't', fields: { result: 'Ran at 61', outcome: 'failed', notes: [{ what: 'Film tracks left', owner: 'Ilapak' }] } });
    expect(r.fields).toEqual({ result: 'Ran at 61', outcome: 'failed', notes: [{ what: 'Film tracks left', owner: 'Ilapak' }] });
    expect(tidy('install', { transcript: 't', fields: { notes: [{ what: 'Regulator missing' }] } }).fields.notes).toEqual([{ what: 'Regulator missing', owner: '' }]);
    expect(tidy('fix', { transcript: 't', fields: { notes: [{ what: 'x' }] } }).fields).toEqual({});
  });
  it('never offers the model an empty choice — Gemini refuses the whole schema', () => {
    /* "enum[3]: cannot be empty" broke voice on every fix, test and install
       step on the live app while the found-form kept working. */
    const empties = (node: unknown, path: string): string[] => {
      if (!node || typeof node !== 'object') return [];
      const o = node as Record<string, unknown>;
      const here = Array.isArray(o.enum) && o.enum.some(v => v === '') ? [path] : [];
      return [...here, ...Object.entries(o).flatMap(([k, v]) => empties(v, `${path}.${k}`))];
    };
    for (const f of ['fix', 'found', 'test', 'install'] as const) expect(empties(schemaFor(f), f)).toEqual([]);
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

/* Rowland, 4 October: talked into a stage — "Testing to see if this actually
   works … the entire principle is talk instead of writing" — and got
   "Nothing in that fits these boxes". The reader had put it all in leftover. */
describe('nothing said is lost, and saying more makes sense of it', () => {
  const step = rec({ kind: 'install', title: 'Mechanical install', assetId: 'a1' });
  it('a note the reader put all in "did not fit" becomes the stage’s account', () => {
    const { changes } = proposalFrom(step, { transcript: 'Testing to see if this works', fields: {}, leftover: 'Testing to see if this works' }, [denester], TODAY);
    expect(changes).toEqual([expect.objectContaining({ key: 'result', after: 'Testing to see if this works' })]);
  });
  it('words with no fields and no leftover at all are the account too', () => {
    const { changes } = proposalFrom(step, { transcript: 'Frame bolted down, levelled', fields: {} }, [denester], TODAY);
    expect(changes[0]).toMatchObject({ key: 'result', after: 'Frame bolted down, levelled' });
  });
  it('a merged account replaces the old one whole — corrections in place, nothing stacked twice', () => {
    const was = rec({ ...step, result: 'Frame bolted down. Levelled to 2 mm.' });
    const r = { transcript: 'actually it was 1 mm', fields: { result: 'Frame bolted down. Levelled to 1 mm.' }, merged: true };
    expect(proposalFrom(was, r, [denester], TODAY).changes[0]).toMatchObject({ key: 'result', after: 'Frame bolted down. Levelled to 1 mm.' });
  });
  it('without the merge (an older reader), more words go under what is there, never over it', () => {
    const was = rec({ ...step, result: 'Frame bolted down.' });
    expect(proposalFrom(was, { transcript: 't', fields: { result: 'Cabled up.' } }, [denester], TODAY).changes[0])
      .toMatchObject({ after: 'Frame bolted down.\nCabled up.' });
  });
  it('the reader is told the account as it stands, and asked for the whole account back', () => {
    const ctx = contextFor([denester], [], TODAY, rec({ ...step, result: 'Frame bolted down.' }));
    expect(ctx.on?.result).toBe('Frame bolted down.');
    const p = promptFor('install', ctx);
    expect(p).toContain('Frame bolted down.');
    expect(p).toContain('WHOLE account as it should now read');
    expect(promptFor('install', contextFor([denester], [], TODAY, step))).not.toContain('already reads');
  });
  it('says the account came back merged only when there was one to merge into', () => {
    const raw = { transcript: 't', fields: { result: 'All of it' } };
    expect(tidyFor('install', raw, { today: TODAY, on: { result: 'Some' } }).merged).toBe(true);
    expect(tidyFor('install', raw, { today: TODAY, on: { title: 'x' } }).merged).toBeUndefined();
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
