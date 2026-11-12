/* LUNAR'S KNOWLEDGE — findings, outcomes, history, people's words and the factory, as one loop (12 November, docs/LUNAR-KNOWLEDGE.md —
 * Rowland: "Luna must learn from evidence and experience, not simply accumulate opinions … retain contradictory evidence … recognise when
 * an earlier finding or assumption was wrong, rather than quietly rewriting history"). Two lines of one customer (Branston) and one of
 * another (Brook Dairy), each with stops of known age; on Line K1 a problem "Bags jamming" closed 30 days ago on the Bagger for Jam:
 *   1  the line's What LUNAR has found: each finding with its standing — Found, nobody has said more yet — kept as a versioned claim
 *   2  Did the fixes work? — the fix's verdict and sentence equal to lib/knowledge outcomesOn on the same records (14 before, 3 after:
 *      Improved), what was said when it was closed beside it as reported
 *   3  Disagree… — the words, "I believe it, or was told", a role: the standing now "A person disputes this — not proven", the person
 *      named; kept in the ledger as a review, reported, by them; written again with other words — the ledger keeps the first (never
 *      rewritten); still there after a reload
 *   4  Investigate — the problem sheet saying where it came from, the finding's words in it; saved — the problem carries the finding
 *   5  Across this customer's lines — Jam on the Bagger on both Branston lines, said once; Brook Dairy's line never in it
 *   6  the machine page's What has been tried — the summary equal to lib/knowledge historyOf, the fix and the person's words in time order
 *   7  a business's viewer: the findings and verdicts shown, no Agree, Disagree or Investigate
 *   8  the phone: nothing off the side, the presses 44 px
 *   node scripts/acceptance/knowledge.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { openLineMore } from '../lib/lineMore.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'dave.engineer@example.com', app_metadata: {}, user_metadata: { } } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ms = 3200) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); await openLineMore(page); };
await go('#/room', 1500);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const DAY = 86_400_000, t = Date.now(), uid = () => crypto.randomUUID();
  const mk = async (name, client) => { const w = await db.createWorkspace(name); await db.updateWorkspace({ ...w, clientName: client, assets: ['Bagger', 'Wrapper'] }); return w.id; };
  const k1 = await mk('Line K1', 'Branston'), k2 = await mk('Line K2', 'Branston'), k3 = await mk('Line K3', 'Brook Dairy');
  const stop = (ws, ago, asset, category, min = 5) => db.addObservation({ id: uid(), workspaceId: ws, category, asset, startedAt: t - ago * DAY, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t });
  for (let d = 60; d >= 0; d--) await stop(k1, d + 0.3, 'Wrapper', 'Film');
  for (let d = 57; d > 30; d -= 2) await stop(k1, d + 0.6, 'Bagger', 'Jam');          // 14 in the 28 days before the fix
  for (const d of [3, 5, 9]) await stop(k1, d + 0.6, 'Bagger', 'Jam');                 // 3 after, recurring now
  for (const d of [1, 4, 8]) await stop(k2, d + 0.6, 'Bagger', 'Jam');                 // the same pattern on Line K2
  for (const d of [1, 4, 8]) await stop(k3, d + 0.6, 'Bagger', 'Jam');                 // and on another customer's line
  const fixAt = t - 30 * DAY;
  await db.addSnag({ id: 'kn-fix', workspaceId: k1, problem: 'Bags jamming at the Bagger', targetAsset: 'Bagger', targetCategory: 'Jam', status: 'closed', closedAt: fixAt, closeNote: 'Guide replaced', owner: 'Ann', raisedAt: fixAt - 5 * DAY, updatedAt: fixAt, media: [] });
  return { k1, k2, k3 };
});

/* 1–2 */
await go(`#/lines/${made.k1}`, 4500);
const sec = page.locator('[data-line-findings]');
await page.locator('[data-line-findings] [data-finding="recurs"]').first().waitFor({ timeout: 15000 }).catch(() => {});
ok(await sec.count() === 1, '1 What LUNAR has found on the line');
const recur = sec.locator('[data-finding="recurs"]').filter({ hasText: 'Jam on the Bagger' }).first();
ok(await recur.count() === 1 && /Found — nobody has said more yet/.test(flat(await recur.locator('.lf-standing').textContent())), '1 a recurring pattern found, its standing "Found — nobody has said more yet"', await recur.textContent().catch(() => ''));
const claimId = await recur.getAttribute('data-claim');
ok(!!claimId, '1 it is a kept claim with an identity');
const want = await page.evaluate(async (ws) => {
  const db = await import('/src/db.ts'); const { outcomesOn } = await import('/src/lib/knowledge/fixes.ts');
  const w = (await db.listWorkspaces()).find(x => x.id === ws);
  return (await outcomesOn(w, Date.now(), { write: false })).map(o => ({ id: o.fix.id, verdict: o.verdict, says: o.says }));
}, made.k1);
const fix = sec.locator('[data-fix="kn-fix"]');
ok(want[0]?.verdict === 'improved' && (await fix.getAttribute('data-verdict')) === 'improved', '2 the fix: Improved, as the outcome check says', JSON.stringify(want));
ok(flat(await fix.locator('.lf-how').textContent()) === flat(want[0]?.says), '2 its sentence is the check’s own', `${await fix.locator('.lf-how').textContent()} || ${want[0]?.says}`);
ok(/closed as “Guide replaced” \(Ann, reported\)/.test(want[0]?.says ?? '') && /before, 14 stops/.test(want[0]?.says ?? '') && /after, 3 stops/.test(want[0]?.says ?? ''), '2 what was said when it was closed kept beside the counts, as reported');

