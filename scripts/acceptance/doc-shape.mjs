/* ACCEPTANCE — THE DOCUMENT SHAPE, FOR EVERY DOCUMENT THERE IS (knowledge/specs/FC-240-documents.md; 1 November 2026).
 *
 * TABLE-DRIVEN: it asks the app for every registered definition (src/tools/doc/registry) and walks each one through the real page — so a
 * document added later is covered with no change here. For each definition:
 *   a  its card on the hub, then its own list: New, a name, the record opened — a fresh record is a Draft that names what it still needs
 *   b  every worked example typed through the real boxes (a text in its box, a choice by its button, a list by Add and its cells) — the
 *      sentence, the tiles, the tables, the money, the checks and the boxes still needed as the example's independent literals say AND as the
 *      definition reads them in the page; where the example reads the project (the 8D), the project's records are made first
 *   c  the figures kept after a reload; the document agreed by name and date (locked, kept, reopened), the status moving as it should
 *   d  the paper downloaded and read back: the status line, every section, every box given, every list row, the tables, the money, what it
 *      does not say, the photos' captions — and "Agreed by" once it is signed
 *   e  the phone: 390 px, nothing off the side, every box thumb-sized
 *   f  a row taken out of a list and Undo; photos added with a caption, taken out and brought back, kept after a reload and named to the cloud
 *   g  Rename in More ▾, Delete (the ask says what goes) and Undo — back whole
 * then, once: the hub counted and listing the saved ones, a line's Tools page with its row and the line report with each document ticked in and
 * printed, a project's New (the project's own), a client reading read-only with its paper, and no console error anywhere.
 *
 *   node scripts/acceptance/doc-shape.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper, more as pressMore } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'doc-shape-'));
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => String(s ?? '').replace(/\s*→\s*/g, ' to ').replace(/\s+/g, '').replace(/[’‘]/g, "'");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];
let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${String(extra).slice(0, 600)}` : ''}`); if (!c) failed++; };

