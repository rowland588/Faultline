/* AI MODE ON THE FLOOR — the phrases that answer a card, the session's decisions, the silent sound, and each part of the
 * phone (wake lock, headset button, the check) with a fake phone; the voice stopped at once by barge-in. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BUTTON_ACTIONS, HeadsetButton, ScreenKeeper, abilitiesOf, buttonSaid, cardPrompt, floorCheck, keepSaid, normalise, phaseOf, pressAction,
  reopenAfterSpeech, shouldBargeIn, silentWav, spokenAnswer, unspoken, type ButtonState, type KeepState,
} from '../floor';

describe('the words that answer a card', () => {
  it('confirms only on a whole phrase of the list', () => {
    expect(spokenAnswer('Yes, do it.')).toEqual({ answer: 'yes', said: 'Yes, do it' });
    expect(spokenAnswer('do it')?.answer).toBe('yes');
    expect(spokenAnswer('Go ahead!')?.answer).toBe('yes');
    expect(spokenAnswer('  GO   AHEAD ')?.answer).toBe('yes');
  });
  it('declines on no and not now', () => {
    expect(spokenAnswer('No.')).toEqual({ answer: 'no', said: 'No' });
    expect(spokenAnswer('Not now')?.answer).toBe('no');
  });
  it('never answers on anything else — a phrase inside other words, a near miss, nothing', () => {
    for (const w of ['yes', 'yeah do it', 'do it later', "don't do it", 'go ahead and check the wrapper', 'no idea what the wrapper is doing',
      'not now but later', 'ok', 'sure', 'do it do it', 'yes please', '', '   ', 'No, do it']) {
      expect(spokenAnswer(w), w).toBeNull();
    }
  });
  it('normalises case, punctuation and curly apostrophes', () => {
    expect(normalise('Yes — DO it…')).toBe('yes do it');
    expect(normalise('Don’t')).toBe('dont');
  });
});

describe('what is said out loud', () => {
  it('a waiting card ends with Shall I do it?', () => {
    expect(cardPrompt('Line 3 has two late actions', { title: 'Raise a problem', preview: 'Raise “Film breaks” on Line 3, High.' }))
      .toBe('Line 3 has two late actions. Raise “Film breaks” on Line 3, High. Shall I do it?');
    expect(cardPrompt('', { title: 'Raise a problem' })).toBe('Raise a problem. Shall I do it?');
  });
  it('a reply says only what was not said before the card', () => {
    expect(unspoken('Line 3 has two late actions\n\nDone — it is on the register.', 'Line 3 has two late actions')).toBe('Done — it is on the register.');
    expect(unspoken('Something else', 'Line 3')).toBe('Something else');
    expect(unspoken('All of it', '')).toBe('All of it');
  });
});

describe('the session', () => {
  it('reads its phase from the screen', () => {
    expect(phaseOf({ talkOn: false, listening: false, speaking: false, asking: false })).toBe('off');
    expect(phaseOf({ talkOn: true, listening: false, speaking: false, asking: false })).toBe('idle');
    expect(phaseOf({ talkOn: true, listening: true, speaking: true, asking: true })).toBe('listening');
    expect(phaseOf({ talkOn: true, listening: false, speaking: true, asking: false })).toBe('speaking');
    expect(phaseOf({ talkOn: true, listening: false, speaking: false, asking: true })).toBe('thinking');
  });
  it('a press of the headset button', () => {
    expect(pressAction('idle', '')).toBe('listen');
    expect(pressAction('listening', 'the wrapper keeps stopping')).toBe('send');
    expect(pressAction('listening', '  ')).toBe('stop');
    expect(pressAction('listening', 'yes do', true)).toBe('stop');
    expect(pressAction('speaking', '')).toBe('interrupt');
    expect(pressAction('thinking', '')).toBe('none');
    expect(pressAction('thinking', '', true, true)).toBe('listen');
  });
  it('barges in only on words while speaking', () => {
    expect(shouldBargeIn(true, { final: '', interim: 'wait' })).toBe(true);
    expect(shouldBargeIn(true, { final: 'Stop.', interim: '' })).toBe(true);
    expect(shouldBargeIn(true, { final: '', interim: ' ' })).toBe(false);
    expect(shouldBargeIn(false, { final: 'Stop.', interim: '' })).toBe(false);
  });
  it('opens the microphone after a reply only when it was said to the end', () => {
    const on = { finished: true, talkOn: true, visible: true, listening: false };
    expect(reopenAfterSpeech(on)).toBe(true);
    expect(reopenAfterSpeech({ ...on, finished: false })).toBe(false);
    expect(reopenAfterSpeech({ ...on, talkOn: false })).toBe(false);
    expect(reopenAfterSpeech({ ...on, visible: false })).toBe(false);
    expect(reopenAfterSpeech({ ...on, listening: true })).toBe(false);
  });
});

describe('the silent sound', () => {
  it('is a WAV of zeros, six seconds at 8 kHz', () => {
    const b = silentWav();
    const v = new DataView(b.buffer);
    expect(String.fromCharCode(...b.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...b.slice(8, 12))).toBe('WAVE');
    expect(v.getUint32(24, true)).toBe(8000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(96000);
    expect(b.length).toBe(44 + 96000);
    expect(b.slice(44).every(x => x === 0)).toBe(true);
  });
});

/* ---------------------------------------------------------------- a fake phone */

