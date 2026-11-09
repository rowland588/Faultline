/* ACCEPTANCE — THE BRIEF (8 November, docs/STORY.md §7, S6–S9; screens/StoryBrief, lib/storyAsks, tools/story/briefText and
 * briefAsk — Rowland: "if a brief is available to upload, allow a brief to be uploaded … any information within the tools … assign
 * it directly to the brief … If we can build it with code, of course, build it with code … if I don't have a brief … nothing
 * happens, nothing builds."). Driven in a real browser on the smoke seed's story (the factory's, brief "Why is Line 7 losing
 * output?"), the gateway answered by the script:
 *
 *   1  no brief — the brief taken off: "No brief yet" in one line, the four figures and Run an update as before
 *   2  a .txt uploaded: kept on the device as media named on the story, read in code into the box, Use this as the brief
 *   3  a PDF with a text layer (made by pdf-lib) read as text in code; a .docx (made with fflate) read by mammoth
 *   4  a photo: no text to read by rules — offered to the assistant (brief-read, the picture sent), its words in the box, used,
 *      said "read by the assistant"
 *   5  Split the brief into asks (brief-asks): each with its quoted sentence, one unticked, one put right, Keep these — two asks,
 *      kept after a reload
 *   6  an ask typed; moved up; deleted and brought back with Undo
 *   7  the evidence by rules: the Line 7 ask's counts equal its lists, its found rows opening the register; a chip picked
 *   8  Also found — a record answering no ask assigned to one with a tap, gone from Also found
 *   9  the papers by ask (S9): Run an update — the asks in the request to the assistant and a paragraph an ask in the draft; Approve —
 *      the report read back with Ask 1's section (Asked · Found · Being done · Proved · Still to show); the slides with an ask's slide
 *  10  the phone: nothing off the side, the asks there
 *  11  no story yet: Upload a brief on Start the story — the story started, the file read in code into the box, used
 *
 *   node scripts/acceptance/story-brief.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { zipSync, strToU8 } from 'fflate';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();

/* THE GATEWAY, answered by the script */
const asks = [];
const CORS = { 'access-control-allow-origin': '*' };
const PHOTO_WORDS = 'Northfield Foods — the brief.\nWhy is Line 7 losing output on nights? What does a changeover on the wrapper cost us? Are the packers safe at the case packer?';
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const reply = o => r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(o) });
  if (body.task === 'brief-read') return reply({ ok: true, text: PHOTO_WORDS });
  if (body.task === 'brief-asks') return reply({ ok: true, asks: [
    { text: 'Why is Line 7 losing output on nights?', from: 'Why is Line 7 losing output on nights?' },
    { text: 'What does a wrapper changeover cost?', from: 'What does a changeover on the wrapper cost us?' },
    { text: 'Are the packers safe?', from: 'Are the packers safe at the case packer?' },
  ] });
  return reply({ ok: false, why: 'The assistant is not asked in this script — the chapter is written from the records’ words.' });
});

const brief = () => page.locator('[data-story-brief]');
const fileIn = () => page.locator('[data-story-brief-file-input]');
const storyRec = () => page.evaluate(async () => { const db = await import('/src/db.ts'); return (await db.listAllStudies()).find(s => s.tool === 'story' && !s.deletedAt); });
const useIt = async () => { await brief().getByRole('button', { name: 'Use this as the brief' }).click(); await page.waitForTimeout(900); };
const upload = async (name, mimeType, buffer) => { await fileIn().setInputFiles({ name, mimeType, buffer }); await page.waitForFunction(() => !document.querySelector('[data-story-brief-busy]'), null, { timeout: 30000 }).catch(() => undefined); await page.waitForTimeout(600); };

/* ---- 1 · no brief ---- */
await t.go('#/', 3000);
ok(/Why is Line 7 losing output\?/.test(await t.words('[data-story-brief-text]')), '1 the brief shown under its heading');
await brief().getByRole('button', { name: 'Change it' }).click();
await brief().locator('textarea').fill('');
await brief().getByRole('button', { name: 'Keep the brief' }).click(); await page.waitForTimeout(900);
ok(/^No brief yet — the story works on the records alone\.$/.test(await t.words('[data-story-no-brief]')), '1 no brief: said in one line');
ok((await page.locator('.st-tiles .ln-tile').count()) === 4 && (await page.getByRole('button', { name: 'Run an update' }).isEnabled()), '1 the four figures and Run an update as before — nothing waits on a brief');
ok(/No brief yet/.test(await t.words('.pace-lede')), `1 the header says no brief: "${await t.words('.pace-lede')}"`);

