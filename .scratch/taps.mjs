import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5301';
const SESSION = { access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:375,height:844}, hasTouch:true, locale:'en-GB' });
await ctx.route('**://*.supabase.co/**', r=>r.abort());
await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},['sb-testproj-auth-token',SESSION]);
const page = await ctx.newPage();
await page.goto(`${BASE}/#/room`,{timeout:120000}); await page.waitForTimeout(2500);
const logs = await page.evaluate(async () => { const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest(); return await (await import('/src/dev/seed.ts')).seedChecksForTest(sd.wsId, sd.projectId); });
const small = () => page.evaluate(() => [...document.querySelectorAll('main button, main input:not([type=hidden]), main select, main textarea, main a[href], [role=dialog] button, [role=dialog] input, [role=dialog] select')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { t: e.tagName+'.'+(e.className||'').toString().slice(0,40), txt:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,30), w: Math.round(r.width), h: Math.round(r.height), vis: r.width>0 && cs.visibility!=='hidden' }; }).filter(x => x.vis && x.h < 44 && !/nv-/.test(x.t)));
for (const key of ['metal-detection','five-s']) {
  await page.goto(`${BASE}/#/log/${key}/${logs[key]}`); await page.waitForTimeout(2000);
  for (const tab of ['Round','History','The checks']) {
    await page.getByRole('tab',{name:new RegExp('^'+tab)}).click(); await page.waitForTimeout(500);
    console.log(key, tab, JSON.stringify(await small()));
  }
}
await page.goto(`${BASE}/#/log/five-s?add=1`); await page.waitForTimeout(1500);
console.log('new sheet', JSON.stringify(await small()));
await browser.close();
