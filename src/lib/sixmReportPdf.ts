/* THE 6M CLIENT REPORT — a running line's root cause story, on A4.
 *
 * docs/SIXM.md, "The client report": the gap → where the loss is → each
 * problem (its fishbone drawn, the why-chains of its roots, the
 * countermeasures with what they were expected to do and what they did, and
 * whether it is holding) → the board by bone → what was seen on the line.
 *
 * Two halves in one file, the way the screen and the paper are one job (house
 * rule 2): `sixmReport()` turns the records into the sentences and rows — the
 * screen lists them, the paper prints them — and `drawSixMReport()` pours them
 * through the report engine (lib/report, docs/REPORTS.md). Blocks measure
 * themselves; nothing is cut; a section with nothing to say is not printed;
 * the fishbone is one measured block, and when a problem has more causes than
 * the drawing can carry, the drawing names the leading ones per bone and the
 * whole list follows as rows — every cause prints somewhere.
 *
 * Colours are the house's five states and nothing else (CLAUDE.md, visual
 * management): the bones are told apart by place and name; a confirmed cause
 * is solid, a suspected one an outline, a ruled-out one struck through — and
 * each says so in words beside the mark. */
import type { jsPDF } from 'jspdf';
import type { Case } from '../types';
import type { PaceTodoRow } from '../db/rows';
import type { Phase, ProblemView } from './problems';
import { PHASE_WORD } from './problems';
import { GRADES, SIXM, sixmLabel, toSixM, type Cause, type CauseStatus, type Grade, type SixM } from './sixm';
import type { FishboneData } from './fishbone';
import { therefore } from './fishbone';
import { lineSeries, say, type LineSeries } from './measures';
import { paretoFromLog } from './paretoFromLog';
import { paretoView } from './paretoView';
import { analyse, fmtN } from './capacity';
import { niceDay, todayISO } from './weeks';
import { san } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, lead, rows, text, wrap, type Row } from './report/blocks';

/* ================================== the model ================================== */

/** The five states, by the house rules: red the day gone (or a failure),
 *  amber waiting on somebody, indigo under way or still ahead, green done,
 *  grey not started. `failed` is the solid red of a failure. */
export type Tone = 'failed' | 'late' | 'waiting' | 'going' | 'ahead' | 'done';

export interface GapLine {
  line: string;
  owner?: string;
  /** The verdict, one sentence. */
  says: string;
  /** Short of target, in words ("3.2 ppm short") — the one abnormal number. */
  short?: string;
  series?: { measure: string; unit: string; better: 'up' | 'down'; points: { at: string; value: number }[]; target?: number; period?: string };
}

export interface CauseRep {
  id: string;
  m: SixM;
  bone: string;
  text: string;
  grade: string;
  status: CauseStatus;
  statusWord: string;
  root: boolean;
  /** Where it came from, when it was accepted from the data. */
  from?: string;
  by?: string;
}

export interface CounterRep {
  what: string;
  bone: string;
  owner: string;
  tone: Tone;
  /** The state and the day in words: "Late · was due 1 Oct". */
  when: string;
  expect?: string;
  /** What happened — the outcome written when it was done. */
  happened?: string;
  /** The cause it is for, in words. */
  cause?: string;
}

export interface ProblemRep {
  id: string;
  n: number;
  title: string;
  phase: Phase;
  phaseWord: string;
  tone: Tone;
  says: string;
  /** Line · where it came from · opened. */
  meta: string;
  /** Before, now and target, in one sentence. */
  measure?: string;
  /** The head's number — "3 h a week". */
  number?: string;
  bones: { m: SixM; label: string; causes: CauseRep[] }[];
  causeCount: number;
  /** What the data suggests and nobody has looked at yet, per bone. */
  suggested: string;
  roots: { cause: CauseRep; whys: { text: string; grade?: string }[]; therefore: string[] }[];
  /** Said when there is no root yet. */
  rootless?: string;
  counter: CounterRep[];
  counterSays: string;
  hold?: { what: string; who?: string; every: string; since: string; last?: string; word: string; tone: Tone };
  /** A closed problem with no check set — said, not hidden. */
  holdless?: string;
}

export interface BoardRow { what: string; why?: string; owner: string; tone: Tone; when: string;
  /** The day in free words, when no date was given — "before the Christmas peak". */
  words?: string; cause?: string; line?: string }

export interface SixMReport {
  name: string;
  /** A line's own deck: the line it covers. */
  scope?: string;
  lead?: string;
  printed: string;
  /** The band: where the lines are, then the problems and the board. */
  sentence: string;
  slip: string;
  gaps: GapLine[];
  /** Said once when no line has a measure. */
  gapNone?: string;
  pareto?: { period?: string; says: string; rows: { category: string; mins: number; share: number; stops: number; vital: boolean }[] };
  constraints: { line: string; unit: string; says: string; stations: { name: string; running: number; effective: number; limit: boolean }[] }[];
  problems: ProblemRep[];
  /** Said when there are none. */
  noProblems?: string;
  board: { m: SixM | null; label: string; says: string; rows: BoardRow[] }[];
  boardSays: string;
  /** Bones with nothing on the board, in one line. */
  boardQuiet?: string;
  seen?: { says: string; rows: { what: string; where: string; owner: string; found: string; tone: Tone; state: string }[]; closed: string[] };
}

export interface SixMInput {
  project: { name: string; lead?: string };
  /** Everything the fishbones read (lib/useProblems loadProblems). */
  data: FishboneData;
  /** The problems, as views — in scope already. */
  problems: ProblemView[];
  /** The board as stored: the ISO due day, the outcome, the cause it is for. */
  todos: PaceTodoRow[];
  /** A line's own deck. */
  lineId?: string;
  /** Now, ms — the day the report is printed. */
  now: number;
}

