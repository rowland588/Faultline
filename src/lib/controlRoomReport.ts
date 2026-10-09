/* THE CONTROL ROOM REPORT — every job on one page (docs/CONTROLROOM.md).
 *
 * Rowland, 1 October: "show the business a formal process, to show that I am
 * in control of the project." The control room answered that on the screen,
 * and only on the screen: every report was one job's. This is the page that
 * goes to the business — every job, in the three questions every page answers
 * (docs/SIMPLE.md): where each job is, why any is not where it should be, and
 * who owes what by when.
 *
 * Nothing new is read or worked out: it is the control room's own reading
 * (lib/portfolio), laid out for paper, so the page and the board cannot
 * disagree. Every job is always on it; the lists under them (who owes what,
 * what is late, what is due this week) step down until the page fits, each
 * saying how many more the control room holds. */
import { nameIn, type OnTargetTone } from './onTarget';
import { lateWhen, type JobItem, type Portfolio } from './portfolio';
import { niceDay } from './weeks';
import { criticalCount } from './critical';

export interface CrJob {
  name: string;
  /** "Stage gate", "6M", "Lever tree". */
  method: string;
  /** Where it is: "at Commission", "Handed over", a method's own word. */
  at?: string;
  word: string;
  tone: OnTargetTone;
  /** Why, in one line — the date and the counts (lib/onTarget brief). */
  why: string;
  critical?: string;
  next?: string;
  nextLate?: boolean;
  late: number;
  outstanding: number;
}

export interface CrLine { job: string; what: string; who: string; when: string; late: boolean }

export interface ControlRoomReport {
  printed: string;
  says: string;
  totals: Portfolio['totals'];
  jobs: CrJob[];
  owes: { who: string; open: number; late: number; jobs: string }[];
  owesMore: number;
  late: CrLine[];
  lateMore: number;
  week: CrLine[];
  weekMore: number;
}

/** How long each list may run, longest first — the page steps down through
 *  these until it is one page. */
export interface CrLimits { owes: number; late: number; week: number;
  /** Each job's "Next:" line — among the last things to go. */
  next: boolean;
  /** Under each party, how much it owes on each job. */
  split: boolean;
  /** How long a thing's name runs on its one line. */
  name: number;
  /** A job's critical named on a line of its own — at the very last, its
   *  count joins the reason's line instead, so a busy board stays one page. */
  critical: boolean }
export const CR_STEPS: CrLimits[] = [
  { owes: 8, late: 10, week: 8, next: true, split: true, name: 80, critical: true },
  { owes: 6, late: 8, week: 6, next: true, split: true, name: 80, critical: true },
  { owes: 5, late: 6, week: 4, next: true, split: true, name: 70, critical: true },
  { owes: 4, late: 4, week: 3, next: true, split: true, name: 60, critical: true },
  { owes: 3, late: 3, week: 2, next: true, split: true, name: 60, critical: true },
  { owes: 3, late: 3, week: 0, next: false, split: true, name: 60, critical: true },
  { owes: 3, late: 2, week: 0, next: false, split: false, name: 50, critical: true },
  { owes: 2, late: 2, week: 0, next: false, split: false, name: 40, critical: true },
  { owes: 1, late: 1, week: 0, next: false, split: false, name: 40, critical: true },
  /* A board too busy for any list: every job, and where the lists are. */
  { owes: 0, late: 0, week: 0, next: false, split: false, name: 40, critical: true },
  { owes: 0, late: 0, week: 0, next: false, split: false, name: 40, critical: false },
];

/* A NAME, ON ONE LINE (lib/onTarget nameIn): this page is every job at once,
   so each thing named takes one line, and its whole name is in its own job's
   report — as the status report's one-line answer does. */

const line = (x: JobItem, today: string, NAME: number): CrLine => ({
  job: nameIn(x.job, 40), what: nameIn(x.what, NAME), who: nameIn(x.who || 'no one named', 40), late: x.late,
  when: x.late ? lateWhen(x, today) : x.on ? niceDay(x.on, { weekday: 'short' }) : x.kind === 'fix' ? 'no date agreed' : 'no date',
});

export function controlRoomReport(pf: Portfolio, today: string, limits: CrLimits = CR_STEPS[0]): ControlRoomReport {
  const NAME = limits.name;
  const jobs: CrJob[] = pf.jobs.map(v => ({
    name: nameIn(v.name, 60), method: v.methodLabel,
    at: v.method === 'commissioning' ? (v.at === 'Handed over' ? 'Handed over' : v.at ? `at ${v.at}` : undefined) : undefined,
    word: v.onTarget?.word ?? (v.late ? 'Behind' : 'Under way'),
    tone: v.onTarget?.tone ?? (v.late ? 'behind' : 'none'),
    /* A 6M or lever tree job is judged on its lines; what it owes that is
       late is said beside it, so "On target" never hides five late things. */
    why: [v.onTarget?.brief ?? v.onTarget?.reason ?? v.sentence, v.method !== 'commissioning' && v.late ? `${v.late} late` : '',
      !limits.critical && v.critical.length ? criticalCount(v.critical.length) : ''].filter(Boolean).join(' · '),
    ...(v.critical[0] && limits.critical ? { critical: `${criticalCount(v.critical.length)}: ${nameIn(v.critical[0].what, NAME)}${v.critical.length > 1 ? ` and ${v.critical.length - 1} more` : ''}` } : {}),
    ...(v.next && limits.next ? {
      next: `${nameIn(v.next.what, NAME)}${v.next.who ? ` · ${nameIn(v.next.who, 40)}` : ''}${v.next.on ? ` · ${v.next.late ? 'was ' : ''}${niceDay(v.next.on)}` : ''}`,
      nextLate: v.next.late,
    } : {}),
    late: v.late, outstanding: v.outstanding,
  }));
  const owes = pf.owes.map(o => ({
    who: o.kind === 'site' ? 'The site' : o.kind === 'nobody' ? 'No one named' : nameIn(o.who, 50),
    open: o.open, late: o.late,
    jobs: pf.jobs.length > 1 && limits.split ? o.byJob.map(b => `${nameIn(b.job, 30)}: ${b.open}`).join(' · ') : '',
  }));
  const late = pf.items.filter(x => x.late);
  const soon = pf.week.filter(x => !x.late);
  return {
    printed: niceDay(today, { year: true }),
    says: pf.says,
    totals: pf.totals,
    jobs,
    owes: owes.slice(0, limits.owes), owesMore: Math.max(0, owes.length - limits.owes),
    late: late.slice(0, limits.late).map(x => line(x, today, NAME)), lateMore: Math.max(0, late.length - limits.late),
    week: soon.slice(0, limits.week).map(x => line(x, today, NAME)), weekMore: Math.max(0, soon.length - limits.week),
  };
}
