/* RUNNING A DOCUMENT — pure (knowledge/specs/FC-240-documents.md). What was typed goes in; the boxes still needed, the checks on each
 * box, the definition's reading, the status and the tiles come out. Nothing here is a document's own method: that is the definition's.
 * The page (DocScreen), the paper (lib/report/docPaper), the line's tile and report (lib/studyLinks) and the acceptance script all read
 * this one module, so the screen, the paper and the test say one thing. */
import { uid } from '../../lib/ids';
import { niceDay } from '../../lib/weeks';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ToolStudy } from '../../lib/study';
import { docDefOf } from './custom';
import { brief } from './figures/words';
import type { DocColumn, DocCtx, DocDef, DocField, DocItem, DocList, DocPhoto, DocPhotos, DocProblem, DocResult, DocRow, DocSection, DocSigned, DocValues } from './types';

/* ------------------------------------------------------------------ the items of a definition */

export const isScalar = (i: DocItem): i is DocField => i.kind !== 'list' && i.kind !== 'photos';
export const isList = (i: DocItem): i is DocList => i.kind === 'list';
export const isPhotos = (i: DocItem): i is DocPhotos => i.kind === 'photos';

/** Every item of a definition, section by section. */
export const itemsOf = (def: DocDef): DocItem[] => def.sections.flatMap(s => s.items);

/** The items asked now — one with a `showIf` that does not hold is not asked (and so not needed, not read, not printed). */
export function askedItems(def: DocDef, v: DocValues): DocItem[] {
  return itemsOf(def).filter(i => !('showIf' in i) || !i.showIf || i.showIf(v));
}
export function askedSections(def: DocDef, v: DocValues): DocSection[] {
  return def.sections.map(s => ({ ...s, items: s.items.filter(i => !('showIf' in i) || !i.showIf || i.showIf(v)) })).filter(s => s.items.length);
}

/* ------------------------------------------------------------------ reading what was typed */

