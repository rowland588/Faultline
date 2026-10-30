/* THE TOOL PICTURES (docs/TOOLS-SHOWCASE.md, §2.C, slice TG0): each app tool photographed from its real page.
 *
 * For every tool a record is seeded (src/dev/seed.ts — the same records the acceptance scripts use — plus a richer
 * Line capacity and Line standard of its own), the tool's REAL page for that record is opened in Chromium at a
 * 1280 x 800 desk, and its SIGNATURE VIEW (the chart, the V, the grid, the lanes — with its figures and its verdict
 * where they fit) is cropped by element and written to public/tools/<key>.png at 960 x 600, with a manifest saying
 * what each shows and the commit it was taken from. Every number on a picture is the tool's own module reading the
 * seeded record; nothing is typed onto an image.
 *
 *   node scripts/tool-pictures.mjs                 all fifteen, written to public/tools/      (SMOKE_BASE, as smoke)
 *   node scripts/tool-pictures.mjs chart losses    only these keys
 *   node scripts/tool-pictures.mjs --out DIR       write somewhere else (public/tools is left alone) — for a comparison
 *   node scripts/tool-pictures.mjs --compare       take them all to a temp folder and say which differ from public/tools
 *
 * A picture is the page's own elements, shown by hiding what is not the picture (everything else on the page, the
 * frame, the rail) — the elements are never redrawn. */
import pkg from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { shrink } from './lib/pngShrink.mjs';
const { chromium } = pkg;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'pictures@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools|navigator\.vibrate/i;
const W = 960, H = 600, BUDGET = 120_000, PAD = 16;

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const outIdx = args.indexOf('--out');
const compare = flag('--compare');
const OUT = compare ? mkdtempSync(join(tmpdir(), 'tool-pictures-')) : outIdx >= 0 ? args[outIdx + 1] : join(ROOT, 'public/tools');
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
mkdirSync(OUT, { recursive: true });
const sha = (() => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })();

/* ---------- what to show ---------- */
/* A tool: its route from the seeded ids, what it shows (one line, for the manifest), the selectors that ARE the picture
   (their union is what is cropped; everything else on the page is taken away), some css that frames them, and an
   optional step before. `centre` puts a narrow picture in the middle of the space the 16:10 shape leaves. */
