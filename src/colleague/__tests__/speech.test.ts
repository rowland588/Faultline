/* THE VOICE CONVERSATION'S PURE PARTS (colleague/speech, docs/VOICE.md): what is said out loud, in what pieces, when a pause is the
 * end of a turn, the spoken commands, the echo, and the states moved only by events. And the voice's queue (colleague/voice) on a
 * fake speech synthesis: pieces said in order, one Stop cutting every one. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forSpeech, isEcho, nextChunks, speechChunks, turnEnd, turnWait, voiceCommand, voiceStep, VOICE_STATES, type VoiceEvent, type VoiceState } from '../speech';

describe('forSpeech — the words a person hears, nothing of how the app works inside', () => {
  it('takes out markdown, ids, links, JSON, the Suggestions line and thread tags; a list item a sentence', () => {
    const reply = [
      'There are **4 open problems** on [Line 7](/lines/abc) [thread 3f2a]:',
      '- the wrapper film breaks',
      '- the labeller skews',
      'Record 8e2b7c1e-1234-4abc-9def-0123456789ab is the latest. See https://faultline.opexelevate.co.uk/x.',
      '```json\n{"lineId":"w1"}\n```',
      'Suggestions: Show me Line 3 | Park this',
    ].join('\n');
    const s = forSpeech(reply);
    expect(s).toBe('There are 4 open problems on Line 7: the wrapper film breaks. the labeller skews. Record is the latest. See.');
    expect(s).not.toMatch(/Suggestions|thread|```|lineId|http|\*\*|8e2b7c1e/);
  });
});

describe('speechChunks and nextChunks — said a sentence at a time', () => {
  it('a short first piece, whole sentences, never cut at e.g. or 2.5', () => {
    const c = speechChunks('Yes. The changeover is about 2.5 hours, e.g. on the filler. That is long for a line like this, because the cleaning waits for the fitter every time. We should time it element by element.');
    expect(c[0]).toBe('Yes. The changeover is about 2.5 hours, e.g. on the filler.');
    expect(c.join(' ')).toContain('We should time it element by element.');
    expect(c.every(x => x.length <= 220)).toBe(true);
  });
  it('a reply still being written gives only its finished sentences; done, the rest', () => {
    const a = nextChunks('Line 4 has two open problems. The film', 0, false);
    expect(a.chunks).toEqual(['Line 4 has two open problems.']);
    const b = nextChunks('Line 4 has two open problems. The film breaks twice a shift.', a.upTo, false);
    expect(b.chunks).toEqual([]);   /* the last sentence waits for what comes after it */
    const c = nextChunks('Line 4 has two open problems. The film breaks twice a shift.', a.upTo, true);
    expect(c.chunks).toEqual(['The film breaks twice a shift.']);
  });
});

describe('turnEnd — a pause to think is not the end of a turn', () => {
  it('waits while words are still forming, ends after the pause chosen, longer after "and", shorter after "yes"', () => {
    expect(turnEnd({ final: 'Line four', interim: 'has' }, 3000)).toBe('wait');
    expect(turnEnd({ final: 'Look at line four', interim: '' }, 1700)).toBe('wait');
    expect(turnEnd({ final: 'Look at line four', interim: '' }, 1800)).toBe('end');
    expect(turnEnd({ final: 'Look at line four and', interim: '' }, 2500)).toBe('wait');
    expect(turnEnd({ final: 'Look at line four and', interim: '' }, 3300)).toBe('end');
    expect(turnEnd({ final: 'yes', interim: '' }, 900)).toBe('end');
    expect(turnEnd({ final: 'Look at line four', interim: '' }, 1200, 'short')).toBe('end');
    expect(turnEnd({ final: 'Look at line four', interim: '' }, 2500, 'long')).toBe('wait');
    expect(turnEnd({ final: '', interim: '' }, 9000)).toBe('wait');
    /* a phone that never finalises the last words is waited out, not hung on */
    expect(turnEnd({ final: '', interim: 'line four' }, 4500)).toBe('end');
    expect(turnWait({ final: 'Look at line four', interim: '' }, 0)).toBe(1800);
  });
});

