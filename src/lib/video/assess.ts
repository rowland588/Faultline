/* IS THIS FOOTAGE FIT FOR THE STUDY? (docs/VIDEO-DESIGN.md, D6–D7)
 *
 * Footage is assessed against what the study needs before anything in it is
 * trusted: the camera's steadiness and the light (from the quick scan as it
 * comes in, then from every frame the reading reads), how the phone was
 * placed as the person says it, the frame rate, how wide each station is in
 * the picture, how much it holds, and — once read and reviewed — whether
 * every station showed movement, whether enough whole cycles were filmed for
 * their spread, and how much is still to review. Each check says what it
 * found and what that means. Then, measure by measure from the study's
 * catalogue entry (lib/video/objectives), what this footage lets be
 * measured, worked out, only interpreted, or not measured at all — and why.
 *
 * It never refuses: footage that does not suit can still be kept and marked
 * by hand, and its figures and paper say it did not suit. Pure. */
import { MIN_CYCLES } from '../ie/balance';
import { CLAIM_WORD, METHODS, OBJECTIVES, READINESS_WORD, VIEWPOINTS, type Claim, type Viewpoint } from './objectives';
import { steadySummary, steadyWindows, type SteadyMark } from './steady';
import { KIND_WORD, type EventFlag, type FootageScan, type ReadingQuality, type VideoEvent, type VideoFacts, type VideoStudyKind, type VideoZone } from './record';
import type { Signal } from './detect';
import type { VideoStudyFigures } from './study';

export const QUALITY_VERSION = 'quality-1';
/** A jump in the light from one frame read to the next, as a share of its brightness. */
export const LIGHT_JUMP = 0.06;