const SHELL_CSS = '.ie-body{display:block !important}.ie-cap-box{display:none !important}.ie-pic{margin:0 auto !important;max-width:680px !important}';
const TOOLS = [
  { key: 'analysis', of: 'An analysis — did a re-calibration change fill time: the five figures, the sentence and the before / after / change picture',
    route: s => `#/analysis/${s.analysisId}`, parts: ['.ln-band', '.ln-tiles', '.ie-says .ie-say', '.ie-pic', '.ln-close'], css: SHELL_CSS },
  { key: 'calc', of: 'A calculator — an acceptance-sampling plan: what it protects, with its operating-characteristic curve',
    route: s => `#/calc/oc-curve/${s.calcOcId}`, parts: ['.calc-tiles', '.calc-picbox'],
    css: '.calc-body{display:block !important}.calc-form{display:none !important}.calc-picbox{max-width:680px !important;margin:0 auto !important}' },
  { key: 'capability', of: 'A capability study — thirty fill weights against the limits, the histogram, Ppk and the give-away',
    route: s => `#/capability/${s.studyId}`, parts: ['.ln-tiles', '.ie-pic'], css: SHELL_CSS },
  { key: 'changeover', of: 'SMED — a changeover as a grid: who does each element, internal and external, and what separating them buys back',
    route: s => `#/smed/${s.changeoverId}`, parts: ['.ln-band', '.co-grid', '.co-ladder-pic'], css: '' },
  { key: 'chart', of: 'A control chart — forty fill weights against limits set from twenty, the signals, the moving range and the CUSUM',
    route: s => `#/chart/${s.chartId}`, parts: ['.ln-tiles', '.ie-pic'], css: SHELL_CSS },
  { key: 'linebalance', of: 'Line capacity — every station beside the bottleneck as the V-curve, against the target',
    route: s => s.capacityRoute, parts: ['.ls-head', '.vc-box'], css: '' },
  { key: 'linestandard', of: 'Line standard — the line drawn on the board: machines, areas and the people placed on them, the bottleneck faded',
    route: s => s.standardRoute, parts: ['.ls-head', '.ls-board-wrap'], ready: () => document.querySelectorAll('.ls-svg rect').length >= 5, css: '.ls-body{display:block !important}.ls-side{display:none !important}' },
  { key: 'linework', of: 'Line balance — the people\'s work stacked against takt, the constraint in red',
    route: s => `#/w/${s.wsId}/standards/${s.lineStandardId}?at=balance&view=work`, parts: ['.ln-tiles', '.ie-pic'], ready: () => (document.querySelector('.wb-svg')?.getBoundingClientRect().width ?? 0) > 500, css: '' },
  { key: 'logs', of: 'A check log — the round: a failed check held open, two done on time, the tiles and the sentence',
    route: s => `#/log/metal-detection/${s.logs['metal-detection']}`, parts: ['.ln-band', '.ln-tiles', '.lg-roundp'], css: '' },
  { key: 'losses', of: 'Loss count — a shift\'s lost minutes: shift by shift against the rate, and where the minutes went',
    route: s => `#/losses/${s.lossId}`, parts: ['.ln-band', '.ln-tiles', '.ln-grid'], css: '' },
  { key: 'reliability', of: 'Reliability — stops against watched hours and the running time between them, with MTBF',
    route: s => `#/reliability/${s.reliabilityFamilyId}`, parts: ['.ln-band', '.rl-counted .ie-says', '.rl-graphs'], css: '' },
  { key: 'sampling', of: 'Work sampling — what two people were doing at random moments: each share with its margin',
    route: s => `#/sampling/${s.samplingId}`, parts: ['.ln-tiles', '.ws-round', '.ws-shares'], css: '' },
  { key: 'talk', of: 'Line Talk — the talk on the line: what was said, a photo, a typed line, and the document asked for',
    route: s => `#/talk/${s.talkId}`, parts: ['.tk-turn:nth-child(6)', '.tk-turn:nth-child(7)', '.tk-turn:nth-child(8)', '.tk-bar'],
    css: '.tk-bar{position:static !important;width:auto !important;margin-top:14px !important;border:1px solid var(--line);border-radius:12px}' },
  { key: 'valuestream', of: 'Value stream map — a line\'s door-to-door steps by who does them, value added, necessary and waste',
    route: s => `#/value-stream/${s.lineMapId}`, parts: ['.vs'], css: '' },
  { key: 'video', of: 'Video study — the filmed line read into the work done at each station',
    setup: setupVideo, route: s => s.videoRoute, parts: ['.vid-player', '.vid-tl'], css: '' },
];

/* ---------- the browser ---------- */
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const errors = [];
let page, cdp;
/* every picture is taken on a page of its own: a page that has been resized and photographed a few times stops
   telling the views that measure their own width (the board, the stacks) that they have been resized */
const freshPage = async () => {
  page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  cdp = await ctx.newCDPSession(page);
};
await freshPage();

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const seeded = await page.evaluate(async () => {
  const seed = await import('/src/dev/seed.ts');
  const sd = await seed.seedForSmokeTest();
  return { ...sd, logs: await seed.seedChecksForTest(sd.wsId, sd.projectId) };
});
Object.assign(seeded, await page.evaluate(PICTURE_SEEDS_FN(), { wsId: seeded.wsId }));

