/* A WORKBOOK ATTACHED TO A CONVERSATION (docs/WORKBOOKS.md) — read on this device in a background worker (never uploaded, never sent to
 * the model), noted on the conversation, put in the register with where it came from, the file kept for the person's other devices,
 * and acknowledged once in chat. The analysis remains available on request.
 *
 * One place for it (20 November, docs/CONNECTED-LUNA.md X4): AI Mode's attach control and Connect to Microsoft (screens/AiModeScreen)
 * and the workbook exam (colleague/exam/workbook) both read a file through here, so the exam attaches a workbook exactly as a person
 * does — the same reader, the same register, the same first look. */
import { patchStudy } from '../db';
import { workbookReceipt } from './workbookReceipt';
import { uid } from '../lib/ids';
import { noteWorkbook } from '../capabilities/workbook';
import { workbooks, workbookId, type Progress } from '../lib/workbook/client';
import type { CapCtx, ColleagueWorkbook } from '../capabilities/types';
import { registerFile } from '../capabilities/data';
import { keepWorkbookFile } from '../lib/workbook/carry';
import { liveEntries, readNotebooks } from './notebook';
import { getWorkspace } from '../db/workspaces';
import { activeClientNow } from '../lib/activeClient';
import { WHO, appendAction, appendTurn } from './conversation';
import type { FileOrigin } from '../lib/data/sources';
import type { WorkbookProfile } from '../lib/workbook/read';
import { readXlsx } from '../lib/xlsxRead';
import { csvRows, downtimeTable } from '../capabilities/intel/pareto';
import { keepImport } from '../capabilities/intel/caps';

export interface Attached { id: string; name: string; status: ColleagueWorkbook['status']; said: string; sourceId?: string }
type Opts = { origin?: FileOrigin; lineId?: string; projectId?: string; /** The customer it is for, when the person was asked. */ client?: string; onProgress?: (p: Progress) => void };
/** A workbook read into the conversation, its first look not said yet. */
interface Read extends Attached { p: WorkbookProfile; lineId?: string; client?: string; localOnly: boolean }

/** Read `file` into conversation `c.conversationId` and acknowledge the file when ready. Throws if the workbook cannot be read. */
export async function attachWorkbook(c: CapCtx & { conversationId: string }, file: File, o: Opts = {}): Promise<Attached> {
  const r = await readInto(c, file, o);
  await prepareLook(c, r);
  await sayReceipt(c.conversationId, [r]);
  return strip(r);
}

/** SEVERAL WORKBOOKS AT ONCE (20 November, docs/CONNECTED-LUNA.md — a manager has a file a month): every one read first, then their
 *  analyses prepared in the order of their OWN dates (the earliest date on each one's largest sheet; the name when none is dated) —
 *  so each can be compared with the one before (lib/workbook/sinceLast), like with like. One that cannot be read is said and
 *  the rest go on. `onFile` says which is being read. */
export async function attachWorkbooks(c: CapCtx & { conversationId: string }, files: readonly (File | { file: File; origin?: FileOrigin })[], o: Opts & { onFile?: (i: number, of: number, name: string) => void } = {}): Promise<{ read: Attached[]; failed: { name: string; why: string }[] }> {
  const read: Read[] = [], failed: { name: string; why: string }[] = [];
  /* each with where it came from when it came from SharePoint or OneDrive (Connect to Microsoft's ticks) */
  const given = files.map(x => (x instanceof File ? { file: x } : x));
  for (const [i, { file: f, origin }] of given.entries()) {
    o.onFile?.(i, given.length, f.name);
    try { read.push(await readInto(c, f, { ...o, ...(origin ? { origin } : {}) })); } catch (e) { failed.push({ name: f.name, why: e instanceof Error ? e.message : String(e) }); }
  }
  const ordered = inDateOrder(read);
  for (const r of ordered) await prepareLook(c, r);
  await sayReceipt(c.conversationId, ordered, failed);
  return { read: ordered.map(strip), failed };
}

export async function sayReceipt(conversationId: string, files: Parameters<typeof workbookReceipt>[0], failed?: Parameters<typeof workbookReceipt>[1]): Promise<void> {
  await appendTurn(patchStudy, conversationId, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: workbookReceipt(files, failed), byCode: true, workbookReceipt: true });
}

