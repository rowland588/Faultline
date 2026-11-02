/* THE WHY TREE — pure (knowledge/specs/FC-148-why-tree.md, part B).
 *
 * A cause is drilled with "why?". One why can have several true answers, a branch ends in a root (something that can
 * be put right so it does not come back) or at a root another branch already reached ("Same root as…"), and the
 * "five" is a prompt, never a limit. The five whys is a rule of thumb that "can be branched to yield multiple root
 * causes" (Wikipedia, Five whys; Mind Tools, 5 Whys; Kainexus) — that a branch can end at a root another branch
 * reached is Faultline's own way of drawing a systemic cause, said so on the page.
 *
 * A cause written before the tree is a CHAIN: no why has `of`, each answers the one before, the last is the root when
 * Cause.root says so. It reads as a tree of one branch; nothing is migrated, nothing is lost. Nothing here touches the
 * database or React: the screen, the paper and the tests read the same answer. No AI, no number invented — a count is
 * a count of what the team wrote. */
import { WHY_OF_CAUSE, type Cause, type Why } from './sixm';

type TreeCause = Pick<Cause, 'whys' | 'root'>;

export type WhyEnd = 'root' | 'same' | 'open' | 'goes-on';
export interface WhyNode { why: Why; depth: number; end: WhyEnd; children: WhyNode[]; sameAs?: WhyNode }
export interface WhyForest {
  /** The answers to the cause itself, in the order written. */
  top: WhyNode[];
  /** Written as a tree (any why has `of`); false for a chain written before it. */
  tree: boolean;
  /** Whys whose `of` pointed at nothing, or round in a circle — attached to the cause, never dropped. */
  repaired: string[];
  byId: Map<string, WhyNode>;
}

const filled = (whys: Why[]): Why[] => (whys ?? []).filter(w => (w.text ?? '').trim());
/** Is the cause written as a tree? */
export const isTree = (c: Pick<Cause, 'whys'>): boolean => (c.whys ?? []).some(w => w.of !== undefined);

/** The whys as a forest. A chain reads as one branch; an orphan or a circle is repaired by attaching to the cause. */
export function whyForest(c: TreeCause): WhyForest {
  const ws = filled(c.whys);
  const tree = ws.some(w => w.of !== undefined);
  const nodes = new Map<string, WhyNode>(ws.map(w => [w.id, { why: w, depth: 1, end: 'open' as WhyEnd, children: [] }]));
  const repaired: string[] = [];
  const top: WhyNode[] = [];
  const parentOf = new Map<string, string | null>();
  ws.forEach((w, i) => {
    if (!tree) { parentOf.set(w.id, i === 0 ? null : ws[i - 1].id); return; }
    if (w.of === undefined || w.of === WHY_OF_CAUSE) { parentOf.set(w.id, null); return; }
    parentOf.set(w.id, nodes.has(w.of) && w.of !== w.id ? w.of : (repaired.push(w.id), null));
  });
  /* a circle: following `of` upwards comes back to the why — break it at that why */
  for (const w of ws) {
    const seen = new Set<string>([w.id]);
    let p = parentOf.get(w.id) ?? null;
    while (p) {
      if (seen.has(p)) { parentOf.set(w.id, null); repaired.push(w.id); break; }
      seen.add(p);
      p = parentOf.get(p) ?? null;
    }
  }
  for (const w of ws) {
    const n = nodes.get(w.id);
    if (!n) continue;
    const p = parentOf.get(w.id);
    const parent = p ? nodes.get(p) : undefined;
    if (parent) parent.children.push(n); else top.push(n);
  }
  const setDepth = (n: WhyNode, d: number) => { n.depth = d; n.children.forEach(k => setDepth(k, d + 1)); };
  top.forEach(n => setDepth(n, 1));
  /* how each branch ends */
  for (const n of nodes.values()) {
    const target = n.why.sameAs ? nodes.get(n.why.sameAs) : undefined;
    if (n.why.root) n.end = 'root';
    else if (target && target !== n && target.why.root) { n.end = 'same'; n.sameAs = target; }
    else n.end = n.children.length ? 'goes-on' : 'open';
  }
  /* a chain's last why is its root when the cause says so (Cause.root, written before the tree) */
  if (!tree && c.root) {
    const last = ws.length ? nodes.get(ws[ws.length - 1].id) : undefined;
    if (last) last.end = 'root';
  }
  return { top, tree, repaired: [...new Set(repaired)], byId: nodes };
}

export interface RootReading { why: Why; branches: number }
export interface TreeReading {
  /** Where a branch ends: at a root, at a shared root, or open. */
  branches: number;
  /** Roots reached, a shared root counted once, with how many branches end at each. */
  roots: RootReading[];
  /** Branches that have not reached a root. */
  open: Why[];
  /** The deepest branch, in whys from the cause. */
  depth: number;
  /** One chain and nothing else: no branching. */
  single: boolean;
  repaired: string[];
}

/** Count the tree: a branch is where an answer ends; a branch that ends at a root, or at a root another branch
 *  reached, has reached one; the rest are open. A root's own children are ignored by the count (it ended there). */
