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
import { assetStateOf, isOverdue, isSettled, isTestFace, live, plannedEnd, titleOnMachine } from './testing';
import { jobJourney, journeyNow, type JourneyGate, type GateTone } from './install';
import type { Material } from './materials';
import { isHere } from './materials';
import type { Program } from './programs';
import { daysOverdue, stateOf } from './programs';
import { standing, slipWords, type PlanMark } from './standing';
import { layoutPlan, type PlacedMark, type PlanAxis } from './plan';
import { companies, resolver, type Company } from './names';
import type { PaceLineRow, PaceTodoRow } from '../db';
import { methodOf, planModel, type PlanModel } from './planModel';
import { isLate as stepIsLate } from './actions';
import { PILLARS } from './pillars';
import { remindersOf } from './reminders';

export interface JobInput {
  project: Project;
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
  assets: Asset[];
}

/** A 3P or lever tree job, as the control room reads it: the actions kept on
 *  its board, its lines, and how many of them are at target. Rowland: "turn it
 *  into a control room for change on your lines" — the board was a stage-gate
 *  board only, and a job on the other two methods did not appear on it. */
export interface PacedInput {
  project: Project;
  /** The board's actions — the project's next steps (lib/actions). */
  steps: PaceTodoRow[];
  lines: PaceLineRow[];
  /** Lines meeting their target, of the lines there is a target to judge. */
  atTarget: number;
  judged: number;
  /** Its meeting notes — for their reminders (lib/reminders). */
  notes?: TestItem[];
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
  /** Who it is filed under on the board: the supplier, spelled the way it is
   *  mostly typed; "The site" for anybody who is not a supplier; or nobody.
   *  Set by portfolio(). */
  party?: string;
  partyKind?: 'supplier' | 'site' | 'nobody';
  /** ISO. The day it is due by. */
  on?: string;
  late: boolean;
}

export interface JobView {
  id: string;
  /** Which kind of change this is — a stage-gate row leads with its gates, the
   *  others with the board's People, Plant and Process. */
  method: PlanModel;
  methodLabel: string;
  /** Lines at target, said in words, when there is a target to judge. */
  reach?: string;
  /** The board's three columns: what is open in each, and how it stands. */
  pillars: { key: string; label: string; open: number; tone: GateTone }[];
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
  /** The four gates across the job's machines, and the one it is at. What a
   *  row on the board leads with: "at Commission" says where a job is; "10
   *  open" added planned gate steps to things owed and said neither. */
  gates: { gate: JourneyGate; label: string; tone: GateTone }[];
  at: string;
}

export interface Owed {
  who: string;
  kind: 'supplier' | 'site' | 'nobody';
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
  /** Everything owed, on every job, late first — what a number or a party on
   *  the board opens into. */
  items: JobItem[];
  /** Reminders set on meeting notes, every job, gone first — a week ahead.
   *  Kept apart from `items`: a reminder is not something a party owes. */
  reminders: JobItem[];
  owes: Owed[];
  /** Suppliers typed more than one way — the records disagree with each other. */
  variants: Company[];
  totals: { jobs: number; outstanding: number; late: number; week: number };
  says: string;
}

const WEEK_DAYS = 7;

/** "Line 2B commissioning" is "Line 2B" on a board where every row is a
 *  commissioning job — the word said nothing and pushed the rest off the row. */
export function shortName(name: string): string {
  const s = name.replace(/\s*\bcommissioning\b\s*/i, ' ').replace(/\s+/g, ' ').trim();
  return s || name;
}

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const NOBODY = 'Nobody named';
export const SITE = 'The site';

/** Is this item filed under this party on the board? */
export const owedBy = (x: JobItem, who: string): boolean => x.party === who;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What each job owes, one row per thing — the same rules standing() counts
 *  by, so the board and each job's own verdict cannot disagree. */
