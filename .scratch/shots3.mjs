import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5301';
const SESSION = { access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const W of [375,1360]) {
const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:W,height:W<900?844:900}, hasTouch:W<900, locale:'en-GB' });
await ctx.route('**://*.supabase.co/**', r=>r.abort());
await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},['sb-testproj-auth-token',SESSION]);
const page = await ctx.newPage();
await page.goto(`${BASE}/#/room`,{timeout:120000}); await page.waitForTimeout(2500);
const logs = await page.evaluate(async () => { const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest(); const l = await (await import('/src/dev/seed.ts')).seedChecksForTest(sd.wsId, sd.projectId);
  const db = await import('/src/db.ts'); const s = await db.getStudy(l['metal-detection']); await db.putStudy({ ...s, agreed: { ...s.agreed, log: { ...s.agreed.log, since: Date.now() - 40*3600e3 }}, facts:{...s.facts, results:[]}, updatedAt: Date.now() }); return l; });
await page.goto(`${BASE}/#/log/metal-detection/${logs['metal-detection']}`); await page.waitForTimeout(2200);
await page.screenshot({path:`/tmp/fixa-shots/${W}-log-round.png`});
await page.locator('[data-pass-all]').click(); await page.waitForTimeout(600);
await page.screenshot({path:`/tmp/fixa-shots/${W}-log-passall-sheet.png`});
await page.getByRole('button',{name:/^Pass 3 checks/}).click(); await page.waitForTimeout(800);
await page.screenshot({path:`/tmp/fixa-shots/${W}-log-passall-done.png`});
await page.goto(`${BASE}/#/log/metal-detection`); await page.waitForTimeout(2000);
await page.screenshot({path:`/tmp/fixa-shots/${W}-log-list.png`});
await ctx.close();
}
await browser.close();
