/* WORK SAMPLING — docs/TOOLKIT.md Part 4 §9; docs/BUILD.md, H1.
 *
 * The question: across a shift, what share of their time are people working,
 * walking, waiting, searching, away — and how sure are we? Nobody follows a
 * person with a stopwatch all day; the phone prompts at random moments and one
 * tap says what each person was doing then. Enough taps and the shares are
 * statistics, each with the margin it carries — said with every figure, never
 * hidden behind a single percentage.
 *
 * Facts: a sampling study's `facts.taps` (one fact per person per prompt, a
 * list merged by id so two phones watching the same line both keep theirs),
 * the activities, who is watched, the margin wanted, the prompt times.
 * Figures: share p = k ÷ n; margin = z √(p(1 − p) ÷ n) at 95% (z 1.96); taps
 * needed for a margin E at a share p = z² p(1 − p) ÷ E²; how many more.
 * Proved by: p 0.30, E 0.05 → 323 taps (the TOOLKIT's own example). */

import type { AgreedSampling, Tap } from '../../lib/study';
export type { Tap };

export interface SamplingFacts {
  activities?: string[];
  who?: string[];
  /** The margin wanted on each share, in points (5 → ±5). */
  marginPts?: number;
  /** The shift watched: prompts fall at random inside it. */
  window?: { from: number; to: number };
  /** The instants the phone asks at, drawn once when the study starts. */
  prompts?: number[];
  taps?: Tap[];
}

/** 95% two-sided. The margins on a board are read as "about ±7 points". */
export const Z95 = 1.96;
export const DEFAULT_ACTIVITIES = ['working', 'walking', 'waiting', 'searching', 'away'] as const;
/** Under this many taps the shares are not yet said as figures. */
export const TOO_FEW_TAPS = 30;

export interface Share {
  activity: string;
  taps: number;
  /** As a fraction of this person's taps. */
  share: number;
  /** z √(p(1 − p) ÷ n), a fraction. 0 when there are no taps. */
  margin: number;
}

/** The margin a share carries from n taps — Wilson's half-width: the same
 *  as the ILO's z √(p(1 − p) ÷ n) at middling shares, and never ±0 when
 *  every tap was the one thing ("working 100% (±0)" from 30 taps — Wilson
 *  says 94 ± 6; docs/UPGRADE-AUDIT.md M15). */
export const marginOf = (p: number, n: number, z = Z95): number => {
  if (!(n > 0)) return 0;
  const z2 = (z * z) / n;
  return (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n))) / (1 + z2);
};

/** Taps needed for a share near p to be known within ±E (fractions). */
export const tapsNeeded = (p: number, marginFrac: number, z = Z95): number => Math.ceil((z * z * p * (1 - p)) / (marginFrac * marginFrac));

/** The taps that count — of one person, or of everybody when `who` is not
 *  given. A struck tap keeps its place on the list and counts for nothing. */
export const tapsOf = (taps: Tap[], who?: string): Tap[] => taps.filter(t => !t.struck && (!who || t.who === who));

/** Each activity's share of a person's taps, the listed activities first (in
 *  their order), then anything tapped that the list does not name. */
export function shares(taps: Tap[], activities: readonly string[] = DEFAULT_ACTIVITIES, who?: string): Share[] {
  const mine = tapsOf(taps, who);
  const n = mine.length;
  const names = [...activities, ...mine.map(t => t.activity).filter(a => !activities.includes(a))];
  const seen = new Set<string>();
  const out: Share[] = [];
  for (const a of names) {
    if (seen.has(a)) continue; seen.add(a);
    const k = mine.filter(t => t.activity === a).length;
    const p = n ? k / n : 0;
    out.push({ activity: a, taps: k, share: p, margin: marginOf(p, n) });
  }
  return out;
}

/** The taps a share near p needs to be within ±E as the margin is counted:
 *  the ILO's plan (`tapsNeeded`) — never fewer — and, at the ends where that
 *  plan says none (a share of 0 or 1), as many as bring Wilson's width in. */
export function tapsFor(p: number, marginFrac: number, z = Z95): number {
  let n = Math.max(1, tapsNeeded(p, marginFrac, z));
  while (marginOf(p, n, z) > marginFrac + 1e-12 && n < 1_000_000) n++;
  return n;
}

/** How many more taps the biggest share needs to be within the margin wanted. */
export function moreNeeded(list: Share[], n: number, marginPts = 5): number {
  const big = list.reduce<Share | undefined>((m, s) => (m && m.share >= s.share ? m : s), undefined);
  if (!big || !n) return 0;
  return Math.max(0, tapsFor(big.share, marginPts / 100) - n);
}

/** `count` random instants inside the window, sorted — drawn once, kept on
 *  the study, so every device asks at the same moments. `rand` is injectable
 *  so a test can hold it still. */
