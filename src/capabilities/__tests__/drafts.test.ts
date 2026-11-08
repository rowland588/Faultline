/* BUILDING A TOOL IN CONVERSATION (docs/AI-MODE.md, Building tools in conversation A · B · C) — the field maps read from the
 * definitions, what is captured and missing, corrections, refusals, the metrics worked out by code, and the record EXACTLY as the
 * tool's own New makes it; then the capabilities on a conversation in a fake IndexedDB: a draft started, filled, corrected, asked
 * about, refused unconfirmed, made, updated, and refused to a client. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
  adaptDraft, applyDraft, baseFields, captured, changedSinceMade, fieldsOf, fillableTools, fillDraft, madeSnapshot, metricsOf, missing, SMED_FIELDS, toRecord,
} from '../drafts';
import type { ColleagueDraft, DraftKind } from '../types';
import { calcByKey } from '../../tools/calc/registry';
import { newCalcStudy, runCalc } from '../../tools/calc/calc';
import { docByKey } from '../../tools/doc/registry';
import { newDocStudy } from '../../tools/doc/doc';
import { defOf as logDefOf } from '../../tools/checks/registry';
import { newLogStudy } from '../../tools/checks/start';
import { newChangeoverStudy } from '../../tools/changeover/changeover';
import { customDocDef, customProblems, docDefOf, metricValue } from '../../tools/doc/custom';
import { runDoc, valuesOf } from '../../tools/doc/doc';
import type { CustomDef } from '../../tools/doc/types';

const NOW = 1_762_600_000_000;
const draft = (kind: DraftKind, key: string, o: Partial<ColleagueDraft> = {}): ColleagueDraft => ({ id: 'd1', kind, key, title: 'A draft', scope: {}, values: {}, status: 'draft', at: NOW, ...o });

const SHEET: CustomDef = {
  title: 'Downtime capture sheet', purpose: 'What stopped the line, how long, and what share of the shift it took',
  sections: [
    { id: 's1', title: 'The shift', fields: [{ id: 'shift', label: 'Shift', type: 'choice', options: ['Days', 'Nights'] }, { id: 'planned', label: 'Planned minutes', type: 'number', unit: 'min', required: true }] },
    { id: 's2', title: 'The stops', fields: [{ id: 'stops', label: 'Stops', type: 'list', columns: [{ id: 'what', label: 'What stopped', type: 'text' }, { id: 'min', label: 'Minutes', type: 'number', unit: 'min' }] }] },
  ],
  metrics: [
    { id: 'down', name: 'Minutes down', kind: 'sum', of: ['stops.min'], unit: 'min' },
    { id: 'share', name: 'Share of the shift down', kind: 'ratio', of: ['stops.min', 'planned'], unit: '%' },
    { id: 'n', name: 'Stops counted', kind: 'count', of: ['stops'] },
    { id: 'avg', name: 'Average stop', kind: 'average', of: ['stops.min'], unit: 'min' },
    { id: 'left', name: 'Minutes running', kind: 'difference', of: ['planned', 'stops.min'], unit: 'min' },
  ],
};

describe('the field maps are read from the definitions', () => {
  it('a calculator: its asked inputs, needed unless optional, money or given a starting point', () => {
    const def = calcByKey('kanban');
    expect(def).toBeTruthy();
    const fs = baseFields('calc', 'kanban') ?? [];
    expect(fs.map(f => f.name)).toEqual(def?.inputs.filter(f => !f.hidden).map(f => f.id));
    expect(fs.filter(f => f.required).map(f => f.name)).toEqual(['usage', 'usageHours', 'leadMin', 'container']);
    expect(fs.find(f => f.name === 'leadMin')).toMatchObject({ type: 'number', unit: 'minutes' });
  });
  it('a document: its boxes and lists with their columns, photos left to the page', () => {
    const fs = baseFields('doc', 'sipoc') ?? [];
    expect(fs.map(f => f.name)).toEqual(['process', 'start', 'end', 'steps', 'outside']);
    expect(fs.find(f => f.name === 'steps')?.columns?.map(c => c.name)).toEqual(['step', 'suppliers', 'inputs', 'outputs', 'customers', 'watch']);
    expect((baseFields('doc', 'sop') ?? []).some(f => f.type === ('photos' as never))).toBe(false);
  });
  it('a check log: where (in its own word), shift hours, and its starter checks to leave out', () => {
    const def = logDefOf('metal-detection');
    const fs = baseFields('check', 'metal-detection') ?? [];
    expect(fs.find(f => f.name === 'where')?.label).toBe(def?.whereLabel);
    expect(fs.find(f => f.name === 'leaveOut')?.columns?.[0].options).toEqual(def?.starterChecks.map(c => c.name));
  });
  it('SMED and a custom sheet; the catalogue lists every kind and no register of cards', () => {
    expect(baseFields('smed', 'smed')?.map(f => f.name)).toEqual(SMED_FIELDS.map(f => f.name));
    expect(baseFields('custom', 'custom', SHEET)?.map(f => f.name)).toEqual(['shift', 'planned', 'stops']);
    const kinds = new Set(fillableTools().map(t => t.kind));
    expect([...kinds].sort()).toEqual(['calc', 'check', 'doc', 'scored', 'smed']);
    expect(fillableTools().some(t => t.key === 'fmea' || t.key === 'pugh')).toBe(false);
    expect(baseFields('calc', 'no-such')).toBeUndefined();
  });
});

describe('filling, correcting, adapting', () => {
  it('captured and missing; a number checked against its field; verified refused; a correction keeps what it replaced', () => {
    let d = draft('smed', 'smed');
    expect(missing(d).map(f => f.name)).toEqual(['current', 'target', 'elements']);
    const r = fillDraft(d, [
      { field: 'current', value: 42, how: 'reported', said: 'around 42 minutes' }, { field: 'target', value: '25', how: 'reported' },
      { field: 'machines', value: ['Filler', 'Bagger', 'Wrapper'], how: 'reported' }, { field: 'elements', value: [{ name: 'Cleaning' }, { name: 'Waiting for engineering' }], how: 'reported' },
      { field: 'current', value: 'about forty', how: 'reported' }, { field: 'target', value: 25, how: 'verified' }, { field: 'nope', value: 1, how: 'reported' },
    ], NOW);
    d = r.draft;
    expect(r.refused).toHaveLength(3);
    expect(missing(d)).toEqual([]);
    expect(captured(d).map(c => `${c.field.name}=${c.words}`)).toEqual(['current=42 min', 'target=25 min', 'machines=Filler; Bagger; Wrapper', 'elements=Cleaning; Waiting for engineering']);
    const c = fillDraft(d, [{ field: 'current', value: 45, how: 'reported', said: '45, not 42' }], NOW + 1);
    expect(c.corrected).toEqual(['How long a changeover takes now: 42 min → 45 min']);
    expect(c.draft.values.current.value).toBe(45);
    expect(c.draft.values.current.earlier?.[0]).toMatchObject({ value: 42, how: 'reported', said: 'around 42 minutes' });
    /* a single row adds to a list; an element's time only when said */
    const e = fillDraft(c.draft, [{ field: 'elements', value: { name: 'Line clearance', minutes: 6 }, how: 'measured' }], NOW + 2).draft;
    expect(e.values.elements.value).toEqual([{ name: 'Cleaning' }, { name: 'Waiting for engineering' }, { name: 'Line clearance', minutes: 6 }]);
    /* a choice by its words */
    expect(fillDraft(e, [{ field: 'elements', value: [{ name: 'X', side: 'External — while it runs' }], how: 'observed' }], NOW).draft.values.elements.value).toEqual([{ name: 'X', side: 'external' }]);
  });
  it('adapting adds to this record only, leaves out an optional field, never a required one', () => {
    const d = draft('calc', 'kanban');
    const r = adaptDraft(d, [{ section: 'Ours', field: { name: 'supplier', label: 'Supplier', type: 'text' } }], ['thing', 'usage']);
    expect(r.added).toEqual(['Supplier']);
    expect(r.removed).toEqual(['What is in the container']);
    expect(r.refused[0]).toMatch(/needs — it cannot be taken off/);
    expect(fieldsOf(r.draft).find(f => f.name === 'supplier')).toMatchObject({ added: true, section: 'Ours' });
    expect(fieldsOf(r.draft).some(f => f.name === 'thing')).toBe(false);
    expect(adaptDraft(r.draft, [{ field: { name: 'supplier', label: 'Again', type: 'text' } }], []).refused[0]).toMatch(/already/);
  });
});

