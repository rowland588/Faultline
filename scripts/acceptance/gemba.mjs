/* FC-199 — THE GEMBA WALK, AND HOW FRESH THE LOOKING IS (knowledge/specs/FC-199-gemba-walk.md; 31 October 2026).
 * Four lines are made on the device with looks of known age (a stop, a filmed clip, a problem raised, a board action
 * that is NOT a look): Gemba L1 looked at yesterday, L2 nine days ago, L3 sixteen, L4 never. Then:
 *
 *   1  the line's page says it as the spec's §6 words — L3 stale in red with its words, the machines (Cartoner never,
 *      Sealer 40 days, Wrapper 16), 0 of the last 14 days, 2 problems raised, 1 closed, 1 open, the oldest 16 days
 *      (the board action not counted); L2 fading in amber, L1 fresh and neutral, L4 nothing recorded; the four tiles
 *      still four; every sentence equal to tools/gemba/looking's
 *   2  the factory's card for each line says it in its short words
 *   3  a 6M project on L3, L1: its Needs you carries a note for L3 only and none for the fresh L1; its says (the late
 *      count) is the same with and without the note
 *   4  a Kata project's Gemba walk row says the stalest line and how many others are not fresh, and opens it; a Kaizen
 *      event's on a fresh line says so
 *   6  the line's one-page report and its combined report, downloaded and read back: the Last looked at fact, the
 *      sentence and what the looking found, as the page says them
 *   5  (run last, after 6) a stop timed on L3 moves its page without a reload — "looked at today"
 *   7  the phone: the line's page, the method page and the factory, nothing off the side
 *
 *   node scripts/acceptance/gemba.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: { } } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'gemba-'));
const readPdf = async (d, file) => { const f = join(dir, file); await d.saveAs(f); return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ms = 1800) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); };
await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- the lines, with looks of known age (the offsets sit hours past a whole day, so a slow run never crosses one) */
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const DAY = 86_400_000, H = 3_600_000, t = Date.now();
  const uid = () => crypto.randomUUID();
  const mk = async (name) => { const w = await db.createWorkspace(name); await db.updateWorkspace({ ...w, assets: ['Whole line', 'Sealer', 'Wrapper', 'Cartoner'] }); return w; };
  const snag = (w, ago, o = {}) => ({ id: uid(), workspaceId: w.id, problem: 'p', status: 'open', raisedAt: t - ago, updatedAt: t, media: [], ...o });
  const L1 = await mk('Gemba L1'), L2 = await mk('Gemba L2'), L3 = await mk('Gemba L3'), L4 = await mk('Gemba L4');
  const stop = (w, ago, asset) => db.addObservation({ id: uid(), workspaceId: w.id, category: 'Minor stop', asset, startedAt: t - ago, durationMs: 60_000, timing: 'typed', count: 1, media: [], createdAt: t - ago, updatedAt: t });
  await stop(L1, DAY + 3 * H, 'Sealer');
  await db.addSegment({ id: uid(), workspaceId: L2.id, sequence: 1, videoKey: 'k', createdAt: t - 9 * DAY - 5 * H });
  await db.addSnag(snag(L2, 12 * DAY, { targetAsset: 'Wrapper' }));
  await db.addSnag(snag(L3, 16 * DAY + H, { targetAsset: 'Wrapper' }));
  await db.addSnag(snag(L3, 20 * DAY, { status: 'closed', closedAt: t - 19 * DAY }));
  await db.addSnag(snag(L3, DAY, { media: undefined, targetCategory: 'Minor stop', caseId: 'c1' })); // a board action: raised at a desk, not a look
  await stop(L3, 40 * DAY, 'Sealer');
  /* one tool record on L3, so the combined report has something to put in (it makes nothing for a line with none) */
  await db.putStudy({ id: uid(), tool: 'capability', name: 'Seal temperature — jaw 2', workspaceId: L3.id, machine: 'Sealer',
    agreed: { readings: { kind: 'limits', unit: '°C', nominal: 180, lower: 170, upper: 190, count: 10 } },
    facts: { readings: [179, 181, 180, 182, 178, 180, 181, 179, 180, 182].map((value, i) => ({ id: uid(), value, at: t - (10 - i) * 60_000, who: 'K. Ahmed' })) },
    uses: [], startedAt: t - 11 * 60_000, createdAt: t, updatedAt: t });
  return { L1: L1.id, L2: L2.id, L3: L3.id, L4: L4.id };
});
const S = {
  L1: 'Gemba L1 looked at yesterday — a stop timed.',
  L2: 'Gemba L2 last looked at 9 days ago (a filmed walk) — fading, go and see.',
  L3: 'Gemba L3 not looked at for 16 days (a problem raised) — stale, go and see.',
  L4: 'Gemba L4: nothing recorded of anyone looking at it — stale, go and see.',
};
/* the module's own words for the same records, read on the page */
const modSays = await page.evaluate(async (ids) => {
  const db = await import('/src/db.ts'); const m = await import('/src/tools/gemba/looking.ts');
  const out = {};
  for (const [k, id] of Object.entries(ids)) {
    const ws = await db.getWorkspace(id);
    const l = m.lookingAt({ obs: await db.listObservations(id), segments: await db.listSegments(id), assets: await db.listSnagAssets(id), snags: await db.snagsForWorkspace(id) }, ws.assets, Date.now());
    out[k] = { says: m.lookingSays(ws.name, l), machines: m.machinesSays(l), found: m.foundSays(l.found), rhythm: m.rhythmSays(l), fact: m.lookingFact(l) };
  }
  return out;
}, made);

