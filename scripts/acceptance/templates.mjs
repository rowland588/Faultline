/* ACCEPTANCE — MY TEMPLATES (11 November, docs/CONSULTANT-WORKSPACE.md C5; lib/templates, ui/MyTemplates, screens/MyTemplatesScreen,
 * capabilities/templates — Rowland: "my assessment frameworks, operational improvement methodologies, report formats, checklists and
 * reusable templates should be available when I start working with a completely new business … should not be tied to Branston simply
 * because that was the first factory configured"). Driven in a real browser on the smoke seed:
 *
 *   1  at Branston (every line Branston): a charter (words, a figure, a sponsor, a team), a custom capture sheet (its own sections and a
 *      metric, Branston's values typed) and a 5S check log (its checks at the Branston hall) — each saved through More ▾ › Save as my
 *      template: the charter keeping the words I wrote, the sheet only its structure, the log only its checks; the records unchanged
 *   2  the templates are no customer's: not on Branston's Documents hub, its custom sheets, its 5S logs, the line's Tools, search or
 *      Luna's find; the device's count of records unchanged; My templates lists all three (the account menu and the Tools page's fold
 *      leading there)
 *   3  a new customer (Cobb Foods) with one line: each started from its template there — from My templates' Start one from it (the
 *      charter, the sheet) and from the 5S log's own New sheet (From my templates offered first, the starter list still there) — every
 *      record Cobb's, on Cobb's line by default; the structure carried; the charter's words kept and its figure, sponsor and names left
 *      out; the sheet's Branston values left out; the log's checks without the Branston hall
 *   4  Cobb's lists show the records started and no template; Branston's records not in Cobb's lists; Luna's list_templates names the
 *      three and start_from_template's card says the line and the customer
 *   5  My templates: Change (name and note), Take off and Undo; kept after a reload
 *   6  the phone: My templates' presses 44 px, the save sheet fits, nothing off the side
 *
 *   node scripts/acceptance/templates.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { more } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
page.on('dialog', d => void d.accept());
await t.seed();

/* every line Branston's; three records of Branston's on its first line */
const seeded = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { defOf } = await import('/src/tools/checks/registry.ts');
  const { newLogStudy } = await import('/src/tools/checks/start.ts');
  const lines = await liveProductionLines(await db.listWorkspaces());
  for (const w of lines) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
  const ws = lines[0].id, T = Date.now();
  const charter = {
    id: crypto.randomUUID(), tool: 'doc', name: 'BRANSTON give-away charter', workspaceId: ws, agreed: { doc: { def: 'charter' } },
    facts: { docValues: {
      measure: 'Give-away against the declared weight', unit: 'g a pack', baseline: 4.1, baselineHow: 'Mean of ten shifts on the line weigher',
      sponsor: 'Ann BRANSTON', scopeIn: 'The packing line, every shift',
      team: [{ id: 't1', c: { name: 'Jo BRANSTON', role: 'Line leader', hours: 20 } }],
    } }, uses: [], startedAt: T, createdAt: T, updatedAt: T,
  };
  const sheet = {
    id: crypto.randomUUID(), tool: 'doc', name: 'BRANSTON downtime sheet', workspaceId: ws, agreed: { doc: { def: 'custom' } },
    facts: {
      customDef: { title: 'Downtime capture', purpose: 'What stopped, for how long, on a shift',
        sections: [{ id: 'shift', title: 'The shift', fields: [{ id: 'area', label: 'Area', type: 'text' }, { id: 'planned', label: 'Planned minutes', type: 'number', unit: 'min' }, { id: 'stops', label: 'Stops', type: 'list', columns: [{ id: 'what', label: 'What', type: 'text' }, { id: 'mins', label: 'Minutes', type: 'number', unit: 'min' }] }] }],
        metrics: [{ id: 'down', name: 'Minutes stopped', kind: 'sum', of: ['stops.mins'], unit: 'min' }] },
      docValues: { area: 'BRANSTON bakery', planned: 450, stops: [{ id: 's1', c: { what: 'BRANSTON film jam', mins: 30 } }] },
    }, uses: [], startedAt: T, createdAt: T, updatedAt: T,
  };
  const log = newLogStudy(defOf('five-s'), { since: T, now: T, name: 'BRANSTON hall 5S', workspaceId: ws, where: 'BRANSTON hall' });
  for (const s of [charter, sheet, log]) await db.putStudy(s);
  return { ws, charter: charter.id, sheet: sheet.id, log: log.id, checks: log.agreed.log.checks.length, records: (await db.listAllStudies()).length };
});
await page.reload(); await page.waitForTimeout(1500);

