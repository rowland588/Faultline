import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '../../../api/wording';

/* Rowland, 6 October: "connect the Claude API ... if no Claude, run the
   Gemini free version like we have for the voice." */
const SUPA = 'https://testproj.supabase.co';
const req = (body: unknown, auth = 'Bearer token') => new Request('https://x/api/wording', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: auth }, body: JSON.stringify(body),
});
type Call = { url: string; body?: string };

function fakeNet(opts: { claude?: 'ok' | 'fail'; gemini?: boolean }) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const body = typeof init?.body === 'string' ? init.body : input instanceof Request ? await input.clone().text() : undefined;
    calls.push({ url, body });
    if (url.startsWith(`${SUPA}/auth/v1/user`)) return new Response('{}', { status: 200 });
    if (url.includes('api.anthropic.com')) {
      if (opts.claude === 'fail') return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'down' } }), { status: 500, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'The guard bracket on the infeed is 20 mm too short.' }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/models?')) return new Response(JSON.stringify({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 });
    if (url.includes(':generateContent')) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Guard bracket on the infeed is 20 mm short.' }] } }] }), { status: 200 });
    return new Response('not found', { status: 404 });
  }));
  return calls;
}

describe('api/wording — Claude when it is there, the free Gemini when it is not', () => {
  beforeEach(() => { vi.stubEnv('VITE_SUPABASE_URL', SUPA); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon'); vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('GEMINI_API_KEY', ''); vi.stubEnv('GEMINI_MODEL', ''); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('says it is off, and why, when there is no key at all', async () => {
    fakeNet({});
    expect((await GET()).status).toBe(503);
    const r = await POST(req({ field: 'problem', text: 'gaurd bracket short' }));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/no Claude or Gemini key/);
  });

  it('answers only somebody signed in', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'g');
    fakeNet({ gemini: true });
    expect((await POST(req({ field: 'problem', text: 'gaurd bracket short' }, ''))).status).toBe(401);
  });

  it('uses Gemini when there is no Claude key', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'g');
    const calls = fakeNet({ gemini: true });
    const r = await POST(req({ field: 'problem', text: 'gaurd bracket on infeed 20mm short', names: ['Infeed'] }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ text: 'Guard bracket on the infeed is 20 mm short.', by: 'gemini' });
    expect(calls.some(c => c.url.includes('api.anthropic.com'))).toBe(false);
    expect(await GET().then(x => x.json())).toEqual({ ok: true, by: 'gemini' });
  });

  it('uses Claude when its key is set, with the words and the names in the prompt', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'a'); vi.stubEnv('GEMINI_API_KEY', 'g');
    const calls = fakeNet({ claude: 'ok', gemini: true });
    const r = await POST(req({ field: 'problem', text: 'gaurd bracket on infeed 20mm short', names: ['Infeed conveyor'] }));
    expect(await r.json()).toEqual({ text: 'The guard bracket on the infeed is 20 mm too short.', by: 'claude' });
    const sent = calls.find(c => c.url.includes('api.anthropic.com'));
    expect(sent?.body).toContain('claude-opus-5-5');
    expect(sent?.body).toContain('gaurd bracket on infeed 20mm short');
    expect(sent?.body).toContain('Infeed conveyor');
    expect(calls.some(c => c.url.includes(':generateContent'))).toBe(false);
  });

  it('falls back to Gemini when Claude fails', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'a'); vi.stubEnv('GEMINI_API_KEY', 'g');
    fakeNet({ claude: 'fail', gemini: true });
    const r = await POST(req({ field: 'snag', text: 'oil on floor by drive' }));
    expect((await r.json()).by).toBe('gemini');
  }, 30_000);
});
