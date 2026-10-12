/* ACCEPTANCE — LINE CAPACITY (docs/BUILD.md, Line capacity; docs/CAPACITY.md).
 *
 * Rowland, 12 October: "the line balancing is actually a capacity model ...
 * understanding the V-curve ... my bottleneck could be people, it could be
 * an asset ... we go by plate speed ... of course, unless human." The story,
 * driven in a real browser on the seeded line standard (Line 7's Maris Piper
 * 2kg) with the real controls:
 *
 *   1  the views say what they are: Capacity, and the people's work against takt
 *   2  the V-curve reads as lib/capacity says — a point per station, the
 *      bottleneck filled and named, the sentence the module's
 *   3  the capacity sheet: a row per station, the bottleneck marked, a machine
 *      not on its plate speed said so
 *   4  the owner sets the V's margin; the guide is drawn and the sentence says
 *      what is under it — never assumed before
 *   5  a person timed in the time study: their standard time offered in the
 *      station's unit, used with one tap, said how it is known
 *   6  the bottleneck walked: Walk the line, each station tapped working ·
 *      starved · blocked · down, the verdict against the sums — on the walk
 *      and back on Line capacity
 *   and a client reads it and changes nothing.
 *
 * Every sentence is checked against the module that makes it (lib/capacity
 * analyse and vCurve, lib/ie/walk, lib/ie/balance). Fails on any console error.
 *
 *   node scripts/acceptance/line-capacity.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const SID = sd.lineStandardId;
const CAP = `#/w/${sd.wsId}/standards/${SID}?at=balance`;
/* What the modules say of the standard's capacity as it stands. */
const truth = () => page.evaluate(async id => {
  const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
  const st = await db.getStandard(id); const r = C.analyse(st.capacity); const v = C.vCurve(r, st.capacity.vMarginPct);
  return { n: r.ok.length, limit: r.limit?.station.name, says: v.sentence, under: v.under.map(p => p.name), margin: st.capacity.vMarginPct, stations: st.capacity.stations };
}, SID);

