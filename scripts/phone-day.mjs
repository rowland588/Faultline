/* THE PHONE DAY — Rowland's day, replayed on a phone:
     1 type the result and pocket the phone WITHOUT leaving the box — is it saved?
     2 the test has a day and a result but no verdict — is it hidden as "next up"?
     3 does the app now ASK, and does answering settle it everywhere?          */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE='http://127.0.0.1:5191', REF='testproj';
const SESSION={access_token:'smoke',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+31536000,refresh_token:'smoke',
 user:{id:'11111111-1111-1111-1111-111111111111',aud:'authenticated',role:'authenticated',email:'smoke@example.com',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await ctx.route('**://*.supabase.co/**',r=>r.abort());
await ctx.addInitScript(([k,s])=>{try{localStorage.setItem(k,JSON.stringify(s));}catch{}},[`sb-${REF}-auth-token`,SESSION]);
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
page.on('console',m=>{if(m.type()==='error'&&!/Supabase|net::ERR|Failed to fetch|DevTools/i.test(m.text()))errs.push('console: '+m.text().slice(0,200));});
const out=[]; const say=(ok,w,x='')=>{out.push(`${ok?'ok  ':'FAIL'}  ${w}${x?' — '+x:''}`); if(!ok) process.exitCode=1;};
await page.goto(`${BASE}/#/`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2500);
const s=await page.evaluate(async()=>(await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID=s.projectId;
const stored = async (id) => page.evaluate(async id => (await (await import('/src/db/testing.ts')).listTests(await (async()=>{const t=(await (await import('/src/db/core.ts')).getDB()); return (await t.get('tests', id))?.projectId;})())).find(t=>t.id===id), id);

/* a test planned for today, never touched — his "Run at 70 ppm" before the day */
const TID = await page.evaluate(async pid => {
  const { putTest } = await import('/src/db/testing.ts');
  await putTest({ id:'v-1', projectId: pid, kind:'test', title:'Run at 70 ppm on Wednesday', passesIf:'70 packs per min 98%',
    plannedFor:'2026-09-24', withWhom:'Brilopak', outcome:'planned', sort: 50, createdAt: Date.now(), updatedAt: Date.now() });
  return 'v-1';
}, PID);

/* ---- 1 · TYPE, THEN POCKET THE PHONE ---- */
await page.goto(`${BASE}/#/project/${PID}/testing/${TID}`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1200);
const box = page.locator('label:has(span:text-is("What happened")) textarea');
await box.scrollIntoViewIfNeeded();
await box.click();
await page.keyboard.type('Started at 73% performance, achieved 90% over a 97 min run');
/* the phone locks: no blur, the page just goes hidden */
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(300);
const afterHide = await page.evaluate(async id => (await (await import('/src/db/core.ts')).getDB()).get('tests', id), TID);
say(afterHide?.result?.startsWith('Started at 73%') === true, 'the result is in IndexedDB the moment the phone goes to sleep — no blur needed', JSON.stringify(afterHide?.result?.slice(0,40)));
say(afterHide?.result === 'Started at 73% performance, achieved 90% over a 97 min run', 'and it is the whole sentence');

/* the caret did not jump: the box still shows what was typed, with focus */
const still = await box.evaluate(el => ({ v: el.value, focused: document.activeElement === el }));
say(still.focused && still.v.endsWith('97 min run'), 'the box kept its text and its focus while it saved');

/* ---- also: a beat after typing, with no event at all ---- */
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
await page.keyboard.type(' — two crash stops');
await page.waitForTimeout(1100);
const afterIdle = await page.evaluate(async id => (await (await import('/src/db/core.ts')).getDB()).get('tests', id), TID);
say(afterIdle?.result?.endsWith('two crash stops') === true, 'a beat after the last keystroke it is written anyway');

/* ---- 2 · NO VERDICT: is it still filed as next up? ---- */
await page.locator('label:has(span:text-is("On the day")) input').fill('2026-09-24');
await page.waitForTimeout(500);
const ask = page.locator('.tw-ask');
say(await ask.count() === 1, 'the test screen now ASKS', await ask.innerText().catch(()=>'-'));
say((await ask.innerText()) === 'Did it pass?', 'in the face’s own words');

await page.goto(`${BASE}/#/project/${PID}/testing`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1200);
const nextUp = await page.locator('.tw-next').allInnerTexts();
say(!nextUp.some(t => t.includes('Run at 70 ppm')), 'it is NOT under Next up any more', `${nextUp.length} next up`);
const strip = page.locator('.tw-verdicts');
say(await strip.count() === 1, 'the list opens with the question', (await strip.locator('h2').innerText().catch(()=>'-')));
say((await strip.innerText()).includes('Started at 73%'), 'and shows what was written, not "Not run yet"');
const done = await page.locator('.tw-row').allInnerTexts();
say(done.some(t => t.includes('No verdict yet')), 'and the record reads "No verdict yet" where it is filed', done.find(t=>t.includes('No verdict'))?.slice(0,60));

/* ---- 3 · ANSWER IT ---- */
await strip.locator('.tw-seg-b.is-failed').first().click();
await page.waitForTimeout(900);
say(await page.locator('.tw-verdicts').count() === 0, 'answered from the list, the question goes');
const now = await page.evaluate(async id => (await (await import('/src/db/core.ts')).getDB()).get('tests', id), TID);
say(now?.outcome === 'failed', 'and the verdict is on the record', now?.outcome);
const rows = await page.locator('.tw-row').allInnerTexts();
say(rows.some(t => t.includes('Didn’t pass') && t.includes('Started at 73%')), 'which now reads as a result under what happened');

console.log(out.join('\n'));
console.log(errs.length?'\nERRORS:\n'+errs.join('\n'):'\nno console errors');
if(errs.length) process.exitCode=1;
await b.close();
