/* ACCEPTANCE — A LINE'S ACTION TRACKER AND ITS GANTT (7 November — Rowland: "every line has its own action tracker. Action tracker
 * automatically populates a Gantt chart ... a really classic, simple action tracker ... automated by problems that I found
 * automatically going to an action tracker. Simple."; src/line/actions). Driven in a real browser on the smoke seed's Line 7:
 *
 *   1  five problems raised on the line (late, due this week, due later and doing, no owner and no day, done 2 days ago) and one on
 *      another line — the line's Actions tab lit, the tracker's sentence and tiles as lineActions says them, the rows in its order
 *      (late first), the other line's never, the done one hidden until Show done
 *   2  the Gantt drawn from the same rows: a bar for each dated row, a point saying "no day" for the undated, the late row red with
 *      its tail to today, today's line, the weeks across the head
 *   3  automatic: a problem raised on the line elsewhere (the register's record) is on the tracker with no reload
 *   4  edited where it sits and kept as the problem's own: who typed, a day moved (the state following), the priority, Done (gone,
 *      then under Show done); kept after a reload; the sentence moving with each
 *   5  Add an action: a new row and a new problem on the line (one record); its words open the problem on Problems
 *  5b  what waits for what (7 November — "dependencies from the gantt or the problem page, either one populates the other, give
 *      options to the user if both ways are allowed"; src/line/actions/depends): a row's Link offering both ways round, one ticked
 *      under This holds up… and kept on the one that waits; a loop refused in words; each row saying Waits for / Holds up and the
 *      Gantt's arrow between the bars; a bar's end dragged onto another asking which is done first, the link made, its day that
 *      cannot be kept said in words and the arrow amber, the sentence saying both; the problem's own editor showing the same
 *      links and clash, one taken off there and one made the other way round, the Gantt following
 *   6  Report ▾ › Action tracker read back — the line, every open action with who and its day, late said, what was done
 *   7  the phone: each action a card, nothing off the side, the boxes a thumb's height
 *
 *   node scripts/acceptance/line-actions.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const WS = sd.wsId;
const DAY = 86_400_000;
const T0 = await page.evaluate(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });

/* ---- the line's problems, raised through the register's own function ---- */
const made = await page.evaluate(async ([WS, T0, DAY]) => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  const t = Date.now();
  const one = async o => { const s = { id: uid(), workspaceId: WS, status: 'open', raisedAt: T0 - 10 * DAY, updatedAt: t, media: [], priority: 'low', ...o }; await db.addSnag(s); return s.id; };
  return {
    late: await one({ problem: 'Wrapper film snaps at the jaw', owner: 'Sam', dueAt: T0 - 3 * DAY, priority: 'high' }),
    soon: await one({ problem: 'Labeller guide worn', owner: 'Jo', dueAt: T0 + 2 * DAY }),
    doing: await one({ problem: 'Checkweigher drifts after lunch', owner: 'Kim', dueAt: T0 + 20 * DAY, status: 'in_progress', priority: 'critical' }),
    open: await one({ problem: 'Case erector jams on new cases' }),
    done: await one({ problem: 'Bagger photo-eye dirty', owner: 'Sam', status: 'closed', closedAt: T0 - 2 * DAY, dueAt: T0 - DAY }),
    other: await one({ problem: 'On another line', workspaceId: sd_other(), owner: 'X' }),
  };
  function sd_other() { return 'not-this-line'; }
}, [WS, T0, DAY]);

/* the module's own answer, read through the page */
const truth = async (withDone = false) => page.evaluate(async ([WS, withDone]) => {
  const L = await import('/src/line/actions/lineActions.ts'); const db = await import('/src/db.ts');
  const rows = L.trackerRows(await db.listAllSnags(), WS, Date.now(), { withDone });
  return { rows: rows.map(r => ({ id: r.id, state: r.state, owner: r.owner })), says: L.trackerSays(rows, document.querySelector('[data-line-actions]')?.closest('.wrap')?.querySelector('h1')?.textContent?.trim() ?? ''), sum: L.trackerSummary(rows) };
}, [WS, withDone]);

