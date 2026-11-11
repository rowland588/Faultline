/* PROBLEMS RAISED FROM INSIDE A TOOL, AND HELD THERE (docs/TOOL-PROBLEMS.md — Rowland, 11 November, on a live test at a customer: "I'm using a tool,
 * I see something … I raise a problem and link it to the tool … it could be a specific station or a specific place, specific asset, where it's then held
 * within the tool. Yes, you'll see it on a problem page … but it also will be held inside the tool itself"):
 *   1  a Stops across workstations record: a photo put on the Sealer, then the Sealer's sheet's Raise a problem here — the one problem sheet, saying where
 *      it is raised from, on the record's line, the machine the Sealer, the photo already in it; words, priority, whose and by when typed; saved — a
 *      problem on the register held by the record's Sealer (raised:<study>:w03), carrying the SAME photo file (no copy)
 *   2  the Sealer's tile says 1 problem open; the record's Problems raised here lists it with its part, priority, who, due and where it stands
 *   3  the tile's count opens the problem itself; the problem says Raised from Stops across workstations — … › Sealer, a door back to the record at the part
 *   4  the Problems page's row says Raised from …; the line's Actions list it
 *   5  More ▾ › Link a problem…: the line's open problems not held here (never another line's), a part picked (the Filler) — linked; its tile counts it;
 *      Unlink from the record and Undo
 *   6  from the problem's own editor on Problems: Link to a tool record…, the record and the Packer picked — held under the Packer
 *   7  kept after a reload
 *   8  the record's paper read back: Problems raised here, each under its workstation with its words, priority, who, due and state; the Problems report
 *      says Raised from
 *   9  a client: the list and the links seen, nothing to raise, link or unlink
 *  10  the phone: the count, the rows and the sheet's Raise a problem here a thumb's height, nothing off the side
 *  and no console error. */
import pkg from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper as pressPaper, more } from '../lib/pageHeader.mjs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => s.replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'tool-problems-'));
const errs = [];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
async function device(width, height, access) {
  const ctx = await b.newContext({ viewport: { width, height }, acceptDownloads: true, locale: 'en-GB', ...(width < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(([k, s, a]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION, access]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  const settle = async (ms = 400) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
  return { ctx, page, settle };
}
const { page, settle } = await device(1360, 900);
const study = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);
const snags = () => page.evaluate(async () => (await import('/src/db.ts')).listAllSnags());

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const STOPS = { n: 4, unit: 'kg', same: 'same', per: 'min', rate: 12, watched: 120, unitCost: 2.1,
  w01_name: 'Filler', w01_min: 8.5, w01_stops: 3, w02_name: 'Wrapper', w03_name: 'Sealer', w03_min: 22, w03_stops: 2, w04_name: 'Packer', w04_min: 5.25, w04_stops: 1 };
const ids = await page.evaluate(async (inputs) => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const other = await db.createWorkspace('Line 9');
  const t = Date.now(), id = crypto.randomUUID();
  await db.putStudy({ id, tool: 'calc', name: 'Cellox trial', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {}, agreed: { calc: { key: 'workstation-stops', inputs } } });
  const mk = async (problem, wsId, extra = {}) => { const s = { id: crypto.randomUUID(), workspaceId: wsId, problem, status: 'open', raisedAt: t - 3_600_000, updatedAt: t - 3_600_000, priority: 'low', ...extra }; await db.addSnag(s); return s.id; };
  const labeller = await mk('Labeller drifting off the pack', ws.id, { targetAsset: 'Labeller' });
  const casePacker = await mk('Case packer trays jamming', ws.id, { targetAsset: 'Case packer' });
  const elsewhere = await mk('Guard loose on Line 9', other.id);
  return { id, lineId: ws.id, labeller, casePacker, elsewhere };
}, STOPS);
const { id, lineId } = ids;
await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await settle(1800);

/* 1 — a photo on the Sealer, then Raise a problem here */
await page.locator('.calc-tile[data-tile="2"] [data-attach-open]').click(); await settle(500);
const sheet = page.locator('[data-attach-sheet="w03"]');
const jpeg = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 640; c.height = 480; const g = c.getContext('2d'); g.fillStyle = '#b33'; g.fillRect(0, 0, 640, 480); g.fillStyle = '#fff'; g.font = '60px sans-serif'; g.fillText('JAW', 220, 260); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }), 'base64');
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), sheet.locator('[data-attach-files]').click()]);
await chooser.setFiles({ name: 'jaw.jpg', mimeType: 'image/jpeg', buffer: jpeg });
await page.waitForFunction(() => document.querySelectorAll('[data-attach-sheet="w03"] [data-kind=photo]').length === 1, null, { timeout: 15000 }).catch(() => {});
const photo = (await study(id)).facts.attach?.find(a => a.kind === 'photo');
ok(!!photo?.blobKey, '1 a photo is on the Sealer', JSON.stringify(photo));
ok(await sheet.locator('[data-attach-problem]').count() === 1, '1 the Sealer’s sheet offers Raise a problem here');
await sheet.locator('[data-attach-problem]').click(); await settle(700);
const qs = page.locator(`[data-raise-from="${id}"]`);
ok(await qs.count() === 1, '1 the problem sheet opens, raised from this record');
const from = flat(await qs.locator('[data-qs-from]').innerText().catch(() => ''));
ok(/Raised from Stops across workstations — Cellox trial › Sealer/.test(from) && /picture on it goes with it/.test(from), '1 it says where it is raised from, and that the picture goes with it', from);
ok(await qs.locator('select[aria-label="Which line"]').inputValue() === lineId, '1 on the record’s line');
const machine = await qs.locator('input[aria-label="Another machine"]').inputValue();
const machineChip = await qs.locator('[aria-label="Which machine"] .chip.on').innerText().catch(() => '');
ok(machine === 'Sealer' || machineChip === 'Sealer', '1 the machine is the Sealer', `${machine}|${machineChip}`);
ok(await qs.locator('.ev-thumb').count() === 1, '1 the Sealer’s photo is already in it', String(await qs.locator('.ev-thumb').count()));
await qs.locator('textarea').fill('Sealer jaw trapping film on every third pack');
await qs.locator('.qs-prio', { hasText: 'High' }).click();
await qs.locator('input[aria-label="Whose is it"]').fill('Dave');
const due = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
await qs.locator('input[aria-label="By when"]').fill(due);
await qs.getByRole('button', { name: 'Save', exact: true }).click(); await settle(900);
const raised = (await snags()).find(s => s.problem === 'Sealer jaw trapping film on every third pack');
ok(!!raised && raised.workspaceId === lineId && raised.targetAsset === 'Sealer' && raised.priority === 'high' && raised.owner === 'Dave' && raised.dueAt != null, '1 saved as a problem on the line — the Sealer, High, Dave, by when', JSON.stringify(raised && { ...raised, media: undefined }));
ok(JSON.stringify(raised?.tools) === JSON.stringify([{ studyId: id, part: 'w03', raised: true }]), '1 held by the record’s Sealer', JSON.stringify(raised?.tools));
ok(raised?.media?.length === 1 && raised.media[0].blobKey === photo?.blobKey, '1 carrying the very same photo file — a reference, not a copy', JSON.stringify(raised?.media));
const row = await page.evaluate(async s => (await import('/src/cloud/mappers.ts')).MAPS.snags.toRow(s, 'u').linked_obs_ids, raised);
ok(JSON.stringify(row) === JSON.stringify([`raised:${id}:w03`]), '1 the cloud row carries it as raised:<study>:w03 in its links, no column', JSON.stringify(row));