describe('metrics are worked out by code', () => {
  it('sum, ratio as a percentage, count, average, difference — and what each waits on', () => {
    const def = customDocDef(SHEET);
    const raw = { planned: 450, stops: [{ id: 'a', c: { what: 'Film', min: 12 } }, { id: 'b', c: { what: 'Jam', min: 33 } }] };
    const v = valuesOf(def, raw);
    const m = Object.fromEntries((SHEET.metrics ?? []).map(x => [x.id, metricValue(x, v, SHEET)]));
    expect(m.down.value).toBe(45);
    expect(m.share.value).toBe(10);
    expect(m.share.said).toBe('10%');
    expect(m.n.value).toBe(2);
    expect(m.avg.value).toBe(22.5);
    expect(m.left.value).toBe(405);
    const none = metricValue(SHEET.metrics?.[1] as never, valuesOf(def, { planned: 450 }), SHEET);
    expect(none.value).toBeUndefined();
    expect(none.missing).toEqual(['Stops — Minutes']);
    expect(metricValue({ id: 'z', name: 'Z', kind: 'ratio', of: ['stops.min', 'planned'] }, valuesOf(def, { ...raw, planned: 0 }), SHEET).missing[0]).toMatch(/is 0/);
  });
  it('a structure is checked; the sheet reads as a document with its metrics on the page and the paper', () => {
    expect(customProblems(SHEET)).toEqual([]);
    expect(customProblems({ ...SHEET, metrics: [{ id: 'x', name: 'X', kind: 'sum', of: ['shift'] }] })[0]).toMatch(/not a number/);
    expect(customProblems({ ...SHEET, metrics: [{ id: 'x', name: 'X', kind: 'ratio', of: ['planned'] }] })[0]).toMatch(/exactly two/);
    const s = { agreed: { doc: { def: 'custom' } }, facts: { customDef: SHEET, docValues: { planned: 450, stops: [{ id: 'a', c: { min: 45 } }] } } };
    const def = docDefOf(s);
    expect(def?.title).toBe('Downtime capture sheet');
    const run = runDoc(def as never, s.facts.docValues, [], { today: '2026-11-08' });
    expect(run.result.sentence).toContain('Share of the shift down: 10%');
    expect(run.result.tables?.[0].rows.find(r => r[0] === 'Minutes down')?.[1]).toBe('45 min');
    expect(docDefOf({ agreed: { doc: { def: 'custom' } }, facts: {} })).toBeUndefined();
    expect(metricsOf(draft('custom', 'custom', { structure: SHEET, values: { planned: { value: 450, how: 'reported', at: NOW }, stops: { value: [{ what: 'Film', min: 45 }], how: 'measured', at: NOW } } })).find(x => x.metric.id === 'share')?.said).toBe('10%');
  });
});

