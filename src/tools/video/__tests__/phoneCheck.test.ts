/* CAN THIS PHONE FILM A LONG STUDY? (lib/video/phoneCheck) — what a phone was
 * seen to do said a line an ability: read as it films, clips that play on
 * their own, the camera steady, the screen on with the app in front, room,
 * the battery, saved as it goes; the answer above them, and the results to
 * copy without the eighteen thousand places of an hour. */
import { describe, expect, it } from 'vitest';
import { clock, filmsAs, lasting, offersSay, phoneSays, phoneText, type PhoneOffers, type PhoneRun } from '../phoneCheck';
import type { SteadyMark } from '../steady';

const GB = 1024 ** 3, MB = 1024 ** 2;
const offers = (o: Partial<PhoneOffers> = {}): PhoneOffers => ({ recorder: 'video/mp4', wakeLock: true, frameCallback: true, trackProcessor: false, battery: true, storage: { quota: 20 * GB, usage: 1 * GB }, persisted: true, ua: 'test', ...o });
const still = (sec: number, f: (t: number) => Partial<SteadyMark> = () => ({})): SteadyMark[] => Array.from({ length: Math.round(sec / 0.2) }, (_, i) => ({ t: i * 0.2, dx: 0.001, dy: 0, light: 1, ...f(i * 0.2) }));
const run = (o: Partial<PhoneRun> = {}): PhoneRun => ({
  askedSec: 120, ranSec: 120, ended: 'done', sampleSec: 0.2, readWidth: 160, samples: 598, costMs: 14.2, costP95Ms: 24.4, checkMs: 6.1,
  mime: 'video/mp4', bitrate: 1_000_000, clipSec: 30,
  clips: [0, 30, 60, 90].map(at => ({ at, bytes: 3.6 * MB, plays: true, duration: 31 })),
  marks: still(120), wake: { offered: true, held: true, lost: [] }, hidden: [],
  battery: { start: 0.82, end: 0.81, charging: false }, saveMaxMs: 3.4, minutes: [], ...o,
});
const line = (s: ReturnType<typeof phoneSays>, key: string) => s.lines.find(l => l.key === key);

describe('the words it is said in', () => {
  it('times, lengths and the file type', () => {
    expect(clock(75.4)).toBe('1:15');
    expect(lasting(120)).toBe('2 minutes');
    expect(lasting(3600)).toBe('1 hour');
    expect(lasting(5400)).toBe('1 hour 30 minutes');
    expect(filmsAs('video/mp4;codecs=avc1')).toMatch(/^MP4/);
    expect(filmsAs('video/webm;codecs=vp8')).toMatch(/not on an iPhone/);
  });
});

describe('a phone that did everything', () => {
  const s = phoneSays(offers(), run());
  it('says yes, and that two minutes is not an hour', () => {
    expect(s.tone).toBe('g');
    expect(s.headline).toBe('Yes: on this test, this phone did everything a long study needs');
    expect(s.ran).toBe('2 minutes, the whole test');
    expect(s.next).toMatch(/^Run the 1-hour test/);
  });
  it('a line an ability, each with its figures', () => {
    expect(s.lines.map(l => l.key)).toEqual(['reading', 'clips', 'steady', 'screen', 'room', 'battery', 'saving']);
    expect(line(s, 'reading')?.says).toBe('Read as it filmed: 5.0 frames a second, as asked (598 of 601), 14 ms each — 24 ms at the slowest twentieth, and 6 ms more to check the camera is steady.');
    expect(line(s, 'clips')?.says).toMatch(/^Every clip plays on its own: 4 clips, about 3\.6 MB each, filmed as MP4.* — some 432 MB an hour/);
    expect(line(s, 'steady')?.says).toBe('The camera was steady: between frames its picture moved less than 0.05% of its width.');
    expect(line(s, 'screen')).toMatchObject({ tone: 'g', says: 'The screen was kept on for the whole test, and the app stayed in front.' });
    expect(line(s, 'room')?.says).toMatch(/^Room for about 45 hours of clips — 19\.0 GB free to the app\..* The browser has agreed/);
    expect(line(s, 'battery')).toMatchObject({ tone: 'n' });
    expect(line(s, 'battery')?.says).toMatch(/too short to tell how fast it drains/);
    expect(line(s, 'saving')?.says).toBe('The reading so far was saved on the phone every 10 seconds, in 3 ms at the most.');
  });
  it('an hour says how fast the battery goes, and asks for nothing longer', () => {
    const h = phoneSays(offers(), run({ askedSec: 3600, ranSec: 3600, samples: 17950, battery: { start: 1, end: 0.82, charging: false }, marks: still(60) }));
    expect(line(h, 'battery')).toMatchObject({ tone: 'g', says: 'The battery went from 100% to 82% in 1 hour — about 18% an hour, so some 5.6 hours from full.' });
    expect(h.next).toBeUndefined();
  });
});

