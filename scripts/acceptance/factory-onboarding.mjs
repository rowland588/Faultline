/* ACCEPTANCE — ONBOARDING A FACTORY (9 November; docs/FACTORY-KNOWLEDGE.md F3–F5; src/capabilities/factoryDraft, factoryBuild,
 * factoryRead; colleague/AiFactory, factorySource, factoryRegister; the gateway's task factory-read).
 * Rowland, 8 November: "We're onboarding a new customer. The business is called Customer X. They've got two factories. The main
 * factory has three production areas. Let's start with packaging." … "Document upload — equipment registers … propose structured
 * records for review and approval, retain the source documents and trace extracted information back to its source" … "That
 * machine has now been replaced … know which information is current … Never let one client's knowledge be visible to another."
 * Driven in a real browser on the smoke seed, the `assist` gateway answered by the script round by round (the capabilities run for
 * real on the device):
 *
 *   1  the onboarding said: Customer X Foods, two factories, the main one's five areas — Being built shows the tree, every area
 *      held until a line is made in it; nothing is a record
 *   2  Packaging Lines 1–3 with a weighing scale, a bagging machine, a metal detector, a checkweigher and a case packer each —
 *      resolve first (none known), then noted: 3 new lines and 15 new machines, each kind reported; factory_map for the client
 *      holds nothing of another client's (Brook Dairy's line is never in it)
 *   3  Make it from the panel: what it will make said first, nothing written until Do it; then the three lines on the Factory page
 *      under Main factory › Packaging, the machines on their line with their kind and how it is known
 *   4  a CSV equipment register uploaded (dated 1 March 2026): its rows proposed with the words they came from, waiting; a row with
 *      no line said and left out; the bagging machine's model differing from what was said — both side by side, flagged as older;
 *      one proposal corrected in conversation (its earlier value struck); kept, the recorded value picked, made; the register kept
 *      as a factory source on its line
 *   5  "the bagger on line 2 has been replaced by a new model" — resolve, then replace_machine as a card; Do it: the new machine on
 *      the line, the old one's page saying Replaced by
 *   6  the phone: Being built in the context sheet, nothing off the side, every press 44 px
 *
 *   node scripts/acceptance/factory-onboarding.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  if (body.task === 'factory-read') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not used here' }) });
  const next = plan.shift();
  const answer = next ? next(body) : { ok: false, why: 'nothing planned' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(600);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = (b, i = 0) => b.pending?.results?.[i];
const dataOf = (b, i = 0) => result(b, i)?.data ?? {};
const lastReply = () => t.words('.ai-turn.is-colleague:last-of-type .ai-words');
const db = () => page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const [lines, assets, studies] = await Promise.all([d.listWorkspaces(), d.listAllAssets(), d.listAllStudies()]);
  return { lines: lines.map(w => ({ id: w.id, name: w.name, clientName: w.clientName, siteName: w.siteName, areaName: w.areaName, assets: w.assets, known: w.known })),
    assets: assets.map(a => ({ id: a.id, name: a.name, workspaceId: a.workspaceId, kind: a.kind, model: a.model, serial: a.serial, oem: a.oem, known: a.known, replacedBy: a.replacedBy, deletedAt: a.deletedAt })),
    sources: studies.filter(s => s.tool === 'doc' && s.facts?.customDef?.title === 'Factory source').map(s => ({ id: s.id, name: s.name, workspaceId: s.workspaceId, text: s.facts.docValues?.text, taken: s.facts.docValues?.taken, file: s.facts.docPhotos?.[0] })) };
});
const box = '[data-ctx-built] [data-draft-kind="factory"]';
const node = (name, level) => `${box} [data-fd-node="${name}"]${level ? `[data-fd-level="${level}"]` : ''}`;
const CLIENT = 'Customer X Foods';
const MACHINES = [['Weighing scale', 'scales'], ['Bagging machine', 'bagging machine'], ['Metal detector', 'metal detector'], ['Checkweigher', 'checkweigher'], ['Case packer', 'case packer']];

/* another client's line, on this device — never to be seen in Customer X Foods' factory */
await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Dairy Line 1');
  await d.updateWorkspace({ ...w, clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Packaging', assets: ['Separator', 'Bagging machine'] });
});