/* 1 — the line's page */
for (const k of ['L1', 'L2', 'L3', 'L4']) {
  await go(`#/lines/${made[k]}`);
  await page.waitForSelector('.pl-looked .lk-row', { timeout: 15000 });
  const row = page.locator('.pl-looked .lk-row');
  ok(flat(await row.locator('.lk-says').innerText()) === S[k], `1 ${k} says "${S[k]}"`, await row.locator('.lk-says').innerText());
  ok(S[k] === modSays[k].says, `1 ${k}: the sentence is the module's`, modSays[k].says);
  ok((await row.getAttribute('data-looking')) === (k === 'L1' ? 'fresh' : k === 'L2' ? 'fading' : 'stale'), `1 ${k} in its level, in words as well as colour`);
  ok((await page.locator('.pl-tiles .ln-tile').count()) === 4, `1 ${k}: the four tiles are still four`);
}
await go(`#/lines/${made.L3}`);
await page.waitForSelector('.pl-looked .lk-row');
ok(flat(await page.locator('.pl-looked .lk-machines').innerText()) === 'Not looked at lately: Cartoner (never), Sealer 40 days, Wrapper 16 days.', '1 L3: the machines, never first then the stalest', await page.locator('.pl-looked .lk-machines').innerText());
ok(modSays.L3.machines === 'Not looked at lately: Cartoner (never), Sealer 40 days, Wrapper 16 days.', '1 L3: the machines are the module’s');
ok(flat(await page.locator('.pl-looked .lk-found').innerText()) === `${modSays.L3.rhythm} ${modSays.L3.found}`, '1 L3: the rhythm and what the looking found, as the module says them', await page.locator('.pl-looked .lk-found').innerText());
ok(modSays.L3.rhythm === 'Looked at on 0 of the last 14 days.' && modSays.L3.found === 'Last 4 weeks: 2 problems raised on looks, 1 closed, 1 still open; the oldest open 16 days.', '1 L3: 0 of 14 days; 2 raised, 1 closed, 1 open, the oldest 16 days — the board action not counted', JSON.stringify(modSays.L3));
const rowStyle = await page.locator('.pl-looked .lk-row').evaluate(e => ({ c: getComputedStyle(e.querySelector('.lk-says')).color, b: getComputedStyle(e).borderTopWidth }));
ok(rowStyle.b === '2px', '1 L3: stale takes the heavier red edge', JSON.stringify(rowStyle));
await go(`#/lines/${made.L1}`);
await page.waitForSelector('.pl-looked .lk-row');
const fresh = await page.locator('.pl-looked .lk-row').evaluate(e => ({ says: getComputedStyle(e.querySelector('.lk-says')).color, edge: getComputedStyle(e).borderTopWidth }));
ok(fresh.edge === '1px' && fresh.says !== (rowStyle.c), '1 L1: fresh is neutral — no red, no heavy edge', JSON.stringify(fresh));
ok(!(await page.locator('.pl-looked .lk-machines').count()) || /Cartoner|Wrapper/.test(await page.locator('.pl-looked .lk-machines').innerText()), '1 L1: only the machines nobody has looked at are named');

