/* THE LINE, DRAWN — what the capacity page draws beside the stations as they
 * are typed (Rowland, 16 October: "I should be able to see things appear to
 * the right-hand side of my screen ... being able to see what you're doing
 * makes no sense ... the graphs make no sense").
 *
 * One model for both pictures on the right: the flow (each line running down,
 * the lines meeting, what comes after, what the line makes) and the bars (what
 * each station can do, in the line's unit a minute, beside what the line makes
 * and the target). Every station is in it from the moment it is typed — one
 * with no speed yet is drawn as such, never left out — so a person sees the
 * line take shape as they fill it in. Read from `analyse`; nothing worked out
 * here that the sums do not already say. Pure. */
import { FEED_ZONE, type Capacity, type CapacityResult, type Station } from './capacity';

export interface FlowNode {
  id: string;
  /** Its place in the capacity's stations — what a tap opens. */
  index: number;
  name: string;
  kind: Station['kind'];
  /** What it can do once its own stops count, in the line's unit a minute;
   *  undefined when it has no speed yet. */
  perMin?: number;
  /** Holds the whole line back. */
  isLimit: boolean;
  /** Sets the pace of its own line, when several feed in, but not the whole. */
  isOwnLimit: boolean;
}

export interface FlowColumn {
  id: string;
  name: string;
  nodes: FlowNode[];
  /** What this line can send on its own, in the line's unit a minute. */
  sends?: number;
  /** With a shared feed before the lines: what the feed gives this line, never more than it can send. */
  fed?: number;
}

export interface FlowModel {
  unit: string;
  /** One column for a single chain; one a line when several feed in. */
  columns: FlowColumn[];
  /** Several lines feeding one place. */
  laned: boolean;
  /** The shared stations before the lines split (FC-034 part 4); empty when there is no shared feed. */
  feed: FlowNode[];
  /** What the feed can supply the lines with, in their first unit a minute. */
  supplies?: number;
  /** How it splits: whichever line can take it, or by fixed shares. */
  split?: 'any' | 'shares';
  /** The stations after the lines merge; empty when they do not merge. */
  shared: FlowNode[];
  /** What the lines send together into the merge. */
  sends?: number;
  /** What the whole line makes, in the line's unit a minute. */
  makes?: number;
  target?: number;
  /** True when every line holds the same stations at the same speeds. */
  alike: boolean;
}

const nameOf = (s: Station, i: number) => s.name.trim() || `Station ${i + 1}`;

export function flowModel(cap: Capacity, r: CapacityResult, alike = false): FlowModel {
  const lanes = cap.lanes ?? [];
  const limitId = r.limit?.station.id;
  const node = (s: Station, perMin: number | undefined, ownLimitId?: string): FlowNode => {
    const index = cap.stations.indexOf(s);
    return {
      id: s.id, index, name: nameOf(s, index), kind: s.kind,
      ...(perMin != null && Number.isFinite(perMin) ? { perMin } : {}),
      isLimit: s.id === limitId, isOwnLimit: !!ownLimitId && s.id === ownLimitId && s.id !== limitId,
    };
  };
  const base = { unit: r.unit, ...(r.line != null ? { makes: r.line } : {}), ...(cap.targetPerMin != null ? { target: cap.targetPerMin } : {}) };
  if (!lanes.length) {
    const eff = new Map(r.ok.map(x => [x.station.id, x.effective]));
    return { ...base, laned: false, alike: false, feed: [], shared: [], columns: [{ id: 'line', name: '', nodes: cap.stations.map(s => node(s, eff.get(s.id))), ...(r.line != null ? { sends: r.line } : {}) }] };
  }
  const ids = new Set(lanes.map(l => l.id));
  const columns: FlowColumn[] = lanes.map((l, k) => {
    const sec = r.lanes?.sections.find(x => x.id === l.id);
    const eff = new Map((sec?.result.ok ?? []).map(x => [x.station.id, x.effective]));
    const own = sec?.result.limit?.station.id;
    return {
      id: l.id, name: l.name.trim() || `Line ${String.fromCharCode(65 + (k % 26))}`,
      nodes: cap.stations.filter(s => s.lane === l.id).map(s => node(s, eff.get(s.id), own)),
      ...(sec?.result.line != null ? { sends: sec.result.line } : {}),
      ...(sec?.fed != null ? { fed: sec.fed } : {}),
    };
  });
  const effFeed = new Map((r.lanes?.feed?.ok ?? []).map(x => [x.station.id, x.effective]));
  const feed = cap.stations.filter(s => s.lane === FEED_ZONE).map(s => node(s, effFeed.get(s.id), r.lanes?.feed?.limit?.station.id));
  const effShared = new Map((r.lanes?.merged?.ok ?? []).map(x => [x.station.id, x.effective]));
  const shared = cap.stations.filter(s => s.lane !== FEED_ZONE && (!s.lane || !ids.has(s.lane))).map(s => node(s, effShared.get(s.id)));
  return { ...base, laned: true, alike, columns, feed, shared, ...(r.lanes ? { sends: r.lanes.sends } : {}), ...(r.lanes?.supplies != null ? { supplies: r.lanes.supplies, ...(r.lanes.split ? { split: r.lanes.split } : {}) } : {}) };
}

