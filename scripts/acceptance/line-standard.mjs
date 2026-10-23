/* ACCEPTANCE — THE LINE STANDARD'S BOARD: room to work, and people's colours
 * (docs/BUILD.md, Line standard — the board).
 *
 * Rowland, 13 October: "At the moment I can't drag the interface down, so
 * you tap the ball to move a person, drag to move, but I only have a small
 * surface area to play with, so it's not like I can kind of like scroll the
 * page up and down to fit large things on. I also can't change the colour of
 * the people. I want to be able to do that." Driven in a real browser on the
 * seeded line standards:
 *
 *   1  the empty board is the page's to scroll and pinch (touch-action);
 *      a person and a shape are the board's to drag; drawing a shape keeps
 *      the whole board
 *   2  a tap places a person; a drag across the empty board places nothing
 *   3  a person dragged moves, and is kept
 *   4  a person's colour picked — on the board, in Who does what, on the record
 *   5  a plain board made tall — the room added below, everything where it
 *      stood, kept on the record
 *   6  the card on paper draws the person in their colour, and the tall board
 *      tall, filling a frame of its own shape (no bars beside it), Who does
 *      what beside it
 *   7  full screen: the tools and the board, edge to edge; Done goes back
 *   8  on a phone: nothing off the side; full screen fills the width
 *   9  the bottleneck said on the map (Rowland, 13 October: "highlight a
 *      bottleneck ... this area is this person's — the bottleneck"): a person
 *      marked from Who does what — tagged on the map, summed up first on the
 *      right — and an area faded in its colour, its line dashed, tagged
 *   10 names on the map ("when I'm putting in a name, it's too long, it
 *      covers up too much of the map"): short by default, the whole of it
 *      and what they do on the right; full, or numbers; kept on the device
 *   11 the card says the same: the bottleneck tagged and summed up, the
 *      area faded, the names short
 *   12 a machine on the map marked the bottleneck from its sheet
 *   13 a crowded line on paper: no names crossing on the map, everyone named
 *      beside it, the note and the kit below the people, an area's tag
 *      clear of its words
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-standard.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const OUT = process.env.SHOTS;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
page.on('dialog', d => void d.accept());
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
/* a plain board of its own — no picture, one person on it — to work on */
const blankId = await page.evaluate(async ws => {
  const db = await import('/src/db.ts');
  const id = `std-blank-${Date.now()}`, t = Date.now();
  await db.putStandard({ id, projectId: '', workspaceId: ws, product: 'Rooster 1kg — board test', marks: [{ id: 'p-lead', kind: 'person', x: 30, y: 50, label: 'Line lead' }], sort: t, createdAt: t, updatedAt: t });
  return id;
}, sd.wsId);
const rec = async () => page.evaluate(async id => (await (await import('/src/db.ts')).listAllStandards()).find(s => s.id === id), blankId);
await page.goto(`${BASE}/#/w/${sd.wsId}/standards/${blankId}`); await page.waitForTimeout(2500);
const board = page.locator('.ls-board');

/* 1 — who the touch belongs to */
const ta = async sel => page.locator(sel).first().evaluate(el => getComputedStyle(el).touchAction);
ok(await ta('.ls-board') === 'manipulation', `1 the empty board scrolls the page and pinches (${await ta('.ls-board')})`);
ok(await ta('.ls-mark') === 'none', `1b a person is the board's to drag (${await ta('.ls-mark')})`);
await page.getByRole('button', { name: 'Rectangle' }).click();
ok(await ta('.ls-board') === 'none', `1c drawing a shape keeps the whole board (${await ta('.ls-board')})`);
await page.getByRole('button', { name: 'Person', exact: true }).click();
ok(/drag the empty board to scroll/.test(await page.locator('.ls-tools-say').innerText()), '1d said so under the tools');

