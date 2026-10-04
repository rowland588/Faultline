import pkg from 'playwright'; const { chromium } = pkg;
const BASE = 'http://127.0.0.1:5198'; const OUT = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const SESSION = { access_token:'smoke', token_type:'bearer', expires_in:3600, expires_at: Math.floor(Date.now()/1000)+31536000, refresh_token:'smoke',
  user:{ id:'22222222-2222-2222-2222-222222222222', aud:'authenticated', role:'authenticated', email:'dave.fitter@example.com', app_metadata:{}, user_metadata:{}, created_at:new Date().toISOString() } };
for (const level of ['client','team','owner']) {
  const ctx = await b.newContext({ serviceWorkers:'block', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, locale:'en-GB' });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k,s,l]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (l !== 'owner') localStorage.setItem('faultline.access.force', l); } catch {} }, ['sb-testproj-auth-token', SESSION, level]);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(2000);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  for (const [name, hash] of [['job', `#/project/${sd.projectId}`], ['test', `#/project/${sd.projectId}/testing/${sd.testId}`], ['install', `#/project/${sd.projectId}/install`]]) {
    await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(2500);
    const note = await page.$eval('.access-note', e => e.textContent).catch(() => '(none)');
    const inputs = await page.$$eval('input:not([type=hidden]), textarea, select', els => els.filter(e => e.offsetParent).length);
    const btns = await page.$$eval('button', els => els.filter(e => e.offsetParent).map(e => (e.textContent||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ')).filter(t => /add|delete|remove|plan a|new|edit|camera|passed|didn|mark|×/i.test(t)));
    console.log(`${level.padEnd(6)} ${name.padEnd(8)} inputs=${inputs} note="${note}"\n         write-ish buttons: ${JSON.stringify(btns.slice(0,12))}`);
    await page.screenshot({ path: `${OUT}/lead-${level}-${name}.png`, fullPage: true });
  }
  console.log(level, 'errors:', errs.length ? errs : 'none');
  await ctx.close();
}
await b.close();
