/* THE FACTORY WALK AND THE CAMERA, driven (10 November, docs/FACTORY-WALK.md — Rowland: "I move around the factory, Luna moves with me";
 * "A department should be a proper record … Dispatch should exist as a department in its own right"; "A photograph that hasn't been
 * formally filed should remain part of the factory walk … Where it has a confirmed relationship to a line, machine or department, it
 * should also be visible from those relevant pages. Use relationships to the original photograph … Never guess an uncertain
 * relationship"). The gateway is played by the script; Chromium's fake camera stands in for the lens.
 *
 *   1  "I'm at the bagger on Line 3" — set_position with NO card: Where you are in the panel, the subject unchanged ("Film costs"), the
 *      parked "Bagger jams" on Line 3 offered; the gateway told where the person is
 *   2  the camera from the composer: the app's own live camera full screen, pictures only (no Photo / Video switch), a snap keeping it
 *      open, Done; the photo in the conversation stamped "Taken at Hull › Packing hall › Line 3 › Bagger", its turn carrying where
 *   3  "that's the bagger's guard — file it to the bagger": file_photo a card, nothing linked while it waits; Do it — the photo's turn
 *      linked to the Bagger (confirmed, by the person), "Filed to Bagger on Line 3" under it, the blob the same key, no copy
 *   4  "walking into Dispatch" — set_position says Dispatch is not a department yet; add_department a card; Do it — a department
 *      record, nothing made under it; the panel's walk Bagger → Dispatch
 *   5  a photo from the gallery in Dispatch — stamped Hull › Dispatch, NOT filed; on no page; walk_state counts 2 photos, 1 not filed;
 *      a guessed machine refused
 *   6  the Factory's Lines tab: Dispatch a department with no lines; its page DEPARTMENT, "No lines in it yet"; Line 3's page and the
 *      Bagger's page showing the filed photo and nothing else; ＋ A department by hand (Goods in) — no AI
 *   7  the Dispatch photo filed to the department on a card — on Dispatch's page
 *   8  the phone: the camera button and the walk photos a thumb's height, nothing off the side
 *
 *   node scripts/acceptance/factory-walk.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';
import { openLineMore } from '../lib/lineMore.mjs';

const t = await openApp({ width: 1440, height: 900, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: true, reply: 'Noted.' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(700);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = (b, i = 0) => b.pending?.results?.[i];
const conv = () => page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return s ? { id: s.id, position: s.facts.position, walk: s.facts.walk, photos: (s.facts.turns ?? []).filter(x => x.kind === 'photo').map(x => ({ id: x.id, key: x.media?.blobKey, where: x.where, filed: x.filed })), threads: s.facts.threads } : null;
});
const depts = () => page.evaluate(async () => (await import('/src/db/departments.ts')).listDepartments());

/* Line 3 of Acme Foods at Hull › Packing hall, with its Bagger and Checkweigher, and a problem */
const L3 = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Line 3');
  await d.updateWorkspace({ ...w, clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Packing hall', assets: ['Bagger', 'Checkweigher'] });
  return w.id;
});

