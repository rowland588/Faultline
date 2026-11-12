/* WHAT THE STOPS TIMED ON A VISIT COST — THE VISIT'S HEADLINE (12 November; docs/CONSULTANT-WORKSPACE.md C3, moment 1 — Rowland:
 * "they get beautiful, engaging reports"; what earns the second visit is a number in pounds the customer did not have that morning).
 *
 * A visit already gathers the stops timed in its hours (lib/visits visitRecords) and said only how many. This says where the time went
 * and what it cost, from the line's ONE cost model and nothing else:
 *   the rows     machine · reason, ranked by the minutes timed — stops, minutes, the share of the timed minutes; a stop counted with no
 *                time is counted and said apart, never given minutes;
 *   the money    the loss count's two parts, never blended (lib/lineLoss lostParts; docs/CAPACITY.md §6): the crew's labour for the
 *                minutes, and the packs the line did not make — only for stops that stop the line — with their contribution at the
 *                line's margin (tools/losses contributionOf). A line with no wage, speed or margin has that part left out and NAMED.
 * It is what was TIMED ON THE VISIT, said so: never a rate, a week or a year — the hours a line runs are asked (CLAUDE.md, SMED), and a
 * few hours' watching is a first look, not the line's loss. Several lines are worked out each by its own model and added part by part.
 * Pure — the page and the paper say the same words from here. */
import type { Observation, Workspace } from '../types';
import { fmtGBP, fmtPacks } from './cost';
import { lostParts, type Neck } from './lineLoss';
import { contributionOf } from '../tools/losses/losses';

export type LossLine = Pick<Workspace, 'id' | 'name' | 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin' | 'marginPerPack' | 'materialsPerPack'>;
type Stop = Pick<Observation, 'workspaceId' | 'asset' | 'category' | 'durationMs' | 'timing' | 'startedAt'>;

export interface VisitLossRow { line: string; machine: string; reason: string; stops: number; minutes: number; share: number; labour?: number; packs?: number; contribution?: number }
export interface VisitLoss {
  /** Stops with a time, and those counted with none. */
  timed: number; counted: number;
  minutes: number;
  rows: VisitLossRow[];
  labour?: number; packs?: number; contribution?: number;
  /** What a line lacks for a part of the money, in words — "Line 3: the crew and wage". */
  missing: string[];
  /** Was any line's bottleneck not known (every stop then counted as stopping the line)? */
  neckUnknown: boolean;
  lines: string[];
  /** The headline, and the line under it on how the money was worked out. */
  says: string; how: string;
}

const mins = (ms: number) => ms / 60_000;
const minSaid = (m: number): string => (m >= 99.5 ? `${Math.round(m)} min` : `${Math.round(m * 10) / 10} min`.replace(/\.0 min$/, ' min'));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const add = (a: number | undefined, b: number | undefined): number | undefined => (b === undefined ? a : (a ?? 0) + b);

