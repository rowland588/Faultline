/* AI MODE — ASKING THE COLLEAGUE, AND DOING WHAT IT ASKS FOR (the shared contract §2).
 *
 * The conversation goes to the `assist` gateway (task `colleague`); the key is the gateway's, this sends the person's
 * session. The answer is words — or words and CALLS, the capabilities the colleague wants run (src/capabilities). The
 * client loop:
 *   a READ or a LOCAL step is run at once (runCall), its sentence shown under the turn;
 *   a WRITE is shown as a card and waits for the person: Do it runs it (runCall with confirmed), Not now sends back
 *   that they declined — nothing writes without the tap; a write the person may not make is refused before any card;
 *   everything it gave is sent back with `pending`, and the colleague answers again — at most SIX rounds in one go (the sixth's
 *   steps are run when another go can follow, and handed on with the go).
 * A JOB IS CARRIED ON BY THE APP, NOT BY THE PERSON (21 November, docs/LUNA-AGENT.md — Rowland: "fully agentic"): when a go of six
 *   runs out with more wanted and it got something done, the loop starts another go itself — what this one said and what each of its
 *   steps found is handed on as the conversation's own record, with a line from the app saying carry on — up to MAX_LEGS goes and
 *   JOB_MS at it. It used to stop and ask the person to say "carry on". A go that got nothing done stops as before; the person can
 *   stop her at any moment (deps.stopped), and what she had done is kept.
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
import type { CapCall, CapRef, CapResult, ColleagueJob } from '../capabilities/types';
import type { GatewayTurn } from './conversation';
import { JOB_BATCH_TITLE, jobBatchPreview, jobWriteMayBatch } from './jobWrites';
import { LOOK_AGAIN, checkFigures, type FigureSource } from './figureCheck';
import { budgetMoved } from '../lib/aiBudget';

/** Rounds in one go — the gateway holds a go to eight (COLLEAGUE_LIMITS.rounds). */
export const MAX_ROUNDS = 6;
/** Goes in one answer: a job carried on by the app itself. */
export const MAX_LEGS = 4;
/** And never longer than this at one answer. */
export const JOB_MS = 10 * 60_000;

export const NO_SIGNAL = 'No signal — Luna answers when the signal is back. What you said is kept.';
export const NOT_NOW = 'Luna could not answer just now — ask again. What you said is kept.';
export const NO_CLOUD = 'AI Mode needs the cloud, and this copy of the app is not connected to it. What you type is kept, and Manual Mode works as ever.';
export const tooMany = (rounds: number): string => `I stopped after ${rounds} steps without finishing — say "carry on" and I will pick it up from here.`;
export const TOO_MANY = tooMany(MAX_ROUNDS);
export const STOPPED = 'Stopped, as you asked. What I had done is kept — say "carry on" and I will pick it up from here.';
/** What Luna is told with the last ask of a stopped answer, and what a step not run because of it says. */
export const STOP_NOTE = 'THE PERSON PRESSED STOP. Ask for no more steps — none will be run. Say in a sentence or two where you got to and what is left.';
export const NOT_RUN = 'Not run — the person pressed Stop.';
/** What the app says to Luna when it carries her on into another go — never shown to the person, never counted as their words. */
export const CARRY_ON = '(From the app, not the person: the steps for one go ran out while you were still working. Carry on from where you are — your plan and what each step found are above and in the threads. Do not start again and do not repeat a step that ran; the steps you asked for last did not run, so ask for them again if they are still wanted. When the work is finished, give the person the result.)';

/** THE SECOND LOOK (21 November, the audit of the loop — "she never checks her answer: the first reply without calls is final").
 *  The app's own check knew when her answer held a figure with nothing behind it, and when a job she had planned still had steps
 *  open — and told only the person (Check this; "Stopped with 2 of 4 done"). Now it tells HER, once: her answer is sent back with
 *  what the check found, as a line from the app, and what she then says takes the place of the first answer. One look an answer,
 *  never in the voice conversation (her words are already said aloud), never when she was stopped or out of goes. */