const strip = (r: Read): Attached => ({ id: r.id, name: r.name, status: r.status, said: r.said, ...(r.sourceId ? { sourceId: r.sourceId } : {}) });
/** The earliest date a workbook's largest sheet holds — what it is "of". */
export function earliestOf(p: WorkbookProfile): number | undefined {
  const lead = [...p.sheets].filter(x => x.read).sort((a, b) => b.rows - a.rows)[0];
  const ds = (lead?.columns ?? []).filter(cl => cl.type === 'date' && typeof cl.min === 'number').map(cl => cl.min as number);
  return ds.length ? Math.min(...ds) : undefined;
}
/** Oldest first by their own dates; those with none after, by name. */
export function inDateOrder<T extends { name: string; p: WorkbookProfile }>(rs: readonly T[]): T[] {
  return [...rs].sort((a, b) => {
    const da = earliestOf(a.p), db = earliestOf(b.p);
    if (da !== undefined && db !== undefined && da !== db) return da - db;
    if (da !== undefined && db === undefined) return -1;
    if (da === undefined && db !== undefined) return 1;
    return a.name.localeCompare(b.name, 'en-GB', { numeric: true });
  });
}

/** Read on the device, noted, registered, kept for the other devices and its reading said as a step — the first look comes after. */
async function readInto(c: CapCtx & { conversationId: string }, file: File, o: Opts): Promise<Read> {
  const id = workbookId(file);
  const cid = c.conversationId;
  const base: ColleagueWorkbook = { id, name: file.name, bytes: file.size, at: Date.now(), status: 'reading' };
  await noteWorkbook(c, base);
  try {
    const p = await workbooks().read(id, file.name, file, prog => o.onProgress?.(prog));
    const sheets = p.sheets.map(x => ({ name: x.name, state: x.state, rows: x.rows, columns: x.columns.length }));
    /* the receipt: every sheet when there are a few; a workbook of thirty names its largest and counts the rest (12 November — the
       receipt of a 30-sheet workbook filled the screen and said nothing) */
    const big = [...sheets].sort((a, b) => b.rows - a.rows).slice(0, 3);
    const held = sheets.length <= 4 ? sheets.map(x => `${x.name} ${x.rows.toLocaleString('en-GB')} rows`).join(', ') : `${sheets.length} sheets — the largest ${big.map(x => `${x.name} ${x.rows.toLocaleString('en-GB')} rows`).join(', ')}, and ${sheets.length - big.length} more`;
    /* THE FILE KEPT FOR THE PERSON'S OTHER DEVICES (16 November — Rowland: "upload on laptop must be viable to phone user and other
       way round"): with its record in the register, by the rules every photo and document travels by (lib/workbook/carry) */
    const whereSaid = (kept: 'kept' | 'too-big' | undefined): string => kept === 'kept' ? 'It is kept for your other devices too — ask about it here or on your phone.'
      : kept === 'too-big' ? `At ${(file.size / 1e6).toFixed(0)} MB it is over the cloud's 50 MB, so it stays on this device; ask about it here.`
      : 'It stays on this device; ask about it.';
    const readSaid = `Read “${file.name}” on this device in ${p.seconds.toLocaleString('en-GB')} s: ${held}${p.status === 'partial' ? ' — only PART of it was read' : ''}.`;
    await noteWorkbook(c, { ...base, status: p.status, sheets, seconds: p.seconds, ...(p.status === 'partial' ? { why: p.sheets.filter(x => x.why).map(x => `${x.name}: ${x.why}`).join(' ') } : {}) });
    /* THE REGISTER (docs/CONVERSATIONAL-DATA.md): the file kept as a record of its own — its identity, its original name, what it holds —
       so it can be named, described and asked for by name in any later conversation; its cells stay on this device */
    const src = await registerFile(c, { ...(o.origin ? { origin: o.origin } : {}), ...(o.client ? { client: o.client } : {}), fileId: id, fileName: file.name, kind: 'workbook', bytes: file.size, status: p.status, sheets: p.sheets.filter(x => x.read).map(x => ({ name: x.name, rows: x.rows, columns: x.columns.map(cl => ({ name: cl.name, type: cl.type })) })), notRead: p.notRead.map(x => x.what), ...(o.lineId ? { lineId: o.lineId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}) });
    const kept = src ? await keepWorkbookFile(src.id, id, file).catch(() => undefined) : undefined;
    const said = `${readSaid} ${whereSaid(kept)}`;
    const named = src ? ` It is in the register as “${src.facts.name}” — name it as you like.` : '';
    await appendAction(patchStudy, cid, { callId: uid(), name: 'workbook_read', title: 'Read a workbook', status: 'done', says: said + named, refs: [], at: Date.now() });
    return { id, name: file.name, status: p.status, said: said + named, p, localOnly: kept !== 'kept', client: o.client, ...(src ? { sourceId: src.id } : {}), ...(o.lineId ? { lineId: o.lineId } : {}) };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    await noteWorkbook(c, { ...base, status: 'failed', why });
    throw e instanceof Error ? e : new Error(why);
  }
}

