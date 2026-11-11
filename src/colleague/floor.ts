/* AI MODE ON THE FLOOR — walking a factory with a Bluetooth headset, the phone in a hand or a pocket, and talking
 * (Phase 4, 8 November; docs/AI-MODE.md §7).
 *
 * Honest limits first: a web page cannot listen with the phone locked or Faultline out of sight. So what is built is
 * what the web platform allows, each part detected and said in words when this phone does not offer it:
 *   SCREEN KEPT ON   the Screen Wake Lock held while Conversation is on, taken again when Faultline comes back into
 *                    sight (a phone lets it go when the page is hidden), let go when Conversation ends;
 *   THE HEADSET'S BUTTON  the Media Session API's play · pause · next track, with a silent looping sound to make
 *                    Faultline the phone's media for the moment (zero samples — nothing to hear), so a press starts or
 *                    stops listening;
 *   A SOUND          a short tone (under 150 ms, quiet) when listening starts and stops — switchable;
 *   BARGE-IN         words heard while a reply is spoken stop the reply at once;
 *   SAID YES         a write card answered by the words said back — matched here, in code, on a strict list of whole
 *                    phrases, never by the model and never on anything else;
 *   THE CHECK        "Before you walk the floor": the microphone, speech recognition, a British voice, the screen kept
 *                    on and the headset's button — each yes or no in words, run when asked.
 * The pure parts (the phrases, the decisions, the silent sound, what each part says) are tested with fakes; the parts
 * that touch the phone take what they use as an `env`, so a test hands them a fake phone. */

/* ================================================================ said back: yes or no */

/** The whole phrases that answer a waiting card — nothing else does. */
export const YES_PHRASES = ['yes do it', 'do it', 'go ahead'] as const;
export const NO_PHRASES = ['no', 'not now'] as const;

/** Words as compared: lower case, punctuation gone, one space between words. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
}

/** The person's words read as an answer to a card — only when the WHOLE of what was said is one of the phrases. */
export function spokenAnswer(words: string): { answer: 'yes' | 'no'; said: string } | null {
  const n = normalise(words);
  if (!n) return null;
  const said = words.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '');
  if ((YES_PHRASES as readonly string[]).includes(n)) return { answer: 'yes', said };
  if ((NO_PHRASES as readonly string[]).includes(n)) return { answer: 'no', said };
  return null;
}

/** What is said on a card while it waits and Conversation is on — the words that answer it. */
export const SAY_TO_ANSWER = 'Or say “yes, do it” or “not now”.';

/** The words spoken when a card is waiting and Conversation is on: what was said so far, what will happen, the ask. */
export function cardPrompt(before: string, card: { title: string; preview?: string }): string {
  const what = (card.preview ?? '').trim() || card.title.trim();
  const parts = [before.trim(), what].filter(Boolean).map(p => p.replace(/[.!?…]*$/, '.'));
  return [...parts, 'Shall I do it?'].join(' ');
}

/** What is left to say of a reply when its start has been said already (before a card). */
export function unspoken(reply: string, already: string): string {
  const r = reply.trim(), a = already.trim();
  if (a && r.startsWith(a)) return r.slice(a.length).trim();
  return r;
}

/* ================================================================ the session's decisions */

/** Where a Conversation session stands — read from the screen's own state, never kept twice. */
export type Phase = 'off' | 'idle' | 'listening' | 'speaking' | 'thinking';

export function phaseOf(s: { talkOn: boolean; listening: boolean; speaking: boolean; asking: boolean }): Phase {
  if (s.listening) return 'listening';
  if (s.speaking) return 'speaking';
  if (s.asking) return 'thinking';
  return s.talkOn ? 'idle' : 'off';
}

/** What a press of the headset's button does: listen; stop and send what was heard; stop (nothing heard); stop the
 *  reply and listen; or nothing while Faultline works (the card waiting is answered by voice, or on the screen). */
