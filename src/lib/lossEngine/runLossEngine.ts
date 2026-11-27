import { labourPenceForMinutes, perHourLabourPence, type Pence } from './money';
import type { LossEngineInput, LossEngineReport, LossFamily, MinuteLedgerRow } from './types';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const familiesEmpty = (): Record<LossFamily, number> => ({
  efficiency: 0,
  productivity: 0,
  cost: 0,
  waste: 0,
});

function rollupLedger(rows: MinuteLedgerRow[]): Record<LossFamily, number> {
  const f = familiesEmpty();
  for (const r of rows) f[r.family] += r.minutes;
  return f;
}

/** Deterministic Loss Engine v3 — no AI, decimal money as pence. */
export function runLossEngine(input: LossEngineInput): LossEngineReport {
  const { sigmaMinutes, goodPacks, rejectPacks = 0, economics } = input;
  const rate = economics.ratePerMin;
  if (sigmaMinutes <= 0 || rate <= 0) throw new Error('Σ and rate must be positive');

  const effectiveMinutes = round3(goodPacks / rate);
  const oee = Math.round((goodPacks * 10_000_000) / (rate * sigmaMinutes)) / 10_000_000;
  const expectedPacks = Math.round(sigmaMinutes * rate);
  const shortPacks = Math.max(0, expectedPacks - goodPacks);

  const ledger = input.ledger ?? [];
  const families = ledger.length ? rollupLedger(ledger) : familiesEmpty();

  const missing: string[] = [];
  const perHour = economics.labourPerHourPence ?? (
    economics.crew > 0 && economics.wagePencePerHour > 0
      ? perHourLabourPence(economics.crew, economics.wagePencePerHour, economics.burdenThousandths || 1000)
      : undefined
  );
  let idleLabourPence: Pence = 0;
  if (perHour !== undefined) idleLabourPence = labourPenceForMinutes(perHour, sigmaMinutes);
  else missing.push('crew and wage on Line economics');

  let contributionPence: Pence | undefined;
  if (shortPacks > 0 && economics.marginPencePerPack !== undefined) {
    contributionPence = shortPacks * economics.marginPencePerPack;
  } else if (shortPacks > 0) {
    missing.push('margin a pack on Line economics');
  }

  let scrapPence: Pence | undefined;
  if (rejectPacks > 0 && economics.scrapPencePerReject !== undefined) {
    scrapPence = rejectPacks * economics.scrapPencePerReject;
  } else if (rejectPacks > 0) {
    missing.push('scrap cost a reject on Line economics');
  }

  return {
    sigmaMinutes,
    effectiveMinutes,
    oee,
    expectedPacks,
    shortPacks,
    ledger,
    families,
    money: {
      idleLabourPence,
      ...(contributionPence !== undefined ? { contributionPence } : {}),
      ...(scrapPence !== undefined ? { scrapPence } : {}),
      missing,
    },
  };
}

/** Read economics from a line workspace record (Manual Mode). */
export function economicsFromWorkspace(ws: {
  crew?: number;
  labourRatePerHour?: number;
  labourBurden?: number;
  packsPerMin?: number;
  marginPerPack?: number;
  materialsPerPack?: number;
}): import('./types').LineEconomics | undefined {
  const rate = ws.packsPerMin;
  if (!ws.crew || !ws.labourRatePerHour || !rate) return undefined;
  const burden = ws.labourBurden && ws.labourBurden > 0 ? ws.labourBurden : 1;
  return {
    crew: ws.crew,
    wagePencePerHour: Math.round(ws.labourRatePerHour * 100),
    burdenThousandths: Math.round(burden * 1000),
    ratePerMin: rate,
    ...(ws.marginPerPack !== undefined ? { marginPencePerPack: Math.round(ws.marginPerPack * 100) } : {}),
    ...(ws.materialsPerPack !== undefined ? { scrapPencePerReject: Math.round(ws.materialsPerPack * 100) } : {}),
    version: 1,
  };
}