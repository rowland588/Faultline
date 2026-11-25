/* Luna's charts and on-screen slide deck: no category disappears when the drawing has more than one screen of data.
 * Run against Vite with a signed-in fixture: CHROMIUM=/usr/bin/chromium SMOKE_BASE=... SMOKE_SUPABASE_REF=... node scripts/acceptance/luna-graphics.mjs */
import { openApp } from '../lib/tocBrowser.mjs';
import { unzipSync, strFromU8 } from 'fflate';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const errors = []; page.on('pageerror', e => errors.push(e.message));

await t.go('#/', 1200);
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { newConversation } = await import('/src/colleague/conversation.ts');
  const at = Date.now();
  const chat = newConversation({ id: 'graphics-chat', at, name: 'Graphics test' });
  const labels = Array.from({ length: 18 }, (_v, i) => i === 17 ? 'The final long named machine that must still be readable' : `Machine ${i + 1}`);
  chat.facts.results = [{ id: 'R-graphics', title: 'Downtime by machine', source: { kind: 'dataset', id: 'D-graphics', name: 'Production register' }, query: {}, at,
    result: { sheet: 'Production log', skipped: [], groupBy: ['Machine'], measures: ['Downtime'], groups: labels.map((label, i) => ({ key: [label], values: [i === 17 ? 18.125 : i + 1], rows: 1, refs: [] })), groupsTotal: 18, totals: [171.125], rowsMatched: 18, rowsScanned: 18, notes: [] },
  }];
  chat.facts.charts = [{ id: 'C-graphics', versions: [{ resultId: 'R-graphics', type: 'bar', measure: 0, title: 'Downtime by every machine', unit: 'min' }], at }];
  chat.facts.reports = [{ id: 'P-graphics', title: 'Production picture', form: 'presentation', at, updated: at, version: 1, sections: [
    { id: 's1', kind: 'summary', heading: 'What changed', text: 'A clear summary with its source named.' },
    { id: 's2', kind: 'chart', heading: 'Every machine', chartId: 'C-graphics', evidence: ['R-graphics'] },
  ] }];
  await db.putStudy(chat);
  const { runCall } = await import('/src/capabilities/registry.ts');
  const process = await runCall({ now: at, conversationId: chat.id, isSuper: true }, { id: 'media', name: 'build_report', input: {
    reportId: 'P-graphics', op: 'add', section: { kind: 'process', heading: 'Packing sequence', text: 'Receive cartons\nInspect the seal\nPack cartons\nInspect the seal\nDispatch cartons' },
  } }, { confirmed: true });
  if (!process.ok) throw new Error(process.why);

});

await t.go('#/ai/present?c=graphics-chat&reportId=P-graphics', 1800);
await page.locator('[data-slide="0"]').waitFor({ timeout: 10000 });
ok((await page.locator('[data-present-slides]').innerText()).includes('Read report'), '1 a presentation opens as a slide deck');
await page.getByRole('button', { name: 'Next' }).click();
ok((await page.locator('[data-slide="1"] [data-doc-section="s1"]').count()) === 1, '2 the first section has its own slide');
await page.getByRole('button', { name: 'Next' }).click();
await page.locator('[data-slide="2"] [data-chart="C-graphics"]').waitFor({ state: 'attached', timeout: 8000 });
ok((await page.locator('[data-slide="2"] [data-chart-values]').count()) === 1, '3 the chart slide has an exact values table');
ok(await page.locator('.lm-finding').isVisible(), '3 the measured finding leads the customer slide');
ok(!(await page.locator('.ai-chart-img').isVisible()), '3 chart details start collapsed');
await page.screenshot({ path: '/tmp/luna-media-chart.png', animations: 'disabled' });
await page.getByText('Explore the full chart (18)').click();
const animated = await page.locator('[data-slide="2"] .ai-chart-img').getAttribute('src');
ok(decodeURIComponent(animated || '').includes('chart-grow'), '3 chart bars animate in the on-screen presentation');
await page.locator('[data-chart-values] summary').click();
ok((await page.locator('[data-chart-values]').innerText()).includes('The final long named machine that must still be readable'), '3 the last category and its full label remain available');
ok((await page.locator('[data-chart-values]').innerText()).includes('18.125 min'), '3 the exact decimal value remains available');
await page.getByRole('button', { name: 'Explore chart' }).click();
const scrub = page.getByRole('slider', { name: /Point 1 of 18/ });
await scrub.fill('17');
ok((await page.locator('.ai-chart-explore-readout').innerText()).includes('18.125 min'), '3 scrubbing the chart reveals the selected exact value');
ok((await page.locator('.ai-chart-explore-body label').innerText()).includes('The final long named machine that must still be readable'), '3 the selected point keeps its full category name');
ok(decodeURIComponent(await page.locator('[data-slide="2"] .ai-chart-img').getAttribute('src') || '').includes('data-chart-point="17"'), '3 the plotted graphic marks the selected point');
await page.getByRole('button', { name: 'Play points' }).click();
ok(await page.getByRole('button', { name: 'Pause' }).count() === 1, '3 chart can play through its points');
await page.getByRole('button', { name: 'Pause' }).click();
await page.getByRole('button', { name: 'Explore chart' }).click();
await page.screenshot({ path: '/tmp/luna-graphics-desk.png' });
await page.keyboard.press('ArrowLeft');
ok((await page.locator('[data-slide="1"]').count()) === 1, '4 keyboard navigation goes to the previous slide');

