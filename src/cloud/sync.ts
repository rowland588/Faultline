/* The offline-first sync engine. IndexedDB stays the source of truth; this
 * mirrors it to Supabase last-write-wins by each row's clock, uploads/downloads
 * media blobs, and propagates deletes via tombstones. Inert unless configured
 * AND signed in — the app is fully usable with neither. */
import { supabase, cloudConfigured } from './client';
import { MAPS, SYNC_KINDS } from './mappers';
import type { SyncKind } from '../db';
import {
  rawAll, rawPut, hasBlob, getBlob, putBlob, applyRemoteDelete,
  listTombstones, clearTombstones, getSyncCursor, setSyncCursor, getDB,
} from '../db';

const BUCKET = 'media';
const CHUNK = 200;

export type SyncState = 'idle' | 'syncing' | 'error' | 'signedout';
export interface SyncStatus { state: SyncState; lastSyncedAt: number | null; error?: string }
let status: SyncStatus = { state: 'signedout', lastSyncedAt: null };
const listeners = new Set<() => void>();
export const onSyncChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const syncStatus = (): SyncStatus => status;
function set(s: Partial<SyncStatus>) { status = { ...status, ...s }; listeners.forEach(f => { try { f(); } catch { /* ignore */ } }); }

async function userId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------- media (paths: `${uid}/${blobKey}`) ---------- */
async function metaGet(key: string) { return (await getDB()).get('meta', key); }
async function metaPut(key: string, value: unknown) { await (await getDB()).put('meta', value as never, key); }
async function uploadedSet(): Promise<Set<string>> {
  const meta = (await metaGet('uploaded')) as { keys: string[] } | undefined;
  return new Set(meta?.keys ?? []);
}

async function uploadMedia(uid: string, keys: string[], uploaded: Set<string>): Promise<void> {
  const sb = supabase!;
  for (const key of keys) {
    if (!key || uploaded.has(key)) continue;
    const blob = await getBlob(key);
    if (!blob) { uploaded.add(key); continue; }        // referenced but gone locally — skip
    const { error } = await sb.storage.from(BUCKET).upload(`${uid}/${key}`, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
    if (error) continue;                               // best-effort: bucket missing / transient — retry next sync, don't block data
    uploaded.add(key);
  }
}
async function downloadMedia(uid: string, keys: string[]): Promise<void> {
  const sb = supabase!;
  for (const key of keys) {
    if (!key || (await hasBlob(key))) continue;
    const { data, error } = await sb.storage.from(BUCKET).download(`${uid}/${key}`);
    if (error || !data) continue;                       // best-effort; a missing blob isn't fatal
    await putBlob(key, data);
  }
}

/* ---------- the sync ---------- */
let running = false;
export async function syncNow(): Promise<void> {
  if (!cloudConfigured || !supabase || running) return;
  const uid = await userId();
  if (!uid) { set({ state: 'signedout' }); return; }

  running = true;
  set({ state: 'syncing', error: undefined });
  const startedAt = Date.now();
  try {
    const cursor = await getSyncCursor();
    const uploaded = await uploadedSet();

    // ---- PULL: remote changes since the cursor, LWW into local. PAGED, because
    //      PostgREST caps a single response (~1000 rows) — an unpaged pull would
    //      silently drop everything past the cap and the cursor would skip it
    //      forever. We drain every page ordered by (updated_at, id). ----
    const PAGE = 500;
    for (const kind of SYNC_KINDS) {
      const local = new Map<string, Record<string, unknown>>();
      for (const row of await rawAll(kind)) local.set(row.id as string, row);
      const map = MAPS[kind];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from(kind).select('*')
          .gt('updated_at', cursor)
          .order('updated_at', { ascending: true }).order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`pull ${kind}: ${error.message}`);
        const remotes = (data ?? []) as Record<string, unknown>[];
        for (const r of remotes) {
          const id = r.id as string;
          if (r.deleted_at != null) { if (local.has(id)) await applyRemoteDelete(kind, id); continue; }
          const localRow = local.get(id);
          const localClock = localRow ? map.clock(localRow) : -1;
          if (Number(r.updated_at) <= localClock) continue;          // local is newer — keep it
          const incoming = map.fromRow(r);
          // workspaces: preserve device-only fields (running timer, last route, version)
          const merged = kind === 'workspaces' ? { schemaVersion: 1, ...(localRow ?? {}), ...incoming } : incoming;
          await rawPut(kind, merged as Record<string, unknown>);
          await downloadMedia(uid, map.mediaKeys(merged as Record<string, unknown>));
        }
        if (remotes.length < PAGE) break;
      }
    }

    // ---- PUSH: local changes since the cursor, upsert to cloud ----
    for (const kind of SYNC_KINDS) {
      const map = MAPS[kind];
      const changed = (await rawAll(kind)).filter(row => map.clock(row) > cursor);
      if (!changed.length) continue;
      // media first, so a row never points at a blob the cloud doesn't have yet
      for (const row of changed) await uploadMedia(uid, map.mediaKeys(row), uploaded);
      const rows = changed.map(row => map.toRow(row, uid));
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase.from(kind).upsert(rows.slice(i, i + CHUNK), { onConflict: 'id' });
        if (error) throw new Error(`push ${kind}: ${error.message}`);
      }
    }

    // ---- PUSH tombstones: flag deletes on the cloud rows, then clear them ----
    const tombs = await listTombstones();
    if (tombs.length) {
      const byKind = new Map<SyncKind, string[]>();
      for (const t of tombs) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t.id]);
      for (const [kind, ids] of byKind) {
        for (let i = 0; i < ids.length; i += CHUNK) {
          const part = ids.slice(i, i + CHUNK);
          const { error } = await supabase.from(kind).update({ deleted_at: startedAt, updated_at: startedAt }).in('id', part);
          if (error) throw new Error(`tombstone ${kind}: ${error.message}`);
        }
      }
      await clearTombstones(tombs.map(t => t.id));
    }

    await metaPut('uploaded', { keys: [...uploaded] });
    await setSyncCursor(startedAt);
    set({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (e) {
    set({ state: 'error', error: e instanceof Error ? e.message : 'Sync failed' });
  } finally {
    running = false;
  }
}

/* ---------- lifecycle: sync on focus / online / interval, debounced ---------- */
let started = false;
let timer: number | undefined;
export function startSync() {
  if (started || typeof window === 'undefined' || !cloudConfigured) return;
  started = true;
  const kick = () => { void syncNow(); };
  window.addEventListener('online', kick);
  window.addEventListener('focus', kick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  timer = window.setInterval(kick, 30_000);
  kick();
}
export function stopSync() { if (timer) window.clearInterval(timer); }
