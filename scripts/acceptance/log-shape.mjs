/* THE CHECK LOG SHAPE, DRIVEN — table-driven over EVERY registered definition (knowledge/specs/FC-236-check-logs.md;
 * FC-170 metal detection, FC-177 and FC-013 scored audits and 5S, FC-062 and FC-234 CILT and condition checks, and
 * every log added after them: a definition in src/tools/checks/defs is covered by being there).
 *
 *   S1  the Logs hub — the factory's, a line's (?view=logs, Stops timed first), a project's; every kind, grouped, with
 *       this scope's counts as the module says them; the seeded logs' states; the crumbs
 *   S2  one kind's list — its logs, the most urgent first, what it rests on and what is to confirm, New
 *   S3  for each definition, on a phone (390 px): a log started from its starter list; the round — a tap each by kind
 *       (a pass, a number, an audit answered question by question with its running score); every card's state, the tiles,
 *       the sentence and the closing line equal the module's; a failure raising its problem on the register with what
 *       it held (the packs from the rate, the money from the materials), the re-check failing again adding a step and
 *       no second problem; a pass clearing it; the history; the paper downloaded and read back; the checks edited,
 *       taken off and put back; renamed; deleted and brought back; read as a client; nothing off the side
 *   S4  each definition's worked examples (hand-worked, the knowledge records' own cases) shown on the page
 *   S7  the wiring — the line's page (its tile and Logs), the line report, Needs you on a project
 *   S9  the empty and invalid states
 *
 * Fails on any console error.   node scripts/acceptance/log-shape.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { more, paper as pressPaper } from '../lib/pageHeader.mjs';
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
const OUT = mkdtempSync(join(tmpdir(), 'log-shape-'));
const SHOTS = process.env.SHOTS;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];
let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();

/** A device at a width — its own context, as a team member (the owner) or a client. */
async function device(width, access) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, hasTouch: width < 900, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s, a]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION, access]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1300); };
  return { ctx, page, go };
}
const pdfOf = async (page, name) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const offSide = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const desk = await device(1360);
const dp = desk.page;
await desk.go('#/room');
const sd = await dp.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
/* the seeded logs: each definition's first worked example, on the seeded line, metal detection in the seeded project */
const logs = await dp.evaluate(async ([ws, pj]) => (await import('/src/dev/seed.ts')).seedChecksForTest(ws, pj), [sd.wsId, sd.projectId]);
/* a clean line — a rated speed of 110 a minute and materials of £0.20 a pack, no Line capacity — so a failure's packs are the independent number */
const makeClean = page => page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const w = await db.createWorkspace('Packing line 9');
  await db.updateWorkspace({ ...w, packsPerMin: 110, materialsPerPack: 0.2 });
  return w.id;
});
const CLEAN = await makeClean(dp);
const KEYS = await dp.evaluate(async () => (await import('/src/tools/checks/registry.ts')).LOG_DEFS.map(d => d.key));
ok(KEYS.length >= 5, `the registry finds ${KEYS.length} definitions: ${KEYS.join(', ')}`);

