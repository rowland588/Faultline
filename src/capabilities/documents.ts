/* A DOCUMENT'S FIRST LOOK, ASKED AGAIN (27 November 2026 — Intelligent Document Processing as Luna).
 *
 * document_look  read  classify the file and extract the commercial facts the code can hold, naming what is not in it.
 * The same look that ran when the file was attached. Every figure is the file's own words with its page. No AI.
 * A write still waits for a card. */
import { getStudy, patchStudy } from '../db';
import type { SourceFacts } from '../lib/data/sources';
import { documentLook, keptOf, type DocumentLook } from '../lib/document/look';
import type { ToolStudy } from '../lib/study';
import { pagesOfDocument } from './manuals';
import { checkObject, ID } from './check';
import { anyone } from './access';
import type { CapCtx, CapRef, CapResult, Capability } from './types';

const none = 'There is no such document on this device — a file attached in this chat is named by its source id; list_documents says which machine manuals are kept.';
const refOf = (d: { id: string; name: string; lineId?: string }): CapRef => ({
  kind: 'study', id: d.id, label: d.name, href: d.lineId ? `/lines/${d.lineId}` : '/ai',
});

export const documentLookCap: Capability = {
  name: 'document_look', title: 'Look at a document', kind: 'read',
  validate: raw => checkObject(raw, { sourceId: ID('the file', true) }),
  allowed: anyone,
  async run(ctx: CapCtx, input: { sourceId: string }): Promise<CapResult> {
    const d = await pagesOfDocument(input.sourceId);
    if (!d) return { ok: false, why: none };
    const look: DocumentLook = documentLook({ name: d.name, pages: d.pages, blank: d.blank, pageCount: d.pages.length, capped: d.capped });
    const s = await getStudy(input.sourceId);
    if (s && !s.deletedAt) {
      await patchStudy(s.id, cur => {
        const src = (cur.facts as { source?: SourceFacts }).source;
        if (!src) return {};
        return { facts: { ...cur.facts, source: { ...src, documentLook: keptOf(look, ctx.now) } } as ToolStudy['facts'] };
      });
    }
    return {
      ok: true, says: look.said, refs: [refOf(d)],
      data: { kind: look.kind, facts: look.facts, missing: look.missing, commercial: look.suggestions.length > 0, suggestions: look.suggestions, headline: look.headline },
    };
  },
};

export const DOCUMENTS: readonly Capability[] = [documentLookCap];