/* 2 — the factory's cards */
await go('#/');
await page.waitForSelector('.fac-card[data-line="Gemba L3"]', { timeout: 15000 });
const short = { L1: 'Looked at yesterday', L2: 'Last looked at 9 days ago — fading', L3: 'Not looked at for 16 days — stale', L4: 'Nothing recorded of anyone looking — stale' };
for (const k of ['L1', 'L2', 'L3', 'L4']) {
  const t = flat(await page.locator(`.fac-card[data-line="Gemba ${k}"] .fac-card-looked`).innerText());
  ok(t === short[k], `2 the factory’s card for ${k}: "${short[k]}"`, t);
}

/* 3 — a 6M project's Needs you: a note for the line not looked at lately, none for the fresh one, no count moved */
const pid = sd.pacedProjectId;
const noteTexts = async () => (await page.locator('.fp-needs .lk-note').allInnerTexts()).map(flat);
await go(`#/project/${pid}`);
await page.waitForSelector('.fp-needs');
const before = flat(await page.locator('.fp-needs .fp-panel-s').innerText());
const rowsBefore = await page.locator('.fp-needs .fp-row').count();
ok(!(await noteTexts()).some(x => x.includes('Gemba L')), '3 before the project is on the Gemba lines, no note of them');
await page.evaluate(async (ids) => {
  const db = await import('/src/db.ts');
  await db.addPaceLine({ projectId: ids.pid, key: 'G3', name: 'Gemba line 3', owner: 'Rob Scott', sponsor: 'Tanya', sort: 9, workspaceId: ids.L3 });
  await db.addPaceLine({ projectId: ids.pid, key: 'G1', name: 'Gemba line 1', owner: 'Rob Scott', sponsor: 'Tanya', sort: 10, workspaceId: ids.L1 });
}, { pid, L3: made.L3, L1: made.L1 });
await page.locator('.fp-needs .lk-note').first().waitFor({ timeout: 10000 }).catch(() => {});
const notes = await noteTexts();
ok(notes.includes(S.L3), '3 Needs you notes the stale line in the module’s words', notes.join(' | '));
ok(!notes.some(x => x.includes('Gemba L1')), '3 and says nothing of the fresh one', notes.join(' | '));
ok(flat(await page.locator('.fp-needs .fp-panel-s').innerText()) === before && (await page.locator('.fp-needs .fp-row').count()) === rowsBefore, `3 the late count and the rows are the same with the note ("${before}")`);
await page.locator('.fp-needs .lk-note', { hasText: 'Gemba L3' }).click();
await page.waitForTimeout(1200);
ok(page.url().endsWith(`#/lines/${made.L3}`), '3 the note opens the line', page.url());