export type Press = 'listen' | 'send' | 'stop' | 'interrupt' | 'none';

export function pressAction(phase: Phase, heard: string, asking = false, cardWaiting = false): Press {
  switch (phase) {
    /* listening while Faultline works or waits on a card: the press only stops — a card is answered by "yes, do it" or a tap */
    case 'listening': return heard.trim() && !asking ? 'send' : 'stop';
    case 'speaking': return 'interrupt';
    case 'idle': case 'off': return 'listen';
    /* working: nothing — unless a card is waiting for an answer, when the press opens the microphone for it */
    case 'thinking': return cardWaiting ? 'listen' : 'none';
  }
}

/** Barge-in: the recogniser gave words while a reply is being spoken — the reply stops. */
export const shouldBargeIn = (speaking: boolean, heard: { final: string; interim: string }): boolean =>
  speaking && !!(heard.final.trim() || heard.interim.trim());

/** After a reply is spoken: the microphone opens again only if it was said to the end, Conversation is on, Faultline
 *  is in sight and nothing is listening already — a reply cut short by typing, Send or a tap opens nothing. */
export const reopenAfterSpeech = (s: { finished: boolean; talkOn: boolean; visible: boolean; listening: boolean }): boolean =>
  s.finished && s.talkOn && s.visible && !s.listening;

/* ================================================================ what this phone offers */

/** What the code reads off the phone — a fake one in the tests. */
export interface FloorEnv {
  navigator?: unknown;
  document?: unknown;
  window?: unknown;
}

export const realEnv = (): FloorEnv => ({
  ...(typeof navigator !== 'undefined' ? { navigator } : {}),
  ...(typeof document !== 'undefined' ? { document } : {}),
  ...(typeof window !== 'undefined' ? { window } : {}),
});

interface WakeLockSentinelLike { released?: boolean; release(): Promise<void>; addEventListener?(t: 'release', f: () => void): void }
interface WakeLockLike { request(type: 'screen'): Promise<WakeLockSentinelLike> }
interface MediaSessionLike {
  setActionHandler(action: string, handler: (() => void) | null): void;
  metadata?: unknown;
  playbackState?: string;
}
interface Nav {
  wakeLock?: WakeLockLike;
  mediaSession?: MediaSessionLike;
  permissions?: { query(d: { name: string }): Promise<{ state: string }> };
  mediaDevices?: { getUserMedia(c: { audio: boolean }): Promise<{ getTracks(): { stop(): void }[] }> };
}
interface Doc { visibilityState?: string; addEventListener?(t: string, f: () => void): void; removeEventListener?(t: string, f: () => void): void }
interface Win {
  SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown;
  speechSynthesis?: { getVoices(): { lang: string; name: string }[]; addEventListener?(t: string, f: () => void): void; removeEventListener?(t: string, f: () => void): void };
  AudioContext?: unknown; webkitAudioContext?: unknown;
  MediaMetadata?: new (m: { title: string; artist?: string }) => unknown;
}

const nav = (e: FloorEnv) => (e.navigator ?? {}) as Nav;
const doc = (e: FloorEnv) => (e.document ?? {}) as Doc;
const win = (e: FloorEnv) => (e.window ?? {}) as Win;

export interface Abilities { recognition: boolean; synthesis: boolean; wakeLock: boolean; mediaSession: boolean; sound: boolean }

/** Which of the floor's parts this phone has at all. */
export function abilitiesOf(e: FloorEnv): Abilities {
  const n = nav(e), w = win(e);
  return {
    recognition: !!(w.SpeechRecognition ?? w.webkitSpeechRecognition),
    synthesis: !!w.speechSynthesis,
    wakeLock: !!n.wakeLock && typeof n.wakeLock.request === 'function',
    mediaSession: !!n.mediaSession && typeof n.mediaSession.setActionHandler === 'function',
    sound: !!(w.AudioContext ?? w.webkitAudioContext),
  };
}

