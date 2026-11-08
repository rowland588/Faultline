/* BUILDING A TOOL IN CONVERSATION — the drafts, pure (8 November; docs/AI-MODE.md, Building tools in conversation A · B · C).
 *
 * Rowland, 8 November: "The conversation itself should become the mechanism through which the application is populated …
 * A. Populate existing tools … B. Adapt existing tools — add fields, questions, metrics, categories or sections … C. Create new
 * tools and documentation … The AI must not invent measurements … Calculations by Faultline's deterministic logic … validated
 * and saved through controlled application functionality … show me what it has understood and populated, and confirm before
 * committing."
 *
 * ONE MECHANISM FOR EVERY SHAPE. A draft is a tool being filled from the conversation (facts.drafts on the AI Mode conversation,
 * src/capabilities/types ColleagueDraft). Its FIELD MAP is read from the tool's own definition — never a hand-copied list:
 *   calc    the calculator's inputs (tools/calc/defs): name, label, unit, kind, range, required unless optional, money or defaulted
 *   doc     the document's sections and boxes (tools/doc/defs), a list with its columns
 *   check   a check log's per-log settings (where, shift hours) and which of its starter checks to leave out (tools/checks/defs)
 *   scored  a register's rows, each with the boxes its definition asks (tools/scored/defs — the ones ranked from boxes)
 *   smed    SMED's own small map onto the changeover record: the minutes now (reported) and wanted, the machines, the products,
 *           the elements by name (a time only when said), the two products, notes
 *   custom  the sheet described in conversation (tools/doc/custom): its sections and boxes, its code-worked metrics
 * and B's fields added to this record only. Then: fieldsOf, captured, missing; fill (each value checked against its field, a
 * correction keeping what it replaced); adapt; and toRecord — the record EXACTLY as the tool's New makes it (newCalcStudy,
 * newDocStudy, newLogStudy, newScoredStudy, newChangeoverStudy), with what was said written in. applyDraft writes the same into a
 * record already made, changing only the fields the conversation changed since (what was edited in Manual Mode stays). */
import type { ChangeoverProduct, ChangeoverStep, LogCheck, Remark, ScoredRow, ToolStudy } from '../lib/study';
import { CALCS, calcByKey } from '../tools/calc/registry';
import { newCalcStudy, startInputs } from '../tools/calc/calc';
import type { CalcDef } from '../tools/calc/types';
import { DOCS, docByKey } from '../tools/doc/registry';
import { newDocStudy, valuesOf } from '../tools/doc/doc';
import { customDocDef, metricValue, type MetricValue } from '../tools/doc/custom';
import type { CustomDef, DocDef, DocRow, DocValues } from '../tools/doc/types';
import { LOG_DEFS, defOf as logDefOf } from '../tools/checks/registry';
import { newLogStudy } from '../tools/checks/start';
import type { LogDef } from '../tools/checks/def';
import { SCORED, scoredByKey } from '../tools/scored/registry';
import { newScoredStudy } from '../tools/scored/scored';
import type { ScoredDef } from '../tools/scored/types';
import { newChangeoverStudy } from '../tools/changeover/changeover';
import { uid } from '../lib/ids';
import type { ColleagueDraft, DraftEntry, DraftField, DraftKind, DraftRow, DraftValue, HowKnown } from './types';

/* ================================================================== THE FIELD MAPS — read from the definitions */

const calcFields = (def: CalcDef): DraftField[] => def.inputs.filter(f => !f.hidden).map(f => ({
  name: f.id, label: f.label, type: f.kind === 'choice' ? 'choice' as const : f.kind === 'number' ? 'number' as const : 'text' as const,
  ...(f.unit ? { unit: f.unit } : {}), ...(f.options ? { options: f.options.map(o => o.value), optionLabels: f.options.map(o => o.label) } : {}),
  ...(f.min !== undefined ? { min: f.min } : {}), ...(f.max !== undefined ? { max: f.max } : {}), ...(f.integer ? { integer: true } : {}),
  /* needed: not optional, not money, and not already given a starting point by the definition */
  ...(!f.optional && !f.money && f.default === undefined && !f.showIf ? { required: true } : {}),
  ...(f.help ? { help: f.help } : {}),
}));

