/* ACCEPTANCE — THE STORY (8 November, docs/STORY.md S2; lib/clientStory, screens/StoryScreen, lib/report/storyPaper — Rowland: "the
 * story so far is a continuous journey … I run an update and it pulls it all into a beautiful report"). Driven in a real browser on
 * the smoke seed, whose lines name no client (so the story is the factory's) and which holds one approved chapter:
 *
 *   1  the Story tab on the Factory; the page: the brief, the chapters said, the four figures (found so far · biggest loss · being
 *      fixed · proved) as lib/clientStory says them from the Factory page's own readers, Since the last update
 *   2  Run an update: a draft chapter — a headline and paragraphs from the records' words, the snapshot drawn; the headline edited;
 *      a paragraph with a figure the records do not hold marked Check this, taken out and the mark gone
 *   3  Approve: chapter 2 listed first and open, the report downloaded and read back — the client, Prepared by, the brief, the
 *      headline, What we have found, What is being done, The story so far (chapter 1), the closing line
 *   4  a problem raised on the line: Since the last update says 1 new finding with no reload; the next draft says it too
 *   5  Close the engagement — no Run an update, said closed; Reopen
 *   6  the phone: nothing off the side, the tiles and the chapters there
 *
 *   node scripts/acceptance/story.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper, more } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
/* THE GATEWAY, answered by the script (S3): what the next ask gets is set by the step — the assistant's draft, a refusal, or nothing planned */
const asks = [];
let plan = [];
const CORS = { 'access-control-allow-origin': '*' };
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  if (!next) return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'nothing planned' }) });
  if (next.refuse) return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: next.refuse }) });
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, headline: next.headline, narrative: next.narrative, unsure: [], model: 'test-model' }) });
});
await page.evaluate(async () => { const { setBrandForTest } = await import('/src/lib/brand.ts'); setBrandForTest({ name: 'Rowland Glew', business: 'Streamline Synergy' }); });

