/* WHAT A STUDY IS EVIDENCE FOR, inside its job — and the before → after it
 * buys (docs/TOOLKIT.md, Part 0: "The doors — both ends write the same link"
 * and "Before and after, worked out"; docs/BUILD.md, 2e–2f).
 *
 * Pure. A study names what it serves in `uses` — a test it proves, a fix it is
 * the evidence for or the proof of — and both ends read the same list: the
 * study's "Used for" and the record's "How we know · Proved by" can never
 * disagree, because there is only one link.
 *
 * Before → after is offered only when it is fair: the same tool, the same
 * scope (what it is of, and the same limits), the latest on each side, and
 * enough readings on both. It says "the number moved", never "the fix did
 * it" — that is the fix's to say, and a person presses the button. */
import type { ID, Observation } from '../types';
import type { BalanceStep, ChangeoverStep, FlowStep, StudyUse, ToolStudy } from './study';
import type { PaceTodoRow } from '../db/rows';
import type { SixM } from './sixm';
import { sample, sampleSays, compareSamples, CPK_FROM, CPK_JUST, type SampleSays, type Tone } from './ie/sample';
import { balance, balanceLine, compareBalances, secs as secsOf } from './ie/balance';
import { carryFlow, compareFlows, compareStep, dur as durOf, flowFigures, flowSays, share as shareOf, stepAt, stepFigure, whoOf } from './ie/steps';
import { carrySequence, changeoverFigures, changeoverSays, compareChangeovers, intervalOf, intervalSays, mins, stepFigure as changeoverStepFigure } from './ie/changeover';
import { samplingSays, samplingWorst, worstWords } from './ie/sampling';
import { barExpect, barWords, compareLosses, findBar, inWindow, lossFigures, lossLine, lossSays, nextShift, type CostModel, type LossFigures } from './ie/losses';

const live = (ss: ToolStudy[]) => ss.filter(s => !s.deletedAt);

/** WHAT A STUDY READS BESIDE ITS OWN FACTS. A loss count's figures are the
 *  line's stops in its window and the line's cost model (lib/ie/losses) —
 *  never copied onto the study — so whoever has them hands them in here: the
 *  fishbone's data, a report's, a screen's. Without them a loss count still
 *  says what the count alone knows (the loss), and not where it went. */
export interface StudyContext {
  observations?: Observation[];
  /** The lines — their cost model (lib/cost) is read for the pounds. */
  workspaces?: ({ id: string } & CostModel)[];
}

/** A loss count's figures from its facts and what the context holds of its line. */
export function lossFiguresOf(s: ToolStudy, ctx?: StudyContext): LossFigures {
  const c = s.facts.losses;
  const obs = ctx?.observations && c ? inWindow(ctx.observations, c.from, c.to, s.workspaceId) : undefined;
  return lossFigures(c, obs, ctx?.workspaces?.find(w => w.id === s.workspaceId), s.facts.running);
}

/** The bar of a loss count a record was raised from (StudyUse.step), as it stands. */
export function barOf(s: ToolStudy, kind: StudyUse['kind'], ref: ID, ctx?: StudyContext) {
  const key = s.uses.find(u => u.kind === kind && u.ref === ref && u.role === 'evidence' && u.step)?.step;
  return key ? findBar(lossFiguresOf(s, ctx).bars, key) : undefined;
}

