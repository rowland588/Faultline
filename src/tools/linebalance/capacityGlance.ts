/* LINE CAPACITY AT A GLANCE — what a phone shows first (4 November — Rowland, of the page on his phone: "It's quite simple, like what I did. But when I look at it, it makes
 * no sense to me ... it's a user interface which is confusing me"). The page said the same answer in six places and opened every set-up box and working at once, about
 * seven screens for two stations. This is the one card that comes first: how fast the line goes, against what it should, what holds it, each station in its own words with
 * the limit marked, and the one thing to do. Everything else is one tap under "Show the workings". Read from the same result the page and the paper read (analyse,
 * planToTarget) — never a second answer. Pure. */
import { typedSpeedWords, type Capacity, type CapacityResult } from './capacity';
import { loadOf, loadSays } from './capacityLoad';
import type { Plan } from './capacityPlan';
import { fmtN } from './capacityWords';

export interface GlanceRow {
  name: string;
  /** What it was typed as — "2 pallets every 12 min", "70 units a minute". */
  speed: string;
  /** What it can do in the line's unit a minute, once its stops are counted — "60 units/min". */
  can: string;
  /** It is the station that holds the line. */
  holds: boolean;
  /** The weight that reaches a person in the same time — "A tray weighs 7.5 kg … 5,250 kg an hour" — when the line's unit weight is typed (capacityLoad). */
  load?: string;
}

export interface Glance {
  /** "60 units/min" — what the line makes; absent while no station can be counted. */
  makes?: string;
  target?: string;
  /** meets · short · none: whether it makes what it should. */
  state: 'meets' | 'short' | 'none';
  /** "10 short of 70 — 14%" · "meets the target of 70" · "no target typed". */
  against: string;
  heldBy?: string;
  rows: GlanceRow[];
  /** The one thing to do — the first step of the way to the target, or that nothing is needed. */
  fix?: string;
}

export function capacityGlance(r: CapacityResult, plan?: Plan, cap?: Pick<Capacity, 'unitKg' | 'stations'>): Glance {
  const unit = r.unit.trim() || 'units';
  /* EVERY STATION IN ORDER when the capacity is given — a person not yet timed has no speed, so is not counted, but still has the weight reaching them (capacityLoad) */
  const rows: GlanceRow[] = cap
    ? cap.stations.map((s, i) => {
      const x = r.ok.find(o => o.station.id === s.id);
      const l = loadOf(r, cap, s);
      return {
        name: s.name.trim() || `Station ${i + 1}`,
        speed: typedSpeedWords(s, i > 0 ? cap.stations[i - 1].unit : undefined),
        can: x ? `${fmtN(x.effective)} ${unit}/min` : 'not timed yet',
        holds: !!x && r.limit?.index === x.index,
        ...(l ? { load: loadSays(l) } : {}),
      };
    })
    : r.ok.map((x, i) => ({
      name: x.station.name.trim() || `Station ${x.index + 1}`,
      speed: typedSpeedWords(x.station, i > 0 ? r.ok[i - 1].station.unit : undefined),
      can: `${fmtN(x.effective)} ${unit}/min`,
      holds: r.limit?.index === x.index,
    }));
  if (r.line == null) return { state: 'none', against: 'Not enough set up yet to say how fast the line goes', rows };
  const target = r.target;
  const gap = r.gap;
  const state: Glance['state'] = target == null ? 'none' : gap != null && gap > 1e-9 ? 'short' : 'meets';
  const against = target == null ? 'no target typed'
    : state === 'short' ? `${fmtN(gap as number)} short of ${fmtN(target)} — ${Math.round(((gap as number) / target) * 100)}% of the target`
    : `meets the target of ${fmtN(target)}`;
  const first = plan?.steps[0];
  const fix = state === 'short'
    ? (first ? (plan?.reached ? `${first.text}${plan.steps.length > 1 ? ` — and ${plan.steps.length - 1} more step${plan.steps.length === 2 ? '' : 's'} in the workings` : ''}` : (plan?.stuck ?? first.text)) : undefined)
    : undefined;
  return { makes: `${fmtN(r.line)} ${unit}/min`, ...(target != null ? { target: `${fmtN(target)} ${unit}/min` } : {}), state, against,
    ...(r.limit ? { heldBy: r.limit.station.name.trim() || `Station ${r.limit.index + 1}` } : {}), rows, ...(fix ? { fix } : {}) };
}
