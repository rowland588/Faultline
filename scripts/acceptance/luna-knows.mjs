/* ACCEPTANCE — ASKED WITH NOTHING ATTACHED (21 November 2026, docs/LUNA-AGENT.md G3 — Rowland: "Luna linked to data … no more analysis,
 * Luna knows everything. Ask her a question").
 *
 * The foundation of "she already knows": a file Luna is linked to is hers to answer from in ANY conversation of its customer — the
 * person does not attach it again, name its sheet or say where it is. This story proves the machinery, the gateway played by the
 * script (whether she uses it unprompted is the real-model measure, LUNA-AGENT §3). The workbook is the generator's, with its own
 * totals; the cloud's `link` function is played.
 *
 *   1  a workbook read by its link in one conversation — Branston's
 *   2  a NEW conversation, nothing attached, one question: Luna is told what she is linked to for the customer in hand — the file by
 *      its name, what it holds and whose it is, with its id — and no workbook is attached to this conversation
 *   3  from that id alone the app answers: the figure by line equals the generator's own totals, every figure in her answer is
 *      checked, and nothing was attached or asked of the person
 *   3b WHAT IT SAYS (the standing picture, lib/workbook/standing, colleague/knows): under the file she is told its HEADLINE — the lead
 *      figure, each month (the part month as part), each line and shift — every figure the generator's own total; a question the
 *      headline answers is answered with NO step and one ask, every figure in it checked as the app's and none marked; a figure the
 *      headline does not hold is marked to check
 *   4  ONLY THE CUSTOMER IN HAND: with another customer in hand a new conversation is told nothing of the file — not its name, not what
 *      it says — and asking by its id is refused in words that say whose it is; archived, it is refused as archived; back in hand, it
 *      answers again
 *   5  ON A DEVICE THAT NEVER READ IT: its cells and its kept file gone from this device, a new conversation is still told what it says,
 *      figure for figure — and asked for its rows, the app says in words they are not here, with no figure
 *   6  the phone: the answer inside the screen
 *
 *   node scripts/acceptance/luna-knows.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'lkn-'));
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', join(dir, 'v1.xlsx')], { stdio: 'ignore' });
const V1 = readFileSync(join(dir, 'v1.xlsx'));
const EXP = JSON.parse(readFileSync(join(dir, 'v1.xlsx.expected.json'), 'utf8'));
const LINK = 'https://1drv.ms/x/c/abc123def/EaBcDeFgHiJ?e=Xy12Zz';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-expose-headers': 'x-link-name, x-link-kind, x-link-service, x-link-host, x-link-etag, x-link-modified, x-link-size' };
let plan = [];
const bodies = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task !== 'colleague') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  bodies.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? await next(body) : { ok: true, reply: 'Noted.' }) });
});
await page.route('**/functions/v1/link', async r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/octet-stream', 'x-link-name': encodeURIComponent('Shift report September.xlsx'), 'x-link-kind': 'zip', 'x-link-service': 'onedrive', 'x-link-host': 'my.microsoftpersonalcontent.com' }, body: V1 });
});
const calls = (...cs) => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const got = (b, id) => b.pending?.results?.find(x => x.id === id);
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const finished = async (n, ms = 30000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking') && !document.querySelector('.ai-turn.is-colleague .ai-avatar.is-thinking') && !document.querySelector('.ai-words[data-ai-growing]'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(600);
};
const newConversation = async () => {
  await page.getByRole('button', { name: /New (chat|conversation)/ }).filter({ visible: true }).first().click().catch(async () => {
    await page.locator('.ai-head-acts').getByRole('button', { name: /^More/ }).click(); await page.getByRole('menuitem', { name: /New conversation/ }).first().click();
  });
  await page.waitForTimeout(1200);
};
const conversations = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague && !x.deletedAt).length);
const n2 = x => Math.round(x * 100) / 100;