/* 2 — a tap places; a drag does not */
const box = await board.boundingBox();
const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
const count = () => page.locator('.ls-mark').count();
const n0 = await count();
let p = at(0.7, 0.4);
await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 60, p.y + 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(600);
ok(await count() === n0, `2 a drag across the empty board places nothing (${await count()} of ${n0})`);
p = at(0.7, 0.4);
await page.mouse.click(p.x, p.y); await page.waitForTimeout(800);
ok(await count() === n0 + 1 && await page.locator('.sheet').count() > 0, `2b a tap places a person, and asks who (${await count()})`);

/* 4 — their colour */
const sheet = page.locator('.sheet').last();
await sheet.getByRole('group', { name: 'Their colour' }).getByRole('button', { name: 'Purple' }).click(); await page.waitForTimeout(300);
await sheet.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(1000);
const fills = await page.locator('.ls-mark .ls-ic circle:nth-of-type(2)').evaluateAll(els => els.map(e => e.getAttribute('fill')));
ok(fills.includes('#7c3aed') && fills.includes('#1f63e0'), `4 the new person purple on the board, the line lead still blue (${fills.join(', ')})`);
/* Who does what numbers each person in their colour — the same number the map shows in Numbers, and the card */
const side = await page.locator('.ls-person .ls-pn').evaluateAll(els => els.map(e => getComputedStyle(e).backgroundColor));
ok(side.includes('rgb(124, 58, 237)'), `4b and purple in Who does what, numbered (${side.join(', ')})`);
const r4 = await rec();
ok(r4.marks.some(m => m.kind === 'person' && m.colour === 'purple'), '4c kept on the record');

