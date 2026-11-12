/* ACCEPTANCE — THE LIBRARY (11 November, docs/CONSULTANT-WORKSPACE.md C4; lib/library, lib/keptPdfs, screens/LibraryScreen,
 * supabase/KEPT_PAPERS.sql — Rowland: "Where is my overall library of work? … All reports I've created … I need to be able to browse
 * my work across businesses, but also open an individual business and see everything associated with it … distinguish between my own
 * internal working documents and finished client-facing reports"). Driven in a real browser on the smoke seed, the cloud aborted:
 *
 *   1  Branston (every seed line): papers made from their real buttons — the line report (made on arrival), a tool's own paper (the
 *      capability study), the Story report, the Problems report — each kept as a library row with its kind, audience and customer
 *   2  a second customer, Business B, with a line, a problem with a photo and a study with a picture of its own; its line report and its
 *      Problems report made with Business B active
 *   3  the library from Factory reports (the rail's foot): Business B active — its two papers only, "Showing Business B's only"; Branston
 *      active — its four; All customers — all six, each row naming its customer; kinds and audiences as lib/library says them
 *   4  the filters in the fold: client-facing only, internal only, one kind; search by name
 *   5  a paper marked client-facing and back to internal; renamed; taken off and put back with Undo
 *   6  the row's Download gives the very same bytes as the paper made
 *   7  Photos and Working records — the active customer's only, each opening where it came from
 *   8  kept after a reload; the synced record's shape (MAPS.kept_papers.toRow) carries the customer, kind, audience and the file
 *   9  old device-only copies offered once — "Keep this copy in your library?" — moved in on a yes, not asked again
 *  10  the phone: one column, nothing off the side, ⋯ and the rows a thumb's height
 *
 *   node scripts/acceptance/library.mjs   (SMOKE_BASE, as smoke) */
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const dir = mkdtempSync(join(tmpdir(), 'library-'));
const settle = ms => page.waitForTimeout(ms);
const download = async (press, name) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), press()]);
  const f = join(dir, `${name}-${Date.now()}.pdf`); await dl.saveAs(f); await settle(900); return f;
};
const setClient = c => page.evaluate(async c => (await import('/src/lib/activeClient.ts')).setActiveClient(c), c);
const kept = () => page.evaluate(async () => (await import('/src/lib/keptPdfs.ts')).listKept());

/* ---- 1 · Branston's papers ---- */
const lines = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const ls = await liveProductionLines(await db.listWorkspaces());
  for (const w of ls) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln', areaName: 'Packing' });
  /* the seed's story is Branston's (lib/storyPick: a story is one client's) */
  for (const s of (await db.listAllStudies()).filter(s => s.tool === 'story')) await db.patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, story: { ...cur.agreed.story, client: 'Branston' } } }));
  /* a Branston problem with a photo of its own */
  const t0 = Date.now();
  const blob = await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')).blob();
  await db.putBlob('br-photo', blob);
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: ls[0].id, problem: 'BR-ONLY film tracking off the roller', status: 'open', priority: 'high',
    raisedAt: t0, updatedAt: t0, media: [{ id: 'm-br', kind: 'photo', blobKey: 'br-photo', mime: 'image/png', capturedAt: t0 }] });
  return ls.map(w => ({ id: w.id, name: w.name }));
});
const BR = lines.find(l => l.id === sd.wsId) ?? lines[0];
await page.reload(); await settle(1500);
const brLine = await download(() => t.go(`#/lines/${BR.id}/report?save=1`, 400), 'br-line');
await t.go(`#/capability/${sd.studyId}`, 2500);
const brTool = await download(async () => {
  await page.locator('main .part-menu-b', { hasText: /^Report/ }).first().click();
  await page.locator('[role=menuitem]:not([data-saved-copies-open])').first().click();
}, 'br-tool');
await t.go('#/story', 2500);
const brStory = await download(() => paper(page, 'Story report — the latest chapter'), 'br-story');
await t.go('#/snags', 3000);
const brProblems = await download(() => paper(page, 'Problems report'), 'br-problems');
let all = await kept();
const brKept = all;
const by = k => brKept.filter(p => p.kind === k);
ok(all.length === 4, `1 four papers kept as library rows (${all.length}: ${all.map(p => p.kind).join(', ')})`);
ok(by('line-report').length === 1 && by('line-report')[0].audience === 'client' && by('line-report')[0].client === 'Branston' && by('line-report')[0].workspaceId === BR.id,
  '1 the line report — a line report, client-facing, Branston\'s, on its line');
ok(by('tool').length === 1 && by('tool')[0].audience === 'internal' && by('tool')[0].client === 'Branston' && by('tool')[0].studyId === sd.studyId,
  '1 the capability study\'s paper — a tool paper, internal, Branston\'s (the active customer), its record named');
