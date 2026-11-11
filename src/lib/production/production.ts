/* WHY WE MISSED TARGET — production records read by the app's own code (11 November, docs/DATA-CONNECTIONS.md §4 — Rowland: "so she can
 * answer why we missed target yesterday, where production losses occurred, which lines are underperforming and what is affecting
 * capacity").
 *
 * Every figure is worked here, from the rows a business's system sent, never by Luna:
 *   delivered    good units as sent; else units made less rejects when both were sent; else units made (said so)
 *   short        target − delivered on each row with a target, never below 0 — a row over target does not hide another's shortfall
 *   net gap      all targets − all delivered (said beside short)
 *   downtime     the system's minutes by its own reasons
 *   money        through the ONE cost model (tools/losses contributionOf; the line's crew × wage × on-costs): the units short at the
 *                line's contribution a pack, and the downtime's idle labour — each missing input named with where to give it, never
 *                estimated, and the two parts never added together (knowledge/MONEY.md)
 * Pure. */
import type { Workspace } from '../../types';
import { contributionOf } from '../../tools/losses/losses';
import type { DataConnectionRow } from '../../db/rows';
import type { ProductionRecord } from './ingestCore';

export type Basis = 'good' | 'made less rejects' | 'made';
export function delivered(r: Pick<ProductionRecord, 'good' | 'output' | 'rejects'>): { units: number; basis: Basis } | undefined {
  if (r.good !== undefined) return { units: r.good, basis: 'good' };
  if (r.output !== undefined && r.rejects !== undefined) return { units: r.output - r.rejects, basis: 'made less rejects' };
  if (r.output !== undefined) return { units: r.output, basis: 'made' };
  return undefined;
}

export interface ShortRow { id: string; line: string; lineId: string; day: string; shift?: string; product?: string; target: number; delivered: number; short: number; basis: Basis }
export interface LineGap {
  lineId: string; line: string;
  rows: number; target: number; delivered: number; short: number; net: number;
  /** Rows with a target and something delivered — the rows the gap is worked over. */
  withTarget: number;
  downtime: number; downtimeRows: number;
  reasons: { reason: string; minutes: number; rows: number }[];
  money: { contribution?: number; perPack?: number; idleLabour?: number; perHour?: number; missing: string[] };
}
export interface GapReading {
  from: string; to: string;
  lines: LineGap[];
  shortRows: ShortRow[];
  reasons: { reason: string; minutes: number; rows: number }[];
  totals: { target: number; delivered: number; short: number; net: number; downtime: number; rows: number };
  /** What the figures rest on: which connections, when they last brought rows in. */
  sources: { id: string; name: string; system?: string; lastSuccessAt?: number }[];
  notSent: string[];
}

