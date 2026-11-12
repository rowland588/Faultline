/* BUILDING A TOOL IN CONVERSATION — the capabilities (8 November; docs/AI-MODE.md, Building tools in conversation A · B · C).
 *
 *   tool_catalogue  read   the tools a conversation can fill, and one tool's fields (read from its definition)
 *   start_draft     local  a draft of an existing tool on the conversation (A)
 *   fill_draft      local  values as said, each checked against its field and kept with how it is known; a correction keeps
 *                          what it replaced
 *   adapt_draft     local  fields added to THIS record, or its own optional ones left out (B) — never a definition changed
 *   create_sheet    local  a custom sheet of sections, fields and code-worked metrics (C)
 *   draft_state     read   what is captured, what is missing, the metrics as code works them
 *   make_record     write  confirmed: the real record, made through the tool's own New — or, made already, updated with only
 *                          what the conversation changed since
 * Locals change only the conversation's draft (facts.drafts on the AI Mode conversation): nothing is a record until the person
 * says yes to make_record's card. Pure work is in ./drafts. */
import { getProject, getStudy, getWorkspace, listAllStandards, patchStudy, putStudy } from '../db';
import { conversation, draftIn, draftsOf, putDraft, writeDrafts } from './draftStore';
import { charterHome, charterRoute } from './documentHome';
import { factoryPreview, factoryState, makeFactory } from './factoryBuild';
import type { ToolStudy } from '../lib/study';
import { studyHref } from '../lib/studyLinks';
import { uid } from '../lib/ids';
import { CUSTOM_KEY, customProblems } from '../tools/doc/custom';
import type { CustomDef, CustomField, CustomMetric } from '../tools/doc/types';
import { checkObject, ID } from './check';
import { anyone, mayEdit } from './access';
import {
  adaptDraft, applyDraft, baseFields, captured, changedSinceMade, draftNoun, draftSaid, FIELD_NAME, fieldsForColleague, fieldsOf, fillableTools, fillDraft,
  madeSnapshot, metricsOf, missing, nameOf, toolTitle, toRecord, type FillItem,
} from './drafts';
import type { CapCtx, CapRef, CapResult, Capability, ColleagueDraft, ColleagueThread, DraftField, DraftKind } from './types';
import { lineRef, plural, projectRef } from './util';
import { alikeRecords, destinationOf, modeOf, recordSaid } from './understand';

/* ------------------------------------------------------------------ the conversation's drafts (./draftStore) */

export { draftsOf } from './draftStore';

const missingSaid = (d: ColleagueDraft): string => { const m = missing(d); return m.length ? `Still missing: ${m.map(f => f.label).join(', ')}.` : 'Everything it needs is there — it can be made when the person says so.'; };

/* ------------------------------------------------------------------ tool_catalogue */

const KINDS: readonly Exclude<DraftKind, 'custom'>[] = ['calc', 'doc', 'check', 'scored', 'smed'];

export const toolCatalogue: Capability = {
  name: 'tool_catalogue', title: 'The tools to fill', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'words to look for', max: 120 }, key: { kind: 'string', label: 'a tool’s key', max: 80 }, kind: { kind: 'enum', label: 'the kind of tool', values: KINDS } }),
  allowed: anyone,
  async run(_ctx, input: { words?: string; key?: string; kind?: Exclude<DraftKind, 'custom'> }): Promise<CapResult> {
    const all = fillableTools();
    if (input.key) {
      const t = all.find(x => x.key === input.key && (!input.kind || x.kind === input.kind));
      if (!t) return { ok: false, why: `No tool to fill has the key “${input.key}” — look in the catalogue by words first.` };
      const fields = baseFields(t.kind, t.key) ?? [];
      return { ok: true, says: `${t.title} — ${t.says}. Its fields: ${fields.map(f => `${f.label}${f.required ? ' (needed)' : ''}`).join(', ')}.`, data: { ...t, fields: fieldsForColleague(fields) }, refs: [] };
    }
    const w = input.words?.toLowerCase().split(/\s+/).filter(x => x.length > 2) ?? [];
    const hit = all.filter(t => (!input.kind || t.kind === input.kind) && (!w.length || w.some(x => `${t.title} ${t.says} ${t.group} ${t.key}`.toLowerCase().includes(x))));
    const shown = hit.slice(0, 25);
    return {
      ok: true,
      says: hit.length ? `${plural(hit.length, 'tool')} can be filled by talking${input.words ? ` for “${input.words}”` : ''}: ${shown.map(t => t.title).join(', ')}${hit.length > shown.length ? ` and ${hit.length - shown.length} more` : ''}. When none fits, a custom sheet can be built.` : `No tool fits “${input.words}” — a custom sheet can be built instead.`,
      data: shown.map(t => ({ kind: t.kind, key: t.key, title: t.title, says: t.says })), refs: [],
    };
  },
};

