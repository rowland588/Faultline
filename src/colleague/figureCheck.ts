/* EVERY FIGURE CHECKED (10 November, docs/LUNA-NEXT.md L1 — Rowland, agreeing the plan: "every number she says should be one you can
 * check"). Every number in a chat answer is looked for in what Faultline worked out in that answer (every capability's sentence and its
 * data, a result's shares of its total), what the person said, the conversation's subject and today — to the rounding it is written
 * at. A number found nowhere is a figure to check: marked in the words and counted beside them. Luna does arithmetic through work_out
 * (src/capabilities/workout), so a difference, a share or a per-week figure she needs is Faultline's too; a work_out that rested on a
 * figure nobody gave lends nothing (its data says backed: false).
 *
 * Not figures: whole numbers under 10 ("3 shifts", "the top 5"), a year, a time (13:42), a date (2026-11-10, 10/11), a label inside a
 * word or an id (Line3, R1a2b3c, P3), an ordinal (3rd). "About", "around", "roughly", "nearly", "almost", "over", "under" and "~" before
 * a figure allow it 3% either way — a rounded figure said as rounded is honest.
 * Pure. */

export interface FigureSource { says?: string; data?: unknown }
export interface FigureCheck {
  /** The figures in the answer that were looked for. */
  checked: number;
  /** Those found nowhere, as written. */
  unsure: string[];
}

/** A number as written: 1,716 · 12.5 · 41% · -3 · £4,704 (the £ is not part of it). */
const FIG = /(?<![\p{L}\d.,:/_-])-?\d{1,3}(?:,\d{3})+(?:\.\d+)?%?(?![\p{L}\d:/_]|-\d)|(?<![\p{L}\d.,:/_-])-?\d+(?:\.\d+)?%?(?![\p{L}\d:/_]|-\d|\.\d)/gu;
/* a number standing alone — never digits inside an id (459904f4-…, R1a2b3c), which would lend the check figures nobody gave */
const NUM = /(?<![\p{L}\d._]|\d,|[\p{L}\d]-)-?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\p{L}\d_])|(?<![\p{L}\d._]|[\p{L}\d]-)-?\d+(?:\.\d+)?(?![\p{L}\d_]|-[\p{L}\d])/gu;
const LOOSE = /(?:about|around|roughly|approximately|nearly|almost|over|under|more than|less than|some|~)\s*[£$€]?\s*$/i;

const toNum = (s: string): number => Number(s.replace(/[,%]/g, ''));

/** Every number in a text, read the one way ("1,716" is 1716). */
export function numbersIn(text: string): number[] {
  return (text.match(NUM) ?? []).map(toNum).filter(Number.isFinite);
}

/** Every number a value holds, deep — and a query result's shares of its own totals (what can honestly be read off it). */
function heldIn(v: unknown, out: number[], depth = 0): void {
  if (depth > 8 || v === null || v === undefined) return;
  if (typeof v === 'number') { if (Number.isFinite(v)) out.push(v); return; }
  if (typeof v === 'string') { for (const n of numbersIn(v)) out.push(n); return; }
  if (Array.isArray(v)) { for (const x of v.slice(0, 2000)) heldIn(x, out, depth + 1); return; }
  if (typeof v !== 'object') return;
  const o = v as Record<string, unknown>;
  if (o.backed === false) return;
  /* a result's groups: each value's share of the column's total, and the total */
  if (Array.isArray(o.groups) && Array.isArray(o.measures)) {
    const groups = o.groups as { values?: unknown[] }[];
    (o.measures as unknown[]).forEach((_m, mi) => {
      const vals = groups.map(g => (Array.isArray(g.values) && typeof g.values[mi] === 'number' ? g.values[mi] as number : null));
      const tot = vals.reduce<number>((s, x) => s + (x ?? 0), 0);
      if (tot) { out.push(tot); for (const x of vals) if (x !== null) out.push((x / tot) * 100); }
    });
  }
  for (const k of Object.keys(o).slice(0, 400)) heldIn(o[k], out, depth + 1);
}

/** The numbers Faultline holds for this answer: what each step said and gave, what the person said, the subject, today. */
export function heldNumbers(sources: readonly FigureSource[], said: readonly string[]): number[] {
  const out: number[] = [];
  for (const s of sources) {
    if (s.data && typeof s.data === 'object' && (s.data as { backed?: unknown }).backed === false) continue;
    if (s.says) heldIn(s.says, out);
    if (s.data !== undefined) heldIn(s.data, out);
  }
  for (const t of said) heldIn(t, out);
  return out;
}

/** The figures written in an answer and those none of its sources hold. */
export function checkFigures(text: string, sources: readonly FigureSource[], said: readonly string[]): FigureCheck {
  const held = heldNumbers(sources, said);
  const unsure: string[] = [];
  let checked = 0;
  for (const m of text.matchAll(FIG)) {
    const raw = m[0];
    const at = m.index ?? 0;
    const pct = raw.endsWith('%');
    const n = toNum(raw);
    if (!Number.isFinite(n)) continue;
    const after = text.slice(at + raw.length, at + raw.length + 3);
    if (/^(st|nd|rd|th)\b/i.test(after)) continue;
    if (!pct && Number.isInteger(n) && Math.abs(n) < 10) continue;
    if (!pct && Number.isInteger(n) && n >= 1990 && n <= 2100) continue;
    checked++;
    const dp = (raw.replace('%', '').split('.')[1] ?? '').length;
    const loose = LOOSE.test(text.slice(Math.max(0, at - 16), at));
    const tol = (h: number) => Math.max(0.5 * 10 ** -dp + 1e-9, loose ? Math.abs(h) * 0.03 : 0);
    const hit = held.some(h => Math.abs(h - n) <= tol(h) || Math.abs(Math.abs(h) - Math.abs(n)) <= 0.5 * 10 ** -dp + 1e-9 || (pct && h > 0 && h <= 1 && Math.abs(h * 100 - n) <= tol(h * 100)));
    if (!hit && !unsure.includes(raw)) unsure.push(raw);
  }
  return { checked, unsure: unsure.slice(0, 20) };
}

/** The answer's words cut into what is a figure to check and what is not — for marking them where they stand. */
export function markFigures(text: string, unsure: readonly string[]): { text: string; check: boolean }[] {
  if (!unsure.length) return [{ text, check: false }];
  const out: { text: string; check: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(FIG)) {
    if (!unsure.includes(m[0])) continue;
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), check: false });
    out.push({ text: m[0], check: true });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), check: false });
  return out;
}

/** The line under an answer: how many of its figures were checked, or how many to check. */
export function figuresSaid(c: Pick<FigureCheck, 'checked' | 'unsure'>): string | undefined {
  if (!c.checked) return undefined;
  if (!c.unsure.length) return c.checked === 1 ? 'Its figure is checked against Faultline’s working.' : `All ${c.checked} figures checked against Faultline’s working.`;
  return `${c.unsure.length} of ${c.checked} figure${c.checked === 1 ? '' : 's'} to check — not in Faultline’s working or what you said.`;
}
