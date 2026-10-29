/* EQUIPMENT CRITICALITY — consequence × likelihood into classes A, B, C (maintenance.criticality; FC-064).
 * Independent case: scripts/knowledge/cases-maintenance.py § maintenance.criticality. */
import type { LeanTile, LeanTone } from '../lean';

export type CritClass = 'A' | 'B' | 'C';

export interface CriticalityRowIn {
  id: string;
  name: string;
  production?: number;
  safety?: number;
  quality?: number;
  repair?: number;
  likelihood?: number;
  ccp?: boolean;
  standby?: boolean;
}

export interface RankedRow extends CriticalityRowIn {
  consequence: number;
  score: number;
  class: CritClass;
}

const inRange = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n) && n >= 1 && n <= 5;

export function consequenceOf(row: Pick<CriticalityRowIn, 'production' | 'safety' | 'quality' | 'repair'>): number | undefined {
  const dims = [row.production, row.safety, row.quality, row.repair].filter(inRange);
  return dims.length ? Math.max(...dims) : undefined;
}

function baseClass(score: number): CritClass {
  if (score >= 15) return 'A';
  if (score >= 8) return 'B';
  return 'C';
}

function dropClass(c: CritClass): CritClass {
  if (c === 'A') return 'B';
  if (c === 'B') return 'C';
  return 'C';
}

export function rankOne(row: CriticalityRowIn): RankedRow | undefined {
  const C = consequenceOf(row);
  if (!inRange(row.likelihood) || C === undefined) return undefined;
  const score = C * row.likelihood;
  let cls = baseClass(score);
  if (row.ccp || row.safety === 5) cls = 'A';
  else if (row.standby) cls = dropClass(cls);
  return { ...row, consequence: C, score, class: cls };
}

export function rankCriticality(rows: CriticalityRowIn[]): { ok: RankedRow[]; counts: Record<CritClass, number> } | { problems: string[] } {
  const problems: string[] = [];
  const ok: RankedRow[] = [];
  for (const row of rows) {
    if (!row.name.trim()) continue;
    const r = rankOne(row);
    if (!r) {
      problems.push(`“${row.name.trim()}” needs every dimension and likelihood between 1 and 5.`);
      continue;
    }
    ok.push(r);
  }
  if (!ok.length && rows.some(r => r.name.trim())) return { problems: problems.length ? problems : ['Score at least one machine.'] };
  const counts: Record<CritClass, number> = { A: 0, B: 0, C: 0 };
  for (const r of ok) counts[r.class]++;
  return { ok, counts };
}

export interface CriticalitySummary {
  verdict: string;
  tone: LeanTone;
  sentence: string;
  tiles: LeanTile[];
  closing: string;
  caveats: string[];
}

export function summarizeCriticality(ranked: RankedRow[]): CriticalitySummary {
  const counts = { A: 0, B: 0, C: 0 } as Record<CritClass, number>;
  for (const r of ranked) counts[r.class]++;
  const aNames = ranked.filter(r => r.class === 'A').map(r => r.name.trim()).filter(Boolean);
  const verdict = counts.A ? `${counts.A} class A` : counts.B ? `${counts.B} class B` : ranked.length ? `${counts.C} class C` : 'Not scored yet';
  const tone: LeanTone = counts.A >= 3 ? 'r' : counts.A ? 'a' : 'g';
  const sentence = counts.A
    ? `${counts.A} class A — ${aNames.slice(0, 3).join(', ')}${aNames.length > 3 ? ` and ${aNames.length - 3} more` : ''}: RCM, spares and PM hours go here first.`
    : ranked.length
      ? `No class A — ${counts.B} class B and ${counts.C} class C on this ranking.`
      : 'Score each machine on the scales, then read who is class A.';
  const tiles: LeanTile[] = (['A', 'B', 'C'] as const).map(k => ({ k: `Class ${k}`, v: String(counts[k]), of: k === 'A' ? 'RCM, spares at high service, first on PM' : k === 'B' ? 'PM to schedule, lower spares' : 'run to failure', tone: k === 'A' && counts.A ? 'r' : k === 'B' && counts.B ? 'a' : 'n' }));
  return {
    verdict,
    tone,
    sentence,
    tiles,
    closing: counts.A ? 'The A list is where the maintenance budget protects the line — agree it with the team, then hand it to spares and RCM.' : 'Finish every row, then read the class A list before you spend PM hours or spares money.',
    caveats: [
      'Likelihood is what you type — not yet read from reliability or the loss count.',
      'Consequence is the worst credible failure on the highest dimension you fill.',
      'A CCP device is class A whatever its score; a full standby drops one class.',
    ],
  };
}
