/* IS THE CAMERA STEADY? (lib/video/steady) — the picture's place against the
 * first frame found to a fraction of a pixel, the light kept apart from a
 * move, the search carried from one sample to the next, and two seconds at a
 * time said as steady, shaking, moved or the light. */
import { describe, expect, it } from 'vitest';
import { SEARCH, STEADY, SteadyCheck, shiftOf, steadySummary, steadyWindows, zeroMean, type SteadyMark } from '../steady';

const W = 160, H = 90;
/* a smooth picture with detail everywhere, its content moved by (dx, dy) and brightened by `plus` */
const picture = (dx = 0, dy = 0, plus = 0) => {
  const g = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x - dx, v = y - dy;
    g[y * W + x] = 120 + plus + 40 * Math.sin(u * 0.31 + v * 0.17) + 30 * Math.sin(u * 0.13 - v * 0.41) + 20 * Math.cos(u * 0.05 + v * 0.23);
  }
  return g;
};

describe('where the picture is against the first frame', () => {
  it('the average taken off, so the light is not a move', () => {
    const f = zeroMean([10, 20, 30]);
    expect(f.mean).toBe(20);
    expect([...f.o]).toEqual([-10, 0, 10]);
  });
  it('a whole-pixel move found exactly', () => {
    const s = shiftOf(zeroMean(picture()), zeroMean(picture(3, -2)), W, H);
    expect(s.ix).toBe(3); expect(s.iy).toBe(-2);
    expect(s.dx).toBeCloseTo(3, 1); expect(s.dy).toBeCloseTo(-2, 1);
    expect(s.full).toBe(true);
  });
  it('a move of a fraction of a pixel found to about a tenth', () => {
    for (const [dx, dy] of [[1.4, -0.6], [0.25, 0.1], [-2.75, 0.5], [0.5, 0.5], [0.1, -0.9]]) {
      const s = shiftOf(zeroMean(picture()), zeroMean(picture(dx, dy)), W, H);
      expect(Math.hypot(s.dx - dx, s.dy - dy)).toBeLessThan(0.15);
    }
    /* along one way only, where the lines are straightest, to a hundredth */
    const one = shiftOf(zeroMean(picture()), zeroMean(picture(0.4, 0)), W, H);
    expect(Math.abs(one.dx - 0.4)).toBeLessThan(0.01);
  });
  it('the same picture brighter is not moved', () => {
    const s = shiftOf(zeroMean(picture()), zeroMean(picture(0, 0, 30)), W, H);
    expect(s.dx).toBeCloseTo(0, 2); expect(s.dy).toBeCloseTo(0, 2);
    expect(s.left).toBeLessThan(0.01);
  });
  it('searched near the last place, and everywhere when the move is past it', () => {
    const near = shiftOf(zeroMean(picture()), zeroMean(picture(2, 1)), W, H, [2, 0]);
    expect(near.full).toBe(false);
    expect([near.ix, near.iy]).toEqual([2, 1]);
    const far = shiftOf(zeroMean(picture()), zeroMean(picture(-5, 4)), W, H, [0, 0]);
    expect(far.full).toBe(true);
    expect([far.ix, far.iy]).toEqual([-5, 4]);
  });
  it('a move past the search is said at its edge', () => {
    const s = shiftOf(zeroMean(picture()), zeroMean(picture(SEARCH + 4, 0)), W, H);
    expect(Math.abs(s.ix)).toBeLessThanOrEqual(SEARCH);
  });
});

describe('the check as it reads', () => {
  it('waits for a frame bright enough to see by, then holds each against it', () => {
    const c = new SteadyCheck(W, H);
    expect(c.add(0, new Float32Array(W * H))).toBeUndefined();          // dark: the camera waking
    const first = c.add(0.2, picture())?.mark;
    expect(first).toMatchObject({ t: 0.2, light: 1 });
    expect(Math.hypot(first?.dx ?? 9, first?.dy ?? 9)).toBeLessThan(0.01);
    const later = c.add(0.4, picture(1, 0, 12));
    expect(later?.mark.dx).toBeCloseTo(1, 1);
    expect(later?.mark.light).toBeCloseTo(132 / 120, 2);
    expect(c.marks).toHaveLength(2);
  });
});

describe('two seconds at a time', () => {
  const run = (f: (i: number) => Partial<SteadyMark>, n = 60): SteadyMark[] => Array.from({ length: n }, (_, i) => ({ t: i * 0.2, dx: 0, dy: 0, light: 1, ...f(i) }));
  it('still is steady', () => {
    const ws = steadyWindows(run(() => ({ dx: 0.001 })));
    expect(ws).toHaveLength(6);
    expect(ws.every(w => w.word === 'steady')).toBe(true);
    expect(steadySummary(run(() => ({})))).toMatchObject({ windows: 6, shaking: 0, moved: 0, light: 0 });
  });
  it('a place that jumps every sample is shaking', () => {
    const s = steadySummary(run(i => ({ dx: i % 2 ? 0.2 : -0.2 })));
    expect(s.shaking).toBe(1);
    expect(s.shakeMax).toBeCloseTo(0.4, 5);
  });
  it('knocked at 6 s and staying there is moved, from then, by how far', () => {
    const s = steadySummary(run(i => (i * 0.2 >= 6 ? { dx: 2, dy: 1 } : {})));
    expect(s.movedAt).toBeCloseTo(6, 5);
    expect(s.movedBy).toBeCloseTo(Math.hypot(2, 1), 5);
    expect(s.moved).toBe(0.5);
    expect(s.shaking).toBe(0);                 // the one jump is inside a window's median, not a shake
    expect(steadyWindows(run(i => (i * 0.2 >= 6 ? { dx: 2, dy: 1 } : {})))[4].word).toBe('moved');
  });
  it('the light brighter for a while is the light, not a move', () => {
    const s = steadySummary(run(i => (i >= 20 && i < 40 ? { light: 1.12 } : {})));
    expect(s.light).toBeCloseTo(2 / 6, 5);
    expect(s.lightAt).toBeCloseTo(4, 5);
    expect(s.lightBy).toBeCloseTo(0.12, 5);
    expect(s.moved).toBe(0);
  });
  it('the thresholds are the ones the probe was judged on', () => {
    expect(STEADY).toEqual({ shake: 0.12, moved: 0.75, light: 0.08, window: 10 });
  });
});
