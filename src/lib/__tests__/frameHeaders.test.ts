/* The work pane frames the app's own pages beside Luna (AiModeScreen WorkPane). On the live site the headers in vercel.json decide
 * whether a browser will draw them: X-Frame-Options DENY made every page in the pane a browser error page (12 November — Rowland:
 * "Open tools I get an error page, then I press Open the page and it works"; he chose to let the app frame its own pages only). The
 * dev server sends no such header, so only this test guards it: the app may frame itself, and no other site may frame it. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const conf = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const all = conf.headers.flatMap(h => h.headers);
const get = (k: string) => all.find(h => h.key.toLowerCase() === k.toLowerCase())?.value ?? '';

describe('the live headers let the work pane draw the app’s own pages, and no one else frame them', () => {
  it('X-Frame-Options is SAMEORIGIN — never DENY, never absent', () => { expect(get('X-Frame-Options')).toBe('SAMEORIGIN'); });
  it('the CSP lets only the app frame itself', () => {
    const csp = get('Content-Security-Policy') || get('Content-Security-Policy-Report-Only');
    expect(csp).toMatch(/frame-ancestors 'self'(;|$)/);
    expect(csp).not.toMatch(/frame-ancestors[^;]*(\*|https?:)/);
  });
});