/** The visit's stops read as a loss. Undefined when no stop was timed or counted. */
export function visitLoss(stops: readonly Stop[], lines: readonly LossLine[], neck: (lineId: string) => Neck | undefined): VisitLoss | undefined {
  const byId = new Map(lines.map(w => [w.id, w]));
  const mine = stops.filter(o => byId.has(o.workspaceId));
  if (!mine.length) return undefined;
  const timedRows = mine.filter(o => o.timing !== 'instant' && (o.durationMs ?? 0) > 0);
  const counted = mine.length - timedRows.length;
  const totalMs = timedRows.reduce((a, o) => a + o.durationMs, 0);

  const groups = new Map<string, { w: LossLine; machine: string; reason: string; rows: Stop[] }>();
  for (const o of timedRows) {
    const w = byId.get(o.workspaceId) as LossLine;
    const machine = (o.asset ?? '').trim() || 'Whole line', reason = (o.category ?? '').trim() || 'No reason said';
    const k = `${w.id}|${machine.toLowerCase()}|${reason.toLowerCase()}`;
    const g = groups.get(k) ?? { w, machine, reason, rows: [] };
    g.rows.push(o);
    groups.set(k, g);
  }
  let labour: number | undefined, packs: number | undefined, contribution: number | undefined, neckUnknown = false;
  const necks = new Set<string>();
  const missing = new Map<string, Set<string>>();
  const miss = (w: LossLine, what: string) => missing.set(w.name, (missing.get(w.name) ?? new Set()).add(what));
  const rows: VisitLossRow[] = [...groups.values()].map(g => {
    const n = neck(g.w.id), p = lostParts(g.rows, g.w, n), per = contributionOf(g.w);
    const ms = g.rows.reduce((a, o) => a + o.durationMs, 0);
    if (!n) neckUnknown = true;
    else n.names.forEach(x => necks.add(x));
    if (p.labour === undefined) miss(g.w, 'the crew and wage');
    if (p.packs === undefined) miss(g.w, 'the speed');
    else if (!per && p.packs > 0) miss(g.w, 'the margin a pack');
    const c = p.packs !== undefined && per ? p.packs * per.perPack : undefined;
    labour = add(labour, p.labour); packs = add(packs, p.packs); contribution = add(contribution, c);
    return { line: g.w.name, machine: g.machine, reason: g.reason, stops: g.rows.length, minutes: mins(ms), share: totalMs > 0 ? ms / totalMs : 0,
      ...(p.labour !== undefined ? { labour: p.labour } : {}), ...(p.packs !== undefined ? { packs: p.packs } : {}), ...(c !== undefined ? { contribution: c } : {}) };
  }).sort((a, b) => b.minutes - a.minutes || b.stops - a.stops || a.machine.localeCompare(b.machine));

  const names = [...new Set(mine.map(o => (byId.get(o.workspaceId) as LossLine).name))];
  const where = names.length === 1 ? `on ${names[0]}` : `on ${names.length} lines`;
  const top = rows[0];
  const money = [
    contribution !== undefined && packs !== undefined && packs > 0 ? `${fmtPacks(packs)} not made — ${fmtGBP(contribution)} of contribution` : packs !== undefined && packs > 0 ? `${fmtPacks(packs)} not made` : '',
    labour !== undefined ? `${fmtGBP(labour)} of the crew’s labour stood` : '',
  ].filter(Boolean);
  const says = timedRows.length
    ? `${plural(timedRows.length, 'stop')} timed ${where} on the visit: ${minSaid(mins(totalMs))} lost${top && rows.length > 1 ? `, ${minSaid(top.minutes)} of it (${Math.round(top.share * 100)}%) ${top.machine} — ${top.reason}` : top ? `, all ${top.machine} — ${top.reason}` : ''}.${money.length ? ` ${money.join('; ')}.` : ''}${counted ? ` ${plural(counted, 'more stop')} counted with no time.` : ''}`
    : `${plural(counted, 'stop')} counted ${where} on the visit, none of them timed — no minutes and no money can be said.`;
  const miss2 = [...missing].map(([l, s]) => `${l}: ${[...s].join(', ')}`);
  const how = [
    'What was timed on the visit — a first look, not the line’s loss over a week.',
    packs !== undefined && packs === 0 && !neckUnknown ? `No stop timed was on the bottleneck (${[...necks].join(', ')}), so no packs are counted lost — the line runs round a stop elsewhere, and it costs its labour.` :
    packs !== undefined ? (neckUnknown ? 'Packs at the line’s speed, every stop counted as stopping the line — its bottleneck is not known until its capacity is counted.' : 'Packs at the line’s speed, for stops on its bottleneck or the whole line; a stop elsewhere costs its labour only.') : '',
    contribution !== undefined && (packs ?? 0) > 0 && labour !== undefined ? 'The two parts are said apart and never added.' : '',
    miss2.length ? `Not priced in part — give on Set up the line: ${miss2.join('; ')}.` : '',
  ].filter(Boolean).join(' ');
  return { timed: timedRows.length, counted, minutes: mins(totalMs), rows, ...(labour !== undefined ? { labour } : {}), ...(packs !== undefined ? { packs } : {}), ...(contribution !== undefined ? { contribution } : {}), missing: miss2, neckUnknown, lines: names, says, how };
}

/** A row in words — "Bagger — Jam · 3 stops · 31 min · 66%", with its money when the line holds it. */
export function lossRowSaid(r: VisitLossRow, several: boolean): string {
  const money = [r.contribution !== undefined && (r.packs ?? 0) > 0 ? `${fmtGBP(r.contribution)} contribution` : '', r.labour !== undefined ? `${fmtGBP(r.labour)} labour` : ''].filter(Boolean).join(' · ');
  return `${several ? `${r.line} · ` : ''}${plural(r.stops, 'stop')} · ${minSaid(r.minutes)} · ${Math.round(r.share * 100)}%${money ? ` · ${money}` : ''}`;
}
export { minSaid };
