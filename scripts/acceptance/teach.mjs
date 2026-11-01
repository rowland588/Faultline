/* ACCEPTANCE — THE DOCUMENTS THAT TEACH (knowledge/specs/FC-225-sop.md, FC-223-job-instruction.md, FC-224-one-point-lesson.md; 1 November 2026).
 * doc-shape.mjs walks every definition through the shared page; this proves what is these three's own, on the page and on the paper:
 *   SOP     photos matched to steps by the number a caption starts with — added, captioned “1 — …”, “3 — …” and a caption with no number: the
 *           tile and the sentence say 2 of 8, the check names the unnumbered photo and the steps without one; the caption put right: 3 of 8;
 *           kept after a reload; the paper says it
 *   JI      the film splice read as cases-teach.py J1 says (9 trained, 6 signed off, 2.3 days, 5 re-checks, 54 h × £14.70 = £793.80); a learner
 *           marked Signed off with no day: 7 of 9, and the page says the day is missing; the paper carries the breakdown and who was taught
 *   OPL     the film-guide lesson by shift (Days 6 of 6, Nights 5 of 6 = 11 of 12, 92%); a right and a wrong photo added: the pictures counted
 *           and “no picture” gone; the last person given a day: 12 of 12 (100%); the paper carries the grid
 *   MEETING the tier 1 meeting read as the example says (5 letters, Delivery 3,535 against at least 3,648 not met, the cost letter £250 over, the
 *           escalation waiting 2 days); the two Delivery actions taken out: a red with no answer, Undo brings them back; the escalation answered:
 *           no longer waiting; the paper; the phone
 *   the phone, 390 px: nothing off the side
 *   node scripts/acceptance/teach.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'teach-'));
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => String(s ?? '').replace(/\s+/g, '').replace(/[’‘]/g, "'");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];
let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${String(extra).slice(0, 500)}` : ''}`); if (!c) failed++; };
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const tilesOf = async () => Object.fromEntries(await page.locator('.doc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const pdf = async name => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, name); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};
const picture = (w, h, colour) => page.evaluate(async ([w, h, colour]) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.fillStyle = colour; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(8, 8, w / 2, h / 3);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return [...new Uint8Array(await blob.arrayBuffer())];
}, [w, h, colour]);
const file = async (name, colour) => ({ name, mimeType: 'image/png', buffer: Buffer.from(await picture(150, 100, colour)) });

await go('#/room');
/** A record of a definition holding an example's boxes — made through the app's own functions, then opened. */
async function made(key, exampleIndex, name) {
  const id = await page.evaluate(async ([key, i, name]) => {
    const R = await import('/src/tools/doc/registry.ts'), D = await import('/src/tools/doc/doc.ts'), db = await import('/src/db.ts');
    const def = R.docByKey(key);
    const s = D.newDocStudy(def, { name, now: Date.now() });
    await db.putStudy({ ...s, facts: { ...s.facts, docValues: def.examples[i].values } });
    return s.id;
  }, [key, exampleIndex, name]);
  await go(`#/doc/${key}/${id}`);
  return id;
}
const checks = async () => (await words('[data-doc=checks]')) ?? '';

