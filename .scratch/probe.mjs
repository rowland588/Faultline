import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5301';
const SESSION = { access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [name,vp] of [['desk',{width:1360,height:900}],['phone',{width:375,height:812}]]) {
const ctx = await browser.newContext({ serviceWorkers:'block', viewport:vp, locale:'en-GB' });
await ctx.route('**://*.supabase.co/**', r=>r.abort());
await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},['sb-testproj-auth-token',SESSION]);
const page = await ctx.newPage();
for (const h of ['losses','sampling','logs']) {
  await page.goto(`${BASE}/#/${h}`,{timeout:120000}); await page.waitForTimeout(1500);
  console.log(name,h,(await page.locator('button:has-text("New")').allInnerTexts()).slice(0,4));
  await page.screenshot({path:`/tmp/fixa-shots/probe-${name}-${h}.png`});
}
await ctx.close();
}
await browser.close();