/* 3 — a person dragged */
const lead = page.locator('.ls-mark', { hasText: 'Line lead' });
const lb = await lead.boundingBox();
await page.mouse.move(lb.x + lb.width / 2, lb.y + 12); await page.mouse.down();
await page.mouse.move(lb.x + lb.width / 2 + 80, lb.y + 12 + 30, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(1000);
const moved = (await rec()).marks.find(m => m.id === 'p-lead');
ok(moved && moved.x > 33 && await page.locator('.sheet').count() === 0, `3 the line lead dragged to the right, kept (x ${moved?.x}), nothing opened`);

/* 5 — the board made tall */
const yBefore = (await rec()).marks.find(m => m.id === 'p-lead').y;
const pxBefore = await lead.evaluate(el => el.getBoundingClientRect().top);
await page.getByRole('group', { name: "The board's shape" }).getByRole('button', { name: 'Tall' }).click(); await page.waitForTimeout(1200);
const bb = await board.boundingBox();
const r5 = await rec(), yAfter = r5.marks.find(m => m.id === 'p-lead').y;
const pxAfter = await page.locator('.ls-mark', { hasText: 'Line lead' }).evaluate(el => el.getBoundingClientRect().top);
ok(Math.abs(bb.height / bb.width - 4 / 3) < 0.02, `5 the board is tall (${(bb.height / bb.width).toFixed(2)} high for 1 wide)`);
ok(r5.board === 'tall' && yAfter < yBefore && Math.abs(pxAfter - pxBefore) < 6, `5b the line lead stays where it stood (${yBefore}% → ${yAfter}%, ${Math.round(pxBefore)} → ${Math.round(pxAfter)} px), kept on the record`);
if (OUT) await page.screenshot({ path: `${OUT}/ls-1-tall.png` });

/* 6 — the card: the person in their colour, the board tall */
const paper = await page.evaluate(async id => {
  const fills = [], rects = [], heads = [];
  const P = CanvasRenderingContext2D.prototype, fill = P.fill, fillRect = P.fillRect, fillText = P.fillText;
  P.fill = function (...a) { fills.push(String(this.fillStyle)); return fill.apply(this, a); };
  P.fillRect = function (x, y, w, h) { if (String(this.fillStyle) === '#f7f9fc') rects.push({ x, w, h }); return fillRect.call(this, x, y, w, h); };
  P.fillText = function (t, x, ...a) { if (String(t).startsWith('W H O')) heads.push(x); return fillText.call(this, t, x, ...a); };
  try {
    const s = (await (await import('/src/db.ts')).listAllStandards()).find(x => x.id === id);
    await (await import('/src/lib/standardCard.ts')).renderCard(s, 'Line 7', '13 Oct 2026');
  } finally { P.fill = fill; P.fillRect = fillRect; P.fillText = fillText; }
  return { purple: fills.includes('#7c3aed'), board: rects[0], side: heads[0] };
}, blankId);
ok(paper.purple, '6 the card draws the person in purple');
ok(Math.abs((paper.board.h / paper.board.w) - 4 / 3) < 0.01, `6b and the board tall (${(paper.board.h / paper.board.w).toFixed(2)})`);
/* 6c — the frame is the board's own shape (Rowland, 13 October: "i pick square it then clusters everything up, or tall ... it's only set for wide"):
   the board starts at the frame's edge, nothing grey beside it, and Who does what takes the room left */
ok(Math.round(paper.board.x) === 64 && Math.round(paper.side) === Math.round(64 + paper.board.w + 36),
  `6c a tall board fills its frame — no bars beside it; Who does what beside it (board ${Math.round(paper.board.w)} × ${Math.round(paper.board.h)} at ${Math.round(paper.board.x)}, Who does what at ${Math.round(paper.side)})`);

/* 7 — full screen */
await page.getByRole('button', { name: 'Full screen' }).click(); await page.waitForTimeout(600);
const fb = await page.locator('.ls-board').boundingBox();
ok(await page.locator('.ls.is-full').count() === 1 && fb.width > 1300 && !(await page.locator('.ls-side').isVisible()), `7 full screen: the board edge to edge (${Math.round(fb.width)} px), Who does what aside`);
if (OUT) await page.screenshot({ path: `${OUT}/ls-2-full.png` });
await page.locator('.ls-full-bar').getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(400);
ok(await page.locator('.ls.is-full').count() === 0 && await page.locator('.ls-side').isVisible(), '7b Done: back to the page');

/* 8 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForTimeout(2500);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `8 phone: nothing off the side (${wide}px)`);
await page.getByRole('button', { name: 'Full screen' }).click(); await page.waitForTimeout(600);
const pb = await page.locator('.ls-board').boundingBox();
ok(pb.width >= 360, `8b phone, full screen: the board fills the width (${Math.round(pb.width)} px)`);
if (OUT) await page.screenshot({ path: `${OUT}/ls-3-phone-full.png` });

/* 9 — the bottleneck, said on the map */
await page.setViewportSize({ width: 1360, height: 900 });
await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const st = (await db.listAllStandards()).find(s => s.id === id);
  await db.putStandard({ ...st, marks: [...st.marks.map(m => m.id === 'p-lead' ? { ...m, label: 'Line lead — runs the bagger and clears every jam', task: 'Runs the bagger' } : m),
    { id: 'zone', kind: 'shape', shape: 'rect', x: 70, y: 50, w: 22, h: 30, tone: 'red', label: 'Basket station' }] });
}, blankId);
await page.reload(); await page.waitForTimeout(2500);
await page.locator('.ls-person', { has: page.locator('textarea[aria-label="What they do"]') }).first().getByRole('button', { name: /is the bottleneck/ }).click(); await page.waitForTimeout(800);
let r9 = await rec();
const lead9 = r9.marks.find(m => m.id === 'p-lead');
ok(lead9.bottleneck === true && await page.locator('.ls-mark.is-bn .ls-bn-tag').count() === 1, '9 a person marked the bottleneck from Who does what — tagged on the map');
const sum = (await page.locator('.ls-bn-sum').innerText()).replace(/\s+/g, ' ');
ok(/BOTTLENECK/i.test(sum) && sum.includes('Line lead — runs the bagger and clears every jam — Runs the bagger'), `9b summed up first on the right: ${sum}`);
await page.getByRole('button', { name: 'Select', exact: true }).click();
const zone = page.locator('.ls-shape').first();
await zone.locator('rect').first().click({ force: true }); await page.waitForTimeout(300);
await zone.locator('rect').first().click({ force: true }); await page.waitForTimeout(600);
const sheet9 = page.locator('.sheet').last();
await sheet9.getByRole('group', { name: 'Fill' }).getByRole('button', { name: 'Faded' }).click();
await sheet9.getByRole('group', { name: 'Line' }).getByRole('button', { name: 'Dashed' }).click();
await sheet9.getByLabel(/This area is the bottleneck/).check();
await sheet9.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(1000);
r9 = await rec();
const z9 = r9.marks.find(m => m.id === 'zone');
const g = await page.locator('.ls-shape.is-bn').first().evaluate(el => ({ op: el.getAttribute('fill-opacity'), dash: el.getAttribute('stroke-dasharray') }));
ok(z9.fill === 'faded' && z9.line === 'dashed' && z9.bottleneck === true && Number(g.op) > 0 && Number(g.op) < 1 && !!g.dash && await page.locator('.ls-bn-tag.is-area').count() === 1,
  `9c an area faded in its colour (${g.op}), its line dashed (${g.dash}), tagged the bottleneck`);