/** Keep the analysis available for questions, comparisons and report packs. The chat receives one receipt. */
let lookAt = 0;
async function prepareLook(c: CapCtx & { conversationId: string }, r: Read): Promise<void> {
  try {
    const { workLook } = await import('../capabilities/look');
    const line = r.lineId ? await getWorkspace(r.lineId) : undefined;
    const client = r.client || line?.clientName?.trim() || (await activeClientNow()).client;
    const nb = await readNotebooks(client).catch(() => ({} as Awaited<ReturnType<typeof readNotebooks>>));
    const told = [...liveEntries(nb.client), ...liveEntries(nb.own)].flatMap(e => [e.term, e.means]);
    lookAt = Math.max(Date.now(), lookAt + 1);
    await workLook({ ...c, now: lookAt }, { id: r.id, name: r.name }, r.p, { client, told });
  } catch (e) { console.warn('Workbook analysis could not be prepared', e); }
}

/** A DOWNTIME FILE (10 November, docs/AI-TOOL-INTELLIGENCE.md): a CSV or Excel sheet with a reason column and minutes or counts is read
 *  here, in code, and kept on the conversation as IMPORTED evidence — never written into the line's timed stops, never sent to a model
 *  to read. The conversation is made (`conversation()`) only when the file is such a table. `took: false` — not a downtime table. */
export async function importDowntime(ctx: Omit<CapCtx, 'conversationId'>, conversation: () => Promise<string>, file: File, o: { lineId?: string; client?: string } = {}): Promise<{ took: false } | { took: true; ok: boolean; says: string }> {
  if (!/\.(csv|xlsx|xls|tsv|txt)$/i.test(file.name)) return { took: false };
  const sheets = /\.xlsx?$/i.test(file.name) ? readXlsx(await file.arrayBuffer()).map(x => x.rows) : [csvRows(await file.text())];
  const table = sheets.map(rows => downtimeTable(rows)).find(t => t && t.rows.length);
  if (!table) return { took: false };
  const cid = await conversation();
  const c = { ...ctx, conversationId: cid };
  const k = await keepImport(c, { name: file.name, ...(o.lineId ? { lineId: o.lineId } : {}), ...table });
  if (!k.ok) return { took: true, ok: false, says: k.why };
  /* ONE IDENTITY A FILE: an Excel file is in the register as its workbook (attachWorkbook); only a CSV or text table is registered here */
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) await registerFile(c, { ...(o.client ? { client: o.client } : {}), fileId: k.id, fileName: file.name, kind: 'table', bytes: file.size, status: 'ready', sheets: [{ name: file.name, rows: table.rows.length, columns: [{ name: 'reason', type: 'text' }, { name: 'minutes', type: 'number' }, { name: 'events', type: 'number' }, { name: 'line', type: 'text' }, { name: 'date', type: 'date' }] }], ...(o.lineId ? { lineId: o.lineId } : {}) });
  await appendAction(patchStudy, cid, { callId: uid(), name: 'import_table', title: 'Read a downtime file', status: 'done', says: k.says, refs: [], at: Date.now() });
  return { took: true, ok: true, says: k.says };
}
