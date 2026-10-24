/* THE 6M REPORT — THE MODEL (docs/STEADY.md S4: a paper's model apart from its drawing).
 * The report, from the records: the gap, the Pareto, the constraints, each problem with its
 * fishbone, the board by bone, what was seen, the evidence, everything owed. The screen lists it
 * (screens/PaceExecReport) and the paper prints it (lib/sixmReportPdf); the lean page's tiles and
 * closing line read it (lib/sixmLean); the one page reads it (lib/sixmStatus). Pure: nothing
 * stored, nothing drawn here. */

import type { WeekLine } from '../project/journey/journey';
import type { Case } from '../types';
import type { PaceTodoRow } from '../db/rows';
import type { Phase, ProblemView } from './problems';
import { PHASE_WORD } from './problems';
import { KNOWN_WORD, SIXM, everyWords, holdDue, sixmLabel, toSixM, type Cause, type CauseStatus, type Grade, type SixM } from './sixm';
import type { FishboneData } from './fishbone';
import { factsOf, lineCapacityOf, therefore } from './fishbone';
import { gapOf, lineSeries, say } from './measures';
import { paretoFromLog } from './paretoFromLog';
import { paretoView } from './paretoView';
import { analyse } from './capacity';
import { niceDay, todayISO } from './weeks';

import { PHASE_ORDER, bonesSaid, pacedOwed, problemsSaid, saidText, sixmProblemOf, type Said } from './portfolio';


import { fixTag, fixesOf } from '../ui/fishbone/layout';
import { constraintOfBars } from './lineRead';
import { lossFiguresOf, provedLine, ROLE_WORD, studyLine, studyTitle, type StudyContext } from './studyLinks';
import { lossRows } from '../tools/losses/losses';


import { samplingRows } from '../tools/sampling/sampling';
import { streamRows } from '../tools/valuestream/steps';
import { agreedFor, changeoverSheet, moneyOf } from '../tools/changeover/changeover';


import type { StudyUse } from './study';

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
  /** How it is known, in the working method's words: seen · data · counted · told. */
  grade: string;
  status: CauseStatus;
  statusWord: string;
  root: boolean;
  /** Where it came from, when it was accepted from the data. */
  from?: string;
  by?: string;
  /** Its fixes, as the fish on screen tags them (ui/fishbone/layout fixTag):
   *  "1 fix · past due", in the board's tone — screen and paper say the same. */
  fix?: { words: string; tone: 'r' | 'a' | 'w' | 'n' | 'g' };
}

export interface CounterRep {
  what: string;
  bone: string;
  owner: string;
  tone: Tone;
  /** The state and the day in words: "Late · was due 1 Oct". */
  when: string;
  /** The day in free words, when no date was given — as on the board. */
  words?: string;
  expect?: string;
  /** What happened — the outcome written when it was done. Printed under
   *  Did it work, beside what it was expected to do. */
  happened?: string;
  /** The cause it is for, in words. */
  cause?: string;
  /** What a study says of it (lib/studyLinks provedLine): before → after on
   *  the same study, what proved it, or how we know it was needed. */
  proved?: string;
}

/** One line of reasoning under Why: the answers in order (the cause as
 *  written, then each "why?"), each with how it is known. */
export interface ChainRep {
  cause: CauseRep;
  answers: { text: string; known?: string }[];
  /** The last answer is the root · still being found · ruled out. */
  state: 'root' | 'open' | 'out';
  /** The chain's bone, status and state in words: "Machine · confirmed · root found". */
  head: string;
  /** Where it came from and who put it there. */
  from?: string;
  /** Read back from the root up to the problem — under a root only. */
  therefore: string[];
}

export interface ProblemRep {
  id: string;
  n: number;
  title: string;
  phase: Phase;
  phaseWord: string;
  tone: Tone;
  /** Line · opened · closed — beside the phase, under the title. */
  meta: string;
  /** Closed — a closed problem still checking it worked is not being worked
   *  (lib/sixmStatus lists the open ones). */
  closed?: boolean;
  /** The head's number — "3 h a week" — on the drawn fish. */
  number?: string;
  bones: { m: SixM; label: string; causes: CauseRep[] }[];
  causeCount: number;

