/* THE EIGHT JOURNEYS, AGAINST THEIR BASELINE — in the gate from B0 (docs/STRUCTURE.md §15, §18).
 *
 * Walked as a person walks them, pressing what the screen says along the shortest way there is,
 * on the seeds, at desk and phone. Counted per journey: taps (a press; a typed field is an entry),
 * screens (address changes), hunts (a press whose target was off the screen when the screen
 * arrived), and orientation (does the top bar name the place the person is in?).
 *
 * Compared with docs/structure/journeys-baseline.json, measured on 22 October on the app as it
 * was: a journey that does not finish, or takes more taps than its baseline, fails — unless
 * LONGER below names it with the reason Rowland agreed. Orientation and hunts are printed beside
 * their baseline; the slices that promise them (B2 on) check them in scripts/acceptance/structure.mjs.
 * docs/structure/journeys-stage-a.mjs is the walk as it was measured, kept as it was.
 *
 *     node scripts/journeys.mjs [out.json] [only]      a dev server on 5191 (SMOKE_BASE) */
import pkg from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191', REF = 'testproj';
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/journeys.json';
const ONLY = process.argv[3];
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke', user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'j@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];

async function device(width) {
  const phone = width < 900;
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: phone ? 844 : 900 }, hasTouch: phone, locale: 'en-GB', timezoneId: 'Europe/London', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { localStorage.setItem(k, JSON.stringify(s)); }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  page.on('dialog', d => void d.accept().catch(() => {}));
  await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(1500);
  return { page, sd, phone, ctx };
}

function journey(name, device) {
  const J = { name, device, taps: 0, entries: 0, screens: 0, hunts: 0, orient: [], steps: [], ok: true, note: '' };
  return J;
}

async function settle(page) {
  await page.waitForTimeout(1300);
  await page.waitForFunction(() => !/Loading…/.test(document.querySelector('main')?.innerText ?? ''), null, { timeout: 8000 }).catch(() => {});
}

