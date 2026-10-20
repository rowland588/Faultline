/* ACCEPTANCE — LINE TALK, SLICE 2: ASK IT (docs/LINE-TALK.md; Rowland,
 * 20 October: "a simple, reliable, ChatGPT-style manufacturing assistant
 * inside Faultline … talk or type naturally, ask questions … upload
 * photographs, and ask the assistant to produce useful reports").
 *
 * In a real browser, from an empty device, with Chromium's fake microphone,
 * the voice service and Line Talk's gateway (supabase/functions/assist, task
 * `talk`) both answered by the script — and every request read back:
 *
 *   1  started from the front door on a line with two machines and a
 *      critical problem; What Line Talk knows says them
 *   2  a piece said and heard, then Reply: the gateway asked with the words,
 *      the line's records (its machines, the problem as the register reads
 *      it) and today — no pictures; the answer drawn as a list, bold kept
 *   3  a follow-up typed and sent: the first answer goes with it as Line
 *      Talk's own turn
 *   4  two photos chosen from the phone (a gallery, not only the camera):
 *      labelled P1 and P2, their pictures sent as small JPEGs by label
 *   5  an answer not given — the gateway's words said, the question kept,
 *      Ask again answering in its place; the gateway down — said, and kept
 *   6  no signal: the question waits, and is answered when the signal comes
 *      back, by itself
 *   7  a line-walk report asked with a shortcut: the document's card, a
 *      figure it was not given said to check
 *   8  the document opened, edited where it stands (title, a caption, a point
 *      added with where it comes from, a photo taken out), kept after a
 *      reload; As Line Talk wrote it, and Undo
 *   9  saved as a PDF: the title, every point with where it comes from, the
 *      photo printed with its label and caption
 *  10  reloaded: the whole conversation as it was left; the line's page
 *      saying its answers and document; the phone — the shortcuts in one
 *      row, nothing off the side
 *   and no console error anywhere. */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
/* the gateway answering 500 is the script's own answer (5) */
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket|status of 500|Line Talk could not ask/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['microphone'], acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());

/* THE VOICE SERVICE, answered by the script */
await ctx.route('**/api/voice', r => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ transcript: 'the bagger film is wandering left about 62 a minute', fields: { said: 'The bagger film is wandering to the left, running at about 62 a minute.' } }) }));

/* LINE TALK'S GATEWAY, answered by the script: each request kept; what it answers set by the step */
const asks = [];
let plan = [];
const CORS = { 'access-control-allow-origin': '*' };
const answer = (a, extra = {}) => ({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, answer: a, unsure: [], model: 'test-model', ...extra }) });
await ctx.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift() ?? { a: { reply: 'Noted.' } };
  if (next.http) return r.fulfill({ status: next.http, contentType: 'text/plain', headers: CORS, body: 'upstream gone' });
  if (next.refuse) return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: next.refuse }) });
  return r.fulfill(answer(next.a, next.extra));
});

const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 300) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await page.waitForTimeout(150); } return false; };
const kinds = () => page.locator('.tk-turn').evaluateAll(els => els.map(e => e.getAttribute('data-kind')));
const replies = () => page.locator('.tk-turn.is-reply');
const lastReply = () => replies().last().innerText().catch(() => '');
const send = async text => { if (text !== undefined) await page.locator('.tk-type textarea').fill(text); await page.locator('.tk-send').click(); };
const dir = mkdtempSync(join(tmpdir(), 'line-talk-ask-'));

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const lineId = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const { addMachineToLine } = await import('/src/db/lineRecords.ts');
  await addMachineToLine(ws.id, 'Bagger', 'Ishida');
  await addMachineToLine(ws.id, 'Checkweigher', 'Ishida');
  const t = Date.now();
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws.id, problem: 'Guard on the infeed bent', priority: 'critical', targetAsset: 'Checkweigher', owner: 'Dave', status: 'open', raisedAt: t - 3 * 86_400_000, updatedAt: t, media: [] });
  return ws.id;
});

