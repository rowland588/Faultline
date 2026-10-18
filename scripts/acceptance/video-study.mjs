/* ACCEPTANCE — A VIDEO STUDY, END TO END (docs/VIDEO.md, the first working
 * proof: a line balance read from footage).
 *
 * Footage whose times are known is made in the page (src/dev/videoSynth: a
 * line of three stations, each worker moving only while working, a camera's
 * grain on every frame) and uploaded through the app's own New, from an empty
 * device, in a real browser:
 *
 *   1  uploaded: the file read for what it is, from its bytes — its length,
 *      its picture, its frame rate; what is wanted said in words and read as
 *      a line balance; a line and a job picked; a file that is not a video
 *      refused in words
 *   2  the stations marked; the footage read on the device, its state on the
 *      record; the reading MEASURED against the known times (precision,
 *      recall, boundary error, cycle error) and printed
 *   3  reviewed on the footage: every candidate accepted, one boundary moved
 *      to the playhead (what was proposed kept), one rejected; the figures
 *      counting only what is accepted, provisional said apart
 *   4  the line balance: each station's work and cycle, the people's stacks;
 *      takt asked for in words, then given — over takt said
 *   5  the report: made from the accepted events, on paper — how it was
 *      read, each station, every event with its time and how it is known
 *   6  left and come back: the study, its footage and its decisions there
 *      after a reload; a reading stopped half-way by a reload carries on
 *   7  the footage deleted, what was found kept and said so
 *   and no console error anywhere. */
import pkg from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const txt = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const settle = async () => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); };
const dir = mkdtempSync(join(tmpdir(), 'video-study-'));

await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
const lineId = await page.evaluate(async () => (await (await import('/src/db.ts')).createWorkspace('Line 4')).id);

