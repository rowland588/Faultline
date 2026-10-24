/* THE PHONE'S OWN HEARING — Line Talk's words, written into the message box
 * by the phone as they are said (docs/LINE-TALK.md, How it hears).
 *
 * Rowland, 20 October: "Use the phone's own speech recognition instead of
 * Gemini." The browser's speech recognition (the Web Speech API — Chrome and
 * Edge on Android and at a desk, Safari on an iPhone) listens to the
 * microphone while the person talks and writes the words as it goes: no key,
 * no Faultline server, nothing to pay. And 21 October: "I see my words come
 * up on the interface. I simply press send" — so the words go into the box,
 * as a chat's dictation does, to be read, put right and sent. Where the
 * browser will not listen, the keyboard's own microphone key does the same
 * (KEYBOARD_MIC). It cannot be told the line's machine names: a name misheard
 * is put right in the box, and Line Talk is told the words came by speech
 * recognition.
 *
 * One session's words are read from its results the one way (wordsOfResults);
 * the Ear keeps them across the sessions a phone ends by itself — Chrome on
 * Android ends one after each sentence, Safari after a minute or so — and
 * hands them over when it is stopped (stop). */

/** What the phone has heard: the words it is sure of, and the ones still forming. */
export interface Heard { final: string; interim: string }

/** One result as the browser gives it. */
export interface HeardResult { isFinal: boolean; length: number; [i: number]: { transcript: string } }

/** Why words were not written down — said in words by notHeardWhy. */
export type Trouble = 'unsupported' | 'not-allowed' | 'network' | 'mic-busy' | 'language';

/** A piece's words as they are handed over, and what got in the way while it was said. */
export interface Cut { words: string; trouble: Trouble | null }

/** One stretch as a sentence: its own words, a capital to start and a stop
 *  at the end — no word changed, added or taken away. */
export function sentence(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const capped = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(capped) ? capped : `${capped}.`;
}

/** Words joined with one space, nothing empty. */
export const joinWords = (...parts: string[]): string => parts.map(p => p.trim()).filter(Boolean).join(' ');

/** A session's words from its results, from the `from`-th on: the final ones
 *  as sentences, the rest as they stand. */
export function wordsOfResults(results: ArrayLike<HeardResult>, from = 0): Heard {
  const fin: string[] = [], mid: string[] = [];
  for (let i = from; i < results.length; i++) {
    const r = results[i];
    const t = (r?.[0]?.transcript ?? '').trim();
    if (!t) continue;
    (r.isFinal ? fin : mid).push(r.isFinal ? sentence(t) : t);
  }
  return { final: fin.join(' '), interim: mid.join(' ') };
}

/** How many results, from the start, are final — what has been handed over. */
export function finalCount(results: ArrayLike<HeardResult>): number {
  let n = 0;
  while (n < results.length && results[n]?.isFinal) n++;
  return n;
}

/** Why a piece has no words, in words — each keeping the recording and saying
 *  how to put the words in. Said on pieces recorded before 21 October, when a
 *  talk was recorded as well as written down; a talk into the box keeps no
 *  piece without words. */
export function notHeardWhy(trouble: Trouble | null): string {
  switch (trouble) {
    case 'network': return 'No signal while it was said, so the phone could not write it down. The recording is kept — play it, and type what was said with Correct.';
    case 'unsupported': return 'This browser does not write down speech. The recording is kept — play it, and type what was said with Correct; to have it written down, talk in Chrome or Safari.';
    case 'not-allowed': return 'The phone did not allow its speech recognition for Faultline. The recording is kept — play it, and type what was said with Correct.';
    case 'language': return 'The phone could not write down British English. The recording is kept — play it, and type what was said with Correct.';
    case 'mic-busy': return 'The phone would not record and write down at once. The recording is kept — play it, and type what was said with Correct.';
    default: return 'Nothing was written down in it. The recording is kept — play it, and type what was said with Correct if there was something.';
  }
}

/* -------------------------------------------------------------- the ear */

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<HeardResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
export type RecognitionCtor = new () => Recognition;