/* 1 — started from the front door, on the line */
await page.goto(`${BASE}/#/`); await settle(1500);
ok(/^Start a Line Talk$/.test((await page.locator('.fd-talk .fd-talk-start').innerText()).trim()), '1 the front door offers Line Talk first: start one');
await page.locator('.fd-talk .fd-talk-start').click(); await settle(800);
await page.locator('select[aria-label="Which line"]').selectOption(lineId);
await page.locator('.tk-new .tk-start').click(); await settle(1200);
const talkId = page.url().match(/#\/talk\/([^?]+)/)?.[1];
ok(!!talkId, '1 a talk started on the line', page.url());
ok(await waitFor(async () => /^What Line Talk knows — Line 7: 2 machines · 1 open problem · 0 programs to prove · 0 tool findings · 0 jobs$/.test((await page.locator('.tk-knows summary').innerText().catch(() => '')).trim())), '1 what Line Talk knows, said', await page.locator('.tk-knows summary').innerText().catch(() => ''));
ok((await page.locator('.tk-send').innerText()).trim() === 'Reply' && await page.locator('.tk-send').isDisabled(), '1 nothing to answer yet — Reply waits');

/* 2 — said, heard, Reply */
plan.push({ a: { reply: 'You said the bagger film is wandering left.\n- Check the film **tension** on the Bagger\n- The guard problem on the Checkweigher is still open, owned by Dave' } });
await page.locator('.tk-bar .tk-talk').click();
await waitFor(async () => (await page.locator('.tk-bar .tk-talk').innerText()).startsWith('Pause'), 5000);
await page.waitForTimeout(2200);
await page.locator('.tk-bar .tk-talk').click();
ok(await waitFor(async () => /The bagger film is wandering to the left/.test(await page.locator('.tk-turn[data-kind=said] .tk-words').innerText().catch(() => ''))), '2 a piece said and heard');
ok(await waitFor(async () => !(await page.locator('.tk-send').isDisabled())) && (await page.locator('.tk-send').innerText()).trim() === 'Reply', '2 Reply, for what was said');
await send();
ok(await waitFor(async () => /Check the film tension on the Bagger/.test(await lastReply())), '2 answered', await lastReply());
const a2 = asks[0];
ok(a2?.task === 'talk' && a2.turns.length === 1 && a2.turns[0].kind === 'said' && /bagger film is wandering/.test(a2.turns[0].text), '2 asked with what was said', JSON.stringify(a2?.turns));
ok(/PRODUCTION LINE: Line 7/.test(a2?.context ?? '') && /Machines in flow order: Bagger \(Ishida\) → Checkweigher \(Ishida\)/.test(a2.context) && /- Critical · Guard on the infeed bent — Checkweigher · Open · 3 days · owner Dave/.test(a2.context), '2 with the line’s records — its machines, the problem as the register reads it', a2?.context);
const todayLong = await page.evaluate(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
ok(a2?.today === todayLong, '2 and today', `${a2?.today} | ${todayLong}`);
ok(Array.isArray(a2?.images) && a2.images.length === 0, '2 no pictures — none taken');
ok(await replies().last().locator('.tk-ans li').count() === 2 && (await replies().last().locator('.tk-ans b').innerText()) === 'tension', '2 the answer drawn as it was written — a list, bold kept');

/* 3 — a follow-up, with the answer before it */
plan.push({ a: { reply: 'Dave owns the guard; you have not said a date for it.' } });
await send('Who owns the guard problem?');
ok(await waitFor(async () => /Dave owns the guard/.test(await lastReply())), '3 a follow-up answered');
const a3 = asks[1];
ok(JSON.stringify(a3?.turns.map(t => t.kind)) === JSON.stringify(['said', 'reply', 'typed']) && /Check the film \*\*tension\*\*/.test(a3.turns[1].text) && a3.turns[2].text === 'Who owns the guard problem?', '3 asked with the conversation so far — its own answer as its own', JSON.stringify(a3?.turns.map(t => [t.kind, t.text.slice(0, 40)])));

/* 4 — two photos from the phone's photos */
const input = page.locator('.tk-bar input[type=file]');
ok(await input.getAttribute('capture') === null && await input.getAttribute('multiple') !== null, '4 Photo offers the phone’s photos as well as its camera, several at once');
const jpeg = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = '#b33'; g.fillRect(0, 0, 1600, 1200); g.fillStyle = '#fff'; g.font = '160px sans-serif'; g.fillText('GUARD', 380, 650); return c.toDataURL('image/jpeg', 0.95).split(',')[1]; }), 'base64');
const png = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 640; c.height = 480; const g = c.getContext('2d'); g.fillStyle = '#2a6'; g.fillRect(0, 0, 640, 480); return c.toDataURL('image/png').split(',')[1]; }), 'base64');
await input.setInputFiles([{ name: 'guard.jpg', mimeType: 'image/jpeg', buffer: jpeg }, { name: 'film.png', mimeType: 'image/png', buffer: png }]);
ok(await waitFor(async () => await page.locator('.tk-turn[data-kind=photo] img.tk-photo-i').count() === 2), '4 both in the conversation');
ok(JSON.stringify(await page.locator('.tk-turn[data-kind=photo] .tk-label').allInnerTexts()) === '["P1","P2"]', '4 labelled P1 and P2, in the order taken');
plan.push({ a: { reply: 'P1 shows a guard; I cannot tell from the picture how bent it is.' } });
await send('What do you see in P1?');
ok(await waitFor(async () => /P1 shows a guard/.test(await lastReply())), '4 asked about a photo — answered');
const a4 = asks[2];
ok(JSON.stringify(a4?.images.map(i => i.photo)) === '["P1","P2"]' && a4.images.every(i => i.data.startsWith('/9j/') && i.data.length * 0.75 <= 450 * 1024), '4 their pictures sent as small JPEGs, by label', JSON.stringify(a4?.images.map(i => [i.photo, i.data.slice(0, 4), i.data.length])));
ok(a4?.turns.filter(t => t.kind === 'photo').map(t => t.photo).join() === 'P1,P2', '4 and each in the conversation by its label');

