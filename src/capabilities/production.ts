/* WHY WE MISSED TARGET — Luna's one capability over the business's own production data (11 November, docs/DATA-CONNECTIONS.md §4).
 *
 *   production_gap   read   made against target by line, day and shift, the shortfalls largest first, the downtime by the system's own
 *                           reasons, and the gap in units and in money through the one cost model — every figure worked by
 *                           lib/production/production over the rows the business's system sent (how known: system), each missing
 *                           input named, never estimated. Finer questions go through query_data on the `production:` source.
 * The rows are what the device holds — synced under the line's own row-level security, so it never reads more than the person may. */
import { listWorkspaces } from '../db/workspaces';
import { listConnections, listProduction } from '../db/production';
import { gapSaid, readGap } from '../lib/production/production';
import { anyone } from './access';
import { checkObject, ID } from './check';
import { lineRef } from './util';
import type { CapResult, Capability } from './types';

const DAY = { kind: 'string' as const, label: 'a day', max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/, patternSays: 'A day is written YYYY-MM-DD.' };

interface GapIn { lineId?: string; from?: string; to?: string }

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
      return { ok: true, refs: line ? [lineRef(line)] : [], says: `No production data from a connected system${line ? ` on ${line.name}` : ''} on this device. ${conns.length ? `There ${conns.length === 1 ? 'is a connection' : `are ${conns.length} connections`} (${conns.map(c => `“${c.name}”`).join(', ')}) with nothing received yet` : 'No data connection is set up'} — Set up › Data connections. Never answer a target question from anything else as if it were the system’s.`, data: { rows: 0 } };
    }
    /* no day given: the latest day the system sent — "yesterday" is said by Luna as its date */
    const latest = rows.reduce((m, r) => (r.day > m ? r.day : m), '');
    const from = input.from ?? input.to ?? latest, to = input.to ?? input.from ?? latest;
    const g = readGap(rows, lines, conns, from, to);
    return {
      ok: true, says: `${gapSaid(g)}${input.from || input.to ? '' : ` (No day was given: the latest day the system has sent, ${latest}.)`} How known: system. Finer questions: query_data on source production:${line?.id ?? 'all'}.`,
      refs: [...(line ? [lineRef(line)] : g.lines.map(l => lines.find(w => w.id === l.lineId)).filter((w): w is NonNullable<typeof w> => !!w).slice(0, 4).map(lineRef)), { kind: 'page', id: 'data-connections', label: 'Data connections', href: '/factory/data' }],
      data: { from: g.from, to: g.to, totals: g.totals, lines: g.lines, shortRows: g.shortRows.slice(0, 20), reasons: g.reasons, sources: g.sources, notSent: g.notSent, howKnown: 'system' },
    };
  },
};

export const PRODUCTION: readonly Capability[] = [productionGap];