/* ---------- the seeds the pictures add: a fuller Line capacity and a fuller Line standard, on the seeded line ---------- */
function PICTURE_SEEDS_FN() {
  return async ({ wsId }) => {
    const { putStandard } = await import('/src/db.ts');
    const uid = () => crypto.randomUUID(), t = Date.now();
    /* FINEST RED 150 g CRISPS — a bagging line in the order the product goes: weigh, bag, code, check, case, pallet */
    const st = (name, kind, unit, contains, o = {}) => ({ id: uid(), name, kind, unit, contains, ...o });
    const stations = [
      st('Multihead weigher', 'machine', 'bags', 1, { rate: 96, ratePer: 'min', source: 'plate' }),
      st('Bagger (VFFS)', 'machine', 'bags', 1, { rate: 84, ratePer: 'min', source: 'plate', runningPct: 94 }),
      st('Date coder', 'machine', 'bags', 1, { rate: 120, ratePer: 'min', source: 'plate' }),
      st('Checkweigher', 'machine', 'bags', 1, { rate: 110, ratePer: 'min', source: 'plate' }),
      st('Case packer', 'machine', 'cases', 12, { rate: 6.2, ratePer: 'min', source: 'timed', runningPct: 91 }),
      st('Palletiser', 'people', 'cases', 1, { cycleSec: 9, perCycle: 1, source: 'timed' }),
    ];
    const capId = uid();
    await putStandard({ id: capId, projectId: '', workspaceId: wsId, product: 'Finest Red 150 g crisps', marks: [],
      capacity: { targetPerMin: 72, vMarginPct: 10, plannedHoursPerWeek: 80, stations }, sort: 20, createdAt: t, updatedAt: t });
    /* the same product's board: the line drawn with shapes, the people placed, the bottleneck faded */
    const shape = (label, x, y, w, h, tone, o = {}) => ({ id: uid(), kind: 'shape', shape: 'rect', x, y, w, h, tone, label, ...o });
    const person = (label, x, y, task, colour) => ({ id: uid(), kind: 'person', x, y, label, task, ...(colour ? { colour } : {}) });
    const arrow = (x, y, w, h) => ({ id: uid(), kind: 'shape', shape: 'arrow', x, y, w, h, tone: 'teal' });
    const stdId = uid();
    await putStandard({ id: stdId, projectId: '', workspaceId: wsId, product: 'Finest Red 150 g — packing line', board: 'wide', sort: 21, createdAt: t, updatedAt: t,
      marks: [
        shape('Multihead weigher', 12, 24, 16, 20, 'blue'), shape('Bagger (VFFS)', 34, 24, 16, 20, 'blue'), shape('Date coder', 54, 24, 12, 20, 'blue'),
        shape('Checkweigher', 72, 24, 15, 20, 'blue'), shape('Case packer and pallet', 62, 68, 32, 26, 'green', { fill: 'faded', bottleneck: true }),
        shape('Chilled store', 14, 72, 22, 20, 'grey'), arrow(21, 36, 7, 0), arrow(43, 36, 6, 0), arrow(61, 36, 6, 0), arrow(79, 48, 0, 8),
        person('Op 1', 12, 46, 'Feed film, change reels', 'blue'), person('Op 2', 38, 46, 'Seal checks every 30 min', 'teal'),
        person('Op 3', 55, 76, 'Case and tray loading', 'orange'), person('Op 4', 73, 74, 'Pallet build and wrap', 'purple'),
      ] });
    return { capacityRoute: `#/w/${wsId}/standards/${capId}?at=balance`, standardRoute: `#/w/${wsId}/standards/${stdId}` };
  };
}


/* ---------- the video study: footage whose times are known, made in the page (src/dev/videoSynth.ts, as
   scripts/acceptance/video-study.mjs does), uploaded through New, read on the device, every piece accepted ---------- */
