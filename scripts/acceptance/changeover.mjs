/* ACCEPTANCE — F: THE CHANGEOVER AND ITS INTERVAL, INSIDE A CHANGE
 * (docs/TOOLKIT.md, tool 6; docs/BUILD.md, tool F).
 *
 * The ops lead's sentence, the one the tool exists to let them say: "42 min
 * now. With the 15 min of external work done while the line runs: 27 min —
 * 90 min a week back, 6 changeovers. Five products at 42 min run every 1.4
 * days; at 27 min, every 0.9 — daily." The story, driven in a real browser
 * on the seeded job (Line 2 commissioning; Line 7's Tesco Express 1.25 kg
 * standard on it) with the real controls, on a phone where the floor uses it:
 *
 *   1  a new changeover from the tool's page asks the two products (the line
 *      optional) — and one started from the product's standard lands on its
 *      line, its job and its standard
 *   2  Lap two steps on the phone, each tapped Internal or External — timed,
 *      the time between taps
 *   3  type the rest; the strip, the sentence and the split bar's minutes
 *      read as the module says
 *   4  the interval: the products offered from the line's standards with
 *      their rates, the day from the balance's planned hours — the interval
 *      sentence as the module says
 *   5  Make it better from an external step — a fix in the step's own figure,
 *      the changeover its evidence naming the step, the step wearing the branch
 *   6  Set as the standard — the agreed sequence on the product's standard,
 *      and the standard's page shows it
 *   7  Prove it — the same changeover timed again: the steps carried, Lap
 *      times the one up next; the pre-staged step taken out of the stop; the
 *      rest timed or typed again
 *   8  before → after on the fix — the step first, then the minutes and the
 *      week they buy back
 *   9  the client report's PDF, read back: the fix's before → after, and the
 *      Evidence appendix with the changeover as a table and its figures in words
 *  10  the line's card on the 6M job and its fishbone: the changeover offered
 *      on Method and Machine; accepted, the cause says where it came from
 *   and a client reads the changeover and changes nothing.
 *
 * Every sentence is checked against the module that makes it
 * (lib/ie/changeover, lib/studyLinks, lib/fishbone) on the same records.
 * Fails on any console error.
 *
 *   node scripts/acceptance/changeover.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
/* A PHONE: the changeover is timed at the line, one thumb. */
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async (sel, root = page) => ((await root.locator(sel).count()) ? (await root.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : null);
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const id = () => decodeURIComponent(new URL(page.url()).hash.split('changeover/')[1] ?? '').split(/[?&]/)[0];
const card = name => page.locator('.co-step').filter({ has: page.locator('.co-step-n', { hasText: name }) });

/* What the modules say of a changeover as it stands, against its standard. */
const truth = sid => page.evaluate(async sid => {
  const { getStudy, getStandard } = await import('/src/db.ts');
  const C = await import('/src/lib/ie/changeover.ts'); const L = await import('/src/lib/studyLinks.ts');
  const s = await getStudy(sid);
  if (!s) return null;
  const std = s.standardId ? await getStandard(s.standardId) : undefined;
  const agreed = C.agreedFor(std?.capacity?.changeovers, s.facts.fromProduct);
  const f = C.changeoverFigures(s.facts.sequence, s.facts.perWeek);
  const iv = C.intervalOf(f, s.facts.products, s.facts.availableMinPerDay);
  return { id: s.id, name: s.name, uses: s.uses, ws: s.workspaceId, pid: s.projectId, std: s.standardId, closedAt: s.closedAt, facts: s.facts, title: L.studyTitle(s),
    said: C.changeoverSays(f, agreed), iv: C.intervalSays(iv, f).text, now: C.mins(f.nowSec), after: C.mins(f.afterSec), ext: C.mins(f.externalSec), f };
}, sid);

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const J = `#/project/${sd.projectId}`;

/* ---- 1 · a new changeover asks the two products; from the standard, it lands on its line, job and standard ---- */
await go('#/changeover');
await page.getByRole('button', { name: 'New changeover' }).first().click(); await page.waitForTimeout(500);
{
  const sheet = (await page.locator('.lt-new').textContent()) ?? '';
  await page.getByLabel('From which product?').fill('Maris Piper 2kg');
  const waits = await page.getByRole('button', { name: 'Start it' }).isDisabled();
  await page.getByLabel('To which product?').fill('Tesco Express 1.25 kg');
  ok(/From which product\?/.test(sheet) && /To which product\?/.test(sheet) && /optional/.test(sheet) && waits && !(await page.getByRole('button', { name: 'Start it' }).isDisabled()),
    '1 a new changeover: from which product, to which product — Start it waits for both; the line is optional');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
}
await go(`#/w/${sd.wsId}/standards/${sd.lineOnJobId}`);
await page.getByRole('button', { name: 'Time a changeover ›' }).click(); await page.waitForTimeout(1500);
const CO = id();
let t = await truth(CO);
ok(!!CO && t.ws === sd.wsId && t.pid === sd.projectId && t.std === sd.lineOnJobId && t.facts.toProduct === 'Tesco Express 1.25 kg',
  '1 Time a changeover from the Express standard: on Line 7, on the Line 2 job, into its standard');
await page.getByRole('button', { name: 'Change the products' }).click(); await page.waitForTimeout(300);
await page.getByLabel('From — what the line ran').fill('Maris Piper 2kg');
await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(800);
t = await truth(CO);
ok(t.name === 'Maris Piper 2kg → Tesco Express 1.25 kg' && (await words('h1.ie-name'))?.startsWith(t.name), `1 the products named: "${t.name}"`);

/* ---- 2 · Lap two steps on the phone, Internal and External ---- */
await page.getByRole('button', { name: /^Lap — time it/ }).click(); await page.waitForTimeout(300);
const lap = page.locator('.co-lap');
await lap.getByLabel('This step').fill('Stop and clear the former');
await lap.getByRole('radio', { name: /^Internal/ }).click();
await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1300);
await page.getByRole('button', { name: /^Next step/ }).click(); await page.waitForTimeout(400);
await lap.getByLabel('This step').fill('Fetch the next former from the store');
await lap.getByRole('radio', { name: /^External/ }).click(); await page.waitForTimeout(900);
await page.getByRole('button', { name: /^Last step/ }).click(); await page.waitForTimeout(1000);
t = await truth(CO);
{
  const [a, b] = t.facts.sequence ?? [];
  ok(t.facts.sequence.length === 2 && a.side === 'internal' && b.side === 'external' && a.source === 'timed' && b.source === 'timed' && a.sec >= 1 && a.sec < 4 && b.sec >= 0.8 && b.sec < 4 && !!a.at,
    `2 lapped: ${a?.sec} s internal, ${b?.sec} s external — timed, the time between taps`);
}

