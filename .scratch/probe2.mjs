import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5301';
const SESSION = { access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:375,height:812}, locale:'en-GB' });
await ctx.route('**://*.supabase.co/**', r=>r.abort());
await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},['sb-testproj-auth-token',SESSION]);
const page = await ctx.newPage();
for (const [h,btn] of [['losses','New loss count'],['sampling','New work sampling'],['logs','New']]) {
  await page.goto(`${BASE}/#/${h}`,{timeout:120000}); await page.waitForTimeout(1500);
  await page.locator(`button:has-text("${btn}")`).first().click(); await page.waitForTimeout(800);
  const sel = page.locator('select[aria-label="Which line"]');
  console.log(h, await sel.count(), (await sel.first().locator('option').allInnerTexts()), await page.locator('form button[type=submit]').allInnerTexts(), await page.locator('form button[type=submit]').first().isDisabled());
  await page.screenshot({path:`/tmp/fixa-shots/probe2-${h}.png`});
}
await browser.close();