  /* ---- Problem: the head, its number, where it came from, where it is ---- */
  /** The head's sentence — its number now and its share. */
  says: string;
  /** Before → now and target, in one sentence. */
  measure?: string;
  /** Where it came from: the Pareto bar, the gap, the constraint, something
   *  seen — and "opened for …" when a bar outside the vital few was opened. */
  from?: string;
  /** Where it is and is not, from the stops (lib/fishbone factsOf). */
  is: string[];
  isNot: string[];

  /* ---- Why: every chain ---- */
  chains: ChainRep[];
  /** "3 chains — 1 root found · 1 still being found · 1 ruled out". */
  whySays: string;
  /** What the data suggests and nobody has looked at yet, per bone. */
  suggested: string;
  /** Said when nothing is on the fishbone yet. */
  rootless?: string;
  /** The five whys as written before the fishbone (the old `Case.whys`),
   *  read back from the root, while they are not yet on a bone — so nothing
   *  the team wrote is missing from the paper. */
  written?: string;

  /* ---- Fix ---- */
  counter: CounterRep[];
  counterSays: string;

  /* ---- Did it work ---- */
  worked: {
    /** The verdict, by phase — never Holding until the number shows it. */
    says: string;
    tone: Tone;
    /** Before → now on the problem's number, and whether it moved — once a fix is done. */
    number?: string;
    /** Each fix done: what it was expected to do beside what happened. */
    fixes: { what: string; expect?: string; happened: string }[];
  };
  /** The check that keeps the gain: `due` is lib/sixm holdDue's words —
   *  "next check 19 Oct", "check due 15 Oct", "check missed — was due 12 Oct". */
  hold?: { what: string; who?: string; every: string; since: string; last?: string; due: string; word: string; tone: Tone };
  /** A closed problem with no check set — said, not hidden. */
  holdless?: string;
}

export interface BoardRow { what: string; why?: string; owner: string; tone: Tone; when: string;
  /** The day in free words, when no date was given — "before the Christmas peak". */
  words?: string; cause?: string; line?: string;
  /** What a study says of it (lib/studyLinks provedLine) — the same line it
   *  carries under its problem, so an action raised from a map's step that is
   *  on no problem still shows its before → after on the board. */
  proved?: string }

export interface SixMReport {
  name: string;
  /** A line's own deck: the line it covers. */
  scope?: string;
  lead?: string;
  printed: string;
  /** The band: where the lines are, then the problems and the board. */
  sentence: string;
  slip: string;
  /** The same, in pieces — the late and waiting parts carry their tone on
   *  screen. Home's 6M row says these words (lib/portfolio problemsSaid,
   *  bonesSaid), so the control room and the paper are one statement. */
  slipSaid: Said[];
  gaps: GapLine[];
  /** Said once when no line has a measure. */
  gapNone?: string;
  /** More than one line in scope — the band says "the lines", whether or not any is measured. */
  manyLines: boolean;
  pareto?: { period?: string; says: string; rows: { category: string; mins: number; share: number; stops: number; vital: boolean }[] };
  constraints: { line: string; unit: string; says: string; stations: { name: string; running: number; effective: number; limit: boolean }[] }[];
  problems: ProblemRep[];
  /** Said when there are none. */
  noProblems?: string;
  board: { m: SixM | null; label: string; says: string; rows: BoardRow[] }[];
  boardSays: string;
  /** Bones with nothing on the board, in one line. */
  boardQuiet?: string;
  /** THIS WEEK AND NEXT (lib/journey weekLine) — the one line the front page says. */
  week?: WeekLine;
  /** EVERYTHING OWED (lib/portfolio pacedOwed — the control room, Needs you and Actions count the
   *  same): the countermeasures, the materials and programs not in, the checks that keep a gain; how
   *  many are past their day, and of what — "2 countermeasures, 2 materials, 1 program". */
  owed: { open: number; late: number; lateSaid: string };
  seen?: { says: string; rows: { what: string; where: string; owner: string; found: string; tone: Tone; state: string }[]; closed: string[] };
  /** EVIDENCE — every study on the job (on the line, when the report is for
   *  one): what it is of, what it is used for, what it says, and a value
   *  stream's steps as a table — the same appendix the client report has. */
  evidence: { title: string; used: string; line: string; tone: string; stream?: ReturnType<typeof streamRows>; changeover?: ReturnType<typeof changeoverSheet>;
    /** A shift's loss count as a table (lib/ie/losses lossRows). */
    losses?: NonNullable<ReturnType<typeof lossRows>>;
    /** A work sampling as a table — each person's shares with their margins (lib/ie/sampling samplingRows). */
    sampling?: NonNullable<ReturnType<typeof samplingRows>> }[];
}

