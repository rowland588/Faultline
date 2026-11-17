/* The identity stays readable and simple on real app screens, without duplicate actions. */
import { mkdirSync } from 'node:fs';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
const t = await openApp(); const { page:p,ok }=t;
const out=process.env.BRAND_SHOTS || '/tmp/faultline-brand'; mkdirSync(out,{recursive:true});
const sd=await t.seed();
for(const width of [360,820,1440]) {
  await p.setViewportSize({width,height:1000}); await t.go('#/room');
  const contrast=await p.evaluate(()=>{
    const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
    const l=s=>{const c=rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};
    const ratio=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
    const b=document.querySelector('main .btn-primary'), c=getComputedStyle(b), body=getComputedStyle(document.body);
    return {action:ratio(c.color,c.backgroundColor),body:ratio(body.color,body.backgroundColor),radius:parseFloat(c.borderRadius),height:b.getBoundingClientRect().height};
  });
  ok(contrast.action>=4.5&&contrast.body>=4.5,`actions and body text have readable contrast at ${width}px`);
  ok(contrast.radius<contrast.height/2&&contrast.height>=44,`primary action has simple corners and a phone-sized target at ${width}px`);
  await p.screenshot({path:`${out}/factory-${width}.png`,fullPage:true});
  await t.go(`#/lines/${sd.wsId}?view=tools`);await p.locator('[data-line-uses]').waitFor();
  ok(await p.locator('.line-use-open').count()>0&&await t.wide()<=1,`individual saved uses remain visible and fit ${width}px`);
  await p.screenshot({path:`${out}/uses-${width}.png`,fullPage:true});
  await t.go('#/');await p.locator('.ai-empty').waitFor();
  ok(await p.locator('.ai-empty .ai-sug').count()===2,`Luna offers two starting suggestions at ${width}px`);
  ok(await p.locator('[data-camera]:visible').count()===0,`camera is not duplicated on the composer at ${width}px`);
  await p.getByRole('button',{name:'Add — a photo or a factory document',exact:true}).click();
  ok(await p.locator('[data-camera]:visible').count()===1,`one camera action remains in attachments at ${width}px`);
  await p.keyboard.press('Escape');
  await p.screenshot({path:`${out}/luna-${width}.png`,fullPage:true});
  const calc=await p.evaluate(async()=> (await import('/src/tools/calc/registry.ts')).CALCS[0].key);
  await t.go(`#/calc/${calc}`);
  ok(await p.getByRole('button',{name:'New calculation',exact:true}).count()===1,`an empty calculator has one create action at ${width}px`);
  await t.go(`#/talk/${sd.talkId}?doc=seedt-8`);await p.getByRole('button',{name:'Download PDF',exact:true}).waitFor();
  await p.screenshot({path:`${out}/report-${width}.png`,fullPage:true});
}
const anon=await t.browser.newContext({viewport:{width:360,height:844},serviceWorkers:'block'});await anon.route('**://*.supabase.co/**',r=>r.abort());const a=await anon.newPage();await a.goto(BASE);await a.getByRole('button',{name:'Sign in',exact:true}).waitFor();
ok(await a.locator('.door-methods,.door-steps,.door-trace-svg').count()===0,'sign in has no repeated methods, lifecycle pitch or decorative trace');
await a.screenshot({path:`${out}/sign-in-360.png`,fullPage:true});await anon.close();
await t.finish('Accepted: readable identity, simple controls and retained working routes across devices');
