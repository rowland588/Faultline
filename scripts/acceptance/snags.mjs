/* ACCEPTANCE — THE SNAGS PAGE AS A WORKING PAGE (docs/BUILD.md, Snags).
 *
 * Rowland, 12 October: "Snags need its own report on the snag page ... I
 * have moved some snags, it says moved to jobs — those snags I don't know
 * where they are ... the Snags page needs to be a working page, not just a
 * home for snags and transfers, as it may be the best place to organise all
 * snags rather than have them spread all over." The story, driven in a real
 * browser on the seeded line and job with the real controls:
 *
 *   1  every snag on the page, however it was taken — on the move, pinned on
 *      the walk — each saying where it came from; the sentence and the counts
 *      the module's (lib/snagsReport)
 *   2  ticked and moved to a job: it leaves its line's list and is shown
 *      under the job, saying what it became there and how it stands — and
 *      the door opens it in the job
 *   3  worked where it sits: its state, whose it is and the day it is due
 *      changed on the row, kept, and said back ("3 days late" in red)
 *   4  the counts are the filters: Late shows the late ones only; By who
 *      groups them by whose they are, nobody's last
 *   5  several at once: tick two, give them a name and a day, close them —
 *      with the undo offered
 *   6  the Snags report: what the page shows, on paper — every snag's words,
 *      the job a moved one went to
 *   7  on a phone: nothing off the side, every row's controls under it
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/snags.mjs      (SMOKE_BASE, as smoke) */
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
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async (sel, root = page) => ((await root.locator(sel).count()) ? (await root.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const row = what => page.locator('.qsl-row', { hasText: what }).first();

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
/* The seeded line and job (three snags pinned on the walk's Former roller),
   and four taken on the move — one late and Sam's, one in progress due in
   two days, one with a real picture, one named for the job. */
const sd = await page.evaluate(async () => {
  const seed = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
  const db = await import('/src/db.ts');
  const t = Date.now(), D = 86_400_000, day = n => new Date(new Date(t + n * D).setHours(0, 0, 0, 0)).getTime();
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240;
  const g = cv.getContext('2d'); g.fillStyle = '#c9d3df'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#3d4a5c'; g.fillRect(60, 80, 200, 90);
  const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
  const key = `acc-photo-${crypto.randomUUID()}`; await db.putBlob(key, blob);
  const mk = p => ({ id: crypto.randomUUID(), workspaceId: seed.wsId, status: 'open', raisedAt: t - 2 * D, updatedAt: t, media: [], ...p });
  const list = [
    mk({ problem: 'Guard on the infeed loose', targetAsset: 'Bagger', owner: 'Sam', dueAt: day(-3) }),
    mk({ problem: 'Film wandering on the former', status: 'in_progress', dueAt: day(2) }),
    mk({ problem: 'Seal jaw leaves marks', targetAsset: 'Bagger', media: [{ id: crypto.randomUUID(), kind: 'photo', blobKey: key, mime: 'image/jpeg', capturedAt: t }] }),
    mk({ problem: 'Label printer ribbon low', projectId: seed.projectId }),
  ];
  for (const s of list) await db.addSnag(s);
  return { ...seed, ids: Object.fromEntries(list.map(s => [s.problem, s.id])), job: (await (await import('/src/db/projects.ts')).getProject(seed.projectId)).name };
});
/* What the module says of the snags as they stand — read as the page reads them. */
const truth = () => page.evaluate(async () => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/snagsReport.ts'); const P = await import('/src/db/projects.ts');
  const [snags, ws, projects] = await Promise.all([db.listAllSnags(), db.listWorkspaces(), P.allProjects()]);
  const frames = new Map((await Promise.all([...new Set(snags.filter(s => s.assetId).map(s => s.workspaceId))].map(id => db.listSnagAssets(id)))).flat().map(a => [a.id, a]));
  const became = new Map();
  for (const pid of new Set(snags.flatMap(s => (s.sent ?? []).map(x => x.projectId)))) {
    const [tests, items, assets, todos] = await Promise.all([db.listTests(pid), db.listTestItems(pid), db.listAssets(pid), db.listPaceTodos(pid)]);
    for (const [k, v] of R.becameOn(pid, tests, items, assets, todos)) became.set(k, v);
  }
  const r = R.snagsReading({ snags, lineName: id => ws.find(w => w.id === id)?.name ?? 'A line', jobName: id => projects.find(p => p.id === id)?.name, became,
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined), stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined) });
  return { says: r.says, counts: r.counts, rows: r.lines.flatMap(l => l.rows), moved: r.moved, snags };
});

