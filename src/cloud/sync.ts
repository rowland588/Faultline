/* The offline-first sync engine. IndexedDB stays the source of truth; this
 * mirrors it to Supabase last-write-wins by each row's clock, uploads/downloads
 * media blobs, and propagates deletes via tombstones. Inert unless configured
 * AND signed in — the app is fully usable with neither.
 *
 * Three design rules, each earned the hard way:
 *
 * 1. SYNC IS NEVER SOMETHING THE USER DOES. Every local write requests a push
 *    (debounced a moment to batch bursts), and a realtime subscription tells
 *    every other signed-in device to pull the instant the cloud changes. The
 *    interval/focus/online kicks below are fallbacks, not the mechanism.
 *
 * 2. THE PULL CURSOR IS SERVER-ASSIGNED, NEVER A DEVICE CLOCK. Each cloud row
 *    carries `rev`, stamped from one global sequence by a DB trigger (see
 *    supabase/SYNC_UPGRADE.sql). Pulling "rev > last seen" cannot lose data.
 *    The previous design compared THIS device's clock against rows stamped by
 *    OTHER devices' clocks — any skew made a device silently skip rows forever,
 *    which is exactly the "my phone and laptop don't match" failure.
 *    (updated_at remains the LWW conflict clock; rev is transport only.)
 *
 * 3. A FAILED MEDIA TRANSFER IS RETRIED UNTIL IT SUCCEEDS. Failures land in
 *    persistent retry queues drained on every sync. Before, one network blip
 *    left a clip as "not on this device yet" forever, because retry only
 *    happened if its ROW changed again — which it never did. */
import { supabase, cloudConfigured } from './client';
import { MAPS, SYNC_KINDS, type MediaKey } from './mappers';
import { withUsableMime } from '../lib/mime';
import type { SyncKind } from '../db';
import {
  rawAll, rawPut, hasBlob, getBlob, putBlob, applyRemoteDelete,
  listTombstones, clearTombstones, getSyncCursor, setSyncCursor, getDB, onLocalWrite,
} from '../db';

const BUCKET = 'media';
const CHUNK = 200;
const PAGE = 500;

export type SyncState = 'idle' | 'syncing' | 'error' | 'signedout';
export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  error?: string;
  /** The cloud DB predates the rev upgrade — sync works (legacy mode) but the
   *  one-time supabase/SYNC_UPGRADE.sql should be run. */
  schemaOutdated?: boolean;
}
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

/* ---------- meta helpers ---------- */
async function metaGet(key: string) { return (await getDB()).get('meta', key); }
async function metaPut(key: string, value: unknown) { await (await getDB()).put('meta', value as never, key); }
async function keySet(metaKey: string): Promise<Set<string>> {
  const m = (await metaGet(metaKey)) as { keys: string[] } | undefined;
  return new Set(m?.keys ?? []);
}
async function keySetPut(metaKey: string, keys: Set<string>) { await metaPut(metaKey, { keys: [...keys] }); }

/* ---------- rev cursors (server-assigned, per table) ---------- */
const REV_KEY = 'revCursor';
async function revCursors(): Promise<Record<string, number>> {
  return ((await metaGet(REV_KEY)) as Record<string, number> | undefined) ?? {};
}
/** CAS-advance one table's rev cursor: only writes if it still holds the value
 *  this sync started from, so a Full re-sync's reset can't be clobbered by an
 *  in-flight pass completing after it. */
async function advanceRev(kind: SyncKind, from: number, to: number): Promise<void> {
  const cur = await revCursors();
  if ((cur[kind] ?? 0) === from) { cur[kind] = to; await metaPut(REV_KEY, cur); }
}

/** Does this Supabase project have the rev column yet? Flips false on the first
 *  42703 and stays false for the session — sync then runs in legacy mode. */
let revSupported = true;
const isMissingRev = (e: { code?: string; message?: string }) =>
  e.code === '42703' || /column .*\brev\b|(?:\brev\b).* does not exist/i.test(e.message ?? '');

/* ---------- media ----------
 * SHARED workspaces need a shared namespace: new uploads go to the flat
 * `${key}` path (keys are uuids — no collisions), readable by the whole team.
 * Downloads try flat first, then the capturer's legacy per-user folder, then
 * our own — media uploaded before workspaces became shared lives under
 * `${uploaderUid}/${key}` and must keep working without re-uploading. */