export function schedulePrompts(from: number, to: number, count: number, rand: () => number = Math.random): number[] {
  if (!(to > from) || count <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(Math.round(from + rand() * (to - from)));
  return out.sort((a, b) => a - b);
}

/** The next prompt still ahead, or none. */
export const nextPrompt = (prompts: number[], now: number): number | undefined => prompts.find(p => p > now);

/** Prompts that have passed and nobody answered for `who`. */
export const missedPrompts = (prompts: number[], taps: Tap[], who: string, now: number, graceMs = 10 * 60_000): number[] =>
  prompts.filter(p => p + graceMs < now && !tapsOf(taps, who).some(t => Math.abs(t.at - p) <= graceMs));

/** THE ROUND TO ANSWER NOW: the latest prompt that has come, within its
 *  grace, that somebody watched has no tap for yet — or none. A round is
 *  answered by a tap per person, stamped with the prompt's own instant, so
 *  the shares are of the random moments, not of when the phone was looked at. */
export function dueRound(prompts: number[], taps: Tap[], who: string[], now: number, graceMs = 10 * 60_000): { at: number; no: number; left: string[] } | undefined {
  for (let i = prompts.length - 1; i >= 0; i--) {
    const p = prompts[i];
    if (p === undefined || p > now) continue;
    if (p + graceMs < now) return undefined;
    const left = who.filter(w => !tapsOf(taps, w).some(t => t.at === p));
    return left.length ? { at: p, no: i + 1, left } : undefined;
  }
  return undefined;
}

/** Rounds answered (every person tapped), of the prompts so far. */
export const roundsDone = (prompts: number[], taps: Tap[], who: string[]): number =>
  prompts.filter(p => who.length > 0 && who.every(w => tapsOf(taps, w).some(t => t.at === p))).length;

export type SamplingEnough = 'none' | 'early' | 'enough';
export const samplingEnough = (n: number): SamplingEnough => (n === 0 ? 'none' : n < TOO_FEW_TAPS ? 'early' : 'enough');

const pct = (f: number): string => `${Math.round(f * 100)}%`;
const pts = (f: number): string => `±${Math.round(f * 100)}`;

/** The reading, one person: "Op 2: working 61% (±7), walking 18%, waiting
 *  14%, searching 7% — from 190 taps; 176 more for ±5 points." Shares of zero
 *  are left out; under TOO_FEW_TAPS it says too early and how many so far. */
export function samplingReading(facts: SamplingFacts, who: string): string {
  const taps = tapsOf(facts.taps ?? [], who);
  const n = taps.length;
  if (samplingEnough(n) !== 'enough') return n ? `${who}: too early — ${n} tap${n === 1 ? '' : 's'} so far, ${TOO_FEW_TAPS} needed before the shares are said` : `${who}: no taps yet`;
  const list = shares(taps, facts.activities ?? DEFAULT_ACTIVITIES).filter(s => s.taps > 0).sort((a, b) => b.share - a.share);
  const want = facts.marginPts ?? 5;
  const more = moreNeeded(list, n, want);
  const parts = list.map((s, i) => `${s.activity} ${pct(s.share)}${i === 0 ? ` (${pts(s.margin)})` : ''}`);
  return `${who}: ${parts.join(', ')} — from ${n} taps${more ? `; ${more} more for ±${want} points` : `; within ±${want} points`}`;
}

/** The whole study, for a card: "3 people · 570 taps · the biggest share
 *  within ±7" — or how far it has got. */
export function samplingLine(facts: SamplingFacts): string {
  const taps = facts.taps ?? [];
  const who = facts.who ?? [...new Set(taps.map(t => t.who))];
  if (!taps.length) return `${who.length || 'no'} ${who.length === 1 ? 'person' : 'people'} watched · no taps yet`;
  const worst = Math.max(...who.map(w => { const l = shares(taps, facts.activities ?? DEFAULT_ACTIVITIES, w); const big = l.reduce((m, s) => (m.share >= s.share ? m : s)); return big.margin; }));
  return `${who.length} ${who.length === 1 ? 'person' : 'people'} · ${taps.length} taps · the biggest share within ${pts(worst)} points`;
}

/* ---------------------------------------------------------------- the study's words */

export interface SamplingSays { text: string; tone: 'n'; verdict: string }

/** What a sampling study says: each person's reading, and one word or two for
 *  a list — never a score. Grey throughout: the shares are the facts, and
 *  what is too much waiting is the team's to say on its fishbone. */
export function samplingSays(a: AgreedSampling | undefined, taps: Tap[]): SamplingSays {
  if (!a) return { text: 'Say who is watched and the shift, then answer each moment as it comes.', tone: 'n', verdict: 'Not set up' };
  const n = tapsOf(taps).length;
  if (!n) return { text: `${a.who.length} ${a.who.length === 1 ? 'person' : 'people'} watched, ${a.prompts.length} moments in the shift — no taps yet.`, tone: 'n', verdict: 'No taps yet' };
  const facts = { activities: a.activities, marginPts: a.marginPts, taps };
  const text = a.who.map(w => samplingReading(facts, w)).join('. ') + '.';
  const early = a.who.some(w => samplingEnough(tapsOf(taps, w).length) !== 'enough');
  return { text, tone: 'n', verdict: early ? `Too early — ${n} tap${n === 1 ? '' : 's'}` : `From ${n} taps` };
}

/** The biggest share that is not the work itself (the first activity — "working"),
 *  of the people with enough taps: what Make it better is raised from. */
export function samplingWorst(a: AgreedSampling | undefined, taps: Tap[]): { who: string; activity: string; share: number; margin: number; n: number } | undefined {
  if (!a) return undefined;
  const work = a.activities[0];
  let worst: { who: string; activity: string; share: number; margin: number; n: number } | undefined;
  for (const w of a.who) {
    const n = tapsOf(taps, w).length;
    if (samplingEnough(n) !== 'enough') continue;
    for (const s of shares(taps, a.activities, w)) {
      if (s.activity === work || !s.taps) continue;
      if (!worst || s.share > worst.share) worst = { who: w, activity: s.activity, share: s.share, margin: s.margin, n };
    }
  }
  return worst;
}

/** "Op 2 is waiting 14% of the time (±5 points, from 190 taps)". */
export const worstWords = (x: { who: string; activity: string; share: number; margin: number; n: number }): string =>
  `${x.who} is ${x.activity} ${pct(x.share)} of the time (${pts(x.margin)} points, from ${x.n} taps)`;

/* ------------------------------------------- where it goes: the fishbone, the card, paper */

export interface SamplingShare { who: string; activity: string; share: number; margin: number; n: number }

/** Every share that is not the work itself (the first activity) and is a
 *  tenth of the time or more, of the people with enough taps — biggest first.
 *  What the fishbone offers: one cause a person and activity, each with the
 *  figure and the margin it carries (worstWords). */
export function samplingOffers(a: AgreedSampling | undefined, taps: Tap[], min = 0.1): SamplingShare[] {
  if (!a) return [];
  const work = a.activities[0];
  return a.who.flatMap(w => {
    const n = tapsOf(taps, w).length;
    if (samplingEnough(n) !== 'enough') return [];
    return shares(taps, a.activities, w).filter(s => s.activity !== work && s.taps > 0 && s.share >= min)
      .map(s => ({ who: w, activity: s.activity, share: s.share, margin: s.margin, n }));
  }).sort((x, y) => y.share - x.share);
}

/** Which of the six bones a share sits on: away from the line is People (who
 *  is there to do it); walking, searching and waiting are how the work is
 *  laid out and fed — Method; an activity the floor named itself, Method. */
export const boneOfActivity = (activity: string): 'people' | 'method' => (/^away|absent|break/i.test(activity.trim()) ? 'people' : 'method');

/** The study on paper, a row per person: their taps and each activity's share
 *  with the margin it carries; under TOO_FEW_TAPS, too early — never a figure. */
export interface SamplingRow { who: string; n: number; enough: boolean; cells: { activity: string; share: string; margin: string }[]; early?: string }
export function samplingRows(a: AgreedSampling | undefined, taps: Tap[]): { activities: string[]; rows: SamplingRow[]; head: string } | undefined {
  if (!a || !tapsOf(taps).length) return undefined;
  const activities = [...a.activities];
  for (const t of tapsOf(taps)) if (!activities.includes(t.activity)) activities.push(t.activity);
  const rows = a.who.map(w => {
    const n = tapsOf(taps, w).length;
    const enough = samplingEnough(n) === 'enough';
    const list = shares(taps, activities, w);
    return {
      who: w, n, enough,
      cells: activities.map(act => { const s = list.find(x => x.activity === act); return s && s.taps > 0 && enough ? { activity: act, share: pct(s.share), margin: pts(s.margin) } : { activity: act, share: '—', margin: '' }; }),
      ...(enough ? {} : { early: n ? `too early — ${n} tap${n === 1 ? '' : 's'}, ${TOO_FEW_TAPS} needed` : 'no taps yet' }),
    };
  });
  const n = tapsOf(taps).length;
  return { activities, rows, head: `${a.who.length} ${a.who.length === 1 ? 'person' : 'people'} watched at ${a.prompts.length} random moments — ${n} tap${n === 1 ? '' : 's'}; each share with its margin at 95%, in points` };
}

/** The line's card: the biggest share that is not the work, with its margin
 *  — or how far the study has got. Neutral: what is too much is the team's
 *  to say on its fishbone. */
export function samplingCardLine(a: AgreedSampling | undefined, taps: Tap[]): string | undefined {
  if (!a) return undefined;
  const w = samplingWorst(a, taps);
  if (w) return worstWords(w);
  const n = tapsOf(taps).length;
  return n ? `Too early — ${n} tap${n === 1 ? '' : 's'} of ${a.who.length} ${a.who.length === 1 ? 'person' : 'people'} watched` : `${a.who.length} ${a.who.length === 1 ? 'person' : 'people'} watched — no taps yet`;
}
