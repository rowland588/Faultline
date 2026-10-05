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
import type { PaceAction } from '../../lib/tracker';
import type { NodeStatus } from '../../db/rows';
import { plural } from '../../lib/format';
import { statusOfAction } from '../../lib/treeBind';
import { causeRefOf } from '../../lib/fishbone';

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

/* ------------------------------ a cause's fixes ------------------------------ */

/** A cause's fixes as one small tag beside it — "1 fix · past due". */
export interface FixTag {
  n: number;
  /** The worst state among them, in the board's five (lib/treeBind statusOfAction). */
  tone: NodeStatus;
  words: string;
}

/** Worst first — the order the client report ranks an action's tone in
 *  (late, waiting, going, ahead, done): what is past its day outranks what
 *  waits on somebody, which outranks what is under way. */
const FIX_RANK: Record<NodeStatus, number> = { r: 0, a: 1, w: 2, n: 3, g: 4 };
const FIX_WORD: Record<NodeStatus, string> = { r: 'past due', a: 'waiting', w: 'under way', n: 'not started', g: 'done' };

/** The actions that are this cause's fixes — their causeRef points at it
 *  (lib/fishbone causeRefOf, the same match countermeasuresFor makes). */
export const fixesOf = (actions: PaceAction[], problemId: string, causeId: string): PaceAction[] =>
  actions.filter(a => a.causeRef === causeRefOf(problemId, causeId));

/** What a cause's fixes say from across the room: how many, and the worst
 *  state in the board's own words and tone (statusOfAction — the rule the
 *  board, the cause sheet and the Fix part already read). Null when there are
 *  none, so a cause with no fix carries nothing. An open fix with a day says
 *  the day ("due 9 Oct") — who owes what by when; when only some share the
 *  worst state, it says how many ("3 fixes · 1 past due"). */
export function fixTag(fixes: PaceAction[]): FixTag | null {
  if (!fixes.length) return null;
  const st = fixes.map(a => ({ a, t: statusOfAction(a) }));
  const tone = st.reduce<NodeStatus>((w, x) => (FIX_RANK[x.t] < FIX_RANK[w] ? x.t : w), 'g');
  const worst = st.filter(x => x.t === tone).map(x => x.a);
  const all = worst.length === fixes.length;
  const count = plural(fixes.length, 'fix', 'fixes');
  if (tone === 'w' || tone === 'n') {
    const next = worst.filter(a => a.due?.trim())
      .sort((x, y) => (x.dueISO ?? '9999').localeCompare(y.dueISO ?? '9999'))[0];
    const day = next?.due?.trim();
    if (day) return { n: fixes.length, tone, words: `${count} · ${all ? '' : 'next '}due ${day}` };
  }
  return { n: fixes.length, tone, words: `${count} · ${all ? '' : `${worst.length} `}${FIX_WORD[tone]}` };
}

/* ------------------------------ the drawn fish ------------------------------ */

export interface Pt { x: number; y: number }

export interface PlacedItem {
  item: Item;
  /** The button: left, top, width, height. Its words sit on the rib line at its foot. */
  x: number; y: number; w: number; h: number;
  /** Where the rib meets its bone, and the height of the rib line. */
  attachX: number; lineY: number;
  /** Laid out on two lines — the words, then its tags (root, how known,
   *  fixes) on the rib — when the ribs are spread far enough apart to hold
   *  them (a fish filling a tall room). */
  two: boolean;
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
  /** The height the fish is given (the fishbone page fills the room under
   *  its bar). When it is taller than the fish needs, the bones grow into
   *  it — the ribs spread one pitch further apart — rather than leaving the
   *  fish small in an empty room. Shorter, it is ignored: the fish keeps the
   *  height its marks need and its box scrolls; it never squashes. */
  minHeight?: number;
  /** The marks that carry a fixes tag. Where a rib is too narrow for the
   *  words and the tag side by side, these take a second line. */
  tall?: (item: Item) => boolean;
}

const PAD_L = 34;      // room for the tail
const SPINE_GAP = 12;  // the nearest rib stays clear of the spine
const END_GAP = 6;     // the farthest rib stays clear of the name
const HEAD_GAP = 26;   // the last bones meet the spine short of the head
const RIB_GAP = 14;    // a rib stops short of the bone before it
const PITCH_MAX = 2.5; // filling a tall room, ribs spread to at most this many rows apart
const TWO_EXTRA = 22;  // a second line under a mark's words, for its tags
const TAGS_FIT = 400;  // a column this wide holds a cause's words and a fixes tag on one line