/* ---- 1 · the onboarding said ---- */
await t.go('#/ai', 2500);
let draftId = '';
const said1 = 'We’re onboarding a new customer. The business is called Customer X Foods. They’ve got two factories. The main factory has five production areas — Preparation, Mixing, Cooking, Packaging and Despatch. Let’s start with packaging.';
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'o1', name: 'add_to_factory_draft', input: { client: CLIENT, items: [
    { op: 'add', level: 'site', name: 'Main factory', said: 'They’ve got two factories. The main factory' },
    { op: 'add', level: 'site', name: 'Second factory', said: 'two factories' },
    ...['Preparation', 'Mixing', 'Cooking', 'Packaging', 'Despatch'].map(a => ({ op: 'add', level: 'area', name: a, site: 'Main factory', said: 'five production areas' })),
  ] } }] }),
  b => { draftId = dataOf(b).draftId ?? ''; return { ok: true, reply: result(b)?.ok ? 'Noted the two factories and the main one’s five areas. What lines are in Packaging?' : `Not noted: ${result(b)?.says}` }; },
];
await send(said1);
await answered(1);
ok(!!draftId && /Started Customer X Foods — the factory as a draft/.test(result(asks.at(-1))?.says ?? ''), `1 add_to_factory_draft started the draft for ${CLIENT}`);
ok((await page.locator(box).count()) === 1 && /a draft — nothing kept as a record yet/.test(await t.words(`${box} .ai-draft-t`)), '1 Being built shows the factory as a draft');
ok((await page.locator(`${box} [data-fd-level="site"]`).count()) === 2 && (await page.locator(`${box} [data-fd-level="area"]`).count()) === 5, '1 two sites and five areas in the tree');
ok(/Reported/.test(await t.words(`${node('Packaging', 'area')} [data-fd-how]`)), '1 each with how it is known — reported');
const held1 = await t.words(`${box} [data-fd-held]`);
const depts1 = await t.words(`${box} [data-fd-depts]`);
/* an area with no line is a department of its own (10 November, docs/FACTORY-WALK.md); a site with nothing in it is held */
ok(/Departments with no line yet — made as departments of their own: .*Preparation \(Main factory\)/.test(depts1) && /Held on the draft until a line is made in them: .*Second factory/.test(held1), `1 areas with no line as departments, a site with none held: "${depts1.slice(0, 120)}" · "${held1.slice(0, 80)}"`);
ok(!(await db()).lines.some(l => l.clientName === CLIENT), '1 nothing made yet');
ok(/What lines are in Packaging/.test(await lastReply()), '1 the colleague asks one question back');