/* 3 */
await recur.locator('[data-lf-disagree]').click();
await page.locator('[data-lf-answer="contradicts"] textarea').fill('It is the film supplier, not the Bagger');
await page.locator('[data-lf-known="reported"]').click();
await page.locator('[data-lf-answer] input[aria-label="Your role"]').fill('Engineer');
await page.locator('[data-lf-keep]').click();
await page.waitForTimeout(2500);
const standing = flat(await sec.locator(`[data-claim="${claimId}"] .lf-standing`).textContent());
ok(/^A person disputes this — not proven/.test(standing) && /disagrees — a person says: “It is the film supplier, not the Bagger”/.test(standing), '3 the standing: a person disputes — not proven, their words beside it', standing);
const review = await page.evaluate(async (id) => { const { listKnowledge } = await import('/src/lib/knowledge/ledger.ts'); return (await listKnowledge()).find(e => e.about === id && e.kind === 'review'); }, claimId);
ok(review?.known === 'reported' && review?.stance === 'contradicts' && review?.role === 'Engineer' && !!review?.by, '3 kept as a review — reported, against the finding, named, with their role', JSON.stringify(review));
const kept = await page.evaluate(async (r) => {
  const { addEntries, listKnowledge } = await import('/src/lib/knowledge/ledger.ts');
  const added = await addEntries([{ ...r, says: 'Changed my mind', updatedAt: Date.now() }]);
  return { added, says: (await listKnowledge()).find(e => e.id === r.id)?.says };
}, review);
ok(kept.added === 0 && kept.says === 'It is the film supplier, not the Bagger', '3 written again with other words — the ledger keeps what was said first (never rewritten)', JSON.stringify(kept));
await go(`#/lines/${made.k1}`, 4000);
ok(/A person disputes this/.test(flat(await sec.locator(`[data-claim="${claimId}"] .lf-standing`).textContent().catch(() => ''))), '3 still there after a reload');