describe('the record is exactly what the tool’s New makes', () => {
  it('a calculator', () => {
    const def = calcByKey('kanban');
    if (!def) throw new Error('no kanban');
    const ex = def.examples[0].inputs;
    const d = fillDraft(draft('calc', 'kanban', { title: 'Tray kanban', scope: { lineId: 'w1' } }), Object.entries(ex).map(([field, value]) => ({ field, value, how: 'reported' })), NOW).draft;
    const made = toRecord(d, { id: 's1', now: NOW });
    expect(made).toEqual(newCalcStudy(def, { id: 's1', name: 'Tray kanban', now: NOW, workspaceId: 'w1', inputs: ex }));
    expect(runCalc(def, made?.agreed?.calc?.inputs).result?.sentence).toBe(def.examples[0].expect.sentence);
  });
  it('a document', () => {
    const def = docByKey('sipoc');
    if (!def) throw new Error('no sipoc');
    const d = fillDraft(draft('doc', 'sipoc', { title: 'Slicing' }), [{ field: 'process', value: 'Slicing and packing', how: 'reported' }, { field: 'steps', value: [{ step: 'Slice' }, { step: 'Pack' }], how: 'observed' }], NOW).draft;
    const made = toRecord(d, { id: 's2', now: NOW });
    const base = newDocStudy(def, { id: 's2', name: 'Slicing', now: NOW });
    expect(made).toEqual({ ...base, facts: { ...base.facts, docValues: { ...(base.facts.docValues ?? {}), process: 'Slicing and packing', steps: [{ id: 'd1-steps-1', c: { step: 'Slice' } }, { id: 'd1-steps-2', c: { step: 'Pack' } }] } } });
  });
  it('a check log, leaving a starter check out', () => {
    const def = logDefOf('metal-detection');
    if (!def) throw new Error('no log');
    const left = def.starterChecks[0].name;
    const d = fillDraft(draft('check', 'metal-detection', { title: 'MD line 2', scope: { lineId: 'w1' } }), [{ field: 'shiftHours', value: 12, how: 'reported' }, { field: 'leaveOut', value: [{ check: left }], how: 'reported' }], NOW).draft;
    let n = 0, m = 0;
    const made = toRecord(d, { id: 's3', now: NOW, checkId: () => `c${++n}` });
    const pick = def.starterChecks.map((_, i) => i).slice(1);
    const want = newLogStudy(def, { name: 'MD line 2', workspaceId: 'w1', since: NOW, now: NOW, pick, shiftHours: 12, id: () => (m++ === 0 ? 's3' : `c${m - 1}`) });
    expect(made).toEqual(want);
    expect(made?.agreed?.log?.checks.some(c => c.name === left)).toBe(false);
    expect(missing(draft('check', 'metal-detection')).map(f => f.name)).toEqual(['line']);
  });
  it('SMED: the New’s record, then the target, the elements, the products, and what it has no box for in its notes', () => {
    const bare = toRecord(fillDraft(draft('smed', 'smed', { title: 'Maris → Tesco' }), [{ field: 'fromProduct', value: 'Maris', how: 'reported' }, { field: 'toProduct', value: 'Tesco', how: 'reported' }], NOW).draft, { id: 's4', now: NOW });
    expect(bare).toEqual(newChangeoverStudy({ id: 's4', name: 'Maris → Tesco', from: 'Maris', to: 'Tesco', now: NOW }));
    const d = fillDraft(draft('smed', 'smed', { title: 'Line 2A changeovers', scope: { lineId: 'w1' } }), [
      { field: 'current', value: 42, how: 'reported', said: 'around 42 minutes' }, { field: 'target', value: 25, how: 'reported' },
      { field: 'machines', value: ['Filler', 'Bagger', 'Wrapper'], how: 'reported' }, { field: 'products', value: ['A', 'B', 'C', 'D', 'E', 'F'], how: 'reported' },
      { field: 'elements', value: [{ name: 'Cleaning' }, { name: 'Waiting for engineering', minutes: 10 }], how: 'reported' },
    ], NOW).draft;
    const s = toRecord(d, { id: 's5', now: NOW });
    expect(s?.agreed?.changeover).toEqual({ minutes: 25 });
    expect(s?.facts.sequence?.map(x => [x.name, x.sec, x.side, x.source])).toEqual([['Cleaning', undefined, 'internal', 'typed'], ['Waiting for engineering', 600, 'internal', 'typed']]);
    expect(s?.facts.products?.map(p => p.product)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(s?.facts.remarks?.map(r => r.text)).toEqual(['A changeover takes about 42 min now — reported (“around 42 minutes”).', 'The machines on the line: Filler; Bagger; Wrapper — reported.']);
  });
  it('a field added to this record is kept in its notes; on a log it is a check added', () => {
    const a = adaptDraft(draft('calc', 'kanban'), [{ field: { name: 'supplier', label: 'Supplier', type: 'text' } }], []).draft;
    const s = toRecord(fillDraft(a, [{ field: 'supplier', value: 'Smurfit', how: 'reported' }], NOW).draft, { id: 's6', now: NOW });
    expect(s?.facts.remarks?.[0].text).toBe('Supplier: Smurfit — reported.');
    expect(s?.agreed?.calc?.inputs).not.toHaveProperty('supplier');
    const l = adaptDraft(draft('check', 'metal-detection', { scope: { lineId: 'w1' } }), [{ field: { name: 'reject_bin', label: 'Reject bin locked', type: 'text' } }], []).draft;
    const log = toRecord(l, { id: 's7', now: NOW });
    expect(log?.agreed?.log?.checks.slice(-1)[0]).toMatchObject({ name: 'Reject bin locked', kind: 'passfail' });
  });
  it('made again: only what the conversation changed is written — an edit in Manual Mode stays', () => {
    const def = calcByKey('kanban');
    if (!def) throw new Error('no kanban');
    let d = fillDraft(draft('calc', 'kanban'), [{ field: 'usage', value: 1500, how: 'reported' }, { field: 'container', value: 60, how: 'reported' }], NOW).draft;
    const s = toRecord(d, { id: 's8', now: NOW });
    if (!s) throw new Error('not made');
    d = { ...d, status: 'made', studyId: 's8', madeValues: madeSnapshot(d) };
    /* Manual Mode changes the usage on the page; the conversation then changes the container */
    const edited = { ...s, agreed: { ...s.agreed, calc: { key: 'kanban', inputs: { ...(s.agreed?.calc?.inputs ?? {}), usage: 1800 } } } };
    d = fillDraft(d, [{ field: 'container', value: 48, how: 'measured' }], NOW + 5).draft;
    expect(changedSinceMade(d)).toEqual(['container']);
    const after = applyDraft(edited, d, NOW + 5, changedSinceMade(d));
    expect(after.agreed?.calc?.inputs).toMatchObject({ usage: 1800, container: 48 });
  });
});

/* ------------------------------------------------------------------ the capabilities on a conversation */

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), conv: await import('../../colleague/conversation') });