/** The browser's speech recognition, where it has one. */
export function recognitionOf(w: unknown): RecognitionCtor | undefined {
  const x = w as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor } | undefined;
  return x?.SpeechRecognition ?? x?.webkitSpeechRecognition;
}

/** LISTENING, a piece at a time. Started, it writes down until stopped,
 *  opening a new session each time the phone ends one; what it hears is
 *  told as it comes (onWords) and handed over a piece at a time (cut). What
 *  gets in the way is told once a piece (onTrouble): no signal is waited out,
 *  a refusal stops it. */
export class Ear {
  private rec: Recognition | null = null;
  private on = false;
  /** this piece's words from sessions that have ended */
  private kept = '';
  /** the running session's results not handed over yet, read as words */
  private session: Heard = { final: '', interim: '' };
  /** the running session's results as the phone last gave them, and how many are handed over */
  private results: ArrayLike<HeardResult> = [];
  private taken = 0;
  private trouble: Trouble | null = null;
  private told: Trouble | null = null;
  private lang: string;
  private quickEnds = 0;
  private opened = 0;
  private wait: ReturnType<typeof setTimeout> | null = null;
  private ended: (() => void) | null = null;
  private stopping: Promise<Cut> | null = null;

  /** `away`: whether the page is out of sight — a phone refuses its hearing
   *  then (the screen locked, another app in front), and that is waited out,
   *  never taken as a refusal. */
  constructor(private Rec: RecognitionCtor, private ev: { onWords: (h: Heard) => void; onTrouble: (t: Trouble) => void },
    lang = 'en-GB', private oneAtATime = false, private away: () => boolean = () => false) { this.lang = lang; }

  /** What has been heard this piece so far. */
  now(): Heard { return { final: joinWords(this.kept, this.session.final), interim: this.session.interim }; }

  get listening(): boolean { return this.on; }

  /** Listen — or, already listening but between sessions, open the next now (back in sight). */
  start(): void {
    if (this.on) {
      if (!this.rec && this.wait) { clearTimeout(this.wait); this.wait = null; this.open(); }
      return;
    }
    this.on = true;
    this.open();
  }

  private open(): void {
    if (!this.on || this.rec) return;
    let r: Recognition;
    try { r = new this.Rec(); } catch { this.troubled('unsupported'); this.on = false; return; }
    r.lang = this.lang;
    /* Chrome on Android repeats words in one long session — there, one sentence a session */
    r.continuous = !this.oneAtATime;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = e => {
      if (this.rec !== r) return;
      this.results = e.results;
      this.session = wordsOfResults(e.results, this.taken);
      this.quickEnds = 0;
      if (this.told === 'network') this.told = null;
      this.ev.onWords(this.now());
    };
    r.onerror = e => {
      if (this.rec !== r) return;
      const code = e.error;
      if (code === 'no-speech' || code === 'aborted' || this.away()) return;
      if (code === 'network') return this.troubled('network');
      if (code === 'audio-capture') { this.troubled('mic-busy'); this.on = false; return; }
      if (code === 'language-not-supported' && this.lang !== 'en-US') { this.lang = 'en-US'; return; }
      if (code === 'language-not-supported') { this.troubled('language'); this.on = false; return; }
      if (code === 'not-allowed' || code === 'service-not-allowed') { this.troubled('not-allowed'); this.on = false; return; }
    };
    r.onend = () => {
      if (this.rec !== r) return;
      this.rec = null;
      /* a session's words are kept when it ends — the ones still forming too, rather than lost */
      this.kept = joinWords(this.kept, this.session.final, this.session.interim ? sentence(this.session.interim) : '');
      this.session = { final: '', interim: '' };
      this.results = [];
      this.taken = 0;
      const done = this.ended;
      this.ended = null;
      if (done) { done(); return; }
      if (!this.on) return;
      /* out of sight: tried again in a while, and at once on return (start) */
      if (this.away()) { this.wait = setTimeout(() => { this.wait = null; this.open(); }, 3000); return; }
      /* the phone ended it: open the next — at once, or a moment later when it keeps ending at once */
      this.quickEnds = Date.now() - this.opened < 1500 ? this.quickEnds + 1 : 0;
      const delay = this.quickEnds === 0 ? 0 : Math.min(5000, 400 * this.quickEnds);
      this.wait = setTimeout(() => { this.wait = null; this.open(); }, delay);
    };
    this.rec = r;
    this.opened = Date.now();
    try { r.start(); } catch { this.rec = null; this.troubled('unsupported'); this.on = false; }
  }