/* ---- 1 · the page ---- */
await t.go('#/', 3000);
await page.locator('.nv-tabs .nv-tab', { hasText: 'Story' }).click(); await page.waitForTimeout(2500);
ok(/#\/story/.test(page.url()), '1 the Story tab on the Factory opens #/story');
const tiles = await page.locator('.st-tiles .ln-tile').evaluateAll(es => es.map(e => e.querySelector('.ln-k')?.textContent?.trim()));
ok(JSON.stringify(tiles) === JSON.stringify(['Found so far', 'Biggest loss', 'Being fixed', 'Proved']), `1 the four figures: ${tiles.join(' · ')}`);
const lede = await t.words('.pace-lede');
ok(/Why is Line 7 losing output\?/.test(lede) && /1 chapter since/.test(lede), `1 the brief and the chapters said: "${lede}"`);
/* the figures are the module's from the same readers: the open problems on the Factory page's card equal the Found tile's count */
const foundOf = await t.words('.st-tiles .ln-tile:first-child .ln-of');
await t.go('#/', 2500);
const wrongCard = (await t.words('.fq-cards .fq-v')).trim().split(/\s+/)[0];
await t.go('#/story', 2500);
ok(new RegExp(`^${wrongCard.trim()} problems? open`).test(foundOf), `1 Found so far counts the Factory page's open problems (${wrongCard} → "${foundOf}")`);
ok(/Since \d+ \w+:|Nothing new since/.test(await t.words('[data-story-since]')), `1 Since the last update: "${await t.words('[data-story-since]')}"`);
ok((await page.locator('.st-ch').count()) === 1 && /chapter 1/i.test(await t.words('.st-ch .st-ch-n')), '1 the seeded chapter listed');

/* ---- 2 · Run an update — the assistant's draft offered over the records' words ---- */
plan = [{ headline: 'The wrapper decides the line; nothing proved yet', narrative: ['Line 7 is held by its wrapper. One problem is open on the register and it is not priced yet.', 'Ten actions are late, most of them Ilapak UK’s; the changeover to 1.25 kg was due on 2 November.'] }];
await page.getByRole('button', { name: 'Run an update' }).click();
await page.waitForFunction(() => document.querySelector('[data-story-draft] .st-headline')?.value === 'The wrapper decides the line; nothing proved yet', null, { timeout: 8000 }).catch(() => undefined);
ok(asks.length === 1 && asks[0].task === 'story' && /PROBLEMS OPEN/.test(asks[0].snapshotText) && Array.isArray(asks[0].figures) && asks[0].headlinesBefore.length === 1, `2 the gateway asked once, task story, with the snapshot as text, its figures and the headline before (${asks[0]?.headlinesBefore?.[0]})`);
ok((await page.locator('[data-story-draft] .st-headline').inputValue()) === 'The wrapper decides the line; nothing proved yet' && /by the assistant/i.test(await t.words('[data-story-draft] .pp-eyebrow')), '2 the assistant’s headline and paragraphs take the draft, said drafted by the assistant');
await page.locator('[data-story-draft]').getByRole('button', { name: 'Back to the records’ words' }).click(); await page.waitForTimeout(400);
ok(!/by the assistant/i.test(await t.words('[data-story-draft] .pp-eyebrow')), '2 Back to the records’ words — the assembled paragraphs again');
const draft = page.locator('[data-story-draft]');
ok((await draft.count()) === 1 && /chapter 2/i.test(await t.words('[data-story-draft] .pp-eyebrow')), '2 a draft of chapter 2 opens');
const paras = await draft.locator('.st-paras textarea').count();
ok(paras >= 2 && (await draft.locator('.st-headline').inputValue()).length > 5 && (await draft.locator('[data-story-snapshot]').count()) === 1, `2 a headline and ${paras} paragraphs from the records' words, the snapshot drawn`);
const head = draft.locator('.st-headline');
await head.fill('The wrapper is the limit — the changeover is fixed'); await head.press('Enter'); await page.waitForTimeout(400);
await draft.getByRole('button', { name: 'Add a paragraph' }).click(); await page.waitForTimeout(300);
const newPara = draft.locator('.st-paras textarea').last();
await newPara.fill('We expect savings of £12,000 a year from the film guide.'); await newPara.blur(); await page.waitForTimeout(500);
ok(/Check this: 12000/.test(await t.words('[data-story-unsure]')), '2 a figure the records do not hold is marked Check this');
await draft.locator('.st-para-x').last().click(); await page.waitForTimeout(400);
ok((await page.locator('[data-story-unsure]').count()) === 0, '2 taken out, the mark is gone');

/* ---- 3 · Approve and the report ---- */
const text = await t.pdfText(() => draft.getByRole('button', { name: 'Approve and make the report' }).click(), 'story');
await page.waitForTimeout(800);
ok((await page.locator('.st-ch').count()) === 2 && /chapter 2/i.test(await t.words('.st-ch.is-open .st-ch-n')) && /The wrapper is the limit/.test(await t.words('.st-ch.is-open .st-ch-t')), '3 chapter 2 listed first and open with its headline');
for (const [what, re] of [['the client and the brief', /Why is Line 7 losing output\?/], ['Prepared by', /Prepared by Rowland Glew, Streamline Synergy/], ['the headline', /The wrapper is the limit/], ['What we have found', /What we have found/], ['What is being done', /What is being done/], ['What is proved', /What is proved/], ['the story so far', /The story so far/], ['what the figures rest on', /What the figures rest on/]]) {
  ok(re.test(text), `3 the report says ${what}`);
}

/* ---- 3b · the slides (S4): the chapter as a deck, read back ---- */
{
  const dir = mkdtempSync(join(tmpdir(), 'story-deck-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.st-ch.is-open [data-story-slides]').click()]);
  const file = join(dir, 'deck.pptx'); await dl.saveAs(file);
  const read = execFileSync('python3', ['-c', `import zipfile,sys,re; z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); slides=[n for n in names if re.match(r'ppt/slides/slide\\d+\\.xml$', n)]; txt=' '.join(z.read(n).decode('utf8','ignore') for n in slides); print(len(slides)); print('HEAD' if 'The wrapper is the limit' in txt else 'nohead'); print('BRAND' if 'Rowland Glew' in txt else 'nobrand'); print('MONEY' if 'Where the money is' in txt or 'What we have found' in txt else 'nomoney')`, file], { encoding: 'utf8' }).trim().split('\n');
  ok(Number(read[0]) >= 7 && read[1] === 'HEAD' && read[2] === 'BRAND' && read[3] === 'MONEY', `3b the deck: ${read[0]} slides, the headline, who prepared it and the findings in them`);
  /* headless Chromium drops a download's name when it holds a non-ASCII letter (the em dash) — the PDFs' too — so the file is proved by its own parts: a presentation inside a zip */
  const pres = execFileSync('python3', ['-c', `import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print('PRES' if 'ppt/presentation.xml' in z.namelist() and '[Content_Types].xml' in z.namelist() else 'nopres')`, file], { encoding: 'utf8' }).trim();
  ok(pres === 'PRES', '3b a PowerPoint file — a presentation and its content types inside the zip');
}