export const lookAgain = (o: { unsure: readonly string[]; open?: string }): string => [
  '(From the app\'s own check, not the person. Your answer above is not final yet — what you say next takes its place.)',
  o.unsure.length ? `These figures in it are found nowhere in what the app worked out, what the person said or what you were told: ${o.unsure.join(', ')}. Every figure you write must be the app's. For each one: get it from the app now (a count or a sum through a question of the data, arithmetic through work_out), or quote it exactly as it stands where you were shown it, or take it out and say plainly what cannot be said from what is recorded.` : '',
  o.open ? `Your plan still has steps open: ${o.open}. Do them now — or tick each as skipped or blocked with why (job_step) — before you give the result. If the job turns on one thing only the person can tell you, ask that one question instead.` : '',
  'Then give the WHOLE answer again, as you want the person to read it: the same length and manner, nothing about this check, no apology.',
].filter(Boolean).join(' ');
/** What the check found, in the app's words — with none of the figures in it (they are not the app's working). */
const lookFound = (o: { unsure: readonly string[]; open?: string }): string => [
  o.unsure.length ? `the app could not trace ${o.unsure.length === 1 ? 'a figure' : 'some figures'} in her first answer and sent it back to be worked out or taken out` : '',
  o.open ? 'her plan still had steps open, and she was sent back to finish or account for them' : '',
].filter(Boolean).join('; ').replace(/^./, c => c.toUpperCase());
/** What the turn's record says of it — the app's note. */
export const lookedAgainSaid = (o: { unsure: readonly string[]; open?: string }): string => `${lookFound(o)}. This is the answer she gave after that.`;
/** …and what it says when the look could NOT be finished — she was stopped, ran out of steps, or could not be reached while she was
 *  at it. Her first answer was a whole answer and it STANDS, marked as it would have been with no look at all: nothing she finished
 *  is ever thrown away for a check that did not come back (the review of 22 November). */
export const lookNotFinishedSaid = (o: { unsure: readonly string[]; open?: string }): string =>
  `${lookFound(o)}. The check was not finished, so this is her first answer${o.unsure.length ? ' — the figures marked are still to check' : ''}.`;

/** A go, as it is handed on to the next: what she said in it, then what each of its steps found — the newest kept whole when there
 *  is not room for all (the gateway takes 12,000 characters a turn). */
export function carriedText(words: readonly string[], steps: readonly string[], max = 11_000): string {
  const w = words.filter(Boolean).join('\n\n').slice(0, 3000);
  const kept: string[] = [];
  let n = w.length + 120;
  for (const st of [...steps].reverse()) { if (n + st.length + 1 > max) break; kept.unshift(st); n += st.length + 1; }
  const dropped = steps.length - kept.length;
  return `${w}\n${dropped ? `[${dropped} earlier step${dropped === 1 ? '' : 's'} of that go not repeated here — what they made is kept by its id] ` : ''}${kept.join(' ')}`.trim();
}

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
/** G5 — writes gathered for the job's one card. */
export interface JobWriteBatch { callIds: string[]; items: { callId: string; title: string; preview: string; input?: Record<string, unknown> }[] }

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
  /** Several writes on one card while a job is open (G5). */
  batch?: JobWriteBatch;
}

