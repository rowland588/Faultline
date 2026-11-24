/* The identity stays readable and simple on real app screens, without duplicate actions. */
import { mkdirSync } from 'node:fs';
import { openApp, BASE } from '../lib/tocBrowser.mjs';
const t = await openApp(); const { page:p,ok }=t;
const out=process.env.BRAND_SHOTS || '/tmp/faultline-brand'; mkdirSync(out,{recursive:true});
const sd=await t.seed();
for(const width of [360,820,1440]) {
  await p.setViewportSize({width,height:1000}); await t.go('#/factory');
  /* Set up's one primary: Add area until an area exists, then Add lines (19 November — areas contain lines) */
  await p.locator('main .btn-primary').filter({hasText:/^Add (lines|area)$/}).first().waitFor();
  const contrast=await p.evaluate(()=>{
    const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
    const l=s=>{const c=rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};
    const ratio=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
    const b=document.querySelector('main .btn-primary'), c=getComputedStyle(b), body=getComputedStyle(document.body);
    const rail=document.querySelector('.nv-rail'),nav=[];
    if(rail?.getBoundingClientRect().width) for(const item of rail.querySelectorAll('.nv-ri')) {
      const itemStyle=getComputedStyle(item),bg=item.classList.contains('is-on')?itemStyle.backgroundColor:getComputedStyle(rail).backgroundColor;
      nav.push(ratio(itemStyle.color,bg));
    }
    return {action:ratio(c.color,c.backgroundColor),body:ratio(body.color,body.backgroundColor),nav,radius:parseFloat(c.borderRadius),height:b.getBoundingClientRect().height};
  });
  ok(contrast.action>=4.5&&contrast.body>=4.5,`actions and body text have readable contrast at ${width}px`);
  ok(contrast.nav.every(x=>x>=4.5),`desktop navigation, including the selected item, remains readable at ${width}px`);
  ok(contrast.radius<contrast.height/2&&contrast.height>=44,`primary action has simple corners and a phone-sized target at ${width}px`);
  /* MINIMAL V2 (19 November, docs/design/minimal-v2): the page, the one primary, the rail, nothing tilted, lime only on the logo */
  const look=await p.evaluate(()=>{
    const cs=e=>getComputedStyle(e), b=document.querySelector('main .btn-primary'), bc=cs(b);
    const lime='rgb(216, 235, 119)';
    const limeElsewhere=[...document.querySelectorAll('body *')].filter(e=>!e.closest('.logo-mark')&&[cs(e).backgroundColor,cs(e).color,cs(e).borderTopColor].includes(lime)).map(e=>e.className).slice(0,3);
    const tilted=[...document.querySelectorAll('.nv-ri,.nv-bi,.nv-bi-ic,.nv-tab,.btn,.chip,.part-view')].filter(e=>{const m=/matrix\(([^)]+)\)/.exec(cs(e).transform);return !!m&&Math.abs(Number(m[1].split(',')[1]))>0.001;}).length;
    const on=document.querySelector('.nv-rail .nv-ri.is-on');
    return {page:cs(document.body).backgroundColor,primary:bc.backgroundColor,primaryInk:bc.color,primaryShadow:bc.boxShadow,primaryRadius:parseFloat(bc.borderRadius),railOn:on&&on.getBoundingClientRect().width?cs(on).color:null,limeElsewhere,tilted};
  });
  ok(look.page==='rgb(245, 245, 245)'&&look.primary==='rgb(74, 90, 20)'&&look.primaryInk==='rgb(255, 255, 255)'&&look.primaryRadius<=4&&!/\d+px \d+px 0px/.test(look.primaryShadow.replace(/rgba?\([^)]*\)/g,'')),
    `the minimal look at ${width}px: the #f5f5f5 page, one olive primary with white words, 4px corners, no offset shadow (${JSON.stringify({page:look.page,primary:look.primary,ink:look.primaryInk,radius:look.primaryRadius,shadow:look.primaryShadow})})`);
  ok((look.railOn===null||look.railOn==='rgb(74, 90, 20)')&&look.tilted===0&&look.limeElsewhere.length===0,
    `the selected rail item olive, nothing tilted, lime only on the logo at ${width}px (${JSON.stringify({railOn:look.railOn,tilted:look.tilted,lime:look.limeElsewhere})})`);
  await t.go('#/room');
  await p.screenshot({path:`${out}/factory-${width}.png`,fullPage:true});
  await t.go(`#/lines/${sd.wsId}?view=tools`);await p.locator('[data-line-uses]').waitFor();
  ok(await p.locator('.line-use-open').count()>0&&await t.wide()<=1,`individual saved uses remain visible and fit ${width}px`);
  await p.screenshot({path:`${out}/uses-${width}.png`,fullPage:true});
  for (const route of ['balances','standards','linebalance']) {
    await t.go(`#/${route}`);
    const row=p.locator('.lt-carry .lt-row').first(); await row.waitFor();
    ok(await p.locator('.lt-carry-go').count()===0&&await row.locator('.lt-open-hint').count()===1&&await t.wide()<=1,`${route} has one opening action per product and fits ${width}px`);
    await p.screenshot({path:`${out}/${route}-${width}.png`,fullPage:true});
  }
  await t.go(`#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=balance`);
  const workings=p.getByRole('button',{name:'Show the workings and set-up',exact:true});
  if(await workings.isVisible()) await workings.click();
  await p.locator('.vc-neck, .vc-row.is-limit .vc-row-val').filter({visible:true}).first().waitFor();
  const badge=await p.locator('.vc-neck, .vc-row.is-limit .vc-row-val').filter({visible:true}).first().evaluate(el=>{
    const c=getComputedStyle(el), luminance=s=>{const v=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722};
    const fg=luminance(c.color),bg=luminance(c.backgroundColor);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
  });
  ok(badge>=4.5,`capacity bottleneck label remains readable at ${width}px`);
  await p.screenshot({path:`${out}/capacity-${width}.png`,fullPage:true});
  await t.go('#/');await p.locator('.ai-empty').waitFor();
  ok(await p.locator('.ai-empty-g').count()===1&&await p.locator('.ai-empty .ai-sug').count()===0,`Luna empty is orb and name only at ${width}px`);
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