ok((await page.locator('.ls-bn-words').allInnerTexts()).includes('The Basket station'), '9d and named in the summary');

/* 10 — names on the map */
const leadLabel = async () => (await page.locator('.ls-mark.is-bn .ls-mark-l').innerText()).trim();
ok((await leadLabel()) === 'Line lead — r…' && (await page.locator('.ls-person input[aria-label="Role"]').first().inputValue()) === 'Line lead — runs the bagger and clears every jam',
  `10 short on the map by default (${await leadLabel()}), the whole name on the right`);
await page.getByRole('group', { name: 'Names on the map' }).getByRole('button', { name: 'Numbers' }).click(); await page.waitForTimeout(300);
ok((await leadLabel()) === '1', '10b numbers: the person\'s number, the same as on the right');
await page.reload(); await page.waitForTimeout(2500);
ok((await leadLabel()) === '1', '10c kept on this device after a reload');
await page.getByRole('group', { name: 'Names on the map' }).getByRole('button', { name: 'Full' }).click(); await page.waitForTimeout(300);
ok((await leadLabel()) === 'Line lead — runs the bagger and clears every jam', '10d full: the whole name');
await page.getByRole('group', { name: 'Names on the map' }).getByRole('button', { name: 'Short' }).click(); await page.waitForTimeout(300);

/* 11 — the card says the same */
const card11 = await page.evaluate(async id => {
  const texts = [], alphas = [];
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, fill = P.fill;
  P.fillText = function (t, ...a) { texts.push(String(t)); return ft.call(this, t, ...a); };
  P.fill = function (...a) { alphas.push(this.globalAlpha); return fill.apply(this, a); };
  try {
    const s = (await (await import('/src/db.ts')).listAllStandards()).find(x => x.id === id);
    await (await import('/src/lib/standardCard.ts')).renderCard(s, 'Line 7', '13 Oct 2026');
  } finally { P.fillText = ft; P.fill = fill; }
  const { shortLabel } = await import('/src/lib/standard.ts');
  return { tags: texts.filter(t => t === 'BOTTLENECK').length, short: texts.includes(shortLabel('Line lead — runs the bagger and clears every jam')), area: texts.some(t => t.includes('The Basket station')), faded: alphas.some(a => a > 0.2 && a < 0.5) };
}, blankId);
ok(card11.tags >= 3 && card11.short && card11.area && card11.faded, `11 the card: the bottleneck tagged on the map and summed up, the area faded, the name short (${JSON.stringify(card11)})`);

