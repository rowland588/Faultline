/* WHAT WE ARE WAITING ON, READ FOR PAPER — a job's materials as one page
 * (lib/materialsPdf; screens/MaterialsScreen; docs/AUDIT.md, bar 3: "a page
 * that lists records offers its report").
 *
 * Rowland's words for why the list exists: "these are the films we require
 * with dates of arrival, or green arrived … this list is used as what we
 * need as a business." It is the sheet a supplier is chased with, and the
 * page had no paper of its own.
 *
 * The three questions, in their order (docs/SIMPLE.md): where we are — how
 * many are here of how many, in one line; why we are not where we should be
 * — the late ones named, how late, who is bringing each and why its date
 * moved when it did; what we are doing about it — what is still coming, by
 * the day it is due, and what has no date yet (somebody has to ask). What
 * is in is counted, and named once, quietly: normal recedes. */
import { byUrgency, daysLate, isHere, live, stateOf, tally, type Material, type MaterialState } from './materials';
import { daysBetween, niceDay, todayISO } from './weeks';
import { keyOf, storyOf } from './story';
import type { Test, TestItem } from './testing';

/** A day as the list says it: "21 Oct". */
const nice = (iso?: string): string => (iso ? niceDay(iso) || iso : '—');

/** How far off it is, in words — "3 days late", "in 4 days", "in on 3 Oct" —
 *  the list's own words (screens/MaterialsScreen), so the page and the paper
 *  say one thing. */
export function whenSaid(m: Material, today = todayISO()): string {
  if (isHere(m)) return m.inOn ? `in on ${nice(m.inOn)}` : 'in stock';
  if (!m.due) return 'no date';
  const late = daysLate(m, today);
  if (late != null) return late === 1 ? '1 day late' : `${late} days late`;
  const days = daysBetween(today, m.due);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

export interface MaterialPaperRow {
  what: string;
  /** How much, for which line, from whom: "10 reels · Line 2 · from Amcor". */
  facts: string;
  due: string;
  when: string;
  state: MaterialState;
  /** The last time its date moved and why — "moved 3 Oct → 10 Oct: supplier short of film". */
  moved?: string;
  note?: string;
}

export interface MaterialsReading {
  job: string;
  printed: string;
  /** "5 of 12 here". */
  headline: string;
  /** "3 late — the longest 12 days. 4 still coming, the next due 21 Oct. 1 with no date agreed." */
  says: string;
  late: MaterialPaperRow[];
  coming: MaterialPaperRow[];
  undated: MaterialPaperRow[];
  /** What is in, named once: "Finest Red 2kg film (in on 3 Oct)". */
  here: string[];
  total: number;
  /** The counts the page's tiles say (lib/stageGatePages materialTiles). */
  tally: { here: number; total: number; late: number; waiting: number; undated: number; nextDue?: string };
}

/** The materials read for paper, in the list's own order (late first, then
 *  coming, then undated, then in). `lineName` names a line by its id. */
export function materialsReading(x: {
  job: string; printed: string; materials: Material[]; lineName: (id?: string) => string | undefined;
  /** The job's tests and items — where a date's moves are kept (lib/story). */
  tests?: Test[]; items?: TestItem[]; today?: string;
}): MaterialsReading {
  const today = x.today ?? todayISO();
  const rows = byUrgency(live(x.materials), today);
  const t = tally(rows, today);
  const row = (m: Material): MaterialPaperRow => {
    const moves = x.tests && x.items ? storyOf(keyOf('material', m.id), x.tests, x.items).moves : [];
    const last = moves[moves.length - 1];
    return {
      what: m.what, due: m.due ? nice(m.due) : '—', when: whenSaid(m, today), state: stateOf(m, today),
      facts: [m.howMuch, x.lineName(m.lineId), m.from && `from ${m.from}`].filter(Boolean).join(' · '),
      ...(last ? { moved: `moved ${nice(last.from)} → ${nice(last.to)}${last.why.trim() ? `: ${last.why.trim()}` : ''}${moves.length > 1 ? ` (moved ${moves.length} times)` : ''}` } : {}),
      ...(m.note?.trim() ? { note: m.note.trim() } : {}),
    };
  };
  const late = rows.filter(m => stateOf(m, today) === 'late');
  const longest = Math.max(0, ...late.map(m => daysLate(m, today) ?? 0));
  const coming = rows.filter(m => stateOf(m, today) === 'waiting');
  const undated = rows.filter(m => stateOf(m, today) === 'undated');
  const says = [
    late.length ? `${late.length} late${late.length > 1 ? ` — the longest ${longest === 1 ? '1 day' : `${longest} days`}` : ''}.` : 'Nothing late.',
    coming.length ? `${coming.length} still coming${t.nextDue ? `, the next due ${nice(t.nextDue)}` : ''}.` : '',
    undated.length ? `${undated.length} with no date agreed.` : '',
  ].filter(Boolean).join(' ');
  return {
    job: x.job, printed: x.printed, total: t.total,
    tally: { here: t.here, total: t.total, late: t.late, waiting: t.waiting, undated: t.undated, ...(t.nextDue ? { nextDue: t.nextDue } : {}) },
    headline: t.total ? `${t.here} of ${t.total} here` : 'Nothing on the list yet',
    says: t.total ? says : 'Nothing is being waited on.',
    late: late.map(row), coming: coming.map(row), undated: undated.map(row),
    here: rows.filter(isHere).map(m => `${m.what}${m.inOn ? ` (in on ${nice(m.inOn)})` : ''}`),
  };
}
