/* THE SPAGHETTI DIAGRAM, SEVERAL PEOPLE — FC-004 part 2 (knowledge/specs/FC-004-spaghetti-diagram.md, "Part 2"; docs/LINE-TALK-TOOLSETS.md §4.2).
 *
 * Up to four walkers, each the places walked in order. A leg is the move from one place to the next; it has a length only if one was given (metres walked) or both
 * places are positioned on a layout — otherwise it is counted as a move and never given a length. The diagram is to scale only when every place walked has a position;
 * otherwise it is a schematic (places arranged on a circle for reading), said to be that. Pure: the calculator, its paper, the Line Talk set and the tests read these figures.
 * Nothing here reads where anybody went: every place and metre is typed or said. */
import { PACE, walkMoney, type PaceKind } from './spaghetti';

export const WALKERS_MAX = 4;
export const STEPS_MAX = 12;

export interface WalkerStep { place: string; /** metres walked from the step before */ m?: number; x?: number; y?: number }
export interface Walker { label: string; steps: WalkerStep[] }

export const keyOf = (n: string): string => n.trim().toLowerCase().replace(/\s+/g, ' ');

/** A walker as it will be read: steps with no name dropped and a place repeated straight after itself taken as one (standing still is not a move). */
export function cleanWalker(w: Walker): Walker {
  const steps: WalkerStep[] = [];
  for (const s of w.steps) {
    const name = s.place.trim();
    if (!name) continue;
    if (steps.length && keyOf(steps[steps.length - 1].place) === keyOf(name)) continue;
    steps.push({ ...s, place: name });
  }
  return { label: w.label.trim(), steps };
}

export interface WalkerLeg { from: string; to: string; m?: number; source: 'walked' | 'straight' | 'none' }

const gap = (a: WalkerStep, b: WalkerStep): number | undefined =>
  a.x !== undefined && a.y !== undefined && b.x !== undefined && b.y !== undefined ? Math.hypot(b.x - a.x, b.y - a.y) : undefined;

export function legsOfWalker(w: Walker): WalkerLeg[] {
  const out: WalkerLeg[] = [];
  for (let i = 1; i < w.steps.length; i++) {
    const a = w.steps[i - 1], b = w.steps[i], straight = gap(a, b), m = b.m !== undefined ? b.m : straight;
    out.push({ from: a.place, to: b.place, ...(m !== undefined ? { m } : {}), source: b.m !== undefined ? 'walked' : straight !== undefined ? 'straight' : 'none' });
  }
  return out;
}

export interface WalkerFigure { label: string; stops: number; legs: number; /** metres of the legs that have a length */ m: number; /** legs with no length */ missing: number; complete: boolean; legList: WalkerLeg[] }
export interface Route { a: string; b: string; walkers: string[]; legs: number; m: number; complete: boolean }
export interface Arrival { place: string; n: number }
export interface WalkersFigures {
  walkers: WalkerFigure[];
  legs: number; m: number; missing: number; complete: boolean;
  /** who walks most: by metres when every leg of everyone has a length, else by the moves counted */
  most?: { label: string; by: 'metres' | 'moves'; value: number; share: number };
  arrivals: Arrival[];
  busiest?: Arrival;
  routes: Route[];
  /** places walked, once each, in the order first met */
  places: string[];
}

export function walkersFigures(input: readonly Walker[]): WalkersFigures {
  const walkers = input.map(cleanWalker).filter(w => w.steps.length >= 1);
  const figs: WalkerFigure[] = walkers.map(w => {
    const legList = legsOfWalker(w);
    const missing = legList.filter(l => l.m === undefined).length;
    return { label: w.label, stops: w.steps.length, legs: legList.length, m: legList.reduce((t, l) => t + (l.m ?? 0), 0), missing, complete: missing === 0 && legList.length > 0, legList };
  });
  const legs = figs.reduce((t, f) => t + f.legs, 0), m = figs.reduce((t, f) => t + f.m, 0), missing = figs.reduce((t, f) => t + f.missing, 0);
  const complete = legs > 0 && missing === 0;

  const names = new Map<string, string>(); // key -> first spelling
  const seen: string[] = [];
  const arr = new Map<string, number>();
  for (const w of walkers) w.steps.forEach((s, i) => {
    const k = keyOf(s.place);
    if (!names.has(k)) { names.set(k, s.place); seen.push(k); }
    if (i > 0) arr.set(k, (arr.get(k) ?? 0) + 1);
  });
  const arrivals = [...arr.entries()].map(([k, n]) => ({ place: names.get(k) as string, n }))
    .sort((a, b) => b.n - a.n || seen.indexOf(keyOf(a.place)) - seen.indexOf(keyOf(b.place)));

  const pairs = new Map<string, { a: string; b: string; who: Set<string>; legs: number; m: number; missing: number }>();
  figs.forEach(f => f.legList.forEach(l => {
    const ka = keyOf(l.from), kb = keyOf(l.to), k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    const p = pairs.get(k) ?? { a: names.get(ka < kb ? ka : kb) as string, b: names.get(ka < kb ? kb : ka) as string, who: new Set<string>(), legs: 0, m: 0, missing: 0 };
    p.who.add(f.label); p.legs++; p.m += l.m ?? 0; if (l.m === undefined) p.missing++;
    pairs.set(k, p);
  }));
  const routes: Route[] = [...pairs.values()].filter(p => p.who.size >= 2)
    .map(p => ({ a: p.a, b: p.b, walkers: [...p.who], legs: p.legs, m: p.m, complete: p.missing === 0 }))
    .sort((x, y) => y.walkers.length - x.walkers.length || y.m - x.m || y.legs - x.legs);

  let most: WalkersFigures['most'];
  if (figs.some(f => f.legs > 0)) {
    const by: 'metres' | 'moves' = complete ? 'metres' : 'moves';
    const val = (f: WalkerFigure): number => (by === 'metres' ? f.m : f.legs);
    const top = figs.reduce((best, f) => (val(f) > val(best) ? f : best), figs[0]);
    const total = by === 'metres' ? m : legs;
    most = { label: top.label, by, value: val(top), share: total > 0 ? val(top) / total : 0 };
  }
  return { walkers: figs, legs, m, missing, complete, ...(most ? { most } : {}), arrivals, ...(arrivals[0] ? { busiest: arrivals[0] } : {}), routes, places: seen.map(k => names.get(k) as string) };
}