/* ---- 2 · a text file ---- */
await upload('brief.txt', 'text/plain', Buffer.from('﻿Why is Line 7 losing output in the packing hall?\r\n\r\n\r\nAnd what would it take to hit 60 a minute?  '));
ok((await brief().locator('[data-story-brief-box]').inputValue()) === 'Why is Line 7 losing output in the packing hall?\n\nAnd what would it take to hit 60 a minute?', '2 a .txt read in code into the box to check');
await useIt();
ok(/packing hall\?/.test(await t.words('[data-story-brief-text]')) && /From brief\.txt · .* · read as text in the app/.test(await t.words('[data-story-brief-file]')), `2 used as the brief, the file named: "${await t.words('[data-story-brief-file]')}"`);
{
  const s = await storyRec();
  const kept = await page.evaluate(async k => { const db = await import('/src/db.ts'); const b = await db.getBlob(k); return b ? b.size : 0; }, s.agreed.story.briefFile?.mediaId ?? '');
  ok(s.agreed.story.briefFile?.name === 'brief.txt' && s.agreed.story.briefFile.readBy === 'code' && kept > 0, `2 the file kept as media on the device, named on the story (${kept} bytes)`);
}

/* ---- 3 · a PDF and a Word file, read in code ---- */
{
  const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica);
  const p = pdf.addPage([595, 842]);
  p.drawText('Brief for the packing hall review', { x: 50, y: 780, size: 16, font });
  p.drawText('Why does the wrapper on Line 7 stop so often?', { x: 50, y: 740, size: 12, font });
  p.drawText('What does a changeover cost the site each week?', { x: 50, y: 720, size: 12, font });
  await upload('Brief.pdf', 'application/pdf', Buffer.from(await pdf.save()));
  const v = await brief().locator('[data-story-brief-box]').inputValue().catch(() => '');
  ok(/Why does the wrapper on Line 7 stop so often\?/.test(v) && /changeover cost the site each week/.test(v), `3 a PDF read by its text layer in code: "${v.replace(/\n/g, ' / ').slice(0, 90)}"`);
  ok(!asks.length, '3 nothing sent to the assistant for a PDF with text');
  await useIt();
  ok(/From Brief\.pdf · .* · read as text in the app/.test(await t.words('[data-story-brief-file]')), '3 the PDF used as the brief');

  const ct = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const doc = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>The brief from Northfield Foods.</w:t></w:r></w:p><w:p><w:r><w:t>Why are the labels skewing on nights?</w:t></w:r></w:p></w:body></w:document>';
  const docx = zipSync({ '[Content_Types].xml': strToU8(ct), '_rels/.rels': strToU8(rels), 'word/document.xml': strToU8(doc) });
  await upload('brief.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from(docx));
  const w = await brief().locator('[data-story-brief-box]').inputValue().catch(() => '');
  ok(/The brief from Northfield Foods\.\s+Why are the labels skewing on nights\?/.test(w), `3 a .docx read by mammoth in code: "${w.replace(/\n/g, ' / ')}"`);
  await brief().getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(400);
  ok(/From Brief\.pdf/.test(await t.words('[data-story-brief-file]')), '3 Cancel leaves the brief as it was');
}

/* ---- 4 · a photo, offered to the assistant ---- */
{
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 300); g.fillStyle = '#000'; g.font = '20px sans-serif'; g.fillText('Why is Line 7 losing output?', 20, 60); return c.toDataURL('image/png').split(',')[1]; });
  await upload('IMG_2041.png', 'image/png', Buffer.from(png, 'base64'));
  ok(/no text in it to read by rules/.test(await t.words('[data-story-brief-offer]')) && (await brief().getByRole('button', { name: /Read it with the assistant/ }).count()) === 1, '4 a photo: said it cannot be read by rules, the assistant offered (said as AI)');
  ok(/uses AI/.test(await t.words('[data-story-brief-offer]')), '4 the offer says it uses AI');
  await brief().getByRole('button', { name: /Read it with the assistant/ }).click();
  await page.waitForFunction(() => document.querySelector('[data-story-brief-box]')?.value?.includes('Northfield'), null, { timeout: 8000 }).catch(() => undefined);
  const sent = asks.find(a => a.task === 'brief-read');
  ok(!!sent && Array.isArray(sent.pages) && sent.pages.length === 1 && sent.pages[0].length > 100, `4 brief-read asked with the picture as a JPEG (${sent?.pages?.length} page)`);
  ok((await brief().locator('[data-story-brief-box]').inputValue()) === PHOTO_WORDS, '4 the assistant’s words in the box to check');
  await useIt();
  ok(/From IMG_2041\.png · .* · read by the assistant/.test(await t.words('[data-story-brief-file]')), '4 used, said read by the assistant');
}

