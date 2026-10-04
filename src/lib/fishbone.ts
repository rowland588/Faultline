/* THE FISHBONE ENGINE — a problem's six bones, filled from what the line
 * already knows (docs/SIXM.md, "How it flows", step 3).
 *
 * Pure: plain records in, plain views out. Nothing here touches the database
 * or React, so the screens (through lib/useProblems.ts) and the client report
 * (which builds its views without a hook) read exactly the same answer.
 *
 * WHAT IS DERIVED AND WHAT IS STORED. A suggestion is worked out every time
 * from the records it points at — the timed stops, the walk, the standard, the
 * line balance, the materials, the programs, the gaps in the log, the notes —
 * and is never stored. Accepting one saves a Cause on the problem carrying the
 * suggestion's `source`; from then on that source is recognised and the
 * suggestion is not offered again.
 *
 * THE NUMBERS. A week is a calendar week from Monday (lib/stats weekStart, the
 * same edge weeklyLoss and a Case's baseline use). "Minutes a week" and "hours
 * a week" are the average over the last FOUR FULL weeks — the current, partial
 * week never counts towards a weekly figure, so a Tuesday cannot read as a
 * miraculous improvement. Evidence for a suggestion (which stops, how many)
 * includes the current week too, so something timed this morning is seen.
 */
import type { Case, DrillPath, Observation, Workspace } from '../types';
import type { PaceLineRow } from '../db/rows';
import type { PaceAction } from './tracker';
import type { Bone, Phase, ProblemMeasure, ProblemView, Suggestion } from './problems';
import type { Cause, CauseSource, Grade, SixM } from './sixm';
import type { WalkSnag } from './walkSnags';
import type { Standard } from './standard';
import type { Material } from './materials';
import type { Program } from './programs';
import type { Measure, Period, Reading, Target } from './measures';
import { SIXM, boneOfStop } from './sixm';
import { weekStart } from './stats';
import { niceDay, todayISO, daysBetween } from './weeks';
import { analyse, fmtN } from './capacity';
import { headcount } from './standard';
import { stateOf as materialState, daysLate } from './materials';
import { standingOf, stateOf as programState, daysOverdue } from './programs';
import { bySort, lineSeries, say, seriesFor } from './measures';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** How many full weeks a weekly figure is averaged over. */
export const FULL_WEEKS = 4;

/* ================================ the inputs ================================ */

/** An action on the board as the fishbone reads it — the board's own shape
 *  (lib/tracker PaceAction) plus the three fields a countermeasure needs:
 *  which cause it is for, what it should change, and the day it was done. */
export type Countermeasure = PaceAction & {
  /** "<caseId>:<causeId>" (PaceTodoRow.causeRef). */
  causeRef?: string;
  /** What it should change, said before it is done (PaceTodoRow.expect). */
  expect?: string;
  /** YYYY-MM-DD, set by the store when it was marked done (PaceTodoRow.doneOn). */
  doneOn?: string;
};

/** Free text written somewhere on the project that is not a stop's own note —
 *  an action's notes or outcome, a snag's words. Read for Environment. */
export interface FishNote {
  text: string;
  kind: 'action' | 'snag';
  /** The record it came from — the action id or snag id. */
  ref: string;
  lineId?: string;
}

/** Everything the fishbone is filled from, for one project. A plain object, so
 *  a report can build it without React (lib/useProblems loadProblems). */
export interface FishboneData {
  lines: PaceLineRow[];
  /** Every line's timed log — all of the project's workspaces. */
  observations: Observation[];
  /** The lines' workspaces: their crew and shifts. */
  workspaces: Workspace[];
  /** The filmed walk's snags (lib/walkSnags). */
  snags: WalkSnag[];
  standards: Standard[];
  materials: Material[];
  programs: Program[];
  /** The project's own measures and periods (Project.measures/periods). */
  measures: Measure[];
  periods: Period[];
  targets: Target[];
  readings: Reading[];
  /** The board — every action on the project. */
  actions: Countermeasure[];
  notes: FishNote[];
}

/** An empty FishboneData with whatever is given laid over it. */
export const fishboneData = (o: Partial<FishboneData> = {}): FishboneData => ({
  lines: [], observations: [], workspaces: [], snags: [], standards: [], materials: [], programs: [],
  measures: [], periods: [], targets: [], readings: [], actions: [], notes: [], ...o,
});

/* ================================ small helpers ============================= */

const norm = (s?: string) => (s ?? '').trim().toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const isoMs = (iso: string) => Date.parse(`${iso}T12:00:00`);
const isoOf = (ms: number) => todayISO(new Date(ms));
const stops = (o: Observation) => Math.max(1, o.count || 1);
const sameThing = (a?: string, b?: string): boolean => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

