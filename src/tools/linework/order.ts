/* THE ORDER THE WORK MUST FOLLOW, AND A BALANCE THAT KEEPS IT (FC-033;
 * knowledge/specs/FC-032-line-balance.md §3, §6.5; capacity.line-balancing).
 *
 * Ranked positional weight (Helgeson and Birnie, 1961; Scholl, 1999): a
 * step's weight is its own time plus the time of every step that must come
 * after it, at any depth. The steps are taken in weight order, the heaviest
 * first; the current person takes the first one whose predecessors are all
 * placed and which fits takt; when none fits, the next person starts. A step
 * longer than takt on its own takes a person of its own, and is said over.
 * It is a HEURISTIC — a good balance in reach, not the proof of the best —
 * and the page says so, with the theoretical fewest ⌈work ÷ takt⌉ beside it.
 *
 * Pure. The independent case is scripts/knowledge/cases-time.py §5 (a
 * second implementation); the unit tests take their numbers from it. */
import type { BalanceFigures } from './balance';

export interface OrderItem { id: string; name: string; t: number; after: string[] }

export interface Placed { ids: string[]; work: number }

export interface Proposal {
  stations: Placed[];
  /** Each step's positional weight, seconds. */
  weights: Record<string, number>;
  /** ⌈work ÷ takt⌉ — what no order can beat. */
  minimum: number;
  /** Σ work ÷ (people × the longest stack), as the balance reads it. */
  efficiency: number;
  /** Steps longer than takt on their own. */
  over: string[];
}

/** A loop in the order (a step that has to come before itself) — the ids around it — or none. */
export function findLoop(items: readonly OrderItem[]): string[] | undefined {
  const ids = new Set(items.map(i => i.id));
  const next = new Map(items.map(i => [i.id, i.after.filter(a => ids.has(a))]));
  const state = new Map<string, 0 | 1 | 2>();
  let found: string[] | undefined;
  const walk = (id: string, path: string[]) => {
    if (found) return;
    const s = state.get(id) ?? 0;
    if (s === 2) return;
    if (s === 1) { found = [...path.slice(path.indexOf(id)), id]; return; }
    state.set(id, 1);
    for (const p of next.get(id) ?? []) walk(p, [...path, id]);
    state.set(id, 2);
  };
  for (const i of items) walk(i.id, []);
  return found;
}

/** Whether `maker` may be made to follow `needs` without a loop — the choice the page offers. */
export const wouldLoop = (items: readonly OrderItem[], maker: string, needs: string): boolean =>
  findLoop(items.map(i => (i.id === maker ? { ...i, after: [...new Set([...i.after, needs])] } : i))) !== undefined;

/** Every step's positional weight: its time plus all that must follow it. */
export function positionalWeights(items: readonly OrderItem[]): Record<string, number> {
  const ids = new Set(items.map(i => i.id));
  const succ = new Map<string, string[]>(items.map(i => [i.id, []]));
  for (const i of items) for (const a of i.after) if (ids.has(a)) succ.get(a)?.push(i.id);
  const t = new Map(items.map(i => [i.id, i.t]));
  const out: Record<string, number> = {};
  for (const i of items) {
    const seen = new Set<string>();
    const stack = [...(succ.get(i.id) ?? [])];
    while (stack.length) { const x = stack.pop() as string; if (seen.has(x)) continue; seen.add(x); stack.push(...(succ.get(x) ?? [])); }
    out[i.id] = i.t + [...seen].reduce((s, x) => s + (t.get(x) ?? 0), 0);
  }
  return out;
}

/** The proposal, or the loop that stops it. */
export function rankedPositional(items: readonly OrderItem[], takt: number): Proposal | { loop: string[] } {
  const loop = findLoop(items);
  if (loop) return { loop };
  const ids = new Set(items.map(i => i.id));
  const weights = positionalWeights(items);
  const rank = items.map((i, k) => ({ i, k })).sort((a, b) => weights[b.i.id] - weights[a.i.id] || a.k - b.k).map(x => x.i);
  const done = new Set<string>();
  const stations: Placed[] = [];
  let cur: Placed = { ids: [], work: 0 };
  const over: string[] = [];
  while (done.size < items.length) {
    const ready = rank.filter(x => !done.has(x.id) && x.after.every(a => !ids.has(a) || done.has(a)));
    const fit = ready.find(x => cur.work + x.t <= takt + 1e-9);
    if (fit) { cur.ids.push(fit.id); cur.work += fit.t; done.add(fit.id); continue; }
    if (cur.ids.length) { stations.push(cur); cur = { ids: [], work: 0 }; continue; }
    /* nothing fits an empty person: a step longer than takt on its own */
    const x = ready[0];
    cur.ids.push(x.id); cur.work += x.t; done.add(x.id); over.push(x.id);
  }
  if (cur.ids.length) stations.push(cur);
  const total = items.reduce((s, x) => s + x.t, 0);
  const longest = stations.reduce((m, s) => Math.max(m, s.work), 0);
  return { stations, weights, minimum: takt > 0 ? Math.ceil(total / takt - 1e-9) : 0, efficiency: stations.length && longest > 0 ? total / (stations.length * longest) : 0, over };
}

/** Where the work as it stands puts a step before what it has to follow: "Seal is with Op 1, but must
 *  follow Fill, which is with Op 2." `whoOrder`: the people in the order the line flows. */
export function brokenOrder(f: BalanceFigures, whoOrder: readonly string[] = f.people.map(p => p.who)): string[] {
  const pos = new Map(f.elements.map((e, k) => [e.id, [Math.max(0, whoOrder.indexOf(e.who)), k] as const]));
  const before = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const out: string[] = [];
  for (const e of f.elements) {
    for (const a of e.after) {
      const p = f.elements.find(x => x.id === a);
      if (!p) continue;
      const pe = pos.get(p.id), ee = pos.get(e.id);
      if (pe && ee && !before(pe, ee)) out.push(p.who === e.who ? `${e.name} must follow ${p.name}, but comes before it in ${e.who}’s list.` : `${e.name} is with ${e.who}, but must follow ${p.name}, which is with ${p.who}.`);
    }
  }
  return out;
}

/** What the order gives in words: the people it needs, the least any order could, the efficiency. */
export function proposalSays(p: Proposal, takt: number, current: number): { text: string; tone: 'g' | 'a' | 'r' | 'n' } {
  const n = p.stations.length, plural = (k: number) => `${k} ${k === 1 ? 'person' : 'people'}`;
  const best = p.minimum;
  const base = `Keeping the order, ${plural(n)} cover${n === 1 ? 's' : ''} the work at a ${takt.toFixed(1)} s takt (${Math.round(p.efficiency * 100)}% balanced); no order could do it with fewer than ${plural(best)}.`;
  const against = n < current ? ` That is ${current - n} fewer than the ${current} working now.` : n > current ? ` That is ${n - current} more than the ${current} working now.` : ` That is the ${current} working now.`;
  const longer = p.over.length ? ` ${p.over.length} step${p.over.length === 1 ? ' is' : 's are'} longer than takt on ${p.over.length === 1 ? 'its' : 'their'} own.` : '';
  const heur = ' It is a good balance the order allows, found by ranked positional weight — not a proof that none is better.';
  return { text: base + against + longer + heur, tone: p.over.length ? 'r' : n > best ? 'a' : 'g' };
}
