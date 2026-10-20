/* THE PHONE'S OWN HEARING (lib/hearing; docs/LINE-TALK.md, How it hears):
 * a session's words read the one way, kept across the sessions a phone ends
 * by itself, handed over a piece at a time, and what gets in the way said —
 * against a recogniser that behaves as a phone's does. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ear, finalCount, joinWords, notHeardWhy, recognitionOf, sentence, wordsOfResults, type HeardResult, type RecognitionCtor, type Trouble } from '../hearing';

const res = (t: string, isFinal: boolean): HeardResult => ({ 0: { transcript: t }, length: 1, isFinal });

class FakeRec {
  static made: FakeRec[] = [];
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onresult: ((e: { results: ArrayLike<HeardResult> }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  running = false;
  results: HeardResult[] = [];
  constructor() { FakeRec.made.push(this); }
  start() { this.running = true; }
  /* as a phone does: what it was still forming is written, then it ends */
  stop() {
    this.running = false;
    const last = this.results[this.results.length - 1];
    if (last && !last.isFinal) { this.results[this.results.length - 1] = res(last[0].transcript, true); this.onresult?.({ results: [...this.results] }); }
    setTimeout(() => this.onend?.(), 10);
  }
  abort() { this.running = false; setTimeout(() => this.onend?.(), 0); }
  say(t: string, final = true) {
    if (this.results.length && !this.results[this.results.length - 1].isFinal) this.results.pop();
    this.results.push(res(t, final));
    this.onresult?.({ results: [...this.results] });
  }
  end() { this.running = false; this.onend?.(); }
  error(code: string) { this.onerror?.({ error: code }); this.end(); }
}
const last = () => FakeRec.made[FakeRec.made.length - 1];

describe('words, read the one way', () => {
  it('a stretch as a sentence — its own words, a capital and a stop', () => {
    expect(sentence('  the bagger is running   at about sixty ')).toBe('The bagger is running at about sixty.');
    expect(sentence('Is the guard bent?')).toBe('Is the guard bent?');
    expect(sentence('  ')).toBe('');
    expect(joinWords('A.', '', ' B. ')).toBe('A. B.');
  });
  it('a session’s results: the final ones as sentences, the rest as they stand, from where asked', () => {
    const r = [res('the bagger is running', true), res('film wandering left', true), res('the guard', false)];
    expect(wordsOfResults(r)).toEqual({ final: 'The bagger is running. Film wandering left.', interim: 'the guard' });
    expect(wordsOfResults(r, 1)).toEqual({ final: 'Film wandering left.', interim: 'the guard' });
    expect(finalCount(r)).toBe(2);
  });
  it('the browser’s recogniser, by either of its names, or none', () => {
    const R = function () { /* a recogniser */ };
    expect(recognitionOf({ webkitSpeechRecognition: R })).toBe(R);
    expect(recognitionOf({ SpeechRecognition: R, webkitSpeechRecognition: () => 0 })).toBe(R);
    expect(recognitionOf({})).toBeUndefined();
  });
  it('why a piece has no words — each keeping the recording and saying how to put them in', () => {
    for (const t of ['network', 'unsupported', 'not-allowed', 'language', 'mic-busy', null] as (Trouble | null)[]) {
      expect(notHeardWhy(t)).toMatch(/The recording is kept — play it, and type what was said with Correct/);
    }
    expect(notHeardWhy('network')).toMatch(/^No signal/);
  });
});