/** press: counts a tap; a hunt when the target was below the screen as it arrived */
async function press(D, J, what, loc) {
  const { page } = D;
  const el = loc.first();
  await el.waitFor({ state: 'attached', timeout: 10000 });
  const box = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: window.innerHeight }; });
  const hunted = box.top < 0 || box.bottom > box.h;
  const before = page.url();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click();
  J.taps++; if (hunted) J.hunts++;
  await settle(page);
  const after = page.url();
  if (after !== before) J.screens++;
  J.steps.push(`${hunted ? '↓ ' : ''}${what}`);
}
/** press a control that should give a file; counts the tap and says whether a file came */
async function download(D, J, what, loc) {
  const wait = D.page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
  await press(D, J, what, loc);
  const f = await wait;
  J.steps.push(f ? `[file: ${f.suggestedFilename()}]` : '[no file]');
  return !!f;
}
async function look(D, J, tag) {
  const items = await D.page.evaluate(() => [...document.querySelectorAll('main button, main a, main select, main input, main textarea, .rd button, .rd input, .rd textarea, .rd select, .sheet button, .sheet input, .sheet textarea, .sheet select, [role=dialog] button, [role=dialog] input, [role=dialog] textarea, [role=dialog] select')].filter(e => e.getBoundingClientRect().width > 0).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}: ${(e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('name') || '').replace(/\s+/g, ' ').trim().slice(0, 60)}${e.labels?.[0] ? ' [label ' + e.labels[0].innerText.replace(/\s+/g, ' ').trim().slice(0, 40) + ']' : ''}`).slice(0, 70));
  console.log(`     LOOK ${tag} @ ${D.page.url().replace(BASE, '')}\n       ` + items.join('\n       '));
}
async function type(D, J, what, loc, text) { await loc.first().fill(text); J.entries++; J.steps.push(`⌨ ${what}`); }

/** what the top bar says on this screen, and whether it names the place expected */
async function orient(D, J, expected) {
  const said = await D.page.evaluate(() => document.querySelector('.nv-top .nv-job-l')?.textContent?.trim() ?? '');
  J.orient.push({ expected, said, right: said === expected });
}

const rail = (D, label) => D.page.locator('.nv-rail .nv-ri').filter({ has: D.page.locator('.nv-ri-l', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) });
async function nav(D, J, label) {
  if (!D.phone) return press(D, J, `rail: ${label}`, rail(D, label));
  const bar = D.page.locator('.nv-bar .nv-bi').filter({ has: D.page.locator('.nv-bi-l', { hasText: new RegExp(`^${label}$`) }) });
  if (await bar.count()) return press(D, J, `bar: ${label}`, bar);
  await press(D, J, 'bar: More', D.page.locator('.nv-bar .nv-bi').filter({ hasText: 'More' }));
  return press(D, J, `More: ${label}`, D.page.locator('.nv-sheet .nv-ri').filter({ has: D.page.locator('.nv-ri-l', { hasText: new RegExp(`^${label}$`) }) }));
}
const btn = (D, name) => D.page.getByRole('button', { name, exact: false });
const text = (D, t) => D.page.getByText(t, { exact: false });

async function run(name, width, fn) {
  if (ONLY && !name.startsWith(ONLY)) return;
  const D = await device(width);
  const J = journey(name, width < 900 ? 'phone' : 'desk');
  try { await fn(D, J); } catch (e) {
    J.ok = false; J.note = String(e.message).split('\n')[0].slice(0, 200);
    J.dump = await D.page.evaluate(() => [...document.querySelectorAll('main button, main a, main select, main input, main textarea, .rd button, .rd input, .rd textarea, .rd select, .sheet button, .sheet input, .sheet textarea, .sheet select, [role=dialog] button, [role=dialog] input, [role=dialog] textarea')].filter(e => e.getBoundingClientRect().width > 0).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}: ${(e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 60)}`).slice(0, 90)).catch(() => []);
    J.url = D.page.url();
  }
  results.push(J);
  console.log(`${J.ok ? 'DONE' : 'STOP'} ${name} [${J.device}] taps ${J.taps} · entries ${J.entries} · screens ${J.screens} · hunts ${J.hunts} · orientation ${J.orient.filter(o => o.right).length}/${J.orient.length}${J.note ? ' · ' + J.note : ''}`);
  console.log('     ' + J.steps.join(' → '));
  for (const o of J.orient.filter(o => !o.right)) console.log(`     top bar said "${o.said}", the place was "${o.expected}"`);
  if (J.dump) console.log('     AT ' + J.url + '\n       ' + J.dump.join('\n       '));
  await D.ctx.close();
}

async function J1(D, J) {
  await D.page.goto(`${BASE}/#/room`); await settle(D.page); await orient(D, J, 'Control room');
  await nav(D, J, 'Line 7'); await orient(D, J, 'Line 7');
  await press(D, J, 'Projects on this line: Line 7 pace', D.page.locator('main').getByText('Line 7 pace', { exact: true })); await orient(D, J, 'Line 7 pace');
  await nav(D, J, 'Fishbone'); await orient(D, J, 'Line 7 pace');
  await nav(D, J, 'Line 7'); await orient(D, J, 'Line 7');
  await press(D, J, 'Tools on this line: Line capacity', D.page.locator('main').getByRole('button', { name: /^Line capacity/ })); await orient(D, J, 'Line 7');
  await press(D, J, 'Maris Piper 2kg', D.page.locator('main button.lt-row').filter({ hasText: 'Maris Piper 2kg' })); await orient(D, J, 'Line 7');
  await nav(D, J, 'Control room'); await orient(D, J, 'Control room');
}
/* J1 — across the factory, a line and a project (desk): from the control room, Line 7; the 6M project running on it;
   its fishbone; then Line 7's Line capacity for Maris Piper 2kg; back to the control room. */
await run('J1 across factory, line and project', 1360, async (D, J) => {
  await J1(D, J);
});
/* J1 on a phone, the same way */
await run('J1 across factory, line and project', 390, async (D, J) => { await J1(D, J); });


