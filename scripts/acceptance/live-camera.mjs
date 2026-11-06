/* THE LIVE CAMERA ON A WORKSTATION'S SHEET (docs/ATTACHMENTS.md; knowledge/specs/FC-241-workstation-stops.md part 5 — Rowland, 6 November: "it needs access to my camera …
 * it needs to be a live action. Live picture, live video"): Chromium's fake camera stands in for the lens.
 *   1  the sheet offers Take a photo · Film a clip · Photos or videos · A link — the first two the app's own camera, the gallery a separate door
 *   2  Take a photo opens the live camera full screen on Photo: the live picture playing, a Photo / Video switch, a shutter; a tap snaps and the camera STAYS open
 *      (the tally says 1 photo saved), a second tap a second picture; Done lands on the sheet with both pictures listed under that workstation, as JPEGs
 *   3  Film a clip opens it on Video: record, a REC timer running, stop — a clip saved; switch to Photo and back without leaving; the clip is a video on the record,
 *      seen (a first frame and a solid play arrow)
 *   4  a photo and a clip together: Done · 1 photo · 1 clip; all of them kept under the workstation after a reload, the tile counting them
 *   5  a phone that gives the camera but not the microphone still takes a picture
 *   6  a phone with no live camera falls back: no Film a clip button, Take a photo going to the phone's own camera
 *   7  the phone (390 px): the switch, the shutter and Done a thumb's height, the live picture filling the screen, nothing off the side
 *  and no console error. */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const mk = async (viewport, extra = {}) => {
  const ctx = await b.newContext({ viewport, permissions: ['camera', 'microphone'], ...extra });
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  return ctx;
};
const errs = [];
const open = async ctx => {
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
  const id = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const ws = await db.createWorkspace('Line 7');
    const t = Date.now(), id = crypto.randomUUID();
    await db.putStudy({ id, tool: 'calc', name: 'Stops — packing hall', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {},
      agreed: { calc: { key: 'workstation-stops', inputs: { n: 4, unit: 'kg', same: 'same', per: 'min', rate: 12, watched: 120, w01_name: 'Filler', w02_name: 'Wrapper', w03_name: 'Sealer', w04_name: 'Packer' } } } });
    return id;
  });
  await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await page.waitForTimeout(1800);
  return { page, id };
};
const settle = (page, ms = 500) => page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}).then(() => page.waitForTimeout(ms));
const attach = (page, id) => page.evaluate(async i => ((await (await import('/src/db.ts')).getStudy(i)).facts.attach ?? []).filter(a => !a.struck).map(a => ({ kind: a.kind, target: a.target, mime: a.mime, key: a.blobKey })), id);
const blobInfo = (page, key) => page.evaluate(async k => { const b = await (await import('/src/db.ts')).getBlob(k); return b ? { size: b.size, type: b.type } : null; }, key);

/* ---- 1 · the sheet */
const ctx = await mk({ width: 1360, height: 900 });
const { page, id } = await open(ctx);
await page.locator('.calc-tile[data-tile="2"] [data-attach-open]').click(); await settle(page);
const sheet = page.locator('[data-attach-sheet="w03"]');
ok(await sheet.locator('[data-attach-photo]').count() === 1 && await sheet.locator('[data-attach-film]').count() === 1 && await sheet.locator('[data-attach-files]').count() === 1 && await sheet.locator('[data-attach-link]').count() === 1,
  '1 the sheet offers Take a photo · Film a clip · Photos or videos · A link');
ok(/Film a clip/.test(await sheet.innerText()), '1 and says Film a clip in words');

