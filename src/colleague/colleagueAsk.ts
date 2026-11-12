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
 * person said is touched: the turn says why it is not answered and can be asked again. Manual Mode is not affected.
 *
 * AS IT IS WRITTEN (11 November — the reply was waited for whole, and on the floor by voice it felt slow): asked with `onText`,
 * the gateway streams each round (server-sent events: `{ delta }` the words as written, `{ restart }` when it asks a round again,
 * then ONE event holding exactly the answer the plain ask gives). The words grow in the turn and the voice is handed each
 * finished sentence as it comes; the answer itself is read from the final event as before, and every figure checked once the
 * reply is complete. A stream that fails is asked once more the plain way. */
import { supabase } from '../cloud/client';
import { colleagueReply } from '../tools/colleague/colleagueAssist';
import type { CapCall, CapRef, CapResult } from '../capabilities/types';
import type { GatewayTurn } from './conversation';
import { checkFigures, type FigureSource } from './figureCheck';
import { budgetMoved } from '../lib/aiBudget';

export const MAX_ROUNDS = 6;

export const NO_SIGNAL = 'No signal — Luna answers when the signal is back. What you said is kept.';
export const NOT_NOW = 'Luna could not answer just now — ask again. What you said is kept.';
export const NO_CLOUD = 'AI Mode needs the cloud, and this copy of the app is not connected to it. What you type is kept, and Manual Mode works as ever.';
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
  /** The words as they are written: answered as server-sent events (invokeColleague with onText). */
  stream?: boolean;
}
export interface CallResult { id: string; ok: boolean; says: string; data?: unknown; declined?: boolean }

/** What the gateway answers. */
export type GatewayAnswer =
  | { ok: true; reply: string; calls?: CapCall[]; assistant?: unknown; suggestions?: string[]; unsure?: string[]; model?: string; /** Who is in the room, when the reply said it changed. */ room?: string[] }
  | { ok: false; why: string; off?: boolean; offline?: boolean };

/** The words of a round so far, as the screen shows them: the reply as colleagueReply reads it, a follow-ups line still
 *  being written ("Sugg…") left off. */
export function growingReply(soFar: string): string {
  const { reply } = colleagueReply([{ type: 'text', text: soFar }]);
  const lines = reply.split('\n');
  const last = (lines[lines.length - 1] ?? '').replace(/^[\s*_]+/, '').toLowerCase();
  if (lines.length && last.length >= 3 && ('suggestions'.startsWith(last.replace(/[\s*_:：]+$/, '')) || /^suggestions?\b/.test(last))) lines.pop();
  /* and the room line still being written ("In the r…") */
  const tail = (lines[lines.length - 1] ?? '').replace(/^[\s*_]+/, '').toLowerCase();
  if (lines.length && tail.length >= 4 && 'in the room:'.startsWith(tail.replace(/[\s*_]+$/, ''))) lines.pop();
  return lines.join('\n').trim();
}

/** What a stream gave: the final event (or null when it ended without one), and whether any words came first. */
export interface StreamRead { final: unknown; texted: boolean }

/** A colleague's stream of server-sent events read to its end: `{ delta }` grows the round's words, `{ restart }` starts them
 *  again, and the last other event is the answer. `onText` is handed the round's words so far after each. A stream cut off
 *  part way throws or ends with final null — the caller asks again the plain way. */
export async function readColleagueStream(body: ReadableStream<Uint8Array> | null, onText: (soFar: string) => void): Promise<StreamRead> {
  if (!body) return { final: null, texted: false };
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '', soFar = '', final: unknown = null, texted = false;
  const take = (block: string) => {
    const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
    if (!data) return;
    let o: unknown;
    try { o = JSON.parse(data); } catch { return; }
    const e = o && typeof o === 'object' ? o as Record<string, unknown> : {};
    if (typeof e.delta === 'string') { soFar += e.delta; texted = true; onText(soFar); }
    else if (e.restart === true) { soFar = ''; onText(''); }
    else final = o;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let at: number;
    while ((at = buf.indexOf('\n\n')) >= 0) { take(buf.slice(0, at)); buf = buf.slice(at + 2); }
    if (done) break;
  }
  buf += dec.decode();
  if (buf.trim()) take(buf);
  return { final, texted };
}

/** THE GATEWAY ASKED — its answer read, every failure said in words. With `onText`, asked as a stream and the round's words
 *  handed on as they are written; a stream that fails (cut off, unreadable, no final answer) is asked once more whole. */
export async function invokeColleague(body: ColleagueBody, onText?: (soFar: string) => void): Promise<GatewayAnswer> {
  if (!supabase) return { ok: false, off: true, why: NO_CLOUD };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, offline: true, why: NO_SIGNAL };
  const { stream: _s, ...plain } = body; void _s;
  if (onText) {
    const streamed = await askStreamed(plain, onText);
    if (streamed) return streamed;
    /* the stream failed: what it showed is taken back, and the same round asked whole, once */
    onText('');
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, offline: true, why: NO_SIGNAL };
  }
  return askWhole(plain);
}