/** A device: a width, and whether the person is a team member (default) or a client (access forced). */
async function device(width, access) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s, a]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION, access]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  return { ctx, page };
}
const { page } = await device(1360);
let asked = '', answer = true;
page.on('dialog', d => { asked = d.message(); void (answer ? d.accept() : d.dismiss()); });
const openFolds = async (pg = page) => { for (let n = 0; n < 60; n++) { const t = pg.locator('.doc-form .fold:not(.is-open) .fold-toggle').first(); if (!(await t.count())) break; await t.click(); } }; // a document's sections are folds (docs/DESIGN.md): open them all before typing
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); await openFolds(); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const pdf = async (pg, name, label) => {
  const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pressPaper(pg, label)]);
  const f = join(OUT, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const recordId = () => decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');
const dbGet = id => page.evaluate(async id => (await import('/src/db.ts')).getStudy(id), id);

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const defs = await page.evaluate(async () => (await import('/src/tools/doc/registry.ts')).DOCS.map(d => ({
  key: d.key, fc: d.fc, title: d.title, says: d.says, group: d.group, noun: d.noun, question: d.question, signoff: d.signoff ?? null,
  sections: d.sections.map(s => ({ id: s.id, title: s.title, items: s.items.map(i => ({ id: i.id, kind: i.kind, label: i.label, required: !!i.required, columns: (i.columns ?? []).map(c => ({ id: c.id, kind: c.kind, label: c.label })) })) })),
  examples: d.examples,
})));
ok(defs.length >= 5, `${defs.length} documents registered: ${defs.map(d => d.key).join(', ')}`);

/** What the definition reads in the page for these boxes and this world — the truth the screen is checked against. */
const truth = (key, values, ctx) => page.evaluate(async ([key, values, ctx]) => {
  const D = await import('/src/tools/doc/doc.ts'), R = await import('/src/tools/doc/registry.ts');
  const run = D.runDoc(R.docByKey(key), values, [], { today: '2026-11-01', ...(ctx ?? {}) });
  return { sentence: run.result.sentence, tiles: run.tiles.map(t => [t.k, t.v]), money: run.result.money.text ?? null, need: run.need, status: run.status.key, tables: (run.result.tables ?? []).map(t => t.title) };
}, [key, values, ctx]);

/* ---- typing a document through its real boxes ---- */
async function fill(d, values) {
  for (const sec of d.sections) for (const it of sec.items) {
    const v = values[it.id];
    if (it.kind === 'photos') continue;
    if (it.kind === 'list') {
      for (const [i, row] of (v ?? []).entries()) {
        await page.locator(`[data-add-row="${it.id}"]`).click();
        for (const c of it.columns) {
          if (row.c[c.id] === undefined) continue;
          const cell = page.locator(`[data-list="${it.id}"] [data-row="${i}"] [data-cell="${c.id}"]`);
          if (c.kind === 'choice') await cell.locator(`[data-value="${row.c[c.id]}"]`).click();
          else await cell.locator('input, textarea').fill(String(row.c[c.id]));
        }
      }
      continue;
    }
    if (v === undefined) continue;
    if (it.kind === 'choice') await page.locator(`[data-field="${it.id}"] [data-value="${v}"]`).click();
    else await page.locator(`[data-field-input="${it.id}"]`).fill(String(v));
  }
  await page.waitForTimeout(800);
}
const tilesOf = async () => Object.fromEntries(await page.locator('.doc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const tableOf = title => page.locator(`[data-doc-table="${title}"] tbody tr`).evaluateAll(rs => rs.map(r => [...r.children].map(c => c.textContent?.replace(/\s+/g, ' ').trim())));

/** A new record of this kind, from its own list. */
async function started(d, name, qs = '') {
  await go(`#/doc/${d.key}${qs}`);
  await page.getByRole('button', { name: `New ${d.noun}` }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(name);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500); await openFolds();
  return recordId();
}

/** The project's records an example reads — made for real, and the document put on that project and line. */
async function world(id, c) {
  return page.evaluate(async ([id, c]) => {
    const D = await import('/src/db.ts');
    const ws = await D.createWorkspace('Line 3 — document world');
    const pr = await D.createProject('Seal complaint', '#0c7489', 'Sam Patel');
    await D.addPaceLine({ projectId: pr.id, key: 'L3', name: 'Line 3', workspaceId: ws.id });
    const at = iso => Date.parse(`${iso}T12:00:00`);
    for (const p of c.problems ?? []) await D.addSnag({ id: p.id, workspaceId: ws.id, projectId: pr.id, problem: p.problem, status: p.status, priority: p.priority, owner: p.owner, raisedAt: at(p.raisedOn), ...(p.closedOn ? { closedAt: at(p.closedOn) } : {}), updatedAt: Date.now() });
    for (const a of c.actions ?? []) await D.putPaceTodo({ id: a.id, projectId: pr.id, what: a.what, where: '', why: a.why ?? '', who: a.who, when: '', due: a.due, state: a.state, ...(a.doneOn ? { doneOn: a.doneOn } : {}), createdAt: Date.now(), updatedAt: Date.now() });
    for (const s of c.studies ?? []) await D.putStudy({ id: s.id, tool: 'calc', name: s.name, projectId: pr.id, workspaceId: ws.id, agreed: { calc: { key: 'kanban', inputs: { thing: 'trays', usage: 1500, usageHours: 7.5, leadMin: 120, container: 60, safety: 15 } } }, facts: {}, uses: [], startedAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now() });
    for (const k of c.causes ?? []) await D.addCase({ id: `case-${k.id}`, workspaceId: ws.id, projectId: pr.id, lineId: ws.id, title: 'Leaking seals', path: [], baselineMsWeek: 0, status: 'open', openedAt: Date.now(), updatedAt: Date.now(), causes: [{ id: k.id, m: 'machine', text: k.text, grade: 'measured', status: 'confirmed', root: k.root, whys: Array.from({ length: k.whys }, (_, i) => ({ id: `w${i}`, text: `why ${i + 1}` })), at: Date.now() }] });
    await D.patchStudy(id, { projectId: pr.id, workspaceId: ws.id });
    return { projectId: pr.id, wsId: ws.id };
  }, [id, c]);
}

/** A small real picture, made in the page. */
const picture = (w, h, colour) => page.evaluate(async ([w, h, colour]) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.fillStyle = colour; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(8, 8, w / 2, h / 3);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return [...new Uint8Array(await blob.arrayBuffer())];
}, [w, h, colour]);

/* ---- 0 · the hub ---- */
await go('#/doc');
ok(/^Documents$/.test((await words('h1')) ?? ''), '0 the hub is named Documents');
for (const g of [...new Set(defs.map(d => d.group))]) ok(((await page.locator('.part-sec-h h2').allInnerTexts()).map(flat)).includes(g), `0 the group “${g}” is a heading`);
for (const d of defs) {
  const card = flat((await page.locator(`[data-doc-card="${d.key}"]`).innerText().catch(() => '')) ?? '');
  ok(card.includes(d.title) && card.includes(d.says), `0 ${d.key}: its card says what it is for — "${card.slice(0, 90)}"`);
}
const savedTexts = (await page.locator('.lt-rows .lt-li').allInnerTexts()).map(flat);
ok(['Give-away on Line 3', 'Slicing and packing', 'Leaking seals, lane 3'].every(n => savedTexts.some(t => t.includes(n))), `0 the saved ones are listed, each with its kind and where it stands (${savedTexts.length})`);
ok(/Project charter · Ready to agree/.test(savedTexts.find(t => t.includes('Give-away on Line 3')) ?? ''), '0 a row says its kind and its status', savedTexts[0]);
ok(/1 saved/i.test(flat(await page.locator('[data-doc-card=charter]').innerText())), '0 the charter card counts its saved one');

/* ---- per definition ---- */
let signedKey;
for (const d of defs) {
  const tag = d.key;
  /* a · New, from the kind's own page */
  await go(`#/doc/${d.key}`);
  ok(flat(await page.locator('h1').first().innerText()) === d.title && (await words('.pace-lede'))?.includes(d.question), `${tag} a its page: ${d.title}, and the question it answers`);
  await page.getByRole('button', { name: `New ${d.noun}` }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(`Acceptance — ${d.title}`);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500); await openFolds();
  const id0 = recordId();
  ok(page.url().includes(`/doc/${d.key}/`) && id0.length > 8, `${tag} a started: ${page.url().split('#')[1]}`);
  ok(/Draft/.test((await words('[data-doc=sign]')) ?? '') && /0 of \d+ needed boxes/.test((await words('[data-doc=sign]')) ?? ''), `${tag} a a new document is a Draft saying how much is filled: "${(await words('[data-doc=sign]'))?.slice(0, 90)}"`);
  const required = d.sections.flatMap(s => s.items).filter(i => i.required);
  const needsText = (await words('[data-doc=needs]')) ?? '';
  ok(required.every(i => needsText.includes(i.label)), `${tag} a …and names every needed box (${required.length}): ${required.map(i => i.label).slice(0, 3).join(' · ')}…`, needsText);
  ok((await page.locator('[data-doc=sentence]').count()) === 0 && (await page.locator('[data-doc=waiting]').count()) === 1, `${tag} a nothing is said before there is something to say`);
  for (const sec of d.sections) ok((await page.locator(`[data-doc-section="${sec.id}"] .fold-t`).first().innerText()) === sec.title, `${tag} a section “${sec.title}”, a fold saying how far it is written`);

  /* b · every example, through the real boxes */
  let full;
  for (const [i, ex] of d.examples.entries()) {
    const id = await started(d, `Acceptance ${d.key} ${i + 1}`);
    const today = ex.ctx?.today ?? '2026-11-01';
    await page.clock.setFixedTime(new Date(`${today}T12:00:00`));
    let w = null;
    if (ex.ctx?.problems || ex.ctx?.actions) w = await world(id, ex.ctx);
    await page.reload(); await page.locator('.nv-main').waitFor(); await page.waitForTimeout(1500);
    await fill(d, ex.values);
    const t = await truth(d.key, ex.values, ex.ctx);
    const say = await words('[data-doc=sentence]');
    if (ex.expect.sentence === '') ok(say === null && (await page.locator('[data-doc=waiting]').count()) === 1, `${tag} b${i + 1} “${ex.name}”: nothing said yet, and it says what is still to fill in`);
    else ok(say === ex.expect.sentence && t.sentence === say, `${tag} b${i + 1} “${ex.name}”: "${say?.slice(0, 150)}${(say?.length ?? 0) > 150 ? '…' : ''}"`, `${say} || ${ex.expect.sentence}`);
    const tiles = await tilesOf();
    ok(Object.entries(ex.expect.tiles).every(([k, v]) => tiles[k] === v), `${tag} b${i + 1} the tiles: ${Object.entries(ex.expect.tiles).map(([k, v]) => `${k} ${v}`).join(' · ')}`, JSON.stringify(tiles));
    ok(t.tiles.every(([k, v]) => tiles[k] === v) || w, `${tag} b${i + 1} …and as the definition reads them`);
    for (const [title, rows] of Object.entries(ex.expect.tables ?? {})) {
      const got = await tableOf(title);
      /* the studies the project holds are real ones here (a calculation made for it), so the row is matched by its name and its count */
      const same = title === 'D6 — the project’s studies' ? got.length === rows.length && got[0][0].includes('Lane 3 seal strength') : rows.every((r, k) => r.every((c, m) => got[k]?.[m] === c));
      ok(same, `${tag} b${i + 1} the table “${title}” (${got.length} rows)`, JSON.stringify(got.slice(0, 3)));
    }
    const checksOn = (await words('[data-doc=checks]')) ?? '';
    ok((ex.expect.checks ?? []).every(c => checksOn.includes(c)), `${tag} b${i + 1} to put right: ${(ex.expect.checks ?? []).length ? `"${(ex.expect.checks ?? [])[0].slice(0, 60)}"…` : 'nothing the example does not say'}`, checksOn);
    const signText = (await words('[data-doc=sign]')) ?? '';
    if (ex.expect.needs.length) ok(ex.expect.needs.every(n => signText.includes(n)) && (await page.locator('[data-doc-record]').getAttribute('data-doc-status')) === 'draft', `${tag} b${i + 1} a Draft naming what is still needed (${ex.expect.needs.length})`, signText);
    else ok((await page.locator('[data-doc-record]').getAttribute('data-doc-status')) === 'ready' && (await page.locator('[data-doc-sign]').count()) === 1, `${tag} b${i + 1} nothing still needed: ready for ${d.signoff?.by ?? 'it'}`, signText);
    const money = await words('[data-doc=money]');
    if (ex.expect.money) ok(money === ex.expect.money && t.money === money, `${tag} b${i + 1} the money: "${money?.slice(0, 120)}"`, money);
    else ok(money === null && (await page.locator('[data-doc=money-none], [data-doc=money-missing]').count()) > 0, `${tag} b${i + 1} no money figure: it says why — "${flat((await page.locator('[data-doc=money-none], [data-doc=money-missing]').first().innerText().catch(() => '')) ?? '').slice(0, 80)}"`);
    ok((await page.locator('.doc-caveats li').count()) >= 1 && (await page.locator('.ln-close').count()) === 1, `${tag} b${i + 1} what it does not say, and the closing line`);
    if (!ex.expect.needs.length && !full) full = { id, ex, w };
  }
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00'));
  ok(!!full, `${tag} b an example that is ready to agree`);
  if (!full) continue;
  const { id, ex } = full;
  await go(`#/doc/${d.key}/${id}`);

  /* c · kept after a reload; agreed; locked; reopened */
  ok((await words('[data-doc=sentence]')) === ex.expect.sentence, `${tag} c reloaded: the boxes and the reading kept`);
  const kept = (await dbGet(id)).facts.docValues;
  ok(Object.keys(kept ?? {}).length >= Object.keys(ex.values).filter(k => ex.values[k] !== undefined).length - 1, `${tag} c what was typed is in facts.docValues (${Object.keys(kept ?? {}).length} boxes), not in agreed`);
  ok(!('docValues' in ((await dbGet(id)).agreed ?? {})) && (await dbGet(id)).agreed.doc.def === d.key, `${tag} c agreed.doc holds only the kind (the database keeps agreed for anyone but the owner)`);
  if (d.signoff) {
    await page.locator('[data-doc-signer]').fill('Priya Shah');
    await page.locator('[data-doc-sign]').click(); await page.waitForTimeout(900);
    ok(/Agreed by Priya Shah|Closed by Priya Shah/.test((await words('[data-doc=signed]')) ?? '') && (await page.locator('[data-doc-record]').getAttribute('data-doc-status')) === 'signed', `${tag} c ${d.signoff.ask}: "${await words('[data-doc=signed]')}"`);
    const locked = await page.evaluate(() => ({ boxes: [...document.querySelectorAll('.doc-form input, .doc-form textarea')].filter(i => !i.disabled).length, add: document.querySelectorAll('[data-add-row]').length }));
    ok(locked.boxes === 0 && locked.add === 0, `${tag} c once agreed the boxes are locked (${locked.boxes} open)`);
    ok((await dbGet(id)).agreed.doc.signed?.by === 'Priya Shah', `${tag} c the agreement is on agreed.doc.signed`);
    await page.reload(); await page.locator('.nv-main').waitFor(); await page.waitForTimeout(1500);
    ok(/Priya Shah/.test((await words('[data-doc=signed]')) ?? ''), `${tag} c …and kept after a reload`);
    signedKey = d.key;
    /* d · the paper, signed */
    const p = await pdf(page, `${d.key}-signed.pdf`, / — on paper$/);
    ok(/(Agreed|Closed) by Priya Shah on/.test(p.text), `${tag} d the paper says who agreed it and when`, p.text.slice(0, 300));
    await page.locator('[data-doc-unsign]').click(); await page.waitForTimeout(900);
    ok((await page.locator('[data-doc-record]').getAttribute('data-doc-status')) === 'ready' && (await page.locator('.doc-form input:not([disabled]), .doc-form textarea:not([disabled])').count()) > 0, `${tag} c ${d.signoff.back}: ready again, the boxes open`);
  }

  /* d · on paper */
  const p = await pdf(page, `${d.key}.pdf`, / — on paper$/);
  const T = nows(p.text);
  ok(T.includes(nows(ex.expect.sentence.slice(0, 60))) && T.includes(nows(ex.expect.sentence.slice(-40))), `${tag} d the paper says the sentence (${p.pages} page${p.pages === 1 ? '' : 's'})`, p.text.slice(0, 400));
  ok(Object.entries(ex.expect.tiles).every(([, v]) => T.includes(nows(v))) && T.includes(nows(d.title.toUpperCase())) || T.includes(nows(d.title)), `${tag} d …the tiles' figures and the document's name`);
  ok(d.sections.every(s => T.includes(nows(s.title))), `${tag} d every section, in the document's own words (${d.sections.length})`);
  const scalar = d.sections.flatMap(s => s.items).filter(i => i.kind !== 'list' && i.kind !== 'photos' && ex.values[i.id] !== undefined);
  ok(scalar.every(i => T.includes(nows(i.label))), `${tag} d every box given, with its label (${scalar.length})`);
  const lists = d.sections.flatMap(s => s.items).filter(i => i.kind === 'list' && (ex.values[i.id] ?? []).length);
  ok(lists.every(l => T.includes(nows(l.label)) && (ex.values[l.id] ?? []).every(r => { const c = l.columns.find(x => x.kind !== 'choice' && r.c[x.id] !== undefined); return !c || T.includes(nows(String(r.c[c.id]).slice(0, 20))); })), `${tag} d every list and its rows (${lists.length} lists)`);
  for (const title of Object.keys(ex.expect.tables ?? {})) ok(T.includes(nows(title)), `${tag} d the table “${title}” is on the paper`);
  ok(/How it is worked out|In money/.test(p.text) && /What this does not say/.test(p.text) && /In money/.test(p.text), `${tag} d the money (or why there is none) and what it does not say`);
  if (ex.expect.money) ok(T.includes(nows(ex.expect.money.slice(0, 60))), `${tag} d the money sentence is on the paper`);

  /* e · the phone */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  const wide = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, off: [...document.querySelectorAll('.doc-form input, .doc-form textarea, .doc-tiles .ln-tile, .doc-table-scroll, .doc-row, .doc-sign')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).length }));
  ok(wide.sw <= wide.iw + 1 && wide.off === 0, `${tag} e the phone: nothing off the side (${wide.sw}px of ${wide.iw}), ${wide.off} box/tile/table outside`);
  const small = await page.locator('.doc-form input:not([type=hidden]), .doc-form textarea').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 36).length);
  const smallBtn = await page.locator('.doc-add, .doc-row-rm').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height < 40).length);
  ok(small === 0 && smallBtn === 0, `${tag} e the phone: every box and Add/Remove is thumb-sized (${small} small boxes, ${smallBtn} small buttons)`);
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(300);

  /* f · a row taken out and Undo; photos */
  const list = d.sections.flatMap(s => s.items).find(i => i.kind === 'list' && (ex.values[i.id] ?? []).length >= 2);
  if (list) {
    const n0 = await page.locator(`[data-list="${list.id}"] [data-row]`).count();
    await page.locator(`[data-list="${list.id}"] [data-remove-row="0"]`).click(); await page.waitForTimeout(700);
    ok((await page.locator(`[data-list="${list.id}"] [data-row]`).count()) === n0 - 1, `${tag} f a ${list.rowWord ?? 'row'} taken out: ${n0} → ${n0 - 1}`);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(1200);
    const back = await page.locator(`[data-list="${list.id}"] [data-row]`).count();
    const first = await page.locator(`[data-list="${list.id}"] [data-row="0"] input, [data-list="${list.id}"] [data-row="0"] textarea`).first().inputValue();
    const firstCol = list.columns.find(c => c.kind !== 'choice' && ex.values[list.id][0].c[c.id] !== undefined);
    ok(back === n0 && (!firstCol || first === String(ex.values[list.id][0].c[firstCol.id])), `${tag} f Undo puts it back where it was (${back} rows, the first “${first.slice(0, 30)}”)`);
  }
  const photos = d.sections.flatMap(s => s.items).find(i => i.kind === 'photos');
  if (photos) {
    const input = page.locator(`[data-photo-input="${photos.id}"]`);
    await input.setInputFiles([{ name: 'seal.png', mimeType: 'image/png', buffer: Buffer.from(await picture(160, 110, '#0c7489')) }, { name: 'label.png', mimeType: 'image/png', buffer: Buffer.from(await picture(120, 160, '#b45309')) }]);
    await page.waitForTimeout(1200);
    ok((await page.locator(`[data-photos="${photos.id}"] [data-photo]`).count()) === 2 && (await page.locator('[data-photo] img').count()) === 2, `${tag} f two photos added and shown`);
    await page.locator(`[data-photos="${photos.id}"] [data-photo] .doc-cap`).first().fill('The leaking seal'); await page.waitForTimeout(800);
    const rec = await dbGet(id);
    const keys = await page.evaluate(async id => { const M = await import('/src/cloud/mappers.ts'); const s = await (await import('/src/db.ts')).getStudy(id); return M.MAPS.studies.mediaKeys(s).map(k => k.key ?? k); }, id);
    ok((rec.facts.docPhotos ?? []).length === 2 && rec.facts.docPhotos[0].caption === 'The leaking seal' && rec.facts.docPhotos.every(p => keys.some(k => String(k).includes(p.blobKey))), `${tag} f both are on facts.docPhotos with the caption, and named to the cloud as files of the record (${keys.length})`, JSON.stringify(keys));
    ok(await page.evaluate(async k => !!(await (await import('/src/db.ts')).getBlob(k)), rec.facts.docPhotos[0].blobKey), `${tag} f …and the file is in the media store`);
    await page.locator(`[data-photos="${photos.id}"] [data-remove-photo]`).first().click(); await page.waitForTimeout(600);
    ok((await page.locator(`[data-photos="${photos.id}"] [data-photo]`).count()) === 1, `${tag} f a photo taken out`);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(900);
    ok((await page.locator(`[data-photos="${photos.id}"] [data-photo]`).count()) === 2, `${tag} f …and brought back with Undo`);
    await page.reload(); await page.locator('.nv-main').waitFor(); await page.waitForTimeout(1500);
    ok((await page.locator(`[data-photos="${photos.id}"] [data-photo] img`).count()) === 2 && (await page.locator('[data-photo] .doc-cap').first().inputValue()) === 'The leaking seal', `${tag} f both kept after a reload, with the caption`);
    const pp = await pdf(page, `${d.key}-photos.pdf`, / — on paper$/);
    ok(/Photo 1 — The leaking seal/.test(pp.text) && /Photo 2/.test(pp.text), `${tag} f the paper carries the photos with their captions`, pp.text.slice(-300));
    const images = Number(execFileSync('sh', ['-c', `pdfimages -list ${join(OUT, `${d.key}-photos.pdf`)} | tail -n +3 | wc -l`], { encoding: 'utf8' }).trim());
    ok(images >= 2, `${tag} f …and both pictures are drawn on it (${images} images)`);
  }

  /* g · renamed, deleted with what goes said, Undo */
  await pressMore(page, 'Rename'); await page.waitForTimeout(300);
  await page.getByLabel('What it is of').fill(`Renamed ${d.key}`); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  ok(flat(await page.locator('h1').first().innerText()) === `Renamed ${d.key}`, `${tag} g renamed where it sits`);
  answer = false;
  await pressMore(page, 'Delete'); await page.waitForTimeout(500);
  ok(/Delete the document “Renamed/.test(asked) && /boxes? filled.*go/.test(asked), `${tag} g the ask says what goes — answered no`, asked);
  ok(!!(await dbGet(id)), `${tag} g …and it is kept`);
  answer = true;
  await pressMore(page, 'Delete'); await page.waitForTimeout(1200);
  ok(!(await dbGet(id)) && page.url().includes(`/doc/${d.key}`), `${tag} g deleted, back on its list`);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(1000);
  const back = await dbGet(id);
  ok(!!back && back.agreed.doc.def === d.key && Object.keys(back.facts.docValues ?? {}).length > 0 && (!photos || (back.facts.docPhotos ?? []).length === 2), `${tag} g Undo: back whole — its boxes${photos ? ' and its photos' : ''}`);
}