/* J2 — a tool on its own, on the floor (phone): from Home, a capability study with no line or project — set up, three readings, the verdict read. */
await run('J2 a tool on its own', 390, async (D, J) => {
  await D.page.goto(`${BASE}/#/`); await settle(D.page); await orient(D, J, 'Home');
  await press(D, J, 'Home: Capability', D.page.locator('main').getByRole('button', { name: /^Capability/ }).first()); await orient(D, J, 'Capability');
  await press(D, J, 'New capability study', btn(D, 'New capability study'));
  await type(D, J, 'What is it of?', D.page.getByLabel('What is it of?'), 'Fill weight 400 g');
  await type(D, J, 'On which machine?', D.page.getByLabel(/On which machine/), 'Ishida checkweigher');
  await press(D, J, 'Start it', btn(D, 'Start it')); await orient(D, J, 'Capability');
  await type(D, J, 'Unit', D.page.getByLabel('Unit'), 'g');
  await type(D, J, 'Lower limit', D.page.getByLabel('Lower limit'), '400');
  await type(D, J, 'Upper limit', D.page.getByLabel('Upper limit'), '404');
  await press(D, J, 'Agree these', btn(D, 'Agree these'));
  for (const v of ['401.2', '402.0', '401.6']) { await D.page.keyboard.type(v); await D.page.keyboard.press('Enter'); J.entries++; await D.page.waitForTimeout(200); }
  J.steps.push('⌨ three readings');
  const said = (await D.page.locator('.ie-say').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  J.steps.push(`[it says: ${said.slice(0, 70)}]`);
});

/* J3 — a tool in context (desk): inside Line 7 pace (6M), a SMED for the project; then found again from the project and from Line 7. */
async function J3(D, J) {
  await D.page.goto(`${BASE}/#/project/${D.sd.pacedProjectId}`); await settle(D.page); await orient(D, J, 'Line 7 pace');
  await nav(D, J, 'SMED'); await orient(D, J, 'Line 7 pace');
  await press(D, J, 'New SMED', btn(D, 'New SMED'));
  await D.page.getByLabel(/Which line/).selectOption({ label: 'Line 7' }); J.entries++; J.steps.push('⌨ Which line? Line 7');
  await type(D, J, 'From which product?', D.page.getByLabel(/From which product/), 'Maris Piper 2kg');
  await type(D, J, 'To which product?', D.page.getByLabel(/To which product/), 'Express 1.25 kg');
  await press(D, J, 'Start it', btn(D, 'Start it')); await orient(D, J, 'Line 7 pace');
  /* found again — from the project */
  await nav(D, J, 'SMED'); await orient(D, J, 'Line 7 pace');
  await D.page.locator('main button.lt-row').filter({ hasText: 'Maris Piper 2kg' }).first().waitFor({ timeout: 8000 });
  J.steps.push('[on the project\'s SMED list]');
  /* and from Line 7 */
  await nav(D, J, 'Line 7'); await orient(D, J, 'Line 7');
  await press(D, J, 'Tools on this line: SMED', D.page.locator('main').getByRole('button', { name: /^SMED/ }).first()); await orient(D, J, 'Line 7');
  const there = await D.page.locator('main button.lt-row').filter({ hasText: 'Maris Piper 2kg' }).count();
  J.steps.push(there ? '[on Line 7\'s SMED list]' : '[NOT on Line 7\'s SMED list as it opens]');
  if (!there) await look(D, J, 'J3 Line 7 SMED list');
}
await run('J3 a tool in context', 1360, async (D, J) => { await J3(D, J); });

await run('J3 a tool in context', 390, async (D, J) => { await J3(D, J); });
/* J4 — a stage gate's day (phone): on Line 2 commissioning, the seal re-test fails; its problem; its fix with who and when; seen on Actions. */
await run('J4 stage gate: a failed re-test to a fix', 390, async (D, J) => {
  await D.page.goto(`${BASE}/#/`); await settle(D.page); await orient(D, J, 'Home');
  await press(D, J, 'Under way: Line 2 commissioning', D.page.locator('main').getByText('Line 2 commissioning', { exact: true }).first()); await orient(D, J, 'Line 2 commissioning');
  await nav(D, J, 'Plan'); await orient(D, J, 'Line 2 commissioning');
  await press(D, J, 'tab: Commission', D.page.locator('main a.plt-t').filter({ hasText: /^Commission/ }).first());
  const R = () => D.page.locator('.rd').last();
  await press(D, J, 'the re-test', btn(D, /Seal integrity — Finest Red 2kg — re-test/));
  await press(D, J, 'Didn’t pass', R().getByRole('button', { name: /Didn.t pass/ }));
  await press(D, J, 'Hit a problem', R().getByRole('button', { name: /Hit a problem/ }));
  await type(D, J, 'what went wrong', R().getByPlaceholder(/Guard brackets/), 'Seal jaw too cold on the second lane');
  await press(D, J, 'Save the problem', R().getByRole('button', { name: /Save the problem/ }));
  await press(D, J, 'Make it a fix', R().getByRole('button', { name: /Make it a fix/ }));
  await R().getByText(/back to Seal jaw too cold/i).first().waitFor({ timeout: 10000 }).catch(() => {});
  J.steps.push('[fix made — who and when on it next]');
  await press(D, J, 'close the drawer', D.page.locator('.rd').last().getByRole('button', { name: /^Close|×/ }).first());
  await nav(D, J, 'Actions'); await orient(D, J, 'Line 2 commissioning');
  await D.page.locator('main').getByText('Seal jaw too cold', { exact: false }).first().waitFor({ timeout: 8000 });
  J.steps.push('[the fix is on Actions]');
});

/* J5 — a 6M week (desk): on Line 7 pace, the biggest loss to its problem on the fishbone, a cause, a countermeasure with who and when, seen on Actions. */
await run('J5 6M: loss to cause to countermeasure', 1360, async (D, J) => {
  await D.page.goto(`${BASE}/#/project/${D.sd.pacedProjectId}`); await settle(D.page); await orient(D, J, 'Line 7 pace');
  await nav(D, J, 'Fishbone'); await orient(D, J, 'Line 7 pace');
  await press(D, J, 'Breakdown: Find the root cause', D.page.locator('main').getByRole('button', { name: /Find the root cause/ }).first());
  await press(D, J, 'the suggested cause: Breakdown — Mechanical on the Basketer', D.page.locator('main button.fb-row').filter({ hasText: 'Mechanical on the Basketer' }).first());
  await press(D, J, 'Confirmed', D.page.locator('.sheet button.cs-seg-b').filter({ hasText: 'Confirmed' }).first());
  await press(D, J, 'Add to the fishbone', btn(D, 'Add to the fishbone'));
  await press(D, J, 'the cause, now on the fishbone', D.page.locator('main button.fb-row').filter({ hasText: 'Mechanical on the Basketer' }).first());
  await press(D, J, '+ Add a fix', btn(D, '+ Add a fix'));
  const S = D.page.locator('.sheet').last();
  await type(D, J, 'What has to be done', S.getByLabel(/What has to be done/i), 'Replace the Basketer guide rail bearings');
  await type(D, J, 'Who', S.getByLabel(/^Who/i), 'Rob Scott');
  await type(D, J, 'Due', S.getByLabel(/^Due/i), '2026-10-22');
  await press(D, J, 'Add it', S.getByRole('button', { name: /^Add it$/ }));
  await nav(D, J, 'Actions'); await orient(D, J, 'Line 7 pace');
  await D.page.locator('main').getByText('Replace the Basketer guide rail bearings', { exact: false }).first().waitFor({ timeout: 8000 });
  J.steps.push('[the countermeasure is on Actions]');
});

/* J6 — a lever tree month (desk): on Line 2B to 60 ppm, the condition off track, its action and who owes it, and the number's next reading. */
await run('J6 lever tree: what is off track', 1360, async (D, J) => {
  await D.page.goto(`${BASE}/#/room`); await settle(D.page); await orient(D, J, 'Control room');
  await nav(D, J, 'Line 2B to 60 ppm'); await orient(D, J, 'Line 2B to 60 ppm');
  await nav(D, J, 'Tree'); await orient(D, J, 'Line 2B to 60 ppm');
  const off = (await D.page.locator('main').innerText()).replace(/\s+/g, ' ');
  J.steps.push(/Behind target/.test(off) && /Replace the worn sealing jaw/.test(off) && /Engineering/.test(off) ? '[read on the tree: the condition behind target, its action, Engineering owes it, late]' : '[NOT all read on the tree]');
  await nav(D, J, 'Numbers'); await orient(D, J, 'Line 2B to 60 ppm');
  await press(D, J, 'Record a reading', btn(D, 'Record a reading'));
  const form = D.page.locator('main').locator('form, div, section').filter({ has: D.page.getByRole('button', { name: 'Add reading' }) }).last();
  await type(D, J, 'On (the day)', form.locator('input[type=date]').first(), '2026-10-15');
  await type(D, J, 'Packs per minute', form.locator('input:not([type=date])').first(), '56');
  await press(D, J, 'Add reading', btn(D, 'Add reading'));
});

/* J7 — problems and actions (phone, then desk): a problem taken on Line 7 with no project; every late action by person; one moved on;
   the Line 7 problem moved into Line 7 pace. */
await run('J7a a problem on Line 7, on the phone', 390, async (D, J) => {
  await D.page.goto(`${BASE}/#/`); await settle(D.page); await orient(D, J, 'Home');
  await nav(D, J, 'Lines'); await orient(D, J, 'Your factory');
  await press(D, J, 'Line 7', D.page.locator('main').getByRole('button', { name: /^Open/ }).nth(1));
  await orient(D, J, 'Line 7');
  await press(D, J, 'Problem', D.page.locator('.qs-fab'));
  const S = D.page.locator('.sheet').last();
  const line = await S.getByLabel(/^Line/i).first().evaluate(e => e.options[e.selectedIndex]?.text).catch(() => '?');
  J.steps.push(`[the sheet's line: ${line}]`);
  await type(D, J, 'What’s wrong', S.getByLabel(/What.s wrong/i), 'Bagger infeed guard loose');
  await press(D, J, 'Save', S.getByRole('button', { name: /^Save$/ }));
  await nav(D, J, 'Problems'); await orient(D, J, 'Control room');
  await D.page.locator('main').getByText('Bagger infeed guard loose', { exact: false }).first().waitFor({ timeout: 8000 });
  J.steps.push('[on the register, on Line 7]');
});
await run('J7b every late action, by person (desk)', 1360, async (D, J) => {
  await D.page.goto(`${BASE}/#/`); await settle(D.page); await orient(D, J, 'Home');
  await nav(D, J, 'Every action'); await orient(D, J, 'Control room');
  await press(D, J, 'Late', D.page.locator('main').getByRole('button', { name: /^Late$/ }).first());
  await press(D, J, 'the late test: Changeover 2kg → 1.25kg', D.page.locator('main button.lt-row').filter({ hasText: 'Changeover 2kg' }).first());
  await orient(D, J, 'Control room');
  const opened = await D.page.locator('aside.rd').count();
  J.steps.push(opened ? '[its record opened]' : '[NOTHING OPENED — the address took ?open= but no drawer is drawn on Every action]');
  if (!opened) throw new Error('Every action: a row does not open its record');
});
await run('J7c a line problem moved into a project (desk)', 1360, async (D, J) => {
  await D.page.goto(`${BASE}/#/`); await settle(D.page); await orient(D, J, 'Home');
  await nav(D, J, 'Control room problems'); await orient(D, J, 'Control room');
  await press(D, J, 'the problem on Line 7 — smoke test', D.page.locator('main button.qsl-open').filter({ hasText: 'seeded snag 0' }).first());
  await D.page.locator('main select:has(option:text-is("No project"))').first().selectOption({ label: 'Line 7 pace' }); J.entries++; J.steps.push('⌨ Project: Line 7 pace');
  await press(D, J, 'Save', D.page.locator('main').getByRole('button', { name: /^Save$/ }).first());
  const where = (await D.page.locator('main').innerText()).replace(/\s+/g, ' ');
  J.steps.push(/Line 7 pace[^]*seeded snag 0|seeded snag 0[^]*for Line 7 pace/.test(where) ? '[shown for Line 7 pace]' : '[saved]');
});

/* J8 — the Monday pack (desk): the stage gate's one-page status, the 6M report, Line 7's line report, the control room report. */
await run('J8 the Monday pack', 1360, async (D, J) => {
  await D.page.goto(`${BASE}/#/room`); await settle(D.page); await orient(D, J, 'Control room');
  await nav(D, J, 'Line 2 commissioning'); await orient(D, J, 'Line 2 commissioning');
  await press(D, J, 'Status report — 1 page', btn(D, /Status report/));
  await download(D, J, 'PDF', D.page.locator('main').getByRole('button', { name: /^PDF$/ }).first());
  /* the 6M report */
  await nav(D, J, 'Control room'); await nav(D, J, 'Line 7 pace'); await orient(D, J, 'Line 7 pace');
  await nav(D, J, 'Reports');
  await press(D, J, 'Client report', D.page.locator('button.meet-report').filter({ hasText: 'Client report' }).first());
  await download(D, J, 'PDF', D.page.locator('main').getByRole('button', { name: /^PDF$/ }).first());
  /* Line 7's line report */
  await nav(D, J, 'Control room'); await nav(D, J, 'Line 7'); await orient(D, J, 'Line 7');
  await download(D, J, 'Line report', D.page.locator('main').getByRole('button', { name: /^Line report/ }).first());
  /* the control room's */
  await nav(D, J, 'Control room'); await orient(D, J, 'Control room');
  await download(D, J, 'Control room report — 1 page', D.page.locator('main').getByRole('button', { name: /Control room report/ }).first());
});


/* J8 by the control room's All reports sheet — the other way there is today */
await run('J8b the Monday pack, from All reports', 1360, async (D, J) => {
  await D.page.goto(`${BASE}/#/room`); await settle(D.page); await orient(D, J, 'Control room');
  await nav(D, J, 'Reports');
  const door = t => D.page.locator('.sheet button.meet-report').filter({ hasText: t }).first();
  await download(D, J, 'Control room report — 1 page', door('Control room report'));
  await D.page.keyboard.press('Escape'); await D.page.waitForTimeout(600);
  const inSheet = (proj, t) => D.page.locator('.sheet').locator('section, div').filter({ hasText: new RegExp('^' + proj) }).locator('button.meet-report').filter({ hasText: t }).first();
  for (const [proj, label] of [['Line 2 commissioning', 'Client report'], ['Line 7 pace', 'Client report']]) {
    if (!/#\/room/.test(D.page.url())) await nav(D, J, 'Control room');
    await nav(D, J, 'Reports');
    const b = inSheet(proj, label);
    await press(D, J, `${proj}: ${label}`, (await b.count()) ? b : door(label));
    await orient(D, J, proj);
    await download(D, J, 'PDF', D.page.locator('main').getByRole('button', { name: /^PDF$/ }).first());
  }
  await nav(D, J, 'Control room');
  await nav(D, J, 'Reports');
  await download(D, J, 'One-page report — Line 7', door('One-page report — Line 7'));
  /* the line's one-page report is a print page: one more press for the paper */
  await press(D, J, 'Print / save PDF', D.page.getByRole('button', { name: /Print \/ save PDF/ }));
});

writeFileSync(OUT, JSON.stringify(results, null, 1));
await browser.close();

/* ---- against the baseline ---- */
/** A journey allowed more taps than its baseline: its name and device, and the reason Rowland agreed. */
const LONGER = {};
const base = JSON.parse(readFileSync(new URL('../docs/structure/journeys-baseline.json', import.meta.url), 'utf8')).walks;
let fail = 0;
console.log('\n  journey                                              taps (was)   hunts (was)   named (was)');
for (const J of results) {
  const B = base.find(b => b.name === J.name && b.device === J.device);
  const named = J.orient.filter(o => o.right).length, wasNamed = B ? B.orient.filter(o => o.right).length : 0;
  const longer = B && J.taps > B.taps && !LONGER[`${J.name} [${J.device}]`];
  const bad = !J.ok || !B || longer;
  if (bad) fail++;
  console.log(`${bad ? '✗' : '✓'} ${`${J.name} [${J.device}]`.padEnd(52)} ${String(J.taps).padStart(3)} (${B?.taps ?? '—'})     ${String(J.hunts).padStart(3)} (${B?.hunts ?? '—'})     ${named}/${J.orient.length} (${B ? `${wasNamed}/${B.orient.length}` : '—'})${!J.ok ? '  did not finish: ' + J.note : !B ? '  no baseline' : longer ? '  LONGER than its baseline' : ''}`);
}
const missing = ONLY ? [] : base.filter(b => !results.some(J => J.name === b.name && J.device === b.device));
for (const b of missing) { fail++; console.log(`✗ ${b.name} [${b.device}] — in the baseline, not walked`); }
console.log(fail ? `\nThe journeys NOT kept: ${fail} failed` : '\nThe journeys kept: every one finished, none longer than its baseline.');
process.exit(fail ? 1 : 0);
