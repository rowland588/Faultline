/* THE FIRST LOOK, KEPT AND USED AGAIN (13 November, docs/WORKBOOKS.md — the four things the Excel work was still missing).
 *   workLook            the first look worked (lib/workbook/firstLook) with what the customer's notebook says, and with the snapshots
 *                       of workbooks read before FOR THE SAME CUSTOMER — so the same report read again says what changed;
 *                       kept on the conversation (to make its pack, or read it again the same way) and its snapshot kept on the
 *                       file's record in the register (to be compared with next time, from any device);
 *   read_workbook_as    local   the person's word on how to read it — the sheet to start with, the row the headings are on, a
 *                       column's name, the column that is the result or the date — then the look again by that. Changes how the
 *                       workbook is understood on this device; never the file, never a record of the factory;
 *   workbook_pack       local   the look laid out as a report of the conversation (a PDF and slides from its card) — every chart from
 *                       a result asked of the rows; no AI asked.
 *   THE READING         (15 November, lib/workbook/reading) what the person has said about how to read a report — kept on the look and on
 *                       the file's record beside its snapshot, and used again when the same report is read for the same customer;
 *                       said every time it is applied, added to by read_workbook_as, put away by its `forget`.
 * One customer's snapshots and readings are never offered to another's workbook. */
import { patchStudy } from '../db';
import { uid } from '../lib/ids';
import type { ToolStudy } from '../lib/study';
import { workbooks } from '../lib/workbook/client';
import { firstLook, formLook, noLook, type FirstLook, type LookOptions } from '../lib/workbook/firstLook';
import { lookPack, type KeptLook } from '../lib/workbook/lookPack';
import type { LookSnap } from '../lib/workbook/sinceLast';
import { COLUMN_SAYS, fits, hasReading, heldTo, mergeReading, newestFirst, readingSaid, ruleFilters, dayOf, type ColumnSay, type KeptReading, type Reading, type RowRule } from '../lib/workbook/reading';
import type { WorkbookProfile } from '../lib/workbook/read';
import type { Query } from '../lib/workbook/query';
import type { SourceFacts } from '../lib/data/sources';
import { anyone } from './access';
import { checkObject, ID } from './check';
import { allSources, keepPack } from './data';
import { conversation } from './draftStore';
import { pick } from './workbook';
import type { CapCtx, CapResult, Capability } from './types';

type Kept = { snap?: LookSnap; client?: string; reading?: Reading };
const lc = (s: string) => s.trim().toLowerCase();
const looksOf = (s: Pick<ToolStudy, 'facts'>): KeptLook[] => { const l = (s.facts as { looks?: unknown }).looks; return Array.isArray(l) ? l as KeptLook[] : []; };

/** The snapshots of workbooks read before for this customer ('' = no customer said) — never another customer's. */
export async function earlierSnaps(client: string): Promise<LookSnap[]> {
  return (await allSources()).map(s => (s.facts as SourceFacts & { look?: Kept }).look).filter((k): k is Kept & { snap: LookSnap } => !!k?.snap && lc(k.client ?? '') === lc(client)).map(k => k.snap);
}

/** The readings kept for this customer ('' = no customer said), each with the snapshot of the file it sits on — never another customer's. */
export async function keptReadings(client: string): Promise<(KeptReading & { studyId: string })[]> {
  return (await allSources()).flatMap(s => { const k = (s.facts as SourceFacts & { look?: Kept }).look; return k?.snap && k.reading && lc(k.client ?? '') === lc(client) ? [{ reading: k.reading, snap: k.snap, client: k.client ?? '', studyId: s.id }] : []; });
}

/** THE READING TO READ THIS WORKBOOK BY, when nothing was said in this conversation: the newest one kept for this customer that is the
 *  same report — the sheet it led with here by name and, once the heading row it names is taken, four in five of its headings the
 *  same. Its heading rows and column names are then taken for real; a part that names a column this file lacks is left out and said. */