/* ---- SOP ---- */
await made('sop', 0, 'Acceptance changeover');
let t = await tilesOf();
ok(t['With a photo'] === '0 of 8' && t.Steps === '8' && t.Time === '5 min 50 s', 'SOP a the eight steps read: 0 of 8 with a photo, 5 min 50 s', JSON.stringify(t));
await page.locator('[data-photo-input="stepPhotos"]').setInputFiles([await file('a.png', '#0c7489'), await file('b.png', '#b45309'), await file('c.png', '#15803d')]);
await page.waitForTimeout(1200);
ok((await page.locator('[data-photos="stepPhotos"] [data-photo]').count()) === 3, 'SOP b three photos added');
const caps = ['1 — isolate', '3 — tube seated', 'the panel'];
for (const [i, c] of caps.entries()) { await page.locator('[data-photos="stepPhotos"] [data-photo] .doc-cap').nth(i).fill(c); await page.waitForTimeout(500); }
await page.waitForTimeout(800);
t = await tilesOf();
ok(t['With a photo'] === '2 of 8', 'SOP b captions “1 — …” and “3 — …” match steps 1 and 3; “the panel” matches none: 2 of 8', JSON.stringify(t));
ok(/^Changeover to the 500 g pack: 8 steps, 2 with a photo, 4 steps to take care over/.test((await words('[data-doc=sentence]')) ?? ''), 'SOP b …and the sentence says it', await words('[data-doc=sentence]'));
const c1 = await checks();
ok(/1 photo has no step number/.test(c1) && /Steps 2 and 4 to 8 have no photo/.test(c1) && /Steps 5 and 7 need care and have no photo/.test(c1), 'SOP b the checks name the unnumbered photo, the steps without one and the care steps still to show', c1);
await page.locator('[data-photos="stepPhotos"] [data-photo] .doc-cap').nth(2).fill('5. guide at 2 mm'); await page.waitForTimeout(1200);
t = await tilesOf();
ok(t['With a photo'] === '3 of 8' && !/no step number/.test(await checks()), 'SOP c the caption put right: 3 of 8, the unnumbered check gone', JSON.stringify(t));
await page.reload(); await page.locator('.nv-main').waitFor(); await page.waitForTimeout(1500);
ok((await tilesOf())['With a photo'] === '3 of 8', 'SOP c kept after a reload');
let T = nows(await pdf('sop.pdf'));
ok(T.includes(nows('3 of 8')) && T.includes(nows('5. guide at 2 mm')) && T.includes(nows('Changeover to the 500 g pack')), 'SOP d the paper says 3 of 8 with the captions');
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
let wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `SOP e the phone: nothing off the side (${wide}px over)`);
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- the job breakdown ---- */
await made('job-instruction', 0, 'Acceptance film splice');
t = await tilesOf();
ok(t.Steps === '6' && t['Key points'] === '9' && t.Trained === '9' && t['Signed off'] === '6 of 9' && t['Days to sign off'] === '2.3' && t['Re-checks'] === '5', 'JI a the splice reads as cases-teach.py J1 says', JSON.stringify(t));
ok(flat((await words('[data-doc=money]')) ?? '').includes('54 paid hours × £14.70 = £793.80'), 'JI a 9 × (14 − 8) = 54 h × £14.70 = £793.80', await words('[data-doc=money]'));
ok(/^Splice the film reel: 6 steps, 9 key points \(2 steps with a safety point\); 9 trained, 6 signed off \(67%\), 3 to try again\.$/.test((await words('[data-doc=sentence]')) ?? ''), 'JI a the sentence', await words('[data-doc=sentence]'));
await page.locator('[data-list="learners"] [data-row="6"] [data-cell="tryout"] [data-value="passed"]').click(); await page.waitForTimeout(1000);
t = await tilesOf();
ok(t['Signed off'] === '7 of 9' && /Gus is signed off with no day/.test(await checks()), 'JI b Gus marked Signed off with no day: 7 of 9, and the page says the day is the proof', `${JSON.stringify(t)} ${await checks()}`);
await page.locator('[data-list="learners"] [data-row="6"] [data-cell="signed"] input').fill('2026-10-30'); await page.waitForTimeout(1000);
ok(!/Gus is signed off with no day/.test(await checks()) && (await words('[data-doc=sentence]'))?.includes('7 signed off (78%), 2 to try again'), 'JI b …the day given, the check goes and the sentence moves to 78%', await words('[data-doc=sentence]'));
T = nows(await pdf('ji.pdf'));
ok(T.includes(nows('Both hands clear before the clamp')) && T.includes(nows('A crushed hand')) && T.includes(nows('Who has been taught')) && T.includes(nows('793.80')), 'JI c the paper carries the sheet, who has been taught and the money');
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `JI d the phone: nothing off the side (${wide}px over)`);
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- the one-point lesson ---- */
await made('one-point-lesson', 0, 'Acceptance film guide');
t = await tilesOf();
ok(t.Taught === '11 of 12' && t.Coverage === '92%' && t.Pictures === '0' && t['Offered to'] === '2', 'OPL a the lesson reads as cases-teach.py O1 says', JSON.stringify(t));
const rows = await page.locator('[data-doc-table="Who has been taught"] tbody tr').evaluateAll(rs => rs.map(r => [...r.children].map(c => c.textContent?.replace(/\s+/g, ' ').trim())));
ok(JSON.stringify(rows) === JSON.stringify([['Days', '6', '6', '100%'], ['Nights', '5', '6', '83%']]), 'OPL a by shift: Days 6 of 6, Nights 5 of 6', JSON.stringify(rows));
ok(/No picture yet/.test(await checks()), 'OPL a no picture is said', await checks());
await page.locator('[data-photo-input="rightPhotos"]').setInputFiles([await file('r.png', '#15803d')]); await page.waitForTimeout(1000);
await page.locator('[data-photo-input="wrongPhotos"]').setInputFiles([await file('w.png', '#c4281c')]); await page.waitForTimeout(1200);
t = await tilesOf();
ok(t.Pictures === '2' && !/No picture yet|shows the wrong way/.test(await checks()), 'OPL b a right and a wrong photo: 2 pictures, the check gone', `${JSON.stringify(t)} ${await checks()}`);
await page.locator('[data-list="people"] [data-row="11"] [data-cell="taught"] input').fill('2026-10-30'); await page.waitForTimeout(1000);
t = await tilesOf();
ok(t.Taught === '12 of 12' && t.Coverage === '100%' && /taught to 12 of 12 on 2 shifts \(100%\); offered to Line 1 and Line 7\.$/.test((await words('[data-doc=sentence]')) ?? ''), 'OPL c the last person taught: 12 of 12, 100%', `${JSON.stringify(t)} ${await words('[data-doc=sentence]')}`);
T = nows(await pdf('opl.pdf'));
ok(T.includes(nows('Who has been taught')) && T.includes(nows('Nights')) && T.includes(nows('Film guide set proud creases the splice')), 'OPL d the paper carries the lesson and the grid by shift');
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `OPL e the phone: nothing off the side (${wide}px over)`);