ok(by('story').length === 1 && by('story')[0].audience === 'client', '1 the Story report — a story, client-facing');
ok(by('problems').length === 1 && by('problems')[0].audience === 'internal' && by('problems')[0].client === 'Branston', '1 the Problems report — problems, internal, Branston\'s');

/* ---- 2 · Business B ---- */
const B = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { addLineToFactory } = await import('/src/lib/lines.ts');
  const w = await addLineToFactory('Line 1', 'Packing');
  await db.patchWorkspaceRecord(w.id, { clientName: 'Business B', siteName: 'Leeds', areaName: 'Packing' });
  const t0 = Date.now();
  const blob = await (await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')).blob();
  await db.putBlob('b-photo', blob); await db.putBlob('b-attach', blob);
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: w.id, problem: 'B-ONLY bags not opening on the bagger', status: 'open', priority: 'critical',
    raisedAt: t0, updatedAt: t0, media: [{ id: 'm-b', kind: 'photo', blobKey: 'b-photo', mime: 'image/png', capturedAt: t0 }] });
  const sid = crypto.randomUUID();
  await db.putStudy({ id: sid, tool: 'capability', name: 'B-ONLY bag weight', workspaceId: w.id, machine: 'Bagger',
    agreed: { readings: { kind: 'limits', unit: 'g', nominal: 500, lower: 495, upper: 515, count: 5 } },
    facts: { readings: [], attach: [{ id: 'a-b', kind: 'photo', blobKey: 'b-attach', mime: 'image/png', caption: 'B-ONLY the bagger jaws', at: t0 }] },
    uses: [], startedAt: t0, createdAt: t0, updatedAt: t0 });
  return { id: w.id, study: sid };
});
await setClient('Business B'); await settle(300);
const bLine = await download(() => t.go(`#/lines/${B.id}/report?save=1`, 400), 'b-line');
await t.go('#/snags', 3000);
await download(() => paper(page, 'Problems report'), 'b-problems');
all = await kept();
const bPapers = all.filter(p => p.client === 'Business B');
ok(all.length === 6 && bPapers.length === 2 && bPapers.some(p => p.kind === 'line-report' && p.workspaceId === B.id) && bPapers.some(p => p.kind === 'problems'),
  `2 Business B's line report and Problems report kept as its own (${bPapers.map(p => p.kind).join(', ')})`);

/* ---- 3 · the library, from Factory reports ---- */
await t.go('#/room', 2500);
await page.locator('.nv-rail .nv-ri', { hasText: 'Factory reports' }).first().click(); await settle(600);
await page.getByRole('button', { name: /Library — every paper you have made/ }).first().click(); await settle(2000);
ok(page.url().endsWith('#/library') && (await t.words('.nv-crumb.nv-page')) === 'Library', `3 Factory reports › Library lands on #/library, the bar saying Library (${page.url().split('#')[1]})`);
const rows = () => page.locator('[data-lib-paper]');
const rowWords = async () => Promise.all((await rows().all()).map(r => r.innerText()));
ok((await rows().count()) === 2 && /Showing Business B’s only/.test(await t.words('.lib-who')), `3 Business B active: its two papers only (${await rows().count()}), "Showing Business B's only"`);
ok((await rowWords()).every(w => !/Branston/.test(w)) && /2 papers · 1 client-facing · 1 internal/.test(await t.words('.part-head .pace-lede')), `3 none of Branston's, the sentence "${await t.words('.part-head .pace-lede')}"`);
await setClient('Branston'); await settle(800);
ok((await rows().count()) === 4, `3 Branston active: its four (${await rows().count()})`);
await page.locator('[data-lib-all]').click(); await settle(800);
const allWords = await rowWords();
ok((await rows().count()) === 6 && allWords.filter(w => /Branston/.test(w)).length === 4 && allWords.filter(w => /Business B/.test(w)).length === 2,
  '3 All customers: all six, each naming its customer (4 Branston, 2 Business B)');
const kindOf = async id => page.locator(`[data-lib-paper="${id}"]`).getAttribute('data-lib-kind-is');
const audOf = async id => page.locator(`[data-lib-paper="${id}"]`).getAttribute('data-lib-audience-is');
const lineRow = by('line-report')[0], problemsRow = by('problems')[0], toolRow = by('tool')[0];
ok((await kindOf(lineRow.id)) === 'line-report' && (await audOf(lineRow.id)) === 'client' && /Line report/.test(await t.words(`[data-lib-paper="${lineRow.id}"] [data-lib-meta]`)) && /Client-facing/.test(await t.words(`[data-lib-paper="${lineRow.id}"]`)),
  '3 the line report\'s row: Line report, Client-facing');
