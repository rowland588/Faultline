import type { BoardDef } from './types';

const found = import.meta.glob<{ default: BoardDef }>('./defs/*.ts', { eager: true });

export const BOARDS: readonly BoardDef[] = Object.values(found).map(m => m.default)
  .sort((a, b) => a.group.localeCompare(b.group) || a.fc.localeCompare(b.fc));

export const boardByKey = (key: string | undefined): BoardDef | undefined => (key ? BOARDS.find(d => d.key === key) : undefined);

export function boardGroups(): { group: string; defs: BoardDef[] }[] {
  const out: { group: string; defs: BoardDef[] }[] = [];
  for (const d of BOARDS) {
    const g = out.find(x => x.group === d.group);
    if (g) g.defs.push(d); else out.push({ group: d.group, defs: [d] });
  }
  return out;
}