const docKind = (k: string): DraftField['type'] => (k === 'number' ? 'number' : k === 'choice' ? 'choice' : k === 'date' ? 'date' : 'text');
const docFields = (def: DocDef): DraftField[] => def.sections.flatMap(sec => sec.items.flatMap((i): DraftField[] => {
  if (i.kind === 'photos') return [];   /* photos are taken on the page, not said */
  if (i.kind === 'list') {
    return [{ name: i.id, label: i.label, type: 'list', section: sec.title, ...(i.required ? { required: true } : {}), ...(i.help ? { help: i.help } : {}),
      columns: i.columns.map(c => ({ name: c.id, label: c.label, type: docKind(c.kind), ...(c.unit ? { unit: c.unit } : {}), ...(c.required ? { required: true } : {}),
        ...(c.options ? { options: c.options.map(o => o.value), optionLabels: c.options.map(o => o.label) } : {}), ...(c.min !== undefined ? { min: c.min } : {}), ...(c.max !== undefined ? { max: c.max } : {}) })) }];
  }
  return [{ name: i.id, label: i.label, type: docKind(i.kind), section: sec.title, ...(i.unit ? { unit: i.unit } : {}), ...(i.required && !i.showIf ? { required: true } : {}),
    ...(i.options ? { options: i.options.map(o => o.value), optionLabels: i.options.map(o => o.label) } : {}), ...(i.min !== undefined ? { min: i.min } : {}), ...(i.max !== undefined ? { max: i.max } : {}),
    ...(i.integer ? { integer: true } : {}), ...(i.help ? { help: i.help } : {}) }];
}));

const checkFields = (def: LogDef): DraftField[] => [
  { name: 'where', label: def.whereLabel, type: 'text', section: 'The log', help: `Where the checks are done — the ${def.whereLabel.toLowerCase()} or the place, as the floor names it.` },
  { name: 'shiftHours', label: 'Hours in a shift', type: 'number', unit: 'hours', min: 1, max: 24, section: 'The log', help: 'For a check done every shift; 8 when not said.' },
  { name: 'leaveOut', label: 'Starter checks left out', type: 'list', section: 'The checks', help: `The log starts with its ${def.starterChecks.length} starter checks; any named here are left off this log.`,
    columns: [{ name: 'check', label: 'Check', type: 'choice', options: def.starterChecks.map(c => c.name), required: true }] },
];

/** Registers ranked from boxes in each row — the ones a conversation can fill row by row (a matrix or a register of cards is filled on its page). */
export const fillableScored = (d: ScoredDef): boolean => !!d.fields?.length && !!d.rank && !d.matrix && !d.register;
const scoredFields = (def: ScoredDef): DraftField[] => [
  { name: 'rows', label: `The ${def.noun ?? 'row'}s`, type: 'list', required: true, section: 'The register', ...(def.help ? { help: def.help } : {}),
    columns: [
      { name: 'name', label: def.noun ? def.noun[0].toUpperCase() + def.noun.slice(1) : 'Name', type: 'text', required: true },
      ...(def.fields ?? []).map((f): DraftField => (f.kind === 'score' ? { name: f.id, label: f.label, type: 'number', min: 1, max: 5, integer: true }
        : f.kind === 'tick' ? { name: f.id, label: f.label, type: 'choice', options: ['yes', 'no'] }
        : { name: f.id, label: f.label, type: 'number', min: 0, ...(f.kind === 'money' ? { unit: '£' } : { unit: 'hours' }) })),
    ] },
  ...(def.asksRate ? [{ name: 'rate', label: '£ an hour for the people doing the work', type: 'number' as const, unit: '£ an hour', min: 0, section: 'In money — optional' }] : []),
];

/** SMED's map onto the changeover record (lib/study ChangeoverStep, ChangeoverProduct, StudyAgreed.changeover). */
export const SMED_FIELDS: readonly DraftField[] = [
  { name: 'current', label: 'How long a changeover takes now', type: 'number', unit: 'min', min: 0, required: true, section: 'The changeover', help: 'As the floor says it — reported until the changeover is timed element by element.' },
  { name: 'target', label: 'The minutes it must come in at', type: 'number', unit: 'min', min: 0, required: true, section: 'The changeover', help: 'The target the changeover is judged against.' },
  { name: 'fromProduct', label: 'The product changed from', type: 'text', section: 'The changeover' },
  { name: 'toProduct', label: 'The product changed to', type: 'text', section: 'The changeover' },
  { name: 'machines', label: 'The machines on the line', type: 'list', section: 'The line', columns: [{ name: 'name', label: 'Machine', type: 'text', required: true }] },
  { name: 'products', label: 'The products changed between', type: 'list', section: 'The line', columns: [{ name: 'name', label: 'Product', type: 'text', required: true }] },
  { name: 'elements', label: 'The elements of the changeover', type: 'list', required: true, section: 'The elements', help: 'Each by name; a time only when it has been said or timed.',
    columns: [
      { name: 'name', label: 'Element', type: 'text', required: true },
      { name: 'minutes', label: 'Minutes', type: 'number', unit: 'min', min: 0 },
      { name: 'side', label: 'Internal or external', type: 'choice', options: ['internal', 'external'], optionLabels: ['Internal — the line stopped', 'External — while it runs'] },
      { name: 'where', label: 'Where on the machine', type: 'text' },
    ] },
  { name: 'notes', label: 'Anything else said', type: 'text', section: 'Notes' },
];

