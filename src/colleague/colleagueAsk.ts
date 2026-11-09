/* AI MODE — ASKING THE COLLEAGUE, AND DOING WHAT IT ASKS FOR (the shared contract §2).
 *
 * The conversation goes to the `assist` gateway (task `colleague`); the key is the gateway's, this sends the person's
 * session. The answer is words — or words and CALLS, the capabilities the colleague wants run (src/capabilities). The
 * client loop:
 *   a READ or a LOCAL step is run at once (runCall), its sentence shown under the turn;
 *   a WRITE is shown as a card and waits for the person: Do it runs it (runCall with confirmed), Not now sends back
 *   that they declined — nothing writes without the tap; a write the person may not make is refused before any card;
 *   everything it gave is sent back with `pending`, and the colleague answers again — at most SIX rounds, then it says
 *   so and stops.
 * Whatever goes wrong — no signal, no cloud, the allowance spent, the gateway off — comes back in words, and nothing the
 * person said is touched: the turn says why it is not answered and can be asked again. Manual Mode is not affected. */
import { supabase } from '../cloud/client';
import type { CapCall, CapRef, CapResult } from '../capabilities/types';
import type { GatewayTurn } from './conversation';

export const MAX_ROUNDS = 6;

export const NO_SIGNAL = 'No signal — Faultline answers when the signal is back. What you said is kept.';
export const NOT_NOW = 'Faultline could not answer just now — ask again. What you said is kept.';
export const NO_CLOUD = 'AI Mode needs the cloud, and this copy of Faultline is not connected to it. What you type is kept, and Manual Mode works as ever.';
export const TOO_MANY = `I stopped after ${MAX_ROUNDS} steps without finishing — say "carry on" and I will pick it up from here.`;

/** What is sent each round. */
export interface ColleagueBody {
  task: 'colleague';
  turns: GatewayTurn[];
  images?: { photo: string; data: string }[];
  focus?: string;
  /** How I work (lib/preferences) — the person's own words, sent with every question; absent when nothing is saved. */
  preferences?: string;
  today: string;
  conversationId?: string;
  pending?: { assistant: unknown; results: CallResult[] };
  /** The person is listening — the voice conversation: the colleague answers for the ear (docs/VOICE.md). */
  spoken?: boolean;
}
export interface CallResult { id: string; ok: boolean; says: string; data?: unknown; declined?: boolean }

/** What the gateway answers. */
export type GatewayAnswer =
  | { ok: true; reply: string; calls?: CapCall[]; assistant?: unknown; suggestions?: string[]; unsure?: string[]; model?: string }
  | { ok: false; why: string; off?: boolean; offline?: boolean };

/** THE GATEWAY ASKED — its answer read, every failure said in words. */
export async function invokeColleague(body: ColleagueBody): Promise<GatewayAnswer> {
  if (!supabase) return { ok: false, off: true, why: NO_CLOUD };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, offline: true, why: NO_SIGNAL };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body });
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (error.name === 'FunctionsHttpError' && ctx instanceof Response) {
        const d = await ctx.clone().json().catch(() => null) as { why?: unknown; off?: unknown } | null;
        const why = typeof d?.why === 'string' && d.why ? d.why : ctx.status === 401 ? 'Sign in to use AI Mode. What you said is kept.' : NOT_NOW;
        return { ok: false, why, ...(d?.off ? { off: true } : {}) };
      }
      if (error.name === 'FunctionsFetchError') return { ok: false, offline: true, why: NO_SIGNAL };
      return { ok: false, why: NOT_NOW };
    }
    return readAnswer(data);
  } catch {
    return typeof navigator !== 'undefined' && !navigator.onLine ? { ok: false, offline: true, why: NO_SIGNAL } : { ok: false, why: NOT_NOW };
  }
}

const strs = (v: unknown, n: number): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, n) : []);

/** The gateway's JSON read defensively: a call with no id or name is left out. */
export function readAnswer(data: unknown): GatewayAnswer {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const why = typeof d.why === 'string' && d.why ? d.why : NOT_NOW;
  if (d.off) return { ok: false, off: true, why };
  if (d.ok !== true) return { ok: false, why };
  const calls = Array.isArray(d.calls) ? d.calls.flatMap((c): CapCall[] => {
    const x = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    return typeof x.id === 'string' && typeof x.name === 'string' ? [{ id: x.id, name: x.name, input: x.input ?? {} }] : [];
  }) : [];
  return {
    ok: true, reply: typeof d.reply === 'string' ? d.reply : '',
    ...(calls.length ? { calls } : {}), ...('assistant' in d ? { assistant: d.assistant } : {}),
    suggestions: strs(d.suggestions, 3), unsure: strs(d.unsure, 12), ...(typeof d.model === 'string' ? { model: d.model } : {}),
  };
}

/** What a write's card needs before it is shown: may this person make it, and what will it do. */
/** `authorised`: the write goes into a record the person already said yes to in this conversation — confirm once (10 November,
 *  docs/AI-OPERATING.md): no card, run at once, said under the turn as done. */
export type Prepared = { ok: true; title: string; preview: string; input: Record<string, unknown>; authorised?: boolean } | { ok: false; title: string; why: string };

/** A capability used in a round, as the screen is told it. */
export interface Step {
  call: CapCall;
  title: string;
  kind: 'read' | 'write' | 'local';
  status: 'done' | 'failed' | 'refused' | 'waiting' | 'declined' | 'dropped';
  says: string;
  refs: CapRef[];
  preview?: string;
  input?: Record<string, unknown>;
}

