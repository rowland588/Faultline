/* The colour a fix wears, and its words — one rule for the Fixes screen, a
 * frame on the walk and the client report, so the three never disagree. */
import { daysBetween, niceDay, todayISO } from './weeks';
import { isOverdue, outcomeWord, plannedEnd, type Test } from './testing';

const nice = (iso?: string): string => niceDay(iso) || '—';
const windowOf = (from?: string, to?: string, fmt = nice): string => {
  if (!from) return fmt(undefined);
  if (!to || to <= from) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
};

/* COLOUR SAYS WHERE IT STANDS. Rowland: "it's all the same colour. If
   something's done it should be green and outlined; out of date, red; coming
   close to its end date, amber; blue is okay." Close means the last day it
   was wanted is within this many days — today included. */
export const DUE_SOON_DAYS = 3;

export type FixTone = 'done' | 'late' | 'soon' | 'ahead' | 'notRun';

/** The colour a fix wears, and the words that go with it. */
export function fixTone(t: Test, today = todayISO()): { tone: FixTone; when: string } {
  if (t.outcome === 'passed') return { tone: 'done', when: `${outcomeWord(t)}${t.ranOn ? ` · ${niceDay(t.ranOn)}` : ''}` };
  /* Tried and did not fix it: the problem is still there, which is red. */
  if (t.outcome === 'failed') return { tone: 'late', when: `${outcomeWord(t)}${t.ranOn ? ` · ${niceDay(t.ranOn)}` : ''}` };
  if (t.outcome === 'notRun') return { tone: 'notRun', when: `${outcomeWord(t)}${t.ranOn ? ` · ${niceDay(t.ranOn)}` : ''}` };
  if (isOverdue(t, today)) return { tone: 'late', when: `Late · was ${windowOf(t.plannedFor, t.plannedTo, nice)}` };
  const end = plannedEnd(t);
  if (!end) return { tone: 'ahead', when: 'No date yet' };
  const left = daysBetween(today, end);
  if (left <= DUE_SOON_DAYS) {
    /* The DATE goes with "tomorrow" because this same line is printed on the
       client report: a sheet read three days later still says "tomorrow", and
       the day beside it is the only part that stays true. "Today" needs none
       — it is the day the sheet is printed. */
    return { tone: 'soon', when: left <= 0 ? 'Due today' : left === 1 ? `Due tomorrow · ${nice(end)}` : `Due in ${left} days · ${nice(end)}` };
  }
  return { tone: 'ahead', when: windowOf(t.plannedFor, t.plannedTo, nice) };
}

