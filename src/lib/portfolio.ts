/* EVERY JOB, ONE CALENDAR.
 *
 * Rowland: "What happens when I have multiple projects all going on? How do I
 * see that in one home? Line 2B commissioning, and next week Line 2A — how do
 * I manage each of them without going into everything?"
 *
 * The answer is not a new record. Each job already says where it stands —
 * standing() gives the sentence, the outstanding rows and the dated marks —
 * so this is those same answers laid side by side, on ONE calendar, so that
 * a month lands in the same place on every job and the weeks where two of
 * them pile onto the same people can be seen.
 *
 * Three things only a view across jobs can say, which is why it exists:
 *
 *   - what is due or late THIS WEEK, across everything, each item tagged with
 *     the job it belongs to;
 *   - who owes what ACROSS the jobs — "Ilapak owes 4 on 2B and 2 on 2A" is
 *     one conversation with Ilapak, not two;
 *   - where the jobs overlap, which is the Gantt.
 *
 * Pure: the screen loads the records and draws what comes back. Nothing here
 * reads a clock except through `today`.
 */
import type { Project } from '../types';
import type { Asset, Test, TestItem } from './testing';
import { isOverdue, isSettled, live, plannedEnd } from './testing';
import type { Material } from './materials';
import { isHere } from './materials';
import type { Program } from './programs';
import { daysOverdue, stateOf } from './programs';
import { standing, slipWords, type PlanMark } from './standing';
import { layoutPlan, type PlacedMark, type PlanAxis } from './plan';

export interface JobInput {
  project: Project;
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
  assets: Asset[];
}

/** One thing owed, on one job. */
export interface JobItem {
  jobId: string;
  job: string;
  color: string;
  kind: PlanMark['kind'];
  /** The record it opens: a test or fix id; absent for a list row. */
  id?: string;
  what: string;
  /** Who owes it, as typed. Empty is nobody. */
  who: string;
  /** ISO. The day it is due by. */
  on?: string;
  late: boolean;
}

export interface JobView {
  id: string;
  name: string;
  color: string;
  lead?: string;
  sentence: string;
  slip?: string;
  daysToGo?: number;
  outstanding: number;
  late: number;
  /** Marks that have happened, of all the marks with a date. */
  done: number;
  total: number;
  /** The job's own reach on the shared calendar, as fractions. */
  from?: number;
  to?: number;
  /** Every dated mark, placed on the shared calendar. */
  marks: PlacedMark[];
  axis: PlanAxis;
  /** Everything this job's timeline needs, for drawing it under the same
   *  calendar when the row is opened. */
  plan: PlanMark[];
  expectedAt?: string;
  plannedAt?: string;
  /** The next thing owed on this job, soonest first, late before anything. */
  next?: JobItem;
}

export interface Owed {
  who: string;
  open: number;
  late: number;
  /** Per job, in the jobs' order: how many this party owes on each. */
  byJob: { jobId: string; job: string; color: string; open: number; late: number }[];
}

export interface Portfolio {
  axis: PlanAxis;
  /** Every date on every job — pass it as `span` to draw one job under the
   *  same calendar as the rest. */
  span: string[];
  jobs: JobView[];
  /** Late, or due within the week, across every job. Late first. */
  week: JobItem[];
  owes: Owed[];
  totals: { jobs: number; outstanding: number; late: number; week: number };
  says: string;
}

const WEEK_DAYS = 7;

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const key = (s: string) => s.trim().toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What each job owes, one row per thing — the same rules standing() counts
 *  by, so the board and each job's own verdict cannot disagree. */
export function jobItems(j: JobInput, today: string): JobItem[] {
  const p = j.project;
  const base = { jobId: p.id, job: p.name, color: p.color };
  const out: JobItem[] = [];
  for (const t of live(j.tests)) {
    const owed = !isSettled(t) || t.outcome === 'notRun';
    if (!owed) continue;
    out.push({
      ...base, kind: t.kind === 'fix' ? 'fix' : 'test', id: t.id, what: t.title,
      who: t.withWhom ?? '', on: plannedEnd(t), late: isOverdue(t, today),
    });
  }
  for (const m of live(j.materials)) {
    if (isHere(m)) continue;
    out.push({ ...base, kind: 'material', what: m.what, who: m.from ?? '', on: m.due, late: !!m.due && m.due < today });
  }
  for (const pr of live(j.programs)) {
    if (stateOf(pr) === 'proved') continue;
    out.push({ ...base, kind: 'program', what: pr.what, who: pr.from ?? '', on: pr.testOn, late: daysOverdue(pr, today) != null });
  }
  for (const a of live(j.assets)) {
    if (a.state === 'running') continue;
    out.push({
      ...base, kind: 'machine', what: a.name, who: a.oem ?? '',
      on: a.onSiteOn ? undefined : a.dueOn, late: !!a.dueOn && a.dueOn < today && !a.onSiteOn,
    });
  }
  return out;
}

const byUrgency = (a: JobItem, b: JobItem) =>
  Number(b.late) - Number(a.late) || (a.on ?? '￿').localeCompare(b.on ?? '￿') || a.what.localeCompare(b.what);