  private troubled(t: Trouble): void {
    if (!this.trouble || this.trouble === 'network') this.trouble = t;
    if (this.told !== t) { this.told = t; this.ev.onTrouble(t); }
  }

  /** This piece's words, handed over; the next piece starts empty. Words
   *  still forming stay with the next piece, where they finish. */
  cut(): Cut {
    const out: Cut = { words: joinWords(this.kept, this.session.final), trouble: this.trouble };
    this.kept = '';
    /* the running session's final results are this piece's: the next reads after them */
    this.taken = Math.max(this.taken, finalCount(this.results));
    this.session = wordsOfResults(this.results, this.taken);
    this.trouble = null;
    return out;
  }

  /** Stop listening; the words of the piece, once the phone has finished
   *  writing what it heard last (a moment, never more than `ms`). */
  stop(ms = 2500): Promise<Cut> {
    /* asked twice while it finishes (a pause as the phone takes the microphone): the one answer */
    if (this.stopping) return this.stopping;
    this.on = false;
    if (this.wait) { clearTimeout(this.wait); this.wait = null; }
    const r = this.rec;
    if (!r) return Promise.resolve(this.cutAll());
    this.stopping = new Promise<Cut>(res => {
      const done = () => { this.stopping = null; res(this.cutAll()); };
      const t = setTimeout(() => { this.ended = null; this.rec = null; try { r.abort(); } catch { /* gone */ } done(); }, ms);
      this.ended = () => { clearTimeout(t); done(); };
      try { r.stop(); } catch { clearTimeout(t); this.ended = null; this.rec = null; done(); }
    });
    return this.stopping;
  }

  /** Everything still held, the words still forming as well — the end of the talk. */
  private cutAll(): Cut {
    const out: Cut = { words: joinWords(this.kept, this.session.final, this.session.interim ? sentence(this.session.interim) : ''), trouble: this.trouble };
    this.kept = ''; this.session = { final: '', interim: '' }; this.results = []; this.taken = 0; this.trouble = null; this.told = null;
    return out;
  }

  /** Let go at once — the page is closing. */
  abort(): void {
    this.on = false;
    if (this.wait) { clearTimeout(this.wait); this.wait = null; }
    const r = this.rec;
    this.rec = null;
    try { r?.abort(); } catch { /* gone */ }
  }
}

/** The way that always works: the phone keyboard's own microphone key,
 *  which writes the words into whatever box has the cursor — said wherever
 *  the browser's own hearing will not do. */
export const KEYBOARD_MIC = 'Tap the box, then the microphone on your keyboard, and talk — your words come up in the box the same way. Then press Send.';

/** Listening, and nothing heard for a few seconds — said while it goes on
 *  listening: a phone whose browser will not hear (an iPhone's home-screen
 *  app, 21 October) says nothing at all, so the way round it is said. */
export const NOTHING_HEARD = `Nothing heard yet — keep talking. If your words do not come up, this phone's browser is not listening: ${KEYBOARD_MIC}`;

/** What gets in the way of talking into the box, said as it happens — each
 *  with the way round it. What was said before it is in the box. */
export function troubleSaid(t: Trouble): string {
  switch (t) {
    case 'network': return 'No signal — this phone needs it to write down speech. What you said is in the box; type the rest, or tap the microphone again when the signal is back.';
    case 'not-allowed': return `This browser was not allowed to listen. ${KEYBOARD_MIC} (To use the microphone here, allow the microphone and speech recognition for this browser in the phone’s settings — on an iPhone, Siri & Dictation must be on.)`;
    case 'language': return `This phone cannot write down English here. ${KEYBOARD_MIC}`;
    case 'mic-busy': return `Another app has the microphone. Close it and tap the microphone again — or: ${KEYBOARD_MIC}`;
    case 'unsupported': return `This browser does not write down speech itself. ${KEYBOARD_MIC}`;
  }
}
