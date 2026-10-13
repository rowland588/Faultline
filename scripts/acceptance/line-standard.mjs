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
 *      tall
 *   7  full screen: the tools and the board, edge to edge; Done goes back
 *   8  on a phone: nothing off the side; full screen fills the width
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-standard.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
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

await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
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
const side = await page.locator('.ls-person .ls-ic circle:nth-of-type(2)').evaluateAll(els => els.map(e => e.getAttribute('fill')));
ok(side.includes('#7c3aed'), '4b and purple in Who does what');
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
  const fills = [], rects = [];
  const P = CanvasRenderingContext2D.prototype, fill = P.fill, fillRect = P.fillRect;
  P.fill = function (...a) { fills.push(String(this.fillStyle)); return fill.apply(this, a); };
  P.fillRect = function (x, y, w, h) { if (String(this.fillStyle) === '#f7f9fc') rects.push(h / w); return fillRect.call(this, x, y, w, h); };
  try {
    const s = (await (await import('/src/db.ts')).listAllStandards()).find(x => x.id === id);
    await (await import('/src/lib/standardCard.ts')).renderCard(s, 'Line 7', '13 Oct 2026');
  } finally { P.fill = fill; P.fillRect = fillRect; }
  return { purple: fills.includes('#7c3aed'), board: rects[0] };
}, blankId);
ok(paper.purple, '6 the card draws the person in purple');
ok(Math.abs((paper.board ?? 0) - 4 / 3) < 0.01, `6b and the board tall (${paper.board?.toFixed(2)})`);

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

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nLine standard board NOT accepted: ${fail} failed` : '\nLine standard board accepted: the page scrolls off the board, a tap places, a drag moves, people in their colours, a tall board and full screen — on the screen and the card');
process.exit(fail ? 1 : 0);