/* 1 — SAVE AS MY TEMPLATE, on each record's More ▾ */
const saveAs = async (href, name, note, keep) => {
  await t.go(href, 3000);
  await more(page, 'Save as my template'); await page.waitForTimeout(400);
  const sheet = page.locator('[data-sheet="save-template"]');
  await sheet.getByLabel('The template’s name').fill(name);
  if (note) await sheet.getByLabel('A note on the template').fill(note);
  await sheet.getByLabel(keep).check();
  await sheet.locator('button[type="submit"]').click(); await page.waitForTimeout(1200);
  const said = await t.words('[data-template-saved]');
  await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(500);
  return said;
};
const s1 = await saveAs(`#/doc/charter/${seeded.charter}`, 'My site charter', 'First visit to a packing site', 'Keep the words I wrote');
ok(/Saved as your template “My site charter”/.test(s1) && /Project charter · the words you wrote/.test(s1), `1 the charter saved, keeping the words I wrote — "${s1.slice(0, 160)}"`);
const s2 = await saveAs(`#/doc/custom/${seeded.sheet}`, 'My downtime sheet', 'Any shift', 'Keep only the structure');
ok(/Downtime capture · 1 section, 1 metric · the structure only/.test(s2), `1 the custom sheet saved, its structure only — "${s2.slice(-80)}"`);
const s3 = await saveAs(`#/log/five-s/${seeded.log}`, 'My 5S walk', '', 'Keep only the checks');
ok(new RegExp(`5S audits · ${seeded.checks} checks? · the structure only`).test(s3), `1 the 5S log saved, only its checks — "${s3.slice(-60)}"`);
const after1 = await page.evaluate(async ids => {
  const db = await import('/src/db.ts');
  const [c, s, l] = await Promise.all([db.getStudy(ids.charter), db.getStudy(ids.sheet), db.getStudy(ids.log)]);
  return { same: [c, s, l].every(x => x && x.workspaceId === ids.ws && !x.facts.template), sponsor: c.facts.docValues.sponsor, area: s.facts.docValues.area, where: l.agreed.log.checks[0].where };
}, seeded);
ok(after1.same && after1.sponsor === 'Ann BRANSTON' && after1.area === 'BRANSTON bakery' && after1.where === 'BRANSTON hall', '1 the three records unchanged, still Branston’s on their line');

/* 2 — NO CUSTOMER'S RECORD */
const text = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const TPL = ['My site charter', 'My downtime sheet', 'My 5S walk'];
const none = async () => { const b = await text(); return !TPL.some(n => b.includes(n)); };
const out = {};
for (const h of ['#/doc', '#/doc/custom', '#/doc/charter', '#/log/five-s', '#/logs', `#/lines/${seeded.ws}?view=tools`, '#/tools', '#/today', '#/story']) { await t.go(h, 2500); out[h] = await none(); }
ok(Object.values(out).every(Boolean), `2 no template on Branston’s pages: ${Object.entries(out).map(([h, v]) => `${h} ${v ? 'none' : 'SHOWN'}`).join(', ')}`);
await page.locator('.nv-jump').click(); await page.waitForTimeout(400);
await page.locator('.jt-in').fill('My site'); await page.waitForTimeout(600);
const hits = (await page.locator('.jt-row').allInnerTexts()).join(' | ');
await page.keyboard.press('Escape');
ok(!hits.includes('My site charter'), `2 search “My site”: no template (${hits.slice(0, 80) || 'nothing'})`);
const counts = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const reg = await import('/src/capabilities/registry.ts');
  const f = await reg.runCall({ now: Date.now(), level: 'owner' }, { id: 'f', name: 'find', input: { words: 'My site charter' } }, { confirmed: false });
  const tr = await reg.runCall({ now: Date.now(), level: 'owner' }, { id: 'r', name: 'tool_records', input: { tool: 'doc' } }, { confirmed: false });
  return { records: (await db.listAllStudies()).length, templates: (await db.listTemplates()).map(x => x.id), find: JSON.stringify(f), tr: JSON.stringify(tr) };
});
ok(counts.records === seeded.records && counts.templates.length === 3, `2 the device’s records still ${counts.records} (were ${seeded.records}); 3 templates kept apart`);
ok(counts.templates.every(id => !counts.find.includes(id) && !counts.tr.includes(id)) && !counts.tr.includes('My site charter'), '2 Luna’s find and tool_records reach no template');
await t.go('#/tools', 2500);
await page.locator('[data-fold="tools-templates"] .fold-toggle').click(); await page.waitForTimeout(300);
const fold = await page.locator('[data-template-fold]').evaluateAll(es => es.map(e => e.getAttribute('data-template-fold')));
ok(TPL.every(n => fold.includes(n)) && /3 templates of your own/.test(await t.words('[data-fold="tools-templates"] .fold-s')), `2 the Tools page’s My templates fold: ${fold.join(', ')}`);
await page.locator('[data-fold="tools-templates"] .fold-toggle').click();
await page.locator('.acct-btn').click(); await page.waitForTimeout(400);
await page.locator('.sheet .sheet-row', { hasText: 'My templates' }).click(); await page.waitForTimeout(1500);
const rows = async () => page.locator('[data-template]').evaluateAll(es => es.map(e => e.getAttribute('data-template')));
ok(page.url().endsWith('#/templates') && (await rows()).length === 3 && (await t.words('.part-head h1')) === 'My templates',
  `2 the account menu’s My templates opens the page — ${(await rows()).join(', ')}`);