const customFields = (c: CustomDef): DraftField[] => c.sections.flatMap(sec => sec.fields.map((f): DraftField => ({
  name: f.id, label: f.label, type: f.type, section: sec.title, ...(f.unit ? { unit: f.unit } : {}), ...(f.options ? { options: f.options } : {}), ...(f.required ? { required: true } : {}),
  ...(f.type === 'list' ? { columns: (f.columns ?? []).map(col => ({ name: col.id, label: col.label, type: col.type, ...(col.unit ? { unit: col.unit } : {}), ...(col.options ? { options: col.options } : {}) })) } : {}),
})));

/* ================================================================== THE CATALOGUE — what can be filled by conversation */

export interface FillableTool { kind: Exclude<DraftKind, 'custom'>; key: string; title: string; says: string; group: string }

export const SMED_KEY = 'smed';
const SMED_TITLE = 'SMED — quick changeover';
const SMED_SAYS = 'How long the line stops between two products, element by element, Shingo’s stages to shorten it, and what the changeovers cost';

/** Every tool a conversation can fill, read from the registries — a new definition joins with no change here. */
export function fillableTools(): FillableTool[] {
  return [
    { kind: 'smed', key: SMED_KEY, title: SMED_TITLE, says: SMED_SAYS, group: 'Lean' },
    ...CALCS.map(c => ({ kind: 'calc' as const, key: c.key, title: c.title, says: c.says, group: `Calculators · ${c.group}` })),
    ...DOCS.map(d => ({ kind: 'doc' as const, key: d.key, title: d.title, says: d.says, group: `Documents · ${d.group}` })),
    ...LOG_DEFS.map(d => ({ kind: 'check' as const, key: d.key, title: d.title, says: d.says, group: `Check logs · ${d.group}` })),
    ...SCORED.filter(fillableScored).map(d => ({ kind: 'scored' as const, key: d.key, title: d.title, says: d.says, group: `Registers · ${d.group}` })),
  ];
}

/** The definition's own fields for a kind and key — undefined when there is no such tool. */
export function baseFields(kind: DraftKind, key: string, structure?: CustomDef): DraftField[] | undefined {
  switch (kind) {
    case 'calc': { const d = calcByKey(key); return d ? calcFields(d) : undefined; }
    case 'doc': { const d = docByKey(key); return d ? docFields(d) : undefined; }
    case 'check': { const d = logDefOf(key); return d ? checkFields(d) : undefined; }
    case 'scored': { const d = scoredByKey(key); return d && fillableScored(d) ? scoredFields(d) : undefined; }
    case 'smed': return key === SMED_KEY ? SMED_FIELDS.map(f => ({ ...f })) : undefined;
    case 'custom': return structure ? customFields(structure) : undefined;
  }
}

/** The title of the tool a draft fills. */
export function toolTitle(kind: DraftKind, key: string, structure?: CustomDef): string {
  switch (kind) {
    case 'calc': return calcByKey(key)?.title ?? key;
    case 'doc': return docByKey(key)?.title ?? key;
    case 'check': return logDefOf(key)?.title ?? key;
    case 'scored': return scoredByKey(key)?.title ?? key;
    case 'smed': return SMED_TITLE;
    case 'custom': return structure?.title || 'Custom sheet';
  }
}

/* ================================================================== A DRAFT READ */

/** Every field of a draft: the definition's (less what this record leaves out), then what was added to this record. */
export function fieldsOf(d: Pick<ColleagueDraft, 'kind' | 'key' | 'structure' | 'extra' | 'removed'>): DraftField[] {
  const base = (baseFields(d.kind, d.key, d.structure) ?? []).filter(f => !(d.removed ?? []).includes(f.name));
  return [...base, ...(d.extra ?? []).map(x => ({ ...x.field, ...(x.section ? { section: x.section } : {}), added: true }))];
}

/** A value said in words: a list as its rows, a choice by its label, a number with its unit. */
export function valueWords(f: DraftField, v: DraftValue): string {
  if (Array.isArray(v)) {
    const cols = f.columns ?? [];
    return v.map(r => cols.filter(c => r[c.name] !== undefined && r[c.name] !== '').map((c, i) => (i === 0 ? valueWords(c, r[c.name]) : `${c.label.toLowerCase()} ${valueWords(c, r[c.name])}`)).join(', ')).join('; ');
  }
  if (f.type === 'choice') { const i = (f.options ?? []).indexOf(String(v)); return i >= 0 && f.optionLabels?.[i] ? f.optionLabels[i] : String(v); }
  if (typeof v === 'number') return `${v.toLocaleString('en-GB', { maximumFractionDigits: 6 })}${f.unit ? (f.unit.startsWith('%') ? f.unit : ` ${f.unit}`) : ''}`;
  return v;
}

export interface CapturedField { field: DraftField; entry: DraftEntry; words: string }

