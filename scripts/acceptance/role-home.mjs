/* ACCEPTANCE — WHAT EACH ROLE SEES FIRST, AND LUNA ACROSS THE BUSINESS (11 November, docs/ORGANISATION.md O4 · O4b — Rowland: "Luna must
 * be useful both to someone standing beside a production machine and someone sitting in the boardroom … A team leader must not
 * automatically have access to everything a managing director can see"). The role tried on by 'faultline.access.force' (development
 * only), the scope by the person's own row in the business; the gateway and the database's functions played by the script:
 *
 *   1  no business: Today as it was — the lines, no business section, the sentence of old
 *   2  a leader (the business made, Acme Foods): one row a site › area, each as org/roleHome businessRows says over the lines' open
 *      problems and their stops this week (org/businessFigures lossesOnDevice) — 30 minutes timed on a Packing hall line with a crew of
 *      4 at £15 an hour said as 30 min and £30; a row opening its area; the sentence naming the business
 *   3  a team leader in Packing hall: Your area — only Packing hall's lines; what they owe today first (their name on a problem past its
 *      day); a problem raised on a Despatch line never named; the projects only those on their lines
 *   4  a manager in the same scope: Your lines this week, each line's loss in the module's words; What your people owe by name
 *   5  Luna's business_summary through the gateway: the database's functions answering (the rows the script serves) — said "Worked out in
 *      the database", the period and the scope; the cloud cut — the device's own sum, said so, the minutes the device's
 *   6  a phone (390): the rows a thumb's height, nothing off the side
 *
 *   node scripts/acceptance/role-home.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const areas = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedAreasForTest());
const ME = { id: '11111111-1111-1111-1111-111111111111', email: 'acceptance@example.com' };
const CORS = { 'access-control-allow-origin': '*' };
await page.evaluate(() => { localStorage.setItem('faultline.lunaPanel', 'closed'); localStorage.removeItem('faultline.access.force'); });
/* the role is read as the page starts: Today opened afresh each time it changes */
const today = async (ms = 3500) => { await t.go('#/today', 300); await page.reload(); await page.waitForTimeout(ms); };

/* ---- 1 · no business ---- */
await today(3000);
ok((await page.locator('[data-today-lines]').count()) === 1 && (await page.locator('[data-today-business]').count()) === 0
  && /^(What wants you today|What do you want to understand or get done)/.test(await t.words('[data-today] .pace-lede')), `1 no business: Today as it was ("${(await t.words('[data-today] .pace-lede')).slice(0, 60)}")`);

/* a crew and wage on a Packing hall line, 30 minutes of stops this week; a problem on a Despatch line; one owed by Sam past its day */
const P = areas.packingIds[0], D = areas.despatchIds[0];
await page.evaluate(async ({ P, D }) => {
  const db = await import('/src/db.ts');
  const w = await db.getWorkspace(P); await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, labourBurden: 1 });
  const now = Date.now();
  await db.addObservation({ id: crypto.randomUUID(), workspaceId: P, category: 'Jam', asset: 'Bagger', startedAt: now - 120_000, durationMs: 30 * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: now, updatedAt: now });
  await db.addSnag({ id: `rh-d-${now}`, workspaceId: D, assetId: '', xPct: 0, yPct: 0, problem: 'Despatch dock door sticking', priority: 'critical', status: 'open', raisedAt: now, linkedObsIds: [], updatedAt: now });
  await db.addSnag({ id: `rh-p-${now}`, workspaceId: P, assetId: '', xPct: 0, yPct: 0, problem: 'Change the bagger knife', priority: 'high', status: 'open', owner: 'Sam', dueAt: now - 2 * 86_400_000, raisedAt: now - 3 * 86_400_000, linkedObsIds: [], updatedAt: now });
}, { P, D });