const NO_REASON = '(no reason sent)';
const r0 = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The rows from..to (inclusive), worked line by line, the short shifts largest first, the downtime by reason. */
export function readGap(records: readonly ProductionRecord[], lines: readonly Pick<Workspace, 'id' | 'name' | 'crew' | 'labourRatePerHour' | 'labourBurden' | 'marginPerPack' | 'materialsPerPack'>[], connections: readonly DataConnectionRow[], from: string, to: string): GapReading {
  const inRange = records.filter(r => !r.deletedAt && r.day >= from && r.day <= to);
  const byLine = new Map<string, ProductionRecord[]>();
  for (const r of inRange) byLine.set(r.workspaceId, [...(byLine.get(r.workspaceId) ?? []), r]);
  const shortRows: ShortRow[] = [];
  const allReasons = new Map<string, { minutes: number; rows: number }>();
  const out: LineGap[] = [];
  const notSent = new Set<string>();
  for (const [lineId, rows] of byLine) {
    const line = lines.find(l => l.id === lineId);
    const name = line?.name ?? 'A line not on this device';
    let target = 0, del = 0, short = 0, withTarget = 0, downtime = 0, downtimeRows = 0;
    const reasons = new Map<string, { minutes: number; rows: number }>();
    for (const r of rows) {
      const d = delivered(r);
      if (d?.basis === 'made') notSent.add('rejects or good units (so delivered is units made)');
      if (r.target !== undefined && d) {
        withTarget++; target += r.target; del += d.units;
        const s = Math.max(0, r.target - d.units);
        short += s;
        if (s > 0) shortRows.push({ id: r.id, line: name, lineId, day: r.day, ...(r.shift ? { shift: r.shift } : {}), ...(r.product ? { product: r.product } : {}), target: r.target, delivered: d.units, short: s, basis: d.basis });
      }
      if (r.downtimeMinutes !== undefined) {
        downtime += r.downtimeMinutes; downtimeRows++;
        const k = r.downtimeReason ?? NO_REASON;
        for (const m of [reasons, allReasons]) { const c = m.get(k) ?? { minutes: 0, rows: 0 }; c.minutes += r.downtimeMinutes; c.rows++; m.set(k, c); }
      }
    }
    if (rows.some(r => r.target === undefined)) notSent.add('a target on some rows');
    const missing: string[] = [];
    const c = line ? contributionOf(line) : undefined;
    const contribution = c && short > 0 ? r2(short * c.perPack) : undefined;
    if (short > 0 && !c) missing.push(`what a pack contributes on ${name} (its margin a pack, on Set up the line)`);
    const perHour = line?.crew && line.labourRatePerHour ? line.crew * line.labourRatePerHour * (line.labourBurden ?? 1) : undefined;
    const idle = perHour !== undefined && downtime > 0 ? r2((downtime / 60) * perHour) : undefined;
    if (downtime > 0 && perHour === undefined) missing.push(`the people on ${name} and their £ an hour (on Set up the line)`);
    out.push({
      lineId, line: name, rows: rows.length, target: r0(target), delivered: r0(del), short: r0(short), net: r0(target - del), withTarget,
      downtime: r2(downtime), downtimeRows,
      reasons: [...reasons].map(([reason, v]) => ({ reason, minutes: r2(v.minutes), rows: v.rows })).sort((a, b) => b.minutes - a.minutes),
      money: { ...(contribution !== undefined ? { contribution, perPack: c!.perPack } : {}), ...(idle !== undefined ? { idleLabour: idle, perHour } : {}), missing },
    });
  }
  out.sort((a, b) => b.short - a.short || a.line.localeCompare(b.line));
  const used = new Set(inRange.map(r => r.connectionId));
  return {
    from, to, lines: out,
    shortRows: shortRows.sort((a, b) => b.short - a.short),
    reasons: [...allReasons].map(([reason, v]) => ({ reason, minutes: r2(v.minutes), rows: v.rows })).sort((a, b) => b.minutes - a.minutes),
    totals: { target: r0(out.reduce((s, l) => s + l.target, 0)), delivered: r0(out.reduce((s, l) => s + l.delivered, 0)), short: r0(out.reduce((s, l) => s + l.short, 0)), net: r0(out.reduce((s, l) => s + l.net, 0)), downtime: r2(out.reduce((s, l) => s + l.downtime, 0)), rows: inRange.length },
    sources: connections.filter(c => used.has(c.id)).map(c => ({ id: c.id, name: c.name, ...(c.system ? { system: c.system } : {}), ...(c.lastSuccessAt ? { lastSuccessAt: c.lastSuccessAt } : {}) })),
    notSent: [...notSent],
  };
}

