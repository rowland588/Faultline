/* ACCEPTANCE — A METHOD PROJECT'S PAGE, CALM (10 November, docs/DESIGN.md — Rowland: "Faultline is a sophisticated operational
 * improvement system, but it should feel remarkably simple to use … I would rather have a beautifully simple interface supported by
 * sophisticated engineering than a screen displaying every capability the application possesses").
 *
 * The page a method project opens on had every section open, every question box and tool card shown at once (11,209 px at a desk,
 * 15,573 on a phone, 65 card-like boxes). Now the section the project is in is open and every other one is a line in ui/Fold saying
 * how far it is and which tools it holds. Nothing is taken away.
 *
 *   1  the seeded DMAIC project at a desk: the section the dashboard says "You are here" for is the one open; every other section is
 *      shut, its one line saying how far it is (as lib/methodSheet's sectionState says it) and which tools it holds
 *   2  a shut section opened: every question the module asks for it (fieldsOf), its tools a row each with New, Add a tool
 *   3  no card inside a card: no question box and no tool row inside a section is drawn as a box (no shadow, no rounded fill)
 *   4  the page's height at a desk printed and well under the 11,209 px before
 *   5  the phone (390): the section in hand open, the rest shut, nothing off the side, every fold's press ≥ 44 px, the height printed
 *      and well under the 15,573 px before
 *   6  a project whose first section is all written: the next section is the one open
 *
 *   node scripts/acceptance/method-calm.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const BEFORE = { desk: 11209, phone: 15573 };
const t = await openApp();
const { page, ok, go } = t;
const sd = await t.seed();
const pid = sd.methodProjectId;
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();

const model = await page.evaluate(async id => {
  const P = await import('/src/db.ts'); const L = await import('/src/lib/methods.ts'); const M = await import('/src/lib/methodSheet.ts');
  const p = await P.getProject(id);
  const m = L.methodByKey(L.methodOfProject(p));
  return { key: m.key, sections: m.sections.map(s => ({ name: s.name, fields: M.fieldsOf(m.key, s.name).map(f => f.label), tools: s.tools.length })) };
}, pid);

async function read() {
  return page.locator('.pmethod-sec').evaluateAll(els => els.map(e => {
    const f = e.querySelector(':scope > .fold');
    return { name: e.getAttribute('aria-label'), open: !!f?.classList.contains('is-open'), says: f?.querySelector('.fold-s')?.textContent ?? '',
      here: e.classList.contains('is-here') };
  }));
}

/* ---- 1 the section in hand open, the rest one line ---- */
await go(`#/project/${pid}`, 2500);
await page.waitForSelector('.pmethod-sec', { timeout: 20000 });
const dashHere = flat(await page.locator('.mdash-step.is-here .mdash-name').innerText().catch(() => ''));
let secs = (await read()).filter(s => model.sections.some(m => m.name === s.name));
ok(secs.length === model.sections.length, `1 every section of ${model.key} drawn (${secs.length} of ${model.sections.length})`);
const open = secs.filter(s => s.open);
ok(open.length === 1 && open[0].name === dashHere && open[0].here, `1 only the section the project is in is open: ${open.map(s => s.name).join(', ')} (the dashboard: ${dashHere})`);
const states = await page.evaluate(async ([k, names]) => { const M = await import('/src/lib/methodSheet.ts'); const ans = {}; return names.map(n => M.sectionState(k, n, ans)); }, [model.key, model.sections.map(s => s.name)]);
for (const [i, s] of secs.entries()) {
  if (s.open) continue;
  const m = model.sections[i];
  const st = states[i];
  const how = st.fields ? new RegExp(`(Not started|Under way|All written) · \\d+ of ${st.fields} written`) : /./;
  ok(how.test(s.says) && /[A-Za-z]/.test(s.says.split(' · ').pop() ?? '') && (m.tools <= 2 || /\+\d+ more/.test(s.says)), `1 ${s.name} shut in one line — how far it is and its tools: "${s.says}"`);
}

