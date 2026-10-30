/* EVERY APP TOOL HAS ITS PICTURE (docs/TOOLS-SHOWCASE.md, TG0) — the gallery's card and the tool's own page show
 * public/tools/<key>.png, taken from the real tool by scripts/tool-pictures.mjs. A tool added to the catalogue
 * without its picture fails here, so the gallery never shows a drawn tile for a tool that is built. */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_TOOLS } from '../registry';

describe('the tools’ pictures', () => {
  it('every app tool has a 960x600 picture and a manifest line', () => {
    const manifest = JSON.parse(readFileSync('public/tools/manifest.json', 'utf8')) as Record<string, { w: number; h: number; of: string; takenFrom: string }>;
    const missing = APP_TOOLS.filter(t => !existsSync(`public/tools/${t.key}.png`)).map(t => t.key);
    expect(missing).toEqual([]);
    for (const t of APP_TOOLS) {
      expect(manifest[t.key], t.key).toBeTruthy();
      expect([manifest[t.key].w, manifest[t.key].h]).toEqual([960, 600]);
      expect(manifest[t.key].of.length, `${t.key} says what its picture shows`).toBeGreaterThan(10);
    }
  });
});