function fakeDoc(state = 'visible') {
  const fs = new Set<() => void>();
  return {
    visibilityState: state,
    addEventListener: (_: string, f: () => void) => fs.add(f),
    removeEventListener: (_: string, f: () => void) => fs.delete(f),
    fire() { for (const f of [...fs]) f(); },
    get count() { return fs.size; },
  };
}
function fakeLock() {
  const made: { released: boolean; fire: () => void; release: () => Promise<void>; addEventListener: (t: string, f: () => void) => void }[] = [];
  return {
    made,
    request: vi.fn(async () => {
      let on: (() => void) | undefined;
      const l = { released: false, fire: () => { l.released = true; on?.(); }, release: async () => { l.released = true; }, addEventListener: (_: string, f: () => void) => { on = f; } };
      made.push(l);
      return l;
    }),
  };
}

describe('abilities', () => {
  it('reads each part off the phone', () => {
    expect(abilitiesOf({})).toEqual({ recognition: false, synthesis: false, wakeLock: false, mediaSession: false, sound: false });
    expect(abilitiesOf({
      navigator: { wakeLock: { request: () => undefined }, mediaSession: { setActionHandler: () => undefined } },
      window: { webkitSpeechRecognition: function R() { /* */ }, speechSynthesis: { getVoices: () => [] }, AudioContext: function A() { /* */ } },
    })).toEqual({ recognition: true, synthesis: true, wakeLock: true, mediaSession: true, sound: true });
  });
});

describe('the screen kept on', () => {
  it('holds, is let go when hidden, is taken again in sight, lets go at the end', async () => {
    const d = fakeDoc(), wl = fakeLock(), seen: KeepState[] = [];
    const k = new ScreenKeeper({ navigator: { wakeLock: wl }, document: d }, s => seen.push(s));
    expect(await k.hold()).toBe('held');
    expect(keepSaid(k.now)).toBe('Screen kept on');
    d.visibilityState = 'hidden';
    wl.made[0].fire();
    expect(k.now).toBe('away');
    d.visibilityState = 'visible';
    d.fire();
    await vi.waitFor(() => expect(k.now).toBe('held'));
    expect(wl.request).toHaveBeenCalledTimes(2);
    k.letGo();
    expect(k.now).toBe('off');
    expect(wl.made[1].released).toBe(true);
    expect(d.count).toBe(0);
    expect(seen).toEqual(['held', 'away', 'held', 'off']);
  });
  it('says plainly when the phone will not', async () => {
    const k = new ScreenKeeper({ navigator: {}, document: fakeDoc() }, () => undefined);
    expect(await k.hold()).toBe('unsupported');
    expect(keepSaid(k.now)).toBe('This phone will not keep the screen on — keep it awake yourself');
    const r = new ScreenKeeper({ navigator: { wakeLock: { request: async () => { throw new Error('battery'); } } }, document: fakeDoc() }, () => undefined);
    expect(await r.hold()).toBe('refused');
    expect(keepSaid(r.now)).toMatch(/keep it awake yourself/);
  });
});

