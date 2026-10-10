/* A STAGE'S "NO", ITS SIGNER AND ITS FILES (docs/PANELS.md, slice 1).
 *
 * Not yet is kept as a line owed on the stage, its reason followed as that
 * line — never a problem with no fix; the day says "not yet" in amber; and a
 * stage's files reach the day, the client report and the handover report by
 * name. */
import { describe, it, expect } from 'vitest';
import { notedProblems } from '../noted';
import { dayOf } from '../day';
import { filesSaid, type Asset, type DocRef, type Test, type TestItem } from '../testing';
import { clientReport } from '../clientReport';
import { handoverReport } from '../handoverReport';
import type { Project } from '../../types';

const TODAY = '2026-10-10';
const at = Date.parse(`${TODAY}T09:00:00`);
const coder: Asset = { id: 'c', projectId: 'p', name: 'Domino coder', oem: 'Domino UK', state: 'onSite', sort: 1, updatedAt: 1 } as Asset;
const doc = (name: string): DocRef => ({ id: name, name, blobKey: `doc-${name}`, mime: 'application/pdf', savedAt: 1 });
const air: Test = { id: 'air', projectId: 'p', kind: 'install', title: 'Air and power connected', assetId: 'c', withWhom: 'The site', outcome: 'planned', plannedFor: '2026-10-09', sort: 1, createdAt: 1, updatedAt: 1 };
const drawings: Test = { id: 'dw', projectId: 'p', kind: 'install', gate: 'handover', title: 'Manuals and drawings handed over', assetId: 'c', withWhom: 'Domino UK',
  outcome: 'passed', ranOn: TODAY, plannedFor: TODAY, docs: [doc('GA drawing rev C.pdf'), doc('Schematics.pdf')], sort: 2, createdAt: 1, updatedAt: 1 };
const signed: Test = { id: 'so', projectId: 'p', kind: 'install', gate: 'handover', title: 'Client signed off', assetId: 'c', withWhom: 'K. Ahmed',
  outcome: 'passed', ranOn: TODAY, plannedFor: TODAY, sort: 3, createdAt: 1, updatedAt: 1 };
/* What "Not yet" writes (ui/NotYet recordNotYet): the line owed, and its
   reason followed as that line, here with the finish moved to Fri. */
const owed: TestItem = { id: 'owed', projectId: 'p', testId: 'air', kind: 'next', what: 'Waiting on the air main', owner: 'The site', due: '2026-10-16', fromItemId: 'why', sort: 1, createdAt: at, updatedAt: at };
const why: TestItem = { id: 'why', projectId: 'p', testId: 'air', kind: 'found', what: 'Waiting on the air main', movedFrom: '2026-10-09', movedTo: '2026-10-16', becameItemId: 'owed', sort: at, createdAt: at, updatedAt: at };
const problem: TestItem = { id: 'pr', projectId: 'p', testId: 'air', kind: 'found', what: 'Regulator leaking', sort: at + 1, createdAt: at + 1, updatedAt: at + 1 };
const tests = [air, drawings, signed];
const items = [owed, why, problem];

describe('not yet', () => {
  it('is not a problem with no fix — the real problem beside it still is', () => {
    expect(notedProblems(tests, items, [coder]).open.map(n => n.item.id)).toEqual(['pr']);
  });

  it('the day says it, amber, with whose and by when and the finish it moved', () => {
    const d = dayOf({ tests, items, assets: [coder], materials: [], programs: [] }, TODAY, TODAY);
    const line = d.sections.flatMap(s => s.lines).find(l => /not yet/.test(l.text));
    expect(line?.text).toMatch(/^Domino coder — Air and power connected — not yet: Waiting on the air main \(The site\), by .*16 Oct — its finish moved to .*16 Oct\.$/);
    expect(line?.tone).toBe('asking');
    expect(line?.id).toBe('air');
    expect(d.sections.find(s => s.key === 'found')?.lines.some(l => /air main/.test(l.text)) ?? false).toBe(false);
  });
});

