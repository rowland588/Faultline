import type { Workspace } from '../../types';
import type { LineEconomics } from './types';
import { economicsFromWorkspace } from './runLossEngine';
import { poundsToPence } from './money';

/** Versioned line economics on the workspace — syncs as jsonb when cloud column lands (Phase 1b). */
export interface LossEngineEconomicsRecord {
  version: number;
  savedAt: number;
  crew?: number;
  labourRatePerHour?: number;
  labourBurden?: number;
  packsPerMin?: number;
  marginPerPack?: number;
  scrapPerReject?: number;
  labourPerHourPence?: number;
  assumed?: boolean;
}

export function economicsStatus(ws: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'packsPerMin' | 'marginPerPack' | 'materialsPerPack' | 'lossEngineEconomics'>): { word: 'g' | 'a' | 'n'; says: string; complete: boolean } {
  const miss: string[] = [];
  if (!ws.crew || !ws.labourRatePerHour) miss.push('crew and wage');
  if (!ws.packsPerMin) miss.push('rated speed (packs a minute)');
  if (ws.marginPerPack === undefined) miss.push('margin a pack');
  if (miss.length) return { word: 'a', says: `Not ready — give ${miss.join(', ')} on Line economics.`, complete: false };
  const assumed = ws.lossEngineEconomics?.assumed;
  return {
    word: 'g',
    says: assumed
      ? `Line economics v${ws.lossEngineEconomics?.version ?? 1} saved — some fields still Assumed until you confirm them.`
      : `Line economics v${ws.lossEngineEconomics?.version ?? 1} ready.`,
    complete: true,
  };
}

export function snapshotEconomics(ws: Workspace, assumed = false): LossEngineEconomicsRecord {
  const eco = economicsFromWorkspace(ws);
  return {
    version: (ws.lossEngineEconomics?.version ?? 0) + 1,
    savedAt: Date.now(),
    crew: ws.crew,
    labourRatePerHour: ws.labourRatePerHour,
    labourBurden: ws.labourBurden,
    packsPerMin: ws.packsPerMin,
    marginPerPack: ws.marginPerPack,
    scrapPerReject: ws.materialsPerPack,
    ...(eco?.labourPerHourPence !== undefined ? { labourPerHourPence: eco.labourPerHourPence } : {}),
    assumed,
  };
}

export function lineEconomicsFromRecord(rec: LossEngineEconomicsRecord): LineEconomics | undefined {
  if (!rec.crew || !rec.labourRatePerHour || !rec.packsPerMin) return undefined;
  return {
    crew: rec.crew,
    wagePencePerHour: poundsToPence(rec.labourRatePerHour),
    burdenThousandths: Math.round((rec.labourBurden && rec.labourBurden > 0 ? rec.labourBurden : 1) * 1000),
    ratePerMin: rec.packsPerMin,
    ...(rec.marginPerPack !== undefined ? { marginPencePerPack: poundsToPence(rec.marginPerPack) } : {}),
    ...(rec.scrapPerReject !== undefined ? { scrapPencePerReject: poundsToPence(rec.scrapPerReject) } : {}),
    ...(rec.labourPerHourPence !== undefined ? { labourPerHourPence: rec.labourPerHourPence } : {}),
    version: rec.version,
    assumed: rec.assumed,
  };
}