ok((await audOf(toolRow.id)) === 'internal' && /Tool paper/.test(await t.words(`[data-lib-paper="${toolRow.id}"] [data-lib-meta]`)) && /Internal/.test(await t.words(`[data-lib-paper="${toolRow.id}"]`)),
  '3 the tool\'s paper: Tool paper, Internal');
const newest = await page.locator('[data-lib-paper]').first().getAttribute('data-lib-paper');
ok(newest === all.sort((a, b) => b.at - a.at)[0].id, '3 newest first');

/* ---- 4 · the filters ---- */
await page.locator('[data-fold="library-filters"] .fold-toggle').click(); await settle(300);
await page.locator('[data-lib-aud="client"]').click(); await settle(300);
ok((await rows().count()) === 3 && (await rowWords()).every(w => /Client-facing/.test(w)), `4 client-facing only: the two line reports and the Story (${await rows().count()})`);
await page.locator('[data-lib-aud="internal"]').click(); await settle(300);
ok((await rows().count()) === 3 && (await rowWords()).every(w => /Internal/.test(w)), `4 internal only: the tool paper and the two Problems reports (${await rows().count()})`);
await page.locator('[data-lib-aud="all"]').click(); await page.locator('[data-lib-kind="story"]').click(); await settle(300);
ok((await rows().count()) === 1 && (await kindOf(by('story')[0].id)) === 'story', '4 one kind: the Story');
await page.locator('[data-lib-kind="all"]').click(); await settle(200);
await page.locator('[data-lib-q]').fill('Business B'); await settle(300);
ok((await rows().count()) === 2, `4 search "Business B": its two (${await rows().count()})`);
await page.locator('[data-lib-q]').fill(''); await settle(300);

/* ---- 5 · whom it is for, its name, take off and Undo ---- */
const more = async (id, item) => { await page.locator(`[data-lib-more="${id}"]`).click(); await settle(200); await page.locator(item).click(); await settle(600); };
await more(problemsRow.id, '[data-lib-mark="client"]');
ok((await audOf(problemsRow.id)) === 'client' && (await kept()).find(p => p.id === problemsRow.id).audience === 'client', '5 the Problems report marked client-facing — on its row and its record');
await more(problemsRow.id, '[data-lib-mark="internal"]');
ok((await audOf(problemsRow.id)) === 'internal', '5 and back to internal');
await more(lineRow.id, `[data-lib-rename="${lineRow.id}"]`);
await page.locator('[data-lib-name-box]').fill('Branston — Line 7 for the MD.pdf');
await page.locator('[data-lib-name-save]').click(); await settle(600);
ok(/Branston — Line 7 for the MD\.pdf/.test(await t.words(`[data-lib-paper="${lineRow.id}"]`)) && (await kept()).find(p => p.id === lineRow.id).name === 'Branston — Line 7 for the MD.pdf', '5 renamed — on the row and the record');
await more(toolRow.id, `[data-lib-drop="${toolRow.id}"]`);
ok((await page.locator(`[data-lib-paper="${toolRow.id}"]`).count()) === 0 && (await rows().count()) === 5, '5 taken off: gone from the library');
const tomb = await page.evaluate(async () => (await (await import('/src/db.ts')).listTombstones()).map(x => x.kind));
ok(tomb.includes('kept_papers'), '5 its delete waiting for the cloud (a tombstone)');
await page.getByRole('button', { name: 'Undo' }).click(); await settle(900);
ok((await page.locator(`[data-lib-paper="${toolRow.id}"]`).count()) === 1 && (await rows().count()) === 6, '5 Undo — it is back');

/* ---- 6 · the very same bytes ---- */
const again = await download(() => more(lineRow.id, `[data-lib-down="${lineRow.id}"]`), 'again');
ok(readFileSync(again).equals(readFileSync(brLine)), `6 Download gives the very same file as the paper made (${readFileSync(again).length} bytes)`);
ok((await kept()).length === 6, '6 and keeps no second copy of it');

/* ---- 7 · Photos and Working records ---- */
await setClient('Business B'); await settle(800);
await page.getByRole('tab', { name: /^Photos/ }).click(); await settle(800);
const photoWords = await t.words('[data-lib-photos]');
ok((await page.locator('[data-lib-photo]').count()) === 2 && /B-ONLY bags not opening/.test(photoWords) && /B-ONLY the bagger jaws/.test(photoWords) && !/BR-ONLY/.test(photoWords),
  `7 Business B's photos: the problem's and the study's picture, none of Branston's (${await page.locator('[data-lib-photo]').count()})`);