export function jobItems(j: JobInput, today: string): JobItem[] {
  const p = j.project;
  const base = { jobId: p.id, job: shortName(p.name), color: p.color };
  const out: JobItem[] = [];
  for (const t of live(j.tests)) {
    const owed = !isSettled(t) || t.outcome === 'notRun';
    if (!owed) continue;
    out.push({
      ...base, kind: t.kind ?? 'test', id: t.id, what: titleOnMachine(t, j.tests, j.assets),
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
  /* Owed until it lands — the same rule standing() counts by. After that the
     machine is at a gate, and the gate is what the board shows. */
  for (const a of live(j.assets)) {
    if (assetStateOf(a) !== 'awaited') continue;
    out.push({
      ...base, kind: 'machine', what: a.name, who: a.oem ?? '',
      on: a.onSiteOn ? undefined : a.dueOn, late: !!a.dueOn && a.dueOn < today && !a.onSiteOn,
    });
  }
  return out;
}

/** What a 3P or lever tree job owes: every open action on its board. */
export function pacedItems(j: PacedInput, today: string): JobItem[] {
  const p = j.project;
  const base = { jobId: p.id, job: shortName(p.name), color: p.color };
  return j.steps.filter(s => s.state !== 'done').map(s => ({
    ...base, kind: 'action' as const, id: s.id, what: (s.what || '').trim() || 'An action',
    who: s.who ?? '', on: s.due, late: stepIsLate(s, today),
  }));
}

/** The actions with a day on them, as marks on the shared calendar. */
function pacedPlan(j: PacedInput, today: string): PlanMark[] {
  return j.steps.filter(s => !!s.due).map(s => ({
    kind: 'action' as const, at: s.due as string, label: (s.what || '').trim() || 'An action',
    tone: s.state === 'done' ? 'done' as const : stepIsLate(s, today) ? 'late' as const : 'booked' as const,
  }));
}

/** Where a 3P or lever tree job stands, in one sentence — the line the project's
 *  own front page leads with, said once here so the two cannot differ. */
export function pacedSays(a: { atTarget: number; judged: number; lines?: number; open: number; late: number; any: boolean }): string {
  const onTarget = a.judged > 0 ? `${a.atTarget} of ${a.judged} line${a.judged === 1 ? '' : 's'} at target` : '';
  const onBoard = !a.any ? ''
    : a.open === 0 ? 'nothing open on the board'
    : `${a.open} action${a.open === 1 ? '' : 's'} open${a.late ? ` — ${a.late} past ${a.late === 1 ? 'its' : 'their'} day` : ''}`;
  const said = [onTarget, onBoard].filter(Boolean).join(', with ');
  return said ? said.charAt(0).toUpperCase() + said.slice(1) + '.' : 'Nothing on the board yet.';
}

/** People, Plant and Process, each as a tile on the row: late if anything in it
 *  is, under way if anything is open, done when all of it is. */
function pacedPillars(j: PacedInput, today: string): JobView['pillars'] {
  return PILLARS.map(p => {
    const mine = j.steps.filter(s => s.pillar === p.key);
    const open = mine.filter(s => s.state !== 'done');
    const tone: GateTone = mine.length === 0 ? 'none'
      : open.some(s => stepIsLate(s, today)) ? 'late'
      : open.length > 0 ? 'going' : 'done';
    return { key: p.key, label: p.label, open: open.length, tone };
  });
}

const byUrgency = (a: JobItem, b: JobItem) =>
  Number(b.late) - Number(a.late) || (a.on ?? '￿').localeCompare(b.on ?? '￿') || a.what.localeCompare(b.what);

export function portfolio(unsorted: JobInput[], today: string, pacedIn: PacedInput[] = []): Portfolio {
  /* The job handing over first, first — that is the order they get asked
     about in. A job with no date yet goes last rather than first. Stage gate,
     3P and lever tree jobs stand in one order. */
  type Entry = { project: Project; plan: PlanMark[]; items: JobItem[]; gate?: { j: JobInput; st: ReturnType<typeof standing> }; paced?: PacedInput };
  const entries: Entry[] = [
    ...unsorted.map((j): Entry => {
      const st = standing({
        tests: j.tests, items: j.items, materials: j.materials, programs: j.programs, assets: j.assets,
        expectedAt: j.project.expectedAt, plannedAt: j.project.plannedAt, today,
      });
      return { project: j.project, plan: st.plan, items: jobItems(j, today), gate: { j, st } };
    }),
    ...pacedIn.map((j): Entry => ({ project: j.project, plan: pacedPlan(j, today), items: pacedItems(j, today), paced: j })),
  ];
  const when = (e: Entry) => e.project.expectedAt ?? e.project.plannedAt ?? '\uffff';
  entries.sort((a, b) => when(a).localeCompare(when(b)) || a.project.name.localeCompare(b.project.name));
  const inputs = entries.flatMap(e => (e.gate ? [e.gate.j] : []));

  /* ONE CALENDAR. Every date on every job goes into every job's layout, so
     the axis runs from the same month to the same month on all of them. */
  const span = [...new Set(entries.flatMap(e => [
    ...e.plan.flatMap(m => [m.at, ...(m.until ? [m.until] : [])]),
    ...[e.project.expectedAt, e.project.plannedAt].filter((d): d is string => !!d),
  ]))].sort();

  const layout = (marks: PlanMark[], p: Project) =>
    layoutPlan(marks, { today, expectedAt: p.expectedAt, plannedAt: p.plannedAt, span, minGap: 0 });

  const all = entries.map(e => e.items);
  const weekEnd = addDays(today, WEEK_DAYS);

  const jobs: JobView[] = entries.map((e, i) => {
    const p = e.project;
    const plan = layout(e.plan, p);
    const marks = plan.lanes.flatMap(l => l.rows.flat());
    const ats = marks.flatMap(m => [m.at, ...(m.until != null ? [m.until] : [])]);
    const ends = [...ats, ...(plan.axis.expected ? [plan.axis.expected.at] : []), ...(plan.axis.agreed ? [plan.axis.agreed.at] : [])];
    const items = all[i];
    const base = {
      id: p.id, method: planModel(p), methodLabel: methodOf(p).label,
      name: shortName(p.name), color: p.color, lead: p.lead,
      from: ats.length ? Math.min(...ats) : undefined,
      to: ends.length ? Math.max(...ends) : undefined,
      marks, axis: plan.axis, plan: e.plan,
      expectedAt: p.expectedAt, plannedAt: p.plannedAt,
      next: [...items].sort(byUrgency)[0],
    };
    if (e.paced) {
      const j = e.paced;
      const open = items.length, late = items.filter(x => x.late).length;
      const daysToGo = p.expectedAt
        ? Math.round((Date.parse(p.expectedAt + 'T12:00:00') - Date.parse(today + 'T12:00:00')) / 86_400_000) : undefined;
      return {
        ...base,
        sentence: pacedSays({ atTarget: j.atTarget, judged: j.judged, open, late, any: j.steps.length > 0 }),
        slip: undefined, daysToGo, outstanding: open, late,
        done: e.plan.filter(m => m.tone === 'done').length, total: e.plan.length,
        reach: j.judged > 0 ? `${j.atTarget} of ${j.judged} at target` : undefined,
        pillars: pacedPillars(j, today),
        gates: [], at: methodOf(p).label,
      };
    }
    const { j, st } = e.gate as NonNullable<Entry['gate']>;
    const gates = jobJourney(j.assets, j.tests, j.items, today, j.programs);
    return {
      ...base,
      sentence: st.sentence, slip: slipWords(st.slipDays), daysToGo: st.daysToGo,
      outstanding: st.outstanding, late: st.late,
      done: st.plan.filter(m => m.tone === 'done').length, total: st.plan.length,
      pillars: [], gates, at: journeyNow(gates),
    };
  });

  /* The calendar every row shares — any job's will do, they are the same
     from and to. An empty board still gets today, on a month of its own. */
  const axis: PlanAxis = jobs.find(v => v.axis.ticks.length)?.axis
    ?? layoutPlan([{ kind: 'test', at: today, label: '', tone: 'booked' }], { today }).axis;

  const week = all.flat().filter(x => x.late || (!!x.on && x.on >= today && x.on <= weekEnd)).sort(byUrgency);

  /* WHO OWES WHAT, ACROSS THE JOBS — by the same rules page 3 of the client
     report files it by, so the home board and the page a client reads say
     the same thing about the same job.
       - A SUPPLIER is anyone named as one: a machine's OEM, where a material
         or a program comes from, who a test is done with. A fix's "who" does
         not make a supplier — that is as often Dave on nights as the OEM.
       - Anybody else is THE SITE, with the person's name kept on the line.
       - Nobody at all is its own party: nobody owing something on two jobs is
         the thing most worth seeing.
     And one company is one name however it was typed (see lib/names): the
     home board grouped by the typed string and showed a real supplier as
     "Brilopak 8" and "Brillopak 6" — two companies, each owing part. */
  const supplierTyped: string[] = [];
  for (const j of inputs) {
    for (const a of live(j.assets)) if (a.oem) supplierTyped.push(a.oem);
    for (const m of live(j.materials)) if (m.from) supplierTyped.push(m.from);
    for (const pr of live(j.programs)) if (pr.from) supplierTyped.push(pr.from);
    /* A TEST's "done with" is the other side; a fix's or an install step's
       is whoever is doing it, which is as often the site's own fitter. */
    for (const t of live(j.tests)) if (isTestFace(t) && t.withWhom) supplierTyped.push(t.withWhom);
  }
  const allTyped = [...supplierTyped, ...all.flat().map(x => x.who)];
  const res = resolver(allTyped);
  const supplierSet = new Set(supplierTyped.map(n => res(n).toLowerCase()));
  for (const x of all.flat()) {
    const who = x.who.trim();
    if (!who) { x.party = NOBODY; x.partyKind = 'nobody'; }
    else if (supplierSet.has(res(who).toLowerCase())) { x.party = res(who); x.partyKind = 'supplier'; }
    else { x.party = SITE; x.partyKind = 'site'; }
  }
  /* The spellings that disagree: every supplier name typed anywhere, fixes
     included where they name a supplier. */
  const variants = companies([
    ...supplierTyped,
    ...all.flat().filter(x => x.partyKind === 'supplier').map(x => x.who),
  ]).filter(c => c.spellings.length > 1);

  const parties = new Map<string, Owed>();
  for (const x of all.flat()) {
    const party = x.party ?? NOBODY;
    let o = parties.get(party);
    if (!o) {
      o = { who: party, kind: x.partyKind ?? 'nobody', open: 0, late: 0, byJob: jobs.map(v => ({ jobId: v.id, job: v.name, color: v.color, open: 0, late: 0 })) };
      parties.set(party, o);
    }
    o.open += 1;
    if (x.late) o.late += 1;
    const slot = o.byJob.find(b => b.jobId === x.jobId);
    if (slot) { slot.open += 1; if (x.late) slot.late += 1; }
  }
  /* Suppliers first, whoever is furthest behind leading; then what nobody
     owns; the site last — the order page 3 reads in. */
  const rank = (o: Owed) => (o.kind === 'supplier' ? 0 : o.kind === 'nobody' ? 1 : 2);
  const owes = [...parties.values()]
    .map(o => ({ ...o, byJob: o.byJob.filter(b => b.open > 0) }))
    .sort((a, b) => rank(a) - rank(b) || b.late - a.late || b.open - a.open || a.who.localeCompare(b.who));

  const outstanding = jobs.reduce((n, v) => n + v.outstanding, 0);
  const late = jobs.reduce((n, v) => n + v.late, 0);

  /* Reminders on the jobs' meeting notes — the same rule the project page and
     the device notification read (lib/reminders). */
  const reminders: JobItem[] = entries.flatMap(e => {
    const notes = e.gate ? e.gate.j.items : e.paced?.notes ?? [];
    return remindersOf(notes, today).map(r => ({
      jobId: e.project.id, job: shortName(e.project.name), color: e.project.color,
      kind: 'note' as const, id: r.id, what: r.what, who: '', on: r.due, late: r.days < 0,
    }));
  }).sort(byUrgency);

  return {
    axis, span, jobs, week, owes, variants, items: all.flat().sort(byUrgency), reminders,
    totals: { jobs: jobs.length, outstanding, late, week: week.length },
    says: saysOf(jobs, owes, late),
  };
}

/** The whole board in one sentence, the way somebody would answer "how are
 *  the jobs going" in a corridor. */
function saysOf(jobs: JobView[], owes: Owed[], late: number): string {
  if (jobs.length === 0) return 'No job running yet.';
  const next = jobs
    .filter(v => v.daysToGo != null && v.daysToGo >= 0)
    .sort((a, b) => (a.daysToGo ?? 0) - (b.daysToGo ?? 0))[0];
  const bits = [plural(jobs.length, 'job') + ' running'];
  if (next) bits.push(`${next.name} hands over first, in ${plural(next.daysToGo ?? 0, 'day')}`);
  if (late === 0) return `${bits.join(' · ')}. Nothing is past its day.`;
  const top = [...owes].sort((a, b) => b.late - a.late)[0];
  const owner = top ? (top.kind === 'site' ? 'the site' : top.who) : '';
  const whose = top && top.late * 2 > late ? ` — ${top.late === late ? 'all' : `${top.late}`} of them ${owner}’s` : '';
  return `${bits.join(' · ')}. ${plural(late, 'thing')} past the day${whose}.`;
}

/* ---------- MARKS THAT FALL ON TOP OF EACH OTHER ----------
 *
 * Three things in the same few days drew as three dots in one place, and
 * nobody could tell them apart or hover the one underneath. Marks closer
 * than `gap` (a fraction of the calendar) are one dot with a number on it,
 * coloured by the most urgent thing inside it — a late ring beats a booked
 * one, whatever order they were drawn in. */
export interface Cluster { at: number; marks: PlacedMark[]; tone: PlacedMark['tone'] }

const URGENCY: Record<string, number> = { late: 0, failed: 1, ran: 2, booked: 3, done: 4 };

export function clusterMarks(marks: PlacedMark[], gap = 0.012): Cluster[] {
  const sorted = [...marks].sort((a, b) => a.at - b.at);
  const out: Cluster[] = [];
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && m.at - last.marks[0].at <= gap) {
      last.marks.push(m);
      if ((URGENCY[m.tone] ?? 9) < (URGENCY[last.tone] ?? 9)) last.tone = m.tone;
      last.at = (last.marks[0].at + m.at) / 2;
    } else {
      out.push({ at: m.at, marks: [m], tone: m.tone });
    }
  }
  return out;
}
