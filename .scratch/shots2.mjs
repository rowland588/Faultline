import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5301';
const SESSION = { access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [name,W] of [['phone',375],['desk',1360]]) {
  const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:W,height:W<900?844:900}, hasTouch:W<900, locale:'en-GB' });
  await ctx.route('**://*.supabase.co/**', r=>r.abort());
  await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s))}catch{}},['sb-testproj-auth-token',SESSION]);
  const page = await ctx.newPage();
  const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
  await go('#/room');
  await go('#/losses'); await page.getByRole('button',{name:'New loss count'}).first().click(); await page.waitForTimeout(700);
  await page.screenshot({path:`/tmp/fixa-shots/${name}-losses-new.png`});
  await go('#/log/metal-detection?add=1'); await page.waitForTimeout(500);
  await page.screenshot({path:`/tmp/fixa-shots/${name}-log-new.png`});
  await page.getByRole('button',{name:'Start it'}).click(); await page.waitForTimeout(2000);
  await go('#/sampling'); await page.getByRole('button',{name:'New work sampling'}).first().click(); await page.waitForTimeout(500);
  await page.locator('select[data-line-field]').selectOption({label:'Line 1'}).catch(()=>{});
  await page.getByLabel(/What is it of/).fill('Morning packing'); await page.getByRole('button',{name:'Start it'}).click(); await page.waitForTimeout(2000);
  await page.screenshot({path:`/tmp/fixa-shots/${name}-sampling-setup.png`, fullPage:true});
  await page.getByLabel('Add a person or role').fill('Op 1'); await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('button',{name:'Start sampling'}).click(); await page.waitForTimeout(1000);
  await page.screenshot({path:`/tmp/fixa-shots/${name}-sampling-wait.png`});
  await page.locator('[data-sample-now]').click(); await page.waitForTimeout(700);
  await page.screenshot({path:`/tmp/fixa-shots/${name}-sampling-round.png`});
  await ctx.close();
}
await browser.close();
