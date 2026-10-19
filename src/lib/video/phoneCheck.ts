/* CAN THIS PHONE FILM A LONG STUDY? (docs/VIDEO-FEASIBILITY.md, the phone)
 *
 * Before the long study is built, each thing it needs is tried on the phone
 * that would film it (Rowland, 19 October: "make sure that the technical
 * abilities are possible.. and then how we achieve them"): the camera read
 * as it films, short clips that play on their own, the camera kept steady,
 * the screen kept on with the app in front, room to keep it, the battery,
 * and the reading saved as it goes. The page (screens/VideoCheckScreen) runs
 * it; this says what it found, a line an ability, in words a site lead can
 * act on, and in figures for whoever builds the long study.
 *
 * Nothing here is a record: a phone's check is not evidence for a change.
 * Nothing is kept or sent; the person copies the results to whoever asked. */
import { steadySummary, type SteadyMark, type SteadySummary } from './steady';

/** What the phone's browser offers, before anything is asked of it. */
export interface PhoneOffers {
  /** the file type the recorder writes — the first of the app's own order (ui/VideoRecorder) */
  recorder?: string;
  wakeLock: boolean;
  frameCallback: boolean;
  trackProcessor: boolean;
  battery: boolean;
  /** what the browser gives the app, and what the app holds, in bytes */
  storage?: { quota: number; usage: number };
  persisted?: boolean;
  cores?: number;
  memoryGB?: number;
  ua: string;
}

export interface PhoneClip { at: number; bytes: number; plays: boolean; duration?: number }
export interface PhoneMinute { minute: number; samples: number; costMs: number; battery?: number; hidden: boolean }

/** What one run of the test saw. Times are seconds from its start. */
export interface PhoneRun {
  askedSec: number;
  ranSec: number;
  ended: 'done' | 'stopped' | 'camera' | 'error';
  error?: string;
  camera?: { width: number; height: number; frameRate?: number; label?: string };
  sampleSec: number;
  readWidth: number;
  samples: number;
  costMs: number;
  costP95Ms: number;
  /** the steady check's own time a sample */
  checkMs: number;
  mime?: string;
  bitrate: number;
  clipSec: number;
  clips: PhoneClip[];
  marks: SteadyMark[];
  wake: { offered: boolean; held: boolean; error?: string; lost: number[] };
  hidden: { at: number; sec: number }[];
  /** the camera's picture held back by the phone while the app was in sight (a call, another app taking the camera) */
  paused?: { at: number; sec: number }[];
  cameraStopped?: number;
  battery?: { start: number; end: number; charging: boolean };
  saveMaxMs?: number;
  saveFailed?: string;
  minutes: PhoneMinute[];
}

export type Tone = 'g' | 'a' | 'r' | 'n';
export interface PhoneLine { key: 'reading' | 'clips' | 'steady' | 'screen' | 'room' | 'battery' | 'saving'; what: string; says: string; tone: Tone }
export interface PhoneSays { headline: string; tone: Tone; ran: string; next?: string; lines: PhoneLine[]; steady: SteadySummary }

