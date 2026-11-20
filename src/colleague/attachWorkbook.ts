/* A WORKBOOK ATTACHED TO A CONVERSATION (docs/WORKBOOKS.md) — read on this device in a background worker (never uploaded, never sent to
 * the model), noted on the conversation, put in the register with where it came from, the file kept for the person's other devices,
 * and its FIRST LOOK said as Luna's turn, worked in code (lib/workbook/firstLook) — no AI asked.
 *
 * One place for it (20 November, docs/CONNECTED-LUNA.md X4): AI Mode's attach control and Connect to Microsoft (screens/AiModeScreen)
 * and the workbook exam (colleague/exam/workbook) both read a file through here, so the exam attaches a workbook exactly as a person
 * does — the same reader, the same register, the same first look. */
import { patchStudy } from '../db';
import { uid } from '../lib/ids';
import { noteWorkbook } from '../capabilities/workbook';
import { workbooks, workbookId, type Progress } from '../lib/workbook/client';
import type { CapCtx, ColleagueWorkbook } from '../capabilities/types';
import { registerFile } from '../capabilities/data';
import { keepWorkbookFile } from '../lib/workbook/carry';
import { liveEntries, readNotebooks } from './notebook';
import { getWorkspace } from '../db/workspaces';
import { activeClientNow } from '../lib/activeClient';
import { WHO, appendAction, appendTurn, type ColleagueTurn } from './conversation';
import type { MsOrigin } from '../lib/microsoft/graph';
import { readXlsx } from '../lib/xlsxRead';
import { csvRows, downtimeTable } from '../capabilities/intel/pareto';
import { keepImport } from '../capabilities/intel/caps';

export interface Attached { id: string; name: string; status: ColleagueWorkbook['status']; said: string; sourceId?: string }

/** Read `file` into conversation `c.conversationId` and say its first look. Throws (after noting the workbook failed) when it cannot be
 *  read; a first look that cannot be worked is said in a sentence, never silence. */
export async function attachWorkbook(c: CapCtx & { conversationId: string }, file: File, o: { origin?: MsOrigin; lineId?: string; projectId?: string; onProgress?: (p: Progress) => void } = {}): Promise<Attached> {
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
    const src = await registerFile(c, { ...(o.origin ? { origin: o.origin } : {}), fileId: id, fileName: file.name, kind: 'workbook', bytes: file.size, status: p.status, sheets: p.sheets.filter(x => x.read).map(x => ({ name: x.name, rows: x.rows, columns: x.columns.map(cl => ({ name: cl.name, type: cl.type })) })), notRead: p.notRead.map(x => x.what), ...(o.lineId ? { lineId: o.lineId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}) });
    const kept = src ? await keepWorkbookFile(src.id, id, file).catch(() => undefined) : undefined;
    const said = `${readSaid} ${whereSaid(kept)}`;
    const named = src ? ` It is in the register as “${src.facts.name}” — name it as you like.` : '';
    await appendAction(patchStudy, cid, { callId: uid(), name: 'workbook_read', title: 'Read a workbook', status: 'done', says: said + named, refs: [], at: Date.now() });
    /* THE FIRST LOOK (12 November, lib/workbook/firstLook): what the workbook holds, worked in code the moment it is read — the table
       worth analysing, the months, what stands out, what moved, the gaps — as Luna's turn, marked as done in the app; no AI asked.
       NEVER SILENCE (12 November — a 137 MB workbook was read and Luna said nothing): a workbook with no table she can lead with, or
       a look that fails, is said in a sentence with its biggest sheets and the question of where to start. What the person has
       already said the business is managed by (the notebook of meanings, the client in hand's and their own) leads. */
    const sayInCode = (text: string, suggestions: string[] = []) => appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text, byCode: true, ...(suggestions.length ? { suggestions } : {}) } as ColleagueTurn);
    const [{ noLook, formLook }, { workLook }, { PACK_OFFER }, { startWith }] = await Promise.all([import('../lib/workbook/firstLook'), import('../capabilities/look'), import('../lib/workbook/lookPack'), import('./lookAsk')]);
    /* no table found: the biggest sheets are offered as where to start, each answered in code (colleague/lookAsk) */
    const starts = [...p.sheets].filter(x => x.read && x.rows > 0).sort((a, b) => b.rows - a.rows).slice(0, 3).map(x => startWith(x.name));
    try {
      const line = o.lineId ? await getWorkspace(o.lineId) : undefined;
      const client = line?.clientName?.trim() ?? (await activeClientNow()).client;
      const nb = await readNotebooks(client).catch(() => ({} as Awaited<ReturnType<typeof readNotebooks>>));
      const told = [...liveEntries(nb.client), ...liveEntries(nb.own)].flatMap(e => [e.term, e.means]);
      /* worked with this customer's earlier readings of the same report (what changed), and kept — on the conversation for its
         pack, its snapshot on the file's record for next time (capabilities/look) */
      const look = await workLook(c, { id, name: file.name }, p, { client, told });
      /* no table, but a form (labels and their answers): it is said answer by answer */
      const form = look ? undefined : await formLook(p, q => workbooks().query(id, q)).catch(() => undefined);
      await (look ? sayInCode(look.says.join('\n\n'), [PACK_OFFER, ...look.suggestions]) : form ? sayInCode(form) : sayInCode(noLook(p), starts));
    } catch (e) {
      console.warn('the first look could not be worked', e);
      await sayInCode(noLook(p, e instanceof Error ? e.message : String(e)), starts).catch(() => undefined);
    }
    return { id, name: file.name, status: p.status, said: said + named, ...(src ? { sourceId: src.id } : {}) };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    await noteWorkbook(c, { ...base, status: 'failed', why });
    throw e instanceof Error ? e : new Error(why);
  }
}


