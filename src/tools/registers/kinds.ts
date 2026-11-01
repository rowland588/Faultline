/* THE REGISTER TOOLS — four tools that are a record of their own on the study shape (m6-registers, 1 November 2026):
 *   holds       FC-135 Product on hold          a line's register of holds
 *   deploy      FC-155 Horizontal deployment    a proved fix offered to the other lines
 *   daily       FC-198 Tiered daily meeting     a scope's meetings and what it escalated
 *   fault-tree  FC-152 Fault tree analysis      a typed tree, its cut sets
 *
 * They are studies of the tool keys 'ledger' (the first three: a table of rows kept over time) and 'doc' (the tree: a
 * structured document), the keys supabase/SHAPE_TOOLS.sql already allows — so there is NO migration — and WHICH tool a study
 * is lives in its own agreed record (`agreed.holds`, `.deploy`, `.daily`, `.tree`), as a calculator's lives in agreed.calc.key.
 * Anything that asks "which tool is this study?" asks registerKeyOf. Pure: types and words, nothing stored. */
import type { ToolStudy } from '../../lib/study';

export type RegisterKey = 'holds' | 'deploy' | 'daily' | 'fault-tree';
export const REGISTER_KEYS: readonly RegisterKey[] = ['holds', 'deploy', 'daily', 'fault-tree'];

/** The study keys each register tool is stored under. */
export const STUDY_KEY: Record<RegisterKey, 'ledger' | 'doc'> = { holds: 'ledger', deploy: 'ledger', daily: 'ledger', 'fault-tree': 'doc' };

/** Which register tool a study is — absent when it is none of them. */
export function registerKeyOf(s: Pick<ToolStudy, 'tool' | 'agreed'>): RegisterKey | undefined {
  if (s.tool === 'ledger') return s.agreed?.holds ? 'holds' : s.agreed?.deploy ? 'deploy' : s.agreed?.daily ? 'daily' : undefined;
  if (s.tool === 'doc') return s.agreed?.tree ? 'fault-tree' : undefined;
  return undefined;
}

/** Its address: the list, or one record. */
export const registerHref = (key: RegisterKey, id?: string): string => `/${key}${id ? `/${encodeURIComponent(id)}` : ''}`;

/** What a tool is called where a record of it is named (the line report's section, a title, a paper's eyebrow). */
export const REGISTER_WORD: Record<RegisterKey, string> = { holds: 'Product on hold', deploy: 'Horizontal deployment', daily: 'Daily meeting', 'fault-tree': 'Fault tree' };

export const isRegisterStudy = (s: Pick<ToolStudy, 'tool' | 'agreed'>): boolean => registerKeyOf(s) !== undefined;

/** A route's view word that is one of the register tools. */
export const isRegisterKey = (v: string | undefined): v is RegisterKey => !!v && (REGISTER_KEYS as readonly string[]).includes(v);