/* 2 — held inside the tool */
const chip3 = page.locator('[data-part-problems="w03"]');
ok(flat(await chip3.innerText().catch(() => '')) === '1 problem open', '2 the Sealer’s tile says 1 problem open', await chip3.innerText().catch(() => ''));
ok(await page.locator('[data-part-problems="w01"]').count() === 0, '2 the Filler’s tile says nothing — it holds none');
const sec = page.locator(`[data-tool-problems="${id}"]`);
const secT = flat(await sec.innerText().catch(() => ''));
ok(/Problems raised here/.test(secT) && /Sealer jaw trapping film/.test(secT) && /Sealer · High · with Dave · due \d+ \w+ · Open/.test(secT), '2 Problems raised here lists it — the Sealer, High, Dave, its day, Open', secT);

/* 3 — the count opens the problem; the problem says where it was raised */
await chip3.click(); await page.waitForTimeout(800);
const panel = page.locator(`[data-problem-panel="${raised.id}"]`);
ok(await panel.count() === 1, '3 the tile’s count opens the problem itself, over the tool');
const links = flat(await panel.locator('[data-tool-links]').innerText().catch(() => ''));
ok(/Raised from Stops across workstations — Cellox trial › Sealer/.test(links), '3 the problem says Raised from Stops across workstations — Cellox trial › Sealer', links);
await panel.locator('.tp-door').first().click(); await page.waitForTimeout(1200);
ok(page.url().includes(`/calc/workstation-stops/${id}?part=w03`) && await page.locator('[data-problem-panel]').count() === 0, '3 its door opens the record at the Sealer', page.url());

/* 4 — the Problems page and the line's Actions */
await page.goto(`${BASE}/#/snags`); await settle(1500);
const regRow = page.locator(`#problem-${raised.id} [data-raised-from]`);
ok(/Raised from Stops across workstations — Cellox trial › Sealer/.test(await regRow.innerText().catch(() => '')), '4 the Problems page’s row says Raised from …', await regRow.innerText().catch(() => ''));
await page.goto(`${BASE}/#/lines/${lineId}/actions`); await settle(1500);
ok(/Sealer jaw trapping film/.test(await page.locator('main').innerText()), '4 the line’s Actions list it');

