/* JUMP TO — every place a person goes, matched by what they type
 * (docs/upgrade-plan.md F3; the brief: "command palette and keyboard
 * shortcuts for switching line, period, tool"). Lines from the factory, jobs,
 * products, the tools and the control room's pages, scored by how well the
 * typed letters match: the start of a word first, then anywhere, then the
 * letters in order. Pure. */
import { APP_TOOLS } from '../catalogue/registry';

export interface Place { kind: 'line' | 'job' | 'product' | 'tool' | 'page'; label: string; sub?: string; href: string }

export const TOOL_PLACES: Place[] = [
  { kind: 'page', label: 'Home', sub: 'start a project or use a tool', href: '#/' },
  { kind: 'page', label: 'Control room', href: '#/room' },
  { kind: 'page', label: 'Problems — every line and project', href: '#/snags' },
  { kind: 'page', label: 'Lines — the factory’s', href: '#/factory' },
  { kind: 'page', label: 'Programs', href: '#/programs' },
  /* the app's tools, from the catalogue (src/catalogue/registry) — one list, not a fourth copy */
  ...APP_TOOLS.map(t => ({ kind: 'tool' as const, label: t.label, sub: t.onLine ?? t.says, href: `#${t.to}` })),
];

/* letters NFD leaves whole — Ł, Ø, ß, Æ — written the plain way */
const PLAIN: Record<string, string> = { ł: 'l', ø: 'o', ß: 'ss', æ: 'ae', œ: 'oe', đ: 'd', ı: 'i' };
const norm = (s: string) => s.toLowerCase().replace(/[łøßæœđı]/g, c => PLAIN[c] ?? c).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** How well `q` matches `text` — 0 when it does not. */
export function matchScore(q: string, text: string): number {
  const a = norm(q), b = norm(text);
  if (!a) return 1;
  if (b === a) return 100;
  if (b.startsWith(a)) return 80;
  if (b.split(' ').some(w => w.startsWith(a))) return 60;
  if (b.includes(a)) return 40;
  /* every typed word starts a word of it: "li ca" → "Line capacity" */
  const qs = a.split(' '), ws = b.split(' ');
  if (qs.length > 1 && qs.every(x => ws.some(w => w.startsWith(x)))) return 50;
  /* the letters in order: "lncp" → "line capacity" */
  let i = 0;
  for (const ch of b.replace(/ /g, '')) if (ch === a.replace(/ /g, '')[i]) i++;
  return i === a.replace(/ /g, '').length ? 10 : 0;
}

export function jumpTo(q: string, places: readonly Place[], max = 12): Place[] {
  const rank: Record<Place['kind'], number> = { line: 5, job: 4, page: 3, tool: 3, product: 2 };
  return places.map(p => ({ p, s: Math.max(matchScore(q, p.label), p.sub ? matchScore(q, p.sub) * 0.6 : 0) }))
    .filter(x => x.s > 0).sort((x, y) => y.s - x.s || rank[y.p.kind] - rank[x.p.kind] || x.p.label.localeCompare(y.p.label))
    .slice(0, max).map(x => x.p);
}