/** What has been said, field by field, in the map's order. */
export function captured(d: ColleagueDraft): CapturedField[] {
  return fieldsOf(d).flatMap(f => { const e = d.values[f.name]; return e ? [{ field: f, entry: e, words: valueWords(f, e.value) }] : []; });
}

/** What a draft still needs before it can be made: its required fields not yet said — and, for a log or a register, its line. */
export function missing(d: ColleagueDraft): DraftField[] {
  const out = fieldsOf(d).filter(f => f.required && (!d.values[f.name] || (Array.isArray(d.values[f.name].value) && !(d.values[f.name].value as DraftRow[]).length)));
  if ((d.kind === 'check' || d.kind === 'scored') && !d.scope.lineId) out.unshift({ name: 'line', label: 'The line it is on', type: 'text', required: true, help: 'A log or a register sits on a line — find the line by name first.' });
  return out;
}

/** The draft's metrics as code works them — a custom sheet's; none for the other shapes. */
export function metricsOf(d: ColleagueDraft): MetricValue[] {
  if (d.kind !== 'custom' || !d.structure) return [];
  const def = customDocDef(d.structure);
  const v = valuesOf(def, docValuesOf(d, fieldsOf(d)));
  return (d.structure.metrics ?? []).map(m => metricValue(m, v, d.structure as CustomDef));
}

/* ================================================================== FILLING — every value checked against its field */

const HOW_OK: readonly Exclude<HowKnown, 'verified'>[] = ['observed', 'reported', 'measured', 'calculated', 'hypothesised', 'unknown'];

type Got = { ok: true; value: string | number } | { ok: false; why: string };

/** One scalar checked against its box: a number in range (said in the field's own unit), a choice among its options (by value or
 *  by its words), a date as YYYY-MM-DD, words of a sane length. */
