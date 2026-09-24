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
  /** Files still waiting to go up, and still waiting to come down. "Is
   *  everything synced?" has to be answerable with a number, not a feeling —
   *  a cloud icon that always looks the same cannot tell you when a walk you
   *  filmed an hour ago is still sitting on this phone. */
  pendingUp?: number;
  pendingDown?: number;
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

/** Which kinds have no rev column yet — PER KIND, not one flag for the cloud.
 *
 *  It was one flag, and that made a single un-migrated table everyone's problem:
 *  a new table whose SQL added no rev answered the pull with 42703, which was
 *  read as "this whole cloud is too old for rev cursors", and every OTHER
 *  table — snags, the tracker, the lever tree — silently dropped to the
 *  device-clock cursor for the rest of the session. That cursor can skip rows
 *  when two phones disagree about the time, so one missing column quietly
 *  degraded the sync of everything that was already working.
 *
 *  A kind lands in here on its first 42703 and stays for the session: the
 *  fallback is the same, its blast radius is one table. */
const noRev = new Set<SyncKind>();
const isMissingRev = (e: { code?: string; message?: string }) =>
  e.code === '42703' || /column .*\brev\b|(?:\brev\b).* does not exist/i.test(e.message ?? '');

/** A table this build knows about that the cloud doesn't have yet (its one-time
 *  SQL hasn't been run). Sync must keep working for everything else — the new
 *  kind just waits; nothing is lost because its cursor never advances. */
const isMissingTable = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || /relation .* does not exist|could not find the table/i.test(e.message ?? '');

/** A COLUMN this build writes that the cloud doesn't have yet — the same
 *  situation as a missing table, one migration smaller. Without this a single
 *  un-migrated column threw and aborted the whole sync pass, so every other
 *  kind stopped syncing too until the SQL was run. Treated the same way: this
 *  kind holds its cursor and retries, everything else carries on. */
const isMissingColumn = (e: { code?: string; message?: string }) =>
  e.code === '42703' || /column .* does not exist|could not find the .* column/i.test(e.message ?? '');

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

/* ---------- WHAT HAS ACTUALLY BEEN SENT ----------
 *
 * The push used to choose its rows by comparing each row's own clock against a
 * single wall-clock cursor: `clock(row) > cursor`. That is wrong in a way that
 * is silent, permanent, and invisible from the app: any row whose clock is
 * BELOW the cursor is skipped, and skipped again on every pass afterwards, for
 * ever.
 *
 * And the app deliberately wrote rows with old clocks. Seeded and adopted rows
 * carried a fixed old timestamp precisely so they could never overwrite a real
 * edit made on another device — which also guaranteed they could never be
 * pushed. The result on a real account: every project sat on one phone while
 * the lines, next steps and wins hanging off it synced perfectly, and nothing
 * anywhere said so. It took reading the cloud to find it.
 *
 * So the push does not guess from clocks any more. It REMEMBERS, per row, the
 * clock it last got accepted. A row is sent when its current clock differs from
 * that — true for a row never sent, a row edited, and a row whose clock moved
 * BACKWARDS, and false only for a row genuinely already up there.
 *
 * The map is pruned each pass to the rows that still exist, so hard deletes
 * cannot make it grow for ever. */
const SENT_KEY = 'pushedClocks';
export type Sent = Record<string, number>;
export const sentKey = (kind: SyncKind, id: string) => `${kind}:${id}`;
const readSent = async (): Promise<Sent> => ((await metaGet(SENT_KEY)) as Sent | undefined) ?? {};

/** Does this row still have to go up?
 *
 *  Exported because it is the whole decision, and the whole decision is what
 *  went wrong: the old one was `clock > cursor`, which answered NO for ever to
 *  anything written with an old clock. This answers it from what was actually
 *  accepted, so the only row it skips is one already up there at this exact
 *  clock. A clock that moved backwards still counts as a change. */
export const needsPush = (sent: Sent, kind: SyncKind, id: string, clock: number): boolean =>
  sent[sentKey(kind, id)] !== clock;

