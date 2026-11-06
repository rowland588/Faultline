/* PICTURES, VIDEOS AND LINKS ON EACH WORKSTATION (docs/ATTACHMENTS.md; knowledge/specs/FC-241-workstation-media.md — Rowland, 6 November: "add ability to
 * put pictures and videos to any work station ... ensure they are on the report, if video create URL links ... make videos visual on the app"):
 *   1  every workstation tile offers Add; one tapped opens that workstation's sheet — Take a photo, Photos or videos, A link
 *   2  a photo added from the device (the picker answered by the script): shown, captioned, kept on the record under the workstation (facts.attach, target w03)
 *   3  a link: a bare address given its https://, kept with its name, opening in a new tab; a word that is not an address refused in words
 *   4  a clip kept on the record with no small picture (as one saved before posters) is SEEN — its first frame drawn and a solid play arrow, not a faint line box
 *   5  the tile says what it holds; the same after a reload; another workstation's tile unchanged
 *   6  the paper downloaded and read back: Pictures, videos and links; the workstation's name; the photo's caption; the video as a LINK that opens it here
 *      (a real link in the PDF), the web link's address (a real link), the pictures drawn (a photo and the clip's first frame)
 *   7  that link opened: the study's page with ?media= opens the clip in the viewer at once
 *   8  one taken off with Undo; the tile following
 *   9  the phone — the tile's button and the sheet's buttons a thumb's height, nothing off the side
 *  and no console error. */
import pkg from 'playwright';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => s.replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'ws-media-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 400) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
const study = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const { id, lineId, videoId } = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const t = Date.now(), id = crypto.randomUUID();
  await db.putStudy({ id, tool: 'calc', name: 'Stops — packing hall', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {},
    agreed: { calc: { key: 'workstation-stops', inputs: { n: 4, unit: 'kg', same: 'same', per: 'min', rate: 12, watched: 120, unitCost: 2.1,
      w01_name: 'Filler', w01_min: 8.5, w01_stops: 3, w02_name: 'Wrapper', w03_name: 'Sealer', w03_min: 22, w03_stops: 2, w04_name: 'Packer', w04_min: 5.25, w04_stops: 1 } } } });
  /* a clip as one saved before posters were made: a file and no small picture — made in the page, a few coloured frames */
  const blob = await new Promise(res => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d');
    const rec = new MediaRecorder(c.captureStream(15), { mimeType: 'video/webm' }); const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data); rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' }));
    rec.start(); let i = 0;
    const tm = setInterval(() => { g.fillStyle = `hsl(${i * 24},70%,45%)`; g.fillRect(0, 0, 320, 180); g.fillStyle = '#fff'; g.font = '40px sans-serif'; g.fillText('JAM', 100, 100); if (++i > 14) { clearInterval(tm); rec.stop(); } }, 80);
  });
  const key = 'blob-test-clip';
  await db.putBlob(key, blob);
  const videoId = 'clip-1';
  await db.patchStudy(id, cur => ({ facts: { ...cur.facts, attach: [{ id: videoId, kind: 'video', target: 'w03', blobKey: key, mime: 'video/webm', caption: 'The seal jamming', at: t }] } }));
  return { id, lineId: ws.id, videoId };
});
await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await settle(1800);

/* 1 — every tile offers Add */
const btns = page.locator('.calc-tile [data-attach-open]');
ok(await btns.count() === 4, '1 every workstation tile has its button for pictures, videos and links', String(await btns.count()));
await page.locator('.calc-tile[data-tile="2"] [data-attach-open]').click(); await settle(500);
const sheet = page.locator('[data-attach-sheet="w03"]');
ok(await sheet.count() === 1 && /Sealer — pictures, videos and links/.test(await page.locator('.msheet, .sheet').first().innerText().catch(() => '') + await sheet.innerText()), '1 the Sealer’s own sheet opens, named for it', await sheet.innerText().catch(() => ''));
ok(await sheet.locator('[data-attach-photo]').count() === 1 && await sheet.locator('[data-attach-files]').count() === 1 && await sheet.locator('[data-attach-link]').count() === 1, '1 Take a photo · Photos or videos · A link');

