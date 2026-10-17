/* THE JOB'S MONEY TILE, WHEREVER THE JOB IS WORKED (docs/LEAN-PAGE.md: every
 * tile set carries the money) — what the slip costs, or what a day late
 * would: the job's standing (lib/standing: how far the handover has moved,
 * or how it went) and a day of its lines not making (lib/lineLoss linesDay,
 * from Your factory), said by lib/stageGateLean moneyTile, as the front page
 * and both papers say it. Undefined while either is still being read. */
import type { LeanTile } from './lean';
import { linesDay } from './lineLoss';
import { moneyTile } from './stageGateLean';
import { useJobFactoryLines } from './useFactoryLines';
import { useStanding } from './useStanding';

export function useJobMoney(projectId: string): LeanTile | undefined {
  const all = useStanding(projectId);
  const factory = useJobFactoryLines(projectId);
  if (all.loading || factory.loading) return undefined;
  const st = all.standing;
  return moneyTile({
    outstanding: 0, late: 0, critical: 0, risks: 0, fixesOpen: 0, fixesLate: 0,
    ...(st.handedOver ? { handedOver: true } : {}), ...(st.handedVs != null ? { handedVs: st.handedVs } : {}), ...(st.slipDays != null ? { slipDays: st.slipDays } : {}),
    day: linesDay(factory.lines),
  });
}
