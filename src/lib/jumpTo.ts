/* JUMP TO — every place a person goes, matched by what they type
 * (docs/upgrade-plan.md F3; the brief: "command palette and keyboard
 * shortcuts for switching line, period, tool"). Lines from the factory, jobs,
 * products, the tools and the control room's pages, scored by how well the
 * typed letters match: the start of a word first, then anywhere, then the
 * letters in order. Pure. */
export interface Place { kind: 'line' | 'job' | 'product' | 'tool' | 'page'; label: string; sub?: string; href: string }

export const TOOL_PLACES: Place[] = [
  { kind: 'page', label: 'Control room', href: '#/' },
  { kind: 'page', label: 'Control room problems', href: '#/snags' },
  { kind: 'page', label: 'Your factory', href: '#/factory' },
  { kind: 'page', label: 'Programs', href: '#/programs' },
  { kind: 'tool', label: 'Line capacity', sub: 'what each line can make', href: '#/balances' },
  { kind: 'tool', label: 'Line standard', sub: 'who stands where', href: '#/standards' },
  { kind: 'tool', label: 'Loss count', sub: 'a shift’s losses', href: '#/losses' },
  { kind: 'tool', label: 'SMED', sub: 'changeovers', href: '#/smed' },
  { kind: 'tool', label: 'Value stream', href: '#/value-stream' },
  { kind: 'tool', label: 'Work sampling', href: '#/sampling' },
  { kind: 'tool', label: 'Capability', href: '#/capability' },
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