export function checkScalar(f: DraftField, raw: unknown): Got {
  if (raw === undefined || raw === null || raw === '') return { ok: false, why: `Say a value for “${f.label}”.` };
  if (f.type === 'number') {
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^[-+]?(\d[\d,]*\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw.trim().replace(/,/g, '')) : NaN;
    if (!Number.isFinite(n)) return { ok: false, why: `“${f.label}” takes a number${f.unit ? ` in ${f.unit}` : ''} — “${String(raw)}” is not one.` };
    if (f.integer && !Number.isInteger(n)) return { ok: false, why: `“${f.label}” takes a whole number.` };
    if (f.min !== undefined && n < f.min) return { ok: false, why: `“${f.label}” must be at least ${f.min}${f.unit ? ` ${f.unit}` : ''}.` };
    if (f.max !== undefined && n > f.max) return { ok: false, why: `“${f.label}” must be at most ${f.max}${f.unit ? ` ${f.unit}` : ''}.` };
    return { ok: true, value: n };
  }
  const s = String(raw).trim();
  if (f.type === 'choice') {
    const opts = f.options ?? [];
    const i = opts.findIndex(o => o.toLowerCase() === s.toLowerCase());
    const j = i >= 0 ? i : (f.optionLabels ?? []).findIndex(o => o.toLowerCase() === s.toLowerCase());
    return j >= 0 ? { ok: true, value: opts[j] } : { ok: false, why: `“${f.label}” is one of: ${opts.map((o, k) => f.optionLabels?.[k] ?? o).join(', ')}.` };
  }
  if (f.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(s) ? { ok: true, value: s } : { ok: false, why: `“${f.label}” is a day, written YYYY-MM-DD.` };
  if (s.length > 2000) return { ok: false, why: `“${f.label}” is too long — at most 2,000 characters.` };
  return { ok: true, value: s };
}

/** A list's rows checked: each a row of named cells (or plain words, taken as the first column); a single row ADDS to the list,
 *  an array REPLACES it (the whole list as it now stands). */
export function checkRows(f: DraftField, raw: unknown, current: DraftRow[] | undefined): { ok: true; value: DraftRow[] } | { ok: false; why: string } {
  const cols = f.columns ?? [];
  const first = cols[0];
  const one = (r: unknown, n: number): { ok: true; row: DraftRow } | { ok: false; why: string } => {
    const o = typeof r === 'string' || typeof r === 'number' ? (first ? { [first.name]: r } : {}) : r && typeof r === 'object' && !Array.isArray(r) ? r as Record<string, unknown> : null;
    if (!o) return { ok: false, why: `Row ${n} of “${f.label}” must be named cells (${cols.map(c => c.name).join(', ')}).` };
    const odd = Object.keys(o).filter(k => !cols.some(c => c.name === k));
    if (odd.length) return { ok: false, why: `“${f.label}” has no column ${odd.join(', ')} — its columns are ${cols.map(c => c.name).join(', ')}.` };
    const row: DraftRow = {};
    for (const c of cols) {
      const x = o[c.name];
      if (x === undefined || x === null || x === '') { if (c.required) return { ok: false, why: `Row ${n} of “${f.label}” needs its “${c.label}”.` }; continue; }
      const g = checkScalar(c, x);
      if (!g.ok) return { ok: false, why: `Row ${n} of “${f.label}”: ${g.why}` };
      row[c.name] = g.value;
    }
    return { ok: true, row };
  };
  const list = Array.isArray(raw) ? raw : [raw];
  const rows: DraftRow[] = [];
  for (let i = 0; i < list.length; i++) { const r = one(list[i], (Array.isArray(raw) ? 0 : current?.length ?? 0) + i + 1); if (!r.ok) return r; rows.push(r.row); }
  if (rows.length > 200) return { ok: false, why: `“${f.label}” holds at most 200 rows.` };
  return { ok: true, value: Array.isArray(raw) ? rows : [...(current ?? []), ...rows] };
}

export interface FillItem { field: string; value: unknown; how: string; said?: string }

const same = (a: DraftValue, b: DraftValue): boolean => JSON.stringify(a) === JSON.stringify(b);

/** FILL — each value checked against its field and kept with how it is known; a correction overwrites and keeps the earlier value.
 *  Nothing is kept from an item that is refused; the others are kept. Never 'verified'. */
export function fillDraft(d: ColleagueDraft, items: readonly FillItem[], now: number): { draft: ColleagueDraft; kept: string[]; corrected: string[]; refused: string[] } {
  const fields = fieldsOf(d);
  const values = { ...d.values };
  const kept: string[] = [], corrected: string[] = [], refused: string[] = [];
  for (const it of items) {
    const f = fields.find(x => x.name === it.field) ?? fields.find(x => x.label.toLowerCase() === String(it.field).toLowerCase());
    if (!f) { refused.push(`${d.title} has no field “${it.field}” — its fields are ${fields.map(x => x.name).join(', ')}.`); continue; }
    if (it.how === 'verified') { refused.push(`“${f.label}” cannot be said to be verified — only a person marks that, in Faultline itself.`); continue; }
    const how = (HOW_OK as readonly string[]).includes(it.how) ? it.how as Exclude<HowKnown, 'verified'> : undefined;
    if (!how) { refused.push(`Say how “${f.label}” is known: ${HOW_OK.join(', ')}.`); continue; }
    const was = values[f.name];
    const got = f.type === 'list' ? checkRows(f, it.value, Array.isArray(was?.value) ? was?.value as DraftRow[] : undefined) : checkScalar(f, it.value);
    if (!got.ok) { refused.push(got.why); continue; }
    const said = typeof it.said === 'string' && it.said.trim() ? it.said.trim().slice(0, 300) : undefined;
    if (was && same(was.value, got.value) && was.how === how) { kept.push(f.label); continue; }
    const entry: DraftEntry = { value: got.value, how, ...(said ? { said } : {}), at: now };
    if (was) {
      entry.earlier = [...(was.earlier ?? []), { value: was.value, how: was.how, ...(was.said ? { said: was.said } : {}), at: was.at }].slice(-10);
      corrected.push(`${f.label}: ${valueWords(f, was.value)} → ${valueWords(f, got.value)}`);
    } else kept.push(f.label);
    values[f.name] = entry;
  }
  return { draft: { ...d, values }, kept, corrected, refused };
}

/** A field name as a person may give it: lower-case words joined by underscores. */
export const FIELD_NAME = /^[a-z][a-z0-9_]{0,39}$/;
export const nameOf = (label: string): string => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40) || 'field';

/** ADAPT — fields added to this record only, or the definition's own optional ones left out. A required field is never removed;
 *  a name already on the draft is never added twice. */
export function adaptDraft(d: ColleagueDraft, add: readonly { section?: string; field: DraftField }[], remove: readonly string[]): { draft: ColleagueDraft; added: string[]; removed: string[]; refused: string[] } {
  const refused: string[] = [], added: string[] = [], gone: string[] = [];
  let extra = [...(d.extra ?? [])];
  let removedList = [...(d.removed ?? [])];
  const values = { ...d.values };
  for (const name of remove) {
    const own = extra.find(x => x.field.name === name);
    if (own) { extra = extra.filter(x => x !== own); delete values[name]; gone.push(own.field.label); continue; }
    const base = (baseFields(d.kind, d.key, d.structure) ?? []).find(f => f.name === name);
    if (!base) { refused.push(`There is no field “${name}” to take off.`); continue; }
    if (base.required) { refused.push(`“${base.label}” is one the ${toolTitle(d.kind, d.key, d.structure)} needs — it cannot be taken off.`); continue; }
    if (!removedList.includes(name)) removedList = [...removedList, name];
    delete values[name];
    gone.push(base.label);
  }
  for (const a of add) {
    const f = a.field;
    const all = fieldsOf({ ...d, extra, removed: removedList });
    if (!FIELD_NAME.test(f.name)) { refused.push(`“${f.name}” is not a field name — lower-case words joined by underscores.`); continue; }
    if (all.some(x => x.name === f.name)) { refused.push(`There is already a field “${f.name}”.`); continue; }
    if (f.type === 'choice' && !(f.options ?? []).length) { refused.push(`“${f.label}” is a choice, so it needs its options.`); continue; }
    if (f.type === 'list' && !(f.columns ?? []).length) { refused.push(`“${f.label}” is a list, so it needs its columns.`); continue; }
    extra = [...extra, { ...(a.section ? { section: a.section } : {}), field: { ...f, added: true } }];
    added.push(f.label);
  }
  return { draft: { ...d, extra, removed: removedList, values }, added, removed: gone, refused };
}

