import { chromium } from 'playwright';
const BASE='http://127.0.0.1:5241';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke', user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({serviceWorkers:'block'});
await ctx.addInitScript(s => { localStorage.setItem('sb-testproj-auth-token', JSON.stringify(s)); }, SESSION);
const page=await ctx.newPage();
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const urls=['#/machines', `#/project/${sd.projectId}/machines`, `#/project/${sd.projectId}/machine/${sd.machineId}`];
await page.goto(`${BASE}/#/machines`); await page.waitForTimeout(3000);
const hrefs = await page.evaluate(() => [...document.querySelectorAll('.fmc-m')].map(e=>e.getAttribute('data-machine')));
console.log(hrefs);
for (const u of urls) { await page.goto(`${BASE}/${u}`); await page.waitForTimeout(3500); const t = await page.locator('main').innerText(); console.log(u, /clock|watch/i.test(t) ? t.split('\n').filter(l=>/clock|watch/i.test(l)) : 'none'); }
await page.goto(`${BASE}/#/machines`); await page.waitForTimeout(3000);
for (let i=0;i<4;i++){ await page.goto(`${BASE}/#/machines`); await page.waitForTimeout(2500); const r=page.locator('.fmc-m button').nth(i); if(!(await r.count())) break; await r.click(); await page.waitForTimeout(3500); const t=await page.locator('main').innerText(); console.log(page.url(), t.split('\n').filter(l=>/clock|watch|stop/i.test(l)).slice(0,6)); }
await b.close();
