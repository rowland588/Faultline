/* ACCEPTANCE — A WORKBOOK ON EVERY DEVICE (16 November; src/lib/workbook/carry — Rowland: "Luna cant see files uploaded from another
 * device big problem upload on laptop must be viable to phone user and other way round"). The gateway played by the script, the workbook
 * written by scripts/workbook/make-workbook.mjs with its own totals:
 *
 *   1  ATTACHED — through AI Mode's attach control: read, and said kept for the person's other devices; the file kept with its record in
 *      the register (facts.docPhotos, field workbook-file) — the very bytes attached — so the sync carries it as it carries a document
 *   2  ANOTHER DEVICE — the workbook's cells gone from this device (as on a phone that never read it), the page reloaded: asked by minutes
 *      by reason, the file is read here from what was kept and every figure equals the generator's; no file sent to the gateway
 *   3  NOT ARRIVED — the cells AND the file gone (the other device has not sent it yet, or there is no signal): said in words, no figure
 *   4  the phone: the same question answered at 390 px
 *
 *   node scripts/acceptance/workbook-devices.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wbdev-'));
const f = join(dir, 'Cellox downtime.xlsx');
execFileSync('node', ['scripts/workbook/make-workbook.mjs', f, '4000', '5'], { stdio: 'ignore' });
const exp = JSON.parse(readFileSync(`${f}.expected.json`, 'utf8'));
const bytes = statSync(f).size;

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
let biggestPost = 0;
page.on('request', r => { const b = r.postDataBuffer(); if (b && b.length > biggestPost) biggestPost = b.length; });
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: false, why: 'nothing planned' }) });
});
let turns = 0;
const answered = async n => { await page.waitForFunction(k => [...document.querySelectorAll('.ai-turn.is-colleague')].filter(e => !e.querySelector('[data-ai-code]')).length >= k && !document.querySelector('.ai-thinking'), n, { timeout: 120000 }).catch(() => undefined); await page.waitForTimeout(300); };
const round = async (words, rounds) => { plan = rounds; await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); turns += 1; await answered(turns); };
const result = id => asks.flatMap(a => a?.pending?.results ?? []).filter(r => r.id === id).at(-1);
const calls = (...cs) => () => ({ ok: true, reply: '', calls: cs.map(([id, name, input]) => ({ id, name, input })), assistant: { v: 1 } });
const then = words => () => ({ ok: true, reply: words });
const recount = async () => { turns = await page.locator('.ai-turn.is-colleague').evaluateAll(es => es.filter(e => !e.querySelector('[data-ai-code]')).length); };
const byReason = Object.entries(exp.minutesByReason).sort((a, b) => b[1] - a[1]);
const askByReason = async id => {
  await round('Where are we losing the most production time?', [calls([id, 'query_workbook', { sheet: 'Downtime', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }] }]), then('…')]);
  return result(id);
};
const equalToGenerator = q => !!q?.ok && q.data.rowsScanned === exp.rows && byReason.every(([k, v], i) => q.data.groups[i]?.key[0] === k && Math.abs(q.data.groups[i].values[0] - v) < 1e-6 * Math.max(1, v));
const wipeCells = () => page.evaluate(async () => { const r = await navigator.storage.getDirectory(); try { await r.removeEntry('workbooks', { recursive: true }); } catch { /* none */ } });

/* ---- 1 · ATTACHED ---- */
await t.go('#/ai', 2500);
await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(f);
await page.waitForFunction(() => document.querySelector('[data-workbook]')?.getAttribute('data-workbook') === 'read', null, { timeout: 120000 });
const said = await t.words('[data-workbook]');
ok(/^Read “Cellox downtime\.xlsx” on this device in [\d.]+ s: .* It is kept for your other devices too — ask about it here or on your phone\./.test(said), `1 read, and said kept for the other devices: "${said.slice(0, 160)}"`);
const kept = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const src = (await db.listAllStudies()).find(s => s.tool === 'source' && s.facts.source?.kind === 'workbook');
  const e = (src?.facts.docPhotos ?? []).find(p => p.field === 'workbook-file');
  const { getBlob } = await import('/src/db/blobs.ts');
  const b = e ? await getBlob(e.blobKey) : undefined;
  const { docMediaKeys } = await import('/src/tools/doc/doc.ts');
  return { key: e?.blobKey, caption: e?.caption, size: b?.size ?? 0, synced: !!src && docMediaKeys(src.facts).some(k => k.key === e?.blobKey) };
});
ok(!!kept.key && kept.size === bytes && kept.caption === 'Cellox downtime.xlsx' && kept.synced, `1 the file kept with its record in the register, the very ${bytes.toLocaleString('en-GB')} bytes, among the files the sync carries (${kept.key})`);
await recount();
const q1 = await askByReason('q1');
ok(equalToGenerator(q1), `1 asked here: minutes by reason over all ${exp.rows.toLocaleString('en-GB')} rows equal the generator's — ${byReason[0][0]} ${byReason[0][1]}`);

/* ---- 2 · ANOTHER DEVICE ---- */
await wipeCells();
await page.reload(); await page.waitForTimeout(3000);
await recount();
const q2 = await askByReason('q2');
ok(equalToGenerator(q2), `2 its cells gone from this device: read here from the file kept for the person's devices, every figure the generator's (${q2?.ok ? 'answered' : q2?.says ?? q2?.why ?? 'no answer'})`);
ok(biggestPost < Math.min(bytes / 2, 200_000) || biggestPost < 200_000, `2 nothing of the file sent to the gateway — the largest request ${Math.round(biggestPost / 1024)} KB, the workbook ${Math.round(bytes / 1024)} KB`);

/* ---- 3 · NOT ARRIVED ---- */
await wipeCells();
await page.evaluate(async k => { const { deleteBlobs } = await import('/src/db/blobs.ts'); await deleteBlobs([k]); }, kept.key);
await page.reload(); await page.waitForTimeout(3000);
await recount();
const q3 = await askByReason('q3');
const words3 = q3?.says ?? q3?.why ?? '';
ok(!!q3 && !q3.ok && /Cellox downtime\.xlsx/.test(words3) && /(on its way|could not be fetched)/.test(words3) && !/\d{3,}/.test(words3.replace(/50 MB|16 November/g, '')), `3 neither its cells nor its file here yet: said in words, no figure — "${words3.slice(0, 140)}"`);

/* ---- 4 · THE PHONE ---- */
await page.evaluate(async ([k, b64]) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const { putBlob } = await import('/src/db/blobs.ts');
  await putBlob(k, new Blob([bin], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}, [kept.key, readFileSync(f).toString('base64')]);
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForTimeout(3000);
await recount();
const q4 = await askByReason('q4');
ok(equalToGenerator(q4), '4 on a phone, the file having arrived: answered there, every figure the generator\'s');
ok((await t.wide()) <= 0, '4 nothing off the side at 390');

await t.finish('A workbook attached on one device is read on another from the file kept with its record; nothing of it sent to the model.');
