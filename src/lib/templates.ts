/* MY TEMPLATES — the consultant's own starting points, kept apart from every customer (11 November, docs/CONSULTANT-WORKSPACE.md C5 —
 * Rowland: "my assessment frameworks, operational improvement methodologies, report formats, checklists and reusable templates should be
 * available when I start working with a completely new business. I should not have to recreate my consulting approach for every client
 * … Reusable templates and my own consulting methodology should not be tied to Branston simply because that was the first factory
 * configured.").
 *
 * WHAT CAN BE ONE: a document (its kind, and — by choice — the words written in its boxes), a check log's list of checks, and a custom
 * capture sheet (its sections, boxes and code-worked metrics). A template is a STARTING POINT for a record of a kind the app already has;
 * never a new method, a new tool or a change to a definition (docs/DIRECTION.md: the methods are fixed in code).
 *
 * STORAGE, NO NEW NOUN, NO MIGRATION: a template is a study of the SAME tool as its source ('doc' or 'log' — studies_tool_check already
 * takes both) on NO line and in NO project, carrying `facts.template` (lib/study TemplateMark). The cloud's "own studies" policy keeps
 * such a row its owner's — it syncs to every device the consultant signs in on and to nobody else, and it is no customer's (a record's
 * customer is its line's or its project's: lib/activeClient). Weighed: the person's preferences (supabase/PREFERENCES.sql) are one
 * text, not records with photos and lists; device storage alone does not follow the consultant to the next site.
 *
 * KEPT OUT OF EVERY CUSTOMER'S RECORDS: db/studies listAllStudies leaves a template out, so every list, count, report, search, the Story
 * and Luna's reads (all read through it) never see one; a line's or a project's readers find none (it has neither). listTemplates is the
 * one reader that returns them.
 *
 * Pure but for the writes at the foot, which go through the db's own functions. */
import type { LogCheck, TemplateMark, ToolStudy } from './study';
import type { DocDef, DocItem, DocRow, DocValues } from '../tools/doc/types';
import { docDefOf, CUSTOM_KEY } from '../tools/doc/custom';
import { docByKey } from '../tools/doc/registry';
import { defOf } from '../tools/checks/registry';
import { uid } from './ids';

export type TemplateKind = TemplateMark['kind'];
export type TemplateKeep = TemplateMark['keep'];

/** Is this record one of the consultant's templates — never a customer's record? */
export const isTemplate = (s: Pick<ToolStudy, 'facts'> | undefined): boolean => !!s?.facts?.template;

/** What a record could be saved as — undefined for a record that cannot be a template. */
export function templateKindOf(s: Pick<ToolStudy, 'tool' | 'agreed'>): TemplateKind | undefined {
  if (s.tool === 'doc') return s.agreed?.doc?.def === CUSTOM_KEY ? 'sheet' : s.agreed?.doc?.def ? 'doc' : undefined;
  if (s.tool === 'log') return s.agreed?.log?.key ? 'log' : undefined;
  return undefined;
}

export const KIND_WORDS: Record<TemplateKind, string> = { doc: 'Document', log: 'Check log', sheet: 'Custom sheet' };

/** What a record is of, in words — its kind's own title. */
export function ofWords(s: Pick<ToolStudy, 'tool' | 'agreed' | 'facts'>): string {
  const k = templateKindOf(s);
  if (k === 'sheet') return s.facts?.customDef?.title?.trim() || 'Custom sheet';
  if (k === 'doc') return docByKey(s.agreed?.doc?.def)?.title ?? 'Document';
  if (k === 'log') return defOf(s.agreed?.log?.key)?.title ?? 'Check log';
  return 'Record';
}