/** The round asked as a stream — its answer, or null when the stream failed and the plain ask should be tried. A refusal the
 *  gateway gives before the model is asked (JSON, or a non-2xx answer) is an answer, not a failure. */
async function askStreamed(body: ColleagueBody, onText: (soFar: string) => void): Promise<GatewayAnswer | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body: { ...body, stream: true } });
    if (error) return error.name === 'FunctionsHttpError' ? readError(error) : null;
    if (!(data instanceof Response)) return readAnswer(data);
    const { final } = await readColleagueStream(data.body, soFar => onText(growingReply(soFar)));
    return final === null ? null : readAnswer(final);
  } catch {
    return null;
  } finally { budgetMoved(); }
}

/** A non-2xx answer: the gateway's own words when it gave them. */
async function readError(error: Error): Promise<GatewayAnswer> {
  const ctx = (error as { context?: unknown }).context;
  if (ctx instanceof Response) {
    const d = await ctx.clone().json().catch(() => null) as { why?: unknown; off?: unknown } | null;
    const why = typeof d?.why === 'string' && d.why ? d.why : ctx.status === 401 ? 'Sign in to use AI Mode. What you said is kept.' : NOT_NOW;
    return { ok: false, why, ...(d?.off ? { off: true } : {}) };
  }
  return { ok: false, why: NOT_NOW };
}

/** The round asked whole — the plain path, as it always was. */
async function askWhole(body: ColleagueBody): Promise<GatewayAnswer> {
  if (!supabase) return { ok: false, off: true, why: NO_CLOUD };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body });
    if (error) {
      if (error.name === 'FunctionsHttpError') return readError(error);
      if (error.name === 'FunctionsFetchError') return { ok: false, offline: true, why: NO_SIGNAL };
      return { ok: false, why: NOT_NOW };
    }
    return readAnswer(data);
  } catch {
    return typeof navigator !== 'undefined' && !navigator.onLine ? { ok: false, offline: true, why: NO_SIGNAL } : { ok: false, why: NOT_NOW };
  } finally { budgetMoved(); }
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
    suggestions: strs(d.suggestions, 3), unsure: strs(d.unsure, 12), ...(typeof d.model === 'string' ? { model: d.model } : {}), ...(Array.isArray(d.room) ? { room: strs(d.room, 8) } : {}),
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
  /** A write that went in without a card — said yes to before, or inside an agreed investigation (W3): shown as a receipt. */
  auto?: boolean;
}

export interface LoopDeps {
  /** Asks the gateway; with `onText` (given when the screen shows words as they come) the round's words so far are handed on
   *  as they are written — a fake gateway may ignore it. */
  invoke: (body: ColleagueBody, onText?: (soFar: string) => void) => Promise<GatewayAnswer>;
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
  /** The words the colleague has said so far this turn — growing as each round is written, when the gateway streams. */
  onWords?: (text: string) => void;
  /** The clock, for the turn's timing (tests give their own). */
  now?: () => number;
}

/** How long the answer took (kept on the turn, never shown): ms to the first words, ms to the complete answer, the rounds. */
export interface Timing { firstTextMs?: number; completeMs: number; rounds: number }

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
  | { ok: true; reply: string; suggestions: string[]; unsure: string[]; checked: number; model?: string; rounds: number; capped?: boolean; timing: Timing; room?: string[] }
  | { ok: false; why: string; off?: boolean; offline?: boolean; reply?: string; rounds: number; timing: Timing };

const saidOf = (r: CapResult): string => (r.ok ? r.says : r.why);

/** THE CLIENT LOOP — send, run what is asked (writes only on the person's word), send back, until the colleague answers
 *  with no calls or six rounds have gone. */