/** Name on the batch step's call — not a real capability. */
export const JOB_WRITES_BATCH = 'job_writes_batch';

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
  /** The person pressed Stop: looked at before every round and every step — she stops there, and what she had done is kept. */
  stopped?: () => boolean;
  /** The job in hand, if any — for gathering its writes on one card (G5); read again after plan_job in the same round. */
  jobInHand?: () => Promise<ColleagueJob | null | undefined> | ColleagueJob | null | undefined;
  /** After the person said yes on the job's one card — kept on the job. */
  approveJobWrites?: () => Promise<void>;
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
  /** The customer in hand, for the usage record only. */
  client?: string;
  /** What the app's own code said in this conversation (conversation workedInCode) — its figures are the app's working, for the figure
   *  check only; never sent. */
  worked?: readonly string[];
  /** The job in hand's steps still open, in words — or nothing (colleague/job stepsOpenSaid). Read when she gives an answer with no
   *  more steps asked for: an answer that leaves her own plan open is sent back to her once (the second look). It is handed the
   *  names of the steps that ran in THIS answer, so a plan she did not touch in it — one stopped an hour ago — is not hers to finish
   *  now. */
  unfinished?: (ran: ReadonlySet<string>) => Promise<string | undefined> | string | undefined;
  /** What the app worked out earlier in this conversation — its kept results (capabilities/data outputs) and what each step that ran
   *  said (turnRules earlierResults) — for the figure check only: a figure Luna quotes from an earlier answer's working is the app's
   *  (20–21 November). Never sent. */
  earlier?: readonly FigureSource[];
}

export type LoopEnd =
  | { ok: true; reply: string; suggestions: string[]; unsure: string[]; checked: number; model?: string; rounds: number; capped?: boolean; /** The person stopped her. */ stopped?: boolean; /** Goes it took (a job carried on by the app). */ legs?: number; /** Her answer was sent back to her once by the app's check, and this is what she said after it. */ looked?: boolean; timing: Timing; room?: string[] }
  | { ok: false; why: string; off?: boolean; offline?: boolean; reply?: string; rounds: number; timing: Timing };

const saidOf = (r: CapResult): string => (r.ok ? r.says : r.why);

/** THE CLIENT LOOP — send, run what is asked (writes only on the person's word), send back, until the colleague answers
 *  with no calls or six rounds have gone. */
