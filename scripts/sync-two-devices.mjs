/* TWO DEVICES, ONE JOB — does what the phone records actually reach the laptop?
 *
 * Rowland: "from taking a video on my mobile, everything must still show on the
 * laptop. We've been through this before, but these things cannot fail."
 *
 * So this runs the real app twice — a phone (390×844, touch) and a laptop
 * (1366×768), each with its own IndexedDB, both signed in as the same person —
 * against a fake Supabase (scripts/fake-cloud.mjs) that keeps the one rule the
 * pull depends on (a server-assigned `rev` per row write) and the live bucket's
 * two rules (a file goes up only once a row names it; nothing over 50 MB).
 * Everything is done through the app's own controls: the phone films a real
 * clip through its VideoRecorder off Chromium's fake camera, takes a photo
 * through the Camera door, attaches a PDF through Attach a PDF. The laptop is
 * then read through its screens — the words on them, the photo's pixels, and a
 * <video> element that has to reach readyState ≥ 2.
 *
 *   node scripts/sync-two-devices.mjs            # starts its own vite on 5192
 *                                                # (scripts/sync-vite.config.ts:
 *                                                # no hot reload) and the fake
 *                                                # cloud on 54392; ~3 minutes
 *   SYNC_BASE=http://127.0.0.1:5192 node scripts/sync-two-devices.mjs
 *                                                # use a dev server you started
 *                                                # with VITE_SUPABASE_URL pointed
 *                                                # at the fake cloud (port 54392)
 *   SYNC_ONLY=1,3   only those scenarios (2–8 build on 1's job)
 *   SYNC_SHOTS=dir  a screenshot of both devices for every failed check
 *   SYNC_DEBUG=1    every upload, per file, per device, at the end
 *
 * What it found the first time it ran, every one invisible to the unit tests
 * and fixed in src/cloud, src/db and the recorder:
 *   - Sign out with no signal WIPED a phone holding a clip filmed offline: the
 *     pass asked the server who was signed in, heard "nobody", reported
 *     "signed out" rather than an error, and Sign out found nothing wrong.
 *   - Offline, the account menu said "Everything on this device is backed up".
 *   - Two edits to different boxes of one test, one offline: one was lost on
 *     every device and nobody was told.
 *   - The laptop sent every film it had downloaded back up the next time it
 *     touched the test; two triggers together ran two passes and uploaded
 *     each file twice.
 *   - A clip that arrived while its viewer was open said "not on this device
 *     yet" until somebody left the screen.
 *   - A file over 50 MB was "still to back up" for ever and nothing said why.
 *
 * The scenarios, each PASS or FAIL in the table at the end (exit 1 on any FAIL):
 *   1 the phone makes a whole stage-gate job; the laptop shows every part of it
 *   2 the laptop edits, deletes and ticks; the phone shows it
 *   3 the phone works offline, films, comes back; nothing lost or doubled
 *   4 both edit one test while one is offline; the app's own rule decides
 *   5 a 20-second film, and uploads that die mid-way, still arrive
 *   6 one row the cloud refuses holds up nothing else, and the phone says so
 *   7 how long a change on the phone takes to show on the laptop, by itself
 *   8 a file over the 50 MB limit: said at once, kept, never retried silently
 *
 * WHAT IT CANNOT PROVE. The fake cloud is not Postgres: no real RLS beyond the
 * media rule, no column list (check-live-schema.mjs does that), no latency or
 * packet loss beyond what is injected here. Chromium is not iOS Safari: its
 * MediaRecorder writes WebM, an iPhone's writes MP4, and a home-screen PWA is
 * frozen in the background in ways a desktop browser never is. */
import pkg from 'playwright';
import { spawn } from 'node:child_process';
import { startFakeCloud } from './fake-cloud.mjs';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = pkg;
const CLOUD_PORT = 54392;
const VITE_PORT = 5192;
const OWN_VITE = !process.env.SYNC_BASE;
const BASE = process.env.SYNC_BASE ?? `http://127.0.0.1:${VITE_PORT}`;
const ONLY = process.env.SYNC_ONLY ? new Set(process.env.SYNC_ONLY.split(',').map(Number)) : null;
const T0 = Date.now();
const say = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1).padStart(6)}s]`, ...a);

/* ---------- one person, two devices ---------- */
const USER = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'rowland@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
};
const SESSION = {
  access_token: 'fake', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'fake', user: USER,
};
/* supabase-js names its storage key after the first label of the host:
   127.0.0.1 → "127" (node_modules/@supabase/supabase-js, defaultStorageKey). */
const STORAGE_KEY = 'sb-127-auth-token';

/* ---------- the result table ---------- */
const results = [];   // { scn, ok, what, detail }
let scn = 0;
const notes = [];
function note(what) { notes.push({ scn, what }); say(`note [${scn}] ${what}`); }
function check(ok, what, detail = '') {
  results.push({ scn, ok: !!ok, what, detail: String(detail ?? '') });
  say(`${ok ? 'ok  ' : 'FAIL'} [${scn}] ${what}${detail !== '' ? ` — ${detail}` : ''}`);
  if (!ok) shotQueue.push(`fail-${scn}-${results.length}`);
  return !!ok;
}
const appErrors = [];
/* With SYNC_SHOTS=<dir>, every failed check leaves a picture of both screens. */
const shotQueue = [];
const flushShots = async () => {
  if (!process.env.SYNC_SHOTS) { shotQueue.length = 0; return; }
  while (shotQueue.length) {
    const label = shotQueue.shift();
    for (const d of [globalThis.__phone, globalThis.__laptop]) if (d) await d.page.screenshot({ path: `${process.env.SYNC_SHOTS}/${label}-${d.name}.png`, fullPage: true }).catch(() => {});
  }
};

/* ---------- servers ---------- */
const cloud = await startFakeCloud({ port: CLOUD_PORT, user: USER });
let vite = null;
if (OWN_VITE) {
  vite = spawn('npx', ['vite', '--config', 'scripts/sync-vite.config.ts', '--port', String(VITE_PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, VITE_SUPABASE_URL: cloud.url, VITE_SUPABASE_ANON_KEY: 'x' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let out = '';
  vite.stdout.on('data', d => { out += d; });
  vite.stderr.on('data', d => { out += d; });
  const until = Date.now() + 30_000;
  for (;;) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* not yet */ }
    if (Date.now() > until) { console.error('vite did not start:\n' + out); await shutdown(2); }
    await new Promise(r => setTimeout(r, 300));
  }
}

let browser;
async function shutdown(code) {
  try { await browser?.close(); } catch { /* gone */ }
  try { await cloud.close(); } catch { /* gone */ }
  if (vite) { try { process.kill(-vite.pid, 'SIGTERM'); } catch { /* gone */ } }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(130));

browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

const UA = {
  phone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  laptop: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};
async function device(name, viewport, mobile) {
  const ctx = await browser.newContext({
    serviceWorkers: 'block', viewport, isMobile: mobile, hasTouch: mobile, locale: 'en-GB', userAgent: UA[name],
    permissions: ['camera', 'microphone'],
  });
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private */ } }, [STORAGE_KEY, SESSION]);
  const page = await ctx.newPage();
  page.on('pageerror', e => appErrors.push(`${name}: ${e.message.split('\n')[0]}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // The realtime socket refusing (when it is switched off) and a fetch the
    // harness deliberately dropped are the harness's doing, not the app's.
    if (/WebSocket|realtime|net::ERR|Failed to fetch|Failed to load resource|ERR_CONNECTION|ERR_INTERNET_DISCONNECTED|DevTools/i.test(t)) return;
    appErrors.push(`${name} console: ${t.slice(0, 200)}`);
  });
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  return { name, ctx, page };
}

