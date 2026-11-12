/* ACCEPTANCE — VISITS AND THE CONSULTANT'S HOME (11 November, docs/CONSULTANT-WORKSPACE.md C3; lib/visits, ui/StartVisit, ui/VisitBadge,
 * screens/VisitScreen, screens/ConsultantHome, lib/report/visitPaper — Rowland: "I receive a phone call: 'Can you come to our factory
 * tomorrow …' … I need to be able to start working immediately … Client information must remain properly separated").
 * Driven in a real browser on the smoke seed, every line Branston's:
 *
 *   1  the Story's More ▾ › Start a visit — ＋ A new customer (Business B, Leeds) with what we were asked; the visit's page opens, the top bar
 *      saying Business B and Visit <day>, the visit kept on Business B's story and in hand on this device
 *   2  ＋ Problem with no line: the sheet holds it at Business B (not yet placed) — no line invented, a photo chosen and kept on it
 *   3  a Branston problem raised in the same hours, and a stop timed on Business B's line once it is made — the line discovered on Set up the
 *      lines takes Business B; the held problem placed on it from the visit's page
 *   4  End the visit (the bar's menu): the page lists exactly the day's records of Business B — the problem with its line, the photo, the
 *      stop timed — and none of Branston's; the bar no longer says a visit
 *   5  Make the visit report: the PDF read back (the band, For Business B, what we were asked, what we found, the photo as an image, what the
 *      figures rest on) and nothing of Branston's
 *   6  the consultant's home at #/: Good morning, a row a customer (its engagement, last visit, open in words), recent visits, Start a visit
 *   7  back at Branston from its row: its Story; Problems with nothing of Business B
 *   8  kept after a reload — the home's visit, the visit's page
 *   9  the phone: the home and the visit page nothing off the side, Start a visit 44 px
 *
 *   node scripts/acceptance/visits.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { more } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
page.on('dialog', d => void d.accept());
await t.seed();
const branston = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const ls = await liveProductionLines(await db.listWorkspaces());
  for (const w of ls) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
  return { line: ls[0].id, name: ls[0].name };
});
await page.reload(); await page.waitForTimeout(1500);

/* 1 — START A VISIT AT A NEW CUSTOMER */
await t.go('#/story', 3000);
await more(page, 'Start a visit'); await page.waitForTimeout(500);
await page.locator('[data-visit-new-customer]').click();
await page.getByLabel('The new customer’s name').fill('Business B');
await page.getByLabel('The site').fill('Leeds');
await page.getByLabel('What you were asked at the door').fill('Look at packing performance — nights are worst');
await page.locator('[data-visit-start]').click(); await page.waitForTimeout(2500);
const v = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { visitsOf, storedVisit } = await import('/src/lib/visits.ts');
  const vs = visitsOf(await db.listAllStudies());
  return { vs: vs.map(x => ({ id: x.id, client: x.client, site: x.site, brief: x.brief, ended: x.endedAt != null })), hand: storedVisit() };
});
const visit = v.vs[0];
ok(v.vs.length === 1 && visit.client === 'Business B' && visit.site === 'Leeds' && /packing performance/.test(visit.brief ?? '') && v.hand?.id === visit.id,
  `1 the visit kept on Business B’s story and in hand on this device (${JSON.stringify(v.vs)})`);