export async function colleagueLoop(ask: LoopAsk, deps: LoopDeps): Promise<LoopEnd> {
  let pending: ColleagueBody['pending'];
  const words: string[] = [];
  const held: FigureSource[] = [...(ask.earlier ?? [])];
  const text = () => words.filter(Boolean).join('\n\n');
  const prefs = ask.preferences?.().trim() ?? '';
  /* every figure in the answer looked for in what Faultline worked out for it, what the person said, the subject and today
     (docs/LUNA-NEXT.md L1) — on the device, where every step's result is, to the rounding each figure is written at */
  const said = [
    ...ask.turns.filter(t => t.role === 'person').map(t => `${t.text} ${t.at}`), ask.today,
    /* what earlier steps worked out reaches the check through `earlier` (turnRules earlierResults — every step that ran, read from the
       turns themselves); never Luna's own earlier words. It used to be read here from the first bracketed line of a turn's text: a
       step's sentence that ran over a line lost every step after it, and one that failed or rested on nothing lent its figures (21 Nov) */
    /* what the app's own code said — a workbook's first look — is the app's working too */
    ...(ask.worked ?? []),
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
  let turns = ask.turns;
  let total = 0;
  let model: string | undefined;
  /* THE FIRST ANSWER, KEPT while a second look is under way (22 November). The look takes her answer off the screen to put a better
     one in its place — so until that better one has come back whole, the first is held here, and every other way the look can end
     (the person stops her, the steps or the time run out, the gateway refuses or cannot be reached) gives the FIRST answer back,
     checked and marked as it would have been, with the turn's record saying the check was not finished. */
  const first: { reply: string; suggestions: string[]; room?: string[]; id: string; found: { unsure: string[]; open?: string } }[] = [];
  const kept = () => first[0];
  const stands = async (o: { capped?: true; stopped?: true }, legs: number, why?: string): Promise<LoopEnd> => {
    const k = first[0];
    /* what her steps in the look worked out is the app's working too: a figure she got that far with is no longer marked */
    const c = await checkedEnd(k.reply);
    /* the same step, by its id: the record that said "this is the answer she gave after that" is put right */
    await deps.onStep({ call: { id: k.id, name: LOOK_AGAIN, input: {} }, title: 'Checked her answer', kind: 'local', status: 'failed', says: lookNotFinishedSaid(k.found), refs: [] });
    const reply = why ? `${k.reply}\n\n${why}` : k.reply;
    words.splice(0, words.length, reply);
    deps.onWords?.(reply);
    return { ok: true, reply, suggestions: why ? ['Carry on', ...k.suggestions.filter(x => !/^carry on$/i.test(x))].slice(0, 3) : k.suggestions, unsure: c.unsure, checked: c.checked, ...(model ? { model } : {}), ...(k.room ? { room: k.room } : {}), rounds: total, ...o, ...(legs > 1 ? { legs } : {}), timing: timing(total) };
  };
  const halted = async (why: string, o: { capped?: true; stopped?: true }, legs: number): Promise<LoopEnd> => {
    if (kept()) return stands(o, legs, why);
    words.push(why);
    deps.onWords?.(text());
    const c = await checkedEnd(text());
    return { ok: true, reply: text(), suggestions: ['Carry on'], unsure: c.unsure, checked: c.checked, ...(model ? { model } : {}), rounds: total, ...o, ...(legs > 1 ? { legs } : {}), timing: timing(total) };
  };
  let looked = false;
  /* the steps that ran in this answer, by name */
  const ran = new Set<string>();
  goes: for (let leg = 1; ; leg++) {
    /* this go's own record, for the next go if the app carries her on */
    const legWords: string[] = [], legSteps: string[] = [];
    let legOk = 0;
    /* G5 — job writes gathered across gateway rounds until the person says yes once */
    const jobBatch: ReadyWrite[] = [];
    /* a second look is a go of its own in the loop's counting, never one of the job's */
    const jobLegs = () => leg - (looked ? 1 : 0);
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      /* STOP. With nothing run that the gateway has not heard of, she stops here. With steps run since the last ask, one more ask
         goes — it carries what they gave (so the record of what was done stays whole) and tells her to stop: she says where she
         got to, and whatever she asks for is not run. */
      const stopping = !!deps.stopped?.();
      if (stopping && !pending) { abandonJobWriteBatch(jobBatch, []); return halted(STOPPED, { stopped: true }, jobLegs()); }
      total += 1;
      const focus = await ask.focus();
      const body: ColleagueBody = {
        task: 'colleague', turns, ...(ask.images?.length ? { images: ask.images } : {}),
        focus: stopping ? `${focus}\n${STOP_NOTE}` : focus, ...(prefs ? { preferences: prefs } : {}), today: ask.today, ...(ask.conversationId ? { conversationId: ask.conversationId } : {}), ...(pending ? { pending } : {}),
        ...(ask.spoken ? { spoken: true } : {}), ...(ask.client ? { client: ask.client } : {}),
      };
      const a = await (growing ? deps.invoke(body, growing) : deps.invoke(body));
      if (!a.ok) {
        /* refused or unreachable DURING a second look: the answer she had already given stands */
        if (kept()) return stands({}, jobLegs());
        if (growing) deps.onWords?.(text());
        return { ...a, rounds: total, ...(words.length ? { reply: text() } : {}), timing: timing(total) };
      }
      if (a.model) model = a.model;
      if (a.reply.trim()) { if (firstAt === undefined) firstAt = now(); words.push(a.reply.trim()); legWords.push(a.reply.trim()); deps.onWords?.(text()); }
      else if (growing) deps.onWords?.(text());
      if (stopping || (a.calls?.length && deps.stopped?.())) { abandonJobWriteBatch(jobBatch, []); return halted(STOPPED, { stopped: true }, jobLegs()); }
      if (!a.calls?.length) {
        /* sent back and said nothing: the answer she had already given stands */
        if (kept() && !text().trim()) return stands({}, jobLegs());
        const tail: CallResult[] = [];
        await flushJobWriteBatch(jobBatch, deps, tail);
        for (const r of tail) {
          if (r.ok) { held.push({ says: r.says, data: r.data }); legOk += 1; }
        }
        const c = await checkedEnd(text());
        /* THE SECOND LOOK: what the check found goes back to her, once — and what she says next is the answer */
        /* an answer that ends by asking the person something is waiting on them, not unfinished */
        const asksThem = /\?\s*$/.test(text().trim());
        const open = looked || ask.spoken || asksThem ? undefined : (await ask.unfinished?.(ran)) || undefined;
        if (!looked && !ask.spoken && (c.unsure.length || open) && now() - t0 < JOB_MS && !deps.stopped?.()) {
          looked = true;
          const found = { unsure: c.unsure, ...(open ? { open } : {}) };
          const id = `look-${total}`;
          first.push({ reply: text(), suggestions: a.suggestions ?? [], ...(a.room ? { room: a.room } : {}), id, found });
          await deps.onStep({ call: { id, name: LOOK_AGAIN, input: {} }, title: 'Checked her answer', kind: 'local', status: 'done', says: lookedAgainSaid(found), refs: [] });
          const at = new Date(now()).toISOString();
          turns = [...turns, { role: 'colleague', text: carriedText(legWords, legSteps), at }, { role: 'person', text: lookAgain(found), at }];
          pending = undefined;
          words.splice(0, words.length);
          deps.onWords?.('');
          continue goes;
        }
        return { ok: true, reply: text(), suggestions: a.suggestions ?? [], unsure: c.unsure, checked: c.checked, ...(model ? { model } : {}), ...(a.room ? { room: a.room } : {}), rounds: total, ...(jobLegs() > 1 ? { legs: jobLegs() } : {}), ...(looked ? { looked: true } : {}), timing: timing(total) };
      }
      /* THE LAST ROUND OF A GO (21 November, the audit — "one request in six is discarded"): what it asks for used to be thrown away
         and asked for again by the next go. Now, when another go can follow — goes left, time left, not stopped — its steps ARE run,
         and what they found is handed on with the rest of this go. Only when no go can follow are they left unrun: nothing she
         asked for is done that she will not be told of. */
      if (round === MAX_ROUNDS && (jobLegs() >= MAX_LEGS || now() - t0 >= JOB_MS || deps.stopped?.())) break;
      const results: CallResult[] = await runRoundCalls(a.calls, deps, jobBatch);
      for (const r of results) {
        if (r.ok) { held.push({ says: r.says, data: r.data }); legOk += 1; }
        const call = a.calls.find(c => c.id === r.id);
        if (call) { ran.add(call.name); legSteps.push(`[${deps.describe(call.name)?.title ?? call.name}: ${r.ok ? '' : r.declined ? 'declined — ' : 'failed — '}${r.says.slice(0, 900)}]`); }
      }
      pending = { assistant: a.assistant ?? null, results };
    }
    /* THE GO RAN OUT WITH MORE WANTED. Carried on by the app when it got something done, there are goes left and time; else she
       says so and stops, as she always did. */
    if (deps.stopped?.()) { abandonJobWriteBatch(jobBatch, []); return halted(STOPPED, { stopped: true }, jobLegs()); }
    const legTail: CallResult[] = [];
    await flushJobWriteBatch(jobBatch, deps, legTail);
    for (const r of legTail) { if (r.ok) legOk += 1; }
    if (jobLegs() >= MAX_LEGS || legOk === 0 || now() - t0 >= JOB_MS) return halted(tooMany(total), { capped: true }, jobLegs());
    const at = new Date(now()).toISOString();
    turns = [...turns, { role: 'colleague', text: carriedText(legWords, legSteps), at }, { role: 'person', text: CARRY_ON, at }];
    pending = undefined;
  }
}