/* ---------- reading a device (never writing to it) ---------- */
const idb = (page, store) => page.evaluate(async s => (await (await import('/src/db/core.ts')).getDB()).getAll(s), store);
const idbGet = (page, store, id) => page.evaluate(async ([s, i]) => (await (await import('/src/db/core.ts')).getDB()).get(s, i), [store, id]);
const blobInfo = (page, key) => !key ? Promise.resolve(null) : page.evaluate(async k => {
  const b = await (await (await import('/src/db/core.ts')).getDB()).get('media', k);
  if (!b) return null;
  const head = new Uint8Array(await b.slice(0, 8).arrayBuffer());
  return { size: b.size, type: b.type, head: [...head].map(x => x.toString(16).padStart(2, '0')).join('') };
}, key);
const status = (page) => page.evaluate(async () => {
  const s = (await import('/src/cloud/sync.ts')).syncStatus();
  return JSON.parse(JSON.stringify(s));
});

/** Rows this device holds that the cloud has not accepted yet, and deletes not
 *  yet sent — read from the engine's own record of what was accepted. */
const unsent = (page) => page.evaluate(async () => {
  const { MAPS, SYNC_KINDS } = await import('/src/cloud/mappers.ts');
  const db = await (await import('/src/db/core.ts')).getDB();
  const sent = (await db.get('meta', 'pushedClocks')) ?? {};
  let n = 0;
  for (const k of SYNC_KINDS) for (const r of await db.getAll(k)) if (sent[`${k}:${r.id}`] !== MAPS[k].clock(r)) n++;
  return n + (await db.getAll('tombstones')).length;
});
/** Ask for a pass the way a person would — Account → Check for changes now —
 *  and wait for it to finish. */
async function syncViaUI(dev, { timeout = 30_000 } = {}) {
  const { page } = dev;
  const before = (await status(page)).lastSyncedAt ?? 0;
  await page.getByRole('button', { name: /^Account/ }).first().click();
  await page.getByText('Check for changes now').first().click();
  await page.keyboard.press('Escape').catch(() => {});
  return waitPass(dev, before, timeout);
}
async function waitPass(dev, after, timeout = 30_000) {
  const until = Date.now() + timeout;
  for (;;) {
    const s = await status(dev.page);
    if ((s.lastSyncedAt ?? 0) > after && s.state !== 'syncing') return s;
    if (Date.now() > until) return s;
    await dev.page.waitForTimeout(150);
  }
}
/** Wait for the device to have nothing left to send and nothing still coming. */
async function settle(dev, { timeout = 60_000, down = true } = {}) {
  await dev.page.waitForTimeout(300);
  const until = Date.now() + timeout;
  let s;
  for (;;) {
    s = await status(dev.page);
    if (s.state !== 'syncing' && s.lastSyncedAt && !(s.pendingUp > 0) && (!down || !(s.pendingDown > 0)) && (await unsent(dev.page)) === 0) return s;
    if (Date.now() > until) return s;
    await dev.page.waitForTimeout(250);
  }
}
async function waitFor(fn, timeout = 30_000, step = 200) {
  const until = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > until) return v;
    await new Promise(r => setTimeout(r, step));
  }
}
const go = async (page, hash) => {
  await flushShots();
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (document.querySelector('h1')?.textContent ?? '').trim().length > 0, null, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(600);
};
/** The words appear on screen within a few seconds (a lazy screen loads first). */
const seen = (page, str, timeout = 6000) => waitFor(async () => (await text(page)).includes(str), timeout, 150);
/* The words on screen AND what the boxes hold — a material's name is typed
   into an editable field, which innerText does not include. */
const text = (page) => page.evaluate(() => (document.body.innerText + ' '
  + [...document.querySelectorAll('input, textarea')].map(e => e.value).join(' ')).replace(/\s+/g, ' '));
const fieldValue = async (page, label) => { await expand(page); return fieldValue0(page, label); };
const fieldValue0 = (page, label) => page.locator(`label:has-text("${label}") textarea, label:has-text("${label}") input`).first().inputValue();