await setClient('Branston'); await settle(800);
const brPhotos = await t.words('[data-lib-photos]');
ok(/BR-ONLY film tracking/.test(brPhotos) && !/B-ONLY/.test(brPhotos.replace(/BR-ONLY/g, '')), '7 Branston\'s photos: its problem\'s, none of Business B\'s');
await page.locator('[data-lib-photo]').filter({ hasText: 'BR-ONLY' }).locator('.lt-row').click(); await settle(1800);
ok(/#\/snags\?open=/.test(page.url()), `7 a photo opens the record it came from (${page.url().split('#')[1]})`);
await t.go('#/library', 2000);
await page.getByRole('tab', { name: /^Working records/ }).click(); await settle(800);
const recWords = await t.words('[data-lib-records]');
ok((await page.locator('[data-lib-record]').count()) > 0 && !/B-ONLY/.test(recWords), `7 Branston's working records (${await page.locator('[data-lib-record]').count()}), none of Business B's`);
await setClient('Business B'); await settle(800);
ok((await page.locator('[data-lib-record]').count()) === 1 && /B-ONLY bag weight/.test(await t.words('[data-lib-records]')), '7 Business B\'s: its one study');
await page.locator(`[data-lib-record="${B.study}"] .lt-row`).click(); await settle(1800);
ok(page.url().includes(`/capability/${B.study}`), '7 a working record opens itself');

/* ---- 8 · kept after a reload; the synced record ---- */
await setClient(''); await t.go('#/library', 2000);
await page.getByRole('tab', { name: /^Papers/ }).click(); await settle(400);
await page.reload(); await settle(2500);
ok((await rows().count()) === 6 && /Branston — Line 7 for the MD/.test(await t.words('[data-library]')), `8 kept after a reload — six, the new name kept (${await rows().count()})`);
const wire = await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const { MAPS } = await import('/src/cloud/mappers.ts');
  const r = (await db.rawAll('kept_papers')).find(x => x.id === id);
  return { row: MAPS.kept_papers.toRow(r, 'me'), media: MAPS.kept_papers.mediaKeys(r), blob: !!(await db.getBlob(r.key)) };
}, bLine && bPapers.find(p => p.kind === 'line-report').id);
ok(wire.row.client === 'Business B' && wire.row.kind === 'line-report' && wire.row.audience === 'client' && wire.row.workspace_id === B.id && wire.row.media_key && wire.media[0]?.key === wire.row.media_key && wire.media[0].mime === 'application/pdf' && wire.blob,
  `8 the synced record carries its customer, kind, audience, line and its PDF (${JSON.stringify({ client: wire.row.client, kind: wire.row.kind, audience: wire.row.audience, media_key: wire.row.media_key })})`);

/* ---- 9 · the old copies, offered once ---- */
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  await db.putBlob('kept-old-1', new Blob(['%PDF-1.4 old'], { type: 'application/pdf' }));
  await (await db.getDB()).put('meta', [{ id: 'old-1', key: 'kept-old-1', name: 'Before the library.pdf', at: Date.now() - 86_400_000, size: 12, page: '#/snags', ids: [] }], 'keptPdfs');
});
await page.reload(); await settle(2500);
ok(/Keep this copy in your library\?/.test(await t.words('[data-lib-offer]')) && /on this device only/.test(await t.words('[data-lib-paper="old-1"]')), '9 an old device-only copy listed, "on this device only", and the offer made: "Keep this copy in your library?"');
await page.locator('[data-lib-offer-yes]').click(); await settle(1200);
ok((await page.locator('[data-lib-offer]').count()) === 0 && !/on this device only/.test(await t.words('[data-lib-paper="old-1"]')) && (await page.evaluate(async () => (await (await import('/src/db.ts')).rawAll('kept_papers')).some(r => r.id === 'old-1'))),
  '9 yes — moved into the library (a synced row), the offer gone');
await page.reload(); await settle(2000);
ok((await page.locator('[data-lib-offer]').count()) === 0, '9 not asked again after a reload');

/* ---- 10 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await settle(800);
const wide = await t.wide();
const tap = await page.locator('[data-lib-more]').first().boundingBox();
const rowH = await page.locator('[data-lib-paper] .lt-row').first().boundingBox();
ok(wide <= 1 && tap && tap.height >= 44 && tap.width >= 44 && rowH && rowH.height >= 44, `10 the phone: nothing off the side (${wide}), ⋯ ${tap && Math.round(tap.width)}×${tap && Math.round(tap.height)} px, a row ${rowH && Math.round(rowH.height)} px`);

void brTool; void brStory; void brProblems;
await t.finish('THE LIBRARY: every paper made, by customer, client-facing or internal, its photos and working records — held');
