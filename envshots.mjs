import { openApp } from './scripts/lib/tocBrowser.mjs';
const out = process.argv[2];
for (const [w, h, dev] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  const t = await openApp({ width: w, height: h }); await t.seed();
  const errs = []; t.page.on('pageerror', e => errs.push(e.message));
  await t.go('#/', 2600); await t.page.screenshot({ path: `${out}/e-home-${dev}.png` });
  await t.page.locator('[data-everything-open]').click(); await t.page.waitForTimeout(800);
  await t.page.screenshot({ path: `${out}/e-everything-${dev}.png` });
  await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(300);
  /* a conversation on a line with a turn: the work in context */
  const ids = await t.page.evaluate(async () => { const db = await import('/src/db.ts'); const ws = await db.listWorkspaces(); const ln = ws.find(l => /smoke/.test(l.name)) ?? ws[0];
    const c = await import('/src/colleague/conversation.ts'); const now = Date.now(); const id = 'env-shot';
    const st = c.newConversation({ id, at: now, name: 'Packing line investigation', thread: { id: 'th1', title: `Lost time on ${ln.name}`, scope: { lineId: ln.id } } });
    st.facts.turns = [{ id: 't1', at: now - 60000, who: 'You', kind: 'typed', text: `Luna, let's investigate ${ln.name}.` },
      { id: 't2', at: now - 50000, who: 'Faultline', kind: 'reply', text: `${ln.name} has one problem open and 48 minutes of stops timed in the last four weeks, the Bagger most. I've put the line beside us. Shall we time its stops for a shift?` }];
    await db.putStudy(st); return { id, ln: ln.id }; });
  await t.go(`#/ai?c=${ids.id}`, 2600); await t.page.screenshot({ path: `${out}/e-context-${dev}.png` });
  if (dev === 'phone') { await t.page.locator('.ai-strip').click(); await t.page.waitForTimeout(700); await t.page.screenshot({ path: `${out}/e-context-sheet-${dev}.png` }); }
  const rec = t.page.locator('[data-wctx-record]:visible').first();
  if (await rec.count()) { await rec.click(); await t.page.waitForTimeout(2500); await t.page.screenshot({ path: `${out}/e-work-${dev}.png` }); }
  console.log(dev, 'errors', errs.length, errs.slice(0, 3).join(' | '));
  await t.browser.close();
}