/* ---- the line: its Tools page, its report ---- */
await go(`#/lines/${sd.wsId}?view=tools`);
const row = flat(await page.locator('.pl-tools li', { has: page.locator('b', { hasText: /^Documents$/ }) }).first().innerText().catch(() => ''));
ok(/Documents/.test(row) && /2 on this line/.test(row), `L the line’s Tools page lists Documents once — "${row.slice(0, 160)}"`);
ok((await page.locator('.pl-tools li b', { hasText: /^(Project charter|SIPOC|Kano analysis|8D report)$/ }).count()) === 0, 'L …not a row for each kind');
await page.locator('.pl-tools li', { has: page.locator('b', { hasText: /^Documents$/ }) }).first().locator('button.pl-tool').click(); await page.waitForTimeout(1500);
ok(page.url().includes('/doc?line=') && (await page.locator('.lt-rows .lt-li').count()) >= 2, `L its row opens the hub on this line (${page.url().split('#')[1]})`);
await go(`#/lines/${sd.wsId}?view=tools`);
await page.getByLabel('Tick Documents').check();
await page.getByRole('button', { name: /^Line report from these/ }).click(); await page.waitForTimeout(2500);
const ticks = await page.locator('.lr-tick input').evaluateAll(xs => xs.map(x => ({ label: x.getAttribute('aria-label'), on: x.checked })));
const docTicks = ticks.filter(t => /^(Project charter|8D report)/.test(t.label ?? ''));
ok(docTicks.length === 2 && docTicks.every(t => t.on) && ticks.filter(t => t.on).length === 2, `L the line’s report has each document on the line as a record, titled by its kind and ticked in, and nothing else ticked: ${ticks.filter(t => t.on).map(t => t.label).join(' · ')}`, ticks.map(t => `${t.on ? '[x]' : '[ ]'} ${t.label}`).join(' | '));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download' }).click()]);
const lf = join(OUT, 'line.pdf'); await dl.saveAs(lf);
const lt = flat(execFileSync('pdftotext', ['-raw', lf, '-'], { encoding: 'utf8' }));
ok(nows(lt).includes(nows('Reduce give-away on Line 3')) && nows(lt).includes(nows('In scope')) && nows(lt).includes(nows('D4')), 'L the line’s paper has each document’s section under its kind’s name, with its sentence and its boxes');

