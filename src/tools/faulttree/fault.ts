/* FAULT TREE ANALYSIS — what combinations of failures cause the top event (FC-152; knowledge/specs/FC-152-fault-tree.md; knowledge/methods/rca/fault-tree.md;
 * IEC 61025 — AND and OR gates, minimal cut sets, the probability of the top event).
 *
 * A tree of rows: one TOP EVENT, gates under it (AND: all of the causes below must happen; OR: any one), and BASIC EVENTS at the leaves, each with a probability for
 * the same period. A leaf may be marked the SAME as another leaf (one cause that appears under two gates), so a shared cause is counted once. The module expands the
 * tree to its MINIMAL CUT SETS (the smallest combinations of basic events that cause the top event — top-down, MOCUS, with absorption), and gives the top event's
 * probability EXACTLY for independent events (Shannon factoring over the cut sets) beside the two usual bounds (the rare-event sum and the min-cut upper bound),
 * the Birnbaum and Fussell–Vesely importance of each event, and the single-point failures. Pure; the page and the paper read this module. */
import type { ScoredRow, TreeData } from '../../lib/study';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredContext, ScoredRanked, ScoredResult, ScoredTable } from '../scored/types';

export type Gate = 'AND' | 'OR';
const MAX_CUTS = 4000, MAX_EVENTS = 60;
const plural = (n: number, one: string, many = `${one}s`): string => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const gbp = (v: number): string => `£${v.toLocaleString('en-GB', { maximumFractionDigits: v < 100 ? 2 : 0 })}`;
const valid = (p: number | undefined): p is number => p !== undefined && Number.isFinite(p) && p >= 0 && p <= 1;

/** A probability as the floor reads it: a percentage down to one in ten thousand, below that scientific. */
export function pWords(p: number): string {
  if (p === 0) return '0';
  if (p >= 0.0001) return `${(p * 100).toLocaleString('en-GB', { maximumSignificantDigits: 3 })}%`;
  return p.toExponential(2);
}

export interface Node {
  id: string; name: string; parent?: string; kids: string[]; gate?: Gate; leaf: boolean; p?: number; /** the leaf this one stands for */ same?: string; depth: number; no: number;
}
export interface Tree { nodes: Node[]; byId: Map<string, Node>; top?: Node; problems: string[] }