ok(page.url().includes(`#/visit/${visit.id}`) && (await page.locator('[data-visit-state="in-hand"]').count()) === 1, '1 the visit’s page opens, in hand');
const dayWord = await page.evaluate(() => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
ok((await t.words('.nv-client-l')) === 'Business B' && (await t.words('.nv-visit-l')) === `Visit ${dayWord}`, `1 the top bar: "${await t.words('.nv-client-l')}" and "${await t.words('.nv-visit-l')}"`);
ok(/packing performance/.test(await t.words('[data-visit-brief]')), '1 what we were asked, on the page');

/* 2 — A PROBLEM AND A PHOTO WITH NO LINE */
const jpeg = Buffer.from((await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#c4281c'; x.fillRect(0, 0, 320, 240); x.fillStyle = '#fff'; x.fillRect(40, 40, 120, 80); return c.toDataURL('image/jpeg', 0.9); })).split(',')[1], 'base64');
await page.locator('.qs-top').first().click(); await page.waitForTimeout(1200);
const sel = await page.getByLabel('Which line').inputValue();
const selText = await page.getByLabel('Which line').locator('option:checked').innerText();
ok(sel === '__hold__' && selText === 'Business B — not yet placed' && (await page.locator('[data-qs-hold]').count()) === 1,
  `2 ＋ Problem holds it at Business B, no line invented ("${selText}")`);
const opts = await page.getByLabel('Which line').locator('option').allInnerTexts();
ok(!opts.includes(branston.name), `2 no Branston line offered while Business B is the client (${opts.join(' | ')})`);
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.qs .tw-door', { hasText: 'On the phone' }).click()]);
await chooser.setFiles({ name: 'guard.jpg', mimeType: 'image/jpeg', buffer: jpeg }); await page.waitForTimeout(1500);
await page.locator('.qs textarea').first().fill('VISIT-B Guard on the infeed is loose');
await page.locator('.qs-foot .btn-primary').click(); await page.waitForTimeout(1500);
const held = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const s = (await db.listAllSnags()).find(x => x.problem.startsWith('VISIT-B'));
  const w = s && await db.getWorkspace(s.workspaceId);
  return { id: s?.id, photos: s?.media?.length ?? 0, line: w?.name, type: w?.lineType, client: w?.clientName, lines: (await db.listWorkspaces()).filter(x => x.clientName === 'Business B').length };
});
ok(held.line === 'Business B — not yet placed' && held.type === 'Not yet placed' && held.client === 'Business B' && held.photos === 1 && held.lines === 1,
  `2 kept at Business B's holding place with its photo (${JSON.stringify(held)})`);

/* 3 — ANOTHER CUSTOMER'S PROBLEM IN THE SAME HOURS; THE LINE DISCOVERED; THE PROBLEM PLACED */
await page.evaluate(async id => { const db = await import('/src/db.ts'); const t0 = Date.now(); await db.addSnag({ id: crypto.randomUUID(), workspaceId: id, problem: 'BRANSTON-ONLY sealer drift', status: 'open', priority: 'high', raisedAt: t0, updatedAt: t0, media: [] }); }, branston.line);
await t.go('#/factory', 3000);
await page.getByRole('button', { name: 'Add lines' }).first().click(); await page.waitForTimeout(300);
await page.getByLabel("The new line's name").fill('B Packing 1');
await page.getByRole('button', { name: 'Add line' }).click(); await page.waitForTimeout(1500);
const bLine = await page.evaluate(async () => { const db = await import('/src/db.ts'); const w = (await db.listWorkspaces()).find(x => x.name === 'B Packing 1'); const t0 = Date.now(); await db.addObservation({ id: crypto.randomUUID(), workspaceId: w.id, category: 'Jam', asset: 'Bagger', startedAt: t0, durationMs: 180000, timing: 'stopwatch', count: 1, media: [], createdAt: t0, updatedAt: t0 }); return { id: w.id, client: w.clientName, site: w.siteName }; });
ok(bLine.client === 'Business B' && bLine.site === 'Leeds', `3 the line discovered takes Business B by itself (${bLine.client}, ${bLine.site})`);
await t.go(`#/visit/${visit.id}`, 3000);
await page.locator('[data-place-on-line] select').selectOption({ label: 'B Packing 1' }); await page.waitForTimeout(1500);
const placed = await page.evaluate(async id => (await (await import('/src/db.ts')).getSnag(id))?.workspaceId, held.id);
ok(placed === bLine.id && (await page.locator('[data-place-on-line]').count()) === 0 && /B Packing 1/.test(await t.words('[data-visit-problems]')), '3 Place on a line: the problem moved onto B Packing 1, said on its row');

/* 4 — END THE VISIT */
await page.locator('.nv-visit-b').click(); await page.locator('[data-visit-end]').click(); await page.waitForTimeout(2000);
const problems = await page.locator('[data-visit-problem]').evaluateAll(els => els.map(e => e.getAttribute('data-visit-problem')));
const body = (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
ok((await page.locator('[data-visit-state="ended"]').count()) === 1 && (await page.locator('.nv-visit').count()) === 0, '4 ended: the page says so and the bar no longer carries a visit');
ok(JSON.stringify(problems) === JSON.stringify(['VISIT-B Guard on the infeed is loose']) && !body.includes('BRANSTON-ONLY') && !body.includes(branston.name),
  `4 the day’s records of Business B only (${JSON.stringify(problems)})`);
ok((await page.locator('[data-visit-photo]').count()) === 1 && /Stops timed — B Packing 1/.test(await t.words('[data-visit-seen]')) && /1 problem · 1 photo · 1 stop timed/.test(await t.words('[data-visit-says]')),
  `4 the photo and the stop timed, and the page says it: "${await t.words('[data-visit-says]')}"`);
/* THE HEADLINE (12 November, lib/visitLoss): where the time went on the visit, first on the page — the module's own sentence */
const lossSaid = await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const { visitLoss } = await import('/src/lib/visitLoss.ts'); const { neckOf } = await import('/src/lib/lineLoss.ts');
  const w = await db.getWorkspace(id); const stops = (await db.listObservations(id)).filter(o => !o.deletedAt); const st = await db.listAllStandards();
  return visitLoss(stops, [w], x => neckOf(st, x))?.says ?? '';
}, bLine.id);
ok(lossSaid.startsWith('1 stop timed on B Packing 1 on the visit: 3 min lost, all Bagger — Jam.') && t.norm(await t.words('[data-visit-loss-says]')) === t.norm(lossSaid), `4 Where the time went says the module's sentence: "${lossSaid}"`);
ok((await page.locator('[data-visit-loss-row]').count()) === 1 && /1 stop · 3 min · 100%/.test(await t.words('[data-visit-loss-row]')), '4 a row a cause with its stops, minutes and share');
ok(await page.evaluate(() => { const a = document.querySelector('[data-visit-loss]'), b = document.querySelector('[data-visit-problems]'); return !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }), '4 it comes before what was found');
await page.getByRole('textbox', { name: 'What we recommend next' }).fill('Time the night shift’s stops for a week before any change.');
await page.getByRole('textbox', { name: 'What we recommend next' }).blur(); await page.waitForTimeout(800);

