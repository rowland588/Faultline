/* A PART THAT WEARS, AS A COUNT SEES IT (knowledge/specs/FC-060-weibull.md) —
 * the lives a count's Weibull is fitted to: the ones typed (a part's age when
 * it failed, or its age and still running, each its own entry in
 * facts.lives), and, when the count says so, the study's own gaps (the part
 * replaced at each event). The page and the paper read this one view. Pure. */
import type { RelLife } from '../../lib/study';
import type { RelCounter, RelFigures } from './reliability';
import { ageReplacement, fitWeibull, validAge, watchLives, type Life, type Replacement, type WeibullFit } from './weibull';

export interface WearView {
  unit: string;
  lives: Life[];
  /** The typed lives of this count, struck ones apart (to list). */
  typed: RelLife[];
  struck: RelLife[];
  /** How many came from the watch's gaps. */
  fromWatchN: number;
  fit: WeibullFit;
  hasRunning: boolean;
  cp?: number; cf?: number;
  rep?: Replacement;
  /** The age and the stretch the conditional chance is first asked at. */
  age?: number; ahead?: number;
}

const round2 = (x: number): number => { const p = 10 ** (Math.floor(Math.log10(Math.max(x, 1e-9))) - 1); return Math.max(p, Math.round(x / p) * p); };

export function wearOf(c: RelCounter, f: RelFigures, lives: readonly RelLife[] | undefined): WearView | undefined {
  if (!c.wear) return undefined;
  const mine = (lives ?? []).filter(l => l.count === c.id);
  const typed = mine.filter(l => !l.struck && validAge(l.age)).sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  const struck = mine.filter(l => l.struck);
  const fromWatch = c.wear.fromWatch ? watchLives(f.points.map(p => p.h), f.hours, !!c.wear.newAtStart) : [];
  const all: Life[] = [...typed.map(l => ({ age: l.age, failed: l.failed })), ...fromWatch];
  const fit = fitWeibull(all);
  const unit = c.wear.fromWatch ? 'hours' : c.wear.unit?.trim() || 'hours';
  const cp = c.wear.swapCost !== undefined && c.wear.swapCost >= 0 ? c.wear.swapCost : undefined;
  const cf = c.wear.failCost !== undefined && c.wear.failCost > 0 ? c.wear.failCost : undefined;
  const rep = fit.says === 'wears' && fit.beta !== undefined && fit.eta !== undefined && cp !== undefined && cf !== undefined ? ageReplacement(fit.beta, fit.eta, cp, cf) : undefined;
  const running = all.filter(l => !l.failed).map(l => l.age);
  const age = running.length ? Math.max(...running) : fit.eta !== undefined ? round2(fit.eta / 2) : undefined;
  const ahead = fit.b10 !== undefined ? round2(fit.b10 / 2) : undefined;
  return { unit, lives: all, typed, struck, fromWatchN: fromWatch.length, fit, hasRunning: running.length > 0, ...(cp !== undefined ? { cp } : {}), ...(cf !== undefined ? { cf } : {}),
    ...(rep ? { rep } : {}), ...(age !== undefined ? { age } : {}), ...(ahead !== undefined ? { ahead } : {}) };
}
