/* A short source-health cue in Luna's standing picture. Only connection metadata
 * on lines in hand; never a token, secret, imported row or raw API error. */
import { listConnections } from '../db/production';
import { listWorkspaces } from '../db/workspaces';
import { handScope } from '../capabilities/hand';
import type { DataConnectionRow } from '../db/rows';

export function connectionHealthSaid(conns: readonly DataConnectionRow[], lineNames: ReadonlyMap<string, string>, now = Date.now()): string | undefined {
  const alerts = conns.filter(c => c.status === 'active' && c.workspaceId && lineNames.has(c.workspaceId)).flatMap(c => {
    const where = lineNames.get(c.workspaceId as string);
    if (c.lastError) return [`${c.name} on ${where} is failing; the current production picture may be incomplete.`];
    if (!c.lastSuccessAt) return [`${c.name} on ${where} has not delivered data yet.`];
    const days = Math.floor((now - c.lastSuccessAt) / 86_400_000);
    return days > 7 ? [`${c.name} on ${where} last delivered data ${days} days ago; check whether that is expected.`] : [];
  });
  return alerts.length ? `Data connections: ${alerts.slice(0, 3).join(' ')}${alerts.length > 3 ? ` ${alerts.length - 3} more need attention on Data connections.` : ''}` : undefined;
}

export async function connectionHealthNow(now = Date.now()): Promise<string | undefined> {
  const [scope, conns, lines] = await Promise.all([handScope(), listConnections(), listWorkspaces()]);
  const inHand = new Map(lines.filter(l => scope.line(l.id)).map(l => [l.id, l.name]));
  return connectionHealthSaid(conns, inHand, now);
}
