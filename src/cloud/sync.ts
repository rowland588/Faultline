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
  rawAll, rawGet, rawPut, hasBlob, getBlob, putBlob, applyRemoteDelete,
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
  /** Named by a record and not in the cloud at all: the device that took it
   *  has not sent it. No amount of waiting on THIS device brings it down, so
   *  it is counted apart from what is merely still on its way. */
  missingDown?: number;
  /** Of those, how many are films — the rest are photos. */
  missingFilms?: number;
  /** Missing files somebody has said to stop waiting for. Still fetched the
   *  moment they reach the cloud; no longer counted. */
  quietMissing?: number;
  /** ROWS THE CLOUD REFUSED on the last pass, by kind — a policy that said no,
   *  a column the cloud has not got, a bad legacy row. They stay on this
   *  device and go again next pass. Counted and named because for nine days
   *  every workspace write was refused and nothing on screen said so
   *  (docs/REVIEW.md, item 2): silence has to mean accepted, not unknown. */
  refused?: { kind: string; rows: number; message: string }[];
  /** EDITS OF OURS A NEWER COPY REPLACED. Last-write-wins is the right rule
   *  for a team this size, but the loser used to lose in silence. Kept in
   *  meta until somebody says they have seen them (docs/REVIEW.md, 5). */
  overwritten?: Overwritten[];
  /** CHANGES ON THIS DEVICE THE CLOUD HAS NOT GOT — rows and deletes. Files
   *  are pendingUp; this is everything else. Counted on every pass, and when a
   *  pass could not reach the cloud at all, so "backed up" is never said while
   *  a morning's typing sits on a phone with no signal. */
  unsent?: number;
  /** FILES THE CLOUD REFUSED AS TOO BIG (over the bucket's limit). Kept on this
   *  device, not sent again every pass, and said — the laptop cannot get
   *  them however long it waits. */
  tooBig?: { key: string; bytes: number }[];
}
export interface Overwritten { kind: string; id: string; title: string; at: number }
const OVERWRITTEN_KEY = 'overwritten';
async function readOverwritten(): Promise<Overwritten[]> {
  const m = (await metaGet(OVERWRITTEN_KEY)) as { rows?: Overwritten[] } | undefined;
  return m?.rows ?? [];
}
/** The title a person would know the row by, whatever kind it is. */
export function titleOf(row: Record<string, unknown>): string {
  for (const k of ['what', 'title', 'name', 'problem', 'text', 'product', 'note']) {
    const v = row[k]; if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 80);
  }
  return 'an item';
}
/** They have been seen: forget them. */
export async function clearOverwritten(): Promise<void> {
  await metaPut(OVERWRITTEN_KEY, { rows: [] });
  set({ overwritten: [] });
}
let status: SyncStatus = { state: 'signedout', lastSyncedAt: null };
const listeners = new Set<() => void>();
export const onSyncChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const syncStatus = (): SyncStatus => status;
function set(s: Partial<SyncStatus>) { status = { ...status, ...s }; listeners.forEach(f => { try { f(); } catch { /* ignore */ } }); }
// A dev-only seam so the account row can be driven in a browser with a status
// the sandbox cannot reach for real (a refused push). Not in the built app.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __faultlineSyncSet?: typeof set }).__faultlineSyncSet = set;

/** Who is signed in on THIS device — read from the session it holds, not
 *  asked of the server.
 *
 *  It asked the server (auth.getUser), and with no signal the answer was
 *  "nobody": the pass stopped as 'signedout', the account menu went on saying
 *  "Everything on this device is backed up", and Sign out — which checks for
 *  an error before it wipes the device — found none and wiped a phone holding
 *  a clip filmed with no signal (scripts/sync-two-devices.mjs, scenario 3).
 *  The server still checks every request it is sent; this only decides
 *  whether there is anybody to sync for. */