/* ---- inside a project: New is the project's ---- */
await go(`#/project/${sd.projectId}/tools`);
/* the tools not used in the project yet are in their fold since 10 November (docs/DESIGN.md) — opened to find the row */
if (await page.locator('[data-fold="ptools-others"]:not(.is-open) .fold-toggle').count()) { await page.locator('[data-fold="ptools-others"] .fold-toggle').click(); await page.waitForTimeout(300); }
ok((await page.locator('.nv-main').getByText('Documents', { exact: true }).count()) >= 1, 'P a project’s Tools lists Documents (one entry, from the catalogue’s registry)');
await go(`#/doc/charter?project=${sd.projectId}`);
ok((await page.locator('.ip-scope .chip').count()) >= 2, 'P opened in a project: the scope chips say whose');
await page.getByRole('button', { name: 'New charter' }).first().click(); await page.waitForTimeout(400);
ok(/^For .+ — it is the project’s/.test((await words('[data-for-project]')) ?? ''), `P New says it is for the project: "${await words('[data-for-project]')}"`);
await page.getByLabel('What is it of?').fill('Project charter'); await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500); await openFolds();
const made = await dbGet(recordId());
ok(made?.projectId === sd.projectId && made.tool === 'doc' && made.agreed.doc.def === 'charter', 'P the document made there is the project’s');
await page.locator('[data-offer=lead]').count().then(n => ok(n === 1, `P the project’s lead is offered for the Lead box: "${n ? flat(page.url()) && 'one button' : 'none'}"`));
await page.locator('[data-offer=lead]').click(); await page.waitForTimeout(900);
ok((await page.locator('[data-field-input=lead]').inputValue()).length > 2, `P taken: the box holds "${await page.locator('[data-field-input=lead]').inputValue()}"`);