await page.setViewportSize({ width: 390, height: 844 });
await page.keyboard.press('ArrowRight');
await page.getByText('Explore the full chart (18)').click();
ok(await page.locator('.ai-chart-phone-item').count() === 18, '5 phone bars show every category with its value');
ok((await page.locator('.ai-chart-phone-item').last().innerText()).includes('The final long named machine that must still be readable'), '5 long labels remain legible on the phone');
ok((await page.locator('.ai-chart-phone-item').last().innerText()).includes('18.125 min'), '5 the phone shows the exact decimal');
ok(await page.locator('.ai-chart-phone-bars').isVisible(), '5 phone graphic is immediately readable');
ok((await t.wide()) <= 0, '5 the phone page itself has no horizontal overflow');
ok((await page.locator('.lr-slide-controls .btn').first().evaluate(el => el.getBoundingClientRect().height)) >= 44, '5 slide controls are touch sized');
await page.screenshot({ path: '/tmp/luna-graphics-phone.png' });
await page.getByRole('button', { name: 'Next' }).click();
ok(await page.locator('.lm-process li').count() === 5, '5 illustrated process includes repeated inspections in the recorded order');
ok(await page.locator('.lm-process li svg').count() === 5 && await t.wide() <= 0, '5 every process station has an illustration and fits on phone');
await page.getByRole('checkbox', { name: 'Play process sequence' }).check();
ok(await page.locator('.lm-process li').first().evaluate(el => getComputedStyle(el).animationName) === 'lm-handoff', '5 playing the sequence animates each handoff');
await page.emulateMedia({ reducedMotion: 'reduce' });
ok(await page.locator('.lm-station').first().evaluate(el => getComputedStyle(el).animationName) === 'none', '5 reduced motion keeps the entire sequence still');
await page.screenshot({ path: '/tmp/luna-media-process-phone.png' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.screenshot({ path: '/tmp/luna-media-process-desk.png' });
const exported = await page.evaluate(async () => {
  const { getStudy } = await import('/src/db.ts');
  const { outputsOfConversation } = await import('/src/capabilities/data.ts');
  const { reportPdf, reportDeck } = await import('/src/lib/data/reportFiles.ts');
  const study = await getStudy('graphics-chat');
  const outs = outputsOfConversation(study);
  const input = { report: outs.reports[0], results: new Map(outs.results.map(r => [r.id, r])), charts: new Map(outs.charts.map(c => [c.id, c])), printed: '24 November 2026' };
  const { reportHtml } = await import('/src/lib/data/reportHtml.ts');
  const html = await reportHtml(input).text();
  const pdf = await reportPdf(input);
  const deck = await reportDeck(input);
  const asBase64 = async blob => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let start = 0; start < bytes.length; start += 16000) binary += String.fromCharCode(...bytes.slice(start, start + 16000));
    return btoa(binary);
  };
  return { html, pdfBytes: pdf.size, deckBytes: deck.size, pdfBase64: await asBase64(pdf), deckBase64: await asBase64(deck) };
});
const offline = await t.ctx.newPage();
await offline.route(/^https?:/, route => route.abort());
await offline.route('https://example.test/packing.html', route => route.fulfill({ contentType: 'text/html', body: exported.html }));
await offline.goto('https://example.test/packing.html');
ok(await offline.locator('#s1').isVisible() && !(await offline.locator('#s2').isVisible()), '6 share opens directly on one scene');
await offline.getByRole('link', { name: 'Next scene' }).click();
const scene = offline.locator('.lm-details');
ok(await offline.locator('.lm-finding').isVisible() && await offline.locator('.lm-process li').count() === 5, '6 the offline HTML includes the chart scene and all five illustrated process steps');
await scene.locator('summary').first().click();
ok(await scene.getByText('18.125 min', { exact: true }).isVisible(), '6 all exact values are available in the offline presentation');
await offline.getByRole('link', { name: 'Next scene' }).click();
await offline.getByRole('checkbox', { name: 'Play process sequence' }).check();
ok(await offline.locator('#s3').isVisible() && await offline.locator('.lm-process li').first().evaluate(el => getComputedStyle(el).animationName) === 'lm-handoff', '6 travelling to the next scene plays the process offline');
await offline.getByRole('link', { name: 'View sources' }).click();
ok(await offline.locator('#sources').isVisible(), '6 the final scene opens its evidence');
await offline.getByRole('link', { name: 'Replay' }).click();
ok(await offline.locator('#s1').isVisible(), '6 the story replays without a connection');
await offline.close();
const slides = Object.entries(unzipSync(Buffer.from(exported.deckBase64, 'base64'))).filter(([path]) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).map(([_path, bytes]) => strFromU8(bytes));
ok(exported.pdfBytes > 5000 && exported.deckBytes > 5000, '6 PDF and PowerPoint exports are generated');
ok(slides.length >= 5 && slides.some(xml => xml.includes('The final long named machine that must still be readable')), '6 PowerPoint includes every plotted category on value slides');
ok(slides.some(xml => xml.includes('Dispatch cartons') && xml.includes('<p:pic>')), '6 PowerPoint includes illustrations and the fifth step on a continuation slide');
ok(slides.some(xml => xml.includes('18.125 min')), '6 PowerPoint keeps exact decimal values');
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdf = await getDocument({ data: new Uint8Array(Buffer.from(exported.pdfBase64, 'base64')), useSystemFonts: true }).promise;
let paper = '';
for (let number = 1; number <= pdf.numPages; number++) paper += (await (await pdf.getPage(number)).getTextContent()).items.map(item => item.str ?? '').join(' ');
ok(paper.includes('The final long named machine') && paper.includes('readable'), '6 PDF includes the later chart values in readable text');
ok(paper.includes('Receive cartons') && paper.includes('Dispatch cartons'), '6 the paper keeps the whole sequence');
ok(paper.includes('18.125 min'), '6 PDF keeps exact decimal values');
await page.evaluate(async () => {
  const { patchStudy } = await import('/src/db.ts');
  await patchStudy('graphics-chat', s => ({ facts: { ...s.facts, charts: s.facts.charts.map(c => c.id === 'C-graphics' ? { ...c, versions: [{ ...c.versions[0], type: 'pie' }] } : c) } }));
});
await t.go('#/ai', 500);
await t.go('#/ai/present?c=graphics-chat&reportId=P-graphics', 1200);
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Next' }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByText('Explore the full chart (18)').click();
await page.locator('[data-slide="2"] .ai-chart-phone-values').waitFor({ timeout: 8000 });
ok(await page.locator('[data-slide="2"] .ai-chart-phone-values').isVisible(), '7 phone pie shows full labels and exact values below the scrollable graphic');
ok((await page.locator('[data-slide="2"] .ai-chart-phone-values').innerText()).includes('The final long named machine that must still be readable') && (await page.locator('[data-slide="2"] .ai-chart-phone-values').innerText()).includes('18.125 min'), '7 phone pie keeps the final long label and exact decimal');
ok(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
await t.finish('Luna charts keep all values; presentations reveal one section at a time on desktop and phone.');
