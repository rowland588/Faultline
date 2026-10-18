/* A PROJECT RUNNING A METHOD, READ FOR A PERSON — the lean page its screen
 * and its paper both draw (docs/LEAN-PAGE.md), the words for every step's
 * and stage's state, and the facts its row in the control room says.
 *
 * Pure. Nothing here works anything out a second time: every figure is the
 * one reading lib/flow/runtime made, said in the house's words and colours
 * (CLAUDE.md, visual management): red a day gone or a failure, amber
 * waiting or to check, violet under way or booked ahead, green done, grey
 * not started — each with its word beside it. */
import { addDays, niceDay } from '../weeks';
import type { LeanAction, LeanInsight, LeanPage, LeanTile, LeanTone } from '../lean';
import type { GateTone } from '../install';
import { KIND_WORD, type FlowDefinition } from './definition';
import { measureNumber, type FlowProblem, type FlowState, type MeasureState, type Outstanding, type StageState, type StepInstance, type StepTone } from './runtime';
import type { FlowRecord } from './records';

/** The house's five, as a square or a word wears them. */
export type Square = 'r' | 'a' | 'w' | 'g' | 'n';

export const STEP_WORD: Record<StepTone, string> = {
  done: 'Done', failed: 'Did not pass', problem: 'Hit a problem', late: 'Late',
  asking: 'Not finished', going: 'Under way', ahead: 'To do',
};

/** A step's square: a day booked ahead is violet, no day grey (4 October). */
export function stepSquare(s: Pick<StepInstance, 'tone' | 'due'>): Square {
  switch (s.tone) {
    case 'done': return 'g';
    case 'failed': case 'late': return 'r';
    case 'problem': case 'asking': return 'a';
    case 'going': return 'w';
    default: return s.due ? 'w' : 'n';
  }
}

/** A step in a word — "Done 16 Oct", "Due 22 Oct", "Late — was due 14 Oct". */
export function stepWord(s: StepInstance): string {
  const done = s.record?.doneOn;
  switch (s.tone) {
    case 'done': return done ? `Done ${niceDay(done)}` : 'Done';
    case 'failed': return done ? `Did not pass ${niceDay(done)}` : 'Did not pass';
    case 'problem': return done ? `Hit a problem ${niceDay(done)}` : 'Hit a problem';
    case 'late': return s.record?.outcome === 'notRun' ? 'Did not happen' : s.due ? `Late — was due ${niceDay(s.due)}` : 'Late';
    case 'asking': return 'Not finished';
    case 'going': return 'Under way';
    default: return s.due ? `Due ${niceDay(s.due)}` : 'To do';
  }
}

/** What a step still needs or why it stands where it does, in one line —
 *  under its title on the screen and on paper. Empty when there is nothing
 *  to say beyond its word. */
export function stepWhy(s: StepInstance): string {
  if (s.complete) return [s.record?.signedBy ? `signed by ${s.record.signedBy}` : '', s.record?.note?.trim() ?? ''].filter(Boolean).join(' — ');
  if (s.outOfLimits.length) return `Outside its limit: ${s.outOfLimits.join('; ')}`;
  if (s.failed) return s.record?.note?.trim() || 'Did not pass — to try again';
  if (s.blockedBy.length) return `Waits on ${s.blockedBy.map(b => `“${b}”`).join(' and ')}`;
  if (s.record?.outcome === 'done' && s.missing.length) return `Still needs ${s.missing.join(', ')}`;
  if (s.missing.length && s.record) return `Needs ${s.missing.join(', ')}`;
  return '';
}

/** A stage's square and word: passed is quiet green; ready to pass and a
 *  gate waiting on its conditions are amber; the steps' own tone otherwise. */
export function stageSquare(st: StageState): Square {
  if (st.gate.passed) return 'g';
  /* its steps done and its gate still to pass: waiting on somebody */
  if (st.stepsTone === 'done') return 'a';
  return gateSquare(st.tone);
}
export function gateSquare(t: GateTone): Square {
  return t === 'done' ? 'g' : t === 'failed' || t === 'late' ? 'r' : t === 'problem' ? 'a' : t === 'going' ? 'w' : 'n';
}
export function stageWord(st: StageState): string {
  if (st.gate.passed) return st.gate.pass?.doneOn ? `Gate passed ${niceDay(st.gate.pass.doneOn)}` : 'Gate passed';
  if (st.stepsTone === 'done') return st.gate.canPass ? 'Ready to pass its gate' : st.gate.waitsOn ? `Waits on ${st.gate.waitsOn}` : 'Its gate needs more';
  switch (st.tone) {
    case 'failed': return `${st.failed} did not pass`;
    case 'late': return `${st.late} late`;
    case 'problem': return 'A problem to settle';
    case 'going': return `${st.done} of ${st.total} done`;
    case 'none': return 'No steps';
    default: return 'Not started';
  }
}