/* ---- 2 a shut section opened: every question and every tool ---- */
const shut = secs.find(s => !s.open && model.sections.find(m => m.name === s.name)?.fields.length);
if (shut) {
  const m = model.sections.find(x => x.name === shut.name);
  await page.locator(`.pmethod-sec[aria-label="${shut.name}"] > .fold .fold-toggle`).click(); await page.waitForTimeout(400);
  const qs = (await page.locator(`.pmethod-sec[aria-label="${shut.name}"] .msheet-q`).allInnerTexts()).map(flat);
  ok(qs.join(' | ') === m.fields.join(' | '), `2 ${shut.name} opened — every question the module asks: ${qs.length} of ${m.fields.length}`);
  const rows = await page.locator(`.pmethod-sec[aria-label="${shut.name}"] .lt-li`).count();
  ok(rows === m.tools, `2 ${shut.name}'s tools a row each: ${rows} of ${m.tools}`);
  ok(await page.locator(`.pmethod-sec[aria-label="${shut.name}"] .pmethod-add button`, { hasText: /^Add a tool$/ }).count() === 1, `2 ${shut.name} still offers Add a tool`);
  /* ---- 3 no card inside a card ---- */
  const boxed = await page.locator(`.pmethod-sec[aria-label="${shut.name}"]`).evaluate(sec => [...sec.querySelectorAll('.msheet-f, .lt-li, .fold')].filter(e => {
    const cs = getComputedStyle(e); return cs.boxShadow !== 'none' || (parseFloat(cs.borderTopLeftRadius) > 0 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
  }).length);
  ok(boxed === 0, `3 no question box, tool row or section drawn as a card (${boxed} boxed)`);
  /* the choice is kept on the device, as a tap keeps it */
  await page.reload(); await page.waitForTimeout(2500);
  ok((await read()).find(s => s.name === shut.name)?.open === true, `2 ${shut.name} still open after a reload — the device's choice`);
  await page.locator(`.pmethod-sec[aria-label="${shut.name}"] > .fold .fold-toggle`).click(); await page.waitForTimeout(300);
}

/* ---- 4 the height at a desk ---- */
const deskH = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`      desk height ${deskH} px (before ${BEFORE.desk})`);
ok(deskH < BEFORE.desk * 0.6, `4 the page at a desk well under the before: ${deskH} px against ${BEFORE.desk}`);

/* ---- 6 a section all written: the next one is the one in hand ---- */
const first = model.sections[0];
await page.evaluate(async ([id, k, f]) => {
  const D = await import('/src/db.ts'); const M = await import('/src/lib/methodSheet.ts'); const now = Date.now();
  for (const [i, fl] of M.fieldsOf(k, f).entries()) await D.putTestItem({ id: `calm-${i}`, projectId: id, testId: M.answerScope(k, fl.id), kind: 'note', what: 'Written for the calm check.', sort: now + i, createdAt: now, updatedAt: now });
}, [pid, model.key, first.name]);
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('faultline.fold.method-sec-')) localStorage.removeItem(k); });
await page.reload(); await page.waitForTimeout(2500);
secs = await read();
const second = model.sections[1]?.name;
ok(secs.find(s => s.name === second)?.open === true && secs.find(s => s.name === first.name)?.open === false, `6 ${first.name} all written — ${second} is the section open, ${first.name} one line: "${secs.find(s => s.name === first.name)?.says}"`);

/* ---- 5 the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForTimeout(2500);
secs = await read();
ok(secs.filter(s => s.open).map(s => s.name).join() === second, `5 the phone: only the section in hand open (${secs.filter(s => s.open).map(s => s.name).join(', ')})`);
ok(await t.wide() <= 0, `5 the phone: nothing off the side (${await t.wide()} px)`);
const small = await page.locator('.pmethod-sec > .fold .fold-toggle').evaluateAll(els => els.map(e => e.getBoundingClientRect().height).filter(h => h < 44).length);
ok(small === 0, `5 the phone: every section's press at least 44 px (${small} smaller)`);
const phoneH = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`      phone height ${phoneH} px (before ${BEFORE.phone})`);
ok(phoneH < BEFORE.phone * 0.6, `5 the phone page well under the before: ${phoneH} px against ${BEFORE.phone}`);

await t.finish('A method project opens on the section it is in; every other section is one line, and opens to all it held.');
