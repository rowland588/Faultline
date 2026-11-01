/* WHAT A REGISTER TOOL SAYS OF A STUDY, ONE DISPATCH (m6-registers) — the sentence for a list and the line's page, the title, the
 * paper — so the shared places (lib/studyLinks, lib/studiesPdf, the line report) ask here and never learn each tool. Pure. */
import type { ToolStudy } from '../../lib/study';
import { holdPaper, holdStudySays } from '../hold/holdPaper';
import { REGISTER_WORD, registerKeyOf } from './kinds';
import type { RegisterPaper } from './paperKit';

type Said = { text: string; verdict: string; tone: 'r' | 'a' | 'g' | 'n' };
/** What a register reads of the lines: their cost model (the context the study papers and the line report already carry). */
export interface RegisterCtx { workspaces?: readonly { id: string; materialsPerPack?: number; marginPerPack?: number }[] }

/** The sentence, verdict and tone a register study says of itself. */
export function registerSaid(s: ToolStudy, ctx?: RegisterCtx): Said {
  const line = ctx?.workspaces?.find(w => w.id === s.workspaceId);
  switch (registerKeyOf(s)) {
    case 'holds': return holdStudySays(s, { materialsPerPack: line?.materialsPerPack, marginPerPack: line?.marginPerPack });
    default: return { text: 'not set up yet', verdict: 'Not set up', tone: 'n' };
  }
}

/** "Product on hold" — the tool's word for a study of it. */
export const registerTitle = (s: Pick<ToolStudy, 'tool' | 'agreed'>): string => { const k = registerKeyOf(s); return k ? REGISTER_WORD[k] : 'Study'; };

/** The paper's parts for a register study. */
export function registerPaper(s: ToolStudy, ctx?: RegisterCtx): RegisterPaper | undefined {
  const line = ctx?.workspaces?.find(w => w.id === s.workspaceId);
  switch (registerKeyOf(s)) {
    case 'holds': return holdPaper(s, { materialsPerPack: line?.materialsPerPack, marginPerPack: line?.marginPerPack });
    default: return undefined;
  }
}