/* 12 — a machine on the map, the bottleneck */
await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const st = (await db.listAllStandards()).find(s => s.id === id);
  await db.putStandard({ ...st, marks: [...st.marks, { id: 'bag2', kind: 'bagger', x: 30, y: 75, label: 'Bagger 2' }] });
}, blankId);
await page.reload(); await page.waitForTimeout(2500);
await page.locator('.ls-mark[aria-label^="Bagger — Bagger 2"]').click(); await page.waitForTimeout(600);
const sheet12 = page.locator('.sheet').last();
await sheet12.getByLabel(/This bagger is the bottleneck/).check();
await sheet12.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(1000);
const bag12 = (await rec()).marks.find(m => m.id === 'bag2');
ok(bag12.bottleneck === true && (await page.locator('.ls-bn-words').allInnerTexts()).includes('The Bagger 2') && await page.locator('.ls-mark.is-bn[aria-label^="Bagger"] .ls-bn-tag').count() === 1,
  '12 a machine marked the bottleneck from its sheet — tagged on the map and named in the summary');

/* 13 — a crowded line on paper (Rowland, 13 October: "everything's still
   merged together and PDF details gone strange even in the side commentary
   or the bottleneck"): ten people close together on a tall board, long
   names, a person and an area the bottleneck, a note and kit. No two names
   on the map cross; every person is named beside it; the note and the kit
   sit below the people; an area's tag is outside it, not on its words. */
