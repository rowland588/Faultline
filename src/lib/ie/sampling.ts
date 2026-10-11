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

export interface Tap { id: string; at: number; who: string; activity: string }

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

/** The margin a share carries from n taps. */
export const marginOf = (p: number, n: number, z = Z95): number => (n > 0 ? z * Math.sqrt((p * (1 - p)) / n) : 0);

/** Taps needed for a share near p to be known within ±E (fractions). */
export const tapsNeeded = (p: number, marginFrac: number, z = Z95): number => Math.ceil((z * z * p * (1 - p)) / (marginFrac * marginFrac));

/** The taps of one person (or of everybody, when `who` is not given). */
export const tapsOf = (taps: Tap[], who?: string): Tap[] => (who ? taps.filter(t => t.who === who) : taps);

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

/** How many more taps the biggest share needs to be within the margin wanted. */
export function moreNeeded(list: Share[], n: number, marginPts = 5): number {
  const big = list.reduce<Share | undefined>((m, s) => (m && m.share >= s.share ? m : s), undefined);
  if (!big || !n) return 0;
  return Math.max(0, tapsNeeded(big.share, marginPts / 100) - n);
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
  prompts.filter(p => p + graceMs < now && !taps.some(t => t.who === who && Math.abs(t.at - p) <= graceMs));

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