/* ------------------------------------------------------------------ start_draft */

async function scopeFor(s: ToolStudy, input: { lineId?: string; projectId?: string }): Promise<{ ok: true; scope: ColleagueDraft['scope']; lineName?: string; threadId?: string } | { ok: false; why: string }> {
  const threads = (Array.isArray((s.facts as { threads?: unknown }).threads) ? (s.facts as { threads: ColleagueThread[] }).threads : []);
  const cur = threads.find(t => t.status === 'current');
  /* standalone work or just talk takes no project from the subject (9 November — "a conversation must not be forced into a project") */
  const free = cur?.mode === 'standalone' || cur?.mode === 'talk';
  const lineId = input.lineId ?? cur?.scope.lineId, projectId = input.projectId ?? (free ? undefined : cur?.scope.projectId);
  const [line, p] = await Promise.all([lineId ? getWorkspace(lineId) : undefined, projectId ? getProject(projectId) : undefined]);
  if (input.lineId && !line) return { ok: false, why: 'There is no line with that id on this device — find it by name first.' };
  if (input.projectId && (!p || p.deletedAt)) return { ok: false, why: 'There is no project with that id on this device — find it by name first.' };
  return { ok: true, scope: { ...(line ? { lineId: line.id } : {}), ...(p && !p.deletedAt ? { projectId: p.id } : {}) }, ...(line ? { lineName: line.name } : {}), ...(cur ? { threadId: cur.id } : {}) };
}

export const startDraft: Capability = {
  name: 'start_draft', title: 'Start filling a tool', kind: 'local',
  validate: raw => checkObject(raw, {
    kind: { kind: 'enum', label: 'the kind of tool', values: KINDS, required: true }, key: { kind: 'string', label: 'the tool’s key', required: true, max: 80 },
    title: { kind: 'string', label: 'its name', max: 120 }, lineId: ID('the line'), projectId: ID('the project'),
  }),
  allowed: anyone,
  async run(ctx, input: { kind: Exclude<DraftKind, 'custom'>; key: string; title?: string; lineId?: string; projectId?: string }): Promise<CapResult> {
    const fields = baseFields(input.kind, input.key);
    if (!fields) return { ok: false, why: `There is no ${input.kind === 'calc' ? 'calculator' : input.kind === 'doc' ? 'document' : input.kind === 'check' ? 'check log' : input.kind === 'scored' ? 'register to fill' : 'tool'} with the key “${input.key}” — look in the tool catalogue first.` };
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const sc = await scopeFor(c.s, input);
    if (!sc.ok) return sc;
    const tool = toolTitle(input.kind, input.key);
    /* never a second draft of the same tool for the same place in one conversation — the one in hand is carried on */
    const had = draftsOf(c.s).find(x => x.status === 'draft' && x.kind === input.kind && x.key === input.key && x.scope.lineId === sc.scope.lineId && x.scope.projectId === sc.scope.projectId);
    /* one charter a project: an existing one is carried on, two are asked between, never a third started (./documentHome) */
    if (input.kind === 'doc' && input.key === 'charter' && sc.scope.projectId && !had) {
      const home = await charterHome(sc.scope.projectId, draftsOf(c.s));
      const pName = (await getProject(sc.scope.projectId))?.name ?? 'The project';
      if (home.state === 'many' || (home.state === 'one' && !home.draft)) return { ok: false, why: `No second charter was started. ${charterRoute(home, pName)}` };
      if (home.state === 'one' && home.draft) return { ok: true, says: `${pName} already has its charter “${home.draft.title}” — carrying on with it rather than starting a second. ${missingSaid(home.draft)}`, data: { draftId: home.draft.id, fields: fieldsForColleague(fieldsOf(home.draft)), missing: missing(home.draft).map(f => f.name), again: true }, refs: [] };
    }
    if (had) return { ok: true, says: `“${had.title}” (${tool}) is already being built here — carrying on with it rather than starting a second. ${missingSaid(had)}`, data: { draftId: had.id, fields: fieldsForColleague(fieldsOf(had)), missing: missing(had).map(f => f.name), again: true }, refs: [] };
    const d: ColleagueDraft = {
      id: uid(), kind: input.kind, key: input.key, title: input.title?.trim() || `${tool}${sc.lineName ? ` — ${sc.lineName}` : ''}`, scope: sc.scope, values: {},
      status: 'draft', ...(sc.threadId ? { threadId: sc.threadId } : {}), at: ctx.now,
    };
    await writeDrafts(c.s.id, cur => [...cur, d]);
    return { ok: true, says: `Started “${d.title}” (${tool}) as a draft — nothing is kept as a record until you say so. ${missingSaid(d)}`, data: { draftId: d.id, fields: fieldsForColleague(fields), missing: missing(d).map(f => f.name) }, refs: [] };
  },
};