for (const shape of ['wide', 'tall']) {
const crowd = await page.evaluate(async ([ws, shape]) => {
  const db = await import('/src/db.ts'); const L = await import('/src/lib/standard.ts');
  const id = `std-crowd-${shape}-${Date.now()}`, t = Date.now();
  const names = ['Line lead — runs the bagger', 'Op 2 film loader', 'Op 3 tray packer', 'Op 4 tray packer', 'QA — weights and seals', 'Op 6 case erector', 'Op 7 palletiser', 'Fitter', 'Op 9 relief', 'Team leader'];
  const wide = [
    { id: 'z1', kind: 'shape', shape: 'rect', x: 18, y: 28, w: 26, h: 22, tone: 'blue', label: 'Bagger' },
    { id: 'z2', kind: 'shape', shape: 'rect', x: 52, y: 28, w: 30, h: 22, tone: 'green', label: 'Packing table and tray loading', fill: 'faded', bottleneck: true },
    ...names.map((n, i) => ({ id: `p${i}`, kind: 'person', x: 8 + i * 9, y: 55 + (i % 2) * 6, label: n, task: `Task ${i + 1} on the line, said in full so that it runs on`, ...(i === 2 ? { bottleneck: true } : {}) })),
    { id: 'k1', kind: 'pallet', x: 20, y: 82 }, { id: 'k2', kind: 'bin', x: 92, y: 10 },
  ];
  const marks = shape === 'wide' ? wide : L.reshaped(wide, 'wide', shape);
  const s = { id, projectId: '', workspaceId: ws, product: `Crowded ${shape}`, ...(shape === 'wide' ? {} : { board: shape }), note: 'Two packers on the tray table at all times; relief covers breaks in turn.', marks, sort: t, createdAt: t, updatedAt: t };
  await db.putStandard(s);
  const texts = [], arcs = [];
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, arc = P.arc;
  P.fillText = function (txt, x, y, ...a) { texts.push({ t: String(txt), x, y, w: this.measureText(String(txt)).width, font: this.font, align: this.textAlign, base: this.textBaseline }); return ft.call(this, txt, x, y, ...a); };
  P.arc = function (x, y, r, ...a) { arcs.push({ x, y, r }); return arc.call(this, x, y, r, ...a); };
  try { await (await import('/src/lib/standardCard.ts')).renderCard(s, 'Line 7', '13 Oct 2026'); } finally { P.fillText = ft; P.arc = arc; }
  return { texts, arcs, names };
}, [sd.wsId, shape]);
{
  /* the map's names: centred pill text in bold, left of Who does what */
  const side = crowd.texts.find(x => x.t.startsWith('W H O'))?.x ?? 9999;
  const pills = crowd.texts.filter(x => x.align === 'center' && x.base === 'middle' && /^(700|bold) /.test(x.font) && x.x < side);
  const px = parseFloat(/(?:700|bold) (\d+(?:\.\d+)?)px/.exec(pills[0]?.font ?? '700 13px')[1]);
  const box = x => ({ l: x.x - x.w / 2 - px * 0.55, r: x.x + x.w / 2 + px * 0.55, t: x.y - px * 0.75, b: x.y + px * 0.75 });
  const cross = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
  const crossed = [];
  for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) if (cross(box(pills[i]), box(pills[j]))) crossed.push(`${pills[i].t} × ${pills[j].t}`);
  /* the people's discs on the map (not the rings, not the list's) — a name never covers one */
  const discs = crowd.arcs.filter(a => a.x < side && a.r >= 8 && a.r <= 40);
  const minR = Math.min(...discs.map(d => d.r));
  const people = discs.filter(d => d.r === minR);
  const covered = pills.filter(p => people.some(d => cross(box(p), { l: d.x - d.r * 0.8, r: d.x + d.r * 0.8, t: d.y - d.r * 0.8, b: d.y + d.r * 0.8 }))).map(p => p.t);
  ok(pills.length === crowd.names.length && crossed.length === 0 && covered.length === 0,
    `13 a crowded ${shape} board on paper: ${pills.length} names on the map, none crossing another or covering a person${crossed.length ? ` — crossed: ${crossed.slice(0, 3).join('; ')}` : ''}${covered.length ? ` — covering: ${covered.slice(0, 3).join(', ')}` : ''}`);
  const named = crowd.names.filter(n => crowd.texts.some(x => x.x >= side && x.t.startsWith(n.slice(0, 10))));
  const more = crowd.texts.some(x => /more on the map/.test(x.t));
  ok(named.length === crowd.names.length && !more, `13b ${shape}: every person named in Who does what (${named.length} of ${crowd.names.length})`);
  const lastPerson = Math.max(...crowd.texts.filter(x => x.x >= side && crowd.names.some(n => x.t.startsWith(n.slice(0, 10)))).map(x => x.y));
  const note = crowd.texts.find(x => x.t.startsWith('Two packers'));
  const kitHead = crowd.texts.find(x => x.t.startsWith('A T'));
  ok(note && kitHead && note.y > lastPerson + 20 && kitHead.y > note.y, `13c ${shape}: the note below the people (${Math.round(note?.y)} > ${Math.round(lastPerson)}), the kit below the note`);
  const areaWords = crowd.texts.find(x => x.t.startsWith('Packing table'));
  const areaTag = crowd.texts.filter(x => x.t === 'BOTTLENECK' && x.x < side).sort((a, b) => Math.abs(a.y - areaWords.y) - Math.abs(b.y - areaWords.y))[0];
  ok(areaWords && areaTag && Math.abs(areaTag.y - areaWords.y) > 20, `13d ${shape}: the area's BOTTLENECK tag clear of its words (${Math.round(Math.abs(areaTag?.y - areaWords?.y))} px apart)`);
}
}