describe('what stands in the way, said as such', () => {
  it('a phone that falls behind', () => {
    const s = phoneSays(offers(), run({ samples: 372, costMs: 48 }));
    expect(line(s, 'reading')).toMatchObject({ tone: 'a' });
    expect(line(s, 'reading')?.says).toMatch(/^Read 3\.1 frames a second of the 5 asked \(372 of 601\).*a long study on it would read 3 a second\.$/);
    expect(phoneSays(offers(), run({ samples: 200 })).lines[0].tone).toBe('r');
  });
  it('a clip that does not play alone', () => {
    const s = phoneSays(offers(), run({ clips: [{ at: 0, bytes: MB, plays: true }, { at: 30, bytes: MB, plays: false }] }));
    expect(line(s, 'clips')).toMatchObject({ tone: 'r', says: '1 of 2 clips did not play on its own — a long study could not keep its clips on this phone as it is.' });
    expect(s.tone).toBe('r');
    expect(s.headline).toBe('Not yet: 1 thing stands in the way of a long study on this phone');
  });
  it('a camera that shakes, one that is knocked, and the light', () => {
    const shook = phoneSays(offers(), run({ marks: still(120, t => ({ dx: Math.round(t * 5) % 2 ? 0.3 : -0.3 })) }));
    expect(line(shook, 'steady')).toMatchObject({ tone: 'r' });
    expect(line(shook, 'steady')?.says).toMatch(/^The camera shook for 100% of the test — up to 0\.38% of the picture's width between frames\. The reading counts shake as work/);
    const knocked = phoneSays(offers(), run({ marks: still(120, t => (t >= 40 ? { dx: 2.4 } : {})) }));
    expect(line(knocked, 'steady')).toMatchObject({ tone: 'a' });
    expect(line(knocked, 'steady')?.says).toMatch(/^The camera moved at 0:40, by 1\.5% of the picture's width/);
    const lit = phoneSays(offers(), run({ marks: still(120, t => (t >= 60 && t < 80 ? { light: 1.15 } : {})) }));
    expect(line(lit, 'steady')).toMatchObject({ tone: 'g' });
    expect(line(lit, 'steady')?.says).toMatch(/ The light changed by 15% at 1:00\.$/);
  });
  it('the screen: off, the camera stopped, or not kept on', () => {
    const off = phoneSays(offers(), run({ hidden: [{ at: 45, sec: 12 }] }));
    expect(line(off, 'screen')).toMatchObject({ tone: 'r' });
    expect(line(off, 'screen')?.says).toMatch(/^The app went out of sight once — at 0:45 for 12 s — /);
    /* the frames not read while out of sight are not held against the reading */
    expect(line(phoneSays(offers(), run({ hidden: [{ at: 45, sec: 12 }], samples: 539 })), 'reading')?.tone).toBe('g');
    expect(line(phoneSays(offers(), run({ cameraStopped: 50, ended: 'camera', ranSec: 50 })), 'screen')?.says).toMatch(/^The phone stopped the camera at 0:50/);
    const held = phoneSays(offers(), run({ paused: [{ at: 70, sec: 20 }], samples: 500 }));
    expect(line(held, 'screen')).toMatchObject({ tone: 'r', says: 'The phone held the camera back once — at 1:10 for 20 s — a call or another app wanting it, and nothing was read while it was.' });
    expect(line(held, 'reading')?.tone).toBe('g');              // the held-back time not held against the reading
    expect(line(phoneSays(offers({ wakeLock: false }), run({ wake: { offered: false, held: false, lost: [] } })), 'screen')).toMatchObject({ tone: 'a' });
    expect(line(phoneSays(offers(), run({ wake: { offered: true, held: false, error: 'NotAllowedError', lost: [] } })), 'screen')?.says).toMatch(/would not keep the screen on \(NotAllowedError\)/);
  });
  it('room the browser may clear, or none said', () => {
    expect(line(phoneSays(offers({ persisted: false }), run()), 'room')).toMatchObject({ tone: 'a' });
    expect(line(phoneSays(offers({ storage: { quota: 300 * MB, usage: 100 * MB } }), run()), 'room')).toMatchObject({ tone: 'r' });
    expect(line(phoneSays(offers({ storage: undefined }), run()), 'room')).toMatchObject({ tone: 'n', says: 'This browser does not say how much room it gives the app.' });
  });
  it('things to set up are a yes with them', () => {
    const s = phoneSays(offers({ persisted: false }), run({ wake: { offered: false, held: false, lost: [] } }));
    expect(s).toMatchObject({ tone: 'a', headline: 'Yes, with 2 things to set up first' });
  });
  it('stopped part way, and a camera that never opened', () => {
    expect(phoneSays(offers(), run({ ended: 'stopped', ranSec: 35, samples: 175, clips: [] })).ran).toBe('0:35 of the 2 minutes asked — stopped');
    const none = phoneSays(offers(), run({ ended: 'error', error: 'the camera was refused', samples: 0, ranSec: 0, clips: [], marks: [] }));
    expect(none).toMatchObject({ tone: 'r', headline: 'The test could not run: the camera was refused' });
  });
});

describe('before the test, and to send after', () => {
  it('what the phone offers, in four lines', () => {
    expect(offersSay(offers()).map(l => l.says)).toEqual([
      'It films MP4, which plays on every phone and computer.',
      'It can keep the screen on while it films.',
      'It gives the app 19.0 GB free.',
      'It tells the battery level, so the test can say how fast it drains.',
    ]);
    expect(offersSay(offers({ recorder: undefined, wakeLock: false, storage: undefined, battery: false })).map(l => l.tone)).toEqual(['r', 'a', 'n', 'n']);
  });
  it('the results to copy: the words, then every figure but the places', () => {
    const r = run();
    const text = phoneText(offers(), r);
    const [head, ...rest] = text.split('\n\n');
    expect(head.split('\n').slice(0, 3)).toEqual(['Faultline — can this phone film a long study?', 'Yes: on this test, this phone did everything a long study needs (2 minutes, the whole test).', `- Reading as it films: ${phoneSays(offers(), r).lines[0].says}`]);
    const json = JSON.parse(rest.join('\n\n'));
    expect(json.run.samples).toBe(598);
    expect(json.run.marks).toBeUndefined();
    expect(json.steady.windows).toBe(60);
    expect(json.offers.recorder).toBe('video/mp4');
    /* and read back, they say the same */
    expect(phoneSays(json.offers, { ...json.run, marks: [] }, json.steady)).toEqual(phoneSays(offers(), r));
  });
});