/* ---- 1 · the tab, the sentence, the rows ---- */
await t.go(`#/lines/${WS}`, 2500);
await page.locator('.nv-tabs .nv-tab .nv-tab-l', { hasText: /^Actions$/ }).first().click(); await page.waitForTimeout(1500);
ok(/view=actions/.test(page.url()) && (await t.words('.nv-tabs .nv-tab[aria-current="page"]')) === 'Actions', `1 the line's Actions tab opens the tracker and is lit (${page.url().split('#')[1]})`);
const lineName = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
let tr = await page.evaluate(async ([WS, name]) => { const L = await import('/src/line/actions/lineActions.ts'); const db = await import('/src/db.ts'); const rows = L.trackerRows(await db.listAllSnags(), WS, Date.now()); return { ids: rows.map(r => r.id), says: L.trackerSays(rows, name), sum: L.trackerSummary(rows) }; }, [WS, lineName]);
ok((await t.words('[data-la-says]')) === tr.says, `1 the sentence as lineActions says it: "${tr.says}"`);
const shown = await page.locator('[data-la-row]').evaluateAll(els => els.map(e => e.getAttribute('data-la-row')));
ok(JSON.stringify(shown) === JSON.stringify(tr.ids) && shown[0] === made.late && !shown.includes(made.other) && !shown.includes(made.done), `1 the rows in the module's order, late first, no other line's, the done one hidden (${shown.length})`);
const tiles = await page.locator('.lat-tiles .ln-tile').evaluateAll(els => Object.fromEntries(els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
ok(tiles.Open === String(tr.sum.open) && tiles.Late === String(tr.sum.late) && tiles['Due this week'] === String(tr.sum.soon) && tiles['Nobody on it'] === String(tr.sum.noOwner) && tiles['No day'] === String(tr.sum.noDate), `1 the tiles: ${JSON.stringify(tiles)}`);
ok((await page.locator(`[data-la-row="${made.late}"] .lat-state`).innerText()) === '3 days late' && (await page.locator(`[data-la-row="${made.soon}"] .lat-state`).innerText()) === 'Due soon', '1 late said in days, due soon said, beside their colour');

/* ---- 2 · the Gantt from the same rows ---- */
const bars = await page.locator('[data-la-row]').evaluateAll(els => els.map(e => ({ id: e.getAttribute('data-la-row'), dated: !!e.querySelector('input[type=date]')?.value, bar: e.querySelector('[data-la-bar]')?.getAttribute('data-la-bar'), tail: !!e.querySelector('.lat-tail'), today: !!e.querySelector('.lat-today') })));
ok(bars.every(b => b.today) && bars.every(b => b.bar === (b.dated ? 'bar' : 'point')) && bars.find(b => b.id === made.open)?.bar === 'point', `2 a bar for every dated row, a point for every undated one (${bars.filter(b => !b.dated).length}), today's line on every row`);
ok(bars.find(b => b.id === made.late)?.tail && bars.filter(b => b.id !== made.late).every(b => !b.tail) && /no day/.test(await page.locator(`[data-la-row="${made.open}"] .lat-pt-w`).innerText()), '2 the late row\'s tail runs to today; the point says "no day"');
const lateBar = await page.locator(`[data-la-row="${made.late}"] .lat-b`).evaluate(e => getComputedStyle(e).backgroundColor);
const red = await page.evaluate(() => { const e = document.createElement('i'); e.style.color = 'var(--st-r)'; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c; });
ok(lateBar === red, `2 the late bar wears the red of late (${lateBar})`);
ok((await page.locator('.lat-head .lat-week').count()) >= 4, `2 the weeks across the head (${await page.locator('.lat-head .lat-week').count()})`);

/* ---- 3 · automatic: raised elsewhere, here with no reload ---- */
const raised = await page.evaluate(async WS => { const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts'); const id = uid(); await db.addSnag({ id, workspaceId: WS, problem: 'Raised from the Problem button', status: 'open', raisedAt: Date.now(), updatedAt: Date.now(), media: [] }); return id; }, WS);
await page.waitForTimeout(1200);
ok((await page.locator(`[data-la-row="${raised}"]`).count()) === 1, '3 a problem raised on the line elsewhere is on the tracker at once, no reload');

/* ---- 4 · edited where it sits, the problem's own ---- */
const who = page.locator(`[data-la-row="${made.open}"] input[aria-label^="Who"]`);
await who.fill('Priya'); await who.press('Tab'); await page.waitForTimeout(600);
const due = page.locator(`[data-la-row="${made.open}"] input[type=date]`);
const dueIso = await page.evaluate(T0 => { const d = new Date(T0 + 5 * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, T0);
await due.fill(dueIso); await page.waitForTimeout(600);
await page.locator(`[data-la-row="${made.open}"] select[aria-label^="Priority"]`).selectOption('high'); await page.waitForTimeout(500);
let rec = await page.evaluate(async id => { const db = await import('/src/db.ts'); const s = (await db.listAllSnags()).find(x => x.id === id); return { owner: s.owner, due: s.dueAt, priority: s.priority, status: s.status }; }, made.open);
ok(rec.owner === 'Priya' && rec.due === T0 + 5 * DAY && rec.priority === 'high', `4 who, the day and the priority are the problem's own (${JSON.stringify(rec)})`);
ok((await page.locator(`[data-la-row="${made.open}"]`).getAttribute('data-state')) === 'soon' && (await page.locator(`[data-la-row="${made.open}"] [data-la-bar]`).getAttribute('data-la-bar')) === 'bar', '4 the row follows — due within the week, a bar now');
await page.locator(`[data-la-row="${made.soon}"] select[aria-label^="Status"]`).selectOption('closed'); await page.waitForTimeout(800);
ok((await page.locator(`[data-la-row="${made.soon}"]`).count()) === 0, '4 Done takes it off the open tracker');
await page.getByLabel(/Show done/).check(); await page.waitForTimeout(500);
ok((await page.locator(`[data-la-row="${made.soon}"][data-state="done"]`).count()) === 1 && (await page.locator(`[data-la-row="${made.done}"][data-state="done"]`).count()) === 1, '4 Show done brings back what was done in the last 30 days');
await page.getByLabel(/Show done/).uncheck();
await page.reload(); await page.waitForTimeout(2500);
tr = await page.evaluate(async ([WS, name]) => { const L = await import('/src/line/actions/lineActions.ts'); const db = await import('/src/db.ts'); const rows = L.trackerRows(await db.listAllSnags(), WS, Date.now()); return { says: L.trackerSays(rows, name) }; }, [WS, lineName]);
ok((await page.locator(`[data-la-row="${made.open}"] input[aria-label^="Who"]`).inputValue()) === 'Priya' && (await t.words('[data-la-says]')) === tr.says, `4 kept after a reload, the sentence moving with it: "${tr.says}"`);

/* ---- 5 · add an action: one record ---- */
await page.getByLabel('Add an action').fill('Re-train nights on the film splice'); await page.getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(900);
const added = await page.evaluate(async WS => { const db = await import('/src/db.ts'); return (await db.listAllSnags()).filter(s => s.workspaceId === WS && s.problem === 'Re-train nights on the film splice').map(s => s.id); }, WS);
ok(added.length === 1 && (await page.locator(`[data-la-row="${added[0]}"]`).count()) === 1, '5 Add an action makes one problem on the line, and it is a row at once');
await page.locator(`[data-la-row="${made.late}"] .lat-what`).click(); await page.waitForTimeout(1000);
const panel = page.locator(`[data-problem-panel="${made.late}"]`);
ok(/view=actions/.test(page.url()) && (await panel.count()) === 1 && (await panel.getByLabel('What is going wrong').inputValue()) === 'Wrapper film snaps at the jaw' && /3 days late/.test(await t.words('[data-pp-said]')), `5 an action's words open the problem in the panel over the tracker (X3): "${await t.words('[data-pp-said]')}"`);
/* edited in the panel — the tracker under it follows */
await panel.getByRole('button', { name: 'Doing', exact: true }).click(); await page.waitForTimeout(700);
ok((await page.evaluate(async id => { const db = await import('/src/db.ts'); return (await db.listAllSnags()).find(x => x.id === id)?.status; }, made.late)) === 'in_progress' && (await page.locator(`[data-la-row="${made.late}"] select[aria-label^="Status"]`).inputValue()) === 'in_progress', '5 its status changed in the panel is the problem\'s own, the tracker\'s row following');
await page.getByRole('button', { name: 'Open the full record ›' }).click(); await page.waitForTimeout(1800);
ok(/#\/snags\?/.test(page.url()) && page.url().includes(made.late), `5 Open the full record › lands on Problems with it open (${page.url().split('#')[1].slice(0, 60)}…)`);

/* ---- 5b · what waits for what (7 November — Rowland: "build in dependencies from the gantt or the problem page, either one
 * populates the other, give options to the user if both ways are allowed") ---- */
await t.go(`#/lines/${WS}?view=actions`, 2500);
const recAfter = id => page.evaluate(async id => { const db = await import('/src/db.ts'); return (await db.listAllSnags()).find(x => x.id === id)?.after ?? []; }, id);
const depTruth = id => page.evaluate(async ([WS, id]) => { const D = await import('/src/line/actions/depends.ts'); const db = await import('/src/db.ts'); const s = await db.listAllSnags(); return { clash: D.depSays(s, id, Date.now()).clash ?? '', holds: D.holdsUp(s, id).map(k => k.problem), waits: D.waitsFor(s, id).map(k => k.problem) }; }, [WS, id]);
/* from a row, the other way round: the film snaps HOLDS UP the case erector */
await page.getByRole('button', { name: 'Link — Wrapper film snaps at the jaw' }).click(); await page.waitForTimeout(500);
ok((await page.locator('.dep-dirs .chip').allInnerTexts()).join('|') === 'This waits for…|This holds up…', '5b Link offers both ways round — This waits for… · This holds up…');
await page.locator('.dep-dirs .chip', { hasText: 'This holds up…' }).click();
await page.locator(`[data-dep-opt="${made.open}"] input`).click(); await page.waitForTimeout(700);
ok(JSON.stringify(await recAfter(made.open)) === JSON.stringify([made.late]), '5b ticked under This holds up… — the link kept on the case erector, the one that waits');
/* a loop refused in words */
await page.locator('.dep-sheet').getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Link — Case erector jams on new cases' }).click(); await page.waitForTimeout(400);
await page.locator('.dep-dirs .chip', { hasText: 'This holds up…' }).click();
await page.locator(`[data-dep-opt="${made.late}"] input`).click(); await page.waitForTimeout(600);
ok(/circle/.test(await t.words('.dep-refused')) && JSON.stringify(await recAfter(made.late)) === '[]', `5b a loop refused: "${await t.words('.dep-refused')}"`);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
ok(/Waits for Wrapper film snaps at the jaw/.test(await t.words(`[data-la-deps="${made.open}"]`)) && /Holds up Case erector jams on new cases/.test(await t.words(`[data-la-deps="${made.late}"]`)), '5b each row says it — Waits for … on the one, Holds up … on the other');
ok((await page.locator(`[data-la-link="${made.late}>${made.open}"]`).count()) === 1, '5b the Gantt draws the arrow from the end of one bar to the start of the next');
/* dragged on the Gantt: the checkweigher's bar end onto the case erector — which first? */
const h = await page.locator(`[data-la-handle="${made.doing}"]`).boundingBox();
const target = await page.locator(`[data-la-row="${made.open}"] .lat-c-gantt`).boundingBox();
await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
await page.mouse.move(target.x + 40, target.y + target.height / 2, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(500);
ok((await page.locator('[data-dep-way]').count()) === 2 && /Case erector jams on new cases.+waits for.+Checkweigher drifts after lunch/.test(await t.words('[data-dep-way="pair-ab"]')), '5b a bar dragged onto another asks which is done first — both ways offered');
await page.locator('[data-dep-way="pair-ab"]').click(); await page.waitForTimeout(800);
ok(JSON.stringify((await recAfter(made.open)).sort()) === JSON.stringify([made.late, made.doing].sort()), '5b the drag made the link on the case erector');
let dt = await depTruth(made.open);
ok(dt.clash && (await t.words(`[data-la-clash="${made.open}"]`)) === dt.clash && (await page.locator(`[data-la-link="${made.doing}>${made.open}"].is-clash`).count()) === 1, `5b its day cannot be kept — said in words and the arrow amber: "${dt.clash}"`);
tr = await page.evaluate(async ([WS, name]) => { const L = await import('/src/line/actions/lineActions.ts'); const db = await import('/src/db.ts'); return L.trackerSays(L.trackerRows(await db.listAllSnags(), WS, Date.now()), name); }, [WS, lineName]);
ok((await t.words('[data-la-says]')) === tr && /waiting on another action/.test(tr) && /cannot keep its day/.test(tr), `5b the sentence says it: "${tr}"`);
/* the problem's own editor — the same links, and changed there */
await t.go(`#/snags?line=${encodeURIComponent(WS)}&open=${encodeURIComponent(made.open)}`, 2500);
const blk = `[data-dep-block="${made.open}"]`;
ok((await page.locator(`${blk} [data-dep-chip]`).count()) === 2 && (await t.words(`${blk} .dep-clash`)) === dt.clash, '5b the problem\'s editor shows what it waits for and the same clash');
await page.getByRole('button', { name: 'Waits for — Checkweigher drifts after lunch — take the link off' }).click(); await page.waitForTimeout(600);
dt = await depTruth(made.open);
ok(JSON.stringify(await recAfter(made.open)) === JSON.stringify([made.late]) && (await page.locator(`${blk} [data-dep-chip]`).count()) === 1 && (await t.words(`${blk} .dep-clash`)) === dt.clash, `5b taken off in the editor — the record, its chips and the clash follow ("${dt.clash}")`);
await page.locator(blk).getByRole('button', { name: /Link to another action/ }).click(); await page.waitForTimeout(400);
await page.locator('.dep-dirs .chip', { hasText: 'This holds up…' }).click();
await page.locator(`[data-dep-opt="${raised}"] input`).click(); await page.waitForTimeout(600);
await page.locator('.dep-sheet').getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(500);
ok(JSON.stringify(await recAfter(raised)) === JSON.stringify([made.open]) && /Raised from the Problem button/.test(await t.words(`${blk} .dep-lines`)), '5b linked from the editor the other way round — Holds up');
await t.go(`#/lines/${WS}?view=actions`, 2500);
ok((await page.locator(`[data-la-link="${made.open}>${raised}"]`).count()) === 1 && (await page.locator(`[data-la-link="${made.doing}>${made.open}"]`).count()) === 0, '5b the Gantt follows what the editor did');

/* ---- 6 · the paper ---- */
await t.go(`#/lines/${WS}?view=actions`, 2500);
const text = await t.pdfText(() => paper(page, 'Action tracker'), 'tracker');
ok(text.includes(t.norm(lineName)) && /ACTIONS · WHO IS DOING WHAT/.test(text), '6 the paper names the line and is its action tracker');
ok(['Wrapper film snaps at the jaw', 'Checkweigher drifts after lunch', 'Case erector jams on new cases', 'Re-train nights on the film splice'].every(w => text.includes(w)) && text.includes('Sam') && text.includes('Priya'), '6 every open action on it, with who');
ok(/late - was/.test(text) && /LATE 1 past the day agreed/.test(text) && /DONE THIS WEEK 2/.test(text) && !text.includes('Bagger photo-eye dirty'), '6 late said with its day, the late and what was done this week counted (the done kept off the open list)');
ok(/Waits for: Wrapper film snaps at the jaw/.test(text) && /Waits for: Case erector jams on new cases/.test(text), '6 what each waits for, on its row of the paper');
/* 6b · the same rows to Excel (7 November, the enterprise basics) — the real button, the workbook unzipped and read back */
{
  const [dl] = await Promise.all([page.waitForEvent('download'), paper(page, 'Action tracker — Excel')]);
  const { unzipSync, strFromU8 } = await import('fflate');
  const { readFileSync } = await import('node:fs');
  const files = unzipSync(readFileSync(await dl.path()));
  const xml = strFromU8(files['xl/worksheets/sheet1.xml']);
  const rows = (xml.match(/<row /g) ?? []).length;
  const expected = await page.evaluate(async WS => { const L = await import('/src/line/actions/lineActions.ts'); const db = await import('/src/db.ts'); return L.trackerRows(await db.listAllSnags(), WS, Date.now(), { withDone: true }).length; }, WS);
  ok(/\.xlsx$/.test(dl.suggestedFilename()) && rows === expected + 1 && ['Action', 'Waits for', 'Wrapper film snaps at the jaw', 'Case erector jams on new cases', 'Priya'].every(w => xml.includes(w)) && /<autoFilter/.test(xml),
    `6b Action tracker — Excel: ${dl.suggestedFilename()}, a header and ${rows - 1} rows (the tracker's ${expected}, done included), what each waits for, a filter on every column`);
}

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
ok((await t.wide()) <= 1, `7 the phone: nothing off the side (${await t.wide()})`);
const cardOk = await page.locator('[data-la-row]').first().evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; });
const minH = await page.locator('[data-la-row] .lat-in').evaluateAll(els => Math.min(...els.map(e => e.getBoundingClientRect().height)));
ok(cardOk && minH >= 44, `7 each action a card inside the screen, its boxes ${Math.round(minH)} px`);

await t.finish('Line action tracker accepted: every problem on the line a row at once, edited as the problem\'s own, the Gantt drawn from the rows, its paper, the phone.');
