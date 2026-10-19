/* IS THE CAMERA STEADY? (docs/VIDEO-FEASIBILITY.md, probe G)
 *
 * The reading takes movement at a station as work, so a camera that moves
 * makes work out of nothing: on footage with known times, vibration of under
 * a pixel took the reading's precision from 0.96 to 0.48, and a camera held
 * in the hand to 0.32 (scripts/video-feasibility.mjs, F and G). So as the
 * footage is read, this says where the picture is against the first frame:
 * the one slid over the other, a pixel at a time at the reading's width, to
 * the place they match best, and that place found to about a tenth of a
 * pixel from its neighbours. Each frame has its average brightness
 * taken off first, so the light changing is not read as a move — it is said
 * on its own.
 *
 * The whole picture is matched, what moves in it included. Leaving out what
 * moves (found once, every pixel still differing from the first frame left
 * out, found again on the rest) was tried on the app's own scenes, 19
 * October: it halved what a running belt does to the place but threw away
 * the few thin edges a plain wall has and called a still camera shaking on
 * it; keeping thin lines in brought plain walls back and the belt's gain
 * with them. At the threshold below the whole picture passes every scene
 * the others pass, at a quarter of the work. What none of them can do is a
 * belt across a fifth of the picture — and the reading cannot either (it
 * finds no work there at all), so a belt is kept out of the stations.
 *
 * From the places, every ten samples (two seconds at five a second):
 *   shaking — the place jumps from one sample to the next (the root of the
 *             mean square step) by more than STEADY.shake;
 *   moved   — it sits away from where the first frame put it (the median) by
 *             more than STEADY.moved: knocked, sinking, or carried;
 *   light   — its brightness is off the first frame's by more than
 *             STEADY.light.
 * The thresholds are pixels at the reading's width (160). They were set on
 * the app's own synthetic footage: a still camera steps under 0.01 a sample
 * on a detailed scene and at worst 0.09–0.10 on a plain wall with grain and
 * workers in front; people crossing and a belt along the bottom stay under
 * 0.07; the smallest vibration that harms the reading steps some 0.15 — so
 * shaking is over 0.12 (probe G, docs/VIDEO-FEASIBILITY.md). A real camera's own noise is what the phone check
 * measures (screens/VideoCheckScreen), and the thresholds move with what it
 * finds. */

/** A grey frame with its average taken off, and the average. */
export interface Frame { o: Float32Array; mean: number }

export function zeroMean(g: ArrayLike<number>): Frame {
  let s = 0;
  for (let i = 0; i < g.length; i++) s += g[i];
  const mean = g.length ? s / g.length : 0;
  const o = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) o[i] = g[i] - mean;
  return { o, mean };
}

/** How far the search slides, in pixels at the reading's width — a quarter of
 *  a 160-wide picture's height is past any camera still worth reading. */
export const SEARCH = 6;

export interface Shift {
  /** Where the frame's content sits against the first frame's, in pixels at the reading's width. */
  dx: number; dy: number;
  /** The whole pixel it was found at — where the next search starts. */
  ix: number; iy: number;
  /** The mean difference left at the best place (0–255). */
  left: number;
  /** Whether the whole ±SEARCH was searched. */
  full: boolean;
}

function diffAt(a: Float32Array, c: Float32Array, w: number, h: number, sx: number, sy: number): number {
  const R = SEARCH;
  let s = 0;
  for (let y = R; y < h - R; y++) {
    const ra = y * w, rc = (y + sy) * w + sx;
    for (let x = R; x < w - R; x++) s += Math.abs(c[rc + x] - a[ra + x]);
  }
  return s / ((h - 2 * R) * (w - 2 * R));
}

/** Where `c` sits against `a`. Searched ±2 px around `near` when given, and
 *  over the whole ±SEARCH when that lands on its edge or no `near` is given. */
export function shiftOf(a: Frame, c: Frame, w: number, h: number, near?: readonly [number, number]): Shift {
  const R = SEARCH;
  const seen = new Map<number, number>();
  const at = (x: number, y: number) => {
    if (Math.abs(x) > R || Math.abs(y) > R) return Infinity;
    const k = (y + R) * 64 + x + R;
    let v = seen.get(k);
    if (v === undefined) { v = diffAt(a.o, c.o, w, h, x, y); seen.set(k, v); }
    return v;
  };
  const search = (cx: number, cy: number, r: number) => {
    let best = Infinity, bx = cx, by = cy;
    for (let sy = Math.max(-R, cy - r); sy <= Math.min(R, cy + r); sy++)
      for (let sx = Math.max(-R, cx - r); sx <= Math.min(R, cx + r); sx++) {
        const v = at(sx, sy);
        if (v < best) { best = v; bx = sx; by = sy; }
      }
    return { best, bx, by };
  };
  let f = near ? search(near[0], near[1], 2) : search(0, 0, R);
  const widened = !!near && (Math.abs(f.bx - near[0]) === 2 || Math.abs(f.by - near[1]) === 2);
  if (widened) f = search(0, 0, R);
  const { best, bx, by } = f;
  /* between pixels: a difference summed whole falls and rises in nearly
     straight lines either side of the best place, so the lowest point is
     where the two lines through it and its neighbours meet — to about a tenth
     of a pixel on pictures moved by known fractions both ways, smooth or
     speckled (a step along the picture's gradients is closer on smooth ones
     and four tenths out on speckled ones, so it is not used) */
  const sub = (m: number, z: number, p: number) => {
    if (!Number.isFinite(m) || !Number.isFinite(p)) return 0;
    const rise = Math.max(m, p) - z;
    return rise > 0 ? Math.max(-0.5, Math.min(0.5, (m - p) / (2 * rise))) : 0;
  };
  return { dx: bx + sub(at(bx - 1, by), best, at(bx + 1, by)), dy: by + sub(at(bx, by - 1), best, at(bx, by + 1)), ix: bx, iy: by, left: best, full: !near || widened };
}