const DAY = 86_400_000;
const PHASE_ORDER: Phase[] = ['slipped', 'finding', 'acting', 'proving', 'holding', 'closed'];
const PHASE_TONE: Record<Phase, Tone> = { finding: 'going', acting: 'going', proving: 'going', holding: 'done', closed: 'done', slipped: 'failed' };
const GRADE_WORD = (g?: Grade) => GRADES.find(x => x.key === g)?.label ?? '';
const STATUS_WORD: Record<CauseStatus, string> = { confirmed: 'confirmed', suspected: 'suspected', ruled_out: 'ruled out' };
const GRADE_RANK: Record<Grade, number> = { measured: 0, counted: 1, observed: 2, reported: 3 };
const STATUS_RANK: Record<CauseStatus, number> = { confirmed: 0, suspected: 1, ruled_out: 2 };
const SOURCE_WORD: Record<NonNullable<Case['source']>['kind'], string> = {
  gap: 'From the gap', pareto: 'From the Pareto', constraint: 'From the constraint', observed: 'Seen on the line',
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const day = (iso?: string) => niceDay(iso);
const listWords = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The order a bone's causes are read in: roots, confirmed, suspected, ruled
 *  out — and within each, how well it is known. */
const causeOrder = (a: Cause, b: Cause) =>
  Number(!!b.root && b.status === 'confirmed') - Number(!!a.root && a.status === 'confirmed')
  || STATUS_RANK[a.status] - STATUS_RANK[b.status]
  || GRADE_RANK[a.grade] - GRADE_RANK[b.grade]
  || a.at - b.at;

/** An action's state and day, in words and a tone — the board's rule. */
function actionState(t: PaceTodoRow, today: string): { tone: Tone; when: string; words?: string } {
  if (t.state === 'done') return { tone: 'done', when: t.doneOn ? `Done ${day(t.doneOn)}` : 'Done' };
  const late = !!t.due && t.due < today;
  if (late) return { tone: 'late', when: `Late · was due ${day(t.due)}` };
  if (t.state === 'waiting') return { tone: 'waiting', when: t.due ? `Waiting · due ${day(t.due)}` : 'Waiting on someone' };
  if (t.due) return { tone: 'going', when: `Due ${day(t.due)}` };
  return { tone: 'ahead', when: 'No day yet', ...(t.when?.trim() ? { words: t.when.trim() } : {}) };
}
const TONE_RANK: Record<Tone, number> = { failed: 0, late: 1, waiting: 2, going: 3, ahead: 4, done: 5 };

/** A line against its target, in one sentence. */
function gapOf(name: string, s: LineSeries | undefined): Pick<GapLine, 'says' | 'short'> {
  if (!s) return { says: `${name}: no measure set yet.` };
  const unit = s.measure.unit;
  const last = s.points[s.points.length - 1];
  const period = s.period ? `${s.period.name} target` : 'target';
  if (!last) return { says: s.target != null ? `${name}: ${period} ${say(s.target, unit)} — nothing measured yet.` : `${name}: nothing measured yet, and no target set.` };
  const at = `${name} is at ${say(last.value, unit)} (${day(last.at)})`;
  if (s.target == null || s.margin == null) return { says: `${at} — no target set.` };
  const m = Math.abs(s.margin);
  if (m === 0) return { says: `${at}, on its ${period} of ${say(s.target, unit)}.` };
  const up = s.measure.direction === 'up';
  if (s.margin < 0) {
    const short = `${say(m, unit)} ${up ? 'short of' : 'over'} target`;
    return { says: `${at} against the ${period} of ${say(s.target, unit)} — ${short}.`, short };
  }
  return { says: `${at} against the ${period} of ${say(s.target, unit)} — ${say(m, unit)} ${up ? 'better than' : 'under'} target.` };
}

/** The report, from the records — the screen lists it, the paper prints it. */
export function sixmReport(o: SixMInput): SixMReport {
  const today = todayISO(new Date(o.now));
  const { data } = o;
  const scopeLine = o.lineId ? data.lines.find(l => l.id === o.lineId) : undefined;
  const lines = (scopeLine ? [scopeLine] : data.lines).filter(l => !l.deletedAt).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const lineName = (id?: string) => data.lines.find(l => l.id === id)?.name;
  const todos = o.todos.filter(t => !o.lineId || !t.lineId || t.lineId === o.lineId);

  /* ------------------------------- the gap ------------------------------- */
  const gaps: GapLine[] = data.measures.length ? lines.map(l => {
    const s = lineSeries(data.measures, data.periods, data.targets, data.readings, l.id, undefined, today);
    return {
      line: l.name, owner: l.owner, ...gapOf(l.name, s),
      ...(s && s.points.length ? { series: {
        measure: s.measure.name, unit: s.measure.unit ?? '', better: s.measure.direction,
        points: s.points.map(p => ({ at: p.at, value: p.value })), target: s.target, period: s.period?.name,
      } } : {}),
    };
  }) : [];

  /* ------------------------------ the Pareto ----------------------------- */
  const ws = new Set(lines.flatMap(l => (l.workspaceId ? [l.workspaceId] : [])));
  const obs = data.observations.filter(x => !o.lineId || ws.has(x.workspaceId));
  const end = new Date(o.now).setHours(0, 0, 0, 0) + DAY, w = 28 * DAY;
  const lineOfObs = (x: { workspaceId: string }) => data.lines.find(l => l.workspaceId === x.workspaceId)?.name ?? 'The project';
  const nowSheet = paretoFromLog(obs, end - w, end, lineOfObs);
  const pv = nowSheet ? paretoView(nowSheet, paretoFromLog(obs, end - 2 * w, end - w, lineOfObs)) : undefined;
  const pareto: SixMReport['pareto'] = pv && pv.totalMins > 0 ? {
    period: pv.period,
    says: `${Math.round(pv.totalMins).toLocaleString('en-GB')} minutes lost across ${plural(pv.totalStops, 'stop')} — ${pv.vitalCount} ${pv.vitalCount === 1 ? 'category carries' : 'categories carry'} ${Math.round(pv.vitalShare * 100)}%`,
    rows: pv.rows.filter(r => r.verdict !== 'gone').map(r => ({ category: r.category, mins: r.mins, share: r.share, stops: r.events, vital: r.vital })),
  } : undefined;

  /* ---------------------------- the constraint --------------------------- */
  const constraints: SixMReport['constraints'] = lines.flatMap(l => {
    if (!l.capacity || l.capacity.stations.length < 2) return [];
    const r = analyse(l.capacity);
    if (!r.limit || r.line == null) return [];
    return [{
      line: l.name, unit: r.unit, says: r.sentence,
      stations: r.ok.map(x => ({ name: x.station.name.trim() || `Station ${x.index + 1}`, running: x.running, effective: x.effective, limit: x.index === r.limit?.index })),
    }];
  });

  /* ------------------------------ problems ------------------------------- */
  const views = o.problems.slice().sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || a.problem.openedAt - b.problem.openedAt);
  const causeText = new Map<string, { text: string; n: number }>();
  views.forEach((v, i) => { for (const c of v.problem.causes ?? []) causeText.set(`${v.problem.id}:${c.id}`, { text: c.text, n: i + 1 }); });
  const repOf = (c: Cause): CauseRep => ({
    id: c.id, m: c.m, bone: sixmLabel(c.m), text: c.text, grade: GRADE_WORD(c.grade), status: c.status, statusWord: STATUS_WORD[c.status],
    root: !!c.root && c.status === 'confirmed', from: c.source?.label, by: c.by,
  });
  const todoById = new Map(todos.map(t => [t.id, t]));

  const problems: ProblemRep[] = views.map((v, i) => {
    const p = v.problem;
    const causes = (p.causes ?? []).slice().sort(causeOrder);
    const ms = v.measure;
    const unit = ms?.unit ?? '';
    const measure = ms && (ms.before != null || ms.now != null) ? [
      `${ms.label}:`,
      [ms.before != null ? `before ${say(ms.before, unit)}` : '', ms.now != null ? `now ${say(ms.now, unit)}` : '', ms.target != null ? `target ${say(ms.target, unit)}` : ''].filter(Boolean).join(' · '),
      ms.moved === 'better' ? '— better since the countermeasures were done.' : ms.moved === 'worse' ? '— worse since the countermeasures were done.' : ms.moved === 'same' ? '— no change since the countermeasures were done.' : '',
    ].filter(Boolean).join(' ') : undefined;
    const sugg = v.bones.filter(b => b.suggestions.length);
    const nSugg = sugg.reduce((n, b) => n + b.suggestions.length, 0);
    const counter: CounterRep[] = v.actions.map(a => {
      const t = todoById.get(a.uid ?? a.ref);
      const st = t ? actionState(t, today) : { tone: (/^done$/i.test(a.status) ? 'done' : 'going') as Tone, when: a.status };
      const ref = t?.causeRef ? causeText.get(t.causeRef) : undefined;
      return {
        what: t?.what ?? a.action ?? '', bone: sixmLabel(toSixM(t?.pillar ?? a.pillar)) || 'Not on a bone',
        owner: (t?.who ?? a.owner ?? '').trim(), tone: st.tone, when: st.when,
        ...(t?.expect?.trim() ? { expect: t.expect.trim() } : {}),
        ...(t?.state === 'done' ? { happened: t.outcome?.trim() || 'not written up yet' } : {}),
        ...(ref ? { cause: ref.text } : {}),
      };
    }).sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
    const open = counter.filter(c => c.tone !== 'done').length, late = counter.filter(c => c.tone === 'late').length;
    const hold = p.hold ? (() => {
      const h = p.hold;
      const due = h.lastChecked ? new Date(Date.parse(`${h.lastChecked}T12:00:00`) + h.everyDays * DAY) : undefined;
      const overdue = !h.lastChecked || (due ? todayISO(due) < today : false);
      const word = v.phase === 'slipped' ? 'Slipped back' : v.phase === 'holding' ? (overdue ? 'Holding · check overdue' : 'Holding') : 'Check set';
      const tone: Tone = v.phase === 'slipped' ? 'failed' : overdue ? 'waiting' : v.phase === 'holding' ? 'done' : 'going';
      return {
        what: h.what, who: h.who?.trim() || undefined, every: h.everyDays === 1 ? 'every day' : h.everyDays === 7 ? 'every week' : `every ${h.everyDays} days`,
        since: day(h.since), last: h.lastChecked ? day(h.lastChecked) : undefined, word, tone,
      };
    })() : undefined;
    const confirmed = causes.filter(c => c.status === 'confirmed').length, suspected = causes.filter(c => c.status === 'suspected').length;
    return {
      id: p.id, n: i + 1, title: p.title, phase: v.phase, phaseWord: PHASE_WORD[v.phase], tone: PHASE_TONE[v.phase],
      says: v.says && v.says !== p.title ? v.says : '',
      meta: [lineName(p.lineId), p.source ? SOURCE_WORD[p.source.kind] + (p.source.kind === 'pareto' ? `: ${[p.source.category, p.source.subcategory, p.source.asset].filter(Boolean).join(' · ')}` : p.source.kind === 'constraint' && p.source.station ? `: ${p.source.station}` : '') : '',
        `opened ${day(todayISO(new Date(p.openedAt)))}`, p.status === 'closed' && p.closedAt ? `closed ${day(todayISO(new Date(p.closedAt)))}` : ''].filter(Boolean).join(' · '),
      ...(measure ? { measure } : {}),
      ...(ms?.now != null ? { number: say(ms.now, unit) } : ms?.before != null ? { number: say(ms.before, unit) } : {}),
      bones: SIXM.map(b => ({ m: b.key, label: b.label, causes: causes.filter(c => c.m === b.key).map(repOf) })),
      causeCount: causes.length,
      suggested: nSugg ? `The data suggests ${plural(nSugg, causes.length ? 'more cause' : 'cause')} not yet looked at — on ${listWords(sugg.map(b => sixmLabel(b.m)))}.` : '',
      roots: v.roots.map(c => ({
        cause: repOf(c),
        whys: c.whys.filter(x => x.text.trim()).map(x => ({ text: x.text, ...(x.grade ? { grade: GRADE_WORD(x.grade) } : {}) })),
        therefore: therefore(c, p.title),
      })),
      ...(v.roots.length ? {} : { rootless: causes.length
        ? `No root found yet — ${plural(causes.length, 'cause')} on the fishbone: ${confirmed} confirmed, ${suspected} suspected, ${causes.length - confirmed - suspected} ruled out.`
        : `Nothing on the fishbone yet.` }),
      counter,
      counterSays: counter.length ? [`${open} open`, late ? `${late} late` : '', `${counter.length - open} done`].filter(Boolean).join(' · ') : '',
      ...(hold ? { hold } : {}),
      ...(!hold && (v.phase === 'closed') ? { holdless: 'Closed with no check set to keep the gain.' } : {}),
    };
  });

  /* ------------------------------ the board ------------------------------ */
  const forOf = (t: PaceTodoRow): string | undefined => {
    const c = t.causeRef ? causeText.get(t.causeRef) : undefined;
    if (c) return `For: ${c.text} (problem ${c.n})`;
    const k = t.caseId ? views.findIndex(v => v.problem.id === t.caseId) : -1;
    return k >= 0 ? `For problem ${k + 1}: ${views[k].problem.title}` : undefined;
  };
  const rowOf = (t: PaceTodoRow): BoardRow & { due: string } => ({
    what: t.what, ...(t.why?.trim() ? { why: t.why.trim() } : {}), owner: t.who?.trim() ?? '', ...actionState(t, today),
    ...(forOf(t) ? { cause: forOf(t) } : {}), ...(!o.lineId && lines.length > 1 ? { line: lineName(t.lineId) ?? 'All lines' } : {}),
    due: t.state === 'done' ? `~${t.doneOn ?? ''}` : t.due ?? '9999',
  });
  const groups: { m: SixM | null; label: string }[] = [...SIXM.map(b => ({ m: b.key as SixM | null, label: b.label })), { m: null, label: 'Not on a bone yet' }];
  const board = groups.map(g => {
    const mine = todos.filter(t => toSixM(t.pillar) === g.m).map(rowOf)
      .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || (a.tone === 'done' ? b.due.localeCompare(a.due) : a.due.localeCompare(b.due)));
    const open = mine.filter(r => r.tone !== 'done').length, late = mine.filter(r => r.tone === 'late').length;
    return { m: g.m, label: g.label, says: [`${open} open`, late ? `${late} late` : '', mine.length - open ? `${mine.length - open} done` : ''].filter(Boolean).join(' · '),
      rows: mine.map(({ due: _due, ...r }) => r) };
  });
  const allOpen = todos.filter(t => t.state !== 'done').length, allLate = todos.filter(t => actionState(t, today).tone === 'late').length;
  const quietBones = board.filter(b => b.m && !b.rows.length).map(b => b.label);

  /* --------------------------- what was seen ---------------------------- */
  const snags = data.snags.filter(s => !o.lineId || ws.has(s.wsId));
  const openSnags = snags.filter(s => s.state !== 'closed').sort((a, b) => a.found.localeCompare(b.found));
  const closedSnags = snags.filter(s => s.state === 'closed');
  const pastDue = openSnags.filter(s => !!s.due && s.due < today).length;
  const seen: SixMReport['seen'] = snags.length ? {
    says: [`${openSnags.length} open`, pastDue ? `${pastDue} past due` : '', `${closedSnags.length} closed`].join(' · ').replace(' ·  ·', ' ·'),
    rows: openSnags.map(s => {
      const late = !!s.due && s.due < today;
      return {
        what: s.what, where: [s.frameName, !o.lineId && lines.length > 1 ? data.lines.find(l => l.workspaceId === s.wsId)?.name : ''].filter(Boolean).join(' · '),
        owner: s.owner ?? '', found: `Found ${day(s.found)}`,
        tone: late ? 'late' as Tone : s.state === 'in_progress' ? 'going' as Tone : 'failed' as Tone,
        state: late ? `Past due ${day(s.due)}` : s.state === 'in_progress' ? 'In progress' : 'Open',
      };
    }),
    closed: closedSnags.map(s => s.what).filter(x => x.trim()),
  } : undefined;

  /* ------------------------------ the band ------------------------------- */
  const measured = gaps.filter(g => g.series && g.says);
  const meeting = gaps.filter(g => g.series && !g.short && /on its|better than|under target/.test(g.says)).length;
  const sentence = !gaps.length ? 'No measure is set on this job yet, so there is no gap to show.'
    : gaps.length === 1 ? gaps[0].says
      : measured.length ? `${meeting} of ${plural(gaps.length, 'line')} at target${gaps.filter(g => g.short).length ? ` — ${listWords(gaps.filter(g => g.short).map(g => `${g.line} ${g.short}`))}` : ''}.`
        : `${plural(gaps.length, 'line')}, nothing measured yet.`;
  const byPhase = PHASE_ORDER.map(ph => ({ ph, n: views.filter(v => v.phase === ph).length })).filter(x => x.n);
  const slip = [
    views.length ? `${plural(views.length, 'problem')}: ${byPhase.map(x => `${x.n} ${PHASE_WORD[x.ph].toLowerCase()}`).join(', ')}` : 'No problem opened yet',
    todos.length ? `${plural(allOpen, 'action')} open${allLate ? `, ${allLate} late` : ''}` : 'nothing on the board yet',
  ].join(' · ') + '.';

  return {
    name: o.project.name, ...(scopeLine ? { scope: scopeLine.name } : {}), ...(o.project.lead ? { lead: o.project.lead } : {}),
    printed: niceDay(today, { year: true }), sentence, slip,
    gaps, ...(data.measures.length ? {} : { gapNone: 'No measure is set on this job yet — the gap is drawn once a line has a measure and a target.' }),
    ...(pareto ? { pareto } : {}), constraints, problems,
    ...(views.length ? {} : { noProblems: 'No problem has been opened yet. When the gap, the Pareto or the line balance names one, it goes at the head of a fishbone and its causes are found on the six bones.' }),
    board: board.filter(b => b.rows.length),
    boardSays: [`${allOpen} open`, allLate ? `${allLate} late` : '', `${todos.length - allOpen} done`].filter(Boolean).join(' · '),
    ...(todos.length && quietBones.length ? { boardQuiet: `Nothing on the board for ${listWords(quietBones)}.` } : {}),
    ...(seen ? { seen } : {}),
  };
}

