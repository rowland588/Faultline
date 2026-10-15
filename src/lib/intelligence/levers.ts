/* RECOVERY LEVERS — "what if we took a fifth off the breakdowns?" worked out
 * live (docs/upgrade-plan.md, C; the brief: "pick the top loss reasons, drag a
 * % reduction, recalculate live in hours, units and £ per week").
 *
 * THE MIRAGE, KEPT (Goldratt): minutes recovered on the constraint come back
 * as output at the line's ideal speed; minutes recovered anywhere else make no
 * more — they are said as minutes, with 0 packs, and where the prize is. When
 * the constraint is not known the gain is said "if it is on the constraint".
 *
 * Per counted shift from the period's waterfall, per week only when the line's
 * running pattern is known (shifts × days, from its SMED) — never assumed.
 * Pure. */
import type { PeriodBand, PeriodWaterfall } from './waterfall';

export interface LeverRow {
  key: string;
  label: string;
  asset?: string;
  /** Minutes a counted shift loses to it. */
  perShift: number;
  pct: number;
  /** Minutes back a shift at that reduction. */
  back: number;
  /** Packs a shift — 0 off the constraint. */
  packs: number;
  /** £ a shift, from the band's own cost a minute — 0 off the constraint. */
  pounds?: number;
  onConstraint?: boolean;
  says: string;
}

export interface Levers {
  rows: LeverRow[];
  perShift: { min: number; packs: number; pounds?: number };
  perWeek?: { min: number; packs: number; pounds?: number };
  says: string;
}

export function leversOf(fall: PeriodWaterfall, ideal: number | undefined, pct: Record<string, number>, shiftsPerWeek?: number, unit = 'packs'): Levers {
  const pick = fall.bands.filter((b: PeriodBand) => b.kind === 'cause' || b.kind === 'changeover').slice(0, 6);
  const fmt = (n: number, d = 0) => n.toLocaleString('en-GB', { maximumFractionDigits: d });
  const rows: LeverRow[] = pick.map(b => {
    const perShift = fall.shifts ? b.min / fall.shifts : 0;
    const p = Math.max(0, Math.min(100, pct[b.key] ?? 0)) / 100;
    const back = perShift * p;
    const off = b.onConstraint === false;
    const packs = off || !ideal ? 0 : back * ideal;
    const money = (b.labour ?? 0) + (b.contribution ?? 0);
    const pounds = off || !(money > 0) || !(b.min > 0) ? (off ? 0 : undefined) : back * (money / b.min);
    const says = !(p > 0) ? '' : off
      ? `${fmt(back, 1)} min a shift back on the ${b.asset ?? 'a machine that is not the constraint'} — no more ${unit}: it is not where the line is held.`
      : `${fmt(back, 1)} min a shift back${b.onConstraint == null ? ' — if it is on the constraint' : ''} = ${fmt(packs)} ${unit}${pounds != null ? ` · £${fmt(pounds)}` : ''} a shift.`;
    return { key: b.key, label: b.label, ...(b.asset ? { asset: b.asset } : {}), perShift, pct: p * 100, back, packs, ...(pounds != null ? { pounds } : {}), ...(b.onConstraint != null ? { onConstraint: b.onConstraint } : {}), says };
  });
  const sum = (k: 'back' | 'packs') => rows.reduce((n, r) => n + r[k], 0);
  const anyMoney = rows.some(r => r.pounds != null);
  const perShift = { min: sum('back'), packs: sum('packs'), ...(anyMoney ? { pounds: rows.reduce((n, r) => n + (r.pounds ?? 0), 0) } : {}) };
  const perWeek = shiftsPerWeek && shiftsPerWeek > 0 ? { min: perShift.min * shiftsPerWeek, packs: perShift.packs * shiftsPerWeek, ...(perShift.pounds != null ? { pounds: perShift.pounds * shiftsPerWeek } : {}) } : undefined;
  const offOnly = rows.some(r => r.back > 0) && rows.every(r => r.back === 0 || r.onConstraint === false);
  const says = !rows.some(r => r.back > 0) ? 'Slide a loss down to see what it gives back.'
    : offOnly ? `Every loss chosen is off the constraint — ${fmt(perShift.min, 1)} min a shift back and not one more ${unit.replace(/s$/, '')}. The prize is at the constraint.`
      : `${fmt(perShift.packs)} more ${unit} a shift${perShift.pounds != null ? ` (£${fmt(perShift.pounds)})` : ''}${perWeek ? ` — ${fmt(perWeek.packs)} a week${perWeek.pounds != null ? `, £${fmt(perWeek.pounds)}` : ''}` : ' — a week once the line’s running days are known'}.`;
  return { rows, perShift, ...(perWeek ? { perWeek } : {}), says };
}
