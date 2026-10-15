/* WHERE A LINE'S TIME WENT, OVER WEEKS — every counted shift's waterfall
 * (lib/ie/losses, the shift time model of docs/CAPACITY.md §5) added up
 * (docs/upgrade-plan.md, Capacity). Planned minutes at the top; each loss band
 * the floor's own reason — a stop category, changeovers, rejects, slow
 * running and short stops — summed across the shifts; good output at the foot.
 * Every band keeps the shifts it came from, so it opens to them, and they to
 * their stops. Pure: the shifts' figures in, the period out. */
import type { LossBar, LossFigures } from '../ie/losses';
import { onConstraint, type LineConstraint } from './constraint';

export interface PeriodBand {
  key: string;
  kind: LossBar['kind'];
  label: string;
  min: number;
  stops: number;
  /** The machine carrying most of its minutes across the shifts. */
  asset?: string;
  labour?: number;
  contribution?: number;
  /** The shifts (loss counts) it is made of. */
  countIds: string[];
  /** On the line's constraint? Undefined when not known or not a stop. */
  onConstraint?: boolean;
  /** The mirage, when the band's machine is not the constraint. */
  says?: string;
}

export interface PeriodWaterfall {
  shifts: number;
  plannedMin: number;
  /** Good output, in the minutes of the ideal speed it would take. */
  goodMin: number;
  lostMin: number;
  bands: PeriodBand[];
  labour: number;
  contribution: number;
  hasMoney: boolean;
  says: string;
}

export function periodWaterfall(shifts: readonly { id: string; figures: LossFigures }[], constraint?: LineConstraint): PeriodWaterfall {
  const counted = shifts.filter(s => s.figures.enough && (s.figures.plannedMin ?? 0) > 0);
  const by = new Map<string, PeriodBand & { assets: Map<string, number> }>();
  let planned = 0, good = 0, labour = 0, contribution = 0, hasMoney = false;
  for (const s of counted) {
    const f = s.figures;
    planned += f.plannedMin ?? 0;
    if (f.made != null && f.rate) good += f.made / f.rate;
    for (const b of f.bars) {
      const e = by.get(b.key) ?? { key: b.key, kind: b.kind, label: b.label, min: 0, stops: 0, countIds: [], assets: new Map<string, number>() };
      e.min += b.min; e.stops += b.stops ?? 0;
      if (b.asset) e.assets.set(b.asset, (e.assets.get(b.asset) ?? 0) + b.min);
      if (b.labour != null) { e.labour = (e.labour ?? 0) + b.labour; labour += b.labour; hasMoney = true; }
      if (b.contribution != null) { e.contribution = (e.contribution ?? 0) + b.contribution; contribution += b.contribution; hasMoney = true; }
      if (!e.countIds.includes(s.id)) e.countIds.push(s.id);
      by.set(b.key, e);
    }
  }
  const bands: PeriodBand[] = [...by.values()].filter(b => b.min > 0).map(({ assets, ...b }) => {
    const asset = [...assets].sort((x, y) => y[1] - x[1])[0]?.[0];
    /* slow running and short stops are judged against the bottleneck's own
       ideal speed: line time at the constraint by definition */
    const pace = (b.kind === 'performance' || b.kind === 'slow' || b.kind === 'short') && constraint
      ? { on: true as const, says: `Below the ${constraint.name}’s ideal speed — line time at the constraint: every minute is output.` } : undefined;
    const on = pace ?? (b.kind === 'cause' && asset ? onConstraint(asset, constraint) : undefined);
    return { ...b, ...(asset ? { asset } : {}), ...(on && on.on != null ? { onConstraint: on.on, says: on.says } : {}) };
  }).sort((a, b) => b.min - a.min);
  const lost = bands.reduce((n, b) => n + b.min, 0);
  const pct = (m: number) => (planned > 0 ? Math.round((m / planned) * 100) : 0);
  const top = bands[0];
  const says = !counted.length ? 'No shift counted in the period — count one at the end of a shift and the waterfall starts.'
    : `${counted.length} shift${counted.length === 1 ? '' : 's'} counted: ${pct(good)}% of the planned time made good packs; ${pct(lost)}% was lost${top ? ` — most to ${top.label.toLowerCase()} (${Math.round(top.min).toLocaleString('en-GB')} min${top.asset ? `, mostly the ${top.asset}` : ''})` : ''}.`;
  return { shifts: counted.length, plannedMin: planned, goodMin: good, lostMin: lost, bands, labour, contribution, hasMoney, says };
}