/* ---- 2 · the lines and their machines, resolved first ---- */
const said2 = 'Packaging has three lines — Packaging Line 1, 2 and 3. Each has a weighing scale, a bagging machine, a metal detector, a checkweigher and a case packer. On line 1 the bagging machine is an Ishida, model BX-200.';
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'r1', name: 'resolve', input: { words: 'Packaging Line 1', client: CLIENT } }] }),
  b => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'o2', name: 'add_to_factory_draft', input: { draftId, items: [
    ...[1, 2, 3].flatMap(k => MACHINES.map(([m, kind]) => ({ op: 'add', level: 'machine', name: m, line: `Packaging Line ${k}`, site: 'Main factory', area: 'Packaging', kind, said: `Each has a ${kind}`,
      ...(k === 1 && m === 'Bagging machine' ? { maker: 'Ishida', model: 'BX-200', said: 'On line 1 the bagging machine is an Ishida, model BX-200' } : {}) }))),
  ] } }], _resolved: result(b)?.says }),
  b => ({ ok: true, reply: result(b)?.ok ? 'That is the three lines with their five machines each. Shall I make them?' : `Not noted: ${result(b)?.says}` }),
];
await send(said2);
await answered(2);
const resolved = result(asks.find(a => a.pending?.results?.[0]?.id === 'r1') ?? {})?.says ?? '';
ok(/not known|Nothing of/.test(resolved) && !/Dairy/.test(resolved), `2 resolve first: "${resolved.slice(0, 100)}" — nothing of another client's offered`);
ok((await page.locator(`${box} [data-fd-level="line"]`).count()) === 3 && (await page.locator(`${box} [data-fd-level="machine"]`).count()) === 15, '2 three lines and fifteen machines in the tree');
ok((await page.locator(`${box} [data-fd-level="line"][data-fd-state="new"]`).count()) === 3, '2 each line New — none of them in Faultline already');
const counts2 = await t.words(`${box} [data-fd-counts]`);
ok(/3 new lines · 15 new machines/.test(counts2), `2 the counts: "${counts2}"`);
const bagger1 = `${box} [data-fd-node="Packaging Line 1"] [data-fd-node="Bagging machine"]`;
ok(/Kind\s*bagger\s*Reported/.test(await t.words(`${bagger1} [data-fd-fact="kind"]`)) && /BX-200/.test(await t.words(`${bagger1} [data-fd-fact="model"]`)), '2 the bagging machine a bagger, its model BX-200, reported');
ok(!/held/i.test(await t.words(`${box} [data-fd-held]`)) || !/Packaging \(/.test(await t.words(`${box} [data-fd-held]`)), '2 Packaging no longer held — it has lines');
/* the map: one client's only */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'm1', name: 'factory_map', input: { client: CLIENT } }] }),
  b => ({ ok: true, reply: JSON.stringify(dataOf(b)).includes('Dairy') ? 'I can see Brook Dairy too.' : 'Nothing of Customer X Foods is in Faultline yet.' }),
];
await send('What do we hold for them so far?');
await answered(3);
ok(/Nothing of Customer X Foods/.test(result(asks.at(-1))?.says ?? '') && !JSON.stringify(dataOf(asks.at(-1))).includes('Dairy'), '2 factory_map for Customer X Foods: nothing yet, and nothing of Brook Dairy');

/* ---- 3 · Make it, from the panel ---- */
await page.locator(`${box} [data-make]`).click();
await page.waitForSelector(`${box} [data-draft-card]`, { timeout: 5000 }).catch(() => undefined);
const preview = await t.words(`${box} [data-draft-card]`);
ok(/Make Customer X Foods’s factory in Faultline/.test(preview) && /3 new lines — Packaging Line 1 \(Main factory › Packaging\) with Weighing scale, Bagging machine/.test(preview) && /Held on the draft/.test(preview), `3 what it will make said first: "${preview.slice(0, 160)}"`);
ok(!(await db()).lines.some(l => l.clientName === CLIENT), '3 nothing written while the card waits');
await page.locator(`${box} [data-draft-card]`).getByRole('button', { name: 'Do it' }).click();
await page.waitForSelector(`${box}[data-draft-status="made"]`, { timeout: 10000 }).catch(() => undefined);
await page.waitForTimeout(800);
let d = await db();
const mine = d.lines.filter(l => l.clientName === CLIENT);
ok(mine.length === 3 && mine.every(l => l.siteName === 'Main factory' && l.areaName === 'Packaging' && l.known?.clientName?.how === 'reported'), '3 Do it: three lines on Customer X Foods, Main factory › Packaging, how known reported');
const line1 = mine.find(l => l.name === 'Packaging Line 1'), line2 = mine.find(l => l.name === 'Packaging Line 2'), line3 = mine.find(l => l.name === 'Packaging Line 3');
const onLine = id => d.assets.filter(a => a.workspaceId === id && !a.deletedAt);
ok(MACHINES.every(([m]) => (line1?.assets ?? []).includes(m)) && onLine(line1?.id).length === 5, '3 the five machines on Packaging Line 1, a record each');
const bag1 = onLine(line1?.id).find(a => a.name === 'Bagging machine');
ok(bag1?.kind === 'bagger' && bag1?.model === 'BX-200' && bag1?.oem === 'Ishida' && bag1?.known?.model?.how === 'reported' && bag1?.known?.model?.source?.kind === 'conversation', '3 the bagger’s kind, model and maker kept as reported in the conversation');
ok((await page.locator(`${box} [data-fd-level="line"][data-fd-state="made"]`).count()) === 3, '3 the tree says each line made');
ok((d.lines.find(l => l.name === 'Dairy Line 1')?.assets ?? []).join() === 'Separator,Bagging machine', '3 Brook Dairy’s line untouched');
/* the Factory page under their site › area */
await t.go('#/room', 3000);
await page.locator('.fac-clients .chip', { hasText: CLIENT }).click().catch(() => undefined); await page.waitForTimeout(700);
const inPack = await page.locator('.fac-place[data-place="Main factory › Packaging"] .fac-card-name').allInnerTexts();
ok(inPack.length === 3 && !(await page.locator('.fac-card-name', { hasText: 'Dairy Line 1' }).count()), `3 the Factory page: ${inPack.join(', ')} under Main factory › Packaging, Customer X Foods only`);
/* the machine on its line page */
await t.go(`#/lines/${encodeURIComponent(line1.id)}/machine/${encodeURIComponent('Weighing scale')}`, 2500);
const kindRow = await t.words('[data-field="kind"]');
ok(/scale/.test(kindRow) && /Reported in “AI Mode/.test(kindRow), `3 the weighing scale’s page: "${kindRow}"`);

