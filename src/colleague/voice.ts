/* AI MODE, OUT LOUD — the colleague's replies spoken by the phone's own voice, and a conversation held hands-free.
 *
 * SPEAK REPLIES: each reply read out with the browser's speech synthesis — a British English voice where the device has
 * one — its markdown taken out first; stopped the moment the person starts talking or taps the microphone. Nothing goes
 * to a server: the voice is the device's.
 * CONVERSATION: after a reply is spoken, the microphone opens again (tools/talk/hearing, as Line Talk listens) so the
 * person can answer without touching the phone — while the screen is on. A phone stops listening when it locks or the
 * app goes out of sight, and the screen says so; the words said so far stay in the box. */

/** The words as they are spoken: no **bold**, no list marks, no links' brackets. */
export function speakable(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#`_]/g, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

interface Synth { speak(u: SpeechSynthesisUtterance): void; cancel(): void; getVoices(): SpeechSynthesisVoice[]; speaking: boolean }
const synth = (): Synth | undefined => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis as unknown as Synth : undefined);

/** Whether this device can speak at all. */
export const canSpeak = (): boolean => !!synth() && typeof SpeechSynthesisUtterance !== 'undefined';

/* LUNA'S VOICE IS A WOMAN'S (10 November — Rowland, on a laptop: "The voice is male … I changed it in my laptop settings to female,
   but it hasn't changed in the app"): a browser keeps its own list of voices, and the first British one is often a man's (Windows'
   "Microsoft George"), so a female voice is looked for by the names the systems give theirs. A voice picked in her voice settings
   always wins (voicePrefs). */
const FEMALE = /female|woman|hazel|susan|libby|sonia|maisie|mia|abbi|bella|hollie|olivia|kate|serena|stephanie|martha|fiona|moira|tessa|karen|samantha|victoria|allison|ava|susan|zira|aria|jenny|michelle|emma|ana\b|natasha|clara|emily|amy|catherine|google uk english female/i;
const MALE = /\bmale\b|george|ryan|thomas|alfie|elliot|ethan|noah|oliver|daniel|arthur|guy|david|mark|james|fred|alex\b|aaron|gordon|google uk english male/i;
const isFemale = (name: string) => FEMALE.test(name) && !/\bmale\b/i.test(name.replace(/female/ig, ''));

/** The voice: a British woman's first, then any English woman's, then the device's default if it is English and not a man's, then
 *  British English, then any English. */
export function pickVoice(voices: readonly Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'default'>[]): number {
  const gb = (v: { lang: string }) => /^en[-_]GB/i.test(v.lang);
  const en = (v: { lang: string }) => /^en/i.test(v.lang);
  const tries: ((v: Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'default'>) => boolean)[] = [
    v => gb(v) && isFemale(v.name),
    v => en(v) && isFemale(v.name),
    v => en(v) && v.default && !MALE.test(v.name),
    v => gb(v) && !MALE.test(v.name),
    gb,
    en,
  ];
  for (const t of tries) { const i = voices.findIndex(t); if (i >= 0) return i; }
  return -1;
}

let speakingNow = false;
/* WHAT SHE SAID LATELY (10 November — Rowland: "When the AI speaks it hears its own voice, this then causes issues"): every piece
   said in the last minute, and when the voice last stopped. A phone hands its recogniser's words over late — a sentence said a
   moment ago still arriving while the next is spoken, or after the voice has stopped — so the words heard are checked against
   all of it, while speaking and for a moment after. */
let said: { at: number; text: string }[] = [];
let stoppedAt = 0;
/** How long after the voice stops its own words can still come back through the recogniser. */
export const ECHO_TAIL_MS = 2500;
/** Everything said in the last minute, as one text (speakable words). */
export const saidLately = (now = Date.now()): string => said.filter(x => now - x.at < 60_000).map(x => x.text).join(' ');
/** Whether the voice is speaking now, or stopped so lately that its own words may still be heard back. */
export const inEchoWindow = (now = Date.now()): boolean => speakingNow || (stoppedAt > 0 && now - stoppedAt < ECHO_TAIL_MS);
/* the utterance being said, held here: a browser that loses its last reference to one (Chrome) never says it ended */
let current: SpeechSynthesisUtterance | null = null;
let cutShort: (() => void) | null = null;
const listeners = new Set<(on: boolean) => void>();
const tell = (on: boolean) => { if (!on) stoppedAt = Date.now(); for (const f of listeners) f(on); };

/** Told when speaking starts and stops — the screen's "Speaking…". */
export function onSpeaking(f: (on: boolean) => void): () => void { listeners.add(f); return () => { listeners.delete(f); }; }

/* each word as it is said (the voice's boundary events) — the voice screen's sound moves with the playback */
const pulses = new Set<() => void>();
/** Told at each word Faultline says, where the device's voice reports words. */
export function onPulse(f: () => void): () => void { pulses.add(f); return () => { pulses.delete(f); }; }