/* ------------------------------------------------------------------ fill_draft */

const HOW_ALL = ['observed', 'reported', 'measured', 'calculated', 'hypothesised', 'unknown', 'verified'];

export const fillDraftCap: Capability = {
  name: 'fill_draft', title: 'Fill it in', kind: 'local',
  validate: raw => {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const { values, ...rest } = o;
    const head = checkObject(rest, { draftId: ID('the draft', true) });
    if (!head.ok) return head;
    if (!Array.isArray(values) || !values.length) return { ok: false, why: 'Give the values said — a list of { field, value, how }.' };
    if (values.length > 30) return { ok: false, why: 'Give at most 30 values at once.' };
    const items: FillItem[] = [];
    for (const v of values) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, why: 'Each value is { field, value, how, said }.' };
      const x = v as Record<string, unknown>;
      const odd = Object.keys(x).filter(k => !['field', 'value', 'how', 'said'].includes(k));
      if (odd.length) return { ok: false, why: `A value has fields it does not take: ${odd.join(', ')}.` };
      if (typeof x.field !== 'string' || !x.field.trim()) return { ok: false, why: 'Each value names its field.' };
      if (typeof x.how !== 'string' || !HOW_ALL.includes(x.how)) return { ok: false, why: `Say how “${x.field}” is known: ${HOW_ALL.filter(h => h !== 'verified').join(', ')}.` };
      if (x.said !== undefined && typeof x.said !== 'string') return { ok: false, why: 'What was said is words.' };
      items.push({ field: x.field.trim(), value: x.value, how: x.how, ...(typeof x.said === 'string' ? { said: x.said } : {}) });
    }
    return { ok: true, input: { draftId: head.input.draftId, values: items } };
  },
  allowed: anyone,
  async run(ctx, input: { draftId: string; values: FillItem[] }): Promise<CapResult> {
    const got = await draftIn(ctx, input.draftId);
    if (!got.ok) return got;
    if (got.d.kind === 'factory') return { ok: false, why: 'A factory draft is filled with add_to_factory_draft — its sites, areas, lines and machines.' };
    const r = fillDraft(got.d, input.values, ctx.now);
    if (r.kept.length || r.corrected.length) await putDraft(got.s, r.draft);
    if (!r.kept.length && !r.corrected.length) return { ok: false, why: `Nothing was kept. ${r.refused.join(' ')}` };
    /* A RECORD ALREADY MADE fills as it is talked about (10 November, docs/AI-OPERATING.md — Rowland: "I want to be able to see the
       real study and its information being populated"; "confirm once"): the person said yes to it when it was made, so what is said
       of it now goes straight into it — only the fields the conversation changed, what was edited on its page kept — and its page
       is shown filling. A client, or somebody who may not change it, still only fills the draft. */
    const made = r.draft.status === 'made' && r.draft.studyId ? await getStudy(r.draft.studyId) : undefined;
    if (made && !made.deletedAt && (await mayEdit(ctx, made.projectId)).ok) {
      const ch = changedSinceMade(r.draft);
      if (ch.length) {
        await patchStudy(made.id, cur => applyDraft(cur, r.draft, ctx.now, ch));
        await putDraft(got.s, { ...r.draft, madeValues: madeSnapshot(r.draft) });
      }
      const href = studyHref(made);
      const ref: CapRef = { kind: 'study', id: made.id, label: made.name, href };
      return { ok: true, says: `${[r.kept.length ? `Into “${made.name}”: ${r.kept.join(', ')}.` : '', r.corrected.length ? `Corrected in “${made.name}” (the earlier value kept beside it): ${r.corrected.join('; ')}.` : '', r.refused.length ? `Not kept: ${r.refused.join(' ')}` : ''].filter(Boolean).join(' ')} Its page shows it.`, data: { draftId: r.draft.id, studyId: made.id, changed: ch }, refs: [ref], show: ref };
    }
    const parts = [
      r.kept.length ? `Kept: ${r.kept.join(', ')}.` : '',
      r.corrected.length ? `Corrected (the earlier value kept beside it): ${r.corrected.join('; ')}.` : '',
      r.refused.length ? `Not kept: ${r.refused.join(' ')}` : '',
      missingSaid(r.draft),
      r.draft.status === 'made' ? 'It is already a record — its owner carries these into it.' : '',
    ].filter(Boolean);
    const ms = metricsOf(r.draft).filter(m => m.value !== undefined);
    if (ms.length) parts.push(`The app works out: ${ms.map(m => `${m.metric.name} ${m.said}`).join('; ')}.`);
    return { ok: true, says: parts.join(' '), data: { draftId: r.draft.id, missing: missing(r.draft).map(f => f.name), ...(r.refused.length ? { refused: r.refused } : {}) }, refs: [] };
  },
};

