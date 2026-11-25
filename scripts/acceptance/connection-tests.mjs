/* Exercise the actual file URL form on Microsoft's connection page. Only the Microsoft account and
   hosted file responses are fixtures. OneDrive's real public response is covered by eval/link-real.mjs. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({width:390,height:844,args:['--disable-webgl','--disable-gpu']});
const { page } = t;
const own = 'https://example.sharepoint.com/:x:/s/Operations/private';
const file = readFileSync('public/sample/Plan-and-actual-October.xlsx');
const cors = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS','access-control-expose-headers':'x-link-name,x-link-kind'};
const requests = [];
try {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/functions/v1/link', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers:cors});
    const body = route.request().postDataJSON();
    assert.equal(body.url,own);
    requests.push(!!body.microsoftAccess);
    if (body.microsoftAccess !== 'demo-token') return route.fulfill({status:422,headers:cors,json:{code:'sign-in',why:'Private file'}});
    return route.fulfill({status:200,headers:{...cors,'x-link-name':'October.xlsx','x-link-kind':'zip','content-type':'application/octet-stream'},body:file});
  });
  await t.go('#/factory/data?ms=1',0);
  const box = page.getByRole('textbox',{name:'File URL'});
  await box.fill(own);
  await page.locator('[data-ms-page] [data-link-read]').click();
  await page.getByRole('button',{name:'Sign in and open file'}).waitFor();
  assert.equal(await box.inputValue(),own);
  assert.equal(await t.wide(),0);
  assert.equal(await page.title(),'Faultline');
  await page.evaluate(()=>localStorage.setItem('faultline.ms.session.fileLink',JSON.stringify({access:'demo-token',expiresAt:Date.now()+600000})));
  await page.reload();
  await box.fill(own);
  await page.locator('[data-ms-page] [data-link-read]').click();
  await page.waitForURL(/#\/ai/);
  await page.waitForFunction(()=>document.title==='Luna');
  await page.waitForFunction(async()=> (await (await import('/src/capabilities/data.ts')).allSources()).some(s=>s.facts.fileName==='October.xlsx' && s.facts.origin?.privateMicrosoft && s.facts.sheets?.length===3),undefined,{timeout:90000});
  assert.deepEqual(requests,[false,false,true]);
  await page.setViewportSize({width:1536,height:880});
  await t.go('#/factory/data?link=1',0);
  await page.locator('[data-link-page] [data-link-url]').waitFor();
  assert.equal(await page.title(),'Faultline');
  assert.equal(await t.wide(),0);
  console.log('PASS private URL sign-in handoff on phone, workbook in Luna with three worksheets and private origin, desktop link page and return title');
} finally { await t.browser.close(); }
