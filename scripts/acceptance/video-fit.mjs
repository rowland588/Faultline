/* ACCEPTANCE — FOOTAGE FIT FOR THE STUDY (docs/VIDEO-DESIGN.md: the first
 * capability, fit-for-purpose station timing).
 *
 * From an empty device, in a real browser, through the app's own New:
 *
 *   1  the study chosen from the words before anything is filmed, and how to
 *      film it — where the phone goes and never, how long from the cycle
 *      (lib/video/capture), the people; a study footage cannot measure yet
 *      said so, with the tool to use meanwhile
 *   2  footage whose camera shook for twelve of its thirty-two seconds (made
 *      in the page, src/dev/videoSynth, the shake written down before the
 *      first frame) uploaded: looked at as it comes in and said unfit to
 *      time, the check saying what it found; where the phone was said
 *   3  the study's page saying the same; read — the camera tracked on every
 *      frame; every event inside the shake flagged "the camera shook here",
 *      none outside it; when work starts and stops "Not measurable from
 *      footage", the interpretations still what they are; each end's ±
 *   4  the findings counting the flagged events and refusing to call a gap
 *      waiting; said "in the hand", the view refused too
 *   5  the paper: the assessment check by check, the flags, the ±
 *   6  the phone: nothing off the side
 *   and no console error anywhere. */
import pkg from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const flat = s => s.replace(/\s+/g, ' ');
const sheetTxt = async () => flat(await page.locator('.vid-new').innerText());
const dir = mkdtempSync(join(tmpdir(), 'video-fit-'));
const OUT = process.env.SHOTS;

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);

