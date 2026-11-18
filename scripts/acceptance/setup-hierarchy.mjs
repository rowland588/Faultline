/* Rowland's live review: Area → Lines → Machines, with location before summaries and no dead-end legacy machine. */
import { openApp } from '../lib/tocBrowser.mjs';
import { mkdirSync } from 'node:fs';
const t=await openApp();const {page:p,ok}=t;const sd=await t.seed();
const f=await p.evaluate(async id=>{
  const a=await (await import('/src/dev/seed.ts')).seedAreasForTest();
  const db=await import('/src/db.ts');const w=await db.getWorkspace(id);
  await db.patchWorkspaceRecord(id,current=>({assets:[...current.assets,'Legacy misspelling']}));
  const at=Date.now();
  await db.putStudy({id:'legacy-machine-history',tool:'talk',name:'Retained observation',workspaceId:id,machine:'Legacy misspelling',uses:[],agreed:{},facts:{turns:[{id:'old-note',kind:'typed',at,text:'Keep this historical record unchanged.'}]},startedAt:at,createdAt:at,updatedAt:at});
  return {...a,line:id,name:w.name};
},sd.wsId);
await t.go('#/room');
await p.locator('.fac-first .fac-area').first().waitFor();
ok(await p.evaluate(()=>document.querySelector('.fac-first').getBoundingClientRect().top<document.querySelector('.fq-recs').getBoundingClientRect().top),'Factory areas/lines precede Needs you');
await t.go(`#/area?site=${encodeURIComponent(f.site)}&area=${encodeURIComponent(f.packing)}`);
await p.locator('.ar-page [aria-label="Its lines"]').waitFor();
ok(await p.evaluate(()=>document.querySelector('.ar-page [aria-label="Its lines"]').getBoundingClientRect().top<document.querySelector('.ar-four').getBoundingClientRect().top),'an area opens with its lines before the four questions');
await t.go('#/factory');
const area=p.locator('[data-setup-area="Hull › Packing hall"]');await area.waitFor();
const line=area.locator('.fac-line').filter({has:p.getByRole('link',{name:new RegExp(f.name)})});
ok(await line.count()===1 && await line.getByRole('link',{name:'Legacy misspelling'}).count()===1,'setup shows the machine under its line and area without opening every editor');
await line.getByRole('button',{name:'Edit line'}).click();
ok(await line.getByRole('form',{name:`Details for ${f.name}`,exact:true}).count()===1 && await line.locator('[data-machine="Legacy misspelling"]').count()===1,'one Edit opens this line’s fields and machines together');
await line.getByLabel("The line's name",{exact:true}).fill(`${f.name} draft`);
p.once('dialog',d=>d.dismiss());await line.getByRole('button',{name:'Done',exact:true}).click();
ok(await line.getByLabel("The line's name",{exact:true}).inputValue()===`${f.name} draft`,'leaving an edited line asks before discarding unsaved text');
await line.getByRole('button',{name:'Discard changes',exact:true}).click();
const machine=line.locator('[data-machine="Legacy misspelling"]');
await machine.getByRole('button',{name:'Edit machine',exact:true}).click();await p.getByRole('menuitem',{name:/^Rename/}).click();
await line.getByLabel("The machine's name — Legacy misspelling",{exact:true}).fill('Corrected machine');
await line.getByRole('button',{name:'Save',exact:true}).click();
await p.waitForFunction(async id=>(await (await import('/src/db.ts')).getWorkspace(id)).assets.includes('Corrected machine'),f.line);
ok(true,'a machine can be renamed directly in the setup hierarchy');
await line.getByLabel('Position of Corrected machine',{exact:true}).selectOption('0');
await p.waitForFunction(async id=>(await (await import('/src/db.ts')).getWorkspace(id)).assets.filter(n=>n!=='Whole line')[0]==='Corrected machine',f.line);
ok(true,'machine order is editable beside its name without opening another page');
await t.go(`#/lines/${f.line}/machine/Corrected%20machine`);
p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Remove from line',exact:true}).click();
await p.waitForURL(`**/#/lines/${f.line}?view=machines`);
await p.waitForFunction(async id=>!(await (await import('/src/db.ts')).getWorkspace(id)).assets.includes('Corrected machine'),f.line);
ok(await p.locator('[data-machine="Corrected machine"]').count()===0,'a name-only legacy machine can be removed from its own page');
await p.getByRole('button',{name:'Undo',exact:true}).click();
await p.locator('[data-machine="Corrected machine"]').waitFor();
const kept=await p.evaluate(async id=>({line:await (await import('/src/db.ts')).getWorkspace(id),study:await (await import('/src/db.ts')).getStudy('legacy-machine-history')}),f.line);
ok(kept.line.assets.filter(n=>n!=='Whole line')[0]==='Corrected machine' && kept.study.facts.turns[0].text==='Keep this historical record unchanged.','Undo restores the machine position and its recorded work remains intact');
await t.go(`#/lines/${f.line}`);
ok(await p.getByRole('button',{name:'Action tracker',exact:true}).count()===0,'the line has one Actions destination without a duplicate tracker shortcut');
await p.locator('.pl-problem-cards').waitFor();
ok(await p.locator('.pl-problem-cards .pl-row').count()>0,'problems are short cards opening the existing detail');
const out=process.env.UI_REVIEW_SHOTS;if(out)mkdirSync(out,{recursive:true});
for(const width of [360,820,1440]){
  await p.setViewportSize({width,height:1000});
  for(const [name,route] of [['factory','#/room'],['area',`#/area?site=${encodeURIComponent(f.site)}&area=${encodeURIComponent(f.packing)}`],['setup','#/factory'],['line',`#/lines/${f.line}`]]){
    await t.go(route);ok(await t.wide()<=1,`${name} fits ${width}px`);
    if(name==='line')ok(await p.locator('.pl-problem-cards .pl-row').evaluateAll(rows=>rows.every(row=>{const r=row.getBoundingClientRect(),s=row.querySelector('.preg-right')?.getBoundingClientRect();return !s || (s.left>=r.left && s.right<=r.right+1 && s.bottom<=r.bottom+1);})),`problem status and cost stay inside their cards at ${width}px`);
    if(out)await p.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
  }
}
await t.finish('Areas, lines and machines are ordered visibly; legacy machine removal and Undo work.');
