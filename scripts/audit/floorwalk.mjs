/* THE FLOOR WALK, AS A FIRST-TIMER — an empty device, a phone in one hand.
 * Set up a line, time a stop, log a problem, see where it landed. Every tap is
 * counted, every typed field counted, every place the words on the screen do
 * not say what to press is a DEAD END. node scripts/audit/floorwalk.mjs OUTDIR [BASE] */
import pkg from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const { chromium } = pkg;
const OUT = process.argv[2];
const BASE = process.argv[3] ?? 'http://127.0.0.1:5197';
const REF = 'testproj';
mkdirSync(OUT, { recursive: true });
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'en-GB', timezoneId: 'Europe/London' });
await ctx.route(`https://${REF}.supabase.co/**`, r => r.abort());
await ctx.addInitScript(([k, s]) => { localStorage.setItem(k, JSON.stringify(s)); }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.setDefaultNavigationTimeout(90000);
page.on('dialog', d => void d.accept().catch(() => {}));
let taps = 0, typed = 0, n = 0;
const log = [];
const say = s => { console.log(s); log.push(s); };
const shot = async name => { n++; const f = `${String(n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: join(OUT, f), fullPage: true }); return f; };
const see = async () => page.evaluate(() => [...document.querySelectorAll('button, a[href], [role="button"]')]
  .filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top < innerHeight; })
  .map(el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
const tap = async (what, loc) => {
  const l = typeof loc === 'string' ? page.getByRole('button', { name: loc, exact: false }).first() : loc;
  if (!(await l.isVisible().catch(() => false))) { say(`  DEAD END — nothing to press for "${what}". On screen: ${JSON.stringify(await see())}`); return false; }
  await l.click(); taps++; await page.waitForTimeout(500); say(`  tap ${taps}: ${what}`); return true;
};
const type = async (what, loc, text) => { await loc.fill(text); typed++; say(`  type ${typed}: ${what} = "${text}"`); };

say('STEP 1 — open the app (empty device)');
await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
say(`  screen: ${await shot('home')} · on screen: ${JSON.stringify(await see())}`);

say('STEP 2 — set up a line');
await tap('Set up your factory', 'Set up your factory');
await page.waitForTimeout(600);
await type('the line\'s name', page.getByLabel("The new line's name"), 'Line 1');
await type('its type', page.getByLabel("The new line's type"), 'Packing');
await tap('Add line', 'Add line');
await tap('Done', page.getByRole('button', { name: 'Done', exact: true }));
say(`  screen: ${await shot('factory')} · on screen: ${JSON.stringify(await see())}`);

say('STEP 3 — open the line');
if (!await tap('Open › (the line\'s row — its name is not the door)', page.locator('.fac-lines').getByRole('button', { name: /^Open/ }).first()))
  await tap('Line 1 (the rail)', page.getByRole('link', { name: 'Line 1' }).first());
await page.waitForTimeout(800);
const lineUrl = page.url(); const wsId = decodeURIComponent(lineUrl.split('/lines/')[1] ?? '').split('?')[0];
say(`  at ${lineUrl.replace(BASE, '')} · screen: ${await shot('line')} · on screen: ${JSON.stringify(await see())}`);

say('STEP 4 — find the stopwatch (time a stop) from the line');
const words = await see();
const door = words.find(w => /time a stop|stopwatch|capture|time it|time the/i.test(w));
if (door) await tap(door, door);
else {
  say(`  DEAD END — no "time a stop" on the line's page. Words on it: ${JSON.stringify(words)}`);
  /* a phone has a bar at the foot — anything there? */
  const bar = await page.evaluate(() => [...document.querySelectorAll('.nv-bar button, .nv-bar a, nav[aria-label*="bar" i] a, nav[aria-label*="bar" i] button')].map(e => (e.getAttribute('aria-label') || e.textContent || '').trim()));
  say(`  the phone bar says: ${JSON.stringify(bar)}`);
  say(`  (walked round it by the address: #/w/${wsId}/capture)`);
  await page.goto(`${BASE}/#/w/${wsId}/capture`); await page.waitForTimeout(1500);
}
say(`  screen: ${await shot('capture')} · on screen: ${JSON.stringify(await see())}`);
const preset = await page.evaluate(() => [...document.querySelectorAll('.cap-fields .chip.on')].map(e => e.textContent.trim()));
say(`  pre-selected chips: ${JSON.stringify(preset)}`);

say('STEP 5 — time a stop as it stands (whatever is pre-selected)');
await tap('Start timing', 'Start timing');
await page.waitForTimeout(2200);
say(`  screen: ${await shot('timing')}`);
await tap('Stop & log', page.locator('.cap-stop'));
await page.waitForTimeout(600);
const toast1 = await page.locator('.toast, [role="status"]').first().textContent().catch(() => '');
say(`  it said: "${(toast1 ?? '').trim()}"`);
say(`  screen: ${await shot('logged')}`);

say('STEP 6 — the real thing: name the machine first, then time it');
const addMachine = page.locator('.cap-fields .cap-block').nth(await page.locator('.cap-fields .cap-block .field-label', { hasText: 'Which machine' }).count() ? 0 : 0).locator('.chip-add').first();
const blocks = page.locator('.cap-fields .cap-block');
const nb = await blocks.count();
let machineBlock = null;
for (let i = 0; i < nb; i++) if (/Which machine/.test(await blocks.nth(i).textContent())) machineBlock = blocks.nth(i);
if (machineBlock && await tap('+ (add a machine)', machineBlock.locator('.chip-add'))) {
  await type('the machine', machineBlock.locator('input'), 'Bagger');
  await machineBlock.locator('input').press('Enter'); taps++; say(`  tap ${taps}: Enter (adds it)`);
} else say('  DEAD END — no way to add a machine on Capture');
const catBlock = blocks.filter({ hasText: 'What did you see' }).first();
await tap('Changeover (what I saw)', catBlock.getByRole('button', { name: 'Changeover', exact: true }));
await tap('Start timing', 'Start timing');
await page.waitForTimeout(1500);
await tap('Stop & log', page.locator('.cap-stop'));
await page.waitForTimeout(600);
const toast2 = await page.locator('.toast, [role="status"]').first().textContent().catch(() => '');
say(`  it said: "${(toast2 ?? '').trim()}"`);
say(`  screen: ${await shot('logged-bagger')} · Again? chips: ${JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.cap-again .chip')].map(e => e.textContent.trim())))}`);

say('STEP 7 — log a problem (the Problem button)');
await tap('Problem', page.locator('.nv-bar .nv-bi.is-plus'));
await page.waitForTimeout(700);
say(`  screen: ${await shot('problem-sheet')} · on screen: ${JSON.stringify(await see())}`);
await type('what is wrong', page.locator('.qs textarea'), 'Guard on the bagger infeed is loose');
const machChip = page.locator('.qs-mach').getByRole('button', { name: 'Bagger', exact: true });
if (!await tap('Bagger (machine chip)', machChip)) say('  (the machine named on the stopwatch is not offered here)');
await tap('High (priority)', page.locator('.qs-prio', { hasText: 'High' }));
await tap('Save', page.locator('.qs-foot').getByRole('button', { name: 'Save', exact: true }));
await page.waitForTimeout(800);
say(`  screen: ${await shot('problem-saved')}`);

say('STEP 8 — where did it all land?');
await tap('Analyse (the phone bar)', page.locator('.nv-bar').getByText('Analyse', { exact: true }).first());
await page.waitForTimeout(1500);
say(`  screen: ${await shot('analyse')} · says: ${JSON.stringify((await page.locator('.wrap').innerText()).replace(/\s+/g, ' ').slice(0, 400))}`);
await page.goto(`${BASE}/#/lines/${wsId}`); await page.waitForTimeout(1500);
say(`  the line's page: ${await shot('line-after')} · says: ${JSON.stringify((await page.locator('.wrap').innerText()).replace(/\s+/g, ' ').slice(0, 600))}`);
await page.goto(`${BASE}/#/`); await page.waitForTimeout(1500);
say(`  the control room: ${await shot('home-after')} · says: ${JSON.stringify((await page.locator('.wrap').innerText()).replace(/\s+/g, ' ').slice(0, 600))}`);

say(`\nTOTAL: ${taps} taps, ${typed} typed fields, ${log.filter(l => l.includes('DEAD END')).length} dead ends`);
writeFileSync(join(OUT, 'walk.log'), log.join('\n'));
await browser.close();
