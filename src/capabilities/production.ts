/* WHY WE MISSED TARGET — Luna's one capability over the business's own production data (11 November, docs/DATA-CONNECTIONS.md §4).
 *
 *   production_gap   read   made against target by line, day and shift, the shortfalls largest first, the downtime by the system's own
 *                           reasons, and the gap in units and in money through the one cost model — every figure worked by
 *                           lib/production/production over the rows the business's system sent (how known: system), each missing
 *                           input named, never estimated. Finer questions go through query_data on the `production:` source.
 * The rows are what the device holds — synced under the line's own row-level security, so it never reads more than the person may. */
import { listWorkspaces } from '../db/workspaces';
import { listConnections, listProduction } from '../db/production';
import type { DataConnectionRow } from '../db/rows';
import { gapSaid, readGap } from '../lib/production/production';
import { anyone } from './access';
import { checkObject, ID } from './check';
import { lineRef } from './util';
import type { CapResult, Capability } from './types';

const DAY = { kind: 'string' as const, label: 'a day', max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/, patternSays: 'A day is written YYYY-MM-DD.' };

interface GapIn { lineId?: string; from?: string; to?: string }

/** A current-data question must not quietly treat the newest stored row as current. */
export function productionFreshness(latest: string, conns: readonly DataConnectionRow[], now = Date.now()): { says: string; ageDays: number | null; failing: number } {
  const at = Date.parse(`${latest}T00:00:00Z`);
  const ageDays = latest && Number.isFinite(at) ? Math.max(0, Math.floor((now - at) / 86_400_000)) : null;
  const failing = conns.filter(c => c.status === 'active' && !!c.lastError).length;
  const notes = [
    ...(ageDays !== null && ageDays > 7 ? [`The newest recorded production day is ${ageDays} days old; check whether the system has sent newer data.`] : []),
    ...(failing ? [`${failing} active data connection${failing === 1 ? ' is' : 's are'} failing; check Data connections before treating this as the full current picture.`] : []),
  ];
  return { says: notes.join(' '), ageDays, failing };
}

export const productionGap: Capability = {
  name: 'production_gap', title: 'Why we missed target', kind: 'read',
  validate: raw => {
    const c = checkObject(raw ?? {}, { lineId: ID('the line'), from: DAY, to: DAY });
    if (c.ok && c.input.from && c.input.to && c.input.from > c.input.to) return { ok: false, why: 'from comes after to.' };
    return c;
  },
  allowed: anyone,
  async run(_ctx, input: GapIn): Promise<CapResult> {
    const [lines, conns] = await Promise.all([listWorkspaces(), listConnections()]);
    const line = input.lineId ? lines.find(l => l.id === input.lineId) : undefined;
    if (input.lineId && !line) return { ok: false, why: 'There is no line with that id on this device — find it first.' };
    const rows = await listProduction(line?.id);
    if (!rows.length) {
      const health = productionFreshness('', conns);
      return { ok: true, refs: line ? [lineRef(line)] : [], says: `No production data from a connected system${line ? ` on ${line.name}` : ''} on this device. ${conns.length ? `There ${conns.length === 1 ? 'is a connection' : `are ${conns.length} connections`} (${conns.map(c => `“${c.name}”`).join(', ')}) with nothing received yet` : 'No data connection is set up'} — Set up › Data connections. ${health.says} Never answer a target question from anything else as if it were the system’s.`, data: { rows: 0, freshness: health } };
    }
    /* no day given: the latest day the system sent — "yesterday" is said by Luna as its date */
    const latest = rows.reduce((m, r) => (r.day > m ? r.day : m), '');
    const from = input.from ?? input.to ?? latest, to = input.to ?? input.from ?? latest;
    const g = readGap(rows, lines, conns, from, to);
    const freshness = productionFreshness(latest, conns);
    return {
      ok: true, says: `${gapSaid(g)}${input.from || input.to ? '' : ` (No day was given: the latest day the system has sent, ${latest}.)`} ${!input.from && !input.to && freshness.ageDays !== null && freshness.ageDays > 7 ? freshness.says : freshness.failing ? `${freshness.failing} active data connection${freshness.failing === 1 ? ' is' : 's are'} failing; check Data connections.` : ''} How known: system. Finer questions: query_data on source production:${line?.id ?? 'all'}.`,
      refs: [...(line ? [lineRef(line)] : g.lines.map(l => lines.find(w => w.id === l.lineId)).filter((w): w is NonNullable<typeof w> => !!w).slice(0, 4).map(lineRef)), { kind: 'page', id: 'data-connections', label: 'Data connections', href: '/factory/data' }],
      data: { from: g.from, to: g.to, totals: g.totals, lines: g.lines, shortRows: g.shortRows.slice(0, 20), reasons: g.reasons, sources: g.sources, notSent: g.notSent, freshness, howKnown: 'system' },
    };
  },
};

export const PRODUCTION: readonly Capability[] = [productionGap];