/* ---- 2 · a leader ---- */
await page.evaluate(async me => { (await import('/src/org/orgData.ts')).ensureBusiness(me, 'Acme Foods'); localStorage.setItem('faultline.access.force', 'leader'); }, ME);
await today();
const shownAreas = await page.$$eval('[data-today-area]', els => els.map(e => ({ title: e.getAttribute('data-today-area'), says: e.querySelector('[data-today-area-says]')?.textContent ?? '', tag: e.querySelector('.part-tag')?.textContent ?? '', href: e.getAttribute('href') })));
const wantAreas = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { businessRows } = await import('/src/org/roleHome.ts'); const { lossesOnDevice, weekStart } = await import('/src/org/businessFigures.ts');
  const ls = await liveProductionLines(await db.listWorkspaces()); const now = Date.now();
  const obs = (await Promise.all(ls.map(l => db.listObservations(l.id)))).flat();
  const losses = lossesOnDevice(ls, obs, weekStart(now), now + 1);
  const sn = (await db.listAllSnags()).filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed');
  return businessRows(ls, id => { const m = sn.filter(s => s.workspaceId === id); return { open: m.length, critical: m.filter(s => s.priority === 'critical').length }; }, id => losses.find(l => l.workspaceId === id));
});
ok((await page.locator('[data-today-business]').count()) === 1 && (await page.locator('[data-today-lines]').count()) === 0, '2 a leader: the business, not the list of lines');
ok(shownAreas.length === wantAreas.length && shownAreas.every((a, i) => a.title === wantAreas[i].title && a.says === wantAreas[i].says && a.tag === wantAreas[i].word),
  `2 an area a row, each as businessRows says: ${shownAreas.map(a => `${a.title} — ${a.says}`).join(' | ')}`);
const ph = shownAreas.find(a => a.title === 'Hull › Packing hall');
const p2 = await page.evaluate(async P => {
  const db = await import('/src/db.ts'); const { lossesOnDevice, weekStart } = await import('/src/org/businessFigures.ts');
  const w = await db.getWorkspace(P); const now = Date.now();
  return lossesOnDevice([w], await db.listObservations(P), weekStart(now), now + 1)[0];
}, P);
ok(!!ph && /min lost this week · £/.test(ph.says) && p2.minutes >= 30 && p2.labour === Math.round(p2.minutes * 100) / 100,
  `2 Packing hall's money — the line given 4 at £15 an hour prices its minutes at £1 a minute (${p2.minutes} min = £${p2.labour}); "${ph?.says}"`);
ok(/^Acme Foods: each area/.test(await t.words('[data-today] .pace-lede')), '2 the sentence names the business');
await page.locator('[data-today-area="Hull › Packing hall"]').click(); await page.waitForTimeout(1500);
ok(decodeURIComponent(await page.evaluate(() => location.hash)).startsWith('#/area?site=Hull&area=Packing'), '2 a row opens its area');

/* ---- 3 · a team leader in Packing hall ---- */
await page.evaluate(async me => {
  const db = (await import('/src/db/core.ts')); const g = await db.getDB();
  const id = `${me.id}:${me.email}`; const m = await g.get('organisation_members', id);
  await g.put('organisation_members', { ...m, areas: ['Packing hall'], updatedAt: Date.now() });
  localStorage.setItem('faultline.access.force', 'team'); localStorage.setItem('faultline.forYou.name', 'Sam');
  localStorage.setItem('faultline.today.seen', String(Date.now() - 86_400_000));
}, ME);
await today();
const teamLines = await page.$$eval('[data-today-line]', els => els.map(e => e.getAttribute('data-today-line')));
ok(/^Your area/i.test(await t.words('[data-today-lines] .today-h')) && teamLines.length === areas.packingIds.length && teamLines.every(id => areas.packingIds.includes(id)) && !teamLines.includes(D),
  `3 a team leader: only Packing hall's lines (${teamLines.length} of ${areas.packingIds.length}, no Despatch)`);