/* ---- 1 every snag, where it came from ---- */
await go('#/snags');
{
  const t = await truth();
  ok((await words('.qsl-says')) === t.says, `1 the sentence is the module's: ${t.says}`);
  const chips = (await page.locator('.qsl-f .chip').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(chips.join('|') === `All · ${t.counts.open + t.counts.in_progress + t.counts.closed + t.counts.moved}|Open · ${t.counts.open}|In progress · ${t.counts.in_progress}|Late · ${t.counts.late}|Closed · ${t.counts.closed}|Moved to jobs · ${t.counts.moved}`, `1 the counts: ${chips.join(' · ')}`);
  ok((await page.locator('.qsl-work').count()) === t.rows.length && t.rows.length === 7, `1 every snag on its line: ${t.rows.length} rows (4 on the move, 3 pinned on the walk)`);
  ok(/From the walk — on the Former roller/.test(await words('.qsl-meta', row('seeded snag 0'))) && /Taken on the move — Bagger/.test(await words('.qsl-meta', row('Guard on the infeed loose'))),
    '1 each says where it came from — on the walk, on the move');
  ok(/for Line 2 commissioning — not moved yet/.test(await words('.qsl-meta', row('Label printer ribbon low'))), '1 named for the job and not moved yet — said so');
  ok((await row('Seal jaw leaves marks').locator('.ev-thumb img, img').count()) > 0, '1 its picture on its row');
}

/* ---- 2 moved to a job, and followed there ---- */
{
  await row('Seal jaw leaves marks').locator('.qsl-tick input').check();
  await page.getByRole('button', { name: 'Move to a job' }).click(); await page.waitForTimeout(600);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  await sheet.locator('select').first().selectOption({ label: sd.job }); await page.waitForTimeout(800);
  await sheet.getByRole('button', { name: /^Move 1$/ }).click(); await page.waitForTimeout(1500);
  const t = await truth();
  const m = t.moved.find(g => g.job === sd.job)?.rows.find(r => r.what === 'Seal jaw leaves marks');
  ok(!!m && (await page.locator('.qsl-work', { hasText: 'Seal jaw leaves marks' }).count()) === 0, '2 moved: it leaves its line\'s list');
  const sec = page.locator('.qsl-moved', { hasText: `Moved to ${sd.job}` });
  const said = await words('.qsl-became', sec.locator('.qsl-row', { hasText: 'Seal jaw leaves marks' }));
  ok(!!m && said === `Now ${m.says} — open it there ›` && /^a fix — /.test(m.says), `2 under its job, what it became and how it stands: "${said}"`);
  await sec.locator('.qsl-row', { hasText: 'Seal jaw leaves marks' }).locator('.qsl-open').click(); await page.waitForTimeout(1500);
  ok(/Seal jaw leaves marks/.test(await page.locator('body').innerText()) && (await page.locator('.rd, .drawer, [role="dialog"]').count()) > 0, '2 the door opens it in the job');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
}

/* ---- 3 worked where it sits ---- */
await go('#/snags');
{
  const r = row('Film wandering on the former');
  await r.locator('select.qsl-st').selectOption('closed'); await page.waitForTimeout(800);
  let t = await truth();
  ok(t.snags.find(s => s.id === sd.ids['Film wandering on the former'])?.status === 'closed', '3 its state changed on the row, and kept');
  await row('Label printer ribbon low').locator('input.qsl-who').fill('Priya'); await row('Label printer ribbon low').locator('input.qsl-who').press('Enter'); await page.waitForTimeout(800);
  t = await truth();
  ok(t.snags.find(s => s.id === sd.ids['Label printer ribbon low'])?.owner === 'Priya', '3 whose it is, typed on the row, kept');
  const late = await words('.qsl-dueword', row('Guard on the infeed loose'));
  const cls = await row('Guard on the infeed loose').locator('.qsl-dueword').getAttribute('class');
  ok(late === '3 days late' && /is-r/.test(cls ?? ''), `3 a day gone said in red: "${late}"`);
}

/* ---- 4 the counts are the filters; by who ---- */
{
  await page.locator('.qsl-f .chip', { hasText: 'Late' }).click(); await page.waitForTimeout(400);
  const t = await truth();
  const shown = await page.locator('.qsl-work .qsl-what').allInnerTexts();
  ok(shown.length === t.rows.filter(r => r.late).length && shown.every(w => t.rows.find(r => r.what === w)?.late), `4 Late shows the late only: ${shown.join(', ')}`);
  await page.locator('.qsl-f .chip', { hasText: 'All' }).click(); await page.getByRole('button', { name: 'By who' }).click(); await page.waitForTimeout(400);
  const heads = (await page.locator('.qsl-gh h2').allInnerTexts()).filter(h => !/^Moved to/.test(h));
  const owners = [...new Set(t.rows.map(r => r.owner).filter(Boolean))];
  ok(heads.at(-1) === 'Nobody yet' && owners.every(o => heads.includes(o)), `4 by who, nobody's last: ${heads.join(' · ')}`);
  await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(300);
}

/* ---- 5 several at once ---- */
{
  for (const w of ['seeded snag 0', 'Label printer ribbon low']) await row(w).locator('.qsl-tick input').check();
  await page.getByRole('button', { name: 'Whose · due' }).click(); await page.waitForTimeout(500);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  await sheet.locator('input').first().fill('Alex');
  await sheet.getByRole('button', { name: /^Change 2$/ }).click(); await page.waitForTimeout(900);
  let t = await truth();
  const two = t.snags.filter(s => ['seeded snag 0', 'Label printer ribbon low'].includes(s.problem));
  ok(two.length === 2 && two.every(s => s.owner === 'Alex'), '5 two ticked, given a name together');
  for (const w of ['seeded snag 0', 'Label printer ribbon low']) await row(w).locator('.qsl-tick input').check();
  await page.locator('.qsl-bar').getByRole('button', { name: 'Close', exact: true }).click(); await page.waitForTimeout(900);
  t = await truth();
  const undo = /2 closed/.test(await page.locator('body').innerText());
  ok(t.snags.filter(s => ['seeded snag 0', 'Label printer ribbon low'].includes(s.problem)).every(s => s.status === 'closed') && undo, '5 closed together, the undo offered');
}

/* ---- 6 the Snags report ---- */
{
  const t = await truth();
  const dir = mkdtempSync(join(tmpdir(), 'snags-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Snags report' }).click()]);
  const file = join(dir, 'snags.pdf'); await dl.saveAs(file);
  const txt = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  const all = [...t.rows.map(r => r.what), ...t.moved.flatMap(g => g.rows.map(r => r.what))];
  const lost = all.filter(w => !txt.includes(w));
  ok(/SNAGS/.test(txt) && /Every snag/.test(txt) && !lost.length && txt.includes(sd.job), `6 the report: every snag's words (${all.length}) and the job a moved one went to${lost.length ? ` — lost: ${lost.join(', ')}` : ''}`);
  ok(txt.includes(t.says.replace(/\s+/g, ' ').slice(0, 40)), '6 the report says what the page says');
}

/* ---- 7 on a phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 }); await go('#/snags');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const r = row('Guard on the infeed loose');
  const [box, ctl] = [await r.locator('.qsl-open').boundingBox(), await r.locator('.qsl-ctl').boundingBox()];
  ok(wide <= 1 && !!box && !!ctl && ctl.y >= box.y + box.height - 2, `7 on a phone: nothing off the side (${wide}px), the controls under the snag`);
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nSnags NOT accepted: ${failed} failed` : '\nSnags accepted: every snag in one place, worked where it sits, followed to its job, on paper');
process.exit(failed ? 1 : 0);