/* ---- 1 · where the person is ---- */
await t.go('#/ai', 2500);
await openLunaContext(page); await openLunaFolds(page);   /* F2: the context one tap away at a desk, opened as a person would */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'f1', name: 'set_focus', input: { title: 'Bagger jams', scope: { lineId: L3 } } }] }),
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'f2', name: 'set_focus', input: { title: 'Film costs', scope: {} } }] }),
  () => ({ ok: true, reply: 'Film costs it is — what are you seeing?' }),
];
await send('Two things today: the bagger jams on Line 3, and film costs. Start with film costs.');
await answered(1);
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'p1', name: 'set_position', input: { lineId: L3, machine: 'bagger', said: 'I’m at the bagger on Line 3 now' } }] }),
  b => ({ ok: true, reply: /Open here: “Bagger jams”/.test(result(b)?.says ?? '') ? 'You’ve the bagger jams open here — back to that, or stay on film?' : 'Noted where you are.' }),
];
await send('I’m at the bagger on Line 3 now.');
await answered(2);
const posSaid = result(asks.at(-1))?.says ?? '';
ok(/You are at Hull › Packing hall › Line 3 › Bagger/.test(posSaid) && /subject stays “Film costs”/.test(posSaid) && /Open here: “Bagger jams” \(parked\)/.test(posSaid), `1 set_position: the place, the subject kept, the parked thread here offered: "${posSaid.slice(0, 200)}"`);
ok((await page.locator('[data-card="set_position"]').count()) === 0, '1 no card for a move — it changes only the conversation');
ok(/Hull › Packing hall › Line 3 › Bagger/.test(await t.words('[data-ctx-here]')), `1 Where you are in the panel: "${await t.words('[data-ctx-here]')}"`);
let c = await conv();
ok(c?.threads?.find(x => x.title === 'Film costs')?.status === 'current' && c?.threads?.find(x => x.title === 'Bagger jams')?.status === 'parked', '1 the threads unchanged by the move — Film costs current, Bagger jams parked');
plan = [() => ({ ok: true, reply: 'Go on.' })];
await send('Stay on film for now.');
await answered(3);
ok(/Where the person is: Hull › Packing hall › Line 3 › Bagger \(said/.test(asks.at(-1)?.focus ?? ''), '1 the gateway told where the person is, apart from the subject');

/* ---- 2 · the camera ---- */
ok(await page.locator('[data-camera]').count() === 1, '2 a camera button on the composer');
await page.locator('[data-camera]').click();
await page.waitForSelector('[data-rec-snap]', { timeout: 8000 }).catch(() => undefined);
ok(await page.locator('[data-rec-snap]').count() === 1, '2 the app’s own live camera opens full screen');
ok(await page.locator('.rec-modes').count() === 0, '2 pictures only — no Photo / Video switch on a walk');
await page.waitForTimeout(1200);
await page.locator('[data-rec-snap]').click(); await page.waitForTimeout(1200);
ok(/1 photo/.test(await page.locator('[data-rec-done]').innerText().catch(() => '')), '2 a snap keeps the camera open and counts it');
await page.locator('[data-rec-done]').click(); await page.waitForTimeout(1200);
c = await conv();
const p1 = c?.photos?.[0];
ok(c?.photos?.length === 1 && p1?.where?.machine === 'Bagger' && p1?.where?.lineId === L3 && typeof p1?.where?.at === 'number', '2 the photo kept on the conversation, stamped with where and when');
ok(/Taken at Hull › Packing hall › Line 3 › Bagger/.test(await t.words('[data-photo-at]')), `2 the stamp under the photo: "${await t.words('[data-photo-at]')}"`);

/* ---- 3 · filed to the bagger, on a card ---- */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'fp1', name: 'file_photo', input: { photoKey: p1.key, to: 'machine', lineId: L3, machine: 'Bagger', why: 'that’s the bagger’s guard — the catch is broken' } }] }),
  b => ({ ok: true, reply: result(b)?.ok ? 'Filed to the Bagger.' : 'Not filed.' }),
];
await send('That’s the bagger’s guard — the catch is broken. File it to the bagger.');
await page.waitForSelector('[data-card="file_photo"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const card = page.locator('[data-card="file_photo"][data-card-status="waiting"]');
const cardSaid = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/File the photo taken at \d\d:\d\d at Hull › Packing hall › Line 3 › Bagger to Bagger on Line 3 — the same photograph linked, not a copy/.test(cardSaid) && /not verified/.test(cardSaid), `3 file_photo is a card saying what it will do: "${cardSaid.slice(0, 200)}"`);
c = await conv();
ok(!(c?.photos?.[0]?.filed ?? []).length, '3 nothing linked while the card waits');
await card.getByRole('button', { name: 'Do it' }).click();
await answered(5);
c = await conv();
const link = c?.photos?.[0]?.filed?.[0];
ok(link?.to === 'machine' && link?.refId === L3 && link?.machine === 'Bagger' && link?.how === 'confirmed' && c?.photos?.[0]?.key === p1.key, '3 Do it: the photo’s own turn linked to the Bagger, confirmed — the same key, no copy');
ok(/Filed to Bagger on Line 3/.test(await t.words('[data-photo-at]')), '3 "Filed to Bagger on Line 3" under the photo');