/** The two ways of keeping, as the save sheet says them. */
export function keepChoices(kind: TemplateKind): { keep: TemplateKeep; label: string; says: string }[] {
  return kind === 'log'
    ? [
      { keep: 'text', label: 'Keep the checks as written', says: 'Each check with where it is done and who does it, as on this log. No results are kept.' },
      { keep: 'structure', label: 'Keep only the checks', says: 'Each check, its schedule, what passes and what to do — where and who left out, for the next site to fill in.' },
    ]
    : [
      { keep: 'text', label: 'Keep the words I wrote', says: 'The wording in its boxes and list rows. Names, dates, figures and photos are left out — they belong to this customer.' },
      { keep: 'structure', label: 'Keep only the structure', says: kind === 'sheet' ? 'Its sections, boxes and metrics — every box empty.' : 'The kind of document — every box empty.' },
    ];
}

/** A short line on what a template holds: "Project charter · the words you wrote · 4 boxes", "5S audit · 6 checks". */
export function templateSays(t: Pick<ToolStudy, 'tool' | 'agreed' | 'facts'>): string {
  const m = t.facts?.template;
  if (!m) return '';
  const keep = m.keep === 'text' ? (m.kind === 'log' ? 'as written' : 'the words you wrote') : 'the structure only';
  if (m.kind === 'log') {
    const n = (t.agreed?.log?.checks ?? []).filter(c => !c.removed).length;
    return `${m.of} · ${n} check${n === 1 ? '' : 's'} · ${keep}`;
  }
  const filled = Object.values(t.facts?.docValues ?? {}).filter(v => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '')).length;
  const shape = m.kind === 'sheet' && t.facts?.customDef
    ? `${t.facts.customDef.sections.length} section${t.facts.customDef.sections.length === 1 ? '' : 's'}${(t.facts.customDef.metrics ?? []).length ? `, ${(t.facts.customDef.metrics ?? []).length} metric${(t.facts.customDef.metrics ?? []).length === 1 ? '' : 's'}` : ''}`
    : '';
  return [m.of, shape, keep, m.keep === 'text' && filled ? `${filled} box${filled === 1 ? '' : 'es'} filled` : ''].filter(Boolean).join(' · ');
}

/* ------------------------------------------------------------------------------------------------------------------------------ */
/*  WHAT IS KEPT — the customer's values left out by choice                                                                         */
/* ------------------------------------------------------------------------------------------------------------------------------ */

/** A box kind whose words are the consultant's own wording — text, long text, a choice. Numbers, dates and people are the customer's. */
const WORDS = new Set(['text', 'long', 'choice']);

/** The values a document template keeps: with 'structure' none; with 'text' the words of its text and choice boxes and, in a list, the
 *  rows with only their text and choice cells (a row left with nothing is dropped). Numbers, dates, people and photos are never kept. */
export function keptValues(def: DocDef | undefined, values: DocValues, keep: TemplateKeep): DocValues {
  if (keep === 'structure' || !def) return {};
  const items = new Map<string, DocItem>(def.sections.flatMap(s => s.items.map(i => [i.id, i] as const)));
  const out: DocValues = {};
  for (const [id, v] of Object.entries(values)) {
    const it = items.get(id);
    if (!it || v === undefined || v === '') continue;
    if (it.kind === 'list') {
      if (!Array.isArray(v)) continue;
      const words = it.columns.filter(c => WORDS.has(c.kind)).map(c => c.id);
      const rows: DocRow[] = v.map(r => ({ id: uid(), c: Object.fromEntries(Object.entries(r.c).filter(([k, x]) => words.includes(k) && x !== '' && x !== undefined)) }))
        .filter(r => Object.keys(r.c).length > 0);
      if (rows.length) out[id] = rows;
    } else if (it.kind !== 'photos' && WORDS.has(it.kind) && typeof v === 'string') {
      out[id] = v;
    }
  }
  return out;
}

/** The checks a log template keeps — the live ones, fresh ids; with 'structure' where and who left out. Results are never kept. */
export function keptChecks(checks: readonly LogCheck[], keep: TemplateKeep, id: () => string = uid): LogCheck[] {
  return checks.filter(c => !c.removed).map(c => {
    const { addedAt: _a, where, who, ...rest } = c;
    void _a;
    return {
      ...rest, id: id(), when: { ...c.when },
      ...(c.items ? { items: c.items.map(x => ({ ...x })) } : {}),
      ...(keep === 'text' && where?.trim() ? { where } : {}),
      ...(keep === 'text' && who?.trim() ? { who } : {}),
    } as LogCheck;
  });
}

