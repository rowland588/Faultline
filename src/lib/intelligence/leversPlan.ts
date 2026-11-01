/* A RECOVERY PLAN — what the levers chosen buy, in hours, packs and pounds a shift and a week (FC-039;
 * knowledge/specs/FC-039-recovery-levers.md). Reads the levers `leversOf` works out and the period waterfall they came from, adds
 * nothing of its own to the arithmetic: the share taken off each loss, the minutes back a shift, the packs they make AT THE CONSTRAINT
 * (a minute recovered anywhere else is a minute and no packs — Goldratt's mirage), the money in its two parts — the lost contribution
 * (only at the constraint) and the crew's idle labour (wherever the stop is, as the band holds it) — never summed — the week when the line's
 * running pattern is known, the lever with the most to give at the constraint, and what is still to give. It is the one plan the screen's
 * panel and the paper print. Pure. */
import type { LeverRow, Levers } from './levers';
import type { PeriodWaterfall } from './waterfall';

export interface PlanRow {
  key: string;
  label: string;
  asset?: string;
  /** The share taken off, percent. */
  pct: number;
  onConstraint?: boolean;
  /** Minutes a shift loses to it, and gets back at that share. */
  perShift: number;
  backMin: number;
  /** Packs a shift — 0 off the constraint. */
  packs: number;
  /** £ a shift, the two parts: the lost contribution (the constraint only) and the idle labour. */
  contribution?: number;
  labour?: number;
  /** The same a week, when the line's shifts a week are known. */
  week?: { hours: number; packs: number; contribution?: number; labour?: number };
  /** The floor's sentence about it (levers.says): the mirage when it is off the constraint. */
  says: string;
}

export interface LeverPlan {
  rows: PlanRow[];
  shiftsPerWeek?: number;
  /** The whole, a shift and a week. */
  total: { backMin: number; packs: number; contribution?: number; labour?: number };
  week?: { hours: number; packs: number; contribution?: number; labour?: number };
  /** The loss with the most to give at the constraint, whatever share is chosen: "Breakdown on the Bagger — 40 min a shift". */
  prize?: { label: string; asset?: string; perShift: number };
  /** The one sentence, then what is still to give. */
  sentence: string;
  missing: string[];
  /** How it is known: shifts counted. */
  basis: string;
  /** The rows as a paper's lines. */
  lines: string[];
}

const int = (n: number) => Math.round(n).toLocaleString('en-GB');
const one = (n: number) => String(Number(n.toFixed(1)));
const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