/* ---- 3 · type the rest; the strip, the sentence and the split bar ---- */
for (const [name, min, side] of [['Change the former tube', '10', 'Internal'], ['Pre-stage the film reels', '7', 'External'], ['Change the film reel', '6', 'Internal'],
  ['Set the jaw temperature', '3', 'Internal'], ['Print the new labels', '3', 'External'], ['First bags and check the seal', '4', 'Internal']]) {
  await page.getByRole('button', { name: '+ Type a step' }).click(); await page.waitForTimeout(300);
  await page.getByLabel('What is done').fill(name);
  await page.locator('[role="dialog"]').last().getByRole('radio', { name: new RegExp(`^${side}`) }).click();
  await page.getByLabel('How long it takes').fill(min);
  await page.getByRole('button', { name: 'Add it' }).click(); await page.waitForTimeout(500);
}
t = await truth(CO);
{
  const typed = t.facts.sequence.filter(x => x.source === 'typed');
  ok(t.facts.sequence.length === 8 && typed.length === 6 && typed.every(x => x.sec === Number(x.sec)) && t.facts.sequence.find(x => x.name === 'Change the former tube')?.sec === 600,
    '3 six more typed — "10" is ten minutes, 600 s; eight steps, three external');
  const says = (await page.locator('.ie-says p.ie-say').allTextContents()).map(x => x.trim());
  ok(says.includes(t.said.text) && (await words('.ie-verdict')) === t.said.verdict, `3 the sentence: "${t.said.text}"`);
  const bars = (await page.locator('.co-bar-n').allTextContents()).map(x => x.trim());
  ok(bars[0] === t.now && bars[1] === t.after && (await words('.co-saved')) === `−${t.ext}`, `3 the split bar: now ${bars[0]}, with the external work outside ${bars[1]}, ${await words('.co-saved')}`);
  ok(await page.locator('.co-bar').first().locator('.co-seg.is-external').count() === 3 && await page.locator('.co-bar').nth(1).locator('.co-seg.is-external').count() === 0,
    '3 the bar now carries the three external steps hatched; the bar under it has none');
}