/** One sample's place and light against the first frame. */
export interface SteadyMark { t: number; dx: number; dy: number; light: number }

export const STEADY = {
  /** shaking: the root of the mean square step between samples, px at the reading's width */
  shake: 0.12,
  /** moved: the median place away from the first frame's, px at the reading's width */
  moved: 0.75,
  /** light: the brightness off the first frame's, as a share */
  light: 0.08,
  /** samples a window — two seconds at five a second */
  window: 10,
} as const;
export type SteadyThresholds = { shake: number; moved: number; light: number; window: number };

/** THE CHECK AS IT READS: hand it each sample's grey frame. The first frame
 *  bright enough to see by is the one the others are held against; the search
 *  starts where the last one was found, and searches everywhere every 25th
 *  sample (five seconds) so a wrong turn is never kept. */
export class SteadyCheck {
  private first?: Frame;
  private near?: [number, number];
  private n = 0;
  readonly marks: SteadyMark[] = [];
  constructor(private readonly w: number, private readonly h: number) {}
  /** Hold the others against this frame without marking it — a reading
   *  resumed part way holds its frames against the footage's first one. */
  prime(grey: ArrayLike<number>): void {
    const f = zeroMean(grey);
    if (f.mean > 10) this.first = f;
  }
  add(t: number, grey: ArrayLike<number>): { mark: SteadyMark; shift: Shift } | undefined {
    const f = zeroMean(grey);
    if (!this.first) {
      if (f.mean <= 10) return undefined;          // a dark frame — the camera still waking
      this.first = f;
    }
    const shift = shiftOf(this.first, f, this.w, this.h, this.n++ % 25 === 0 ? undefined : this.near);
    this.near = [shift.ix, shift.iy];
    const mark = { t, dx: shift.dx, dy: shift.dy, light: this.first.mean > 0 ? f.mean / this.first.mean : 1 };
    this.marks.push(mark);
    return { mark, shift };
  }
}

export type SteadyWord = 'steady' | 'shaking' | 'moved' | 'light';
export interface SteadyWindow { at: number; shake: number; moved: number; light: number; word: SteadyWord }

const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : 0;
};

/** The marks judged two seconds at a time. Shaking is said before moved (a
 *  camera in the hand is both), moved before the light. */
export function steadyWindows(marks: readonly SteadyMark[], th: SteadyThresholds = STEADY): SteadyWindow[] {
  const out: SteadyWindow[] = [];
  for (let i = 0; i + th.window <= marks.length; i += th.window) {
    const w = marks.slice(i, i + th.window);
    const steps = w.slice(1).map((m, k) => Math.hypot(m.dx - w[k].dx, m.dy - w[k].dy));
    const shake = Math.sqrt(steps.reduce((s, x) => s + x * x, 0) / Math.max(1, steps.length));
    const moved = Math.hypot(median(w.map(m => m.dx)), median(w.map(m => m.dy)));
    const light = median(w.map(m => m.light));
    const word: SteadyWord = shake > th.shake ? 'shaking' : moved > th.moved ? 'moved' : Math.abs(light - 1) > th.light ? 'light' : 'steady';
    out.push({ at: w[0].t, shake, moved, light, word });
  }
  return out;
}

export interface SteadySummary {
  windows: number;
  /** the share of the windows said each way */
  shaking: number; moved: number; light: number;
  /** the worst step and the furthest place, px at the reading's width */
  shakeMax: number; movedMax: number;
  /** the first window that moved, and how far it sat (px at the reading's width) once it had */
  movedAt?: number; movedBy?: number;
  /** the first window whose light was off, and by how much (a share, + brighter) */
  lightAt?: number; lightBy?: number;
}

export function steadySummary(marks: readonly SteadyMark[], th: SteadyThresholds = STEADY): SteadySummary {
  const ws = steadyWindows(marks, th);
  const share = (f: (w: SteadyWindow) => boolean) => ws.length ? ws.filter(f).length / ws.length : 0;
  const firstMoved = ws.find(w => w.word === 'moved' || (w.word === 'shaking' && w.moved > th.moved));
  const firstLight = ws.find(w => Math.abs(w.light - 1) > th.light);
  return {
    windows: ws.length,
    shaking: share(w => w.word === 'shaking'),
    moved: share(w => w.moved > th.moved),
    light: share(w => Math.abs(w.light - 1) > th.light),
    shakeMax: ws.reduce((m, w) => Math.max(m, w.shake), 0),
    movedMax: ws.reduce((m, w) => Math.max(m, w.moved), 0),
    ...(firstMoved ? { movedAt: firstMoved.at, movedBy: median(ws.filter(w => w.at >= firstMoved.at).map(w => w.moved)) } : {}),
    ...(firstLight ? { lightAt: firstLight.at, lightBy: firstLight.light - 1 } : {}),
  };
}