export function leverPlan(fall: PeriodWaterfall, levers: Levers, o: { unit?: string; line?: string } = {}): LeverPlan {
  const unit = o.unit ?? 'packs';
  const spw = levers.perWeek && levers.perShift.min > 0 ? levers.perWeek.min / levers.perShift.min : undefined;
  const bandOf = (r: LeverRow) => fall.bands.find(b => b.key === r.key);
  const rows: PlanRow[] = levers.rows.filter(r => r.pct > 0 && r.back > 0).map(r => {
    const b = bandOf(r);
    const per = b && b.min > 0 ? r.back / b.min : 0;
    /* the lost contribution is only ever the constraint's; the idle crew is wherever the stop is */
    const contribution = b?.contribution != null && r.onConstraint !== false ? b.contribution * per : r.onConstraint === false ? 0 : undefined;
    const labour = b?.labour != null ? b.labour * per : undefined;
    const week = spw ? { hours: (r.back * spw) / 60, packs: r.packs * spw, ...(contribution != null ? { contribution: contribution * spw } : {}), ...(labour != null ? { labour: labour * spw } : {}) } : undefined;
    return { key: r.key, label: r.label, ...(r.asset ? { asset: r.asset } : {}), pct: r.pct, ...(r.onConstraint != null ? { onConstraint: r.onConstraint } : {}),
      perShift: r.perShift, backMin: r.back, packs: r.packs, ...(contribution != null ? { contribution } : {}), ...(labour != null ? { labour } : {}), ...(week ? { week } : {}), says: r.says };
  });
  const sum = (f: (r: PlanRow) => number | undefined) => rows.some(r => f(r) != null) ? rows.reduce((n, r) => n + (f(r) ?? 0), 0) : undefined;
  const total = { backMin: rows.reduce((n, r) => n + r.backMin, 0), packs: rows.reduce((n, r) => n + r.packs, 0), ...(sum(r => r.contribution) != null ? { contribution: sum(r => r.contribution) as number } : {}), ...(sum(r => r.labour) != null ? { labour: sum(r => r.labour) as number } : {}) };
  const week = spw && rows.length ? { hours: (total.backMin * spw) / 60, packs: total.packs * spw, ...(total.contribution != null ? { contribution: total.contribution * spw } : {}), ...(total.labour != null ? { labour: total.labour * spw } : {}) } : undefined;
  const top = levers.rows.filter(r => r.onConstraint !== false && r.perShift > 0).sort((a, b) => b.perShift - a.perShift)[0];
  const prize = top ? { label: top.label, ...(top.asset ? { asset: top.asset } : {}), perShift: top.perShift } : undefined;
  const missing: string[] = [];
  if (rows.length && !spw) missing.push('A week needs the line’s running pattern (shifts a day, days a week) — set it on the line’s SMED.');
  if (rows.some(r => r.onConstraint !== false && r.contribution == null)) missing.push('Give the line a margin a pack (Set up the line) to say the lost contribution.');
  if (rows.some(r => r.labour == null)) missing.push('Give the line its crew and a wage (Set up the line) to say the idle labour.');
  const unknown = rows.filter(r => r.onConstraint == null).map(r => r.label.toLowerCase());
  const basis = `${fall.shifts} shift${fall.shifts === 1 ? '' : 's'} counted in the period${fall.shifts ? `, ${int(fall.plannedMin)} planned minutes` : ''}`;

  const parts = (m: { packs: number; contribution?: number; labour?: number }, per: string) => [
    `${int(m.packs)} more ${unit} ${per}`,
    m.contribution != null ? `${gbp(m.contribution)} of lost contribution` : '',
    m.labour != null ? `${gbp(m.labour)} of idle labour` : '',
  ].filter(Boolean).join(' · ');
  const chosen = rows.map(r => `${one(r.pct)}% off ${r.label.toLowerCase()}${r.asset ? ` on the ${r.asset}` : ''}`).join(', ');
  let sentence: string;
  if (!rows.length) sentence = levers.says;
  else if (rows.every(r => r.onConstraint === false)) sentence = `${chosen}: ${one(total.backMin)} min a shift back and not one more ${unit.replace(/s$/, '')} — every loss chosen is off the constraint, which holds the line. The prize is at the constraint${prize ? `: ${prize.label.toLowerCase()}${prize.asset ? ` on the ${prize.asset}` : ''}, ${one(prize.perShift)} min a shift` : ''}.`;
  else sentence = `${chosen}: ${one(total.backMin)} min a shift back — ${parts(total, 'a shift')}${week ? `; a week of ${one(spw as number)} shifts, ${one(week.hours)} hours back — ${parts(week, 'a week')}` : ''}${unknown.length ? ` (${unknown.join(', ')}: only if on the constraint)` : ''}.`;
  const lines = rows.map(r => `${r.label}${r.asset ? ` · ${r.asset}` : ''}${r.onConstraint ? ' (constraint)' : r.onConstraint === false ? ' (not the constraint)' : ''} — ${one(r.pct)}% of ${one(r.perShift)} min a shift = ${one(r.backMin)} min back${r.week ? ` (${one(r.week.hours)} h a week)` : ''}: ${r.onConstraint === false ? `no more ${unit}` : `${int(r.packs)} ${unit} a shift${r.week ? `, ${int(r.week.packs)} a week` : ''}`}${r.contribution ? `, ${gbp(r.contribution)} of contribution a shift` : ''}${r.labour ? `, ${gbp(r.labour)} of idle labour a shift` : ''}.`);
  return { rows, ...(spw ? { shiftsPerWeek: spw } : {}), total, ...(week ? { week } : {}), ...(prize ? { prize } : {}), sentence, missing, basis, lines };
}