/** The rows as a tree: depth first, in the order typed. */
export function buildTree(rows: ScoredRow[]): Tree {
  const nodes: Node[] = rows.map((r, i) => ({ id: r.id, name: r.name.trim(), ...(r.tree?.parent ? { parent: r.tree.parent } : {}), kids: [], leaf: true, ...(valid(r.tree?.p) ? { p: r.tree?.p } : {}), ...(r.tree?.same ? { same: r.tree.same } : {}), depth: 0, no: i + 1,
    ...(r.tree?.gate === 'AND' || r.tree?.gate === 'OR' ? { gate: r.tree.gate } : {}) }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const problems: string[] = [];
  for (const n of nodes) { if (n.parent && !byId.has(n.parent)) { problems.push(`“${n.name || `row ${n.no}`}” sits under a cause that no longer exists.`); delete n.parent; } }
  for (const n of nodes) { if (n.parent) byId.get(n.parent)?.kids.push(n.id); }
  for (const n of nodes) { n.leaf = n.kids.length === 0; if (!n.leaf && !n.gate) n.gate = 'OR'; }
  const roots = nodes.filter(n => !n.parent && (n.name || n.kids.length));
  /* a cycle: walking up from a node never reaches a root */
  for (const n of nodes) { let c: Node | undefined = n, steps = 0; while (c?.parent && steps <= nodes.length) { c = byId.get(c.parent); steps++; } if (steps > nodes.length) { problems.push('The tree loops back on itself — a cause cannot sit under its own effect.'); break; } }
  if (roots.length === 0) problems.push('Name the top event — the failure the tree explains, e.g. “Metal reaches a consumer in a pack”.');
  if (roots.length > 1) problems.push(`There are ${roots.length} top events — a tree has one; put the others under it as causes.`);
  const top = roots[0];
  const walk = (n: Node, d: number, seen: Set<string>) => { if (seen.has(n.id)) return; seen.add(n.id); n.depth = d; for (const k of n.kids) { const c = byId.get(k); if (c) walk(c, d + 1, seen); } };
  if (top && problems.length === (roots.length > 1 ? 1 : 0)) walk(top, 0, new Set());
  return { nodes, byId, ...(top ? { top } : {}), problems };
}

/** The leaf a basic event stands for — itself, or the leaf it is marked the same as. */
export function identity(t: Tree, n: Node): Node {
  let c = n, steps = 0;
  while (c.same && steps++ < 8) { const o = t.byId.get(c.same); if (!o || !o.leaf || o.id === c.id) break; c = o; }
  return c;
}

type Cut = string[];   /* sorted ids of basic events */
const key = (c: Cut): string => c.join('|');
function minimal(cuts: Cut[]): Cut[] {
  const uniq = [...new Map(cuts.map(c => [key(c), c])).values()].sort((a, b) => a.length - b.length || key(a).localeCompare(key(b)));
  const out: Cut[] = [];
  for (const c of uniq) { const set = new Set(c); if (!out.some(o => o.every(e => set.has(e)))) out.push(c); }
  return out;
}
/** The minimal cut sets, top-down; `undefined` when the combinations outgrow what a page can hold. */
export function cutSets(t: Tree): Cut[] | undefined {
  if (!t.top) return [];
  const seen = new Set<string>();
  const go = (n: Node): Cut[] | undefined => {
    if (seen.has(n.id)) return [];
    if (n.leaf) return [[identity(t, n).id]];
    seen.add(n.id);
    const kids = n.kids.map(k => t.byId.get(k) as Node).filter(Boolean).filter(k => k.name || k.kids.length).map(go);
    seen.delete(n.id);
    if (kids.some(k => k === undefined)) return undefined;
    const ks = kids as Cut[][];
    if (!ks.length) return [];
    let acc: Cut[];
    if (n.gate === 'OR') acc = minimal(ks.flat());
    else {
      acc = ks[0];
      for (let i = 1; i < ks.length; i++) {
        const next: Cut[] = [];
        for (const a of acc) for (const b of ks[i]) next.push([...new Set([...a, ...b])].sort());
        acc = minimal(next);
        if (acc.length > MAX_CUTS) return undefined;
      }
    }
    return acc.length > MAX_CUTS ? undefined : acc;
  };
  return go(t.top);
}

/** P(any cut set wholly true), independent events, exact — Shannon factoring over the cut sets. */
export function topProbability(cuts: Cut[], p: Map<string, number>, fixed: Map<string, 0 | 1> = new Map()): number {
  const memo = new Map<string, number>();
  const solve = (cs: Cut[]): number => {
    if (cs.length === 0) return 0;
    if (cs.some(c => c.length === 0)) return 1;
    const id = cs.map(key).sort().join('/');
    const hit = memo.get(id); if (hit !== undefined) return hit;
    /* the event in most cut sets splits the problem */
    const count = new Map<string, number>(); for (const c of cs) for (const e of c) count.set(e, (count.get(e) ?? 0) + 1);
    let best = '', n = -1; for (const [e, c] of count) if (c > n || (c === n && e < best)) { best = e; n = c; }
    const pe = p.get(best) ?? 0;
    const yes = minimal(cs.map(c => c.filter(e => e !== best))), no = cs.filter(c => !c.includes(best));
    const v = pe * solve(yes) + (1 - pe) * solve(no);
    memo.set(id, v); return v;
  };
  let cs = cuts;
  if (fixed.size) {
    cs = cuts.filter(c => !c.some(e => fixed.get(e) === 0)).map(c => c.filter(e => fixed.get(e) !== 1));
    cs = minimal(cs);
  }
  return solve(cs);
}

export interface Importance { id: string; name: string; p?: number; /** P(top | event certain) − P(top | event impossible) */ birnbaum?: number; /** the share of the top event’s probability that runs through this event */ fv?: number; cuts: number }
export interface CutRead { events: string[]; names: string[]; p?: number }
export interface FaultOut { result: ScoredResult; table: ScoredTable; ranked: ScoredRanked[]; tree: Tree; cuts: CutRead[]; single: string[]; top?: number; bounds?: { rare: number; upper: number }; importance: Importance[]; missing: string[] }

export function faultAnalyse(a: { rows: ScoredRow[]; ctx: ScoredContext }): { problems: string[] } | FaultOut {
  const t = buildTree(a.rows);
  if (t.problems.length || !t.top) return { problems: t.problems.length ? t.problems : ['Name the top event.'] };
  if (t.top.leaf) return { problems: ['Add the causes under the top event: an AND gate when all must happen, an OR gate when any one will do — then give each basic event a probability.'] };
  const inp = a.ctx.inputs ?? {};
  const raw = cutSets(t);
  if (!raw) return { problems: [`The tree has more than ${MAX_CUTS.toLocaleString('en-GB')} minimal combinations — too many to read; split it into smaller trees, one per branch of the top event.`] };
  if (!raw.length) return { problems: ['Add the causes under the top event: an AND gate or an OR gate with at least one basic event below it.'] };
  const events = [...new Set(raw.flat())];
  if (events.length > MAX_EVENTS) return { problems: [`The tree has ${events.length} basic events — more than ${MAX_EVENTS}; split it.`] };
  const nameOf = (id: string): string => t.byId.get(id)?.name || `event ${t.byId.get(id)?.no ?? '?'}`;
  const probs = new Map<string, number>(); const missing: string[] = [];
  for (const id of events) { const n = t.byId.get(id) as Node; if (valid(n.p)) probs.set(id, n.p); else missing.push(nameOf(id)); }
  const priced = missing.length === 0;
  const cuts: CutRead[] = raw.map(c => ({ events: c, names: c.map(nameOf), ...(c.every(e => probs.has(e)) ? { p: c.reduce((x, e) => x * (probs.get(e) as number), 1) } : {}) }))
    .sort((x, y) => x.events.length - y.events.length || (y.p ?? -1) - (x.p ?? -1) || x.names.join().localeCompare(y.names.join()));
  const single = cuts.filter(c => c.events.length === 1).map(c => c.names[0]);
  const top = priced ? topProbability(raw, probs) : undefined;
  const bounds = priced ? { rare: Math.min(1, cuts.reduce((x, c) => x + (c.p as number), 0)), upper: 1 - cuts.reduce((x, c) => x * (1 - (c.p as number)), 1) } : undefined;
  const importance: Importance[] = events.map(id => {
    const inC = raw.filter(c => c.includes(id));
    const base: Importance = { id, name: nameOf(id), ...(probs.has(id) ? { p: probs.get(id) } : {}), cuts: inC.length };
    if (!priced || !top) return base;
    const hi = topProbability(raw, probs, new Map([[id, 1]])), lo = topProbability(raw, probs, new Map([[id, 0]]));
    return { ...base, birnbaum: hi - lo, fv: topProbability(inC, probs) / top };
  }).sort((x, y) => (y.fv ?? -1) - (x.fv ?? -1) || y.cuts - x.cuts || x.name.localeCompare(y.name));
  const period = (a.ctx.inputs as { period?: string } | undefined)?.period?.trim();
  const cost = inp.eventCost;
  const smallest = Math.min(...cuts.map(c => c.events.length));
  const verdict = single.length ? `${plural(single.length, 'single point')}` : priced && top !== undefined ? `Top ${pWords(top)}` : `${plural(cuts.length, 'cut set')}`;
  const tone: LeanTone = single.length ? 'a' : 'n';
  const sentence = [
    `${t.top.name}: ${plural(cuts.length, 'minimal cut set')} from ${plural(events.length, 'basic event')} — the fewest events that can cause it is ${smallest}${single.length ? `, and ${single.length === 1 ? 'one event alone does it' : `${single.length} events each do it alone`}: ${single.slice(0, 3).join('; ')}` : ' (no single event does it alone)'}.`,
    priced && top !== undefined && bounds ? `The probability of the top event is ${pWords(top)}${period ? ` ${period}` : ''} (exact for independent events; the rare-event sum is ${pWords(bounds.rare)}, the upper bound ${pWords(bounds.upper)}).` : `Probabilities are missing for ${missing.slice(0, 3).join('; ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''} — the cut sets stand, the probability waits.`,
    importance[0]?.fv !== undefined ? `Most of it runs through ${importance[0].name} (${Math.round((importance[0].fv as number) * 100)}% of the probability)${importance[0].birnbaum !== undefined ? `; making it certain would raise the top event to ${pWords(topProbability(raw, probs, new Map([[importance[0].id, 1]])))}` : ''}.` : '',
  ].filter(Boolean).join(' ');
  const tiles: LeanTile[] = [
    { k: 'Basic events', v: String(events.length) },
    { k: 'Cut sets', v: String(cuts.length), of: `smallest ${smallest}` },
    { k: 'Single points', v: String(single.length), ...(single.length ? { tone: 'a' as LeanTone } : {}) },
    { k: 'Top event', v: top !== undefined ? pWords(top) : '—', of: top !== undefined ? (period ?? 'one period') : 'probabilities not all given' },
    { k: 'Weakest link', v: importance[0] ? importance[0].name : '—', ...(importance[0]?.fv !== undefined ? { of: `${Math.round((importance[0].fv as number) * 100)}% of it` } : {}) },
  ];
  const money: string[] = [];
  if (top !== undefined && cost !== undefined && cost > 0) money.push(`At ${gbp(cost)} an event, ${pWords(top)}${period ? ` ${period}` : ''} is an expected ${gbp(top * cost)}${period ? ` ${period}` : ''} (probability × cost) — a figure to weigh a control against, not a forecast.`);
  else if (top !== undefined) money.push('Give what one occurrence of the top event costs (a recall, a withdrawal, a complaint) to see it beside the probability. Nothing waits on it.');
  const lines: string[] = importance.filter(i => i.fv !== undefined).slice(0, 8).map(i => `${i.name} — ${Math.round((i.fv as number) * 100)}% of the top event, in ${plural(i.cuts, 'cut set')}; Birnbaum ${pWords(i.birnbaum as number)}${i.p !== undefined ? `; its own probability ${pWords(i.p)}` : ''}`);
  const closing = `${verdict} — ${plural(cuts.length, 'cut set')}, ${plural(events.length, 'basic event')}${single.length ? `, ${plural(single.length, 'single point')}` : ''}.`;
  const caveats = [
    'The probability is exact only if the basic events are independent and every probability is for the same period; a cause shared between two branches must be marked the same event, or it is counted twice. A tree is as complete as the team’s imagination — it explains the causes it lists.',
    'A basic event’s probability is typed, from a count, a log or a judgement; the tree does not estimate it. A judgement made up to fill a box makes the top probability a number with the look of a measurement and none of its worth.',
    'Only AND and OR gates are drawn (IEC 61025 also has voting, inhibit and priority gates); the tree is an outline, not a diagram; common-cause failure beyond a shared event is not modelled.',
    'The importance figures say where a control buys most, not what it costs; a single point is a place to look first, not necessarily a failure.',
  ];
  const result: ScoredResult = { verdict, tone, sentence, tiles, closing, caveats, ...(money.length ? { money } : {}),
    ...(lines.length ? { also: { title: 'Which events matter most', lines } } : {}),
    lists: [{ title: 'The minimal cut sets — every event in one must happen together', lines: [...cuts.slice(0, 40).map(c => `${c.names.join(' AND ')}${c.events.length === 1 ? ' (single point)' : ''}${c.p !== undefined ? ` — ${pWords(c.p)}` : ''}`), ...(cuts.length > 40 ? [`and ${cuts.length - 40} more — all of them are on the paper`] : [])] }] };
  const table: ScoredTable = {
    head: ['#', 'Minimal cut set — all must happen', 'Events', 'Probability'],
    rows: cuts.map((c, i) => [String(i + 1), c.names.join(' AND '), String(c.events.length), c.p !== undefined ? pWords(c.p) : '—']),
    foot: [], shares: [0.06, 0.66, 0.1, 0.18], columnIds: [],
  };
  const rankedOut: ScoredRanked[] = cuts.map((c, i) => ({ id: c.events.join('|'), name: c.names.join(' AND '), score: i + 1, class: c.events.length === 1 ? 'single' : 'combination' }));
  return { result, table, ranked: rankedOut, tree: t, cuts, single, ...(top !== undefined ? { top } : {}), ...(bounds ? { bounds } : {}), importance, missing };
}

export const faultStart = (uid: () => string): ScoredRow[] => [{ id: uid(), name: '', tree: { gate: 'OR' } }];
/** The rows in outline order (depth first, as typed) with each one's depth — for the page and the paper. */
export function outline(rows: ScoredRow[]): { row: ScoredRow; node: Node }[] {
  const t = buildTree(rows), out: { row: ScoredRow; node: Node }[] = [], by = new Map(rows.map(r => [r.id, r]));
  const seen = new Set<string>();
  const go = (n: Node) => { if (seen.has(n.id)) return; seen.add(n.id); out.push({ row: by.get(n.id) as ScoredRow, node: n }); for (const k of n.kids) { const c = t.byId.get(k); if (c) go(c); } };
  for (const n of t.nodes.filter(x => !x.parent)) go(n);
  for (const n of t.nodes) go(n);
  return out;
}
export type { TreeData };
