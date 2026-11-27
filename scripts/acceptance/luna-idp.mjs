/* ACCEPTANCE — Intelligent Document Processing as Luna (27 November 2026).
 * Conversation is the door: attach a tender PDF, she reads it in the app. No extra sheet, no AI, figures from the file.
 *   1  a made-up tender PDF attached on #/ai — classified, £48,000 held, supplier named as missing, chips if form unnamed
 *   2  no gateway, no factory-document sheet
 *   3  a .txt is still the factory sheet
 *   4  WHO YOU ARE names documents; “Tell me what you are” goes to Luna, not a canned line
 *   5  the phone: the look stays on the column
 *
 *   node scripts/acceptance/luna-idp.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { jsPDF } from 'jspdf';

const PAGES = [
  ['Invitation to Tender (ITT)', 'Contracting authority: Northfield Foods Ltd', 'Tender ref: ITT-2026-014', 'Supply of a vertical bagging line'],
  ['Submission deadline: 14 January 2027', 'Total contract value: £48,000', 'VAT: £9,600', 'Supplier: not stated in this pack'],
];
const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
PAGES.forEach((lines, i) => { if (i) pdf.addPage(); pdf.setFontSize(11); lines.forEach((l, k) => { if (l) pdf.text(l, 56, 72 + k * 22); }); });
const FILE = { name: 'ITT-2026-014 Northfield packing line.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf.output('arraybuffer')) };

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.reload();
await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const L = await import('/src/lib/lines.ts');
  const d = await import('/src/db.ts');
  const w = await L.addLineToFactory('Line 7');
  await d.updateWorkspace({ ...w, clientName: 'Northfield Foods' });
});

const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  asks.push(r.request().postDataJSON());
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'nothing planned' }) });
});

await t.go('#/ai', 4000);
await page.locator('.ai-box').waitFor({ state: 'visible', timeout: 30000 });

const before = asks.length;
await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles(FILE);
await page.waitForSelector('[data-document-look]', { timeout: 20000 }).catch(() => undefined);
const said = await t.words('[data-document-look]');
ok(/is a tender/i.test(said), `1 classified as a tender: "${said.slice(0, 140)}"`);
ok(/£48,000/.test(said), `1 amount from the file, not invented: "${said.slice(0, 180)}"`);
ok(/Not in the file:.*supplier/i.test(said), `1 missing supplier named: "${said.slice(0, 220)}"`);
ok(/no AI used/i.test(said), '1 said to be done in the app');
ok(asks.length === before, '1 NO request sent to the AI');
ok(await page.locator('[data-fdoc]').count() === 0, '1 no extra factory-document sheet');
const chips = await page.locator('[data-document-look] .ai-sug').allInnerTexts();
ok(chips.includes('A report') && chips.includes('A table') && chips.includes('Make this an SOP'), `1 form chips only because they did not name one: ${chips.join(' | ')}`);

await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles({ name: 'site notes.txt', mimeType: 'text/plain', buffer: Buffer.from('The packing hall has two lines.') });
await page.waitForSelector('[data-fdoc]', { timeout: 8000 }).catch(() => undefined);
ok(await page.locator('[data-fdoc]').count() === 1, '3 a text file is still the factory sheet');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const who = await page.evaluate(async () => {
  const m = await import('/src/tools/colleague/colleagueAssist.ts');
  return m.COLLEAGUE_SYSTEM;
});
ok(/document they attach/.test(who) && /document_look/.test(who) && /tender/.test(who), '4 WHO YOU ARE names documents honestly');
const beforeYou = asks.length;
await page.locator('.ai-box').fill('Tell me what you are');
await page.getByRole('button', { name: 'Send', exact: true }).click();
for (const until = Date.now() + 12000; Date.now() < until && !asks.some(a => /Tell me what you are/.test(a.turns?.at(-1)?.text ?? ''));) await page.waitForTimeout(100);
ok(asks.filter(a => /Tell me what you are/.test(a.turns?.at(-1)?.text ?? '')).length >= 1, '4 Tell me what you are — Luna, not a classifier');
ok(asks.length > beforeYou, '4 Tell me what you are — went to the gateway');

await page.setViewportSize({ width: 390, height: 800 });
await t.go('#/ai', 2500);
await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles(FILE);
await page.waitForSelector('[data-document-look]', { timeout: 20000 }).catch(() => undefined);
const phone = await page.evaluate(() => {
  const el = document.querySelector('[data-document-look]'); if (!el) return null;
  const w = document.documentElement.clientWidth;
  const off = [...el.querySelectorAll('*')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1); }).length;
  return { off };
});
ok(phone && phone.off === 0, `5 the phone: nothing off the side (${phone?.off})`);

await t.finish('a tender PDF attached in chat is read in the app — classified, facts held, missing named, no extra clicks');
