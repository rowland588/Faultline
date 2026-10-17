/* THE CASE FOR THE CHANGE — and what it was worth (docs/CASE.md, BLUEPRINT
 * §6, 12). Rowland, 17 October: "at its core faultline is a project
 * management system". A job said when it hands over, never what it is FOR in
 * money; after the handover nothing said whether it paid.
 *
 * WHAT IS KEPT (Project.businessCase, the owner's — supabase/BUSINESS_CASE.sql):
 * what it is for in a sentence; each line's rate a minute before and the rate
 * it is for; the days it runs a week; the day it should start paying. What it
 * is worth is never kept — it is worked out here from the line's own shifts
 * less their breaks and its margin a pack (lib/lineLoss lineDay, the one cost
 * model), so a margin changed in Your factory changes the case everywhere.
 *
 * OFFERED, NEVER ASSUMED: a line's "to" is the typed rate, else the job's
 * target on its rate a minute, else the line's rated speed in Your factory;
 * its "from" the typed rate, else the job's first reading on the line. A new
 * line makes 0 today — typed, not guessed. The days a week are asked (the
 * SMED rule). Anything missing is named with where to give it.
 *
 * MEASURED: once the start day has come and a reading is taken on or after
 * it — (latest − from) × the same minutes × the same margin — and its share
 * of the case. A climb is not a failure: under the case is amber, at it green.
 *
 * Pure: records in, words out. */
import { fmtGBP } from './cost';
import type { LeanTone } from './lean';
import { lineDay, type DayFacts } from './lineLoss';
import { jobFactoryLines, type JobLine } from './lineRecords';
import { bySort, lineSeries, perMinuteMeasure, type Measure, type Period, type Reading, type Target } from './measures';
import { niceDay } from './weeks';

export interface CaseLine {
  /** The factory line (Workspace id). */
  lineId: string;
  /** Its rate a minute before the change — 0 for a line that makes nothing yet. */
  from?: number;
  /** The rate a minute it is for. */
  to?: number;
}

export interface BusinessCase {
  /** What the change is for, in the business's words. */
  why?: string;
  lines?: CaseLine[];
  /** The days the lines run a week — asked, never assumed. */
  daysAWeek?: number;
  /** The day it should start paying, ISO. Absent: the agreed handover. */
  startsOn?: string;
  /** Who agreed it, and when (ms). */
  agreedBy?: string;
  agreedAt?: number;
}

/** One of the job's lines, as the case reads it. */
export interface CaseLineFacts {
  id: string;
  name: string;
  /** Your factory's facts: rated speed, shifts, margin a pack. */
  facts: DayFacts;
  /** The job's rate-a-minute measure on the line: readings oldest first, its target. */
  series?: { points: { at: string; value: number }[]; target?: number; unit?: string };
}

/** THE JOB'S LINES AS THE CASE READS THEM — each factory line the job is on
 *  (lib/lineRecords jobFactoryLines), its facts from Your factory, and the
 *  job's rate-a-minute measure on it (lib/measures lineSeries, on the job's
 *  own line that stands on it). */
export function caseLinesOf(
  projectId: string,
  job: { measures?: Measure[]; periods?: Period[] },
  jobLines: readonly JobLine[],
  all: readonly (DayFacts & { id: string })[],
  targets: readonly Target[], readings: readonly Reading[],
  today: string,
): CaseLineFacts[] {
  const measures = bySort(job.measures ?? []), periods = bySort(job.periods ?? []);
  const m = perMinuteMeasure(measures);
  return jobFactoryLines(projectId, jobLines, all).map(w => {
    const on = jobLines.find(l => !l.deletedAt && l.projectId === projectId && l.workspaceId === w.id);
    const s = m && on ? lineSeries(measures, periods, [...targets], [...readings], on.id, m.id, today) : undefined;
    return {
      id: w.id, name: w.name, facts: w,
      ...(s ? { series: { points: s.points.map(p => ({ at: p.at, value: p.value })), ...(s.target != null ? { target: s.target } : {}), ...(m?.unit ? { unit: m.unit } : {}) } } : {}),
    };
  });
}

export type FromSays = 'typed' | 'its first reading';
export type ToSays = 'typed' | 'its target' | 'its rated speed';

export interface CaseLineRead {
  id: string;
  name: string;
  from?: number; fromSays?: FromSays;
  to?: number; toSays?: ToSays;
  /** Running minutes a day — its shifts less their breaks. */
  minutes?: number;
  perPack?: number;
  /** The margin a day the change is for (0 when it is for no more packs). */
  day?: number;
  /** The latest reading on or after the start, and what it is worth a day. */
  measured?: { value: number; at: string; day: number };
  /** What this line still needs, each with where to give it. */
  missing: string[];
}

export interface CaseRead {
  /** A case is written — a sentence, or a line's numbers. */
  written: boolean;
  why?: string;
  lines: CaseLineRead[];
  /** The job's lines added up, where priced. */
  day?: number;
  week?: number;
  days?: number;
  startsOn?: string;
  /** The start day has come. */
  started: boolean;
  /** What the lines measured since the start are worth — over the lines measured, against their case. */
  measured?: { day: number; week?: number; share: number; of: number };
  /** Everything still to give, each "Line 2: its shifts in Your factory". */
  missing: string[];
}

const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
/** A rate as a person says it: "120", "58.4". */
export const rate = (n: number): string => (Math.round(n * 10) / 10).toLocaleString('en-GB');