/* ================================================================ the screen kept on */

export type KeepState = 'off' | 'held' | 'away' | 'unsupported' | 'refused';

/** What the header says of the screen while Conversation is on. */
export function keepSaid(s: KeepState): string | null {
  switch (s) {
    case 'held': return 'Screen kept on';
    case 'away': return 'Screen kept on when the app is back in sight';
    case 'unsupported': case 'refused': return 'This phone will not keep the screen on — keep it awake yourself';
    case 'off': return null;
  }
}

/** THE SCREEN WAKE LOCK — held while wanted, taken again whenever the page comes back into sight. */
export class ScreenKeeper {
  private lock: WakeLockSentinelLike | null = null;
  private wanted = false;
  private state: KeepState = 'off';
  private readonly seen = () => { if (this.wanted && doc(this.env).visibilityState === 'visible') void this.take(); };

  constructor(private env: FloorEnv, private onState: (s: KeepState) => void) {}

  get now(): KeepState { return this.state; }

  private set(s: KeepState): void { if (s !== this.state) { this.state = s; this.onState(s); } }

  /** Hold the screen on. */
  async hold(): Promise<KeepState> {
    if (this.wanted) return this.state;
    this.wanted = true;
    doc(this.env).addEventListener?.('visibilitychange', this.seen);
    return this.take();
  }

  private async take(): Promise<KeepState> {
    const wl = nav(this.env).wakeLock;
    if (!wl || typeof wl.request !== 'function') { this.set('unsupported'); return this.state; }
    if (this.lock && !this.lock.released) { this.set('held'); return this.state; }
    if (doc(this.env).visibilityState === 'hidden') { this.set('away'); return this.state; }
    try {
      const l = await wl.request('screen');
      if (!this.wanted) { void l.release().catch(() => undefined); return this.state; }
      this.lock = l;
      l.addEventListener?.('release', () => {
        if (this.lock !== l) return;
        this.lock = null;
        if (this.wanted) this.set(doc(this.env).visibilityState === 'hidden' ? 'away' : 'refused');
      });
      this.set('held');
    } catch {
      this.set('refused');
    }
    return this.state;
  }

  /** Let the screen sleep again. */
  letGo(): void {
    this.wanted = false;
    doc(this.env).removeEventListener?.('visibilitychange', this.seen);
    const l = this.lock;
    this.lock = null;
    if (l) void l.release().catch(() => undefined);
    this.set('off');
  }
}

/* ================================================================ the headset's button */

export type ButtonState = 'off' | 'ready' | 'needs-tap' | 'unsupported';

export function buttonSaid(s: ButtonState): string | null {
  switch (s) {
    case 'ready': return 'Headset button: press to talk, press again to send';
    case 'needs-tap': return 'Headset button: tap the screen once to wake it';
    case 'unsupported': return 'This phone does not pass a headset’s button to a web page — tap the microphone';
    case 'off': return null;
  }
}

/** A silent WAV — 16-bit mono, every sample zero, so it plays and says nothing. Six seconds by default: a phone shows a
 *  page's media controls only for a sound of some length. */
export function silentWav(seconds = 6, rate = 8000): Uint8Array {
  const samples = Math.max(1, Math.round(seconds * rate));
  const data = samples * 2;
  const b = new Uint8Array(44 + data);
  const v = new DataView(b.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + data, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, data, true);
  return b;
}

/** The actions a headset's button can send — each one a press here. */
export const BUTTON_ACTIONS = ['play', 'pause', 'nexttrack', 'previoustrack'] as const;

interface AudioLike { loop: boolean; volume: number; src: string; play(): Promise<void> | void; pause(): void; removeAttribute?(n: string): void; load?(): void }

/** THE HEADSET'S BUTTON — the media session's actions set to one press, the silent sound looping to make Faultline the
 *  phone's media while Conversation is on, all taken off when it ends. */
