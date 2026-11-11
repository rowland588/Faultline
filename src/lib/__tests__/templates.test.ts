/* MY TEMPLATES (docs/CONSULTANT-WORKSPACE.md C5; lib/templates): what a template keeps of a document, a check log and a custom sheet —
 * the customer's values left out by choice — a record started from one being an ordinary record on the line chosen, and the templates
 * kept out of every list (db/studies listAllStudies) while My templates reads them (listTemplates). */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { ToolStudy } from '../study';
import { isTemplate, keptChecks, keptValues, recordFrom, templateFrom, templateKindOf, templateSays, templatesFor } from '../templates';
import { docByKey } from '../../tools/doc/registry';
import { defOf } from '../../tools/checks/registry';
import { newLogStudy } from '../../tools/checks/start';

const T = 1_700_000_000_000;

const charter = (): ToolStudy => ({
  id: 'c1', tool: 'doc', name: 'Branston give-away charter', workspaceId: 'w-branston', projectId: 'p-branston', machine: 'Weigher',
  agreed: { doc: { def: 'charter', signed: { by: 'Ann', at: T } } },
  facts: {
    docValues: {
      measure: 'Give-away on Line 3', baseline: 4.1, baselineHow: 'Mean of ten shifts on the weigher', target: 2, by: '2026-12-01', sponsor: 'Ann Branston',
      scopeIn: 'Line 3, all shifts',
      team: [{ id: 't1', c: { name: 'Jo Marsh', role: 'Line leader', hours: 20 } }, { id: 't2', c: { name: 'Dev Rao', hours: 30 } }],
      milestones: [{ id: 'm1', c: { phase: 'Measure done', date: '2026-12-15' } }],
    },
    docPhotos: [{ id: 'ph', field: 'x', blobKey: 'b', mime: 'image/jpeg', at: T }],
    remarks: [{ id: 'r1', text: 'Branston only', at: T }],
  },
  uses: [], startedAt: T, createdAt: T, updatedAt: T,
} as unknown as ToolStudy);

const sheet = (): ToolStudy => ({
  id: 's1', tool: 'doc', name: 'Downtime capture — Branston', workspaceId: 'w-branston',
  agreed: { doc: { def: 'custom' } },
  facts: {
    customDef: {
      title: 'Downtime capture', purpose: 'What stopped and for how long',
      sections: [{ id: 'sec', title: 'The shift', fields: [{ id: 'planned', label: 'Planned minutes', type: 'number' }, { id: 'area', label: 'Area', type: 'text' }, { id: 'stops', label: 'Stops', type: 'list', columns: [{ id: 'what', label: 'What', type: 'text' }, { id: 'mins', label: 'Minutes', type: 'number' }] }] }],
      metrics: [{ id: 'm', name: 'Minutes stopped', kind: 'sum', of: ['stops.mins'], unit: 'min' }],
    },
    docValues: { planned: 450, area: 'Packing', stops: [{ id: 'a', c: { what: 'Film jam', mins: 30 } }, { id: 'b', c: { mins: 15 } }] },
  },
  uses: [], startedAt: T, createdAt: T, updatedAt: T,
} as unknown as ToolStudy);

const fiveS = (): ToolStudy => {
  const def = defOf('five-s');
  if (!def) throw new Error('no five-s');
  let n = 0;
  const s = newLogStudy(def, { since: T, now: T, name: 'Packing hall 5S — Branston', workspaceId: 'w-branston', where: 'Branston packing hall', id: () => `id${n++}` });
  return { ...s, agreed: { log: { ...s.agreed!.log!, checks: [...s.agreed!.log!.checks, { ...s.agreed!.log!.checks[0], id: 'gone', name: 'Taken off', removed: true }].map(c => ({ ...c, who: 'Ann' })) } },
    facts: { results: [{ id: 'r', checkId: 'id1', at: T, outcome: 'pass' }] } };
};

describe('what a template is of', () => {
  it('a document, a custom sheet and a check log can be one; another tool cannot', () => {
    expect(templateKindOf(charter())).toBe('doc');
    expect(templateKindOf(sheet())).toBe('sheet');
    expect(templateKindOf(fiveS())).toBe('log');
    expect(templateKindOf({ tool: 'capability', agreed: {} } as ToolStudy)).toBeUndefined();
    const r = templateFrom({ ...charter(), tool: 'capability' } as ToolStudy, { name: 'x', keep: 'text', now: T });
    expect(r.ok).toBe(false);
  });
});