export async function carriedReading(client: string, w: { id: string }, p: WorkbookProfile): Promise<{ reading: Reading; p: WorkbookProfile; dropped: string[] } | undefined> {
  for (const k of newestFirst(await keptReadings(client))) {
    const heads = k.reading.heads ?? [], lead = heads.find(h => lc(h.sheet) === lc(k.snap.sheet));
    let tried = p;
    if (lead) { try { tried = (await workbooks().amend(w.id, { sheet: lead.sheet, ...(lead.row !== undefined ? { headerRow: lead.row } : {}), ...(lead.names?.length ? { names: lead.names } : {}), dry: true })).profile; } catch { continue; } }
    if (!fits(k, tried)) continue;
    let now = p;
    const dropped: string[] = [], took: Reading['heads'] = [];
    for (const h of heads) {
      try { now = (await workbooks().amend(w.id, { sheet: h.sheet, ...(h.row !== undefined ? { headerRow: h.row } : {}), ...(h.names?.length ? { names: h.names } : {}) })).profile; took.push(h); }
      catch { dropped.push(`the headings of “${h.sheet}”`); }
    }
    const { heads: _was, ...rest } = k.reading;
    const held = heldTo({ ...rest, ...(took.length ? { heads: took } : {}) }, now, k.snap.sheet);
    return { reading: { ...held.reading, from: k.reading.from ?? { name: k.snap.name, at: k.reading.at } }, p: now, dropped: [...dropped, ...held.dropped] };
  }
  return undefined;
}

/** The look worked and kept: on the conversation, and its snapshot — with the reading it was read by — on the file's record. Nothing
 *  when the workbook has no table to lead with. `asked` is what was said in this conversation; left out, the customer's own reading of
 *  the same report is looked for and used. */
export async function workLook(ctx: CapCtx, w: { id: string; name: string }, p0: WorkbookProfile, o: { client: string; told?: readonly string[]; asked?: Reading }): Promise<FirstLook | undefined> {
  const carried = o.asked === undefined ? await carriedReading(o.client, w, p0).catch(() => undefined) : undefined;
  const p = carried?.p ?? p0, first = o.asked ?? carried?.reading, dropped = carried?.dropped ?? [];
  const base: LookOptions = { ...(o.told ? { told: o.told } : {}), earlier: await earlierSnaps(o.client), now: ctx.now };
  const run = (q: Query) => workbooks().query(w.id, q);
  const tried = await firstLook(p, run, { ...base, ...(hasReading(first) ? { reading: first } : {}), ...(dropped.length ? { dropped } : {}) });
  /* a reading that leaves this file with no table to lead with is not followed — and that is said */
  const fell = !tried && hasReading(first);
  const look = tried ?? (fell ? await firstLook(p, run, { ...base, dropped: ['what you told me — it leaves no table to lead with in this file'] }) : undefined);
  const reading = fell ? undefined : first;
  if (!look) return undefined;
  const filters = [...(look.basis?.applied ? look.basis.filters : []), ...ruleFilters(hasReading(reading) ? reading : undefined)];
  const kept: KeptLook = { workbookId: w.id, name: p.name, at: ctx.now, sheet: look.roles.sheet, headline: look.roles.headline as KeptLook['headline'], ...(look.roles.date ? { date: look.roles.date } : {}), dims: look.splitDims, parts: look.parts, total: look.snap.total, rows: look.snap.rows, ...(look.months.length ? { period: look.months.length === 1 ? look.months[0].label : `${look.months[0].label} to ${look.months[look.months.length - 1].label}` } : {}), ...(hasReading(reading) ? { asked: reading } : {}), ...(filters.length ? { basis: filters } : {}), ...(look.week ? { weekly: true } : {}) };
  const c = await conversation(ctx);
  if (c.ok) await patchStudy(c.s.id, s => ({ facts: { ...s.facts, looks: [...looksOf(s).filter(x => x.workbookId !== w.id), kept].slice(-6) } as ToolStudy['facts'] }));
  const src = (await allSources()).find(s => s.facts.fileId === w.id);
  if (src) await patchStudy(src.id, s => ({ facts: { ...s.facts, source: { ...(s.facts as unknown as { source: SourceFacts }).source, look: { snap: look.snap, client: o.client, ...(hasReading(reading) ? { reading } : {}) } } } as unknown as ToolStudy['facts'] }));
  return look;
}

