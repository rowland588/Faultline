/* ACCEPTANCE — H1: WORK SAMPLING (docs/BUILD.md, H1; docs/TOOLKIT.md, tool 9).
 *
 * What people are doing across a shift, from one tap per person at random
 * moments — every share said with the margin it carries. The story, driven in
 * a real browser on the seeded job (Line 7's packing hall, Op 1 and Op 2
 * watched through the morning, one moment come a minute ago) with the real
 * controls:
 *
 *   1  a new study picks its line; the product's line standard offers its
 *      people; set up draws the shift's moments, in order
 *   2  the seeded study reads as the module says: the strip, and each
 *      person's shares with their margins
 *   3  the moment due asks — one tap per person, each stamped with the
 *      moment's own time, not the time it was answered; the strip moves
 *   4  a mistap struck counts for nothing, and the reading says so
 *   5  Make it better — a fix in the study's own figures, the study its
 *      evidence
 *   6  on a running line (the 6M job's Line 7): the line's card says the
 *      biggest share not the work; the fishbone offers each share a tenth or
 *      more on its bone, counted, and one accepted says where it came from;
 *      the 6M report's Evidence prints each person's shares with margins
 *   and a client reads it and changes nothing.
 *
 * Every sentence is checked against the module that makes it
 * (lib/ie/sampling, lib/studyLinks) on the same records. Fails on any
 * console error.
 *
 *   node scripts/acceptance/work-sampling.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const san = x => x.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/£/g, '').replace(/\s+/g, ' ');
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');

/* What the modules say of a study as it stands. */
const truth = id => page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts');
  const W = await import('/src/lib/ie/sampling.ts');
  const L = await import('/src/lib/studyLinks.ts');
  const s = await getStudy(id);
  if (!s) return null;
  const a = s.agreed?.sampling, taps = s.facts.taps ?? [];
  return {
    a, taps, uses: s.uses,
    readings: (a?.who ?? []).map(w => W.samplingReading({ activities: a.activities, marginPts: a.marginPts, taps }, w)),
    verdict: W.samplingSays(a, taps).verdict,
    n: W.tapsOf(taps).length,
    due: a ? W.dueRound(a.prompts, taps, a.who, Date.now()) : undefined,
    better: L.betterWords(s), worth: L.worthBetter(s),
  };
}, id);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const STUDY = `#/sampling/${sd.samplingId}`;