export function readTree(c: TreeCause): TreeReading {
  const f = whyForest(c);
  const roots = new Map<string, RootReading>();
  const open: Why[] = [];
  let branches = 0, depth = 0;
  const walk = (n: WhyNode) => {
    if (n.end === 'root' || n.end === 'same') {
      branches++; depth = Math.max(depth, n.depth);
      const r = n.end === 'root' ? n : n.sameAs;
      if (r) { const got = roots.get(r.why.id); if (got) got.branches++; else roots.set(r.why.id, { why: r.why, branches: 1 }); }
      return;
    }
    if (!n.children.length) { branches++; depth = Math.max(depth, n.depth); open.push(n.why); return; }
    n.children.forEach(walk);
  };
  f.top.forEach(walk);
  const single = f.top.length <= 1 && ![...f.byId.values()].some(n => n.children.length > 1);
  return { branches, roots: [...roots.values()], open, depth, single, repaired: f.repaired };
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => WORDS[n] ?? String(n);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const trimEnd = (s: string) => s.trim().replace(/[.;:,\s]+$/, '');

/** The sentence under a cause: how many branches, how many roots, which are shared, what is open. */
export function treeSays(c: TreeCause): string {
  const r = readTree(c);
  if (r.branches === 0) return 'Nobody has asked why yet.';
  if (r.single) {
    const at = r.roots[0];
    return at
      ? `One chain, ${plural(r.depth, 'why')} deep — it reached a root: ${trimEnd(at.why.text)}.`
      : `One chain, ${plural(r.depth, 'why')} deep — it has not reached a root yet.`;
  }
  const head = `${plural(r.branches, 'branch', 'branches')}, ${plural(r.roots.length, 'root')}`;
  const bits: string[] = [];
  if (r.roots.length === 1) {
    const only = r.roots[0];
    bits.push(`${trimEnd(only.why.text)}${only.branches > 1 ? ` — shared by ${only.branches === r.branches ? (r.branches === 2 ? 'both' : `all ${word(r.branches)}`) : `${only.branches} of ${r.branches}`}` : ''}`);
  } else if (r.roots.length > 1) {
    const shared = r.roots.filter(x => x.branches > 1);
    if (shared.length) bits.push(shared.map(x => `${trimEnd(x.why.text)} — shared by ${x.branches}`).join('; '));
  }
  const tail = r.open.length ? `${bits.length ? '; ' : ' — '}${plural(r.open.length, 'branch', 'branches')} not yet at a root` : '';
  return `${head}${bits.length ? ` — ${bits.join('; ')}` : ''}${tail}.`.replace(/\s+/g, ' ');
}

/** The "therefore" test, branch by branch (docs/OPEX.md): each branch read back from where it ended up to the head of
 *  the fish — "<end>, therefore <the why before>" … "<cause>, therefore <problem>". Empty whys skipped. A chain gives
 *  one branch, the same lines `therefore` always gave. */
export function thereforeBranches(c: TreeCause & { text: string }, problemTitle: string): string[][] {
  const f = whyForest(c);
  const out: string[][] = [];
  const walk = (n: WhyNode, path: string[]) => {
    const here = [...path, trimEnd(n.why.text)];
    if (n.end === 'root' || n.end === 'same' || !n.children.length) { out.push(here); return; }
    n.children.forEach(k => walk(k, here));
  };
  f.top.forEach(n => walk(n, []));
  if (!out.length) out.push([]);
  const head = [trimEnd(problemTitle), trimEnd(c.text)].filter(Boolean);
  return out.map(p => {
    const chain = [...head, ...p];
    const lines: string[] = [];
    for (let i = chain.length - 1; i > 0; i--) lines.push(`${chain[i]}, therefore ${lowerFirst(chain[i - 1])}`);
    return lines;
  });
}
const lowerFirst = (s: string) => (s.length > 1 && /[a-z]/.test(s[1]) ? s[0].toLowerCase() + s.slice(1) : s);

/* ================================ editing ================================ */
/* Pure edits on the list of whys. A chain is turned into a tree (every why gets `of`) the first time it is
   branched, so the order the person wrote it in is the order it reads in. */

/** A chain written before the tree, as the same whys with `of` set. A tree is returned as it is. */
export function asTree(whys: Why[]): Why[] {
  if (whys.some(w => w.of !== undefined)) return whys;
  return whys.map((w, i) => ({ ...w, of: i === 0 ? WHY_OF_CAUSE : whys[i - 1].id }));
}

/** An answer under a why (or under the cause when `under` is WHY_OF_CAUSE). */
export function addAnswer(whys: Why[], under: string, id: string): Why[] {
  return [...asTree(whys), { id, text: '', of: under }];
}

/** Take a why out; the answers under it move up to what it answered, so nothing written is lost. */
export function dropAnswer(whys: Why[], id: string): Why[] {
  const t = asTree(whys);
  const gone = t.find(w => w.id === id);
  if (!gone) return whys;
  return t.filter(w => w.id !== id).map(w => (w.of === id ? { ...w, of: gone.of ?? WHY_OF_CAUSE } : w.sameAs === id ? { ...w, sameAs: undefined } : w));
}

/** Mark a why as a root (clearing a "same root as" it had), or take the mark off. */
export function setRoot(whys: Why[], id: string, root: boolean): Why[] {
  return asTree(whys).map(w => {
    if (w.id === id) return { ...w, root: root || undefined, ...(root ? { sameAs: undefined } : {}) };
    return !root && w.sameAs === id ? { ...w, sameAs: undefined } : w;
  });
}

/** "Same root as…": this why ends at a root another branch reached (or no longer, with `target` empty). */
export function setSameAs(whys: Why[], id: string, target: string | undefined): Why[] {
  return asTree(whys).map(w => (w.id === id ? { ...w, sameAs: target || undefined, ...(target ? { root: undefined } : {}) } : w));
}

/** Roots another branch could end at: marked roots, not the why itself, not on its own branch's way down. */
export function sharedRootChoices(c: TreeCause, id: string): Why[] {
  const f = whyForest(c);
  return [...f.byId.values()].filter(n => n.why.root && n.why.id !== id).map(n => n.why);
}

/** Keep the cause's own `root` flag true while any why is a root, so everything that reads it keeps working. */
export const hasRoot = (c: TreeCause): boolean => readTree(c).roots.length > 0 || (!isTree(c) && !!c.root);
