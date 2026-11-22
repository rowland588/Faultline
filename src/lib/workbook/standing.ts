/* WHAT A FILE SAYS, IN A LINE — LUNA'S STANDING PICTURE (21 November 2026, docs/LUNA-AGENT.md G3).
 *
 * Rowland, 21 November: "the path for the app is … Luna linked to data … no more analysis, Luna knows everything. Ask her a question."
 *
 * Every first look leaves a SNAPSHOT on the file's record (lib/workbook/sinceLast): the lead figure brought together, each month, the
 * groups of what it is split by — a few dozen numbers, worked in code, and synced with the record to every device. It was kept only to
 * compare the same report the next time it is read. Here it is SAID: the file's headline in a line, told to Luna with every question
 * (colleague/knows, colleague/turnRules conversationFocus) — so "what did we make in October" or "which line lost the most" is answered
 * at once, with no file attached, no sheet named and no step, on any device, whether or not the file's cells are on it.
 *
 * It says only what the snapshot holds, as the look brought it together: the lead figure added up, averaged or counted; the latest
 * months, a part month said as part; the groups of up to three things it is split by, what stands out first. It never extends them — a month it does not hold
 * is not said, a split too wide to say whole is said by its biggest with how many more there are, and one too wide to be a headline
 * (a product code, an order number) is left to be asked for. A snapshot taken before the kind of figure was kept (21 November) says
 * its numbers as they stand, "overall" — never as a total it may not be.
 * Pure. */
import { figure, ROWS } from './firstLook';
import type { LookSnap } from './sinceLast';

export const STANDING = {
  /** The latest months said; the earlier ones are counted. */
  months: 6,
  /** How many things it is split by are said — the ones whose groups stand furthest apart first. */
  splits: 3,
  /** A split with more groups than this is said by its biggest `shown`, the rest counted. */
  groups: 5, shown: 4,
  /** A split wider than this is no headline — it is asked for, not said. */
  widest: 12,
  /** The line is never longer than this. */
  chars: 620,
} as const;

const q = (x: string) => `“${x}”`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** A figure of the lead column as the first look writes it — or, on an older snapshot that does not say what kind of figure it is, the
 *  number as it stands. */
function fig(snap: LookSnap, v: number): string {
  if (snap.kind) return figure(v, snap.headline, snap.kind);
  /* rounded the way the first look rounds (firstLook figure), so the same number is never written two ways */
  const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
  return `${r < 0 ? '−' : ''}${/£|cost/i.test(snap.headline) ? '£' : ''}${Math.abs(r).toLocaleString('en-GB')}`;
}

type How = 'sum' | 'avg' | 'count' | 'unknown';
const howOf = (snap: LookSnap): How => (snap.agg === 'count' || snap.headline === ROWS ? 'count' : snap.agg === 'avg' ? 'avg' : snap.kind ? 'sum' : 'unknown');

/** THE LEAD: the figure and the rows it is over. A snapshot taken since 22 November says those rows itself (`over` — every row the
 *  look read, its basis and the person's rules applied). An older one kept only every row of the sheet, and where its figure was
 *  added up month by month its total left out the rows with no date — so its row count is said only where it is known to be the
 *  rows the figure is over: a figure is never said "over" rows it was not worked on (the review of 22 November). */
function lead(snap: LookSnap, how: How): string {
  const where = `${q(snap.sheet)}${snap.basis ? `, on the rows where ${snap.basis}` : ''}`;
  if (how === 'count') {
    /* an older count read under a basis kept every row of the sheet beside it: the count itself is the rows */
    const n = snap.over ?? (snap.basis && typeof snap.total === 'number' ? snap.total : snap.rows);
    return `${plural(n, 'row')} of ${where}`;
  }
  /* an older snapshot of a figure that is added up, with months: its total is the months added up — the dated rows */
  const dated = snap.over === undefined && how === 'sum' && snap.months.length > 0;
  const known = snap.over !== undefined ? snap.over : snap.basis || (how !== 'avg' && snap.months.length) ? undefined : snap.rows;
  const over = known !== undefined ? `over ${plural(known, 'row')} of ${where}` : `in ${where}${dated ? ' (its dated rows)' : ''}`;
  if (snap.total === null) return `${q(snap.headline)} ${over}`;
  const v = fig(snap, snap.total);
  return how === 'avg' ? `${q(snap.headline)} averages ${v} ${over}`
    : how === 'sum' ? `${q(snap.headline)} comes to ${v} ${over}`
    : `${q(snap.headline)} is ${v} overall, ${over}`;
}