const isoOk = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00`)) && new Date(`${s}T12:00:00`).toISOString().slice(0, 10) === s;

/** A number as people type it: "1,500", "4.1", " 12 ". Blank or not a number is undefined. */
export function toNumber(x: unknown): number | undefined {
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (typeof x === 'string') {
    const t = x.trim().replace(/,/g, '');
    return t !== '' && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t) && Number.isFinite(Number(t)) ? Number(t) : undefined;
  }
  return undefined;
}

function scalarOf(f: Pick<DocField, 'kind' | 'options'>, x: unknown): string | number | undefined {
  if (f.kind === 'number') return toNumber(x);
  if (x === undefined || x === null) return undefined;
  const s = String(x).replace(/\s+$/g, '').replace(/^\s+/g, '');
  if (s === '') return undefined;
  if (f.kind === 'date') return isoOk(s) ? s : undefined;
  if (f.kind === 'choice') return (f.options ?? []).some(o => o.value === s) ? s : undefined;
  return s;
}

/** A row as it is read: only its columns, each parsed; undefined when nothing in it was given. */
function rowOf(l: DocList, r: DocRow): DocRow | undefined {
  const c: Record<string, string | number> = {};
  for (const col of l.columns) { const x = scalarOf(col, r.c?.[col.id]); if (x !== undefined) c[col.id] = x; }
  return Object.keys(c).length ? { id: r.id, c } : undefined;
}

/** What was typed, as the definition reads it: numbers parsed, a choice only if it is one of the options, a date only if it is a
 *  date, a list's rows without the empty ones, a box that is not asked left out. `raw` may be missing or from a newer build. */
export function valuesOf(def: DocDef, raw: DocValues | undefined): DocValues {
  const r = raw ?? {};
  const v: DocValues = {};
  /* two passes: showIf may read a choice made in the same document */
  for (const i of itemsOf(def)) {
    if (isScalar(i)) { const x = scalarOf(i, r[i.id]); if (x !== undefined) v[i.id] = x; }
    else if (isList(i)) { const rows = Array.isArray(r[i.id]) ? (r[i.id] as DocRow[]).flatMap(x => (x && typeof x === 'object' ? [rowOf(i, x)] : [])).filter((x): x is DocRow => !!x) : []; if (rows.length) v[i.id] = rows; }
  }
  for (const i of itemsOf(def)) if ('showIf' in i && i.showIf && !i.showIf(v)) delete v[i.id];
  return v;
}

/** A text box's words, trimmed — '' when blank. */
export const textOf = (v: DocValues, id: string): string => (typeof v[id] === 'string' ? (v[id] as string) : typeof v[id] === 'number' ? String(v[id]) : '');
/** A number box's number. */
export const numOf = (v: DocValues, id: string): number | undefined => (typeof v[id] === 'number' ? (v[id] as number) : undefined);
/** A list's rows (read). */
export const rowsOf = (v: DocValues, id: string): DocRow[] => (Array.isArray(v[id]) ? (v[id] as DocRow[]) : []);
export const cellText = (r: DocRow, col: string): string => (typeof r.c[col] === 'string' ? (r.c[col] as string) : typeof r.c[col] === 'number' ? String(r.c[col]) : '');
export const cellNum = (r: DocRow, col: string): number | undefined => (typeof r.c[col] === 'number' ? (r.c[col] as number) : undefined);

/** A box's value as the paper and the page say it: a choice by its label, a date as a day, a number with its unit. */
export function valueSaid(f: Pick<DocField, 'kind' | 'options' | 'unit'>, x: string | number | undefined): string {
  if (x === undefined || x === '') return '—';
  if (f.kind === 'choice') return (f.options ?? []).find(o => o.value === x)?.label ?? String(x);
  if (f.kind === 'date') return niceDay(String(x), { year: true });
  if (typeof x === 'number') {
    const n = x.toLocaleString('en-GB', { maximumFractionDigits: 6 });
    /* a pound sign goes before the figure: "£14.7 an hour", "£0.42" */
    return f.unit?.startsWith('£') ? `£${n}${f.unit.slice(1)}` : `${n}${f.unit ? ` ${f.unit}` : ''}`;
  }
  return String(x);
}

/* ------------------------------------------------------------------ what is wrong with a box, on its own */

const numberProblem = (c: Pick<DocColumn, 'label' | 'min' | 'max' | 'integer'>, raw: unknown, where: string): string | undefined => {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return undefined;
  const n = toNumber(raw);
  if (n === undefined) return `${where}“${c.label}” must be a number.`;
  if (c.integer && !Number.isInteger(n)) return `${where}“${c.label}” must be a whole number.`;
  if (c.min !== undefined && n < c.min) return `${where}“${c.label}” must be at least ${c.min}.`;
  if (c.max !== undefined && n > c.max) return `${where}“${c.label}” must be at most ${c.max}.`;
  return undefined;
};

function boxProblem(c: DocColumn, raw: unknown, where = ''): string | undefined {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return undefined;
  if (c.kind === 'number') return numberProblem(c, raw, where);
  const s = String(raw).trim();
  if (c.kind === 'date' && !isoOk(s)) return `${where}“${c.label}” is not a date.`;
  if (c.kind === 'choice' && !(c.options ?? []).some(o => o.value === s)) return `${where}“${c.label}” is not one of the choices.`;
  if (c.maxLength !== undefined && s.length > c.maxLength) return `${where}“${c.label}” is longer than ${c.maxLength} characters.`;
  return undefined;
}

/** What is wrong with each box on its own, in what was typed (not in what was read): not a number, outside its range, not a date,
 *  a list longer than it may be. Advisory — the document is saved as typed. */
export function fieldProblems(def: DocDef, raw: DocValues | undefined): DocProblem[] {
  const r = raw ?? {};
  const v = valuesOf(def, r);
  const out: DocProblem[] = [];
  for (const i of askedItems(def, v)) {
    if (isScalar(i)) { const say = boxProblem(i, r[i.id]); if (say) out.push({ field: i.id, say }); }
    else if (isList(i)) {
      const rows = Array.isArray(r[i.id]) ? (r[i.id] as DocRow[]) : [];
      rows.forEach((row, k) => {
        for (const col of i.columns) { const say = boxProblem(col, row.c?.[col.id], `${cap(i.rowWord)} ${k + 1}: `); if (say) out.push({ field: `${i.id}.${row.id}.${col.id}`, say }); }
      });
      if (i.max !== undefined && rowsOf(v, i.id).length > i.max) out.push({ field: i.id, say: `“${i.label}” holds at most ${i.max} ${i.rowWord}s.` });
    }
  }
  return out;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ what is still needed */

/** The needed boxes still blank, by their words (a list: how many rows it still lacks; a row with a needed cell missing, named). */
export function needsOf(def: DocDef, v: DocValues, photos: readonly DocPhoto[]): string[] {
  const out: string[] = [];
  for (const i of askedItems(def, v)) {
    if (isScalar(i)) { if (i.required && v[i.id] === undefined) out.push(i.label); }
    else if (isList(i)) {
      const rows = rowsOf(v, i.id);
      const must = i.columns.filter(c => c.required);
      const bad = rows.filter(r => must.some(c => r.c[c.id] === undefined));
      const whole = rows.length - bad.length;
      const min = i.min ?? (i.required ? 1 : 0);
      const other = i.alt ? itemsOf(def).find(x => x.id === i.alt) : undefined;
      if (other && isList(other) && rowsOf(v, other.id).filter(r => other.columns.filter(c => c.required).every(c => r.c[c.id] !== undefined)).length >= Math.max(1, min)) continue;
      if (whole < min) out.push(`${i.label} — ${min === 1 ? `at least one ${i.rowWord}` : `at least ${min} ${i.rowWord}s`}${bad.length ? `, with ${must.map(c => `“${c.label}”`).join(' and ')} given` : ''}`);
      else for (const r of bad) out.push(`${i.label}: ${rows.indexOf(r) + 1} lacks ${must.filter(c => r.c[c.id] === undefined).map(c => `“${c.label}”`).join(' and ')}`);
    } else if (isPhotos(i) && i.required && !photos.some(p => p.field === i.id && !p.struck)) out.push(i.label);
  }
  return out;
}

/** How many of the needed boxes are filled, of how many. */
export function filledOf(def: DocDef, v: DocValues, photos: readonly DocPhoto[]): { filled: number; total: number } {
  let filled = 0, total = 0;
  for (const i of askedItems(def, v)) {
    if (isScalar(i)) { if (i.required) { total++; if (v[i.id] !== undefined) filled++; } }
    else if (isList(i)) {
      const min = i.min ?? (i.required ? 1 : 0);
      if (min > 0 || i.required) {
        total++;
        const must = i.columns.filter(c => c.required);
        const other = i.alt ? itemsOf(def).find(x => x.id === i.alt) : undefined;
        const meets = (l: DocList) => rowsOf(v, l.id).filter(r => l.columns.filter(c => c.required).every(c => r.c[c.id] !== undefined)).length >= Math.max(1, min);
        if (rowsOf(v, i.id).filter(r => must.every(c => r.c[c.id] !== undefined)).length >= Math.max(1, min) || (other && isList(other) && meets(other))) filled++;
      }
    } else if (isPhotos(i) && i.required) { total++; if (photos.some(p => p.field === i.id && !p.struck)) filled++; }
  }
  return { filled, total };
}

/* ------------------------------------------------------------------ status */

export interface DocStatus {
  key: 'draft' | 'ready' | 'signed' | 'complete';
  /** "Draft", "Ready to agree", "Agreed". */
  word: string;
  tone: LeanTone;
}

/** Draft until every needed box is filled; then ready for the person who agrees it (waiting on somebody — amber); then agreed (green).
 *  A definition with no sign-off is simply complete (green) once its needed boxes are filled. */
export function statusOf(def: DocDef, need: readonly string[], signed: DocSigned | undefined): DocStatus {
  if (!def.signoff) return need.length ? { key: 'draft', word: 'In progress', tone: 'n' } : { key: 'complete', word: 'Complete', tone: 'g' };
  if (signed) return { key: 'signed', word: def.signoff.word, tone: 'g' };
  return need.length ? { key: 'draft', word: 'Draft', tone: 'n' } : { key: 'ready', word: def.signoff.ready, tone: 'a' };
}

/* ------------------------------------------------------------------ a run */

export interface DocRun {
  def: DocDef;
  /** What was typed, as read. */
  values: DocValues;
  photos: DocPhoto[];
  need: string[];
  filled: number;
  total: number;
  /** Each box's own problems, then the definition's. */
  problems: DocProblem[];
  result: DocResult;
  status: DocStatus;
  signed?: DocSigned;
  /** The tiles as the page and the paper show them: how much is filled in first, then the definition's. */
  tiles: LeanTile[];
}

export const EMPTY_CTX = (today: string): DocCtx => ({ today });

/** The document read: never throws — a definition that fails on what it was not ready for says so and the page stays up. */
export function runDoc(def: DocDef, raw: DocValues | undefined, photosIn: readonly DocPhoto[], ctx: DocCtx, signed?: DocSigned): DocRun {
  const values = valuesOf(def, raw);
  const photos = photosIn.filter(p => !p.struck && askedItems(def, values).some(i => i.id === p.field));
  const need = needsOf(def, values, photos);
  const { filled, total } = filledOf(def, values, photos);
  const own = fieldProblems(def, raw);
  let result: DocResult;
  try {
    result = def.read(values, ctx, photos);
    result = { ...result, checks: [...(def.check?.(values, ctx) ?? []), ...result.checks] };
  } catch (e) {
    console.error('document failed', def.key, e);
    result = { sentence: '', tone: 'n', tiles: [], money: { missing: [] }, caveats: ['This could not be read from what is typed yet.'], checks: [], closing: 'It could not be read from what is typed yet.' };
  }
  const status = statusOf(def, need, signed);
  const tiles: LeanTile[] = [
    { k: 'Filled in', v: total ? `${filled} of ${total}` : '—', of: total ? (filled === total ? 'everything needed' : `${total - filled} still needed`) : 'nothing is required', tone: total && filled < total ? 'n' : 'g' },
    ...result.tiles,
  ];
  return { def, values, photos: [...photos], need, filled, total, problems: [...own, ...result.checks], result, status, tiles, ...(signed ? { signed } : {}) };
}

/* ------------------------------------------------------------------ a record */

/** The record's boxes, as kept. */
export const studyRaw = (s: Pick<ToolStudy, 'facts'>): DocValues => s.facts?.docValues ?? {};
export const studyPhotos = (s: Pick<ToolStudy, 'facts'>): DocPhoto[] => s.facts?.docPhotos ?? [];

/** The document a record is, read now — undefined when its definition is not in this build. */
export function studyDoc(s: Pick<ToolStudy, 'agreed' | 'facts'>, ctx: DocCtx = EMPTY_CTX(new Date().toISOString().slice(0, 10))): DocRun | undefined {
  const a = s.agreed?.doc;
  const def = docDefOf(s);
  return a && def ? runDoc(def, studyRaw(s), studyPhotos(s), ctx, a.signed) : undefined;
}

/** The record's name for what it is: the definition's title. */
export const docTitle = (s: Pick<ToolStudy, 'agreed'> & Partial<Pick<ToolStudy, 'facts'>>): string => docDefOf(s)?.title ?? 'Document';

/** What a record says in one place — the line's tile, the list's row, the line report: sentence, verdict and tone. */
export function docSays(s: Pick<ToolStudy, 'agreed' | 'facts'>, ctx?: DocCtx): { text: string; tone: LeanTone; verdict: string } {
  const r = studyDoc(s, ctx);
  if (!r) return { text: s.agreed?.doc ? 'this document is not in this version of the app' : 'not set up yet', tone: 'n', verdict: s.agreed?.doc ? 'Unknown document' : 'Not set up' };
  const said = r.result.sentence || (r.need.length ? `Still to fill in: ${r.need.slice(0, 3).join(', ')}${r.need.length > 3 ? ` and ${r.need.length - 3} more` : ''}.` : r.def.question);
  /* the sentence's own colour is the document's; a draft or a waiting-to-agree status colours the verdict, never a finding the document has not made */
  const tone: LeanTone = r.result.tone === 'r' || r.result.tone === 'a' ? r.result.tone : r.status.tone;
  return { text: said, tone, verdict: r.status.word };
}

/** A new record of a definition: named, on a line or a project or neither, with what the definition starts with. */
export function newDocStudy(def: DocDef, o: { name: string; workspaceId?: string; projectId?: string; now: number; id?: string }): ToolStudy {
  return {
    id: o.id ?? uid(), tool: 'doc', name: o.name,
    ...(o.workspaceId ? { workspaceId: o.workspaceId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}),
    agreed: { doc: { def: def.key } },
    facts: { ...(def.start && Object.keys(def.start).length ? { docValues: { ...def.start } } : {}) },
    uses: [], startedAt: o.now, createdAt: o.now, updatedAt: o.now,
  };
}

/** The files a document names: its photos while they are not struck — what goes to the cloud with it (cloud/mappers studies mediaKeys). */
export function docMediaKeys(facts: Pick<ToolStudy['facts'], 'docPhotos'>): { key: string; mime: string }[] {
  return (facts.docPhotos ?? []).flatMap(p => (p.blobKey ? [{ key: p.blobKey, mime: p.mime || 'image/jpeg' }] : []));
}

/* ------------------------------------------------------------------ editing what was typed (pure) */

/** The boxes with one box set — blank removes it. */
export function withValue(raw: DocValues, id: string, x: string | number | DocRow[] | undefined): DocValues {
  const { [id]: _gone, ...rest } = raw;
  void _gone;
  const blank = x === undefined || x === '' || (Array.isArray(x) && x.length === 0);
  return blank ? rest : { ...rest, [id]: x };
}
export const newRow = (): DocRow => ({ id: uid(), c: {} });
/** A cell set in a list's row (a blank removes the cell). */
export function withCell(raw: DocValues, listId: string, rowId: string, col: string, x: string | number): DocValues {
  const rows = (Array.isArray(raw[listId]) ? (raw[listId] as DocRow[]) : []).map(r => {
    if (r.id !== rowId) return r;
    const { [col]: _g, ...rest } = r.c;
    void _g;
    return { ...r, c: x === '' ? rest : { ...rest, [col]: x } };
  });
  return { ...raw, [listId]: rows };
}
export function withRowAdded(raw: DocValues, listId: string, row: DocRow = newRow()): DocValues {
  return { ...raw, [listId]: [...(Array.isArray(raw[listId]) ? (raw[listId] as DocRow[]) : []), row] };
}
export function withRowRemoved(raw: DocValues, listId: string, rowId: string): DocValues {
  const rows = (Array.isArray(raw[listId]) ? (raw[listId] as DocRow[]) : []).filter(r => r.id !== rowId);
  return withValue(raw, listId, rows);
}

/* ------------------------------------------------------------------ small words the definitions share */

export const tileOf = (k: string, v: string, o: Partial<LeanTile> = {}): LeanTile => ({ k, v, ...o });

/** Offer what the project's METHOD sheet already says where a document asks the same question (the DMAIC Define's problem, a Kaizen event's
 *  sponsor): the first of `keys` ("dmaic:problem") that is written, in one tap, with the place it comes from. Read from the project, never stored twice. */
export function offerAnswer(ctx: DocCtx, keys: string[], from: string): { value: string; words: string } | undefined {
  for (const k of keys) {
    const t = ctx.methodAnswers?.[k];
    if (t) return { value: t, words: `“${brief(t, 70)}” — as written in ${from}` };
  }
  return undefined;
}