/* ---- 4 · the interval ---- */
await page.getByRole('button', { name: /List the products and the day/ }).click(); await page.waitForTimeout(500);
{
  const offered = await page.locator('.co-iv-row legend input').evaluateAll(xs => xs.map(x => x.value));
  const rates = await page.locator('.co-iv-row [aria-label$="rate a minute"]').evaluateAll(xs => xs.map(x => x.value));
  const day = await page.getByLabel('The line runs, minutes a day').inputValue();
  ok(offered.includes('Maris Piper 2kg') && offered.includes('Tesco Express 1.25 kg') && rates.includes('60') && rates.includes('50') && day === '450',
    `4 offered from the line: ${offered.join(', ')} at ${rates.join(', ')} a minute; the day ${day} min from the balance's 37.5 h a week`);
  await page.getByLabel('Maris Piper 2kg — demand a day').fill('7200');
  await page.getByLabel('Tesco Express 1.25 kg — demand a day').fill('3000');
  for (const [p, m] of [['Finest Red 2kg', '50'], ['King Edward 2.5kg', '40'], ['Baby potatoes 1kg', '30']]) {
    await page.getByLabel('Another product').fill(p); await page.getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(150);
    await page.getByLabel(`${p} — minutes a day`).fill(m);
  }
  await page.getByLabel('Changeovers a week').fill('6');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(900);
  t = await truth(CO);
  ok(t.facts.products.length === 5 && t.facts.availableMinPerDay === 450 && t.facts.perWeek === 6, '4 saved once, on Save: five products, 450 min a day, six changeovers a week');
  ok((await words('.co-interval')) === t.iv && /^Five products at /.test(t.iv), `4 the interval: "${t.iv}"`);
  ok((await page.locator('.ie-says p.ie-say').first().textContent())?.trim() === t.said.text && / a week back, 6 changeovers\./.test(t.said.text), '4 the week bought back is in the sentence now');
}

/* ---- 5 · Make it better from an external step ---- */
const pre = t.facts.sequence.find(x => x.name === 'Pre-stage the film reels');
await card('Pre-stage the film reels').locator('.co-step-b').click(); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Make it better — raise a fix' }).click(); await page.waitForTimeout(1500);
const fixId = decodeURIComponent(new URL(page.url()).hash.split('open=')[1] ?? '');
{
  const want = await page.evaluate(async ([sid, step]) => (await import('/src/lib/studyLinks.ts')).betterWords(await (await import('/src/db.ts')).getStudy(sid), step), [CO, pre.id]);
  const title = await page.evaluate(async ([pid, fid]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === fid)?.title, [sd.projectId, fixId]);
  t = await truth(CO);
  ok(!!fixId && title === want && want === 'Pre-stage the film reels — external, 7 min' && t.uses.some(u => u.kind === 'fix' && u.ref === fixId && u.role === 'evidence' && u.step === pre.id),
    `5 a fix in the step's own figure: "${title}"`);
  await go(`#/changeover/${CO}`);
  ok(/has-fix/.test(await card('Pre-stage the film reels').getAttribute('class') ?? '') && /being made better/.test(await words('.co-step.has-fix .co-step-f') ?? ''), '5 the step wears the branch, said in words');
}