const n = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
const money = (v: number) => `£${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const span = (g: Pick<GapReading, 'from' | 'to'>) => (g.from === g.to ? g.from : `${g.from} to ${g.to}`);

/** The reading in sentences — every figure the code's, how it is known said once. */
export function gapSaid(g: GapReading): string {
  if (!g.totals.rows) return `No production records from a connected system for ${span(g)}.`;
  const parts: string[] = [];
  parts.push(`From the business’s production system (${g.sources.map(s => `${s.name}${s.system ? `, ${s.system}` : ''}`).join('; ') || 'a data connection'}) — system data, not measured in the app — for ${span(g)}: ${n(g.totals.delivered)} delivered against a target of ${n(g.totals.target)}; ${n(g.totals.short)} units short on the rows that missed${g.totals.net !== g.totals.short ? ` (net ${n(g.totals.net)}${g.totals.net < g.totals.short ? ', some rows beat their target' : ''})` : ''}.`);
  for (const l of g.lines) {
    const bits = [`${l.line}: ${n(l.delivered)} of ${n(l.target)}${l.short ? `, ${n(l.short)} short` : ', on target'}`];
    if (l.downtime) bits.push(`${n(l.downtime)} min down${l.reasons.length ? ` — ${l.reasons.slice(0, 3).map(r => `${r.reason} ${n(r.minutes)} min`).join(', ')}` : ''}`);
    if (l.money.contribution !== undefined) bits.push(`the units short ${money(l.money.contribution)} of contribution at ${money(l.money.perPack!)} a pack`);
    if (l.money.idleLabour !== undefined) bits.push(`the downtime ${money(l.money.idleLabour)} of idle labour (kept apart, never added to it)`);
    if (l.money.missing.length) bits.push(`no money for ${l.money.missing.join(' or ')} — give it to have it`);
    parts.push(`${bits.join('; ')}.`);
  }
  if (g.shortRows.length) parts.push(`Largest shortfalls: ${g.shortRows.slice(0, 4).map(s => `${s.line} ${s.day}${s.shift ? ` ${s.shift}` : ''}${s.product ? ` (${s.product})` : ''} ${n(s.short)} short`).join('; ')}.`);
  if (g.notSent.length) parts.push(`Not sent by the system: ${g.notSent.join('; ')}.`);
  return parts.join(' ');
}

/** A connection's health in words (docs/DATA-CONNECTIONS.md §6). */
export function healthSaid(c: Pick<DataConnectionRow, 'status' | 'lastRunAt' | 'lastSuccessAt' | 'lastError' | 'lastRows' | 'lastRefused' | 'kind' | 'tokenSetAt' | 'secretSetAt' | 'pullAuthHeader'>, tokenWaiting = false): { word: 'Healthy' | 'Waiting' | 'Failing' | 'Paused'; says: string; state: 'g' | 'a' | 'r' | 'n' } {
  const when = (t: number) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (c.status === 'paused') return { word: 'Paused', says: 'Paused — nothing is taken in until it is resumed.', state: 'n' };
  if (c.lastError && (!c.lastSuccessAt || (c.lastRunAt ?? 0) > c.lastSuccessAt)) return { word: 'Failing', says: `Failing since ${when(c.lastRunAt ?? Date.now())} — ${c.lastError}`, state: 'r' };
  if (c.lastSuccessAt) return { word: 'Healthy', says: `Healthy — ${(c.lastRows ?? 0).toLocaleString('en-GB')} row${c.lastRows === 1 ? '' : 's'} on ${when(c.lastSuccessAt)}, ${c.lastRefused ? `${c.lastRefused} refused` : 'none refused'}.`, state: 'g' };
  if (c.kind === 'push' && !c.tokenSetAt) return { word: 'Waiting', says: 'Waiting — make its token, then the system can send.', state: 'a' };
  if (c.kind === 'push' && tokenWaiting) return { word: 'Waiting', says: 'Waiting — the token works once this device has reached the cloud.', state: 'a' };
  if (c.kind === 'pull' && c.pullAuthHeader && !c.secretSetAt) return { word: 'Waiting', says: 'Waiting — save its key, then it is fetched on its schedule.', state: 'a' };
  return { word: 'Waiting', says: 'Waiting — no rows have arrived yet.', state: 'a' };
}
