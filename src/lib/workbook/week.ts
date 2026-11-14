/* THE WORKBOOK'S OWN WEEK (14 November, docs/WORKBOOKS.md — "reading by financial week"). A factory's week is whatever its business says
 * it is — Sunday to Saturday, a Monday start, a financial week with a number — and a calendar week (ISO) read over it splits its weeks
 * in two. The week is found from the DATES, never from a heading alone: a date column whose dates all fall on one weekday is a week
 * column — a week ENDING or a week COMMENCING by its heading, else by a second such column on the same sheet six days on (a calendar:
 * start and end), else by the day itself (a Monday starts a week; any other day ends one). The weekday most such columns agree on is
 * the workbook's week. A text column that names each week — one name a date, one date a name — gives the workbook's own NAMES for its
 * weeks ("WC 29-Jun (FY26 Wk 49)"). It is a reading, said as one; a workbook with no such column is grouped by ISO weeks as before. */
import { Kind, chunkKey, unpackChunk, type WorkbookStore } from './store';
import type { ColumnProfile, SheetProfile } from './read';

export interface WorkWeek {
  /** The day the week ends on: 0 Sunday … 6 Saturday. */
  ends: number;
  /** The columns it was read from, and whether each holds the week's first day or its last. */
  from: { sheet: string; column: string; as: 'start' | 'end' }[];
  /** The workbook's own names for its weeks: the week's last day (YYYY-MM-DD) → the name. */
  names?: Record<string, string>;
  /** Where the names were read. */
  namedBy?: { sheet: string; column: string };
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY = 86_400_000;
const END = /\bend(ing|s)?\b|\bw\/?e\b|finish/i, START = /commenc|\bstart|\bbegin|\bw\/?c\b/i;
const WEEKISH = /w(ee)?k|\bw\/?[ce]\b|\bwc\b|\bwe\b|period|\bfy\b/i;
const NAMES_CAP = 600;

/** The weekday a date column keeps to, when it keeps to one: nearly every date on it, over a fortnight or more. */
function keptDay(c: ColumnProfile): number | undefined {
  if (c.type !== 'date' || !c.weekdays || c.counts.date < 4 || c.colour) return undefined;
  if ((c.max ?? 0) - (c.min ?? 0) < 14 * DAY) return undefined;
  const top = c.weekdays.indexOf(Math.max(...c.weekdays));
  return c.weekdays[top] >= c.counts.date * 0.97 ? top : undefined;
}

interface Found { sheet: SheetProfile; col: ColumnProfile; day: number; as: 'start' | 'end'; ends: number }
function weekColumns(sheets: readonly SheetProfile[]): Found[] {
  const out: Found[] = [];
  for (const s of sheets) {
    if (!s.read) continue;
    const kept = s.columns.map(col => ({ col, day: keptDay(col) })).filter((x): x is { col: ColumnProfile; day: number } => x.day !== undefined);
    for (const k of kept) {
      const pairEnd = kept.some(o => o !== k && (o.day - k.day + 7) % 7 === 6), pairStart = kept.some(o => o !== k && (k.day - o.day + 7) % 7 === 6);
      const name = k.col.named ? k.col.name : '';
      const as: 'start' | 'end' = END.test(name) ? 'end' : START.test(name) ? 'start' : pairEnd ? 'start' : pairStart ? 'end' : k.day === 1 ? 'start' : 'end';
      out.push({ sheet: s, col: k.col, day: k.day, as, ends: as === 'end' ? k.day : (k.day + 6) % 7 });
    }
  }
  return out;
}

/** The workbook's week, from its sheets' profiles — or nothing when no date column keeps to one weekday. */
export function weekOf(sheets: readonly SheetProfile[]): WorkWeek | undefined {
  const found = weekColumns(sheets);
  if (!found.length) return undefined;
  const votes = new Map<number, { n: number; dates: number }>();
  for (const f of found) { const v = votes.get(f.ends) ?? { n: 0, dates: 0 }; v.n += 1; v.dates += f.col.counts.date; votes.set(f.ends, v); }
  const ends = [...votes].sort((a, b) => b[1].n - a[1].n || b[1].dates - a[1].dates)[0][0];
  /* a column under a real heading before one whose "heading" is a row of data the reader took for one (a date's serial number) */
  const worded = (f: Found) => Number(f.col.named && !/^\d+(\.\d+)?$/.test(f.col.name.trim()));
  return { ends, from: found.filter(f => f.ends === ends).sort((a, b) => worded(b) - worded(a) || b.col.counts.date - a.col.counts.date).slice(0, 4).map(f => ({ sheet: f.sheet.name, column: f.col.name, as: f.as })) };
}

const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
/** The last day of the workbook's week a moment falls in. */
export const weekEnd = (ms: number, ends: number): number => { const d = Math.floor(ms / DAY); const wd = (((d % 7) + 7) % 7 + 4) % 7; return (d + ((ends - wd + 7) % 7)) * DAY; };
/** A week's key in an answer: its last day, and the workbook's own name for it when it has one. */
export const weekKey = (ms: number, w: WorkWeek): string => { const k = iso(weekEnd(ms, w.ends)); const n = w.names?.[k]; return n ? `w/e ${k} (${n})` : `w/e ${k}`; };
/** The last day of the week a key names. */
export const weekKeyEnd = (key: string): number | undefined => { const m = /^w\/e (\d{4}-\d{2}-\d{2})/.exec(key); return m ? Date.parse(m[1]) : undefined; };

/** The workbook's own names for its weeks: on a sheet the week was read from, a text column that says one name a date and one date a
 *  name. The sheet with the most names leads (a calendar); the others fill in what it does not hold. Read from the store, a chunk at a
 *  time. `epoch` puts back a first row the reader took for headings, when that heading is itself a date. */
export async function weekNames(store: WorkbookStore, sheets: readonly SheetProfile[], week: WorkWeek, str: readonly string[], epoch: number): Promise<Pick<WorkWeek, 'names' | 'namedBy'>> {
  const best: { sheet: string; column: string; names: Map<string, string> }[] = [];
  for (const f of week.from) {
    const s = sheets.find(x => x.name === f.sheet);
    const dc = s?.columns.find(c => c.name === f.column);
    if (!s || !dc) continue;
    const texts = s.columns.filter(c => !c.colour && c.type === 'text' && c.counts.text >= 4 && (c.distinct ?? NAMES_CAP + 1) <= NAMES_CAP && (c.distinct ?? 0) >= 4)
      .sort((a, b) => Number(WEEKISH.test(`${b.name} ${b.top?.[0]?.[0] ?? ''}`)) - Number(WEEKISH.test(`${a.name} ${a.top?.[0]?.[0] ?? ''}`)) || a.slot - b.slot).slice(0, 3);
    for (const tc of texts) {
      const byDate = new Map<number, number>(), byName = new Map<number, number>();
      let ok = true;
      for (let ch = 0; ch < s.chunks && ok; ch += 1) {
        const [tb, db] = await Promise.all([store.get(chunkKey(s.index, tc.slot, ch)), store.get(chunkKey(s.index, dc.slot, ch))]);
        if (!tb || !db) continue;
        const t = unpackChunk(tb), d = unpackChunk(db);
        for (let i = 0; i < Math.min(t.n, d.n); i += 1) {
          if (t.kinds[i] !== Kind.Str || d.kinds[i] !== Kind.Date) continue;
          const day = Math.floor(d.vals[i] / DAY) * DAY, id = t.vals[i];
          const was = byDate.get(day), wasName = byName.get(id);
          if ((was !== undefined && was !== id) || (wasName !== undefined && wasName !== day)) { ok = false; break; }
          byDate.set(day, id); byName.set(id, day);
        }
      }
      if (!ok || byDate.size < 4) continue;
      const names = new Map<string, string>();
      for (const [day, id] of byDate) { const n = (str[id] ?? '').trim(); if (n) names.set(iso(f.as === 'end' ? day : day + 6 * DAY), n.slice(0, 60)); }
      /* the row taken as headings: its date cell is a serial number under the date column, its name under the text column */
      const serial = Number(dc.name);
      if (tc.named && Number.isFinite(serial) && serial > 20_000 && serial < 80_000) { const day = Math.round(epoch + serial * DAY); names.set(iso(f.as === 'end' ? day : day + 6 * DAY), tc.name.slice(0, 60)); }
      best.push({ sheet: s.name, column: tc.name, names });
      break;
    }
  }
  if (!best.length) return {};
  best.sort((a, b) => b.names.size - a.names.size);
  const all = new Map<string, string>();
  for (const b of best) for (const [k, n] of b.names) if (!all.has(k) && all.size < NAMES_CAP) all.set(k, n);
  return { names: Object.fromEntries([...all].sort((a, b) => a[0].localeCompare(b[0]))), namedBy: { sheet: best[0].sheet, column: best[0].column } };
}