/* ------------------------------------------------------------------ adapt_draft and create_sheet: the fields given */

const TYPES = ['text', 'number', 'choice', 'list'] as const;
type FieldIn = { name?: string; label: string; type: typeof TYPES[number]; unit?: string; options?: string[]; columns?: (FieldIn & { name: string })[]; required?: boolean };

/** A field as the colleague gives it, checked — a name made from the label when none is given; a list's columns plain boxes. */
function fieldFrom(raw: unknown, inList = false): { ok: true; f: FieldIn & { name: string } } | { ok: false; why: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, why: 'A field is { name, label, type, unit, options, columns }.' };
  const o = raw as Record<string, unknown>;
  const odd = Object.keys(o).filter(k => !['name', 'label', 'type', 'unit', 'options', 'columns', 'required'].includes(k));
  if (odd.length) return { ok: false, why: `A field has things it does not take: ${odd.join(', ')}.` };
  if (typeof o.label !== 'string' || !o.label.trim() || o.label.length > 120) return { ok: false, why: 'Each field needs its label, in words (at most 120 characters).' };
  const type = o.type;
  if (typeof type !== 'string' || !(TYPES as readonly string[]).includes(type) || (inList && type === 'list')) return { ok: false, why: `“${o.label}” is one of: ${(inList ? TYPES.filter(t => t !== 'list') : TYPES).join(', ')}.` };
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : nameOf(o.label);
  if (!FIELD_NAME.test(name)) return { ok: false, why: `“${name}” is not a field name — lower-case words joined by underscores.` };
  const options = Array.isArray(o.options) ? o.options.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(x => x.trim()).slice(0, 30) : undefined;
  if (type === 'choice' && !options?.length) return { ok: false, why: `“${o.label}” is a choice, so it needs its options.` };
  let columns: (FieldIn & { name: string })[] | undefined;
  if (type === 'list') {
    if (!Array.isArray(o.columns) || !o.columns.length || o.columns.length > 12) return { ok: false, why: `“${o.label}” is a list, so it needs its columns (one to twelve).` };
    columns = [];
    for (const c of o.columns) { const g = fieldFrom(c, true); if (!g.ok) return g; columns.push(g.f); }
  }
  const unit = typeof o.unit === 'string' && o.unit.trim() ? o.unit.trim().slice(0, 20) : undefined;
  return { ok: true, f: { name, label: o.label.trim(), type: type as FieldIn['type'], ...(unit ? { unit } : {}), ...(options ? { options } : {}), ...(columns ? { columns } : {}), ...(o.required === true ? { required: true } : {}) } };
}
const asDraftField = (f: FieldIn & { name: string }): DraftField => ({
  name: f.name, label: f.label, type: f.type, ...(f.unit ? { unit: f.unit } : {}), ...(f.options ? { options: f.options } : {}), ...(f.required ? { required: true } : {}),
  ...(f.columns ? { columns: f.columns.map(c => ({ name: c.name, label: c.label, type: c.type, ...(c.unit ? { unit: c.unit } : {}), ...(c.options ? { options: c.options } : {}), ...(c.required ? { required: true } : {}) })) } : {}),
});