/* ================================================================== THE RECORD — made through the tool's own New */

const plain = (d: ColleagueDraft): Record<string, DraftValue> => Object.fromEntries(Object.entries(d.values).map(([k, e]) => [k, e.value]));
const numberAt = (d: ColleagueDraft, k: string): number | undefined => (typeof d.values[k]?.value === 'number' ? d.values[k].value as number : undefined);
const textAt = (d: ColleagueDraft, k: string): string | undefined => (typeof d.values[k]?.value === 'string' ? d.values[k].value as string : typeof d.values[k]?.value === 'number' ? String(d.values[k].value) : undefined);
const rowsAt = (d: ColleagueDraft, k: string): DraftRow[] => (Array.isArray(d.values[k]?.value) ? d.values[k].value as DraftRow[] : []);
const HOW_SAID_WORD: Record<Exclude<HowKnown, 'verified'>, string> = { observed: 'observed', reported: 'reported', measured: 'measured', calculated: 'calculated', hypothesised: 'a hypothesis, not yet checked', unknown: 'how it is known not said' };

/** A document's boxes from a draft: a list's rows given stable ids (the draft's and the row's place), so a second make replaces them cleanly. */
export function docValuesOf(d: ColleagueDraft, fields: DraftField[]): DocValues {
  const out: DocValues = {};
  for (const f of fields) {
    const e = d.values[f.name];
    if (!e || f.added) continue;
    out[f.name] = Array.isArray(e.value) ? e.value.map((r, i): DocRow => ({ id: `${d.id}-${f.name}-${i + 1}`, c: { ...r } })) : e.value;
  }
  return out;
}

/** A remark on the record — what a field added to this record holds, or what SMED keeps in words — with a stable id, so a second make replaces it. */
const remark = (d: ColleagueDraft, name: string, text: string, now: number): Remark => ({ id: `ai-${d.id}-${name}`, at: now, text, by: 'AI Mode' });
function addedRemarks(d: ColleagueDraft, now: number, names?: Set<string>): Remark[] {
  return fieldsOf(d).filter(f => f.added && d.values[f.name] && (!names || names.has(f.name)))
    .map(f => remark(d, f.name, `${f.label}: ${valueWords(f, d.values[f.name].value)} — ${HOW_SAID_WORD[d.values[f.name].how]}${d.values[f.name].said ? ` (“${d.values[f.name].said}”)` : ''}.`, now));
}
const withRemarks = (s: ToolStudy, rs: Remark[]): ToolStudy => {
  if (!rs.length) return s;
  const ids = new Set(rs.map(r => r.id));
  return { ...s, facts: { ...s.facts, remarks: [...(s.facts.remarks ?? []).filter(r => !ids.has(r.id)), ...rs] } };
};

export interface RecordOpts { id: string; now: number; checkId?: () => string; standardId?: string }

/** THE NEW RECORD — exactly what the tool's New makes (the same constructor), with what was said written in. Undefined when the
 *  draft cannot be made (its tool is unknown, or a log or register has no line). */