/* ================================== the paper ================================== */

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', RIB = '#b8c4d6';
const BRAND = '#1f63e0', SHELL = '#0d1f3c';
/* The app's five state colours — the same values the stage-gate report uses. */
const OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8', GREY = '#b8c4d6';
const TONE: Record<Tone, { fill?: string; stroke: string; text: string; weight: number }> = {
  failed: { fill: DANGER, stroke: DANGER, text: '#ffffff', weight: 1 },
  late: { fill: '#fdf2f0', stroke: DANGER, text: DANGER, weight: 1.6 },
  waiting: { fill: '#fff7e6', stroke: AMBER, text: AMBER, weight: 0.9 },
  going: { fill: '#eeedfa', stroke: BOOKED, text: BOOKED, weight: 0.9 },
  ahead: { stroke: GREY, text: INK2, weight: 0.8 },
  done: { fill: '#e3efe9', stroke: OK, text: OK, weight: 0.7 },
};

/** Every string in the report through the one door the other PDFs use. */
function sanAll<T>(v: T): T {
  if (typeof v === 'string') return san(v) as T;
  if (Array.isArray(v)) return v.map(sanAll) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanAll(x)])) as T;
  return v;
}

/** A state, in words, in its colour — never colour alone. */
function pill(doc: jsPDF, x: number, y: number, w: number, tone: Tone, words: string, h = 12): void {
  const c = TONE[tone];
  doc.setLineWidth(c.weight); doc.setDrawColor(c.stroke);
  if (c.fill) { doc.setFillColor(c.fill); doc.roundedRect(x, y, w, h, 3, 3, 'FD'); } else doc.roundedRect(x, y, w, h, 3, 3, 'S');
  font(doc, SIZE.tiny, 'bold', c.text);
  doc.text(words, x + w / 2, y + h / 2 + 2.4, { align: 'center' });
}
/** A pill as wide as its words, within a limit. */
function pillW(doc: jsPDF, words: string, max: number): number {
  font(doc, SIZE.tiny, 'bold');
  return Math.min(max, doc.getTextWidth(words) + 12);
}