/* ---- 5 · Split the brief into asks ---- */
const askPanel = () => page.locator('[data-story-asks]');
await askPanel().getByRole('button', { name: /Split the brief into asks/ }).click();
await page.locator('[data-story-proposed]').waitFor({ timeout: 8000 }).catch(() => undefined);
const split = asks.find(a => a.task === 'brief-asks');
ok(split?.brief === PHOTO_WORDS, '5 brief-asks asked with the brief');
ok((await page.locator('[data-proposed]').count()) === 3 && /From the brief: “What does a changeover on the wrapper cost us\?”/.test(await t.words('[data-proposed="1"]')), '5 three asks proposed, each with the sentence quoted');
await page.locator('[data-proposed="2"] input[type=checkbox]').uncheck();
await page.locator('[data-proposed="1"] input.text-input').fill('What does a changeover on the Wrapper cost a week?');
ok((await page.locator('[data-ask]').count()) === 0, '5 nothing kept before Keep these');
await page.getByRole('button', { name: /^Keep these \(2\)/ }).click(); await page.waitForTimeout(900);
const askTexts = () => page.locator('[data-ask] .stb-ask-t').allInnerTexts();
ok(JSON.stringify(await askTexts()) === JSON.stringify(['Why is Line 7 losing output on nights?', 'What does a changeover on the Wrapper cost a week?']), `5 two asks kept, in order, put right: ${(await askTexts()).join(' | ')}`);
await t.go('#/', 3000);
ok((await page.locator('[data-ask]').count()) === 2, '5 kept after a reload');
{ const s = await storyRec(); ok(s.agreed.story.asks?.[1]?.from === 'What does a changeover on the wrapper cost us?', '5 the quote kept on the ask'); }

/* ---- 6 · typed, moved, deleted and Undo ---- */
await askPanel().getByRole('button', { name: '＋ Add an ask' }).click();
await askPanel().getByLabel('The ask, in the client’s words').fill('Is anything proved yet?');
await askPanel().getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(800);
ok((await askTexts()).length === 3 && (await askTexts())[2] === 'Is anything proved yet?', '6 an ask typed, third');
await page.getByRole('button', { name: 'Move ask 3 up' }).click(); await page.waitForTimeout(800);
ok((await askTexts())[1] === 'Is anything proved yet?', '6 moved up to second');
await page.getByRole('button', { name: 'Delete ask 2' }).click(); await page.waitForTimeout(800);
ok((await askTexts()).length === 2 && /Ask taken off/.test(await t.words('[data-story-ask-undo]')), '6 deleted, Undo offered');
await page.locator('[data-story-ask-undo]').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(800);
ok((await askTexts())[1] === 'Is anything proved yet?', '6 Undo brings it back in its place');
await page.getByRole('button', { name: 'Delete ask 2' }).click(); await page.waitForTimeout(800);

/* ---- 7 · the evidence by rules ---- */
{
  const row = page.locator('[data-ask]').first();
  const says = (await row.locator('[data-ask-says]').innerText()).trim();
  await row.locator('.stb-ask-b').click(); await page.waitForTimeout(500);
  const found = await row.locator('[data-ask-found] li').count();
  const doing = await row.locator('[data-ask-doing] li').count();
  const m = says.match(/^(\d+) found · (\d+) being done/);
  ok(!!m && Number(m[1]) === found && Number(m[2]) === doing && found > 0, `7 the Line 7 ask's counts are its lists: "${says}" (${found} found, ${doing} being done)`);
  ok(/Read from its words/.test(await t.words('[data-ask-open]')) && (await row.locator('.stb-chip.on', { hasText: 'Line 7' }).count()) >= 1, '7 its scope read from its words: Line 7 lit');
  const second = page.locator('[data-ask]').nth(1);
  await second.locator('.stb-ask-b').click(); await page.waitForTimeout(500);
  const before = (await second.locator('[data-ask-says]').innerText()).trim();
  const machineChip = second.locator('.stb-scope .chip-row').nth(1).locator('.stb-chip').first();
  const mName = (await machineChip.innerText()).trim();
  await machineChip.click(); await page.waitForTimeout(900);
  const after = (await page.locator('[data-ask]').nth(1).locator('[data-ask-says]').innerText()).trim();
  ok((await page.locator('[data-ask]').nth(1).locator('.stb-chip.on', { hasText: mName }).count()) === 1 && /still to show/.test(after), `7 a machine picked on the chips (${mName}): "${before}" → "${after}"`);
  ok(/Start it on .* ›|Open .* ›/.test(await t.words('[data-ask]:nth-child(2) [data-ask-missing]')), `7 still to show names the tool and where to start it: "${await t.words('[data-ask]:nth-child(2) [data-ask-missing]')}"`);
}