/** Monday 00:00 (local), `n` weeks before the week `t` falls in. Done on the
 *  calendar, not by subtracting 7 × 24 h, so a clock change cannot shift it. */
function mondayBack(t: number, n: number): number {
  const d = new Date(weekStart(t));
  d.setDate(d.getDate() - 7 * n);
  return d.getTime();
}

/** The last `n` full weeks before the week `t` is in: [from, to). */
export function fullWeeks(t: number, n = FULL_WEEKS): { from: number; to: number } {
  return { from: mondayBack(t, n), to: weekStart(t) };
}

/** Hours as a person says them: "3.2 h", "12 h", "45 min". */
export function fmtHours(ms: number): string {
  const h = ms / HOUR;
  if (h >= 10) return `${Math.round(h)} h`;
  if (h >= 1) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(ms / 60_000)} min`;
}

/** The first letter lowered when the word is an ordinary one ("The rail" →
 *  "the rail"), kept when it is an acronym ("PLC"). */
const lowerFirst = (s: string) => (s.length > 1 && /[a-z]/.test(s[1]) ? s[0].toLowerCase() + s.slice(1) : s);
const clause = (s: string) => s.trim().replace(/[.;:,\s]+$/, '');

/* ================================== scope ================================== */

/** The line a problem is on — by its lineId, or (a Case opened before
 *  problems had lines) by the line whose workspace it lives in. */
export function lineOf(problem: Case, lines: PaceLineRow[]): PaceLineRow | undefined {
  return (problem.lineId ? lines.find(l => l.id === problem.lineId) : undefined)
    ?? lines.find(l => !!l.workspaceId && l.workspaceId === problem.workspaceId);
}

/** Whether a Case is one of this project's problems (and this line's, when a
 *  line is asked for). New ones say so on the row; a LEGACY Case with no
 *  projectId belongs to the line whose workspace it lives in. */
export function belongsTo(problem: Case, projectId: string, lines: PaceLineRow[], lineId?: string): boolean {
  if (problem.deletedAt) return false;
  if (problem.projectId) {
    if (problem.projectId !== projectId) return false;
  } else if (!lines.some(l => !!l.workspaceId && l.workspaceId === problem.workspaceId)) {
    return false;
  }
  if (!lineId) return true;
  if (problem.lineId) return problem.lineId === lineId;
  const line = lines.find(l => l.id === lineId);
  return !!line?.workspaceId && line.workspaceId === problem.workspaceId;
}

/** The workspace whose log a problem reads: its line's, else its own. */
const logWorkspace = (problem: Case, data: FishboneData): string =>
  lineOf(problem, data.lines)?.workspaceId ?? problem.workspaceId;

/** The line's whole log, live rows only. */
export function lineLog(problem: Case, data: FishboneData): Observation[] {
  const ws = logWorkspace(problem, data);
  return data.observations.filter(o => o.workspaceId === ws && o.deletedAt == null);
}

export interface Scope {
  /** "Minor stop on the Basketer", "Stops on the Basketer", "Lost time on Line 2A". */
  label: string;
  /** Whether a stop is inside the head of the fish. */
  match: (o: Observation) => boolean;
  /** True when the scope is the line's whole log (the gap, or nothing narrower). */
  whole: boolean;
  /** The machine the scope is about, when it is about one. */
  asset?: string;
}

/** What part of the log the head of the fish covers:
 *  - a Pareto bar (or something seen, when it names one): its category,
 *    sub-category and machine;
 *  - the constraint: the limiting station's machine;
 *  - a Case opened before problems had a source: its saved drill path;
 *  - the gap, or nothing narrower: the line's whole log. */
export function scopeOf(problem: Case, data: FishboneData): Scope {
  const src = problem.source;
  const line = lineOf(problem, data.lines);
  const whole: Scope = { label: `Lost time on ${line?.name ?? 'the line'}`, match: () => true, whole: true };
  if (src?.kind === 'constraint') {
    const st = line?.capacity?.stations.find(s => s.id === src.station || sameName(s.name, src.station));
    const name = st?.name || src.station || src.asset || '';
    const asset = st?.asset?.trim() || st?.name || src.asset || src.station;
    if (!asset) return whole;
    return { label: `Stops on the ${name || asset}`, match: o => norm(o.asset) === norm(asset), whole: false, asset };
  }
  if (src && src.kind !== 'gap' && (src.category || src.subcategory || src.asset)) {
    const what = [src.category, src.subcategory].filter(Boolean).join(' · ');
    return {
      label: `${what || 'Stops'}${src.asset ? ` on the ${src.asset}` : ''}`,
      match: o => (!src.category || o.category === src.category)
        && (!src.subcategory || o.subcategory === src.subcategory)
        && (!src.asset || norm(o.asset) === norm(src.asset)),
      whole: false,
      asset: src.asset,
    };
  }
  if (!src && problem.path.length) {
    return {
      label: problem.path.map(s => s.value).join(' · '),
      match: o => problem.path.every(s => dimValue(o, s.dimension) === s.value),
      whole: false,
      asset: problem.path.find(s => s.dimension === 'asset')?.value,
    };
  }
  return whole;
}
const sameName = (a?: string, b?: string) => !!norm(a) && norm(a) === norm(b);
/* The same buckets as engine/types dimOf — copied rather than imported so
   this file stays a leaf. */
function dimValue(o: Observation, d: DrillPath[number]['dimension']): string {
  switch (d) {
    case 'asset': return o.asset || '(unassigned)';
    case 'category': return o.category || '(uncategorised)';
    case 'subcategory': return o.subcategory || '(none)';
    default: return o.shift || '(no shift)';
  }
}

/** Average lost time a week of the scoped stops over [from, to), which is a
 *  whole number of weeks. */
function msWeekOf(rows: Observation[], from: number, to: number): number {
  const weeks = Math.max(1, Math.round((to - from) / (7 * DAY)));
  return rows.filter(o => o.startedAt >= from && o.startedAt < to).reduce((n, o) => n + o.durationMs, 0) / weeks;
}

/** The scope's lost time a week, averaged over the last four full weeks — what
 *  a new problem's baseline is set from. */
export function scopeMsWeek(problem: Case, data: FishboneData, today = Date.now()): number {
  const scope = scopeOf(problem, data);
  const { from, to } = fullWeeks(today);
  return msWeekOf(lineLog(problem, data).filter(scope.match), from, to);
}

/* ============================ a Pareto ref, and back ======================== */

/** The ref a stop group's suggestion carries: the drill path that opens its
 *  bar ("category=Minor stop;subcategory=Misfeed;asset=Basketer") and the bone
 *  it is on, so two bones of the same bar stay two suggestions. */
function paretoRef(m: SixM, category: string, subcategory: string | undefined, asset: string): string {
  return [`category=${category}`, subcategory ? `subcategory=${subcategory}` : '', asset ? `asset=${asset}` : '', `m=${m}`]
    .filter(Boolean).join(';');
}

/** The drill path inside a Pareto source's ref — what "open the Pareto bar"
 *  needs. Empty for a ref that is not a drill path. */
export function drillOfRef(ref?: string): DrillPath {
  const out: DrillPath = [];
  for (const part of (ref ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i), v = part.slice(i + 1);
    if (k === 'category' || k === 'subcategory' || k === 'asset' || k === 'shift') out.push({ dimension: k, value: v });
  }
  return out;
}

/** "<problemId>:<causeId>" — what an action's causeRef holds. */
export const causeRefOf = (problemId: string, causeId: string): string => `${problemId}:${causeId}`;
export function parseCauseRef(ref?: string): { problemId: string; causeId: string } | undefined {
  const i = (ref ?? '').indexOf(':');
  if (!ref || i <= 0 || i === ref.length - 1) return undefined;
  return { problemId: ref.slice(0, i), causeId: ref.slice(i + 1) };
}

/** Accepting a suggestion is saving a cause with its source. Suspected until
 *  somebody confirms it; no whys yet. */
export function acceptSuggestion(s: Suggestion, o: { id: string; at: number; by?: string }): Cause {
  return {
    id: o.id, m: s.m, text: s.text, grade: s.grade, status: 'suspected', whys: [], at: o.at,
    source: { ...s.source, ...(s.minutesWeek != null ? { minutesWeek: s.minutesWeek } : {}) },
    ...(o.by ? { by: o.by } : {}),
  };
}

/* ============================ the old five whys ============================ */

/** The chain a Case opened before 6M carries (Case.whys, the last one the
 *  root), its blank answers dropped. Empty when there is none. */
export const oldWhysOf = (problem: Pick<Case, 'whys'>): string[] =>
  (problem.whys ?? []).map(w => (w ?? '').trim()).filter(Boolean);

/** THE OLD WHYS, PUT ON A BONE. A Case opened before the fishbone carries its
 *  five whys as a plain list and no causes, so on the fishbone they were
 *  invisible. Put on a bone, the chain becomes ONE cause: its first answer is
 *  the cause, the rest are the whys under it, and it is marked drilled to its
 *  root only when there was a chain under it (two or more answers) — the old
 *  A3 said its last answer was the root. It is `reported` (written down, not
 *  measured or seen today) and `suspected` until somebody confirms it, with no
 *  source: it came from the old A3, not from the data. Null when there is
 *  nothing to put on. The caller clears Case.whys in the same write, so the
 *  chain is never shown twice. */
export function causeFromOldWhys(whys: string[], m: SixM, o: { newId: () => string; at: number; by?: string }): Cause | null {
  const chain = oldWhysOf({ whys });
  if (!chain.length) return null;
  return {
    id: o.newId(), m, text: chain[0], grade: 'reported', status: 'suspected',
    whys: chain.slice(1).map(text => ({ id: o.newId(), text })),
    ...(chain.length >= 2 ? { root: true } : {}),
    at: o.at, ...(o.by ? { by: o.by } : {}),
  };
}

/* =============================== suggestions =============================== */

const mk = (kind: CauseSource['kind'], ref: string, m: SixM, text: string, grade: Grade, o: Partial<Suggestion> & { label?: string } = {}): Suggestion => {
  const { label, ...rest } = o;
  return {
    key: `${kind}:${ref}`, m, text, grade,
    source: { kind, ref, ...(label ? { label } : {}), ...(rest.minutesWeek != null ? { minutesWeek: rest.minutesWeek } : {}) },
    ...rest,
  };
};

/** At most this many stop groups on one fishbone — beyond it is the long tail,
 *  and the Pareto is where the tail lives. */
const MAX_STOP_GROUPS = 8;
const MAX_PER_SOURCE = 5;

const ENV: { key: string; word: string; re: RegExp }[] = [
  { key: 'heat', word: 'Heat', re: /\b(heat|heatwave|hot|overheat\w*)\b/i },
  { key: 'humidity', word: 'Humidity', re: /\b(humid\w*|damp)\b/i },
  { key: 'condensation', word: 'Condensation', re: /\b(condensation|condensing|steam(ed|ing)? up|misted)\b/i },
  { key: 'dust', word: 'Dust', re: /\b(dust\w*)\b/i },
];

/** What the data says might belong on each bone of this problem, worked out
 *  from the records each one points at. Suggestions already accepted (a cause
 *  whose source has the same kind and ref) are left out. */
export function suggestionsFor(problem: Case, data: FishboneData, today = Date.now()): Suggestion[] {
  const out: Suggestion[] = [];
  const line = lineOf(problem, data.lines);
  const lineWs = logWorkspace(problem, data);
  const scope = scopeOf(problem, data);
  const log = lineLog(problem, data);
  const weeks = fullWeeks(today);
  const evidence = log.filter(o => o.startedAt >= weeks.from && o.startedAt <= today);
  const scoped = evidence.filter(scope.match);
  const since = niceDay(isoOf(weeks.from));
  const todayIso = isoOf(today);

  /* 1. THE TIMED STOPS inside the head, grouped by bone, reason and machine.
     The bone is the floor's tap when it gave one, else a guess from the
     category and words — and said to be a guess. */
  const groups = new Map<string, { m: SixM; category: string; sub?: string; asset: string; rows: Observation[]; told: number }>();
  for (const o of scoped) {
    const m = o.causeM ?? boneOfStop(o.category, o.subcategory, o.note);
    const category = o.category || 'Uncategorised';
    const asset = o.asset || '';
    const ref = paretoRef(m, category, o.subcategory || undefined, asset);
    const g = groups.get(ref) ?? { m, category, sub: o.subcategory || undefined, asset, rows: [], told: 0 };
    g.rows.push(o);
    if (o.causeM) g.told++;
    groups.set(ref, g);
  }
  const stopSuggestions = [...groups.entries()].map(([ref, g]) => {
    const minutesWeek = Math.round((msWeekOf(g.rows, weeks.from, weeks.to) / 60_000) * 10) / 10;
    const n = g.rows.reduce((a, o) => a + stops(o), 0);
    const timed = g.rows.some(o => o.durationMs > 0);
    const text = `${g.category}${g.sub ? ` — ${g.sub}` : ''}${g.asset ? ` on the ${g.asset}` : ''}`;
    const detail = `${plural(n, 'stop')} since ${since}${minutesWeek > 0 ? ` · ${fmtHours(minutesWeek * 60_000)} a week` : ''}`
      + (g.told && g.told < g.rows.length ? ` · ${g.told} put on this bone by the floor` : '');
    return { s: mk('pareto', ref, g.m, text, timed ? 'measured' : 'counted', { minutesWeek, detail, guessed: g.told === 0, label: text }), n };
  }).sort((a, b) => (b.s.minutesWeek ?? 0) - (a.s.minutesWeek ?? 0) || b.n - a.n).slice(0, MAX_STOP_GROUPS);
  out.push(...stopSuggestions.map(x => x.s));

  /* 2. CONCENTRATIONS. Most of the stops on one shift is a People question —
     but only on a line that logs more than one shift, or "all on days" says
     nothing. */
  const shifts = new Set(evidence.map(o => o.shift?.trim()).filter(Boolean));
  if (shifts.size >= 2) {
    const by = new Map<string, number>();
    let total = 0;
    for (const o of scoped) {
      const n = stops(o);
      total += n;
      const s = o.shift?.trim();
      if (s) by.set(s, (by.get(s) ?? 0) + n);
    }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && total >= 5 && top[1] / total >= 0.6) {
      out.push(mk('pareto', `shift=${top[0]}`, 'people', `Most stops on ${top[0]}`, 'measured', {
        detail: `${top[1]} of ${total} stops since ${since} were on ${top[0]}`, label: `Stops by shift — ${top[0]}`,
      }));
    }
  }

  /* 3. THE WALK. Open snags on the machine the head is about — or, for the
     whole line, every open snag on the line's walk. Seen first-hand. */
  const open = data.snags.filter(s => s.state !== 'closed');
  const onIt = scope.asset ? open.filter(s => sameThing(s.frameName, scope.asset)) : scope.whole ? open.filter(s => s.wsId === lineWs) : [];
  for (const s of [...onIt].sort((a, b) => b.found.localeCompare(a.found)).slice(0, MAX_PER_SOURCE)) {
    const late = !!s.due && s.due < todayIso;
    out.push(mk('snag', s.id, 'machine', s.what, 'observed', {
      detail: [`On the walk${s.frameName ? ` — ${s.frameName}` : ''}`, `found ${niceDay(s.found)}`, s.owner ? s.owner : '', late ? 'past due' : '']
        .filter(Boolean).join(' · '),
      label: s.frameName,
    }));
  }

  /* 4. THE LINE STANDARD'S CREW. The standard for this line's product (one
     whose program is on this line), else the project's first. Counted. */
  const linePrograms = new Set(data.programs.filter(p => !p.deletedAt && !!line && p.lineId === line.id).map(p => p.id));
  const standards = data.standards.filter(s => !s.deletedAt).sort((a, b) => a.sort - b.sort);
  const std = standards.find(s => !!s.programId && linePrograms.has(s.programId)) ?? standards[0];
  if (std) {
    const need = headcount(std);
    const crew = data.workspaces.find(w => w.id === lineWs)?.crew;
    if (need > 0 && (crew == null || crew < need)) {
      out.push(mk('standard', std.id, 'people',
        crew == null
          ? `The standard for ${std.product} needs ${plural(need, 'person', 'people')} — is that the crew on every shift?`
          : `Crew below the standard — ${crew} on the line, the standard needs ${need}`,
        'counted', { detail: `Line standard: ${std.product}, ${plural(need, 'person', 'people')}`, label: std.product }));
    }
  }

  /* 5. THE LINE BALANCE. The limiting station, when the head is about it or
     about the whole line. A person is People; a machine is Machine. */
  if (line?.capacity?.stations.length) {
    const r = analyse(line.capacity);
    const st = r.limit?.station;
    const about = !!st && (scope.whole || problem.source?.kind === 'constraint'
      || sameThing(st.asset?.trim() || st.name, scope.asset));
    if (st && r.limit && r.line != null && about) {
      const nm = st.name.trim() || `Station ${r.limit.index + 1}`;
      const short = r.target != null && (r.gap ?? 0) > 0 ? `, ${fmtN(r.gap as number)} short of ${fmtN(r.target)}` : '';
      const stopsNotSpeed = r.limitAtRunning && r.limitAtRunning.index !== r.limit.index ? ' — its stops, not its speed, hold the line' : '';
      out.push(mk('capacity', st.id, st.kind === 'people' ? 'people' : 'machine',
        `${nm} limits the line at ${fmtN(r.line)} ${r.unit}/min${short}`,
        st.source === 'estimate' ? 'reported' : 'measured',
        { detail: `${r.limit.feed}${stopsNotSpeed}`, label: nm }));
    }
  }

  /* 6. MATERIALS LATE for this line (or for the whole job). */
  const forLine = (x: { lineId?: string }) => !x.lineId || (!!line && x.lineId === line.id);
  const late = data.materials.filter(m => !m.deletedAt && forLine(m) && materialState(m, todayIso) === 'late')
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '')).slice(0, MAX_PER_SOURCE);
  for (const m of late) {
    const n = daysLate(m, todayIso) ?? 0;
    out.push(mk('material', m.id, 'material', `${m.what} is ${plural(n, 'day')} late`, 'counted', {
      detail: [m.howMuch, m.from ? `from ${m.from}` : '', m.due ? `due ${niceDay(m.due)}` : ''].filter(Boolean).join(' · '),
      label: m.what,
    }));
  }

  /* 7. PROGRAMS NOT PROVED: past their test day, or on the machine with no
     day at all. */
  const unproved = data.programs.filter(p => !p.deletedAt && forLine(p)).flatMap(p => {
    const standing = standingOf(p, todayIso);
    if (standing === 'overdue') {
      const n = daysOverdue(p, todayIso) ?? 0;
      return [{ p, rank: 0, text: `${p.what} not proved — its test day has passed`, detail: [`booked ${niceDay(p.testOn)}, ${plural(n, 'day')} ago`, p.runs ? `runs ${p.runs}` : ''] }];
    }
    if (standing === 'undated' && programState(p) === 'onMachine') {
      return [{ p, rank: 1, text: `${p.what} is on the machine and not proved — no test day`, detail: [p.runs ? `runs ${p.runs}` : '', p.from ? `from ${p.from}` : ''] }];
    }
    return [];
  }).sort((a, b) => a.rank - b.rank || a.p.sort - b.p.sort).slice(0, MAX_PER_SOURCE);
  for (const u of unproved) {
    out.push(mk('program', u.p.id, 'method', u.text, 'counted', { detail: u.detail.filter(Boolean).join(' · '), label: u.p.what }));
  }

  /* 8. MEASUREMENT — the data itself. Days in the last two weeks with nothing
     logged, on the weekdays this line usually logs; and a measure nobody has
     read for a fortnight. */
  const gaps = logGaps(log, today);
  if (gaps.missing.length >= 3) {
    out.push(mk('reading', 'log-gaps', 'measurement',
      `${gaps.missing.length} days in the last 2 weeks with nothing logged — the Pareto may be short`, 'measured', {
        detail: `Nothing logged on ${gaps.missing.slice(0, 4).map(d => niceDay(d, { weekday: 'short' })).join(', ')}${gaps.missing.length > 4 ? ' …' : ''}`,
        label: 'The stop log',
      }));
  }
  if (line) {
    const measure = (problem.source?.measureId ? bySort(data.measures).find(m => m.id === problem.source?.measureId) : undefined)
      ?? bySort(data.measures)[0];
    const series = measure ? seriesFor(data.readings, line.id, measure.id) : [];
    const last = series[series.length - 1];
    if (measure && last && daysBetween(last.at, todayIso) > 14) {
      out.push(mk('reading', `measure=${measure.id}`, 'measurement', `No ${measure.name} reading since ${niceDay(last.at)}`, 'counted', {
        detail: `${plural(daysBetween(last.at, todayIso), 'day')} since ${line.name}'s last ${measure.name} reading`, label: measure.name,
      }));
    }
  }

  /* 9. ENVIRONMENT — the words people wrote. A stop's note is the floor's own
     (observed); an action's or a snag's is reported. */
  const texts: { text: string; observed: boolean }[] = [
    ...scoped.filter(o => !!o.note).map(o => ({ text: o.note as string, observed: true })),
    ...data.notes.filter(n => !n.lineId || (!!line && n.lineId === line.id)).map(n => ({ text: n.text, observed: false })),
  ];
  for (const e of ENV) {
    const hits = texts.filter(t => e.re.test(t.text));
    if (!hits.length) continue;
    const first = hits[0].text.trim();
    out.push(mk('observation', `note:${e.key}`, 'environment', `${e.word} mentioned in ${plural(hits.length, 'note')}`,
      hits.some(h => h.observed) ? 'observed' : 'reported', {
        detail: `“${first.length > 80 ? `${first.slice(0, 79)}…` : first}”`, label: e.word,
      }));
  }

  /* Already on the fishbone? Then not offered again. */
  const taken = new Set((problem.causes ?? []).filter(c => c.source?.ref).map(c => `${c.source?.kind}:${c.source?.ref}`));
  return out.filter(s => !taken.has(`${s.source.kind}:${s.source.ref}`));
}