/** Drop what no longer exists, so a lifetime of deletes cannot grow the record
 *  without bound. `alive` must hold every row of every kind — the pass visits
 *  them all, so anything missing from it is genuinely gone. */
export function pruneSent(sent: Sent, alive: Set<string>): Sent {
  for (const key of Object.keys(sent)) if (!alive.has(key)) delete sent[key];
  return sent;
}

/* ---------- one-time re-baseline per engine version ----------
 * Devices that synced under the old engine carry cursors advanced past rows
 * the old clock-skew bug silently skipped — new code alone doesn't heal them.
 * On the first sync after an engine change, reset the cursors so this device
 * re-pulls and re-pushes EVERYTHING once, automatically. (The `uploaded` set
 * is kept: media already in the cloud isn't re-sent; upserts are idempotent.)
 * Nobody should ever be told to press a repair button for our migration. */
/* v4: the push tracks what it sent instead of trusting a clock. Every device
   re-baselines once, which is what finally lifts the rows the old filter had
   stranded — including projects that had never reached the cloud at all. */
const ENGINE_VERSION = 4;
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

  // Nothing may sit between this and the try. set() notifies listeners, and a
  // listener that throws here would leave `running` true for ever — after which
  // syncNow() early-returns on every call and the device silently stops syncing
  // until the page is reloaded, while fullResync()'s wait below never ends.
  running = true;
  const startedAt = Date.now();
  try {
    set({ state: 'syncing', error: undefined });
    const cursor = await getSyncCursor();       // the LEGACY PULL cursor only — the push no longer reads it
    const sent = await readSent();
    const uploaded = await keySet('uploaded');
    const wantedUploads = await keySet('pendingUploads');   // prior failures — retried AFTER the rows
    const failedDownloads = new Map<string, string | undefined>(
      [...await keySet('pendingDownloads')].map(s => { const i = s.indexOf('|'); return i < 0 ? [s, undefined] : [s.slice(0, i), s.slice(i + 1) || undefined]; }),
    );

    /* ROWS BEFORE BLOBS — and the media retry queue LAST.
     *
     * This used to be the first thing a pass did: re-upload every blob that had
     * failed before, then get on with the data. It reads like politeness to the
     * retry queue and it is actually a hostage situation. A walk is tens of
     * megabytes; a project row is a few hundred bytes. One video that will not
     * go up — a phone on mobile data, an app backgrounded thirty seconds in —
     * spends the entire pass, the pass never reaches the rows, nothing is
     * recorded as sent, and the next pass starts again on the same video.
     *
     * That is a device that syncs for a day and pushes nothing, while the app
     * says it is backing up, truthfully, because it is: it is backing up a film.
     *
     * A blob can wait. A row that exists on one phone and nowhere else cannot.
     * The retry queue now runs at the END of the pass, after every row is up.
     */

    // ---- PUSH tombstones FIRST ----
    // A local delete is a decision this device has already made, so it has to
    // reach the cloud BEFORE we accept cloud state. Pushed after the pull (as
    // it was), the pull re-inserted the very row being deleted — its cloud copy
    // still had deleted_at null, so applyRemote treated it as a new row and
    // rawPut it back. That is the deleted workspace reappearing on Home.
    const tombs = await listTombstones();
    const tombstoned = new Set(tombs.map(t => `${t.kind}:${t.id}`));
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
        // Deleted here this pass — never resurrect it, even if the tombstone
        // push above failed (it stays queued and retries next run).
        if (tombstoned.has(`${kind}:${id}`)) return;
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

      // Missing table is decided here so the legacy pass below doesn't ask again
      // for a table that isn't there.
      let absent = false;
      if (!noRev.has(kind)) {
        const started = revs[kind] ?? 0;
        let since = started;
        for (;;) {
          const { data, error } = await supabase.from(kind).select('*')
            .gt('rev', since).order('rev', { ascending: true }).limit(PAGE);
          if (error) {
            if (isMissingTable(error)) { absent = true; set({ schemaOutdated: true }); break; } // its SQL not run yet — skip this kind
            if (isMissingRev(error)) { noRev.add(kind); set({ schemaOutdated: true }); break; }
            throw new Error(`pull ${kind}: ${error.message}`);
          }
          const remotes = (data ?? []) as Record<string, unknown>[];
          for (const r of remotes) await applyRemote(r);
          if (remotes.length) since = Number(remotes[remotes.length - 1].rev) || since;
          if (remotes.length < PAGE) break;
        }
        // Only when the rev pass actually ran — advancing this kind's rev cursor
        // after falling back would mark rows as seen that were never fetched.
        if (!noRev.has(kind) && !absent && since !== started) await advanceRev(kind, started, since);
      }
      if (noRev.has(kind) && !absent) {
        // Legacy pull (pre-upgrade cloud): device-clock cursor. Works, but clock
        // skew between devices can skip rows — hence the upgrade nudge in status.
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase.from(kind).select('*')
            .gt('updated_at', cursor)
            .order('updated_at', { ascending: true }).order('id', { ascending: true })
            .range(from, from + PAGE - 1);
          if (error) {
            if (isMissingTable(error)) { set({ schemaOutdated: true }); break; }
            throw new Error(`pull ${kind}: ${error.message}`);
          }
          const remotes = (data ?? []) as Record<string, unknown>[];
          for (const r of remotes) await applyRemote(r);
          if (remotes.length < PAGE) break;
        }
      }
    }

    // ---- PUSH: every row whose clock differs from the one we last got
    //      accepted for it. Never a comparison against a wall clock. ----
    const wanted = new Set<string>(wantedUploads);
    const alive = new Set<string>();          // every row still here, for the prune
    for (const kind of SYNC_KINDS) {
      const map = MAPS[kind];
      const batch: { key: string; clock: number; row: Record<string, unknown>; local: Record<string, unknown> }[] = [];
      for (const local of await rawAll(kind)) {
        const key = sentKey(kind, local.id as string);
        alive.add(key);
        const clock = map.clock(local);
        if (needsPush(sent, kind, local.id as string, clock)) {
          batch.push({ key, clock, row: map.toRow(local, uid), local });
        }
      }
      if (!batch.length) continue;

      for (let i = 0; i < batch.length; i += CHUNK) {
        const slice = batch.slice(i, i + CHUNK);
        const { error } = await supabase.from(kind).upsert(slice.map(b => b.row), { onConflict: 'id' });
        if (error) {
          // rows for this kind wait for their SQL. Nothing is recorded as sent,
          // so they simply go again next pass — no cursor to hold back.
          if (isMissingTable(error) || isMissingColumn(error)) { set({ schemaOutdated: true }); break; }
          throw new Error(`push ${kind}: ${error.message}`);
        }
        // Recorded ONLY on an accepted write, and persisted per kind so a later
        // kind throwing cannot lose the work the earlier ones just did.
        for (const b of slice) sent[b.key] = b.clock;
      }
      await metaPut(SENT_KEY, sent);

      /* The blobs this kind's rows point at, once the rows themselves are safe.
         It used to run before the upsert, so that a row never named a blob the
         cloud did not have yet. The cost of that ordering was the whole pass
         (see above); the cost of this one is a device that pulls the row first
         seeing a placeholder for a few minutes, which `pendingDownloads`
         already retries on every sync until the file lands. */
      for (const b of batch) await uploadMedia(uid, map.mediaKeys(b.local), uploaded, wanted);
    }

    await metaPut(SENT_KEY, pruneSent(sent, alive));

    // ---- and only now, what failed on earlier passes ----
    if (wantedUploads.size) await uploadMedia(uid, [...wantedUploads].map(key => ({ key })), uploaded, new Set());
    if (failedDownloads.size) await downloadMedia(uid, [...failedDownloads].map(([key, owner]) => ({ key, owner })), failedDownloads);

    /* The cursor is now ONLY the legacy pull's (a cloud too old for rev
       cursors). Compare-and-set so a Full re-sync tapped mid-pass is not
       clobbered. What the push has sent is recorded per row, above. */
    await metaPut('uploaded', { keys: [...uploaded] });
    if ((await getSyncCursor()) === cursor) await setSyncCursor(startedAt);
    // Retry queues persist regardless — an extra retry is harmless, a lost one isn't.
    const stillUp = new Set([...wanted].filter(k => !uploaded.has(k)));
    const stillDown = new Set([...failedDownloads].map(([k, o]) => (o ? `${k}|${o}` : k)));
    await keySetPut('pendingUploads', stillUp);
    await keySetPut('pendingDownloads', stillDown);

    set({ state: 'idle', lastSyncedAt: Date.now(), pendingUp: stillUp.size, pendingDown: stillDown.size });
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
/** Truthful backup state for one item: its row pushed AND its media in cloud
 *  storage. Drives the quiet "backed up ✓" on walks — a fact, never a guess.
 *  (A key with no local blob came FROM the cloud, so it counts as backed up.) */