/* 4 — the clip kept without a small picture is SEEN */
const clip = sheet.locator('[data-attach="clip-1"] .ev-thumb');
ok(await clip.count() === 1, '4 the clip is listed on the Sealer');
ok(await page.waitForFunction(() => { const i = document.querySelector('[data-attach="clip-1"] .ev-thumb img'); return !!i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).then(() => true).catch(() => false), '4 its first frame is drawn (a picture of it, not an empty tile)');
const badge = await clip.locator('.ev-play-b').evaluate(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e), sv = e.querySelector('svg'), sc = sv ? getComputedStyle(sv) : null; return { w: Math.round(r.width), bg: cs.backgroundColor, fill: sc?.fill }; });
ok(badge.w >= 20 && badge.bg !== 'rgba(0, 0, 0, 0)' && badge.fill && badge.fill !== 'none', '4 the play arrow is a solid disc with a solid arrow, not a hair of a line', JSON.stringify(badge));

/* 2 — a photo from the device */
const jpeg = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#b33'; g.fillRect(0, 0, 800, 600); g.fillStyle = '#fff'; g.font = '60px sans-serif'; g.fillText('SEAL', 280, 320); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, undefined), 'base64');
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), sheet.locator('[data-attach-files]').click()]);
await chooser.setFiles({ name: 'seal.jpg', mimeType: 'image/jpeg', buffer: jpeg });
ok(await page.waitForFunction(() => document.querySelectorAll('[data-attach-sheet="w03"] [data-kind=photo]').length === 1, null, { timeout: 15000 }).then(() => true).catch(() => false), '2 the photo is on the Sealer');
const photoId = (await study(id)).facts.attach.find(a => a.kind === 'photo')?.id;
const cap = sheet.locator(`[data-attach="${photoId}"] input[aria-label="Caption"]`);
await cap.fill('Film trapped in the jaws'); await page.waitForTimeout(600);
const s1 = await study(id);
const ph = s1.facts.attach.find(a => a.id === photoId);
ok(ph?.target === 'w03' && ph.caption === 'Film trapped in the jaws' && !!ph.blobKey && !!ph.thumbKey, '2 kept on the record under the Sealer with its caption and a small picture', JSON.stringify(ph));

/* 3 — a link */
await sheet.locator('[data-attach-link]').click();
await page.locator('input[aria-label="Web address"]').fill('hello'); await page.locator('[data-attach-link-add]').click();
ok(/does not look like a web address/.test(await sheet.innerText()), '3 a word that is not an address is refused in words');
await page.locator('input[aria-label="Web address"]').fill(' www.youtube.com/watch?v=abc123 '); await page.locator('input[aria-label="Link name"]').fill('Film break on the sealer');
await page.locator('[data-attach-link-add]').click(); await page.waitForTimeout(500);
const lnk = (await study(id)).facts.attach.find(a => a.kind === 'link');
ok(lnk?.url === 'https://www.youtube.com/watch?v=abc123' && lnk.title === 'Film break on the sealer' && lnk.target === 'w03', '3 the link kept with https:// and its name, on the Sealer', JSON.stringify(lnk));
const a = sheet.locator('a.attach-url');
ok(await a.getAttribute('href') === 'https://www.youtube.com/watch?v=abc123' && await a.getAttribute('target') === '_blank' && /noopener/.test(await a.getAttribute('rel') ?? ''), '3 it opens in a new tab, safely');

/* 5 — the tile says what it holds; kept after a reload */
await page.keyboard.press('Escape'); await settle(500);
const tile3 = page.locator('.calc-tile[data-tile="2"] [data-attach-open]'), tile1 = page.locator('.calc-tile[data-tile="0"] [data-attach-open]');
ok(/3 /.test(await tile3.getAttribute('aria-label')) || /1 picture · 1 video · 1 link/.test(await tile3.getAttribute('aria-label')), '5 the Sealer’s tile says what it holds', await tile3.getAttribute('aria-label'));
ok(/add pictures, videos or a link/.test(await tile1.getAttribute('aria-label')), '5 the Filler’s tile is unchanged');
await page.reload(); await settle(1800);
ok(await page.locator('.calc-tile[data-tile="2"] [data-attach-open]').getAttribute('aria-label').then(t => /1 picture · 1 video · 1 link/.test(t)), '5 the same after a reload');

