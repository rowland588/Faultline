/**
 * The icon set and the code that uses it agree.
 *
 * A name the set does not have would draw an empty square where a camera or a
 * flag should be — on a phone, in front of the client. TypeScript catches a
 * literal typo; this also catches a name built in a ternary or passed through
 * a prop (SheetRow's `icon`), and the other way round: an icon nobody uses is
 * one more thing to keep coherent, so the set holds only what the app draws.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon, ICON_NAMES, type IconName } from '../Icon';

const SRC = join(__dirname, '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : files(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

/** Every icon name the code asks for: name="x", name={a ? 'x' : 'y'}, icon="x". */
function namesUsed(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  const add = (n: string, where: string) => used.set(n, [...(used.get(n) ?? []), where]);
  for (const p of files(SRC)) {
    if (p.endsWith(join('ui', 'Icon.tsx'))) continue;
    const src = readFileSync(p, 'utf8');
    const where = p.slice(SRC.length + 1);
    for (const m of src.matchAll(/<Icon\b[^>]*?\bname=(?:"([^"]+)"|\{([^}]*)\})/g)) {
      if (m[1]) add(m[1], where);
      else for (const q of m[2].matchAll(/'([^']+)'|"([^"]+)"/g)) add(q[1] ?? q[2], where);
    }
    for (const m of src.matchAll(/<SheetRow\b[^>]*?\bicon="([^"]+)"/g)) add(m[1], where);
  }
  return used;
}

describe('the icon set', () => {
  const used = namesUsed();

  it('has every icon the code names', () => {
    const missing = [...used.entries()].filter(([n]) => !ICON_NAMES.includes(n as IconName))
      .map(([n, w]) => `${n} (${w.join(', ')})`);
    expect(missing).toEqual([]);
  });

  it('is actually used — found the call sites', () => {
    expect(used.size).toBeGreaterThan(20);
  });

  it('holds only icons the app draws', () => {
    expect(ICON_NAMES.filter(n => !used.has(n))).toEqual([]);
  });

  it('draws something for every name, decorative unless labelled', () => {
    for (const n of ICON_NAMES) {
      const svg = renderToStaticMarkup(createElement(Icon, { name: n }));
      expect(svg, n).toMatch(/<(path|circle|rect)\b/);
      expect(svg, n).toContain('aria-hidden="true"');
      expect(svg, n).toContain('stroke="currentColor"');
    }
    /* (Was the gear, the job's Details header button — that button is a rail
       line now (ui/rail footGroup) and the gear left the set with it. Any
       icon proves the label rule.) */
    const labelled = renderToStaticMarkup(createElement(Icon, { name: 'close', label: 'Details' }));
    expect(labelled).toContain('aria-label="Details"');
    expect(labelled).not.toContain('aria-hidden');
  });
});