/* ---- 4 · into Dispatch: a department of its own ---- */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'p2', name: 'set_position', input: { area: 'Dispatch', site: 'Hull', said: 'walking into Dispatch' } }] }),
  b => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'd1', name: 'add_department', input: { area: 'Dispatch', site: 'Hull', client: 'Acme Foods' } }], _seen: result(b)?.says }),
  b => ({ ok: true, reply: result(b)?.ok ? 'Dispatch is a department now.' : 'Left as said.' }),
];
await send('Walking into Dispatch now — keep Dispatch as a department.');
await page.waitForSelector('[data-card="add_department"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const moved = result(asks.find(a => result(a)?.says?.includes('Dispatch') && /not a department/.test(result(a)?.says)) ?? {})?.says ?? '';
ok(/You are at Hull › Dispatch/.test(moved) && /“Dispatch” is not a department in the app yet/.test(moved), `4 the move said, Dispatch not a department yet: "${moved.slice(0, 160)}"`);
const dcard = page.locator('[data-card="add_department"][data-card-status="waiting"]');
ok(/Add “Dispatch” at Hull for Acme Foods as a department of the factory — a record of its own, with no lines or machines made under it/.test((await dcard.innerText().catch(() => '')).replace(/\s+/g, ' ')), '4 add_department a card saying nothing is made under it');
ok((await depts()).length === 0, '4 no department while the card waits');
await dcard.getByRole('button', { name: 'Do it' }).click();
await answered(6);
const dl = await depts();
ok(dl.length === 1 && dl[0].facts.area === 'Dispatch' && dl[0].facts.site === 'Hull' && dl[0].facts.client === 'Acme Foods' && dl[0].facts.known?.area?.how === 'reported', '4 Do it: Dispatch a department record, reported in this conversation');
const linesNow = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).filter(w => w.areaName === 'Dispatch').length);
ok(linesNow === 0, '4 nothing made under it — no line in Dispatch');
ok(/Hull › Dispatch/.test(await t.words('[data-ctx-here]')) && /Bagger → Dispatch/.test(await t.words('[data-ctx-here]')), `4 the panel: where you are and the walk: "${await t.words('[data-ctx-here]')}"`);

/* ---- 5 · a photo from the gallery in Dispatch, left on the walk ---- */
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await page.setInputFiles('input[aria-label="Choose photos"]', { name: 'pallets.png', mimeType: 'image/png', buffer: png });
await page.waitForTimeout(1200);
c = await conv();
const p2 = c?.photos?.[1];
ok(c?.photos?.length === 2 && p2?.where?.area === 'Dispatch' && !p2?.where?.lineId && !(p2?.filed ?? []).length, '5 a gallery photo stamped Hull › Dispatch, not filed');
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'w1', name: 'walk_state', input: {} }] }),
  b => ({ ok: true, reply: `${result(b)?.says ?? ''}`.slice(0, 200) }),
];
await send('Where are we?');
await answered(7);
const ws = result(asks.at(-1)) ?? {};
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'g1', name: 'file_photo', input: { photoKey: p2.key, to: 'machine', lineId: L3, machine: 'Wrapper' } }] }),
  b => ({ ok: true, reply: `${result(b)?.why ?? result(b)?.says ?? ''}`.slice(0, 200) }),
];
await send('Put it on the wrapper.');
await answered(8);
ok(/Now at Hull › Dispatch/.test(ws.says ?? '') && /2 photos in all, 1 not filed/.test(ws.says ?? '') && /Line 3 › Bagger \d\d:\d\d \(1 photo\) → Hull › Dispatch \d\d:\d\d \(1 photo\)/.test(ws.says ?? ''), `5 walk_state: the stops with their photos: "${(ws.says ?? '').slice(0, 220)}"`);
const guessed = result(asks.at(-1));
ok(guessed?.ok === false && (await page.locator('[data-card="file_photo"][data-card-status="waiting"]').count()) === 0 && /never filed to a guess|No machine called “Wrapper”/.test(guessed?.why ?? guessed?.says ?? ''), '5 a photo filed to a machine not on the line is refused');

