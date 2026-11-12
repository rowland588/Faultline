import { chromium } from 'playwright';
const out = process.argv[2]; const base = process.env.SMOKE_BASE;
const b = await chromium.launch();
for (const [w, h, d] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(base + '/'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/s6-landing-${d}.png` });
}
await b.close();
