/* HOW GOOD THE VIDEO STUDY'S READING IS — measured on footage whose times
 * are known, condition by condition (docs/VIDEO.md, accuracy). Not a
 * pass/fail: it prints what was measured, and writes it as JSON for the
 * record. The footage is made in the page (src/dev/videoSynth) and read by
 * the app's own job (lib/video/runner), then scored by lib/video/evaluate.
 * It is synthetic — a drawn line, not a factory — so it measures the reading
 * itself, not how it does on real footage, which needs permissioned footage
 * timed by hand (docs/VIDEO.md, what is not yet measured). For each, what the
 * footage check says of it (lib/video/assess) and how many events it flagged,
 * and the reading scored again on the events it did not flag.
 *
 *   node scripts/video-eval.mjs [out.json]      # needs a dev server, SMOKE_BASE */
import pkg from 'playwright';
import { writeFileSync } from 'node:fs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const three = [
  { label: 'Workstation 1', firstSec: 1.5, workSec: 4, cycleSec: 8, jitterSec: 0.3 },
  { label: 'Workstation 2', firstSec: 2.5, workSec: 6, cycleSec: 8, jitterSec: 0.3 },
  { label: 'Workstation 3', firstSec: 3.5, workSec: 3, cycleSec: 8, jitterSec: 0.3 },
];
const CONDITIONS = [
  { name: 'clean — three stations, light grain', o: { durationSec: 32, grain: 10, stations: three } },
  { name: 'heavy grain (a dim, noisy camera)', o: { durationSec: 32, grain: 45, stations: three } },
  { name: 'a station busy nine-tenths of the time', o: { durationSec: 32, grain: 10, stations: [three[0], { ...three[1], workSec: 7.2 }, three[2]] } },
  { name: 'short pieces of work (1 s every 3 s)', o: { durationSec: 30, grain: 10, stations: [{ label: 'Workstation 1', firstSec: 1, workSec: 1, cycleSec: 3, jitterSec: 0.1 }, { label: 'Workstation 2', firstSec: 1.8, workSec: 1.2, cycleSec: 3, jitterSec: 0.1 }] } },
  { name: 'six stations in view', o: { durationSec: 32, grain: 10, width: 960, stations: [0, 1, 2, 3, 4, 5].map(i => ({ label: `Workstation ${i + 1}`, firstSec: 1 + i * 0.6, workSec: 2.5 + (i % 3), cycleSec: 7, jitterSec: 0.3 })) } },
  { name: 'flickering lights (every 1.3 s)', o: { durationSec: 32, grain: 10, flicker: 0.12, flickerSec: 1.3, stations: three } },
  /* a camera on a frame that shakes for twelve seconds (docs/VIDEO-DESIGN.md D4): the footage said unfit, the events in it flagged */
  { name: 'a camera that shakes (±4 px, 8–20 s)', o: { durationSec: 32, grain: 10, shake: { fromSec: 8, toSec: 20, px: 4 }, stations: three } },
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
await page.goto(`${BASE}/#/video`); await page.waitForTimeout(2500);
const results = [];
for (const c of CONDITIONS) {
  const r = await page.evaluate(async c => {
    const { makeLineVideo } = await import('/src/dev/videoSynth.ts');
    const db = await import('/src/db.ts');
    const { runJob } = await import('/src/tools/video/runner.ts');
    const { evaluate } = await import('/src/tools/video/evaluate.ts');
    const { probe } = await import('/src/tools/video/extract.ts');
    const { bands } = await import('/src/tools/video/VideoScreen.tsx');
    const { sampleInterval } = await import('/src/tools/video/detect.ts');
    const { newJob } = await import('/src/tools/video/job.ts');
    const { assessFootage } = await import('/src/tools/video/assess.ts');
    const made = await makeLineVideo({ ...c.o, fps: 25, seed: 5 });
    const p = await probe(made.blob, 'eval.webm');
    const key = `video-eval-${Math.random().toString(36).slice(2)}`;
    await db.putBlob(key, made.blob);
    const t = Date.now(), id = `eval-${Math.random().toString(36).slice(2)}`;
    const zones = bands(c.o.stations.length);
    const { READING_VERSION } = await import('/src/tools/video/record.ts');
    const config = { sampleSec: sampleInterval(p.facts.durationSec, p.facts.fps, 2400), readWidth: 160, zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: READING_VERSION };
    await db.putStudy({ id, tool: 'balance', name: c.name, facts: { video: { media: { id: key, blobKey: key, mime: 'video/webm', capturedAt: t }, facts: p.facts, job: newJob(config, t) }, vevents: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    const t0 = performance.now();
    await runJob(id);
    const ms = performance.now() - t0;
    const s = await db.getStudy(id);
    const found = (s.facts.vevents ?? []).map(e => ({ zone: e.zone, start: e.start, end: e.end }));
    const e = evaluate(made.truth, found);
    /* what the footage check says of it (lib/video/assess), and the reading scored on the events it did not flag */
    const a = assessFootage({ kind: 'balance', facts: p.facts, zones, view: 'side-raised', quality: s.facts.video.quality });
    const flagged = (s.facts.vevents ?? []).filter(x => x.flags?.length).length;
    const clear = evaluate(made.truth, (s.facts.vevents ?? []).filter(x => !x.flags?.length).map(x => ({ zone: x.zone, start: x.start, end: x.end })));
    const fit = { verdict: a.verdict, camera: a.checks.find(x => x.id === 'steady')?.found, light: a.checks.find(x => x.id === 'light')?.found, flagged, clearPrecision: clear.detected ? clear.precision : undefined };
    await db.deleteStudy(id); await db.deleteBlobs([key]);
    return { name: c.name, sampleSec: config.sampleSec, readSec: ms / 1000, durationSec: p.facts.durationSec, e, fit, state: s.facts.video.job.state, error: s.facts.video.job.error };
  }, c);
  results.push(r);
  const e = r.e;
  const work = e.stations.map(s => (s.workErr !== undefined ? Math.abs(s.workErr) : NaN)).filter(Number.isFinite);
  const cyc = e.stations.map(s => (s.cycleErr !== undefined ? Math.abs(s.cycleErr) : NaN)).filter(Number.isFinite);
  console.log(`${r.name}\n  ${e.detected} found / ${e.truth} true · precision ${e.precision.toFixed(2)} · recall ${e.recall.toFixed(2)} · duplicates ${e.duplicates} · missed ${e.missed} · start ±${e.startErr.toFixed(2)} s · end ±${e.endErr.toFixed(2)} s · work ±${work.length ? (work.reduce((a, x) => a + x, 0) / work.length).toFixed(2) : '—'} s · cycle ±${cyc.length ? (cyc.reduce((a, x) => a + x, 0) / cyc.length).toFixed(2) : '—'} s · read ${r.readSec.toFixed(0)} s for ${r.durationSec.toFixed(0)} s of footage at ${r.sampleSec} s${r.error ? ` · ${r.error}` : ''}\n  the footage: ${r.fit.verdict} · camera: ${r.fit.camera} · light: ${r.fit.light} · ${r.fit.flagged} of ${e.detected} events flagged · precision of those not flagged ${r.fit.clearPrecision !== undefined ? r.fit.clearPrecision.toFixed(2) : '— (none left)'}`);
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
await b.close();