/* ---- 6 · Set as the standard ---- */
await page.getByRole('button', { name: 'Set as the standard' }).click(); await page.waitForTimeout(1200);
{
  const std = await page.evaluate(async sid => (await (await import('/src/db.ts')).getStandard(sid))?.capacity?.changeovers, sd.lineOnJobId);
  const a = (std ?? []).find(x => x.fromStudyId === CO);
  t = await truth(CO);
  ok(!!a && a.from === 'Maris Piper 2kg' && a.steps.length === 8 && a.minutes === +(t.f.nowSec / 60).toFixed(1) && !!t.closedAt, `6 on the Express standard: ${a?.minutes} min, ${a?.steps.length} steps, from ${a?.from}; the study closed as a receipt`);
  await go(`#/w/${sd.wsId}/standards/${sd.lineOnJobId}`);
  const line = await page.locator('.ls-co-agreed li').allInnerTexts();
  ok(line.some(x => x.includes('Standard from Maris Piper 2kg:') && x.includes(`${t.now} · 8 steps, 3 external`)), `6 the standard shows it: "${line[0]?.replace(/\s+/g, ' ')}"`);
}

/* ---- 7 · Prove it — the same changeover timed again ---- */
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.getByRole('button', { name: 'Prove it — time the changeover again' }).click(); await page.waitForTimeout(1800);
const PR = id();
let tp = await truth(PR);
ok(!!PR && PR !== CO && tp.facts.sequence.length === 8 && tp.facts.sequence.every(x => x.source === 'carried') && tp.uses[0]?.role === 'proof' && tp.facts.products?.length === 5,
  '7 a second changeover, the same eight steps each carried, the products and the week kept');
ok((await words('.ie-says')).includes('8 steps are carried from the changeover before — not timed again yet.'), '7 the page says what is carried');
{
  await page.getByRole('button', { name: /^Lap — time it again/ }).click(); await page.waitForTimeout(300);
  ok(((await words('.co-lap .wb-t-h')) ?? '').includes('up next: Stop and clear the former'), '7 Lap: up next "Stop and clear the former"');
  await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /^Next step/ }).click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Stop/ }).click(); await page.waitForTimeout(600);
  tp = await truth(PR);
  const first = tp.facts.sequence.find(x => x.name === 'Stop and clear the former');
  ok(first?.source === 'timed' && tp.facts.sequence.length === 8, `7 the step up next timed again (${first?.sec} s) — nothing added`);
  /* the reels now pre-staged while the line runs: out of the stop */
  await card('Pre-stage the film reels').locator('.co-step-b').click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Take it off', exact: true }).click(); await page.waitForTimeout(600);
  /* the rest typed again as they stand */
  for (const name of tp.facts.sequence.filter(x => x.source === 'carried' && x.name !== 'Pre-stage the film reels').map(x => x.name)) {
    await card(name).locator('.co-step-b').click(); await page.waitForTimeout(250);
    await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(350);
  }
  tp = await truth(PR);
  ok(tp.facts.sequence.length === 7 && !tp.facts.sequence.some(x => x.source === 'carried') && !tp.facts.sequence.some(x => x.name === 'Pre-stage the film reels'),
    '7 the pre-staged step taken out of the stop; the rest timed or typed again — none carried');
}

/* ---- 8 · before → after on the fix ---- */
const ba = await page.evaluate(async ([pid, fid]) => (await import('/src/lib/studyLinks.ts')).beforeAfter(await (await import('/src/db.ts')).listStudies(pid), fid), [sd.projectId, fixId]);
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.locator('.sl-ba').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(!!ba && /^Pre-stage the film reels: taken out of the changeover\. .* → .* \(−.*\); .* a week back at 6 changeovers\. The number moved/.test(ba.text) && ba.tone === 'g'
  && (await words('.sl-ba')) === `Before → after: ${ba.text}`, `8 before → after: "${await words('.sl-ba')}"`);

