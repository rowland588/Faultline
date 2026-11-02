/* NOTES ON EVERY TOOL, AND ON ITS REPORTS (Rowland, 2 November: "ensure commentary is on every tool and is onto reports"): for each tool the
 * seeded data has a record of — its page carries the Notes box, a note written there is kept on the study (facts.remarks) with its time, and the
 * tool's own paper (lib/studiesPdf studyBlocks, the block list the single paper, the line report and the project report all pour) carries it,
 * under Notes (a reliability study's Commentary). Table-driven over the tools the seed holds; a tool the seed has no record of is said, never skipped silently.
 *   node scripts/acceptance/tool-notes.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 400)}` : ''}`); if (!c) fail++; };
const dir = mkdtempSync(join(tmpdir(), 'fl-toolnotes-'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
await page.goto(`${BASE}/#/room`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WANT = ['capability', 'reliability', 'losses', 'changeover', 'balance', 'map', 'sampling', 'chart', 'analysis', 'calc', 'scored', 'board', 'doc', 'log'];
const studies = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  const all = (await db.listAllStudies()).filter(s => !s.deletedAt);
  const seen = new Map();
  for (const s of all) if (!seen.has(s.tool)) seen.set(s.tool, { id: s.id, tool: s.tool, href: L.studyHref(s) });
  return [...seen.values()];
});
const tools = studies.map(s => s.tool);
console.log('seeded tools:', tools.join(' · '));
for (const t of WANT) if (!tools.includes(t)) console.log(`NOTE  no ${t} record in the seed — its page is covered by the capability and reliability scripts only`);
for (const st of studies.filter(x => WANT.includes(x.tool))) {
  const text = `Note on ${st.tool}: film tight on the left jaw`;
  await page.goto(`${BASE}/${st.href.startsWith('#') ? st.href : '#' + st.href}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800);
  const box = page.getByLabel('Add to the commentary');
  const there = await box.count();
  ok(there === 1, `${st.tool}: the page carries a Notes box`, st.href);
  if (!there) continue;
  await box.fill(text);
  await page.getByRole('button', { name: 'Add', exact: true }).last().click(); await page.waitForTimeout(500);
  const saved = await page.evaluate(async id => ((await (await import('/src/db.ts')).getStudy(id))?.facts.remarks ?? []).filter(r => !r.struck).map(r => r.text), st.id);
  ok(saved.includes(text), `${st.tool}: the note is kept on the study`, saved.join('|'));
  /* the paper made as the page's own button makes it (lib/studiesPdf saveStudiesPdf, a single study, the lean page), read back */
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.evaluate(async id => {
    const db = await import('/src/db.ts'); const P = await import('/src/lib/studiesPdf.ts');
    const s = await db.getStudy(id);
    await P.saveStudiesPdf({ title: s.name, printed: '1 Nov 2026', lean: true, items: [{ s, where: 'Line 7' }], standards: [], ctx: {} }, s.name);
  }, st.id)]);
  const f = join(dir, `${st.tool}.pdf`); await dl.saveAs(f);
  const onPaper = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, '').includes(text.replace(/\s+/g, ''));
  ok(onPaper, `${st.tool}: the note is on its paper`);
}
ok(errs.length === 0, 'no console error', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? '\nFAILED' : '\nALL PASSED');
process.exit(fail ? 1 : 0);