export const adaptDraftCap: Capability = {
  name: 'adapt_draft', title: 'Add to it', kind: 'local',
  validate: raw => {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const { add, remove, ...rest } = o;
    const head = checkObject(rest, { draftId: ID('the draft', true) });
    if (!head.ok) return head;
    const adds: { section?: string; field: DraftField }[] = [];
    if (add !== undefined) {
      if (!Array.isArray(add) || add.length > 20) return { ok: false, why: 'Add is a list of at most 20 { section, field }.' };
      for (const a of add) {
        if (!a || typeof a !== 'object') return { ok: false, why: 'Each addition is { section, field }.' };
        const x = a as Record<string, unknown>;
        const odd = Object.keys(x).filter(k => !['section', 'field'].includes(k));
        if (odd.length) return { ok: false, why: `An addition has things it does not take: ${odd.join(', ')}.` };
        const g = fieldFrom(x.field);
        if (!g.ok) return g;
        adds.push({ ...(typeof x.section === 'string' && x.section.trim() ? { section: x.section.trim().slice(0, 80) } : {}), field: asDraftField(g.f) });
      }
    }
    const rm = remove === undefined ? [] : Array.isArray(remove) && remove.every(x => typeof x === 'string') ? remove as string[] : null;
    if (!rm) return { ok: false, why: 'Remove is a list of field names.' };
    if (!adds.length && !rm.length) return { ok: false, why: 'Say what to add or take off.' };
    return { ok: true, input: { draftId: head.input.draftId, add: adds, remove: rm } };
  },
  allowed: anyone,
  async run(ctx, input: { draftId: string; add: { section?: string; field: DraftField }[]; remove: string[] }): Promise<CapResult> {
    const got = await draftIn(ctx, input.draftId);
    if (!got.ok) return got;
    if (got.d.kind === 'factory') return { ok: false, why: 'A factory draft has no fields to add — say its sites, areas, lines and machines with add_to_factory_draft.' };
    const r = adaptDraft(got.d, input.add, input.remove);
    if (!r.added.length && !r.removed.length) return { ok: false, why: `Nothing was changed. ${r.refused.join(' ')}` };
    await putDraft(got.s, r.draft);
    return {
      ok: true,
      says: [r.added.length ? `Added to this ${draftNoun(r.draft)} only: ${r.added.join(', ')} — the ${toolTitle(r.draft.kind, r.draft.key, r.draft.structure)} itself is unchanged.` : '', r.removed.length ? `Left off this one: ${r.removed.join(', ')}.` : '', r.refused.join(' '), missingSaid(r.draft)].filter(Boolean).join(' '),
      data: { draftId: r.draft.id, fields: fieldsForColleague(fieldsOf(r.draft)) }, refs: [],
    };
  },
};

const METRIC_KINDS = ['sum', 'average', 'ratio', 'difference', 'count'] as const;