/** The person's voice settings on this device (colleague/voicePrefs): which voice and how fast. */
const VOICE_PREFS_KEY = 'faultline.voice';
function chosen(): { voiceURI?: string; rate?: number } {
  try { const v = JSON.parse(localStorage.getItem(VOICE_PREFS_KEY) ?? '{}') as { voiceURI?: string; rate?: number }; return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

/** Say it; `onDone(finished)` when it has been said to the end (true), or was cut short or could not be said (false).
 *  Cancels anything still being said — and anything waiting to be said. */
export function speak(text: string, onDone?: (finished: boolean) => void): void {
  stopSpeaking();
  sayOne(text, onDone);
}

/** One piece said, cutting only the piece being said (never the queue) — the queue's own step. */
function sayOne(text: string, onDone?: (finished: boolean) => void): void {
  const s = synth();
  const words = speakable(text);
  if (!s || !words || typeof SpeechSynthesisUtterance === 'undefined') { onDone?.(false); return; }
  cancelCurrent();
  const u = new SpeechSynthesisUtterance(words.slice(0, 4000));
  const voices = s.getVoices();
  const pref = chosen();
  const mine = pref.voiceURI ? voices.findIndex(v => v.voiceURI === pref.voiceURI) : -1;
  const i = mine >= 0 ? mine : pickVoice(voices);
  if (i >= 0) { u.voice = voices[i]; u.lang = voices[i].lang; } else u.lang = 'en-GB';
  u.rate = typeof pref.rate === 'number' && pref.rate >= 0.6 && pref.rate <= 1.6 ? pref.rate : 1.02;
  u.onboundary = () => { for (const f of pulses) f(); };
  let done = false;
  const end = (finished: boolean) => {
    if (done) return;
    done = true;
    if (current === u) { current = null; cutShort = null; speakingNow = false; tell(false); }
    onDone?.(finished);
  };
  said = [...said.filter(x => Date.now() - x.at < 60_000), { at: Date.now(), text: words }];
  current = u;
  cutShort = () => end(false);
  speakingNow = true;
  tell(true);
  u.onend = () => end(current === u);
  u.onerror = () => end(false);
  s.speak(u);
}

/* ── A QUEUE OF PIECES (9 November, docs/VOICE.md): a reply said sentence by sentence as it is written, so the first is heard
   while the rest is still coming; stopped as one. */
let queue: string[] = [];
let queueOpen = false;
let queueEnd: ((finished: boolean) => void) | null = null;
const finishQueue = (finished: boolean) => { const f = queueEnd; queueEnd = null; queueOpen = false; queue = []; f?.(finished); };
function nextPiece(): void {
  const c = queue.shift();
  if (c === undefined) { if (!queueOpen) finishQueue(true); return; }
  sayOne(c, finished => { if (!finished) { finishQueue(false); return; } nextPiece(); });
}
/** Begin a reply to be said piece by piece; `onAllDone(finished)` when every piece has been said (true) or it was stopped (false). */
export function queueStart(onAllDone?: (finished: boolean) => void): void {
  stopSpeaking();
  queue = []; queueOpen = true; queueEnd = onAllDone ?? null;
}
/** Whether a reply is being said piece by piece (begun and not yet finished or stopped). */
export const queueActive = (): boolean => !!queueEnd;
/** A finished piece of the reply — said now, or after the one being said. */
export function queuePush(piece: string): void {
  if (!queueOpen && !queueEnd) return;
  if (!piece.trim()) return;
  queue.push(piece);
  if (!speakingNow) nextPiece();
}
/** Nothing more is coming: when the last piece has been said, the queue is done. */
export function queueClose(): void {
  queueOpen = false;
  if (!speakingNow && !queue.length && queueEnd) finishQueue(true);
}

/** Cut the piece being said, telling it it was cut short — not the queue. */
function cancelCurrent(): void {
  const cut = cutShort;
  cutShort = null;
  cut?.();
  current = null;
  if (speakingNow) { speakingNow = false; tell(false); }
  try { synth()?.cancel(); } catch { /* nothing to stop */ }
}

/** Stop speaking at once — the person has started talking, typed, tapped or pressed. What was being said counts as cut
 *  short (told at once — some browsers never fire its end after a cancel), so nothing opens after it; nothing waiting is said. */
export function stopSpeaking(): void {
  const q = queueEnd;
  queueEnd = null; queueOpen = false; queue = [];
  q?.(false);
  const cut = cutShort;
  cutShort = null;
  cut?.();
  current = null;
  if (speakingNow) { speakingNow = false; tell(false); }
  try { synth()?.cancel(); } catch { /* nothing to stop */ }
}

export const isSpeaking = (): boolean => speakingNow;

/** The device settings' keys. */
export const SPEAK_KEY = 'faultline.aiSpeak';
export const CONVERSATION_KEY = 'faultline.aiConversation';

/** What the Conversation switch promises — said on the screen, honestly. */
export const CONVERSATION_SAID = 'Conversation: after each reply is spoken, the microphone opens again so you can answer without a tap; the screen is kept on, and a headset’s button starts and stops listening where the phone passes it on. It works while the screen is on — it stops when the phone locks or Faultline goes out of sight.';