describe('a document saved as my template', () => {
  it('keep the words — text, long and choice boxes, list rows with only their word cells; numbers, dates, people and photos left out', () => {
    const r = templateFrom(charter(), { name: 'My site charter', note: 'For a first visit', keep: 'text', now: T, id: 't' });
    if (!r.ok) throw new Error(r.why);
    const t = r.t;
    expect(t.workspaceId).toBeUndefined(); expect(t.projectId).toBeUndefined(); expect(t.machine).toBeUndefined();
    expect(t.agreed).toEqual({ doc: { def: 'charter' } });
    expect(isTemplate(t)).toBe(true);
    expect(t.facts.template).toEqual({ kind: 'doc', keep: 'text', of: 'Project charter', note: 'For a first visit', savedAt: T });
    const v = t.facts.docValues ?? {};
    expect(v.measure).toBe('Give-away on Line 3');
    expect(v.baselineHow).toBe('Mean of ten shifts on the weigher');
    expect(v.scopeIn).toBe('Line 3, all shifts');
    expect(v.baseline).toBeUndefined(); expect(v.target).toBeUndefined(); expect(v.by).toBeUndefined(); expect(v.sponsor).toBeUndefined();
    /* the team: the role kept, the name (a person) and the hours (a number) left out; a row with nothing left is dropped */
    expect((v.team as { c: object }[]).map(x => x.c)).toEqual([{ role: 'Line leader' }]);
    expect((v.milestones as { c: object }[]).map(x => x.c)).toEqual([{ phase: 'Measure done' }]);
    expect(t.facts.docPhotos).toBeUndefined(); expect(t.facts.remarks).toBeUndefined();
    expect(templateSays(t)).toBe('Project charter · the words you wrote · 5 boxes filled');
  });
  it('keep only the structure — every box empty', () => {
    const r = templateFrom(charter(), { name: 'Charter', keep: 'structure', now: T });
    if (!r.ok) throw new Error(r.why);
    expect(r.t.facts.docValues).toBeUndefined();
    expect(keptValues(docByKey('charter'), charter().facts.docValues ?? {}, 'structure')).toEqual({});
  });
  it('a name is needed', () => {
    expect(templateFrom(charter(), { name: '  ', keep: 'text', now: T })).toEqual({ ok: false, why: 'A template needs a name.' });
  });
});

describe('a custom sheet saved as my template', () => {
  it('its sections, boxes and metrics kept; with the words, the text cells only', () => {
    const r = templateFrom(sheet(), { name: 'Downtime sheet', keep: 'text', now: T });
    if (!r.ok) throw new Error(r.why);
    expect(r.t.facts.customDef?.metrics?.[0].of).toEqual(['stops.mins']);
    expect(r.t.facts.docValues).toEqual({ area: 'Packing', stops: [{ id: expect.any(String), c: { what: 'Film jam' } }] });
    expect(r.t.facts.template?.kind).toBe('sheet');
    expect(r.t.facts.template?.of).toBe('Downtime capture');
    const s = templateFrom(sheet(), { name: 'Downtime sheet', keep: 'structure', now: T });
    if (!s.ok) throw new Error(s.why);
    expect(s.t.facts.docValues).toBeUndefined();
    expect(s.t.facts.customDef?.sections[0].fields.map(f => f.id)).toEqual(['planned', 'area', 'stops']);
    expect(templateSays(s.t)).toBe('Downtime capture · 1 section, 1 metric · the structure only');
  });
});

describe('a check log saved as my template', () => {
  it('the live checks kept with fresh ids, no results; only the checks — where and who left out', () => {
    const src = fiveS();
    const live = src.agreed!.log!.checks.filter(c => !c.removed);
    const r = templateFrom(src, { name: 'My 5S audit', keep: 'structure', now: T });
    if (!r.ok) throw new Error(r.why);
    const checks = r.t.agreed?.log?.checks ?? [];
    expect(checks.map(c => c.name)).toEqual(live.map(c => c.name));
    expect(checks.every(c => !c.where && !c.who && !live.some(l => l.id === c.id))).toBe(true);
    expect(r.t.facts.results).toBeUndefined();
    expect(r.t.agreed?.log?.key).toBe('five-s');
    const kept = keptChecks(live, 'text');
    expect(kept.every(c => c.where === 'Branston packing hall' && c.who === 'Ann')).toBe(true);
  });
});