/** One outstanding thing as a row of the action plan. `open.ref` is the
 *  step it opens: "stage/step/machine". */
export function actionOfOutstanding(o: Outstanding): LeanAction {
  const tone: LeanTone = o.failed || o.late ? 'r' : o.blocked || o.kind === 'condition' ? 'a' : 'n';
  const state = o.failed ? 'Did not pass' : o.late ? 'Late' : o.blocked ? 'Waiting' : o.kind === 'gate' ? 'Ready' : o.kind === 'condition' ? 'To meet' : 'Open';
  return {
    what: o.what,
    ...(o.who ? { who: o.who } : {}),
    ...(o.due ? { due: niceDay(o.due) } : {}),
    state, tone,
    from: o.stageName,
    ...(o.kind === 'step' && o.stepKey ? { open: { kind: 'action' as const, ref: `${o.stageKey}/${o.stepKey}/${o.assetId ?? ''}` } } : {}),
  };
}

export interface FlowView {
  project: { name: string };
  def: FlowDefinition;
  version: number;
  startedOn?: string;
  state: FlowState;
  problems: readonly FlowProblem[];
  records: readonly FlowRecord[];
  machines: readonly { id: string; name: string }[];
}

const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

/** Steps done in the seven days to today — the tile's "since". */
export function doneThisWeek(records: readonly FlowRecord[], today: string): number {
  const from = addDays(today, -7);
  return records.filter(r => !r.deletedAt && r.kind === 'step' && r.outcome === 'done' && !!r.doneOn && r.doneOn > from && r.doneOn <= today).length;
}

/** THE LEAN PAGE of a project running a method — its screen and its paper. */
export function flowLean(v: FlowView, today: string): LeanPage {
  const { state: s, def } = v;
  const c = s.counts;
  const cur = s.current;
  const openProblems = v.problems.filter(p => p.open);
  const critical = openProblems.filter(p => p.priority === 'critical').length;
  const week = doneThisWeek(v.records, today);
  const pct = c.steps ? Math.round((c.done / c.steps) * 100) : 0;

  /* WHAT IT MEASURES first — the number the work has to move, now against its
     target, and how far it has come since the first reading */
  const tiles: LeanTile[] = [
    ...s.measures.slice(0, 3).map(measureTile),
    {
      k: 'Steps done', v: String(c.done), of: c.steps ? `of ${c.steps} · ${pct}%` : 'no steps yet',
      ...(week ? { change: { dir: 'up' as const, text: `${week} done this week`, better: true } } : {}),
      ...(c.steps && c.done === c.steps ? { tone: 'g' as const } : {}),
    },
    { k: 'Gates passed', v: String(c.gatesPassed), of: `of ${c.gates}`, ...(c.gates && c.gatesPassed === c.gates ? { tone: 'g' as const } : {}) },
    { k: 'Late', v: String(c.late), of: c.late ? 'past their day' : 'nothing past its day', tone: c.late ? 'r' : 'n' },
    { k: 'Did not pass', v: String(c.failed), of: c.failed ? 'to settle or try again' : 'none', tone: c.failed ? 'r' : 'n' },
    {
      k: 'Problems open', v: String(openProblems.length),
      of: critical ? `${critical} critical` : openProblems.length ? 'none critical' : 'none on this project',
      tone: critical ? 'r' : openProblems.length ? 'a' : 'n',
    },
  ];

  const insights: LeanInsight[] = [{ text: s.verdict.text, tone: s.verdict.tone }];
  for (const m of s.measures) if (m.now) insights.push({ text: m.says, tone: m.met === true ? 'g' : 'n' });
  const failed = s.outstanding.filter(o => o.failed);
  for (const o of failed.slice(0, 3)) insights.push({ text: `${o.what} — ${o.why}.`, tone: 'r' });
  if (failed.length > 3) insights.push({ text: `And ${many(failed.length - 3, 'more step')} that did not pass.`, tone: 'r' });
  const late = s.outstanding.filter(o => o.late && !o.failed);
  if (late.length) insights.push({ text: `${many(late.length, 'step')} late: ${late.slice(0, 3).map(o => o.what).join('; ')}${late.length > 3 ? ` and ${late.length - 3} more` : ''}.`, tone: 'r' });
  if (cur) {
    for (const b of cur.gate.conditions.filter(x => x.blocking && x.type !== 'stepsDone')) {
      insights.push({ text: `${cur.name}'s gate needs ${b.label} — ${b.why}.`, tone: 'a' });
    }
    for (const w of cur.gate.warnings) insights.push({ text: `${w.label} — ${w.why}. A warning: the gate can pass, and the pass will say it was open.`, tone: 'a' });
    const manual = cur.gate.conditions.filter(x => x.manual);
    if (manual.length && !cur.gate.passed) insights.push({ text: `At the gate, ${manual.length === 1 ? 'one check is' : `${manual.length} checks are`} confirmed by hand: ${manual.map(m => m.label).join('; ')}.`, tone: 'n' });
  }
  for (const st of s.stages.filter(x => x.ahead)) insights.push({ text: `Work is recorded on ${st.name} ahead of ${st.gate.waitsOn ?? 'the gate before it'}.`, tone: 'n' });
  if (critical) insights.push({ text: `${many(critical, 'critical problem')} open on the project.`, tone: 'r' });
  if (s.done) insights.splice(0, insights.length, { text: s.verdict.text, tone: 'g' });

  const actions = s.outstanding.slice(0, 14).map(actionOfOutstanding);

  const next = s.next;
  const closing: LeanPage['closing'] = s.done
    ? { text: `Every gate passed — ${def.name} is done on ${v.project.name}.`, tone: 'g' }
    : next
      ? { text: `Next: ${next.what}${next.who ? ` — ${next.who}` : ''}${next.due ? `${next.late ? ', was due' : ', by'} ${niceDay(next.due)}` : ''}.`, tone: next.late || next.failed ? 'r' : 'n' }
      : { text: 'Nothing can move until the step it waits on is done.', tone: 'a' };

  const verdict = s.done ? { text: 'Every gate passed', tone: 'g' as const }
    : cur ? { text: `At ${cur.name}`, tone: s.verdict.tone } : undefined;

  return {
    eyebrow: def.kind === 'other' ? 'METHOD' : `METHOD · ${KIND_WORD[def.kind].toUpperCase()}`,
    title: v.project.name,
    sub: `${def.name} · version ${v.version}`,
    ...(verdict ? { verdict } : {}),
    facts: [
      ...(v.startedOn ? [['Started', niceDay(v.startedOn, { year: true })] as [string, string]] : []),
      ['Stage', cur ? `${cur.index + 1} of ${s.stages.length} · ${cur.name}` : s.done ? 'all passed' : '—'],
      ['Machines', v.machines.length ? String(v.machines.length) : 'none'],
    ],
    tiles, insights, actions,
    actionsEmpty: s.done ? 'Nothing outstanding — every gate is passed.' : 'Nothing outstanding on the stages open.',
    closing,
  };
}

