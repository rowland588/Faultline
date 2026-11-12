/* THE VOICE CONVERSATION'S PURE PARTS (9 November; docs/VOICE.md). Rowland: "a natural, immersive, two-way voice experience …
 * The recognition layer must distinguish between the user pausing and the user completing a turn … Remove Markdown formatting,
 * JSON, internal tool information, technical identifiers … use appropriate sentence or paragraph segmentation so speech can begin
 * without waiting for the entire response."
 *
 *   forSpeech        a reply as it is said — no markdown, no ids, no links, no JSON, no "Suggestions:" line, no "Check this" tags
 *   speechChunks     the words in sentence-sized pieces, so the first can be said while the rest is still being written
 *   nextChunks       the finished sentences of a reply still being written that have not been said yet
 *   turnEnd          whether a pause is the end of what the person is saying or a pause to think
 *   VOICE_STATES and voiceStep — the conversation's states, moved only by real events (recognition, the gateway, playback)
 *
 * Pure: no timers, no browser. The screen (screens/AiModeScreen with colleague/VoiceMode) feeds them what happened. */

import { MAX_PIECE, phrases, splitLong } from './delivery';

/* ================================================================ what is said out loud */

const ID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** A reply as it is said: the words that mean something to a person, nothing of how the app works inside. */
export function forSpeech(text: string): string {
  return text
    .replace(/^\s*Suggestions:.*$/gim, '')                       /* the follow-ups line is for the screen */
    .replace(/```[\s\S]*?```/g, '')                               /* code and JSON blocks */
    .replace(/\{[^{}]*"[a-zA-Z_]+"\s*:[^{}]*\}/g, '')             /* a stray JSON object */
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                      /* a link's words, not its address */
    .replace(/\[(?:thread|draft|record|line|project|problem|study)\b[^\]]*\]/gi, '')   /* [thread …] and the like */
    .replace(ID, '')                                              /* ids */
    .replace(/https?:\/\/\S*[^\s.,;:!?)]/g, '')                     /* addresses, their full stop kept */
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/gm, (_, item: string) => (/[.!?:;]$/.test(item.trim()) ? item : `${item}.`))   /* a list item a sentence */
    .replace(/[`_|]/g, '')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.!?])\s*\./g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}


/** The words in phrases (colleague/delivery phrases, 11 November): a sentence each — a fresh utterance gets the engine's own sentence
 *  intonation and the breath after it — very short sentences joined to the next, a long one broken at a clause so no utterance runs
 *  on (Chrome's network voices fall silent after about fifteen seconds of one). The first is a sentence, so it is said at once. */
export function speechChunks(text: string, max = MAX_PIECE): string[] {
  const words = forSpeech(text);
  if (!words) return [];
  return phrases(words).flatMap(p => (p.length > max ? splitLong(p, max) : [p]));
}

/** A reply still being written: the finished sentences not yet handed to the voice (`said` characters of forSpeech so far),
 *  and how far that now reaches. The last sentence waits until it is finished — or until the reply is done. */
export function nextChunks(soFar: string, said: number, done: boolean): { chunks: string[]; upTo: number } {
  const words = forSpeech(soFar);
  const rest = words.slice(said);
  if (!rest.trim()) return { chunks: [], upTo: said };
  if (done) return { chunks: speechChunks(rest), upTo: words.length };
  /* only what ends at a sentence end is ready */
  const m = [...rest.matchAll(/[.!?…](?=\s)/g)].pop();
  if (!m || m.index === undefined) return { chunks: [], upTo: said };
  const ready = rest.slice(0, m.index + 1);
  return { chunks: speechChunks(ready), upTo: said + ready.length };
}

/* ================================================================ a pause, or the end of a turn */

/** How long a silence is waited before it is the end of what was said — the person's choice. */
export type PauseLength = 'short' | 'normal' | 'long';
export const PAUSE_MS: Record<PauseLength, number> = { short: 1100, normal: 1800, long: 3000 };
/** Words a sentence does not end on — a pause after one of these is a pause to think, so it is waited longer. */
const CARRY_ON = /\b(and|but|or|so|because|then|the|a|an|to|of|with|on|in|at|for|from|that|which|um+|uh+|er+|erm+|like|if|when|while|is|are|was|were|it's|i'm|we're|let's|maybe)$/i;
/** Short words that are a whole answer on their own — no need to wait. */
const WHOLE = /^(yes|no|yeah|yep|nope|stop|cancel|okay|ok|thanks|thank you|yes do it|do it|go ahead|not now|carry on|go on|right)$/i;

/** Whether the person has finished: nothing still forming, and quiet for long enough for what they said — longer after a word a
 *  sentence does not end on ("so the filler and…"), shorter after a whole short answer ("yes", "stop"). `quietMs` is the time since
 *  the recogniser last said anything. */
export function turnEnd(heard: { final: string; interim: string }, quietMs: number, pause: PauseLength = 'normal'): 'wait' | 'end' {
  if (heard.interim.trim()) return quietMs >= PAUSE_MS[pause] * 2.5 ? 'end' : 'wait';   /* a phone that never finalises: waited out */
  const said = heard.final.trim().replace(/[.,!?…]+$/, '');
  if (!said) return 'wait';
  const base = PAUSE_MS[pause];
  const need = WHOLE.test(said) ? Math.min(base, 900) : CARRY_ON.test(said) ? base + 1500 : base;
  return quietMs >= need ? 'end' : 'wait';
}

/** The ms still to wait before `turnEnd` could say end — when the screen should look again. */
export function turnWait(heard: { final: string; interim: string }, quietMs: number, pause: PauseLength = 'normal'): number {
  for (let t = 100; t <= 12000; t += 100) if (turnEnd(heard, quietMs + t, pause) === 'end') return t;
  return 12000;
}

/** Spoken words that stop Faultline speaking or end the conversation, whole phrases only. */
export function voiceCommand(words: string): 'stop' | 'end' | null {
  const n = words.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(stop|stop talking|hold on|wait|quiet|shush|be quiet)$/.test(n)) return 'stop';
  if (/^(end (the )?(conversation|voice)|goodbye faultline|that's all|thats all|stop listening)$/.test(n)) return 'end';
  return null;
}

/** Whether words heard while Faultline is speaking are its own voice coming back through the microphone — most of their words in
 *  what it is saying — and not the person. */
export function isEcho(heard: string, speaking: string): boolean {
  const h = heard.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  if (!h.length) return true;
  const s = new Set(speaking.toLowerCase().match(/[a-z0-9']+/g) ?? []);
  const inIt = h.filter(w => s.has(w)).length;
  return h.length >= 2 ? inIt / h.length >= 0.7 : s.has(h[0] ?? "");
}

/** Whether words heard just AFTER the voice stopped are its own last words arriving late from the recogniser, and not the
 *  person's answer: a run of three or more of its words in its own order, or its very last one or two words — never a short
 *  answer that merely shares a word with the question ("the wrapper" after "the wrapper or the filler?"). */
export function isEchoTail(heard: string, said: string): boolean {
  const h = heard.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  if (!h.length) return true;
  const s = said.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  if (!s.length) return false;
  if (h.length <= 2) return h.join(' ') === s.slice(-h.length).join(' ');
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    let k = 0;
    while (k < h.length && i + k < s.length && s[i + k] === h[k]) k++;
    best = Math.max(best, k);
    for (let j = 1; j < h.length && best < h.length; j++) {
      let m = 0;
      while (j + m < h.length && i + m < s.length && s[i + m] === h[j + m]) m++;
      best = Math.max(best, m);
    }
  }
  return best >= 3 && best / h.length >= 0.6;
}

/* ================================================================ the conversation's states */

export const VOICE_STATES = ['idle', 'initialising', 'listening', 'transcribing', 'processing', 'preparing', 'speaking', 'interrupted', 'recovering', 'error', 'ended'] as const;
export type VoiceState = typeof VOICE_STATES[number];

/** What happened — each from a real source: the person, the recogniser, the gateway or the voice. */
export type VoiceEvent =
  | { type: 'open' } | { type: 'ready' } | { type: 'heard'; words: string } | { type: 'turn-end' } | { type: 'sent' }
  | { type: 'reply-words' } | { type: 'speak-start' } | { type: 'speak-end' } | { type: 'interrupt' } | { type: 'mute' } | { type: 'unmute' }
  | { type: 'trouble'; fatal: boolean } | { type: 'recovered' } | { type: 'answered-silently' } | { type: 'close' };

/** The next state. Unknown moves keep the state — a late event from a step already left changes nothing. */
export function voiceStep(s: VoiceState, e: VoiceEvent): VoiceState {
  if (e.type === 'close') return 'ended';
  if (s === 'ended') return e.type === 'open' ? 'initialising' : s;
  switch (e.type) {
    case 'open': return 'initialising';
    case 'ready': return s === 'initialising' || s === 'recovering' || s === 'interrupted' || s === 'idle' || s === 'speaking' || s === 'error' ? 'listening' : s;
    case 'heard': return s === 'listening' || s === 'interrupted' ? (e.words.trim() ? 'transcribing' : s) : s;
    case 'turn-end': return s === 'transcribing' ? 'processing' : s;
    case 'sent': return 'processing';
    case 'reply-words': return s === 'processing' ? 'preparing' : s;
    case 'speak-start': return s === 'processing' || s === 'preparing' ? 'speaking' : s;
    case 'speak-end': return s === 'speaking' || s === 'preparing' ? 'listening' : s;
    case 'answered-silently': return s === 'processing' || s === 'preparing' ? 'listening' : s;
    case 'interrupt': return s === 'speaking' || s === 'preparing' ? 'interrupted' : s;
    case 'mute': return 'idle';
    case 'unmute': return 'initialising';
    case 'trouble': return e.fatal ? 'error' : 'recovering';
    case 'recovered': return s === 'recovering' || s === 'error' ? 'listening' : s;
  }
  return s;
}

/** Each state in words — what the screen says under the orb. */
export const VOICE_SAID: Record<VoiceState, string> = {
  idle: 'Microphone off — tap to talk', initialising: 'Getting ready…', listening: 'Listening', transcribing: 'Listening — go on',
  processing: 'Luna is thinking…', preparing: 'Getting the answer ready', speaking: 'Speaking — tap to interrupt', interrupted: 'Stopped — go ahead',
  recovering: 'Reconnecting…', error: 'Stopped', ended: 'Conversation ended',
};
