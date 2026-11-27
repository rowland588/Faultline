/* §2.2 worked example — canonical (Rowland 27 Nov 2026, Project store §2). */
import type { LossEngineInput, MinuteLedgerRow } from './types';
import { poundsToPence } from './money';

/** Ledger rows map to the four families; reason_code holds the §2.1 bucket. */
export const FIXTURE_V32_LEDGER: MinuteLedgerRow[] = [
  { family: 'productivity', minutes: 30, label: 'Breaks', reasonCode: 'breaks' },
  { family: 'productivity', minutes: 50, label: 'Planned changeovers', reasonCode: 'planned_co' },
  { family: 'productivity', minutes: 30, label: 'Changeover overrun', reasonCode: 'overrun' },
  { family: 'efficiency', minutes: 35, label: 'Breakdowns', reasonCode: 'breakdown' },
  { family: 'efficiency', minutes: 18, label: 'Minor stops', reasonCode: 'minor' },
  { family: 'efficiency', minutes: 12, label: 'Waiting', reasonCode: 'waiting' },
  { family: 'efficiency', minutes: 5, label: 'Unaccounted', reasonCode: 'unaccounted' },
  { family: 'efficiency', minutes: 45, label: 'Speed loss', reasonCode: 'speed' },
  { family: 'waste', minutes: 3.825, label: 'Quality loss', reasonCode: 'quality' },
];

export const FIXTURE_V32_BUCKETS = {
  breaks: 30,
  plannedChangeover: 50,
  plannedClean: 0,
  available: 400,
  changeoverOverrun: 30,
  unaccounted: 5,
} as const;

export const FIXTURE_V32_INPUT: LossEngineInput = {
  sigmaMinutes: 480,
  goodPacks: 10_047,
  rejectPacks: 153,
  structure: {
    breaksMinutes: FIXTURE_V32_BUCKETS.breaks,
    plannedChangeoverMinutes: FIXTURE_V32_BUCKETS.plannedChangeover,
    plannedCleanMinutes: FIXTURE_V32_BUCKETS.plannedClean,
  },
  economics: {
    crew: 8,
    wagePencePerHour: poundsToPence(21.8),
    burdenThousandths: 1000,
    ratePerMin: 40,
    marginPencePerPack: poundsToPence(0.12),
    scrapPencePerReject: poundsToPence(0.37),
    version: 1,
  },
  ledger: FIXTURE_V32_LEDGER,
};

export const FIXTURE_V32_EXPECT = {
  sigmaMinutes: 480,
  availableMinutes: 400,
  effectiveMinutes: 251.175,
  oee: 0.6279375,
  packsLostAtIdeal: 5953,
  idleLabourPence: poundsToPence(577.92),
  contributionPence: poundsToPence(714.36),
  scrapPence: poundsToPence(56.61),
};