/* ------------------------------------------------------------------ the shift */

export interface WalkersShift { rounds: number; ms: number; shiftM: number; minutes: number; perWalker: { label: string; m: number; minutes: number }[]; money: ReturnType<typeof walkMoney> }

/** A shift of rounds × a round, at a pace — only for walkers whose every leg has a length (the caller checks `complete`). */
export function walkersShift(f: WalkersFigures, o: { rounds: number; pace: PaceKind; paceMs?: number; rate?: number; shiftsWeek?: number }): WalkersShift {
  const ms = o.pace === 'timed' ? (o.paceMs as number) : PACE[o.pace].ms;
  const perWalker = f.walkers.map(w => ({ label: w.label, m: w.m * o.rounds, minutes: (w.m * o.rounds) / ms / 60 }));
  const shiftM = f.m * o.rounds, minutes = shiftM / ms / 60;
  return { rounds: o.rounds, ms, shiftM, minutes, perWalker, money: walkMoney(minutes, { ...(o.rate !== undefined ? { rate: o.rate } : {}), ...(o.shiftsWeek !== undefined ? { shiftsPerWeek: o.shiftsWeek } : {}) }) };
}

/* ------------------------------------------------------------------ the drawing */

/** The line styles told apart by place and dash, never by a state colour: graphite · teal · graphite dashed · teal dashed. */
export const WALKER_STYLES: readonly { mark: 'ink' | 'brand'; dash: boolean; word: string }[] = [
  { mark: 'ink', dash: false, word: 'solid graphite' }, { mark: 'brand', dash: false, word: 'solid teal' },
  { mark: 'ink', dash: true, word: 'dashed graphite' }, { mark: 'brand', dash: true, word: 'dashed teal' },
];

/** True when every step of every walker has a position — the only time the diagram is drawn to scale. */
export function toScale(input: readonly Walker[]): boolean {
  const ws = input.map(cleanWalker).filter(w => w.steps.length >= 2);
  return ws.length > 0 && ws.every(w => w.steps.every(s => s.x !== undefined && s.y !== undefined));
}

export interface DrawnLine { walker: number; label: string; points: [number, number][] }
export interface Scene { toScale: boolean; lines: DrawnLine[]; dots: { x: number; y: number; label: string }[]; window: { x0: number; x1: number; y0: number; y1: number } }

/** The scene: to scale from the positions, else the places on a circle (the first place met at the top, then clockwise), each walker's legs nudged sideways by a
 *  small fixed amount so that two people on the same route are two lines, not one. */
export function sceneOf(input: readonly Walker[]): Scene {
  const ws = input.map(cleanWalker).filter(w => w.steps.length >= 2);
  const scale = toScale(ws);
  if (scale) {
    const lines = ws.map((w, k) => ({ walker: k, label: w.label, points: w.steps.map(s => [s.x as number, s.y as number] as [number, number]) }));
    const seen = new Set<string>(), dots: Scene['dots'] = [];
    ws.forEach(w => w.steps.forEach(s => { const k = keyOf(s.place); if (!seen.has(k)) { seen.add(k); dots.push({ x: s.x as number, y: s.y as number, label: s.place }); } }));
    const xs = dots.map(d => d.x), ys = dots.map(d => d.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = Math.max(2, 0.12 * Math.max(x1 - x0, y1 - y0));
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (w / h > 2.5) { const nh = w / 2.5; y0 = cy - nh / 2; y1 = cy + nh / 2; } else if (h / w > 2.5) { const nw = h / 2.5; x0 = cx - nw / 2; x1 = cx + nw / 2; }
    return { toScale: true, lines, dots, window: { x0, x1, y0, y1 } };
  }
  const order: string[] = [], nm = new Map<string, string>();
  ws.forEach(w => w.steps.forEach(s => { const k = keyOf(s.place); if (!nm.has(k)) { nm.set(k, s.place); order.push(k); } }));
  const n = order.length, pos = new Map<string, [number, number]>();
  order.forEach((k, i) => { const a = Math.PI / 2 - (2 * Math.PI * i) / Math.max(n, 1); pos.set(k, [Math.cos(a), Math.sin(a)]); });
  const W = ws.length, lines: DrawnLine[] = [];
  ws.forEach((w, k) => {
    const off = (k - (W - 1) / 2) * 0.06;
    for (let i = 1; i < w.steps.length; i++) {
      const a = pos.get(keyOf(w.steps[i - 1].place)) as [number, number], b = pos.get(keyOf(w.steps[i].place)) as [number, number];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      lines.push({ walker: k, label: i === 1 ? w.label : '', points: [[a[0] + nx * off, a[1] + ny * off], [b[0] + nx * off, b[1] + ny * off]] });
    }
  });
  const dots = order.map(k => ({ x: (pos.get(k) as [number, number])[0], y: (pos.get(k) as [number, number])[1], label: nm.get(k) as string }));
  return { toScale: false, lines, dots, window: { x0: -1.5, x1: 1.5, y0: -1.3, y1: 1.3 } };
}
