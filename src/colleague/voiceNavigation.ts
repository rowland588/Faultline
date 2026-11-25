/* Short, explicit navigation instructions. Both the voice transcript and the typed composer
 * use this path; the destination still comes from the app's scoped find capability. */
import type { CapRef } from '../capabilities/types';

export type NavigationIntent = { kind: 'section'; label: string; href: string } | { kind: 'project'; name: string };
const SECTIONS: Record<string, { label: string; href: string }> = {
  factory: { label: 'Factory', href: '/room' }, lines: { label: 'Lines', href: '/room' },
  projects: { label: 'Projects', href: '/projects' }, tools: { label: 'Tools', href: '/tools' },
  actions: { label: 'Actions', href: '/actions' }, problems: { label: 'Problems', href: '/snags' },
};
const clean = (s: string) => s.trim().replace(/^[“"']|[”"']$/g, '').replace(/[.!?]+$/, '').trim();
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function navigationIntent(words: string, onProjectsPage = false): NavigationIntent | null {
  const said = clean(words.replace(/^luna[,\s]+/i, ''));
  const lead = '(?:open|go to|show|take me to)';
  const section = new RegExp(`^${lead}\\s+(?:the\\s+)?(factory|lines|projects|tools|actions|problems)(?:\\s+(?:page|list))?$`, 'i').exec(said)?.[1]?.toLowerCase();
  if (section && SECTIONS[section]) return { kind: 'section', ...SECTIONS[section] };
  const via = new RegExp(`^${lead}\\s+(?:the\\s+)?projects?(?:\\s+page)?[,\\s]+(?:then\\s+|and\\s+)?(?:go to|find|open|show|select)\\s+(.+?)(?:[,\\s]+(?:and\\s+)?open\\s+it)?$`, 'i').exec(said);
  const direct = new RegExp(`^${lead}\\s+(?:the\\s+)?project\\s+(?:called\\s+|named\\s+)?(.+)$`, 'i').exec(said);
  const follow = onProjectsPage ? /^(?:go to|find|open|select)\s+(.+?)(?:[,\s]+(?:and\s+)?open\s+it)?$/i.exec(said) : null;
  const name = clean(via?.[1] ?? direct?.[1] ?? follow?.[1] ?? '');
  if (name && norm(name) !== 'list' && norm(name) !== 'page') return { kind: 'project', name };
  return null;
}

export function projectMatches(name: string, refs: readonly CapRef[]): CapRef[] {
  const projects = refs.filter(r => r.kind === 'project' && !!r.href);
  const exact = projects.filter(r => norm(r.label) === norm(name));
  return exact.length ? exact : projects.filter(r => norm(r.label).includes(norm(name)));
}