export async function backedUp(kind: SyncKind, id: string, clock: number, keys: Array<string | undefined>): Promise<boolean> {
  if (!cloudConfigured) return false;
  // The row itself: read from the record of what was accepted, not from a clock
  // comparison — the same question the push asks, so the tick and the truth
  // cannot disagree.
  if ((await readSent())[sentKey(kind, id)] !== clock) return false;
  const uploaded = await keySet('uploaded');
  for (const k of keys) {
    if (k && !uploaded.has(k) && await hasBlob(k)) return false;
  }
  return true;
}

/* THE PHONE IS ABOUT TO SLEEP. A write made on the floor and then pocketed
   requests a sync 1.2 seconds later — and a backgrounded PWA has its timers
   frozen before that, so the row sat in IndexedDB until the app was next
   opened, while the laptop showed the old version. When the tab goes hidden,
   every request in the next few seconds fires almost at once instead: the
   field's own flush writes the row, the write signals a sync, and the sync
   goes before the freeze rather than after it. */
let hurryUntil = 0;
export function requestSync(delayMs = 1200): void {
  if (typeof window === 'undefined' || !cloudConfigured) return;
  window.clearTimeout(debounceTimer);
  const delay = Date.now() < hurryUntil ? Math.min(delayMs, 150) : delayMs;
  debounceTimer = window.setTimeout(() => { void syncNow(); }, delay);
}

