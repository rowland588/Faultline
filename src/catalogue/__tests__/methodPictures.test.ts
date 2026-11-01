/* EVERY METHOD HAS ITS PICTURE (docs/METHODS.md §15 — Rowland, 1 November 2026: "Projects .. just like tools I want pictures
 * so user can see") — New project's card and the method's own page (#/methods/:key) show public/methods/<key>.png, taken from
 * the real project page by scripts/method-pictures.mjs. A method added to METHODS without its picture fails here, so the card
 * never shows a drawn tile for a method that is offered. */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { METHODS } from '../../lib/methods';

describe('the methods’ pictures', () => {
  it('every method has a 960x600 picture and a manifest line saying what it shows', () => {
    const manifest = JSON.parse(readFileSync('public/methods/manifest.json', 'utf8')) as Record<string, { w: number; h: number; of: string; takenFrom: string }>;
    const missing = METHODS.filter(m => !existsSync(`public/methods/${m.key}.png`)).map(m => m.key);
    expect(missing).toEqual([]);
    for (const m of METHODS) {
      expect(manifest[m.key], m.key).toBeTruthy();
      expect([manifest[m.key].w, manifest[m.key].h]).toEqual([960, 600]);
      expect(manifest[m.key].of.length, `${m.key} says what its picture shows`).toBeGreaterThan(10);
    }
  });

  it('holds no picture for a method that does not exist', () => {
    const manifest = JSON.parse(readFileSync('public/methods/manifest.json', 'utf8')) as Record<string, unknown>;
    expect(Object.keys(manifest).filter(k => !METHODS.some(m => m.key === k))).toEqual([]);
  });
});