/* ---- 2 · live photo, the camera staying open */
await sheet.locator('[data-attach-photo]').click(); await page.waitForTimeout(1200);
const stage = page.locator('.rec-stage');
ok(await stage.count() === 1, '2 Take a photo opens the app’s own camera, full screen');
const live = await page.locator('.rec-preview').evaluate(v => ({ w: v.videoWidth, h: v.videoHeight, playing: !v.paused && v.readyState >= 2 }));
ok(live.w > 0 && live.h > 0 && live.playing, '2 the live picture is playing', JSON.stringify(live));
ok(await stage.locator('[data-rec-mode=photo]').getAttribute('aria-selected') === 'true' && await stage.locator('[data-rec-mode=video]').getAttribute('aria-selected') === 'false', '2 it opens on Photo, with Video one tap away');
ok(await stage.locator('[data-rec-snap]').count() === 1, '2 the shutter is a snap button');
await stage.locator('[data-rec-snap]').click(); await page.waitForTimeout(900);
ok(await stage.count() === 1 && /1 photo saved/.test(await stage.locator('.rec-tally').innerText()), '2 a tap snaps a picture and the camera STAYS open — "1 photo saved"');
await stage.locator('[data-rec-snap]').click(); await page.waitForTimeout(900);
ok(/2 photos saved/.test(await stage.locator('.rec-tally').innerText()), '2 a second tap, a second picture — "2 photos saved"');
ok(/Done · 2 photos/.test(await stage.locator('[data-rec-done]').innerText()), '2 Done says how many');
await stage.locator('[data-rec-done]').click(); await page.waitForTimeout(700);
ok(await page.locator('.rec-stage').count() === 0, '2 Done closes the camera');
let at = await attach(page, id);
ok(at.length === 2 && at.every(a => a.kind === 'photo' && a.target === 'w03' && a.mime === 'image/jpeg'), '2 both pictures are kept under the Sealer, as JPEGs', JSON.stringify(at));
const pb = await blobInfo(page, at[0].key);
ok(pb && pb.size > 1000 && /jpeg/.test(pb.type), '2 a real picture was stored (a JPEG of the live frame)', JSON.stringify(pb));
ok(await sheet.locator('li[data-kind=photo]').count() === 2, '2 and the sheet lists them');

/* ---- 3 · live video, and the switch */
await sheet.locator('[data-attach-film]').click(); await page.waitForTimeout(1200);
ok(await page.locator('.rec-stage [data-rec-mode=video]').getAttribute('aria-selected') === 'true' && await page.locator('.rec-stage [data-rec-start]').count() === 1, '3 Film a clip opens the camera on Video, with a record button');
await page.locator('.rec-stage [data-rec-mode=photo]').click(); await page.waitForTimeout(300);
ok(await page.locator('.rec-stage [data-rec-snap]').count() === 1, '3 the switch moves to Photo without closing the camera');
await page.locator('.rec-stage [data-rec-mode=video]').click(); await page.waitForTimeout(300);
await page.locator('.rec-stage [data-rec-start]').click(); await page.waitForTimeout(2300);
ok(/REC 0:0[1-9]/.test(await page.locator('.rec-badge').innerText()), '3 recording: the REC timer is running', await page.locator('.rec-badge').innerText().catch(() => ''));
ok(await page.locator('.rec-stage [data-rec-mode]').count() === 0, '3 the switch rests while recording');
await page.locator('.rec-stage [data-rec-stop]').click(); await page.waitForTimeout(2500);
ok(/1 clip saved/.test(await page.locator('.rec-tally').innerText()), '3 stopped: "1 clip saved", the camera still open for the next');

