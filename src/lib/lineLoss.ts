/* A LINE'S LOST TIME, IN ITS TWO PARTS (docs/CAPACITY.md §6; docs/AUDIT.md
 * 4.21; Rowland, 14 October: "capacity loss units and labour"):
 *
 *   labour — £ of the crew paid to stand, for every stop: its hours × the
 *            line's crew × wage × on-costs (lib/cost labourPerHour);
 *   packs  — the capacity lost: the packs the line did not make, for a stop
 *            that stopped the line — on its bottleneck, or the whole line —
 *            its minutes × the line's rated speed. A stop on another machine
 *            costs its labour and no packs: the line runs round it, and its
 *            packs are made up unless it starved the bottleneck, which a
 *            stopwatch cannot see.
 *
 * The bottleneck is the line's Line capacity's — the station that limits it,
 * product by product (lib/capacity analyse). With no Line capacity it is not
 * known, and every stop is counted as stopping the line: said so wherever the
 * packs are, never silently. Nothing here is stored. */
import type { Observation, Workspace } from '../types';
import type { Standard } from './standard';
import { analyse } from './capacity';
import { inCapacityTool } from './standard';
import { isWholeLine, machineKey } from './lineRecords';
import { fmtGBP, fmtPacks, labourPerHour, ratedPerMin } from './cost';

/** THE LINE'S BOTTLENECK — the station each of its products is limited by,
 *  as its Line capacity says. Undefined when no product on the line has its
 *  capacity counted. */
export interface Neck {
  /** The names as written, for the words: "Basketer", "Op 3". */
  names: string[];
}

export function neckOf(standards: readonly Pick<Standard, 'workspaceId' | 'capacity' | 'deletedAt'>[], wsId: string | undefined): Neck | undefined {
  if (!wsId) return undefined;
  const by = new Map<string, string>();
  for (const s of standards) {
    if (s.deletedAt || s.workspaceId !== wsId || !s.capacity || !inCapacityTool(s)) continue;
    const name = analyse(s.capacity).limit?.station.name.trim();
    if (name && !by.has(machineKey(name))) by.set(machineKey(name), name);
  }
  return by.size ? { names: [...by.values()] } : undefined;
}

/** Did this stop stop the line? On its bottleneck, on the whole line, on no
 *  machine named — or the bottleneck is not known, so it is counted as if. */
export function stopsTheLine(o: Pick<Observation, 'asset'>, neck: Neck | undefined): boolean {
  const a = (o.asset ?? '').trim();
  if (!neck || !a || isWholeLine(a)) return true;
  return neck.names.some(n => machineKey(n) === machineKey(a));
}

/** The two parts of a set of stops on one line. `labour` absent with no
 *  crew and wage; `packs` absent with no rated speed. */
export interface LostParts {
  labour?: number;
  packs?: number;
  /** Was the bottleneck known when the packs were counted? */
  neckKnown: boolean;
}

export function lostParts(rows: readonly Pick<Observation, 'durationMs' | 'asset'>[], w: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin'>, neck: Neck | undefined): LostParts {
  const lab = labourPerHour(w), rate = ratedPerMin(w);
  let ms = 0, lineMs = 0;
  for (const o of rows) {
    const d = Math.max(0, o.durationMs || 0);
    ms += d;
    if (stopsTheLine(o, neck)) lineMs += d;
  }
  return {
    ...(lab > 0 ? { labour: (ms / 3_600_000) * lab } : {}),
    ...(rate !== undefined ? { packs: (lineMs / 60_000) * rate } : {}),
    neckKnown: !!neck,
  };
}

/** "£85 labour · 1,240 packs lost" — each part only when the line has it;
 *  '' when it has neither. `pence` for one stop: "£0.07 labour". */
export function lostWords(p: Pick<LostParts, 'labour' | 'packs'>, o: { pence?: boolean } = {}): string {
  return [p.labour !== undefined ? `${o.pence ? `£${p.labour.toFixed(2)}` : fmtGBP(p.labour)} labour` : '', p.packs !== undefined ? (p.packs > 0 ? `${fmtPacks(p.packs)} lost` : 'no packs lost') : ''].filter(Boolean).join(' · ');
}

/** How the packs were counted, in a line under them — '' with no packs. */
export function packsHow(p: Pick<LostParts, 'packs' | 'neckKnown'>, neck: Neck | undefined): string {
  if (p.packs === undefined) return '';
  if (!neck) return 'Packs lost at the rated speed, every stop counted as stopping the line — the bottleneck is not known until the line’s capacity is counted.';
  return `Packs lost at the rated speed, for stops on the bottleneck (${neck.names.join(', ')}) or the whole line; a stop on another machine costs its labour.`;
}

/** What the line's lost time costs an hour, for its facts and settings:
 *  "£96/hr labour while it is down · 70 packs a minute lost when it stops
 *  the line". */
export function perHourWords(w: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin'>): string {
  const lab = labourPerHour(w), rate = ratedPerMin(w);
  return [lab > 0 ? `${fmtGBP(lab)}/hr labour while it is down` : '', rate !== undefined ? `${rate.toLocaleString('en-GB')} packs a minute lost when it stops the line` : ''].filter(Boolean).join(' · ');
}

/** The packs a span of a scope's lost time stands for — a saving, a target, a
 *  week's average — at the share of the scope's time that stopped the line,
 *  at its rated speed. Undefined with no rated speed or no time in the scope. */
export function packsForMs(ms: number, rows: readonly Pick<Observation, 'durationMs' | 'asset'>[], w: Pick<Workspace, 'packsPerMin'>, neck: Neck | undefined): number | undefined {
  const rate = ratedPerMin(w);
  const total = rows.reduce((n, o) => n + Math.max(0, o.durationMs || 0), 0);
  if (rate === undefined || total <= 0) return undefined;
  const line = rows.reduce((n, o) => n + (stopsTheLine(o, neck) ? Math.max(0, o.durationMs || 0) : 0), 0);
  return (ms * (line / total) / 60_000) * rate;
}
