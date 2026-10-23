/* ACCEPTANCE — THE AUDIT'S FIXES HOLD (docs/AUDIT.md).
 *
 * Rowland, 13 October: "run multiple audits to explore elements that are
 * missing, not functional properly ... on the line standard, when I click on
 * the PDF, I can't get out of it. There's no X mark ... I'm always asking for
 * reports, or cards ... quantification issues ... the capability page".
 * Driven in a real browser on the seed:
 *
 *   1  a way out of every sheet: on a phone, the line standard's PDF preview
 *      — taller than the screen — shows its × at the top, still there with the
 *      sheet scrolled to its foot, and the × closes it (bar 1)
 *   2  Escape closes the photo viewer, as it closes every sheet (bar 1)
 *   3  a capability study on paper: its PDF button on its page; the paper
 *      carries its sentence, Ppk and Cpk by name, and every reading (bars 3, 4)
 *   4  every study list on paper: each tool's list prints every study shown,
 *      its title on the paper (bar 3)
 *   5  the capability study's strip says Ppk and Cpk, the verdict on Ppk (bar 4)
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/audit.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper, more } from '../lib/pageHeader.mjs';
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const dir = mkdtempSync(join(tmpdir(), 'audit-'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const pdfText = async (click, name) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  const f = join(dir, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* 1 — a way out of every sheet */
{
  /* a short phone, so the preview is taller than the screen — the case that trapped */
  await page.setViewportSize({ width: 390, height: 380 });
  await page.goto(`${BASE}/#/w/${sd.wsId}/standards/${sd.lineStandardId}`); await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'PDF', exact: true }).first().click(); await page.waitForTimeout(1500);
  const sheet = page.locator('.sheet').last();
  const inView = async () => { const x = await sheet.locator('.sheet-x').boundingBox(); return !!x && x.y >= 0 && x.y + x.height <= 380; };
  const tall = await sheet.evaluate(el => el.scrollHeight > el.clientHeight);
  const top = await inView();
  await sheet.evaluate(el => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(300);
  const foot = await inView();
  await sheet.locator('.sheet-x').click(); await page.waitForTimeout(500);
  ok(tall && top && foot && (await page.locator('.sheet').count()) === 0, `1 the line standard's PDF on a phone, taller than the screen (${tall}): its × in view at the top and at the foot, and it closes`);
  await page.setViewportSize({ width: 390, height: 844 });
}

/* 2 — Escape closes the photo viewer */
{
  await page.goto(`${BASE}/#/snags`); await page.waitForTimeout(2500);
  const photo = page.getByRole('button', { name: /^Open the photo/ }).first();
  if (await photo.count()) {
    await photo.click(); await page.waitForTimeout(500);
    const open = await page.locator('.ev-viewer').count();
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(open === 1 && (await page.locator('.ev-viewer').count()) === 0, '2 the photo viewer opens, and Escape closes it');
  } else ok(false, '2 the seed shows a problem with a photo to open');
}

/* 3, 5 — a capability study: its strip, and on paper */
{
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/#/capability/${sd.studyId}`); await page.waitForTimeout(2500);
  const m = await page.evaluate(async id => {
    const s = (await (await import('/src/db.ts')).listAllStudies()).find(x => x.id === id);
    const S = await import('/src/lib/ie/sample.ts'); const L = await import('/src/lib/studyLinks.ts');
    const f = S.sample(s.agreed.readings, s.facts.readings);
    return { ppk: f.ppk.toFixed(2), cpk: f.cpk.toFixed(2), n: f.n, line: L.studyLine(s).text, values: s.facts.readings.slice(0, 3).map(r => r.value.toFixed(f.dp)) };
  }, sd.studyId);
  const strip = flat(await page.locator('.ie-strip').innerText());
  ok(new RegExp(`ppk ${m.ppk}\\b`, 'i').test(strip) && strip.includes(`Cpk ${m.cpk}`) && /Not capable: Ppk|Capable: Ppk|Just capable: Ppk/.test(flat(await page.locator('body').innerText())),
    `5 the strip says Ppk ${m.ppk} and Cpk ${m.cpk}; the verdict on Ppk`);
  const p = await pdfText(() => page.getByRole('button', { name: 'This study on paper (PDF)' }).click(), 'study.pdf');
  ok(p.text.includes('PPK') && p.text.includes(m.ppk) && p.text.includes('CPK') && p.text.includes(m.cpk) && m.values.every(v => p.text.includes(v)) && p.text.includes(flat(m.line).slice(0, 40)),
    `3 the study on paper: its sentence, Ppk ${m.ppk} and Cpk ${m.cpk}, and its readings (${p.pages} page${p.pages === 1 ? '' : 's'})`);
}

/* 4 — every study list on paper */
for (const [tool, hash, word] of [['capability', '#/capability', 'Capability'], ['map', '#/value-stream', 'Value stream'], ['changeover', '#/smed', 'SMED'], ['losses', '#/losses', 'Loss'], ['sampling', '#/sampling', 'Work sampling']]) {
  await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(2200);
  const titles = await page.evaluate(async tool => {
    const L = await import('/src/lib/studyLinks.ts'); const { san } = await import('/src/lib/reportKit.ts'); await (await import('/src/lib/savePdf.ts')).loadPdfLib();
    return (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === tool && !s.deletedAt).map(s => san(L.studyTitle(s)));
  }, tool);
  if (!titles.length) { ok(true, `4 ${word}: no studies seeded — nothing to print`); continue; }
  const p = await pdfText(() => paper(page, /every one shown/), `${tool}.pdf`);
  const missing = titles.filter(t => !p.text.replace(/\s/g, '').includes(t.replace(/\s/g, '').slice(0, 30)));
  ok(!missing.length, `4 ${word} list on paper: every study shown, ${titles.length} (${p.pages} page${p.pages === 1 ? '' : 's'})${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`);
}

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nThe audit's fixes NOT accepted: ${fail} failed` : '\nThe audit\'s fixes accepted: a way out of every sheet and viewer, every study on paper, Ppk and Cpk by name');
process.exit(fail ? 1 : 0);
