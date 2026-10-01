/* A CHART'S Y AXIS IN ROUND NUMBERS.
 *
 * The measure charts padded the data by a third and labelled whatever that
 * came to: 29.05, 43.5, 57.95. Nobody reads a scale like that — the eye wants
 * 30, 40, 50, 60 and has to do sums instead. This picks a step of 1, 2, 2.5 or
 * 5 times a power of ten, then widens the range to whole steps, so every
 * gridline is a number somebody would have written down. Used by the screen
 * chart and the PDF's, so the two scales agree. */

export interface NiceScale { min: number; max: number; ticks: number[] }

export function niceScale(lo: number, hi: number, want = 4): NiceScale {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, ticks: [0, 1] };
  if (hi < lo) [lo, hi] = [hi, lo];
  // A flat series still needs a band to sit in.
  if (hi === lo) { const d = Math.max(Math.abs(hi) * 0.1, 1); lo -= d; hi += d; }
  // Air above and below, so the line never runs along the frame.
  const air = (hi - lo) * 0.15;
  let a = lo - air, b = hi + air;
  if (lo >= 0 && a < 0) a = 0;
  const raw = (b - a) / Math.max(1, want);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  a = Math.floor(a / step) * step;
  b = Math.ceil(b / step) * step;
  const ticks: number[] = [];
  for (let v = a; v <= b + step / 1000; v += step) ticks.push(Math.round(v / step) * step);
  // Floating point would print 0.30000000000000004.
  const clean = (v: number) => Number(v.toPrecision(12));
  return { min: clean(a), max: clean(b), ticks: ticks.map(clean) };
}