export async function colleagueLoop(ask: LoopAsk, deps: LoopDeps): Promise<LoopEnd> {
  let pending: ColleagueBody['pending'];
  const words: string[] = [];
  const held: FigureSource[] = [];
  const text = () => words.filter(Boolean).join('\n\n');
  const prefs = ask.preferences?.().trim() ?? '';
  /* every figure in the answer looked for in what Faultline worked out for it, what the person said, the subject and today
     (docs/LUNA-NEXT.md L1) — on the device, where every step's result is, to the rounding each figure is written at */
  const said = [
    ...ask.turns.filter(t => t.role === 'person').map(t => `${t.text} ${t.at}`), ask.today,
    /* what earlier steps worked out (a colleague turn's last line, its steps in brackets) — never Luna's own earlier words */
    ...ask.turns.filter(t => t.role === 'colleague').flatMap(t => t.text.split('\n').filter(l => l.startsWith('['))),
  ];
  const checkedEnd = async (reply: string) => checkFigures(reply, held, [...said, await ask.focus(), prefs]);
  const now = deps.now ?? (() => Date.now());
  const t0 = now();
  let firstAt: number | undefined;
  const timing = (rounds: number): Timing => ({ ...(firstAt !== undefined ? { firstTextMs: firstAt - t0 } : {}), completeMs: now() - t0, rounds });
  /* the round's words as they are written, after what earlier rounds said — not yet checked: the figures are checked once the
     reply is complete */
  const growing = deps.onWords ? (soFar: string) => {
    if (soFar.trim() && firstAt === undefined) firstAt = now();
    deps.onWords?.([...words, soFar.trim()].filter(Boolean).join('\n\n'));
  } : undefined;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const body: ColleagueBody = {
      task: 'colleague', turns: ask.turns, ...(ask.images?.length ? { images: ask.images } : {}),
      focus: await ask.focus(), ...(prefs ? { preferences: prefs } : {}), today: ask.today, ...(ask.conversationId ? { conversationId: ask.conversationId } : {}), ...(pending ? { pending } : {}),
      ...(ask.spoken ? { spoken: true } : {}),
    };
    const a = await (growing ? deps.invoke(body, growing) : deps.invoke(body));
    if (!a.ok) { if (growing) deps.onWords?.(text()); return { ...a, rounds: round, ...(words.length ? { reply: text() } : {}), timing: timing(round) }; }
    if (a.reply.trim()) { if (firstAt === undefined) firstAt = now(); words.push(a.reply.trim()); deps.onWords?.(text()); }
    else if (growing) deps.onWords?.(text());
    if (!a.calls?.length) { const c = await checkedEnd(text()); return { ok: true, reply: text(), suggestions: a.suggestions ?? [], unsure: c.unsure, checked: c.checked, ...(a.model ? { model: a.model } : {}), ...(a.room ? { room: a.room } : {}), rounds: round, timing: timing(round) }; }
    if (round === MAX_ROUNDS) {
      words.push(TOO_MANY);
      const c = await checkedEnd(text());
      return { ok: true, reply: text(), suggestions: ['Carry on'], unsure: c.unsure, checked: c.checked, ...(a.model ? { model: a.model } : {}), rounds: round, capped: true, timing: timing(round) };
    }
    const results: CallResult[] = [];
    for (const call of a.calls) { const r = await doCall(call, deps); results.push(r); if (r.ok) held.push({ says: r.says, data: r.data }); }
    pending = { assistant: a.assistant ?? null, results };
  }
  /* not reached — the last round returns above */
  return { ok: false, why: NOT_NOW, rounds: MAX_ROUNDS, timing: timing(MAX_ROUNDS) };
}

async function doCall(call: CapCall, deps: LoopDeps): Promise<CallResult> {
  const d = deps.describe(call.name);
  if (!d) {
    const step: Step = { call, title: call.name, kind: 'read', status: 'dropped', says: 'The app has no such step — it was not run.', refs: [] };
    await deps.onStep(step);
    return { id: call.id, ok: false, says: step.says };
  }
  if (d.kind !== 'write') {
    const r = await deps.run(call, false);
    await deps.onStep({ call, title: d.title, kind: d.kind, status: r.ok ? 'done' : 'failed', says: saidOf(r), refs: r.ok ? r.refs : [] });
    return { id: call.id, ok: r.ok, says: saidOf(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) };
  }
  /* A WRITE: checked first — one the person may not make never becomes a card */
  const p = await deps.prepare(call);
  if (!p.ok) {
    await deps.onStep({ call, title: p.title, kind: 'write', status: 'refused', says: p.why, refs: [] });
    return { id: call.id, ok: false, says: p.why };
  }
  if (p.authorised) {
    const r = await deps.run(call, true);
    await deps.onStep({ call, title: p.title, kind: 'write', status: r.ok ? 'done' : 'failed', says: saidOf(r), preview: p.preview, input: p.input, refs: r.ok ? r.refs : [], auto: true });
    return { id: call.id, ok: r.ok, says: saidOf(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) };
  }
  const waiting: Step = { call, title: p.title, kind: 'write', status: 'waiting', says: p.preview, preview: p.preview, input: p.input, refs: [] };
  await deps.onStep(waiting);
  const yes = await deps.confirm(waiting);
  if (!yes) {
    await deps.onStep({ ...waiting, status: 'declined', says: 'Not done — the person said not now.' });
    return { id: call.id, ok: false, declined: true, says: 'The person said not now; nothing was written.' };
  }
  const r = await deps.run(call, true);
  await deps.onStep({ ...waiting, status: r.ok ? 'done' : 'failed', says: saidOf(r), refs: r.ok ? r.refs : [] });
  return { id: call.id, ok: r.ok, says: saidOf(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) };
}