export function readCase(c: BusinessCase | undefined, lines: readonly CaseLineFacts[], today: string, handoverOn?: string): CaseRead {
  const startsOn = c?.startsOn ?? handoverOn;
  const started = !!startsOn && startsOn <= today;
  const days = ok(c?.daysAWeek) && (c?.daysAWeek as number) > 0 ? Math.min(7, c?.daysAWeek as number) : undefined;
  const read: CaseLineRead[] = lines.map(l => {
    const own = c?.lines?.find(x => x.lineId === l.id);
    const pts = l.series?.points ?? [];
    const from = ok(own?.from) ? { v: own?.from as number, s: 'typed' as const } : pts.length ? { v: pts[0].value, s: 'its first reading' as const } : undefined;
    const to = ok(own?.to) ? { v: own?.to as number, s: 'typed' as const }
      : ok(l.series?.target) ? { v: l.series?.target as number, s: 'its target' as const }
      : ok(l.facts.packsPerMin) && (l.facts.packsPerMin as number) > 0 ? { v: l.facts.packsPerMin as number, s: 'its rated speed' as const } : undefined;
    const ld = lineDay(l.facts);
    const per = ok(l.facts.marginPerPack) && (l.facts.marginPerPack as number) > 0 ? l.facts.marginPerPack as number : undefined;
    const missing = [
      from == null ? 'its rate before (in the case)' : '',
      to == null ? 'the rate it is for (in the case)' : '',
      ld.minutes == null ? 'its shifts' : '',
      per == null ? 'its margin a pack' : '',
    ].filter(Boolean);
    const priced = from != null && to != null && ld.minutes != null && per != null;
    const dayOf = (v: number) => Math.max(0, v - (from?.v ?? 0)) * (ld.minutes as number) * (per as number);
    const after = started && priced ? [...pts].reverse().find(p => p.at >= (startsOn as string)) : undefined;
    return {
      id: l.id, name: l.name,
      ...(from ? { from: from.v, fromSays: from.s } : {}), ...(to ? { to: to.v, toSays: to.s } : {}),
      ...(ld.minutes != null ? { minutes: ld.minutes } : {}), ...(per != null ? { perPack: per } : {}),
      ...(priced ? { day: dayOf(to?.v as number) } : {}),
      ...(after ? { measured: { value: after.value, at: after.at, day: dayOf(after.value) } } : {}),
      missing,
    };
  });
  const priced = read.filter(l => l.day != null);
  const day = priced.length ? priced.reduce((s, l) => s + (l.day as number), 0) : undefined;
  const meas = read.filter(l => l.measured && l.day != null);
  const mDay = meas.reduce((s, l) => s + (l.measured as { day: number }).day, 0);
  const mOf = meas.reduce((s, l) => s + (l.day as number), 0);
  /* where to give each: the rates in the case, the line's facts in Your factory */
  const missing = [
    ...read.filter(l => l.missing.length).map(l => {
      const inCase = l.missing.filter(m => m.includes('(in the case)')).map(m => m.replace(' (in the case)', ''));
      const inFactory = l.missing.filter(m => !m.includes('(in the case)'));
      return `${l.name}: ${and([...inCase.length ? [`${and(inCase)} in the case`] : [], ...inFactory.length ? [`${and(inFactory)} in Your factory`] : []])}`;
    }),
    ...(days == null && c?.lines?.length ? ['the days it runs a week, in the case'] : []),
  ];
  return {
    written: !!(c?.why?.trim() || c?.lines?.some(l => ok(l.from) || ok(l.to))),
    ...(c?.why?.trim() ? { why: c.why.trim() } : {}),
    lines: read,
    ...(day != null ? { day } : {}), ...(day != null && days != null ? { week: day * days } : {}),
    ...(days != null ? { days } : {}),
    ...(startsOn ? { startsOn } : {}), started,
    ...(meas.length && mOf > 0 ? { measured: { day: mDay, ...(days != null ? { week: mDay * days } : {}), share: mDay / mOf, of: mOf } } : {}),
    missing,
  };
}

/** The case in a line, under the band — on the job's front page, its
 *  one-page status and its full report: what it is for, what it is worth
 *  and, once it has started, what it is measured at. */
export interface CaseSays {
  /** "For the 4-pack contract" — the sentence, when written. */
  why?: string;
  /** "£18.4k a week of margin — Line 2 from 0 to 120 a minute, 5 days a week, from 1 Dec". */
  worth: string;
  /** "Measured since 1 Dec: £14.2k a week — 77% of the case". */
  measured?: string;
  tone: LeanTone;
}

export function caseSays(r: CaseRead): CaseSays | undefined {
  if (!r.written) return undefined;
  const per = r.week != null ? 'a week' : 'a day';
  const v = (n: number, w?: number) => fmtGBP(w ?? n);
  const lineWords = r.lines.filter(l => l.day != null)
    .map(l => `${l.name} from ${rate(l.from as number)} to ${rate(l.to as number)} a minute`);
  const from = r.startsOn ? `, from ${niceDay(r.startsOn)}` : '';
  const worth = !r.lines.length ? 'Not priced yet — the job has no line from Your factory yet'
    : r.day == null
    ? `Not priced yet — give ${and(r.missing)}`
    : `${v(r.day, r.week)} ${per} of margin — ${and(lineWords)}${r.days != null ? `, ${r.days} ${r.days === 1 ? 'day' : 'days'} a week` : ''}${from}${r.missing.length ? ` · still to give: ${and(r.missing)}` : ''}`;
  const m = r.measured;
  const measured = !r.started || r.day == null ? undefined
    : m ? `Measured since ${niceDay(r.startsOn as string)}: ${v(m.day, m.week)} ${per} — ${Math.round(m.share * 100)}% of the case`
    : `Nothing measured since ${niceDay(r.startsOn as string)} — take a reading on the line to say what it is making`;
  return {
    ...(r.why ? { why: r.why } : {}),
    worth,
    ...(measured ? { measured } : {}),
    tone: !r.started || r.day == null ? 'n' : m && m.share >= 1 ? 'g' : 'a',
  };
}