/* 5 — THE VISIT REPORT */
const dir = mkdtempSync(join(tmpdir(), 'visit-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.vs-report').click()]);
const file = join(dir, 'visit.pdf'); await dl.saveAs(file);
const pdf = t.norm(execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }));
const imgs = execFileSync('pdfimages', ['-list', file], { encoding: 'utf8' }).split('\n').slice(2).filter(Boolean).length;
const need = ['VISIT REPORT', 'For Business B', 'Where the time went', '3 min lost in 1 stop timed', 'all Bagger — Jam', 'a first look', 'What we were asked', 'packing performance', 'What we saw', 'Stops timed on B Packing 1', 'What we found', 'VISIT-B Guard on the infeed is loose', 'Photos', 'What we recommend next', 'night shift', 'What the figures rest on'];
const missing = need.filter(w => !pdf.includes(t.norm(w)));
ok(!missing.length, `5 the visit report read back${missing.length ? ` — missing ${missing.join(', ')}` : ': band, cover, asked, saw, found, photos, recommend, rests on'}`);
ok(imgs >= 1 && !pdf.includes('BRANSTON-ONLY') && !pdf.includes(branston.name), `5 the photo printed as an image (${imgs}) and nothing of Branston`);
const kept = await page.evaluate(async () => (await (await import('/src/lib/keptPdfs.ts')).listKept()).filter(k => /Visit report/.test(k.name)).length).catch(() => -1);
ok(kept === 1, `5 kept under Saved copies (${kept})`);

