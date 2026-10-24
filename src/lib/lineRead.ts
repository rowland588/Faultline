/* A LINE, READ — what its capacity panel says, worked out once for the
 * screen (ui/LineCapacityHero) and the paper (lib/capacityPaperLoad), so the
 * two cannot say different things (CLAUDE.md, rule 2: screen and PDF
 * together). Its counted shifts over six weeks, its stops, its products'
 * Line capacity and its newest SMED's running pattern, through the tested
 * functions of lib/intelligence. Pure. */
import type { Observation, Workspace } from '../types';
import type { Standard } from '../tools/linestandard/standard';
import type { ToolStudy } from './study';
import { analyse } from '../tools/linebalance/capacity';
import { lossFiguresOf } from './studyLinks';
import { runningOf } from '../tools/changeover/changeover';
import { stopsOfBar, type LossBar } from '../tools/losses/losses';
import { constraintShare } from './intelligence';
import {
  changesThisWeek, constraintTrend, heatOf, lineConstraint, lineRates, loadVsDemand, periodWaterfall, weeklyBrief, WEEK,
  type LineFacts,
} from './intelligence';

export const PERIOD_WEEKS = 6;

export interface LineReadInput {
  obs: readonly Observation[];
  /** The line's loss counts (tool 'losses'), any age — the period is taken here. */
  counts: readonly ToolStudy[];
  /** The line's SMED studies, newest first — the running pattern is the first that says one. */
  smeds: readonly ToolStudy[];
  ws?: Workspace;
  products: readonly Standard[];
  lineName?: string;
  now: number;
}

/** The unit the line counts in — its first product's first station's, else packs. */
export const unitOf = (products: readonly Standard[]): string =>
  products.find(p => p.capacity?.stations.length)?.capacity?.stations[0]?.unit?.trim() || 'packs';

export function readLine(x: LineReadInput) {
  const { obs, counts, smeds, ws, products, now } = x;
  const unit = unitOf(products);
  const from = now - PERIOD_WEEKS * WEEK;
  const recent = counts.filter(c => (c.facts.losses?.from ?? 0) >= from);
  const rates = lineRates(recent.map(c => ({ id: c.id, count: c.facts.losses })), unit);
  const constraint = lineConstraint(products.map(p => ({ product: p.product, capacity: p.capacity })));
  const trend = constraintTrend(obs, now, PERIOD_WEEKS, constraint?.name);
  const changes = changesThisWeek(obs, now).slice(0, 4);
  const ctx = { observations: [...obs], workspaces: ws ? [ws] : [] };
  const figs = recent.map(c => ({ id: c.id, figures: lossFiguresOf(c, ctx), study: c }));
  const fall = periodWaterfall(figs, constraint);
  /* the line's running pattern — its newest SMED's, never assumed */
  const run = smeds.map(s => runningOf(s.facts.running).run).find(r => r && r.shifts > 0 && r.daysPerWeek > 0);
  const shiftsPerWeek = run ? run.shifts * run.daysPerWeek : undefined;
  /* the week the line has: its SMED's running pattern, else the planned hours its products' capacities say */
  const planned = Math.max(0, ...products.map(p => p.capacity?.plannedHoursPerWeek ?? 0));
  const minutesPerWeek = run ? run.minutesPerWeek : planned > 0 ? planned * 60 : undefined;
  const weekFrom = run ? 'the line’s running pattern (its SMED)' : planned > 0 ? 'the planned running hours on its Line capacity' : undefined;
  const eff = rates.plannable != null && rates.theoretical ? rates.plannable / rates.theoretical : undefined;
  const load = loadVsDemand(products.map(p => ({
    product: p.product,
    ...(p.capacity?.demandPerWeek != null ? { demand: p.capacity.demandPerWeek } : {}),
    ...(p.capacity?.stations.length ? (() => { const r = analyse(p.capacity).line; return r ? { ratePerMin: r } : {}; })() : {}),
  })), eff, minutesPerWeek, ws?.marginPerPack, unit);
  /* how many of the line's unit make one of each word its stations count in — "40 pallets" asked */
  const unitsPer: Record<string, number> = {};
  for (const p of products) if (p.capacity?.stations.length) for (const s of analyse(p.capacity).ok) { const w = s.station.unit.trim().toLowerCase(); if (w && s.factor > 0 && unitsPer[w] == null) unitsPer[w] = s.factor; }
  const facts: LineFacts = { line: x.lineName ?? 'This line', unit, rates, fall, ...(constraint ? { constraint } : {}), trend, changes, load, unitsPer };
  const heat = heatOf(obs, now, ws?.assets ?? []);
  const asOf = new Date(now).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const brief = weeklyBrief(facts, { asOf, ...(heat.rows.length ? { heat: heat.says } : {}) });
  return { unit, from, recent, rates, constraint, trend, changes, fall, figs, shiftsPerWeek, load, weekFrom, facts, heat, brief };
}
export type LineRead = ReturnType<typeof readLine>;

/** WHERE A COUNT'S CAUSES SIT — on the line's constraint or off it, by the
 *  share of each cause's stops on the machine its Line capacity names (the
 *  count's page tags its table the same way). Undefined when the line's
 *  constraint is not known; slow running, short stops and rejects say nothing
 *  here (the page says the first two in the cause's sheet). */
export function constraintOfBars(s: ToolStudy, obs: readonly Observation[], standards: readonly Standard[]): ((b: LossBar) => 'on' | 'off' | undefined) | undefined {
  const c = s.facts.losses;
  const constraint = lineConstraint(standards.filter(x => !x.deletedAt && x.workspaceId === s.workspaceId).map(x => ({ product: x.product, capacity: x.capacity })));
  if (!c || !constraint) return undefined;
  return b => {
    if (b.kind !== 'cause' && b.kind !== 'changeover') return undefined;
    const sh = constraintShare(stopsOfBar([...obs], c, b, s.workspaceId), constraint);
    return sh.says ? (sh.share >= 0.5 ? 'on' : 'off') : undefined;
  };
}