export const clock = (sec: number) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const mb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${(b / 1024 ** 2).toFixed(b < 10 * 1024 ** 2 ? 1 : 0)} MB`);
/** "2 minutes", "1 hour", "1 hour 30 minutes" */
export function lasting(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 1) return `${Math.round(sec)} seconds`;
  const h = Math.floor(m / 60), r = m % 60;
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '', ms = r ? `${r} minute${r === 1 ? '' : 's'}` : '';
  return [hs, ms].filter(Boolean).join(' ');
}
/** The file type in words, and where it plays. */
export function filmsAs(mime?: string): string {
  if (!mime) return 'nothing — this browser cannot record video in the app';
  if (mime.startsWith('video/mp4')) return 'MP4, which plays on every phone and computer';
  if (mime.startsWith('video/webm')) return 'WebM, which plays on Chrome and Android but not on an iPhone or in Safari';
  return mime;
}

/** The clips' bytes an hour, from what was written — or the 1 Mbps the test asks for. */
const clipBytesAnHour = (run: PhoneRun) => {
  const done = run.clips.filter(c => c.bytes > 0);
  return done.length ? (done.reduce((s, c) => s + c.bytes, 0) / done.length) / run.clipSec * 3600 : run.bitrate / 8 * 3600;
};

/** Each ability as a line, and the answer above them. The camera's summary
 *  is worked out from the run's places unless it is given (the results copied
 *  carry the summary, not the places). */
export function phoneSays(offers: PhoneOffers, run: PhoneRun, steady: SteadySummary = steadySummary(run.marks)): PhoneSays {
  const lines: PhoneLine[] = [];
  const paused = run.paused ?? [];
  const hiddenSec = [...run.hidden, ...paused].reduce((s, h) => s + h.sec, 0);
  const pctOf = (px: number) => (px / run.readWidth) * 100;
  const width = (px: number) => `${pctOf(px).toFixed(pctOf(px) < 1 ? 2 : 1)}% of the picture's width`;
  const atMost = (px: number) => (pctOf(px) < 0.05 ? 'less than 0.05% of its width' : `at most ${pctOf(px).toFixed(2)}% of its width`);

  /* reading as it films */
  {
    const asked = 1 / run.sampleSec;
    /* a frame at the start, and one every sample after, while it was in sight */
    const expected = Math.floor(Math.max(0, run.ranSec - hiddenSec) / run.sampleSec) + 1;
    const share = run.samples / expected;
    const rate = run.samples / Math.max(1, run.ranSec - hiddenSec);
    const each = `${Math.round(run.costMs)} ms each — ${Math.round(run.costP95Ms)} ms at the slowest twentieth, and ${Math.round(run.checkMs)} ms more to check the camera is steady`;
    lines.push(run.samples === 0
      ? { key: 'reading', what: 'Reading as it films', says: 'Nothing was read: the camera gave no picture.', tone: 'r' }
      : share >= 0.95
        ? { key: 'reading', what: 'Reading as it films', says: `Read as it filmed: ${rate.toFixed(1)} frames a second, as asked (${Math.min(run.samples, expected)} of ${expected}), ${each}.`, tone: 'g' }
        : { key: 'reading', what: 'Reading as it films', says: `Read ${rate.toFixed(1)} frames a second of the ${asked} asked (${run.samples} of ${expected}), ${each}: the phone fell behind, and a long study on it would read ${Math.max(1, Math.floor(rate))} a second.`, tone: share >= 0.6 ? 'a' : 'r' });
  }

  /* clips that play on their own */
  {
    const bad = run.clips.filter(c => !c.plays);
    const done = run.clips.filter(c => c.bytes > 0);
    const each = done.length ? done.reduce((s, c) => s + c.bytes, 0) / done.length : 0;
    lines.push(!run.mime
      ? { key: 'clips', what: `Clips of ${run.clipSec} seconds`, says: 'This browser cannot record video in the app, so a long study cannot keep clips on this phone.', tone: 'r' }
      : !run.clips.length
        ? { key: 'clips', what: `Clips of ${run.clipSec} seconds`, says: `No clip was finished — a clip is ${run.clipSec} seconds and the test ran ${clock(run.ranSec)}.`, tone: 'n' }
        : bad.length
          ? { key: 'clips', what: `Clips of ${run.clipSec} seconds`, says: `${bad.length} of ${run.clips.length} clip${run.clips.length === 1 ? '' : 's'} did not play on ${bad.length === 1 ? 'its' : 'their'} own — a long study could not keep its clips on this phone as it is.`, tone: 'r' }
          : { key: 'clips', what: `Clips of ${run.clipSec} seconds`, says: `Every clip plays on its own: ${run.clips.length} clip${run.clips.length === 1 ? '' : 's'}, about ${mb(each)} each, filmed as ${filmsAs(run.mime)} — some ${mb(clipBytesAnHour(run))} an hour if every one were kept.`, tone: 'g' });
  }

  /* the camera, as it was set up */
  {
    const light = steady.lightAt !== undefined ? ` The light changed by ${Math.round(Math.abs(steady.lightBy ?? 0) * 100)}% at ${clock(steady.lightAt)}.` : '';
    lines.push(!steady.windows
      ? { key: 'steady', what: 'The camera, as it was set up', says: 'Too short to tell whether the camera was steady.', tone: 'n' }
      : steady.shaking >= 0.2
        ? { key: 'steady', what: 'The camera, as it was set up', says: `The camera shook for ${Math.round(steady.shaking * 100)}% of the test — up to ${width(steady.shakeMax)} between frames. The reading counts shake as work: fix the phone to something that does not move with the line.${light}`, tone: 'r' }
        : steady.movedAt !== undefined
          ? { key: 'steady', what: 'The camera, as it was set up', says: `The camera moved at ${clock(steady.movedAt)}, by ${width(steady.movedBy ?? 0)} — knocked, sinking or picked up. After a move, check the stations still sit where they should.${light}`, tone: 'a' }
          : steady.shaking > 0
            ? { key: 'steady', what: 'The camera, as it was set up', says: `The camera shook now and then — ${Math.round(steady.shaking * 100)}% of the test, up to ${width(steady.shakeMax)} between frames. Something nearby is moving it.${light}`, tone: 'a' }
            : { key: 'steady', what: 'The camera, as it was set up', says: `The camera was steady: between frames its picture moved ${atMost(steady.shakeMax)}.${light}`, tone: 'g' });
  }

  /* the screen kept on, the app in front */
  {
    const n = run.hidden.length;
    lines.push(run.cameraStopped !== undefined
      ? { key: 'screen', what: 'The screen and the app', says: `The phone stopped the camera at ${clock(run.cameraStopped)} and the test ended there — on a long study the phone has to stay unlocked with the app in front.`, tone: 'r' }
      : n
        ? { key: 'screen', what: 'The screen and the app', says: `The app went out of sight ${n === 1 ? 'once' : `${n} times`} — at ${run.hidden.slice(0, 3).map(h => `${clock(h.at)} for ${Math.round(h.sec)} s`).join(', ')}${n > 3 ? ' …' : ''} — the screen went off or another app came in front, and nothing was read while it was.`, tone: 'r' }
        : paused.length
          ? { key: 'screen', what: 'The screen and the app', says: `The phone held the camera back ${paused.length === 1 ? 'once' : `${paused.length} times`} — at ${paused.slice(0, 3).map(h => `${clock(h.at)} for ${Math.round(h.sec)} s`).join(', ')}${paused.length > 3 ? ' …' : ''} — a call or another app wanting it, and nothing was read while it was.`, tone: 'r' }
        : !run.wake.offered
          ? { key: 'screen', what: 'The screen and the app', says: 'The app stayed in front, but this browser cannot keep the screen on by itself — for a long study set the phone’s auto-lock to Never.', tone: 'a' }
          : !run.wake.held
            ? { key: 'screen', what: 'The screen and the app', says: `The app stayed in front, but the phone would not keep the screen on${run.wake.error ? ` (${run.wake.error})` : ''} — for a long study set its auto-lock to Never.`, tone: 'a' }
            : run.wake.lost.length
              ? { key: 'screen', what: 'The screen and the app', says: `The screen was kept on, but the phone let go of it at ${clock(run.wake.lost[0])} — for a long study set its auto-lock to Never as well.`, tone: 'a' }
              : { key: 'screen', what: 'The screen and the app', says: 'The screen was kept on for the whole test, and the app stayed in front.', tone: 'g' });
  }

  /* room to keep it */
  {
    if (!offers.storage) lines.push({ key: 'room', what: 'Room on the phone', says: 'This browser does not say how much room it gives the app.', tone: 'n' });
    else {
      const free = Math.max(0, offers.storage.quota - offers.storage.usage);
      const hours = free / clipBytesAnHour(run);
      const kept = offers.persisted ? ' The browser has agreed to keep what the app holds.' : ' The browser may clear what the app holds if the phone runs short of room.';
      lines.push({ key: 'room', what: 'Room on the phone', says: `Room for about ${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hours of clips — ${mb(free)} free to the app. A long study keeps only the clips it needs.${kept}`, tone: hours < 1 ? 'r' : hours >= 8 && offers.persisted ? 'g' : 'a' });
    }
  }

  /* the battery */
  {
    const b = run.battery;
    if (!b) lines.push({ key: 'battery', what: 'The battery', says: 'This browser does not tell the battery level (an iPhone never does) — note it at the start and the end yourself.', tone: 'n' });
    else if (run.ranSec < 300) lines.push({ key: 'battery', what: 'The battery', says: `${Math.round(b.start * 100)}% at the start, ${Math.round(b.end * 100)}% at the end${b.charging ? ', on charge' : ''} — too short to tell how fast it drains; the 30-minute test tells.`, tone: 'n' });
    else {
      const perHour = ((b.start - b.end) * 100) / (run.ranSec / 3600);
      lines.push({ key: 'battery', what: 'The battery', says: perHour <= 0
        ? `${Math.round(b.start * 100)}% at the start, ${Math.round(b.end * 100)}% after ${lasting(run.ranSec)}${b.charging ? ', on charge' : ''} — it did not go down.`
        : `The battery went from ${Math.round(b.start * 100)}% to ${Math.round(b.end * 100)}% in ${lasting(run.ranSec)} — about ${Math.round(perHour)}% an hour${b.charging ? ', on charge' : ''}, so some ${(100 / perHour).toFixed(1)} hours from full.`, tone: perHour > 25 ? 'a' : 'g' });
    }
  }

  /* the reading saved as it goes */
  lines.push(run.saveFailed
    ? { key: 'saving', what: 'Saving as it goes', says: `The reading could not be saved on the phone as it went (${run.saveFailed}) — a test stopped part way would lose it.`, tone: 'r' }
    : run.saveMaxMs === undefined
      ? { key: 'saving', what: 'Saving as it goes', says: 'The test ran too short to save the reading as it went.', tone: 'n' }
      : { key: 'saving', what: 'Saving as it goes', says: `The reading so far was saved on the phone every 10 seconds, in ${Math.max(1, Math.round(run.saveMaxMs))} ms at the most.`, tone: 'g' });

  const red = lines.filter(l => l.tone === 'r').length, amber = lines.filter(l => l.tone === 'a').length;
  const ran = run.ended === 'done' ? `${lasting(run.ranSec)}, the whole test` : `${clock(run.ranSec)} of the ${lasting(run.askedSec)} asked — ${run.ended === 'camera' ? 'the phone stopped the camera' : run.ended === 'error' ? 'it could not go on' : 'stopped'}`;
  const headline = run.ended === 'error' && !run.samples
    ? `The test could not run: ${run.error ?? 'the camera did not open'}`
    : red ? `Not yet: ${red} thing${red === 1 ? '' : 's'} stand${red === 1 ? 's' : ''} in the way of a long study on this phone`
      : amber ? `Yes, with ${amber} thing${amber === 1 ? '' : 's'} to set up first`
        : 'Yes: on this test, this phone did everything a long study needs';
  const tone: Tone = run.ended === 'error' && !run.samples ? 'r' : red ? 'r' : amber ? 'a' : 'g';
  const next = run.ranSec < 25 * 60 ? 'Run the 1-hour test, with the phone where it would film the line, to see the battery, the heat and the screen over a long study.' : undefined;
  return { headline, tone, ran, ...(next ? { next } : {}), lines, steady };
}

