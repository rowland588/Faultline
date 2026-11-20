/* STANDARD DATA — TIMED STEPS REUSED ACROSS PRODUCTS (FC-024; knowledge/specs/FC-024-standard-data.md, FC-032 §3
 * chosen 9, §6.7; ie.standard-data).
 *
 * Every new pack format has to be timed from scratch — unless a step on it was timed already on another product
 * of the same line. A step timed (or itself reused) on another product's newest balance is offered with its BASIC
 * time (observed × rating ÷ 100), the cycles it stood on, where it came from and when; used here it takes THIS
 * balance's allowance, says it is reused, and gives way to a timing made here — which then says how far apart the
 * two were (validation).
 *
 * THE SAME STEP TIMED ON SEVERAL PRODUCTS (20 November) is offered as ONE time: the mean of their timings when they
 * were timed at one count (or none), or — when the step's time grows with what it handles and it was timed at two or
 * more counts — the line's TIME FORMULA, basic = a + b × count, by least squares (timeFormula). Only steps TIMED feed
 * them: a typed, borrowed or worked-out time never does (spec chosen 1). The same step is the same kind of time and
 * the same words, numbers and "the" aside (chosen 2); the person judges the match from the products and dates shown.
 * Pure: the studies in, the rows out. */
import type { ReusedTime, TimedPoint, ToolStudy } from '../../lib/study';
import { balance, countWords, secs, timingsWords, type BalanceFigures } from './balance';
import { fitAt, fitPoints, type AtCount, type ElementFit } from './timeFormula';
import type { Tone } from '../capability/sample';
export { reuseSays, checkSays } from './balance';

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
  /** Timed on that product, or borrowed there from another (FC-024 — only a timed one is pooled or fitted). */
  source: 'timed' | 'library';
  /** How many it handles each cycle there, and of what. */
  count?: number;
  countOf?: string;
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
      /* a time pooled or worked out by a formula is not a timing — it is never offered or fed back */
      if (e.source === 'library' && st?.reuse?.from) continue;
      /* a reused step offers what it was first timed from, not a copy of a copy */
      const orig = e.source === 'library' && st?.reuse ? st.reuse : undefined;
      rows.push({ key: `${s.id}:${e.id}`, studyId: orig?.studyId ?? s.id, stepId: orig?.stepId ?? e.id, product: orig?.product ?? s.name, name: e.name, who: e.who,
        kind: e.kind, basic: e.basic, n: orig?.n ?? e.n, enough: orig?.enough ?? e.enough, at: orig?.at ?? s.startedAt, source: e.source,
        ...(e.count != null ? { count: e.count } : {}), ...(e.countOf ? { countOf: e.countOf } : {}) });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name) || a.product.localeCompare(b.product));
}

export const words = (t: string): string[] => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 2).map(w => w.replace(/(ing|ed|es|s)$/, '') || w);

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

/* ------------------------------------------------------------- pooled and fitted */

/** One step as the line knows it from several products: its timings, and the one time they make. */
export interface ElementGroup {
  key: string;
  name: string;
  kind: string;
  /** What the count is of, when the timings say ("packs"). */
  of?: string;
  points: TimedPoint[];
  fit?: ElementFit;
  /** Why the timings are not put together, when they are not. */
  why?: string;
}

/** The same step (chosen 2): the same words, numbers and "the" aside. */
export const nameKey = (name: string): string => words(name).filter(w => !/^\d+([.,]\d+)?$/.test(w) && w !== 'the').join(' ');

/** The steps TIMED on two or more of the line's other products, each as one group with its fit (spec §3 chosen 1–3).
 *  One product gives one timing a count (two of its own of one name and count are averaged). */