const clock = (sec: number) => { const s = Math.max(0, sec); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`; };
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Spans joined where they touch or overlap. */
function join(spans: [number, number][], gap = 0): [number, number][] {
  const s = [...spans].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const x of s) {
    const last = out[out.length - 1];
    if (last && x[0] <= last[1] + gap) last[1] = Math.max(last[1], x[1]);
    else out.push([x[0], x[1]]);
  }
  return out;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** WHAT THE READING FOUND ABOUT THE FOOTAGE ITSELF, from the steadiness and
 *  the brightness it tracked on every frame (lib/video/extract readSignal). */
export function qualityOf(sig: Pick<Signal, 'times' | 'steady' | 'bright'>, sampleSec: number): ReadingQuality | undefined {
  const marks: SteadyMark[] = sig.steady ?? [];
  const bright = sig.bright ?? [];
  if (!marks.length && !bright.length) return undefined;
  const s = steadySummary(marks);
  const ws = steadyWindows(marks);
  const span = 10 * sampleSec;
  const shakingSpans = join(ws.filter(w => w.word === 'shaking').map(w => [w.at, w.at + span] as [number, number]));
  const light: [number, number][] = [];
  for (let i = 1; i < bright.length; i++) {
    const a = bright[i - 1], b = bright[i];
    if (a > 1 && Math.abs(b - a) / a > LIGHT_JUMP) light.push([sig.times[i - 1] ?? 0, sig.times[i] ?? 0]);
  }
  const lightSpans = join(light, sampleSec);
  const mean = bright.length ? bright.reduce((t, x) => t + x, 0) / bright.length : 0;
  return {
    version: QUALITY_VERSION, sampleSec, windows: s.windows, shaking: r3(s.shaking), moved: r3(s.moved), shakeMax: r3(s.shakeMax),
    ...(s.movedAt !== undefined ? { movedAt: r3(s.movedAt), movedBy: r3(s.movedBy ?? 0) } : {}),
    shakingSpans: shakingSpans.map(([a, b]) => [r3(a), r3(b)]), lightSpans: lightSpans.map(([a, b]) => [r3(a), r3(b)]),
    brightness: { mean: Math.round(mean * 10) / 10, min: bright.length ? Math.min(...bright) : 0, max: bright.length ? Math.max(...bright) : 0 },
  };
}

const overlaps = (e: { start: number; end: number }, [a, b]: [number, number]) => e.start < b && e.end > a;

/** Each event flagged by what the footage was doing while it happened — the
 *  camera shaking, the light jumping, after the camera moved. A fact about
 *  the footage at that time, kept beside the event, never deciding it. */
export function flagEvents(events: readonly VideoEvent[], q: ReadingQuality | undefined): VideoEvent[] {
  if (!q) return [...events];
  return events.map(e => {
    const flags: EventFlag[] = [];
    if (q.shakingSpans.some(s => overlaps(e, s))) flags.push('shaking');
    if (q.movedAt !== undefined && q.moved > 0 && e.start >= q.movedAt) flags.push('moved');
    if (q.lightSpans.some(s => overlaps(e, s))) flags.push('light');
    const { flags: _old, ...rest } = e;
    return flags.length ? { ...rest, flags } : rest;
  });
}

export type CheckStatus = 'ok' | 'caution' | 'fail' | 'unknown';
export interface Check {
  id: string; what: string; status: CheckStatus; found: string; means: string;
  /** What was found, in a few words — for the headline and the claims it stops. */
  brief?: string;
}
export interface Verdict { what: string; claim: Claim; word: string; why: string }
export interface Assessment {
  verdict: 'suitable' | 'limits' | 'unsuitable' | 'not-yet';
  headline: string;
  checks: Check[];
  verdicts: Verdict[];
  /** How much of the footage the camera and the light were checked over. */
  scope: 'not checked' | 'a stretch' | 'every frame read';
}

export interface AssessInput {
  kind: VideoStudyKind;
  facts: Pick<VideoFacts, 'durationSec' | 'width' | 'height' | 'fps'>;
  zones: readonly VideoZone[];
  /** Where the phone was, as the person said it. */
  view?: Viewpoint;
  cycleHintSec?: number;
  scan?: FootageScan;
  quality?: ReadingQuality;
  /** Worked out from the events, once read (lib/video/study videoFigures). */
  figures?: VideoStudyFigures;
  /** The events found and marked — to say which stations showed nothing. */
  events?: readonly VideoEvent[];
  /** Whether it has been read with this reading's settings. */
  read?: boolean;
}

/** Below this many source pixels a station is too narrow to read; below the second, read with care (ten stations at 64 px each read fine). */
const NARROW = 32, SNUG = 64;

export function assessFootage(i: AssessInput): Assessment {
  const o = OBJECTIVES[i.kind];
  const name = KIND_WORD[i.kind];
  const checks: Check[] = [];

  /* what Faultline can do for this study at all */
  checks.push({ id: 'study', what: 'What Faultline measures for it', status: o.readiness === 'measured' ? 'ok' : o.readiness === 'partly' ? 'caution' : 'fail',
    found: READINESS_WORD[o.readiness], means: `${o.today}${o.meanwhile && o.readiness !== 'measured' ? ` Meanwhile: ${o.meanwhile.tool} — ${o.meanwhile.why}.` : ''}` });

  /* where the phone was */
  if (!i.view) checks.push({ id: 'view', what: 'Where the phone was', status: 'unknown', found: 'Not said', means: `It wants ${VIEWPOINTS[o.view].name.toLowerCase()} — ${VIEWPOINTS[o.view].place.toLowerCase()}.` });
  else if (o.never.includes(i.view)) checks.push({ id: 'view', what: 'Where the phone was', status: 'fail', found: VIEWPOINTS[i.view].name, brief: VIEWPOINTS[i.view].name.toLowerCase(), means: `It cannot be timed from ${VIEWPOINTS[i.view].name.toLowerCase()}: ${VIEWPOINTS[i.view].why}. Film it ${VIEWPOINTS[o.view].name.toLowerCase()} — ${VIEWPOINTS[o.view].place.toLowerCase()}.` });
  else if (i.view === o.view || o.alsoFine.includes(i.view)) checks.push({ id: 'view', what: 'Where the phone was', status: 'ok', found: VIEWPOINTS[i.view].name, means: `Right for it: ${VIEWPOINTS[i.view].why}.` });
  else checks.push({ id: 'view', what: 'Where the phone was', status: 'caution', found: VIEWPOINTS[i.view].name, means: `Not the view it wants — ${VIEWPOINTS[o.view].name.toLowerCase()}: ${VIEWPOINTS[o.view].why}. Check every station is in view and not hidden.` });

  /* the camera's steadiness — every frame read, or the stretch looked at as it came in */
  const st = i.quality ?? i.scan?.steady;
  const scope: Assessment['scope'] = i.quality ? 'every frame read' : i.scan ? 'a stretch' : 'not checked';
  const over = i.quality ? 'over every frame read' : i.scan ? `over ${Math.round((i.scan.stretch[1] - i.scan.stretch[0]))} s looked at as it came in (${clock(i.scan.stretch[0])}–${clock(i.scan.stretch[1])})` : '';
  const width = (px: number) => `${((px / 160) * 100).toFixed(1)}% of the picture’s width`;
  if (!st || !st.windows) checks.push({ id: 'steady', what: 'The camera', status: 'unknown', found: 'Not checked yet', means: 'It is checked on every frame as the footage is read.' });
  else if (st.shaking >= 0.2) checks.push({ id: 'steady', what: 'The camera', status: 'fail', found: `Shook for ${pct(st.shaking)} of the time ${over}, up to ${width(st.shakeMax)} between frames`, brief: `shook for ${pct(st.shaking)} of the time`, means: 'Movement of the camera is read as work, so times from this footage cannot be trusted. Film again with the phone fixed to a stand or a shelf, not in the hand.' });
  else if (st.shaking > 0) checks.push({ id: 'steady', what: 'The camera', status: 'caution', found: `Shook for ${pct(st.shaking)} of the time ${over}`, means: 'Events while it shook are flagged — review those closely before accepting them.' });
  else if (st.movedAt !== undefined) checks.push({ id: 'steady', what: 'The camera', status: 'caution', found: `Moved at ${clock(st.movedAt)}, by ${width(st.movedBy ?? 0)}`, means: 'Knocked, sinking or picked up: the stations may sit off their boxes after it — check them, and the events after it are flagged.' });
  else checks.push({ id: 'steady', what: 'The camera', status: 'ok', found: `Steady ${over}`, means: 'Movement in the picture is the work, not the camera.' });

  /* the light */
  const br = i.quality?.brightness ?? i.scan?.brightness;
  const jumps = i.quality?.lightSpans.length ?? 0;
  if (!br) checks.push({ id: 'light', what: 'The light', status: 'unknown', found: 'Not checked yet', means: 'It is checked as the footage is read.' });
  else if (br.mean < 50) checks.push({ id: 'light', what: 'The light', status: 'caution', found: `Dark — ${Math.round(br.mean)} of 255 on average`, means: 'A dark picture’s grain can read as movement and hides the work: light the work, or film nearer a lamp.' });
  else if (br.mean > 220) checks.push({ id: 'light', what: 'The light', status: 'caution', found: `Washed out — ${Math.round(br.mean)} of 255 on average`, means: 'Bright areas lose the detail movement is read from: turn the phone from the light, or lock its exposure on the work.' });
  else if (jumps) checks.push({ id: 'light', what: 'The light', status: 'caution', found: `Jumped ${jumps} time${jumps === 1 ? '' : 's'} (${i.quality?.lightSpans.slice(0, 3).map(s => clock(s[0])).join(', ')}${jumps > 3 ? ' …' : ''})`, means: 'A sudden change of light reads as movement at every station at once — events there are flagged.' });
  else checks.push({ id: 'light', what: 'The light', status: 'ok', found: `Steady, ${Math.round(br.mean)} of 255 on average${i.quality ? '' : ' at the moments looked at'}`, means: 'Enough to see the work by.' });

  /* the frame rate */
  if (!i.facts.fps) checks.push({ id: 'fps', what: 'Frames a second', status: 'unknown', found: 'Could not be read', means: 'The reading reads the frames it is asked for whatever the rate.' });
  else if (i.facts.fps < o.minFps) checks.push({ id: 'fps', what: 'Frames a second', status: 'caution', found: `${i.facts.fps} a second`, means: `It wants at least ${o.minFps}: a boundary is known only to the nearest ${(1 / i.facts.fps).toFixed(2)} s.` });
  else checks.push({ id: 'fps', what: 'Frames a second', status: 'ok', found: `${i.facts.fps} a second`, means: `Enough — it wants ${o.minFps}.` });

  /* how wide each station is in the footage */
  if (i.zones.length && i.facts.width > 0) {
    const narrow = i.zones.map(z => ({ z, px: Math.round((z.x1 - z.x0) * i.facts.width) })).sort((a, b) => a.px - b.px)[0];
    const many = o.maxZones && i.zones.length > o.maxZones;
    checks.push({ id: 'size', what: 'Each station in the picture', status: narrow.px < NARROW ? 'fail' : narrow.px < SNUG || many ? 'caution' : 'ok',
      brief: `${narrow.z.label} only ${narrow.px} pixels wide`,
      found: `${i.zones.length} station${i.zones.length === 1 ? '' : 's'}; the narrowest, ${narrow.z.label}, ${narrow.px} pixels wide`,
      means: narrow.px < NARROW ? 'Too narrow to read movement in: film closer, or fewer stations to a camera.'
        : many ? `More than one camera holds for it (${o.maxZones}) — film them in groups, each its own study.`
          : narrow.px < SNUG ? `Narrower than the ${SNUG} pixels the reading has been measured at — read it with care.` : 'Wide enough to read.' });
  }

  /* how long — before reading from the cycle the person gave, after it from the cycles found */
  const timed = i.figures?.stations.filter(s => s.workTime) ?? [];
  if (o.wholeEvent) checks.push({ id: 'length', what: 'How long it runs', status: 'unknown', found: `${clock(i.facts.durationSec)}`, means: `It should be ${o.wholeEvent}: check it is.` });
  else if (o.minCycles && i.figures && timed.length) {
    /* the cycles each station needs, from its own spread (lib/video/study, lib/ie/balance) — the same number its row says */
    const short = timed.filter(s => !s.enough).map(s => ({ s, n: s.workTime?.n ?? 0, need: s.needed ?? MIN_CYCLES }));
    checks.push({ id: 'length', what: 'Enough cycles', status: short.length ? 'caution' : 'ok',
      found: short.length ? short.map(x => `${x.s.zone.label}: ${x.n} whole cycle${x.n === 1 ? '' : 's'} of ${x.need} needed`).join('; ') : 'Every station has the whole cycles its spread needs',
      means: short.length ? 'Its mean is less sure than ±5% at 95% — film longer, or accept more of what was found.' : 'Each station’s mean is known to within 5% at 95%.' });
  } else if (o.minCycles && i.cycleHintSec) {
    const need = (o.minCycles + 2) * i.cycleHintSec;
    checks.push({ id: 'length', what: 'How long it runs', status: i.facts.durationSec >= need ? 'ok' : 'caution', found: `${clock(i.facts.durationSec)} for a cycle of about ${Math.round(i.cycleHintSec)} s`,
      means: i.facts.durationSec >= need ? `Room for the ${o.minCycles} whole cycles it needs.` : (() => { const n = Math.max(0, Math.floor(i.facts.durationSec / i.cycleHintSec) - 1); return `About ${n} whole cycle${n === 1 ? '' : 's'} — it needs ${o.minCycles}: film longer.`; })() });
  } else if (o.minSec) checks.push({ id: 'length', what: 'How long it runs', status: i.facts.durationSec >= o.minSec ? 'ok' : 'caution', found: clock(i.facts.durationSec),
    means: i.facts.durationSec >= o.minSec ? 'Long enough for it.' : `It wants at least ${Math.round(o.minSec / 60)} minutes to see the stops or waits that matter.` });
  else checks.push({ id: 'length', what: 'How long it runs', status: 'unknown', found: clock(i.facts.durationSec), means: 'How many cycles it holds is known once it is read.' });

  /* once read: every station seen, and what is still to review */
  if (i.figures && i.read) {
    const quiet = i.zones.filter(z => !(i.events ?? []).some(e => e.zone === z.id && e.review !== 'rejected'));
    if (quiet.length) checks.push({ id: 'seen', what: 'Movement at every station', status: 'caution', found: `None found at ${quiet.map(z => z.label).join(', ')}`, means: 'Check its box sits on the work — or nothing happened there while it was filmed.' });
    const f = i.figures;
    const all = f.accepted + f.candidates;
    if (all) checks.push({ id: 'review', what: 'Reviewed by a person', status: f.candidates ? 'caution' : 'ok', found: `${f.accepted} of ${all} confirmed${f.rejected ? `, ${f.rejected} rejected` : ''}`,
      means: f.candidates ? 'The figures count only what is confirmed until the rest is reviewed.' : 'Every observation counted has been confirmed on the footage.' });
  }

  /* what can be claimed, measure by measure */
  const fails = checks.filter(c => c.id !== 'study' && c.status === 'fail');
  const blocked = fails.find(c => c.id === 'steady' || c.id === 'view' || c.id === 'size');
  const cautions = checks.filter(c => c.id !== 'study' && c.status === 'caution');
  const verdicts: Verdict[] = o.measures.map(m => {
    let claim: Claim = m.claim;
    let why = m.note ?? (m.method ? `${METHODS[m.method].name} — ${METHODS[m.method].technique}; ${METHODS[m.method].shown}` : 'Arithmetic on what is confirmed.');
    if ((claim === 'measured' || claim === 'worked-out') && blocked) { claim = 'not-measurable'; why = `Not from this footage — ${blocked.what.toLowerCase()}: ${blocked.brief ?? blocked.found.toLowerCase()} (above).`; }
    else if (claim === 'measured' && cautions.length) why = `${why}. With care: ${cautions.map(c => `${c.what.toLowerCase()} — ${c.found.toLowerCase()}`).join('; ')}.`;
    else if (claim === 'not-yet' && m.method) why = `${METHODS[m.method].name} (${METHODS[m.method].technique}) is not built yet${m.note ? ` — ${m.note}` : ''}.`;
    return { what: m.what, claim, word: CLAIM_WORD[claim], why };
  });

  const verdict: Assessment['verdict'] = o.readiness === 'not-yet' ? 'not-yet' : fails.length ? 'unsuitable' : cautions.length || o.readiness === 'partly' ? 'limits' : 'suitable';
  const headline = verdict === 'not-yet'
    ? `Faultline cannot measure ${name.toLowerCase()} from footage yet — keep the footage here${o.meanwhile ? `, and use ${o.meanwhile.tool} meanwhile` : ''}.`
    : verdict === 'unsuitable' ? `This footage cannot be timed for ${name.toLowerCase()}: ${fails[0].what.toLowerCase()} — ${fails[0].brief ?? `${fails[0].found.charAt(0).toLowerCase()}${fails[0].found.slice(1)}`}.`
      : verdict === 'limits' ? `This footage suits ${name.toLowerCase()}, with ${cautions.length || 1} thing${(cautions.length || 1) === 1 ? '' : 's'} to watch.`
        : `This footage suits ${name.toLowerCase()}.`;
  return { verdict, headline: scope === 'a stretch' && verdict !== 'not-yet' ? `${headline} Checked on a stretch so far — every frame is checked as it is read.` : headline, checks, verdicts, scope };
}
