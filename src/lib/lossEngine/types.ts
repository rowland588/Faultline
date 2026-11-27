import type { Pence } from './money';

export type LossFamily = 'efficiency' | 'productivity' | 'cost' | 'waste';

export interface MinuteLedgerRow {
  family: LossFamily;
  minutes: number;
  label: string;
  reasonCode?: string;
}

export interface LineEconomics {
  crew: number;
  /** Base wage in pence per person-hour. */
  wagePencePerHour: Pence;
  /** On-costs as thousandths (1300 = ×1.3). */
  burdenThousandths: number;
  ratePerMin: number;
  marginPencePerPack?: Pence;
  scrapPencePerReject?: Pence;
  /** When the worked wage rounds, tests may pin £/h in pence; manual lines derive this from crew × wage × burden. */
  labourPerHourPence?: Pence;
  version?: number;
  assumed?: boolean;
}

export interface LossEngineInput {
  sigmaMinutes: number;
  goodPacks: number;
  rejectPacks?: number;
  economics: LineEconomics;
  ledger?: MinuteLedgerRow[];
}

export interface LossEngineMoney {
  idleLabourPence: Pence;
  contributionPence?: Pence;
  scrapPence?: Pence;
  missing: string[];
}

export interface LossEngineReport {
  sigmaMinutes: number;
  effectiveMinutes: number;
  oee: number;
  expectedPacks: number;
  shortPacks: number;
  ledger: MinuteLedgerRow[];
  families: Record<LossFamily, number>;
  money: LossEngineMoney;
}