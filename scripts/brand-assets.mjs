/* THE MARK, EVERY SIZE, FROM ONE DRAWING.
 *
 * Rowland: "the PWA app install — at the moment that's green with a white
 * pulse mark. I want that changed to how the landing page looks." So the tile
 * is the landing's white-into-pale-cyan and the trace is its graphite into
 * teal (the fresh look, 17 October; it was navy into blue).
 *
 * Renders the install icons (any + maskable), the iOS home-screen icon and the
 * link preview (og.png) with the Chromium already on the machine, so they can
 * be redrawn in one go and never drift from each other or from ui/Logo.tsx.
 *
 *   node scripts/brand-assets.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const pub = p => `${here}public/${p}`;

/* The tile, full-bleed (the platform rounds it). `scale` shrinks the trace
   into the maskable safe zone. */
const tile = (scale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">
  <defs>
    <radialGradient id="t" cx="0.28" cy="0.18" r="1.05">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="55%" stop-color="#eefafa"/><stop offset="100%" stop-color="#d0eff1"/>
    </radialGradient>
    <radialGradient id="h" cx="0.8" cy="0.9" r="0.6">
      <stop offset="0%" stop-color="#a9e6ec" stop-opacity="0.55"/><stop offset="100%" stop-color="#a9e6ec" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="p" x1="11" y1="0" x2="22" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#12171c"/><stop offset="55%" stop-color="#0c7489"/><stop offset="100%" stop-color="#22c3d6"/>
    </linearGradient>
    <filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.7"/></filter>
  </defs>
  <rect width="32" height="32" fill="url(#t)"/>
  <rect width="32" height="32" fill="url(#h)"/>
  <g transform="translate(16,16) scale(${scale}) translate(-16,-16.75)">
    <path d="M11.5 20 L15 8.5 L19 25 L22 20" stroke="#22c3d6" stroke-opacity="0.35" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#g)"/>
    <path d="M5 20 L11.5 20" stroke="#86d2dc" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M22 20 L27 20" stroke="#86d2dc" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M11.5 20 L15 8.5 L19 25 L22 20" stroke="url(#p)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;

const outfit = readFileSync(`${here}node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2`).toString('base64');

/* The link preview: the landing, in one frame. */
const og = `
<style>
  @font-face { font-family: Outfit; src: url(data:font/woff2;base64,${outfit}) format('woff2'); font-weight: 100 900; }
  body { margin: 0; }
  .f { width: 1200px; height: 630px; position: relative; overflow: hidden; background: #f6f9f9; font-family: Outfit, sans-serif; display: grid; place-items: center; }
  .m { position: absolute; border-radius: 50%; filter: blur(70px); }
  .grid { position: absolute; inset: 0; background-image: radial-gradient(rgba(12,116,137,0.14) 1px, transparent 1.3px); background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(ellipse 55% 55% at 50% 45%, #000 20%, transparent 75%); }
  .in { position: relative; text-align: center; width: 1200px; }
  svg.p { position: absolute; left: 0; width: 1200px; top: 38%; height: 200px; transform: translateY(-50%); }
  h1 { position: relative; margin: 0; font-size: 190px; font-weight: 200; letter-spacing: -0.015em; line-height: 1.05;
    background: linear-gradient(100deg, #12171c 0%, #0b6474 35%, #0c7489 48%, #c9f4f6 56%, #0c7489 64%, #0b6474 80%, #12171c 100%);
    -webkit-background-clip: text; color: transparent; }
  p { margin: 22px 0 0; font-size: 30px; font-weight: 400; color: #3c474c; letter-spacing: 0.01em; }
  p.o { margin-top: 14px; font-size: 22px; color: #6b7a80; }
  p i { display: inline-block; width: 7px; height: 7px; margin: 0 22px 6px; border-radius: 50%; background: linear-gradient(135deg, #0c7489, #7fe3ea); }
</style>
<div class="f">
  <div class="m" style="width:620px;height:620px;left:-120px;top:-200px;background:radial-gradient(circle,#cdeff2,transparent 65%)"></div>
  <div class="m" style="width:560px;height:560px;right:-120px;top:40px;background:radial-gradient(circle,#dcf3f4,transparent 65%)"></div>
  <div class="m" style="width:500px;height:500px;left:360px;bottom:-280px;background:radial-gradient(circle,#e2f1ea,transparent 65%)"></div>
  <div class="grid"></div>
  <div class="in">
    <svg class="p" viewBox="0 0 1000 160" preserveAspectRatio="none">
      <defs><linearGradient id="b" x1="0" x2="1"><stop offset="0.3" stop-color="#7fdbe4" stop-opacity="0"/><stop offset="0.47" stop-color="#1fb6c9"/><stop offset="0.6" stop-color="#7fdbe4" stop-opacity="0"/></linearGradient></defs>
      <path d="M0 80 H360 L374 72 L388 88 L400 80 H430 L458 14 L490 150 L514 50 L532 96 L546 80 H1000" fill="none" stroke="rgba(12,116,137,0.22)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      <path d="M0 80 H360 L374 72 L388 88 L400 80 H430 L458 14 L490 150 L514 50 L532 96 L546 80 H1000" fill="none" stroke="url(#b)" stroke-width="3" vector-effect="non-scaling-stroke"/>
    </svg>
    <h1>Faultline</h1>
    <p>The Operational Improvement System</p><p class="o">An Opex Elevate product</p>
  </div>
</div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const shot = async (html, w, h, file) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<body style="margin:0">${html}</body>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: pub(file), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log('wrote', file);
};
const square = (scale, n) => `<div style="width:${n}px;height:${n}px">${tile(scale)}</div>`;
await shot(square(1, 192), 192, 192, 'icon-192.png');
await shot(square(1, 512), 512, 512, 'icon-512.png');
await shot(square(1, 180), 180, 180, 'apple-touch-icon.png');
await shot(square(0.72, 512), 512, 512, 'icon-maskable-512.png');
await shot(og, 1200, 630, 'og.png');
await browser.close();