/* THE FOOTAGE: three stations working by a known schedule, the camera shaking ±4 px (of 640) from 8 s to 20 s */
const DUR = 32, SHAKE = { fromSec: 8, toSec: 20, px: 4 };
console.log('making the footage (it takes as long as it runs)…');
const made = await page.evaluate(async ({ dur, shake }) => {
  const { makeLineVideo } = await import('/src/dev/videoSynth.ts');
  const r = await makeLineVideo({ durationSec: dur, fps: 25, seed: 9, shake, stations: [
    { label: 'Workstation 1', firstSec: 1.5, workSec: 4, cycleSec: 8, jitterSec: 0.3 },
    { label: 'Workstation 2', firstSec: 2.5, workSec: 6, cycleSec: 8, jitterSec: 0.3 },
    { label: 'Workstation 3', firstSec: 3.5, workSec: 3, cycleSec: 8, jitterSec: 0.3 },
  ] });
  const buf = new Uint8Array(await r.blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { b64: btoa(s), truth: r.truth };
}, { dur: DUR, shake: SHAKE });
const file = join(dir, 'shaky.webm');
writeFileSync(file, Buffer.from(made.b64, 'base64'));

/* 1 — the study chosen, and how to film it, before anything is filmed */
await page.goto(`${BASE}/#/video`); await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'New video study' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What do you want to find out', { exact: true }).fill('Balance the packing line against takt');
await page.getByLabel('One cycle takes about', { exact: true }).fill('8'); await page.waitForTimeout(300);
const plan = flat(await page.locator('.vid-new .vfit-plan').innerText());
/* (10 cycles + 2) × 8 s = 96 s → rounded up to the half minute: 2 minutes */
ok(/^How to film it — side-on, raised, 2 minutes or more · Measured from footage today/.test(plan) && await page.locator('.vid-new .vfit-plan[open]').count() === 1,
  '1 before filming: how to film a line balance, open — side-on and raised, two minutes from an 8 s cycle', plan.slice(0, 300));
ok(/Where the phone goes Side-on, raised: Fixed beside the line, 2–2\.5 m up/.test(plan) && /Not for this: In the hand — the picture moves with the hand, so movement in it is not work/.test(plan)
  && /At least 2 minutes: 10 whole cycles of the slowest station at about 8 s each, and one either side/.test(plan)
  && /never names, and nobody is recognised/.test(plan) && /Interpreted — not measured Whether a gap is waiting/.test(plan),
  '1a where the phone goes and never, how long and why, the people, and what will only be interpreted', plan);
if (OUT) await page.locator('.vid-new').screenshot({ path: `${OUT}/vf-1-plan.png` });
await page.getByLabel('The study', { exact: true }).selectOption('changeover'); await page.waitForTimeout(300);
const plan2 = flat(await page.locator('.vid-new .vfit-plan').innerText());
ok(/Not measured from footage yet/.test(plan2) && /Film the whole changeover, from the last good piece before to the first good piece after/.test(plan2) && /Meanwhile SMED — each element lapped/.test(plan2),
  '1b a changeover: not measured from footage yet, filmed whole, SMED meanwhile', plan2.slice(0, 500));
await page.getByLabel('The study', { exact: true }).selectOption(''); await page.waitForTimeout(200);

/* 2 — the shaken footage, looked at as it comes in */
await page.getByLabel('The footage', { exact: true }).setInputFiles(file);
await page.locator('.vid-new [data-fit-headline]').waitFor({ timeout: 60000 }).catch(() => {});
const fit1 = await sheetTxt();
ok(/This footage cannot be timed for line balance: the camera — shook for \d+% of the time\. Checked on a stretch so far/.test(fit1) && /The camera Not fit — Shook for \d+% of the time over 10 s looked at as it came in \(0:08\.0–0:18\.0\)/.test(fit1),
  '2 looked at as it came in: the camera shook over the stretch looked at — unfit to time, said what was found', fit1.slice(0, 900));
ok(/Where the phone was Not known yet — Not said/.test(fit1) && /Movement of the camera is read as work/.test(fit1), '2a where the phone was not said yet; why a shaking camera cannot be timed', fit1.slice(0, 900));
await page.getByLabel('Where was the phone', { exact: true }).selectOption('side-raised'); await page.waitForTimeout(300);
ok(/Fine: what Faultline measures for it · where the phone was/.test(await sheetTxt()) && /Where the phone was\s*Fine — Side-on, raised/.test(await page.locator('.vid-new [data-check="view"][data-status="ok"]').textContent().catch(() => '')),
  '2b said side-on and raised — the view fine for it, folded with the other checks that are fine', await sheetTxt());
if (OUT) await page.locator('.vid-new').screenshot({ path: `${OUT}/vf-2-new-fit.png` });
await page.getByLabel('Its name', { exact: true }).fill('Packing — shaky camera');
await page.getByRole('button', { name: 'Start the study' }).click();
await page.locator('.vid-study').waitFor({ timeout: 15000 }).catch(() => {});
const sid = page.url().split('/video/')[1]?.split('?')[0];
const fitPanel = async () => flat(await page.locator('section.vid-fit').innerText());
ok(/cannot be timed for line balance: the camera — shook/.test(await fitPanel()) && await page.getByLabel('Where was the phone', { exact: true }).inputValue() === 'side-raised',
  '3 the study’s page says the same, and keeps where the phone was', (await fitPanel()).slice(0, 400));

/* 3 — read: the camera on every frame, the events flagged */
await page.getByLabel('How many stations are in view', { exact: true }).selectOption('3'); await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Read the footage' }).click();
await page.locator('.vid-study[data-state="review"]').waitFor({ timeout: 240000 }).catch(() => {});
const after = await fitPanel();
ok(/This footage cannot be timed for line balance: the camera — shook for \d+% of the time\./.test(after) && /The camera Not fit — Shook for \d+% of the time over every frame read/.test(after) && !/Checked on a stretch/.test(after),
  '3a read: the camera checked on every frame — shook, unfit to time', after.slice(0, 500));
if (OUT) await page.locator('section.vid-fit').screenshot({ path: `${OUT}/vf-3-fit.png` });
const rec = await page.evaluate(async id => {
  const s = await (await import('/src/db.ts')).getStudy(id);
  return { q: s.facts.video.quality, ev: s.facts.vevents.map(e => ({ start: e.start, end: e.end, flags: e.flags ?? [], pm: e.pm })) };
}, sid);
const spans = rec.q?.shakingSpans ?? [];
const inShake = e => e.start < SHAKE.toSec && e.end > SHAKE.fromSec;
const covered = spans.length && spans[0][0] <= SHAKE.fromSec + 1.01 && spans[spans.length - 1][1] >= SHAKE.toSec - 1.01 && spans.every(([a, z]) => a >= SHAKE.fromSec - 1.01 && z <= SHAKE.toSec + 1.01);
console.log(`MEASURED  shaking said over ${spans.map(([a, z]) => `${a}–${z} s`).join(', ')} (shaken ${SHAKE.fromSec}–${SHAKE.toSec} s); shook ${Math.round((rec.q?.shaking ?? 0) * 100)}% of the time; ${rec.ev.length} events, ${rec.ev.filter(e => e.flags.includes('shaking')).length} flagged`);
ok(covered, '3b the shake found where it was — from 8 s to 20 s, to within a second, and nowhere else', JSON.stringify(spans));
const wrong = rec.ev.filter(e => e.flags.includes('shaking') !== spans.some(([a, z]) => e.start < z && e.end > a));
ok(rec.ev.length > 0 && !wrong.length && rec.ev.some(e => e.flags.includes('shaking')) && rec.ev.filter(e => !inShake(e)).every(e => !e.flags.includes('shaking')),
  '3c every event inside the shake flagged, none outside it', JSON.stringify(wrong.slice(0, 4)));
ok(rec.ev.every(e => e.pm === 0.05), '3d each event’s ends known to ±0.05 s — half the reading’s tenth of a second', JSON.stringify(rec.ev.slice(0, 3)));
const flaggedRow = page.locator('.vid-ev [data-flags~="shaking"]').first();
ok(/the camera shook here — check it on the footage/.test(await flaggedRow.innerText().catch(() => '')) && /each end ±0\.05 s/.test(await page.locator('.vid-ev').first().innerText()),
  '3e on review: the flag beside the event, and each end’s ±');
if (OUT) await page.screenshot({ path: `${OUT}/vf-3-study.png`, fullPage: true });
ok(/Not measurable from footage When work starts and stops at each station\. Not from this footage — the camera: shook for \d+% of the time \(above\)\./.test(after) && /Interpreted — not measured What the work is/.test(after),
  '3f what may be claimed: when work starts and stops not measurable from this footage — what the work is still only an interpretation', after);

/* 4 — the findings, and the view said */
await page.getByRole('button', { name: 'Accept every one still to review' }).click(); await page.waitForTimeout(900);
const says = flat(await page.locator('.vid-findings').innerText());
const nFlag = rec.ev.filter(e => e.flags.length).length;
ok(new RegExp(`\\b\\d+ of the counted events fall where the camera shook, moved or the light jumped`).test(says) && /A gap with no movement is not said to be waiting/.test(says) && /Each end of a piece of work is known to ±0\.05 s/.test(says) && !/waiting \d/.test(says),
  `4 the findings: the flagged events counted (${nFlag} flagged), a gap never called waiting, the ± said`, says);
await page.getByLabel('Where was the phone', { exact: true }).selectOption('handheld'); await page.waitForTimeout(600);
ok(/This footage cannot be timed for line balance: where the phone was — in the hand\./.test(await fitPanel()), '4a said in the hand — refused for its view');
await page.getByLabel('Where was the phone', { exact: true }).selectOption('side-raised'); await page.waitForTimeout(400);

/* 5 — the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Report', exact: true }).click()]);
const pdfPath = join(dir, 'fit.pdf'); await dl.saveAs(pdfPath);
const pdf = flat(execFileSync('pdftotext', ['-raw', pdfPath, '-'], { encoding: 'utf8' }));
ok(/Is this footage fit for the study\?/.test(pdf) && /Fit for it Not fit to time/.test(pdf) && /The camera: NOT FIT — Shook for \d+% of the time over every frame read/.test(pdf) && /Not measurable from footage — When work starts and stops at each station/.test(pdf),
  '5 on paper: unfit to time, the camera’s check, what cannot be claimed', pdf.slice(0, 1500));
ok(/FLAGGED: the camera shook here/.test(pdf) && /each end ±0\.05 s/.test(pdf) && /No movement/.test(pdf), '5a on paper: the flagged events, each end’s ±, no movement — not waiting');

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
const wide = await page.evaluate(() => document.documentElement.scrollWidth);
if (OUT) await page.screenshot({ path: `${OUT}/vf-4-phone.png`, fullPage: true });
ok(wide <= 392, '6 on a phone: the study’s page, its fit and its plan, nothing off the side', `${wide}px`);
await page.goto(`${BASE}/#/video`); await page.waitForTimeout(800);
await page.getByRole('button', { name: 'New video study' }).first().click(); await page.waitForTimeout(500);
const wide2 = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.vid-new')].map(e => e.scrollWidth)));
ok(wide2 <= 392, '6a on a phone: New, with how to film it, nothing off the side', `${wide2}px`);

ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
