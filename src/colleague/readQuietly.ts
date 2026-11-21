/* A NEWER VERSION READ WITHOUT BEING ASKED (21 November 2026, docs/LUNA-AGENT.md G2b).
 *
 * Rowland, 21 November: "Luna linked to data … Luna knows everything … a live humanistic person like Iron Man's Jarvis."
 *
 * When Luna's look (colleague/keepUp) finds that a file she is linked to has changed, the newer version used to wait for the person to
 * press Read it. So she knew THAT it had changed and nothing of WHAT — and until somebody pressed, what she was told of the file each
 * turn (colleague/knows) was the old version's. Now she reads it herself: on this device, in the background worker every workbook is
 * read by, registered as the newer version of the same file (it keeps the name the person gave it, its line, its customer —
 * capabilities/data registerFile), the file kept for the person's other devices, and its first look worked in code — which leaves, on
 * the record, what it says now and WHAT CHANGED since the version before (capabilities/look workLook, lib/workbook/sinceLast).
 *
 * Nothing is put into any conversation: what changed is said above the conversation (colleague/KeepUpNews), told to Luna with every
 * question, and written into the conversation only when the person asks to be shown.
 *
 * What it keeps to: a workbook only (a document or a table is still the person's to read, as before); read whole or not at all (a
 * part-read is left to the person, who is told why); no AI; the version read before stays in the register exactly as it was read. */
import { registerFile } from '../capabilities/data';
import { workLook } from '../capabilities/look';
import type { FileOrigin } from '../lib/data/sources';
import { keepWorkbookFile } from '../lib/workbook/carry';
import { workbooks, workbookId } from '../lib/workbook/client';
import { liveEntries, readNotebooks } from './notebook';

/** What Luna reads by herself: a workbook. */
export const READ_QUIETLY = /\.(xlsx|xlsm)$/i;

export interface QuietRead { sourceId: string; name: string }

/** Read `file` — the newer version of the linked file `o.origin` is the address of — and keep it. Undefined when it is not hers to read
 *  quietly (not a workbook, or it could not be read whole); throws only what the reader throws. */
export async function readQuietly(file: File, o: { origin: FileOrigin; client?: string; lineId?: string; projectId?: string; now?: number }): Promise<QuietRead | undefined> {
  if (!READ_QUIETLY.test(file.name)) return undefined;
  const id = workbookId(file);
  const ctx = { now: o.now ?? Date.now() };
  const p = await workbooks().read(id, file.name, file);
  if (p.status !== 'ready') return undefined;
  const src = await registerFile(ctx, {
    origin: o.origin, ...(o.client ? { client: o.client } : {}), fileId: id, fileName: file.name, kind: 'workbook', bytes: file.size, status: p.status,
    sheets: p.sheets.filter(x => x.read).map(x => ({ name: x.name, rows: x.rows, columns: x.columns.map(cl => ({ name: cl.name, type: cl.type })) })),
    notRead: p.notRead.map(x => x.what), ...(o.lineId ? { lineId: o.lineId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}),
  });
  if (!src) return undefined;
  await keepWorkbookFile(src.id, id, file).catch(() => undefined);
  /* the look, read the way this customer's report was read before (what the person told her of it carries — capabilities/look), with
     what they have said the business is managed by leading; it is kept on the file's record: what it says, and what changed */
  const client = src.facts.client ?? '';
  const nb = await readNotebooks(client).catch(() => ({} as Awaited<ReturnType<typeof readNotebooks>>));
  const told = [...liveEntries(nb.client), ...liveEntries(nb.own)].flatMap(e => [e.term, e.means]);
  await workLook(ctx, { id, name: file.name }, p, { client, told }).catch(e => { console.warn('the newer version was read, but its look could not be worked', e); });
  return { sourceId: src.id, name: src.facts.name };
}