/** The person's word to forget: every reading of this customer's that fits this workbook is marked forgotten — kept, never applied again. */
async function forgetReadings(client: string, p: WorkbookProfile, now: number): Promise<number> {
  let n = 0;
  for (const k of await keptReadings(client)) {
    if (k.reading.forgotten || !(k.snap.fileId === p.id || fits(k, p))) continue;
    await patchStudy(k.studyId, s => { const src = (s.facts as unknown as { source: SourceFacts & { look?: Kept } }).source; return { facts: { ...s.facts, source: { ...src, look: { ...src.look, reading: { ...(src.look?.reading as Reading), forgotten: now } } } } as unknown as ToolStudy['facts'] }; });
    n += 1;
  }
  return n;
}

/** The look kept on this conversation for a workbook — the one named, else the newest. */
export async function keptLook(ctx: CapCtx, workbookId?: string): Promise<KeptLook | undefined> {
  const c = await conversation(ctx);
  if (!c.ok) return undefined;
  const all = looksOf(c.s);
  return workbookId ? all.find(x => x.workbookId === workbookId) : [...all].sort((a, b) => b.at - a.at)[0];
}

/** The pack of a kept look, made and kept on the conversation. */
export async function makePack(ctx: CapCtx, workbookId?: string): Promise<CapResult> {
  const k = await keptLook(ctx, workbookId);
  if (!k) return { ok: false, why: 'No first look has been worked in this conversation — a workbook is attached (.xlsx) with the + button, and its first look is what a pack is made from.' };
  try {
    const pack = await lookPack(k, q => workbooks().query(k.workbookId, q), { kind: 'workbook', id: k.workbookId, name: k.name, sheet: k.sheet }, { id: pre => `${pre}${uid().slice(0, 6)}`, now: ctx.now });
    const w = await keepPack(ctx, pack);
    if (!w.ok) return w;
    const r = pack.report;
    const ref = { kind: 'convreport' as const, id: `${r.id}@${r.version}`, label: r.title, href: '' };
    return { ok: true, says: `Made the pack “${r.title}” [report ${r.id}] from the first look of “${k.name}”: ${r.sections.length} sections — ${r.sections.map(s => s.heading).join('; ')} — with ${pack.charts.length} chart${pack.charts.length === 1 ? '' : 's'}, each drawn from a result asked of “${k.sheet}”. The person downloads it as a PDF or as slides from its card; it can be added to with build_report.`, refs: [ref], show: ref, data: { reportId: r.id, version: r.version, charts: pack.charts.length } };
  } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
}

const clientOf = async (ctx: CapCtx): Promise<string> => {
  const c = await conversation(ctx);
  const [{ getWorkspace }, { activeClientNow }, { currentThread, factsOfConversation }] = await Promise.all([import('../db'), import('../lib/activeClient'), import('../colleague/conversation')]);
  const lineId = c.ok ? currentThread(factsOfConversation(c.s).threads ?? [])?.scope.lineId : undefined;
  const line = lineId ? await getWorkspace(lineId) : undefined;
  return line?.clientName?.trim() ?? (await activeClientNow()).client;
};

