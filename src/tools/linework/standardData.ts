/* STANDARD DATA — TIMED STEPS REUSED ACROSS PRODUCTS (FC-024; knowledge/specs/FC-032-line-balance.md §3 chosen 9,
 * §6.7; ie.standard-data).
 *
 * Every new pack format has to be timed from scratch — unless a step on it was timed already on another product
 * of the same line. A step timed (or itself reused) on another product's newest balance is offered with its BASIC
 * time (observed × rating ÷ 100), the cycles it stood on and where it came from; used here it takes THIS balance's
 * allowance, says it is reused, and gives way to a timing made here. Conditions that scale a time (a regression
 * element, "place n packs") are not modelled — the step's name carries the condition, the person judges the match.
 * Pure: the studies in, the rows out. */
import type { ReusedTime, ToolStudy } from '../../lib/study';
import { balance, type BalanceFigures } from './balance';
export { reuseSays } from './balance';

export interface LibraryRow {
  key: string;
  studyId: string;
  stepId: string;
  product: string;
  name: string;
  who: string;
  kind: string;
  basic: number;
  /** The cycles it stood on, and whether that was enough for ±5% at 95%. */
  n: number;
  enough: boolean;
  /** Where it was first timed, when this is itself reused. */
  at: number;
}

/** The newest balance of each other product on the same line, its timed and reused steps. */
export function libraryFrom(all: readonly ToolStudy[], here: { studyId?: string; standardId?: string; workspaceId?: string }): LibraryRow[] {
  const mine = all.filter(s => s.tool === 'balance' && !s.facts.video && s.workspaceId && s.workspaceId === here.workspaceId
    && s.id !== here.studyId && (!here.standardId || s.standardId !== here.standardId));
  const newest = new Map<string, ToolStudy>();
  for (const s of mine) {
    const k = s.standardId ?? s.id;
    const was = newest.get(k);
    if (!was || s.startedAt > was.startedAt) newest.set(k, s);
  }
  const rows: LibraryRow[] = [];
  for (const s of newest.values()) {
    const f = balance(s.facts.steps, s.agreed?.balance);
    const by = new Map((s.facts.steps ?? []).map(st => [st.id, st]));
    for (const e of f.elements) {
      if (!(e.basic && e.basic > 0)) continue;
      if (e.source !== 'timed' && e.source !== 'library') continue;
      const st = by.get(e.id);
      /* a reused step offers what it was first timed from, not a copy of a copy */
      const orig = e.source === 'library' && st?.reuse ? st.reuse : undefined;
      rows.push({ key: `${s.id}:${e.id}`, studyId: orig?.studyId ?? s.id, stepId: orig?.stepId ?? e.id, product: orig?.product ?? s.name, name: e.name, who: e.who,
        kind: e.kind, basic: e.basic, n: orig?.n ?? e.n, enough: orig?.enough ?? e.enough, at: orig?.at ?? s.startedAt });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name) || a.product.localeCompare(b.product));
}

const words = (t: string): string[] => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 2).map(w => w.replace(/(ing|ed|es|s)$/, '') || w);

/** The rows that match what was typed, best first — every word of the query found in the name or the product. */
export function matchRows(rows: readonly LibraryRow[], query: string): LibraryRow[] {
  const q = words(query);
  if (!q.length) return [...rows];
  const score = (r: LibraryRow) => { const hay = new Set([...words(r.name), ...words(r.product)]); return q.filter(w => hay.has(w)).length; };
  return rows.map(r => ({ r, s: score(r) })).filter(x => x.s === q.length).sort((a, b) => b.s - a.s).map(x => x.r);
}

/** A row as the step keeps it. */
export const reuseOf = (r: LibraryRow): ReusedTime => ({ basicSec: r.basic, n: r.n, enough: r.enough, product: r.product, studyId: r.studyId, stepId: r.stepId, at: r.at });

/** How much of this balance's work is borrowed: "2 of 5 steps are reused — 41% of the work (12.3 s of 30.0 s)". */
export function reusedSays(f: BalanceFigures): { text: string; share: number } | undefined {
  const els = f.elements.filter(e => e.kind !== 'machine');
  const lib = els.filter(e => e.source === 'library');
  if (!lib.length) return undefined;
  const total = els.reduce((t, e) => t + (e.standard ?? 0), 0), part = lib.reduce((t, e) => t + (e.standard ?? 0), 0);
  const share = total > 0 ? part / total : 0;
  const s = (v: number) => `${v.toFixed(1)} s`;
  return { text: `${lib.length} of ${els.length} step${els.length === 1 ? ' is' : 's are'} reused from other products’ timings — ${Math.round(share * 100)}% of the work (${s(part)} of ${s(total)}); time them here to replace them.`, share };
}