export function toRecord(d: ColleagueDraft, o: RecordOpts): ToolStudy | undefined {
  const where = { ...(d.scope.lineId ? { workspaceId: d.scope.lineId } : {}), ...(d.scope.projectId ? { projectId: d.scope.projectId } : {}) };
  switch (d.kind) {
    case 'calc': { const def = calcByKey(d.key); if (!def) return undefined; return applyDraft(newCalcStudy(def, { id: o.id, name: d.title, now: o.now, ...where }), d, o.now); }
    case 'doc': { const def = docByKey(d.key); if (!def) return undefined; return applyDraft(newDocStudy(def, { id: o.id, name: d.title, now: o.now, ...where }), d, o.now); }
    case 'custom': { if (!d.structure) return undefined; const s = newDocStudy(customDocDef(d.structure), { id: o.id, name: d.title, now: o.now, ...where }); return applyDraft(s, d, o.now); }
    case 'check': {
      const def = logDefOf(d.key);
      if (!def || !d.scope.lineId) return undefined;
      const out = new Set(rowsAt(d, 'leaveOut').map(r => String(r.check)));
      const pick = def.starterChecks.map((c, i) => (out.has(c.name) ? -1 : i)).filter(i => i >= 0);
      const s = newLogStudy(def, { name: d.title, workspaceId: d.scope.lineId, ...(d.scope.projectId ? { projectId: d.scope.projectId } : {}), since: o.now, now: o.now, pick,
        ...(textAt(d, 'where') ? { where: textAt(d, 'where'), machine: textAt(d, 'where') } : {}), ...(numberAt(d, 'shiftHours') ? { shiftHours: numberAt(d, 'shiftHours') } : {}),
        id: (() => { let n = 0; return () => (n++ === 0 ? o.id : (o.checkId ?? uid)()); })() });
      return applyDraft(s, d, o.now, undefined, o.checkId);
    }
    case 'scored': {
      const def = scoredByKey(d.key);
      if (!def || !d.scope.lineId) return undefined;
      return applyDraft(newScoredStudy(def, { id: o.id, name: d.title, workspaceId: d.scope.lineId, ...(d.scope.projectId ? { projectId: d.scope.projectId } : {}), now: o.now }), d, o.now);
    }
    case 'smed': {
      const from = textAt(d, 'fromProduct'), to = textAt(d, 'toProduct');
      return applyDraft(newChangeoverStudy({ id: o.id, name: d.title, now: o.now, ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}), ...where, ...(o.standardId ? { standardId: o.standardId } : {}) }), d, o.now);
    }
  }
}

/** The fields changed since the draft was last made — every field said, when it never was. */
export function changedSinceMade(d: ColleagueDraft): string[] {
  const now = plain(d), was = d.madeValues;
  if (!was) return Object.keys(now);
  return [...new Set([...Object.keys(now), ...Object.keys(was)])].filter(k => !same(now[k] ?? '', was[k] ?? ''));
}

/** WHAT WAS SAID, WRITTEN INTO A RECORD — every field (a new record) or only `names` (a record already made, so what was edited
 *  in Manual Mode where the conversation did not change it stays as it is). Pure: the record in, the record out. */