export const createSheet: Capability = {
  name: 'create_sheet', title: 'Build a sheet', kind: 'local',
  validate: raw => {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const { sections, metrics, ...rest } = o;
    const head = checkObject(rest, { title: { kind: 'string', label: 'the sheet’s title', required: true, max: 120 }, purpose: { kind: 'string', label: 'what it is for', required: true, max: 400 }, lineId: ID('the line'), projectId: ID('the project') });
    if (!head.ok) return head;
    if (!Array.isArray(sections) || !sections.length || sections.length > 12) return { ok: false, why: 'A sheet has one to twelve sections, each { title, fields }.' };
    const secs: { id: string; title: string; fields: CustomField[] }[] = [];
    for (const [i, sec] of sections.entries()) {
      const x = sec && typeof sec === 'object' ? sec as Record<string, unknown> : {};
      if (Object.keys(x).some(k => !['title', 'fields'].includes(k))) return { ok: false, why: 'A section is { title, fields }.' };
      if (typeof x.title !== 'string' || !x.title.trim()) return { ok: false, why: `Section ${i + 1} needs its title.` };
      if (!Array.isArray(x.fields) || !x.fields.length || x.fields.length > 30) return { ok: false, why: `“${x.title}” needs one to thirty fields.` };
      const fields: CustomField[] = [];
      for (const f of x.fields) {
        const g = fieldFrom(f);
        if (!g.ok) return g;
        fields.push({ id: g.f.name, label: g.f.label, type: g.f.type, ...(g.f.unit ? { unit: g.f.unit } : {}), ...(g.f.options ? { options: g.f.options } : {}), ...(g.f.required ? { required: true } : {}),
          ...(g.f.columns ? { columns: g.f.columns.map(c => ({ id: c.name, label: c.label, type: c.type as 'text' | 'number' | 'choice', ...(c.unit ? { unit: c.unit } : {}), ...(c.options ? { options: c.options } : {}) })) } : {}) });
      }
      secs.push({ id: `s${i + 1}`, title: x.title.trim().slice(0, 120), fields });
    }
    const ms: CustomMetric[] = [];
    if (metrics !== undefined) {
      if (!Array.isArray(metrics) || metrics.length > 12) return { ok: false, why: 'Metrics are a list of at most twelve { name, kind, of, unit }.' };
      for (const m of metrics) {
        const x = m && typeof m === 'object' ? m as Record<string, unknown> : {};
        if (Object.keys(x).some(k => !['name', 'kind', 'of', 'unit'].includes(k))) return { ok: false, why: 'A metric is { name, kind, of, unit }.' };
        if (typeof x.name !== 'string' || !x.name.trim()) return { ok: false, why: 'Each metric needs its name.' };
        if (typeof x.kind !== 'string' || !(METRIC_KINDS as readonly string[]).includes(x.kind)) return { ok: false, why: `“${x.name}” is one of: ${METRIC_KINDS.join(', ')} — the app works it out; there are no formulas to write.` };
        if (!Array.isArray(x.of) || !x.of.length || x.of.some(r => typeof r !== 'string')) return { ok: false, why: `“${x.name}” names the fields it reads (a list field’s column as list.column).` };
        ms.push({ id: nameOf(x.name), name: x.name.trim().slice(0, 80), kind: x.kind as CustomMetric['kind'], of: (x.of as string[]).map(r => r.trim()), ...(typeof x.unit === 'string' && x.unit.trim() ? { unit: x.unit.trim().slice(0, 20) } : {}) });
      }
    }
    const structure: CustomDef = { title: String(head.input.title), purpose: String(head.input.purpose), sections: secs, ...(ms.length ? { metrics: ms } : {}) };
    const problems = customProblems(structure);
    if (problems.length) return { ok: false, why: problems.join(' ') };
    return { ok: true, input: { structure, lineId: head.input.lineId, projectId: head.input.projectId } };
  },
  allowed: anyone,
  async run(ctx, input: { structure: CustomDef; lineId?: string; projectId?: string }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const sc = await scopeFor(c.s, input);
    if (!sc.ok) return sc;
    const d: ColleagueDraft = { id: uid(), kind: 'custom', key: CUSTOM_KEY, title: input.structure.title, scope: sc.scope, values: {}, structure: input.structure, status: 'draft', ...(sc.threadId ? { threadId: sc.threadId } : {}), at: ctx.now };
    await writeDrafts(c.s.id, cur => [...cur, d]);
    const fields = fieldsOf(d);
    return {
      ok: true,
      says: `Built “${d.title}” as a draft sheet: ${input.structure.sections.map(s => `${s.title} (${s.fields.map(f => f.label).join(', ')})`).join('; ')}${(input.structure.metrics ?? []).length ? `; metrics the app will work out: ${(input.structure.metrics ?? []).map(m => m.name).join(', ')}` : ''}. Nothing is kept as a record until you say so.`,
      data: { draftId: d.id, fields: fieldsForColleague(fields) }, refs: [],
    };
  },
};

