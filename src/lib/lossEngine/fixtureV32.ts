/* §2.2 worked example — test fixture only (Rowland spec v3). Numbers from parent assignment acceptance row. */
import type { LossEngineInput, MinuteLedgerRow } from './types';
import { poundsToPence } from './money';

/** Minutes sum to Σ = 480; remainder after effective 301.41 is 178.59 explained. */
export const FIXTURE_V32_LEDGER: MinuteLedgerRow[] = [
  { family: 'efficiency', minutes: 52, label: 'Breakdown', reasonCode: 'breakdown' },
  { family: 'efficiency', minutes: 20, label: 'Minor stops', reasonCode: 'minor' },
  { family: 'productivity', minutes: 18, label: 'Changeovers', reasonCode: 'changeover' },
  { family: 'waste', minutes: 6, label: 'Quality — rejects time', reasonCode: 'rejects' },
  { family: 'efficiency', minutes: 82.59, label: 'Slow running and short stops', reasonCode: 'performance' },
];

export const FIXTURE_V32_INPUT: LossEngineInput = {
  sigmaMinutes: 480,
  goodPacks: 30_141,
  rejectPacks: 629,
  economics: {
    crew: 4,
    wagePencePerHour: poundsToPence(13.89),
    burdenThousandths: 1300,
    labourPerHourPence: poundsToPence(72.24),
    ratePerMin: 100,
    marginPencePerPack: poundsToPence(0.04),
    scrapPencePerReject: 9,
    version: 1,
  },
  ledger: FIXTURE_V32_LEDGER,
};

export const FIXTURE_V32_EXPECT = {
  sigmaMinutes: 480,
  effectiveMinutes: 301.41,
  oee: 0.6279375,
  idleLabourPence: poundsToPence(577.92),
  contributionPence: poundsToPence(714.36),
  scrapPence: poundsToPence(56.61),
};