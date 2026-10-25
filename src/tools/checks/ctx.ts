/* THE LINE'S COST MODEL AND RATE, AS A HOLD READS THEM — one function for the page (useLogData) and the paper
 * (lib/studiesPdf), so the packs a failure holds are the same on both. Line capacity's rate first, else the line's
 * rated speed (hold.rateFor); the materials a pack from the line. */
import type { Workspace } from '../../types';
import type { Standard } from '../linestandard/standard';
import { inCapacityTool } from '../linestandard/standard';
import { analyse } from '../linebalance/capacity';
import { rateFor, type LogCtx } from './hold';
import type { CostLine } from '../../lib/problemCost';

export function capacityRate(standards: readonly Standard[], wsId: string | undefined): { perMin: number; unit: string } | undefined {
  if (!wsId) return undefined;
  const s = standards.filter(x => !x.deletedAt && x.workspaceId === wsId && x.capacity && inCapacityTool(x)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const r = s?.capacity ? analyse(s.capacity) : undefined;
  return r?.line && r.line > 0 ? { perMin: r.line, unit: r.unit || 'packs' } : undefined;
}

export function ctxFrom(line: (Partial<Pick<Workspace, 'name'>> & CostLine & { packsPerMin?: number }) | undefined, standards: readonly Standard[], wsId: string | undefined): LogCtx {
  const rate = rateFor(line, capacityRate(standards, wsId));
  return { ...(line ? { line } : {}), ...(rate ? { rate } : {}) };
}