/* ------------------------------------------------------------------ draft_state */

export const draftState: Capability = {
  name: 'draft_state', title: 'What is captured', kind: 'read',
  validate: raw => checkObject(raw, { draftId: ID('the draft') }),
  allowed: anyone,
  async run(ctx, input: { draftId?: string }): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const all = draftsOf(c.s);
    const list = input.draftId ? all.filter(d => d.id === input.draftId) : all;
    if (!list.length) return input.draftId ? { ok: false, why: 'There is no draft with that id in this conversation.' } : { ok: true, says: 'Nothing is being built in this conversation yet.', data: [], refs: [] };
    const factories = new Map<string, { says: string; data: unknown }>();
    for (const d of list) if (d.kind === 'factory') factories.set(d.id, await factoryState(d));
    return {
      ok: true, says: list.map(d => factories.get(d.id)?.says ?? draftSaid(d)).join('\n'),
      data: list.map(d => factories.get(d.id)?.data ?? ({
        draftId: d.id, title: d.title, kind: d.kind, key: d.key, status: d.status, ...(d.studyId ? { studyId: d.studyId } : {}),
        captured: captured(d).map(x => ({ field: x.field.name, value: x.entry.value, how: x.entry.how, ...(x.entry.earlier?.length ? { earlier: x.entry.earlier.map(e => e.value) } : {}) })),
        missing: missing(d).map(f => f.name),
        ...(d.kind === 'custom' ? { metrics: metricsOf(d).map(m => ({ name: m.metric.name, ...(m.value !== undefined ? { value: m.value, said: m.said } : { waitsOn: m.missing }) })) } : {}),
      })),
      refs: [],
    };
  },
};

/* ------------------------------------------------------------------ make_record */

/** A made SMED sits on its product's line standard when the line has one of that product — as SMED's New finds it. */
async function standardFor(d: ColleagueDraft): Promise<string | undefined> {
  const to = typeof d.values.toProduct?.value === 'string' ? (d.values.toProduct.value as string).trim().toLowerCase() : '';
  if (d.kind !== 'smed' || !to || !d.scope.lineId) return undefined;
  return (await listAllStandards()).find(x => !x.deletedAt && x.workspaceId === d.scope.lineId && x.product.trim().toLowerCase() === to)?.id;
}

