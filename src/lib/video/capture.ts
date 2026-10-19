/* HOW TO FILM IT — the plan for a study before the phone is set up
 * (docs/VIDEO-DESIGN.md, D5).
 *
 * From the study chosen (lib/video/objectives): where the phone goes and
 * why, what must be in the picture, how long to film — worked out from the
 * cycles needed and the cycle, when the person knows roughly how long one
 * is — the phone's settings, keeping it still, the light, and the people:
 * telling them, no sound, the work not the faces, hygiene. What the study
 * will measure, what it will only interpret and what it cannot, so nobody
 * films an hour for a figure footage cannot give. Pure. */
import { VIDEO_LIMITS } from './validate';
import { CLAIM_WORD, OBJECTIVES, READINESS_WORD, VIEWPOINTS, type Claim } from './objectives';
import { KIND_WORD, type VideoStudyKind } from './record';

export interface CapturePlan {
  kind: VideoStudyKind;
  name: string;
  question: string;
  readiness: string;
  today: string;
  /** Where the phone goes. */
  view: { name: string; place: string; why: string };
  alsoFine: string[];
  /** Views that cannot be used for it, and why. */
  never: string[];
  framing: string[];
  /** How long to film, and the arithmetic behind it. */
  length: { sec?: number; says: string };
  settings: string[];
  still: string[];
  light: string[];
  people: string[];
  measures: { what: string; claim: Claim; word: string; note?: string }[];
  cannot: string[];
  meanwhile?: { tool: string; path: string; why: string };
  /** Said when the study is longer than one study takes. */
  tooLong?: string;
}

const mins = (s: number) => (s >= 90 ? `${Math.round(s / 60)} minutes` : `${Math.round(s)} seconds`);

export function capturePlan(kind: VideoStudyKind, ctx: { cycleSec?: number; stations?: number } = {}): CapturePlan {
  const o = OBJECTIVES[kind];
  const v = VIEWPOINTS[o.view];
  /* how long: whole cycles of the slowest station and one either side, or the minutes the study needs */
  let length: CapturePlan['length'];
  if (o.wholeEvent) length = { says: `Film ${o.wholeEvent}.` };
  else if (o.minCycles && ctx.cycleSec && ctx.cycleSec > 0) {
    const sec = Math.ceil((o.minCycles + 2) * ctx.cycleSec / 30) * 30;
    length = { sec, says: `At least ${mins(sec)}: ${o.minCycles} whole cycles of the slowest station at about ${Math.round(ctx.cycleSec)} s each, and one either side, since a cycle the footage cuts is not timed.` };
  } else if (o.minCycles) length = { says: `At least ${o.minCycles} whole cycles of the slowest station, and one either side — say how long a cycle is and the minutes are worked out.` };
  else length = { sec: o.minSec, says: `At least ${mins(o.minSec ?? 600)}, long enough to see the stops or waits that matter.` };
  const tooLong = length.sec && length.sec > VIDEO_LIMITS.maxDurationSec
    ? `That is longer than the ${Math.round(VIDEO_LIMITS.maxDurationSec / 60)} minutes one study takes today — film it in parts of up to ${Math.round(VIDEO_LIMITS.maxDurationSec / 60)} minutes, each its own study, or try the phone for the long study first (Can this phone film a long study?).`
    : o.wholeEvent ? `If it runs past ${Math.round(VIDEO_LIMITS.maxDurationSec / 60)} minutes, film it in parts — one study takes up to ${Math.round(VIDEO_LIMITS.maxDurationSec / 60)} today.` : undefined;
  const framing = [...o.framing];
  if (o.maxZones && ctx.stations && ctx.stations > o.maxZones) framing.push(`${ctx.stations} stations is more than one camera holds for this (${o.maxZones}): film them in groups, each its own study, with the stations on the edge in both.`);
  return {
    kind, name: KIND_WORD[kind], question: o.question, readiness: READINESS_WORD[o.readiness], today: o.today,
    view: v, alsoFine: o.alsoFine.map(x => VIEWPOINTS[x].name),
    never: o.never.map(x => `${VIEWPOINTS[x].name} — ${VIEWPOINTS[x].why}`),
    framing, length,
    settings: [
      `The phone’s normal video: ${o.minFps >= 25 ? `at least ${o.minFps} frames a second — 60 for fast hands` : '25 or 30 frames a second'}, 720p or 1080p, landscape.`,
      'Sound off, or muted — the study never uses it.',
      'Lock the focus and exposure on the work if the phone allows (a long press on the screen), so the picture does not keep adjusting.',
      'Start filming before the first cycle you want and stop after the last; do not pause.',
    ],
    still: [
      'On a stand, a clamp or a shelf — never in the hand, never on the conveyor frame or a guard that shakes.',
      'Do not touch it once it is filming; the app checks the footage and says if the camera moved or shook.',
    ],
    light: [
      'Steady light on the work; no window or bright lamp behind the stations, which turns people to shadows.',
      'If a lamp in view flickers, frame it out — a flicker reads as movement.',
    ],
    people: [
      'Tell the people being filmed what it is for and how long, before you start — the study is of the work, not of them.',
      'Frame the hands and the work, not faces. People are labels in the study (Operator A), never names, and nobody is recognised.',
      'Keep the phone outside the product zone, in a cleanable case or bag, by the site’s rules for devices in production areas.',
    ],
    measures: o.measures.map(m => ({ what: m.what, claim: m.claim, word: CLAIM_WORD[m.claim], ...(m.note ? { note: m.note } : {}) })),
    cannot: o.cannot,
    ...(o.meanwhile ? { meanwhile: o.meanwhile } : {}),
    ...(tooLong ? { tooLong } : {}),
  };
}