const charterRow = await t.words('[data-template="My site charter"]');
ok(/Document · Project charter · the words you wrote/.test(charterRow) && /First visit to a packing site/.test(charterRow), `2 each row says what it is and keeps, and its note — "${charterRow.slice(0, 120)}"`);

/* 3 — A NEW CUSTOMER, EACH STARTED THERE */
await t.go('#/factory', 3000);
await page.locator('[data-customer-add]').click();
await page.getByLabel('The customer’s name').fill('Cobb Foods');
await page.getByRole('button', { name: 'Add the customer' }).click(); await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Add lines' }).first().click(); await page.waitForTimeout(300);
await page.getByLabel("The new line's name").fill('Cobb Packing 1');
await page.getByRole('button', { name: 'Add line' }).click(); await page.waitForTimeout(1500);
const cobb = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.name === 'Cobb Packing 1')?.id);
ok(!!cobb && (await t.words('.nv-client-l')) === 'Cobb Foods', '3 Cobb Foods added with its line, the customer you are in');

const startFromPage = async (name, as) => {
  await t.go('#/templates', 2500);
  await page.locator(`[data-template="${name}"] [data-template-start]`).click(); await page.waitForTimeout(2200);
  const picked = await page.locator('[data-template-pick][aria-pressed="true"]').first().getAttribute('data-template-pick');
  const line = await page.getByLabel('Which line').inputValue();
  await page.getByLabel('What is it of?').fill(as);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(2200);
  return { picked, line };
};
const c1 = await startFromPage('My site charter', 'Cobb give-away');
const c2 = await startFromPage('My downtime sheet', 'Cobb downtime, nights');
ok(c1.picked === 'My site charter' && c1.line === cobb && c2.picked === 'My downtime sheet' && c2.line === cobb, `3 Start one from it opens the kind’s New sheet with the template chosen and Cobb’s line by default (${JSON.stringify([c1, c2].map(c => [c.picked, c.line === cobb]))})`);
/* the log from its own New sheet: From my templates offered first, the starter list still there */
await t.go('#/log/five-s?add=1', 2500);
const chips = await page.locator('[data-from-templates] [data-template-pick]').evaluateAll(es => es.map(e => e.textContent.trim()));
ok(chips[0] === 'My 5S walk' && chips.at(-1) === 'The starter list' && (await page.locator('.lg-pick').count()) === 1, `3 the 5S log’s New sheet: Start from ${chips.join(' · ')}, the starter list still offered`);
await page.locator('[data-template-pick="My 5S walk"]').click(); await page.waitForTimeout(500);
ok((await page.locator('.lg-pick').count()) === 0 && /From my templates — 5S audit/.test(await t.words('.tpl-from-says')), '3 picked: the template says what it carries, the starter list steps aside');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(2500);
const made = await page.evaluate(async ({ cobb }) => {
  const db = await import('/src/db.ts');
  const all = (await db.listStudiesForLine(cobb));
  const ch = all.find(s => s.name === 'Cobb give-away'), sh = all.find(s => s.name === 'Cobb downtime, nights'), lg = all.find(s => s.tool === 'log');
  return {
    ch: ch && { v: ch.facts.docValues, def: ch.agreed.doc.def, tpl: !!ch.facts.template },
    sh: sh && { def: sh.facts.customDef?.title, metrics: sh.facts.customDef?.metrics?.length, v: sh.facts.docValues ?? null, tpl: !!sh.facts.template },
    lg: lg && { name: lg.name, checks: lg.agreed.log.checks.length, where: lg.agreed.log.checks.map(c => c.where ?? '').join(''), results: (lg.facts.results ?? []).length, tpl: !!lg.facts.template },
  };
}, { cobb });
ok(made.ch && made.ch.def === 'charter' && !made.ch.tpl && made.ch.v.measure === 'Give-away against the declared weight' && made.ch.v.scopeIn === 'The packing line, every shift' && made.ch.v.baseline === undefined && made.ch.v.sponsor === undefined && JSON.stringify(made.ch.v.team.map(r => r.c)) === '[{"role":"Line leader"}]',
  `3 the charter on Cobb’s line: the words carried, the figure, the sponsor and the names left out (${JSON.stringify(made.ch?.v).slice(0, 200)})`);