ok(/^Your area — Packing hall:/.test(await t.words('[data-today] .pace-lede')), '3 the sentence names their area');
const brief3 = await page.$$eval('[data-brief]', els => els.map(e => ({ key: e.getAttribute('data-brief'), says: e.querySelector('.today-brief-says')?.textContent ?? '' })));
ok(brief3[0]?.key === 'owe' && /with your name on it today, 1 past its day — first “Change the bagger knife”/.test(brief3[0].says), `3 what they owe today first: "${brief3[0]?.says}"`);
ok(!brief3.some(b => /Despatch dock door/.test(b.says)), '3 a problem on a Despatch line never named');
const projIds = await page.$$eval('[data-today-project]', els => els.map(e => e.getAttribute('data-today-project')));
const projOk = await page.evaluate(async ({ ids, lines }) => {
  const pace = await import('/src/db/pace.ts'); const jl = await pace.allPaceLines(); const db = await import('/src/db.ts');
  return Promise.all(ids.map(async id => { const p = await db.getProject(id); return [...(p?.workspaceIds ?? []), ...jl.filter(l => !l.deletedAt && l.projectId === id).map(l => l.workspaceId)].some(w => lines.includes(w)); }));
}, { ids: projIds, lines: areas.packingIds });
ok(projOk.every(Boolean), `3 the projects only those on their lines (${projIds.length})`);

/* ---- 4 · a manager in the same scope ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'manager'));
await today();
const losses4 = await page.$$eval('[data-today-line]', els => els.map(e => ({ id: e.getAttribute('data-today-line'), loss: e.querySelector('[data-today-loss]')?.textContent ?? '' })));
const want4 = await page.evaluate(async ids => {
  const db = await import('/src/db.ts'); const { lossShort } = await import('/src/org/roleHome.ts'); const { lossesOnDevice, weekStart } = await import('/src/org/businessFigures.ts');
  const ls = (await db.listWorkspaces()).filter(w => ids.includes(w.id)); const now = Date.now();
  const r = lossesOnDevice(ls, (await Promise.all(ls.map(l => db.listObservations(l.id)))).flat(), weekStart(now), now + 1);
  return Object.fromEntries(ids.map(id => [id, lossShort(r.find(x => x.workspaceId === id)) ?? 'no stop timed this week']));
}, losses4.map(l => l.id));
const head4 = await t.words('[data-today-lines] .today-h');
ok(/Your lines this week/i.test(head4) && losses4.length >= 1 && losses4.every(l => l.loss === want4[l.id]) && losses4.some(l => /min lost · £/.test(l.loss)),
  `4 a manager: each line's loss this week as the module says (${losses4.map(l => l.loss).join(' · ')}; wanted ${losses4.map(l => want4[l.id]).join(' · ')}; heading "${head4}")`);
ok((await page.locator('[data-today-people] [data-today-person="Sam"]').count()) === 1, `4 what their people owe, by name (${await t.words('[data-today-people]')})`);

/* ---- 5 · Luna's business_summary ---- */
await page.evaluate(async me => {
  const g = await (await import('/src/db/core.ts')).getDB(); const id = `${me.id}:${me.email}`; const m = await g.get('organisation_members', id);
  await g.put('organisation_members', { ...m, areas: [], updatedAt: Date.now() }); localStorage.setItem('faultline.access.force', 'leader');
}, ME);
const asks = []; let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON(); asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: true, reply: 'Noted.' }) });
});
const rpcs = [];
const RPC = {
  luna_losses_by_line: [{ workspace_id: P, line: 'Line 7', site: 'Hull', area: 'Packing hall', stops: 6, timed: 6, minutes: 95.5, labour: 95.5 }],
  luna_problems_by_area: [{ site: 'Hull', area: 'Despatch', priority: 'critical', open: 1, late: 0, minutes_per_day: 0, with_minutes: 0, lines: 1 }],
  luna_actions_late: [{ who: 'Sam', late: 1, oldest_due: Date.now() - 2 * 86_400_000, lines: 1 }],
  luna_output_by_line: [],
  can_start_projects: true,   /* the frame's own question (cloud/access) — asked by Faultline's environment bar too */
};
await page.route('**/rest/v1/rpc/*', async r => {
  const fn = r.request().url().split('/rpc/')[1].split('?')[0]; rpcs.push({ fn, args: r.request().postDataJSON() });
  if (RPC[fn]) return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(RPC[fn]) });
  return r.fulfill({ status: 404, contentType: 'application/json', headers: CORS, body: JSON.stringify({ code: 'PGRST202', message: `Could not find the function public.${fn}` }) });
});
const calls = (...cs) => () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const then = reply => () => ({ ok: true, reply });
let replies = 0;
const answered = async (ms = 15000) => { replies++; await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), replies, { timeout: ms }).catch(() => undefined); await page.waitForTimeout(700); };
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
await t.go('#/ai', 2500);
plan = [calls(['b', 'business_summary', { period: 'week' }]), then('Line 7 lost the most this week.')];
await send('Which lines lost most this week across the business?'); await answered();
const said5 = asks.at(-1)?.pending?.results?.[0]?.says ?? '';
const lunaRpcs = rpcs.filter(r => r.fn.startsWith('luna_'));
ok(lunaRpcs.map(r => r.fn).join(',') === 'luna_losses_by_line,luna_problems_by_area,luna_actions_late,luna_output_by_line' && typeof lunaRpcs[0]?.args.p_from === 'number' && !!lunaRpcs[0]?.args.p_org,
  `5 the database's four functions called with the period and the business (${lunaRpcs.map(r => r.fn).join(', ')})`);
