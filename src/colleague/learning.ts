/* WHAT AI MODE DID, AND WHAT COULD BE CODE INSTEAD (8 November, AI Mode phase 5b; docs/AI-MODE.md §9).
 *
 * Rowland, 8 November: "when we ask to do something in the app, we learn what was done and we actually want to replicate it
 * with code as much as possible — this keeps AI costs lower and the app becomes more intelligent over time"; and, the same
 * day, "nothing should automatically become production code … recording conversations is not the same as training a model."
 *
 * So this module READS two records and PROPOSES — it never writes code, a record or a setting:
 *   ai_actions          (supabase/AI_ACTIONS.sql — the person's own rows) every call the colleague proposed, every one the
 *                       gateway refused, and what came of each: done, failed, declined;
 *   the conversations   on this device (studies of tool `talk`, facts.colleague — src/colleague/conversation): each turn's
 *                       words and, on the colleague's, the steps it took in order (`used`).
 * From them it finds what is asked again and again — the same steps in the same order, the same calculator, the same
 * question, a write the person keeps declining — and says each as a sentence with how often, and where in the app it could
 * be answered with no AI (a page, a saved view, a calculator's kept figures, a new capability, the colleague's
 * instructions). A candidate becomes code only through the tool standard, its tests, the gate and Rowland's word.
 *
 * Pure: the page (screens/AiUsageScreen) hands the rows in; the tests build them by hand. */
import type { ColleagueTurn } from './conversation';

export type ActionStatus = 'proposed' | 'refused' | 'done' | 'failed' | 'declined';
export interface ActionRow {
  at: string | number;
  conversation_id?: string | null;
  call_id?: string | null;
  capability?: string | null;
  kind?: string | null;
  input?: unknown;
  status: ActionStatus | string;
  says?: string | null;
}

/** A conversation as this module reads it: its id and its turns (facts.turns), and the writes done through it. */
export interface ConversationRead {
  id: string;
  turns: readonly ColleagueTurn[];
  actions?: readonly { callId: string; name: string; status: 'done' | 'declined' | 'failed'; at: number }[];
}

const DAY = 86_400_000;
const msOf = (at: string | number): number => (typeof at === 'number' ? at : Date.parse(at));
const plural = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const titleDefault = (name: string): string => name.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/* ======================================================================= what the colleague did */

export interface CapabilityTally { capability: string; title: string; kind: string; proposed: number; done: number; failed: number; declined: number; refused: number }
export interface Refusal { at: number; capability: string; tried: string; why: string }
export interface ActionsRead {
  proposed: number; done: number; failed: number; declined: number; refused: number;
  /** Writes the person answered: done or failed (they pressed Do it) against declined. */
  writesAnswered: number; writesAccepted: number;
  /** The share of writes accepted, 0–1, or undefined when none were answered. */
  acceptedShare?: number;
  /** By capability, the most proposed first. */
  byCapability: CapabilityTally[];
  /** Calls the gateway dropped — never sent to the device — the newest first. */
  refusals: Refusal[];
}

