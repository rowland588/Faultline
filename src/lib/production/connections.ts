/* A DATA CONNECTION MADE AND KEPT (11 November, docs/DATA-CONNECTIONS.md) — the token made on this device and shown once, only its
 * SHA-256 sent to the cloud (set_data_connection_token, a table no API role can read); a pull key sent straight into the cloud's
 * Vault (set_data_connection_secret), never kept here; the app's own import path through the same core the ingest function runs.
 *
 * Until this device has reached the cloud (no sign-in, no signal, or PRODUCTION_DATA.sql not applied yet), a token's HASH waits in
 * this device's meta store — never synced — and is sent the next time the page is opened; the page says the token is waiting. */
import { getDB } from '../../db/core';
import { getConnection, patchConnection, putConnection, upsertProduction } from '../../db/production';
import type { DataConnectionRow } from '../../db/rows';
import { uid } from '../ids';
import { ingestBody, outcomeSaid, type IngestOutcome, type LineName } from './ingestCore';

const PENDING = 'dataTokenPending';

export const ENDPOINT_PATH = '/functions/v1/ingest';
/** Where a business's system posts to — the cloud's ingest function, when this build has a cloud. */
export function ingestEndpoint(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  return base ? `${base}${ENDPOINT_PATH}` : `https://<your Luna cloud>${ENDPOINT_PATH}`;
}

const b64u = (b: Uint8Array): string => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** A new connection, active, on a line. */
export function newConnection(o: { name: string; kind: 'push' | 'pull'; workspaceId?: string; system?: string; pullUrl?: string; pullAuthHeader?: string; pullAuthPrefix?: string; scheduleMinutes?: number; mapping?: DataConnectionRow['mapping'] }): DataConnectionRow {
  const t = Date.now();
  return {
    id: uid(), name: o.name.trim(), kind: o.kind, status: 'active', ...(o.system?.trim() ? { system: o.system.trim() } : {}),
    ...(o.workspaceId ? { workspaceId: o.workspaceId } : {}), mapping: o.mapping ?? {}, lineMap: {}, scheduleMinutes: Math.max(15, o.scheduleMinutes ?? 60),
    ...(o.pullUrl ? { pullUrl: o.pullUrl.trim() } : {}), ...(o.pullAuthHeader?.trim() ? { pullAuthHeader: o.pullAuthHeader.trim() } : {}),
    ...(o.pullAuthPrefix?.trim() ? { pullAuthPrefix: o.pullAuthPrefix.trim() } : {}),
    rowsTotal: 0, createdAt: t, updatedAt: t,
  };
}

async function pending(): Promise<Record<string, string>> {
  return ((await (await getDB()).get('meta', PENDING)) as Record<string, string> | undefined) ?? {};
}
async function setPending(p: Record<string, string>): Promise<void> {
  await (await getDB()).put('meta', p, PENDING);
}
export async function tokenWaiting(id: string): Promise<boolean> { return id in (await pending()); }

/** At most this long for the cloud — with no signal the page must not wait on it. */
const within = <T,>(p: Promise<T>, ms: number, otherwise: T): Promise<T> => Promise.race([p, new Promise<T>(r => setTimeout(() => r(otherwise), ms))]);

/** Send a hash to the cloud: the connection pushed first (the function checks it is the person's), then the hash. */
function sendHash(id: string, hash: string): Promise<boolean> { return within(sendHashNow(id, hash), 10_000, false); }
async function sendHashNow(id: string, hash: string): Promise<boolean> {
  try {
    const { supabase } = await import('../../cloud/client');
    if (!supabase) return false;
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return false;
    const { syncNow } = await import('../../cloud/sync');
    await syncNow();
    const { error } = await supabase.rpc('set_data_connection_token', { p_connection: id, p_hash: hash });
    return !error;
  } catch { return false; }
}

/** A new token for a connection: made here, returned ONCE for the screen, only its hash kept (cloud, or waiting here). */
export async function issueToken(id: string): Promise<{ token: string; sent: boolean }> {
  const token = `luna_${b64u(crypto.getRandomValues(new Uint8Array(32)))}`;
  const hash = await sha256Hex(token);
  await patchConnection(id, { tokenHint: token.slice(-4), tokenSetAt: Date.now() });
  const sent = await sendHash(id, hash);
  const p = await pending();
  if (sent) delete p[id]; else p[id] = hash;
  await setPending(p);
  return { token, sent };
}

/** Hashes still waiting, sent now if the cloud can be reached. */
export async function flushPendingTokens(): Promise<void> {
  const p = await pending();
  let changed = false;
  for (const [id, hash] of Object.entries(p)) {
    if (!(await getConnection(id))) { delete p[id]; changed = true; continue; }
    if (await sendHash(id, hash)) { delete p[id]; changed = true; }
  }
  if (changed) await setPending(p);
}

/** A pull key into the cloud's Vault — never kept on this device. */
export function saveSecret(id: string, secret: string): Promise<{ ok: true } | { ok: false; why: string }> {
  if (!secret.trim()) return Promise.resolve({ ok: false, why: 'Type the key first.' });
  return within(saveSecretNow(id, secret), 15_000, { ok: false, why: 'The cloud did not answer — the key was not kept anywhere. Try again with signal.' });
}
async function saveSecretNow(id: string, secret: string): Promise<{ ok: true } | { ok: false; why: string }> {
  try {
    const { supabase } = await import('../../cloud/client');
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!supabase || !session) return { ok: false, why: 'The key is kept only in the cloud’s vault — sign in to save it. Nothing was kept on this device.' };
    const { syncNow } = await import('../../cloud/sync');
    await syncNow();
    const { error } = await supabase.rpc('set_data_connection_secret', { p_connection: id, p_secret: secret });
    if (error) return { ok: false, why: 'The cloud did not take the key — try again once this connection has reached the cloud.' };
    await patchConnection(id, { secretSetAt: Date.now() });
    return { ok: true };
  } catch { return { ok: false, why: 'The cloud could not be reached — the key was not kept anywhere.' }; }
}

/** THE APP'S OWN IMPORT PATH — a file or a sample the system sent, brought in on the connection's page through the same core the
 *  ingest function runs, kept by id (twice is once), and the connection's health written as the function writes it. */
export async function bringIn(conn: DataConnectionRow, body: string, contentType: string, lines: readonly LineName[]): Promise<{ ok: true; outcome: IngestOutcome; said: string; added: number; replaced: number } | { ok: false; why: string }> {
  const t = Date.now();
  const out = ingestBody(body, contentType, { id: conn.id, workspaceId: conn.workspaceId, lineMap: conn.lineMap, mapping: conn.mapping as never }, t, lines);
  if ('why' in out) {
    await patchConnection(conn.id, { lastRunAt: t, lastError: `A file was refused: ${out.why}` });
    return { ok: false, why: out.why };
  }
  const { added, replaced } = await upsertProduction(out.records);
  await patchConnection(conn.id, { lastRunAt: t, lastSuccessAt: t, lastRows: out.records.length, lastRefused: out.refused.length, rowsTotal: (conn.rowsTotal || 0) + out.records.length, lastError: undefined });
  return { ok: true, outcome: out, said: `${outcomeSaid(out)} ${added} new, ${replaced} replaced.`, added, replaced };
}

export { putConnection };