export class HeadsetButton {
  private on = false;
  private audio: AudioLike | null = null;
  private url = '';
  private state: ButtonState = 'off';
  private set(s: ButtonState): void { if (s !== this.state) { this.state = s; this.onState(s); } }

  constructor(private env: FloorEnv, private press: () => void, private onState: (s: ButtonState) => void,
    private makeAudio: () => AudioLike | null = defaultAudio) {}

  get now(): ButtonState { return this.state; }

  /** Take the button. Returns the state; 'needs-tap' when the phone wants a touch before a sound may play. */
  async take(): Promise<ButtonState> {
    const ms = nav(this.env).mediaSession;
    if (!ms || typeof ms.setActionHandler !== 'function') { this.set('unsupported'); return this.state; }
    this.on = true;
    let any = false;
    for (const a of BUTTON_ACTIONS) {
      try { ms.setActionHandler(a, () => { if (this.on) this.press(); }); any = true; } catch { /* this action is not offered */ }
    }
    if (!any) { this.on = false; this.set('unsupported'); return this.state; }
    try {
      const M = win(this.env).MediaMetadata;
      if (M) ms.metadata = new M({ title: 'The app — AI Mode', artist: 'Press to talk' });
    } catch { /* no title on the lock screen */ }
    return this.wake();
  }

  /** Start the silent sound — again after the person's tap when the phone refused it before. */
  async wake(): Promise<ButtonState> {
    if (!this.on) return this.state;
    try {
      if (!this.audio) {
        this.audio = this.makeAudio();
        if (this.audio) {
          if (!this.url && typeof URL !== 'undefined' && typeof Blob !== 'undefined') this.url = URL.createObjectURL(new Blob([silentWav() as BlobPart], { type: 'audio/wav' }));
          this.audio.src = this.url;
          this.audio.loop = true;
        }
      }
      if (this.audio) await this.audio.play();
      const ms = nav(this.env).mediaSession;
      if (ms) ms.playbackState = 'playing';
      this.set('ready');
    } catch {
      this.set('needs-tap');
    }
    return this.state;
  }

  /** Let the button go: the actions taken off, the sound stopped. */
  letGo(): void {
    this.on = false;
    const ms = nav(this.env).mediaSession;
    if (ms) {
      for (const a of BUTTON_ACTIONS) { try { ms.setActionHandler(a, null); } catch { /* not offered */ } }
      try { ms.playbackState = 'none'; ms.metadata = null; } catch { /* nothing to clear */ }
    }
    const a = this.audio;
    this.audio = null;
    if (a) { try { a.pause(); a.removeAttribute?.('src'); a.load?.(); } catch { /* gone */ } }
    if (this.url) { try { URL.revokeObjectURL(this.url); } catch { /* gone */ } this.url = ''; }
    this.set('off');
  }
}

function defaultAudio(): AudioLike | null {
  if (typeof document === 'undefined') return null;
  const a = document.createElement('audio');
  a.setAttribute('playsinline', '');
  a.preload = 'auto';
  return a;
}

/* ================================================================ the sound when listening starts and stops */

export const EARCON_MS = 120;
let ac: AudioContext | null = null;

/** A short, quiet tone — rising as listening starts, falling as it stops. Nothing where the phone makes no sound. */
export function earcon(kind: 'start' | 'stop'): void {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac ??= new AC();
    if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
    const t = ac.currentTime, end = t + EARCON_MS / 1000;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(kind === 'start' ? 660 : 880, t);
    o.frequency.linearRampToValueAtTime(kind === 'start' ? 880 : 660, end);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.015);
    g.gain.linearRampToValueAtTime(0.0001, end);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(end);
  } catch { /* no sound */ }
}

/* ================================================================ before you walk the floor */

export interface CheckItem { key: 'mic' | 'recognition' | 'voice' | 'wakeLock' | 'button'; label: string; ok: boolean; said: string }

