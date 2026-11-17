/** Durable source references for the existing problem/action record. A linked AI answer is an account, never verified proof. */
import type { Snag } from '../snag/types';

export type ActionSourceKind = 'study' | 'standard' | 'problem' | 'conversation' | 'result' | 'chart' | 'report' | 'action' | 'test';
export interface ActionSource {
  kind: ActionSourceKind;
  id: string;
  /** A particular reply or part of a saved use, when relevant. */
  part?: string;
  href: string;
  label: string;
  how: 'record' | 'ai';
  /** A short quote; the linked original remains authoritative. */
  excerpt?: string;
}
const KINDS = new Set<ActionSourceKind>(['study', 'standard', 'problem', 'conversation', 'result', 'chart', 'report', 'action', 'test']);
export const ACTION_SOURCE_TAG = 'source:';

function sourceOf(value: unknown): ActionSource | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const s = value as Partial<ActionSource>;
  if (!KINDS.has(s.kind as ActionSourceKind) || typeof s.id !== 'string' || !s.id.trim()
    || typeof s.href !== 'string' || !s.href.startsWith('/') || s.href.startsWith('//')
    || typeof s.label !== 'string' || !s.label.trim() || !['record', 'ai'].includes(s.how ?? '')) return undefined;
  return { kind: s.kind as ActionSourceKind, id: s.id, href: s.href, label: s.label, how: s.how as ActionSource['how'],
    ...(typeof s.part === 'string' && s.part ? { part: s.part } : {}),
    ...(typeof s.excerpt === 'string' && s.excerpt ? { excerpt: s.excerpt } : {}) };
}
export const sourceKey = (s: ActionSource): string => JSON.stringify([s.kind, s.id, s.part ?? '']);

/** Keep earlier context when the same source is linked again; independent uses/replies remain separate. */
export function withActionSources(was: readonly ActionSource[] | undefined, added: readonly ActionSource[]): ActionSource[] {
  const by = new Map<string, ActionSource>();
  for (const candidate of [...(was ?? []), ...added]) {
    const s = sourceOf(candidate);
    if (s && !by.has(sourceKey(s))) by.set(sourceKey(s), s);
  }
  return [...by.values()];
}
export const actionSourcesToTags = (sources: readonly ActionSource[] | undefined): string[] =>
  withActionSources(undefined, sources ?? []).map(s => ACTION_SOURCE_TAG + encodeURIComponent(JSON.stringify(s)));

export function actionSourcesOfTags(ids: unknown): { sources?: ActionSource[] } {
  if (!Array.isArray(ids)) return {};
  const sources = ids.flatMap(tag => {
    if (typeof tag !== 'string' || !tag.startsWith(ACTION_SOURCE_TAG)) return [];
    try { const s = sourceOf(JSON.parse(decodeURIComponent(tag.slice(ACTION_SOURCE_TAG.length)))); return s ? [s] : []; }
    catch { return []; }
  });
  return sources.length ? { sources: withActionSources(undefined, sources) } : {};
}
export const actionText = (s: Pick<Snag, 'problem' | 'proposedSolution'>): string => s.proposedSolution?.trim() || s.problem.trim();
export const actionReason = (s: Pick<Snag, 'problem' | 'proposedSolution'>): string | undefined => s.proposedSolution?.trim() ? s.problem.trim() || undefined : undefined;

/** Several independently owned actions can follow the same problem or saved use. Closed actions remain part of its history. */
export const actionsFrom = <T extends {sources?: ActionSource[];deletedAt?:number;archivedAt?:number}>(snags: readonly T[], kind: ActionSourceKind, id: string): T[] =>
  snags.filter(s => !s.deletedAt && !s.archivedAt && s.sources?.some(r => r.kind === kind && r.id === id));

/** Validate JSONB source arrays read from project action/test records. */
export const actionSourcesOfJSON = (value: unknown): ActionSource[] => Array.isArray(value) ? withActionSources(undefined, value as ActionSource[]) : [];

export const actionSourceSummary = (sources?: readonly ActionSource[]): string => (sources ?? []).map(s=>`${s.label}${s.how === 'ai' ? ' (Luna suggestion, unverified)' : ''}`).join('; ');
export const whyWithSources = (why: string | undefined, sources?: readonly ActionSource[]): string | undefined => {
  const refs=actionSourceSummary(sources); return [why,refs ? `Sources: ${refs}` : ''].filter(Boolean).join(' · ') || undefined;
};