export async function drawSixMReport(doc: jsPDF, report: SixMReport): Promise<void> {
  const r = sanAll(report);
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, d));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    const room = pw - 2 * M - doc.getTextWidth(num) - 16;
    doc.text(fitLine(doc, `${r.name}${r.scope ? ` — ${r.scope}` : ''}  ·  client report  ·  ${r.printed}`, room), M, ph - 18);
    doc.text(num, pw - M, ph - 18, { align: 'right' });
  }
}

/** One line that fits — for the running footer only; the full name is on page 1. */
function fitLine(doc: jsPDF, t: string, w: number): string {
  if (doc.getTextWidth(t) <= w) return t;
  const words = t.split(' ');
  while (words.length > 1 && doc.getTextWidth(words.join(' ') + '…') > w) words.pop();
  return words.join(' ') + '…';
}

const rule = (f: Frame, y: number) => { f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y); };

/** A table header row: small capitals at given x offsets. */
function headerRow(cols: [string, number, ('left' | 'right')?][], title?: string): Row {
  return {
    h: () => (title ? 26 : 13),
    draw: (f, y) => {
      let yy = y;
      if (title) { font(f.doc, SIZE.small, 'bold', INK); f.doc.text(title, f.x, yy + 9); yy += 13; }
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      for (const [t, x, a] of cols) f.doc.text(t.toUpperCase(), f.x + x, yy + 8, a === 'right' ? { align: 'right' } : undefined);
    },
  };
}