/** What the input said, short — for a refused call's line. */
export function inputSaid(input: unknown, max = 140): string {
  if (input == null) return 'no input';
  let s: string;
  try { s = typeof input === 'string' ? input : JSON.stringify(input); } catch { s = String(input); }
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** READ ai_actions — the last `days` days to `now`. */
export function readActions(rows: readonly ActionRow[], now: number, days = 30, titleOf: (name: string) => string | undefined = () => undefined): ActionsRead {
  const since = now - days * DAY;
  const mine = rows.filter(r => { const t = msOf(r.at); return Number.isFinite(t) && t > since && t <= now; });
  const by = new Map<string, CapabilityTally>();
  const tally = (r: ActionRow) => {
    const c = r.capability || '(unnamed)';
    const t = by.get(c) ?? { capability: c, title: titleOf(c) ?? titleDefault(c), kind: r.kind ?? 'unknown', proposed: 0, done: 0, failed: 0, declined: 0, refused: 0 };
    if (r.kind && t.kind === 'unknown') t.kind = r.kind;
    by.set(c, t);
    return t;
  };
  let proposed = 0, done = 0, failed = 0, declined = 0, refused = 0, writesAnswered = 0, writesAccepted = 0;
  const refusals: Refusal[] = [];
  for (const r of mine) {
    const t = tally(r);
    if (r.status === 'proposed') { proposed++; t.proposed++; }
    else if (r.status === 'done') { done++; t.done++; }
    else if (r.status === 'failed') { failed++; t.failed++; }
    else if (r.status === 'declined') { declined++; t.declined++; }
    else if (r.status === 'refused') {
      refused++; t.refused++;
      refusals.push({ at: msOf(r.at), capability: r.capability || '(unnamed)', tried: inputSaid(r.input), why: (r.says ?? '').trim() || 'not in the capabilities, or its input did not fit them' });
    }
    if (t.kind === 'write' && (r.status === 'done' || r.status === 'failed' || r.status === 'declined')) {
      writesAnswered++;
      if (r.status !== 'declined') writesAccepted++;
    }
  }
  return {
    proposed, done, failed, declined, refused, writesAnswered, writesAccepted,
    acceptedShare: writesAnswered ? writesAccepted / writesAnswered : undefined,
    byCapability: [...by.values()].sort((a, b) => b.proposed - a.proposed || (b.done + b.failed + b.declined) - (a.done + a.failed + a.declined) || a.capability.localeCompare(b.capability)),
    refusals: refusals.sort((a, b) => b.at - a.at),
  };
}

/* ======================================================================= candidates for code */

export type CandidateKind = 'steps' | 'calculator' | 'question' | 'declined';
export type HomeKind = 'page' | 'saved view' | 'calculator' | 'new capability' | 'instructions';
export interface Candidate {
  id: string;
  kind: CandidateKind;
  /** The sentence the page says. */
  sentence: string;
  /** How many times it happened in the window. */
  count: number;
  /** The evidence, a line each (when, what). */
  evidence: string[];
  /** Where in the app it could be answered with no AI — a proposal, never a change. */
  home: { kind: HomeKind; where: string; href?: string };
  /** The candidate as a note to copy — what, how often, where, and that it is a proposal. */
  note: string;
}

export interface LearnOptions {
  now: number;
  days?: number;
  /** How many times makes a pattern — three by default. */
  min?: number;
  titleOf?: (name: string) => string | undefined;
  lineName?: (id: string) => string | undefined;
  projectName?: (id: string) => string | undefined;
  calculatorName?: (key: string) => string | undefined;
}

/** The kinds of capability, as the schemas say them — locals (the focus, a note, a timer, a page opened) are the
 *  conversation's own housekeeping and never a pattern. */
const LOCAL = new Set(['set_focus', 'park_focus', 'record_observation', 'start_timer', 'open_page']);
const WRITES = new Set(['raise_problem', 'update_problem', 'start_project', 'save_calculation', 'add_photo_to_problem']);

/** A question's words, normalised — lower case, no punctuation, the small words left out, each once, in order. */
const SMALL = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'to', 'of', 'on', 'in', 'at', 'for', 'and', 'or', 'me', 'my', 'i', 'you', 'can', 'could', 'please',
  'what', 'whats', 'which', 'show', 'tell', 'give', 'us', 'we', 'our', 'it', 'its', 'this', 'that', 'there', 'do', 'does', 'have', 'has', 'with', 'about', 'how', 'any', 'some', 'now', 'today', 'again', 'just']);
export function normaliseQuestion(words: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words.toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').replace(/[^a-z0-9£%.\s-]/g, ' ').split(/\s+/)) {
    const t = w.replace(/^[.-]+|[.-]+$/g, '');
    if (!t || SMALL.has(t) || seen.has(t)) continue;
    seen.add(t); out.push(t);
  }
  return out.join(' ');
}

const personWords = (t: ColleagueTurn): string => (t.kind === 'typed' ? t.text ?? '' : t.kind === 'said' ? t.text ?? t.heard ?? '' : '').trim();
const isPerson = (t: ColleagueTurn) => (t.kind === 'typed' || t.kind === 'said') && !t.struck && !!personWords(t);

/** One request: what the person asked, and the steps the colleague took for it (the replies up to the next request). */
interface Request { conversationId: string; at: number; words: string; steps: { name: string; input?: Record<string, unknown>; status: string }[] }

function requestsOf(conversations: readonly ConversationRead[], since: number, now: number): Request[] {
  const out: Request[] = [];
  for (const c of conversations) {
    const turns = [...c.turns].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    let cur: Request | null = null;
    for (const t of turns) {
      if (isPerson(t)) {
        cur = t.at > since && t.at <= now ? { conversationId: c.id, at: t.at, words: personWords(t), steps: [] } : null;
        if (cur) out.push(cur);
      } else if (t.kind === 'reply' && cur) {
        for (const u of t.used ?? []) cur.steps.push({ name: u.name, input: u.input, status: u.status });
      }
    }
  }
  return out;
}