/* ---- 1 the views ---- */
await go(CAP);
await page.locator('.vc-says').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const tabs = (await page.locator('.lb-views .chip').allTextContents()).map(x => x.trim());
  ok(tabs.join('|') === 'Capacity|People — the work against takt', `1 the views: ${tabs.join(' · ')}`);
}
/* ---- 2 the V-curve ---- */
{
  const t = await truth();
  ok((await words('.vc-says')) === t.says, `2 the V says what the module says: ${t.says}`);
  ok((await page.locator('.vc-pt').count()) === t.n && (await page.locator('.vc-pt.is-limit').count()) === 1 && /BOTTLENECK/.test(await page.locator('.vc-neck').first().textContent() ?? ''), `2 a point per station (${t.n}), the bottleneck — ${t.limit} — filled and named`);
  ok(t.margin == null && (await page.locator('.vc-guide').count()) === 0, '2 no margin agreed: no guide V drawn');
}
/* ---- 3 the capacity sheet ---- */
{
  const t = await truth();
  ok((await page.locator('.cap-sheet tbody tr').count()) === t.n && /the bottleneck/.test(await words('.cap-sheet tr.is-limit')), '3 the capacity sheet: a row per station, the bottleneck marked');
  const notPlate = t.stations.filter(s => s.kind === 'machine' && s.source !== 'plate').map(s => s.name);
  const said = await Promise.all(notPlate.map(async n => /not its plate speed/.test(await words(`.cap-sheet tr:has-text("${n}")`))));
  ok(said.every(Boolean), `3 a machine not on its plate speed says so${notPlate.length ? ` (${notPlate.join(', ')})` : ''}`);
}
/* ---- 4 the owner sets the V's margin ---- */
{
  await page.getByRole('button', { name: 'Set the V’s margin' }).click(); await page.waitForTimeout(300);
  await page.getByLabel("The V's margin in percent").fill('10');
  await page.getByRole('button', { name: 'Agree it' }).click(); await page.waitForTimeout(900);
  const t = await truth();
  ok(t.margin === 10 && (await page.locator('.vc-guide').count()) === 1 && (await words('.vc-says')) === t.says, `4 the margin agreed at 10%: the guide drawn — ${t.says}`);
}
/* ---- 5 a person at their standard time ---- */
{
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const st = await db.getStandard(id);
    await db.putStandard({ ...st, capacity: { ...st.capacity, stations: st.capacity.stations.map(x => (x.kind === 'people' ? { ...x, name: 'Op 2', source: 'estimate' } : x)) } }); }, SID);
  await go(CAP);
  const want = await page.evaluate(async id => { const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts'); const B = await import('/src/lib/ie/balance.ts'); const C = await import('/src/lib/capacity.ts');
    const b = L.currentBalance(await db.listAllStudies(), id); const f = B.balance(b.facts.steps, b.agreed?.balance); const w = f.people.find(p => p.who === 'Op 2')?.work ?? 0;
    const x = C.analyse((await db.getStandard(id)).capacity).ok.find(s => s.station.name === 'Op 2'); return Math.round(w * (x?.factor ?? 1) * 100) / 100; }, SID);
  const offer = await words('.cap-sheet-use');
  ok(/^The time study: [\d.,]+ s a basket — use it$/.test(offer), `5 the time study offers Op 2's standard time in the station's unit: ${offer}`);
  if (offer) {
    await page.locator('.cap-sheet-use').first().click(); await page.waitForTimeout(900);
    const st = (await truth()).stations.find(s => s.name === 'Op 2');
    ok(st?.source === 'standard' && st.cycleSec === want && /standard time — the time study/.test(await words('.cap-sheet tr:has-text("Op 2")')), `5 used: 1 every ${want} s, "standard time — the time study"`);
  }
}
/* ---- 6 the bottleneck walked ---- */
{
  await page.getByRole('button', { name: 'Walk the line' }).click(); await page.waitForTimeout(1800);
  const id = page.url().split('sampling/')[1]?.split(/[?#]/)[0];
  ok(!!id && /bottleneck walk/i.test(await words('.ie-eyebrow')) && /Walk 1 of 12/.test(await words('.ws-round')), '6 Walk the line opens the walk: Walk 1 of 12, now');
  const names = (await page.locator('.ws-round .ws-person .ws-who').allTextContents()).map(x => x.trim());
  for (const [i, n] of names.entries()) {
    await page.locator('.ws-round .ws-person', { hasText: n }).getByRole('button', { name: i === names.length - 1 ? 'working' : 'blocked', exact: true }).click(); await page.waitForTimeout(350);
  }
  await page.evaluate(async ([id, names]) => { const db = await import('/src/db.ts'); const t = Date.now();
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, taps: [...(cur.facts.taps ?? []), ...[1, 2, 3, 4, 5].flatMap(k => names.map((who, j) => ({ id: `a${k}${j}`, at: t - k * 1_800_000, who, activity: j === names.length - 1 ? 'working' : k % 2 ? 'blocked' : 'working' })))] } }));
  }, [id, names]); await page.waitForTimeout(1200);
  const want = await page.evaluate(async ([id, sid]) => { const db = await import('/src/db.ts'); const W = await import('/src/lib/ie/walk.ts'); const C = await import('/src/lib/capacity.ts');
    const s = await db.getStudy(id); const r = C.analyse((await db.getStandard(sid)).capacity); return W.walkVerdict(s.agreed.sampling.who, s.facts.taps, r.limit?.station.name).sentence; }, [id, SID]);
  ok((await words('.ie-says')).includes(want), `6 the walk says where the arrows meet, against the sums: ${want}`);
  await go(CAP);
  ok((await words('.bw')).includes(want), '6 and Line capacity says it back, beside the sums');
}
/* ---- a client reads it and changes nothing ---- a line's own tool is its
   members' to change; on a job, a client of the job reads it. So the
   standard is put on the job first, as a person would attach it. */
await page.evaluate(async ([id, pid]) => { const db = await import('/src/db.ts'); const st = await db.getStandard(id); await db.putStandard({ ...st, projectId: pid }); }, [SID, sd.projectId]);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${sd.projectId}/standard/${SID}?at=balance`);
{
  const found = await page.getByRole('button', { name: /^Set the V’s margin|^Change the margin|^Walk the line|use it$|What if$/ }).allInnerTexts();
  const doors = found.length;
  ok((await page.locator('.vc-svg').count()) === 1 && doors === 0, `a client reads Line capacity and changes nothing${doors ? ` — found: ${found.join(', ')}` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nLine capacity accepted: the V, the sheet, the margin, the standard time and the walk hold');
process.exit(failed ? 1 : 0);