/* ---- 4 · a CSV register uploaded ---- */
await page.goBack(); await page.waitForTimeout(500);
await t.go('#/ai', 2000);
await page.locator('.ai-conv').first().click().catch(() => undefined);
await page.waitForTimeout(1500);
const csv = [
  'Customer X Foods — equipment register',
  'Date: 2026-03-01',
  'Site,Area,Line,Equipment,Type,Make,Model,Serial No',
  'Main factory,Packaging,Packaging Line 1,Bagging machine,Bagging machine,Ishida,BX-100,B1001',
  'Main factory,Packaging,Packaging Line 3,Labeller,Labeller,Videojet,9500,L3001',
  'Main factory,Packaging,Packaging Line 3,Metal detector,Metal detector,Loma,IQ4,M3001',
  'Main factory,Packaging,,Spare scale,Weighing scale,Avery,AV-200,S900',
].join('\n');
await page.locator('input[aria-label="Choose a factory document"]').setInputFiles({ name: 'Equipment register.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
await page.waitForSelector('[data-fdoc]', { timeout: 5000 }).catch(() => undefined);
ok((await page.locator('input[aria-label="Whose factory is it"]').inputValue()) === CLIENT, '4 the sheet asks whose factory — Customer X Foods, from the draft');
await page.locator('[data-fdoc-read]').click();
await page.waitForSelector('[data-fdoc-said]', { timeout: 8000 }).catch(() => undefined);
const read = await t.words('[data-fdoc-said]');
ok(/Read Equipment register\.csv \(dated 2026-03-01\): 3 things proposed into Customer X Foods’s factory/.test(read) && /Row 4 names no line — left out/.test(read), `4 read by rules: "${read.slice(0, 200)}"`);
ok(!asks.some(a => a.task === 'factory-read'), '4 a CSV is read in code — nothing sent to the assistant');
await page.locator('.sheet').getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(600);
const labeller = `${box} [data-fd-node="Packaging Line 3"] [data-fd-node="Labeller"]`;
ok((await page.locator(`${labeller}[data-fd-state="pending"]`).count()) === 1 && /Main factory,Packaging,Packaging Line 3,Labeller,Labeller,Videojet,9500,L3001/.test(await t.words(`${labeller} [data-fd-quote]`)), '4 the labeller proposed, waiting, with the row it came from');
ok(/From Equipment register\.csv/.test(await t.words(`${labeller} [data-fd-fact="model"]`)), '4 its model said to be from the register');
const conflict = `${box} [data-fd-node="Packaging Line 1"] [data-fd-node="Bagging machine"] [data-fd-conflict="model"]`;
const cw = await t.words(conflict);
ok(/Faultline holds BX-200/.test(cw) && /The document says BX-100/.test(cw) && /dated 1 Mar 2026/.test(cw), `4 the bagging machine: recorded BX-200 against the register’s BX-100, with where each came from: "${cw.slice(0, 160)}"`);
ok(/dated 1 Mar 2026, but the Bagging machine’s model was recorded on/.test(await t.words(`${box} [data-fd-node="Packaging Line 1"] [data-fd-node="Bagging machine"] [data-fd-flag]`)), '4 the register flagged as older than what is recorded');
ok((await page.locator(`${box} [data-make]`).count()) === 0 && /wait for your word/.test(await t.words(`${box} [data-fd-blockers]`)), '4 Make it held while proposals wait and the difference is not picked');
/* one corrected in conversation */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'c1', name: 'add_to_factory_draft', input: { draftId, items: [{ op: 'set', level: 'machine', name: 'Labeller', of: 'Packaging Line 3', model: '9550', said: 'the labeller on line 3 is the 9550 now, not the 9500' }] } }] }),
  b => ({ ok: true, reply: result(b)?.ok ? 'Put right — the 9550.' : `Not put right: ${result(b)?.says}` }),
];
await send('The labeller on line 3 is the 9550 now, not the 9500.');
await answered(4);
const lm = await t.words(`${labeller} [data-fd-fact="model"]`);
ok(/9550/.test(lm) && (await t.words(`${labeller} [data-fd-fact="model"] s[data-earlier]`)) === '9500' && /Reported/.test(lm), `4 corrected in conversation: "${lm}" — 9500 struck, 9550 reported`);
/* kept, picked, made */
await page.locator(`${box} [data-keep-all]`).click(); await page.waitForTimeout(800);
await page.locator(`${conflict} [data-pick="recorded"]`).click(); await page.waitForTimeout(800);
ok(/Keeping BX-200/.test(await t.words(`${conflict} [data-fd-picked]`)) && !(await page.locator(`${box} [data-fd-state="pending"]`).count()), '4 every proposal kept, the recorded BX-200 picked');
await page.locator(`${box} [data-make]`).click();
await page.waitForSelector(`${box} [data-draft-card]`, { timeout: 5000 }).catch(() => undefined);
await page.locator(`${box} [data-draft-card]`).getByRole('button', { name: 'Do it' }).click();
await page.waitForTimeout(1500);
d = await db();
const lab = d.assets.find(a => a.workspaceId === line3?.id && a.name === 'Labeller');
ok(!!lab && lab.model === '9550' && lab.known?.model?.how === 'reported' && lab.oem === 'Videojet' && lab.known?.oem?.how === 'document' && /Labeller,Videojet/.test(lab.known?.oem?.source?.quote ?? ''), '4 made: the labeller on Line 3 — its model as corrected (reported), its maker from the register with the row');
const md3 = d.assets.find(a => a.workspaceId === line3?.id && a.name === 'Metal detector');
ok(md3?.model === 'IQ4' && md3?.known?.model?.how === 'document', '4 the metal detector already on Line 3 matched, not doubled — its model taken from the register');
ok(d.assets.filter(a => a.workspaceId === line3?.id && a.name === 'Metal detector' && !a.deletedAt).length === 1, '4 still one metal detector on Line 3');
ok(d.assets.find(a => a.workspaceId === line1?.id && a.name === 'Bagging machine')?.model === 'BX-200', '4 the recorded BX-200 kept — the older register did not overwrite it');
const src = d.sources.find(s => s.name.startsWith('Equipment register.csv'));
ok(!!src && src.text.includes('Packaging Line 3,Labeller') && src.file?.mime === 'text/csv' && (src.taken ?? []).length === 3 && mine.some(l => l.id === src.workspaceId), '4 the register kept as a factory source: its file, its words, what was taken from it, on its line');