/* 14 — WORDS PRINTED WHOLE, WORDS UP A TALL SHAPE, STRETCHED FROM A SIDE
   (Rowland, 15 October, on his Line 2a & 2b: "I've done bottleneck and there's
   a large amount of context in there, but when I print it, the context is not
   there ... if we have to put the context onto another page, so it becomes a
   two-pager, then that should be fine"; "it only goes across, it doesn't let
   me go upwards"; "I can't stretch anything from a side"). His wrapper's
   analysis as typed — a head, paragraphs, bullets, a conclusion. */
{
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const LONG = 'BOTTLENECK – PALLET WRAPPER (ONE OPERATOR SERVING BOTH LINES)\n\nWrapper cycle: 10 min to wrap a pair of pallets (one from each line) + 2 min transfer = 12 min per pair → maximum 10 pallets/hr.\n\nLine output: both lines together run at 70 ppm.\n\n• Tesco Express – 1200 units/pallet, 2 pallets = 2400 units ÷ 70 = 34 min to fill a pair. Wrapper needs 12 min → 22 min spare. Not a bottleneck.\n\n• Crate – 8 per crate × 30 crates = 240/pallet, 2 pallets = 480 units ÷ 70 = 6.9 min to fill a pair. Wrapper needs 12 min → 5.1 min lost every pair. Lines capped at 10 pallets/hr = 2,400 units/hr = 40 ppm. Loss 30 ppm (43%).\n\nConclusion: on crate formats the wrapper operator’s 12-minute cycle sets the output, not line speed. Only Tesco Express gives the operator enough time to keep up.';
  const longId = await page.evaluate(async ([ws, task]) => {
    const db = await import('/src/db.ts');
    const id = `std-long-${Date.now()}`, t = Date.now();
    await db.putStandard({ id, projectId: '', workspaceId: ws, product: 'Line 2a & 2b — words test', board: 'square', sort: t, createdAt: t, updatedAt: t, marks: [
      { id: 's-dest', kind: 'shape', shape: 'rect', tone: 'blue', label: 'Destaker', x: 10, y: 45, w: 5.7, h: 26 },
      { id: 's-grade', kind: 'shape', shape: 'rect', tone: 'grey', label: 'Grading', x: 50, y: 80, w: 14, h: 10 },
      { id: 'p-op', kind: 'person', label: 'Robot op', task: 'Pick & place + destaker', x: 20, y: 45 },
      { id: 'p-wrap', kind: 'person', label: 'Pallet wrapper', task, x: 30, y: 10, bottleneck: true, colour: 'teal' },
    ] });
    return id;
  }, [sd.wsId, LONG]);
  const recL = async () => page.evaluate(async id => (await (await import('/src/db.ts')).listAllStandards()).find(s => s.id === id), longId);
  await page.goto(`${BASE}/#/w/${sd.wsId}/standards/${longId}`); await page.waitForTimeout(2500);
  ok(await page.locator('.ls-shape-t.is-up', { hasText: 'Destaker' }).count() === 1 && await page.locator('.ls-shape-t.is-up', { hasText: 'Grading' }).count() === 0,
    '14 a tall, narrow shape writes its words upwards — "Destaker" whole, not "Dest aker"; a wide one across');
  const sum = await page.locator('.ls-bn-sum').innerText();
  ok(/Pallet wrapper — BOTTLENECK – PALLET WRAPPER \(ONE OPERATOR SERVING BOTH LINES\)/.test(sum) && !/Wrapper cycle/.test(sum), '14b the bottleneck summed up by its head; the analysis stays with the person');
  const rows = Number(await page.getByLabel('What they do').nth(1).getAttribute('rows'));
  ok(rows >= 10, `14c the wrapper's box as tall as what is written (${rows} lines), not two`);

  /* the card cuts and says where; the notes page prints it whole */
  const pages = await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/lib/standardCard.ts'); const st = (await db.listAllStandards()).find(s => s.id === id); return (await C.cardPages(st, 'Line 2', '15 Oct 2026')).length; }, longId);
  ok(pages === 2, `14d the card and one notes page (${pages} pages)`);
  await pressPaper(page, /^Line standard card/); await page.waitForTimeout(2500); /* Report ▾ (B4) */
  ok(/2 pages — the card, then its notes in full/.test(await page.locator('.ls-print-acts').innerText()), '14e the preview says it: the card, then its notes');
  const dir = mkdtempSync(join(tmpdir(), 'ls-notes-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.ls-print-acts').getByRole('button', { name: 'Download', exact: true }).click()]);
  const file = join(dir, 'ls.pdf'); await dl.saveAs(file);
  const pdfPages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [file], { encoding: 'utf8' }))?.[1]);
  ok(pdfPages === 2, `14f the PDF is two pages (${pdfPages})`);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});
  /* the notes page's words, read off the picture the page is: drawn by the
     same function, its text captured as it is written */
  const said = await page.evaluate(async id => {
    const written = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { written.push(String(t)); return orig.call(this, t, ...a); };
    try { const db = await import('/src/db.ts'); const C = await import('/src/lib/standardCard.ts'); const st = (await db.listAllStandards()).find(s => s.id === id); await C.cardPages(st, 'Line 2', '15 Oct 2026'); }
    finally { CanvasRenderingContext2D.prototype.fillText = orig; }
    return written.join(' ').replace(/\s+/g, ' ');
  }, longId);
  const words = LONG.replace(/•/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const lost = words.filter(w => !said.includes(w));
  ok(lost.length === 0 && /\(notes, 2\)/.test(said) && /Notes in full on the next page/.test(said), `14g every word written is on paper — the card says "(notes, 2)" where it cuts, the notes page holds it whole${lost.length ? ` — lost: ${lost.slice(0, 5).join(' ')}` : ''}`);

  /* stretched from a side: the opposite side stays */
  /* the board afresh — the print sheet's late back() lands on the page (CLAUDE.md, Things that will bite) —
     and the "saved" note closed, as a person would: it sits over the foot of the board */
  await page.goto(`${BASE}/#/w/${sd.wsId}/standards/${longId}`); await page.waitForTimeout(2000);
  if (await page.locator('.pdfr-x').count()) await page.locator('.pdfr-x').click();
  const g0 = (await recL()).marks.find(m => m.id === 's-grade');
  const gt = await page.locator('.ls-shape-t', { hasText: 'Grading' }).boundingBox();
  await page.mouse.click(gt.x + 4, gt.y + 4); await page.waitForTimeout(300);
  ok(await page.locator('.ls-handle').count() === 8, '14h a selected shape has a handle on every side and corner (8)');
  const he = await page.locator('.ls-handle.is-e').boundingBox();
  await page.mouse.move(he.x + 8, he.y + 8); await page.mouse.down(); await page.mouse.move(he.x + 88, he.y + 8, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(800);
  const g1 = (await recL()).marks.find(m => m.id === 's-grade');
  const hn = await page.locator('.ls-handle.is-n').boundingBox();
  await page.mouse.move(hn.x + 8, hn.y + 8); await page.mouse.down(); await page.mouse.move(hn.x + 8, hn.y - 50, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(800);
  const g2 = (await recL()).marks.find(m => m.id === 's-grade');
  const L = m => m.x - m.w / 2, B = m => m.y + m.h / 2;
  ok(g1.w > g0.w + 3 && Math.abs(L(g1) - L(g0)) < 0.2 && g1.h === g0.h, `14i its right side pulled: wider (${g0.w} → ${g1.w}), its left edge where it was`);
  ok(g2.h > g1.h + 3 && Math.abs(B(g2) - B(g1)) < 0.2 && g2.w === g1.w, `14j its top pulled up: taller (${g1.h} → ${g2.h}), its bottom where it was`);

  /* which way the words run, chosen */
  await page.mouse.click(gt.x + 4, gt.y + 4); await page.waitForTimeout(400);
  await page.getByRole('group', { name: 'Which way the words run' }).getByRole('button', { name: 'Upwards' }).click();
  await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(800);
  ok((await recL()).marks.find(m => m.id === 's-grade').dir === 'up' && await page.locator('.ls-shape-t.is-up', { hasText: 'Grading' }).count() === 1, '14k Upwards chosen on a wide shape: kept, and written up it');

  /* a map with nothing long prints one page, as before */
  const short = await page.evaluate(async id => { const db = await import('/src/db.ts'); const C = await import('/src/lib/standardCard.ts'); const st = (await db.listAllStandards()).find(s => s.id === id); return (await C.cardPages(st, 'Line 2', '15 Oct 2026')).length; }, blankId);
  ok(short === 1, `14l a map with nothing long is one page (${short})`);
}

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nLine standard board NOT accepted: ${fail} failed` : '\nLine standard board accepted: the page scrolls off the board, a tap places, a drag moves, people in their colours, a tall board and full screen, the bottleneck said, names short — on the screen and the card');
process.exit(fail ? 1 : 0);
