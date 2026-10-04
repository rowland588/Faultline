/* WHERE EVERYTHING ON THE DRAWN FISH GOES — pure, so it is tested and so the
 * paper copy can be drawn from the same numbers as the screen.
 *
 * The head sits on the right with the problem in it; the spine runs left to
 * the tail. Three bones above (People, Machine, Method) and three below
 * (Material, Measurement, Environment), in SIXM order, each slanting into the
 * spine towards the head. A cause is a rib: a horizontal line off its bone,
 * its words sitting on the line, reaching left as far as the bone before it.
 * Ribs are stacked one row apart, so two can never sit on each other however
 * many there are — the fish grows taller instead of piling up. */
import type { Bone, Suggestion } from '../../lib/problems';
import type { Cause, CauseStatus, Grade } from '../../lib/sixm';
import { plural } from '../../lib/format';

/** One mark on a bone: a cause, or something the data suggests. */
export type Item =
  | { kind: 'cause'; key: string; cause: Cause }
  | { kind: 'suggestion'; key: string; s: Suggestion };

const RANK: Record<CauseStatus, number> = { confirmed: 1, suspected: 2, ruled_out: 3 };

/** The order a bone reads in: the roots, then what is confirmed, then what is
 *  still suspected, then what was ruled out, then what the data suggests —
 *  biggest loss first. The order things were added breaks ties, so a mark
 *  does not jump about while someone works. */
export function orderItems(b: Bone): Item[] {
  const causes = b.causes
    .map((c, i) => ({ c, i }))
    .sort((x, y) => (x.c.root && x.c.status !== 'ruled_out' ? 0 : RANK[x.c.status]) - (y.c.root && y.c.status !== 'ruled_out' ? 0 : RANK[y.c.status]) || x.i - y.i)
    .map(({ c }): Item => ({ kind: 'cause', key: `c:${c.id}`, cause: c }));
  const sugg = b.suggestions
    .map((s, i) => ({ s, i }))
    .sort((x, y) => (y.s.minutesWeek ?? 0) - (x.s.minutesWeek ?? 0) || x.i - y.i)
    .map(({ s }): Item => ({ kind: 'suggestion', key: `s:${s.key}`, s }));
  return [...causes, ...sugg];
}

/** A cause counts as a root only while it stands — one ruled out is not. */
export const isRoot = (c: Cause): boolean => !!c.root && c.status !== 'ruled_out';

/** What a bone holds, in words: "3 causes · 1 root · 2 suggested". An empty
 *  bone says it was looked at and nothing was found. */
export function boneWords(b: Bone): string {
  const n = b.causes.length;
  const roots = b.causes.filter(isRoot).length;
  const out = b.causes.filter(c => c.status === 'ruled_out').length;
  const parts = [n ? plural(n, 'cause') : 'Nothing found yet'];
  if (roots) parts.push(plural(roots, 'root'));
  if (out) parts.push(`${out} ruled out`);
  if (b.suggestions.length) parts.push(`${b.suggestions.length} suggested`);
  return parts.join(' · ');
}

/** How sure, as a meter: measured fills all three, reported none. */
export const GRADE_LEVEL: Record<Grade, number> = { measured: 3, counted: 2, observed: 1, reported: 0 };

export const STATUS_WORD: Record<CauseStatus, string> = {
  suspected: 'suspected', confirmed: 'confirmed', ruled_out: 'ruled out',
};