/* THE FOOTAGE: three stations, a known schedule — 4 s of work every 8 s, 6 s every 8 s, 3 s every 8 s */
const DUR = 32;
console.log('making the footage (it takes as long as it runs)…');
const made = await page.evaluate(async dur => {
  const { makeLineVideo } = await import('/src/dev/videoSynth.ts');
  const r = await makeLineVideo({ durationSec: dur, fps: 25, seed: 5, stations: [
    { label: 'Workstation 1', firstSec: 1.5, workSec: 4, cycleSec: 8, jitterSec: 0.3 },
    { label: 'Workstation 2', firstSec: 2.5, workSec: 6, cycleSec: 8, jitterSec: 0.3 },
    { label: 'Workstation 3', firstSec: 3.5, workSec: 3, cycleSec: 8, jitterSec: 0.3 },
  ] });
  const buf = new Uint8Array(await r.blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { b64: btoa(s), truth: r.truth };
}, DUR);
const file = join(dir, 'line4.webm');
writeFileSync(file, Buffer.from(made.b64, 'base64'));
const notVideo = join(dir, 'line4.webm.pdf.mp4');
writeFileSync(notVideo, Buffer.from('%PDF-1.4\n% not a video at all\n'));
console.log(`footage: ${made.truth.length} pieces of work in ${DUR} s`);

/* 1 — uploaded */
await page.goto(`${BASE}/#/video`); await page.waitForTimeout(1200);
ok(/Video studies/.test(await txt()) && /No video studies yet/.test(await txt()), '1 Video studies, from the rail’s tools: none yet, and how to start');
await page.getByRole('button', { name: 'New video study' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('The footage', { exact: true }).setInputFiles(notVideo); await page.waitForTimeout(1200);
ok(/not a video the app can read/.test(await page.locator('.vid-problems').innerText().catch(() => '')) && await page.getByRole('button', { name: 'Start the study' }).isDisabled(), '1a a file that is not a video — whatever its name says — refused in words', await page.locator('.vid-problems').innerText().catch(() => ''));
await page.getByLabel('The footage', { exact: true }).setInputFiles(file);
await page.locator('.vid-new [data-facts]').waitFor({ timeout: 20000 }).catch(() => {});
const facts = (await page.locator('.vid-new [data-facts]').innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/line4\.webm — 0:3\d\.\d · 640×360/.test(facts), '1b the file read from itself: its length and its picture', facts);
await page.getByLabel('What do you want to find out', { exact: true }).fill('Analyse this video for line balance against takt');
ok(/Read as line balance, with takt\./.test(await page.locator('.vid-new').innerText()), '1c what is wanted, said in words, read as a line balance with takt');
await page.getByLabel('Which line', { exact: true }).selectOption(lineId);
await page.getByLabel('Its name', { exact: true }).fill('Line 4 — packing, morning');
await page.getByRole('button', { name: 'Start the study' }).click();
await page.locator('.vid-study').waitFor({ timeout: 15000 }).catch(() => {});
ok(/#\/video\/[^/?]+$/.test(page.url()) && /Line 4 — packing, morning/.test(await txt()) && /Line 4/.test(await txt()) && /kept on this device only/.test(await txt()), '1d the study opens: its footage, its line, said kept on this device', page.url());
const studyUrl = page.url();
const sid = studyUrl.split('/video/')[1];

/* 2 — the stations, and the reading */
await page.getByLabel('How many stations are in view', { exact: true }).selectOption('3'); await page.waitForTimeout(600);
ok(await page.locator('.vid-zone').count() === 3 && /Workstation 3/.test(await txt()), '2 three stations marked, drawn over the footage');
const t0 = Date.now();
await page.getByRole('button', { name: 'Read the footage' }).click();
await page.locator('.vid-study[data-state="review"]').waitFor({ timeout: 240000 }).catch(() => {});
const readSec = (Date.now() - t0) / 1000;
ok(/Ready for review/.test(await txt()) && /pieces? of work found at 3 of 3 stations/.test(await txt()), '2a read on the device, its state on the record: ready for review', (await txt()).slice(0, 600));
const ev = await page.evaluate(async ({ id, truth }) => {
  const db = await import('/src/db.ts');
  const { evaluate } = await import('/src/lib/video/evaluate.ts');
  const s = await db.getStudy(id);
  const found = (s.facts.vevents ?? []).map(e => ({ zone: e.zone, start: e.start, end: e.end }));
  return { e: evaluate(truth, found), n: found.length, sample: s.facts.video.job.config.sampleSec };
}, { id: sid, truth: made.truth });
console.log(`MEASURED  ${ev.n} found against ${ev.e.truth} true; precision ${ev.e.precision.toFixed(2)}, recall ${ev.e.recall.toFixed(2)}, duplicates ${ev.e.duplicates}, missed ${ev.e.missed}; boundaries off by ${ev.e.startErr.toFixed(2)} s (start) and ${ev.e.endErr.toFixed(2)} s (end) on average, reading every ${ev.sample} s; read in ${readSec.toFixed(0)} s`);
for (const st of ev.e.stations) console.log(`MEASURED  ${st.zone}: work ${st.workTrue?.toFixed(2)} s true, ${st.workRead?.toFixed(2)} s read (${(st.workErr ?? 0) >= 0 ? '+' : ''}${(st.workErr ?? 0).toFixed(2)}); cycle ${st.cycleTrue?.toFixed(2)} true, ${st.cycleRead?.toFixed(2)} read`);
ok(ev.e.precision >= 0.9 && ev.e.recall >= 0.9, '2b measured: at least 90% of what it found was real, and it found at least 90% of the real work', JSON.stringify(ev.e));
ok(ev.e.startErr <= 0.35 && ev.e.endErr <= 0.35, '2c measured: each boundary within 0.35 s of the truth, on average', JSON.stringify(ev.e));

/* 3 — reviewed */
ok(/\d+ to review · 0 accepted/.test(await txt()) && /To review/.test(await txt()), '3 every one a candidate until accepted — none counted yet');
const before = await page.locator('.vid-table tbody').innerText().catch(() => '');
ok(/—/.test(before), '3a the figures count nothing until something is accepted', before);
await page.getByRole('button', { name: 'With those to review (provisional)' }).click(); await page.waitForTimeout(400);
ok(/Provisional — the \d+ still to review are counted as if accepted/.test(await txt()), '3b provisional figures said apart');
await page.getByRole('button', { name: 'Accepted only' }).click();
await page.getByRole('button', { name: 'Accept every one still to review' }).click(); await page.waitForTimeout(900);
ok(/Verified — \d+ events accepted/.test(await txt()), '3c all accepted — verified, said so', (await txt()).slice(0, 300));
/* one boundary moved to the playhead: the first event's end, a fifth of a second later */
const first = page.locator('.vid-ev').first();
const firstId = await first.getAttribute('data-event');
const firstEnd = await page.evaluate(async ({ id, eid }) => (await (await import('/src/db.ts')).getStudy(id)).facts.vevents.find(e => e.id === eid).end, { id: sid, eid: firstId });
await page.evaluate(t => { const v = document.querySelector('.vid-player video'); v.currentTime = t; v.dispatchEvent(new Event('timeupdate')); }, firstEnd + 0.2);
await page.waitForTimeout(500);
await first.getByRole('button', { name: 'End here' }).click(); await page.waitForTimeout(700);
const moved = await page.evaluate(async ({ id, eid }) => (await (await import('/src/db.ts')).getStudy(id)).facts.vevents.find(e => e.id === eid), { id: sid, eid: firstId });
ok(Math.abs(moved.end - (firstEnd + 0.2)) < 0.05 && moved.proposed && Math.abs(moved.proposed.end - firstEnd) < 0.001 && /corrected from/.test(await page.locator(`.vid-ev[data-event="${firstId}"]`).innerText()), '3d a boundary moved to the playhead — what the reading proposed kept, said "corrected from"', JSON.stringify(moved));
/* one rejected: it stays on the record and counts for nothing */
const last = page.locator('.vid-ev').last();
await last.getByRole('button', { name: 'Reject' }).click(); await page.waitForTimeout(700);
ok(await page.locator('.vid-ev[data-review="rejected"]').count() === 1 && /1 rejected/.test(await txt()), '3e one rejected — kept on the record, counting for nothing');

/* 4 — the line balance */
const table = (await page.locator('.vid-table tbody').innerText()).replace(/\s+/g, ' ');
ok(/Workstation 1 Operator A \d\.\d s/.test(table) && /Workstation 2 Operator B \d\.\d s/.test(table) && /Workstation 3 Operator C \d\.\d s/.test(table), '4 each station: its work a cycle, its cycles, its range, its waiting', table);
ok(await page.locator('svg.vid-load [data-station]').count() === 3, '4f each station’s workload drawn before any takt — work and waiting, the slowest darkest');
await page.getByRole('button', { name: 'What do you need to calculate takt?' }).click(); await page.waitForTimeout(300);
ok(/To work out takt I need the demand/.test(await page.locator('.vid-answer').innerText()) && /not known yet/.test(await page.locator('.vid-answer').innerText()), '4b asked in words what takt needs — the demand and the minutes, said not known yet');
await page.getByLabel('How many to make', { exact: true }).fill('600');
await page.getByLabel('Minutes to make them in', { exact: true }).fill('55');
await page.getByRole('button', { name: 'Work out takt' }).click(); await page.waitForTimeout(800);
const says = (await page.locator('.vid-findings').innerText()).replace(/\s+/g, ' ');
ok(/Takt is 5\.5 s a unit/.test(says) && /Workstation 2 is over takt by 0\.\d s — at its pace the demand is not met/.test(says), '4c takt given: 55 minutes for 600 is 5.5 s — the station over it said', says);
ok(await page.locator('.vid-stacks svg').count() >= 1, '4a the people’s work stacked against takt — the line balance’s own Yamazumi');
ok(/Measured Workstation 1 \(Operator A\)/i.test(says) && /Proposed — not measured Moving about .* check the method, the reach and the safety/i.test(says), '4d each line saying how it is known: measured, worked out, proposed — never said to be safe', says);
await page.getByRole('button', { name: 'Review the longest waiting periods' }).click(); await page.waitForTimeout(300);
ok(/^The longest waits: /.test(await page.locator('.vid-answer').innerText()), '4e the longest waits answered from the figures');

/* 5 — the report */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Report', exact: true }).click()]);
const pdfPath = join(dir, 'report.pdf'); await dl.saveAs(pdfPath);
const pdf = execFileSync('pdftotext', ['-raw', pdfPath, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok(/VIDEO STUDY/.test(pdf) && /Line 4 — packing, morning/.test(pdf) && /How it was read/.test(pdf) && /A frame every 0\.\d+ s/.test(pdf), '5 the report: what was asked, of what footage, how it was read', pdf.slice(0, 400));
ok(/Each station/.test(pdf) && /Workstation 2 · Operator B/.test(pdf) && /Takt: 55 minutes a shift × 60 ÷ 600 packs = 5\.5 s a unit/.test(pdf), '5a each station and takt worked out, with its units');
ok(/Every event, on the footage/.test(pdf) && /corrected from/.test(pdf) && /rejected/.test(pdf) && /Measured — /.test(pdf) && /Proposed — not measured — /.test(pdf), '5b every event with its time, how it is known and what was decided; each finding said how it is known');
ok(/Reports made: /.test(await txt()), '5c the report made is kept on the study');

/* 6 — left and come back */
await page.reload(); await page.waitForTimeout(2500);
ok(/Line 4 — packing, morning/.test(await txt()) && await page.locator('.vid-ev[data-review="accepted"]').count() > 0 && await page.locator('.vid-ev[data-review="rejected"]').count() === 1 && await page.locator('.vid-player video').count() === 1, '6 come back to it: the footage, the decisions, the figures where they were');
/* a second reading of new settings, stopped half-way by a reload, carries on */
await page.locator('.vid-settings summary').click();
await page.getByLabel('Sensitivity', { exact: true }).fill('5'); await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Read it again' }).click();
await page.waitForFunction(() => /Reading frame (\d+)/.test(document.body.innerText) && Number(/Reading frame (\d+)/.exec(document.body.innerText)?.[1]) > 40, null, { timeout: 60000 }).catch(() => {});
await page.reload(); await page.waitForTimeout(1500);
await page.locator('.vid-study[data-state="review"]').waitFor({ timeout: 240000 }).catch(() => {});
ok(/Ready for review/.test(await txt()) && await page.locator('.vid-ev[data-review="rejected"]').count() === 1 && /corrected from/.test(await txt()), '6a a reading stopped by a reload carries on to the end — the person’s decisions kept through it');

/* 7 — the footage deleted */
page.once('dialog', d => void d.accept());
await page.getByRole('button', { name: 'Delete the footage' }).click(); await page.waitForTimeout(1200);
ok(/The footage was deleted by/.test(await txt()) && await page.locator('.vid-ev').count() > 0 && await page.locator('.vid-player video').count() === 0, '7 the footage deleted — what was found in it kept, and said so');

await page.goto(`${BASE}/#/video`); await page.waitForTimeout(1200);
ok(/Line 4 — packing, morning/.test(await txt()) && /Line balance · 0:3\d\.\d of footage · Line 4/.test(await txt()), '7a on the list: its kind, its footage and its line');

/* 8 — from a method's step: Faultline's "Rebalance the people on a line" run
   on Line 4; its line balance step offers the line's video study, and one read
   from a video of the line is attached to the step as it is made (ui/flow/Asking) */
const sheet = () => page.getByRole('dialog').last();
const sheetTxt = async () => (await sheet().innerText()).replace(/\s+/g, ' ');
await page.goto(`${BASE}/#/methods`); await page.waitForTimeout(1500);
await page.locator('.fw-card[data-library="line-rebalance"]').getByRole('button', { name: 'Use it as it is' }).click(); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /^Approve version 1$/ }).click(); await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Start a project on it' }).click(); await page.waitForTimeout(800);
await page.getByLabel("The project's name", { exact: true }).fill('Line 4 rebalanced');
await page.getByLabel('On which line', { exact: true }).selectOption(lineId);
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.fw-row[data-step="balance-now"]').waitFor({ timeout: 15000 }).catch(() => {});
const job = page.url().split('?')[0];
const pid = job.split('/project/')[1];
await page.locator('.fw-row[data-step="balance-now"]').click();
await sheet().locator(`.fw-tool-c[data-study="${sid}"]`).waitFor({ timeout: 15000 }).catch(() => {});
ok(/Answered by Line balance/i.test(await sheetTxt()) && await sheet().locator(`.fw-tool-c[data-study="${sid}"]`).count() === 1 && await sheet().locator('[data-also="/video"]').count() === 1,
  '8 a method’s line balance step offers the line’s video study, and to read one from a video', await sheetTxt());
await sheet().getByRole('button', { name: 'Read it from a video of the line' }).click();
await page.locator('.vid-new .fw-asking').waitFor({ timeout: 15000 }).catch(() => {});
const ask8 = (await page.locator('.vid-new .fw-asking').innerText().catch(() => '')).replace(/\s+/g, ' ');
/* the factory's lines arrive a moment after the sheet opens */
await page.waitForFunction(lid => [...document.querySelectorAll('.vid-new select[aria-label="Which line"]')].some(x => x.value === lid), lineId, { timeout: 10000 }).catch(() => {});
const forJob = await page.getByLabel('For a job', { exact: true }).inputValue().catch(() => '');
const onLine = await page.getByLabel('Which line', { exact: true }).inputValue().catch(() => '');
ok(/#\/video\?add=1&line=/.test(page.url()) && /For “Time the line balance” on Line 4 rebalanced/.test(ask8) && forJob === pid && onLine === lineId,
  '8a the video study’s New, saying the step it answers, on the job and its line', `${page.url()} | ${ask8} | ${forJob} | ${onLine}`);
await page.getByLabel('The footage', { exact: true }).setInputFiles(file);
await page.locator('.vid-new [data-facts]').waitFor({ timeout: 20000 }).catch(() => {});
await page.getByLabel('Its name', { exact: true }).fill('Line 4 — filmed for the job');
await page.getByRole('button', { name: 'Start the study' }).click();
await page.locator('.toast', { hasText: 'Attached to' }).waitFor({ timeout: 15000 }).catch(() => {});
const sid8 = page.url().split('/video/')[1] ?? '';
ok(/#\/video\/[^/?]+$/.test(page.url()) && /Attached to “Time the line balance” on Line 4 rebalanced/.test(await page.locator('.toast').innerText().catch(() => '')),
  '8b made: the study opens, said attached to the step');
await settle();
await page.locator('.toast').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
await page.goto(job); await page.waitForTimeout(1500);
await page.locator('.fw-row[data-step="balance-now"]').click();
await sheet().locator('.fw-tool-r').waitFor({ timeout: 15000 }).catch(() => {});
const kept = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id))?.projectId, sid8);
ok(/Line 4 — filmed for the job/.test(await sheet().locator('.fw-tool-r').innerText().catch(() => '')) && kept === pid,
  '8c the step answered by the video study made from it, and the study on the job', `${await sheetTxt()} | ${kept}`);
await page.keyboard.press('Escape'); await settle();
ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