/** What a loss count reads beside its facts — the lines' stops and cost
 *  models the fishbones already read (lib/studyLinks StudyContext). */
export const studyCtx = (d: Pick<FishboneData, 'observations' | 'workspaces'>): StudyContext => ({ observations: d.observations, workspaces: d.workspaces });

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
  /** This week and next, as the journey counts it (lib/journey weekLine). */
  week?: WeekLine;
}

const DAY = 86_400_000;
const PHASE_TONE: Record<Phase, Tone> = { finding: 'going', acting: 'going', proving: 'going', holding: 'done', closed: 'done', slipped: 'failed' };
/** How a cause or an answer is known, in the working method's words (seen · data · counted · told). */
const GRADE_WORD = (g?: Grade) => (g ? KNOWN_WORD[g] : '');
const STATUS_WORD: Record<CauseStatus, string> = { confirmed: 'confirmed', suspected: 'suspected', ruled_out: 'ruled out' };
const GRADE_RANK: Record<Grade, number> = { measured: 0, counted: 1, observed: 2, reported: 3 };
const STATUS_RANK: Record<CauseStatus, number> = { confirmed: 0, suspected: 1, ruled_out: 2 };
const SOURCE_WORD: Record<NonNullable<Case['source']>['kind'], string> = {
  gap: 'From the gap', pareto: 'From the Pareto', constraint: 'From the constraint', observed: 'Seen on the line',
};
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const clean = (x: string) => x.trim().replace(/[.;:,\s]+$/, '');
export const day = (iso?: string) => niceDay(iso);
const listWords = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The order a bone's causes are read in: roots, confirmed, suspected, ruled
 *  out — and within each, how well it is known. */
const causeOrder = (a: Cause, b: Cause) =>
  Number(!!b.root && b.status === 'confirmed') - Number(!!a.root && a.status === 'confirmed')
  || STATUS_RANK[a.status] - STATUS_RANK[b.status]
  || GRADE_RANK[a.grade] - GRADE_RANK[b.grade]
  || a.at - b.at;

/** The old five whys (`Case.whys`, written before the fishbone), read back
 *  from the root up to the problem in one sentence — or nothing once every
 *  one of them is on the fish (moved onto a bone as a cause or its whys). */
function writtenBefore(p: Case): string | undefined {
  const whys = (p.whys ?? []).map(w => w.trim().replace(/[.;:,\s]+$/, '')).filter(Boolean);
  if (!whys.length) return undefined;
  const onFish = new Set((p.causes ?? []).flatMap(c => [c.text, ...c.whys.map(w => w.text)]).map(t => t.trim().replace(/[.;:,\s]+$/, '')));
  if (whys.every(w => onFish.has(w))) return undefined;
  const low = (x: string) => (x.length > 1 && /[a-z]/.test(x[1]) ? x[0].toLowerCase() + x.slice(1) : x);
  const chain = [...whys].reverse().concat(p.title.trim().replace(/[.;:,\s]+$/, ''));
  return `${chain.map((x, i) => (i ? low(x) : x)).join(', therefore ')}.`;
}

/** An action's state and day, in words and a tone — the board's rule. */
function actionState(t: PaceTodoRow, today: string): { tone: Tone; when: string; words?: string } {
  if (t.state === 'done') return { tone: 'done', when: t.doneOn ? `Done ${day(t.doneOn)}` : 'Done' };
  const late = !!t.due && t.due < today;
  if (late) return { tone: 'late', when: `Late · was due ${day(t.due)}` };
  /* The day in words is the day when no date was given (lib/actions: `due`
     falls back to it) — whether the action is waiting on someone or not. */
  const words = !t.due && t.when?.trim() ? { words: t.when.trim() } : {};
  if (t.state === 'waiting') return { tone: 'waiting', when: t.due ? `Waiting · due ${day(t.due)}` : 'Waiting on someone', ...words };
  if (t.due) return { tone: 'going', when: `Due ${day(t.due)}` };
  return { tone: 'ahead', when: 'No day yet', ...words };
}
const TONE_RANK: Record<Tone, number> = { failed: 0, late: 1, waiting: 2, going: 3, ahead: 4, done: 5 };