const waitVoices = (w: Win, ms: number): Promise<{ lang: string; name: string }[]> => new Promise(res => {
  const s = w.speechSynthesis;
  if (!s) { res([]); return; }
  const now = s.getVoices();
  if (now.length) { res(now); return; }
  let done = false;
  const finish = () => { if (done) return; done = true; s.removeEventListener?.('voiceschanged', finish); res(s.getVoices()); };
  s.addEventListener?.('voiceschanged', finish);
  setTimeout(finish, ms);
});

/** Is the microphone allowed — asked of the phone's permissions, else by opening it for a moment (the person asked). */
async function micAllowed(n: Nav): Promise<{ ok: boolean; said: string }> {
  try {
    const p = await n.permissions?.query({ name: 'microphone' });
    if (p?.state === 'granted') return { ok: true, said: 'Yes — the app may use the microphone.' };
    if (p?.state === 'denied') return { ok: false, said: 'No — the microphone is blocked for the app. Allow it in the browser’s site settings.' };
  } catch { /* this phone does not say — ask it */ }
  if (!n.mediaDevices?.getUserMedia) return { ok: false, said: 'No — this browser gives a page no microphone.' };
  try {
    const s = await n.mediaDevices.getUserMedia({ audio: true });
    for (const t of s.getTracks()) t.stop();
    return { ok: true, said: 'Yes — the app may use the microphone.' };
  } catch {
    return { ok: false, said: 'No — the microphone was not allowed. Allow it in the browser’s site settings.' };
  }
}

/** THE CHECK — each part yes or no in words, run when the person asks. */
export async function floorCheck(e: FloorEnv, voiceWaitMs = 1500): Promise<CheckItem[]> {
  const n = nav(e), w = win(e), can = abilitiesOf(e);
  const mic = await micAllowed(n);
  const voices = can.synthesis ? await waitVoices(w, voiceWaitMs) : [];
  const gb = voices.find(v => /^en[-_]GB/i.test(v.lang));
  const en = voices.find(v => /^en/i.test(v.lang));
  let keep: { ok: boolean; said: string };
  if (!can.wakeLock) keep = { ok: false, said: 'No — this phone will not let a web page keep the screen on. Set the screen to stay on longer, or touch it now and then.' };
  else {
    try {
      const l = await (n.wakeLock as WakeLockLike).request('screen');
      await l.release().catch(() => undefined);
      keep = { ok: true, said: 'Yes — the screen stays on while Conversation is on.' };
    } catch { keep = { ok: false, said: 'No — the phone refused to keep the screen on just now (battery saver can do this). Touch it now and then.' }; }
  }
  return [
    { key: 'mic', label: 'Microphone allowed', ...mic },
    { key: 'recognition', label: 'Speech recognition', ok: can.recognition, said: can.recognition ? 'Yes — this browser writes down what you say.' : 'No — this browser does not write down speech. Use the keyboard’s own microphone, or Chrome or Safari.' },
    { key: 'voice', label: 'A British voice', ok: !!gb, said: gb ? `Yes — ${gb.name}.` : en ? `No — replies are read in ${en.name} (${en.lang}). Add an English (UK) voice in the phone’s settings.` : can.synthesis ? 'No — no English voice on this phone; replies are not read out.' : 'No — this browser cannot read replies out.' },
    { key: 'wakeLock', label: 'Screen kept on', ...keep },
    { key: 'button', label: 'Headset button', ok: can.mediaSession, said: can.mediaSession ? 'Yes — this phone passes media buttons to a page. With Conversation on, press your headset’s button once to try it.' : 'No — this phone does not pass a headset’s button to a web page. Tap the microphone instead.' },
  ];
}

/** The honest limit, said with the check. */
export const FLOOR_LIMIT = 'Luna listens only while the screen is on and the app is in front — not with the phone locked or in a pocket with the screen off.';

/** The device setting for the sound. */
export const EARCON_KEY = 'faultline.aiEarcon';
