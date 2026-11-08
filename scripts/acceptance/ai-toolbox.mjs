/* ACCEPTANCE — THE AI TOOLBOX (8 November; src/catalogue/aiTools, docs/AI-TOOLBOX.md — Rowland: "should be in an AI tool box itself
 * ... so it's separated, so we know that they use AI"). Driven in a real browser on the smoke seed:
 *
 *   1  Tools shows The AI toolbox — a card for each place a model is used, in the module's order, each saying what it does, what it
 *      sends and what it never does
 *   2  the AI mark on the cards of the tools that use it (Line Talk, Video study: Uses AI; process flow, spaghetti, value stream:
 *      Can be talked in · AI) and on no formula tool's card
 *   3  a tool's own page says the mark and the AI in it; a formula tool's page says none
 *   4  Open Line Talk from the box lands on Line Talk
 *   5  the phone: the box one column, nothing off the side
 *
 *   node scripts/acceptance/ai-toolbox.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await t.go('#/tools', 3000);

const cards = await page.locator('[data-ai-tool]').evaluateAll(es => es.map(e => e.getAttribute('data-ai-tool')));
ok(JSON.stringify(cards) === JSON.stringify(['talk', 'talk-in', 'video-name', 'story-draft', 'voice-note']), `1 the AI toolbox, a card each: ${cards.join(', ')}`);
const each = await page.locator('[data-ai-tool]').evaluateAll(es => es.every(e => /Sends/.test(e.innerText) && /Never/.test(e.innerText)));
ok(each && /never works out a figure/.test(await t.words('[data-ai-box]')), '1 each card says what it sends and what it never does; the box says the AI never works out a figure');

const marks = await page.locator('.tc-card').evaluateAll(es => Object.fromEntries(es.map(e => [e.getAttribute('data-tool'), e.querySelector('[data-ai-mark]')?.textContent ?? ''])));
ok(marks.talk === 'Uses AI' && marks.video === 'Uses AI' && ['processflow', 'spaghetti', 'valuestream'].every(k => marks[k] === 'Can be talked in · AI'), `2 the mark on the AI tools' cards (${['talk', 'video', 'processflow', 'spaghetti', 'valuestream'].map(k => `${k}: ${marks[k]}`).join('; ')})`);
ok(['capability', 'linebalance', 'losses', 'changeover'].every(k => marks[k] === ''), '2 no mark on a formula tool');

await t.go('#/tools/video', 2500);
ok((await t.words('[data-ai-mark]')) === 'Uses AI' && /Name the work from the frames/.test(await t.words('[data-ai-say]')), '3 the video study\'s page says Uses AI and the AI in it');
await t.go('#/tools/capability', 2500);
ok((await page.locator('[data-ai-mark], [data-ai-say]').count()) === 0, '3 the capability study\'s page says none');

await t.go('#/tools', 2500);
await page.locator('[data-ai-tool="talk"] button').click(); await page.waitForTimeout(1500);
ok(/#\/talk/.test(page.url()), `4 Open Line Talk lands on Line Talk (${page.url().split('#')[1]})`);

await page.setViewportSize({ width: 390, height: 844 }); await t.go('#/tools', 2500);
const cols = await page.locator('[data-ai-tool]').evaluateAll(es => new Set(es.map(e => Math.round(e.getBoundingClientRect().left))).size);
ok(cols === 1 && (await t.wide()) <= 1, `5 the phone: one column (${cols}), nothing off the side`);

await t.finish('The AI toolbox accepted: every place a model is used, in one shelf, saying what it sends and what it never does; the mark on each AI tool and on no formula tool.');