/** A FIGURE AS THE FLOOR READS IT — "68.8" not "68.7999", "1,240" not "1240". */
export const perMinWords = (n: number): string =>
  n.toLocaleString('en-GB', { maximumFractionDigits: n >= 100 ? 0 : 1 });

/** THE BARS — what each station can do beside what it has to: one group a
 *  line (one for every line when they are alike), then where they merge, its
 *  first row what the lines send it. `ref` is what the group actually does:
 *  a line's own limit, or what the whole makes. */
export interface BarRow { id: string; index: number; name: string; perMin?: number; isLimit: boolean; isOwnLimit: boolean; isInflow?: boolean; kind?: Station['kind'] }
export interface BarGroup { key: string; title: string; rows: BarRow[]; ref?: number; refSays?: string; target?: number }

export function barGroups(m: FlowModel): BarGroup[] {
  const row = (n: FlowNode): BarRow => ({ id: n.id, index: n.index, name: n.name, ...(n.perMin != null ? { perMin: n.perMin } : {}), isLimit: n.isLimit, isOwnLimit: n.isOwnLimit, kind: n.kind });
  if (!m.laned) {
    const c = m.columns[0];
    return [{ key: 'line', title: 'Every station', rows: c.nodes.map(row),
      ...(m.makes != null ? { ref: m.makes, refSays: `the line makes ${perMinWords(m.makes)}` } : {}),
      ...(m.target != null ? { target: m.target } : {}) }];
  }
  const cols = m.alike ? m.columns.slice(0, 1) : m.columns;
  const groups: BarGroup[] = m.feed.length ? [{ key: 'feed', title: 'Before the lines split', rows: m.feed.map(row),
    ...(m.supplies != null ? { ref: m.supplies, refSays: `${m.feed[m.feed.length - 1].name} can supply ${perMinWords(m.supplies)}` } : {}) }] : [];
  groups.push(...cols.map(c => ({
    key: c.id,
    title: m.alike && m.columns.length > 1 ? `Each line — ${m.columns.map(x => x.name).join(', ')}` : c.name,
    rows: c.nodes.map(row),
    ...(c.sends != null ? { ref: c.sends, refSays: `${m.alike && m.columns.length > 1 ? 'each line' : c.name} can send ${perMinWords(c.sends)}${c.fed != null && Math.abs(c.fed - c.sends) > 0.05 ? ` — fed ${perMinWords(c.fed)}` : ''}` } : {}),
  })));
  if (m.shared.length) {
    const inflow: BarRow = { id: '__inflow__', index: -1, name: `${m.columns.map(x => x.name).join(' + ')} send`, ...(m.sends != null ? { perMin: m.sends } : {}), isLimit: false, isOwnLimit: false, isInflow: true };
    groups.push({ key: 'merged', title: 'After the lines merge', rows: [inflow, ...m.shared.map(row)],
      ...(m.makes != null ? { ref: m.makes, refSays: `the line makes ${perMinWords(m.makes)}` } : {}),
      ...(m.target != null ? { target: m.target } : {}) });
  }
  return groups;
}