/** A template's name, as typed — refused when empty. */
export function templateName(raw: string): { ok: true; name: string } | { ok: false; why: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, why: 'A template needs a name.' };
  if (name.length > 120) return { ok: false, why: 'At most 120 letters.' };
  return { ok: true, name };
}

/** THE TEMPLATE MADE FROM A RECORD — a study of the same tool on no line, in no project, with no machine, product or program, nothing
 *  agreed or signed, no photos, notes or results: only what `keep` keeps, and the mark. */
export function templateFrom(src: ToolStudy, o: { name: string; note?: string; keep: TemplateKeep; now: number; id?: string }): { ok: true; t: ToolStudy } | { ok: false; why: string } {
  const kind = templateKindOf(src);
  if (!kind) return { ok: false, why: 'Only a document, a check log or a custom sheet can be saved as your template.' };
  if (kind === 'sheet' && !src.facts?.customDef) return { ok: false, why: 'This sheet has no structure to keep.' };
  const n = templateName(o.name);
  if (!n.ok) return n;
  const mark: TemplateMark = { kind, keep: o.keep, of: ofWords(src), savedAt: o.now, ...(o.note?.trim() ? { note: o.note.trim() } : {}) };
  const base = { id: o.id ?? uid(), tool: src.tool, name: n.name, uses: [], startedAt: o.now, createdAt: o.now, updatedAt: o.now };
  if (kind === 'log') {
    const log = src.agreed?.log;
    if (!log) return { ok: false, why: 'This log has no list of checks.' };
    const checks = keptChecks(log.checks, o.keep);
    if (!checks.length) return { ok: false, why: 'This log has no checks on its list to keep.' };
    return { ok: true, t: { ...base, agreed: { log: { key: log.key, checks, since: o.now, ...(o.keep === 'text' && log.shiftHours ? { shiftHours: log.shiftHours } : {}), ...(log.inARow ? { inARow: log.inARow } : {}) } }, facts: { template: mark } } };
  }
  const def = docDefOf(src);
  const values = keptValues(def, src.facts?.docValues ?? {}, o.keep);
  return {
    ok: true,
    t: {
      ...base, agreed: { doc: { def: src.agreed?.doc?.def ?? '' } },
      facts: { template: mark, ...(kind === 'sheet' && src.facts.customDef ? { customDef: structuredClone(src.facts.customDef) } : {}), ...(Object.keys(values).length ? { docValues: values } : {}) },
    },
  };
}

/** A NEW RECORD STARTED FROM A TEMPLATE — an ordinary document or log on the line (and project) chosen, carrying what the template
 *  kept and no mark: from here it is that customer's record like any other. A log needs a line. */