export function elementGroups(rows: readonly LibraryRow[]): ElementGroup[] {
  const by = new Map<string, LibraryRow[]>();
  for (const r of rows) {
    if (r.source !== 'timed' || !(r.basic > 0)) continue;
    const nk = nameKey(r.name);
    if (!nk) continue;
    const k = `${r.kind}|${nk}`;
    by.set(k, [...(by.get(k) ?? []), r]);
  }
  const out: ElementGroup[] = [];
  for (const [key, list] of by) {
    const per = new Map<string, LibraryRow[]>();
    for (const r of list) { const k = `${r.studyId}|${r.count ?? ''}`; per.set(k, [...(per.get(k) ?? []), r]); }
    const points: TimedPoint[] = [...per.values()].map(rs => ({ product: rs[0].product, ...(rs[0].count != null ? { count: rs[0].count } : {}),
      basic: rs.reduce((t, r) => t + r.basic, 0) / rs.length, cycles: rs.reduce((t, r) => t + r.n, 0), at: Math.max(...rs.map(r => r.at)), studyId: rs[0].studyId, stepId: rs[0].stepId }));
    if (points.length < 2) continue;
    points.sort((a, b) => (a.count ?? 0) - (b.count ?? 0) || a.product.localeCompare(b.product, 'en-GB', { numeric: true }));
    const newest = [...list].sort((a, b) => b.at - a.at)[0];
    const ofs = [...new Set(list.filter(r => r.count != null && r.countOf?.trim()).map(r => (r.countOf as string).trim().toLowerCase()))];
    const base = { key, name: newest.name, kind: newest.kind, points };
    if (ofs.length > 1) { out.push({ ...base, why: `counted in ${ofs.join(' on one product and ')} on another — not put on one line` }); continue; }
    const fit = fitPoints(points);
    out.push({ ...base, ...(ofs[0] ? { of: ofs[0] } : {}), ...(fit ? { fit } : {}) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The groups that match what was typed, as the rows do. */
export function matchGroups(groups: readonly ElementGroup[], query: string): ElementGroup[] {
  const q = words(query);
  if (!q.length) return [...groups];
  return groups.filter(g => { const hay = new Set([...words(g.name), ...g.points.flatMap(p => words(p.product))]); return q.every(w => hay.has(w)); });
}

const pmWords = (d: AtCount) => (d.margin != null ? `, ±${(d.margin * 100).toFixed(1)}% at 95%` : '');

/** "Place the packs — 4 products’ timings at 6 to 24 packs: basic = 1.15 + 0.71 × packs, R² 99.9%." · "Erect the case
 *  — the mean of 3 products’ timings: 4.2 s basic, spread 0.05 s, ±3.0% at 95%." */
export function groupSays(g: ElementGroup): { text: string; tone: Tone } {
  if (g.why || !g.fit) return { text: `${g.name} — ${g.why ?? 'not enough timings to put together'}.`, tone: 'a' };
  const f = g.fit, on = timingsWords(g.points);
  if (f.kind === 'pooled') {
    const d = fitAt(f) as AtCount;
    const at = f.at != null ? ` (all at ${countWords(f.at, g.of)})` : '';
    return { text: `${g.name} — the mean of ${on}${at}: ${secs(f.mean)} basic, spread ${f.sd.toFixed(2)} s${pmWords(d)}${d.enough ? '' : ', short of enough'}.`, tone: d.enough ? 'n' : 'a' };
  }
  const coef = (v: number) => (+v.toFixed(2)).toFixed(2);
  const left = f.left ? ` ${f.left} timing${f.left === 1 ? '' : 's'} without a count left out.` : '';
  const sure = f.r2 != null ? `, R² ${(f.r2 * 100).toFixed(1)}%` : ' — a line through two timings; a third count timed says how sure it is';
  return { text: `${g.name} — ${on} at ${countWords(f.lo)} to ${countWords(f.hi, g.of)}: basic = ${coef(f.a)} + ${coef(f.b)} × ${g.of ?? 'the count'}${sure}.${left}`, tone: 'n' };
}

/** What a formula gives at a count, in words, and whether it may be used there. */
export function atSays(g: ElementGroup, count?: number): { text: string; tone: Tone; usable: boolean; at?: AtCount } {
  if (!g.fit) return { text: '', tone: 'n', usable: false };
  if (g.fit.kind === 'pooled') { const d = fitAt(g.fit) as AtCount; return { text: '', tone: d.enough ? 'n' : 'a', usable: d.basic > 0, at: d }; }
  if (!(count != null && Number.isFinite(count) && count > 0)) return { text: `Type the count to work it out at.`, tone: 'n', usable: false };
  const d = fitAt(g.fit, count) as AtCount, c = countWords(count, g.of);
  if (!(d.basic > 0)) return { text: `The formula gives no time at ${c}.`, tone: 'a', usable: false, at: d };
  if (!d.inside) return { text: `At ${c}: ${secs(d.basic)} basic — beyond the ${countWords(g.fit.lo)} to ${countWords(g.fit.hi, g.of)} timed, a guess; time it.`, tone: 'a', usable: true, at: d };
  if (g.fit.se == null) return { text: `At ${c}: ${secs(d.basic)} basic — how sure is not known from two timings.`, tone: 'a', usable: true, at: d };
  return { text: `At ${c}: ${secs(d.basic)} basic${pmWords(d)}${d.enough ? '' : ', short of enough'}.`, tone: d.enough ? 'n' : 'a', usable: true, at: d };
}

/** A group as a borrowed step keeps it: the timings copied, so the time stands if a product is later deleted. */
export function reuseOfGroup(g: ElementGroup, count?: number): ReusedTime | undefined {
  const a = atSays(g, count);
  if (!g.fit || !a.usable || !a.at) return undefined;
  const at = g.fit.kind === 'pooled' ? g.fit.at : count;
  return { basicSec: a.at.basic, n: g.points.reduce((t, p) => t + p.cycles, 0), enough: a.at.enough, product: timingsWords(g.points), studyId: '', stepId: '',
    at: Math.max(...g.points.map(p => p.at)), from: { ...(g.of ? { of: g.of } : {}), ...(at != null ? { at } : {}), points: g.points.map(p => ({ ...p })) } };
}

/** "Rests on: Tray 6 at 6 packs 5.5 s (18 Nov), …" — the timings a pooled or fitted time stands on, for the paper. */
export const restsOn = (r: ReusedTime): string =>
  r.from ? `Rests on: ${r.from.points.map(p => `${p.product}${p.count != null ? ` at ${countWords(p.count, r.from?.of)}` : ''} ${secs(p.basic)} (${dayWords(p.at)})`).join(', ')}.` : '';

/** A timing's day as the floor writes it: "18 Nov". */
export const dayWords = (t: number): string => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
