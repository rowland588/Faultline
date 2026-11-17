/* Rowland's live review: remove extra setup doors and expose the place that needs attention. */
import { openApp } from '../lib/tocBrowser.mjs';
import { mkdirSync } from 'node:fs';
const t = await openApp(); const {page:p,ok}=t;
const sd=await t.seed();
const line=await p.evaluate(async id=>(await import('/src/db.ts')).getWorkspace(id),sd.wsId);
await t.go('#/room');
ok(await p.getByRole('button',{name:'Set up the lines',exact:true}).count()===0,'Factory has one Set up destination, without a second setup button');
const attention=p.locator('.fq-rec'); await attention.first().waitFor();
const places=await p.locator('.fq-rec-where').allInnerTexts();
ok(places.length>0 && places.every(s=>s.startsWith('Where: ') && s.length>12 && s!=='Where: The factory'),'each attention card names its saved location');
const cardText=await attention.first().locator('.fq-rec-what').innerText();
await attention.first().click();
await p.locator('[role=dialog]').waitFor();
ok(await p.getByRole('dialog').getByRole('textbox',{name:'What is going wrong',exact:true}).inputValue()===cardText,'one press opens the actual item that needs attention');
await p.keyboard.press('Escape');
await t.go('#/factory');
let form=p.getByRole('form',{name:`Details for ${line.name}`,exact:true});
await form.getByLabel("The line's name",{exact:true}).waitFor();
ok(await form.getByLabel("The line's name",{exact:true}).isVisible(),'a line name can be edited directly in Factory setup');
const renamed=`${line.name} renamed in place`;
await form.getByLabel("The line's name",{exact:true}).fill(renamed);
await form.getByRole('button',{name:'Save changes',exact:true}).click();
await p.waitForFunction(async ([id,name])=>(await (await import('/src/db.ts')).getWorkspace(id))?.name===name,[line.id,renamed]);
const after=await p.evaluate(async id=>(await import('/src/db.ts')).getWorkspace(id),line.id);
ok(after.lineType===line.lineType && after.siteName===line.siteName,'renaming preserves the other line details');
await p.getByLabel(`Position of ${renamed}`,{exact:true}).selectOption('0');
await p.waitForFunction(async id=>(await (await import('/src/db.ts')).getWorkspace(id))?.floorOrder===0,line.id);
ok(true,'floor order changes directly, without opening More');
await t.go(`#/lines/${line.id}?view=machines`);
const machine=line.assets.find(a=>a.trim().toLowerCase()!=='whole line');
const order=p.getByLabel(`Position of ${machine}`,{exact:true}); await order.waitFor();
await order.selectOption('1');
await p.waitForFunction(async ([id,name])=>(await (await import('/src/db.ts')).getWorkspace(id))?.assets.filter(a=>a.trim().toLowerCase()!=='whole line')[1]===name,[line.id,machine]);
ok(await p.getByRole('button',{name:'Order and names ›',exact:true}).count()===0,'machine order changes in its list without a setup sheet');
await t.go(`#/lines/${line.id}?view=setup`);
await p.locator('.line-settings-section').first().waitFor();
ok(await p.locator('.line-settings-section').count()===4 && await p.getByLabel("The line's name",{exact:true}).isVisible(),'line settings opens the existing core fields directly');
ok(await p.locator('.sheet').count()===0 && await p.locator('.pl-machines').count()===0,'settings needs no second dialog or duplicate machine list');
await t.go('#/tools');
await p.locator('[data-tool="capability"] .tc-main').click();
await p.waitForURL('**/#/capability?workspace=tools');
ok(true,'choosing a tool opens the working list directly, without an introduction page');
await t.go('#/tools');
await p.getByRole('button',{name:'About Capability',exact:true}).click();
await p.waitForURL('**/#/tools/capability?workspace=tools');
ok(true,'tool guidance remains available as an explicit secondary choice');
const out=process.env.UI_REVIEW_SHOTS;if(out)mkdirSync(out,{recursive:true});
for(const width of [360,820,1440]){
 await p.setViewportSize({width,height:1000});
 for(const [name,route] of [['factory','#/room'],['setup','#/factory'],['machines',`#/lines/${line.id}?view=machines`],['settings',`#/lines/${line.id}?view=setup`]]){
  await t.go(route);ok(await t.wide()<=1,`${name} fits ${width}px`);
  if(out)await p.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
 }
}
await t.finish('Direct edits, visible locations and fewer setup moves accepted.');