const RULE = { kind: 'object' as const, label: 'rows by what one column holds', fields: { column: { kind: 'string' as const, label: 'the column', max: 120, required: true }, is: { kind: 'string' as const, label: 'the value', max: 120, required: true } } };
export const readWorkbookAs: Capability = {
  name: 'read_workbook_as', title: 'Read the workbook the way they say', kind: 'local',
  validate: raw => checkObject(raw, {
    workbookId: ID('the workbook'), sheet: { kind: 'string', label: 'the sheet to start with', max: 120 },
    headerRow: { kind: 'int', label: 'the row the headings are on', min: 1, max: 1_048_576 },
    rename: { kind: 'record', label: 'columns to call by another name (letter or heading → name)' },
    result: { kind: 'string', label: 'the column that is the result', max: 120 }, date: { kind: 'string', label: 'the column that dates each row', max: 120 },
    everyRow: { kind: 'bool', label: 'read every row, the ones the reports leave out included' },
    columns: { kind: 'record', label: `what a column is (heading → ${COLUMN_SAYS.join(' | ')})` },
    ignore: { kind: 'strings', label: 'columns that are neither a figure nor something to split by', max: 12 },
    leaveOut: { ...RULE, label: 'rows to leave out, by what one column holds' }, only: { ...RULE, label: 'the only rows to read, by what one column holds' },
    told: { kind: 'bool', label: 'say what has been told about this workbook' }, forget: { kind: 'bool', label: 'forget what was told and read it unaided' },
  }),
  allowed: anyone,
  async run(ctx, input: { workbookId?: string; sheet?: string; headerRow?: number; rename?: Record<string, unknown>; result?: string; date?: string; everyRow?: boolean; columns?: Record<string, unknown>; ignore?: string[]; leaveOut?: { column: string; is: string }; only?: { column: string; is: string }; told?: boolean; forget?: boolean }): Promise<CapResult> {
    const k = await pick(ctx, input.workbookId);
    if (!k.ok) return { ok: false, why: k.why };
    const before = await keptLook(ctx, k.w.id);
    const client = await clientOf(ctx);
    const said: string[] = [];
    try {
      /* what stands so far: said in this conversation, else carried from this customer's earlier reading of the same report */
      const c = before ? undefined : await carriedReading(client, k.w, k.p).catch(() => undefined);
      const was: Reading | undefined = before?.asked ?? c?.reading;
      const p1 = c?.p ?? k.p;
      const [{ readNotebooks, liveEntries }] = await Promise.all([import('../colleague/notebook')]);
      const nb = await readNotebooks(client).catch(() => ({} as Awaited<ReturnType<typeof readNotebooks>>));
      const told = [...liveEntries(nb.client), ...liveEntries(nb.own)].flatMap(e => [e.term, e.means]);
      /* WHAT HAVE I TOLD YOU — the reading in words; nothing is read again */
      if (input.told) {
        const all = hasReading(was) ? readingSaid(was) : [];
        return { ok: true, refs: [], says: all.length ? `About “${p1.name}” you have told me${was?.from ? ` (first on ${dayOf(was.from.at)}, about “${was.from.name}”)` : ''}: ${all.join('; ')}. It is kept for this customer’s report and used each time the same report is read. Say “forget what I told you” to have it read as I would by myself.` : `You have told me nothing about how to read “${p1.name}” — it is read as I find it. Say which sheet to start with, which column is the result, what a column is (“Score is a rate”) or which rows to leave out, and I will keep it for this report.` };
      }
      /* FORGET — every reading of this customer's that fits is put away (kept, never applied), and the workbook read unaided */
      if (input.forget) {
        const n = await forgetReadings(client, p1, ctx.now);
        const heads = (was?.heads ?? []).filter(h => h.row !== undefined || h.names?.length);
        const look = await workLook(ctx, k.w, p1, { client, told, asked: { at: ctx.now } });
        const lead = `${hasReading(was) || n ? 'Forgotten — what you told me about this report is put away and will not be used again.' : 'There was nothing I had been told about this report.'}${heads.length ? ` The headings I took at your word (${heads.map(h => `“${h.sheet}”`).join(', ')}) stay as they are in this copy — attach the workbook again to have it read from the top.` : ''} This is how I read it by myself:`;
        if (!look) return { ok: true, refs: [], says: `${lead}\n\n${(await formLook(p1, q => workbooks().query(k.w.id, q))) ?? noLook(p1)}` };
        return { ok: true, refs: [], says: [lead, ...look.says].join('\n\n'), data: { look: true, sheet: look.roles.sheet, headline: look.roles.headline?.column, suggestions: look.suggestions } };
      }
      const sheet = input.sheet ?? was?.sheet ?? before?.sheet;
      const names = Object.entries(input.rename ?? {}).filter(([, v]) => typeof v === 'string' && v.trim()).map(([column, name]) => ({ column, name: String(name) }));
      const now: Partial<Reading> = {};
      const amending = input.headerRow !== undefined || names.length > 0;
      if (amending && !sheet) return { ok: false, why: `Say which sheet — the sheets are ${p1.sheets.map(s => `“${s.name}”`).join(', ')}.` };
      const amended = amending ? await workbooks().amend(k.w.id, { sheet: sheet as string, ...(input.headerRow !== undefined ? { headerRow: input.headerRow } : {}), ...(names.length ? { names } : {}) }) : undefined;
      const p = amended?.profile ?? p1;
      if (amended && sheet) {
        said.push(...amended.said);
        now.heads = [{ sheet: (p.sheets.find(s => lc(s.name) === lc(sheet)) ?? { name: sheet }).name, ...(input.headerRow !== undefined ? { row: input.headerRow } : {}), ...(names.length ? { names } : {}) }];
      }
      if (input.sheet && !p.sheets.some(s => lc(s.name) === lc(input.sheet as string))) return { ok: false, why: `No sheet “${input.sheet}” — the sheets are ${p.sheets.map(s => `“${s.name}”`).join(', ')}.` };
      /* every column named must be a column of the sheet — by its heading or its letter; anything else is refused in words (and, said
         in passing in a sentence that was not about the workbook, is left to Luna) */
      const on = p.sheets.find(x => lc(x.name) === lc(sheet ?? '')) ?? (await import('../lib/workbook/firstLook')).tablesOf(p).map(t => p.sheets.find(x => x.name === t.sheet)).find(Boolean);
      const cols = () => (on?.columns ?? []).filter(c => !c.colour).slice(0, 30).map(c => `“${c.name}” (${c.letter})`).join(', ');
      const col = (name: string) => on?.columns.find(c => c.name === name) ?? on?.columns.find(c => lc(c.name) === lc(name)) ?? on?.columns.find(c => c.letter === name.trim().toUpperCase() || lc(`column ${c.letter}`) === lc(name));
      const need = (name: string, as: string) => (!on ? `Say which sheet “${name}” is on — the sheets are ${p.sheets.map(x => `“${x.name}”`).join(', ')}.` : col(name) ? undefined : `“${name}” is not a column of “${on.name}” to ${as} — its columns are ${cols()}.`);
      for (const [what, name] of [['take as the result', input.result], ['take as the date', input.date]] as const) {
        if (!name) continue;
        const no = need(name, what);
        if (no) return { ok: false, why: no };
      }
      if (input.result) now.result = (col(input.result) as { name: string }).name;
      if (input.date) now.date = (col(input.date) as { name: string }).name;
      const kinds: Record<string, ColumnSay> = {};
      for (const [name, v] of Object.entries(input.columns ?? {})) {
        const say = String(v).trim().toLowerCase() as ColumnSay;
        if (!COLUMN_SAYS.includes(say)) return { ok: false, why: `A column is said to be one of: ${COLUMN_SAYS.join(', ')} — “${String(v)}” is not one.` };
        const no = need(name, 'say what it is');
        if (no) return { ok: false, why: no };
        const c = col(name) as NonNullable<ReturnType<typeof col>>;
        if (c.counts.number < 1) return { ok: false, why: `“${c.name}” on “${on?.name}” holds no numbers, so it cannot be ${say === 'average' ? 'averaged' : say === 'never' ? 'a figure at all' : 'added up'} — it is something to split by.` };
        kinds[c.name] = say;
      }
      if (Object.keys(kinds).length) now.columns = kinds;
      for (const name of input.ignore ?? []) { const no = need(name, 'ignore'); if (no) return { ok: false, why: no }; }
      if (input.ignore?.length) now.ignore = input.ignore.map(n => (col(n) as { name: string }).name);
      const rows: RowRule[] = [];
      for (const [rule, op] of [[input.leaveOut, 'ne'], [input.only, 'eq']] as const) {
        if (!rule) continue;
        const no = need(rule.column, op === 'ne' ? 'leave rows out by' : 'read only some rows by');
        if (no) return { ok: false, why: no };
        const c = col(rule.column) as NonNullable<ReturnType<typeof col>>;
        /* the value must be one the column holds, and the rule must leave rows to read */
        const [hit, all] = await Promise.all([workbooks().query(k.w.id, { sheet: (on as { name: string }).name, filters: [{ column: c.name, op: 'eq', value: rule.is }], measures: [{ op: 'count' }] }), workbooks().query(k.w.id, { sheet: (on as { name: string }).name, measures: [{ op: 'count' }] })]);
        if (!hit.rowsMatched) return { ok: false, why: `No row of “${on?.name}” has “${rule.is}” under “${c.name}”${c.top?.length ? ` — it holds ${c.top.slice(0, 8).map(([t]) => `“${t}”`).join(', ')}${(c.distinct ?? 0) > 8 ? ' and more' : ''}` : ''}.` };
        if (op === 'ne' && hit.rowsMatched >= all.rowsMatched) return { ok: false, why: `Every row of “${on?.name}” has “${rule.is}” under “${c.name}” — leaving them out would leave nothing to read.` };
        rows.push({ column: c.name, op, value: rule.is });
      }
      if (rows.length) now.rows = rows;
      if (input.sheet || ((input.headerRow !== undefined || names.length) && sheet)) now.sheet = (p.sheets.find(s => lc(s.name) === lc(sheet as string)) as { name: string }).name;
      if (input.everyRow !== undefined) now.everyRow = input.everyRow;
      const asked = mergeReading(was, now, ctx.now);
      const look = await workLook(ctx, k.w, p, { client, told, asked });
      if (!look) {
        const s = sheet ? p.sheets.find(x => lc(x.name) === lc(sheet)) : undefined;
        const list = s ? s.columns.filter(c => !c.colour).slice(0, 14).map(c => `${c.letter} “${c.name}” (${c.type})`).join(', ') : '';
        return { ok: true, refs: [], says: `${said.join(' ')}${said.length ? ' ' : ''}${s ? `On “${s.name}” I still find no column of numbers under a heading to take as the figure. Its headings are read from row ${s.headerRow || '— none found'}; its columns: ${list}. Say the row the headings are on, or name the column that is the result by its letter.` : (await formLook(p, q => workbooks().query(k.w.id, q)).catch(() => undefined)) ?? noLook(p)}`.trim(), data: { look: false } };
      }
      return { ok: true, refs: [], says: [...said, ...look.says].join('\n\n'), data: { look: true, sheet: look.roles.sheet, headline: look.roles.headline?.column, suggestions: look.suggestions } };
    } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
  },
};

export const workbookPack: Capability = {
  name: 'workbook_pack', title: 'Make the pack from the first look', kind: 'local',
  validate: raw => checkObject(raw, { workbookId: ID('the workbook') }),
  allowed: anyone,
  run: (ctx, input: { workbookId?: string }) => makePack(ctx, input.workbookId),
};

export const LOOK: readonly Capability[] = [readWorkbookAs, workbookPack];
