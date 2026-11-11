/* ACCEPTANCE — ONE ACTIVE CLIENT EVERYWHERE (11 November, docs/CONSULTANT-WORKSPACE.md C1; lib/activeClient, ui/ClientSwitch — Rowland:
 * "I need to be able to move between these businesses without losing context or mixing their information … Client information must
 * remain properly separated"). Driven in a real browser on the smoke seed:
 *
 *   1  one client: every line named Branston — no client in the top bar, the Lines tab titled Branston, the greeting as today
 *   2  a second business added the way a consultant adds one (Business B, Leeds, Packing, Line 1) with a problem, a project, a machine
 *      and a study of its own — the top bar names the active client and offers each and All clients
 *   3  Branston active: Today, Problems, Actions (and its paper read back), Projects, the bell, search, Go to ▾, Machines, the Tools
 *      count and a tool's list show none of Business B's records; then Business B active: none of Branston's — each changed live
 *   4  All clients: both shown, each row saying whose; the Actions paper saying it covers all clients
 *   5  a deep link to Business B's line with Branston active: the page opens and the bar follows it to Business B; kept after a reload
 *   6  the phone: the bar's client control 44 px, nothing off the side
 *
 *   node scripts/acceptance/active-client.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();

/* 1 — ONE CLIENT: every line of the seed is Branston's */
const branstonLines = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const ls = await liveProductionLines(await db.listWorkspaces());
  for (const w of ls) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln', areaName: 'Packing' });
  /* a Branston problem of Sam's, late — the bell's and Actions' row of hers */
  const t0 = Date.now();
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: ls[0].id, problem: 'BR-ONLY seal leaks on the end crimp', status: 'open', priority: 'high', owner: 'Sam',
    dueAt: t0 - 2 * 86_400_000, raisedAt: t0 - 60_000, updatedAt: t0 });
  localStorage.setItem('faultline.forYou.name', 'Sam');
  return ls.map(w => ({ id: w.id, name: w.name }));
});
await page.reload(); await page.waitForTimeout(1500);   /* the bell reads whose name this device is once, when the app opens */
await t.go('#/room', 3000);
const greetingRe = /^Good (morning|afternoon|evening)$/;
ok((await page.locator('.nv-client').count()) === 0 && (await t.words('.part-head h1')) === 'Branston',
  `1 one client: no client in the top bar, the Lines tab titled "${await t.words('.part-head h1')}"`);
await t.go('#/today', 2500);
ok(greetingRe.test(await t.words('.part-head h1')), `1 Today greets as before: "${await t.words('.part-head h1')}" (no name known)`);
await t.go('#/snags', 3000);
const oneClientProblems = await page.locator('.qsl-what').count();
ok(oneClientProblems > 0 && (await page.locator('.qsl-meta', { hasText: 'Branston' }).count()) === 0, `1 Problems as before: ${oneClientProblems} rows, none labelled with a client`);

/* 2 — A SECOND BUSINESS, with records of its own */
const b = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { addLineToFactory } = await import('/src/lib/lines.ts');
  const w = await addLineToFactory('Line 1', 'Packing');
  await db.patchWorkspaceRecord(w.id, { clientName: 'Business B', siteName: 'Leeds', areaName: 'Packing', assets: ['B-ONLY Bagger'] });
  const t0 = Date.now();
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: w.id, problem: 'B-ONLY bags not opening on the bagger', status: 'open', priority: 'critical', owner: 'Sam',
    dueAt: t0 - 86_400_000, raisedAt: t0 - 30_000, updatedAt: t0 });
  const p = await db.createProject('B-ONLY packing performance', '#2563eb', 'Rowland', undefined, 'board', 'pdca');
  await db.updateProject({ ...p, workspaceIds: [w.id] });
  await db.addPaceLine({ projectId: p.id, workspaceId: w.id, key: 'L1', name: 'Line 1', sort: 0 });
  await db.putStudy({ id: crypto.randomUUID(), tool: 'capability', name: 'B-ONLY bag weight', workspaceId: w.id, machine: 'B-ONLY Bagger',
    agreed: { readings: { kind: 'limits', unit: 'g', nominal: 500, lower: 495, upper: 515, count: 5 } },
    facts: { readings: [501, 503, 500, 502, 504].map((value, i) => ({ id: crypto.randomUUID(), value, at: t0 - (5 - i) * 60_000, who: 'Sam' })) },
    uses: [], startedAt: t0 - 6 * 60_000, createdAt: t0, updatedAt: t0 });
  return { line: w.id, project: p.id };
});
const choose = async name => {
  await page.locator('.nv-client-b').click(); await page.waitForTimeout(200);
  await page.locator('.nv-client-list [role=menuitemradio]', { hasText: name }).first().click(); await page.waitForTimeout(1200);
};
await t.go('#/room', 3000);
await choose('Branston');
const menuItems = async () => { await page.locator('.nv-client-b').click(); await page.waitForTimeout(200); const x = await page.locator('.nv-client-list [role=menuitemradio] b').allInnerTexts(); await page.keyboard.press('Escape'); return x; };
const items = await menuItems();
ok(await t.words('.nv-client-l') === 'Branston' && JSON.stringify(items) === JSON.stringify(['Branston', 'Business B', 'All clients']),
  `2 two clients: the top bar says "${await t.words('.nv-client-l')}", its menu ${items.join(' · ')}`);
