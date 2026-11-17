/* Real production service worker: build A → build B, offline failure, retained IndexedDB and caches. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = mkdtempSync(join(tmpdir(), 'faultline-pwa-'));
const build = id => new Promise((done, fail) => {
  const child = spawn('npx', ['vite', 'build', '--outDir', join(root, id), '--emptyOutDir'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FAULTLINE_BUILD_ID: id, FAULTLINE_BUILD_STAMP: id, VITE_SUPABASE_URL: 'https://testproj.supabase.co', VITE_SUPABASE_ANON_KEY: 'testkey' } });
  let output = ''; child.stdout.on('data', x => { output = (output + x).slice(-8000); }); child.stderr.on('data', x => { output = (output + x).slice(-8000); });
  child.on('error', fail); child.on('exit', code => { if (code) fail(new Error(output)); else { console.log(`PASS production build ${id}`); done(); } });
});
await build('update-A'); await build('update-B');
let current = 'update-A';
const types = { '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  try {
    const base = join(root, current); let path = resolve(base, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(base + '/') && path !== base) { res.writeHead(403).end(); return; }
    try { if (!(await stat(path)).isFile()) path = join(base, 'index.html'); } catch { path = join(base, 'index.html'); }
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); res.end(await readFile(path));
  } catch { res.writeHead(500).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(() => localStorage.setItem('sb-testproj-auth-token', JSON.stringify({ access_token: 'smoke', token_type: 'bearer', refresh_token: 'smoke', expires_at: Math.floor(Date.now() / 1000) + 31_536_000, user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'update@example.com', app_metadata: {}, user_metadata: {} } })));
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  await page.goto(base + '/#/room');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 60000 });
  if (await page.locator('.upd').count()) throw new Error('First install falsely announced an update');
  await page.evaluate(async () => {
    await new Promise((done, fail) => { const req = indexedDB.open('faultline-update-proof', 1); req.onupgradeneeded = () => req.result.createObjectStore('saved'); req.onsuccess = () => { const db = req.result; const tx = db.transaction('saved', 'readwrite'); tx.objectStore('saved').put('keep this work', 'proof'); tx.oncomplete = () => { db.close(); done(); }; tx.onerror = () => fail(tx.error); }; req.onerror = () => fail(req.error); });
    await (await caches.open('faultline-update-proof')).put('/proof', new Response('keep this cache'));
  });
  const openAccount = async () => { if (!await page.locator('[data-acct-update]').isVisible().catch(() => false)) await page.getByRole('button', { name: /^Account —/ }).click(); await page.locator('[data-acct-update]').waitFor(); };
  const check = async () => { await openAccount(); await page.locator('[data-acct-update] button').click(); };
  await check(); await page.getByRole('status').filter({ hasText: 'Faultline is up to date.' }).waitFor(); console.log('PASS same build says up to date');
  await ctx.setOffline(true); await check(); await page.getByRole('status').filter({ hasText: 'You are offline.' }).waitFor();
  if (!await page.locator('[data-acct-update]').innerText().then(x => x.includes('update-A'))) throw new Error('Offline attempt replaced the running build');
  console.log('PASS offline update explains failure and retains installed build');
  await ctx.setOffline(false); current = 'update-B';
  await check(); await page.waitForEvent('load');
  await openAccount(); await page.locator('[data-acct-update]').filter({ hasText: 'Build update-B' }).waitFor();
  const retained = await page.evaluate(async () => ({ work: await new Promise((done, fail) => { const req = indexedDB.open('faultline-update-proof', 1); req.onsuccess = () => { const db = req.result; const get = db.transaction('saved').objectStore('saved').get('proof'); get.onsuccess = () => { done(get.result); db.close(); }; get.onerror = () => fail(get.error); }; req.onerror = () => fail(req.error); }), cache: await (await (await caches.open('faultline-update-proof')).match('/proof'))?.text() }));
  if (retained.work !== 'keep this work' || retained.cache !== 'keep this cache') throw new Error('An update discarded saved data or origin caches');
  console.log('PASS installed app moves from A to B and retains IndexedDB and origin caches');
  await ctx.setOffline(true); await page.reload(); await openAccount(); await page.locator('[data-acct-update]').filter({ hasText: 'Build update-B' }).waitFor();
  console.log('PASS new version launches offline after update');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
