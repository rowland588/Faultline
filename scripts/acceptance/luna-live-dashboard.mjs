// Two versions of a real synthetic Excel workbook. No model, network account or factory records.
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = await mkdtemp(join(tmpdir(), 'luna-live-'));
const t = await openApp({width:1440,height:900,serviceWorkers:'allow',args:['--disable-gpu','--disable-webgl']});
const {page,ok} = t;
page.on('pageerror',e=>console.error(e.stack));
try {
  await t.seed();
  const cid = 'live-excel-fixture';
  await page.evaluate(async id => {
    const {putStudy} = await import('/src/db.ts');
    const {newConversation} = await import('/src/colleague/conversation.ts');
    await putStudy(newConversation({id,at:Date.now(),name:'Daily packing'}));
  },cid);
  let remoteBytes;
  let offline = false;
  let linkReads = 0;
  await page.route('**/functions/v1/link',r=>{
    linkReads++;
    if(offline)return r.abort('internetdisconnected');
    return r.fulfill({headers:{'content-type':'application/octet-stream','x-link-name':'Packing.xlsx','access-control-expose-headers':'x-link-name'},body:remoteBytes});
  });
  const register = async (version, sameClient = true) => {
    const path = join(dir,version+'.xlsx');
    execFileSync('node',['scripts/workbook/make-marked-workbook.mjs',path,...(version==='first'?[]:['--later'])]);
    const content = await readFile(path);
    if(version === 'first' || version === 'remote')remoteBytes = content;
    const expected = JSON.parse(await readFile(path+'.expected.json','utf8')).byShift.Nights;
    if(version==='remote')return {expected};
    const bytes = content.toString('base64');
    const result = await page.evaluate(async ({cid,version,sameClient,bytes})=>{
      const {workbooks} = await import('/src/lib/workbook/client.ts');
      const {registerFile} = await import('/src/capabilities/data.ts');
      const {activeClientNow} = await import('/src/lib/activeClient.ts');
      const file = new File([Uint8Array.from(atob(bytes),c=>c.charCodeAt(0))],'Packing.xlsx');
      const fileId = 'wb-tracking-'+version;
      await workbooks().read(fileId,file.name,file);
      const {fingerprint}=await import('/src/lib/fileLink/link.ts');
      const now=Date.now();
      const client=sameClient ? (await activeClientNow()).client : 'Separate fixture business';
      const source=await registerFile({conversationId:cid,now},{fileId,fileName:file.name,kind:'workbook',bytes:file.size,status:'ready',client,
        origin:version==='first' ? undefined : {kind:'link',url:'https://example.invalid/tracking/Packing.xlsx',service:'web',said:'Packing',host:'example.invalid',path:'/tracking/Packing.xlsx',hash:await fingerprint(file),modifiedAt:now,checkedAt:now}});
      return source.id;
    },{cid,version,sameClient,bytes});
    return {id:result,expected};
  };
  const first=await register('first');
  await page.evaluate(async ({cid,source})=>{
    const {patchStudy}=await import('/src/db.ts');
    const {runCall}=await import('/src/capabilities/registry.ts');
    const ctx={conversationId:cid,now:Date.now()};
    const result=await runCall(ctx,{id:'get',name:'query_data',input:{title:'Packing variance by shift',source,sheet:'Shift report',groupBy:['Shift'],measures:[{op:'sum',column:'Variance £'}]}},{confirmed:true});
    if(!result.ok)throw new Error(result.why);
    const chart=await runCall(ctx,{id:'draw',name:'make_chart',input:{title:'Packing variance by shift',resultId:result.data.resultId,type:'bar',unit:'GBP'}},{confirmed:true});
    if(!chart.ok)throw new Error(chart.why);
    await patchStudy(cid,s=>({facts:{...s.facts,turns:[
      {id:'ask',who:'Fixture',kind:'typed',at:ctx.now,text:'Show variance by shift as a chart'},
      {id:'graph',who:'Luna',kind:'reply',at:ctx.now+1,text:'Here is shift variance.',used:[{callId:'get',name:'query_data',status:'done',kind:'read',at:ctx.now,title:'Read shift variance',says:result.says,refs:result.refs},{callId:'draw',name:'make_chart',status:'done',kind:'local',at:ctx.now,title:'Draw the chart',says:chart.says,refs:chart.refs}]}
    ]}}));
  },{cid,source:first.id});
  let requests=0;
  await page.route('**/functions/v1/assist',r=>{requests++;return r.abort();});
  await t.go('#/ai?c='+cid);
  const ask=async words=>{await page.locator('.ai-box').fill(words);await page.getByRole('button',{name:'Send',exact:true}).click();};
  await ask('Turn that graph into an HTML dashboard');
  const offer=page.getByRole('button',{name:'Yes, track changes'});
  await offer.waitFor();
  ok(await page.getByText(/Do you want this dashboard to track changes/).count()===1,'Luna asks before tracking the workbook');
  const preview=page.locator('[data-artifact-preview]');
  const frame=page.frameLocator('[data-artifact-preview]');
  const value=async()=>Number((await frame.locator('.values tr').filter({has:frame.getByText('Nights',{exact:true})}).locator('td').last().textContent()).replace(/[^0-9.-]/g,''));
  const awaitValue=async n=>{await frame.getByText('Nights',{exact:true}).last().waitFor({state:'attached'});for(let i=0;i<45;i++){try{if(Math.abs(await value()-n)<0.001)return true;}catch{}await page.waitForTimeout(300);}return false;};
  ok(await awaitValue(first.expected),'The original dashboard matches the first workbook');
  await ask('Yes');
  await page.getByText(/Paste a link to the original Excel workbook/).waitFor();
  ok(!await page.getByRole('button',{name:'Download live HTML'}).count(),'A one-time upload asks for the original file link before enabling live tracking');
  await ask('https://example.invalid/tracking/Packing.xlsx');
  await page.getByRole('button',{name:'Download live HTML'}).waitFor();
  ok(!await offer.count(),'A conversational Yes enables tracking and clears the choice');
  await register('foreign',false);
  await page.getByRole('button',{name:'Refresh now'}).click();
  await page.getByText(/Live · Checked/).waitFor();
  ok(await awaitValue(first.expected),'A newer copy at the same URL belonging to another customer is excluded');
  const later=await register('remote');
  const beforeReads=linkReads;
  await page.evaluate(()=>{
    const now=Date.now.bind(Date);
    Date.now=()=>now()+360000;
    window.dispatchEvent(new Event('focus'));
  });
  ok(await awaitValue(later.expected) && first.expected!==later.expected && linkReads>beforeReads,`A changed Excel file at the original URL updates Nights from ${first.expected} to ${later.expected}`);
  await ask('Turn that graph into an HTML dashboard');
  await page.getByText(/already tracking its source in Artifacts/).waitFor();
  ok(await awaitValue(later.expected),'Requesting the dashboard again opens the live figures without quoting the old graph');
  offline=true;
  await page.getByRole('button',{name:'Refresh now'}).click();
  await page.getByText(/Showing the last saved data/).waitFor();
  ok(await awaitValue(later.expected),'When the source is unavailable, the last checked result stays visible');
  offline=false;
  await page.getByRole('button',{name:'Refresh now'}).click();
  await page.getByText(/Live · Checked/).waitFor();
  const id=await preview.getAttribute('data-artifact-preview');
  const dl=page.waitForEvent('download'); await page.getByRole('button',{name:'Download live HTML'}).click();
  const file=await dl; const html=await readFile(await file.path(),'utf8');
  ok(html.includes(encodeURIComponent('artifact:'+id)) && html.includes('http-equiv="refresh"') && !html.includes('access_token'),'Downloaded live HTML opens the same authenticated dashboard');
  await ask('Stop tracking this dashboard');
  await page.getByText('I’ll keep this version as a snapshot in Artifacts.').waitFor();
  await page.getByRole('button',{name:'Download HTML',exact:true}).waitFor();
  ok(await awaitValue(later.expected) && requests===0,'Stopping tracking keeps the latest verified values without an AI call');
} finally { await rm(dir,{recursive:true,force:true}); }
await t.finish('Luna follows the connected source from the saved HTML dashboard.');