/** The report, from the records — the screen lists it, the paper prints it. */
export function sixmReport(o: SixMInput): SixMReport {
  const today = todayISO(new Date(o.now));
  const { data } = o;
  const scopeLine = o.lineId ? data.lines.find(l => l.id === o.lineId) : undefined;
  const lines = (scopeLine ? [scopeLine] : data.lines).filter(l => !l.deletedAt).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const lineName = (id?: string) => data.lines.find(l => l.id === id)?.name;
  const todos = o.todos.filter(t => !o.lineId || !t.lineId || t.lineId === o.lineId);

  /* ----------------------- everything owed, late — one count ------------------------ */
  const owedRows = pacedOwed({ project: { id: '', name: o.project.name, color: '', createdAt: 0, updatedAt: 0 } as never, steps: todos, lines, atTarget: 0, judged: 0,
    materials: data.materials.filter(m => !o.lineId || !m.lineId || m.lineId === o.lineId), programs: data.programs.filter(p => !o.lineId || !p.lineId || p.lineId === o.lineId),
    problems: o.problems.map(sixmProblemOf) }, today);
  const lateRows = owedRows.filter(x => x.late);
  const lateBy = (kind: string, one: string, many = `${one}s`) => { const n = lateRows.filter(x => x.kind === kind).length; return n ? `${n} ${n === 1 ? one : many}` : ''; };
  const owed = { open: owedRows.length, late: lateRows.length,
    lateSaid: [lateBy('action', 'countermeasure'), lateBy('material', 'material'), lateBy('program', 'program'), lateBy('check', 'check'), lateBy('note', 'reminder')].filter(Boolean).join(', ') };

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
  /* Each line's capacity as the job reads it — its own line balance, else
     the product's Line capacity on the line (lib/fishbone lineCapacityOf),
     the product named: the same the fishbone's "The constraint" reads. */
  const constraints: SixMReport['constraints'] = lines.flatMap(l => {
    const lc = lineCapacityOf(l, data.standards, data.programs);
    if (!lc || lc.cap.stations.length < 2) return [];
    const r = analyse(lc.cap);
    if (!r.limit || r.line == null) return [];
    return [{
      line: lc.product ? `${l.name} · ${lc.product}` : l.name, unit: r.unit, says: r.sentence,
      stations: r.ok.map(x => ({ name: x.station.name.trim() || `Station ${x.index + 1}`, running: x.running, effective: x.effective, limit: x.index === r.limit?.index })),
    }];
  });

  /* ------------------------------ problems ------------------------------- */
  const views = o.problems.slice().sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase) || a.problem.openedAt - b.problem.openedAt);
  const causeText = new Map<string, { text: string; n: number }>();
  views.forEach((v, i) => { for (const c of v.problem.causes ?? []) causeText.set(`${v.problem.id}:${c.id}`, { text: c.text, n: i + 1 }); });
  const repOf = (c: Cause, v?: ProblemView): CauseRep => {
    const tag = v ? fixTag(fixesOf(v.actions, v.problem.id, c.id)) : null;
    return {
      id: c.id, m: c.m, bone: sixmLabel(c.m), text: c.text, grade: GRADE_WORD(c.grade), status: c.status, statusWord: STATUS_WORD[c.status],
      root: !!c.root && c.status === 'confirmed', from: c.source?.label, by: c.by,
      ...(tag ? { fix: { words: tag.words, tone: tag.tone } } : {}),
    };
  };
  const todoById = new Map(todos.map(t => [t.id, t]));

  const problems: ProblemRep[] = views.map((v, i) => {
    const p = v.problem;
    const causes = (p.causes ?? []).slice().sort(causeOrder);
    const ms = v.measure;
    const unit = ms?.unit ?? '';

    /* ------------------------------- Problem ------------------------------- */
    /* A gap problem's figures are four-week averages (lib/fishbone measureOf);
       the gap section above quotes the latest reading, so this says which. */
    const measure = ms && (ms.before != null || ms.now != null) ? [
      p.source?.kind === 'gap' ? `${ms.label}, on the four-week average:` : `${ms.label}:`,
      [ms.before != null && ms.now != null ? `before ${say(ms.before, unit)} → now ${say(ms.now, unit)}` : ms.before != null ? `before ${say(ms.before, unit)}` : `now ${say(ms.now as number, unit)}`,
        ms.target != null ? `target ${say(ms.target, unit)}` : ''].filter(Boolean).join(' · '),
    ].join(' ') : undefined;
    const src = p.source;
    const why = src?.why ? clean(src.why) : '';
    const bar = src?.kind === 'pareto' ? [src.category, src.subcategory, src.asset].filter(Boolean).join(' · ') : '';
    const from = src ? SOURCE_WORD[src.kind] + (bar ? `: ${bar}` : src.kind === 'constraint' && src.station ? `: ${src.station}` : '')
      + (why ? ` — opened for ${why}` : '') : undefined;
    const facts = factsOf(p, data, o.now);

    /* --------------------------------- Why --------------------------------- */
    const sugg = v.bones.filter(b => b.suggestions.length);
    const nSugg = sugg.reduce((n, b) => n + b.suggestions.length, 0);
    const chains: ChainRep[] = causes.map(c => {
      const rep = repOf(c);
      const state: ChainRep['state'] = rep.root ? 'root' : c.status === 'ruled_out' ? 'out' : 'open';
      const answers = [{ text: c.text, ...(rep.grade ? { known: rep.grade } : {}) },
        ...c.whys.filter(x => x.text.trim()).map(x => ({ text: x.text, ...(x.grade ? { known: GRADE_WORD(x.grade) } : {}) }))];
      return {
        cause: rep, answers, state,
        head: [rep.bone, rep.statusWord, state === 'root' ? 'root found' : state === 'out' ? '' : 'still being found'].filter(Boolean).join(' · '),
        ...(rep.from || rep.by ? { from: [rep.from ? `from ${rep.from}` : '', rep.by ?? ''].filter(Boolean).join(' · ') } : {}),
        therefore: state === 'root' ? therefore(c, p.title) : [],
      };
    });
    const nRoot = chains.filter(c => c.state === 'root').length, nOut = chains.filter(c => c.state === 'out').length;
    const nOpen = chains.length - nRoot - nOut;
        const written = writtenBefore(p);

    /* --------------------------------- Fix --------------------------------- */
    const counter: CounterRep[] = v.actions.map(a => {
      const t = todoById.get(a.uid ?? a.ref);
      const st = t ? actionState(t, today) : { tone: (/^done$/i.test(a.status) ? 'done' : 'going') as Tone, when: a.status };
      const ref = t?.causeRef ? causeText.get(t.causeRef) : undefined;
      return {
        what: t?.what ?? a.action ?? '', bone: sixmLabel(toSixM(t?.pillar ?? a.pillar)) || 'Not on a bone',
        owner: (t?.who ?? a.owner ?? '').trim(), tone: st.tone, when: st.when,
        ...('words' in st && st.words ? { words: st.words } : {}),
        ...(t?.expect?.trim() ? { expect: t.expect.trim() } : {}),
        ...(t?.state === 'done' ? { happened: t.outcome?.trim() || 'not written up yet' } : {}),
        ...(ref ? { cause: ref.text } : {}),
        ...((() => { const pr = t ? provedLine(o.data.studies, t.id, 'action', studyCtx(o.data)) : undefined; return pr ? { proved: pr } : {}; })()),
      };
    }).sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
    const open = counter.filter(c => c.tone !== 'done').length, late = counter.filter(c => c.tone === 'late').length;

    /* ----------------------------- Did it work ----------------------------- */
    /* WHETHER THE CHECK IS OWED is lib/sixm holdDue's — the same rule the
       problem's card, the fishbone's strip, Needs you and the control room's
       week read, so the paper and the screen cannot disagree. A missed check
       is red (its day has gone), one coming due amber. */
    const hold = p.hold ? (() => {
      const h = p.hold;
      const due = holdDue(h, today);
      const word = v.phase === 'slipped' ? 'Slipped back'
        : due.state === 'missed' ? (v.phase === 'holding' ? 'Holding · check missed' : 'Check missed')
        : due.state === 'due' ? (v.phase === 'holding' ? 'Holding · check due' : 'Check due')
        : v.phase === 'holding' ? 'Holding' : 'Check set';
      const tone: Tone = v.phase === 'slipped' ? 'failed' : due.state === 'missed' ? 'late'
        : due.state === 'due' ? 'waiting' : v.phase === 'holding' ? 'done' : 'going';
      return {
        what: h.what, who: h.who?.trim() || undefined, every: everyWords(h.everyDays),
        since: day(h.since), last: h.lastChecked ? day(h.lastChecked) : undefined, due: due.words, word, tone,
      };
    })() : undefined;
    const holdless = !hold && p.status === 'closed' ? 'Closed with no check set to keep the gain.' : undefined;
    const doneFixes = counter.filter(c => c.tone === 'done');
    /* The verdict is the phase's (lib/fishbone phaseOf): Holding only when the
       number has moved the right way since; until it is measured, Checking it
       worked — closing a problem is not proof that it worked. */
    const verdict = (): string => {
      switch (v.phase) {
        case 'finding': return 'Not yet — the cause is still being found.';
        case 'acting': return counter.length ? `Not yet — ${open} of ${plural(counter.length, 'fix', 'fixes')} still to do.` : 'Not yet — no fix on the board for it yet.';
        case 'proving': return p.status === 'closed' ? 'Checking it worked — closed, and the number not measured since the fixes were done.' : 'Checking it worked — every fix is done.';
        case 'holding': return 'Holding — the number has moved the right way since the fixes were done.';
        case 'slipped': return ms?.moved === 'same' ? 'Slipped back — the number is no better than before the fixes.' : 'Slipped back — the number has gone back since the fixes were done.';
        case 'closed': return holdless ?? 'Closed.';
      }
    };
    const movedWord = ms?.moved === 'better' ? 'better since the fixes were done' : ms?.moved === 'worse' ? 'worse since the fixes were done'
      : ms?.moved === 'same' ? 'no change since the fixes were done' : 'not measured since the last fix was done';
    /* Holding and Slipped back say which way it moved in the verdict already. */
    const saidMoved = v.phase === 'holding' || v.phase === 'slipped';
    const number = doneFixes.length && ms && ms.before != null && ms.now != null
      ? `${ms.label}: ${say(ms.before, unit)} → ${say(ms.now, unit)}${saidMoved ? '' : ` — ${movedWord}`}.` : undefined;

    return {
      id: p.id, n: i + 1, title: p.title, phase: v.phase, phaseWord: PHASE_WORD[v.phase], tone: PHASE_TONE[v.phase], ...(p.status === 'closed' ? { closed: true } : {}),
      meta: [lineName(p.lineId), `opened ${day(todayISO(new Date(p.openedAt)))}`, p.status === 'closed' && p.closedAt ? `closed ${day(todayISO(new Date(p.closedAt)))}` : ''].filter(Boolean).join(' · '),
      ...(ms?.now != null ? { number: say(ms.now, unit) } : ms?.before != null ? { number: say(ms.before, unit) } : {}),
      bones: SIXM.map(b => ({ m: b.key, label: b.label, causes: causes.filter(c => c.m === b.key).map(c => repOf(c, v)) })),
      causeCount: causes.length,
      says: v.says && v.says !== p.title ? v.says : '',
      ...(measure ? { measure } : {}),
      ...(from ? { from } : {}),
      is: facts.is.filter(x => x.trim()), isNot: facts.isNot.filter(x => x.trim()),
      chains,
      whySays: chains.length ? [plural(chains.length, 'chain'), nRoot ? `${nRoot} root found` : 'no root found yet', nOpen ? `${nOpen} still being found` : '', nOut ? `${nOut} ruled out` : ''].filter(Boolean).join(' · ') : '',
      suggested: nSugg ? `The data suggests ${plural(nSugg, causes.length ? 'more cause' : 'cause')} not yet looked at — on ${listWords(sugg.map(b => sixmLabel(b.m)))}.` : '',
      /* With chains, Why's count says there is no root yet and each chain says
         how sure it is; with none, this line says the fish is empty. */
      ...(causes.length ? {} : { rootless: !written && v.phase === 'finding' ? 'Nothing on the fishbone yet. Opened, and the causes are next.' : 'Nothing on the fishbone yet.' }),
      ...(written ? { written } : {}),
      counter,
      counterSays: counter.length ? [`${open} open`, late ? `${late} late` : '', `${counter.length - open} done`].filter(Boolean).join(' · ') : '',
      worked: {
        says: verdict(), tone: v.phase === 'slipped' ? 'failed' : PHASE_TONE[v.phase],
        ...(number ? { number } : {}),
        fixes: doneFixes.map(c => ({ what: c.what, ...(c.expect ? { expect: c.expect } : {}), happened: c.happened ?? 'not written up yet' })),
      },
      ...(hold ? { hold } : {}),
      ...(holdless ? { holdless } : {}),
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
    ...((() => { const pr = provedLine(o.data.studies, t.id, 'action', studyCtx(o.data)); return pr ? { proved: pr } : {}; })()),
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

  /* ------------------------------ evidence ------------------------------ */
  const todoOf = (id: string) => o.todos.find(t => t.id === id);
  const recordTitle = (u: StudyUse) => (u.kind === 'cause' ? causeText.get(u.ref)?.text : u.kind === 'action' ? todoOf(u.ref)?.what : undefined);
  const evidence: SixMReport['evidence'] = data.studies
    .filter(s => !s.deletedAt && (!o.lineId || (!!s.workspaceId && ws.has(s.workspaceId))))
    .sort((a, b) => a.startedAt - b.startedAt)
    .map(s => {
      const used = s.uses.flatMap(u => { const t = recordTitle(u)?.trim(); return t ? [`${(ROLE_WORD[`${u.kind}:${u.role}`] ?? u.role).toLowerCase()}: ${t}`] : []; }).join('; ');
      const branches = new Map(s.uses.flatMap(u => { const t = u.step && u.role === 'evidence' ? recordTitle(u) : undefined; return t && u.step ? [[u.step, t] as [string, string]] : []; }));
      const l = studyLine(s, studyCtx(data));
      const losses = s.tool === 'losses' ? lossRows(lossFiguresOf(s, studyCtx(data)), s.facts.losses, constraintOfBars(s, studyCtx(data).observations ?? [], data.standards)) : undefined;
      const sampling = s.tool === 'sampling' && !s.agreed?.sampling?.walk ? samplingRows(s.agreed?.sampling, s.facts.taps ?? []) : undefined;
      return { title: studyTitle(s), used: used || 'not used for a record yet', line: l.text, tone: l.tone,
        ...(s.tool === 'map' && (s.facts.flow ?? []).length ? { stream: streamRows(s.facts.flow, s.agreed?.map, branches) } : {}),
        ...(s.tool === 'changeover' && (s.facts.sequence ?? []).length
          ? { changeover: changeoverSheet(s.facts, agreedFor(data.standards.find(st => !st.deletedAt && st.id === s.standardId)?.capacity?.changeovers, s.facts.fromProduct), branches,
            moneyOf(data.workspaces.find(w => w.id === s.workspaceId))) } : {}),
        ...(losses ? { losses } : {}), ...(sampling ? { sampling } : {}) };
    });

  /* ------------------------------ the band ------------------------------- */
  const measured = gaps.filter(g => g.series && g.says);
  const meeting = gaps.filter(g => g.series && !g.short && /on its|better than|under target/.test(g.says)).length;
  const sentence = !gaps.length ? 'No measure is set on this project yet, so there is no gap to show.'
    : gaps.length === 1 ? gaps[0].says
      : measured.length ? `${meeting} of ${plural(gaps.length, 'line')} at target${gaps.filter(g => g.short).length ? ` — ${listWords(gaps.filter(g => g.short).map(g => `${g.line} ${g.short}`))}` : ''}.`
        : `${plural(gaps.length, 'line')}, nothing measured yet.`;
  const slipSaid: Said[] = [...problemsSaid(views.map(v => v.phase)), { text: ' · ' }, ...bonesSaid(todos, today), { text: '.' }];
  const slip = saidText(slipSaid);

  return {
    name: o.project.name, ...(scopeLine ? { scope: scopeLine.name } : {}), ...(o.project.lead ? { lead: o.project.lead } : {}),
    printed: niceDay(today, { year: true }), sentence, slip, slipSaid,
    /* With no measure, this sentence is the one place each line is named —
       a three-line job must not read as if it had none. */
    gaps, ...(data.measures.length ? {} : { gapNone: `No measure is set on ${lines.length ? listWords(lines.map(l => l.name)) : 'this project'} yet — the gap is drawn once a line has a measure and a target.` }),
    manyLines: lines.length > 1,
    ...(pareto ? { pareto } : {}), constraints, problems,
    ...(views.length ? {} : { noProblems: 'No problem has been opened yet. When the gap, the Pareto or the line capacity names one, it goes at the head of a fishbone and its causes are found on the six bones.' }),
    board: board.filter(b => b.rows.length),
    boardSays: [`${allOpen} open`, allLate ? `${allLate} late` : '', `${todos.length - allOpen} done`].filter(Boolean).join(' · '),
    ...(todos.length && quietBones.length ? { boardQuiet: `Nothing on the board for ${listWords(quietBones)}.` } : {}),
    ...(seen ? { seen } : {}),
    evidence,
    owed,
    ...(o.week ? { week: o.week } : {}),
  };
}