/** The ai_actions rows of conversations NOT on this device, read as requests: their proposals in order, split where more
 *  than two minutes pass (a request's rounds come within seconds of each other). No words — a question cannot be read. */
function requestsFromRows(rows: readonly ActionRow[], onDevice: ReadonlySet<string>, since: number, now: number): Request[] {
  const props = rows.filter(r => r.status === 'proposed' && r.conversation_id && !onDevice.has(r.conversation_id))
    .map(r => ({ ...r, ms: msOf(r.at) })).filter(r => r.ms > since && r.ms <= now)
    .sort((a, b) => String(a.conversation_id).localeCompare(String(b.conversation_id)) || a.ms - b.ms);
  const out: Request[] = [];
  let cur: Request | null = null, last = 0;
  for (const r of props) {
    if (!cur || cur.conversationId !== r.conversation_id || r.ms - last > 120_000) {
      cur = { conversationId: String(r.conversation_id), at: r.ms, words: '', steps: [] };
      out.push(cur);
    }
    cur.steps.push({ name: r.capability ?? '', input: (r.input && typeof r.input === 'object' ? r.input as Record<string, unknown> : undefined), status: 'proposed' });
    last = r.ms;
  }
  return out;
}

/** The steps that matter for a pattern: no locals, a step repeated straight after itself said once. */
const shapeOf = (steps: Request['steps']): string[] => {
  const out: string[] = [];
  for (const s of steps) { if (!s.name || LOCAL.has(s.name)) continue; if (out[out.length - 1] !== s.name) out.push(s.name); }
  return out;
};
const lineIdOf = (steps: Request['steps']): string | undefined => {
  const ids = new Set(steps.map(s => s.input?.lineId).filter((v): v is string => typeof v === 'string' && !!v));
  return ids.size === 1 ? [...ids][0] : undefined;
};
const projectIdOf = (steps: Request['steps']): string | undefined => {
  const ids = new Set(steps.map(s => s.input?.projectId).filter((v): v is string => typeof v === 'string' && !!v));
  return ids.size === 1 ? [...ids][0] : undefined;
};
const dayWords = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Where a run of steps could be answered with no AI — read off the last read it ends on, or a write. */
function homeFor(shape: readonly string[], lineId: string | undefined, projectId: string | undefined, o: LearnOptions, input?: Record<string, unknown>): Candidate['home'] {
  const line = lineId ? o.lineName?.(lineId) ?? 'the line' : undefined;
  const lineQ = lineId ? encodeURIComponent(lineId) : '';
  const project = projectId ? o.projectName?.(projectId) ?? 'the project' : undefined;
  const write = shape.find(s => WRITES.has(s));
  if (write && shape.length > 1) return { kind: 'new capability', where: `one capability that does these ${shape.length} steps in one — fewer rounds, so fewer answers to pay for` };
  const last = [...shape].reverse().find(s => !WRITES.has(s)) ?? shape[shape.length - 1];
  if (last === 'overdue_actions') return lineId
    ? { kind: 'saved view', where: `a saved view on ${line}'s Actions — late first`, href: `/lines/${lineQ}?view=actions` }
    : project ? { kind: 'saved view', where: `a saved view on ${project}'s Actions — late first`, href: `/project/${encodeURIComponent(projectId as string)}/actions` }
    : { kind: 'saved view', where: 'a saved view on Actions — late first', href: '/actions' };
  if (last === 'list_problems') {
    const which = typeof input?.which === 'string' && input.which !== 'open' && input.which !== 'all' ? ` filtered to ${input.which}` : '';
    return lineId
      ? { kind: 'saved view', where: `a saved view on ${line}'s Problems${which}`, href: `/snags?line=${lineQ}` }
      : { kind: 'saved view', where: `a saved view on Problems${which}`, href: '/snags' };
  }
  if (last === 'line_state') return lineId ? { kind: 'page', where: `${line}'s own page, which says its state`, href: `/lines/${lineQ}` } : { kind: 'page', where: 'the line\'s own page' };
  if (last === 'project_state') return projectId ? { kind: 'page', where: `${project}'s own page`, href: `/project/${encodeURIComponent(projectId)}` } : { kind: 'page', where: 'the project\'s own page' };
  if (last === 'story_state') return { kind: 'page', where: 'the Story, which says the four figures and the chapters', href: '/' };
  if (last === 'tool_records') return lineId ? { kind: 'page', where: `${line}'s Tools`, href: `/lines/${lineQ}?view=tools` } : { kind: 'page', where: 'the Tools page of the line or project' };
  if (last === 'list_calculators') return { kind: 'page', where: 'the Calculators page', href: '/calc' };
  if (last === 'find') return { kind: 'page', where: 'the search in the top bar' };
  if (write) return { kind: 'page', where: `the page it writes on — ${titleDefault(write).toLowerCase()} is a button there` };
  return { kind: 'new capability', where: 'a new capability that answers it directly' };
}