/** Forget what's been synced and push/pull EVERYTHING again. For recovery — e.g.
 *  after the cloud tables were rebuilt. Waits out any in-flight sync (whose
 *  completion is CAS-guarded above, so it can't clobber the reset), then runs a
 *  genuine full pass. Upserts are idempotent — safe any time, just bandwidth. */
export async function fullResync(): Promise<void> {
  await setSyncCursor(0);
  await metaPut(REV_KEY, {});
  await metaPut(SENT_KEY, {});
  await metaPut('uploaded', { keys: [] });
  await metaPut('pendingUploads', { keys: [] });
  await metaPut('pendingDownloads', { keys: [] });
  set({ state: 'syncing', error: undefined });
  // Let the in-flight pass finish — but never wait for ever. The flag is cleared
  // in that pass's finally, so this normally ends in well under a second; the
  // ceiling is here so that a pass which somehow never clears it costs a
  // duplicate sync rather than a full resync that never returns. Upserts are
  // idempotent, so overlapping is safe; hanging is not.
  const waitUntil = Date.now() + 10_000;
  // `running` is cleared by the in-flight pass's own finally block, which the
  // rule cannot see from here. The Date.now() ceiling above is what makes this
  // safe, not the flag.
  // eslint-disable-next-line no-unmodified-loop-condition
  while (running && Date.now() < waitUntil) await new Promise(r => setTimeout(r, 300));
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hurryUntil = Date.now() + 3000; requestSync(150); }
    else kick();
  });
  timer = window.setInterval(kick, 30_000);
  kick();
}
export function stopSync() { if (timer) window.clearInterval(timer); }