export const makeRecord: Capability = {
  name: 'make_record', title: 'Make it a record', kind: 'write',
  validate: raw => checkObject(raw, { draftId: ID('the draft', true) }),
  async allowed(ctx: CapCtx, input: { draftId: string }) {
    const got = await draftIn(ctx, input.draftId);
    if (!got.ok) return got;
    return mayEdit(ctx, got.d.scope.projectId);
  },
  async preview(ctx, input: { draftId: string }) {
    const got = await draftIn(ctx, input.draftId);
    if (!got.ok) return got.why;
    const d = got.d;
    if (d.kind === 'factory') return factoryPreview(d);
    const [line, p] = await Promise.all([d.scope.lineId ? getWorkspace(d.scope.lineId) : undefined, d.scope.projectId ? getProject(d.scope.projectId) : undefined]);
    const where = `${line ? ` on ${line.name}` : ' on no line'}${p ? `, in ${p.name}` : ''}`;
    const need = missing(d);
    /* WHERE IT GOES, AND WHAT IS ALREADY THERE (9 November — "present the proposed destination and relationship clearly … never create
       duplicate records"): the line with its area, the project or that it is in none, and records of the same tool alike in name */
    const dest = await destinationOf(d.scope, modeOf(got.s, d.threadId));
    const shape = toRecord(d, { id: 'preview', now: Date.now() });
    const twins = d.status === 'made' || !shape ? [] : await alikeRecords(d, shape.tool, shape.agreed?.calc?.key);
    const twinSaid = twins.length ? ` ${line?.name ?? 'The line'} already has ${twins.slice(0, 3).map(recordSaid).join(', ')} — this makes another; say if you would rather carry on with ${twins.length === 1 ? 'that one' : 'one of those'}.` : '';
    if (d.status === 'made' && d.studyId) {
      const ch = changedSinceMade(d);
      const fs = fieldsOf(d);
      return ch.length
        ? `Update the ${draftNoun(d)} “${d.title}”${where} with what changed in the conversation: ${ch.map(k => fs.find(f => f.name === k)?.label ?? k).join(', ')} — what was edited on its page stays.`
        : `Nothing has changed in the conversation since “${d.title}” was made.`;
    }
    const got2 = captured(d);
    return `Make a ${toolTitle(d.kind, d.key, d.structure)} ${draftNoun(d)} called “${d.title}” ${dest}, with ${got2.length ? got2.map(x => `${x.field.label.toLowerCase()} ${x.words}`).join('; ') : 'nothing filled in yet'}.${need.length ? ` Still missing: ${need.map(f => f.label).join(', ')}.` : ''}${twinSaid}`;
  },
  async run(ctx, input: { draftId: string }): Promise<CapResult> {
    const got = await draftIn(ctx, input.draftId);
    if (!got.ok) return got;
    const d = got.d;
    if (d.kind === 'factory') return makeFactory(ctx, got.s, d);
    const need = missing(d);
    if (need.length) return { ok: false, why: `“${d.title}” cannot be made yet — it still needs: ${need.map(f => f.label).join(', ')}.` };
    const [line, p] = await Promise.all([d.scope.lineId ? getWorkspace(d.scope.lineId) : undefined, d.scope.projectId ? getProject(d.scope.projectId) : undefined]);
    if (d.scope.lineId && !line) return { ok: false, why: 'Its line is not on this device any more.' };
    if (d.scope.projectId && (!p || p.deletedAt)) return { ok: false, why: 'Its project is not on this device any more.' };
    const refs = [...(line ? [lineRef(line)] : []), ...(p ? [projectRef(p)] : [])];
    const existing = d.status === 'made' && d.studyId ? await getStudy(d.studyId) : undefined;
    if (existing && !existing.deletedAt) {
      const ch = changedSinceMade(d);
      if (!ch.length && d.kind !== 'custom') return { ok: false, why: `Nothing has changed since “${existing.name}” was made — it already holds what was said.` };
      await patchStudy(existing.id, cur => applyDraft(cur, d, ctx.now, ch));
      const s = (await getStudy(existing.id)) ?? existing;
      await putDraft(got.s, { ...d, madeValues: madeSnapshot(d) });
      const href = studyHref(s);
      return { ok: true, says: `Updated “${s.name}” with ${ch.length ? ch.length : 'no'} change${ch.length === 1 ? '' : 's'} from the conversation; what was edited on its page is kept.`, data: { id: s.id, href }, refs: [{ kind: 'study', id: s.id, label: s.name, href }, ...refs] };
    }
    const standardId = await standardFor(d);
    const s = toRecord(d, { id: uid(), now: ctx.now, ...(standardId ? { standardId } : {}) });
    if (!s) return { ok: false, why: `“${d.title}” cannot be made — its tool is not in this version of the app.` };
    await putStudy(s);
    await putDraft(got.s, { ...d, status: 'made', studyId: s.id, madeValues: madeSnapshot(d) });
    /* the subject it was built on now has its record — "that investigation" finds it */
    if (d.threadId) await patchStudy(got.s.id, cur => ({ facts: { ...cur.facts, threads: ((cur.facts as { threads?: ColleagueThread[] }).threads ?? []).map(t => (t.id === d.threadId && !t.scope.studyId ? { ...t, scope: { ...t.scope, studyId: s.id } } : t)) } as ToolStudy['facts'] }));
    const href = studyHref(s);
    return { ok: true, says: `Made “${s.name}”${line ? ` on ${line.name}` : ''} — it opens in the app like any ${draftNoun(d)}.`, data: { id: s.id, href }, refs: [{ kind: 'study', id: s.id, label: s.name, href }, ...refs] };
  },
};
