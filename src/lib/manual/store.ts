/* A MACHINE'S DOCUMENT, KEPT (13 November, docs/ASSET-DOCUMENTS.md). No new kind of record: it is a SOURCE in the sources register
 * (lib/data/sources — tool 'source', kind 'document') on its line, naming its machine, with three things on it:
 *   facts.source     what the register holds of every file — its name, the file's own name, its size, when it came in, its machine
 *   facts.manual     what it is (manual · drawing · specification · certificate) and its words page by page, read in code (./pages)
 *   facts.docPhotos  the file itself (field 'source-file'), as a factory source keeps its file — synced as every record's media is
 * Read once when it comes in; never read again. Nothing here uses AI. */
import { getStudy, getWorkspace, listAllStudies, putStudy } from '../../db';
import { putBlob } from '../../db/blobs';
import type { ToolStudy } from '../study';
import type { SourceFacts } from '../data/sources';
import { uid } from '../ids';
import { machineKey } from '../lineRecords';
import { pdfPageTexts } from './pages';
import { findPassages, pmTasksOf } from './manual';

export const DOC_KINDS = ['manual', 'drawing', 'specification', 'certificate', 'other'] as const;
export type DocKind = typeof DOC_KINDS[number];
export const DOC_KIND_WORD: Record<DocKind, string> = { manual: 'Manual', drawing: 'Drawing', specification: 'Specification', certificate: 'Certificate', other: 'Document' };
export interface ManualFacts { docKind: DocKind; pages: string[]; pageCount: number; blank: number; capped?: boolean }
export interface MachineDoc { id: string; name: string; fileName: string; docKind: DocKind; lineId?: string; machine?: string; client?: string; at: number; bytes: number; pages: string[]; pageCount: number; blank: number; capped: boolean }

export function machineDocOf(s: Pick<ToolStudy, 'id' | 'tool' | 'name' | 'facts' | 'deletedAt' | 'workspaceId' | 'createdAt'>): MachineDoc | undefined {
  if (s.tool !== 'source' || s.deletedAt) return undefined;
  const f = s.facts as { source?: SourceFacts; manual?: ManualFacts };
  if (!f.source || !f.manual || !Array.isArray(f.manual.pages)) return undefined;
  return { id: s.id, name: f.source.name || s.name, fileName: f.source.fileName, docKind: f.manual.docKind, ...(s.workspaceId ? { lineId: s.workspaceId } : {}), ...(f.source.machine ? { machine: f.source.machine } : {}),
    ...(f.source.client ? { client: f.source.client } : {}), at: f.source.at ?? s.createdAt, bytes: f.source.bytes, pages: f.manual.pages, pageCount: f.manual.pageCount, blank: f.manual.blank ?? 0, capped: !!f.manual.capped };
}

/** The documents kept — on one line, of one machine, or all. Newest first. */
export async function listMachineDocs(o: { lineId?: string; machine?: string } = {}): Promise<MachineDoc[]> {
  const all = (await listAllStudies()).map(machineDocOf).filter((d): d is MachineDoc => !!d);
  return all.filter(d => (!o.lineId || d.lineId === o.lineId) && (!o.machine || (d.machine && machineKey(d.machine) === machineKey(o.machine)))).sort((a, b) => b.at - a.at);
}
export async function getMachineDoc(id: string): Promise<MachineDoc | undefined> { const s = await getStudy(id); return s ? machineDocOf(s) : undefined; }

/** What reading it found, in a sentence — its pages, how many have no words, and how much of it speaks of maintenance. */
export function docSaid(d: Pick<MachineDoc, 'name' | 'pageCount' | 'pages' | 'blank' | 'capped' | 'machine' | 'docKind'>): string {
  const tasks = pmTasksOf(d.pages).length, about = findPassages(d.pages, { topic: 'maintenance' }, 9999).passages.length;
  const read = d.pages.length - d.blank;
  return [
    `“${d.name}”${d.machine ? ` — kept on ${d.machine}` : ''}: ${d.pageCount} page${d.pageCount === 1 ? '' : 's'}, ${read} read in the app (no AI used).`,
    d.blank ? `${d.blank} page${d.blank === 1 ? ' has' : 's have'} no words to read — scans or drawings.` : '',
    d.capped ? 'It is very long: only its first part was read.' : '',
    read === 0 ? 'Nothing in it can be read by rules — it is a picture of the pages.'
      : tasks ? `${tasks} maintenance task${tasks === 1 ? '' : 's'} with an interval read by rule${about > tasks ? `; ${about} places speak of maintenance in all` : ''}.`
        : about ? `${about} place${about === 1 ? '' : 's'} speak${about === 1 ? 's' : ''} of maintenance, none with an interval a rule could read.` : 'Nothing in it speaks of maintenance.',
  ].filter(Boolean).join(' ');
}

export type Kept = { ok: true; doc: MachineDoc; says: string } | { ok: false; why: string };

/** KEEP A DOCUMENT ON A MACHINE — a PDF, read page by page in code. */
export async function keepMachineDoc(o: { file: Blob; fileName: string; lineId: string; machine?: string; docKind: DocKind; conversationId?: string; by?: string; now?: number }): Promise<Kept> {
  if (!/\.pdf$/i.test(o.fileName) && o.file.type !== 'application/pdf') return { ok: false, why: 'A manual is kept from its PDF — attach the PDF.' };
  const line = await getWorkspace(o.lineId);
  if (!line) return { ok: false, why: 'Say which line the machine is on — a document belongs to a machine on a line.' };
  let read;
  try { read = await pdfPageTexts(await o.file.arrayBuffer()); } catch { return { ok: false, why: 'The PDF could not be read — it may be locked or damaged.' }; }
  const t = o.now ?? Date.now(), id = uid(), blobKey = `doc-${uid()}`;
  await putBlob(blobKey, o.file);
  const name = o.fileName.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'A document';
  const source: SourceFacts = { name, named: 'file', fileName: o.fileName, kind: 'document', bytes: o.file.size, at: t, fileId: id, status: 'ready',
    ...(line.clientName?.trim() ? { client: line.clientName.trim() } : {}), ...(o.machine?.trim() ? { machine: o.machine.trim() } : {}), ...(o.conversationId ? { conversationId: o.conversationId } : {}) };
  const manual: ManualFacts = { docKind: o.docKind, pages: read.pages, pageCount: read.pageCount, blank: read.blank, ...(read.capped ? { capped: true } : {}) };
  const s: ToolStudy = { id, tool: 'source', name, workspaceId: line.id, ...(o.machine?.trim() ? { machine: o.machine.trim() } : {}),
    facts: { source, manual, docPhotos: [{ id: uid(), field: 'source-file', blobKey, mime: 'application/pdf', caption: o.fileName, at: t, ...(o.by ? { by: o.by } : {}) }] } as unknown as ToolStudy['facts'],
    uses: [], startedAt: t, createdAt: t, updatedAt: t };
  await putStudy(s);
  const doc = machineDocOf(s);
  if (!doc) return { ok: false, why: 'The document could not be kept.' };
  return { ok: true, doc, says: docSaid(doc) };
}