/** A measure as a tile: where it stands now, its target, and the change since its first reading. */
export function measureTile(m: MeasureState): LeanTile {
  const n = (v: number) => measureNumber(m.def, v);
  const goal = m.def.target !== undefined ? `target ${m.def.better === 'lower' ? 'at most' : 'at least'} ${n(m.def.target)}` : '';
  return {
    k: m.def.name,
    v: m.now ? n(m.now.value) : '—',
    of: m.now ? [goal || 'no target set', m.met === true ? 'met' : m.met === false ? 'not met yet' : ''].filter(Boolean).join(' · ') : `not measured yet${goal ? ` · ${goal}` : ''}`,
    ...(m.change !== undefined && m.before ? {
      change: m.change === 0 ? { dir: 'same' as const, text: `no change since ${n(m.before.value)}` }
        : { dir: m.change < 0 ? 'down' as const : 'up' as const, text: `${n(Math.abs(m.change))} since the first, ${n(m.before.value)}`, ...(m.improved !== undefined ? { better: m.improved } : {}) },
    } : {}),
    tone: m.met === true ? 'g' : 'n',
  };
}

/** THE PROJECT'S ROW IN THE CONTROL ROOM — where it is, how far, what next. */
export interface FlowRowFacts {
  at: string;
  sentence: string;
  outstanding: number;
  late: number;
  done: number;
  total: number;
  stages: { key: string; label: string; tone: GateTone }[];
}

export function flowRowFacts(s: FlowState): FlowRowFacts {
  return {
    at: s.done ? 'Every gate passed' : s.current?.name ?? '—',
    sentence: s.verdict.text,
    outstanding: s.outstanding.filter(o => o.kind === 'step').length,
    late: s.counts.late,
    done: s.counts.gatesPassed,
    total: s.counts.gates,
    stages: s.stages.map(st => ({ key: st.key, label: st.name, tone: st.gate.passed ? 'done' : st.tone })),
  };
}