export function applyDraft(s: ToolStudy, d: ColleagueDraft, now: number, names?: string[], checkId?: () => string): ToolStudy {
  const only = names ? new Set(names) : undefined;
  const wants = (k: string) => !only || only.has(k);
  const fields = fieldsOf(d);
  const own = fields.filter(f => !f.added);
  let out: ToolStudy = { ...s, updatedAt: now };
  switch (d.kind) {
    case 'calc': {
      const def = calcByKey(d.key);
      const inputs = { ...(out.agreed?.calc?.inputs ?? (def ? startInputs(def) : {})) };
      for (const f of own) if (wants(f.name)) { const e = d.values[f.name]; if (e && !Array.isArray(e.value)) inputs[f.name] = e.value; else if (!e && only) delete inputs[f.name]; }
      out = { ...out, agreed: { ...out.agreed, calc: { ...(out.agreed?.calc ?? { key: d.key }), key: d.key, inputs } } };
      break;
    }
    case 'doc': case 'custom': {
      const vals = docValuesOf(d, own);
      const cur: DocValues = { ...(out.facts.docValues ?? {}) };
      for (const f of own) if (wants(f.name)) { if (vals[f.name] !== undefined) cur[f.name] = vals[f.name]; else if (only) delete cur[f.name]; }
      out = { ...out, facts: { ...out.facts, docValues: cur, ...(d.kind === 'custom' && d.structure ? { customDef: d.structure } : {}) } };
      break;
    }
    case 'check': {
      const log = out.agreed?.log;
      if (log) {
        const shiftHours = numberAt(d, 'shiftHours');
        let checks = log.checks;
        /* B on a log: a field added is a check added to this log's list — a pass or fail, every shift, in the words said */
        for (const f of fields.filter(x => x.added && wants(x.name))) {
          if (checks.some(c => c.name === f.label)) continue;
          const e = d.values[f.name];
          const check: LogCheck = { id: (checkId ?? uid)(), name: f.label, kind: 'passfail', when: { every: 1, unit: 'shift' }, ...(e && !Array.isArray(e.value) ? { criterion: String(e.value) } : {}), addedAt: now };
          checks = [...checks, check];
        }
        out = { ...out, agreed: { ...out.agreed, log: { ...log, checks, ...(wants('shiftHours') && shiftHours ? { shiftHours } : {}) } }, ...(wants('where') && textAt(d, 'where') ? { machine: textAt(d, 'where') } : {}) };
      }
      return out;
    }
    case 'scored': {
      const sc = out.agreed?.scored;
      if (sc) {
        const rows: ScoredRow[] = wants('rows') && d.values.rows ? rowsAt(d, 'rows').map((r, i) => {
          const row: ScoredRow = { id: `${d.id}-row-${i + 1}`, name: String(r.name ?? '') };
          for (const [k, x] of Object.entries(r)) if (k !== 'name') (row as unknown as Record<string, unknown>)[k] = x === 'yes' ? true : x === 'no' ? false : x;
          return row;
        }) : !names ? [] : sc.rows;
        out = { ...out, agreed: { ...out.agreed, scored: { ...sc, rows, ...(wants('rate') && numberAt(d, 'rate') !== undefined ? { rate: numberAt(d, 'rate') } : {}) } } };
      }
      break;
    }
    case 'smed': {
      const facts = { ...out.facts };
      if (wants('elements') && d.values.elements) {
        facts.sequence = rowsAt(d, 'elements').map((r, i): ChangeoverStep => ({
          id: `${d.id}-el-${i + 1}`, order: i, name: String(r.name), side: r.side === 'external' ? 'external' : 'internal', source: 'typed', at: now,
          ...(typeof r.minutes === 'number' ? { sec: Math.round(r.minutes * 60) } : {}), ...(r.where ? { where: String(r.where) } : {}),
        }));
      }
      if (wants('products') && d.values.products) facts.products = rowsAt(d, 'products').map((r, i): ChangeoverProduct => ({ id: `${d.id}-pr-${i + 1}`, product: String(r.name) }));
      if (wants('fromProduct') && textAt(d, 'fromProduct') !== undefined) facts.fromProduct = textAt(d, 'fromProduct');
      if (wants('toProduct') && textAt(d, 'toProduct') !== undefined) { facts.toProduct = textAt(d, 'toProduct'); out = { ...out, product: textAt(d, 'toProduct') }; }
      out = { ...out, facts };
      const target = numberAt(d, 'target');
      if (wants('target') && target !== undefined && target > 0) out = { ...out, agreed: { ...out.agreed, changeover: { minutes: target } } };
      /* what SMED has no box for is kept in its notes, in words, with how it is known */
      const words: Remark[] = [];
      const say = (k: string, text: (f: DraftField, e: DraftEntry) => string) => {
        const f = own.find(x => x.name === k), e = d.values[k];
        if (f && e && wants(k)) words.push(remark(d, k, `${text(f, e)} — ${HOW_SAID_WORD[e.how]}${e.said ? ` (“${e.said}”)` : ''}.`, now));
      };
      say('current', (f, e) => `A changeover takes about ${valueWords(f, e.value)} now`);
      say('machines', (f, e) => `The machines on the line: ${valueWords(f, e.value)}`);
      say('notes', (_f, e) => String(e.value));
      out = withRemarks(out, words);
      break;
    }
  }
  return withRemarks(out, addedRemarks(d, now, only));
}

/** Where a made record opens in Manual Mode — the same addresses lib/studyLinks studyHref gives. */
export const draftNoun = (d: Pick<ColleagueDraft, 'kind'>): string => ({ calc: 'calculation', doc: 'document', check: 'check log', scored: 'register', smed: 'SMED study', custom: 'sheet' })[d.kind];

/** The draft's values as they were made — kept on the draft so a later make changes only what changed since. */
export const madeSnapshot = (d: ColleagueDraft): Record<string, DraftValue> => plain(d);

/** A draft as the colleague is told it — the fields captured (with how known), what is missing, the metrics. */
export function draftSaid(d: ColleagueDraft): string {
  const got = captured(d), need = missing(d), ms = metricsOf(d);
  return [
    `${d.title} (${toolTitle(d.kind, d.key, d.structure)}, ${d.status === 'made' ? 'made' : 'draft'}).`,
    got.length ? `Captured: ${got.map(c => `${c.field.label} ${c.words} (${c.entry.how})`).join('; ')}.` : 'Nothing captured yet.',
    need.length ? `Still missing: ${need.map(f => f.label).join(', ')}.` : 'Nothing required is missing.',
    ...(ms.length ? [`Metrics, as Faultline works them: ${ms.map(m => `${m.metric.name} ${m.value !== undefined ? m.said : `waits on ${m.missing.join(', ')}`}`).join('; ')}.`] : []),
  ].join(' ');
}

/** The fields as the colleague is given them — compact. */
export const fieldsForColleague = (fs: readonly DraftField[]) => fs.map(f => ({
  name: f.name, label: f.label, type: f.type, ...(f.unit ? { unit: f.unit } : {}), ...(f.required ? { required: true } : {}), ...(f.options ? { options: f.options } : {}),
  ...(f.columns ? { columns: f.columns.map(c => ({ name: c.name, label: c.label, type: c.type, ...(c.unit ? { unit: c.unit } : {}), ...(c.options ? { options: c.options } : {}), ...(c.required ? { required: true } : {}) })) } : {}),
  ...(f.added ? { added: true } : {}),
}));