/* 5 — link an existing problem from the record, unlink with Undo */
await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await settle(1500);
await more(page, 'Link a problem…'); await settle(500);
const ls = page.locator('[data-tp-link-sheet]');
const offered = flat(await ls.innerText().catch(() => ''));
ok(/Labeller drifting/.test(offered) && /Case packer trays jamming/.test(offered) && !/Guard loose on Line 9/.test(offered) && !/Sealer jaw trapping/.test(offered), '5 the line’s open problems not held here are offered, never another line’s', offered);
await ls.locator('.chip', { hasText: 'Filler' }).click();
await ls.locator(`[data-tp-pick="${ids.labeller}"]`).click(); await settle(700);
let lab = (await snags()).find(s => s.id === ids.labeller);
ok(JSON.stringify(lab?.tools) === JSON.stringify([{ studyId: id, part: 'w01' }]), '5 linked to the record’s Filler (not raised there)', JSON.stringify(lab?.tools));
ok(flat(await page.locator('[data-part-problems="w01"]').innerText().catch(() => '')) === '1 problem open', '5 the Filler’s tile counts it');
await page.locator(`[data-tool-problem="${ids.labeller}"] [data-tp-unlink]`).click(); await page.waitForTimeout(600);
lab = (await snags()).find(s => s.id === ids.labeller);
ok(!lab?.tools && await page.locator(`[data-tool-problem="${ids.labeller}"]`).count() === 0, '5 Unlink takes it off the record — the problem kept', JSON.stringify(lab?.tools));
await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(700);
lab = (await snags()).find(s => s.id === ids.labeller);
ok(JSON.stringify(lab?.tools) === JSON.stringify([{ studyId: id, part: 'w01' }]) && await page.locator(`[data-tool-problem="${ids.labeller}"]`).count() === 1, '5 Undo links it back to the Filler', JSON.stringify(lab?.tools));

/* 6 — from the problem's own editor */
await page.goto(`${BASE}/#/snags?open=${ids.casePacker}`); await settle(1500);
const ed = page.locator(`[data-tool-links="${ids.casePacker}"]`);
await ed.locator('[data-tp-link-record]').click(); await page.waitForTimeout(300);
await ed.locator('select[aria-label="Which tool record"]').selectOption({ label: 'Stops across workstations — Cellox trial' });
await ed.locator('select[aria-label="Which part of it"]').selectOption({ label: 'Packer' });
await ed.getByRole('button', { name: 'Link it' }).click(); await page.waitForTimeout(700);
const cp = (await snags()).find(s => s.id === ids.casePacker);
ok(JSON.stringify(cp?.tools) === JSON.stringify([{ studyId: id, part: 'w04' }]), '6 linked from the problem’s editor to the record’s Packer', JSON.stringify(cp?.tools));
ok(/Linked to Stops across workstations — Cellox trial › Packer/.test(flat(await ed.innerText())), '6 the editor says Linked to … › Packer');

/* 7 — kept after a reload */
await page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await settle(1500);
await page.reload(); await settle(1800);
const after = flat(await page.locator(`[data-tool-problems="${id}"]`).innerText().catch(() => ''));
ok(/3 open/.test(after) && /Sealer jaw/.test(after) && /Labeller drifting/.test(after) && /Case packer trays/.test(after), '7 all three held after a reload', after);
ok(flat(await page.locator('[data-part-problems="w04"]').innerText().catch(() => '')) === '1 problem open', '7 the Packer’s tile counts its one');