/* ---- 1 · read by its link, in one conversation ---- */
await t.go('#/ai', 3000);
await page.locator('.ai-plus').click(); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="link"]').click(); await page.locator('[data-link-sheet]').waitFor({ timeout: 10000 });
await page.locator('[data-link-url]').fill(LINK);
const b1 = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
await page.locator('[data-link-read]').click();
await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, b1, { timeout: 60000 }).catch(() => undefined);
await page.waitForTimeout(800);
const src = await page.evaluate(async () => { const d = await import('/src/db.ts'); const s = (await d.listAllStudies()).find(x => x.tool === 'source' && !x.deletedAt); return s ? { id: s.id, name: s.facts.source.name, client: s.facts.source.client } : null; });
ok(!!src && src.client === 'Branston', `1 a workbook read by its link in one conversation — ${src?.client}’s (“${src?.name}”)`);
const c1 = await conversations();

/* ---- 2 · a new conversation, nothing attached: what she is told ---- */
await newConversation();
let sourceId = '', R = '';
plan = [
  b => {
    /* the id is read from what she is told, exactly as she would read it */
    sourceId = /\[source ([^\]\s]+)\]/.exec(b.focus ?? '')?.[1] ?? '';
    return calls(['f', 'source_fields', { source: sourceId }], ['q', 'query_data', { source: sourceId, sheet: 'Shift report', title: 'Variance £ by line', groupBy: ['Line'], measures: [{ op: 'sum', column: 'Variance £' }] }]);
  },
  b => {
    const res = got(b, 'q');
    R = res?.data?.resultId ?? '';
    const says = String(res?.says ?? '');
    const fig = l => /* the app's own figure for the line, as it said it */ (new RegExp(`${l}: (-?[\\d,]+(?:\\.\\d+)?)`).exec(says)?.[1] ?? '?');
    return { ok: true, reply: `Line 3 is furthest behind at ${fig('Line 3')}, then Line 1 at ${fig('Line 1')} and Line 2 at ${fig('Line 2')} — that is the “Variance £” column of the shift report, added up by line.` };
  },
];
const before = bodies.length;
await send('What is the variance in pounds by line?');
await finished(1);
const first = bodies[before];
const focus = String(first?.focus ?? '');
const told = focus.split('\n').find(l => l.includes(`[source ${src?.id}]`)) ?? '';
ok((await conversations()) === c1 + 1 && first?.turns?.length === 1 && first.turns[0].text === 'What is the variance in pounds by line?', `2 a new conversation, one question, nothing else said (${first?.turns?.length} turn sent)`);
ok(told.includes(`“${src?.name}”`) && /holds Shift report \(270 rows\), Lines \(3 rows\)/.test(told) && /about Branston/.test(told) && sourceId === src?.id, `2 Luna is told what she is linked to for the customer in hand: ${told.trim().slice(0, 190)}`);
ok(!/Workbooks attached/.test(focus) && (await page.locator('.ai-turn [data-workbook]').count()) === 0, '2 no workbook is attached to this conversation — she is told it from the register alone');

/* ---- 3 · answered from it ---- */
const kept = await page.evaluate(async id => { const d = await import('/src/db.ts'); const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; const turn = [...s.facts.turns].reverse().find(x => x.kind === 'reply'); return { result: (s.facts.results ?? []).find(r => r.id === id)?.result, used: (turn.used ?? []).map(u => `${u.name}:${u.status}`), unsure: turn.unsure ?? [], checked: turn.checked ?? 0, text: turn.text }; }, R);
const byLine = Object.fromEntries((kept.result?.groups ?? []).map(g => [g.key[0], n2(g.values[0])]));
ok(JSON.stringify(Object.keys(byLine).sort()) === JSON.stringify(['Line 1', 'Line 2', 'Line 3']) && ['Line 1', 'Line 2', 'Line 3'].every(l => byLine[l] === n2(EXP.byLine[l])) && n2(kept.result?.totals?.[0] ?? 0) === n2(EXP.variance),
  `3 from that id alone the app answers, each line the generator’s own total: ${JSON.stringify(byLine)} · all ${n2(kept.result?.totals?.[0] ?? 0)}`);
ok(JSON.stringify(kept.used) === JSON.stringify(['source_fields:done', 'query_data:done']) && kept.unsure.length === 0 && kept.checked >= 3 && (await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-fig-check]').count()) === 0,
  `3 every figure in her answer is checked against the app’s working (${kept.checked}), none marked`);
ok(/Line 3 is furthest behind at -?26,69[12]/.test(kept.text) && (await page.locator('.ai-turn:not(.is-colleague)').count()) === 1, '3 answered in her words — and nothing was attached, named or asked of the person');