/** A DOWNTIME FILE (10 November, docs/AI-TOOL-INTELLIGENCE.md): a CSV or Excel sheet with a reason column and minutes or counts is read
 *  here, in code, and kept on the conversation as IMPORTED evidence — never written into the line's timed stops, never sent to a model
 *  to read. The conversation is made (`conversation()`) only when the file is such a table. `took: false` — not a downtime table. */
export async function importDowntime(ctx: Omit<CapCtx, 'conversationId'>, conversation: () => Promise<string>, file: File, o: { lineId?: string } = {}): Promise<{ took: false } | { took: true; ok: boolean; says: string }> {
  if (!/\.(csv|xlsx|xls|tsv|txt)$/i.test(file.name)) return { took: false };
  const sheets = /\.xlsx?$/i.test(file.name) ? readXlsx(await file.arrayBuffer()).map(x => x.rows) : [csvRows(await file.text())];
  const table = sheets.map(rows => downtimeTable(rows)).find(t => t && t.rows.length);
  if (!table) return { took: false };
  const cid = await conversation();
  const c = { ...ctx, conversationId: cid };
  const k = await keepImport(c, { name: file.name, ...(o.lineId ? { lineId: o.lineId } : {}), ...table });
  if (!k.ok) return { took: true, ok: false, says: k.why };
  /* ONE IDENTITY A FILE: an Excel file is in the register as its workbook (attachWorkbook); only a CSV or text table is registered here */
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) await registerFile(c, { fileId: k.id, fileName: file.name, kind: 'table', bytes: file.size, status: 'ready', sheets: [{ name: file.name, rows: table.rows.length, columns: [{ name: 'reason', type: 'text' }, { name: 'minutes', type: 'number' }, { name: 'events', type: 'number' }, { name: 'line', type: 'text' }, { name: 'date', type: 'date' }] }], ...(o.lineId ? { lineId: o.lineId } : {}) });
  await appendAction(patchStudy, cid, { callId: uid(), name: 'import_table', title: 'Read a downtime file', status: 'done', says: k.says, refs: [], at: Date.now() });
  return { took: true, ok: true, says: k.says };
}