type ReadyWrite = { call: CapCall; title: string; preview: string; input: Record<string, unknown> };

const readJob = async (deps: LoopDeps) => Promise.resolve(deps.jobInHand?.()).then(j => j ?? undefined);

const abandonJobWriteBatch = (batch: ReadyWrite[], results: CallResult[]): void => {
  if (!batch.length) return;
  for (const w of batch) results.push({ id: w.call.id, ok: false, declined: true, says: 'The person said not now; nothing was written.' });
  batch.length = 0;
};

export async function flushJobWriteBatch(batch: ReadyWrite[], deps: LoopDeps, results: CallResult[]): Promise<void> {
  if (!batch.length) return;
  const job = await readJob(deps);
  if (!job) {
    for (const w of batch) results.push(await doCall(w.call, deps));
    batch.length = 0;
    return;
  }
  const items = batch.map(x => ({ callId: x.call.id, title: x.title, preview: x.preview, input: x.input }));
  const preview = jobBatchPreview(job.goal, items);
  const batchMeta: JobWriteBatch = { callIds: items.map(x => x.callId), items };
  const leader = batch[0].call;
  const waiting: Step = {
    call: { id: leader.id, name: JOB_WRITES_BATCH, input: {} }, title: JOB_BATCH_TITLE, kind: 'write', status: 'waiting',
    says: preview, preview, batch: batchMeta, refs: [],
  };
  await deps.onStep(waiting);
  const yes = await deps.confirm(waiting);
  if (!yes) {
    for (const w of batch) {
      await deps.onStep({ call: w.call, title: w.title, kind: 'write', status: 'declined', says: 'Not done — the person said not now.', preview: w.preview, input: w.input, batch: batchMeta, refs: [] });
      results.push({ id: w.call.id, ok: false, declined: true, says: 'The person said not now; nothing was written.' });
    }
    batch.length = 0;
    return;
  }
  if (deps.approveJobWrites) await deps.approveJobWrites();
  for (const w of batch) {
    const r = await deps.run(w.call, true);
    await deps.onStep({ call: w.call, title: w.title, kind: 'write', status: r.ok ? 'done' : 'failed', says: saidOf(r), preview: w.preview, input: w.input, batch: batchMeta, refs: r.ok ? r.refs : [] });
    results.push({ id: w.call.id, ok: r.ok, says: saidOf(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) });
  }
  batch.length = 0;
}