/* ---- 3b · what it SAYS: the headline told with the question, and a question it answers needs no step ---- */
const pounds = v => `−£${Math.abs(Math.round(v)).toLocaleString('en-GB')}`;   /* as the first look writes a figure in pounds */
const saysLine = /It says: ([^\n]+)/.exec(focus)?.[1] ?? '';
const tot = /“Variance £” comes to (−£50,36[89]) over 270 rows of “Shift report”/.exec(saysLine)?.[1] ?? '';
ok(!!tot && Math.abs(Math.abs(EXP.variance) - Number(tot.replace(/[^\d]/g, ''))) <= 1, `3b under the file she is told what it SAYS — its lead figure the generator’s total: ${saysLine.slice(0, 120)}…`);
ok(saysLine.includes(`by month: August 2026 ${pounds(EXP.byMonth['2026-08'])} · September 2026 (part, ${EXP.daysByMonth['2026-09']} days) ${pounds(EXP.byMonth['2026-09'])}`),
  `3b …each month, the part month said as part: August ${pounds(EXP.byMonth['2026-08'])} · September (part, ${EXP.daysByMonth['2026-09']} days) ${pounds(EXP.byMonth['2026-09'])}`);
ok(['Line 1', 'Line 2', 'Line 3'].every(l => saysLine.includes(`${l} ${pounds(EXP.byLine[l])}`)) && /by “Line”: Line 3 /.test(saysLine) && ['Days', 'Nights'].every(k => saysLine.includes(`${k} ${pounds(EXP.byShift[k])}`)),
  `3b …and each line and shift, biggest first: Line 3 ${pounds(EXP.byLine['Line 3'])} · Line 1 ${pounds(EXP.byLine['Line 1'])} · Line 2 ${pounds(EXP.byLine['Line 2'])}; Nights ${pounds(EXP.byShift.Nights)} · Days ${pounds(EXP.byShift.Days)}`);
ok(/“It says” under a file is its headline, worked by the app when it was read/.test(focus), '3b …with how it is to be used said beside it');
const lastTurn = () => page.evaluate(async () => { const d = await import('/src/db.ts'); const c = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; const turn = [...c.facts.turns].reverse().find(x => x.kind === 'reply'); return { used: (turn.used ?? []).length, unsure: turn.unsure ?? [], checked: turn.checked ?? 0, text: turn.text }; });
plan = [b => {
  /* she answers from what she was told with the question — the figures read off it, exactly as written */
  const told3 = /It says: ([^\n]+)/.exec(b.focus ?? '')?.[1] ?? '';
  const f = re => re.exec(told3)?.[1] ?? '?';
  return { ok: true, reply: `From the headline of “${src?.name}” as it was read: the variance comes to ${f(/comes to (−£[\d,]+)/)} — ${f(/August 2026 (−£[\d,]+)/)} in August and ${f(/September 2026 \(part, 14 days\) (−£[\d,]+)/)} in the 14 days of September it holds. Line 3 carries the most of it, ${f(/Line 3 (−£[\d,]+)/)}.` };
}];
const b3 = bodies.length;
await send('And in total — how far behind are we?');
await finished(2);
const direct = await lastTurn();
ok(bodies.length === b3 + 1 && direct.used === 0, `3b a question the headline answers is answered with no step and one ask (${bodies.length - b3} ask, ${direct.used} steps)`);
ok(direct.unsure.length === 0 && direct.checked >= 4 && direct.text.includes(tot) && direct.text.includes(pounds(EXP.byLine['Line 3'])) && (await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-fig-check]').count()) === 0,
  `3b …every figure in it checked as the app’s own (${direct.checked}), none marked: “${direct.text.slice(0, 150)}…”`);
/* she says it, the app's check sends it back to her once (the second look, luna-second-look.mjs), and she says it again */
plan = [() => ({ ok: true, reply: 'October came in at −£12,345 on the same report.' }), () => ({ ok: true, reply: 'October came in at −£12,345 on the same report.' })];
const bOct = bodies.length;
await send('And October?');
await finished(3);
const made = await lastTurn();
ok(bodies.length === bOct + 2 && String(bodies[bOct + 1]?.turns?.slice(-1)[0]?.text ?? '').includes('found nowhere in what the app worked out, what the person said or what you were told: 12,345'), '3b a figure the headline does not hold is sent back to her by the app’s check, named');
ok(made.unsure.includes('12,345'), `3b …and, said again, is marked for the person to check (${JSON.stringify(made.unsure)})`);