/* 4 — the method page: Kata and Kaizen event */
const proj = await page.evaluate(async (ids) => {
  const db = await import('/src/db.ts');
  const kata = await db.createProject('Gemba kata', '#0e7490', 'Rowland', 'r@example.com', 'board', 'kata');
  const kaizen = await db.createProject('Gemba kaizen', '#7c3aed', 'Rowland', 'r@example.com', 'board', 'kaizen-event');
  for (const [p, key, w, sort] of [[kata, 'K2', ids.L2, 0], [kata, 'K3', ids.L3, 1], [kaizen, 'Z1', ids.L1, 0]])
    await db.addPaceLine({ projectId: p.id, key, name: key, owner: 'Rob', sponsor: 'Tanya', sort, workspaceId: w });
  return { kata: kata.id, kaizen: kaizen.id };
}, { L1: made.L1, L2: made.L2, L3: made.L3 });
await go(`#/project/${proj.kata}`);
await page.waitForSelector('.pmethod-sec');
const kataRow = page.locator('.pmethod-sec .lt-row', { hasText: 'Gemba walk' });
ok((await kataRow.count()) === 1, '4 the Kata’s Experiment toward it lists the Gemba walk once');
const kataSays = flat(await kataRow.locator('.lt-says').innerText());
ok(kataSays === `${S.L3} 1 other line not fresh.`, `4 it says the stalest line and how many others are not fresh: "${kataSays}"`);
ok((await kataRow.locator('.lt-says').getAttribute('class'))?.includes('is-r'), '4 stale in red, with the words');
await kataRow.click();
await page.waitForTimeout(1200);
ok(page.url().endsWith(`#/lines/${made.L3}`), '4 the row opens the stalest line', page.url());
await go(`#/project/${proj.kaizen}`);
await page.waitForSelector('.pmethod-sec');
const kzRow = page.locator('.pmethod-sec .lt-row', { hasText: 'Gemba walk' });
ok(flat(await kzRow.locator('.lt-says').innerText()) === S.L1, '4 the Kaizen event’s Observe row on a fresh line says so, neutral', await kzRow.locator('.lt-says').innerText());
ok(!(await kzRow.locator('.lt-says').getAttribute('class'))?.match(/is-[ra]/), '4 fresh carries no colour');

/* 6 — on paper: the line's one page and the combined report, downloaded and read back */
await go(`#/lines/${made.L3}`, 3000);
await page.waitForSelector('.pl-looked .lk-row');
const [d1] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report — 1 page', page.locator('.pl'))]);
const one = await readPdf(d1, 'one.pdf');
ok(one.includes('Last looked at') && one.includes(modSays.L3.fact), `6 the one-page report’s band says Last looked at ${modSays.L3.fact}`, one.slice(0, 500));
ok(one.includes(modSays.L3.says) && one.includes(modSays.L3.found), '6 and the sentence and what the looking found, as the page says them', one.slice(0, 1200));
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report — everything on the line', page.locator('.pl'))]);
const all = await readPdf(d2, 'all.pdf');
ok(all.includes(modSays.L3.says) && all.includes(modSays.L3.found) && all.includes(modSays.L3.machines), '6 the combined report carries the sentence, the machines and what was found', all.slice(0, 900));
await page.waitForSelector('.lr-looked', { timeout: 15000 });
ok(flat(await page.locator('.lr-looked').first().innerText()).startsWith(S.L3), '6 and its page says the sentence beside the tiles');

/* 5 — a stop timed moves the page without a reload */
await go(`#/lines/${made.L3}`);
await page.waitForSelector('.pl-looked .lk-row');
await page.evaluate(async (id) => {
  const db = await import('/src/db.ts'); const t = Date.now();
  await db.addObservation({ id: crypto.randomUUID(), workspaceId: id, category: 'Minor stop', asset: 'Sealer', startedAt: t, durationMs: 60_000, timing: 'typed', count: 1, media: [], createdAt: t, updatedAt: t });
}, made.L3);
await page.waitForFunction(() => document.querySelector('.pl-looked .lk-says')?.textContent?.includes('looked at today'), null, { timeout: 8000 }).catch(() => {});
ok(flat(await page.locator('.pl-looked .lk-says').innerText()) === 'Gemba L3 looked at today — a stop timed.', '5 a stop timed moves the line to "looked at today" with no reload', await page.locator('.pl-looked .lk-says').innerText());
ok(flat(await page.locator('.pl-looked .lk-machines').innerText()) === 'Not looked at lately: Cartoner (never), Wrapper 16 days.', '5 and the Sealer is no longer on the list', await page.locator('.pl-looked .lk-machines').innerText());
ok((await page.locator('.pl-looked .lk-row').getAttribute('data-looking')) === 'fresh', '5 fresh');

/* 7 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
for (const h of [`#/lines/${made.L2}`, `#/project/${proj.kata}`, '#/']) {
  await go(h);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, `7 the phone: nothing off the side of ${h.replace(/[0-9a-f-]{36}/, ':id')}`);
}

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
