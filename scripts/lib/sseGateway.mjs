/* THE COLLEAGUE'S GATEWAY, STREAMED — played by a script (11 November, docs/AI-MODE.md, As it is written).
 *
 * Playwright's route answers a request whole, so a reply written word by word cannot be played through it. This puts a fetch in
 * front of the page's own (an init script, before the app is loaded — the cloud client takes its fetch when it is made): an ask
 * of the `assist` gateway with `stream: true`, while an entry is queued, is answered as the gateway answers — server-sent events,
 * each `{ delta }` after `gapMs`, then (when the script releases it, if `hold`) the ONE final event; `cut` breaks the stream after
 * the deltas instead, as a dropped signal does. Every other request goes on to the page's routes as before. `window.__sseLog`
 * keeps when each delta and the final went out.
 *
 *   const sse = await installSse(page);       // then reload, so the app takes the fetch
 *   await sse.queue({ deltas: ['Two are ', 'open. '], hold: true, final: { ok: true, reply: 'Two are open.' } });
 *   await sse.release();                      // the final event goes */
export async function installSse(page) {
  await page.addInitScript(() => {
    window.__sseNext = []; window.__sseLog = []; window.__sseRelease = false;
    const orig = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url ?? String(input ?? '');
      if (url.includes('/functions/v1/assist') && window.__sseNext.length) {
        let body = null;
        try { body = typeof init?.body === 'string' ? JSON.parse(init.body) : null; } catch { /* not JSON */ }
        if (body?.stream === true) {
          const e = window.__sseNext.shift();
          const log = { at: Date.now(), deltas: [], final: null, cut: null, body };
          window.__sseLog.push(log);
          const enc = new TextEncoder();
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const stream = new ReadableStream({
            async start(c) {
              for (const d of e.deltas ?? []) { await wait(e.gapMs ?? 200); c.enqueue(enc.encode(`data: ${JSON.stringify({ delta: d })}\n\n`)); log.deltas.push(Date.now()); }
              if (e.cut) { await wait(50); log.cut = Date.now(); c.error(new TypeError('network error')); return; }
              while (e.hold && !window.__sseRelease) await wait(40);
              window.__sseRelease = false;
              c.enqueue(enc.encode(`data: ${JSON.stringify(e.final)}\n\n`)); log.final = Date.now(); c.close();
            },
          });
          return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' } });
        }
      }
      return orig(input, init);
    };
  });
  return {
    queue: entry => page.evaluate(e => { window.__sseNext.push(e); }, entry),
    release: () => page.evaluate(() => { window.__sseRelease = true; }),
    log: () => page.evaluate(() => window.__sseLog.map(l => ({ ...l, body: undefined, stream: l.body?.stream === true, spoken: l.body?.spoken === true }))),
  };
}