function blocksOf(r: SixMReport, d: Density): Block[] {
  const out: Block[] = [];
  const S = SIZE;

  /* ============================ the front ============================ */
  out.push(text({ text: 'CLIENT REPORT · 6M — THE GAP, ITS CAUSES, AND WHAT IS BEING DONE', size: S.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: r.scope ? `${r.name} — ${r.scope}` : r.name, size: S.title, style: 'bold', after: 4 }));
  out.push(text({ text: [r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

  const said = (f: Frame) => wrap(f.doc, r.sentence, f.w - 32, 14, 'bold');
  const slip = (f: Frame) => wrap(f.doc, r.slip, f.w - 32, 9.5);
  out.push(box(f => 30 + said(f).length * 17 + slip(f).length * 12.5 + 8 + gap(f.density, 'l'), (f, y) => {
    const l = said(f), sl = slip(f);
    const bandH = 30 + l.length * 17 + sl.length * 12.5 + 8;
    f.doc.setFillColor(SHELL); f.doc.roundedRect(f.x, y, f.w, bandH, 8, 8, 'F');
    font(f.doc, 7.5, 'bold', '#8fa3c4'); f.doc.text(r.gaps.length > 1 ? 'WHERE THE LINES ARE' : 'WHERE THE LINE IS', f.x + 16, y + 16);
    font(f.doc, 14, 'bold', '#ffffff'); f.doc.text(l, f.x + 16, y + 34);
    font(f.doc, 9.5, 'normal', '#c9d4e6'); f.doc.text(sl, f.x + 16, y + 36 + l.length * 17);
  }, f => gap(f.density, 'l')));

  /* ============================ 1 · the gap ============================ */
  if (r.gaps.length) {
    const short = r.gaps.filter(g => g.short).length;
    out.push(heading('The gap', r.gaps.length === 1 ? 'The line against its target' : `Each line against its target${short ? ` — ${short} short` : ''}`));
    for (const g of r.gaps) {
      out.push(gapBlock(g));
      if (g.series && g.series.points.length >= 2) out.push(chartBlock(g.series));
    }
  } else if (r.gapNone) out.push(text({ text: r.gapNone, colour: MUTED, before: gap(d, 's'), after: gap(d, 'm') }));

  /* ======================== 2 · where the loss is ======================== */
  if (r.pareto || r.constraints.length) {
    out.push(heading('Where the loss is', r.pareto ? `${r.pareto.period ? `${r.pareto.period} · ` : ''}${r.pareto.says}` : 'The line balance — what limits each line'));
    if (r.pareto) out.push(paretoBlock(r.pareto));
    for (const c of r.constraints) {
      out.push(label(`The constraint — ${c.line}`));
      out.push(text({ text: c.says, size: S.body, colour: INK2, after: 4 }));
      out.push(stationsBlock(c));
    }
  }

  /* ============================ 3 · problems ============================ */
  if (r.noProblems) out.push(text({ text: r.noProblems, colour: MUTED, before: gap(d, 'm'), after: gap(d, 'm') }));
  for (const p of r.problems) problemBlocks(p, d, out);

  /* ========================== 4 · the board ========================== */
  if (r.board.length) {
    out.push(heading('The board by bone', `Every action, its owner and its day — ${r.boardSays}`));
    for (const b of r.board) out.push(boardBlock(b));
    if (r.boardQuiet) out.push(text({ text: r.boardQuiet, colour: MUTED, after: gap(d, 'm') }));
  }

  /* ======================= 5 · what was seen ======================= */
  if (r.seen) {
    out.push(heading('What was seen on the line', `From the filmed walk — ${r.seen.says}`));
    if (r.seen.rows.length) out.push(seenBlock(r.seen.rows));
    if (r.seen.closed.length) out.push(text({ text: `Closed since: ${r.seen.closed.join('; ')}.`, size: S.small, colour: MUTED, after: gap(d, 'm') }));
  }
  return out;
}

/* ---------------------------------- the gap ---------------------------------- */

function gapBlock(g: GapLine): Block {
  /* The line's name, then its sentence; the "short" words in red — the one
     abnormal number on the line. */
  const parts = (f: Frame) => ({
    says: wrap(f.doc, g.says, f.w, SIZE.body + 0.5, 'bold'),
    owner: g.owner ? wrap(f.doc, `Owner: ${g.owner}`, f.w, SIZE.small) : [],
  });
  return {
    height: f => { const p = parts(f); return p.says.length * lead(SIZE.body + 0.5, f.density) + p.owner.length * lead(SIZE.small, f.density) + gap(f.density, 's'); },
    after: f => gap(f.density, 's'),
    lead: f => { const p = parts(f); return p.says.length * lead(SIZE.body + 0.5, f.density) + p.owner.length * lead(SIZE.small, f.density); },
    keepWithNext: !!g.series && g.series.points.length >= 2,
    draw: (f, y) => {
      const p = parts(f), lh = lead(SIZE.body + 0.5, f.density);
      p.says.forEach((l, i) => {
        const yy = y + (SIZE.body + 0.5) * 0.92 + i * lh;
        const k = g.short ? l.indexOf(g.short) : -1;
        if (k < 0) { font(f.doc, SIZE.body + 0.5, 'bold', INK); f.doc.text(l, f.x, yy); return; }
        font(f.doc, SIZE.body + 0.5, 'bold', INK); const pre = l.slice(0, k); f.doc.text(pre, f.x, yy);
        const x2 = f.x + f.doc.getTextWidth(pre);
        font(f.doc, SIZE.body + 0.5, 'bold', DANGER); f.doc.text(g.short as string, x2, yy);
        font(f.doc, SIZE.body + 0.5, 'bold', INK); f.doc.text(l.slice(k + (g.short as string).length), x2 + f.doc.getTextWidth(g.short as string), yy);
      });
      if (p.owner.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.owner, f.x, y + p.says.length * lh + SIZE.small * 0.92); }
    },
  };
}

/** The line's measure over time, against its target — drawn, not described. */
function chartBlock(s: NonNullable<GapLine['series']>): Block {
  const CH = 96;
  return box(f => CH + gap(f.density, 'm'), (f, y) => {
    const doc = f.doc;
    const px0 = f.x + 34, px1 = f.x + f.w - 56, py0 = y + 16, py1 = y + CH - 16;
    const vals = [...s.points.map(p => p.value), ...(s.target != null ? [s.target] : [])];
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    const padV = (hi - lo) * 0.12; lo -= padV; hi += padV;
    const t0 = Date.parse(`${s.points[0].at}T12:00:00`), t1 = Date.parse(`${s.points[s.points.length - 1].at}T12:00:00`);
    const X = (at: string) => px0 + (t1 > t0 ? ((Date.parse(`${at}T12:00:00`) - t0) / (t1 - t0)) : 0.5) * (px1 - px0);
    const Y = (v: number) => py1 - ((v - lo) / (hi - lo)) * (py1 - py0);
    font(doc, SIZE.tiny, 'bold', MUTED);
    doc.text(`${s.measure.toUpperCase()}${s.unit ? ` (${s.unit})` : ''} · ${s.better === 'up' ? 'HIGHER' : 'LOWER'} IS BETTER`, f.x, y + 8);
    doc.setDrawColor(LINE); doc.setLineWidth(0.5);
    doc.line(px0, py1, px1, py1); doc.line(px0, py0, px0, py1);
    font(doc, SIZE.tiny, 'normal', MUTED);
    doc.text(fmtN(Math.round(hi * 10) / 10), px0 - 4, py0 + 3, { align: 'right' });
    doc.text(fmtN(Math.round(lo * 10) / 10), px0 - 4, py1, { align: 'right' });
    doc.text(day(s.points[0].at), px0, py1 + 10);
    doc.text(day(s.points[s.points.length - 1].at), px1, py1 + 10, { align: 'right' });
    if (s.target != null) {
      doc.setDrawColor(INK2); doc.setLineWidth(0.9); doc.setLineDashPattern([3, 2], 0);
      doc.line(px0, Y(s.target), px1, Y(s.target)); doc.setLineDashPattern([], 0);
      font(doc, SIZE.tiny, 'bold', INK2);
      doc.text(`Target ${say(s.target)}`, px1 + 4, Y(s.target) + 2.5);
    }
    doc.setDrawColor(INK); doc.setLineWidth(1.4);
    for (let i = 1; i < s.points.length; i++) doc.line(X(s.points[i - 1].at), Y(s.points[i - 1].value), X(s.points[i].at), Y(s.points[i].value));
    doc.setFillColor(INK);
    for (const p of s.points) doc.circle(X(p.at), Y(p.value), 1.6, 'F');
    const last = s.points[s.points.length - 1];
    font(doc, SIZE.small, 'bold', INK);
    const lastY = Y(last.value), tY = s.target != null ? Y(s.target) : -99;
    doc.text(say(last.value), px1 + 4, Math.abs(lastY - tY) < 9 ? (lastY < tY ? lastY - 4 : lastY + 10) : lastY + 3);
  }, f => gap(f.density, 'm'));
}

/* ------------------------------ where the loss is ------------------------------ */

function paretoBlock(p: NonNullable<SixMReport['pareto']>): Block {
  const nameW = 150, numW = 150;
  const max = Math.max(...p.rows.map(r => r.mins), 1);
  const names = (f: Frame, t: string, vital: boolean) => wrap(f.doc, t, nameW - 8, SIZE.small, vital ? 'bold' : 'normal');
  return rows({
    header: headerRow([['Category', 0], ['Minutes lost', nameW], ['Minutes · share · stops', 0]].map(([t, x], i) => (i === 2 ? [t as string, CW, 'right'] : [t as string, x as number])) as [string, number, ('left' | 'right')?][]),
    rows: p.rows.map(row => ({
      h: f => Math.max(15, 5 + names(f, row.category, row.vital).length * 10),
      draw: (f, y) => {
        rule(f, y);
        font(f.doc, SIZE.small, row.vital ? 'bold' : 'normal', INK); f.doc.text(names(f, row.category, row.vital), f.x, y + 10);
        const bw = (f.w - nameW - numW) * (row.mins / max);
        f.doc.setFillColor(row.vital ? INK2 : '#c3ccd9'); f.doc.rect(f.x + nameW, y + 4, Math.max(1, bw), 7, 'F');
        font(f.doc, SIZE.small, 'normal', INK2);
        f.doc.text(`${Math.round(row.mins).toLocaleString('en-GB')} min · ${Math.round(row.share * 100)}% · ${plural(row.stops, 'stop')}`, f.x + f.w, y + 10, { align: 'right' });
      },
    })),
  });
}

function stationsBlock(c: SixMReport['constraints'][number]): Block {
  const nameW = 170, numW = 120;
  const top = Math.max(...c.stations.map(s => s.running), 1) * 1.04;
  const names = (f: Frame, t: string, limit: boolean) => wrap(f.doc, t, nameW - 40, SIZE.small, limit ? 'bold' : 'normal');
  return rows({
    rows: c.stations.map(s => ({
      h: f => Math.max(15, 5 + names(f, s.name, s.limit).length * 10),
      draw: (f, y) => {
        rule(f, y);
        font(f.doc, SIZE.small, s.limit ? 'bold' : 'normal', INK); f.doc.text(names(f, s.name, s.limit), f.x, y + 10);
        if (s.limit) { f.doc.setDrawColor(INK); f.doc.setLineWidth(0.8); f.doc.roundedRect(f.x + nameW - 36, y + 3, 32, 10, 2, 2, 'S'); font(f.doc, SIZE.tiny, 'bold', INK); f.doc.text('LIMIT', f.x + nameW - 20, y + 10.2, { align: 'center' }); }
        const span = f.w - nameW - numW;
        f.doc.setFillColor('#dde3ec'); f.doc.rect(f.x + nameW, y + 4, Math.max(1, span * s.running / top), 7, 'F');
        f.doc.setFillColor(s.limit ? INK : '#8796ad'); f.doc.rect(f.x + nameW, y + 4, Math.max(1, span * s.effective / top), 7, 'F');
        font(f.doc, SIZE.small, s.limit ? 'bold' : 'normal', INK2);
        f.doc.text(`${fmtN(s.effective)} of ${fmtN(s.running)} ${c.unit}/min`, f.x + f.w, y + 10, { align: 'right' });
      },
    })),
    after: 'm',
  });
}

/* --------------------------------- a problem --------------------------------- */

function problemBlocks(p: ProblemRep, d: Density, out: Block[]): void {
  out.push(heading(`Problem ${p.n} — ${p.title}`, p.says || undefined));
  // The phase in words and colour, then where it came from — travels with the fish.
  const metaLines = (f: Frame) => wrap(f.doc, p.meta, f.w - pillW(f.doc, p.phaseWord, 140) - 10, SIZE.small);
  out.push({
    keepWithNext: true,
    height: f => Math.max(14, metaLines(f).length * lead(SIZE.small, f.density)) + 4,
    draw: (f, y) => {
      const pw = pillW(f.doc, p.phaseWord, 140);
      pill(f.doc, f.x, y, pw, p.tone, p.phaseWord);
      font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(metaLines(f), f.x + pw + 10, y + 9);
    },
  });
  if (p.measure) out.push({ ...text({ text: p.measure, size: SIZE.body, colour: INK2, before: 2, after: 4 }), keepWithNext: true });

  if (p.causeCount) {
    const fish = fishbone(p);
    out.push(fish.block);
    if (p.suggested) out.push(text({ text: p.suggested, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));
    const partial = (f: Frame) => !fish.layout(f).complete;
    out.push(when(partial, label(`Every cause on the fishbone — ${p.causeCount}, bone by bone`)));
    out.push(when(partial, causeRows(p)));
  } else if (p.suggested) out.push(text({ text: p.suggested, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));

  /* The why-chains of the roots, each read back up to the problem. */
  if (p.roots.length) {
    out.push(label(p.roots.length === 1 ? 'Why it happens — the root' : `Why it happens — ${p.roots.length} roots`));
    for (const rt of p.roots) {
      out.push({ ...text({ text: `${rt.cause.bone} · ${rt.cause.text}`, size: SIZE.body, style: 'bold', before: 2, after: 1 }), keepWithNext: true });
      out.push({ ...text({ text: `${rt.cause.grade} · ${rt.cause.statusWord}${rt.cause.from ? ` · from ${rt.cause.from}` : ''}${rt.cause.by ? ` · ${rt.cause.by}` : ''}`, size: SIZE.small, colour: MUTED, after: 3 }), keepWithNext: rt.whys.length > 0 });
      if (rt.whys.length) out.push({ ...text({ text: 'Why? — asked again at each answer, down to the root:', size: SIZE.small, colour: MUTED, indent: 22, after: 2 }), keepWithNext: true });
      rt.whys.forEach((wy, i) => out.push(text({
        text: `${wy.text}${wy.grade ? ` (${wy.grade.toLowerCase()})` : ''}${i === rt.whys.length - 1 ? ' — the root' : ''}`,
        size: SIZE.body - 0.5, colour: INK2, indent: 22, bullet: `${i + 1}`, after: 2, style: i === rt.whys.length - 1 ? 'bold' : 'normal',
      })));
      if (rt.therefore.length) {
        out.push({ ...text({ text: 'Read back from the root:', size: SIZE.small, style: 'bold', colour: MUTED, before: 3, after: 1, indent: 22 }), keepWithNext: true });
        rt.therefore.forEach((t, i) => out.push(text({ text: t, size: SIZE.small, colour: MUTED, indent: 22, after: i === rt.therefore.length - 1 ? gap(d, 's') : 1 })));
      }
    }
  } else if (p.rootless && p.causeCount) out.push(text({ text: p.rootless, size: SIZE.small, colour: MUTED, after: gap(d, 's') }));
  else if (p.rootless) out.push(text({ text: `${p.rootless} Opened, and the causes are next.`, size: SIZE.body, colour: MUTED, after: gap(d, 's') }));

  if (p.counter.length) {
    out.push(label(`Countermeasures — ${p.counterSays}`));
    out.push(counterRows(p.counter));
  } else if (p.roots.length) out.push(text({ text: 'No countermeasure on the board for it yet.', size: SIZE.small, colour: MUTED, after: gap(d, 's') }));

  if (p.hold) {
    out.push(label('Keeping the gain'));
    out.push(holdBlock(p.hold));
  } else if (p.holdless) out.push(text({ text: p.holdless, size: SIZE.small, colour: MUTED, after: gap(d, 'm') }));
}

/* -------------------------------- the fishbone -------------------------------- */

const HEAD_W = 112, TAIL = 14, SLOPE = 0.3, LBL = 15, PAD = 9, ROOT_W = 21;
const TXT = 7.5, TLH = 8.8, META = 7, MLH = 8.6;

/** A cause as placed on its bone: `d` its distance from the spine (near
 *  edge), `x` where its mark sits, and whether ROOT needs a line of its own. */
interface Placed { c: CauseRep; lines: string[]; d: number; h: number; x: number; rootLine: boolean }
interface Region { m: SixM; label: string; up: boolean; xr: number; placed: Placed[]; total: number }
interface FishLayout { up: number; down: number; regions: Region[]; head: { lines: string[]; h: number }; complete: boolean; height: number }

const causeStyle = (c: CauseRep) => (c.status === 'confirmed' ? 'bold' as const : 'normal' as const);
const metaOf = (c: CauseRep) => `${c.grade} · ${c.statusWord}`;

/* THE FISH, MEASURED. Three bones above the spine (People, Machine, Method)
 * and three below (Material, Measurement, Environment), each slanting into
 * the spine towards the head. A cause sits between its own bone and the one
 * before it, on a rib that runs into its bone — so its column slants with the
 * bones and keeps the same width however far from the spine it is. Each half
 * is as tall as its fullest bone needs, and never shorter than half the head. */
function layoutFish(f: Frame, p: ProblemRep, K: number): FishLayout {
  const doc = f.doc;
  const x0 = f.x + TAIL, x1 = f.x + f.w - HEAD_W - 6;
  const regW = (x1 - x0) / 3;
  const headLines = wrap(doc, p.title, HEAD_W - 18, 9.5, 'bold');
  const headH = 18 + headLines.length * 11.5 + (p.number ? 12 : 0) + 22;
  let complete = true;
  const regions: Region[] = p.bones.map((b, k) => {
    const i = k % 3;
    const xr = x0 + (i + 1) * regW - 3;           // where this bone meets the spine
    const prev = x0 + i * regW - 3;               // where the bone before it does
    const placed: Placed[] = [];
    let dd = PAD;
    for (const c of b.causes) {
      if (placed.length >= K) { complete = false; continue; }
      /* Room between the bone before (at this cause's near edge) and its own
         bone (at its far edge): the bones slant together, so it is the
         region's width less the slant over the cause's own height. */
      const left = i === 0 ? Math.max(f.x + 1, x0 + 2 - SLOPE * dd) : prev - SLOPE * dd + 6;
      const room = (h: number) => xr - SLOPE * (dd + h) - 5 - (left + 9);
      const fit = (h: number) => {
        const lines = wrap(doc, c.text, room(h), TXT, causeStyle(c));
        font(doc, META, 'normal');
        const rootLine = !!c.root && doc.getTextWidth(metaOf(c)) + 4 + ROOT_W > room(h);
        return { lines, rootLine, h: lines.length * TLH + MLH * (rootLine ? 2 : 1) + 6 };
      };
      let g = fit(3 * TLH + MLH + 6);
      g = fit(g.h);
      if (g.lines.length > 4) { complete = false; continue; }   // too long to draw well — it is in the full list
      placed.push({ c, lines: g.lines, d: dd, h: g.h, x: left, rootLine: g.rootLine });
      dd += g.h;
    }
    return { m: b.m, label: b.label, up: k < 3, xr, placed, total: b.causes.length };
  });
  const need = (up: boolean) => Math.max(...regions.filter(g => g.up === up).map(g => g.placed.reduce((n, x) => n + x.h, 0) + (g.placed.length ? 0 : 12) + PAD + LBL + 6));
  const upH = Math.max(need(true), headH / 2 + 10, 44);
  const downH = Math.max(need(false), headH / 2 + 10, 44);
  return { up: upH, down: downH, regions, head: { lines: headLines, h: headH }, complete, height: upH + downH + 20 };
}

function fishbone(p: ProblemRep): { block: Block; layout: (f: Frame) => FishLayout } {
  /* As many causes per bone as keeps the drawing under three fifths of a
     page — at least one each. Measured with the real font at the page's width
     and kept, so the dry run and the drawing agree. */
  const cache = new Map<string, FishLayout>();
  const layout = (f: Frame): FishLayout => {
    const key = `${f.w}:${f.bottom - f.top}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const maxH = (f.bottom - f.top) * 0.6;
    let K = 6, l = layoutFish(f, p, K);
    while (l.height > maxH && K > 1) { K--; l = layoutFish(f, p, K); }
    cache.set(key, l);
    return l;
  };
  return {
    block: box(f => layout(f).height + gap(f.density, 'm'), (f, y) => drawFish(f, y, p, layout(f)), f => gap(f.density, 'm')),
    layout,
  };
}

/** A block that is only there when `on` says so at the page's width — the
 *  full cause list, printed exactly when the drawing could not carry it all. */
function when(on: (f: Frame) => boolean, b: Block): Block {
  return {
    keepWithNext: b.keepWithNext,
    height: f => (on(f) ? b.height(f) : 0),
    after: f => (on(f) ? b.after?.(f) ?? 0 : 0),
    lead: b.lead,
    draw: b.draw,
    split: b.split,
  };
}

function drawFish(f: Frame, y: number, p: ProblemRep, l: FishLayout): void {
  const doc = f.doc;
  const spineY = y + l.up;
  const x0 = f.x + TAIL, hx = f.x + f.w - HEAD_W;
  /* the spine, and the tail */
  doc.setDrawColor(INK); doc.setLineWidth(2.4); doc.setLineCap('round');
  doc.line(x0, spineY, hx, spineY);
  doc.setLineWidth(1.6);
  doc.line(x0, spineY, x0 - 12, spineY - 10); doc.line(x0, spineY, x0 - 12, spineY + 10);
  doc.setLineCap('butt');

  /* the six bones: People, Machine, Method above; Material, Measurement, Environment below */
  for (const g of l.regions) {
    const dir = g.up ? -1 : 1, half = g.up ? l.up : l.down;
    const len = half - LBL - 2;
    const endX = g.xr - SLOPE * len, endY = spineY + dir * len;
    doc.setDrawColor(INK2); doc.setLineWidth(1.3);
    doc.line(g.xr, spineY, endX, endY);
    // the bone's name at its outer end, with how many causes it carries
    font(doc, SIZE.small, 'bold', INK);
    const name = g.label.toUpperCase();
    const nw = doc.getTextWidth(name);
    font(doc, SIZE.tiny, 'normal', MUTED);
    const cnt = g.total ? `  ${g.total}` : '';
    const cw = doc.getTextWidth(cnt);
    const lx = Math.max(f.x, endX - (nw + cw) / 2);
    const ly = g.up ? spineY - half + 9 : spineY + half - 3;
    font(doc, SIZE.small, 'bold', INK); doc.text(name, lx, ly);
    font(doc, SIZE.tiny, 'normal', MUTED); if (cnt) doc.text(cnt, lx + nw, ly);
    if (!g.placed.length) {
      font(doc, SIZE.tiny, 'normal', MUTED);
      doc.text('looked — nothing found', g.xr - SLOPE * (PAD + 6) - 4 - doc.getTextWidth('looked — nothing found'), g.up ? spineY - PAD - 2 : spineY + PAD + 8);
    }
    /* each cause: its words on a rib that runs into the bone */
    for (const pc of g.placed) {
      const top = g.up ? spineY - pc.d - pc.h : spineY + pc.d;
      const ribY = top + pc.h - 2;
      const ribX = g.xr - SLOPE * Math.abs(ribY - spineY);
      doc.setDrawColor(RIB); doc.setLineWidth(0.6); doc.line(pc.x, ribY, ribX, ribY);
      const ty = top + TXT;
      // the mark: solid confirmed, outline suspected, a cross for ruled out
      doc.setLineWidth(0.8);
      if (pc.c.status === 'confirmed') { doc.setFillColor(INK); doc.circle(pc.x + 3, ty - 2.6, 2.4, 'F'); }
      else if (pc.c.status === 'suspected') { doc.setDrawColor(INK); doc.circle(pc.x + 3, ty - 2.6, 2.3, 'S'); }
      else { doc.setDrawColor(MUTED); doc.line(pc.x + 1, ty - 4.6, pc.x + 5, ty - 0.6); doc.line(pc.x + 5, ty - 4.6, pc.x + 1, ty - 0.6); }
      const out = pc.c.status === 'ruled_out';
      font(doc, TXT, causeStyle(pc.c), out ? MUTED : INK);
      pc.lines.forEach((ln, i) => {
        const by = ty + i * TLH;
        doc.text(ln, pc.x + 9, by);
        if (out) { doc.setDrawColor(MUTED); doc.setLineWidth(0.6); doc.line(pc.x + 9, by - 2.4, pc.x + 9 + doc.getTextWidth(ln), by - 2.4); }
      });
      const my = ty + pc.lines.length * TLH;
      font(doc, META, 'normal', MUTED);
      const meta = metaOf(pc.c);
      doc.text(meta, pc.x + 9, my - 0.5);
      if (pc.c.root) {
        const mx = pc.rootLine ? pc.x + 9 : pc.x + 9 + doc.getTextWidth(meta) + 4;
        const ry = pc.rootLine ? my + MLH : my;
        doc.setFillColor(INK); doc.roundedRect(mx, ry - 6.6, ROOT_W, 8, 1.5, 1.5, 'F');
        font(doc, 6.5, 'bold', '#ffffff'); doc.text('ROOT', mx + ROOT_W / 2, ry - 0.8, { align: 'center' });
      }
    }
  }

  /* the head: the problem, its number, and where it is — in words */
  const hh = l.head.h, hy = spineY - hh / 2;
  doc.setFillColor(SHELL); doc.roundedRect(hx, hy, HEAD_W, hh, 9, 9, 'F');
  font(doc, SIZE.tiny, 'bold', '#8fa3c4'); doc.text(`PROBLEM ${p.n}`, hx + 9, hy + 13);
  font(doc, 9.5, 'bold', '#ffffff'); doc.text(l.head.lines, hx + 9, hy + 25);
  let yy = hy + 25 + l.head.lines.length * 11.5;
  if (p.number) { font(doc, SIZE.small, 'normal', '#c9d4e6'); doc.text(p.number, hx + 9, yy - 2); yy += 12; }
  const pw = Math.min(HEAD_W - 18, pillW(doc, p.phaseWord, HEAD_W - 18));
  doc.setFillColor('#ffffff'); doc.roundedRect(hx + 8, yy - 4, pw + 2, 14, 3, 3, 'F');
  pill(doc, hx + 9, yy - 3, pw, p.tone, p.phaseWord);

  /* the key, under the drawing */
  const ky = y + l.up + l.down + 12;
  font(doc, SIZE.tiny, 'normal', MUTED);
  let kx = f.x;
  doc.setFillColor(INK); doc.circle(kx + 3, ky - 2.5, 2.3, 'F'); doc.text('confirmed', kx + 8, ky); kx += 8 + doc.getTextWidth('confirmed') + 12;
  doc.setDrawColor(INK); doc.setLineWidth(0.8); doc.circle(kx + 3, ky - 2.5, 2.2, 'S'); doc.text('suspected', kx + 8, ky); kx += 8 + doc.getTextWidth('suspected') + 12;
  doc.setDrawColor(MUTED); doc.line(kx + 1, ky - 4.5, kx + 5, ky - 0.5); doc.line(kx + 5, ky - 4.5, kx + 1, ky - 0.5);
  doc.text('ruled out (struck through)', kx + 8, ky); kx += 8 + doc.getTextWidth('ruled out (struck through)') + 12;
  doc.setFillColor(INK); doc.roundedRect(kx, ky - 6.6, ROOT_W, 8, 1.5, 1.5, 'F');
  font(doc, 6.5, 'bold', '#ffffff'); doc.text('ROOT', kx + ROOT_W / 2, ky - 0.8, { align: 'center' });
  font(doc, SIZE.tiny, 'normal', MUTED); doc.text('drilled to its root with the five whys', kx + ROOT_W + 4, ky);
}

/** Every cause, bone by bone, as rows — when the drawing could not carry them all. */
function causeRows(p: ProblemRep): Block {
  const boneW = 78, howW = 120;
  const all = p.bones.flatMap(b => b.causes);
  const words = (f: Frame, c: CauseRep) => wrap(f.doc, c.text, f.w - boneW - howW - 8, SIZE.small, causeStyle(c));
  return rows({
    header: headerRow([['Bone', 0], ['Cause', boneW], ['How known · status', CW - howW]]),
    rows: all.map(c => ({
      h: f => Math.max(15, 5 + words(f, c).length * 10.5),
      draw: (f, y) => {
        rule(f, y);
        font(f.doc, SIZE.small, 'bold', INK2); f.doc.text(c.bone, f.x, y + 10);
        const ls = words(f, c);
        const out = c.status === 'ruled_out';
        font(f.doc, SIZE.small, causeStyle(c), out ? MUTED : INK);
        ls.forEach((ln, i) => {
          f.doc.text(ln, f.x + boneW, y + 10 + i * 10.5);
          if (out) { f.doc.setDrawColor(MUTED); f.doc.setLineWidth(0.6); f.doc.line(f.x + boneW, y + 7.2 + i * 10.5, f.x + boneW + f.doc.getTextWidth(ln), y + 7.2 + i * 10.5); }
        });
        font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(`${c.grade} · ${c.statusWord}${c.root ? ' · Root' : ''}`, f.x + f.w - howW, y + 10);
      },
    })),
  });
}

/** Countermeasures: what, its bone and owner, its state and day — and what it
 *  was expected to do against what it did. */
function counterRows(list: CounterRep[]): Block {
  const sideW = 104, stateW = 96;
  const parts = (f: Frame, c: CounterRep) => {
    const w = f.w - sideW - stateW - 10;
    return {
      what: wrap(f.doc, c.what, w, SIZE.body - 0.5, 'bold'),
      cause: c.cause ? wrap(f.doc, `For: ${c.cause}`, w, SIZE.small) : [],
      exp: c.expect ? wrap(f.doc, `Expected: ${c.expect}`, w, SIZE.small) : [],
      hap: c.happened ? wrap(f.doc, `What happened: ${c.happened}`, w, SIZE.small, 'bold') : [],
      side: wrap(f.doc, [c.bone, c.owner].filter(Boolean).join(' · '), sideW - 8, SIZE.small),
    };
  };
  return rows({
    rows: list.map(c => ({
      h: f => {
        const p = parts(f, c);
        return 8 + Math.max(p.what.length * 11.5 + (p.cause.length + p.exp.length + p.hap.length) * 10.5, p.side.length * 10.5, 14) + 5;
      },
      draw: (f, y) => {
        const p = parts(f, c);
        rule(f, y);
        let ty = y + 12;
        font(f.doc, SIZE.body - 0.5, 'bold', INK); f.doc.text(p.what, f.x, ty); ty += p.what.length * 11.5;
        if (p.cause.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.cause, f.x, ty - 1); ty += p.cause.length * 10.5; }
        if (p.exp.length) { font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.exp, f.x, ty - 1); ty += p.exp.length * 10.5; }
        if (p.hap.length) { font(f.doc, SIZE.small, 'bold', c.happened === 'not written up yet' ? MUTED : INK2); f.doc.text(p.hap, f.x, ty - 1); }
        font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.side, f.x + f.w - sideW - stateW, y + 12);
        pill(f.doc, f.x + f.w - stateW, y + 4, stateW, c.tone, c.when);
      },
    })),
  });
}

function holdBlock(h: NonNullable<ProblemRep['hold']>): Block {
  const stateW = 120;
  const words = (f: Frame) => wrap(f.doc, `The check: ${h.what}`, f.w - stateW - 10, SIZE.body - 0.5, 'bold');
  const meta = (f: Frame) => wrap(f.doc, [h.who, h.every, `since ${h.since}`, h.last ? `last checked ${h.last}` : 'not checked yet'].filter(Boolean).join(' · '), f.w - stateW - 10, SIZE.small);
  return box(f => 8 + words(f).length * 11.5 + meta(f).length * 10.5 + 6 + gap(f.density, 'm'), (f, y) => {
    rule(f, y);
    const wl = words(f);
    font(f.doc, SIZE.body - 0.5, 'bold', INK); f.doc.text(wl, f.x, y + 12);
    font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(meta(f), f.x, y + 11 + wl.length * 11.5);
    pill(f.doc, f.x + f.w - stateW, y + 4, stateW, h.tone, h.word);
  }, f => gap(f.density, 'm'));
}

/* --------------------------------- the board --------------------------------- */

function boardBlock(b: SixMReport['board'][number]): Block {
  const ownerW = 100, stateW = 100;
  const parts = (f: Frame, r: BoardRow) => {
    const w = f.w - ownerW - stateW - 10;
    return {
      what: wrap(f.doc, r.what, w, SIZE.small + 0.5, r.tone === 'done' ? 'normal' : 'bold'),
      why: [...(r.why ? wrap(f.doc, `Why: ${r.why}`, w, SIZE.small) : []), ...(r.words ? wrap(f.doc, `When: ${r.words}`, w, SIZE.small) : [])],
      cause: r.cause ? wrap(f.doc, r.cause, w, SIZE.small) : [],
      owner: wrap(f.doc, [r.owner || 'No owner', r.line].filter(Boolean).join(' · '), ownerW - 8, SIZE.small),
    };
  };
  return rows({
    header: headerRow([['What, and why', 0], ['Who', CW - ownerW - stateW], ['State · day', CW - stateW]], `${b.label.toUpperCase()} — ${b.says}`),
    rows: b.rows.map(r => ({
      h: f => { const p = parts(f, r); return 7 + Math.max(p.what.length * 11 + (p.why.length + p.cause.length) * 10, p.owner.length * 10, 13) + 4; },
      draw: (f, y) => {
        const p = parts(f, r);
        rule(f, y);
        const done = r.tone === 'done';
        let ty = y + 11;
        font(f.doc, SIZE.small + 0.5, done ? 'normal' : 'bold', done ? MUTED : INK); f.doc.text(p.what, f.x, ty); ty += p.what.length * 11;
        if (p.why.length) { font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.why, f.x, ty - 1); ty += p.why.length * 10; }
        if (p.cause.length) { font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.cause, f.x, ty - 1); }
        font(f.doc, SIZE.small, 'normal', done ? MUTED : INK2); f.doc.text(p.owner, f.x + f.w - ownerW - stateW, y + 11);
        pill(f.doc, f.x + f.w - stateW, y + 3, stateW, r.tone, r.when);
      },
    })),
  });
}

function seenBlock(list: NonNullable<SixMReport['seen']>['rows']): Block {
  const whereW = 120, ownerW = 96, stateW = 84;
  const parts = (f: Frame, r: typeof list[number]) => ({
    what: wrap(f.doc, r.what, f.w - whereW - ownerW - stateW - 12, SIZE.small + 0.5, 'bold'),
    found: r.found,
    where: wrap(f.doc, r.where, whereW - 8, SIZE.small),
    owner: wrap(f.doc, r.owner || 'No owner', ownerW - 8, SIZE.small),
  });
  return rows({
    header: headerRow([['What was seen', 0], ['Where', CW - whereW - ownerW - stateW], ['Who', CW - ownerW - stateW], ['State', CW - stateW]]),
    rows: list.map(r => ({
      h: f => { const p = parts(f, r); return 7 + Math.max(p.what.length * 11 + 10, p.where.length * 10, p.owner.length * 10, 13) + 4; },
      draw: (f, y) => {
        const p = parts(f, r);
        rule(f, y);
        font(f.doc, SIZE.small + 0.5, 'bold', INK); f.doc.text(p.what, f.x, y + 11);
        font(f.doc, SIZE.small, 'normal', MUTED); f.doc.text(p.found, f.x, y + 10 + p.what.length * 11);
        font(f.doc, SIZE.small, 'normal', INK2); f.doc.text(p.where, f.x + f.w - whereW - ownerW - stateW, y + 11);
        f.doc.text(p.owner, f.x + f.w - ownerW - stateW, y + 11);
        pill(f.doc, f.x + f.w - stateW, y + 3, stateW, r.tone, r.state);
      },
    })),
  });
}