/* ---- a client reads a project’s document, read-only, and takes its paper ---- */
const cl = await device(1360, 'client');
await cl.page.goto(`${BASE}/#/room`); await cl.page.waitForTimeout(2500);
const sd2 = await cl.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await cl.page.evaluate(async ([id, pid]) => { const D = await import('/src/db.ts'); await D.patchStudy(id, { projectId: pid }); }, [sd2.docCharterId, sd2.projectId]);
await cl.page.goto(`${BASE}/#/doc/charter/${sd2.docCharterId}`); await cl.page.waitForTimeout(2500);
const ro = await cl.page.evaluate(() => ({ boxes: [...document.querySelectorAll('.doc-form input, .doc-form textarea')].filter(i => !i.disabled).length, radios: [...document.querySelectorAll('.doc-form [role=radio]')].filter(i => !i.disabled).length, add: document.querySelectorAll('[data-add-row], [data-add-photo], [data-remove-row], [data-doc-sign]').length, said: !!document.querySelector('.doc-ro'), sentence: document.querySelector('[data-doc=sentence]')?.textContent ?? '' }));
ok(ro.boxes === 0 && ro.radios === 0 && ro.add === 0 && ro.said && ro.sentence.startsWith('Reduce give-away on Line 3'), `C a client sees the boxes and the reading, changes none, cannot agree it, and is told so (${JSON.stringify({ ...ro, sentence: ro.sentence.slice(0, 30) })})`);
const cpdf = await Promise.all([cl.page.waitForEvent('download', { timeout: 60000 }), pressPaper(cl.page, / — on paper$/)]);
const cf = join(OUT, 'client.pdf'); await cpdf[0].saveAs(cf);
ok(nows(flat(execFileSync('pdftotext', ['-raw', cf, '-'], { encoding: 'utf8' }))).includes(nows('Reduce give-away on Line 3')), 'C …and takes its paper');
await cl.ctx.close();

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
void signedKey;
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