ok(made.sh && made.sh.def === 'Downtime capture' && made.sh.metrics === 1 && made.sh.v === null && !made.sh.tpl, '3 the custom sheet on Cobb’s line: its sections and metric carried, Branston’s values left out');
ok(made.lg && made.lg.name === 'My 5S walk — Cobb Packing 1' && made.lg.checks === seeded.checks && !made.lg.where.includes('BRANSTON') && made.lg.results === 0 && !made.lg.tpl, `3 the 5S log on Cobb’s line: ${made.lg?.checks} checks, no Branston hall, no results`);

/* 4 — COBB'S LISTS, AND LUNA */
await t.go('#/doc', 3000);
const cobbDocs = await text();
ok(cobbDocs.includes('Cobb give-away') && cobbDocs.includes('Cobb downtime, nights') && !cobbDocs.includes('BRANSTON') && !TPL.slice(0, 2).some(n => cobbDocs.includes(n)), '4 Cobb’s Documents: its two records, nothing of Branston’s, no template');
await t.go('#/log/five-s', 2500);
const cobbLogs = await text();
ok(cobbLogs.includes('My 5S walk — Cobb Packing 1') && !cobbLogs.includes('BRANSTON hall 5S'), '4 Cobb’s 5S logs: its own, not Branston’s');
const luna = await page.evaluate(async cobb => {
  const reg = await import('/src/capabilities/registry.ts');
  const l = await reg.runCall({ now: Date.now(), level: 'owner' }, { id: 'l', name: 'list_templates', input: {} }, { confirmed: false });
  const id = l.data.templates.find(x => x.name === 'My 5S walk').id;
  const p = await reg.previewCall({ now: Date.now(), level: 'owner' }, { id: 'p', name: 'start_from_template', input: { templateId: id, lineId: cobb } });
  return { names: l.data.templates.map(x => x.name).sort(), preview: p.says };
}, cobb);
ok(JSON.stringify(luna.names) === JSON.stringify([...TPL].sort()) && /on Cobb Packing 1 \(Cobb Foods\)/.test(luna.preview), `4 Luna: list_templates names the three; start_from_template’s card — "${luna.preview.slice(0, 140)}"`);

/* 5 — CHANGE, TAKE OFF, UNDO, A RELOAD */
await t.go('#/templates', 2500);
await page.locator('[data-template="My 5S walk"] [data-template-change]').click(); await page.waitForTimeout(300);
await page.getByLabel('The template’s name').fill('My 5S audit walk');
await page.getByLabel('A note on the template').fill('Any packing hall');
await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1000);
ok((await rows()).includes('My 5S audit walk') && /Any packing hall/.test(await t.words('[data-template="My 5S audit walk"]')), '5 renamed and its note written');
await page.locator('[data-template="My downtime sheet"] [data-template-off]').click(); await page.waitForTimeout(1000);
ok(!(await rows()).includes('My downtime sheet') && (await rows()).length === 2, '5 taken off');
await page.getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1500);
ok((await rows()).includes('My downtime sheet') && (await rows()).length === 3, '5 Undo puts it back');
await page.reload(); await page.waitForTimeout(3000);
ok(JSON.stringify((await rows()).sort()) === JSON.stringify(['My 5S audit walk', 'My downtime sheet', 'My site charter']), `5 kept after a reload: ${(await rows()).join(', ')}`);

/* 6 — THE PHONE */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/templates', 2500);
const presses = await page.locator('.tpl-acts .btn, .tpl-acts .cw-link').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
ok(presses.length === 9 && presses.every(h => h >= 44) && (await t.wide()) <= 1, `6 the phone: My templates’ presses ${Math.min(...presses)} px or more (${presses.length}), nothing off the side`);
await t.go(`#/doc/charter/${seeded.charter}`, 3000);
await more(page, 'Save as my template'); await page.waitForTimeout(500);
const opts = await page.locator('.tpl-keep-o').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
ok(opts.length === 2 && opts.every(h => h >= 44) && (await t.wide()) <= 1, `6 the phone: the save sheet’s choices ${opts.join(', ')} px, nothing off the side`);

await t.finish('My templates accepted: a document, a check log and a custom sheet saved as the consultant’s own, kept out of every customer’s lists, search and Luna’s reads, started at a new customer on its line with the structure carried and the customer’s values left out as chosen, Luna listing and starting them, renamed, taken off and back, kept after a reload and on the phone.');
