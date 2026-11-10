/* WHAT LUNA WROTE ON A METHOD'S SHEET, MARKED WHERE IT STANDS (10 November, docs/LUNA-WORKSPACE.md W5 — "Methods filled progressively …
 * Luna's answers arrive as drafts in place … Accept · Edit · Not this"; Rowland: "Traditional project templates such as DMAIC, 8D, PDCA and
 * Kaizen must remain available for manual use, while also becoming accessible and progressively populated through Luna").
 *
 * Luna answers a method's questions through the sheet's own save (answer_method → one project note a question). This reads, from the
 * conversations' own steps, which answers she wrote — the question, her words, when, in which conversation — so the sheet can mark an
 * answer still exactly as she wrote it and not yet kept by the person: Keep (noted on that conversation, `keptAnswers`), Edit (the box —
 * changed, it is the person's), Not this (cleared through the sheet's own save, with Undo). No new record, no column: the conversation
 * holds the provenance, the sheet holds the answer. */
import { useCallback, useEffect, useState } from 'react';
import { listAllStudies, onDataChange, patchStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import { conversationTitle, factsOfConversation, isConversation } from './conversation';

export interface LunaAnswer { field: string; text: string; at: number; conversationId: string; conversation: string; callId: string; kept: boolean }
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
type Kept = { keptAnswers?: string[] };

/** The newest answer Luna wrote to each question of a project's sheet — `fields` its questions (id and label, as the sheet has them). */
export function lunaAnswersOf(convs: readonly ToolStudy[], projectId: string, fields: readonly { id: string; label: string }[]): Map<string, LunaAnswer> {
  const out = new Map<string, LunaAnswer>();
  for (const s of convs) {
    if (s.deletedAt || !isConversation(s)) continue;
    const f = factsOfConversation(s);
    const kept = new Set((f as Kept).keptAnswers ?? []);
    for (const t of f.turns ?? []) {
      for (const u of t.used ?? []) {
        if (u.name !== 'answer_method' || u.status !== 'done' || u.input?.projectId !== projectId) continue;
        for (const a of (u.input.answers as { field?: string; text?: string }[] | undefined) ?? []) {
          const fl = fields.find(x => same(x.id, a.field ?? '') || same(x.label, a.field ?? ''));
          if (!fl || typeof a.text !== 'string') continue;
          const had = out.get(fl.id);
          if (had && had.at >= u.at) continue;
          out.set(fl.id, { field: fl.id, text: a.text.trim(), at: u.at, conversationId: s.id, conversation: conversationTitle(f, s.name), callId: u.callId, kept: kept.has(`${u.callId}:${fl.id}`) });
        }
      }
    }
  }
  return out;
}

export function useLunaAnswers(projectId: string, fields: readonly { id: string; label: string }[]): Map<string, LunaAnswer> {
  const [m, setM] = useState<Map<string, LunaAnswer>>(new Map());
  const key = fields.map(f => f.id).join('|');
  const load = useCallback(async () => setM(lunaAnswersOf(await listAllStudies(), projectId, fields)), [projectId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return m;
}

/** Keep: the person has looked and keeps Luna's answer — noted on the conversation it came from. */
export async function keepLunaAnswer(a: LunaAnswer): Promise<void> {
  await patchStudy(a.conversationId, cur => ({ facts: { ...cur.facts, keptAnswers: [...new Set([...(((cur.facts as Kept).keptAnswers) ?? []), `${a.callId}:${a.field}`])].slice(-400) } as ToolStudy['facts'] }));
}