/* 5 — not answered, asked again; the gateway down */
plan.push({ refuse: 'Line Talk is busy — ask again in a minute. What you said is kept.' });
await send('Anything else on the checkweigher?');
ok(await waitFor(async () => /Not answered — Line Talk is busy — ask again in a minute\. What you said is kept\./.test(await lastReply())), '5 an answer not given says why');
ok((await kinds()).filter(k => k === 'typed').length === 3, '5 the question kept');
const repliesBefore = await replies().count();
plan.push({ a: { reply: 'Nothing else was said about the checkweigher.' } });
await replies().last().locator('button', { hasText: 'Ask again' }).click();
ok(await waitFor(async () => /Nothing else was said about the checkweigher/.test(await lastReply())), '5 Ask again — answered');
ok(await replies().count() === repliesBefore, '5 in its place — no second answer to the one question');
plan.push({ http: 500 });
await send('And the bagger jaws?');
ok(await waitFor(async () => /Not answered — Line Talk could not answer just now — ask again\. What you said is kept\./.test(await lastReply())), '5 the gateway down — said, and the question kept');
plan.push({ a: { reply: 'You have not said anything about the jaws yet.' } });
await replies().last().locator('button', { hasText: 'Ask again' }).click();
ok(await waitFor(async () => /not said anything about the jaws/.test(await lastReply())), '5 and asked again');

/* 6 — no signal: waits, answered when it comes back */
await ctx.setOffline(true);
const asked6 = asks.length;
await send('Is the case packer on the list?');
ok(await waitFor(async () => /No signal — it is answered when the signal comes back\. What you said is kept\./.test(await lastReply())), '6 no signal — it waits, and says so');
ok(asks.length === asked6, '6 nothing sent');
plan.push({ a: { reply: 'You have not mentioned the case packer.' } });
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
ok(await waitFor(async () => /not mentioned the case packer/.test(await lastReply())), '6 answered when the signal comes back, by itself');

/* 7 — a line-walk report, asked with a shortcut */
const chip = page.locator('.tk-chip', { hasText: 'Line-walk report' });
ok(await page.locator('.tk-chip').count() === 4, '7 four shortcuts to the usual documents');
await chip.click();
const asked7 = (await page.locator('.tk-type textarea').inputValue()).trim();
ok(/^Write a line-walk report/.test(asked7), '7 a shortcut is only words in the box', asked7);
plan.push({ a: { reply: 'Here is the line-walk report, with P1 and P2 beside what they show.', document: { title: 'Line 7 — walk', kind: 'line-walk', sections: [
  { heading: 'What was seen', text: 'A walk from the bagger to the checkweigher.', points: [
    { text: 'The bagger film is wandering to the left, at about 62 a minute.', basis: 'observed', owner: '', due: '' },
    { text: 'Guard on the infeed bent — critical, owner Dave.', basis: 'record', owner: 'Dave', due: '' },
    { text: 'The film may be about 15 mm off centre.', basis: 'interpretation', owner: '', due: '' },
  ], photos: [{ photo: 'P1', caption: 'The infeed guard' }, { photo: 'P2', caption: 'The bagger film' }] },
] } }, extra: { unsure: ['15'] } });
await send();
ok(await waitFor(async () => /LINE-WALK REPORT[\s\S]*Line 7 — walk[\s\S]*1 section · 2 photos/.test(await page.locator('.tk-doc').last().innerText().catch(() => ''))), '7 the document’s card', await page.locator('.tk-doc').last().innerText().catch(() => ''));
ok(/^Check before you use it: 15 is not in what was said or in Faultline’s records\.$/.test((await replies().last().locator('.tk-unsure').innerText().catch(() => '')).trim()), '7 a figure it was not given — said, to check');
ok((asks.at(-1)?.turns.at(-1)?.text ?? '') === asked7, '7 asked in the shortcut’s words');