describe('a record started from a template', () => {
  it('an ordinary record on the line chosen, carrying what was kept and no mark', () => {
    const r = templateFrom(sheet(), { name: 'Downtime sheet', keep: 'structure', now: T });
    if (!r.ok) throw new Error(r.why);
    const s = recordFrom(r.t, { name: 'Downtime — Cobb', workspaceId: 'w-cobb', now: T + 1 });
    if (!s.ok) throw new Error(s.why);
    expect(s.s.workspaceId).toBe('w-cobb');
    expect(s.s.name).toBe('Downtime — Cobb');
    expect(isTemplate(s.s)).toBe(false);
    expect(s.s.agreed).toEqual({ doc: { def: 'custom' } });
    expect(s.s.facts.customDef?.title).toBe('Downtime capture');
    expect(s.s.facts.docValues).toBeUndefined();
    expect(s.s.id).not.toBe(r.t.id);
  });
  it('a log needs a line; started on one, its checks are its own', () => {
    const r = templateFrom(fiveS(), { name: 'My 5S audit', keep: 'structure', now: T });
    if (!r.ok) throw new Error(r.why);
    expect(recordFrom(r.t, { now: T }).ok).toBe(false);
    const s = recordFrom(r.t, { workspaceId: 'w-cobb', now: T + 5 });
    if (!s.ok) throw new Error(s.why);
    expect(s.s.name).toBe('My 5S audit');
    expect(s.s.agreed?.log?.since).toBe(T + 5);
    expect(s.s.agreed?.log?.checks.length).toBe(r.t.agreed?.log?.checks.length);
    expect(s.s.agreed?.log?.checks.some(c => r.t.agreed?.log?.checks.some(x => x.id === c.id))).toBe(false);
    expect(s.s.facts.results).toEqual([]);
  });
  it('the New sheets find the templates of their own kind', () => {
    const a = templateFrom(charter(), { name: 'A', keep: 'text', now: T }), b = templateFrom(fiveS(), { name: 'B', keep: 'text', now: T });
    if (!a.ok || !b.ok) throw new Error('no');
    expect(templatesFor([a.t, b.t], { doc: 'charter' }).map(t => t.name)).toEqual(['A']);
    expect(templatesFor([a.t, b.t], { log: 'five-s' }).map(t => t.name)).toEqual(['B']);
    expect(templatesFor([a.t, b.t], { doc: 'sipoc' })).toEqual([]);
  });
});

describe('kept out of every customer’s records — against the real store', () => {
  beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
  it('listAllStudies leaves a template out, a line and a project find none, listTemplates finds it; a record started from it is listed', async () => {
    const db = await import('../../db');
    const tpl = await import('../templates');
    const ws = await db.createWorkspace('Cobb Packing 1');
    const src = charter();
    await db.putStudy({ ...src, workspaceId: ws.id, projectId: undefined } as ToolStudy);
    const saved = await tpl.saveAsTemplate({ ...src, workspaceId: ws.id } as ToolStudy, { name: 'My charter', keep: 'text' });
    if (!saved.ok) throw new Error(saved.why);
    expect((await db.listAllStudies()).map(s => s.id)).toEqual([src.id]);
    expect((await db.listStudiesForLine(ws.id)).map(s => s.id)).toEqual([src.id]);
    expect((await db.listTemplates()).map(s => s.name)).toEqual(['My charter']);
    const started = await tpl.startFromTemplate(saved.t.id, { name: 'Cobb charter', workspaceId: ws.id });
    if (!started.ok) throw new Error(started.why);
    expect((await db.listAllStudies()).map(s => s.name).sort()).toEqual(['Branston give-away charter', 'Cobb charter']);
    expect((await db.listTemplates()).length).toBe(1);
    await tpl.editTemplate(saved.t.id, { name: 'Site charter', note: 'first visits' });
    const [t1] = await db.listTemplates();
    expect([t1.name, t1.facts.template?.note]).toEqual(['Site charter', 'first visits']);
    const undo = await tpl.removeTemplate(saved.t.id);
    expect(await db.listTemplates()).toEqual([]);
    await undo();
    expect((await db.listTemplates()).map(s => s.name)).toEqual(['Site charter']);
  }, 30_000);
});