/* ---------- things to attach ---------- */
async function makeJpeg() {
  const p = await browser.newPage({ viewport: { width: 640, height: 480 } });
  await p.setContent('<body style="margin:0;background:linear-gradient(45deg,#c33,#36c)"><h1 style="font:bold 80px sans-serif;color:#fff;padding:40px">INFEED JAM</h1></body>');
  const buf = await p.screenshot({ type: 'jpeg', quality: 80 });
  await p.close();
  return buf;
}
function makePdf(title) {
  const body = `BT /F1 24 Tf 72 720 Td (${title}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/* ---------- the phone's hands ---------- */
async function createJob(page, name) {
  await go(page, '/projects?new=1');
  await page.getByRole('button', { name: /Bring new equipment into use/ }).click();
  await page.getByPlaceholder('e.g. Line 7 new wrapper').fill(name);
  await page.getByPlaceholder('Who is accountable for it').fill('Rowland');
  await page.getByRole('button', { name: 'Create and add the machines' }).click();
  await page.waitForURL(/#\/project\/[^/]+\/install/);
  return page.url().match(/project\/([^/?#]+)/)[1];
}
async function addMachine(page, name, oem) {
  await page.getByRole('button', { name: 'Add a machine' }).click();
  await page.getByPlaceholder('Machine').fill(name);
  await page.getByPlaceholder('Who supplied it').fill(oem);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.waitForTimeout(500);
}
async function planTest(page, pid, title, machine) {
  await go(page, `/project/${pid}/testing`);
  await page.getByRole('button', { name: 'Plan a test' }).click();
  await page.getByPlaceholder('What do we plan to do?').fill(title);
  await page.getByRole('button', { name: machine, exact: true }).click();
  await page.getByRole('button', { name: 'Plan it' }).click();
  await page.waitForURL(/testing\/[^/?#]+/);
  await page.waitForTimeout(500);
  return page.url().match(/testing\/([^/?#]+)/)[1];
}
/** A test with a verdict folds its plan and its day away behind "Edit" —
 *  open them, the way a person would, before reaching for what is inside. */
async function expand(page) {
  for (let i = 0; i < 4; i++) {
    const edit = page.locator('button.tw-fold');
    if (!(await edit.count())) return;
    await edit.first().click();
    await page.waitForTimeout(250);
  }
}
async function typeInto(page, label, value) {
  await expand(page);
  const box = page.locator(`label:has-text("${label}") textarea, label:has-text("${label}") input`).first();
  await box.scrollIntoViewIfNeeded();
  await box.click();
  await box.fill(value);
  await box.press('Tab');           // the field writes on blur
  await page.waitForTimeout(250);
}
/** A finding or a meeting note: the box under its own heading (its
 *  placeholder changes to "Another one?" once the list has something in it). */
async function addTo(page, section, value) {
  await expand(page);
  const box = page.locator(`section.tw-block:has(> .tw-block-h:has-text("${section}")) input:not([type=date]):not([type=file])`).last();
  await box.scrollIntoViewIfNeeded();
  await box.fill(value);
  await box.press('Enter');
  await page.waitForTimeout(400);
}
const addFinding = (page, v) => addTo(page, 'What we found on the day', v);
const addNote = (page, v) => addTo(page, 'For the meeting', v);
async function addLine(page, placeholder, value) {
  const box = page.getByPlaceholder(placeholder).first();
  await box.scrollIntoViewIfNeeded();
  await box.fill(value);
  await box.press('Enter');
  await page.waitForTimeout(400);
}
async function takePhoto(page, jpeg) {
  await expand(page);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Camera', exact: true }).first().click()]);
  await fc.setFiles({ name: 'IMG_0412.jpg', mimeType: 'image/jpeg', buffer: jpeg });
  await page.waitForTimeout(800);
}
async function attachPdf(page, name, bytes) {
  const tid = page.url().match(/testing\/([^/?#]+)/)?.[1];
  const before = tid ? ((await testRow(page, tid))?.docs?.length ?? 0) : 0;
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Attach a PDF' }).first().click()]);
  await fc.setFiles({ name, mimeType: 'application/pdf', buffer: bytes });
  if (tid) await waitFor(async () => ((await testRow(page, tid))?.docs?.length ?? 0) > before, 8000);
  else await page.waitForTimeout(800);
}
async function pickFromPhone(page, name, mimeType, buffer) {
  await expand(page);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'On the phone' }).first().click()]);
  /* Playwright will not hand over more than 50 MB from memory: a real file. */
  const dir = mkdtempSync(join(tmpdir(), 'fl-sync-'));
  const path = join(dir, name);
  writeFileSync(path, buffer);
  await fc.setFiles(path);
  rmSync(dir, { recursive: true, force: true });
}
/** Film through the app's own recorder: Video → shutter → wait → stop → Done. */
async function filmClip(page, seconds) {
  await expand(page);
  await page.getByRole('button', { name: 'Video', exact: true }).first().click();
  const live = await waitFor(() => page.evaluate(() => {
    const v = document.querySelector('video.rec-preview');
    return !!v && v.readyState >= 2 && v.videoWidth > 0;
  }), 10_000);
  if (!live) throw new Error('the recorder never showed a live camera');
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.waitForTimeout(seconds * 1000);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await waitFor(() => page.locator('.rec-tally').count(), 10_000);
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.waitForTimeout(1200);   // saveVideoBlob + the patch
}
async function testRow(page, id) { return idbGet(page, 'tests', id); }

/* ---------- the laptop's eyes ---------- */
/** Every evidence thumbnail on screen, and whether its picture actually drew. */
async function thumbs(page) {
  return page.evaluate(() => [...document.querySelectorAll('.ev-thumb')].map(b => {
    const img = b.querySelector('img');
    return { img: !!img, w: img?.naturalWidth ?? 0, ok: !!img && img.complete && img.naturalWidth > 0, video: !!b.querySelector('.ev-play') };
  }));
}
/** Open a video thumbnail and see whether the clip plays. */
async function playVideo(page, nth = 0) {
  const vids = page.locator('.ev-thumb:has(.ev-play)');
  if (await vids.count() <= nth) return { found: false };
  await vids.nth(nth).click();
  const r = await waitFor(() => page.evaluate(() => {
    const v = document.querySelector('.ev-viewer video');
    const msg = document.querySelector('.ev-viewer .video-msg')?.textContent ?? null;
    if (!v) return msg && !/Loading/.test(msg) ? { found: true, msg } : null;
    return v.readyState >= 2 ? { found: true, readyState: v.readyState, duration: v.duration, w: v.videoWidth, h: v.videoHeight } : null;
  }), 10_000);
  const final = r ?? await page.evaluate(async () => {
    /* Still not playing: time a plain read of the same blob, to tell a slow
       IndexedDB from a screen that never asked again. */
    const t0 = performance.now();
    const keys = await (await (await import('/src/db/core.ts')).getDB()).getAllKeys('media');
    const readMs = Math.round(performance.now() - t0);
    const v = document.querySelector('.ev-viewer video');
    return { found: true, readyState: v?.readyState ?? -1, msg: document.querySelector('.ev-viewer .video-msg')?.textContent ?? null, readMs, mediaKeys: keys.length };
  });
  await page.locator('.ev-viewer .ev-close').click().catch(() => {});
  await page.waitForTimeout(200);
  return final;
}

/* ======================================================================= */
const phone = globalThis.__phone = await device('phone', { width: 390, height: 844 }, true);
const laptop = globalThis.__laptop = await device('laptop', { width: 1366, height: 768 }, false);
const jpeg = await makeJpeg();
const pdf = makePdf('Brillopak FAT report');
const ctx = {};          // ids the scenarios share

const run = async (n, title, fn) => {
  if (ONLY && !ONLY.has(n)) return;
  scn = n;
  say(`==== ${n} · ${title}`);
  try { await fn(); } catch (e) {
    check(false, `scenario ${n} ran to the end`, e.message.split('\n').slice(0, 3).join(' '));
    if (process.env.SYNC_SHOTS) for (const d of [phone, laptop]) await d.page.screenshot({ path: `${process.env.SYNC_SHOTS}/fail-${n}-${d.name}.png`, fullPage: true }).catch(() => {});
  }
};

/* ---- 1 ---------------------------------------------------------------- */
await run(1, 'the phone makes a whole stage-gate job; the laptop shows all of it', async () => {
  const p = phone.page;
  const pid = ctx.pid = await createJob(p, 'Line 7 new wrapper');
  await addMachine(p, 'Case packer', 'Brillopak');
  await p.getByRole('button', { name: /Add the \d+ stages/ }).click();
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: /Case packer — Positioned and levelled/ }).click();
  await p.getByRole('button', { name: 'Done today' }).click();
  await p.waitForTimeout(600);
  ctx.doneCell = await p.getByRole('button', { name: /Case packer — Positioned and levelled/ }).getAttribute('aria-label');
  ctx.stepId = (await idb(p, 'tests')).find(t => t.title === 'Positioned and levelled')?.id;

  const tid = ctx.tid = await planTest(p, pid, 'Run at 70 ppm for an hour', 'Case packer');
  await typeInto(p, 'Passes if', '70 ppm held for 60 minutes, under 2% waste');
  await typeInto(p, 'What happened', '68 ppm average, two crash stops at the infeed');
  await p.getByRole('button', { name: 'Didn’t pass' }).click();
  await p.waitForTimeout(400);
  await addFinding(p, 'Film splice jams the infeed');
  await addNote(p, 'Ask Brillopak about the splice sensor');
  await takePhoto(p, jpeg);
  await filmClip(p, 3);
  await attachPdf(p, 'Brillopak FAT report.pdf', pdf);

  const t = await testRow(p, tid);
  check(t?.media?.length === 2 && t.media.some(m => m.kind === 'photo') && t.media.some(m => m.kind === 'video'),
    'the phone holds the photo and the clip on the test', JSON.stringify(t?.media?.map(m => `${m.kind}:${m.mime}`)));
  check(t?.docs?.length === 1, 'the phone holds the PDF on the test', t?.docs?.map(d => d.name).join(','));
  ctx.media = t?.media ?? []; ctx.docs = t?.docs ?? [];

  await p.getByRole('button', { name: 'Add a fix for this test' }).click();
  await p.getByPlaceholder('What are we fixing?').fill('Replace the splice sensor');
  await p.getByRole('button', { name: 'Case packer', exact: true }).click();
  await p.getByRole('button', { name: 'Plan it' }).click();
  await p.waitForURL(/testing\/[^/?#]+/);
  ctx.fixId = p.url().match(/testing\/([^/?#]+)/)[1];

  await go(p, `/project/${pid}/materials`);
  await p.getByPlaceholder('TESC03163A Finest Red 2kg').fill('Finest Red 2kg film');
  await p.getByPlaceholder('10 reels').fill('10 reels');
  await p.getByRole('button', { name: 'Add it' }).click();
  await p.waitForTimeout(500);
  await go(p, `/project/${pid}/set-up`);
  await p.getByPlaceholder('P-104 perforation').fill('P-104 perforation');
  await p.getByRole('button', { name: 'Add it' }).click();
  await p.waitForTimeout(500);

  /* The phone's own sync: nobody presses anything. */
  const ps = await settle(phone, { timeout: 45_000 });
  check(ps.state === 'idle' && !ps.pendingUp && !ps.refused?.length, 'the phone pushes everything by itself', `state=${ps.state} pendingUp=${ps.pendingUp} refused=${JSON.stringify(ps.refused)}`);
  const keys = [...ctx.media.flatMap(m => [m.blobKey, m.thumbKey]), ...ctx.docs.map(d => d.blobKey)].filter(Boolean);
  check(keys.every(k => cloud.objects.has(`media/${k}`)), 'every file is in cloud storage', `${keys.filter(k => cloud.objects.has(`media/${k}`)).length}/${keys.length}`);
  check(cloud.uploadsRefused.policy === 0, 'no upload was refused for arriving before its row', `policy refusals: ${cloud.uploadsRefused.policy}`);

  /* ---- the laptop ---- */
  const l = laptop.page;
  await syncViaUI(laptop);
  await settle(laptop, { timeout: 60_000 });
  await go(l, '/');
  check(await seen(l, 'Line 7 new wrapper'), 'the laptop’s Home shows the job');
  await go(l, `/project/${pid}/install`);
  const cell = await l.getByRole('button', { name: /Case packer — Positioned and levelled/ }).getAttribute('aria-label').catch(() => null);
  check(cell === ctx.doneCell && (await testRow(l, ctx.stepId))?.outcome === 'passed', 'the laptop shows the step ticked done, as the phone does', `${cell} / phone: ${ctx.doneCell}`);
  check(await l.getByRole('button', { name: /Case packer — Dry run/ }).count() === 1, 'the laptop shows the machine’s stages');
  await go(l, `/project/${pid}/testing/${tid}`);
  const page = await text(l);
  check(await fieldValue(l, 'Passes if') === '70 ppm held for 60 minutes, under 2% waste', 'the laptop shows the passes-if');
  check(await fieldValue(l, 'What happened') === '68 ppm average, two crash stops at the infeed', 'the laptop shows the result');
  check(/Didn’t pass/.test(page) && (await testRow(l, tid))?.outcome === 'failed', 'the laptop shows the verdict', (await testRow(l, tid))?.outcome);
  check(page.includes('Film splice jams the infeed'), 'the laptop shows the finding');
  check(page.includes('Ask Brillopak about the splice sensor'), 'the laptop shows the meeting note');
  check(page.includes('Replace the splice sensor'), 'the laptop shows the fix under the test');
  check(page.includes('Brillopak FAT report'), 'the laptop shows the PDF by name');
  await expand(l);
  const evidence = await text(l);
  check(/1 photo · 1 clip/.test(evidence), 'the laptop counts 1 photo · 1 clip', evidence.match(/EVIDENCE.{0,30}/i)?.[0]);
  const th = await thumbs(l);
  check(th.some(x => !x.video && x.ok), 'the photo draws on the laptop (naturalWidth > 0)', JSON.stringify(th));
  const v = await playVideo(l);
  check(v.readyState >= 2 && v.duration > 0, 'the clip plays on the laptop (readyState ≥ 2, duration > 0)', JSON.stringify(v));
  const pdfHere = await blobInfo(l, ctx.docs[0]?.blobKey);
  check(pdfHere?.head?.startsWith('255044462d') && pdfHere.size === pdf.length, 'the PDF’s bytes are on the laptop, whole', JSON.stringify(pdfHere));
  await go(l, `/project/${pid}/materials`);
  check(await seen(l, 'Finest Red 2kg film'), 'the laptop shows the material',
    `phone ${(await idb(p, 'materials')).length} · cloud ${cloud.rows('materials').length} · laptop ${(await idb(l, 'materials')).length}`);
  await go(l, `/project/${pid}/set-up`);
  check(await seen(l, 'P-104 perforation'), 'the laptop shows the program',
    `phone ${(await idb(p, 'programs')).length} · cloud ${cloud.rows('programs').length} · laptop ${(await idb(l, 'programs')).length}`);
  await go(l, `/project/${pid}/notes`);
  check(await seen(l, 'Ask Brillopak about the splice sensor'), 'the laptop’s meeting notes show the note');
});

/* ---- 2 ---------------------------------------------------------------- */
await run(2, 'the laptop edits; the phone sees it', async () => {
  const l = laptop.page, p = phone.page;
  const { pid, tid, fixId } = ctx;
  await go(l, `/project/${pid}/testing/${tid}`);
  await typeInto(l, 'What happened', '71 ppm after the splice sensor was moved');
  await l.getByRole('button', { name: 'Passed', exact: true }).click();
  await l.waitForTimeout(300);
  /* Delete the finding: open it, then its own delete. */
  await l.getByRole('button', { name: 'Film splice jams the infeed' }).click();
  await l.waitForTimeout(300);
  const del = l.getByRole('button', { name: /^(Delete|Remove)/ }).first();
  await del.click();
  await l.waitForTimeout(300);
  const confirm = l.getByRole('button', { name: /^(Delete|Remove|Yes)/ });
  if (await confirm.count()) await confirm.first().click().catch(() => {});
  await l.waitForTimeout(400);
  await go(l, `/project/${pid}/testing/${fixId}`);
  await l.getByRole('button', { name: 'Fixed', exact: true }).click();
  await l.waitForTimeout(300);
  const items = (await idb(l, 'test_items')).filter(i => i.what === 'Film splice jams the infeed');
  check(items.length === 0, 'the laptop deleted the finding', `${items.length} left`);

  const ls = await settle(laptop, { timeout: 30_000 });
  check(ls.state === 'idle' && !ls.refused?.length, 'the laptop pushes by itself', ls.state);
  await syncViaUI(phone);
  await go(p, `/project/${pid}/testing/${tid}`);
  check(await fieldValue(p, 'What happened') === '71 ppm after the splice sensor was moved', 'the phone shows the laptop’s new result');
  check((await testRow(p, tid))?.outcome === 'passed', 'the phone shows the laptop’s verdict');
  check(!(await text(p)).includes('Film splice jams the infeed'), 'the finding is gone from the phone');
  check((await testRow(p, fixId))?.outcome === 'passed', 'the phone shows the fix ticked done');
  check(cloud.rows('test_items').find(r => r.what === 'Film splice jams the infeed')?.deleted_at != null, 'the cloud holds the delete');
});

/* ---- 3 ---------------------------------------------------------------- */
await run(3, 'the phone offline: films and edits, comes back; nothing lost, nothing doubled', async () => {
  const p = phone.page;
  const { pid, tid } = ctx;
  await go(p, `/project/${pid}/testing/${tid}`);
  const before = { media: (await testRow(p, tid)).media.length, objects: cloud.objects.size };
  await phone.ctx.setOffline(true);
  await typeInto(p, 'Product we ran', 'Finest Red 2kg, reel 3');
  await addFinding(p, 'Seal bar runs hot on reel 3');
  await filmClip(p, 3);
  /* Its own sync tries, and fails — supabase-js retries a read three times
     (1 s, 2 s, 4 s) before it gives up, so a pass offline takes ~7 s. */
  const off = await waitFor(async () => { const x = await status(p); return x.state !== 'syncing' && x.unsent > 0 ? x : null; }, 25_000) ?? await status(p);
  const t = await testRow(p, tid);
  check(t.media.length === before.media + 1, 'the clip is saved on the phone while offline', `${t.media.length}`);
  check(!cloud.rows('test_items').some(r => r.what === 'Seal bar runs hot on reel 3'), 'nothing reached the cloud while offline');
  check(off.state === 'error' && off.unsent > 0, 'offline, the phone says its work is waiting (not “signed out”, not “backed up”)',
    JSON.stringify({ state: off.state, error: off.error, unsent: off.unsent, pendingUp: off.pendingUp }));
  await p.getByRole('button', { name: /^Account/ }).first().click();
  await p.waitForTimeout(400);
  const menu = await text(p);
  check(!/Everything on this device is backed up/.test(menu), 'the account menu does not claim it is backed up', menu.match(/(Everything[^.]*|Backup paused[^.]*|\d+ change[^.]*)/)?.[0]);
  /* Sign out with no signal and unsent work: it must refuse, not wipe. */
  const dialogs = [];
  const onDialog = d => { dialogs.push(`${d.type()}: ${d.message()}`); void d.accept(); };
  p.on('dialog', onDialog);
  await p.getByText('Sign out', { exact: true }).first().click();
  /* Its last pass runs first — ~7 s with no signal — then the answer. */
  await waitFor(() => dialogs.length >= 2, 30_000, 250);
  p.off('dialog', onDialog);
  const still = await idb(p, 'test_items').catch(() => []);
  check(dialogs.length === 2 && /^alert/.test(dialogs[1]) && still.some(i => i.what === 'Seal bar runs hot on reel 3'),
    'signing out offline is refused, and the unsent work stays on the phone', dialogs.join(' | ').slice(0, 220));
  await p.keyboard.press('Escape').catch(() => {});
  if (!still.length) throw new Error('the phone’s database was wiped by signing out offline — nothing after this can run');

  const backAt = Date.now();
  await phone.ctx.setOffline(false);
  /* Coming back online: the app's own 'online' kick, nothing pressed. */
  const arrived = await waitFor(() => cloud.rows('test_items').some(r => r.what === 'Seal bar runs hot on reel 3')
    && cloud.objects.has(`media/${t.media.at(-1).blobKey}`), 40_000);
  check(arrived, 'back online, the edit and the clip reach the cloud by themselves', `${((Date.now() - backAt) / 1000).toFixed(1)} s`);
  await settle(phone);
  await syncViaUI(laptop);
  await settle(laptop);
  const l = laptop.page;
  await go(l, `/project/${pid}/testing/${tid}`);
  check(await fieldValue(l, 'Product we ran') === 'Finest Red 2kg, reel 3', 'the laptop shows the offline edit');
  const seals = (await idb(l, 'test_items')).filter(i => i.what === 'Seal bar runs hot on reel 3' && !i.deletedAt);
  check(seals.length === 1, 'the offline finding is on the laptop once', `${seals.length}`);
  check(cloud.rows('test_items').filter(r => r.what === 'Seal bar runs hot on reel 3').length === 1, 'and in the cloud once');
  const lt = await testRow(l, tid);
  check(lt.media.length === t.media.length && new Set(lt.media.map(m => m.id)).size === lt.media.length, 'the laptop has every clip, none twice', `${lt.media.length}`);
  check(/1 photo · 2 clips/.test(await text(l)), 'the laptop counts 1 photo · 2 clips');
  const v = await playVideo(l, 1);
  check(v.readyState >= 2, 'the offline clip plays on the laptop', JSON.stringify(v));
});

/* ---- 4 ---------------------------------------------------------------- */
await run(4, 'both edit one test while the laptop is offline', async () => {
  const p = phone.page, l = laptop.page;
  const { pid, tid } = ctx;
  await go(l, `/project/${pid}/testing/${tid}`);
  await go(p, `/project/${pid}/testing/${tid}`);
  await laptop.ctx.setOffline(true);
  /* The phone writes first and gets it into the cloud… */
  await typeInto(p, 'What happened', 'PHONE: 72 ppm, clean run');
  await settle(phone);
  check(cloud.rows('tests').find(r => r.id === tid)?.result === 'PHONE: 72 ppm, clean run', 'the phone’s edit is in the cloud');
  /* …then the laptop, offline, edits a DIFFERENT field of the same test, later. */
  await l.waitForTimeout(50);
  await typeInto(l, 'Done with', 'LAPTOP: Brillopak fitter');
  await l.waitForTimeout(1500);
  await laptop.ctx.setOffline(false);
  await settle(laptop);
  await syncViaUI(laptop);
  await syncViaUI(phone);
  const cl = cloud.rows('tests').find(r => r.id === tid);
  const lt = await testRow(l, tid), pt = await testRow(p, tid);
  check(lt.withWhom === pt.withWhom && lt.result === pt.result && cl.result === lt.result, 'both devices and the cloud agree',
    JSON.stringify({ laptop: [lt.result, lt.withWhom], phone: [pt.result, pt.withWhom], cloud: [cl.result, cl.with_whom] }));
  check(cl.with_whom === 'LAPTOP: Brillopak fitter', 'the later edit (laptop’s field) is kept');
  check(cl.result === 'PHONE: 72 ppm, clean run', 'the phone’s edit to a different field is not lost', cl.result);

  /* The SAME field on both sides: the later clock wins, the loser is told. */
  await laptop.ctx.setOffline(true);
  await typeInto(p, 'What happened', 'PHONE again: 73 ppm');
  await settle(phone);
  await typeInto(l, 'What happened', 'LAPTOP: 74 ppm, later');
  await laptop.ctx.setOffline(false);
  await settle(laptop);
  await syncViaUI(phone);
  const c2 = cloud.rows('tests').find(r => r.id === tid);
  check(c2.result === 'LAPTOP: 74 ppm, later' && (await testRow(p, tid)).result === c2.result, 'same field: the later edit wins everywhere', c2.result);
  const ps = await status(p), ls2 = await status(l);
  note(`same field: who was told — phone ${JSON.stringify(ps.overwritten?.map(o => o.title) ?? [])}, laptop ${JSON.stringify(ls2.overwritten?.map(o => o.title) ?? [])}`);

  /* The same field, and this time the OFFLINE side is the older edit: the
     cloud's newer copy wins, and the device whose edit lost says so by name. */
  await laptop.ctx.setOffline(true);
  await typeInto(l, 'What happened', 'LAPTOP offline, earlier');
  await l.waitForTimeout(100);
  await typeInto(p, 'What happened', 'PHONE: 75 ppm, the later edit');
  await settle(phone);
  await laptop.ctx.setOffline(false);
  await settle(laptop);
  const c3 = cloud.rows('tests').find(r => r.id === tid);
  const ls3 = await status(l);
  check(c3.result === 'PHONE: 75 ppm, the later edit' && (await testRow(l, tid)).result === c3.result, 'same field, offline edit older: the newer cloud copy wins on both', c3.result);
  check((ls3.overwritten ?? []).some(o => o.id === tid), 'and the laptop names the edit of its that was replaced', JSON.stringify(ls3.overwritten?.map(o => o.title)));

  /* The phone films a clip while the laptop, offline, adds a photo to the
     SAME test: two edits to one list. Both must survive, everywhere. */
  await laptop.ctx.setOffline(true);
  await takePhoto(l, jpeg);
  await filmClip(p, 2);
  await settle(phone);
  const clipId = (await testRow(p, tid)).media.at(-1).id;
  const photoId = (await testRow(l, tid)).media.at(-1).id;
  await laptop.ctx.setOffline(false);
  await settle(laptop);
  await syncViaUI(phone);
  const ids = r => (r.media ?? []).map(m => m.id);
  const cm = ids(cloud.rows('tests').find(r => r.id === tid)), pm = ids(await testRow(p, tid)), lm = ids(await testRow(l, tid));
  check([cm, pm, lm].every(x => x.includes(clipId) && x.includes(photoId)) && pm.length === lm.length && cm.length === pm.length,
    'a clip filmed on the phone and a photo added offline on the laptop both survive, on both', `cloud ${cm.length} · phone ${pm.length} · laptop ${lm.length}`);
});

/* ---- 5 ---------------------------------------------------------------- */
await run(5, 'a 20-second film, with the first uploads dying mid-way', async () => {
  const p = phone.page;
  const { pid, tid } = ctx;
  await go(p, `/project/${pid}/testing/${tid}`);
  cloud.failUploads = 2;
  const startAttempts = cloud.uploadAttempts;
  await filmClip(p, 20);
  const t = await testRow(p, tid);
  const clip = t.media.at(-1);
  const local = await blobInfo(p, clip.blobKey);
  check(local && local.size > 1_000_000, 'a 20 s clip of realistic size is on the phone', `${((local?.size ?? 0) / 1e6).toFixed(2)} MB ${local?.type}`);
  ctx.bigClip = { key: clip.blobKey, size: local?.size };
  const failedAt = Date.now();
  await waitFor(() => cloud.uploadsRefused.dropped >= 2, 30_000);
  check(cloud.uploadsRefused.dropped >= 2, 'the first uploads died mid-way', `dropped=${cloud.uploadsRefused.dropped}`);
  const s1 = await status(p);
  check(s1.pendingUp > 0 || cloud.objects.has(`media/${clip.blobKey}`), 'the phone counts the file as still to go up', `pendingUp=${s1.pendingUp}`);
  const up = await waitFor(() => cloud.objects.has(`media/${clip.blobKey}`), 75_000, 500);
  check(up, 'the film reaches the cloud on a later pass by itself', `${((Date.now() - failedAt) / 1000).toFixed(1)} s after the failure, ${cloud.uploadAttempts - startAttempts} upload attempts`);
  check(cloud.objects.get(`media/${clip.blobKey}`)?.bytes.length === local?.size, 'whole, byte for byte in size', `${cloud.objects.get(`media/${clip.blobKey}`)?.bytes.length} vs ${local?.size}`);
  const s2 = await settle(phone);
  check(!s2.pendingUp, 'the phone then says nothing is waiting', `pendingUp=${s2.pendingUp}`);
  /* The laptop is ALREADY looking at the test when the record arrives, and
     the film takes a while to come down: does the open screen pick it up,
     or does it say "not on this device" until somebody navigates away? */
  const l = laptop.page;
  await go(l, `/project/${pid}/testing/${tid}`);
  await expand(l);
  cloud.downloadDelayMs = 4000;
  await syncViaUI(laptop);
  const n = await waitFor(async () => { const c = await l.locator('.ev-thumb:has(.ev-play)').count(); return c >= 3 ? c : 0; }, 15_000);
  await l.locator('.ev-thumb:has(.ev-play)').nth(n - 1).click();
  await l.waitForTimeout(500);
  const early = await l.evaluate(() => document.querySelector('.ev-viewer')?.textContent ?? '');
  await waitFor(async () => (await blobInfo(l, clip.blobKey))?.size === local?.size, 60_000, 300);
  cloud.downloadDelayMs = 0;
  const lb = await blobInfo(l, clip.blobKey);
  check(lb?.size === local?.size, 'the laptop has the whole film', `${lb?.size}`);
  const late = await waitFor(() => l.evaluate(() => {
    const v = document.querySelector('.ev-viewer video');
    return v && v.readyState >= 2 ? { readyState: v.readyState, duration: v.duration } : null;
  }), 8000);
  check(!!late, 'a viewer already open when the film lands starts playing by itself, no navigation',
    late ? JSON.stringify(late) : `still: ${(await l.evaluate(() => document.querySelector('.ev-viewer')?.textContent ?? '')).slice(0, 80)} (at open: ${early.slice(0, 60)})`);
  await l.locator('.ev-viewer .ev-close').click().catch(() => {});
  await settle(laptop, { timeout: 60_000 });
  await go(l, `/project/${pid}/testing/${tid}`);
  const v = await playVideo(l, n - 1);
  check(v.readyState >= 2, 'and it plays there after opening the test afresh', JSON.stringify(v));
});

/* ---- 6 ---------------------------------------------------------------- */
await run(6, 'one row the cloud refuses holds up nothing else', async () => {
  const p = phone.page;
  const { pid, tid } = ctx;
  cloud.refuseRow = (t, r) => t === 'test_items' && r.what === 'REFUSE ME';
  await go(p, `/project/${pid}/testing/${tid}`);
  await addFinding(p, 'REFUSE ME');
  await addFinding(p, 'Guard switch loose');
  await typeInto(p, 'Product we ran', 'Finest Red 2kg, reel 4');
  await go(p, `/project/${pid}/materials`);
  if (!(await p.getByPlaceholder('TESC03163A Finest Red 2kg').count())) await p.getByRole('button', { name: /Add what you need/ }).click();
  await p.getByPlaceholder('TESC03163A Finest Red 2kg').fill('Spare splice tape');
  await p.getByRole('button', { name: 'Add it' }).click();
  await p.waitForTimeout(300);
  const s = await waitFor(async () => { const x = await status(p); return x.refused?.length ? x : null; }, 20_000);
  await p.waitForTimeout(1500);
  check(cloud.rows('test_items').some(r => r.what === 'Guard switch loose'), 'a finding written after the refused one still reaches the cloud');
  check(cloud.rows('tests').find(r => r.id === tid)?.product === 'Finest Red 2kg, reel 4', 'other kinds (the test) still reach the cloud');
  check(cloud.rows('materials').some(r => r.what === 'Spare splice tape'), 'kinds after it (materials) still reach the cloud');
  check(!cloud.rows('test_items').some(r => r.what === 'REFUSE ME'), 'the refused row is not in the cloud');
  const st = await status(p);
  check(st.refused?.length === 1 && st.refused[0].kind === 'test_items' && st.refused[0].rows === 1,
    'the phone counts exactly one refused row, of the right kind', JSON.stringify(st.refused));
  await go(p, '/');
  const home = await text(p);
  check(/1 row the cloud refused — findings and fixes/.test(home), 'Home says so in words', home.match(/\d+ rows? the cloud refused[^.]*/)?.[0] ?? '(nothing said)');
  check(!/Everything is backed up/.test(home), 'and does not also claim everything is backed up');
  cloud.refuseRow = null;
  void s;
  /* Lifted: the refused row goes on the next pass, and the warning clears. */
  await syncViaUI(phone);
  const st2 = await status(p);
  check(cloud.rows('test_items').some(r => r.what === 'REFUSE ME') && !st2.refused?.length, 'once the rule allows it, it goes and the warning clears', JSON.stringify(st2.refused));
});

/* ---- 7 ---------------------------------------------------------------- */
await run(7, 'how long a phone change takes to show on the laptop, untouched', async () => {
  const p = phone.page, l = laptop.page;
  const { pid, tid } = ctx;
  await go(l, `/project/${pid}/testing/${tid}`);
  await go(p, `/project/${pid}/testing/${tid}`);
  await settle(laptop); await settle(phone);
  const timeIt = async (label, value) => {
    const at = Date.now();
    await typeInto(p, 'Product we ran', value);
    const seen = await waitFor(async () => (await fieldValue(l, 'Product we ran')) === value, 45_000, 100);
    const ms = Date.now() - at;
    return { label, seen: !!seen, ms };
  };
  cloud.realtime = false;
  const a = await timeIt('no realtime (interval fallback)', 'interval run');
  check(a.seen, 'without realtime the laptop shows it by itself (30 s interval)', `${(a.ms / 1000).toFixed(1)} s`);
  /* Realtime on: both devices must reconnect to the socket. Reload so the
     client's back-off is not what is being measured. */
  cloud.realtime = true;
  await l.reload(); await p.reload();
  await l.waitForTimeout(3000); await p.waitForTimeout(3000);
  await go(l, `/project/${pid}/testing/${tid}`);
  await go(p, `/project/${pid}/testing/${tid}`);
  await settle(laptop); await settle(phone);
  const b = await timeIt('realtime', 'realtime run');
  check(b.seen && b.ms < 6000, 'with realtime the laptop shows it within seconds, no reload', `${(b.ms / 1000).toFixed(1)} s`);
  ctx.timings = [a, b];
  cloud.realtime = false;
});

/* ---- 8 ---------------------------------------------------------------- */
await run(8, 'a file over the 50 MB limit', async () => {
  const p = phone.page;
  const { pid, tid } = ctx;
  await go(p, `/project/${pid}/testing/${tid}`);
  /* A real clip, padded past the limit — what a camera app's 1080p minute is. */
  const real = await p.evaluate(async key => {
    const b = await (await (await import('/src/db/core.ts')).getDB()).get('media', key);
    return Array.from(new Uint8Array(await b.arrayBuffer()));
  }, ctx.media.find(m => m.kind === 'video').blobKey);
  const big = Buffer.alloc(52 * 1024 * 1024);
  Buffer.from(real).copy(big);
  const beforeCount = (await testRow(p, tid)).media.length;
  await pickFromPhone(p, 'VID_20261004_0915.webm', 'video/webm', big);
  const said = await waitFor(async () => (await text(p)).match(/(over|larger|too (big|large))[^.]{0,120}/i)?.[0], 15_000);
  check(!!said, 'the phone says at once that the file is too big for the cloud', said ?? '(nothing said)');
  const t = await waitFor(async () => { const r = await testRow(p, tid); return r.media.length > beforeCount ? r : null; }, 15_000);
  check(!!t, 'the file is kept on the phone all the same');
  const key = t?.media.at(-1).blobKey;
  await p.waitForTimeout(4000);
  await syncViaUI(phone);
  const tries = cloud.log.filter(e => e.path.endsWith(`/${key}`) && e.method === 'POST').length;
  await syncViaUI(phone);
  const tries2 = cloud.log.filter(e => e.path.endsWith(`/${key}`) && e.method === 'POST').length;
  check(tries <= 1 && tries2 === tries, 'it is not sent again on every pass', `${tries} then ${tries2} attempts, 413s=${cloud.uploadsRefused.tooLarge}`);
  const st = await status(p);
  check(!st.pendingUp && (st.tooBig?.length ?? 0) === 1, 'the status names it as too big, not as “still to back up”', JSON.stringify({ pendingUp: st.pendingUp, tooBig: st.tooBig }));
  await go(p, '/');
  const home = await text(p);
  check(/too (big|large)/i.test(home), 'Home says it in words', home.match(/[^.]*too (big|large)[^.]*/i)?.[0] ?? '(nothing)');
  check(cloud.rows('tests').find(r => r.id === tid)?.media?.some(m => m.blobKey === key), 'the record itself still synced');

  /* The server's limit lower than the app believes (a bucket set to 200 kB):
     the 413 itself must be read as final, not as a blip to retry. */
  cloud.maxObjectBytes = 200_000;
  await go(p, `/project/${pid}/testing/${tid}`);
  await filmClip(p, 3);
  const small = (await testRow(p, tid)).media.at(-1);
  await waitFor(() => cloud.uploadsRefused.tooLarge >= 1, 20_000);
  await settle(phone, { timeout: 20_000 });
  const a1 = cloud.log.filter(e => e.path.endsWith(`/${small.blobKey}`) && e.method === 'POST').length;
  await syncViaUI(phone); await syncViaUI(phone);
  const a2 = cloud.log.filter(e => e.path.endsWith(`/${small.blobKey}`) && e.method === 'POST').length;
  const st2 = await status(p);
  check(cloud.uploadsRefused.tooLarge >= 1 && a1 === 1 && a2 === 1, 'a 413 from the server is final: one attempt, not one a pass', `413s=${cloud.uploadsRefused.tooLarge}, attempts ${a1} then ${a2}`);
  check(st2.tooBig?.some(x => x.key === small.blobKey) && !st2.pendingUp, 'and it is named too big, not “still to back up”', JSON.stringify({ tooBig: st2.tooBig?.length, pendingUp: st2.pendingUp }));
  /* Before Repair (which re-sends everything on purpose): no file has gone up
     twice — not from two passes racing, not from the laptop sending back a
     film it had only downloaded. */
  const okUps = {};
  for (const e of cloud.log) if (e.path.startsWith('/storage/v1/object/') && e.method === 'POST' && e.result === 'ok') okUps[e.path] = (okUps[e.path] ?? 0) + 1;
  const twice = Object.entries(okUps).filter(([, n]) => n > 1);
  scn = 0;
  check(twice.length === 0, 'across every scenario, no file was uploaded twice', twice.map(([k, n]) => `${k.split('/').pop()}×${n}`).join(', '));
  const upBy = who => new Set(cloud.log.filter(e => e.path.startsWith('/storage/v1/object/') && e.method === 'POST' && e.from === who).map(e => e.path));
  const phoneUps = upBy('phone'), both = [...upBy('laptop')].filter(k => phoneUps.has(k));
  check(both.length === 0, 'the laptop never sent back up a file the phone took (it only downloaded them)', both.map(k => k.split('/').pop()).join(', '));
  scn = 8;
  /* The limit raised, Repair sync: it goes. */
  cloud.maxObjectBytes = 50 * 1024 * 1024;
  await p.getByRole('button', { name: /^Account/ }).first().click();
  await p.getByText('Repair sync', { exact: true }).first().click();
  const went = await waitFor(() => cloud.objects.has(`media/${small.blobKey}`), 30_000);
  check(went, 'after the limit is raised, Repair sync sends it');
  await p.keyboard.press('Escape').catch(() => {});
});

/* ======================================================================= */
scn = 0;
check(appErrors.length === 0, 'no error thrown by the app on either device', appErrors.slice(0, 5).join(' | '));

const names = { 1: 'phone builds a job → laptop shows all', 2: 'laptop edits → phone', 3: 'offline phone, back online', 4: 'conflict while offline',
  5: 'large film, uploads fail mid-way', 6: 'one refused row', 7: 'speed, untouched laptop', 8: 'file over 50 MB', 0: 'app health' };
console.log('\n================ SYNC — TWO DEVICES ================');
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 0]) {
  const rs = results.filter(r => r.scn === n);
  if (!rs.length) continue;
  const bad = rs.filter(r => !r.ok);
  console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${n || '-'}  ${names[n].padEnd(36)} ${rs.length - bad.length}/${rs.length}`);
  for (const r of bad) console.log(`        ✗ ${r.what}${r.detail ? ` — ${r.detail}` : ''}`);
  for (const x of notes.filter(x => x.scn === n)) console.log(`        · ${x.what}`);
}
if (ctx.timings) for (const t of ctx.timings) console.log(`      phone → laptop, ${t.label}: ${t.seen ? (t.ms / 1000).toFixed(1) + ' s' : 'never (45 s)'}`);
console.log(`      cloud: ${cloud.revNow()} row writes, ${cloud.uploadsOk} uploads ok, refused ${JSON.stringify(cloud.uploadsRefused)}`);
if (process.env.SYNC_DEBUG) {
  const ups = {};
  for (const e of cloud.log) if (e.path.startsWith('/storage/v1/object/') && e.method === 'POST') { const k = e.path.split('/').pop(); ups[k] = [...(ups[k] ?? []), `${e.from}:${e.result}@${((e.at - T0) / 1000).toFixed(1)}`]; }
  console.log('uploads per key:', JSON.stringify(ups, null, 1));
}
const failed = results.some(r => !r.ok);
console.log(failed ? '\nFAIL' : '\nPASS');
await shutdown(failed ? 1 : 0);