/** The days in the last fourteen (today not counted) with nothing logged, on
 *  weekdays this line usually logs — a weekday it logged on at least twice in
 *  the four weeks before. Only for a line that normally logs (8+ days in those
 *  four weeks); a line that never logs has no gaps, only an empty Pareto. */
export function logGaps(log: Observation[], today = Date.now()): { missing: string[]; usual: number[] } {
  const logged = new Set(log.filter(o => o.deletedAt == null).map(o => isoOf(o.startedAt)));
  const dayAt = (n: number) => { const d = new Date(today); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
  const perWeekday = new Array(7).fill(0) as number[];
  let prior = 0;
  for (let i = 15; i <= 42; i++) {
    const d = dayAt(i);
    if (logged.has(todayISO(d))) { prior++; perWeekday[d.getDay()]++; }
  }
  if (prior < 8) return { missing: [], usual: [] };
  const usual = perWeekday.flatMap((n, wd) => (n >= 2 ? [wd] : []));
  const missing: string[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = dayAt(i);
    if (usual.includes(d.getDay()) && !logged.has(todayISO(d))) missing.push(todayISO(d));
  }
  return { missing: missing.sort(), usual };
}

/* ============================ countermeasures, roots ======================== */

/** The causes confirmed and drilled to a root. */
export const rootsOf = (problem: Case): Cause[] =>
  (problem.causes ?? []).filter(c => c.root && c.status === 'confirmed');

/** The problem's countermeasures: actions pointing at one of its causes, or
 *  raised for it (caseId). */
export function countermeasuresOf<A extends Countermeasure>(problem: Case, actions: A[]): A[] {
  const pre = `${problem.id}:`;
  return actions.filter(a => (!!a.causeRef && a.causeRef.startsWith(pre)) || (!!a.caseId && a.caseId === problem.id));
}

/** The countermeasures for one cause. */
export const countermeasuresFor = <A extends Countermeasure>(problemId: string, causeId: string, actions: A[]): A[] =>
  actions.filter(a => a.causeRef === causeRefOf(problemId, causeId));

const isDone = (a: PaceAction) => /^done$/i.test(a.status.trim());

/** The last day a countermeasure was done, when one was. */
function lastDone(actions: Countermeasure[]): string | undefined {
  return actions.filter(a => isDone(a) && !!a.doneOn).map(a => a.doneOn as string).sort().pop();
}

/* ================================== phase ================================== */

/** Where a problem is on its way (lib/problems Phase):
 *  - open, no confirmed root yet → finding;
 *  - a confirmed root, and countermeasures still to do (or none raised yet) → acting;
 *  - a confirmed root and every countermeasure done → proving;
 *  - closed with no hold check → closed;
 *  - closed with a hold check: the number gone back (moved worse, or no
 *    better than before) → slipped; moved the right way → holding; not
 *    measured since (no full week yet, or no readings) → proving, "Checking
 *    it worked". Holding is green, the colour of done, so it is said only
 *    when the number shows it — closing it is not proof it worked. */
export function phaseOf(problem: Case, actions: Countermeasure[], measure: ProblemMeasure | null, _today = Date.now()): Phase {
  if (problem.status === 'closed') {
    if (!problem.hold) return 'closed';
    if (measure?.moved === 'worse' || measure?.moved === 'same') return 'slipped';
    return measure?.moved === 'better' ? 'holding' : 'proving';
  }
  if (!rootsOf(problem).length) return 'finding';
  const mine = countermeasuresOf(problem, actions);
  return mine.length > 0 && mine.every(isDone) ? 'proving' : 'acting';
}

/* ================================= measure ================================= */

/** Better, worse or the same, given which way is good. A change smaller than
 *  `tol` of the before figure is the same. */
function movedOf(before: number, after: number, better: 'lower' | 'higher', tol: number): 'better' | 'worse' | 'same' {
  const d = after - before;
  const band = Math.abs(before) * tol;
  if (before === 0 && after === 0) return 'same';
  if (Math.abs(d) <= band) return 'same';
  return (better === 'lower' ? d < 0 : d > 0) ? 'better' : 'worse';
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The problem's own number, before and now (lib/problems ProblemMeasure).
 *
 *  A Pareto bar, the constraint or something seen: hours a week lost in its
 *  scope. Before is the baseline it opened with (Case.baselineMsWeek), or the
 *  four full weeks before it opened; now is the last four full weeks. `moved`
 *  compares before with the full weeks after the last countermeasure was done
 *  (a 10% band is "the same"), and is absent until one full week has passed.
 *
 *  The gap: the line's measure (its headline, unless the problem names one).
 *  Before is the mean of the readings in the four weeks before it opened (else
 *  the last one before); now the mean of the last four weeks' (else the
 *  latest); target the period in play's. `moved` uses the readings after the
 *  last countermeasure (a 5% band). Null when there is nothing to measure. */
export function measureOf(problem: Case, data: FishboneData, today = Date.now()): ProblemMeasure | null {
  const line = lineOf(problem, data.lines);
  const done = lastDone(countermeasuresOf(problem, data.actions));

  if (problem.source?.kind === 'gap') {
    if (!line) return null;
    const todayIso = isoOf(today);
    const s = lineSeries(data.measures, data.periods, data.targets, data.readings, line.id, problem.source.measureId, todayIso);
    if (!s) return null;
    const better = s.measure.direction === 'up' ? 'higher' as const : 'lower' as const;
    const pts = s.points;
    const opened = isoOf(problem.openedAt);
    const openedFrom = isoOf(problem.openedAt - 28 * DAY);
    const recentFrom = isoOf(today - 28 * DAY);
    const before = mean(pts.filter(p => p.at >= openedFrom && p.at < opened).map(p => p.value))
      ?? [...pts].reverse().find(p => p.at < opened)?.value;
    const now = mean(pts.filter(p => p.at >= recentFrom && p.at <= todayIso).map(p => p.value)) ?? s.latest;
    const after = done ? mean(pts.filter(p => p.at > done).map(p => p.value)) : undefined;
    return {
      label: `${s.measure.name} on ${line.name}`,
      unit: s.measure.unit ?? '',
      /* A tenth: an average of readings is not known to the hundredth, and the
         fish's head, its sentence and the paper must say the same figure. */
      ...(before != null ? { before: round1(before) } : {}),
      ...(now != null ? { now: round1(now) } : {}),
      ...(s.target != null ? { target: s.target } : {}),
      better,
      ...(before != null && after != null ? { moved: movedOf(before, after, better, 0.05) } : {}),
    };
  }

  const scope = scopeOf(problem, data);
  const rows = lineLog(problem, data).filter(scope.match);
  if (!rows.length && !(problem.baselineMsWeek > 0)) return null;
  const nowW = fullWeeks(today);
  const openW = fullWeeks(problem.openedAt);
  const beforeMs = problem.baselineMsWeek > 0 ? problem.baselineMsWeek : msWeekOf(rows, openW.from, openW.to);
  const nowMs = msWeekOf(rows, nowW.from, nowW.to);
  let moved: ProblemMeasure['moved'];
  if (done) {
    const from = mondayBack(isoMs(done), -1);   // the Monday after the day it was done
    const to = nowW.to;
    if (to - from >= 7 * DAY) moved = movedOf(beforeMs, msWeekOf(rows, from, to), 'lower', 0.1);
  }
  return {
    label: scope.label,
    unit: 'h a week',
    before: round1(beforeMs / HOUR),
    now: round1(nowMs / HOUR),
    ...(problem.targetMsWeek != null ? { target: round1(problem.targetMsWeek / HOUR) } : {}),
    better: 'lower',
    ...(moved ? { moved } : {}),
  };
}

/* ================================== the view ================================= */

/** The sentence for the head of the fish and the report. */
function saysOf(problem: Case, data: FishboneData, measure: ProblemMeasure | null, today: number): string {
  if (!measure) return problem.title;
  if (problem.source?.kind === 'gap') {
    if (measure.now == null) return `${measure.label}: nothing measured yet`;
    /* "the four-week average": the line's own sentence (lib/measures gapOf)
       quotes the latest reading, so the two figures side by side must say
       which is which. */
    return `${measure.label}: ${say(measure.now, measure.unit)} on the four-week average${measure.target != null ? `, against a target of ${say(measure.target, measure.unit)}` : ''}`;
  }
  const scope = scopeOf(problem, data);
  const { from, to } = fullWeeks(today);
  const log = lineLog(problem, data);
  const mine = msWeekOf(log.filter(scope.match), from, to);
  if (mine <= 0) return `${measure.label} — nothing timed in the last ${FULL_WEEKS} full weeks`;
  const all = msWeekOf(log, from, to);
  const share = !scope.whole && all > 0 ? `, ${Math.round((mine / all) * 100)}% of the line’s lost time` : '';
  return `${measure.label} — ${fmtHours(mine)} a week${share}`;
}

/** A problem as every screen and the report read it: all six bones in SIXM
 *  order (an empty one says "looked, nothing found"), its causes and the
 *  suggestions not yet taken, the roots, the countermeasures, its number and
 *  its phase. */
export function buildView(problem: Case, data: FishboneData, today = Date.now()): ProblemView {
  const suggestions = suggestionsFor(problem, data, today);
  const causes = problem.causes ?? [];
  const bones: Bone[] = SIXM.map(({ key }) => ({
    m: key,
    causes: causes.filter(c => c.m === key),
    suggestions: suggestions.filter(s => s.m === key),
  }));
  const measure = measureOf(problem, data, today);
  const actions = countermeasuresOf(problem, data.actions);
  return {
    problem,
    phase: phaseOf(problem, data.actions, measure, today),
    bones,
    measure,
    actions,
    roots: rootsOf(problem),
    says: saysOf(problem, data, measure, today),
  };
}

/** The "therefore" test (docs/OPEX.md): the chain read back up from the root
 *  to the head of the fish. With whys [w1 … wn] under a cause, wn the root:
 *    "wn, therefore wn-1" … "w1, therefore <cause>", "<cause>, therefore <problem>".
 *  Empty whys are skipped. If any line does not hold, it is not the root. */
export function therefore(cause: Cause, problemTitle: string): string[] {
  const chain = [problemTitle, cause.text, ...cause.whys.map(w => w.text)].map(clause).filter(Boolean);
  const out: string[] = [];
  for (let i = chain.length - 1; i > 0; i--) out.push(`${chain[i]}, therefore ${lowerFirst(chain[i - 1])}`);
  return out;
}