export function portfolio(unsorted: JobInput[], today: string): Portfolio {
  /* The job handing over first, first — that is the order they get asked
     about in. A job with no date yet goes last rather than first. */
  const when = (j: JobInput) => j.project.expectedAt ?? j.project.plannedAt ?? '\uffff';
  const inputs = [...unsorted].sort((a, b) => when(a).localeCompare(when(b)) || a.project.name.localeCompare(b.project.name));
  const answers = inputs.map(j => ({
    j,
    st: standing({
      tests: j.tests, items: j.items, materials: j.materials, programs: j.programs, assets: j.assets,
      expectedAt: j.project.expectedAt, plannedAt: j.project.plannedAt, today,
    }),
  }));

  /* ONE CALENDAR. Every date on every job goes into every job's layout, so
     the axis runs from the same month to the same month on all of them. */
  const span = [...new Set(answers.flatMap(({ j, st }) => [
    ...st.plan.flatMap(m => [m.at, ...(m.until ? [m.until] : [])]),
    ...[j.project.expectedAt, j.project.plannedAt].filter((d): d is string => !!d),
  ]))].sort();

  const layout = (marks: PlanMark[], p: Project) =>
    layoutPlan(marks, { today, expectedAt: p.expectedAt, plannedAt: p.plannedAt, span, minGap: 0 });

  const all = inputs.map(j => jobItems(j, today));
  const weekEnd = addDays(today, WEEK_DAYS);

  const jobs: JobView[] = answers.map(({ j, st }, i) => {
    const p = j.project;
    const plan = layout(st.plan, p);
    const marks = plan.lanes.flatMap(l => l.rows.flat());
    const ats = marks.flatMap(m => [m.at, ...(m.until != null ? [m.until] : [])]);
    const ends = [...ats, ...(plan.axis.expected ? [plan.axis.expected.at] : []), ...(plan.axis.agreed ? [plan.axis.agreed.at] : [])];
    const items = all[i];
    return {
      id: p.id, name: p.name, color: p.color, lead: p.lead,
      sentence: st.sentence, slip: slipWords(st.slipDays), daysToGo: st.daysToGo,
      outstanding: st.outstanding, late: st.late,
      done: st.plan.filter(m => m.tone === 'done').length, total: st.plan.length,
      from: ats.length ? Math.min(...ats) : undefined,
      to: ends.length ? Math.max(...ends) : undefined,
      marks, axis: plan.axis, plan: st.plan,
      expectedAt: p.expectedAt, plannedAt: p.plannedAt,
      next: [...items].sort(byUrgency)[0],
    };
  });

  /* The calendar every row shares — any job's will do, they are the same
     from and to. An empty board still gets today, on a month of its own. */
  const axis: PlanAxis = jobs.find(v => v.axis.ticks.length)?.axis
    ?? layoutPlan([{ kind: 'test', at: today, label: '', tone: 'booked' }], { today }).axis;

  const week = all.flat().filter(x => x.late || (!!x.on && x.on >= today && x.on <= weekEnd)).sort(byUrgency);

  /* WHO OWES WHAT, ACROSS THE JOBS. Named as typed, grouped however it was
     typed; nobody at all is its own row, because "nobody" owing something on
     two jobs is the thing most worth seeing. */
  const parties = new Map<string, Owed>();
  for (const x of all.flat()) {
    const k = key(x.who) || '\u0000';
    let o = parties.get(k);
    if (!o) {
      o = { who: x.who.trim() || 'Nobody named', open: 0, late: 0, byJob: jobs.map(v => ({ jobId: v.id, job: v.name, color: v.color, open: 0, late: 0 })) };
      parties.set(k, o);
    }
    o.open += 1;
    if (x.late) o.late += 1;
    const slot = o.byJob.find(b => b.jobId === x.jobId);
    if (slot) { slot.open += 1; if (x.late) slot.late += 1; }
  }
  const owes = [...parties.values()]
    .map(o => ({ ...o, byJob: o.byJob.filter(b => b.open > 0) }))
    .sort((a, b) => b.late - a.late || b.open - a.open || a.who.localeCompare(b.who));

  const outstanding = jobs.reduce((n, v) => n + v.outstanding, 0);
  const late = jobs.reduce((n, v) => n + v.late, 0);

  return {
    axis, span, jobs, week, owes,
    totals: { jobs: jobs.length, outstanding, late, week: week.length },
    says: saysOf(jobs, owes, late),
  };
}

/** The whole board in one sentence, the way somebody would answer "how are
 *  the jobs going" in a corridor. */
function saysOf(jobs: JobView[], owes: Owed[], late: number): string {
  if (jobs.length === 0) return 'No commissioning job running yet.';
  const next = jobs
    .filter(v => v.daysToGo != null && v.daysToGo >= 0)
    .sort((a, b) => (a.daysToGo ?? 0) - (b.daysToGo ?? 0))[0];
  const bits = [plural(jobs.length, 'job') + ' running'];
  if (next) bits.push(`${next.name} hands over first, in ${plural(next.daysToGo ?? 0, 'day')}`);
  if (late === 0) return `${bits.join(' · ')}. Nothing is past its day.`;
  const top = owes.find(o => o.late > 0);
  const whose = top && top.late * 2 > late ? ` — ${top.late === late ? 'all' : `${top.late}`} of them ${top.who}’s` : '';
  return `${bits.join(' · ')}. ${plural(late, 'thing')} past the day${whose}.`;
}
