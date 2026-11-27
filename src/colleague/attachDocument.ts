/* A PDF OR WORD FILE ATTACHED TO A CONVERSATION (27 November 2026 — Intelligent Document Processing as Luna, not a menu).
 *
 * Same door as a workbook (colleague/attachWorkbook): read on this device, registered, the first look said in chat — no extra
 * sheet, no keyword of the person's ask. Classification and extraction are code (lib/document/look). Every figure is the
 * file's own words. What is not in the file is named. No AI. */

import { patchStudy } from '../db';
import { putBlob } from '../db/blobs';
import { uid } from '../lib/ids';
import type { CapCtx } from '../capabilities/types';
import { registerFile } from '../capabilities/data';
import { WHO, appendAction, appendTurn } from './conversation';
import type { FileOrigin, SourceFacts } from '../lib/data/sources';
import { pdfPageTexts } from '../lib/manual/pages';
import { readBrief } from '../tools/story/briefText';
import { DOCUMENT_FORM_CHIPS, documentLook, isChatDocument, keptOf, type DocumentLook, type DocumentPagesKept } from '../lib/document/look';
import type { ToolStudy } from '../lib/study';

async function pagesOfFile(file: File): Promise<DocumentPagesKept | { why: string }> {
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    try {
      const read = await pdfPageTexts(await file.arrayBuffer());
      return { pages: read.pages, pageCount: read.pageCount, blank: read.blank, ...(read.capped ? { capped: true } : {}) };
    } catch {
      return { why: 'The PDF could not be read — it may be locked or damaged.' };
    }
  }
  const brief = await readBrief(file, file.name);
  if (!brief.ok) return { why: brief.why };
  const pages = brief.text.includes('\f') ? brief.text.split('\f').map(p => p.trim()).filter(Boolean) : [brief.text];
  return { pages, pageCount: pages.length, blank: pages.filter(p => p.replace(/\s/g, '').length < 8).length };
}

async function keepFile(srcId: string, file: File): Promise<string | undefined> {
  const blobKey = `doc-${uid()}`;
  try {
    await putBlob(blobKey, file);
    await patchStudy(srcId, cur => {
      const t = Date.now();
      const photos = [...(((cur.facts as { docPhotos?: { id: string; field: string; blobKey: string; mime?: string; caption?: string; at: number }[] }).docPhotos) ?? [])];
      if (!photos.some(p => p.field === 'source-file')) {
        photos.push({ id: uid(), field: 'source-file', blobKey, mime: file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), caption: file.name, at: t });
      }
      return { facts: { ...cur.facts, docPhotos: photos } as ToolStudy['facts'] };
    });
    return blobKey;
  } catch {
    return undefined;
  }
}

async function keepLook(srcId: string, look: DocumentLook, pages: DocumentPagesKept, at: number): Promise<void> {
  await patchStudy(srcId, cur => {
    const sf = (cur.facts as { source: SourceFacts }).source;
    return {
      facts: {
        ...cur.facts,
        source: { ...sf, documentLook: keptOf(look, at), status: 'ready' },
        documentPages: pages,
      } as ToolStudy['facts'],
    };
  });
}

export interface AttachedDocument { id: string; name: string; said: string; sourceId?: string; look: DocumentLook }

/** Read `file` into the conversation and say its first look. Throws if the file cannot be read. */
export async function attachDocument(c: CapCtx & { conversationId: string }, file: File, o: { origin?: FileOrigin; lineId?: string; projectId?: string; client?: string } = {}): Promise<AttachedDocument> {
  if (!isChatDocument(file)) throw new Error('Attach a PDF or a Word file (.docx).');
  const read = await pagesOfFile(file);
  if ('why' in read) throw new Error(read.why);
  const look = documentLook({ name: file.name, pages: read.pages, blank: read.blank, pageCount: read.pageCount, capped: read.capped });
  const src = await registerFile(c, {
    ...(o.origin ? { origin: o.origin } : {}),
    ...(o.client ? { client: o.client } : {}),
    fileId: `doc-${uid()}`,
    fileName: file.name,
    kind: 'document',
    bytes: file.size,
    status: 'ready',
    ...(o.lineId ? { lineId: o.lineId } : {}),
    ...(o.projectId ? { projectId: o.projectId } : {}),
  });
  if (src) {
    await keepFile(src.id, file);
    await keepLook(src.id, look, read, Date.now());
  }
  const refs = src ? [{ kind: 'study' as const, id: src.id, label: src.facts.name, href: '/ai' }] : [];
  await appendAction(patchStudy, c.conversationId, {
    callId: uid(), name: 'document_look', title: 'Look at a document', status: 'done', says: look.said, refs, at: Date.now(),
  });
  await appendTurn(patchStudy, c.conversationId, {
    id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: look.said, byCode: true, documentLook: true,
    ...(look.suggestions.length ? { suggestions: [...look.suggestions] } : {}),
  });
  return { id: src?.facts.fileId ?? file.name, name: file.name, said: look.said, look, ...(src ? { sourceId: src.id } : {}) };
}

export { DOCUMENT_FORM_CHIPS, isChatDocument };