/* 8 — on paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(dir, 'stops.pdf'); await dl.saveAs(pdf);
const txt = flat(execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }));
const tail = txt.slice(txt.search(/Problems raised here/i));
ok(/Problems raised here/i.test(txt) && /3 open/.test(tail), '8 the paper has Problems raised here, 3 open', txt.slice(-900));
ok(/Filler.*Labeller drifting off the pack.*Low · nobody on it yet · no day agreed · Open/.test(tail), '8 under the Filler: its problem, Low, nobody yet, no day, Open', tail.slice(0, 700));
ok(/Packer.*Case packer trays jamming/.test(tail), '8 under the Packer: its problem');
ok(/Sealer.*Sealer jaw trapping film on every third pack.*High · with Dave · due \d+ \w+ · Open/.test(tail), '8 under the Sealer: its words, High, Dave, its day, Open', tail.slice(0, 900));
await page.goto(`${BASE}/#/snags`); await settle(1500);
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), pressPaper(page, 'Problems report')]);
const pdf2 = join(dir, 'problems.pdf'); await dl2.saveAs(pdf2);
const txt2 = flat(execFileSync('pdftotext', ['-raw', pdf2, '-'], { encoding: 'utf8' }));
ok(/Raised from Stops across workstations.{1,5}Cellox trial.{1,5}Sealer/.test(txt2) && /Linked to Stops across workstations.{1,5}Cellox trial.{1,5}Packer/.test(txt2), '8 the Problems report says where each was raised from or is linked to', txt2.slice(0, 800));

/* 9 — a client sees and cannot raise, link or unlink */
{
  const cl = await device(1360, 900, 'client');
  await cl.page.goto(`${BASE}/#/room`); await cl.page.waitForTimeout(2500);
  const c = await cl.page.evaluate(async (inputs) => {
    const db = await import('/src/db.ts');
    const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
    const t = Date.now(), sid = crypto.randomUUID();
    await db.putStudy({ id: sid, tool: 'calc', name: 'Client view', projectId: sd.projectId, workspaceId: sd.wsId, uses: [], startedAt: t, createdAt: t, updatedAt: t, facts: {}, agreed: { calc: { key: 'workstation-stops', inputs } } });
    const pid = crypto.randomUUID();
    await db.addSnag({ id: pid, workspaceId: sd.wsId, projectId: sd.projectId, problem: 'Sealer jaw worn', status: 'open', raisedAt: t, updatedAt: t, tools: [{ studyId: sid, part: 'w03', raised: true }] });
    return { sid, pid };
  }, STOPS);
  await cl.page.goto(`${BASE}/#/calc/workstation-stops/${c.sid}`); await cl.settle(1800);
  const cs = cl.page.locator(`[data-tool-problems="${c.sid}"]`);
  ok(/Sealer jaw worn/.test(await cs.innerText().catch(() => '')) && /1 problem open/.test(await cl.page.locator('[data-part-problems="w03"]').innerText().catch(() => '')), '9 a client sees the problem held on the Sealer');
  ok(await cs.locator('[data-tp-raise], [data-tp-link], [data-tp-unlink]').count() === 0 && await cl.page.locator('[data-attach-problem]').count() === 0, '9 and has nothing to raise, link or unlink with');
  const menuB = cl.page.locator('main .part-menu-b', { hasText: /^More/ });
  let items = '';
  if (await menuB.count()) { await menuB.first().click(); items = await cl.page.locator('[role=menu]').innerText().catch(() => ''); await cl.page.keyboard.press('Escape'); }
  ok(!/Raise a problem here|Link a problem/.test(items), '9 More ▾ offers a client neither', items);
  await cl.page.locator('[data-part-problems="w03"]').click(); await cl.page.waitForTimeout(800);
  const cpanel = cl.page.locator(`[data-problem-panel="${c.pid}"] [data-tool-links]`);
  ok(/Raised from Stops across workstations — Client view › Sealer/.test(flat(await cpanel.innerText().catch(() => ''))) && await cpanel.locator('[data-tp-unlink], [data-tp-link-record]').count() === 0, '9 the problem says where it was raised, with no Unlink or Link for a client', await cpanel.innerText().catch(() => ''));
  await cl.ctx.close();
}

/* 10 — the phone */
{
  const ph = await device(390, 800);
  await ph.page.goto(`${BASE}/#/room`); await ph.page.waitForTimeout(2000);
  const st = await study(id);
  const all = await snags();
  await ph.page.evaluate(async ({ s, list }) => { const db = await import('/src/db.ts'); await db.putStudy(s); for (const x of list) await db.addSnag(x); }, { s: st, list: all });
  await ph.page.goto(`${BASE}/#/calc/workstation-stops/${id}`); await ph.page.waitForTimeout(2200);
  const h = await ph.page.locator('[data-part-problems]').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
  ok(h.length === 3 && h.every(x => x >= 43), '10 each count a thumb’s height on the phone', h.join(','));
  const rows = await ph.page.locator('.tp-open, .tp-unlink, .tp-acts .btn').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)).filter(x => x > 0));
  ok(rows.length >= 5 && rows.every(x => x >= 43), '10 the rows, Unlink, Raise and Link a thumb’s height', rows.join(','));
  await ph.page.locator('.calc-tile[data-tile="2"] [data-attach-open]').click(); await ph.page.waitForTimeout(600);
  const rh = await ph.page.locator('[data-attach-problem]').evaluate(e => Math.round(e.getBoundingClientRect().height)).catch(() => 0);
  ok(rh >= 43, '10 the sheet’s Raise a problem here a thumb’s height', String(rh));
  const wide = await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(wide <= 1, '10 nothing off the side', String(wide));
  await ph.ctx.close();
}

ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nProblems raised from inside a tool accepted: raised on a part with its picture, held there and on Problems, linked both ways, on paper, a client reads, the phone fits');
process.exit(fail ? 1 : 0);