function fakeSession(only?: string[]) {
  const h = new Map<string, (() => void) | null>();
  return {
    h,
    playbackState: 'none',
    metadata: undefined as unknown,
    setActionHandler(a: string, f: (() => void) | null) { if (only && !only.includes(a)) throw new Error('not offered'); h.set(a, f); },
  };
}
function fakeAudio(refuse = false) {
  return { loop: false, volume: 1, src: '', played: 0, paused: 0, play: vi.fn(async function (this: void) { if (refuse) throw new Error('needs a gesture'); }), pause: vi.fn() };
}

describe('the headset button', () => {
  it('a press of play, pause or next track is one press; let go clears every action and stops the sound', async () => {
    const ms = fakeSession(), audio = fakeAudio(), press = vi.fn(), seen: ButtonState[] = [];
    const b = new HeadsetButton({ navigator: { mediaSession: ms } }, press, s => seen.push(s), () => audio);
    expect(await b.take()).toBe('ready');
    expect(audio.loop).toBe(true);
    expect(audio.play).toHaveBeenCalled();
    expect(ms.playbackState).toBe('playing');
    for (const a of BUTTON_ACTIONS) ms.h.get(a)?.();
    expect(press).toHaveBeenCalledTimes(BUTTON_ACTIONS.length);
    b.letGo();
    expect([...ms.h.values()].every(f => f === null)).toBe(true);
    expect(audio.pause).toHaveBeenCalled();
    expect(b.now).toBe('off');
    expect(seen).toEqual(['ready', 'off']);
  });
  it('takes what the phone offers — next track missing is no matter', async () => {
    const ms = fakeSession(['play', 'pause']);
    const b = new HeadsetButton({ navigator: { mediaSession: ms } }, () => undefined, () => undefined, () => fakeAudio());
    expect(await b.take()).toBe('ready');
    expect([...ms.h.keys()]).toEqual(['play', 'pause']);
  });
  it('wants a touch when the phone refuses the sound, and is ready after it', async () => {
    const audio = fakeAudio(true);
    const b = new HeadsetButton({ navigator: { mediaSession: fakeSession() } }, () => undefined, () => undefined, () => audio);
    expect(await b.take()).toBe('needs-tap');
    expect(buttonSaid(b.now)).toMatch(/tap the screen once/);
    audio.play.mockImplementation(async () => undefined);
    expect(await b.wake()).toBe('ready');
  });
  it('says plainly when the phone has no media session', async () => {
    const b = new HeadsetButton({ navigator: {} }, () => undefined, () => undefined, () => fakeAudio());
    expect(await b.take()).toBe('unsupported');
    expect(buttonSaid(b.now)).toMatch(/does not pass a headset’s button/);
    const none = new HeadsetButton({ navigator: { mediaSession: fakeSession([]) } }, () => undefined, () => undefined, () => fakeAudio());
    expect(await none.take()).toBe('unsupported');
  });
  it('after it is let go, a late press does nothing', async () => {
    const ms = fakeSession(), press = vi.fn();
    const b = new HeadsetButton({ navigator: { mediaSession: ms } }, press, () => undefined, () => fakeAudio());
    await b.take();
    const play = ms.h.get('play');
    b.letGo();
    play?.();
    expect(press).not.toHaveBeenCalled();
  });
});