/** The studies linked to one record, newest first. */
export function linkedTo(studies: ToolStudy[], kind: StudyUse['kind'], ref: ID, role?: StudyUse['role']): ToolStudy[] {
  return live(studies).filter(s => s.uses.some(u => u.kind === kind && u.ref === ref && (!role || u.role === role)))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** What a study says, in the tool's words: a work balance by its stacks
 *  against takt, a measured test by its readings. */
export function studySays(s: ToolStudy, ctx?: StudyContext): SampleSays {
  if (s.tool === 'balance') return balanceLine(balance(s.facts.steps, s.agreed?.balance));
  if (s.tool === 'map') {
    const f = flowFigures(s.facts.flow, s.agreed?.map);
    return { text: flowSays(f, s.agreed?.map).text, tone: 'n', verdict: f.steps ? `Lead time ${f.untimed ? 'at least ' : ''}${durOf(f.leadSec)}` : 'No steps yet' };
  }
  if (s.tool === 'changeover') {
    /* the minutes, then the interval when it can be read — the standard it
       stands against is the line standard's, read where that is to hand */
    const f = changeoverFigures(s.facts.sequence, s.facts.perWeek);
    const said = changeoverSays(f);
    const iv = intervalOf(f, s.facts.products, s.facts.availableMinPerDay);
    return { text: iv.ready ? `${said.text} ${intervalSays(iv, f).text}` : said.text, tone: said.tone, verdict: said.verdict };
  }
  if (s.tool === 'sampling') return samplingSays(s.agreed?.sampling, s.facts.taps ?? []);
  if (s.tool === 'losses') {
    const said = lossSays(lossFiguresOf(s, ctx), s.facts.losses, { ...(s.product ? { product: s.product } : {}) });
    return { text: said.text, tone: said.tone, verdict: said.verdict };
  }
  const a = s.agreed?.readings;
  return sampleSays(sample(a, s.facts.readings ?? []), a);
}

/** Each tool's name, as a study of it is called on screen and on paper. */
export const TOOL_NAME: Partial<Record<ToolStudy['tool'], string>> = { capability: 'Capability study', balance: 'Work balance', map: 'Value stream map', changeover: 'Changeover', sampling: 'Work sampling', losses: 'Loss count' };

/** "Capability study — Weight accuracy 400 g · Weigher 2". */
export const studyTitle = (s: Pick<ToolStudy, 'tool' | 'name' | 'machine'>): string =>
  `${TOOL_NAME[s.tool] ?? 'Study'} — ${s.name}${s.machine ? ` · ${s.machine}` : ''}`;

/** Where a study opens. A work balance lives on its product's line standard —
 *  the job's when it is attached, else the line's — at the People view, and
 *  names itself so an earlier timing opens as itself. */
export function studyHref(s: Pick<ToolStudy, 'id' | 'tool' | 'standardId' | 'projectId' | 'workspaceId'>): string {
  if (s.tool === 'balance' && s.standardId) {
    const at = `?at=balance&view=work&study=${encodeURIComponent(s.id)}`;
    if (s.projectId) return `/project/${s.projectId}/standard/${s.standardId}${at}`;
    if (s.workspaceId) return `/w/${s.workspaceId}/standards/${s.standardId}${at}`;
  }
  if (s.tool === 'map') return `/value-stream/${s.id}`;
  return `/${s.tool}/${s.id}`;
}

/** The value stream a line reads: the newest map on it (a walk again to
 *  prove a fix is newer, and is how the line runs now). */
export const currentMap = (studies: ToolStudy[], workspaceId: ID): ToolStudy | undefined =>
  live(studies).filter(s => s.tool === 'map' && s.workspaceId === workspaceId).sort((a, b) => b.startedAt - a.startedAt)[0];

/** A line's flow in one line, for its card: the lead time and the share that
 *  adds value — what is still carried from before, said. Neutral: a lead time
 *  is not judged against anything here. */
export function flowLine(s: ToolStudy): string | undefined {
  const f = flowFigures(s.facts.flow, s.agreed?.map);
  if (!f.steps) return undefined;
  return `lead time ${f.untimed ? 'at least ' : ''}${durOf(f.leadSec)} · ${shareOf(f.pce ?? 0)} adds value${f.carried ? ` · ${f.carried} of ${f.steps} steps not walked again yet` : ''}`;
}

/** The changeover a line, or a product's line standard, reads: the newest
 *  one on it (the changeover timed again to prove a fix is newer, and is how
 *  the line changes over now). */
export const currentChangeover = (studies: ToolStudy[], on: { workspaceId?: ID; standardId?: ID }): ToolStudy | undefined =>
  live(studies).filter(s => s.tool === 'changeover' && (on.standardId ? s.standardId === on.standardId : !!on.workspaceId && s.workspaceId === on.workspaceId))
    .sort((a, b) => b.startedAt - a.startedAt)[0];

/** A line's changeover in one line, for its card and the standard: the
 *  minutes now, the external work inside, the interval when it can be read.
 *  Only the external work carries colour — it is the abnormal. */
export function changeoverLine(s: ToolStudy): { text: string; tone: Tone } | undefined {
  const f = changeoverFigures(s.facts.sequence, s.facts.perWeek);
  if (!f.enough) return undefined;
  const iv = intervalOf(f, s.facts.products, s.facts.availableMinPerDay);
  const who = [s.facts.fromProduct, s.facts.toProduct ?? s.product].filter(Boolean).join(' → ');
  const now = `${f.untimed ? 'at least ' : ''}${mins(f.nowSec)}${f.externalSec > 0 ? `, ${mins(f.externalSec)} external inside` : ''}${f.carried ? ` · ${f.carried} of ${f.steps} steps not timed again yet` : ''}`;
  const every = iv.ready && iv.daysNow !== undefined ? ` · every product every ${iv.daysNow.toFixed(1)} days` : '';
  return { text: `${who ? `${who}: ` : ''}${now}${every}`, tone: f.externalSec > 0 ? 'a' : 'n' };
}

/** The work balance a line standard reads: the newest timing of it. */
export const currentBalance = (studies: ToolStudy[], standardId: ID): ToolStudy | undefined =>
  live(studies).filter(s => s.tool === 'balance' && s.standardId === standardId).sort((a, b) => b.startedAt - a.startedAt)[0];

/** The loss count a line's board reads: its latest shift counted — the
 *  newest window with the packs made in it (a count set up and not yet
 *  counted is not a shift's losses). */
export const currentLosses = (studies: ToolStudy[], workspaceId: ID): ToolStudy | undefined =>
  live(studies).filter(s => s.tool === 'losses' && s.workspaceId === workspaceId && s.facts.losses && s.facts.losses.made !== undefined)
    .sort((a, b) => (b.facts.losses?.from ?? 0) - (a.facts.losses?.from ?? 0))[0];

/** A line's latest shift in one line, for its card, the Pareto's pane and
 *  the control room: "Shift 1 yesterday: 85 min lost · 9 min slow running
 *  and short stops". Only the abnormal part (the rest over a tenth of the
 *  loss, or the counts wanting checking) wears amber. */
export function lossCardLine(s: ToolStudy, ctx?: StudyContext, now = Date.now()): { text: string; abnormal: boolean } | undefined {
  const c = s.facts.losses;
  return c ? lossLine(lossFiguresOf(s, ctx), c, now) : undefined;
}

/** The sentence a study adds to a record or to paper, with its verdict tone:
 *  its name, then what it says, with an overrule beside the app's verdict. */
export function studyLine(s: ToolStudy, ctx?: StudyContext): { text: string; tone: Tone } {
  const said = studySays(s, ctx);
  const over = s.overrule ? ` Overruled: ${s.overrule.verdict}${s.overrule.by ? ` by ${s.overrule.by}` : ''} — ${s.overrule.why}.` : '';
  return { text: `${said.text}${said.capability ? ` ${said.capability.text}` : ''}${over}`, tone: s.overrule ? 'n' : said.tone };
}

/** How many readings a study still owes, or 0. */
export function owedOf(s: ToolStudy): number {
  const count = s.agreed?.readings?.count ?? 0;
  const n = (s.facts.readings ?? []).filter(r => !r.struck).length;
  return Math.max(0, count - n);
}

/** Same tool, same thing measured, judged against the same limits — for a
 *  work balance, the same line standard at the same takt. */
export const sameScope = (a: ToolStudy, b: ToolStudy): boolean =>
  a.tool === b.tool && (a.tool === 'balance'
    ? !!a.standardId && a.standardId === b.standardId && a.agreed?.balance?.taktSec === b.agreed?.balance?.taktSec
    : a.tool === 'map' || a.tool === 'changeover'
      /* a value stream, a changeover: the same line, the same stream or the same two products */
      ? (a.workspaceId ?? '') === (b.workspaceId ?? '') && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
      : a.tool === 'losses'
        /* a loss count: the same line, the same shift pattern */
        ? (a.workspaceId ?? '') === (b.workspaceId ?? '') && (a.facts.losses?.shift ?? '').trim().toLowerCase() === (b.facts.losses?.shift ?? '').trim().toLowerCase()
        : a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
          && JSON.stringify(a.agreed?.readings ?? null) === JSON.stringify(b.agreed?.readings ?? null));

/** The step of a value stream map a record was raised from, when it was. */
export function stepOf(s: ToolStudy, kind: StudyUse['kind'], ref: ID): FlowStep | undefined {
  const id = s.uses.find(u => u.kind === kind && u.ref === ref && u.role === 'evidence' && u.step)?.step;
  return id ? (s.facts.flow ?? []).find(x => x.id === id) : undefined;
}

/** The step of a changeover a record was raised from, when it was. */
export function changeoverStepOf(s: ToolStudy, kind: StudyUse['kind'], ref: ID): ChangeoverStep | undefined {
  const id = s.uses.find(u => u.kind === kind && u.ref === ref && u.role === 'evidence' && u.step)?.step;
  return id ? (s.facts.sequence ?? []).find(x => x.id === id) : undefined;
}

/** What a study can be the evidence or proof of that something changed: a
 *  stage-gate job's fix, or a running line's countermeasure on the board. */
export type FixKind = 'fix' | 'action';

/** Before → after on a fix (or a board action): its evidence study against
 *  its proof study. */
export function beforeAfter(studies: ToolStudy[], fixId: ID, kind: FixKind = 'fix', ctx?: StudyContext): { text: string; tone: Tone; before: ToolStudy; after: ToolStudy } | undefined {
  const after = linkedTo(studies, kind, fixId, 'proof')[0];
  if (!after) return undefined;
  const before = linkedTo(studies, kind, fixId, 'evidence').find(b => sameScope(b, after));
  if (before && after.tool === 'losses') {
    /* the next shift counted: the bar the fix was raised from first, then
       the lost minutes and the slow running and short stops */
    const bar = before.uses.find(u => u.kind === kind && u.ref === fixId && u.role === 'evidence' && u.step)?.step;
    return { ...compareLosses(lossFiguresOf(before, ctx), lossFiguresOf(after, ctx), bar), before, after };
  }
  if (before && after.tool === 'balance') {
    const ab = after.agreed?.balance;
    return ab ? { ...compareBalances(balance(before.facts.steps, before.agreed?.balance), balance(after.facts.steps, ab)), before, after } : undefined;
  }
  if (before && after.tool === 'map') {
    /* the stream walked again: the step the fix was raised from first, then
       the whole lead time; what is still carried from before, said */
    const ma = before.agreed?.map, mb = after.agreed?.map;
    const fb = flowFigures(before.facts.flow, ma), fa = flowFigures(after.facts.flow, mb);
    const st = stepOf(before, kind, fixId);
    const stA = st ? (after.facts.flow ?? []).find(x => x.id === st.id) : undefined;
    const one = st ? `${compareStep(st, stA, ma, mb)}. ` : '';
    const still = fa.carried ? ` ${fa.carried} of ${fa.steps} steps carried from before, not walked again yet.` : '';
    const waiting = !!st && stA?.source === 'carried';
    return { text: `${one}${compareFlows(fb, fa)}${still}`, tone: waiting ? 'n' : fa.leadSec < fb.leadSec ? 'g' : fa.leadSec > fb.leadSec ? 'r' : 'n', before, after };
  }
  if (before && after.tool === 'changeover') {
    /* the changeover timed again: the step the fix was raised from first,
       then the minutes; nothing claimed while a step is still carried */
    const fb = changeoverFigures(before.facts.sequence, before.facts.perWeek), fa = changeoverFigures(after.facts.sequence, after.facts.perWeek ?? before.facts.perWeek);
    const st = changeoverStepOf(before, kind, fixId);
    const stA = st ? (after.facts.sequence ?? []).find(x => x.id === st.id) : undefined;
    const one = st ? `${compareChangeoverStep(st, stA)}. ` : '';
    const c = compareChangeovers(fb, fa);
    return { text: `${one}${c.text}`, tone: st && stA?.source === 'carried' ? 'n' : c.tone, before, after };
  }
  const a = after.agreed?.readings;
  if (!before || !a) return undefined;
  const c = compareSamples(sample(a, before.facts.readings ?? []), sample(a, after.facts.readings ?? []), a);
  return { ...c, before, after };
}

/** ONE STEP of a changeover before → after, matched by id: its side and its
 *  minutes as timed again; "not timed again yet" while carried; "taken out"
 *  when gone; "done while the line runs" when moved external. */
export function compareChangeoverStep(before: ChangeoverStep, after: ChangeoverStep | undefined): string {
  const name = before.name.trim() || 'The step';
  if (!after) return `${name}: taken out of the changeover`;
  if (after.source === 'carried') return `${name}: not timed again yet`;
  const parts: string[] = [];
  if (before.side !== after.side) parts.push(after.side === 'external' ? 'external now — done while the line runs' : 'internal now — the line stopped for it');
  const b = before.sec ?? 0, a = after.sec ?? 0;
  if (a !== b) parts.push(`${mins(b)} → ${mins(a)}`);
  return `${name}: ${parts.join(', ') || 'no change'}`;
}

/** The one line a fix (or a board action) carries on paper and in its
 *  drawer: before → after when it has both, else what proved it, else how we
 *  know it was needed. */
export function provedLine(studies: ToolStudy[], fixId: ID, kind: FixKind = 'fix', ctx?: StudyContext): string | undefined {
  const ba = beforeAfter(studies, fixId, kind, ctx);
  if (ba) return `Before → after: ${ba.text}`;
  const proof = linkedTo(studies, kind, fixId, 'proof')[0], ev = linkedTo(studies, kind, fixId, 'evidence')[0];
  if (proof) return `Proved by: ${studyLine(proof, ctx).text}`;
  if (ev) return `How we know: ${studyLine(ev, ctx).text}`;
  return undefined;
}

/** A test's or a fix's line, by what it is: a fix's before → after (or what
 *  proved it, or how we know it was needed); a test's proof. */
export function recordProvedLine(studies: ToolStudy[], t: { id: ID; kind?: string }, ctx?: StudyContext): string | undefined {
  if ((t.kind ?? 'test') === 'fix') return provedLine(studies, t.id, 'fix', ctx);
  const proof = linkedTo(studies, 'test', t.id, 'proof')[0];
  return proof ? `Proved by: ${studyTitle(proof)} — ${studyLine(proof, ctx).text}` : undefined;
}

/** WHAT WAS MEASURED ON A DAY (lib/day): the readings or laps a study took
 *  on that date, who took them, and what it says now — one line for Today's
 *  update. Nothing when nothing was taken that day. */
export function measuredOn(s: ToolStudy, date: string, dayOfMs: (ms: number) => string): { text: string; tone: Tone } | undefined {
  const taken: { at: number; who?: string }[] = s.tool === 'balance'
    ? (s.facts.steps ?? []).flatMap(st => (st.laps ?? []).filter(l => !l.foreign && !l.struck))
    : s.tool === 'changeover'
      ? (s.facts.sequence ?? []).filter(st => st.source === 'timed' && st.at !== undefined).map(st => ({ at: st.at as number, ...(st.who ? { who: st.who } : {}) }))
      : (s.facts.readings ?? []).filter(r => !r.struck);
  const today = taken.filter(x => dayOfMs(x.at) === date);
  if (!today.length) return undefined;
  const who = [...new Set(today.map(x => x.who?.trim()).filter((w): w is string => !!w))];
  const noun = s.tool === 'balance' ? (today.length === 1 ? 'lap timed' : 'laps timed') : s.tool === 'changeover' ? (today.length === 1 ? 'step timed' : 'steps timed') : (today.length === 1 ? 'reading taken' : 'readings taken');
  const line = studyLine(s);
  return { text: `${studyTitle(s)}: ${today.length} ${noun}${who.length ? ` by ${who.join(', ')}` : ''} — ${line.text}`, tone: line.tone };
}

/** The days a study measured on — Today's update steps to them. */
export function measuredDays(s: ToolStudy, dayOfMs: (ms: number) => string): string[] {
  const at = s.tool === 'balance' ? (s.facts.steps ?? []).flatMap(st => (st.laps ?? []).map(l => l.at))
    : s.tool === 'changeover' ? (s.facts.sequence ?? []).flatMap(st => (st.source === 'timed' && st.at !== undefined ? [st.at] : []))
      : (s.facts.readings ?? []).map(r => r.at);
  return [...new Set(at.filter(Number.isFinite).map(dayOfMs))];
}

/** A TEST'S SQUARE on the Commission board: the study proving it, in two
 *  or three words — "Cpk 1.00" once there are enough readings for it, else
 *  "12 of 30 readings". Only the abnormal carries colour: not capable is
 *  amber (it may pass today and fail next week); a failure is red. */
export function squareWord(studies: ToolStudy[], testId: ID): { text: string; tone: Tone } | undefined {
  const s = linkedTo(studies, 'test', testId, 'proof')[0];
  if (!s) return undefined;
  const said = studySays(s);
  const a = s.agreed?.readings;
  if (!a || a.kind === 'ticks') return { text: said.verdict, tone: said.tone === 'r' ? 'r' : 'n' };
  const f = sample(a, s.facts.readings ?? []);
  if (said.tone === 'r') return { text: said.verdict, tone: 'r' };
  if (f.cpk !== undefined && f.n >= CPK_FROM) return { text: `Cpk ${f.cpk.toFixed(2)}`, tone: f.cpk < CPK_JUST ? 'a' : 'n' };
  return { text: `${f.n} of ${f.count} readings`, tone: 'n' };
}

/** Where a record a study is used for opens, in its job. */
export function recordHref(projectId: ID, u: Pick<StudyUse, 'kind' | 'ref'>): string {
  const at = encodeURIComponent;
  switch (u.kind) {
    case 'fix': return `/project/${projectId}/fixes?open=${at(u.ref)}`;
    case 'action': return `/project/${projectId}/board?a=${at(u.ref)}`;
    case 'cause': {
      const [problem, cause] = u.ref.split(':');
      return `/project/${projectId}/fishbone?problem=${at(problem)}${cause ? `&cause=${at(cause)}` : ''}`;
    }
    case 'case': case 'problem': return `/project/${projectId}/fishbone?problem=${at(u.ref)}`;
    default: return `/project/${projectId}/testing?open=${at(u.ref)}`;
  }
}

/** The words for a link, by what it is to the record. */
export const ROLE_WORD: Record<string, string> = {
  'test:proof': 'Proves', 'fix:evidence': 'How we know it was needed', 'fix:proof': 'Proves it worked',
  'action:evidence': 'How we know it was needed', 'action:proof': 'Proves it worked', 'cause:evidence': 'How we know',
};

/** What a countermeasure raised from a study should change — said before it
 *  is done, so "Did it work" has something to be held against. */
export function betterExpect(s: ToolStudy, stepId?: string, ctx?: StudyContext): string | undefined {
  if (s.tool === 'losses') {
    const b = stepId ? findBar(lossFiguresOf(s, ctx).bars, stepId) : undefined;
    return b ? barExpect(b) : undefined;
  }
  if (s.tool === 'changeover') {
    const st = stepId ? (s.facts.sequence ?? []).find(x => x.id === stepId) : undefined;
    if (!st) return undefined;
    const name = st.name.trim() || 'The step';
    return st.side === 'external'
      ? `${name}: done while the line runs — the changeover timed again without it inside`
      : `${name}: ${changeoverStepFigure(st)} — shorter, or made external, the changeover timed again`;
  }
  if (s.tool === 'map') {
    const st = stepId ? (s.facts.flow ?? []).find(x => x.id === stepId) : undefined;
    return st ? `${st.name.trim() || 'The step'}: ${stepFigure(st, s.agreed?.map)} — shorter or gone, walked again on the same map` : undefined;
  }
  if (s.tool === 'balance') {
    const f = balance(s.facts.steps, s.agreed?.balance), c = f.constraint;
    return c && f.taktSec ? `${c.who} within the ${secsOf(f.taktSec)} takt, timed again` : undefined;
  }
  return s.agreed?.readings && s.agreed.readings.kind !== 'ticks' ? 'Every reading within the limits, Cpk 1.33 or more, on the same readings again' : undefined;
}

/** MAKE IT BETTER ON A RUNNING LINE: a countermeasure on the board, its words
 *  the study's figures, on the cause the study is evidence for when it is
 *  one — never a stage-gate fix a 6M job has no page for. */
export function countermeasureFrom(s: ToolStudy, x: { id: string; at: number; lineId?: string; causeRef?: string; bone?: SixM; step?: string }, ctx?: StudyContext): PaceTodoRow {
  const expect = betterExpect(s, x.step, ctx);
  const st = x.step && s.tool === 'map' ? (s.facts.flow ?? []).find(f => f.id === x.step) : undefined;
  const co = s.tool === 'changeover' && x.step ? (s.facts.sequence ?? []).find(f => f.id === x.step) : undefined;
  /* a loss count's bar: on the bone its stops sit on, where its minutes are */
  const bar = x.step && s.tool === 'losses' ? findBar(lossFiguresOf(s, ctx).bars, x.step) : undefined;
  return {
    id: x.id, ...(s.projectId ? { projectId: s.projectId } : {}), ...(x.lineId ? { lineId: x.lineId } : {}),
    what: betterWords(s, x.step, ctx), where: st ? stepAt(st, s.agreed?.map) : co ? (s.machine ?? '') : bar?.asset ?? '', why: studyTitle(s), who: '', when: '', state: 'todo',
    pillar: x.bone ?? (st ? boneOfStep(st, s) : co ? boneOfChangeoverStep(co) : bar ? bar.bone : s.tool === 'balance' || s.tool === 'map' || s.tool === 'sampling' ? 'method' : 'machine'),
    ...(x.causeRef ? { causeRef: x.causeRef } : {}), ...(expect ? { expect } : {}),
    createdAt: x.at, updatedAt: x.at,
  };
}

/** A new link from a study to a record. */
export const linkOf = (kind: StudyUse['kind'], ref: ID, role: StudyUse['role'], at: number, by: string | undefined, id: string, step?: string): StudyUse =>
  ({ id, kind, ref, role, at, ...(by ? { by } : {}), ...(step ? { step } : {}) });

/** Which of the six bones a step of the stream sits on, by whose work it is:
 *  maintenance or the machine — Machine; stores or the forklift — Material;
 *  quality — Measurement; anyone else — Method (how the work flows). A
 *  person can move it. */
export function boneOfStep(st: FlowStep, s: Pick<ToolStudy, 'agreed'>): SixM {
  const who = whoOf(st, s.agreed?.map).join(' ').toLowerCase();
  if (/maint|fitter|engineer|machine/.test(who)) return 'machine';
  if (/stores|forklift|warehouse|picker/.test(who)) return 'material';
  if (/quality|qa\b|lab/.test(who)) return 'measurement';
  return 'method';
}

/** Which bone a changeover's step sits on: external work still done with the
 *  line stopped is the way the changeover is organised — Method; an internal
 *  step is the machine's own set-up — Machine. A person can move it. */
export const boneOfChangeoverStep = (st: Pick<ChangeoverStep, 'side'>): SixM => (st.side === 'external' ? 'method' : 'machine');

/** "Prove it": the same tool on the same scope as the evidence — what it is
 *  of, the machine, the product, the limits and the count — so before and
 *  after measure the same thing the same way. Its readings start empty. */
export function proveItFrom(evidence: ToolStudy, fixId: ID, x: { at: number; by?: string; id: string; useId: string }, kind: FixKind = 'fix'): ToolStudy {
  return {
    id: x.id, tool: evidence.tool, name: evidence.name,
    ...(evidence.workspaceId ? { workspaceId: evidence.workspaceId } : {}),
    ...(evidence.projectId ? { projectId: evidence.projectId } : {}),
    ...(evidence.machine ? { machine: evidence.machine } : {}),
    ...(evidence.assetId ? { assetId: evidence.assetId } : {}),
    ...(evidence.product ? { product: evidence.product } : {}),
    ...(evidence.standardId ? { standardId: evidence.standardId } : {}),
    ...(evidence.agreed ? { agreed: JSON.parse(JSON.stringify(evidence.agreed)) as ToolStudy['agreed'] } : {}),
    facts: evidence.tool === 'balance' ? { steps: retime(evidence.facts.steps) } : evidence.tool === 'map' ? { flow: carryFlow(evidence.facts.flow) }
      : evidence.tool === 'changeover' ? recarry(evidence.facts)
      /* the next shift's count: the same shift's window moved on, nothing counted yet */
      : evidence.tool === 'losses' && evidence.facts.losses ? { losses: nextShift(evidence.facts.losses, x.at) } : {},
    uses: [linkOf(kind, fixId, 'proof', x.at, x.by, x.useId)],
    startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}

/** A changeover timed again: the same steps, each carried until timed or
 *  typed again; the products, the week and the day's minutes as they stand,
 *  so the interval reads the same way on both sides. */
const recarry = (f: ToolStudy['facts']): ToolStudy['facts'] => ({
  sequence: carrySequence(f.sequence),
  ...(f.fromProduct ? { fromProduct: f.fromProduct } : {}), ...(f.toProduct ? { toProduct: f.toProduct } : {}),
  ...(f.perWeek ? { perWeek: f.perWeek } : {}), ...(f.availableMinPerDay ? { availableMinPerDay: f.availableMinPerDay } : {}),
  ...(f.products?.length ? { products: f.products.map(p => ({ ...p })) } : {}),
});

/** A work balance timed again: the same elements, whose they are as they
 *  stand, no laps and no pace yet — a typed time stays only where it was
 *  never timed, so before and after are each as known as they say. */
const retime = (steps: BalanceStep[] | undefined): BalanceStep[] =>
  (steps ?? []).map(({ laps, rating: _r, typedSec, ...st }) => { void _r; return { ...st, ...(!(laps ?? []).length && typedSec ? { typedSec } : {}) }; });

/** "Take the readings" on a test: a capability study named for the test, on
 *  its machine, attached to its job, proving it. */
export function readingsFor(test: { id: ID; projectId: ID; title: string; assetId?: ID }, machine: string | undefined,
  x: { at: number; by?: string; id: string; useId: string }): ToolStudy {
  return {
    id: x.id, tool: 'capability', name: test.title, projectId: test.projectId,
    ...(machine ? { machine } : {}), ...(test.assetId ? { assetId: test.assetId } : {}),
    facts: {}, uses: [linkOf('test', test.id, 'proof', x.at, x.by, x.useId)],
    startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}

/** "Make it better": the fix's words, with the figures already in them —
 *  "Weight accuracy 400 g: Not capable: Cpk 0.67 from 30 — about 2 in 100
 *  would be light." */
export function betterWords(s: ToolStudy, stepId?: string, ctx?: StudyContext): string {
  const st = s.tool === 'map' && stepId ? (s.facts.flow ?? []).find(x => x.id === stepId) : undefined;
  if (st) {
    const at = stepAt(st, s.agreed?.map);
    return `${st.name.trim() || 'A step'}${at ? ` (${at})` : ''} — ${stepFigure(st, s.agreed?.map)}`;
  }
  /* a changeover's step: "Pre-stage the film reels — external, 11 min" */
  const co = s.tool === 'changeover' && stepId ? (s.facts.sequence ?? []).find(x => x.id === stepId) : undefined;
  if (co) return `${co.name.trim() || 'A step'} — ${changeoverStepFigure(co)}`;
  if (s.tool === 'losses') {
    /* a bar of the waterfall in its own figures — "Breakdown on the Bagger —
       32 min of stops (1 stop) on Shift 1, yesterday (£40 idle labour · £128
       lost contribution)" */
    const b = stepId ? findBar(lossFiguresOf(s, ctx).bars, stepId) : undefined;
    if (b) return barWords(b, s.facts.losses);
  }
  const said = studySays(s, ctx);
  if (s.tool === 'balance') {
    const f = balance(s.facts.steps, s.agreed?.balance), c = f.constraint;
    if (c && c.overBy > 0) return `${s.name}: ${c.who} carries ${secsOf(c.work)} against a ${secsOf(f.taktSec ?? 0)} takt — take ${secsOf(c.overBy)} of work off ${c.who}, or change how it is done.`;
  }
  if (s.tool === 'sampling') {
    const w = samplingWorst(s.agreed?.sampling, s.facts.taps ?? []);
    if (w) return `${s.name}: ${worstWords(w)}.`;
  }
  const why = said.tone === 'r' ? said.text : said.capability?.text ?? said.text;
  return `${s.name}: ${why}`;
}

/** Is it worth making better? It failed, or it passes and would drift. */
export function worthBetter(s: ToolStudy): boolean {
  /* a value stream and a changeover are made better a step at a time — from
     the step itself; a shift's losses a bar at a time — from the bar */
  if (s.tool === 'map' || s.tool === 'changeover' || s.tool === 'losses') return false;
  const said = studySays(s);
  if (s.tool === 'balance') return said.verdict === 'Over takt';
  /* a tenth of the time or more not working, known from enough taps */
  if (s.tool === 'sampling') return (samplingWorst(s.agreed?.sampling, s.facts.taps ?? [])?.share ?? 0) >= 0.1;
  return said.tone === 'r' || said.capability?.tone === 'a';
}