ok(/^Worked out in the database over every line you may read \(your access decides which\) — as Leader across Acme Foods\. Stops this week \(/.test(said5)
  && /Line 7 \(Hull › Packing hall\) 6 stops · 95\.5 min · £96 of idle labour/.test(said5) && /Open problems now: 1 — Hull › Despatch 1 \(1 critical\)/.test(said5)
  && /Owed past its day now \([^)]+\): Sam 1/.test(said5) && /Output against target this week \([^)]+\): no production record imported for these lines/.test(said5),
  `5 said from the database with its scope and period: "${said5.slice(0, 220)}…"`);
await page.unroute('**/rest/v1/rpc/*');
plan = [calls(['b2', 'business_summary', { about: 'losses' }]), then('On this device, Line 7 lost 30 minutes.')];
await send('And offline?'); await answered();
const said5b = asks.at(-1)?.pending?.results?.[0]?.says ?? '';
const pSays = await page.evaluate(async P => (await import('/src/org/businessFigures.ts')).lossSays((await (await import('/src/org/businessFigures.ts')).lossesOnDevice([await (await import('/src/db.ts')).getWorkspace(P)], await (await import('/src/db.ts')).listObservations(P), (await import('/src/org/businessFigures.ts')).weekStart(Date.now()), Date.now() + 1))[0]), P);
ok(/^Worked out on this device from the records it holds — as Leader across Acme Foods\. Stops this week/.test(said5b) && said5b.includes(pSays) && /\(Not from the database: /.test(said5b),
  `5 the cloud cut: the device's own sum, said so, the line's as lossSays has it ("${pSays}")`);

/* ---- 6 · a phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await today(3000);
const small = await page.$$eval('[data-brief], [data-today-area], [data-today-project]', els => els.filter(e => e.getBoundingClientRect().height < 44).length);
ok((await page.locator('[data-today-area]').count()) >= 2 && small === 0 && (await t.wide()) <= 0, `6 a phone: the business's rows a thumb's height, nothing off the side (${small} small)`);
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

await t.finish('Today by role — a team leader’s area, a manager’s lines, a leader’s business; Luna across the business from the database, the device offline.');