export interface LoopDeps {
  invoke: (body: ColleagueBody) => Promise<GatewayAnswer>;
  /** The capability's kind and title, or nothing when the app has no such capability. */
  describe: (name: string) => { kind: 'read' | 'write' | 'local'; title: string } | undefined;
  /** runCall — validate, allowed, run (a write only when confirmed). */
  run: (call: CapCall, confirmed: boolean) => Promise<CapResult>;
  /** A write checked before its card: validated, allowed for this person, its preview. */
  prepare: (call: CapCall) => Promise<Prepared>;
  /** The person's answer to a write's card. */
  confirm: (step: Step) => Promise<boolean>;
  /** Told as each step starts and finishes, to draw it under the turn. */
  onStep: (step: Step) => void | Promise<void>;
  /** The words the colleague has said so far this turn. */
  onWords?: (text: string) => void;
}

export interface LoopAsk {
  turns: GatewayTurn[];
  images?: { photo: string; data: string }[];
  /** Read again each round — a step may have changed the threads. */
  focus: () => Promise<string> | string;
  today: string;
  conversationId?: string;
  /** How I work — read once per question (lib/preferences preferencesText), so a line remembered meanwhile goes next time. */
  preferences?: () => string;
  /** The voice conversation is open: answered for the ear. */
  spoken?: boolean;
}

export type LoopEnd =
  | { ok: true; reply: string; suggestions: string[]; unsure: string[]; model?: string; rounds: number; capped?: boolean }
  | { ok: false; why: string; off?: boolean; offline?: boolean; reply?: string; rounds: number };

const said = (r: CapResult): string => (r.ok ? r.says : r.why);

/** THE CLIENT LOOP — send, run what is asked (writes only on the person's word), send back, until the colleague answers
 *  with no calls or six rounds have gone. */
export async function colleagueLoop(ask: LoopAsk, deps: LoopDeps): Promise<LoopEnd> {
  let pending: ColleagueBody['pending'];
  const words: string[] = [];
  const unsure = new Set<string>();
  const text = () => words.filter(Boolean).join('\n\n');
  const prefs = ask.preferences?.().trim() ?? '';
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const body: ColleagueBody = {
      task: 'colleague', turns: ask.turns, ...(ask.images?.length ? { images: ask.images } : {}),
      focus: await ask.focus(), ...(prefs ? { preferences: prefs } : {}), today: ask.today, ...(ask.conversationId ? { conversationId: ask.conversationId } : {}), ...(pending ? { pending } : {}),
      ...(ask.spoken ? { spoken: true } : {}),
    };
    const a = await deps.invoke(body);
    if (!a.ok) return { ...a, rounds: round, ...(words.length ? { reply: text() } : {}) };
    if (a.reply.trim()) { words.push(a.reply.trim()); deps.onWords?.(text()); }
    for (const u of a.unsure ?? []) unsure.add(u);
    if (!a.calls?.length) return { ok: true, reply: text(), suggestions: a.suggestions ?? [], unsure: [...unsure], ...(a.model ? { model: a.model } : {}), rounds: round };
    if (round === MAX_ROUNDS) {
      words.push(TOO_MANY);
      return { ok: true, reply: text(), suggestions: ['Carry on'], unsure: [...unsure], ...(a.model ? { model: a.model } : {}), rounds: round, capped: true };
    }
    const results: CallResult[] = [];
    for (const call of a.calls) results.push(await doCall(call, deps));
    pending = { assistant: a.assistant ?? null, results };
  }
  /* not reached — the last round returns above */
  return { ok: false, why: NOT_NOW, rounds: MAX_ROUNDS };
}

async function doCall(call: CapCall, deps: LoopDeps): Promise<CallResult> {
  const d = deps.describe(call.name);
  if (!d) {
    const step: Step = { call, title: call.name, kind: 'read', status: 'dropped', says: 'Faultline has no such step — it was not run.', refs: [] };
    await deps.onStep(step);
    return { id: call.id, ok: false, says: step.says };
  }
  if (d.kind !== 'write') {
    const r = await deps.run(call, false);
    await deps.onStep({ call, title: d.title, kind: d.kind, status: r.ok ? 'done' : 'failed', says: said(r), refs: r.ok ? r.refs : [] });
    return { id: call.id, ok: r.ok, says: said(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) };
  }
  /* A WRITE: checked first — one the person may not make never becomes a card */
  const p = await deps.prepare(call);
  if (!p.ok) {
    await deps.onStep({ call, title: p.title, kind: 'write', status: 'refused', says: p.why, refs: [] });
    return { id: call.id, ok: false, says: p.why };
  }
  if (p.authorised) {
    const r = await deps.run(call, true);
    await deps.onStep({ call, title: p.title, kind: 'write', status: r.ok ? 'done' : 'failed', says: said(r), preview: p.preview, input: p.input, refs: r.ok ? r.refs : [] });
    return { id: call.id, ok: r.ok, says: said(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) };
  }
  const waiting: Step = { call, title: p.title, kind: 'write', status: 'waiting', says: p.preview, preview: p.preview, input: p.input, refs: [] };
  await deps.onStep(waiting);
  const yes = await deps.confirm(waiting);
  if (!yes) {
    await deps.onStep({ ...waiting, status: 'declined', says: 'Not done — the person said not now.' });
    return { id: call.id, ok: false, declined: true, says: 'The person said not now; nothing was written.' };
  }
  const r = await deps.run(call, true);
  await deps.onStep({ ...waiting, status: r.ok ? 'done' : 'failed', says: said(r), refs: r.ok ? r.refs : [] });
  return { id: call.id, ok: r.ok, says: said(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) };
}