export function layoutFish(bones: Bone[], width: number, o: FishOpts = {}): FishLayout {
  const rowH = o.rowH ?? 34;
  const headH = o.headH ?? 176;
  const LABEL_H = o.labelH ?? 46;
  const headW = Math.round(Math.min(300, Math.max(210, width * 0.21)));
  const headX = width - headW - 2;
  const colW = (headX - HEAD_GAP - PAD_L) / 3;
  const dx = colW * 0.24;

  /* A rib wide enough holds a cause's words and its tags (the root, how it
     is known, its fixes) on one line. Narrower, a cause that carries a
     fixes tag takes two lines — its words, then its tags on the rib — so the
     tag never squeezes the words out of the mark. */
  const tagsFit = colW >= TAGS_FIT;
  const ordered = bones.slice(0, 6).map(orderItems);
  const baseOf = (it: Item) => (!tagsFit && o.tall?.(it) ? rowH + TWO_EXTRA : rowH);
  /* Each rib's step from the one before: its own height, or more when the
     fish is given more room than its marks need — the most that still fits
     the room, shared by every rib alike, so a rib sits the same distance
     from the next above the spine as below it. A bone shorter than three
     ribs is drawn as if it had three, so an empty fish is still a fish. */
  const steps = (e: number) => ordered.map(items => items.map(it => Math.max(baseOf(it), rowH + e)));
  const shape = (e: number) => {
    const st = steps(e);
    const len = (k: number) => st[k] ? st[k].reduce((x, y) => x + y, 0) + Math.max(0, 3 - st[k].length) * (rowH + e) : 3 * (rowH + e);
    const halfU = END_GAP + Math.max(len(0), len(1), len(2)) + SPINE_GAP;
    const halfL = SPINE_GAP + Math.max(len(3), len(4), len(5)) + END_GAP;
    /* The head is centred on the spine; if it is taller than the bones, the
       fish is padded so the head never leaves the drawing. */
    const spineY = Math.max(LABEL_H + halfU, headH / 2 + 4);
    const height = Math.max(spineY + halfL + LABEL_H, spineY + headH / 2 + 4);
    return { st, e, halfU, halfL, spineY, height };
  };
  let S = shape(0);
  const room = o.minHeight != null && Number.isFinite(o.minHeight) ? Math.floor(o.minHeight) : 0;
  if (room > S.height) {
    let lo = 0, hi = room - S.height;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (shape(mid).height <= room) lo = mid; else hi = mid; }
    /* Spread, not scattered: past two and a half rows apart the ribs stop
       reading as one bone's list, so the rest of the room is shared above
       and below the fish instead. */
    S = shape(Math.min(lo, (PITCH_MAX - 1) * rowH));
  }
  const { halfU, halfL } = S;
  const height = Math.max(S.height, room);
  const spineY = S.spineY + Math.max(0, Math.floor((height - S.height) / 2));

  const placed: PlacedBone[] = bones.slice(0, 6).map((bone, idx) => {
    const upper = idx < 3;
    const i = idx % 3;
    const half = upper ? halfU : halfL;
    const xs = PAD_L + colW * (i + 1);
    const outerY = upper ? spineY - half : spineY + half;
    /** The bone's x at a height, and the bone before it (or the tail edge). */
    const xAt = (y: number) => xs - dx * (Math.abs(spineY - y) / half);
    const leftAt = (y: number) => (i === 0 ? 10 : xAt(y) - colW + RIB_GAP);
    let lineY = upper ? outerY + END_GAP : spineY + SPINE_GAP;
    const items = ordered[idx].map((item, k): PlacedItem => {
      const step = S.st[idx][k];
      lineY += step;
      const attachX = xAt(lineY);
      const two = step >= rowH + TWO_EXTRA;
      if (two) {
        /* Two lines: the words on top, the tags under them on the rib. The
           box is taller, so both bones are checked at its top as well as
           its foot. */
        const h = rowH + TWO_EXTRA - 2;
        const x = i === 0 ? leftAt(lineY) : Math.max(leftAt(lineY), leftAt(lineY - h + 4));
        const right = Math.min(attachX, xAt(lineY - h + 4)) - 6;
        return { item, x, y: lineY - h, w: Math.max(40, right - x), h, attachX, lineY, two };
      }
      const x = leftAt(lineY);
      /* A slanting bone is nearer the words at the top of an upper rib than
         where the rib meets it — the words stop short of both. */
      const right = Math.min(attachX, xAt(lineY - Math.min(20, rowH - 4))) - 6;
      return { item, x, y: lineY - rowH + 2, w: Math.max(40, right - x), h: rowH - 2, attachX, lineY, two };
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