describe('the capabilities: start, fill, ask, make', () => {
  it('Rowland’s changeover: a SMED filled, corrected, refused unconfirmed, made on confirm, updated, and refused to a client', async () => {
    const { db, reg, lines, conv } = await fresh();
    const line = await lines.addLineToFactory('Line 2A');
    const c = conv.newConversation({ id: 'conv', at: NOW, name: 'AI', thread: { id: 't1', title: 'Line 2A', scope: { lineId: line.id } } });
    await db.putStudy(c);
    const ctx = { now: NOW, conversationId: 'conv' };
    const run = (name: string, input: unknown, confirmed = false) => reg.runCall(ctx, { id: `c-${name}`, name, input }, { confirmed });
    const cat = await run('tool_catalogue', { words: 'changeover' });
    expect(cat.ok && JSON.stringify(cat.data)).toContain('"key":"smed"');
    const st = await run('start_draft', { kind: 'smed', key: 'smed', title: 'Line 2A changeovers' });
    expect(st.ok).toBe(true);
    const draftId = st.ok ? (st.data as { draftId: string }).draftId : '';
    const f = await run('fill_draft', { draftId, values: [
      { field: 'current', value: 42, how: 'reported', said: 'around 42 minutes' }, { field: 'target', value: 25, how: 'reported' },
      { field: 'machines', value: ['Filler', 'Bagger', 'Wrapper'], how: 'reported' }, { field: 'elements', value: ['Cleaning', 'Waiting for engineering'], how: 'reported' },
    ] });
    expect(f.ok && f.says).toMatch(/Kept: .*Nothing required is missing|Everything it needs/);
    expect((await run('fill_draft', { draftId, values: [{ field: 'current', value: 45, how: 'verified' }] })).ok).toBe(false);
    const cor = await run('fill_draft', { draftId, values: [{ field: 'current', value: 45, how: 'reported', said: '45, not 42' }] });
    expect(cor.ok && cor.says).toContain('42 min → 45 min');
    const state = await run('draft_state', { draftId });
    expect(state.ok && state.says).toContain('How long a changeover takes now 45 min (reported)');
    expect((await run('make_record', { draftId })).ok).toBe(false);
    const refused = await reg.runCall({ ...ctx, level: 'client' }, { id: 'y', name: 'make_record', input: { draftId } }, { confirmed: true });
    expect(refused.ok).toBe(false);
    expect((await db.listAllStudies()).some(s => s.tool === 'changeover')).toBe(false);
    expect((await run('make_record', { draftId }, true)).ok).toBe(true);
    const studies = (await db.listAllStudies()).filter(s => s.tool === 'changeover');
    expect(studies).toHaveLength(1);
    expect(studies[0].agreed?.changeover).toEqual({ minutes: 25 });
    expect(studies[0].facts.sequence?.map(x => x.name)).toEqual(['Cleaning', 'Waiting for engineering']);
    expect(studies[0].facts.remarks?.[0].text).toContain('45 min');
    /* made: the draft knows it, and a second make updates the same record with only what changed */
    expect((await run('make_record', { draftId }, true)).ok).toBe(false);   /* nothing changed since */
    await run('fill_draft', { draftId, values: [{ field: 'target', value: 20, how: 'reported' }] });
    const up = await run('make_record', { draftId }, true);
    expect(up.ok && up.says).toMatch(/Updated/);
    const again = (await db.listAllStudies()).filter(s => s.tool === 'changeover');
    expect(again).toHaveLength(1);
    expect(again[0].agreed?.changeover).toEqual({ minutes: 20 });
  }, 60_000);

  it('a custom sheet: built, filled, its metric worked out by code, made as a document of its own structure', async () => {
    const { db, reg, conv } = await fresh();
    await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI' }));
    const ctx = { now: NOW, conversationId: 'conv' };
    const run = (name: string, input: unknown, confirmed = false) => reg.runCall(ctx, { id: `c-${name}`, name, input }, { confirmed });
    expect((await run('create_sheet', { title: 'X', purpose: 'Y', sections: [{ title: 'A', fields: [{ label: 'N', type: 'text' }] }], metrics: [{ name: 'Bad', kind: 'sum', of: ['n'] }] })).ok).toBe(false);
    const made = await run('create_sheet', {
      title: 'Downtime capture sheet', purpose: 'What stopped the line and for how long',
      sections: [{ title: 'The shift', fields: [{ name: 'planned', label: 'Planned minutes', type: 'number', unit: 'min', required: true }] },
        { title: 'The stops', fields: [{ name: 'stops', label: 'Stops', type: 'list', columns: [{ name: 'what', label: 'What stopped', type: 'text' }, { name: 'min', label: 'Minutes', type: 'number' }] }] }],
      metrics: [{ name: 'Share of the shift down', kind: 'ratio', of: ['stops.min', 'planned'], unit: '%' }],
    });
    expect(made.ok).toBe(true);
    const draftId = made.ok ? (made.data as { draftId: string }).draftId : '';
    const f = await run('fill_draft', { draftId, values: [{ field: 'planned', value: 450, how: 'reported' }, { field: 'stops', value: [{ what: 'Film', min: 12 }, { what: 'Jam', min: 33 }], how: 'measured' }] });
    expect(f.ok && f.says).toContain('Share of the shift down 10%');
    const m = await run('make_record', { draftId }, true);
    expect(m.ok).toBe(true);
    const doc = (await db.listAllStudies()).find(s => s.tool === 'doc');
    expect(doc?.agreed?.doc?.def).toBe('custom');
    expect(doc?.facts.customDef?.title).toBe('Downtime capture sheet');
    expect((await import('../../tools/doc/doc')).docSays(doc as never).text).toContain('Share of the shift down: 10%');
  }, 60_000);
});