/** Minutes a week, as the floor says it: "45 min a week", "3.2 h a week". */
export function lossWords(min?: number): string {
  if (min == null || !Number.isFinite(min) || min <= 0) return '';
  if (min < 90) return `${Math.round(min)} min a week`;
  const h = min / 60;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)} h a week`;
}

/* ------------------------------ the drawn fish ------------------------------ */

export interface Pt { x: number; y: number }

export interface PlacedItem {
  item: Item;
  /** The button: left, top, width, height. Its words sit on the rib line at its foot. */
  x: number; y: number; w: number; h: number;
  /** Where the rib meets its bone, and the height of the rib line. */
  attachX: number; lineY: number;
}

export interface PlacedBone {
  bone: Bone;
  upper: boolean;
  /** The end away from the spine, where its name is written. */
  outer: Pt;
  /** Where it meets the spine. */
  spine: Pt;
  /** The name and count, centred on the outer end. */
  label: { x: number; y: number; w: number; h: number };
  items: PlacedItem[];
}

export interface FishLayout {
  width: number; height: number; spineY: number;
  /** The tail end of the spine. */
  tailX: number;
  head: { x: number; y: number; w: number; h: number };
  bones: PlacedBone[];
}

export interface FishOpts {
  /** One rib's height — 34 for a mouse, 44 for a finger. */
  rowH?: number;
  /** The head's height, from what it has to hold. */
  headH?: number;
  /** Room for a bone's name, count and Add — more when Add is thumb-sized. */
  labelH?: number;
}

const PAD_L = 34;      // room for the tail
const SPINE_GAP = 12;  // the nearest rib stays clear of the spine
const END_GAP = 6;     // the farthest rib stays clear of the name
const HEAD_GAP = 26;   // the last bones meet the spine short of the head
const RIB_GAP = 14;    // a rib stops short of the bone before it

export function layoutFish(bones: Bone[], width: number, o: FishOpts = {}): FishLayout {
  const rowH = o.rowH ?? 34;
  const headH = o.headH ?? 176;
  const LABEL_H = o.labelH ?? 46;
  const headW = Math.round(Math.min(300, Math.max(210, width * 0.21)));
  const headX = width - headW - 2;
  const colW = (headX - HEAD_GAP - PAD_L) / 3;
  const dx = colW * 0.24;

  const upperBones = bones.slice(0, 3), lowerBones = bones.slice(3, 6);
  const rows = (bs: Bone[]) => Math.max(3, ...bs.map(b => b.causes.length + b.suggestions.length));
  const nU = rows(upperBones), nL = rows(lowerBones);
  const halfU = END_GAP + nU * rowH + SPINE_GAP;
  const halfL = SPINE_GAP + nL * rowH + END_GAP;

  /* The head is centred on the spine; if it is taller than the bones, the
     fish is padded so the head never leaves the drawing. */
  let spineY = LABEL_H + halfU;
  spineY = Math.max(spineY, headH / 2 + 4);
  const height = Math.max(spineY + halfL + LABEL_H, spineY + headH / 2 + 4);

  const placed: PlacedBone[] = bones.slice(0, 6).map((bone, idx) => {
    const upper = idx < 3;
    const i = idx % 3;
    const half = upper ? halfU : halfL;
    const xs = PAD_L + colW * (i + 1);
    const outerY = upper ? spineY - half : spineY + half;
    /** The bone's x at a height, and the bone before it (or the tail edge). */
    const xAt = (y: number) => xs - dx * (Math.abs(spineY - y) / half);
    const leftAt = (y: number) => (i === 0 ? 10 : xAt(y) - colW + RIB_GAP);
    const items = orderItems(bone).map((item, k): PlacedItem => {
      const lineY = upper
        ? outerY + END_GAP + (k + 1) * rowH
        : spineY + SPINE_GAP + (k + 1) * rowH;
      const attachX = xAt(lineY);
      const x = leftAt(lineY);
      /* A slanting bone is nearer the words at the top of an upper rib than
         where the rib meets it — the words stop short of both. */
      const right = Math.min(attachX, xAt(lineY - Math.min(20, rowH - 4))) - 6;
      return { item, x, y: lineY - rowH + 2, w: Math.max(40, right - x), h: rowH - 2, attachX, lineY };
    });
    const lw = colW - 12;
    const outerX = xs - dx;
    return {
      bone, upper,
      outer: { x: outerX, y: outerY },
      spine: { x: xs, y: spineY },
      label: { x: Math.max(2, outerX - lw / 2), y: upper ? outerY - LABEL_H : outerY + 2, w: lw, h: LABEL_H - 2 },
      items,
    };
  });

  return { width, height, spineY, tailX: PAD_L, head: { x: headX, y: spineY - headH / 2, w: headW, h: headH }, bones: placed };
}

/** Whether two boxes overlap — for the test that no two marks ever do. */
export const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