async function setupVideo() {
  await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
  const lineId = await page.evaluate(async () => (await (await import('/src/db.ts')).createWorkspace('Line 4')).id);
  const made = await page.evaluate(async () => {
    const { makeLineVideo } = await import('/src/dev/videoSynth.ts');
    const r = await makeLineVideo({ durationSec: 32, fps: 25, seed: 5, stations: [
      { label: 'Workstation 1', firstSec: 1.5, workSec: 4, cycleSec: 8, jitterSec: 0.3 },
      { label: 'Workstation 2', firstSec: 2.5, workSec: 6, cycleSec: 8, jitterSec: 0.3 },
      { label: 'Workstation 3', firstSec: 3.5, workSec: 3, cycleSec: 8, jitterSec: 0.3 },
    ] });
    const buf = new Uint8Array(await r.blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const dir = mkdtempSync(join(tmpdir(), 'tool-pictures-video-'));
  const file = join(dir, 'line4.webm'); writeFileSync(file, Buffer.from(made, 'base64'));
  await page.goto(`${BASE}/#/video`); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'New video study' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('The footage', { exact: true }).setInputFiles(file);
  await page.locator('.vid-new [data-fit-headline]').waitFor({ timeout: 60000 });
  await page.getByLabel('What do you want to find out', { exact: true }).fill('Analyse this video for line balance against takt');
  await page.getByLabel('Which line', { exact: true }).selectOption(lineId);
  await page.getByLabel('Its name', { exact: true }).fill('Line 4 — packing, morning');
  await page.getByRole('button', { name: 'Start the study' }).click();
  await page.locator('.vid-study').waitFor({ timeout: 15000 });
  seeded.videoRoute = `#/video/${page.url().split('/video/')[1]}`;
  await page.waitForTimeout(1500);
  await page.getByLabel('How many stations are in view', { exact: true }).selectOption('3'); await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Read the footage' }).click();
  await page.locator('.vid-study[data-state="review"]').waitFor({ timeout: 240000 });
  await page.getByRole('button', { name: 'Accept every one still to review' }).click(); await page.waitForTimeout(900);
}

/* ---------- taking a picture ---------- */
const HIDE_FRAME = 'html,body,.nv,.nv-main,.wrap{background:#f2f5f5 !important;background-image:none !important}.nv-top,.nv-rail,.nv-tabs,.nv-bar,.nv-ctx,.nv-foot,.toast,[class*="toast"]{visibility:hidden !important}';
async function frame(tool) {
  await page.goto(`${BASE}/${tool.route(seeded)}`);
  await page.waitForTimeout(2600);
  if (tool.prep) await tool.prep(page, seeded);
  /* isolate: every element of the page that is not one of the parts, inside one, or around one is taken away */
  const found = await page.evaluate(({ parts, css, hide }) => {
    const st = document.createElement('style'); st.id = 'tp-style'; st.textContent = `${hide}${css}`; document.head.appendChild(st);
    const els = parts.map(sel => document.querySelector(sel));
    const missing = parts.filter((_, i) => !els[i]);
    if (missing.length) return { missing };
    const root = document.querySelector('.nv-main .wrap, .wrap') ?? document.body;
    const keep = e => els.some(p => p === e || p.contains(e) || e.contains(p));
    const prune = e => { for (const c of [...e.children]) { if (!keep(c)) c.style.setProperty('display', 'none', 'important'); else if (!els.some(p => p === c || p.contains(c))) prune(c); } };
    prune(root);
    return { missing: [] };
  }, { parts: tool.parts, css: tool.css, hide: HIDE_FRAME });
  if (found.missing.length) throw new Error(`${tool.key}: not on the page — ${found.missing.join(', ')}`);
  await page.waitForTimeout(500);
  /* pictures that measure their own width draw on the next frames, not at once */
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(1200);
  /* headless Chromium paints only when asked: a throwaway shot makes the page render, so what measures its own
     width (the board, the stacks) has drawn before the real one */
  await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
  await page.waitForTimeout(600);
  await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
  /* and, where a picture says what it needs, until it has it */
  for (let i = 0; tool.ready && !(await page.evaluate(tool.ready)); i++) {
    if (i > 12) throw new Error(`${tool.key}: the picture never finished drawing`);
    await page.waitForTimeout(500); await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
  }
  return page.evaluate(parts => {
    const rects = parts.map(sel => document.querySelector(sel).getBoundingClientRect());
    const x0 = Math.min(...rects.map(r => r.left)), x1 = Math.max(...rects.map(r => r.right));
    const y0 = Math.min(...rects.map(r => r.top)) + scrollY, y1 = Math.max(...rects.map(r => r.bottom)) + scrollY;
    return { x0, x1, y0, y1, scrollY, docH: document.documentElement.scrollHeight };
  }, tool.parts);
}

async function shoot(tool) {
  if (tool.setup && !tool.done) { await tool.setup(); tool.done = true; }
  const b = await frame(tool);
  /* the 16:10 frame around the union of the parts: the shorter side is given room, the picture centred. The width is
     a multiple of 8, so the height is whole and the scale (960 / width) lands on 960 x 600 exactly. */
  const ratio = W / H;
  let w = b.x1 - b.x0 + PAD * 2, h = b.y1 - b.y0 + PAD * 2;
  if (w / h < ratio) w = h * ratio;
  w = Math.ceil(w / 8) * 8; h = (w * H) / W;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const x = Math.max(0, Math.round(cx - w / 2)), y = Math.max(0, Math.round(cy - h / 2));
  /* the page is made tall enough to hold the frame, so nothing is captured "beyond the viewport" (which re-lays the
     page out under the shot and loses a picture that measures its own width) */
  const vh = Math.max(800, Math.ceil(y + h + 8));
  await page.setViewportSize({ width: 1280, height: vh });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(1200);
  /* headless Chromium paints only when asked: a throwaway shot makes the page render, so what measures its own
     width (the board, the stacks) has drawn before the real one */
  await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
  await page.waitForTimeout(600);
  await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: W / w } });
  const raw = Buffer.from(shot.data, 'base64');
  await page.setViewportSize({ width: 1280, height: 800 });
  const dim = [raw.readUInt32BE(16), raw.readUInt32BE(20)];
  if (dim[0] !== W || dim[1] !== H) throw new Error(`taken at ${dim.join(' x ')}, not ${W} x ${H}`);
  const small = raw.length <= BUDGET ? { png: raw, colours: 'all', bytes: raw.length } : shrink(raw, BUDGET);
  writeFileSync(join(OUT, `${tool.key}.png`), small.png);
  return { ...small, raw: raw.length, box: [Math.round(w), Math.round(h)] };
}