/* ---- 5 · the bagger on line 2 replaced ---- */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'r2', name: 'resolve', input: { words: 'the bagger on packaging line 2', client: CLIENT } }] }),
  b => {
    const c = (dataOf(b).candidates ?? [])[0] ?? {};
    return { ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'x1', name: 'replace_machine', input: { lineId: c.lineId, machine: 'Bagging machine', name: 'Bagger — Ishida Atlas', kind: 'bagger', maker: 'Ishida', model: 'Atlas', said: 'the bagger on line 2 has been replaced by a new model' } }] };
  },
  b => ({ ok: true, reply: result(b)?.ok ? 'Recorded — the Atlas is on Line 2 and the old bagger keeps its history.' : 'Not recorded.' }),
];
await send('The bagger on line 2 has been replaced by a new model — an Ishida Atlas.');
await page.waitForSelector('[data-card="replace_machine"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const rcard = page.locator('[data-card="replace_machine"][data-card-status="waiting"]');
const rsaid = (await rcard.innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/Record that Bagging machine on Packaging Line 2 has been replaced by Bagger — Ishida Atlas \(a bagger, made by Ishida, model Atlas\)/.test(rsaid), `5 replace_machine is a card: "${rsaid.slice(0, 160)}"`);
ok(d.assets.filter(a => a.workspaceId === line2?.id && a.replacedBy).length === 0, '5 nothing changed while the card waits');
await rcard.getByRole('button', { name: 'Do it' }).click();
await answered(5);
d = await db();
const oldBag = d.assets.find(a => a.workspaceId === line2?.id && a.name === 'Bagging machine');
const newBag = d.assets.find(a => a.workspaceId === line2?.id && a.name === 'Bagger — Ishida Atlas');
ok(!!newBag && oldBag?.replacedBy === newBag.id && !oldBag.deletedAt && newBag.model === 'Atlas' && oldBag.known?.replacedBy?.how === 'reported', '5 Do it: the new machine on Line 2, the old one kept and marked replaced by it, reported');
ok((d.lines.find(l => l.id === line2?.id)?.assets ?? []).includes('Bagger — Ishida Atlas') && !(d.lines.find(l => l.id === line2?.id)?.assets ?? []).includes('Bagging machine'), '5 the line’s list carries the new name in its place');
ok(/Recorded — the Atlas/.test(await lastReply()), '5 the colleague says it is recorded only after the result');
await t.go(`#/lines/${encodeURIComponent(line2.id)}/machine/${encodeURIComponent('Bagging machine')}`, 2500);
const rep = await t.words('[data-replaced-by]');
ok(/Replaced by Bagger — Ishida Atlas/.test(rep), `5 the old machine’s page: "${rep}"`);

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/ai', 1500);
await page.locator('.ai-list-b').click().catch(() => undefined);
await page.waitForTimeout(500);
const firstConv = page.locator('.sheet .ai-conv').first();
if (await firstConv.count()) { await firstConv.click(); await page.waitForTimeout(1500); }
await page.locator('.ai-strip').click(); await page.waitForTimeout(700);
ok((await page.locator('.sheet [data-draft-kind="factory"]').count()) === 1 && (await t.wide()) <= 0, `phone: the factory in the context sheet, nothing off the side (${await t.wide()} px)`);
const small = await page.evaluate(() => [...document.querySelectorAll('.sheet [data-draft-kind="factory"] button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim().slice(0, 30)));
ok(small.length === 0, `phone: every press in the factory 44 px or more${small.length ? ` — ${small.join(' · ')}` : ''}`);

await t.finish('Onboarding a factory proved: said into a tree, resolved and matched, made on the Factory page under its site › area; a CSV register proposed with its words, corrected, picked, kept and made, the register kept as a source; a machine replaced with its history kept; another client never seen.');