/** What the phone offers, before the test — four lines a person can act on. */
export function offersSay(o: PhoneOffers): PhoneLine[] {
  return [
    { key: 'clips', what: 'It films', says: o.recorder ? `It films ${filmsAs(o.recorder)}.` : 'It cannot record video in the app.', tone: o.recorder ? 'g' : 'r' },
    { key: 'screen', what: 'The screen', says: o.wakeLock ? 'It can keep the screen on while it films.' : 'It cannot keep the screen on by itself — for a long study set the phone’s auto-lock to Never.', tone: o.wakeLock ? 'g' : 'a' },
    { key: 'room', what: 'Room', says: o.storage ? `It gives the app ${mb(Math.max(0, o.storage.quota - o.storage.usage))} free.` : 'It does not say how much room it gives the app.', tone: o.storage ? 'g' : 'n' },
    { key: 'battery', what: 'The battery', says: o.battery ? 'It tells the battery level, so the test can say how fast it drains.' : 'It does not tell the battery level — note it yourself at the start and the end.', tone: o.battery ? 'g' : 'n' },
  ];
}

/** The results to copy and send: the words, then every figure (the places
 *  themselves left out — an hour is eighteen thousand of them). */
export function phoneText(o: PhoneOffers, run: PhoneRun, says: PhoneSays = phoneSays(o, run)): string {
  const { marks: _marks, ...figures } = run;
  return [
    'Faultline — can this phone film a long study?',
    `${says.headline} (${says.ran}).`,
    ...says.lines.map(l => `- ${l.what}: ${l.says}`),
    ...(says.next ? [says.next] : []),
    '',
    JSON.stringify({ offers: o, run: figures, steady: says.steady }, null, 1),
  ].join('\n');
}
