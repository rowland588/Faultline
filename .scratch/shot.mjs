import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5301';
const [,, W, hash, out, mode] = process.argv;
const SESSION = { access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:+W,height:+W<900?844:900}, hasTouch:+W<900, locale:'en-GB' });
await ctx.route('**://*.supabase.co/**', r=>r.abort());
await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},['sb-testproj-auth-token',SESSION]);
const page = await ctx.newPage();
await page.goto(`${BASE}/#/room`,{timeout:120000}); await page.waitForTimeout(2500);
let h = hash;
if (mode==='log') {
  const r = await page.evaluate(async () => {
    const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
    const logs = await (await import('/src/dev/seed.ts')).seedChecksForTest(sd.wsId, sd.projectId);
    const db = await import('/src/db.ts'); const s = await db.getStudy(logs['metal-detection']);
    await db.putStudy({ ...s, agreed: { ...s.agreed, log: { ...s.agreed.log, since: Date.now() - 40*3600e3 }}, facts:{...s.facts, results:[]}, updatedAt: Date.now() });
    return logs['metal-detection'];
  });
  h = `#/log/metal-detection/${r}`;
}
await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500);
await page.screenshot({path: out, fullPage: false});
if (process.argv[6]==='full') await page.screenshot({path: out.replace('.png','-full.png'), fullPage: true});
await browser.close();