/* 6 — the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(dir, 'stops.pdf'); await dl.saveAs(pdf);
const txt = flat(execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }));
const raw = readFileSync(pdf).toString('latin1');
ok(/Pictures, videos and links/i.test(txt) && /Sealer/.test(txt), '6 the paper has Pictures, videos and links, under the Sealer', txt.slice(-600));
ok(/Film trapped in the jaws/.test(txt), '6 the photo’s caption is on it');
ok(/VIDEO/.test(txt) && /The seal jamming/.test(txt), '6 the video is named on it as a VIDEO');
const appLink = `/#/calc/workstation-stops/${id}?media=clip-1`;
ok(txt.replace(/ /g, '').includes(appLink.replace(/ /g, '')), '6 the video is printed as a link that opens it here', txt.slice(-500));
ok(raw.includes(`/URI (${BASE.replace(/\/$/, '')}${appLink})`) || raw.includes(encodeURI(appLink)) || /\/URI \([^)]*media=clip-1\)/.test(raw), '6 and it is a real link in the PDF');
ok(/\/URI \(https:\/\/www\.youtube\.com\/watch\?v=abc123\)/.test(raw) && /Film break on the sealer/.test(txt), '6 the web link is printed and is a real link in the PDF');
ok((raw.match(/\/Subtype \/Image/g) ?? []).length >= 2, '6 the photo and the clip’s first frame are drawn on it', String((raw.match(/\/Subtype \/Image/g) ?? []).length));

/* 7 — the link from paper opens the clip */
await page.goto(`${BASE}/#/calc/workstation-stops/${id}?media=clip-1`); await settle(1800);
ok(await page.locator('.ev-viewer video').count() === 1, '7 the paper’s link opens the clip in the viewer at once');
await page.keyboard.press('Escape'); await settle(500);
ok(await page.locator('.ev-viewer').count() === 0, '7 Escape leaves nothing open over the page');

/* 8 — taken off, with Undo */
await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await settle(1500);
await page.locator('.calc-tile[data-tile="2"] [data-attach-open]').click(); await settle(500);
await page.locator('[data-attach-sheet="w03"] [data-attach="' + lnk.id + '"] [data-attach-remove]').click(); await page.waitForTimeout(500);
ok((await study(id)).facts.attach.find(a => a.id === lnk.id)?.struck === true && await page.locator('[data-attach="' + lnk.id + '"]').count() === 0, '8 the link taken off, kept and struck');
await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(500);
ok(!(await study(id)).facts.attach.find(a => a.id === lnk.id)?.struck && await page.locator('[data-attach="' + lnk.id + '"]').count() === 1, '8 Undo brings it back');
await page.keyboard.press('Escape'); await settle(300);

/* 9 — the phone */
const ph2 = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
await ph2.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ph2.route('**://*.supabase.co/**', r => r.abort());
const p2 = await ph2.newPage();
p2.on('pageerror', e => errs.push(e.message));
await p2.goto(`${BASE}/#/room`); await p2.waitForTimeout(2000);
await p2.evaluate(async ({ s }) => { const db = await import('/src/db.ts'); await db.putStudy(s); }, { s: await study(id) });
await p2.goto(`${BASE}/#/calc/workstation-stops/${id}`); await p2.waitForTimeout(2000);
const tabAnswer = p2.locator('.calc-pane-t', { hasText: 'Figures' }); if (await tabAnswer.count()) await tabAnswer.first().click();
const h = await p2.locator('.calc-tile [data-attach-open]').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(h.length === 4 && h.every(x => x >= 43), '9 the tiles’ buttons a thumb’s height on the phone', h.join(','));
await p2.locator('.calc-tile[data-tile="2"] [data-attach-open]').click(); await p2.waitForTimeout(600);
const bh = await p2.locator('[data-attach-sheet="w03"] .attach-add .btn').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(bh.length === 3 && bh.every(x => x >= 43), '9 the sheet’s three buttons a thumb’s height', bh.join(','));
const wide = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '9 nothing off the side', String(wide));

ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nWorkstation pictures, videos and links accepted: kept on the workstation, seen (a poster and a solid play arrow), printed with the video as a link, the phone fits');
process.exit(fail ? 1 : 0);