describe('voiceCommand and isEcho', () => {
  it('stop and end only as whole phrases', () => {
    expect(voiceCommand('Stop.')).toBe('stop');
    expect(voiceCommand('hold on')).toBe('stop');
    expect(voiceCommand('End the conversation')).toBe('end');
    expect(voiceCommand('stop the filler when it jams')).toBeNull();
  });
  it('its own voice coming back is told from the person', () => {
    expect(isEcho('the wrapper film breaks twice', 'Line 7 has two open problems: the wrapper film breaks twice a shift.')).toBe(true);
    expect(isEcho('no I meant line three', 'Line 7 has two open problems: the wrapper film breaks twice a shift.')).toBe(false);
  });
});

describe('voiceStep — the states move only on events', () => {
  const run = (from: VoiceState, evs: VoiceEvent[]) => evs.reduce(voiceStep, from);
  it('a whole turn: open, listen, hear, end the turn, think, speak, listen again', () => {
    const seen: VoiceState[] = [];
    let s: VoiceState = 'ended';
    for (const e of [{ type: 'open' }, { type: 'ready' }, { type: 'heard', words: 'line four' }, { type: 'turn-end' }, { type: 'reply-words' }, { type: 'speak-start' }, { type: 'speak-end' }] as VoiceEvent[]) { s = voiceStep(s, e); seen.push(s); }
    expect(seen).toEqual(['initialising', 'listening', 'transcribing', 'processing', 'preparing', 'speaking', 'listening']);
    expect(seen.every(x => (VOICE_STATES as readonly string[]).includes(x))).toBe(true);
  });
  it('interrupted, muted, a dropped signal recovered, a refusal an error; a late event changes nothing; closed is closed', () => {
    expect(run('speaking', [{ type: 'interrupt' }, { type: 'ready' }])).toBe('listening');
    expect(run('listening', [{ type: 'mute' }])).toBe('idle');
    expect(run('listening', [{ type: 'trouble', fatal: false }, { type: 'recovered' }])).toBe('listening');
    expect(run('listening', [{ type: 'trouble', fatal: true }])).toBe('error');
    expect(run('listening', [{ type: 'speak-end' }])).toBe('listening');
    expect(run('processing', [{ type: 'heard', words: 'x' }])).toBe('processing');
    expect(run('speaking', [{ type: 'close' }, { type: 'ready' }])).toBe('ended');
  });
});

/* the queue on a fake speech synthesis */
describe('the voice’s queue', () => {
  let said: string[] = [];
  let live: { onend?: () => void; text: string } | null = null;
  beforeEach(() => {
    said = []; live = null;
    vi.resetModules();
    class U { text: string; onend?: () => void; onerror?: () => void; onboundary?: () => void; voice?: unknown; lang = ''; rate = 1; constructor(t: string) { this.text = t; } }
    vi.stubGlobal('SpeechSynthesisUtterance', U);
    vi.stubGlobal('window', { speechSynthesis: { speak: (u: U) => { said.push(u.text); live = u; }, cancel: () => { live = null; }, getVoices: () => [], speaking: false } });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
  });
  it('says the pieces in order, finishes when closed, and one stop cuts every piece left', async () => {
    const v = await import('../voice');
    const done: boolean[] = [];
    v.queueStart(f => done.push(f));
    v.queuePush('First sentence.'); v.queuePush('Second sentence.');
    expect(said).toEqual(['First sentence.']);
    live?.onend?.();
    /* a breath between two sentences (colleague/delivery) — still speaking through it, so nothing takes it for the end */
    expect(said).toEqual(['First sentence.']);
    expect(v.isSpeaking()).toBe(true);
    await new Promise(r => setTimeout(r, 450));
    expect(said).toEqual(['First sentence.', 'Second sentence.']);
    v.queueClose();
    live?.onend?.();
    expect(done).toEqual([true]);
    v.queueStart(f => done.push(f));
    v.queuePush('Third.'); v.queuePush('Fourth.');
    live?.onend?.();
    expect(v.isSpeaking()).toBe(true);
    v.stopSpeaking();
    expect(v.isSpeaking()).toBe(false);
    await new Promise(r => setTimeout(r, 450));
    expect(done).toEqual([true, false]);
    expect(said).toEqual(['First sentence.', 'Second sentence.', 'Third.']);
    expect(v.queueActive()).toBe(false);
  });
});