export function recordFrom(t: ToolStudy, o: { name?: string; workspaceId?: string; projectId?: string; machine?: string; now: number; id?: string }): { ok: true; s: ToolStudy } | { ok: false; why: string } {
  const m = t.facts?.template;
  if (!m) return { ok: false, why: 'That is not one of your templates.' };
  const name = (o.name ?? '').trim().replace(/\s+/g, ' ') || t.name;
  const base = {
    id: o.id ?? uid(), tool: t.tool, name, uses: [], startedAt: o.now, createdAt: o.now, updatedAt: o.now,
    ...(o.workspaceId ? { workspaceId: o.workspaceId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}),
  };
  if (m.kind === 'log') {
    if (!o.workspaceId) return { ok: false, why: 'A check log is a line’s — its machines, its rate and its problems are the line’s. Say which line.' };
    const log = t.agreed?.log;
    if (!log?.checks.length) return { ok: false, why: 'The template has no checks.' };
    /* the machine or place named on the New sheet fills every check that has none (as a starter list's — tools/checks/start) */
    const where = o.machine?.trim();
    const checks = keptChecks(log.checks, 'text').map(c => (c.where?.trim() || !where ? c : { ...c, where }));
    return { ok: true, s: { ...base, ...(where ? { machine: where } : {}), agreed: { log: { key: log.key, checks, since: o.now, ...(log.shiftHours ? { shiftHours: log.shiftHours } : {}), ...(log.inARow ? { inARow: log.inARow } : {}) } }, facts: { results: [] } } };
  }
  const defKey = t.agreed?.doc?.def ?? '';
  const def = m.kind === 'sheet' ? undefined : docByKey(defKey);
  const values: DocValues = { ...(def?.start ?? {}) };
  for (const [k, v] of Object.entries(t.facts?.docValues ?? {})) values[k] = Array.isArray(v) ? v.map(r => ({ id: uid(), c: { ...r.c } })) : v;
  return {
    ok: true,
    s: {
      ...base, agreed: { doc: { def: defKey } },
      facts: { ...(m.kind === 'sheet' && t.facts.customDef ? { customDef: structuredClone(t.facts.customDef) } : {}), ...(Object.keys(values).length ? { docValues: values } : {}) },
    },
  };
}

/** The templates that fit a New sheet: a document's kind (or every custom sheet), a log's kind. */
export function templatesFor(ts: readonly ToolStudy[], k: { doc?: string; log?: string }): ToolStudy[] {
  return ts.filter(t => (k.doc ? t.tool === 'doc' && t.agreed?.doc?.def === k.doc : k.log ? t.tool === 'log' && t.agreed?.log?.key === k.log : false));
}

/* ------------------------------------------------------------------------------------------------------------------------------ */
/*  WRITES — through the db's own functions                                                                                         */
/* ------------------------------------------------------------------------------------------------------------------------------ */

const db = () => import('../db');

/** Save a record as my template. */
export async function saveAsTemplate(src: ToolStudy, o: { name: string; note?: string; keep: TemplateKeep }): Promise<{ ok: true; t: ToolStudy } | { ok: false; why: string }> {
  const r = templateFrom(src, { ...o, now: Date.now() });
  if (!r.ok) return r;
  await (await db()).putStudy(r.t);
  return r;
}

/** Start a record from a template, on the line (and project) chosen. */
export async function startFromTemplate(templateId: string, o: { name?: string; workspaceId?: string; projectId?: string; machine?: string }): Promise<{ ok: true; s: ToolStudy } | { ok: false; why: string }> {
  const d = await db();
  const t = await d.getStudy(templateId);
  if (!t || !isTemplate(t)) return { ok: false, why: 'That template is not on this device — it may have been taken off.' };
  const r = recordFrom(t, { ...o, now: Date.now() });
  if (!r.ok) return r;
  await d.putStudy(r.s);
  if (r.s.tool === 'log' && r.s.workspaceId) {
    const { machineOntoLine } = await import('./lines');
    for (const w of new Set((r.s.agreed?.log?.checks ?? []).map(c => c.where?.trim()).filter((x): x is string => !!x))) await machineOntoLine(r.s.workspaceId, w).catch(() => {});
  }
  return r;
}

/** Renamed, or its note changed. */
export async function editTemplate(id: string, change: { name?: string; note?: string }): Promise<{ ok: true } | { ok: false; why: string }> {
  const d = await db();
  if (change.name !== undefined) { const n = templateName(change.name); if (!n.ok) return n; change = { ...change, name: n.name }; }
  await d.patchStudy(id, cur => {
    const m = cur.facts?.template;
    if (!m) return {};
    const note = change.note !== undefined ? change.note.trim() : m.note;
    const { note: _was, ...rest } = m;
    void _was;
    return { ...(change.name ? { name: change.name } : {}), facts: { ...cur.facts, template: { ...rest, ...(note ? { note } : {}) } } };
  });
  return { ok: true };
}

/** Taken off — with an undo that puts it back exactly. */
export async function removeTemplate(id: string): Promise<() => Promise<void>> {
  return (await db()).deleteStudy(id);
}