/* ---- 6 · the pages ---- */
await t.go('#/room', 2500);
const dsec = page.locator('[data-area*="dispatch"]');
ok(await dsec.count() === 1 && /no lines in it yet/i.test(await dsec.innerText()), '6 the Lines tab lists Dispatch as a department with no lines');
await t.go(`#/area?site=Hull&area=Dispatch`, 2500);
ok(/DEPARTMENT/.test(await t.words('.pl-eyebrow')) && /No lines in it yet/.test(await t.words('main')), '6 Dispatch’s own page: DEPARTMENT, no lines in it yet');
ok(await page.locator('[data-walk-photos]').count() === 0, '6 the photo taken in Dispatch is not on its page — not filed there');
await t.go(`#/lines/${L3}`, 2800); await openLineMore(page);   /* Photos from walks is in More about this line (10 November) */
const lp = page.locator('[data-walk-photos]');
ok(await lp.count() === 1 && await lp.locator('[data-walk-photo]').count() === 1 && /Taken at Hull › Packing hall › Line 3 › Bagger/.test(await lp.innerText()) && /the catch is broken/.test(await lp.innerText()), '6 Line 3’s page: the photo filed to its Bagger, where it was taken and why');
ok(await lp.locator(`[data-walk-photo="${p2.key}"]`).count() === 0, '6 the unfiled Dispatch photo is not on Line 3’s page');
await t.go(`#/lines/${L3}/machine/Bagger`, 2800);
ok(await page.locator('[data-walk-photo]').count() === 1, '6 the Bagger’s page: the photo of it');
await t.go(`#/lines/${L3}/machine/Checkweigher`, 2500);
ok(await page.locator('[data-walk-photo]').count() === 0, '6 the Checkweigher’s page: none');
/* by hand, no AI */
await t.go('#/room', 2500);
await page.getByRole('button', { name: '＋ A department' }).click();
await page.getByLabel('The department’s name').fill('Goods in');
await page.getByLabel('The department’s site').fill('Hull');
await page.getByRole('button', { name: 'Add the department' }).click();
await page.waitForTimeout(1200);
ok((await depts()).some(d => d.facts.area === 'Goods in') && await page.locator('[data-area*="goods in"]').count() === 1, '6 ＋ A department by hand: Goods in kept and listed, no AI');

/* ---- 7 · the Dispatch photo filed to the department ---- */
await t.go(`#/ai?c=${encodeURIComponent(c.id)}`, 2500);
const dispatch = (await depts()).find(d => d.facts.area === 'Dispatch');
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'fp2', name: 'file_photo', input: { photoKey: p2.key, to: 'department', departmentId: dispatch.id, why: 'pallets waiting in the lane' } }] }),
  b => ({ ok: true, reply: result(b)?.ok ? 'Filed to Dispatch.' : 'Not filed.' }),
];
await send('File the pallets photo to Dispatch — that’s the lane.');
await page.waitForSelector('[data-card="file_photo"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
await page.locator('[data-card="file_photo"][data-card-status="waiting"]').getByRole('button', { name: 'Do it' }).click();
await page.waitForTimeout(2000);
await t.go(`#/area?site=Hull&area=Dispatch`, 2800);
ok(await page.locator('[data-walk-photo]').count() === 1 && /pallets waiting in the lane/.test(await t.words('[data-walk-photos]')), '7 Dispatch’s page shows the photo filed to it');

/* ---- 8 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/ai?c=${encodeURIComponent(c.id)}`, 2500);
const camH = await page.locator('[data-camera]').evaluate(e => e.getBoundingClientRect().height).catch(() => 0);
ok(camH >= 40 && (await t.wide()) <= 0, `phone: the camera button ${Math.round(camH)} px, nothing off the side (${await t.wide()} px)`);
await t.go(`#/lines/${L3}`, 2800); await openLineMore(page);
ok(await page.locator('[data-walk-photo]').count() === 1 && (await t.wide()) <= 0, `phone: Line 3’s walk photos, nothing off the side (${await t.wide()} px)`);
const small = await page.evaluate(() => [...document.querySelectorAll('[data-walk-photos] button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim().slice(0, 30)));
ok(small.length === 0, `phone: every press in the walk photos 44 px or more${small.length ? ` — ${small.join(' · ')}` : ''}`);

await t.finish('The factory walk proved: where the person is kept apart from the subject, the parked thread here offered; the live camera stamping each photo with where and when; a photo filed only on a card, as a link to the one photograph, shown on the Bagger’s and Line 3’s pages and nowhere it was not filed; Dispatch a department of its own with nothing under it, by Luna and by hand.');