/* ---- 4 · a problem raised, the since line moving ---- */
await page.evaluate(async id => { const db = await import('/src/db.ts'); const t = Date.now(); await db.addSnag({ id: crypto.randomUUID(), workspaceId: id, problem: 'Seal rejects on nights', priority: 'high', status: 'open', raisedAt: t, createdAt: t, updatedAt: t }); }, sd.wsId);
await page.waitForTimeout(1500);
ok(/1 new finding/.test(await t.words('[data-story-since]')), `4 a problem raised: "${await t.words('[data-story-since]')}"`);
plan = [{ refuse: 'The day’s allowance for drafting chapters is spent ($3.00) — this one is written from the records’ words.' }];
await page.getByRole('button', { name: 'Run an update' }).click(); await page.waitForTimeout(1200);
ok(/allowance for drafting chapters is spent/.test(await t.words('[data-story-asking]')) && !/by the assistant/i.test(await t.words('[data-story-draft] .pp-eyebrow')), '4 the assistant refusing: said in a line, the records’ words stand');
ok(/1 new finding: Seal rejects on nights/.test(await page.locator('[data-story-draft] .st-paras textarea').allInnerTexts().then(x => x.join(' ')).catch(() => '')) || /Seal rejects on nights/.test(await page.locator('[data-story-draft] .st-paras textarea').evaluateAll(es => es.map(e => e.value).join(' '))), '4 the next draft names the new finding');
await page.locator('[data-story-draft]').getByRole('button', { name: 'Discard' }).click(); await page.waitForTimeout(400);

/* ---- 5 · closed and reopened ---- */
await more(page, 'Close the engagement'); await page.waitForTimeout(800);
ok((await page.getByRole('button', { name: 'Run an update' }).count()) === 0 && /closed/.test(await t.words('.pace-lede')), '5 closed: no Run an update, said closed');
await more(page, 'Reopen the engagement'); await page.waitForTimeout(800);
ok((await page.getByRole('button', { name: 'Run an update' }).count()) === 1, '5 reopened');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await t.go('#/story', 2500);
ok((await t.wide()) <= 1 && (await page.locator('.st-tiles .ln-tile').count()) === 4 && (await page.locator('.st-ch').count()) === 2, '6 the phone: nothing off the side, the tiles and the chapters there');

await t.finish('The Story accepted: the client’s journey a chapter at a time — the figures the Factory page’s own, Run an update drafting the next chapter from the records’ words, a stray figure marked, the report read back with who prepared it.');