/* 4 */
await sec.locator(`[data-claim="${claimId}"] [data-lf-investigate]`).click();
await page.waitForTimeout(800);
const sheet = page.locator(`[data-raise-finding="${claimId}"]`);
ok(await sheet.count() === 1 && /Raised from What LUNAR found on Line K1 — linked to it/.test(flat(await sheet.textContent())), '4 Investigate opens the problem sheet, saying where it came from');
const words = await page.locator('.qs textarea, .qs input[aria-label="What is the problem"]').first().inputValue().catch(() => '');
ok(/Jam on the Bagger has come back/.test(words), '4 the finding’s words in it, to change', words);
await page.locator('.sheet button.btn-primary, .qs button.btn-primary').filter({ hasText: /^Save/ }).first().click();
await page.waitForTimeout(1500);
const raised = await page.evaluate(async (id) => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.fromFinding === id), claimId);
ok(!!raised && raised.workspaceId === made.k1 && raised.targetAsset === 'Bagger' && raised.targetCategory === 'Jam', '4 saved — the problem carries the finding, its machine and reason', JSON.stringify(raised));

/* 5 */
await go(`#/lines/${made.k1}`, 4500);
const across = flat(await page.locator('[data-across]').textContent().catch(() => ''));
ok(/Jam keeps coming back on the Bagger on 2 lines — Line K1 \(Bagger\), Line K2 \(Bagger\)/.test(across), '5 across this customer’s lines: the same pattern on both Branston lines, said once', across);
ok(!/Line K3/.test(across), '5 Brook Dairy’s line never in it');

/* 6 */
await page.goto(`${BASE}/#/lines/${made.k1}/machine/Bagger`); await page.waitForTimeout(3500);
await page.locator('[data-fold="lmc-history"] .fold-toggle').click(); await page.waitForTimeout(600);
const summary = flat(await page.locator('[data-history-summary]').textContent().catch(() => ''));
const wantSummary = await page.evaluate(async (ws) => {
  const db = await import('/src/db.ts'); const { historyOf } = await import('/src/lib/knowledge/history.ts'); const { outcomesOn } = await import('/src/lib/knowledge/fixes.ts'); const { listKnowledge } = await import('/src/lib/knowledge/ledger.ts');
  const w = (await db.listWorkspaces()).find(x => x.id === ws);
  return historyOf(w.name, { machine: 'Bagger' }, { ledger: await listKnowledge(ws), snags: (await db.listAllSnags()).filter(s => s.workspaceId === ws), outcomes: await outcomesOn(w, Date.now(), { write: false }), studies: (await db.listAllStudies()).filter(s => s.workspaceId === ws) }).summary;
}, made.k1);
ok(summary === flat(wantSummary) && /1 fix since/.test(summary) && /1 improved/.test(summary) && /1 open now/.test(summary), '6 What has been tried — the summary as historyOf says it (a fix improved, one open now)', `${summary} || ${wantSummary}`);
const kinds = await page.locator('[data-history-events] [data-history-kind]').evaluateAll(els => els.map(e => e.getAttribute('data-history-kind')));
ok(['found', 'raised', 'closed', 'outcome', 'said'].every(k => kinds.includes(k)), '6 found, raised, closed, its outcome and the person’s words, in time order', kinds.join(','));

/* 7 */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'viewer'));
await go(`#/lines/${made.k1}`, 4500);
ok(await sec.locator('[data-finding]').count() > 0 && await sec.locator('[data-fix]').count() > 0, '7 a viewer sees the findings and the verdicts');
ok(await sec.locator('[data-lf-agree], [data-lf-disagree], [data-lf-investigate]').count() === 0, '7 and is offered nothing that writes');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* 8 */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${made.k1}`, 4500);
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const small = await sec.locator('.lf-acts .btn').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 43.5).length);
ok(over <= 1 && small === 0, '8 the phone: nothing off the side, the presses 44 px', `over ${over}, small ${small}`);

ok(errors.length === 0, 'no errors on the page', errors.join(' | '));
await browser.close();
console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