/* ---- 9 · the client report's PDF ---- */
await page.setViewportSize({ width: 1360, height: 900 });
await go(`${J}/report`);
await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
const pdf = join(OUT, 'client.pdf'); await dl.saveAs(pdf);
await page.getByRole('button', { name: 'Close' }).last().click().catch(() => {}); await page.waitForTimeout(300);
{
  const txt = pdfText(pdf);
  const san = s => s.replace(/→/g, 'to').replace(/[–—−]/g, '-').replace(/\s+/g, ' ');
  const has = s => san(txt).includes(san(s).slice(0, 60));
  const sheet = await page.evaluate(async ([sid, fid, pid]) => {
    const { getStudy, listTests } = await import('/src/db.ts'); const C = await import('/src/lib/ie/changeover.ts');
    const s = await getStudy(sid); const fx = (await listTests(pid)).find(x => x.id === fid);
    return C.changeoverSheet(s.facts, undefined, new Map(s.uses.filter(u => u.step).map(u => [u.step, fx?.title ?? ''])));
  }, [CO, fixId, sd.projectId]);
  ok(has(`Before to after: ${ba.text}`), '9 the client report: the fix carries its before → after');
  ok(has('Evidence') && has(t.title) && has('HOW KNOWN') && sheet.rows.every(r => has(r.name)) && has('Being made better: Pre-stage the film reels - external, 7 min') && sheet.lines.every(l => has(l)),
    `9 the client report: "${t.title}" in Evidence — its ${sheet.rows.length} steps as a table, the branch off the step, the bars and the interval in words`);
}
await page.setViewportSize({ width: 390, height: 844 });

/* ---- 10 · the 6M job: the line's card and the fishbone ---- */
{
  const line = await page.evaluate(async sid => (await import('/src/lib/studyLinks.ts')).changeoverLine(await (await import('/src/db.ts')).getStudy(sid))?.text, sd.pacedChangeoverId);
  await go(`#/project/${sd.pacedProjectId}?view=lines`);
  ok((await words('.lc-co .lc-bal-t')) === line, `10 the line's card: The changeover — "${line}"`);
  const want = await page.evaluate(async ([pid, cid]) => {
    const { loadProblems } = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const loaded = await loadProblems(pid); const c = loaded.cases.find(x => x.id === cid);
    return F.suggestionsFor(c, loaded.data, Date.now()).filter(s => s.source.kind === 'study' && s.source.tool === 'changeover').map(s => ({ text: s.text, m: s.m }));
  }, [sd.pacedProjectId, sd.oldCaseId]).catch(e => String(e));
  await go(`#/project/${sd.pacedProjectId}/fishbone?problem=${sd.oldCaseId}`);
  const offered = Array.isArray(want) ? await Promise.all(want.map(async w => (await page.locator('button.is-sugg', { hasText: w.text }).count()) > 0)) : [];
  ok(Array.isArray(want) && want.some(w => w.m === 'method') && want.some(w => w.m === 'machine') && offered.every(Boolean),
    `10 the fishbone offers the changeover: ${Array.isArray(want) ? want.map(w => `${w.text.slice(0, 48)}… (${w.m})`).join('; ') : want}`);
  const ext = Array.isArray(want) ? want.find(w => w.m === 'method') : undefined;
  if (ext) {
    await page.locator('button.is-sugg', { hasText: ext.text }).first().click(); await page.waitForTimeout(600);
    const sheet = (await page.locator('[role="dialog"]').last().textContent()) ?? '';
    await page.getByRole('button', { name: 'Add to the fishbone' }).last().click(); await page.waitForTimeout(1000);
    const c = await page.evaluate(async ([cid, txt]) => ((await (await import('/src/db.ts')).getCase(cid))?.causes ?? []).find(x => x.text === txt), [sd.oldCaseId, ext.text]);
    ok(/The changeover: /.test(sheet) && c?.source?.tool === 'changeover' && c.m === 'method', `10 accepted: on ${c?.m}, "The changeover" where it came from`);
  }
}

/* ---- a client reads the changeover and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/changeover/${PR}`);
await page.locator('.co-steps, .ie-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const doors = await page.locator('.co').getByRole('button', { name: /^Lap|^\+ Type a step|^Set as the standard|Change the products|List the products|Change the products and the day|^Rename/ }).allInnerTexts();
  const sides = await page.locator('.co-side .chip').evaluateAll(xs => xs.filter(x => !x.disabled).length);
  ok((await page.locator('.co-step').count()) > 0 && doors.length === 0 && sides === 0, `a client reads the changeover and changes nothing${doors.length || sides ? ` — found: ${doors.join(', ')}, ${sides} side chips live` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nF accepted: a changeover and its interval hold, inside a change');
process.exit(failed ? 1 : 0);
