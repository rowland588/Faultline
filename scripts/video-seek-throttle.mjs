/* Proof: steady synthetic footage stays steady under CPU throttle when each seek
 * waits for the presented frame (extract Reader.waitPresented). Chromium CDP
 * Emulation.setCPUThrottlingRate — same lead as docs/STATE.md §4 job 2.
 *
 *   SMOKE_BASE=http://127.0.0.1:5191 node scripts/video-seek-throttle.mjs
 *   THROTTLE_RATE=6   # default 4 (1 = off)
 */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const RATE = Number(process.env.THROTTLE_RATE ?? 4);

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await b.newPage();
await page.goto(`${BASE}/#/room`);
await page.waitForTimeout(1500);

const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

const r = await page.evaluate(async () => {
  const { makeLineVideo } = await import('/src/dev/videoSynth.ts');
  const { scanFootage } = await import('/src/tools/video/extract.ts');
  const made = await makeLineVideo({
    durationSec: 32, fps: 25, seed: 5, grain: 10,
    stations: [
      { label: 'Workstation 1', firstSec: 1.5, workSec: 4, cycleSec: 8, jitterSec: 0.3 },
      { label: 'Workstation 2', firstSec: 2.5, workSec: 6, cycleSec: 8, jitterSec: 0.3 },
      { label: 'Workstation 3', firstSec: 3.5, workSec: 3, cycleSec: 8, jitterSec: 0.3 },
    ],
  });
  const scan = await scanFootage(made.blob, 32);
  return { shaking: scan.steady.shaking, moved: scan.steady.moved, windows: scan.steady.windows };
});

await b.close();

const ok = r.shaking < 0.12 && r.moved < 0.15;
console.log(`CPU throttle rate ${RATE}: steady scan shaking=${r.shaking} moved=${r.moved} windows=${r.windows}`);
console.log(ok ? 'PASS  scanFootage on steady footage under throttle' : 'FAIL  camera read as shaking or moved under throttle');
process.exit(ok ? 0 : 1);