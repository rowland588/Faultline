/* METHOD KNOWLEDGE — the methodology brain (docs/LUNA-EXPERT-KNOWLEDGE.md). Read a record from knowledge/methods on demand; no figure
 * is worked here — pair with a tool read or query for their numbers. */
import { methodLookupText, methodRecords, searchMethodRecords } from '../catalogue/methodIndex';
import { checkObject } from './check';
import { anyone } from './access';
import { plural } from './util';
import type { CapResult, Capability } from './types';

interface MethodKnowledgeIn { id?: string; discipline?: string; query?: string }

export const methodKnowledge: Capability = {
  name: 'method_knowledge', title: 'What a method says in the library', kind: 'read',
  validate: raw => checkObject(raw ?? {}, {
    id: { kind: 'string', label: 'a method id, e.g. foodsafety.haccp', max: 80 },
    discipline: { kind: 'string', label: 'a discipline id from the catalogue, e.g. spc or lean', max: 40 },
    query: { kind: 'string', label: 'keywords to match in the method name, aliases and sections', max: 200 },
  }),
  allowed: anyone,
  async run(_ctx, input: MethodKnowledgeIn): Promise<CapResult> {
    const id = input.id?.trim();
    const discipline = input.discipline?.trim();
    const query = input.query?.trim();
    if (!id && !discipline && !query) {
      const ids = methodRecords().slice(0, 24).map(r => r.id);
      return {
        ok: true,
        says: `The knowledge library holds ${methodRecords().length} method records — give an id, a discipline, or keywords.`,
        data: { notFound: false, count: methodRecords().length, sampleIds: ids, figures: 'none — only text from the library; use a tool or query for their numbers' },
        refs: [],
      };
    }
    const hits = searchMethodRecords({ id, discipline, query });
    if (!hits.length) {
      return {
        ok: true,
        says: 'No method record matched — not found in knowledge/methods. Try another id, discipline, or keywords.',
        data: { notFound: true, figures: 'none — only text from the library' },
        refs: [],
      };
    }
    const records = hits.map(methodLookupText);
    const sole = hits.length === 1 ? records[0] : undefined;
    return {
      ok: true,
      says: sole
        ? `${sole.name} (${sole.id}) — purpose, limits and food context from the library.${sole.truncated ? ' Text was trimmed to fit.' : ''} Figures on their line still come from a tool or query, not from this.`
        : `${plural(hits.length, 'method record')} matched — read the closest id, or narrow with discipline or query.`,
      data: {
        notFound: false,
        figures: 'none — only text from the library; use query_data, work_out, run_calculator or a tool read for their numbers',
        ...(sole ? { record: sole } : { matches: records.map(r => ({ id: r.id, name: r.name, discipline: r.discipline })) }),
        ...(hits.length > 1 ? { records: records.slice(0, 3) } : {}),
      },
      refs: [],
    };
  },
};