const noteOf = (sentence: string, count: number, home: Candidate['home'], evidence: readonly string[]): string =>
  [
    `AI Mode — a candidate for code (a proposal, not a change)`,
    sentence,
    `Seen ${count} times. Could be answered with no AI by: ${home.where}${home.href ? ` (#${home.href})` : ''}.`,
    ...(evidence.length ? ['Evidence:', ...evidence.map(e => `- ${e}`)] : []),
    'It becomes code only through the tool standard, its tests, the gate and Rowland\'s approval.',
  ].join('\n');

/** FIND THE CANDIDATES — what is asked again and again, each with its evidence and a native home. Most frequent first. */
export function findCandidates(actionRows: readonly ActionRow[], conversations: readonly ConversationRead[], o: LearnOptions): Candidate[] {
  const days = o.days ?? 30, min = o.min ?? 3;
  const since = o.now - days * DAY;
  const window = days === 30 ? 'in the last 30 days' : `in the last ${days} days`;
  const titleOf = (name: string) => o.titleOf?.(name) ?? titleDefault(name);
  const onDevice = new Set(conversations.map(c => c.id));
  const requests = [...requestsOf(conversations, since, o.now), ...requestsFromRows(actionRows, onDevice, since, o.now)];
  const out: Candidate[] = [];

  /* 1. THE SAME STEPS IN THE SAME ORDER — two or more, at least `min` times (one line's, when they all name one line) */
  const seqs = new Map<string, Request[]>();
  for (const r of requests) {
    const shape = shapeOf(r.steps);
    if (shape.length < 2) continue;
    const line = lineIdOf(r.steps), project = projectIdOf(r.steps);
    const k = `${shape.join('>')}|${line ?? ''}|${project ?? ''}`;
    seqs.set(k, [...(seqs.get(k) ?? []), r]);
  }
  for (const [k, rs] of seqs) {
    if (rs.length < min) continue;
    const shape = shapeOf(rs[0].steps);
    const line = lineIdOf(rs[0].steps), project = projectIdOf(rs[0].steps);
    const lastInput = [...rs[0].steps].reverse().find(s => !LOCAL.has(s.name))?.input;
    const home = homeFor(shape, line, project, o, lastInput);
    const place = line ? ` on ${o.lineName?.(line) ?? 'one line'}` : project ? ` on ${o.projectName?.(project) ?? 'one project'}` : '';
    const steps = shape.map(s => titleOf(s).toLowerCase()).join(', then ');
    const sentence = `The colleague took the same ${shape.length} steps${place} ${rs.length} times ${window} (${steps}) — ${home.where} would answer it with no AI.`;
    const evidence = rs.slice(0, 6).map(r => `${dayWords(r.at)}${r.words ? ` — “${r.words.slice(0, 90)}”` : ''}`);
    out.push({ id: `steps:${k}`, kind: 'steps', sentence, count: rs.length, evidence, home, note: noteOf(sentence, rs.length, home, evidence) });
  }

  /* 2. THE SAME CALCULATOR — run_calculator by key, the same figures counted apart */
  const calcs = new Map<string, { at: number; inputs: string }[]>();
  const calcSeen = new Set<string>();
  const addCalc = (key: unknown, inputs: unknown, at: number, id: string) => {
    if (typeof key !== 'string' || !key || calcSeen.has(id)) return;
    calcSeen.add(id);
    calcs.set(key, [...(calcs.get(key) ?? []), { at, inputs: inputSaid(inputs, 200) }]);
  };
  for (const c of conversations) for (const t of c.turns) {
    if (t.kind !== 'reply' || t.at <= since || t.at > o.now) continue;
    for (const u of t.used ?? []) if (u.name === 'run_calculator' && u.status !== 'dropped' && u.status !== 'refused') addCalc(u.input?.key, u.input?.inputs, t.at, u.callId || `${t.id}:${u.at}`);
  }
  for (const r of actionRows) {
    if (r.capability !== 'run_calculator' || r.status !== 'proposed' || (r.conversation_id && onDevice.has(r.conversation_id))) continue;
    const ms = msOf(r.at); if (ms <= since || ms > o.now) continue;
    const inp = (r.input ?? {}) as { key?: unknown; inputs?: unknown };
    addCalc(inp.key, inp.inputs, ms, r.call_id || `${r.conversation_id}:${ms}`);
  }
  for (const [key, runs] of calcs) {
    if (runs.length < min) continue;
    const name = o.calculatorName?.(key) ?? key;
    const same = new Map<string, number>();
    for (const r of runs) same.set(r.inputs, (same.get(r.inputs) ?? 0) + 1);
    const most = Math.max(...same.values());
    const home: Candidate['home'] = { kind: 'calculator', where: most >= 2 ? `the ${name} calculator with its figures kept (Save as before) — the same figures came ${most} times` : `the ${name} calculator itself, opened from where it was asked`, href: `/calc/${encodeURIComponent(key)}` };
    const sentence = `You had the colleague run the ${name} calculator ${runs.length} times ${window} — ${home.where} would do the sum with no AI.`;
    const evidence = runs.slice(0, 6).map(r => `${dayWords(r.at)} — ${r.inputs}`);
    out.push({ id: `calc:${key}`, kind: 'calculator', sentence, count: runs.length, evidence, home, note: noteOf(sentence, runs.length, home, evidence) });
  }

  /* 3. THE SAME QUESTION — the person's words normalised (only on this device, where the words are kept) */
  const qs = new Map<string, Request[]>();
  for (const r of requests) {
    if (!r.words) continue;
    const k = normaliseQuestion(r.words);
    if (!k || k.split(' ').length < 2) continue;
    qs.set(k, [...(qs.get(k) ?? []), r]);
  }
  for (const [k, rs] of qs) {
    if (rs.length < min) continue;
    const answered = rs.find(r => shapeOf(r.steps).length) ?? rs[0];
    const shape = shapeOf(answered.steps);
    const lastInput = [...answered.steps].reverse().find(s => !LOCAL.has(s.name))?.input;
    const home = shape.length ? homeFor(shape.slice(-1), lineIdOf(answered.steps), projectIdOf(answered.steps), o, lastInput) : { kind: 'new capability' as const, where: 'a page or capability that answers it directly — the colleague answered it from the conversation alone' };
    const sentence = `You asked “${rs[rs.length - 1].words.slice(0, 120)}” ${rs.length} times ${window} — ${home.where} would answer it with no AI.`;
    const evidence = rs.slice(0, 6).map(r => `${dayWords(r.at)} — “${r.words.slice(0, 90)}”`);
    out.push({ id: `question:${k}`, kind: 'question', sentence, count: rs.length, evidence, home, note: noteOf(sentence, rs.length, home, evidence) });
  }

  /* 4. A WRITE DECLINED MOST OF THE TIME — the colleague proposes it wrongly. ai_actions and the device's own actions,
     each call once. */
  const outcomes = new Map<string, Map<string, { status: string; at: number }>>();
  const addOutcome = (cap: string, callId: string, status: string, at: number) => {
    if (!WRITES.has(cap) || (status !== 'done' && status !== 'failed' && status !== 'declined')) return;
    const m = outcomes.get(cap) ?? new Map();
    if (!m.has(callId)) m.set(callId, { status, at });
    outcomes.set(cap, m);
  };
  for (const r of actionRows) { const ms = msOf(r.at); if (ms > since && ms <= o.now && r.capability) addOutcome(r.capability, r.call_id || `${r.conversation_id}:${ms}`, r.status, ms); }
  for (const c of conversations) for (const a of c.actions ?? []) if (a.at > since && a.at <= o.now) addOutcome(a.name, a.callId, a.status, a.at);
  for (const [cap, m] of outcomes) {
    const all = [...m.values()];
    const declined = all.filter(x => x.status === 'declined').length;
    if (all.length < min || declined * 2 <= all.length) continue;
    const home: Candidate['home'] = { kind: 'instructions', where: `the colleague's instructions and the ${titleOf(cap).toLowerCase()} capability's description — when it proposes it, and with what` };
    const sentence = `The colleague proposed “${titleOf(cap)}” ${plural(all.length, 'time')} ${window} and you declined ${declined} — it is proposing it wrongly; ${home.where} want looking at.`;
    const evidence = all.sort((a, b) => b.at - a.at).slice(0, 6).map(x => `${dayWords(x.at)} — ${x.status}`);
    out.push({ id: `declined:${cap}`, kind: 'declined', sentence, count: all.length, evidence, home, note: noteOf(sentence, all.length, home, evidence) });
  }

  return out.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/** The person's requests on this device in the window — the count cost per request is worked out from (colleague/usage). */
export const requestsOnDevice = (conversations: readonly ConversationRead[], now: number, days = 30): number =>
  requestsOf(conversations, now - days * DAY, now).length;
