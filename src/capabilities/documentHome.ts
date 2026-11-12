/* WHERE A CHARTER BELONGS — decided by code, asked when it cannot be (12 November, docs/LUNA-EVAL.md §5).
 *
 * The packing exam's failure: every live run wrote the charter as answers on the DMAIC Define sheet (answer_method), so the sponsor,
 * the target, the date and the team were never kept as fields, the correction had nowhere to land, "make it a record" made nothing,
 * and Luna once said the charter was corrected when nothing was. Two causes in the app: answer_method's own description told the model
 * the sheet held "DMAIC's charter", and its refusal of a field the sheet does not ask listed the sheet's questions and never named the
 * charter. Rowland: "Ambiguous destinations must result in clarification rather than guessing."
 *
 * So the charter's home is worked out here, from the records, never chosen by the model:
 *   none  — no charter on the project: charter words go to a new charter document (start_draft doc charter)
 *   one   — the charter in this conversation's drafts or the project's one record: its words go there
 *   many  — two or more: nothing is written; the person is asked which, by name */
import { listAllStudies } from '../db';
import { docDefOf } from '../tools/doc/custom';
import type { ColleagueDraft } from './types';
import type { ToolStudy } from '../lib/study';

/** A charter's own fields — the words that only a charter has a box for (tools/doc/defs/charter). */
export const CHARTER_ONLY = ['sponsor', 'lead', 'target', 'by', 'unit', 'measure', 'baseline', 'baselinehow', 'scopein', 'scopeout', 'constraints', 'deadline', 'due date', 'team members', 'the sponsor', 'the lead', 'sponsored by', 'led by'] as const;

/** The sheet questions a charter answers in full — written once, in the charter, when the project has one (DMAIC Define, the Kaizen event's charter). */
export const CHARTER_HELD: Record<string, readonly string[]> = {
  dmaic: ['problem', 'scope', 'goal', 'team', 'milestones'],
  'kaizen-event': ['charter', 'sponsor', 'target', 'team'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Does a field named in a call belong only to a charter? */
export const charterOnly = (field: string) => { const f = norm(field).replace(/ /g, ''); return CHARTER_ONLY.some(c => c.replace(/ /g, '') === f); };

export interface CharterHome { state: 'none' | 'one' | 'many'; draft?: ColleagueDraft; record?: ToolStudy; names: string[] }

const isCharter = (s: ToolStudy) => s.tool === 'doc' && !s.deletedAt && docDefOf(s)?.key === 'charter';

/** The charters of a project: the conversation's own drafts (a made draft counts once, as its record) and the project's records. */
export async function charterHome(projectId: string, drafts: readonly ColleagueDraft[]): Promise<CharterHome> {
  const records = (await listAllStudies()).filter(s => isCharter(s) && s.projectId === projectId);
  const mine = drafts.filter(d => d.kind === 'doc' && d.key === 'charter' && d.scope.projectId === projectId);
  const open = mine.filter(d => d.status === 'draft');
  const madeIds = new Set(mine.filter(d => d.status === 'made' && d.studyId).map(d => d.studyId as string));
  const others = records.filter(r => !madeIds.has(r.id));
  const count = open.length + madeIds.size + others.length;
  const names = [...open.map(d => `${d.title} (a draft here)`), ...records.map(r => r.name || 'Project charter')];
  if (count === 0) return { state: 'none', names };
  if (count > 1) return { state: 'many', names };
  const draft = open[0] ?? mine.find(d => d.status === 'made');
  return { state: 'one', draft, record: draft?.studyId ? records.find(r => r.id === draft.studyId) : others[0], names };
}

/** What to do with charter words, in one sentence the model is handed back. */
export function charterRoute(h: CharterHome, projectName: string): string {
  if (h.state === 'many') return `${projectName} has ${h.names.length} charters (${h.names.join('; ')}) — nothing was written. Ask the person which one these words belong to; never pick one.`;
  if (h.state === 'one' && h.draft) return `${projectName}'s charter is “${h.draft.title}” — put these in it with fill_draft (draftId ${h.draft.id}), by its fields (sponsor, lead, target, by, unit, measure, baseline, scopeIn, scopeOut, team).`;
  if (h.state === 'one' && h.record) return `${projectName}'s charter is the record “${h.record.name}”, made outside this conversation — say it is there and open it (open_page); it is changed on its own page, not on the method sheet.`;
  return `A charter is its own document (Project charter), not answers on the method sheet. Start it on ${projectName} with start_draft (kind doc, key charter, projectId), fill it with fill_draft by its fields (sponsor, lead, target, by, unit, measure, baseline, scopeIn, scopeOut, team), and make it a record with make_record on the person's yes.`;
}