/* ---- 4 · only the customer in hand ---- */
const ask = (input, conv) => page.evaluate(async ({ input }) => { const reg = await import('/src/capabilities/registry.ts'); const d = await import('/src/db.ts'); const c = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; const r = await reg.runCall({ now: Date.now(), level: 'owner', conversationId: c?.id }, { id: 'x', name: 'query_data', input }, { confirmed: false }); return r.ok ? `OK: ${r.says}` : r.why; }, { input, conv });
const Q = { source: src?.id, sheet: 'Shift report', title: 'Variance £ by line', groupBy: ['Line'], measures: [{ op: 'sum', column: 'Variance £' }] };
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).addCustomer('Cobb Foods', 'York'); });   /* …and it is the one in hand */
await newConversation();
plan = [() => ({ ok: true, reply: 'Nothing of that is in hand here.' })];
const b4 = bodies.length;
await send('What is the variance in pounds by line?');
await finished(1);
const focus4 = String(bodies[b4]?.focus ?? '');
ok(!focus4.includes(src?.id ?? 'x') && !focus4.includes('Shift Report September') && !focus4.includes('It says') && !focus4.includes(tot) && /working in: Cobb Foods/.test(focus4), '4 with Cobb Foods in hand, a new conversation is told nothing of Branston’s file — not its name, not what it says');
const other = await ask(Q);
ok(!other.startsWith('OK:') && /belongs to Branston/.test(other) && /not the customer in hand/.test(other), `4 …and asking by its id is refused, saying whose it is: “${other.slice(0, 170)}”`);
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).archiveCustomer('Branston'); });
const archived = await ask(Q);
ok(!archived.startsWith('OK:') && /Branston, which is archived/.test(archived), `4 archived, it is refused as archived: “${archived.slice(0, 170)}”`);
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).continueCustomer('Branston'); (await import('/src/lib/activeClient.ts')).setActiveClient('Branston'); });
const back = await ask(Q);
ok(back.startsWith('OK:') && /Line 3: -?26,69[12]/.test(back), '4 continued and in hand again, it answers again');

/* ---- 5 · on a device that never read it: the headline is on the record, not in the cells ---- */
await page.evaluate(async () => {
  const r = await navigator.storage.getDirectory(); try { await r.removeEntry('workbooks', { recursive: true }); } catch { /* none */ }
  const d = await import('/src/db.ts'); const { deleteBlobs } = await import('/src/db/blobs.ts');
  for (const x of (await d.listAllStudies()).filter(y => y.tool === 'source')) { const keys = (x.facts.docPhotos ?? []).filter(e => e.field === 'workbook-file').map(e => e.blobKey); if (keys.length) await deleteBlobs(keys); }
});
await page.reload(); await page.waitForTimeout(3000);
await t.go('#/ai', 2500);
await newConversation();
plan = [() => ({ ok: true, reply: 'Noted.' })];
const b5 = bodies.length;
await send('How far behind are we on the shift report?');
await finished(1);
const says5 = /It says: ([^\n]+)/.exec(String(bodies[b5]?.focus ?? ''))?.[1] ?? '';
ok(says5 === saysLine && says5.includes(tot), '5 its cells and its kept file gone from this device: a new conversation is still told what it says, figure for figure');
const noRows = await ask(Q);
ok(/(could not be fetched|on its way|not on this device)/.test(noRows) && !/\d{3,}/.test(noRows.replace(/50 MB|\d{1,2} November/g, '')), `5 …and asked for its rows, the app says in words they are not here, with no figure: “${noRows.slice(0, 190)}”`);

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
ok((await t.wide()) <= 1, '6 the phone: nothing off the side');

await t.finish('Asked with nothing attached, accepted: in a new conversation Luna is told the files she is linked to for the customer in hand and what each SAYS — its headline, every figure the generator’s — so a question it answers needs no step; the app answers anything finer from the file by its id alone, every figure checked; never from another customer’s or an archived customer’s; and on a device that never read the file she still knows what it says.');