const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
let failed = 0;
for (const tool of TOOLS) {
  if (only.length && !only.includes(tool.key)) continue;
  try {
    await page.close(); await freshPage();
    const r = await shoot(tool);
    manifest[tool.key] = { w: W, h: H, of: tool.of, takenFrom: sha };
    console.log(`PASS  ${tool.key.padEnd(13)} ${String(r.bytes).padStart(7)} bytes (${r.colours} colours; raw ${r.raw}) from a ${r.box.join(' x ')} frame`);
  } catch (e) { failed++; console.log(`FAIL  ${tool.key} — ${e.message.split('\n')[0]}`); }
}
const sorted = Object.fromEntries(TOOLS.filter(t => manifest[t.key]).map(t => [t.key, manifest[t.key]]));
writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
if (errors.length) { console.log('console errors:', [...new Set(errors)].slice(0, 6)); failed++; }
await browser.close();

if (compare) {
  const same = [], moved = [];
  for (const t of TOOLS) { const a = join(OUT, `${t.key}.png`), b = join(ROOT, 'public/tools', `${t.key}.png`); (existsSync(a) && existsSync(b) && readFileSync(a).equals(readFileSync(b)) ? same : moved).push(t.key); }
  console.log(`compare: ${same.length} the same, ${moved.length} differ${moved.length ? ` — ${moved.join(', ')}` : ''} (taken to ${OUT})`);
}
console.log(failed ? `${failed} problem(s)` : 'all taken');
process.exit(failed ? 1 : 0);