async function runRoundCalls(calls: CapCall[], deps: LoopDeps, jobBatch: ReadyWrite[]): Promise<CallResult[]> {
  const results: CallResult[] = [];
  const flushBatch = () => flushJobWriteBatch(jobBatch, deps, results);

  for (const call of calls) {
    if (deps.stopped?.()) {
      if (jobBatch.length) {
        for (const w of jobBatch) results.push({ id: w.call.id, ok: false, declined: true, says: 'The person said not now; nothing was written.' });
        jobBatch.length = 0;
      }
      results.push({ id: call.id, ok: false, says: NOT_RUN });
      continue;
    }
    const job = await readJob(deps);
    const d = deps.describe(call.name);
    if (d?.kind === 'write' && jobWriteMayBatch(job, call.name)) {
      const p = await deps.prepare(call);
      if (!p.ok) {
        await flushBatch();
        await deps.onStep({ call, title: p.title, kind: 'write', status: 'refused', says: p.why, refs: [] });
        results.push({ id: call.id, ok: false, says: p.why });
        continue;
      }
      if (p.authorised) {
        await flushBatch();
        const r = await deps.run(call, true);
        await deps.onStep({ call, title: p.title, kind: 'write', status: r.ok ? 'done' : 'failed', says: saidOf(r), preview: p.preview, input: p.input, refs: r.ok ? r.refs : [], auto: true });
        results.push({ id: call.id, ok: r.ok, says: saidOf(r), ...(r.ok && r.data !== undefined ? { data: r.data } : {}) });
        continue;
      }
      jobBatch.push({ call, title: p.title, preview: p.preview, input: p.input ?? {} });
      continue;
    }
    await flushBatch();
    results.push(await doCall(call, deps));
  }
  return results;
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