async function sessionUser(): Promise<{ id: string; email: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

/** A request that never reached the server — no signal, a dropped connection —
 *  as opposed to the server answering no. supabase-js reports both as an
 *  error; only the second is the cloud refusing anything. */
export const isNoConnection = (e: unknown): boolean => {
  const x = e as { code?: string; status?: number; message?: string } | null;
  if (!x) return false;
  if (x.code && x.code !== '' && !/^\d{3}$/.test(x.code)) return false;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|err_connection|the network connection was lost/i.test(x.message ?? '');
};
class NoConnection extends Error {}

/** Storage saying the file is bigger than the bucket will ever take. Sent
 *  again it is refused again, every pass, for ever. */
export const isTooLarge = (e: unknown): boolean => {
  const x = e as { status?: number; statusCode?: string; message?: string } | null;
  return !!x && (x.status === 413 || x.statusCode === '413' || /exceeded the maximum allowed size|payload too large/i.test(x.message ?? ''));
};
/** The bucket's limit as it stands (Supabase's global 50 MB; the `media`
 *  bucket sets none of its own). Used only to WARN at the moment a file is
 *  added — the upload still goes, and the server's 413 is what decides. */
export const CLOUD_FILE_LIMIT = 50 * 1024 * 1024;

/** The sizes of any of these files that are over the cloud's limit — for
 *  saying so the moment one is added, rather than letting the sync find out
 *  later and in silence. */
export async function overCloudLimit(keys: string[]): Promise<number[]> {
  const out: number[] = [];
  for (const k of keys) { const b = await getBlob(k); if (b && b.size > CLOUD_FILE_LIMIT) out.push(b.size); }
  return out;
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
async function uploadMedia(_uid: string, keys: MediaKey[], uploaded: Set<string>, wanted: Set<string>, tooBig: Map<string, number>): Promise<void> {
  const sb = supabase!;
  for (const { key, mime } of keys) {
    if (!key) continue;
    if (uploaded.has(key) || tooBig.has(key)) continue;
    wanted.add(key);
    const raw = await getBlob(key);
    if (!raw) { uploaded.add(key); continue; }         // referenced but gone locally — skip
    // Send a real content type. Storage echoes this back on download, so an
    // octet-stream here is what makes the clip unplayable on every OTHER device.
    const blob = await withUsableMime(raw, mime);
    /* Known too big before a byte is sent: not worth fifty-odd megabytes of a
       phone's data to be told so again. */
    if (blob.size > CLOUD_FILE_LIMIT) { tooBig.set(key, blob.size); wanted.delete(key); continue; }
    const { error } = await sb.storage.from(BUCKET).upload(key, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
    if (error) {
      /* TOO BIG FOR THE CLOUD is not "still to back up". It was counted as
         that, and sent again — tens of megabytes of somebody's mobile data —
         on every pass for ever, while the laptop waited for a film that could
         never arrive and nothing on either screen said why. Now it is set
         aside, by name and size, kept on this device, and said. Repair sync
         tries it again (the limit is a setting that can be raised). */
      if (isTooLarge(error)) { tooBig.set(key, blob.size); wanted.delete(key); }
      continue;                                        // otherwise stays in `wanted` − `uploaded` → retried next sync
    }
    uploaded.add(key);
  }
}
/** A storage answer that means "no such file", as opposed to a dropped
 *  connection. The API answers a missing object with a 400 whose body says
 *  404; a network failure never gets that far. */
export const isNotThere = (e: unknown): boolean => {
  const x = e as { status?: number; statusCode?: string; message?: string } | null;
  return !!x && (x.status === 404 || x.statusCode === '404' || /not.?found/i.test(x.message ?? ''));
};

/** Fetch one file into this device. 'absent' only when every place it could
 *  be says it is not there; anything else that failed is worth another go. */
async function downloadOne(uid: string, key: string, owner?: string, mime?: string): Promise<'got' | 'absent' | 'failed'> {
  const sb = supabase;
  if (!sb) return 'failed';
  const paths = [key, ...(owner && owner !== uid ? [`${owner}/${key}`] : []), `${uid}/${key}`];
  let absentEverywhere = true;
  for (const path of paths) {
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (!error && data) {
      // Re-derive the type from the bytes: what comes back off the wire is often
      // application/octet-stream, which no <video> or <img> will render.
      await putBlob(key, await withUsableMime(data, mime));
      return 'got';
    }
    if (!isNotThere(error)) absentEverywhere = false;
  }
  return absentEverywhere ? 'absent' : 'failed';
}

/* ---------- THE DOWNLOAD QUEUE ----------
 *
 * Rowland, on the laptop: "20 still coming down … I need instant connecting
 * sync between devices, not this uploading system."
 *
 * The records WERE instant — a test typed on the phone is on the laptop a
 * second or two later. What was not was everything behind them, for three
 * reasons, and the counter could not tell them apart:
 *
 * 1. THE PULL WAITED FOR THE FILMS. Every row the pull took from the cloud
 *    fetched its media there and then, before the next row. A walk is tens of
 *    megabytes: a laptop's first pull sat on each video in turn, and every row
 *    after it — and every change made on the phone in the meantime — waited
 *    behind the film. The push was cured of this a long time ago ("rows before
 *    blobs"); the pull never was. Now the pull only QUEUES a file, and the
 *    queue drains on its own, beside the sync rather than inside it: photos
 *    first, films last, one at a time, counting down as each lands.
 *
 * 2. SOME OF THEM WERE NEVER COMING. Eight files named by records in the
 *    cloud were not in the cloud: walk films from August and September that
 *    never left the phone that shot them. "It carries on by itself" was not
 *    true of those — no amount of waiting on the laptop fetches a file that
 *    is only on a phone. They are counted apart now, and the words say where
 *    they are.
 *
 * 3. THE QUEUE NEVER FORGOT. A file whose record had since been deleted
 *    stayed in the queue for ever. It is pruned to what a live record names.
 */
const DOWN_KEY = 'pendingDownloads';
type DownEntry = { owner?: string; mime?: string };
let queueLock: Promise<unknown> = Promise.resolve();
/** Read-modify-write of the queue, one at a time — the sync pass and the
 *  drain both change it, and two overlapping writes would lose one. */
function withQueue<T>(fn: (q: Map<string, DownEntry>) => Promise<T> | T): Promise<T> {
  const run = queueLock.then(async () => {
    await loadQuiet();
    const q = new Map<string, DownEntry>();
    for (const s of await keySet(DOWN_KEY)) {
      const i = s.indexOf('|');
      q.set(i < 0 ? s : s.slice(0, i), { owner: i < 0 ? undefined : s.slice(i + 1) || undefined, mime: mimes.get(i < 0 ? s : s.slice(0, i)) });
    }
    const out = await fn(q);
    await keySetPut(DOWN_KEY, new Set([...q].map(([k, e]) => (e.owner ? `${k}|${e.owner}` : k))));
    return out;
  });
  queueLock = run.catch(() => undefined);
  return run;
}
/** The type each queued file was named with, for this session — the queue on
 *  disk keeps only key and owner, and the bytes say the rest. */
const mimes = new Map<string, string>();
/** Files known not to be in the cloud, this session. Still queued — the phone
 *  that has one may send it at any moment — but not counted as "coming". */
const absent = new Set<string>();

const isFilm = (key: string) => (mimes.get(key) ?? '').startsWith('video/');

/* STOP WAITING FOR THESE. Rowland: "it says seven things only available on
   the phone, I click repair sync, nothing happens." Nothing could: a file that
   never left the phone that took it is not in the cloud for any repair to
   fetch. Said once, it can be set aside — kept in the queue, so it still comes
   down the moment that phone sends it, but no longer counted on every screen. */
const QUIET_KEY = 'quietMissing';
const quiet = new Set<string>();
let quietLoad: Promise<void> | null = null;
const loadQuiet = (): Promise<void> =>
  (quietLoad ??= keySet(QUIET_KEY).then(ks => { for (const k of ks) quiet.add(k); }));

function countDown(q: Map<string, DownEntry>) {
  const gone = [...q.keys()].filter(k => absent.has(k));
  const missing = gone.filter(k => !quiet.has(k));
  set({
    pendingDown: q.size - gone.length,
    missingDown: missing.length,
    missingFilms: missing.filter(isFilm).length,
    quietMissing: gone.length - missing.length,
  });
}

/** Set aside every file that is only on the phone that took it. */
export async function stopWaitingForMissing(): Promise<void> {
  await loadQuiet();
  await withQueue(async q => {
    for (const k of q.keys()) if (absent.has(k)) quiet.add(k);
    for (const k of [...quiet]) if (!q.has(k)) quiet.delete(k);
    await keySetPut(QUIET_KEY, quiet);
    countDown(q);
  });
}

/* A FILE THAT CAME DOWN IS ALREADY UP. The laptop fetched the phone's film,
   and the next time it pushed the test that names it — a typo fixed, a box
   ticked — it sent the whole film back up, because `uploaded` only ever
   learnt about files this device had sent. Every edit on a second device
   cost the full size of everything it had downloaded, once each; a 40 MB
   film over a site's 4G. Remembered here as it lands, and folded into
   `uploaded` at the start of the next pass. */
const FROM_CLOUD_KEY = 'fromCloud';
let fromCloudLock: Promise<unknown> = Promise.resolve();
function withFromCloud<T>(fn: (keys: Set<string>) => T): Promise<T> {
  const run = fromCloudLock.then(async () => {
    const keys = await keySet(FROM_CLOUD_KEY);
    const out = fn(keys);
    await keySetPut(FROM_CLOUD_KEY, keys);
    return out;
  });
  fromCloudLock = run.catch(() => undefined);
  return run;
}
const noteFromCloud = (key: string) => withFromCloud(keys => { keys.add(key); });

let draining = false;
let drainAgain = false;
/** Fetch everything queued: pictures first, films last. Beside the sync, not
 *  inside it, so a film coming down never holds a record up. */
export async function drainDownloads(uid: string): Promise<void> {
  if (draining) { drainAgain = true; return; }
  draining = true;
  try {
    do {
      drainAgain = false;
      const todo = await withQueue(q => [...q].sort(([a], [b]) => Number(isFilm(a)) - Number(isFilm(b))));
      for (const [key, e] of todo) {
        if (await hasBlob(key)) { await withQueue(q => { q.delete(key); countDown(q); }); continue; }
        const r = await downloadOne(uid, key, e.owner, e.mime);
        if (r === 'got') { absent.delete(key); await noteFromCloud(key); }
        else if (r === 'absent') absent.add(key);
        await withQueue(q => { if (r === 'got') q.delete(key); countDown(q); });
      }
    } while (drainAgain);
  } finally { draining = false; }
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

/** Does a row from the cloud replace the one we hold?
 *
 *  CAUSALITY BEFORE CLOCKS. `pushed` means the cloud already accepted our copy
 *  (sent records its clock). If it now holds something different, that was
 *  written after ours — whatever the two devices' clocks say. The old rule
 *  compared wall clocks only, so a phone ten minutes fast made every later
 *  edit from the laptop lose, and a device a year fast produced rows nobody
 *  could ever update. Only a row with UNPUSHED changes keeps itself when its
 *  clock is the newer one: there, "newer" is the only fact we have, and the
 *  edit on one side is lost either way — the remaining, documented risk. */
export const remoteWins = (localClock: number, remoteClock: number, pushed: boolean): boolean => {
  if (remoteClock === localClock) return false;          // our own echo
  if (pushed) return true;                               // written after what the cloud took from us
  return remoteClock > localClock;                       // both changed: the clock decides
};

/** Drop what no longer exists, so a lifetime of deletes cannot grow the record
 *  without bound. `alive` must hold every row of every kind — the pass visits
 *  them all, so anything missing from it is genuinely gone. */
export function pruneSent(sent: Sent, alive: Set<string>): Sent {
  for (const key of Object.keys(sent)) if (!alive.has(key)) delete sent[key];
  return sent;
}

/* ---------- THE LAST COPY BOTH SIDES AGREED ON ----------
 *
 * Last-write-wins was decided per ROW, and a row is a whole test. So the
 * phone typed the result and sent it; the laptop, with no signal, filled in
 * who the test was done with; and when the laptop came back its copy — newer
 * by the clock — went up whole, with the old result in it. The phone's result
 * was gone from every device, and nobody was told: the phone's edit had been
 * accepted, so it was not "replaced"; the laptop's had won, so it was not
 * either (scripts/sync-two-devices.mjs, scenario 4).
 *
 * Two edits to DIFFERENT boxes are not a conflict. To tell them apart this
 * device keeps, per row, the cloud's copy as it last agreed with it — taken
 * from the pull, and from every push the cloud accepted. When a row comes down
 * that this device has also changed, each column is asked who moved it:
 * only us → ours; only them → theirs; both, to the same → either; both, to
 * different things → the newer clock, and the loser is named. A list of
 * photos and clips is merged by id, so a clip filmed offline and a photo
 * added on the laptop both survive. The merged row is stamped now and pushed,
 * so every device ends on the same copy.
 *
 * Kept in `meta` under `base:<kind>:<id>` — no new store, so no version bump —
 * and pruned with the rows. A row with no base yet (synced before this) falls
 * back to the old rule, remoteWins(), and v5 re-pulls once to give every row
 * one. */
const BASE_PREFIX = 'base:';
const baseKey = (kind: SyncKind, id: string) => `${BASE_PREFIX}${kind}:${id}`;
type CloudRow = Record<string, unknown>;
const stripRev = (r: CloudRow): CloudRow => { const { rev: _rev, ...rest } = r; return rest; };
async function baseGet(kind: SyncKind, id: string): Promise<CloudRow | undefined> {
  return (await metaGet(baseKey(kind, id))) as CloudRow | undefined;
}
async function basePut(kind: SyncKind, id: string, row: CloudRow): Promise<void> {
  await metaPut(baseKey(kind, id), stripRev(row));
}
async function basePrune(alive: Set<string>): Promise<void> {
  const db = await getDB();
  const keys = await db.getAllKeys('meta', IDBKeyRange.bound(BASE_PREFIX, `${BASE_PREFIX}￿`));
  const gone = keys.filter(k => !alive.has(String(k).slice(BASE_PREFIX.length)));
  if (!gone.length) return;
  const tx = db.transaction('meta', 'readwrite');
  for (const k of gone) await tx.store.delete(k);
  await tx.done;
}

/* Columns that are the transport's, not anybody's edit. owner_id among them:
   several mappers stamp it with whoever pushes, so it differs from the
   cloud's without anybody having changed anything. */
const NOT_AN_EDIT = new Set(['rev', 'updated_at', 'owner_id']);
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** Every column we would send matches theirs — nothing but transport differs. */
const sameEdits = (mine: CloudRow, theirs: CloudRow): boolean =>
  Object.keys(mine).every(col => NOT_AN_EDIT.has(col) || same(mine[col], theirs[col]));
const isIdList = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) && v.every(x => !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string');

/** Two edits to one list of photos/clips/files: everything either side added,
 *  nothing either side removed. */
function mergeList(base: { id: string }[], mine: { id: string }[], theirs: { id: string }[], mineNewer: boolean): { id: string }[] {
  const b = new Set(base.map(x => x.id));
  const m = new Map(mine.map(x => [x.id, x]));
  const t = new Set(theirs.map(x => x.id));
  const out = theirs
    .filter(x => m.has(x.id) || !b.has(x.id))                       // not removed by us
    .map(x => (mineNewer ? m.get(x.id) ?? x : x));
  for (const x of mine) if (!t.has(x.id) && !b.has(x.id)) out.push(x); // added by us
  return out;
}

/** Three-way merge of one row, column by column. `mine` carries this
 *  device's unsent edit, `theirs` the cloud's newer copy, `base` what both
 *  last agreed. Returns the merged row, whether anything of ours is in it
 *  that the cloud has not got, and the columns where both changed and our
 *  value lost. Exported for the tests; it is the whole decision. */
export function mergeRows(base: CloudRow, mine: CloudRow, theirs: CloudRow, mineNewer: boolean):
  { row: CloudRow; ours: boolean; lost: string[] } {
  const row: CloudRow = { ...theirs };
  const lost: string[] = [];
  let ours = false;
  /* Only what this build writes: a column the cloud has and this mapper does
     not send (a legacy one) is nobody's edit here, and stays as theirs. */
  for (const col of Object.keys(mine)) {
    if (NOT_AN_EDIT.has(col)) continue;
    const b = base[col], m = mine[col], t = theirs[col];
    if (same(m, b) || same(m, t)) continue;                          // we did not move it, or moved it to theirs
    if (same(t, b)) { row[col] = m; ours = true; continue; }          // only we moved it
    if (isIdList(m) && isIdList(t)) {                                 // both moved a list: keep both sides' additions
      row[col] = mergeList(isIdList(b) ? b : [], m, t, mineNewer);
      ours = ours || !same(row[col], t);
      continue;
    }
    if (mineNewer) { row[col] = m; ours = true; } else lost.push(col);
  }
  return { row, ours, lost };
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
   stranded — including projects that had never reached the cloud at all.
   v5: rows carry the copy both sides last agreed (see mergeRows) — one full
   re-pull gives every row one, rows only, never the files. */
const ENGINE_VERSION = 5;
let migrationDone: Promise<void> | null = null;
function ensureMigrated(): Promise<void> {
  migrationDone ??= (async () => {
    const v = (await metaGet('engineVersion')) as number | undefined;
    if (v === ENGINE_VERSION) return;
    await setSyncCursor(0);
    await metaPut(REV_KEY, {});
    await metaPut('engineVersion', ENGINE_VERSION);
  })();
  /* A failed read must not be remembered as done-for-ever: let the next pass
     try again. */
  migrationDone.catch(() => { migrationDone = null; });
  return migrationDone;
}

/** The projects this person may only read (supabase/ACCESS_LEVELS.sql). A
 *  cloud without the column, or no signal, is none: everything goes, as before. */
async function readOnlyProjects(email: string): Promise<Set<string>> {
  if (!supabase || !email) return new Set();
  const { data, error } = await supabase.from('project_members').select('project_id').eq('email', email.toLowerCase()).eq('access', 'client');
  if (error || !data) return new Set();
  return new Set((data as { project_id: string }[]).map(r => r.project_id));
}
/* The last answer, for counting what is unsent when a pass cannot ask. */
let lastClientOf = new Set<string>();

/** WORK ON THIS DEVICE THE CLOUD HAS NOT GOT: rows changed since the cloud
 *  last accepted them, and deletes not yet sent. "Everything is backed up"
 *  was said whenever no FILE was waiting, so a phone with a morning's typing
 *  and no signal said it too — and Sign out believed it. A client's own rows
 *  are not counted: they stay home by design (see the push). */
async function countUnsent(sent: Sent): Promise<number> {
  let n = (await listTombstones()).length;
  for (const kind of SYNC_KINDS) {
    const map = MAPS[kind];
    for (const local of await rawAll(kind)) {
      if (!needsPush(sent, kind, local.id as string, map.clock(local))) continue;
      const pid = kind === 'projects' ? local.id : (local as { projectId?: unknown }).projectId;
      if (lastClientOf.has(String(pid))) continue;
      n++;
    }
  }
  return n;
}

/* Files the cloud refused as too big, key → bytes. Persisted: retrying one is
   a deliberate act (Repair sync), not something every pass does. */
const TOO_BIG_KEY = 'tooBig';
async function readTooBig(): Promise<Map<string, number>> {
  const m = (await metaGet(TOO_BIG_KEY)) as Record<string, number> | undefined;
  return new Map(Object.entries(m ?? {}));
}

/* ---------- the sync ---------- */
let running = false;
let runQueued = false;
export async function syncNow(): Promise<void> {
  if (!cloudConfigured || !supabase) return;
  if (running) { runQueued = true; return; } // a write mid-sync re-runs at the end, not never
  /* TAKEN BEFORE THE FIRST AWAIT. It was set after two of them — the engine
     check and the user lookup, which went to the server — so a write and the
     focus kick landing together both got past the check above and ran two
     passes at once: every file uploaded twice, each pass's record of what was
     sent overwriting the other's (seen in the harness: one photo sent four
     times in the same second). Nothing may sit between this and the try: a
     throw there would leave `running` true for ever, and the device would
     silently stop syncing until it was reloaded. */
  running = true;
  const startedAt = Date.now();
  let sentNow: Sent | null = null;
  try {
    await ensureMigrated();
    const me = await sessionUser();
    if (!me) { set({ state: 'signedout' }); return; }
    const uid = me.id;
    set({ state: 'syncing', error: undefined });
    const cursor = await getSyncCursor();       // the LEGACY PULL cursor only — the push no longer reads it
    const sent = sentNow = await readSent();
    const overwritten = await readOverwritten();
    const overwrittenBefore = overwritten.length;
    const uploaded = await keySet('uploaded');
    for (const k of await keySet(FROM_CLOUD_KEY)) uploaded.add(k);   // came down, so already up
    const wantedUploads = await keySet('pendingUploads');   // prior failures — retried AFTER the rows
    const tooBig = await readTooBig();

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
    /* NOTHING IN A PASS THROWS FOR ONE KIND'S SAKE. A tombstone push that
       hit a table the cloud did not have yet used to throw here, first thing,
       every pass, for ever: nothing pulled, nothing pushed, for every kind,
       while the status said "error" and the rows typed on the floor sat on
       the phone. The same for one rejected row of an early kind stalling
       tests and test_items, which come last. A kind that fails is noted and
       skipped; the pass carries on; the first failure is what the status
       shows at the end. Tombstones and rows that did not go are still there
       next pass.
       The one exception is NO CONNECTION AT ALL: then every kind would fail
       the same way, and twenty-two "refused" lines would be twenty-two lies.
       The pass stops, says it is waiting for a signal, and counts what is
       waiting. */
    let firstError: string | undefined;
    const tombs = await listTombstones();
    const tombstoned = new Set(tombs.map(t => `${t.kind}:${t.id}`));
    if (tombs.length) {
      const byKind = new Map<SyncKind, string[]>();
      for (const t of tombs) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t.id]);
      const cleared: string[] = [];
      for (const [kind, ids] of byKind) {
        let ok = true;
        for (let i = 0; i < ids.length && ok; i += CHUNK) {
          const part = ids.slice(i, i + CHUNK);
          const { error } = await supabase.from(kind).update({ deleted_at: startedAt, updated_at: startedAt }).in('id', part);
          if (error) {
            ok = false;
            if (isNoConnection(error)) throw new NoConnection(error.message);
            if (isMissingTable(error) || isMissingColumn(error)) set({ schemaOutdated: true });
            else firstError ??= `tombstone ${kind}: ${error.message}`;
          }
        }
        if (ok) cleared.push(...ids);
      }
      if (cleared.length) await clearTombstones(cleared);
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
        /* The row as it is NOW, not as it was when this kind's pull began — a
           keystroke written while page two was in flight is a real edit. */
        const localRow = local.has(id) ? await rawGet(kind, id) : undefined;
        if (r.deleted_at != null) { if (localRow) await applyRemoteDelete(kind, id); return; }
        // Deleted here this pass — never resurrect it, even if the tombstone
        // push above failed (it stays queued and retries next run).
        if (tombstoned.has(`${kind}:${id}`)) return;
        const localClock = localRow ? map.clock(localRow) : -1;
        const remoteClock = Number(r.updated_at);
        const key = sentKey(kind, id);

        if (localRow) {
          /* BOTH CHANGED IT: merge column by column against the copy both
             last agreed (mergeRows, above). Without that copy, the old rule. */
          const base = needsPush(sent, kind, id, localClock) ? await baseGet(kind, id) : undefined;
          /* Our own echo: now agreed. The same clock with a different copy is
             not an echo — another device's edit that happens to share this
             one's millisecond, merged below (it used to be taken for an echo
             and our whole copy pushed over theirs). A copy that matches ours
             stays an echo and keeps its place in the push queue, which is what
             Repair sync relies on to send everything again. */
          if (remoteClock === localClock && (!base || sameEdits(map.toRow(localRow, uid), r))) {
            await basePut(kind, id, r); return;
          }
          if (base) {
            const { row, ours, lost } = mergeRows(base, map.toRow(localRow, uid), r, localClock > remoteClock);
            await basePut(kind, id, r);
            if (lost.length) overwritten.push({ kind, id, title: titleOf(localRow), at: Date.now() });
            if (ours) {
              /* Something of ours is in it that the cloud has not got: stamp
                 it newer than both, and leave it unsent so the push takes it. */
              row.updated_at = Math.max(Date.now(), localClock + 1, remoteClock + 1);
              const incoming = map.fromRow(row);
              const merged = kind === 'workspaces' ? { schemaVersion: 1, ...localRow, ...incoming } : incoming;
              await rawPut(kind, merged as Record<string, unknown>);
              return;
            }
            /* Nothing of ours survives that the cloud lacks: take theirs, below. */
          } else {
            /* Our own echo, or a row we hold the newer copy of: keep ours and
               fetch any blob it is missing. The rule is remoteWins(), above. */
            /* Its files are the end-of-pass sweep's business, not this row's. */
            if (!remoteWins(localClock, remoteClock, sent[key] === localClock)) return;
            /* A newer copy is about to replace an edit this device never got
               to push. The loser is told, once, by name. */
            if (needsPush(sent, kind, id, localClock)) {
              overwritten.push({ kind, id, title: titleOf(localRow), at: Date.now() });
            }
          }
        }

        const incoming = map.fromRow(r);
        // workspaces: preserve device-only fields (running timer, last route, version)
        const merged = kind === 'workspaces' ? { schemaVersion: 1, ...(localRow ?? {}), ...incoming } : incoming;
        await rawPut(kind, merged as Record<string, unknown>);
        await basePut(kind, id, r);
        /* What we now hold IS the cloud's copy: say so, or the push phase would
           send it straight back up as if it were ours, bumping rev and making
           every other device pull it again — an echo for each edit. */
        Object.assign(sent, { [key]: map.clock(merged as Record<string, unknown>) });
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
            if (isNoConnection(error)) throw new NoConnection(error.message);
            if (isMissingTable(error)) { absent = true; set({ schemaOutdated: true }); break; } // its SQL not run yet — skip this kind
            if (isMissingRev(error)) { noRev.add(kind); set({ schemaOutdated: true }); break; }
            /* One kind the cloud will not give us is that kind's problem —
               it used to throw here and every kind after it went unpulled
               AND unpushed. What it gave before the failure is kept. */
            firstError ??= `pull ${kind}: ${error.message}`;
            break;
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
            if (isNoConnection(error)) throw new NoConnection(error.message);
            if (isMissingTable(error)) { set({ schemaOutdated: true }); break; }
            firstError ??= `pull ${kind}: ${error.message}`;
            break;
          }
          const remotes = (data ?? []) as Record<string, unknown>[];
          for (const r of remotes) await applyRemote(r);
          if (remotes.length < PAGE) break;
        }
      }
    }

    /* Rows the pull just took from the cloud are recorded as accepted before
       the push looks at them (see applyRemote). */
    await metaPut(SENT_KEY, sent);

    // ---- PUSH: every row whose clock differs from the one we last got
    //      accepted for it. Never a comparison against a wall clock. ----
    const wanted = new Set<string>(wantedUploads);
    const alive = new Set<string>();          // every row still here, for the prune
    const liveBlobs = new Set<string>();      // every blob a live row names, for the other prune
    const named = new Map<string, DownEntry>(); // …and who took it, for fetching it
    const refused: NonNullable<SyncStatus['refused']> = [];
    let unsent = 0;
    /* A CLIENT'S ROWS STAY HOME (lib/access, supabase/ACCESS_LEVELS.sql). A
       client may read a project and change nothing; the cloud refuses their
       writes, and one refused row holds back every row after it of that kind.
       The screens offer a client nothing to change, so this only ever catches
       a stray local write — and keeps it from stalling the pass. */
    const clientOf = lastClientOf = await readOnlyProjects(me.email);
    for (const kind of SYNC_KINDS) {
      const map = MAPS[kind];
      const batch: { key: string; clock: number; row: Record<string, unknown>; local: Record<string, unknown> }[] = [];
      for (const local of await rawAll(kind)) {
        const key = sentKey(kind, local.id as string);
        alive.add(key);
        for (const m of map.mediaKeys(local)) {
          liveBlobs.add(m.key);
          if (m.mime) mimes.set(m.key, m.mime);
          named.set(m.key, { owner: m.owner, mime: m.mime });
        }
        const clock = map.clock(local);
        if (needsPush(sent, kind, local.id as string, clock)) {
          const row = map.toRow(local, uid);
          if (clientOf.has(String(kind === 'projects' ? row.id : row.project_id))) continue;
          batch.push({ key, clock, row, local });
        }
      }
      if (!batch.length) continue;

      const accepted: typeof batch = [];
      let refusedRows = 0, refusedMessage = '';
      for (let i = 0; i < batch.length; i += CHUNK) {
        const slice = batch.slice(i, i + CHUNK);
        const { error } = await supabase.from(kind).upsert(slice.map(b => b.row), { onConflict: 'id' });
        if (!error) { accepted.push(...slice); continue; }
        if (isNoConnection(error)) throw new NoConnection(error.message);
        if (isMissingTable(error) || isMissingColumn(error)) {
          // rows for this kind wait for their SQL. Nothing is recorded as sent,
          // so they simply go again next pass — no cursor to hold back.
          refused.push({ kind, rows: batch.length - i, message: error.message });
          set({ schemaOutdated: true });
          break;
        }
        /* ONE BAD ROW IS ONE BAD ROW. An upsert is one statement: a single
           row a policy refuses fails the whole slice — up to two hundred of
           them, every finding written after it, every pass, until somebody
           fixed the one. Asked again one at a time, everything the cloud
           will take goes, and only what it will not stays, counted. */
        for (const b of slice) {
          const one = await supabase.from(kind).upsert([b.row], { onConflict: 'id' });
          if (!one.error) { accepted.push(b); continue; }
          if (isNoConnection(one.error)) throw new NoConnection(one.error.message);
          refusedRows++;
          refusedMessage ||= one.error.message;
        }
      }
      if (refusedRows) {
        refused.push({ kind, rows: refusedRows, message: refusedMessage });
        firstError ??= `push ${kind}: ${refusedMessage}`;
      }
      // Recorded ONLY on an accepted write, and persisted per kind so a later
      // kind failing cannot lose the work the earlier ones just did.
      for (const b of accepted) { sent[b.key] = b.clock; await basePut(kind, b.row.id as string, b.row); }
      unsent += batch.length - accepted.length;
      await metaPut(SENT_KEY, sent);

      /* The blobs this kind's rows point at, once the rows themselves are safe.
         It used to run before the upsert, so that a row never named a blob the
         cloud did not have yet. The cost of that ordering was the whole pass
         (see above); the cost of this one is a device that pulls the row first
         seeing a placeholder for a few minutes, which `pendingDownloads`
         already retries on every sync until the file lands. Only the rows the
         cloud took: the bucket refuses a file no row names yet. */
      for (const b of accepted) await uploadMedia(uid, map.mediaKeys(b.local), uploaded, wanted, tooBig);
      for (const b of batch) if (!accepted.includes(b)) for (const m of map.mediaKeys(b.local)) if (!uploaded.has(m.key) && !tooBig.has(m.key)) wanted.add(m.key);
    }

    await metaPut(SENT_KEY, pruneSent(sent, alive));
    await basePrune(alive);

    // ---- and only now, what failed on earlier passes ----
    if (wantedUploads.size) await uploadMedia(uid, [...wantedUploads].map(key => ({ key })), uploaded, wanted, tooBig);

    /* The cursor is now ONLY the legacy pull's (a cloud too old for rev
       cursors). Compare-and-set so a Full re-sync tapped mid-pass is not
       clobbered. What the push has sent is recorded per row, above. */
    /* Pruned like `sent`: it used to keep every blob key ever pushed, for the
       life of the device, and was read and rewritten whole every thirty
       seconds. Only what a live row still names is worth remembering. */
    const keepUploaded = [...uploaded].filter(k => liveBlobs.has(k));
    await metaPut('uploaded', { keys: keepUploaded });
    await withFromCloud(keys => { for (const k of [...keys]) if (uploaded.has(k) || !liveBlobs.has(k)) keys.delete(k); });
    for (const k of [...tooBig.keys()]) if (!liveBlobs.has(k)) tooBig.delete(k);
    await metaPut(TOO_BIG_KEY, Object.fromEntries(tooBig));
    if ((await getSyncCursor()) === cursor) await setSyncCursor(startedAt);
    // Retry queues persist regardless — an extra retry is harmless, a lost one isn't.
    const stillUp = new Set([...wanted].filter(k => !uploaded.has(k) && !tooBig.has(k)));
    await keySetPut('pendingUploads', stillUp);
    /* THE SWEEP. Every file a live record names that this device does not
       hold joins the queue; what no live record names leaves it. Asked of
       every record on every pass rather than of the rows this pass happened
       to pull, so a pass that failed half way, a file that arrived after its
       row, or a device that has never had it all come right on their own. */
    const missingHere = new Map<string, DownEntry>();
    for (const [k, e] of named) if (!(await hasBlob(k))) missingHere.set(k, e);
    await withQueue(q => {
      for (const [k, e] of missingHere) if (!q.has(k)) q.set(k, e);
      for (const k of [...q.keys()]) if (!liveBlobs.has(k)) q.delete(k);
      countDown(q);
    });

    if (overwritten.length !== overwrittenBefore) await metaPut(OVERWRITTEN_KEY, { rows: overwritten.slice(-20) });
    const over = overwritten.slice(-20);
    unsent += (await listTombstones()).length;
    const big = [...tooBig].map(([key, bytes]) => ({ key, bytes }));
    if (firstError) set({ state: 'error', error: firstError, lastSyncedAt: Date.now(), pendingUp: stillUp.size, refused, overwritten: over, unsent, tooBig: big });
    else set({ state: 'idle', lastSyncedAt: Date.now(), pendingUp: stillUp.size, refused, overwritten: over, unsent, tooBig: big });
    void drainDownloads(uid);
  } catch (e) {
    /* Say what is waiting, whatever stopped the pass. */
    let unsent: number | undefined;
    try { unsent = await countUnsent(sentNow ?? await readSent()); } catch { /* the count is a courtesy */ }
    set({
      state: 'error',
      error: e instanceof NoConnection ? 'No connection to the cloud — it tries again by itself.' : e instanceof Error ? e.message : 'Sync failed',
      unsent,
    });
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
  await metaPut(TOO_BIG_KEY, {});      // the limit may have been raised: try them once more
  absent.clear();
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
