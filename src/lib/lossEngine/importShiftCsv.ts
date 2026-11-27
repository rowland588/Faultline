import { parseTabular } from '../workbook/csv';
import type { LossFamily, MinuteLedgerRow } from './types';

export const LOSS_IMPORT_FIELDS = ['sigma_minutes', 'breaks_minutes', 'planned_co_minutes', 'planned_clean_minutes', 'good_packs', 'reject_packs', 'rate_per_min', 'family', 'minutes', 'label', 'reason_code'] as const;
export type LossImportField = typeof LOSS_IMPORT_FIELDS[number];

export interface LossImportMapping {
  sigma_minutes?: string;
  breaks_minutes?: string;
  planned_co_minutes?: string;
  planned_clean_minutes?: string;
  good_packs?: string;
  reject_packs?: string;
  rate_per_min?: string;
  family?: string;
  minutes?: string;
  label?: string;
  reason_code?: string;
  row_type?: string;
}

export interface ParsedShiftImport {
  headers: string[];
  rows: string[][];
  mapping: LossImportMapping;
  facts: {
    sigmaMinutes: number;
    goodPacks: number;
    rejectPacks?: number;
    ratePerMin?: number;
    breaksMinutes?: number;
    plannedCoMinutes?: number;
    plannedCleanMinutes?: number;
  };
  ledger: MinuteLedgerRow[];
  refused: string[];
}

const FAMILIES = new Set<LossFamily>(['efficiency', 'productivity', 'cost', 'waste']);
const DEFAULT_MAP: LossImportMapping = {
  row_type: 'row_type',
  sigma_minutes: 'sigma_minutes',
  breaks_minutes: 'breaks_minutes',
  planned_co_minutes: 'planned_co_minutes',
  planned_clean_minutes: 'planned_clean_minutes',
  good_packs: 'good_packs',
  reject_packs: 'reject_packs',
  rate_per_min: 'rate_per_min',
  family: 'family',
  minutes: 'minutes',
  label: 'label',
  reason_code: 'reason_code',
};

function idx(headers: string[], name?: string): number {
  if (!name) return -1;
  const i = headers.findIndex(h => h.trim().toLowerCase() === name.trim().toLowerCase());
  return i;
}

function num(cell: string | undefined): number | undefined {
  const t = (cell ?? '').trim();
  if (!t) return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
}

/** Detect mapping from header row — defaults to exact names from the §2.2 fixture. */
export function guessMapping(headers: string[]): LossImportMapping {
  const h = headers.map(x => x.trim().toLowerCase());
  const pick = (...names: string[]) => headers[h.findIndex(x => names.includes(x))] ?? names.find(n => h.includes(n));
  return {
    row_type: pick('row_type') ?? 'row_type',
    sigma_minutes: pick('sigma_minutes') ?? 'sigma_minutes',
    breaks_minutes: pick('breaks_minutes') ?? 'breaks_minutes',
    planned_co_minutes: pick('planned_co_minutes') ?? 'planned_co_minutes',
    planned_clean_minutes: pick('planned_clean_minutes') ?? 'planned_clean_minutes',
    good_packs: pick('good_packs') ?? 'good_packs',
    reject_packs: pick('reject_packs') ?? 'reject_packs',
    rate_per_min: pick('rate_per_min') ?? 'rate_per_min',
    family: pick('family') ?? 'family',
    minutes: pick('minutes') ?? 'minutes',
    label: pick('label') ?? 'label',
    reason_code: pick('reason_code', 'reason') ?? 'reason_code',
  };
}

export function parseLossShiftCsv(text: string, mapping: LossImportMapping = DEFAULT_MAP): ParsedShiftImport {
  const { rows } = parseTabular(text);
  if (!rows.length) return { headers: [], rows: [], mapping, facts: { sigmaMinutes: 0, goodPacks: 0 }, ledger: [], refused: ['The file is empty.'] };
  const headers = rows[0].map(c => c.trim());
  const body = rows.slice(1);
  const refused: string[] = [];
  let sigmaMinutes = 0;
  let goodPacks = 0;
  let rejectPacks: number | undefined;
  let ratePerMin: number | undefined;
  let breaksMinutes: number | undefined;
  let plannedCoMinutes: number | undefined;
  let plannedCleanMinutes: number | undefined;
  const ledger: MinuteLedgerRow[] = [];

  const iType = idx(headers, mapping.row_type);
  const iSigma = idx(headers, mapping.sigma_minutes);
  const iBreaks = idx(headers, mapping.breaks_minutes);
  const iPlannedCo = idx(headers, mapping.planned_co_minutes);
  const iPlannedClean = idx(headers, mapping.planned_clean_minutes);
  const iGood = idx(headers, mapping.good_packs);
  const iRej = idx(headers, mapping.reject_packs);
  const iRate = idx(headers, mapping.rate_per_min);
  const iFam = idx(headers, mapping.family);
  const iMin = idx(headers, mapping.minutes);
  const iLab = idx(headers, mapping.label);
  const iRsn = idx(headers, mapping.reason_code);

  for (let r = 0; r < body.length; r++) {
    const row = body[r];
    const type = (iType >= 0 ? row[iType] : '').trim().toLowerCase() || 'fact';
    if (type === 'ledger' || (iFam >= 0 && row[iFam]?.trim() && iMin >= 0 && row[iMin]?.trim())) {
      const fam = (iFam >= 0 ? row[iFam] : '').trim().toLowerCase() as LossFamily;
      const minutes = num(iMin >= 0 ? row[iMin] : undefined);
      if (!FAMILIES.has(fam)) { refused.push(`Row ${r + 2}: family “${fam}” is not one of efficiency · productivity · cost · waste.`); continue; }
      if (minutes === undefined || minutes <= 0) { refused.push(`Row ${r + 2}: minutes missing or not a number.`); continue; }
      ledger.push({
        family: fam,
        minutes,
        label: (iLab >= 0 ? row[iLab] : '').trim() || fam,
        ...(iRsn >= 0 && row[iRsn]?.trim() ? { reasonCode: row[iRsn].trim() } : {}),
      });
      continue;
    }
    const s = num(iSigma >= 0 ? row[iSigma] : undefined);
    const g = num(iGood >= 0 ? row[iGood] : undefined);
    const rej = num(iRej >= 0 ? row[iRej] : undefined);
    const rate = num(iRate >= 0 ? row[iRate] : undefined);
    const br = num(iBreaks >= 0 ? row[iBreaks] : undefined);
    const pc = num(iPlannedCo >= 0 ? row[iPlannedCo] : undefined);
    const pcl = num(iPlannedClean >= 0 ? row[iPlannedClean] : undefined);
    if (s !== undefined) sigmaMinutes = s;
    if (g !== undefined) goodPacks = g;
    if (rej !== undefined) rejectPacks = rej;
    if (rate !== undefined) ratePerMin = rate;
    if (br !== undefined) breaksMinutes = br;
    if (pc !== undefined) plannedCoMinutes = pc;
    if (pcl !== undefined) plannedCleanMinutes = pcl;
  }

  if (!sigmaMinutes) refused.push('No sigma_minutes in the file.');
  if (!goodPacks) refused.push('No good_packs in the file.');

  return {
    headers, rows: body, mapping,
    facts: { sigmaMinutes, goodPacks, rejectPacks, ratePerMin, breaksMinutes, plannedCoMinutes, plannedCleanMinutes },
    ledger, refused,
  };
}