/* 6 — THE CONSULTANT'S HOME */
await t.go('#/clients', 3000);
const rows = await page.locator('[data-home-customer]').evaluateAll(els => els.map(e => e.getAttribute('data-home-customer')));
const bRow = await t.words('[data-home-customer="Business B"]');
ok((await page.locator('[data-consultant-home]').count()) === 1 && /^Good (morning|afternoon|evening)/.test(await t.words('.ch-hi')) && JSON.stringify(rows) === JSON.stringify(['Branston', 'Business B']),
  `6 the home: greeting, a row a customer (${rows.join(', ')})`);
ok(new RegExp(`engagement under way · last visit ${dayWord} · 1 open`).test(bRow), `6 Business B’s row in words: "${bRow}"`);
ok((await page.locator('[data-home-visit]').count()) === 1 && (await page.getByRole('button', { name: 'Start a visit' }).count()) >= 1, '6 recent visits and Start a visit');

/* 7 — BACK AT BRANSTON */
await page.locator('[data-home-customer="Branston"] .lt-row').click(); await page.waitForTimeout(2500);
ok(page.url().endsWith('#/story') && (await t.words('.nv-client-l')) === 'Branston', `7 its row: Branston’s Story, the bar saying "${await t.words('.nv-client-l')}"`);
await t.go('#/snags', 3000);
const sb = (await page.locator('.nv-main').innerText());
ok(!sb.includes('VISIT-B') && sb.includes('BRANSTON-ONLY'), '7 Problems: Branston’s, nothing of Business B');

/* 8 — KEPT AFTER A RELOAD */
await page.reload(); await page.waitForTimeout(2500);
await t.go(`#/visit/${visit.id}`, 3000);
ok((await page.locator('[data-visit-problem]').count()) === 1 && (await t.words('.nv-client-l')) === 'Business B', '8 after a reload the visit’s page stands, and the bar follows it to Business B');

/* 9 — THE PHONE */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/clients', 3000);
const startH = await page.locator('.ch-start').first().evaluate(e => e.getBoundingClientRect().height);
ok((await t.wide()) <= 0 && startH >= 44, `9 the phone: the home nothing off the side (${await t.wide()}), Start a visit ${startH}px`);
await t.go(`#/visit/${visit.id}`, 3000);
ok((await t.wide()) <= 0, `9 the phone: the visit’s page nothing off the side (${await t.wide()})`);
/* the top bar with the client AND a visit in hand: every control inside the screen */
await page.evaluate(async id => { (await import('/src/lib/visits.ts')).setVisitInHand(null); const v = (await import('/src/lib/visits.ts')).visitsOf(await (await import('/src/db.ts')).listAllStudies()).find(x => x.id === id); await (await import('/src/db.ts')).patchStudy(v.storyId, cur => ({ facts: { ...cur.facts, visits: cur.facts.visits.map(x => (x.id === id ? { ...x, endedAt: undefined } : x)) } })); (await import('/src/lib/visits.ts')).setVisitInHand({ storyId: v.storyId, id }); }, visit.id);
await page.waitForTimeout(1200);
const barRight = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.nv-top > *')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.getBoundingClientRect().right)) - window.innerWidth);
ok((await page.locator('.nv-visit-b').count()) === 1 && barRight <= 0 && (await page.locator('.nv-visit-b').evaluate(e => e.getBoundingClientRect().height)) >= 44,
  `9 the phone: the bar with the client and the visit in hand — nothing past the edge (${barRight}), the visit 44 px`);

await t.finish('Visits and the consultant’s home: proved');
