/* HOW GOOD THE READING IS — measured, never claimed (docs/VIDEO.md,
 * accuracy). Detected events are matched to events whose times are known
 * (footage made with a known schedule, or a person's own timing of real
 * footage), one station at a time: a detection matches the true event it
 * overlaps most, if they share at least `minIoU` of their joint span.
 * Pure — run by the unit tests on recorded signals and by the evaluation
 * script on footage. */
import { stats } from './study';

export interface Timed { zone: string; start: number; end: number }

export interface Evaluation {
  truth: number;
  detected: number;
  matched: number;
  /** matched ÷ detected, matched ÷ truth. */
  precision: number;
  recall: number;
  /** Detections over a true event already matched. */
  duplicates: number;
  /** True events nothing matched. */
  missed: number;
  /** Mean seconds between a matched pair's starts, and their ends. */
  startErr: number;
  endErr: number;
  /** Each station's mean work and mean cycle, true against read, seconds. */
  stations: { zone: string; workTrue?: number; workRead?: number; workErr?: number; cycleTrue?: number; cycleRead?: number; cycleErr?: number }[];
}

const iou = (a: Timed, b: Timed) => {
  const inter = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const union = Math.max(a.end, b.end) - Math.min(a.start, b.start);
  return union > 0 ? inter / union : 0;
};

const cyclesOf = (xs: Timed[]) => xs.slice(1).map((x, i) => x.start - xs[i].start);

export function evaluate(truth: readonly Timed[], read: readonly Timed[], o: { minIoU?: number } = {}): Evaluation {
  const minIoU = o.minIoU ?? 0.3;
  const zones = [...new Set([...truth, ...read].map(x => x.zone))];
  let matched = 0, duplicates = 0, missed = 0;
  const sErr: number[] = [], eErr: number[] = [];
  const stations: Evaluation['stations'] = [];
  for (const z of zones) {
    const t = truth.filter(x => x.zone === z).sort((a, b) => a.start - b.start);
    const r = read.filter(x => x.zone === z).sort((a, b) => a.start - b.start);
    const taken = new Set<number>();
    for (const d of r) {
      let best = -1, bestIoU = 0;
      t.forEach((x, i) => { const v = iou(d, x); if (v > bestIoU) { bestIoU = v; best = i; } });
      if (best < 0 || bestIoU < minIoU) continue;
      if (taken.has(best)) { duplicates++; continue; }
      taken.add(best); matched++;
      sErr.push(Math.abs(d.start - t[best].start)); eErr.push(Math.abs(d.end - t[best].end));
    }
    missed += t.length - taken.size;
    const wt = stats(t.map(x => x.end - x.start))?.mean, wr = stats(r.map(x => x.end - x.start))?.mean;
    const ct = stats(cyclesOf(t))?.mean, cr = stats(cyclesOf(r))?.mean;
    stations.push({ zone: z, ...(wt !== undefined ? { workTrue: wt } : {}), ...(wr !== undefined ? { workRead: wr } : {}),
      ...(wt !== undefined && wr !== undefined ? { workErr: wr - wt } : {}),
      ...(ct !== undefined ? { cycleTrue: ct } : {}), ...(cr !== undefined ? { cycleRead: cr } : {}),
      ...(ct !== undefined && cr !== undefined ? { cycleErr: cr - ct } : {}) });
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    truth: truth.length, detected: read.length, matched,
    precision: read.length ? matched / read.length : 0, recall: truth.length ? matched / truth.length : 0,
    duplicates, missed, startErr: mean(sErr), endErr: mean(eErr), stations,
  };
}