ok((await t.words('.part-head h1')) === 'Branston', '2 the Lines tab still titled Branston with Branston active');

/* 3 — EACH PAGE CARRIES ONLY THE ACTIVE CLIENT'S */
const body = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const bell = async () => Number((await page.locator('.nv-bell').getAttribute('data-for-you')) || 0);
const search = async q => {
  await page.locator('.nv-jump').click(); await page.waitForTimeout(500);
  await page.locator('.jt-in').fill(q); await page.waitForTimeout(500);
  const hits = await page.locator('.jt-row').allInnerTexts();
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  return hits.map(h => h.replace(/\s+/g, ' '));
};
const goTo = async () => {
  await page.locator('.nv-goto').click(); await page.waitForTimeout(400);
  const rows = await page.locator('.nv-sw-i b').allInnerTexts();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  return rows;
};
const capabilityUsed = async () => {
  const cell = page.locator('.tc-cell', { hasText: 'Capability' }).first();
  const said = (await cell.locator('.tc-used').count()) ? (await cell.locator('.tc-used').first().innerText()).trim() : '';
  return Number(/Used · (\d+)/.exec(said)?.[1] ?? 0);
};
const actionsPaper = async () => t.pdfText(() => paper(page, 'The action list'), 'actions');

const looks = {};
for (const [who, mine, theirs] of [['Branston', 'BR-ONLY', 'B-ONLY'], ['Business B', 'B-ONLY', 'BR-ONLY']]) {
  await t.go('#/room', 2500);
  await choose(who);
  ok((await t.words('.nv-client-l')) === who && (await t.words('.part-head h1')) === who, `3 ${who} chosen: the bar and the Lines tab say ${who}`);
  await t.go('#/today', 3000);
  let txt = await body();
  const todayLines = await page.locator('[data-today-line]').evaluateAll(els => els.map(e => e.getAttribute('data-today-line')));
  ok(!txt.includes(theirs) && (who === 'Business B' ? txt.includes('B-ONLY') && JSON.stringify(todayLines) === JSON.stringify([b.line])
    : todayLines.length > 0 && !todayLines.includes(b.line) && todayLines.every(id => branstonLines.some(l => l.id === id))),
    `3 ${who} — Today: ${todayLines.length} line${todayLines.length === 1 ? '' : 's'}, all ${who}’s, none of the other's records`);
  await t.go('#/snags', 3000);
  const probs = await page.locator('.qsl-what').allInnerTexts();
  ok(probs.some(p => p.includes(mine)) && !probs.some(p => p.includes(theirs)) && (who === 'Branston' ? probs.length === oneClientProblems : probs.length === 1),
    `3 ${who} — Problems: ${probs.length} rows, its own and none of the other's`);
  await t.go('#/actions', 3500);
  txt = await body();
  ok(txt.includes(mine) && !txt.includes(theirs) && txt.includes(who.toUpperCase()), `3 ${who} — Actions: its own, none of the other's, the eyebrow naming ${who}`);
  const pdf = await actionsPaper();
  ok(pdf.includes(mine) && !pdf.includes(theirs) && pdf.includes(`Every project and line - ${who}`), `3 ${who} — the action list on paper: its own, none of the other's, the band naming ${who}`);
  await t.go('#/projects', 3000);
  txt = await body();
  ok((who === 'Business B') === txt.includes('B-ONLY packing performance') && (who === 'Business B' ? !txt.includes('Line 7') : true), `3 ${who} — Projects: ${who === 'Business B' ? 'its project only' : 'not Business B’s project'}`);
  looks[who] = { bell: await bell() };
  ok(looks[who].bell === 1, `3 ${who} — the bell counts Sam's ${looks[who].bell} (her one late action of ${who}'s)`);
  const hits = await search('ONLY');
  ok(hits.some(h => h.includes(mine)) && !hits.some(h => h.includes(theirs)), `3 ${who} — search "ONLY": ${hits.length} hits, none of the other's`);
  const rows = await goTo();
  ok(who === 'Business B' ? rows.includes('Line 1') && !branstonLines.some(l => rows.includes(l.name)) : !rows.includes('Line 1') && rows.includes(branstonLines[0].name),
    `3 ${who} — Go to ▾: ${who === 'Business B' ? 'Line 1 and none of Branston’s lines' : 'Branston’s lines, not Line 1'}`);
  await t.go('#/machines', 3000);
  txt = await body();
  ok((who === 'Business B') === txt.includes('B-ONLY Bagger'), `3 ${who} — Machines: ${who === 'Business B' ? 'the B-ONLY Bagger' : 'no Business B machine'}`);
  await t.go('#/tools', 3000);
  looks[who].used = await capabilityUsed();
  await t.go('#/capability', 3000);
  txt = await body();
  ok((who === 'Business B') === txt.includes('B-ONLY bag weight'), `3 ${who} — the capability list: ${who === 'Business B' ? 'its study' : 'not Business B’s study'}`);
}
ok(looks['Business B'].used === 1, `3 the Tools count follows the client: Capability used ${looks.Branston.used} at Branston, ${looks['Business B'].used} at Business B`);