describe('files, by name, wherever the stage reaches', () => {
  it('in words', () => {
    expect(filesSaid(drawings)).toBe('2 files: GA drawing rev C.pdf, Schematics.pdf');
    expect(filesSaid({ docs: [doc('One.pdf')] })).toBe('1 file: One.pdf');
    expect(filesSaid(air)).toBe('');
  });

  it('on the day', () => {
    const d = dayOf({ tests, items, assets: [coder], materials: [], programs: [] }, TODAY, TODAY);
    const line = d.sections.flatMap(s => s.lines).find(l => l.id === 'dw');
    expect(line?.detail).toBe('2 files: GA drawing rev C.pdf, Schematics.pdf');
  });

  it('on the client report — a done stage with files and no words still gets its account', () => {
    const project = { id: 'p', name: 'Line 9', color: '#1f63e0', commissioning: true, createdAt: 1, updatedAt: 1, workspaceIds: [] } as unknown as Project;
    const r = clientReport({ project, projects: [project], assets: [coder], tests, items, materials: [], programs: [], standards: [], today: TODAY });
    const acc = r.sections.find(s => s.gate === 'handover')?.accounts?.find(a => a.stage === drawings.title);
    expect(acc?.files).toBe('2 files: GA drawing rev C.pdf, Schematics.pdf');
  });

  it('on the handover report, under its line; a sign-off says who signed', () => {
    const ho = handoverReport({ project: { name: 'Line 9' }, assets: [coder], tests, items, materials: [], programs: [], today: TODAY });
    const m = ho.machines[0];
    expect(m.items.find(i => i.title === drawings.title)?.files).toBe('2 files: GA drawing rev C.pdf, Schematics.pdf');
    const so = m.items.find(i => i.title === 'Client signed off');
    expect(so?.signOff).toBe(true);
    expect(so?.who).toBe('K. Ahmed');
  });
});

/* SLICE 2 — A STAGE'S ANSWER (docs/PANELS.md items 4–5): one rule, in this
   order — the owner's choice, what the record holds, whole words, Done. */
import { answerByName, answerOf, chosenAnswer, isSignOff } from '../install';
import { isProgramsStage } from '../programs';
import { isRunTest } from '../run';

describe('a stage’s answer', () => {
  const st = (title: string, gate?: 'setup' | 'handover'): Test => ({ id: title, projectId: 'p', kind: 'install', ...(gate ? { gate } : {}), title, outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 });
  const test = (title: string, o: Partial<Test> = {}): Test => ({ id: title, projectId: 'p', title, outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });

  it('by its name, in whole words — no accidental matches', () => {
    expect(answerByName(st('Client signed off', 'handover'))).toBe('signoff');
    expect(answerByName(st('Documents signed off'))).toBe('signoff');
    expect(answerByName(st('Production acceptance', 'handover'))).toBe('signoff');
    expect(answerByName(st('Signal tower checked', 'handover'))).toBe('done');
    expect(answerByName(st('Signage fitted', 'handover'))).toBe('done');
    expect(answerByName(st('Drawings delivered'))).toBe('paperwork');
    expect(answerByName(st('Manuals and drawings handed over', 'handover'))).toBe('paperwork');
    expect(answerByName(st('Spares list agreed', 'handover'))).toBe('paperwork');
    expect(answerByName(st('Programs loaded', 'setup'))).toBe('programs');
    expect(answerByName(st('Training programme agreed', 'setup'))).toBe('done');
    expect(answerByName(st('Programs loaded'))).toBe('done');          // programs only at Set up
    expect(answerByName(st('Positioned and levelled'))).toBe('done');
    expect(answerByName(test('Performance run at the agreed rate'))).toBe('run');
    expect(answerByName(test('Weight accuracy — 400g'))).toBe('done');
  });

  it('the owner’s choice wins, kept by name at its gate', () => {
    const job = { gateStages: { usualAnswer: { 'handover:handover meeting': 'signoff' as const, 'install:drawings delivered': 'done' as const, 'commission:output conveyor interlock proven': 'done' as const } } };
    expect(chosenAnswer(job, st('Handover meeting', 'handover'))).toBe('signoff');
    expect(isSignOff(st('Handover meeting', 'handover'), job)).toBe(true);
    expect(isSignOff(st('Handover meeting', 'handover'))).toBe(false);
    expect(answerOf(st('Drawings delivered'), job)).toBe('done');
    expect(isRunTest(test('Output conveyor interlock proven'), answerOf(test('Output conveyor interlock proven'), job))).toBe(false);
    expect(isRunTest(test('Output conveyor interlock proven'))).toBe(true);   // the name alone still reads a run
  });

  it('what the record holds keeps it — a rename never loses what is on it', () => {
    const renamed = st('PLC software downloaded', 'setup');
    const said: TestItem = { id: 'pp', projectId: 'p', testId: renamed.id, kind: 'next', what: 'Express 1.25 kg', results: [{ is: 'passed', on: TODAY, at: 1 }], sort: 1, createdAt: 1, updatedAt: 1 };
    expect(answerOf(renamed, undefined, [said])).toBe('programs');
    expect(isProgramsStage(renamed, answerOf(renamed, undefined, [said]))).toBe(true);
    expect(isProgramsStage(renamed)).toBe(false);
    const run = test('Line trial', { run: { minutes: 30, packs: 1800 } });
    expect(answerOf(run, { gateStages: { usualAnswer: { 'commission:line trial': 'done' } } })).toBe('run');
  });
});
