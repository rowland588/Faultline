import type { LossEngineReport } from './types';
import { formatPence } from './money';

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

/** Immediate loss report copy — status always in words, money kept apart. */
export function immediateLossSays(r: LossEngineReport): { headline: string; lines: string[]; status: 'g' | 'a' | 'n' } {
  const lines: string[] = [
    `Σ ${r.sigmaMinutes.toFixed(3)} min accounted; effective output ${r.effectiveMinutes.toFixed(2)} min at the line rate.`,
    `OEE ${r.oee.toFixed(7)} (${pct(r.oee)} of the window).`,
    `Expected ${r.expectedPacks.toLocaleString('en-GB')} packs — made ${(r.expectedPacks - r.shortPacks).toLocaleString('en-GB')}; ${r.shortPacks.toLocaleString('en-GB')} packs short.`,
  ];
  lines.push(`Idle labour ${formatPence(r.money.idleLabourPence)} for Σ (crew paid through the window).`);
  if (r.money.contributionPence !== undefined) lines.push(`Lost contribution ${formatPence(r.money.contributionPence)} — kept apart from labour.`);
  if (r.money.scrapPence !== undefined) lines.push(`Scrap ${formatPence(r.money.scrapPence)} from rejects.`);
  if (r.money.missing.length) lines.push(`Missing on Line economics: ${r.money.missing.join('; ')}.`);
  if (r.ledger.length) {
    const fam = Object.entries(r.families).filter(([, m]) => m > 0).map(([k, m]) => `${k} ${m.toFixed(2)} min`).join(' · ');
    lines.push(`Minute ledger: ${fam}.`);
  }
  const status: 'g' | 'a' | 'n' = r.money.missing.length ? 'a' : 'g';
  return {
    headline: r.money.missing.length ? 'Loss counted — some money inputs still missing' : 'Immediate loss report',
    lines,
    status,
  };
}