/* ---- 8 · Also found ---- */
{
  const also = page.locator('[data-story-also] [data-also]');
  const n = await also.count();
  if (!n) ok(false, '8 Also found lists the records answering no ask');
  else {
    const id = await also.first().getAttribute('data-also');
    const label = (await also.first().locator('.linkish').innerText()).trim();
    await also.first().getByRole('button', { name: /to ask 1$/ }).click(); await page.waitForTimeout(900);
    ok((await page.locator(`[data-story-also] [data-also="${id}"]`).count()) === 0, `8 "${label}" assigned to ask 1 with one tap, gone from Also found (${n} before)`);
  }
}

/* ---- 9 · the papers by ask ---- */
await page.getByRole('button', { name: 'Run an update' }).click(); await page.waitForTimeout(1500);
const story = asks.filter(a => a.task === 'story').pop();
ok(/THE CLIENT'S ASKS/.test(story?.snapshotText ?? '') && /ASK 1: Why is Line 7 losing output on nights\?/.test(story?.snapshotText ?? ''), '9 the asks and their evidence sent to the assistant in the snapshot');
const paras = await page.locator('[data-story-draft] .st-paras textarea').evaluateAll(es => es.map(e => e.value));
ok(paras.some(p => /^Ask 1 — Why is Line 7 losing output on nights: found /.test(p)) && paras.some(p => /^Ask 2 — /.test(p)), '9 the draft says each ask in its own paragraph');
ok((await page.locator('[data-story-snapshot-asks] li').count()) === 2, '9 the snapshot drawn with the two asks');
const text = await t.pdfText(() => page.locator('[data-story-draft]').getByRole('button', { name: 'Approve and make the report' }).click(), 'story');
await page.waitForTimeout(800);
ok(/Ask 1 - Why is Line 7 losing output on nights\?/.test(text) && /Asked: “Why is Line 7 losing output on nights\?”|Asked: "Why is Line 7 losing output on nights\?"/.test(text), '9 the report: Ask 1 with the brief’s sentence');
for (const h of ['FOUND', 'BEING DONE', 'PROVED', 'STILL TO SHOW']) ok(text.includes(h), `9 the report's ask section says ${h}`);
{
  const dir = mkdtempSync(join(tmpdir(), 'brief-deck-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.st-ch.is-open [data-story-slides]').click()]);
  const file = join(dir, 'deck.pptx'); await dl.saveAs(file);
  const read = execFileSync('python3', ['-c', "import zipfile,sys,re; z=zipfile.ZipFile(sys.argv[1]); t=' '.join(z.read(n).decode('utf8','ignore') for n in z.namelist() if re.match(r'ppt/slides/slide\\d+\\.xml$', n)); print('ASK' if 'Ask 1' in t and 'Still to show' in t.replace('STILL TO SHOW','Still to show') else 'noask')", file], { encoding: 'utf8' }).trim();
  ok(read === 'ASK', '9 the slides carry a slide an ask');
}

/* ---- 10 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await t.go('#/', 2500);
ok((await t.wide()) <= 1 && (await page.locator('[data-ask]').count()) === 2 && (await page.locator('[data-story-brief]').count()) === 1, '10 the phone: nothing off the side, the brief and the asks there');

/* ---- 11 · no story yet: the brief uploaded from Start the story (9 November — "there is not ability to upload a brief in the story page") ---- */
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(async () => { const db = await import('/src/db.ts'); for (const s of (await db.listAllStudies()).filter(x => x.tool === 'story' && !x.deletedAt)) await db.putStudy({ ...s, deletedAt: Date.now(), updatedAt: Date.now() }); });
await t.go('#/', 2500);
ok((await page.locator('[data-story-start-upload]').count()) === 1 && (await page.locator('[data-story-brief]').count()) === 0, '11 no story yet: Start the story offers Upload a brief beside its own button');
await page.locator('[data-story-start-file-input]').setInputFiles({ name: 'client-brief.txt', mimeType: 'text/plain', buffer: Buffer.from('Why are the packing lines in Area B short of their target?') });
await brief().locator('[data-story-brief-box]').waitFor({ timeout: 15000 }).catch(() => {});
ok((await brief().locator('[data-story-brief-box]').inputValue().catch(() => '')) === 'Why are the packing lines in Area B short of their target?', '11 the file starts the story and is read in code into the box to check');
await useIt();
{
  const s = await storyRec();
  ok(/Area B short of their target/.test(s?.agreed?.story?.brief ?? '') && s?.agreed?.story?.briefFile?.name === 'client-brief.txt', '11 used: the story has the brief and the file named on it');
}

await t.finish('The brief accepted: none is no stopper; a text file, a PDF and a Word file read in code, a photo read by the assistant only when asked; the brief split into asks with their quotes, kept only when approved; each ask’s evidence by the rules; what answers none assigned with a tap; the chapter, the report and the slides by ask.');