/* ---- 1 a new study: its line, its people, its moments ---- */
await go('#/sampling');
await page.getByRole('button', { name: 'New work sampling' }).first().click(); await page.waitForTimeout(500);
{
  const dlg = page.locator('[role="dialog"]').last();
  const lines = await dlg.locator('select option').allTextContents();
  const line = lines.find(x => /smoke test/.test(x));
  if (line) await dlg.locator('select').selectOption({ label: line });
  await page.waitForTimeout(400);
  await dlg.getByLabel(/What is it of/).fill('Night shift, packing hall');
  await dlg.getByLabel(/Which product/).fill('Maris Piper 2kg');
  await dlg.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  const id = page.url().split('sampling/')[1]?.split(/[?#]/)[0];
  const offered = await page.locator('.chip-row[aria-label="Who is watched"] .chip').allTextContents();
  ok(!!line && !!id && offered.includes('Op 1'), `1 a new study is on its line and its product's standard offers its people (${offered.join(', ')})`);
  await page.locator('.chip-row[aria-label="Who is watched"] .chip', { hasText: 'Op 1' }).first().click();
  await page.getByLabel('Add a person or role').fill('Team leader');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Start sampling' }).click(); await page.waitForTimeout(900);
  const t = id ? await truth(id) : null;
  const inOrder = !!t?.a && t.a.prompts.every((p, i, xs) => i === 0 || xs[i - 1] <= p) && t.a.prompts.every(p => p >= t.a.from && p <= t.a.to);
  ok(!!t?.a && t.a.prompts.length === 40 && inOrder && t.a.who.join(',') === 'Op 1,Team leader', `1 set up: ${t?.a?.prompts.length} moments in the shift, in order; watching ${t?.a?.who.join(', ')}`);
  ok((await words('.ln-band .ln-verdict')).includes(t?.verdict ?? '—'), `1 it says "${t?.verdict}"`);
}

/* ---- 2 the seeded study reads as the module says ---- */
await go(STUDY);
{
  const t = await truth(sd.samplingId);
  /* the lean page (slice 6): the verdict on the band, the taps a tile */
  const strip = await words('.ie-strip');
  const said = await words('.ie-says');
  ok((await words('.ln-band .ln-verdict')).includes(t.verdict) && new RegExp(`taps ${t.n}\\b`, 'i').test(strip), `2 the band and the tiles: ${t.verdict} · ${t.n} taps`);
  ok(t.readings.every(r => said.includes(r)), `2 each person's shares, with their margins: ${t.readings.join(' / ')}`);
  ok((await page.locator('.ws-bar').count()) >= 6, '2 the shares drawn as bars, each with its margin');
}

/* ---- 3 the moment due asks; one tap per person, at the moment's time ---- */
{
  const t = await truth(sd.samplingId);
  const round = await words('.ws-round');
  ok(!!t.due && round.includes(`Moment ${t.due.no} of ${t.a.prompts.length}`), `3 the moment due asks: Moment ${t.due?.no} of ${t.a.prompts.length}`);
  ok(/● Moment/.test(await page.title()), '3 the tab says so, beyond the page');
  await page.locator('.ws-round .ws-person', { hasText: 'Op 1' }).getByRole('button', { name: 'working', exact: true }).click(); await page.waitForTimeout(500);
  await page.locator('.ws-round .ws-person', { hasText: 'Op 2' }).getByRole('button', { name: 'searching', exact: true }).click(); await page.waitForTimeout(900);
  const after = await truth(sd.samplingId);
  const at = after.taps.filter(x => x.at === t.due.at);
  ok(at.length === 2 && at.every(x => x.at === t.due.at) && after.n === t.n + 2, `3 two taps, stamped ${new Date(t.due.at).toTimeString().slice(0, 5)} — the moment, not when it was answered`);
  ok((await page.locator('.ws-round').count()) === 0 && new RegExp(`taps ${after.n}\\b`, 'i').test(await words('.ie-strip')), `3 the moment is answered; the tiles say ${after.n} taps`);
}

/* ---- 4 a mistap struck counts for nothing ---- */
{
  await page.locator('.ws-done-i', { hasText: 'Op 2 searching' }).getByRole('button', { name: /Strike/ }).click(); await page.waitForTimeout(900);
  const t = await truth(sd.samplingId);
  const struck = t.taps.filter(x => x.struck);
  const said = await words('.ie-says');
  ok(struck.length === 1 && struck[0].activity === 'searching' && t.readings.every(r => said.includes(r)), `4 struck, kept, counted for nothing: ${t.readings[1]}`);
}

/* ---- 5 Make it better: a fix in the study's own figures ---- */
{
  const t = await truth(sd.samplingId);
  const btn = page.getByRole('button', { name: /^Make it better/ });
  ok(t.worth && (await btn.count()) === 1, '5 Make it better is offered — a tenth or more of someone\'s time is not the work, from enough taps');
  if (await btn.count()) {
    await btn.click(); await page.waitForTimeout(1500);
    const after = await truth(sd.samplingId);
    const use = after.uses.find(u => u.kind === 'fix' && u.role === 'evidence');
    const fix = use && await page.evaluate(async ([pid, ref]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === ref), [sd.projectId, use.ref]);
    ok(!!fix && fix.title === t.better && fix.passesIf === t.better, `5 the fix says "${fix?.title}"`);
    ok(/fixes\?open=/.test(page.url()), '5 and it opens');
  }
}

/* ---- 6 on a running line: the line's card, the fishbone, the 6M report ----
   The same morning's taps, sampled on the 6M job's Line 7 as a person would
   start it there: the card says its biggest share not the work; the
   fishbone offers each share a tenth or more on its bone, counted; one
   accepted says "Work sampling" where it came from; and the 6M report's
   Evidence prints each person's shares with their margins. */
{
  const lineSid = await page.evaluate(async ([from, ws, pid]) => {
    const db = await import('/src/db.ts'); const s = await db.getStudy(from); const id = crypto.randomUUID(); const t = Date.now();
    await db.putStudy({ ...s, id, name: 'Line 7 packers, this morning', workspaceId: ws, projectId: pid, standardId: undefined, uses: [], createdAt: t, updatedAt: t });
    return id;
  }, [sd.samplingId, sd.line7WsId, sd.pacedProjectId]);
  const want = await page.evaluate(async ([sid, pid, cid]) => {
    const db = await import('/src/db.ts'); const W = await import('/src/lib/ie/sampling.ts');
    const { loadProblems } = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const s = await db.getStudy(sid); const a = s.agreed.sampling, taps = s.facts.taps ?? [];
    const loaded = await loadProblems(pid); const c = loaded.cases.find(x => x.id === cid);
    return { card: W.samplingCardLine(a, taps), rows: W.samplingRows(a, taps),
      offers: F.suggestionsFor(c, loaded.data, Date.now()).filter(x => x.source.kind === 'study' && x.source.tool === 'sampling').map(x => ({ text: x.text, m: x.m, grade: x.grade, ref: x.source.ref })) };
  }, [lineSid, sd.pacedProjectId, sd.oldCaseId]);
  await go(`#/project/${sd.pacedProjectId}?view=lines`);
  ok((await words('.lc-sample .lc-bal-t')) === want.card, `6 the line's card: "${await words('.lc-sample .lc-bal-t')}"`);
  await go(`#/project/${sd.pacedProjectId}/fishbone?problem=${sd.oldCaseId}`);
  const offered = await Promise.all(want.offers.map(async w => (await page.locator('button.is-sugg', { hasText: w.text }).count()) > 0));
  ok(want.offers.length >= 1 && want.offers.every(w => w.ref.startsWith(`${lineSid}#`) && w.grade === 'counted' && (w.m === 'method' || w.m === 'people')) && offered.every(Boolean),
    `6 the fishbone offers each share a tenth or more, counted: ${want.offers.map(w => `${w.text} (${w.m})`).join('; ')}`);
  if (want.offers[0]) {
    await page.locator('button.is-sugg', { hasText: want.offers[0].text }).first().click(); await page.waitForTimeout(600);
    const sheet = (await page.locator('[role="dialog"]').last().textContent()) ?? '';
    await page.getByRole('button', { name: 'Add to the fishbone' }).last().click(); await page.waitForTimeout(1000);
    const c = await page.evaluate(async ([cid, txt]) => ((await (await import('/src/db.ts')).getCase(cid))?.causes ?? []).find(x => x.text === txt), [sd.oldCaseId, want.offers[0].text]);
    ok(/Work sampling: Line 7 packers, this morning/.test(sheet) && c?.source?.tool === 'sampling' && c.m === want.offers[0].m && c.grade === 'counted', `6 accepted: on ${c?.m}, counted, "Work sampling" where it came from`);
  }
  await go(`#/pace-report?project=${sd.pacedProjectId}`);
  /* the full report: the one-page status is the one offered first */
  await page.getByRole('button', { name: 'Full report', exact: true }).click(); await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  const pdf = join(mkdtempSync(join(tmpdir(), 'sampling-')), 'sixm.pdf'); await dl.saveAs(pdf);
  const txt = san(execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '));
  const flatTxt = txt.replace(/\s+/g, '');
  const has = x => flatTxt.includes(san(x).replace(/\s+/g, '').slice(0, 60));
  const r = want.rows;
  const lost = [r.head, 'PERSON', 'TAPS', ...r.rows.flatMap(x => [x.who, ...(x.early ? [x.early] : x.cells.filter(c => c.share !== '—').map(c => `${c.share} ${c.margin}`))])].filter(x => !has(x));
  ok(!lost.length, `6 the 6M report's Evidence: each person's shares with their margins — "${r.head}"${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
}

/* ---- a client reads it and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(STUDY);
{
  const doors = await page.getByRole('button', { name: /^Make it better|Change what was agreed|^Close — keep|^Strike$|^working$|^waiting$/ }).count();
  ok((await page.locator('.ie-says').count()) === 1 && doors === 0, `a client reads the shares and changes nothing${doors ? ` — found ${doors} controls` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nH1 accepted: work sampling holds, from the moment to the fix, on the fishbone and on paper');
process.exit(failed ? 1 : 0);