describe('before you walk the floor', () => {
  it('says each part yes or no in words', async () => {
    const wl = fakeLock();
    const items = await floorCheck({
      navigator: { permissions: { query: async () => ({ state: 'granted' }) }, wakeLock: wl, mediaSession: { setActionHandler: () => undefined } },
      window: { webkitSpeechRecognition: function R() { /* */ }, speechSynthesis: { getVoices: () => [{ lang: 'en-GB', name: 'Daniel' }] } },
    }, 10);
    expect(items.map(i => [i.key, i.ok])).toEqual([['mic', true], ['recognition', true], ['voice', true], ['wakeLock', true], ['button', true]]);
    expect(items.find(i => i.key === 'voice')?.said).toBe('Yes — Daniel.');
    expect(wl.made[0].released).toBe(true);
  });
  it('a bare phone — every part no, each with what to do', async () => {
    const items = await floorCheck({ navigator: {}, window: {} }, 10);
    expect(items.every(i => !i.ok)).toBe(true);
    expect(items.every(i => i.said.startsWith('No'))).toBe(true);
  });
  it('asks the microphone when the permission is not said, and names an American voice as not British', async () => {
    const stop = vi.fn();
    const items = await floorCheck({
      navigator: { permissions: { query: async () => ({ state: 'prompt' }) }, mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) } },
      window: { speechSynthesis: { getVoices: () => [{ lang: 'en-US', name: 'Samantha' }] } },
    }, 10);
    expect(items[0].ok).toBe(true);
    expect(stop).toHaveBeenCalled();
    expect(items[2]).toMatchObject({ ok: false });
    expect(items[2].said).toMatch(/Samantha \(en-US\)/);
  });
  it('a microphone blocked', async () => {
    const items = await floorCheck({ navigator: { permissions: { query: async () => ({ state: 'denied' }) } }, window: {} }, 10);
    expect(items[0]).toMatchObject({ ok: false });
    expect(items[0].said).toMatch(/blocked/);
  });
});

/* ---------------------------------------------------------------- barge-in: the voice stopped at once */

describe('the voice stopped at once', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  const phone = () => {
    const said: { onend?: () => void; onerror?: () => void; text: string }[] = [];
    const synth = { speaking: false, cancel: vi.fn(), getVoices: () => [{ lang: 'en-GB', name: 'Daniel', default: true }], speak: (u: { onend?: () => void; onerror?: () => void; text: string }) => { said.push(u); } };
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice: unknown; onend?: () => void; onerror?: () => void; constructor(t: string) { this.text = t; } });
    return { said, synth };
  };
  it('finished when said to the end', async () => {
    const { said } = phone();
    const v = await import('../voice');
    const done = vi.fn(), told: boolean[] = [];
    const off = v.onSpeaking(on => told.push(on));
    v.speak('Line 3 has **two** late actions', done);
    expect(v.isSpeaking()).toBe(true);
    expect(said[0].text).toBe('Line 3 has two late actions');
    said[0].onend?.();
    expect(done).toHaveBeenCalledWith(true);
    expect(v.isSpeaking()).toBe(false);
    expect(told).toEqual([true, false]);
    off();
  });
  it('cut short at once, told once, and nothing opens after it — even when the browser fires its end late', async () => {
    const { said, synth } = phone();
    const v = await import('../voice');
    const done = vi.fn();
    v.speak('A long reply about the wrapper', done);
    v.stopSpeaking();
    expect(synth.cancel).toHaveBeenCalled();
    expect(v.isSpeaking()).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(false);
    said[0].onerror?.();
    said[0].onend?.();
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('a new reply cuts the old one short, and the old one’s late end does not stop the new', async () => {
    const { said } = phone();
    const v = await import('../voice');
    const first = vi.fn(), second = vi.fn();
    v.speak('First', first);
    v.speak('Second', second);
    expect(first).toHaveBeenCalledWith(false);
    said[0].onend?.();
    expect(v.isSpeaking()).toBe(true);
    said[1].onend?.();
    expect(second).toHaveBeenCalledWith(true);
  });
});