/* ---- 4 · a photo and a clip together */
await page.locator('.rec-stage [data-rec-mode=photo]').click(); await page.waitForTimeout(300);
await page.locator('.rec-stage [data-rec-snap]').click(); await page.waitForTimeout(900);
ok(/Done · 1 photo · 1 clip/.test(await page.locator('[data-rec-done]').innerText()), '4 the camera counts this visit’s: Done · 1 photo · 1 clip', await page.locator('[data-rec-done]').innerText());
await page.locator('[data-rec-done]').click(); await page.waitForTimeout(900);
at = await attach(page, id);
ok(at.length === 4 && at.filter(a => a.kind === 'video').length === 1 && at.every(a => a.target === 'w03'), '4 three pictures and a clip, all under the Sealer', JSON.stringify(at));
const vb = await blobInfo(page, at.find(a => a.kind === 'video').key);
ok(vb && vb.size > 500 && /^video\//.test(vb.type), '4 a real clip was stored', JSON.stringify(vb));
ok(await page.waitForFunction(() => { const i = document.querySelector('[data-attach][data-kind=video] .ev-thumb img'); return !!i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).then(() => true).catch(() => false), '4 the clip is SEEN on the sheet — a first frame drawn');
await page.keyboard.press('Escape'); await settle(page);
await page.reload(); await settle(page, 1500);
ok((await attach(page, id)).length === 4 && /4/.test(await page.locator('.calc-tile[data-tile="2"] [data-attach-open]').innerText()), '4 kept after a reload, the Sealer’s tile counting 4');

/* ---- 5 · camera but no microphone */
const ctx2 = await mk({ width: 1360, height: 900 });
await ctx2.addInitScript(() => {
  const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = c => (c && c.audio ? Promise.reject(new DOMException('no microphone', 'NotAllowedError')) : real(c));
});
const o2 = await open(ctx2);
await o2.page.locator('.calc-tile[data-tile="0"] [data-attach-open]').click(); await settle(o2.page);
await o2.page.locator('[data-attach-photo]').click(); await o2.page.waitForTimeout(1200);
ok(await o2.page.locator('.rec-error').count() === 0 && await o2.page.locator('.rec-preview').evaluate(v => v.videoWidth > 0), '5 the microphone refused: the camera still opens');
await o2.page.locator('[data-rec-snap]').click(); await o2.page.waitForTimeout(900);
await o2.page.locator('[data-rec-done]').click(); await o2.page.waitForTimeout(700);
ok((await attach(o2.page, o2.id)).length === 1, '5 …and a picture is taken');
await ctx2.close();

/* ---- 6 · a phone with no live camera */
const ctx3 = await mk({ width: 1360, height: 900 });
await ctx3.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); });
const o3 = await open(ctx3);
await o3.page.locator('.calc-tile[data-tile="0"] [data-attach-open]').click(); await settle(o3.page);
ok(await o3.page.locator('[data-attach-film]').count() === 0 && await o3.page.locator('[data-attach-photo]').count() === 1, '6 with no live camera: no Film a clip, Take a photo still there');
const chooser = o3.page.waitForEvent('filechooser', { timeout: 8000 }).then(() => true).catch(() => false);
await o3.page.locator('[data-attach-photo]').click();
ok(await chooser && await o3.page.locator('.rec-stage').count() === 0, '6 …and it goes to the phone’s own camera (its file chooser), not a broken screen');
await ctx3.close();

/* ---- 7 · the phone */
const ph = await mk({ width: 390, height: 800 }, { hasTouch: true, isMobile: true });
const o4 = await open(ph);
await o4.page.locator('.calc-tile[data-tile="1"] [data-attach-open]').click(); await settle(o4.page);
await o4.page.locator('[data-attach-photo]').click(); await o4.page.waitForTimeout(1200);
const hs = await o4.page.locator('.rec-mode, .rec-btn, [data-rec-done]').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(hs.length >= 4 && hs.every(h => h >= 44), '7 the switch, the shutter and Done a thumb’s height', hs.join(','));
const fill = await o4.page.locator('.rec-preview').evaluate(v => { const r = v.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
ok(fill.w >= 388 && fill.h >= 400, '7 the live picture fills the screen', JSON.stringify(fill));
ok(await o4.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, '7 nothing off the side');
await ph.close();

ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nThe live camera accepted: a picture and a clip taken live on a workstation, the camera staying open, saved under it, the fallbacks and the phone fit');
process.exit(fail ? 1 : 0);