/** What the module says of a log as it is stored now — every sentence on the page is checked against it. */
const truth = (page, id) => page.evaluate(async sid => {
  const db = await import('/src/db.ts');
  const F = await import('/src/tools/checks/figures.ts'), S = await import('/src/tools/checks/says.ts'), R = await import('/src/tools/checks/registry.ts'), C = await import('/src/tools/checks/ctx.ts');
  const s = await db.getStudy(sid);
  const def = R.defOf(s.agreed.log.key);
  const line = (await db.listWorkspaces()).find(w => w.id === s.workspaceId);
  const ctx = C.ctxFrom(line, await db.listStandardsForLine(s.workspaceId), s.workspaceId);
  const snags = await db.listAllSnags();
  const now = Date.now();
  const f = F.logFigures({ s, def, now, ctx, snags });
  const said = S.logSays(f, s, def);
  const all = [...f.round.now, ...f.round.later, ...f.round.events];
  return {
    says: said.text, verdict: said.verdict, tiles: S.logTiles(f, def).map(t => [t.k, t.v, t.of ?? '']), closing: S.logClosing(f, s).text,
    states: Object.fromEntries(all.map(x => [x.check.id, x.key])), names: Object.fromEntries(all.map(x => [x.check.id, x.check.name])),
    comp: f.comp, failures: f.failures.map(r => ({ id: r.f.result.id, check: r.f.check.name, hold: r.hold.words, packs: r.hold.packs, windowMin: r.hold.windowMin, problemId: r.problemId, continues: r.f.continues })),
    heldPacks: f.heldPacks, tiedUp: f.tiedUp, results: f.results, failedNow: f.failedNow, overdue: f.overdue, due: f.due,
    insights: S.logInsights(f).map(x => x.text), checks: s.agreed.log.checks.map(c => ({ id: c.id, name: c.name, kind: c.kind, where: c.where, priority: c.priority, items: (c.items ?? []).length })),
    scored: f.scored.map(sc => ({ name: sc.check.name, pcts: sc.pcts, falls: sc.falls, weakest: sc.weakest, latest: sc.latest && { pct: sc.latest.figures.pct, points: sc.latest.figures.points, max: sc.latest.figures.max, findings: sc.latest.findings.length, repeats: sc.latest.repeats.length } })),
    title: def.title, plan: S.logActions(f, s, snags).map(a => a.what),
  };
}, id);
/** The page's own words, to compare. */
const tilesOnPage = page => page.locator('.lg-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim().toLowerCase(), e.querySelector('.ln-v')?.textContent?.trim(), e.querySelector('.ln-of')?.textContent?.trim() ?? '']));
const logIdOf = page => decodeURIComponent((page.url().split('/log/')[1] ?? '').split('/')[1]?.split('?')[0] ?? '');
const tab = async (page, name) => { await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click(); await page.waitForTimeout(400); };
const sameAsModule = async (page, id, tag) => {
  const t = await truth(page, id);
  const says = flat(await page.locator('[data-says]').innerText());
  ok(says === flat(t.says), `${tag}: it says "${says}"`, flat(t.says));
  const tiles = await tilesOnPage(page);
  ok(JSON.stringify(tiles.map(x => [x[0], x[1], flat(x[2])])) === JSON.stringify(t.tiles.map(x => [x[0].toLowerCase(), x[1], flat(x[2])])), `${tag}: the tiles as the module says them — ${t.tiles.map(x => `${x[0]} ${x[1]}`).join(' · ')}`, JSON.stringify(tiles));
  ok(flat(await page.locator('.ln-close').innerText()).includes(flat(t.closing)), `${tag}: the closing line — "${flat(t.closing)}"`);
  const cards = await page.locator('li.lg-card').evaluateAll(els => els.map(e => [e.getAttribute('data-check'), e.getAttribute('data-state')]));
  const bad = cards.filter(([cid, st]) => t.states[cid] !== st);
  ok(cards.length === Object.keys(t.states).length && bad.length === 0, `${tag}: every card in the state the module says — ${cards.map(([c, s]) => `${t.names[c]} ${s}`).join(' · ')}`, JSON.stringify(bad));
  return t;
};

/* =============================================================================================== S1 · the hubs */
console.log('\n--- S1 · the Logs hubs ---');
{
  await desk.go('#/logs');
  ok(/^Check logs$/.test(flat(await dp.locator('h1').first().innerText())), 'S1 the hub’s name');
  const crumbs = flat(await dp.locator('.nv-top .nv-ctx').innerText());
  ok(/Tools › Check logs$/.test(crumbs), `S1 the context bar says where it is: "${crumbs}"`);
  const defs = await dp.evaluate(async () => (await import('/src/tools/checks/registry.ts')).defGroups().map(g => ({ group: g.group, defs: g.defs.map(d => ({ key: d.key, title: d.title, says: d.says, fc: d.fc })) })));
  const heads = await dp.locator('.part-sec-h h2').allInnerTexts();
  ok(JSON.stringify(heads.map(flat)) === JSON.stringify(defs.map(g => g.group)), `S1 every group, in the registry’s order: ${heads.join(' · ')}`);
  const counts = await dp.evaluate(async keys => {
    const db = await import('/src/db.ts'), O = await import('/src/tools/checks/owed.ts');
    const all = (await db.listAllStudies()).filter(s => s.tool === 'log');
    return Object.fromEntries(keys.map(k => { const mine = all.filter(s => s.agreed?.log?.key === k); return [k, { n: mine.length, ...O.scopeCounts(mine, Date.now()) }]; }));
  }, KEYS);
  for (const g of defs) for (const d of g.defs) {
    const row = flat(await dp.locator('.lt-li', { has: dp.locator('.lt-what', { hasText: new RegExp(`^${d.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first().innerText());
    const c = counts[d.key];
    const parts = [c.overdue ? `${c.overdue} overdue` : '', c.failed ? `${c.failed} failed` : '', c.due ? `${c.due} due now` : ''].filter(Boolean);
    ok(row.includes(d.says) && row.includes(d.fc) && row.includes(c.n ? `${c.n} log${c.n === 1 ? '' : 's'}${parts.length ? ` · ${parts.join(' · ')}` : ' · up to date'}` : 'None here yet'), `S1 ${d.title}: its row — "${row.slice(0, 150)}"`);
    ok(await dp.getByRole('button', { name: `New — ${d.title}`, exact: true }).count() === 1, `S1 ${d.title}: New on its row`);
  }
  const tot = await dp.evaluate(async () => { const db = await import('/src/db.ts'), O = await import('/src/tools/checks/owed.ts'); return O.scopeCounts((await db.listAllStudies()).filter(s => s.tool === 'log'), Date.now()); });
  const says = flat(await dp.locator('[data-hub-says]').innerText());
  ok(says.startsWith(`${tot.logs} check logs here`) && (!tot.overdue || says.includes(`${tot.overdue} overdue`)) && (!tot.failed || says.includes(`${tot.failed} failed`)), `S1 the hub says "${says}"`);

  /* a line's Logs: Stops timed first, then its check logs, each with its state */
  await desk.go(`#/lines/${sd.wsId}?view=logs`);
  const sec = dp.locator('[data-section="logs"]');
  ok(await sec.count() === 1, 'S1 the line’s Logs page has its Logs section');
  const rows = await sec.locator('.pl-tool').allInnerTexts();
  ok(/^Stops timed/.test(flat(rows[0])), `S1 Stops timed first — the line’s first log: "${flat(rows[0]).slice(0, 60)}"`);
  const lineLogs = await dp.evaluate(async ws => { const db = await import('/src/db.ts'), O = await import('/src/tools/checks/owed.ts'); return (await db.listStudiesForLine(ws)).filter(s => s.tool === 'log').map(s => ({ id: s.id, name: s.name, words: O.statusOf(s, Date.now()).words })); }, sd.wsId);
  ok(lineLogs.length === KEYS.length, `S1 every seeded log is on the line: ${lineLogs.length}`);
  for (const l of lineLogs) {
    const r = flat(await sec.locator(`[data-log-row="${l.id}"]`).innerText());
    ok(r.includes(l.name) && r.includes(l.words), `S1 the line lists "${l.name}" saying "${l.words}"`, r);
  }
  const lsay = flat(await sec.locator('[data-line-logs-says]').innerText());
  ok(new RegExp(`^${lineLogs.length} check logs`).test(lsay), `S1 and says "${lsay}"`);
  const tabsOn = await dp.locator('.nv-tabs .nv-tab.is-on').allInnerTexts();
  ok(tabsOn.some(t => /^Tools$/.test(flat(t))) && /Logs$/.test(flat(await dp.locator('.nv-top .nv-ctx').innerText())), 'S1 on a line, Logs is folded under the Tools tab and the bar says Logs');
  /* the Tools page keeps Stops timed, as before */
  await desk.go(`#/lines/${sd.wsId}?view=tools`);
  ok(await dp.locator('.pl-tool.is-stops').count() === 1, 'S1 Stops timed is still on the line’s Tools');

  /* a project's: only its own, the lines one tap away */
  await desk.go(`#/logs?project=${sd.projectId}`);
  const mineP = await dp.evaluate(async pid => (await (await import('/src/db.ts')).listStudies(pid)).filter(s => s.tool === 'log').length, sd.projectId);
  const sayP = flat(await dp.locator('[data-hub-says]').innerText());
  ok(mineP === 1 && sayP.startsWith('1 check log here'), `S1 a project’s Logs: its own one — "${sayP}"`);
  ok(await dp.locator('.ip-scope .chip').count() === 3 || await dp.locator('.ip-scope .chip').count() === 2, 'S1 whose: the project’s, its lines, all lines');
  await dp.locator('.ip-scope .chip', { hasText: 'All lines' }).click(); await dp.waitForTimeout(400);
  ok(flat(await dp.locator('[data-hub-says]').innerText()).startsWith(`${KEYS.length} check logs here`), 'S1 all lines: every log');
  await desk.go(`#/project/${sd.projectId}/tools`);
  const prow = flat(await dp.locator('.lt-li', { hasText: 'Check logs' }).first().innerText());
  ok(/1 in this project/.test(prow), `S1 the project’s Tools lists Check logs with its count: "${prow}"`);
}

/* =============================================================================================== S2 · one kind's list */
console.log('\n--- S2 · one kind’s list ---');
for (const key of KEYS) {
  await desk.go(`#/log/${key}`);
  const t = await dp.evaluate(async k => { const R = await import('/src/tools/checks/registry.ts'); const d = R.defOf(k); return { title: d.title, rests: d.standard.rests, confirm: d.standard.confirm, n: d.starterChecks.length }; }, key);
  ok(flat(await dp.locator('h1').first().innerText()) === t.title, `S2 ${key}: the list’s name`);
  await dp.locator('.lg-rests summary').click();
  ok(flat(await dp.locator('[data-standard]').first().innerText()) === flat(t.rests) && await dp.locator('ul[aria-label="To confirm"] li').count() === t.confirm.length, `S2 ${key}: what it rests on, and its ${t.confirm.length} things to confirm, said`);
  const seeded = logs[key];
  const row = dp.locator(`.lt-li[data-study="${seeded}"]`);
  const said = await dp.evaluate(async id => { const db = await import('/src/db.ts'), O = await import('/src/tools/checks/owed.ts'); return O.statusOf(await db.getStudy(id), Date.now()).words; }, seeded);
  ok(await row.count() === 1 && flat(await row.innerText()).includes(said), `S2 ${key}: the seeded log’s row says "${said}"`, flat(await row.innerText().catch(() => '')));
}

/* =============================================================================================== S3 · every definition, on a phone */
const phone = await device(390);
const pp = phone.page;
await phone.go('#/room');
const CLEANP = await makeClean(pp);
const regS = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nospace = s => (s ?? '').replace(/\s+/g, '').toLowerCase();
const snagsAbout = (page, part) => page.evaluate(async part => (await (await import('/src/db.ts')).listAllSnags()).filter(x => x.problem.includes(part) && !x.deletedAt), part);
const dialogYes = page => page.once('dialog', d => d.accept());
const undoToast = async page => { await page.locator('.toast-undo').click(); await page.waitForTimeout(500); };

/** Answer a scored check's questions with the levels given, reading the running score against the module after some. */
async function audit(page, key, id, checkName, levels, tag) {
  const info = await page.evaluate(async ([sid, name]) => {
    const db = await import('/src/db.ts'); const R = await import('/src/tools/checks/registry.ts');
    const s = await db.getStudy(sid); const c = s.agreed.log.checks.find(x => x.name === name); const def = R.defOf(s.agreed.log.key);
    return { items: c.items, levels: def.scale.levels, below: c.findingBelow ?? def.scale.findingBelow };
  }, [id, checkName]);
  await page.getByRole('button', { name: `Start the audit — ${checkName}`, exact: true }).click();
  await page.locator('[data-sheet="audit"]').waitFor();
  ok(/^0 of \d+ answered$/.test(flat(await page.locator('[data-progress]').innerText())), `${tag}: the audit opens with nothing answered: "${flat(await page.locator('[data-progress]').innerText())}"`);
  ok(await page.locator('.lg-finish').isDisabled() && /Still to answer/.test(flat(await page.locator('[data-unanswered]').innerText())), `${tag}: Finish is held until every question is answered, and says which are not`);
  const stops = new Set([1, Math.floor(info.items.length / 2), info.items.length]);
  for (let i = 0; i < info.items.length; i++) {
    const it = info.items[i], l = levels[i];
    if (l === null) await page.getByRole('button', { name: `${it.name} — not applicable`, exact: true }).click();
    else { const w = info.levels.find(x => x.v === l).word; await page.getByRole('button', { name: `${it.name} — ${l}, ${w}`, exact: true }).click(); }
    if (stops.has(i + 1)) {
      const want = await page.evaluate(async ([items, lv, scaleLevels, below]) => {
        const S = await import('/src/tools/checks/scoring.ts');
        return S.shareOfMax(items.map((x, i) => ({ id: x.id, ...(x.group ? { group: x.group } : {}), level: lv[i] })), { levels: scaleLevels, findingBelow: below }, below);
      }, [info.items.slice(0, i + 1), levels.slice(0, i + 1), info.levels, info.below]);
      const text = flat(await page.locator('[data-progress]').innerText());
      ok(text === `${i + 1} of ${info.items.length} answered${want.pct !== undefined ? ` · ${Math.round(want.pct)}% so far` : ''}`, `${tag}: the running score after ${i + 1} answers — "${text}"`);
    }
  }
  await page.locator('.lg-finish').click();
  await page.waitForTimeout(600);
  /* nothing below the line: Finish saves at once and the sheet closes */
  if (!(await page.locator('[data-final]').count())) return { final: '', save: async () => {}, count: 0, saved: true };
  return { final: flat(await page.locator('[data-final]').innerText()), save: () => page.locator('.lg-save').click(), count: await page.locator('.lg-find li').count() };
}

for (const key of KEYS) {
  console.log(`\n--- S3 · ${key}, on a phone ---`);
  const def = await pp.evaluate(async k => { const d = (await import('/src/tools/checks/registry.ts')).defOf(k); return { title: d.title, noun: d.noun, kinds: d.kinds, whereLabel: d.whereLabel, holds: d.holds, priority: d.priority, tags: !!d.tags, starters: d.starterChecks.map(c => ({ name: c.name, kind: c.kind, when: c.when, priority: c.priority, where: c.where })), rests: d.standard.rests, confirm: d.standard.confirm, limits: d.limits, scale: d.scale, ex: d.examples[0] }; }, key);
  const where = def.whereLabel === 'Detector' ? 'Metal detector' : def.whereLabel === 'Machine' ? 'Wrapper' : 'Packing hall';
  /* ---- start it from the starter list ---- */
  await phone.go(`#/log/${key}?add=1&line=${CLEANP}`);
  ok(await pp.locator('[data-sheet="new-log"]').count() === 1, `S3 ${key}: New opens the starter sheet`);
  ok(await pp.locator('.lg-pick input:checked').count() === def.starters.length, `S3 ${key}: every starter check ticked — ${def.starters.length}`);
  await pp.getByLabel(def.whereLabel, { exact: true }).fill(where);
  await pp.getByLabel('Name', { exact: true }).fill(`Round — ${key}`);
  await pp.getByRole('button', { name: 'Start it' }).click();
  await pp.waitForURL(new RegExp(`#/log/${key}/[^/?]+`), { timeout: 10000 });
  await pp.locator('li.lg-card').first().waitFor();
  const id = logIdOf(pp);
  ok(await pp.locator('li.lg-card').count() === def.starters.length, `S3 ${key}: the round has a card for each of the ${def.starters.length} checks`);
  ok(await offSide(pp), `S3 ${key}: the round on a phone — nothing off the side`);
  const first = await sameAsModule(pp, id, `S3 ${key} the round, nothing done`);
  ok(def.starters.every((c, i) => { const cid = Object.keys(first.names).find(k => first.names[k] === c.name); return first.states[cid] === ('every' in c.when ? 'due' : 'event'); }), `S3 ${key}: every interval check due at the start, every event check waiting for its event`);
  const stage = await pp.evaluate(async sid => (await (await import('/src/db.ts')).getStudy(sid)).agreed.log.checks.map(c => ({ ...c })), id);
  ok(stage.every(c => c.where === where), `S3 ${key}: the ${def.whereLabel.toLowerCase()} typed is on each check`);

  /* ---- the round, a tap each by kind ---- */
  const scoredChecks = stage.filter(c => c.kind === 'scored');
  const exScored = def.ex.results.filter(r => r.levels);
  for (const c of stage) {
    if (c.kind === 'passfail') await pp.getByRole('button', { name: `Pass — ${c.name}`, exact: true }).click();
    else if (c.kind === 'value') { await pp.getByLabel(`Reading — ${c.name}`, { exact: true }).fill('55'); await pp.getByRole('button', { name: `Record — ${c.name}`, exact: true }).click(); }
    else if (c.kind === 'scored') {
      const k = scoredChecks.indexOf(c);
      const levelsOf = r => r.levels;
      const runs = k === 0 && exScored.length ? exScored : [{ levels: c.items.map(() => def.scale.levels[def.scale.levels.length - 1].v) }];
      for (let r = 0; r < runs.length; r++) {
        const a = await audit(pp, key, id, c.name, levelsOf(runs[r]), `S3 ${key} audit ${r + 1} of "${c.name}"`);
        const want = await pp.evaluate(async ([sid, name, lv]) => {
          const db = await import('/src/db.ts'), R = await import('/src/tools/checks/registry.ts'), S = await import('/src/tools/checks/scoring.ts');
          const s = await db.getStudy(sid); const ch = s.agreed.log.checks.find(x => x.name === name); const def = R.defOf(s.agreed.log.key);
          const f = S.shareOfMax(ch.items.map((x, i) => ({ id: x.id, ...(x.group ? { group: x.group } : {}), level: lv[i] })), def.scale, ch.findingBelow ?? def.scale.findingBelow);
          return { pct: f.pct, points: f.points, max: f.max, findings: f.findings.length };
        }, [id, c.name, levelsOf(runs[r])]);
        ok(a.saved ? want.findings === 0 : a.final.includes(`${Math.round(want.pct)}%`) && a.final.includes(`${want.points} of ${want.max}`) && a.count === want.findings, `S3 ${key}: the audit scored ${Math.round(want.pct)}% — ${a.saved ? 'no finding, saved at once' : `"${a.final}"`}`);
        if (runs === exScored && r === exScored.length - 1 && def.ex.expect.pct !== undefined) ok(Math.round(want.pct) === Math.round(def.ex.expect.pct) && want.findings === def.ex.expect.findings, `S3 ${key}: the hand-worked case — ${Math.round(def.ex.expect.pct)}% and ${def.ex.expect.findings} findings (the knowledge record's own)`);
        const before = (await snagsAbout(pp, c.name)).length;
        await a.save();
        await pp.waitForTimeout(700);
        const after = await snagsAbout(pp, c.name);
        ok(after.length - before === want.findings, `S3 ${key}: ${want.findings} findings raised as ${want.findings} problems on the register (${after.length - before})`);
        const again = after.filter(x => /came back/.test(x.problem));
        if (r === runs.length - 1 && def.ex.expect.repeats !== undefined) ok(again.length === def.ex.expect.repeats && again.every(x => x.priority === 'high'), `S3 ${key}: the findings that came back — ${def.ex.expect.repeats} — raised High: ${again.length}`);
        ok(after.every(x => x.workspaceId === CLEANP && x.targetAsset === where && x.status === 'open'), `S3 ${key}: each problem is on the line and the ${def.whereLabel.toLowerCase()} typed`);
      }
    }
  }
  await pp.waitForTimeout(500);
  const afterRound = await sameAsModule(pp, id, `S3 ${key} the round, done`);
  ok(Object.entries(afterRound.states).every(([cid, st]) => st === 'done' || st === 'event' || (stage.find(c => c.id === cid)?.kind === 'scored' && ['done', 'failed'].includes(st))), `S3 ${key}: every check now done (or waiting for its event)`);

  /* ---- a failure: what it holds, and the problem it raises ---- */
  const failer = stage.find(c => c.kind === 'passfail' && c.when.every);
  if (failer) {
    await pp.evaluate(async sid => { const db = await import('/src/db.ts'); await db.patchStudy(sid, cur => ({ agreed: { ...cur.agreed, log: { ...cur.agreed.log, since: cur.agreed.log.since - 7_200_000 } }, facts: { ...cur.facts, results: cur.facts.results.map(r => ({ ...r, at: r.at - 3_600_000 })) } })); }, id);
    await phone.go(`#/log/${key}/${id}`);
    await pp.getByRole('button', { name: `Fail — ${failer.name}`, exact: true }).click();
    await pp.locator('[data-sheet="fail"]').waitFor();
    const sheet = flat(await pp.locator('[data-hold]').innerText());
    if (def.holds) ok(sheet.includes('Held: 1 h since the last good check — 6,600 packs (at the line’s rated speed), £1.3k tied up in materials'), `S3 ${key}: the sheet says what it holds before it is recorded — "${sheet}"`);
    else ok(sheet.startsWith('Nothing held'), `S3 ${key}: a log that holds nothing says so — "${sheet}"`);
    ok(await offSide(pp), `S3 ${key}: the failure sheet on a phone — nothing off the side`);
    await pp.getByLabel('What happened', { exact: true }).fill('reject arm air line');
    await pp.getByRole('button', { name: 'Record the failure' }).click();
    await pp.waitForTimeout(900);
    const raised = await snagsAbout(pp, `${failer.name} failed`);
    ok(raised.length === 1, `S3 ${key}: exactly one problem raised on the register: "${raised[0]?.problem}"`);
    const p1 = raised[0];
    const prio = failer.priority ?? def.priority;
    ok(p1 && p1.workspaceId === CLEANP && p1.targetAsset === where && p1.priority === prio && p1.status === 'open' && (def.holds ? p1.heldPacks === 6600 : p1.heldPacks === undefined) && /reject arm air line/.test(p1.problem), `S3 ${key}: on the line and the ${def.whereLabel.toLowerCase()}, ${prio}, ${def.holds ? '6,600 packs held' : 'nothing held'}, the note kept`);
    const link = await pp.evaluate(async sid => (await (await import('/src/db.ts')).getStudy(sid)).facts.results.filter(r => r.outcome === 'fail').map(r => r.problemId), id);
    ok(link.length === 1 && link[0] === p1?.id, `S3 ${key}: the result is linked to its problem`);
    const t1 = await sameAsModule(pp, id, `S3 ${key} after the failure`);
    ok(t1.states[failer.id] === 'failed' && await pp.locator(`li.lg-card[data-check="${failer.id}"][data-state="failed"]`).count() === 1, `S3 ${key}: the check stays red, failed, until it passes`);
    ok(t1.failures.length === 1 && (!def.holds || t1.failures[0].packs === 6600) && (!def.holds || t1.tiedUp === 1320), `S3 ${key}: the module holds ${t1.failures[0]?.packs ?? 'none'} packs${t1.tiedUp ? ` and £${t1.tiedUp} tied up` : ''}`);
    /* the re-check fails again: no second problem, a step on the first */
    await pp.getByRole('button', { name: `Fail — ${failer.name}`, exact: true }).click();
    await pp.locator('[data-sheet="fail"]').waitFor();
    ok(/failed again/.test(flat(await pp.locator('[data-sheet="fail"]').innerText())) && (!def.holds || /nothing more/.test(flat(await pp.locator('[data-hold]').innerText()))), `S3 ${key}: the re-check failing again says it holds nothing more and raises no second problem`);
    await pp.getByRole('button', { name: 'Record the failure' }).click();
    await pp.waitForTimeout(900);
    const raised2 = await snagsAbout(pp, `${failer.name} failed`);
    ok(raised2.length === 1 && (raised2[0].journey ?? []).length === 1 && /failed again/.test(raised2[0].journey[0].did), `S3 ${key}: still one problem, with a step on its journey: "${raised2[0]?.journey?.[0]?.did}"`);
    /* the history: both failures, each with what it held */
    await tab(pp, 'History');
    const t2 = await truth(pp, id);
    const fails = await pp.locator('[data-failure]').allInnerTexts();
    ok(fails.length === 2 && t2.failures.every((f, i) => flat(fails[i]).includes(flat(f.hold))), `S3 ${key}: the history lists both failures with what each held — "${flat(fails[0]).slice(0, 140)}"`);
    ok(await pp.locator('[data-tab="history"] table[aria-label="Compliance by check"] tbody tr[data-check-row]').count() === stage.length, `S3 ${key}: compliance for each of the ${stage.length} checks`);
    /* the paper, with the failure in it */
    const pdf = await pdfOf(pp, `${key}-failed.pdf`);
    const n = nospace(pdf.text);
    ok(n.includes(nospace(def.title)) && n.includes('thechecksasagreed') && n.includes('checksdoneontime') && n.includes('failuresandwhateachheld') && (!def.holds || n.includes(nospace('Held: 1 h since the last good check — 6,600 packs'))), `S3 ${key}: the paper — ${pdf.pages} page(s): the checks as agreed, compliance, the failure and what it held`, pdf.text.slice(0, 300));
    ok(stage.every(c => n.includes(nospace(c.name).slice(0, 18))), `S3 ${key}: every check on the paper by name`);
    ok(n.includes(nospace(def.rests).slice(0, 60)) && n.includes('toconfirm') && def.confirm.every(x => n.includes(nospace(x).slice(0, 40))), `S3 ${key}: what the list rests on and every thing to confirm are on the paper`);
    ok(def.limits.every(x => n.includes(nospace(x).slice(0, 40))) && n.includes('whatthislogdoesnotdo'), `S3 ${key}: and what it does not do — ${def.limits.length} limits`);
    ok(t2.plan.length >= 1 && n.includes('actionplan') && t2.plan.every(w => n.includes(nospace(w).slice(0, 30))), `S3 ${key}: the action plan names the problem raised`);
    /* the next check passes it */
    await tab(pp, 'Round');
    await pp.getByRole('button', { name: `Pass — ${failer.name}`, exact: true }).click();
    await pp.waitForTimeout(600);
    const t3 = await sameAsModule(pp, id, `S3 ${key} after the pass`);
    ok(t3.states[failer.id] === 'done', `S3 ${key}: a pass clears it — the check is done again`);
  } else {
    /* no pass-or-fail check: an audit under its agreed score fails as a whole */
    ok(true, `S3 ${key}: no pass-or-fail check — its audits' findings are what it raises`);
    await tab(pp, 'History');
    const pdf = await pdfOf(pp, `${key}.pdf`);
    const n = nospace(pdf.text);
    ok(n.includes(nospace(def.title)) && n.includes('thechecksasagreed') && n.includes('checksdoneontime'), `S3 ${key}: the paper — ${pdf.pages} page(s)`, pdf.text.slice(0, 200));
    ok(stage.every(c => n.includes(nospace(c.name).slice(0, 18))), `S3 ${key}: every check on the paper by name`);
    ok(n.includes(nospace(def.rests).slice(0, 60)) && def.confirm.every(x => n.includes(nospace(x).slice(0, 40))) && def.limits.every(x => n.includes(nospace(x).slice(0, 40))), `S3 ${key}: what the list rests on, what to confirm and what it does not do are on the paper`);
    if (scoredChecks.length) {
      const t = await truth(pp, id);
      const sc = t.scored[0];
      ok(n.includes(`${Math.round(sc.latest.pct)}%`) && n.includes('theaudits,inorder'.replace(/,/g, '')) || n.includes('audits'), `S3 ${key}: the paper carries the audits — ${sc.pcts.map(p => `${Math.round(p)}%`).join(' → ')}`);
      ok(sc.latest.repeats === (def.ex.expect.repeats ?? 0) || def.ex.expect.repeats === undefined, `S3 ${key}: ${sc.latest.repeats} finding(s) came back, as the module says`);
      const lines = await pp.locator('[data-audit-series] .lg-aud-l').allInnerTexts();
      ok(lines.some(l => l.includes(`${Math.round(sc.latest.pct)}%`)), `S3 ${key}: the history says the latest "${flat(lines[0] ?? '').slice(0, 80)}"`);
      if (sc.weakest && sc.latest) ok(flat(await pp.locator('[data-audit-series] tr.is-weak').first().innerText()).includes(sc.weakest.name), `S3 ${key}: the weakest heading marked — ${sc.weakest.name}`);
    }
    await tab(pp, 'Round');
  }

  /* ---- a tag (CILT) ---- */
  if (def.tags) {
    const c0 = stage[0];
    await pp.getByRole('button', { name: `Tag it — ${c0.name}`, exact: true }).click();
    await pp.locator('[data-sheet="tag"]').waitFor();
    ok(await pp.locator('.lg-confirm').isDisabled(), `S3 ${key}: a tag with no words is held — "Say what you saw"`);
    await pp.getByRole('button', { name: /^Red/ }).click();
    await pp.getByLabel('What did you see', { exact: true }).fill('jaw guard bracket loose');
    await pp.locator('.lg-confirm').click(); await pp.waitForTimeout(800);
    const tags1 = await snagsAbout(pp, 'Tag (red)');
    ok(tags1.length === 1 && tags1[0].priority === 'high' && tags1[0].targetAsset === where && tags1[0].workspaceId === CLEANP && /jaw guard bracket loose/.test(tags1[0].problem), `S3 ${key}: a red tag is a High problem on the line and the machine: "${tags1[0]?.problem}"`);
    await pp.getByRole('button', { name: `Tag it — ${c0.name}`, exact: true }).click();
    await pp.getByLabel('What did you see', { exact: true }).fill('guard bracket loose again');
    await pp.locator('.lg-confirm').click(); await pp.waitForTimeout(800);
    const tags2 = await snagsAbout(pp, 'Tag (white)');
    ok(tags2.length === 1 && tags2[0].priority === 'low', `S3 ${key}: a white tag is Low`);
    await tab(pp, 'History');
    const tagText = flat(await pp.locator('[data-tab="history"]').innerText());
    ok(/2 tags raised: 2 open/.test(tagText) && new RegExp(`${regS(c0.name)} has been tagged 2 times in the last 28 days`).test(tagText), `S3 ${key}: two tags open, the same place tagged twice — a repeat abnormality said`);
    await patchProblemClosed(tags1[0].id);
    await pp.waitForTimeout(600);
    ok(/2 tags raised: 1 open/.test(flat(await pp.locator('[data-tab="history"]').innerText())), `S3 ${key}: a tag closed on the register counts closed here`);
    await tab(pp, 'Round');
  }

  /* ---- the checks as agreed: edited, taken off, put back, added ---- */
  await tab(pp, 'The checks');
  const c1 = stage[0];
  await pp.getByRole('button', { name: `Edit — ${c1.name}`, exact: true }).click();
  await pp.locator('[data-sheet="check"]').waitFor();
  const cnew = `${c1.name} (edited)`;
  await pp.getByLabel('What is checked', { exact: true }).fill(cnew);
  if (c1.when.every) { await pp.getByLabel('Every how many', { exact: true }).fill('2'); }
  await pp.getByRole('button', { name: 'Save the check' }).click(); await pp.waitForTimeout(500);
  ok(await pp.locator(`[data-check-def="${c1.id}"]`).innerText().then(t => t.includes(cnew) && (!c1.when.every || /every 2 /.test(t))), `S3 ${key}: a check edited where it sits — renamed${c1.when.every ? ' and every 2 …' : ''}`);
  dialogYes(pp);
  await pp.getByRole('button', { name: `Take off — ${cnew}`, exact: true }).click(); await pp.waitForTimeout(600);
  ok(await pp.locator(`[data-check-def="${c1.id}"]`).count() === 0 && /1 taken off the list/.test(flat(await pp.locator('.lg-off summary').innerText())), `S3 ${key}: a check taken off the list — no longer due, kept`);
  await tab(pp, 'Round');
  ok(await pp.locator(`li.lg-card[data-check="${c1.id}"]`).count() === 0, `S3 ${key}: and gone from the round`);
  await undoToast(pp);
  ok(await pp.locator(`li.lg-card[data-check="${c1.id}"]`).count() === 1, `S3 ${key}: Undo puts it back`);
  await tab(pp, 'The checks');
  await pp.getByRole('button', { name: 'Add a check' }).click();
  await pp.getByLabel('What is checked', { exact: true }).fill('Extra check added later');
  if (def.kinds[0] === 'scored') {
    ok(await pp.getByRole('button', { name: 'Add the check' }).isDisabled() && /needs its questions/.test(flat(await pp.locator('[data-sheet="check"]').innerText())), `S3 ${key}: a scored check with no questions is refused, in words`);
    await pp.getByLabel('The questions', { exact: true }).fill('Area | Is it tidy?\nIs it clean?');
  }
  await pp.getByRole('button', { name: 'Add the check' }).click(); await pp.waitForTimeout(500);
  ok(await pp.locator('[data-check-def]').filter({ hasText: 'Extra check added later' }).count() === 1, `S3 ${key}: a check added`);
  await pp.getByRole('button', { name: 'Add a check' }).click();
  await pp.getByLabel('What is checked', { exact: true }).fill(' ');
  ok(await pp.getByRole('button', { name: 'Add the check' }).isDisabled() && /Say what is checked/.test(flat(await pp.locator('[data-sheet="check"]').innerText())), `S3 ${key}: a check with no name is refused, in words`);
  await pp.keyboard.press('Escape'); await pp.waitForTimeout(300);
  ok(await offSide(pp), `S3 ${key}: the checks on a phone — nothing off the side`);

  /* ---- renamed, deleted, brought back ---- */
  await more(pp, 'Rename');
  await pp.locator('.ie-name-f input').fill(`Renamed ${key}`); await pp.keyboard.press('Enter'); await pp.waitForTimeout(500);
  ok(flat(await pp.locator('h1.ie-name').innerText()) === `Renamed ${key}`, `S3 ${key}: renamed where it sits`);
  dialogYes(pp);
  await more(pp, 'Delete'); await pp.waitForTimeout(900);
  ok(new RegExp(`#/log/${key}(\\?|$)`).test(pp.url()) && await pp.locator(`.lt-li[data-study="${id}"]`).count() === 0, `S3 ${key}: deleted from its page — back on its list, the log gone`);
  await undoToast(pp);
  await phone.go(`#/log/${key}/${id}`);
  ok(flat(await pp.locator('h1.ie-name').innerText()) === `Renamed ${key}`, `S3 ${key}: Undo brings the whole log back — its checks and results`);
  ok(await offSide(pp), `S3 ${key}: the page after it, on a phone — nothing off the side`);
  const hh = await pp.locator('.lg-pass, .lg-audit, .lg-rec').first().evaluate(e => e.getBoundingClientRect().height).catch(() => 99);
  ok(hh >= 44, `S3 ${key}: the buttons a tap hits are ${Math.round(hh)} px tall`);
}

/* the closed problem used above: closed on the register as a person would */
async function patchProblemClosed(snagId) {
  await pp.evaluate(async sid => { const db = await import('/src/db.ts'); await db.patchSnag(sid, { status: 'closed', closedAt: Date.now() }); }, snagId);
}

/* =============================================================================================== S3b · read as a client */
{
  const cl = await device(1360, 'client');
  await cl.go('#/room');
  const sd2 = await cl.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  const l2 = await cl.page.evaluate(async ([ws, pj]) => (await import('/src/dev/seed.ts')).seedChecksForTest(ws, pj), [sd2.wsId, sd2.projectId]);
  await cl.go(`#/log/metal-detection/${l2['metal-detection']}`);
  ok(await cl.page.locator('li.lg-card').count() > 0 && await cl.page.locator('.lg-pass, .lg-fail, .lg-rec, .lg-audit, .lg-tag').count() === 0, 'S3 a client reads the round and has no control that writes');
  ok(/You can read this log/.test(flat(await cl.page.locator('[data-tab="round"]').innerText())), 'S3 and is told so');
  await tab(cl.page, 'History');
  ok(await cl.page.locator('[data-tab="history"] .lg-res button').count() === 0, 'S3 a client cannot strike a result');
  await tab(cl.page, 'The checks');
  ok(await cl.page.getByRole('button', { name: 'Add a check' }).count() === 0 && await cl.page.locator('[data-check-def] button').count() === 0 && /agreed by the project’s owner/.test(flat(await cl.page.locator('[data-tab="checks"]').innerText())), 'S3 and cannot change what was agreed, and is told who does');
  ok(await cl.page.getByRole('menuitem', { name: 'Delete' }).count() === 0 && await cl.page.locator('.part-menu-b', { hasText: /^More/ }).count() === 0, 'S3 and sees no Rename or Delete');
  await cl.go(`#/logs?project=${sd2.projectId}`);
  ok(await cl.page.getByRole('button', { name: /^New — / }).count() === 0, 'S3 a client’s Logs in the project offers no New');
  await cl.ctx.close();
}

/* ==TRAILER== */
ok(errors.length === 0, 'no console error anywhere', errors.slice(0, 3).join(' | '));
console.log(failed ? `\nThe check log shape NOT accepted: ${failed} failed` : '\nThe check log shape accepted.');
await browser.close();
process.exit(failed ? 1 : 0);