/* 4 — ALL CLIENTS: both, each saying whose */
await t.go('#/room', 2500);
await choose('All clients');
ok((await t.words('.nv-client-l')) === 'All clients' && (await t.words('.part-head h1')) === 'Factory', '4 All clients: the bar says so, the Lines tab titled Factory');
await t.go('#/snags', 3000);
const metaOf = async what => t.norm(await page.locator('.qsl-row', { hasText: what }).first().locator('.qsl-meta').first().innerText());
const bMeta = await metaOf('B-ONLY'), brMeta = await metaOf('BR-ONLY');
ok(bMeta.startsWith('Business B') && brMeta.startsWith('Branston'), `4 Problems: both, each saying whose ("${bMeta}" · "${brMeta}")`);
await t.go('#/actions', 3500);
const txtAll = await body();
ok(txtAll.includes('B-ONLY') && txtAll.includes('BR-ONLY') && /Business B · /.test(txtAll) && /Branston · /.test(txtAll), '4 Actions: both, each row naming its client');
const pdfAll = await actionsPaper();
ok(pdfAll.includes('Every project and line - All clients') && pdfAll.includes('B-ONLY') && pdfAll.includes('BR-ONLY') && pdfAll.includes('Business B ·'), '4 the action list on paper says it covers all clients, each row naming its client');
ok((await bell()) === 2, `4 the bell counts both of Sam's (${await bell()})`);
await t.go('#/tools', 3000);
const usedAll = await capabilityUsed();
ok(usedAll >= looks.Branston.used + 1, `4 the Tools count under All clients: Capability used ${usedAll} — Branston's ${looks.Branston.used}, Business B's 1 and ${usedAll - looks.Branston.used - 1} on projects on no line (no client's, shown under All clients only)`);
await t.go('#/projects', 3000);
ok((await page.locator('.part-row', { hasText: 'B-ONLY packing performance' }).first().innerText()).includes('Business B'), '4 Projects: Business B’s project says whose');

/* 5 — A DEEP LINK TO BUSINESS B'S LINE WITH BRANSTON ACTIVE: the bar follows it */
await choose('Branston');
await t.go(`#/lines/${b.line}`, 3500);
ok((await t.words('.nv-client-l')) === 'Business B' && (await t.words('.nv-here')) === 'Line 1', `5 a deep link to Business B's Line 1 opens it and the bar follows: "${await t.words('.nv-client-l')}"`);
await t.go('#/snags', 3000);
ok((await page.locator('.qsl-what', { hasText: 'BR-ONLY' }).count()) === 0 && (await page.locator('.qsl-what', { hasText: 'B-ONLY' }).count()) === 1, '5 …and every page then shows Business B’s');
await page.reload(); await page.waitForTimeout(3000);
ok((await t.words('.nv-client-l')) === 'Business B' && (await page.locator('.qsl-what', { hasText: 'BR-ONLY' }).count()) === 0, '5 kept after a reload');

/* 6 — THE PHONE */
await page.setViewportSize({ width: 390, height: 844 });
for (const h of ['#/today', '#/snags', `#/lines/${b.line}`]) {
  await t.go(h, 2500);
  const box = await page.locator('.nv-client-b').boundingBox();
  ok(!!box && box.height >= 44 && (await t.wide()) <= 1, `6 the phone, ${h}: the client control ${box ? Math.round(box.height) : 0} px high, nothing off the side`);
}
await page.locator('.nv-client-b').click(); await page.waitForTimeout(300);
await page.locator('.nv-client-list [role=menuitemradio]', { hasText: 'Branston' }).click(); await page.waitForTimeout(2500);
ok((await t.words('.nv-client-l')) === 'Branston' && page.url().includes('#/room') && (await t.words('.part-head h1')) === 'Branston',
  '6 Branston chosen on the phone on Business B’s line: the page goes to Branston’s Lines tab, never left on the other client’s page');

await t.finish('One active client accepted: named and switched in the top bar, every list and the action list on paper carrying that client’s records only, All clients naming whose each row is, a deep link moving the bar to its client, kept after a reload and on the phone.');