function months(snap: LookSnap, most: number): string | undefined {
  const all = snap.months.filter(m => m.value !== null);
  if (!all.length) return undefined;
  const shown = all.slice(-most);
  const earlier = all.length - shown.length;
  const said = shown.map(m => `${m.label}${m.part ? ` (part, ${plural(m.days, 'day')})` : ''} ${fig(snap, m.value as number)}`).join(' · ');
  /* rows with no date are in the figure and in no month — said, so the months are never read as adding up to it */
  return `by month${snap.undated ? ` (${plural(snap.undated, 'row')} with no date ${snap.undated === 1 ? 'is' : 'are'} in no month)` : ''}: ${said}${earlier ? ` — and ${plural(earlier, 'earlier month')} from ${all[0].label}` : ''}`;
}

function split(snap: LookSnap, sp: LookSnap['splits'][number], how: How): string | undefined {
  const n = sp.groups.length;
  /* sixty is where the snapshot stops keeping groups — a split that wide may be cut, and is no headline either way */
  if (n < 2 || n > STANDING.widest) return undefined;
  /* an average is said highest first; anything added up or counted, biggest first whichever way it points */
  const ordered = [...sp.groups].sort((a, b) => (how === 'avg' ? b.value - a.value : Math.abs(b.value) - Math.abs(a.value)));
  const one = (g: { key: string; value: number }) => `${g.key} ${fig(snap, g.value)}`;
  if (n <= STANDING.groups) return `by ${q(sp.dim)}: ${ordered.map(one).join(' · ')}`;
  if (how === 'avg') return `by ${q(sp.dim)} (${n}): highest ${ordered.slice(0, 3).map(one).join(' · ')}; lowest ${one(ordered[n - 1])}`;
  return `by ${q(sp.dim)} (${n}): ${ordered.slice(0, STANDING.shown).map(one).join(' · ')} · and ${n - STANDING.shown} smaller`;
}

/** How far apart a split's groups sit, against the whole: the gap between its highest and lowest over the size of everything. */
function apart(snap: LookSnap, sp: LookSnap['splits'][number]): number {
  const vs = sp.groups.map(g => g.value);
  if (vs.length < 2) return 0;
  const whole = Math.abs(snap.total ?? vs.reduce((t, v) => t + v, 0)) || 1;
  return (Math.max(...vs) - Math.min(...vs)) / whole;
}

/** WHAT THE FILE SAYS — its headline in a line, from the snapshot its first look left. Nothing for a snapshot that is not one. */
export function snapSays(snap: LookSnap | undefined): string | undefined {
  if (!snap || typeof snap.headline !== 'string' || typeof snap.sheet !== 'string' || !Array.isArray(snap.months) || !Array.isArray(snap.splits)) return undefined;
  const how = howOf(snap);
  /* WHAT STANDS OUT IS SAID FIRST: the split whose groups sit furthest apart against the whole — one earning while another loses, a
     line carrying most of it — before one where every group is much the same (as the first look ranks them) */
  const said = snap.splits.map((sp, i) => ({ i, text: split(snap, sp, how), apart: apart(snap, sp) })).filter((x): x is { i: number; text: string; apart: number } => !!x.text)
    .sort((a, b) => b.apart - a.apart || a.i - b.i);
  const write = (nMonths: number, nSplits: number): string =>
    [lead(snap, how), months(snap, nMonths), ...said.slice(0, nSplits).map(x => x.text)].filter(Boolean).join('; ') + '.';
  /* too long: the splits go one by one from the last, then the earlier months, then the split that is left */
  for (const [m, s] of [[STANDING.months, STANDING.splits], [STANDING.months, 2], [STANDING.months, 1], [3, 1], [3, 0], [1, 0]] as const) {
    const out = write(m, s);
    if (out.length <= STANDING.chars) return out;
  }
  return `${lead(snap, how)}.`.slice(0, STANDING.chars);
}