/* 8 — opened, edited where it stands, kept */
await page.locator('.tk-doc button', { hasText: 'Open' }).last().click(); await settle(800);
ok(/\?doc=/.test(page.url()) && await page.locator('.tk-docv').count() === 1, '8 the document opened', page.url());
ok(await page.locator('.tk-docv .tk-unsure').count() === 1, '8 the figure to check, said on it too');
await page.locator('.tk-dtitle').fill('Line 7 — morning walk');
await page.locator('input[aria-label="Caption for P1"]').fill('The infeed guard, bent where the bags catch');
await page.locator('.tk-dsec').first().locator('button', { hasText: 'Add a point' }).click();
const added = page.locator('.tk-dsec').first().locator('.tk-dpt').last();
await added.locator('textarea').fill('Dave to fit the new guard.');
await added.locator('select').selectOption('record');
await page.locator('.tk-dph[data-photo=P2] button', { hasText: 'Take the photo out' }).click();
ok(await waitFor(async () => /Kept/.test(await page.locator('.tk-dacts').innerText())), '8 kept as it is changed');
await page.reload(); await settle(1500);
ok(await page.locator('.tk-dtitle').inputValue() === 'Line 7 — morning walk' && await page.locator('input[aria-label="Caption for P1"]').inputValue() === 'The infeed guard, bent where the bags catch', '8 reloaded: the edits kept');
ok(await page.locator('.tk-dpt').count() === 4 && await page.locator('.tk-dph').count() === 1, '8 the point added and the photo taken out, kept');
const stored = await page.evaluate(async id => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); const r = s.facts.turns.find(t => t.doc); return { first: r.docFirst?.title, now: r.doc.title, basis: r.doc.sections[0].points[3]?.basis }; }, talkId);
ok(stored.first === 'Line 7 — walk' && stored.now === 'Line 7 — morning walk' && stored.basis === 'record', '8 what Line Talk first wrote kept beside it; the point says where it comes from', JSON.stringify(stored));
await page.locator('button', { hasText: 'As Line Talk wrote it' }).click();
ok(await waitFor(async () => await page.locator('.tk-dtitle').inputValue() === 'Line 7 — walk'), '8 As Line Talk wrote it');
await page.locator('.undo-toast button, .undo button, button', { hasText: 'Undo' }).first().click();
ok(await waitFor(async () => await page.locator('.tk-dtitle').inputValue() === 'Line 7 — morning walk'), '8 and Undo');
await page.waitForTimeout(900);

/* 9 — on paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator('button', { hasText: 'Save as PDF' }).click()]);
const file = join(dir, dl.suggestedFilename());
await dl.saveAs(file);
const txt = pdfText(file);
const bytes = readFileSync(file).toString('latin1');
ok(/Line 7 — morning walk/.test(txt) && /LINE-WALK REPORT/i.test(txt), '9 the PDF: its title and what it is', txt.slice(0, 300));
ok(/OBSERVED[\s\S]*The bagger film is wandering[\s\S]*FAULTLINE RECORD[\s\S]*Guard on the infeed bent[\s\S]*ASSESSMENT[\s\S]*15 mm[\s\S]*FAULTLINE RECORD[\s\S]*Dave to fit the new guard/.test(txt), '9 every point with where it comes from', txt);
ok(/P1 ·[^\n]*— The infeed guard, bent where the bags catch/.test(txt) && (bytes.match(/\/Subtype\s*\/Image/g) ?? []).length === 1, '9 the photo printed, with its label and caption — the one taken out not', txt);
ok(/Owner: Dave/.test(txt), '9 an owner where one was said');

/* 10 — reloaded; the line's page; the phone */
await page.locator('button', { hasText: 'Back to the talk' }).click(); await settle(800);
const before = await kinds();
await page.reload(); await settle(1500);
ok(JSON.stringify(await kinds()) === JSON.stringify(before) && before.filter(k => k === 'reply').length === 7, '10 reloaded: the conversation as it was left — every answer', JSON.stringify(before));
ok(/7 answers · 1 document/.test(await page.locator('.tk-sum').innerText()), '10 the talk in a line counts its answers and its document', await page.locator('.tk-sum').innerText());
await page.goto(`${BASE}/#/lines/${lineId}`); await settle(1200);
ok(/7 answers · 1 document/.test(await page.locator('.pl-tool', { hasText: 'Line Talk' }).innerText()), '10 the line’s page says them', await page.locator('.pl-tool', { hasText: 'Line Talk' }).innerText());
await page.setViewportSize({ width: 390, height: 780 });
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1500);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '10 the phone: nothing off the side', `${wide}px`);
const tops = await page.locator('.tk-chip').evaluateAll(els => [...new Set(els.map(e => Math.round(e.getBoundingClientRect().top)))]);
ok(tops.length === 1, '10 the phone: the shortcuts in one row — the conversation keeps the screen', JSON.stringify(tops));
ok(await page.locator('.tk-send').isVisible() && await page.locator('.tk-bar .tk-photo').isVisible() && await page.locator('.tk-bar .tk-talk').isVisible(), '10 the phone: Talk, Photo and Reply in reach');

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
