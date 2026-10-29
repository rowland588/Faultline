import type { ScoredDef } from './types';

const found = import.meta.glob<{ default: ScoredDef }>('./defs/*.ts', { eager: true });

export const SCORED: readonly ScoredDef[] = Object.values(found).map(m => m.default)
  .sort((a, b) => a.group.localeCompare(b.group) || a.fc.localeCompare(b.fc));

export const scoredByKey = (key: string | undefined): ScoredDef | undefined => (key ? SCORED.find(d => d.key === key) : undefined);

export function scoredGroups(): { group: string; defs: ScoredDef[] }[] {
  const out: { group: string; defs: ScoredDef[] }[] = [];
  for (const d of SCORED) {
    const g = out.find(x => x.group === d.group);
    if (g) g.defs.push(d); else out.push({ group: d.group, defs: [d] });
  }
  return out;
}