async function uploadMedia(_uid: string, keys: MediaKey[], uploaded: Set<string>, wanted: Set<string>): Promise<void> {
  const sb = supabase!;
  for (const { key, mime } of keys) {
    if (!key) continue;
    wanted.add(key);
    if (uploaded.has(key)) continue;
    const raw = await getBlob(key);
    if (!raw) { uploaded.add(key); continue; }         // referenced but gone locally — skip
    // Send a real content type. Storage echoes this back on download, so an
    // octet-stream here is what makes the clip unplayable on every OTHER device.
    const blob = await withUsableMime(raw, mime);
    const { error } = await sb.storage.from(BUCKET).upload(key, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
    if (error) continue;                               // stays in `wanted` − `uploaded` → retried next sync
    uploaded.add(key);
  }
}
async function downloadMedia(uid: string, keys: MediaKey[], failed: Map<string, string | undefined>): Promise<void> {
  const sb = supabase!;
  for (const { key, mime, owner } of keys) {
    if (!key || (await hasBlob(key))) { if (key) failed.delete(key); continue; }
    const paths = [key, ...(owner && owner !== uid ? [`${owner}/${key}`] : []), `${uid}/${key}`];
    let got: Blob | null = null;
    for (const path of paths) {
      const { data, error } = await sb.storage.from(BUCKET).download(path);
      if (!error && data) { got = data; break; }
    }
    if (!got) { failed.set(key, owner); continue; }    // queued — retried on every sync until it lands
    // Re-derive the type from the bytes: what comes back off the wire is often
    // application/octet-stream, which no <video> or <img> will render.
    await putBlob(key, await withUsableMime(got, mime));
    failed.delete(key);
  }
}

/* ---------- one-time re-baseline per engine version ----------
 * Devices that synced under the old engine carry cursors advanced past rows
 * the old clock-skew bug silently skipped — new code alone doesn't heal them.
 * On the first sync after an engine change, reset the cursors so this device
 * re-pulls and re-pushes EVERYTHING once, automatically. (The `uploaded` set
 * is kept: media already in the cloud isn't re-sent; upserts are idempotent.)
 * Nobody should ever be told to press a repair button for our migration. */
const ENGINE_VERSION = 3; // v3: shared team workspaces — re-pull the world once so teammates' rows appear
let migrationDone: Promise<void> | null = null;
function ensureMigrated(): Promise<void> {
  migrationDone ??= (async () => {
    const v = (await metaGet('engineVersion')) as number | undefined;
    if (v === ENGINE_VERSION) return;
    await setSyncCursor(0);
    await metaPut(REV_KEY, {});
    await metaPut('engineVersion', ENGINE_VERSION);
  })();
  return migrationDone;
}

/* ---------- the sync ---------- */
let running = false;
let runQueued = false;
export async function syncNow(): Promise<void> {
  if (!cloudConfigured || !supabase) return;
  if (running) { runQueued = true; return; } // a write mid-sync re-runs at the end, not never
  await ensureMigrated();
  const uid = await userId();
  if (!uid) { set({ state: 'signedout' }); return; }

  running = true;
  set({ state: 'syncing', error: undefined });
  const startedAt = Date.now();
  try {
    const cursor = await getSyncCursor();       // push cursor: local clock vs local rows — self-consistent
    const uploaded = await keySet('uploaded');
    const wantedUploads = await keySet('pendingUploads');   // prior failures — retry first
    const failedDownloads = new Map<string, string | undefined>(
      [...await keySet('pendingDownloads')].map(s => { const i = s.indexOf('|'); return i < 0 ? [s, undefined] : [s.slice(0, i), s.slice(i + 1) || undefined]; }),
    );

    // ---- retry media that failed on earlier passes, before anything else ----
    if (wantedUploads.size) await uploadMedia(uid, [...wantedUploads].map(key => ({ key })), uploaded, new Set());
    if (failedDownloads.size) await downloadMedia(uid, [...failedDownloads].map(([key, owner]) => ({ key, owner })), failedDownloads);

    // ---- PULL: everything with a rev this device hasn't seen. Keyset-paged
    //      (cursor = last rev of the page), so rows moving mid-pull can't cause
    //      offset skips, and the cursor is pure server truth. ----
    const revs = await revCursors();
    for (const kind of SYNC_KINDS) {
      const map = MAPS[kind];
      const local = new Map<string, Record<string, unknown>>();
      for (const row of await rawAll(kind)) local.set(row.id as string, row);

      const applyRemote = async (r: Record<string, unknown>) => {
        const id = r.id as string;
        if (r.deleted_at != null) { if (local.has(id)) await applyRemoteDelete(kind, id); return; }
        const localRow = local.get(id);
        const localClock = localRow ? map.clock(localRow) : -1;
        if (Number(r.updated_at) <= localClock) {
          // Local row wins — but still fetch any blobs it's missing (hasBlob
          // short-circuits, so this is cheap).
          if (localRow) await downloadMedia(uid, map.mediaKeys(localRow), failedDownloads);
          return;
        }
        const incoming = map.fromRow(r);
        // workspaces: preserve device-only fields (running timer, last route, version)
        const merged = kind === 'workspaces' ? { schemaVersion: 1, ...(localRow ?? {}), ...incoming } : incoming;
        await rawPut(kind, merged as Record<string, unknown>);
        await downloadMedia(uid, map.mediaKeys(merged as Record<string, unknown>), failedDownloads);
      };

      if (revSupported) {
        const started = revs[kind] ?? 0;
        let since = started;
        for (;;) {
          const { data, error } = await supabase.from(kind).select('*')
            .gt('rev', since).order('rev', { ascending: true }).limit(PAGE);
          if (error) {
            if (isMissingRev(error)) { revSupported = false; set({ schemaOutdated: true }); break; }
            throw new Error(`pull ${kind}: ${error.message}`);
          }
          const remotes = (data ?? []) as Record<string, unknown>[];
          for (const r of remotes) await applyRemote(r);
          if (remotes.length) since = Number(remotes[remotes.length - 1].rev) || since;
          if (remotes.length < PAGE) break;
        }
        if (revSupported && since !== started) await advanceRev(kind, started, since);
      }
      if (!revSupported) {
        // Legacy pull (pre-upgrade cloud): device-clock cursor. Works, but clock
        // skew between devices can skip rows — hence the upgrade nudge in status.
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase.from(kind).select('*')
            .gt('updated_at', cursor)
            .order('updated_at', { ascending: true }).order('id', { ascending: true })
            .range(from, from + PAGE - 1);
          if (error) throw new Error(`pull ${kind}: ${error.message}`);
          const remotes = (data ?? []) as Record<string, unknown>[];
          for (const r of remotes) await applyRemote(r);
          if (remotes.length < PAGE) break;
        }
      }
    }

    // ---- PUSH: local changes since the cursor, upsert to cloud ----
    const wanted = new Set<string>(wantedUploads);
    for (const kind of SYNC_KINDS) {
      const map = MAPS[kind];
      const changed = (await rawAll(kind)).filter(row => map.clock(row) > cursor);
      if (!changed.length) continue;
      // media first, so a row never points at a blob the cloud doesn't have yet
      for (const row of changed) await uploadMedia(uid, map.mediaKeys(row), uploaded, wanted);
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

    // Compare-and-set: only advance the push cursor if nobody reset it while we
    // ran (a Full re-sync tapped mid-sync must not be clobbered).
    if ((await getSyncCursor()) === cursor) {
      await metaPut('uploaded', { keys: [...uploaded] });
      await setSyncCursor(startedAt);
    }
    // Retry queues persist regardless — an extra retry is harmless, a lost one isn't.
    await keySetPut('pendingUploads', new Set([...wanted].filter(k => !uploaded.has(k))));
    await keySetPut('pendingDownloads', new Set([...failedDownloads].map(([k, o]) => (o ? `${k}|${o}` : k))));

    set({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (e) {
    set({ state: 'error', error: e instanceof Error ? e.message : 'Sync failed' });
  } finally {
    running = false;
    if (runQueued) { runQueued = false; requestSync(400); }
  }
}

/** Debounced sync request — writes call this (via the db signal), realtime
 *  events call this, everything calls this. Bursts collapse into one pass. */
let debounceTimer: number | undefined;
export function requestSync(delayMs = 1200): void {
  if (typeof window === 'undefined' || !cloudConfigured) return;
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => { void syncNow(); }, delayMs);
}

/** Forget what's been synced and push/pull EVERYTHING again. For recovery — e.g.
 *  after the cloud tables were rebuilt. Waits out any in-flight sync (whose
 *  completion is CAS-guarded above, so it can't clobber the reset), then runs a
 *  genuine full pass. Upserts are idempotent — safe any time, just bandwidth. */
export async function fullResync(): Promise<void> {
  await setSyncCursor(0);
  await metaPut(REV_KEY, {});
  await metaPut('uploaded', { keys: [] });
  await metaPut('pendingUploads', { keys: [] });
  await metaPut('pendingDownloads', { keys: [] });
  set({ state: 'syncing', error: undefined });
  while (running) await new Promise(r => setTimeout(r, 300)); // let the in-flight pass finish
  await syncNow();
}

/* ---------- lifecycle ---------- */
let started = false;
let timer: number | undefined;
export function startSync() {
  if (started || typeof window === 'undefined' || !cloudConfigured || !supabase) return;
  started = true;

  // The mechanism: writes push themselves…
  onLocalWrite(() => requestSync());

  // …and other devices' pushes announce themselves. Any change to any synced
  // table → pull. Fires for our own echoes too; the debounce + no-change pass
  // make that cheap. If realtime is unavailable the interval below still covers.
  try {
    supabase
      .channel('faultline-db')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => requestSync(600))
      .subscribe();
  } catch { /* realtime optional — fallbacks below */ }

  // Fallbacks, not the mechanism: focus/online/interval catch anything missed
  // while the tab was frozen or offline.
  const kick = () => { void syncNow(); };
  window.addEventListener('online', kick);
  window.addEventListener('focus', kick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  timer = window.setInterval(kick, 30_000);
  kick();
}
export function stopSync() { if (timer) window.clearInterval(timer); }