describe('the ear', () => {
  let words: string[], troubles: Trouble[];
  const make = (oneAtATime = false) => new Ear(FakeRec as unknown as RecognitionCtor, { onWords: h => words.push(`${h.final}|${h.interim}`), onTrouble: t => troubles.push(t) }, 'en-GB', oneAtATime);
  beforeEach(() => { FakeRec.made = []; words = []; troubles = []; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('listens in British English, words told as they form', () => {
    const ear = make();
    ear.start();
    expect(last().lang).toBe('en-GB');
    expect(last().continuous).toBe(true);
    expect(last().interimResults).toBe(true);
    last().say('the bagger', false);
    last().say('the bagger is running at sixty');
    expect(words).toEqual(['|the bagger', 'The bagger is running at sixty.|']);
    expect(ear.now()).toEqual({ final: 'The bagger is running at sixty.', interim: '' });
  });

  it('on Android, one sentence a session — a session ended is opened again, its words kept', () => {
    const ear = make(true);
    ear.start();
    expect(last().continuous).toBe(false);
    last().say('the bagger is running');
    vi.advanceTimersByTime(2000);
    last().end();
    vi.advanceTimersByTime(0);
    expect(FakeRec.made.length).toBe(2);
    last().say('film wandering left');
    expect(ear.now().final).toBe('The bagger is running. Film wandering left.');
  });

  it('a piece handed over; the next starts after it, the words still forming going with the next', () => {
    const ear = make();
    ear.start();
    last().say('the bagger is running');
    last().say('the guard', false);
    expect(ear.cut()).toEqual({ words: 'The bagger is running.', trouble: null });
    expect(ear.now()).toEqual({ final: '', interim: 'the guard' });
    last().say('the guard is bent');
    expect(ear.cut().words).toBe('The guard is bent.');
  });

  it('stopped: the last words written before the piece is handed over', async () => {
    const ear = make();
    ear.start();
    last().say('that is the walk', false);
    const p = ear.stop();
    vi.advanceTimersByTime(20);
    await expect(p).resolves.toEqual({ words: 'That is the walk.', trouble: null });
    expect(ear.listening).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(FakeRec.made.length).toBe(1);
  });

  it('asked to stop twice while it finishes: one answer, the words once', async () => {
    const ear = make();
    ear.start();
    last().say('the case packer is starved');
    const a = ear.stop(), b = ear.stop();
    vi.advanceTimersByTime(20);
    expect(a).toBe(b);
    await expect(a).resolves.toEqual({ words: 'The case packer is starved.', trouble: null });
  });

  it('a phone that never ends a stopped session is let go after a moment, its words kept', async () => {
    const ear = make();
    ear.start();
    last().say('the wrapper');
    last().stop = () => { /* never ends */ };
    const p = ear.stop(800);
    vi.advanceTimersByTime(900);
    await expect(p).resolves.toEqual({ words: 'The wrapper.', trouble: null });
  });

  it('no signal: told once, kept on the piece, and tried again — later each time it fails at once', () => {
    const ear = make();
    ear.start();
    last().error('network');
    last();
    vi.advanceTimersByTime(0);
    last().error('network');
    expect(troubles).toEqual(['network']);
    const made = FakeRec.made.length;
    vi.advanceTimersByTime(300);
    expect(FakeRec.made.length).toBe(made);
    vi.advanceTimersByTime(600);
    expect(FakeRec.made.length).toBe(made + 1);
    expect(ear.cut()).toEqual({ words: '', trouble: 'network' });
    /* the signal back: words again, and a later loss told again */
    last().say('back on the line');
    expect(ear.cut()).toEqual({ words: 'Back on the line.', trouble: null });
  });

  it('refused, or the microphone taken: told, and it stops listening', () => {
    const ear = make();
    ear.start();
    last().error('not-allowed');
    vi.advanceTimersByTime(5000);
    expect(troubles).toEqual(['not-allowed']);
    expect(FakeRec.made.length).toBe(1);
    expect(ear.listening).toBe(false);
    const ear2 = make();
    ear2.start();
    last().error('audio-capture');
    vi.advanceTimersByTime(5000);
    expect(troubles).toEqual(['not-allowed', 'mic-busy']);
    expect(ear2.cut().trouble).toBe('mic-busy');
  });

  it('British English not offered: American English, then said', () => {
    const ear = make();
    ear.start();
    last().error('language-not-supported');
    vi.advanceTimersByTime(500);
    expect(last().lang).toBe('en-US');
    expect(troubles).toEqual([]);
    last().error('language-not-supported');
    expect(troubles).toEqual(['language']);
    expect(ear.listening).toBe(false);
  });

  it('a session ended with words still forming keeps them', () => {
    const ear = make();
    ear.start();
    last().say('the case packer is', false);
    last().end();
    expect(ear.now().final).toBe('The case packer is.');
  });

  it('out of sight, a refusal is waited out, never taken as one — and back in sight it listens at once', () => {
    let away = true;
    const ear = new Ear(FakeRec as unknown as RecognitionCtor, { onWords: () => undefined, onTrouble: t => troubles.push(t) }, 'en-GB', false, () => away);
    ear.start();
    last().error('not-allowed');
    expect(troubles).toEqual([]);
    expect(ear.listening).toBe(true);
    const made = FakeRec.made.length;
    away = false;
    ear.start();
    expect(FakeRec.made.length).toBe(made + 1);
    last().say('back on the line');
    expect(ear.cut().words).toBe('Back on the line.');
  });

  it('let go: nothing more opened', () => {
    const ear = make();
    ear.start();
    ear.abort();
    vi.advanceTimersByTime(5000);
    expect(FakeRec.made.length).toBe(1);
  });
});