/* ---- the tiered meeting ---- */
await made('daily-meeting', 0, 'Acceptance tier 1');
t = await tilesOf();
ok(t['Letters read'] === '5 of 5' && t['Off target'] === '2' && t['Actions raised'] === '2' && t['Reds answered'] === '2 of 2' && t.Escalated === '1' && t['Closed since last'] === '2', 'M a the tier 1 meeting reads as the example says', JSON.stringify(t));
const lrows = await page.locator('[data-doc-table="Yesterday, by letter"] tbody tr').evaluateAll(rs => rs.map(r => [...r.children].map(c => c.textContent?.replace(/\s+/g, ' ').trim())));
ok(JSON.stringify(lrows[2]) === JSON.stringify(['Delivery', 'Off target', 'Made 3,535 of 3,840; the sealer jaw hour lost 180', '3,535', '≥ 3,648', 'not met']), 'M a Delivery: 3,535 against at least 3,648 is not met', JSON.stringify(lrows[2]));
ok(((await words('[data-doc=money]')) ?? '').includes('£250.00 over the £1,000.00 a day it may lose'), 'M a the cost letter in pounds: £250 over', await words('[data-doc=money]'));
ok(/has waited \d+ days? for an answer/.test(await checks()), 'M a the escalation unanswered since 30 October is said', await checks());
await page.locator('[data-list="actions"] [data-remove-row="0"]').click(); await page.waitForTimeout(700);
await page.locator('[data-list="actions"] [data-remove-row="0"]').click(); await page.waitForTimeout(900);
t = await tilesOf();
ok(t['Reds answered'] === '1 of 2' && /Delivery is off target with no action and no reason/.test(await checks()), 'M b the two Delivery actions taken out: Delivery is a red with no answer, Cost still answered by its reason', `${JSON.stringify(t)} ${await checks()}`);
await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(900);
t = await tilesOf();
ok(t['Reds answered'] === '2 of 2', 'M b …Undo brings back the last one taken out: Delivery is answered again', JSON.stringify(t));
await page.locator('[data-list="escalated"] [data-row="0"] [data-cell="answer"] [data-value="answered"]').click(); await page.waitForTimeout(500);
await page.locator('[data-list="escalated"] [data-row="0"] [data-cell="answeredOn"] input').fill('2026-10-30'); await page.waitForTimeout(1000);
ok(/1 escalated and answered\.$/.test((await words('[data-doc=sentence]')) ?? '') && !/has waited/.test(await checks()), 'M c the escalation answered the same day: no longer waiting, the check gone', `${await words('[data-doc=sentence]')} ${await checks()}`);
T = nows(await pdf('meeting.pdf'));
ok(T.includes(nows('Yesterday, by letter')) && (T.includes(nows('Find the sealer jaw')) || T.includes(nows('SMED on the film change'))) && T.includes(nows('Escalated')) && T.includes(nows('£250.00 over')), 'M d the paper carries the letters, the actions, what went up and the pounds');
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `M e the phone: nothing off the side (${wide}px over)`);

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
